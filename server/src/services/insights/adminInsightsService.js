const prisma = require('../../config/prisma');

const checkRequesterAdmin = async (authUserId) => {
  const requester = await prisma.organisation_Users.findUnique({
    where: { id: authUserId },
    select: { 
      user_type: true,
      User: { select: { email: true } }
    }
  });
  
  return (
    requester?.user_type?.trim() === 'ADMIN' || 
    requester?.User?.email === 'gururider35@gmail.com'
  );
};

const getAdminSummary = async (startDate, endDate) => {
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
    tag_name: stat.tag_name,
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

  return {
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
  };
};

const getOrganisationDetails = async (orgId, startDate, endDate) => {
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

  return {
    submissionsCount,
    latestSubmissionDate,
    checklistInputs,
    recentMonths,
    topKPIs,
    completionRate
  };
};

const getOrganisationChartData = async (orgId, startDate, endDate, pageNum, limitNum) => {
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

  return {
    data,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum)
  };
};

const getDepartmentDetails = async (department, startDate, endDate) => {
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
    
    const tasksCompletedItemRaw = checklistInputs.find(i => i.name.toLowerCase().includes('task completed') || i.name.toLowerCase().includes('tasks completed'));
    let totalTasksCompleted = 0;
    if (tasksCompletedItemRaw) {
      totalTasksCompleted = tasksCompletedItemRaw.value;
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

    const tasksCreatedItem = checklistInputs.find(i => i.name.toLowerCase().includes('tasks created'));
    const tasksCreatedTotal = tasksCreatedItem ? tasksCreatedItem.value : 0;

    const tasksClosedItem = checklistInputs.find(i => i.name.toLowerCase().includes('tasks closed'));
    const tasksClosedTotal = tasksClosedItem ? tasksClosedItem.value : 0;

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

    const [totalTasksResult, distinctDaysResult, tasksCompletedByUserResult] = await Promise.all([
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
      tasksCompletedByUser: tasksCompletedByUserResult.map(r => ({ name: r.name, value: Number(r.value || 0) }))
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

  return {
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
  };
};

const getDepartmentUsers = async (department) => {
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
  const gracePeriod = 24 * 60 * 60 * 1000;

  const formattedUsers = [];
  for (const u of deptUsers) {
    let userType = u.user_type?.trim() || 'USER';
    const createdTime = u.created_at ? new Date(u.created_at) : null;
    const isPastGrace = createdTime ? (now - createdTime) > gracePeriod : true;

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

  return formattedUsers;
};

const excludeUserFromReports = async (orgUserId, exclude) => {
  await prisma.organisation_Users.update({
    where: { id: orgUserId },
    data: { exclude_from_reports: !!exclude }
  });
};

const getDepartmentChartData = async (department, startDate, endDate, pageNum, limitNum) => {
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

  return {
    data,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum)
  };
};

const getAdminUsers = async () => {
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

  return users.map(u => {
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
};

const getAdminUsersList = async (page, limit, search, position, type) => {
  const skip = (page - 1) * limit;
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
  const gracePeriod = 24 * 60 * 60 * 1000;

  const formatted = [];
  for (const u of users) {
    let userType = u.user_type?.trim() || 'USER';
    const createdTime = u.created_at ? new Date(u.created_at) : null;
    const isPastGrace = createdTime ? (now - createdTime) > gracePeriod : true;

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

  return {
    users: formatted,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
};

const updateAdminUser = async (orgUserId, { name, user_position, user_type, organisation_id }) => {
  const orgUser = await prisma.organisation_Users.findUnique({
    where: { id: orgUserId },
    include: { User: true }
  });

  if (!orgUser) {
    throw new Error('User not found');
  }

  if (name && orgUser.User) {
    await prisma.user.update({
      where: { id: orgUser.User.id },
      data: { name }
    });
  }

  await prisma.organisation_Users.update({
    where: { id: orgUserId },
    data: {
      user_position: user_position || undefined,
      user_type: user_type || undefined,
      organisation_id: organisation_id ? parseInt(organisation_id) : undefined
    }
  });

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
};

const deleteAdminUser = async (orgUserId) => {
  await prisma.organisation_Users.update({
    where: { id: orgUserId },
    data: { user_type: 'DISABLED' }
  });
};

const enableAdminUser = async (orgUserId) => {
  await prisma.organisation_Users.update({
    where: { id: orgUserId },
    data: { user_type: 'USER' }
  });
};

const addErodeInternsUser = async (organisation_user_id) => {
  const orgUser = await prisma.organisation_Users.findUnique({
    where: { id: parseInt(organisation_user_id) },
    include: { User: true }
  });

  if (!orgUser) {
    throw new Error('User not found');
  }

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
};

const removeErodeInternsUser = async (organisation_user_id) => {
  await prisma.organisation_User_position.deleteMany({
    where: {
      organisation_user_id: parseInt(organisation_user_id),
      user_position: 'ERODE_INTERN'
    }
  });
};

module.exports = {
  checkRequesterAdmin,
  getAdminSummary,
  getOrganisationDetails,
  getOrganisationChartData,
  getDepartmentDetails,
  getDepartmentUsers,
  excludeUserFromReports,
  getDepartmentChartData,
  getAdminUsers,
  getAdminUsersList,
  updateAdminUser,
  deleteAdminUser,
  enableAdminUser,
  addErodeInternsUser,
  removeErodeInternsUser
};
