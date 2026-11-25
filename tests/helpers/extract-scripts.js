'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const EXTRACTED_DIR = path.join(REPO_ROOT, 'tests', '.extracted');

/**
 * Extracts inline <script> blocks (without a src attribute) from an HTML file
 * into tests/.extracted/<base>-inline-<index>.js so Node's built-in V8 coverage
 * can measure exact line, branch, and function coverage of inline page scripts.
 */
function extractInlineScripts(htmlFilename) {
  const htmlPath = path.join(REPO_ROOT, htmlFilename);
  const html = fs.readFileSync(htmlPath, 'utf8');
  fs.mkdirSync(EXTRACTED_DIR, { recursive: true });
  const base = path.basename(htmlFilename, '.html');
  const scripts = [];
  let idx = 0;
  for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)) {
    const openTag = match[0].slice(0, match[0].indexOf('>') + 1);
    if (/\bsrc\s*=/i.test(openTag)) continue;
    const code = match[1];
    const outPath = path.join(EXTRACTED_DIR, `${base}-inline-${idx}.js`);
    fs.writeFileSync(outPath, code, 'utf8');
    scripts.push({ index: idx, filePath: outPath, code });
    idx++;
  }
  return scripts;
}

module.exports = { REPO_ROOT, EXTRACTED_DIR, extractInlineScripts };
