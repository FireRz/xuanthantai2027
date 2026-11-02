import type { NextAuthConfig } from "next-auth";

/**
 * Phần cấu hình Auth.js an toàn cho Edge (middleware) — không import Prisma/Node crypto.
 * Providers và truy cập CSDL nằm ở ./index.ts.
 */
export const authConfig = {
  trustHost: true,
  pages: { signIn: "/login" },
  // Phiên 8 giờ *(mặc định kỹ thuật)*.
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  providers: [],
  callbacks: {
    // Middleware: /admin/* cần phiên đăng nhập; còn lại công khai (ADR-004 A1, A3).
    authorized({ auth, request }) {
      if (request.nextUrl.pathname.startsWith("/admin")) return !!auth?.user;
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.pv = user.fingerprint;
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.uid === "string") session.user.id = token.uid;
      if (typeof token.pv === "string") session.fingerprint = token.pv;
      return session;
    },
  },
} satisfies NextAuthConfig;
