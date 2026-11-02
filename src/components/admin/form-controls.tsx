"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function TextField({
  label,
  name,
  type = "text",
  autoComplete,
  required = true,
}: {
  label: string;
  name: string;
  type?: "text" | "password";
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-neutral-800">
      {label}
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        className="mt-1 block h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm outline-none focus-visible:border-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-900/20"
      />
    </label>
  );
}

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="h-10 w-full">
      {pending ? "Đang xử lý…" : children}
    </Button>
  );
}

export function FormMessage({
  kind,
  children,
}: {
  kind: "error" | "success";
  children: React.ReactNode;
}) {
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={
        kind === "error"
          ? "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          : "rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"
      }
    >
      {children}
    </p>
  );
}
