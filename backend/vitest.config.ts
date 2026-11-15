import { defineConfig } from "vitest/config";

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? "postgresql://todo_test:todo_test@localhost:5433/todo_test?schema=public";

// Защита основной БД: тесты запускаются только на базе, в имени которой есть "test".
if (!new URL(testDatabaseUrl).pathname.includes("test")) {
  throw new Error("TEST_DATABASE_URL должна указывать на отдельную тестовую базу (имя содержит 'test')");
}

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./tests/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
    env: {
      DATABASE_URL: testDatabaseUrl,
      FRONTEND_ORIGIN: "http://localhost:3000",
      COOKIE_SECURE: "false",
      AUTH_RATE_LIMIT_MAX: "1000",
    },
  },
});
