const express = require('express');
const authenticateToken = require('../middleware/auth');

const personalInsightsController = require('../controllers/insights/personalInsightsController');
const adminInsightsController = require('../controllers/insights/adminInsightsController');
const reportsInsightsController = require('../controllers/insights/reportsInsightsController');
const kpiNetworkInsightsController = require('../controllers/insights/kpiNetworkInsightsController');

const router = express.Router();

// --- Personal Insights ---
router.get('/personal/:userId', authenticateToken, personalInsightsController.getPersonalInsights);
router.get('/personal/:userId/chart-data', authenticateToken, personalInsightsController.getPersonalChartData);

// --- Admin Insights ---
router.get('/admin/summary', authenticateToken, adminInsightsController.checkAdmin, adminInsightsController.getAdminSummary);
router.get('/admin/organisation/:orgId', authenticateToken, adminInsightsController.checkAdmin, adminInsightsController.getOrganisationDetails);
router.get('/admin/organisation/:orgId/chart-data', authenticateToken, adminInsightsController.checkAdmin, adminInsightsController.getOrganisationChartData);
router.get('/admin/department/:department', authenticateToken, adminInsightsController.checkAdmin, adminInsightsController.getDepartmentDetails);
router.get('/admin/department/:department/users', authenticateToken, adminInsightsController.checkAdmin, adminInsightsController.getDepartmentUsers);
router.put('/admin/users/:id/exclude', authenticateToken, adminInsightsController.checkAdmin, adminInsightsController.excludeUserFromReports);
router.get('/admin/department/:department/chart-data', authenticateToken, adminInsightsController.checkAdmin, adminInsightsController.getDepartmentChartData);
router.get('/admin/users', authenticateToken, adminInsightsController.checkAdmin, adminInsightsController.getAdminUsers);
router.get('/admin/users-list', authenticateToken, adminInsightsController.checkAdmin, adminInsightsController.getAdminUsersList);
router.put('/admin/users/:id', authenticateToken, adminInsightsController.checkAdmin, adminInsightsController.updateAdminUser);
router.delete('/admin/users/:id', authenticateToken, adminInsightsController.checkAdmin, adminInsightsController.deleteAdminUser);
router.put('/admin/users/:id/enable', authenticateToken, adminInsightsController.checkAdmin, adminInsightsController.enableAdminUser);
router.post('/admin/department/erode-interns/add-user', authenticateToken, adminInsightsController.checkAdmin, adminInsightsController.addErodeInternsUser);
router.post('/admin/department/erode-interns/remove-user', authenticateToken, adminInsightsController.checkAdmin, adminInsightsController.removeErodeInternsUser);

// --- Reports & Checklist Items ---
router.get('/reports', authenticateToken, reportsInsightsController.getReports);
router.get('/reports/detail', authenticateToken, reportsInsightsController.getReportDetail);
router.get('/reports/departments', authenticateToken, reportsInsightsController.checkAdmin, reportsInsightsController.getDepartmentReports);
router.get('/reports/templates', authenticateToken, reportsInsightsController.checkAdmin, reportsInsightsController.getTemplateReports);
router.get('/reports/tags', authenticateToken, reportsInsightsController.checkAdmin, reportsInsightsController.getTagReports);
router.get('/reports/users', authenticateToken, reportsInsightsController.checkAdmin, reportsInsightsController.getUserReports);
router.get('/checklist-items/list', authenticateToken, reportsInsightsController.getChecklistItemsList);
router.get('/checklist-items/history', authenticateToken, reportsInsightsController.getChecklistItemHistory);

// --- KPI Network, Templates & Tags ---
router.get('/admin/template-tree', authenticateToken, kpiNetworkInsightsController.checkAdmin, kpiNetworkInsightsController.getAdminTemplateTree);
router.put('/admin/template/:id', authenticateToken, kpiNetworkInsightsController.checkAdmin, kpiNetworkInsightsController.updateAdminTemplate);
router.delete('/admin/template/:id', authenticateToken, kpiNetworkInsightsController.checkAdmin, kpiNetworkInsightsController.deleteAdminTemplate);
router.put('/admin/tag/:id', authenticateToken, kpiNetworkInsightsController.checkAdmin, kpiNetworkInsightsController.updateAdminTag);
router.delete('/admin/tag/:id', authenticateToken, kpiNetworkInsightsController.checkAdmin, kpiNetworkInsightsController.deleteAdminTag);
router.post('/admin/tag', authenticateToken, kpiNetworkInsightsController.checkAdmin, kpiNetworkInsightsController.createAdminTag);
router.get('/admin/kpi-network', authenticateToken, kpiNetworkInsightsController.checkAdmin, kpiNetworkInsightsController.getKpiNetwork);
router.post('/admin/kpi-network/link', authenticateToken, kpiNetworkInsightsController.checkAdmin, kpiNetworkInsightsController.createKpiLink);
router.delete('/admin/kpi-network/link/:id', authenticateToken, kpiNetworkInsightsController.checkAdmin, kpiNetworkInsightsController.deleteKpiLink);
router.put('/admin/kpi-network/item/:itemId/config', authenticateToken, kpiNetworkInsightsController.checkAdmin, kpiNetworkInsightsController.updateKpiConfig);
router.get('/item/:itemId/analytics', authenticateToken, kpiNetworkInsightsController.getItemAnalytics);

module.exports = router;
