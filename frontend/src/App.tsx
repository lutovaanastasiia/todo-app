import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router";
import { useAuth } from "./auth";
import { Alert } from "./components/ui";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { TodosPage } from "./pages/TodosPage";

function Gate({ requireUser, children }: { requireUser: boolean; children: ReactNode }) {
  const { user, loading, error } = useAuth();
  if (loading) {
    return <p className="p-8 text-center text-slate-500">Загрузка…</p>;
  }
  if (error) {
    return (
      <div className="mx-auto max-w-sm p-8">
        <Alert>{error}</Alert>
      </div>
    );
  }
  if (requireUser && !user) return <Navigate to="/login" replace />;
  if (!requireUser && user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Gate requireUser>
            <TodosPage />
          </Gate>
        }
      />
      <Route
        path="/login"
        element={
          <Gate requireUser={false}>
            <LoginPage />
          </Gate>
        }
      />
      <Route
        path="/register"
        element={
          <Gate requireUser={false}>
            <RegisterPage />
          </Gate>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
