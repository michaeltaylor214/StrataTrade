import { Router } from 'express';
import multer from 'multer';
import { authenticate, adminOnly, requireRole } from '../middleware/auth';
import * as ctrl from '../controllers/maintenance.controller';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();
router.use(authenticate);

router.get('/',      requireRole('admin','strata_manager','building_manager'), ctrl.listRequests);
router.get('/:id',   requireRole('admin','strata_manager','building_manager'), ctrl.getRequest);
router.post('/',     requireRole('strata_manager','building_manager'), upload.array('photos', 5), ctrl.createRequest);
router.patch('/:id/respond', adminOnly, ctrl.respondToRequest);

export default router;
