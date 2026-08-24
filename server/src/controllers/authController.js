const authService = require('../services/authService');

const googleLogin = async (req, res) => {
  const { token, isAccessToken } = req.body;
  try {
    const { email, name, picture } = await authService.verifyGoogleToken(token, isAccessToken);
    const result = await authService.upsertAndGetUserData(email, name, picture);
    res.json(result);
  } catch (error) {
    console.error('Google Login Error:', error);
    res.status(401).json({ error: error.message || 'Invalid Google Token' });
  }
};

const microsoftLogin = async (req, res) => {
  const { accessToken } = req.body;
  if (!accessToken) {
    return res.status(400).json({ error: 'Access token required' });
  }
  try {
    const { email, name, picture } = await authService.verifyMicrosoftToken(accessToken);
    const result = await authService.upsertAndGetUserData(email, name, picture);
    res.json(result);
  } catch (error) {
    console.error('Microsoft Login Error:', error);
    res.status(401).json({ error: error.message || 'Invalid Microsoft Token' });
  }
};

const verifySession = async (req, res) => {
  try {
    const userId = parseInt(req.user.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid User ID in token' });
    }

    const result = await authService.verifySessionUser(userId, req.user.email);
    res.json(result);
  } catch (error) {
    console.error('Session Verification Error:', error);
    const statusCode = error.message === 'User not found' ? 404 : 500;
    res.status(statusCode).json({ error: error.message || 'Internal Server Error' });
  }
};

module.exports = {
  googleLogin,
  microsoftLogin,
  verifySession
};
