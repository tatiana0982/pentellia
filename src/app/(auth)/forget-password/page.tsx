// src/app/(auth)/forgot-password/page.tsx
import AuthForm from "@/components/auth-form";

export default function ForgotPasswordPage() {
  return <AuthForm initialView="forgot-email" />;
}
