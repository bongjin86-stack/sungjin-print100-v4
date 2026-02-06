# Admin Editor System Audit Report

> **분석 일자**: 2026-02-06
> **분석 도구**: bkit v1.5.0 (code-analyzer, design-validator, gap-detector)
> **프로젝트**: sungjin-print100-nagi v2

---

## 1. 현재 구조 분석

### 1.1 Admin Form 컴포넌트 현황

| 컴포넌트 | BlockNote | Style Controls | Live Preview | 용도 |
|----------|-----------|----------------|--------------|------|
| HeroForm.tsx | O | O (4개 슬라이더) | O | 메인 히어로 섹션 |
| AboutPageForm.tsx | O | X | X | About 페이지 |
| NewsForm.tsx | O | X | X | 공지사항 |
| WorksForm.tsx | O | X | X | 포트폴리오 |
| ServicesForm.tsx | X (textarea) | X | X | 서비스 설명 |
| FAQForm.tsx | X (textarea) | X | X | FAQ 답변 |
| PartnerLogosForm.tsx | X | X | X | 파트너 로고 |
| ProductBuilder | X (custom) | O (제한적) | O | 상품 설정 |
| *Manager.tsx (6개) | X | X | X | DB 엔티티 관리 |

### 1.2 에디터 사용 통계

- **BlockNote 사용률**: 5/9 폼 (56%)
- **Style Controls 사용률**: 1/9 폼 (11%) - HeroForm만
- **Live Preview 사용률**: 2/9 폼 (22%) - HeroForm, ProductBuilder

### 1.3 CSS 방법론 현황

```
현재 혼합 사용 중:
├── inline <style> 태그 (HeroForm, AboutPageForm)
├── JS style objects (일부 컴포넌트)
├── Tailwind classes (대부분)
├── tokens.css CSS variables (전역)
└── builder.css (ProductBuilder 전용)
```

---

## 2. 랜딩페이지 ↔ Admin 연동 현황 (2026-02-06 추가)

### 2.1 섹션별 데이터 흐름

| # | 랜딩 섹션 | 섹션 컴포넌트 | DB 테이블 | Admin 에디터 | 연동 상태 |
|---|-----------|---------------|-----------|--------------|-----------|
| 1 | Hero | HeroDB.astro | hero_settings | HeroForm | ✅ 완전 연동 |
| 2 | Partners | PartnersDB.astro | partner_logos | PartnerLogosForm | ✅ 완전 연동 |
| 3 | Service | Service.astro | services | ServicesForm | ✅ 완전 연동 |
| 4 | Works | WorksDB.astro | works | WorksForm | ✅ 완전 연동 |
| 5 | **About** | **About.astro** | **없음 (하드코딩)** | AboutPageForm (다른 페이지용) | ❌ 미연동 |
| 6 | News | News.astro | news | NewsForm | ✅ 완전 연동 |
| 7 | **CTA** | **CTA.astro** | **없음 (하드코딩)** | **없음** | ❌ 미연동 |

### 2.2 미연동 섹션 상세

#### About 섹션 (About.astro) - 라인 1-81
```astro
<!-- 현재: 하드코딩된 텍스트 -->
<p class="about-text">
  20년 경력의 인쇄 전문가가 운영하는<br />
  Sungjinprint입니다.<br />
  ...
</p>
```

**문제점**: `/about` 페이지용 AboutPageForm은 있지만, 랜딩페이지 About 섹션은 별개로 하드코딩됨

#### CTA 섹션 (CTA.astro) - 라인 1-111
```astro
<!-- 현재: 모든 내용 하드코딩 -->
<h2 class="cta-title">Contact</h2>
<span class="cta-subtitle">문의하기</span>
<p class="cta-text">견적 문의, 상담, 샘플 요청 등 무엇이든 편하게 문의해 주세요.</p>
<ul class="cta-list">
  <li class="cta-list-item">책자, 카탈로그, 브로슈어 인쇄를 의뢰하고 싶다</li>
  <li class="cta-list-item">대량 인쇄 견적을 받고 싶다</li>
  ...
</ul>
```

**문제점**: Admin 에디터 자체가 없음, 모든 텍스트 하드코딩

### 2.3 고정 요소 (Non-editable) 분석

각 섹션에서 **편집하면 안 되는 요소**:

| 섹션 | 고정 요소 |
|------|-----------|
| Hero | - (전부 편집 가능) |
| Partners | 슬라이더 애니메이션, 그레이스케일 효과 |
| Service | 아이템 번호(01, 02...), ArrowUpRightIcon, SectionTitle 레이아웃 |
| Works | "전체보기" 링크 텍스트, "자세히 보기" 버튼, SectionTitle 레이아웃 |
| About | SectionTitle 레이아웃, "회사소개" 버튼 |
| News | 날짜 포맷(YYYY.MM.DD), 카테고리 뱃지 스타일, SectionTitle 레이아웃 |
| CTA | 불릿(・) 스타일, 버튼 디자인 |

### 2.4 필요 조치

**1순위 (필수)**:
- [ ] About 섹션 DB 연동: `site_settings`에 `landing_about_text` 추가
- [ ] CTA 섹션 DB 연동: `landing_cta_*` 키들 추가 + CTASectionForm.tsx 생성

**2순위 (권장)**:
- [ ] `/admin/landing` 통합 관리 페이지 생성 (모든 랜딩 섹션 한 곳에서)

---

## 3. 에디터 방식 비교

### 2.1 5가지 접근법 분석

| 방식 | 설명 | 장점 | 단점 | 적합도 |
|------|------|------|------|--------|
| **A. 섹션별 폼** (현재) | 각 섹션마다 전용 Form 컴포넌트 | 구조화된 데이터에 적합, 유효성 검사 용이 | 일관성 부족, 코드 중복 | ★★★★☆ |
| **B. 풀페이지 에디터** | 전체 페이지를 하나의 에디터로 | 직관적, 통합 경험 | 복잡한 데이터 처리 어려움 | ★★☆☆☆ |
| **C. 컴포넌트 빌더** | 드래그앤드롭 블록 조립 | 유연성 최대, 재사용성 | 학습 곡선, 구현 복잡 | ★★★☆☆ |
| **D. 하이브리드** | A + B 조합 | 유연성과 구조 균형 | 복잡도 증가 | ★★★★☆ |
| **E. Figma 스타일** | 인라인 편집, 직접 조작 | 최고의 UX, 실시간 피드백 | 구현 비용 최대, 유지보수 복잡 | ★★☆☆☆ |

### 2.2 Figma 스타일 상세 분석

#### 장점
- 디자이너 친화적 인터페이스
- WYSIWYG 완벽 지원
- 직관적인 드래그, 리사이즈, 인라인 편집

#### 단점 (이 프로젝트에서)
- **인쇄 주문 시스템과 부적합**: 용지, 사이즈, 후가공 등 구조화된 데이터 필요
- **구현 비용**: 예상 128시간 (현재 대비 +51%)
- **유지보수 복잡도**: 커스텀 렌더링 엔진 필요
- **데이터 일관성**: 자유 레이아웃은 인쇄 규격과 충돌

#### Figma 스타일 적합 영역 (제한적)
- 랜딩 페이지 Hero 섹션
- 마케팅 배너
- About 페이지 일부

#### Figma 스타일 부적합 영역
- ProductBuilder (가격 계산, 옵션 의존성)
- 주문 관리 (구조화된 데이터)
- FAQ/공지사항 (텍스트 중심)

---

## 3. bkit 서브에이전트 분석 결과

### 3.1 code-analyzer 결과

```
┌─────────────────────────────────────┐
│ Quality Score: 68/100               │
├─────────────────────────────────────┤
│ ✓ 강점                              │
│   - 컴포넌트 분리 구조              │
│   - TypeScript 타입 정의            │
│   - Supabase 통합 일관성            │
│                                     │
│ ✗ 개선 필요                         │
│   - BlockNote 사용 불일치 (56%)     │
│   - Style controls 편중 (11%)       │
│   - CSS 방법론 혼재                 │
│   - 코드 중복 (폼 로직)             │
└─────────────────────────────────────┘
```

**주요 발견사항**:
1. HeroForm만 완전한 스타일 제어 기능 보유
2. ServicesForm, FAQForm은 textarea만 사용 (rich text 미지원)
3. 폼 검증 로직 중복
4. 에러 처리 패턴 불일치

### 3.2 design-validator 결과

```
┌─────────────────────────────────────┐
│ 권장 아키텍처                       │
├─────────────────────────────────────┤
│ 현재 방식 (A) 유지 + 선택적 (E)     │
│                                     │
│ • 인쇄 주문 = 구조화 폼 (유지)      │
│ • 랜딩 페이지 = Figma 스타일 (선택) │
│ • CMS 콘텐츠 = BlockNote 통일       │
└─────────────────────────────────────┘
```

**권장 사항**:
- ProductBuilder, Order 관련: 현재 구조 유지
- Hero/About: 선택적 인라인 편집 추가 고려
- News/Works/Services/FAQ: BlockNote 통일

### 3.3 gap-detector 결과

```
┌─────────────────────────────────────┐
│ Match Rate: 38% (Critical)          │
├─────────────────────────────────────┤
│ 설계 의도 vs 구현 현실 격차         │
│                                     │
│ • 에디터 일관성: 56%                │
│ • 스타일 제어: 11%                  │
│ • Live Preview: 22%                 │
│ • 코드 재사용: 45%                  │
└─────────────────────────────────────┘
```

---

## 4. Quick Wins (빠른 개선)

우선순위가 높고 ROI가 좋은 개선 사항:

| 순위 | 작업 | 예상 시간 | 영향도 | 난이도 |
|------|------|-----------|--------|--------|
| 1 | ServicesForm에 BlockNote 추가 | 2h | 높음 | 낮음 |
| 2 | FAQForm.answer에 BlockNote 추가 | 2h | 높음 | 낮음 |
| 3 | CSS 방법론 통일 (Tailwind 기준) | 3h | 중간 | 중간 |
| 4 | 폼 검증 로직 공통화 | 4h | 중간 | 중간 |
| 5 | 에러 처리 패턴 통일 | 2h | 낮음 | 낮음 |

**총 예상 시간**: 13시간

---

## 5. 최종 권고안

### 5.1 채택 전략

```
┌─────────────────────────────────────────────────────────┐
│ 권장: 점진적 통합 전략 (Incremental Unification)        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Phase 1 (Quick Wins)     Phase 2 (통합)     Phase 3    │
│  ┌───────────────────┐   ┌──────────────┐   ┌────────┐ │
│  │ BlockNote 확대    │ → │ CSS 통일     │ → │ 선택적 │ │
│  │ - Services        │   │ 폼 로직 공통화│   │ 인라인 │ │
│  │ - FAQ             │   │              │   │ 편집   │ │
│  └───────────────────┘   └──────────────┘   └────────┘ │
│       2주                    3주              선택적    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Figma 스타일에 대한 결론

> **결론**: 전면 도입 비권장, 선택적 적용 고려

**이유**:
1. 인쇄 주문 시스템의 핵심은 **구조화된 데이터 처리**
2. 용지, 사이즈, 후가공 옵션은 자유 레이아웃이 아닌 **규격화된 선택**
3. 구현 비용 대비 실질적 가치 낮음 (128h vs 13h Quick Wins)
4. Hero 섹션 등 마케팅 영역에만 선택적 적용 가치 있음

### 5.3 구현하지 말아야 할 것

- 전체 사이트 Figma 스타일 에디터
- ProductBuilder의 자유 레이아웃 전환
- 드래그앤드롭 페이지 빌더 (현재 필요 없음)

---

## 6. 다음 단계

### 즉시 실행 (이번 스프린트)

1. [ ] ServicesForm.tsx에 BlockNote 에디터 추가
2. [ ] FAQForm.tsx에 BlockNote 에디터 추가
3. [ ] CSS 방법론 가이드 문서화

### 단기 (1-2주)

4. [ ] 공통 폼 훅 추출 (`useAdminForm`)
5. [ ] 에러 처리 유틸리티 통일
6. [ ] 로딩 상태 컴포넌트 공통화

### 중기 (선택적)

7. [ ] HeroForm 인라인 편집 기능 확장 검토
8. [ ] About 페이지 비주얼 에디터 프로토타입

---

## 부록: 마이그레이션 비용 비교

| 전략 | 예상 시간 | ROI | 리스크 |
|------|-----------|-----|--------|
| Quick Wins만 | 13h | 최고 | 최저 |
| 통합 접근법 | 85h | 높음 | 중간 |
| Figma 스타일 전면 도입 | 128h | 낮음 | 높음 |

---

*이 문서는 bkit 서브에이전트 (code-analyzer, design-validator, gap-detector)의 분석 결과를 종합한 것입니다.*
