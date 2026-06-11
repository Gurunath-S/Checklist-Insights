const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const internEmails = [
  'chandru@ibacustechlabs.live',
  'chandru@ibacustechlabs.in',
  'testerchandru72@gmail.com',
  'jasvanth@ibacustechlabs.live',
  'jasvanth@ibacustechlabs.in',
  'mailtojasvanth88@gmail.com',
  'shamima@ibacustechlabs.live',
  'shamima@ibacustechlabs.in'
];

async function main() {
  console.log("Altering database tables...");
  
  // Alter tags and Organisation_User_position tables to add ERODE_INTERN to their enums
  await prisma.$executeRawUnsafe(`
    ALTER TABLE tags 
    MODIFY COLUMN user_position ENUM(
      'FULL_STACK_DEVELOPER', 
      'POWER_BI_DEVELOPER', 
      'SALES', 
      'HUMAN_RESOURCE', 
      'TESTING', 
      'SALESFORCE', 
      'PUBLIC', 
      'DIGITAL_TRANSFORMATION', 
      'MARKETING',
      'ERODE_INTERN'
    ) DEFAULT 'PUBLIC'
  `);
  
  await prisma.$executeRawUnsafe(`
    ALTER TABLE Organisation_User_position 
    MODIFY COLUMN user_position ENUM(
      'FULL_STACK_DEVELOPER', 
      'POWER_BI_DEVELOPER', 
      'SALES', 
      'HUMAN_RESOURCE', 
      'TESTING', 
      'SALESFORCE', 
      'PUBLIC', 
      'DIGITAL_TRANSFORMATION', 
      'MARKETING',
      'ERODE_INTERN'
    ) DEFAULT 'PUBLIC'
  `);

  console.log("Database tables altered successfully.");
  console.log("Seeding Erode Interns...");

  for (const email of internEmails) {
    // Find User
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log(`User not found for email: ${email}`);
      continue;
    }

    // Find all Organisation_Users for this user
    const orgUsers = await prisma.organisation_Users.findMany({
      where: { user_id: user.id }
    });

    for (const ou of orgUsers) {
      // Check if position record already exists
      const existing = await prisma.organisation_User_position.findFirst({
        where: {
          organisation_user_id: ou.id,
          user_position: 'ERODE_INTERN'
        }
      });

      if (!existing) {
        await prisma.organisation_User_position.create({
          data: {
            organisation_user_id: ou.id,
            user_id: user.id,
            user_position: 'ERODE_INTERN'
          }
        });
        console.log(`Assigned ERODE_INTERN to user: ${user.name} (${email}) for org_user_id: ${ou.id}`);
      } else {
        console.log(`User ${user.name} (${email}) already has ERODE_INTERN role for org_user_id: ${ou.id}`);
      }
    }
  }

  console.log("Seeding completed successfully.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
