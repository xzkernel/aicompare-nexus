import json
from typing import AsyncIterator, Optional

import httpx

from schemas.search import ResolvedSearchOptions
from security import iter_limited_response_lines, log_provider_error, outbound_client

from .base import BaseProvider, MAX_PROVIDER_OUTPUT_CHARS
from .stream_events import ProviderStreamEvent

class OpenAIProvider(BaseProvider):
    def __init__(self, key: str, model: str):
        self.key = key
        self.model = model

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
        }

    def _payload(self, prompt: str, stream: bool) -> dict:
        return {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 2048,
            "temperature": 0.7,
            "stream": stream,
        }

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
        if search and search.should_use_search:
            yield ProviderStreamEvent(
                kind="search_complete",
                data={
                    "skipped": True,
                    "reason": "OpenAI Chat Completions does not support native web search in ModelWise",
                },
            )
        url = "https://api.openai.com/v1/chat/completions"
        emitted_text = False
        terminal = False
        try:
            async with outbound_client(120) as client:
                async with client.stream(
                    "POST",
                    url,
                    headers=self._headers(),
                    json=self._payload(prompt, stream=True),
                ) as response:
                    response.raise_for_status()
                    async for line in iter_limited_response_lines(response):
                        if not line or not line.startswith("data:"):
                            continue
                        data = line[5:].strip()
                        if data == "[DONE]":
                            terminal = True
                            break
                        try:
                            chunk = json.loads(data)
                        except json.JSONDecodeError:
                            continue
                        if not isinstance(chunk, dict):
                            continue
                        if chunk.get("error") is not None:
                            raise Exception("OpenAI stream failed")
                        choices = chunk.get("choices") or []
                        if not choices or not isinstance(choices[0], dict):
                            continue
                        choice = choices[0]
                        finish_reason = str(choice.get("finish_reason") or "").lower()
                        if finish_reason == "length":
                            raise Exception("OpenAI output limit reached before completion")
                        if finish_reason == "content_filter":
                            raise Exception("OpenAI response was blocked by content filtering")
                        if finish_reason:
                            if finish_reason != "stop":
                                raise Exception("OpenAI response did not complete successfully")
                            terminal = True
                        delta = (choice.get("delta") or {}).get("content")
                        if delta:
                            emitted_text = True
                            yield ProviderStreamEvent(kind="token", text=delta)
            if not emitted_text:
                raise Exception("OpenAI returned no answer text")
            if not terminal:
                raise Exception("OpenAI stream terminated unexpectedly")
        except httpx.HTTPStatusError as e:
            raise _http_error("OpenAI", e)
        except httpx.TimeoutException:
            raise Exception("OpenAI API request timed out")
        except Exception as e:
            log_provider_error("OpenAI provider error", e)
            raise e from None


def _http_error(name: str, e: httpx.HTTPStatusError) -> Exception:
    code = e.response.status_code
    if code == 401:
        return Exception(f"Invalid {name} API key")
    if code == 429:
        return Exception(f"{name} API rate limit exceeded")
    if code == 402:
        return Exception(f"{name} API quota exceeded")
    return Exception(f"{name} API error: {code}")
