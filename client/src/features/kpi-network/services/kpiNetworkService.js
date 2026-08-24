import apiClient from '../../../services/apiClient';

export const getKPINetworkApi = async () => {
  const response = await apiClient.get('/insights/admin/kpi-network');
  return response.data;
};

export const getItemAnalyticsApi = async (itemId, params) => {
  const response = await apiClient.get(`/insights/item/${itemId}/analytics`, { params });
  return response.data;
};

export const updateItemConfigApi = async (itemId, config) => {
  const response = await apiClient.put(`/insights/admin/kpi-network/item/${itemId}/config`, config);
  return response.data;
};

export const createKPINetworkLinkApi = async (linkData) => {
  const response = await apiClient.post('/insights/admin/kpi-network/link', linkData);
  return response.data;
};

export const deleteKPINetworkLinkApi = async (linkId) => {
  const response = await apiClient.delete(`/insights/admin/kpi-network/link/${linkId}`);
  return response.data;
};
