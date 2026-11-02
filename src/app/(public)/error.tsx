"use client";

// Lỗi tải danh mục (UI-DESIGN §6): thông báo + nút Thử lại.
export default function CatalogError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <div role="alert" data-testid="error-state">
        <h1 className="font-display text-2xl font-semibold">Không tải được danh mục</h1>
        <p className="text-ink-muted mt-2">Có lỗi khi lấy dữ liệu. Vui lòng thử lại sau ít phút.</p>
        <button
          type="button"
          onClick={reset}
          className="bg-gold text-gold-fg hover:bg-gold-dark mt-6 min-h-11 rounded-full px-6 font-semibold hover:text-white"
        >
          Thử lại
        </button>
      </div>
    </main>
  );
}
