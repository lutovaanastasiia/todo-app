import { createApp } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./db.js";

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`Backend слушает порт ${config.port}`);
});

process.on("unhandledRejection", (reason) => {
  console.error("Необработанный rejection:", reason instanceof Error ? reason.message : reason);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
