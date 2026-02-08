# Phase 3: UI 컴포넌트 계층 분석

**분석일:** 2026-02-08
**대상 파일:**

- `src/components/admin/ProductBuilder/index.jsx` (1,631줄)
- `src/components/admin/ProductBuilder/BlockSettings.jsx` (2,007줄)
- `src/components/shared/PreviewBlock.jsx` (1,259줄)

---

## 1. ProductBuilder/index.jsx — 메인 오케스트레이터

### 1.1 상태 관리 (16개 useState)

| 상태 변수                                             | 용도                       | 초기값                              |
| ----------------------------------------------------- | -------------------------- | ----------------------------------- |
| `templates`                                           | 전체 템플릿 목록           | localStorage 또는 DEFAULT_TEMPLATES |
| `currentTemplateId`                                   | 현재 선택된 템플릿 ID      | URL ?id= 또는 첫 번째               |
| `currentProduct`                                      | 현재 편집 중인 상품 데이터 | 템플릿에서 복사                     |
| `customer`                                            | 고객 선택값 (미리보기용)   | getDefaultCustomer()                |
| `selectedBlockId`                                     | 설정 패널이 열린 블록 ID   | null                                |
| `labelInput` / `descInput`                            | 블록 라벨/설명 편집        | ""                                  |
| `newQtyInput`                                         | 수량 추가 입력             | ""                                  |
| `showBlockLibrary`                                    | 블록 추가 모달 표시        | false                               |
| `editingTemplateId` / `editingTemplateName`           | 템플릿 이름 편집           | null / ""                           |
| `dbPapers` / `dbPapersList` / `dbWeights` / `dbSizes` | DB 용지 데이터             | {} / [] / null / null               |
| `dbLoaded` / `dbProductLoaded`                        | DB 로드 완료 플래그        | false                               |
| `imageUploading`                                      | 이미지 업로드 중           | false                               |
| `serverPrice` / `qtyPrices`                           | 서버 가격 계산 결과        | null / {}                           |

### 1.2 부수 효과 (7개 useEffect)

| useEffect           | 의존성                                       | 역할                                       |
| ------------------- | -------------------------------------------- | ------------------------------------------ |
| localStorage 저장   | `[templates]`                                | 템플릿 변경 시 localStorage 동기화         |
| DB 상품 로드        | `[urlProductId, dbProductLoaded, templates]` | URL ?id= 상품을 DB/localStorage에서 로드   |
| 초기 블록 기본값    | `[]`                                         | 마운트 시 customer 초기화                  |
| DB 용지 데이터 로드 | `[]`                                         | papers, weights, sizes 로드                |
| 서버 가격 계산      | `[customer, dbLoaded, currentTemplateId]`    | 300ms debounce로 /api/calculate-price 호출 |
| 블록 드래그앤드롭   | `[currentProduct?.id, blocks.length]`        | SortableJS 인스턴스 관리                   |
| 템플릿 드래그앤드롭 | `[templates.length]`                         | 템플릿 순서 변경                           |

### 1.3 핸들러 함수 분류 (20개+)

**템플릿 관리 (7개):**

- `selectTemplate`, `startEditTemplateName`, `finishEditTemplateName`
- `changeTemplateIcon`, `deleteTemplate`, `saveAsTemplate`, `updateCurrentTemplate`

**블록 관리 (8개):**

- `toggleBlock`, `toggleEdit`, `removeBlock`, `addBlock`
- `toggleSizeOption`, `togglePaper`, `toggleWeight`, `toggleArrayOption`

**수량 관리 (2개):** `addQty`, `removeQty`

**이미지 (2개):** `handleMainImageUpload`, `handleThumbnailUpload`

**설정 적용 (3개):** `applySettings`, `updateBlockProp`, `updateCfg`

**기타 (3개):** `handleFoldSelect`, `saveToStorage`, `exportConfig`

### 1.4 발견사항

#### 1.4.1 Supabase 저장 코드 중복

`updateCurrentTemplate` (672-702행)과 `saveToStorage` (1095-1125행)의 fetch 호출이 **거의 동일합니다.** 동일한 `/api/products` POST 요청, 동일한 body 구조. 차이는 성공 메시지뿐입니다.

#### 1.4.2 getDefaultConfig vs extractDefaultsFromBlocks 이중 매핑

- `getDefaultConfig` (755-876행): 새 블록 추가 시 기본 config 생성 — **index.jsx에 하드코딩**
- `extractDefaultsFromBlocks` (blockDefaults.ts): 블록 config → customer 초기값 매핑

두 함수가 같은 블록 타입을 다루지만 **서로 독립적으로 유지**되고 있어, 새 블록 타입 추가 시 양쪽 모두 수정해야 합니다.

#### 1.4.3 applySettings의 extractDefaults 부분 중복

`applySettings` (878-966행)은 단일 블록의 config.default를 customer에 반영합니다. 이 로직은 `extractDefaultsFromBlocks`의 **부분 집합**이지만, 별도로 구현되어 있어 규칙이 분산됩니다.

#### 1.4.4 개발용 console.log

`loadProductFromDB` 함수에 **10개의 console.log**가 남아있습니다 (276-375행). 프로덕션 코드에서 제거 대상입니다.

#### 1.4.5 getDefaultContent 하드코딩

43-147행에 4개 상품의 기본 콘텐츠(제목, 설명, 특징, 하이라이트)가 하드코딩되어 있습니다. `builderData.ts`로 이동하면 데이터 집중화가 가능합니다.

#### 1.4.6 컴포넌트 크기

단일 컴포넌트에 7가지 관심사가 혼재:

1. 템플릿 관리 (선택, 이름 편집, 아이콘, 삭제, 복사)
2. 블록 관리 (추가, 삭제, 순서 변경, ON/OFF)
3. 블록 설정 (config 업데이트, 옵션 토글)
4. 상품 콘텐츠 편집 (이미지, 제목, 설명, 특징)
5. 고객 미리보기 (customer 상태, 가격 표시)
6. DB 데이터 로딩 (용지, 사이즈, 가격)
7. 영속화 (localStorage + Supabase)

---

## 2. BlockSettings.jsx — 블록 설정 패널

### 2.1 구조

하나의 거대한 switch 문(42-2004행, 1,962줄)으로 14개 블록 타입을 처리합니다.

| case                                | 줄 수     | 설명                                                |
| ----------------------------------- | --------- | --------------------------------------------------- |
| size                                | 43-75     | 33줄, 사이즈 체크박스                               |
| paper                               | 77-166    | 89줄, 용지+평량 선택                                |
| pp                                  | 168-209   | 41줄, PP 옵션                                       |
| cover_print                         | 211-313   | 102줄, 표지인쇄+용지                                |
| print                               | 315-416   | 101줄, 컬러/면수                                    |
| finishing                           | 418-754   | 336줄, 코팅+오시+접지+귀도리+타공+미싱              |
| back                                | 756-782   | 26줄, 뒷판                                          |
| spring_color                        | 784-811   | 27줄, 스프링 색상                                   |
| spring_options                      | 813-1168  | **355줄**, 복합 옵션 (PP+표지+뒷판+스프링색상+용지) |
| delivery                            | 1170-1340 | 170줄, 출고일                                       |
| quantity                            | 1342-1386 | 44줄, 수량 관리                                     |
| pages/pages_saddle/pages_leaf       | 1388-1648 | 260줄, 페이지수+제본타입+연동블록                   |
| inner_layer_saddle/inner_layer_leaf | 1650-2000 | **350줄**, 내지 복합 블록                           |

### 2.2 발견사항

#### 2.2.1 자기 참조 변수 (잠재적 버그)

```javascript
const weights = dbWeights || weights; // line 38
const sizes = dbSizes || sizes; // line 39
```

`weights`와 `sizes`가 자신을 참조합니다. `dbWeights`가 null/undefined일 때 `weights`는 `undefined`가 됩니다 (ReferenceError는 아니지만 의도와 다를 수 있음). `DB.weights`와 `DB.sizeMultipliers`를 폴백으로 사용해야 할 것으로 보입니다.

#### 2.2.2 용지 선택 UI 4회 중복

용지+평량 선택 UI가 4곳에서 반복됩니다:

1. `paper` case (84-165행)
2. `cover_print` case (253-311행)
3. `spring_options` 내 표지 용지 (1088-1160행)
4. `inner_layer_*` 내 내지 용지 (1687-1753행)

각각 약 70-80줄씩, 총 **~300줄의 중복 코드**입니다. 공통 `PaperSelector` 컴포넌트로 추출 가능합니다.

#### 2.2.3 FIXED_DELIVERY_OPTIONS 중복 정의

출고일 옵션 4개가 `BlockSettings.jsx:1172-1177`과 `PreviewBlock.jsx:834-839`에 **동일하게 정의**되어 있습니다. 상수로 추출하여 공유해야 합니다.

#### 2.2.4 spring_options 템플릿 폴백 중복

`TEMPLATES.spring`에서 기본값을 가져오는 폴백 로직이 BlockSettings(813-847행)와 PreviewBlock(657-678행)에 **동일하게 존재**합니다.

---

## 3. PreviewBlock.jsx — 고객용 블록 UI

### 3.1 구조

하나의 switch 문(49-1257행, 1,208줄)으로 14개 블록 타입의 고객 UI를 렌더링합니다.

| case                                | 줄 수     | 설명                                       |
| ----------------------------------- | --------- | ------------------------------------------ |
| size                                | 50-69     | 19줄                                       |
| paper                               | 71-167    | 96줄, 용지 카드 + 이미지/스와치            |
| pp                                  | 169-188   | 19줄                                       |
| cover_print                         | 190-265   | 75줄, 표지인쇄 + 조건부 용지 선택          |
| print                               | 267-329   | 62줄, 컬러/면수 (inner/cover 자동 판별)    |
| finishing                           | 331-611   | **280줄**, 코팅+오시+접지+귀도리+타공+미싱 |
| back                                | 613-632   | 19줄                                       |
| spring_color                        | 634-654   | 20줄                                       |
| spring_options                      | 656-830   | **174줄**, PP라디오+셀렉트박스+조건부 용지 |
| delivery                            | 832-903   | 71줄, 영업일 계산+날짜 표시                |
| pages/pages_saddle/pages_leaf       | 905-983   | 78줄, ±버튼+입력필드+검증                  |
| inner_layer_saddle/inner_layer_leaf | 985-1208  | **223줄**, 용지+인쇄+페이지 복합           |
| quantity                            | 1210-1252 | 42줄, 가격 테이블                          |

### 3.2 발견사항

#### 3.2.1 용지 스와치 그라디언트 2회 중복

용지 이미지가 없을 때 표시되는 CSS 그라디언트 코드가 **2곳에서 동일하게 반복**됩니다:

- `paper` case (121-131행)
- `inner_layer_*` case (1036-1048행)

6가지 용지별 그라디언트 매핑이 인라인으로 하드코딩되어 있습니다.

#### 3.2.2 paper 블록의 표지/내지 판별 방식

```javascript
const isCoverPaper = block.label.includes("표지");
const isInnerPaper = block.label.includes("내지");
```

**블록 라벨 문자열에 의존**하여 표지/내지를 판별합니다 (72-73행). 라벨을 변경하면 기능이 깨집니다. `linkedBlocks` 참조로 판별하는 것이 안전합니다 (extractDefaultsFromBlocks에서는 이미 그렇게 합니다).

#### 3.2.3 back 블록 특수 처리 위치 불일치

`back` 블록의 `linkStatus.backDisabled` 처리가 switch 문 **밖**(35-47행)에 있고, 나머지 블록 타입은 switch 문 **안**에서 처리됩니다. 일관성이 부족합니다.

#### 3.2.4 inline setCustomer 패턴의 반복

거의 모든 이벤트 핸들러가 다음 패턴을 반복합니다:

```javascript
onClick={() => setCustomer((prev) => ({ ...prev, someField: value }))
```

이 패턴이 파일 전체에서 **50회 이상** 반복됩니다.

---

## 4. 3개 파일 간 교차 분석

### 4.1 데이터 흐름

```
ProductBuilder/index.jsx
  │
  ├── [상태] customer, currentProduct, templates, db*
  │
  ├── → BlockItem.jsx (블록 리스트 항목)
  │     └── → BlockSettings.jsx (설정 패널)
  │           └── updateCfg(), togglePaper(), etc. (props로 전달)
  │
  ├── → PreviewBlock.jsx (고객 미리보기)
  │     └── setCustomer() (props로 전달)
  │
  └── → PriceDisplay.jsx (가격 표시)
```

### 4.2 Props 전달 깊이

`index.jsx` → `BlockItem` → `BlockSettings` 경로에서 **14개 props**가 전달됩니다:
`block, updateCfg, updateBlockProp, toggleSizeOption, togglePaper, toggleWeight, toggleArrayOption, addQty, removeQty, newQtyInput, setNewQtyInput, allBlocks, dbPapersList, dbWeights, dbSizes`

이 중 대부분은 `index.jsx`의 상태 업데이트 함수입니다.

### 4.3 코드 중복 교차 매트릭스

| 중복 항목                        | 위치 1                  | 위치 2                  | 줄 수     |
| -------------------------------- | ----------------------- | ----------------------- | --------- |
| Supabase 저장                    | index.jsx:672-702       | index.jsx:1095-1125     | ~30줄 × 2 |
| 용지 선택 UI                     | BlockSettings 4곳       | —                       | ~300줄    |
| 용지 스와치 그라디언트           | PreviewBlock:121-131    | PreviewBlock:1036-1048  | ~12줄 × 2 |
| FIXED_DELIVERY_OPTIONS           | BlockSettings:1172-1177 | PreviewBlock:834-839    | 6줄 × 2   |
| spring_options 템플릿 폴백       | BlockSettings:813-847   | PreviewBlock:657-678    | ~20줄 × 2 |
| applySettings vs extractDefaults | index.jsx:878-966       | blockDefaults.ts:99-252 | ~88줄     |

**총 중복 추정: ~550줄**

---

## 5. Phase 3 핵심 발견사항 요약

### 아키텍처 특성

1. **단일 컴포넌트 과부하:** index.jsx가 7가지 관심사를 처리하며, 16개 상태 변수를 관리합니다.
2. **거대 switch 문:** BlockSettings(1,962줄)와 PreviewBlock(1,208줄)이 각각 하나의 switch로 구성됩니다.
3. **Props 드릴링:** 14개 props가 3단계(index → BlockItem → BlockSettings) 전달됩니다.
4. **블록 라벨 의존 판별:** paper 블록의 표지/내지 구분이 라벨 문자열에 의존합니다.

### 리팩토링 대상 목록

| 우선순위 | 항목                                            | 줄 수 절감    |
| -------- | ----------------------------------------------- | ------------- |
| **높음** | 용지 선택 컴포넌트 추출 (PaperSelector)         | ~300줄        |
| **높음** | Supabase 저장 함수 통합                         | ~30줄         |
| **높음** | FIXED_DELIVERY_OPTIONS 상수 추출                | 중복 제거     |
| **높음** | spring_options 폴백 로직 공유                   | ~20줄         |
| **높음** | BlockSettings.jsx:38-39 자기참조 변수 수정      | 버그 수정     |
| **중간** | 용지 스와치 그라디언트 맵 추출                  | ~12줄         |
| **중간** | applySettings → extractDefaults 통합            | ~88줄         |
| **중간** | paper 블록 표지/내지 판별을 linkedBlocks로 변경 | 안정성 향상   |
| **중간** | getDefaultConfig를 builderData.ts로 이동        | 데이터 집중화 |
| **중간** | console.log 10개 제거                           | 코드 정리     |
| **낮음** | back 블록 특수 처리를 switch 내부로 이동        | 일관성        |
| **낮음** | getDefaultContent를 builderData.ts로 이동       | 데이터 집중화 |

---

_Phase 4에서는 Phase 1~3의 발견사항을 종합하여 통합 아키텍처 문서와 리팩토링 작업 목록을 작성합니다._
