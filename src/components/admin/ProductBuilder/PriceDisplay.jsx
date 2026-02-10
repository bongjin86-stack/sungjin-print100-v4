/**
 * PriceDisplay.jsx
 *
 * AdminBuilder용 - 공유 PriceBox 컴포넌트 래퍼
 * isPreview=true로 설정하여 버튼 비활성화
 */

import { PriceBox } from "@/components/shared/PriceBox";

function PriceDisplay({ productName, ...rest }) {
  return <PriceBox {...rest} isPreview={true} />;
}

export default PriceDisplay;
