# Layover 安定性監査レポート

**実施日: 2026-05-25**
**対象セッション: セッション14（Phase S-1 現状把握）**

---

## E2E テスト ベースライン

| 項目 | 結果 |
|---|---|
| 実行日時 | 2026-05-25 |
| ベースライン（監査開始前） | ⚠ 18/19 通過（1件失敗） |
| 失敗テスト | `tests/list.spec.ts`: 場所を追加するとリストに表示される |
| 失敗原因 | デモモードでも Nominatim を呼び出すため 10s タイムアウトが切れる |
| 修正内容 | `lib/geocoding.ts` に Supabase 未設定時スキップを追加 |
| 修正後結果 | ✓ **19/19 全通過** |

---

## 1. バンドルサイズ分析

### 概要

| 項目 | 値 |
|---|---|
| 本番ビルドの静的 JS 総量 | 1.8 MB（非圧縮） |
| チャンク数 | 34 |
| 最大チャンクサイズ | 236 KB |

### 主要依存ライブラリ（重量順）

| ライブラリ | バージョン | 重さの要因 |
|---|---|---|
| `framer-motion` | ^12.38.0 | アニメーション全般（PageTransition・モーション効果） |
| `leaflet` + `react-leaflet` | ^1.9.4 / ^5.0.0 | 地図（map ページで dynamic import でコード分割済み） |
| `@supabase/supabase-js` + `@supabase/ssr` | ^2.105.4 / ^0.10.3 | DB・認証クライアント |
| `date-fns` | ^4.1.0 | 日付計算・フォーマット |
| `vaul` | ^1.1.2 | BottomSheet コンポーネント |
| `lucide-react` | ^1.14.0 | アイコン（ツリーシェイク対応） |

### 評価

- **良好**: Leaflet は `dynamic(() => import(...), { ssr: false })` でコード分割済み。地図を使わないページでは読み込まれない。
- **良好**: `d3-geo` / `topojson-client` は `scripts/generate-icons.mjs` のみで使用。アプリバンドルには含まれない。
- **許容範囲**: framer-motion が最大の要因だが、PWA 全体として 1.8MB は個人アプリとして標準的。
- **要注意**: `vaul` (DialogContent) が Radix UI の `Description` 警告を多数出しているが機能上の問題はなし。

---

## 2. コード品質・潜在リスク分析

### ✅ 問題なし

| 項目 | 確認内容 |
|---|---|
| setTimeout クリーンアップ | calendar / list の `setHighlightedId` setTimeout → `return () => clearTimeout(t)` あり ✓ |
| search デバウンス | `return () => clearTimeout(t)` あり ✓ |
| Realtime チャンネル | `useRealtimeSync` の `return () => { supabase.removeChannel(channel) }` あり ✓ |
| オンラインステータス | `useOnlineStatus` の `return () => { removeEventListener() }` あり ✓ |
| settings / pair タイマー | `savedTimerRef` / `copiedTimerRef` で管理、cleanup あり ✓ |
| console.log 残存 | 本番コードにはなし（エラーハンドラ内の `console.error` のみ）✓ |
| `d3-geo` / `topojson` の混入 | アプリバンドルに含まれない（scripts のみ）✓ |

### ⚠️ 改善候補（優先度：低）

| 項目 | 内容 | 優先度 |
|---|---|---|
| `useRealtimeSync` の `as any` キャスト | Supabase クライアントの型を `any` にキャスト。型安全性が低下している | 低 |
| 空の `catch {}` ブロック | `localStorage` アクセス・Haptics・geocoding など 7 箇所。意図的なサイレント失敗と思われるが、デバッグ時に不便 | 低 |
| ページファイルの肥大化 | `calendar/page.tsx` 1481行、`list/page.tsx` 1346行。現状問題なし | 低 |

### 🔴 バグ修正（今回発見・修正済み）

| 対象 | 内容 |
|---|---|
| `lib/geocoding.ts` | デモモード（Supabase 未設定）でも Nominatim を呼び出していた → `!process.env.NEXT_PUBLIC_SUPABASE_URL` の場合はスキップするよう修正 |

---

## 3. アーキテクチャ健全性

### Supabase 接続パターン

- クライアント側: `createClient()` を都度呼び出し（シングルトン禁止のルールを遵守）
- サーバー側: `lib/supabase/server.ts` で Cookie を扱う SSR クライアント
- Realtime: `useRealtimeSync` フックで購読・クリーンアップ管理

### Service Worker（キャッシュ戦略）

- `layover-v2`（ナビゲーション）: ネットワークファースト → キャッシュフォールバック
- `layover-static-v2`（`/_next/static/` JS・CSS）: キャッシュファースト（ハッシュ付きファイル名のため安全）
- Supabase API / `/api/` : SW をスルー（キャッシュなし）
- **評価**: 戦略は適切。問題なし。

### エラーハンドリング

- グローバル: `ToastProvider` + `useErrorHandler` + `app/error.tsx` が整備済み
- Supabase 失敗時フォールバック: `useCollection.addItem` でローカル state に追加（データロストなし）
- geocoding 失敗: `null` を返し、UI にトーストで通知。場所の追加自体は続行

---

## 4. 手動確認が必要な項目（未実施）

以下は Claude Code からは自動測定できないため、手動での確認を推奨します。

### Lighthouse スコア（本番ビルドで計測）

```bash
npm run build && npm start
# → Chrome DevTools > Lighthouse で計測
```

測定ページ: `/`、`/calendar`、`/list`、`/map`

特に確認すべき指標:
- **PWA スコア**: マニフェスト・SW・HTTPS の要件を満たしているか
- **Performance**: FCP（First Contentful Paint）、LCP（Largest Contentful Paint）

### iPhone 実機確認

- ホーム表示までの起動時間
- ページ遷移アニメーションのカクつき
- `/map` 地図ページの初期表示時間（Leaflet タイル読み込み）
- スクロール時のカクつき（特に `/list`）
- Safari のセーフエリア表示（ノッチ・ホームバー）

### Supabase ダッシュボード確認

- `events`, `places`, `media`, `todos`, `flights` テーブルの行数
- Slow Query Log（1秒超クエリ）
- Realtime テーブル有効化状況（`todos` が未確認）
- RLS エラーログ

### Vercel ログ確認

- 過去30日のエラー種別・発生頻度

---

## 5. 既知の問題・懸念点

| # | 内容 | 深刻度 | 対応状況 |
|---|---|---|---|
| 1 | Nominatim レート制限（1 req/s）— 複数場所を素早く追加すると`1.1s 待機 × 2` が走る | 低 | 許容（個人利用では問題なし） |
| 2 | `vaul` DialogContent の `aria-describedby` 警告 | 低 | アクセシビリティ上の警告。機能影響なし |
| 3 | `todos` テーブルの Realtime 有効化が未確認 | 中 | Supabase Dashboard で要確認 |
| 4 | `map` ページは BottomNav からアクセス不可（`/list` からのリンクのみ） | 低 | 設計上の制限（BottomNav 5タブ満杯） |

---

## 6. Phase S-2 以降の改修優先度（提案）

| 優先 | 内容 | 理由 |
|---|---|---|
| 高 | Supabase todos Realtime 有効化確認 | パートナーのtodo追加が即時反映されない可能性 |
| 中 | `vaul` DialogContent に `aria-description` を追加 | アクセシビリティ・コンソール警告の解消 |
| 低 | `useRealtimeSync` の `as any` を型付きに改善 | 型安全性向上 |
| 低 | カレンダー・リストページの肥大化対策（コンポーネント分割） | 長期的なメンテナビリティ向上 |

---

## 監査サマリー

**総合評価: 良好**

- セッション 1〜13 の実装は品質が高く、アーキテクチャルールも守られている
- 深刻なメモリリーク・クリーンアップ漏れは見当たらない
- バンドルサイズは個人 PWA として許容範囲
- 今回発見したバグ（デモモードでの不要なジオコーディング呼び出し）は修正済み
- 手動確認が必要な項目（Lighthouse・実機・Supabase）が残っているが、コードから見る限り重大な問題はない
