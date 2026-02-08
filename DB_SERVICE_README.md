# DB 서비스 레이어 이식 완료

## 개요

sungjin-print100의 가격 DB 서비스를 nagi 프로젝트에 TypeScript로 깔끔하게 재작성했습니다.

## 파일 구조

```
src/lib/
├── types/
│   └── database.ts       # TypeScript 타입 정의
├── dbService.ts          # 가격 DB 서비스
└── supabase.ts           # Supabase 클라이언트
```

## 타입 정의 (database.ts)

### 주요 인터페이스

- `Paper` - 용지 종류
- `PaperCost` - 용지 단가
- `Size` - 사이즈
- `PrintCost` - 인쇄비
- `FinishingType` - 후가공 종류
- `FinishingCost` - 후가공 비용
- `BindingType` - 제본 종류
- `BindingCost` - 제본 비용
- `PricingData` - 전체 가격 데이터 (캐시용)
- `BuilderData` - 빌더용 데이터 구조

## DB 서비스 (dbService.ts)

### 데이터 로딩

```typescript
import { loadPricingData } from "./lib/dbService";

// 모든 가격 데이터 로드 (캐싱됨)
const data = await loadPricingData();
```

### 조회 함수

#### 용지 관련

```typescript
// 용지별 평량 목록
const weights = getPaperWeights("snow", "467x315");
// => [100, 120, 150, 180, 200, 250, 300]

// 용지 단가 조회
const cost = getPaperCost("snow", 120, "467x315");
// => { cost_per_sheet: 28, margin_rate: 1.5 }
```

#### 인쇄 관련

```typescript
// 인쇄비 단가 조회
const costPerFace = getPrintCostPerFace(500);
// => 85 (면당 단가)
```

#### 후가공 관련

```typescript
// 후가공 비용 조회
const finishing = getFinishingCost("coating");
// => { setup_cost: 5000, cost_per_unit: 10, unit_type: 'sheet' }

// 코팅 비용 (양면 지원)
const coating = getCoatingCost(1000, true);
// => { setup_cost: 10000, cost_per_unit: 10, unit_type: 'sheet' }

// 오시/접지 비용 (줄 수 기반)
const creasing = getFinishingCostByLines("creasing", 2, 500);
// => { setup_cost: 3000, cost_per_unit: 5, unit_type: 'sheet' }
```

#### 제본 관련

```typescript
// 제본 비용 조회
const binding = getBindingCost("perfect", 100);
// => { setup_cost: 5000, cost_per_copy: 500 }
```

#### 사이즈 관련

```typescript
// 사이즈 정보 조회
const size = getSizeInfo("a4");
// => { name: 'A4', width: 210, height: 297, base_sheet: '467x315', up_count: 2 }
```

#### 빌더용 데이터

```typescript
// 빌더용 데이터 구조로 변환
const builderData = getBuilderData();
// => { papers, paperWeights, sizes, finishingTypes, bindingTypes }
```

#### 캐시 관리

```typescript
// 캐시 초기화 (관리자 페이지에서 가격 변경 시)
clearCache();
```

## 테스트 결과

### 로드된 데이터 (2026-02-04)

| 데이터      | 개수                           |
| ----------- | ------------------------------ |
| 용지 종류   | 3개 (스노우지, 인스퍼, 모조지) |
| 용지 단가   | 34개                           |
| 사이즈      | 5개 (엽서, A5, A4, B5, A3)     |
| 인쇄비 구간 | 19개                           |
| 후가공 종류 | 8개                            |
| 후가공 비용 | 48개                           |
| 제본 종류   | 3개                            |
| 제본 비용   | 18개                           |

### 테스트 스크립트

```bash
# Node.js 테스트 스크립트 실행
npx tsx test-db.mjs
```

**결과:** ✅ 모든 테스트 통과

## 다음 단계

1. **DB 관리 Admin UI 이식** - 용지, 사이즈, 인쇄비, 후가공, 제본 관리 페이지
2. **빌더 이식** - React 빌더 컴포넌트 + 가격 계산 엔진
3. **주문 관리** - 주문 목록/상세 페이지

## 주의사항

- **캐싱**: `loadPricingData()`는 한 번 로드 후 캐싱됨
- **캐시 초기화**: 관리자 페이지에서 가격 변경 시 `clearCache()` 호출 필요
- **환경변수**: `supabase.ts`는 Node.js 환경에서도 작동하도록 수정됨
