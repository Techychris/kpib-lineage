'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { REPO_ROOT, extractInlineScripts } = require('./helpers/extract-scripts');
const { createWindowEnv, EventObj } = require('./helpers/dom');

const INDEX_SCRIPTS = extractInlineScripts('index.html');
const MACHINES_PATH = path.join(REPO_ROOT, 'state-machines.js');
const MACHINES_CODE = fs.readFileSync(MACHINES_PATH, 'utf8');
const LINEAGE_DATA_PATH = path.join(REPO_ROOT, 'lineage-data.js');
const LINEAGE_DATA_CODE = fs.readFileSync(LINEAGE_DATA_PATH, 'utf8');

function buildHomeDom(doc, { withHeader = true, withHero = true, withSearch = true, withList = true } = {}) {
  if (withHeader) {
    const hdr = doc.createElement('header');
    hdr.className = 'kp-hdr';
    hdr.offsetHeight = 72;
    doc.body.append(hdr);
  }
  const main = doc.createElement('main');
  doc.body.append(main);
  if (withHero) {
    const hero = doc.createElement('section');
    hero.className = 'kp-hero';
    hero.offsetHeight = 600;
    const txt = doc.createElement('div');
    txt.className = 'txt';
    const h1 = doc.createElement('h1');
    const p = doc.createElement('p');
    txt.append(h1, p);
    if (withSearch) {
      const inp = doc.createElement('input');
      inp.id = 'homeSearch';
      txt.append(inp);
    }
    if (withList) {
      const list = doc.createElement('ul');
      list.id = 'homeSuggest';
      list.hidden = true;
      txt.append(list);
      const status = doc.createElement('p');
      status.id = 'homeSearchStatus';
      txt.append(status);
    }
    const pic = doc.createElement('figure');
    pic.className = 'pic';
    const svg = doc.createElement('svg');
    const rect = doc.createElement('rect');
    svg.append(rect);
    pic.append(svg);
    hero.append(txt, pic);
    main.append(hero);
  }
  const sec = doc.createElement('section');
  const shead = doc.createElement('div');
  shead.className = 'kp-shead';
  const grid = doc.createElement('div');
  grid.className = 'kp-grid';
  for (let i = 0; i < 4; i++) {
    const card = doc.createElement('a');
    card.className = 'kp-card';
    grid.append(card);
  }
  sec.append(shead, grid);
  main.append(sec);
}

test('index.html inline script 0: theme initialization (dark, light, error)', () => {
  // Dark
  const winDark = createWindowEnv({ localStorage: { 'kpib-theme': 'dark' } });
  const ctxDark = vm.createContext(winDark);
  vm.runInContext(INDEX_SCRIPTS[0].code, ctxDark, { filename: INDEX_SCRIPTS[0].filePath });
  assert.equal(winDark.document.documentElement.dataset.theme, 'dark');

  // Light (non-dark)
  const winLight = createWindowEnv({ localStorage: { 'kpib-theme': 'light' } });
  vm.runInContext(INDEX_SCRIPTS[0].code, vm.createContext(winLight), { filename: INDEX_SCRIPTS[0].filePath });
  assert.equal(winLight.document.documentElement.dataset.theme, undefined);

  // Throwing localStorage
  const winErr = createWindowEnv({ localStorageOpts: { throwOnGet: true } });
  assert.doesNotThrow(() => {
    vm.runInContext(INDEX_SCRIPTS[0].code, vm.createContext(winErr), { filename: INDEX_SCRIPTS[0].filePath });
  });
});

test('index.html inline script 1: sticky header height measurement (--hdr)', async () => {
  const win = createWindowEnv();
  buildHomeDom(win.document);
  const ctx = vm.createContext(win);
  vm.runInContext(INDEX_SCRIPTS[1].code, ctx, { filename: INDEX_SCRIPTS[1].filePath });

  assert.equal(win.document.documentElement.style.getPropertyValue('--hdr'), '72px');
  win.document.querySelector('.kp-hdr').offsetHeight = 64;
  win.dispatchEvent(new EventObj('resize'));
  assert.equal(win.document.documentElement.style.getPropertyValue('--hdr'), '64px');
  await win.document.fonts.ready;

  // Missing header & missing document.fonts branches
  const winNoHdr = createWindowEnv();
  winNoHdr.document.fonts = null;
  buildHomeDom(winNoHdr.document, { withHeader: false });
  vm.runInContext(INDEX_SCRIPTS[1].code, vm.createContext(winNoHdr), { filename: INDEX_SCRIPTS[1].filePath });

  const winNoFonts = createWindowEnv();
  winNoFonts.document.fonts = null;
  buildHomeDom(winNoFonts.document, { withHeader: true });
  vm.runInContext(INDEX_SCRIPTS[1].code, vm.createContext(winNoFonts), { filename: INDEX_SCRIPTS[1].filePath });
  assert.equal(winNoFonts.document.documentElement.style.getPropertyValue('--hdr'), '72px');
});

test('index.html inline script 2: hero live search combobox (lazy load, ranking, keyboard, pointer, blur)', async () => {
  // Guard clauses: missing inp or missing list
  for (const cfg of [{ withSearch: false, withList: true }, { withSearch: true, withList: false }]) {
    const w = createWindowEnv();
    buildHomeDom(w.document, cfg);
    vm.runInContext(INDEX_SCRIPTS[2].code, vm.createContext(w), { filename: INDEX_SCRIPTS[2].filePath });
  }

  const win = createWindowEnv({ mediaMatches: { '(pointer:coarse)': false } });
  buildHomeDom(win.document);
  const ctx = vm.createContext(win);
  vm.runInContext(MACHINES_CODE, ctx, { filename: MACHINES_PATH });

  // First two load attempts fail (one on focus, one on input) to verify error-state recovery, then succeed
  let failuresLeft = 2;
  const origAppend = win.document.head.appendChild.bind(win.document.head);
  win.document.head.appendChild = node => {
    origAppend(node);
    if (node.tagName === 'SCRIPT' && String(node.src).startsWith('lineage-data.js')) {
      if (failuresLeft > 0) {
        failuresLeft--;
        if (node.onerror) node.onerror(new Error('offline'));
      } else {
        vm.runInContext(LINEAGE_DATA_CODE, ctx, { filename: LINEAGE_DATA_PATH });
        if (node.onload) node.onload();
      }
    }
    return node;
  };

  vm.runInContext(INDEX_SCRIPTS[2].code, ctx, { filename: INDEX_SCRIPTS[2].filePath });

  const inp = win.document.getElementById('homeSearch');
  const list = win.document.getElementById('homeSuggest');
  const liveStatus = win.document.getElementById('homeSearchStatus');

  // Keydown while closed & empty returns early; non-ArrowDown also returns early
  inp.dispatchEvent(new EventObj('keydown', { key: 'ArrowDown' }));
  inp.dispatchEvent(new EventObj('keydown', { key: 'Tab' }));
  assert.equal(list.hidden, true);

  // First focus fails -> swallowed cleanly, desktop does NOT auto-scroll (UX-09 fixed!)
  inp.dispatchEvent(new EventObj('focus'));
  win._flushTimeouts();
  assert.equal(inp._scrolledIntoView, null);
  await Promise.resolve();

  // First input retries and fails -> closes combobox cleanly, loader stays retryable
  inp.value = 'Smooth';
  inp.dispatchEvent(new EventObj('input'));
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(list.hidden, true);

  // ArrowDown while closed with non-empty value reopens suggestions (UX-16) and loads data
  // Test failed reopen catch first, then succeed!
  failuresLeft = 1;
  inp.dispatchEvent(new EventObj('keydown', { key: 'ArrowDown' }));
  await Promise.resolve();
  await Promise.resolve();
  // Now retry with coarse pointer enabled to verify mobile scrollIntoView
  win._mql('(pointer:coarse)')._setMatches(true);
  inp.dispatchEvent(new EventObj('focus'));
  win._flushTimeouts();
  assert.deepEqual({ ...inp._scrolledIntoView }, { block: 'start', behavior: 'smooth' });

  // ArrowDown while closed with value 'Smooth' opens with 1 matching member (singular liveStatus)
  inp.dispatchEvent(new EventObj('keydown', { key: 'ArrowDown' }));
  await Promise.resolve();
  assert.equal(list.hidden, false);
  assert.equal(liveStatus.textContent, '1 matching member');

  // Input with whitespace -> closes list & clears liveStatus
  inp.value = '   ';
  inp.dispatchEvent(new EventObj('input'));
  await Promise.resolve();
  assert.equal(list.hidden, true);
  assert.equal(liveStatus.textContent, '');

  // Input with 0 matches -> "No member matches"
  inp.value = 'zzzznotamember';
  inp.dispatchEvent(new EventObj('input'));
  await Promise.resolve();
  assert.equal(list.hidden, false);
  assert.equal(list.children.length, 1);
  assert.equal(list.children[0].textContent, 'No member matches');
  assert.equal(liveStatus.textContent, 'No member matches');
  // ArrowDown on 0-match list keeps activeIndex -1
  inp.dispatchEvent(new EventObj('keydown', { key: 'ArrowDown' }));

  // Input with many matches -> prefix ranked first and ALL matches rendered (no truncation row)
  inp.value = 'chris';
  inp.dispatchEvent(new EventObj('input'));
  await Promise.resolve();
  assert.ok(list.children.length > 6, `expected > 6 options for "chris", got ${list.children.length}`);
  assert.equal(list.children.every(li => li.getAttribute('role') === 'option'), true);
  assert.equal(liveStatus.textContent, `${list.children.length} matching members`);

  // Also test missing #homeSearchStatus element safely
  liveStatus.remove();
  const winNoLive = createWindowEnv();
  buildHomeDom(winNoLive.document);
  winNoLive.document.getElementById('homeSearchStatus').remove();
  const ctxNL = vm.createContext(winNoLive);
  vm.runInContext(MACHINES_CODE, ctxNL, { filename: MACHINES_PATH });
  const origAppendNL = winNoLive.document.head.appendChild.bind(winNoLive.document.head);
  winNoLive.document.head.appendChild = node => {
    origAppendNL(node);
    if (node.tagName === 'SCRIPT') {
      vm.runInContext(LINEAGE_DATA_CODE, ctxNL, { filename: LINEAGE_DATA_PATH });
      if (node.onload) node.onload();
    }
    return node;
  };
  vm.runInContext(INDEX_SCRIPTS[2].code, ctxNL, { filename: INDEX_SCRIPTS[2].filePath });
  const inpNL = winNoLive.document.getElementById('homeSearch');
  inpNL.value = 'Smooth';
  inpNL.dispatchEvent(new EventObj('input'));
  await Promise.resolve();
  inpNL.dispatchEvent(new EventObj('keydown', { key: 'Escape' }));

  // Input matching <=6 with prefix on realName & substring (e.g. "flores" -> matches Christopher Flores, Godwin Flores, etc.)
  inp.value = 'gozun';
  inp.dispatchEvent(new EventObj('input'));
  await Promise.resolve();
  assert.equal(list.children.length, 2);
  assert.equal(inp.getAttribute('aria-expanded'), 'true');

  // Keyboard navigation: ArrowDown, ArrowUp, Enter when idx=-1, Enter when idx>=0, other key, Escape
  inp.dispatchEvent(new EventObj('keydown', { key: 'Enter' })); // idx === -1, no navigation
  assert.equal(win.location.href, 'http://localhost/');

  inp.dispatchEvent(new EventObj('keydown', { key: 'ArrowDown' }));
  assert.equal(inp.getAttribute('aria-activedescendant'), 'hs0');
  assert.equal(list.children[0].getAttribute('aria-selected'), 'true');

  inp.dispatchEvent(new EventObj('keydown', { key: 'ArrowUp' }));
  assert.equal(inp.getAttribute('aria-activedescendant'), null);

  inp.dispatchEvent(new EventObj('keydown', { key: 'ArrowDown' }));
  inp.dispatchEvent(new EventObj('keydown', { key: 'Tab' })); // unhandled key branch
  inp.dispatchEvent(new EventObj('keydown', { key: 'Enter' }));
  assert.match(win.location.href, /^tree\.html\?member=\d+$/);

  // Mousedown prevents default; click navigates
  const mdEv = new EventObj('mousedown');
  list.children[1].dispatchEvent(mdEv);
  assert.equal(mdEv.defaultPrevented, true);
  list.children[1].click();
  assert.match(win.location.href, /^tree\.html\?member=\d+$/);

  // Pointerdown inside list sets keep=true so blur keeps list open
  list.dispatchEvent(new EventObj('pointerdown', { target: list.children[0] }));
  inp.dispatchEvent(new EventObj('blur'));
  win._flushTimeouts();
  assert.equal(list.hidden, false);

  // Document pointerdown on inp or inside list keeps open; outside closes
  win.document.dispatchEvent(new EventObj('pointerdown', { target: inp }));
  assert.equal(list.hidden, false);
  win.document.dispatchEvent(new EventObj('pointerdown', { target: list.children[0] }));
  assert.equal(list.hidden, false);
  win.document.dispatchEvent(new EventObj('pointerdown', { target: win.document.body }));
  assert.equal(list.hidden, true);

  // Document pointerdown while already hidden
  win.document.dispatchEvent(new EventObj('pointerdown', { target: win.document.body }));
  assert.equal(list.hidden, true);

  // Reopen, test Escape, reopen, test blur without pointerdown (keep=false -> closes)
  inp.dispatchEvent(new EventObj('input'));
  await Promise.resolve();
  assert.equal(list.hidden, false);
  inp.dispatchEvent(new EventObj('keydown', { key: 'Escape' }));
  assert.equal(list.hidden, true);

  inp.dispatchEvent(new EventObj('input'));
  await Promise.resolve();
  assert.equal(list.hidden, false);
  inp.dispatchEvent(new EventObj('blur'));
  win._flushTimeouts();
  assert.equal(list.hidden, true);
});
