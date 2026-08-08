import { Request, Response, NextFunction } from 'express';
import { Room } from '../models/Room';
import { AuthRequest } from './auth.middleware';

type RequiredRole = 'owner' | 'editor' | 'viewer';

const ROLE_RANK: Record<RequiredRole, number> = { owner: 3, editor: 2, viewer: 1 };

/**
 * Factory — creates a middleware that checks the calling user has at least
 * `minRole` inside the room identified by `req.params.roomId`.
 */
export function requireRoomRole(minRole: RequiredRole) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { roomId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthenticated' });
      return;
    }

    const room = await Room.findById(roomId).lean();
    if (!room) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    const member = room.members.find((m) => String(m.user) === userId);
    if (!member) {
      res.status(403).json({ message: 'You are not a member of this room' });
      return;
    }

    if (ROLE_RANK[member.role] < ROLE_RANK[minRole]) {
      res.status(403).json({ message: `Requires at least '${minRole}' role` });
      return;
    }

    next();
  };
}
