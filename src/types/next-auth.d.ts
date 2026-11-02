import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    fingerprint?: string;
  }
  interface Session {
    /** Dấu vân tay mật khẩu lúc đăng nhập — requireAdmin so với CSDL. */
    fingerprint?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    pv?: string;
  }
}
