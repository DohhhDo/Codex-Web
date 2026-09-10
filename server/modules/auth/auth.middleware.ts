import type { RequestHandler, Request } from 'express';
import { userDb } from '@/modules/database/index.js';

/** Used by the server mount for optional deployment-level API key validation. */
export const validateApiKey: RequestHandler = (req, res, next) => {
  if (process.env.API_KEY && req.headers['x-api-key'] !== process.env.API_KEY) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }
  next();
};

/** Used by API modules to attach the persistent workspace owner; no login is required. */
export const authenticateToken: RequestHandler = (req, _res, next) => {
  try {
    (req as Request & { user: ReturnType<typeof userDb.getWorkspaceUser> }).user = userDb.getWorkspaceUser();
    next();
  } catch (error) {
    next(error);
  }
};

/** Used by chat and shell upgrades to share the REST workspace identity. */
export function authenticateWebSocket(_token: string | null) {
  const user = userDb.getWorkspaceUser();
  return { id: user.id, userId: user.id, username: user.username };
}
