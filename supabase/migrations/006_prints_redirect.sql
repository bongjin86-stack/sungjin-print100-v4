-- prints 테이블에 redirect_to_product 컬럼 추가
-- true이면 고객이 prints 상세 페이지 접근 시 연결된 상품 페이지로 바로 리다이렉트
ALTER TABLE prints ADD COLUMN IF NOT EXISTS redirect_to_product BOOLEAN DEFAULT false;
