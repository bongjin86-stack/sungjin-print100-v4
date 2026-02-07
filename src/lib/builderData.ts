// ============================================================
// 빌더 데이터 v4 - 코팅 확장, 출고일 설정, 후가공 오시/접지
// ============================================================

// 블록 타입 정의
export interface BlockTypeInfo {
  name: string;
  icon: string;
  color: string;
  desc: string;
}

export interface DeliveryOption {
  id: string;
  label: string;
  enabled: boolean;
  percent: number;
  deadline: string;
  default?: boolean;
}

export interface SpringOption {
  id: string;
  label: string;
  enabled: boolean;
  default: boolean;
}

export interface BlockConfig {
  options?: string[] | number[];
  default?: string | number | { paper: string; weight: number } | { color: string; side: string };
  papers?: Record<string, number[]>;
  color?: boolean;
  mono?: boolean;
  single?: boolean;
  double?: boolean;
  corner?: boolean;
  punch?: boolean;
  mising?: boolean;
  coating?: { enabled: boolean; types: string[]; sides: string[] };
  osi?: { enabled: boolean; options: number[] };
  fold?: { enabled: boolean; options: number[] };
  min?: number;
  max?: number;
  step?: number;
  bindingType?: string;
  linkedBlocks?: Record<string, number>;
  pp?: { enabled: boolean; options: SpringOption[] };
  coverPrint?: {
    enabled: boolean;
    options: SpringOption[];
    papers?: Record<string, number[]>;
    defaultPaper?: { paper: string; weight: number };
  };
  back?: { enabled: boolean; options: SpringOption[] };
  springColor?: { enabled: boolean; options: SpringOption[] };
}

export interface Block {
  id: number;
  type: string;
  label: string;
  on: boolean;
  optional: boolean;
  locked: boolean;
  hidden: boolean;
  config: BlockConfig;
}

export interface Template {
  name: string;
  blocks: Block[];
}

export interface CustomerSelection {
  size: string;
  paper: string;
  weight: number;
  color: string;
  side: string;
  coating: string;
  coatingSide: string;
  finishing: {
    corner: boolean;
    punch: boolean;
    mising: boolean;
    osiEnabled: boolean;
    osi: number;
    foldEnabled: boolean;
    fold: number;
    coating: boolean;
    coatingType: string | null;
    coatingSide: string | null;
  };
  delivery: string;
  qty: number;
  pages: number;
  pp: string;
  coverPrint: string;
  coverPaper: string;
  coverWeight: number;
  back: string;
  springColor: string;
  innerPaper: string;
  innerWeight: number;
  innerColor: string;
  innerSide: string;
  deliveryPercent?: number;
  maxThickness?: number; // 블록 설정의 두께 제한 (mm)
  coverColor?: string;
  coverCoating?: string;
  coverCoatingSide?: string;
  punchHoles?: number;
}

export interface PaperInfo {
  code: string;
  name: string;
  desc: string;
  color: string;
}

export interface SizeMultiplier {
  name: string;
  multiplier: number;
}

export interface LinkRule {
  trigger: Record<string, any>;
  target?: Record<string, any>;
  action: string;
  message?: string;
  mapping?: Record<number, number>;
}

// 블록 타입 정의 (Dieter Rams style - muted colors with icons)
export const BLOCK_TYPES: Record<string, BlockTypeInfo> = {
  size: { name: '사이즈', icon: '📐', color: 'from-stone-100 to-stone-200', desc: '출력 사이즈' },
  paper: { name: '용지', icon: '📄', color: 'from-stone-100 to-stone-200', desc: '용지 종류 + 평량' },
  print: { name: '인쇄', icon: '🖨️', color: 'from-stone-100 to-stone-200', desc: '컬러/흑백, 단면/양면' },
  finishing: { name: '후가공', icon: '✨', color: 'from-stone-100 to-stone-200', desc: '코팅, 오시, 접지, 귀도리, 타공, 미싱' },
  delivery: { name: '출고일', icon: '📦', color: 'from-stone-100 to-stone-200', desc: '출고 일정 + 할증/할인' },
  quantity: { name: '수량', icon: '🔢', color: 'from-stone-100 to-stone-200', desc: '주문 수량' },
  pp: { name: 'PP', icon: '🔲', color: 'from-stone-100 to-stone-200', desc: '투명/불투명/없음' },
  cover_print: { name: '표지인쇄', icon: '📋', color: 'from-stone-100 to-stone-200', desc: '없음/앞표지/앞뒤표지' },
  back: { name: '뒷판', icon: '🔳', color: 'from-stone-100 to-stone-200', desc: '뒷판 색상' },
  spring_color: { name: '스프링색상', icon: '🔗', color: 'from-stone-100 to-stone-200', desc: '스프링 색상' },
  spring_options: { name: '스프링 옵션', icon: '🔧', color: 'from-stone-100 to-stone-200', desc: 'PP/표지인쇄/뒷판/스프링색상' },
  inner_layer_saddle: { name: '내지(중철)', icon: '📚', color: 'from-amber-100 to-amber-200', desc: '내지 용지+인쇄+페이지 (4p단위)' },
  inner_layer_leaf: { name: '내지(무선/스프링)', icon: '📗', color: 'from-emerald-100 to-emerald-200', desc: '내지 용지+인쇄+페이지 (1p단위)' },
};

// 상품 템플릿
export const TEMPLATES: Record<string, Template> = {
  flyer: {
    name: '전단지',
    blocks: [
      { id: 1, type: 'size', label: '사이즈', on: true, optional: false, locked: false, hidden: false,
        config: { options: ['a4','a5','b5'], default: 'a4' }},
      { id: 2, type: 'paper', label: '용지', on: true, optional: false, locked: false, hidden: false,
        config: { papers: { snow: [100,120,150,180], mojo: [80,100,120] }, default: {paper:'snow',weight:120} }},
      { id: 3, type: 'print', label: '인쇄', on: true, optional: false, locked: false, hidden: false,
        config: { color: true, mono: true, single: true, double: true, default: {color:'color',side:'double'} }},
      { id: 4, type: 'finishing', label: '후가공', on: false, optional: true, locked: false, hidden: false,
        config: {
          corner: true, punch: true, mising: false,
          coating: { enabled: true, types: ['matte', 'gloss'], sides: ['single', 'double'] },
          osi: { enabled: true, options: [1, 2, 3] },
          fold: { enabled: true, options: [2, 3, 4] }
        }},
      { id: 5, type: 'delivery', label: '출고일', on: true, optional: false, locked: false, hidden: false,
        config: {
          options: [
            { id: 'same', label: '당일', enabled: false, percent: 30, deadline: '10:00' },
            { id: 'next1', label: '1영업일', enabled: true, percent: 15, deadline: '12:00' },
            { id: 'next2', label: '2영업일', enabled: true, percent: 0, deadline: '12:00' },
            { id: 'next3', label: '3영업일', enabled: true, percent: -5, deadline: '12:00' },
          ],
          default: 'next2'
        }},
      { id: 6, type: 'quantity', label: '수량', on: true, optional: false, locked: false, hidden: false,
        config: { options: [50,100,200,500,1000], default: 100 }},
    ]
  },

  perfect: {
    name: '무선제본',
    blocks: [
      { id: 1, type: 'size', label: '사이즈', on: true, optional: false, locked: false, hidden: false,
        config: { options: ['a4','a5','b5'], default: 'a4' }},
      { id: 2, type: 'paper', label: '표지 용지', on: true, optional: false, locked: false, hidden: false,
        config: { papers: { snow: [200,250,300] }, default: {paper:'snow',weight:250} }},
      { id: 3, type: 'print', label: '표지 인쇄', on: true, optional: false, locked: true, hidden: true,
        config: { color: true, mono: false, single: false, double: true, default: {color:'color',side:'double'} }},
      { id: 4, type: 'finishing', label: '표지 후가공', on: true, optional: false, locked: false, hidden: false,
        config: {
          corner: false, punch: false, mising: false,
          coating: { enabled: true, types: ['matte', 'gloss'], sides: ['single', 'double'] },
          osi: { enabled: false, options: [] },
          fold: { enabled: false, options: [] }
        }},
      { id: 5, type: 'paper', label: '내지 용지', on: true, optional: false, locked: false, hidden: false,
        config: { papers: { mojo: [80,100], snow: [100,120] }, default: {paper:'mojo',weight:80} }},
      { id: 6, type: 'print', label: '내지 인쇄', on: true, optional: false, locked: false, hidden: false,
        config: { color: true, mono: true, single: true, double: true, default: {color:'color',side:'double'} }},
      { id: 7, type: 'pages', label: '페이지 수', on: true, optional: false, locked: false, hidden: false,
        config: {
          min: 40, max: 500, step: 2, default: 100,
          bindingType: 'leaf',
          linkedBlocks: { coverPaper: 2, coverPrint: 3, innerPaper: 5, innerPrint: 6 }
        }},
      { id: 8, type: 'delivery', label: '출고일', on: true, optional: false, locked: false, hidden: false,
        config: {
          options: [
            { id: 'next2', label: '2영업일', enabled: true, percent: 0, deadline: '12:00' },
            { id: 'next3', label: '3영업일', enabled: true, percent: -5, deadline: '12:00' },
          ],
          default: 'next2'
        }},
      { id: 9, type: 'quantity', label: '수량', on: true, optional: false, locked: false, hidden: false,
        config: { options: [10,20,30,50,100], default: 30 }},
    ]
  },

  saddle: {
    name: '중철제본',
    blocks: [
      { id: 1, type: 'size', label: '사이즈', on: true, optional: false, locked: false, hidden: false,
        config: { options: ['a4','a5','b5'], default: 'a4' }},
      { id: 2, type: 'paper', label: '표지 용지', on: true, optional: false, locked: false, hidden: false,
        config: { papers: { snow: [150,180,200] }, default: {paper:'snow',weight:180} }},
      { id: 3, type: 'print', label: '표지 인쇄', on: true, optional: false, locked: true, hidden: true,
        config: { color: true, mono: false, single: false, double: true, default: {color:'color',side:'double'} }},
      { id: 4, type: 'finishing', label: '표지 후가공', on: true, optional: true, locked: false, hidden: false,
        config: {
          corner: false, punch: false, mising: false,
          coating: { enabled: true, types: ['matte', 'gloss'], sides: ['single', 'double'] },
          osi: { enabled: false, options: [] },
          fold: { enabled: false, options: [] }
        }},
      { id: 5, type: 'paper', label: '내지 용지', on: true, optional: false, locked: false, hidden: false,
        config: { papers: { mojo: [80,100], snow: [100,120] }, default: {paper:'mojo',weight:80} }},
      { id: 6, type: 'print', label: '내지 인쇄', on: true, optional: false, locked: false, hidden: false,
        config: { color: true, mono: true, single: false, double: true, default: {color:'color',side:'double'} }},
      { id: 7, type: 'pages', label: '페이지 수', on: true, optional: false, locked: false, hidden: false,
        config: {
          min: 8, max: 48, step: 4, default: 16,
          bindingType: 'saddle',
          linkedBlocks: { coverPaper: 2, coverPrint: 3, innerPaper: 5, innerPrint: 6 }
        }},
      { id: 8, type: 'delivery', label: '출고일', on: true, optional: false, locked: false, hidden: false,
        config: {
          options: [
            { id: 'next2', label: '2영업일', enabled: true, percent: 0, deadline: '12:00' },
            { id: 'next3', label: '3영업일', enabled: true, percent: -5, deadline: '12:00' },
          ],
          default: 'next2'
        }},
      { id: 9, type: 'quantity', label: '수량', on: true, optional: false, locked: false, hidden: false,
        config: { options: [10,20,30,50,100], default: 30 }},
    ]
  },

  spring: {
    name: '스프링제본',
    blocks: [
      { id: 1, type: 'size', label: '사이즈', on: true, optional: false, locked: false, hidden: false,
        config: { options: ['a4','a5','b5'], default: 'a4' }},
      { id: 2, type: 'spring_options', label: '스프링 옵션', on: true, optional: false, locked: false, hidden: false,
        config: {
          pp: {
            enabled: true,
            options: [
              { id: 'clear', label: '투명', enabled: true, default: true },
              { id: 'frosted', label: '불투명', enabled: true, default: false },
              { id: 'none', label: '없음', enabled: true, default: false }
            ]
          },
          coverPrint: {
            enabled: true,
            options: [
              { id: 'none', label: '없음', enabled: true, default: true },
              { id: 'front_only', label: '앞표지만', enabled: true, default: false },
              { id: 'front_back', label: '앞뒤표지', enabled: true, default: false }
            ],
            papers: { snow: [200,250,300], mojo: [150,180] },
            defaultPaper: { paper: 'snow', weight: 200 }
          },
          back: {
            enabled: true,
            options: [
              { id: 'white', label: '화이트', enabled: true, default: true },
              { id: 'black', label: '블랙', enabled: true, default: false },
              { id: 'none', label: '없음', enabled: true, default: false }
            ]
          },
          springColor: {
            enabled: true,
            options: [
              { id: 'black', label: '블랙', enabled: true, default: true },
              { id: 'white', label: '화이트', enabled: true, default: false }
            ]
          }
        }},
      { id: 3, type: 'paper', label: '내지 용지', on: true, optional: false, locked: false, hidden: false,
        config: { papers: { mojo: [80,100], snow: [100,120] }, default: {paper:'mojo',weight:80} }},
      { id: 4, type: 'print', label: '내지 인쇄', on: true, optional: false, locked: false, hidden: false,
        config: { color: true, mono: true, single: true, double: true, default: {color:'color',side:'double'} }},
      { id: 5, type: 'pages', label: '페이지 수', on: true, optional: false, locked: false, hidden: false,
        config: {
          min: 10, max: 400, step: 2, default: 50,
          bindingType: 'leaf',
          linkedBlocks: { innerPaper: 3, innerPrint: 4 }
        }},
      { id: 6, type: 'delivery', label: '출고일', on: true, optional: false, locked: false, hidden: false,
        config: {
          options: [
            { id: 'next2', label: '2영업일', enabled: true, percent: 0, deadline: '12:00', default: true },
            { id: 'next3', label: '3영업일', enabled: true, percent: -5, deadline: '12:00', default: false },
          ],
          default: 'next2'
        }},
      { id: 7, type: 'quantity', label: '수량', on: true, optional: false, locked: false, hidden: false,
        config: { options: [10,20,30,50,100], default: 30 }},
    ]
  },
};

// DB 데이터 (폴백용 하드코딩)
export const DB = {
  papers: [
    { code: 'snow', name: '스노우지', desc: '고급 광택 용지', color: 'from-blue-50 to-blue-100' },
    { code: 'mojo', name: '모조지', desc: '일반 인쇄 용지', color: 'from-amber-50 to-amber-100' },
    { code: 'inspirer', name: '인스퍼', desc: '고급 무광 용지', color: 'from-gray-50 to-gray-100' },
  ],
  weights: {
    snow: [100, 120, 150, 180, 200, 250, 300],
    mojo: [80, 100, 120, 150, 180],
    inspirer: [105, 130, 160, 190, 240],
  } as Record<string, number[]>,
  paperCosts: {
    snow: { 100: 23, 120: 28, 150: 35, 180: 42, 200: 47, 250: 58, 300: 70 },
    mojo: { 80: 19, 100: 22, 120: 26, 150: 35, 180: 42 },
    inspirer: { 105: 44, 130: 58, 160: 71, 190: 84, 240: 98 },
  } as Record<string, Record<number, number>>,
  sizeMultipliers: {
    a3: { name: 'A3', multiplier: 1 },
    a4: { name: 'A4', multiplier: 2 },
    b5: { name: 'B5', multiplier: 2 },
    a5: { name: 'A5', multiplier: 4 },
    postcard: { name: '엽서', multiplier: 8 },
  } as Record<string, { name: string; multiplier: number }>,
  printCosts: [
    { min: 1, max: 1, cost: 500 },
    { min: 2, max: 2, cost: 480 },
    { min: 3, max: 5, cost: 440 },
    { min: 6, max: 10, cost: 400 },
    { min: 11, max: 20, cost: 350 },
    { min: 21, max: 30, cost: 300 },
    { min: 31, max: 50, cost: 250 },
    { min: 51, max: 80, cost: 220 },
    { min: 81, max: 100, cost: 200 },
    { min: 101, max: 150, cost: 180 },
    { min: 151, max: 200, cost: 160 },
    { min: 201, max: 300, cost: 140 },
    { min: 301, max: 500, cost: 120 },
    { min: 501, max: 1000, cost: 105 },
    { min: 1001, max: 3000, cost: 95 },
    { min: 3001, max: 10000, cost: 90 },
    { min: 10001, max: 999999, cost: 85 },
  ],
  coatingCosts: {
    none: 0,
    matte: { single: 15, double: 25 },
    gloss: { single: 18, double: 30 },
  } as Record<string, number | { single: number; double: number }>,
  finishingSetup: {
    cutting: 3000,
    coating: 5000,
    corner: 3000,
    punch: 3000,
    mising: 3000,
    osi: { 1: 2000, 2: 3000, 3: 4000 } as Record<number, number>,
    fold: { 2: 3000, 3: 4000, 4: 5000 } as Record<number, number>,
    binding_saddle: 5000,
    binding_perfect: 8000,
    binding_spring: 6000,
  },
  finishingVariable: [
    { min: 1, max: 50, cost: 50 },
    { min: 51, max: 100, cost: 40 },
    { min: 101, max: 200, cost: 35 },
    { min: 201, max: 500, cost: 30 },
    { min: 501, max: 1000, cost: 25 },
    { min: 1001, max: 999999, cost: 20 },
  ],
  osiVariable: [
    { min: 1, max: 100, cost: 30 },
    { min: 101, max: 500, cost: 20 },
    { min: 501, max: 999999, cost: 15 },
  ],
  foldVariable: [
    { min: 1, max: 100, cost: 40 },
    { min: 101, max: 500, cost: 30 },
    { min: 501, max: 999999, cost: 20 },
  ],
  ppCosts: {
    clear: 200,
    frosted: 250,
    none: 0,
  } as Record<string, number>,
  backCosts: {
    white: 150,
    black: 150,
    none: 0,
  } as Record<string, number>,
  springCosts: {
    black: 300,
    white: 300,
  } as Record<string, number>,
};

// 기본 고객 선택값 초기화 함수
export function getDefaultCustomer(): CustomerSelection {
  return {
    size: 'a4',
    paper: 'snow',
    weight: 120,
    color: 'color',
    side: 'double',
    coating: 'none',
    coatingSide: 'single',
    finishing: {
      corner: false,
      punch: false,
      mising: false,
      osiEnabled: false,
      osi: 0,
      foldEnabled: false,
      fold: 0,
      coating: false,
      coatingType: null,
      coatingSide: null
    },
    delivery: 'next2',
    deliveryPercent: 0,
    qty: 100,
    pages: 16,
    pp: 'clear',
    coverPrint: 'none',
    coverPaper: 'snow',
    coverWeight: 200,
    back: 'white',
    springColor: 'black',
    innerPaper: 'mojo',
    innerWeight: 80,
    innerColor: 'color',
    innerSide: 'double',
  };
}

// 조건부 연동 규칙
export const LINK_RULES: Record<string, LinkRule> = {
  cover_print_front_back_disables_back: {
    trigger: { block: 'cover_print', value: 'front_back' },
    target: { block: 'back' },
    action: 'disable'
  },
  spring_front_cover_required: {
    trigger: { blocks: ['pp', 'cover_print'], condition: 'both_none' },
    action: 'error',
    message: '전면 커버(PP 또는 표지인쇄) 중 하나는 선택해야 합니다.'
  },
  fold_requires_osi: {
    trigger: { block: 'finishing', subOption: 'fold', condition: 'weight >= 130' },
    target: { block: 'finishing', subOption: 'osi' },
    action: 'auto_enable',
    mapping: { 2: 1, 3: 2, 4: 3 }
  }
};
