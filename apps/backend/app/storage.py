from __future__ import annotations

import os
from typing import Optional, BinaryIO
from datetime import timedelta
from uuid import uuid4

from minio import Minio
from urllib.parse import urlparse, urlunparse
from io import BytesIO
from PIL import Image

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "minio")
MINIO_PORT = int(os.getenv("MINIO_PORT", "9000"))
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minio")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minio123")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "uploads")
MINIO_SECURE = False
MINIO_PUBLIC_URL = os.getenv("MINIO_PUBLIC_URL", "http://localhost:9000")

_client: Optional[Minio] = None


def get_client() -> Minio:
    global _client
    if _client is None:
        _client = Minio(
            f"{MINIO_ENDPOINT}:{MINIO_PORT}",
            access_key=MINIO_ACCESS_KEY,
            secret_key=MINIO_SECRET_KEY,
            secure=MINIO_SECURE,
        )
    return _client


def ensure_bucket() -> None:
    c = get_client()
    if not c.bucket_exists(MINIO_BUCKET):
        c.make_bucket(MINIO_BUCKET)


def new_cover_key(game_id: int, filename: str) -> str:
    return f"covers/{game_id}/{uuid4().hex}_{filename}"


def new_thumb_key(game_id: int, filename: str) -> str:
    return f"covers/{game_id}/thumb_{uuid4().hex}_{filename}.jpg"


def put_object_from_fileobj(fileobj: BinaryIO, length: int, content_type: str, object_name: str) -> str:
    # minio-python は未知長ストリームに対応している（-1指定 + 10MBのパートサイズなど）が、
    # SDKが自動扱いするためlength=-1で渡す
    kwargs = {}
    # 未知長のストリームの場合は part_size を指定
    if length == -1:
        kwargs["part_size"] = 10 * 1024 * 1024  # 10MB
    get_client().put_object(
        bucket_name=MINIO_BUCKET,
        object_name=object_name,
        data=fileobj,
        length=length,
        content_type=content_type,
        **kwargs,
    )
    return object_name


def presigned_get_url(object_name: str, expires: int = 3600) -> str:
    url = get_client().presigned_get_object(MINIO_BUCKET, object_name, expires=timedelta(seconds=expires))
    # Docker内部のエンドポイント(minio:9000)を外部公開URLに書き換え
    try:
        pub = urlparse(MINIO_PUBLIC_URL)
        src = urlparse(url)
        if pub.netloc:
            url = urlunparse((pub.scheme or src.scheme, pub.netloc, src.path, src.params, src.query, src.fragment))
    except Exception:
        pass
    return url


def delete_object(object_name: str) -> None:
    try:
        get_client().remove_object(MINIO_BUCKET, object_name)
    except Exception:
        # 存在しない等は学習用途のため握りつぶす
        pass


def generate_thumbnail(image_bytes: bytes, max_size: int = 320) -> bytes:
    with Image.open(BytesIO(image_bytes)) as im:
        im = im.convert("RGB")
        im.thumbnail((max_size, max_size))
        out = BytesIO()
        im.save(out, format="JPEG", quality=85)
        return out.getvalue()
