import asyncio

import json

import logging

import time

from typing import AsyncIterator, Optional



from providers.factory import provider_for

from providers.stream_events import ProviderStreamEvent

from schemas.search import (
    PROVIDER_SEARCH_LABELS,
    ResolvedSearchOptions,
    search_capability_payload,
)

from schemas.stream import StreamRequest

from services.search.normalize import NormalizedSearchMetadata, merge_metadata, provider_supports_search

from utils.byok import ByokHeaders

from utils.model_resolver import resolve_side
from security import classify_provider_error, redact_sensitive_data



logger = logging.getLogger(__name__)





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



                meta.citations.append(

                    NormalizedCitation(

                        title=c.get("title", ""),

                        url=c.get("url", ""),

                        hostname=c.get("hostname", ""),

                        provider=c.get("provider", ""),

                        snippet=c.get("snippet"),

                    )

                )

            metadata = merge_metadata(metadata, meta)
            if event.kind in ("search_sources", "citations"):
                meta.used = bool(meta.search_queries or meta.citations)
                meta.live_search = meta.used
            payload["metadata"] = meta.to_dict()

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

) -> None:

    start = time.time()

    search_start: Optional[float] = None

    full_parts: list[str] = []

    metadata: Optional[NormalizedSearchMetadata] = None
    search_complete_sent = False

    effective_search = search

    if search.should_use_search and not provider_supports_search(provider_name):

        await queue.put(

            _sse(

                "search_complete",

                {

                    "side": side,

                    "skipped": True,

                    "reason": f"{provider_name} does not support live web search in ModelWise",

                },

            )

        )

        search_complete_sent = True
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

            search_start = time.time()



        async for event in provider.stream_events(prompt, effective_search):

            if event.kind == "token" and event.text:

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

                latency_ms = int((time.time() - search_start) * 1000)

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



        elapsed = round(time.time() - start, 3)

        done_payload: dict = {

            "side": side,

            "elapsed": elapsed,

            "text": "".join(full_parts),

        }

        if metadata is not None:

            done_payload["searchMetadata"] = metadata.to_dict()

        await queue.put(_sse("done", done_payload))

    except Exception as e:

        logger.error("Stream %s failed: %s", side, redact_sensitive_data(str(e)))

        client_msg = classify_provider_error(e)

        await queue.put(

            _sse(

                "error",

                {"side": side, "message": client_msg, "elapsed": round(time.time() - start, 3)},

            )

        )





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



    # Backpressure prevents a fast provider from buffering unbounded SSE output
    # while a client connection is slow or abandoned.
    queue: asyncio.Queue[str | None] = asyncio.Queue(maxsize=256)



    async def producer() -> None:

        await asyncio.gather(

            _stream_side(

                "left",

                body.prompt,

                left_name,

                left_key,

                left_model,

                left_extras,

                search,

                queue,

            ),

            _stream_side(

                "right",

                body.prompt,

                right_name,

                right_key,

                right_model,

                right_extras,

                search,

                queue,

            ),

        )

        await queue.put(None)



    task = asyncio.create_task(producer())

    try:
        while True:
            item = await queue.get()
            if item is None:
                break
            yield item
    except asyncio.CancelledError:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
        yield _sse("error", {"detail": "Stream cancelled"})
        return
    finally:
        if not task.done():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        else:
            try:
                await task
            except Exception:
                pass

        yield _sse(
            "complete",
            {
                "prompt": body.prompt,
                "leftModel": body.leftModel,
                "rightModel": body.rightModel,
                "searchMode": body.searchMode.value if body.searchMode else None,
            },
        )


