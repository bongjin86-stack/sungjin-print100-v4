# sungjin-print100-nagi (v2)

## Project Overview

Online print ordering system (v2). Astro 5 SSR + React 19 interactive components.
Customers select paper, size, print options, upload files, and place orders.
Admin manages products via ProductBuilder, orders, and site content.

## Tech Stack

| Category        | Technology                                                  |
| --------------- | ----------------------------------------------------------- |
| Framework       | Astro 5 (SSR, `output: "server"`)                           |
| UI              | React 19 (`client:only="react"` for interactive components) |
| Styling         | Tailwind CSS 4 (CSS layers), SCSS                           |
| Backend         | Supabase (DB, Auth, Storage)                                |
| Deployment      | Vercel                                                      |
| Package Manager | pnpm                                                        |
| Editor          | BlockNote (rich text), Toast UI (markdown)                  |

## Development Workflow

1. Make changes
2. Build check: `pnpm build`
3. Lint: `pnpm lint`
4. Format: `pnpm format`
5. Dev server: `pnpm dev` (port 4321)

## Project Structure

```
src/
├── components/
│   ├── admin/           # Admin pages (React, client:only)
│   │   ├── ProductBuilder/  # Product creation/editing (index.jsx + 6 sub-modules)
│   │   ├── *Manager.tsx     # DB entity managers (Papers, Sizes, etc.)
│   │   └── *Form.tsx        # CMS content forms (Hero, About, etc.)
│   ├── product/         # Customer-facing product view
│   ├── order/           # Checkout, upload, order status
│   ├── edu100/          # Edu100 표지 갤러리 (CoverGallery, CoverModal)
│   ├── shared/          # Shared components (PreviewBlock, etc.)
│   ├── layout/          # Header, Footer, Navigation
│   ├── sections/        # Landing page sections
│   └── ui/              # Reusable UI components
│
├── lib/                 # Core business logic
│   ├── blockDefaults.ts # ⚠️ Block Rules Control Center (see below)
│   ├── priceEngine.ts   # Price calculation (ALL pricing logic here)
│   ├── dbService.ts     # DB data loading (cached)
│   ├── builderData.ts   # Product templates & types
│   ├── businessDays.ts  # Business day calculation
│   ├── orderService.ts  # Order CRUD
│   ├── shippingCalculator.ts  # Shipping cost
│   ├── packagingCalculator.ts # Packaging cost
│   ├── emailService.ts  # Order notification emails
│   ├── siteConfigService.ts   # Site settings
│   └── supabase.ts      # Supabase client (single instance)
│
├── pages/               # Astro pages (.astro files)
│   ├── admin/           # Admin routes
│   ├── product/         # Product detail pages
│   ├── api/             # API endpoints
│   └── *.astro          # Public pages
│
├── styles/              # Global styles
│   ├── global.css       # Tailwind imports (@layer)
│   ├── global.scss      # Reset (MUST be @layer base)
│   ├── tokens.css       # CSS custom properties (--c-*, --sp-*, --fs-*)
│   ├── fonts.css        # @font-face declarations
│   └── builder.css      # Admin builder styles (.admin-content scoped)
│
├── layouts/             # Astro layouts
├── config/              # Site configuration
├── data/                # Static data
└── types/               # TypeScript type definitions
```

## Critical Rules

### Never Create Duplicates

These are already implemented. Modify the existing files:

| Feature           | File                             | Notes                                   |
| ----------------- | -------------------------------- | --------------------------------------- |
| Block rules       | `src/lib/blockDefaults.ts`       | ALL block validation/linking rules here |
| Price calculation | `src/lib/priceEngine.ts`         | ALL pricing logic here (server-only)    |
| Shipping cost     | `src/lib/shippingCalculator.ts`  |                                         |
| Packaging cost    | `src/lib/packagingCalculator.ts` |                                         |
| Business days     | `src/lib/businessDays.ts`        | Holiday-aware                           |
| Order processing  | `src/lib/orderService.ts`        |                                         |
| DB connection     | `src/lib/supabase.ts`            | Single client instance                  |
| DB data loading   | `src/lib/dbService.ts`           | Cached lookups                          |

### CSS Cascade Layers - CRITICAL

- Tailwind v4 uses `@layer` (base/components/utilities)
- **Unlayered CSS beats ALL layered CSS** regardless of specificity
- `global.scss` MUST be wrapped in `@layer base { ... }`
- `tokens.css` (`:root` variables only) is safe unlayered
- `builder.css` variables scoped to `.admin-content` (not `:root`)

### ProductBuilder Structure

- `src/components/admin/ProductBuilder/index.jsx` — Main orchestrator (state, save, UI layout)
- Sub-modules imported by index.jsx:
  - `BlockItem.jsx` — Block list item + drag handle
  - `BlockSettings.jsx` — Block config panel (options, defaults, linkedPaper)
  - `BlockLibraryModal.jsx` — Block type picker modal (filters deprecated types)
  - `PaperSelector.jsx` — Reusable paper selection UI (extracted from BlockSettings)
  - `PriceDisplay.jsx` — Price preview
  - `ProductEditor.jsx` — Product content editor (images, highlights)
  - `TemplateSelector.jsx` — Product template selection
- `hooks/` — Custom hooks:
  - `useDbData.js` — DB data loading hook (papers, sizes, weights from Supabase)
  - `usePriceCalculation.js` — Price calculation hook (debounced API call, outsourced 클라이언트 계산)
  - `useImageUpload.js` — Supabase Storage 이미지 업로드
- `PreviewBlock.jsx` is in `shared/` (used by both Builder and ProductView)

### Astro + React Integration

- React components in `.astro` pages need `client:only="react"` directive
- Use `@/` path aliases (configured in tsconfig.json)
- SSR mode: `output: "server"` with Vercel adapter

### Block System Architecture - CRITICAL (블록 시스템 전체 구조)

블록은 이 시스템의 핵심 단위입니다. **모든 상품은 블록의 조합으로 구성됩니다.**

#### 블록이란?

블록 = 상품의 하나의 옵션 카테고리 (사이즈, 용지, 인쇄, 후가공 등).
관리자가 블록을 조합해 상품을 만들고, 고객이 각 블록에서 옵션을 선택합니다.

```
상품(Product) = 블록[] 배열
    ↓
블록(Block) = { id, type, label, on, optional, locked, hidden, config }
    ↓
고객 선택(customer state) = extractDefaultsFromBlocks(blocks)
    ↓
가격 계산 = fetch("/api/calculate-price", { customer, productType })
```

#### Block 인터페이스 (`builderData.ts`)

```typescript
interface Block {
  id: number;        // 블록 고유 ID (linkedBlocks에서 참조용)
  type: string;      // 블록 타입 (BLOCK_TYPES 키값)
  label: string;     // 관리자가 설정한 표시 이름
  on: boolean;       // 활성화 여부 (off면 추출/렌더링/가격 모두 제외)
  optional: boolean; // 고객이 선택적으로 토글 가능
  locked: boolean;   // 관리자 편집 잠금 (UI read-only)
  hidden: boolean;   // 고객 뷰에서 숨김 (가격에는 영향)
  config: BlockConfig; // 블록별 설정 (아래 참조)
}
```

#### 블록 타입 전체 목록 (18종)

**활성 블록 (현재 사용):**

| type | 이름 | 역할 | 설정하는 customer 키 |
|------|------|------|---------------------|
| `size` | 사이즈 | 출력 규격 선택 | `size` |
| `paper` | 용지 | 용지+평량 (role에 따라 cover/inner/default) | `paper`+`weight` 또는 `coverPaper`+`coverWeight` 또는 `innerPaper`+`innerWeight` |
| `print` | 인쇄 | 컬러/흑백, 단면/양면 (linkedBlocks에 따라 분기) | `color`+`side` 또는 `innerColor`+`innerSide` 또는 `coverColor` |
| `finishing` | 후가공 | 코팅, 오시, 접지, 귀도리, 타공, 미싱 | `finishing.*` (nested object) |
| `delivery` | 출고일 | 출고 일정 + 할증/할인 | `delivery`, `deliveryPercent`, `deliveryDate` |
| `quantity` | 수량 | 주문 수량 프리셋 | `qty` |
| `pages` | 페이지 | 제본 페이지 수 + 두께 제한 | `pages`, `maxThickness` |
| `spring_options` | 스프링 옵션 | PP/표지인쇄/뒷판/스프링색상 통합 | `pp`, `coverPrint`, `coverPaper`, `coverWeight`, `back`, `springColor` |
| `guide` | 가이드 | 고객 안내 질문 (가격 포함 가능) | `guides[blockId]` |
| `consultation` | 상담 | 카카오톡 상담 안내 (가격 무관) | — |
| `design_select` | 디자인 선택 | edu100 표지 디자인 선택 + 변경 타입 | `designTier`, `selectedDesign` |
| `text_input` | 텍스트 입력 | 자유 텍스트 입력란 | `textInputs[blockId]` |
| `books` | 시리즈(다권) | 권별 페이지/수량/필드 입력 | `books[]` |

**Deprecated 블록 (하위호환용, 신규 상품에 사용 금지):**

| type | 이름 | 대체 | 이유 |
|------|------|------|------|
| `pp` | PP | `spring_options.pp` | spring_options로 통합됨 |
| `cover_print` | 표지인쇄 | `spring_options.coverPrint` | spring_options로 통합됨 |
| `back` | 뒷판 | `spring_options.back` | spring_options로 통합됨 |
| `spring_color` | 스프링색상 | `spring_options.springColor` | spring_options로 통합됨 |
| `inner_layer_saddle` | 내지(중철) | `paper(role:inner)` + `print(linked)` + `pages` | 현대 패턴으로 대체 |
| `inner_layer_leaf` | 내지(무선/스프링) | `paper(role:inner)` + `print(linked)` + `pages` | 현대 패턴으로 대체 |

#### 블록 간 연결 메커니즘 — linkedBlocks (⚠️ 핵심)

제본 상품은 표지/내지를 구분해야 합니다. `pages` 블록의 `linkedBlocks`가 이 연결을 담당합니다.

```javascript
// pages 블록의 config.linkedBlocks 예시 (중철 템플릿)
linkedBlocks: {
  coverPaper: 2,    // Block ID 2 = 표지 용지 블록
  coverPrint: 3,    // Block ID 3 = 표지 인쇄 블록
  innerPaper: 5,    // Block ID 5 = 내지 용지 블록
  innerPrint: 6,    // Block ID 6 = 내지 인쇄 블록
}
```

**연결 흐름:**
1. `extractDefaultsFromBlock(paper블록)` → `getPaperBlockRole()` → cover/inner/default 판별
2. cover → `customer.coverPaper/coverWeight`, inner → `customer.innerPaper/innerWeight`
3. `extractDefaultsFromBlock(print블록)` → linkedBlocks 역추적 → innerPrint이면 `customer.innerColor/innerSide`
4. `mapPrintOptionsToCustomer()` → 고객이 변경한 인쇄옵션을 inner/cover에 매핑

**⚠️ linkedBlocks의 ID가 실제 블록 ID와 불일치하면 가격 계산이 깨집니다.**
블록을 삭제/재생성할 때 linkedBlocks 참조도 업데이트해야 합니다.

#### Paper 블록 Role 감지 — 4단계 폴백 (`getPaperBlockRole()`)

Paper 블록이 표지인지 내지인지 판별하는 로직. 4가지 패턴을 모두 지원합니다.

| 우선순위 | 감지 방법 | 적용 대상 |
|---------|----------|----------|
| 1 | `block.config.role === "cover" \| "inner"` (명시적) | 최신 상품 |
| 2 | 다른 블록의 `linkedBlocks.coverPaper/innerPaper === block.id` (역추적) | 현대 템플릿 |
| 3 | 활성 paper 블록이 2개 이상: 첫번째=cover, 두번째=inner (순서) | 멀티페이퍼 |
| 4 | `inner_layer_*` 블록 존재 시: paper 1개 = cover (구형 호환) | 레거시 상품 |
| fallback | 위 모두 해당 없음 → `"default"` | flyer (단층 상품) |

**⚠️ 이 함수를 건드리면 cover/inner 용지 매핑이 깨져서 가격이 틀어집니다.**

#### 4가지 블록 패턴 공존 (하위호환)

기존 상품 데이터를 깨뜨리지 않기 위해 4가지 블록 구성 패턴이 동시에 지원됩니다:

| 패턴 | 구조 | 사용처 | 상태 |
|------|------|--------|------|
| **1. 현대 linkedBlocks** | `pages` + `paper(cover)` + `paper(inner)` + `print` × 2 | 현재 템플릿 (saddle, perfect) | 표준 |
| **2. spring 통합** | `pages` + `paper(inner)` + `spring_options` | 현재 템플릿 (spring) | 표준 |
| **3. 구형 inner_layer** | `paper` + `inner_layer_saddle/leaf` | DB의 구형 상품 | deprecated |
| **4. 단층 (flyer)** | `paper` + `print` + `finishing` (linkedBlocks 없음) | 전단지, 리플렛 | 표준 |

**⚠️ `extractDefaultsFromBlock()`, `getPaperBlockRole()`, `inferProductType()` 모두 4가지를 처리합니다.**
패턴 하나를 삭제하면 해당 구형 상품의 가격 계산이 깨집니다.

#### CustomerSelection 인터페이스 (customer 객체 구조)

블록에서 추출된 고객 선택값. **가격 API에 전송되는 핵심 데이터.**

| 속성 | 타입 | 용도 | 설정하는 블록 |
|------|------|------|-------------|
| `size` | string | 사이즈 코드 | size |
| `paper`, `weight` | string, number | 용지/평량 (단층) | paper (role=default) |
| `coverPaper`, `coverWeight` | string, number | 표지 용지/평량 | paper (role=cover), spring_options.coverPrint |
| `innerPaper`, `innerWeight` | string, number | 내지 용지/평량 | paper (role=inner) |
| `color`, `side` | string, string | 인쇄 색상/면 (단층) | print (default) |
| `innerColor`, `innerSide` | string, string | 내지 인쇄 | print (linkedBlocks.innerPrint) |
| `coverColor` | string | 표지 인쇄 색상 | print (linkedBlocks.coverPrint) |
| `finishing` | object | 후가공 nested | finishing |
| `finishing.corner/punch/mising` | boolean | 귀도리/타공/미싱 | finishing |
| `finishing.coating/coatingType/coatingSide` | boolean/string | 코팅 | finishing |
| `finishing.osiEnabled/osi` | boolean/number | 오시 | finishing (getFoldUpdate 연동) |
| `finishing.foldEnabled/fold` | boolean/number | 접지 | finishing |
| `delivery`, `deliveryPercent` | string, number | 출고일 + 할증률 | delivery |
| `qty` | number | 수량 | quantity |
| `pages` | number | 페이지 수 | pages / pages_saddle / pages_leaf |
| `pp`, `coverPrint`, `back`, `springColor` | string | 스프링 옵션 | spring_options (또는 개별 deprecated 블록) |
| `guides[blockId]` | object | 가이드 선택 | guide (가격 영향) |
| `textInputs[blockId]` | string/object | 텍스트 입력 | text_input |
| `books[]` | array | 시리즈 권별 정보 | books |
| `designTier`, `selectedDesign` | string, any | 디자인 선택 | design_select |

#### spring_options 통합 블록 구조

4개 deprecated 블록(pp, cover_print, back, spring_color)을 1개로 통합한 복합 블록:

```javascript
config: {
  pp:          { enabled: true, options: [{ id: "clear", ... }, { id: "frosted", ... }] },
  coverPrint:  { enabled: true, options: [...], papers: {...}, defaultPaper: {...} },
  back:        { enabled: true, options: [{ id: "white", ... }, { id: "black", ... }] },
  springColor: { enabled: true, options: [{ id: "black", ... }, { id: "white", ... }] },
}
```

각 서브옵션은 `enabled` 플래그로 개별 활성화. `checkLinkRules()`가 PP+표지인쇄 상호 제약을 검증.

### Block Rules Control Center - CRITICAL

**ALL block validation, linking, and default-value rules live in `src/lib/blockDefaults.ts`.**
Do NOT scatter rules across PreviewBlock, ProductView, Builder, or any other file.

| Function                    | Purpose                                                 |
| --------------------------- | ------------------------------------------------------- |
| `extractDefaultsFromBlocks` | Block config → customer initial values                  |
| `extractDefaultsFromBlock`  | Single block config → customer value (used by above)    |
| `getPaperBlockRole`         | Paper block role detection (cover/inner/default)        |
| `checkLinkRules`            | Inter-block linking (back disable, PP+cover required)   |
| `checkThickness`            | Binding thickness limit validation                      |
| `validateCoatingWeight`     | Coating weight limit (<=150g disabled)                  |
| `getCoatingWeight`          | Determine coating reference weight from blocks/customer |
| `getFoldUpdate`             | Fold → osi auto-link                                    |
| `mapPrintOptionsToCustomer` | Print options → innerColor/coverColor mapping           |

**When adding a new rule:**

1. Add function to `blockDefaults.ts`
2. Update the JSDoc table at top of that file
3. Update this CLAUDE.md section
4. Add rule metadata to `src/data/rules.ts`
5. UI components consume via props (e.g., `linkStatus`) — never inline the logic

**Rule metadata catalog:** `src/data/rules.ts` (참조 문서 전용, 런타임 import 없음. 옵션 간 런타임 간섭이 있는 규칙만 기록)

### Pricing System

#### 가격 계산 분기 — 전체 흐름 (리팩토링 전 반드시 이해)

```
고객 선택 (customer state)
    │
    ├─ ProductView.jsx / usePriceCalculation.js
    │   │
    │   ├─ outsourced + outsourced_config 있음?
    │   │   └─ YES → 클라이언트 직접 계산 (API 안 거침)
    │   │          usePriceCalculation.js lines 61-93
    │   │          books 블록 있으면 시리즈별 개별 계산
    │   │
    │   └─ NO → fetch("/api/calculate-price")
    │            │
    │            ├─ outsourced (config DB 로드) → calculateOutsourcedPrice()
    │            ├─ flyer → calculateSingleLayerPrice()
    │            └─ binding → calculateBindingPrice()
    │                         ├─ calculateCoverCosts()
    │                         ├─ calculateInnerCosts()
    │                         ├─ calculateBindingSetupCost()
    │                         └─ calculateSpringExtras() (spring만)
    │
    ├─ + guidePriceTotal (3곳에서 합산 — 아래 참고)
    ├─ + fileSpecPrice (재단 사양 추가금, trimEnabled 시)
    └─ + designFee (edu100 표지 디자인 비용, designId 있을 때)
```

#### 가격에 영향을 주는 숨은 추가금 (놓치기 쉬움)

| 추가금 | 계산 위치 | 조건 | 설명 |
|--------|----------|------|------|
| **guidePriceTotal** | usePriceCalculation.js, ProductView.jsx, calculate-price API | guide 블록 on + 옵션 선택 시 | 3곳 모두 동일 로직으로 합산. 하나라도 빠지면 가격 불일치 |
| **fileSpecPrice** | usePriceCalculation.js → calculate-price API | `sizeBlock.config.trimEnabled` = true | `fileSpecPrices[customer.fileSpec]` 값. 사이즈 블록 config에 설정 |
| **designFee** | ProductView.jsx → create-order API | `?designId=` URL 파라미터 존재 시 | edu100 표지의 `design_fee`. `freeDesignMinQty` 이상이면 무료 |

**⚠️ 이 추가금들은 priceEngine.ts 밖에서 합산됩니다.** priceEngine만 보면 놓칩니다.

#### 주문 생성 가격 검증 (create-order.ts)

- 서버에서 priceEngine으로 재계산 후 제출 금액과 비교
- **3% 초과 차이 시 거부** (단, 제출 금액 > 서버 금액은 허용 — 단방향 검증)
- outsourced 상품도 서버 재계산 (DB의 outsourced_config 로드)
- guidePriceTotal, designFee 모두 서버 검증에 포함

#### 기본 키 매핑

- `innerColor`/`innerSide`: Binding products use these keys (NOT `color`/`side`)
- Binding finishing block sets `customer.finishing.*` fields
- Single-layer finishing also uses `customer.finishing.*`
- Delivery percent: +30% (same day), +15% (1 day), 0% (2 days), -5% (3 days)

#### priceEngine.ts 구조 (server-only)

- `PRICE_CONSTANTS`: `MONO_DISCOUNT_RATE`, `CORNER_BATCH_SIZE`, `DEFAULT_PUNCH_HOLES`
- Dispatch: `calculatePrice()` → product_type별 분기
- Flyer: `calculateSingleLayerPrice()` → `calculateFinishingCosts()`
- Binding: `calculateBindingPrice()` → `calculateCoverCosts()` + `calculateInnerCosts()` + `calculateBindingSetupCost()` + (spring: `calculateSpringExtras()`)
- 공통: `applyDeliveryAdjustment()`, `calculateCumulativeCost()` (후가공 구간별 누적)
- Thickness: `estimateThickness()`, `calculateBindingThickness()`, `validateBindingThickness()`
- **절대 클라이언트에서 import 금지** — server-only

#### builderData.ts 유틸

- `FIXED_DELIVERY_OPTIONS` — shared by BlockSettings + PreviewBlock (4개 출고 옵션)
  - 단, 템플릿별 활성화 옵션 다름: flyer=4종, 제본=2종(next2/3), outsourced=3종(next2/3/5)
- `getDefaultConfig()` / `getDefaultContent()` — block default configurations
- `getSpringOptionsDefaults()` — spring_options block fallback logic

#### 연간 유지보수

- `businessDays.ts` HOLIDAYS 배열: **공휴일 하드코딩** — 매년 초 수동 업데이트 필요
- `dbService.clearCache()`: 관리자가 가격 DB 수정 후 호출 필요 (API 재시작 or 명시 호출)

### Product Type Routing - CRITICAL (절대 주의)

**모든 상품은 DB `products.product_type`에 명시적 값이 설정되어야 합니다.**

| product_type | 가격 계산 함수 | 해당 상품 |
|-------------|---------------|----------|
| `"flyer"` | `calculateSingleLayerPrice()` | 리플렛, 전단지, 엽서 |
| `"perfect"` | `calculateBindingPrice("perfect")` | 무선제본 |
| `"saddle"` | `calculateBindingPrice("saddle")` | 중철제본 |
| `"spring"` | `calculateBindingPrice("spring")` | 스프링제본 |
| `"outsourced"` | 클라이언트 또는 서버 (아래 참조) | 윤전제본 |

**절대 금지 사항:**

1. **`product_type`을 null로 두지 마세요.** `inferProductType()` 폴백은 비상용입니다.
   블록 구성 변경(리팩토링)으로 추론이 깨지면 가격 계산이 완전히 틀어집니다.
   (2026-02 사고: product_type null → inferProductType이 제본을 flyer로 판별 → 가격 0원)

2. **블록 리팩토링 후 반드시 가격 검증하세요.**
   블록 타입 변경/통합 시 `getPaperBlockRole()`, `extractDefaultsFromBlock()`, `inferProductType()` 모두 영향받습니다.
   최소한 제본 3종(무선/중철/스프링) + 리플렛 가격 API 테스트를 해야 합니다.

3. **DB 상품 데이터를 임의로 변경하지 마세요.**
   빌더가 설정한 블록 config(용지 기본값, 옵션 목록 등)는 사업적 판단으로 결정된 값입니다.
   코드 버그와 데이터 오류를 반드시 구분하고, 데이터 변경은 사용자 확인 후에만 합니다.

4. **가격 계산 코드를 리팩토링할 때 5개 경로를 모두 테스트하세요:**
   - flyer: `size` + `paper` + `print` + `finishing`
   - perfect: `coverPaper/coverWeight` + `innerPaper/innerWeight` + `pages`
   - saddle: 위와 동일 (saddle 전용 내지 블록)
   - spring: `innerPaper/innerWeight` + `pages` + `spring_options`
   - outsourced: `outsourced_config` 클라이언트 계산 + `books` 블록 시리즈 계산

5. **가격 추가금 3종을 빠뜨리지 마세요:** guidePriceTotal, fileSpecPrice, designFee
   이 추가금들은 priceEngine 밖(hook, ProductView, API 레벨)에서 합산됩니다.
   리팩토링 시 3곳 모두 동기화해야 합니다.

### Product Type Safeguard System (5중 방어)

2026-02 사고 재발 방지를 위한 다층 방어 체계:

| Layer | 위치 | 방어 |
|-------|------|------|
| S1: 템플릿 기본값 | `builderData.ts` TEMPLATES | 5개 템플릿 모두 `product_type` 명시 |
| S2: UI 배지 | ProductBuilder 헤더 | 초록=명시, 노랑=추론, 호박=불일치 |
| S3: 저장 검증 | `saveProductToServer()` | 추론 시 확인, 불일치 시 경고 |
| S4: API 거부 | products API POST/PUT | null/invalid → 400 에러 |
| S5: 수동 오버라이드 | ProductBuilder 헤더 드롭다운 | 관리자가 직접 타입 설정 |

**TypeScript 진실 공급원:** `ProductType` union + `VALID_PRODUCT_TYPES` in `builderData.ts`

**리팩토링 체크리스트 (블록/가격 변경 후 필수):**
1. 5개 템플릿 `product_type` 존재 확인
2. `inferProductType()` 전체 블록 패턴 인식 확인
3. 가격 API 테스트: flyer + perfect + saddle + spring + outsourced
4. Builder 배지 색상 확인 (각 템플릿 초록)

**이식성 상세:** `docs/pricing-architecture.md` 참조

## Routing

| Path                      | Component           | Purpose                                                 |
| ------------------------- | ------------------- | ------------------------------------------------------- |
| `/`                       | Landing page        | Public homepage                                         |
| `/product/:id`            | ProductView         | Customer product page                                   |
| `/upload`                 | Upload              | File upload                                             |
| `/checkout`               | Checkout            | Order form                                              |
| `/order-complete`         | OrderComplete       | Order confirmation                                      |
| `/order/:uuid`            | CustomerOrderStatus | Order tracking                                          |
| `/admin`                  | Admin dashboard     | Admin area (auth required)                              |
| `/admin/login`            | Login page          | Admin authentication                                    |
| `/admin/builder`          | ProductBuilder      | Product creation/editing                                |
| `/admin/orders`           | AdminOrders         | Order management                                        |
| `/admin/products`         | Product list        | Product management                                      |
| `/admin/db/*`             | DB managers         | Papers, sizes, finishing, etc.                          |
| `/admin/settings`         | Site settings       | General settings                                        |
| `/edu100`                 | CoverGallery        | Edu100 표지 갤러리 (모달 + 필터)                        |
| `/api/edu100`             | API                 | Edu100 표지 CRUD (GET/POST)                             |
| `/api/edu100/:id`         | API                 | Edu100 단일 표지 (GET/PUT/DELETE)                       |
| `/admin/edu100`           | Admin               | Edu100 표지 관리                                        |
| `/api/calculate-price`    | API                 | Server-side price calculation (public, outsourced 포함) |
| `/api/create-order`       | API                 | Order creation with price verification (public)         |
| `/api/auth/set-cookies`   | API                 | httpOnly 쿠키 설정 (public POST)                        |
| `/api/auth/clear-cookies` | API                 | 쿠키 삭제 (public POST)                                 |

## Security (v2.3.0)

### Authentication Flow

- `src/middleware.ts` — Server-side JWT auth middleware
  - `/admin/*` (login 제외): 쿠키 검증 → 실패 시 `/admin/login` 리다이렉트
  - `/api/*` POST/PUT/DELETE/PATCH: 쿠키 또는 Authorization 헤더 검증 → 실패 시 401
  - 공개 쓰기 엔드포인트: `/api/calculate-price`, `/api/create-order`, `/api/auth/set-cookies`, `/api/auth/clear-cookies`
- Auth cookies: `sb-access-token`, `sb-refresh-token` (**httpOnly: true**, 서버 API 엔드포인트 경유)
  - 설정: `login.astro`, `AdminLayout.astro` → `POST /api/auth/set-cookies`
  - 삭제: `AdminLayout.astro` → `POST /api/auth/clear-cookies`
  - **document.cookie 직접 조작 금지** — XSS 토큰 탈취 방지
- 토큰 만료 시 refresh_token으로 자동 갱신 (middleware + AdminLayout onAuthStateChange)
- `upload.ts`: `supabaseAdmin.auth.getUser()` 실제 토큰 검증
- `products/index.ts`: `?all=1` 파라미터에 `getUser()` 토큰 유효성 검증

### Price Verification

- 주문 생성 시 서버에서 `priceEngine.ts`로 가격 재계산 (일반상품 + outsourced)
- outsourced 상품: `calculate-price.ts`에서 DB의 `outsourced_config` 로드 → 서버 재계산
- `outsourced_config`는 클라이언트에 **절대 노출 금지** (`product/[id].astro`에서 스트리핑)
- 제출 금액과 서버 계산 금액 비교 (3% 초과 차이 시 거부)
- guidePriceTotal: 모든 상품 타입에서 서버 가격 검증에 포함
- `Checkout.jsx` → `/api/create-order` → `priceEngine` / DB lookup → `orderService`

### Upload Security

- 파일 크기 30MB 제한, 확장자/MIME 화이트리스트, 경로 순회 방지
- 위험 MIME 우선 차단, 빈 MIME은 디자인 파일 확장자일 때만 허용

### Search & Query Security

- `orderService.ts` 검색: `%`, `_` 와일드카드 새니타이징
- `sortBy` 컬럼 화이트리스트: `ALLOWED_SORT_COLUMNS`
- `getOrderStatusCounts()`: `count:exact, head:true`로 1000행 제한 없이 카운트

## Documentation Management

### Master Change Log

**`CHANGELOG.md`** (프로젝트 루트) — 모든 버전별 변경 이력의 단일 관리 문서.
작업 완료 후 반드시 여기에 기록합니다.

### Document Index

**`docs/README.md`** — 모든 문서의 인덱스. 새 문서 추가 시 여기에 등록합니다.

### Key Documents

| 문서                        | 위치  | 역할                                         |
| --------------------------- | ----- | -------------------------------------------- |
| `CHANGELOG.md`              | 루트  | **마스터 변경 이력** (Keep a Changelog 형식) |
| `CLAUDE.md`                 | 루트  | AI/개발자 작업 지침서 (프로젝트 진입점)      |
| `docs/README.md`            | docs/ | 문서 인덱스 + 타임라인                       |
| `docs/rules-constraints.md` | docs/ | 규칙 마스터 문서 (사람이 읽는 상세 설명)     |
| `docs/pricing-system.md`    | docs/ | 가격 체계 완전 문서                          |
| `docs/pricing-architecture.md` | docs/ | 가격 시스템 아키텍처 + 이식성 가이드       |
| `src/data/rules.ts`         | src/  | 규칙 메타데이터 (코드 참조용)                |

### When to Update

| 이벤트         | 업데이트 대상                                                          |
| -------------- | ---------------------------------------------------------------------- |
| 새 버전 릴리즈 | `CHANGELOG.md`                                                         |
| 새 규칙 추가   | `blockDefaults.ts` + `rules.ts` + `rules-constraints.md` + `CLAUDE.md` |
| 새 문서 생성   | `docs/README.md` 인덱스에 등록                                         |
| 아키텍처 변경  | `CLAUDE.md` 해당 섹션                                                  |

## Edu100 (표지 갤러리)

교재인쇄 서비스 — 표지 갤러리 + 상품 연동 시스템.

### DB 테이블

- `edu100_covers` — 표지 데이터 (title, subtitle, description, image, thumbnails JSONB, tag, linked_product_id, is_published, sort_order)
- `thumbnails`: JSONB 배열, 최대 4개 (빌더와 동일한 메인 1 + 썸네일 4 포맷)

### 파일 구조

| 파일                                     | 역할                                                  |
| ---------------------------------------- | ----------------------------------------------------- |
| `src/components/admin/Edu100Form.tsx`    | 관리자 표지 등록/수정 폼 (빌더 동일 이미지 포맷)      |
| `src/components/edu100/CoverGallery.jsx` | 갤러리 모달 열기/닫기 (이벤트 위임)                   |
| `src/components/edu100/CoverModal.jsx`   | 표지 상세 모달 (이미지 네비게이션 + 설명 + 주문 링크) |
| `src/pages/edu100/[...page].astro`       | 고객 갤러리 페이지 + 모달 스타일                      |
| `src/pages/api/edu100/index.ts`          | GET (목록) / POST (생성)                              |
| `src/pages/api/edu100/[id].ts`           | GET / PUT / DELETE                                    |
| `src/pages/admin/edu100/*.astro`         | 관리자 CRUD 페이지                                    |

### 주요 동작

- 갤러리 카드 클릭 → CoverModal 열림 (메인 이미지 + 썸네일 네비게이션)
- "이 디자인으로 주문하기" → `/product/{linked_product_id}?designId={cover.id}`
- ProductView에서 `?designId` URL 파라미터 → edu100 API로 커버 fetch → 커버 이미지를 상품 이미지 자리에 표시
- 이미지 포맷: 메인 1 + 썸네일 4 (빌더/ProductView/Edu100Form/CoverModal 모두 동일)

### Outsourced 상품 가격

- `product_type === "outsourced"` → **2가지 경로:**
  1. `outsourced_config` 있음 → usePriceCalculation.js에서 **클라이언트 직접 계산** (API 안 거침)
  2. `outsourced_config` 없음 → 일반 상품처럼 `/api/calculate-price` 서버 계산
- `outsourced_config` 필드: `pagePrice`, `bindingFee`, `qtyDiscounts[]`
- `books` 블록 있으면: 시리즈별 개별 `pagePrice`/`bindingFee` 오버라이드 가능, `freeDesignMinQty` 지원
- guide 블록 가격은 guidePriceTotal에 합산
- 주문 시 create-order.ts에서 DB의 outsourced_config 로드 후 **서버 재검증**
- `outsourced_config`는 클라이언트에 **절대 노출 금지** (`product/[id].astro`에서 스트리핑)

## Supabase

- Access ONLY through `src/lib/supabase.ts`
- Never call `createClient` directly (예외: `middleware.ts`는 독립 인스턴스 사용)
- Environment variables in `.env.local`
