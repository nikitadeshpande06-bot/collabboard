import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body } from 'express-validator';
import mongoose from 'mongoose';
import { Room } from '../models/Room';
import { AuthRequest } from '../middleware/auth.middleware';

export const createRoomValidators = [
  body('name').trim().notEmpty().isLength({ max: 100 }),
  body('description').optional().isLength({ max: 500 }),
  body('isPublic').optional().isBoolean(),
];

/**
 * POST /api/rooms
 * Create a new room; the creator becomes the owner.
 */
export async function createRoom(req: AuthRequest, res: Response): Promise<void> {
  const { name, description, isPublic } = req.body;
  const userId = req.user!.id;

  const room = await Room.create({
    name,
    description,
    isPublic: isPublic ?? false,
    inviteToken: uuidv4(),
    createdBy: userId,
    members: [{ user: userId, role: 'owner' }],
    canvasData: JSON.stringify({ version: '5.3.0', objects: [] }),
  });

  res.status(201).json(room);
}

/**
 * GET /api/rooms
 * List all rooms the authenticated user belongs to.
 */
export async function listRooms(req: AuthRequest, res: Response): Promise<void> {
  const rooms = await Room.find({ 'members.user': req.user!.id })
    .populate('members.user', 'name email avatar')
    .sort({ updatedAt: -1 });
  res.json(rooms);
}

/**
 * GET /api/rooms/:roomId
 * Get room details including latest canvas data.
 */
export async function getRoom(req: AuthRequest, res: Response): Promise<void> {
  const room = await Room.findById(req.params.roomId)
    .populate('members.user', 'name email avatar')
    .populate('createdBy', 'name email');

  if (!room) {
    res.status(404).json({ message: 'Room not found' });
    return;
  }
  res.json(room);
}

/**
 * PATCH /api/rooms/:roomId/canvas
 * Persist the latest canvas snapshot (called by the owner/editor after every
 * significant change, typically debounced on the client side).
 */
export async function saveCanvas(req: AuthRequest, res: Response): Promise<void> {
  const { canvasData } = req.body;
  if (!canvasData) {
    res.status(400).json({ message: 'canvasData is required' });
    return;
  }

  await Room.findByIdAndUpdate(req.params.roomId, { canvasData });
  res.json({ message: 'Canvas saved' });
}

/**
 * POST /api/rooms/join/:inviteToken
 * Join a room via its invite link.
 */
export async function joinByInvite(req: AuthRequest, res: Response): Promise<void> {
  const { inviteToken } = req.params;
  const userId = req.user!.id;

  const room = await Room.findOne({ inviteToken });
  if (!room) {
    res.status(404).json({ message: 'Invalid invite token' });
    return;
  }

  const already = room.members.find((m) => String(m.user) === userId);
  if (!already) {
    room.members.push({ user: new mongoose.Types.ObjectId(userId), role: 'editor', joinedAt: new Date() });
    await room.save();
  }

  res.json(room);
}

/**
 * PATCH /api/rooms/:roomId/members/:memberId
 * Owner changes another member's role.
 */
export async function updateMemberRole(req: AuthRequest, res: Response): Promise<void> {
  const { roomId, memberId } = req.params;
  const { role } = req.body;

  if (!['editor', 'viewer'].includes(role)) {
    res.status(400).json({ message: 'Role must be editor or viewer' });
    return;
  }

  const room = await Room.findById(roomId);
  if (!room) { res.status(404).json({ message: 'Room not found' }); return; }

  const member = room.members.find((m) => String(m.user) === memberId);
  if (!member) { res.status(404).json({ message: 'Member not found' }); return; }

  member.role = role;
  await room.save();
  res.json({ message: 'Role updated' });
}

/**
 * PATCH /api/rooms/:roomId/settings
 * Owner updates room name, description, or public/private toggle.
 */
export async function updateRoomSettings(req: AuthRequest, res: Response): Promise<void> {
  const { name, description, isPublic } = req.body as {
    name?: string;
    description?: string;
    isPublic?: boolean;
  };

  const updates: Record<string, unknown> = {};
  if (name?.trim()) updates.name = name.trim();
  if (description !== undefined) updates.description = description;
  if (isPublic !== undefined) updates.isPublic = isPublic;

  const room = await Room.findByIdAndUpdate(req.params.roomId, updates, { new: true })
    .populate('members.user', 'name email avatar')
    .populate('createdBy', 'name email');

  if (!room) { res.status(404).json({ message: 'Room not found' }); return; }
  res.json(room);
}

/**
 * DELETE /api/rooms/:roomId/members/:memberId
 * Owner removes a member from the room.
 */
export async function removeMember(req: AuthRequest, res: Response): Promise<void> {
  const { roomId, memberId } = req.params;
  const room = await Room.findById(roomId);
  if (!room) { res.status(404).json({ message: 'Room not found' }); return; }

  // Cannot remove the owner
  const target = room.members.find((m) => String(m.user) === memberId);
  if (!target) { res.status(404).json({ message: 'Member not found' }); return; }
  if (target.role === 'owner') {
    res.status(403).json({ message: 'Cannot remove the room owner' });
    return;
  }

  room.members = room.members.filter((m) => String(m.user) !== memberId);
  await room.save();
  res.json({ message: 'Member removed' });
}

/**
 * POST /api/rooms/:roomId/regenerate-invite
 * Owner regenerates the invite token (invalidates old invite links).
 */
export async function regenerateInvite(req: AuthRequest, res: Response): Promise<void> {
  const { v4: uuidv4Fn } = await import('uuid');
  const room = await Room.findByIdAndUpdate(
    req.params.roomId,
    { inviteToken: uuidv4Fn() },
    { new: true },
  );
  if (!room) { res.status(404).json({ message: 'Room not found' }); return; }
  res.json({ inviteToken: room.inviteToken });
}

/**
 * DELETE /api/rooms/:roomId
 * Owner deletes the room.
 */
export async function deleteRoom(req: AuthRequest, res: Response): Promise<void> {
  await Room.findByIdAndDelete(req.params.roomId);
  res.json({ message: 'Room deleted' });
}
