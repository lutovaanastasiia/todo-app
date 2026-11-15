import argon2 from "argon2";
import { Prisma } from "@prisma/client";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { config, SESSION_COOKIE } from "../config.js";
import { prisma } from "../db.js";
import { HttpError } from "../errors.js";
import { credentialsSchema } from "../schemas.js";
import { clearSessionCookie, createSession, destroySession, requireAuth } from "../session.js";

const ARGON2_OPTIONS = { type: argon2.argon2id } as const;
const INVALID_CREDENTIALS = "Неверный email или пароль";

// Хеш для выравнивания времени ответа, когда пользователя не существует.
const dummyHashPromise = argon2.hash("dummy-password-for-timing", ARGON2_OPTIONS);

const authLimiter = rateLimit({
  windowMs: config.authRateLimitWindowMs,
  limit: config.authRateLimitMax,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: "Слишком много попыток, попробуйте позже" });
  },
});

function publicUser(user: { id: string; email: string; createdAt: Date }) {
  return { id: user.id, email: user.email, createdAt: user.createdAt };
}

export const authRouter = Router();

authRouter.post("/register", authLimiter, async (req, res) => {
  const { email, password } = credentialsSchema.parse(req.body);
  const passwordHash = await argon2.hash(password, ARGON2_OPTIONS);
  let user;
  try {
    user = await prisma.user.create({ data: { email, passwordHash } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new HttpError(409, "Пользователь с таким email уже существует", {
        email: "Этот email уже зарегистрирован",
      });
    }
    throw err;
  }
  await createSession(res, user.id);
  res.status(201).json({ user: publicUser(user) });
});

authRouter.post("/login", authLimiter, async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, INVALID_CREDENTIALS);
  }
  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  const valid = user
    ? await argon2.verify(user.passwordHash, password)
    : (await argon2.verify(await dummyHashPromise, password), false);
  if (!user || !valid) {
    throw new HttpError(401, INVALID_CREDENTIALS);
  }
  await createSession(res, user.id);
  res.status(200).json({ user: publicUser(user) });
});

authRouter.post("/logout", async (req, res) => {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  await destroySession(typeof token === "string" ? token : undefined);
  clearSessionCookie(res);
  res.status(204).end();
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) throw new HttpError(401, "Требуется вход");
  res.status(200).json({ user: publicUser(user) });
});
