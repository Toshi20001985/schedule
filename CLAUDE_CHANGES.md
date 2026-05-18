# 改修・バグ修正ログ

このファイルは Claude との相談用に、過去の改修・バグ修正の内容を記録したものです。

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

## 今後の検討候補（未着手）

- Supabase Realtime の todos テーブル有効化（パートナーのtodo追加をリアルタイム反映したい場合）
- フライト情報の番号から航空会社・時刻を自動補完する機能（API連携）
- iOS Safari での `datetime-local` input の UX 改善（ネイティブピッカーが使いにくい）
