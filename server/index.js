const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const prisma = new PrismaClient();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Auth Route
app.post('/api/auth/google', async (req, res) => {
  const { token } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // 1. Find or Create User using correct schema fields (image, not profile_image)
    const userRecord = await prisma.user.upsert({
      where: { email },
      update: { image: picture, name: name },
      create: {
        name,
        email,
        image: picture,
      },
    });

    // 2. Find or Create Organisation_Users (linking to a default organisation)
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
      image: userRecord.image
    };

    const sessionToken = jwt.sign(
      { userId: userData.id, email: userData.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token: sessionToken, user: userData });
  } catch (error) {
    console.error('Auth Error:', error);
    res.status(401).json({ error: 'Invalid Google Token' });
  }
});

// Individual User Insights
app.get('/api/insights/personal/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) return res.status(400).json({ error: 'Invalid User ID' });
  
  try {
    const submissionsCount = await prisma.checklist_item_response.count({
      where: { organisation_user_id: userId }
    });

    const responses = await prisma.checklist_item_response.findMany({
      where: { organisation_user_id: userId },
      select: { created_at: true, input: true },
      orderBy: { created_at: 'desc' },
      take: 500
    });

    const trendMap = {};
    responses.forEach(r => {
      const date = new Date(r.created_at);
      const week = `${date.getFullYear()}-${getWeekNumber(date)}`;
      const points = /^\d+$/.test(r.input) ? parseInt(r.input) : 0;
      trendMap[week] = (trendMap[week] || 0) + points;
    });

    const performanceTrend = Object.entries(trendMap)
      .map(([week, points]) => ({ week, points }))
      .sort((a, b) => b.week.localeCompare(a.week))
      .slice(0, 12)
      .reverse();

    const activities = await prisma.checklist_item_response.findMany({
      where: { organisation_user_id: userId },
      include: {
        linked_item: {
          include: {
            item: true
          }
        }
      },
      orderBy: { created_at: 'desc' },
      take: 10
    });

    const formattedActivities = activities.map(r => ({
      id: r.id,
      checklist_name: r.linked_item?.item?.checklist_name || 'General Task',
      date: r.created_at,
      input: r.input,
      points: /^\d+$/.test(r.input) ? parseInt(r.input) : 0
    }));

    res.json({
      summary: { totalSubmissions: submissionsCount },
      performanceTrend,
      recentActivity: formattedActivities
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Admin Insights
app.get('/api/insights/admin/summary', async (req, res) => {
  try {
    const [userCount, submissionCount, templateCount] = await Promise.all([
      prisma.organisation_Users.count(),
      prisma.checklist_item_response.count(),
      prisma.checklist_template.count(),
    ]);
    
    // Corrected raw query with version_id and checklist_template_id
    const deptStatsRaw = await prisma.$queryRaw`
      SELECT t.tag_name, COUNT(r.id) as submissions
      FROM checklist_item_response r
      JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
      JOIN checklist_template_version v ON li.template_version_id = v.version_id
      JOIN checklist_template ct ON v.checklist_template_id = ct.id
      JOIN tags t ON ct.tag_id = t.id
      GROUP BY t.tag_name
    `;

    const deptStats = deptStatsRaw.map(stat => ({
      ...stat,
      submissions: Number(stat.submissions)
    }));

    res.json({
      totalUsers: userCount,
      totalSubmissions: submissionCount,
      totalTemplates: templateCount,
      departmentStats: deptStats
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return weekNo;
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
