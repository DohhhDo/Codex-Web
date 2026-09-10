import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { automationsDb, closeConnection, getConnection, initializeDatabase } from '@/modules/database/index.js';
import { automationsService } from '@/modules/automations/automations.service.js';

test('recurring schedules validate input, isolate users and atomically coalesce overdue occurrences', async () => {
  const previous = process.env.DATABASE_PATH;
  const root = await mkdtemp(join(tmpdir(), 'codex-automations-test-'));
  closeConnection();
  process.env.DATABASE_PATH = join(root, 'auth.db');
  await writeFile(process.env.DATABASE_PATH, '');
  try {
    await initializeDatabase();
    getConnection().prepare("INSERT INTO projects (project_id, project_path) VALUES ('project', '/tmp/project')").run();
    getConnection().prepare("INSERT INTO sessions (session_id, provider, project_path) VALUES ('session', 'codex', '/tmp/project')").run();
    assert.throws(() => automationsService.save(1, { sessionId: 'session', content: 'Check tests', intervalMinutes: 1 }), /interval/);
    assert.throws(() => automationsService.save(1, { sessionId: 'missing', content: 'Check tests', intervalMinutes: 15 }), /Session not found/);
    const now = Date.now();
    const task = automationsService.save(1, { sessionId: 'session', content: 'Check tests', intervalMinutes: 15, nextRunAt: new Date(now - 60 * 60_000).toISOString(), options: { permissionMode: 'default' } });
    assert.equal(automationsDb.list(2, 'session').length, 0);
    assert.throws(() => automationsService.save(2, { id: task.id, enabled: false }), /not found/);
    const run = automationsDb.claim(task, now)!;
    assert.ok(run);
    assert.equal(automationsDb.claim(task, now), null);
    assert.equal(automationsDb.due(now).length, 0);
    assert.equal(automationsDb.get(1, task.id)?.next_run_at, now + 15 * 60_000);
    automationsDb.complete(run, 'Provider unavailable');
    assert.equal((automationsDb.history(1, task.id)[0] as { status: string }).status, 'failed');
    assert.deepEqual(automationsDb.history(2, task.id), []);
    automationsService.save(1, { id: task.id, enabled: false });
    assert.equal(automationsDb.due(now + 30 * 60_000).length, 0);
    const resumed = automationsService.save(1, { id: task.id, enabled: true });
    assert.equal(resumed.options, JSON.stringify({ permissionMode: 'default' }));
    automationsDb.claim(resumed, now + 30 * 60_000);
    automationsDb.recoverInterrupted();
    assert.equal((automationsDb.history(1, task.id)[0] as { status: string }).status, 'interrupted');
    automationsDb.remove(2, task.id);
    assert.ok(automationsDb.get(1, task.id));
    automationsDb.remove(1, task.id);
    assert.equal(automationsDb.get(1, task.id), undefined);
    assert.equal((getConnection().prepare('SELECT count(*) AS count FROM automation_runs').get() as { count: number }).count, 0);
  } finally {
    closeConnection();
    if (previous === undefined) delete process.env.DATABASE_PATH; else process.env.DATABASE_PATH = previous;
    await rm(root, { recursive: true, force: true });
  }
});
