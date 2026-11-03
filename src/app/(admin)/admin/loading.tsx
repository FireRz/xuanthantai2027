export default function AdminLoading() {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <div className="h-7 w-40 animate-pulse rounded bg-neutral-200" />
      <div className="h-4 w-72 animate-pulse rounded bg-neutral-200" />
      <div className="h-64 animate-pulse rounded-lg bg-neutral-200/70" />
      <span className="sr-only">Đang tải…</span>
    </div>
  );
}
