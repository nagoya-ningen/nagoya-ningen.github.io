# ナゴヤ人間 — Official Site

名古屋を素材に、都市・産業・文化の構造を読み解く独立メディア「ナゴヤ人間」のオフィシャルサイトです。

**公開URL**: https://nagoya-ningen.github.io/

## 構成

```
.
├── index.html        # トップページ
├── news.html         # お知らせ一覧
├── css/style.css     # 全ページ共通スタイル
├── js/news.js        # ニュース読込・描画
├── data/news.json    # ニュースデータ（追記式）
├── img/
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

## マガジン／アプリを追加する

`index.html` の該当セクション（マガジンは `#magazines`、アプリは `#products`）を直接編集します。デザインの一貫性を保つため、テンプレートエンジンは使っていません。

## 技術構成

- バニラ HTML / CSS / Vanilla JS のみ。フレームワーク・ビルドツール無し。
- 画像は WebP（PNGフォールバック）。
- システムフォントのみ（Webフォントなし）。
- PWA / Service Worker は意図的に**入れていません**（ニュース更新を確実に反映するため）。
- GitHub Pages デプロイ（main ブランチ直下）。

## SNS

- note: https://note.com/citypod_nagoya
- X: https://x.com/nagoya_ningen
- Threads: https://www.threads.com/@nagoya_ningen

---

© 2026 ナゴヤ人間 / Nagoya Ningen
