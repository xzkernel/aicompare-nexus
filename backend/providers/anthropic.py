import json

import time

from typing import AsyncIterator, List, Optional



import httpx



from schemas.search import ResolvedSearchOptions
from security import iter_limited_response_lines, log_provider_error, outbound_client

from services.search.normalize import from_anthropic_citations, merge_metadata



from .base import BaseProvider, MAX_PROVIDER_OUTPUT_CHARS

from .stream_events import ProviderStreamEvent



ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"





class AnthropicProvider(BaseProvider):

    def __init__(self, key: str, model: str):

        self.key = key

        self.model = model



    def _headers(self) -> dict:

        return {

            "x-api-key": self.key,

            "anthropic-version": "2023-06-01",

            "content-type": "application/json",

        }



    def _payload(self, prompt: str, stream: bool, search: Optional[ResolvedSearchOptions]) -> dict:

        body: dict = {

            "model": self.model,

            "max_tokens": 2048,

            "messages": [{"role": "user", "content": prompt}],

            "stream": stream,

        }

        if search and search.should_use_search:

            body["tools"] = [

                {

                    "type": "web_search_20250305",

                    "name": "web_search",

                    "max_uses": 5,

                }

            ]

            if search.force:

                body["system"] = (

                    "You must use the web_search tool to retrieve current information "

                    "before answering. Cite your sources."

                )

        return body



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

        citations: List[dict] = []

        queries: List[str] = []

        metadata = None

        search_started = time.monotonic()

        searching = False
        tool_inputs: dict[int, str] = {}
        emitted_text = False
        terminal = False



        try:

            async with outbound_client(120) as client:

                async with client.stream(

                    "POST",

                    ANTHROPIC_URL,

                    headers=self._headers(),

                    json=self._payload(prompt, stream=True, search=search),

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



                        event_type = data.get("type")

                        if event_type == "error" or data.get("error") is not None:
                            raise Exception("Anthropic stream failed")



                        if event_type == "content_block_start":

                            block = data.get("content_block") or {}

                            block_type = block.get("type", "")

                            if "web_search" in block_type or block_type == "server_tool_use":

                                if not searching:

                                    searching = True

                                    yield ProviderStreamEvent(

                                        kind="grounding",

                                        data={"provider": "anthropic", "phase": "searching"},

                                    )

                            if block_type == "web_search_tool_result":

                                for item in block.get("content") or []:

                                    if item.get("type") == "web_search_result":

                                        url = item.get("url") or ""

                                        if url:

                                            citations.append(

                                                {

                                                    "url": url,

                                                    "title": item.get("title"),

                                                    "cited_text": item.get("page_age"),

                                                }

                                            )

                            index = data.get("index")
                            initial_input = block.get("input")
                            if isinstance(index, int) and isinstance(initial_input, dict):
                                query = initial_input.get("query")
                                if isinstance(query, str) and query and query not in queries:
                                    queries.append(query)
                                    yield ProviderStreamEvent(
                                        kind="search_sources",
                                        data={"queries": [query], "provider": "anthropic"},
                                    )



                        elif event_type == "content_block_delta":

                            delta = data.get("delta") or {}

                            delta_type = delta.get("type")

                            if delta_type == "text_delta":

                                text = delta.get("text", "")

                                if text:

                                    emitted_text = True

                                    yield ProviderStreamEvent(kind="token", text=text)

                            elif delta_type == "input_json_delta":

                                partial = delta.get("partial_json") or ""

                                index = data.get("index")
                                if isinstance(index, int) and partial:

                                    tool_inputs[index] = tool_inputs.get(index, "") + partial

                                    try:

                                        parsed = json.loads(tool_inputs[index])

                                        q = parsed.get("query")

                                        if q and q not in queries:

                                            queries.append(q)

                                            yield ProviderStreamEvent(

                                                kind="search_sources",

                                                data={"queries": [q], "provider": "anthropic"},

                                            )

                                        tool_inputs.pop(index, None)

                                    except json.JSONDecodeError:

                                        pass

                            elif delta_type == "citations_delta":

                                cite = delta.get("citation") or {}

                                if cite.get("url"):

                                    citations.append(cite)



                        elif event_type == "message_delta":
                            delta = data.get("delta") or {}
                            if isinstance(delta, dict) and delta.get("stop_reason") == "max_tokens":
                                raise Exception("Anthropic output limit reached before completion")



                        elif event_type == "message_stop":

                            terminal = True

                            if citations or queries:

                                meta = from_anthropic_citations(citations, queries, "anthropic")

                                metadata = merge_metadata(metadata, meta)

                                yield ProviderStreamEvent(

                                    kind="citations",

                                    data={"metadata": meta.to_dict()},

                                )



            if search and search.should_use_search:

                if metadata:

                    metadata.search_latency_ms = int((time.monotonic() - search_started) * 1000)

                    yield ProviderStreamEvent(

                        kind="search_complete",

                        data={"metadata": metadata.to_dict()},

                    )

            if not emitted_text:
                raise Exception("Anthropic returned no answer text")
            if not terminal:
                raise Exception("Anthropic stream terminated unexpectedly")

        except httpx.HTTPStatusError as e:

            raise _anthropic_http_error(e)

        except httpx.TimeoutException:

            raise Exception("Anthropic API request timed out")

        except Exception as e:

            log_provider_error("Anthropic stream error", e)

            raise e from None





def _anthropic_http_error(e: httpx.HTTPStatusError) -> Exception:

    code = e.response.status_code

    if code == 401:

        return Exception("Invalid Anthropic API key")

    if code == 429:

        return Exception("Anthropic API rate limit exceeded")

    return Exception(f"Anthropic API error: {code}")


