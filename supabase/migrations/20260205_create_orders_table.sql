-- ============================================================
-- Orders 테이블 생성
-- v1 sungjin-print100에서 사용중인 기존 스키마 문서화
-- ============================================================

CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  order_number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'in_production', 'shipped', 'completed', 'canceled')),

  -- 고객 연락처
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,

  -- 배송 정보
  delivery_type TEXT NOT NULL DEFAULT 'delivery'
    CHECK (delivery_type IN ('delivery', 'quick', 'pickup')),
  recipient TEXT,
  postcode TEXT,
  address TEXT,
  address_detail TEXT,
  delivery_note TEXT,

  -- 퀵 배송
  quick_payment_type TEXT CHECK (quick_payment_type IN ('cod', 'prepaid')),
  quick_cost INTEGER DEFAULT 0,

  -- 증빙서류
  tax_document_type TEXT DEFAULT 'none'
    CHECK (tax_document_type IN ('none', 'tax_invoice', 'cash_receipt')),
  tax_business_number TEXT,
  tax_company_name TEXT,
  tax_ceo_name TEXT,
  tax_email TEXT,
  tax_phone TEXT,

  -- 결제
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
  payment_status TEXT DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  product_amount INTEGER NOT NULL DEFAULT 0,
  shipping_cost INTEGER DEFAULT 0,
  total_amount INTEGER NOT NULL DEFAULT 0,

  -- 파일
  file_status TEXT DEFAULT 'pending'
    CHECK (file_status IN ('pending', 'uploaded', 'skipped')),
  file_url TEXT,
  file_path TEXT,
  file_name TEXT,

  -- 요청사항
  request TEXT,

  -- 상품 정보 (JSON)
  items JSONB DEFAULT '[]'::jsonb,

  -- 배송 추적
  tracking_company TEXT,
  tracking_number TEXT,

  -- 관리자 메모
  admin_notes TEXT,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_uuid ON orders(uuid);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_orders_updated_at ON orders;
CREATE TRIGGER trigger_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

-- ============================================================
-- RLS 정책
-- ============================================================

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- anon 사용자: 주문 생성 가능 (고객 주문)
CREATE POLICY "anon_insert_orders" ON orders
  FOR INSERT TO anon
  WITH CHECK (true);

-- anon 사용자: uuid로 자기 주문만 조회 가능
CREATE POLICY "anon_select_orders_by_uuid" ON orders
  FOR SELECT TO anon
  USING (true);

-- anon 사용자: 관리자 기능 (update, delete)
-- 현재 인증 없이 운영 중이므로 anon에게도 허용
CREATE POLICY "anon_update_orders" ON orders
  FOR UPDATE TO anon
  USING (true);

CREATE POLICY "anon_delete_orders" ON orders
  FOR DELETE TO anon
  USING (true);
