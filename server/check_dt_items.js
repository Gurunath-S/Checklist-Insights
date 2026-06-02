const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRawUnsafe(`
    SELECT ci.checklist_name, ci.input_type
    FROM checklist_items ci
    JOIN checklist_template_linked_items li ON ci.id = li.checklist_item_id
    JOIN checklist_template_version v ON li.template_version_id = v.version_id
    JOIN checklist_template ct ON v.checklist_template_id = ct.id
    WHERE ct.template_name LIKE '%Digital Transformation%'
  `);
  console.log("DT Checklist Items:", JSON.stringify(result, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
