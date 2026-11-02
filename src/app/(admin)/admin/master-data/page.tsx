import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/server/auth/require-admin";
import { prisma } from "@/server/db";
import { AddForm } from "./add-form";
import { SetupGuide } from "./setup-guide";
import { ItemRow } from "./item-row";

export const metadata: Metadata = { title: "Danh mục" };
export const dynamic = "force-dynamic";

const TABS = [
  { key: "brands", label: "Nhãn hàng" },
  { key: "materials", label: "Chất liệu" },
  { key: "stores", label: "Cửa hàng" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const parseTab = (v: string | string[] | undefined): TabKey =>
  TABS.find((t) => t.key === v)?.key ?? "brands";

export default async function MasterDataPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  await requireAdminPage();
  const tab = parseTab((await searchParams).tab);
  const [stores, brands, lines, collections, materials] = await Promise.all([
    prisma.store.count(),
    prisma.brand.count(),
    prisma.productLine.count(),
    prisma.collection.count(),
    prisma.material.count(),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Danh mục</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Nhãn hàng, dòng hàng, bộ sưu tập, chất liệu và cửa hàng. Mục đang được dùng không xóa
          được, chỉ ẩn.
        </p>
      </div>

      <SetupGuide counts={{ stores, brands, lines, collections, materials }} />

      <nav aria-label="Loại danh mục" className="flex gap-1 border-b border-neutral-200">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/master-data?tab=${t.key}`}
            aria-current={t.key === tab ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              t.key === tab
                ? "border-[#B3261E] text-[#B3261E]"
                : "border-transparent text-neutral-600 hover:text-neutral-900"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "brands" && <BrandsTab />}
      {tab === "materials" && <MaterialsTab />}
      {tab === "stores" && <StoresTab />}
    </div>
  );
}

const card = "rounded-xl border border-neutral-200 bg-white p-5";

async function BrandsTab() {
  const brands = await prisma.brand.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { products: true } },
      lines: { orderBy: { name: "asc" }, include: { _count: { select: { products: true } } } },
      collections: {
        orderBy: { name: "asc" },
        include: { _count: { select: { products: true } } },
      },
    },
  });

  return (
    <div className="space-y-4">
      <section className={card} aria-labelledby="add-brand">
        <h2 id="add-brand" className="mb-2 font-semibold">
          Thêm nhãn hàng
        </h2>
        <AddForm kind="brand" label="Thêm nhãn" />
      </section>

      {brands.length === 0 ? (
        <p className="text-sm text-neutral-600">Chưa có nhãn hàng nào.</p>
      ) : (
        <ul className="space-y-4">
          {brands.map((b) => (
            <li key={b.id} className={card} data-testid="brand-card">
              <ul>
                <ItemRow
                  kind="brand"
                  item={{ id: b.id, name: b.name, active: b.active, usage: b._count.products }}
                />
              </ul>
              <div className="mt-3 grid gap-6 border-t border-neutral-100 pt-3 md:grid-cols-2">
                <div>
                  <h3 className="mb-1 text-sm font-semibold text-neutral-700">Dòng hàng</h3>
                  {b.lines.length === 0 ? (
                    <p className="py-2 text-sm text-neutral-500">Chưa có dòng nào.</p>
                  ) : (
                    <ul className="divide-y divide-neutral-100">
                      {b.lines.map((l) => (
                        <ItemRow
                          key={l.id}
                          kind="line"
                          item={{
                            id: l.id,
                            name: l.name,
                            active: l.active,
                            usage: l._count.products,
                          }}
                        />
                      ))}
                    </ul>
                  )}
                  <div className="mt-2">
                    <AddForm kind="line" brandId={b.id} label={`Thêm dòng — ${b.name}`} />
                  </div>
                </div>
                <div>
                  <h3 className="mb-1 text-sm font-semibold text-neutral-700">Bộ sưu tập</h3>
                  {b.collections.length === 0 ? (
                    <p className="py-2 text-sm text-neutral-500">Chưa có bộ sưu tập nào.</p>
                  ) : (
                    <ul className="divide-y divide-neutral-100">
                      {b.collections.map((c) => (
                        <ItemRow
                          key={c.id}
                          kind="collection"
                          item={{
                            id: c.id,
                            name: c.name,
                            active: c.active,
                            usage: c._count.products,
                          }}
                        />
                      ))}
                    </ul>
                  )}
                  <div className="mt-2">
                    <AddForm kind="collection" brandId={b.id} label={`Thêm BST — ${b.name}`} />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

async function MaterialsTab() {
  const materials = await prisma.material.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return (
    <div className="space-y-4">
      <section className={card} aria-labelledby="add-material">
        <h2 id="add-material" className="mb-2 font-semibold">
          Thêm chất liệu / tuổi vàng
        </h2>
        <AddForm kind="material" label="Thêm chất liệu" />
      </section>
      <section className={card} aria-label="Danh sách chất liệu">
        {materials.length === 0 ? (
          <p className="text-sm text-neutral-600">Chưa có chất liệu nào.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {materials.map((m) => (
              <ItemRow
                key={m.id}
                kind="material"
                item={{ id: m.id, name: m.name, active: m.active, usage: m._count.products }}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

async function StoresTab() {
  const stores = await prisma.store.findMany({
    orderBy: { code: "asc" },
    include: { _count: { select: { quantities: true } } },
  });
  return (
    <div className="space-y-4">
      <section className={card} aria-labelledby="add-store">
        <h2 id="add-store" className="mb-2 font-semibold">
          Thêm cửa hàng
        </h2>
        <AddForm kind="store" label="Thêm cửa hàng" />
      </section>
      <section className={card} aria-label="Danh sách cửa hàng">
        {stores.length === 0 ? (
          <p className="text-sm text-neutral-600">Chưa có cửa hàng nào.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {stores.map((s) => (
              <ItemRow
                key={s.id}
                kind="store"
                item={{
                  id: s.id,
                  code: s.code,
                  name: s.name,
                  active: s.active,
                  usage: s._count.quantities,
                }}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
