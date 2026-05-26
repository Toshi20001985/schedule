# Design Token Audit — Phase 1 (Session 21)

調査日: 2026-05-26

---

## 1. 現状のトークン定義場所

**Tailwind v4 を採用**。`tailwind.config.ts` は存在せず、全トークンは `app/globals.css` の `@theme {}` ブロックで定義。

---

## 2. 現状の `@theme` トークン一覧

### カラー

| トークン名 | 値 | 用途 |
|---|---|---|
| `--color-bg` | `#FAFAF7` | メイン背景 |
| `--color-card` | `#FFFFFF` | カード背景 |
| `--color-border` | `#E5E5E5` | ボーダー |
| `--color-text` | `#1A1A1A` | メインテキスト |
| `--color-muted` | `#737373` | サブテキスト |
| `--color-subtle` | `#A3A3A3` | 補助テキスト |
| `--color-surface` | `#F5F5F3` | サーフェス |
| `--color-accent` | `#1A1A1A` | アクセント |
| `--color-accent-hover` | `#333333` | アクセントホバー |
| `--color-hero-bg` | `#111111` | ヒーロー背景 |
| `--color-hero-text` | `#FAFAF7` | ヒーローテキスト |
| `--color-hero-muted` | `#555555` | ヒーロー補助 |
| `--color-hero-subtle` | `#A3A3A3` | ヒーロー薄字 |
| `--color-visit-soft` | `#F3F0FF` | 会う日（淡）|
| `--color-visit-accent` | `#6D5BD0` | 会う日（濃）|
| `--color-visit-accent-soft` | `#EEECF9` | 会う日（中）|
| `--color-trip-soft` | `#F0F7F0` | 旅行（淡）|
| `--color-trip-accent` | `#4A7C59` | 旅行（濃）|
| `--color-online-soft` | `#FFF7F0` | オンライン（淡）|
| `--color-online-accent` | `#C2782D` | オンライン（濃）|
| `--color-anniversary-soft` | `#FFF0F3` | 記念日（淡）|
| `--color-anniversary-accent` | `#B5465A` | 記念日（濃）|
| `--color-personal-soft` | `#F5F5F3` | 個人（淡）|
| `--color-personal-accent` | `#737373` | 個人（濃）|
| `--color-me` | `#6D5BD0` | わたし |
| `--color-partner` | `#2D6B9E` | パートナー |
| `--color-foreground` | `#1A1A1A` | メインテキスト（alias）|
| `--color-foreground-secondary` | `#4A4A4A` | セカンダリ |
| `--color-foreground-tertiary` | `#737373` | 補助 |
| `--color-foreground-quaternary` | `#A3A3A3` | キャプション |

### 角丸

| トークン名 | 値 |
|---|---|
| `--radius-sm` | `6px` |
| `--radius-md` | `10px` |
| `--radius-lg` | `14px` |
| `--radius-xl` | `20px` |

### シャドウ

| トークン名 | 値 |
|---|---|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)` |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)` |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.06)` |
| `--shadow-xl` | `0 16px 48px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.08)` |

### イージング・デュレーション

| トークン名 | 値 |
|---|---|
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| `--ease-smooth` | `cubic-bezier(0.25, 0.1, 0.25, 1)` |
| `--duration-fast` | `120ms` |
| `--duration-base` | `220ms` |
| `--duration-slow` | `380ms` |

---

## 3. 画面別 — ハードコードされた値の洗い出し

### `app/(main)/list/page.tsx`

| 箇所 | ハードコード値 | 相当するトークン |
|---|---|---|
| `inputStyle.border` | `0.5px solid #E5E5E5` | `var(--color-border)` |
| `inputStyle.borderRadius` | `10px` | `var(--radius-md)` |
| `inputStyle.backgroundColor` | `#FAFAF7` | `var(--color-bg)` |
| `inputStyle.color` | `#1A1A1A` | `var(--color-text)` |
| グループボタン選択中bg | `#1A1A1A` | `var(--color-accent)` |
| グループボタン非選択bg | `#F5F5F3` | `var(--color-surface)` |
| グループボタン非選択text | `#737373` | `var(--color-muted)` |

### `app/(main)/calendar/page.tsx`

| 箇所 | ハードコード値 | 相当するトークン |
|---|---|---|
| `inputStyle.border` | `0.5px solid var(--color-border)` | ✅ トークン使用済み |
| `inputStyle.borderRadius` | `var(--radius-md)` | ✅ トークン使用済み |
| `inputStyle.backgroundColor` | `var(--color-bg)` | ✅ トークン使用済み |
| `eventTypeConfig` 各色 | `#F3F0FF`, `#6D5BD0`... | `var(--color-visit-*)` に相当 |

### `app/(main)/page.tsx`

| 箇所 | ハードコード値 | 相当するトークン |
|---|---|---|
| `eventTypeConfig` 各色 | `#F3F0FF`, `#6D5BD0`... | `var(--color-visit-*)` に相当 |
| Hero AnimatedNumber | style属性で直接指定 | `var(--color-hero-text)` 使用済み |

### `app/(main)/insights/page.tsx`

| 箇所 | ハードコード値 | 相当するトークン |
|---|---|---|
| ローディング背景 | `#F5F5F3` | `var(--color-surface)` |

---

## 4. 不整合・課題まとめ

### 角丸の命名ズレ

現状 `--radius-sm: 6px`（ボタン・タグ向け）だが、提案仕様では `xs=6px`, `sm=10px`。  
Phase 1 では **新トークン追加**（`--radius-xs`, `--radius-2xl`）のみ実施し、既存は維持。  
Phase 2 以降でコンポーネント側を段階的に移行予定。

### シャドウの命名

既存の `--shadow-sm/md/lg/xl` は `rgba(0,0,0,...)` ベース。  
新規追加の `--shadow-soft-*` は `rgba(26,26,26,...)` ベースのより柔らかいセット。  
両方を並置して使い分け可能にする。

### ガラス効果ユーティリティ

既存: `.glass`（白ベース）, `.glass-dark`（黒ベース）, `.glass-border`  
更新: `.glass-light`（クリームベース）を追加し、`.glass-dark` を仕様値に更新。`.glass` は後方互換で残す。

---

## 5. Phase 1 変更内容

### `app/globals.css` `@theme` への追加

- **カラー**: background variants、border variants、accent blue/pink、foreground-inverse
- **角丸**: `--radius-xs: 6px`、`--radius-2xl: 32px`
- **シャドウ**: `--shadow-soft-xs` 〜 `--shadow-soft-xl`、`--shadow-glow-accent`
- **イージング**: `--ease-snappy`（= spring の別名）、`--ease-gentle`
- **デュレーション**: `--duration-normal: 200ms`、`--duration-slower: 500ms`

### `app/globals.css` ユーティリティへの追加

- `.glass-light`（新規）
- `.glass-dark`（値を仕様値に更新）
- `.glass-border`（既存維持）

### 変更しないもの

- 既存 `--radius-sm/md/lg/xl` — コンポーネント破壊を防ぐため維持
- `--color-visit-*` 等のイベントカラー — 既存コンポーネントが直接参照
- スペーシング — Tailwind v4 デフォルト（`--spacing: 0.25rem`）が要件を満たす
