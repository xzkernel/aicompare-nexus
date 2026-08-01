import json

import time

from typing import AsyncIterator, Optional



import httpx



from schemas.search import ResolvedSearchOptions
from security import iter_limited_response_lines, log_provider_error, outbound_client

from services.search.normalize import from_gemini_grounding, merge_metadata



from .base import BaseProvider, MAX_PROVIDER_OUTPUT_CHARS

from .stream_events import ProviderStreamEvent



class GeminiProvider(BaseProvider):

    def __init__(self, key: str, model: str):

        self.key = key

        self.model = model



    def _url(self, stream: bool) -> str:

        action = "streamGenerateContent" if stream else "generateContent"

        return (

            f"https://generativelanguage.googleapis.com/v1beta/models/"

            f"{self.model}:{action}"

        )



    def _payload(self, prompt: str, search: Optional[ResolvedSearchOptions]) -> dict:

        body: dict = {

            "contents": [{"parts": [{"text": prompt}]}],

            "generationConfig": {"maxOutputTokens": 2048, "temperature": 0.7},

        }

        if search and search.should_use_search:
            body["tools"] = [{"google_search": {}}]
            instruction = (
                "Use Google Search grounding for current events, weather, and time-sensitive facts. "
                "Cite sources when available."
            )
            if search.force:
                instruction = (
                    "You must use Google Search grounding to answer with "
                    "current, verifiable information. Cite sources when available."
                )
            body["systemInstruction"] = {"parts": [{"text": instruction}]}

        return body



    def _extract_text(self, data: dict) -> str:

        text = ""

        for candidate in data.get("candidates", []):

            content = candidate.get("content", {})

            for part in content.get("parts", []):

                if "text" in part:

                    text += part["text"]

        return text



    def _extract_grounding(self, data: dict) -> dict:

        for candidate in data.get("candidates", []):

            gm = candidate.get("groundingMetadata")

            if gm:

                return gm

        return {}



    async def complete(self, prompt: str, search: Optional[ResolvedSearchOptions] = None) -> str:

        parts = []
        length = 0

        async for event in self.stream_events(prompt, search):

            if event.kind == "token":
                length += len(event.text)
                if length > MAX_PROVIDER_OUTPUT_CHARS:
                    raise Exception("Provider output exceeded the size limit")
                parts.append(event.text)

        return "".join(parts)



    async def stream_events(

        self,

        prompt: str,

        search: Optional[ResolvedSearchOptions] = None,

    ) -> AsyncIterator[ProviderStreamEvent]:

        metadata = None

        queries_emitted: set[str] = set()

        search_started = time.monotonic()
        emitted_text = False
        terminal = False

        try:

            async with outbound_client(120) as client:

                async with client.stream(

                    "POST",

                    self._url(stream=True),

                    params={"key": self.key, "alt": "sse"},

                    json=self._payload(prompt, search),

                ) as response:

                    response.raise_for_status()

                    async for line in iter_limited_response_lines(response):

                        if not line.startswith("data:"):

                            continue

                        raw = line[5:].strip()

                        if not raw or raw == "[DONE]":

                            continue

                        try:

                            data = json.loads(raw)

                        except json.JSONDecodeError:

                            continue

                        if not isinstance(data, dict):
                            continue
                        if data.get("error") is not None:
                            raise Exception("Google stream failed")
                        feedback = data.get("promptFeedback") or {}
                        if isinstance(feedback, dict) and feedback.get("blockReason"):
                            raise Exception("Google response was blocked by safety filtering")
                        for candidate in data.get("candidates") or []:
                            if not isinstance(candidate, dict):
                                continue
                            reason = str(candidate.get("finishReason") or "").upper()
                            if reason == "MAX_TOKENS":
                                raise Exception("Google output limit reached before completion")
                            if reason in {"SAFETY", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII", "RECITATION"}:
                                raise Exception("Google response was blocked by safety filtering")
                            if reason:
                                if reason != "STOP":
                                    raise Exception("Google response did not complete successfully")
                                terminal = True



                        grounding = self._extract_grounding(data)

                        if grounding:

                            gm = from_gemini_grounding(grounding, "google")

                            metadata = merge_metadata(metadata, gm)

                            for q in gm.search_queries:

                                if q not in queries_emitted:

                                    queries_emitted.add(q)

                                    yield ProviderStreamEvent(

                                        kind="search_sources",

                                        data={"queries": [q], "provider": "google"},

                                    )

                            if gm.citations:

                                yield ProviderStreamEvent(

                                    kind="grounding",

                                    data={"provider": "google"},

                                )

                                yield ProviderStreamEvent(

                                    kind="citations",

                                    data={"metadata": gm.to_dict()},

                                )



                        delta = self._extract_text(data)

                        if delta:

                            emitted_text = True

                            yield ProviderStreamEvent(kind="token", text=delta)



            if search and search.should_use_search and metadata:

                metadata.search_latency_ms = int((time.monotonic() - search_started) * 1000)

                yield ProviderStreamEvent(

                    kind="search_complete",

                    data={"metadata": metadata.to_dict()},

                )

            if not emitted_text:
                raise Exception("Google returned no answer text")
            if not terminal:
                raise Exception("Google stream terminated unexpectedly")

        except httpx.HTTPStatusError as e:

            raise _gemini_http_error(e)

        except httpx.TimeoutException:

            raise Exception("Google API request timed out")

        except Exception as e:

            log_provider_error("Gemini stream error", e)

            raise e from None





def _gemini_http_error(e: httpx.HTTPStatusError) -> Exception:

    if e.response.status_code == 400:

        try:

            msg = e.response.json().get("error", {}).get("message", "")

            if "API_KEY_INVALID" in msg:

                return Exception("Invalid Google API key")

        except Exception:

            pass

    if e.response.status_code == 429:

        return Exception("Google API rate limit exceeded")

    return Exception(f"Google API error: {e.response.status_code}")


