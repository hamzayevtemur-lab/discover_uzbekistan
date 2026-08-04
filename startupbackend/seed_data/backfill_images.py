"""
backfill_images.py
===================
seed_content.py only ever CREATES new rows — if a restaurant/hotel
already exists in the DB (which it will, once you've seeded it once),
re-running seed_content.py just skips it, even if your local JSON file
has since gained a real image_url from a later download_images.py run.

This script fills that gap: it matches existing DB rows by exact name,
and updates ONLY the image_url field — nothing else — but only when:
  - the JSON file has a real image_url for that entry, AND
  - the DB row's image_url is currently empty/null

It will never overwrite an image_url that's already set (so if you've
manually uploaded a real photo for something through the admin panel,
this script won't touch it).

USAGE
-----
export ADMIN_SECRET_KEY="..."
export API_BASE="http://localhost:8000"

python3 backfill_images.py osm_samarkand_restaurants_filtered.json restaurant
python3 backfill_images.py osm_samarkand_hotels_filtered.json hotel

Safe to run as many times as you want, any time after a fresh
download_images.py run — it only ever fills in blanks.
"""

import json
import os
import sys

import requests

ADMIN_SECRET_KEY = os.environ.get("ADMIN_SECRET_KEY", "")
API_BASE = os.environ.get("API_BASE", "http://localhost:8000")

ENDPOINTS = {
    "restaurant": ("/admin/restaurants", "restaurants"),
    "hotel":      ("/admin/hotels",      "hotels"),
}


def main():
    if len(sys.argv) != 3:
        print("Usage: python3 backfill_images.py <dataset.json> <restaurant|hotel>")
        sys.exit(1)

    if not ADMIN_SECRET_KEY:
        print("ERROR: set ADMIN_SECRET_KEY first.")
        sys.exit(1)

    dataset_path = sys.argv[1]
    kind = sys.argv[2]
    if kind not in ENDPOINTS:
        print(f"Unknown type '{kind}'. Must be one of: {', '.join(ENDPOINTS)}")
        sys.exit(1)

    list_path, result_key = ENDPOINTS[kind]
    entries = json.loads(open(dataset_path, encoding="utf-8").read())
    headers = {"X-Admin-Key": ADMIN_SECRET_KEY, "Content-Type": "application/json"}

    resp = requests.get(f"{API_BASE}{list_path}", headers=headers, timeout=30)
    resp.raise_for_status()
    body = resp.json()
    existing = body.get(result_key, body) if isinstance(body, dict) else body
    by_name = {item["name"]: item for item in existing}

    updated, skipped_no_image, skipped_already_has_image, skipped_not_found = 0, 0, 0, 0

    for entry in entries:
        name = entry["name"]
        new_image = entry.get("image_url")

        if name not in by_name:
            skipped_not_found += 1
            continue

        db_row = by_name[name]

        if not new_image:
            skipped_no_image += 1
            continue

        if db_row.get("image_url"):
            skipped_already_has_image += 1
            continue

        try:
            r = requests.put(
                f"{API_BASE}{list_path}/{db_row['id']}",
                json={"image_url": new_image},
                headers=headers,
                timeout=15,
            )
            r.raise_for_status()
            print(f"updated: {name} -> {new_image}")
            updated += 1
        except requests.HTTPError as e:
            print(f"! FAILED: {name} -> {e}")

    print(f"\nDone. Updated {updated}, "
          f"skipped {skipped_no_image} (no local image yet), "
          f"skipped {skipped_already_has_image} (already had one), "
          f"skipped {skipped_not_found} (not in DB — seed it first).")


if __name__ == "__main__":
    main()