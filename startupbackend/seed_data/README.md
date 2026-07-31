# Bulk content seeding — Samarkand

Two-step pipeline, run **on your own machine** (not in a sandboxed tool),
since it needs real internet access to Unsplash and your live API.

## 1. Download real images locally

```bash
pip install requests
export UNSPLASH_ACCESS_KEY="your-key-from-unsplash.com/developers"

python download_images.py samarkand_attractions.json attractions
```

This searches Unsplash for each place, downloads one licensed photo per
place into `static/uploads/attractions/<slug>.jpg`, and writes that local
path back into `samarkand_attractions.json`'s `image_url` field.

Commit the downloaded images (`static/uploads/attractions/`) to your repo
so they deploy along with your code — that's the whole point of going
local instead of hotlinking.

## 2. Seed the database

```bash
export ADMIN_SECRET_KEY="same value as your backend's ADMIN_SECRET_KEY"
export API_BASE="https://your-deployed-app.example.com"   # or http://localhost:8000

python seed_content.py samarkand_attractions.json attraction
```

This POSTs each entry to your existing `/admin/attractions` endpoint,
skipping anything whose name is already in the database — safe to re-run
as you add more places to the JSON over time.

## Reusing this for restaurants, hotels, or other cities

- Copy `samarkand_attractions.json` as a template, matching the fields
  each model expects (see `models/restaurant.py` / `models/hotel.py` for
  the restaurant/hotel field names — they're a bit different from
  attractions, e.g. `cuisine_type` instead of `category`).
- Run the same two scripts against the new file with `restaurant` /
  `hotel` as the type argument.
- For a new city, just change the `address` / coordinates / `image_query`
  fields — nothing else in the scripts needs to change.

## Before you go live with this data

- **Coordinates** in `samarkand_attractions.json` are close approximations
  from general knowledge, not pinned from a mapping tool — spot-check
  them against Google Maps before relying on them for the map feature.
- **Entry fees** change (Registan went from 65,000 to 100,000 UZS in the
  last year) — worth a quick re-check before publishing, and periodically
  after.
- `/admin/attractions` currently has no auth check (unlike
  `/admin/restaurants` / `/admin/hotels`, which require `X-Admin-Key`) —
  worth fixing in `attractions_admin.py` before this becomes public data
  anyone can overwrite.