import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routers import (
    restaurants, hotels, attractions, likes, admin,
    partner_restaurants, partner_auth, admin_approval, partner_hotels,
    travel_agency, partner_agency, partner_application, subscription ,news, attractions_admin
)

app = FastAPI(title="Discover Uzbekistan API")

# ── CORS ──────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── ROUTERS ───────────────────────────────────────────────────
app.include_router(restaurants.router)
app.include_router(hotels.router)
app.include_router(attractions.router)
app.include_router(likes.router)
app.include_router(admin.router)
app.include_router(partner_restaurants.router)
app.include_router(partner_auth.router)
app.include_router(admin_approval.router)
app.include_router(partner_hotels.router)
app.include_router(travel_agency.router)
app.include_router(partner_agency.router)
app.include_router(partner_application.router)
app.include_router(subscription.router)
app.include_router(news.router)
app.include_router(attractions_admin.router)
# ── STATIC FILES ──────────────────────────────────────────────
# Absolute paths so it works both locally and on Railway
BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "..", "frontend")
STATIC_DIR   = os.path.join(BASE_DIR, "static")

app.mount("/static", StaticFiles(directory=STATIC_DIR),   name="static_assets")
app.mount("/",       StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")