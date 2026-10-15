# Discover Uzbekistan — React + TypeScript

Port of the static-HTML frontend (`frontend/`) to Vite + React 19 + TypeScript + React Router.
The FastAPI backend (`startupbackend/`) is unchanged.

## Run

    npm install
    npm run dev          # proxies API calls to http://localhost:8000
    # VITE_API_PROXY=https://your-backend npm run dev   (use a different backend)
    # VITE_API_BASE=https://your-backend                 (for production builds on another origin)
    # VITE_YANDEX_API_KEY=...                            (optional, Yandex Maps)

## Status

| Page | Status |
|---|---|
| Home (`index.html`) | ported; header + hero use the new design (`src/components/UzTop.tsx`) |
| Attractions list | ported (filters, sort, Near Me, Yandex map) |
| Attraction detail, Hotels, Restaurants, Agencies, Guides, Route planner, Emergency, Partner portal | placeholder routes in `src/App.tsx` |
| Admin / partner dashboards (9 pages) | not started |

## Notes

- Legacy per-page CSS is scoped under `.pg-<page>` by `scripts/scope-css.mjs`, so page styles don't leak.
  Re-run it for each page you port, e.g.
  `node scripts/scope-css.mjs ../frontend/hotels-list.html pg-hotels-list src/styles/hotels-list.css`
- FastAPI serves `/attractions`, `/hotels`, ... which are also React routes. The Vite dev proxy
  handles this (HTML requests get index.html). In production, serve the built app with an SPA fallback,
  or move the API under `/api`.
