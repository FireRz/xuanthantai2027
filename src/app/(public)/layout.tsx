import { beVietnam } from "@/lib/fonts";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${beVietnam.className} bg-cream text-ink min-h-dvh text-[14px] md:text-[15px]`}
    >
      {children}
    </div>
  );
}
