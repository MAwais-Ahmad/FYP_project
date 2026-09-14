const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true }
  });
  console.log('=== USERS IN DATABASE ===');
  console.log(JSON.stringify(users, null, 2));
}

main()
  .catch(err => console.error('Error fetching users:', err.message))
  .finally(() => prisma.$disconnect());
