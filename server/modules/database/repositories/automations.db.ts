import { randomUUID } from 'node:crypto';

import { getConnection } from '@/modules/database/connection.js';
import type { AutomationRecord } from '@/shared/types.js';

/** Used by automations services to persist schedules and atomically claim a due occurrence. */
export const automationsDb = {
  list(userId: number, sessionId: string) {
    return getConnection().prepare('SELECT * FROM automations WHERE user_id = ? AND session_id = ? ORDER BY created_at DESC').all(userId, sessionId) as AutomationRecord[];
  },
  get(userId: number, id: string) {
    return getConnection().prepare('SELECT * FROM automations WHERE user_id = ? AND id = ?').get(userId, id) as AutomationRecord | undefined;
  },
  save(row: AutomationRecord) {
    getConnection().prepare('INSERT INTO automations VALUES (@id, @user_id, @session_id, @content, @options, @interval_minutes, @next_run_at, @enabled, @created_at) ON CONFLICT(id) DO UPDATE SET content=excluded.content, options=excluded.options, interval_minutes=excluded.interval_minutes, next_run_at=excluded.next_run_at, enabled=excluded.enabled').run(row);
    return row;
  },
  due(now: number) {
    return getConnection().prepare('SELECT * FROM automations WHERE enabled = 1 AND next_run_at <= ? ORDER BY next_run_at').all(now) as AutomationRecord[];
  },
  claim(row: AutomationRecord, now: number) {
    const db = getConnection();
    return db.transaction(() => {
      const next = row.next_run_at + (Math.floor((now - row.next_run_at) / (row.interval_minutes * 60_000)) + 1) * row.interval_minutes * 60_000;
      const updated = db.prepare('UPDATE automations SET next_run_at = ? WHERE id = ? AND enabled = 1 AND next_run_at = ?').run(next, row.id, row.next_run_at);
      if (!updated.changes) return null;
      const id = randomUUID();
      db.prepare('INSERT INTO automation_runs (id, automation_id, started_at, status) VALUES (?, ?, ?, ?)').run(id, row.id, now, 'running');
      return id;
    })();
  },
  complete(id: string, error: string | null) {
    getConnection().prepare('UPDATE automation_runs SET completed_at = ?, status = ?, error = ? WHERE id = ?').run(Date.now(), error ? 'failed' : 'completed', error, id);
  },
  history(userId: number, id: string) {
    return getConnection().prepare('SELECT r.* FROM automation_runs r JOIN automations a ON a.id = r.automation_id WHERE a.user_id = ? AND a.id = ? ORDER BY r.started_at DESC LIMIT 30').all(userId, id);
  },
  remove(userId: number, id: string) {
    getConnection().transaction(() => {
      if (!this.get(userId, id)) return;
      getConnection().prepare('DELETE FROM automation_runs WHERE automation_id = ?').run(id);
      getConnection().prepare('DELETE FROM automations WHERE user_id = ? AND id = ?').run(userId, id);
    })();
  },
  recoverInterrupted() {
    getConnection().prepare("UPDATE automation_runs SET status = 'interrupted', completed_at = ?, error = 'Server restarted before completion' WHERE status = 'running'").run(Date.now());
  },
};
