/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */
// Run from repo root:
//   node scripts/generate-jsrapp-gallery.js

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const EXAMPLES_DIR = path.join(ROOT, 'src', 'app', 'examples');
const OUTPUT_FILE = path.join(ROOT, 'test', 'jsrapp-gallery.html');
const THUMBNAIL_DIR = path.join(ROOT, 'test', 'resources', 'gallery');

const HTML_HEAD = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>JSRApp Gallery</title>
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background-color: #1e1e1e;
      color: #ddd;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      padding: 16px 24px;
      background: #252526;
      border-bottom: 1px solid #3e3e3e;
    }
    header h1 {
      margin: 0 0 4px 0;
      font-size: 22px;
      color: #fff;
    }
    header p {
      margin: 0;
      font-size: 13px;
      color: #aaa;
    }
    main {
      flex: 1;
      padding: 16px 24px 32px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
    }
    .card {
      background: #252526;
      border-radius: 6px;
      border: 1px solid #373737;
      padding: 14px 16px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .card-title {
      font-size: 16px;
      font-weight: 600;
      color: #fff;
      margin: 0;
    }
    .card-subtitle {
      font-size: 13px;
      color: #aaa;
      margin: 0;
    }
    .card-thumb {
      width: 100%;
      aspect-ratio: 3 / 2;
      border: 1px solid #3e3e3e;
      border-radius: 4px;
      overflow: hidden;
      background: #1b1b1b;
      margin: 4px 0;
    }
    .card-thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .card-thumb-link {
      text-decoration: none;
      color: inherit;
      display: block;
    }
    .card-thumb-empty {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #666;
      font-size: 12px;
      letter-spacing: 0.3px;
    }
    .card-meta {
      font-size: 11px;
      color: #777;
    }
    .card-actions {
      margin-top: 8px;
      display: flex;
      gap: 8px;
    }
    .card-actions a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 6px 10px;
      font-size: 13px;
      border-radius: 4px;
      border: 1px solid #3e3e3e;
      background: #2d2d30;
      color: #e0e0e0;
      text-decoration: none;
      cursor: pointer;
    }
    .card-actions a.primary {
      border-color: #0e639c;
      background: #007acc;
      color: #fff;
    }
    .card-actions a:hover {
      filter: brightness(1.08);
    }
    footer {
      padding: 8px 24px 16px;
      font-size: 11px;
      color: #777;
      border-top: 1px solid #3e3e3e;
      background: #1e1e1e;
    }
    code {
      font-size: 11px;
      background: #1b1b1b;
      padding: 2px 4px;
      border-radius: 3px;
    }
  </style>
</head>
<body>
  <header>
    <h1>JSRApp Gallery</h1>
    <p>Select an example to open it in the generic JSRApp runner.</p>
  </header>

  <main>
    <section class="grid">
      <!-- AUTO-GENERATED: Do not edit by hand. -->
`;

const HTML_FOOT = `    </section>
  </main>

  <footer>
    Served from <code>test/jsrapp-gallery.html</code>. Ensure your dev server serves the repository root at
    <code>http://localhost:8000/</code>, then open
    <code>http://localhost:8000/test/jsrapp-gallery.html</code>.
  </footer>
</body>
</html>
`;

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function extractReturnString(source, methodName) {
  const re = new RegExp(`${methodName}\\s*\\(\\)\\s*\\{[\\s\\S]*?return\\s+['\"]([^'\"]+)['\"]`, 'm');
  const match = source.match(re);
  return match ? match[1] : null;
}

function extractReturnBoolean(source, methodName) {
  const re = new RegExp(`${methodName}\\s*\\(\\)\\s*\\{[\\s\\S]*?return\\s+(true|false)\\s*;?`, 'm');
  const match = source.match(re);
  if (!match) return null;
  return match[1] === 'true';
}

function extractClassBlock(source, className) {
  const classRe = new RegExp(`export\\s+class\\s+${className}\\s+extends\\s+JSRApp\\b`);
  const startMatch = classRe.exec(source);
  if (!startMatch) return null;
  const startIdx = startMatch.index;
  const braceStart = source.indexOf('{', startIdx);
  if (braceStart < 0) return null;
  let depth = 0;
  for (let i = braceStart; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        return source.slice(braceStart + 1, i);
      }
    }
  }
  return null;
}

function extractJsrAppClasses(source) {
  const classes = [];
  const re = /export\s+class\s+([A-Za-z0-9_]+)\s+extends\s+JSRApp\b/g;
  let match;
  while ((match = re.exec(source)) !== null) {
    classes.push(match[1]);
  }
  return classes;
}

function collectExampleFilesRecursive(baseDir) {
  const results = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith('.js')) continue;

      const rel = path.relative(baseDir, fullPath).split(path.sep).join('/');
      results.push(rel);
    }
  }

  walk(baseDir);
  results.sort((a, b) => a.localeCompare(b));
  return results;
}

const files = collectExampleFilesRecursive(EXAMPLES_DIR);

const cards = [];
for (const file of files) {
  const modulePath = `src/app/examples/${file}`;
  const fullPath = path.join(EXAMPLES_DIR, file);
  const source = fs.readFileSync(fullPath, 'utf8');

  const classes = extractJsrAppClasses(source);
  if (classes.length === 0) continue;

  for (const className of classes) {
    const classBlock = extractClassBlock(source, className) || source;
    const isDraft = extractReturnBoolean(classBlock, 'isDraft') === true;
    if (isDraft) continue;

    const helpTitle = extractReturnString(classBlock, 'getHelpTitle') || className;
    const helpSummary = extractReturnString(classBlock, 'getHelpSummary') || 'Example app.';
    const thumbnailPath = path.join(THUMBNAIL_DIR, `${className}.png`);
    const hasThumbnail = fs.existsSync(thumbnailPath);

    const href = `./test-jsrapp-example.html?module=../${modulePath}`
      + `&class=${encodeURIComponent(className)}`
      + `&title=${encodeURIComponent(helpTitle)}`
      + `&subtitle=${encodeURIComponent(helpSummary)}`;

    const thumbInner = hasThumbnail
      ? `<img src="./resources/gallery/${encodeURIComponent(className)}.png" alt="${escapeHtml(helpTitle)} thumbnail" loading="lazy" />`
      : `<div class="card-thumb-empty">No thumbnail</div>`;
    const thumbHtml = `<a class="card-thumb-link" href="${href}" target="_blank">${thumbInner}</a>`;

    cards.push(`      <article class="card">
        <h2 class="card-title">${escapeHtml(helpTitle)}</h2>
        <p class="card-subtitle">${escapeHtml(helpSummary)}</p>
        <div class="card-thumb">
          ${thumbHtml}
        </div>
        <div class="card-meta">
          Module: <code>${escapeHtml(modulePath)}</code>
        </div>
        <div class="card-actions">
          <a
            class="primary"
            href="${href}"
            target="_blank"
          >
            Open example
          </a>
        </div>
      </article>`);
  }
}

const output = HTML_HEAD + cards.join('\n') + '\n' + HTML_FOOT;
fs.writeFileSync(OUTPUT_FILE, output, 'utf8');
console.log(`Wrote ${OUTPUT_FILE} with ${cards.length} cards.`);
