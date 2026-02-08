import { useEffect, useState } from "react";

import { calculateReleaseDateFrom } from "@/lib/dateUtils";
import {
  deleteOrder,
  getOrderById,
  getTrackingUrl,
  startShipping,
  STATUS_COLORS,
  STATUS_LABELS,
  TRACKING_COMPANIES,
  updateOrder,
  updateOrderStatus,
} from "@/lib/orderService";
import { getBankInfo } from "@/lib/siteConfigService";

export default function OrderDetailModal({ orderId, onClose, onUpdate }) {
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // 폼 상태
  const [newStatus, setNewStatus] = useState("");
  const [trackingCompany, setTrackingCompany] = useState("cj");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  // 주문 로드
  useEffect(() => {
    async function load() {
      try {
        const data = await getOrderById(orderId);
        setOrder(data);
        setNewStatus(data.status);
        setTrackingCompany(data.tracking_company || "cj");
        setTrackingNumber(data.tracking_number || "");
        setAdminNotes(data.admin_notes || "");
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [orderId]);

  // 상태 변경
  const handleStatusChange = async () => {
    if (newStatus === order.status) return;

    setIsSaving(true);
    try {
      await updateOrderStatus(order.id, newStatus);
      setOrder((prev) => ({ ...prev, status: newStatus }));
      onUpdate?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 배송 시작
  const handleStartShipping = async () => {
    if (!trackingNumber.trim()) {
      alert("송장번호를 입력해주세요.");
      return;
    }

    setIsSaving(true);
    try {
      await startShipping(order.id, trackingCompany, trackingNumber.trim());
      setOrder((prev) => ({
        ...prev,
        status: "shipped",
        tracking_company: trackingCompany,
        tracking_number: trackingNumber.trim(),
      }));
      setNewStatus("shipped");
      onUpdate?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 메모 저장
  const handleSaveNotes = async () => {
    setIsSaving(true);
    try {
      await updateOrder(order.id, { admin_notes: adminNotes });
      setOrder((prev) => ({ ...prev, admin_notes: adminNotes }));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 주문 삭제
  const handleDelete = async () => {
    if (
      !confirm(
        "정말 이 주문을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다."
      )
    )
      return;

    setIsSaving(true);
    try {
      await deleteOrder(order.id);
      onUpdate?.();
      onClose();
    } catch (err) {
      setError(err.message);
      setIsSaving(false);
    }
  };

  // 금액 포맷
  const formatPrice = (price) => `₩${price?.toLocaleString() || 0}`;

  // 날짜 포맷
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  };

  // 배송 유형 라벨
  const getDeliveryTypeLabel = (type) => {
    const labels = { delivery: "택배", quick: "퀵", pickup: "방문수령" };
    return labels[type] || type;
  };

  // 결제 방법 라벨
  const getPaymentMethodLabel = (method) => {
    const labels = {
      bank_transfer: "무통장입금",
      card: "카드",
      toss: "토스",
      kakao: "카카오페이",
    };
    return labels[method] || method;
  };

  // 증빙서류 유형 라벨
  const getTaxDocumentTypeLabel = (type) => {
    const labels = {
      none: "발행안함",
      tax_invoice: "세금계산서",
      cash_receipt: "현금영수증",
    };
    return labels[type] || type;
  };

  // 파일 상태 표시
  const getFileStatusDisplay = (status, fileUrl) => {
    if (status === "uploaded" && fileUrl) {
      return (
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#222828] hover:underline"
        >
          다운로드
        </a>
      );
    }
    if (status === "skipped")
      return <span className="text-gray-500">이메일 전송 예정</span>;
    return <span className="text-orange-500">대기중</span>;
  };

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // 배경 클릭으로 닫기
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (isLoading) {
    return (
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
        onClick={handleBackdropClick}
      >
        <div className="bg-white rounded-2xl p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#222828]"></div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
        onClick={handleBackdropClick}
      >
        <div className="bg-white rounded-2xl p-8">
          <p className="text-gray-500">주문을 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const bankInfo = getBankInfo();
  const item = order.items?.[0] || {};

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* 모달 헤더 */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">주문 상세</h3>
            <p className="text-sm text-gray-500 font-mono">
              {order.order_number}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-6 h-6"
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
          </button>
        </div>

        {/* 모달 바디 */}
        <div className="px-6 py-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* 에러 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* 상태 변경 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-xl">
            <label className="text-sm font-medium text-gray-700 block mb-2">
              주문 상태
            </label>
            <div className="flex gap-2">
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#222828]/20"
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <button
                onClick={handleStatusChange}
                disabled={isSaving || newStatus === order.status}
                className="px-4 py-2.5 bg-[#222828] text-white rounded-lg text-sm font-medium hover:bg-[#222828]/90 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                상태 변경
              </button>
            </div>
          </div>

          {/* 고객 정보 */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              고객 정보
            </h4>
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">이메일</span>
                <span className="text-sm font-medium text-gray-900">
                  {order.customer_email}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">연락처</span>
                <span className="text-sm font-medium text-gray-900">
                  {order.customer_phone}
                </span>
              </div>
            </div>
          </div>

          {/* 배송 정보 */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              배송 정보
            </h4>
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">배송 유형</span>
                <span className="text-sm font-medium text-gray-900">
                  {getDeliveryTypeLabel(order.delivery_type)}
                </span>
              </div>
              {order.delivery_type !== "pickup" && (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">수령인</span>
                    <span className="text-sm font-medium text-gray-900">
                      {order.recipient || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-gray-500">주소</span>
                    <span className="text-sm font-medium text-gray-900 text-right">
                      {order.address || "-"}
                      {order.address_detail && <br />}
                      {order.address_detail}
                    </span>
                  </div>
                  {order.delivery_note && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">배송 메모</span>
                      <span className="text-sm font-medium text-gray-900">
                        {order.delivery_note}
                      </span>
                    </div>
                  )}
                </>
              )}
              {order.delivery_type === "quick" && (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">결제 방식</span>
                    <span className="text-sm font-medium text-gray-900">
                      {order.quick_payment_type === "cod" ? "착불" : "선불"}
                    </span>
                  </div>
                  {order.quick_payment_type === "prepaid" &&
                    order.quick_cost > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">퀵 비용</span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatPrice(order.quick_cost)}
                        </span>
                      </div>
                    )}
                </>
              )}
            </div>
          </div>

          {/* 파일 상태 */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              파일 상태
            </h4>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">인쇄 파일</span>
                <span className="text-sm font-medium">
                  {getFileStatusDisplay(order.file_status, order.file_url)}
                </span>
              </div>
              {order.file_name && (
                <div className="flex justify-between mt-2">
                  <span className="text-sm text-gray-500">파일명</span>
                  <span className="text-sm text-gray-700">
                    {order.file_name}
                  </span>
                </div>
              )}
              {order.request && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <span className="text-sm text-gray-500 block mb-1">
                    요청사항
                  </span>
                  <p className="text-sm text-gray-900">{order.request}</p>
                </div>
              )}
            </div>
          </div>

          {/* 증빙서류 */}
          {order.tax_document_type !== "none" && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                증빙서류
              </h4>
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">유형</span>
                  <span className="text-sm font-medium text-gray-900">
                    {getTaxDocumentTypeLabel(order.tax_document_type)}
                  </span>
                </div>
                {order.tax_document_type === "tax_invoice" && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">사업자번호</span>
                      <span className="text-sm font-medium text-gray-900">
                        {order.tax_business_number || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">상호</span>
                      <span className="text-sm font-medium text-gray-900">
                        {order.tax_company_name || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">대표자명</span>
                      <span className="text-sm font-medium text-gray-900">
                        {order.tax_ceo_name || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">이메일</span>
                      <span className="text-sm font-medium text-gray-900">
                        {order.tax_email || "-"}
                      </span>
                    </div>
                  </>
                )}
                {order.tax_document_type === "cash_receipt" && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">휴대폰 번호</span>
                    <span className="text-sm font-medium text-gray-900">
                      {order.tax_phone || "-"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 송장번호 입력 */}
          {order.delivery_type === "delivery" &&
            order.status !== "completed" &&
            order.status !== "canceled" && (
              <div className="mb-6 p-4 bg-cyan-50 rounded-xl">
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  송장번호 입력
                </label>
                <div className="flex gap-2">
                  <select
                    value={trackingCompany}
                    onChange={(e) => setTrackingCompany(e.target.value)}
                    className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none"
                  >
                    {TRACKING_COMPANIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="송장번호 입력"
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#222828]/20"
                  />
                  <button
                    onClick={handleStartShipping}
                    disabled={isSaving}
                    className="px-4 py-2.5 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:bg-gray-300"
                  >
                    배송시작
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  송장번호 입력 시 자동으로 "배송중" 상태로 변경됩니다
                </p>
              </div>
            )}

          {/* 배송 추적 (배송중/완료일 때) */}
          {order.tracking_number && (
            <div className="mb-6 p-4 bg-cyan-50 rounded-xl">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                배송 추적
              </h4>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">
                  {TRACKING_COMPANIES.find(
                    (c) => c.value === order.tracking_company
                  )?.label || order.tracking_company}{" "}
                  - {order.tracking_number}
                </span>
                <a
                  href={getTrackingUrl(
                    order.tracking_company,
                    order.tracking_number
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-cyan-600 hover:underline"
                >
                  배송 조회
                </a>
              </div>
            </div>
          )}

          {/* 주문 내역 */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              주문 내역
            </h4>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="text-center mb-4">
                <span className="text-xs text-gray-400 uppercase tracking-wider">
                  ORDER SUMMARY
                </span>
                <h5 className="text-lg font-semibold text-gray-900 mt-1">
                  {item.productName || "-"}
                </h5>
              </div>
              <div className="space-y-2 text-sm border-t border-gray-100 pt-4">
                {item.spec?.size && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">사이즈</span>
                    <span className="text-gray-900">{item.spec.size}</span>
                  </div>
                )}
                {item.spec?.paper && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">용지</span>
                    <span className="text-gray-900">{item.spec.paper}</span>
                  </div>
                )}
                {item.spec?.color && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">인쇄</span>
                    <span className="text-gray-900">{item.spec.color}</span>
                  </div>
                )}
                {item.spec?.quantity && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">수량</span>
                    <span className="text-gray-900">
                      {item.spec.quantity}부
                    </span>
                  </div>
                )}
                {item.spec?.pages && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">페이지</span>
                    <span className="text-gray-900">{item.spec.pages}p</span>
                  </div>
                )}
                {item.productionDays && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">출고일</span>
                    <span className="text-gray-900">
                      {calculateReleaseDateFrom(
                        order.created_at,
                        item.productionDays
                      )}
                    </span>
                  </div>
                )}
              </div>
              <div className="border-t border-gray-200 mt-4 pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">배송방법</span>
                  <span className="text-gray-900">
                    {getDeliveryTypeLabel(order.delivery_type)}
                  </span>
                </div>
              </div>
              <div className="border-t border-gray-200 mt-4 pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">상품 금액</span>
                  <span className="text-gray-900">
                    {formatPrice(order.product_amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">부가세</span>
                  <span className="text-gray-900">
                    {formatPrice(Math.round(order.product_amount * 0.1))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">배송비</span>
                  <span className="text-gray-900">
                    {order.shipping_cost === 0
                      ? "무료"
                      : formatPrice(order.shipping_cost)}
                  </span>
                </div>
                {order.quick_cost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">퀵 비용</span>
                    <span className="text-gray-900">
                      {formatPrice(order.quick_cost)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-gray-100">
                  <span className="font-semibold text-gray-900">
                    총 결제금액
                  </span>
                  <span className="font-bold text-xl text-gray-900">
                    {formatPrice(order.total_amount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 결제 정보 */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              결제 정보
            </h4>
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">결제 방법</span>
                <span className="text-sm font-medium text-gray-900">
                  {getPaymentMethodLabel(order.payment_method)}
                </span>
              </div>
              {order.payment_method === "bank_transfer" && (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">입금 계좌</span>
                    <span className="text-sm font-medium text-gray-900">
                      {bankInfo.bankName} {bankInfo.bankAccount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">예금주</span>
                    <span className="text-sm font-medium text-gray-900">
                      {bankInfo.bankHolder}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 관리자 메모 */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              관리자 메모
            </h4>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows="3"
              placeholder="내부 메모를 입력하세요 (고객에게 표시되지 않음)"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#222828]/20 resize-none"
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={handleSaveNotes}
                disabled={isSaving}
                className="px-4 py-2 text-sm text-[#222828] hover:bg-[#222828]/5 rounded-lg"
              >
                메모 저장
              </button>
            </div>
          </div>

          {/* 주문 삭제 */}
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={handleDelete}
              disabled={isSaving}
              className="w-full px-4 py-3 text-red-600 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-50 disabled:opacity-50"
            >
              주문 삭제
            </button>
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
