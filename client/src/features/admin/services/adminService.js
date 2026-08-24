import apiClient from '../../../services/apiClient';

// User Management
export const getAdminUsersApi = async (params) => {
  const response = await apiClient.get('/insights/admin/users', { params });
  return response.data;
};

export const getAdminUsersListApi = async (url) => {
  const response = await apiClient.get(url);
  return response.data;
};

export const getAdminSummaryApi = async () => {
  const response = await apiClient.get('/insights/admin/summary');
  return response.data;
};

export const updateAdminUserApi = async (userId, fields) => {
  const response = await apiClient.put(`/insights/admin/users/${userId}`, fields);
  return response.data;
};

export const deleteAdminUserApi = async (userId) => {
  const response = await apiClient.delete(`/insights/admin/users/${userId}`);
  return response.data;
};

export const enableAdminUserApi = async (userId) => {
  const response = await apiClient.put(`/insights/admin/users/${userId}/enable`);
  return response.data;
};

// Templates & Tags
export const getTemplateTreeApi = async () => {
  const response = await apiClient.get('/insights/admin/template-tree');
  return response.data;
};

export const updateTemplateApi = async (templateId, fields) => {
  const response = await apiClient.put(`/insights/admin/template/${templateId}`, fields);
  return response.data;
};

export const deleteTemplateTagApi = async (tagId) => {
  const response = await apiClient.delete(`/insights/admin/tag/${tagId}`);
  return response.data;
};

export const updateTemplateTagApi = async (tagId, fields) => {
  const response = await apiClient.put(`/insights/admin/tag/${tagId}`, fields);
  return response.data;
};

export const createTemplateTagApi = async (fields) => {
  const response = await apiClient.post('/insights/admin/tag', fields);
  return response.data;
};

export const addErodeInternUserApi = async (userId) => {
  const response = await apiClient.post('/insights/admin/department/erode-interns/add-user', {
    organisation_user_id: userId
  });
  return response.data;
};

export const removeErodeInternUserApi = async (userId) => {
  const response = await apiClient.post('/insights/admin/department/erode-interns/remove-user', {
    organisation_user_id: userId
  });
  return response.data;
};

export const excludeAdminUserApi = async (userId, exclude) => {
  const response = await apiClient.put(`/insights/admin/users/${userId}/exclude`, { exclude });
  return response.data;
};
