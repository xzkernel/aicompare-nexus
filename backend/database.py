from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base
from config import settings
import logging

logger = logging.getLogger(__name__)

# Database engine and session
engine = None
SessionLocal = None

def init_db():
    """Initialize database connection and create tables"""
    global engine, SessionLocal
    
    try:
        if not settings.DATABASE_URL:
            logger.warning("DATABASE_URL not configured, skipping database initialization")
            return
        
        # Create engine
        engine = create_engine(settings.DATABASE_URL)
        
        # Test connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            logger.info("Database connection successful")
        
        # Create session factory
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        
        # Import models here to avoid circular imports
        from models import Base
        
        # Create tables
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
        
        # Check if we need to migrate existing data
        migrate_user_table_if_needed()
        
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise

def migrate_user_table_if_needed():
    """Migrate existing user table to support OAuth if needed"""
    try:
        with engine.connect() as conn:
            # Check if name and avatar_url columns exist
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                AND column_name IN ('name', 'avatar_url')
            """))
            existing_columns = {row[0] for row in result}
            
            # Add missing columns
            if 'name' not in existing_columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN name VARCHAR"))
                logger.info("Added 'name' column to users table")
            
            if 'avatar_url' not in existing_columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR"))
                logger.info("Added 'avatar_url' column to users table")
            
            # Check if id column is already String type
            result = conn.execute(text("""
                SELECT data_type 
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                AND column_name = 'id'
            """))
            
            if result.rowcount > 0:
                current_type = result.fetchone()[0]
                if current_type != 'character varying':
                    logger.warning("User ID column is not VARCHAR type. Manual migration may be needed.")
                    logger.warning("Current type: " + current_type)
                    logger.warning("Expected type: character varying (VARCHAR)")
            
            conn.commit()
            
    except Exception as e:
        logger.warning(f"User table migration check failed: {e}")
        logger.warning("You may need to manually update the users table schema")

def get_db() -> Session:
    """Get database session"""
    if not SessionLocal:
        raise RuntimeError("Database not initialized. Call init_db() first.")
    
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def close_db():
    """Close database connections"""
    global engine
    if engine:
        engine.dispose()
        logger.info("Database connections closed")
