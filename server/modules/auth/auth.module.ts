import { appConfigDb, userDb } from '@/modules/database/index.js';
import { providerAuthService } from '@/modules/providers/index.js';
import { createAuthRouter } from './auth.routes.js';
import { createWorkspaceProfileService } from './workspace-profile.service.js';

const profileService = createWorkspaceProfileService({
  getUser: () => userDb.getWorkspaceUser(),
  read: key => appConfigDb.get(key),
  write: (key, value) => appConfigDb.set(key, value),
  readCodex: () => providerAuthService.getProviderAuthStatus('codex'),
});

/** Used by the server to bootstrap the shared workspace and edit its display identity. */
export const authRoutes = createAuthRouter(profileService);
