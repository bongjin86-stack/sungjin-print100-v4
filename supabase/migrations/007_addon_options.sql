-- 추가 옵션 중앙 라이브러리 테이블
CREATE TABLE IF NOT EXISTS addon_options (
  id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT DEFAULT '',
  price INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- products 테이블에 addon_options JSONB 컬럼 추가
-- 형식: [{ "option_id": "abc", "label": "표지 편집", "description": "...", "price": 5000, "enabled": true }]
ALTER TABLE products ADD COLUMN IF NOT EXISTS addon_options JSONB DEFAULT '[]';
