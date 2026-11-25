'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { REPO_ROOT, extractInlineScripts } = require('./helpers/extract-scripts');
const { createWindowEnv, EventObj } = require('./helpers/dom');

const TREE_SCRIPTS = extractInlineScripts('tree.html');
const ICONS_PATH = path.join(REPO_ROOT, 'icons.js');
const ICONS_CODE = fs.readFileSync(ICONS_PATH, 'utf8');
const MACHINES_PATH = path.join(REPO_ROOT, 'state-machines.js');
const MACHINES_CODE = fs.readFileSync(MACHINES_PATH, 'utf8');
const DATA_FILES = ['lineage-data.js', 'class-dads.js', 'relationships.js'].map(f => ({
  filePath: path.join(REPO_ROOT, f),
  code: fs.readFileSync(path.join(REPO_ROOT, f), 'utf8'),
}));

const DESKTOP_MQ = '(min-width:701px) and (min-height:521px) and (pointer:fine),(min-width:740px) and (min-height:580px)';

function buildTreeDom(doc) {
  const main = doc.createElement('main');
  const appTitle = doc.createElement('div');
  appTitle.className = 'app-title';
  const statMembers = doc.createElement('b');
  statMembers.id = 'statMembers';
  appTitle.append(statMembers);

  const explorer = doc.createElement('section');
  explorer.id = 'explorer';

  const tools = doc.createElement('div');
  tools.className = 'tools';
  const findForm = doc.createElement('form');
  findForm.id = 'find';
  const query = doc.createElement('input');
  query.id = 'query';
  findForm.append(query);

  const viewToggle = doc.createElement('button');
  viewToggle.id = 'viewToggle';
  viewToggle.setAttribute('aria-expanded', 'false');

  const viewControls = doc.createElement('div');
  viewControls.id = 'viewControls';
  const branchSel = doc.createElement('select');
  branchSel.id = 'branch';
  const lineageSel = doc.createElement('select');
  lineageSel.id = 'lineage';
  for (const v of ['big', 'dad']) {
    const o = doc.createElement('option');
    o.value = v;
    lineageSel.append(o);
  }
  const orientationSel = doc.createElement('select');
  orientationSel.id = 'orientation';
  const optH = doc.createElement('option');
  optH.value = 'horizontal';
  const optV = doc.createElement('option');
  optV.value = 'vertical';
  optV.selected = true;
  orientationSel.append(optH, optV);

  const zoomControls = doc.createElement('div');
  zoomControls.className = 'zoom-controls';
  const zoomOut = doc.createElement('button'); zoomOut.id = 'zoomOut';
  const zoomOutText = doc.createElement('output'); zoomOutText.id = 'zoom';
  const zoomIn = doc.createElement('button'); zoomIn.id = 'zoomIn';
  const fitBtn = doc.createElement('button'); fitBtn.id = 'fit';
  zoomControls.append(zoomOut, zoomOutText, zoomIn, fitBtn);

  const overviewBtn = doc.createElement('button');
  overviewBtn.id = 'overview';

  const memberPanel = doc.createElement('div');
  memberPanel.id = 'member';
  memberPanel.hidden = true;
  const memberName = doc.createElement('strong'); memberName.id = 'memberName';
  const memberMeta = doc.createElement('span'); memberMeta.id = 'memberMeta';
  const viewTree = doc.createElement('button'); viewTree.id = 'viewTree';
  const viewList = doc.createElement('button'); viewList.id = 'viewList';
  const parentBtn = doc.createElement('button'); parentBtn.id = 'parent';
  const modeLabel = doc.createElement('label'); modeLabel.className = 'toggle';
  const modeInput = doc.createElement('input'); modeInput.id = 'mode'; modeInput.checked = true;
  modeLabel.append(modeInput);
  const depthLabel = doc.createElement('label'); depthLabel.className = 'toggle';
  const depthInput = doc.createElement('input'); depthInput.id = 'depth'; depthInput.checked = false;
  depthLabel.append(depthInput);
  memberPanel.append(memberName, memberMeta, viewTree, viewList, parentBtn, modeLabel, depthLabel);

  const menuSchools = doc.createElement('ul');
  menuSchools.setAttribute('data-school-key', '');
  const menuKey = doc.createElement('div');
  menuKey.className = 'menu-key';

  viewControls.append(branchSel, lineageSel, orientationSel, zoomControls, overviewBtn, memberPanel, menuSchools, menuKey);
  tools.append(findForm, viewToggle, viewControls);

  const matches = doc.createElement('div'); matches.id = 'matches';
  const desktopMember = doc.createElement('div'); desktopMember.id = 'desktopMember';
  const caption = doc.createElement('p'); caption.id = 'caption';
  const depthNote = doc.createElement('p'); depthNote.id = 'depthNote'; depthNote.hidden = true;
  const founderList = doc.createElement('div'); founderList.id = 'founderList'; founderList.hidden = true;
  const generations = doc.createElement('div'); generations.id = 'generations'; generations.hidden = true;

  const canvas = doc.createElement('div');
  canvas.id = 'canvas';
  canvas.clientWidth = 1200;
  canvas.clientHeight = 800;
  const svg = doc.createElement('svg');
  canvas.append(svg);

  const connectionsBtn = doc.createElement('button'); connectionsBtn.id = 'connections'; connectionsBtn.hidden = true;
  const connectionsPanel = doc.createElement('dialog'); connectionsPanel.id = 'connectionsPanel';
  const connectionsTitle = doc.createElement('h2'); connectionsTitle.id = 'connectionsTitle';
  const connectionsMeta = doc.createElement('p'); connectionsMeta.id = 'connectionsMeta';
  const connectionsBody = doc.createElement('div'); connectionsBody.id = 'connectionsBody';
  connectionsPanel.append(connectionsTitle, connectionsMeta, connectionsBody);

  const diagramKey = doc.createElement('div');
  diagramKey.className = 'diagram-key';
  const schoolKey = doc.createElement('ul');
  schoolKey.setAttribute('data-school-key', '');
  diagramKey.append(schoolKey);

  explorer.append(tools, matches, desktopMember, caption, depthNote, founderList, generations, canvas, connectionsBtn, connectionsPanel, diagramKey);
  main.append(appTitle, explorer);
  doc.body.append(main);
}

function bootTree({ desktop = true, search = '', localStorage = {}, localStorageOpts, customData, canvasWidth = 1200, canvasHeight = 800, pathname, throwOnHistory } = {}) {
  const win = createWindowEnv({
    mediaMatches: { [DESKTOP_MQ]: desktop },
    search,
    localStorage,
    localStorageOpts,
    pathname,
    throwOnHistory,
  });
  buildTreeDom(win.document);
  const canvas = win.document.getElementById('canvas');
  canvas.clientWidth = canvasWidth;
  canvas.clientHeight = canvasHeight;

  const ctx = vm.createContext(win);
  vm.runInContext(TREE_SCRIPTS[0].code, ctx, { filename: TREE_SCRIPTS[0].filePath });
  vm.runInContext(ICONS_CODE, ctx, { filename: ICONS_PATH });
  vm.runInContext(MACHINES_CODE, ctx, { filename: MACHINES_PATH });
  if (customData) {
    Object.assign(ctx, customData);
  } else {
    for (const df of DATA_FILES) {
      vm.runInContext(df.code, ctx, { filename: df.filePath });
    }
  }
  vm.runInContext(TREE_SCRIPTS[1].code, ctx, { filename: TREE_SCRIPTS[1].filePath });
  return { win, ctx };
}

test('tree.html inline script 0: theme init (dark, light, error)', () => {
  const w1 = createWindowEnv({ localStorage: { 'kpib-theme': 'dark' } });
  vm.runInContext(TREE_SCRIPTS[0].code, vm.createContext(w1), { filename: TREE_SCRIPTS[0].filePath });
  assert.equal(w1.document.documentElement.dataset.theme, 'dark');

  const w2 = createWindowEnv({ localStorage: { 'kpib-theme': 'light' } });
  vm.runInContext(TREE_SCRIPTS[0].code, vm.createContext(w2), { filename: TREE_SCRIPTS[0].filePath });
  assert.equal(w2.document.documentElement.dataset.theme, undefined);

  const w3 = createWindowEnv({ localStorageOpts: { throwOnGet: true } });
  assert.doesNotThrow(() => {
    vm.runInContext(TREE_SCRIPTS[0].code, vm.createContext(w3), { filename: TREE_SCRIPTS[0].filePath });
  });
});

test('tree.html desktop: overview, search, member selection, depth/mode toggles, zoom, keyboard, generations, connections, and resize', () => {
  const { win, ctx } = bootTree({ desktop: true });
  const doc = win.document;

  assert.equal(doc.getElementById('statMembers').textContent, '621');
  assert.equal(doc.getElementById('branch').value, '-1');
  assert.equal(doc.getElementById('caption').textContent, 'Full organization. Search or choose a branch to read names.');

  // CR-01 fixed: OVERVIEW now properly enforces depthLimit (much fewer than 619 nodes!)
  const overviewNodes = doc.querySelectorAll('.node').length;
  assert.ok(overviewNodes > 7 && overviewNodes < 619);
  assert.equal(doc.getElementById('depthNote').hidden, false);
  assert.equal(win._historyCalls.at(-1), '/tree.html');

  // Zoom filter checks (left button outside node = true, right button = false, mousedown on .node = false, wheel = true)
  const svg = doc.querySelector('#canvas svg');
  const firstNode = doc.querySelector('.node');
  assert.equal(svg.__zoomFilter(new EventObj('mousedown', { button: 0, target: svg })), true);
  assert.equal(svg.__zoomFilter(new EventObj('mousedown', { button: 2, target: svg })), false);
  assert.equal(svg.__zoomFilter(new EventObj('mousedown', { button: 0, target: firstNode })), false);
  assert.equal(svg.__zoomFilter(new EventObj('wheel', { button: 0, target: firstNode })), true);

  // Zoom buttons & fit
  doc.getElementById('zoomIn').click();
  doc.getElementById('zoomOut').click();
  doc.getElementById('fit').click();
  assert.match(doc.getElementById('zoom').textContent, /%$/);

  // Canvas keyboard panning (arrows, non-arrow, target !== canvas)
  const canvas = doc.getElementById('canvas');
  for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter']) {
    canvas.dispatchEvent(new EventObj('keydown', { key, target: canvas }));
  }
  canvas.dispatchEvent(new EventObj('keydown', { key: 'ArrowLeft', target: svg }));

  // Click root synthetic node (d.data === -1) and defaultPrevented click -> no selection
  firstNode.click();
  assert.equal(doc.getElementById('member').hidden, true);
  firstNode.dispatchEvent(new EventObj('keydown', { key: 'Enter', target: firstNode }));

  // Click founder 0 node (d.data === 0) via click, defaultPrevented click, Enter, Space, and ignored key
  const founderNode = doc.querySelectorAll('.node')[1];
  founderNode.dispatchEvent(new EventObj('click', { defaultPrevented: true, target: founderNode }));
  founderNode.click();
  assert.equal(doc.getElementById('memberName').textContent, 'Christopher Flores');
  assert.equal(doc.getElementById('parent').hidden, true);
  founderNode.dispatchEvent(new EventObj('keydown', { key: 'Enter', target: founderNode }));
  founderNode.dispatchEvent(new EventObj('keydown', { key: ' ', target: founderNode }));
  founderNode.dispatchEvent(new EventObj('keydown', { key: 'Escape', target: founderNode }));

  // Depth note visible when founder branch truncated (depth 5 < maxDepth 18)
  assert.equal(doc.getElementById('depthNote').hidden, false);

  // Open connections on founder (0 ancestry -> "This member is a founder.")
  doc.getElementById('connections').click();
  assert.equal(doc.getElementById('connectionsPanel').open, true);
  assert.ok(doc.getElementById('connectionsBody').textContent.includes('This member is a founder.'));
  // Click first little inside connections dialog
  const connBtn = doc.querySelector('#connectionsBody button');
  connBtn.click();
  assert.equal(doc.getElementById('connectionsPanel').open, false);
  assert.equal(doc.getElementById('parent').hidden, false);

  // Click parent button to move up
  doc.getElementById('parent').click();
  assert.equal(doc.getElementById('memberName').textContent, 'Christopher Flores');

  // Toggle Generations list view (Big Brother mode: >3 generations hits 'Generation N' fallback)
  doc.getElementById('viewList').click();
  doc.getElementById('viewList').click(); // already active -> early return
  assert.equal(doc.getElementById('generations').hidden, false);
  assert.ok(doc.getElementById('generations').textContent.includes('Generation 4'));
  // UX-07 fixed: caption in Big Brother + Generations mode mentions Big Brother / littles
  assert.match(doc.getElementById('caption').textContent, /Big Brother/i);

  // Click a generation button to navigate
  const genBtn = doc.querySelector('#generations button');
  genBtn.click();
  // Switch back to Tree view
  doc.getElementById('viewTree').click();
  assert.equal(doc.getElementById('generations').hidden, true);

  // Switch to Full branch mode (mode unchecked -> 'branch') & back to 'downstream'
  const mode = doc.getElementById('mode');
  mode.checked = false;
  mode.dispatchEvent(new EventObj('change'));
  assert.match(doc.getElementById('caption').textContent, /Full founder branch/);
  mode.checked = true;
  mode.dispatchEvent(new EventObj('change'));
  assert.match(doc.getElementById('caption').textContent, /Showing this member/);
  mode.checked = false;
  mode.dispatchEvent(new EventObj('change'));

  // CR-02 / UX-02 fixed: deep member (depth > 5) stays visible in nodesById when scope === 'branch' & depthMode === 'auto'!
  doc.getElementById('query').value = 'Arondight';
  doc.getElementById('find').requestSubmit();
  assert.equal(doc.getElementById('memberName').textContent, 'Neeko De Vera');
  assert.equal(vm.runInContext(`nodesById.has(176)`, ctx), true);
  assert.equal(win._historyCalls.at(-1), '?member=176');
  // Exercise focusNode early return when id does not exist
  vm.runInContext(`focusNode(99999, true)`, ctx);

  // Toggle Full depth ON then OFF
  const depth = doc.getElementById('depth');
  depth.checked = true;
  depth.dispatchEvent(new EventObj('change'));
  assert.equal(win.localStorage.getItem('kpib-depth'), 'full');
  depth.checked = false;
  depth.dispatchEvent(new EventObj('change'));
  assert.equal(win.localStorage.getItem('kpib-depth'), '5');

  // Switch orientation vertical <-> horizontal (with selected member & with OVERVIEW)
  const orient = doc.getElementById('orientation');
  orient.value = 'horizontal';
  orient.dispatchEvent(new EventObj('change'));
  orient.value = 'vertical';
  orient.dispatchEvent(new EventObj('change'));

  // Switch lineage mode to 'dad' while selected (also test co-class-dad member 147 & Alexis Soule 131)
  const lineage = doc.getElementById('lineage');
  lineage.value = 'dad';
  lineage.dispatchEvent(new EventObj('change'));
  assert.equal(win.localStorage.getItem('kpib-lineage'), 'dad');

  // Search for member 147 (has 2 class dads: Rayne Yap & Alexis Soule) -> Connections shows 'Class dads' group
  // Also verify backdrop click closes #connectionsPanel (UX-13 fixed!) while clicking inside does not
  doc.getElementById('query').value = 'GoldenEye';
  doc.getElementById('find').requestSubmit();
  doc.getElementById('connections').click();
  assert.ok(doc.getElementById('connectionsBody').textContent.includes('Class dads'));
  doc.getElementById('connectionsBody').click(); // inside dialog -> stays open
  assert.equal(doc.getElementById('connectionsPanel').open, true);
  doc.getElementById('connectionsPanel').click(); // backdrop target === dialog -> closes!
  assert.equal(doc.getElementById('connectionsPanel').open, false);

  // CR-03 / UX-04 fixed: Alexis Soule (131) shows '8 kids' consistently in memberMeta, focused tree, Connections, and Generations!
  doc.getElementById('query').value = 'Alexis Soule';
  doc.getElementById('find').requestSubmit();
  assert.ok(doc.getElementById('memberMeta').textContent.includes('8 kids'));
  doc.getElementById('connections').click();
  assert.equal(doc.getElementById('connectionsBody').textContent.includes('None recorded.'), false);
  doc.getElementById('connectionsPanel').close();
  doc.getElementById('viewList').click();
  assert.match(doc.getElementById('caption').textContent, /class dad/i);
  assert.ok(doc.getElementById('generations').textContent.includes('descendants'));
  // Click leaf member with 0 descendants & 0 kids to exercise empty states
  doc.getElementById('query').value = 'Tsukuyomi';
  doc.getElementById('find').requestSubmit();
  assert.ok(doc.getElementById('generations').textContent.includes('none recorded'));
  doc.getElementById('connections').click();
  assert.ok(doc.getElementById('connectionsBody').textContent.includes('None recorded.'));
  doc.getElementById('connectionsPanel').close();
  doc.getElementById('viewTree').click();

  // Exercise 1-little (singular) & 1-kid (singular) + 1 descendant in 1 generation
  // Switch to Big Brother mode and find a member with exactly 1 little who has 0 littles
  lineage.value = 'big';
  lineage.dispatchEvent(new EventObj('change'));
  doc.getElementById('query').value = 'Carnage'; // check a parent with 1 little or search via vm
  const singleBigId = vm.runInContext(`records.findIndex((_, id) => children[id].length === 1 && children[children[id][0]].length === 0)`, ctx);
  assert.ok(singleBigId >= 0);
  vm.runInContext(`selectMember(${singleBigId}, false)`, ctx);
  assert.match(doc.getElementById('memberMeta').textContent, /1 little$/);
  doc.getElementById('viewList').click();
  assert.ok(doc.getElementById('generations').textContent.includes('1 descendant in 1 generation'));
  doc.getElementById('viewTree').click();

  // Switch to Dad mode and check singular '1 kid' (Mizzou single-member class dad)
  lineage.value = 'dad';
  lineage.dispatchEvent(new EventObj('change'));
  const singleDadId = vm.runInContext(`records.findIndex((_, id) => children[id].length === 1)`, ctx);
  assert.ok(singleDadId >= 0);
  vm.runInContext(`selectMember(${singleDadId}, false)`, ctx);
  assert.match(doc.getElementById('memberMeta').textContent, /1 kid$/);

  // Also cover Generation 5+ in dad mode (Founder 0 has >=5 class-dad generations)
  vm.runInContext(`selectMember(0, false)`, ctx);
  doc.getElementById('viewList').click();
  assert.ok(doc.getElementById('generations').textContent.includes('Great-great-grandkids'));
  doc.getElementById('viewTree').click();

  // Search form edge cases: empty, 0 matches, 2..16 matches, >16 matches, input clear, Escape clear, clicking match
  const q = doc.getElementById('query');
  const find = doc.getElementById('find');
  const matchesEl = doc.getElementById('matches');
  q.value = '   '; find.requestSubmit();
  assert.equal(matchesEl.children.length, 0);
  q.value = 'zzzznotfound'; find.requestSubmit();
  assert.equal(matchesEl.textContent, 'No matching names.');
  q.value = 'an'; find.requestSubmit();
  const anCount = Number(matchesEl.children[0].textContent.match(/^(\d+) matches$/)[1]);
  assert.ok(anCount > 16, `expected > 16 matches for "an", got ${anCount}`);
  assert.equal(matchesEl.children.length, anCount + 1); // 1 span + all matching buttons
  q.dispatchEvent(new EventObj('keydown', { key: 'Tab' }));
  assert.equal(matchesEl.children.length, anCount + 1);
  q.dispatchEvent(new EventObj('keydown', { key: 'Escape' }));
  assert.equal(matchesEl.children.length, 0);
  q.value = 'Gozun'; find.requestSubmit();
  assert.equal(matchesEl.children.length, 3); // span + 2 Gozun founders
  q.dispatchEvent(new EventObj('input'));
  assert.equal(matchesEl.children.length, 0);
  q.value = 'Gozun'; find.requestSubmit();
  matchesEl.querySelector('button').click();
  assert.equal(doc.getElementById('memberName').textContent, 'Alfred Gozun');

  // Branch select change -> OVERVIEW & founder id; Overview button; orientation change with selected===null
  const branch = doc.getElementById('branch');
  branch.value = '-1';
  branch.dispatchEvent(new EventObj('change'));
  assert.equal(doc.getElementById('member').hidden, true);
  // Clicking connections when no member is selected is guarded by treeMachine
  doc.getElementById('connections').click();
  assert.equal(doc.getElementById('connectionsPanel').open, false);
  // depth toggle when selected === null
  depth.checked = true; depth.dispatchEvent(new EventObj('change'));
  depth.checked = false; depth.dispatchEvent(new EventObj('change'));
  // orientation change when selected === null
  orient.value = 'horizontal'; orient.dispatchEvent(new EventObj('change'));
  // lineage change when selected === null and branch === OVERVIEW
  lineage.value = 'big'; lineage.dispatchEvent(new EventObj('change'));
  // branch select to founder id >= 0
  branch.value = '0'; branch.dispatchEvent(new EventObj('change'));
  assert.equal(doc.getElementById('memberName').textContent, 'Christopher Flores');

  // ResizeObserver: when selected !== null & depth changes, and when branch === OVERVIEW
  const ro = win._roInstances[0];
  canvas.clientWidth = 300; // changes defaultDepth() in horizontal mode
  ro._trigger();
  ro._trigger(); // depth unchanged -> no-op branch
  // Overview button returns to OVERVIEW
  doc.getElementById('overview').click();
  ro._trigger(); // hits branch === OVERVIEW -> fit()

  // ResizeObserver with canvas width = 0 -> defaultDepth returns lastDepth & fit early returns
  canvas.clientWidth = 0;
  canvas.clientHeight = 0;
  doc.getElementById('fit').click();
  assert.equal(vm.runInContext(`defaultDepth(treeMachine.getState())`, ctx) >= 3, true);
});

test('tree.html phone mode, URL deep links, floating/UNRESOLVED branches, and throwing localStorage', () => {
  // 1. Phone mode with localStorage 'dad' & 'full' + throwing setItem, ?member=invalid & ?q=Smooth
  const { win, ctx } = bootTree({
    desktop: false,
    search: '?member=abc&q=Smooth',
    localStorage: { 'kpib-lineage': 'dad', 'kpib-depth': 'full' },
    localStorageOpts: { throwOnSet: true },
    canvasWidth: 390,
    canvasHeight: 700,
  });
  const doc = win.document;
  assert.equal(doc.getElementById('memberName').textContent, 'Christopher Flores');
  assert.equal(doc.getElementById('orientation').value, 'horizontal');

  // Toggle view controls popover: open, Escape closes, pointerdown inside vs outside
  const viewToggle = doc.getElementById('viewToggle');
  viewToggle.click();
  assert.equal(viewToggle.getAttribute('aria-expanded'), 'true');
  doc.dispatchEvent(new EventObj('keydown', { key: 'Escape' }));
  assert.equal(viewToggle.getAttribute('aria-expanded'), 'false');
  doc.dispatchEvent(new EventObj('keydown', { key: 'Escape' })); // already closed
  viewToggle.click();
  doc.dispatchEvent(new EventObj('pointerdown', { target: doc.querySelector('.tools') }));
  assert.equal(viewToggle.getAttribute('aria-expanded'), 'true');
  doc.dispatchEvent(new EventObj('pointerdown', { target: doc.body }));
  assert.equal(viewToggle.getAttribute('aria-expanded'), 'false');

  // Click overview -> FOUNDERS view on phone, orientation change in FOUNDERS returns early, lineage change in FOUNDERS
  doc.getElementById('overview').click();
  assert.equal(doc.getElementById('founderList').hidden, false);
  doc.getElementById('orientation').value = 'vertical';
  doc.getElementById('orientation').dispatchEvent(new EventObj('change'));
  // Throwing localStorage on lineage & depth change
  doc.getElementById('lineage').value = 'big';
  doc.getElementById('lineage').dispatchEvent(new EventObj('change'));
  // Click founder card in founderList
  doc.querySelector('#founderList button').click();
  assert.equal(doc.getElementById('memberName').textContent, 'Christopher Flores');
  doc.getElementById('depth').checked = false;
  doc.getElementById('depth').dispatchEvent(new EventObj('change'));

  // Test phone readable fit() in both horizontal and vertical with small tree (single-leaf subtree fits height)
  // Pick a member with 1 child at vertical orientation so dimensions[1]*scale <= h-24 (else if rootPoint.vertical)
  // and also a member with wide tree so dimensions[0]*scale > w-24 and dimensions[1]*scale > h-24
  const leafId = 617;
  vm.runInContext(`selectMember(${leafId}, true)`, ctx); // small tree, vertical
  doc.getElementById('orientation').value = 'horizontal';
  doc.getElementById('orientation').dispatchEvent(new EventObj('change')); // small tree, horizontal
  // Small tree exceeding height in phone vertical readable mode (dimensions[1]*scale > h-24 with fitted >= 0.25)
  const canvas = doc.getElementById('canvas');
  canvas.clientWidth = 390;
  canvas.clientHeight = 400;
  // Switch to dad mode, horizontal orientation, Rayne Yap (132)
  doc.getElementById('lineage').value = 'dad';
  doc.getElementById('lineage').dispatchEvent(new EventObj('change'));
  doc.getElementById('orientation').value = 'horizontal';
  vm.runInContext(`selectMember(132, false)`, ctx);
  doc.getElementById('lineage').value = 'big';
  doc.getElementById('lineage').dispatchEvent(new EventObj('change'));
  // Small tree exceeding width & height in phone readable mode (e.g. member 30, canvas 360x320)
  canvas.clientWidth = 360;
  canvas.clientHeight = 320;
  vm.runInContext(`selectMember(30, false)`, ctx);
  doc.getElementById('orientation').value = 'vertical';
  doc.getElementById('orientation').dispatchEvent(new EventObj('change'));

  // Switch media query from phone -> desktop to test VIEWPORT_CHANGED & synced branch options (UX-05 fixed!)
  doc.getElementById('overview').click();
  win._mql(DESKTOP_MQ)._setMatches(true);
  assert.equal(doc.getElementById('viewToggle').hidden, true);
  assert.equal(doc.getElementById('branch').value, '-1');
  win._mql(DESKTOP_MQ)._setMatches(false);
  assert.equal(doc.getElementById('viewToggle').hidden, false);
  assert.equal(doc.getElementById('branch').value, '-3');

  // 2. Direct ?member=2 deep link, throwing localStorage.getItem, throwing history.replaceState, and empty pathname fallback
  const { win: w2 } = bootTree({
    desktop: true,
    search: '?member=2',
    localStorageOpts: { throwOnGet: true },
    throwOnHistory: true,
    pathname: '',
  });
  assert.equal(w2.document.getElementById('memberName').textContent, 'Phillip Gozun');
  w2.document.getElementById('overview').click();

  // 3. Out-of-bounds ?member=9999 falls back to OVERVIEW / FOUNDERS
  const { win: w3 } = bootTree({ desktop: false, search: '?member=9999' });
  assert.equal(w3.document.getElementById('founderList').hidden, false);

  // 4. Synthetic dataset with a floating (UNRESOLVED) branch in 'big' mode that disappears in 'dad' mode,
  //    plus a member with empty dadsByMember in dad Generations view, and ResizeObserver with selected===null
  const customData = {
    campuses: ['AlphaU', 'BetaU'],
    records: [
      ['FounderA', null, true, 'Founder One'],
      ['FloatRoot', null, false, 'Floating Member'],
      ['FloatKid', 1, false, 'Floating Kid'],
      ['Deep1', 2, false, 'Deep One'],
      ['Deep2', 3, false, 'Deep Two'],
      ['Deep3', 4, false, 'Deep Three'],
    ],
    schoolIds: [0, 0, 1, 1, 1, 1],
    crossings: [
      ['Spring 2000', 'Founders'],
      ['Fall 2000', 'Alpha'],
      ['Fall 2001', 'Beta'],
      ['Fall 2002', 'Gamma'],
      ['Fall 2003', 'Delta'],
      ['Fall 2004', 'Epsilon'],
    ],
    dadsByMember: [[], ['Founder One'], [], ['Floating Kid'], ['Deep One'], ['Deep Two']],
    classDadIdsByMember: [[], [0], [1], [2], [3], [4]],
    classDadByMember: [null, 0, 1, 2, 3, 4],
    kidsByMember: [[1], [2], [3], [4], [5], []],
    normalizeMemberQuery: s => s.toLowerCase().trim(),
    matchesMember: (r, t) => r[0].toLowerCase().includes(t) || r[3].toLowerCase().includes(t),
  };

  const { win: wFloat, ctx: ctxFloat } = bootTree({
    desktop: true,
    customData,
    canvasWidth: 800,
    canvasHeight: 200,
  });
  const branchFloat = wFloat.document.getElementById('branch');
  // 'Binder-only branches' (-2) option exists!
  assert.ok(branchFloat.options.some(o => o.value === '-2'));
  // Select UNRESOLVED (-2)
  branchFloat.value = '-2';
  branchFloat.dispatchEvent(new EventObj('change'));
  // Trigger ResizeObserver while branch === UNRESOLVED (selected === null) and depth changes!
  wFloat.document.getElementById('canvas').clientHeight = 900;
  wFloat._roInstances[0]._trigger();
  // Select floating member 1 -> rootOf(1) returns UNRESOLVED (-2)
  vm.runInContext(`selectMember(1, false)`, ctxFloat);
  assert.equal(branchFloat.value, '-2');
  // Go back to UNRESOLVED (selected === null), switch lineage to 'dad' where floating.length === 0!
  branchFloat.value = '-2';
  branchFloat.dispatchEvent(new EventObj('change'));
  const linFloat = wFloat.document.getElementById('lineage');
  linFloat.value = 'dad';
  linFloat.dispatchEvent(new EventObj('change'));
  assert.equal(branchFloat.value, '-1'); // falls back to OVERVIEW on desktop!

  // Also test Generations view in dad mode when index > 0 and dadsByMember[id] is empty ([])
  vm.runInContext(`selectMember(0, false)`, ctxFloat);
  wFloat.document.getElementById('viewList').click();
  assert.equal(wFloat.document.getElementById('generations').hidden, false);

  // Also test phone mode UNRESOLVED -> dad switch falls back to FOUNDERS (-3)
  // AND exercise phone vertical readable fit() where dimensions[1]*scale > h-24 (chain 0->1->2->3->4->5)
  const { win: wFloatPhone, ctx: ctxFloatPhone } = bootTree({
    desktop: false,
    customData,
    canvasWidth: 390,
    canvasHeight: 400,
  });
  wFloatPhone.document.getElementById('branch').value = '-2';
  wFloatPhone.document.getElementById('branch').dispatchEvent(new EventObj('change'));
  wFloatPhone.document.getElementById('lineage').value = 'dad';
  wFloatPhone.document.getElementById('lineage').dispatchEvent(new EventObj('change'));
  assert.equal(wFloatPhone.document.getElementById('founderList').hidden, false);
  wFloatPhone.document.getElementById('orientation').value = 'vertical';
  wFloatPhone.document.getElementById('orientation').dispatchEvent(new EventObj('change'));
  vm.runInContext(`selectMember(0, false)`, ctxFloatPhone);

  // 5. Phone horizontal readable fit() where dimensions[1]*scale > h-24 (1 parent + 5 leaf children)
  const fanData = {
    campuses: ['AlphaU'],
    records: [
      ['Root', null, true, 'Root One'],
      ['K1', 0, false, 'Kid One'],
      ['K2', 0, false, 'Kid Two'],
      ['K3', 0, false, 'Kid Three'],
      ['K4', 0, false, 'Kid Four'],
      ['K5', 0, false, 'Kid Five'],
    ],
    schoolIds: [0, 0, 0, 0, 0, 0],
    crossings: [
      ['Spring 2000', 'Founders'],
      ['Fall 2000', 'Alpha'],
      ['Fall 2000', 'Alpha'],
      ['Fall 2000', 'Alpha'],
      ['Fall 2000', 'Alpha'],
      ['Fall 2000', 'Alpha'],
    ],
    dadsByMember: [[], ['Root One'], ['Root One'], ['Root One'], ['Root One'], ['Root One']],
    classDadIdsByMember: [[], [0], [0], [0], [0], [0]],
    classDadByMember: [null, 0, 0, 0, 0, 0],
    kidsByMember: [[1, 2, 3, 4, 5], [], [], [], [], []],
    normalizeMemberQuery: s => s.toLowerCase().trim(),
    matchesMember: (r, t) => r[0].toLowerCase().includes(t) || r[3].toLowerCase().includes(t),
  };
  const { ctx: ctxFan } = bootTree({
    desktop: false,
    customData: fanData,
    canvasWidth: 390,
    canvasHeight: 400,
  });
  vm.runInContext(`selectMember(0, false)`, ctxFan);
});
