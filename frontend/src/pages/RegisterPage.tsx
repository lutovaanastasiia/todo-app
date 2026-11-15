import { api } from "../api";
import { AuthForm } from "../components/AuthForm";

export function RegisterPage() {
  return <AuthForm mode="register" submit={api.register} />;
}
