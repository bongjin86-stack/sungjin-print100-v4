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
  - `useDbData.js` — DB data loading hook
  - `usePriceCalculation.js` — Price calculation hook
- `PreviewBlock.jsx` is in `shared/` (used by both Builder and ProductView)

### Astro + React Integration

- React components in `.astro` pages need `client:only="react"` directive
- Use `@/` path aliases (configured in tsconfig.json)
- SSR mode: `output: "server"` with Vercel adapter

### Block Rules Control Center - CRITICAL

**ALL block validation, linking, and default-value rules live in `src/lib/blockDefaults.ts`.**
Do NOT scatter rules across PreviewBlock, ProductView, Builder, or any other file.

| Function                    | Purpose                                                 |
| --------------------------- | ------------------------------------------------------- |
| `extractDefaultsFromBlocks` | Block config → customer initial values                  |
| `extractDefaultsFromBlock`  | Single block config → customer value (used by above)    |
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

- `innerColor`/`innerSide`: Binding products use these keys (NOT `color`/`side`)
- Binding finishing block sets `customer.finishing.*` fields
- Single-layer finishing also uses `customer.finishing.*`
- Delivery percent: +30% (same day), +15% (1 day), 0% (2 days), -5% (3 days)
- `priceEngine.ts` is server-only — never import core pricing functions in client components
- `PRICE_CONSTANTS` at top of priceEngine.ts: `MONO_DISCOUNT_RATE`, `CORNER_BATCH_SIZE`, `DEFAULT_PUNCH_HOLES`
- Shared helpers: `calculateFinishingCosts()`, `applyDeliveryAdjustment()`
- Binding sub-functions: `calculateCoverCosts()`, `calculateInnerCosts()`, `calculateBindingSetupCost()`, `calculateSpringExtras()`
- `FIXED_DELIVERY_OPTIONS` in builderData.ts — shared by BlockSettings + PreviewBlock
- `getDefaultConfig()` / `getDefaultContent()` in builderData.ts — block default configurations
- `getSpringOptionsDefaults()` in builderData.ts — spring_options block fallback logic

### Product Type Routing - CRITICAL (절대 주의)

**모든 상품은 DB `products.product_type`에 명시적 값이 설정되어야 합니다.**

| product_type | 가격 계산 함수 | 해당 상품 |
|-------------|---------------|----------|
| `"flyer"` | `calculateSingleLayerPrice()` | 리플렛, 전단지, 엽서 |
| `"perfect"` | `calculateBindingPrice("perfect")` | 무선제본 |
| `"saddle"` | `calculateBindingPrice("saddle")` | 중철제본 |
| `"spring"` | `calculateBindingPrice("spring")` | 스프링제본 |
| `"outsourced"` | 클라이언트 직접 계산 | 윤전제본 |

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

4. **가격 계산 코드를 리팩토링할 때 4개 경로를 모두 테스트하세요:**
   - flyer: `size` + `paper` + `print` + `finishing`
   - perfect: `coverPaper/coverWeight` + `innerPaper/innerWeight` + `pages`
   - saddle: 위와 동일 (saddle 전용 내지 블록)
   - spring: `innerPaper/innerWeight` + `pages` + `spring_options`

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

- `product_type === "outsourced"` → 클라이언트에서 직접 계산 (priceEngine 안 거침)
- `outsourced_config`: pagePrice, bindingFee, qtyDiscounts 설정
- guide 블록 가격은 totalGuidePrice에 합산

## Supabase

- Access ONLY through `src/lib/supabase.ts`
- Never call `createClient` directly (예외: `middleware.ts`는 독립 인스턴스 사용)
- Environment variables in `.env.local`
