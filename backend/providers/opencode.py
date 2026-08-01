import json
from typing import AsyncIterator, Optional

import httpx

from schemas.search import ResolvedSearchOptions
from security import iter_limited_response_lines, log_provider_error, outbound_client

from .base import BaseProvider, MAX_PROVIDER_OUTPUT_CHARS
from .stream_events import ProviderStreamEvent

OPENCODE_ROOTS = {
    "opencode-go": "https://opencode.ai/zen/go/v1",
    "opencode-zen": "https://opencode.ai/zen/v1",
}

GO_CHAT_MODELS = {
    "grok-4.5",
    "glm-5.2",
    "glm-5.1",
    "kimi-k3",
    "kimi-k2.7-code",
    "kimi-k2.6",
    "deepseek-v4-pro",
    "deepseek-v4-flash",
    "mimo-v2.5",
    "mimo-v2.5-pro",
    "hy3",
}

GO_MESSAGE_MODELS = {
    "minimax-m3",
    "minimax-m2.7",
    "minimax-m2.5",
    "qwen3.7-max",
    "qwen3.7-plus",
    "qwen3.6-plus",
}


def protocol_for(provider: str, model: str) -> str:
    model_id = model.lower()
    if provider == "opencode-zen":
        if model_id.startswith("gpt-"):
            return "responses"
        if model_id.startswith("claude-") or model_id.startswith("qwen"):
            return "messages"
        if model_id.startswith("gemini-"):
            return "gemini"
        return "chat"

    if provider == "opencode-go":
        if model_id in GO_MESSAGE_MODELS:
            return "messages"
        if model_id in GO_CHAT_MODELS:
            return "chat"
        raise ValueError(f"Unsupported OpenCode Go model '{model}'")

    raise ValueError(f"Unknown OpenCode provider '{provider}'")


def is_supported_live_model(provider: str, model: str) -> bool:
    if provider == "opencode-zen":
        return bool(model)
    try:
        protocol_for(provider, model)
        return True
    except ValueError:
        return False


class OpenCodeProvider(BaseProvider):
    """Protocol-aware adapter shared by OpenCode Go and Zen."""

    def __init__(
        self,
        key: str,
        model: str,
        provider: str,
        transport: Optional[httpx.AsyncBaseTransport] = None,
    ):
        if provider not in OPENCODE_ROOTS:
            raise ValueError(f"Unknown OpenCode provider '{provider}'")
        self.key = key
        self.model = model
        self.provider = provider
        self.root = OPENCODE_ROOTS[provider]
        self.protocol = protocol_for(provider, model)
        self.transport = transport

    def _url(self) -> str:
        if self.protocol == "responses":
            return f"{self.root}/responses"
        if self.protocol == "messages":
            return f"{self.root}/messages"
        if self.protocol == "gemini":
            return f"{self.root}/models/{self.model}:streamGenerateContent?alt=sse"
        return f"{self.root}/chat/completions"

    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.protocol in {"responses", "chat"}:
            headers["Authorization"] = f"Bearer {self.key}"
        elif self.protocol == "messages":
            headers["x-api-key"] = self.key
            headers["anthropic-version"] = "2023-06-01"
        else:
            headers["x-goog-api-key"] = self.key
        return headers

    def _payload(self, prompt: str) -> dict:
        if self.protocol == "responses":
            return {
                "model": self.model,
                "input": prompt,
                "stream": True,
                "max_output_tokens": 2048,
            }
        if self.protocol == "messages":
            return {
                "model": self.model,
                "messages": [{"role": "user", "content": prompt}],
                "stream": True,
                "max_tokens": 2048,
            }
        if self.protocol == "gemini":
            return {
                "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                "generationConfig": {"maxOutputTokens": 2048},
            }
        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "stream": True,
            "max_tokens": 2048,
        }
        if self.model.lower().startswith("deepseek-"):
            # DeepSeek defaults to hidden reasoning, which can consume the full
            # output budget before any user-visible content is emitted.
            payload["thinking"] = {"type": "disabled"}
        return payload

    def _text_from_event(self, event: dict) -> list[str]:
        if self.protocol == "responses":
            if event.get("type") == "response.output_text.delta":
                delta = event.get("delta")
                return [delta] if isinstance(delta, str) and delta else []
            return []

        if self.protocol == "messages":
            delta = event.get("delta")
            if not isinstance(delta, dict):
                return []
            if event.get("type") == "content_block_delta" and delta.get("type") == "text_delta":
                text = delta.get("text")
                return [text] if isinstance(text, str) and text else []
            return []

        if self.protocol == "gemini":
            candidates = event.get("candidates") or []
            if not candidates or not isinstance(candidates[0], dict):
                return []
            parts = (candidates[0].get("content") or {}).get("parts") or []
            return [
                part["text"]
                for part in parts
                if isinstance(part, dict) and isinstance(part.get("text"), str) and part["text"]
            ]

        choices = event.get("choices") or []
        if not choices:
            return []
        choice = choices[0]
        if not isinstance(choice, dict):
            return []
        content = (choice.get("delta") or {}).get("content")
        if isinstance(content, str):
            return [content] if content else []
        if isinstance(content, list):
            return [
                part["text"]
                for part in content
                if isinstance(part, dict) and isinstance(part.get("text"), str) and part["text"]
            ]
        message_content = (choice.get("message") or {}).get("content")
        if isinstance(message_content, str) and message_content:
            return [message_content]
        legacy_text = choice.get("text")
        return [legacy_text] if isinstance(legacy_text, str) and legacy_text else []

    @staticmethod
    def _safe_event_error(event: dict, default: str = "OpenCode stream failed") -> Exception:
        error = event.get("error")
        response = event.get("response")
        values = []
        for details in (event, error, response, response.get("error") if isinstance(response, dict) else None):
            if not isinstance(details, dict):
                continue
            values.extend(details.get(key) for key in ("code", "status", "type") if details.get(key))
        markers = " ".join(str(value).lower() for value in values)

        if "401" in markers or any(token in markers for token in ("authentication", "invalid_api_key")):
            return Exception("OpenCode API key is invalid")
        if "402" in markers or any(token in markers for token in ("billing", "credit")):
            return Exception("OpenCode billing or credits are required")
        if "403" in markers or any(token in markers for token in ("permission", "entitlement", "forbidden")):
            return Exception("OpenCode access, entitlement, or model availability was denied")
        if "404" in markers or "not_found" in markers:
            return Exception("OpenCode model or endpoint is unavailable")
        if "429" in markers or any(token in markers for token in ("rate_limit", "quota")):
            return Exception("OpenCode rate limit or quota was exceeded")
        if any(token in markers for token in ("resource_exhausted", "insufficient_resource")):
            return Exception("OpenCode inference resources were unavailable")
        if any(str(code) in markers for code in range(500, 600)) or any(
            token in markers for token in ("server_error", "internal_error")
        ):
            return Exception("OpenCode service is temporarily unavailable")
        return Exception(default)

    def _raise_for_stream_error(self, event: dict) -> bool:
        event_type = str(event.get("type") or "").lower()
        successful_terminal = False
        if self.protocol == "responses":
            if event_type == "response.failed":
                raise self._safe_event_error(event, "OpenCode response failed")
            if event_type == "response.incomplete":
                response = event.get("response") or {}
                if not isinstance(response, dict):
                    response = {}
                details = response.get("incomplete_details") or event.get("incomplete_details") or {}
                if not isinstance(details, dict):
                    details = {}
                reason = str(details.get("reason") or "").lower()
                if reason in {"max_output_tokens", "max_tokens"}:
                    raise Exception("OpenCode output limit reached before completion")
                if reason in {"content_filter", "safety"}:
                    raise Exception("OpenCode response was blocked by content filtering")
                raise Exception("OpenCode response was incomplete")
            if event_type == "response.completed":
                successful_terminal = True

        elif self.protocol == "messages":
            if event_type == "message_delta":
                delta = event.get("delta") or {}
                if not isinstance(delta, dict):
                    delta = {}
                stop_reason = str(delta.get("stop_reason") or "").lower()
                if stop_reason == "max_tokens":
                    raise Exception("OpenCode output limit reached before completion")
                if stop_reason == "refusal":
                    raise Exception("OpenCode response was blocked by content filtering")
                if stop_reason and stop_reason not in {"end_turn", "stop_sequence"}:
                    raise Exception("OpenCode response did not complete successfully")
            if event_type == "message_stop":
                successful_terminal = True

        elif self.protocol == "gemini":
            for candidate in event.get("candidates") or []:
                if not isinstance(candidate, dict):
                    continue
                finish_reason = str(candidate.get("finishReason") or "").upper()
                if finish_reason == "MAX_TOKENS":
                    raise Exception("OpenCode output limit reached before completion")
                if finish_reason in {
                    "SAFETY",
                    "BLOCKLIST",
                    "PROHIBITED_CONTENT",
                    "SPII",
                    "RECITATION",
                    "IMAGE_SAFETY",
                    "MODEL_ARMOR",
                }:
                    raise Exception("OpenCode response was blocked by safety filtering")
                if finish_reason in {"RESOURCE_EXHAUSTED", "INSUFFICIENT_RESOURCES"}:
                    raise Exception("OpenCode inference resources were unavailable")
                if finish_reason == "STOP":
                    successful_terminal = True
                elif finish_reason:
                    raise Exception("OpenCode response did not complete successfully")
            prompt_feedback = event.get("promptFeedback") or {}
            if not isinstance(prompt_feedback, dict):
                prompt_feedback = {}
            block_reason = str(prompt_feedback.get("blockReason") or "")
            if block_reason:
                raise Exception("OpenCode response was blocked by safety filtering")

        else:
            for choice in event.get("choices") or []:
                if not isinstance(choice, dict):
                    continue
                finish_reason = str(choice.get("finish_reason") or "").lower()
                if finish_reason == "length":
                    raise Exception("OpenCode output limit reached before completion")
                if finish_reason == "content_filter":
                    raise Exception("OpenCode response was blocked by content filtering")
                if finish_reason in {
                    "insufficient_system_resource",
                    "insufficient_resources",
                    "resource_exhausted",
                }:
                    raise Exception("OpenCode inference resources were unavailable")
                if finish_reason == "stop":
                    successful_terminal = True
                elif finish_reason:
                    raise Exception("OpenCode response did not complete successfully")

        if event.get("error") is not None or event_type == "error":
            # Inspect only machine-readable categories; never expose upstream details.
            raise self._safe_event_error(event)
        return successful_terminal

    @staticmethod
    def _status_error(status_code: int) -> Exception:
        if status_code == 401:
            return Exception("OpenCode API key is invalid")
        if status_code == 402:
            return Exception("OpenCode billing or credits are required")
        if status_code == 403:
            return Exception("OpenCode access, entitlement, or model availability was denied")
        if status_code == 404:
            return Exception("OpenCode model or endpoint is unavailable")
        if status_code == 429:
            return Exception("OpenCode rate limit or quota was exceeded")
        if status_code >= 500:
            return Exception("OpenCode service is temporarily unavailable")
        return Exception(f"OpenCode request was rejected with status {status_code}")

    async def complete(self, prompt: str, search: Optional[ResolvedSearchOptions] = None) -> str:
        parts: list[str] = []
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
                    "reason": f"{self.provider} does not support live web search in ModelWise",
                },
            )

        try:
            emitted_text = False
            successful_terminal = False
            async with outbound_client(180, transport=self.transport) as client:
                async with client.stream(
                    "POST",
                    self._url(),
                    headers=self._headers(),
                    json=self._payload(prompt),
                ) as response:
                    if response.status_code >= 400:
                        raise self._status_error(response.status_code)

                    async for line in iter_limited_response_lines(response):
                        if not line or not line.startswith("data:"):
                            continue
                        raw = line[5:].strip()
                        if raw == "[DONE]":
                            successful_terminal = True
                            break
                        try:
                            upstream_event = json.loads(raw)
                        except json.JSONDecodeError:
                            continue
                        if not isinstance(upstream_event, dict):
                            continue
                        for text in self._text_from_event(upstream_event):
                            emitted_text = True
                            yield ProviderStreamEvent(kind="token", text=text)
                        successful_terminal = (
                            self._raise_for_stream_error(upstream_event) or successful_terminal
                        )
            if not emitted_text:
                raise Exception("OpenCode returned no answer text")
            if not successful_terminal:
                raise Exception("OpenCode stream terminated unexpectedly")
        except httpx.TimeoutException:
            raise Exception("OpenCode request timed out") from None
        except httpx.RequestError:
            raise Exception("OpenCode network request failed") from None
        except Exception as e:
            log_provider_error("OpenCode provider error", e)
            raise e from None
