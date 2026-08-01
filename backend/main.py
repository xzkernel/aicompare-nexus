"""
ModelWise backend — canonical entrypoint.
Mounts routers only; no inline provider or compare logic.
"""
import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

backend_env = os.path.join(os.path.dirname(__file__), "env.env")
load_dotenv(backend_env)

from config import ENABLE_API_DOCS, IS_PRODUCTION
from routes import compare, stream, health, models
from middleware import RateLimitMiddleware, RequestSizeLimitMiddleware
from security import SecurityMiddleware, shutdown_dns_executor, startup_dns_executor

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    startup_dns_executor()
    logger.info("ModelWise API starting (BYOK / local-first, env=%s)", "production" if IS_PRODUCTION else "development")
    try:
        yield
    finally:
        await shutdown_dns_executor()
        logger.info("ModelWise API shutdown")


def create_app() -> FastAPI:
    docs_url = "/docs" if ENABLE_API_DOCS else None
    redoc_url = "/redoc" if ENABLE_API_DOCS else None
    openapi_url = "/openapi.json" if ENABLE_API_DOCS else None

    app = FastAPI(
        title="ModelWise AI Comparison API",
        description="Open-source BYOK AI model evaluation infrastructure",
        version="1.0.0",
        lifespan=lifespan,
        docs_url=docs_url,
        redoc_url=redoc_url,
        openapi_url=openapi_url,
    )

    cors_origins = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:8080,http://localhost:5173,http://127.0.0.1:8080",
    ).split(",")
    parsed_origins = [o.strip() for o in cors_origins if o.strip()]
    if "*" in parsed_origins:
        raise ValueError("CORS_ORIGINS must not contain '*' when credentials are enabled")

    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(RequestSizeLimitMiddleware)

    app.include_router(health.router)
    app.include_router(compare.router)
    app.include_router(stream.router)
    app.include_router(models.router)

    # Wrap the completed FastAPI stack so generated 500 responses also receive
    # security and CORS headers before ServerErrorMiddleware re-raises.
    app.middleware_stack = CORSMiddleware(
        SecurityMiddleware(app.build_middleware_stack()),
        allow_origins=parsed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=[
            "Content-Type",
            "Accept",
            "X-OpenAI-API-Key",
            "X-Google-API-Key",
            "X-Anthropic-API-Key",
            "X-OpenCode-API-Key",
            "X-Meta-API-Key",
            "X-Meta-Base-Url",
            "X-Meta-Key-Header",
            "X-Custom-API-Key",
            "X-Custom-Base-Url",
            "X-Custom-Key-Header",
        ],
    )

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8001"))
    logger.info("Starting ModelWise backend on port %s", port)
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True, log_level="info")
