const express = require('express');
const rateLimit = require('express-rate-limit');
const authenticateToken = require('../middleware/auth');
const authController = require('../controllers/authController');

const router = express.Router();

// Rate limiter for authentication endpoints: max 15 requests per 15 mins per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'Too many authentication attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth Routes
router.post('/google', authLimiter, authController.googleLogin);
router.post('/microsoft', authLimiter, authController.microsoftLogin);
router.post('/refresh', authLimiter, authController.refreshSession);
router.post('/logout', authController.logout);
router.post('/logout-all', authenticateToken, authController.logoutAll);
router.get('/verify', authenticateToken, authController.verifySession);

module.exports = router;
