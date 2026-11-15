export const MAX_QUERY_LENGTH = 160;
export const MAX_COMPARE = 3;
export const MAX_URL_LENGTH = 2000;
export const WARDS = Object.freeze(['千種区', '東区', '北区', '西区', '中村区', '中区', '昭和区', '瑞穂区',
  '熱田区', '中川区', '港区', '南区', '守山区', '緑区', '名東区', '天白区']);
export const PERIOD_LABELS = Object.freeze({ upcoming: '今後・時期確認中の予定', undated: '時期未定・未確認', open: '完成・供用' });

export function todayJst(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}

export function projectWards(project) {
  const supplied = Array.isArray(project.wards) ? project.wards.filter(ward => WARDS.includes(ward)) : [];
  const candidates = supplied.length ? supplied : String(project.ward || '').split(/[・、,\/／\s]+/);
  return WARDS.filter(ward => candidates.includes(ward));
}

/** Latest possible calendar bound for filtering, never a replacement schedule.
 * null means the source does not provide a safely interpretable end bound.
 */
export function plannedPeriodEnd(value) {
  if (typeof value !== 'string') return null;
  const text = value.normalize('NFKC').replace(/\s/g, '').replace(/(?:予定|見込み|目標)$/, '');
  if (/以降|以後|未定|未確定|未公表/.test(text)) return null;
  const lastDay = (year, month) => {
    if (year < 1000 || year > 9998 || month < 1 || month > 12) return null;
    return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  };
  let match = text.match(/^(\d{4})(?:年度|年)?[〜～~–—](\d{4})(年度|年)?$/);
  if (match) return Number(match[1]) <= Number(match[2])
    ? lastDay(Number(match[2]) + (match[3] === '年度' ? 1 : 0), match[3] === '年度' ? 3 : 12) : null;
  const range = text.split(/[〜～~–—]/);
  if (range.length === 2) {
    const start = plannedPeriodEnd(range[0]);
    const end = plannedPeriodEnd(range[1]);
    return start && end && start <= end ? end : null;
  }
  match = text.match(/^(\d{4})年度$/);
  if (match) return lastDay(Number(match[1]) + 1, 3);
  match = text.match(/^(\d{4})年?(春|夏|秋|冬)$/);
  if (match) return lastDay(Number(match[1]) + (match[2] === '冬' ? 1 : 0), { 春: 5, 夏: 8, 秋: 11, 冬: 2 }[match[2]]);
  // Early/mid/late year deliberately retains the whole year as a conservative
  // outer bound; it does not assert an exact month for vague source language.
  match = text.match(/^(\d{4})(?:年(?:初頭|前半|後半|末|頃)?|)$/);
  if (match) return lastDay(Number(match[1]), 12);
  match = text.match(/^(\d{4})(?:-|年)(\d{1,2})(?:-|月)(\d{1,2})日?$/);
  if (match) {
    const date = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
    return validDate(date) ? date : null;
  }
  match = text.match(/^(\d{4})(?:-|年)(\d{1,2})月?$/);
  return match ? lastDay(Number(match[1]), Number(match[2])) : null;
}

export function matchesPeriod(project, period, { today } = {}) {
  const milestones = Array.isArray(project.milestones) ? project.milestones : [];
  if (period === 'open') return project.status === 'open';
  if (period === 'undated') return milestones.some(item => item.kind === 'undated' ||
    (item.kind === 'planned' && /未定|未確定|未公表/.test(String(item.date))));
  if (period === 'upcoming') {
    const reference = validDate(today) ? today : todayJst();
    return milestones.some(item => {
      if (item.kind !== 'planned') return false;
      const end = plannedPeriodEnd(item.date);
      return end === null || end >= reference;
    });
  }
  return true;
}

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
    ward: WARDS.includes(input.ward) ? input.ward : '',
    period: Object.hasOwn(PERIOD_LABELS, input.period) ? input.period : '',
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
    q: params.get('q'), area: params.get('area'), ward: params.get('ward'),
    period: params.get('period'), status: params.get('status'),
    category: params.get('category'), sort: params.get('sort'),
    view: params.get('view'), saved: params.get('saved'),
    compare: (params.get('compare') || '').split(','),
  }, projects);
}

export function stateParams(input, projects = []) {
  const state = normalizeState(input, projects);
  const params = new URLSearchParams();
  for (const key of ['q', 'area', 'ward', 'period', 'status', 'category']) {
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

export function filterProjects(projects, state, savedIds = [], options = {}) {
  const saved = new Set(savedIds);
  const tokens = normalizeText(state.q).split(' ').filter(Boolean);
  const fields = ['title', 'area', 'ward', 'category', 'statusLabel', 'schedule',
    'summary', 'livingImpact', 'uncertainty', 'operator', 'scale'];
  return projects.filter(project => {
    if (state.area && project.area !== state.area) return false;
    if (state.ward && !projectWards(project).includes(state.ward)) return false;
    if (!matchesPeriod(project, state.period, options)) return false;
    if (state.status && project.status !== state.status) return false;
    if (state.category && project.category !== state.category) return false;
    if (state.saved && !saved.has(project.id)) return false;
    const text = normalizeText([...fields.map(key => project[key] || ''), ...projectWards(project), ...(project.aliases || [])].join(' '));
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
