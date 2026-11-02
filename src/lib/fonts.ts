import { Be_Vietnam_Pro, Playfair_Display } from "next/font/google";

// Hai font của UI-DESIGN §3, tự host qua next/font, có tiếng Việt.
export const playfair = Playfair_Display({
  subsets: ["vietnamese", "latin"],
  weight: ["600", "700"],
  variable: "--font-playfair",
  display: "swap",
});

export const beVietnam = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam",
  display: "swap",
});
