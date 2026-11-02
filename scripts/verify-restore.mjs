/**
 * So sánh số dòng từng bảng giữa CSDL nguồn và CSDL vừa khôi phục (T10.4).
 *   node scripts/verify-restore.mjs <url-nguồn> <url-khôi-phục>
 * Thoát mã 1 nếu có bảng lệch hoặc CSDL khôi phục không có dữ liệu. Chỉ đọc, không ghi.
 */
import pg from "pg";

const [srcUrl, dstUrl] = process.argv.slice(2);
if (!srcUrl || !dstUrl) throw new Error("Dùng: verify-restore.mjs <url-nguồn> <url-khôi-phục>");

async function counts(url) {
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  try {
    const { rows } = await c.query(
      "select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by 1",
    );
    const out = {};
    for (const { table_name } of rows) {
      const r = await c.query(`select count(*)::int as n from public."${table_name}"`);
      out[table_name] = r.rows[0].n;
    }
    return out;
  } finally {
    await c.end();
  }
}

const [src, dst] = await Promise.all([counts(srcUrl), counts(dstUrl)]);
let bad = 0;
for (const t of [...new Set([...Object.keys(src), ...Object.keys(dst)])].sort()) {
  const ok = src[t] === dst[t];
  if (!ok) bad++;
  console.log(
    `${ok ? "OK  " : "LỆCH"} ${t.padEnd(28)} nguồn=${src[t] ?? "-"} khôi phục=${dst[t] ?? "-"}`,
  );
}
if (!Object.values(dst).some((n) => n > 0)) (bad++, console.log("CSDL khôi phục không có dữ liệu"));
console.log(bad ? `THẤT BẠI: ${bad} vấn đề` : "ĐẠT: số dòng mọi bảng khớp");
process.exit(bad ? 1 : 0);
