"""File storage for uploads.

Uses an S3-compatible bucket (Neon object storage) when configured, and falls
back to the local filesystem for development. Keys are always of the form
``products/<filename>`` or ``receipts/<filename>``.
"""
import hashlib
import hmac
import mimetypes
import os
from datetime import datetime, timezone
from urllib.parse import quote, urlparse

from flask import current_app

PREFIXES = ("products", "receipts")


class StorageError(RuntimeError):
    pass


def _env(name, default=""):
    return os.environ.get(name, default).strip()


def s3_enabled():
    return all(
        _env(name)
        for name in (
            "AWS_ENDPOINT_URL_S3",
            "AWS_ACCESS_KEY_ID",
            "AWS_SECRET_ACCESS_KEY",
            "AWS_S3_BUCKET",
        )
    )


def _config():
    return {
        "endpoint": _env("AWS_ENDPOINT_URL_S3").rstrip("/"),
        "region": _env("AWS_REGION", "us-east-1"),
        "bucket": _env("AWS_S3_BUCKET"),
        "access_key": _env("AWS_ACCESS_KEY_ID"),
        "secret_key": _env("AWS_SECRET_ACCESS_KEY"),
        "path_style": _env("AWS_S3_FORCE_PATH_STYLE", "true").lower()
        not in ("0", "false", "no"),
    }


def _split_key(key):
    prefix, sep, name = (key or "").partition("/")
    if (
        not sep
        or prefix not in PREFIXES
        or not name
        or "/" in name
        or "\\" in name
        or ".." in name
    ):
        raise ValueError(f"Invalid storage key: {key!r}")
    return prefix, name


def local_path(key):
    prefix, name = _split_key(key)
    if prefix == "products":
        root = os.path.join(current_app.static_folder, "uploads", "products")
    else:
        root = current_app.config["UPLOAD_FOLDER"]
    return os.path.join(root, name)


def _hmac(key, message):
    return hmac.new(key, message.encode("utf-8"), hashlib.sha256).digest()


def _signing_key(secret_key, date_stamp, region):
    k_date = _hmac(("AWS4" + secret_key).encode("utf-8"), date_stamp)
    k_region = _hmac(k_date, region)
    k_service = _hmac(k_region, "s3")
    return _hmac(k_service, "aws4_request")


def _canonical_uri(bucket, key, path_style):
    path = f"/{bucket}/{key}" if path_style else f"/{key}"
    return quote(path, safe="/-_.~")


def sign_request(
    method,
    bucket,
    key,
    payload=b"",
    content_type=None,
    extra_headers=None,
    now=None,
    config=None,
):
    """Build a SigV4-signed URL and headers for one S3 request."""
    cfg = config or _config()
    now = now or datetime.now(timezone.utc)
    amz_date = now.strftime("%Y%m%dT%H%M%SZ")
    date_stamp = now.strftime("%Y%m%d")
    payload_hash = hashlib.sha256(payload).hexdigest()
    endpoint_host = urlparse(cfg["endpoint"]).netloc
    host = endpoint_host if cfg["path_style"] else f"{bucket}.{endpoint_host}"

    headers = {
        "host": host,
        "x-amz-content-sha256": payload_hash,
        "x-amz-date": amz_date,
    }
    if content_type:
        headers["content-type"] = content_type
    if extra_headers:
        headers.update({k.lower(): v for k, v in extra_headers.items()})

    canonical_headers = "".join(
        f"{name}:{value.strip()}\n" for name, value in sorted(headers.items())
    )
    signed_headers = ";".join(sorted(headers))
    canonical_request = "\n".join(
        [
            method,
            _canonical_uri(bucket, key, cfg["path_style"]),
            "",
            canonical_headers,
            signed_headers,
            payload_hash,
        ]
    )

    scope = f"{date_stamp}/{cfg['region']}/s3/aws4_request"
    string_to_sign = "\n".join(
        [
            "AWS4-HMAC-SHA256",
            amz_date,
            scope,
            hashlib.sha256(canonical_request.encode("utf-8")).hexdigest(),
        ]
    )
    signature = hmac.new(
        _signing_key(cfg["secret_key"], date_stamp, cfg["region"]),
        string_to_sign.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    authorization = (
        f"AWS4-HMAC-SHA256 Credential={cfg['access_key']}/{scope}, "
        f"SignedHeaders={signed_headers}, Signature={signature}"
    )
    request_headers = {
        name: value for name, value in headers.items() if name != "host"
    }
    request_headers["authorization"] = authorization

    if cfg["path_style"]:
        url = cfg["endpoint"] + _canonical_uri(bucket, key, True)
    else:
        url = f"https://{host}{_canonical_uri(bucket, key, False)}"
    return url, request_headers


def _request_urllib(method, url, headers, body):
    import urllib.error
    import urllib.request

    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return (
                response.status,
                response.read(),
                response.headers.get("content-type", ""),
            )
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read(), exc.headers.get("content-type", "")


def _request(method, url, headers, body=None):
    try:
        from pyodide.ffi import run_sync, to_js
        from workers import fetch
    except ImportError:
        return _request_urllib(method, url, headers, body)

    kwargs = {"method": method, "headers": headers}
    if body is not None:
        kwargs["body"] = to_js(body)
    response = run_sync(fetch(url, **kwargs))
    status = int(response.status)
    data = run_sync(response.bytes())
    try:
        content_type = str(response.headers.get("content-type") or "")
    except Exception:
        content_type = ""
    return status, bytes(data), content_type


def _raise_for_status(action, key, status, body):
    if 200 <= status < 300:
        return
    detail = body[:300].decode("utf-8", "replace") if body else ""
    raise StorageError(f"S3 {action} failed for {key!r}: {status} {detail}".strip())


def put_object(key, data, content_type=None):
    _split_key(key)
    if not s3_enabled():
        path = local_path(key)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as handle:
            handle.write(data)
        return

    cfg = _config()
    guessed = mimetypes.guess_type(key)[0] or "application/octet-stream"
    url, headers = sign_request(
        "PUT",
        cfg["bucket"],
        key,
        payload=data,
        content_type=content_type or guessed,
    )
    status, body, _ = _request("PUT", url, headers, data)
    _raise_for_status("PUT", key, status, body)


def delete_object(key):
    _split_key(key)
    try:
        os.remove(local_path(key))
    except OSError:
        pass

    if not s3_enabled():
        return

    cfg = _config()
    url, headers = sign_request("DELETE", cfg["bucket"], key)
    status, body, _ = _request("DELETE", url, headers)
    if status not in (200, 204, 404):
        _raise_for_status("DELETE", key, status, body)


def get_object(key):
    """Return ``(data, content_type)`` or ``(None, None)`` when missing."""
    _split_key(key)

    if s3_enabled():
        cfg = _config()
        url, headers = sign_request("GET", cfg["bucket"], key)
        status, body, content_type = _request("GET", url, headers)
        if 200 <= status < 300:
            return body, content_type or mimetypes.guess_type(key)[0]
        if status != 404:
            _raise_for_status("GET", key, status, body)

    path = local_path(key)
    if os.path.exists(path):
        with open(path, "rb") as handle:
            return handle.read(), mimetypes.guess_type(path)[0]
    return None, None


def save_upload(file_storage, key, content_type=None):
    data = file_storage.read()
    put_object(
        key,
        data,
        content_type
        or getattr(file_storage, "mimetype", None)
        or getattr(file_storage, "content_type", None),
    )
    return key
