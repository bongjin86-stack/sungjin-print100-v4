-- EDU+100 수동 실적 테이블
-- Supabase SQL Editor에서 실행

CREATE TABLE manual_orders (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  work_date DATE NOT NULL,
  book_count INT NOT NULL DEFAULT 0,
  memo TEXT,
  image TEXT,
  is_published BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0
);

ALTER TABLE manual_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON manual_orders FOR SELECT USING (true);
CREATE POLICY "Auth write" ON manual_orders FOR ALL USING (auth.role() = 'authenticated');
