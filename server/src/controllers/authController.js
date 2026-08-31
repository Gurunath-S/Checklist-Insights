const authService = require('../services/authService');
const sessionService = require('../services/sessionService');
const { setRefreshTokenCookie, clearRefreshTokenCookie } = require('../utils/token');

const googleLogin = async (req, res) => {
  const { token, isAccessToken } = req.body;
  const userAgent = req.headers['user-agent'];
  const ipAddress = req.ip || req.connection?.remoteAddress;

  try {
    const { email, name, picture } = await authService.verifyGoogleToken(token, isAccessToken);
    const { accessToken, refreshToken, user } = await authService.upsertAndGetUserData(
      email,
      name,
      picture,
      userAgent,
      ipAddress
    );

    setRefreshTokenCookie(res, refreshToken);
    res.json({ token: accessToken, user });
  } catch (error) {
    console.error('Google Login Error:', error);
    res.status(401).json({ error: error.message || 'Invalid Google Token' });
  }
};

const microsoftLogin = async (req, res) => {
  const { accessToken: msAccessToken } = req.body;
  const userAgent = req.headers['user-agent'];
  const ipAddress = req.ip || req.connection?.remoteAddress;

  if (!msAccessToken) {
    return res.status(400).json({ error: 'Access token required' });
  }

  try {
    const { email, name, picture } = await authService.verifyMicrosoftToken(msAccessToken);
    const { accessToken, refreshToken, user } = await authService.upsertAndGetUserData(
      email,
      name,
      picture,
      userAgent,
      ipAddress
    );

    setRefreshTokenCookie(res, refreshToken);
    res.json({ token: accessToken, user });
  } catch (error) {
    console.error('Microsoft Login Error:', error);
    res.status(401).json({ error: error.message || 'Invalid Microsoft Token' });
  }
};

const refreshSession = async (req, res) => {
  const rawRefreshToken = req.cookies?.refreshToken;
  const userAgent = req.headers['user-agent'];
  const ipAddress = req.ip || req.connection?.remoteAddress;

  if (!rawRefreshToken) {
    return res.status(401).json({ error: 'Refresh token missing' });
  }

  try {
    const rotated = await sessionService.verifyAndRotateSession(
      rawRefreshToken,
      userAgent,
      ipAddress
    );

    if (!rotated) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    setRefreshTokenCookie(res, rotated.newRawRefreshToken);
    res.json({ token: rotated.newAccessToken, user: rotated.user });
  } catch (error) {
    console.error('Refresh Session Error:', error);
    clearRefreshTokenCookie(res);
    res.status(401).json({ error: 'Failed to refresh session' });
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

const logout = async (req, res) => {
  try {
    const rawRefreshToken = req.cookies?.refreshToken;
    if (rawRefreshToken) {
      await sessionService.revokeSessionByToken(rawRefreshToken);
    }
    clearRefreshTokenCookie(res);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout Error:', error);
    clearRefreshTokenCookie(res);
    res.status(500).json({ error: 'Logout failed' });
  }
};

const logoutAll = async (req, res) => {
  try {
    const userId = parseInt(req.user.userId);
    if (!isNaN(userId)) {
      await sessionService.revokeAllUserSessions(userId);
    }
    clearRefreshTokenCookie(res);
    res.json({ success: true, message: 'Logged out from all devices successfully' });
  } catch (error) {
    console.error('Logout All Error:', error);
    clearRefreshTokenCookie(res);
    res.status(500).json({ error: 'Logout from all devices failed' });
  }
};

module.exports = {
  googleLogin,
  microsoftLogin,
  refreshSession,
  verifySession,
  logout,
  logoutAll
};
