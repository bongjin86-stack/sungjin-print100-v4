import { getShippingConfig } from './siteConfigService';

/**
 * 택배비 계산
 * - 기본: 박스당 4,000원 (Site Config에서 설정 가능)
 * - 5만원 이상 주문 시 N박스 무료 (Site Config에서 설정 가능)
 */
export function calculateShippingCost(
  boxCount: number,
  productPrice: number
): number {
  const config = getShippingConfig();
  const SHIPPING_PER_BOX = config.feePerBox;
  const FREE_BOXES = config.freeBoxes;
  const FREE_SHIPPING_THRESHOLD = 50000;

  if (boxCount <= 0) return 0;

  if (productPrice >= FREE_SHIPPING_THRESHOLD) {
    const chargeableBoxes = Math.max(0, boxCount - FREE_BOXES);
    return chargeableBoxes * SHIPPING_PER_BOX;
  }

  return boxCount * SHIPPING_PER_BOX;
}
