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

  // 시간 포맷
  const formatDateTime = (dateStr) => {
    const date = new Date(dateStr);
    return `${formatDate(dateStr)} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
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
          className="text-[#222828] font-medium hover:underline"
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

  // 정보 행 컴포넌트
  const InfoRow = ({ label, value, className = "" }) => (
    <div className="flex justify-between items-start py-1.5">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className={`text-sm text-gray-900 text-right ml-4 ${className}`}>
        {value || "-"}
      </span>
    </div>
  );

  // 카드 컴포넌트
  const Card = ({ title, icon, children, className = "" }) => (
    <div className={`bg-white border border-gray-200 rounded-xl overflow-hidden ${className}`}>
      {title && (
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          {icon && <span className="text-gray-400">{icon}</span>}
          <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
        </div>
      )}
      <div className="px-4 py-3">{children}</div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
        {/* ─── 헤더: 주문번호 + 상태 뱃지 + 날짜 ─── */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900 font-mono">
                  {order.order_number}
                </h3>
                <span
                  className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}
                >
                  {STATUS_LABELS[order.status]}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {formatDateTime(order.created_at)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5"
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

        {/* ─── 바디: 2컬럼 레이아웃 ─── */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* 에러 */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {/* 상태 변경 바 */}
            <div className="mb-6 p-4 bg-gray-50 rounded-xl flex items-center gap-3">
              <label className="text-sm font-medium text-gray-600 shrink-0">
                상태 변경
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#222828]/20"
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
                className="px-4 py-2 bg-[#222828] text-white rounded-lg text-sm font-medium hover:bg-[#222828]/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                변경
              </button>
            </div>

            {/* ─── 2컬럼 그리드 ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* ════ 왼쪽 컬럼 (3/5) ════ */}
              <div className="lg:col-span-3 space-y-5">
                {/* 상품 카드 */}
                <Card title="주문 상품" icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                }>
                  <div className="flex gap-4">
                    {/* 상품 이미지 */}
                    <div className="w-28 h-28 shrink-0 rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.productName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* 상품 정보 */}
                    <div className="flex-1 min-w-0">
                      <h5 className="font-semibold text-gray-900 text-base truncate">
                        {item.productName || "-"}
                      </h5>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                        {item.spec?.size && (
                          <span>{item.spec.size}</span>
                        )}
                        {item.spec?.paper && (
                          <span>{item.spec.paper}</span>
                        )}
                        {item.spec?.color && (
                          <span>{item.spec.color}</span>
                        )}
                        {item.spec?.quantity && (
                          <span className="font-medium text-gray-900">{item.spec.quantity}부</span>
                        )}
                        {item.spec?.pages && (
                          <span>{item.spec.pages}p</span>
                        )}
                      </div>
                      {item.spec?.finishing?.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {item.spec.finishing.map((f, i) => (
                            <span
                              key={i}
                              className="inline-flex px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      )}
                      {item.productionDays && (
                        <p className="mt-1.5 text-xs text-gray-500">
                          출고 예정: {calculateReleaseDateFrom(order.created_at, item.productionDays)}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>

                {/* 커스텀 텍스트 입력 (표지 입력 등) */}
                {item.textInputs?.length > 0 && (
                  <Card title="입력 내용" icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  }>
                    <div className="space-y-3">
                      {item.textInputs.map((ti, i) => (
                        <div key={i}>
                          <p className="text-xs font-medium text-gray-500 mb-1">{ti.label}</p>
                          <p className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                            {ti.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* 시리즈(다권) 주문 요약 */}
                {item.booksSummary?.length > 0 && (
                  <Card title="시리즈 주문" icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  }>
                    <div className="space-y-3">
                      {item.booksSummary.map((book, i) =>
                        book.designFee != null ? (
                          <div key={`df-${i}`} className="flex justify-between items-center pt-2 border-t border-gray-100">
                            <span className="text-xs text-amber-700">디자인 비용 (총 {book.totalQty}부 &lt; {book.freeMinQty}부)</span>
                            <span className="text-sm font-medium text-amber-700">{formatPrice(book.designFee)}</span>
                          </div>
                        ) : (
                          <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-semibold text-gray-700">시리즈 {book.index}</span>
                              <span className="text-xs text-gray-500">
                                {book.pages}p / {book.qty}부 / 권당 {formatPrice(book.perCopy)}
                              </span>
                            </div>
                            {book.fields && Object.keys(book.fields).length > 0 && (
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                                {Object.entries(book.fields).map(([label, value]) => (
                                  <span key={label} className="text-xs text-gray-600">
                                    <span className="text-gray-400">{label}:</span> {value}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="text-right mt-1">
                              <span className="text-sm font-medium text-gray-900">{formatPrice(book.subtotal)}</span>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </Card>
                )}

                {/* 파일 상태 + 요청사항 */}
                <Card title="인쇄 파일" icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">상태:</span>
                      <span className="text-sm font-medium">
                        {getFileStatusDisplay(order.file_status, order.file_url)}
                      </span>
                    </div>
                    {order.file_name && (
                      <span className="text-xs text-gray-400 truncate ml-4 max-w-[200px]">
                        {order.file_name}
                      </span>
                    )}
                  </div>
                  {order.request && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-500 mb-1">요청사항</p>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{order.request}</p>
                    </div>
                  )}
                </Card>

                {/* 배송 추적 / 송장번호 입력 */}
                {order.delivery_type === "delivery" && (
                  <Card title="배송 추적" icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                    </svg>
                  }>
                    {order.tracking_number ? (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">
                          {TRACKING_COMPANIES.find(
                            (c) => c.value === order.tracking_company
                          )?.label || order.tracking_company}{" "}
                          — {order.tracking_number}
                        </span>
                        <a
                          href={getTrackingUrl(
                            order.tracking_company,
                            order.tracking_number
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-cyan-600 hover:underline font-medium"
                        >
                          배송 조회
                        </a>
                      </div>
                    ) : order.status !== "completed" && order.status !== "canceled" ? (
                      <>
                        <div className="flex gap-2">
                          <select
                            value={trackingCompany}
                            onChange={(e) => setTrackingCompany(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none"
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
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#222828]/20"
                          />
                          <button
                            onClick={handleStartShipping}
                            disabled={isSaving}
                            className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:bg-gray-300 transition-colors"
                          >
                            배송시작
                          </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          송장번호 입력 시 자동으로 "배송중" 상태로 변경됩니다
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-400">송장 정보 없음</p>
                    )}
                  </Card>
                )}
              </div>

              {/* ════ 오른쪽 컬럼 (2/5) ════ */}
              <div className="lg:col-span-2 space-y-5">
                {/* 고객 정보 */}
                <Card title="고객 정보" icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }>
                  <InfoRow label="이메일" value={order.customer_email} />
                  <InfoRow label="연락처" value={order.customer_phone} />
                </Card>

                {/* 배송 정보 */}
                <Card title="배송 정보" icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }>
                  <InfoRow
                    label="배송 유형"
                    value={
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        order.delivery_type === "quick"
                          ? "bg-orange-100 text-orange-700"
                          : order.delivery_type === "pickup"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                      }`}>
                        {getDeliveryTypeLabel(order.delivery_type)}
                      </span>
                    }
                  />
                  {order.delivery_type !== "pickup" && (
                    <>
                      <InfoRow label="수령인" value={order.recipient} />
                      <div className="py-1.5">
                        <span className="text-sm text-gray-500 block">주소</span>
                        <p className="text-sm text-gray-900 mt-0.5">
                          {order.address || "-"}
                          {order.address_detail && (
                            <span className="text-gray-500"> {order.address_detail}</span>
                          )}
                        </p>
                      </div>
                      {order.delivery_note && (
                        <InfoRow label="배송 메모" value={order.delivery_note} />
                      )}
                    </>
                  )}
                  {order.delivery_type === "quick" && (
                    <>
                      <InfoRow
                        label="결제 방식"
                        value={order.quick_payment_type === "cod" ? "착불" : "선불"}
                      />
                      {order.quick_payment_type === "prepaid" && order.quick_cost > 0 && (
                        <InfoRow label="퀵 비용" value={formatPrice(order.quick_cost)} />
                      )}
                    </>
                  )}
                </Card>

                {/* 결제 요약 */}
                <Card title="결제 정보" icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                }>
                  <InfoRow label="상품 금액" value={formatPrice(order.product_amount)} />
                  <InfoRow
                    label="부가세"
                    value={formatPrice(Math.round(order.product_amount * 0.1))}
                  />
                  <InfoRow
                    label="배송비"
                    value={order.shipping_cost === 0 ? "무료" : formatPrice(order.shipping_cost)}
                  />
                  {order.quick_cost > 0 && (
                    <InfoRow label="퀵 비용" value={formatPrice(order.quick_cost)} />
                  )}
                  <div className="flex justify-between items-center pt-2 mt-1 border-t border-gray-100">
                    <span className="text-sm font-semibold text-gray-900">총 결제금액</span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatPrice(order.total_amount)}
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <InfoRow
                      label="결제 방법"
                      value={getPaymentMethodLabel(order.payment_method)}
                      className="font-medium"
                    />
                    {order.payment_method === "bank_transfer" && (
                      <>
                        <InfoRow
                          label="입금 계좌"
                          value={`${bankInfo.bankName} ${bankInfo.bankAccount}`}
                        />
                        <InfoRow label="예금주" value={bankInfo.bankHolder} />
                      </>
                    )}
                  </div>
                </Card>

                {/* 증빙서류 */}
                {order.tax_document_type && order.tax_document_type !== "none" && (
                  <Card title="증빙서류" icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                    </svg>
                  }>
                    <InfoRow
                      label="유형"
                      value={getTaxDocumentTypeLabel(order.tax_document_type)}
                    />
                    {order.tax_document_type === "tax_invoice" && (
                      <>
                        <InfoRow label="사업자번호" value={order.tax_business_number} />
                        <InfoRow label="상호" value={order.tax_company_name} />
                        <InfoRow label="대표자명" value={order.tax_ceo_name} />
                        <InfoRow label="이메일" value={order.tax_email} />
                      </>
                    )}
                    {order.tax_document_type === "cash_receipt" && (
                      <InfoRow label="휴대폰" value={order.tax_phone} />
                    )}
                  </Card>
                )}

                {/* 관리자 메모 */}
                <Card title="관리자 메모" icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                }>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows="3"
                    placeholder="내부 메모 (고객에게 표시되지 않음)"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#222828]/20 resize-none"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={handleSaveNotes}
                      disabled={isSaving}
                      className="px-3 py-1.5 text-xs font-medium text-[#222828] hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      메모 저장
                    </button>
                  </div>
                </Card>

                {/* 주문 삭제 */}
                <button
                  onClick={handleDelete}
                  disabled={isSaving}
                  className="w-full px-4 py-2.5 text-red-500 border border-red-200 rounded-xl text-sm hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  주문 삭제
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── 푸터 ─── */}
        <div className="px-6 py-3 border-t border-gray-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
