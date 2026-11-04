"use client";

import { LockKeyhole } from "lucide-react";
import { useActionState } from "react";
import { viewerLoginAction, type ViewerLoginState } from "@/app/(public)/phan-tich/actions";

/** Form "Mật khẩu xem phân tích" (P2): một ô mật khẩu và nút Xem; giữ bộ lọc qua trường ẩn `next`. */
export function ViewerPasswordForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<ViewerLoginState, FormData>(
    viewerLoginAction,
    {},
  );
  return (
    <form
      action={action}
      data-testid="viewer-password-form"
      aria-labelledby="viewer-password-heading"
      className="space-y-4"
    >
      <div>
        <h2
          id="viewer-password-heading"
          className="font-display text-navy flex items-center gap-2 text-xl font-semibold"
        >
          <LockKeyhole className="text-brand size-5" aria-hidden />
          Mật khẩu xem phân tích
        </h2>
        <p className="text-ink-muted mt-1 text-sm">Nhập mật khẩu được chia sẻ để xem số liệu.</p>
      </div>
      {state.error && (
        <p
          role="alert"
          data-testid="viewer-password-error"
          className="bg-status-short-soft text-status-short-fg rounded-lg px-3 py-2 text-sm font-medium"
        >
          {state.error}
        </p>
      )}
      <input type="hidden" name="next" value={next} />
      <label className="block space-y-1.5">
        <span className="font-semibold">Mật khẩu</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          autoFocus
          className="border-line focus-visible:outline-brand min-h-11 w-full rounded-lg border bg-white px-3 focus-visible:outline-2 focus-visible:outline-offset-2"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="bg-gold text-gold-fg hover:bg-gold-dark focus-visible:outline-brand min-h-11 w-full rounded-full px-5 font-semibold hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-70"
      >
        {pending ? "Đang kiểm tra…" : "Xem"}
      </button>
    </form>
  );
}
