-- ============================================================
-- TODOS (やりたいことリスト) — 冪等版
-- テーブルが既に存在していてもエラーにならない
-- ============================================================

-- テーブルが存在しない場合のみ作成
CREATE TABLE IF NOT EXISTS public.todos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT,
  memo TEXT,
  is_done BOOLEAN NOT NULL DEFAULT FALSE,
  done_date DATE,
  owner TEXT CHECK (owner IN ('me', 'partner', 'both')) DEFAULT 'both',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 既存テーブルに owner カラムがない場合だけ追加
ALTER TABLE public.todos
  ADD COLUMN IF NOT EXISTS owner TEXT CHECK (owner IN ('me', 'partner', 'both')) DEFAULT 'both';

-- RLS を有効化
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- ポリシーを再作成（既存があれば上書き）
DROP POLICY IF EXISTS "todos_select" ON public.todos;
CREATE POLICY "todos_select" ON public.todos
  FOR SELECT USING (
    couple_id IN (
      SELECT couple_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "todos_insert" ON public.todos;
CREATE POLICY "todos_insert" ON public.todos
  FOR INSERT WITH CHECK (
    couple_id IN (
      SELECT couple_id FROM public.users WHERE id = auth.uid()
    ) AND added_by = auth.uid()
  );

DROP POLICY IF EXISTS "todos_update" ON public.todos;
CREATE POLICY "todos_update" ON public.todos
  FOR UPDATE USING (
    couple_id IN (
      SELECT couple_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "todos_delete" ON public.todos;
CREATE POLICY "todos_delete" ON public.todos
  FOR DELETE USING (added_by = auth.uid());

-- インデックス
CREATE INDEX IF NOT EXISTS idx_todos_couple_id ON public.todos(couple_id);
CREATE INDEX IF NOT EXISTS idx_todos_is_done   ON public.todos(is_done);

-- updated_at トリガー（既存があれば削除して再作成）
DROP TRIGGER IF EXISTS todos_updated_at ON public.todos;
CREATE TRIGGER todos_updated_at
  BEFORE UPDATE ON public.todos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
