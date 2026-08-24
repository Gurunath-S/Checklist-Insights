const adminInsightsService = require('../../services/insights/adminInsightsService');

const checkAdmin = async (req, res, next) => {
  try {
    const authUserId = parseInt(req.user.userId);
    const isAdmin = await adminInsightsService.checkRequesterAdmin(authUserId);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    console.error('checkAdmin error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getAdminSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const summary = await adminInsightsService.getAdminSummary(startDate, endDate);
    res.json(summary);
  } catch (error) {
    console.error('getAdminSummary error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getOrganisationDetails = async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const { startDate, endDate } = req.query;
    const details = await adminInsightsService.getOrganisationDetails(orgId, startDate, endDate);
    res.json(details);
  } catch (error) {
    console.error('getOrganisationDetails error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getOrganisationChartData = async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const { startDate, endDate, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const chartData = await adminInsightsService.getOrganisationChartData(orgId, startDate, endDate, pageNum, limitNum);
    res.json(chartData);
  } catch (error) {
    console.error('getOrganisationChartData error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getDepartmentDetails = async (req, res) => {
  try {
    const { department } = req.params;
    const { startDate, endDate } = req.query;
    const details = await adminInsightsService.getDepartmentDetails(department, startDate, endDate);
    res.json(details);
  } catch (error) {
    console.error('getDepartmentDetails error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getDepartmentUsers = async (req, res) => {
  try {
    const { department } = req.params;
    const users = await adminInsightsService.getDepartmentUsers(department);
    res.json(users);
  } catch (error) {
    console.error('getDepartmentUsers error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const excludeUserFromReports = async (req, res) => {
  try {
    const orgUserId = parseInt(req.params.id);
    const { exclude } = req.body;
    await adminInsightsService.excludeUserFromReports(orgUserId, exclude);
    res.json({ success: true, message: `User data ${exclude ? 'excluded from' : 'included in'} reporting` });
  } catch (error) {
    console.error('excludeUserFromReports error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getDepartmentChartData = async (req, res) => {
  try {
    const { department } = req.params;
    const { startDate, endDate, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const chartData = await adminInsightsService.getDepartmentChartData(department, startDate, endDate, pageNum, limitNum);
    res.json(chartData);
  } catch (error) {
    console.error('getDepartmentChartData error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getAdminUsers = async (req, res) => {
  try {
    const users = await adminInsightsService.getAdminUsers();
    res.json(users);
  } catch (error) {
    console.error('getAdminUsers error:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message,
      stack: error.stack
    });
  }
};

const getAdminUsersList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const { search, position, type } = req.query;

    const list = await adminInsightsService.getAdminUsersList(page, limit, search, position, type);
    res.json(list);
  } catch (error) {
    console.error('getAdminUsersList error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const updateAdminUser = async (req, res) => {
  try {
    const orgUserId = parseInt(req.params.id);
    const { name, user_position, user_type, organisation_id } = req.body;

    await adminInsightsService.updateAdminUser(orgUserId, { name, user_position, user_type, organisation_id });
    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('updateAdminUser error:', error);
    if (error.message === 'User not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const deleteAdminUser = async (req, res) => {
  try {
    const authUserId = parseInt(req.user.userId);
    const orgUserId = parseInt(req.params.id);

    if (orgUserId === authUserId) {
      return res.status(400).json({ error: 'You cannot disable your own admin account.' });
    }

    await adminInsightsService.deleteAdminUser(orgUserId);
    res.json({ success: true, message: 'User disabled successfully' });
  } catch (error) {
    console.error('deleteAdminUser error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const enableAdminUser = async (req, res) => {
  try {
    const orgUserId = parseInt(req.params.id);
    await adminInsightsService.enableAdminUser(orgUserId);
    res.json({ success: true, message: 'User enabled successfully' });
  } catch (error) {
    console.error('enableAdminUser error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const addErodeInternsUser = async (req, res) => {
  try {
    const { organisation_user_id } = req.body;
    if (!organisation_user_id) {
      return res.status(400).json({ error: 'organisation_user_id is required' });
    }

    await adminInsightsService.addErodeInternsUser(organisation_user_id);
    res.json({ success: true, message: 'User added to Erode Interns successfully' });
  } catch (error) {
    console.error('addErodeInternsUser error:', error);
    if (error.message === 'User not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const removeErodeInternsUser = async (req, res) => {
  try {
    const { organisation_user_id } = req.body;
    if (!organisation_user_id) {
      return res.status(400).json({ error: 'organisation_user_id is required' });
    }

    await adminInsightsService.removeErodeInternsUser(organisation_user_id);
    res.json({ success: true, message: 'User removed from Erode Interns successfully' });
  } catch (error) {
    console.error('removeErodeInternsUser error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  checkAdmin,
  getAdminSummary,
  getOrganisationDetails,
  getOrganisationChartData,
  getDepartmentDetails,
  getDepartmentUsers,
  excludeUserFromReports,
  getDepartmentChartData,
  getAdminUsers,
  getAdminUsersList,
  updateAdminUser,
  deleteAdminUser,
  enableAdminUser,
  addErodeInternsUser,
  removeErodeInternsUser
};
