# Pre-Launch Checklist

> 런칭 전에 반드시 처리할 항목. 개발 중에는 무시.
> 최종 업데이트: 2026-02-07

---

## 보안 (런칭 전 필수)

- [ ] **RBAC 추가** — middleware.ts에서 `user.app_metadata.role === 'admin'` 검증 (현재 인증만 확인, 역할 미확인)
- [ ] **httpOnly 쿠키** — middleware.ts `httpOnly: false` → `true` 전환 (login.astro, AdminLayout.astro 쿠키 접근 방식 리팩터 필요)
- [ ] **upload.ts 인증** — `!!accessToken` → `getUser(accessToken)` 실제 검증
- [ ] **API 입력 화이트리스트** — history, team, values 엔드포인트 raw body → 필드 destructure
- [ ] **배송비 서버 검증** — create-order.ts에서 shippingCost/quickCost 서버 재계산
- [ ] **주문번호 충돌 방지** — Math.random 4자리 → DB sequence 또는 UUID
- [ ] **Rate limiting** — upload, create-order, calculate-price 최소 적용
- [ ] **.env 히스토리 확인** — `git log --all -- .env` 로 커밋 이력 체크, 있으면 키 로테이션

## 안정성 (런칭 전 권장)

- [ ] **siteConfigService.ts 테이블명** — updateConfig `site_config` → `site_settings` 통일
- [ ] **emailService.ts** — no-op → 실제 이메일 전송 구현 (Resend API)
- [ ] **blockDefaults.ts 방어코딩** — `productType || ''`, `customer?.innerWeight` optional chaining
- [ ] **estimateThickness** 중복 — priceEngine vs packagingCalculator 통합

## 문서 동기화 (런칭 전 정리)

- [ ] rules.ts에 BIND-FINISH 규칙 추가
- [ ] pricing-system.md 배송비/포장비 "미구현" 삭제
- [ ] 두께 계수 문서 업데이트 (art/snow 0.0009, mojo/inspirer/rendezvous 추가)
- [ ] R-ST02/05/07 status → `partial` (경고 임계값 미구현)
- [ ] CHANGELOG v2.0.0 확장자 .js → .ts
- [ ] rules-constraints.md R-ST 표 함수명 수정
- [ ] ProductBuilder README.md 확장자 .js → .ts
- [ ] CLAUDE.md lib 파일 4개 추가
