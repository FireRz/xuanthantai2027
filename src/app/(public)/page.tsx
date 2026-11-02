import { SiteNav } from "@/components/catalog/site-nav";

// Khung tạm của T03.9 (token, font, header); nội dung trang làm ở các task sau của F03.
export default function HomePage() {
  return (
    <>
      <header className="bg-brand">
        <SiteNav />
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="font-display text-2xl font-bold">Xuân Thần Tài 2027</h1>
      </main>
    </>
  );
}
