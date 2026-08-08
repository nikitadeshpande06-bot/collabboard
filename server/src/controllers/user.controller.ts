import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { User } from '../models/User';
import bcrypt from 'bcryptjs';

/** GET /api/users/me */
export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  const user = await User.findById(req.user!.id);
  if (!user) { res.status(404).json({ message: 'User not found' }); return; }
  res.json(user);
}

/**
 * PATCH /api/users/me
 * Update name and/or avatar (stored as a base64 data-URL string, max 2 MB).
 */
export async function updateMe(req: AuthRequest, res: Response): Promise<void> {
  const { name, avatar } = req.body as { name?: string; avatar?: string };

  const updates: Record<string, unknown> = {};
  if (name?.trim()) updates.name = name.trim();
  if (avatar !== undefined) updates.avatar = avatar; // allow clearing with ""

  const user = await User.findByIdAndUpdate(
    req.user!.id,
    updates,
    { new: true, runValidators: true },
  );
  res.json(user);
}

/**
 * PATCH /api/users/me/password
 * Change the authenticated user's password.
 * Requires the current password for verification.
 */
export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword) {
    res.status(400).json({ message: 'currentPassword and newPassword are required' });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ message: 'New password must be at least 8 characters' });
    return;
  }

  // select: false means we must explicitly select password
  const user = await User.findById(req.user!.id).select('+password');
  if (!user) { res.status(404).json({ message: 'User not found' }); return; }

  if (!user.password) {
    res.status(400).json({ message: 'OAuth accounts cannot set a password here' });
    return;
  }

  const valid = await user.comparePassword(currentPassword);
  if (!valid) {
    res.status(401).json({ message: 'Current password is incorrect' });
    return;
  }

  const salt = await bcrypt.genSalt(12);
  user.password = await bcrypt.hash(newPassword, salt);
  // Mark as already hashed so pre-save hook doesn't double-hash
  user.markModified('password');
  // Bypass pre-save hook by using updateOne with the already-hashed password
  await User.updateOne({ _id: user._id }, { password: user.password });

  res.json({ message: 'Password changed successfully' });
}
