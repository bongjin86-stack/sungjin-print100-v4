# sungjin-print100-nagi (v2) 문서 인덱스

> 최종 업데이트: 2026-02-06
> 문서 관리 시스템: bkit PDCA v1.5.0

---

## 문서 구조

```
docs/
├── README.md                           # 이 파일 (문서 인덱스)
├── error-report.md                     # 버그 기록 (히스토리)
├── pricing-system.md                   # 가격 체계 완전 문서
├── rules-constraints.md                # 연동 규칙 문서
├── IMPROVEMENT_REPORT_20260206.md      # 보안/성능 개선 보고서
├── ADMIN_EDITOR_AUDIT.md               # 에디터 시스템 감사
│
├── 01-plan/features/                   # PDCA Plan 문서 (현재 없음)
├── 02-design/features/                 # PDCA Design 문서 (현재 없음)
├── 03-analysis/                        # PDCA Analysis (Gap Analysis)
└── 04-report/features/                 # PDCA Completion Reports
```

---

## 1. 기준 문서 (Reference)

프로젝트의 핵심 시스템을 설명하는 문서들.

| 문서 | 설명 | 최종 업데이트 |
|------|------|---------------|
| [pricing-system.md](./pricing-system.md) | 전체 가격 계산 로직, DB 스키마, customer 키 매핑 | 2026-02-05 |
| [rules-constraints.md](./rules-constraints.md) | 옵션 연동 규칙 (오시/접지, 코팅 제한, 두께 검증) | 2026-02-05 |

---

## 2. 버그/에러 기록 (Error History)

발견된 버그와 수정 내역을 시간순으로 기록.

| 문서 | 설명 | 에러 수 |
|------|------|---------|
| [error-report.md](./error-report.md) | 모든 버그 히스토리 | 8건 (전부 해결) |

### 에러 요약 (시간순)

| ID | 날짜 | 심각도 | 설명 | 커밋 |
|----|------|--------|------|------|
| ERR-006 | 02-04 | Critical | CSS Cascade Layers 충돌 | `76e296c` |
| ERR-005 | 02-04 | Medium | BlockNote SSR 에러 | `f7b6940` |
| ERR-001 | 02-05 | Critical | 제본 후가공 비용 0원 | `d21c096` |
| ERR-002 | 02-05 | Critical | 출고일 할증 미반영 | `decaaa1` |
| ERR-003 | 02-05 | Medium | 하이라이트 아이콘 사라짐 | `812a59f` |
| ERR-004 | 02-05 | Low | 후가공 버튼 크기 불일치 | `8e79494` |
| ERR-007 | 02-06 | Medium | 빌더/상품 PreviewBlock 불일치 | - |
| ERR-008 | 02-06 | High | 상품 수정 시 DB 미로드 | - |

---

## 3. 개선 보고서 (Improvement Reports)

코드 품질, 보안, 성능 개선 작업 보고서.

| 문서 | 설명 | 날짜 |
|------|------|------|
| [IMPROVEMENT_REPORT_20260206.md](./IMPROVEMENT_REPORT_20260206.md) | 보안 강화 + 성능 최적화 (110개 파일 변경) | 2026-02-06 |

### 주요 개선 내역

**보안 (Critical)**
- service_role 키 하드코딩 제거
- test-db 디버그 엔드포인트 삭제
- 백업 폴더 삭제 (라우트 노출)
- XSS 방지 (DOMPurify 적용)
- PostgREST 필터 인젝션 방지

**성능**
- 관리자 대시보드 쿼리 병렬화 (7배 향상)
- 주문 상태 카운트 쿼리 병렬화
- Settings API 배치 Upsert
- 이미지 최적화 활성화
- 정적 페이지 Prerender

---

## 4. 시스템 감사 (Audit Reports)

기존 시스템 분석 및 개선 방향 제안.

| 문서 | 설명 | 날짜 |
|------|------|------|
| [ADMIN_EDITOR_AUDIT.md](./ADMIN_EDITOR_AUDIT.md) | Admin 에디터 시스템 현황 분석 | 2026-02-06 |

### 주요 발견

- **BlockNote 사용률**: 56% (5/9 폼)
- **Style Controls 사용률**: 11% (HeroForm만)
- **랜딩 미연동 섹션**: About, CTA (하드코딩)
- **권장**: Figma 스타일 전면 도입 비권장, 점진적 통합 권장

---

## 5. PDCA 피처 문서

bkit PDCA 방법론에 따른 피처 개발 문서.

현재 진행 중인 피처 없음.

---

## 타임라인 (2026-02)

```
2026-02-04
├── ERR-005: BlockNote SSR 에러 수정
└── ERR-006: CSS Cascade Layers 충돌 수정

2026-02-05
├── ERR-001: 제본 후가공 비용 0원 수정
├── ERR-002: 출고일 할증 미반영 수정
├── ERR-003: 하이라이트 아이콘 사라짐 수정
├── ERR-004: 후가공 버튼 크기 불일치 수정
├── pricing-system.md 작성
└── rules-constraints.md 작성

2026-02-06
├── IMPROVEMENT_REPORT: 보안/성능 대규모 개선 (110파일)
├── ADMIN_EDITOR_AUDIT: 에디터 시스템 분석
├── ERR-007: PreviewBlock 불일치 수정
└── ERR-008: 상품 수정 시 DB 미로드 수정
```

---

## 문서 작성 규칙

### 새 버그 발견 시
1. `error-report.md`에 ERR-XXX 형식으로 추가
2. 증상, 원인, 수정 방법 기록
3. 관련 커밋 해시 기록

### 새 피처 개발 시
1. `/pdca plan [feature-name]` 실행
2. `docs/01-plan/features/` 에 Plan 문서 생성
3. `/pdca design [feature-name]` 으로 Design 문서 생성
4. 구현 후 `/pdca analyze` 로 Gap 분석

### 대규모 개선 작업 시
1. `IMPROVEMENT_REPORT_YYYYMMDD.md` 형식으로 보고서 생성
2. 변경 통계, 주요 내용, 파일 목록 포함

---

## 관련 파일

| 파일 | 위치 | 설명 |
|------|------|------|
| CLAUDE.md | 프로젝트 루트 | AI 작업 지침서 |
| .pdca-status.json | 프로젝트 루트 | PDCA 진행 상태 |
| .bkit-memory.json | 프로젝트 루트 | bkit 세션 메모리 |

---

*이 문서는 프로젝트 문서를 종합 관리하기 위한 인덱스입니다.*
