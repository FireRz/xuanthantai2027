"use client";

import { useEffect, useRef } from "react";

const SRC = "/brand/tet-banner-2400.png";
const IMG_W = 2400;
const IMG_H = 900;

/**
 * Các cụm mây trôi (tọa độ trên ảnh gốc 2400x900): vị trí, biên độ `dx` (vw), chu kỳ `t` (s),
 * lệch nhịp `tre` (s). Mây dính núi/dê không có trong danh sách nên đứng yên.
 * `neo`: số px bên phải dính núi, giữ nguyên; `co`: tỉ lệ giãn ngang (mây neo mép phải).
 */
const CLOUDS = [
  { x: 1548, y: 0, w: 852, h: 340, dx: 3, t: 7 },
  { x: 0, y: 290, w: 168, h: 145, dx: -2.4, t: 6.5, tre: -2 },
  { x: 1880, y: 505, w: 400, h: 190, neo: 70, co: 1.07, t: 6, tre: -1 },
] as const;

type Cloud = (typeof CLOUDS)[number];
type Rgb = [number, number, number];

/**
 * Lớp hiệu ứng cho banner Tết: mây trôi (tách mây khỏi ảnh bằng canvas, đặt thành lớp riêng trên
 * nền đã xóa mây) và hạt bay (bụi vàng, cánh mai). Ảnh `next/image` bên dưới vẫn là ảnh gốc —
 * hiện sẵn khi chưa xử lý xong, và là kết quả cuối khi người dùng chọn giảm chuyển động.
 * Khung `cover` mô phỏng `object-cover` để tọa độ mây khớp với phần ảnh đang hiển thị.
 */
export function BannerFx() {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    let stopParticles: (() => void) | undefined;
    let added: HTMLElement[] = [];

    const start = () => {
      const img = new Image();
      img.onload = () => {
        if (cancelled || img.naturalWidth !== IMG_W || img.naturalHeight !== IMG_H) return;
        added = buildClouds(box, img);
        stopParticles = startParticles(box);
      };
      img.src = SRC;
    };

    // Chờ trang rảnh rồi mới xử lý ảnh để không chen vào lúc tải trang.
    const hasIdle = "requestIdleCallback" in window;
    const idle = hasIdle
      ? window.requestIdleCallback(start, { timeout: 2000 })
      : window.setTimeout(start, 600);

    return () => {
      cancelled = true;
      if (hasIdle) window.cancelIdleCallback(idle);
      else clearTimeout(idle);
      stopParticles?.();
      added.forEach((el) => el.remove());
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        ref={boxRef}
        className="absolute top-1/2 left-1/2 aspect-[2400/900] min-h-full min-w-full -translate-x-1/2 -translate-y-1/2"
      />
    </div>
  );
}

/** Tách từng cụm mây ra canvas riêng, xóa mây khỏi canvas nền; trả về các phần tử đã thêm. */
function buildClouds(box: HTMLElement, img: HTMLImageElement): HTMLElement[] {
  const W = IMG_W;
  const H = IMG_H;
  const bg = document.createElement("canvas");
  bg.width = W;
  bg.height = H;
  bg.className = "fx-layer fx-fill";
  const cx = bg.getContext("2d", { willReadFrequently: true });
  if (!cx) return [];
  cx.drawImage(img, 0, 0);
  const photo = cx.getImageData(0, 0, W, H);
  const d = photo.data;

  // Điểm "mây" là màu kem/vàng (kênh xanh lá cao); nền đỏ có kênh xanh lá thấp.
  const cloudAlpha = (i: number) => Math.max(0, Math.min(1, (d[i + 1]! - 48) / 62));

  const layers = CLOUDS.map((m) => cutCloud(m, d, W, H, cloudAlpha));
  cx.putImageData(photo, 0, 0);

  // Nền đã xóa mây và các lớp mây cùng hiện một lúc, thay cho ảnh gốc bên dưới.
  box.append(bg, ...layers);
  return [bg, ...layers];
}

function cutCloud(
  m: Cloud,
  d: Uint8ClampedArray,
  W: number,
  H: number,
  cloudAlpha: (i: number) => number,
): HTMLCanvasElement {
  const neo = "neo" in m ? m.neo : 0;
  const co = "co" in m ? m.co : 0;
  const tre = "tre" in m ? m.tre : 0;
  const c = document.createElement("canvas");
  c.width = m.w;
  c.height = m.h;
  c.className = "fx-layer fx-cloud";
  const g = c.getContext("2d");
  if (!g) return c;
  const layer = g.createImageData(m.w, m.h);
  const L = layer.data;
  const mask = new Float32Array(m.w * m.h);

  // B2: lớp mây lấy màu gốc với alpha theo kênh xanh lá.
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      const i = ((m.y + y) * W + m.x + x) * 4;
      const a = cloudAlpha(i);
      const j = (y * m.w + x) * 4;
      mask[y * m.w + x] = a;
      L[j] = d[i]!;
      L[j + 1] = d[i + 1]!;
      L[j + 2] = d[i + 2]!;
      L[j + 3] = Math.round(a * 255);
    }
  }

  // B3: xóa mây trên nền, thay bằng trung bình màu nền đỏ gần nhất bên trái/phải trong cùng hàng.
  for (let y = 0; y < m.h; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < m.w; x++) {
      let mx = 0;
      for (let k = -6; k <= 6; k++) {
        const xx = x + k;
        if (xx >= 0 && xx < m.w) mx = Math.max(mx, mask[y * m.w + xx]!);
      }
      row.push(mx > 0.05);
    }
    let left: Rgb | null = null;
    const lefts: (Rgb | null)[] = [];
    for (let x = 0; x < m.w; x++) {
      const i = ((m.y + y) * W + m.x + x) * 4;
      if (!row[x]) left = [d[i]!, d[i + 1]!, d[i + 2]!];
      lefts.push(left);
    }
    let right: Rgb | null = null;
    for (let x = m.w - 1; x >= 0; x--) {
      const i = ((m.y + y) * W + m.x + x) * 4;
      if (neo && x >= m.w - neo) continue; // phần dính núi: giữ nền gốc
      if (!row[x]) {
        right = [d[i]!, d[i + 1]!, d[i + 2]!];
        continue;
      }
      const a = lefts[x]!;
      const fill: Rgb =
        a && right
          ? [(a[0] + right[0]) / 2, (a[1] + right[1]) / 2, (a[2] + right[2]) / 2]
          : (a ?? right ?? [196, 16, 12]);
      const k = mask[y * m.w + x]! > 0 ? 1 : 0.6; // vùng nới thêm: trộn nhẹ
      d[i] = d[i]! * (1 - k) + fill[0] * k;
      d[i + 1] = d[i + 1]! * (1 - k) + fill[1] * k;
      d[i + 2] = d[i + 2]! * (1 - k) + fill[2] * k;
    }
  }

  // B4: viền mây trong ảnh gốc đã pha sẵn nền đỏ → tách phần đỏ ra để không bị pha đỏ hai lần.
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      if (neo && x >= m.w - neo) continue;
      const j = (y * m.w + x) * 4;
      const a = L[j + 3]! / 255;
      if (a <= 0.04 || a >= 0.999) continue;
      const i = ((m.y + y) * W + m.x + x) * 4;
      for (let n = 0; n < 3; n++) {
        L[j + n] = Math.max(0, Math.min(255, (L[j + n]! - (1 - a) * d[i + n]!) / a));
      }
    }
  }

  // B5: mép trong của khung mờ dần 14px để không thấy đường cắt (mép chạm banner thì không mờ).
  const edge = 14;
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      if (neo && x >= m.w - neo) continue;
      const bonus =
        (m.y === 0 && y < edge ? edge : 0) +
        (m.x === 0 && x < edge ? edge : 0) +
        (m.x + m.w >= W && m.w - 1 - x < edge ? edge : 0);
      const k = Math.min(1, (Math.min(x, y, m.w - 1 - x, m.h - 1 - y) + bonus) / edge);
      L[(y * m.w + x) * 4 + 3]! *= k;
    }
  }
  g.putImageData(layer, 0, 0);

  // B6: đặt theo % để co giãn cùng banner.
  Object.assign(c.style, {
    left: `${(m.x / W) * 100}%`,
    top: `${(m.y / H) * 100}%`,
    width: `${(m.w / W) * 100}%`,
    height: `${(m.h / H) * 100}%`,
  });
  c.style.setProperty("--fx-dx", `${"dx" in m ? m.dx : 0}vw`);
  c.style.setProperty("--fx-t", `${m.t}s`);
  c.style.setProperty("--fx-delay", `${tre}s`);
  if (co) {
    c.classList.add("fx-stretch");
    c.style.setProperty("--fx-co", String(co));
  }
  return c;
}

interface Dust {
  x: number;
  y: number;
  v: number;
  r: number;
  p: number;
  lac: number;
}
interface Fine {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  p: number;
  vp: number;
}
interface Petal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  vg: number;
  s: number;
  p: number;
}

/** Canvas hạt phủ toàn banner: bụi vàng mịn, bụi vàng lấp lánh, cánh mai rơi. Trả về hàm dọn dẹp. */
function startParticles(box: HTMLElement): () => void {
  const cv = document.createElement("canvas");
  cv.className = "fx-layer fx-fill";
  box.append(cv);
  const g = cv.getContext("2d");
  if (!g) {
    cv.remove();
    return () => {};
  }
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = 0;
  let h = 0;
  const resize = () => {
    w = cv.width = Math.round(cv.clientWidth * dpr);
    h = cv.height = Math.round(cv.clientHeight * dpr);
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(cv);

  const R = Math.random;
  const newDust = (): Dust => ({
    x: -0.02 - R() * 0.1,
    y: R(),
    v: 0.0005 + R() * 0.001,
    r: 0.6 + R() * 1.8,
    p: R() * 6.28,
    lac: R() * 0.0008,
  });
  const newFine = (): Fine => ({
    x: R() * 1.1 - 0.05,
    y: 1 - Math.pow(R(), 1.8) * 0.75,
    vx: 0.00012 + R() * 0.0003,
    vy: -(0.00008 + R() * 0.00025),
    r: 0.4 + R() * 1.1,
    p: R() * 6.28,
    vp: 0.04 + R() * 0.08,
  });
  const newPetal = (): Petal => ({
    x: R() * 0.2,
    y: -0.02 + R() * 0.18,
    vx: 0.0004 + R() * 0.0008,
    vy: 0.0007 + R() * 0.0009,
    g: R() * 6.28,
    vg: (R() - 0.5) * 0.06,
    s: 0.6 + R() * 0.6,
    p: R() * 6.28,
  });

  const dust = Array.from({ length: 70 }, () => ({ ...newDust(), x: R() }));
  const fine = Array.from({ length: 750 }, newFine);
  const petals = Array.from({ length: 7 }, () => ({ ...newPetal(), y: R() * 0.9, x: R() * 0.5 }));

  const draw = () => {
    g.clearRect(0, 0, w, h);

    fine.forEach((m, i) => {
      m.x += m.vx;
      m.y += m.vy;
      m.p += m.vp;
      if (m.x > 1.05 || m.y < 0.2) fine[i] = newFine();
      const a = (0.45 + 0.55 * Math.abs(Math.sin(m.p))) * Math.min(1, (m.y - 0.2) * 4);
      const s = m.r * dpr * 1.7;
      g.fillStyle = `rgba(255,${205 + ((i * 7) % 45)},${120 + ((i * 13) % 80)},${a})`;
      g.fillRect(m.x * w, m.y * h, s, s);
      if (i % 9 === 0) {
        g.fillStyle = `rgba(255,220,140,${a * 0.25})`;
        g.beginPath();
        g.arc(m.x * w + s / 2, m.y * h + s / 2, s * 2.4, 0, 6.28);
        g.fill();
      }
    });

    dust.forEach((b, i) => {
      b.x += b.v;
      b.p += 0.05;
      b.y += Math.sin(b.p * 0.3) * b.lac;
      if (b.x > 1.02) dust[i] = newDust();
      g.fillStyle = `rgba(255,214,120,${0.35 + 0.65 * Math.abs(Math.sin(b.p))})`;
      g.shadowColor = "rgba(255,200,90,.9)";
      g.shadowBlur = 6 * dpr;
      g.beginPath();
      g.arc(b.x * w, b.y * h, b.r * dpr, 0, 6.28);
      g.fill();
    });
    g.shadowBlur = 0;

    petals.forEach((c, i) => {
      c.x += c.vx;
      c.y += c.vy;
      c.g += c.vg;
      c.p += 0.03;
      c.x += Math.sin(c.p) * 0.0006;
      if (c.y > 1.05 || c.x > 0.6) petals[i] = newPetal();
      const s = (c.s * w) / 120;
      const fade = Math.min(1, (1.05 - c.y) * 3);
      g.save();
      g.translate(c.x * w, c.y * h);
      g.rotate(c.g);
      g.scale(1, 0.55 + 0.45 * Math.sin(c.p * 2));
      g.globalAlpha = 0.85 * fade;
      g.fillStyle = "#fde3e3";
      g.beginPath();
      g.ellipse(0, 0, s * 0.5, s * 0.32, 0, 0, 6.28);
      g.fill();
      g.fillStyle = "#f3b6b6";
      g.beginPath();
      g.ellipse(-s * 0.18, 0, s * 0.12, s * 0.08, 0, 0, 6.28);
      g.fill();
      g.restore();
    });
  };

  // Chỉ vẽ khi banner đang nằm trong màn hình (tiết kiệm máy khi đã cuộn xuống dưới).
  let raf = 0;
  let visible = true;
  const loop = () => {
    draw();
    raf = visible ? requestAnimationFrame(loop) : 0;
  };
  const io = new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting);
    if (visible && !raf) raf = requestAnimationFrame(loop);
  });
  io.observe(box);
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    raf = 0;
    visible = false;
    io.disconnect();
    ro.disconnect();
    cv.remove();
  };
}
