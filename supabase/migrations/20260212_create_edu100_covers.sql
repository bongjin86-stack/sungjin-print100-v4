-- edu100 표지 갤러리 테이블
CREATE TABLE edu100_covers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  image TEXT,
  thumbnails JSONB DEFAULT '[]'::jsonb,
  tag TEXT,
  linked_product_id TEXT,
  is_published BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE edu100_covers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "edu100_covers_read" ON edu100_covers
  FOR SELECT USING (true);

CREATE POLICY "edu100_covers_write" ON edu100_covers
  FOR ALL USING (true) WITH CHECK (true);
