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
  const { token, isAccessToken } = req.body;
  try {
    let email, name, picture, googleId;

    if (isAccessToken) {
      // Validate access token by fetching user info from Google
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
      // Validate ID Token (JWT)
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
      image: userRecord.image,
      employeeId: `IBT-${orgUser.id.toString().padStart(3, '0')}`,
      role: orgUser.user_position || 'Team Member',
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
app.post('/api/auth/microsoft', async (req, res) => {
  const { accessToken } = req.body;
  if (!accessToken) {
    return res.status(400).json({ error: 'Access token required' });
  }

  try {
    // 1. Fetch user profile from Microsoft Graph
    const graphRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!graphRes.ok) {
      throw new Error('Failed to fetch user profile from Microsoft');
    }

    const profile = await graphRes.json();
    const email = profile.mail || profile.userPrincipalName;
    const name = profile.displayName;
    const picture = null; // Microsoft Graph profile photo requires a separate API call

    if (!email) {
      throw new Error('Email not found in Microsoft profile');
    }

    // 2. Find or Create User
    const userRecord = await prisma.user.upsert({
      where: { email },
      update: { name: name },
      create: {
        name,
        email,
        image: picture,
      },
    });

    // 3. Find or Create Organisation_Users
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

// Middleware to protect routes
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Verify Session Route (Sliding Session)
app.get('/api/auth/verify', authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.user.userId);
    console.log('Verifying session for user ID:', userId);
    
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
      console.error('User not found in Organisation_Users for ID:', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    // Safety check: ensure user.User exists (Note: Capital 'U' based on Prisma schema)
    const userData = {
      id: user.id,
      realUserId: user.User?.id || 0,
      name: user.User?.name || 'User',
      email: user.User?.email || req.user.email,
      image: user.User?.image || null,
      employeeId: `IBT-${user.id.toString().padStart(3, '0')}`,
      role: user.user_position || 'Team Member',
      doj: user.created_at
    };

    console.log('Session verified successfully for:', userData.email);

    // Issue a NEW token (Sliding Session)
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

// Individual User Insights
app.get('/api/insights/personal/:userId', authenticateToken, async (req, res) => {
  // Ensure user is requesting their own data
  const userId = parseInt(req.params.userId);
  const authUserId = parseInt(req.user.userId);

  if (authUserId !== userId) {
    return res.status(403).json({ error: 'Unauthorized access to data' });
  }
  try {
    // 1. Group responses into "Submission Events"
    const submissions = await prisma.checklist_item_response.groupBy({
      by: ['template_version', 'selected_date'],
      where: { organisation_user_id: userId },
      _count: { id: true },
      _min: { created_at: true }
    });

    const responses = await prisma.checklist_item_response.findMany({
      where: { organisation_user_id: userId },
      include: {
        linked_item: {
          include: {
            item: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const trendMap = {};
    let totalTasksWorked = 0;
    let totalTasksCompleted = 0;
    let totalAiTimeSaved = 0;
    let totalBugsFixed = 0;

    const todayStr = new Date().toLocaleDateString();
    let todaySubmitted = false;

    // Grouping for trend: count unique submission events per week
    submissions.forEach(s => {
      const date = new Date(s._min.created_at);
      const week = `${date.getFullYear()}-${getWeekNumber(date)}`;
      trendMap[week] = (trendMap[week] || 0) + 1;
      
      if (new Date(s._min.created_at).toLocaleDateString() === todayStr) {
        todaySubmitted = true;
      }
    });

    // Calculate specific work metrics from individual items
    responses.forEach(r => {
      const itemName = r.linked_item?.item?.checklist_name?.toLowerCase() || '';
      const val = parseInt(r.input) || 0;

      if (itemName.includes('tasks worked')) totalTasksWorked += val;
      if (itemName.includes('tasks completed')) totalTasksCompleted += val;
      if (itemName.includes('time saved using ai')) totalAiTimeSaved += val;
      if (itemName.includes('bugs fixed')) totalBugsFixed += val;
    });

    const performanceTrend = Object.entries(trendMap)
      .map(([week, points]) => ({ week, points }))
      .sort((a, b) => b.week.localeCompare(a.week))
      .slice(0, 12)
      .reverse();

    const formattedActivities = responses.slice(0, 15).map(r => ({
      id: r.id,
      checklist_name: r.linked_item?.item?.checklist_name || 'General Task',
      date: r.created_at,
      input: r.input,
      type: r.linked_item?.item?.input_type || 'Boolean',
      statusLabel: r.linked_item?.item?.input_type === 'Numeric' ? 'Quantity' : 'Status'
    }));

    res.json({
      summary: { 
        totalSubmissions: submissions.length,
        totalTasksWorked,
        totalTasksCompleted,
        totalAiTimeSaved,
        totalBugsFixed,
        todaySubmitted,
        recentActivityCount: responses.length
      },
      performanceTrend,
      recentActivity: formattedActivities
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Admin Insights
app.get('/api/insights/admin/summary', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build the date filter condition if dates are provided
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.created_at = {};
      if (startDate) dateFilter.created_at.gte = new Date(startDate);
      if (endDate) dateFilter.created_at.lte = new Date(endDate);
    }

    const [userCount, submissionCount, templateCount, tagCount, itemCount, typeStatsRaw, organisations, tagsByPosRaw, orgUserPosRaw] = await Promise.all([
      prisma.organisation_Users.count({ where: Object.keys(dateFilter).length ? dateFilter : undefined }),
      prisma.checklist_item_response.count({ where: Object.keys(dateFilter).length ? dateFilter : undefined }),
      prisma.checklist_template.count({ where: Object.keys(dateFilter).length ? dateFilter : undefined }),
      prisma.tags.count({ where: Object.keys(dateFilter).length ? dateFilter : undefined }),
      prisma.checklist_items.count({ where: Object.keys(dateFilter).length ? dateFilter : undefined }),
      prisma.organisation_Users.groupBy({
        by: ['user_type'],
        where: Object.keys(dateFilter).length ? dateFilter : undefined,
        _count: { id: true }
      }),
      prisma.organisation.findMany({
        select: { id: true, organisation: true }
      }),
      prisma.tags.groupBy({
        by: ['user_position'],
        where: Object.keys(dateFilter).length ? dateFilter : undefined,
        _count: { id: true }
      }),
      prisma.organisation_User_position.groupBy({
        by: ['user_position'],
        where: Object.keys(dateFilter).length ? dateFilter : undefined,
        _count: { id: true }
      })
    ]);
    
    // Corrected raw query with version_id and checklist_template_id
    // Note: Raw queries with date filters require explicit parameter binding.
    // For simplicity, we skip filtering deptStats by date since it's an unused/legacy field in the new UI anyway, 
    // but to be safe, we'll construct it if no dates are passed, otherwise we'll return an empty array or adapt it.
    let deptStatsRaw = [];
    if (!startDate && !endDate) {
      deptStatsRaw = await prisma.$queryRaw`
        SELECT t.tag_name, COUNT(r.id) as submissions
        FROM checklist_item_response r
        JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
        JOIN checklist_template_version v ON li.template_version_id = v.version_id
        JOIN checklist_template ct ON v.checklist_template_id = ct.id
        JOIN tags t ON ct.tag_id = t.id
        GROUP BY t.tag_name
      `;
    }

    const deptStats = deptStatsRaw.map(stat => ({
      ...stat,
      submissions: Number(stat.submissions)
    }));

    const usersByPositionTags = tagsByPosRaw.map(p => ({
      name: p.user_position || 'UNASSIGNED',
      value: p._count.id
    })).sort((a, b) => b.value - a.value);

    const usersByPosition = orgUserPosRaw.map(p => ({
      name: p.user_position || 'UNASSIGNED',
      value: p._count.id
    })).sort((a, b) => b.value - a.value);

    const usersByType = typeStatsRaw.map(t => ({
      name: t.user_type || 'UNKNOWN',
      value: t._count.id
    })).sort((a, b) => b.value - a.value);

    res.json({
      totalUsers: userCount,
      totalSubmissions: submissionCount,
      totalTemplates: templateCount,
      totalTags: tagCount,
      totalItems: itemCount,
      departmentStats: deptStats,
      organisations,
      usersByPositionTags,
      usersByPosition,
      usersByType
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/insights/admin/department/:department', authenticateToken, async (req, res) => {
  try {
    const { department } = req.params;
    const { startDate, endDate } = req.query;

    // Use Prisma parameterized queries for raw SQL to prevent SQL injection
    // We want to fetch all responses for checklist items that belong to this user_position
    
    // First, let's just get the raw responses
    // Since we need to join multiple tables and filter by dates safely, we will build the WHERE clause dynamically
    let query = `
      SELECT 
        ci.checklist_name,
        r.input,
        r.created_at,
        r.status
      FROM checklist_item_response r
      JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
      JOIN checklist_items ci ON li.checklist_item_id = ci.id
      JOIN checklist_template_version v ON li.template_version_id = v.version_id
      JOIN checklist_template ct ON v.checklist_template_id = ct.id
      JOIN tags t ON ct.tag_id = t.id
      WHERE t.user_position = ?
    `;
    const queryParams = [department];

    if (startDate) {
      query += ` AND r.created_at >= ?`;
      queryParams.push(new Date(startDate));
    }
    if (endDate) {
      query += ` AND r.created_at <= ?`;
      queryParams.push(new Date(endDate));
    }

    const responses = await prisma.$queryRawUnsafe(query, ...queryParams);

    // Aggregate the data
    let submissionsCount = responses.length;
    let latestSubmissionDate = null;
    let inputsAggregation = {};
    let monthsAggregation = {};

    responses.forEach(r => {
       // Latest date
       if (!latestSubmissionDate || new Date(r.created_at) > latestSubmissionDate) {
         latestSubmissionDate = new Date(r.created_at);
       }
       
       // Inputs Aggregation
       const name = r.checklist_name;
       if (!inputsAggregation[name]) inputsAggregation[name] = 0;
       
       if (r.status === true || r.status === 1) {
         inputsAggregation[name] += 1;
       } else if (!isNaN(parseFloat(r.input))) {
         inputsAggregation[name] += parseFloat(r.input);
       } else {
         inputsAggregation[name] += 1; // fallback count
       }

       // Months Aggregation
       const dateObj = new Date(r.created_at);
       const monthYear = dateObj.toLocaleString('default', { month: 'short', year: 'numeric' });
       // Ensure sorting by sorting key
       const sortKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
       
       if (!monthsAggregation[monthYear]) {
         monthsAggregation[monthYear] = { count: 0, sortKey };
       }
       monthsAggregation[monthYear].count += 1;
    });

    const checklistInputs = Object.keys(inputsAggregation).map(name => ({
      name,
      value: inputsAggregation[name]
    })).sort((a,b) => b.value - a.value);

    const recentMonths = Object.keys(monthsAggregation)
      .map(month => ({
        name: month,
        submissions: monthsAggregation[month].count,
        sortKey: monthsAggregation[month].sortKey
      }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(({ sortKey, ...rest }) => rest);

    // Generate dynamic Top KPIs based on the highest value inputs
    const topKPIs = checklistInputs.slice(0, 3).map(input => ({
      label: input.name,
      value: input.value
    }));

    res.json({
      department,
      submissionsCount,
      latestSubmissionDate,
      checklistInputs,
      recentMonths,
      topKPIs
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
