import express from 'express';
import type { Request } from 'express';

import { automationsService } from '@/modules/automations/automations.service.js';
import { AppError, asyncHandler, createApiSuccessResponse } from '@/shared/utils.js';

function userId(req: Request) {
  const id = Number((req as Request & { user?: { id?: unknown } }).user?.id);
  if (!Number.isInteger(id)) throw new AppError('Authentication required.', { statusCode: 401, code: 'USER_REQUIRED' });
  return id;
}
const router = express.Router();
router.get('/', asyncHandler(async (req, res) => { res.json(createApiSuccessResponse(automationsService.list(userId(req), String(req.query.sessionId ?? '')))); }));
router.post('/', asyncHandler(async (req, res) => { res.json(createApiSuccessResponse(automationsService.save(userId(req), req.body ?? {}))); }));
router.get('/:id/runs', asyncHandler(async (req, res) => { res.json(createApiSuccessResponse(automationsService.history(userId(req), String(req.params.id)))); }));
router.delete('/:id', asyncHandler(async (req, res) => { automationsService.remove(userId(req), String(req.params.id)); res.json(createApiSuccessResponse({ deleted: true })); }));
/** Used by server startup to mount authenticated recurring task endpoints. */
export const automationsRoutes = router;
