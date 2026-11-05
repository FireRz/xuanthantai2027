import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import { BRANCH_SHORT, CONTACT, DEPARTMENT, teamsChatUrl } from "@/lib/site";
import { getLastDataUpdate } from "@/server/services/catalog";
import { Logo } from "./logo";
import { WaveEdge } from "./wave-edge";

/**
 * Chân trang cùng màu đỏ và viền lượn với banner (ADR-009 U16'): tên web + chi nhánh bên trái (sát lề
 * trái, không bó trong khung giữa); bên phải là thời điểm cập nhật dữ liệu và người liên hệ qua Teams.
 */
export async function SiteFooter() {
  const updatedAt = await getLastDataUpdate();
  return (
    <footer className="bg-festive text-festive-text relative">
      <WaveEdge className="absolute inset-x-0 top-[-1px] h-3 w-full -scale-y-100 md:h-6" />
      {/* Nút "Lên đầu trang" nằm góc dưới phải: máy tính đệm phải; điện thoại từ 360px các dòng căn giữa không chạm nút, hẹp hơn thì đệm dưới. */}
      <div className="flex flex-col items-center gap-3 px-4 pt-6 pb-16 text-center min-[360px]:pb-5 sm:px-6 md:flex-row md:justify-between md:gap-6 md:pt-8 md:pr-24 md:pb-4 md:text-left">
        <div className="flex shrink-0 items-center gap-3">
          <Logo />
          <div className="text-left leading-tight">
            <p className="font-display text-xl font-bold whitespace-nowrap text-white uppercase">
              {BRANCH_SHORT}
            </p>
            <p
              data-testid="footer-department"
              className="font-display text-festive-text mt-0.5 text-sm font-semibold tracking-[0.02em] whitespace-nowrap"
            >
              {DEPARTMENT}
            </p>
          </div>
        </div>
        <div className="space-y-1 text-sm">
          <p data-testid="data-updated">
            Dữ liệu cập nhật lần cuối:{" "}
            <time
              dateTime={updatedAt?.toISOString()}
              className="font-semibold whitespace-nowrap text-white"
            >
              {formatDateTime(updatedAt)}
            </time>
          </p>
          <div
            data-testid="contact"
            className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 md:justify-start"
          >
            {/* Điện thoại: tên riêng một dòng để hàng cuối (Teams, Phân tích) căn giữa, không chạm nút lên đầu trang. */}
            <span className="w-full md:w-auto">
              Thắc mắc, góp ý: <b className="font-semibold text-white">{CONTACT.name}</b>
            </span>
            {CONTACT.teamsEmail ? (
              <a
                href={teamsChatUrl(CONTACT.teamsEmail)}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gold text-gold-fg hover:bg-gold-dark focus-visible:outline-gold inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 font-semibold hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <MessageCircle className="size-4" aria-hidden />
                Nhắn qua Teams
              </a>
            ) : (
              <span>(Teams)</span>
            )}
            <Link
              href="/phan-tich"
              prefetch={false}
              data-testid="footer-analytics-link"
              className="text-festive-text focus-visible:outline-gold inline-flex min-h-8 items-center rounded text-xs underline-offset-2 hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Phân tích
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
