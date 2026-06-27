import httpx
from .settings import settings

# Shared HTTP client with proper timeouts and connection pooling
client = httpx.AsyncClient(
    timeout=httpx.Timeout(
        timeout=settings.REQUEST_TIMEOUT,
        read=settings.READ_TIMEOUT,
        connect=settings.CONNECT_TIMEOUT
    ),
    follow_redirects=True,
    limits=httpx.Limits(
        max_keepalive_connections=20,
        max_connections=100
    )
)

async def close_client():
    """Close the HTTP client on shutdown"""
    await client.aclose()
