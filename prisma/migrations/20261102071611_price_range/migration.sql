-- AlterTable
ALTER TABLE "product" ADD COLUMN     "price_range_id" UUID;

-- CreateTable
CREATE TABLE "price_range" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_range_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "price_range_name_key" ON "price_range"("name");

-- CreateIndex
CREATE INDEX "product_price_range_id_idx" ON "product"("price_range_id");

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_price_range_id_fkey" FOREIGN KEY ("price_range_id") REFERENCES "price_range"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
