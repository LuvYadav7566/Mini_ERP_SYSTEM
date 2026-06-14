import express from 'express';
import AuditLog from '../models/AuditLog.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// @desc    Get all audit logs
// @route   GET /api/v1/audit-logs
// @access  Private
router.get('/', protect, async (req, res, next) => {
  try {
    const logs = await AuditLog.find({})
      .populate('user', 'username role')
      .sort({ createdAt: -1 });
    res.json(logs);
  } catch (error) {
    next(error);
  }
});

export default router;
