const fs = require('fs');
const path = require('path');

const jsRoot = path.resolve(__dirname, '../src');
const javaRoot = '/Users/gunn/Software/workspace/jreality-2021/src-core';

const jHeader = `/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */`;

const cgHeader = `/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */`;

// Overrides for jReality sources that live outside src-core/de/jreality.
const forceJReality = new Set([
  'app/plugin/',
  'app/plugins/',
  'core/scene/tool/',
  'core/tools/',
  'core/viewers/ViewerSwitch.js',
  'tutorial/'
]);

function walk(dir, ext, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, ext, out);
    else if (entry.isFile() && p.endsWith(ext)) out.push(p);
  }
}

const javaFiles = [];
walk(javaRoot, '.java', javaFiles);
const javaSet = new Set(javaFiles.map(p => p.replace(/\\/g, '/')));

function hasJavaMatch(relJs) {
  const relJava = relJs.replace(/\.js$/, '.java');
  const relNoCore = relJava.startsWith('core/') ? relJava.slice('core/'.length) : relJava;
  const relDeJReality = relNoCore.startsWith('de/jreality/')
    ? relNoCore
    : path.posix.join('de/jreality', relNoCore);
  const candidates = [relJava, relNoCore, relDeJReality];
  for (const cand of candidates) {
    for (const jf of javaSet) {
      if (jf.endsWith(cand)) return true;
    }
  }
  return false;
}

function isForcedJReality(rel) {
  if (rel === 'core/viewers/ViewerSwitch.js') return true;
  return [...forceJReality].some(prefix => rel.startsWith(prefix));
}

const jsFiles = [];
walk(jsRoot, '.js', jsFiles);

const headerRegex = /^\s*\/\*\*[\s\S]*?JavaScript port\/translation[\s\S]*?\*\/\s*/;
let changed = 0;

for (const file of jsFiles) {
  const rel = path.relative(jsRoot, file).replace(/\\/g, '/');
  const isJReality = isForcedJReality(rel) || hasJavaMatch(rel);
  const targetHeader = isJReality ? jHeader : cgHeader;

  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  let updated = text;
  if (headerRegex.test(text)) {
    updated = text.replace(headerRegex, targetHeader + '\n\n');
  } else {
    updated = targetHeader + '\n\n' + text;
  }
  if (updated !== text) {
    fs.writeFileSync(file, updated, 'utf8');
    changed += 1;
  }
}

console.log(`Header sync complete. Updated ${changed} file(s).`);
