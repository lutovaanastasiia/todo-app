import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Todo } from "../src/api";
import { App } from "../src/App";
import { AuthProvider } from "../src/auth";

/**
 * Простой сетевой двойник backend: отвечает на fetch по тем же маршрутам и в том же
 * формате, что и настоящий API, и хранит состояние между запросами.
 */
function fakeBackend(options: { loggedIn: boolean; todos?: Todo[] }) {
  let loggedIn = options.loggedIn;
  const todos: Todo[] = [...(options.todos ?? [])];
  const user = { id: "u1", email: "user@example.com", createdAt: new Date().toISOString() };
  const calls: { method: string; path: string; body: unknown }[] = [];

  const json = (status: number, body?: unknown) =>
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, path: url.pathname, body });
    expect(init?.credentials).toBe("include");

    if (url.pathname === "/api/auth/me") return loggedIn ? json(200, { user }) : json(401, { error: "Требуется вход" });
    if (url.pathname === "/api/auth/register") {
      return json(409, {
        error: "Пользователь с таким email уже существует",
        fields: { email: "Этот email уже зарегистрирован" },
      });
    }
    if (url.pathname === "/api/auth/login") return json(401, { error: "Неверный email или пароль" });
    if (url.pathname === "/api/todos" && method === "GET") return json(200, { todos });
    if (url.pathname === "/api/todos" && method === "POST") {
      const todo: Todo = {
        id: `t${todos.length + 1}`,
        title: body.title,
        description: body.description ?? null,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      todos.unshift(todo);
      return json(201, { todo });
    }
    const match = url.pathname.match(/^\/api\/todos\/(.+)$/);
    if (match && method === "PATCH") {
      const todo = todos.find((t) => t.id === match[1]);
      if (!todo) return json(404, { error: "Задача не найдена" });
      Object.assign(todo, body);
      return json(200, { todo: { ...todo } });
    }
    return json(404, { error: "Не найдено" });
  });

  vi.stubGlobal("fetch", fetchMock);
  return { calls, todos, setLoggedIn: (v: boolean) => (loggedIn = v) };
}

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("Frontend", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("37. Frontend показывает ошибки регистрации", async () => {
    const backend = fakeBackend({ loggedIn: false });
    const user = userEvent.setup();
    renderApp("/register");

    await user.click(await screen.findByRole("button", { name: "Зарегистрироваться" }));
    expect(await screen.findByText("Укажите email")).toBeInTheDocument();
    expect(screen.getByText("Укажите пароль")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Email"), "12345");
    await user.type(screen.getByLabelText("Пароль"), "short");
    await user.click(screen.getByRole("button", { name: "Зарегистрироваться" }));
    expect(await screen.findByText("Некорректный формат email")).toBeInTheDocument();
    expect(screen.getByText("Пароль должен содержать минимум 8 символов")).toBeInTheDocument();
    expect(backend.calls.some((c) => c.path === "/api/auth/register")).toBe(false);

    await user.clear(screen.getByLabelText("Email"));
    await user.type(screen.getByLabelText("Email"), "taken@example.com");
    await user.clear(screen.getByLabelText("Пароль"));
    await user.type(screen.getByLabelText("Пароль"), "password123");
    await user.click(screen.getByRole("button", { name: "Зарегистрироваться" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Пользователь с таким email уже существует");
    expect(screen.getByText("Этот email уже зарегистрирован")).toBeInTheDocument();
  });

  it("38. Frontend показывает ошибку неверного входа", async () => {
    fakeBackend({ loggedIn: false });
    const user = userEvent.setup();
    renderApp("/login");

    await user.type(await screen.findByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Пароль"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Войти" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Неверный email или пароль");
    expect(screen.getByRole("heading", { name: "Вход" })).toBeInTheDocument();
  });

  it("39. Frontend создаёт задачу и отображает её", async () => {
    const backend = fakeBackend({ loggedIn: true });
    const user = userEvent.setup();
    renderApp("/");

    expect(await screen.findByText("Задач пока нет.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Название"), "Купить хлеб");
    await user.type(screen.getByLabelText("Описание (необязательно)"), "Чёрный");
    await user.click(screen.getByRole("button", { name: "Добавить" }));

    const item = (await screen.findByText("Купить хлеб")).closest("li")!;
    expect(within(item).getByText("Чёрный")).toBeInTheDocument();
    expect(screen.getByLabelText("Название")).toHaveValue("");
    expect(backend.calls).toContainEqual({
      method: "POST",
      path: "/api/todos",
      body: { title: "Купить хлеб", description: "Чёрный" },
    });
  });

  it("40. Frontend checkbox меняет состояние задачи", async () => {
    const backend = fakeBackend({
      loggedIn: true,
      todos: [{ id: "t1", title: "Позвонить", description: null, completed: false, createdAt: new Date().toISOString() }],
    });
    const user = userEvent.setup();
    renderApp("/");

    const checkbox = await screen.findByRole("checkbox", { name: "Выполнено: Позвонить" });
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    await waitFor(() => expect(checkbox).toBeChecked());
    expect(backend.todos[0].completed).toBe(true);
    await user.click(checkbox);
    await waitFor(() => expect(checkbox).not.toBeChecked());
    expect(backend.calls.filter((c) => c.method === "PATCH").map((c) => c.body)).toEqual([
      { completed: true },
      { completed: false },
    ]);
  });

  it("33. XSS payload отображается как текст", async () => {
    const payload = `<img src=x onerror="window.__xss=1"><script>window.__xss=1</script>`;
    fakeBackend({
      loggedIn: true,
      todos: [{ id: "t1", title: payload, description: payload, completed: false, createdAt: new Date().toISOString() }],
    });
    renderApp("/");

    const items = await screen.findAllByText(payload);
    expect(items).toHaveLength(2);
    expect(document.querySelector("li img")).toBeNull();
    expect(document.querySelector("li script")).toBeNull();
    expect((window as unknown as { __xss?: number }).__xss).toBeUndefined();
  });
});
