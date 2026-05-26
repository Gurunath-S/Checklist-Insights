const express = require('express');
const prisma = require('../config/prisma');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// Level 1: All templates the user has submitted responses for
router.get('/templates/:userId', authenticateToken, async (req, res) => {
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

  if (authUserId !== userId && !isRequesterAdmin) return res.status(403).json({ error: 'Unauthorized' });
  try {
    const { page = 1, limit = 5, startDate, endDate } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
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

    res.json({
      data,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (e) {
    console.error('activity/templates error:', e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Level 2: All unique submission days for a given user + template
router.get('/dates/:userId/:templateId', authenticateToken, async (req, res) => {
  const userId = parseInt(req.params.userId);
  const templateId = parseInt(req.params.templateId);
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

  if (authUserId !== userId && !isRequesterAdmin) return res.status(403).json({ error: 'Unauthorized' });
  try {
    const { page = 1, limit = 5, startDate, endDate } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let dataQuery = `
      SELECT
        DATE(cir.created_at)    AS submitted_day,
        cir.selected_date       AS selected_date,
        COUNT(cir.id)           AS items_count,
        SUM(cir.status)         AS completed_count,
        MIN(cir.created_at)     AS first_created_at
      FROM checklist_item_response cir
      JOIN checklist_template_linked_items li
        ON cir.checklist_template_linked_items_id = li.id
      JOIN checklist_template_version v
        ON li.template_version_id = v.version_id
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
      GROUP BY DATE(cir.created_at), cir.selected_date
      ORDER BY first_created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as total FROM (
        SELECT DATE(cir.created_at)
        FROM checklist_item_response cir
        JOIN checklist_template_linked_items li
          ON cir.checklist_template_linked_items_id = li.id
        JOIN checklist_template_version v
          ON li.template_version_id = v.version_id
        WHERE cir.organisation_user_id = ?
          AND v.checklist_template_id  = ?
          ${startDate ? ' AND cir.created_at >= ?' : ''}
          ${endDate ? ' AND cir.created_at <= ?' : ''}
        GROUP BY DATE(cir.created_at), cir.selected_date
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
      is_backdated: r.selected_date
        ? String(r.submitted_day) !== String(r.selected_date)
        : false,
      items_count: Number(r.items_count),
      completed_count: Number(r.completed_count || 0)
    }));

    res.json({
      data,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (e) {
    console.error('activity/dates error:', e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Level 3: All item responses for a user + template on a specific submitted day
router.get('/responses/:userId/:templateId/:date', authenticateToken, async (req, res) => {
  const userId = parseInt(req.params.userId);
  const templateId = parseInt(req.params.templateId);
  const date = req.params.date; // YYYY-MM-DD
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

  if (authUserId !== userId && !isRequesterAdmin) return res.status(403).json({ error: 'Unauthorized' });
  try {
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
        AND DATE(cir.created_at)     = ${date}
      ORDER BY ci.checklist_name ASC
    `;
    res.json(rows.map(r => ({
      checklist_name: r.checklist_name,
      input_type: r.input_type,
      input: r.input,
      status: r.status === true || r.status === 1,
      comments: r.comments || null,
      selected_date: r.selected_date,
      created_at: r.created_at
    })));
  } catch (e) {
    console.error('activity/responses error:', e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
