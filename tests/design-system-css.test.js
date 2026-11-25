'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { REPO_ROOT } = require('./helpers/extract-scripts');

const CSS = fs.readFileSync(path.join(REPO_ROOT, 'kpib.css'), 'utf8');
const TREE_HTML = fs.readFileSync(path.join(REPO_ROOT, 'tree.html'), 'utf8');

function parseThemeTokens(cssText, blockPattern) {
  const match = cssText.match(blockPattern);
  assert.ok(match, `Missing CSS block matching ${blockPattern}`);
  const tokens = {};
  for (const m of match[1].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    tokens[m[1]] = m[2].trim();
  }
  return tokens;
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean.slice(0, 6);
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}

function luminance([r, g, b]) {
  const [rs, gs, bs] = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.7152 * 0 + 0.0722 * bs;
}

function contrastRatio(c1, c2) {
  const l1 = luminance(hexToRgb(c1));
  const l2 = luminance(hexToRgb(c2));
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

test('kpib.css: WCAG 2.2 AA color contrast ratios pass in both Light and Dark themes', () => {
  const light = parseThemeTokens(CSS, /:root,\[data-theme="light"\]\{([\s\S]*?)\}/);
  const dark = { ...light, ...parseThemeTokens(CSS, /\[data-theme="dark"\]\{([\s\S]*?)\}/) };

  const textPairs = [
    ['--ink', '--surface'],
    ['--ink', '--surface-raised'],
    ['--ink-muted', '--surface'],
    ['--ink-muted', '--surface-raised'],
    ['--accent', '--surface'],
    ['--accent', '--surface-raised'],
    ['--on-accent', '--brand-red'],
    ['--on-accent', '--brand-red-hover'],
    ['--on-band', '--surface-band'],
    ['--on-band-muted', '--surface-band'],
    ['--node-root-ink', '--node-root-bg'],
    ['--node-root-muted', '--node-root-bg'],
  ];

  // Light-mode root node stays a light surface (no harsh solid-black box on light canvas)
  assert.ok(luminance(hexToRgb(light['--node-root-bg'])) > 0.8, `light --node-root-bg (${light['--node-root-bg']}) must stay light`);

  for (const [themeName, tokens] of [['light', light], ['dark', dark]]) {
    for (const [fg, bg] of textPairs) {
      const ratio = contrastRatio(tokens[fg], tokens[bg]);
      assert.ok(ratio >= 4.5, `${themeName}: ${fg} (${tokens[fg]}) on ${bg} (${tokens[bg]}) ratio ${ratio.toFixed(2)} < 4.5`);
    }
    // UI non-text control border contrast >= 3.0:1
    for (const bg of ['--surface', '--surface-raised']) {
      const ratio = contrastRatio(tokens['--border-strong'], tokens[bg]);
      assert.ok(ratio >= 3.0, `${themeName}: --border-strong on ${bg} ratio ${ratio.toFixed(2)} < 3.0`);
    }
    assert.ok(contrastRatio(tokens['--node-root-border'], tokens['--surface-raised']) >= 3.0);
    // Focus ring contrast >= 3.0:1 on surfaces
    assert.ok(contrastRatio(tokens['--focus-ring'], tokens['--surface']) >= 3.0);
    // Hovered +N pill (--surface text on --ink pill) >= 4.5:1 (UX-01 regression guard)
    assert.ok(contrastRatio(tokens['--surface'], tokens['--ink']) >= 4.5);
    // All 6 official university school colors pass >= 3.0:1 UI contrast on regular, raised, and root node surfaces
    for (let i = 0; i < 6; i++) {
      const tok = `--school-${i}`;
      for (const bg of ['--surface', '--surface-raised', '--node-root-bg']) {
        const ratio = contrastRatio(tokens[tok], tokens[bg]);
        assert.ok(ratio >= 3.0, `${themeName}: ${tok} (${tokens[tok]}) on ${bg} ratio ${ratio.toFixed(2)} < 3.0`);
      }
    }
  }
});

test('kpib.css: enforces KPiB Design System rules (dark-mode logo, zero ambient motion, zero color literals, typography floor)', () => {
  // Dark mode uses transparent plate with intact crest + white masked wordmark (no harsh white box)
  assert.match(CSS, /\[data-theme="dark"\] \.kp-plate\{position:relative;background:transparent\}/);
  assert.match(CSS, /\[data-theme="dark"\] \.kp-plate::after\{[^}]*-webkit-mask:url\("assets\/kpib-lockup\.png"\)/);

  // DS-02: No @keyframes ambient/load animations, and reduced-motion disables animation + transition + scroll-behavior
  assert.equal(CSS.includes('@keyframes'), false);
  assert.match(CSS, /@media\s*\(prefers-reduced-motion:reduce\)\s*\{[^}]*animation:none!important[^}]*transition:none!important[^}]*scroll-behavior:auto!important/);

  // DS-05: Zero raw #hex color literals outside the two theme token declaration blocks and data-URI SVGs
  const withoutComments = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
  const withoutTokenBlocks = withoutComments
    .replace(/:root,\[data-theme="light"\]\{[\s\S]*?\}/, '')
    .replace(/\[data-theme="dark"\]\{[\s\S]*?\}/, '')
    .replace(/url\("data:image\/svg\+xml[^"]*"\)/g, '');
  const rawHex = withoutTokenBlocks.match(/#[0-9a-f]{3,8}\b/gi) || [];
  assert.deepEqual(rawHex, [], `Found unexpected raw color literals in component CSS: ${rawHex.join(', ')}`);

  // Accessibility.md:30: No font-size smaller than 12px (except intentional 0px sr-only label hiding)
  for (const m of withoutComments.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/gi)) {
    const px = Number(m[1]);
    assert.ok(px === 0 || px >= 12, `Found font-size ${px}px below 12px floor`);
  }

  // Apple iOS Safari auto-zoom guard: mobile-sort select must stay >= 16px
  assert.match(CSS, /\.page-table \.mobile-sort select\{[^}]*font-size:16px/);
});

test('kpib.css & tree.html: responsive breakpoints stay synchronized (desktopQuery, hero 900px split, stacked table)', () => {
  // UX-03 guard: .kp-herobg 5/11 width only inside min-width:900px, never 700px
  const mq900 = CSS.match(/@media\s*\(min-width:900px\)\{([\s\S]*?)\n\}/);
  assert.ok(mq900 && mq900[1].includes('.kp-herobg{right:auto;width:calc(100% * 5 / 11)}'));

  // desktopQuery in tree.html matches kpib.css verbatim
  const jsQuery = TREE_HTML.match(/const desktopQuery=matchMedia\('([^']+)'\)/);
  assert.ok(jsQuery, 'desktopQuery must exist in tree.html');
  assert.ok(
    CSS.includes(`@media ${jsQuery[1]}{`),
    `kpib.css must contain exact @media ${jsQuery[1]} matching tree.html`
  );

  // DS-06 guard: mobile stacked table uses content:attr(data-label)
  assert.match(CSS, /\.kp-t td::before\{[^}]*content:attr\(data-label\)/);
});
