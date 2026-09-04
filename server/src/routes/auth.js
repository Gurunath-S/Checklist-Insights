const express = require('express');
const rateLimit = require('express-rate-limit');
const authenticateToken = require('../middleware/auth');
const authController = require('../controllers/authController');

const router = express.Router();

// Rate limiter for authentication login endpoints: max 30 requests per 15 mins per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Generous rate limiter for session refresh: max 300 requests per 15 mins per IP
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'Too many session refresh attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth Routes
router.post('/google', loginLimiter, authController.googleLogin);
router.post('/microsoft', loginLimiter, authController.microsoftLogin);
router.post('/refresh', refreshLimiter, authController.refreshSession);
router.post('/logout', authController.logout);
router.post('/logout-all', authenticateToken, authController.logoutAll);
router.get('/verify', authenticateToken, authController.verifySession);

module.exports = router;
