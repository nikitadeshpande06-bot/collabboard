import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

export interface AuthRequest extends Request {
  user?: { id: string; name: string; email: string };
}

/**
 * Verifies the Bearer JWT in the Authorization header.
 * Attaches decoded user payload to req.user.
 */
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'No token provided' });
    return;
  }

  const token = header.slice(7);
  try {
    const secret = process.env.JWT_SECRET!;
    const payload = jwt.verify(token, secret) as { id: string };
    const user = await User.findById(payload.id).lean();
    if (!user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }
    req.user = { id: String(user._id), name: user.name, email: user.email };
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}
