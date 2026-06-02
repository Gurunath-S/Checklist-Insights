const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const queryParams = ['SALES'];
  const dateFilterSql = ''; // No date filter for simplicity

  const meetingsByUserQuery = `
    SELECT 
      u.name AS name,
      SUM(CAST(COALESCE(NULLIF(r.input, ''), '0') AS DECIMAL(10,2))) AS value
    FROM checklist_item_response r
    JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
    JOIN checklist_items ci ON li.checklist_item_id = ci.id
    JOIN checklist_template_version v ON li.template_version_id = v.version_id
    JOIN checklist_template ct ON v.checklist_template_id = ct.id
    JOIN tags t ON ct.tag_id = t.id
    JOIN Organisation_Users ou ON r.organisation_user_id = ou.id
    JOIN User u ON ou.user_id = u.id
    WHERE t.user_position = ?
      AND ci.checklist_name IN ('No of In-Person meeting', 'No of Inperson Meeting')
      ${dateFilterSql}
    GROUP BY u.name
    ORDER BY value DESC
  `;

  const closuresByUserQuery = `
    SELECT 
      u.name AS name,
      SUM(CAST(COALESCE(NULLIF(r.input, ''), '0') AS DECIMAL(10,2))) AS value
    FROM checklist_item_response r
    JOIN checklist_template_linked_items li ON r.checklist_template_linked_items_id = li.id
    JOIN checklist_items ci ON li.checklist_item_id = ci.id
    JOIN checklist_template_version v ON li.template_version_id = v.version_id
    JOIN checklist_template ct ON v.checklist_template_id = ct.id
    JOIN tags t ON ct.tag_id = t.id
    JOIN Organisation_Users ou ON r.organisation_user_id = ou.id
    JOIN User u ON ou.user_id = u.id
    WHERE t.user_position = ?
      AND ci.checklist_name IN ('No of closure made', 'No of closures made')
      ${dateFilterSql}
    GROUP BY u.name
    ORDER BY value DESC
  `;

  const [meetingsByUser, closuresByUser, deptUsers] = await Promise.all([
    prisma.$queryRawUnsafe(meetingsByUserQuery, ...queryParams),
    prisma.$queryRawUnsafe(closuresByUserQuery, ...queryParams),
    prisma.organisation_User_position.findMany({
      where: { user_position: 'SALES' },
      include: {
        Organisation_Users: {
          include: { User: true }
        }
      }
    })
  ]);

  const activeSalespeople = [...new Set(
    deptUsers
      .map(du => du.Organisation_Users?.User?.name)
      .filter(Boolean)
  )];

  const mapToUsers = (resultsList) => {
    const userMap = {};
    activeSalespeople.forEach(name => {
      userMap[name] = 0;
    });
    resultsList.forEach(r => {
      userMap[r.name] = Number(r.value);
    });
    return Object.entries(userMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  console.log("RAW MEETINGS BY USER:", meetingsByUser);
  console.log("MAPPED MEETINGS BY USER:", mapToUsers(meetingsByUser));
  console.log("RAW CLOSURES BY USER:", closuresByUser);
  console.log("MAPPED CLOSURES BY USER:", mapToUsers(closuresByUser));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
