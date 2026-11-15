import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export function fieldsFromZod(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_";
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "Не найдено" });
};

// Единый формат ошибок: { error: string, fields?: { [поле]: сообщение } }.
// Stack trace и внутренние детали клиенту не отдаются.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, ...(err.fields ? { fields: err.fields } : {}) });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Некорректные данные", fields: fieldsFromZod(err) });
    return;
  }
  // Ошибки body-parser: невалидный JSON, слишком большое тело и т.п.
  if (err && typeof err === "object" && "type" in err && typeof err.type === "string" && err.type.startsWith("entity.")) {
    res.status(400).json({ error: "Некорректное тело запроса" });
    return;
  }
  if (err && typeof err === "object" && "type" in err && err.type === "encoding.unsupported") {
    res.status(400).json({ error: "Некорректное тело запроса" });
    return;
  }
  console.error("Необработанная ошибка:", err instanceof Error ? `${err.name}: ${err.message}` : err);
  res.status(500).json({ error: "Внутренняя ошибка сервера" });
};
