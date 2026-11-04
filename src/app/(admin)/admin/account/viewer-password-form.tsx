"use client";

import { useActionState, useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { FormMessage, SubmitButton, TextField } from "@/components/admin/form-controls";
import { Button } from "@/components/ui/button";
import {
  clearViewerPasswordAction,
  setViewerPasswordAction,
  type ViewerPasswordState,
} from "./actions";

export function ViewerPasswordForm({ isSet }: { isSet: boolean }) {
  const [state, action] = useActionState<ViewerPasswordState, FormData>(setViewerPasswordAction, {
    ok: false,
    message: "",
  });
  const [confirming, setConfirming] = useState(false);
  const [clearState, setClearState] = useState<ViewerPasswordState | null>(null);
  const [pending, startTransition] = useTransition();

  // Thông báo mới nhất thắng: kết quả của lần tắt hoặc lần lưu gần nhất.
  const [shownFrom, setShownFrom] = useState<"set" | "clear">("set");
  const message = shownFrom === "clear" ? clearState : state.message ? state : null;

  function clear() {
    startTransition(async () => {
      setClearState(await clearViewerPasswordAction());
      setShownFrom("clear");
      setConfirming(false);
    });
  }

  return (
    <div className="max-w-sm space-y-4">
      <p className="text-sm">
        Trạng thái:{" "}
        <strong className={isSet ? "text-green-700" : "text-neutral-600"}>
          {isSet ? "Đang mở" : "Chưa mở"}
        </strong>
      </p>
      {message && (
        <FormMessage kind={message.ok ? "success" : "error"}>{message.message}</FormMessage>
      )}
      <form action={action} onSubmit={() => setShownFrom("set")} className="space-y-4">
        <TextField
          label="Mật khẩu xem mới"
          name="password"
          type="password"
          autoComplete="new-password"
        />
        <SubmitButton>Lưu</SubmitButton>
      </form>
      {isSet && (
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full"
          onClick={() => setConfirming(true)}
        >
          Tắt trang phân tích
        </Button>
      )}
      <ConfirmDialog
        open={confirming}
        title="Tắt trang phân tích?"
        confirmLabel="Tắt trang phân tích"
        danger
        pending={pending}
        onConfirm={clear}
        onCancel={() => setConfirming(false)}
      >
        Mật khẩu xem bị xóa và không ai mở được trang /phan-tich nữa cho tới khi bạn đặt mật khẩu
        mới.
      </ConfirmDialog>
    </div>
  );
}
