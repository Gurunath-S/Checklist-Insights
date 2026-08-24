const kpiNetworkInsightsService = require('../../services/insights/kpiNetworkInsightsService');
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

const getAdminTemplateTree = async (req, res) => {
  try {
    const data = await kpiNetworkInsightsService.getAdminTemplateTree();
    res.json(data);
  } catch (error) {
    console.error('getAdminTemplateTree error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};

const updateAdminTemplate = async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const { tag_id, priority, owner_id } = req.body;

    await kpiNetworkInsightsService.updateAdminTemplate(templateId, { tag_id, priority, owner_id });
    res.json({ success: true, message: 'Template updated successfully' });
  } catch (error) {
    console.error('updateAdminTemplate error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};

const deleteAdminTemplate = async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    await kpiNetworkInsightsService.deleteAdminTemplate(templateId);
    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    console.error('deleteAdminTemplate error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};

const updateAdminTag = async (req, res) => {
  try {
    const tagId = parseInt(req.params.id);
    const { recurrent, tag_name } = req.body;

    await kpiNetworkInsightsService.updateAdminTag(tagId, { recurrent, tag_name });
    res.json({ success: true, message: 'Tag updated successfully' });
  } catch (error) {
    console.error('updateAdminTag error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};

const deleteAdminTag = async (req, res) => {
  try {
    const tagId = parseInt(req.params.id);
    await kpiNetworkInsightsService.deleteAdminTag(tagId);
    res.json({ success: true, message: 'Tag deleted — all connected templates are now unconnected' });
  } catch (error) {
    console.error('deleteAdminTag error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};

const createAdminTag = async (req, res) => {
  try {
    const authUserId = parseInt(req.user.userId);
    const { tag_name, description, user_position, recurrent } = req.body;

    const newTag = await kpiNetworkInsightsService.createAdminTag(authUserId, { tag_name, description, user_position, recurrent });
    res.json({ success: true, tag: newTag });
  } catch (error) {
    console.error('createAdminTag error:', error);
    if (error.message === 'Tag name already exists') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};

const getKpiNetwork = async (req, res) => {
  try {
    const data = await kpiNetworkInsightsService.getKpiNetwork();
    res.json(data);
  } catch (error) {
    console.error('getKpiNetwork error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};

const createKpiLink = async (req, res) => {
  try {
    const { parent_item_id, child_item_id } = req.body;
    if (!parent_item_id || !child_item_id) {
      return res.status(400).json({ error: 'parent_item_id and child_item_id are required' });
    }
    if (Number(parent_item_id) === Number(child_item_id)) {
      return res.status(400).json({ error: 'An item cannot be linked to itself' });
    }

    const link = await kpiNetworkInsightsService.createKpiLink(parent_item_id, child_item_id);
    res.json({ success: true, link });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'This relationship already exists' });
    }
    console.error('createKpiLink error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};

const deleteKpiLink = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await kpiNetworkInsightsService.deleteKpiLink(id);
    res.json({ success: true });
  } catch (error) {
    console.error('deleteKpiLink error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};

const updateKpiConfig = async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    const { aggregation } = req.body;
    if (!['Daily', 'Weekly', 'Monthly', 'Quarterly'].includes(aggregation)) {
      return res.status(400).json({ error: 'Invalid aggregation value' });
    }

    const config = await kpiNetworkInsightsService.updateKpiConfig(itemId, aggregation);
    res.json({ success: true, config });
  } catch (error) {
    console.error('updateKpiConfig error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};

const getItemAnalytics = async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    const { aggregation = 'Monthly' } = req.query;

    const data = await kpiNetworkInsightsService.getItemAnalytics(itemId, aggregation);
    if (!data) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('getItemAnalytics error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};

module.exports = {
  checkAdmin,
  getAdminTemplateTree,
  updateAdminTemplate,
  deleteAdminTemplate,
  updateAdminTag,
  deleteAdminTag,
  createAdminTag,
  getKpiNetwork,
  createKpiLink,
  deleteKpiLink,
  updateKpiConfig,
  getItemAnalytics
};
