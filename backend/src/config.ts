if (!process.env.DATABASE_URL) {
  throw new Error("Не задана переменная окружения DATABASE_URL");
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000",
  cookieSecure: process.env.COOKIE_SECURE === "true",
};

export const SESSION_COOKIE = "sid";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 дней
export const AUTH_RATE_LIMIT = { windowMs: 15 * 60 * 1000, limit: 20 }; // 20 попыток за 15 минут
