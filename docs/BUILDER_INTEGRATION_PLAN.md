# 빌더 통합 작업 관리 문서

**작성일:** 2026-02-07
**관리자:** 성범 (최종 결정) + Claude (중간 검토)
**실행:** Claude Code
**상태:** 전체 완료

---

## 🚨 절대 규칙

1. **코드 수정 전 반드시** `docs/BUILDER_ANALYSIS_REPORT.md` 참조
2. **요약 금지** — 변경 목록 전체를 항상 보고
3. **Phase별 커밋 분리** — 문제 시 롤백 가능
4. **폴백 데이터 삭제 금지** — builderData.ts의 DB 객체 유지 (API 실패 대비)
5. **기능 변경 금지 (Phase 1)** — 추출만, 동작 100% 동일
6. **Phase 완료 보고 필수** — 아래 체크리스트 형태로

---

## 📋 Phase 완료 보고 양식

```
Phase X 완료 보고
─────────────────
변경한 파일:
- [파일경로] — [변경 내용]

추출/이동한 함수:
- [함수명] — [원본 위치] → [새 위치]

import 변경된 파일:
- [파일경로] — [변경된 import]

빌드: ✅ 성공 / ❌ 실패 (에러 내용)
기능 변경: 없음 / 있음 (상세)
테스트: [확인 항목]
```

---

## 🗺️ 전체 로드맵

### Phase 1: 공유 모듈 추출 ✅ 완료
> **목표:** 중복 함수를 한 곳으로 모아 불일치 원천 차단
> **커밋:** `1915cb2`

| # | 작업 | 원본 | 대상 | 상태 |
|:---:|:---|:---|:---|:---:|
| 1-1 | extractDefaultsFromBlocks() 추출 | ProductView + Builder | `lib/blockDefaults.ts` | ✅ |
| 1-2 | handleFoldSelect() → getFoldUpdate() 추출 | ProductView + Builder | `lib/blockDefaults.ts` | ✅ |
| 1-3 | checkLinkRules() 추출 | ProductView + Builder | `lib/blockDefaults.ts` | ✅ |
| 1-4 | mapPrintOptionsToCustomer() 추출 | ProductView only | `lib/blockDefaults.ts` | ✅ |
| 1-5 | ProductView import 변경 | - | - | ✅ |
| 1-6 | ProductBuilder import 변경 | - | - | ✅ |
| 1-7 | 빌드 확인 | - | - | ✅ |
| 1-8 | 커밋 | - | - | ✅ |

**성과:** 358줄 중복 제거, 16줄 import + wrapper로 교체

---

### Phase 1.5: 표지 초기값 매핑 버그 수정 ✅ 완료
> **목표:** 중철/무선 표지 coverPaper/coverWeight/coverColor 초기화 수정
> **커밋:** `780b990`

- blockDefaults.ts: paper 블록 → linkedBlocks.coverPaper 매칭 시 coverPaper/coverWeight 설정
- blockDefaults.ts: print 블록 → linkedBlocks.coverPrint 매칭 시 coverColor 설정
- builderData.ts: perfect 템플릿 linkedBlocks에 coverPaper/coverPrint 추가
- DB 업데이트: perfect 상품 inner_layer_leaf config에 linkedBlocks 추가

---

### Phase 2: 가격 경로 통합 ✅ 완료
> **목표:** Builder도 서버 API 경유 → 가격 불일치 차단 + priceEngine 클라이언트 노출 제거
> **커밋:** `c306e57`

| # | 작업 | 상태 |
|:---:|:---|:---:|
| 2-1 | ProductBuilder에 /api/calculate-price 연동 (debounce 300ms) | ✅ |
| 2-2 | Builder의 calculatePrice() 직접 호출 제거 | ✅ |
| 2-3 | priceEngine.ts 클라이언트 번들 확인 | ✅ |
| 2-4 | PreviewBlock calculatePrice dead code 제거 | ✅ |
| 2-5 | 빌드 확인 + 커밋 | ✅ |

**성과:** 핵심 가격 공식(calculatePrice 등) 클라이언트 번들에서 완전 제거

---

### Phase 3: 검증 통합 ✅ 완료
> **목표:** 두께 검증을 공유 함수로 추출, Builder에도 적용
> **커밋:** `971dce0`

| # | 작업 | 상태 |
|:---:|:---|:---:|
| 3-1 | blockDefaults.ts에 checkThickness() 추가 | ✅ |
| 3-2 | ProductView 인라인 두께 검증(28줄) → checkThickness() 교체 | ✅ |
| 3-3 | ProductView의 priceEngine 직접 import 제거 | ✅ |
| 3-4 | Builder에 두께 검증 적용 + thicknessError prop 전달 | ✅ |
| 3-5 | 빌드 확인 + 커밋 | ✅ |

---

### Phase 4: 하드코딩 제거 + DB 중심 전환 ✅ 완료
> **목표:** 코드 하드코딩 → DB 우선 로딩 (폴백 유지)
> **커밋:** `49def28`

| # | 작업 | 상태 |
|:---:|:---|:---:|
| 4-1 | DB.papers → dbPapersList 우선 (이미 적용) | ✅ |
| 4-2 | DB.weights → dbWeights (getBuilderData 경유) | ✅ |
| 4-3 | DB.sizeMultipliers → dbSizes (getBuilderData 경유) | ✅ |
| 4-4 | 폴백 데이터 유지 확인 | ✅ |
| 4-5 | 빌드 확인 + 커밋 | ✅ |

**참고:** 4-4 출고일 규칙 통합은 별도 작업으로 분리 (현재 동작에 문제 없음)

---

### Phase 5: 미적용 규칙 구현 — 스킵
> **사유:** 빌더 설정으로 이미 커버됨. 규칙 R003~R-PP03은 블록 config에서
> 관리자가 직접 설정 가능하며, 코드 레벨 강제보다 빌더 설정이 유연함.

---

## 📊 진행 현황 요약

| Phase | 설명 | 상태 | 커밋 |
|:---:|:---|:---:|:---:|
| 1 | 공유 모듈 추출 | ✅ 완료 | `1915cb2` |
| 1.5 | 표지 매핑 버그 수정 | ✅ 완료 | `780b990` |
| 2 | 가격 경로 통합 | ✅ 완료 | `c306e57` |
| 3 | 검증 통합 | ✅ 완료 | `971dce0` |
| 4 | 하드코딩 제거 | ✅ 완료 | `49def28` |
| 5 | 미적용 규칙 | ⏭️ 스킵 | 빌더 설정으로 대체 |

---

## 🔗 참조 문서

| 문서 | 용도 |
|:---|:---|
| `docs/BUILDER_ANALYSIS_REPORT.md` | 빌더 현재 상태 분석 (450줄) |
| `MASTER_DOCUMENT_v3.5.md` | 설계 기준 (규칙, 공식, 스키마) |
| `DB_INIT_SQL_v3.5.md` | DB 실제 데이터 |
| `WORK_LOG.md` | 작업 이력 |

---

**이 문서는 Phase 완료 시마다 업데이트합니다.**
**클코는 매 Phase 시작 전 이 문서를 읽고 시작합니다.**
