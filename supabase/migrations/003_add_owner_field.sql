-- Add owner field to places and media
ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS owner text CHECK (owner IN ('me', 'partner', 'both')) DEFAULT 'me';

ALTER TABLE public.media
  ADD COLUMN IF NOT EXISTS owner text CHECK (owner IN ('me', 'partner', 'both')) DEFAULT 'me';
