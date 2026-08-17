import { connectGunBrokerAccount } from "../src/lib/gunbroker/service";
import { createAccessToken, pingGunBroker } from "../src/lib/gunbroker/client";
import { gunBrokerDefaultUsername } from "../src/lib/gunbroker/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const username = gunBrokerDefaultUsername() ?? "eepalmer";
  const password =
    process.env.GUNBROKER_PASSWORD ??
    process.env.GUNBROKER_SANDBOX_PASSWORD ??
    process.env.GUNBROKER_PRODUCTION_PASSWORD;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!password) {
    throw new Error("Set GUNBROKER_PASSWORD in .env");
  }

  const ping = await pingGunBroker();
  if (!ping.ok) {
    console.log(JSON.stringify({ ping: ping.error, token: "skipped" }, null, 2));
    return;
  }

  try {
    const token = await createAccessToken(username, password);
    console.log(
      JSON.stringify(
        { ping: "ok", token: token ? "issued" : "missing" },
        null,
        2,
      ),
    );
  } catch (error) {
    console.log(
      JSON.stringify(
        {
          ping: "ok",
          token: error instanceof Error ? error.message.split("\n")[0] : "failed",
        },
        null,
        2,
      ),
    );
    return;
  }

  if (!adminEmail) return;
  const user = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!user) {
    console.log("No Chamber admin user to attach credentials to.");
    return;
  }
  await connectGunBrokerAccount(user.id, { username, password });
  console.log(`GunBroker linked to ${adminEmail}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
