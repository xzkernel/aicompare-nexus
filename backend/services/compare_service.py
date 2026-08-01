import asyncio

import logging

import time

from typing import Any, Dict, Tuple



from providers.factory import provider_for

from schemas.compare import AskRequest, AskResponse, CompareRequest, CompareResponse, ProviderSpec

from schemas.search import ResolvedSearchOptions

from security import classify_provider_error, redact_sensitive_data

from utils.byok import ByokHeaders

from utils.model_resolver import resolve_side



logger = logging.getLogger(__name__)
COMPARE_DEADLINE_SECONDS = 180.0





async def _run_provider(

    name: str,

    key: str,

    model: str,

    prompt: str,

    extras: dict,

    search: ResolvedSearchOptions,

) -> Tuple[str, float]:

    start = time.monotonic()

    try:

        provider = provider_for(name, key, model, extras)

        text = await provider.complete(prompt, search)
        if not text.strip():
            raise Exception("Provider returned no answer text")

        return text, round(time.monotonic() - start, 3)

    except Exception as e:

        logger.error("Provider %s failed: %s", name, redact_sensitive_data(str(e)))

        return classify_provider_error(e), round(time.monotonic() - start, 3)





async def run_ask_comparison(body: AskRequest, keys: ByokHeaders) -> AskResponse:

    """Dual-model compare — preserves /api/v1/ask response contract."""

    loop = asyncio.get_running_loop()
    deadline = loop.time() + COMPARE_DEADLINE_SECONDS
    search = ResolvedSearchOptions.from_request(body.searchMode)

    left_name, left_key, left_model, left_extras = resolve_side(

        body.leftModel, body.leftProvider, keys

    )

    right_name, right_key, right_model, right_extras = resolve_side(

        body.rightModel, body.rightProvider, keys

    )



    tasks = [
        asyncio.create_task(_run_provider(left_name, left_key, left_model, body.prompt, left_extras, search)),
        asyncio.create_task(_run_provider(right_name, right_key, right_model, body.prompt, right_extras, search)),
    ]
    done, pending = await asyncio.wait(tasks, timeout=max(0.0, deadline - loop.time()))
    for task in pending:
        task.cancel()
    if pending:
        await asyncio.gather(*pending, return_exceptions=True)
    timeout_result = ("Provider request timed out.", COMPARE_DEADLINE_SECONDS)
    (left_response, left_time), (right_response, right_time) = [
        task.result() if task in done else timeout_result for task in tasks
    ]



    return AskResponse(

        prompt=body.prompt,

        leftModel=body.leftModel,

        rightModel=body.rightModel,

        leftResponse=left_response,

        rightResponse=right_response,

        leftTime=left_time,

        rightTime=right_time,

    )





async def _run_spec(spec: ProviderSpec, prompt: str, keys: ByokHeaders) -> Tuple[str, Dict[str, Any]]:

    try:

        provider_name, key, model, extras = resolve_side(spec.model, spec.provider, keys)

        provider = provider_for(provider_name, key, model, extras)

        text = await provider.complete(prompt)
        if not text.strip():
            raise Exception("Provider returned no answer text")

        return spec.label, {"ok": True, "text": text, "model": model, "provider": provider_name}

    except Exception as e:

        logger.error("Provider %s failed: %s", spec.label, redact_sensitive_data(str(e)))

        return spec.label, {

            "ok": False,

            "error": classify_provider_error(e),

            "model": spec.model,

            "provider": spec.provider,

        }





async def run_multi_compare(req: CompareRequest, keys: ByokHeaders) -> CompareResponse:

    """Multi-provider compare — BYOK headers only (keys never in request body)."""
    loop = asyncio.get_running_loop()
    deadline = loop.time() + COMPARE_DEADLINE_SECONDS
    tasks = {
        asyncio.create_task(_run_spec(spec, req.prompt, keys)): spec
        for spec in req.providers
    }
    done, pending = await asyncio.wait(tasks, timeout=max(0.0, deadline - loop.time()))
    pairs = [task.result() for task in done]
    for task in pending:
        task.cancel()
        spec = tasks[task]
        pairs.append(
            (
                spec.label,
                {
                    "ok": False,
                    "error": "Provider request timed out.",
                    "model": spec.model,
                    "provider": spec.provider,
                },
            )
        )
    if pending:
        await asyncio.gather(*pending, return_exceptions=True)
    return CompareResponse(prompt=req.prompt, results=dict(pairs))

