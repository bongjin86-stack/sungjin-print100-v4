/**
 * PriceDisplay.jsx
 *
 * AdminBuilder 전용 - 가격 표시 및 두께 경고 컴포넌트
 *
 * 주의:
 * - 가격 계산 로직은 src/lib/priceEngine.js 에 있습니다
 * - 이 컴포넌트는 계산된 결과만 표시합니다
 */

function PriceDisplay({ price, customer, productName }) {
  return (
    <>
      {/* 가격 표시 */}
      <div className="border border-gray-200 rounded-lg p-4 mt-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">{productName}</p>
            <p className="text-xs text-gray-400">{customer.qty}부 · {customer.pages || '-'}장</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold text-gray-900 tracking-tight">
              {price.total.toLocaleString()}
              <span className="text-sm font-normal text-gray-400 ml-0.5">원</span>
            </p>
            <p className="text-xs text-gray-400">부가세 별도</p>
          </div>
        </div>

        {/* 두께 경고/에러 표시 */}
        {price.thicknessValidation?.error && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-600 flex items-center gap-1">
              <span>⚠️</span> {price.thicknessValidation.message}
            </p>
          </div>
        )}
        {price.thicknessValidation?.warning && !price.thicknessValidation?.error && (
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-700 flex items-center gap-1">
              <span>⚠️</span> {price.thicknessValidation.message}
            </p>
          </div>
        )}

        {/* 두께 정보 표시 (제본 상품일 때) */}
        {price.totalThickness > 0 && (
          <p className="text-xs text-gray-400 mt-2 text-right">
            예상 두께: {price.totalThickness.toFixed(1)}mm
          </p>
        )}
      </div>

      {/* 주문하기 버튼 */}
      <button
        disabled={price.thicknessValidation?.error}
        className={`w-full mt-4 py-3 rounded-lg text-sm font-medium transition-all ${
          price.thicknessValidation?.error
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-gray-50 text-gray-300 cursor-not-allowed'
        }`}
      >
        {price.thicknessValidation?.error ? '주문 불가 (두께 초과)' : '주문하기'}
      </button>
    </>
  );
}

export default PriceDisplay
