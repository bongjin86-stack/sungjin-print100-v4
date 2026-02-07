# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - 2026-02-07

### Refactored — 빌더 아키텍처 재설계 (5-Phase)

- **Phase 1**: 공용 함수 추출 — `blockDefaults.ts` 생성 (extractDefaults, checkLinkRules, getFoldUpdate, mapPrintOptions)
- **Phase 2**: 가격 계산 서버 경로 통일 — Builder도 `/api/calculate-price` 사용 (priceEngine 클라이언트 노출 제거)
- **Phase 3**: 두께 검증 공유 — `checkThickness()` 추출, ProductView 28줄→3줄, Builder에도 적용
- **Phase 4**: DB 기반 데이터 로딩 — `DB.weights`/`DB.sizeMultipliers` 하드코딩 → `getBuilderData()` DB 로딩으로 대체
- **Phase 5**: 스킵 (빌더 설정으로 이미 커버)

### Added — 규칙 제어센터

- `blockDefaults.ts`를 블록 규칙 단일 제어센터로 확립 (CLAUDE.md에 명시)
- `validateCoatingWeight` priceEngine → blockDefaults 이관
- 규칙 추가 체크리스트 JSDoc 문서화

### Fixed

- **[BUG] 코팅 200g 비활성 버그** — `linkedPaper` 설정 시 블록 못 찾으면 폴백 없이 80g 고정 → 자동감지 폴백 추가
- `getCoatingWeight()` 함수 추출 — PreviewBlock 인라인 코팅 평량 로직 → blockDefaults 이동 (단일 제어센터 원칙)
- 코팅 UI 겹침 — 비활성 시 옵션과 경고 동시 표시 수정
- 코팅 weight 판정 — 제본 상품은 `coverWeight`, 단층 상품은 `weight` 사용
- 오시(R001) 임계값 버그 — 150g→130g 수정 (rules.ts 규칙과 일치)
- PreviewBlock 중복 규칙 로직 제거 — `linkStatus` prop으로 통일
- 출고일 고정옵션, 두께계산 단면대응, UI 정렬 개선

### Removed

- `LINK_RULES` 미사용 export 삭제 (builderData.ts)
- `LinkRule` 미사용 인터페이스 삭제 (builderData.ts)
- `calculatePrice` 데드 prop 제거 (PreviewBlock)
- `validateCoatingWeight` priceEngine에서 제거 (blockDefaults로 이관)

### Documentation

- `CLAUDE.md` — Block Rules Control Center 섹션 추가, 문서 관리 가이드 추가
- ~~`docs/BUILDER_ANALYSIS_REPORT.md`~~ — 빌더 분석 보고서 (작성 후 삭제, CHANGELOG에 통합)
- ~~`docs/BUILDER_INTEGRATION_PLAN.md`~~ — 5단계 통합 계획서 (작성 후 삭제, CHANGELOG에 통합)
- `rules.ts` — 모든 `implementedIn` 필드 blockDefaults 기준으로 정확화

---

## [2.1.0] - 2026-02-07

### Security — 보안 강화

- **[CRITICAL] 서버사이드 인증 미들웨어** 구현 (`middleware.ts` 전면 재작성)
  - `/admin/*`: JWT 쿠키 검증 → 미인증 시 로그인 리다이렉트
  - `/api/*` POST/PUT/DELETE: 쿠키 또는 Authorization 헤더 검증 → 미인증 시 401
  - 토큰 만료 시 refresh_token 자동 갱신
- **[CRITICAL] API 인증 가드** — 18개 쓰기 엔드포인트 전부 미들웨어에서 보호
- **[CRITICAL] 주문금액 서버 재검증** — `/api/create-order` 엔드포인트에서 가격 재계산 후 비교
- **[CRITICAL] 업로드 보안 강화** — 파일 크기(30MB)/확장자/MIME 검증, 경로 순회 방지
- **[NEW] 서버사이드 가격계산** — `/api/calculate-price` 엔드포인트 (가격 공식 서버 보호)

### Added

- `src/pages/api/calculate-price.ts` — 서버사이드 가격 계산 API
- `src/pages/api/create-order.ts` — 가격 검증 포함 주문 생성 API
- `src/env.d.ts` — App.Locals TypeScript 타입 정의
- `docs/SECURITY_HARDENING_20260207.md` — 보안 강화 상세 보고서

### Changed

- `src/middleware.ts` — no-op → JWT 인증 미들웨어
- `src/pages/admin/login.astro` — 로그인 시 인증 쿠키 설정
- `src/layouts/AdminLayout.astro` — 쿠키 동기화 (토큰 갱신/로그아웃)
- `src/pages/api/upload.ts` — 파일 검증 로직 추가
- `src/components/order/Checkout.jsx` — 서버 API 경유 주문 생성
- `src/components/product/ProductView.jsx` — customerSelection 데이터 전달 추가

### Documentation

- ~~보안 감사 결과 리포트 (`docs/SECURITY_AUDIT_REPORT.md`)~~ (삭제됨, CHANGELOG에 통합)
- ~~보안 수정 가이드 (`docs/SECURITY_REMEDIATION_GUIDE.md`)~~ (삭제됨, CHANGELOG에 통합)
- ~~보안 강화 작업 보고서 (`docs/SECURITY_HARDENING_20260207.md`)~~ (삭제됨, CHANGELOG에 통합)

---

## [2.0.0] - 2026-02-05

성진프린트 인쇄 주문 시스템 v1→v2 마이그레이션 완료.
Nagi 기업 사이트 테마 위에 인쇄 주문 기능 전체 이식.

### Added - 인프라

- Supabase DB 서비스 레이어 이식 (`dbService.ts`, TypeScript)
- Tailwind CSS 4 설치 및 CSS cascade layers 구성
- Vercel SSR adapter 적용 (`output: "server"`)
- BlockNote 리치 텍스트 에디터 도입 (Toast UI 에디터에서 전환)
- Claude Code + bkit 프로젝트 설정 초기화 (`CLAUDE.md`, `.claude/settings.json`)

### Added - Admin 시스템

- DB 관리 UI 이식 (용지, 사이즈, 인쇄비, 후가공비, 제본비, 선계산가격)
- 사업장 정보 DB 연동 (Footer + Admin 설정)
- About 페이지 관리 (CEO/팀원/연혁 편집)
- Hero 섹션 줄 단위 텍스트 관리 (크기/자간/굵기/여백)
- Partner 로고 관리
- Services 섹션 DB 연동
- 대시보드 UI 개선 (스마트 빠른 작업 로직)

### Added - 상품 시스템

- 상품 빌더 시스템 이식 (`ProductBuilder/index.jsx`, 모놀리스)
- 가격 엔진 이식 (`priceEngine.ts`, TypeScript)
- 인쇄 규칙 관리 이식 (`rules.ts`)
- 영업일 계산 이식 (`businessDays.ts`)
- 하이라이트 카드 추가 (moo.com 스타일, 아이콘 선택 가능)
- 빌더/상품페이지 nagi 색상 팔레트 적용 (#222828 primary)

### Added - 주문 시스템

- 주문서 작성 이식 (`Checkout.jsx`, `CheckoutSections.jsx`)
- 파일 업로드 이식 (`Upload.jsx`)
- 주문 완료 페이지 이식 (`OrderComplete.jsx`)
- 주문 조회 이식 (`CustomerOrderStatus.jsx`)
- 주문 관리 Admin 이식 (`AdminOrders.jsx`, `OrderDetailModal.jsx`)
- 배송비/포장비 계산기 이식 (`shippingCalculator.js`, `packagingCalculator.js`)
- 주문 알림 이메일 이식 (`emailService.js`)

### Fixed

- 제본 상품 후가공 비용 누락 버그 수정 (`calculateBindingPrice`에 finishing block 미반영)
- 하이라이트 아이콘 선택 시 사라지는 버그 수정 (DOM 타겟 오류)
- 출고일(deliveryPercent) 할인/할증 미반영 버그 수정
- 빌더/상품페이지 스타일 불일치 수정 (box-shadow, 후가공 버튼 크기)
- 용지 관리 이미지 크기 제한 추가
- BlockNote SSR 에러 수정
- Hero 미리보기 이미지 잘림 수정
- 이미지 최적화 설정 수정 (noop 서비스)

### Changed

- v1 JavaScript → v2 TypeScript 전환 (priceEngine, builderData, businessDays, dbService, supabase)
- Apple Blue (#0071E3) → nagi 팔레트 (#222828) 색상 변경
- 뉴스 카테고리 한국어화
- 전체 사이트 한국어 로컬라이제이션

### Documentation

- 가격 체계 완전 문서 (`docs/pricing-system.md`)
- 연동 규칙/제한사항 문서 (`docs/rules-constraints.md`)
- DB 마이그레이션 완료 보고서
- DB 관리 시스템 이식 보고서
- ~~에러 리포트 (`docs/error-report.md`)~~ (삭제됨, CHANGELOG에 통합)

---

## [1.0.3] - 2026-01-27

### Changed

- Updated Astro from 5.16.6 to 5.16.15 ([see Astro changelog](https://github.com/withastro/astro/blob/main/packages/astro/CHANGELOG.md#51615))
- Updated @astrojs/sitemap from 3.6.0 to v3.7.0([see @astrojs/sitemap changelog](https://github.com/withastro/astro/blob/main/packages/integrations/sitemap/CHANGELOG.md#370))

### Fixed

- Custom `className` is now correctly applied in SiteLogo component
- Adjusted `z-index` of `footer-logo` to ensure it stays below navigation layers

## [1.0.2] - 2026-01-06

### Changed

- Updated border-radius design tokens to use standard rem values
- Added intermediate radius tokens (3xl: 20px, 6xl: 40px) for better design flexibility
- Adjusted all component border-radius values to align with new token system (±1.6px maximum change)

## [1.0.1] - 2025-12-21

### Changed

- Updated Astro from 5.16.0 to 5.16.6 ([see Astro changelog](https://github.com/withastro/astro/blob/main/packages/astro/CHANGELOG.md#5166))

### Fixed

- Limited works display on homepage to 4 items for better layout consistency

## [1.0.0] - 2025-12-07

Initial release of Nagi Inc. corporate website.

### Features

#### Pages

- **Homepage**: Hero section, services overview, works showcase, partner logos, and CTA
- **About Page**: Company introduction and team information
- **Company Page**: Detailed business information and company profile
- **Services Page**: Service descriptions with FAQ section
- **Works Page**: Portfolio listing with case studies
- **Work Detail Pages**: Individual project showcases
- **News Page**: News articles listing
- **News Detail Pages**: Individual news articles
- **Contact Page**: Contact form with validation
- **Contact Completion Page**: Thank you page after form submission
- **404 Page**: Custom error page
- **Privacy Policy Page**: Privacy policy information

#### Technical Features

- **Responsive Design**: Mobile-first approach with breakpoints at 600px and 900px
- **View Transitions**: Smooth page navigation using Astro View Transitions
- **Animation System**: Scroll-based reveal animations with customizable delays
- **SEO Optimization**:
  - Proper meta tags (title, description, OGP, Twitter Cards)
  - Canonical URLs
  - Schema.org structured data (Organization, WebSite)
  - Sitemap generation
- **Google Analytics**: Integration ready with configurable tracking ID
- **Accessibility**: Proper semantic HTML and ARIA labels
- **Performance**: Optimized images with WebP format and responsive loading

#### Design System

- **CSS Custom Properties**: Design tokens for colors, spacing, typography
- **SCSS Modules**: Component-scoped styling
- **Typography**: Google Fonts integration (Noto Sans JP, Outfit)
- **Iconography**: Custom SVG icons
- **Color Scheme**: Professional dark theme with primary accent colors

[1.0.3]: https://github.com/yohaku-theme/nagi/releases/tag/v1.0.3
[1.0.2]: https://github.com/yohaku-theme/nagi/releases/tag/v1.0.2
[1.0.1]: https://github.com/yohaku-theme/nagi/releases/tag/v1.0.1
[1.0.0]: https://github.com/yohaku-theme/nagi/releases/tag/v1.0.0
