import { Router } from 'express';
import { getMe, updateMe, changePassword } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get   ('/me',          getMe);
router.patch ('/me',          updateMe);
router.patch ('/me/password', changePassword);

export default router;
