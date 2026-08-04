"""
fetch_osm_data.py
==================
Pulls real restaurants and hotels/guesthouses in Samarkand from
OpenStreetMap via the Overpass API, and writes them straight out in the
same JSON shape samarkand_restaurants.json / samarkand_hotels.json
already use — so the output of this script feeds directly into
download_images.py and seed_content.py with no manual reformatting.

Unlike Google Places, OSM's data license (ODbL) explicitly PERMITS
storing and redistributing this data in your own database, as long as
you credit OpenStreetMap — see the credit note this script prints at
the end, which you should display somewhere on your site (a line in
the footer is enough, e.g. "Location data © OpenStreetMap contributors").

USAGE
-----
pip install requests
python3 fetch_osm_data.py

Produces:
    osm_samarkand_restaurants.json
    osm_samarkand_hotels.json

WHAT TO DO WITH THE OUTPUT
---------------------------
1. Read through it — OSM is community-maintained, so quality varies.
   Some entries may have a name but nothing else (no phone/hours) —
   that's fine, missing fields just stay blank; you or a real partner
   can fill them in later.
2. Cross-check a few against Google Maps or in person if you can,
   especially anything that looks off.
3. Merge/dedupe against what you've already manually seeded (e.g. if
   "Platan" or "Hotel Minor" show up again here, remove the duplicate
   before running seed_content.py — it dedupes by exact name match,
   so slightly different spellings won't be caught automatically).
4. Run the normal pipeline:
     python3 download_images.py osm_samarkand_restaurants.json restaurants
     python3 seed_content.py osm_samarkand_restaurants.json restaurant
   (same for hotels)
"""

import json
import time

import requests

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Samarkand bounding box (south, west, north, east) — covers the city
# and immediate surroundings. Widen slightly if you want to include
# nearby villages/resorts.
BBOX = "39.60,66.88,39.72,67.05"

RESTAURANT_QUERY = f"""
[out:json][timeout:60];
(
  node["amenity"="restaurant"]({BBOX});
  node["amenity"="cafe"]({BBOX});
);
out body;
"""

HOTEL_QUERY = f"""
[out:json][timeout:60];
(
  node["tourism"="hotel"]({BBOX});
  node["tourism"="guest_house"]({BBOX});
);
out body;
"""


def query_overpass(ql: str) -> list[dict]:
    headers = {"User-Agent": "DiscoverUzbekistan/1.0 (contact: hamzaevtemurbek@gmail.com)"}
    resp = requests.post(OVERPASS_URL, data={"data": ql}, headers=headers, timeout=90)
    resp.raise_for_status()
    return resp.json().get("elements", [])


def build_address(tags: dict) -> str:
    parts = [
        tags.get("addr:street"),
        tags.get("addr:housenumber"),
    ]
    parts = [p for p in parts if p]
    street = " ".join(parts)
    return street if street else "Samarkand, Uzbekistan"


def restaurant_entry(el: dict) -> dict | None:
    tags = el.get("tags", {})
    name = tags.get("name") or tags.get("name:en")
    if not name:
        return None
    return {
        "name": name,
        "description": f"{name} — a local establishment in Samarkand, Uzbekistan.",
        "latitude": el.get("lat"),
        "longitude": el.get("lon"),
        "address": build_address(tags),
        "cuisine_type": (tags.get("cuisine") or "").replace("_", " ").title() or None,
        "phone": tags.get("phone") or tags.get("contact:phone") or "",
        "opening_hours": tags.get("opening_hours") or "",
        "website": tags.get("website") or tags.get("contact:website") or "",
        "image_query": f"{name} Samarkand restaurant",
        "_osm_id": el.get("id"),  # kept for your own reference; seed_content.py ignores unknown keys? no — strip before seeding
    }


def hotel_entry(el: dict) -> dict | None:
    tags = el.get("tags", {})
    name = tags.get("name") or tags.get("name:en")
    if not name:
        return None
    tourism_type = tags.get("tourism", "hotel")
    return {
        "name": name,
        "description": f"{name} — a {tourism_type.replace('_', ' ')} in Samarkand, Uzbekistan.",
        "latitude": el.get("lat"),
        "longitude": el.get("lon"),
        "address": build_address(tags),
        "review_count": 0,
        "type": "Guesthouse" if tourism_type == "guest_house" else "Hotel",
        "phone": tags.get("phone") or tags.get("contact:phone") or "",
        "opening_hours": tags.get("opening_hours") or "",
        "website": tags.get("website") or tags.get("contact:website") or "",
        "offer": "",
        "image_query": f"{name} Samarkand hotel",
        "_osm_id": el.get("id"),
    }


def main():
    print("Querying OpenStreetMap for Samarkand restaurants/cafes...")
    rest_elements = query_overpass(RESTAURANT_QUERY)
    restaurants = [e for e in (restaurant_entry(el) for el in rest_elements) if e]
    print(f"  -> {len(restaurants)} named restaurants/cafes found")

    time.sleep(2)  # be polite to the shared public Overpass instance

    print("Querying OpenStreetMap for Samarkand hotels/guesthouses...")
    hotel_elements = query_overpass(HOTEL_QUERY)
    hotels = [e for e in (hotel_entry(el) for el in hotel_elements) if e]
    print(f"  -> {len(hotels)} named hotels/guesthouses found")

    # Strip the _osm_id reference field before writing — seed_content.py
    # sends every key it doesn't recognize straight to the DB layer,
    # and create_restaurant()/create_hotel() would just silently ignore
    # it (they only read specific named fields) — but cleaner to leave
    # it out of the file that actually gets seeded.
    for entry in restaurants:
        entry.pop("_osm_id", None)
    for entry in hotels:
        entry.pop("_osm_id", None)

    with open("osm_samarkand_restaurants.json", "w", encoding="utf-8") as f:
        json.dump(restaurants, f, indent=2, ensure_ascii=False)
    with open("osm_samarkand_hotels.json", "w", encoding="utf-8") as f:
        json.dump(hotels, f, indent=2, ensure_ascii=False)

    print("\nWrote osm_samarkand_restaurants.json and osm_samarkand_hotels.json")
    print("\nIMPORTANT — OpenStreetMap attribution required by their license:")
    print('Add this credit somewhere visible on your site (footer is fine):')
    print('  "Location data © OpenStreetMap contributors"')
    print('  linking to https://www.openstreetmap.org/copyright')


if __name__ == "__main__":
    main()
    