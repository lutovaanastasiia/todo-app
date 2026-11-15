import { api } from "../api";
import { AuthForm } from "../components/AuthForm";

export function LoginPage() {
  return <AuthForm mode="login" submit={api.login} />;
}
