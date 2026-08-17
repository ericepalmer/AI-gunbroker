import { PrismaClient } from "@prisma/client";
import { auth } from "../src/lib/auth";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "Admin";

  if (!email || !password) {
    console.log("Skipping seed: set ADMIN_EMAIL and ADMIN_PASSWORD.");
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({
      where: { email },
      data: { role: "admin", emailVerified: true, banned: false },
    });
    console.log(`Admin ready: ${email}`);
    return;
  }

  await auth.api.signUpEmail({
    body: { email, password, name },
  });

  await prisma.user.update({
    where: { email },
    data: { role: "admin", emailVerified: true, banned: false },
  });

  console.log(`Created admin: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
