/**
 * 이메일 서비스
 * 현재는 콘솔 로그만 출력 (서버 측 구현 필요)
 */

import { getBankInfo,getConfig } from './siteConfigService';

function getFromEmail() {
  return getConfig('from_email') || 'onboarding@resend.dev';
}

function formatPrice(price) {
  return `${(price || 0).toLocaleString()}원`;
}

function getPaymentMethodLabel(method) {
  const labels = {
    bank_transfer: '무통장입금',
    card: '신용카드',
    toss: '토스페이',
    kakao: '카카오페이',
  };
  return labels[method] || method;
}

async function sendEmail(emailData) {
  const apiKey = getConfig('resend_api_key');

  if (!apiKey) {
    console.log('[Email Service] API 키 미설정 - 이메일 발송 건너뜀');
    console.log('[Email Data]', emailData);
    return false;
  }

  console.log('[Email Service] 이메일 발송 요청');
  console.log('[To]', emailData.to);
  console.log('[Subject]', emailData.subject);
  console.log('[Note] 실제 발송은 서버 측 구현 필요 (Supabase Edge Function 권장)');

  return true;
}

export async function sendOrderConfirmationEmail(order) {
  const {
    customer_email, order_number, uuid, total_amount,
    product_amount, shipping_cost, payment_method, items,
    recipient, address, address_detail, delivery_type,
  } = order;

  const bankInfo = getBankInfo();
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://sungjin-print100-nagi.vercel.app';
  const orderUrl = `${baseUrl}/order/${uuid}`;

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
        <strong>${item.productName}</strong><br>
        <span style="color: #6b7280; font-size: 13px;">
          ${item.spec?.size || ''} · ${item.spec?.quantity || 0}부
          ${item.spec?.pages ? ` · ${item.spec.pages}p` : ''}
        </span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">
        ${formatPrice(item.price || item.unitPrice)}
      </td>
    </tr>
  `).join('');

  const deliveryInfo = delivery_type === 'pickup'
    ? '방문 수령'
    : delivery_type === 'quick'
    ? '퀵 배송'
    : `${recipient}<br>${address} ${address_detail || ''}`;

  const emailData = {
    from: getFromEmail(),
    to: customer_email,
    subject: `[성진프린트] 주문이 완료되었습니다 (${order_number})`,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
<div style="text-align:center;margin-bottom:32px;">
<h1 style="margin:0;font-size:24px;color:#111827;">주문이 완료되었습니다</h1>
<p style="margin:8px 0 0;color:#6b7280;">주문해 주셔서 감사합니다.</p></div>
<div style="background:white;border-radius:12px;padding:24px;margin-bottom:16px;">
<h2 style="margin:0 0 16px;font-size:16px;">주문 정보</h2>
<table style="width:100%;font-size:14px;">
<tr><td style="padding:8px 0;color:#6b7280;">주문번호</td><td style="text-align:right;font-weight:600;">${order_number}</td></tr>
<tr><td style="padding:8px 0;color:#6b7280;">결제방법</td><td style="text-align:right;">${getPaymentMethodLabel(payment_method)}</td></tr>
<tr><td style="padding:8px 0;color:#6b7280;">배송지</td><td style="text-align:right;">${deliveryInfo}</td></tr>
</table></div>
<div style="background:white;border-radius:12px;padding:24px;margin-bottom:16px;">
<h2 style="margin:0 0 16px;font-size:16px;">주문 상품</h2>
<table style="width:100%;font-size:14px;">${itemsHtml}
<tr><td style="padding:12px 0;color:#6b7280;">상품금액</td><td style="text-align:right;">${formatPrice(product_amount)}</td></tr>
<tr><td style="padding:8px 0;color:#6b7280;">배송비</td><td style="text-align:right;">${shipping_cost > 0 ? formatPrice(shipping_cost) : '무료'}</td></tr>
<tr style="border-top:2px solid #111827;"><td style="padding:16px 0;font-weight:600;font-size:16px;">총 결제금액</td>
<td style="text-align:right;font-weight:600;font-size:18px;color:#3455DB;">${formatPrice(total_amount)}</td></tr>
</table></div>
${payment_method === 'bank_transfer' ? `<div style="background:#fef3c7;border-radius:12px;padding:24px;margin-bottom:16px;">
<h2 style="margin:0 0 16px;font-size:16px;color:#92400e;">입금 안내</h2>
<p style="font-size:14px;color:#78350f;">아래 계좌로 입금해주시면 제작이 시작됩니다.</p>
<table style="width:100%;font-size:14px;">
<tr><td style="color:#92400e;">은행</td><td style="text-align:right;font-weight:600;">${bankInfo.bankName}</td></tr>
<tr><td style="color:#92400e;">계좌번호</td><td style="text-align:right;font-weight:600;">${bankInfo.bankAccount}</td></tr>
<tr><td style="color:#92400e;">예금주</td><td style="text-align:right;font-weight:600;">${bankInfo.bankHolder}</td></tr>
</table></div>` : ''}
<div style="text-align:center;margin-bottom:32px;">
<a href="${orderUrl}" style="display:inline-block;padding:14px 32px;background:#3455DB;color:white;text-decoration:none;border-radius:8px;font-weight:600;">주문 상태 확인하기</a></div>
<div style="text-align:center;color:#9ca3af;font-size:12px;">
<p style="margin:0;">문의: ${getConfig('phone')} | ${getConfig('email')}</p>
<p style="margin:8px 0 0;">${getConfig('company_name')}</p></div>
</div></body></html>`,
  };

  return sendEmail(emailData);
}

export async function sendShippingNotificationEmail(order, trackingUrl) {
  const { customer_email, order_number, uuid, tracking_company, tracking_number } = order;
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://sungjin-print100-nagi.vercel.app';
  const orderUrl = `${baseUrl}/order/${uuid}`;

  const carrierLabels = { cj: 'CJ대한통운', hanjin: '한진택배', lotte: '롯데택배', epost: '우체국택배' };

  const emailData = {
    from: getFromEmail(),
    to: customer_email,
    subject: `[성진프린트] 상품이 발송되었습니다 (${order_number})`,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
<div style="text-align:center;margin-bottom:32px;">
<h1 style="margin:0;font-size:24px;color:#111827;">상품이 발송되었습니다</h1>
<p style="margin:8px 0 0;color:#6b7280;">주문번호: ${order_number}</p></div>
<div style="background:white;border-radius:12px;padding:24px;margin-bottom:16px;">
<h2 style="margin:0 0 16px;font-size:16px;">배송 정보</h2>
<table style="width:100%;font-size:14px;">
<tr><td style="color:#6b7280;">택배사</td><td style="text-align:right;font-weight:600;">${carrierLabels[tracking_company] || tracking_company}</td></tr>
<tr><td style="color:#6b7280;">송장번호</td><td style="text-align:right;font-weight:600;font-family:monospace;">${tracking_number}</td></tr>
</table></div>
<div style="text-align:center;margin-bottom:16px;">
<a href="${trackingUrl}" style="display:inline-block;padding:14px 32px;background:#3455DB;color:white;text-decoration:none;border-radius:8px;font-weight:600;">배송 조회하기</a></div>
<div style="text-align:center;">
<a href="${orderUrl}" style="color:#6b7280;font-size:14px;text-decoration:underline;">주문 상세 보기</a></div>
</div></body></html>`,
  };

  return sendEmail(emailData);
}
