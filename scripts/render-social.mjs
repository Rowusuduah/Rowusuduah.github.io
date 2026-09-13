import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname, isAbsolute } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

// Optional asset maintenance only. Published pages require no package or build.
// Usage: node scripts/render-social.mjs <path-to-sharp-module-entry>
const sharpModule = process.argv[2];
if (!sharpModule) throw new Error('Pass the installed Sharp module entry path; see README.');
const { default: sharp } = await import(isAbsolute(sharpModule) ? pathToFileURL(sharpModule).href : sharpModule);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const png = await sharp(resolve(root, 'assets/images/headshot-800.webp')).png().toBuffer();
const source = await readFile(resolve(root, 'assets/social-preview.svg'), 'utf8');
const svg = source.replace('images/headshot-800.webp', 'data:image/png;base64,' + png.toString('base64'));
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(resolve(root, 'assets/social-preview.png'));
for (const [name, size] of [['apple-touch-icon', 180], ['favicon-32', 32]]) {
  await sharp(resolve(root, 'assets/favicon.svg')).resize(size, size).png().toFile(resolve(root, 'assets/' + name + '.png'));
}
console.log('Rendered social preview and icons; preview bytes: ' + (await stat(resolve(root, 'assets/social-preview.png'))).size);
