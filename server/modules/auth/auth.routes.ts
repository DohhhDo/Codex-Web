import express from 'express';
import type { createWorkspaceProfileService } from './workspace-profile.service.js';

/** Workspace bootstrap and display settings; legacy sign-in endpoints are retired. */
export function createAuthRouter(service: ReturnType<typeof createWorkspaceProfileService>): express.Router {
  const router = express.Router();
  router.get('/status', (_req, res) => {
    res.json({ needsSetup: false, isAuthenticated: true, authenticationRequired: false });
  });
  router.get('/user', async (_req, res, next) => {
    try { res.json({ user: await service.getProfile() }); } catch (error) { next(error); }
  });
  router.put('/profile', async (req, res, next) => {
    try { res.json({ user: await service.updateProfile(req.body) }); } catch (error) { next(error); }
  });
  router.post(['/login', '/register', '/logout', '/refresh'], (_req, res) => {
    res.status(410).json({ error: 'Codex-Web opens directly. Local sign-in is no longer used.' });
  });
  return router;
}
