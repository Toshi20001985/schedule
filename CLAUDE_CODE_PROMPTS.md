# Claude Code 初回プロンプト

## 使い方
1. プロジェクトフォルダを作成（例：`mkdir futari-note && cd futari-note`）
2. `REQUIREMENTS.md` をそのフォルダに置く
3. ターミナルで `claude` コマンドを実行してClaude Codeを起動
4. 以下のプロンプトを順番に投げていく

---

## 🌱 STEP 1：プロジェクトのセットアップ

```
このフォルダで新しいアプリ開発を始めます。
REQUIREMENTS.md に要件定義をまとめているので、まず読み込んで全体像を理解してください。

その上で、以下の作業をお願いします：

1. Next.js 14（App Router、TypeScript、Tailwind CSS）でプロジェクトをセットアップ
2. 必要なライブラリをインストール：
   - @supabase/supabase-js
   - @supabase/ssr
   - framer-motion
   - vaul
   - react-swipeable
   - date-fns
   - lucide-react
   - next-pwa
3. ディレクトリ構造は REQUIREMENTS.md の「8. ディレクトリ構成」に従う
4. .env.local のテンプレート（.env.example）を作成
5. README.md にセットアップ手順を記載

セットアップが完了したら、開発サーバーが起動できる状態にしてください。
```

---

## 🌱 STEP 2：Supabaseのスキーマ作成

```
Supabaseのデータベーススキーマを作成します。
REQUIREMENTS.md の「4. データベース設計」に基づいて：

1. supabase/migrations/ フォルダに初回マイグレーションSQLを作成
2. すべてのテーブル定義（users, couples, events, places, media）
3. RLSポリシーをすべてのテーブルに設定（couple_idによるアクセス制御）
4. インデックスの作成（couple_id, start_date など検索が頻繁な列）
5. types/database.ts にTypeScript型定義を作成

私がSupabase Studioで実行できるように、コピペで動くSQLにしてください。
```

---

## 🌱 STEP 3：デザインシステムの構築

```
デザインの基礎を整えます。
REQUIREMENTS.md の「6. デザインガイドライン」に基づいて：

1. tailwind.config.ts にカスタムカラーパレットを定義
   - cream, brown-text, sage, lavender, pink-soft などセマンティックな名前で
2. globals.css にカスタムフォント（Klee One, Quicksand）の読み込み
3. components/ui/ に以下の汎用コンポーネントを作成：
   - Card（白背景、角丸16-24px、0.5pxボーダー）
   - Button（プライマリ / セカンダリ）
   - Tag（投稿者タグ用の小さなピル）
   - IconCircle（ふたりのアイコン円）
4. iOSのセーフエリア対応用のlayout設定

トーンは「かわいい・あたたかい・紙のノート風」。
ANAアプリのような使いやすさも兼ね備えるバランスでお願いします。
```

---

## 🌱 STEP 4：認証とペアリング機能

```
認証機能を実装します。

1. Supabase Authを使ったメール+パスワード認証
2. app/auth/login と app/auth/signup ページ
3. サインアップ後、自動的にカップルコード（6文字英数字）を発行
4. app/auth/pair ページ：相手のコードを入力してペア成立
5. ペア未成立ユーザーは強制的に /auth/pair へリダイレクト
6. middleware.tsで認証チェック
7. lib/supabase/client.ts と server.ts でクライアント分離

UIは REQUIREMENTS.md のデザインガイドラインに従う温かみのある雰囲気で。
```

---

## 🌱 STEP 5：レイアウトとナビゲーション

```
共通レイアウトを実装します。

1. components/BottomNav.tsx：下部固定タブ（ホーム/カレンダー/リスト/設定）
2. components/FAB.tsx：右下フローティングアクションボタン
3. components/BottomSheet.tsx：vaulを使った下からせり上がるシート
4. app/(main)/layout.tsx：認証済みユーザー用の共通レイアウト
5. iPhoneセーフエリア対応（env(safe-area-inset-*)）
6. ヘッダー部分は固定スクロール

タップ時の縮小フィードバック、画面遷移の左右スライドも実装してください。
```

---

## 🌱 STEP 6：ホーム画面

```
ホーム画面を実装します。app/(main)/page.tsx を作成してください。

要素：
1. ヘッダー：「おはよう/こんにちは/こんばんは」+ ふたりのアイコン
2. 次に会う日カードのヒーローエリア（最重要、大きく表示）：
   - 「あと◯日」の大きな数字
   - 日付範囲
   - 移動方向タグ（私→彼など）
   - 飛行機代負担タグ
3. 統計カード（2カラム）：行きたい場所数、観たいもの数
4. 今週のミニカレンダー（横並び7日分、今日と特別な日をハイライト）
5. 最近追加されたアイテム（直近3件）

データはSupabaseから取得。会う予定がない場合のempty stateも考慮してください。
```

---

## 🌱 STEP 7：カレンダー機能

```
カレンダー画面を実装します。app/(main)/calendar/page.tsx を作成。

要件：
1. 月間ビューカレンダー（横スワイプで月切り替え：react-swipeable使用）
2. 5種類の予定タイプを色分け表示（visit/trip/online/anniversary/personal）
3. 連続する会う期間は帯のように連結表示
4. 日付タップで詳細ボトムシート表示
5. FABタップで予定追加ボトムシート表示
6. 予定追加フォームは予定タイプによって入力項目を出し分け：
   - visit: 日付範囲、移動方向、飛行機代負担者、メモ
   - trip: 日付範囲、行き先、飛行機代の扱い、行きたい場所リストから紐付け、メモ
   - online: 日付、観たいものリストから紐付け、メモ
   - anniversary: 日付、内容、繰り返し
   - personal: 日付、所有者、ラベル、メモ
7. カレンダー下部に直近の予定リスト

凡例も表示してください。
```

---

## 🌱 STEP 8：リスト機能（場所 + メディア）

```
リスト画面を実装します。

1. app/(main)/list/page.tsx：上部タブで「行きたい場所」「観たい・聴きたい」を切替
2. 行きたい場所：
   - カード形式（写真、場所名、カテゴリ、追加者、ステータスバッジ）
   - カテゴリフィルタ
   - 訪問済み切替トグル
   - FABから追加（ボトムシート）
   - 編集・削除はカード長押し or 右上メニュー
3. 観たい・聴きたい：
   - サブタブ：映画/ドラマ/アニメ/音楽/本
   - カード形式（画像、タイトル、追加者コメント、ステータス）
   - 鑑賞済み切替トグル
   - FABから追加（ボトムシート）

画像アップロードはSupabase Storageを使用してください。
```

---

## 🌱 STEP 9：設定画面とペア管理

```
設定画面を実装します。app/(main)/settings/page.tsx を作成。

1. ふたりの名前とアイコンカラーの編集
2. 記念日（付き合った日）の設定
3. カップルコード表示（再発行ボタン）
4. ログアウト
5. アプリ情報（バージョン等）

シンプルなリスト形式のUIで。
```

---

## 🌱 STEP 10：PWA化と仕上げ

```
PWAとして完成させます。

1. next-pwa の設定（next.config.js）
2. public/manifest.json の作成
   - name: "ふたりのノート"
   - short_name: "ふたり"
   - display: standalone
   - theme_color, background_color設定
3. アプリアイコン作成（180×180, 192×192, 512×512）
   ※プレースホルダー画像でOK、後で差し替え可能に
4. iPhoneでホーム画面追加できるよう、必要なmetaタグをlayout.tsxに追加：
   - apple-mobile-web-app-capable
   - apple-mobile-web-app-status-bar-style
   - apple-touch-icon
5. スプラッシュスクリーン用画像生成
6. Service Workerでオフライン時の基本表示対応

最後に、Vercelデプロイ手順をREADME.mdに追記してください。
```

---

## 📌 開発中に詰まったら使えるプロンプト集

### バグ修正
```
[エラーメッセージや症状を貼る]
これを解決してください。原因と対策を説明した上で、修正してください。
```

### UI調整
```
[該当画面/コンポーネント]のUIを調整したいです。
[こうしたい]という感じにしたいので、変更してください。
変更前後の差分を示してください。
```

### 機能追加
```
[機能名]を追加したいです。
仕様：[簡単な仕様]
REQUIREMENTS.mdとの整合性も確認してから実装してください。
```

### コードレビュー
```
[ファイルパス] の実装をレビューしてください。
- パフォーマンス上の問題
- セキュリティ上の問題
- 可読性・保守性の改善点
を洗い出してください。
```

---

## 💡 効率よく進めるコツ

1. **STEPごとに動作確認** - 一気に進めず、各STEPで `npm run dev` して動作確認
2. **Gitにこまめにコミット** - 各STEP完了時にコミット推奨
3. **Supabaseは先に環境構築** - STEP 2のSQLを実行してから STEP 4 に進む
4. **iPhone実機テストを早めに** - VercelにデプロイしてSafariで実機確認
5. **REQUIREMENTS.mdは随時更新** - 仕様が変わったらこのファイルも更新してClaude Codeに参照させる

---

## 🎯 完成までの目安

- Phase 1（MVP）：1〜2週間
- Phase 2（主要機能完成）：+1週間  
- Phase 3（仕上げ）：+1週間

合計：**3〜4週間** で実用レベルに到達

がんばってください！🌸
