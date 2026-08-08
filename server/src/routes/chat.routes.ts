import { Router } from 'express';
import { getChatHistory } from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRoomRole } from '../middleware/role.middleware';

const router = Router();

router.use(authenticate);

/**
 * GET /api/rooms/:roomId/chat
 * Returns last 100 messages for a room (oldest first).
 * Requires at least viewer access.
 */
router.get('/:roomId/chat', requireRoomRole('viewer'), getChatHistory);

export default router;
