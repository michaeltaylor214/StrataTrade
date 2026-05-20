import { Router } from 'express';
import { authenticate, adminOnly, strataOnly, tradeOnly, requireRole } from '../middleware/auth';
import * as ctrl from '../controllers/quotes.controller';

const router = Router();

// Token-based (no auth required) — trade submits quote via email link
router.post('/submit/:token', ctrl.submitQuoteByToken);

router.use(authenticate);

router.get('/',                        requireRole('admin','strata_manager'), ctrl.listQuoteRequests);
// Trade submits from portal (must be before /:id)
router.post('/authenticated',          tradeOnly, ctrl.submitQuoteAuthenticated);
router.get('/:id',                     requireRole('admin','strata_manager','trade'), ctrl.getQuoteRequest);
router.post('/',                       adminOnly, ctrl.createQuoteRequest);
router.patch('/:id/ready-for-review',  adminOnly, ctrl.markReadyForReview);
router.post('/:quoteId/accept',        requireRole('admin','strata_manager'), ctrl.acceptQuote);

export default router;
