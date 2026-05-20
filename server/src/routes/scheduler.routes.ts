import { Router, Request, Response } from 'express';
import { authenticate, adminOnly } from '../middleware/auth';
import { runDailyComplianceCheck } from '../services/scheduler.service';

const router = Router();
router.use(authenticate, adminOnly);

/** Manual trigger for testing — fires the daily compliance check immediately. */
router.post('/trigger', async (req: Request, res: Response): Promise<void> => {
  console.log('[scheduler] Manual trigger invoked by admin');
  const result = await runDailyComplianceCheck();
  res.json({ message: 'Compliance check complete', ...result });
});

export default router;
