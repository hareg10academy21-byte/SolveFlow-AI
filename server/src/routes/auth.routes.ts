import { Router } from 'express';
import {
  currentUser,
  login,
  logout,
  register,
  setupAdmin,
  updateProfile,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();
router.post('/register', register);
router.post('/login', login);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, currentUser);
router.patch('/me', requireAuth, updateProfile);
router.post('/setup-admin', setupAdmin);
export default router;
