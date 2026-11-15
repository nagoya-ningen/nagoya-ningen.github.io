#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Render the curated, source-backed guide. No network or third-party packages."""
import collections
import html
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "https://nagoya-ningen.pages.dev"
DATE = ""
STATUSES = {"review": "見直し", "planning": "計画・準備", "construction": "工事", "open": "完成・供用"}
e = lambda value: html.escape(str(value), quote=True)


def load_data():
    global DATE
    data = json.loads((ROOT / "data/redevelopment.json").read_text())
    DATE = data["updatedAt"]
    assert re.fullmatch(r"\d{4}-\d{2}-\d{2}", DATE)
    ids = set()
    for p in data["projects"]:
        assert re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", p["id"]), p["id"]
        assert p["id"] not in ids, "Duplicate project"
        ids.add(p["id"])
        assert p["status"] in STATUSES
        for key in ("title", "area", "ward", "category", "statusLabel", "schedule", "summary", "livingImpact", "uncertainty", "operator", "scale", "checkedAt"):
            assert isinstance(p[key], str) and p[key].strip(), (p["id"], key)
        assert p["officialSources"], p["id"]
        for s in p["officialSources"]:
            assert s["url"].startswith("https://") and s["verifiedFact"]
        for m in p["milestones"]:
            assert m["kind"] in ("actual", "planned", "undated")
    return data


def site_chrome():
    home = (ROOT / "index.html").read_text()
    header = re.search(r'<header class="site-header">.*?</header>', home, re.S).group()
    footer = re.search(r'<footer id="footer".*?</footer>', home, re.S).group()
    for old, new in [('src="img/', 'src="/img/'), ('href="img/', 'href="/img/')]:
        header, footer = header.replace(old, new), footer.replace(old, new)
    return header, footer


def page(title, description, path, body, schema, interactive=False):
    header, footer = site_chrome()
    structured = json.dumps({"@context": "https://schema.org", "@graph": schema}, ensure_ascii=False).replace("<", "\\u003c")
    return f'''<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{e(title)}</title><meta name="description" content="{e(description)}"><meta name="theme-color" content="#f5f5f1">
<link rel="canonical" href="{ORIGIN}{path}"><meta property="og:type" content="website"><meta property="og:site_name" content="ナゴヤ人間"><meta property="og:locale" content="ja_JP">
<meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(description)}"><meta property="og:url" content="{ORIGIN}{path}">
<meta property="og:image" content="{ORIGIN}/img/og/og-card.png"><meta property="og:image:alt" content="ナゴヤ人間"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:site" content="@nagoya_ningen">
<link rel="icon" href="/img/favicon-32.png"><link rel="apple-touch-icon" href="/img/apple-touch-icon.png"><link rel="stylesheet" href="/css/brand.css"><link rel="stylesheet" href="/css/motion.css"><link rel="stylesheet" href="/css/redevelopment.css">
<script type="application/ld+json">{structured}</script>
<noscript><style>@media(max-width:800px){{.mobile-menu[hidden]{{display:block!important}}.menu-toggle{{display:none}}}}</style></noscript>
<script src="/js/analytics.js" data-measurement-id="G-PYK6WPKHNY" defer></script></head>
<body class="redevelopment-page"><a class="skip-link" href="#main-content">本文へ移動</a>{header}
<main id="main-content" tabindex="-1" class="city-guide">{body}</main>{footer}<script src="/js/brand.js" defer></script>
{'<script type="module" src="/js/redevelopment.mjs"></script>' if interactive else ''}</body></html>'''


def breadcrumbs(items):
    return '<nav class="guide-breadcrumb" aria-label="パンくずリスト"><ol>' + ''.join(f'<li><a href="{e(url)}">{e(name)}</a></li>' if url else f'<li aria-current="page">{e(name)}</li>' for name, url in items) + '</ol></nav>'


def crumb_schema(items):
    return {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": n + 1, "name": name, "item": ORIGIN + url} for n, (name, url) in enumerate(items)]}


def badge(p):
    return f'<span class="status-badge status-{p["status"]}"><i aria-hidden="true"></i>{e(p["statusLabel"])}</span>'


def card(p, n):
    return f'''<article class="project-card" data-project-id="{p['id']}" id="project-{p['id']}">
<div class="project-top"><span class="project-number">{n:02}</span><span class="project-location">{e(p['area'])} <span> / {e(p['ward'])}</span></span>{badge(p)}</div>
<p class="project-category">{e(p['category'])}</p><h3><a href="/redevelopment/{p['id']}/">{e(p['title'])}<span aria-hidden="true">↗</span></a></h3>
<p class="project-summary">{e(p['summary'])}</p><dl class="project-key"><dt>いつ変わる？</dt><dd>{e(p['schedule'])}</dd><dt>暮らしとの接点</dt><dd>{e(p['livingImpact'])}</dd></dl>
<p class="project-caveat"><span>確認したいこと</span>{e(p['uncertainty'])}</p>
<div class="project-bottom"><a class="guide-link" href="/redevelopment/{p['id']}/">資料と変更履歴 <span aria-hidden="true">→</span></a><span>確認 <time datetime="{p['checkedAt']}">{p['checkedAt'].replace('-', '.')}</time></span></div>
<div class="project-tools enhancement-only"><button type="button" data-save="{p['id']}" aria-pressed="false" aria-label="{e(p['title'])}を保存">＋ 気になる</button><button type="button" data-compare="{p['id']}" aria-pressed="false" aria-label="{e(p['title'])}を比較に追加">比較に追加</button></div></article>'''


def date_sort(value):
    """Place broad seasons in the year, without inventing an exact public date."""
    year = re.match(r'^(\d{4})', value)
    if not year:
        return (9999, 99, value)
    month = re.match(r'^\d{4}-(\d{2})', value)
    if month:
        return (int(year[1]), int(month[1]), value)
    bucket = next((n for word, n in [('初頭', 1), ('春', 3), ('夏', 6), ('秋', 9), ('冬', 12), ('年度', 4)] if word in value), 1)
    return (int(year[1]), bucket, value)


def timeline(projects):
    groups = collections.defaultdict(list)
    for p in projects:
        for m in p['milestones']:
            year = m['date'][:4] if re.match(r'^\d{4}', m['date']) else '時期未定'
            groups[year].append((p, m))
    content = ''
    for year in sorted(groups, key=lambda x: (x == '時期未定', x)):
        rows = ''
        for p, m in sorted(groups[year], key=lambda x: date_sort(x[1]['date'])):
            kind = {'actual': '実績・公表', 'planned': '予定', 'undated': '未定'}[m['kind']]
            rows += f'<li data-timeline-project="{p["id"]}"><div><span class="milestone-kind kind-{m["kind"]}">{kind}</span><span>{e(m["date"])}</span></div><a href="/redevelopment/{p["id"]}/">{e(p["title"])}</a><p>{e(m["label"])}</p></li>'
        content += f'<section class="timeline-group" data-timeline-group><h3>{year}</h3><ol>{rows}</ol></section>'
    return content


def detail(p, data):
    path = f'/redevelopment/{p["id"]}/'
    changes = ''.join(f'<p><time datetime="{e(c["date"])}">{e(c["date"])}</time> — {e(c["summary"])}</p>' for c in p["changes"])
    sources = ''.join(f'<li id="source-{n}"><a href="{e(s["url"])}" rel="noopener">{e(s["title"])} <span aria-hidden="true">↗</span></a><p class="source-date">資料の公表・更新：{e(s.get("publishedAt") or "日付記載なし")} ／ 確認：{p["checkedAt"]}</p><p>{e(s["verifiedFact"])}</p></li>' for n, s in enumerate(p['officialSources'], 1))
    milestones = ''.join(f'<li><span>{e(m["date"])} · { {"actual":"実績・公表", "planned":"予定", "undated":"未定"}[m["kind"]] }</span><p>{e(m["label"])}</p></li>' for m in p['milestones'])
    related = [q for q in data['projects'] if q['id'] != p['id'] and (q['area'] == p['area'] or q['category'] == p['category'])][:3]
    related_html = ''.join(f'<a href="/redevelopment/{q["id"]}/"><span>{e(q["area"])}</span><b>{e(q["title"])}</b><span aria-hidden="true">→</span></a>' for q in related)
    deep_link = '<p class="detail-deep"><a href="/topics/meieki-redevelopment/">名鉄・リニア・駅前広場をまとめて読む。名古屋駅再開発の詳しい特集 →</a></p>' if p['area'] == '名駅・ささしま' else ''
    body = breadcrumbs([('ホーム', '/'), ('再開発ガイド', '/redevelopment/'), (p['title'], None)]) + f'''
<article><header class="detail-header"><p class="guide-kicker">CITY FILE / {e(p['area'])}</p>{badge(p)}<h1>{e(p['title'])}</h1><p class="detail-lead">{e(p['summary'])}</p><p class="guide-meta">資料確認日 <time datetime="{p['checkedAt']}">{p['checkedAt']}</time> · {e(p['ward'])} · {e(p['category'])}</p><p class="freshness-note" data-checked-at="{p['checkedAt']}">以下は記載した資料の確認時点の情報です。予定は変更されることがあります。</p></header>
<div class="detail-layout"><div class="detail-main"><section id="current"><p class="guide-kicker">01 / CURRENT STATUS</p><h2>決まっていること、<br>まだ分からないこと。</h2><dl class="detail-facts"><dt>現在の段階</dt><dd>{e(p['statusLabel'])}</dd><dt>時期・工程</dt><dd>{e(p['schedule'])}</dd><dt>事業者・主体</dt><dd>{e(p['operator'])}</dd><dt>用途・規模</dt><dd>{e(p['scale'])}</dd></dl><aside class="uncertainty-box"><h3>未定事項・次に確認したいこと</h3><p>{e(p['uncertainty'])}</p></aside></section>
<section id="life"><p class="guide-kicker">02 / EVERYDAY LIFE</p><h2>暮らしから見ると。</h2><p>{e(p['livingImpact'])}</p><p class="editorial-note">暮らしへの接点は、確認できた計画・施設内容をもとに編集部が整理しています。所要時間の短縮、地価・賃料の変化、経済効果を保証するものではありません。</p>{deep_link}</section>
<section id="history"><p class="guide-kicker">03 / TIMELINE</p><h2>発表と工程を、つないで読む。</h2><p class="section-note">「実績・公表」と「予定」を分けています。個別施設や工区の時期を、事業全体の完成日と読み替えません。</p><ol class="detail-timeline">{milestones}</ol></section>
<section id="sources"><p class="guide-kicker">04 / PRIMARY SOURCES</p><h2>確認に使った一次資料。</h2><p class="section-note">各リンクの下に、その資料で確かめた内容を記載しています。</p><ol class="source-list">{sources}</ol></section>
<section id="changes"><h2>このページの変更履歴</h2>{changes}<p><a class="guide-link" href="/contact">誤り・追加情報を編集部へ知らせる →</a></p></section></div>
<aside class="detail-sidebar"><p class="guide-kicker">IN THIS FILE</p><nav aria-label="ページ内目次"><a href="#current">計画の現在地</a><a href="#life">暮らしとの接点</a><a href="#history">発表と工程</a><a href="#sources">公式資料 {len(p['officialSources'])}件</a></nav><a class="guide-button" href="/redevelopment/?compare={p['id']}#compare-panel">ほかの計画と比べる →</a><a class="guide-link" href="/redevelopment/">全計画の一覧に戻る</a></aside></div></article>
<section class="related-projects"><p class="guide-kicker">KEEP EXPLORING</p><h2>つながる街の変化。</h2><div>{related_html}</div></section>
'''
    schema = [{"@type": "WebPage", "@id": ORIGIN + path, "url": ORIGIN + path, "name": p['title'], "description": p['summary'], "inLanguage": "ja", "dateModified": DATE, "isPartOf": {"@id": ORIGIN + '/redevelopment/'}, "publisher": {"@id": ORIGIN + '/#organization'}}, crumb_schema([('ホーム', '/'), ('再開発ガイド', '/redevelopment/'), (p['title'], path)])]
    target = ROOT / path.strip('/') / 'index.html'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(page(p['title'] + 'の現在地・予定と出典｜ナゴヤ人間', p['summary'] + ' ' + p['schedule'] + ' 一次資料、工程の変更、暮らしとの接点を確認できます。', path, body, schema))


def hub(data):
    projects = data['projects']
    updates = ''.join(f'<div><time datetime="{e(c["date"])}">{e(c["date"])}</time><p>{e(c["summary"])}</p></div>' for c in data['updates'])
    areas = list(dict.fromkeys(p['area'] for p in projects))
    categories = list(dict.fromkeys(p['category'] for p in projects))
    option = lambda values: ''.join(f'<option value="{e(x)}">{e(x)}</option>' for x in values)
    counts = collections.Counter(p['status'] for p in projects)
    stats = ''.join(f'<a href="?status={s}#explore"><b>{counts[s]:02}</b><span>{label}</span></a>' for s, label in STATUSES.items())
    area_links = ''.join(f'<a href="?area={e(a)}#explore">{e(a)}<span>{sum(p["area"] == a for p in projects):02}</span></a>' for a in areas)
    embedded = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c').replace('&', '\\u0026')
    body = breadcrumbs([('ホーム', '/'), ('再開発ガイド', None)]) + f'''
<header class="guide-hero"><div><p class="guide-kicker"><span class="guide-live-dot" aria-hidden="true"></span> NAGOYA CITY / DEVELOPMENT GUIDE</p><h1>名古屋の次を、<br>見渡そう<span>。</span></h1><p class="guide-subtitle">名古屋の再開発・街の変化ガイド</p><p class="guide-lead">あの場所は、どう変わる？ いつ変わる？<br>ビルも、駅も、公園も。計画の現在地と、<br class="desktop-only">暮らしへのつながりを、一次資料から。</p><div class="hero-guide-actions"><a class="guide-button" href="#explore">計画を探す <span aria-hidden="true">↓</span></a><a class="guide-link" href="#guide-method">収録範囲と読み方</a></div></div>
<aside class="guide-index-panel" aria-label="収録計画の概要"><div class="index-panel-heading"><span>CITY INDEX</span><span>VOL. 01</span></div><p class="index-total"><strong>{len(projects)}</strong><span>の計画・施設を<br>ひとつの場所に。</span></p><div class="index-stats">{stats}</div><p class="index-footnote">発表済みの計画から、開業後の変化まで。<br>「予定」と「実績」を分けて掲載。</p></aside></header>
<div class="guide-dateline"><span>資料確認 <time datetime="{DATE}">{DATE.replace('-', '.')}</time></span><span>{len(areas)}エリア / 公式出典付き</span><a href="#updates">更新履歴を見る ↗</a></div>
<section class="guide-highlights" aria-labelledby="highlights-title"><div><p class="guide-kicker">READ THIS FIRST</p><h2 id="highlights-title">まず知りたい、<br>計画の現在地。</h2></div><div class="highlight-items">{''.join(f'<a href="/redevelopment/{p["id"]}/"><span>{e(p["area"])} · {e(p["statusLabel"])}</span><h3>{e(p["title"])}</h3><p>{e(p["schedule"])}</p><b aria-hidden="true">↗</b></a>' for p in [next(x for x in projects if x['id'] == item) for item in data['featured']])}</div></section>
<nav class="area-strip" aria-label="エリアから探す">{area_links}</nav>
<section id="explore" class="guide-explore" aria-labelledby="explore-title"><div class="explore-heading"><div><p class="guide-kicker">EXPLORE THE CITY</p><h2 id="explore-title">気になる変化を、探す。</h2></div><div class="view-switch enhancement-only" role="group" aria-label="表示形式"><button type="button" data-view="cards" aria-pressed="true">一覧</button><button type="button" data-view="timeline" aria-pressed="false">年表</button></div></div>
<div class="enhancement-only filter-panel"><form id="project-form" role="search" aria-label="再開発計画を検索"><label class="guide-search-label" for="project-query">施設名・駅・気になる言葉</label><div class="guide-search"><span aria-hidden="true">⌕</span><input id="project-query" name="q" type="search" maxlength="120" placeholder="例：名駅、金山、公園" autocomplete="off"><button type="submit">検索</button></div><div class="guide-filters"><label>エリア<select name="area"><option value="">すべてのエリア</option>{option(areas)}</select></label><label>進み具合<select name="status"><option value="">すべての段階</option>{''.join(f'<option value="{k}">{v}</option>' for k,v in STATUSES.items())}</select></label><label>種類<select name="category"><option value="">すべての種類</option>{option(categories)}</select></label><label>並び順<select name="sort"><option value="area">エリア順</option><option value="checked">確認日の新しい順</option></select></label></div></form><div class="filter-bottom"><label class="saved-toggle"><input id="saved-only" type="checkbox">気になる計画だけ</label><button class="text-button" type="button" data-reset>条件をクリア</button><button class="text-button" id="copy-link" type="button">この条件のURLをコピー ↗</button></div><div id="compare-summary" hidden><span id="compare-summary-count"></span><a class="guide-link" href="#compare-panel">比較を見る ↓</a></div><p id="share-message" class="tool-message" role="status"></p><input id="share-url" aria-label="共有するURL" readonly hidden><p class="local-save-note">「気になる」はこのブラウザに保存します。通知・会員登録はありません。共有URLには検索条件と比較対象が含まれます。</p></div>
<noscript><p class="noscript-note">すべての計画を表示しています。各詳細ページと公式資料をそのまま読めます。検索・比較・保存にはJavaScriptを有効にしてください。</p></noscript>
<div class="result-heading"><p id="project-count" role="status" aria-live="polite" aria-atomic="true">{len(projects)}件の計画・施設</p><p>各計画の資料確認日を掲載</p></div>
<p class="freshness-note" id="guide-freshness" data-checked-at="{DATE}">自動更新ではありません。最新の発表は各案件の公式資料もご確認ください。</p>
<div id="empty-results" class="empty-results" hidden><h3>条件に合う計画が見つかりません。</h3><p>言葉を短くするか、エリア・進み具合の条件を減らしてください。</p><button type="button" data-reset>条件をクリアしてすべて見る</button></div>
<div id="project-grid" class="project-grid">{''.join(card(p,n) for n,p in enumerate(projects,1))}</div>
<div id="project-timeline" class="project-timeline" hidden><p class="timeline-intro">公表・開業の実績と今後の予定を並べています。年度・季節表記には時期の幅があります。年が同じでも事業ごとに段階は異なり、予定の到来だけで完成・開業とは扱いません。</p>{timeline(projects)}</div></section>
<section id="compare-panel" class="compare-panel" aria-labelledby="compare-title" hidden><div class="explore-heading"><div><p class="guide-kicker">SIDE BY SIDE</p><h2 id="compare-title">計画を、並べて読む。</h2></div><button class="text-button" type="button" data-clear-compare>比較をクリア</button></div><p id="compare-message" role="status" aria-live="polite"></p><div id="compare-content"></div></section>
<section class="guide-method" id="guide-method"><div><p class="guide-kicker">ABOUT THIS GUIDE</p><h2>変化の大きさより、<br>暮らしとの近さ。</h2><p>通勤の道、週末の行き先、街に残る場所。計画を知ることを、名古屋での日々を考える手がかりに。</p><a class="guide-link" href="/topics/meieki-redevelopment/">名古屋駅の詳しい特集を読む →</a></div><div class="method-notes"><details open><summary>どこまで収録していますか？</summary><p>名古屋市内の主要な再開発、駅・交通、公園・公共施設、水辺の整備を対象に、公式資料で確認できた{len(projects)}件を掲載しています。すべての建築計画や全16区を網羅するものではなく、小規模住宅や単店の開店情報は原則対象外です。開業済み施設も街の変化を追うため残しています。</p></details><details><summary>「進み具合」と日付の読み方</summary><p>見直し／計画・準備／工事／完成・供用の4区分は編集上の分類です。複数の段階を持つ案件はラベルと本文で説明しています。資料の公表日、編集部が読んだ確認日、将来の予定日を区別し、旧計画の年度を現行の完成年と扱いません。</p></details><details><summary>情報の確認と訂正について</summary><p>自治体・事業者・施設公式の資料に直接リンクし、何を確かめたかを案件別に残します。公表のない内容は推測で埋めません。確認日の後に変更される場合があります。</p><a class="guide-link" href="/contact">誤り・追加情報を知らせる →</a></details></div></section>
<section class="guide-updates" id="updates"><p class="guide-kicker">EDITOR'S LOG</p><h2>ガイドの更新履歴</h2>{updates}</section>
<section class="guide-letter"><p class="guide-kicker">LETTERS FROM NAGOYA</p><h2>変わる街の、背景まで。</h2><p>再開発の背景や、名古屋を読む視点をニュースレターで。</p><a class="guide-button" href="https://nagoyaningen.substack.com/">無料ニュースレターを読む ↗</a></section>
<script type="application/json" id="redevelopment-data">{embedded}</script>'''
    schema = [{"@type":"CollectionPage", "@id": ORIGIN + '/redevelopment/', "url":ORIGIN + '/redevelopment/', "name":"名古屋の再開発・街の変化ガイド", "description":"名古屋の主要な再開発、駅、公園、公共施設の計画を公式資料で確認し、工程と暮らしへの接点から比較するガイド。", "dateModified":DATE, "inLanguage":"ja", "publisher":{"@id": ORIGIN + '/#organization'}, "mainEntity":{"@type":"ItemList", "numberOfItems":len(projects), "itemListElement":[{"@type":"ListItem", "position":n+1, "name":p['title'], "url": ORIGIN + '/redevelopment/' + p['id'] + '/'} for n,p in enumerate(projects)]}}, crumb_schema([('ホーム','/'),('再開発ガイド','/redevelopment/')])]
    (ROOT / 'redevelopment/index.html').write_text(page('名古屋の再開発ガイド｜計画・時期・変化を比較｜ナゴヤ人間', f'名駅・栄・金山・港など名古屋の主要{len(projects)}計画を、一次資料と確認日付きで整理。再開発、駅、公園、公共施設の現在地と未定事項を、地域・進捗・年表から探して比較できます。', '/redevelopment/', body, schema, True))


def sitemap(data):
    ns = 'http://www.sitemaps.org/schemas/sitemap/0.9'
    ET.register_namespace('', ns)
    path = ROOT / 'sitemap.xml'
    tree = ET.parse(path)
    root = tree.getroot()
    for item in list(root):
        if '/redevelopment/' in item.find(f'{{{ns}}}loc').text:
            root.remove(item)
    for entry in root:
        if entry.find(f'{{{ns}}}loc').text in [ORIGIN + '/', ORIGIN + '/annai/', ORIGIN + '/news']:
            modified = entry.find(f'{{{ns}}}lastmod')
            if modified is None:
                modified = ET.SubElement(entry, f'{{{ns}}}lastmod')
            modified.text = DATE
    for url in ['/redevelopment/'] + ['/redevelopment/' + p['id'] + '/' for p in data['projects']]:
        entry = ET.SubElement(root, f'{{{ns}}}url')
        ET.SubElement(entry, f'{{{ns}}}loc').text = ORIGIN + url
        ET.SubElement(entry, f'{{{ns}}}lastmod').text = DATE
    ET.indent(tree, space='  ')
    tree.write(path, encoding='UTF-8', xml_declaration=True)


if __name__ == '__main__':
    data = load_data()
    hub(data)
    for project in data['projects']:
        detail(project, data)
    sitemap(data)
    print(f'Rendered {len(data["projects"])} projects, guide, and sitemap. No network requests.')
