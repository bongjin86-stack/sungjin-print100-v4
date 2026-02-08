/**
 * 주문 서비스
 * Supabase 연동 주문 관리
 */

import { supabase } from "./supabase";

// 타입 정의
export interface OrderItem {
  productName: string;
  spec?: {
    size?: string;
    quantity?: number;
    pages?: number;
  };
  price?: number;
  unitPrice?: number;
}

export interface OrderData {
  email: string;
  phone: string;
  deliveryType: string;
  recipient?: string;
  postcode?: string;
  address?: string;
  addressDetail?: string;
  deliveryNote?: string;
  quickPaymentType?: string;
  quickCost?: number;
  taxDocumentType?: string;
  taxBusinessNumber?: string;
  taxCompanyName?: string;
  taxCeoName?: string;
  taxEmail?: string;
  taxPhone?: string;
  paymentMethod: string;
  productAmount: number;
  shippingCost?: number;
  totalAmount: number;
  file?: {
    url?: string;
    path?: string;
    fileName?: string;
  };
  fileSkipped?: boolean;
  request?: string;
  items: OrderItem[];
}

export interface Order {
  id: number;
  order_number: string;
  uuid: string;
  status: OrderStatus;
  customer_email: string;
  customer_phone: string;
  delivery_type: string;
  recipient: string | null;
  postcode: string | null;
  address: string | null;
  address_detail: string | null;
  delivery_note: string | null;
  quick_payment_type: string | null;
  quick_cost: number;
  tax_document_type: string;
  tax_business_number: string | null;
  tax_company_name: string | null;
  tax_ceo_name: string | null;
  tax_email: string | null;
  tax_phone: string | null;
  payment_method: string;
  payment_status: string;
  product_amount: number;
  shipping_cost: number;
  total_amount: number;
  file_status: string;
  file_url: string | null;
  file_path: string | null;
  file_name: string | null;
  request: string | null;
  items: OrderItem[];
  tracking_company: string | null;
  tracking_number: string | null;
  created_at: string;
  updated_at: string;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "in_production"
  | "shipped"
  | "completed"
  | "canceled";

export interface OrdersResult {
  orders: Order[];
  total: number;
  statusCounts: StatusCounts;
}

export interface StatusCounts {
  all: number;
  pending: number;
  confirmed: number;
  in_production: number;
  shipped: number;
  completed: number;
  canceled: number;
}

export interface GetOrdersOptions {
  status?: string | null;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: "asc" | "desc";
}

export interface TrackingCompany {
  value: string;
  label: string;
  url: string;
}

// 주문번호 생성 (SJP-YYYYMMDD-XXXX 형식)
function generateOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = String(Math.floor(Math.random() * 9999) + 1).padStart(4, "0");
  return `SJP-${year}${month}${day}-${random}`;
}

// 상태 라벨 맵
export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "입금대기",
  confirmed: "입금확인",
  in_production: "제작중",
  shipped: "배송중",
  completed: "완료",
  canceled: "취소",
};

// 상태 색상 맵
export const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-orange-100 text-orange-700",
  confirmed: "bg-blue-100 text-blue-700",
  in_production: "bg-purple-100 text-purple-700",
  shipped: "bg-cyan-100 text-cyan-700",
  completed: "bg-green-100 text-green-700",
  canceled: "bg-gray-100 text-gray-500",
};

// 택배사 목록
export const TRACKING_COMPANIES: TrackingCompany[] = [
  {
    value: "cj",
    label: "CJ대한통운",
    url: "https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=",
  },
  {
    value: "hanjin",
    label: "한진택배",
    url: "https://www.hanjin.co.kr/kor/CMS/DeliveryMgr/WaybillResult.do?mession=&wblnumText2=",
  },
  {
    value: "lotte",
    label: "롯데택배",
    url: "https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo=",
  },
  {
    value: "epost",
    label: "우체국택배",
    url: "https://service.epost.go.kr/trace.RetrieveDomRi498.postal?sid1=",
  },
];

/**
 * 주문 생성
 */
export async function createOrder(
  orderData: OrderData
): Promise<{ orderNumber: string; uuid: string }> {
  const orderNumber = generateOrderNumber();

  const dbOrder = {
    order_number: orderNumber,
    status:
      orderData.paymentMethod === "bank_transfer" ? "pending" : "confirmed",

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

    tax_document_type: orderData.taxDocumentType || "none",
    tax_business_number: orderData.taxBusinessNumber || null,
    tax_company_name: orderData.taxCompanyName || null,
    tax_ceo_name: orderData.taxCeoName || null,
    tax_email: orderData.taxEmail || null,
    tax_phone: orderData.taxPhone || null,

    payment_method: orderData.paymentMethod,
    payment_status:
      orderData.paymentMethod === "bank_transfer" ? "pending" : "paid",
    product_amount: orderData.productAmount,
    shipping_cost: orderData.shippingCost || 0,
    total_amount: orderData.totalAmount,

    file_status: orderData.file
      ? "uploaded"
      : orderData.fileSkipped
        ? "skipped"
        : "pending",
    file_url: orderData.file?.url || null,
    file_path: orderData.file?.path || null,
    file_name: orderData.file?.fileName || null,

    request: orderData.request || null,

    items: orderData.items,
  };

  const { data, error } = await supabase
    .from("orders")
    .insert(dbOrder)
    .select("order_number, uuid")
    .single();

  if (error) {
    console.error("주문 생성 실패:", error);
    throw new Error("주문 생성에 실패했습니다.");
  }

  return {
    orderNumber: data.order_number,
    uuid: data.uuid,
  };
}

/**
 * 주문 목록 조회 (관리자용)
 */
export async function getOrders(
  options: GetOrdersOptions = {}
): Promise<OrdersResult> {
  const {
    status = null,
    search = "",
    page = 1,
    limit = 20,
    sortBy = "created_at",
    order = "desc",
  } = options;

  let query = supabase.from("orders").select("*", { count: "exact" });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (search) {
    const sanitized = search.replace(/[,.()"'\\]/g, "");
    query = query.or(
      `order_number.ilike.%${sanitized}%,recipient.ilike.%${sanitized}%,customer_phone.ilike.%${sanitized}%`
    );
  }

  query = query.order(sortBy, { ascending: order === "asc" });

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("주문 목록 조회 실패:", error);
    throw new Error("주문 목록을 불러오는데 실패했습니다.");
  }

  const statusCounts = await getOrderStatusCounts();

  return {
    orders: (data as Order[]) || [],
    total: count || 0,
    statusCounts,
  };
}

async function getOrderStatusCounts(): Promise<StatusCounts> {
  const statuses: OrderStatus[] = [
    "pending",
    "confirmed",
    "in_production",
    "shipped",
    "completed",
    "canceled",
  ];
  const counts: StatusCounts = {
    all: 0,
    pending: 0,
    confirmed: 0,
    in_production: 0,
    shipped: 0,
    completed: 0,
    canceled: 0,
  };

  const results = await Promise.all(
    statuses.map((status) =>
      supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("status", status)
    )
  );

  statuses.forEach((status, i) => {
    const c = results[i].count || 0;
    counts[status] = c;
    counts.all += c;
  });

  return counts;
}

export async function getOrderById(id: number): Promise<Order> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("주문 조회 실패:", error);
    throw new Error("주문을 찾을 수 없습니다.");
  }

  return data as Order;
}

export interface OrderByUuidResult {
  order_number: string;
  status: OrderStatus;
  items: OrderItem[];
  tracking_company: string | null;
  tracking_number: string | null;
  created_at: string;
  delivery_type: string;
}

export async function getOrderByUuid(uuid: string): Promise<OrderByUuidResult> {
  const { data, error } = await supabase
    .from("orders")
    .select(
      "order_number, status, items, tracking_company, tracking_number, created_at, delivery_type"
    )
    .eq("uuid", uuid)
    .single();

  if (error) {
    console.error("주문 조회 실패:", error);
    throw new Error("주문을 찾을 수 없습니다.");
  }

  return data as OrderByUuidResult;
}

export async function updateOrder(
  id: number,
  updates: Partial<Order>
): Promise<Order> {
  const { data, error } = await supabase
    .from("orders")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("주문 수정 실패:", error);
    throw new Error("주문 수정에 실패했습니다.");
  }

  return data as Order;
}

export async function updateOrderStatus(
  id: number,
  status: OrderStatus
): Promise<Order> {
  return updateOrder(id, { status });
}

export async function startShipping(
  id: number,
  trackingCompany: string,
  trackingNumber: string
): Promise<Order> {
  return updateOrder(id, {
    status: "shipped",
    tracking_company: trackingCompany,
    tracking_number: trackingNumber,
  });
}

export async function deleteOrder(id: number): Promise<boolean> {
  const { error } = await supabase.from("orders").delete().eq("id", id);

  if (error) {
    console.error("주문 삭제 실패:", error);
    throw new Error("주문 삭제에 실패했습니다.");
  }

  return true;
}

export function getTrackingUrl(
  company: string,
  trackingNumber: string
): string | null {
  const carrier = TRACKING_COMPANIES.find((c) => c.value === company);
  if (!carrier) return null;
  return carrier.url + trackingNumber;
}
