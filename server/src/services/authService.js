const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const verifyGoogleToken = async (token, isAccessToken) => {
  let email, name, picture;

  if (isAccessToken) {
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!userInfoRes.ok) throw new Error('Invalid Google Access Token');
    const payload = await userInfoRes.json();
    email = payload.email;
    name = payload.name;
    picture = payload.picture;
  } else {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    email = payload.email;
    name = payload.name;
    picture = payload.picture;
  }

  return { email, name, picture };
};

const verifyMicrosoftToken = async (accessToken) => {
  const graphRes = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!graphRes.ok) {
    throw new Error('Failed to fetch user profile from Microsoft');
  }

  const profile = await graphRes.json();
  const email = profile.mail || profile.userPrincipalName;
  const name = profile.displayName;
  const picture = null;

  if (!email) {
    throw new Error('Email not found in Microsoft profile');
  }

  return { email, name, picture };
};

const upsertAndGetUserData = async (email, name, picture) => {
  const userRecord = await prisma.user.upsert({
    where: { email },
    update: { image: picture, name: name },
    create: {
      name,
      email,
      image: picture,
    },
  });

  let orgUser = await prisma.organisation_Users.findFirst({
    where: { user_id: userRecord.id },
  });

  if (!orgUser) {
    let defaultOrg = await prisma.organisation.findFirst();
    if (!defaultOrg) {
      defaultOrg = await prisma.organisation.create({
        data: { organisation: 'Default Organisation' }
      });
    }

    orgUser = await prisma.organisation_Users.create({
      data: {
        user_id: userRecord.id,
        organisation_id: defaultOrg.id,
        user_type: 'USER',
      }
    });
  }

  const userData = {
    id: orgUser.id,
    realUserId: userRecord.id,
    name: userRecord.name,
    email: userRecord.email,
    image: userRecord.image,
    employeeId: `IBT-${orgUser.id.toString().padStart(3, '0')}`,
    role: orgUser.user_position || 'Team Member',
    user_type: orgUser.user_type,
    doj: orgUser.created_at
  };

  const sessionToken = jwt.sign(
    { userId: userData.id, email: userData.email },
    process.env.JWT_SECRET,
    { expiresIn: '6h' }
  );

  return { token: sessionToken, user: userData };
};

const verifySessionUser = async (userId, email) => {
  const user = await prisma.organisation_Users.findUnique({
    where: { id: userId },
    include: {
      User: true 
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  const userData = {
    id: user.id,
    realUserId: user.User?.id || 0,
    name: user.User?.name || 'User',
    email: user.User?.email || email,
    image: user.User?.image || null,
    employeeId: `IBT-${user.id.toString().padStart(3, '0')}`,
    role: user.user_position || 'Team Member',
    user_type: user.user_type,
    doj: user.created_at
  };

  const newToken = jwt.sign(
    { userId: userData.id, email: userData.email },
    process.env.JWT_SECRET,
    { expiresIn: '6h' }
  );

  return { user: userData, token: newToken };
};

module.exports = {
  verifyGoogleToken,
  verifyMicrosoftToken,
  upsertAndGetUserData,
  verifySessionUser
};
