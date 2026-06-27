from fastapi import FastAPI
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(title="Health Test")

# Simple health endpoint
@app.get("/health")
async def health():
    """Health check endpoint that always returns 200 when app is running"""
    return {"status": "ok"}

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Health Test API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)














