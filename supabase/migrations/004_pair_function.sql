-- ペアリング用のSECURITY DEFINER関数
-- RLSをバイパスして招待コードによるペアリングを安全に実行する

CREATE OR REPLACE FUNCTION public.pair_with_invite_code(p_invite_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_id           UUID := auth.uid();
  v_partner_id      UUID;
  v_partner_couple  UUID;
BEGIN
  -- 招待コードでパートナーを検索（SECURITY DEFINERのためRLSをバイパス）
  SELECT id, couple_id
    INTO v_partner_id, v_partner_couple
    FROM public.users
   WHERE invite_code = UPPER(p_invite_code)
   LIMIT 1;

  IF v_partner_id IS NULL THEN
    RETURN jsonb_build_object('error', '招待コードが見つかりません。');
  END IF;

  IF v_partner_id = v_my_id THEN
    RETURN jsonb_build_object('error', '自分のコードは使えません。');
  END IF;

  IF v_partner_couple IS NULL THEN
    RETURN jsonb_build_object('error', 'パートナーのアカウントが正しく設定されていません。');
  END IF;

  -- すでに別のユーザーとペアリング済みかチェック
  IF EXISTS (
    SELECT 1 FROM public.couples
     WHERE id = v_partner_couple
       AND user2_id IS NOT NULL
       AND user2_id <> v_my_id
  ) THEN
    RETURN jsonb_build_object('error', 'このコードはすでに使用されています。');
  END IF;

  -- 自分のソロカップル行を削除（サインアップ時に作られた user2_id = NULL のもの）
  DELETE FROM public.couples
   WHERE user1_id = v_my_id
     AND user2_id IS NULL
     AND id <> v_partner_couple;

  -- 自分の couple_id をパートナーのカップルに変更
  UPDATE public.users
     SET couple_id = v_partner_couple
   WHERE id = v_my_id;

  -- カップル行の user2_id に自分をセット
  UPDATE public.couples
     SET user2_id = v_my_id
   WHERE id = v_partner_couple;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 認証済みユーザーに実行権限を付与
GRANT EXECUTE ON FUNCTION public.pair_with_invite_code(TEXT) TO authenticated;
