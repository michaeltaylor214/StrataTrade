import { Router } from 'express';
import {
  login,
  registerTrade,
  registerStrataManager,
  requestPasswordReset,
  resetPassword,
  changePassword,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/login',                 login);
router.post('/register/trade',        registerTrade);
router.post('/register/strata',       registerStrataManager);
router.post('/password/request-reset',requestPasswordReset);
router.post('/password/reset',        resetPassword);
router.post('/password/change',       authenticate, changePassword);

export default router;
