import { Router } from 'express';
import { authenticate, adminOnly, adminOrStrata, requireRole } from '../middleware/auth';
import * as ctrl from '../controllers/schemes.controller';

const router = Router();
router.use(authenticate);

// Strata companies (admin only)
router.get('/companies',             adminOnly, ctrl.listCompanies);
router.post('/companies',            adminOnly, ctrl.createCompany);
router.get('/companies/:id',         adminOnly, ctrl.getCompany);
router.patch('/companies/:id',       adminOnly, ctrl.updateCompany);
router.delete('/companies/:id',      adminOnly, ctrl.deleteCompany);

// Preferred trades per scheme
router.post('/:schemeId/preferred-trades',    adminOnly, ctrl.addPreferredTrade);
router.delete('/preferred-trades/:id',        adminOnly, ctrl.removePreferredTrade);

// Schemes
router.get('/',                                     adminOrStrata, ctrl.listSchemes);
router.get('/:id',                                  requireRole('admin','strata_manager','building_manager'), ctrl.getScheme);
router.post('/',                                    adminOnly, ctrl.createScheme);
router.patch('/:id',                                adminOnly, ctrl.updateScheme);
router.delete('/:id',                               adminOnly, ctrl.deleteScheme);

// Compliance obligations
router.get('/templates',                            authenticate, ctrl.listTemplates);
router.get('/:schemeId/obligations',                requireRole('admin','strata_manager','building_manager'), ctrl.listObligations);
router.post('/:schemeId/obligations/apply-templates', adminOnly, ctrl.applyTemplates);
router.post('/:schemeId/obligations',               adminOnly, ctrl.createObligation);
router.patch('/obligations/:id',                    adminOnly, ctrl.updateObligation);
router.delete('/obligations/:id',                   adminOnly, ctrl.deleteObligation);
router.get('/:schemeId/compliance-status',          requireRole('admin','strata_manager','building_manager'), ctrl.getSchemeComplianceStatus);

export default router;
