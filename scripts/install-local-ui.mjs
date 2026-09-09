import { cp, mkdir, readFile, readdir, copyFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Deploy only the frontend of the matching upstream version. Existing server
// processes, credentials, session files, and databases are never touched.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targetArg = process.argv[2];
if (!targetArg) throw new Error('Usage: node scripts/install-local-ui.mjs <installed-package-directory> [--restore]');
const target = path.resolve(targetArg);
if (target === root) throw new Error('The installation target must differ from the source checkout.');
const ours = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const installed = JSON.parse(await readFile(path.join(target, 'package.json'), 'utf8'));
if (installed.version !== ours.version || installed.name !== '@cloudcli-ai/cloudcli') {
  throw new Error(`Expected @cloudcli-ai/cloudcli ${ours.version}. Check the frontend/backend version before deploying.`);
}
const dist = path.join(target, 'dist');
const backup = path.join(target, `dist.before-codex-web-${ours.version}`);
const restore = process.argv.includes('--restore');
const source = restore ? backup : path.join(root, 'dist');
await access(path.join(source, 'index.html'));
if (!restore) {
  try { await access(backup); }
  catch { await cp(dist, backup, { recursive: true, errorOnExist: true, force: false }); }
}
await mkdir(dist, { recursive: true });
// Publish assets first and HTML last. Old hashed assets stay available so tabs
// opened before installation can still lazy-load their existing UI chunks.
for (const name of await readdir(source)) {
  if (name !== 'index.html') await cp(path.join(source, name), path.join(dist, name), { recursive: true });
}
await copyFile(path.join(source, 'index.html'), path.join(dist, 'index.html'));
console.log(`${restore ? 'Restored upstream UI' : 'Installed Codex-Web UI'} at ${dist}`);
console.log(`Original frontend backup: ${backup}`);
