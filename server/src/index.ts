import 'dotenv/config';
import * as path from 'path';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes';
import schemesRoutes from './routes/schemes.routes';
import jobsRoutes from './routes/jobs.routes';
import auditsRoutes from './routes/audits.routes';
import maintenanceRoutes from './routes/maintenance.routes';
import quotesRoutes from './routes/quotes.routes';
import tradesRoutes from './routes/trades.routes';
import invoicesRoutes from './routes/invoices.routes';
import schedulerRoutes from './routes/scheduler.routes';
import { startScheduler } from './services/scheduler.service';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────────────────────────
// Allow requests from the primary domain, the Vercel preview URL, and localhost.
const allowedOrigins = [
  process.env.APP_URL,                      // e.g. https://stratatrade.net
  'https://www.stratatrade.net',
  'https://strata-trade.vercel.app',        // keep working during transition
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve local file uploads in development
if (process.env.STORAGE_DRIVER !== 's3') {
  app.use('/uploads', express.static(path.resolve(__dirname, '../../uploads')));
}

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/schemes',     schemesRoutes);
app.use('/api/jobs',        jobsRoutes);
app.use('/api/audits',      auditsRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/quotes',      quotesRoutes);
app.use('/api/trades',      tradesRoutes);
app.use('/api/invoices',    invoicesRoutes);
app.use('/api/scheduler',   schedulerRoutes);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ── Error handler ───────────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`StrataTrade API running on http://localhost:${PORT}`);
  startScheduler();
});

export default app;
