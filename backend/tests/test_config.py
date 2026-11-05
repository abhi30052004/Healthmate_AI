from app.core.config import Settings


def test_cors_origins_parsed():
    s = Settings(frontend_origins="http://a.com, http://b.com ,")
    assert s.cors_origins == ["http://a.com", "http://b.com"]


def test_defaults():
    s = Settings(_env_file=None)
    assert s.api_prefix == "/api"


def test_check_database_without_url_does_not_raise(monkeypatch):
    from app.core import database
    from app.core.config import get_settings

    monkeypatch.setenv("DATABASE_URL", "")
    get_settings.cache_clear()
    database.get_engine.cache_clear()
    result = database.check_database()
    assert result["database"] is False
    get_settings.cache_clear()


def test_production_security_validation_insecure_jwt_secret():
    import pytest

    with pytest.raises(ValueError, match="Insecure JWT_SECRET_KEY"):
        Settings(
            _env_file=None,
            app_env="production",
            jwt_secret_key="replace-in-production",
            database_url="postgresql+psycopg://user:pass@host:5432/db",
            frontend_origins="https://app.healthmate.ai",
        )


def test_production_security_validation_missing_database_url():
    import pytest

    with pytest.raises(ValueError, match="DATABASE_URL must be explicitly configured"):
        Settings(
            _env_file=None,
            app_env="production",
            jwt_secret_key="a-secure-production-jwt-secret-key-that-is-long-enough",
            database_url="",
            frontend_origins="https://app.healthmate.ai",
        )


def test_production_security_validation_wildcard_cors():
    import pytest

    with pytest.raises(ValueError, match="Wildcard CORS origin is not permitted"):
        Settings(
            _env_file=None,
            app_env="production",
            jwt_secret_key="a-secure-production-jwt-secret-key-that-is-long-enough",
            database_url="postgresql+psycopg://user:pass@host:5432/db",
            frontend_origins="*",
        )


def test_production_security_validation_valid():
    s = Settings(
        _env_file=None,
        app_env="production",
        jwt_secret_key="a-secure-production-jwt-secret-key-that-is-long-enough",
        database_url="postgresql+psycopg://user:pass@host:5432/db",
        frontend_origins="https://app.healthmate.ai",
    )
    assert s.app_env == "production"
    assert s.cors_origins == ["https://app.healthmate.ai"]
