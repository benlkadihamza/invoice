"""Cloudflare entry point using the runtime's supported WSGI adapter."""
import asyncio
import os

from workers import WorkerEntrypoint, wsgi

_flask_app = None
_request_lock = asyncio.Lock()


def _init_app(env):
    global _flask_app
    if _flask_app is not None:
        return _flask_app

    # Keep the deployed binding name; accept HYPERDRIVE for older environments.
    database = getattr(env, "postgres", None)
    if database is None:
        database = getattr(env, "HYPERDRIVE", None)
    if database is None:
        raise RuntimeError("Missing Hyperdrive binding: configure postgres in wrangler.toml")
    os.environ["DATABASE_URL"] = str(database.connectionString)

    for name in (
        "SECRET_KEY",
        "AWS_ENDPOINT_URL_S3",
        "AWS_REGION",
        "AWS_S3_BUCKET",
        "AWS_S3_FORCE_PATH_STYLE",
        "AWS_ACCESS_KEY_ID",
        "AWS_SECRET_ACCESS_KEY",
    ):
        value = getattr(env, name, None)
        if value:
            os.environ[name] = str(value)

    # app.py creates its module-level app during import. Set this first so
    # that instance also uses the injected bindings and the correct pool.
    os.environ["FLASK_CONFIG"] = "cloudflare"
    from app import app

    _flask_app = app
    return _flask_app


class Default(WorkerEntrypoint):
    async def fetch(self, request):
        # Python socket operations can yield; serialize synchronous SQLAlchemy
        # operations as recommended by the Python Hyperdrive documentation.
        async with _request_lock:
            app = _init_app(self.env)
            return await wsgi.fetch(app, request, self.env)
