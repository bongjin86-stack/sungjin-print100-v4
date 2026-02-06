-- =====================================================
-- paper_costs 테이블에 thickness 컬럼 추가
-- 실행: Supabase Dashboard > SQL Editor
-- 날짜: 2026-02-06
-- =====================================================

-- 1. thickness 컬럼 추가 (mm 단위, 소수점 3자리)
ALTER TABLE paper_costs
ADD COLUMN IF NOT EXISTS thickness DECIMAL(5,3);

-- 2. 모조지 (paper_id = 1) - 계수 0.00115
UPDATE paper_costs SET thickness = 0.092 WHERE paper_id = 1 AND weight = 80;
UPDATE paper_costs SET thickness = 0.115 WHERE paper_id = 1 AND weight = 100;
UPDATE paper_costs SET thickness = 0.138 WHERE paper_id = 1 AND weight = 120;
UPDATE paper_costs SET thickness = 0.173 WHERE paper_id = 1 AND weight = 150;
UPDATE paper_costs SET thickness = 0.207 WHERE paper_id = 1 AND weight = 180;

-- 3. 스노우지 (paper_id = 2) - 계수 0.0009
UPDATE paper_costs SET thickness = 0.090 WHERE paper_id = 2 AND weight = 100;
UPDATE paper_costs SET thickness = 0.108 WHERE paper_id = 2 AND weight = 120;
UPDATE paper_costs SET thickness = 0.135 WHERE paper_id = 2 AND weight = 150;
UPDATE paper_costs SET thickness = 0.162 WHERE paper_id = 2 AND weight = 180;
UPDATE paper_costs SET thickness = 0.180 WHERE paper_id = 2 AND weight = 200;
UPDATE paper_costs SET thickness = 0.225 WHERE paper_id = 2 AND weight = 250;
UPDATE paper_costs SET thickness = 0.270 WHERE paper_id = 2 AND weight = 300;

-- 4. 인스퍼/랑데뷰 (paper_id = 3) - 계수 0.0012
UPDATE paper_costs SET thickness = 0.126 WHERE paper_id = 3 AND weight = 105;
UPDATE paper_costs SET thickness = 0.156 WHERE paper_id = 3 AND weight = 130;
UPDATE paper_costs SET thickness = 0.192 WHERE paper_id = 3 AND weight = 160;
UPDATE paper_costs SET thickness = 0.228 WHERE paper_id = 3 AND weight = 190;
UPDATE paper_costs SET thickness = 0.288 WHERE paper_id = 3 AND weight = 240;

-- 5. 검증 쿼리
SELECT
  p.name as paper_name,
  pc.weight,
  pc.base_sheet,
  pc.thickness
FROM paper_costs pc
JOIN papers p ON p.id = pc.paper_id
WHERE pc.is_active = true
ORDER BY pc.paper_id, pc.weight, pc.base_sheet;
