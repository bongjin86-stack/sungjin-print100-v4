import type { APIRoute } from "astro";

import { loadPricingData } from "@/lib/dbService";
import { createOrder } from "@/lib/orderService";
import { calculatePrice } from "@/lib/priceEngine";

export const prerender = false;

// Maximum allowed price discrepancy (percentage)
// Allows for minor rounding differences between client/server
const MAX_PRICE_DISCREPANCY_PERCENT = 3;

/**
 * Server-side order creation with price verification
 * POST /api/create-order
 *
 * Recalculates the price server-side and compares with the submitted amount.
 * Rejects orders where the submitted price is significantly lower than the actual price.
 * This prevents price manipulation via sessionStorage/DevTools.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { orderData, priceInput } = body;

    if (!orderData || !priceInput) {
      return new Response(
        JSON.stringify({ error: "orderData and priceInput are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { customer, qty, productType } = priceInput;

    if (!customer || !qty || qty <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid price input parameters" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // --- Server-side price recalculation ---
    await loadPricingData();
    const serverResult = calculatePrice(customer, qty, productType || "flyer");
    const serverPrice = serverResult.total;
    const submittedPrice = orderData.productAmount;

    // --- Price discrepancy check ---
    // Only reject if submitted price is significantly LOWER than server price
    // (higher is acceptable - customer might have faster delivery selected)
    if (submittedPrice < serverPrice) {
      const discrepancy = ((serverPrice - submittedPrice) / serverPrice) * 100;

      if (discrepancy > MAX_PRICE_DISCREPANCY_PERCENT) {
        return new Response(
          JSON.stringify({
            error: "Price verification failed",
            serverPrice,
            submittedPrice,
            message:
              "가격이 서버 계산과 일치하지 않습니다. 페이지를 새로고침 후 다시 시도해주세요.",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // --- Use server-calculated price for the order ---
    const verifiedOrderData = {
      ...orderData,
      productAmount: serverPrice,
      totalAmount:
        serverPrice +
        (orderData.shippingCost || 0) +
        (orderData.quickCost || 0),
    };

    const result = await createOrder(verifiedOrderData);

    return new Response(
      JSON.stringify({
        success: true,
        orderNumber: result.orderNumber,
        uuid: result.uuid,
        verifiedPrice: serverPrice,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Order creation failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
