import { Router } from 'express';
import {
  createVersion, listVersions,
  getVersion, restoreVersion,
} from '../controllers/version.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRoomRole } from '../middleware/role.middleware';

const router = Router();

router.use(authenticate);

router.get ('/:roomId',                         requireRoomRole('viewer'), listVersions);
router.post('/:roomId',                         requireRoomRole('editor'), createVersion);
router.get ('/:roomId/:versionId',              requireRoomRole('viewer'), getVersion);
router.post('/:roomId/:versionId/restore',      requireRoomRole('editor'), restoreVersion);

export default router;
