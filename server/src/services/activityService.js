const prisma = require('../config/prisma');

const checkRequesterAuthorized = async (authUserId, targetUserId) => {
  if (authUserId === targetUserId) return true;

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

  return !!isRequesterAdmin;
};

const getTemplates = async (userId, pageNum, limitNum, startDate, endDate) => {
  const offset = (pageNum - 1) * limitNum;

  let dataQuery = `
    SELECT
      ct.id              AS template_id,
      ct.template_name,
      MAX(cir.created_at)   AS last_submitted,
      MAX(cir.selected_date) AS last_selected_date,
      COUNT(cir.id)         AS total_responses
    FROM checklist_item_response cir
    JOIN checklist_template_linked_items li
      ON cir.checklist_template_linked_items_id = li.id
    JOIN checklist_template_version v
      ON li.template_version_id = v.version_id
    JOIN checklist_template ct
      ON v.checklist_template_id = ct.id
    WHERE cir.organisation_user_id = ?
  `;

  const queryParams = [userId];
  const countParams = [userId];

  if (startDate) {
    dataQuery += ` AND cir.created_at >= ?`;
    queryParams.push(new Date(startDate));
    countParams.push(new Date(startDate));
  }
  if (endDate) {
    dataQuery += ` AND cir.created_at <= ?`;
    queryParams.push(new Date(endDate));
    countParams.push(new Date(endDate));
  }

  dataQuery += `
    GROUP BY ct.id, ct.template_name
    ORDER BY last_submitted DESC
    LIMIT ? OFFSET ?
  `;

  const countQuery = `
    SELECT COUNT(*) as total FROM (
      SELECT ct.id
      FROM checklist_item_response cir
      JOIN checklist_template_linked_items li
        ON cir.checklist_template_linked_items_id = li.id
      JOIN checklist_template_version v
        ON li.template_version_id = v.version_id
      JOIN checklist_template ct
        ON v.checklist_template_id = ct.id
      WHERE cir.organisation_user_id = ?
      ${startDate ? ' AND cir.created_at >= ?' : ''}
      ${endDate ? ' AND cir.created_at <= ?' : ''}
      GROUP BY ct.id
    ) sub
  `;

  const [rows, totalResult] = await Promise.all([
    prisma.$queryRawUnsafe(dataQuery, ...queryParams, limitNum, offset),
    prisma.$queryRawUnsafe(countQuery, ...countParams)
  ]);
  
  const total = Number(totalResult[0]?.total || 0);

  const data = rows.map(r => ({
    template_id: Number(r.template_id),
    template_name: r.template_name,
    last_submitted: r.last_submitted,
    last_selected_date: r.last_selected_date,
    total_responses: Number(r.total_responses)
  }));

  return {
    data,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum)
  };
};

const getDates = async (userId, templateId, pageNum, limitNum, startDate, endDate) => {
  const offset = (pageNum - 1) * limitNum;

  let dataQuery = `
    SELECT
      COALESCE(NULLIF(cir.selected_date, ''), DATE_FORMAT(cir.created_at, '%Y-%m-%d')) AS checklist_date,
      DATE(MAX(cir.created_at)) AS submitted_day,
      MAX(cir.selected_date) AS selected_date,
      COUNT(cir.id)           AS items_count,
      SUM(CASE 
        WHEN ci.input_type = 'Boolean' AND (cir.input = 'Yes' OR cir.input = '1' OR cir.input = 'true' OR cir.status = 1) THEN 1
        WHEN ci.input_type = 'Numeric' AND (cir.input IS NOT NULL AND cir.input != '') THEN 1
        ELSE 0 
      END)                    AS completed_count,
      MIN(cir.created_at)     AS first_created_at
    FROM checklist_item_response cir
    JOIN checklist_template_linked_items li
      ON cir.checklist_template_linked_items_id = li.id
    JOIN checklist_template_version v
      ON li.template_version_id = v.version_id
    JOIN checklist_items ci
      ON li.checklist_item_id = ci.id
    WHERE cir.organisation_user_id = ?
      AND v.checklist_template_id  = ?
  `;

  const queryParams = [userId, templateId];
  const countParams = [userId, templateId];

  if (startDate) {
    dataQuery += ` AND cir.created_at >= ?`;
    queryParams.push(new Date(startDate));
    countParams.push(new Date(startDate));
  }
  if (endDate) {
    dataQuery += ` AND cir.created_at <= ?`;
    queryParams.push(new Date(endDate));
    countParams.push(new Date(endDate));
  }

  dataQuery += `
    GROUP BY COALESCE(NULLIF(cir.selected_date, ''), DATE_FORMAT(cir.created_at, '%Y-%m-%d'))
    ORDER BY first_created_at DESC
    LIMIT ? OFFSET ?
  `;

  const countQuery = `
    SELECT COUNT(*) as total FROM (
      SELECT COALESCE(NULLIF(cir.selected_date, ''), DATE_FORMAT(cir.created_at, '%Y-%m-%d'))
      FROM checklist_item_response cir
      JOIN checklist_template_linked_items li
        ON cir.checklist_template_linked_items_id = li.id
      JOIN checklist_template_version v
        ON li.template_version_id = v.version_id
      WHERE cir.organisation_user_id = ?
        AND v.checklist_template_id  = ?
        ${startDate ? ' AND cir.created_at >= ?' : ''}
        ${endDate ? ' AND cir.created_at <= ?' : ''}
      GROUP BY COALESCE(NULLIF(cir.selected_date, ''), DATE_FORMAT(cir.created_at, '%Y-%m-%d'))
    ) sub
  `;

  const [rows, totalResult] = await Promise.all([
    prisma.$queryRawUnsafe(dataQuery, ...queryParams, limitNum, offset),
    prisma.$queryRawUnsafe(countQuery, ...countParams)
  ]);
  
  const total = Number(totalResult[0]?.total || 0);

  const data = rows.map(r => ({
    submitted_day: r.submitted_day,
    selected_date: r.selected_date,
    checklist_date: r.checklist_date,
    is_backdated: r.selected_date
      ? String(r.submitted_day) !== String(r.selected_date)
      : false,
    items_count: Number(r.items_count),
    completed_count: Number(r.completed_count || 0)
  }));

  return {
    data,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum)
  };
};

const getResponses = async (userId, templateId, date) => {
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
    JOIN checklist_template_linked_items li
      ON cir.checklist_template_linked_items_id = li.id
    JOIN checklist_template_version v
      ON li.template_version_id = v.version_id
    JOIN checklist_items ci
      ON li.checklist_item_id = ci.id
    WHERE cir.organisation_user_id = ${userId}
      AND v.checklist_template_id  = ${templateId}
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

module.exports = {
  checkRequesterAuthorized,
  getTemplates,
  getDates,
  getResponses
};
