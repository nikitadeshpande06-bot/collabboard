import mongoose, { Document, Schema } from 'mongoose';

/**
 * A version snapshot is saved whenever the user explicitly saves
 * or when an auto-save threshold is crossed (every N operations).
 */
export interface IVersion extends Document {
  _id: mongoose.Types.ObjectId;
  room: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  /** Full Fabric.js JSON of the canvas at this point in time */
  canvasData: string;
  /** Human-readable label */
  label: string;
  /** Sequential version number within a room */
  versionNumber: number;
  createdAt: Date;
}

const versionSchema = new Schema<IVersion>(
  {
    room:          { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    createdBy:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    canvasData:    { type: String, required: true },
    label:         { type: String, default: 'Auto-save' },
    versionNumber: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Ensure version numbers are unique per room
versionSchema.index({ room: 1, versionNumber: 1 }, { unique: true });

export const Version = mongoose.model<IVersion>('Version', versionSchema);
