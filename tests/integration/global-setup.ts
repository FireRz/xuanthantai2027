import "dotenv/config";
import { execSync } from "node:child_process";
import { Client } from "pg";

// Đưa DB test về trạng thái trống + migration mới nhất trước mỗi lần chạy.
// Chỉ chấp nhận DB tên *_test trên máy cục bộ để không bao giờ xóa nhầm DB thật.
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("Thiếu TEST_DATABASE_URL (xem .env.example)");
  const parsed = new URL(url);
  const dbName = parsed.pathname.slice(1);
  if (!["localhost", "127.0.0.1"].includes(parsed.hostname) || !dbName.endsWith("_test")) {
    throw new Error(
      `TEST_DATABASE_URL phải là DB *_test trên localhost (đang là ${parsed.host}/${dbName})`,
    );
  }

  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
  await client.end();

  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url, DATABASE_URL_UNPOOLED: url },
  });
}
