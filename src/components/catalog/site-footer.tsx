import { formatDateTime } from "@/lib/format";
import { getLastDataUpdate } from "@/server/services/catalog";
import { Logo } from "./logo";

/** Chân trang đỏ đậm (ADR-009 U16): tên web + thời điểm cập nhật dữ liệu gần nhất. */
export async function SiteFooter() {
  const updatedAt = await getLastDataUpdate();
  return (
    <footer className="bg-brand-dark text-festive-text">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-8 text-center sm:px-6 md:flex-row md:justify-between md:text-left">
        <div className="flex items-center gap-3">
          <Logo />
          <p className="font-display text-xl font-bold text-white">Xuân Thần Tài 2027</p>
        </div>
        <p data-testid="data-updated" className="text-sm">
          Dữ liệu cập nhật lần cuối:{" "}
          <time
            dateTime={updatedAt?.toISOString()}
            className="font-semibold whitespace-nowrap text-white"
          >
            {formatDateTime(updatedAt)}
          </time>
        </p>
      </div>
    </footer>
  );
}
