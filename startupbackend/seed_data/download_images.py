"""
download_images.py
===================
Downloads one real, licensed photo per place from the Unsplash API and
saves it locally, then writes the resulting local path back into the
dataset's "image_url" field so seed_content.py can use it.

Reusable across cities/business types — just point it at any JSON file
shaped like samarkand_attractions.json (each entry needs "name" and
"image_query"; "image_url" gets filled in for you).

SETUP
-----
1. Get a free Access Key: https://unsplash.com/developers -> "New Application"
   (the free "Demo" tier gives 50 requests/hour, which is plenty for this).
2. pip install requests
3. export UNSPLASH_ACCESS_KEY="your-access-key-here"

USAGE
-----
python download_images.py samarkand_attractions.json attractions
python download_images.py samarkand_restaurants.json restaurants
python download_images.py samarkand_hotels.json hotels

The second argument is just a folder name — images land in:
    static/uploads/<folder>/<slug>.jpg

Re-running is safe: entries that already have a local /static/uploads/...
image_url are skipped, so you can add new places to the JSON and re-run
without re-downloading everything.
"""

import json
import os
import re
import sys
import time
from pathlib import Path

import requests

UNSPLASH_ACCESS_KEY = os.environ.get("UNSPLASH_ACCESS_KEY", "")
UNSPLASH_SEARCH_URL = "https://api.unsplash.com/search/photos"

# Where downloaded images should live relative to your project root.
# main.py mounts /static from this same "static" folder, so whatever
# path we write here is what the frontend will actually load.
STATIC_ROOT = Path("static/uploads")


def slugify(name: str) -> str:
    s = name.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def find_photo(query: str) -> dict | None:
    """Search Unsplash and return the top result's metadata, or None."""
    resp = requests.get(
        UNSPLASH_SEARCH_URL,
        params={"query": query, "per_page": 1, "orientation": "landscape"},
        headers={"Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}"},
        timeout=15,
    )
    resp.raise_for_status()
    results = resp.json().get("results", [])
    return results[0] if results else None


def download(url: str, dest: Path) -> None:
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(resp.content)


def main():
    if len(sys.argv) != 3:
        print("Usage: python download_images.py <dataset.json> <folder_name>")
        sys.exit(1)

    if not UNSPLASH_ACCESS_KEY:
        print("ERROR: set UNSPLASH_ACCESS_KEY first (see the docstring at the top of this file).")
        sys.exit(1)

    dataset_path = Path(sys.argv[1])
    folder = sys.argv[2]
    entries = json.loads(dataset_path.read_text())

    attributions = []

    for entry in entries:
        # Skip anything already pointing at a local file — makes reruns cheap.
        if entry.get("image_url", "").startswith("/static/"):
            print(f"skip (already downloaded): {entry['name']}")
            continue

        query = entry.get("image_query") or entry["name"]
        print(f"searching: {entry['name']}  (query: {query!r})")

        try:
            photo = find_photo(query)
        except requests.HTTPError as e:
            print(f"  ! Unsplash search failed: {e}")
            continue

        if not photo:
            print(f"  ! no results for {query!r} — leaving image_url blank, fix manually")
            continue

        image_url = photo["urls"]["regular"]
        photographer = photo["user"]["name"]
        photographer_url = photo["user"]["links"]["html"]

        slug = slugify(entry["name"])
        dest = STATIC_ROOT / folder / f"{slug}.jpg"

        try:
            download(image_url, dest)
        except requests.HTTPError as e:
            print(f"  ! download failed: {e}")
            continue

        entry["image_url"] = f"/static/uploads/{folder}/{slug}.jpg"
        attributions.append(f"{entry['name']}: photo by {photographer} ({photographer_url}) on Unsplash")
        print(f"  -> saved {dest}")

        # Unsplash's API guidelines ask you to ping this when a photo is
        # actually used (not just previewed) — keeps you within their terms.
        try:
            requests.get(
                photo["links"]["download_location"],
                headers={"Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}"},
                timeout=10,
            )
        except requests.RequestException:
            pass  # non-critical — don't fail the run over this

        time.sleep(1)  # be polite to the free-tier rate limit

    dataset_path.write_text(json.dumps(entries, indent=2, ensure_ascii=False))
    print(f"\nUpdated {dataset_path} with local image paths.")

    if attributions:
        credits_path = dataset_path.with_name(dataset_path.stem + "_photo_credits.txt")
        credits_path.write_text("\n".join(attributions))
        print(f"Wrote photographer credits to {credits_path} (not required to display, but good practice to keep on file).")


if __name__ == "__main__":
    main()