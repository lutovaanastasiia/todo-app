import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { api, ApiError, type Todo } from "../api";
import { useAuth } from "../auth";
import { TodoItem } from "../components/TodoItem";
import { Alert, Button, Field, TextArea } from "../components/ui";
import { validateTodo } from "../validation";

export function TodosPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Общая обработка ошибок API; при истёкшей сессии — на страницу входа.
  const handleError = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null);
        navigate("/login", { replace: true });
        return;
      }
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    },
    [navigate, setUser],
  );

  useEffect(() => {
    api
      .listTodos()
      .then((res) => setTodos(res.todos))
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [handleError]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const v = validateTodo(title, description);
    setFieldErrors(v);
    if (Object.keys(v).length > 0) return;
    setCreating(true);
    try {
      const res = await api.createTodo({
        title: title.trim(),
        ...(description.trim() ? { description } : {}),
      });
      setTodos((prev) => [res.todo, ...prev]);
      setTitle("");
      setDescription("");
    } catch (err) {
      if (err instanceof ApiError) setFieldErrors(err.fields);
      handleError(err);
    } finally {
      setCreating(false);
    }
  }

  async function toggle(todo: Todo) {
    setError(null);
    try {
      const res = await api.updateTodo(todo.id, { completed: !todo.completed });
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? res.todo : t)));
    } catch (err) {
      handleError(err);
    }
  }

  async function save(todo: Todo, data: { title: string; description: string | null }) {
    setError(null);
    try {
      const res = await api.updateTodo(todo.id, data);
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? res.todo : t)));
      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  }

  async function remove(todo: Todo) {
    setError(null);
    try {
      await api.deleteTodo(todo.id);
      setTodos((prev) => prev.filter((t) => t.id !== todo.id));
    } catch (err) {
      handleError(err);
    }
  }

  async function logout() {
    setLoggingOut(true);
    try {
      await api.logout();
    } catch {
      // Даже при ошибке сети локально выходим и отправляем на страницу входа.
    }
    setUser(null);
    navigate("/login", { replace: true });
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Мои задачи</h1>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>
          <Button variant="secondary" onClick={logout} disabled={loggingOut}>
            {loggingOut ? "Выход…" : "Выйти"}
          </Button>
        </header>

        <form onSubmit={create} noValidate className="space-y-3 rounded-lg bg-white p-4 shadow">
          <Field
            id="new-title"
            label="Название"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={fieldErrors.title}
          />
          <TextArea
            id="new-description"
            label="Описание (необязательно)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            error={fieldErrors.description}
          />
          <Button type="submit" disabled={creating}>
            {creating ? "Добавление…" : "Добавить"}
          </Button>
        </form>

        {error && <Alert>{error}</Alert>}

        {loading ? (
          <p className="text-slate-500">Загрузка…</p>
        ) : todos.length === 0 ? (
          <p className="text-slate-500">Задач пока нет.</p>
        ) : (
          <ul className="space-y-2">
            {todos.map((todo) => (
              <TodoItem key={todo.id} todo={todo} onToggle={toggle} onSave={save} onDelete={remove} />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
