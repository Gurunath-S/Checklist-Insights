import apiClient from '../../../services/apiClient';

export const getAdminSummaryApi = async (params) => {
  const response = await apiClient.get('/insights/admin/summary', { params });
  return response.data;
};

export const getPersonalInsightsApi = async (userId, params) => {
  const response = await apiClient.get(`/insights/personal/${userId}`, { params });
  return response.data;
};

export const getPersonalChartDataApi = async (userId, params) => {
  const response = await apiClient.get(`/insights/personal/${userId}/chart-data`, { params });
  return response.data;
};

export const getDepartmentDetailsApi = async (department, params) => {
  const response = await apiClient.get(`/insights/admin/department/${department}`, { params });
  return response.data;
};

export const getDepartmentChartDataApi = async (department, params) => {
  const response = await apiClient.get(`/insights/admin/department/${department}/chart-data`, { params });
  return response.data;
};

export const getOrganisationDetailsApi = async (orgId, params) => {
  const response = await apiClient.get(`/insights/admin/organisation/${orgId}`, { params });
  return response.data;
};

export const getOrganisationChartDataApi = async (orgId, params) => {
  const response = await apiClient.get(`/insights/admin/organisation/${orgId}/chart-data`, { params });
  return response.data;
};

export const getChecklistHistoryApi = async (params) => {
  const response = await apiClient.get('/insights/checklist-items/history', { params });
  return response.data;
};

export const getChecklistItemsListApi = async (params) => {
  const response = await apiClient.get('/insights/checklist-items/list', { params });
  return response.data;
};

// Activity explorer
export const getActivityTemplatesApi = async (userId, params) => {
  const response = await apiClient.get(`/activity/templates/${userId}`, { params });
  return response.data;
};

export const getActivityDatesApi = async (userId, templateId, params) => {
  const response = await apiClient.get(`/activity/dates/${userId}/${templateId}`, { params });
  return response.data;
};

export const getDepartmentUsersApi = async (department) => {
  const response = await apiClient.get(`/insights/admin/department/${department}/users`);
  return response.data;
};
