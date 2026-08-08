import { Router } from 'express';
import {
  createRoom, listRooms, getRoom,
  saveCanvas, joinByInvite,
  updateMemberRole, deleteRoom,
  updateRoomSettings, removeMember, regenerateInvite,
  createRoomValidators,
} from '../controllers/room.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRoomRole } from '../middleware/role.middleware';
import { validateRequest } from '../middleware/validate.middleware';

const router = Router();

router.use(authenticate);

router.get   ('/',                                    listRooms);
router.post  ('/', createRoomValidators, validateRequest, createRoom);
router.get   ('/:roomId',                             getRoom);
router.patch ('/:roomId/canvas',                      requireRoomRole('editor'),  saveCanvas);
router.patch ('/:roomId/settings',                    requireRoomRole('owner'),   updateRoomSettings);
router.patch ('/:roomId/members/:memberId',           requireRoomRole('owner'),   updateMemberRole);
router.delete('/:roomId/members/:memberId',           requireRoomRole('owner'),   removeMember);
router.post  ('/:roomId/regenerate-invite',           requireRoomRole('owner'),   regenerateInvite);
router.delete('/:roomId',                             requireRoomRole('owner'),   deleteRoom);

// Join via invite link (no room role check needed — uses token)
router.post('/join/:inviteToken',  joinByInvite);

export default router;
