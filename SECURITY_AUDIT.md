# Layover セキュリティ監査レポート

**実施日: 2026-05-24**
**対象セッション: セッション16（Phase S-3 セキュリティ監査）**

---

## 監査サマリー

**総合評価: 良好（致命的脆弱性なし）**

個人 PWA として必要十分なセキュリティが確保されている。
監査前から RLS・XSS 対策・シークレット管理は適切に実施されていた。
今回の監査で HTTP セキュリティヘッダーとパスワード強度チェックを追加した。

---

## 1. XSS（クロスサイトスクリプティング）

| 確認項目 | 結果 |
|---|---|
| `dangerouslySetInnerHTML` の使用 | ✅ なし |
| `eval()` の使用 | ✅ なし |
| `innerHTML` への代入 | ✅ なし |
| `document.write()` の使用 | ✅ なし |

**評価**: React の JSX は自動エスケープを行うため、ユーザー入力が DOM に直接埋め込まれる箇所はすべて安全。

---

## 2. シークレット・環境変数管理

| 確認項目 | 結果 |
|---|---|
| `.env.local` の `.gitignore` 登録 | ✅ `.env*` パターンで除外済み |
| `service_role` キーの使用 | ✅ なし（クライアントは `anon` キーのみ） |
| サーバーサイド専用シークレットの漏洩 | ✅ なし（API ルートなし） |
| `NEXT_PUBLIC_*` のアクセスキー露出 | ⚠️ `ANON_KEY` はクライアント公開が設計上必須（Supabase RLS で保護）|

**`ANON_KEY` の公開について**: Supabase の設計上、`anon` キーはクライアントに公開されても安全。
RLS（Row Level Security）がデータアクセスを制御するため、キーが漏洩しても他ユーザーのデータには読み書きできない。

---

## 3. Row Level Security（RLS）

| テーブル | RLS 有効化 | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|---|
| `users` | ✅ | 自分＋パートナーのみ | 自分のみ | 自分のみ | — |
| `couples` | ✅ | メンバーのみ | 自分が user1 | メンバーのみ | — |
| `events` | ✅ | カップルのみ | カップル＋created_by=自分 | カップルのみ | created_by=自分 |
| `places` | ✅ | カップルのみ | カップル＋added_by=自分 | カップルのみ | added_by=自分 |
| `media` | ✅ | カップルのみ | カップル＋added_by=自分 | カップルのみ | added_by=自分 |
| `flights` | ✅ | カップルのみ | カップルのみ | カップルのみ | カップルのみ |
| `todos` | ✅ | カップルのみ | カップルのみ | カップルのみ | カップルのみ |

**評価**: 全テーブルで RLS が有効化されており、ポリシーも適切に設計されている。
データの参照・更新・削除はすべてカップルスコープ内に制限されている。

---

## 4. セキュリティヘッダー

### 監査前（未設定）

PWA 関連ヘッダー（`manifest.json` / `sw.js`）のみ設定されており、
セキュリティヘッダーは未設定だった。

### 監査後（追加済み）

`next.config.ts` の `headers()` に全ページ (`/(.*)``) 向けヘッダーを追加:

| ヘッダー | 値 | 目的 |
|---|---|---|
| `X-Frame-Options` | `DENY` | クリックジャッキング攻撃防止 |
| `X-Content-Type-Options` | `nosniff` | MIME スニッフィング攻撃防止 |
| `X-DNS-Prefetch-Control` | `on` | パフォーマンス最適化 |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | リファラー情報の漏洩防止 |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | 不必要な権限を無効化 |
| `Content-Security-Policy` | 下記参照 | XSS・インジェクション攻撃の追加防御 |

### CSP 設計

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.supabase.co;
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://nominatim.openstreetmap.org;
worker-src 'self';
frame-src 'none';
object-src 'none';
base-uri 'self';
form-action 'self'
```

**`unsafe-inline` / `unsafe-eval` について**:
Next.js App Router は hydration にインラインスクリプトを使用するため不可避。
`frame-src 'none'` と `object-src 'none'` で高リスクな攻撃ベクターは封鎖済み。

---

## 5. 認証・パスワードセキュリティ

| 確認項目 | 結果 |
|---|---|
| パスワードハッシュ化 | ✅ Supabase Auth が bcrypt で管理（アプリ側で実装不要） |
| パスワードリセット | ✅ Supabase Auth の標準機能を利用可能 |
| セッション管理 | ✅ Supabase SSR クライアント（Cookie ベース）で管理 |
| パスワード強度チェック（HTML） | ✅ `minLength={8}` 属性 |
| パスワード強度チェック（JS） | ✅ 監査後に追加（英字＋数字の両方を要求） |

### 追加したバリデーション

`app/auth/signup/page.tsx` の `handleSignup` 先頭で検査:

1. 8文字未満 → エラーメッセージ表示
2. 英字が含まれない → エラーメッセージ表示
3. 数字が含まれない → エラーメッセージ表示

Supabase API を呼び出す前にクライアントサイドで弾くため、不要な API ラウンドトリップがない。

---

## 6. SQL インジェクション

| 確認項目 | 結果 |
|---|---|
| 生 SQL 文字列の使用 | ✅ なし |
| Supabase クライアントのみ使用 | ✅ `.select()` `.insert()` `.update()` `.delete()` API のみ |

**評価**: Supabase JS クライアントはすべてパラメータ化クエリを使用するため、SQL インジェクションのリスクなし。

---

## 7. API セキュリティ

| 確認項目 | 結果 |
|---|---|
| `/api/` ルートの存在 | ✅ なし（全操作はクライアントから Supabase 直接） |
| サーバーアクションの使用 | ✅ なし |
| CORS 設定 | ✅ Supabase 側で管理 |

---

## 8. 依存ライブラリの既知脆弱性

```bash
npm audit
```

※ 実行タイミングで結果が変わるため、定期的な確認を推奨。
特に `next` / `@supabase/supabase-js` のセキュリティアップデートに注意。

---

## 9. 手動確認が必要な項目

| # | 項目 | 確認方法 |
|---|---|---|
| 1 | Supabase Auth のメール確認設定 | Dashboard > Authentication > Settings |
| 2 | Supabase Auth のパスワード最小文字数設定 | Dashboard > Authentication > Settings（デフォルト6文字）|
| 3 | RLS ポリシーの実際の適用状況 | Supabase Dashboard > Table Editor > RLS タブ |
| 4 | Vercel 環境変数に `service_role` キーが含まれていないか | Vercel Dashboard > Settings > Environment Variables |

---

## 10. 今後の改善候補（優先度順）

| 優先 | 内容 | 理由 |
|---|---|---|
| 中 | Supabase Auth のパスワード最小文字数を 8 文字に変更 | デフォルトは 6 文字でアプリの要件（8文字）と不一致 |
| 低 | CSP の `nonce` ベース実装への移行 | `unsafe-inline` を排除できる。ただし Next.js での実装が複雑 |
| 低 | `npm audit` の CI 組み込み | 依存ライブラリの脆弱性を自動検出 |
| 低 | HSTS（Strict-Transport-Security）ヘッダーの追加 | Vercel は HTTPS 強制なので優先度は低い |
