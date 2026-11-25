'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { REPO_ROOT } = require('./helpers/extract-scripts');
const { createWindowEnv, EventObj } = require('./helpers/dom');

const ICONS_PATH = path.join(REPO_ROOT, 'icons.js');
const MACHINES_PATH = path.join(REPO_ROOT, 'state-machines.js');
const KPIB_PATH = path.join(REPO_ROOT, 'kpib.js');
const ICONS_CODE = fs.readFileSync(ICONS_PATH, 'utf8');
const MACHINES_CODE = fs.readFileSync(MACHINES_PATH, 'utf8');
const KPIB_CODE = fs.readFileSync(KPIB_PATH, 'utf8');

test('icons.js: registers window.kpibIcon, renders known & unknown icons, hydrates [data-icon]', () => {
  const win = createWindowEnv();
  const doc = win.document;

  const homeEl = doc.createElement('i');
  homeEl.setAttribute('data-icon', 'home');
  const unknownEl = doc.createElement('i');
  unknownEl.setAttribute('data-icon', 'nonexistent');
  doc.body.append(homeEl, unknownEl);

  const ctx = vm.createContext(win);
  vm.runInContext(ICONS_CODE, ctx, { filename: ICONS_PATH });

  assert.equal(typeof win.kpibIcon, 'function');
  assert.ok(win.kpibIcon('tree').includes('<rect'));
  assert.ok(win.kpibIcon('unknown_icon').includes('<svg viewBox="0 0 24 24" focusable="false"></svg>'));
  assert.ok(homeEl.innerHTML.includes('class="ico"'));
  assert.ok(unknownEl.innerHTML.includes('<svg viewBox="0 0 24 24" focusable="false"></svg>'));
});

test('kpib.js: toggles light/dark theme with kpibIcon, persists to localStorage, handles mobile menu', () => {
  const win = createWindowEnv();
  const doc = win.document;
  doc.documentElement.dataset.theme = 'light';

  const btn = doc.createElement('button');
  btn.id = 'themeToggle';
  const menu = doc.createElement('details');
  menu.className = 'kp-menu';
  const summary = doc.createElement('summary');
  summary.textContent = 'Menu';
  const link = doc.createElement('a');
  link.href = 'tree.html';
  menu.append(summary, link);
  doc.body.append(btn, menu);

  const ctx = vm.createContext(win);
  vm.runInContext(MACHINES_CODE, ctx, { filename: MACHINES_PATH });
  vm.runInContext(ICONS_CODE, ctx, { filename: ICONS_PATH });
  vm.runInContext(KPIB_CODE, ctx, { filename: KPIB_PATH });

  // Initial light state
  assert.equal(doc.documentElement.dataset.theme, 'light');
  assert.equal(btn.getAttribute('aria-label'), 'Switch to dark theme');
  assert.ok(btn.innerHTML.includes('Dark'));

  // Toggle light -> dark
  btn.click();
  assert.equal(doc.documentElement.dataset.theme, 'dark');
  assert.equal(win.localStorage.getItem('kpib-theme'), 'dark');
  assert.equal(btn.getAttribute('aria-label'), 'Switch to light theme');
  assert.ok(btn.innerHTML.includes('Light'));

  // Toggle dark -> light
  btn.click();
  assert.equal(doc.documentElement.dataset.theme, 'light');
  assert.equal(win.localStorage.getItem('kpib-theme'), 'light');

  // Native <details> toggle syncs menuMachine open/closed
  menu.open = true;
  menu.dispatchEvent(new EventObj('toggle'));
  link.click();
  assert.equal(menu.open, false);

  // Mobile menu Escape while open closes and focuses summary
  menu.open = true;
  menu.dispatchEvent(new EventObj('toggle'));
  menu.dispatchEvent(new EventObj('keydown', { key: 'Escape' }));
  assert.equal(menu.open, false);
  assert.equal(doc.activeElement, summary);

  // Native toggle closed
  menu.open = false;
  menu.dispatchEvent(new EventObj('toggle'));
  doc.activeElement = null;
  menu.dispatchEvent(new EventObj('keydown', { key: 'Escape' }));
  assert.equal(doc.activeElement, null);

  menu.open = true;
  menu.dispatchEvent(new EventObj('toggle'));
  menu.dispatchEvent(new EventObj('keydown', { key: 'Tab' }));
  assert.equal(menu.open, true);
});

test('kpib.js: handles initial dark theme, missing kpibIcon, throwing localStorage, and absent controls', () => {
  // Case A: initial dark theme, no window.kpibIcon, throwing localStorage.setItem
  const winA = createWindowEnv({ localStorageOpts: { throwOnSet: true } });
  winA.document.documentElement.dataset.theme = 'dark';
  const btn = winA.document.createElement('button');
  btn.id = 'themeToggle';
  winA.document.body.append(btn);

  const ctxA = vm.createContext(winA);
  vm.runInContext(MACHINES_CODE, ctxA, { filename: MACHINES_PATH });
  vm.runInContext(KPIB_CODE, ctxA, { filename: KPIB_PATH });
  assert.equal(winA.document.documentElement.dataset.theme, 'dark');
  assert.equal(btn.innerHTML, '<span class="tlabel">Light</span>');
  // Clicking swallows localStorage error gracefully
  assert.doesNotThrow(() => btn.click());
  assert.equal(winA.document.documentElement.dataset.theme, 'light');

  // Case B: no #themeToggle and no .kp-menu
  const winB = createWindowEnv();
  const ctxB = vm.createContext(winB);
  vm.runInContext(MACHINES_CODE, ctxB, { filename: MACHINES_PATH });
  assert.doesNotThrow(() => {
    vm.runInContext(KPIB_CODE, ctxB, { filename: KPIB_PATH });
  });
});
