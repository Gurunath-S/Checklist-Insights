const personalInsightsService = require('../../services/insights/personalInsightsService');

const getPersonalInsights = async (req, res) => {
  const userId = parseInt(req.params.userId);
  const authUserId = parseInt(req.user.userId);

  try {
    const isAuthorized = await personalInsightsService.checkRequesterAuthorized(authUserId, userId);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Unauthorized access to data' });
    }

    const { startDate, endDate } = req.query;
    const result = await personalInsightsService.getPersonalInsights(userId, startDate, endDate);
    res.json(result);
  } catch (error) {
    console.error('personalInsightsController.getPersonalInsights error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getPersonalChartData = async (req, res) => {
  const userId = parseInt(req.params.userId);
  const authUserId = parseInt(req.user.userId);

  try {
    const isAuthorized = await personalInsightsService.checkRequesterAuthorized(authUserId, userId);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Unauthorized access to data' });
    }

    const { startDate, endDate, page = 1, limit = 10 } = req.query;
    const result = await personalInsightsService.getPersonalChartData(userId, startDate, endDate, parseInt(page), parseInt(limit));
    res.json(result);
  } catch (error) {
    console.error('personalInsightsController.getPersonalChartData error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  getPersonalInsights,
  getPersonalChartData
};
