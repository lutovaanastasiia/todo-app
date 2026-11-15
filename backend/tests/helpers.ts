import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";

export const ORIGIN = "http://localhost:3000";
export const app = createApp();

export async function resetDb() {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Session", "Todo", "User" CASCADE');
}

let counter = 0;
export function uniqueEmail() {
  counter += 1;
  return `user${Date.now()}_${counter}@example.com`;
}

/** Регистрирует пользователя и возвращает agent с cookie сессии. */
export async function registeredAgent(email = uniqueEmail(), password = "password123") {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/register").set("Origin", ORIGIN).send({ email, password });
  if (res.status !== 201) throw new Error(`Регистрация не удалась: ${res.status}`);
  return { agent, email, password, user: res.body.user as { id: string; email: string } };
}

export function sessionCookie(res: request.Response): string | undefined {
  const raw = res.headers["set-cookie"] as unknown as string[] | undefined;
  return raw?.find((c) => c.startsWith("sid="))?.split(";")[0];
}
