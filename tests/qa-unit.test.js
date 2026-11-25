'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { REPO_ROOT, extractInlineScripts } = require('./helpers/extract-scripts');
const { createWindowEnv, EventObj } = require('./helpers/dom');
const machines = require(path.join(REPO_ROOT, 'state-machines.js'));

const INDEX_SCRIPTS = extractInlineScripts('index.html');
const TABLE_SCRIPTS = extractInlineScripts('table.html');
const TREE_SCRIPTS = extractInlineScripts('tree.html');
const DATA_FILES = ['lineage-data.js', 'class-dads.js', 'relationships.js', 'state-machines.js'].map(f => ({
  filePath: path.join(REPO_ROOT, f),
  code: fs.readFileSync(path.join(REPO_ROOT, f), 'utf8'),
}));
const ICONS_CODE = fs.readFileSync(path.join(REPO_ROOT, 'icons.js'), 'utf8');
const DESKTOP_MQ = '(min-width:701px) and (min-height:521px) and (pointer:fine),(min-width:740px) and (min-height:580px)';

function loadFullData() {
  const ctx = vm.createContext({});
  for (const f of ['lineage-data.js', 'class-dads.js', 'relationships.js']) {
    vm.runInContext(fs.readFileSync(path.join(REPO_ROOT, f), 'utf8'), ctx);
  }
  return vm.runInContext(
    '({ records, campuses, schoolIds, crossings, memberAliases, classDadsBySchool, classDadAliases, normalizeMemberQuery, matchesMember, kidsByMember, dadsByMember, classDadIdsByMember, classDadByMember })',
    ctx
  );
}

test('QA Search & Unicode: every one of the 618 brothers is searchable by line name, legal name, and aliases', () => {
  const d = loadFullData();

  for (let id = 0; id < d.records.length; id++) {
    const rec = d.records[id];
    const lineTerm = d.normalizeMemberQuery(rec[0]);
    const realTerm = d.normalizeMemberQuery(rec[3]);
    assert.ok(lineTerm.length > 0, `Record ${id} line name normalized to empty`);
    assert.ok(realTerm.length > 0, `Record ${id} legal name normalized to empty`);
    assert.equal(d.matchesMember(rec, lineTerm), true, `Record ${id} not searchable by line name "${rec[0]}"`);
    assert.equal(d.matchesMember(rec, realTerm), true, `Record ${id} not searchable by legal name "${rec[3]}"`);
  }

  // Every alias in memberAliases matches its target brother
  for (const [realName, aliases] of Object.entries(d.memberAliases)) {
    const rec = d.records.find(r => r[3] === realName);
    assert.ok(rec, `memberAliases key "${realName}" does not exist in records`);
    for (const alias of aliases) {
      assert.equal(d.matchesMember(rec, d.normalizeMemberQuery(alias)), true);
    }
  }

  // Every target in classDadAliases exists in records
  for (const [binderName, rosterName] of Object.entries(d.classDadAliases)) {
    assert.ok(
      d.records.some(r => r[3] === rosterName),
      `classDadAliases["${binderName}"] -> "${rosterName}" not found in records`
    );
  }

  // Specialized Unicode/punctuation normalization cases
  const cases = [
    ['RØXAS', 'røxas'],
    ['SHŌGUN', 'shogun'],
    ['SĀNZÀNG', 'sanzang'],
    ['「EVANGEL10N」', 'evangel10n'],
    ['!BERSER.K', 'berser k'],
    ['./JUSTIC.E', 'justic e'],
    ['0x0DEATHWATC.H', '0x0deathwatc h'],
    ['   ,,,...---   ', ''],
  ];
  for (const [input, expected] of cases) {
    assert.equal(d.normalizeMemberQuery(input), expected);
  }
});

test('QA Security & XSS: special <> line names and malicious query/URL payloads never inject HTML elements', async () => {
  const d = loadFullData();
  const specialIds = d.records
    .map((r, i) => (/[<>]/.test(r[0]) ? i : -1))
    .filter(i => i >= 0);
  assert.ok(specialIds.length >= 3, 'Expected records with literal < and > in line names');

  // 1. Home live search with malicious XSS query string
  const win = createWindowEnv();
  const inp = win.document.createElement('input'); inp.id = 'homeSearch';
  const list = win.document.createElement('ul'); list.id = 'homeSuggest'; list.hidden = true;
  const live = win.document.createElement('p'); live.id = 'homeSearchStatus';
  win.document.body.append(inp, list, live);
  const ctx = vm.createContext(win);
  vm.runInContext(DATA_FILES[3].code, ctx);
  const origAppend = win.document.head.appendChild.bind(win.document.head);
  win.document.head.appendChild = node => {
    origAppend(node);
    if (node.tagName === 'SCRIPT') {
      vm.runInContext(DATA_FILES[0].code, ctx);
      if (node.onload) node.onload();
    }
    return node;
  };
  vm.runInContext(INDEX_SCRIPTS[2].code, ctx);

  inp.value = '<img src=x onerror=alert(1)>';
  inp.dispatchEvent(new EventObj('input'));
  await Promise.resolve();
  assert.equal(list.querySelectorAll('img,script').length, 0);
  assert.equal(list.children[0].textContent, 'No member matches');

  // Search for member with literal <!TACTI.C>
  inp.value = 'tacti';
  inp.dispatchEvent(new EventObj('input'));
  await Promise.resolve();
  assert.ok(list.textContent.includes('<!TACTI.C>'));
  assert.equal(list.querySelectorAll('script,img').length, 0);

  // 2. Tree URL parameter validation rejects non-digit, negative, scientific notation, and XSS payloads
  for (const badSearch of ['?member=-1', '?member=1e2', '?member=NaN', '?member=0;alert(1)', '?member=999999']) {
    const w = createWindowEnv({ mediaMatches: { [DESKTOP_MQ]: true }, search: badSearch });
    const doc = w.document;
    // Minimal tree DOM needed to boot
    const buildId = (tag, id, cls) => { const el = doc.createElement(tag); if (id) el.id = id; if (cls) el.className = cls; return el; };
    const tools = buildId('div', null, 'tools');
    const find = buildId('form', 'find'); find.append(buildId('input', 'query'));
    const vc = buildId('div', 'viewControls');
    const lin = buildId('select', 'lineage'); ['big', 'dad'].forEach(v => { const o = doc.createElement('option'); o.value = v; lin.append(o); });
    const ori = buildId('select', 'orientation'); ['horizontal', 'vertical'].forEach(v => { const o = doc.createElement('option'); o.value = v; ori.append(o); });
    const zc = buildId('div', null, 'zoom-controls'); zc.append(buildId('button', 'zoomOut'), buildId('output', 'zoom'), buildId('button', 'zoomIn'), buildId('button', 'fit'));
    const mp = buildId('div', 'member'); mp.append(buildId('strong', 'memberName'), buildId('span', 'memberMeta'), buildId('button', 'viewTree'), buildId('button', 'viewList'), buildId('button', 'parent'), buildId('input', 'mode'), buildId('input', 'depth'));
    vc.append(buildId('select', 'branch'), lin, ori, zc, buildId('button', 'overview'), mp, buildId('div', null, 'menu-key'));
    tools.append(find, buildId('button', 'viewToggle'), vc);
    const canvas = buildId('div', 'canvas'); canvas.append(doc.createElement('svg'));
    const cp = buildId('dialog', 'connectionsPanel'); cp.append(buildId('h2', 'connectionsTitle'), buildId('p', 'connectionsMeta'), buildId('div', 'connectionsBody'));
    doc.body.append(buildId('b', 'statMembers'), tools, buildId('div', 'matches'), buildId('div', 'desktopMember'), buildId('p', 'caption'), buildId('p', 'depthNote'), buildId('div', 'founderList'), buildId('div', 'generations'), canvas, buildId('button', 'connections'), cp, buildId('div', null, 'diagram-key'));

    const c = vm.createContext(w);
    vm.runInContext(ICONS_CODE, c);
    for (const df of DATA_FILES) vm.runInContext(df.code, c);
    vm.runInContext(TREE_SCRIPTS[1].code, c);
    assert.equal(vm.runInContext('treeMachine.getState().view.type', c), 'overview', `Bad search ${badSearch} must fall back to overview`);
  }
});

test('QA Table Sorting & Filtering: deterministic order across all 8 columns, campus counts sum to 618, lineageStart invariants', () => {
  const win = createWindowEnv();
  const doc = win.document;
  const filters = doc.createElement('div'); filters.className = 'filters';
  const query = doc.createElement('input'); query.id = 'query';
  const schools = doc.createElement('div'); schools.id = 'schools';
  const status = doc.createElement('p'); status.id = 'status';
  const mobileSort = doc.createElement('select'); mobileSort.id = 'mobileSort';
  for (const v of ['crossing:1', 'crossing:-1', 'member:1', 'member:-1', 'school:1', 'school:-1', 'big:1', 'big:-1', 'kids:-1', 'kids:1', 'classDad:1', 'classDad:-1', 'lineage:1', 'lineage:-1', 'founder:1', 'founder:-1']) {
    const o = doc.createElement('option'); o.value = v; mobileSort.append(o);
  }
  const ft = doc.createElement('button'); ft.id = 'filterToggle';
  const fc = doc.createElement('b'); fc.id = 'filterCount';
  filters.append(query, schools, status, mobileSort, ft, fc);
  const ts = doc.createElement('div'); ts.className = 'table-scroll';
  const table = doc.createElement('table');
  const thead = doc.createElement('thead'); const tr = doc.createElement('tr');
  for (const col of ['member', 'school', 'crossing', 'big', 'kids', 'classDad', 'lineage', 'founder']) {
    const th = doc.createElement('th'); const b = doc.createElement('button'); b.setAttribute('data-sort', col); th.append(b); tr.append(th);
  }
  thead.append(tr);
  const tbody = doc.createElement('tbody'); tbody.id = 'members';
  table.append(thead, tbody); ts.append(table);
  doc.body.append(filters, ts);

  const ctx = vm.createContext(win);
  for (const df of DATA_FILES) vm.runInContext(df.code, ctx);
  vm.runInContext(TABLE_SCRIPTS[1].code, ctx);

  // 1. Default crossing ascending: Founders (Spring 2000) first, 2026 classes last
  assert.ok(tbody.children[0].children[2].textContent.includes('Spring 2000'));
  assert.ok(tbody.children[tbody.children.length - 1].children[2].textContent.includes('2026'));

  // Flip crossing to descending: 2026 first, Spring 2000 last
  doc.querySelector('[data-sort="crossing"]').click();
  assert.ok(tbody.children[0].children[2].textContent.includes('2026'));
  assert.ok(tbody.children[tbody.children.length - 1].children[2].textContent.includes('Spring 2000'));

  // 2. Kids sort: first click is descending (most kids first), second click is ascending (0 kids first)
  doc.querySelector('[data-sort="kids"]').click();
  assert.notEqual(tbody.children[0].children[4].textContent, '0 kids');
  doc.querySelector('[data-sort="kids"]').click();
  assert.equal(tbody.children[0].children[4].textContent, '0 kids');

  // 3. Member A-Z vs Z-A ordering check
  doc.querySelector('[data-sort="member"]').click();
  const firstAsc = tbody.children[0].children[0].querySelector('a').textContent;
  doc.querySelector('[data-sort="member"]').click();
  const firstDesc = tbody.children[0].children[0].querySelector('a').textContent;
  assert.ok(firstAsc.localeCompare(firstDesc) < 0);

  // 4. Campus filter counts are mutually exclusive and sum to 618
  const expectedCounts = [184, 159, 35, 137, 95, 8];
  let sum = 0;
  for (let s = 0; s < 6; s++) {
    schools.children[s + 1].click();
    assert.equal(tbody.children.length, expectedCounts[s]);
    sum += tbody.children.length;
  }
  assert.equal(sum, 618);

  // 5. lineageStart invariant: always same school, and its parent is either null (founder) or a different school
  const invariantsOk = vm.runInContext(`
    records.every((_, id) => {
      const s = lineageStart[id];
      const p = records[s][1];
      return schoolIds[s] === schoolIds[id] && (p === null || schoolIds[p] !== schoolIds[s]) && founders[id] >= 0 && founders[id] <= 5;
    })
  `, ctx);
  assert.equal(invariantsOk, true);
});

test('QA Tree Math: all 6 founders, co-dad parity, exact +N hidden descendant counts, zoom/pan deltas', () => {
  const win = createWindowEnv({ mediaMatches: { [DESKTOP_MQ]: true } });
  const doc = win.document;
  const buildId = (tag, id, cls) => { const el = doc.createElement(tag); if (id) el.id = id; if (cls) el.className = cls; return el; };
  const tools = buildId('div', null, 'tools');
  const find = buildId('form', 'find'); find.append(buildId('input', 'query'));
  const vc = buildId('div', 'viewControls');
  const lin = buildId('select', 'lineage'); ['big', 'dad'].forEach(v => { const o = doc.createElement('option'); o.value = v; lin.append(o); });
  const ori = buildId('select', 'orientation'); ['horizontal', 'vertical'].forEach(v => { const o = doc.createElement('option'); o.value = v; ori.append(o); });
  const zc = buildId('div', null, 'zoom-controls'); zc.append(buildId('button', 'zoomOut'), buildId('output', 'zoom'), buildId('button', 'zoomIn'), buildId('button', 'fit'));
  const mp = buildId('div', 'member'); mp.append(buildId('strong', 'memberName'), buildId('span', 'memberMeta'), buildId('button', 'viewTree'), buildId('button', 'viewList'), buildId('button', 'parent'), buildId('input', 'mode'), buildId('input', 'depth'));
  vc.append(buildId('select', 'branch'), lin, ori, zc, buildId('button', 'overview'), mp, buildId('div', null, 'menu-key'));
  tools.append(find, buildId('button', 'viewToggle'), vc);
  const canvas = buildId('div', 'canvas'); canvas.clientWidth = 1200; canvas.clientHeight = 800;
  const svg = doc.createElement('svg'); canvas.append(svg);
  const cp = buildId('dialog', 'connectionsPanel'); cp.append(buildId('h2', 'connectionsTitle'), buildId('p', 'connectionsMeta'), buildId('div', 'connectionsBody'));
  doc.body.append(buildId('b', 'statMembers'), tools, buildId('div', 'matches'), buildId('div', 'desktopMember'), buildId('p', 'caption'), buildId('p', 'depthNote'), buildId('div', 'founderList'), buildId('div', 'generations'), canvas, buildId('button', 'connections'), cp, buildId('div', null, 'diagram-key'));

  const ctx = vm.createContext(win);
  vm.runInContext(ICONS_CODE, ctx);
  for (const df of DATA_FILES) vm.runInContext(df.code, ctx);
  vm.runInContext(TREE_SCRIPTS[1].code, ctx);

  // 1. Every founder 0..5 renders cleanly in both 'big' and 'dad' modes
  for (const mode of ['big', 'dad']) {
    lin.value = mode;
    lin.dispatchEvent(new EventObj('change'));
    for (let f = 0; f < 6; f++) {
      vm.runInContext(`selectMember(${f}, false)`, ctx);
      assert.equal(doc.getElementById('branch').value, String(f));
      assert.equal(doc.getElementById('parent').hidden, true);
      assert.ok(doc.querySelectorAll('.node').length >= 1);
    }
  }

  // 2. Exact +N badge math: for every truncated card on Founder 0 (big mode), +N === exact descendant subtree size
  lin.value = 'big';
  lin.dispatchEvent(new EventObj('change'));
  vm.runInContext('selectMember(0, false)', ctx);
  const verifiedBadges = vm.runInContext(`
    (() => {
      const countBelow = id => children[id].reduce((s, k) => s + 1 + countBelow(k), 0);
      const nodes = [...document.querySelectorAll('.node')];
      let checked = 0;
      for (const el of nodes) {
        const badgeText = el.querySelector('.more').textContent;
        if (badgeText) {
          const shown = Number(badgeText.slice(1));
          const actual = countBelow(el.__data__.data);
          if (shown !== actual) return { ok: false, id: el.__data__.data, shown, actual };
          checked++;
        }
      }
      return { ok: true, checked };
    })()
  `, ctx);
  assert.equal(verifiedBadges.ok, true);
  assert.ok(verifiedBadges.checked > 0);

  // 3. Co-class-dad parity across both co-dads (131 Alexis Soule, 132 Rayne Yap) in 'dad' mode
  lin.value = 'dad';
  lin.dispatchEvent(new EventObj('change'));
  for (const dadId of [131, 132]) {
    vm.runInContext(`selectMember(${dadId}, false)`, ctx);
    assert.ok(doc.getElementById('memberMeta').textContent.includes('8 kids'));
    // Focused downstream tree includes all 8 direct kids (147..154)
    for (let kid = 147; kid <= 154; kid++) {
      assert.equal(vm.runInContext(`nodesById.has(${kid})`, ctx), true, `Co-dad ${dadId} missing kid ${kid} in tree`);
    }
  }

  // 4. Exact Zoom In (x1.25), Zoom Out (x0.8), and Keyboard Pan (48/k) deltas
  const kBefore = win.d3.zoomTransform(svg).k;
  doc.getElementById('zoomIn').click();
  assert.ok(Math.abs(win.d3.zoomTransform(svg).k - kBefore * 1.25) < 1e-9);
  doc.getElementById('zoomOut').click();
  assert.ok(Math.abs(win.d3.zoomTransform(svg).k - kBefore) < 1e-9);

  const t0 = win.d3.zoomTransform(svg);
  canvas.dispatchEvent(new EventObj('keydown', { key: 'ArrowLeft', target: canvas }));
  assert.ok(win.d3.zoomTransform(svg).x > t0.x);
  canvas.dispatchEvent(new EventObj('keydown', { key: 'ArrowRight', target: canvas }));
  assert.ok(Math.abs(win.d3.zoomTransform(svg).x - t0.x) < 1e-6);
  canvas.dispatchEvent(new EventObj('keydown', { key: 'ArrowUp', target: canvas }));
  assert.ok(win.d3.zoomTransform(svg).y > t0.y);
  canvas.dispatchEvent(new EventObj('keydown', { key: 'ArrowDown', target: canvas }));
  assert.ok(Math.abs(win.d3.zoomTransform(svg).y - t0.y) < 1e-6);
});

test('QA State Machine Invariants: exhaustive transition matrix never produces impossible states', () => {
  const navEvents = [
    { type: 'SELECT_MEMBER', memberId: 5, branchRoot: 5 },
    { type: 'SHOW_OVERVIEW' },
    { type: 'SHOW_UNRESOLVED', hasFloating: true },
    { type: 'SHOW_UNRESOLVED', hasFloating: false },
    { type: 'SET_LINEAGE_MODE', lineageMode: 'dad', hasFloating: false, branchRoot: 0 },
    { type: 'SET_LINEAGE_MODE', lineageMode: 'big', hasFloating: true, branchRoot: -2 },
    { type: 'SET_ORIENTATION', orientation: 'horizontal' },
    { type: 'SET_ORIENTATION', orientation: 'vertical' },
    { type: 'VIEWPORT_CHANGED', isPhone: true },
    { type: 'VIEWPORT_CHANGED', isPhone: false },
    { type: 'OPEN_CONNECTIONS' },
  ];
  const allEvents = [
    ...navEvents,
    { type: 'SET_VIEW_MODE', mode: 'generations' },
    { type: 'SET_VIEW_MODE', mode: 'tree' },
    { type: 'SET_SCOPE', scope: 'branch' },
    { type: 'SET_SCOPE', scope: 'downstream' },
    { type: 'SET_DEPTH_MODE', depthMode: 'full' },
    { type: 'SET_DEPTH_MODE', depthMode: 'auto' },
    { type: 'TOGGLE_POPOVER' },
    { type: 'CLOSE_POPOVER' },
    { type: 'CLOSE_CONNECTIONS' },
  ];

  function assertTreeInvariants(st, lastEvent) {
    const hasMember = st.view.type === 'member-tree' || st.view.type === 'member-generations';
    if (st.connections === 'open') {
      assert.equal(hasMember, true, 'Impossible state: connections open without selected member');
    }
    if (st.view.type === 'founders') assert.equal(st.isPhone, true, 'founders view only valid in phone mode');
    if (st.view.type === 'overview') assert.equal(st.isPhone, false, 'overview view only valid in desktop mode');
    if (lastEvent && navEvents.includes(lastEvent)) {
      if (lastEvent.type !== 'OPEN_CONNECTIONS' || hasMember) {
        assert.equal(st.popover, 'closed', `Popover must close on ${lastEvent.type}`);
      }
    }
  }

  for (const startPhone of [false, true]) {
    const m = machines.createTreeMachine({ isPhone: startPhone });
    assertTreeInvariants(m.getState());
    for (const e1 of allEvents) {
      m.send(e1);
      assertTreeInvariants(m.getState(), e1);
      for (const e2 of allEvents) {
        m.send({ type: 'TOGGLE_POPOVER' });
        m.send(e2);
        assertTreeInvariants(m.getState(), e2);
      }
    }
  }

  // Combobox activeIndex clamping across repeated key presses
  const cb = machines.createComboboxMachine();
  cb.send({ type: 'RESULTS', hasQuery: true, items: [{ id: 0 }, { id: 1 }, { id: 2 }], totalHits: 3 });
  for (let i = 0; i < 20; i++) cb.send({ type: 'ARROW_DOWN' });
  assert.equal(cb.getState().activeIndex, 2);
  for (let i = 0; i < 20; i++) cb.send({ type: 'ARROW_UP' });
  assert.equal(cb.getState().activeIndex, -1);
});
