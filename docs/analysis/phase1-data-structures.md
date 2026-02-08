# Phase 1: 데이터 구조 및 타입 시스템 분석

**분석일:** 2026-02-08
**대상 파일:**

- `src/lib/builderData.ts` (947줄)
- `src/types/index.d.ts` (114줄)
- `src/data/rules.ts` (294줄)

---

## 1. 핵심 타입 계층 구조

빌더 시스템의 데이터 모델은 3개 계층으로 구성됩니다.

```
Template (상품 템플릿)
  └── Block[] (블록 배열)
        ├── 메타데이터: id, type, label, on, optional, locked, hidden
        └── BlockConfig (블록 설정)
              ├── 기본: options[], default
              ├── 용지: papers{code→weights[]}, default{paper, weight}
              ├── 인쇄: color, mono, single, double
              ├── 후가공: corner, punch, mising, coating{}, osi{}, fold{}
              ├── 제본: bindingType, linkedBlocks{}, pp{}, coverPrint{}, back{}, springColor{}
              └── 페이지: min, max, step

CustomerSelection (고객 선택값)
  ├── 단층 상품용: size, paper, weight, color, side, coating, coatingSide, delivery, qty
  ├── 제본 표지용: coverPaper, coverWeight, coverColor, coverCoating, coverCoatingSide
  ├── 제본 내지용: innerPaper, innerWeight, innerColor, innerSide, pages
  ├── 스프링용: pp, coverPrint, back, springColor
  ├── 후가공: finishing.{corner, punch, mising, osiEnabled, osi, foldEnabled, fold, coating, coatingType, coatingSide}
  └── 계산용: deliveryPercent, maxThickness, punchHoles
```

## 2. 블록 타입 카탈로그 (12종)

| 타입                 | 이름              | 용도                                  | 사용 템플릿                           |
| -------------------- | ----------------- | ------------------------------------- | ------------------------------------- |
| `size`               | 사이즈            | 출력 사이즈 선택                      | 전체                                  |
| `paper`              | 용지              | 용지 종류+평량 (표지/내지 겸용)       | 전체                                  |
| `print`              | 인쇄              | 컬러/흑백, 단면/양면                  | 전체                                  |
| `finishing`          | 후가공            | 코팅, 오시, 접지, 귀도리, 타공, 미싱  | 전단지, 무선, 중철                    |
| `delivery`           | 출고일            | 출고 일정+할증/할인                   | 전체                                  |
| `quantity`           | 수량              | 주문 수량                             | 전체                                  |
| `pages`              | 페이지 수         | 페이지 수 (min/max/step)              | 무선, 중철, 스프링                    |
| `pp`                 | PP                | 투명/불투명/없음                      | (미사용 - spring_options에 통합)      |
| `cover_print`        | 표지인쇄          | 없음/앞표지/앞뒤표지                  | (미사용 - spring_options에 통합)      |
| `back`               | 뒷판              | 뒷판 색상                             | (미사용 - spring_options에 통합)      |
| `spring_color`       | 스프링색상        | 스프링 색상                           | (미사용 - spring_options에 통합)      |
| `spring_options`     | 스프링 옵션       | pp+표지인쇄+뒷판+스프링색상 복합 블록 | 스프링                                |
| `inner_layer_saddle` | 내지(중철)        | 내지 용지+인쇄+페이지 (4p단위)        | (BLOCK_TYPES에만 정의, 템플릿 미사용) |
| `inner_layer_leaf`   | 내지(무선/스프링) | 내지 용지+인쇄+페이지 (1p단위)        | (BLOCK_TYPES에만 정의, 템플릿 미사용) |

### 발견사항: 미사용 블록 타입

`pp`, `cover_print`, `back`, `spring_color`는 `BLOCK_TYPES`에 정의되어 있으나, 실제 템플릿에서는 `spring_options` 복합 블록이 이 4가지를 통합 처리합니다. `inner_layer_saddle`과 `inner_layer_leaf`도 BLOCK_TYPES에만 존재하며 템플릿에서 사용되지 않습니다. 리팩토링 시 정리 대상입니다.

## 3. 상품 템플릿 비교 분석 (4종)

### 3.1 전단지 (flyer) - 6블록

```
size → paper → print → finishing(optional) → delivery → quantity
```

- 가장 단순한 단층 상품
- 후가공은 선택적(optional)
- 당일 출고 옵션 있음 (비활성화 상태, +30%)

### 3.2 무선제본 (perfect) - 9블록

```
size → [표지]paper → [표지]print(locked) → [표지]finishing → [내지]paper → [내지]print → pages → delivery → quantity
```

- 표지 인쇄: `locked: true, hidden: true` → 컬러/양면 고정
- 페이지: min=40, max=500, step=2, bindingType="leaf"
- `linkedBlocks`: 페이지 블록이 표지(id:2,3)와 내지(id:5,6) 블록을 참조
- 당일/1영업일 출고 불가 (2영업일부터)

### 3.3 중철제본 (saddle) - 9블록

```
size → [표지]paper → [표지]print(locked) → [표지]finishing(optional) → [내지]paper → [내지]print → pages → delivery → quantity
```

- 무선과 동일 구조, 차이점:
  - 표지 평량 낮음 (150~200 vs 200~300)
  - 페이지: min=8, max=48, **step=4** (4페이지 단위 = 중철 특성)
  - bindingType="saddle"
  - 내지 인쇄: 단면 불가 (`single: false`)
  - 후가공이 optional (무선은 필수)

### 3.4 스프링제본 (spring) - 7블록

```
size → spring_options → [내지]paper → [내지]print → pages → delivery → quantity
```

- `spring_options` 복합 블록이 PP/표지인쇄/뒷판/스프링색상을 통합
- 표지 용지는 `spring_options.coverPrint.papers`에 내장
- 별도 표지 finishing 블록 없음
- 페이지: min=10, max=400, step=2, bindingType="leaf"

## 4. BlockConfig 다형성 분석

`BlockConfig`는 블록 타입에 따라 매우 다른 필드를 사용합니다.

| 블록 타입      | 사용하는 config 필드                                             |
| -------------- | ---------------------------------------------------------------- |
| size           | `options[]`, `default` (string)                                  |
| paper          | `papers{}`, `default` ({paper, weight})                          |
| print          | `color`, `mono`, `single`, `double`, `default` ({color, side})   |
| finishing      | `corner`, `punch`, `mising`, `coating{}`, `osi{}`, `fold{}`      |
| delivery       | `options[]` (DeliveryOption[]), `default` (string)               |
| quantity       | `options[]` (number[]), `default` (number)                       |
| pages          | `min`, `max`, `step`, `default`, `bindingType`, `linkedBlocks{}` |
| spring_options | `pp{}`, `coverPrint{}`, `back{}`, `springColor{}`                |

### 발견사항: default 필드의 유니온 타입

`BlockConfig.default`의 타입이 `string | number | {paper, weight} | {color, side}`로 정의되어 있어, 사용 시 타입 가드가 필요합니다. 이는 현재 JSX 파일들이 TypeScript가 아닌 이유 중 하나일 수 있습니다.

## 5. 가격 데이터 구조 (DB 객체)

`builderData.ts`의 `DB` 객체는 서버 DB의 폴백용 하드코딩 데이터입니다.

### 비용 테이블 구조

| 테이블              | 키 구조                    | 비용 단위        |
| ------------------- | -------------------------- | ---------------- |
| `paperCosts`        | paper_code → weight → cost | 원/매            |
| `printCosts`        | 수량 구간(min~max) → cost  | 원/면            |
| `coatingCosts`      | type → side → cost         | 원/매            |
| `finishingSetup`    | type → cost (고정)         | 원/건            |
| `finishingVariable` | 수량 구간 → cost           | 원/매            |
| `osiVariable`       | 수량 구간 → cost/줄        | 원/매            |
| `foldVariable`      | 수량 구간 → cost/접        | 원/매            |
| `ppCosts`           | type → cost                | 원/부            |
| `backCosts`         | color → cost               | 원/부            |
| `springCosts`       | color → cost               | 원/부            |
| `sizeMultipliers`   | size_code → multiplier     | 배수 (A3=1 기준) |

### 가격 구간 체계

인쇄비, 후가공비, 오시비, 접지비 모두 **수량 구간별 단가 체감** 구조입니다.
예: 인쇄비 1부=500원 → 100부=200원 → 1000부=105원

## 6. 규칙 시스템 현황

`rules.ts`에 19개 규칙이 등록되어 있습니다.

### 적용 현황

| 상태                | 개수 | 비율 |
| ------------------- | ---- | ---- |
| applied (적용됨)    | 8    | 42%  |
| pending (미적용)    | 11   | 58%  |
| partial (부분 적용) | 0    | 0%   |

### 적용된 규칙 (8개)

| ID          | 규칙                                     | 구현 위치                                      |
| ----------- | ---------------------------------------- | ---------------------------------------------- |
| R001        | 오시 강제 (130g↑ + 접지 → 오시 자동추가) | `blockDefaults.ts` - `getFoldUpdate()`         |
| R002        | 코팅 평량 제한 (≤150g → 코팅 비활성화)   | `blockDefaults.ts` - `validateCoatingWeight()` |
| R-ST01      | 중철 두께 차단 (>2.5mm)                  | `blockDefaults.ts` - `checkThickness()`        |
| R-ST04      | 무선 두께 차단 (>50mm)                   | `blockDefaults.ts` - `checkThickness()`        |
| R-ST06      | 스프링 두께 차단 (>20mm)                 | `blockDefaults.ts` - `checkThickness()`        |
| BIND-FINISH | 제본 후가공 연동                         | `priceEngine.ts` - `calculateBindingPrice()`   |
| UI-001      | 옵션 1개 → 자동 잠금                     | `ProductBuilder` 토글 함수                     |
| UI-002      | 더블클릭 → 기본값 설정                   | `BlockSettings`                                |

### 미적용 규칙 - 리팩토링 시 구현 대상 (11개)

- **제본 제약:** 무선 코팅 단면(R003), 스프링 코팅 불가(R004), 중철 두께(R005), 내지 두께(R006), 무선 최소 페이지(R007)
- **스프링 자동화:** 표지 없음(R-SP01), PP표지(R-SP02), 일반표지(R-SP03)
- **후가공 호환:** 접지+귀도리 불가(R-PP01), 코팅+미싱 불가(R-PP02), 스프링+코팅 불가(R-PP03)
- **기타:** 페이지 수 제한(R-ST03)

## 7. types/index.d.ts 평가

이 파일은 사이트 전반의 CMS/UI 타입(Category, MenuItem, SiteConfig 등)을 정의하며, **빌더 시스템과 직접적인 관련이 없습니다.** 빌더 관련 타입은 모두 `builderData.ts`에 자체 정의되어 있습니다.

## 8. Phase 1 핵심 발견사항 요약

### 아키텍처 특성

1. **타입 자체 포함(self-contained):** 빌더 타입이 `builderData.ts`에 집중되어 있어 의존성이 단순합니다.
2. **템플릿 기반 상품 정의:** 4종 템플릿이 블록 조합으로 상품을 정의하는 구조입니다.
3. **BlockConfig 다형성:** 하나의 인터페이스가 모든 블록 타입의 설정을 담아 유연하지만, 타입 안전성이 낮습니다.

### 리팩토링 시 고려사항

1. **BlockConfig 분리:** 블록 타입별 discriminated union으로 전환하면 타입 안전성이 크게 향상됩니다.
2. **미사용 블록 타입 정리:** 6개 블록 타입(`pp`, `cover_print`, `back`, `spring_color`, `inner_layer_saddle`, `inner_layer_leaf`)이 템플릿에서 미사용입니다.
3. **미적용 규칙 11개:** 전체 규칙의 58%가 미구현 상태이며, 리팩토링 시 함께 구현해야 합니다.
4. **DB 폴백 데이터:** `builderData.ts`의 `DB` 객체와 실제 Supabase DB 간 동기화 전략이 필요합니다.

---

_Phase 2에서는 `blockDefaults.ts`, `priceEngine.ts`, `blockRenderer.ts`의 비즈니스 로직을 분석합니다._
