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
      prisma.checklist_item_response.count({ 
        where: {
          ...(Object.keys(dateFilter).length ? dateFilter : {}),
          user: {
            OR: [
              { exclude_from_reports: null },
              { exclude_from_reports: false }
            ]
          }
        }
      }),
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
        where: {
          Organisation_Users: {
            user_type: { not: 'DISABLED' }
          }
        },
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
      JOIN Organisation_Users ou ON r.organisation_user_id = ou.id
      WHERE (ou.exclude_from_reports IS NULL OR ou.exclude_from_reports = FALSE)
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
      LEFT JOIN Organisation_Users ou ON o.id = ou.organisation_id AND (ou.exclude_from_reports IS NULL OR ou.exclude_from_reports = FALSE)
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
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message,
      stack: error.stack
    });
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
    
    let dbPosition = department;
    if (department && (department.toUpperCase() === 'DEVELOPMENT' || department.toUpperCase() === 'DEV' || department.toUpperCase() === 'FULL_STACK_DEVELOPER')) {
      dbPosition = 'FULL_STACK_DEVELOPER';
    }
    if (department && (department.toUpperCase() === 'MARKETING' || department.toUpperCase() === 'MARKETTNG')) {
      dbPosition = 'MARKETING';
    }
    if (department && (department.toUpperCase() === 'POWER_BI_DEVELOPER' || department.toUpperCase() === 'POWER BI DEVELOPER' || department.toUpperCase() === 'DATA_ANALYTICS' || department.toUpperCase() === 'DATA ANALYTICS')) {
      dbPosition = 'POWER_BI_DEVELOPER';
    }

    if (department && (department.toUpperCase() === 'TESTING' || department.toUpperCase() === 'QA TESTING' || department.toUpperCase() === 'QA_TESTING')) {
      dbPosition = 'TESTING';
    }
    const isErodeIntern = department && (department.toUpperCase() === 'ERODE_INTERN' || department.toUpperCase() === 'ERODE_INTERNS' || department.toUpperCase() === 'ERODE INTERNS');

    let internOrgUserIds = [];
    let internOrgUserIdsCsv = '0';
    if (isErodeIntern) {
      dbPosition = 'ERODE_INTERN';
      const interns = await prisma.organisation_User_position.findMany({
        where: { user_position: 'ERODE_INTERN' },
        select: { organisation_user_id: true }
      });
      internOrgUserIds = interns.map(i => i.organisation_user_id);
      internOrgUserIdsCsv = internOrgUserIds.length > 0 ? internOrgUserIds.join(',') : '0';
    }

    let filterConditionSql = '';
    let queryParams = [];
    if (isErodeIntern) {
      filterConditionSql = `r.organisation_user_id IN (${internOrgUserIdsCsv})`;
    } else {
      filterConditionSql = `t.user_position = ?`;
      queryParams.push(dbPosition);
    }

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
      JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
      JOIN checklist_template_version v ON li.template_version_id = v.version_id
      JOIN checklist_template ct ON v.checklist_template_id = ct.id
      JOIN tags t ON ct.tag_id = t.id
      WHERE ${filterConditionSql}
        AND (ou.exclude_from_reports IS NULL OR ou.exclude_from_reports = FALSE)
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
      JOIN Organisation_Users ou ON r.organisation_user_id = ou.id
      JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
      JOIN checklist_items ci ON li.checklist_item_id = ci.id
      JOIN checklist_template_version v ON li.template_version_id = v.version_id
      JOIN checklist_template ct ON v.checklist_template_id = ct.id
      JOIN tags t ON ct.tag_id = t.id
      WHERE ${filterConditionSql}
        AND (ou.exclude_from_reports IS NULL OR ou.exclude_from_reports = FALSE)
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
      JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
      JOIN checklist_template_version v ON li.template_version_id = v.version_id
      JOIN checklist_template ct ON v.checklist_template_id = ct.id
      JOIN tags t ON ct.tag_id = t.id
      WHERE ${filterConditionSql}
        AND (ou.exclude_from_reports IS NULL OR ou.exclude_from_reports = FALSE)
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
      JOIN Organisation_Users ou ON r.organisation_user_id = ou.id
      JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
      JOIN checklist_items ci ON li.checklist_item_id = ci.id
      JOIN checklist_template_version v ON li.template_version_id = v.version_id
      JOIN checklist_template ct ON v.checklist_template_id = ct.id
      JOIN tags t ON ct.tag_id = t.id
      WHERE ${filterConditionSql}
        AND (ou.exclude_from_reports IS NULL OR ou.exclude_from_reports = FALSE)
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

    let salesQualificationData = null;
    if (department && department.toUpperCase() === 'SALES') {
      // KPI: Total client qualification submissions from 'Sales Qualification' template
      const sqSubmissionsQuery = `
        SELECT COUNT(DISTINCT r.id) AS totalQualifications
        FROM checklist_item_response r
        JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
        JOIN checklist_template_version v ON li.template_version_id = v.version_id
        JOIN checklist_template ct ON v.checklist_template_id = ct.id
        WHERE ct.template_name = 'Sales Qualification'
        ${dateFilterSql.replace(/t\.user_position/g, 'ct.id IS NOT NULL AND 1')}
      `;

      // Use a simpler query that doesn't rely on dateFilterSql format issues
      const sqKpiQuery = `
        SELECT
          SUM(CASE WHEN ci.checklist_name = 'Qualified?' AND (r.input = 'Yes' OR r.input = '1' OR r.status = 1) THEN 1 ELSE 0 END) AS qualifiedCount,
          COUNT(DISTINCT CASE WHEN ci.checklist_name = 'Qualified?' THEN r.organisation_user_id END) AS totalQualifications,
          AVG(CASE WHEN ci.checklist_name = 'How long we will have to wait before we can send a proposal?' AND r.input IS NOT NULL AND r.input != '' THEN CAST(r.input AS DECIMAL(10,2)) END) AS avgWaitBeforeProposal,
          AVG(CASE WHEN ci.checklist_name = 'Duration of call/meeting  in hours before showing interest/not showing interest ' AND r.input IS NOT NULL AND r.input != '' THEN CAST(r.input AS DECIMAL(10,2)) END) AS avgCallDuration
        FROM checklist_item_response r
        JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
        JOIN checklist_items ci ON li.checklist_item_id = ci.id
        JOIN checklist_template_version v ON li.template_version_id = v.version_id
        JOIN checklist_template ct ON v.checklist_template_id = ct.id
        WHERE ct.template_name = 'Sales Qualification'
      `;

      // Boolean gauge: Has budget? - count yes vs total
      const hasBudgetQuery = `
        SELECT
          SUM(CASE WHEN (r.input = 'Yes' OR r.input = '1' OR r.status = 1) THEN 1 ELSE 0 END) AS yesCount,
          COUNT(r.id) AS totalCount
        FROM checklist_item_response r
        JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
        JOIN checklist_items ci ON li.checklist_item_id = ci.id
        JOIN checklist_template_version v ON li.template_version_id = v.version_id
        JOIN checklist_template ct ON v.checklist_template_id = ct.id
        WHERE ct.template_name = 'Sales Qualification'
          AND ci.checklist_name = 'Has budget?'
      `;

      // Boolean gauge: Prospect received brochure?
      const brochureQuery = `
        SELECT
          SUM(CASE WHEN (r.input = 'Yes' OR r.input = '1' OR r.status = 1) THEN 1 ELSE 0 END) AS yesCount,
          COUNT(r.id) AS totalCount
        FROM checklist_item_response r
        JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
        JOIN checklist_items ci ON li.checklist_item_id = ci.id
        JOIN checklist_template_version v ON li.template_version_id = v.version_id
        JOIN checklist_template ct ON v.checklist_template_id = ct.id
        WHERE ct.template_name = 'Sales Qualification'
          AND ci.checklist_name = 'Prospect received a brochure?'
      `;

      // Boolean gauge: is this a referral?
      const referralQuery = `
        SELECT
          SUM(CASE WHEN (r.input = 'Yes' OR r.input = '1' OR r.status = 1) THEN 1 ELSE 0 END) AS yesCount,
          COUNT(r.id) AS totalCount
        FROM checklist_item_response r
        JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
        JOIN checklist_items ci ON li.checklist_item_id = ci.id
        JOIN checklist_template_version v ON li.template_version_id = v.version_id
        JOIN checklist_template ct ON v.checklist_template_id = ct.id
        WHERE ct.template_name = 'Sales Qualification'
          AND ci.checklist_name = 'is this a referral?'
      `;

      // Area trend: Agreed for follow up meeting? over time
      const followUpMeetingTrendQuery = `
        SELECT
          DATE_FORMAT(r.created_at, '%b %Y') AS name,
          SUM(CASE WHEN (r.input = 'Yes' OR r.input = '1' OR r.status = 1) THEN 1 ELSE 0 END) AS value,
          DATE_FORMAT(r.created_at, '%Y-%m') AS sortKey
        FROM checklist_item_response r
        JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
        JOIN checklist_items ci ON li.checklist_item_id = ci.id
        JOIN checklist_template_version v ON li.template_version_id = v.version_id
        JOIN checklist_template ct ON v.checklist_template_id = ct.id
        WHERE ct.template_name = 'Sales Qualification'
          AND ci.checklist_name = 'Agreed for a follow up meeting?'
        GROUP BY DATE_FORMAT(r.created_at, '%b %Y'), DATE_FORMAT(r.created_at, '%Y-%m')
        ORDER BY sortKey ASC
      `;

      const [sqKpiResult, hasBudgetResult, brochureResult, referralResult, followUpMeetingResult] = await Promise.all([
        prisma.$queryRawUnsafe(sqKpiQuery),
        prisma.$queryRawUnsafe(hasBudgetQuery),
        prisma.$queryRawUnsafe(brochureQuery),
        prisma.$queryRawUnsafe(referralQuery),
        prisma.$queryRawUnsafe(followUpMeetingTrendQuery)
      ]);

      const sqKpi = sqKpiResult[0] || {};
      const hasBudget = hasBudgetResult[0] || {};
      const brochure = brochureResult[0] || {};
      const referral = referralResult[0] || {};

      const calcPercent = (row) => {
        const yes = Number(row.yesCount || 0);
        const total = Number(row.totalCount || 0);
        return total > 0 ? Math.round((yes / total) * 100) : 0;
      };

      salesQualificationData = {
        totalQualifications: Number(sqKpi.totalQualifications || 0),
        qualifiedCount: Number(sqKpi.qualifiedCount || 0),
        avgWaitBeforeProposal: Number(sqKpi.avgWaitBeforeProposal || 0).toFixed(1),
        avgCallDuration: Number(sqKpi.avgCallDuration || 0).toFixed(1),
        hasBudgetPercent: calcPercent(hasBudget),
        brochurePercent: calcPercent(brochure),
        referralPercent: calcPercent(referral),
        followUpMeetingTrend: followUpMeetingResult.map(r => ({ name: r.name, value: Number(r.value || 0) }))
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

    let marketingData = null;
    if (department && (department.toUpperCase() === 'MARKETING' || department.toUpperCase() === 'MARKETTNG')) {
      const marketingQueryParams = ['MARKETING'];
      if (startDate) {
        marketingQueryParams.push(new Date(startDate));
      }
      if (endDate) {
        marketingQueryParams.push(new Date(endDate));
      }

      const numericTrendQuery = (itemName) => `
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
          AND ci.checklist_name = '${itemName}'
          ${dateFilterSql}
        GROUP BY DATE_FORMAT(r.created_at, '%b %Y'), DATE_FORMAT(r.created_at, '%Y-%m')
        ORDER BY sortKey ASC
      `;

      const booleanTrendQuery = (itemName) => `
        SELECT 
          DATE_FORMAT(r.created_at, '%b %Y') AS name,
          SUM(CASE WHEN (r.input = 'Yes' OR r.input = '1' OR r.input = 'true' OR r.status = 1) THEN 1 ELSE 0 END) AS value,
          DATE_FORMAT(r.created_at, '%Y-%m') AS sortKey
        FROM checklist_item_response r
        JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
        JOIN checklist_items ci ON li.checklist_item_id = ci.id
        JOIN checklist_template_version v ON li.template_version_id = v.version_id
        JOIN checklist_template ct ON v.checklist_template_id = ct.id
        JOIN tags t ON ct.tag_id = t.id
        WHERE t.user_position = ?
          AND ci.checklist_name = '${itemName}'
          ${dateFilterSql}
        GROUP BY DATE_FORMAT(r.created_at, '%b %Y'), DATE_FORMAT(r.created_at, '%Y-%m')
        ORDER BY sortKey ASC
      `;

      const goalAchievementQuery = `
        SELECT 
          COUNT(r.id) AS total_count,
          SUM(CASE WHEN (r.input = 'Yes' OR r.input = '1' OR r.input = 'true' OR r.status = 1) THEN 1 ELSE 0 END) AS yes_count
        FROM checklist_item_response r
        JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
        JOIN checklist_items ci ON li.checklist_item_id = ci.id
        JOIN checklist_template_version v ON li.template_version_id = v.version_id
        JOIN checklist_template ct ON v.checklist_template_id = ct.id
        JOIN tags t ON ct.tag_id = t.id
        WHERE t.user_position = ?
          AND ci.checklist_name = 'Met Goal?'
          ${dateFilterSql}
      `;

      const [
        impressionsTrend,
        clicksTrend,
        conversionsTrend,
        employeesTrend,
        campaignsTrend,
        partnersTrend,
        boostTrend,
        goalResult
      ] = await Promise.all([
        prisma.$queryRawUnsafe(numericTrendQuery('Number of impressions'), ...marketingQueryParams),
        prisma.$queryRawUnsafe(numericTrendQuery('Number of clicks on CTA'), ...marketingQueryParams),
        prisma.$queryRawUnsafe(numericTrendQuery('Number of-Conversions'), ...marketingQueryParams),
        prisma.$queryRawUnsafe(booleanTrendQuery('Reaction from majority of employees?'), ...marketingQueryParams),
        prisma.$queryRawUnsafe(booleanTrendQuery('Campaign launched? (Unique identifier used in URL)'), ...marketingQueryParams),
        prisma.$queryRawUnsafe(booleanTrendQuery('Reaction from Partners?'), ...marketingQueryParams),
        prisma.$queryRawUnsafe(booleanTrendQuery('Boost/ Follow up required?'), ...marketingQueryParams),
        prisma.$queryRawUnsafe(goalAchievementQuery, ...marketingQueryParams)
      ]);

      const conversionsTotal = conversionsTrend.reduce((acc, curr) => acc + Number(curr.value || 0), 0);
      const ctaClicksTotal = clicksTrend.reduce((acc, curr) => acc + Number(curr.value || 0), 0);
      const impressionsTotal = impressionsTrend.reduce((acc, curr) => acc + Number(curr.value || 0), 0);
      const campaignsCount = campaignsTrend.reduce((acc, curr) => acc + Number(curr.value || 0), 0);
      const boostsCount = boostTrend.reduce((acc, curr) => acc + Number(curr.value || 0), 0);

      const totalGoalResponses = Number(goalResult[0]?.total_count || 0);
      const yesGoalResponses = Number(goalResult[0]?.yes_count || 0);
      const goalAchievement = totalGoalResponses > 0 ? Number(((yesGoalResponses / totalGoalResponses) * 100).toFixed(1)) : 0;

      const funnel = [
        { stage: 'Impressions', value: impressionsTotal },
        { stage: 'CTA Clicks', value: ctaClicksTotal },
        { stage: 'Conversions', value: conversionsTotal }
      ];

      marketingData = {
        impressionsTrend: impressionsTrend.map(r => ({ name: r.name, value: Number(r.value) })),
        clicksTrend: clicksTrend.map(r => ({ name: r.name, value: Number(r.value) })),
        conversionsTrend: conversionsTrend.map(r => ({ name: r.name, value: Number(r.value) })),
        employeeReactions: employeesTrend.map(r => ({ name: r.name, value: Number(r.value) })),
        campaignsLaunched: campaignsTrend.map(r => ({ name: r.name, value: Number(r.value) })),
        partnerReactions: partnersTrend.map(r => ({ name: r.name, value: Number(r.value) })),
        boostsTrend: boostTrend.map(r => ({ name: r.name, value: Number(r.value) })),
        conversionsTotal,
        ctaClicksTotal,
        impressionsTotal,
        campaignsCount,
        boostsCount,
        goalAchievement,
        funnel
      };
    }

    let devData = null;
    if (dbPosition === 'FULL_STACK_DEVELOPER') {
      const devQueryParams = ['FULL_STACK_DEVELOPER'];
      if (startDate) {
        devQueryParams.push(new Date(startDate));
      }
      if (endDate) {
        devQueryParams.push(new Date(endDate));
      }

      const developersQuery = `
        SELECT COUNT(DISTINCT ou.user_id) AS devCount
        FROM checklist_item_response r
        JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
        JOIN checklist_template_version v ON li.template_version_id = v.version_id
        JOIN checklist_template ct ON v.checklist_template_id = ct.id
        JOIN tags t ON ct.tag_id = t.id
        JOIN Organisation_Users ou ON r.organisation_user_id = ou.id
        WHERE t.user_position = ?
          ${dateFilterSql}
      `;

      const distinctDaysQuery = `
        SELECT COUNT(DISTINCT DATE(r.created_at)) AS daysCount
        FROM checklist_item_response r
        JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
        JOIN checklist_template_version v ON li.template_version_id = v.version_id
        JOIN checklist_template ct ON v.checklist_template_id = ct.id
        JOIN tags t ON ct.tag_id = t.id
        WHERE t.user_position = ?
          ${dateFilterSql}
      `;

      const tasksCompletedTrendQuery = `
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
          AND ci.checklist_name = 'No of Tasks Completed'
          ${dateFilterSql}
        GROUP BY DATE_FORMAT(r.created_at, '%b %Y'), DATE_FORMAT(r.created_at, '%Y-%m')
        ORDER BY sortKey ASC
      `;

      const tasksCompletedByUserQuery = `
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
          AND ci.checklist_name = 'No of Tasks Completed'
          ${dateFilterSql}
        GROUP BY u.name
        ORDER BY value DESC
      `;

      const deployedBuildTrendQuery = `
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
          AND ci.checklist_name = 'Deployed Build'
          ${dateFilterSql}
        GROUP BY DATE_FORMAT(r.created_at, '%b %Y'), DATE_FORMAT(r.created_at, '%Y-%m')
        ORDER BY sortKey ASC
      `;

      const deployedBuildByUserQuery = `
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
          AND ci.checklist_name = 'Deployed Build'
          ${dateFilterSql}
        GROUP BY u.name
        ORDER BY value DESC
      `;

      const [
        developersResult,
        distinctDaysResult,
        tasksCompletedTrend,
        tasksCompletedByUser,
        deployedBuildTrend,
        deployedBuildByUser
      ] = await Promise.all([
        prisma.$queryRawUnsafe(developersQuery, ...devQueryParams),
        prisma.$queryRawUnsafe(distinctDaysQuery, ...devQueryParams),
        prisma.$queryRawUnsafe(tasksCompletedTrendQuery, ...devQueryParams),
        prisma.$queryRawUnsafe(tasksCompletedByUserQuery, ...devQueryParams),
        prisma.$queryRawUnsafe(deployedBuildTrendQuery, ...devQueryParams),
        prisma.$queryRawUnsafe(deployedBuildByUserQuery, ...devQueryParams)
      ]);

      const developersCount = Number(developersResult[0]?.devCount || 0);
      const daysCount = Number(distinctDaysResult[0]?.daysCount || 0);
      const totalTasksCompleted = tasksCompletedTrend.reduce((acc, curr) => acc + Number(curr.value || 0), 0);
      const tasksPerDay = daysCount > 0 ? Number((totalTasksCompleted / daysCount).toFixed(1)) : 0;

      devData = {
        developersCount,
        tasksPerDay,
        tasksCompletedByUser: tasksCompletedByUser.map(r => ({ name: r.name, value: Number(r.value) })),
        deployedBuildTrend: deployedBuildTrend.map(r => ({ name: r.name, value: Number(r.value) })),
        deployedBuildByUser: deployedBuildByUser.map(r => ({ name: r.name, value: Number(r.value) }))
      };
    }

    let analyticsData = null;
    if (dbPosition === 'POWER_BI_DEVELOPER') {
      const analyticsQueryParams = ['POWER_BI_DEVELOPER'];
      if (startDate) {
        analyticsQueryParams.push(new Date(startDate));
      }
      if (endDate) {
        analyticsQueryParams.push(new Date(endDate));
      }

      const distinctDaysQuery = `
        SELECT COUNT(DISTINCT DATE(r.created_at)) AS daysCount
        FROM checklist_item_response r
        JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
        JOIN checklist_template_version v ON li.template_version_id = v.version_id
        JOIN checklist_template ct ON v.checklist_template_id = ct.id
        JOIN tags t ON ct.tag_id = t.id
        WHERE t.user_position = ?
          ${dateFilterSql}
      `;

      const totalTasksQuery = `
        SELECT SUM(CAST(COALESCE(NULLIF(r.input, ''), '0') AS DECIMAL(10,2))) AS totalTasks
        FROM checklist_item_response r
        JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
        JOIN checklist_items ci ON li.checklist_item_id = ci.id
        JOIN checklist_template_version v ON li.template_version_id = v.version_id
        JOIN checklist_template ct ON v.checklist_template_id = ct.id
        JOIN tags t ON ct.tag_id = t.id
        WHERE t.user_position = ?
          AND ci.checklist_name IN ('No of Tasks completed', 'Task Completed')
          ${dateFilterSql}
      `;

      const dashboardMonthlyQuery = `
        SELECT 
          DATE_FORMAT(r.created_at, '%b %Y') AS name,
          AVG(CAST(COALESCE(NULLIF(r.input, ''), '0') AS DECIMAL(10,2))) AS value,
          DATE_FORMAT(r.created_at, '%Y-%m') AS sortKey
        FROM checklist_item_response r
        JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
        JOIN checklist_items ci ON li.checklist_item_id = ci.id
        JOIN checklist_template_version v ON li.template_version_id = v.version_id
        JOIN checklist_template ct ON v.checklist_template_id = ct.id
        JOIN tags t ON ct.tag_id = t.id
        WHERE t.user_position = ?
          AND ci.checklist_name IN ('No of Dashboards Updated', 'No of dashboards created/updated', 'No of Dashboards Created')
          ${dateFilterSql}
        GROUP BY DATE_FORMAT(r.created_at, '%b %Y'), DATE_FORMAT(r.created_at, '%Y-%m')
        ORDER BY sortKey ASC
      `;

      const dashboardYearlyQuery = `
        SELECT 
          DATE_FORMAT(r.created_at, '%Y') AS name,
          AVG(CAST(COALESCE(NULLIF(r.input, ''), '0') AS DECIMAL(10,2))) AS value
        FROM checklist_item_response r
        JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
        JOIN checklist_items ci ON li.checklist_item_id = ci.id
        JOIN checklist_template_version v ON li.template_version_id = v.version_id
        JOIN checklist_template ct ON v.checklist_template_id = ct.id
        JOIN tags t ON ct.tag_id = t.id
        WHERE t.user_position = ?
          AND ci.checklist_name IN ('No of Dashboards Updated', 'No of dashboards created/updated', 'No of Dashboards Created')
          ${dateFilterSql}
        GROUP BY DATE_FORMAT(r.created_at, '%Y')
        ORDER BY name ASC
      `;

      const tasksCompletedByUserQuery = `
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
          AND ci.checklist_name IN ('No of Tasks completed', 'Task Completed')
          ${dateFilterSql}
        GROUP BY u.name
      `;

      const [distinctDaysResult, totalTasksResult, dashboardMonthlyResult, dashboardYearlyResult, tasksCompletedByUserResult] = await Promise.all([
        prisma.$queryRawUnsafe(distinctDaysQuery, ...analyticsQueryParams),
        prisma.$queryRawUnsafe(totalTasksQuery, ...analyticsQueryParams),
        prisma.$queryRawUnsafe(dashboardMonthlyQuery, ...analyticsQueryParams),
        prisma.$queryRawUnsafe(dashboardYearlyQuery, ...analyticsQueryParams),
        prisma.$queryRawUnsafe(tasksCompletedByUserQuery, ...analyticsQueryParams)
      ]);

      const daysCount = Number(distinctDaysResult[0]?.daysCount || 0);
      const totalTasks = Number(totalTasksResult[0]?.totalTasks || 0);
      const tasksPerDay = daysCount > 0 ? Number((totalTasks / daysCount).toFixed(1)) : 0;

      analyticsData = {
        tasksPerDay,
        dashboardUpdatedMonthly: dashboardMonthlyResult.map(r => ({ name: r.name, value: Number(Number(r.value || 0).toFixed(1)) })),
        dashboardUpdatedYearly: dashboardYearlyResult.map(r => ({ name: r.name, value: Number(Number(r.value || 0).toFixed(1)) })),
        tasksCompletedByUser: tasksCompletedByUserResult.map(r => ({ name: r.name, value: Number(r.value || 0) }))
      };
    }

    let testingData = null;
    if (dbPosition === 'TESTING') {
      const testingQueryParams = ['TESTING'];
      if (startDate) {
        testingQueryParams.push(new Date(startDate));
      }
      if (endDate) {
        testingQueryParams.push(new Date(endDate));
      }

      const distinctDaysQuery = `
        SELECT COUNT(DISTINCT DATE(r.created_at)) AS daysCount
        FROM checklist_item_response r
        JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
        JOIN checklist_template_version v ON li.template_version_id = v.version_id
        JOIN checklist_template ct ON v.checklist_template_id = ct.id
        JOIN tags t ON ct.tag_id = t.id
        WHERE t.user_position = ?
          ${dateFilterSql}
      `;

      const totalTasksQuery = `
        SELECT SUM(CAST(COALESCE(NULLIF(r.input, ''), '0') AS DECIMAL(10,2))) AS totalTasks
        FROM checklist_item_response r
        JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
        JOIN checklist_items ci ON li.checklist_item_id = ci.id
        JOIN checklist_template_version v ON li.template_version_id = v.version_id
        JOIN checklist_template ct ON v.checklist_template_id = ct.id
        JOIN tags t ON ct.tag_id = t.id
        WHERE t.user_position = ?
          AND ci.checklist_name IN ('No of Tasks Completed', 'No of Tasks Worked')
          ${dateFilterSql}
      `;

      const bugsMonthlyQuery = `
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
          AND ci.checklist_name IN ('Bugs identified during Manual testing', 'Number of bugs reported')
          ${dateFilterSql}
        GROUP BY DATE_FORMAT(r.created_at, '%b %Y'), DATE_FORMAT(r.created_at, '%Y-%m')
        ORDER BY sortKey ASC
      `;

      const bugsYearlyQuery = `
        SELECT 
          DATE_FORMAT(r.created_at, '%Y') AS name,
          SUM(CAST(COALESCE(NULLIF(r.input, ''), '0') AS DECIMAL(10,2))) AS value
        FROM checklist_item_response r
        JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
        JOIN checklist_items ci ON li.checklist_item_id = ci.id
        JOIN checklist_template_version v ON li.template_version_id = v.version_id
        JOIN checklist_template ct ON v.checklist_template_id = ct.id
        JOIN tags t ON ct.tag_id = t.id
        WHERE t.user_position = ?
          AND ci.checklist_name IN ('Bugs identified during Manual testing', 'Number of bugs reported')
          ${dateFilterSql}
        GROUP BY DATE_FORMAT(r.created_at, '%Y')
        ORDER BY name ASC
      `;

      const bugsDailyQuery = `
        SELECT 
          DATE_FORMAT(r.created_at, '%Y-%m-%d') AS name,
          SUM(CAST(COALESCE(NULLIF(r.input, ''), '0') AS DECIMAL(10,2))) AS value
        FROM checklist_item_response r
        JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
        JOIN checklist_items ci ON li.checklist_item_id = ci.id
        JOIN checklist_template_version v ON li.template_version_id = v.version_id
        JOIN checklist_template ct ON v.checklist_template_id = ct.id
        JOIN tags t ON ct.tag_id = t.id
        WHERE t.user_position = ?
          AND ci.checklist_name IN ('Bugs identified during Manual testing', 'Number of bugs reported')
          ${dateFilterSql}
        GROUP BY DATE_FORMAT(r.created_at, '%Y-%m-%d')
        ORDER BY name ASC
      `;

      const topChecklistItemsQuery = `
        SELECT ci.checklist_name AS name, COUNT(r.id) AS value
        FROM checklist_item_response r
        JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
        JOIN checklist_items ci ON li.checklist_item_id = ci.id
        JOIN checklist_template_version v ON li.template_version_id = v.version_id
        JOIN checklist_template ct ON v.checklist_template_id = ct.id
        JOIN tags t ON ct.tag_id = t.id
        WHERE t.user_position = ?
          AND (r.input IS NOT NULL AND r.input != '' OR r.status = 1)
          ${dateFilterSql}
        GROUP BY ci.checklist_name
        ORDER BY value DESC
        LIMIT 10
      `;

      const [distinctDaysResult, totalTasksResult, bugsMonthlyResult, bugsYearlyResult, bugsDailyResult, topChecklistItemsResult] = await Promise.all([
        prisma.$queryRawUnsafe(distinctDaysQuery, ...testingQueryParams),
        prisma.$queryRawUnsafe(totalTasksQuery, ...testingQueryParams),
        prisma.$queryRawUnsafe(bugsMonthlyQuery, ...testingQueryParams),
        prisma.$queryRawUnsafe(bugsYearlyQuery, ...testingQueryParams),
        prisma.$queryRawUnsafe(bugsDailyQuery, ...testingQueryParams),
        prisma.$queryRawUnsafe(topChecklistItemsQuery, ...testingQueryParams)
      ]);

      const daysCount = Number(distinctDaysResult[0]?.daysCount || 0);
      const totalTasks = Number(totalTasksResult[0]?.totalTasks || 0);
      const tasksPerDay = daysCount > 0 ? Number((totalTasks / daysCount).toFixed(1)) : 0;

      testingData = {
        tasksPerDay,
        bugsMonthly: bugsMonthlyResult.map(r => ({ name: r.name, value: Number(r.value || 0) })),
        bugsYearly: bugsYearlyResult.map(r => ({ name: r.name, value: Number(r.value || 0) })),
        bugsDaily: bugsDailyResult.map(r => ({ name: r.name, value: Number(r.value || 0) })),
        topChecklistItems: topChecklistItemsResult.map(r => ({ name: r.name, value: Number(r.value || 0) }))
      };
    }

    let erodeInternsData = null;
    if (isErodeIntern) {
      const erodeQueryParams = [];
      if (startDate) {
        erodeQueryParams.push(new Date(startDate));
      }
      if (endDate) {
        erodeQueryParams.push(new Date(endDate));
      }

      // Developers count
      const devs = await prisma.organisation_User_position.findMany({
        where: {
          user_position: 'FULL_STACK_DEVELOPER',
          organisation_user_id: { in: internOrgUserIds }
        },
        select: { organisation_user_id: true }
      });
      const devSubmissions = await prisma.$queryRawUnsafe(`
        SELECT DISTINCT r.organisation_user_id
        FROM checklist_item_response r
        JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
        JOIN checklist_template_version v ON li.template_version_id = v.version_id
        JOIN checklist_template ct ON v.checklist_template_id = ct.id
        JOIN tags t ON ct.tag_id = t.id
        WHERE t.user_position = 'FULL_STACK_DEVELOPER'
          AND r.organisation_user_id IN (${internOrgUserIdsCsv})
      `);
      const devOrgUserIdsFromSubmissions = devSubmissions.map(s => Number(s.organisation_user_id));
      const devOrgUserIdsFromPositions = devs.map(d => d.organisation_user_id);
      const developersCount = new Set([...devOrgUserIdsFromSubmissions, ...devOrgUserIdsFromPositions]).size;

      // Testers count
      const testers = await prisma.organisation_User_position.findMany({
        where: {
          user_position: 'TESTING',
          organisation_user_id: { in: internOrgUserIds }
        },
        select: { organisation_user_id: true }
      });
      const testerSubmissions = await prisma.$queryRawUnsafe(`
        SELECT DISTINCT r.organisation_user_id
        FROM checklist_item_response r
        JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
        JOIN checklist_template_version v ON li.template_version_id = v.version_id
        JOIN checklist_template ct ON v.checklist_template_id = ct.id
        JOIN tags t ON ct.tag_id = t.id
        WHERE t.user_position = 'TESTING'
          AND r.organisation_user_id IN (${internOrgUserIdsCsv})
      `);
      const testerOrgUserIdsFromSubmissions = testerSubmissions.map(s => Number(s.organisation_user_id));
      const testerOrgUserIdsFromPositions = testers.map(t => t.organisation_user_id);
      const testersCount = new Set([...testerOrgUserIdsFromSubmissions, ...testerOrgUserIdsFromPositions]).size;

      // Tasks per day
      const totalTasksQuery = `
        SELECT SUM(CAST(COALESCE(NULLIF(r.input, ''), '0') AS DECIMAL(10,2))) AS totalTasks
        FROM checklist_item_response r
        JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
        JOIN checklist_items ci ON li.checklist_item_id = ci.id
        WHERE r.organisation_user_id IN (${internOrgUserIdsCsv})
          AND ci.checklist_name IN ('No of Tasks Completed', 'No of Tasks Worked')
          ${dateFilterSql}
      `;
      const distinctDaysQuery = `
        SELECT COUNT(DISTINCT DATE(r.created_at)) AS daysCount
        FROM checklist_item_response r
        WHERE r.organisation_user_id IN (${internOrgUserIdsCsv})
          ${dateFilterSql}
      `;

      const tasksCompletedByUserQuery = `
        SELECT 
          u.name AS name,
          SUM(CAST(COALESCE(NULLIF(r.input, ''), '0') AS DECIMAL(10,2))) AS value
        FROM checklist_item_response r
        JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
        JOIN checklist_items ci ON li.checklist_item_id = ci.id
        JOIN Organisation_Users ou ON r.organisation_user_id = ou.id
        JOIN User u ON ou.user_id = u.id
        WHERE r.organisation_user_id IN (${internOrgUserIdsCsv})
          AND ci.checklist_name IN ('No of Tasks Completed', 'No of Tasks Worked')
          ${dateFilterSql}
        GROUP BY u.name
        ORDER BY value DESC
      `;

      const [totalTasksResult, distinctDaysResult, tasksCompletedByUser] = await Promise.all([
        prisma.$queryRawUnsafe(totalTasksQuery, ...erodeQueryParams),
        prisma.$queryRawUnsafe(distinctDaysQuery, ...erodeQueryParams),
        prisma.$queryRawUnsafe(tasksCompletedByUserQuery, ...erodeQueryParams)
      ]);

      const daysCount = Number(distinctDaysResult[0]?.daysCount || 0);
      const totalTasks = Number(totalTasksResult[0]?.totalTasks || 0);
      const tasksPerDay = daysCount > 0 ? Number((totalTasks / daysCount).toFixed(1)) : 0;

      erodeInternsData = {
        developersCount,
        testersCount,
        tasksPerDay,
        tasksCompletedByUser: tasksCompletedByUser.map(r => ({ name: r.name, value: Number(r.value || 0) }))
      };
    }

    const assignedUsers = await prisma.organisation_User_position.findMany({
      where: {
        user_position: dbPosition,
        Organisation_Users: {
          user_type: { not: 'DISABLED' }
        }
      },
      select: { organisation_user_id: true }
    });
    const assignedUserIds = assignedUsers.map(u => u.organisation_user_id);

    const activeSubmissionsUsers = await prisma.$queryRawUnsafe(`
      SELECT DISTINCT r.organisation_user_id
      FROM checklist_item_response r
      JOIN Organisation_Users ou ON r.organisation_user_id = ou.id
      JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
      JOIN checklist_template_version v ON li.template_version_id = v.version_id
      JOIN checklist_template ct ON v.checklist_template_id = ct.id
      JOIN tags t ON ct.tag_id = t.id
      WHERE ${filterConditionSql}
        AND ou.user_type != 'DISABLED'
    `, ...(isErodeIntern ? [] : [dbPosition]));
    const submissionsUserIds = activeSubmissionsUsers.map(u => Number(u.organisation_user_id));

    const allDeptUserIds = [...new Set([...assignedUserIds, ...submissionsUserIds])];
    const usersCount = allDeptUserIds.length;

    res.json({
      department,
      submissionsCount,
      latestSubmissionDate,
      checklistInputs,
      recentMonths,
      topKPIs,
      completionRate,
      usersCount,
      ...(salesData ? { salesData } : {}),
      ...(salesQualificationData ? { salesQualificationData } : {}),
      ...(hrData ? { hrData } : {}),
      ...(dtData ? { dtData } : {}),
      ...(marketingData ? { marketingData } : {}),
      ...(devData ? { devData } : {}),
      ...(analyticsData ? { analyticsData } : {}),
      ...(testingData ? { testingData } : {}),
      ...(erodeInternsData ? { erodeInternsData } : {})
    });
  } catch (error) {
    console.error('Admin department error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get Department Users
router.get('/admin/department/:department/users', authenticateToken, async (req, res) => {
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
      return res.status(403).json({ error: 'Only admins can view department users' });
    }

    const { department } = req.params;
     let dbPosition = department;
    if (department && (department.toUpperCase() === 'DEVELOPMENT' || department.toUpperCase() === 'DEV' || department.toUpperCase() === 'FULL_STACK_DEVELOPER')) {
      dbPosition = 'FULL_STACK_DEVELOPER';
    }
    if (department && (department.toUpperCase() === 'MARKETING' || department.toUpperCase() === 'MARKETTNG')) {
      dbPosition = 'MARKETING';
    }
    if (department && (department.toUpperCase() === 'POWER_BI_DEVELOPER' || department.toUpperCase() === 'POWER BI DEVELOPER' || department.toUpperCase() === 'DATA_ANALYTICS' || department.toUpperCase() === 'DATA ANALYTICS')) {
      dbPosition = 'POWER_BI_DEVELOPER';
    }
    if (department && (department.toUpperCase() === 'TESTING' || department.toUpperCase() === 'QA TESTING' || department.toUpperCase() === 'QA_TESTING')) {
      dbPosition = 'TESTING';
    }

    const isErodeIntern = department && (department.toUpperCase() === 'ERODE_INTERN' || department.toUpperCase() === 'ERODE_INTERNS' || department.toUpperCase() === 'ERODE INTERNS');

    let internOrgUserIdsCsv = '0';
    if (isErodeIntern) {
      dbPosition = 'ERODE_INTERN';
      const interns = await prisma.organisation_User_position.findMany({
        where: { user_position: 'ERODE_INTERN' },
        select: { organisation_user_id: true }
      });
      const ids = interns.map(i => i.organisation_user_id);
      internOrgUserIdsCsv = ids.length > 0 ? ids.join(',') : '0';
    }

    let filterConditionSql = '';
    if (isErodeIntern) {
      filterConditionSql = `r.organisation_user_id IN (${internOrgUserIdsCsv})`;
    } else {
      filterConditionSql = `t.user_position = ?`;
    }

    const assignedUsers = await prisma.organisation_User_position.findMany({
      where: {
        user_position: dbPosition
      },
      select: { organisation_user_id: true }
    });
    const assignedUserIds = assignedUsers.map(u => u.organisation_user_id);

    const activeSubmissionsUsers = await prisma.$queryRawUnsafe(`
      SELECT DISTINCT r.organisation_user_id
      FROM checklist_item_response r
      JOIN Organisation_Users ou ON r.organisation_user_id = ou.id
      JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
      JOIN checklist_template_version v ON li.template_version_id = v.version_id
      JOIN checklist_template ct ON v.checklist_template_id = ct.id
      JOIN tags t ON ct.tag_id = t.id
      WHERE ${filterConditionSql}
    `, ...(isErodeIntern ? [] : [dbPosition]));
    const submissionsUserIds = activeSubmissionsUsers.map(u => Number(u.organisation_user_id));

    const allDeptUserIds = [...new Set([...assignedUserIds, ...submissionsUserIds])];

    const deptUsers = await prisma.organisation_Users.findMany({
      where: {
        id: { in: allDeptUserIds }
      },
      select: {
        id: true,
        user_type: true,
        exclude_from_reports: true,
        created_at: true,
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        _count: {
          select: { responses: true }
        }
      }
    });

    const now = new Date();
    const gracePeriod = 24 * 60 * 60 * 1000; // 24 hours grace period for new signups

    const formattedUsers = [];
    for (const u of deptUsers) {
      let userType = u.user_type?.trim() || 'USER';
      const createdTime = u.created_at ? new Date(u.created_at) : null;
      const isPastGrace = createdTime ? (now - createdTime) > gracePeriod : true;

      // Auto-deactivate if user is not an admin, has 0 responses, and is past the signup grace period
      if (userType !== 'DISABLED' && userType !== 'ADMIN' && u._count.responses === 0 && isPastGrace) {
        await prisma.organisation_Users.update({
          where: { id: u.id },
          data: { user_type: 'DISABLED' }
        });
        userType = 'DISABLED';
      }

      formattedUsers.push({
        id: u.id,
        realUserId: u.User?.id || 0,
        name: u.User?.name || 'User',
        email: u.User?.email || '',
        image: u.User?.image || null,
        user_type: userType,
        exclude_from_reports: !!u.exclude_from_reports
      });
    }

    res.json(formattedUsers);
  } catch (error) {
    console.error('Admin get department users error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Toggle user exclusion
router.put('/admin/users/:id/exclude', authenticateToken, async (req, res) => {
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
      return res.status(403).json({ error: 'Only admins can modify user exclusion' });
    }

    const orgUserId = parseInt(req.params.id);
    const { exclude } = req.body;

    await prisma.organisation_Users.update({
      where: { id: orgUserId },
      data: { exclude_from_reports: !!exclude }
    });

    res.json({ success: true, message: `User data ${exclude ? 'excluded from' : 'included in'} reporting` });
  } catch (error) {
    console.error('Admin exclude user error:', error);
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
    
    let dbPosition = department;
    if (department && (department.toUpperCase() === 'DEVELOPMENT' || department.toUpperCase() === 'DEV' || department.toUpperCase() === 'FULL_STACK_DEVELOPER')) {
      dbPosition = 'FULL_STACK_DEVELOPER';
    }
    if (department && (department.toUpperCase() === 'MARKETING' || department.toUpperCase() === 'MARKETTNG')) {
      dbPosition = 'MARKETING';
    }
    if (department && (department.toUpperCase() === 'POWER_BI_DEVELOPER' || department.toUpperCase() === 'POWER BI DEVELOPER' || department.toUpperCase() === 'DATA_ANALYTICS' || department.toUpperCase() === 'DATA ANALYTICS')) {
      dbPosition = 'POWER_BI_DEVELOPER';
    }
    if (department && (department.toUpperCase() === 'TESTING' || department.toUpperCase() === 'QA TESTING' || department.toUpperCase() === 'QA_TESTING')) {
      dbPosition = 'TESTING';
    }

    const isErodeIntern = department && (department.toUpperCase() === 'ERODE_INTERN' || department.toUpperCase() === 'ERODE_INTERNS' || department.toUpperCase() === 'ERODE INTERNS');

    let internOrgUserIdsCsv = '0';
    if (isErodeIntern) {
      dbPosition = 'ERODE_INTERN';
      const interns = await prisma.organisation_User_position.findMany({
        where: { user_position: 'ERODE_INTERN' },
        select: { organisation_user_id: true }
      });
      const ids = interns.map(i => i.organisation_user_id);
      internOrgUserIdsCsv = ids.length > 0 ? ids.join(',') : '0';
    }

    let filterConditionSql = '';
    let queryParams = [];
    if (isErodeIntern) {
      filterConditionSql = `r.organisation_user_id IN (${internOrgUserIdsCsv})`;
    } else {
      filterConditionSql = `t.user_position = ?`;
      queryParams.push(dbPosition);
    }

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
      JOIN Organisation_Users ou ON r.organisation_user_id = ou.id
      JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
      JOIN checklist_items ci ON li.checklist_item_id = ci.id
      JOIN checklist_template_version v ON li.template_version_id = v.version_id
      JOIN checklist_template ct ON v.checklist_template_id = ct.id
      JOIN tags t ON ct.tag_id = t.id
      WHERE ${filterConditionSql}
        AND (ou.exclude_from_reports IS NULL OR ou.exclude_from_reports = FALSE)
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
        JOIN Organisation_Users ou ON r.organisation_user_id = ou.id
        JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
        JOIN checklist_items ci ON li.checklist_item_id = ci.id
        JOIN checklist_template_version v ON li.template_version_id = v.version_id
        JOIN checklist_template ct ON v.checklist_template_id = ct.id
        JOIN tags t ON ct.tag_id = t.id
        WHERE ${filterConditionSql}
          AND (ou.exclude_from_reports IS NULL OR ou.exclude_from_reports = FALSE)
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
      const nonPublicPosition = positions.find(p => p !== 'PUBLIC' && p !== 'ERODE_INTERN');
      const mainPosition = nonPublicPosition || positions.find(p => p === 'ERODE_INTERN') || 'PUBLIC';

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
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message,
      stack: error.stack
    });
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
          Organisation: true,
          _count: {
            select: { responses: true }
          }
        }
      })
    ]);

    const now = new Date();
    const gracePeriod = 24 * 60 * 60 * 1000; // 24 hours grace period for new signups

    const formatted = [];
    for (const u of users) {
      let userType = u.user_type?.trim() || 'USER';
      const createdTime = u.created_at ? new Date(u.created_at) : null;
      const isPastGrace = createdTime ? (now - createdTime) > gracePeriod : true;

      // Auto-deactivate if user is not an admin, has 0 responses, and is past signup grace period
      if (userType !== 'DISABLED' && userType !== 'ADMIN' && u._count?.responses === 0 && isPastGrace) {
        await prisma.organisation_Users.update({
          where: { id: u.id },
          data: { user_type: 'DISABLED' }
        });
        userType = 'DISABLED';
      }

      formatted.push({
        id: u.id,
        realUserId: u.User?.id || 0,
        name: u.User?.name || 'User',
        email: u.User?.email || '',
        image: u.User?.image || null,
        user_type: userType,
        user_position: u.user_position || 'PUBLIC',
        organisation: u.Organisation?.organisation || '',
        organisation_id: u.organisation_id,
        created_at: u.created_at || u.User?.created_at
      });
    }

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

// Add user to Erode Interns group without changing primary position
router.post('/admin/department/erode-interns/add-user', authenticateToken, async (req, res) => {
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
      return res.status(403).json({ error: 'Only admins can manage department users' });
    }

    const { organisation_user_id } = req.body;
    if (!organisation_user_id) {
      return res.status(400).json({ error: 'organisation_user_id is required' });
    }

    const orgUser = await prisma.organisation_Users.findUnique({
      where: { id: parseInt(organisation_user_id) },
      include: { User: true }
    });

    if (!orgUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if ERODE_INTERN position already exists for this user
    const existing = await prisma.organisation_User_position.findFirst({
      where: {
        organisation_user_id: orgUser.id,
        user_position: 'ERODE_INTERN'
      }
    });

    if (!existing) {
      await prisma.organisation_User_position.create({
        data: {
          organisation_user_id: orgUser.id,
          user_id: orgUser.User?.id,
          user_position: 'ERODE_INTERN'
        }
      });
    }

    res.json({ success: true, message: 'User added to Erode Interns successfully' });
  } catch (error) {
    console.error('Add Erode Intern error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Remove user from Erode Interns group without changing primary position
router.post('/admin/department/erode-interns/remove-user', authenticateToken, async (req, res) => {
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
      return res.status(403).json({ error: 'Only admins can manage department users' });
    }

    const { organisation_user_id } = req.body;
    if (!organisation_user_id) {
      return res.status(400).json({ error: 'organisation_user_id is required' });
    }

    await prisma.organisation_User_position.deleteMany({
      where: {
        organisation_user_id: parseInt(organisation_user_id),
        user_position: 'ERODE_INTERN'
      }
    });

    res.json({ success: true, message: 'User removed from Erode Interns successfully' });
  } catch (error) {
    console.error('Remove Erode Intern error:', error);
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

// Get list of distinct checklist items that have responses (filtered by role/organisation/department)
router.get('/checklist-items/list', authenticateToken, async (req, res) => {
  try {
    const authUserId = parseInt(req.user.userId);
    // Find the requesting user
    const requester = await prisma.organisation_Users.findUnique({
      where: { id: authUserId },
      select: { user_type: true, organisation_id: true }
    });

    if (!requester) {
      return res.status(403).json({ error: 'User not found in organisation' });
    }

    const isAdmin = requester.user_type?.trim() === 'ADMIN';
    const { department } = req.query;

    let query = `
      SELECT ci.checklist_name, ci.input_type, COUNT(r.id) as usage_count
      FROM checklist_items ci
      JOIN checklist_template_linked_items li ON ci.id = li.checklist_item_id
      JOIN checklist_item_response r ON li.id = r.checklist_template_linked_items_id
      JOIN Organisation_Users ou ON r.organisation_user_id = ou.id
    `;
    
    const isErodeIntern = department && (department.toUpperCase() === 'ERODE_INTERN' || department.toUpperCase() === 'ERODE_INTERNS' || department.toUpperCase() === 'ERODE INTERNS');

    if (department && department.toLowerCase() !== 'overview' && !isErodeIntern) {
      query += `
        JOIN checklist_template_version v ON li.template_version_id = v.version_id
        JOIN checklist_template ct ON v.checklist_template_id = ct.id
        JOIN tags t ON ct.tag_id = t.id
      `;
    }

    query += ` WHERE ou.organisation_id = ? `;
    const queryParams = [requester.organisation_id];

    if (!isAdmin) {
      // Regular users only see responses they submitted
      query += ` AND r.organisation_user_id = ? `;
      queryParams.push(authUserId);
    }

    if (department && department.toLowerCase() !== 'overview') {
      if (isErodeIntern) {
        const interns = await prisma.organisation_User_position.findMany({
          where: { user_position: 'ERODE_INTERN' },
          select: { organisation_user_id: true }
        });
        const ids = interns.map(i => i.organisation_user_id);
        const internOrgUserIdsCsv = ids.length > 0 ? ids.join(',') : '0';
        query += ` AND r.organisation_user_id IN (${internOrgUserIdsCsv}) `;
      } else {
        let dbPosition = department;
        if (department.toUpperCase() === 'DEVELOPMENT' || department.toUpperCase() === 'DEV' || department.toUpperCase() === 'FULL_STACK_DEVELOPER') {
          dbPosition = 'FULL_STACK_DEVELOPER';
        } else if (department.toUpperCase() === 'MARKETING' || department.toUpperCase() === 'MARKETTNG') {
          dbPosition = 'MARKETING';
        } else if (department.toUpperCase() === 'POWER_BI_DEVELOPER' || department.toUpperCase() === 'POWER BI DEVELOPER' || department.toUpperCase() === 'DATA_ANALYTICS' || department.toUpperCase() === 'DATA ANALYTICS') {
          dbPosition = 'POWER_BI_DEVELOPER';
        } else if (department.toUpperCase() === 'TESTING' || department.toUpperCase() === 'QA TESTING' || department.toUpperCase() === 'QA_TESTING') {
          dbPosition = 'TESTING';
        } else if (department.toUpperCase() === 'HR' || department.toUpperCase() === 'HUMAN_RESOURCE' || department.toUpperCase() === 'HUMAN RESOURCE') {
          dbPosition = 'HUMAN_RESOURCE';
        } else if (department.toUpperCase() === 'DT' || department.toUpperCase() === 'DIGITAL_TRANSFORMATION' || department.toUpperCase() === 'DIGITAL TRANSFORMATION') {
          dbPosition = 'DIGITAL_TRANSFORMATION';
        } else if (department.toUpperCase() === 'SALES') {
          dbPosition = 'SALES';
        }
        query += ` AND t.user_position = ? `;
        queryParams.push(dbPosition);
      }
    }

    query += `
      GROUP BY ci.checklist_name, ci.input_type
      ORDER BY usage_count DESC, ci.checklist_name ASC
    `;

    const items = await prisma.$queryRawUnsafe(query, ...queryParams);
    
    // Cast bigint usage_count to number
    const formattedItems = items.map(item => ({
      checklist_name: item.checklist_name,
      input_type: item.input_type,
      usage_count: Number(item.usage_count)
    }));

    res.json(formattedItems);
  } catch (error) {
    console.error('Error fetching checklist items list:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get historical aggregated trend data for a specific checklist item name
router.get('/checklist-items/history', authenticateToken, async (req, res) => {
  try {
    const authUserId = parseInt(req.user.userId);
    const { itemName, startDate, endDate, groupBy = 'day', targetUserId, targetOrgId, targetDepartment } = req.query;

    if (!itemName) {
      return res.status(400).json({ error: 'itemName query parameter is required' });
    }

    // Check requester permissions
    const requester = await prisma.organisation_Users.findUnique({
      where: { id: authUserId },
      select: { 
        user_type: true,
        organisation_id: true,
        User: { select: { email: true } }
      }
    });

    const isRequesterAdmin = 
      requester?.user_type?.trim() === 'ADMIN' || 
      requester?.User?.email === 'gururider35@gmail.com';

    // Build query
    let query = `
      SELECT 
        r.selected_date,
        r.created_at,
        r.input,
        r.status,
        ci.input_type,
        u.name as user_name
      FROM checklist_item_response r
      JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
      JOIN checklist_items ci ON li.checklist_item_id = ci.id
      JOIN Organisation_Users ou ON r.organisation_user_id = ou.id
      JOIN User u ON ou.user_id = u.id
      LEFT JOIN checklist_template_version v ON li.template_version_id = v.version_id
      LEFT JOIN checklist_template ct ON v.checklist_template_id = ct.id
      LEFT JOIN tags t ON ct.tag_id = t.id
      WHERE ci.checklist_name = ? AND ou.organisation_id = ?
    `;
    const queryParams = [itemName, requester.organisation_id];

    // Filter by organization / user depending on requester role
    if (!isRequesterAdmin) {
      // Force non-admins to their own user scope
      query += ` AND r.organisation_user_id = ? `;
      queryParams.push(authUserId);
    } else {
      // Admin filter options
      if (targetUserId) {
        query += ` AND r.organisation_user_id = ? `;
        queryParams.push(parseInt(targetUserId));
      }
      if (targetDepartment && targetDepartment.toLowerCase() !== 'overview') {
        const isErodeIntern = targetDepartment.toUpperCase() === 'ERODE_INTERN' || targetDepartment.toUpperCase() === 'ERODE_INTERNS' || targetDepartment.toUpperCase() === 'ERODE INTERNS';
        if (isErodeIntern) {
          const interns = await prisma.organisation_User_position.findMany({
            where: { user_position: 'ERODE_INTERN' },
            select: { organisation_user_id: true }
          });
          const ids = interns.map(i => i.organisation_user_id);
          const internOrgUserIdsCsv = ids.length > 0 ? ids.join(',') : '0';
          query += ` AND r.organisation_user_id IN (${internOrgUserIdsCsv}) `;
        } else {
          let dbPosition = targetDepartment;
          if (targetDepartment.toUpperCase() === 'DEVELOPMENT' || targetDepartment.toUpperCase() === 'DEV' || targetDepartment.toUpperCase() === 'FULL_STACK_DEVELOPER') {
            dbPosition = 'FULL_STACK_DEVELOPER';
          } else if (targetDepartment.toUpperCase() === 'MARKETING' || targetDepartment.toUpperCase() === 'MARKETTNG') {
            dbPosition = 'MARKETING';
          } else if (targetDepartment.toUpperCase() === 'POWER_BI_DEVELOPER' || targetDepartment.toUpperCase() === 'POWER BI DEVELOPER' || targetDepartment.toUpperCase() === 'DATA_ANALYTICS' || targetDepartment.toUpperCase() === 'DATA ANALYTICS') {
            dbPosition = 'POWER_BI_DEVELOPER';
          } else if (targetDepartment.toUpperCase() === 'TESTING' || targetDepartment.toUpperCase() === 'QA TESTING' || targetDepartment.toUpperCase() === 'QA_TESTING') {
            dbPosition = 'TESTING';
          } else if (targetDepartment.toUpperCase() === 'HR' || targetDepartment.toUpperCase() === 'HUMAN_RESOURCE' || targetDepartment.toUpperCase() === 'HUMAN RESOURCE') {
            dbPosition = 'HUMAN_RESOURCE';
          } else if (targetDepartment.toUpperCase() === 'DT' || targetDepartment.toUpperCase() === 'DIGITAL_TRANSFORMATION' || targetDepartment.toUpperCase() === 'DIGITAL TRANSFORMATION') {
            dbPosition = 'DIGITAL_TRANSFORMATION';
          } else if (targetDepartment.toUpperCase() === 'SALES') {
            dbPosition = 'SALES';
          }
          query += ` AND t.user_position = ? `;
          queryParams.push(dbPosition);
        }
      }
    }

    if (startDate) {
      query += ` AND r.created_at >= ? `;
      queryParams.push(new Date(startDate));
    }
    if (endDate) {
      query += ` AND r.created_at <= ? `;
      queryParams.push(new Date(endDate));
    }

    const responses = await prisma.$queryRawUnsafe(query, ...queryParams);

    if (responses.length === 0) {
      return res.json({
        itemName,
        inputType: 'Boolean',
        groupBy,
        chartData: [],
        userBreakdown: []
      });
    }

    const inputType = responses[0].input_type;

    const getGroupKey = (createdAtStr, selectedDateStr, mode) => {
      let d = null;
      if (selectedDateStr && /^\d{4}-\d{2}-\d{2}$/.test(selectedDateStr)) {
        const parts = selectedDateStr.split('-');
        d = new Date(parts[0], parts[1] - 1, parts[2]);
      } else {
        d = new Date(createdAtStr);
      }

      if (isNaN(d.getTime())) return 'Unknown';

      if (mode === 'month') {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[d.getMonth()]} ${d.getFullYear()}`;
      } else if (mode === 'week') {
        const oneJan = new Date(d.getFullYear(), 0, 1);
        const numberOfDays = Math.floor((d - oneJan) / (24 * 60 * 60 * 1000));
        const weekNum = Math.ceil((d.getDay() + 1 + numberOfDays) / 7);
        return `Wk ${weekNum}, ${d.getFullYear()}`;
      } else {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${d.getDate()} ${months[d.getMonth()]}`;
      }
    };

    const grouped = {};
    const userGrouped = {};

    responses.forEach(r => {
      const key = getGroupKey(r.created_at, r.selected_date, groupBy);
      if (!grouped[key]) {
        grouped[key] = {
          key,
          rawDate: r.created_at ? new Date(r.created_at) : new Date(r.selected_date),
          count: 0,
          numericSum: 0,
          numericValues: [],
          booleanYes: 0,
          booleanNo: 0
        };
      }

      grouped[key].count += 1;

      const uName = r.user_name || 'Unknown User';
      if (!userGrouped[uName]) {
        userGrouped[uName] = {
          name: uName,
          count: 0,
          numericSum: 0,
          booleanYes: 0,
        };
      }
      userGrouped[uName].count += 1;
      
      if (inputType === 'Numeric') {
        const val = parseFloat(r.input || '0');
        const numVal = isNaN(val) ? 0 : val;
        grouped[key].numericSum += numVal;
        grouped[key].numericValues.push(numVal);
        userGrouped[uName].numericSum += numVal;
      } else {
        const isYes = r.input === 'Yes' || r.input === '1' || r.input === 'true' || r.status === 1;
        if (isYes) {
          grouped[key].booleanYes += 1;
          userGrouped[uName].booleanYes += 1;
        } else {
          grouped[key].booleanNo += 1;
        }
      }
    });

    const chartData = Object.values(grouped).map(g => {
      const result = {
        date: g.key,
        rawDate: g.rawDate,
        count: g.count
      };

      if (inputType === 'Numeric') {
        result.sum = Number(g.numericSum.toFixed(2));
        result.avg = g.count > 0 ? Number((g.numericSum / g.count).toFixed(2)) : 0;
        result.min = g.numericValues.length > 0 ? Math.min(...g.numericValues) : 0;
        result.max = g.numericValues.length > 0 ? Math.max(...g.numericValues) : 0;
      } else {
        result.yesCount = g.booleanYes;
        result.noCount = g.booleanNo;
        result.yesPercentage = g.count > 0 ? Number(((g.booleanYes / g.count) * 100).toFixed(1)) : 0;
      }

      return result;
    });

    // Sort by date chronologically
    chartData.sort((a, b) => a.rawDate - b.rawDate);

    // Clean up rawDate
    chartData.forEach(d => {
      delete d.rawDate;
    });

    const userBreakdown = Object.values(userGrouped).map(u => {
      const res = {
        name: u.name,
        count: u.count
      };
      if (inputType === 'Numeric') {
        res.avg = u.count > 0 ? Number((u.numericSum / u.count).toFixed(2)) : 0;
        res.sum = Number(u.numericSum.toFixed(2));
      } else {
        res.yesPercentage = u.count > 0 ? Number(((u.booleanYes / u.count) * 100).toFixed(1)) : 0;
      }
      return res;
    }).sort((a, b) => b.count - a.count);

    res.json({
      itemName,
      inputType,
      groupBy,
      chartData,
      userBreakdown
    });

  } catch (error) {
    console.error('Error fetching checklist items history:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
