function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Не задана переменная окружения ${name}`);
  }
  return value;
}

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export const config = {
  port: intFromEnv("PORT", 3001),
  databaseUrl: required("DATABASE_URL"),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000",
  cookieSecure: process.env.COOKIE_SECURE === "true",
  sessionTtlMs: intFromEnv("SESSION_TTL_HOURS", 24 * 7) * 60 * 60 * 1000,
  authRateLimitMax: intFromEnv("AUTH_RATE_LIMIT_MAX", 20),
  authRateLimitWindowMs: intFromEnv("AUTH_RATE_LIMIT_WINDOW_MINUTES", 15) * 60 * 1000,
};

export const SESSION_COOKIE = "sid";
