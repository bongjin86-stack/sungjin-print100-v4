-- 재단(cutting) 비용 누적 구간 개편
-- 기존: 1~50(50원), 51~100(40원), 101~200(35원), 201~500(30원), 501~1000(25원), 1001~(20원)
-- 변경: 1~30(400원), 31~100(20원), 101~200(10원), 201~500(7원), 501~1000(4원), 1001~(2원)
-- 누적(마지널) 계산 방식으로 priceEngine.ts에서 처리

-- 기존 cutting 비용 행 삭제
DELETE FROM finishing_costs
WHERE finishing_type_id = (
  SELECT id FROM finishing_types WHERE code = 'cutting'
);

-- 새 구간 삽입
INSERT INTO finishing_costs (finishing_type_id, min_qty, max_qty, setup_cost, cost_per_unit, unit_type, is_active)
SELECT ft.id, v.min_qty, v.max_qty, v.setup_cost, v.cost_per_unit, 'per_copy', true
FROM finishing_types ft
CROSS JOIN (VALUES
  (1,    30,   3000, 400),
  (31,   100,  3000, 20),
  (101,  200,  3000, 10),
  (201,  500,  3000, 7),
  (501,  1000, 3000, 4),
  (1001, NULL, 3000, 2)
) AS v(min_qty, max_qty, setup_cost, cost_per_unit)
WHERE ft.code = 'cutting';
