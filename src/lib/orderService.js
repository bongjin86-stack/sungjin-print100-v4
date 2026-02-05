/**
 * 주문 서비스
 * Supabase 연동 주문 관리
 */

import { supabase } from './supabase';

// 주문번호 생성 (SJP-YYYYMMDD-XXXX 형식)
function generateOrderNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
  return `SJP-${year}${month}${day}-${random}`;
}

// 상태 라벨 맵
export const STATUS_LABELS = {
  pending: '입금대기',
  confirmed: '입금확인',
  in_production: '제작중',
  shipped: '배송중',
  completed: '완료',
  canceled: '취소',
};

// 상태 색상 맵
export const STATUS_COLORS = {
  pending: 'bg-orange-100 text-orange-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_production: 'bg-purple-100 text-purple-700',
  shipped: 'bg-cyan-100 text-cyan-700',
  completed: 'bg-green-100 text-green-700',
  canceled: 'bg-gray-100 text-gray-500',
};

// 택배사 목록
export const TRACKING_COMPANIES = [
  { value: 'cj', label: 'CJ대한통운', url: 'https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=' },
  { value: 'hanjin', label: '한진택배', url: 'https://www.hanjin.co.kr/kor/CMS/DeliveryMgr/WaybillResult.do?mession=&wblnumText2=' },
  { value: 'lotte', label: '롯데택배', url: 'https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo=' },
  { value: 'epost', label: '우체국택배', url: 'https://service.epost.go.kr/trace.RetrieveDomRi498.postal?sid1=' },
];

/**
 * 주문 생성
 */
export async function createOrder(orderData) {
  const orderNumber = generateOrderNumber();

  const dbOrder = {
    order_number: orderNumber,
    status: orderData.paymentMethod === 'bank_transfer' ? 'pending' : 'confirmed',

    customer_email: orderData.email,
    customer_phone: orderData.phone,

    delivery_type: orderData.deliveryType,
    recipient: orderData.recipient || null,
    postcode: orderData.postcode || null,
    address: orderData.address || null,
    address_detail: orderData.addressDetail || null,
    delivery_note: orderData.deliveryNote || null,

    quick_payment_type: orderData.quickPaymentType || null,
    quick_cost: orderData.quickCost || 0,

    tax_document_type: orderData.taxDocumentType || 'none',
    tax_business_number: orderData.taxBusinessNumber || null,
    tax_company_name: orderData.taxCompanyName || null,
    tax_ceo_name: orderData.taxCeoName || null,
    tax_email: orderData.taxEmail || null,
    tax_phone: orderData.taxPhone || null,

    payment_method: orderData.paymentMethod,
    payment_status: orderData.paymentMethod === 'bank_transfer' ? 'pending' : 'paid',
    product_amount: orderData.productAmount,
    shipping_cost: orderData.shippingCost || 0,
    total_amount: orderData.totalAmount,

    file_status: orderData.file ? 'uploaded' : (orderData.fileSkipped ? 'skipped' : 'pending'),
    file_url: orderData.file?.url || null,
    file_path: orderData.file?.path || null,
    file_name: orderData.file?.fileName || null,

    request: orderData.request || null,

    items: orderData.items,
  };

  const { data, error } = await supabase
    .from('orders')
    .insert(dbOrder)
    .select('order_number, uuid')
    .single();

  if (error) {
    console.error('주문 생성 실패:', error);
    throw new Error('주문 생성에 실패했습니다.');
  }

  return {
    orderNumber: data.order_number,
    uuid: data.uuid,
  };
}

/**
 * 주문 목록 조회 (관리자용)
 */
export async function getOrders(options = {}) {
  const {
    status = null,
    search = '',
    page = 1,
    limit = 20,
    sortBy = 'created_at',
    order = 'desc',
  } = options;

  let query = supabase.from('orders').select('*', { count: 'exact' });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (search) {
    const sanitized = search.replace(/[,.()"'\\]/g, '');
    query = query.or(`order_number.ilike.%${sanitized}%,recipient.ilike.%${sanitized}%,customer_phone.ilike.%${sanitized}%`);
  }

  query = query.order(sortBy, { ascending: order === 'asc' });

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error('주문 목록 조회 실패:', error);
    throw new Error('주문 목록을 불러오는데 실패했습니다.');
  }

  const statusCounts = await getOrderStatusCounts();

  return {
    orders: data || [],
    total: count || 0,
    statusCounts,
  };
}

async function getOrderStatusCounts() {
  const statuses = ['pending', 'confirmed', 'in_production', 'shipped', 'completed', 'canceled'];
  const counts = { all: 0 };

  const results = await Promise.all(
    statuses.map(status =>
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', status)
    )
  );

  statuses.forEach((status, i) => {
    const c = results[i].count || 0;
    counts[status] = c;
    counts.all += c;
  });

  return counts;
}

export async function getOrderById(id) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('주문 조회 실패:', error);
    throw new Error('주문을 찾을 수 없습니다.');
  }

  return data;
}

export async function getOrderByUuid(uuid) {
  const { data, error } = await supabase
    .from('orders')
    .select('order_number, status, items, tracking_company, tracking_number, created_at, delivery_type')
    .eq('uuid', uuid)
    .single();

  if (error) {
    console.error('주문 조회 실패:', error);
    throw new Error('주문을 찾을 수 없습니다.');
  }

  return data;
}

export async function updateOrder(id, updates) {
  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('주문 수정 실패:', error);
    throw new Error('주문 수정에 실패했습니다.');
  }

  return data;
}

export async function updateOrderStatus(id, status) {
  return updateOrder(id, { status });
}

export async function startShipping(id, trackingCompany, trackingNumber) {
  return updateOrder(id, {
    status: 'shipped',
    tracking_company: trackingCompany,
    tracking_number: trackingNumber,
  });
}

export async function deleteOrder(id) {
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('주문 삭제 실패:', error);
    throw new Error('주문 삭제에 실패했습니다.');
  }

  return true;
}

export function getTrackingUrl(company, trackingNumber) {
  const carrier = TRACKING_COMPANIES.find(c => c.value === company);
  if (!carrier) return null;
  return carrier.url + trackingNumber;
}
