const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const updatedTag = await prisma.tags.update({
    where: { id: 81 },
    data: { user_position: 'DIGITAL_TRANSFORMATION' }
  });
  console.log("Tag updated:", updatedTag);
}

main().catch(console.error).finally(() => prisma.$disconnect());
