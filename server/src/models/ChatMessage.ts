import mongoose, { Document, Schema } from 'mongoose';

/**
 * ChatMessage — persisted room chat messages.
 * Stored in MongoDB so history loads when users rejoin.
 * Capped at 500 messages per room via application-level trimming.
 */
export interface IChatMessage extends Document {
  room:      mongoose.Types.ObjectId;
  userId:    string;
  userName:  string;
  text:      string;
  createdAt: Date;
}

const chatMessageSchema = new Schema<IChatMessage>(
  {
    room:     { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    userId:   { type: String, required: true },
    userName: { type: String, required: true },
    text:     { type: String, required: true, maxlength: 2000, trim: true },
  },
  { timestamps: true },
);

export const ChatMessage = mongoose.model<IChatMessage>('ChatMessage', chatMessageSchema);
