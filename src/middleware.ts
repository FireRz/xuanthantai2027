import NextAuth from "next-auth";
import { authConfig } from "@/server/auth/config";

// Lớp chặn thô ở Edge: chưa đăng nhập vào /admin/* → /login. Kiểm tra thật nằm ở requireAdmin().
export const { auth: middleware } = NextAuth(authConfig);
export default middleware;

export const config = { matcher: ["/admin/:path*"] };
