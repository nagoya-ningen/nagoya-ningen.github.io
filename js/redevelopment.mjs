import { MAX_QUERY_LENGTH, filterProjects, needsFreshnessWarning, normalizeState,
  readState, shareUrl, stateUrl, toggleComparison, uniqueKnownIds } from './redevelopment-core.mjs';

const dataNode = document.querySelector('#redevelopment-data');
const form = document.querySelector('#project-form');
if (dataNode && form) {
  try { initialize(JSON.parse(dataNode.textContent)); }
  catch { /* Static project cards and sources remain available without JS. */ }
}

function initialize(data) {
  if (!Array.isArray(data.projects) || !data.projects.length) return;
  const projects = data.projects;
  const byId = new Map(projects.map(project => [project.id, project]));
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const grid = $('#project-grid');
  const timeline = $('#project-timeline');
  const count = $('#project-count');
  const empty = $('#empty-results');
  const panel = $('#compare-panel');
  const compareContent = $('#compare-content');
  const compareMessage = $('#compare-message');
  const shareMessage = $('#share-message');
  const savedOnly = $('#saved-only');
  if (!grid || !count || !empty || !panel || !compareContent) return;
  const cards = new Map($$('#project-grid [data-project-id]').map(card => [card.dataset.projectId, card]));
  for (const [id, card] of cards) if (!card.id) card.id = `project-${id}`;
  const controls = Object.fromEntries(['q', 'area', 'status', 'category', 'sort']
    .map(key => [key, form.elements.namedItem(key)]));
  if (Object.values(controls).some(control => !control)) return;
  controls.q.maxLength = MAX_QUERY_LENGTH;
  const storageKey = 'nagoya-ningen:redevelopment:saved:v1';
  let storageAvailable = true;
  let saved = [];
  try { saved = uniqueKnownIds(JSON.parse(localStorage.getItem(storageKey) || '[]'), projects); }
  catch { storageAvailable = false; }
  let state = readState(location.search, projects);
  let composing = false;
  let timer;

  const todayParts = Object.fromEntries(new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date()).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  const today = `${todayParts.year}-${todayParts.month}-${todayParts.day}`;
  const freshness = $('#guide-freshness');
  if (freshness && needsFreshnessWarning(data.updatedAt, today)) {
    freshness.classList.add('is-stale');
    const warning = document.createElement('span');
    warning.className = 'freshness-warning';
    warning.textContent = ' 確認日から45日以上経過しています。計画の変更や進捗は、各計画の最新の公式資料も確認してください。';
    freshness.append(warning);
  }

  function notify(message) { if (shareMessage) shareMessage.textContent = message; }
  function writeUrl(mode = 'replace') {
    try {
      const url = stateUrl(location.href, state, projects);
      const normalized = readState(url.search, projects);
      if (normalized.q !== state.q) {
        state.q = normalized.q;
        controls.q.value = state.q;
      }
      if (url.href !== location.href) history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', url.href);
    } catch { notify('このブラウザでは検索条件をURLに保存できません。画面内の検索は使えます。'); }
  }

  function restoreControls() {
    for (const [key, control] of Object.entries(controls)) control.value = state[key];
    if (savedOnly) savedOnly.checked = state.saved;
  }

  function cell(tag, value, parent) {
    const node = document.createElement(tag);
    node.textContent = value || '未掲載';
    parent.append(node);
    return node;
  }

  function renderComparison() {
    const selected = state.compare.map(id => byId.get(id)).filter(Boolean);
    const summary = $('#compare-summary');
    const summaryCount = $('#compare-summary-count');
    if (summary) summary.hidden = !selected.length;
    if (summaryCount) summaryCount.textContent = `${selected.length}/3件を比較に選択中`;
    panel.hidden = !selected.length;
    compareContent.replaceChildren();
    if (compareMessage) compareMessage.textContent = selected.length < 2
      ? `${selected.length}件を選択中。2〜3件を選ぶと、時期・状況・暮らしへの関わりを比較できます。`
      : `${selected.length}件を比較中。予定の確度は「未確定・確認したい点」も合わせて確認してください。`;
    if (!selected.length) return;
    if (selected.length === 1) {
      const item = document.createElement('p');
      item.textContent = `選択中：${selected[0].title} `;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.dataset.compare = selected[0].id;
      remove.setAttribute('aria-pressed', 'true');
      remove.setAttribute('aria-label', `${selected[0].title}を比較から外す`);
      remove.textContent = '比較から外す';
      item.append(remove);
      compareContent.append(item);
      return;
    }
    const table = document.createElement('table');
    table.className = 'compare-table';
    const caption = document.createElement('caption');
    caption.textContent = '選んだ計画の比較';
    table.append(caption);
    const head = document.createElement('thead');
    const headRow = document.createElement('tr');
    cell('th', '項目', headRow).scope = 'col';
    for (const project of selected) {
      const heading = cell('th', project.title, headRow);
      heading.scope = 'col';
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.dataset.compare = project.id;
      remove.setAttribute('aria-pressed', 'true');
      remove.setAttribute('aria-label', `${project.title}を比較から外す`);
      remove.textContent = '比較から外す';
      heading.append(document.createElement('br'), remove);
    }
    head.append(headRow);
    table.append(head);
    const body = document.createElement('tbody');
    for (const [label, key] of [['エリア', 'area'], ['現在の状況', 'statusLabel'], ['時期・工程', 'schedule'],
      ['用途', 'category'], ['事業主体', 'operator'], ['規模', 'scale'], ['暮らしへの関わり', 'livingImpact'],
      ['未確定・確認したい点', 'uncertainty'], ['資料確認日', 'checkedAt']]) {
      const row = document.createElement('tr');
      cell('th', label, row).scope = 'row';
      for (const project of selected) cell('td', project[key], row);
      body.append(row);
    }
    const links = document.createElement('tr');
    cell('th', '出典・詳しい内容', links).scope = 'row';
    for (const project of selected) {
      const td = document.createElement('td');
      const link = document.createElement('a');
      link.href = `/redevelopment/${encodeURIComponent(project.id)}/`;
      link.textContent = '詳細と一次資料へ';
      td.append(link);
      links.append(td);
    }
    body.append(links);
    table.append(body);
    const wrapper = document.createElement('div');
    wrapper.className = 'compare-table-wrap';
    wrapper.tabIndex = 0;
    wrapper.setAttribute('role', 'region');
    wrapper.setAttribute('aria-label', '計画比較表。横にスクロールできます');
    wrapper.append(table);
    compareContent.append(wrapper);
  }

  function render() {
    const visible = filterProjects(projects, state, saved);
    const visibleIds = new Set(visible.map(project => project.id));
    for (const [id, card] of cards) card.hidden = !visibleIds.has(id);
    for (const project of visible) if (cards.has(project.id)) grid.append(cards.get(project.id));
    for (const item of $$('[data-timeline-project]')) item.hidden = !visibleIds.has(item.dataset.timelineProject);
    for (const group of $$('[data-timeline-group]')) {
      group.hidden = ![...group.querySelectorAll('[data-timeline-project]')].some(item => !item.hidden);
    }
    grid.hidden = state.view !== 'cards';
    if (timeline) timeline.hidden = state.view !== 'timeline';
    empty.hidden = visible.length > 0;
    count.textContent = `${projects.length}件中 ${visible.length}件${state.saved ? '（このブラウザで保存した計画）' : ''}`;
    for (const button of $$('[data-view]')) button.setAttribute('aria-pressed', String(button.dataset.view === state.view));
    for (const button of $$('[data-save]')) {
      const isSaved = saved.includes(button.dataset.save);
      button.setAttribute('aria-pressed', String(isSaved));
      button.textContent = isSaved ? '✓ 保存済み' : '＋ 気になる';
      button.setAttribute('aria-label', `${byId.get(button.dataset.save)?.title || 'この計画'}${isSaved ? 'の保存を解除' : 'をこのブラウザに保存'}`);
    }
    renderComparison();
    for (const button of $$('[data-compare]')) {
      const selected = state.compare.includes(button.dataset.compare);
      button.setAttribute('aria-pressed', String(selected));
      if (!button.closest('#compare-panel')) button.textContent = selected ? '比較から外す' : '比較する';
    }
  }

  function readControls(mode = 'replace') {
    clearTimeout(timer);
    state = normalizeState({ ...state,
      ...Object.fromEntries(Object.entries(controls).map(([key, control]) => [key, control.value])),
      saved: savedOnly?.checked || false,
    }, projects);
    writeUrl(mode);
    render();
  }

  controls.q.addEventListener('compositionstart', () => { composing = true; clearTimeout(timer); });
  controls.q.addEventListener('compositionend', () => { composing = false; readControls(); });
  controls.q.addEventListener('input', event => {
    clearTimeout(timer);
    if (!composing && !event.isComposing) timer = setTimeout(() => readControls(), 180);
  });
  form.addEventListener('change', event => { if (event.target !== controls.q) readControls('push'); });
  if (savedOnly && !form.contains(savedOnly)) savedOnly.addEventListener('change', () => readControls('push'));
  form.addEventListener('submit', event => { event.preventDefault(); if (!composing) readControls('push'); });
  window.addEventListener('popstate', () => {
    clearTimeout(timer);
    composing = false;
    state = readState(location.search, projects);
    restoreControls();
    render();
  });
  window.addEventListener('storage', event => {
    if (event.key !== storageKey && event.key !== null) return;
    try { saved = uniqueKnownIds(JSON.parse(event.newValue || '[]'), projects); render(); } catch { /* Retain usable local state. */ }
  });

  document.addEventListener('click', event => {
    const button = event.target.closest?.('button, a[data-show-project]');
    if (!button) return;
    if (button.matches('[data-reset]')) {
      event.preventDefault(); clearTimeout(timer);
      state = normalizeState({ view: state.view, compare: state.compare }, projects);
      restoreControls(); writeUrl('push'); render(); controls.q.focus();
    } else if (button.matches('[data-view]')) {
      state.view = button.dataset.view === 'timeline' ? 'timeline' : 'cards';
      readControls('push');
    } else if (button.matches('[data-save]')) {
      const id = button.dataset.save;
      if (!byId.has(id)) return;
      saved = saved.includes(id) ? saved.filter(value => value !== id) : [...saved, id];
      try { localStorage.setItem(storageKey, JSON.stringify(saved)); storageAvailable = true; }
      catch { storageAvailable = false; }
      notify(storageAvailable ? '保存した計画は、このブラウザで確認できます。' : 'ブラウザへの保存が使えないため、このページを開いている間だけ保持します。');
      render();
      if (button.closest('[hidden]')) {
        if (savedOnly) savedOnly.focus();
        else { count.tabIndex = -1; count.focus(); }
      }
    } else if (button.matches('[data-compare]')) {
      const fromPanel = Boolean(button.closest('#compare-panel'));
      const result = toggleComparison(state.compare, button.dataset.compare, projects);
      state.compare = result.ids;
      writeUrl('push'); render();
      if (result.full) {
        const message = '比較は3件までです。選択中の計画を1件外してから追加してください。';
        if (compareMessage) compareMessage.textContent = message;
        notify(message);
      }
      if (fromPanel) {
        const next = panel.querySelector('[data-compare]') || cards.get(button.dataset.compare)?.querySelector('[data-compare]');
        if (next && !next.closest('[hidden]')) next.focus();
        else { count.tabIndex = -1; count.focus(); }
      }
    } else if (button.matches('[data-clear-compare]')) {
      state.compare = []; writeUrl('push'); render();
      count.tabIndex = -1; count.focus();
    } else if (button.matches('[data-show-project]')) {
      const id = button.dataset.showProject;
      if (!byId.has(id)) return;
      state = normalizeState({ compare: state.compare }, projects);
      restoreControls(); writeUrl('push'); render();
      // Keep native anchor navigation, with a visible focus target after filtering.
      const card = cards.get(id);
      if (card) { card.tabIndex = -1; card.focus({ preventScroll: true }); }
    }
  });

  $('#copy-link')?.addEventListener('click', async () => {
    if (!composing) readControls();
    const field = $('#share-url');
    let value;
    try { value = shareUrl(location.href, state, projects).href; }
    catch { notify('共有URLが長すぎます。検索条件を減らしてください。'); return; }
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(value);
      if (field) field.hidden = true;
      notify(state.saved ? 'URLをコピーしました。「気になる計画だけ」の条件は、このブラウザ専用のため共有URLから外しています。' : '検索条件・比較対象を含むURLをコピーしました。');
    } catch {
      if (field) { field.value = value; field.hidden = false; field.focus(); field.select(); }
      notify('自動コピーを利用できません。表示したURLを選択してコピーしてください。' +
        (state.saved ? '「気になる計画だけ」の条件は、このブラウザ専用のため共有URLから外しています。' : ''));
    }
  });

  restoreControls(); render();
  document.documentElement.classList.add('guide-ready');
  if (!storageAvailable) notify('保存機能は、このページを開いている間だけ利用できます。');
}
