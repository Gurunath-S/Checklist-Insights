const prisma = require('./src/config/prisma');

async function main() {
  const result = await prisma.$queryRaw`
    SELECT DISTINCT ci.checklist_name, ci.input_type
    FROM checklist_item_response r
    JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
    JOIN checklist_items ci ON li.checklist_item_id = ci.id
    JOIN checklist_template_version v ON li.template_version_id = v.version_id
    JOIN checklist_template ct ON v.checklist_template_id = ct.id
    JOIN tags t ON ct.tag_id = t.id
    WHERE t.user_position = 'TESTING'
  `;
  console.log('TESTING Checklist Items:', result);
}

main().catch(console.error).finally(() => prisma.$disconnect());
