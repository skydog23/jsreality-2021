// Generate docs/CURRENT_STATE_OF_JREALITY_PORT.md from Java source roots.
const fs = require('fs');
const path = require('path');

const javaRoots = [
  '/Users/gunn/Software/workspace/jreality-2021/src-core',
  '/Users/gunn/Software/workspace/jreality-2021/src-plugin',
  '/Users/gunn/Software/workspace/jreality-2021/src-tool'
];
const jsRoot = '/Users/gunn/Software/cursor/projects/jsreality-2021/src';

function walk(dir, ext, out) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, ext, out);
    else if (entry.isFile() && p.endsWith(ext)) out.push(p);
  }
}

const jsFiles = [];
walk(jsRoot, '.js', jsFiles);
const jsByBase = new Map();
for (const file of jsFiles) {
  const base = path.basename(file);
  if (!jsByBase.has(base)) jsByBase.set(base, []);
  jsByBase.get(base).push(file);
}

function getJavaClasses(javaRoot) {
  const javaFiles = [];
  walk(javaRoot, '.java', javaFiles);
  return javaFiles.map(file => ({
    file,
    rel: path.relative(javaRoot, file).replace(/\\/g, '/'),
    base: path.basename(file)
  }));
}

function statusFor(javaBase) {
  const jsBase = javaBase.replace(/\.java$/, '.js');
  const matches = jsByBase.get(jsBase) || [];
  if (matches.length === 0) return { status: 'missing', matches: [] };
  return { status: 'present', matches };
}

const lines = [];
lines.push('# CURRENT STATE OF JREALITY PORT');
lines.push('');
lines.push('This document lists Java classes under the jreality-2021 source roots and indicates whether a corresponding JS file exists in jsreality-2021.');
lines.push('');
lines.push('## Java source roots scanned');
for (const root of javaRoots) lines.push(`- ${root}`);
lines.push('');
lines.push('## Mapping rule');
lines.push('- A Java class is considered "ported" if a JS file with the same basename exists anywhere under `src/` in jsreality-2021.');
lines.push('- This is a name-based heuristic for quick dependency verification; it does not guarantee full feature parity.');
lines.push('');

for (const root of javaRoots) {
  const classes = getJavaClasses(root);
  lines.push(`## ${root}`);
  lines.push('');
  lines.push('| Java class | Java path | JS path(s) | Status |');
  lines.push('| --- | --- | --- | --- |');
  for (const cls of classes.sort((a, b) => a.rel.localeCompare(b.rel))) {
    const { status, matches } = statusFor(cls.base);
    const jsPaths = matches.length
      ? matches.map(p => '`' + path.relative(jsRoot, p).replace(/\\/g, '/') + '`').join('<br>')
      : '';
    lines.push(`| ${cls.base.replace(/\.java$/, '')} | \`${cls.rel}\` | ${jsPaths} | ${status} |`);
  }
  lines.push('');
}

const outPath = '/Users/gunn/Software/cursor/projects/jsreality-2021/docs/CURRENT_STATE_OF_JREALITY_PORT.md';
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log('Wrote', outPath);
