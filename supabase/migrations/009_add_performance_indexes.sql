-- パフォーマンス最適化：頻繁に使われるクエリのインデックスを追加
-- 適用前に必ず Supabase Dashboard でバックアップを確認すること
-- このファイルは冪等（何度実行しても安全）

-- events: couple_id + start_date での絞り込み（カレンダー表示）
CREATE INDEX IF NOT EXISTS idx_events_couple_date
  ON public.events(couple_id, start_date);

-- places: couple_id + is_visited での絞り込み（リスト・地図）
CREATE INDEX IF NOT EXISTS idx_places_couple_visited
  ON public.places(couple_id, is_visited);

-- places: 座標がある場所の絞り込み（地図バックフィル）
CREATE INDEX IF NOT EXISTS idx_places_coords
  ON public.places(couple_id)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- todos: couple_id + is_done での絞り込み（リスト）
CREATE INDEX IF NOT EXISTS idx_todos_couple_done
  ON public.todos(couple_id, is_done);

-- media: couple_id + is_done での絞り込み（リスト・インサイト）
CREATE INDEX IF NOT EXISTS idx_media_couple_done
  ON public.media(couple_id, is_done);

-- flights: event_id での絞り込み（カレンダー：既存の couple_id クエリを補助）
CREATE INDEX IF NOT EXISTS idx_flights_event_id
  ON public.flights(event_id);
