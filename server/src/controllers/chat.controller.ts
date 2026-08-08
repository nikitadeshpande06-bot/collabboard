import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ChatMessage } from '../models/ChatMessage';

const MAX_MESSAGES_PER_ROOM = 500;

/**
 * GET /api/rooms/:roomId/chat
 * Returns the last 100 messages for the room (most recent last).
 */
export async function getChatHistory(req: AuthRequest, res: Response): Promise<void> {
  const { roomId } = req.params;
  const messages = await ChatMessage
    .find({ room: roomId })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  // reverse so oldest first (chat display order)
  res.json(messages.reverse());
}

/**
 * POST /api/rooms/:roomId/chat  (called internally by socket, not directly by client)
 * Persists a single message and trims the collection if over MAX_MESSAGES_PER_ROOM.
 */
export async function saveChatMessage(
  roomId: string,
  userId: string,
  userName: string,
  text: string,
): Promise<void> {
  await ChatMessage.create({ room: roomId, userId, userName, text });

  // Trim to cap: delete oldest messages beyond limit
  const count = await ChatMessage.countDocuments({ room: roomId });
  if (count > MAX_MESSAGES_PER_ROOM) {
    const oldest = await ChatMessage
      .find({ room: roomId })
      .sort({ createdAt: 1 })
      .limit(count - MAX_MESSAGES_PER_ROOM)
      .select('_id')
      .lean();
    await ChatMessage.deleteMany({ _id: { $in: oldest.map((m) => m._id) } });
  }
}
