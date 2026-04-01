from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models.travel_agency import TravelAgency, Tour, AgencyReview, TourItinerary, TourDestination
from schemas.travel_agency import (
    TravelAgencyCreate, TravelAgencyOut,
    TourOut,
    AgencyReviewCreate, AgencyReviewOut,
    TourDetailedOut, TourItineraryOut, TourDestinationOut,
)
from sqlalchemy.orm import joinedload

router = APIRouter(prefix="/travel-agencies", tags=["Travel Agencies"])


# ═══════════════════════════════════════════════════════
# AGENCIES
# ═══════════════════════════════════════════════════════

@router.get("/", response_model=List[TravelAgencyOut])
def get_all_agencies(city: Optional[str]=None, specialization: Optional[str]=None,
                     is_verified: Optional[bool]=None, db: Session=Depends(get_db)):
    query = db.query(TravelAgency)
    if city:
        query = query.filter(TravelAgency.city.ilike(f"%{city}%"))
    if specialization:
        query = query.filter(TravelAgency.specializations.contains(f'"{specialization}"'))
    if is_verified is not None:
        query = query.filter(TravelAgency.is_verified == is_verified)
    return query.order_by(TravelAgency.rating.desc()).all()


@router.get("/tours/all", response_model=List[TourOut])
def get_all_tours(tour_type: Optional[str]=None, max_price: Optional[float]=None,
                  db: Session=Depends(get_db)):
    query = db.query(Tour).filter(Tour.is_active == True)
    if tour_type:
        query = query.filter(Tour.tour_type == tour_type)
    if max_price:
        query = query.filter(Tour.price <= max_price)
    return query.order_by(Tour.price).all()


@router.get("/{agency_id}", response_model=TravelAgencyOut)
def get_agency(agency_id: int, db: Session=Depends(get_db)):
    agency = db.query(TravelAgency).filter(TravelAgency.id == agency_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Travel agency not found")
    return agency


@router.post("/", response_model=TravelAgencyOut, status_code=201)
def create_agency(agency: TravelAgencyCreate, db: Session=Depends(get_db)):
    new_agency = TravelAgency(**agency.dict())
    db.add(new_agency)
    db.commit()
    db.refresh(new_agency)
    return new_agency


@router.put("/{agency_id}", response_model=TravelAgencyOut)
def update_agency(agency_id: int, data: dict, db: Session=Depends(get_db)):
    agency = db.query(TravelAgency).filter(TravelAgency.id == agency_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Travel agency not found")
    for key in ["name","agency_type","image_url","logo_url","city","address","phone",
                "email","website","description","specializations","languages",
                "is_verified","is_partner","is_featured","latitude","longitude"]:
        if key in data:
            setattr(agency, key, data[key])
    db.commit()
    db.refresh(agency)
    return agency


@router.delete("/{agency_id}")
def delete_agency(agency_id: int, db: Session=Depends(get_db)):
    agency = db.query(TravelAgency).filter(TravelAgency.id == agency_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Travel agency not found")
    db.delete(agency)  # cascade handles tours/itinerary/destinations/reviews
    db.commit()
    return {"message": "Agency deleted successfully"}


# ═══════════════════════════════════════════════════════
# TOURS
# ═══════════════════════════════════════════════════════

@router.get("/{agency_id}/tours", response_model=List[TourOut])
def get_agency_tours(agency_id: int, db: Session=Depends(get_db)):
    return db.query(Tour).filter(Tour.agency_id==agency_id, Tour.is_active==True).all()


@router.post("/tours", response_model=TourOut, status_code=201)
def create_tour(tour: dict, db: Session=Depends(get_db)):
    """
    Create tour + itinerary days + destinations in ONE request.
    image_url is now stored directly on each itinerary/destination row —
    no separate itinerary_images table needed.
    New tours get status='pending' for CEO approval.
    """
    agency_id = tour.get("agency_id")
    if not agency_id:
        raise HTTPException(status_code=400, detail="agency_id is required")
    agency = db.query(TravelAgency).filter(TravelAgency.id == agency_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")

    itinerary_days_data = tour.pop("itinerary_days", []) or []
    destinations_data   = tour.pop("destinations", []) or []

    tour_fields = {
        "agency_id","tour_name","tour_type","description","duration_days","price",
        "currency","max_group_size","image_url","is_active",
        "highlights","included_services","excluded_services","difficulty_level","best_season",
    }
    clean = {k: v for k, v in tour.items() if k in tour_fields}
    for f in ("highlights","included_services","excluded_services"):
        if clean.get(f) is None:
            clean[f] = []

    new_tour = Tour(**clean, status="pending")
    db.add(new_tour)
    db.flush()

    # Save destinations — image_url stored directly on the row
    for i, dest in enumerate(destinations_data):
        if not dest.get("destination_name"):
            continue
        db.add(TourDestination(
            tour_id=new_tour.id,
            destination_name=dest.get("destination_name"),
            latitude=dest.get("latitude"),
            longitude=dest.get("longitude"),
            visit_order=dest.get("visit_order", i + 1),
            nights_stay=dest.get("nights_stay", 0),
            description=dest.get("description"),
            image_url=dest.get("image_url"),
        ))

    # Save itinerary days — image_url stored directly on the row
    # Also accepts old images[] array format (takes first image) for compatibility
    for day_data in itinerary_days_data:
        if not day_data.get("day_title") or not day_data.get("activities"):
            continue
        imgs = day_data.get("images", []) or []
        # images is a plain list of URL strings from the dashboard
        image_url = day_data.get("image_url") or (imgs[0] if imgs else None)
        db.add(TourItinerary(
            tour_id=new_tour.id,
            day_number=day_data.get("day_number", 1),
            day_title=day_data.get("day_title"),
            activities=day_data.get("activities"),
            meals=day_data.get("meals"),
            accommodation=day_data.get("accommodation"),
            destinations=day_data.get("destinations", []),
            coordinates=day_data.get("coordinates", []),
            image_url=image_url,
            images=imgs,
        ))

    agency.tours_count = db.query(Tour).filter(Tour.agency_id == agency_id).count() + 1
    db.commit()
    db.refresh(new_tour)
    return new_tour


@router.put("/tours/{tour_id}", response_model=TourOut)
def update_tour(tour_id: int, data: dict, db: Session=Depends(get_db)):
    """Update tour scalars + replace destinations and itinerary if provided."""
    tour = db.query(Tour).filter(Tour.id == tour_id).first()
    if not tour:
        raise HTTPException(status_code=404, detail="Tour not found")

    itinerary_days_data = data.pop("itinerary_days", None)
    destinations_data   = data.pop("destinations", None)

    for key in ["tour_name","tour_type","description","duration_days","price","currency",
                "max_group_size","image_url","is_active","highlights","included_services",
                "excluded_services","difficulty_level","best_season"]:
        if key in data:
            val = data[key]
            if key in ("highlights","included_services","excluded_services") and val is None:
                val = []
            setattr(tour, key, val)

    if destinations_data is not None:
        db.query(TourDestination).filter(TourDestination.tour_id == tour_id).delete()
        for i, dest in enumerate(destinations_data):
            if not dest.get("destination_name"):
                continue
            db.add(TourDestination(
                tour_id=tour_id,
                destination_name=dest.get("destination_name"),
                latitude=dest.get("latitude"),
                longitude=dest.get("longitude"),
                visit_order=dest.get("visit_order", i+1),
                nights_stay=dest.get("nights_stay", 0),
                description=dest.get("description"),
                image_url=dest.get("image_url"),
            ))

    if itinerary_days_data is not None:
        db.query(TourItinerary).filter(TourItinerary.tour_id == tour_id).delete()
        for day_data in itinerary_days_data:
            if not day_data.get("day_title") or not day_data.get("activities"):
                continue
            imgs = day_data.get("images", []) or []
            image_url = day_data.get("image_url") or (imgs[0] if imgs else None)
            db.add(TourItinerary(
                tour_id=tour_id,
                day_number=day_data.get("day_number", 1),
                day_title=day_data.get("day_title"),
                activities=day_data.get("activities"),
                meals=day_data.get("meals"),
                accommodation=day_data.get("accommodation"),
                destinations=day_data.get("destinations", []),
                coordinates=day_data.get("coordinates", []),
                image_url=image_url,
                images=imgs,
            ))

    # Partner edit → reset to pending so CEO must re-approve
    tour.status = "pending"
    tour.rejection_reason = None

    db.commit()
    db.refresh(tour)
    return tour


@router.delete("/tours/{tour_id}")
def delete_tour(tour_id: int, db: Session=Depends(get_db)):
    tour = db.query(Tour).filter(Tour.id == tour_id).first()
    if not tour:
        raise HTTPException(status_code=404, detail="Tour not found")
    agency_id = tour.agency_id
    db.delete(tour)
    agency = db.query(TravelAgency).filter(TravelAgency.id == agency_id).first()
    if agency:
        agency.tours_count = max(0, (agency.tours_count or 1) - 1)
    db.commit()
    return {"message": "Tour deleted successfully"}


# ═══════════════════════════════════════════════════════
# TOUR DETAIL
# ═══════════════════════════════════════════════════════

@router.get("/tours/{tour_id}", response_model=TourDetailedOut)
def get_tour_details(tour_id: int, db: Session=Depends(get_db)):
    tour = db.query(Tour).options(
        joinedload(Tour.itinerary_days),
        joinedload(Tour.destinations)
    ).filter(Tour.id==tour_id, Tour.is_active==True).first()
    if not tour:
        raise HTTPException(status_code=404, detail="Tour not found")
    return tour


@router.get("/tours/{tour_id}/itinerary", response_model=List[TourItineraryOut])
def get_tour_itinerary(tour_id: int, db: Session=Depends(get_db)):
    return db.query(TourItinerary).filter(
        TourItinerary.tour_id==tour_id
    ).order_by(TourItinerary.day_number).all()


@router.get("/tours/{tour_id}/destinations", response_model=List[TourDestinationOut])
def get_tour_destinations(tour_id: int, db: Session=Depends(get_db)):
    return db.query(TourDestination).filter(
        TourDestination.tour_id==tour_id
    ).order_by(TourDestination.visit_order).all()


# ═══════════════════════════════════════════════════════
# ITINERARY DAY CRUD (individual)
# ═══════════════════════════════════════════════════════

@router.post("/tours/{tour_id}/itinerary", response_model=TourItineraryOut, status_code=201)
def add_itinerary_day(tour_id: int, data: dict, db: Session=Depends(get_db)):
    if not db.query(Tour).filter(Tour.id==tour_id).first():
        raise HTTPException(status_code=404, detail="Tour not found")
    day = TourItinerary(tour_id=tour_id, day_number=data.get("day_number"),
                        day_title=data.get("day_title"), activities=data.get("activities"),
                        meals=data.get("meals"), accommodation=data.get("accommodation"),
                        destinations=data.get("destinations",[]), coordinates=data.get("coordinates",[]),
                        image_url=data.get("image_url"))
    db.add(day); db.commit(); db.refresh(day)
    return day


@router.put("/tours/{tour_id}/itinerary/{day_id}", response_model=TourItineraryOut)
def update_itinerary_day(tour_id: int, day_id: int, data: dict, db: Session=Depends(get_db)):
    day = db.query(TourItinerary).filter(TourItinerary.id==day_id, TourItinerary.tour_id==tour_id).first()
    if not day:
        raise HTTPException(status_code=404, detail="Itinerary day not found")
    for key in ["day_number","day_title","activities","meals","accommodation",
                "destinations","coordinates","image_url"]:
        if key in data:
            setattr(day, key, data[key])
    db.commit(); db.refresh(day)
    return day


@router.delete("/tours/{tour_id}/itinerary/{day_id}")
def delete_itinerary_day(tour_id: int, day_id: int, db: Session=Depends(get_db)):
    day = db.query(TourItinerary).filter(TourItinerary.id==day_id, TourItinerary.tour_id==tour_id).first()
    if not day:
        raise HTTPException(status_code=404, detail="Itinerary day not found")
    db.delete(day); db.commit()
    return {"message": "Itinerary day deleted"}


# ═══════════════════════════════════════════════════════
# DESTINATION CRUD (individual)
# ═══════════════════════════════════════════════════════

@router.post("/tours/{tour_id}/destinations", response_model=TourDestinationOut, status_code=201)
def add_destination(tour_id: int, data: dict, db: Session=Depends(get_db)):
    if not db.query(Tour).filter(Tour.id==tour_id).first():
        raise HTTPException(status_code=404, detail="Tour not found")
    dest = TourDestination(tour_id=tour_id, destination_name=data.get("destination_name"),
                           latitude=data.get("latitude"), longitude=data.get("longitude"),
                           visit_order=data.get("visit_order",0), nights_stay=data.get("nights_stay",0),
                           description=data.get("description"), image_url=data.get("image_url"))
    db.add(dest); db.commit(); db.refresh(dest)
    return dest


@router.put("/tours/{tour_id}/destinations/{dest_id}", response_model=TourDestinationOut)
def update_destination(tour_id: int, dest_id: int, data: dict, db: Session=Depends(get_db)):
    dest = db.query(TourDestination).filter(TourDestination.id==dest_id, TourDestination.tour_id==tour_id).first()
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found")
    for key in ["destination_name","latitude","longitude","visit_order","nights_stay","description","image_url"]:
        if key in data:
            setattr(dest, key, data[key])
    db.commit(); db.refresh(dest)
    return dest


@router.delete("/tours/{tour_id}/destinations/{dest_id}")
def delete_destination(tour_id: int, dest_id: int, db: Session=Depends(get_db)):
    dest = db.query(TourDestination).filter(TourDestination.id==dest_id, TourDestination.tour_id==tour_id).first()
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found")
    db.delete(dest); db.commit()
    return {"message": "Destination deleted"}


# ═══════════════════════════════════════════════════════
# REVIEWS
# ═══════════════════════════════════════════════════════

@router.get("/{agency_id}/reviews", response_model=List[AgencyReviewOut])
def get_agency_reviews(agency_id: int, db: Session=Depends(get_db)):
    return db.query(AgencyReview).filter(
        AgencyReview.agency_id==agency_id
    ).order_by(AgencyReview.created_at.desc()).all()


@router.post("/reviews", response_model=AgencyReviewOut, status_code=201)
def create_review(review: AgencyReviewCreate, db: Session=Depends(get_db)):
    if not db.query(TravelAgency).filter(TravelAgency.id==review.agency_id).first():
        raise HTTPException(status_code=404, detail="Agency not found")
    new_review = AgencyReview(**review.dict())
    db.add(new_review)
    all_reviews = db.query(AgencyReview).filter(AgencyReview.agency_id==review.agency_id).all()
    agency = db.query(TravelAgency).filter(TravelAgency.id==review.agency_id).first()
    agency.rating = round(sum(r.rating for r in all_reviews)/len(all_reviews), 2) if all_reviews else 0
    db.commit(); db.refresh(new_review)
    return new_review


@router.delete("/reviews/{review_id}")
def delete_review(review_id: int, db: Session=Depends(get_db)):
    review = db.query(AgencyReview).filter(AgencyReview.id==review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    agency_id = review.agency_id
    db.delete(review); db.commit()
    all_reviews = db.query(AgencyReview).filter(AgencyReview.agency_id==agency_id).all()
    agency = db.query(TravelAgency).filter(TravelAgency.id==agency_id).first()
    if agency:
        agency.rating = round(sum(r.rating for r in all_reviews)/len(all_reviews),2) if all_reviews else 0.0
        db.commit()
    return {"message": "Review deleted"}