export type EventType = 'visit' | 'trip' | 'online' | 'anniversary' | 'personal'
export type MediaType = 'movie' | 'tv' | 'anime' | 'music' | 'book' | 'other'

export interface User {
  id: string
  email: string
  display_name: string
  avatar_color: string
  couple_id: string | null
  invite_code: string | null
  created_at: string
  updated_at: string
}

export interface Couple {
  id: string
  user1_id: string
  user2_id: string | null
  anniversary: string | null
  next_meeting_date: string | null
  couple_name: string | null
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  couple_id: string
  created_by: string
  title: string
  event_date: string
  end_date: string | null
  event_type: EventType
  memo: string | null
  created_at: string
  updated_at: string
}

export interface Place {
  id: string
  couple_id: string
  added_by: string
  name: string
  category: string | null
  location: string | null
  memo: string | null
  is_visited: boolean
  visited_date: string | null
  image_url: string | null
  created_at: string
  updated_at: string
}

export interface Media {
  id: string
  couple_id: string
  added_by: string
  title: string
  media_type: MediaType
  memo: string | null
  is_done: boolean
  done_date: string | null
  image_url: string | null
  created_at: string
  updated_at: string
}

export type FlightDirection = 'outbound' | 'return'

export interface Flight {
  id: string
  event_id: string
  couple_id: string
  flight_number: string | null
  airline: string | null
  departure_airport: string | null
  arrival_airport: string | null
  departure_time: string | null  // TIMESTAMPTZ → ISO string
  arrival_time: string | null
  direction: FlightDirection | null
  passenger_id: string | null
  seat: string | null
  booking_reference: string | null
  memo: string | null
  created_at: string
  updated_at: string
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: Omit<User, 'created_at' | 'updated_at'>
        Update: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>
      }
      couples: {
        Row: Couple
        Insert: Omit<Couple, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Couple, 'id' | 'created_at' | 'updated_at'>>
      }
      events: {
        Row: Event
        Insert: Omit<Event, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Event, 'id' | 'created_at' | 'updated_at'>>
      }
      places: {
        Row: Place
        Insert: Omit<Place, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Place, 'id' | 'created_at' | 'updated_at'>>
      }
      media: {
        Row: Media
        Insert: Omit<Media, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Media, 'id' | 'created_at' | 'updated_at'>>
      }
      flights: {
        Row: Flight
        Insert: Omit<Flight, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Flight, 'id' | 'created_at' | 'updated_at'>>
      }
    }
  }
}
