import type { APIRoute } from "astro";

import { loadPricingData } from "@/lib/dbService";
import { calculatePrice } from "@/lib/priceEngine";

export const prerender = false;

/**
 * Server-side price calculation endpoint
 * POST /api/calculate-price
 *
 * Body: { customer: CustomerSelection, qty: number, productType: string }
 * Response: { total, breakdown, perUnit, ... }
 *
 * This keeps pricing formulas and cost data server-side only.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { customer, qty, productType, allQtys, guidePriceTotal } = body;

    if (!customer || !qty || qty <= 0) {
      return new Response(
        JSON.stringify({ error: "customer and qty are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Ensure pricing data is loaded (cached after first call)
    await loadPricingData();

    const selected = calculatePrice(customer, qty, productType || "flyer");
    // Add guide block surcharges (주문당 고정금)
    const guidePrice = Number(guidePriceTotal) || 0;
    if (guidePrice > 0) {
      selected.guidePriceTotal = guidePrice;
      selected.total = (selected.total || 0) + guidePrice;
    }

    // Calculate prices for all quantity options (for quantity table display)
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

    // 클라이언트에 내부 원가 구조(breakdown) 노출 방지 — 필요한 필드만 반환
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
