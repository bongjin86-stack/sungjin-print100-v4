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
        const res = await fetch("/api/calculate-price", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer: mapPrintOptionsToCustomer(
              customer,
              currentProduct?.blocks
            ),
            qty: customer.qty,
            productType: currentProduct?.productType || currentTemplateId,
            allQtys,
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
