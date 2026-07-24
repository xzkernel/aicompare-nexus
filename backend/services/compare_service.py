import asyncio

import logging

import time

from typing import Any, Dict, Tuple



from providers.factory import provider_for

from schemas.compare import AskRequest, AskResponse, CompareRequest, CompareResponse, ProviderSpec

from schemas.search import ResolvedSearchOptions

from security import classify_provider_error

from utils.byok import ByokHeaders

from utils.model_resolver import resolve_side



logger = logging.getLogger(__name__)





async def _run_provider(

    name: str,

    key: str,

    model: str,

    prompt: str,

    extras: dict,

    search: ResolvedSearchOptions,

) -> Tuple[str, float]:

    start = time.time()

    try:

        provider = provider_for(name, key, model, extras)

        text = await provider.complete(prompt, search)

        return text, round(time.time() - start, 3)

    except Exception as e:

        logger.error("Provider %s failed: %s", name, e)

        return classify_provider_error(e), round(time.time() - start, 3)





async def run_ask_comparison(body: AskRequest, keys: ByokHeaders) -> AskResponse:

    """Dual-model compare — preserves /api/v1/ask response contract."""

    search = ResolvedSearchOptions.from_request(body.searchMode)

    left_name, left_key, left_model, left_extras = resolve_side(

        body.leftModel, body.leftProvider, keys

    )

    right_name, right_key, right_model, right_extras = resolve_side(

        body.rightModel, body.rightProvider, keys

    )



    left_task = _run_provider(left_name, left_key, left_model, body.prompt, left_extras, search)

    right_task = _run_provider(right_name, right_key, right_model, body.prompt, right_extras, search)

    (left_response, left_time), (right_response, right_time) = await asyncio.wait_for(


        asyncio.gather(


        left_task, right_task


    ),


        timeout=180


    )



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

        return spec.label, {"ok": True, "text": text, "model": model, "provider": provider_name}

    except Exception as e:

        logger.error("Provider %s failed: %s", spec.label, e)

        return spec.label, {

            "ok": False,

            "error": classify_provider_error(e),

            "model": spec.model,

            "provider": spec.provider,

        }





async def run_multi_compare(req: CompareRequest, keys: ByokHeaders) -> CompareResponse:

    """Multi-provider compare — BYOK headers only (keys never in request body)."""

    results = await asyncio.gather(*[_run_spec(p, req.prompt, keys) for p in req.providers])

    return CompareResponse(prompt=req.prompt, results=dict(results))

