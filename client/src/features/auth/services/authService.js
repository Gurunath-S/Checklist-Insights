import apiClient from '../../../services/apiClient';

export const googleLoginApi = async (token, isAccessToken) => {
  const response = await apiClient.post('/auth/google', { token, isAccessToken });
  return response.data;
};

export const microsoftLoginApi = async (accessToken) => {
  const response = await apiClient.post('/auth/microsoft', { accessToken });
  return response.data;
};

export const verifySessionApi = async () => {
  const response = await apiClient.get('/auth/verify');
  return response.data;
};
