/**
 * PriceBox.jsx
 *
 * 공유 가격 표시 컴포넌트 - ProductView와 ProductBuilder에서 동일하게 사용
 * blocks를 직접 받아서 필요한 config(절삭 등)을 내부에서 추출
 * 스타일: ProductView.css의 pv-* 클래스 사용
 */

import { memo } from "react";

function applyRound(value, cfg) {
  if (!cfg?.roundEnabled || !value) return value;
  const unit = cfg.roundUnit || 100;
  const method = cfg.roundMethod || "floor";
  if (method === "floor") return Math.floor(value / unit) * unit;
  if (method === "ceil") return Math.ceil(value / unit) * unit;
  return Math.round(value / unit) * unit;
}

function PriceBoxInner({
  price,
  customer,
  blocks,
  isPreview = false,
  onOrderClick,
}) {
  const roundConfig = blocks?.find((b) => b.type === "quantity")?.config;
  const total = price?.total || 0;
  const rawTotalWithVat = Math.round(total * 1.1);
  const totalWithVat = applyRound(rawTotalWithVat, roundConfig);
  const vat = totalWithVat - total;

  return (
    <>
      {/* 가격 박스 */}
      <div className="pv-price-box">
        <div className="pv-price-row">
          <div className="pv-price-left">
            <p className="pv-price-label">출고일</p>
            <p className="pv-price-date">{customer.deliveryDate || "-"}</p>
          </div>
          <div className="pv-price-right">
            <p className="pv-price-label">결제금액</p>
            <p className="pv-price-total">
              {totalWithVat.toLocaleString()}
              <span className="pv-price-unit">원</span>
            </p>
          </div>
        </div>
        <div className="pv-price-row-sub">
          <p className="pv-price-weight">
            예상 무게 약{" "}
            {price.estimatedWeight
              ? `${price.estimatedWeight.toFixed(1)}kg`
              : "-"}
            {price.totalThickness > 0 &&
              ` · 1부당 두께 약 ${price.totalThickness.toFixed(1)}mm`}
          </p>
          <p className="pv-price-breakdown">
            (공급가: {total.toLocaleString()}원 + 부가세: {vat.toLocaleString()}
            원)
          </p>
        </div>

        {/* 두께 에러 */}
        {price.thicknessValidation?.error && (
          <div className="pv-thickness-error">
            <p>&#9888; {price.thicknessValidation.message}</p>
          </div>
        )}

        {/* 두께 경고 */}
        {price.thicknessValidation?.warning &&
          !price.thicknessValidation?.error && (
            <div className="pv-thickness-warning">
              <p>&#9888; {price.thicknessValidation.message}</p>
            </div>
          )}
      </div>

      {/* 다음으로 버튼 */}
      <button
        disabled={price.thicknessValidation?.error || isPreview}
        onClick={onOrderClick}
        className="pv-order-btn"
        style={isPreview ? { opacity: 0.5, cursor: "not-allowed" } : {}}
      >
        {price.thicknessValidation?.error
          ? "주문 불가 (두께 초과)"
          : isPreview
            ? "다음으로 (미리보기)"
            : "다음으로"}
      </button>
    </>
  );
}

export const PriceBox = memo(PriceBoxInner);
export default PriceBox;
