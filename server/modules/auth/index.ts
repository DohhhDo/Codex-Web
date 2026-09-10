// authRoutes: used by the server entrypoint to mount workspace bootstrap and display profile endpoints.
export { authRoutes } from './auth.module.js';

// authenticateToken: used by the server entrypoint to attach the workspace owner to API requests.
export { authenticateToken } from './auth.middleware.js';
// authenticateWebSocket: used by WebSocket setup to attach the same owner to chat and terminal connections.
export { authenticateWebSocket } from './auth.middleware.js';
// validateApiKey: used by the server entrypoint for optional API-wide key validation.
export { validateApiKey } from './auth.middleware.js';
