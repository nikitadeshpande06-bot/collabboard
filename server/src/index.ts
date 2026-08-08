import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import passport from './config/passport';

import { connectDB } from './config/database';
import { connectRedis } from './config/redis';
import { initSocket } from './socket';
import { logger } from './utils/logger';

import authRouter    from './routes/auth.routes';
import userRouter    from './routes/user.routes';
import roomRouter    from './routes/room.routes';
import versionRouter from './routes/version.routes';
import adminRouter   from './routes/admin.routes';
import chatRouter    from './routes/chat.routes';

const app = express();
const httpServer = http.createServer(app);

// ── Security & Utility Middleware ─────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));
app.use(passport.initialize());

// Global rate limiter (100 req / 15 min per IP)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',     authRouter);
app.use('/api/users',    userRouter);
app.use('/api/rooms',    roomRouter);
app.use('/api/rooms',    chatRouter);   // chat nested under rooms
app.use('/api/versions', versionRouter);
app.use('/api/admin',    adminRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ── 404 & Global Error Handler ────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(err.message, { stack: err.stack });
  res.status(500).json({ message: 'Internal server error' });
});

// ── Boot ──────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? '4000', 10);

async function bootstrap() {
  await connectDB();
  await connectRedis();
  await initSocket(httpServer);
  httpServer.listen(PORT, () => {
    logger.info(`🚀 Server running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  logger.error('Bootstrap failed', err);
  process.exit(1);
});

export { app, httpServer };
