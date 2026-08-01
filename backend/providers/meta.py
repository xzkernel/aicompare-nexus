import json
import os
import time
from typing import Any, AsyncIterator, Dict, List, Optional

import httpx

from schemas.search import ResolvedSearchOptions
from security import (
    iter_limited_response_lines,
    log_provider_error,
    normalize_outbound_key_header,
    outbound_client,
    validate_relay_base_url,
)
from services.search.normalize import from_openrouter_annotations, merge_metadata

from .base import BaseProvider, MAX_PROVIDER_OUTPUT_CHARS
from .stream_events import ProviderStreamEvent

OPENROUTER_APP_URL = os.getenv("APP_URL", "https://aicompare-nexus.vercel.app")
OPENROUTER_APP_TITLE = "ModelWise"


class MetaRelayProvider(BaseProvider):
    """OpenAI-compatible relay (OpenRouter, Together, etc.)."""

    def __init__(self, key: str, model: str, base_url: str, key_header: str = "Authorization"):
        self.key = key
        self.model = model
        self.base_url = validate_relay_base_url(base_url)
        self.key_header = normalize_outbound_key_header(key_header)

    def _headers(self) -> dict:
        value = self.key
        if self.key_header == "Authorization" and not value.startswith("Bearer "):
            value = f"Bearer {value}"
        headers = {self.key_header: value, "Content-Type": "application/json"}
        if "openrouter" in self.base_url.lower():
            headers["HTTP-Referer"] = OPENROUTER_APP_URL
            headers["X-Title"] = OPENROUTER_APP_TITLE
        return headers

    def _url(self) -> str:
        if self.base_url.endswith("/v1"):
            url = f"{self.base_url}/chat/completions"
        else:
            url = f"{self.base_url}/v1/chat/completions"
        return url

    def _payload(
        self,
        prompt: str,
        stream: bool,
        search: Optional[ResolvedSearchOptions],
    ) -> dict:
        body: dict = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 2048,
            "temperature": 0.7,
            "stream": stream,
        }
        is_openrouter = "openrouter" in self.base_url.lower()
        if search and search.should_use_search and is_openrouter:
            # OpenRouter web plugin — native, works with streaming relay routes
            body["plugins"] = [{"id": "web", "max_results": 8}]
            system = (
                "Use live web search for current events, weather, prices, and time-sensitive facts. "
                "Cite sources when available."
            )
            if search.force:
                system = "You must use web search before answering. " + system
            body["messages"] = [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ]
        return body

    def _collect_annotations(self, chunk: dict, bucket: List[dict]) -> None:
        choice = chunk.get("choices", [{}])[0]
        delta = choice.get("delta") or {}
        message = choice.get("message") or {}
        for ann in delta.get("annotations") or message.get("annotations") or []:
            bucket.append(ann)
        for ann in chunk.get("annotations") or []:
            bucket.append(ann)
        plugin = chunk.get("plugins") or chunk.get("plugin_results")
        if isinstance(plugin, list):
            for p in plugin:
                if isinstance(p, dict):
                    bucket.append(p)

    def _extract_queries_from_chunk(self, chunk: dict, buffers: Dict[str, str]) -> List[str]:
        queries: List[str] = []
        choice = chunk.get("choices", [{}])[0]
        for position, tc in enumerate(choice.get("delta", {}).get("tool_calls") or []):
            fn = tc.get("function") or {}
            args = fn.get("arguments") or ""
            if not args:
                continue
            key = str(tc.get("id") or tc.get("index", position))
            buffers[key] = buffers.get(key, "") + args
            try:
                parsed = json.loads(buffers[key])
                q = parsed.get("query") or parsed.get("q")
                if q:
                    queries.append(str(q))
                buffers.pop(key, None)
            except json.JSONDecodeError:
                pass
        return queries

    async def complete(self, prompt: str, search: Optional[ResolvedSearchOptions] = None) -> str:
        parts: List[str] = []
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
        annotations: List[dict] = []
        metadata = None
        search_started = time.monotonic()
        is_openrouter = "openrouter" in self.base_url.lower()
        queries_seen: set[str] = set()
        tool_buffers: Dict[str, str] = {}
        emitted_text = False
        terminal = False

        try:
            async with outbound_client(180) as client:
                async with client.stream(
                    "POST",
                    self._url(),
                    headers=self._headers(),
                    json=self._payload(prompt, stream=True, search=search),
                ) as response:
                    if response.status_code >= 400:
                        log_provider_error(
                            f"Relay upstream error {response.status_code}",
                            Exception("upstream returned an error"),
                        )
                    response.raise_for_status()

                    async for line in iter_limited_response_lines(response):
                        if not line or not line.startswith("data:"):
                            continue
                        raw = line[5:].strip()
                        if raw == "[DONE]":
                            terminal = True
                            break
                        try:
                            chunk = json.loads(raw)
                        except json.JSONDecodeError:
                            continue

                        if not isinstance(chunk, dict):
                            continue
                        if chunk.get("error") is not None:
                            raise Exception("Relay stream failed")
                        self._collect_annotations(chunk, annotations)
                        for q in self._extract_queries_from_chunk(chunk, tool_buffers):
                            if q not in queries_seen:
                                queries_seen.add(q)
                                yield ProviderStreamEvent(
                                    kind="search_sources",
                                    data={"queries": [q], "provider": "openrouter"},
                                )

                        choice = chunk.get("choices", [{}])[0]
                        if not isinstance(choice, dict):
                            continue
                        finish_reason = str(choice.get("finish_reason") or "").lower()
                        if finish_reason == "length":
                            raise Exception("Relay output limit reached before completion")
                        if finish_reason == "content_filter":
                            raise Exception("Relay response was blocked by content filtering")
                        if finish_reason:
                            if finish_reason != "stop":
                                raise Exception("Relay response did not complete successfully")
                            terminal = True
                        delta = choice.get("delta") or {}
                        content = delta.get("content")
                        if content:
                            emitted_text = True
                            yield ProviderStreamEvent(kind="token", text=content)

            if search and search.should_use_search and is_openrouter:
                latency = int((time.monotonic() - search_started) * 1000)
                if annotations:
                    meta = from_openrouter_annotations(annotations, list(queries_seen), "openrouter")
                    meta.search_latency_ms = latency
                    meta.used = bool(meta.citations or meta.search_queries)
                    meta.live_search = meta.used
                    metadata = merge_metadata(metadata, meta)
                    if meta.citations:
                        yield ProviderStreamEvent(
                            kind="citations",
                            data={"metadata": meta.to_dict()},
                        )
                final_meta = metadata or from_openrouter_annotations([], list(queries_seen), "openrouter")
                final_meta.search_latency_ms = latency
                final_meta.used = bool(final_meta.citations or final_meta.search_queries)
                final_meta.live_search = final_meta.used
                final_meta.search_mode = "openrouter_web"
                yield ProviderStreamEvent(
                    kind="search_complete",
                    data={"metadata": final_meta.to_dict()},
                )
            if not emitted_text:
                raise Exception("Relay returned no answer text")
            if not terminal:
                raise Exception("Relay stream terminated unexpectedly")
        except httpx.HTTPStatusError as e:
            code = e.response.status_code
            if code == 401:
                raise Exception("Invalid relay API key")
            if code == 429:
                raise Exception("Relay API rate limit exceeded")
            raise Exception(f"Relay API error: {code}")
        except httpx.TimeoutException:
            raise Exception("Relay API request timed out")
        except Exception as e:
            log_provider_error("Meta relay error", e)
            raise e from None
