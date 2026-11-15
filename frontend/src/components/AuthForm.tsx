import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { ApiError, type User } from "../api";
import { useAuth } from "../auth";
import { validateCredentials } from "../validation";
import { Alert, Button, Field } from "./ui";

type Props = {
  mode: "login" | "register";
  submit: (email: string, password: string) => Promise<{ user: User }>;
};

export function AuthForm({ mode, submit }: Props) {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isLogin = mode === "login";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const errors = validateCredentials(email, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setSubmitting(true);
    try {
      const res = await submit(email.trim(), password);
      setUser(res.user);
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.fields);
        setFormError(err.message);
      } else {
        setFormError("Произошла ошибка");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow">
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">{isLogin ? "Вход" : "Регистрация"}</h1>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {formError && <Alert>{formError}</Alert>}
          <Field
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
          />
          <Field
            id="password"
            label="Пароль"
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
          />
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Подождите…" : isLogin ? "Войти" : "Зарегистрироваться"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-600">
          {isLogin ? (
            <>
              Нет аккаунта?{" "}
              <Link to="/register" className="text-blue-600 hover:underline">
                Зарегистрироваться
              </Link>
            </>
          ) : (
            <>
              Уже есть аккаунт?{" "}
              <Link to="/login" className="text-blue-600 hover:underline">
                Войти
              </Link>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
