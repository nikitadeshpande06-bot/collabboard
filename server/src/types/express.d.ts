/**
 * Extend Express's global Request type so that req.user set by Passport's
 * `done(null, user)` callback is compatible with the AuthRequest interface
 * used throughout this project.
 *
 * Without this, TypeScript sees a conflict between Passport's req.user and
 * our custom { id, name, email } shape.
 */
declare global {
  namespace Express {
    // Merge with Passport's User — our controllers always narrow via AuthRequest
    interface User {
      id:    string;
      name:  string;
      email: string;
    }
  }
}

export {};
