# Phase 2: 비즈니스 로직 계층 분석

**분석일:** 2026-02-08
**대상 파일:**

- `src/lib/blockDefaults.ts` (363줄) — 블록 규칙 제어센터
- `src/lib/priceEngine.ts` (747줄) — 가격 계산 엔진
- `src/lib/blockRenderer.ts` (261줄) — CMS 콘텐츠 렌더러

---

## 1. blockDefaults.ts — 블록 규칙 제어센터

### 1.1 함수 카탈로그

| 함수                                              | 줄 수   | 역할                           | 호출자                      |
| ------------------------------------------------- | ------- | ------------------------------ | --------------------------- |
| `validateCoatingWeight(weight)`                   | 44-52   | 150g 이하 코팅 불가 검증       | PreviewBlock                |
| `getCoatingWeight(blocks, customer, productType)` | 57-94   | 코팅 기준 평량 결정            | PreviewBlock                |
| `extractDefaultsFromBlocks(blocks)`               | 99-252  | 블록 config → 초기 고객값 매핑 | ProductView, ProductBuilder |
| `checkLinkRules(blocks, customer)`                | 257-280 | 스프링 블록 간 연동 규칙       | ProductView                 |
| `getFoldUpdate(foldOpt, cfg, customer)`           | 285-303 | 접지→오시 자동 연동 (R001)     | PreviewBlock                |
| `checkThickness(blocks, customer)`                | 308-339 | 제본 두께 제한 검증            | ProductView                 |
| `mapPrintOptionsToCustomer(cust, blocks)`         | 344-363 | 인쇄옵션→innerColor/Side 매핑  | ProductView                 |

### 1.2 의존성 구조

```
blockDefaults.ts
  ├── imports from builderData.ts    → getDefaultCustomer()
  ├── imports from businessDays.ts   → formatBusinessDate(), getBusinessDate()
  └── imports from priceEngine.ts    → estimateThickness(), validateBindingThickness()
```

**주의:** `blockDefaults` → `priceEngine` 방향 의존성이 있습니다. priceEngine의 두께 계산 함수를 blockDefaults에서 사용하므로, 양방향 의존이 되지 않도록 주의해야 합니다.

### 1.3 extractDefaultsFromBlocks 상세 분석 (핵심 함수, 153줄)

이 함수는 블록 배열을 순회하며 `CustomerSelection` 초기값을 구성합니다.

**처리하는 블록 타입 (13종):**

| 블록 타입                             | 매핑 대상                                                                       | 특이사항                                    |
| ------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------- |
| size                                  | `defaults.size`                                                                 | 단순 매핑                                   |
| paper                                 | `defaults.paper/weight` 또는 `defaults.coverPaper/coverWeight`                  | `linkedBlocks.coverPaper`로 표지/내지 판별  |
| print                                 | `defaults.color/side` 또는 `defaults.innerColor/innerSide`                      | `linkedBlocks.innerPrint/coverPrint`로 판별 |
| quantity                              | `defaults.qty`                                                                  | 단순 매핑                                   |
| delivery                              | `defaults.delivery`, `deliveryPercent`, `deliveryDate`                          | 영업일 계산 포함                            |
| pages / pages_saddle / pages_leaf     | `defaults.pages`, `maxThickness`                                                | 3가지 타입이 동일 처리                      |
| pp                                    | `defaults.pp`                                                                   | 단독 블록 (미사용)                          |
| back                                  | `defaults.back`                                                                 | 단독 블록 (미사용)                          |
| spring_color                          | `defaults.springColor`                                                          | 단독 블록 (미사용)                          |
| spring_options                        | `defaults.pp`, `coverPrint`, `coverPaper`, `coverWeight`, `back`, `springColor` | 복합 블록 — 6개 필드 매핑                   |
| finishing                             | `defaults.finishing.*`                                                          | coating, corner, punch, mising              |
| cover_print                           | `defaults.coverPrint`, `coverPaper`, `coverWeight`                              | 단독 블록 (미사용)                          |
| inner_layer_saddle / inner_layer_leaf | `defaults.innerPaper/Weight/Color/Side`, `pages`, `maxThickness`                | 단독 블록 (미사용)                          |

**발견사항:**

- `pages_saddle`, `pages_leaf` 타입은 `builderData.ts`의 `BLOCK_TYPES`에 정의되어 있지 않지만, 이 함수에서 처리합니다. 데드 코드일 가능성이 높습니다.
- `pp`, `back`, `spring_color`, `cover_print`, `inner_layer_*` 블록 처리 코드가 존재하지만, 실제 템플릿에서는 `spring_options` 복합 블록만 사용합니다. 하위 호환성 코드로 보입니다.

### 1.4 checkLinkRules 분석

현재 2가지 규칙만 검사합니다:

1. **뒷판 비활성화:** `cover_print` 블록에서 `front_back` 선택 시 → `backDisabled: true`
2. **전면 커버 필수:** `pp === "none"` AND `coverPrint === "none"` → 에러

**문제점:** 이 함수는 `cover_print`와 `pp` 개별 블록을 검색하는데, 스프링 템플릿은 `spring_options` 복합 블록을 사용합니다. 따라서 **현재 스프링 템플릿에서는 이 규칙이 작동하지 않을 가능성**이 있습니다.

### 1.5 타입 안전성 문제

| 함수                        | 파라미터 타입                        |
| --------------------------- | ------------------------------------ |
| `getCoatingWeight`          | `blocks: any[], customer: any`       |
| `extractDefaultsFromBlocks` | `blocks` (타입 없음)                 |
| `checkLinkRules`            | `blocks, customer` (타입 없음)       |
| `getFoldUpdate`             | `foldOpt, cfg, customer` (타입 없음) |
| `checkThickness`            | `blocks, customer` (타입 없음)       |
| `mapPrintOptionsToCustomer` | `cust, blocks` (타입 없음)           |

7개 함수 중 **`validateCoatingWeight`만 타입이 명시**되어 있습니다. 나머지는 모두 `any` 또는 암묵적 `any`입니다.

---

## 2. priceEngine.ts — 가격 계산 엔진

### 2.1 함수 카탈로그

| 함수                                                | 줄 수   | 역할                              |
| --------------------------------------------------- | ------- | --------------------------------- |
| `calculateSingleLayerPrice(customer, qty)`          | 84-273  | 단층 상품 가격 (전단지 등)        |
| `calculateBindingPrice(customer, qty, bindingType)` | 278-603 | 제본 상품 가격 (중철/무선/스프링) |
| `calculatePrice(customer, qty, productType)`        | 608-632 | 메인 디스패처                     |
| `estimateThickness(weight, paperCode)`              | 650-677 | 용지 1장 두께 추정                |
| `calculateBindingThickness(...)`                    | 679-709 | 제본 총 두께 계산                 |
| `validateBindingThickness(...)`                     | 711-743 | 두께 제한 검증                    |

### 2.2 가격 계산 흐름도

#### 단층 상품 (calculateSingleLayerPrice)

```
입력: CustomerSelection + qty
  │
  ├── 1. 사이즈 정보 조회 (getSizeInfo → upCount, baseSheet)
  ├── 2. 매수 계산: sheets = ceil(qty / upCount)
  ├── 3. 면수 계산: faces = sheets × (단면?1:2)
  │
  ├── [비용 항목]
  │   ├── 용지비 = paperCost × marginRate × sheets
  │   ├── 인쇄비 = printCostPerFace(faces) × faces × (흑백?0.65:1.0)
  │   ├── 재단비 = setup + perUnit × qty
  │   ├── 코팅비 = setup + perUnit × coatingFaces  (finishing.coating일 때)
  │   ├── 오시비 = setup + perUnit × qty            (osiEnabled일 때)
  │   ├── 접지비 = setup + perUnit × qty            (foldEnabled일 때)
  │   ├── 귀도리 = setup + perUnit × ceil(qty/100)  (batch 단위)
  │   ├── 타공비 = setup + perUnit × holes × qty
  │   └── 미싱비 = setup + perUnit × qty
  │
  ├── 출고일 조정: total × (1 + deliveryPercent/100)
  │
  └── 출력: { total, breakdown, perUnit, sheets, faces, upCount, estimatedWeight }
```

#### 제본 상품 (calculateBindingPrice)

```
입력: CustomerSelection + qty + bindingType
  │
  ├── [표지]
  │   ├── 표지 용지비 = coverPaperCost × marginRate × qty
  │   ├── 표지 인쇄비 = printCostPerFace(qty×2) × (qty×2) × colorRate
  │   └── 표지 코팅비 = setup + perUnit × coatingFaces  (coverCoating일 때)
  │
  ├── [내지]
  │   ├── 내지 매수 계산:
  │   │   ├── 중철: ceil((pages-4)/4) × qty   ← 대지 접지 방식
  │   │   ├── 무선/스프링 양면: ceil(pages/2) × qty
  │   │   └── 무선/스프링 단면: pages × qty
  │   ├── 내지 용지비 = innerPaperCost × marginRate × innerSheets
  │   └── 내지 인쇄비 = printCostPerFace(baseFaces) × baseFaces × colorRate
  │       └── baseFaces = ceil(innerFaces / upCount)  ← 대지 기준 면수 변환
  │
  ├── [제본비] = setup + perCopy × qty
  │
  ├── [스프링 추가]  (bindingType === "spring")
  │   ├── PP 커버비 = setup + perUnit × qty
  │   └── 스프링 표지 = 용지비 + 인쇄비  (coverPrint !== "none")
  │
  ├── [후가공]  (section 5 — 단층과 동일)
  │   └── 코팅/오시/접지/귀도리/타공/미싱
  │
  ├── 출고일 조정
  ├── 두께 계산 + 검증
  │
  └── 출력: { total, breakdown, perUnit, coverSheets, innerSheets, totalThickness, ... }
```

### 2.3 dbService 의존성

| 함수                                        | 소스                       | 용도                                |
| ------------------------------------------- | -------------------------- | ----------------------------------- |
| `getSizeInfo(sizeCode)`                     | DB sizes 테이블            | up_count, base_sheet, width, height |
| `getPaperCost(paper, weight, baseSheet)`    | DB paper_costs 테이블      | cost_per_sheet, margin_rate         |
| `getSizePaperPrice(size, paper, weight)`    | DB size_paper_price 테이블 | sell_price_per_copy (deprecated)    |
| `getPrintCostPerFace(faces)`                | DB print_costs 테이블      | 면당 인쇄 단가                      |
| `getFinishingCost(type)`                    | DB finishing_costs 테이블  | setup_cost, cost_per_unit           |
| `getFinishingCostByLines(type, lines, qty)` | DB finishing_costs 테이블  | 줄 수별 단가                        |
| `getCoatingCost(faces, isDouble)`           | DB coating_costs 테이블    | setup_cost, cost_per_unit           |
| `getBindingCost(type, qty)`                 | DB binding_costs 테이블    | setup_cost, cost_per_copy           |

### 2.4 하드코딩된 비즈니스 상수

| 상수           | 위치            | 값                                 | 용도                   |
| -------------- | --------------- | ---------------------------------- | ---------------------- |
| 흑백 할인율    | 150, 340, 418행 | `0.65`                             | 흑백 인쇄 = 컬러의 65% |
| 귀도리 배치    | 211, 518행      | `100`                              | 100부 단위 배치        |
| 기본 타공 구멍 | 224, 531행      | `2`                                | 기본 2홀               |
| 두께 계수      | 654-664행       | 용지별 mm/g                        | 용지 종류별 두께 추정  |
| 두께 제한      | 717-720행       | 중철:2.5mm, 무선:50mm, 스프링:20mm | 기본 제한값            |

### 2.5 코드 품질 발견사항

#### 2.5.1 USE_PRECALC 데드 코드

`USE_PRECALC = false`로 고정되어 있어, `if (USE_PRECALC)` 분기 내 코드가 실행되지 않습니다.

**영향 범위:**

- `calculateSingleLayerPrice` 106-128행 (22줄 데드 코드)
- `calculateBindingPrice` 299-320행 (21줄 데드 코드)
- `calculateBindingPrice` 376-397행 (21줄 데드 코드)

총 **64줄의 데드 코드**. `getSizePaperPrice` import도 불필요합니다.

#### 2.5.2 후가공 코드 중복

`calculateSingleLayerPrice`의 후가공 섹션(168-242행, 74줄)과 `calculateBindingPrice`의 후가공 섹션(475-549행, 74줄)이 **거의 동일한 코드**입니다.

중복 항목: 코팅, 오시, 접지, 귀도리, 타공, 미싱 — 6개 항목 모두.

#### 2.5.3 calculateBindingPrice 함수 크기

325줄(278-603행)로, 단일 함수로는 과도하게 깁니다. 표지 계산, 내지 계산, 제본비, 스프링 옵션, 후가공, 출고일, 두께 검증 — 7개 관심사가 하나의 함수에 있습니다.

#### 2.5.4 출고일 조정 코드 중복

단층(244-252행)과 제본(551-559행)의 출고일 조정 코드가 동일합니다.

---

## 3. blockRenderer.ts — CMS 콘텐츠 렌더러

### 3.1 역할 재평가

이 파일은 **빌더 시스템과 직접적인 관련이 없습니다.** BlockNote 에디터의 JSON 출력을 HTML로 변환하는 CMS 유틸리티입니다.

### 3.2 함수 카탈로그

| 함수                           | 역할                                         |
| ------------------------------ | -------------------------------------------- |
| `renderInlineContent(content)` | 인라인 스타일(bold, italic 등) → HTML        |
| `renderBlock(block)`           | 블록 타입(heading, paragraph 등) → HTML 요소 |
| `groupListItems(blocks)`       | 연속 리스트 아이템 → ul/ol 그룹화            |
| `renderBlocksToHTML(content)`  | 메인 진입점: JSON string 또는 Block[] → HTML |
| `markdownToHTML(markdown)`     | 마크다운 → HTML (레거시 호환)                |
| `isBlockNoteJSON(content)`     | BlockNote JSON 형식 판별                     |

### 3.3 보안 관련 참고사항

DOMPurify가 의도적으로 제거되었습니다(Vercel SSR 호환 문제). 관리자 전용 콘텐츠이므로 현재는 문제 없으나, 향후 UGC(사용자 생성 콘텐츠)를 다룰 경우 XSS 위험이 있습니다.

---

## 4. Phase 2 핵심 발견사항 요약

### 아키텍처 특성

1. **규칙과 가격 계산의 분리가 잘 되어 있습니다.** blockDefaults(규칙)와 priceEngine(계산)이 명확히 분리되어 있으며, 두께 계산만 교차 참조합니다.
2. **DB 의존성이 priceEngine에 집중되어 있습니다.** 8개 DB 조회 함수가 모두 priceEngine에서 호출됩니다.
3. **blockRenderer는 빌더 시스템 외부입니다.** CMS 콘텐츠 렌더링 유틸리티로, Phase 4 통합 분석에서 제외해도 됩니다.

### 리팩토링 대상 목록

| 우선순위 | 항목                                   | 이유                                     |
| -------- | -------------------------------------- | ---------------------------------------- |
| **높음** | USE_PRECALC 데드 코드 제거             | 64줄 데드 코드, import 1개 불필요        |
| **높음** | 후가공 계산 코드 추출                  | 74줄 × 2 중복 → 공통 함수로 추출         |
| **높음** | blockDefaults 타입 추가                | 7개 함수 중 6개가 any 타입               |
| **중간** | calculateBindingPrice 분리             | 325줄 단일 함수 → 하위 함수 분리         |
| **중간** | checkLinkRules의 spring_options 호환   | 현재 스프링 템플릿에서 미작동 가능성     |
| **중간** | 하드코딩 상수 추출                     | 흑백 0.65, 귀도리 배치 100 등 → 설정으로 |
| **낮음** | pages_saddle/pages_leaf 데드 코드 정리 | extractDefaults에서만 참조, 실제 미사용  |
| **낮음** | 출고일 조정 코드 통합                  | 9줄 중복, 영향 작음                      |

### blockDefaults 미적용 규칙과 연관

Phase 1에서 발견한 **미적용 규칙 11개** 중 blockDefaults에서 구현해야 할 것:

| 규칙                      | 구현 위치                          | 비고                |
| ------------------------- | ---------------------------------- | ------------------- |
| R003 (무선 코팅 단면)     | `getCoatingWeight` 또는 새 함수    | 양면 코팅 비활성화  |
| R004 (스프링 코팅 불가)   | 새 함수 또는 `checkLinkRules` 확장 | 코팅 블록 숨김      |
| R-PP01 (접지+귀도리 불가) | `checkLinkRules` 확장              | 호환성 규칙         |
| R-PP02 (코팅+미싱 불가)   | `checkLinkRules` 확장              | 호환성 규칙         |
| R-PP03 (스프링+코팅 불가) | `checkLinkRules` 확장              | = R004와 동일       |
| R-SP01~03 (스프링 자동화) | 새 함수                            | spring_options 연동 |

---

_Phase 3에서는 UI 컴포넌트 계층(`ProductBuilder/index.jsx`, `BlockSettings.jsx`, `PreviewBlock.jsx`)을 분석합니다._
