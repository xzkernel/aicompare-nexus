from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # API Keys (required)
    OPENAI_API_KEY: str
    GEMINI_API_KEY: str
    
    # API Base URLs
    OPENAI_BASE: str = "https://api.openai.com/v1"
    GEMINI_BASE: str = "https://generativelanguage.googleapis.com/v1beta"
    
    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 9000
    DEBUG: bool = True
    
    # CORS Configuration
    CORS_ORIGINS: str = "http://localhost:8080,http://127.0.0.1:8080"
    
    # HTTP Client Configuration
    REQUEST_TIMEOUT: int = 30
    READ_TIMEOUT: int = 60
    CONNECT_TIMEOUT: int = 10
    
    class Config:
        env_file = "app/.env"
        case_sensitive = True

# Global settings instance
settings = Settings()
