import { Router } from 'express';
import { authenticate, adminOnly, tradeOnly } from '../middleware/auth';
import * as ctrl from '../controllers/trades.controller';

const router = Router();
router.use(authenticate);

router.get('/dashboard',   tradeOnly, ctrl.tradeDashboard);
router.get('/profile',     tradeOnly, ctrl.getTradeProfile);
router.get('/jobs',        tradeOnly, ctrl.getTradeJobs);
router.get('/quotes',      tradeOnly, ctrl.getTradeQuotesForPortal);
router.get('/my-history',  tradeOnly, ctrl.getTradeJobHistory);

// Admin trade management
router.get('/',            adminOnly, ctrl.listTrades);
router.get('/:id',         adminOnly, ctrl.getTrade);
router.patch('/:id',       adminOnly, ctrl.updateTrade);
router.get('/:id/history', adminOnly, ctrl.getTradeJobHistory);

export default router;
