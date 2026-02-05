-- Products 테이블 생성
-- 빌더에서 만든 상품 데이터를 Supabase에 저장

CREATE TABLE public.products (
  id text NOT NULL,
  name text NOT NULL,
  slug text NULL,
  description text NULL,
  main_image text NULL,
  icon text NULL DEFAULT '📄',
  sort_order integer NOT NULL DEFAULT 0,
  content jsonb NULL DEFAULT '{}'::jsonb,
  blocks jsonb NULL DEFAULT '[]'::jsonb,
  product_type text NULL,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT products_pkey PRIMARY KEY (id)
);

-- RLS 활성화
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기 가능 (고객 페이지용)
CREATE POLICY "products_select_all" ON public.products
  FOR SELECT USING (true);

-- 누구나 쓰기 가능 (관리자 인증 없이 운영 중이므로)
CREATE POLICY "products_insert_all" ON public.products
  FOR INSERT WITH CHECK (true);

CREATE POLICY "products_update_all" ON public.products
  FOR UPDATE USING (true);

CREATE POLICY "products_delete_all" ON public.products
  FOR DELETE USING (true);
