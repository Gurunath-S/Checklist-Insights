const prisma = require('../../config/prisma');

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return weekNo;
}

const checkRequesterAuthorized = async (authUserId, targetUserId) => {
  if (authUserId === targetUserId) return true;

  const requester = await prisma.organisation_Users.findUnique({
    where: { id: authUserId },
    select: { 
      user_type: true,
      User: { select: { email: true } }
    }
  });

  const isRequesterAdmin = requester?.user_type?.trim() === 'ADMIN';

  return !!isRequesterAdmin;
};

const getPersonalInsights = async (userId, startDate, endDate) => {
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

  // 1. Group responses into "Submission Events"
  const submissions = await prisma.checklist_item_response.groupBy({
    by: ['template_version', 'selected_date'],
    where: whereClause,
    _count: { id: true },
    _min: { created_at: true }
  });

  // 2. Perform database-level aggregation to get item counts/sums
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

  // 3. Fetch ONLY the top 15 recent response records for activity feed
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
  let todaySubmittedCount = 0;

  // Grouping for weekly trend
  submissions.forEach(s => {
    const date = new Date(s._min.created_at);
    const week = `${date.getFullYear()}-${getWeekNumber(date)}`;
    trendMap[week] = (trendMap[week] || 0) + 1;
    
    if (new Date(s._min.created_at).toLocaleDateString() === todayStr) {
      todaySubmitted = true;
      todaySubmittedCount++;
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

  return {
    summary: { 
      totalSubmissions: submissions.length,
      totalTasksWorked,
      totalTasksCompleted,
      totalAiTimeSaved,
      totalBugsFixed,
      todaySubmitted,
      todaySubmittedCount,
      recentActivityCount: recentResponses.length,
      yesNoAvg,
      timeRelatedAvg
    },
    performanceTrend,
    recentActivity: formattedActivities,
    itemStats
  };
};

const getPersonalChartData = async (userId, startDate, endDate, pageNum, limitNum) => {
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

  return {
    data,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum)
  };
};

module.exports = {
  checkRequesterAuthorized,
  getPersonalInsights,
  getPersonalChartData
};
