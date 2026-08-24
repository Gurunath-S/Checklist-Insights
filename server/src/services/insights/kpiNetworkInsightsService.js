const prisma = require('../../config/prisma');

const getAdminTemplateTree = async () => {
  // 1. Fetch all templates with their tags, linked items count, and recipients count
  const templatesRaw = await prisma.checklist_template.findMany({
    include: {
      tag: true,
      TemplateRecipients: { select: { id: true } },
      checklist_template_version_checklist_template_version_checklist_template_idTochecklist_template: {
        include: {
          linked_items: {
            include: {
              item: { select: { id: true, checklist_name: true, input_type: true } }
            }
          }
        },
        orderBy: { version_id: 'desc' },
        take: 1
      },
      checklist_template_owners: {
        include: {
          Organisation_Users: {
            include: { User: { select: { name: true, email: true } } }
          }
        }
      }
    }
  });

  // 2. Build a map of department → tags → templates
  const DEPT_LABEL_MAP = {
    FULL_STACK_DEVELOPER: 'Development',
    POWER_BI_DEVELOPER: 'Data Analytics',
    TESTING: 'QA Testing',
    HUMAN_RESOURCE: 'Human Resources',
    DIGITAL_TRANSFORMATION: 'Digital Transformation',
    SALES: 'Sales',
    MARKETING: 'Marketing',
    SALESFORCE: 'Salesforce',
    ERODE_INTERN: 'Erode Interns',
    PUBLIC: 'Public'
  };

  const deptMap = {};
  const orphanedTemplates = [];

  for (const tmpl of templatesRaw) {
    const recipientCount = tmpl.TemplateRecipients.length;
    const latestVersion = tmpl.checklist_template_version_checklist_template_version_checklist_template_idTochecklist_template[0];
    const itemCount = latestVersion ? latestVersion.linked_items.length : 0;
    const ownerName = tmpl.checklist_template_owners?.Organisation_Users?.User?.name || null;
    const itemsList = latestVersion
      ? latestVersion.linked_items.map(li => ({
          id: li.item.id,
          checklist_name: li.item.checklist_name,
          input_type: li.item.input_type
        }))
      : [];

    const templateEntry = {
      id: tmpl.id,
      template_name: tmpl.template_name,
      priority: tmpl.priority,
      repeating: tmpl.repeating,
      created_at: tmpl.created_at,
      itemCount,
      recipientCount,
      ownerName,
      tag_id: tmpl.tag_id,
      itemsList
    };

    // Orphan = no recipients assigned
    if (recipientCount === 0) {
      orphanedTemplates.push({
        ...templateEntry,
        tag_name: tmpl.tag?.tag_name || null,
        department: tmpl.tag?.user_position || null,
        departmentLabel: tmpl.tag ? (DEPT_LABEL_MAP[tmpl.tag.user_position] || tmpl.tag.user_position) : 'Uncategorized'
      });
    }

    if (!tmpl.tag) continue;

    const dept = tmpl.tag.user_position;
    if (!deptMap[dept]) {
      deptMap[dept] = {
        name: dept,
        label: DEPT_LABEL_MAP[dept] || dept.replace(/_/g, ' '),
        tags: {}
      };
    }

    const tagKey = tmpl.tag.id;
    if (!deptMap[dept].tags[tagKey]) {
      deptMap[dept].tags[tagKey] = {
        id: tmpl.tag.id,
        tag_name: tmpl.tag.tag_name,
        description: tmpl.tag.description,
        recurrent: tmpl.tag.recurrent,
        templates: []
      };
    }

    deptMap[dept].tags[tagKey].templates.push(templateEntry);
  }

  // 3. Convert maps to arrays and sort
  const DEPT_ORDER = {
    HUMAN_RESOURCE: 1,
    DIGITAL_TRANSFORMATION: 2,
    SALES: 3,
    MARKETING: 4,
    FULL_STACK_DEVELOPER: 5,
    POWER_BI_DEVELOPER: 6,
    TESTING: 7,
    SALESFORCE: 8,
    ERODE_INTERN: 9,
    PUBLIC: 10
  };

  const departments = Object.values(deptMap)
    .map(dept => ({
      ...dept,
      tags: Object.values(dept.tags).sort((a, b) => a.tag_name.localeCompare(b.tag_name))
    }))
    .sort((a, b) => (DEPT_ORDER[a.name] || 99) - (DEPT_ORDER[b.name] || 99));

  // 4. Summary stats
  const totalTemplates = templatesRaw.length;
  const connectedTemplates = templatesRaw.filter(t => t.TemplateRecipients.length > 0).length;
  const totalTags = await prisma.tags.count();
  const activeDepts = departments.length;

  return {
    departments,
    orphanedTemplates,
    stats: {
      totalTemplates,
      connectedTemplates,
      orphanedCount: orphanedTemplates.length,
      totalTags,
      activeDepts
    }
  };
};

const updateAdminTemplate = async (templateId, { tag_id, priority, owner_id }) => {
  const updateData = {};
  if (tag_id !== undefined && tag_id !== null) {
    updateData.tag = { connect: { id: parseInt(tag_id) } };
  }
  if (priority !== undefined) updateData.priority = priority;

  await prisma.$transaction(async (tx) => {
    // 1. Update template properties (tag and priority)
    if (Object.keys(updateData).length > 0) {
      await tx.checklist_template.update({
        where: { id: templateId },
        data: updateData
      });
    }

    // 2. Update owner in checklist_template_owners
    if (owner_id !== undefined) {
      if (owner_id === null) {
        // Delete owner if set to null
        await tx.checklist_template_owners.deleteMany({
          where: { checklist_template_id: templateId }
        });
      } else {
        // Upsert owner
        const existingOwner = await tx.checklist_template_owners.findUnique({
          where: { checklist_template_id: templateId }
        });
        if (existingOwner) {
          await tx.checklist_template_owners.update({
            where: { checklist_template_id: templateId },
            data: { organisation_user_id: parseInt(owner_id) }
          });
        } else {
          await tx.checklist_template_owners.create({
            data: {
              checklist_template_id: templateId,
              organisation_user_id: parseInt(owner_id),
              created_at: new Date()
            }
          });
        }
      }
    }
  });
};

const deleteAdminTemplate = async (templateId) => {
  // 1. Get all versions of this template
  const versions = await prisma.checklist_template_version.findMany({
    where: { checklist_template_id: templateId },
    select: { version_id: true }
  });
  const versionIds = versions.map(v => v.version_id);

  await prisma.$transaction(async (tx) => {
    // 2. Delete responses for these versions
    if (versionIds.length > 0) {
      await tx.checklist_item_response.deleteMany({
        where: { template_version: { in: versionIds } }
      });

      // 3. Delete linked items for these versions
      await tx.checklist_template_linked_items.deleteMany({
        where: { template_version_id: { in: versionIds } }
      });
    }

    // 4. Delete recipients
    await tx.templateRecipients.deleteMany({
      where: { checklist_template_id: templateId }
    });

    // 5. Delete owner
    await tx.checklist_template_owners.deleteMany({
      where: { checklist_template_id: templateId }
    });

    // 6. Nullify current_version_id on template to prevent foreign key issues during deletion
    await tx.checklist_template.update({
      where: { id: templateId },
      data: { current_version_id: null }
    });

    // 7. Delete versions
    if (versionIds.length > 0) {
      await tx.checklist_template_version.deleteMany({
        where: { checklist_template_id: templateId }
      });
    }

    // 8. Delete the template itself
    await tx.checklist_template.delete({
      where: { id: templateId }
    });
  });
};

const updateAdminTag = async (tagId, { recurrent, tag_name }) => {
  const updateData = {};
  if (recurrent !== undefined) updateData.recurrent = recurrent;
  if (tag_name !== undefined) updateData.tag_name = tag_name;

  await prisma.tags.update({
    where: { id: tagId },
    data: updateData
  });
};

const deleteAdminTag = async (tagId) => {
  await prisma.$transaction(async (tx) => {
    // 1. Disconnect all templates from this tag (make them unconnected/orphaned)
    await tx.checklist_template.updateMany({
      where: { tag_id: tagId },
      data: { tag_id: null }
    });

    // 2. Delete the tag itself
    await tx.tags.delete({
      where: { id: tagId }
    });
  });
};

const createAdminTag = async (authUserId, { tag_name, description, user_position, recurrent }) => {
  // Check if tag name already exists
  const existing = await prisma.tags.findUnique({
    where: { tag_name }
  });
  if (existing) {
    throw new Error('Tag name already exists');
  }

  return await prisma.tags.create({
    data: {
      tag_name,
      description: description || '',
      user_position,
      recurrent: recurrent || 'None',
      organisation_user_id: authUserId,
      created_at: new Date()
    }
  });
};

const getKpiNetwork = async () => {
  const items = await prisma.checklist_items.findMany({
    select: {
      id: true,
      checklist_name: true,
      input_type: true,
      kpi_config: { select: { aggregation: true } }
    },
    orderBy: { checklist_name: 'asc' }
  });

  const relationships = await prisma.checklist_item_relationship.findMany({
    select: { id: true, parent_item_id: true, child_item_id: true }
  });

  const avgQuery = `
    SELECT
      ci.id AS item_id,
      ci.input_type AS type,
      COUNT(r.id) AS total_count,
      SUM(CASE WHEN ci.input_type = 'Numeric' THEN CAST(COALESCE(NULLIF(r.input, ''), '0') AS DECIMAL(10,2)) ELSE 0 END) AS numeric_sum,
      SUM(CASE WHEN ci.input_type = 'Boolean' AND (r.input = 'Yes' OR r.input = '1' OR r.input = 'true' OR r.status = 1) THEN 1 ELSE 0 END) AS boolean_count
    FROM checklist_item_response r
    JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
    JOIN checklist_items ci ON li.checklist_item_id = ci.id
    GROUP BY ci.id, ci.input_type
  `;
  const rawAvg = await prisma.$queryRawUnsafe(avgQuery);
  const avgMap = {};
  rawAvg.forEach(row => {
    const count = Number(row.total_count || 0);
    const numericSum = Number(row.numeric_sum || 0);
    const booleanCount = Number(row.boolean_count || 0);
    let avg_value = row.type === 'Boolean'
      ? (count > 0 ? Number(((booleanCount / count) * 100).toFixed(1)) : 0)
      : (count > 0 ? Number((numericSum / count).toFixed(2)) : 0);
    avgMap[Number(row.item_id)] = { avg_value, total_count: count };
  });

  const parentMap = {};
  const childMap = {};
  relationships.forEach(rel => {
    if (!childMap[rel.parent_item_id]) childMap[rel.parent_item_id] = [];
    if (!parentMap[rel.child_item_id]) parentMap[rel.child_item_id] = [];
    childMap[rel.parent_item_id].push(rel.child_item_id);
    parentMap[rel.child_item_id].push(rel.parent_item_id);
  });

  const enrichedItems = items.map(item => ({
    id: item.id,
    checklist_name: item.checklist_name,
    input_type: item.input_type,
    avg_value: avgMap[item.id]?.avg_value ?? null,
    total_count: avgMap[item.id]?.total_count ?? 0,
    aggregation: item.kpi_config?.aggregation || 'Monthly',
    parent_ids: parentMap[item.id] || [],
    child_ids: childMap[item.id] || []
  }));

  return { items: enrichedItems, relationships };
};

const createKpiLink = async (parentItemId, childItemId) => {
  return await prisma.checklist_item_relationship.create({
    data: { parent_item_id: parseInt(parentItemId), child_item_id: parseInt(childItemId) }
  });
};

const deleteKpiLink = async (id) => {
  await prisma.checklist_item_relationship.delete({ where: { id: parseInt(id) } });
};

const updateKpiConfig = async (itemId, aggregation) => {
  return await prisma.checklist_item_kpi_config.upsert({
    where: { item_id: itemId },
    update: { aggregation },
    create: { item_id: itemId, aggregation }
  });
};

const getItemAnalytics = async (itemId, aggregation) => {
  const item = await prisma.checklist_items.findUnique({
    where: { id: itemId },
    select: { id: true, checklist_name: true, input_type: true, kpi_config: { select: { aggregation: true } } }
  });
  if (!item) return null;

  let groupFormat, labelFormat;
  switch (aggregation) {
    case 'Daily':
      groupFormat = `DATE_FORMAT(r.created_at, '%Y-%m-%d')`;
      labelFormat = `DATE_FORMAT(r.created_at, '%d %b %Y')`;
      break;
    case 'Weekly':
      groupFormat = `CONCAT(YEAR(r.created_at), '-W', LPAD(WEEK(r.created_at, 1), 2, '0'))`;
      labelFormat = `CONCAT('Wk ', WEEK(r.created_at, 1), ' ', YEAR(r.created_at))`;
      break;
    case 'Quarterly':
      groupFormat = `CONCAT(YEAR(r.created_at), '-Q', QUARTER(r.created_at))`;
      labelFormat = `CONCAT('Q', QUARTER(r.created_at), ' ', YEAR(r.created_at))`;
      break;
    default:
      groupFormat = `DATE_FORMAT(r.created_at, '%Y-%m')`;
      labelFormat = `DATE_FORMAT(r.created_at, '%b %Y')`;
  }

  const trendQuery = `
    SELECT
      ${labelFormat} AS period_label,
      ${groupFormat} AS sort_key,
      COUNT(r.id) AS total_count,
      SUM(CASE WHEN ci.input_type = 'Numeric' THEN CAST(COALESCE(NULLIF(r.input, ''), '0') AS DECIMAL(10,2)) ELSE 0 END) AS numeric_sum,
      SUM(CASE WHEN ci.input_type = 'Boolean' AND (r.input = 'Yes' OR r.input = '1' OR r.input = 'true' OR r.status = 1) THEN 1 ELSE 0 END) AS boolean_count
    FROM checklist_item_response r
    JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
    JOIN checklist_items ci ON li.checklist_item_id = ci.id
    WHERE ci.id = ?
    GROUP BY sort_key, period_label
    ORDER BY sort_key ASC
    LIMIT 24
  `;
  const overallQuery = `
    SELECT COUNT(r.id) AS total_count,
      SUM(CASE WHEN ci.input_type = 'Numeric' THEN CAST(COALESCE(NULLIF(r.input, ''), '0') AS DECIMAL(10,2)) ELSE 0 END) AS numeric_sum,
      SUM(CASE WHEN ci.input_type = 'Boolean' AND (r.input = 'Yes' OR r.input = '1' OR r.input = 'true' OR r.status = 1) THEN 1 ELSE 0 END) AS boolean_count
    FROM checklist_item_response r
    JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
    JOIN checklist_items ci ON li.checklist_item_id = ci.id
    WHERE ci.id = ?
  `;

  const [rawTrend, overallRaw] = await Promise.all([
    prisma.$queryRawUnsafe(trendQuery, itemId),
    prisma.$queryRawUnsafe(overallQuery, itemId)
  ]);

  const trend = rawTrend.map(row => {
    const count = Number(row.total_count || 0);
    const avg_value = item.input_type === 'Boolean'
      ? (count > 0 ? Number(((Number(row.boolean_count) / count) * 100).toFixed(1)) : 0)
      : (count > 0 ? Number((Number(row.numeric_sum) / count).toFixed(2)) : 0);
    return { period: row.period_label, avg_value, count };
  });

  const oc = Number(overallRaw[0]?.total_count || 0);
  const ons = Number(overallRaw[0]?.numeric_sum || 0);
  const obc = Number(overallRaw[0]?.boolean_count || 0);
  const overall_avg = item.input_type === 'Boolean'
    ? (oc > 0 ? Number(((obc / oc) * 100).toFixed(1)) : 0)
    : (oc > 0 ? Number((ons / oc).toFixed(2)) : 0);

  return {
    item: { id: item.id, checklist_name: item.checklist_name, input_type: item.input_type, aggregation: item.kpi_config?.aggregation || aggregation },
    overall_avg,
    total_responses: oc,
    trend
  };
};

module.exports = {
  getAdminTemplateTree,
  updateAdminTemplate,
  deleteAdminTemplate,
  updateAdminTag,
  deleteAdminTag,
  createAdminTag,
  getKpiNetwork,
  createKpiLink,
  deleteKpiLink,
  updateKpiConfig,
  getItemAnalytics
};
