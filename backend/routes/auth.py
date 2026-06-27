"""
Legacy auth stack removed — identity/sync uses Supabase client-side only.
BYOK compare routes do not require authentication.
"""
from fastapi import APIRouter

router = APIRouter()
