# ナゴヤ人間 — Official Site

名古屋・愛知の公式資料と街の変化を、暮らす人の視点から読み解く独立メディア「ナゴヤ人間」のオフィシャルサイトです。

**公開URL**: https://nagoya-ningen.github.io/

## 構成

```
.
├── index.html        # トップページ
├── news.html         # お知らせ一覧
├── contact.html      # 問い合わせ窓口
├── annai/            # 記事アーカイブを使うAI案内所
├── meieki/           # 名駅の論点マップ（現在は募集休止中）
├── credits.html     # 写真の出典・利用条件
├── css/brand.css     # ブランドサイト共通スタイル（2026-09刷新）
├── css/style.css     # 既存ページ用スタイル（保持）
├── js/brand.js       # スマホメニュー・キーボード操作
├── js/news.js        # ニュース読込・描画
├── data/news.json    # ニュースデータ（追記式）
├── img/
│   ├── editorial/    # 実写の名古屋写真（出典はcredits.html）
│   ├── brand/        # ブランドのロゴ・キャラクター
│   ├── character/    # マスコット画像（WebP + PNG fallback）
│   └── og/           # OGP用画像
└── robots.txt
```

## ニュースを追加する

`data/news.json` の配列**先頭**に1オブジェクトを追記し、コミット＆プッシュするだけです。

```json
{
  "date": "2026-MM-DD",
  "tag": "リリース | 森道市場 | マガジン | ナゴヤ批評 | ...",
  "title": "タイトル（70字程度まで推奨）",
  "url": "https://..."
}
```

サイト側で日付降順に並び替えるので、追加順序は問いません（先頭推奨）。

## 記事／アプリを追加する

`index.html` の該当セクション（記事は `#articles`、アプリは `#products`）を直接編集します。デザインの一貫性を保つため、テンプレートエンジンは使っていません。

## 技術構成

- バニラ HTML / CSS / Vanilla JS のみ。フレームワーク・ビルドツール無し。
- 画像は WebP（PNGフォールバック）。
- システムフォントのみ（Webフォントなし）。
- PWA / Service Worker は意図的に**入れていません**（ニュース更新を確実に反映するため）。
- GitHub Pages デプロイ（main ブランチ直下）。

## SNS

- note: https://note.com/citypod_nagoya
- 無料ニュースレター: https://nagoyaningen.substack.com/
- X: https://x.com/nagoya_ningen
- Threads: https://www.threads.com/@nagoya_ningen

---

© 2026 ナゴヤ人間 / Nagoya Ningen

## 2026年9月 ブランドサイト刷新

「街を、読み解く。」を視覚の核に、ブランド紹介、公開記事6本、ラボ、無料ニュースレター、更新情報を構成。サイトの公開コピーは「名古屋の変化を、暮らす人の視点から。」を維持しています。

- 制作ブランチ: `codex/brand-renewal`。公開状態はリリース記録で管理し、このREADMEの存在を公開済み証拠としない。
- 既存の`annai/`・`meieki/`、外部アプリ、OG画像とfaviconは保持。
- 写真は縮小・JPEG圧縮、スマートフォン用画像も用意。撮影日と出典は `credits.html` に記載。
- 新着記事を追加する場合は `data/news.json` とHTMLフォールバックを合わせて更新。
- メニューはEnter/Spaceで開閉、Escapeで閉じます。JavaScript無効時もモバイルのリンクを表示します。

ローカルプレビュー: `python3 -m http.server 8765 --bind 127.0.0.1`

## モーショングラフィックとロゴ（2026-09-28 更新）

- トップは本人提供のセリフ体ロゴを背景透過した `img/brand/editorial-logo-transparent.png` を水平に配置。14秒でゆっくり上下に浮動し、背後の街の写真をワイプで切り替えます。回転と四角い影は使いません。黒い文字が読めるよう、写真には明るい暖色のシェードを重ねます。
- ラボは `img/brand/nn-seated.png`、共通フッターは `img/brand/sculpted-logo.png`。提供PNGの原本3点は保持し、トップ用の透過版のみ別名で収録。文字やキャラクターを切り取らずに表示。
- ヘッダーの既存ロゴは `img/brand/{nagoya.png,ningen.png,character-2026.png}` を元の比率・重なり順で維持。
- `css/motion.css`: ポスター浮動、写真ワイプ、背景タイポ、スクロール登場、文字の帯。既存の静的CSSとは分けて管理。
- `js/motion.js`: 一時停止・再生、セッション内の停止設定保存、OSの動きを減らす設定、画面外と非表示タブでの停止、IntersectionObserverによる一度きりの登場。
- 静的完成形を既定とし、JSが有効な場合だけモーションを開始。JSやストレージが利用できなくても本文・ロゴ・ナビゲーションを表示。
- 手動停止からの再生は演出全体を同時に先頭から開始。OSで動きを減らす設定がある場合は、静止表示を優先する。
- 追加外部ライブラリ・動画ファイル・音声・スクロールの強制制御なし。
