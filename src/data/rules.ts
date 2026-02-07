// 규칙 관리 데이터 - Master Document 기반
// 적용 상태: applied (적용됨), pending (미적용), partial (부분 적용)

export interface Rule {
  id: string;
  name: string;
  category: string;
  condition: string;
  action: string;
  status: 'applied' | 'pending' | 'partial';
  message: string | null;
  implementedIn: string | null;
}

export interface RuleCategory {
  id: string;
  name: string;
}

export interface RuleStatus {
  id: string;
  name: string;
  color: string;
}

export interface RuleStats {
  total: number;
  applied: number;
  partial: number;
  pending: number;
}

export const RULES: Rule[] = [
  // 기본 규칙 (R001~R007)
  {
    id: 'R001',
    name: '오시 강제',
    category: '후가공',
    condition: '130g 이상 + 접지 선택',
    action: '오시 자동 추가 (2단→1줄, 3단→2줄, 4단→3줄), 접지 해제시 오시도 해제',
    status: 'applied',
    message: '130g 이상 용지는 접지 시 오시가 필요합니다. 오시비가 자동 추가됩니다.',
    implementedIn: 'blockDefaults.ts - getFoldUpdate(), ProductView.jsx + ProductBuilder/index.jsx에서 호출'
  },
  {
    id: 'R002',
    name: '코팅 평량 제한',
    category: '코팅',
    condition: '150g 이하',
    action: '코팅 블록 비활성화 (회색 처리) + 툴팁 메시지',
    status: 'applied',
    message: '150g 이하 용지는 코팅이 불가합니다.',
    implementedIn: 'blockDefaults.ts - getCoatingWeight() + validateCoatingWeight(), PreviewBlock에서 호출'
  },
  {
    id: 'R003',
    name: '무선 코팅 단면',
    category: '제본',
    condition: '무선제본 표지',
    action: '양면 코팅 비활성화',
    status: 'pending',
    message: '무선제본 표지는 단면 코팅만 가능합니다. (접착면 필요)',
    implementedIn: null
  },
  {
    id: 'R004',
    name: '스프링 코팅 불가',
    category: '제본',
    condition: '스프링제본',
    action: '코팅 블록 숨김',
    status: 'pending',
    message: '스프링제본에는 코팅을 적용할 수 없습니다.',
    implementedIn: null
  },
  {
    id: 'R005',
    name: '중철 두께 제한',
    category: '제본',
    condition: '접힌 두께 > 2.5mm',
    action: '주문 차단 + 경고',
    status: 'pending',
    message: '선택하신 용지와 페이지 수로는 중철제본이 불가합니다. 페이지를 줄이거나 얇은 용지를 선택해주세요.',
    implementedIn: null
  },
  {
    id: 'R006',
    name: '내지 두께 제한',
    category: '제본',
    condition: '내지 > 표지 두께',
    action: '해당 내지 비활성화',
    status: 'pending',
    message: '내지 용지가 표지보다 두꺼울 수 없습니다. 다른 용지를 선택해주세요.',
    implementedIn: null
  },
  {
    id: 'R007',
    name: '무선 최소 페이지',
    category: '제본',
    condition: '40p 미만',
    action: '주문 차단 + 안내',
    status: 'pending',
    message: '무선제본은 최소 40페이지 이상이어야 합니다.',
    implementedIn: null
  },

  // 스프링제본 자동화 규칙 (R-SP)
  {
    id: 'R-SP01',
    name: '스프링 표지 없음',
    category: '스프링제본',
    condition: '표지 = "없음"',
    action: '표지 옵션 숨김, 뒷판 활성화',
    status: 'pending',
    message: null,
    implementedIn: null
  },
  {
    id: 'R-SP02',
    name: '스프링 PP표지',
    category: '스프링제본',
    condition: '표지 = "PP표지"',
    action: '인쇄 = 단면 고정, PP 투명/불투명 선택, 뒤판 활성화',
    status: 'pending',
    message: null,
    implementedIn: null
  },
  {
    id: 'R-SP03',
    name: '스프링 일반표지',
    category: '스프링제본',
    condition: '표지 = "일반표지"',
    action: '인쇄 = 단면/양면 선택 가능, 뒤판 활성화',
    status: 'pending',
    message: null,
    implementedIn: null
  },

  // 제본 두께 자동 계산 규칙 (R-ST)
  {
    id: 'R-ST01',
    name: '중철 두께 차단',
    category: '제본 두께',
    condition: '중철 두께 > 2.5mm',
    action: '주문 버튼 비활성화 + 경고 메시지',
    status: 'applied',
    message: '중철제본 두께가 2.5mm를 초과합니다.',
    implementedIn: 'blockDefaults.ts - checkThickness() → priceEngine.ts - validateBindingThickness()'
  },
  {
    id: 'R-ST03',
    name: '페이지 수 제한',
    category: '제본 두께',
    condition: '페이지 수 선택 시',
    action: '현재 용지로 가능한 최대 페이지만 활성화',
    status: 'pending',
    message: null,
    implementedIn: null
  },
  {
    id: 'R-ST04',
    name: '무선 두께 차단',
    category: '제본 두께',
    condition: '무선 두께 > 50mm',
    action: '주문 버튼 비활성화 + 경고 메시지',
    status: 'applied',
    message: '선택하신 용지와 페이지 수로는 무선제본이 불가합니다. (최대 50mm)',
    implementedIn: 'blockDefaults.ts - checkThickness() → priceEngine.ts - validateBindingThickness()'
  },
  {
    id: 'R-ST06',
    name: '스프링 두께 차단',
    category: '제본 두께',
    condition: '스프링 두께 > 20mm',
    action: '주문 버튼 비활성화 + 경고 메시지',
    status: 'applied',
    message: '선택하신 용지와 페이지 수로는 스프링제본이 불가합니다. (최대 20mm)',
    implementedIn: 'blockDefaults.ts - checkThickness() → priceEngine.ts - validateBindingThickness()'
  },

  // 제본 후가공 연동 규칙
  {
    id: 'BIND-FINISH',
    name: '제본 후가공 연동',
    category: '제본',
    condition: '제본 상품 + finishing block 존재',
    action: 'customer.finishing.* 키로 표지 후가공 비용 계산 (coverCoating 이중 방지)',
    status: 'applied',
    message: null,
    implementedIn: 'priceEngine.ts - calculateBindingPrice() 섹션 5'
  },

  // 후가공 호환성 규칙 (R-PP)
  {
    id: 'R-PP01',
    name: '접지 + 귀도리 불가',
    category: '후가공 호환',
    condition: '접지 + 귀도리',
    action: '귀도리 블록 비활성화 + 사유 표시',
    status: 'pending',
    message: '접지가 적용된 상품에는 귀도리를 추가할 수 없습니다.',
    implementedIn: null
  },
  {
    id: 'R-PP02',
    name: '코팅 + 미싱 불가',
    category: '후가공 호환',
    condition: '코팅 + 미싱',
    action: '미싱 블록 비활성화 + 사유 표시',
    status: 'pending',
    message: '코팅된 인쇄물에는 미싱을 적용할 수 없습니다. (코팅이 벗겨질 수 있음)',
    implementedIn: null
  },
  {
    id: 'R-PP03',
    name: '스프링 + 코팅 불가',
    category: '후가공 호환',
    condition: '스프링 + 코팅',
    action: '코팅 블록 비활성화',
    status: 'pending',
    message: '스프링제본에는 코팅을 적용할 수 없습니다.',
    implementedIn: null
  },

  // UI 규칙
  {
    id: 'UI-001',
    name: '옵션 1개 자동 잠금',
    category: 'UI',
    condition: '활성화된 옵션이 1개만 있을 때',
    action: '해당 블록 자동 잠금 (locked: true)',
    status: 'applied',
    message: null,
    implementedIn: 'ProductBuilder - 각 토글 함수'
  },
  {
    id: 'UI-002',
    name: '더블클릭 기본값 설정',
    category: 'UI',
    condition: '설정 패널에서 옵션 더블클릭',
    action: '해당 옵션을 기본값으로 설정',
    status: 'applied',
    message: null,
    implementedIn: 'ProductBuilder - BlockSettings'
  },
  {
    id: 'UI-003',
    name: '표지/내지 용지 분리',
    category: 'UI',
    condition: '무선/중철/스프링 제본',
    action: '표지와 내지 용지 선택 상태 분리',
    status: 'applied',
    message: null,
    implementedIn: 'ProductBuilder - 용지 블록 미리보기'
  }
];

export const RULE_CATEGORIES: RuleCategory[] = [
  { id: 'all', name: '전체' },
  { id: '후가공', name: '후가공' },
  { id: '코팅', name: '코팅' },
  { id: '제본', name: '제본' },
  { id: '스프링제본', name: '스프링제본' },
  { id: '제본 두께', name: '제본 두께' },
  { id: '후가공 호환', name: '후가공 호환' },
  { id: 'UI', name: 'UI' }
];

export const RULE_STATUSES: RuleStatus[] = [
  { id: 'all', name: '전체', color: 'gray' },
  { id: 'applied', name: '적용됨', color: 'green' },
  { id: 'partial', name: '부분 적용', color: 'yellow' },
  { id: 'pending', name: '미적용', color: 'red' }
];

export const getRuleStats = (): RuleStats => {
  const total = RULES.length;
  const applied = RULES.filter(r => r.status === 'applied').length;
  const partial = RULES.filter(r => r.status === 'partial').length;
  const pending = RULES.filter(r => r.status === 'pending').length;

  return { total, applied, partial, pending };
};
