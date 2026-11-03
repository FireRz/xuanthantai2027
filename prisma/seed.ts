/**
 *   npm run seed          dữ liệu mẫu: 3 nhãn × (3 dòng + 2 BST), 5 tuổi vàng, 10 CH, 200 SP
 *   npm run seed:large    quy mô lớn: 3.000 SP × 100 CH (đo hiệu năng — T04.11, T08.10, T11.6)
 */
import { PrismaClient } from "@prisma/client";
import { LARGE, SAMPLE, seed } from "./seed-data";

const prisma = new PrismaClient();
const large = process.argv.includes("--large");

const started = Date.now();
seed(prisma, { ...(large ? LARGE : SAMPLE), log: (m) => console.log(m) })
  .then(() =>
    console.log(`Seed ${large ? "quy mô lớn" : "mẫu"} xong sau ${Date.now() - started} ms`),
  )
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
