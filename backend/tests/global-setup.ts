import { execSync } from "node:child_process";
import type { TestProject } from "vitest/node";

// Применяет Prisma migrations к отдельной тестовой базе перед запуском тестов.
export default function setup(project: TestProject) {
  const databaseUrl = project.config.env.DATABASE_URL as string;
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}
