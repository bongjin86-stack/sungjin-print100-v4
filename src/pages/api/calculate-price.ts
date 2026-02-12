import type { APIRoute } from "astro";

import { loadPricingData } from "@/lib/dbService";
import { calculatePrice } from "@/lib/priceEngine";
import { supabase } from "@/lib/supabase";

export const prerender = false;

// ============================================================
// 외주(outsourced) 상품 가격 계산 — 서버 전용
// outsourced_config는 DB에서 가져오며 클라이언트에 노출되지 않음
// ============================================================
interface OutsourcedInput {
  productId: string;
  books?: Array<{ pages: number; qty: number }>;
  pages?: number;
  qty: number;
  allQtys?: number[];
  guidePriceTotal?: number;
  designFee?: number;
}

function calculateOutsourcedPrice(
  oCfg: { pagePrice: number; bindingFee: number; qtyDiscounts: Array<{ minQty: number; percent: number }> },
  booksCfg: { pagePrice?: number; bindingFee?: number; freeDesignMinQty?: number } | null,
  input: OutsourcedInput
) {
  const oPagePrice = oCfg.pagePrice ?? 40;
  const oBindingFee = oCfg.bindingFee ?? 1500;
  const qtyDiscounts = oCfg.qtyDiscounts || [];
  const guidePrice = input.guidePriceTotal || 0;

  const findDiscount = (qty: number) => {
    const discount = [...qtyDiscounts]
      .sort((a, b) => b.minQty - a.minQty)
      .find((d) => qty >= d.minQty);
    return discount?.percent || 0;
  };

  // 무게 추정 (A4 기준 80g 내지 + 200g 표지)
  const areaM2 = 0.21 * 0.297;
  const innerGsm = 80;
  const coverGsm = 200;

  const books = input.books || [];

  if (books.length > 0) {
    const bPagePrice = booksCfg?.pagePrice ?? oPagePrice;
    const bBindingFee = booksCfg?.bindingFee ?? oBindingFee;
    const freeDesignMinQty = booksCfg?.freeDesignMinQty ?? 100;
    const coverDesignFee = input.designFee ?? 0;

    const totalQty = books.reduce((s, b) => s + (b.qty || 1), 0);
    const discountPct = findDiscount(totalQty);

    let grandTotal = 0;
    let totalWeightG = 0;
    for (const book of books) {
      const pg = book.pages || 100;
      const qty = book.qty || 1;
      const perCopy = pg * bPagePrice + bBindingFee + guidePrice;
      grandTotal += Math.round(perCopy * qty * (1 - discountPct / 100));
      const innerW = areaM2 * innerGsm * (pg / 2);
      const coverW = areaM2 * coverGsm * 1;
      totalWeightG += (innerW + coverW) * qty;
    }
    if (coverDesignFee > 0 && totalQty < freeDesignMinQty) {
      grandTotal += coverDesignFee;
    }
    const unitPrice = totalQty > 0 ? Math.round(grandTotal / totalQty) : 0;
    const estimatedWeight = totalWeightG / 1000;
    return {
      selected: { total: grandTotal, unitPrice, perUnit: unitPrice, estimatedWeight },
      byQty: { [totalQty]: { total: grandTotal, unitPrice, perUnit: unitPrice, estimatedWeight } },
    };
  }

  // 단권 모드
  const oPages = input.pages || 100;
  const perCopy = oPages * oPagePrice + oBindingFee;
  const allQtys = input.allQtys || [input.qty];

  const byQty: Record<number, unknown> = {};
  for (const q of allQtys) {
    const discountPct = findDiscount(q);
    const basePerCopy = perCopy + guidePrice;
    const total = Math.round(basePerCopy * q * (1 - discountPct / 100));
    const unitPrice = Math.round(total / q);
    const innerW = areaM2 * innerGsm * (oPages / 2);
    const coverW = areaM2 * coverGsm * 1;
    const estimatedWeight = ((innerW + coverW) * q) / 1000;
    byQty[q] = { total, unitPrice, perUnit: unitPrice, estimatedWeight };
  }
  const selected = (byQty[input.qty] || {}) as Record<string, unknown>;
  return { selected, byQty };
}

/**
 * Server-side price calculation endpoint
 * POST /api/calculate-price
 *
 * Body: { customer, qty, productType, ... }
 * For outsourced: { productId, books?, pages?, qty, allQtys?, guidePriceTotal?, designFee? }
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { customer, qty, productType, allQtys, guidePriceTotal } = body;

    // --- Outsourced 상품: DB에서 outsourced_config 조회하여 서버 계산 ---
    if (productType === "outsourced" && body.productId) {
      const { data: product } = await supabase
        .from("products")
        .select("outsourced_config, content, blocks")
        .eq("id", body.productId)
        .single();

      if (!product) {
        return new Response(
          JSON.stringify({ error: "Product not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      const oCfg = product.outsourced_config || product.content?.outsourced_config;
      if (!oCfg) {
        return new Response(
          JSON.stringify({ error: "Missing outsourced config" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // books 블록 config 조회
      const booksBlock = (product.blocks || []).find(
        (b: { on: boolean; type: string }) => b.on && b.type === "books"
      );
      const booksCfg = booksBlock?.config || null;

      const result = calculateOutsourcedPrice(oCfg, booksCfg, {
        productId: body.productId,
        books: body.books,
        pages: body.pages,
        qty: qty || 1,
        allQtys,
        guidePriceTotal: Number(guidePriceTotal) || 0,
        designFee: body.designFee,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // --- 일반 상품: 기존 priceEngine 로직 ---
    if (!customer || !qty || qty <= 0) {
      return new Response(
        JSON.stringify({ error: "customer and qty are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    await loadPricingData();

    const selected = calculatePrice(customer, qty, productType || "flyer");
    const guidePrice = Number(guidePriceTotal) || 0;
    if (guidePrice > 0) {
      selected.guidePriceTotal = guidePrice;
      selected.total = (selected.total || 0) + guidePrice;
    }

    let byQty: Record<number, unknown> | undefined;
    if (Array.isArray(allQtys) && allQtys.length > 0) {
      byQty = {};
      for (const q of allQtys) {
        try {
          const result = calculatePrice(customer, q, productType || "flyer") as Record<string, unknown>;
          if (guidePrice > 0) {
            result.guidePriceTotal = guidePrice;
            result.total = ((result.total as number) || 0) + guidePrice;
          }
          byQty[q] = result;
        } catch {
          byQty[q] = null;
        }
      }
    }

    const sanitize = (r: Record<string, unknown>) => ({
      total: r.total,
      unitPrice: r.unitPrice,
      perUnit: r.perUnit,
      estimatedWeight: r.estimatedWeight,
      totalThickness: r.totalThickness,
      thicknessValidation: r.thicknessValidation,
      pages: r.pages,
      guidePriceTotal: r.guidePriceTotal,
    });

    const safeSelected = sanitize(selected as Record<string, unknown>);
    let safeByQty: Record<number, unknown> | undefined;
    if (byQty) {
      safeByQty = {};
      for (const [q, v] of Object.entries(byQty)) {
        safeByQty[Number(q)] = v ? sanitize(v as Record<string, unknown>) : null;
      }
    }

    return new Response(JSON.stringify({ selected: safeSelected, byQty: safeByQty }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Price calculation failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
