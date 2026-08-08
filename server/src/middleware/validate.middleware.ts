import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

/**
 * Runs after express-validator chains.
 * Returns 422 with an array of field errors if any exist.
 */
export function validateRequest(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ errors: errors.array() });
    return;
  }
  next();
}
