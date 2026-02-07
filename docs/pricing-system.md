# 가격 체계 완전 문서

> 최종 업데이트: 2026-02-05
> 대상: sungjin-print100-nagi (v2)

---

## 관련 파일

| 파일 | 역할 |
|------|------|
| `src/lib/priceEngine.ts` | 가격 계산 엔진 (핵심) |
| `src/lib/dbService.ts` | DB 데이터 로딩 + 조회 함수 |
| `src/lib/builderData.ts` | 상품 템플릿 + CustomerSelection 타입 |
| `src/lib/businessDays.ts` | 영업일/출고일 계산 |
| `src/lib/blockDefaults.ts` | 블록 규칙 제어센터 (코팅 제한, 오시 강제 등) |
| `src/data/rules.ts` | 규칙 메타데이터 카탈로그 (읽기 전용) |

---

## 1. 전체 흐름

```
고객 선택 (CustomerSelection)
    ↓
calculatePrice(customer, qty, productType)
    ├── 전단/리플릿/엽서 → calculateSingleLayerPrice()
    └── 무선/중철/스프링 → calculateBindingPrice()
    ↓
DB 조회 (dbService.ts의 캐시된 Map)
    ↓
항목별 비용 합산 → total, breakdown 반환
```

---

## 2. 공통 설정

```typescript
USE_PRECALC = false  // 실시간 계산 (paper_costs + Map 인덱스)
                      // size_paper_price 테이블은 deprecated
```

### 인쇄비 할인
- **컬러**: 1.0x (정가)
- **흑백**: 0.65x (35% 할인)

---

## 3. 단일 레이어 (전단/리플릿/엽서)

### 계산 순서

#### 3-1. 용지비
```
sheets = ceil(수량 / up_count)     ← up_count: A3=1, A4=2, A5=4, 엽서=8
paperTotal = sell_price_per_copy × 수량    (USE_PRECALC일 때)
         또는 cost_per_sheet × margin_rate × sheets
```

#### 3-2. 인쇄비
```
faces = sheets × (단면 ? 1 : 2)
cost_per_face = getPrintCostPerFace(faces)   ← 구간별 단가
adjustedCost = 컬러 ? cost_per_face : cost_per_face × 0.65
printTotal = adjustedCost × faces
```

#### 3-3. 재단비
```
cuttingTotal = setup_cost + (cost_per_unit × 수량)
```

#### 3-4. 코팅비 (선택)
```
coatingFaces = 양면코팅 ? faces : sheets
coatingTotal = setup_cost + (cost_per_unit × coatingFaces)
※ 양면 코팅시 setup_cost = setup_cost_double (보통 2배)
※ 150g 이하 용지: 코팅 불가
```

#### 3-5. 오시 (선택)
```
osiTotal = setup_cost + (cost_per_unit × 수량)
※ 줄 수별 다른 단가 (1줄/2줄/3줄)
※ 130g 이상 + 접지 → 오시 강제
```

#### 3-6. 접지 (선택)
```
foldTotal = setup_cost + (cost_per_unit × 수량)
※ 단수별 다른 단가 (2단/3단/4단)
```

#### 3-7. 귀도리 (선택)
```
batches = ceil(수량 / 100)     ← 100부 단위
cornerTotal = setup_cost + (cost_per_unit × batches)
```

#### 3-8. 타공 (선택)
```
holes = 구멍 수 (기본 2)
punchTotal = setup_cost + (cost_per_unit × holes × 수량)
```

#### 3-9. 미싱 (선택)
```
misingTotal = setup_cost + (cost_per_unit × 수량)
```

#### 3-10. 출고일 할인/할증
```
deliveryRate = 1 + (deliveryPercent / 100)
total = total × deliveryRate
```

| 출고일 | 할증 | 마감시간 |
|--------|------|----------|
| 당일 | +30% | 10:00 |
| 1영업일 | +15% | 12:00 |
| 2영업일 | 0% (기준) | 12:00 |
| 3영업일 | -5% | 12:00 |

---

## 4. 제본 상품 (무선/중철/스프링)

### 계산 순서

#### 4-1. 표지 용지비
```
coverSheets = 수량 (1부당 1장)
coverPaperTotal = sell_price_per_sheet × coverSheets
```

#### 4-2. 표지 인쇄비
```
coverFaces = coverSheets × 2 (항상 양면)
coverPrintTotal = cost_per_face × coverFaces
※ 흑백이면 × 0.65
```

#### 4-3. 표지 코팅 (선택)
```
[방법 A] customer.coverCoating (직접 설정)
  coatingFaces = 양면 ? coverFaces : coverSheets
  coatingTotal = setup_cost + (cost_per_unit × coatingFaces)

[방법 B] customer.finishing.coating (finishing block에서 설정)
  ※ coverCoating이 미설정일 때만 적용 (이중 계산 방지)
  coatingSide = customer.finishing.coatingSide || 'single'
  coatingFaces = 양면 ? coverFaces : coverSheets
  coatingTotal = setup_cost + (cost_per_unit × coatingFaces)
```

#### 4-3b. 표지 후가공 (finishing block - 2026-02-05 추가)
```
제본 상품도 finishing block을 통해 후가공을 설정할 수 있음.
customer.finishing.* 키로 설정되며, 표지에 적용됨.

코팅:   → 4-3 방법 B와 동일
오시:   osiTotal = setup_cost + (cost_per_unit × 수량)  ※ 줄 수별 단가
접지:   foldTotal = setup_cost + (cost_per_unit × 수량)  ※ 단수별 단가
귀도리: batches = ceil(수량/100), cornerTotal = setup_cost + (cost_per_unit × batches)
타공:   punchTotal = setup_cost + (cost_per_unit × holes × 수량)
미싱:   misingTotal = setup_cost + (cost_per_unit × 수량)
```

#### 4-4. 내지 용지비
```
[핵심] 내지 장수 계산:

중철: innerSheets = ceil((pages - 4) / 4) × 수량
      ※ 대지 접지 방식, 표지 4페이지 제외

무선/스프링:
  양면: innerSheets = ceil(pages / 2) × 수량
  단면: innerSheets = pages × 수량          ← 용지 2배 필요!

innerPaperTotal = sell_price_per_sheet × innerSheets
```

#### 4-5. 내지 인쇄비
```
innerFaces = innerSheets × (단면 ? 1 : 2)

※ 단면/양면 인쇄면 수 비교 (100페이지, 30부 기준):
  양면: sheets=1,500, faces=3,000
  단면: sheets=3,000, faces=3,000  ← 면 수 같지만 용지 2배!

innerPrintTotal = cost_per_face × innerFaces × (흑백 ? 0.65 : 1.0)
```

#### 4-6. 제본비
```
bindingTotal = setup_cost + (cost_per_copy × 수량)
※ 수량 구간별 다른 단가
```

#### 4-7. 스프링 전용 옵션
```
PP커버: ppTotal = setup_cost + (cost_per_unit × 수량)
        ※ 투명/불투명/없음

표지인쇄: springCoverPrintTotal = 용지비 + 인쇄비
          ※ 없음/앞표지만/앞뒤표지

뒷판, 스프링 색상: 각각 별도 단가
```

#### 4-8. 출고일 할인/할증
단일 레이어와 동일.

> **2026-02-05 버그 수정**: `calculateBindingPrice`에 finishing block 비용
> (코팅/오시/접지/귀도리/타공/미싱)이 누락되어 0원으로 계산되던 버그 수정.
> `customer.finishing.*` 키를 읽어 표지 후가공 비용을 정상 반영하도록 섹션 5 추가.
> (커밋: `d21c096`)

---

## 5. 인쇄비 구간표 (print_costs)

| 면 수 | 면당 단가 |
|--------|-----------|
| 1 | 500원 |
| 2 | 480원 |
| 3~5 | 440원 |
| 6~10 | 400원 |
| 11~20 | 350원 |
| 21~30 | 300원 |
| 31~50 | 250원 |
| 51~80 | 220원 |
| 81~100 | 200원 |
| 101~150 | 180원 |
| 151~200 | 160원 |
| 201~300 | 140원 |
| 301~500 | 120원 |
| 501~1,000 | 105원 |
| 1,001~3,000 | 95원 |
| 3,001~10,000 | 90원 |
| 10,001+ | 85원 |

---

## 6. 두께 계산 & 검증

### 두께 계수 (mm/g)
| 용지 | 계수 |
|------|------|
| 아트지 | 0.0008 |
| 스노우지 | 0.0008 |
| 매트지 | 0.0009 |
| 아이보리 | 0.0010 |
| 크라프트 | 0.0012 |
| 기타 | 0.0010 |

### 두께 한도
| 제본 | 경고 | 차단 |
|------|------|------|
| 중철 | 2.0mm | 2.5mm |
| 무선 | 40mm | 50mm |
| 스프링 | 15mm | 20mm |

---

## 7. 적용된 규칙

| 코드 | 규칙 | 조건 | 동작 |
|------|------|------|------|
| R001 | 오시 강제 | 130g 이상 + 접지 | 오시 자동 추가 |
| R002 | 코팅 제한 | 150g 이하 | 코팅 비활성화 |
| R-ST | 두께 제한 | 두께 초과 | 경고 또는 주문 차단 |
| UI-001 | 옵션 자동잠금 | 활성 옵션 1개 | 블록 잠금 |
| UI-002 | 더블클릭 기본값 | 더블클릭 | ★ 기본값 설정 |

### 미구현 규칙
| 코드 | 규칙 | 내용 |
|------|------|------|
| R003 | 무선 코팅 단면 | 무선제본 표지는 단면 코팅만 |
| R004 | 스프링 코팅 불가 | 스프링제본은 코팅 미지원 |
| R005 | 중철 두께 제한 | 접힌 두께 2.5mm 초과 차단 |
| R006 | 내지 두께 제한 | 내지가 표지보다 두꺼우면 불가 |
| R007 | 무선 최소 페이지 | 40페이지 미만 차단 |

---

## 8. DB 테이블 구조

### 핵심 테이블
| 테이블 | 용도 | 키 필드 |
|--------|------|---------|
| `papers` | 용지 종류 | code, name |
| `paper_costs` | 용지 단가 | paper_id, weight, base_sheet, cost_per_sheet, margin_rate |
| `sizes` | 사이즈 | code, base_sheet, up_count |
| `print_costs` | 인쇄 단가 구간 | min_faces, max_faces, cost_per_face |
| `finishing_types` | 후가공 종류 | code (cutting, coating, creasing...) |
| `finishing_costs` | 후가공 단가 | finishing_type_id, min_qty, max_qty, setup_cost, cost_per_unit, unit_type |
| `binding_types` | 제본 종류 | code (saddle, perfect, spring) |
| `binding_costs` | 제본 단가 | binding_type_id, min_qty, max_qty, setup_cost, cost_per_copy |
| `size_paper_price` | 선계산 가격 | size_id, paper_cost_id, sell_price_per_copy, sell_price_per_sheet |

### 후가공 단위 (unit_type)
| 단위 | 설명 | 사용처 |
|------|------|--------|
| sheet | 장당 | 코팅 |
| copy | 부당 | 재단, 미싱 |
| line | 줄당 | 오시 |
| hole | 구멍당 | 타공 |
| batch | 100부당 | 귀도리 |

---

## 9. customer 객체 키 매핑

### 단일 레이어 (전단/리플릿/엽서)
| 키 | 용도 | 예시 값 |
|----|------|---------|
| size | 사이즈 | 'a4', 'a5', 'b5' |
| paper | 용지 | 'snow', 'mojo' |
| weight | 평량 | 80, 100, 120, 150... |
| color | 인쇄 컬러 | 'color', 'mono' |
| side | 인쇄면 | 'single', 'double' |
| finishing.coating | 코팅 여부 | true/false |
| finishing.coatingType | 코팅 종류 | 'matte', 'gloss' |
| finishing.coatingSide | 코팅 면 | 'single', 'double' |
| finishing.osiEnabled | 오시 여부 | true/false |
| finishing.osi | 오시 줄 수 | 1, 2, 3 |
| finishing.foldEnabled | 접지 여부 | true/false |
| finishing.fold | 접지 단수 | 2, 3, 4 |
| finishing.corner | 귀도리 | true/false |
| finishing.punch | 타공 | true/false |
| finishing.mising | 미싱 | true/false |
| delivery | 출고일 | 'same', 'next1', 'next2', 'next3' |
| deliveryPercent | 출고 할증 | 30, 15, 0, -5 |
| qty | 수량 | 50, 100, 200... |

### 제본 상품 추가 키
| 키 | 용도 | 예시 값 |
|----|------|---------|
| coverPaper | 표지 용지 | 'snow' |
| coverWeight | 표지 평량 | 200, 250, 300 |
| coverPrint | 표지 인쇄 | 'none', 'front_only', 'front_back' |
| coverCoating | 표지 코팅 | 'matte', 'gloss', 'none' |
| innerPaper | 내지 용지 | 'mojo', 'snow' |
| innerWeight | 내지 평량 | 80, 100 |
| **innerColor** | **내지 컬러** | **'color', 'mono'** |
| **innerSide** | **내지 인쇄면** | **'single', 'double'** |
| pages | 페이지 수 | 16, 40, 100... |
| pp | PP커버 (스프링) | 'clear', 'frosted', 'none' |
| springColor | 스프링 색상 | 'black', 'white' |
| back | 뒷판 색상 | 'white', 'black', 'none' |

> **주의 1**: 제본 상품의 내지인쇄 블록(`type: 'print'`)은 `color`/`side`가 아닌
> `innerColor`/`innerSide` 키를 사용해야 가격이 정상 반영됩니다.
> (`pages` 블록의 `linkedBlocks.innerPrint`로 내지인쇄 여부 판별)

> **주의 2**: 제본 상품의 후가공(코팅 등)은 finishing block에서 `customer.finishing.*`로 설정됩니다.
> `customer.coverCoating`은 구형 직접 설정 방식이며, 둘 다 지원하되 이중 계산을 방지합니다.
> (priceEngine.ts에서 `!breakdown.coverCoating` 조건으로 체크)

---

## 10. 미포함 항목

- **배송비 계산기**: v2에 미구현
- **포장비 계산기**: v2에 미구현
- **세금**: 별도 처리 없음 (부가세 포함/별도 미정)
