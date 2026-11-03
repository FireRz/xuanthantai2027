/**
 * Sao lưu CSDL lên Vercel Blob (T10.4, ADR-005).
 *   node scripts/backup-blob.mjs upload <file.dump>   tải lên backups/ rồi xóa bản cũ, giữ 7 bản mới nhất
 *   node scripts/backup-blob.mjs download <out-file>  tải bản mới nhất về <out-file>
 * Cần BLOB_READ_WRITE_TOKEN (workflow gán từ secret BACKUP_BLOB_TOKEN). Bản dump chứa cả băm mật khẩu quản trị nên lưu ở chế độ private.
 */
import { del, get, list, put } from "@vercel/blob";
import fs from "node:fs";

const PREFIX = "backups/";
const KEEP = 7;

async function listBackups() {
  const found = [];
  let cursor;
  do {
    const page = await list({ prefix: PREFIX, cursor });
    found.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  // Tên chứa mốc thời gian UTC nên sắp theo tên là sắp theo thời gian.
  return found.sort((a, b) => a.pathname.localeCompare(b.pathname));
}

async function upload(file) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
  const pathname = `${PREFIX}xtt-${stamp}.dump`;
  const body = fs.readFileSync(file);
  if (body.length < 1024) throw new Error(`File dump quá nhỏ (${body.length} B), không tải lên`);
  await put(pathname, body, { access: "private", addRandomSuffix: false });
  console.log(`Đã tải lên ${pathname} (${body.length} B)`);

  const all = await listBackups();
  const old = all.slice(0, Math.max(0, all.length - KEEP));
  if (old.length) await del(old.map((b) => b.url));
  console.log(`Còn ${all.length - old.length} bản; đã xóa ${old.length} bản cũ`);
}

async function download(out) {
  const all = await listBackups();
  if (!all.length) throw new Error("Chưa có bản sao lưu nào trên Blob");
  const latest = all[all.length - 1];
  const res = await get(latest.pathname, { access: "private" });
  if (!res || res.statusCode !== 200) throw new Error(`Không tải được ${latest.pathname}`);
  const buf = Buffer.from(await new Response(res.stream).arrayBuffer());
  fs.writeFileSync(out, buf);
  console.log(`Đã tải ${latest.pathname} (${buf.length} B) → ${out}`);
}

const [cmd, arg] = process.argv.slice(2);
if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("Thiếu BLOB_READ_WRITE_TOKEN");
if (cmd === "upload" && arg) await upload(arg);
else if (cmd === "download" && arg) await download(arg);
else throw new Error("Dùng: backup-blob.mjs upload|download <file>");
