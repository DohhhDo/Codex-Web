import { randomUUID } from 'node:crypto';

import { automationsDb, sessionsDb } from '@/modules/database/index.js';
import { chatRunRegistry, runDetachedChatTurn } from '@/modules/websocket/index.js';
import type { ProviderRuntimeGateway } from '@/modules/websocket/index.js';
import { AppError } from '@/shared/utils.js';

/** Used by automation routes and the background timer; recurring jobs retain the user's chosen permissions. */
export const automationsService = {
  list: automationsDb.list,
  history: automationsDb.history,
  remove: automationsDb.remove.bind(automationsDb),
  save(userId: number, input: Record<string, unknown>) {
    const existing = typeof input.id === 'string' ? automationsDb.get(userId, input.id) : undefined;
    if (input.id && !existing) throw new AppError('Automation not found.', { statusCode: 404, code: 'AUTOMATION_NOT_FOUND' });
    const content = typeof input.content === 'string' ? input.content.trim() : existing?.content ?? '';
    const sessionId = typeof input.sessionId === 'string' ? input.sessionId : existing?.session_id ?? '';
    const interval = Number(input.intervalMinutes ?? existing?.interval_minutes);
    const next = input.nextRunAt === undefined ? existing?.next_run_at ?? Date.now() + interval * 60_000 : Date.parse(String(input.nextRunAt));
    if (!content || content.length > 100_000 || !Number.isInteger(interval) || interval < 15 || interval > 525600 || !Number.isFinite(next)) {
      throw new AppError('Provide a prompt, valid start time, and an interval from 15 minutes to one year.', { statusCode: 400, code: 'INVALID_AUTOMATION' });
    }
    if (!sessionsDb.getSessionById(sessionId)) throw new AppError('Session not found.', { statusCode: 404, code: 'SESSION_NOT_FOUND' });
    return automationsDb.save({
      id: existing?.id ?? randomUUID(), user_id: userId, session_id: sessionId, content,
      options: input.options === undefined ? existing?.options ?? '{}' : JSON.stringify(input.options),
      interval_minutes: interval, next_run_at: next, enabled: typeof input.enabled === 'boolean' ? Number(input.enabled) : existing?.enabled ?? 1,
      created_at: existing?.created_at ?? Date.now(),
    });
  },
  async dispatch(runtime: ProviderRuntimeGateway, now = Date.now()) {
    const jobs: Promise<void>[] = [];
    for (const task of automationsDb.due(now)) {
      // Busy sessions wait for a later poll; recurring work must never abort a user's turn.
      if (chatRunRegistry.isProcessing(task.session_id)) continue;
      const runId = automationsDb.claim(task, now);
      if (!runId) continue;
      jobs.push((async () => {
        try {
          const result = await runDetachedChatTurn({ sessionId: task.session_id, userId: task.user_id, content: task.content, options: JSON.parse(task.options) }, { runtime });
          automationsDb.complete(runId, result.error ?? (result.started ? null : 'Session unavailable'));
        } catch (error) { automationsDb.complete(runId, error instanceof Error ? error.message : String(error)); }
      })());
    }
    await Promise.all(jobs);
  },
};

let timer: ReturnType<typeof setInterval> | null = null;

/** Used by server startup; database claims prevent duplicate runs and missed intervals coalesce into one catch-up. */
export function initializeAutomationDispatcher(runtime: ProviderRuntimeGateway) {
  if (timer) return;
  automationsDb.recoverInterrupted();
  const tick = () => {
    void automationsService.dispatch(runtime).catch((error) => console.error('[Automations]', error));
  };
  timer = setInterval(tick, 30_000);
  timer.unref();
  tick();
}

/** Used by server shutdown to stop accepting new scheduled occurrences. */
export function closeAutomationDispatcher() { if (timer) clearInterval(timer); timer = null; }
