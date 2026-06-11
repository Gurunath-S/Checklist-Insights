const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const interns = await prisma.organisation_User_position.findMany({
    where: { user_position: 'ERODE_INTERN' },
    select: { organisation_user_id: true }
  });
  const ids = interns.map(i => i.organisation_user_id);
  console.log("Intern organization user IDs:", ids);

  if (ids.length === 0) {
    console.log("No intern IDs found!");
    return;
  }

  const responses = await prisma.checklist_item_response.findMany({
    where: { organisation_user_id: { in: ids } },
    take: 5
  });
  console.log("Sample responses:", responses);

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
    WHERE r.organisation_user_id IN (${ids.join(',')})
      AND (ou.exclude_from_reports IS NULL OR ou.exclude_from_reports = FALSE)
    GROUP BY ci.checklist_name, ci.input_type
  `;

  const results = await prisma.$queryRawUnsafe(query);
  console.log("Query Results:", results);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
