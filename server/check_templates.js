const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const templates = await prisma.checklist_template.findMany({
    where: { template_name: { contains: 'Digital Transformation' } },
    include: { tag: true }
  });
  console.log("Templates found:", JSON.stringify(templates, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
