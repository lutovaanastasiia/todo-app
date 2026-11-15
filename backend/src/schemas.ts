import { z } from "zod";

export const credentialsSchema = z.strictObject({
  email: z
    .string({ error: "Укажите email" })
    .trim()
    .toLowerCase()
    .min(1, "Укажите email")
    .max(254, "Слишком длинный email")
    .pipe(z.email("Некорректный формат email")),
  password: z
    .string({ error: "Укажите пароль" })
    .min(8, "Пароль должен содержать минимум 8 символов")
    .max(128, "Пароль должен содержать не более 128 символов"),
});

const title = z
  .string({ error: "Название должно быть строкой" })
  .trim()
  .min(1, "Укажите название")
  .max(200, "Название должно быть не длиннее 200 символов");

const description = z
  .string({ error: "Описание должно быть строкой" })
  .max(2000, "Описание должно быть не длиннее 2000 символов")
  .nullable()
  .transform((value) => (value === null || value.trim() === "" ? null : value));

export const createTodoSchema = z.strictObject({
  title,
  description: description.optional(),
});

export const updateTodoSchema = z
  .strictObject({
    title: title.optional(),
    description: description.optional(),
    completed: z.boolean({ error: "Поле completed должно быть boolean" }).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "Нет полей для изменения" });

export const todoIdSchema = z.uuid("Некорректный идентификатор задачи");
