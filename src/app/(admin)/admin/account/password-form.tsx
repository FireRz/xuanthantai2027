"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton, TextField } from "@/components/admin/form-controls";
import { changePasswordAction, type ChangePasswordState } from "./actions";

export function PasswordForm() {
  const [state, action] = useActionState<ChangePasswordState, FormData>(changePasswordAction, {});
  return (
    <form action={action} className="max-w-sm space-y-4">
      {state.error && <FormMessage kind="error">{state.error}</FormMessage>}
      <TextField
        label="Mật khẩu hiện tại"
        name="current"
        type="password"
        autoComplete="current-password"
      />
      <TextField label="Mật khẩu mới" name="next" type="password" autoComplete="new-password" />
      <TextField
        label="Nhập lại mật khẩu mới"
        name="confirm"
        type="password"
        autoComplete="new-password"
      />
      <SubmitButton>Đổi mật khẩu</SubmitButton>
    </form>
  );
}
