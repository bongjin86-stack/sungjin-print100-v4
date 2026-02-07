# sungjin-print100-nagi (v2) 문서 인덱스

> 최종 업데이트: 2026-02-07

---

## 문서 구조

```
프로젝트 루트
├── CHANGELOG.md             # 마스터 변경 이력 (버전별)
├── CLAUDE.md                # AI/개발자 작업 지침서 (진입점)
│
└── docs/
    ├── README.md            # 이 파일 (문서 인덱스)
    ├── pricing-system.md    # 가격 체계 완전 문서
    └── rules-constraints.md # 규칙 마스터 문서
```

---

## 활성 문서

| 문서 | 설명 | 최종 업데이트 |
|------|------|---------------|
| [CHANGELOG.md](../CHANGELOG.md) | 전체 버전별 변경 이력 | 2026-02-07 |
| [CLAUDE.md](../CLAUDE.md) | 프로젝트 구조, 규칙 제어센터, 문서 관리 가이드 | 2026-02-07 |
| [pricing-system.md](./pricing-system.md) | 가격 계산 로직, DB 스키마, customer 키 매핑 | 2026-02-05 |
| [rules-constraints.md](./rules-constraints.md) | 블록 규칙 상세 설명 (blockDefaults.ts 기준) | 2026-02-07 |

---

## 타임라인 (2026-02)

```
2026-02-04  v2.0.0 마이그레이션 시작
2026-02-05  가격엔진 버그 수정 (4건), 핵심 문서 작성
2026-02-06  보안/성능 대규모 개선 (110파일), 에디터 분석
2026-02-07  v2.1.0 보안 강화, v2.2.0 빌더 재설계 (5-Phase)
```

상세 변경 이력은 `CHANGELOG.md` 참조.

---

## 문서 관리 규칙

모든 변경 이력은 `CHANGELOG.md`에 기록합니다.
상세 규칙은 `CLAUDE.md` > "Documentation Management" 섹션 참조.
