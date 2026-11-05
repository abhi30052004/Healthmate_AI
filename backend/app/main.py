from contextlib import asynccontextmanager

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core import database
from app.core.config import get_settings

import logging
import os
from pathlib import Path

logger = logging.getLogger("healthmate.api")

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure physical document storage directory exists
    try:
        storage_path = Path(settings.document_storage_dir).resolve()
        storage_path.mkdir(parents=True, exist_ok=True)
        logger.info("Storage directory initialized at: %s", storage_path)
    except Exception as exc:
        logger.error("Failed to initialize storage directory: %s", exc)

    # Application-scoped database engine and session factory
    try:
        engine = database.get_engine()
        app.state.engine = engine
        session_factory = database.get_session_factory()
        app.state.session_factory = session_factory

        # Safe idempotent legacy checksum backfill
        try:
            with session_factory() as db:
                from app.services.checksum_backfill import backfill_document_checksums
                result = backfill_document_checksums(db)
                if result.get("updated", 0) > 0:
                    logger.info("Startup checksum backfill completed: %s", result)
        except Exception as bf_exc:
            logger.warning("Startup checksum backfill skipped: %s", bf_exc)

    except Exception as db_exc:
        logger.error(
            "Fatal: database engine initialization failed on startup: %s",
            db_exc,
            exc_info=True,
        )
        app.state.engine = None
        app.state.session_factory = None
    yield
    if getattr(app.state, "engine", None) is not None:
        app.state.engine.dispose()


app = FastAPI(
    title=settings.app_name,
    docs_url="/docs" if settings.app_env == "development" else None,
    redoc_url="/redoc" if settings.app_env == "development" else None,
    lifespan=lifespan,
)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Mask internal tracebacks in production while keeping detailed logs."""
    logger.exception("Unhandled server exception: %s", exc)
    if settings.app_env == "development":
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=500,
            content={"detail": f"Internal Server Error: {str(exc)}"},
        )
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred. Please contact system support."},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes with configured prefix (/api)
app.include_router(api_router, prefix=settings.api_prefix)


@app.get("/health/live", tags=["Health"])
def live() -> dict:
    return {"status": "ok", "service": "healthmate-api"}


@app.get("/health/ready", tags=["Health"])
def ready(response: Response) -> dict:
    result = database.check_database()
    ok = result["database"] and result["pgvector"]
    if not ok:
        response.status_code = 503
    return {"status": "ok" if ok else "unavailable", **result}


@app.get(f"{settings.api_prefix}/status", tags=["System"])
def status() -> dict:
    return {"app": settings.app_name, "env": settings.app_env, "status": "ok"}
