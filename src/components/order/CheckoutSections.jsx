import { useState } from 'react';
import { getPhone } from '@/lib/siteConfigService';

const validateEmail = (email) => {
  if (!email) return '이메일을 입력해주세요.';
  if (!email.includes('@')) return '올바른 이메일 형식이 아닙니다. (@를 포함해주세요)';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '올바른 이메일 형식이 아닙니다.';
  return '';
};

const validatePhone = (phone) => {
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (!cleaned) return '휴대폰 번호를 입력해주세요.';
  if (!cleaned.startsWith('010')) return '010으로 시작하는 번호만 입력 가능합니다.';
  if (cleaned.length !== 11) return '휴대폰 번호 11자리를 입력해주세요.';
  return '';
};

const formatPhoneNumber = (value) => {
  const cleaned = value.replace(/[^0-9]/g, '');
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 7) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
};

export function ContactSection({ formData, setFormData, errors, setErrors }) {
  const [emailTouched, setEmailTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);

  const handleEmailChange = (e) => {
    const email = e.target.value;
    setFormData({ ...formData, email });
    if (emailTouched && errors?.email) {
      const newError = validateEmail(email);
      if (!newError) setErrors(prev => ({ ...prev, email: '' }));
    }
  };

  const handleEmailBlur = () => {
    if (setErrors && formData.email) {
      setEmailTouched(true);
      setErrors(prev => ({ ...prev, email: validateEmail(formData.email) }));
    }
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData({ ...formData, phone: formatted });
    if (phoneTouched && errors?.phone) {
      const cleaned = formatted.replace(/[^0-9]/g, '');
      if (cleaned.length === 11) {
        const newError = validatePhone(formatted);
        if (!newError) setErrors(prev => ({ ...prev, phone: '' }));
      }
    }
  };

  const handlePhoneBlur = () => {
    if (setErrors && formData.phone) {
      setPhoneTouched(true);
      setErrors(prev => ({ ...prev, phone: validatePhone(formData.phone) }));
    }
  };

  return (
    <section className="mb-10">
      <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-5">연락처</h2>
      <div className="space-y-4">
        <div>
          <input type="email" value={formData.email} onChange={handleEmailChange} onBlur={handleEmailBlur}
            placeholder="이메일"
            className={`w-full px-0 py-3 border-0 border-b transition-colors placeholder-gray-400 text-sm focus:outline-none ${
              errors?.email ? 'border-red-500' : 'border-gray-200 focus:border-gray-900'}`}
            required />
          {errors?.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
        </div>
        <div>
          <input type="tel" value={formData.phone} onChange={handlePhoneChange} onBlur={handlePhoneBlur}
            placeholder="휴대폰 번호 (010-0000-0000)" maxLength={13}
            className={`w-full px-0 py-3 border-0 border-b transition-colors placeholder-gray-400 text-sm focus:outline-none ${
              errors?.phone ? 'border-red-500' : 'border-gray-200 focus:border-gray-900'}`}
            required />
          {errors?.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
          <p className="text-xs text-gray-400 mt-2">주문 안내가 발송됩니다. 정확히 입력해 주세요.</p>
        </div>
      </div>
    </section>
  );
}

export function DeliverySection({ formData, setFormData }) {
  const handleAddressSearch = () => {
    if (!window.daum || !window.daum.Postcode) {
      alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    new window.daum.Postcode({
      oncomplete: function(data) {
        setFormData({ ...formData, postcode: data.zonecode, address: data.address });
      }
    }).open();
  };

  return (
    <section className="mb-10">
      <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-5">수령 방법</h2>
      <div className="flex gap-2 mb-4">
        {['delivery', 'quick', 'pickup'].map((type) => (
          <label key={type} className="flex-1">
            <input type="radio" name="delivery" value={type}
              checked={formData.deliveryType === type}
              onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value })}
              className="sr-only peer" />
            <div className="py-3 px-4 border border-gray-200 rounded text-center text-sm cursor-pointer transition-all peer-checked:border-[#222828] peer-checked:bg-[#222828] peer-checked:text-white hover:border-[#8a9292]">
              {type === 'delivery' ? '택배' : type === 'quick' ? '퀵' : '방문수령'}
            </div>
          </label>
        ))}
      </div>

      {formData.deliveryType === 'delivery' && (
        <div className="space-y-4 pt-2">
          <input type="text" value={formData.recipient}
            onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
            placeholder="받는 분"
            className="w-full px-0 py-3 border-0 border-b border-gray-200 focus:border-gray-900 focus:outline-none transition-colors placeholder-gray-400 text-sm" />
          <div className="flex gap-4 items-center">
            <input type="text" value={formData.postcode} placeholder="우편번호" readOnly
              className="w-28 px-0 py-3 border-0 border-b border-gray-200 bg-transparent cursor-pointer placeholder-gray-400 text-sm"
              onClick={handleAddressSearch} />
            <button type="button" onClick={handleAddressSearch}
              className="text-sm text-gray-600 underline underline-offset-4 hover:text-gray-900">주소 찾기</button>
          </div>
          <input type="text" value={formData.address} placeholder="주소" readOnly
            className="w-full px-0 py-3 border-0 border-b border-gray-200 bg-transparent placeholder-gray-400 text-sm" />
          <input type="text" value={formData.addressDetail}
            onChange={(e) => setFormData({ ...formData, addressDetail: e.target.value })}
            placeholder="상세주소 (동/호수)"
            className="w-full px-0 py-3 border-0 border-b border-gray-200 focus:border-gray-900 focus:outline-none transition-colors placeholder-gray-400 text-sm" />
          <select value={formData.deliveryNote}
            onChange={(e) => setFormData({ ...formData, deliveryNote: e.target.value })}
            className="w-full px-0 py-3 border-0 border-b border-gray-200 bg-transparent text-sm text-gray-400 focus:text-gray-900 focus:outline-none">
            <option value="">배송 메모 (선택)</option>
            <option value="door">문 앞에 놓아주세요</option>
            <option value="security">경비실에 맡겨주세요</option>
            <option value="call">배송 전 연락주세요</option>
          </select>
        </div>
      )}

      {formData.deliveryType === 'quick' && (
        <div className="space-y-4 pt-2">
          <div className="flex gap-2">
            <label className="flex-1">
              <input type="radio" name="quick-payment" value="cod"
                checked={formData.quickPaymentType === 'cod'}
                onChange={(e) => setFormData({ ...formData, quickPaymentType: e.target.value, quickCost: 0 })}
                className="sr-only peer" />
              <div className="py-3 px-4 border border-gray-200 rounded text-center text-sm cursor-pointer transition-all peer-checked:border-gray-900 peer-checked:bg-gray-50 hover:border-gray-300">
                <span className="font-medium">착불</span>
                <p className="text-xs text-gray-400 mt-1">기사님께 직접 결제</p>
              </div>
            </label>
            <label className="flex-1">
              <input type="radio" name="quick-payment" value="prepaid"
                checked={formData.quickPaymentType === 'prepaid'}
                onChange={(e) => setFormData({ ...formData, quickPaymentType: e.target.value })}
                className="sr-only peer" />
              <div className="py-3 px-4 border border-gray-200 rounded text-center text-sm cursor-pointer transition-all peer-checked:border-gray-900 peer-checked:bg-gray-50 hover:border-gray-300">
                <span className="font-medium">선불</span>
                <p className="text-xs text-gray-400 mt-1">상품 금액에 포함</p>
              </div>
            </label>
          </div>
          {formData.quickPaymentType === 'cod' && (
            <div className="p-4 bg-gray-50 rounded-lg text-sm space-y-2">
              <p className="text-gray-700 font-medium">퀵 비용은 도착지에서 기사님께 직접 결제해 주세요.</p>
              <div className="text-gray-500 text-xs space-y-1">
                <p>1박스 기준: 10,000 ~ 20,000원</p>
                <p>2박스 이상 (다마스): 35,000원 ~</p>
              </div>
            </div>
          )}
          {formData.quickPaymentType === 'prepaid' && (
            <div className="p-4 bg-gray-50 rounded-lg text-sm space-y-4">
              <div>
                <p className="text-gray-700 mb-1">퀵 비용은 박스 수량과 거리에 따라 상이합니다.</p>
                <p className="text-gray-500">고객센터 <a href={`tel:${getPhone()}`} className="text-gray-900 font-medium underline underline-offset-2">{getPhone()}</a>로 연락하셔서 확인된 비용을 입력해 주세요.</p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-gray-500 text-sm">퀵 비용</label>
                <div className="relative flex-1 max-w-[160px]">
                  <input type="number" value={formData.quickCost}
                    onChange={(e) => setFormData({ ...formData, quickCost: parseInt(e.target.value) || 0 })}
                    placeholder="0" min="0" step="1000"
                    className="w-full px-3 py-2 border border-gray-200 rounded text-right text-sm focus:border-gray-900 focus:outline-none transition-colors" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">원</span>
                </div>
              </div>
            </div>
          )}
          <input type="text" value={formData.recipient}
            onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
            placeholder="받는 분"
            className="w-full px-0 py-3 border-0 border-b border-gray-200 focus:border-gray-900 focus:outline-none transition-colors placeholder-gray-400 text-sm" />
          <div className="flex gap-4 items-center">
            <input type="text" value={formData.postcode} placeholder="우편번호" readOnly
              className="w-28 px-0 py-3 border-0 border-b border-gray-200 bg-transparent cursor-pointer placeholder-gray-400 text-sm"
              onClick={handleAddressSearch} />
            <button type="button" onClick={handleAddressSearch}
              className="text-sm text-gray-600 underline underline-offset-4 hover:text-gray-900">주소 찾기</button>
          </div>
          <input type="text" value={formData.address} placeholder="주소" readOnly
            className="w-full px-0 py-3 border-0 border-b border-gray-200 bg-transparent placeholder-gray-400 text-sm" />
          <input type="text" value={formData.addressDetail}
            onChange={(e) => setFormData({ ...formData, addressDetail: e.target.value })}
            placeholder="상세주소 (동/호수)"
            className="w-full px-0 py-3 border-0 border-b border-gray-200 focus:border-gray-900 focus:outline-none transition-colors placeholder-gray-400 text-sm" />
        </div>
      )}

      {formData.deliveryType === 'pickup' && (
        <div className="pt-2">
          <div className="mb-4 rounded-lg overflow-hidden border border-gray-100">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d800!2d127.1253362!3d37.4857312!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x357ca57267ee033d%3A0x85ffcc7938686fbb!2z7ISx7KeE7J247IeE7IaM!5e0!3m2!1sko!2skr"
              width="100%" height="250" style={{ border: 0 }} allowFullScreen="" loading="lazy"
              referrerPolicy="no-referrer-when-downgrade" title="성진인쇄 위치" />
          </div>
          <div className="p-4 bg-gray-50 rounded-lg text-sm space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-gray-500 flex-shrink-0">주소</span>
              <span className="text-right">서울 송파구 송파대로20길 22<br/>다인빌딩 1층</span>
            </div>
            <div className="flex justify-between"><span className="text-gray-500">지하철</span><span>문정역 2번 출구 309m</span></div>
            <div className="flex justify-between"><span className="text-gray-500">영업시간</span><span>평일 09:00 - 18:00</span></div>
            <div className="flex justify-between text-xs text-gray-400"><span></span><span>토/일 정기휴무</span></div>
            <div className="flex justify-between">
              <span className="text-gray-500">전화</span>
              <a href={`tel:${getPhone()}`} className="text-gray-900 underline underline-offset-2">{getPhone()}</a>
            </div>
            <div className="pt-2 border-t border-gray-200">
              <a href="https://naver.me/FG7Ybl82" target="_blank" rel="noopener noreferrer"
                className="text-[#222828] text-xs underline underline-offset-2">네이버 지도에서 보기</a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export function TaxDocumentSection({ formData, setFormData }) {
  return (
    <section className="mb-10">
      <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-5">증빙서류</h2>
      <div className="space-y-3">
        {[{ value: 'none', label: '발행 안함' }, { value: 'tax_invoice', label: '세금계산서' }, { value: 'cash_receipt', label: '현금영수증' }].map(opt => (
          <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
            <input type="radio" name="tax-document" value={opt.value}
              checked={formData.taxDocumentType === opt.value}
              onChange={(e) => setFormData({ ...formData, taxDocumentType: e.target.value })} />
            <span className="text-sm">{opt.label}</span>
          </label>
        ))}
      </div>
      {formData.taxDocumentType === 'tax_invoice' && (
        <div className="mt-4 space-y-4">
          {[{ key: 'taxBusinessNumber', ph: '사업자번호' }, { key: 'taxCompanyName', ph: '상호' }, { key: 'taxCeoName', ph: '대표자명' }, { key: 'taxEmail', ph: '이메일' }].map(f => (
            <input key={f.key} type={f.key === 'taxEmail' ? 'email' : 'text'} value={formData[f.key]}
              onChange={(e) => setFormData({ ...formData, [f.key]: e.target.value })}
              placeholder={f.ph}
              className="w-full px-0 py-3 border-0 border-b border-gray-200 focus:border-gray-900 focus:outline-none transition-colors placeholder-gray-400 text-sm" />
          ))}
        </div>
      )}
      {formData.taxDocumentType === 'cash_receipt' && (
        <div className="mt-4">
          <input type="tel" value={formData.taxPhone}
            onChange={(e) => setFormData({ ...formData, taxPhone: e.target.value })}
            placeholder="휴대폰 번호"
            className="w-full px-0 py-3 border-0 border-b border-gray-200 focus:border-gray-900 focus:outline-none transition-colors placeholder-gray-400 text-sm" />
        </div>
      )}
    </section>
  );
}

export function PaymentSection({ formData, setFormData }) {
  return (
    <section className="mb-10">
      <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-5">결제 방법</h2>
      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="radio" name="payment" value="bank_transfer"
            checked={formData.paymentMethod === 'bank_transfer'}
            onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })} />
          <span className="text-sm">무통장입금</span>
        </label>
        {['card', 'toss', 'kakao'].map(m => (
          <label key={m} className="flex items-center gap-3 opacity-50">
            <input type="radio" name="payment" value={m} disabled />
            <span className="text-sm">{m === 'card' ? '신용/체크카드' : m === 'toss' ? '토스페이' : '카카오페이'}</span>
            <span className="text-xs text-gray-400">준비 중</span>
          </label>
        ))}
      </div>
    </section>
  );
}
