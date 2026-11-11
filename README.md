# ナゴヤ人間 — Official Site

名古屋・愛知の公式資料と街の変化を、暮らす人の視点から読み解く独立メディア「ナゴヤ人間」のオフィシャルサイトです。

**正規URL（本修正の設定）**: https://nagoya-ningen.pages.dev/

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
- 静的HTMLを配信。正規URLはCloudflare Pagesとし、既存のGitHub Pages配信とは公開状態を分けて確認します。

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
- ニュースレター欄は本人提供の「分析出力 9.png」から白背景を透過した `img/brand/walking-logo-transparent.png` を使用。歩くキャラクターとアーチ状の文字を傾けずに配置し、スマートフォンでも表示。
- `css/motion.css`: ポスター浮動、写真ワイプ、背景タイポ、スクロール登場、文字の帯。既存の静的CSSとは分けて管理。
- `js/motion.js`: 一時停止・再生、セッション内の停止設定保存、OSの動きを減らす設定、画面外と非表示タブでの停止、IntersectionObserverによる一度きりの登場。
- 静的完成形を既定とし、JSが有効な場合だけモーションを開始。JSやストレージが利用できなくても本文・ロゴ・ナビゲーションを表示。
- 手動停止からの再生は演出全体を同時に先頭から開始。OSで動きを減らす設定がある場合は、静止表示を優先する。
- 追加外部ライブラリ・動画ファイル・音声・スクロールの強制制御なし。

## 2026-11-11 テクニカルSEO監査・修正

公開用リリース `c1cac87`（調査時のローカル `origin/main` と一致）の全HTML 7ページを、専用ブランチ `codex/technical-seo-20261111` で修正しました。検索改修中の別ブランチは統合していません。本番へのpush・デプロイ・検索エンジンへの送信は未実施です。

独自ドメインの設定ファイルはありません。本人指定に基づき正規オリジンを `https://nagoya-ningen.pages.dev` としました。[Cloudflare PagesのHTML配信仕様](https://developers.cloudflare.com/pages/configuration/serving-pages/)に合わせ、ルートのHTMLは `/news`・`/contact`・`/credits`、ディレクトリのHTMLは `/annai/`・`/meieki/`・`/topics/meieki-redevelopment/` を正規パスとします。実ファイル名は維持しています。

変更前の結果は次のとおりです。Titleは日本語35文字以内・主題語が前方、descriptionは80〜120文字の1文を今回の判定基準にしました。これらの文字数は今回の編集基準であり、検索順位や表示文字数を保証する基準ではありません。

| ページ | Title | description | H1 | canonical・OGP | 内部リンク | 画像 | JSON-LD |
|---|---|---|---|---|---|---|---|
| index.html | Pass | Fail | Fail | Fail | Pass | Pass | Fail |
| news.html | Pass | Fail | Fail | Fail | Fail | Pass | Fail |
| contact.html | Pass | Fail | Fail | Fail | Fail | Pass | Fail |
| credits.html | Pass | Fail | Pass | Fail | Fail | Pass | Fail |
| annai/index.html | Pass | Fail | Pass | Fail | Fail | Pass | Fail |
| meieki/index.html | Pass | Fail | Pass | Fail | Fail | Pass | Fail |
| topics/meieki-redevelopment/index.html | Pass | Fail | Pass | Fail | Fail | Pass | Pass |

- descriptionは34〜75文字から88〜96文字の1文に改稿し、OGPとJSON-LDの説明も揃えました。写真クレジットのOGPはトップのコピーから当該ページの内容へ修正しました。
- 単一H1を維持し、トップは「名古屋を、読み解く。」、お知らせは「お知らせ。」、お問い合わせは「お問い合わせ。」へ変更しました。その他の見出しは維持しています。
- canonical・OGP・Twitter画像・JSON-LD・サイトマップ・robots.txtを正規オリジンに統一しました。別配信の森道アプリへの外部リンクは従来のURLを保持しています。
- トップの既存 `NewsMediaOrganization` にIDを付け、同じ発行者を参照する `WebSite` を追加しました。`sameAs` はフッターのnote・X・Instagram・Threads・Substackの5アカウントと一致します。
- 特集の既存 `Article`・`BreadcrumbList` を更新し、お知らせは `CollectionPage`、問い合わせは `ContactPage`、その他は `WebPage` を追加しました。記事の資料確認日・公開日は変更していません。
- 既存のフッター内に、名古屋駅再開発・ナゴヤ案内所などへの説明的なリンクを確保しました。自己リンクを除き、各ページから異なる重要ページへ2本以上あります。リンクは画面に表示し、隠しリンクは使っていません。
- 意味のある画像のalt・width・heightは既存で充足していたため維持しました。CSS・画像・モーション用および共通JavaScriptは変更していません。

`sitemap.xml` と `robots.txt` は静的サイトのルートにあります。サイトマップは上記のうち休止中の `/meieki/` を除く公開6ページです。同ページの既存 `noindex,follow` は保持し、robotsでクロールを遮断していません。業務リポジトリ内の画像制作用HTML、原稿、レビューなど、公式サイトの配信ルート外にあるHTMLは含めません。更新根拠のないlastmodや更新頻度・優先度は出力していません。

検証はネットワークを使わない静的検査と、外部通信を遮断した専用Chromeで実施しました。修正後は全7ページ×7項目の49項目がPassです。7ページを1440・768・390・360px幅で変更前後56通り確認し、横方向のはみ出しや画像の読込失敗はありません。H1・本文・ヒーロー画像・フッターナビの高さは維持され、休止ページのみ追加フッターに応じて本文下の余白が約22px短くなっています。トップとフッターはデスクトップ・スマートフォンの実画像でも確認しました。モーションの既存11テストは合格しています。

公開サーバーの応答、旧配信元からのリダイレクト、検索エンジンによるインデックス採用は公開時の確認事項です。案内所の既存API接続先判定はGitHub Pages用のまま保持しており、Cloudflare Pagesでの質問送信・回答動作は今回検証していません。

参照：[Googleの正規URL指定](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)、[サイトマップ](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)、[構造化データ](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)。


### 同日追補：コピーを保つセマンティック構造と案内所のハブ化

上記の初回監査・修正は `30a1328` 時点の記録です。今回の追補では、トップの大きな「街を、読み解く。」を復元し、`p.hero-headline` として表示します。既存の「名古屋の変化を、暮らす人の視点から。」を単一のH1に昇格しました。ブランドCSSとモーションCSSの旧 `.hero h1` 8箇所を `.hero .hero-headline` に替え、宣言値・アニメーションのclassとJavaScriptは維持しています。

トップのtitle・description・OGP・Twitter情報・組織の説明と紹介本文に、名古屋・愛知の都市再開発、産業、カルチャーを一次資料から読み解く独立ローカルメディアという対象を明示しました。隠し文字や隠しリンクは追加していません。

名古屋駅再開発のメイン記事カードはサイト内特集への同一タブ遷移に変更しました。見出し・説明・公開日・矢印も遷移先の特集に合わせています。他テーマの専用トピックは存在しないため、既存noteへのリンクを保持しています。

ナゴヤ案内所には「都市と再開発」「スポーツと都市」「暮らしとインフラ」「カルチャーと地域」「ラボ制作アプリ」のH2と説明文、記事・アプリ8件のH3リンクを静的HTMLで追加しました。テーマ内ジャンプと、サイト内特集・noteの記事・外部アプリの表示を設けました。既存の黒・黄・緑の配色、質問欄と質問処理を維持し、構造化データはCollectionPageへ更新しています。

限定検証：全7ページの49 SEO項目、ローカルリンク・fragment・アセット参照、JSON-LD、サイトマップ・robots整合は合格。トップと案内所を1440・768・390・360px幅で変更前後16通り確認し、横方向のはみ出し・画像読込失敗はありません。トップの大見出し・サブコピー・ヒーロー画像の配置とサイズは全4幅で一致しました。記事文言による本文の折返しと、案内所のカテゴリ追加に伴うページの高さは変わっています。モーションの既存11テストも合格しました。本番デプロイおよび案内所のAPI接続検証は行っていません。

### 同日追補：名古屋駅再開発の計画まとめ（公開前）

公開版3747156を基点に、`codex/meieki-topic-guide-20261111` で名駅トピックを改善しました。この追補はローカル準備稿であり、本番には反映していません。

本人からキーワード選定も任され、主軸を「名古屋駅 再開発 計画 まとめ」、補助語を「いつ完成」「名鉄」「リニア」「スケジュール」「未定」としました。検索数・CTRの実測は取得していないため、検索意図と手元の根拠の充実度による編集判断です。既存ページを改善し、同じ主題の新URLは追加していません。

検索結果で確認できた[名古屋情報通](https://jouhou.nagoya/meieki-redevelopment2026/)と[名駅経済新聞](https://meieki.keizai.biz/headline/3708/)には、計画概要・事業主体・変更前後の工程・施設構成などがありました。検索結果の地域・時点によって順位は変わるため、固定順位や全上位サイトの必須項目とは断定しません。公式資料と未定事項だけでは差別化しにくいため、発表の変遷を残し、通勤・乗換・買い物で何を確認すべきかへつなぐ構成にしました。

HTML変更前に提示した設計をもとに、以下を実装しました。

| 階層 | 内容 |
|---|---|
| 単一H1 | 名古屋駅再開発の計画まとめ。問い「何が決まり、何が未定なのか」は既存topic-deckへ配置 |
| H2→H3 | 3計画の概要と主体→名鉄・JR東海・名古屋市の既存カード |
| H2→H3 | いつ完成するか→変更前後の工程／新工程・規模・費用の確認事項 |
| H2 | 2025年の事業化決定から2026年の発表までを時系列で整理 |
| 既存H2/H3 | 名鉄・リニア・駅前広場の詳細、日々の移動との関わり、次の発表で見ること |
| H2 | 撮影時点を明示した写真、一次資料13件、確認・変更履歴 |

名鉄の旧工程は[2025年12月12日の変更発表](https://www.meitetsu.co.jp/profile/news/2025/__icsFiles/afieldfile/2025/12/12/25-12-12meiekihp.pdf)と照合。既存原稿で出典記録のある[2025年5月26日の事業化決定PDF](https://www.meitetsu.co.jp/ir/reference/disclosure/__icsFiles/afieldfile/2025/05/26/tekiji250526.pdf)も本文を再確認し、旧構想の事業主体・敷地/延床面積・用途・当時の工程に限って参照を追加しました。見直し後の仕様としては扱っていません。

新工程、見直し後の建物規模、見直し後の費用、桜通の実施・交通規制状況の4項目を `[CHECK: 要事実確認]` としています。公式発表の「未定」と編集側の未確認を区別し、資料確認日2026-10-31は更新していません。構成更新日・Article.dateModified・sitemapのlastmodだけを2026-11-11としています。CHECKを解消するまでは、最新の現況を確認済みの記事として公開しません。

途中のニュースレター導線と、末尾のnote・Substack・メンバーシップのカードを配置しました。末尾は既存2列グリッドを使うため、PCでは3枚目が次の行へ回ります。会員価格・配信頻度・特定の未公開記事を特典として約束する記述はありません。トップの紹介文と案内所の都市カテゴリに、新しい可視リンクを各1本追加しました。既存リンクとサイトマップのURLを重複追加していません。

CSS・JavaScript・画像ファイル・実行scriptは変更なし。写真は既存CC0素材で、撮影者・2022年の撮影日・原典リンクを明示し、現地取材や現在の工事写真とは表現していません。独立レビューで全7ページのSEO49項目、リンク/fragment、JSON-LD、サイトマップ6URLとrobotsの整合が合格。Chromeでは実測1440・768・390・360px幅で横はみ出しがないことを確認しました。登録・購入やAPIへの質問送信は行っていません。
