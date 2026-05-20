import { Router } from 'express';
import { authenticate, adminOnly } from '../middleware/auth';
import * as ctrl from '../controllers/invoices.controller';

const router = Router();
router.use(authenticate, adminOnly);

router.get('/',        ctrl.listInvoices);
router.get('/export',  ctrl.exportInvoicesCsv);
router.get('/:id',     ctrl.getInvoice);
router.post('/',       ctrl.createOrUpdateInvoice);
router.patch('/:id',   ctrl.updateInvoice);

export default router;
