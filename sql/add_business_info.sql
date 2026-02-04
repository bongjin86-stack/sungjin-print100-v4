-- 사업장 정보를 site_settings 테이블에 추가
-- Supabase Dashboard > SQL Editor에서 실행

INSERT INTO site_settings (key, value, description) VALUES
  ('company_name', '(주)성진삼점오', '회사명'),
  ('ceo_name', '', '대표자명'),
  ('business_number', '', '사업자등록번호'),
  ('phone', '02-448-3601', '전화번호'),
  ('email', '', '이메일'),
  ('address', '서울 송파구 송파대로20길 22 다인빌딩 1층', '주소'),
  ('google_maps_url', 'https://maps.app.goo.gl/avBn1jfpfq5CQLDs5', '구글맵 URL'),
  ('business_hours', '평일 09:00 - 18:00', '운영시간'),
  ('business_hours_weekend', '주말 및 공휴일 휴무', '주말 운영시간'),
  ('bank_name', '하나은행', '은행명'),
  ('bank_account', '585-910026-36407', '계좌번호'),
  ('bank_account_holder', '(주)성진삼점오', '예금주')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description;
