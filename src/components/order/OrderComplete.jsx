import { useEffect, useState } from 'react';

import { getBankInfo, getEmail,getPhone } from '@/lib/siteConfigService';

export default function OrderComplete() {
  const [orderData, setOrderData] = useState(null);
  const [orderNumber, setOrderNumber] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setOrderNumber(params.get('orderNumber') || '');

    const saved = sessionStorage.getItem('orderComplete');
    if (saved) {
      try { setOrderData(JSON.parse(saved)); }
      catch (e) { console.error('주문 데이터 파싱 실패:', e); }
    }
  }, []);

  const bankInfo = getBankInfo();
  const formatPrice = (price) => `\u20A9${(price || 0).toLocaleString()}`;

  const getPaymentMethodLabel = (method) => {
    const labels = { bank_transfer: '무통장입금', card: '신용카드', toss: '토스페이', kakao: '카카오페이' };
    return labels[method] || method;
  };

  const getDeliveryTypeLabel = (type) => {
    const labels = { delivery: '택배 배송', quick: '퀵 배송', pickup: '방문 수령' };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen bg-[#f5f7f7]">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <a href="/" className="text-lg font-semibold text-gray-900">Sungjin Print</a>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">주문이 완료되었습니다</h1>
          <p className="text-gray-600">주문해 주셔서 감사합니다.</p>
        </div>

        {orderData?.email && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-center">
            <p className="text-sm text-blue-800">주문 내역을 <strong>{orderData.email}</strong>로 보내드렸습니다.</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          <h2 className="text-base font-semibold text-gray-900 mb-4">주문 정보</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">주문번호</span>
              <span className="font-mono font-semibold text-gray-900">{orderNumber || orderData?.orderNumber || '-'}</span>
            </div>
            {orderData?.totalAmount && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500">결제금액</span>
                <span className="font-semibold text-[#222828]">{formatPrice(orderData.totalAmount)}</span>
              </div>
            )}
            {orderData?.paymentMethod && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500">결제방법</span>
                <span className="text-gray-900">{getPaymentMethodLabel(orderData.paymentMethod)}</span>
              </div>
            )}
            {orderData?.deliveryType && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500">수령방법</span>
                <span className="text-gray-900">{getDeliveryTypeLabel(orderData.deliveryType)}</span>
              </div>
            )}
            {orderData?.releaseDate && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500">출고일</span>
                <span className="font-semibold text-gray-900">{orderData.releaseDate}</span>
              </div>
            )}
          </div>
        </div>

        {orderData?.product && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
            <h2 className="text-base font-semibold text-gray-900 mb-4">주문 상품</h2>
            <div className="flex justify-between items-start pb-4 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">{orderData.product.name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {orderData.product.spec?.size} · {orderData.product.spec?.quantity}부
                  {orderData.product.spec?.pages && ` · ${orderData.product.spec.pages}p`}
                </p>
              </div>
              <span className="font-semibold text-gray-900">{formatPrice(orderData.product.price)}</span>
            </div>
            <div className="pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">상품금액</span>
                <span>{formatPrice(orderData.productAmount || orderData.product.price)}</span>
              </div>
              {orderData.shippingCost > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">배송비</span>
                  <span>{formatPrice(orderData.shippingCost)}</span>
                </div>
              )}
              {orderData.shippingCost === 0 && orderData.deliveryType === 'delivery' && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">배송비</span>
                  <span className="text-green-600">무료</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="font-semibold">총 결제금액</span>
                <span className="font-semibold text-[#222828]">{formatPrice(orderData.totalAmount)}</span>
              </div>
            </div>
          </div>
        )}

        {orderData?.paymentMethod === 'bank_transfer' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-4">
            <h2 className="text-base font-semibold text-amber-900 mb-4">입금 안내</h2>
            <p className="text-sm text-amber-800 mb-4">아래 계좌로 입금해주시면 제작이 시작됩니다.</p>
            <div className="bg-white rounded-xl p-4 space-y-2">
              <div className="flex justify-between"><span className="text-gray-500">은행</span><span className="font-medium">{bankInfo.bankName}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">계좌번호</span><span className="font-mono font-medium">{bankInfo.bankAccount}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">예금주</span><span className="font-medium">{bankInfo.bankHolder}</span></div>
              <div className="flex justify-between pt-2 border-t border-gray-100">
                <span className="text-gray-500">입금금액</span>
                <span className="font-semibold text-amber-700">{formatPrice(orderData.totalAmount)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-3">문의</h2>
          <p className="text-sm text-gray-600">문의사항은 아래로 연락주세요.</p>
          <div className="mt-3 space-y-1">
            <p className="text-sm"><span className="text-gray-500">전화:</span> <a href={`tel:${getPhone()}`} className="text-[#222828] font-medium">{getPhone()}</a></p>
            <p className="text-sm"><span className="text-gray-500">이메일:</span> <a href={`mailto:${getEmail()}`} className="text-[#222828] font-medium">{getEmail()}</a></p>
          </div>
        </div>

        <a href="/" className="block w-full py-3.5 bg-gray-900 text-white text-center text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors">
          홈으로 돌아가기
        </a>
      </main>
    </div>
  );
}
