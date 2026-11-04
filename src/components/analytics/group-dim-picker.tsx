import Link from "next/link";
import { GROUP_DIM_LABELS, GROUP_DIMS, type GroupDim } from "@/lib/analytics-params";
import { buildCatalogQuery, type CatalogParams } from "@/lib/catalog-params";
import { cn } from "@/lib/utils";

/** URL `/phan-tich` cho bộ lọc và chiều nhóm (bỏ `sp`; `nhom` mặc định brand thì không ghi). */
export function analyticsHref(params: CatalogParams, dim: GroupDim): string {
  const q = buildCatalogQuery({ ...params, sp: null });
  const keep = dim === "brand" ? "" : `nhom=${dim}`;
  const query = keep ? (q ? `${q}&${keep}` : `?${keep}`) : q;
  return `/phan-tich${query}`;
}

/** Chọn chiều nhóm của bảng so sánh: mỗi chiều là một link giữ nguyên bộ lọc. */
export function GroupDimPicker({ params, dim }: { params: CatalogParams; dim: GroupDim }) {
  return (
    <nav aria-label="So sánh theo" data-testid="group-dim-picker">
      <ul className="flex flex-wrap gap-2">
        {GROUP_DIMS.map((d) => {
          const active = d === dim;
          return (
            <li key={d}>
              <Link
                href={analyticsHref(params, d)}
                scroll={false}
                prefetch={false}
                aria-current={active ? "page" : undefined}
                data-testid="group-dim"
                data-dim={d}
                className={cn(
                  "focus-visible:outline-brand inline-flex min-h-10 items-center rounded-full border px-4 font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2",
                  active
                    ? "bg-brand border-brand text-white"
                    : "border-line text-navy hover:border-brand bg-white",
                )}
              >
                {GROUP_DIM_LABELS[d]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
