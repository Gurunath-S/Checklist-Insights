const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`ALTER TABLE tags MODIFY COLUMN user_position ENUM('FULL_STACK_DEVELOPER', 'POWER_BI_DEVELOPER', 'SALES', 'HUMAN_RESOURCE', 'TESTING', 'SALESFORCE', 'PUBLIC', 'DIGITAL_TRANSFORMATION') DEFAULT 'PUBLIC'`);
  await prisma.$executeRawUnsafe(`ALTER TABLE Organisation_User_position MODIFY COLUMN user_position ENUM('FULL_STACK_DEVELOPER', 'POWER_BI_DEVELOPER', 'SALES', 'HUMAN_RESOURCE', 'TESTING', 'SALESFORCE', 'PUBLIC', 'DIGITAL_TRANSFORMATION') DEFAULT 'PUBLIC'`);
  
  await prisma.$executeRawUnsafe(`UPDATE tags SET user_position = 'DIGITAL_TRANSFORMATION' WHERE id = 81`);
  
  console.log("Database altered and tag updated successfully!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
