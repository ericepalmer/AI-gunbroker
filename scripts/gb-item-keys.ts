import { PrismaClient } from "@prisma/client";
import { withGunBrokerAccess } from "../src/lib/gunbroker/service";
import { getItem } from "../src/lib/gunbroker/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  await withGunBrokerAccess(user!.id, async (token) => {
    const item = await getItem(token, "15811068");
    const keys = Object.keys(item as object).sort();
    console.log(keys.join("\n"));
    for (const k of keys) {
      if (/char|manufact|calib|categ|round|ammo/i.test(k)) {
        console.log("\n", k, JSON.stringify((item as Record<string, unknown>)[k]));
      }
    }
  });
}

main().finally(() => prisma.$disconnect());
