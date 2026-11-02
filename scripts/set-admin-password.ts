/**
 * Tạo tài khoản quản trị hoặc đặt lại mật khẩu (kể cả khi quên mật khẩu).
 *   npm run admin:set-password                      # hỏi mật khẩu (ẩn ký tự), tên mặc định "admin"
 *   npm run admin:set-password -- --username=ten    # chọn tên đăng nhập
 * Chạy với biến môi trường của CSDL cần ghi (DATABASE_URL). Không bao giờ nhận mật khẩu qua
 * tham số dòng lệnh; chạy tự động thì đặt biến ADMIN_PASSWORD (không để vào lịch sử lệnh).
 */
import "dotenv/config";
import { DomainError } from "../src/server/errors";
import { prisma } from "../src/server/db";
import { setAdminPassword } from "../src/server/auth/admin-account";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((a) => a.startsWith(prefix))?.slice(prefix.length);
}

/** Đọc một dòng từ bàn phím mà không hiện ký tự. */
function promptHidden(label: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    if (!stdin.isTTY) return reject(new Error("Không có bàn phím: đặt biến ADMIN_PASSWORD"));
    process.stdout.write(label);
    let buf = "";
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          process.stdout.write("\n");
          return resolve(buf);
        }
        if (ch === "\u0003") {
          stdin.setRawMode(false);
          return reject(new Error("Đã hủy"));
        }
        if (ch === "\u007f" || ch === "\b") buf = buf.slice(0, -1);
        else buf += ch;
      }
    };
    stdin.on("data", onData);
  });
}

async function main() {
  const username = (arg("username") ?? process.env.ADMIN_USERNAME ?? "admin").trim();
  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    password = await promptHidden("Mật khẩu mới: ");
    const again = await promptHidden("Nhập lại mật khẩu: ");
    if (password !== again) throw new Error("Hai lần nhập không khớp");
  }
  const { created } = await setAdminPassword(username, password);
  console.log(
    created
      ? `Đã tạo tài khoản quản trị "${username}".`
      : `Đã đặt lại mật khẩu cho "${username}" (và gỡ khóa tạm nếu có).`,
  );
}

main()
  .catch((e) => {
    console.error(e instanceof DomainError || e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
