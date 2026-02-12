/**
 * usePriceCalculation - 서버 가격 계산 훅
 *
 * customer 변경 시 debounce로 서버에 가격 계산 요청
 */

import { useEffect, useRef, useState } from "react";

import { mapPrintOptionsToCustomer } from "@/lib/blockDefaults";

export function usePriceCalculation(
  customer,
  currentProduct,
  currentTemplateId,
  dbLoaded
) {
  const [serverPrice, setServerPrice] = useState(null);
  const [qtyPrices, setQtyPrices] = useState({});
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!dbLoaded) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const qtyBlock = currentProduct?.blocks?.find(
        (b) => b.on && b.type === "quantity"
      );
      const allQtys = qtyBlock?.config?.options || [];
      try {
        // fileSpec 추가금
        const sizeBlock = currentProduct?.blocks?.find((b) => b.on && b.type === "size");
        const fileSpecPrice = sizeBlock?.config?.trimEnabled
          ? (sizeBlock.config.fileSpecPrices || {})[customer.fileSpec || "with_bleed"] || 0
          : 0;

        // 가이드 블록 가격 합산
        const guidePriceTotal = Object.entries(customer.guides || {}).reduce((sum, [blockId, state]) => {
          const guideBlock = currentProduct?.blocks?.find((b) => String(b.id) === String(blockId) && b.on && b.type === "guide");
          const opt = guideBlock?.config?.options?.find((o) => o.id === state.selected);
          return sum + (opt?.price || 0);
        }, 0);

        const res = await fetch("/api/calculate-price", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer: mapPrintOptionsToCustomer(
              customer,
              currentProduct?.blocks
            ),
            qty: customer.qty,
            productType: currentProduct?.product_type || currentTemplateId,
            allQtys,
            fileSpecPrice,
            guidePriceTotal,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setServerPrice(data.selected || null);
          if (data.byQty) setQtyPrices(data.byQty);
        }
      } catch (e) {
        console.warn("Price fetch error:", e.message);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [customer, dbLoaded, currentTemplateId]);

  return { serverPrice, qtyPrices };
}
