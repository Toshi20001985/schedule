-- サインアップ時に自動でユーザープロフィールとカップルを作成するトリガー
-- メール確認の有無に関わらずRLSをバイパスして安全にセットアップできる

-- ランダムな招待コード生成関数
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT
LANGUAGE sql
AS $$
  SELECT string_agg(
    substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (floor(random() * 32) + 1)::int, 1),
    ''
  )
  FROM generate_series(1, 8);
$$;

-- 新規ユーザー作成時のセットアップ関数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite_code TEXT;
  v_couple_id   UUID;
BEGIN
  -- 重複しない招待コードを生成
  LOOP
    v_invite_code := public.generate_invite_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.users WHERE invite_code = v_invite_code);
  END LOOP;

  -- ユーザープロフィール作成（既存の場合はスキップ）
  INSERT INTO public.users (id, email, display_name, invite_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    v_invite_code
  )
  ON CONFLICT (id) DO NOTHING;

  -- couple_id が未設定の場合のみカップル作成
  IF NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = NEW.id AND couple_id IS NOT NULL
  ) THEN
    INSERT INTO public.couples (user1_id)
    VALUES (NEW.id)
    RETURNING id INTO v_couple_id;

    UPDATE public.users
       SET couple_id = v_couple_id
     WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- トリガー作成（既存があれば削除して再作成）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
