import json

import logging

import time

from typing import AsyncIterator, Optional



import httpx



from schemas.search import ResolvedSearchOptions

from services.search.normalize import from_gemini_grounding, merge_metadata



from .base import BaseProvider

from .stream_events import ProviderStreamEvent



logger = logging.getLogger(__name__)





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

        async for event in self.stream_events(prompt, search):

            if event.kind == "token":

                parts.append(event.text)

        return "".join(parts)



    async def stream_events(

        self,

        prompt: str,

        search: Optional[ResolvedSearchOptions] = None,

    ) -> AsyncIterator[ProviderStreamEvent]:

        metadata = None

        queries_emitted: set[str] = set()

        search_started = time.time()

        try:

            async with httpx.AsyncClient(timeout=120) as client:

                async with client.stream(

                    "POST",

                    self._url(stream=True),

                    params={"key": self.key, "alt": "sse"},

                    json=self._payload(prompt, search),

                ) as response:

                    response.raise_for_status()

                    async for line in response.aiter_lines():

                        if not line.startswith("data:"):

                            continue

                        raw = line[5:].strip()

                        if not raw or raw == "[DONE]":

                            continue

                        try:

                            data = json.loads(raw)

                        except json.JSONDecodeError:

                            continue



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

                            yield ProviderStreamEvent(kind="token", text=delta)



            if search and search.should_use_search and metadata:

                metadata.search_latency_ms = int((time.time() - search_started) * 1000)

                yield ProviderStreamEvent(

                    kind="search_complete",

                    data={"metadata": metadata.to_dict()},

                )

        except httpx.HTTPStatusError as e:

            raise _gemini_http_error(e)

        except httpx.TimeoutException:

            raise Exception("Google API request timed out")

        except Exception as e:

            logger.error("Gemini stream error: %s", e)

            raise Exception(f"Google stream failed: {e}") from e





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


