const express = require('express');
const authenticateToken = require('../middleware/auth');
const activityController = require('../controllers/activityController');

const router = express.Router();

// Level 1: All templates the user has submitted responses for
router.get('/templates/:userId', authenticateToken, activityController.getTemplates);

// Level 2: All unique submission days for a given user + template
router.get('/dates/:userId/:templateId', authenticateToken, activityController.getDates);

// Level 3: All item responses for a user + template on a specific submitted day
router.get('/responses/:userId/:templateId/:date', authenticateToken, activityController.getResponses);

module.exports = router;
