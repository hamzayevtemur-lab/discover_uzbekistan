"""
seed_content.py
================
Bulk-inserts a JSON dataset (like samarkand_attractions.json) into your
live backend by calling the admin endpoints that already exist in your
FastAPI app — no manual form-filling in admin.html needed.

Run download_images.py FIRST so each entry's "image_url" points at a
real local file instead of being blank.

SETUP
-----
1. pip install requests
2. export ADMIN_SECRET_KEY="your-admin-key"     # same value as your backend's env var
3. export API_BASE="https://your-app.up.railway.app"   # or http://localhost:8000 locally

USAGE
-----
python seed_content.py samarkand_attractions.json attraction
python seed_content.py samarkand_restaurants.json restaurant
python seed_content.py samarkand_hotels.json hotel

Safe to re-run: it fetches what's already in the DB first and skips any
entry whose "name" already exists there, so adding new places to the
JSON and re-running only inserts what's new.

NOTE ON AUTH: the /admin/attractions endpoints (attractions_admin.py)
currently have NO auth check at all, unlike /admin/restaurants and
/admin/hotels which require X-Admin-Key. This script sends the key
either way — worth adding the same auth check to attractions_admin.py
separately so that gap doesn't linger once real content is live.
"""

import json
import os
import sys

import requests

ADMIN_SECRET_KEY = os.environ.get("ADMIN_SECRET_KEY", "")
API_BASE = os.environ.get("API_BASE", "http://localhost:8000")

# business_type -> (list endpoint, create endpoint, key used for dedup)
ENDPOINTS = {
    "attraction": ("/admin/attractions", "/admin/attractions", "attractions"),
    "restaurant": ("/admin/restaurants", "/admin/restaurants", "restaurants"),
    "hotel":      ("/admin/hotels",      "/admin/hotels",      "hotels"),
}


def main():
    if len(sys.argv) != 3:
        print("Usage: python seed_content.py <dataset.json> <attraction|restaurant|hotel>")
        sys.exit(1)

    if not ADMIN_SECRET_KEY:
        print("ERROR: set ADMIN_SECRET_KEY first.")
        sys.exit(1)

    dataset_path = sys.argv[1]
    kind = sys.argv[2]
    if kind not in ENDPOINTS:
        print(f"Unknown type '{kind}'. Must be one of: {', '.join(ENDPOINTS)}")
        sys.exit(1)

    list_path, create_path, result_key = ENDPOINTS[kind]
    entries = json.loads(open(dataset_path, encoding="utf-8").read())
    headers = {"X-Admin-Key": ADMIN_SECRET_KEY, "Content-Type": "application/json"}

    # Fetch existing names so re-running doesn't create duplicates.
    existing_names = set()
    try:
        resp = requests.get(f"{API_BASE}{list_path}", headers=headers, timeout=15)
        resp.raise_for_status()
        body = resp.json()
        items = body.get(result_key, body) if isinstance(body, dict) else body
        existing_names = {item["name"] for item in items}
    except requests.RequestException as e:
        print(f"Warning: couldn't fetch existing {kind}s to dedupe ({e}) — continuing anyway.")

    created, skipped, failed = 0, 0, 0

    for entry in entries:
        # Fields our model helpers don't want to send (dataset-only metadata)
        payload = {k: v for k, v in entry.items() if k != "image_query"}

        if payload["name"] in existing_names:
            print(f"skip (already exists): {payload['name']}")
            skipped += 1
            continue

        if not payload.get("image_url"):
            print(f"! WARNING: {payload['name']} has no image_url — did you run download_images.py first?")

        try:
            resp = requests.post(f"{API_BASE}{create_path}", json=payload, headers=headers, timeout=15)
            resp.raise_for_status()
            print(f"created: {payload['name']}")
            created += 1
        except requests.HTTPError as e:
            print(f"! FAILED: {payload['name']} -> {e}  ({resp.text[:200]})")
            failed += 1

    print(f"\nDone. Created {created}, skipped {skipped} (already existed), failed {failed}.")


if __name__ == "__main__":
    main()