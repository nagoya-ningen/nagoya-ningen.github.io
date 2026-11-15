import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeText, normalizeState, needsFreshnessWarning, readState, shareUrl, stateParams, stateUrl,
  filterProjects, matchesPeriod, plannedPeriodEnd, projectWards, todayJst, toggleComparison, uniqueKnownIds,
  MAX_URL_LENGTH, WARDS } from '../js/redevelopment-core.mjs';

const projects = [
  { id: 'station', title: '名古屋駅の再整備', area: '名駅', status: 'review', statusLabel: '見直し', category: '駅', summary: 'バスと歩行者の移動', checkedAt: '2026-11-16', aliases: ['名鉄'] },
  { id: 'park', title: 'ヒサヤの公園', area: '栄', status: 'open', statusLabel: '供用中', category: '公園', livingImpact: '歩行者の休憩場所', checkedAt: '2026-10-01', aliases: ['Hisaya Park'] },
  { id: 'hall', title: '金山ホール', area: '金山', status: 'planning', statusLabel: '計画', category: '文化', operator: '名古屋市', checkedAt: '2026-11-10', aliases: [] },
  { id: 'office', title: '栄オフィス', area: '栄', status: 'construction', statusLabel: '工事中', category: '業務', checkedAt: '2026-11-15', aliases: [] },
];
const state = input => normalizeState(input, projects);

test('Japanese kana, full width, Latin case, and Meieki aliases normalize', () => {
  assert.equal(normalizeText('名駅 ＡＢＣ ヒサヤ'), normalizeText('名古屋駅 abc ひさや'));
  assert.equal(filterProjects(projects, state({ q: '名駅' }))[0].id, 'station');
  assert.equal(filterProjects(projects, state({ q: 'ひさや' }))[0].id, 'park');
});
test('space-separated terms must all match, including aliases and living impact', () => {
  assert.deepEqual(filterProjects(projects, state({ q: '名鉄 歩行者' })).map(p => p.id), ['station']);
  assert.equal(filterProjects(projects, state({ q: '名鉄 公園' })).length, 0);
  assert.deepEqual(filterProjects(projects, state({ q: 'ＨＩＳＡＹＡ 休憩' })).map(p => p.id), ['park']);
});
test('area, status and category are simultaneous exact filters', () => {
  assert.deepEqual(filterProjects(projects, state({ area: '栄', status: 'open', category: '公園' })).map(p => p.id), ['park']);
  assert.equal(filterProjects(projects, state({ area: '栄', status: 'open', category: '業務' })).length, 0);
});
test('saved-only depends on this browser records and combines with other filters', () => {
  assert.equal(filterProjects(projects, state({ saved: true }), []).length, 0);
  assert.deepEqual(filterProjects(projects, state({ saved: true, area: '栄' }), ['station', 'park']).map(p => p.id), ['park']);
});
test('latest verification sorting is descending without changing source data', () => {
  const original = projects.map(p => p.id);
  assert.deepEqual(filterProjects(projects, state({ sort: 'checked' })).map(p => p.id), ['station', 'office', 'hall', 'park']);
  assert.deepEqual(projects.map(p => p.id), original);
});
test('URL state roundtrip retains filters, view, saved mode and comparison', () => {
  const expected = state({ q: '歩行者 公園', area: '栄', status: 'open', category: '公園', sort: 'checked', view: 'timeline', saved: true, compare: ['station', 'park'] });
  assert.deepEqual(readState(stateParams(expected, projects).toString(), projects), expected);
});
test('unknown URL filters, invalid view and comparison IDs cannot poison state', () => {
  const result = readState('?area=UNKNOWN&status=future&category=nope&view=evil&sort=evil&compare=station,evil,park,station,hall,office', projects);
  assert.equal(result.area, ''); assert.equal(result.status, ''); assert.equal(result.category, '');
  assert.equal(result.view, 'cards'); assert.equal(result.sort, 'area');
  assert.deepEqual(result.compare, ['station', 'park', 'hall']);
});
test('comparison cap does not silently replace existing selections', () => {
  assert.deepEqual(toggleComparison(['station', 'park', 'hall'], 'office', projects), { ids: ['station', 'park', 'hall'], full: true });
  assert.deepEqual(toggleComparison(['station', 'park', 'hall'], 'park', projects), { ids: ['station', 'hall'], full: false });
  assert.deepEqual(toggleComparison([], 'unknown', projects), { ids: [], full: false });
});
test('restored browser saved data keeps unique known strings only', () => {
  assert.deepEqual(uniqueKnownIds(['station', null, 1, 'park', 'station', 'removed'], projects), ['station', 'park']);
  assert.deepEqual(uniqueKnownIds({ id: 'station' }, projects), []);
});
test('share URLs clear unrelated query values and preserve valid anchor', () => {
  const url = stateUrl('https://example.test/redevelopment/?private=secret#project-station', state({ q: '名駅', compare: ['station', 'park'] }), projects);
  assert.equal(url.searchParams.has('private'), false);
  assert.equal(url.hash, '#project-station');
  assert.equal(url.searchParams.get('compare'), 'station,park');
});
test('long encoded queries stay within limit and cannot throw for Unicode', () => {
  const url = stateUrl('https://example.test/redevelopment/', state({ q: '再開発🏙️'.repeat(100) }), projects);
  assert.ok(url.href.length <= MAX_URL_LENGTH);
  assert.ok(url.searchParams.get('q').length <= 160);
});
test('defaults and empty queries return all projects with no URL clutter', () => {
  assert.equal(filterProjects(projects, state({ q: ' 　' })).length, projects.length);
  assert.equal(stateParams(state({}), projects).toString(), '');
});

test('freshness notice uses elapsed calendar days and excludes future or invalid dates', () => {
  assert.equal(needsFreshnessWarning('2026-10-02', '2026-11-16'), false);
  assert.equal(needsFreshnessWarning('2026-10-01', '2026-11-16'), true);
  assert.equal(needsFreshnessWarning('2026-11-17', '2026-11-16'), false);
  assert.equal(needsFreshnessWarning('2026-02-30', '2026-11-16'), false);
  assert.equal(needsFreshnessWarning(null, '2026-11-16'), false);
});

test('shared URL excludes browser-private saved filter without changing local state', () => {
  const current = state({ saved: true, q: '名駅', compare: ['station', 'park'], view: 'timeline' });
  const shared = shareUrl('https://example.test/redevelopment/?saved=1', current, projects);
  assert.equal(shared.searchParams.has('saved'), false);
  assert.equal(shared.searchParams.get('q'), '名駅');
  assert.equal(shared.searchParams.get('compare'), 'station,park');
  assert.equal(shared.searchParams.get('view'), 'timeline');
  assert.equal(current.saved, true);
  assert.equal(stateUrl('https://example.test/redevelopment/', current, projects).searchParams.get('saved'), '1');
});

test('ward extraction prefers arrays and separates multi-ward labels without substring matches', () => {
  assert.equal(WARDS.length, 16);
  assert.deepEqual(WARDS.slice(0, 6), ['千種区', '東区', '北区', '西区', '中村区', '中区']);
  assert.deepEqual(projectWards({ wards: ['中川区', '中村区', '中川区'], ward: '中区' }), ['中村区', '中川区']);
  assert.deepEqual(projectWards({ ward: '中川区・中村区' }), ['中村区', '中川区']);
  assert.deepEqual(projectWards({ ward: '中村区 / 港区' }), ['中村区', '港区']);
  assert.deepEqual(projectWards({ ward: '中村区' }).includes('中区'), false);
});

test('ward and period survive URL roundtrip; valid empty-coverage wards do not silently broaden results', () => {
  const expected = state({ ward: '天白区', period: 'upcoming', compare: ['station'], view: 'timeline' });
  assert.deepEqual(readState(stateParams(expected, projects).toString(), projects), expected);
  assert.equal(filterProjects(projects, expected, [], { today: '2026-11-16' }).length, 0);
  assert.equal(readState('?ward=名古屋区&period=finished', projects).ward, '');
  assert.equal(readState('?ward=名古屋区&period=finished', projects).period, '');
});

test('ward, search, status and category combine and wards array participates in full text search', () => {
  const records = [
    { ...projects[0], wards: ['中村区', '中川区'], milestones: [{ kind: 'planned', date: '2027年度' }] },
    { ...projects[1], wards: ['中区'], milestones: [{ kind: 'actual', date: '2024-01-01' }] },
  ];
  const query = normalizeState({ q: '中川区 歩行者', ward: '中村区', status: 'review', category: '駅', period: 'upcoming' }, records);
  assert.deepEqual(filterProjects(records, query, [], { today: '2026-11-16' }).map(p => p.id), ['station']);
  assert.equal(filterProjects(records, { ...query, ward: '中区' }, [], { today: '2026-11-16' }).length, 0);
});

test('planned period bounds respect months, fiscal years, seasons and ranges', () => {
  for (const [input, expected] of [
    ['2028-02', '2028-02-29'], ['2027年7月1日', '2027-07-01'],
    ['2026年度', '2027-03-31'], ['2027〜2028年度', '2029-03-31'],
    ['2027〜2028年', '2028-12-31'], ['2027年春', '2027-05-31'],
    ['2027年秋', '2027-11-30'], ['2027年冬', '2028-02-29'],
    ['2028年初頭', '2028-12-31'], ['2027-04-01〜2027-06-30', '2027-06-30'],
    ['2029年度以降', null], ['事業者提案による', null], ['2026-02-30', null],
  ]) assert.equal(plannedPeriodEnd(input), expected, input);
});

test('upcoming excludes definite past schedules, includes today and uncertain future windows, never changes source kind', () => {
  const records = ['2026-11-15', '2026-11-16', '2026-11', '2026年度', '2026年春', '2025年初頭', '時期調整中', '2029年度以降']
    .map((date, index) => ({ ...projects[0], id: `period-${index}`, milestones: [{ kind: 'planned', date }] }));
  const before = JSON.stringify(records);
  const result = filterProjects(records, normalizeState({ period: 'upcoming' }, records), [], { today: '2026-11-16' });
  assert.deepEqual(result.map(p => p.id), ['period-1', 'period-2', 'period-3', 'period-6', 'period-7']);
  assert.equal(JSON.stringify(records), before);
  assert.equal(matchesPeriod({ milestones: [{ kind: 'actual', date: '2027-01-01' }] }, 'upcoming', { today: '2026-11-16' }), false);
});

test('undated and open classify documented state rather than elapsed dates', () => {
  assert.equal(matchesPeriod({ status: 'construction', milestones: [{ kind: 'planned', date: '2025-01-01' }] }, 'open'), false);
  assert.equal(matchesPeriod({ status: 'open', milestones: [] }, 'open'), true);
  assert.equal(matchesPeriod({ milestones: [{ kind: 'undated', date: '未定' }] }, 'undated'), true);
  assert.equal(matchesPeriod({ milestones: [{ kind: 'planned', date: '2029年度以降' }] }, 'undated'), false);
});

test('Japan date is stable across the UTC day boundary', () => {
  assert.equal(todayJst(new Date('2026-11-15T14:59:59Z')), '2026-11-15');
  assert.equal(todayJst(new Date('2026-11-15T15:00:00Z')), '2026-11-16');
});

test('sharing retains ward and period while excluding browser-private saved filter', () => {
  const current = state({ ward: '中村区', period: 'undated', saved: true, compare: ['station'] });
  const shared = shareUrl('https://example.test/redevelopment/', current, projects);
  assert.equal(shared.searchParams.get('ward'), '中村区');
  assert.equal(shared.searchParams.get('period'), 'undated');
  assert.equal(shared.searchParams.has('saved'), false);
  assert.equal(current.saved, true);
});
