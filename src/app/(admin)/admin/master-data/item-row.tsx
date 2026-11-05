"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { regionLabel } from "@/lib/region";
import type { HideImpact, MasterKind } from "@/server/services/master-data";
import {
  deleteItemAction,
  getHideImpactAction,
  setActiveAction,
  updateItemAction,
} from "./actions";

export interface RowItem {
  id: string;
  name: string;
  /** Chỉ cửa hàng có mã. */
  code?: string;
  /** Chỉ cửa hàng: khu vực (ASM), null = chưa gán. */
  region?: string | null;
  active: boolean;
  /** Số SP (hoặc số dòng SL với cửa hàng) đang tham chiếu — hiển thị cho dễ hình dung. */
  usage: number;
}

const KIND_LABEL: Record<MasterKind, string> = {
  brand: "nhãn hàng",
  line: "dòng hàng",
  collection: "bộ sưu tập",
  material: "tuổi vàng",
  productType: "chủng loại",
  priceRange: "khung giá",
  store: "cửa hàng",
};

/** id của <datalist> gợi ý các khu vực đã nhập (đặt một lần ở tab Cửa hàng). */
export const STORE_REGIONS_LIST = "store-regions";

type Dialog = { type: "hide"; impact: HideImpact } | { type: "delete" } | null;

const inputClass =
  "h-9 rounded-md border border-neutral-300 bg-white px-2 text-sm outline-none focus-visible:border-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-900/20";

export function ItemRow({ kind, item }: { kind: MasterKind; item: RowItem }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [code, setCode] = useState(item.code ?? "");
  const [region, setRegion] = useState(item.region ?? "");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const fail = (error: string) => setNotice({ kind: "error", text: error });
  const succeed = (text?: string) => setNotice(text ? { kind: "success", text } : null);

  function save() {
    startTransition(async () => {
      const r = await updateItemAction(kind, item.id, {
        name,
        code: kind === "store" ? code : undefined,
        region: kind === "store" ? region : undefined,
      });
      if (r.ok) {
        setEditing(false);
        succeed(r.message);
      } else fail(r.error);
    });
  }

  function askHide() {
    setNotice(null);
    startTransition(async () => {
      const r = await getHideImpactAction(kind, item.id);
      if (r.ok) setDialog({ type: "hide", impact: r.data });
      else fail(r.error);
    });
  }

  function show() {
    setNotice(null);
    startTransition(async () => {
      const r = await setActiveAction(kind, item.id, true);
      if (r.ok) succeed(r.message);
      else fail(r.error);
    });
  }

  function confirm() {
    const current = dialog;
    if (!current) return;
    startTransition(async () => {
      const r =
        current.type === "hide"
          ? await setActiveAction(kind, item.id, false)
          : await deleteItemAction(kind, item.id);
      setDialog(null);
      if (r.ok) succeed(r.message);
      else fail(r.error);
    });
  }

  return (
    <li className="py-2" data-testid={`row-${kind}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {editing ? (
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            {kind === "store" && (
              <input
                aria-label="Mã cửa hàng"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={`${inputClass} w-24`}
                required
              />
            )}
            <input
              aria-label={`Tên ${KIND_LABEL[kind]}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`${inputClass} w-56`}
              required
              autoFocus
            />
            {kind === "store" && (
              <input
                aria-label="Khu vực"
                placeholder="Khu vực"
                list={STORE_REGIONS_LIST}
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className={`${inputClass} w-28`}
              />
            )}
            <Button type="submit" size="sm" disabled={pending}>
              Lưu
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setEditing(false);
                setName(item.name);
                setCode(item.code ?? "");
                setRegion(item.region ?? "");
                setNotice(null);
              }}
            >
              Hủy
            </Button>
          </form>
        ) : (
          <>
            <span className={`text-sm ${item.active ? "" : "text-neutral-400 line-through"}`}>
              {item.code && <strong className="mr-2 font-semibold">{item.code}</strong>}
              {item.name}
            </span>
            {kind === "store" && (
              <span
                data-testid="store-region"
                className={
                  item.region
                    ? "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900"
                    : "text-xs text-neutral-400"
                }
              >
                {item.region ? regionLabel(item.region) : "Chưa có khu vực"}
              </span>
            )}
            {!item.active && (
              <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs text-neutral-700">
                Đã ẩn
              </span>
            )}
            <span className="text-xs text-neutral-500 tabular-nums">
              {item.usage} {kind === "store" ? "dòng SL" : "SP"}
            </span>
            <span className="ml-auto flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)} disabled={pending}>
                Sửa
              </Button>
              {item.active ? (
                <Button size="sm" variant="ghost" onClick={askHide} disabled={pending}>
                  Ẩn
                </Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={show} disabled={pending}>
                  Hiện
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="text-red-700 hover:text-red-800"
                onClick={() => {
                  setNotice(null);
                  setDialog({ type: "delete" });
                }}
                disabled={pending}
              >
                Xóa
              </Button>
            </span>
          </>
        )}
      </div>
      {notice && (
        <p
          role={notice.kind === "error" ? "alert" : "status"}
          className={`mt-1 text-xs ${notice.kind === "error" ? "text-red-700" : "text-green-700"}`}
        >
          {notice.text}
        </p>
      )}
      {dialog && (
        <ConfirmDialog
          open
          title={
            dialog?.type === "delete"
              ? `Xóa ${KIND_LABEL[kind]} "${item.name}"?`
              : `Ẩn ${KIND_LABEL[kind]} "${item.name}"?`
          }
          confirmLabel={dialog?.type === "delete" ? "Xóa" : "Ẩn"}
          danger={dialog?.type === "delete"}
          pending={pending}
          onConfirm={confirm}
          onCancel={() => setDialog(null)}
        >
          {dialog?.type === "hide" && <HideMessage kind={kind} affected={dialog.impact.affected} />}
          {dialog?.type === "delete" && (
            <p>
              Chỉ xóa được khi chưa có sản phẩm hay số lượng nào tham chiếu. Nếu đang được dùng, hãy
              ẩn thay vì xóa.
            </p>
          )}
        </ConfirmDialog>
      )}
    </li>
  );
}

function HideMessage({ kind, affected }: { kind: MasterKind; affected: number }) {
  if (kind === "store") {
    return (
      <p>
        Cửa hàng sẽ biến khỏi bộ lọc và bảng chi tiết, số lượng của cửa hàng này{" "}
        <strong>không còn cộng vào tổng</strong>.{" "}
        <strong data-testid="impact-count">{affected}</strong> sản phẩm có số lượng ở cửa hàng này
        sẽ đổi số tổng. Hiện lại cửa hàng để cộng lại.
      </p>
    );
  }
  return (
    <p>
      <strong data-testid="impact-count">{affected}</strong> sản phẩm thuộc mục này sẽ bị ẩn khỏi
      trang xem. Hiện lại mục này thì các sản phẩm hiện lại (trừ sản phẩm đã bị ẩn riêng).
    </p>
  );
}
