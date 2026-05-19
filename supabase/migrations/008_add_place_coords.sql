-- places テーブルに座標カラムを追加
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION;
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
