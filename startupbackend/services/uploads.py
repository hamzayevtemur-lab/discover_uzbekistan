"""
services/uploads.py
====================
Single shared helper for saving uploaded images consistently across every
router (restaurants, hotels, agencies, guides, attractions, news, admin).

Before this existed, each router had its own copy-pasted version of this
logic with slightly different folder names (or none at all) — this is why
some uploads ended up in static/uploads/partners/, some in
static/uploads/attractions/, and some with no subfolder at all sitting
loose in static/uploads/. Using this helper everywhere means the folder
an image lands in is decided in exactly one place.
"""

import shutil
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/jpg", "image/webp", "image/gif"}
MAX_BYTES = 5 * 1024 * 1024  # 5 MB


def save_upload_file(file: UploadFile, folder: str) -> str:
    """
    Validate and save an uploaded image into static/uploads/<folder>/,
    returning the public URL to store in the DB (e.g. as image_url).

    `folder` should be a plural business-type name matching the seeding
    convention already in use: "restaurants", "hotels", "agencies",
    "guides", "attractions", "news", etc.
    """
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type. Only images allowed.")

    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    if size > MAX_BYTES:
        raise HTTPException(status_code=400, detail="File too large. Max size is 5MB.")

    upload_dir = Path("static/uploads") / folder
    upload_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid.uuid4()}{Path(file.filename).suffix}"
    with (upload_dir / filename).open("wb") as buf:
        shutil.copyfileobj(file.file, buf)

    return f"/static/uploads/{folder}/{filename}"