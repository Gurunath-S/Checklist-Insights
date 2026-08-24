const prisma = require('../../config/prisma');

const getReports = async (authUserId, isRequesterAdmin, { page, limit, search, position, startDate, endDate }) => {
  const skip = (page - 1) * limit;

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

  return {
    reports: formatted,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
};

const getReportDetail = async (targetUserId, targetTemplateId, date) => {
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

  return rows.map(r => ({
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
  }));
};

const getDepartmentReports = async ({ startDate, endDate, search, page = 1, limit = 15 }) => {
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

  return {
    departments: formatted,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum)
  };
};

const getTemplateReports = async ({ startDate, endDate, search, page = 1, limit = 15 }) => {
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

  return {
    templates: formatted,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum)
  };
};

const getTagReports = async ({ startDate, endDate }) => {
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

  return tagStats.map(tag => {
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
};

const getUserReports = async ({ startDate, endDate, search, page = 1, limit = 15 }) => {
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;
  
  let queryParams = [];

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

  const countParams = [...queryParams];
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

  return {
    users: formatted,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum)
  };
};

const getChecklistItemsList = async (authUserId, requesterOrgId, isAdmin, department, targetUserId) => {
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
  const queryParams = [requesterOrgId];

  if (targetUserId) {
    query += ` AND r.organisation_user_id = ? `;
    queryParams.push(targetUserId);
  } else if (!isAdmin) {
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
  
  return items.map(item => ({
    checklist_name: item.checklist_name,
    input_type: item.input_type,
    usage_count: Number(item.usage_count)
  }));
};

const getChecklistItemHistory = async (authUserId, organisationId, isRequesterAdmin, { itemName, startDate, endDate, groupBy = 'day', targetUserId, targetDepartment }) => {
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
  const queryParams = [itemName, organisationId];

  if (!isRequesterAdmin) {
    query += ` AND r.organisation_user_id = ? `;
    queryParams.push(authUserId);
  } else {
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
    return {
      itemName,
      inputType: 'Boolean',
      groupBy,
      chartData: [],
      userBreakdown: []
    };
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

  chartData.sort((a, b) => a.rawDate - b.rawDate);

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

  return {
    itemName,
    inputType,
    groupBy,
    chartData,
    userBreakdown
  };
};

module.exports = {
  getReports,
  getReportDetail,
  getDepartmentReports,
  getTemplateReports,
  getTagReports,
  getUserReports,
  getChecklistItemsList,
  getChecklistItemHistory
};
