export default function AdminLoading() {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <div className="h-7 w-40 shimmer rounded bg-neutral-200" />
      <div className="h-4 w-72 shimmer rounded bg-neutral-200" />
      <div className="h-64 shimmer rounded-lg bg-neutral-200/70" />
      <span className="sr-only">Đang tải…</span>
    </div>
  );
}
