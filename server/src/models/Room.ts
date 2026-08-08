import mongoose, { Document, Schema } from 'mongoose';

export type RoomRole = 'owner' | 'editor' | 'viewer';

export interface IRoomMember {
  user: mongoose.Types.ObjectId;
  role: RoomRole;
  joinedAt: Date;
}

export interface IRoom extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  /** Fabric.js canvas JSON snapshot (latest state) */
  canvasData: string;
  members: IRoomMember[];
  inviteToken: string;
  isPublic: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const roomMemberSchema = new Schema<IRoomMember>(
  {
    user:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role:     { type: String, enum: ['owner', 'editor', 'viewer'], default: 'editor' },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const roomSchema = new Schema<IRoom>(
  {
    name:        { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, maxlength: 500 },
    canvasData:  { type: String, default: '{}' },
    members:     [roomMemberSchema],
    inviteToken: { type: String, required: true, unique: true },
    isPublic:    { type: Boolean, default: false },
    createdBy:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

export const Room = mongoose.model<IRoom>('Room', roomSchema);
