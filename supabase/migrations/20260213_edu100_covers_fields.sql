-- edu100_covers에 fields JSONB 컬럼 추가
-- 커버별 고객 입력 필드 (라벨 + placeholder) 정의
ALTER TABLE edu100_covers ADD COLUMN fields jsonb NOT NULL DEFAULT '[]'::jsonb;
