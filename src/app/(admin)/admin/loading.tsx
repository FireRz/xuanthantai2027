export default function AdminLoading() {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <div className="shimmer h-7 w-40 rounded bg-neutral-200" />
      <div className="shimmer h-4 w-72 rounded bg-neutral-200" />
      <div className="shimmer h-64 rounded-lg bg-neutral-200/70" />
      <span className="sr-only">Đang tải…</span>
    </div>
  );
}
