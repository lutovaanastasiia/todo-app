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
  } else if (err instanceof ZodError) {
    res.status(400).json({ error: "Некорректные данные", fields: fieldsFromZod(err) });
  } else if (err?.status >= 400 && err?.status < 500) {
    // Ошибки express.json: невалидный JSON, слишком большое тело.
    res.status(400).json({ error: "Некорректное тело запроса" });
  } else {
    console.error("Необработанная ошибка:", err instanceof Error ? err.message : err);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
