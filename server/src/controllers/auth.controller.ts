import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { body } from 'express-validator';
import { User } from '../models/User';

// ── Helpers ───────────────────────────────────────────────────────────────────
function signAccess(userId: string): string {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  } as jwt.SignOptions);
}

function signRefresh(userId: string): string {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  } as jwt.SignOptions);
}

// ── Validation chains (re-exported for use in router) ─────────────────────────
export const registerValidators = [
  body('name').trim().notEmpty().isLength({ max: 80 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
];

export const loginValidators = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Create a new user account and return tokens.
 */
export async function register(req: Request, res: Response): Promise<void> {
  const { name, email, password } = req.body;

  const exists = await User.findOne({ email });
  if (exists) {
    res.status(409).json({ message: 'Email already registered' });
    return;
  }

  const user = await User.create({ name, email, password });
  const accessToken  = signAccess(String(user._id));
  const refreshToken = signRefresh(String(user._id));

  res.status(201).json({ accessToken, refreshToken, user });
}

/**
 * POST /api/auth/login
 * Verify credentials and return fresh tokens.
 */
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    res.status(401).json({ message: 'Invalid email or password' });
    return;
  }

  const accessToken  = signAccess(String(user._id));
  const refreshToken = signRefresh(String(user._id));

  res.json({ accessToken, refreshToken, user });
}

/**
 * POST /api/auth/refresh
 * Exchange a valid refresh token for a new access token.
 */
export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ message: 'Refresh token required' });
    return;
  }

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { id: string };
    const accessToken = signAccess(payload.id);
    res.json({ accessToken });
  } catch {
    res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
}
