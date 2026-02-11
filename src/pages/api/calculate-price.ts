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
    const { customer, qty, productType, allQtys, addonOptions, selectedAddons } = body;

    if (!customer || !qty || qty <= 0) {
      return new Response(
        JSON.stringify({ error: "customer and qty are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Ensure pricing data is loaded (cached after first call)
    await loadPricingData();

    // Calculate addon total from selected options
    let addonTotal = 0;
    if (Array.isArray(addonOptions) && Array.isArray(selectedAddons)) {
      for (const addon of addonOptions) {
        if (selectedAddons.includes(addon.option_id) && addon.enabled !== false) {
          addonTotal += addon.price || 0;
        }
      }
    }

    const selected = calculatePrice(customer, qty, productType || "flyer");
    // Add addon cost to total
    if (addonTotal > 0) {
      selected.addonTotal = addonTotal;
      selected.total = (selected.total || 0) + addonTotal;
    }

    // Calculate prices for all quantity options (for quantity table display)
    let byQty: Record<number, unknown> | undefined;
    if (Array.isArray(allQtys) && allQtys.length > 0) {
      byQty = {};
      for (const q of allQtys) {
        try {
          const result = calculatePrice(customer, q, productType || "flyer") as Record<string, unknown>;
          if (addonTotal > 0) {
            result.addonTotal = addonTotal;
            result.total = ((result.total as number) || 0) + addonTotal;
          }
          byQty[q] = result;
        } catch {
          byQty[q] = null;
        }
      }
    }

    return new Response(JSON.stringify({ selected, byQty }), {
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
