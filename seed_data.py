"""
seed_data.py — Seeds Karimbek restaurant + Malika Prime hotel directly into DB
Run: python3 seed_data.py
"""
import os, hashlib
from dotenv import load_dotenv
load_dotenv('/Users/mac/Desktop/startup/startupbackend/.env')

import sys
sys.path.insert(0, '/Users/mac/Desktop/startup/startupbackend')

from database import SessionLocal
from models.restaurant import Restaurant, RestaurantMenu
from models.hotel import Hotel, HotelRoom

def h(text):
    return hashlib.sha256(text.encode()).hexdigest()

PHOTOS = {
    "karimbek":  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800",
    "osh":       "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600",
    "shashlik":  "https://images.unsplash.com/photo-1544025162-d76694265947?w=600",
    "lagman":    "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600",
    "samsa":     "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600",
    "tea":       "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600",
    "pilaf":     "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600",
    "salad":     "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600",
    "malika":    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
    "room_twin": "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600",
    "room_dbl":  "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600",
    "suite":     "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600",
}

db = SessionLocal()

print("🌱 Starting seed...\n")

# ══════════════════════════════════════════════════════════
# 1. KARIMBEK RESTAURANT
# ══════════════════════════════════════════════════════════
print("🍽️  Creating Karimbek Restaurant...")

restaurant = Restaurant(
    name="Karimbek Restaurant",
    description="One of Samarkand's most iconic restaurants, part of the renowned Bek restaurant chain. Located in the Iranian Mahalla opposite Hotel Tumaris, Karimbek features several halls designed in traditional Uzbek national style. Famous for its wide range of shashliks, authentic pilaf, soups and homemade flatbread. In the evenings, enjoy colorful shows of Uzbek, Arab and European dances with live music. Perfect for families, groups and banquets.",
    latitude=39.6514,
    longitude=66.9583,
    address="Gagarin Street 194, Samarkand",
    cuisine_type="Uzbek, European",
    phone="+998662377739",
    opening_hours="08:00 – 23:00",
    website="https://bek-restaurants.com",
    instagram="@karimbek_restaurant",
    image_url=PHOTOS["karimbek"],
    is_partner=True,
    status="approved",
    partner_email="karimbek@bek-restaurants.com",
    partner_password=h("Karimbek2024"),
    rating=4.6,
    review_count=187,
)
db.add(restaurant)
db.flush()
print(f"   ✅ Restaurant created ID: {restaurant.id}")

menu_items = [
    ("Beef Shashlik",          4.0,  "solo",   PHOTOS["shashlik"], "Tender beef skewers grilled over charcoal"),
    ("Lamb Shashlik",          4.5,  "solo",   PHOTOS["shashlik"], "Juicy lamb skewers with herbs and spices"),
    ("Chicken Shashlik",       3.5,  "solo",   PHOTOS["shashlik"], "Marinated chicken grilled to perfection"),
    ("Uzbek Pilaf (Osh)",      4.0,  "solo",   PHOTOS["pilaf"],    "Traditional Samarkand pilaf with lamb and carrots"),
    ("Shurpa Soup",            3.0,  "solo",   PHOTOS["lagman"],   "Hearty lamb and vegetable soup"),
    ("Lagman",                 3.0,  "solo",   PHOTOS["lagman"],   "Hand-pulled noodles with meat and vegetables"),
    ("Samsa",                  1.5,  "solo",   PHOTOS["samsa"],    "Flaky pastry filled with lamb and onion"),
    ("Mixed Shashlik Platter", 9.0,  "fortwo", PHOTOS["shashlik"], "Assorted beef, lamb and chicken skewers for two"),
    ("Karimbek House Salad",   5.0,  "fortwo", PHOTOS["salad"],    "Fresh seasonal vegetables with herbs"),
    ("Stuffed Chicken Fillet", 8.0,  "fortwo", PHOTOS["shashlik"], "Tender chicken stuffed with mushrooms"),
    ("Kofta in Onion Sauce",   8.0,  "fortwo", PHOTOS["shashlik"], "Minced meat rolls in rich onion and tomato sauce"),
    ("Banquet Meat Platter",   25.0, "family", PHOTOS["shashlik"], "Large platter of mixed meats for 4-6 people"),
    ("Full Uzbek Feast Set",   30.0, "family", PHOTOS["pilaf"],    "Complete feast: pilaf, shashlik, soups and bread for 4"),
    ("Fruit Tea (unlimited)",  2.0,  "drinks", PHOTOS["tea"],      "Traditional Uzbek fruit tea with unlimited refills"),
    ("Fresh Juice",            2.5,  "drinks", PHOTOS["tea"],      "Freshly squeezed seasonal fruit juice"),
    ("Ayran",                  1.5,  "drinks", PHOTOS["tea"],      "Traditional chilled yogurt drink"),
    ("Local Wine (bottle)",    8.0,  "drinks", PHOTOS["tea"],      "Selected Uzbek wines"),
    ("Soft Drinks",            1.0,  "drinks", PHOTOS["tea"],      "Carbonated drinks"),
]

for name, price, cat, img, desc in menu_items:
    db.add(RestaurantMenu(
        restaurant_id=restaurant.id,
        item_name=name,
        price=price,
        category=cat,
        image_url=img,
        description=desc,
        status="approved",
    ))
print(f"   ✅ {len(menu_items)} menu items added")

# ══════════════════════════════════════════════════════════
# 2. MALIKA PRIME HOTEL
# ══════════════════════════════════════════════════════════
print("\n🏨  Creating Malika Prime Hotel...")

hotel = Hotel(
    name="Malika Prime Hotel",
    description="Malika Prime is a bright and elegant 4-star boutique hotel located in the heart of Samarkand, just 30 meters from the magnificent Gur-Emir Mausoleum and 15 minutes walk from Registan Square. The hotel combines European standards with traditional Central Asian architecture featuring carved wooden elements, ceramic details and multi-level lighting. 22 comfortable rooms across 3 floors with a stunning terrace offering panoramic views of historic Samarkand. Free WiFi, parking, breakfast, 24-hour service.",
    latitude=39.6494,
    longitude=66.9667,
    address="1/4 University Boulevard, Samarkand",
    type="Boutique",
    phone="+998662391333",
    opening_hours="Check-in 14:00 / Check-out 11:00",
    website="https://malikahotel.com",
    instagram="@malikahotel",
    image_url=PHOTOS["malika"],
    is_partner=True,
    status="approved",
    partner_email="malikaprime@malikahotel.com",
    partner_password=h("Malika2024"),
    rating=4.8,
    review_count=251,
    offer="Free breakfast included",
)
db.add(hotel)
db.flush()
print(f"   ✅ Hotel created ID: {hotel.id}")

rooms = [
    ("Twin Room",   55.0, 2, PHOTOS["room_twin"], "Comfortable twin room with two single beds, private bathroom, TV, minibar and WiFi. Beautiful wooden interior décor."),
    ("Double Room", 69.0, 2, PHOTOS["room_dbl"],  "Spacious double room with king-size bed, private bathroom with bath, hair dryer, TV, minibar, WiFi and air conditioning."),
    ("Deluxe Room", 89.0, 2, PHOTOS["suite"],     "Premium deluxe room with terrace access and panoramic view of Gur-Emir Mausoleum, king bed and full amenities."),
]

for rtype, price, cap, img, desc in rooms:
    db.add(HotelRoom(
        hotel_id=hotel.id,
        room_type=rtype,
        price=price,
        capacity=cap,
        image_url=img,
        description=desc,
        available=True,
        status="approved",
    ))
print(f"   ✅ {len(rooms)} rooms added")

db.commit()
db.close()

print("\n🎉 Seeding complete!")
print(f"   🍽️  Karimbek Restaurant ID: {restaurant.id}")
print(f"   🏨  Malika Prime Hotel ID:  {hotel.id}")
print(f"\n   Visit: https://discover-travel-uzbekistan.com/restaurants.html")
print(f"   Visit: https://discover-travel-uzbekistan.com/hotels.html")