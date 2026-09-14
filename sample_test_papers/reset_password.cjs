const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function resetPassword() {
  const email = 'abdullahbai.99999@gmail.com';
  const newPassword = 'password123';
  const newHash = hashPassword(newPassword);

  const updated = await prisma.user.updateMany({
    where: { email: email },
    data: { passwordHash: newHash, isVerified: true }
  });

  console.log(`✅ Password reset successfully for ${email}`);
  console.log(`🔑 New Password: ${newPassword}`);
}

resetPassword()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
