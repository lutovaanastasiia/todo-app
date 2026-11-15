import { Router } from "express";
import { prisma } from "../db.js";
import { HttpError } from "../errors.js";
import { createTodoSchema, todoIdSchema, updateTodoSchema } from "../schemas.js";
import { requireAuth } from "../session.js";

const todoSelect = {
  id: true,
  title: true,
  description: true,
  completed: true,
  createdAt: true,
} as const;

const NOT_FOUND = "Задача не найдена";

function parseId(raw: unknown): string {
  const parsed = todoIdSchema.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, "Некорректный идентификатор задачи");
  return parsed.data;
}

export const todosRouter = Router();

todosRouter.use(requireAuth);

todosRouter.get("/", async (req, res) => {
  const todos = await prisma.todo.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
    select: todoSelect,
  });
  res.status(200).json({ todos });
});

todosRouter.post("/", async (req, res) => {
  const data = createTodoSchema.parse(req.body);
  const todo = await prisma.todo.create({
    data: { title: data.title, description: data.description ?? null, userId: req.user!.id },
    select: todoSelect,
  });
  res.status(201).json({ todo });
});

todosRouter.patch("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const data = updateTodoSchema.parse(req.body);
  // Владелец проверяется в условии запроса: чужая и отсутствующая задача неотличимы (404).
  const result = await prisma.todo.updateMany({ where: { id, userId: req.user!.id }, data });
  if (result.count === 0) throw new HttpError(404, NOT_FOUND);
  const todo = await prisma.todo.findFirstOrThrow({ where: { id, userId: req.user!.id }, select: todoSelect });
  res.status(200).json({ todo });
});

todosRouter.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const result = await prisma.todo.deleteMany({ where: { id, userId: req.user!.id } });
  if (result.count === 0) throw new HttpError(404, NOT_FOUND);
  res.status(204).end();
});
