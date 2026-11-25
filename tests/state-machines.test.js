'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { REPO_ROOT } = require('./helpers/extract-scripts');
const machines = require(path.join(REPO_ROOT, 'state-machines.js'));

test('state-machines.js: IIFE browser-global fallback branch (no globalThis, no module)', () => {
  const abs = path.join(REPO_ROOT, 'state-machines.js');
  const code = fs.readFileSync(abs, 'utf8');
  const win = {};
  const ctx = vm.createContext({ window: win, globalThis: undefined });
  vm.runInContext(code, ctx, { filename: abs });
  assert.equal(typeof win.kpibMachines.createTreeMachine, 'function');
});

test('createMachine: subscribe, unsubscribe, and no-op transition skips listeners', () => {
  const m = machines.createMachine(0, (s, e) => (e.type === 'INC' ? s + 1 : s));
  let calls = 0;
  const unsub = m.subscribe(() => { calls++; });
  assert.equal(m.getState(), 0);
  m.send({ type: 'NOOP' });
  assert.equal(calls, 0);
  m.send({ type: 'INC' });
  assert.equal(m.getState(), 1);
  assert.equal(calls, 1);
  unsub();
  m.send({ type: 'INC' });
  assert.equal(calls, 1);
});

test('createThemeMachine & createToggleMachine: all states and events', () => {
  const tm = machines.createThemeMachine('dark');
  assert.equal(tm.getState(), 'dark');
  assert.equal(tm.send({ type: 'TOGGLE' }), 'light');
  assert.equal(tm.send({ type: 'TOGGLE' }), 'dark');
  assert.equal(tm.send({ type: 'SET', theme: 'light' }), 'light');
  assert.equal(tm.send({ type: 'SET', theme: 'dark' }), 'dark');
  assert.equal(tm.send({ type: 'UNKNOWN' }), 'dark');

  const tmLight = machines.createThemeMachine('light');
  assert.equal(tmLight.getState(), 'light');

  const tog = machines.createToggleMachine('closed', 'open', true);
  assert.equal(tog.getState(), 'open');
  assert.equal(tog.send({ type: 'CLOSE' }), 'closed');
  assert.equal(tog.send({ type: 'OPEN' }), 'open');
  assert.equal(tog.send({ type: 'TOGGLE' }), 'closed');
  assert.equal(tog.send({ type: 'TOGGLE' }), 'open');
  assert.equal(tog.send({ type: 'UNKNOWN' }), 'open');
});

test('createLoaderMachine: idle -> loading -> error -> loading -> loaded', () => {
  const l = machines.createLoaderMachine();
  assert.equal(l.getState().status, 'idle');
  // RESOLVE/REJECT ignored when idle
  l.send({ type: 'RESOLVE' });
  l.send({ type: 'REJECT' });
  assert.equal(l.getState().status, 'idle');

  const p1 = Promise.resolve();
  l.send({ type: 'START', promise: p1 });
  assert.equal(l.getState().status, 'loading');
  // Duplicate START while loading is ignored
  l.send({ type: 'START', promise: Promise.resolve() });
  assert.equal(l.getState().promise, p1);

  // REJECT moves to error and clears promise so retry is possible
  l.send({ type: 'REJECT' });
  assert.equal(l.getState().status, 'error');
  assert.equal(l.getState().promise, null);

  // Retry from error -> loading -> loaded
  const p2 = Promise.resolve();
  l.send({ type: 'START', promise: p2 });
  l.send({ type: 'RESOLVE' });
  assert.equal(l.getState().status, 'loaded');
  // Duplicate START while loaded is ignored
  l.send({ type: 'START', promise: Promise.resolve() });
  assert.equal(l.getState().promise, p2);
});

test('createComboboxMachine: closed / open / interacting transitions and guards', () => {
  const c = machines.createComboboxMachine();
  assert.equal(c.getState().status, 'closed');

  // Guards while closed
  c.send({ type: 'RESULTS', hasQuery: false, items: [], totalHits: 0 });
  c.send({ type: 'ARROW_DOWN' });
  c.send({ type: 'ARROW_UP' });
  c.send({ type: 'POINTER_DOWN_LIST' });
  c.send({ type: 'BLUR' });
  c.send({ type: 'CLOSE' });
  c.send({ type: 'UNKNOWN' });
  assert.equal(c.getState().status, 'closed');

  // Open with results
  c.send({ type: 'RESULTS', hasQuery: true, items: [{ id: 0 }, { id: 1 }], totalHits: 2 });
  assert.equal(c.getState().status, 'open');
  c.send({ type: 'ARROW_DOWN' });
  assert.equal(c.getState().activeIndex, 0);
  c.send({ type: 'ARROW_UP' });
  assert.equal(c.getState().activeIndex, -1);

  // Pointer interaction prevents blur from closing
  c.send({ type: 'POINTER_DOWN_LIST' });
  assert.equal(c.getState().status, 'interacting');
  c.send({ type: 'BLUR' });
  assert.equal(c.getState().status, 'open');

  // Second blur while open closes
  c.send({ type: 'BLUR' });
  assert.equal(c.getState().status, 'closed');

  // Empty query closes from open
  c.send({ type: 'RESULTS', hasQuery: true, items: [{ id: 0 }], totalHits: 1 });
  c.send({ type: 'RESULTS', hasQuery: false, items: [], totalHits: 0 });
  assert.equal(c.getState().status, 'closed');

  // Explicit CLOSE from open
  c.send({ type: 'RESULTS', hasQuery: true, items: [{ id: 0 }], totalHits: 1 });
  c.send({ type: 'CLOSE' });
  assert.equal(c.getState().status, 'closed');
});

test('createTableMachine: query, school, sort, drawer, restore, and default guards', () => {
  const t = machines.createTableMachine({ query: 'hi', school: 1, sortColumn: 'member', sortDirection: -1 });
  assert.equal(t.getState().query, 'hi');
  assert.equal(t.getState().school, 1);
  assert.equal(t.getState().sortColumn, 'member');
  assert.equal(t.getState().sortDirection, -1);

  t.send({ type: 'SET_QUERY', query: 'abc' });
  t.send({ type: 'SET_SCHOOL', school: 1 }); // same -> no-op
  t.send({ type: 'SET_SCHOOL', school: 2 });
  t.send({ type: 'TOGGLE_SORT', column: 'member' }); // flips -1 -> 1
  assert.equal(t.getState().sortDirection, 1);
  t.send({ type: 'TOGGLE_SORT', column: 'kids' }); // defaults to -1
  assert.equal(t.getState().sortDirection, -1);
  t.send({ type: 'TOGGLE_SORT', column: 'school' }); // defaults to 1
  assert.equal(t.getState().sortDirection, 1);
  t.send({ type: 'SET_SORT', column: 'founder', direction: -1 });
  assert.equal(t.getState().sortDirection, -1);
  t.send({ type: 'SET_SORT', column: 'founder', direction: 1 });
  assert.equal(t.getState().sortDirection, 1);
  t.send({ type: 'TOGGLE_DRAWER' });
  assert.equal(t.getState().drawer, 'open');
  t.send({ type: 'TOGGLE_DRAWER' });
  assert.equal(t.getState().drawer, 'closed');
  t.send({ type: 'RESTORE', query: '', school: null, sortColumn: 'crossing', sortDirection: 1 });
  assert.equal(t.getState().sortDirection, 1);
  t.send({ type: 'RESTORE', query: 'x', school: 0, sortColumn: 'kids', sortDirection: -1 });
  assert.equal(t.getState().sortDirection, -1);
  t.send({ type: 'UNKNOWN' });

  const tDefault = machines.createTableMachine();
  assert.equal(tDefault.getState().query, '');
  assert.equal(tDefault.getState().school, null);
  assert.equal(tDefault.getState().sortColumn, 'crossing');
  assert.equal(tDefault.getState().sortDirection, 1);
});

test('createTreeMachine: discriminated views, guards, impossible-state prevention, and viewport changes', () => {
  const m = machines.createTreeMachine({ isPhone: false, lineageMode: 'big', depthMode: 'auto' });
  assert.equal(m.getState().view.type, 'overview');

  // Guards when no member selected
  m.send({ type: 'SET_VIEW_MODE', mode: 'generations' });
  m.send({ type: 'SET_SCOPE', scope: 'branch' });
  m.send({ type: 'OPEN_CONNECTIONS' });
  m.send({ type: 'CLOSE_CONNECTIONS' });
  m.send({ type: 'CLOSE_POPOVER' });
  m.send({ type: 'UNKNOWN' });
  assert.equal(m.getState().view.type, 'overview');
  assert.equal(m.getState().connections, 'closed');

  // SHOW_UNRESOLVED with and without floating
  m.send({ type: 'SHOW_UNRESOLVED', hasFloating: false });
  assert.equal(m.getState().view.type, 'overview');
  m.send({ type: 'SHOW_UNRESOLVED', hasFloating: true });
  assert.equal(m.getState().view.type, 'unresolved');
  m.send({ type: 'SET_LINEAGE_MODE', lineageMode: 'dad', hasFloating: false, branchRoot: null });
  assert.equal(m.getState().view.type, 'overview');

  // Popover toggle & close
  m.send({ type: 'TOGGLE_POPOVER' });
  assert.equal(m.getState().popover, 'open');
  m.send({ type: 'TOGGLE_POPOVER' });
  assert.equal(m.getState().popover, 'closed');
  m.send({ type: 'TOGGLE_POPOVER' });
  m.send({ type: 'CLOSE_POPOVER' });
  assert.equal(m.getState().popover, 'closed');

  // Select member, scope, view mode, connections, depth, orientation, lineage
  m.send({ type: 'SELECT_MEMBER', memberId: 10, branchRoot: 0 });
  assert.equal(m.getState().view.type, 'member-tree');
  assert.equal(m.getState().view.scope, 'downstream');

  m.send({ type: 'SET_SCOPE', scope: 'branch' });
  assert.equal(m.getState().view.scope, 'branch');
  m.send({ type: 'SET_SCOPE', scope: 'downstream' });
  assert.equal(m.getState().view.scope, 'downstream');

  m.send({ type: 'SET_VIEW_MODE', mode: 'tree' }); // already tree -> no-op
  m.send({ type: 'SET_VIEW_MODE', mode: 'generations' });
  assert.equal(m.getState().view.type, 'member-generations');
  // Selecting another member preserves generations view & scope
  m.send({ type: 'SELECT_MEMBER', memberId: 11, branchRoot: 1 });
  assert.equal(m.getState().view.type, 'member-generations');
  assert.equal(m.getState().view.memberId, 11);

  m.send({ type: 'OPEN_CONNECTIONS' });
  assert.equal(m.getState().connections, 'open');
  m.send({ type: 'CLOSE_CONNECTIONS' });
  assert.equal(m.getState().connections, 'closed');

  m.send({ type: 'SET_LINEAGE_MODE', lineageMode: 'big', hasFloating: false, branchRoot: 2 });
  assert.equal(m.getState().view.branchRoot, 2);

  m.send({ type: 'SET_VIEW_MODE', mode: 'tree' });
  assert.equal(m.getState().view.type, 'member-tree');
  m.send({ type: 'SET_LINEAGE_MODE', lineageMode: 'dad', hasFloating: true, branchRoot: 3 });
  assert.equal(m.getState().view.branchRoot, 3);

  m.send({ type: 'SET_DEPTH_MODE', depthMode: 'full' });
  assert.equal(m.getState().depthMode, 'full');
  m.send({ type: 'SET_DEPTH_MODE', depthMode: 'auto' });
  assert.equal(m.getState().depthMode, 'auto');

  m.send({ type: 'SET_ORIENTATION', orientation: 'horizontal' });
  assert.equal(m.getState().orientation, 'horizontal');
  m.send({ type: 'SET_ORIENTATION', orientation: 'vertical' });
  assert.equal(m.getState().orientation, 'vertical');

  // Viewport change while viewing a member preserves member view
  m.send({ type: 'VIEWPORT_CHANGED', isPhone: true });
  assert.equal(m.getState().view.type, 'member-tree');

  // SHOW_OVERVIEW on phone goes to 'founders', then viewport change flips to 'overview' and back
  m.send({ type: 'SHOW_OVERVIEW' });
  assert.equal(m.getState().view.type, 'founders');
  m.send({ type: 'VIEWPORT_CHANGED', isPhone: false });
  assert.equal(m.getState().view.type, 'overview');
  m.send({ type: 'VIEWPORT_CHANGED', isPhone: true });
  assert.equal(m.getState().view.type, 'founders');
});
