import mimetypes

from flask import Blueprint, Response, abort
from flask_login import login_required

import storage

media_bp = Blueprint("media", __name__)


@media_bp.route("/media/<path:key>")
@login_required
def serve(key):
    try:
        data, content_type = storage.get_object(key)
    except ValueError:
        abort(404)
    except storage.StorageError:
        abort(502)

    if data is None:
        abort(404)

    return Response(
        data,
        mimetype=content_type
        or mimetypes.guess_type(key)[0]
        or "application/octet-stream",
        headers={"Cache-Control": "private, max-age=3600"},
    )
