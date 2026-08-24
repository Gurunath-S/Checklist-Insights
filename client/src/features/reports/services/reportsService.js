import apiClient from '../../../services/apiClient';

export const getReportsOverviewApi = async (params) => {
  const response = await apiClient.get('/insights/reports', { params });
  return response.data;
};

export const getReportDataApi = async (url) => {
  const response = await apiClient.get(url);
  return response.data;
};

export const getDateResponsesApi = async (userId, templateId, date) => {
  const response = await apiClient.get(`/activity/responses/${userId}/${templateId}/${date}`);
  return response.data;
};
