import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['index.html', 'resume.html'];
const assets = new Set();
const forbidden = [/\b(?:mailto:|tel:)/i, /\b(?:telephone|streetAddress|postalCode)\b/i, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/, /(?:\b[A-Z]:[\\/]|file:\/\/)/i, /(?:ghp_|gho_|sk-proj-)[A-Za-z0-9_-]{12,}/];
for (const name of pages) {
  const html = readFileSync(resolve(root, name), 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, `${name}: duplicate IDs`);
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${name}: one main heading`);
  for (const pattern of forbidden) assert.ok(!pattern.test(html), `${name}: private data pattern ${pattern}`);
  for (const [, attribute, value] of html.matchAll(/\b(href|src)="([^"]+)"/g)) {
    if (/^https:/.test(value)) {
      assert.equal(attribute, 'href', `${name}: third-party runtime asset`);
      continue;
    }
    if (value.startsWith('#')) { assert.ok(ids.includes(value.slice(1)), `${name}: broken anchor ${value}`); continue; }
    const clean = value.split(/[?#]/)[0];
    if (!clean || clean === './' || clean === '/') continue;
    assert.ok(existsSync(resolve(root, clean)), `${name}: missing ${clean}`);
    if (name === 'index.html' && attribute === 'src') assets.add(clean);
  }
  for (const [, set] of html.matchAll(/\bsrcset="([^"]+)"/g)) {
    for (const candidate of set.split(',')) assert.ok(existsSync(resolve(root, candidate.trim().split(/\s/)[0])), `${name}: broken responsive image`);
  }
  for (const [, attributes] of html.matchAll(/<a\s+([^>]*target="_blank"[^>]*)>/g)) assert.match(attributes, /rel="[^"]*noopener/, 'External tab requires noopener');
  console.log(`PASS ${name}: links, headings, anchors, public contact policy`);
}
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
assert.ok(!html.includes('cdn.tailwindcss') && !html.includes('formspree'), 'No external runtime or form service');
assert.ok(!html.includes('MSc Candidate') && !html.includes('Graduating May'), 'No obsolete student status');
const css = readFileSync(resolve(root, 'assets/site.css'), 'utf8');
for (const [, value] of css.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)) {
  assert.ok(!value.startsWith('http'), 'Self-hosted stylesheet resources');
  assert.ok(existsSync(resolve(root, 'assets', value)), `Missing CSS resource ${value}`);
}
assert.match(css, /prefers-reduced-motion/);
assert.match(css, /focus-visible/);
assets.add('index.html'); assets.add('assets/site.css'); assets.add('assets/site.js');
assets.add('assets/fonts/manrope-latin.woff2'); assets.add('assets/fonts/instrument-serif-latin.woff2');
assets.add('assets/images/richmond-800.webp');
let transfer = 0;
for (const asset of assets) {
  const data = readFileSync(resolve(root, asset));
  transfer += /\.(?:woff2|webp)$/.test(asset) ? data.length : gzipSync(data).length;
}
assert.ok(transfer < 160_000, `Initial asset budget exceeded: ${transfer}`);
const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  if (entry.name.startsWith('.')) return [];
  const path = resolve(directory, entry.name);
  return entry.isDirectory() ? walk(path) : [path];
});
for (const path of walk(root)) assert.ok(!/\.(?:docx|pdf|jpg|jpeg|heic|dng)$/i.test(path), 'Do not commit original resumes or unprocessed photographs');
console.log(`PASS performance budget: ${(transfer / 1024).toFixed(1)} KiB estimated compressed initial assets (larger portrait)`);
console.log('PASS source documents and unprocessed photos are absent');
