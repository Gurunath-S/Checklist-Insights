const reportsInsightsService = require('../../services/insights/reportsInsightsService');
const adminInsightsService = require('../../services/insights/adminInsightsService');
const prisma = require('../../config/prisma');

const checkAdmin = async (req, res, next) => {
  try {
    const authUserId = parseInt(req.user.userId);
    const isAdmin = await adminInsightsService.checkRequesterAdmin(authUserId);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  } catch (error) {
    console.error('checkAdmin error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getReports = async (req, res) => {
  try {
    const authUserId = parseInt(req.user.userId);
    const requester = await prisma.organisation_Users.findUnique({
      where: { id: authUserId },
      select: { 
        user_type: true,
        User: { select: { email: true } }
      }
    });
    
    const isRequesterAdmin = 
      requester?.user_type?.trim() === 'ADMIN' || 
      requester?.User?.email === 'gururider35@gmail.com';

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const { search, position, startDate, endDate } = req.query;

    const data = await reportsInsightsService.getReports(authUserId, isRequesterAdmin, { page, limit, search, position, startDate, endDate });
    res.json(data);
  } catch (error) {
    console.error('getReports error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getReportDetail = async (req, res) => {
  try {
    const authUserId = parseInt(req.user.userId);
    const { userId, templateId, date } = req.query;
    
    const targetUserId = parseInt(userId);
    const targetTemplateId = parseInt(templateId);

    const requester = await prisma.organisation_Users.findUnique({
      where: { id: authUserId },
      select: { 
        user_type: true,
        User: { select: { email: true } }
      }
    });
    
    const isRequesterAdmin = 
      requester?.user_type?.trim() === 'ADMIN' || 
      requester?.User?.email === 'gururider35@gmail.com';

    if (authUserId !== targetUserId && !isRequesterAdmin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const detail = await reportsInsightsService.getReportDetail(targetUserId, targetTemplateId, date);
    res.json(detail);
  } catch (error) {
    console.error('getReportDetail error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getDepartmentReports = async (req, res) => {
  try {
    const { startDate, endDate, search, page = 1, limit = 15 } = req.query;
    const data = await reportsInsightsService.getDepartmentReports({ startDate, endDate, search, page, limit });
    res.json(data);
  } catch (error) {
    console.error('getDepartmentReports error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getTemplateReports = async (req, res) => {
  try {
    const { startDate, endDate, search, page = 1, limit = 15 } = req.query;
    const data = await reportsInsightsService.getTemplateReports({ startDate, endDate, search, page, limit });
    res.json(data);
  } catch (error) {
    console.error('getTemplateReports error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getTagReports = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const data = await reportsInsightsService.getTagReports({ startDate, endDate });
    res.json(data);
  } catch (error) {
    console.error('getTagReports error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getUserReports = async (req, res) => {
  try {
    const { startDate, endDate, search, page = 1, limit = 15 } = req.query;
    const data = await reportsInsightsService.getUserReports({ startDate, endDate, search, page, limit });
    res.json(data);
  } catch (error) {
    console.error('getUserReports error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getChecklistItemsList = async (req, res) => {
  try {
    const authUserId = parseInt(req.user.userId);
    const requester = await prisma.organisation_Users.findUnique({
      where: { id: authUserId },
      select: { user_type: true, organisation_id: true }
    });

    if (!requester) {
      return res.status(403).json({ error: 'User not found in organisation' });
    }

    const isAdmin = requester.user_type?.trim() === 'ADMIN';
    const { department, userId } = req.query;
    const targetUserId = userId ? parseInt(userId) : null;

    const list = await reportsInsightsService.getChecklistItemsList(authUserId, requester.organisation_id, isAdmin, department, targetUserId);
    res.json(list);
  } catch (error) {
    console.error('getChecklistItemsList error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getChecklistItemHistory = async (req, res) => {
  try {
    const authUserId = parseInt(req.user.userId);
    const { itemName, startDate, endDate, groupBy = 'day', targetUserId, targetDepartment } = req.query;

    if (!itemName) {
      return res.status(400).json({ error: 'itemName query parameter is required' });
    }

    const requester = await prisma.organisation_Users.findUnique({
      where: { id: authUserId },
      select: { 
        user_type: true,
        organisation_id: true,
        User: { select: { email: true } }
      }
    });

    const isRequesterAdmin = 
      requester?.user_type?.trim() === 'ADMIN' || 
      requester?.User?.email === 'gururider35@gmail.com';

    const history = await reportsInsightsService.getChecklistItemHistory(authUserId, requester.organisation_id, isRequesterAdmin, {
      itemName,
      startDate,
      endDate,
      groupBy,
      targetUserId,
      targetDepartment
    });

    res.json(history);
  } catch (error) {
    console.error('getChecklistItemHistory error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  checkAdmin,
  getReports,
  getReportDetail,
  getDepartmentReports,
  getTemplateReports,
  getTagReports,
  getUserReports,
  getChecklistItemsList,
  getChecklistItemHistory
};
