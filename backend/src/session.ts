import { createHash, randomBytes } from "node:crypto";
import type { CookieOptions, RequestHandler, Response } from "express";
import { config, SESSION_COOKIE, SESSION_TTL_MS } from "./config.js";
import { prisma } from "./db.js";
import { HttpError } from "./errors.js";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: config.cookieSecure,
    path: "/",
  };
}

export async function createSession(res: Response, userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt } });
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(), expires: expiresAt });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, cookieOptions());
}

export async function destroySession(token: string | undefined): Promise<void> {
  if (!token) return;
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}

// Проверяет сессию по cookie; userId берётся только из сессии, не от клиента.
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== "string" || token.length === 0 || token.length > 200) {
    throw new HttpError(401, "Требуется вход");
  }
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, email: true } } },
  });
  if (!session) {
    throw new HttpError(401, "Требуется вход");
  }
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    throw new HttpError(401, "Сессия истекла, войдите снова");
  }
  req.user = session.user;
  next();
};
