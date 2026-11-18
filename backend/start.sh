#!/usr/bin/env bash
set -e

echo "==> HealthMate AI Backend Initializing..."

# Run database migrations
echo "==> Running database migrations with Alembic..."
if alembic upgrade head; then
    echo "==> Database migrations applied successfully."
else
    echo "==> Warning: Database migrations failed or database is not reachable yet. Proceeding with server start..."
fi

# Ensure storage directory exists
STORAGE_DIR="${DOCUMENT_STORAGE_DIR:-./private_uploads}"
mkdir -p "$STORAGE_DIR"

PORT="${PORT:-8000}"
echo "==> Starting Uvicorn on host 0.0.0.0 and port $PORT..."
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
