import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "./config";
import { verifyAdminLogin } from "./login";

/** Mã lỗi gửi về form đăng nhập khi tài khoản đang bị khóa tạm. */
class AccountLockedError extends CredentialsSignin {
  code = "locked";
}

const credentialsSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { username: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const result = await verifyAdminLogin(parsed.data.username, parsed.data.password);
        if (result.ok) {
          return {
            id: result.user.id,
            name: result.user.username,
            fingerprint: result.user.fingerprint,
          };
        }
        if (result.reason === "locked") throw new AccountLockedError();
        return null;
      },
    }),
  ],
});
