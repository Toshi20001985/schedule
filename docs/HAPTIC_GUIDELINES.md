# 触感ガイドライン

## 基本原則

- **過剰に鳴らさない** — 疲れるので、操作に意味のある場面のみ
- **失敗時こそ大事** — 成功は当たり前、失敗・警告こそ確実に伝える
- **ユーザーが無効化できる** — 設定画面のバイブレーション/サウンドトグルで完全 OFF 可能
- **サウンドはデフォルト OFF** — 好みが分かれるため、ユーザーが意図的に ON にした時のみ鳴る

## ハプティックタイプ一覧

| タイプ | パターン (ms) | 用途 |
|--------|-------------|------|
| `selection` | 5 | タブ切替・セグメント選択（最も軽い） |
| `light` | 10 | 通常のボタンタップ |
| `medium` | 20 | FABタップ・ドラッグ開始 |
| `heavy` | 30 | 重要な操作 |
| `soft` | 8 | トグルOFF・月フェーズ変化 |
| `rigid` | 15 | 長押し開始 |
| `success` | [10, 30, 10] | 予定追加完了・保存完了 |
| `warning` | [20, 80, 20] | 削除確認・スワイプ閾値到達 |
| `error` | [30, 50, 30, 50, 30] | エラー発生 |

## シーン別マッピング

| アクション | ハプティック | サウンド |
|-----------|-------------|---------|
| タブ切替（BottomNav） | `selection` | — |
| タブ切替（リスト内） | `selection` | — |
| グループBy 切替 | `selection` | — |
| 通常ボタンタップ | `light` | `tap` |
| トグル ON | `light` | — |
| トグル OFF | `soft` | — |
| FABタップ | `medium` | — |
| スワイプ閾値到達 | `light` | — |
| 削除確認（スワイプ） | `warning` | `delete` |
| 予定追加完了 | `success` | `success` |
| 保存完了 | `success` | `success` |
| エラー発生 | `error` | — |
| 長押し開始 | `rigid` | — |
| ドラッグ開始 | `medium` | — |
| PullToRefresh 完了 | `success` | — |

## サウンドタイプ一覧

| タイプ | ファイル | 長さ目安 | 用途 |
|--------|---------|---------|------|
| `tap` | `/sounds/tap.mp3` | 10–20ms | 通常タップ |
| `success` | `/sounds/success.mp3` | 200ms | 完了・保存 |
| `delete` | `/sounds/delete.mp3` | 150ms | 削除操作 |
| `pop` | `/sounds/pop.mp3` | 80ms | 軽い操作 |

## 音源の準備

`public/sounds/` に上記 `.mp3` ファイルを配置する。
音源は以下から取得できる：

- [Freesound.org](https://freesound.org) — CC0 ライセンス素材が豊富
- [Mixkit](https://mixkit.co/free-sound-effects/) — 無料・商用可
- Apple Logic Pro のサンプル素材

推奨音量: `volume = 0.15`（`playSound()` のデフォルト値）

## 新機能を実装する際のチェックリスト

- [ ] 成功・完了 → `haptic('success')` / `playSound('success')`
- [ ] 警告・削除 → `haptic('warning')` / `playSound('delete')`
- [ ] エラー → `haptic('error')`
- [ ] タブ/セグメント切替 → `haptic('selection')`
- [ ] FAB/主要ボタン → `haptic('medium')`
- [ ] 通常タップ → `haptic('light')`
- [ ] サウンドは `playSound()` を使い、設定 OFF 時は自動スキップされる
