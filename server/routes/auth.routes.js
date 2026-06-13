import express from 'express';
import { login, register, getMe, getUsers } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { checkRoles } from '../middleware/role.middleware.js';

const router = express.Router();

router.post('/login', login);
router.post('/register', protect, checkRoles('Admin'), register);
router.get('/me', protect, getMe);
router.get('/users', protect, checkRoles('Admin', 'Business Owner'), getUsers);

export default router;
