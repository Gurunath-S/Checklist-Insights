const activityService = require('../services/activityService');

const getTemplates = async (req, res) => {
  const userId = parseInt(req.params.userId);
  const authUserId = parseInt(req.user.userId);

  try {
    const isAuthorized = await activityService.checkRequesterAuthorized(authUserId, userId);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { page = 1, limit = 5, startDate, endDate } = req.query;
    const result = await activityService.getTemplates(userId, parseInt(page), parseInt(limit), startDate, endDate);
    res.json(result);
  } catch (error) {
    console.error('activityController.getTemplates error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getDates = async (req, res) => {
  const userId = parseInt(req.params.userId);
  const templateId = parseInt(req.params.templateId);
  const authUserId = parseInt(req.user.userId);

  try {
    const isAuthorized = await activityService.checkRequesterAuthorized(authUserId, userId);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { page = 1, limit = 5, startDate, endDate } = req.query;
    const result = await activityService.getDates(userId, templateId, parseInt(page), parseInt(limit), startDate, endDate);
    res.json(result);
  } catch (error) {
    console.error('activityController.getDates error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getResponses = async (req, res) => {
  const userId = parseInt(req.params.userId);
  const templateId = parseInt(req.params.templateId);
  const date = req.params.date;
  const authUserId = parseInt(req.user.userId);

  try {
    const isAuthorized = await activityService.checkRequesterAuthorized(authUserId, userId);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await activityService.getResponses(userId, templateId, date);
    res.json(result);
  } catch (error) {
    console.error('activityController.getResponses error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  getTemplates,
  getDates,
  getResponses
};
