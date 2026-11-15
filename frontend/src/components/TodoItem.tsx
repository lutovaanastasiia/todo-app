import { useState, type FormEvent } from "react";
import type { Todo } from "../api";
import { validateTodo } from "../validation";
import { Button, Field, TextArea } from "./ui";

type Props = {
  todo: Todo;
  onToggle: (todo: Todo) => Promise<void>;
  onSave: (todo: Todo, data: { title: string; description: string | null }) => Promise<boolean>;
  onDelete: (todo: Todo) => Promise<void>;
};

export function TodoItem({ todo, onToggle, onSave, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(todo.title);
  const [description, setDescription] = useState(todo.description ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const v = validateTodo(title, description);
    setErrors(v);
    if (Object.keys(v).length > 0) return;
    await run(async () => {
      const ok = await onSave(todo, { title: title.trim(), description: description.trim() ? description : null });
      if (ok) setEditing(false);
    });
  }

  if (editing) {
    return (
      <li className="rounded-md border border-slate-200 bg-white p-3">
        <form onSubmit={save} noValidate className="space-y-3">
          <Field
            id={`title-${todo.id}`}
            label="Название"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={errors.title}
          />
          <TextArea
            id={`description-${todo.id}`}
            label="Описание"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            error={errors.description}
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Сохранение…" : "Сохранить"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setEditing(false);
                setTitle(todo.title);
                setDescription(todo.description ?? "");
                setErrors({});
              }}
            >
              Отмена
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-3 sm:flex-row sm:items-start">
      <input
        id={`completed-${todo.id}`}
        type="checkbox"
        checked={todo.completed}
        disabled={busy}
        onChange={() => run(() => onToggle(todo))}
        aria-label={`Выполнено: ${todo.title}`}
        className="mt-1 h-5 w-5 shrink-0 accent-blue-600"
      />
      <div className="min-w-0 flex-1">
        <p className={`break-words font-medium ${todo.completed ? "text-slate-400 line-through" : "text-slate-900"}`}>
          {todo.title}
        </p>
        {todo.description && (
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-600">{todo.description}</p>
        )}
        <p className="mt-1 text-xs text-slate-400">{new Date(todo.createdAt).toLocaleString("ru-RU")}</p>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" disabled={busy} onClick={() => setEditing(true)}>
          Изменить
        </Button>
        <Button type="button" variant="danger" disabled={busy} onClick={() => run(() => onDelete(todo))}>
          Удалить
        </Button>
      </div>
    </li>
  );
}
