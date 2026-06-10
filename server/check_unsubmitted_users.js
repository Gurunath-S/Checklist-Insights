const prisma = require('./src/config/prisma');

async function main() {
  const users = await prisma.organisation_Users.findMany({
    include: {
      User: true,
      _count: {
        select: { responses: true }
      }
    }
  });
  
  console.log('Total users:', users.length);
  const unsubmitted = users.filter(u => u._count.responses === 0);
  console.log('Users with 0 submissions:', unsubmitted.length);
  unsubmitted.forEach(u => {
    console.log(`- ${u.User?.name} (${u.User?.email}) | Created: ${u.created_at} | Type: ${u.user_type}`);
  });
}
main().catch(console.error).finally(() => prisma.$disconnect());
