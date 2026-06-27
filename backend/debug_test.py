#!/usr/bin/env python3
"""Debug test to check header handling"""

from fastapi import FastAPI, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TestRequest(BaseModel):
    prompt: str

@app.post("/test")
def test_endpoint(
    body: TestRequest,
    x_openai_api_key: Optional[str] = Header(default=None, alias="X-OpenAI-API-Key"),
):
    return {
        "received_key": "Yes" if x_openai_api_key else "No",
        "key_value": x_openai_api_key[:10] + "..." if x_openai_api_key else None,
        "prompt": body.prompt
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting debug server on port 8002...")
    uvicorn.run(app, host="127.0.0.1", port=8002)
