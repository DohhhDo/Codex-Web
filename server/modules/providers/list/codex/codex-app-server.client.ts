import { spawn } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import readline from 'node:readline';

import { AppError } from '@/shared/utils.js';
import type { AnyRecord } from '@/shared/types.js';

/** Provider-native identity and verified rollout path returned to Codex fork consumers. */
export type CodexThreadFork = { threadId: string; path: string };

const REQUEST_TIMEOUT_MS = 30_000;

// One connection belongs to one runtime operation. Notifications and inbound
// requests are separate from response ids: both peers may use the same id.
async function createAppServerClient(handlers: {
  notification?: (method: string, params: AnyRecord) => void;
  request?: (method: string, params: AnyRecord, respond: (result: unknown) => void, requestId?: string | number) => void;
  closed?: (error: Error) => void;
} = {}) {
  const require_ = createRequire(import.meta.url);
  const launcher = require_.resolve('@openai/codex/bin/codex.js');
  const child = spawn(process.execPath, [launcher, 'app-server'], {
    env: process.env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  let nextId = 1;
  let closed = false;
  const pending = new Map<number, { resolve: (value: AnyRecord) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  const reader = readline.createInterface({ input: child.stdout });
  // Drain diagnostics without leaking credentials or flooding the application log.
  child.stderr.resume();
  const fail = (error: Error) => {
    if (closed) return;
    closed = true;
    for (const entry of pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(error);
    }
    pending.clear();
    reader.close();
    child.kill();
    handlers.closed?.(error);
  };
  const write = (message: unknown) => {
    if (closed) throw new AppError('Codex connection is closed.', { code: 'CODEX_APP_SERVER_CLOSED', statusCode: 502 });
    child.stdin.write(`${JSON.stringify(message)}\n`);
  };
  child.on('error', fail);
  child.on('exit', (code, signal) => fail(new Error(`Codex connection ended (${code ?? signal}).`)));
  child.stdin.on('error', fail);
  child.stdout.on('error', fail);
  child.stderr.on('error', () => {});
  reader.on('line', (line) => {
    let message: AnyRecord;
    try { message = JSON.parse(line); } catch { return; }
    if (!message || typeof message !== 'object') return;
    try {
      if (typeof message.method === 'string') {
        if (message.id !== undefined) {
          let answered = false;
          const respond = (result: unknown) => {
            if (answered || closed) return;
            answered = true;
            write({ id: message.id, result });
          };
          if (handlers.request) handlers.request(message.method, message.params ?? {}, respond, message.id);
          else write({ id: message.id, error: { code: -32601, message: 'Unsupported client request' } });
        } else handlers.notification?.(message.method, message.params ?? {});
        return;
      }
      const entry = pending.get(message.id);
      if (!entry) return;
      pending.delete(message.id);
      clearTimeout(entry.timer);
      if (message.error) entry.reject(new AppError(message.error.message || 'Codex request failed.', {
        code: 'CODEX_APP_SERVER_ERROR', statusCode: 502, details: { rpcCode: message.error.code },
      }));
      else entry.resolve(message.result ?? {});
    } catch (error) { fail(error instanceof Error ? error : new Error(String(error))); }
  });
  const client = {
    call(method: string, params: unknown = {}): Promise<AnyRecord> {
      return new Promise((resolve, reject) => {
        if (closed) { reject(new Error('Codex connection is closed.')); return; }
        const id = nextId++;
        const timer = setTimeout(() => {
          fail(new AppError(`Codex did not answer ${method}.`, { code: 'CODEX_APP_SERVER_TIMEOUT', statusCode: 504 }));
        }, REQUEST_TIMEOUT_MS);
        pending.set(id, { resolve, reject, timer });
        try { write({ id, method, params }); } catch (error) { fail(error as Error); }
      });
    },
    close() { fail(new Error('Codex connection closed by client.')); },
  };
  try {
    await client.call('initialize', {
      clientInfo: { name: 'codex_web', title: 'Codex-Web', version: '1.37.3' },
      capabilities: { experimentalApi: true },
    });
    write({ method: 'initialized', params: {} });
    return client;
  } catch (error) { client.close(); throw error; }
}

async function withAppServer<T>(run: (call: (method: string, params: unknown) => Promise<AnyRecord>) => Promise<T>): Promise<T> {
  const client = await createAppServerClient();
  try { return await run(client.call); } finally { client.close(); }
}

/** Used by Codex runtime, discovery and session branching to access the bundled protocol. */
export const codexAppServer = {
  connect: createAppServerClient,
  /**
   * Copies a thread into a new one that ends at `lastTurnId`, or copies the
   * whole thread when it is omitted.
   *
   * `lastTurnId` is inclusive of the turn it names, which is the same
   * convention the app's edit anchor uses ("the last row to keep").
   *
   * `cwd` decides the working directory recorded in the copy's `session_meta`,
   * and that field is what the session indexer keys a session's project off —
   * omitting it would file every fork under whatever directory this server
   * happens to be running from.
   */
  async forkThread(input: {
    threadId: string;
    lastTurnId?: string;
    cwd: string;
  }): Promise<CodexThreadFork> {
    return withAppServer(async (call) => {
      const result = await call('thread/fork', {
        threadId: input.threadId,
        ...(input.lastTurnId ? { lastTurnId: input.lastTurnId } : {}),
        ...(input.cwd ? { cwd: input.cwd } : {}),
      }) as { thread?: { id?: unknown; path?: unknown } } | undefined;

      const threadId = typeof result?.thread?.id === 'string' ? result.thread.id : '';
      const path = typeof result?.thread?.path === 'string' ? result.thread.path : '';
      if (!threadId || !path) {
        throw new AppError('Codex reported a fork without a thread id or transcript path.', {
          code: 'FORK_FAILED',
          statusCode: 502,
        });
      }

      // Confirmed rather than trusted: both callers are about to point a
      // database row at this file, and a row naming a transcript that is not
      // there is a session that can never be opened.
      try {
        await stat(path);
      } catch {
        throw new AppError('Codex reported a fork but wrote no transcript for it.', {
          code: 'FORK_FAILED',
          statusCode: 502,
        });
      }

      return { threadId, path };
    });
  },
};
