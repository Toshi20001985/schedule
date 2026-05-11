-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_color TEXT NOT NULL DEFAULT '#E8B5AB',
  couple_id UUID,
  invite_code TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COUPLES
-- ============================================================
CREATE TABLE public.couples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  anniversary DATE,
  next_meeting_date DATE,
  couple_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK from users to couples
ALTER TABLE public.users ADD CONSTRAINT users_couple_id_fkey
  FOREIGN KEY (couple_id) REFERENCES public.couples(id) ON DELETE SET NULL;

-- ============================================================
-- EVENTS (Calendar)
-- ============================================================
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  end_date DATE,
  event_type TEXT NOT NULL CHECK (event_type IN ('visit', 'trip', 'online', 'anniversary', 'personal')),
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PLACES (行きたい場所)
-- ============================================================
CREATE TABLE public.places (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  location TEXT,
  memo TEXT,
  is_visited BOOLEAN NOT NULL DEFAULT FALSE,
  visited_date DATE,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MEDIA (観たい・聴きたい)
-- ============================================================
CREATE TABLE public.media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv', 'anime', 'music', 'book', 'other')),
  memo TEXT,
  is_done BOOLEAN NOT NULL DEFAULT FALSE,
  done_date DATE,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

-- Users: can read/update own row, partner's row
CREATE POLICY "users_select" ON public.users
  FOR SELECT USING (
    auth.uid() = id OR
    couple_id IN (
      SELECT couple_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Couples: members can read/update
CREATE POLICY "couples_select" ON public.couples
  FOR SELECT USING (
    user1_id = auth.uid() OR user2_id = auth.uid()
  );

CREATE POLICY "couples_insert" ON public.couples
  FOR INSERT WITH CHECK (user1_id = auth.uid());

CREATE POLICY "couples_update" ON public.couples
  FOR UPDATE USING (
    user1_id = auth.uid() OR user2_id = auth.uid()
  );

-- Events: couple members can CRUD
CREATE POLICY "events_select" ON public.events
  FOR SELECT USING (
    couple_id IN (
      SELECT couple_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "events_insert" ON public.events
  FOR INSERT WITH CHECK (
    couple_id IN (
      SELECT couple_id FROM public.users WHERE id = auth.uid()
    ) AND created_by = auth.uid()
  );

CREATE POLICY "events_update" ON public.events
  FOR UPDATE USING (
    couple_id IN (
      SELECT couple_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "events_delete" ON public.events
  FOR DELETE USING (created_by = auth.uid());

-- Places: couple members can CRUD
CREATE POLICY "places_select" ON public.places
  FOR SELECT USING (
    couple_id IN (
      SELECT couple_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "places_insert" ON public.places
  FOR INSERT WITH CHECK (
    couple_id IN (
      SELECT couple_id FROM public.users WHERE id = auth.uid()
    ) AND added_by = auth.uid()
  );

CREATE POLICY "places_update" ON public.places
  FOR UPDATE USING (
    couple_id IN (
      SELECT couple_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "places_delete" ON public.places
  FOR DELETE USING (added_by = auth.uid());

-- Media: couple members can CRUD
CREATE POLICY "media_select" ON public.media
  FOR SELECT USING (
    couple_id IN (
      SELECT couple_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "media_insert" ON public.media
  FOR INSERT WITH CHECK (
    couple_id IN (
      SELECT couple_id FROM public.users WHERE id = auth.uid()
    ) AND added_by = auth.uid()
  );

CREATE POLICY "media_update" ON public.media
  FOR UPDATE USING (
    couple_id IN (
      SELECT couple_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "media_delete" ON public.media
  FOR DELETE USING (added_by = auth.uid());

-- ============================================================
-- TRIGGERS for updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER couples_updated_at BEFORE UPDATE ON public.couples
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER places_updated_at BEFORE UPDATE ON public.places
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER media_updated_at BEFORE UPDATE ON public.media
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
