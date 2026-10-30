import "dotenv/config";

// Test integration chạy trên DB riêng (TEST_DATABASE_URL), không đụng DB dev.
const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("Thiếu TEST_DATABASE_URL (xem .env.example)");
process.env.DATABASE_URL = url;
process.env.DATABASE_URL_UNPOOLED = url;
