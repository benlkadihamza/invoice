"""
Cloudflare Workers entry point.
Bridges the Workers fetch API → Flask WSGI.
"""
import io
import os
import sys

from js import Response, Headers, URL as JSURL

_flask_app = None


def _init_app(env):
    """Lazily create the Flask app, injecting Cloudflare bindings as env vars."""
    global _flask_app
    if _flask_app is not None:
        return _flask_app

    # Hyperdrive gives us a standard PostgreSQL connection string.
    if hasattr(env, "HYPERDRIVE"):
        os.environ["DATABASE_URL"] = env.HYPERDRIVE.connectionString

    # Secrets set via `wrangler secret put SECRET_KEY`
    if hasattr(env, "SECRET_KEY"):
        os.environ["SECRET_KEY"] = env.SECRET_KEY

    # Object storage configuration (vars and secrets).
    for name in (
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

    os.environ.setdefault("FLASK_CONFIG", "production")

    from app import create_app
    _flask_app = create_app("cloudflare")
    return _flask_app


async def on_fetch(request, env, ctx=None):
    app = _init_app(env)

    # ── Parse Workers Request ──────────────────
    parsed = JSURL.new(request.url)
    method  = request.method
    path    = parsed.pathname
    qs      = parsed.search.lstrip("?") if parsed.search else ""
    scheme  = parsed.protocol.rstrip(":")
    host    = parsed.hostname
    port    = parsed.port or ("443" if scheme == "https" else "80")

    # Read body bytes
    body = b""
    if method in ("POST", "PUT", "PATCH"):
        body = bytes(await request.arrayBuffer())

    # Flatten request headers
    hdr = {}
    for k, v in request.headers:
        hdr[k.lower()] = v

    content_type   = hdr.get("content-type", "")
    content_length = hdr.get("content-length", str(len(body)))

    # ── Build WSGI environ ─────────────────────
    environ = {
        "REQUEST_METHOD":   method,
        "PATH_INFO":        path,
        "QUERY_STRING":     qs,
        "CONTENT_TYPE":     content_type,
        "CONTENT_LENGTH":   content_length,
        "SERVER_NAME":      host,
        "SERVER_PORT":      port,
        "SERVER_PROTOCOL":  "HTTP/1.1",
        "wsgi.version":     (1, 0),
        "wsgi.url_scheme":  scheme,
        "wsgi.input":       io.BytesIO(body),
        "wsgi.errors":      sys.stderr,
        "wsgi.multithread": False,
        "wsgi.multiprocess":False,
        "wsgi.run_once":    False,
        "HTTP_HOST":        hdr.get("host", host),
    }

    for k, v in hdr.items():
        key = "HTTP_" + k.upper().replace("-", "_")
        if key not in ("HTTP_CONTENT_TYPE", "HTTP_CONTENT_LENGTH"):
            environ[key] = v

    # ── Call Flask ─────────────────────────────
    status_holder  = []
    headers_holder = []
    body_chunks    = []

    def start_response(status, response_headers, exc_info=None):
        status_holder.append(status)
        headers_holder.extend(response_headers)

    iterable = app(environ, start_response)
    try:
        for chunk in iterable:
            body_chunks.append(chunk)
    finally:
        if hasattr(iterable, "close"):
            iterable.close()

    if not status_holder:
        return Response.new("Internal Server Error", status=500)

    status_code = int(status_holder[0].split(" ", 1)[0])
    resp_body   = b"".join(body_chunks)

    js_headers = Headers.new()
    for name, value in headers_holder:
        js_headers.set(name, value)

    return Response.new(resp_body, status=status_code, headers=js_headers)
