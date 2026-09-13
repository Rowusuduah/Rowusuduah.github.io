import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, relative, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';

// Browser tests separately cover route transitions, keyboard behavior, layout,
// motion controls, and actual request timing. These are publishing checks.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pages = readdirSync(root).filter(name => name.endsWith('.html'));
const textCache = new Map(), idsCache = new Map();
const references = new Set(), eagerAssets = new Set();
const privacyRules = [
  ['unearned credential', /\bEIT\b|Engineer[- ]in[- ]Training|\b(?:passed|completed) (?:the )?FE (?:exam|examination)/i],
  ['email address or direct contact link', /\b(?:mailto:|tel:)|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i],
  ['private contact metadata', /\b(?:telephone|streetAddress|postalCode)\b/i],
  ['phone number', /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/],
  ['local filesystem path', /(?:\b[A-Z]:[\\/]|file:\/\/)/i],
  ['credential-like token', /(?:ghp_|gho_|github_pat_|sk-proj-)[A-Za-z0-9_-]{12,}/],
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
];
const read = path => {
  if (!textCache.has(path)) textCache.set(path, readFileSync(path, 'utf8'));
  return textCache.get(path);
};
const decode = value => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
const attributes = source => Object.fromEntries(
  [...source.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)]
    .map(([, key, double, single, unquoted]) => [key.toLowerCase(), decode(double ?? single ?? unquoted)]),
);
const tags = html => [...html.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<([a-z][\w:-]*)\b([^>]*)>/gi)]
  .map(([, tag, source]) => ({ tag: tag.toLowerCase(), source, attrs: attributes(source) }));
const ids = path => {
  if (!idsCache.has(path)) {
    const values = tags(read(path)).map(item => item.attrs.id).filter(Boolean);
    assert.equal(new Set(values).size, values.length, `${relative(root, path)}: duplicate IDs`);
    idsCache.set(path, new Set(values));
  }
  return idsCache.get(path);
};
const checkPrivateData = (path, content) => {
  for (const [label, pattern] of privacyRules) assert.ok(!pattern.test(content), `${relative(root, path)}: ${label}`);
};

function localReference(value, from, { runtime = false, fragment = true } = {}) {
  if (value.startsWith('data:')) {
    assert.ok(runtime && /^data:image\//i.test(value), 'Only embedded image data is allowed');
    return null;
  }
  assert.ok(!/^(?:javascript|file|mailto|tel):/i.test(value), `${relative(root, from)}: unsupported URL`);
  if (/^(?:https?:)?\/\//i.test(value)) {
    assert.ok(value.startsWith('https:'), `${relative(root, from)}: insecure or protocol-relative URL`);
    assert.ok(!runtime, `${relative(root, from)}: third-party runtime dependency`);
    return null;
  }
  assert.ok(!/^[a-z][a-z\d+.-]*:/i.test(value), `${relative(root, from)}: unsupported URL protocol`);
  const [location, hash] = value.split('#');
  const pathname = decodeURIComponent(location.split('?')[0]);
  let target = pathname ? resolve(pathname.startsWith('/') ? root : dirname(from), pathname.replace(/^\/+/, '')) : from;
  assert.ok(target === root || target.startsWith(root + sep), `${relative(root, from)}: path escapes public root`);
  if (existsSync(target) && statSync(target).isDirectory()) target = resolve(target, 'index.html');
  assert.ok(existsSync(target) && statSync(target).isFile(), `${relative(root, from)}: missing ${value}`);
  if (fragment && hash && /\.(?:html|svg)$/i.test(target)) {
    assert.ok(ids(target).has(decodeURIComponent(hash)), `${relative(root, from)}: missing target ${value}`);
  }
  references.add(target);
  return target;
}

function checkCss(css, from, eager = false) {
  for (const [, value] of css.matchAll(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/g)) {
    if (value.startsWith('#')) continue;
    const target = localReference(value, from, { runtime: true });
    if (eager && target) eagerAssets.add(target);
  }
  assert.ok(!/@import\s+(?!url\()/i.test(css), `${relative(root, from)}: use explicit local stylesheets`);
}

function checkPolicy(html, pageTags, path) {
  const csp = pageTags.find(item => item.tag === 'meta' && item.attrs['http-equiv']?.toLowerCase() === 'content-security-policy')?.attrs.content;
  if (!csp) {
    assert.ok(!['index.html', 'credits.html', 'resume.html'].includes(relative(root, path)), `${relative(root, path)}: CSP missing`);
    console.log(`NOTE ${relative(root, path)}: no document CSP; external dependencies are still checked`);
    return;
  }
  const directives = new Map(csp.split(';').map(part => part.trim().split(/\s+/)).filter(parts => parts[0]).map(([name, ...values]) => [name, values]));
  assert.deepEqual(directives.get('connect-src'), ["'none'"], `${relative(root, path)}: prevent background connections`);
  assert.deepEqual(directives.get('object-src'), ["'none'"], `${relative(root, path)}: block embedded objects`);
  assert.deepEqual(directives.get('form-action'), ["'none'"], `${relative(root, path)}: contact should use public profile links`);
  assert.ok(directives.get('base-uri')?.every(value => ["'self'", "'none'"].includes(value)), `${relative(root, path)}: constrain document base URL`);
  const scripts = directives.get('script-src') ?? directives.get('default-src') ?? [];
  assert.ok(scripts.length && scripts.every(value => ["'self'", "'none'"].includes(value) || /^'sha(?:256|384|512)-/.test(value)), `${relative(root, path)}: constrain scripts`);
  for (const [tag, directive] of [['style', 'style-src'], ['script', 'script-src']]) {
    const allowed = directives.get(directive) ?? directives.get('default-src') ?? [];
    for (const [, source, content] of html.matchAll(new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)<\\/${tag}>`, 'gi'))) {
      if (tag === 'script' && attributes(source).src) continue;
      if (!content.trim()) continue;
      // HTML normalizes CRLF/CR to LF before a browser checks inline hashes.
      const hash = `'sha256-${createHash('sha256').update(content.replace(/\r\n?/g, '\n')).digest('base64')}'`;
      assert.ok(allowed.includes(hash), `${relative(root, path)}: inline ${tag} must match its CSP hash`);
    }
  }
}

function checkMetadata(html, pageTags, path) {
  const name = relative(root, path);
  const canonical = pageTags.filter(item => item.tag === 'link' && item.attrs.rel === 'canonical');
  assert.equal(canonical.length, 1, `${name}: one canonical URL required`);
  const expectedUrl = 'https://rowusuduah.github.io/' + (name === 'index.html' ? '' : name);
  assert.equal(canonical[0].attrs.href, expectedUrl, `${name}: incorrect canonical URL`);
  const meta = key => {
    const matches = pageTags.filter(item => item.tag === 'meta' && (item.attrs.name === key || item.attrs.property === key));
    assert.equal(matches.length, 1, `${name}: missing or duplicate ${key}`);
    assert.ok(matches[0].attrs.content, `${name}: empty ${key}`);
    return matches[0].attrs.content;
  };
  const title = decode(html.match(/<title>([^<]+)<\/title>/i)?.[1] ?? '');
  assert.equal(meta('og:title'), title, `${name}: social title does not match document title`);
  assert.equal(meta('twitter:title'), title, `${name}: card title does not match document title`);
  assert.equal(meta('og:description'), meta('description'), `${name}: social description mismatch`);
  assert.equal(meta('twitter:description'), meta('description'), `${name}: card description mismatch`);
  assert.equal(meta('og:url'), expectedUrl, `${name}: social URL mismatch`);
  assert.equal(meta('author'), 'Richmond Owusu Duah');
  assert.equal(meta('twitter:card'), 'summary_large_image');
  assert.equal(meta('og:image:type'), 'image/png');
  const socialUrl = meta('og:image');
  assert.equal(meta('twitter:image'), socialUrl);
  assert.equal(meta('og:image:secure_url'), socialUrl);
  const imageUrl = new URL(socialUrl);
  assert.equal(imageUrl.origin, 'https://rowusuduah.github.io');
  const imagePath = localReference(imageUrl.pathname, path, { runtime: true });
  const png = readFileSync(imagePath);
  assert.equal(png.toString('ascii', 1, 4), 'PNG');
  assert.equal(png.readUInt32BE(16), Number(meta('og:image:width')));
  assert.equal(png.readUInt32BE(20), Number(meta('og:image:height')));
  assert.ok(meta('og:image:alt').includes('Richmond'));
  assert.ok(meta('twitter:image:alt').includes('Richmond'));
  assert.ok(pageTags.some(item => item.tag === 'link' && item.attrs.rel === 'apple-touch-icon'));
}

for (const name of pages) {
  const path = resolve(root, name), html = read(path), pageTags = tags(html);
  ids(path);
  checkPrivateData(path, html);
  assert.ok(pageTags.some(item => item.tag === 'h1'), `${name}: main heading missing`);
  assert.ok(pageTags.some(item => item.tag === 'html' && item.attrs.lang), `${name}: document language missing`);
  checkPolicy(html, pageTags, path);
  checkMetadata(html, pageTags, path);
  for (const { tag, attrs } of pageTags) {
    assert.ok(!Object.keys(attrs).some(key => /^on[a-z]+/.test(key)), `${name}: inline event handler`);
    if (tag === 'a' && attrs.target === '_blank') assert.ok(attrs.rel?.split(/\s+/).includes('noopener'), `${name}: external tab missing noopener`);
    for (const attribute of ['aria-controls', 'aria-labelledby', 'aria-describedby']) {
      for (const id of (attrs[attribute] ?? '').split(/\s+/).filter(Boolean)) assert.ok(ids(path).has(id), `${name}: missing ${attribute} target ${id}`);
    }
    for (const attribute of ['href', 'xlink:href', 'src', 'poster']) {
      if (!(attribute in attrs)) continue;
      const runtime = attribute === 'src' || attribute === 'poster' || (tag === 'link' && !['canonical', 'alternate'].includes(attrs.rel)) || tag === 'use';
      const target = localReference(attrs[attribute], path, { runtime });
      if (name === 'index.html' && target && runtime && attrs.loading !== 'lazy' && !['use', 'source'].includes(tag)) eagerAssets.add(target);
      if (target && tag === 'link' && attrs.rel === 'stylesheet') checkCss(read(target), target, name === 'index.html');
    }
    if (attrs.srcset) for (const candidate of attrs.srcset.split(',')) localReference(candidate.trim().split(/\s+/)[0], path, { runtime: true });
    if (tag === 'img') {
      assert.ok('alt' in attrs, `${name}: image missing alt text`);
      assert.ok(Number(attrs.width) > 0 && Number(attrs.height) > 0, `${name}: image dimensions missing`);
    }
  }
  for (const [, css] of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) checkCss(css, path);
  console.log(`PASS ${name}: links, fragments, accessibility references, resources, public contact policy`);
}

const indexPath = resolve(root, 'index.html'), index = read(indexPath);
const profileData = JSON.parse(index.match(/<script type="application\/ld\+json" id="profile-data">([\s\S]*?)<\/script>/)?.[1] ?? 'null');
assert.equal(profileData?.['@type'], 'ProfilePage', 'Structured profile is missing');
assert.equal(profileData.mainEntity?.['@type'], 'Person');
assert.equal(profileData.mainEntity.name, 'Richmond Owusu Duah');
assert.equal(profileData.mainEntity.jobTitle, 'Civil Engineer');
assert.equal(profileData.mainEntity.worksFor?.name, 'Stantec');
assert.equal(profileData.mainEntity.alumniOf?.length, 2);
for (const key of ['email', 'telephone', 'address', 'birthDate', 'homeLocation', 'honorificSuffix']) {
  assert.ok(!(key in profileData.mainEntity), `Do not add private or unconfirmed profile metadata: ${key}`);
}
for (const id of ['overview', 'experience', 'projects', 'research', 'education', 'leadership', 'contact']) assert.ok(ids(indexPath).has(id), `Missing portfolio view #${id}`);
assert.ok(!/MSc Candidate|Graduating May/i.test(index), 'Outdated graduate-student status');
assert.equal((index.match(/data-project-category=/g) ?? []).length, 22, 'Preserve all 22 professional assignments');
for (const slug of ['chiquita', 'ashley', 'airport', 'roundabouts', 'eagle-lake', 'green-flash', 'miami', 'smyrna']) assert.ok(ids(indexPath).has(`project-${slug}`), `Missing featured project link: ${slug}`);
assert.match(index, /credits\.html/, 'Project imagery needs a visible credits link');
const stylesheet = read(resolve(root, 'assets/site.css'));
assert.match(stylesheet, /prefers-reduced-motion/, 'Styles must respect reduced motion');
assert.match(stylesheet, /focus-visible/, 'Styles must expose keyboard focus');

const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const path = resolve(directory, entry.name);
  assert.ok(!entry.name.startsWith('.'), `Hidden file in public assets: ${relative(root, path)}`);
  return entry.isDirectory() ? walk(path) : [path];
});
const publicFiles = [...pages.map(page => resolve(root, page)), ...walk(resolve(root, 'assets'))];
let imageBytes = 0, imageCount = 0;
for (const path of publicFiles) {
  assert.ok(!/\.(?:docx?|pdf|heic|dng|raw|nef|cr2)$/i.test(path), `Original document or camera file in public assets: ${relative(root, path)}`);
  if (/\.(?:html|css|js|svg|json)$/i.test(path)) checkPrivateData(path, read(path));
  if (extname(path) === '.css') checkCss(read(path), path);
  if (extname(path) === '.webp') {
    const data = readFileSync(path);
    assert.equal(data.toString('ascii', 0, 4), 'RIFF', `Invalid WebP: ${relative(root, path)}`);
    assert.equal(data.toString('ascii', 8, 12), 'WEBP', `Invalid WebP: ${relative(root, path)}`);
    for (let offset = 12; offset + 8 <= data.length;) {
      const kind = data.toString('ascii', offset, offset + 4), size = data.readUInt32LE(offset + 4);
      assert.ok(!['EXIF', 'XMP '].includes(kind), `Embedded metadata in ${relative(root, path)}`);
      offset += 8 + size + (size % 2);
    }
    imageBytes += data.length; imageCount++;
  }
}

const creditPath = resolve(root, 'assets/images/projects/credits.json');
const credits = JSON.parse(read(creditPath));
for (const photo of credits.photos) {
  assert.equal(photo.illustrative_only, true, `${photo.id}: generic photograph must be labeled illustrative`);
  for (const field of ['photographer_url', 'source_url', 'license_url']) assert.ok(photo[field]?.startsWith('https://'), `${photo.id}: missing ${field}`);
  for (const file of photo.files) {
    const path = localReference(file.file, creditPath, { runtime: true });
    assert.equal(statSync(path).size, file.bytes, `${file.file}: update attribution file metadata after reprocessing`);
  }
}

const brandSourcePath = resolve(root, 'assets/brands/sources.json');
const brandSources = JSON.parse(read(brandSourcePath));
assert.equal(brandSources.assets.length, 3, 'Keep provenance for all three organization marks');
for (const brand of brandSources.assets) {
  const path = localReference(brand.file, brandSourcePath, { runtime: true });
  const asset = readFileSync(path);
  assert.equal(asset.length, brand.bytes, `${brand.file}: original logo size changed`);
  assert.equal(createHash('sha256').update(asset).digest('hex'), brand.sha256, `${brand.file}: original logo changed`);
  assert.ok(brand.sourceUrl.startsWith('https://') && brand.assetUrl.startsWith('https://'));
  if (extname(path) === '.svg') assert.ok(!/<script\b|\son\w+\s*=|(?:xlink:)?href\s*=\s*["'](?!#)/i.test(asset.toString()), 'Logo SVG must not contain scripts or external resources');
}
console.log('PASS canonical/social metadata, structured public profile, preview dimensions, and official-logo provenance');
eagerAssets.add(indexPath);
const estimatedTransfer = [...eagerAssets].reduce((total, path) => {
  const data = readFileSync(path);
  return total + (/\.(?:woff2|webp|png|jpe?g)$/i.test(path) ? data.length : gzipSync(data).length);
}, 0);
console.log('PASS seven navigation views, source privacy, WebP metadata, and photo attribution');
console.log(`INFO default eager references: ${(estimatedTransfer / 1024).toFixed(1)} KiB estimated compressed; excludes lazy images and alternate srcset candidates`);
console.log(`INFO photo library: ${imageCount} WebP files, ${(imageBytes / 1024).toFixed(1)} KiB including responsive alternatives; ${references.size} local references verified`);
