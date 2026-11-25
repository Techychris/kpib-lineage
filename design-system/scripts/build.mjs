#!/usr/bin/env node
/**
 * Kappa Pi Beta Design System v2 — Build Script
 *
 * Single source of truth:
 *   - Reads tokens.json -> generates tokens.css
 *   - Scans components/<Name>/preview.html (@dsCard frontmatter) -> generates index.html
 *
 * Zero external dependencies. Run with `node scripts/build.mjs` or `npm run build`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOKENS_PATH = path.join(ROOT, 'tokens.json');
const TOKENS_CSS_PATH = path.join(ROOT, 'tokens.css');
const COMPONENTS_DIR = path.join(ROOT, 'components');
const INDEX_PATH = path.join(ROOT, 'index.html');

function readTokens() {
  return JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));
}

function generateTokensCss(tokens) {
  const lightLines = [];
  const darkLines = [];

  for (const t of tokens.color.tokens) {
    lightLines.push(`  --${t.name}:${t.value.light};`);
    darkLines.push(`  --${t.name}:${t.value.dark};`);
  }
  for (const s of tokens.shadow.tokens) {
    const lv = typeof s.value === 'string' ? s.value : s.value.light;
    const dv = typeof s.value === 'string' ? s.value : s.value.dark;
    lightLines.push(`  --${s.name}:${lv};`);
    darkLines.push(`  --${s.name}:${dv};`);
  }

  const rootLines = [];
  for (const group of ['spacing', 'radius', 'duration', 'easing', 'size']) {
    for (const t of tokens[group].tokens) {
      rootLines.push(`  --${t.name}:${t.value};`);
    }
  }
  rootLines.push(`  --font-body:${tokens.type.families.body};`);
  rootLines.push(`  --font-display:${tokens.type.families.display};`);

  const typeClasses = [];
  for (const g of tokens.type.groups) {
    const fam = g.family === 'display' ? 'var(--font-display)' : 'var(--font-body)';
    for (const st of g.styles) {
      const decls = [
        `font-family:${fam}`,
        `font-size:${st.fontSize}`,
        `line-height:${st.lineHeight}`,
        `font-weight:${st.fontWeight}`,
      ];
      if (st.letterSpacing) decls.push(`letter-spacing:${st.letterSpacing}`);
      if (st.textTransform) decls.push(`text-transform:${st.textTransform}`);
      typeClasses.push(`.${st.name}{${decls.join(';')};}`);
    }
  }

  return [
    `/* Kappa Pi Beta Design System v${tokens.version} — generated from tokens.json. Do not edit by hand; run \`npm run build\`. */`,
    `@import url("https://fonts.googleapis.com/css2?family=League+Spartan:wght@300;400;500;600;700;800;900&display=swap");`,
    `:root,[data-theme="light"]{`,
    `  color-scheme:light;`,
    ...lightLines,
    `}`,
    `[data-theme="dark"]{`,
    `  color-scheme:dark;`,
    ...darkLines,
    `}`,
    `:root{`,
    ...rootLines,
    `}`,
    `@media(min-width:700px){:root{--gutter:32px;}}`,
    ...typeClasses,
    '',
  ].join('\n');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function scanComponents() {
  if (!fs.existsSync(COMPONENTS_DIR)) return [];
  const entries = fs.readdirSync(COMPONENTS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort((a, b) => a.localeCompare(b));

  const cards = [];
  for (const name of entries) {
    const previewFile = path.join(COMPONENTS_DIR, name, 'preview.html');
    if (!fs.existsSync(previewFile)) continue;
    const html = fs.readFileSync(previewFile, 'utf8');
    const meta = html.match(/<!--\s*@dsCard\s+([\s\S]*?)-->/);
    let group = 'Other';
    let subtitle = '';
    if (meta) {
      const g = meta[1].match(/group="([^"]*)"/);
      const s = meta[1].match(/subtitle="([^"]*)"/);
      if (g) group = g[1];
      if (s) subtitle = s[1];
    }
    const hasReadme = fs.existsSync(path.join(COMPONENTS_DIR, name, 'README.md'));
    cards.push({ name, group, subtitle, hasReadme });
  }
  return cards;
}

function generateIndexHtml(tokens, cards) {
  const groupOrder = ['Foundations', 'Actions', 'Navigation', 'Sections', 'Display', 'Forms', 'Feedback', 'Templates'];
  const grouped = new Map();
  for (const g of groupOrder) grouped.set(g, []);
  for (const c of cards) {
    if (!grouped.has(c.group)) grouped.set(c.group, []);
    grouped.get(c.group).push(c);
  }

  const schoolTokens = tokens.color.tokens.filter(t => t.name.startsWith('school-'));
  const schoolSwatchesHtml = schoolTokens.map((t, idx) =>
    `<div class="ds-swatch"><span class="ds-chip" style="background:var(--${t.name})"></span><div><b>${escapeHtml(t.campus || t.name)}</b><span class="kp-small kp-muted">${escapeHtml(t.officialColor || '')} · <code>--${t.name}</code></span><span class="kp-small kp-muted">Light ${t.value.light} · Dark ${t.value.dark}</span></div></div>`
  ).join('');

  const sectionsHtml = [];
  for (const [group, list] of grouped) {
    if (!list.length) continue;
    const cardsHtml = list.map(c => {
      const searchText = `${c.name} ${c.group} ${c.subtitle}`.toLowerCase();
      return `<a class="kp-card" data-component="${escapeHtml(c.name)}" data-search="${escapeHtml(searchText)}" href="components/${encodeURIComponent(c.name)}/preview.html"><div class="body"><span class="kp-label kp-muted">${escapeHtml(c.group)}</span><h3 class="kp-h3">${escapeHtml(c.name)}</h3><p class="kp-small kp-muted">${escapeHtml(c.subtitle || 'Component preview')}</p><p class="kp-small"><span class="kp-link">Preview</span>${c.hasReadme ? ` · README in components/${escapeHtml(c.name)}/` : ''}</p></div></a>`;
    }).join('');
    sectionsHtml.push(`<section class="ds-group" data-group="${escapeHtml(group)}"><h2 class="kp-h2">${escapeHtml(group)} <span class="kp-small kp-muted">(${list.length})</span></h2><div class="kp-grid kp-g3">${cardsHtml}</div></section>`);
  }

  return `<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Kappa Pi Beta Design System v${tokens.version}</title>
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="components/bundle.css">
<style>
.ds-shell{max-width:1200px;margin:0 auto;padding:var(--space-7) var(--gutter) var(--space-9)}
.ds-bar{display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-3);margin-top:var(--space-5)}
.ds-filter{flex:1 1 260px;max-width:420px}
.ds-swatches{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:var(--space-3);margin-top:var(--space-4)}
.ds-swatch{display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3);background:var(--surface-raised);border:1px solid var(--border-hairline);border-radius:var(--radius-md)}
.ds-swatch b{display:block;font-size:15px;line-height:20px}
.ds-swatch span{display:block}
.ds-chip{flex:none;width:28px;height:28px;border-radius:var(--radius-pill);border:1px solid var(--image-outline)}
.ds-group{margin-top:var(--space-7)}
.ds-group h2{margin-bottom:var(--space-4)}
.ds-empty{margin-top:var(--space-5)}
.ds-docs{display:flex;flex-wrap:wrap;gap:var(--space-2);margin-top:var(--space-4)}
</style>
<script>try{if(localStorage.getItem('kpib-ds-theme')==='dark')document.documentElement.dataset.theme='dark';}catch(e){}</script>
</head>
<body class="kp-pad kp-flush">
<header class="kp-hdr">
  <div class="in">
    <a class="kp-plate" href="index.html" aria-label="Kappa Pi Beta Design System"><img src="assets/Logos/kpib-lockup-primary.png" alt="Kappa Pi Beta Fraternity, Inc."></a>
    <div class="kp-tools">
      <button id="dsTheme" class="kp-ibtn" type="button">Dark</button>
    </div>
  </div>
</header>
<main class="ds-shell">
  <span class="kp-stripes" aria-hidden="true"></span>
  <h1 class="kp-d2" style="margin-top:var(--space-5)">Kappa Pi Beta Design System v${tokens.version}</h1>
  <p class="kp-lead kp-muted" style="margin-top:var(--space-3)">Single source of truth for KPiB web and print products. Edit <code>tokens.json</code> and run <code>npm run build</code> to regenerate <code>tokens.css</code> and this catalog. Run <code>npm test</code> to verify WCAG 2.2 AA contrast and system rules.</p>
  <div class="ds-docs">
    <a class="kp-badge out" href="README.md" style="text-decoration:none">README.md</a>
    <a class="kp-badge out" href="Decisions.md" style="text-decoration:none">Decisions.md</a>
    <a class="kp-badge out" href="Patterns.md" style="text-decoration:none">Patterns.md</a>
    <a class="kp-badge out" href="Templates.md" style="text-decoration:none">Templates.md</a>
    <a class="kp-badge out" href="Accessibility.md" style="text-decoration:none">Accessibility.md</a>
    <a class="kp-badge out" href="tokens.json" style="text-decoration:none">tokens.json</a>
  </div>

  <section style="margin-top:var(--space-7)" aria-labelledby="campus-palette">
    <h2 class="kp-h2" id="campus-palette">Official Campus Palette</h2>
    <p class="kp-small kp-muted" style="margin-top:var(--space-1)">WCAG &ge; 3.0:1 UI contrast verified on regular, raised, and elevated root-node surfaces in both Light and Dark themes.</p>
    <div class="ds-swatches">${schoolSwatchesHtml}</div>
  </section>

  <div class="ds-bar" role="search">
    <label class="kp-sr" for="dsFilter">Filter components</label>
    <input id="dsFilter" class="kp-input ds-filter" type="search" placeholder="Filter all ${cards.length} components..." autocomplete="off">
    <span id="dsCount" class="kp-small kp-muted" aria-live="polite">${cards.length} components</span>
  </div>
  <div id="dsEmpty" class="kp-notice ds-empty" hidden>No components match that filter.</div>
  ${sectionsHtml.join('\n  ')}
</main>
<footer class="kp-ftr">
  <div class="cols">
    <div>
      <div class="kp-plate"><img src="assets/Logos/kpib-lockup-primary.png" alt="Kappa Pi Beta Fraternity, Inc."></div>
      <p class="kp-muted">Kappa Pi Beta Design System v${tokens.version}. Built from <code>tokens.json</code> with zero runtime dependencies.</p>
    </div>
    <div><h4>Docs</h4><ul><li><a href="README.md">Foundations</a></li><li><a href="Patterns.md">Patterns</a></li><li><a href="Accessibility.md">Accessibility</a></li></ul></div>
    <div><h4>Specs</h4><ul><li><a href="Decisions.md">Decisions</a></li><li><a href="Templates.md">Templates</a></li><li><a href="tokens.json">Tokens JSON</a></li></ul></div>
    <div><h4>Bundles</h4><ul><li><a href="tokens.css">tokens.css</a></li><li><a href="components/bundle.css">components/bundle.css</a></li></ul></div>
  </div>
  <div class="legal">Kappa Pi Beta Fraternity, Inc. · Respect and Discipline · Design System v${tokens.version}</div>
</footer>
<script>
(function(){
  var btn=document.getElementById('dsTheme');
  function sync(){var d=document.documentElement.dataset.theme==='dark';btn.textContent=d?'Light':'Dark';btn.setAttribute('aria-pressed',String(d));}
  sync();
  btn.addEventListener('click',function(){
    var next=document.documentElement.dataset.theme==='dark'?'light':'dark';
    document.documentElement.dataset.theme=next;
    try{localStorage.setItem('kpib-ds-theme',next);}catch(e){}
    sync();
  });
  var inp=document.getElementById('dsFilter'),count=document.getElementById('dsCount'),empty=document.getElementById('dsEmpty');
  var cards=[].slice.call(document.querySelectorAll('[data-component]'));
  var groups=[].slice.call(document.querySelectorAll('.ds-group'));
  inp.addEventListener('input',function(){
    var q=inp.value.trim().toLowerCase(),shown=0;
    cards.forEach(function(c){var ok=!q||c.dataset.search.indexOf(q)>=0;c.hidden=!ok;if(ok)shown++;});
    groups.forEach(function(g){g.hidden=!g.querySelector('[data-component]:not([hidden])');});
    count.textContent=shown+(shown===1?' component':' components');
    empty.hidden=shown>0;
  });
})();
</script>
</body>
</html>
`;
}

const tokens = readTokens();
const css = generateTokensCss(tokens);
fs.writeFileSync(TOKENS_CSS_PATH, css, 'utf8');

if (fs.existsSync(COMPONENTS_DIR)) {
  const cards = scanComponents();
  if (cards.length > 0) {
    const html = generateIndexHtml(tokens, cards);
    fs.writeFileSync(INDEX_PATH, html, 'utf8');
    console.log(`Built KPiB Design System v${tokens.version}: tokens.css (${tokens.color.tokens.length} colors) + index.html (${cards.length} components)`);
  } else {
    console.log(`Built KPiB Design System v${tokens.version}: tokens.css (${tokens.color.tokens.length} colors)`);
  }
} else {
  console.log(`Built KPiB Design System v${tokens.version}: tokens.css (${tokens.color.tokens.length} colors)`);
}
