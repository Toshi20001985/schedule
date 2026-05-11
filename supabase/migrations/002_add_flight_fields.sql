-- Add flight management fields to events table
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS traveler    text CHECK (traveler IN ('me', 'partner')),
  ADD COLUMN IF NOT EXISTS flight_payer text CHECK (flight_payer IN ('me', 'partner', 'split'));
