import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name:     { type: String, required: true, trim: true, maxlength: 80 },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Optional for OAuth users — they authenticate via provider, not password
    password: { type: String, minlength: 8, select: false },
    avatar:   { type: String },
  },
  { timestamps: true },
);

// Hash password before saving (skip if it's an OAuth placeholder or unchanged)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method — compare plain-text vs hash
userSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  if (!this.password) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.password);
};

// Never expose password in JSON responses
userSchema.set('toJSON', {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform(_doc: any, ret: any) {
    delete ret.password;
    return ret;
  },
});

export const User = mongoose.model<IUser>('User', userSchema);
