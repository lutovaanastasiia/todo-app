import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError, type User } from "./api";

type AuthState = {
  user: User | null;
  loading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .me()
      .then((res) => setUserState(res.user))
      .catch((err) => {
        if (!(err instanceof ApiError && err.status === 401)) {
          setError(err instanceof Error ? err.message : "Произошла ошибка");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const setUser = useCallback((next: User | null) => {
    setUserState(next);
    setError(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, error, setUser }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth вне AuthProvider");
  return ctx;
}
