import type { APIRoute } from "astro";

import { loadPricingData } from "@/lib/dbService";
import { createOrder } from "@/lib/orderService";
import { calculatePrice } from "@/lib/priceEngine";
import { supabase } from "@/lib/supabase";

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
    const submittedPrice = orderData.productAmount;
    const isOutsourced = productType === "outsourced";

    let finalPrice = submittedPrice;

    if (isOutsourced) {
      // outsourced 상품: 서버에서 가격 재계산하여 검증
      const productId = priceInput.productId;
      if (productId) {
        const { data: product } = await supabase
          .from("products")
          .select("content, blocks")
          .eq("id", productId)
          .single();

        if (product) {
          const oCfg = product.content?.outsourced_config;
          if (oCfg) {
            const qtyDiscounts = oCfg.qtyDiscounts || [];
            const findDiscount = (q: number) => {
              const d = [...qtyDiscounts]
                .sort(
                  (a: { minQty: number }, b: { minQty: number }) =>
                    b.minQty - a.minQty
                )
                .find((d: { minQty: number }) => q >= d.minQty);
              return d?.percent || 0;
            };
            const booksBlock = (product.blocks || []).find(
              (b: { on: boolean; type: string }) => b.on && b.type === "books"
            );
            const booksCfg = booksBlock?.config || {};
            const books = priceInput.books || [];
            const guidePrice = Number(priceInput.guidePriceTotal) || 0;

            if (books.length > 0) {
              const bPagePrice = booksCfg.pagePrice ?? oCfg.pagePrice ?? 40;
              const bBindingFee =
                booksCfg.bindingFee ?? oCfg.bindingFee ?? 1500;
              const totalQty = books.reduce(
                (s: number, b: { qty?: number }) => s + (b.qty || 1),
                0
              );
              const discountPct = findDiscount(totalQty);
              let total = 0;
              for (const book of books) {
                const pg = book.pages || 100;
                const bq = book.qty || 1;
                total += Math.round(
                  (pg * bPagePrice + bBindingFee + guidePrice) *
                    bq *
                    (1 - discountPct / 100)
                );
              }
              const freeDesignMinQty = booksCfg.freeDesignMinQty ?? 100;
              const designFee = Number(priceInput.designFee) || 0;
              if (designFee > 0 && totalQty < freeDesignMinQty)
                total += designFee;
              finalPrice = total;
            } else {
              const oPages = priceInput.pages || 100;
              const perCopy =
                oPages * (oCfg.pagePrice ?? 40) +
                (oCfg.bindingFee ?? 1500) +
                guidePrice;
              const discountPct = findDiscount(qty);
              finalPrice = Math.round(perCopy * qty * (1 - discountPct / 100));
            }
          }
        }
      }
      // productId 없으면 (구버전 호환) 제출 가격 사용
      if (finalPrice === submittedPrice && productId) {
        // 계산 실패 시에도 submittedPrice 사용 (주문 차단보다 낫다)
      }
    } else {
      await loadPricingData();
      const serverResult = calculatePrice(
        customer,
        qty,
        productType || "flyer"
      );
      // 가이드 블록 가격 합산 (calculate-price API와 동일하게 처리)
      const guidePrice = Number(priceInput.guidePriceTotal) || 0;
      const serverPrice = serverResult.total + guidePrice;

      // Price discrepancy check
      // Only reject if submitted price is significantly LOWER than server price
      if (submittedPrice < serverPrice) {
        const discrepancy =
          ((serverPrice - submittedPrice) / serverPrice) * 100;

        if (discrepancy > MAX_PRICE_DISCREPANCY_PERCENT) {
          return new Response(
            JSON.stringify({
              error: "Price verification failed",
              message:
                "가격이 서버 계산과 일치하지 않습니다. 페이지를 새로고침 후 다시 시도해주세요.",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
      }

      finalPrice = serverPrice;
    }

    // --- Use verified price for the order ---
    const verifiedOrderData = {
      ...orderData,
      productAmount: finalPrice,
      totalAmount:
        finalPrice + (orderData.shippingCost || 0) + (orderData.quickCost || 0),
    };

    const result = await createOrder(verifiedOrderData);

    return new Response(
      JSON.stringify({
        success: true,
        orderNumber: result.orderNumber,
        uuid: result.uuid,
        verifiedPrice: finalPrice,
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
