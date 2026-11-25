'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { REPO_ROOT } = require('./helpers/extract-scripts');

const HTML_PAGES = ['index.html', 'table.html', 'tree.html'];

function readRepo(file) {
  return fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');
}

function loadRecords() {
  const ctx = vm.createContext({});
  vm.runInContext(readRepo('lineage-data.js'), ctx);
  return vm.runInContext('({ records, campuses })', ctx);
}

test('HTML privacy, viewport, landmarks, single <h1>, and skip link contracts on every page', () => {
  for (const page of HTML_PAGES) {
    const html = readRepo(page);
    assert.match(html, /^<!doctype html>/i, `${page} must start with <!doctype html>`);
    assert.match(html, /<html\b[^>]*\blang="en"/i, `${page} must set lang="en"`);
    assert.match(html, /<meta charset="utf-8">/i, `${page} must declare UTF-8`);
    assert.match(
      html,
      /<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">/i,
      `${page} must include viewport-fit=cover for Face ID iPhones`
    );
    assert.match(
      html,
      /<meta name="robots" content="noindex, nofollow, nosnippet">/i,
      `${page} must opt out of search indexing for member privacy`
    );

    // Exactly one <h1> per page
    const h1Matches = html.match(/<h1\b/gi) || [];
    assert.equal(h1Matches.length, 1, `${page} must have exactly one <h1>`);

    // Skip link points to an existing id on the same page
    const skip = html.match(/<a class="kp-skip" href="#([^"]+)">Skip to content<\/a>/);
    assert.ok(skip, `${page} must include .kp-skip skip link`);
    assert.ok(
      new RegExp(`\\bid="${skip[1]}"`).test(html),
      `${page} skip link target #${skip[1]} must exist`
    );

    // Mobile menu ARIA contract (DS-07 / Accessibility.md:28)
    assert.match(html, /<summary aria-expanded="false" aria-controls="mobileNav">/, `${page} mobile menu summary must declare aria-expanded & aria-controls`);
    assert.match(html, /<nav id="mobileNav" class="kp-menu-list"/, `${page} must have matching #mobileNav`);

    // Current page indicator appears in both desktop and mobile navs
    const ariaCurrents = html.match(/aria-current="page"/g) || [];
    assert.ok(ariaCurrents.length >= 2, `${page} must mark aria-current="page" in desktop and mobile nav`);

    // Every <img> has non-empty alt, width, height, and official motto capitalization
    for (const imgTag of html.match(/<img\b[^>]*>/gi) || []) {
      assert.match(imgTag, /\balt="[^"]+"/, `${page} <img> missing alt`);
      assert.match(imgTag, /\bwidth="\d+"/, `${page} <img> missing explicit width`);
      assert.match(imgTag, /\bheight="\d+"/, `${page} <img> missing explicit height`);
      if (imgTag.includes('kpib-lockup.png')) {
        assert.ok(
          imgTag.includes('Unity is the Beginning of Brotherhood.'),
          `${page} lockup alt must use official motto capitalization`
        );
      }
    }
  }
});

test('HTML local asset references exist and cache-bust query versions stay in sync across all pages', () => {
  const versionMap = new Map();
  for (const page of HTML_PAGES) {
    const html = readRepo(page);
    for (const m of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
      const ref = m[1];
      if (/^(https?:|#|mailto:|\.\/)/.test(ref)) continue;
      const [filePart, queryPart] = ref.split('?');
      if (!filePart || filePart.endsWith('.html')) continue;
      const fullPath = path.join(REPO_ROOT, filePart);
      assert.ok(fs.existsSync(fullPath), `${page} references missing local asset: ${filePart}`);
      if (queryPart) {
        if (versionMap.has(filePart)) {
          assert.equal(
            versionMap.get(filePart),
            queryPart,
            `Cache-bust mismatch for ${filePart} on ${page}: expected ?${versionMap.get(filePart)}, got ?${queryPart}`
          );
        } else {
          versionMap.set(filePart, queryPart);
        }
      }
    }
  }
  // Ensure orphaned motto-bg.jpg stays deleted
  assert.equal(fs.existsSync(path.join(REPO_ROOT, 'assets/motto-bg.jpg')), false);
});

test('HTML Design System compliance: no nav/CTA icons (DS-03), single primary red button (DS-04), valid data-icon names', () => {
  const iconsSrc = readRepo('icons.js');
  const definedIcons = new Set([...iconsSrc.matchAll(/^\s+([a-z]+):'/gm)].map(m => m[1]));

  for (const page of HTML_PAGES) {
    const html = readRepo(page);

    // Every data-icon="name" must exist in icons.js
    for (const m of html.matchAll(/data-icon="([^"]+)"/g)) {
      assert.ok(definedIcons.has(m[1]), `${page} references undefined icon "${m[1]}"`);
    }

    // Main nav, mobile nav, and footer nav carry no icons (DS-03)
    for (const nav of html.match(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi) || []) {
      if (nav.includes('class="view-tabs"')) continue; // compact phone icon-only toolbar tab
      assert.equal(nav.includes('data-icon='), false, `${page} nav must not contain decorative icons (DS-03)`);
    }

    // Text CTA buttons (.kp-btn) carry no icons (DS-03)
    for (const btn of html.match(/<(?:a|button)\b[^>]*class="[^"]*\bkp-btn\b[^"]*"[^>]*>[\s\S]*?<\/(?:a|button)>/gi) || []) {
      assert.equal(btn.includes('data-icon='), false, `${page} .kp-btn must not contain icons (DS-03)`);
    }

    // At most one primary red button (.kp-btn p) per page (DS-04)
    const primaryBtns = html.match(/class="[^"]*\bkp-btn p\b[^"]*"/g) || [];
    assert.ok(primaryBtns.length <= 1, `${page} has ${primaryBtns.length} primary red buttons; Design System allows at most 1`);
  }
});

test('HTML data parity: index.html founder cards & tree.html statMembers match lineage-data.js', () => {
  const { records } = loadRecords();
  const indexHtml = readRepo('index.html');
  const treeHtml = readRepo('tree.html');

  // tree.html static statMembers fallback matches actual records.length (prevents UX-14 drift)
  const statMatch = treeHtml.match(/<b id="statMembers">(\d+)<\/b>/);
  assert.ok(statMatch);
  assert.equal(Number(statMatch[1]), records.length);

  // Every founder 0..5 has a matching card in index.html with exact line name & real name
  for (let id = 0; id < 6; id++) {
    const [line, , isFounder, real] = records[id];
    assert.equal(isFounder, true);
    const cardRe = new RegExp(`href="tree\\.html\\?member=${id}"[\\s\\S]*?${line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${real.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
    assert.match(indexHtml, cardRe, `Founder ${id} (${line} / ${real}) missing or mismatched in index.html`);
  }
});
