import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

/**
 * Admin guard — checks the request carries the correct ADMIN_SECRET header.
 * Set ADMIN_SECRET in server/.env to whatever password you want.
 *
 * Usage:  add requireAdmin AFTER authenticate in the router.
 *
 * Header: X-Admin-Secret: <your_secret>
 */
export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  const secret = process.env.ADMIN_SECRET;

  // If no secret is configured, admin routes are disabled entirely
  if (!secret) {
    res.status(403).json({ message: 'Admin access is not configured on this server' });
    return;
  }

  const provided = req.headers['x-admin-secret'];
  if (provided !== secret) {
    res.status(403).json({ message: 'Invalid admin secret' });
    return;
  }

  next();
}
