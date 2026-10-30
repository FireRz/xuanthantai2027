-- CreateTable
CREATE TABLE "brand" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_line" (
    "id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection" (
    "id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT,
    "brand_id" UUID NOT NULL,
    "product_line_id" UUID NOT NULL,
    "collection_id" UUID,
    "material_id" UUID,
    "price_vnd" INTEGER,
    "image_url" TEXT,
    "thumb_url" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_product_qty" (
    "product_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "qty_ordered" INTEGER NOT NULL DEFAULT 0,
    "qty_received" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_product_qty_pkey" PRIMARY KEY ("product_id","store_id")
);

-- CreateTable
CREATE TABLE "admin_user" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_user_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "brand_name_key" ON "brand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "product_line_brand_id_name_key" ON "product_line"("brand_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "product_line_id_brand_id_key" ON "product_line"("id", "brand_id");

-- CreateIndex
CREATE UNIQUE INDEX "collection_brand_id_name_key" ON "collection"("brand_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "collection_id_brand_id_key" ON "collection"("id", "brand_id");

-- CreateIndex
CREATE UNIQUE INDEX "material_name_key" ON "material"("name");

-- CreateIndex
CREATE UNIQUE INDEX "store_code_key" ON "store"("code");

-- CreateIndex
CREATE UNIQUE INDEX "product_sku_key" ON "product"("sku");

-- CreateIndex
CREATE INDEX "product_brand_id_idx" ON "product"("brand_id");

-- CreateIndex
CREATE INDEX "product_product_line_id_idx" ON "product"("product_line_id");

-- CreateIndex
CREATE INDEX "product_collection_id_idx" ON "product"("collection_id");

-- CreateIndex
CREATE INDEX "product_material_id_idx" ON "product"("material_id");

-- CreateIndex
CREATE INDEX "product_updated_at_idx" ON "product"("updated_at");

-- CreateIndex
CREATE INDEX "product_price_vnd_idx" ON "product"("price_vnd");

-- CreateIndex
CREATE INDEX "store_product_qty_store_id_product_id_idx" ON "store_product_qty"("store_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_user_username_key" ON "admin_user"("username");

-- AddForeignKey
ALTER TABLE "product_line" ADD CONSTRAINT "product_line_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection" ADD CONSTRAINT "collection_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_product_line_id_brand_id_fkey" FOREIGN KEY ("product_line_id", "brand_id") REFERENCES "product_line"("id", "brand_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_collection_id_brand_id_fkey" FOREIGN KEY ("collection_id", "brand_id") REFERENCES "collection"("id", "brand_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_product_qty" ADD CONSTRAINT "store_product_qty_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_product_qty" ADD CONSTRAINT "store_product_qty_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ===== Bổ sung thủ công (Prisma không mô tả được) =====

-- SL, giá ≥ 0 (ARCHITECTURE §4.1)
ALTER TABLE "store_product_qty"
  ADD CONSTRAINT "store_product_qty_qty_ordered_check" CHECK ("qty_ordered" >= 0),
  ADD CONSTRAINT "store_product_qty_qty_received_check" CHECK ("qty_received" >= 0);
ALTER TABLE "product"
  ADD CONSTRAINT "product_price_vnd_check" CHECK ("price_vnd" IS NULL OR "price_vnd" >= 0);

-- Mã SP so khớp không phân biệt hoa/thường (ADR-003 bổ sung) → unique theo UPPER(sku);
-- chỉ mục này cũng phục vụ tìm theo mã.
CREATE UNIQUE INDEX "product_sku_upper_key" ON "product" (UPPER("sku"));
