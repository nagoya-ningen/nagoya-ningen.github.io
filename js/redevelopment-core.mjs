export const MAX_QUERY_LENGTH = 160;
export const MAX_COMPARE = 3;
export const MAX_URL_LENGTH = 2000;

export function needsFreshnessWarning(checkedAt, today) {
  function day(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
    const timestamp = Date.parse(`${value}T00:00:00Z`);
    return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value
      ? timestamp / 86400000 : NaN;
  }
  const difference = day(today) - day(checkedAt);
  return Number.isFinite(difference) && difference > 45;
}

export function normalizeText(value = '') {
  return String(value).normalize('NFKC').toLowerCase()
    .replace(/[ァ-ヶ]/g, char => String.fromCharCode(char.charCodeAt(0) - 0x60))
    .replace(/名駅/g, '名古屋駅')
    .replace(/[\p{P}\p{S}]/gu, ' ')
    .replace(/\s+/g, ' ').trim();
}

export function uniqueKnownIds(ids, projects, limit = Infinity) {
  const known = new Set(projects.map(project => project.id));
  return [...new Set(Array.isArray(ids) ? ids : [])]
    .filter(id => typeof id === 'string' && known.has(id)).slice(0, limit);
}

export function normalizeState(input = {}, projects = []) {
  const allowed = field => new Set(projects.map(project => project[field]));
  return {
    q: String(input.q ?? '').slice(0, MAX_QUERY_LENGTH),
    area: allowed('area').has(input.area) ? input.area : '',
    status: allowed('status').has(input.status) ? input.status : '',
    category: allowed('category').has(input.category) ? input.category : '',
    sort: input.sort === 'checked' ? 'checked' : 'area',
    view: input.view === 'timeline' ? 'timeline' : 'cards',
    saved: input.saved === true || input.saved === '1',
    compare: uniqueKnownIds(input.compare, projects, MAX_COMPARE),
  };
}

export function readState(search = '', projects = []) {
  const params = new URLSearchParams(String(search).slice(0, 8000));
  return normalizeState({
    q: params.get('q'), area: params.get('area'), status: params.get('status'),
    category: params.get('category'), sort: params.get('sort'),
    view: params.get('view'), saved: params.get('saved'),
    compare: (params.get('compare') || '').split(','),
  }, projects);
}

export function stateParams(input, projects = []) {
  const state = normalizeState(input, projects);
  const params = new URLSearchParams();
  for (const key of ['q', 'area', 'status', 'category']) {
    if (state[key]) params.set(key, state[key]);
  }
  if (state.sort !== 'area') params.set('sort', state.sort);
  if (state.view !== 'cards') params.set('view', state.view);
  if (state.saved) params.set('saved', '1');
  if (state.compare.length) params.set('compare', state.compare.join(','));
  return params;
}

export function stateUrl(base, input, projects = []) {
  const url = new URL(base);
  const params = stateParams(input, projects);
  url.search = params.toString();
  // Japanese URL encoding is longer than the visible query. Bound the actual
  // share URL, preserving filter and comparison IDs before search text.
  while (url.href.length > MAX_URL_LENGTH && params.get('q')) {
    const query = Array.from(params.get('q'));
    query.pop();
    if (query.length) params.set('q', query.join('')); else params.delete('q');
    url.search = params.toString();
  }
  if (url.href.length > MAX_URL_LENGTH) url.hash = '';
  if (url.href.length > MAX_URL_LENGTH) throw new RangeError('共有URLが長すぎます。条件を減らしてください。');
  return url;
}

export function shareUrl(base, input, projects = []) {
  // Saved IDs belong to the current browser and cannot be restored by a reader
  // opening a shared URL. Keep the local filter, exclude it from the copy.
  return stateUrl(base, { ...input, saved: false }, projects);
}

export function filterProjects(projects, state, savedIds = []) {
  const saved = new Set(savedIds);
  const tokens = normalizeText(state.q).split(' ').filter(Boolean);
  const fields = ['title', 'area', 'ward', 'category', 'statusLabel', 'schedule',
    'summary', 'livingImpact', 'uncertainty', 'operator', 'scale'];
  return projects.filter(project => {
    if (state.area && project.area !== state.area) return false;
    if (state.status && project.status !== state.status) return false;
    if (state.category && project.category !== state.category) return false;
    if (state.saved && !saved.has(project.id)) return false;
    const text = normalizeText([...fields.map(key => project[key] || ''), ...(project.aliases || [])].join(' '));
    return tokens.every(token => text.includes(token));
  }).sort((left, right) => {
    if (state.sort === 'checked') {
      const dateOrder = String(right.checkedAt || '').localeCompare(String(left.checkedAt || ''));
      if (dateOrder) return dateOrder;
    }
    return String(left.area).localeCompare(String(right.area), 'ja') ||
      String(left.title).localeCompare(String(right.title), 'ja') || left.id.localeCompare(right.id);
  });
}

export function toggleComparison(ids, id, projects) {
  const current = uniqueKnownIds(ids, projects, MAX_COMPARE);
  if (current.includes(id)) return { ids: current.filter(value => value !== id), full: false };
  if (!projects.some(project => project.id === id)) return { ids: current, full: false };
  if (current.length >= MAX_COMPARE) return { ids: current, full: true };
  return { ids: [...current, id], full: false };
}
