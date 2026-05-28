# 改修・バグ修正ログ

このファイルは Claude との相談用に、過去の改修・バグ修正の内容を記録したものです。

---

## セッション 34：Phase F4 — Precision（細部の完成度）

### 目的
1ピクセル単位の精度を上げ、「気づかないけど上質」な体験を作る。

### 変更ファイル
- `app/globals.css` — `.tabular` クラスと各種テキストユーティリティ追加
- `components/BottomSheet.tsx` — × ボタンのタップターゲット拡大
- `app/(main)/list/page.tsx` — 場所・Todo の編集/削除ボタンのタップターゲット拡大
- `app/(main)/insights/page.tsx` — 小さな数字に `.tabular` クラス追加

### 設計判断

**Step 1（Icon ラッパー）→ 省略**
- プロジェクト全体の 91% がすでに `strokeWidth={1.5}` で統一済み
- BottomNav の `isActive ? 2 : 1.5` は意図的デザイン（アクティブ状態を太くする）
- FAB の `strokeWidth={2}` も意図的（主要アクションの + ボタンは強調する）
- ラッパーを作って全置換するリスクに対し効果が薄い → 省略

**Step 2（タップターゲット 44px）**

修正した箇所：
- **BottomSheet × ボタン**: `p-1.5`（30px） → `min-h-[44px] min-w-[44px] flex items-center justify-center`
- **list/page.tsx の編集・削除ボタン**: `p-1.5`（26px） → `min-h-[44px] min-w-[44px] flex items-center justify-center`（`replace_all` で全 10 箇所を一括）

省略した箇所：
- メディアタブの縦並びボタン（`flex-col` で 2 段積み → 44px×2=88px になりレイアウト破綻のリスク）

**Step 3（ベースライングリッド）→ 省略**
セッション 20-22 のタイポグラフィに触れるリスクが高く、任意 px 値の残存もほぼなし

**Step 4（tabular-nums）**
- `globals.css` に `.tabular` クラス追加
  ```css
  font-feature-settings: 'tnum' 1, 'lnum' 1;
  font-variant-numeric: tabular-nums lining-nums;
  ```
- insights の大数字（52px）はすでに inline で `fontFeatureSettings` 設定済み
- 小さな数字（訪問数、映画本数、カテゴリ統計）に `.tabular` クラスを追加

**Step 5（オプティカルアライメント）→ 省略**
視差 1px 調整はデグレリスクに対し体感差が小さい → 見送り

**Step 6（テキストユーティリティ）**
- `globals.css` に `.heading-display`・`.heading-large`・`.body-text`・`.label-small` 追加
- 既存コードへの適用は行わない（デザイントークンの定義のみ、セッション 20-22 破壊防止）

**Step 7（線の太さ）→ 省略**
セッション 22 で 0.5px ボーダーは大半対応済み

### テスト
37 passed（変更なし）

---

## セッション 33：Phase F3 — Materiality（マテリアル感の完成）

### 目的
ガラス素材・光・影のリアリティを高め、Apple-quality の質感に近づける。

### 変更ファイル
- `app/globals.css` — `glass-premium-light` / `glass-premium-dark` CSS ユーティリティ追加
- `components/BottomNav.tsx` — blur 強化、上端ハイライト追加
- `components/BottomSheet.tsx` — オーバーレイ blur 強化、コンテンツ上端ハイライト追加
- `app/(main)/page.tsx` — ヒーロー背景グラデーション強化、満月グロー追加

### 設計判断

**globals.css — glass-premium-light / glass-premium-dark**
- blur: 20px → **40px**、saturate: 180% → **200%** でより透明感・奥行きのあるガラスに
- `inset 0 1px 0` による上端の光の反射ライン（フロストガラス感）
- 既存の `.glass-light` / `.glass-dark` は互換維持（上書きしていない）

**BottomNav.tsx**
- backdrop-filter: blur(20px) → **blur(40px)**、saturate(200%)
- background: rgba(250,245,238,0.82) → **0.85**（少し濃く）
- `boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)'` — 上端に光の線

**BottomSheet.tsx**
- オーバーレイ: blur(4px) → **blur(10px)**（背景のぼかし強化）
- コンテンツ上端: `boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)'` 追加

**page.tsx — ヒーローカード**
- 右上グラデーション: rgba(167,139,250,**0.15**) → rgba(167,139,250,**0.22**)
- 左下グラデーション: rgba(255,159,184,**0.08**) → rgba(255,159,184,**0.10**)
- 満月時（daysLeft 0–6）のみ：右下に月光グロー `radial-gradient` を重ねる

### テスト
37 passed（変更なし）

---

## セッション 32：Phase F2 — State Polish（状態遷移の完成度）

### 目的
ローディング・空状態・エラー状態を「データがない時間も美しい体験」に磨く。

### 変更ファイル
- `components/ToastProvider.tsx` — 位置・アニメーション・デザイン改善
- `app/(main)/list/page.tsx` — 3タブの空状態に CTA ボタン追加
- `app/(main)/page.tsx` — ホーム空状態（no_meeting）の CTA を整備

### 設計判断

**スコープを絞った理由**
- HomeSkeleton コンポーネント化: ホームの loading 管理が複雑でリファクタリング量が大きい → 見送り
- AnimatePresence による全状態クロスフェード: 各ページの構造変更が必要 → 見送り
- state-polish.spec.ts: ネットワーク遅延モックはフレーキーになりやすい → 見送り

**ToastProvider.tsx**
- 位置: 上部（top: safe-area + 12px）→ **下部（bottom: safe-area + 72px + 12px）**
  BottomNav の真上に表示。モバイルでより自然な位置。
- アニメーション: linear → `springs.snappy`（y: 20 から弾んで登場）
- ガラス効果: `backdropFilter: blur(16px) saturate(160%)` 追加
- 影: `box-shadow` を濃くして奥行き感を付与
- 幅: `maxWidth` のみ → `width: 100%` でパネル幅いっぱいに表示
- 自動消滅: 3s → **4s**（読む時間を確保）
- z-index: 50 → 60（BottomSheet z-50 の上に確実に出る）

**list/page.tsx — 空状態 3タブ**
- アイコンサイズ: 22 → 26px（存在感アップ）
- コンテナ: py-12 → py-14（余白拡大）
- タイトル: `var(--font-display)` italic 18px でブランドコピーを設定
  - 場所:「ふたりの世界地図を作ろう」
  - メディア: 「ふたりの鑑賞リスト」
  - Todo: 「Bucket List」
- CTA ボタン: `setShowSheet(true)` を呼ぶ追加ボタンを各タブに設置
  - 場所: 「最初の場所を追加」
  - メディア: 「最初のアイテムを追加」
  - Todo: 「最初のリストを追加」（※「やりたいこと」はタブボタンとセレクター衝突するため避けた）

**page.tsx — no_meeting 空状態**
- CTA: div（非タップ） → button（タップ可能）
- テキスト: 「カレンダーで追加する →」→ 「PLAN A MEETING →」（英語統一）
- クリック時: `router.push('/calendar')` で直接カレンダーへ
- `e.stopPropagation()` でヒーローカードの onClick（カレンダー遷移）との二重発火を防止

### テスト
- TypeScript: エラー 0
- E2E: 37 passed（修正前に「やりたいことを追加」テキストがタブボタンと部分一致してテスト失敗 → テキスト変更で解消）

---

## セッション 31：Phase F1 — Motion Design（スプリングアニメーション導入）

### 目的
機械的な linear/ease トランジションを Apple ライクなスプリングに置き換え、
動きに「質量」を持たせる。

### 変更ファイル
- `lib/motion.ts`（新規）— スプリングプリセット定義
- `app/(main)/page.tsx` — スタガーアニメーションをスプリングに更新
- `components/PullToRefresh.tsx` — アイコン演出を改善

### 設計判断

**スコープを絞った理由**
- `SwipeableListItem`: native touch + CSS transform による精密な実装（`position:fixed` 問題対策込み）を framer-motion drag に置き換えると壊れるリスクが高い → 見送り
- `AnimatedNumber`: ヒーロー数字のタイポグラフィ（セッション20）破壊リスク → 見送り
- `BottomSheet`: vaul ライブラリが独自アニメーションを管理 → 見送り

**lib/motion.ts**
5 種のスプリングプリセット（default / gentle / snappy / bouncy / slow）と
eases・durations 定数を定義。プリセットを import するだけで一貫した動きを実現。

**page.tsx**
- staggerChildren: 0.07 → 0.06（わずかに間隔を詰めてキビキビ感）
- delayChildren: 0.1 → 0.08
- staggerItem の transition: `duration: 0.3, ease: [...]` → `springs.default`
  → ページ表示時の各カードが弾むように登場する

**PullToRefresh.tsx**
- 完了チェックマーク: `ease: 'backOut'` → `springs.bouncy`（弾む完了演出）
- スピナー: `opacity` のみ → `opacity + scale` + `springs.snappy`
- 引っ張り中アイコン: `style transform` → `motion.div` + `animate.rotate`
  - 引っ張り量 × 3deg でリアルな回転感
  - 閾値到達で `scale: 1.15`（「離していいよ」のサイン）
  - 「引っ張って更新」テキストも opacity で閾値変化に連動
  - 引っ張り中は `duration: 0`（即時追従）、離した瞬間スプリングで戻る

### prefers-reduced-motion
既存の `useReducedMotion()` による制御を維持（page.tsx の `reduced` フラグ）。

### テスト
- TypeScript: エラー 0
- E2E: 37 passed（calendar.spec.ts の1件フレーキーは既存問題・単独実行で通過確認済み）

---

## セッション 30：Promise Moon（再会までの月の満ち欠け）

### 目的
再会までの日数を月の満ち欠けで詩的に表現。満月 = 再会の日。

### 変更ファイル
- `lib/moonPhase.ts`（新規）— フェーズ計算ロジック
- `components/PromiseMoon.tsx`（新規）— 月の SVG コンポーネント
- `app/(main)/page.tsx` — moonDaysLeft 計算 + PromiseMoon 組み込み

### 設計判断

**moonPhase.ts**
- 8段階のフェーズ（new → full → waning_crescent）
- daysLeft >= 0: 満ちていく（upcoming）
- daysLeft < 0: 欠けていく（帰った後）
- `getMoonPhaseLabel()` で aria-label 用英語表示名を提供

**PromiseMoon.tsx**
- SVG は常に `size × size`（28×28）で位置計算を単純に保つ
- `overflow="visible"` で満月のハローを SVG 外に描画 → ヒーローカードの `overflow:hidden` で適切にクリップ
- 満月のハローは 2 段階（opacity 0.08 → 0.16）、外側が呼吸アニメーション
- `useReducedMotion()` でハローアニメーションを無効化（iOS 設定対応）
- `clipPath` で月の明部を円形にクリップ
- 新規 DB クエリなし

**page.tsx への組み込み**
- `moonDaysLeft` を heroState から派生（新規 state/クエリなし）
  - upcoming → heroState.daysLeft（カウントダウン値を再利用）
  - together / last_day / departure_day → 0（満月）
  - no_meeting / anniversary → null（非表示）
- position: absolute, top:20px, left:20px に配置（軌道レイヤーの上・コンテンツの下）
- zIndex: 1 でコンテンツに隠れる装飾レイヤーとして機能
- loading 中は非表示（moonDaysLeft === null）

**フェーズ対応表**

| daysLeft | フェーズ | 見え方 |
|---|---|---|
| 28+ | new | 暗い円のみ（ほぼ見えない） |
| 21-27 | waxing_crescent | 右に細い三日月 |
| 14-20 | first_quarter | 右半分明るい |
| 7-13 | waxing_gibbous | ほぼ満月、左が少し欠け |
| 0-6 | full | 満月 + 光るハロー |
| -1 ~ -7 | waning_gibbous | 右が欠け始め |
| -8 ~ -14 | last_quarter | 左半分明るい |
| -15以下 | waning_crescent | 左に細い三日月 |

### パフォーマンス
- 静的 SVG（フェーズ計算は純粋関数、レンダリングごとに再計算）
- ハローアニメーションは満月時のみ（60fps で軽量）

### アクセシビリティ
- `role="img"` + `aria-label="Waxing Crescent — 21 days until next layover"`
- `prefers-reduced-motion` でハローアニメーション停止

### テスト
- TypeScript: エラー 0
- ESLint: 警告・エラー 0
- E2E: 37 passed

---

## セッション 29：ホームヒーロー軌道アニメーション + 英語統一

### 目的
ふたりの軌跡を生きた背景として可視化。ヒーローカードの文言を英語に統一。

### 変更ファイル
- `components/OrbitBackground.tsx`（新規）
- `app/(main)/page.tsx`

### 設計判断

**OrbitBackground.tsx**
- 同心円軌道（最大4つ）を SVG SMIL アニメーション（`animateTransform`）で実装
- 軌道数は `placesCount` に応じて自動決定（0-4: 1軌道 / 5-14: 2 / 15-29: 3 / 30+: 4）
- 回転速度: 内側から 60s / 90s / 120s / 160s（極めてゆっくり、電池消費最小）
- 回転方向: 順 / 逆 / 順 / 逆（交互）
- 衛星色: ブルー #7BB4FF / ピンク #FF9FB8 の交互
- 中央パルス: 4秒周期で opacity 0.5 ↔ 1
- `useReducedMotion()` で iOS「視差効果を減らす」設定に対応（静止表示）
- `aria-hidden="true"` で装飾要素として明示
- `daysTogether` を prop として受け取るが、現在は軌道計算に未使用（将来の拡張用）

**page.tsx への組み込み**
- ノイズテクスチャの直後・コンテンツの前に `position: absolute` で挿入（DOM順でコンテンツが上に来る）
- opacity: 0.65 に抑えてヒーロー数字を邪魔しない
- 既存のグラデーション・ノイズ（セッション22）は無変更
- 既存の AnimatedNumber・フォント設定（セッション20）は無変更

**英語統一（ヒーローカード内のみ）**
- ヘルパー関数を追加: `formatDateEn()`, `formatDateFullEn()`, `eventTypeLabelEn()`
- top row 日付: `M月d日(E)` → `May 27, Wed` 形式
- upcoming/departure_day の meeting date: 同上
- together state の end date: `〜 M月d日` → `until May 27, Wed`
- anniversary 表示: `yyyy年M月d日 から` → `since Apr 1, 2023`
- イベントタイプピル: `会う日` → `MEETING` 等
- カレンダー・リスト等の他画面は日本語のまま（`ja` locale は upcoming events card で継続使用）

### パフォーマンス
- 60〜160秒の極めて遅い回転のため GPU 負荷は最小
- 新規 DB クエリなし（`placesCount` は既存取得済み、`daysTogether` は anniversary から派生）

### テスト
- TypeScript: エラー 0
- E2E: 37 passed（変更前と同数）

---

## プロジェクト概要

- **アプリ名**: Layover（遠距離カップル向け共有 PWA）
- **フレームワーク**: Next.js App Router + Supabase + Tailwind CSS
- **対象端末**: iPhone（PWA）
- **主な画面構成**:
  - ホーム `app/(main)/page.tsx` — 次に会う日のカウントダウン、リストサマリー
  - カレンダー `app/(main)/calendar/page.tsx` — 予定管理、フライト情報
  - リスト `app/(main)/list/page.tsx` — 行きたい場所・やりたいこと・メディアリスト
  - 設定 `app/(main)/settings/page.tsx`
- **共通レイアウト**: `app/(main)/layout.tsx` + `components/BottomNav.tsx`

---

## セッション 1：バグ修正（FAB消失・todoリスト不具合）

### Bug ①③ — FAB と BottomNav が消える

#### 症状
- ホームから長押しクイックメニュー経由でリストタブに遷移すると、FAB（追加ボタン）と BottomNav（画面下部タブ）が消える
- リストタブで上から下にスクロールすると同様に消える

#### 根本原因

**① ページ遷移時**
`PageTransition` コンポーネントが `opacity: 0 → 1` のCSSアニメーション（`page-fade-in`）でラップしている。`position: fixed` の要素が `opacity < 1` の祖先の中にいると、ブラウザ仕様上その固定要素が透明になる。FABが `<PageTransition>` の内側にいたため、アニメーション中（280ms）に不可視になっていた。

**③ スクロール時**
iOS Safari のオーバースクロール（rubber-band）が `overflow-y: auto` な `main` 要素ごと `position: fixed` 要素を押し動かす現象。

#### 修正

**`app/(main)/list/page.tsx`**
```jsx
// Before: FAB が <PageTransition> 内部にあった
return (
  <PageTransition>
    ...
    <button className="fixed ...">追加</button>  {/* ← ここが問題 */}
  </PageTransition>
)

// After: FAB を <PageTransition> 外に移動
return (
  <>
    <PageTransition>
      ...
    </PageTransition>
    {/* FAB — PageTransition外に配置して opacity アニメーションの影響を受けない */}
    <button
      className="fixed right-4 z-30 ..."
      style={{ bottom: `calc(env(safe-area-inset-bottom) + 76px)` }}
    >
      追加
    </button>
  </>
)
```

**`app/(main)/layout.tsx`**
```jsx
// After: overscrollBehavior: 'contain' を追加
<main
  className="flex-1 overflow-y-auto"
  style={{
    minHeight: 0,
    paddingBottom: `calc(env(safe-area-inset-bottom) + 72px)`,
    paddingTop: 'env(safe-area-inset-top)',
    overscrollBehavior: 'contain',  // ← 追加
  }}
>
```

---

### Bug ② — やりたいことリストに追加されない

#### 症状
- リストタブでやりたいことを追加しても画面に反映されない
- 一時的に表示されても別タブに移動して戻ると消える
- ホーム画面のやりたいこと件数カウントが更新されない

#### 根本原因（3つ）

1. **Supabase `todos` テーブルが未作成**（またはRLSポリシーがなく INSERT が全て拒否されていた）
2. **Supabase エラー時のフォールバック処理がなかった** — insert 失敗でも何もせず、ローカルにも追加されない
3. **`reloadOnPartnerChange` に `if (!isPartner) return` があった** — 自分が追加した場合もカウント更新をスキップしていた

#### 修正

**`supabase/migrations/007_add_todos.sql`（新規作成）**
冪等なマイグレーション（`IF NOT EXISTS` / `DROP ... IF EXISTS`）で todos テーブルと RLS ポリシーを作成。

```sql
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
-- RLS + ポリシー + インデックス + トリガーも合わせて設定
```

**`app/(main)/list/page.tsx`** — `handleAddTodo` にフォールバック追加（`handleAddPlace` / `handleAddMedia` も同様）
```javascript
// After: Supabase エラーでもローカルに追加
const { data, error } = await db.from('todos').insert({ ... }).select().single()
if (!error && data) {
  setTodos(prev => [{ id: data.id, ... }, ...prev])
} else {
  // Supabase 失敗時もローカルに追加してUIを維持
  setTodos(prev => [{ id: Date.now().toString(), ... }, ...prev])
}
```

**`app/(main)/page.tsx`** — `reloadOnPartnerChange` の早期 return を削除
```javascript
// Before
const reloadOnPartnerChange = useCallback((isPartner: boolean, ...) => {
  if (!isPartner) return  // ← 自分の操作をスキップしていた
  haptic('light')
  load()
}, [load])

// After: 自分の変更でも load() を呼びカウントを更新
const reloadOnPartnerChange = useCallback((isPartner: boolean, ...) => {
  if (isPartner) {
    haptic('light')
    if (name && label) setToast(`...が追加されました`)
  }
  load()  // ← 常に実行
}, [load])
```

---

## セッション 2：フライト情報の表示改善・入力バグ修正

対象ファイル: `app/(main)/calendar/page.tsx`

### Bug ④ — フライト情報がカレンダー詳細でぎゅうぎゅうに表示される

#### 症状
カレンダータブで日付をタップして開く詳細シート（`BottomSheet`）に、フライトカードが詰め込まれて見づらい。

#### 根本原因
`StoredFlightCard`（フライト詳細カード）が `flex items-start justify-between` の中間に挿入されていた。この flex コンテナには「イベント情報（flex-1）」「フライトカード」「編集/削除ボタン」が横並びになっており、フライトカードが横幅を圧迫されていた。

```
[ イベント情報 (flex-1) ][ フライトカード ][ 編集・削除ボタン ]  ← 横に3つ並んでいた
```

#### 修正
`StoredFlightCard` を flex 外（カード下部）に移動し、全幅で表示するよう変更。

```
[ イベント情報 (flex-1) ][ 編集・削除ボタン ]  ← 上段（flex）
[         フライトカード（全幅）           ]  ← 下段（独立）
```

```jsx
// Before: flex内の中間に挟まっていた
<div className="flex items-start justify-between gap-2">
  <div className="flex-1">...</div>
  {/* フライト詳細 ← ここが問題 */}
  {flights.length > 0 && <div className="space-y-2 mt-2">...</div>}
  <div className="flex gap-1.5 flex-shrink-0">... 編集/削除 ...</div>
</div>

// After: flex外の下に独立配置
<div className="flex items-start justify-between gap-2">
  <div className="flex-1">...</div>
  <div className="flex gap-1.5 flex-shrink-0">... 編集/削除 ...</div>
</div>
{/* フライト詳細 — 全幅で下に展開 */}
{flights.length > 0 && (
  <div className="space-y-2 mt-3">...</div>
)}
```

---

### Bug ⑤ — フライト便名入力で誤った情報が入力される

#### 症状
フライト情報フォームで便名を入力すると、入力した値と異なる値が入ったり、別のフライト欄の値が混入することがある。

#### 根本原因
`FlightDraftFormSection` でドラフトのリストを render する際、`key={i}`（配列インデックス）を使用していた。

フライトを追加・削除すると配列インデックスがずれ、Reactが別のドラフトに対応するDOMノードを再利用する。controlled input のため `value` は正しく更新されるが、IME確定タイミングや内部的なカーソル位置が狂い、誤った値が混入する問題が発生。

```jsx
// Before: インデックスキーは危険
{drafts.map((draft, i) => (
  <FlightDraftItem key={i} .../>  // ← 追加/削除でキーがずれる
))}
```

#### 修正
`FlightDraft` 型に `_localId`（一意ID）を追加し、安定したキーとして使用。

```typescript
// FlightDraft 型に追加
interface FlightDraft {
  _localId: string   // React key用。新規は Date.now()+random、既存はDB ID
  id?: string        // 編集時のみ（DB の UUID）
  ...
}

// 新規ドラフト生成時
function emptyDraft(eventDate: string): FlightDraft {
  return {
    _localId: `${Date.now()}-${Math.random()}`,
    ...
  }
}

// 既存フライト編集時
_localId: f.id   // DB の UUID を安定キーとして使用

// render 時
{drafts.map((draft, i) => (
  <FlightDraftItem key={draft._localId} .../>  // ← 安定キー
))}
```

---

## 現在の重要な構造メモ

### `position: fixed` 要素の注意点
`opacity < 1` のアニメーション中の祖先要素の中に `position: fixed` を置くと、その要素も透明になる（ブラウザの containing block 仕様）。
- FAB は **必ず `<PageTransition>` の外** に配置すること
- `will-change: transform` や `transform` を持つ祖先も同様に containing block になる（`SwipeableListItem` は動的に transform を付与・除去して対応済み）

### iOS Safari overscroll
`overflow-y: auto/scroll` な要素でオーバースクロールすると `position: fixed` 要素が動く。`app/(main)/layout.tsx` の `main` に `overscrollBehavior: 'contain'` を設定済み。

### Supabase Realtime
`useRealtimeSync` フック（`hooks/useRealtimeSync.ts`）で events / places / media / todos テーブルの変更を購読。
todos テーブルのリアルタイム同期には Supabase Dashboard の `Database → Replication` で todos テーブルを有効化する必要あり（未確認）。

### todos テーブル
マイグレーション `supabase/migrations/007_add_todos.sql` で作成。Supabase 本番環境への適用は手動実行済み。

---

## セッション 3：リファクタリング — useCollection フック導入

対象ファイル: `hooks/useCollection.ts`（新規）、`app/(main)/list/page.tsx`

### 目的
`handleAddPlace` / `handleAddTodo` / `handleAddMedia` に存在した
「Supabase insert → 成功時 state 追加 → 失敗時ローカルフォールバック」の
重複パターンを統一化し、将来の修正を1箇所で完結させる。

### 設計判断

**なぜ `useCollection` をシンプルに保ったか**
- ハプティックはフック内に入れない → toggle（`haptic('light')`）と add/delete（`haptic('success'/'warning')`）で異なる種類が必要。フック内に入れると呼び出し側との二重発火を防げない
- rollback（楽観的更新の取り消し）は実装しない → 既存コードに rollback がなく、追加は要求スコープ外
- `coupleId` / `myId` は null 許容 → load() 完了まで null のため、null チェックをフック内で行う

**`updateItem` の null → undefined 変換**
DB には `memo: null`（カラムクリア）を送るが、ローカル state は `memo?: string`（undefined）。
フック内で `Object.entries` + `v === null ? undefined : v` に統一することで、
各 update 関数の `memo: newMemo || null` + `memo: newMemo || undefined` の二重管理を解消。

**Realtime との整合性**
- `addItem` 成功時: DB UUID を id にした item を state に追加 → Realtime `onInsert` が届いた時点で `prev.some(x => x.id === data.id)` が true → 重複なし ✓
- `setItems` を公開 → `load()` の初期ロードと Realtime `onInsert/onUpdate` から直接 state 操作が可能

### 実装内容

**新規: `hooks/useCollection.ts`（約90行）**
```typescript
export function useCollection<T extends { id: string }>(
  table: 'places' | 'media' | 'todos',
  coupleId: string | null,
  myId: string | null,
): {
  items: T[]
  setItems: Dispatch<SetStateAction<T[]>>
  addItem(dbPayload, localItem): Promise<void>   // insert + フォールバック
  updateItem(id, updates): Promise<void>         // 楽観的更新 + null→undefined変換
  deleteItem(id): Promise<void>                  // 楽観的削除
}
```

**変更: `app/(main)/list/page.tsx`**

```typescript
// Before: 3x useState + 12 個の個別ハンドラ（handleAdd* × 3、handleUpdate* × 3、
//         toggle* × 3、delete* × 3）それぞれに createClient 動的 import を含む

// After: useCollection × 3 に集約
const { items: places, setItems: setPlaces, addItem: addPlaceItem,
        updateItem: updatePlaceItem, deleteItem: deletePlaceItem } =
  useCollection<Place>('places', coupleId, myId)

// 追加ハンドラ（1例）
async function handleAddPlace() {
  if (!newName) return
  await addPlaceItem(
    { name: newName, category: ..., memo: newMemo || null, ... },  // DB payload
    { id: Date.now().toString(), name: newName, memo: newMemo || undefined, ... },  // local fallback
  )
  haptic('success')
  resetForm(); setShowSheet(false)
}

// トグル（1例）
async function togglePlaceVisited(id: string) {
  haptic('light')
  const place = places.find(p => p.id === id)
  if (!place) return
  await updatePlaceItem(id, { is_visited: !place.is_visited })
}

// 削除（1例）
async function deletePlace(id: string) {
  haptic('warning')
  await deletePlaceItem(id)
}
```

### Before / After コード量比較

| ファイル | Before | After | 差分 |
|---|---|---|---|
| `app/(main)/list/page.tsx` | 961行 | 828行 | **-133行** |
| `hooks/useCollection.ts` | 0行（新規） | 90行 | +90行 |
| **合計** | **961行** | **918行** | **-43行** |

削減した内容：`createClient` の動的 import × 12箇所、
`if (process.env.NEXT_PUBLIC_SUPABASE_URL && myId && coupleId)` ガード × 3箇所、
Supabase エラー時のフォールバック構造 × 3箇所。

---

## セッション 4：TanStack Query 導入の検討 → 見送り

### 検討内容
全画面のデータ層を TanStack Query (React Query) で統一する提案。

### 見送り理由
以下の技術的問題と費用対効果の観点から、現時点では導入しないことを決定。

1. **`import { db } from '@/lib/supabase'` が存在しない** — 実際のコードは Next.js App Router の Cookie 管理のため `createClient()` を毎回動的 import する設計。静的シングルトンへの書き換えには別途検討が必要。
2. **Realtime との相性が悪い** — 提案の `invalidateQueries` では Realtime イベントのたびにテーブル全件再フェッチが発生し、現在の直接 state 更新（ネットワーク 0 回）より UX が悪化する。`queryClient.setQueryData` で直接パッチすれば解決するが、その場合は `useCollection` と構造が同じになる。
3. **現アプリ規模では費用対効果が低い** — 1 画面 1 データセット構造のため、ページ間キャッシュ共有のメリットは限定的。Realtime Sync で既にリアルタイム反映が実現されている。
4. **変更規模が大きい** — 全ページ・全フックを書き換えるリスクに対し、得られる恩恵が少ない。

### 現状維持の根拠
`useCollection` フック（セッション 3 で導入）+ Supabase Realtime の直接 state 更新という構成が、このアプリの要件（リアルタイム性・シンプルさ・小規模）に適している。

---

## セッション 5：グローバルエラーハンドリング機構の導入

### 目的
各ページに分散していたエラー表示（`try-catch` + ローカル `setToast`）を廃止し、
統一されたエラー分類・表示の仕組みをアプリ全体に導入する。

### 新規作成ファイル

**`lib/errors.ts`**
- `AppError` クラス（`code: ErrorCode` + `cause` 保持）
- `normalizeError(error: unknown): AppError` — Supabase の `{ data, error }` オブジェクト・Error インスタンス・不明値をすべて AppError に変換
  - 401 / JWT / session expired → `AUTH_REQUIRED`
  - 403 / RLS / permission → `PERMISSION_DENIED`
  - 404 / not found → `NOT_FOUND`
  - fetch / network → `NETWORK_ERROR`
  - 5xx → `SERVER_ERROR`
- `getUserMessage(error: AppError): string` — ErrorCode → 日本語ユーザーメッセージ

**`components/ToastProvider.tsx`**
- Context ベースのグローバルトーストプロバイダー
- `ToastVariant: 'default' | 'success' | 'error' | 'warning'`
- `showToast(message, { variant? })` で呼び出し
- framer-motion の AnimatePresence で複数トーストをスタック表示（3秒で自動消去）
- `position: fixed` をルートレイアウト直下に配置 → opacity アニメーション問題を回避
- `top: calc(env(safe-area-inset-top) + 12px)` で既存 Toast.tsx と同一ポジション

**`hooks/useErrorHandler.ts`**
- `useErrorHandler()` フック — `(error: unknown) => void` を返す
- `AUTH_REQUIRED` → error トースト + `/auth/login` へリダイレクト
- `NETWORK_ERROR` → warning トースト
- その他 → error トースト
- 開発時のみ `console.error` でデバッグ出力

**`app/error.tsx`**
- Next.js App Router のルートエラー境界
- アプリのデザイン言語（`#FAF5EE` 背景、`#1A1A1A` ボタン）に統一
- 「問題が発生しました」+ 再試行ボタン

### 変更ファイル

**`app/layout.tsx`**
- `<ToastProvider>` でルート全体をラップ
- クライアントコンポーネントを Server Component の子として配置（Next.js App Router の仕様上安全）

**`hooks/useCollection.ts`**
- `useToast()` を追加
- `addItem` でSupabase insert に失敗した場合、`showToast('保存できませんでした', { variant: 'error' })` を表示

**`app/(main)/page.tsx` / `app/(main)/calendar/page.tsx` / `app/(main)/list/page.tsx`**
- `import { Toast } from '@/components/Toast'` を `import { useToast } from '@/components/ToastProvider'` に置き換え
- `const [toast, setToast] = useState<string | null>(null)` を削除
- `const { showToast } = useToast()` を追加
- `setToast('...')` → `showToast('...')` に置き換え
- `<Toast message={toast} onDismiss={...} />` の JSX を削除

### 旧 `components/Toast.tsx` について
既存の `Toast.tsx` は残存（他箇所で参照がある可能性）。ただし3ページでの使用はすべて `useToast()` に移行済み。

---

## セッション 6：オフライン対応（検知 + バナー表示 + SW 改善）

### 目的
飛行機・地下鉄・海外ローミングなどネットワーク不安定時でもアプリが使えるよう改善。

### 検討・見送りの経緯
ユーザー提案には TanStack Query を使った Steps 3/4/5/6（persistQueryClient、mutationQueue、useAutoSync、useMutation）が含まれていたが、以下の理由でセッション4の決定（TanStack Query 見送り）を維持し、Steps 1/2/7 のみ実装した。
- TanStack Query は package.json に存在しない（セッション4で導入見送りを決定済み）
- Step 4 の `processQueue` が使う `db` シングルトンはこのコードベースに存在しない
- `public/sw.js` はすでに存在しており next-pwa 導入は不要

### 新規作成ファイル

**`hooks/useOnlineStatus.ts`**
- `navigator.onLine` の初期値取得 + `online/offline` イベント購読
- SSR では `true` を返す（`useEffect` 前はサーバー側とみなす）

**`components/OfflineBanner.tsx`**
- `useOnlineStatus()` でオフライン時のみ framer-motion で上からスライドインするバナー
- スタイルは既存デザイン言語（`#1A1A1A` 背景 / `#FFFFFF` テキスト）
- `paddingTop: calc(env(safe-area-inset-top) + 8px)` で iOS セーフエリア対応
- `z-[60]`（ToastProvider の `z-50` より上）で確実に前面表示
- `position: fixed` のため **ルートレイアウト直下（`<ToastProvider>` 内の先頭）** に配置
  → `opacity` アニメーション中の祖先（`PageTransition` 等）の外になるため透明化を回避（CLAUDE_CHANGES.md の既知問題）

### 変更ファイル

**`app/layout.tsx`**
- `OfflineBanner` を `import` して `<ToastProvider>` 内の先頭に挿入

**`public/sw.js`**（`layover-v1` → `layover-v2`）
- キャッシュを2種類に分離
  - `layover-v2`（ナビゲーション・その他）: ネットワークファースト、失敗時にキャッシュへフォールバック
  - `layover-static-v2`（`/_next/static/` のJS・CSSchunk）: キャッシュファースト
- Next.js の静的チャンクはファイル名にコンテンツハッシュがあるため、キャッシュファーストが安全かつ高効率
- Supabase API・`/api/` は引き続き SW を素通り（キャッシュしない）
- activate 時に `layover-v1` 含む旧キャッシュを自動削除

### 動作

| 状況 | 挙動 |
|---|---|
| オフライン検知 | バナーが画面上部にスライドイン表示 |
| オンライン復帰 | バナーがスライドアウトで消える |
| オフラインでアプリ起動 | SW のキャッシュから JS・CSS を配信、UI が表示される |
| オフラインでページ遷移 | SW がキャッシュ済みナビゲーションを返す、なければ `/` へフォールバック |
| Supabase API | オフライン中はエラー。`useErrorHandler` の `NETWORK_ERROR` で warning トーストが出る（セッション5の機構を活用） |

### 見送った機能（将来の検討候補）
- ミューテーションキュー（オフライン中の追加操作を LocalStorage に蓄積してオンライン復帰後に同期）
  → `useCollection` の `addItem` に統合する形なら TanStack Query 不要で実装可能

---

## セッション 7：オンライン復帰時の自動データ再取得

### 目的
ユーザー提案「ローカルキャッシュとサーバーデータの整合性を保つ機構」の実現。

### 設計判断（提案の大部分を見送った理由）
提案の `integrityChecker.ts` / `useIntegrityCheck.ts` は以下を前提としていたが、いずれも存在しない。
- `import { db } from '@/lib/supabase'`（静的シングルトン）
- `useQueryClient()` / `queryClient.getQueryData()`（TanStack Query。セッション4で見送り）
- `mutationQueue`（セッション6でオプションBとしてスキップ）
- 永続化された「ローカルキャッシュ」（現構成では各ページの `useState` で管理、ページ離脱で消える）

現アーキテクチャでは「ローカルにあってサーバーにない」データが長期残り続ける仕組みがないため、本格的な整合性チェックの必要がない。実際に起きうる唯一の問題は「オフライン中にパートナーが行った操作を、Realtime が途切れていたため見逃す」ケースのみ。これは `load()` 再実行で解決できる。

### 実装内容

**新規: `hooks/useAutoRefresh.ts`**
```typescript
export function useAutoRefresh(load: () => void) {
  const isOnline = useOnlineStatus()
  const prevOnlineRef = useRef(isOnline)

  useEffect(() => {
    // offline → online の遷移のみ検知（初回マウント・online → offline は無視）
    if (isOnline && !prevOnlineRef.current) {
      load()
    }
    prevOnlineRef.current = isOnline
  }, [isOnline, load])
}
```

**変更: 3ページ（home / calendar / list）**
- `import { useAutoRefresh } from '@/hooks/useAutoRefresh'` を追加
- 既存の `useEffect(() => { load() }, [load])` の直後に `useAutoRefresh(load)` を1行追加

### 動作
| 状況 | 挙動 |
|---|---|
| 通常起動（オンライン） | 既存の `useEffect` で `load()` が実行され、`prevOnlineRef = true` のままなので `useAutoRefresh` は何もしない |
| オフラインで起動 | `useOnlineStatus` が `false` を設定 → `prevOnlineRef = false`。`useAutoRefresh` は `load()` を呼ばない（Supabase に繋がらないため無意味） |
| オンライン復帰 | `isOnline: false → true`。`prevOnlineRef = false` なので条件が成立 → `load()` 自動実行 |

---

## セッション 8：ヒーローエリア動的化 + カレンダー情報密度向上

### Phase C-1：ヒーローエリア動的化（`app/(main)/page.tsx`）

#### 目的
ホーム画面のヒーローカードを「あと◯日」固定表示から、状況に応じた6種類の表示に切り替える。

#### 設計判断
- ロジックを `lib/heroState.ts` に分離し、型安全な discriminated union (`HeroState`) で状態を定義
- `en_route`（飛行中）は分レベルの精度と1分間隔の再計算が必要なため見送り
- `departure_day`（出発日・出発前）は既存の `nextFlight` データを流用
- `together`（一緒にいる期間）のための `currentEvent` は、`event_date < today` かつ `end_date >= today` の visit/trip を新規クエリで取得
- 記念日チェックは月日一致（毎月ではなく、記念日後の毎年同日）

#### 実装内容

**新規: `lib/heroState.ts`**
- `HeroEvent`, `HeroFlight` インタフェース
- `HeroState` 判別共用体（`no_meeting` / `upcoming` / `departure_day` / `together` / `last_day` / `anniversary`）
- `calculateHeroState()` 関数：優先度順（記念日 → 進行中 → 出発日 → 未来予定 → 予定なし）

**変更: `app/(main)/page.tsx`**
- `calculateHeroState` / `HeroFlight` インポート追加
- `nextFlightData: HeroFlight | null`、`currentEvent: HomeEvent | null` state 追加
- `load()` にフライト構造化データ保存と currentEvent クエリを追加
- `differenceInDays` インポート削除（`daysUntilMeeting` 廃止に伴い不要）
- `void couple` リントハック削除（`couple` を `calculateHeroState` に渡すため不要）
- ヒーロー中央セクション: heroState.kind で6状態を切り替えるレンダリングに置換
- ヒーロー下部セクション: 状態別フッター（together→イベント名+終了日、last_day→イベント名、anniversary→記念日から、upcoming/departure_day→既存の日付+種別ピル+フライト）

#### 状態別表示
| 状態 | 中央表示 | 下部フッター |
|---|---|---|
| `no_meeting` | "Let's plan our next meet" | なし |
| `anniversary` | ★ N ★ / months together | 記念日 yyyy年M月d日 から |
| `departure_day` | Plane + "TODAY ✈" / Have a safe flight | 日付 + 種別ピル + フライト |
| `together` | "Together Now" / N days left | イベント名 〜 終了日 |
| `last_day` | "See You Soon" / Today is our last day | イベント名 |
| `upcoming` daysLeft=0 | Plane + "Today!" | 日付 + 種別ピル + フライト |
| `upcoming` daysLeft>0 | N days（大数字） | 日付 + 種別ピル + フライト |

---

### Phase C-2：カレンダー情報密度向上（`app/(main)/calendar/page.tsx`）

#### 目的
カレンダーセルとレジェンドにフライト情報を可視化し、月サマリーを追加。

#### 設計判断
- 長押しプレビューは `useSwipeable`（月スワイプ）と競合するため見送り
- フライトアイコンはセル右上に 8px の小アイコン（目立ちすぎず存在を示す程度）
- 月サマリーはシンプルに「visit/trip 件数」と「次のイベント日」のみ（複雑な統計は不要）
- 月サマリーは visit/trip が0件かつ次イベントがない月は非表示

#### 実装内容
- **レジェンドに ✈ フライト追加**: 既存の `eventTypeConfig` ループの後に `Plane` アイコン + "フライト" テキスト
- **セルのフライトアイコン**: `hasFlights = dayEvents.some(e => (flightsByEventId[e.id]?.length ?? 0) > 0)` を計算し、`true` の場合に `position: absolute; top: 2; right: 4` に `Plane size={8}` を表示
- **月サマリー**: レジェンドとカレンダーグリッドの間に IIFE で描画。当月の visit/trip 件数と、今日以降の次イベント日（当月内のみ）を表示

---

## セッション 9：カレンダー日付セルの情報密度向上（続き）

### 目的
各日付セルに「会う期間の帯」「記念日スター」を追加し、月サマリーをより詳細な表示に改善する。

### 設計判断
- **範囲帯の背景** — `position: absolute` の div を button の最初の子に配置。`top: 0 / bottom: 0` でセル全高を覆い、`start` は右半分・`mid` は全幅・`end` は左半分にする。セル選択中（`isSelected`）は選択ハイライト優先のため非表示。visit/trip のみ対象（online / anniversary / personal の複数日イベントには不適用）
- **記念日スター** — Unicode `★` をセル左上に絶対配置。`top: 2, left: 3`。フライトアイコン（右上）と重ならないよう反対側に配置
- **月サマリー文言** — 「次の会う日」に終了日と「あとN日」を追加。今日の場合は紫色で「今日」表示。`differenceInDays(nextStart, today0)` で計算（`today0` = 時刻なしの今日）
- **長押しプレビュー** — `useSwipeable`（月スワイプ）が touchイベントを横取りするため今回も見送り

### 実装内容（`app/(main)/calendar/page.tsx`）

**date-fns import 追加**
- `differenceInDays` を追加（月サマリーの「あとN日」計算用）

**月サマリー改善**
- 表示: `この月: N件の会う日 | 次: M/d(E) 〜 M/d(E) · あとN日`
- 終了日がある場合は `〜 M/d(E)` を追記
- `daysLeft > 0` → `· あとN日`（グレー）
- `daysLeft === 0` → `· 今日`（紫 `#6D5BD0`）
- `parseDateStr()` を使って日付を正規化（iOS Safari の `new Date('YYYY-MM-DD')` UTC解釈対策）

**セル — 範囲帯背景**
- `const primaryRange` : rangeEvents の中から visit/trip の最初の1件を取得
- `const rangePos` : `getRangePos()` で start/mid/end を判定
- `!isSelected && primaryRange && rangePos !== 'single'` の場合のみ描画
- 不透明度 0.13、`borderRadius` は start→左丸、end→右丸、mid→なし

**セル — 記念日スター**
- `const hasAnniversary` : `dayEvents.some(e => e.type === 'anniversary')`
- `★` テキスト（7px, `#C4963A` = 金色）をセル左上 `top: 2, left: 3` に絶対配置
- `aria-hidden` 付与（スクリーンリーダー向け）

### 影響確認
- 既存のレンジバー（セル下部の横線）はそのまま残存。帯背景と二重に表示されるが情報が重複するだけで視覚的に問題なし
- 選択状態（`isSelected`）のセルでは帯背景を非表示にするため、選択ハイライトが帯に埋もれない
- フライトアイコン（右上）と記念日スター（左上）は配置が分かれており衝突なし

---

## セッション 10：リストページ グループ表示機能追加

### 目的
リストページ（places / media / todos 各タブ）に「すべて / カテゴリ / 追加者」の3種類グループ切り替えUIを追加し、グループ単位の折りたたみを実現する。

### 設計判断
- **ステータスグループは不要** — 既存のリストが未完了/訪問済みで分かれているため、グループ化の追加は冗長
- **ソート機能は見送り** — 要求スコープ外
- **長押しプレビューは見送り** — `useSwipeable` との競合（セッション8・9と同じ判断）
- `groupBy` 状態を `localStorage` に永続化（キー: `'listGroupBy'`）
- `collapsed`（折りたたみ状態）はタブ切り替え・グループ変更時にリセット
- `computeGroups<T>` を汎用関数として実装（places/media/todos 共通）
- **addedBy の並び順**: me → partner → both（`ownerOrder` テーブルで制御）

### バグ修正（実装直後に発見）
- **`collapsed` がタブをまたいで共有される問題**: `'me'` / `'partner'` / `'both'` などのグループキーが3タブ共通のため、Places タブで「わたし」を折りたたむと Media タブの「わたし」も折りたたまれる状態になっていた。`useEffect` を追加して `tab` 変更時に `setCollapsed(new Set())` を呼ぶことで修正。

### 実装内容（`app/(main)/list/page.tsx`）

**新規 import**
- `ChevronDown` (lucide-react)

**新規 state・型**
```typescript
type GroupBy = 'none' | 'category' | 'addedBy'
const [groupBy, setGroupBy] = useState<GroupBy>(() => { /* localStorage 復元 */ })
const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
```

**新規 useEffect**
```typescript
// localStorage 永続化
useEffect(() => { try { localStorage.setItem('listGroupBy', groupBy) } catch {} }, [groupBy])
// タブ切り替え時にリセット（バグ修正）
useEffect(() => { setCollapsed(new Set()) }, [tab])
```

**新規関数**
- `toggleCollapsed(key: string)` — Set を immutable に更新
- `computeGroups<T extends { owner: Owner }>(items, getCategoryKey)` — Map で集約 → addedBy 時はオーナー順にソート

**グループ選択UI**
- タブ切り替えの直下に `すべて / カテゴリ / 追加者` ボタン3つ
- 選択中: `#1A1A1A` 背景 + `#FFFFFF` テキスト / 非選択: `#F5F5F3` 背景 + `#737373` テキスト

**各タブのレンダリング変更**
- `groupBy === 'none'` → 既存の表示（未訪問/訪問済みなど）をそのまま維持
- `groupBy !== 'none'` + アイテム0件 → 既存の空状態表示
- `groupBy !== 'none'` + アイテムあり → `computeGroups()` でグループ分け → `<section>` 単位で折りたたみUI
  - グループヘッダー: ラベル（左）+ 件数 + ChevronDown（右）
  - ChevronDown は collapsed 時 `rotate(-90deg)`、展開時 `rotate(0deg)`（0.2s transition）

**グループキー**
| タブ | category キー | addedBy キー |
|---|---|---|
| places | `p.category \|\| 'その他'` | `p.owner` |
| media | `mediaTypeConfig[m.media_type].label` | `m.owner` |
| todos | `t.category \|\| 'その他'` | `t.owner` |

---

## セッション 11：インサイトページ新規追加

### 目的
新規 `/insights` ページを追加し、ふたりの活動統計（行きたい場所達成率・観た映画リスト）を可視化する。

### 新規作成ファイル

**`app/(main)/insights/page.tsx`**
- `'use client'` + `<Suspense>` + `<PageTransition>` + `<PullToRefresh>` + `useAutoRefresh` の標準パターン
- Supabase URL がない場合はモックデータを使用（開発環境対応）
- Supabase 接続時は `places` と `media` テーブルから couple_id で絞り込んで取得

**行きたい場所達成率カード（Places Completion）**
- 全体達成率（%）を大数字で表示
- framer-motion で右方向にアニメーションするプログレスバー（グラデーション）
- カテゴリ別内訳: Map で集計 → 件数多い順ソート → 小バーで訪問率を表示
- 空状態: "まだ場所が登録されていません" + `/list` へのリンク

**観た映画カード（Movies Together）**
- `media_type === 'movie'` かつ `is_done === true` の件数・リストを表示
- 最大10件を番号付きリストで表示、10件超は `/list?tab=media` へのリンク
- 未観賞のみの場合: "まだ一緒に観た映画はありません"
- 空状態: "まだ映画が登録されていません" + `/list?tab=media` へのリンク
- ポスタープレースホルダー（Film アイコン）で統一

**スケルトン・ローディング**
- 各カードにスケルトン（`.skeleton` クラス）表示あり

### 変更ファイル

**`app/(main)/page.tsx`**
- Stats row（3枚カード）の下に小さな「インサイト →」リンクを追加（`/insights` へ遷移）

### 設計判断
- `usePlaces` / `useMedia` フックは存在しないため、他のページと同様に直接 Supabase フェッチ
- `m.watched_at` は存在しないため、`is_done === true` で観賞済みを判定
- 画像URL（`image_url`）は存在しないため、常に Film アイコンのプレースホルダーを使用
- BottomNav は5タブ制限のため、ホーム画面からのテキストリンクで遷移

---

## セッション 12：地図ページ新規追加（ふたりの軌跡マップ）

### 目的
places テーブルの場所を地図上にピン表示し、ふたりの行きたい場所・訪れた場所を可視化する。

### 設計判断

**地図ライブラリ**
- Leaflet + react-leaflet（完全無料・OSS）を採用
- タイルは Carto Light（OpenStreetMap データ、無料）
- Leaflet は `window` 必須のため、`dynamic(() => import(...), { ssr: false })` でラップ
- Leaflet デフォルトマーカーは webpack/Turbopack でアイコン画像が壊れるため `L.divIcon` で独自マーカー

**ナビゲーション**
- BottomNav は5タブ満杯のため `/list` ページの「行きたい場所」タブヘッダーに「地図で見る →」リンクを追加

**ジオコーディング**
- Nominatim API（OpenStreetMap の無料ジオコーディングサービス）
- 場所追加時に自動で座標取得（失敗しても場所の追加は続行）
- `handleAddPlace` は `geocoding` state で全体をガード（ジオコーディング + DB insert の間ボタンを disabled）
- 設定画面に「座標データを更新する」ボタンで既存場所の一括バックフィル（1.1秒待機 / リクエスト）

**マップページの高さ管理**
- ページコンテナ: `height: calc(100dvh - safe-area-top - safe-area-bottom - 72px)`（BottomNav 分）
- ヘッダー: 48px（flex-shrink: 0）
- マップエリア: `flex: 1; min-height: 0` → PlacesMap に `height="100%"` を渡す

### 新規作成ファイル

**`supabase/migrations/008_add_place_coords.sql`**
```sql
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION;
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
```

**`lib/geocoding.ts`**
- Nominatim API で地名→緯度経度変換
- 失敗時は `null` を返す（例外を握りつぶす）

**`components/PlacesMap.tsx`**
- `'use client'`、Leaflet CSS import
- `PlacePin` 型を export（map/page.tsx と共有）
- 訪問済み: `#4A7C59`（緑）、行きたい: `#6D5BD0`（紫）の divIcon
- Popup: 場所名・カテゴリ・ステータス
- 中心: 場所の重心、データなし時は日本中央（36.2048, 138.2529）

**`app/(main)/map/page.tsx`**
- `'use client'` + `<Suspense>` パターン
- PlacesMap を `dynamic({ ssr: false })` でロード
- フィルターピル（すべて / 訪問済み / 行きたい）: `position: absolute` on `z-index: 1000`
- 凡例: `position: absolute` on `z-index: 1000`
- 空状態: 座標なし場所のみの場合にリストへのリンク表示

### 変更ファイル

**`app/(main)/list/page.tsx`**
- `Place` 型に `latitude?: number; longitude?: number` 追加
- `load()` の `.select()` に `latitude, longitude` 追加
- `toPlace()` Realtime マッパーに lat/lon 追加
- `handleAddPlace`: ジオコーディング → DB insert を `geocoding` state でラップ（finally で必ず false に戻す）
- 場所タブ冒頭に「地図で見る →」リンク追加
- `import Link from 'next/link'` 追加

**`app/(main)/settings/page.tsx`**
- `MapPin` アイコン追加
- `handleBackfill` 関数: 座標のない場所を全取得 → Nominatim でジオコーディング → DB 更新
- 「地図データ」カード: バックフィルボタン + 進捗表示（coupleId がある場合のみ表示）

---

---

## セッション 13：ジオコーディング精度向上 + 位置確認UI + 手動位置指定

### 症状（実データで判明した問題）

```json
{ "name": "熊本旅行", "latitude": 22.649, "longitude": 120.339 }  // 台湾の座標（誤り）
{ "name": "ハワイ旅行", "latitude": null, "longitude": null }       // 取得失敗
```

「旅行」「デート」などの一般語を含む名前で登録すると、Nominatim がノイズ語を地名と解釈して誤った国・地域の座標を返す。
また「ハワイ旅行」のように実在しない地名になった場合は null が返る。

### 根本原因

1. Nominatim は地名専用検索 API のため「旅行」「デート」などのノイズ語が混入すると大幅に精度が下がる
2. 日本語クエリ + 日本以外がヒットした場合の信頼度チェックがなかった
3. 失敗時のリトライ処理がなかった

### 修正内容

**`lib/geocoding.ts` — 完全書き換え**
- 戻り値の型を `{ lat, lon }` から `GeocodeResult { lat, lon, displayName }` に変更
- `cleanQuery(query)`: NOISE_WORDS（「旅行」「デート」「trip」等 17語）をクエリから除去
- `searchNominatim(query)`: `limit=5` / `addressdetails=1` / `accept-language: ja` で取得
- `scoreResults()`: 日本語クエリかつ海外キーワードなし → 日本国内に +2.0 加点。海外キーワードあり → 海外に +0.5。日本語なのに海外ヒット → -0.5
- `isLowConfidence()`: importance < 0.3、または日本語クエリで日本以外がヒットした場合に低信頼度判定
- `geocode()`: 3段階リトライ（元クエリ → ノイズ除去クエリ → 先頭単語）。各リトライ間は 1.1s 待機（レート制限遵守）

**`components/PlacesMap.tsx`**
- `zoom?: number`（デフォルト 5）prop 追加
- `editable?: boolean` / `onMapClick?: (lat, lon) => void` prop 追加
- `useMapEvents` を使った `ClickHandler` コンポーネントを追加

**`hooks/useCollection.ts`**
- `addItem` の戻り値を `Promise<void>` → `Promise<string>` に変更（追加した item の ID を返す）
- DB insert 成功時は `data.id`、フォールバック時は `localItem.id` を返す
- 既存の呼び出し元（handleAddTodo / handleAddMedia）は戻り値を無視するため影響なし

**`app/(main)/list/page.tsx`**
- `dynamic(() => import('@/components/PlacesMap'), { ssr: false })` を追加
- 新 state: `confirmingPlace` / `manualCoords` / `showMapPicker` / `mapPickerCoords`
- `resetForm()` に `setManualCoords(null)` を追加
- `handleAddPlace()`:
  - `manualCoords` がある場合はジオコーディングをスキップしてそれを使用
  - `addPlaceItem` の戻り値（ID）を `newId` でキャプチャ
  - 座標取得成功 → `setConfirmingPlace(...)` で確認モーダル表示
  - 座標取得失敗 → Toast で案内
- 場所追加フォームに「地図で位置を指定（任意）」ボタンを追加
  - タップ → `showMapPicker = true` でマップピッカーオーバーレイ表示
  - 指定済みの場合は緑色のバッジで座標を表示 + クリアボタン
- 位置確認BottomSheet: ミニマップ（zoom=10）+ 住所表示 + 「この場所でOK」/「違う」ボタン
  - 「違う」→ `updatePlaceItem(id, { latitude: null, longitude: null })` で座標クリア
- マップピッカーオーバーレイ（`position: fixed`, `z-index: 60`）:
  - `PageTransition` 外に配置（opacity アニメーション問題を回避）
  - `PlacesMapDynamic` を `editable` モードで表示、タップで `mapPickerCoords` を更新
  - 「この位置を使う」→ `setManualCoords(mapPickerCoords)` してオーバーレイを閉じる

**`app/(main)/settings/page.tsx`**
- `handleRefreshAllCoordinates()`: 座標の有無にかかわらず全場所を再ジオコーディング。誤判定データをクリアしてから正しい座標を取得
- 「地図データ」カードに「すべての座標を再取得（誤判定修正）」ボタンを追加（金色スタイルで既存ボタンと区別）

### 動作フロー

「熊本旅行」登録時:
1. Step 1: 「熊本旅行」で検索 → 台湾ヒット、importance 低 → isLowConfidence = true
2. Step 2: 「熊本」で再検索（「旅行」除去）→ 熊本県ヒット → jp に +2.0 加点 → 最優先
3. 追加完了後、確認モーダル表示 → ユーザーが地図で確認 → OK or 違う

「ハワイ旅行」登録時:
1. Step 1: 「ハワイ旅行」で検索 → null
2. Step 2: 「ハワイ」で再検索 → Hawaii ヒット → 海外KW「ハワイ」検出 → 加点
3. 確認モーダルでハワイの地図表示

---

---

## セッション 12：Playwright E2E テスト環境構築

### 概要

デモモード（Supabase 未設定）で動作する E2E テストを Playwright で整備した。全 19 テスト通過。

### 変更ファイル

**`proxy.ts`（旧 `middleware.ts` を改名・拡張）**
- Next.js 16.2.6 の新規約に従い `middleware.ts` → `proxy.ts` に移行
- `E2E_TEST=true` 環境変数が設定されている場合、認証チェックをスキップするバイパスを追加

**`app/(main)/page.tsx`**
- ヒーローカード `<motion.div>` に `data-testid="hero"` を追加

**`app/(main)/calendar/page.tsx`**
- FAB ボタンに `data-testid="fab-add"` を追加

**`app/(main)/list/page.tsx`**
- FAB ボタンに `data-testid="fab-add"` を追加

**`playwright.config.ts`（新規）**
- ポート 3099 を使用（既存 dev サーバー 3000 と競合しないため）
- システム Chrome を使用（別途 Chromium DL 不要）
- `E2E_TEST=true` を webServer 環境変数に設定
- テストタイムアウト 60 秒（マップタイル取得に時間がかかるため）

**`tests/smoke.spec.ts`（新規）**
- アプリ起動・ページ遷移・BottomNav の基本動作確認（5 テスト）

**`tests/home.spec.ts`（新規）**
- ヒーローカード表示・テキスト・カレンダー遷移（4 テスト）

**`tests/calendar.spec.ts`（新規）**
- カレンダーグリッド・FAB・イベント追加・月切り替え（5 テスト）
- 月ラベルは `'yyyy年 M月'`（年と月の間にスペースあり）なので `h1` ロケーターで確認
- `waitForLoadState('load')` を使用（`networkidle` だとマップタイルで永遠に待機するため）

**`tests/list.spec.ts`（新規）**
- タブ切り替え・FAB・場所追加・やりたいこと追加（5 テスト）
- タブ名は「行きたい場所」「観たい・聴きたい」「やりたいこと」
- 「場所を追加」シートは `getByRole('heading', { name: '場所を追加' })` で特定（空状態テキストと重複するため）

### 注意事項

- テスト実行前に古い dev サーバー（ポート 3099）が残っている場合は kill が必要
  - 残留サーバーはルートのみ応答し他ルートが 404 になる症状が出る
- `npm test` で全テスト実行可能（`playwright test`）

---

---

## セッション 14：安定性監査（Phase S-1）

### 監査の目的

運用安定性向上に向けた現状把握。改修前のベースライン確認と潜在的問題のリストアップ。

### 主要な発見

**バグ修正（1件）**
- `lib/geocoding.ts`: Supabase 未設定（デモモード）でも Nominatim を呼び出していた
  - → `!process.env.NEXT_PUBLIC_SUPABASE_URL` の場合はスキップするよう1行追加
  - これにより E2E テスト「場所を追加するとリストに表示される」の不安定性が解消

**バンドルサイズ**
- 静的 JS 総量: 1.8 MB（非圧縮）、34チャンク、最大236KB
- 個人 PWA として許容範囲。Leaflet は dynamic import でコード分割済み

**コード品質**
- setTimeout / Realtime チャンネル等のクリーンアップは全て適切
- 空の `catch {}` が 7 箇所あるが、いずれも意図的なサイレント失敗

**手動確認が必要な残件**
- Lighthouse スコア（実機 Chrome DevTools が必要）
- iPhone 実機パフォーマンス
- Supabase ダッシュボード（todos Realtime 有効化・Slow Query）

### E2E テスト結果

- ベースライン: ⚠ 18/19（1件失敗）
- geocoding.ts 修正後: ✓ **19/19 全通過**
- 詳細: `STABILITY_AUDIT.md` を参照

### 詳細レポート

`STABILITY_AUDIT.md` を参照。

---

---

## セッション 15：パフォーマンス最適化（Phase S-2）

### 実施内容

STABILITY_AUDIT.md の発見事項に基づき、以下の3点を改修した。

---

#### 改修① — vaul DialogContent アクセシビリティ修正

**対象**: `components/BottomSheet.tsx`

**変更**: `Drawer.Content` に `aria-describedby={undefined}` を追加

**効果**:
- BottomSheet を使うすべての画面（calendar・list・home）でコンソール警告「Missing `Description` or `aria-describedby={undefined}` for {DialogContent}」が解消
- スクリーンリーダーへの誤った Description 参照を明示的に無効化
- テスト実行ログがクリーンになる

---

#### 改修② — カレンダー `useMemo` 最適化

**対象**: `app/(main)/calendar/page.tsx`

**変更**:
1. `useMemo` を import に追加
2. `calDays` を `useMemo([currentMonth])` に変換（月変化時のみ再計算）
3. `eventsOnDay` 関数（毎レンダリングで35回呼び出されていた）を廃止し、`eventsByDate: Map<string, CalEvent[]>` を `useMemo([events, calDays])` で事前構築に変更
4. `selectedDayEvents` IIFE を `useMemo([selectedDate, events])` に変換

**Before**:
```typescript
// 毎レンダリング × 35セル = events.filter() × 35回
const eventsOnDay = (date: Date) => events.filter(e => ...)
const dayEvents = eventsOnDay(day)  // JSX 内で 35回呼び出し
```

**After**:
```typescript
// events / calDays が変わった時のみ1回構築
const eventsByDate = useMemo(() => {
  const map = new Map<string, CalEvent[]>()
  for (const event of events) { /* 各セルへのマッピング */ }
  return map
}, [events, calDays])

// JSX 内はマップ参照のみ（O(1)）
const dayEvents = eventsByDate.get(dayStr) ?? []
```

**効果**: イベント数が増えるほど効果が大きくなる。月切り替え時・他 state 変化時のレンダリングコストが削減される。

---

#### 改修③ — DB インデックス追加 SQL（未適用）

**対象**: `supabase/migrations/009_add_performance_indexes.sql`（新規作成）

**内容**:
- `events(couple_id, start_date)` — カレンダー表示クエリ向け
- `places(couple_id, is_visited)` — リスト・地図絞り込み向け
- `places(couple_id) WHERE latitude IS NOT NULL` — 地図バックフィル向け
- `todos(couple_id, is_done)` — リスト絞り込み向け
- `media(couple_id, is_done)` — リスト・インサイト向け
- `flights(event_id)` — カレンダーのフライト関連付け向け

**⚠️ 注意**: このファイルは Supabase Dashboard での手動実行が必要。
SQL Editor にペーストして実行すること。冪等（`IF NOT EXISTS`）のため何度実行しても安全。

---

### E2E テスト結果

- ベースライン: ✓ 19/19 全通過
- 改修①後: ✓ 19/19 全通過（DialogContent 警告も消去）
- 改修②後: ✓ 19/19 全通過
- 追加テスト: なし（パフォーマンス改善のため）

---

## 今後の検討候補（未着手）

- Supabase Realtime の todos テーブル有効化（パートナーのtodo追加をリアルタイム反映したい場合）
- フライト情報の番号から航空会社・時刻を自動補完する機能（API連携）
- iOS Safari での `datetime-local` input の UX 改善（ネイティブピッカーが使いにくい）

---

## セッション 16：セキュリティ監査（Phase S-3）

### 監査結果サマリー

**実施日**: 2026-05-24

| 項目 | 結果 |
|---|---|
| XSS (`dangerouslySetInnerHTML`) | ✅ 使用なし |
| `service_role` キー漏洩 | ✅ なし（`.env.local` は `.gitignore` 済み） |
| SQL インジェクション | ✅ Supabase クライアントのパラメータ化クエリのみ |
| RLS（Row Level Security） | ✅ 全テーブル有効（users, couples, events, places, media, flights, todos）|
| API ルート | ✅ `/api/` ルートなし（全操作はクライアントから Supabase 直接） |
| `eval()` / `innerHTML` | ✅ 使用なし |

---

### 改修① — セキュリティヘッダーの追加

**対象**: `next.config.ts`

**追加ヘッダー**（全ページ `/(.*)`）:

| ヘッダー | 値 |
|---|---|
| `X-Frame-Options` | `DENY`（クリックジャッキング防止） |
| `X-Content-Type-Options` | `nosniff`（MIME スニッフィング防止） |
| `X-DNS-Prefetch-Control` | `on` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Content-Security-Policy` | 下記参照 |

**CSP の設計方針**:
- `default-src 'self'` でデフォルト禁止
- `script-src 'unsafe-inline' 'unsafe-eval'` は Next.js App Router の hydration と Turbopack に必要
- `style-src 'unsafe-inline'` は Tailwind のインラインスタイルに必要
- `img-src` は OpenStreetMap タイル・Supabase ストレージを許可
- `connect-src` は Supabase API・WebSocket・Nominatim を許可
- `worker-src 'self'` は Service Worker に必要
- `frame-src 'none'` `object-src 'none'` で iframe・プラグイン完全禁止

---

### 改修② — パスワード強度バリデーションの追加

**対象**: `app/auth/signup/page.tsx`

**変更内容**:
- フォームに `noValidate` を追加（ブラウザ標準 HTML5 バリデーションを無効化し、JS側で制御）
- `handleSignup` の先頭にクライアントサイドチェックを追加:
  1. 8文字未満 → "パスワードは8文字以上にしてください。"
  2. 英字・数字の両方が含まれない → "パスワードは英字と数字を両方含めてください。"
- Supabase API 呼び出し前にエラーを表示（API ラウンドトリップなし）

---

### 改修③ — セキュリティ E2E テストの追加

**対象**: `tests/security.spec.ts`（新規作成）

**テスト内容**（7 件）:
- `X-Frame-Options: DENY` が設定されているか
- `X-Content-Type-Options: nosniff` が設定されているか
- `Content-Security-Policy` ヘッダーが存在し `default-src 'self'` / `frame-src 'none'` / `object-src 'none'` を含むか
- `Referrer-Policy` が `strict-origin-when-cross-origin` か
- パスワード 6 文字でエラーメッセージが表示されるか
- パスワードが数字のみでエラーメッセージが表示されるか
- パスワードが英字のみでエラーメッセージが表示されるか

---

### E2E テスト結果

- ベースライン: ✓ 19/19 全通過
- 全改修後: ✓ **26/26 全通過**（セキュリティ 7 件追加）

---

## セッション 17：データバックアップ・エクスポート（Phase S-4）

### 実施内容

---

#### 改修① — 手動データエクスポート API

**対象**: `app/api/export/route.ts`（新規作成）

**概要**: 認証済みユーザーのカップルデータを JSON 形式で返す GET エンドポイント。

**取得テーブル**: events / places / media / todos / flights / users(id, display_name, avatar_color) / couples

**レスポンス形式**:
```json
{
  "version": "1.0",
  "exported_at": "ISO 8601 日時",
  "couple": { ... },
  "users": [ ... ],
  "events": [ ... ],
  ...
}
```

**エラーハンドリング**:
- 未認証 → 401
- カップル未設定 → 404
- デモ環境（Supabase 未設定）→ 503

---

#### 改修② — アカウント削除 API

**対象**: `app/api/delete-account/route.ts`（新規作成）

**概要**: 認証済みユーザーのデータを削除してサインアウトする DELETE エンドポイント。

**RLS 制約上の削除範囲**:
- `todos`, `flights` → couple_id スコープ（メンバー全員のデータを削除）
- `media`, `places` → added_by = 自分のデータのみ削除
- `events` → created_by = 自分のデータのみ削除

**⚠️ 制限事項**: auth ユーザー自体の削除には `service_role` キーが必要なため省略。
完全な auth アカウント削除は Supabase Dashboard > Authentication > Users から手動実施。

---

#### 改修③ — 設定画面「データ管理」カード追加

**対象**: `app/(main)/settings/page.tsx`

**追加 UI**（Map Data カードと App Settings カードの間）:
- 説明テキスト（定期エクスポートのすすめ）
- `すべてのデータをエクスポート` ボタン（`data-testid="export-button"`）
  - クリック → `/api/export` GET → Blob ダウンロード → "データをエクスポートしました" トースト
  - エクスポート中はボタン disabled
- 「危険ゾーン」セクション（区切り線付き）
  - `データを削除してログアウト` ボタン（`data-testid="delete-account-button"`）
  - 2段階確認（confirm → prompt で「DELETE」入力）→ `/api/delete-account` DELETE → `/auth/login` リダイレクト

**インポート追加**: `Download`, `Trash2` (lucide-react), `useToast` (ToastProvider)

---

#### バグ修正（実装中に発見）— 設定ページのローディング無限化

**対象**: `app/(main)/settings/page.tsx`

**症状**: E2E テスト環境（Supabase URL あり・認証セッションなし）で `loading` が `false` にならず、
ページコンテンツが永久に表示されない。

**根本原因**: `load()` 関数の `if (!user) return` が `setLoading(false)` を呼ばずに早期 return していた。

**修正**: `if (!user) { setLoading(false); return }`

**影響**: 本番環境（認証済み）ではこのコードパスを通らないため影響なし。
E2E テスト環境での設定ページの表示が正常化。

---

#### 見送った機能

**Vercel Cron 自動バックアップ** — 以下の理由でスキップ:
- `SUPABASE_SERVICE_ROLE_KEY` が環境変数に未設定（全カップルデータのイテレーションに必要）
- バックアップ保存先（S3・Supabase Storage 等）が未定
- 2人用個人アプリとして Supabase 無料プランの日次バックアップ + 手動エクスポートで十分

---

#### 改修④ — データ管理 E2E テスト追加

**対象**: `tests/data-management.spec.ts`（新規作成）

**テスト内容**（5 件）:
1. エクスポートボタンが設定画面に表示される
2. データ削除ボタンが設定画面に表示される
3. エクスポートボタンがダウンロードをトリガーする（API をモック）
4. 削除ボタンは confirm キャンセルでデータを削除しない
5. 削除ボタンは「DELETE」以外の入力では削除しない

---

### E2E テスト結果

- ベースライン: ✓ 26/26 全通過
- 全改修後: ✓ **31/31 全通過**（データ管理 5 件追加）

---

## セッション 18：監視・ログ・アラート（Phase S-5）

### 実施内容

---

#### 改修① — Vercel Analytics / Speed Insights

**インストール**: `npm install @vercel/analytics @vercel/speed-insights`

**対象**: `app/layout.tsx`

**変更**: `<Analytics />` と `<SpeedInsights />` を `<body>` 末尾に追加。
`<ToastProvider>` の外側（全ページ共通）に配置。

**CSP 更新** (`next.config.ts` の `connect-src`):
- `https://va.vercel-scripts.com` — Vercel Analytics
- `https://vitals.vercel-insights.com` — Speed Insights

---

#### 改修② — Sentry エラートラッキング

**インストール**: `npm install @sentry/nextjs`

**新規作成ファイル**:

| ファイル | 役割 |
|---|---|
| `sentry.client.config.ts` | ブラウザ側 Sentry 初期化 |
| `sentry.server.config.ts` | サーバー側 Sentry 初期化 |
| `sentry.edge.config.ts` | Edge Runtime 用 Sentry 初期化 |
| `instrumentation.ts` | Next.js App Router のサーバー設定登録フック |

**`next.config.ts` 変更**: `withSentryConfig` でラップ（`silent: true, disableLogger: true`）

**設計方針**:
- `enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN` で DSN 未設定時は完全無効
- `enabled: process.env.E2E_TEST !== 'true'` で E2E テスト中も無効
- `tracesSampleRate: 0.1`（本番 10%、開発 0%）
- `beforeSend` でパスワードフィールドをイベントから除去
- `SENTRY_AUTH_TOKEN` 未設定のためソースマップアップロードなし

**有効化方法**: `.env.local` に `NEXT_PUBLIC_SENTRY_DSN=<your-dsn>` を追加
（`.env.example` に記載済み）

**CSP 更新** (`connect-src` に追加):
- `https://*.ingest.sentry.io` — Sentry のイベント送信先

---

#### 改修③ — ヘルスチェック API

**対象**: `app/api/health/route.ts`（新規作成）

**動作**:
- Supabase 設定あり: `couples` テーブルへの疎通確認（anon キー + RLS で空結果、エラーなし = DB 接続成功）
- Supabase 未設定（デモ環境）: `database: 'skipped'` で常に 200 を返す

**レスポンス例**:
```json
{
  "status": "healthy",
  "timestamp": "2026-05-25T00:00:00.000Z",
  "checks": { "database": "ok" }
}
```

**UptimeRobot での監視設定（手動・コードなし）**:
- URL: `https://your-domain.vercel.app/api/health`
- 監視間隔: 5分
- 通知: メール

---

#### 改修④ — 構造化ロガー

**対象**: `lib/logger.ts`（新規作成）

**使い方**:
```typescript
import { logger } from '@/lib/logger'

logger.info('イベント追加', { eventId: id, coupleId })
logger.warn('ジオコーディング失敗', { placeName })
logger.error('Supabase insert 失敗', { error })
```

**仕様**:
- `debug` ログは本番環境で出力しない
- Vercel / Next.js のサーバーログとして構造化 JSON を出力
- ブラウザコンソールではなくサーバーサイドで使用することを想定

---

### E2E テスト結果

- ベースライン: ✓ 31/31 全通過
- 全改修後: ✓ **33/33 全通過**（ヘルスチェック 2 件追加）

---

## セッション 19：地図ページ表示不具合の修正（Phase S-6）

### 症状

1. 地図タイルが表示されない（白/グレーの空白）
2. レイアウトが崩れ、BottomNav と地図エリアが重なる
3. ピンが表示されない（タイルが表示されないため）
4. 凡例カードだけ正常表示される

---

### 根本原因と修正

#### 修正① — CSP: CARTO タイルドメインが未許可（主因）

**対象**: `next.config.ts`

**原因**: セッション16（Phase S-3）で CSP を追加した際、`img-src` に地図タイル提供元のドメインが不足していた。

| 不足していたドメイン | 用途 |
|---|---|
| `https://*.basemaps.cartocdn.com` | PlacesMap の TileLayer（Carto Light タイル） |

ブラウザが地図タイルのリクエストを CSP 違反としてブロックし、白紙の地図になっていた。

**修正**: `img-src` に `https://*.basemaps.cartocdn.com` を追加。

---

#### 修正② — CSP: Google Fonts と Vercel Analytics スクリプトが未許可

**対象**: `next.config.ts`

`globals.css` の `@import url('https://fonts.googleapis.com/...')` と、`<Analytics />` / `<SpeedInsights />` のスクリプト (`va.vercel-scripts.com`) が CSP に未記載だった。

**修正**:

| ディレクティブ | 追加ドメイン |
|---|---|
| `script-src` | `https://va.vercel-scripts.com` |
| `style-src` | `https://fonts.googleapis.com` |
| `font-src`（新規追加） | `https://fonts.gstatic.com` |

---

#### 修正③ — レイアウト: main の padding が地図の高さ計算と干渉

**対象**: `app/(main)/map/page.tsx`

**原因**: 地図ページの外側 div が `height: calc(100dvh - ...)` を使っていたが、`(main)/layout.tsx` の `main` 要素（`overflow-y: auto` + padding）との組み合わせで、ページが scrollable になり BottomNav の後ろに地図が隠れる場合があった。

**修正**: `height: calc(100dvh - ...)` を廃止し、`position: fixed` で画面上の正確な位置に固定。

```tsx
// Before
<div style={{
  height: 'calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 72px)',
  ...
}}>

// After
<div style={{
  position: 'fixed',
  top: 'env(safe-area-inset-top)',
  left: 0,
  right: 0,
  bottom: 'calc(env(safe-area-inset-bottom) + 72px)',
  ...
}}>
```

---

#### 修正④ — list.spec.ts: ジオコーディング成功時の確認モーダルを未処理

**対象**: `tests/list.spec.ts`

**原因**: セッション13でジオコーディング成功時に位置確認モーダルが表示される仕様が追加されたが、テストがモーダルを処理していなかった。Nominatim が正常応答した場合にモーダルが出て、テストが失敗。

**修正**: `Promise.race` でモーダルとリスト表示を競合チェックし、モーダルが出た場合は「この場所でOK」をクリックしてから確認する。

---

### E2E テスト結果

- ベースライン: ✓ 33/33 全通過
- 全改修後: ✓ **37/37 全通過**（地図テスト 4 件追加）

---

## セッション 23：カレンダー画面の磨き込み（Phase 3）

### 目的

カレンダー画面の細部を磨き、既存の完成度の高い実装をさらにプロ品質に引き上げる。

### 変更ファイル

**`app/(main)/calendar/page.tsx`** のみ（ロジック変更なし・視覚のみ）

---

### 改修① — 範囲帯のグラデーションフェード

**対象**: カレンダーグリッドの visit/trip 複数日イベント帯背景

**Before**: 単色 `backgroundColor: dot, opacity: 0.13`

**After**: セルの端点で自然に消えるグラデーション

| ポジション | グラデーション |
|---|---|
| `start`（開始日） | `transparent → color22`（右向きフェードイン）|
| `mid`（中間日） | `color18`（フラット）|
| `end`（終了日） | `color22 → transparent`（右向きフェードアウト）|

不透明度を hex サフィックス（`22` = 13%、`18` = 9%）で直接指定し、
セルの中心で自然に消える繋がりを表現。

---

### 改修② — 今日セル選択時のグロウリング

**Before**: 今日セルは常に `background: #1A1A1A` の黒丸（選択状態によらず同一）

**After**: 選択時（`isToday && isSelected`）に外側リング + シャドウを追加

```
boxShadow: '0 0 0 3px rgba(26,26,26,0.10), 0 3px 10px rgba(26,26,26,0.18)'
```

非選択時は `boxShadow: 'none'`。`transition: box-shadow 0.2s ease` でなめらかに。

---

### 改修③ — 単日イベントドットの上品化

**Before**: `width: 6, height: 6` 固定不透明度

**After**: `width: 4, height: 4` + 後ろほどフェード

```
opacity: 1 - j * 0.2  → 1件目: 1.0、2件目: 0.8、3件目: 0.6
```

小さくすることでセル内の数字と競合せず、複数イベント時の視覚的階層が明確に。

---

### 改修④ — フライトアイコンのカラートークン化

**Before**: `color: '#A3A3A3'`（ハードコード）

**After**: `color: 'var(--color-foreground-tertiary)', opacity: 0.65`

Phase 1 で追加したトークンを初めてカレンダーに適用。

---

### 改修⑤ — 月サマリーのカード化

**Before**: `flex-wrap` の平文テキスト行（`px-1` のみ）

**After**: `background: var(--color-background-secondary)` + `borderRadius: 10px` の薄いカード

```tsx
<div
  className="flex items-center justify-between flex-wrap gap-2 mb-4 px-3 py-2.5"
  style={{ backgroundColor: 'var(--color-background-secondary)', borderRadius: '10px' }}
>
```

「この月」「次」の区切りをカード境界で明示し、テキストもトークンカラー（`foreground-tertiary/foreground`）に統一。

---

### 見送った改修（既存実装で完結）

- **月切替トランジション**: `calGridVariants` + `AnimatePresence` が既に実装済み（Session 8/15）
- **Step 2 の `cn()` ユーティリティ**: 既存コードが className 文字列連結を使用しており整合性を維持

---

### E2E テスト結果

- 改修前: ✓ 37/37 全通過
- 改修後（1回目）: 36/37（`場所を追加するとリストに表示される` が Nominatim タイムアウトで間欠的失敗）
- 改修後（2回目）: ✓ **37/37 全通過**
- TypeScript: エラーなし

> **補足**: `場所を追加するとリストに表示される` の失敗は本 Phase の変更と無関係。  
> Nominatim API のレスポンスが遅れた場合に起きる既知の間欠障害（Session 19 で対応済み、テスト側は `Promise.race` でハンドリング済み）。  
> 単独実行・再実行で安定して通過。

---

## セッション 24：リスト画面のカード磨き（Phase 4）

### 目的

リスト画面のカードデザインを磨き上げる。
「赤い縦線」の根本原因修正、「ふたり」マーカーの再設計（Case B採用）、
チェックボックスアニメーション、ピル形状の統一。

### 変更ファイル

- `components/ui/Tag.tsx`
- `components/SwipeableListItem.tsx`
- `app/(main)/list/page.tsx`

---

### 改修① — 赤い縦線の根本原因修正（SwipeableListItem）

**対象**: `components/SwipeableListItem.tsx`

**根本原因**:
- `SwipeableListItem` 外側 div の clip radius = `12px`
- `Card` コンポーネントの `--radius-lg` = `14px`
- 内側カードの角が外側クリップより大きく、コーナー部分に隙間 → 赤い削除ボタン (`#B5465A`) が透けて見える

**修正**:
```tsx
// Before
style={{ borderRadius: '12px', overflow: 'hidden' }}
// After
style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}
```

clip radius を Card と同じ `14px` に揃えることで隙間を解消。

---

### 改修② — 「ふたり」マーカーの再設計（Case B 採用）

**対象**: `components/ui/Tag.tsx`

**選択した案**: **Case B（ふたりピル強化）**

理由:
- 既存のピル位置を活かせる
- アバター2つで「ふたり」を視覚的に強調
- カード自体はクリーンで上品

**Before**: `bg-surface text-muted` のシンプルな灰色ピル

**After**: `owner === 'both'` の場合のみ グラデーション + アバタードット2つ

```tsx
// グラデーション pill（ピンク→ブルー）
background: 'linear-gradient(to right, var(--color-accent-pink-soft), var(--color-accent-blue-soft))'

// アバタードット（重ね）
<span style={{ backgroundColor: 'var(--color-accent-pink)', marginLeft: '-3px' }} />
<span style={{ backgroundColor: 'var(--color-accent-blue)' }} />
```

`me` / `partner` の Tag は変更なし。

---

### 改修③ — Todo チェックボックスのアニメーション

**対象**: `app/(main)/list/page.tsx`

**import 追加**: `import { motion } from 'framer-motion'`

**Before**: プレーンな `<button>` + `borderColor: '#E5E5E5'`

**After**: `<motion.button>` + スプリング whileTap

```tsx
<motion.button
  onClick={() => toggleTodoDone(todo.id)}
  whileTap={{ scale: 0.80 }}
  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
  className="w-5 h-5 rounded-md flex-shrink-0 mt-0.5 flex items-center justify-center"
  style={{ border: '2px solid var(--color-border-strong)', backgroundColor: 'transparent' }}
/>
```

タップ時にスプリングで 80% 縮小 → 跳ね返る触感。
`groupBy === 'none'` と grouped view 両方に適用。

---

### 改修④ — ピル形状の統一

**対象**: `app/(main)/list/page.tsx`

**変更**: `borderRadius: '6px'` → `borderRadius: '100px'`（完全な pill 形状）

対象ピル:
| タブ | ピル | Before | After |
|---|---|---|---|
| places | カテゴリ | `6px` | `100px` |
| places | 場所 | テキストのみ | `bg-surface + 100px pill` |
| media | メディア種別 | `6px` | `100px` |
| todos | カテゴリ | `6px` | `100px` |

場所ピルには `backgroundColor: 'var(--color-surface)'` + pill 化でアイコン付きピルに統一。

---

### E2E テスト結果

- 改修前: ✓ 37/37 全通過
- 改修後: ✓ **37/37 全通過**
- TypeScript: エラーなし

---

## セッション 27：マイクロインタラクションと空状態（Phase 7）

### 目的

UI 磨き込みフェーズの総仕上げ。細部のインタラクション強化と、データが少ない時の体験を磨く。
純粋なビジュアル改善のみ（機能ロジック変更なし）。

### 変更ファイル

- `components/NavigationProgress.tsx`（新規作成）
- `app/layout.tsx`
- `app/(main)/calendar/page.tsx`
- `app/(main)/list/page.tsx`

---

### Step 1・2・3・4 の現状確認と対応

| Step | 内容 | 状態 |
|---|---|---|
| Step 2 ハプティック | 全アクション（タブ切替・チェック・削除・保存・月移動・検索）に haptic() 実装済み | ✓ スキップ（完了済み） |
| Step 3 スワイプ抵抗 | SwipeableListItem が既存ネイティブ touch イベント実装済み。framer-motion への書き換えは動作リスクが高い | ✓ スキップ（既存十分） |
| Step 4 数字アニメ | AnimatedNumber コンポーネントが既存・ホーム統計カードで使用済み | ✓ スキップ（完了済み） |
| ホーム空状態 | heroState.kind === 'no_meeting' で "Let's plan our next meet" + CTA 表示済み | ✓ スキップ（完了済み） |
| カレンダー日付空状態 | CalendarDays アイコン + "この日の予定はありません" + Button 表示済み | ✓ スキップ（完了済み） |

---

### 改修① — FAB + 月ナビボタンの whileTap（Step 1）

**対象**: `app/(main)/calendar/page.tsx`、`app/(main)/list/page.tsx`

- `Button` コンポーネントは既に `whileTap={{ scale: 0.96 }}` 対応済み
- FAB（追加ボタン）と月ナビ（ChevronLeft/Right）を `<button>` → `<motion.button>` に変更

```tsx
// FAB
<motion.button whileTap={{ scale: 0.94 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>

// 月ナビ
<motion.button whileTap={{ scale: 0.88 }} transition={{ duration: 0.1 }}>
```

---

### 改修② — リスト3タブの空状態強化（Step 5）

**対象**: `app/(main)/list/page.tsx`

グレーアイコン + 無機質テキストから、インサイト画面と統一したグラデーション円 + 温かいメッセージへ。

| タブ | アイコン背景 | メッセージ |
|---|---|---|
| 場所 (places) | `trip-soft → visit-soft` グラデーション | ふたりで行きたい場所をリストアップしよう |
| メディア (media) | `online-soft → #FFF7F0` グラデーション | 一緒に観たい・聴きたいものを貯めていこう |
| やること (todos) | `#FFF8EC → #FFF3D6` グラデーション | ふたりでやりたいことを書き出してみよう |

各パターンはグループ表示・通常表示の両ブランチ（計5箇所）すべて更新済み。

---

### 改修③ — ナビゲーションプログレスバー（Step 7）

**新規**: `components/NavigationProgress.tsx`

```tsx
// pathname 変化のたびに 550ms の進捗バーを表示
useEffect(() => {
  setVisible(true)
  const timer = setTimeout(() => setVisible(false), 550)
  return () => clearTimeout(timer)
}, [pathname, reduced])
```

- `scaleX: 0 → 1`（origin: left）でページ進捗感を演出
- `useReducedMotion()` 対応：モーション削減設定時は非表示
- グラデーション: `accent-blue → accent-pink → accent-blue`
- `app/layout.tsx` に `<NavigationProgress />` を追加（`<ToastProvider>` の外・body 直下）

---

### E2E テスト結果

- 改修前: ✓ 37/37 全通過
- 改修後: ✓ **37/37 全通過**
- TypeScript: エラーなし

---

## セッション 26：予定追加・詳細シートのモーション質感（Phase 6）

### 目的

ボトムシートのモーション・インタラクション品質を Apple 純正並みに磨く。
純粋なビジュアル改善のみ（機能ロジック変更なし）。

### 変更ファイル

- `components/BottomSheet.tsx`
- `app/(main)/calendar/page.tsx`
- `app/(main)/list/page.tsx`
- `app/globals.css`

---

### Step 1・2 スプリングアニメーション・ドラッグで閉じる

**既存実装で対応済み**: `BottomSheet.tsx` は `vaul` (Drawer) を使用しており、スプリングアニメーションとドラッグで閉じる機能はライブラリがネイティブで提供済み。追加実装不要。

---

### 改修① — オーバーレイのガラス効果（Step 3）

**対象**: `components/BottomSheet.tsx`

**Before**: `backgroundColor: 'rgba(0,0,0,0.3)'`（ブラー無し）

**After**: 背景ブラー + `useReducedMotion` 対応

```tsx
style={{
  backgroundColor: 'rgba(0,0,0,0.35)',
  backdropFilter: reduced ? undefined : 'blur(4px)',
  WebkitBackdropFilter: reduced ? undefined : 'blur(4px)',
}}
```

---

### 改修② — シート内コンテンツのフェードイン（Step 4）

**対象**: `components/BottomSheet.tsx`

コンテンツ領域を `motion.div` でラップし、シートが開いた後に内部要素が柔らかくフェードイン:

```tsx
<motion.div
  initial={reduced ? false : { opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1], delay: 0.12 }}
>
  {children}
</motion.div>
```

vaul が Portal 内でマウント・アンマウントを管理するため、開くたびに `initial` から再アニメーションされる。

---

### 改修③ — 保存ボタンの状態遷移（Step 5）

**対象**: `app/(main)/calendar/page.tsx`、`app/(main)/list/page.tsx`

`Button` コンポーネントは既に `loading` / `success` props 対応済みだったが、ページ側で状態管理されていなかった。

**追加した状態**:
```tsx
const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'success'>('idle')
```

**遷移フロー**:
1. ボタン押下 → `'saving'`（スピナー表示、ボタン無効化）
2. 保存完了 → `'success'`（チェックマーク + 緑色）
3. 700ms 後 → シートを閉じ、`'idle'` にリセット

**対象ハンドラ**:
| ファイル | ハンドラ |
|---|---|
| calendar | `handleAddEvent`, `handleUpdateEvent` |
| list | `handleAddTodo`, `handleAddMedia`, `handleUpdateTodo`, `handleUpdateMedia` |

**補足**: `handleAddPlace` は既存の `geocoding` state を `loading={geocoding}` として直接利用するよう改修（テキスト切り替えからスピナーに変更）。

---

### 改修④ — 入力フィールドのフォーカス演出（Step 6）

**対象**: `app/globals.css`

既存の `box-shadow` フォーカスリングに border-color と background-color の変化を追加:

```css
input:focus, textarea:focus, select:focus {
  box-shadow: 0 0 0 3px rgba(109, 91, 208, 0.10);
  border-color: rgba(109, 91, 208, 0.45) !important;
  background-color: var(--color-background-elevated, #fff) !important;
}
```

`!important` でインライン style の border を上書き（各フォームの `inputStyle` オブジェクトが `border: '0.5px solid var(--color-border)'` を設定しているため）。

---

### E2E テスト結果

- 改修前: ✓ 37/37 全通過
- 改修後: ✓ **37/37 全通過**
- TypeScript: エラーなし

---

## セッション 25：インサイト画面の生命感（Phase 5）

### 目的

インサイト画面に「数字の重み・アニメーションの流れ・励ましの温度感」を与える。
純粋なビジュアル改善のみ（ロジック変更なし）。

### 変更ファイル

- `app/(main)/insights/page.tsx`

---

### 改修① — 数字の表現強化（Instrument Serif）

**対象**: Places Completion カードの達成率 `%` 数字、Movies Together カードの `本観た` 数字

**Before**: `fontWeight: 600, fontSize: '22px'` のプレーンな数字

**After**: Instrument Serif + lining numerals（ホームヒーローと同じ言語）

```tsx
// Places: 達成率
<span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '52px', fontWeight: 400, lineHeight: 1, letterSpacing: '-0.02em', fontFeatureSettings: '"lnum" 1, "tnum" 1' }}>
  {Math.round(rate)}
</span>
<span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '28px', fontWeight: 400, color: 'var(--color-muted)' }}>%</span>

// Movies: 本観た数
<span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '52px', fontWeight: 400, lineHeight: 1, letterSpacing: '-0.02em', fontFeatureSettings: '"lnum" 1, "tnum" 1' }}>
  {watchedMovies.length}
</span>
<span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '22px', fontWeight: 400, color: 'var(--color-muted)' }}>本観た</span>
```

---

### 改修② — プログレスバーのイージング改善

**対象**: Places Completion カードのプログレスバー `<motion.div>`

**Before**: `duration: 0.8`（デフォルトイージング）

**After**: ease-out-expo でスナップ感

```tsx
transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
```

---

### 改修③ — カテゴリバーのスタガーアニメーション

**対象**: Places カードのカテゴリ別内訳

module-level variants を追加し、`staggerChildren` で各行が順次フェードイン:

```tsx
const categoryContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.3 } },
}
const categoryItem = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { ease: [0.16, 1, 0.3, 1] as [number, number, number, number], duration: 0.5 } },
}
```

各カテゴリバーを `<motion.div variants={categoryItem}>` でラップ。
個別バーのアニメーションも `delay: 0.4` でずらして奥行き感を演出。

---

### 改修④ — 空状態の励ましメッセージ（3パターン）

**対象**: Places カード（0 件時）、Movies カード（0 件時）、Movies カード（登録済みだが未視聴時）

**Before**: グレーアイコン + 無機質な日本語テキスト

**After**: グラデーション円アイコン + 温かみのあるメッセージ + リンク

| パターン | アイコン背景 | メッセージ |
|---|---|---|
| Places 0件 | `trip-soft → visit-soft` グラデーション | ふたりの行きたい場所を貯めていこう |
| Movies 0件 | `#F3F0FF → #FFE4ED` グラデーション | これから一緒に観る映画を貯めていこう |
| Movies 登録済み・未視聴 | `#FFE4ED → #F3F0FF` グラデーション | 一緒に観た映画が増えたらここに並んでいくよ |

---

### 改修⑤ — カード背景グラデーション

**対象**: Places カード、Movies カード（両方に `className="relative overflow-hidden"` 追加）

**Places カード**: 右上から薄いパープルのラジアルグラデーション
```tsx
background: 'radial-gradient(circle at top right, rgba(109,91,208,0.05) 0%, transparent 55%)'
```

**Movies カード**: 右上から薄いピンクのラジアルグラデーション
```tsx
background: 'radial-gradient(circle at top right, rgba(255,159,184,0.07) 0%, transparent 55%)'
```

`aria-hidden` + `pointer-events-none` で既存コンテンツへの干渉なし。

---

### TypeScript 修正

`Variants` 型の `ease` プロパティに `number[]` は不可 → `as [number, number, number, number]` でキャスト。

---

### E2E テスト結果

- 改修前: ✓ 37/37 全通過
- 改修後: ✓ **37/37 全通過**
- TypeScript: エラーなし

---

## セッション 22：ホーム画面の質感アップ（Phase 2）

### 目的

ホーム画面のヒーローエリア・アバターアイコン・統計カード・セクションヘッダーを磨き上げ、
Airbnb × Apple ハイブリッドの洗練された大人の雰囲気に仕上げる。

### 変更ファイル

**`app/(main)/page.tsx`** のみ（ロジック変更なし・視覚のみ）

---

### 改修① — ヒーロー背景：グラデーション + ノイズテクスチャ

**Before**: `backgroundColor: 'var(--color-hero-bg)'`（単調なフラットダーク）+ 単純な linear-gradient オーバーレイ

**After**: ペアカラー（パープル・ピンク）を薄く差し込んだ多層グラデーション + ノイズテクスチャオーバーレイ

```tsx
background: [
  'radial-gradient(ellipse at top right, rgba(167,139,250,0.15) 0%, transparent 50%)',   // パープル
  'radial-gradient(ellipse at bottom left, rgba(255,159,184,0.08) 0%, transparent 50%)', // ピンク
  'linear-gradient(135deg, #1A1A1A 0%, #0F0F0F 100%)',
].join(', ')
```

ノイズテクスチャ（SVG fractalNoise、opacity 0.04、mix-blend-mode: overlay）で
微細な質感を付加。セッション 20 の数字レイアウト（lining numerals・ベースライン揃え）は変更なし。

---

### 改修② — アバターアイコン：グラデーション + ボーダー + シャドウ

**Before**: `<IconCircle>` コンポーネントの flat `backgroundColor: color`、`gap-1.5`（横並び）

**After**: インラインの gradient circle × 2、`-space-x-2`（重なり配置）

```tsx
<div
  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
  style={{
    background: `linear-gradient(135deg, ${avatar_color} 0%, ${avatar_color}BB 100%)`,
    border: '2px solid rgba(255,255,255,0.15)',
    boxShadow: `0 2px 8px ${avatar_color}50`,
  }}
>
```

アバターカラー（`avatar_color`）をグラデーションのベースとして動的に使用。
`IconCircle` コンポーネント自体は変更せず、ホームのヒーロー表示のみインラインで上書き。

---

### 改修③ — 統計カード3枚の磨き

| 要素 | Before | After |
|---|---|---|
| アイコンコンテナ | `rounded-lg p-2` フラット背景 | `w-9 h-9 rounded-full` グラデーション + リングシャドウ |
| 数字フォント | `font-mono 22px fontWeight 500` | `font-display italic 26px fontWeight 400` + lining numerals |
| ラベル | 日本語テキスト `fontSize: 10px` | 英語ラベル (`Places`/`Media`/`Bucket`) + `uppercase tracking-[0.1em]` |
| タップ時 | 変化なし | `active:scale-[0.97] transition-transform duration-100` |
| シャドウ | `--shadow-sm` | `--shadow-soft-sm`（Phase 1 追加の新トークン） |

---

### 改修④ — セクションヘッダーの統一

「近いイベント」「最近追加された場所」の両カードヘッダーを同一フォーマットに統一：

```tsx
<header className="flex items-end justify-between mb-5">
  <div className="space-y-1">
    <p style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
      Coming up / Wishlist
    </p>
    <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '22px', fontWeight: 400 }}>
      近いイベント / 最近追加された場所
    </h2>
  </div>
  <Link>すべて見る → / すべて →</Link>
</header>
```

- `items-end`（ベースライン揃え）
- `font-display italic`（Instrument Serif Italic）
- Wishlist の `<MapPin>` アイコンリンク → `"すべて →"` テキストリンクに統一

---

### E2E テスト結果

- 改修前: ✓ 37/37 全通過
- 改修後: ✓ **37/37 全通過**
- TypeScript: エラーなし

---

## セッション 21：デザイントークン整理（Phase 1）

### 目的

UI プロ品質磨き込みの基盤として、散在していたデザイントークンを整理・拡充し、
全画面で一貫性を持たせる共通基盤を構築する。

### 作業内容

#### Step 1: 設計監査ドキュメント作成

**`DESIGN_TOKEN_AUDIT.md`（新規作成）**
- 既存 `@theme` トークンの全一覧
- 画面別ハードコード値の洗い出し（list.spec のハードコード `#E5E5E5` 等）
- 不整合・課題まとめ（角丸命名のズレ、シャドウ命名の二重化）
- Phase 1 変更内容の事前仕様

---

#### Step 2: `app/globals.css` — `@theme` トークン追加

**追加カラートークン**:

| グループ | トークン | 値 |
|---|---|---|
| 前景・反転 | `--color-foreground-inverse` | `#FAFAF7` |
| 背景バリアント | `--color-background` | `#FAFAF7`（= bg のエイリアス）|
| 背景バリアント | `--color-background-secondary` | `#F5F4F0` |
| 背景バリアント | `--color-background-elevated` | `#FFFFFF`（= card のエイリアス）|
| 背景バリアント | `--color-background-inverse` | `#1A1A1A` |
| ボーダー | `--color-border-soft` | `#EFEFEF` |
| ボーダー | `--color-border-strong` | `#D4D4D4` |
| アクセント | `--color-accent-blue` | `#7BB4FF` |
| アクセント | `--color-accent-blue-soft` | `#E8F0FF` |
| アクセント | `--color-accent-pink` | `#FF9FB8` |
| アクセント | `--color-accent-pink-soft` | `#FFE8EE` |

**追加角丸トークン**:

| トークン | 値 | 用途 |
|---|---|---|
| `--radius-xs` | `6px` | タグ、Pill、小バッジ（既存 --radius-sm と同値の新命名）|
| `--radius-2xl` | `32px` | モーダル、ボトムシート上端 |
| 既存 `--radius-sm/md/lg/xl` | 変更なし | 既存コンポーネント破壊を防ぐため維持 |

**追加シャドウトークン（soft セット）**:

| トークン | 値 |
|---|---|
| `--shadow-soft-xs` | `0 1px 2px 0 rgba(26,26,26,0.04)` |
| `--shadow-soft-sm` | `0 2px 6px -1px rgba(26,26,26,0.05), 0 1px 3px -1px rgba(26,26,26,0.03)` |
| `--shadow-soft-md` | `0 4px 12px -2px rgba(26,26,26,0.06), 0 2px 6px -2px rgba(26,26,26,0.04)` |
| `--shadow-soft-lg` | `0 8px 24px -4px rgba(26,26,26,0.08)` |
| `--shadow-soft-xl` | `0 16px 40px -8px rgba(26,26,26,0.10)` |
| `--shadow-glow-accent` | `0 0 32px rgba(167,139,250,0.25)` |

**追加イージング・デュレーショントークン**:

| トークン | 値 | 用途 |
|---|---|---|
| `--duration-normal` | `200ms` | 標準トランジション（新命名）|
| `--duration-slower` | `500ms` | ゆっくりなアニメーション |
| `--ease-smooth` | `cubic-bezier(0.4, 0, 0.2, 1)` | 標準（値を Material Motion に更新）|
| `--ease-snappy` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | バウンス（= 旧 --ease-spring の別名）|
| `--ease-gentle` | `cubic-bezier(0.25, 0.1, 0.25, 1)` | ゆるやか |
| `--ease-spring` | 変更なし | 既存互換 |
| `--duration-slow` | `320ms`（旧: 380ms）| 軽微調整 |

---

#### Step 3: ガラス効果ユーティリティ整理

`.glass-light`（新規追加）— クリームベースの半透明ガラス  
`.glass-dark`（更新）— `rgba(17,17,17,0.82)` → `rgba(26,26,26,0.70)` に改善  
`.glass`（後方互換維持）— 白ベースの従来値をそのまま保持  
`.glass-border`（変更なし）

---

### 変更ファイル

| ファイル | 変更種別 |
|---|---|
| `app/globals.css` | トークン追加・ガラス更新 |
| `DESIGN_TOKEN_AUDIT.md` | 新規作成 |

### 注意事項

- **コンポーネントは一切変更していない** — トークン定義のみ
- 既存の `--radius-sm/md/lg/xl`、`--color-visit-*` 等はすべて維持
- Phase 2 以降でコンポーネントを段階的にトークン移行予定

### E2E テスト結果

- 改修前: ✓ 37/37 全通過
- 改修後: ✓ **37/37 全通過**

---

## セッション 20：ヒーローエリア数字タイポグラフィの修正

### 症状

- カウントダウン数字（"5 days" など）が縦に間延びして見える
- 「days」ラベルとのベースライン位置関係が不自然
- 数字の形が大きいサイズで美しくない

### 根本原因と修正

**対象**: `app/(main)/page.tsx`（`upcoming` カウントダウン・`together` 状態・`anniversary` 状態）

#### 原因① — `lineHeight: 0.88` が flex baseline 計算を乱す

`motion.span`（inline 要素）に `lineHeight: 0.88` を設定すると、flex の baseline alignment に使われる行ボックスのサイズが縮んで位置計算がズレる。数字のグリフ自体はそのままなのにコンテナが小さくなり、視覚的に間延び・崩れて見える。

**修正**: `lineHeight: 0.88` → `lineHeight: 1`

#### 原因② — `font-feature-settings` 未指定で oldstyle numerals が使われる

Instrument Serif はデフォルトでオールドスタイル数字（古典的な数字。3, 4, 5, 7, 9 などがベースラインより下に垂れ下がる）を使用する。大きいサイズでは数字ごとに高さがバラバラになり不自然に見える。

**修正**: `fontVariantNumeric: 'lining-nums tabular-nums'` と `fontFeatureSettings: '"lnum" 1, "tnum" 1'` を追加してライニング数字（ベースライン揃い）に変更。

#### 原因③ — 比率と間隔が不適切

- 数字 `108px` に対して "days" が `28px`（比率 3.9:1）で離れすぎ
- `gap-2`（8px）では数字サイズに対して狭すぎる

**修正**:
- 数字: `clamp(88px, 24vw, 120px)`（画面サイズに応じて可変）
- "days" ラベル: `28px` → `22px`（比率 ~5:1 に改善）
- `gap-2` → `gap: 10px`

#### 追加改善 — 単数形対応

`1 days` → `1 day` に変更（`upcoming` 状態・`together` 状態どちらも対応）

### E2E テスト結果

- ベースライン: ✓ 37/37 全通過
- 全改修後: ✓ **37/37 全通過**

---

## セッション 28：バグ修正（リスト削除後タブ切り替えで復活）

### Bug — タブ切り替え後に削除した項目が復活する

#### 症状
リストページで項目（場所・メディア・やりたいこと）を削除後、別タブに移動して戻ると削除した項目が復活している。

#### 根本原因
Next.js App Router はページ間ナビゲーション時に `ListPageInner` コンポーネントをアンマウント→リマウントする。リマウント時に `useEffect(() => { load() }, [load])` が再実行され、デモモードの `load()` がハードコードされたモックデータを無条件に `setPlaces`/`setMedia`/`setTodos` に流し込む。その結果、削除操作が上書きされて項目が復活していた。

#### 修正

**`app/(main)/list/page.tsx`**

1. **モジュールレベルキャッシュを追加**（コンポーネントのリマウント間でデータを保持）
```tsx
let _demoPlaces: Place[] | null = null
let _demoMedia: MediaItem[] | null = null
let _demoTodos: Todo[] | null = null
```

2. **`load()` をキャッシュ利用に変更**（初回のみハードコードデータを使用）
```tsx
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  if (_demoPlaces === null) {
    _demoPlaces = [...hardcoded...]
    _demoMedia = [...hardcoded...]
    _demoTodos = [...hardcoded...]
  }
  setPlaces(_demoPlaces)
  setMedia(_demoMedia!)
  setTodos(_demoTodos!)
  return
}
```

3. **`useEffect` で状態変化をキャッシュに同期**（削除・更新・追加を反映）
```tsx
useEffect(() => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL && _demoPlaces !== null) {
    _demoPlaces = places
  }
}, [places])
// media, todos も同様
```

#### E2E テスト結果

- 修正前: ✓ 37/37 全通過（ロジックはデモモードのみ影響）
- 修正後: ✓ **37/37 全通過**
