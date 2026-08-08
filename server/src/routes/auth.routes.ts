import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import passport from '../config/passport';
import {
  register, login, refresh,
  registerValidators, loginValidators,
} from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { IUser } from '../models/User';

const router = Router();

// ── Standard email/password ───────────────────────────────────────────────────
router.post('/register', registerValidators, validateRequest, register);
router.post('/login',    loginValidators,    validateRequest, login);
router.post('/refresh',  refresh);

// ── Google OAuth ──────────────────────────────────────────────────────────────
router.get('/google',
  passport.authenticate('google', { session: false, scope: ['profile', 'email'] }),
);

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL}/login?error=google_failed` }),
  oauthSuccess,
);

// ── GitHub OAuth ──────────────────────────────────────────────────────────────
router.get('/github',
  passport.authenticate('github', { session: false, scope: ['user:email'] }),
);

router.get('/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${process.env.CLIENT_URL}/login?error=github_failed` }),
  oauthSuccess,
);

/**
 * After successful OAuth, issue JWT tokens and redirect the browser to the
 * frontend with tokens as query params.  The frontend reads them, stores in
 * Zustand / localStorage, then redirects to /dashboard.
 *
 * Using query params (over cookies) keeps the app stateless and avoids
 * cross-origin cookie issues in development.
 */
function oauthSuccess(req: Request, res: Response): void {
  const user = req.user as IUser;
  const userId = String(user._id);

  const accessToken  = jwt.sign({ id: userId }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  } as jwt.SignOptions);
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  } as jwt.SignOptions);

  const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:5173';
  const params = new URLSearchParams({
    accessToken,
    refreshToken,
    userId,
    name:  user.name,
    email: user.email,
    ...(user.avatar ? { avatar: user.avatar } : {}),
  });

  res.redirect(`${clientUrl}/oauth-callback?${params.toString()}`);
}

export default router;
