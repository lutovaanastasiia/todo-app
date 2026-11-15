import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type RequestHandler } from "express";
import { config } from "./config.js";
import { errorHandler, HttpError, notFoundHandler } from "./errors.js";
import { authRouter } from "./routes/auth.js";
import { todosRouter } from "./routes/todos.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Защита от CSRF: изменяющие запросы принимаются только с доверенного Origin.
const originCheck: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  if (req.get("origin") !== config.frontendOrigin) {
    return next(new HttpError(403, "Недоверенный источник запроса"));
  }
  next();
};

export function createApp() {
  const app = express();
  app.disable("x-powered-by");

  app.use(
    cors({
      origin: config.frontendOrigin,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type"],
    }),
  );
  app.use(originCheck);
  app.use(express.json({ limit: "20kb" }));
  app.use(cookieParser());

  app.use("/api/auth", authRouter);
  app.use("/api/todos", todosRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
