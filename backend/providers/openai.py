import json
import logging
from typing import AsyncIterator, Optional

import httpx

from schemas.search import ResolvedSearchOptions
from security import iter_limited_response_lines, log_provider_error, outbound_client

from .base import BaseProvider
from .stream_events import ProviderStreamEvent

logger = logging.getLogger(__name__)


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
        async for event in self.stream_events(prompt, search):
            if event.kind == "token":
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
                            break
                        try:
                            chunk = json.loads(data)
                        except json.JSONDecodeError:
                            continue
                        delta = (
                            chunk.get("choices", [{}])[0]
                            .get("delta", {})
                            .get("content")
                        )
                        if delta:
                            yield ProviderStreamEvent(kind="token", text=delta)
        except httpx.HTTPStatusError as e:
            raise _http_error("OpenAI", e)
        except httpx.TimeoutException:
            raise Exception("OpenAI API request timed out")
        except Exception as e:
            log_provider_error("OpenAI provider error", e)
            raise Exception("OpenAI request failed") from None


def _http_error(name: str, e: httpx.HTTPStatusError) -> Exception:
    code = e.response.status_code
    if code == 401:
        return Exception(f"Invalid {name} API key")
    if code == 429:
        return Exception(f"{name} API rate limit exceeded")
    if code == 402:
        return Exception(f"{name} API quota exceeded")
    return Exception(f"{name} API error: {code}")
