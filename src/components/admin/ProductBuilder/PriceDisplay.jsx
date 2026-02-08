/**
 * PriceDisplay.jsx
 *
 * AdminBuilder용 - 공유 PriceBox 컴포넌트 래퍼
 * isPreview=true로 설정하여 버튼 비활성화
 */

import { PriceBox } from "@/components/shared/PriceBox";

function PriceDisplay({ price, customer, productName }) {
  return <PriceBox price={price} customer={customer} isPreview={true} />;
}

export default PriceDisplay;
