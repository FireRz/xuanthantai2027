"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton, TextField } from "@/components/admin/form-controls";
import { loginAction, type LoginState } from "./actions";

export function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const [state, action] = useActionState<LoginState, FormData>(loginAction, {});
  return (
    <form action={action} className="space-y-4">
      {notice && <FormMessage kind="success">{notice}</FormMessage>}
      {state.error && <FormMessage kind="error">{state.error}</FormMessage>}
      <input type="hidden" name="next" value={next} />
      <TextField label="Tên đăng nhập" name="username" autoComplete="username" />
      <TextField label="Mật khẩu" name="password" type="password" autoComplete="current-password" />
      <SubmitButton>Đăng nhập</SubmitButton>
    </form>
  );
}
