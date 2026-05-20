import { Router } from 'express';
import multer from 'multer';
import { authenticate, adminOnly, tradeOnly, requireRole } from '../middleware/auth';
import * as ctrl from '../controllers/jobs.controller';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

// Token-based (no auth required)
router.get('/confirm/:token',    ctrl.confirmJob);
router.post('/reschedule/:token', ctrl.requestReschedule);

// Authenticated routes
router.use(authenticate);

router.get('/dashboard/admin',   adminOnly, ctrl.adminDashboard);
router.get('/',                  requireRole('admin','strata_manager','building_manager','trade'), ctrl.listJobs);
router.get('/:id',               requireRole('admin','strata_manager','building_manager','trade'), ctrl.getJob);
router.post('/',                 adminOnly, ctrl.createJob);
router.patch('/:id/assign',      adminOnly, ctrl.assignTrade);
router.patch('/:id/cancel',      adminOnly, ctrl.cancelJob);

// Document management
router.get('/:id/documents',     requireRole('admin','strata_manager','building_manager','trade'), ctrl.listJobDocuments);
router.post('/:id/upload',       tradeOnly,
  upload.fields([
    { name: 'certificate', maxCount: 1 },
    { name: 'photos', maxCount: 10 },
  ]),
  ctrl.uploadJobDocuments
);
router.patch('/documents/:docId/approve', adminOnly, ctrl.approveDocument);
router.patch('/documents/:docId/reject',  adminOnly, ctrl.rejectDocument);

export default router;
