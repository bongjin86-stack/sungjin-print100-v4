import type { APIRoute } from 'astro';

import { loadPricingData } from '@/lib/dbService';
import { calculatePrice } from '@/lib/priceEngine';

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
    const { customer, qty, productType } = body;

    if (!customer || !qty || qty <= 0) {
      return new Response(
        JSON.stringify({ error: 'customer and qty are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Ensure pricing data is loaded (cached after first call)
    await loadPricingData();

    const result = calculatePrice(customer, qty, productType || 'flyer');

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Price calculation failed';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
