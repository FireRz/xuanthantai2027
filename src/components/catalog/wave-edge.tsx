/**
 * Viền lượn vàng (ADR-009 U4', U16'): phần kem nối vào nền trang. Mặc định kem nằm dưới đường lượn
 * (đáy banner); chân trang lật ngược bằng `-scale-y-100` để kem nằm trên.
 */
export function WaveEdge({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 1440 40" preserveAspectRatio="none" className={className}>
      <path
        d="M0 40V22C120 6 240 6 360 20s240 16 360 4 240-18 360-6 240 18 360 6V40Z"
        fill="#fbf6ec"
      />
      <path
        d="M0 22C120 6 240 6 360 20s240 16 360 4 240-18 360-6 240 18 360 6"
        fill="none"
        stroke="#f2a900"
        strokeWidth="3"
      />
    </svg>
  );
}
