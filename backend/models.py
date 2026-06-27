"""
Legacy SQLAlchemy models removed.
Optional cloud sync uses Supabase Postgres directly from the frontend.
"""
from sqlalchemy.orm import declarative_base

Base = declarative_base()
