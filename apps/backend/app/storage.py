from __future__ import annotations

import os
from typing import Optional, BinaryIO
from uuid import uuid4

from minio import Minio

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "minio")
MINIO_PORT = int(os.getenv("MINIO_PORT", "9000"))
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minio")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minio123")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "uploads")
MINIO_SECURE = False

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


def put_object_from_fileobj(fileobj: BinaryIO, length: int, content_type: str, object_name: str) -> str:
    # minio-python は未知長ストリームに対応している（-1指定 + 10MBのパートサイズなど）が、
    # SDKが自動扱いするためlength=-1で渡す
    get_client().put_object(
        bucket_name=MINIO_BUCKET,
        object_name=object_name,
        data=fileobj,
        length=length,
        content_type=content_type,
    )
    return object_name


def presigned_get_url(object_name: str, expires: int = 3600) -> str:
    return get_client().presigned_get_object(MINIO_BUCKET, object_name, expires=expires)

