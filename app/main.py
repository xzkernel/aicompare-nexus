from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging

from .core.settings import settings
from .core.http import close_client
from .routers import openai, gemini

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Starting AI Proxy API...")
    logger.info(f"Server will run on {settings.HOST}:{settings.PORT}")
    logger.info(f"CORS origins: {settings.CORS_ORIGINS}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down AI Proxy API...")
    await close_client()
    logger.info("AI Proxy API shutdown complete")

# Create FastAPI app
app = FastAPI(
    title="AI Proxy API",
    description="Secure FastAPI proxy for OpenAI and Gemini APIs",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(openai.router)
app.include_router(gemini.router)

# Health check endpoint
@app.get("/healthz")
async def healthz():
    """Health check endpoint"""
    return {"ok": True, "status": "healthy"}

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "AI Proxy API",
        "version": "1.0.0",
        "endpoints": {
            "openai": "/api/openai/chat",
            "gemini": "/api/gemini/generate",
            "health": "/healthz",
            "docs": "/docs"
        }
    }

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for any unhandled errors"""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "provider": "proxy",
            "message": "Internal server error",
            "details": {"error": str(exc)}
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
