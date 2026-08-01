import asyncio

import json

import logging

import time

from typing import AsyncIterator, Optional



from providers.factory import provider_for
from providers.base import MAX_PROVIDER_OUTPUT_CHARS

from providers.stream_events import ProviderStreamEvent

from schemas.search import (
    PROVIDER_SEARCH_LABELS,
    ResolvedSearchOptions,
    search_capability_payload,
)

from schemas.stream import StreamRequest

from services.search.normalize import NormalizedSearchMetadata, merge_metadata, provider_supports_search
from services.search.citations import valid_citation_url

from utils.byok import ByokHeaders

from utils.model_resolver import resolve_side
from security import classify_provider_error, redact_sensitive_data



logger = logging.getLogger(__name__)

STREAM_DEADLINE_SECONDS = 180.0
SSE_HEARTBEAT_SECONDS = 15.0





def _sse(event: str, payload: dict) -> str:

    return f"event: {event}\ndata: {json.dumps(payload)}\n\n"





def _resolve_search(body: StreamRequest) -> ResolvedSearchOptions:
    return ResolvedSearchOptions.from_request(body.searchMode)





def _emit_search_event(

    event: ProviderStreamEvent,

    side: str,

    metadata: Optional[NormalizedSearchMetadata],

) -> tuple[str, Optional[NormalizedSearchMetadata]]:

    payload = {"side": side, **event.data}

    if event.kind in ("citations", "search_complete") and "metadata" in event.data:

        meta_dict = event.data["metadata"]

        if isinstance(meta_dict, dict):

            meta = NormalizedSearchMetadata(

                grounded=bool(meta_dict.get("grounded")),

                citations=[],

                search_provider=meta_dict.get("searchProvider"),

                search_queries=meta_dict.get("searchQueries") or [],

                live_search=bool(meta_dict.get("liveSearch")),

                search_mode=meta_dict.get("searchMode"),

                search_latency_ms=meta_dict.get("searchLatencyMs"),

            )

            for c in meta_dict.get("citations") or []:

                from services.search.normalize import NormalizedCitation



                if not isinstance(c, dict) or not valid_citation_url(c.get("url")):
                    continue
                meta.citations.append(

                    NormalizedCitation(

                        title=c.get("title", ""),

                        url=c.get("url", ""),

                        hostname=c.get("hostname", ""),

                        provider=c.get("provider", ""),

                        snippet=c.get("snippet"),

                    )

                )

            if event.kind == "citations":
                meta.used = bool(meta.search_queries or meta.citations)
                meta.live_search = meta.used
            metadata = merge_metadata(metadata, meta)
            payload["metadata"] = metadata.to_dict()

    return _sse(event.kind, payload), metadata





async def _stream_side(

    side: str,

    prompt: str,

    provider_name: str,

    key: str,

    model: str,

    extras: dict,

    search: ResolvedSearchOptions,

    queue: asyncio.Queue,

    emit_terminal: bool = True,

) -> str:

    start = time.monotonic()

    search_start: Optional[float] = None

    full_parts: list[str] = []
    output_chars = 0

    metadata: Optional[NormalizedSearchMetadata] = None
    search_complete_sent = False
    unsupported_reason: Optional[str] = None

    effective_search = search

    if search.should_use_search and not provider_supports_search(provider_name):
        unsupported_reason = f"{provider_name} does not support live web search in ModelWise"
        effective_search = ResolvedSearchOptions(active=False, force=False, mode=search.mode)



    try:

        provider = provider_for(provider_name, key, model, extras)

        supported = provider_supports_search(provider_name)

        cap = search_capability_payload(

            requested=search.requested,

            supported=supported,

            enabled=effective_search.should_use_search,

            label=PROVIDER_SEARCH_LABELS.get(provider_name, "Not available"),

            skip_reason=None

            if supported

            else f"{provider_name} does not support live web search in ModelWise",

        )

        await queue.put(

            _sse(

                "start",

                {

                    "side": side,

                    "model": model,

                    "provider": provider_name,

                    "searchCapability": cap,

                },

            )

        )

        if unsupported_reason:
            await queue.put(
                _sse(
                    "search_complete",
                    {"side": side, "skipped": True, "reason": unsupported_reason},
                )
            )
            search_complete_sent = True



        if effective_search.should_use_search:

            await queue.put(

                _sse(

                    "search_start",

                    {

                        "side": side,

                        "provider": provider_name,

                        "mode": effective_search.mode.value,

                    },

                )

            )

            search_start = time.monotonic()



        async for event in provider.stream_events(prompt, effective_search):

            if event.kind == "token" and event.text:
                if output_chars + len(event.text) > MAX_PROVIDER_OUTPUT_CHARS:
                    raise Exception("Provider output exceeded the size limit")
                output_chars += len(event.text)
                full_parts.append(event.text)

                await queue.put(_sse("token", {"side": side, "delta": event.text}))

            elif event.kind in {

                "search_start",

                "search_sources",

                "grounding",

                "citations",

                "search_complete",

            }:

                if event.kind == "search_complete":
                    search_complete_sent = True
                sse_line, metadata = _emit_search_event(event, side, metadata)

                await queue.put(sse_line)



        if effective_search.should_use_search and not search_complete_sent:

            latency_ms = None

            if search_start is not None:

                latency_ms = int((time.monotonic() - search_start) * 1000)

            if metadata is None:

                metadata = NormalizedSearchMetadata(

                    grounded=False,

                    search_provider=provider_name,

                    live_search=False,

                    used=False,

                    search_mode=effective_search.mode.value,

                    search_latency_ms=latency_ms,

                )

            elif latency_ms is not None and metadata.search_latency_ms is None:

                metadata.search_latency_ms = latency_ms

            metadata.used = bool(

                metadata.search_queries or metadata.citations or metadata.grounded

            )

            metadata.live_search = metadata.used

            await queue.put(

                _sse(

                    "search_complete",

                    {

                        "side": side,

                        "metadata": metadata.to_dict(),

                    },

                )

            )



        elapsed = round(time.monotonic() - start, 3)

        done_payload: dict = {

            "side": side,

            "elapsed": elapsed,

            "text": "".join(full_parts),

        }

        if metadata is not None:

            done_payload["searchMetadata"] = metadata.to_dict()

        terminal_event = _sse("done", done_payload)
        if emit_terminal:
            await queue.put(terminal_event)
        return terminal_event

    except Exception as e:

        logger.error("Stream %s failed: %s", side, redact_sensitive_data(str(e)))

        client_msg = classify_provider_error(e)

        terminal_event = _sse(
            "error",
            {"side": side, "message": client_msg, "elapsed": round(time.monotonic() - start, 3)},
        )
        if emit_terminal:
            await queue.put(terminal_event)
        return terminal_event





async def stream_comparison_sse(body: StreamRequest, keys: ByokHeaders) -> AsyncIterator[str]:

    """

    SSE stream for dual-model BYOK comparison.

    Events: start | token | done | error | search_* | complete

    """

    search = _resolve_search(body)

    left_name, left_key, left_model, left_extras = resolve_side(

        body.leftModel, body.leftProvider, keys

    )

    right_name, right_key, right_model, right_extras = resolve_side(

        body.rightModel, body.rightProvider, keys

    )



    loop = asyncio.get_running_loop()
    deadline = loop.time() + STREAM_DEADLINE_SECONDS

    # Separate bounded queues prevent one side from consuming all capacity.
    queues = {
        "left": asyncio.Queue(maxsize=128),
        "right": asyncio.Queue(maxsize=128),
    }
    tasks = {
        "left": asyncio.create_task(
            _stream_side(
                "left", body.prompt, left_name, left_key, left_model, left_extras,
                search, queues["left"], emit_terminal=False,
            )
        ),
        "right": asyncio.create_task(
            _stream_side(
                "right", body.prompt, right_name, right_key, right_model, right_extras,
                search, queues["right"], emit_terminal=False,
            )
        ),
    }
    queue_gets: dict[str, asyncio.Task] = {}
    terminal_emitted: set[str] = set()
    next_heartbeat = loop.time() + SSE_HEARTBEAT_SECONDS
    try:
        while len(terminal_emitted) < len(tasks):
            # A side's terminal event follows every queued event from that side.
            emitted_terminal = False
            for side, task in tasks.items():
                if side in terminal_emitted or not task.done() or not queues[side].empty():
                    continue
                pending_get = queue_gets.pop(side, None)
                if pending_get is not None:
                    pending_get.cancel()
                    await asyncio.gather(pending_get, return_exceptions=True)
                terminal_emitted.add(side)
                yield task.result()
                emitted_terminal = True
                break
            if emitted_terminal:
                continue

            remaining = deadline - loop.time()
            if remaining <= 0:
                for task in tasks.values():
                    if not task.done():
                        task.cancel()
                for get_task in queue_gets.values():
                    get_task.cancel()
                await asyncio.gather(*tasks.values(), *queue_gets.values(), return_exceptions=True)

                for side, task in tasks.items():
                    if side in terminal_emitted:
                        continue
                    terminal_emitted.add(side)
                    if task.done() and not task.cancelled():
                        yield task.result()
                    else:
                        yield _sse(
                            "error",
                            {"side": side, "message": "Provider request timed out."},
                        )
                break

            for side, task in tasks.items():
                if side not in terminal_emitted and side not in queue_gets:
                    queue_gets[side] = asyncio.create_task(queues[side].get())

            waitables = list(queue_gets.values()) + [task for task in tasks.values() if not task.done()]
            done, _ = await asyncio.wait(
                waitables,
                timeout=min(max(0.0, next_heartbeat - loop.time()), remaining),
                return_when=asyncio.FIRST_COMPLETED,
            )

            delivered = False
            for side, get_task in list(queue_gets.items()):
                if get_task not in done:
                    continue
                del queue_gets[side]
                yield get_task.result()
                delivered = True
                break
            if delivered or done:
                continue

            if loop.time() < next_heartbeat:
                await asyncio.sleep(next_heartbeat - loop.time())
            if loop.time() < deadline:
                yield ": heartbeat\n\n"
                next_heartbeat = loop.time() + SSE_HEARTBEAT_SECONDS

        yield _sse(
            "complete",
            {
                "prompt": body.prompt,
                "leftModel": body.leftModel,
                "rightModel": body.rightModel,
                "searchMode": body.searchMode.value if body.searchMode else None,
            },
        )
    finally:
        for task in (*tasks.values(), *queue_gets.values()):
            if not task.done():
                task.cancel()
        await asyncio.gather(*tasks.values(), *queue_gets.values(), return_exceptions=True)


