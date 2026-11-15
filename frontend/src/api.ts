export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export type User = { id: string; email: string; createdAt: string };
export type Todo = {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  createdAt: string;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      credentials: "include",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Сервер недоступен. Проверьте подключение и попробуйте снова.");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? "Произошла ошибка", data?.fields ?? {});
  }
  return data as T;
}

export const api = {
  me: () => request<{ user: User }>("GET", "/api/auth/me"),
  register: (email: string, password: string) =>
    request<{ user: User }>("POST", "/api/auth/register", { email, password }),
  login: (email: string, password: string) => request<{ user: User }>("POST", "/api/auth/login", { email, password }),
  logout: () => request<void>("POST", "/api/auth/logout"),
  listTodos: () => request<{ todos: Todo[] }>("GET", "/api/todos"),
  createTodo: (data: { title: string; description?: string }) => request<{ todo: Todo }>("POST", "/api/todos", data),
  updateTodo: (id: string, data: Partial<Pick<Todo, "title" | "description" | "completed">>) =>
    request<{ todo: Todo }>("PATCH", `/api/todos/${encodeURIComponent(id)}`, data),
  deleteTodo: (id: string) => request<void>("DELETE", `/api/todos/${encodeURIComponent(id)}`),
};
