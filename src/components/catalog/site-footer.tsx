import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import { BRANCH_SHORT, CONTACT, teamsChatUrl } from "@/lib/site";
import { getLastDataUpdate } from "@/server/services/catalog";
import { Logo } from "./logo";

/**
 * Chân trang đỏ đậm (ADR-009 U16): tên web + chi nhánh bên trái (sát lề trái, không bó trong khung giữa);
 * bên phải là thời điểm cập nhật dữ liệu và người liên hệ qua Teams.
 */
export async function SiteFooter() {
  const updatedAt = await getLastDataUpdate();
  return (
    <footer className="bg-brand-dark text-festive-text">
      {/* Chừa chỗ cho nút "Lên đầu trang" (góc dưới phải): điện thoại đệm dưới, máy tính đệm phải. */}
      <div className="flex flex-col items-center gap-4 px-4 pt-8 pb-20 text-center sm:px-6 md:flex-row md:justify-between md:pr-28 md:pb-8 md:text-left">
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Logo />
          <p className="font-display text-xl font-bold text-white uppercase">{BRANCH_SHORT}</p>
        </div>
        <div className="space-y-1.5 text-sm">
          <p data-testid="data-updated">
            Dữ liệu cập nhật lần cuối:{" "}
            <time
              dateTime={updatedAt?.toISOString()}
              className="font-semibold whitespace-nowrap text-white"
            >
              {formatDateTime(updatedAt)}
            </time>
          </p>
          <p
            data-testid="contact"
            className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 md:justify-start"
          >
            <span>
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
          </p>
          <p>
            <Link
              href="/phan-tich"
              prefetch={false}
              data-testid="footer-analytics-link"
              className="text-festive-text/80 focus-visible:outline-gold rounded text-xs underline-offset-2 hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Phân tích
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
