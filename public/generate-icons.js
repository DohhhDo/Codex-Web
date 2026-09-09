import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

// Generate every browser, installed-app and notification asset from one mark.
// Content-addressed URLs bypass the server's year-long immutable image cache.
const publicDir = path.dirname(fileURLToPath(import.meta.url));
const source = await readFile(path.join(publicDir, 'logo.svg'));
const version = createHash('sha256').update(source).digest('hex').slice(0, 10);
const prefix = `codex-web-${version}`;
const iconsDir = path.join(publicDir, 'icons');
await mkdir(iconsDir, { recursive: true });
const sizes = [16, 32, 48, 64, 72, 96, 128, 144, 152, 180, 192, 256, 384, 512];
const pngs = new Map();
for (const size of sizes) {
  const png = await sharp(source).resize(size, size).png().toBuffer();
  pngs.set(size, png);
  const svg = source.toString().replace('<svg ', `<svg width="${size}" height="${size}" `);
  await writeFile(path.join(iconsDir, `icon-${size}x${size}.svg`), svg);
  await writeFile(path.join(iconsDir, `icon-${size}x${size}.png`), png);
  await writeFile(path.join(iconsDir, `${prefix}-${size}.png`), png);
}
for (const size of [32, 64, 128, 256, 512]) {
  await writeFile(path.join(publicDir, `logo-${size}.png`), pngs.get(size));
}
await writeFile(path.join(iconsDir, 'icon-template.svg'), source);
await writeFile(path.join(iconsDir, `${prefix}.svg`), source);
await writeFile(path.join(publicDir, 'favicon.svg'), source);
await writeFile(path.join(publicDir, 'favicon.png'), pngs.get(64));

// PNG-backed ICO with multiple resolutions for browsers requesting /favicon.ico.
const icoSizes = [16, 32, 48];
const header = Buffer.alloc(6 + icoSizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(icoSizes.length, 4);
let offset = header.length;
for (const [index, size] of icoSizes.entries()) {
  const entry = 6 + index * 16;
  const png = pngs.get(size);
  header[entry] = size;
  header[entry + 1] = size;
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(png.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += png.length;
}
await writeFile(path.join(publicDir, 'favicon.ico'), Buffer.concat([header, ...icoSizes.map(size => pngs.get(size))]));

const htmlPath = path.join(publicDir, '..', 'index.html');
let html = await readFile(htmlPath, 'utf8');
html = html.replace(/    <link rel="icon"[^\n]*\n/g, '');
html = html.replace('    <meta charset="UTF-8" />', `    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" sizes="32x32" href="/icons/${prefix}-32.png" />
    <link rel="icon" type="image/svg+xml" sizes="any" href="/icons/${prefix}.svg" />`);
html = html.replace(/<link rel="apple-touch-icon" sizes="(\d+)x\d+" href="[^"]+" \/>/g,
  (_, size) => `<link rel="apple-touch-icon" sizes="${size}x${size}" href="/icons/${prefix}-${size}.png" />`);
await writeFile(htmlPath, html);

const manifestPath = path.join(publicDir, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const icon of manifest.icons) icon.src = `/icons/${prefix}-${icon.sizes.split('x')[0]}.png`;
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

const workerPath = path.join(publicDir, 'sw.js');
let worker = await readFile(workerPath, 'utf8');
worker = worker.replace(/const CACHE_NAME = '[^']+';/, `const CACHE_NAME = 'codex-web-${version}';`);
worker = worker.replace(/    icon: '[^']+',/, `    icon: '/icons/${prefix}-256.png',`);
worker = worker.replace(/    badge: '[^']+',/, `    badge: '/icons/${prefix}-128.png',`);
await writeFile(workerPath, worker);
console.log(`Generated Codex-Web browser icons: ${prefix}`);
