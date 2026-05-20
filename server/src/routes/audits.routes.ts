import { Router } from 'express';
import multer from 'multer';
import { authenticate, adminOnly, requireRole } from '../middleware/auth';
import * as ctrl from '../controllers/audits.controller';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();
router.use(authenticate);

router.get('/',                  requireRole('admin','strata_manager'), ctrl.listAudits);
router.get('/:id',               requireRole('admin','strata_manager'), ctrl.getAudit);
router.post('/',                 adminOnly, ctrl.createAudit);
router.patch('/:id',             adminOnly, ctrl.updateAudit);

// Findings
router.post('/:auditId/findings',        adminOnly, upload.array('photos', 5), ctrl.createFinding);
router.patch('/findings/:id',            adminOnly, ctrl.updateFinding);
router.delete('/findings/:id',           adminOnly, ctrl.deleteFinding);

// Rectification panel per scheme
router.get('/schemes/:schemeId/rectification', requireRole('admin','strata_manager'), ctrl.listRectificationFindings);

export default router;
