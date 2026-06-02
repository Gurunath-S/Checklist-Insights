const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orgPos = await prisma.organisation_User_position.groupBy({
    by: ['user_position'],
    _count: { id: true }
  });
  console.log("Organisation_User_position departments:", orgPos);

  const tagsPos = await prisma.tags.groupBy({
    by: ['user_position'],
    _count: { id: true }
  });
  console.log("Tags departments:", tagsPos);
}

main().catch(console.error).finally(() => prisma.$disconnect());
