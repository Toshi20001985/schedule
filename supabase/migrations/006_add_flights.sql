-- ============================================================
-- FLIGHTS (フライト情報)
-- ============================================================
CREATE TABLE public.flights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,

  -- 基本情報
  flight_number TEXT,
  airline TEXT,

  -- 出発・到着
  departure_airport TEXT,
  arrival_airport TEXT,
  departure_time TIMESTAMPTZ,
  arrival_time TIMESTAMPTZ,

  -- 区分
  direction TEXT CHECK (direction IN ('outbound', 'return')),

  -- 搭乗者
  passenger_id UUID REFERENCES public.users(id) ON DELETE SET NULL,

  -- メモ
  seat TEXT,
  booking_reference TEXT,
  memo TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.flights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couples can manage their flights"
  ON public.flights
  FOR ALL
  USING (
    couple_id IN (
      SELECT couple_id FROM public.users WHERE id = auth.uid()
    )
  );

-- インデックス
CREATE INDEX idx_flights_event_id  ON public.flights(event_id);
CREATE INDEX idx_flights_couple_id ON public.flights(couple_id);

-- updated_at トリガー
CREATE TRIGGER flights_updated_at
  BEFORE UPDATE ON public.flights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
