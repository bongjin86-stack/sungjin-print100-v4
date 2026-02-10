-- Prints 테이블 (Works 복사본 + 상품 연결 + 커스텀 필드라벨)
-- 2024 로컬 테스트용

-- 1. 카테고리 테이블 (work_categories와 동일한 TEXT id)
CREATE TABLE IF NOT EXISTS print_categories (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. prints 테이블
CREATE TABLE IF NOT EXISTS prints (
  id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT DEFAULT '',
  description TEXT DEFAULT '',
  client TEXT DEFAULT '',
  category_id TEXT REFERENCES print_categories(id),
  year TEXT DEFAULT '',
  tag TEXT DEFAULT '',
  content TEXT DEFAULT '',
  image TEXT DEFAULT '',
  overview TEXT DEFAULT '',
  support JSONB DEFAULT '[]',
  achievements JSONB DEFAULT '[]',
  testimonial JSONB,
  is_published BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  -- Prints 전용 필드
  linked_product_id TEXT,
  order_button_text TEXT DEFAULT '주문하기',
  field_labels JSONB DEFAULT '{"meta1_label":"분류","meta2_label":"카테고리","meta3_label":"연도","overview_label":"개요","support_label":"주요 내용","achievements_label":"상세 정보"}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. work_categories → print_categories 데이터 복사
INSERT INTO print_categories (id, title, sort_order, created_at)
SELECT id, title, sort_order, created_at
FROM work_categories
ON CONFLICT (id) DO NOTHING;

-- 4. works → prints 데이터 복사
INSERT INTO prints (id, title, subtitle, description, client, category_id, year, tag, content, image, overview, support, achievements, is_published, sort_order, created_at, updated_at)
SELECT id, title, subtitle, description, client, category_id, year, tag, content, image, overview, support, achievements, is_published, sort_order, created_at, updated_at
FROM works
ON CONFLICT (id) DO NOTHING;
