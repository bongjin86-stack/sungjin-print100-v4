import { getBankInfo, getPhone } from "@/lib/siteConfigService";

export default function OrderSummary({
  product,
  shippingCost,
  quickCost,
  totalAmount,
  deliveryType,
  quickPaymentType,
  packaging,
  releaseDate,
}) {
  const formatPrice = (price) => `\u20A9${price.toLocaleString()}`;

  const getShippingCostDisplay = () => {
    if (deliveryType === "pickup") return "무료";
    if (deliveryType === "quick") {
      if (quickPaymentType === "cod") return "착불";
      return "무료";
    }
    return shippingCost === 0 ? "무료" : formatPrice(shippingCost);
  };

  return (
    <div className="lg:col-span-5 order-1 lg:order-2">
      <div className="lg:sticky lg:top-8">
        <div className="bg-gray-50 rounded-2xl p-6">
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold">주문 내역</h2>
            <p className="text-xs text-gray-400 mt-1">ORDER SUMMARY</p>
          </div>
          {product.image && (
            <div className="rounded-xl overflow-hidden mb-4">
              <img
                src={product.image}
                alt={product.name}
                className="w-full aspect-[3/2] object-cover"
              />
            </div>
          )}
          <div className="text-center pb-4 border-b border-dashed border-gray-300">
            <h3 className="font-bold text-base">{product.name}</h3>
          </div>
          {(() => {
            const hasBooks = product.booksSummary?.length > 0;
            const books = hasBooks ? product.booksSummary.filter(b => b.designFee == null) : [];
            const isHex = (v) => /^#[0-9a-fA-F]{3,8}$/.test(String(v));
            return (
              <>
                <div className="py-4 space-y-3 text-sm border-b border-dashed border-gray-300">
                  {product.spec?.size && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">사이즈</span>
                      <span>{product.spec.size}</span>
                    </div>
                  )}
                  {!hasBooks && product.spec?.paper && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">용지</span>
                      <span>{product.spec.paper}</span>
                    </div>
                  )}
                  {!hasBooks && product.spec?.color && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">인쇄</span>
                      <span>{product.spec.color}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">수량</span>
                    <span>{product.spec?.quantity || 0}부{hasBooks ? ` (${books.length}권)` : ""}</span>
                  </div>
                  {!hasBooks && product.spec?.pages && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">페이지</span>
                      <span>{product.spec.pages}p</span>
                    </div>
                  )}
                  {product.spec?.finishing && product.spec.finishing.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">후가공</span>
                      <span>{product.spec.finishing.join(", ")}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">출고일</span>
                    <span>{releaseDate || `${product.productionDays}영업일`}</span>
                  </div>
                </div>
                {/* 시리즈 주문 요약 */}
                {hasBooks && (
                  <div className="py-4 border-b border-dashed border-gray-300 space-y-1.5 text-sm">
                    {books.map((book) => (
                      <div key={book.index} className="flex justify-between text-gray-600">
                        <span>{book.index}권</span>
                        <span>{book.pages}p · {book.qty}부</span>
                      </div>
                    ))}
                    {product.booksSummary.filter(b => b.designFee != null).map((df, i) => (
                      <div key={`df-${i}`} className="flex justify-between text-xs text-amber-700 pt-1">
                        <span>디자인 비용</span>
                        <span>{formatPrice(df.designFee)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* 텍스트 입력 */}
                {!hasBooks && product.textInputs?.length > 0 && (
                  <div className="py-4 border-b border-dashed border-gray-300 space-y-2">
                    {product.textInputs.map((ti, i) => (
                      <div key={i}>
                        <p className="text-xs text-gray-500 mb-1">{ti.label}</p>
                        {isHex(ti.value) ? (
                          <span className="inline-block w-4 h-4 rounded-full border border-gray-300" style={{backgroundColor: ti.value}} />
                        ) : (
                          <p className="text-sm text-gray-900 whitespace-pre-wrap">{ti.value}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
          <div className="py-4 border-b border-dashed border-gray-300">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">배송방법</span>
              <span className="font-medium">
                {deliveryType === "delivery" && "택배"}
                {deliveryType === "quick" &&
                  (quickPaymentType === "cod" ? "퀵 (착불)" : "퀵 (선불)")}
                {deliveryType === "pickup" && "방문수령"}
              </span>
            </div>
          </div>
          {packaging && packaging.boxCount > 0 && (
            <div className="py-4 border-b border-dashed border-gray-300">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">예상 포장</span>
                <span className="font-medium">
                  {packaging.boxCount}박스 (약 {packaging.totalWeight}kg)
                </span>
              </div>
            </div>
          )}
          <div className="py-4 space-y-3 text-sm border-b border-dashed border-gray-300">
            <div className="flex justify-between">
              <span className="text-gray-500">상품 금액</span>
              <span>{formatPrice(product.price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">부가세</span>
              <span>{formatPrice(Math.round(product.price * 0.1))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">배송비</span>
              <span>{getShippingCostDisplay()}</span>
            </div>
            {deliveryType === "quick" &&
              quickPaymentType === "prepaid" &&
              quickCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">퀵 비용</span>
                  <span>{formatPrice(quickCost)}</span>
                </div>
              )}
          </div>
          <div className="py-4 border-b border-dashed border-gray-300">
            <div className="flex justify-between items-end">
              <span className="text-gray-500">총 결제금액</span>
              <div className="text-right">
                <span className="text-2xl font-bold">
                  {formatPrice(totalAmount)}
                </span>
                <p className="text-xs text-gray-400 mt-1">VAT 별도</p>
              </div>
            </div>
          </div>
          <div className="py-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">입금 계좌</span>
              <span>
                {getBankInfo().bankName} {getBankInfo().bankAccount}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">예금주</span>
              <span>{getBankInfo().bankHolder}</span>
            </div>
          </div>
          <div className="mt-4 bg-[#222828] rounded-xl p-4 text-center">
            <p className="text-sm font-medium text-white">
              결제 확인 후 제작이 시작됩니다
            </p>
            <p className="text-sm text-gray-300 mt-1">문의 {getPhone()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
