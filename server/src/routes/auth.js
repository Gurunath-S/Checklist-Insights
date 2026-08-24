const express = require('express');
const authenticateToken = require('../middleware/auth');
const authController = require('../controllers/authController');

const router = express.Router();

// Auth Route (Google)
router.post('/google', authController.googleLogin);

// Microsoft Auth Route
router.post('/microsoft', authController.microsoftLogin);

// Verify Session Route
router.get('/verify', authenticateToken, authController.verifySession);

module.exports = router;
