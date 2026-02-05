# 에러 리포트

> 최종 업데이트: 2026-02-05
> 대상: sungjin-print100-nagi (v2)

---

## ERR-001: 제본 상품 후가공 비용 0원 (Critical)

| 항목 | 내용 |
|------|------|
| **발견일** | 2026-02-05 |
| **커밋** | `d21c096` |
| **심각도** | Critical (가격 오류) |
| **상태** | 해결됨 |

### 증상
무선제본 상품에서 코팅을 선택해도 가격에 반영되지 않음.
모조지 80g, 100p, 컬러 양면, 표지 스노우 250g, 코팅 선택 시 코팅 비용 0원.

### 원인
`calculateBindingPrice()`에서 finishing block 비용 처리가 완전 누락.

- 빌더의 finishing block은 `customer.finishing.coating` 에 값을 설정
- `calculateBindingPrice()`는 `customer.coverCoating`만 읽음
- `customer.finishing.*` 키를 전혀 참조하지 않음
- **코팅, 오시, 접지, 귀도리, 타공, 미싱 전부 0원으로 계산됨**

### 수정
`priceEngine.ts` `calculateBindingPrice()` 에 섹션 5 (후가공) 추가:

```typescript
// 5. 후가공 (finishing block - 표지 후가공)
if (customer.finishing?.coating && !breakdown.coverCoating) { ... }
if (customer.finishing?.osiEnabled && customer.finishing?.osi > 0) { ... }
if (customer.finishing?.foldEnabled && customer.finishing?.fold > 0) { ... }
if (customer.finishing?.corner) { ... }
if (customer.finishing?.punch) { ... }
if (customer.finishing?.mising) { ... }
```

이중 계산 방지: `!breakdown.coverCoating` 조건으로 `customer.coverCoating`과 `customer.finishing.coating` 중복 적용 차단.

### 영향 범위
- 무선제본, 중철제본, 스프링제본 모든 제본 상품
- finishing block을 통한 후가공(코팅/오시/접지/귀도리/타공/미싱) 전부

---

## ERR-002: 출고일(deliveryPercent) 할인/할증 미반영 (Critical)

| 항목 | 내용 |
|------|------|
| **발견일** | 2026-02-05 |
| **커밋** | `decaaa1` |
| **심각도** | Critical (가격 오류) |
| **상태** | 해결됨 |

### 증상
출고일 옵션(당일/1일/2일/3일)을 변경해도 가격에 반영되지 않음.

### 원인
v1→v2 이식 시 `deliveryPercent` 값이 customer 객체에 전달되지 않았음.
ProductView.jsx에서 출고일 선택 핸들러가 `deliveryPercent` 키를 업데이트하지 않음.

### 수정
ProductView.jsx의 출고일 선택 핸들러에서 `deliveryPercent` 값을 customer 상태에 정상 반영.

### 영향 범위
- 모든 상품 타입 (단일 레이어 + 제본)
- 당일(+30%), 1영업일(+15%), 2영업일(0%), 3영업일(-5%)

---

## ERR-003: 하이라이트 아이콘 선택 시 사라짐 (Medium)

| 항목 | 내용 |
|------|------|
| **발견일** | 2026-02-05 |
| **커밋** | `812a59f` |
| **심각도** | Medium (UI 버그) |
| **상태** | 해결됨 |

### 증상
빌더에서 하이라이트 카드 아이콘을 클릭하면 하이라이트 전체가 사라짐.

### 원인
아이콘 선택 드롭다운 닫기 로직에서 DOM 타겟 오류:

```javascript
// 잘못된 코드
e.currentTarget.closest('.grid')  // 드롭다운의 grid-cols-5를 찾음
  .parentElement                   // 아이콘 wrapper div를 타겟
  .classList.add('hidden')         // 아이콘 자체를 숨김
```

`closest('.grid')`가 드롭다운 자체의 `grid grid-cols-5` 클래스를 매칭하여, 드롭다운이 아닌 아이콘 wrapper div에 `hidden`을 추가.

### 수정

```javascript
// 수정된 코드
e.currentTarget.parentElement.classList.add('hidden')
// 드롭다운 div만 정확히 타겟
```

---

## ERR-004: 빌더/상품페이지 후가공 버튼 크기 불일치 (Low)

| 항목 | 내용 |
|------|------|
| **발견일** | 2026-02-05 |
| **커밋** | `8e79494` |
| **심각도** | Low (UI 불일치) |
| **상태** | 해결됨 |

### 증상
상품페이지에서 후가공 섹션의 코팅 버튼과 오시/접지 버튼 크기가 다름.
빌더에서는 동일하게 보임.

### 원인 (2가지)

**1) flex:1 상속 문제**
`.pv-btn { flex: 1 }` 설정이 있는데, 코팅 버튼은 `pv-tooltip-wrap` div로 감싸져 있어 flex:1이 적용되지 않음. 오시/접지 버튼은 직접 flex:1 적용되어 늘어남.

**2) box-shadow 두께 차이**
`.pv-btn.active`에 `box-shadow: 0 0 0 1px #222828`이 있어 선택된 버튼이 미선택 버튼보다 약간 커 보임.

### 수정

```css
/* 후가공 버튼 flex 제거 */
.pv-finishing .pv-btn { flex: none; }

/* box-shadow 제거 (5개 선택자) */
.pv-btn.active,
.pv-btn-sm.active,
.pv-paper-item.active,
.pv-weight-btn.active,
.pv-delivery-btn.active { box-shadow: none; }
```

빌더에서도 `shadow-[0_0_0_1px_#222828]` Tailwind 클래스 3곳 제거.

---

## ERR-005: BlockNote SSR 에러 (Medium)

| 항목 | 내용 |
|------|------|
| **발견일** | 2026-02-04 |
| **커밋** | `f7b6940` |
| **심각도** | Medium (빌드 실패) |
| **상태** | 해결됨 |

### 증상
Astro SSR 빌드 시 BlockNote 에디터가 `window is not defined` 에러 발생.

### 원인
BlockNote는 브라우저 전용 라이브러리. Astro SSR 모드에서 서버 사이드 렌더링 시도.

### 수정
BlockNote를 사용하는 컴포넌트에 `client:only="react"` 디렉티브 적용.
Vite SSR 설정에 `noExternal: ['@toast-ui/editor', '@toast-ui/react-editor']` 추가.

---

## ERR-006: CSS Cascade Layers 충돌 (Critical)

| 항목 | 내용 |
|------|------|
| **발견일** | 2026-02-04 |
| **커밋** | `76e296c` |
| **심각도** | Critical (전체 스타일 깨짐) |
| **상태** | 해결됨 |

### 증상
Tailwind CSS 4 설치 후 모든 `m-*`, `p-*`, `border-*` Tailwind 유틸리티가 동작하지 않음.

### 원인
Tailwind v4는 `@layer` 시스템 사용. `global.scss`의 `* { margin: 0; padding: 0 }` 리셋이 unlayered로 선언되어 있어, 모든 layered CSS(Tailwind 유틸리티 포함)보다 우선순위가 높음.

**CSS 규칙**: unlayered CSS > ALL layered CSS (specificity 무관)

### 수정

```scss
// global.scss - 반드시 @layer base 안에 리셋 포함
@layer base {
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { ... }
}
```

### 교훈
Tailwind v4 프로젝트에서 기존 CSS 리셋/글로벌 스타일은 반드시 `@layer base`로 감싸야 함.
`:root` CSS 변수만 선언하는 파일(tokens.css)은 unlayered로 둬도 안전.

---

## 요약

| ID | 설명 | 심각도 | 상태 |
|----|------|--------|------|
| ERR-001 | 제본 후가공 비용 0원 | Critical | 해결 |
| ERR-002 | 출고일 할증 미반영 | Critical | 해결 |
| ERR-003 | 하이라이트 아이콘 사라짐 | Medium | 해결 |
| ERR-004 | 후가공 버튼 크기 불일치 | Low | 해결 |
| ERR-005 | BlockNote SSR 에러 | Medium | 해결 |
| ERR-006 | CSS Cascade Layers 충돌 | Critical | 해결 |
