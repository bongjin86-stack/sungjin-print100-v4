// 비즈니스 규칙 카탈로그
//
// ⚠️ 이 파일은 참조 문서입니다 (런타임에 import되지 않음).
//    실제 규칙 로직은 blockDefaults.ts에 있습니다.
//
// "규칙"의 기준: 옵션 A의 선택이 옵션 B의 상태를 변경하는 런타임 간섭.
// 템플릿 구조(블록 유무), config 값(min/max), UI 렌더링 조건은
// 규칙이 아니라 시스템 아키텍처이므로 여기에 기록하지 않습니다.

export interface Rule {
  id: string;
  name: string;
  condition: string;
  action: string;
  status: "applied" | "pending";
  implementedIn: string | null;
}

// ============================================================
// 적용됨 — 옵션 간 런타임 간섭이 있는 규칙
// ============================================================

export const APPLIED_RULES: Rule[] = [
  {
    id: "R001",
    name: "접지 → 오시 자동 연동",
    condition: "130g 이상 용지 + 접지 선택",
    action:
      "오시 자동 추가 (2단→1줄, 3단→2줄, 4단→3줄), 접지 해제 시 오시도 해제",
    status: "applied",
    implementedIn: "blockDefaults.ts - getFoldUpdate()",
  },
  {
    id: "R002",
    name: "코팅 평량 제한",
    condition: "용지 평량 ≤ 150g",
    action: "코팅 토글 비활성화 + 메시지 표시",
    status: "applied",
    implementedIn:
      "blockDefaults.ts - getCoatingWeight() + validateCoatingWeight()",
  },
  {
    id: "R-THICK",
    name: "제본 두께 초과 차단",
    condition: "용지+페이지 조합의 두께 > 제본 타입별 한계",
    action: "주문 버튼 비활성화 + 경고 (중철 2.5mm / 무선 50mm / 스프링 20mm)",
    status: "applied",
    implementedIn:
      "blockDefaults.ts - checkThickness() → priceEngine.ts - validateBindingThickness()",
  },
];

// ============================================================
// 미적용 — 구현이 필요한 옵션 간 간섭 규칙
// ============================================================

export const PENDING_RULES: Rule[] = [
  {
    id: "R003",
    name: "무선 코팅 단면 제한",
    condition: "무선제본 표지",
    action: "양면 코팅 비활성화 (접착면 필요)",
    status: "pending",
    implementedIn: null,
  },
  {
    id: "R006",
    name: "내지 > 표지 두께 제한",
    condition: "내지 용지 두께 > 표지 용지 두께",
    action: "해당 내지 용지 비활성화",
    status: "pending",
    implementedIn: null,
  },
  {
    id: "R-PP01",
    name: "접지 + 귀도리 불가",
    condition: "접지 활성화 상태에서 귀도리 선택",
    action: "귀도리 비활성화 + 사유 표시",
    status: "pending",
    implementedIn: null,
  },
  {
    id: "R-PP02",
    name: "코팅 + 미싱 불가",
    condition: "코팅 활성화 상태에서 미싱 선택",
    action: "미싱 비활성화 + 사유 표시",
    status: "pending",
    implementedIn: null,
  },
];
