import asyncio

import httpx

from main import create_app


def test_opencode_header_is_allowed_by_cors(monkeypatch):
    origin = "https://frontend.example"
    monkeypatch.setenv("CORS_ORIGINS", origin)
    app = create_app()

    async def preflight():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.options(
                "/api/v1/stream",
                headers={
                    "Origin": origin,
                    "Access-Control-Request-Method": "POST",
                    "Access-Control-Request-Headers": "content-type,x-opencode-api-key",
                },
            )

    response = asyncio.run(preflight())
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
    assert "X-OpenCode-API-Key" in response.headers["access-control-allow-headers"]


def test_stream_rejects_missing_key_for_selected_side():
    app = create_app()

    async def request():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.post(
                "/api/v1/stream",
                headers={"X-OpenAI-API-Key": "unit-test-key"},
                json={
                    "prompt": "hello",
                    "leftModel": "gpt-5.5",
                    "leftProvider": "openai",
                    "rightModel": "grok-4.5",
                    "rightProvider": "opencode-go",
                },
            )

    response = asyncio.run(request())
    assert response.status_code == 400
    assert response.json()["detail"] == "No OpenCode API key for model 'grok-4.5'"
