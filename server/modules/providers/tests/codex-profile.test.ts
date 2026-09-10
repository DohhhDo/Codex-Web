import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { CodexProviderAuth } from '../list/codex/codex-auth.provider.js';

test('Codex display claims honor CODEX_HOME and never expose tokens or require profile fields', async () => {
  const previous = process.env.CODEX_HOME;
  const directory = await mkdtemp(path.join(os.tmpdir(), 'codex-profile-'));
  process.env.CODEX_HOME = directory;
  const auth = new CodexProviderAuth();
  const saveClaims = async (claims: unknown) => {
    const token = `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;
    await writeFile(path.join(directory, 'auth.json'), JSON.stringify({ tokens: { id_token: token, access_token: 'SECRET-TOKEN' } }));
  };
  try {
    await saveClaims({ name: 'Display Name', picture: 'https://example.com/avatar.png', email: 'user@example.com' });
    const status = await auth.getStatus();
    assert.equal(status.displayName, 'Display Name');
    assert.equal(status.avatarUrl, 'https://example.com/avatar.png');
    assert.ok(!JSON.stringify(status).includes('SECRET-TOKEN'));
    await saveClaims({ email: 'user@example.com', picture: 'javascript:alert(1)' });
    assert.equal((await auth.getStatus()).avatarUrl, undefined);
    await writeFile(path.join(directory, 'auth.json'), JSON.stringify({ OPENAI_API_KEY: 'SECRET-API-KEY' }));
    const apiKey = await auth.getStatus();
    assert.equal(apiKey.method, 'api_key');
    assert.equal(apiKey.displayName, undefined);
    assert.equal(apiKey.avatarUrl, undefined);
    assert.ok(!JSON.stringify(apiKey).includes('SECRET-API-KEY'));
  } finally {
    if (previous === undefined) delete process.env.CODEX_HOME; else process.env.CODEX_HOME = previous;
    await rm(directory, { recursive: true, force: true });
  }
});
