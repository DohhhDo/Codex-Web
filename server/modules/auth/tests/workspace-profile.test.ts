import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { createWorkspaceProfileService } from '../workspace-profile.service.js';
import { createAuthRouter } from '../auth.routes.js';

function fixture() {
  const saved = new Map<string, string>();
  const codex = { authenticated: true, displayName: 'Codex Name', avatarUrl: 'https://example.com/avatar.png', email: 'name@example.com' };
  const service = createWorkspaceProfileService({ getUser: () => ({ id: 7, username: 'existing-owner' }), read: key => saved.get(key) || null, write: (key, value) => { saved.set(key, value); }, readCodex: async () => codex });
  return { service, codex, saved };
}

test('Codex defaults, manual overrides, account changes and reset retain the same owner', async () => {
  const { service, codex } = fixture();
  assert.equal((await service.getProfile()).displayName, 'Codex Name');
  const avatar = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==';
  const saved = await service.updateProfile({ displayName: '  My workspace  ', avatarUrl: avatar });
  assert.equal(saved.id, 7);
  assert.equal(saved.displayName, 'My workspace');
  assert.equal(saved.avatarUrl, avatar);
  codex.displayName = 'Another account';
  assert.equal((await service.getProfile()).displayName, 'My workspace');
  assert.equal((await service.updateProfile({ displayName: null, avatarUrl: null })).displayName, 'Another account');
  codex.authenticated = false;
  assert.equal((await service.getProfile()).avatarUrl, null);
  assert.equal((await service.getProfile()).displayName, 'existing-owner');
});

test('invalid names, oversized images, SVG and forged image types do not change saved data', async () => {
  const { service, saved } = fixture();
  for (const body of [null, { displayName: '' }, { displayName: 'x'.repeat(81), avatarUrl: null }, { displayName: 'Fine', avatarUrl: 'https://example.com/upload.png' }, { displayName: 'Fine', avatarUrl: 'data:image/svg+xml;base64,PHN2Zz4=' }, { displayName: 'Fine', avatarUrl: 'data:image/png;base64,YWJj' }, { displayName: 'Fine', avatarUrl: 'x'.repeat(1_400_001) }]) {
    await assert.rejects(service.updateProfile(body), { code: 'INVALID_PROFILE' });
  }
  assert.equal(saved.size, 0);
});

test('HTTP bootstrap and profile saving need no token, while registration and login are retired', async () => {
  const { service } = fixture();
  const app = express();
  app.use(express.json());
  app.use('/api/auth', createAuthRouter(service));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}/api/auth`;
  try {
    assert.equal(((await (await fetch(`${url}/status`)).json()) as { needsSetup: boolean }).needsSetup, false);
    assert.equal(((await (await fetch(`${url}/user`, { headers: { Authorization: 'Bearer expired-token' } })).json()) as { user: { id: number } }).user.id, 7);
    const response = await fetch(`${url}/profile`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName: 'Updated', avatarUrl: null }) });
    assert.equal(((await response.json()) as { user: { displayName: string } }).user.displayName, 'Updated');
    for (const path of ['register', 'login', 'logout', 'refresh']) assert.equal((await fetch(`${url}/${path}`, { method: 'POST' })).status, 410);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
