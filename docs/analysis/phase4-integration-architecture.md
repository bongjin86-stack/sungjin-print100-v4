# Phase 4: 통합 아키텍처 및 리팩토링 작업 목록

**분석일:** 2026-02-08
**Phase 1~3 종합:** 데이터 구조 → 비즈니스 로직 → UI 컴포넌트 → **통합 아키텍처**

---

## 1. 시스템 전체 아키텍처

### 1.1 컴포넌트 의존성 다이어그램

```
┌─────────────────────────────────────────────────────────────────┐
│                        Admin (ProductBuilder)                    │
│                                                                  │
│  index.jsx ─┬── BlockItem.jsx ──── BlockSettings.jsx            │
│             ├── BlockLibraryModal.jsx                            │
│             ├── ProductEditor.jsx                                │
│             ├── PriceDisplay.jsx                                 │
│             └── TemplateSelector.jsx                             │
└───────┬─────────────────────────────────────────────────────────┘
        │ imports                          │ API call
        ▼                                  ▼
┌───────────────┐  ┌──────────────────────────────────────────────┐
│  builderData  │  │              /api/calculate-price             │
│  .ts (947줄)  │  │              /api/create-order                │
│               │  │              /api/products                    │
│  BLOCK_TYPES  │  └──────────────┬───────────────────────────────┘
│  TEMPLATES    │                 │ imports
│  DB (폴백)    │                 ▼
│  getDefault   │  ┌──────────────────────────────────────────────┐
│  Customer()   │  │           Server-Side Logic                   │
└───────┬───────┘  │                                               │
        │          │  priceEngine.ts (747줄)                       │
        │          │    ├── calculateSingleLayerPrice              │
        │          │    ├── calculateBindingPrice                  │
        │          │    └── estimateThickness                      │
        │          │                                               │
        │          │  dbService.ts (454줄)                         │
        │          │    ├── loadPricingData (캐시)                  │
        │          │    └── get*Cost() (8개 조회 함수)              │
        │          └──────────────┬───────────────────────────────┘
        │                         │
        ▼                         ▼
┌───────────────────────────────────────────────────────────────┐
│                    Shared / Rule Engine                        │
│                                                               │
│  blockDefaults.ts (363줄) ←──── priceEngine (두께 함수)       │
│    ├── extractDefaultsFromBlocks                              │
│    ├── checkLinkRules                                         │
│    ├── checkThickness                                         │
│    ├── validateCoatingWeight / getCoatingWeight               │
│    ├── getFoldUpdate                                          │
│    └── mapPrintOptionsToCustomer                              │
└───────┬───────────────────────────────────────────────────────┘
        │ imports
        ▼
┌───────────────────────────────────────────────────────────────┐
│                    Customer-Facing                             │
│                                                               │
│  ProductView.jsx (403줄)                                      │
│    └── PreviewBlock.jsx (1,259줄) ← 공유 컴포넌트             │
│         └── PriceBox.jsx                                      │
│                                                               │
│  Checkout.jsx (345줄) → /api/create-order (가격 재검증)       │
│  Upload.jsx (350줄) → Supabase Storage                        │
└───────────────────────────────────────────────────────────────┘
```

### 1.2 파일 규모 요약

| 계층            | 파일                     | 줄 수      | 역할                 |
| --------------- | ------------------------ | ---------- | -------------------- |
| **데이터**      | builderData.ts           | 947        | 타입, 템플릿, DB폴백 |
|                 | rules.ts                 | 294        | 규칙 메타데이터      |
| **비즈니스**    | blockDefaults.ts         | 363        | 규칙 엔진            |
|                 | priceEngine.ts           | 747        | 가격 계산            |
|                 | dbService.ts             | 454        | DB 캐시 조회         |
| **Admin UI**    | ProductBuilder/index.jsx | 1,631      | 빌더 오케스트레이터  |
|                 | BlockSettings.jsx        | 2,007      | 블록 설정 패널       |
|                 | BlockItem.jsx            | ~100       | 블록 리스트 항목     |
|                 | BlockLibraryModal.jsx    | ~80        | 블록 추가 모달       |
| **Shared UI**   | PreviewBlock.jsx         | 1,259      | 블록 미리보기        |
| **Customer UI** | ProductView.jsx          | 403        | 상품 페이지          |
|                 | Checkout.jsx             | 345        | 주문 결제            |
| **API**         | calculate-price.ts       | 59         | 가격 API             |
|                 | create-order.ts          | 97         | 주문 API             |
|                 | products/index.ts        | 87         | 상품 CRUD            |
|                 | products/[id].ts         | 104        | 상품 단건 CRUD       |
| **기타**        | blockRenderer.ts         | 261        | CMS 렌더러 (별도)    |
| **합계**        |                          | **~9,238** |                      |

---

## 2. 데이터 흐름 분석

### 2.1 Admin → DB 흐름 (상품 생성)

```
Admin: ProductBuilder
  │
  ├── 1. 템플릿 선택 (TEMPLATES에서 블록 배열 복사)
  ├── 2. 블록 설정 편집 (BlockSettings → updateCfg)
  ├── 3. 상품 콘텐츠 편집 (ProductEditor → 이미지, 제목, 설명)
  ├── 4. 미리보기 (PreviewBlock + /api/calculate-price)
  │
  └── 5. 저장
       ├── localStorage (실시간 백업)
       └── POST /api/products (Supabase DB)
            └── 저장 데이터: { id, name, blocks[], content, template_id, ... }
```

### 2.2 DB → Customer 흐름 (상품 주문)

```
Customer: /product/:id
  │
  ├── 1. 상품 로드 (Supabase → blocks[], content)
  ├── 2. 초기화 (extractDefaultsFromBlocks → CustomerSelection)
  ├── 3. 규칙 적용 (checkLinkRules, checkThickness, validateCoatingWeight)
  │
  ├── 4. 블록 상호작용
  │     ├── PreviewBlock: 옵션 선택 → setCustomer
  │     ├── 연동 규칙 실행 (getFoldUpdate, mapPrintOptionsToCustomer)
  │     └── 가격 계산 요청 (debounced → /api/calculate-price)
  │
  ├── 5. 서버 가격 계산
  │     ├── loadPricingData (캐시된 DB 데이터)
  │     └── calculatePrice(customer, qty, productType)
  │           ├── flyer → calculateSingleLayerPrice
  │           └── perfect/saddle/spring → calculateBindingPrice
  │
  ├── 6. 주문 진행
  │     ├── sessionStorage에 선택값 저장
  │     └── /checkout 이동
  │
  └── 7. 주문 생성
        ├── POST /api/create-order
        │     ├── 서버 가격 재계산 (위변조 방지)
        │     ├── 3% 오차 허용 검증
        │     └── orderService.createOrder()
        └── /upload → 파일 업로드
```

### 2.3 핵심 데이터 객체: CustomerSelection

`CustomerSelection`은 시스템 전체를 관통하는 핵심 데이터 구조입니다.

```
생성: extractDefaultsFromBlocks(blocks) → CustomerSelection
변경: PreviewBlock의 setCustomer() 콜백 (50회+ 호출)
전달: ProductView → PreviewBlock (props)
      ProductView → /api/calculate-price (POST body)
      Checkout → /api/create-order (POST body)
검증: checkLinkRules, checkThickness, validateCoatingWeight
계산: calculatePrice(customer, qty, productType)
```

| 필드 그룹 | 필드 수 | 사용 상품 유형     |
| --------- | ------- | ------------------ |
| 기본      | 9       | 전체 (size~qty)    |
| 표지      | 5       | 무선, 중철         |
| 내지      | 5       | 무선, 중철, 스프링 |
| 스프링    | 4       | 스프링             |
| 후가공    | 11      | 전단지, 무선, 중철 |
| 계산용    | 3       | 제본 상품          |
| **합계**  | **37**  |                    |

---

## 3. 기술 부채 카탈로그

### 3.1 코드 중복 (총 ~614줄)

| ID   | 항목                             | 위치 1                  | 위치 2                  | 줄 수     | 심각도 |
| ---- | -------------------------------- | ----------------------- | ----------------------- | --------- | ------ |
| DUP1 | 용지 선택 UI                     | BlockSettings 4곳       | —                       | ~300줄    | 높음   |
| DUP2 | 후가공 계산 로직                 | priceEngine:168-242     | priceEngine:475-549     | 74줄 × 2  | 높음   |
| DUP3 | applySettings vs extractDefaults | index.jsx:878-966       | blockDefaults.ts:99-252 | ~88줄     | 높음   |
| DUP4 | Supabase 저장                    | index.jsx:672-702       | index.jsx:1095-1125     | ~30줄 × 2 | 중간   |
| DUP5 | FIXED_DELIVERY_OPTIONS           | BlockSettings:1172-1177 | PreviewBlock:834-839    | 6줄 × 2   | 중간   |
| DUP6 | spring_options 템플릿 폴백       | BlockSettings:813-847   | PreviewBlock:657-678    | ~20줄 × 2 | 중간   |
| DUP7 | 용지 스와치 그라디언트           | PreviewBlock:121-131    | PreviewBlock:1036-1048  | ~12줄 × 2 | 낮음   |
| DUP8 | 출고일 조정 코드                 | priceEngine:244-252     | priceEngine:551-559     | 9줄 × 2   | 낮음   |

### 3.2 데드 코드 (총 ~130줄)

| ID    | 항목                     | 위치                         | 줄 수 |
| ----- | ------------------------ | ---------------------------- | ----- |
| DEAD1 | USE_PRECALC 분기         | priceEngine.ts (3곳)         | 64줄  |
| DEAD2 | getSizePaperPrice import | priceEngine.ts:5             | 1줄   |
| DEAD3 | 미사용 블록 타입 처리    | extractDefaultsFromBlocks 내 | ~40줄 |
| DEAD4 | pages_saddle/pages_leaf  | extractDefaultsFromBlocks 내 | ~10줄 |
| DEAD5 | 미사용 BLOCK_TYPES 정의  | builderData.ts (6개 타입)    | ~15줄 |
| DEAD6 | console.log (개발용)     | index.jsx:276-375            | 10줄  |

### 3.3 버그 및 잠재적 문제 (5건)

| ID   | 항목                              | 위치                     | 심각도 | 설명                                                                  |
| ---- | --------------------------------- | ------------------------ | ------ | --------------------------------------------------------------------- |
| BUG1 | 자기참조 변수                     | BlockSettings.jsx:38-39  | 높음   | `const weights = dbWeights \|\| weights` → undefined 폴백             |
| BUG2 | checkLinkRules spring 미작동      | blockDefaults.ts:257-280 | 높음   | `cover_print`/`pp` 개별 블록 검색 → spring_options에서 미작동         |
| BUG3 | paper 블록 라벨 의존 판별         | PreviewBlock.jsx:72-73   | 중간   | `block.label.includes("표지")` — 라벨 변경 시 기능 파손               |
| BUG4 | back 블록 switch 외부 처리        | PreviewBlock.jsx:35-47   | 낮음   | 다른 블록과 처리 위치 불일치                                          |
| BUG5 | BlockSettings default 유니온 타입 | builderData.ts           | 낮음   | `string \| number \| {paper,weight} \| {color,side}` — 타입 가드 부재 |

### 3.4 타입 안전성 문제

| 파일              | 문제                             | 영향             |
| ----------------- | -------------------------------- | ---------------- |
| blockDefaults.ts  | 7개 함수 중 6개가 `any` 파라미터 | 런타임 오류 위험 |
| priceEngine.ts    | CustomerSelection 타입만 사용    | 상대적으로 양호  |
| index.jsx         | JSX 파일 — TypeScript 미적용     | 전체 미검증      |
| BlockSettings.jsx | JSX 파일 — TypeScript 미적용     | 전체 미검증      |
| PreviewBlock.jsx  | JSX 파일 — TypeScript 미적용     | 전체 미검증      |

### 3.5 하드코딩된 비즈니스 상수

| 상수                   | 파일                         | 값                         | 반복 횟수 |
| ---------------------- | ---------------------------- | -------------------------- | --------- |
| 흑백 할인율            | priceEngine.ts               | `0.65`                     | 3회       |
| 귀도리 배치 단위       | priceEngine.ts               | `100`                      | 2회       |
| 기본 타공 구멍 수      | priceEngine.ts               | `2`                        | 2회       |
| 두께 제한              | priceEngine.ts               | 중철:2.5/무선:50/스프링:20 | 1회       |
| 용지별 두께 계수       | priceEngine.ts:654-664       | 용지별 mm/g 매핑           | 1회       |
| FIXED_DELIVERY_OPTIONS | BlockSettings + PreviewBlock | 4개 출고일 옵션            | 2회       |

---

## 4. 규칙 시스템 전체 현황

### 4.1 규칙 통계 (수정)

| 상태     | 개수   | 비율 |
| -------- | ------ | ---- |
| applied  | 9      | 43%  |
| pending  | 12     | 57%  |
| **합계** | **21** | 100% |

### 4.2 미적용 규칙 구현 계획

#### 그룹 A: 후가공 호환성 규칙 (3개) — blockDefaults.ts에 구현

| ID     | 규칙             | 구현 방식                                         |
| ------ | ---------------- | ------------------------------------------------- |
| R-PP01 | 접지+귀도리 불가 | finishing 블록에서 foldEnabled 시 corner 비활성화 |
| R-PP02 | 코팅+미싱 불가   | finishing 블록에서 coating 시 mising 비활성화     |
| R-PP03 | 스프링+코팅 불가 | productType=spring 시 코팅 옵션 전체 숨김         |

#### 그룹 B: 제본 제약 규칙 (5개) — blockDefaults.ts에 구현

| ID   | 규칙             | 구현 방식                                             |
| ---- | ---------------- | ----------------------------------------------------- |
| R003 | 무선 코팅 단면   | perfect 타입 시 양면 코팅 비활성화                    |
| R004 | 스프링 코팅 불가 | = R-PP03 (중복, 통합 처리)                            |
| R005 | 중철 두께 제한   | checkThickness 확장 (고객 메시지 추가)                |
| R006 | 내지 두께 제한   | 새 함수: validateInnerThickness                       |
| R007 | 무선 최소 페이지 | pages 블록에서 min=40 검증 (현재 config.min으로 가능) |

#### 그룹 C: 스프링 자동화 규칙 (3개) — blockDefaults.ts에 구현

| ID     | 규칙      | 구현 방식                                             |
| ------ | --------- | ----------------------------------------------------- |
| R-SP01 | 표지 없음 | coverPrint="none" → 표지 용지/인쇄 숨김, 뒷판 활성화  |
| R-SP02 | PP표지    | coverPrint="pp" → 인쇄 단면 고정, PP 투명/불투명 선택 |
| R-SP03 | 일반표지  | coverPrint="normal" → 인쇄 선택 가능, 뒷판 활성화     |

#### 그룹 D: 페이지 수 제한 (1개) — blockDefaults.ts에 구현

| ID     | 규칙           | 구현 방식                                               |
| ------ | -------------- | ------------------------------------------------------- |
| R-ST03 | 페이지 수 제한 | 현재 용지 두께 기준 최대 페이지 동적 계산 → max 값 갱신 |

---

## 5. 리팩토링 작업 목록

### 5.1 작업 우선순위 기준

- **P0 (차단):** 버그 수정 — 기능 오류를 유발하는 문제
- **P1 (높음):** 코드 중복 제거 + 규칙 구현 기반 — 후속 작업의 전제 조건
- **P2 (중간):** 규칙 구현 + 코드 구조 개선
- **P3 (낮음):** 코드 정리 + 일관성 향상

### 5.2 전체 작업 목록 (28개)

---

#### Phase A: 기반 정리 (P0~P1, 선행 작업)

| #   | 작업                                   | 파일                            | 우선순위 | 의존성 | 추정 규모  |
| --- | -------------------------------------- | ------------------------------- | -------- | ------ | ---------- |
| A1  | BUG1 수정: 자기참조 변수               | BlockSettings.jsx:38-39         | P0       | 없음   | 2줄 수정   |
| A2  | BUG2 수정: checkLinkRules spring 호환  | blockDefaults.ts:257-280        | P0       | 없음   | ~20줄 수정 |
| A3  | BUG3 수정: paper 블록 라벨 의존 판별   | PreviewBlock.jsx:72-73          | P0       | 없음   | ~10줄 수정 |
| A4  | DEAD1 제거: USE_PRECALC 데드 코드      | priceEngine.ts                  | P1       | 없음   | 64줄 삭제  |
| A5  | DEAD6 제거: console.log                | index.jsx                       | P1       | 없음   | 10줄 삭제  |
| A6  | DUP5 해결: FIXED_DELIVERY_OPTIONS 추출 | builderData.ts + 2파일          | P1       | 없음   | 상수 추출  |
| A7  | 하드코딩 상수 추출                     | priceEngine.ts → builderData.ts | P1       | A4     | ~20줄      |

---

#### Phase B: 코드 중복 제거 (P1)

| #   | 작업                                            | 파일                            | 우선순위 | 의존성 | 추정 규모 |
| --- | ----------------------------------------------- | ------------------------------- | -------- | ------ | --------- |
| B1  | DUP2 해결: 후가공 계산 공통 함수 추출           | priceEngine.ts                  | P1       | A4     | -74줄     |
| B2  | DUP8 해결: 출고일 조정 공통 함수 추출           | priceEngine.ts                  | P1       | B1     | -9줄      |
| B3  | DUP1 해결: PaperSelector 컴포넌트 추출          | BlockSettings.jsx → 새 컴포넌트 | P1       | A1     | -220줄    |
| B4  | DUP4 해결: Supabase 저장 함수 통합              | index.jsx                       | P1       | 없음   | -30줄     |
| B5  | DUP3 해결: applySettings → extractDefaults 통합 | index.jsx + blockDefaults.ts    | P1       | 없음   | -88줄     |
| B6  | DUP6 해결: spring_options 폴백 공통화           | BlockSettings + PreviewBlock    | P1       | 없음   | -20줄     |
| B7  | DUP7 해결: 용지 스와치 그라디언트 맵 추출       | PreviewBlock.jsx                | P1       | 없음   | -12줄     |

---

#### Phase C: 규칙 구현 (P2)

| #   | 작업                                | 파일                            | 우선순위 | 의존성 | 추정 규모 |
| --- | ----------------------------------- | ------------------------------- | -------- | ------ | --------- |
| C1  | 그룹 A 규칙: R-PP01, R-PP02, R-PP03 | blockDefaults.ts + PreviewBlock | P2       | A2     | +40줄     |
| C2  | 그룹 B 규칙: R003, R005, R006, R007 | blockDefaults.ts + PreviewBlock | P2       | A2, B1 | +60줄     |
| C3  | 그룹 C 규칙: R-SP01, R-SP02, R-SP03 | blockDefaults.ts + PreviewBlock | P2       | A2     | +50줄     |
| C4  | 그룹 D 규칙: R-ST03                 | blockDefaults.ts + PreviewBlock | P2       | B1     | +30줄     |
| C5  | rules.ts 상태 업데이트              | rules.ts                        | P2       | C1~C4  | 12줄 수정 |

---

#### Phase D: 구조 개선 (P2~P3)

| #   | 작업                                    | 파일                       | 우선순위 | 의존성 | 추정 규모  |
| --- | --------------------------------------- | -------------------------- | -------- | ------ | ---------- |
| D1  | calculateBindingPrice 하위 함수 분리    | priceEngine.ts             | P2       | B1, B2 | 리팩토링   |
| D2  | blockDefaults.ts 타입 추가              | blockDefaults.ts           | P2       | C1~C4  | +30줄 타입 |
| D3  | getDefaultConfig → builderData.ts 이동  | index.jsx → builderData.ts | P2       | 없음   | 이동       |
| D4  | getDefaultContent → builderData.ts 이동 | index.jsx → builderData.ts | P3       | 없음   | 이동       |
| D5  | 미사용 BLOCK_TYPES 정리                 | builderData.ts             | P3       | DEAD3  | 삭제       |
| D6  | BUG4 수정: back 블록 switch 내부 이동   | PreviewBlock.jsx:35-47     | P3       | 없음   | ~15줄 이동 |
| D7  | index.jsx 관심사 분리 (커스텀 훅)       | index.jsx → hooks/         | P3       | B4, B5 | 구조 개선  |

---

#### Phase E: 검증 및 마무리

| #   | 작업                             | 파일         | 우선순위 | 의존성    |
| --- | -------------------------------- | ------------ | -------- | --------- |
| E1  | 전 상품 타입(4종) 가격 계산 검증 | 수동 테스트  | P1       | B1, C1~C4 |
| E2  | 규칙 21개 전수 테스트            | 수동 테스트  | P1       | C1~C5     |
| E3  | CLAUDE.md 업데이트               | CLAUDE.md    | P2       | 전체 완료 |
| E4  | CHANGELOG.md 업데이트            | CHANGELOG.md | P2       | 전체 완료 |

---

### 5.3 작업 의존성 그래프

```
Phase A (기반 정리)
  A1 ─────────────────────────── → B3
  A2 ─────────────────────────── → C1, C2, C3
  A3 (독립)
  A4 ──── → A7 ──── → B1 ──── → B2 ──── → D1
  A5 (독립)                       │
  A6 (독립)                       └──── → C2, C4
  A7 ──── → B1

Phase B (중복 제거)
  B1 ──── → B2, D1
  B3 (A1 의존)
  B4, B5 ──── → D7
  B6, B7 (독립)

Phase C (규칙 구현)
  C1, C2, C3, C4 ──── → C5 ──── → D2 ──── → E2

Phase D (구조 개선)
  D1 (B1, B2 의존)
  D3, D4, D5, D6 (독립적)
  D7 (B4, B5 의존)

Phase E (검증)
  E1, E2 ──── → E3, E4
```

### 5.4 병렬 실행 가능 그룹

| 그룹   | 작업                                                               | 병렬 가능 이유                  |
| ------ | ------------------------------------------------------------------ | ------------------------------- |
| 그룹 1 | A1, A2, A3, A5, A6                                                 | 서로 다른 파일, 독립적          |
| 그룹 2 | A4 + A7                                                            | 순차 (A4→A7), 그룹1과 병렬 가능 |
| 그룹 3 | B1+B2 (priceEngine), B3 (BlockSettings), B4+B5 (index.jsx), B6, B7 | 파일별 분리                     |
| 그룹 4 | C1 (후가공 규칙), C3 (스프링 규칙)                                 | 서로 다른 규칙 그룹             |
| 그룹 5 | C2 (제본 규칙), C4 (페이지 제한)                                   | 그룹4와 병렬 가능               |
| 그룹 6 | D1~D7                                                              | 대부분 독립적                   |

---

## 6. 팀 구성 제안

### 6.1 권장 팀 구조

리팩토링 실행 시 **3명의 병렬 에이전트**를 권장합니다:

| 역할       | 담당 작업                            | 주요 파일                              |
| ---------- | ------------------------------------ | -------------------------------------- |
| **engine** | Phase A(A4,A7) + B(B1,B2) + D1       | priceEngine.ts, builderData.ts         |
| **rules**  | Phase A(A2) + C(C1~C5) + D2          | blockDefaults.ts, rules.ts             |
| **ui**     | Phase A(A1,A3) + B(B3~B7) + D(D3~D7) | BlockSettings, PreviewBlock, index.jsx |

### 6.2 순서 제안

1. **1차 (기반 정리):** 3명 병렬로 Phase A 수행
2. **2차 (중복 제거+규칙):** engine→B1,B2, rules→C1~C4, ui→B3~B7
3. **3차 (구조 개선):** engine→D1, rules→D2+C5, ui→D3~D7
4. **4차 (검증):** 전원 합류 → E1~E4

---

## 7. 리팩토링 영향 추정

### 7.1 코드 변화 예측

| 항목            | 현재   | 리팩토링 후 | 변화         |
| --------------- | ------ | ----------- | ------------ |
| 총 코드 줄 수   | ~9,238 | ~8,600      | -638줄 (-7%) |
| 코드 중복       | ~614줄 | ~0줄        | -614줄       |
| 데드 코드       | ~130줄 | ~0줄        | -130줄       |
| 적용된 규칙     | 9/21   | 21/21       | +12 규칙     |
| `any` 타입 함수 | 6개    | 0개         | 전체 타입화  |
| 하드코딩 상수   | 10+    | 0           | 상수 추출    |

### 7.2 위험 요소

| 위험                            | 영향                     | 완화 방안                               |
| ------------------------------- | ------------------------ | --------------------------------------- |
| 가격 계산 변경으로 금액 변동    | 매출 영향                | E1: 변경 전후 4종 상품 가격 비교 테스트 |
| 규칙 구현으로 기존 주문 차단    | 고객 불편                | 새 규칙은 경고 우선, 차단은 점진 적용   |
| JSX→TSX 전환 시 빌드 실패       | 개발 중단                | 이번 리팩토링에서 TSX 전환은 제외       |
| PreviewBlock 공유 컴포넌트 수정 | Admin+Customer 동시 영향 | 변경 후 양쪽 UI 교차 테스트             |

---

## 8. Phase 1~4 분석 결론

### 시스템 평가

빌더 시스템은 **기능적으로는 완성도가 높지만, 코드 품질에 개선 여지가 상당합니다.** 특히:

1. **규칙 엔진(blockDefaults.ts)이 잘 설계되어 있어**, 미적용 규칙 12개를 추가할 명확한 구조가 이미 존재합니다.
2. **가격 엔진(priceEngine.ts)이 서버 전용으로 분리되어 있어**, 보안 아키텍처가 적절합니다.
3. **코드 중복(~614줄)과 데드 코드(~130줄)가 유지보수를 어렵게** 하고 있습니다.
4. **BlockSettings(2,007줄)와 PreviewBlock(1,259줄)의 거대 switch 문**은 새 블록 타입 추가 시 병목입니다.

### 리팩토링 범위

이번 리팩토링은 **기존 아키텍처 패턴을 유지**하면서 진행합니다:

- 블록 시스템 패턴 유지 (switch 문 구조는 유지, 중복만 제거)
- 파일 구조 유지 (새 파일 최소화)
- JSX 유지 (TSX 전환은 별도 프로젝트)
- DB 스키마 변경 없음

추가되는 것:

- 미적용 규칙 12개 구현
- 공통 컴포넌트/함수 추출 (PaperSelector, calculateFinishing 등)
- 상수 추출 (FIXED_DELIVERY_OPTIONS, PRICE_CONSTANTS 등)
- 버그 3건 수정

---

_Phase 4 완료. 분석 전체가 끝났습니다. 리팩토링 실행 준비가 되었습니다._
