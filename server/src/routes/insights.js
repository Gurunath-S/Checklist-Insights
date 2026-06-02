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

  const requester = await prisma.organisation_Users.findUnique({
    where: { id: authUserId },
    select: { 
      user_type: true,
      User: { select: { email: true } }
    }
  });
  const isRequesterAdmin = 
    requester?.user_type?.trim() === 'ADMIN' || 
    requester?.User?.email === 'gururider35@gmail.com';

  if (authUserId !== userId && !isRequesterAdmin) {
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
        COUNT(r.id) AS total_count,
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

    // Yes/No average and Time-related average calculations
    let yesNoQuery = `
      SELECT 
        COUNT(r.id) AS total_boolean,
        SUM(CASE WHEN (r.input = 'Yes' OR r.input = '1' OR r.input = 'true' OR r.status = 1) THEN 1 ELSE 0 END) AS yes_count
      FROM checklist_item_response r
      JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
      JOIN checklist_items ci ON li.checklist_item_id = ci.id
      WHERE ci.input_type = 'Boolean'
        AND r.organisation_user_id = ?
    `;
    const yesNoParams = [userId];

    if (startDate) {
      yesNoQuery += ` AND r.created_at >= ?`;
      yesNoParams.push(new Date(startDate));
    }
    if (endDate) {
      yesNoQuery += ` AND r.created_at <= ?`;
      yesNoParams.push(new Date(endDate));
    }

    let timeQuery = `
      SELECT 
        AVG(CAST(COALESCE(NULLIF(r.input, ''), '0') AS DECIMAL(10,2))) AS avg_value
      FROM checklist_item_response r
      JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
      JOIN checklist_items ci ON li.checklist_item_id = ci.id
      WHERE ci.input_type = 'Numeric'
        AND (
          LOWER(ci.checklist_name) LIKE '%time%' OR
          LOWER(ci.checklist_name) LIKE '%hour%' OR
          LOWER(ci.checklist_name) LIKE '%duration%' OR
          LOWER(ci.checklist_name) LIKE '%clock%' OR
          LOWER(ci.checklist_name) LIKE '%minutes%'
        )
        AND r.organisation_user_id = ?
    `;
    const timeParams = [userId];

    if (startDate) {
      timeQuery += ` AND r.created_at >= ?`;
      timeParams.push(new Date(startDate));
    }
    if (endDate) {
      timeQuery += ` AND r.created_at <= ?`;
      timeParams.push(new Date(endDate));
    }

    const [yesNoResult, timeResult] = await Promise.all([
      prisma.$queryRawUnsafe(yesNoQuery, ...yesNoParams),
      prisma.$queryRawUnsafe(timeQuery, ...timeParams)
    ]);

    const totalBoolean = Number(yesNoResult[0]?.total_boolean || 0);
    const yesCount = Number(yesNoResult[0]?.yes_count || 0);
    const yesNoAvg = totalBoolean > 0 ? Number(((yesCount / totalBoolean) * 100).toFixed(1)) : 0;

    const timeRelatedAvg = timeResult[0]?.avg_value ? Number(Number(timeResult[0].avg_value).toFixed(1)) : 0;

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
      const totalCount = Number(row.total_count || 0);
      const booleanCount = Number(row.boolean_count || 0);
      const numericSum = Number(row.numeric_sum || 0);

      // Keep absolute values for totals
      const lowercaseName = name.toLowerCase();
      if (lowercaseName.includes('tasks worked')) totalTasksWorked += (type === 'Numeric' ? numericSum : booleanCount);
      if (lowercaseName.includes('tasks completed')) totalTasksCompleted += (type === 'Numeric' ? numericSum : booleanCount);
      if (lowercaseName.includes('time saved using ai')) totalAiTimeSaved += (type === 'Numeric' ? numericSum : booleanCount);
      if (lowercaseName.includes('bugs fixed')) totalBugsFixed += (type === 'Numeric' ? numericSum : booleanCount);

      let value = 0;
      let isPercentage = false;
      let isTimeAverage = false;
      let isTaskAverage = false;

      if (type === 'Boolean') {
        value = totalCount > 0 ? Number(((booleanCount / totalCount) * 100).toFixed(1)) : 0;
        isPercentage = true;
      } else {
        const isTimeRelated = ['time', 'hour', 'duration', 'clock', 'minutes'].some(k => lowercaseName.includes(k));
        const isTaskRelated = ['tasks worked', 'task worked'].some(k => lowercaseName.includes(k));
        
        if (isTimeRelated) {
          value = totalCount > 0 ? Number((numericSum / totalCount).toFixed(1)) : 0;
          isTimeAverage = true;
        } else if (isTaskRelated) {
          value = totalCount > 0 ? Math.round(numericSum / totalCount) : 0;
          isTaskAverage = true;
        } else {
          value = numericSum;
        }
      }

      return { name, value, type, isPercentage, isTimeAverage, isTaskAverage };
    }).sort((a, b) => b.value - a.value);

    const performanceTrend = Object.entries(trendMap)
      .map(([week, points]) => ({ week, points }))
      .sort((a, b) => b.week.localeCompare(a.week))
      .slice(0, 52)
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
        recentActivityCount: recentResponses.length,
        yesNoAvg,
        timeRelatedAvg
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

// Paginated Chart Data for User
router.get('/personal/:userId/chart-data', authenticateToken, async (req, res) => {
  const userId = parseInt(req.params.userId);
  const authUserId = parseInt(req.user.userId);

  const requester = await prisma.organisation_Users.findUnique({
    where: { id: authUserId },
    select: { 
      user_type: true,
      User: { select: { email: true } }
    }
  });
  const isRequesterAdmin = 
    requester?.user_type?.trim() === 'ADMIN' || 
    requester?.User?.email === 'gururider35@gmail.com';

  if (authUserId !== userId && !isRequesterAdmin) {
    return res.status(403).json({ error: 'Unauthorized access to data' });
  }

  try {
    const { startDate, endDate, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

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

    const paginatedQuery = `
      SELECT * FROM (${query}) as sub
      ORDER BY 
        CASE WHEN type = 'Numeric' THEN numeric_sum ELSE boolean_count END DESC
      LIMIT ? OFFSET ?
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total FROM (
        SELECT ci.checklist_name 
        FROM checklist_item_response r
        JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
        JOIN checklist_items ci ON li.checklist_item_id = ci.id
        WHERE r.organisation_user_id = ?
        ${startDate ? ' AND r.created_at >= ?' : ''}
        ${endDate ? ' AND r.created_at <= ?' : ''}
        GROUP BY ci.checklist_name, ci.input_type
      ) as sub
    `;
    
    const countParams = [userId];
    if (startDate) countParams.push(new Date(startDate));
    if (endDate) countParams.push(new Date(endDate));

    const [paginatedStats, totalResult] = await Promise.all([
      prisma.$queryRawUnsafe(paginatedQuery, ...queryParams, limitNum, offset),
      prisma.$queryRawUnsafe(countQuery, ...countParams)
    ]);

    const total = Number(totalResult[0]?.total || 0);

    const data = paginatedStats.map(row => {
      const name = row.name;
      const type = row.type;
      const value = type === 'Numeric' ? Number(row.numeric_sum) : Number(row.boolean_count);
      return { name, value, type };
    });

    res.json({
      data,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    console.error('Personal insights chart-data error:', error);
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

    const [userCount, submissionCount, templateCount, tagCount, itemCount, typeStatsRaw, tagsByPosRaw, orgUserPosRaw] = await Promise.all([
      prisma.organisation_Users.count(),
      prisma.checklist_item_response.count({ where: Object.keys(dateFilter).length ? dateFilter : undefined }),
      prisma.checklist_template.count(),
      prisma.tags.count(),
      prisma.checklist_items.count(),
      prisma.organisation_Users.groupBy({
        by: ['user_type'],
        _count: { id: true }
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

    let orgQuery = `
      SELECT 
        o.id AS id,
        o.organisation,
        COUNT(DISTINCT ou.id) AS total_users,
        COUNT(DISTINCT CASE WHEN cir.id IS NOT NULL THEN CONCAT(ou.id, '-', ct.id, '-', DATE(cir.created_at)) END) AS total_submissions,
        COALESCE(ROUND(AVG(
          CASE 
            WHEN ci.input_type = 'Boolean' AND (cir.input = 'Yes' OR cir.input = '1' OR cir.input = 'true' OR cir.status = 1) THEN 1
            WHEN ci.input_type = 'Numeric' AND (cir.input IS NOT NULL AND cir.input != '') THEN 1
            ELSE 0 
          END
        ) * 100, 1), 0) AS avg_completion_rate
      FROM Organisation o
      LEFT JOIN Organisation_Users ou ON o.id = ou.organisation_id
      LEFT JOIN checklist_item_response cir ON ou.id = cir.organisation_user_id
    `;
    const orgQueryParams = [];
    if (startDate) {
      orgQuery += ` AND cir.created_at >= ?`;
      orgQueryParams.push(new Date(startDate));
    }
    if (endDate) {
      orgQuery += ` AND cir.created_at <= ?`;
      orgQueryParams.push(new Date(endDate));
    }
    orgQuery += `
      LEFT JOIN checklist_template_linked_items li ON cir.checklist_template_linked_items_id = li.id
      LEFT JOIN checklist_template_version v ON li.template_version_id = v.version_id
      LEFT JOIN checklist_template ct ON v.checklist_template_id = ct.id
      LEFT JOIN checklist_items ci ON li.checklist_item_id = ci.id
      GROUP BY o.id, o.organisation
      ORDER BY total_submissions DESC, o.organisation ASC
    `;

    const organisationsRaw = await prisma.$queryRawUnsafe(orgQuery, ...orgQueryParams);
    const organisations = organisationsRaw.map(org => ({
      id: Number(org.id),
      organisation: org.organisation,
      total_users: Number(org.total_users),
      total_submissions: Number(org.total_submissions),
      avg_completion_rate: Number(org.avg_completion_rate)
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

// Admin Organisation Details
router.get('/admin/organisation/:orgId', authenticateToken, async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const { startDate, endDate } = req.query;

    let dateFilterSql = '';
    const queryParams = [orgId];

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
      JOIN Organisation_Users ou ON r.organisation_user_id = ou.id
      WHERE ou.organisation_id = ?
      ${dateFilterSql}
    `;

    const inputsQuery = `
      SELECT 
        ci.checklist_name AS name,
        ci.input_type AS type,
        COUNT(r.id) AS total_count,
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
      JOIN Organisation_Users ou ON r.organisation_user_id = ou.id
      WHERE ou.organisation_id = ?
      ${dateFilterSql}
      GROUP BY ci.checklist_name, ci.input_type
    `;

    const trendQuery = `
      SELECT 
        DATE_FORMAT(r.created_at, '%b %Y') AS name,
        COUNT(r.id) AS submissions,
        DATE_FORMAT(r.created_at, '%Y-%m') AS sortKey
      FROM checklist_item_response r
      JOIN Organisation_Users ou ON r.organisation_user_id = ou.id
      WHERE ou.organisation_id = ?
      ${dateFilterSql}
      GROUP BY DATE_FORMAT(r.created_at, '%b %Y'), DATE_FORMAT(r.created_at, '%Y-%m')
      ORDER BY sortKey ASC
    `;

    const completionQuery = `
      SELECT 
        AVG(CASE 
          WHEN (ci.input_type = 'Boolean' AND (r.input = 'Yes' OR r.input = '1' OR r.input = 'true' OR r.status = 1))
            OR (ci.input_type = 'Numeric' AND r.input IS NOT NULL AND r.input <> '') THEN 100.0
          ELSE 0.0
        END) AS completionRate
      FROM checklist_item_response r
      JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
      JOIN checklist_items ci ON li.checklist_item_id = ci.id
      JOIN Organisation_Users ou ON r.organisation_user_id = ou.id
      WHERE ou.organisation_id = ?
      ${dateFilterSql}
    `;

    const orgNameQuery = `
      SELECT organisation FROM Organisation WHERE id = ?
    `;

    const [summaryResult, inputsResult, trendResult, completionResult, orgNameResult] = await Promise.all([
      prisma.$queryRawUnsafe(summaryQuery, ...queryParams),
      prisma.$queryRawUnsafe(inputsQuery, ...queryParams),
      prisma.$queryRawUnsafe(trendQuery, ...queryParams),
      prisma.$queryRawUnsafe(completionQuery, ...queryParams),
      prisma.$queryRawUnsafe(orgNameQuery, orgId)
    ]);

    const organisationName = orgNameResult[0]?.organisation || 'Unknown Organisation';
    const submissionsCount = Number(summaryResult[0]?.submissionsCount || 0);
    const latestSubmissionDate = summaryResult[0]?.latestSubmissionDate || null;
    const completionRate = Number(completionResult[0]?.completionRate || 0);

    const checklistInputs = inputsResult.map(row => {
      const name = row.name;
      const type = row.type;
      const totalCount = Number(row.total_count || 0);
      const booleanCount = Number(row.boolean_count || 0);
      const numericSum = Number(row.numeric_sum || 0);
      const lowercaseName = name.toLowerCase();

      let value = 0;
      let isPercentage = false;
      let isTimeAverage = false;
      let isTaskAverage = false;

      if (type === 'Boolean') {
        value = totalCount > 0 ? Number(((booleanCount / totalCount) * 100).toFixed(1)) : 0;
        isPercentage = true;
      } else {
        const isTimeRelated = ['time', 'hour', 'duration', 'clock', 'minutes'].some(k => lowercaseName.includes(k));
        const isTaskRelated = ['tasks worked', 'task worked'].some(k => lowercaseName.includes(k));
        
        if (isTimeRelated) {
          value = totalCount > 0 ? Number((numericSum / totalCount).toFixed(1)) : 0;
          isTimeAverage = true;
        } else if (isTaskRelated) {
          value = totalCount > 0 ? Math.round(numericSum / totalCount) : 0;
          isTaskAverage = true;
        } else {
          value = totalCount > 0 ? Number((numericSum / totalCount).toFixed(1)) : 0;
        }
      }

      return {
        name,
        value,
        type,
        isPercentage,
        isTimeAverage,
        isTaskAverage
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
      organisationName,
      orgId,
      submissionsCount,
      latestSubmissionDate,
      checklistInputs,
      recentMonths,
      topKPIs,
      completionRate
    });
  } catch (error) {
    console.error('Admin organisation error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Paginated Chart Data for Admin Organisation
router.get('/admin/organisation/:orgId/chart-data', authenticateToken, async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const { startDate, endDate, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let dateFilterSql = '';
    const queryParams = [orgId];

    if (startDate) {
      dateFilterSql += ` AND r.created_at >= ?`;
      queryParams.push(new Date(startDate));
    }
    if (endDate) {
      dateFilterSql += ` AND r.created_at <= ?`;
      queryParams.push(new Date(endDate));
    }

    const query = `
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
      JOIN Organisation_Users ou ON r.organisation_user_id = ou.id
      WHERE ou.organisation_id = ?
      ${dateFilterSql}
      GROUP BY ci.checklist_name, ci.input_type
    `;

    const paginatedQuery = `
      SELECT * FROM (${query}) as sub
      ORDER BY 
        CASE WHEN type = 'Numeric' THEN numeric_sum ELSE boolean_count END DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as total FROM (
        SELECT ci.checklist_name 
        FROM checklist_item_response r
        JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
        JOIN checklist_items ci ON li.checklist_item_id = ci.id
        JOIN Organisation_Users ou ON r.organisation_user_id = ou.id
        WHERE ou.organisation_id = ?
        ${dateFilterSql}
        GROUP BY ci.checklist_name, ci.input_type
      ) as sub
    `;

    const [paginatedStats, totalResult] = await Promise.all([
      prisma.$queryRawUnsafe(paginatedQuery, ...queryParams, limitNum, offset),
      prisma.$queryRawUnsafe(countQuery, ...queryParams)
    ]);

    const total = Number(totalResult[0]?.total || 0);

    const data = paginatedStats.map(row => {
      const name = row.name;
      const type = row.type;
      const value = type === 'Numeric' ? Number(row.numeric_sum) : Number(row.boolean_count);
      return { name, value, type };
    });

    res.json({
      data,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    console.error('Admin organisation chart-data error:', error);
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
        COUNT(r.id) AS total_count,
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

    const completionQuery = `
      SELECT 
        AVG(CASE 
          WHEN (ci.input_type = 'Boolean' AND (r.input = 'Yes' OR r.input = '1' OR r.input = 'true' OR r.status = 1))
            OR (ci.input_type = 'Numeric' AND r.input IS NOT NULL AND r.input <> '') THEN 100.0
          ELSE 0.0
        END) AS completionRate
      FROM checklist_item_response r
      JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
      JOIN checklist_items ci ON li.checklist_item_id = ci.id
      JOIN checklist_template_version v ON li.template_version_id = v.version_id
      JOIN checklist_template ct ON v.checklist_template_id = ct.id
      JOIN tags t ON ct.tag_id = t.id
      WHERE t.user_position = ?
      ${dateFilterSql}
    `;

    const [summaryResult, inputsResult, trendResult, completionResult] = await Promise.all([
      prisma.$queryRawUnsafe(summaryQuery, ...queryParams),
      prisma.$queryRawUnsafe(inputsQuery, ...queryParams),
      prisma.$queryRawUnsafe(trendQuery, ...queryParams),
      prisma.$queryRawUnsafe(completionQuery, ...queryParams)
    ]);

    const submissionsCount = Number(summaryResult[0]?.submissionsCount || 0);
    const latestSubmissionDate = summaryResult[0]?.latestSubmissionDate || null;
    const completionRate = Number(completionResult[0]?.completionRate || 0);

    const checklistInputs = inputsResult.map(row => {
      const name = row.name;
      const type = row.type;
      const totalCount = Number(row.total_count || 0);
      const booleanCount = Number(row.boolean_count || 0);
      const numericSum = Number(row.numeric_sum || 0);
      const lowercaseName = name.toLowerCase();

      let value = 0;
      let isPercentage = false;
      let isTimeAverage = false;
      let isTaskAverage = false;

      if (type === 'Boolean') {
        value = totalCount > 0 ? Number(((booleanCount / totalCount) * 100).toFixed(1)) : 0;
        isPercentage = true;
      } else {
        const isTimeRelated = ['time', 'hour', 'duration', 'clock', 'minutes'].some(k => lowercaseName.includes(k));
        const isTaskRelated = ['tasks worked', 'task worked'].some(k => lowercaseName.includes(k));
        
        if (isTimeRelated) {
          value = totalCount > 0 ? Number((numericSum / totalCount).toFixed(1)) : 0;
          isTimeAverage = true;
        } else if (isTaskRelated) {
          value = totalCount > 0 ? Math.round(numericSum / totalCount) : 0;
          isTaskAverage = true;
        } else {
          value = totalCount > 0 ? Number((numericSum / totalCount).toFixed(1)) : 0;
        }
      }

      return {
        name,
        value,
        type,
        isPercentage,
        isTimeAverage,
        isTaskAverage
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

    let salesData = null;
    if (department && department.toUpperCase() === 'SALES') {
      const prospectsQuery = `
        SELECT 
          DATE_FORMAT(r.created_at, '%b %Y') AS name,
          SUM(CAST(COALESCE(NULLIF(r.input, ''), '0') AS DECIMAL(10,2))) AS value,
          DATE_FORMAT(r.created_at, '%Y-%m') AS sortKey
        FROM checklist_item_response r
        JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
        JOIN checklist_items ci ON li.checklist_item_id = ci.id
        JOIN checklist_template_version v ON li.template_version_id = v.version_id
        JOIN checklist_template ct ON v.checklist_template_id = ct.id
        JOIN tags t ON ct.tag_id = t.id
        WHERE t.user_position = ?
          AND ci.checklist_name IN ('No of prospects identified', 'No of Prospects Identified')
          ${dateFilterSql}
        GROUP BY DATE_FORMAT(r.created_at, '%b %Y'), DATE_FORMAT(r.created_at, '%Y-%m')
        ORDER BY sortKey ASC
      `;

      const warmLeadsQuery = `
        SELECT 
          DATE_FORMAT(r.created_at, '%b %Y') AS name,
          SUM(CAST(COALESCE(NULLIF(r.input, ''), '0') AS DECIMAL(10,2))) AS value,
          DATE_FORMAT(r.created_at, '%Y-%m') AS sortKey
        FROM checklist_item_response r
        JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
        JOIN checklist_items ci ON li.checklist_item_id = ci.id
        JOIN checklist_template_version v ON li.template_version_id = v.version_id
        JOIN checklist_template ct ON v.checklist_template_id = ct.id
        JOIN tags t ON ct.tag_id = t.id
        WHERE t.user_position = ?
          AND ci.checklist_name = 'Warm Leads-Colleges'
          ${dateFilterSql}
        GROUP BY DATE_FORMAT(r.created_at, '%b %Y'), DATE_FORMAT(r.created_at, '%Y-%m')
        ORDER BY sortKey ASC
      `;

      const meetingsTrendQuery = `
        SELECT 
          DATE_FORMAT(r.created_at, '%b %Y') AS name,
          SUM(CAST(COALESCE(NULLIF(r.input, ''), '0') AS DECIMAL(10,2))) AS value,
          DATE_FORMAT(r.created_at, '%Y-%m') AS sortKey
        FROM checklist_item_response r
        JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
        JOIN checklist_items ci ON li.checklist_item_id = ci.id
        JOIN checklist_template_version v ON li.template_version_id = v.version_id
        JOIN checklist_template ct ON v.checklist_template_id = ct.id
        JOIN tags t ON ct.tag_id = t.id
        WHERE t.user_position = ?
          AND ci.checklist_name IN ('No of In-Person meeting', 'No of Inperson Meeting')
          ${dateFilterSql}
        GROUP BY DATE_FORMAT(r.created_at, '%b %Y'), DATE_FORMAT(r.created_at, '%Y-%m')
        ORDER BY sortKey ASC
      `;

      const meetingsByUserQuery = `
        SELECT 
          u.name AS name,
          SUM(CAST(COALESCE(NULLIF(r.input, ''), '0') AS DECIMAL(10,2))) AS value
        FROM checklist_item_response r
        JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
        JOIN checklist_items ci ON li.checklist_item_id = ci.id
        JOIN checklist_template_version v ON li.template_version_id = v.version_id
        JOIN checklist_template ct ON v.checklist_template_id = ct.id
        JOIN tags t ON ct.tag_id = t.id
        JOIN Organisation_Users ou ON r.organisation_user_id = ou.id
        JOIN User u ON ou.user_id = u.id
        WHERE t.user_position = ?
          AND ci.checklist_name IN ('No of In-Person meeting', 'No of Inperson Meeting')
          ${dateFilterSql}
        GROUP BY u.name
        ORDER BY value DESC
      `;

      const closuresTrendQuery = `
        SELECT 
          DATE_FORMAT(r.created_at, '%b %Y') AS name,
          SUM(CAST(COALESCE(NULLIF(r.input, ''), '0') AS DECIMAL(10,2))) AS value,
          DATE_FORMAT(r.created_at, '%Y-%m') AS sortKey
        FROM checklist_item_response r
        JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
        JOIN checklist_items ci ON li.checklist_item_id = ci.id
        JOIN checklist_template_version v ON li.template_version_id = v.version_id
        JOIN checklist_template ct ON v.checklist_template_id = ct.id
        JOIN tags t ON ct.tag_id = t.id
        WHERE t.user_position = ?
          AND ci.checklist_name IN ('No of closure made', 'No of closures made')
          ${dateFilterSql}
        GROUP BY DATE_FORMAT(r.created_at, '%b %Y'), DATE_FORMAT(r.created_at, '%Y-%m')
        ORDER BY sortKey ASC
      `;

      const closuresByUserQuery = `
        SELECT 
          u.name AS name,
          SUM(CAST(COALESCE(NULLIF(r.input, ''), '0') AS DECIMAL(10,2))) AS value
        FROM checklist_item_response r
        JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
        JOIN checklist_items ci ON li.checklist_item_id = ci.id
        JOIN checklist_template_version v ON li.template_version_id = v.version_id
        JOIN checklist_template ct ON v.checklist_template_id = ct.id
        JOIN tags t ON ct.tag_id = t.id
        JOIN Organisation_Users ou ON r.organisation_user_id = ou.id
        JOIN User u ON ou.user_id = u.id
        WHERE t.user_position = ?
          AND ci.checklist_name IN ('No of closure made', 'No of closures made')
          ${dateFilterSql}
        GROUP BY u.name
        ORDER BY value DESC
      `;

      const followUpsQuery = `
        SELECT 
          DATE_FORMAT(r.created_at, '%b %Y') AS name,
          SUM(CAST(COALESCE(NULLIF(r.input, ''), '0') AS DECIMAL(10,2))) AS value,
          DATE_FORMAT(r.created_at, '%Y-%m') AS sortKey
        FROM checklist_item_response r
        JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
        JOIN checklist_items ci ON li.checklist_item_id = ci.id
        JOIN checklist_template_version v ON li.template_version_id = v.version_id
        JOIN checklist_template ct ON v.checklist_template_id = ct.id
        JOIN tags t ON ct.tag_id = t.id
        WHERE t.user_position = ?
          AND ci.checklist_name LIKE '%follow%up%'
          ${dateFilterSql}
        GROUP BY DATE_FORMAT(r.created_at, '%b %Y'), DATE_FORMAT(r.created_at, '%Y-%m')
        ORDER BY sortKey ASC
      `;

      const [prospects, warmLeads, meetingsTrend, meetingsByUser, closuresTrend, closuresByUser, followUps, deptUsers] = await Promise.all([
        prisma.$queryRawUnsafe(prospectsQuery, ...queryParams),
        prisma.$queryRawUnsafe(warmLeadsQuery, ...queryParams),
        prisma.$queryRawUnsafe(meetingsTrendQuery, ...queryParams),
        prisma.$queryRawUnsafe(meetingsByUserQuery, ...queryParams),
        prisma.$queryRawUnsafe(closuresTrendQuery, ...queryParams),
        prisma.$queryRawUnsafe(closuresByUserQuery, ...queryParams),
        prisma.$queryRawUnsafe(followUpsQuery, ...queryParams),
        prisma.organisation_User_position.findMany({
          where: { user_position: 'SALES' },
          include: {
            Organisation_Users: {
              include: { User: true }
            }
          }
        })
      ]);

      const activeSalespeople = [...new Set(
        deptUsers
          .map(du => du.Organisation_Users?.User?.name)
          .filter(Boolean)
      )];

      const mapToUsers = (resultsList) => {
        const userMap = {};
        activeSalespeople.forEach(name => {
          userMap[name] = 0;
        });
        resultsList.forEach(r => {
          userMap[r.name] = Number(r.value);
        });
        return Object.entries(userMap)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);
      };

      const totalSalesPersons = activeSalespeople.length;
      
      const totalClosures = closuresTrend.reduce((acc, curr) => acc + Number(curr.value), 0);
      
      const tasksCompletedItemRaw = inputsResult.find(i => i.name.toLowerCase().includes('task completed') || i.name.toLowerCase().includes('tasks completed'));
      let totalTasksCompleted = 0;
      if (tasksCompletedItemRaw) {
        if (tasksCompletedItemRaw.type === 'Numeric') {
          totalTasksCompleted = Number(tasksCompletedItemRaw.numeric_sum || 0);
        } else {
          totalTasksCompleted = Number(tasksCompletedItemRaw.boolean_count || 0);
        }
      }

      salesData = {
        prospectsIdentified: prospects.map(r => ({ name: r.name, value: Number(r.value) })),
        warmLeadsColleges: warmLeads.map(r => ({ name: r.name, value: Number(r.value) })),
        meetingsTrend: meetingsTrend.map(r => ({ name: r.name, value: Number(r.value) })),
        meetingsByUser: mapToUsers(meetingsByUser),
        closuresTrend: closuresTrend.map(r => ({ name: r.name, value: Number(r.value) })),
        closuresByUser: mapToUsers(closuresByUser),
        followUpsTrend: followUps.map(r => ({ name: r.name, value: Number(r.value) })),
        totalSalesPersons,
        totalClosures,
        totalTasksCompleted
      };
    }

    let hrData = null;
    if (department && (department.toUpperCase() === 'HUMAN RESOURCE' || department.toUpperCase() === 'HUMAN_RESOURCE' || department.toUpperCase() === 'HR')) {
      const interviewsQuery = `
        SELECT 
          DATE_FORMAT(r.created_at, '%b %Y') AS name,
          SUM(CAST(COALESCE(NULLIF(r.input, ''), '0') AS DECIMAL(10,2))) AS value,
          DATE_FORMAT(r.created_at, '%Y-%m') AS sortKey
        FROM checklist_item_response r
        JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
        JOIN checklist_items ci ON li.checklist_item_id = ci.id
        JOIN checklist_template_version v ON li.template_version_id = v.version_id
        JOIN checklist_template ct ON v.checklist_template_id = ct.id
        JOIN tags t ON ct.tag_id = t.id
        WHERE (t.user_position = ? OR t.user_position = 'HUMAN RESOURCE' OR t.user_position = 'HR')
          AND ci.checklist_name LIKE '%interview%conducted%'
          ${dateFilterSql}
        GROUP BY DATE_FORMAT(r.created_at, '%b %Y'), DATE_FORMAT(r.created_at, '%Y-%m')
        ORDER BY sortKey ASC
      `;

      const [interviewsTrend] = await Promise.all([
        prisma.$queryRawUnsafe(interviewsQuery, ...queryParams)
      ]);

      hrData = {
        interviewsTrend: interviewsTrend.map(r => ({ name: r.name, value: Number(r.value) }))
      };
    }

    let dtData = null;
    if (department && (department.toUpperCase() === 'DIGITAL TRANSFORMATION' || department.toUpperCase() === 'DIGITAL_TRANSFORMATION' || department.toUpperCase() === 'DT')) {
      const tasksCreatedQuery = `
        SELECT 
          DATE_FORMAT(r.created_at, '%b %Y') AS name,
          SUM(CAST(COALESCE(NULLIF(r.input, ''), '0') AS DECIMAL(10,2))) AS value,
          DATE_FORMAT(r.created_at, '%Y-%m') AS sortKey
        FROM checklist_item_response r
        JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
        JOIN checklist_items ci ON li.checklist_item_id = ci.id
        JOIN checklist_template_version v ON li.template_version_id = v.version_id
        JOIN checklist_template ct ON v.checklist_template_id = ct.id
        JOIN tags t ON ct.tag_id = t.id
        WHERE (t.user_position = ? OR t.user_position = 'DIGITAL TRANSFORMATION' OR t.user_position = 'DIGITAL_TRANSFORMATION')
          AND (ci.checklist_name LIKE '%task%created%' OR ci.checklist_name LIKE '%tasks%created%')
          ${dateFilterSql}
        GROUP BY DATE_FORMAT(r.created_at, '%b %Y'), DATE_FORMAT(r.created_at, '%Y-%m')
        ORDER BY sortKey ASC
      `;

      const [tasksCreatedTrend] = await Promise.all([
        prisma.$queryRawUnsafe(tasksCreatedQuery, ...queryParams)
      ]);

      const tasksCreatedItem = inputsResult.find(i => i.name.toLowerCase().includes('tasks created'));
      const tasksCreatedTotal = tasksCreatedItem ? Number(tasksCreatedItem.numeric_sum || 0) : 0;

      const tasksClosedItem = inputsResult.find(i => i.name.toLowerCase().includes('tasks closed'));
      const tasksClosedTotal = tasksClosedItem ? Number(tasksClosedItem.numeric_sum || 0) : 0;

      dtData = {
        tasksCreatedTrend: tasksCreatedTrend.map(r => ({ name: r.name, value: Number(r.value) })),
        tasksEntered: submissionsCount > 0 ? (tasksCreatedTotal / submissionsCount).toFixed(1) : 0,
        tasksCompleted: submissionsCount > 0 ? (tasksClosedTotal / submissionsCount).toFixed(1) : 0
      };
    }

    res.json({
      department,
      submissionsCount,
      latestSubmissionDate,
      checklistInputs,
      recentMonths,
      topKPIs,
      completionRate,
      ...(salesData ? { salesData } : {}),
      ...(hrData ? { hrData } : {}),
      ...(dtData ? { dtData } : {})
    });
  } catch (error) {
    console.error('Admin department error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Paginated Chart Data for Admin Department
router.get('/admin/department/:department/chart-data', authenticateToken, async (req, res) => {
  try {
    const { department } = req.params;
    const { startDate, endDate, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

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

    const query = `
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

    const paginatedQuery = `
      SELECT * FROM (${query}) as sub
      ORDER BY 
        CASE WHEN type = 'Numeric' THEN numeric_sum ELSE boolean_count END DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as total FROM (
        SELECT ci.checklist_name 
        FROM checklist_item_response r
        JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
        JOIN checklist_items ci ON li.checklist_item_id = ci.id
        JOIN checklist_template_version v ON li.template_version_id = v.version_id
        JOIN checklist_template ct ON v.checklist_template_id = ct.id
        JOIN tags t ON ct.tag_id = t.id
        WHERE t.user_position = ?
        ${dateFilterSql}
        GROUP BY ci.checklist_name, ci.input_type
      ) as sub
    `;

    const [paginatedStats, totalResult] = await Promise.all([
      prisma.$queryRawUnsafe(paginatedQuery, ...queryParams, limitNum, offset),
      prisma.$queryRawUnsafe(countQuery, ...queryParams)
    ]);

    const total = Number(totalResult[0]?.total || 0);

    const data = paginatedStats.map(row => {
      const name = row.name;
      const type = row.type;
      const value = type === 'Numeric' ? Number(row.numeric_sum) : Number(row.boolean_count);
      return { name, value, type };
    });

    res.json({
      data,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    console.error('Admin department chart-data error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get all users for admin user selector
router.get('/admin/users', authenticateToken, async (req, res) => {
  try {
    const authUserId = parseInt(req.user.userId);
    const requester = await prisma.organisation_Users.findUnique({
      where: { id: authUserId },
      select: { 
        user_type: true,
        User: { select: { email: true } }
      }
    });
    
    const isRequesterAdmin = 
      requester?.user_type?.trim() === 'ADMIN' || 
      requester?.User?.email === 'gururider35@gmail.com';

    if (!isRequesterAdmin) {
      return res.status(403).json({ error: 'Only admins can fetch user directory' });
    }

    const users = await prisma.organisation_Users.findMany({
      where: {
        NOT: {
          user_type: 'DISABLED'
        }
      },
      select: {
        id: true,
        user_type: true,
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        Organisation_User_position: {
          select: {
            user_position: true
          }
        }
      }
    });

    const formatted = users.map(u => {
      const positions = u.Organisation_User_position?.map(p => p.user_position) || [];
      const nonPublicPosition = positions.find(p => p !== 'PUBLIC');
      const mainPosition = nonPublicPosition || positions[0] || 'PUBLIC';

      return {
        id: u.id,
        realUserId: u.User?.id || 0,
        name: u.User?.name || 'User',
        email: u.User?.email || '',
        user_type: u.user_type?.trim() || 'USER',
        user_position: mainPosition,
        all_positions: positions
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

    res.json(formatted);
  } catch (error) {
    console.error('Admin users endpoint error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get paginated users for admin user management
router.get('/admin/users-list', authenticateToken, async (req, res) => {
  try {
    const authUserId = parseInt(req.user.userId);
    const requester = await prisma.organisation_Users.findUnique({
      where: { id: authUserId },
      select: { 
        user_type: true,
        User: { select: { email: true } }
      }
    });
    
    const isRequesterAdmin = 
      requester?.user_type?.trim() === 'ADMIN' || 
      requester?.User?.email === 'gururider35@gmail.com';

    if (!isRequesterAdmin) {
      return res.status(403).json({ error: 'Only admins can access the user list' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;

    const { search, position, type } = req.query;
    const where = {};

    if (type) {
      where.user_type = type;
    }
    if (position) {
      where.user_position = position;
    }
    if (search) {
      where.User = {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } }
        ]
      };
    }

    const [total, users] = await Promise.all([
      prisma.organisation_Users.count({ where }),
      prisma.organisation_Users.findMany({
        where,
        orderBy: { id: 'desc' },
        skip,
        take: limit,
        include: {
          User: true,
          Organisation: true
        }
      })
    ]);

    const formatted = users.map(u => ({
      id: u.id,
      realUserId: u.User?.id || 0,
      name: u.User?.name || 'User',
      email: u.User?.email || '',
      image: u.User?.image || null,
      user_type: u.user_type?.trim() || 'USER',
      user_position: u.user_position || 'PUBLIC',
      organisation: u.Organisation?.organisation || '',
      organisation_id: u.organisation_id,
      created_at: u.created_at || u.User?.created_at
    }));

    res.json({
      users: formatted,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Admin users-list error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Edit user endpoint
router.put('/admin/users/:id', authenticateToken, async (req, res) => {
  try {
    const authUserId = parseInt(req.user.userId);
    const requester = await prisma.organisation_Users.findUnique({
      where: { id: authUserId },
      select: { 
        user_type: true,
        User: { select: { email: true } }
      }
    });
    const isRequesterAdmin = 
      requester?.user_type?.trim() === 'ADMIN' || 
      requester?.User?.email === 'gururider35@gmail.com';

    if (!isRequesterAdmin) {
      return res.status(403).json({ error: 'Only admins can edit users' });
    }

    const orgUserId = parseInt(req.params.id);
    const { name, user_position, user_type, organisation_id } = req.body;

    const orgUser = await prisma.organisation_Users.findUnique({
      where: { id: orgUserId },
      include: { User: true }
    });

    if (!orgUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update User table name if provided
    if (name && orgUser.User) {
      await prisma.user.update({
        where: { id: orgUser.User.id },
        data: { name }
      });
    }

    // Update Organisation_Users details
    await prisma.organisation_Users.update({
      where: { id: orgUserId },
      data: {
        user_position: user_position || undefined,
        user_type: user_type || undefined,
        organisation_id: organisation_id ? parseInt(organisation_id) : undefined
      }
    });

    // Sync Organisation_User_position model
    if (user_position) {
      const positionRecord = await prisma.organisation_User_position.findFirst({
        where: { organisation_user_id: orgUserId }
      });

      if (positionRecord) {
        await prisma.organisation_User_position.update({
          where: { id: positionRecord.id },
          data: { user_position }
        });
      } else {
        await prisma.organisation_User_position.create({
          data: {
            organisation_user_id: orgUserId,
            user_id: orgUser.User.id,
            user_position
          }
        });
      }
    }

    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('Admin edit user error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Disable user endpoint (formerly Delete)
router.delete('/admin/users/:id', authenticateToken, async (req, res) => {
  try {
    const authUserId = parseInt(req.user.userId);
    const requester = await prisma.organisation_Users.findUnique({
      where: { id: authUserId },
      select: { 
        user_type: true,
        User: { select: { email: true } }
      }
    });
    const isRequesterAdmin = 
      requester?.user_type?.trim() === 'ADMIN' || 
      requester?.User?.email === 'gururider35@gmail.com';

    if (!isRequesterAdmin) {
      return res.status(403).json({ error: 'Only admins can disable users' });
    }

    const orgUserId = parseInt(req.params.id);
    if (orgUserId === authUserId) {
      return res.status(400).json({ error: 'You cannot disable your own admin account.' });
    }

    // Set user_type to 'DISABLED'
    await prisma.organisation_Users.update({
      where: { id: orgUserId },
      data: { user_type: 'DISABLED' }
    });

    res.json({ success: true, message: 'User disabled successfully' });
  } catch (error) {
    console.error('Admin disable user error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Enable user endpoint
router.put('/admin/users/:id/enable', authenticateToken, async (req, res) => {
  try {
    const authUserId = parseInt(req.user.userId);
    const requester = await prisma.organisation_Users.findUnique({
      where: { id: authUserId },
      select: { 
        user_type: true,
        User: { select: { email: true } }
      }
    });
    const isRequesterAdmin = 
      requester?.user_type?.trim() === 'ADMIN' || 
      requester?.User?.email === 'gururider35@gmail.com';

    if (!isRequesterAdmin) {
      return res.status(403).json({ error: 'Only admins can enable users' });
    }

    const orgUserId = parseInt(req.params.id);
    await prisma.organisation_Users.update({
      where: { id: orgUserId },
      data: { user_type: 'USER' }
    });

    res.json({ success: true, message: 'User enabled successfully' });
  } catch (error) {
    console.error('Admin enable user error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get paginated submissions for Reports module
router.get('/reports', authenticateToken, async (req, res) => {
  try {
    const authUserId = parseInt(req.user.userId);
    const requester = await prisma.organisation_Users.findUnique({
      where: { id: authUserId },
      select: { 
        user_type: true,
        User: { select: { email: true } }
      }
    });
    
    const isRequesterAdmin = 
      requester?.user_type?.trim() === 'ADMIN' || 
      requester?.User?.email === 'gururider35@gmail.com';

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;
    
    const { search, position, startDate, endDate } = req.query;

    let dataQuery = `
      SELECT 
        cir.organisation_user_id,
        u.name AS user_name,
        u.email AS user_email,
        u.image AS user_image,
        ou.user_position,
        ct.id AS template_id,
        ct.template_name,
        COALESCE(NULLIF(cir.selected_date, ''), DATE_FORMAT(cir.created_at, '%Y-%m-%d')) AS checklist_date,
        DATE(MAX(cir.created_at)) AS submitted_day,
        MAX(cir.selected_date) AS selected_date,
        COUNT(cir.id) AS items_count,
        SUM(CASE 
          WHEN ci.input_type = 'Boolean' AND (cir.input = 'Yes' OR cir.input = '1' OR cir.input = 'true' OR cir.status = 1) THEN 1
          WHEN ci.input_type = 'Numeric' AND (cir.input IS NOT NULL AND cir.input != '') THEN 1
          ELSE 0 
        END) AS completed_count,
        MAX(cir.created_at) AS latest_created_at
      FROM checklist_item_response cir
      JOIN Organisation_Users ou ON cir.organisation_user_id = ou.id
      JOIN User u ON ou.user_id = u.id
      JOIN checklist_template_linked_items li ON cir.checklist_template_linked_items_id = li.id
      JOIN checklist_template_version v ON li.template_version_id = v.version_id
      JOIN checklist_template ct ON v.checklist_template_id = ct.id
      JOIN checklist_items ci ON li.checklist_item_id = ci.id
      WHERE 1=1
    `;

    const queryParams = [];
    const countParams = [];

    // Force regular users to see only their own submissions
    if (!isRequesterAdmin) {
      dataQuery += ` AND cir.organisation_user_id = ?`;
      queryParams.push(authUserId);
      countParams.push(authUserId);
    }

    if (search) {
      dataQuery += ` AND (u.name LIKE ? OR u.email LIKE ? OR ct.template_name LIKE ?)`;
      const likeSearch = `%${search}%`;
      queryParams.push(likeSearch, likeSearch, likeSearch);
      countParams.push(likeSearch, likeSearch, likeSearch);
    }

    if (position) {
      dataQuery += ` AND ou.user_position = ?`;
      queryParams.push(position);
      countParams.push(position);
    }

    if (startDate) {
      dataQuery += ` AND cir.created_at >= ?`;
      const dateVal = new Date(startDate);
      queryParams.push(dateVal);
      countParams.push(dateVal);
    }

    if (endDate) {
      dataQuery += ` AND cir.created_at <= ?`;
      const dateVal = new Date(endDate);
      queryParams.push(dateVal);
      countParams.push(dateVal);
    }

    dataQuery += `
      GROUP BY cir.organisation_user_id, ct.id, COALESCE(NULLIF(cir.selected_date, ''), DATE_FORMAT(cir.created_at, '%Y-%m-%d'))
      ORDER BY latest_created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as total FROM (
        SELECT cir.organisation_user_id
        FROM checklist_item_response cir
        JOIN Organisation_Users ou ON cir.organisation_user_id = ou.id
        JOIN User u ON ou.user_id = u.id
        JOIN checklist_template_linked_items li ON cir.checklist_template_linked_items_id = li.id
        JOIN checklist_template_version v ON li.template_version_id = v.version_id
        JOIN checklist_template ct ON v.checklist_template_id = ct.id
        WHERE 1=1
        ${!isRequesterAdmin ? ' AND cir.organisation_user_id = ?' : ''}
        ${search ? ' AND (u.name LIKE ? OR u.email LIKE ? OR ct.template_name LIKE ?)' : ''}
        ${position ? ' AND ou.user_position = ?' : ''}
        ${startDate ? ' AND cir.created_at >= ?' : ''}
        ${endDate ? ' AND cir.created_at <= ?' : ''}
        GROUP BY cir.organisation_user_id, ct.id, COALESCE(NULLIF(cir.selected_date, ''), DATE_FORMAT(cir.created_at, '%Y-%m-%d'))
      ) sub
    `;

    const [rows, totalResult] = await Promise.all([
      prisma.$queryRawUnsafe(dataQuery, ...queryParams, limit, skip),
      prisma.$queryRawUnsafe(countQuery, ...countParams)
    ]);

    const total = Number(totalResult[0]?.total || 0);

    const formatted = rows.map(r => ({
      organisation_user_id: Number(r.organisation_user_id),
      user_name: r.user_name,
      user_email: r.user_email,
      user_image: r.user_image,
      user_position: r.user_position,
      template_id: Number(r.template_id),
      template_name: r.template_name,
      submitted_day: r.submitted_day,
      selected_date: r.selected_date,
      checklist_date: r.checklist_date,
      items_count: Number(r.items_count),
      completed_count: Number(r.completed_count || 0),
      latest_created_at: r.latest_created_at
    }));

    res.json({
      reports: formatted,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Fetch reports error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get detail responses for a specific submission in Reports
router.get('/reports/detail', authenticateToken, async (req, res) => {
  try {
    const authUserId = parseInt(req.user.userId);
    const { userId, templateId, date } = req.query; // date in YYYY-MM-DD format
    
    const targetUserId = parseInt(userId);
    const targetTemplateId = parseInt(templateId);

    const requester = await prisma.organisation_Users.findUnique({
      where: { id: authUserId },
      select: { 
        user_type: true,
        User: { select: { email: true } }
      }
    });
    
    const isRequesterAdmin = 
      requester?.user_type?.trim() === 'ADMIN' || 
      requester?.User?.email === 'gururider35@gmail.com';

    if (authUserId !== targetUserId && !isRequesterAdmin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const rows = await prisma.$queryRaw`
      SELECT
        ci.checklist_name,
        ci.input_type,
        cir.input,
        cir.status,
        cir.comments,
        cir.selected_date,
        cir.created_at
      FROM checklist_item_response cir
      JOIN checklist_template_linked_items li ON cir.checklist_template_linked_items_id = li.id
      JOIN checklist_template_version v ON li.template_version_id = v.version_id
      JOIN checklist_items ci ON li.checklist_item_id = ci.id
      WHERE cir.organisation_user_id = ${targetUserId}
        AND v.checklist_template_id  = ${targetTemplateId}
        AND COALESCE(NULLIF(cir.selected_date, ''), DATE_FORMAT(cir.created_at, '%Y-%m-%d')) = ${date}
      ORDER BY ci.checklist_name ASC
    `;

    res.json(rows.map(r => ({
      checklist_name: r.checklist_name,
      input_type: r.input_type,
      input: r.input,
      status: r.status === true || 
              r.status === 1 || 
              r.status === '1' || 
              !!(r.input && (
                r.input.trim().toLowerCase() === 'yes' || 
                r.input.trim() === '1' || 
                r.input.trim().toLowerCase() === 'true'
              )),
      comments: r.comments || null,
      selected_date: r.selected_date,
      created_at: r.created_at
    })));
  } catch (error) {
    console.error('Fetch report detail error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get Department-wise Reports
router.get('/reports/departments', authenticateToken, async (req, res) => {
  try {
    const authUserId = parseInt(req.user.userId);
    const requester = await prisma.organisation_Users.findUnique({
      where: { id: authUserId },
      select: { user_type: true }
    });
    
    const isRequesterAdmin = requester?.user_type?.trim() === 'ADMIN';
    if (!isRequesterAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { startDate, endDate, search, page = 1, limit = 15 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let queryParams = [];

    let baseQuery = `
      SELECT 
        COALESCE(oup.user_position, 'PUBLIC') AS department,
        COUNT(DISTINCT CASE WHEN cir.id IS NOT NULL THEN CONCAT(ou.id, '-', ct.id, '-', DATE(cir.created_at)) END) AS total_submissions,
        COALESCE(ROUND(AVG(
          CASE 
            WHEN ci.input_type = 'Boolean' AND (cir.input = 'Yes' OR cir.input = '1' OR cir.input = 'true' OR cir.status = 1) THEN 1
            WHEN ci.input_type = 'Numeric' AND (cir.input IS NOT NULL AND cir.input != '') THEN 1
            ELSE 0 
          END
        ) * 100, 1), 0) AS avg_completion_rate,
        COUNT(DISTINCT ou.id) AS total_users
      FROM Organisation_Users ou
      LEFT JOIN Organisation_User_position oup ON ou.id = oup.organisation_user_id
      LEFT JOIN checklist_item_response cir ON ou.id = cir.organisation_user_id
    `;

    if (startDate) {
      baseQuery += ` AND cir.created_at >= ?`;
      queryParams.push(new Date(startDate));
    }
    if (endDate) {
      baseQuery += ` AND cir.created_at <= ?`;
      queryParams.push(new Date(endDate));
    }

    baseQuery += `
      LEFT JOIN checklist_template_linked_items li ON cir.checklist_template_linked_items_id = li.id
      LEFT JOIN checklist_template_version v ON li.template_version_id = v.version_id
      LEFT JOIN checklist_template ct ON v.checklist_template_id = ct.id
      LEFT JOIN checklist_items ci ON li.checklist_item_id = ci.id
      GROUP BY COALESCE(oup.user_position, 'PUBLIC')
    `;

    let dataSql = `
      SELECT * FROM (${baseQuery}) AS sub
      WHERE 1=1
    `;

    let countSql = `
      SELECT COUNT(*) AS total FROM (${baseQuery}) AS sub
      WHERE 1=1
    `;

    const countParams = [...queryParams];

    if (search) {
      dataSql += ` AND department LIKE ?`;
      countSql += ` AND department LIKE ?`;
      const likeSearch = `%${search}%`;
      queryParams.push(likeSearch);
      countParams.push(likeSearch);
    }

    dataSql += `
      ORDER BY total_submissions DESC
      LIMIT ? OFFSET ?
    `;
    queryParams.push(limitNum, skip);

    const [rows, countResult] = await Promise.all([
      prisma.$queryRawUnsafe(dataSql, ...queryParams),
      prisma.$queryRawUnsafe(countSql, ...countParams)
    ]);
    
    const total = Number(countResult[0]?.total || 0);

    const formatted = rows.map(r => ({
      department: r.department,
      total_submissions: Number(r.total_submissions),
      avg_completion_rate: Number(r.avg_completion_rate),
      total_users: Number(r.total_users)
    }));

    res.json({
      departments: formatted,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    console.error('Fetch department reports error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get Template-wise Reports
router.get('/reports/templates', authenticateToken, async (req, res) => {
  try {
    const authUserId = parseInt(req.user.userId);
    const requester = await prisma.organisation_Users.findUnique({
      where: { id: authUserId },
      select: { user_type: true }
    });
    
    const isRequesterAdmin = requester?.user_type?.trim() === 'ADMIN';
    if (!isRequesterAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { startDate, endDate, search, page = 1, limit = 15 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let queryParams = [];

    let baseQuery = `
      SELECT 
        ct.id AS template_id,
        ct.template_name,
        ct.priority,
        ct.created_at AS template_created_at,
        u_creator.name AS creator_name,
        COALESCE(u_owner.name, u_creator.name) AS owner_name,
        COUNT(DISTINCT CASE WHEN cir.id IS NOT NULL THEN CONCAT(cir.organisation_user_id, '-', DATE(cir.created_at)) END) AS total_submissions,
        COALESCE(ROUND(AVG(
          CASE 
            WHEN ci.input_type = 'Boolean' AND (cir.input = 'Yes' OR cir.input = '1' OR cir.input = 'true' OR cir.status = 1) THEN 1
            WHEN ci.input_type = 'Numeric' AND (cir.input IS NOT NULL AND cir.input != '') THEN 1
            ELSE 0 
          END
        ) * 100, 1), 0) AS avg_completion_rate,
        COUNT(cir.id) AS total_responses
      FROM checklist_template ct
      LEFT JOIN Organisation_Users ou_creator ON ct.organisation_user_id = ou_creator.id
      LEFT JOIN User u_creator ON ou_creator.user_id = u_creator.id
      LEFT JOIN checklist_template_owners cto ON ct.id = cto.checklist_template_id
      LEFT JOIN Organisation_Users ou_owner ON cto.organisation_user_id = ou_owner.id
      LEFT JOIN User u_owner ON ou_owner.user_id = u_owner.id
      LEFT JOIN checklist_template_version v ON ct.id = v.checklist_template_id
      LEFT JOIN checklist_template_linked_items li ON v.version_id = li.template_version_id
      LEFT JOIN checklist_item_response cir ON li.id = cir.checklist_template_linked_items_id
      LEFT JOIN checklist_items ci ON li.checklist_item_id = ci.id
    `;

    if (startDate) {
      baseQuery += ` AND cir.created_at >= ?`;
      queryParams.push(new Date(startDate));
    }
    if (endDate) {
      baseQuery += ` AND cir.created_at <= ?`;
      queryParams.push(new Date(endDate));
    }

    baseQuery += `
      GROUP BY ct.id, ct.template_name, ct.priority, ct.created_at, u_creator.name, u_owner.name
    `;

    let dataSql = `
      SELECT * FROM (${baseQuery}) AS sub
      WHERE 1=1
    `;

    let countSql = `
      SELECT COUNT(*) AS total FROM (${baseQuery}) AS sub
      WHERE 1=1
    `;

    const countParams = [...queryParams];

    if (search) {
      dataSql += ` AND (template_name LIKE ? OR creator_name LIKE ? OR owner_name LIKE ?)`;
      countSql += ` AND (template_name LIKE ? OR creator_name LIKE ? OR owner_name LIKE ?)`;
      const likeSearch = `%${search}%`;
      queryParams.push(likeSearch, likeSearch, likeSearch);
      countParams.push(likeSearch, likeSearch, likeSearch);
    }

    dataSql += `
      ORDER BY total_submissions DESC
      LIMIT ? OFFSET ?
    `;
    queryParams.push(limitNum, skip);

    const [rows, countResult] = await Promise.all([
      prisma.$queryRawUnsafe(dataSql, ...queryParams),
      prisma.$queryRawUnsafe(countSql, ...countParams)
    ]);
    
    const total = Number(countResult[0]?.total || 0);

    const formatted = rows.map(r => ({
      template_id: Number(r.template_id),
      template_name: r.template_name,
      priority: r.priority,
      template_created_at: r.template_created_at,
      creator_name: r.creator_name || 'System',
      owner_name: r.owner_name || r.creator_name || 'System',
      total_submissions: Number(r.total_submissions),
      avg_completion_rate: Number(r.avg_completion_rate),
      total_responses: Number(r.total_responses)
    }));

    res.json({
      templates: formatted,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    console.error('Fetch template reports error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get Tag-wise Reports
router.get('/reports/tags', authenticateToken, async (req, res) => {
  try {
    const authUserId = parseInt(req.user.userId);
    const requester = await prisma.organisation_Users.findUnique({
      where: { id: authUserId },
      select: { user_type: true }
    });
    
    const isRequesterAdmin = requester?.user_type?.trim() === 'ADMIN';
    if (!isRequesterAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { startDate, endDate } = req.query;
    let queryParams = [];

    let tagStatsSql = `
      SELECT 
        t.id AS tag_id,
        t.tag_name,
        t.description,
        t.created_at AS tag_created_at,
        t.user_position,
        t.recurrent,
        u_creator.name AS creator_name,
        COUNT(DISTINCT CASE WHEN cir.id IS NOT NULL THEN CONCAT(cir.organisation_user_id, '-', DATE(cir.created_at)) END) AS total_submissions,
        COALESCE(ROUND(AVG(
          CASE 
            WHEN ci.input_type = 'Boolean' AND (cir.input = 'Yes' OR cir.input = '1' OR cir.input = 'true' OR cir.status = 1) THEN 1
            WHEN ci.input_type = 'Numeric' AND (cir.input IS NOT NULL AND cir.input != '') THEN 1
            ELSE 0 
          END
        ) * 100, 1), 0) AS avg_completion_rate
      FROM tags t
      LEFT JOIN Organisation_Users ou_creator ON t.organisation_user_id = ou_creator.id
      LEFT JOIN User u_creator ON ou_creator.user_id = u_creator.id
      LEFT JOIN checklist_template ct ON t.id = ct.tag_id
      LEFT JOIN checklist_template_version v ON ct.id = v.checklist_template_id
      LEFT JOIN checklist_template_linked_items li ON v.version_id = li.template_version_id
      LEFT JOIN checklist_item_response cir ON li.id = cir.checklist_template_linked_items_id
      LEFT JOIN checklist_items ci ON li.checklist_item_id = ci.id
      WHERE 1=1
    `;

    if (startDate) {
      tagStatsSql += ` AND cir.created_at >= ?`;
      queryParams.push(new Date(startDate));
    }
    if (endDate) {
      tagStatsSql += ` AND cir.created_at <= ?`;
      queryParams.push(new Date(endDate));
    }

    tagStatsSql += `
      GROUP BY t.id, t.tag_name, t.description, t.created_at, t.user_position, t.recurrent, u_creator.name
      ORDER BY total_submissions DESC, t.tag_name ASC
    `;

    let templateQueryParams = [];
    let templatesQuery = `
      SELECT 
        ct.id AS template_id,
        ct.template_name,
        ct.priority,
        ct.created_at AS created_at,
        ct.tag_id,
        u_creator.name AS creator_name,
        COALESCE(u_owner.name, u_creator.name) AS owner_name,
        COUNT(DISTINCT CASE WHEN cir.id IS NOT NULL THEN CONCAT(cir.organisation_user_id, '-', DATE(cir.created_at)) END) AS total_submissions,
        COALESCE(ROUND(AVG(
          CASE 
            WHEN ci.input_type = 'Boolean' AND (cir.input = 'Yes' OR cir.input = '1' OR cir.input = 'true' OR cir.status = 1) THEN 1
            WHEN ci.input_type = 'Numeric' AND (cir.input IS NOT NULL AND cir.input != '') THEN 1
            ELSE 0 
          END
        ) * 100, 1), 0) AS avg_completion_rate,
        COUNT(cir.id) AS total_responses
      FROM checklist_template ct
      LEFT JOIN Organisation_Users ou_creator ON ct.organisation_user_id = ou_creator.id
      LEFT JOIN User u_creator ON ou_creator.user_id = u_creator.id
      LEFT JOIN checklist_template_owners cto ON ct.id = cto.checklist_template_id
      LEFT JOIN Organisation_Users ou_owner ON cto.organisation_user_id = ou_owner.id
      LEFT JOIN User u_owner ON ou_owner.user_id = u_owner.id
      LEFT JOIN checklist_template_version v ON ct.id = v.checklist_template_id
      LEFT JOIN checklist_template_linked_items li ON v.version_id = li.template_version_id
      LEFT JOIN checklist_item_response cir ON li.id = cir.checklist_template_linked_items_id
      LEFT JOIN checklist_items ci ON li.checklist_item_id = ci.id
      WHERE 1=1
    `;

    if (startDate) {
      templatesQuery += ` AND cir.created_at >= ?`;
      templateQueryParams.push(new Date(startDate));
    }
    if (endDate) {
      templatesQuery += ` AND cir.created_at <= ?`;
      templateQueryParams.push(new Date(endDate));
    }

    templatesQuery += `
      GROUP BY ct.id, ct.template_name, ct.priority, ct.created_at, ct.tag_id, u_creator.name, u_owner.name
    `;

    const [tagStats, templates] = await Promise.all([
      prisma.$queryRawUnsafe(tagStatsSql, ...queryParams),
      prisma.$queryRawUnsafe(templatesQuery, ...templateQueryParams)
    ]);

    const formatted = tagStats.map(tag => {
      const connectedTemplates = templates
        .filter(t => Number(t.tag_id) === Number(tag.tag_id))
        .map(t => ({
          template_id: Number(t.template_id),
          template_name: t.template_name,
          priority: t.priority,
          created_at: t.created_at,
          creator_name: t.creator_name || 'System',
          owner_name: t.owner_name || t.creator_name || 'System',
          total_submissions: Number(t.total_submissions),
          avg_completion_rate: Number(t.avg_completion_rate),
          total_responses: Number(t.total_responses)
        }));

      return {
        tag_id: Number(tag.tag_id),
        tag_name: tag.tag_name,
        description: tag.description,
        tag_created_at: tag.tag_created_at,
        user_position: tag.user_position,
        recurrent: tag.recurrent,
        creator_name: tag.creator_name || 'System',
        templates_count: connectedTemplates.length,
        templates: connectedTemplates,
        total_submissions: Number(tag.total_submissions),
        avg_completion_rate: Number(tag.avg_completion_rate)
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Fetch tag reports error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get User-wise Reports (Paginated)
router.get('/reports/users', authenticateToken, async (req, res) => {
  try {
    const authUserId = parseInt(req.user.userId);
    const requester = await prisma.organisation_Users.findUnique({
      where: { id: authUserId },
      select: { user_type: true }
    });
    
    const isRequesterAdmin = requester?.user_type?.trim() === 'ADMIN';
    if (!isRequesterAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { startDate, endDate, search, page = 1, limit = 15 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    let queryParams = [];

    // Base query
    let baseSql = `
      FROM Organisation_Users ou
      JOIN User u ON ou.user_id = u.id
      LEFT JOIN checklist_item_response cir ON ou.id = cir.organisation_user_id
    `;

    if (startDate) {
      baseSql += ` AND cir.created_at >= ?`;
      queryParams.push(new Date(startDate));
    }
    if (endDate) {
      baseSql += ` AND cir.created_at <= ?`;
      queryParams.push(new Date(endDate));
    }

    baseSql += `
      LEFT JOIN checklist_template_linked_items li ON cir.checklist_template_linked_items_id = li.id
      LEFT JOIN checklist_template_version v ON li.template_version_id = v.version_id
      LEFT JOIN checklist_template ct ON v.checklist_template_id = ct.id
      LEFT JOIN checklist_items ci ON li.checklist_item_id = ci.id
      WHERE 1=1
    `;

    if (search) {
      baseSql += ` AND (u.name LIKE ? OR u.email LIKE ?)`;
      const likeSearch = `%${search}%`;
      queryParams.push(likeSearch, likeSearch);
    }

    let dataSql = `
      SELECT 
        ou.id AS user_id,
        u.name AS user_name,
        u.email AS user_email,
        u.image AS user_image,
        ou.user_position,
        COUNT(DISTINCT CASE WHEN cir.id IS NOT NULL THEN CONCAT(ct.id, '-', DATE(cir.created_at)) END) AS total_submissions,
        COALESCE(ROUND(AVG(
          CASE 
            WHEN ci.input_type = 'Boolean' AND (cir.input = 'Yes' OR cir.input = '1' OR cir.input = 'true' OR cir.status = 1) THEN 1
            WHEN ci.input_type = 'Numeric' AND (cir.input IS NOT NULL AND cir.input != '') THEN 1
            ELSE 0 
          END
        ) * 100, 1), 0) AS avg_completion_rate,
        MAX(cir.created_at) AS last_submission_date
      ${baseSql}
      GROUP BY ou.id, u.name, u.email, u.image, ou.user_position
      ORDER BY total_submissions DESC
      LIMIT ? OFFSET ?
    `;

    let countSql = `
      SELECT COUNT(DISTINCT ou.id) as total
      ${baseSql}
    `;

    // Clone queryParams for count query (which doesn't have LIMIT and OFFSET)
    const countParams = [...queryParams];
    
    // Add LIMIT and OFFSET for data SQL
    queryParams.push(limitNum, skip);

    const [rows, countResult] = await Promise.all([
      prisma.$queryRawUnsafe(dataSql, ...queryParams),
      prisma.$queryRawUnsafe(countSql, ...countParams)
    ]);

    const total = Number(countResult[0]?.total || 0);

    const formatted = rows.map(r => ({
      user_id: Number(r.user_id),
      user_name: r.user_name,
      user_email: r.user_email,
      user_image: r.user_image,
      user_position: r.user_position,
      total_submissions: Number(r.total_submissions),
      avg_completion_rate: Number(r.avg_completion_rate),
      last_submission_date: r.last_submission_date
    }));

    res.json({
      users: formatted,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    console.error('Fetch user reports error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
