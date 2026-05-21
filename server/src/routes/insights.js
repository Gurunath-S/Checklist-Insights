const express = require('express');
const prisma = require('../config/prisma');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return weekNo;
}

// Individual User Insights
router.get('/personal/:userId', authenticateToken, async (req, res) => {
  const userId = parseInt(req.params.userId);
  const authUserId = parseInt(req.user.userId);

  if (authUserId !== userId) {
    return res.status(403).json({ error: 'Unauthorized access to data' });
  }
  
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    const whereClause = { organisation_user_id: userId };
    if (Object.keys(dateFilter).length > 0) {
      whereClause.created_at = dateFilter;
    }

    // 1. Group responses into "Submission Events" (very fast)
    const submissions = await prisma.checklist_item_response.groupBy({
      by: ['template_version', 'selected_date'],
      where: whereClause,
      _count: { id: true },
      _min: { created_at: true }
    });

    // 2. Perform database-level aggregation to get item counts/sums (optimization)
    let query = `
      SELECT 
        ci.checklist_name AS name,
        ci.input_type AS type,
        SUM(CASE 
          WHEN ci.input_type = 'Numeric' THEN CAST(COALESCE(NULLIF(r.input, ''), '0') AS DECIMAL(10,2))
          ELSE 0 
        END) AS numeric_sum,
        SUM(CASE 
          WHEN ci.input_type = 'Boolean' AND (r.input = 'Yes' OR r.input = '1' OR r.input = 'true' OR r.status = 1) THEN 1
          ELSE 0 
        END) AS boolean_count
      FROM checklist_item_response r
      JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
      JOIN checklist_items ci ON li.checklist_item_id = ci.id
      WHERE r.organisation_user_id = ?
    `;
    const queryParams = [userId];

    if (startDate) {
      query += ` AND r.created_at >= ?`;
      queryParams.push(new Date(startDate));
    }
    if (endDate) {
      query += ` AND r.created_at <= ?`;
      queryParams.push(new Date(endDate));
    }
    query += ` GROUP BY ci.checklist_name, ci.input_type`;

    const aggregatedStats = await prisma.$queryRawUnsafe(query, ...queryParams);

    // 3. Fetch ONLY the top 15 recent response records for activity feed (optimization)
    const recentResponses = await prisma.checklist_item_response.findMany({
      where: whereClause,
      include: {
        linked_item: {
          include: {
            item: true
          }
        }
      },
      orderBy: { created_at: 'desc' },
      take: 15
    });

    const trendMap = {};
    let totalTasksWorked = 0;
    let totalTasksCompleted = 0;
    let totalAiTimeSaved = 0;
    let totalBugsFixed = 0;

    const todayStr = new Date().toLocaleDateString();
    let todaySubmitted = false;

    // Grouping for weekly trend
    submissions.forEach(s => {
      const date = new Date(s._min.created_at);
      const week = `${date.getFullYear()}-${getWeekNumber(date)}`;
      trendMap[week] = (trendMap[week] || 0) + 1;
      
      if (new Date(s._min.created_at).toLocaleDateString() === todayStr) {
        todaySubmitted = true;
      }
    });

    // Process aggregated metrics and count totals from summary stats
    const itemStats = aggregatedStats.map(row => {
      const name = row.name;
      const type = row.type;
      const value = type === 'Numeric' ? Number(row.numeric_sum) : Number(row.boolean_count);

      const lowercaseName = name.toLowerCase();
      if (lowercaseName.includes('tasks worked')) totalTasksWorked += value;
      if (lowercaseName.includes('tasks completed')) totalTasksCompleted += value;
      if (lowercaseName.includes('time saved using ai')) totalAiTimeSaved += value;
      if (lowercaseName.includes('bugs fixed')) totalBugsFixed += value;

      return { name, value, type };
    }).sort((a, b) => b.value - a.value);

    const performanceTrend = Object.entries(trendMap)
      .map(([week, points]) => ({ week, points }))
      .sort((a, b) => b.week.localeCompare(a.week))
      .slice(0, 12)
      .reverse();

    const formattedActivities = recentResponses.map(r => ({
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
        recentActivityCount: recentResponses.length
      },
      performanceTrend,
      recentActivity: formattedActivities,
      itemStats
    });
  } catch (error) {
    console.error('Personal insights error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Admin Insights Summary
router.get('/admin/summary', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.created_at = {};
      if (startDate) dateFilter.created_at.gte = new Date(startDate);
      if (endDate) dateFilter.created_at.lte = new Date(endDate);
    }

    const [userCount, submissionCount, templateCount, tagCount, itemCount, typeStatsRaw, organisations, tagsByPosRaw, orgUserPosRaw] = await Promise.all([
      prisma.organisation_Users.count(),
      prisma.checklist_item_response.count({ where: Object.keys(dateFilter).length ? dateFilter : undefined }),
      prisma.checklist_template.count(),
      prisma.tags.count(),
      prisma.checklist_items.count(),
      prisma.organisation_Users.groupBy({
        by: ['user_type'],
        _count: { id: true }
      }),
      prisma.organisation.findMany({
        select: { id: true, organisation: true }
      }),
      prisma.tags.groupBy({
        by: ['user_position'],
        _count: { id: true }
      }),
      prisma.organisation_User_position.groupBy({
        by: ['user_position'],
        _count: { id: true }
      })
    ]);
    
    let deptQuery = `
      SELECT t.tag_name, COUNT(r.id) as submissions
      FROM checklist_item_response r
      JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
      JOIN checklist_template_version v ON li.template_version_id = v.version_id
      JOIN checklist_template ct ON v.checklist_template_id = ct.id
      JOIN tags t ON ct.tag_id = t.id
      WHERE 1=1
    `;
    const deptQueryParams = [];
    if (startDate) {
      deptQuery += ` AND r.created_at >= ?`;
      deptQueryParams.push(new Date(startDate));
    }
    if (endDate) {
      deptQuery += ` AND r.created_at <= ?`;
      deptQueryParams.push(new Date(endDate));
    }
    deptQuery += ` GROUP BY t.tag_name`;

    const deptStatsRaw = await prisma.$queryRawUnsafe(deptQuery, ...deptQueryParams);

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
    console.error('Admin summary error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Admin Department Details
router.get('/admin/department/:department', authenticateToken, async (req, res) => {
  try {
    const { department } = req.params;
    const { startDate, endDate } = req.query;

    let dateFilterSql = '';
    const queryParams = [department];

    if (startDate) {
      dateFilterSql += ` AND r.created_at >= ?`;
      queryParams.push(new Date(startDate));
    }
    if (endDate) {
      dateFilterSql += ` AND r.created_at <= ?`;
      queryParams.push(new Date(endDate));
    }

    const summaryQuery = `
      SELECT 
        COUNT(r.id) AS submissionsCount,
        MAX(r.created_at) AS latestSubmissionDate
      FROM checklist_item_response r
      JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
      JOIN checklist_template_version v ON li.template_version_id = v.version_id
      JOIN checklist_template ct ON v.checklist_template_id = ct.id
      JOIN tags t ON ct.tag_id = t.id
      WHERE t.user_position = ?
      ${dateFilterSql}
    `;

    const inputsQuery = `
      SELECT 
        ci.checklist_name AS name,
        ci.input_type AS type,
        SUM(CASE 
          WHEN ci.input_type = 'Numeric' THEN CAST(COALESCE(NULLIF(r.input, ''), '0') AS DECIMAL(10,2))
          ELSE 0 
        END) AS numeric_sum,
        SUM(CASE 
          WHEN ci.input_type = 'Boolean' AND (r.input = 'Yes' OR r.input = '1' OR r.input = 'true' OR r.status = 1) THEN 1
          ELSE 0 
        END) AS boolean_count
      FROM checklist_item_response r
      JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
      JOIN checklist_items ci ON li.checklist_item_id = ci.id
      JOIN checklist_template_version v ON li.template_version_id = v.version_id
      JOIN checklist_template ct ON v.checklist_template_id = ct.id
      JOIN tags t ON ct.tag_id = t.id
      WHERE t.user_position = ?
      ${dateFilterSql}
      GROUP BY ci.checklist_name, ci.input_type
    `;

    const trendQuery = `
      SELECT 
        DATE_FORMAT(r.created_at, '%b %Y') AS name,
        COUNT(r.id) AS submissions,
        DATE_FORMAT(r.created_at, '%Y-%m') AS sortKey
      FROM checklist_item_response r
      JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
      JOIN checklist_template_version v ON li.template_version_id = v.version_id
      JOIN checklist_template ct ON v.checklist_template_id = ct.id
      JOIN tags t ON ct.tag_id = t.id
      WHERE t.user_position = ?
      ${dateFilterSql}
      GROUP BY DATE_FORMAT(r.created_at, '%b %Y'), DATE_FORMAT(r.created_at, '%Y-%m')
      ORDER BY sortKey ASC
    `;

    const [summaryResult, inputsResult, trendResult] = await Promise.all([
      prisma.$queryRawUnsafe(summaryQuery, ...queryParams),
      prisma.$queryRawUnsafe(inputsQuery, ...queryParams),
      prisma.$queryRawUnsafe(trendQuery, ...queryParams)
    ]);

    const submissionsCount = Number(summaryResult[0]?.submissionsCount || 0);
    const latestSubmissionDate = summaryResult[0]?.latestSubmissionDate || null;

    const checklistInputs = inputsResult.map(row => {
      const value = row.type === 'Numeric' ? Number(row.numeric_sum) : Number(row.boolean_count);
      return {
        name: row.name,
        value
      };
    }).sort((a, b) => b.value - a.value);

    const recentMonths = trendResult.map(row => ({
      name: row.name,
      submissions: Number(row.submissions)
    }));

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
    console.error('Admin department error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
