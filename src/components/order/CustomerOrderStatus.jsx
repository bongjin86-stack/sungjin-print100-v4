import { useEffect, useState } from "react";

import {
  getOrderByUuid,
  getTrackingUrl,
  STATUS_COLORS,
  STATUS_LABELS,
  TRACKING_COMPANIES,
} from "@/lib/orderService";

export default function CustomerOrderStatus({ uuid }) {
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadOrder() {
      try {
        const data = await getOrderByUuid(uuid);
        setOrder(data);
      } catch (err) {
        setError("주문을 찾을 수 없습니다.");
      } finally {
        setIsLoading(false);
      }
    }
    if (uuid) loadOrder();
  }, [uuid]);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };

  const getDeliveryTypeLabel = (type) => {
    const labels = { delivery: "택배", quick: "퀵 배송", pickup: "직접 수령" };
    return labels[type] || type;
  };

  const getTrackingCompanyLabel = (company) => {
    const carrier = TRACKING_COMPANIES.find((c) => c.value === company);
    return carrier ? carrier.label : company;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#222828]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            주문을 찾을 수 없습니다
          </h2>
          <p className="text-gray-500 mb-6">
            올바른 주문 조회 링크인지 확인해 주세요.
          </p>
          <a
            href="/"
            className="inline-flex px-6 py-2.5 bg-[#222828] text-white rounded-lg font-medium hover:bg-[#4a5050] transition-colors"
          >
            홈으로 돌아가기
          </a>
        </div>
      </div>
    );
  }

  const firstItem = order.items?.[0];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">주문 조회</h1>
          <p className="text-gray-500">주문번호: {order.order_number}</p>
        </div>

        {/* 현재 상태 */}
        <div className="bg-white rounded-xl border border-gray-200 p-8 mb-6 text-center">
          <p className="text-sm text-gray-500 mb-3">현재 상태</p>
          <span
            className={`inline-flex px-6 py-2 rounded-full text-lg font-semibold ${STATUS_COLORS[order.status]}`}
          >
            {STATUS_LABELS[order.status]}
          </span>
          <p className="text-sm text-gray-400 mt-4">
            주문일시: {formatDate(order.created_at)}
          </p>
        </div>

        {/* 배송 정보 */}
        {order.status === "shipped" && order.tracking_number && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">배송 정보</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">택배사</span>
                <span className="font-medium">
                  {getTrackingCompanyLabel(order.tracking_company)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">송장번호</span>
                <span className="font-mono font-medium">
                  {order.tracking_number}
                </span>
              </div>
              <a
                href={getTrackingUrl(
                  order.tracking_company,
                  order.tracking_number
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full mt-4 px-4 py-3 bg-[#222828] text-white text-center rounded-lg font-medium hover:bg-[#4a5050] transition-colors"
              >
                배송 조회하기
              </a>
            </div>
          </div>
        )}

        {/* 2단 레이아웃: 상품 정보 + 주문 정보 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 왼쪽: 상품 정보 */}
          <div className="space-y-4">
            {/* 상품 이미지 */}
            {firstItem?.image && (
              <div className="rounded-xl overflow-hidden bg-white border border-gray-200">
                <img
                  src={firstItem.image}
                  alt={firstItem.productName}
                  className="w-full aspect-[3/2] object-cover"
                />
              </div>
            )}

            {/* 상품 상세 */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">주문 상품</h3>
              <div className="space-y-4">
                {order.items?.map((item, index) => {
                  const itemHasBooks = item.booksSummary?.length > 0;
                  const itemBooks = itemHasBooks ? item.booksSummary.filter(b => b.designFee == null) : [];
                  const isHex = (v) => /^#[0-9a-fA-F]{3,8}$/.test(String(v));
                  return (
                  <div key={index}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">
                          {item.productName}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {item.spec?.size} · {item.spec?.quantity}부
                          {itemHasBooks && ` (${itemBooks.length}권)`}
                          {!itemHasBooks && item.spec?.pages && ` · ${item.spec.pages}p`}
                        </p>
                        {item.spec?.finishing?.length > 0 && (
                          <p className="text-sm text-gray-500">
                            후가공: {item.spec.finishing.join(", ")}
                          </p>
                        )}
                      </div>
                      <span className="font-semibold text-gray-900">
                        {`\u20A9${item.price?.toLocaleString()}`}
                      </span>
                    </div>

                    {/* 시리즈 주문 */}
                    {itemHasBooks && (
                      <div className="mt-3 space-y-2">
                        {itemBooks.map((book) => {
                          const fields = Object.entries(book.fields || {}).filter(([, v]) => v && String(v).trim());
                          return (
                            <div key={book.index} className="bg-gray-50 rounded-lg p-2.5">
                              <div className="flex justify-between items-center mb-0.5">
                                <span className="text-sm font-semibold">{book.index}권</span>
                                <span className="text-xs text-gray-500">{book.pages}p · {book.qty}부</span>
                              </div>
                              {fields.length > 0 && (
                                <div className="space-y-0.5">
                                  {fields.map(([label, value]) => (
                                    <div key={label} className="flex items-center gap-1.5 text-xs text-gray-600">
                                      <span className="text-gray-400">{label}:</span>
                                      {isHex(value) ? (
                                        <span className="inline-block w-3 h-3 rounded-full border border-gray-300" style={{backgroundColor: String(value)}} />
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
                      </div>
                    )}

                    {/* 텍스트 입력 내용 */}
                    {!itemHasBooks && item.textInputs?.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {item.textInputs.map((ti, i) => (
                          <div key={i}>
                            <p className="text-xs text-gray-500">{ti.label}</p>
                            {isHex(ti.value) ? (
                              <span className="inline-block w-4 h-4 rounded-full border border-gray-300 mt-1" style={{backgroundColor: ti.value}} />
                            ) : (
                              <p className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 rounded-lg p-2 mt-1">
                                {ti.value}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 오른쪽: 주문/배송 정보 */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">수령 방법</h3>
              <span
                className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                  order.delivery_type === "delivery"
                    ? "bg-blue-100 text-blue-700"
                    : order.delivery_type === "quick"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-gray-100 text-gray-700"
                }`}
              >
                {getDeliveryTypeLabel(order.delivery_type)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <a
            href="/"
            className="text-gray-500 hover:text-gray-700 text-sm font-medium"
          >
            홈으로 돌아가기
          </a>
        </div>
      </div>
    </div>
  );
}
