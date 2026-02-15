# Pricing System Architecture

> 최종 업데이트: 2026-02-15

## 1. 시스템 의존성 그래프

```
순수 로직 (이식 가능)                  DB 결합 (Supabase 필요)
──────────────────────────          ─────────────────────────
builderData.ts                      dbService.ts (8개 테이블 캐시)
  - ProductType, VALID_PRODUCT_TYPES    - loadPricingData()
  - TEMPLATES, BLOCK_TYPES              - getSizeInfo, getPaperCost, ...
  - inferProductType()                  - 전역 캐시 + 인덱스 맵
  - CustomerSelection 타입

blockDefaults.ts                    calculate-price.ts (API)
  - extractDefaultsFromBlocks()         - loadPricingData() 호출
  - checkLinkRules()                    - calculatePrice() 호출
  - mapPrintOptionsToCustomer()         - outsourced_config fetch
  - getFoldUpdate()

businessDays.ts                     create-order.ts (API)
  - getBusinessDate()                   - 가격 검증 (3% 오차 제한)
  - formatBusinessDate()                - createOrder()

priceEngine.ts*                     ProductBuilder/index.jsx
  - calculateSingleLayerPrice()         - supabase 직접 호출 (CRUD)
  - calculateBindingPrice()             - 이미지 업로드
  - calculatePrice() (dispatch)
  - estimateThickness()

* priceEngine은 dbService 함수를 직접 import → DB 결합
```

### import 관계도

```
ProductBuilder/index.jsx
  ├── blockDefaults.ts ──── builderData.ts
  ├── builderData.ts
  ├── supabase.ts
  ├── hooks/usePriceCalculation.js ──── blockDefaults.ts
  └── shared/PreviewBlock.jsx ──── blockDefaults.ts, builderData.ts, businessDays.ts

priceEngine.ts
  ├── builderData.ts (CustomerSelection 타입만)
  └── dbService.ts ──── supabase.ts
```

---

## 2. 가격 계산 데이터 흐름

```
[고객 선택]                          [서버]
ProductView / Builder                API → priceEngine → DB
    │                                    │
    ├── extractDefaultsFromBlocks()      │
    │   (블록 → 초기 customer)           │
    │                                    │
    ├── 사용자 옵션 변경                  │
    │   (customer state 갱신)            │
    │                                    │
    ├── mapPrintOptionsToCustomer()      │
    │   (내지/표지 인쇄 매핑)             │
    │                                    │
    └── fetch("/api/calculate-price")    │
        { customer, qty, productType } ──┤
                                         │
                                    loadPricingData()
                                    (8개 테이블 → 캐시)
                                         │
                                    calculatePrice(customer, qty, type)
                                         │
                                    ┌────┴────┐
                               flyer│    │binding   │outsourced
                                    │    │          │
                     calculateSingle│  calculate    │{total:0}
                     LayerPrice()   │  BindingPrice()
                                    │    │
                                    └────┴──── 결과 반환
                                         │
                                    { selected: {...}, byQty: {...} }
```

---

## 3. Product Type Safeguard System (5중 방어)

### S1: 템플릿 기본값

**위치:** `src/lib/builderData.ts` TEMPLATES
**동작:** 모든 5개 템플릿에 `product_type` 명시. 새 상품 생성 시 spread로 복사됨.
**방어:** 블록 추론에 의존하지 않고 명시적 타입 보장.

### S2: UI 배지

**위치:** `src/components/admin/ProductBuilder/index.jsx` 헤더
**동작:** `<select>` 드롭다운으로 현재 product_type 표시.
**색상:**
- 초록(emerald): 명시적 타입 설정됨
- 노랑(yellow): product_type 미설정, 블록에서 추론됨
- 호박(amber): 명시값과 추론값 불일치

### S3: 저장 검증

**위치:** `saveProductToServer()` in ProductBuilder
**동작:**
1. `prod.product_type || inferProductType(...)` (명시 우선, 추론은 폴백)
2. `VALID_PRODUCT_TYPES.includes()` 검증
3. 미설정 시 confirm 다이얼로그
4. 불일치 시 confirm 다이얼로그

### S4: API 거부

**위치:** `src/pages/api/products/index.ts` POST, `src/pages/api/products/[id].ts` PUT
**동작:** `VALID_PRODUCT_TYPES.includes(product_type)` 검증. 실패 시 400 반환.
**방어:** 클라이언트 검증을 우회해도 DB에 null/invalid 도달 불가.

### S5: 수동 오버라이드

**위치:** ProductBuilder 헤더 `<select>` 드롭다운 (S2와 동일 UI)
**동작:** 관리자가 product_type을 직접 변경. `setCurrentProduct` 즉시 갱신.

### TypeScript 진실 공급원

```typescript
// src/lib/builderData.ts
export type ProductType = "flyer" | "perfect" | "saddle" | "spring" | "outsourced";
export const VALID_PRODUCT_TYPES: ProductType[] = ["flyer", "perfect", "saddle", "spring", "outsourced"];
```

---

## 4. 이식성 가이드

### 현재 결합점

`priceEngine.ts`가 `dbService.ts` 함수를 직접 import:
- `getSizeInfo()`, `getPaperCost()`, `getPrintCostPerFace()`
- `getCoatingCost()`, `getFinishingCost()`, `getBindingCost()` 등

### 분리 인터페이스 설계 (향후)

```typescript
/** 가격 데이터 제공자 인터페이스 */
interface IPricingData {
  getSizeInfo(code: string): { up_count: number; base_sheet: string } | null;
  getPaperCost(code: string, weight: number, base: string): number | null;
  getPrintCostPerFace(faces: number): number;
  getFinishingCost(code: string, qty?: number): { setup: number; perUnit: number } | null;
  getFinishingCostTiers(code: string): Array<{ min_qty: number; max_qty: number | null; setup_cost: number; cost_per_unit: number }>;
  getCoatingCost(type: string, side: string, base: string, qty: number): number | null;
  getBindingCost(code: string, qty: number): { setup: number; perCopy: number } | null;
}

// priceEngine.ts가 인터페이스를 파라미터로 받으면
// Supabase, Firebase, JSON 파일 등 어떤 데이터 소스든 주입 가능
```

### 분리 대상 파일

| 파일 | 순수 로직 | 분리 작업 |
|------|----------|----------|
| `builderData.ts` | 100% | 그대로 이동 가능 |
| `blockDefaults.ts` | 100% | 그대로 이동 가능 |
| `businessDays.ts` | 100% | 그대로 이동 가능 |
| `priceEngine.ts` | 90% | dbService import를 IPricingData 파라미터로 교체 필요 |
| `dbService.ts` | 0% | IPricingData의 Supabase 구현체로 변환 |

---

## 5. DB 테이블 의존성

`dbService.loadPricingData()`가 조회하는 8개 테이블:

| 테이블 | 용도 | 주요 컬럼 |
|--------|------|----------|
| `papers` | 용지 코드 → 용지 객체 | code, name, is_active |
| `paper_costs` | 용지+평량+전지 → 장당 원가 | paper_id, weight, base_sheet, cost_per_sheet, margin_rate |
| `sizes` | 사이즈 코드 → 규격 정보 | code, base_sheet, up_count |
| `print_costs` | 면수 구간 → 면당 인쇄비 | min_faces, max_faces, cost_per_face |
| `finishing_types` | 후가공 종류 코드 | code (cutting, coating, corner_rounding 등) |
| `finishing_costs` | 후가공 종류+수량 → 비용 | finishing_type_id, min_qty, setup_cost, cost_per_unit |
| `binding_types` | 제본 종류 코드 | code (saddle, perfect, spring) |
| `binding_costs` | 제본 종류+수량 → 비용 | binding_type_id, min_qty, setup_cost, cost_per_copy |
