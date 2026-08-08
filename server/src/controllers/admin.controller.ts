import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { User } from '../models/User';
import { Room } from '../models/Room';
import { Version } from '../models/Version';
import { getOnlineUsers } from '../socket/onlineTracker';

/**
 * GET /api/admin/stats
 * High-level platform numbers.
 */
export async function getStats(_req: AuthRequest, res: Response): Promise<void> {
  const [totalUsers, totalRooms, totalVersions] = await Promise.all([
    User.countDocuments(),
    Room.countDocuments(),
    Version.countDocuments(),
  ]);

  res.json({
    totalUsers,
    totalRooms,
    totalVersions,
    onlineNow: getOnlineUsers().length,
  });
}

/**
 * GET /api/admin/users
 * All registered users with their room count and last-seen info.
 */
export async function getAllUsers(_req: AuthRequest, res: Response): Promise<void> {
  const users = await User.find().lean().sort({ createdAt: -1 });

  // For each user, count how many rooms they belong to
  const enriched = await Promise.all(
    users.map(async (u) => {
      const roomCount = await Room.countDocuments({ 'members.user': u._id });
      const online = getOnlineUsers().find((o) => o.userId === String(u._id));
      return {
        _id:       u._id,
        name:      u.name,
        email:     u.email,
        avatar:    u.avatar,
        createdAt: u.createdAt,
        roomCount,
        isOnline:  !!online,
        socketId:  online?.socketId ?? null,
        lastRoom:  online?.roomId   ?? null,
      };
    }),
  );

  res.json(enriched);
}

/**
 * GET /api/admin/rooms
 * All rooms with member list and version count.
 */
export async function getAllRooms(_req: AuthRequest, res: Response): Promise<void> {
  const rooms = await Room.find()
    .populate('members.user', 'name email avatar')
    .populate('createdBy', 'name email')
    .lean()
    .sort({ updatedAt: -1 });

  const enriched = await Promise.all(
    rooms.map(async (r) => {
      const versionCount = await Version.countDocuments({ room: r._id });
      const online = getOnlineUsers().filter((o) => o.roomId === String(r._id));
      return { ...r, versionCount, onlineCount: online.length, onlineUsers: online };
    }),
  );

  res.json(enriched);
}

/**
 * GET /api/admin/users/:userId
 * Full detail on a single user — all their rooms and versions.
 */
export async function getUserDetail(req: AuthRequest, res: Response): Promise<void> {
  const user = await User.findById(req.params.userId).lean();
  if (!user) { res.status(404).json({ message: 'User not found' }); return; }

  const rooms = await Room.find({ 'members.user': user._id })
    .populate('members.user', 'name email')
    .lean()
    .sort({ updatedAt: -1 });

  const versions = await Version.find({ createdBy: user._id })
    .select('-canvasData')
    .lean()
    .sort({ createdAt: -1 })
    .limit(20);

  const online = getOnlineUsers().find((o) => o.userId === String(user._id));

  res.json({ user, rooms, versions, isOnline: !!online, onlineInfo: online ?? null });
}

/**
 * DELETE /api/admin/users/:userId
 * Remove a user and all their owned rooms.
 */
export async function deleteUser(req: AuthRequest, res: Response): Promise<void> {
  const { userId } = req.params;
  await Promise.all([
    User.findByIdAndDelete(userId),
    Room.deleteMany({ createdBy: userId }),
  ]);
  res.json({ message: 'User deleted' });
}
