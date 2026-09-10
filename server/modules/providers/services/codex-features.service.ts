import { sessionsDb } from '@/modules/database/index.js';
import { codexRuntime } from '@/modules/providers/list/codex/codex-runtime.provider.js';
import { codexAppServer } from '@/modules/providers/list/codex/codex-app-server.client.js';
import { AppError } from '@/shared/utils.js';

/** Used by provider routes to discover native tools without exposing arbitrary RPC methods. */
export const codexFeaturesService = {
  async list(kind: string, cwd?: string, cursor?: string, sessionId?: string) {
    const session = sessionId ? sessionsDb.getSessionById(sessionId) : null;
    if (kind === 'agents') {
      if (!session || session.provider !== 'codex' || !session.provider_session_id) return { data: [] };
      return codexRuntime.listAgents(sessionId!, session.provider_session_id);
    }
    const method = { apps: 'app/list', mcp: 'mcpServerStatus/list', skills: 'skills/list', models: 'model/list', features: 'experimentalFeature/list', limits: 'account/rateLimits/read' }[kind];
    if (!method) throw new AppError('Unknown Codex capability.', { code: 'INVALID_CAPABILITY', statusCode: 400 });
    const client = await codexAppServer.connect();
    try {
      const params = kind === 'skills' ? { cwds: cwd ? [cwd] : [process.cwd()] }
        : kind === 'limits' ? {}
        : { ...(cursor ? { cursor } : {}), limit: 100, ...(kind === 'apps' ? { forceRefetch: false } : {}) };
      return await client.call(method, params);
    } finally { client.close(); }
  },
};
