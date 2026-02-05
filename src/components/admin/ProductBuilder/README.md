# AdminBuilder Component

## Overview

AdminBuilder는 인쇄 상품을 생성/편집하는 관리자 도구입니다.

**중요**: 이 폴더의 컴포넌트들은 모두 연결되어 있습니다. 수정 시 주의하세요.

## File Structure

```
AdminBuilder/
├── index.jsx            # 메인 컴포넌트 (상태 관리, 레이아웃)
├── BlockItem.jsx        # 블록 리스트의 각 아이템 UI
├── BlockSettings.jsx    # 블록 설정 패널 (타입별 설정)
├── PreviewBlock.jsx     # 고객 화면 미리보기 블록
├── TemplateSelector.jsx # 템플릿 선택/관리 UI
├── ProductEditor.jsx    # 상품 이미지/제목/설명 편집
├── PriceDisplay.jsx     # 가격 표시 및 두께 경고
├── BlockLibraryModal.jsx# 블록 추가 모달
└── README.md            # 이 파일
```

## Component Responsibilities

### index.jsx (메인)
- 전체 상태(state) 관리
- 컴포넌트 조합 및 레이아웃
- 데이터 저장/불러오기

### BlockItem.jsx
- 블록 목록에서 각 블록의 표시
- ON/OFF 토글
- 설정 버튼, 삭제 버튼

### BlockSettings.jsx
- 각 블록 타입별 설정 UI
- 사이즈, 용지, 인쇄, PP, 후가공 등 18개 타입 지원
- **새 블록 타입 추가 시 이 파일 수정**

### PreviewBlock.jsx
- 고객이 보는 실제 주문 화면 미리보기
- 옵션 선택 UI (버튼, 드롭다운)
- **새 블록 타입 추가 시 이 파일도 수정**

### TemplateSelector.jsx
- 여러 상품 템플릿 선택
- 드래그앤드롭으로 순서 변경
- 템플릿 추가/삭제/이름변경

### ProductEditor.jsx
- 메인 이미지 업로드
- 썸네일 4개 업로드
- 상품명, 설명, 특징 편집

### PriceDisplay.jsx
- 계산된 가격 표시
- 두께 경고/정보 표시
- 부가세 별도 안내

### BlockLibraryModal.jsx
- "블록 추가" 클릭 시 모달
- 사용 가능한 블록 타입 그리드

## Data Flow

```
index.jsx (상태 관리)
    ├── templates[] ──────► TemplateSelector
    ├── currentProduct ───► ProductEditor
    ├── customer ─────────► PreviewBlock
    └── blocks[] ─────────► BlockItem[] ──► BlockSettings
                                │
                                └──────────► PreviewBlock
```

## Important Rules

### 1. 새 블록 타입 추가
두 파일 모두 수정 필요:
- `BlockSettings.jsx`: switch case 추가
- `PreviewBlock.jsx`: switch case 추가

### 2. 가격 계산 수정
여기서 하지 마세요! `src/lib/priceEngine.js` 수정

### 3. 새 컴포넌트 만들기
이 폴더에 새 파일을 만들기 전에:
- 정말 필요한지 확인
- 기존 파일에 추가할 수 없는지 확인
- 반드시 README.md 업데이트

### 4. Import 경로
```javascript
// App.jsx에서 import
import AdminBuilder from './components/AdminBuilder'
// → index.jsx가 자동으로 로드됨
```

## External Dependencies

| 파일 | 용도 |
|------|------|
| `../../lib/builderData.js` | BLOCK_TYPES, DB, TEMPLATES |
| `../../lib/priceEngine.js` | 가격 계산 |
| `../../lib/supabase.js` | 이미지 업로드 |
| `../../lib/businessDays.js` | 영업일 계산 |
| `../NotionEditor.jsx` | 리치 텍스트 편집기 |

## Migration Status

- [x] 폴더 구조 생성
- [x] README.md 작성
- [x] BlockItem.jsx 분리 (+ getBlockSummary)
- [x] BlockLibraryModal.jsx 분리
- [x] PriceDisplay.jsx 분리
- [x] TemplateSelector.jsx 분리 (forwardRef 사용 - Sortable.js 연동)
- [x] ProductEditor.jsx 분리 (NotionEditor 연동)
- [x] PreviewBlock.jsx 분리 (18+ 블록 타입, ~930 lines)
- [x] BlockSettings.jsx 분리 (18+ 블록 타입, ~1140 lines)
- [ ] index.jsx 정리
- [ ] 기존 AdminBuilder.jsx 제거
