const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const authenticateToken = require('../middleware/auth');

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Auth Route (Google)
router.post('/google', async (req, res) => {
  const { token, isAccessToken } = req.body;
  try {
    let email, name, picture, googleId;

    if (isAccessToken) {
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!userInfoRes.ok) throw new Error('Invalid Google Access Token');
      const payload = await userInfoRes.json();
      email = payload.email;
      name = payload.name;
      picture = payload.picture;
      googleId = payload.sub;
    } else {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      email = payload.email;
      name = payload.name;
      picture = payload.picture;
      googleId = payload.sub;
    }

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

    res.json({ token: sessionToken, user: userData });
  } catch (error) {
    console.error('Auth Error:', error);
    res.status(401).json({ error: 'Invalid Google Token' });
  }
});

// Microsoft Auth Route
router.post('/microsoft', async (req, res) => {
  const { accessToken } = req.body;
  if (!accessToken) {
    return res.status(400).json({ error: 'Access token required' });
  }

  try {
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

    const userRecord = await prisma.user.upsert({
      where: { email },
      update: { name: name },
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

    res.json({ token: sessionToken, user: userData });
  } catch (error) {
    console.error('Microsoft Auth Error:', error);
    res.status(401).json({ error: 'Invalid Microsoft Token' });
  }
});

// Verify Session Route
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.user.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid User ID in token' });
    }

    const user = await prisma.organisation_Users.findUnique({
      where: { id: userId },
      include: {
        User: true 
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = {
      id: user.id,
      realUserId: user.User?.id || 0,
      name: user.User?.name || 'User',
      email: user.User?.email || req.user.email,
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

    res.json({ user: userData, token: newToken });
  } catch (error) {
    console.error('Verification Route Error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

module.exports = router;
