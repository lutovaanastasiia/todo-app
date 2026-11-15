import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/db.js";
import { app, ORIGIN, registeredAgent, resetDb } from "./helpers.js";

type Agent = Awaited<ReturnType<typeof registeredAgent>>["agent"];

async function createTodo(agent: Agent, body: object = { title: "Купить молоко" }) {
  return agent.post("/api/todos").set("Origin", ORIGIN).send(body);
}

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe("CRUD задач", () => {
  it("15. Успешное создание TODO", async () => {
    const { agent, user } = await registeredAgent();
    const res = await createTodo(agent, { title: "  Купить молоко  ", description: "2 литра" });
    expect(res.status).toBe(201);
    expect(res.body.todo).toMatchObject({ title: "Купить молоко", description: "2 литра", completed: false });
    expect(res.body.todo.id).toBeTypeOf("string");
    expect(res.body.todo.createdAt).toBeTypeOf("string");
    expect(res.body.todo).not.toHaveProperty("userId");
    const stored = await prisma.todo.findUniqueOrThrow({ where: { id: res.body.todo.id } });
    expect(stored.userId).toBe(user.id);
  });

  it("16. Создание без title отклоняется", async () => {
    const { agent } = await registeredAgent();
    const res = await createTodo(agent, { description: "без названия" });
    expect(res.status).toBe(400);
    expect(res.body.fields.title).toBeDefined();
  });

  it("17. Title из пробелов отклоняется", async () => {
    const { agent } = await registeredAgent();
    const res = await createTodo(agent, { title: "     " });
    expect(res.status).toBe(400);
    expect(res.body.fields.title).toBeDefined();
  });

  it("18. Title длиннее 200 символов отклоняется", async () => {
    const { agent } = await registeredAgent();
    expect((await createTodo(agent, { title: "a".repeat(200) })).status).toBe(201);
    const res = await createTodo(agent, { title: "a".repeat(201) });
    expect(res.status).toBe(400);
    expect(res.body.fields.title).toBeDefined();
  });

  it("19. Некорректные типы полей отклоняются", async () => {
    const { agent } = await registeredAgent();
    expect((await createTodo(agent, { title: 123 })).status).toBe(400);
    expect((await createTodo(agent, { title: "ok", description: 5 })).status).toBe(400);
    expect((await createTodo(agent, { title: "ok", userId: randomUUID() })).status).toBe(400);
    expect((await createTodo(agent, { title: "ok", description: "a".repeat(2001) })).status).toBe(400);
    const created = await createTodo(agent);
    const patch = await agent
      .patch(`/api/todos/${created.body.todo.id}`)
      .set("Origin", ORIGIN)
      .send({ completed: "yes" });
    expect(patch.status).toBe(400);
    expect((await agent.patch("/api/todos/not-a-uuid").set("Origin", ORIGIN).send({ completed: true })).status).toBe(
      400,
    );
    expect(await prisma.todo.count()).toBe(1);
  });

  it("20. Получение списка собственных задач", async () => {
    const { agent } = await registeredAgent();
    await createTodo(agent, { title: "Первая" });
    await createTodo(agent, { title: "Вторая" });
    const res = await agent.get("/api/todos");
    expect(res.status).toBe(200);
    expect(res.body.todos.map((t: { title: string }) => t.title).sort()).toEqual(["Вторая", "Первая"]);
  });

  it("21. Успешное редактирование TODO", async () => {
    const { agent } = await registeredAgent();
    const created = await createTodo(agent);
    const res = await agent
      .patch(`/api/todos/${created.body.todo.id}`)
      .set("Origin", ORIGIN)
      .send({ title: "Новое название", description: "Новое описание" });
    expect(res.status).toBe(200);
    expect(res.body.todo).toMatchObject({ title: "Новое название", description: "Новое описание" });
    const stored = await prisma.todo.findUniqueOrThrow({ where: { id: created.body.todo.id } });
    expect(stored.title).toBe("Новое название");
  });

  it("22. Успешное удаление TODO", async () => {
    const { agent } = await registeredAgent();
    const created = await createTodo(agent);
    const res = await agent.delete(`/api/todos/${created.body.todo.id}`).set("Origin", ORIGIN);
    expect(res.status).toBe(204);
    expect(await prisma.todo.count()).toBe(0);
  });

  it("23. Переключение completed в true", async () => {
    const { agent } = await registeredAgent();
    const created = await createTodo(agent);
    const res = await agent.patch(`/api/todos/${created.body.todo.id}`).set("Origin", ORIGIN).send({ completed: true });
    expect(res.status).toBe(200);
    expect(res.body.todo.completed).toBe(true);
  });

  it("24. Переключение completed обратно в false", async () => {
    const { agent } = await registeredAgent();
    const created = await createTodo(agent);
    const url = `/api/todos/${created.body.todo.id}`;
    await agent.patch(url).set("Origin", ORIGIN).send({ completed: true });
    const res = await agent.patch(url).set("Origin", ORIGIN).send({ completed: false });
    expect(res.status).toBe(200);
    expect(res.body.todo.completed).toBe(false);
  });

  it("25. Статус сохраняется в PostgreSQL", async () => {
    const { agent } = await registeredAgent();
    const created = await createTodo(agent);
    await agent.patch(`/api/todos/${created.body.todo.id}`).set("Origin", ORIGIN).send({ completed: true });
    const rows = await prisma.$queryRaw<{ completed: boolean }[]>`SELECT completed FROM "Todo" WHERE id = ${created.body.todo.id}::uuid`;
    expect(rows[0].completed).toBe(true);
    const list = await agent.get("/api/todos");
    expect(list.body.todos[0].completed).toBe(true);
  });

  it("26. Редактирование отсутствующей задачи → 404", async () => {
    const { agent } = await registeredAgent();
    const res = await agent.patch(`/api/todos/${randomUUID()}`).set("Origin", ORIGIN).send({ title: "x" });
    expect(res.status).toBe(404);
  });

  it("27. Удаление отсутствующей задачи → 404", async () => {
    const { agent } = await registeredAgent();
    const res = await agent.delete(`/api/todos/${randomUUID()}`).set("Origin", ORIGIN);
    expect(res.status).toBe(404);
  });
});

describe("Изоляция пользователей", () => {
  async function twoUsers() {
    const a = await registeredAgent();
    const b = await registeredAgent();
    const todoB = (await createTodo(b.agent, { title: "Задача B" })).body.todo as { id: string };
    return { a, b, todoB };
  }

  it("28. Пользователь A не видит задачи B", async () => {
    const { a } = await twoUsers();
    await createTodo(a.agent, { title: "Задача A" });
    const res = await a.agent.get("/api/todos");
    expect(res.body.todos.map((t: { title: string }) => t.title)).toEqual(["Задача A"]);
  });

  it("29. Пользователь A не редактирует задачи B", async () => {
    const { a, todoB } = await twoUsers();
    const res = await a.agent.patch(`/api/todos/${todoB.id}`).set("Origin", ORIGIN).send({ title: "Взлом" });
    expect(res.status).toBe(404);
    expect((await prisma.todo.findUniqueOrThrow({ where: { id: todoB.id } })).title).toBe("Задача B");
  });

  it("30. Пользователь A не удаляет задачи B", async () => {
    const { a, todoB } = await twoUsers();
    const res = await a.agent.delete(`/api/todos/${todoB.id}`).set("Origin", ORIGIN);
    expect(res.status).toBe(404);
    expect(await prisma.todo.findUnique({ where: { id: todoB.id } })).not.toBeNull();
  });

  it("31. Пользователь A не меняет completed задачи B", async () => {
    const { a, todoB } = await twoUsers();
    const res = await a.agent.patch(`/api/todos/${todoB.id}`).set("Origin", ORIGIN).send({ completed: true });
    expect(res.status).toBe(404);
    expect((await prisma.todo.findUniqueOrThrow({ where: { id: todoB.id } })).completed).toBe(false);
  });
});

describe("Безопасность и устойчивость", () => {
  it("32. SQL injection payload не выполняется как SQL", async () => {
    const { agent } = await registeredAgent();
    const payload = `'); DROP TABLE "Todo"; --`;
    const res = await createTodo(agent, { title: payload });
    expect(res.status).toBe(201);
    expect(res.body.todo.title).toBe(payload);
    const loginRes = await request(app)
      .post("/api/auth/login")
      .set("Origin", ORIGIN)
      .send({ email: `' OR '1'='1' --@example.com`, password: `' OR '1'='1` });
    expect([400, 401]).toContain(loginRes.status);
    expect(await prisma.todo.count()).toBe(1);
    expect(await prisma.user.count()).toBe(1);
  });

  it("34. Некорректный JSON не роняет сервер", async () => {
    const { agent } = await registeredAgent();
    const res = await agent
      .post("/api/todos")
      .set("Origin", ORIGIN)
      .set("Content-Type", "application/json")
      .send('{"title": "broken"');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Некорректное тело запроса" });
    expect(JSON.stringify(res.body)).not.toMatch(/at .*\.js|SyntaxError/);
    expect((await agent.get("/api/todos")).status).toBe(200);
  });

  it("36. Запрос изменения с недоверенным Origin отклоняется", async () => {
    const { agent } = await registeredAgent();
    const evil = await agent.post("/api/todos").set("Origin", "http://evil.example").send({ title: "CSRF" });
    expect(evil.status).toBe(403);
    const noOrigin = await agent.post("/api/todos").send({ title: "CSRF" });
    expect(noOrigin.status).toBe(403);
    expect(await prisma.todo.count()).toBe(0);
    const preflight = await request(app).options("/api/todos").set("Origin", "http://evil.example");
    // CORS разрешает только фронтенд; браузер не пропустит ответ для чужого Origin.
    expect(preflight.headers["access-control-allow-origin"]).toBe(ORIGIN);
  });
});
