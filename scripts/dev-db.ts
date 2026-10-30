/**
 * Postgres cục bộ không cần Docker — dùng binary của gói @embedded-postgres.
 *   npm run db:local          chạy Postgres (giữ cửa sổ mở trong lúc dev)
 *   npm run db:local -- --check   khởi động, tạo DB rồi tắt (kiểm tra)
 * Có Docker thì dùng `docker compose up -d` thay thế — cùng cổng, cùng tài khoản.
 *
 * Binary Postgres trên Windows không chạy được từ đường dẫn có ký tự tiếng Việt
 * (thư mục repo), nên binary và dữ liệu được chép/đặt dưới ~/.xuan-than-tai.
 */
import { spawn, spawnSync } from "node:child_process";
import { Client } from "pg";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const port = Number(process.env.LOCAL_PG_PORT ?? 5432);
const home = path.join(os.homedir(), ".xuan-than-tai");
const dataDir = process.env.LOCAL_PG_DATA ?? path.join(home, `pgdata-${port}`);
const exe = process.platform === "win32" ? ".exe" : "";

function platformPackage() {
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  const os_ = process.platform === "win32" ? "windows" : process.platform;
  return `@embedded-postgres/${os_}-${arch}`;
}

function prepareBinaries(): string {
  const pkgDir = path.join(process.cwd(), "node_modules", platformPackage());
  const version = JSON.parse(fs.readFileSync(path.join(pkgDir, "package.json"), "utf8")).version;
  const target = path.join(home, `pg-${version}`);
  if (!fs.existsSync(path.join(target, "bin", `postgres${exe}`))) {
    fs.mkdirSync(home, { recursive: true });
    fs.cpSync(path.join(pkgDir, "native"), target, { recursive: true });
    if (process.platform !== "win32") {
      for (const f of fs.readdirSync(path.join(target, "bin")))
        fs.chmodSync(path.join(target, "bin", f), 0o755);
    }
  }
  return path.join(target, "bin");
}

function run(bin: string, cmd: string, args: string[], env?: NodeJS.ProcessEnv) {
  const r = spawnSync(path.join(bin, cmd + exe), args, {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  if (r.status !== 0) throw new Error(`${cmd} lỗi (mã ${r.status})`);
}

async function connect(): Promise<Client> {
  for (let i = 0; i < 60; i++) {
    const client = new Client({
      host: "localhost",
      port,
      user: "postgres",
      password: "postgres",
      database: "postgres",
    });
    try {
      await client.connect();
      return client;
    } catch {
      await new Promise((res) => setTimeout(res, 500));
    }
  }
  throw new Error("Postgres không khởi động được");
}

async function main() {
  const bin = prepareBinaries();
  if (!fs.existsSync(path.join(dataDir, "PG_VERSION"))) {
    const pwFile = path.join(home, "pwfile");
    fs.writeFileSync(pwFile, "postgres\n");
    run(bin, "initdb", [
      "-D",
      dataDir,
      "-U",
      "postgres",
      "--pwfile",
      pwFile,
      "--auth=scram-sha-256",
      "--encoding=UTF8",
      "--locale=C",
    ]);
    fs.rmSync(pwFile);
  }
  const server = spawn(path.join(bin, "postgres" + exe), ["-D", dataDir, "-p", String(port)], {
    stdio: ["ignore", "inherit", "inherit"],
  });
  const client = await connect();
  for (const db of ["xtt", "xtt_test"]) {
    const r = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [db]);
    if (r.rowCount === 0) await client.query(`CREATE DATABASE ${db}`);
  }
  await client.end();
  console.log(
    `Postgres sẵn sàng: postgresql://postgres:postgres@localhost:${port}/xtt (dữ liệu: ${dataDir})`,
  );

  const stop = () => {
    spawnSync(path.join(bin, "pg_ctl" + exe), ["stop", "-D", dataDir, "-m", "fast"], {
      stdio: "ignore",
    });
    server.kill();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  if (process.argv.includes("--check")) stop();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
