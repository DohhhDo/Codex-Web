import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { closeConnection, initializeDatabase, userDb, userPreferencesDb, sessionDraftsDb } from '@/modules/database/index.js';

test('direct access creates one owner and preserves existing preferences and drafts across restart', async () => {
  const previous = process.env.DATABASE_PATH;
  const dir = await mkdtemp(path.join(os.tmpdir(), 'workspace-owner-'));
  closeConnection();
  process.env.DATABASE_PATH = path.join(dir, 'auth.db');
  try {
    await writeFile(process.env.DATABASE_PATH!, '');
    await initializeDatabase();
    const owner = userDb.getWorkspaceUser();
    assert.equal(userDb.getWorkspaceUser().id, owner.id);
    userPreferencesDb.savePreferences(owner.id, { theme: 'dark', tasksEnabled: true });
    sessionDraftsDb.saveDraft(owner.id, 'project:example', { text: 'Keep this draft', queuedMessage: null });
    closeConnection();
    await initializeDatabase();
    assert.equal(userDb.getWorkspaceUser().id, owner.id);
    assert.equal(userPreferencesDb.getPreferences(owner.id).theme, 'dark');
    assert.ok(JSON.stringify(sessionDraftsDb.getDrafts(owner.id)).includes('Keep this draft'));
  } finally {
    closeConnection();
    if (previous === undefined) delete process.env.DATABASE_PATH; else process.env.DATABASE_PATH = previous;
    await rm(dir, { recursive: true, force: true });
  }
});
