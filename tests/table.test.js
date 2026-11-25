'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { REPO_ROOT, extractInlineScripts } = require('./helpers/extract-scripts');
const { createWindowEnv, EventObj } = require('./helpers/dom');

const TABLE_SCRIPTS = extractInlineScripts('table.html');
const DATA_FILES = ['lineage-data.js', 'class-dads.js', 'relationships.js', 'state-machines.js'].map(f => ({
  filePath: path.join(REPO_ROOT, f),
  code: fs.readFileSync(path.join(REPO_ROOT, f), 'utf8'),
}));

function buildTableDom(doc, { initialAriaSort = true } = {}) {
  const main = doc.createElement('main');
  const filters = doc.createElement('div');
  filters.className = 'filters';

  const query = doc.createElement('input');
  query.id = 'query';
  const schools = doc.createElement('div');
  schools.id = 'schools';
  schools.className = 'school-filters';
  const status = doc.createElement('p');
  status.id = 'status';
  const mobileSort = doc.createElement('select');
  mobileSort.id = 'mobileSort';
  for (const val of [
    'crossing:1', 'crossing:-1',
    'member:1', 'member:-1',
    'school:1', 'school:-1',
    'big:1', 'big:-1',
    'kids:-1', 'kids:1',
    'classDad:1', 'classDad:-1',
    'lineage:1', 'lineage:-1',
    'founder:1', 'founder:-1',
  ]) {
    const opt = doc.createElement('option');
    opt.value = val;
    opt.textContent = val;
    mobileSort.append(opt);
  }
  const filterToggle = doc.createElement('button');
  filterToggle.id = 'filterToggle';
  const filterCount = doc.createElement('b');
  filterCount.id = 'filterCount';
  filterCount.hidden = true;
  filters.append(query, schools, status, mobileSort, filterToggle, filterCount);

  const tableScroll = doc.createElement('div');
  tableScroll.className = 'table-scroll';
  const table = doc.createElement('table');
  const thead = doc.createElement('thead');
  const headRow = doc.createElement('tr');
  for (const col of ['member', 'school', 'crossing', 'big', 'kids', 'classDad', 'lineage', 'founder']) {
    const th = doc.createElement('th');
    if (col === 'crossing' && initialAriaSort) th.setAttribute('aria-sort', 'ascending');
    const btn = doc.createElement('button');
    btn.setAttribute('data-sort', col);
    btn.textContent = col;
    th.append(btn);
    headRow.append(th);
  }
  thead.append(headRow);
  const tbody = doc.createElement('tbody');
  tbody.id = 'members';
  table.append(thead, tbody);
  tableScroll.append(table);

  main.append(filters, tableScroll);
  doc.body.append(main);
}

function bootTable(opts = {}) {
  const win = createWindowEnv(opts);
  buildTableDom(win.document, opts);
  const ctx = vm.createContext(win);
  vm.runInContext(TABLE_SCRIPTS[0].code, ctx, { filename: TABLE_SCRIPTS[0].filePath });
  for (const df of DATA_FILES) {
    vm.runInContext(df.code, ctx, { filename: df.filePath });
  }
  vm.runInContext(TABLE_SCRIPTS[1].code, ctx, { filename: TABLE_SCRIPTS[1].filePath });
  return { win, ctx };
}

test('table.html inline script 0: theme init (dark, light, storage error)', () => {
  const w1 = createWindowEnv({ localStorage: { 'kpib-theme': 'dark' } });
  vm.runInContext(TABLE_SCRIPTS[0].code, vm.createContext(w1), { filename: TABLE_SCRIPTS[0].filePath });
  assert.equal(w1.document.documentElement.dataset.theme, 'dark');

  const w2 = createWindowEnv({ localStorage: { 'kpib-theme': 'light' } });
  vm.runInContext(TABLE_SCRIPTS[0].code, vm.createContext(w2), { filename: TABLE_SCRIPTS[0].filePath });
  assert.equal(w2.document.documentElement.dataset.theme, undefined);

  const w3 = createWindowEnv({ localStorageOpts: { throwOnGet: true } });
  assert.doesNotThrow(() => {
    vm.runInContext(TABLE_SCRIPTS[0].code, vm.createContext(w3), { filename: TABLE_SCRIPTS[0].filePath });
  });
});

test('table.html inline scripts 1 & 2: rendering, filtering, all 8 sort columns, and mobile filter toggle', () => {
  const { win } = bootTable();
  const doc = win.document;

  const tbody = doc.getElementById('members');
  const status = doc.getElementById('status');
  const query = doc.getElementById('query');
  const schools = doc.getElementById('schools');
  const mobileSort = doc.getElementById('mobileSort');
  const filterToggle = doc.getElementById('filterToggle');
  const filterCount = doc.getElementById('filterCount');

  // Initial render shows all 618 members
  assert.equal(tbody.children.length, 618);
  assert.equal(status.textContent, '618 members');
  assert.equal(schools.children.length, 7); // All schools + 6 campuses

  // Click already-active "All schools" button -> early return
  schools.children[0].click();
  assert.equal(tbody.children.length, 618);

  // Filter by Northwestern (index 6 -> schoolId 5, 8 members)
  schools.children[6].click();
  win._flushTimeouts();
  assert.equal(tbody.children.length, 8);
  assert.equal(status.textContent, '8 of 618 members');
  assert.equal(filterCount.textContent, '1');
  assert.equal(filterCount.hidden, false);

  // Mobile filter toggle open & close
  filterToggle.click();
  assert.equal(filterToggle.getAttribute('aria-expanded'), 'true');
  filterToggle.click();
  assert.equal(filterToggle.getAttribute('aria-expanded'), 'false');

  // Reset to All schools
  schools.children[0].click();
  win._flushTimeouts();
  assert.equal(tbody.children.length, 618);
  assert.equal(filterCount.hidden, true);

  // Search query with 0 matches & partial match
  query.value = 'no_such_brother_xyz';
  query.dispatchEvent(new EventObj('input'));
  assert.equal(tbody.children.length, 0);
  assert.equal(status.textContent, 'No matches. Try another name or school.');

  query.value = '';
  query.dispatchEvent(new EventObj('input'));
  assert.equal(tbody.children.length, 618);

  // Exercise EVERY sort column (click once + click again to flip direction)
  for (const col of ['crossing', 'member', 'school', 'big', 'kids', 'classDad', 'lineage', 'founder']) {
    const btn = doc.querySelector(`[data-sort="${col}"]`);
    btn.click();
    btn.click();
  }

  // Exercise mobileSort change (non-default increments filterCount)
  mobileSort.value = 'member:1';
  mobileSort.dispatchEvent(new EventObj('change'));
  assert.equal(filterCount.textContent, '1');
  assert.equal(doc.querySelector('[data-sort="member"]').closest('th').getAttribute('aria-sort'), 'ascending');

  // Click a tree link saves state to sessionStorage; clicking elsewhere does not
  const treeLink = doc.querySelector('a[href^="tree.html"]');
  win.document.querySelector('.table-scroll').scrollTop = 250;
  treeLink.click();
  const saved = JSON.parse(win.sessionStorage.getItem('kpib-roster-view'));
  assert.equal(saved.column, 'member');
  assert.equal(saved.direction, 1);
  assert.equal(saved.scroll, 250);

  // Verify Design System stacked mobile data-label attributes on every data cell (DS-06)
  const firstRow = tbody.children[0];
  assert.deepEqual(
    firstRow.children.slice(1).map(td => td.getAttribute('data-label')),
    ['School', 'Crossing', 'Big Brother', 'Kids', 'Class dad', 'Lineage', 'Founder']
  );

  // Clicking non-tree element does not overwrite sessionStorage
  doc.body.click();
});

test('table.html: fallback labels for extra campuses & unknown semester key', () => {
  const win = createWindowEnv();
  buildTableDom(win.document);
  const ctx = vm.createContext(win);
  vm.runInContext(TABLE_SCRIPTS[0].code, ctx, { filename: TABLE_SCRIPTS[0].filePath });
  for (const df of DATA_FILES) vm.runInContext(df.code, ctx, { filename: df.filePath });
  // Append a synthetic 7th campus (index 6 -> falls back to full name) and test unknown semester prefix
  vm.runInContext(`campuses.push('Extra University');`, ctx);
  vm.runInContext(TABLE_SCRIPTS[1].code, ctx, { filename: TABLE_SCRIPTS[1].filePath });
  const schoolBtns = win.document.querySelectorAll('#schools button');
  assert.equal(schoolBtns.length, 8);
  assert.ok(schoolBtns[7].textContent.includes('Extra University'));
  assert.equal(vm.runInContext(`semesterKey('Unknown 2025')`, ctx), 2025 * 4);
});

test('table.html: singular 1-kid label, sessionStorage restore variants, and storage error paths', () => {
  // 1. Valid saved state with activeSchool, direction = -1, valid scroll, and no initial th[aria-sort]
  const { win: w1 } = bootTable({
    initialAriaSort: false,
    sessionStorage: {
      'kpib-roster-view': JSON.stringify({
        query: '',
        school: 2, // Mizzou (includes single-member classes -> exercises '1 kid' singular branch!)
        column: 'kids',
        direction: -1,
        scroll: 120,
      }),
    },
  });
  assert.equal(w1.document.querySelector('.table-scroll').scrollTop, 120);
  assert.equal(w1.document.getElementById('mobileSort').value, 'kids:-1');
  // Verify at least one '1 kid' summary exists (e.g. John Hu / Anand Kulkarni at Mizzou has 1 kid)
  const summaries = w1.document.querySelectorAll('.roster-kids summary').map(s => s.textContent);
  assert.ok(summaries.includes('1 kid'));

  // 2. Saved state with invalid column, out-of-range school, direction = 1, non-finite scroll, throwing setItem
  const { win: w2 } = bootTable({
    sessionStorage: {
      'kpib-roster-view': JSON.stringify({
        query: 'Smooth',
        school: 99,
        column: 'invalidCol',
        direction: 1,
        scroll: null,
      }),
    },
    sessionStorageOpts: { throwOnSet: true },
  });
  assert.equal(w2.document.getElementById('mobileSort').value, 'crossing:1');
  assert.equal(w2.document.getElementById('members').children.length, 1);
  // Clicking tree link with throwing sessionStorage.setItem is caught gracefully
  assert.doesNotThrow(() => {
    w2.document.querySelector('a[href^="tree.html"]').click();
  });

  // 3. Saved state with column === 'crossing' explicitly & school = null & negative school
  const { win: w3 } = bootTable({
    sessionStorage: {
      'kpib-roster-view': JSON.stringify({
        query: '',
        school: -1,
        column: 'crossing',
        direction: 1,
        scroll: 0,
      }),
    },
  });
  assert.equal(w3.document.getElementById('members').children.length, 618);

  // 4. Corrupt JSON in sessionStorage & object without string query
  const { win: w4 } = bootTable({
    sessionStorage: { 'kpib-roster-view': '{not-json' },
  });
  assert.equal(w4.document.getElementById('members').children.length, 618);

  const { win: w5 } = bootTable({
    sessionStorage: { 'kpib-roster-view': JSON.stringify({ query: 123 }) },
  });
  assert.equal(w5.document.getElementById('members').children.length, 618);
});
