# 보안 강화 작업 보고서

**작업 일시**: 2026-02-07
**작업자**: Claude Opus 4.6 + bkit (4-agent 병렬 분석)
**이전 커밋**: `e0171b8`

---

## 1. 배경

2026-02-07 전체 보안 감사를 실시했습니다. bkit 에이전트 4개를 병렬 가동하여 코드베이스를 분석한 결과:

| 에이전트 | 점수 | 역할 |
|---|---|---|
| code-analyzer | 32/100 | 취약점 식별 (20개 발견) |
| gap-detector | 13% match | 보안 모범 사례 대비 구현 상태 |
| design-validator | 28/100 | 보안 설계 문서 검증 |
| qa-monitor | 18개 취약점 | 런타임 보안 이슈, 보안 문서 자동 생성 |

### 발견된 취약점 요약

| 심각도 | 개수 | 주요 항목 |
|---|---|---|
| CRITICAL | 6 | API 무인증, 미들웨어 무작동, 주문금액 무검증, 가격엔진 노출, 업로드 무인증, 키 하드코딩 |
| HIGH | 5 | Stored XSS, 주문데이터 무인증, Raw body 삽입, 자가등록→관리자, 배송/포장비 노출 |
| MEDIUM | 6 | CORS, CSRF, Rate Limiting, isAdmin 구현, env 불일치, allowedHosts 와일드카드 |
| LOW | 4 | 에러메시지 노출, 파일크기 서버미검증, 주문번호 예측, 소스맵 |

---

## 2. 이번 작업에서 해결한 항목 (5개)

### 2.1 [CRITICAL] 서버사이드 인증 미들웨어 구현

**파일**: `src/middleware.ts` (전면 재작성)

**이전**: 미들웨어가 no-op (모든 요청 통과)
```typescript
// 이전
export const onRequest = defineMiddleware(async (_context, next) => {
  return next();
});
```

**이후**: JWT 기반 서버사이드 인증
- `/admin/*` (login 제외): 세션 쿠키 검증 → 실패 시 `/admin/login` 리다이렉트
- `/api/*` POST/PUT/DELETE/PATCH: 세션 쿠키 또는 Authorization 헤더 검증 → 실패 시 401
- 공개 엔드포인트 예외: `/api/calculate-price`, `/api/create-order`
- 토큰 만료 시 refresh_token으로 자동 갱신 + 쿠키 업데이트

**효과**: 관리자 페이지와 API 쓰기 작업이 인증 없이 접근 불가

---

### 2.2 [CRITICAL] API 인증 가드 (전체 POST/PUT/DELETE 보호)

**파일**: `src/middleware.ts` (위와 동일 — 미들웨어 레벨에서 일괄 처리)

**관련 파일**:
- `src/pages/admin/login.astro` — 로그인 성공 시 `sb-access-token`, `sb-refresh-token` 쿠키 설정
- `src/layouts/AdminLayout.astro` — `onAuthStateChange` 리스너로 토큰 갱신 시 쿠키 동기화, 로그아웃 시 쿠키 제거

**보호되는 엔드포인트** (18개):
- `/api/products`, `/api/news`, `/api/faq`, `/api/services`, `/api/works`
- `/api/team`, `/api/values`, `/api/history`
- `/api/settings`, `/api/upload`
- 각각의 `[id]` 하위 엔드포인트 포함

**효과**: 인증 없는 API 호출 시 `401 Unauthorized` 반환

---

### 2.3 [CRITICAL] 주문금액 서버사이드 재검증

**새 파일**: `src/pages/api/create-order.ts`

**이전**: 클라이언트가 `sessionStorage`에서 가격을 읽어 `createOrder()`에 직접 전달 → 브라우저에서 가격 조작 가능

**이후**: 주문 생성 흐름 변경
1. 클라이언트가 `/api/create-order`에 주문 데이터 + 가격 입력값 전송
2. 서버가 `priceEngine.ts`로 가격 재계산
3. 제출된 금액과 서버 계산 금액 비교 (3% 이상 차이 시 거부)
4. 서버 계산 금액으로 주문 저장

**변경된 파일**:
- `src/components/order/Checkout.jsx` — `createOrder()` 직접 호출 → `createOrderViaApi()` (서버 API 경유)
- `src/components/product/ProductView.jsx` — sessionStorage에 `customerSelection` 추가 (서버 재계산용)

**효과**: sessionStorage 조작으로 가격 변조 불가

---

### 2.4 [CRITICAL] 업로드 보안 강화

**파일**: `src/pages/api/upload.ts` (전면 재작성)

**추가된 검증**:

| 항목 | 이전 | 이후 |
|---|---|---|
| 인증 | 없음 | 미들웨어에서 JWT 검증 |
| 파일 크기 | 없음 (서버측) | 30MB 제한 |
| 파일 확장자 | 없음 | 화이트리스트 (jpg, png, pdf, ai, eps, psd, zip 등 13종) |
| MIME 타입 | 없음 | 화이트리스트 + 위험 타입 차단 (html, javascript, executable) |
| 폴더 경로 | 사용자 입력 그대로 사용 | 허용 폴더 화이트리스트 + 특수문자 제거 (경로 순회 방지) |
| 에러 노출 | Supabase 에러 메시지 그대로 반환 | 일반적인 에러 메시지만 반환 |

**효과**: 악성 파일 업로드, 경로 순회 공격, 무인증 업로드 차단

---

### 2.5 [NEW] 서버사이드 가격계산 엔드포인트

**새 파일**: `src/pages/api/calculate-price.ts`

**용도**: 클라이언트가 가격 공식을 직접 사용하는 대신 서버 API를 호출하여 가격을 받을 수 있는 엔드포인트

**엔드포인트**: `POST /api/calculate-price`
- Request: `{ customer: CustomerSelection, qty: number, productType: string }`
- Response: `{ total, breakdown, perUnit, sheets, faces, ... }`

**효과**: 향후 ProductView에서 클라이언트 측 priceEngine import을 제거하고 이 API로 전환 가능. 현재는 주문 생성 시 서버 검증용으로 사용.

---

## 3. 새로 생성된 파일

| 파일 | 용도 |
|---|---|
| `src/pages/api/calculate-price.ts` | 서버사이드 가격 계산 엔드포인트 |
| `src/pages/api/create-order.ts` | 가격 검증 포함 주문 생성 엔드포인트 |
| `src/env.d.ts` | `App.Locals.user` TypeScript 타입 정의 |

## 4. 수정된 파일

| 파일 | 변경 내용 |
|---|---|
| `src/middleware.ts` | 전면 재작성: 서버사이드 JWT 인증 |
| `src/pages/admin/login.astro` | 로그인 성공 시 인증 쿠키 설정 |
| `src/layouts/AdminLayout.astro` | 쿠키 동기화 (토큰 갱신/로그아웃) |
| `src/pages/api/upload.ts` | 파일 검증 (크기/확장자/MIME/경로) 추가 |
| `src/components/order/Checkout.jsx` | 서버 API 경유 주문 생성으로 전환 |
| `src/components/product/ProductView.jsx` | customerSelection 데이터 전달 추가 |

---

## 5. 아직 남은 보안 항목 (후속 작업)

| 우선순위 | 항목 | 상태 |
|---|---|---|
| HIGH | Supabase 하드코딩 키 제거 (`supabase.ts` fallback) | 미완 |
| HIGH | Stored XSS 방지 (`blockRenderer.ts` sanitizer) | 미완 |
| HIGH | ProductView에서 priceEngine 클라이언트 import 제거 | 미완 (API 엔드포인트는 준비됨) |
| MEDIUM | 보안 헤더 추가 (`vercel.json` CSP, X-Frame-Options) | 미완 |
| MEDIUM | `robots.txt`에 `/admin` Disallow + noindex 메타태그 | 미완 |
| MEDIUM | CSRF 보호 (Origin/Referer 체크) | 미완 |
| MEDIUM | Supabase RLS 정책 확인/강화 | 미완 |
| MEDIUM | Rate Limiting (API 엔드포인트) | 미완 |
| LOW | 환경변수 불일치 수정 (VITE_ vs PUBLIC_) | 미완 |
| LOW | Supabase 자가 가입 비활성화 확인 | 미완 |

---

## 6. 보안 점수 변화 (예상)

| 항목 | 이전 | 이후 |
|---|---|---|
| 서버사이드 인증 | 0% | ~90% |
| API 인증 | 0% (18개 무방비) | ~85% (미들웨어 보호) |
| 주문금액 검증 | 0% | ~95% (서버 재계산) |
| 업로드 보안 | ~10% | ~80% (검증 + 인증) |
| 가격 서버 분리 | 0% | ~60% (API 준비, 클라이언트 전환 미완) |
| **종합 예상** | **13%** → | **~55%** |

> 완전한 보안 점수(90%+)를 달성하려면 5번 항목의 후속 작업이 필요합니다.
