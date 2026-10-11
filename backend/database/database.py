"""
Database engine with production-grade connection pooling and startup retry
(so the backend container doesn't crash-loop while Postgres is still booting).
"""

import time
import logging
import redis
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import OperationalError
from contextlib import contextmanager
from sqlalchemy import text


from backend.config import settings

logger = logging.getLogger("database")


if settings.DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False,
    )
else:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        pool_recycle=1800,
        echo=False,
    )


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def wait_for_db(max_retries: int = 10, delay_seconds: int = 3) -> None:
    """Retries the DB connection on container startup instead of failing immediately."""
    for attempt in range(1, max_retries + 1):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("Database connection established.")
            return
        except OperationalError:
            logger.warning(f"DB not ready (attempt {attempt}/{max_retries}), retrying in {delay_seconds}s...")
            time.sleep(delay_seconds)
    raise RuntimeError("Could not connect to the database after multiple retries.")


def wait_for_redis(max_retries: int = 10, delay_seconds: int = 3) -> bool:
    """Retries the Redis connection on startup and returns whether it became available."""
    for attempt in range(1, max_retries + 1):
        try:
            client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
            client.ping()
            logger.info("Redis connection established.")
            return True
        except redis.exceptions.RedisError:
            logger.warning(
                f"Redis not ready (attempt {attempt}/{max_retries}), retrying in {delay_seconds}s..."
            )
            time.sleep(delay_seconds)
    logger.warning("Redis is unavailable after retries; continuing startup without Redis-dependent features.")
    return False


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def db_session():
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
print("DATABASE_URL =", settings.DATABASE_URL)



