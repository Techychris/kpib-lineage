#!/usr/bin/env node
/**
 * Kappa Pi Beta Design System v2 — Automated Verification Suite
 * Run with `node --test scripts/verify.mjs` or `npm test`.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOKENS = JSON.parse(fs.readFileSync(path.join(ROOT, 'tokens.json'), 'utf8'));
const TOKENS_CSS = fs.readFileSync(path.join(ROOT, 'tokens.css'), 'utf8');
const BUNDLE_CSS = fs.readFileSync(path.join(ROOT, 'components', 'bundle.css'), 'utf8');

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
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(c1, c2) {
  const l1 = luminance(hexToRgb(c1));
  const l2 = luminance(hexToRgb(c2));
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function colorMap(theme) {
  const map = {};
  for (const t of TOKENS.color.tokens) map[t.name] = t.value[theme];
  return map;
}

test('tokens.json v2 schema & tokens.css parity (zero drift)', () => {
  assert.equal(TOKENS.version, 2);
  for (const t of TOKENS.color.tokens) {
    assert.ok(TOKENS_CSS.includes(`--${t.name}:${t.value.light};`), `tokens.css missing light --${t.name}`);
    assert.ok(TOKENS_CSS.includes(`--${t.name}:${t.value.dark};`), `tokens.css missing dark --${t.name}`);
  }
  for (const group of ['spacing', 'radius', 'duration', 'easing', 'size']) {
    for (const t of TOKENS[group].tokens) {
      assert.ok(TOKENS_CSS.includes(`--${t.name}:${t.value};`), `tokens.css missing --${t.name}`);
    }
  }
  assert.ok(TOKENS_CSS.includes('color-scheme:light;'));
  assert.ok(TOKENS_CSS.includes('color-scheme:dark;'));
});

test('WCAG 2.2 AA contrast verified in Light and Dark themes (text, borders, focus, root nodes, 6 campuses)', () => {
  const light = colorMap('light');
  const dark = colorMap('dark');

  // Guard: light-mode root node stays a light surface (no harsh solid-black box)
  assert.ok(luminance(hexToRgb(light['node-root-bg'])) > 0.8, `light node-root-bg (${light['node-root-bg']}) must stay light`);

  const textPairs = [
    ['ink', 'surface'],
    ['ink', 'surface-raised'],
    ['ink-muted', 'surface'],
    ['ink-muted', 'surface-raised'],
    ['accent', 'surface'],
    ['accent', 'surface-raised'],
    ['on-accent', 'brand-red'],
    ['on-accent', 'brand-red-hover'],
    ['on-band', 'surface-band'],
    ['on-band-muted', 'surface-band'],
    ['node-root-ink', 'node-root-bg'],
    ['node-root-muted', 'node-root-bg'],
  ];

  for (const [themeName, map] of [['light', light], ['dark', dark]]) {
    for (const [fg, bg] of textPairs) {
      const ratio = contrastRatio(map[fg], map[bg]);
      assert.ok(ratio >= 4.5, `${themeName}: ${fg} (${map[fg]}) on ${bg} (${map[bg]}) ratio ${ratio.toFixed(2)} < 4.5`);
    }
    for (const bg of ['surface', 'surface-raised']) {
      assert.ok(contrastRatio(map['border-strong'], map[bg]) >= 3.0);
    }
    assert.ok(contrastRatio(map['node-root-border'], map['surface-raised']) >= 3.0);
    assert.ok(contrastRatio(map['focus-ring'], map['surface']) >= 3.0);

    for (let i = 0; i < 6; i++) {
      const tok = `school-${i}`;
      for (const bg of ['surface', 'surface-raised', 'node-root-bg']) {
        const ratio = contrastRatio(map[tok], map[bg]);
        assert.ok(ratio >= 3.0, `${themeName}: ${tok} (${map[tok]}) on ${bg} (${map[bg]}) ratio ${ratio.toFixed(2)} < 3.0`);
      }
    }
  }
});

test('components/bundle.css enforces v2 rules (transparent dark/footer lockup, motion, touch targets, iOS 16px floor)', () => {
  // Transparent dark-mode & dark-footer logo lockup (never a white box on dark bands)
  assert.match(BUNDLE_CSS, /\[data-theme="dark"\] \.kp-plate,\.kp-ftr \.kp-plate\{[^}]*background:transparent/);
  assert.match(BUNDLE_CSS, /\[data-theme="dark"\] \.kp-plate::after,\.kp-ftr \.kp-plate::after\{[^}]*background:var\(--on-band\)/);
  assert.match(BUNDLE_CSS, /\.kp-ftr \.kp-plate\{[^}]*padding:0[^}]*border-radius:var\(--radius-sharp\)/);

  // Zero @keyframes ambient animations; reduced motion disables animation, transition, scroll-behavior
  assert.equal(BUNDLE_CSS.includes('@keyframes'), false);
  assert.match(BUNDLE_CSS, /@media\(prefers-reduced-motion:reduce\)\{[^}]*animation:none!important[^}]*transition:none!important[^}]*scroll-behavior:auto!important/);

  // New v2 components present: Combobox, CampusPalette, DiagramNode
  assert.match(BUNDLE_CSS, /\.kp-combo\{/);
  assert.match(BUNDLE_CSS, /\.kp-suggest\{/);
  assert.match(BUNDLE_CSS, /\.kp-school-dot\{/);
  assert.match(BUNDLE_CSS, /\.kp-node\.root/);

  // No raw #hex literals outside fixed print/social artboard templates (.kp-art) and photo caption white
  const uiCss = BUNDLE_CSS.split('/* templates (fixed artboards')[0].replace(/\/\*[\s\S]*?\*\//g, '');
  const rawHex = uiCss.match(/#[0-9a-f]{3,8}\b/gi) || [];
  assert.deepEqual(rawHex, [], `Found raw color literals in UI bundle.css: ${rawHex.join(', ')}`);
});

test('component catalog & previews are complete (when components/ previews are present)', () => {
  const compDir = path.join(ROOT, 'components');
  const dirs = fs.readdirSync(compDir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
  if (dirs.length === 0) return; // lean repo sync mode (tokens + bundle.css only)

  assert.ok(dirs.length >= 45, `expected >= 45 components in v2, got ${dirs.length}`);
  for (const name of ['Header', 'Footer', 'Combobox', 'CampusPalette', 'DiagramNode']) {
    assert.ok(dirs.includes(name), `Missing required v2 component directory: ${name}`);
    assert.ok(fs.existsSync(path.join(compDir, name, 'preview.html')), `Missing ${name}/preview.html`);
    assert.ok(fs.existsSync(path.join(compDir, name, 'README.md')), `Missing ${name}/README.md`);
  }

  const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  for (const name of dirs) {
    const preview = path.join(compDir, name, 'preview.html');
    if (fs.existsSync(preview)) {
      assert.ok(indexHtml.includes(`components/${name}/preview.html`), `index.html missing link to ${name}`);
    }
  }
});
