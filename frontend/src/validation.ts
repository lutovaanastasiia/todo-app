const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCredentials(email: string, password: string): Record<string, string> {
  const errors: Record<string, string> = {};
  const trimmed = email.trim();
  if (!trimmed) errors.email = "Укажите email";
  else if (!EMAIL_RE.test(trimmed)) errors.email = "Некорректный формат email";
  if (!password) errors.password = "Укажите пароль";
  else if (password.length < 8) errors.password = "Пароль должен содержать минимум 8 символов";
  return errors;
}

export function validateTodo(title: string, description: string): Record<string, string> {
  const errors: Record<string, string> = {};
  const t = title.trim();
  if (!t) errors.title = "Укажите название";
  else if (t.length > 200) errors.title = "Название должно быть не длиннее 200 символов";
  if (description.length > 2000) errors.description = "Описание должно быть не длиннее 2000 символов";
  return errors;
}
