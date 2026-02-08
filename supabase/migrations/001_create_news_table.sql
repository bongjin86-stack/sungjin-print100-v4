-- News 테이블 생성
CREATE TABLE IF NOT EXISTS news (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'notice',
  pub_date DATE DEFAULT CURRENT_DATE,
  content TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_news_pub_date ON news(pub_date DESC);
CREATE INDEX IF NOT EXISTS idx_news_category ON news(category);

-- RLS (Row Level Security) 활성화
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 정책 (누구나 읽을 수 있음)
CREATE POLICY "Allow public read access" ON news
  FOR SELECT USING (true);

-- 인증된 사용자만 쓰기 가능 (나중에 Admin 인증 추가 시)
CREATE POLICY "Allow authenticated write access" ON news
  FOR ALL USING (true);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_news_updated_at
  BEFORE UPDATE ON news
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
