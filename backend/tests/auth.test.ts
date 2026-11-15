import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/db.js";
import { app, ORIGIN, registeredAgent, resetDb, sessionCookie, uniqueEmail } from "./helpers.js";

const register = (body: unknown) => request(app).post("/api/auth/register").set("Origin", ORIGIN).send(body as object);
const login = (body: unknown) => request(app).post("/api/auth/login").set("Origin", ORIGIN).send(body as object);

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe("Регистрация", () => {
  it("01. Успешная регистрация с корректными данными", async () => {
    const email = uniqueEmail();
    const res = await register({ email, password: "password123" });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(email);
    expect(res.body.user).not.toHaveProperty("passwordHash");
    const cookie = (res.headers["set-cookie"] as unknown as string[]).find((c) => c.startsWith("sid="))!;
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(await prisma.user.count({ where: { email } })).toBe(1);
  });

  it("02. Повторная регистрация существующего email → конфликт", async () => {
    const email = uniqueEmail();
    await register({ email, password: "password123" });
    const res = await register({ email: email.toUpperCase(), password: "another-pass" });
    expect(res.status).toBe(409);
    expect(res.body.error).toBeTypeOf("string");
  });

  it("03. Регистрация с email «12345» отклоняется", async () => {
    const res = await register({ email: "12345", password: "password123" });
    expect(res.status).toBe(400);
    expect(res.body.fields.email).toBeDefined();
  });

  it("04. Пустой email отклоняется", async () => {
    const res = await register({ email: "", password: "password123" });
    expect(res.status).toBe(400);
    expect(res.body.fields.email).toBeDefined();
  });

  it("05. Пароль короче 8 символов отклоняется", async () => {
    const res = await register({ email: uniqueEmail(), password: "1234567" });
    expect(res.status).toBe(400);
    expect(res.body.fields.password).toBeDefined();
    expect(await prisma.user.count()).toBe(0);
  });

  it("06. Отсутствующий пароль отклоняется", async () => {
    const res = await register({ email: uniqueEmail() });
    expect(res.status).toBe(400);
    expect(res.body.fields.password).toBeDefined();
  });

  it("07. Пароль в базе хранится только как хеш", async () => {
    const email = uniqueEmail();
    const password = "my-secret-password";
    await register({ email, password });
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user.passwordHash).not.toBe(password);
    expect(user.passwordHash).not.toContain(password);
    expect(user.passwordHash.startsWith("$argon2id$")).toBe(true);
  });
});

describe("Вход и сессии", () => {
  it("08. Успешный вход", async () => {
    const { email, password } = await registeredAgent();
    const res = await login({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(email);
    expect(res.body.user).not.toHaveProperty("passwordHash");
    expect(sessionCookie(res)).toBeDefined();
  });

  it("09. Неверный пароль отклоняется", async () => {
    const { email } = await registeredAgent();
    const res = await login({ email, password: "wrong-password" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Неверный email или пароль");
    expect(sessionCookie(res)).toBeUndefined();
  });

  it("10. Несуществующий email отклоняется без раскрытия аккаунта", async () => {
    const { email } = await registeredAgent();
    const wrongPassword = await login({ email, password: "wrong-password" });
    const missing = await login({ email: "nobody@example.com", password: "wrong-password" });
    expect(missing.status).toBe(401);
    expect(missing.body).toEqual(wrongPassword.body);
  });

  it("11. Неавторизованный запрос к TODO отклоняется", async () => {
    const res = await request(app).get("/api/todos");
    expect(res.status).toBe(401);
  });

  it("12. Авторизованный запрос к TODO проходит", async () => {
    const { agent } = await registeredAgent();
    const res = await agent.get("/api/todos");
    expect(res.status).toBe(200);
    expect(res.body.todos).toEqual([]);
  });

  it("13. Logout завершает сессию", async () => {
    const { agent, user } = await registeredAgent();
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(1);
    const res = await agent.post("/api/auth/logout").set("Origin", ORIGIN);
    expect(res.status).toBe(204);
    expect((res.headers["set-cookie"] as unknown as string[]).join(";")).toMatch(/sid=;/);
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0);
  });

  it("14. Старая сессия после logout недействительна", async () => {
    const email = uniqueEmail();
    const reg = await register({ email, password: "password123" });
    const cookie = sessionCookie(reg)!;
    expect((await request(app).get("/api/auth/me").set("Cookie", cookie)).status).toBe(200);
    await request(app).post("/api/auth/logout").set("Origin", ORIGIN).set("Cookie", cookie);
    expect((await request(app).get("/api/auth/me").set("Cookie", cookie)).status).toBe(401);
    expect((await request(app).get("/api/todos").set("Cookie", cookie)).status).toBe(401);
  });

  it("35. Недействительный session token не даёт доступ", async () => {
    await registeredAgent();
    const res = await request(app).get("/api/todos").set("Cookie", "sid=invalid-token-value");
    expect(res.status).toBe(401);
    const me = await request(app).get("/api/auth/me").set("Cookie", "sid=invalid-token-value");
    expect(me.status).toBe(401);
  });
});
