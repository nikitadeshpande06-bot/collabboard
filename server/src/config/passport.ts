import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { User } from '../models/User';
import { logger } from '../utils/logger';

/**
 * Passport OAuth setup.
 *
 * Both Google and GitHub strategies:
 *  1. Receive the profile from the provider.
 *  2. Find-or-create a User document in MongoDB (no password needed for OAuth users).
 *  3. Return the user — the auth controller will then issue a JWT pair.
 *
 * Set these in server/.env:
 *   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
 *   GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET
 *   OAUTH_CALLBACK_BASE  (e.g. http://localhost:4000)
 */

const callbackBase = process.env.OAUTH_CALLBACK_BASE ?? 'http://localhost:4000';

// ── Google ────────────────────────────────────────────────────────────────────
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID:     process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:  `${callbackBase}/api/auth/google/callback`,
        scope: ['profile', 'email'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error('No email from Google'));

          let user = await User.findOne({ email });
          if (!user) {
            user = await User.create({
              name:     profile.displayName || email.split('@')[0],
              email,
              password: `oauth_google_${profile.id}`,
              avatar:   profile.photos?.[0]?.value,
            });
            logger.info(`New user via Google: ${email}`);
          }
          done(null, user as unknown as Express.User);
        } catch (err) {
          done(err as Error);
        }
      },
    ),
  );
  logger.info('✅ Google OAuth strategy registered');
} else {
  logger.warn('⚠️  GOOGLE_CLIENT_ID / SECRET not set — Google OAuth disabled');
}

// ── GitHub ────────────────────────────────────────────────────────────────────
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID:     process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL:  `${callbackBase}/api/auth/github/callback`,
        scope: ['user:email'],
      },
      async (_accessToken: string, _refreshToken: string, profile: any, done: (err: any, user?: any) => void) => {
        try {
          // GitHub may return multiple emails; prefer primary+verified
          const emails: { value: string; primary?: boolean; verified?: boolean }[] =
            profile.emails ?? [];
          const email =
            emails.find((e) => e.primary && e.verified)?.value ??
            emails[0]?.value;

          if (!email) return done(new Error('No email from GitHub'));

          let user = await User.findOne({ email });
          if (!user) {
            user = await User.create({
              name:     profile.displayName || profile.username || email.split('@')[0],
              email,
              password: `oauth_github_${profile.id}`,
              avatar:   profile.photos?.[0]?.value,
            });
            logger.info(`New user via GitHub: ${email}`);
          }
          done(null, user as unknown as Express.User);
        } catch (err) {
          done(err as Error);
        }
      },
    ),
  );
  logger.info('✅ GitHub OAuth strategy registered');
} else {
  logger.warn('⚠️  GITHUB_CLIENT_ID / SECRET not set — GitHub OAuth disabled');
}

export default passport;
