import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/admin.middleware';
import {
  getStats, getAllUsers, getAllRooms,
  getUserDetail, deleteUser,
} from '../controllers/admin.controller';

const router = Router();

// All admin routes require a valid JWT AND the X-Admin-Secret header
router.use(authenticate);
router.use(requireAdmin);

router.get('/stats',              getStats);
router.get('/users',              getAllUsers);
router.get('/rooms',              getAllRooms);
router.get('/users/:userId',      getUserDetail);
router.delete('/users/:userId',   deleteUser);

export default router;
