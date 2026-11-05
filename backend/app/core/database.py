from collections.abc import Generator
from functools import lru_cache

from fastapi import Request
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings, get_settings
from app.db.base import Base


def build_engine(settings: Settings) -> Engine | None:
    if not settings.database_url or not settings.database_url.strip():
        return None

    db_url = settings.database_url.strip()
    if db_url.startswith("sqlite"):
        # SQLite requires check_same_thread=False and does not support connect_timeout
        return create_engine(
            db_url,
            pool_pre_ping=True,
            connect_args={"check_same_thread": False},
        )

    return create_engine(
        db_url,
        pool_pre_ping=True,
        pool_recycle=300,
        connect_args={"connect_timeout": 5},
    )


def build_session_factory(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(
        bind=engine,
        class_=Session,
        autoflush=False,
        expire_on_commit=False,
    )


@lru_cache
def get_engine() -> Engine:
    engine = build_engine(get_settings())
    if engine is None:
        raise RuntimeError("DATABASE_URL is not configured")
    return engine


@lru_cache
def get_session_factory() -> sessionmaker[Session]:
    return build_session_factory(get_engine())


def get_db(request: Request = None) -> Generator[Session, None, None]:
    """Request-scoped database session dependency."""
    if (
        request is not None
        and hasattr(request, "app")
        and hasattr(request.app.state, "session_factory")
        and request.app.state.session_factory is not None
    ):
        factory = request.app.state.session_factory
    else:
        factory = get_session_factory()

    session = factory()
    try:
        yield session
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def check_database(engine: Engine | None = None) -> dict:
    """Return connectivity and pgvector status. Never raises."""
    if engine is None:
        try:
            engine = get_engine()
        except Exception as exc:
            return {"database": False, "pgvector": False, "error": type(exc).__name__}

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            has_vector = conn.execute(
                text("SELECT 1 FROM pg_extension WHERE extname = 'vector'")
            ).first() is not None
        return {"database": True, "pgvector": has_vector}
    except Exception as exc:
        return {"database": False, "pgvector": False, "error": type(exc).__name__}


def check_pgvector(engine: Engine) -> dict[str, str]:
    with engine.connect() as connection:
        enabled = connection.execute(
            text(
                "SELECT EXISTS ("
                "SELECT 1 FROM pg_extension WHERE extname = 'vector'"
                ")"
            )
        ).scalar_one()

    if not enabled:
        raise RuntimeError("pgvector extension is not enabled")

    return {"pgvector": "ok"}