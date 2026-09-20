from database import SessionLocal, engine, Base
from models import Hotel, HotelRoom, Restaurant, RestaurantMenu, Attraction, TravelAgency, Tour, Guide

Base.metadata.create_all(bind=engine)
db = SessionLocal()


def seed_database():
    print("Seeding database...")

    # --- HOTELS ---
    if db.query(Hotel).count() == 0:
        h1 = Hotel(
            name="Hyatt Regency Tashkent",
            description="Luxury 5-star hotel located in the heart of Tashkent with indoor pool, spa, and fine dining restaurants.",
            latitude=41.3152,
            longitude=69.2797,
            address="1 A. Navoi Street, Tashkent",
            rating=4.8,
            review_count=124,
            image_url="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
            type="5 Star Luxury",
            phone="+998 71 207 1234",
            opening_hours="Check-in 14:00, Check-out 12:00",
            is_partner=True,
            website="https://www.hyatt.com",
            instagram="@hyattregencytashkent",
            telegram="@hyatttashkent",
            offer="15% discount for 3+ night stays",
            status="approved"
        )
        h2 = Hotel(
            name="Hotel Uzbekistan",
            description="Iconic Soviet-era landmark architecture overlooking Amir Timur Square in central Tashkent.",
            latitude=41.3111,
            longitude=69.2795,
            address="45 Amir Timur Avenue, Tashkent",
            rating=4.3,
            review_count=89,
            image_url="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
            type="Historic Landmark",
            phone="+998 71 233 2773",
            opening_hours="24/7 Front Desk",
            is_partner=True,
            website="http://hoteluzbekistan.uz",
            instagram="@hoteluzbekistan",
            telegram="@hoteluz",
            offer="Complimentary breakfast included",
            status="approved"
        )
        h3 = Hotel(
            name="Samarkand Regency Gur-Emir",
            description="Boutique hotel with traditional Uzbek craftsmanship and stunning rooftop views of Gur-e-Amir Mausoleum.",
            latitude=39.6486,
            longitude=66.9603,
            address="12 Registan Street, Samarkand",
            rating=4.9,
            review_count=67,
            image_url="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80",
            type="Boutique",
            phone="+998 66 230 4050",
            opening_hours="Check-in 14:00",
            is_partner=True,
            website="https://samarkandregency.com",
            instagram="@samarkandregency",
            telegram="@samregency",
            offer="Free airport shuttle service",
            status="approved"
        )
        db.add_all([h1, h2, h3])
        db.commit()

        # Add rooms
        r1 = HotelRoom(hotel_id=h1.id, room_type="Deluxe King Room", price=180.0, capacity=2, description="Spacious king bed room with city views", available=True, status="approved")
        r2 = HotelRoom(hotel_id=h1.id, room_type="Executive Suite", price=350.0, capacity=3, description="Luxury suite with separate lounge area", available=True, status="approved")
        r3 = HotelRoom(hotel_id=h2.id, room_type="Standard Double", price=75.0, capacity=2, description="Classic double room with park view", available=True, status="approved")
        r4 = HotelRoom(hotel_id=h3.id, room_type="Heritage Suite", price=140.0, capacity=2, description="Traditional Uzbek decor suite", available=True, status="approved")
        db.add_all([r1, r2, r3, r4])
        db.commit()
        print("Hotels seeded!")

    # --- RESTAURANTS ---
    if db.query(Restaurant).count() < 2:
        r1 = Restaurant(
            name="Caravan Restaurant",
            description="Authentic Uzbek traditional dining experience with live national music and handmade ceramic interior.",
            latitude=41.2995,
            longitude=69.2642,
            address="22 Abdulla Kahhar Street, Tashkent",
            rating=4.7,
            review_count=142,
            image_url="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
            cuisine_type="Uzbek Traditional",
            phone="+998 71 256 7576",
            opening_hours="11:00 - 23:00",
            is_partner=True,
            website="https://caravan.uz",
            instagram="@caravan_restaurant",
            status="approved"
        )
        r2 = Restaurant(
            name="Afsona Restaurant",
            description="Modern Uzbek cuisine with elegant ambiance, famous for Samarkand plov and grilled lamb chops.",
            latitude=41.3123,
            longitude=69.2789,
            address="30 Taras Shevchenko Street, Tashkent",
            rating=4.6,
            review_count=98,
            image_url="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
            cuisine_type="Modern Uzbek",
            phone="+998 71 252 5681",
            opening_hours="12:00 - 23:00",
            is_partner=True,
            status="approved"
        )
        db.add_all([r1, r2])
        db.commit()

        m1 = RestaurantMenu(restaurant_id=r1.id, item_name="Tashkent Plov", price=8.5, category="Main", status="approved")
        m2 = RestaurantMenu(restaurant_id=r1.id, item_name="Manti (5 pcs)", price=6.0, category="Main", status="approved")
        m3 = RestaurantMenu(restaurant_id=r2.id, item_name="Lamb Shashlik", price=7.5, category="Grill", status="approved")
        db.add_all([m1, m2, m3])
        db.commit()
        print("Restaurants seeded!")

    # --- ATTRACTIONS ---
    if db.query(Attraction).count() == 0:
        a1 = Attraction(
            name="Registan Square",
            description="The heart of ancient Samarkand, framed by three magnificent Islamic madrasahs with turquoise tiles.",
            latitude=39.6547,
            longitude=66.9758,
            address="Registan Street, Samarkand",
            rating=4.9,
            review_count=320,
            image_url="https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&w=800&q=80",
            category="Historical Landmark",
            phone="+998 66 235 3845",
            opening_hours="08:00 - 20:00",
            entry_fee="50,000 UZS",
            year_built="1417 - 1660",
            historical_period="Timurid & Shaybanid",
            duration="2-3 hours",
            best_time="Sunset & Evening Illumination"
        )
        a2 = Attraction(
            name="Chorsu Bazaar",
            description="Vibrant traditional blue-domed market selling fresh spices, dried fruits, nuts, and hand-woven crafts.",
            latitude=41.3273,
            longitude=69.2361,
            address="Zarkiynar Street, Tashkent",
            rating=4.7,
            review_count=210,
            image_url="https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80",
            category="Bazaar & Culture",
            phone="+998 71 242 0000",
            opening_hours="06:00 - 19:00",
            entry_fee="Free",
            duration="1-2 hours",
            best_time="Morning"
        )
        db.add_all([a1, a2])
        db.commit()
        print("Attractions seeded!")

    # --- TRAVEL AGENCIES ---
    if db.query(TravelAgency).count() == 0:
        ta1 = TravelAgency(
            name="Silk Road Adventures",
            agency_type="Tour Operator",
            city="Tashkent",
            address="15 Buyuk Turon Street, Tashkent",
            phone="+998 71 200 8899",
            email="info@silkroadadventures.uz",
            website="https://silkroadadventures.uz",
            description="Specialized in Silk Road cultural tours, desert yurt camps, and multi-city train journeys across Uzbekistan.",
            specializations=["Cultural Tours", "Silk Road Rail", "Desert Expeditions"],
            languages="English, French, German, Russian",
            rating=4.9,
            tours_count=5,
            is_verified=True,
            is_partner=True,
            status="approved"
        )
        db.add_all([ta1])
        db.commit()

        t1 = Tour(
            agency_id=ta1.id,
            tour_name="7-Day Golden Triangle (Tashkent - Samarkand - Bukhara - Khiva)",
            tour_type="Cultural Heritage",
            description="Explore Uzbekistan's most famous Silk Road UNESCO World Heritage cities by high-speed Afrosiyob train.",
            duration_days=7,
            price=850.0,
            currency="USD",
            max_group_size=12,
            difficulty_level="Easy",
            best_season="Spring & Autumn",
            status="approved"
        )
        db.add_all([t1])
        db.commit()
        print("Travel Agencies seeded!")

    # --- GUIDES ---
    if db.query(Guide).count() == 0:
        g1 = Guide(
            name="Alisher Karimov",
            bio="Licensed historian guide with 8 years of experience leading tours across Samarkand, Bukhara, and Khiva.",
            photo_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
            languages="English, Russian, Uzbek",
            cities="Samarkand, Bukhara, Tashkent",
            tour_types="Historical, Architecture, Food & Culture",
            price_per_day=80.0,
            experience_years=8,
            phone="+998 90 987 6543",
            telegram="@alisher_guide",
            email="alisher@guides.uz",
            status="approved",
            rating=4.9,
            review_count=45,
            is_active=True
        )
        db.add_all([g1])
        db.commit()
        print("Guides seeded!")

    print("All seeding completed successfully!")


if __name__ == "__main__":
    seed_database()
