from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles  
from routers import(restaurants, hotels, attractions, likes, admin,
            partner_restaurants, partner_auth, admin_approval, partner_hotels, 
            travel_agency,partner_agency, partner_application, admin,subscription)  # Import all routers

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
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


app.mount("/static", StaticFiles(directory="static"), name="static_assets")
app.mount("/", StaticFiles(directory="../frontend", html=True), name="frontend")



@app.get("/")
def read_root():
    return {"message": "Discover Uzbekistan API"}