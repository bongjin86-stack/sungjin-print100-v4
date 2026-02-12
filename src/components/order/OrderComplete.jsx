import { useEffect, useState } from "react";

import { getBankInfo, getEmail, getPhone } from "@/lib/siteConfigService";

export default function OrderComplete() {
  const [orderData, setOrderData] = useState(null);
  const [orderNumber, setOrderNumber] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setOrderNumber(params.get("orderNumber") || "");

    const saved = sessionStorage.getItem("orderComplete");
    if (saved) {
      try {
        setOrderData(JSON.parse(saved));
      } catch (e) {
        console.error("주문 데이터 파싱 실패:", e);
      }
    }
  }, []);

  const bankInfo = getBankInfo();
  const formatPrice = (price) => `\u20A9${(price || 0).toLocaleString()}`;

  const getPaymentMethodLabel = (method) => {
    const labels = {
      bank_transfer: "무통장입금",
      card: "신용카드",
      toss: "토스페이",
      kakao: "카카오페이",
    };
    return labels[method] || method;
  };

  const getDeliveryTypeLabel = (type) => {
    const labels = {
      delivery: "택배 배송",
      quick: "퀵 배송",
      pickup: "방문 수령",
    };
    return labels[type] || type;
  };

  const spec = orderData?.product?.spec;
  const hasBooks = orderData?.product?.booksSummary?.length > 0;
  const books = hasBooks ? orderData.product.booksSummary.filter(b => b.designFee == null) : [];
  const isHex = (v) => /^#[0-9a-fA-F]{3,8}$/.test(String(v));

  return (
    <div className="min-h-screen bg-[#f5f7f7]">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <a href="/" className="text-lg font-semibold text-gray-900">
            Sungjin Print
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            주문이 완료되었습니다
          </h1>
          <p className="text-gray-600">주문해 주셔서 감사합니다.</p>
        </div>

        {orderData?.email && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-center">
            <p className="text-sm text-blue-800">
              주문 내역을 <strong>{orderData.email}</strong>로 보내드렸습니다.
            </p>
          </div>
        )}

        {/* 2단 레이아웃 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 왼쪽: 상품 정보 */}
          <div className="space-y-4">
            {/* 상품 이미지 */}
            {orderData?.product?.image && (
              <div className="rounded-2xl overflow-hidden bg-white shadow-sm">
                <img
                  src={orderData.product.image}
                  alt={orderData.product.name}
                  className="w-full aspect-[3/2] object-cover"
                />
              </div>
            )}

            {/* 상품 상세 */}
            {orderData?.product && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-4">
                  주문 상품
                </h2>
                <p className="font-medium text-gray-900 mb-3">
                  {orderData.product.name}
                </p>
                <div className="space-y-2 text-sm">
                  {spec?.size && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">사이즈</span>
                      <span>{spec.size}</span>
                    </div>
                  )}
                  {!hasBooks && spec?.paper && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">용지</span>
                      <span>{spec.paper}</span>
                    </div>
                  )}
                  {!hasBooks && spec?.color && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">인쇄</span>
                      <span>{spec.color}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">수량</span>
                    <span>{spec?.quantity || 0}부{hasBooks ? ` (${books.length}권)` : ""}</span>
                  </div>
                  {!hasBooks && spec?.pages && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">페이지</span>
                      <span>{spec.pages}p</span>
                    </div>
                  )}
                  {spec?.finishing?.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">후가공</span>
                      <span>{spec.finishing.join(", ")}</span>
                    </div>
                  )}
                </div>

                {/* 시리즈 주문 상세 */}
                {hasBooks && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                    {books.map((book) => {
                      const fields = Object.entries(book.fields || {}).filter(([, v]) => v && String(v).trim());
                      return (
                        <div key={book.index} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-semibold">{book.index}권</span>
                            <span className="text-xs text-gray-500">{book.pages}p · {book.qty}부</span>
                          </div>
                          {fields.length > 0 && (
                            <div className="space-y-0.5">
                              {fields.map(([label, value]) => (
                                <div key={label} className="flex items-center gap-1.5 text-xs text-gray-600">
                                  <span className="text-gray-400">{label}:</span>
                                  {isHex(value) ? (
                                    <span className="inline-block w-3.5 h-3.5 rounded-full border border-gray-300" style={{backgroundColor: String(value)}} />
                                  ) : (
                                    <span>{String(value)}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {orderData.product.booksSummary.filter(b => b.designFee != null).map((df, i) => (
                      <div key={`df-${i}`} className="flex justify-between text-xs text-amber-700">
                        <span>디자인 비용</span>
                        <span>{formatPrice(df.designFee)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 텍스트 입력 내용 */}
                {!hasBooks && orderData.product.textInputs?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                    {orderData.product.textInputs.map((ti, i) => (
                      <div key={i}>
                        <p className="text-xs text-gray-500 mb-1">{ti.label}</p>
                        {isHex(ti.value) ? (
                          <span className="inline-block w-4 h-4 rounded-full border border-gray-300" style={{backgroundColor: ti.value}} />
                        ) : (
                          <p className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                            {ti.value}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 결제 금액 */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">상품금액</span>
                  <span>
                    {formatPrice(
                      orderData?.productAmount || orderData?.product?.price
                    )}
                  </span>
                </div>
                {orderData?.shippingCost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">배송비</span>
                    <span>{formatPrice(orderData.shippingCost)}</span>
                  </div>
                )}
                {orderData?.shippingCost === 0 &&
                  orderData?.deliveryType === "delivery" && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">배송비</span>
                      <span className="text-green-600">무료</span>
                    </div>
                  )}
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="font-semibold">총 결제금액</span>
                  <span className="font-semibold text-[#222828]">
                    {formatPrice(orderData?.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 오른쪽: 주문/고객 정보 */}
          <div className="space-y-4">
            {/* 주문 정보 */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">
                주문 정보
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">주문번호</span>
                  <span className="font-mono font-semibold text-gray-900">
                    {orderNumber || orderData?.orderNumber || "-"}
                  </span>
                </div>
                {orderData?.totalAmount && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">결제금액</span>
                    <span className="font-semibold text-[#222828]">
                      {formatPrice(orderData.totalAmount)}
                    </span>
                  </div>
                )}
                {orderData?.paymentMethod && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">결제방법</span>
                    <span className="text-gray-900">
                      {getPaymentMethodLabel(orderData.paymentMethod)}
                    </span>
                  </div>
                )}
                {orderData?.deliveryType && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">수령방법</span>
                    <span className="text-gray-900">
                      {getDeliveryTypeLabel(orderData.deliveryType)}
                    </span>
                  </div>
                )}
                {orderData?.releaseDate && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">출고일</span>
                    <span className="font-semibold text-gray-900">
                      {orderData.releaseDate}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 입금 안내 */}
            {orderData?.paymentMethod === "bank_transfer" && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-4">
                  입금 안내
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  아래 계좌로 입금해주시면 제작이 시작됩니다.
                </p>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">은행</span>
                    <span className="font-medium">{bankInfo.bankName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">계좌번호</span>
                    <span className="font-mono font-medium">
                      {bankInfo.bankAccount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">예금주</span>
                    <span className="font-medium">{bankInfo.bankHolder}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="text-gray-500">입금금액</span>
                    <span className="font-semibold text-[#222828]">
                      {formatPrice(orderData?.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 문의 */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-3">문의</h2>
              <p className="text-sm text-gray-600">문의사항은 아래로 연락주세요.</p>
              <div className="mt-3 space-y-1">
                <p className="text-sm">
                  <span className="text-gray-500">전화:</span>{" "}
                  <a
                    href={`tel:${getPhone()}`}
                    className="text-[#222828] font-medium"
                  >
                    {getPhone()}
                  </a>
                </p>
                <p className="text-sm">
                  <span className="text-gray-500">이메일:</span>{" "}
                  <a
                    href={`mailto:${getEmail()}`}
                    className="text-[#222828] font-medium"
                  >
                    {getEmail()}
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>

        <a
          href="/"
          className="block w-full py-3.5 bg-gray-900 text-white text-center text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors mt-6"
        >
          홈으로 돌아가기
        </a>
      </main>
    </div>
  );
}
