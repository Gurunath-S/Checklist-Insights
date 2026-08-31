const prisma = require('../config/prisma');
const { hashToken, generateRefreshToken, generateAccessToken } = require('../utils/token');

const REFRESH_TOKEN_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const createSession = async (organisationUserId, userAgent, ipAddress) => {
  const rawRefreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_LIFETIME_MS);

  const session = await prisma.session.create({
    data: {
      organisation_user_id: organisationUserId,
      refreshTokenHash,
      userAgent: userAgent ? userAgent.substring(0, 500) : null,
      ipAddress: ipAddress ? ipAddress.substring(0, 45) : null,
      expiresAt
    }
  });

  return { rawRefreshToken, session };
};

const verifyAndRotateSession = async (rawRefreshToken, userAgent, ipAddress) => {
  if (!rawRefreshToken) return null;

  const refreshTokenHash = hashToken(rawRefreshToken);

  const session = await prisma.session.findFirst({
    where: { refreshTokenHash },
    include: {
      user: {
        include: { User: true }
      }
    }
  });

  if (!session) {
    return null;
  }

  // Token Reuse / Theft Detection:
  // If an already-revoked refresh token is presented, someone may have stolen it!
  // Immediately revoke ALL sessions for this user family as a security precaution.
  if (session.isRevoked) {
    console.warn(`[SECURITY ALERT] Refresh token reuse detected for organisation_user_id: ${session.organisation_user_id}. Revoking all sessions.`);
    await revokeAllUserSessions(session.organisation_user_id);
    return null;
  }

  // Expiration check
  if (new Date() > session.expiresAt) {
    await prisma.session.update({
      where: { id: session.id },
      data: { isRevoked: true }
    });
    return null;
  }

  // Mark current session as revoked atomically (Rotation)
  const updateResult = await prisma.session.updateMany({
    where: { id: session.id, isRevoked: false },
    data: { isRevoked: true }
  });

  if (updateResult.count === 0) {
    return null;
  }

  // Create new rotated session
  const { rawRefreshToken: newRawRefreshToken, session: newSession } = await createSession(
    session.organisation_user_id,
    userAgent,
    ipAddress
  );

  // Format user profile
  const userData = {
    id: session.user.id,
    realUserId: session.user.User?.id || 0,
    name: session.user.User?.name || 'User',
    email: session.user.User?.email || '',
    image: session.user.User?.image || null,
    employeeId: `IBT-${session.user.id.toString().padStart(3, '0')}`,
    role: session.user.user_position || 'Team Member',
    user_type: session.user.user_type,
    doj: session.user.created_at
  };

  const newAccessToken = generateAccessToken(userData);

  return {
    user: userData,
    newAccessToken,
    newRawRefreshToken
  };
};

const revokeSessionByToken = async (rawRefreshToken) => {
  if (!rawRefreshToken) return;
  const refreshTokenHash = hashToken(rawRefreshToken);
  await prisma.session.updateMany({
    where: { refreshTokenHash, isRevoked: false },
    data: { isRevoked: true }
  });
};

const revokeAllUserSessions = async (organisationUserId) => {
  await prisma.session.updateMany({
    where: { organisation_user_id: organisationUserId, isRevoked: false },
    data: { isRevoked: true }
  });
};

const cleanExpiredSessions = async () => {
  const result = await prisma.session.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { isRevoked: true }
      ]
    }
  });
  return result.count;
};

module.exports = {
  createSession,
  verifyAndRotateSession,
  revokeSessionByToken,
  revokeAllUserSessions,
  cleanExpiredSessions
};
