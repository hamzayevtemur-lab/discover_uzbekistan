export type Lang = 'en' | 'uz' | 'ru'

export interface Attraction {
  id: number
  name: string
  description?: string | null
  latitude: number
  longitude: number
  address?: string | null
  rating: number
  review_count: number
  image_url?: string | null
  category?: string | null
  phone?: string | null
  opening_hours?: string | null
  entry_fee?: string | null
  website?: string | null
  is_partner: boolean
  year_built?: string | null
  historical_period?: string | null
  /** returned by the API but not in the pydantic schema */
  price?: number | string | null
  duration?: string | null
}

export interface Hotel {
  id: number
  name: string
  description?: string | null
  latitude: number
  longitude: number
  address?: string | null
  rating: number
  review_count: number
  image_url?: string | null
  type?: string | null
  phone?: string | null
  opening_hours?: string | null
  is_partner: boolean
  website?: string | null
  offer?: string | null
}

export interface HotelRoom {
  id: number
  hotel_id: number
  room_type: string
  price: number
  capacity?: number | null
  image_url?: string | null
  description?: string | null
  available: boolean
}

export type NewsCategory = 'news' | 'event' | 'holiday' | 'announcement'

export interface NewsItem {
  id: number
  title: string
  description?: string | null
  category?: NewsCategory | string | null
  image_url?: string | null
  start_date?: string | null
  end_date?: string | null
  instagram?: string | null
  telegram?: string | null
  phone?: string | null
  location_name?: string | null
  location_lat?: number | null
  location_lng?: number | null
}

export interface LikeCount {
  page_id: string
  like_count: number
}

export interface LatLng { lat: number; lng: number }
