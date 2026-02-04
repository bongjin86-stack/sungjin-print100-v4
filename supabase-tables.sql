-- Works 테이블 생성
CREATE TABLE IF NOT EXISTS works (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255),
  category VARCHAR(100) NOT NULL DEFAULT 'guide',
  image VARCHAR(500),
  description TEXT,
  content TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- FAQ 테이블 생성
CREATE TABLE IF NOT EXISTS faq (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Services 테이블 생성
CREATE TABLE IF NOT EXISTS services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  title_en VARCHAR(255),
  description TEXT,
  detail_description TEXT,
  image VARCHAR(500),
  tasks JSONB DEFAULT '[]',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Site Settings 테이블 생성 (서비스 소개 텍스트 등)
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  description VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책 설정 (읽기는 모두 허용, 쓰기는 인증된 사용자만)
ALTER TABLE works ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- 읽기 정책 (모두 허용)
CREATE POLICY "Allow public read access on works" ON works FOR SELECT USING (true);
CREATE POLICY "Allow public read access on faq" ON faq FOR SELECT USING (true);
CREATE POLICY "Allow public read access on services" ON services FOR SELECT USING (true);
CREATE POLICY "Allow public read access on site_settings" ON site_settings FOR SELECT USING (true);

-- 쓰기 정책 (모두 허용 - 개발용, 프로덕션에서는 인증 필요)
CREATE POLICY "Allow public write access on works" ON works FOR ALL USING (true);
CREATE POLICY "Allow public write access on faq" ON faq FOR ALL USING (true);
CREATE POLICY "Allow public write access on services" ON services FOR ALL USING (true);
CREATE POLICY "Allow public write access on site_settings" ON site_settings FOR ALL USING (true);

-- 초기 데이터: FAQ
INSERT INTO faq (question, answer, sort_order) VALUES
('최소 주문 수량이 있나요?', '네, 50부 이상부터 주문 가능합니다. 대량 주문 시 단가가 낮아지며, 100부, 500부, 1000부 단위로 추가 할인이 적용됩니다.', 1),
('납기는 얼마나 걸리나요?', '일반적으로 3~5일 정도 소요됩니다. 급한 경우 당일 출고나 익일 배송 서비스도 가능합니다. 수량과 후가공에 따라 달라질 수 있으니 상담 시 확인해 주세요.', 2),
('어떤 파일 형식으로 보내야 하나요?', 'PDF 파일을 권장합니다. AI, PSD, 한글(HWP) 파일도 가능하지만, 폰트 깨짐이나 레이아웃 변경을 방지하기 위해 PDF로 변환 후 보내주시는 것이 좋습니다. 파일 제작 가이드를 참고해 주세요.', 3),
('용지 선택은 어떻게 하나요?', '용도에 따라 추천 용지가 다릅니다. 책자는 모조지나 미색모조지, 카탈로그는 아트지나 스노우지를 많이 사용합니다. 용지 샘플을 무료로 보내드리니 상담 시 요청해 주세요.', 4),
('시안 확인이 가능한가요?', '네, 인쇄 전 PDF 시안을 보내드립니다. 시안 확인 후 승인해 주시면 인쇄를 진행합니다. 수정이 필요한 경우 말씀해 주시면 반영해 드립니다.', 5);

-- 초기 데이터: Services
INSERT INTO services (slug, title, title_en, description, detail_description, image, tasks, sort_order) VALUES
('wireless-binding', '무선제본', 'Perfect Binding', '50부 이상 대량 주문 시 단가가 낮아집니다. 책자, 카탈로그, 보고서에 적합합니다.', '무선제본은 책등에 접착제를 사용하여 내지를 표지에 붙이는 방식입니다. 깔끔하고 전문적인 마감으로 책자, 카탈로그, 보고서, 논문집 등에 널리 사용됩니다. 50부 이상 대량 주문 시 단가가 크게 낮아지며, 최신 장비로 빠르고 정확한 제본을 제공합니다.', '/images/services/wireless-binding.jpg', '["책자/단행본 제본", "카탈로그/브로슈어", "회사 소개서", "연간 보고서", "논문집/학술지", "매뉴얼/가이드북", "포트폴리오 북", "졸업앨범"]', 1),
('saddle-stitch', '중철제본', 'Saddle Stitch', '당일 출고부터 익일 배송까지. 얇은 책자나 팸플릿에 최적화된 제본 방식입니다.', '중철제본은 접힌 종이를 가운데에서 철심으로 고정하는 방식입니다. 페이지 수가 적은 책자, 팸플릿, 리플렛 등에 적합하며, 빠른 제작이 가능합니다. 당일 출고 서비스도 제공하여 급한 일정에도 대응 가능합니다.', '/images/services/saddle-stitch.jpg', '["팸플릿/리플렛", "회사 소개 브로슈어", "행사 프로그램북", "메뉴판", "뉴스레터", "소책자", "안내 책자", "교육 자료"]', 2),
('spring-binding', '스프링제본', 'Wire Binding', '최신 장비와 숙련된 기술진. 180도 펼침이 가능한 실용적인 제본입니다.', '스프링제본(와이어제본)은 금속 또는 플라스틱 스프링으로 제본하는 방식입니다. 180도 완전히 펼쳐지고 360도 접을 수도 있어 노트, 달력, 요리책 등 실용적인 용도에 적합합니다. 다양한 색상의 스프링을 선택할 수 있습니다.', '/images/services/spring-binding.jpg', '["노트/다이어리", "달력/캘린더", "요리책/레시피북", "교재/워크북", "프레젠테이션 자료", "회의 자료", "매뉴얼", "스케치북"]', 3),
('finishing', '후가공', 'Finishing', '전문 상담을 통한 최적의 솔루션. 코팅, 오시, 접지, 박 등 다양한 후가공을 제공합니다.', '인쇄물의 완성도를 높이는 다양한 후가공 서비스를 제공합니다. 무광/유광 코팅, 오시(접는선), 접지, 금박/은박, 형압, 타공 등 용도와 디자인에 맞는 최적의 후가공을 추천해 드립니다. 전문 상담을 통해 예산과 목적에 맞는 솔루션을 제안합니다.', '/images/services/finishing.jpg', '["무광 코팅 (매트)", "유광 코팅 (글로시)", "오시 (접는선)", "접지 (2단, 3단, 대문접기 등)", "금박/은박", "형압 (엠보싱)", "타공", "귀도리 (모서리 라운딩)"]', 4);

-- 초기 데이터: Site Settings
INSERT INTO site_settings (key, value, description) VALUES
('service_intro', 'Sungjinprint는 무선제본, 중철제본, 스프링제본 등 다양한 제본 서비스를 제공합니다. 50부 이상 대량 주문 시 단가가 낮아지며, 최신 장비로 깔끔한 인쇄 품질을 보장합니다. 책자, 카탈로그, 브로슈어, 보고서 등 다양한 인쇄물을 제작해 드립니다. 용지 선택부터 후가공까지 전문 상담을 통해 최적의 솔루션을 제안합니다. 빠른 납기와 합리적인 가격으로 고객 만족을 위해 최선을 다하겠습니다.', '서비스 페이지 상단 소개 텍스트');

-- Works 초기 데이터
INSERT INTO works (title, subtitle, category, image, description, content, sort_order) VALUES
('용지 선택 가이드', '인쇄물에 맞는 용지 선택법', 'guide', '/images/works/paper-guide.jpg', '스노우지, 모조지, 아트지... 어떤 용지가 맞을까요? 용도별 추천 용지를 알려드립니다.', '## 용지 선택의 중요성

인쇄물의 품질과 느낌은 용지 선택에 따라 크게 달라집니다. 책자, 카탈로그, 브로슈어 등 용도에 따라 적합한 용지가 다르며, 두께(평량)도 중요한 선택 요소입니다.

## 주요 용지 종류

### 스노우지
백색도가 높고 표면이 매끄러워 고급스러운 느낌을 줍니다. 카탈로그, 브로슈어, 회사 소개서에 추천합니다.

### 모조지
자연스러운 질감으로 책자, 교재, 논문집에 많이 사용됩니다. 장시간 읽어도 눈이 편합니다.

### 아트지
코팅 처리되어 색상이 선명하게 인쇄됩니다. 사진이 많은 인쇄물에 적합합니다.

### 미색모조지
아이보리 톤으로 눈의 피로를 줄여줍니다. 소설, 에세이 등 텍스트 중심 책자에 추천합니다.', 1),
('후가공 가이드', '인쇄물 완성도를 높이는 방법', 'guide', '/images/works/finishing-guide.jpg', '코팅, 박, 형압 등 다양한 후가공으로 인쇄물의 품질을 한 단계 높여보세요.', '## 후가공이란?

후가공은 인쇄 후 추가 작업을 통해 인쇄물의 완성도와 내구성을 높이는 과정입니다.

## 주요 후가공 종류

### 코팅
- **무광 코팅**: 차분하고 고급스러운 느낌
- **유광 코팅**: 선명하고 생동감 있는 느낌

### 박 가공
- **금박**: 고급스럽고 화려한 느낌
- **은박**: 세련되고 모던한 느낌

### 형압 (엠보싱)
입체적인 질감을 더해 시각적, 촉각적 효과를 줍니다.

### 오시/접지
접는 선을 넣어 깔끔하게 접을 수 있도록 합니다.', 2),
('인쇄 장비 소개', '최신 장비로 최고의 품질을', 'info', '/images/works/equipment.jpg', '성진인쇄의 최신 인쇄 장비와 제본 설비를 소개합니다.', '## 최신 인쇄 장비

성진인쇄는 최신 디지털 인쇄기와 오프셋 인쇄기를 보유하고 있습니다.

## 디지털 인쇄
- 소량 인쇄에 적합
- 빠른 출력 속도
- 다양한 용지 대응

## 오프셋 인쇄
- 대량 인쇄에 경제적
- 뛰어난 색상 재현력
- 안정적인 품질

## 제본 설비
- 무선제본기
- 중철제본기
- 스프링제본기', 3),
('포트폴리오', '성진인쇄 작업 사례', 'portfolio', '/images/works/portfolio.jpg', '다양한 고객사의 인쇄물 제작 사례를 확인해보세요.', '## 작업 사례

성진인쇄에서 제작한 다양한 인쇄물 사례입니다.

### 기업 카탈로그
- A사 제품 카탈로그 (무선제본, 스노우지)
- B사 회사 소개서 (중철제본, 아트지)

### 학술 자료
- C대학교 논문집 (무선제본, 모조지)
- D연구소 보고서 (스프링제본)

### 홍보물
- E기업 브로슈어 (중철제본, 금박)
- F행사 프로그램북 (중철제본)', 4);
