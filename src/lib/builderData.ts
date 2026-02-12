// ============================================================
// 빌더 데이터 v4 - 코팅 확장, 출고일 설정, 후가공 오시/접지
// ============================================================

// 블록 타입 정의
export interface BlockTypeInfo {
  name: string;
  icon: string;
  color: string;
  desc: string;
  deprecated?: boolean;
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
  default?:
    | string
    | number
    | { paper: string; weight: number }
    | { color: string; side: string };
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
  maxThickness?: number;
  defaultPaper?: { paper: string; weight: number };
  defaultPrint?: { color: string; side: string };
  defaultPages?: number;
  linkedPaper?: number;
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

// 블록 타입 정의 (Dieter Rams style - muted colors with icons)
export const BLOCK_TYPES: Record<string, BlockTypeInfo> = {
  size: {
    name: "사이즈",
    icon: "📐",
    color: "from-stone-100 to-stone-200",
    desc: "출력 사이즈",
  },
  paper: {
    name: "용지",
    icon: "📄",
    color: "from-stone-100 to-stone-200",
    desc: "용지 종류 + 평량",
  },
  print: {
    name: "인쇄",
    icon: "🖨️",
    color: "from-stone-100 to-stone-200",
    desc: "컬러/흑백, 단면/양면",
  },
  finishing: {
    name: "후가공",
    icon: "✨",
    color: "from-stone-100 to-stone-200",
    desc: "코팅, 오시, 접지, 귀도리, 타공, 미싱",
  },
  delivery: {
    name: "출고일",
    icon: "📦",
    color: "from-stone-100 to-stone-200",
    desc: "출고 일정 + 할증/할인",
  },
  quantity: {
    name: "수량",
    icon: "🔢",
    color: "from-stone-100 to-stone-200",
    desc: "주문 수량",
  },
  pp: {
    name: "PP",
    icon: "🔲",
    color: "from-stone-100 to-stone-200",
    desc: "투명/불투명/없음",
    deprecated: true, // spring_options로 통합됨
  },
  cover_print: {
    name: "표지인쇄",
    icon: "📋",
    color: "from-stone-100 to-stone-200",
    desc: "없음/앞표지/앞뒤표지",
    deprecated: true, // spring_options로 통합됨
  },
  back: {
    name: "뒷판",
    icon: "🔳",
    color: "from-stone-100 to-stone-200",
    desc: "뒷판 색상",
    deprecated: true, // spring_options로 통합됨
  },
  spring_color: {
    name: "스프링색상",
    icon: "🔗",
    color: "from-stone-100 to-stone-200",
    desc: "스프링 색상",
    deprecated: true, // spring_options로 통합됨
  },
  spring_options: {
    name: "스프링 옵션",
    icon: "🔧",
    color: "from-stone-100 to-stone-200",
    desc: "PP/표지인쇄/뒷판/스프링색상",
  },
  inner_layer_saddle: {
    name: "내지(중철)",
    icon: "📚",
    color: "from-amber-100 to-amber-200",
    desc: "내지 용지+인쇄+페이지 (4p단위)",
    deprecated: true, // 현재 템플릿에서 미사용, 하위호환용 유지
  },
  inner_layer_leaf: {
    name: "내지(무선/스프링)",
    icon: "📗",
    color: "from-emerald-100 to-emerald-200",
    desc: "내지 용지+인쇄+페이지 (1p단위)",
    deprecated: true, // 현재 템플릿에서 미사용, 하위호환용 유지
  },
  guide: {
    name: "가이드",
    icon: "❓",
    color: "from-blue-100 to-blue-200",
    desc: "고객 안내 질문 (왼쪽 카드)",
  },
  consultation: {
    name: "상담",
    icon: "💬",
    color: "from-yellow-100 to-yellow-200",
    desc: "카카오톡 상담 안내",
  },
};

// 상품 템플릿
export const TEMPLATES: Record<string, Template> = {
  flyer: {
    name: "전단지",
    blocks: [
      {
        id: 1,
        type: "size",
        label: "사이즈",
        on: true,
        optional: false,
        locked: false,
        hidden: false,
        config: { options: ["a4", "a5", "b5"], default: "a4" },
      },
      {
        id: 2,
        type: "paper",
        label: "용지",
        on: true,
        optional: false,
        locked: false,
        hidden: false,
        config: {
          papers: { snow: [100, 120, 150, 180], mojo: [80, 100, 120] },
          default: { paper: "snow", weight: 120 },
        },
      },
      {
        id: 3,
        type: "print",
        label: "인쇄",
        on: true,
        optional: false,
        locked: false,
        hidden: false,
        config: {
          color: true,
          mono: true,
          single: true,
          double: true,
          default: { color: "color", side: "double" },
        },
      },
      {
        id: 4,
        type: "finishing",
        label: "후가공",
        on: false,
        optional: true,
        locked: false,
        hidden: false,
        config: {
          corner: true,
          punch: true,
          mising: false,
          coating: {
            enabled: true,
            types: ["matte", "gloss"],
            sides: ["single", "double"],
          },
          osi: { enabled: true, options: [1, 2, 3] },
          fold: { enabled: true, options: [2, 3, 4] },
        },
      },
      {
        id: 5,
        type: "delivery",
        label: "출고일",
        on: true,
        optional: false,
        locked: false,
        hidden: false,
        config: {
          options: [
            {
              id: "same",
              label: "당일",
              enabled: false,
              percent: 30,
              deadline: "10:00",
            },
            {
              id: "next1",
              label: "1영업일",
              enabled: true,
              percent: 15,
              deadline: "12:00",
            },
            {
              id: "next2",
              label: "2영업일",
              enabled: true,
              percent: 0,
              deadline: "12:00",
            },
            {
              id: "next3",
              label: "3영업일",
              enabled: true,
              percent: -5,
              deadline: "12:00",
            },
          ],
          default: "next2",
        },
      },
      {
        id: 6,
        type: "quantity",
        label: "수량",
        on: true,
        optional: false,
        locked: false,
        hidden: false,
        config: { options: [50, 100, 200, 500, 1000], default: 100 },
      },
    ],
  },

  perfect: {
    name: "무선제본",
    blocks: [
      {
        id: 1,
        type: "size",
        label: "사이즈",
        on: true,
        optional: false,
        locked: false,
        hidden: false,
        config: { options: ["a4", "a5", "b5"], default: "a4" },
      },
      {
        id: 2,
        type: "paper",
        label: "표지 용지",
        on: true,
        optional: false,
        locked: false,
        hidden: false,
        config: {
          papers: { snow: [200, 250, 300] },
          default: { paper: "snow", weight: 250 },
        },
      },
      {
        id: 3,
        type: "print",
        label: "표지 인쇄",
        on: true,
        optional: false,
        locked: true,
        hidden: true,
        config: {
          color: true,
          mono: false,
          single: false,
          double: true,
          default: { color: "color", side: "double" },
        },
      },
      {
        id: 4,
        type: "finishing",
        label: "표지 후가공",
        on: true,
        optional: false,
        locked: false,
        hidden: false,
        config: {
          corner: false,
          punch: false,
          mising: false,
          coating: {
            enabled: true,
            types: ["matte", "gloss"],
            sides: ["single", "double"],
          },
          osi: { enabled: false, options: [] },
          fold: { enabled: false, options: [] },
        },
      },
      {
        id: 5,
        type: "paper",
        label: "내지 용지",
        on: true,
        optional: false,
        locked: false,
        hidden: false,
        config: {
          papers: { mojo: [80, 100], snow: [100, 120] },
          default: { paper: "mojo", weight: 80 },
        },
      },
      {
        id: 6,
        type: "print",
        label: "내지 인쇄",
        on: true,
        optional: false,
        locked: false,
        hidden: false,
        config: {
          color: true,
          mono: true,
          single: true,
          double: true,
          default: { color: "color", side: "double" },
        },
      },
      {
        id: 7,
        type: "pages",
        label: "페이지 수",
        on: true,
        optional: false,
        locked: false,
        hidden: false,
        config: {
          min: 40,
          max: 500,
          step: 2,
          default: 100,
          bindingType: "leaf",
          linkedBlocks: {
            coverPaper: 2,
            coverPrint: 3,
            innerPaper: 5,
            innerPrint: 6,
          },
        },
      },
      {
        id: 8,
        type: "delivery",
        label: "출고일",
        on: true,
        optional: false,
        locked: false,
        hidden: false,
        config: {
          options: [
            {
              id: "next2",
              label: "2영업일",
              enabled: true,
              percent: 0,
              deadline: "12:00",
            },
            {
              id: "next3",
              label: "3영업일",
              enabled: true,
              percent: -5,
              deadline: "12:00",
            },
          ],
          default: "next2",
        },
      },
      {
        id: 9,
        type: "quantity",
        label: "수량",
        on: true,
        optional: false,
        locked: false,
        hidden: false,
        config: { options: [10, 20, 30, 50, 100], default: 30 },
      },
    ],
  },

  saddle: {
    name: "중철제본",
    blocks: [
      {
        id: 1,
        type: "size",
        label: "사이즈",
        on: true,
        optional: false,
        locked: false,
        hidden: false,
        config: { options: ["a4", "a5", "b5"], default: "a4" },
      },
      {
        id: 2,
        type: "paper",
        label: "표지 용지",
        on: true,
        optional: false,
        locked: false,
        hidden: false,
        config: {
          papers: { snow: [150, 180, 200] },
          default: { paper: "snow", weight: 180 },
        },
      },
      {
        id: 3,
        type: "print",
        label: "표지 인쇄",
        on: true,
        optional: false,
        locked: true,
        hidden: true,
        config: {
          color: true,
          mono: false,
          single: false,
          double: true,
          default: { color: "color", side: "double" },
        },
      },
      {
        id: 4,
        type: "finishing",
        label: "표지 후가공",
        on: true,
        optional: true,
        locked: false,
        hidden: false,
        config: {
          corner: false,
          punch: false,
          mising: false,
          coating: {
            enabled: true,
            types: ["matte", "gloss"],
            sides: ["single", "double"],
          },
          osi: { enabled: false, options: [] },
          fold: { enabled: false, options: [] },
        },
      },
      {
        id: 5,
        type: "paper",
        label: "내지 용지",
        on: true,
        optional: false,
        locked: false,
        hidden: false,
        config: {
          papers: { mojo: [80, 100], snow: [100, 120] },
          default: { paper: "mojo", weight: 80 },
        },
      },
      {
        id: 6,
        type: "print",
        label: "내지 인쇄",
        on: true,
        optional: false,
        locked: false,
        hidden: false,
        config: {
          color: true,
          mono: true,
          single: false,
          double: true,
          default: { color: "color", side: "double" },
        },
      },
      {
        id: 7,
        type: "pages",
        label: "페이지 수",
        on: true,
        optional: false,
        locked: false,
        hidden: false,
        config: {
          min: 8,
          max: 48,
          step: 4,
          default: 16,
          bindingType: "saddle",
          linkedBlocks: {
            coverPaper: 2,
            coverPrint: 3,
            innerPaper: 5,
            innerPrint: 6,
          },
        },
      },
      {
        id: 8,
        type: "delivery",
        label: "출고일",
        on: true,
        optional: false,
        locked: false,
        hidden: false,
        config: {
          options: [
            {
              id: "next2",
              label: "2영업일",
              enabled: true,
              percent: 0,
              deadline: "12:00",
            },
            {
              id: "next3",
              label: "3영업일",
              enabled: true,
              percent: -5,
              deadline: "12:00",
            },
          ],
          default: "next2",
        },
      },
      {
        id: 9,
        type: "quantity",
        label: "수량",
        on: true,
        optional: false,
        locked: false,
        hidden: false,
        config: { options: [10, 20, 30, 50, 100], default: 30 },
      },
    ],
  },

  spring: {
    name: "스프링제본",
    blocks: [
      {
        id: 1,
        type: "size",
        label: "사이즈",
        on: true,
        optional: false,
        locked: false,
        hidden: false,
        config: { options: ["a4", "a5", "b5"], default: "a4" },
      },
      {
        id: 2,
        type: "spring_options",
        label: "스프링 옵션",
        on: true,
        optional: false,
        locked: false,
        hidden: false,
        config: {
          pp: {
            enabled: true,
            options: [
              { id: "clear", label: "투명", enabled: true, default: true },
              { id: "frosted", label: "불투명", enabled: true, default: false },
              { id: "none", label: "없음", enabled: true, default: false },
            ],
          },
          coverPrint: {
            enabled: true,
            options: [
              { id: "none", label: "없음", enabled: true, default: true },
              {
                id: "front_only",
                label: "앞표지만",
                enabled: true,
                default: false,
              },
              {
                id: "front_back",
                label: "앞뒤표지",
                enabled: true,
                default: false,
              },
            ],
            papers: { snow: [200, 250, 300], mojo: [150, 180] },
            defaultPaper: { paper: "snow", weight: 200 },
          },
          back: {
            enabled: true,
            options: [
              { id: "white", label: "화이트", enabled: true, default: true },
              { id: "black", label: "블랙", enabled: true, default: false },
              { id: "none", label: "없음", enabled: true, default: false },
            ],
          },
          springColor: {
            enabled: true,
            options: [
              { id: "black", label: "블랙", enabled: true, default: true },
              { id: "white", label: "화이트", enabled: true, default: false },
            ],
          },
        },
      },
      {
        id: 3,
        type: "paper",
        label: "내지 용지",
        on: true,
        optional: false,
        locked: false,
        hidden: false,
        config: {
          papers: { mojo: [80, 100], snow: [100, 120] },
          default: { paper: "mojo", weight: 80 },
        },
      },
      {
        id: 4,
        type: "print",
        label: "내지 인쇄",
        on: true,
        optional: false,
        locked: false,
        hidden: false,
        config: {
          color: true,
          mono: true,
          single: true,
          double: true,
          default: { color: "color", side: "double" },
        },
      },
      {
        id: 5,
        type: "pages",
        label: "페이지 수",
        on: true,
        optional: false,
        locked: false,
        hidden: false,
        config: {
          min: 10,
          max: 400,
          step: 2,
          default: 50,
          bindingType: "leaf",
          linkedBlocks: { innerPaper: 3, innerPrint: 4 },
        },
      },
      {
        id: 6,
        type: "delivery",
        label: "출고일",
        on: true,
        optional: false,
        locked: false,
        hidden: false,
        config: {
          options: [
            {
              id: "next2",
              label: "2영업일",
              enabled: true,
              percent: 0,
              deadline: "12:00",
              default: true,
            },
            {
              id: "next3",
              label: "3영업일",
              enabled: true,
              percent: -5,
              deadline: "12:00",
              default: false,
            },
          ],
          default: "next2",
        },
      },
      {
        id: 7,
        type: "quantity",
        label: "수량",
        on: true,
        optional: false,
        locked: false,
        hidden: false,
        config: { options: [10, 20, 30, 50, 100], default: 30 },
      },
    ],
  },
};

// DB 데이터 (폴백용 하드코딩)
export const DB = {
  papers: [
    {
      code: "snow",
      name: "스노우지",
      desc: "고급 광택 용지",
      color: "from-blue-50 to-blue-100",
    },
    {
      code: "mojo",
      name: "모조지",
      desc: "일반 인쇄 용지",
      color: "from-amber-50 to-amber-100",
    },
    {
      code: "inspirer",
      name: "인스퍼",
      desc: "고급 무광 용지",
      color: "from-gray-50 to-gray-100",
    },
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
    a3: { name: "A3", multiplier: 1, width: 297, height: 420 },
    a4: { name: "A4", multiplier: 2, width: 210, height: 297 },
    b5: { name: "B5", multiplier: 2, width: 182, height: 257 },
    a5: { name: "A5", multiplier: 4, width: 148, height: 210 },
    postcard: { name: "엽서", multiplier: 8, width: 100, height: 148 },
  } as Record<string, { name: string; multiplier: number; width: number; height: number }>,
  printCosts: [
    { min: 1, max: 1, cost: 500 },
    { min: 2, max: 2, cost: 480 },
    { min: 3, max: 5, cost: 440 },
    { min: 6, max: 10, cost: 400 },
    { min: 11, max: 20, cost: 350 },
    { min: 21, max: 30, cost: 300 },
    { min: 31, max: 50, cost: 260 },
    { min: 51, max: 80, cost: 240 },
    { min: 81, max: 100, cost: 220 },
    { min: 101, max: 200, cost: 200 },
    { min: 201, max: 500, cost: 185 },
    { min: 501, max: 750, cost: 178 },
    { min: 751, max: 1000, cost: 172 },
    { min: 1001, max: 1500, cost: 163 },
    { min: 1501, max: 2000, cost: 152 },
    { min: 2001, max: 3000, cost: 142 },
    { min: 3001, max: 4000, cost: 128 },
    { min: 4001, max: 5500, cost: 120 },
    { min: 5501, max: 7000, cost: 114 },
    { min: 7001, max: 9000, cost: 106 },
    { min: 9001, max: 12000, cost: 98 },
    { min: 12001, max: 15000, cost: 92 },
    { min: 15001, max: 20000, cost: 88 },
    { min: 20001, max: 999999, cost: 85 },
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

// 고정 출고일 옵션 4개 - ID는 절대 변경 불가
export const FIXED_DELIVERY_OPTIONS = [
  { id: "same", label: "당일", days: 0, defaultPercent: 30 },
  { id: "next1", label: "1영업일", days: 1, defaultPercent: 15 },
  { id: "next2", label: "2영업일", days: 2, defaultPercent: 0 },
  { id: "next3", label: "3영업일", days: 3, defaultPercent: -5 },
] as const;

// 기본 고객 선택값 초기화 함수
export function getDefaultCustomer(): CustomerSelection {
  return {
    size: "a4",
    paper: "snow",
    weight: 120,
    color: "color",
    side: "double",
    coating: "none",
    coatingSide: "single",
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
      coatingSide: null,
    },
    delivery: "next2",
    deliveryPercent: 0,
    qty: 100,
    pages: 16,
    pp: "clear",
    coverPrint: "none",
    coverPaper: "snow",
    coverWeight: 200,
    back: "white",
    springColor: "black",
    innerPaper: "mojo",
    innerWeight: 80,
    innerColor: "color",
    innerSide: "double",
  };
}

// spring_options 블록의 기본값 폴백 (cfg에 옵션이 없으면 TEMPLATES.spring에서 가져옴)
export function getSpringOptionsDefaults(blockConfig: BlockConfig) {
  const defaultSpringCfg =
    TEMPLATES.spring?.blocks?.find((b) => b.type === "spring_options")
      ?.config || ({} as BlockConfig);

  return {
    ppOptions:
      blockConfig.pp?.options?.length > 0
        ? blockConfig.pp.options
        : defaultSpringCfg.pp?.options || [],
    coverPrintOptions:
      blockConfig.coverPrint?.options?.length > 0
        ? blockConfig.coverPrint.options
        : defaultSpringCfg.coverPrint?.options || [],
    backOptions:
      blockConfig.back?.options?.length > 0
        ? blockConfig.back.options
        : defaultSpringCfg.back?.options || [],
    springColorOptions:
      blockConfig.springColor?.options?.length > 0
        ? blockConfig.springColor.options
        : defaultSpringCfg.springColor?.options || [],
    coverPrintPapers:
      blockConfig.coverPrint?.papers ||
      defaultSpringCfg.coverPrint?.papers ||
      {},
    defaultSpringCfg,
  };
}

// 블록 타입별 기본 config (새 블록 추가 시 사용)
export function getDefaultConfig(type: string): BlockConfig {
  switch (type) {
    case "size":
      return { options: ["a4", "a5", "b5"], default: "a4" };
    case "paper":
      return {
        papers: { snow: [120, 150], mojo: [80, 100] },
        default: { paper: "snow", weight: 120 },
      };
    case "print":
      return {
        color: true,
        mono: true,
        single: true,
        double: true,
        default: { color: "color", side: "double" },
      };
    case "finishing":
      return { corner: true, punch: true, mising: false, default: {} };
    case "pp":
      return { options: ["clear", "frosted", "none"], default: "clear" };
    case "cover_print":
      return {
        options: ["none", "front_only", "front_back"],
        default: "none",
        papers: { snow: [200, 250], mojo: [150, 180] },
        defaultPaper: { paper: "snow", weight: 200 },
      };
    case "back":
      return { options: ["white", "black", "none"], default: "white" };
    case "spring_color":
      return { options: ["black", "white"], default: "black" };
    case "delivery":
      return {
        options: [
          { id: "same", label: "당일", enabled: true, percent: 30 },
          { id: "next1", label: "1영업일", enabled: true, percent: 15 },
          { id: "next2", label: "2영업일", enabled: true, percent: 0 },
          { id: "next3", label: "3영업일", enabled: true, percent: -5 },
        ],
        default: "next2",
      } as any;
    case "quantity":
      return {
        options: [50, 100, 200, 500, 1000],
        default: 100,
        min: 10,
        max: 5000,
        allowCustom: false,
        showUnitPrice: true,
        contactThreshold: 0,
        contactMessage: "",
        roundEnabled: false,
        roundUnit: 100,
        roundMethod: "floor",
      };
    case "inner_layer_saddle":
      return {
        papers: {
          mojo: [80, 100, 120],
          snow: [100, 120, 150],
          art: [100, 120, 150],
          rendezvous: [120, 150],
          insper: [120, 150],
        },
        defaultPaper: { paper: "mojo", weight: 80 },
        color: true,
        mono: true,
        single: false,
        double: true,
        defaultPrint: { color: "color", side: "double" },
        min: 8,
        step: 4,
        defaultPages: 16,
        maxThickness: 2.5,
        paperLocked: false,
        paperHidden: false,
        printColorLocked: false,
        printColorHidden: false,
        printSideLocked: true,
        printSideHidden: true,
        pagesLocked: false,
        pagesHidden: false,
      } as any;
    case "inner_layer_leaf":
      return {
        papers: {
          mojo: [80, 100, 120],
          snow: [100, 120, 150],
          art: [100, 120, 150],
          rendezvous: [120, 150],
          insper: [120, 150],
        },
        defaultPaper: { paper: "mojo", weight: 80 },
        color: true,
        mono: true,
        single: true,
        double: true,
        defaultPrint: { color: "color", side: "double" },
        min: 10,
        step: 1,
        defaultPages: 50,
        maxThickness: 50,
        paperLocked: false,
        paperHidden: false,
        printColorLocked: false,
        printColorHidden: false,
        printSideLocked: false,
        printSideHidden: false,
        pagesLocked: false,
        pagesHidden: false,
      } as any;
    case "pages_saddle":
      return {
        min: 8,
        max: 48,
        step: 4,
        default: 16,
        maxThickness: 2.5,
      } as any;
    case "pages_leaf":
      return {
        min: 10,
        max: 500,
        step: 2,
        default: 50,
        maxThickness: 50,
      } as any;
    case "pages":
      return {
        min: 8,
        max: 48,
        step: 4,
        default: 16,
        maxThickness: 2.5,
        bindingType: "saddle",
        linkedBlocks: {},
      } as any;
    case "guide":
      return {
        title: "질문을 입력하세요",
        options: [
          { id: "opt_1", label: "옵션 1", hint: "", price: 0 },
          { id: "opt_2", label: "옵션 2", hint: "", price: 0 },
        ],
        default: "opt_1",
        required: true,
      } as any;
    case "consultation":
      return {
        title: "성진프린트 상담",
        message:
          "주문 전 궁금한 점이 있으시면 아래에서 확인하시거나, 카톡으로 편하게 문의하세요.",
        faqs: [
          { id: "faq_1", emoji: "📄", text: "어떤 파일 형식으로 보내야 하나요?", answer: "AI, PDF, PSD, JPG 등 대부분의 파일 형식을 지원합니다. 가장 좋은 품질을 위해 AI 또는 PDF 파일을 권장합니다." },
          { id: "faq_2", emoji: "🎨", text: "모니터와 인쇄 색상이 다를 수 있나요?", answer: "네, 모니터는 RGB, 인쇄는 CMYK 색상 체계를 사용하므로 차이가 발생할 수 있습니다. 중요한 색상은 별색(팬톤) 지정을 권장합니다." },
          { id: "faq_3", emoji: "📐", text: "재단 여백은 어떻게 잡아야 하나요?", answer: "사방 2~3mm의 재단 여백을 포함해 주세요. 중요한 텍스트나 이미지는 재단선 안쪽 3mm 이상 여유를 두시면 안전합니다." },
        ],
        kakaoUrl: "https://pf.kakao.com/_sungjinprint",
        ctaText: "카카오톡으로 상담하기",
        openTime: "09:00",
        closeTime: "18:00",
      } as any;
    default:
      return {} as BlockConfig;
  }
}

// 기본 콘텐츠 생성 함수 (상품명 기반)
export function getDefaultContent(name: string) {
  const contents: Record<string, any> = {
    전단지: {
      title: "전단지",
      description: "고품질 전단지 인쇄 서비스",
      features: [
        "다양한 용지 선택 가능",
        "컬러/흑백 인쇄",
        "빠른 출고",
        "합리적인 가격",
      ],
      mainImage: null,
      thumbnails: [null, null, null, null],
      highlights: [
        {
          icon: "Printer",
          title: "고품질 인쇄",
          desc: "최신 인쇄 장비로 선명한 출력",
        },
        { icon: "Truck", title: "빠른 배송", desc: "주문 후 1~3일 내 출고" },
      ],
    },
    무선제본: {
      title: "무선제본",
      description: "깔끔한 무선제본 인쇄 서비스",
      features: [
        "표지/내지 분리 설정",
        "다양한 페이지 수",
        "고급 표지 코팅",
        "전문 제본",
      ],
      mainImage: null,
      thumbnails: [null, null, null, null],
      highlights: [
        {
          icon: "BookOpen",
          title: "전문 제본",
          desc: "깔끔하고 튼튼한 무선제본",
        },
        {
          icon: "Sparkles",
          title: "고급 마감",
          desc: "표지 코팅으로 고급스러운 느낌",
        },
      ],
    },
    중철제본: {
      title: "중철제본",
      description: "가성비 좋은 중철제본 인쇄 서비스",
      features: [
        "얇은 책자에 적합",
        "경제적인 가격",
        "빠른 제작",
        "깔끔한 마감",
      ],
      mainImage: null,
      thumbnails: [null, null, null, null],
      highlights: [
        {
          icon: "Paperclip",
          title: "심플한 제본",
          desc: "가볍고 깔끔한 중철제본",
        },
        {
          icon: "CircleDollarSign",
          title: "경제적",
          desc: "합리적인 가격의 제본 서비스",
        },
      ],
    },
    스프링제본: {
      title: "스프링제본",
      description: "편리한 스프링제본 인쇄 서비스",
      features: [
        "180도 펼침 가능",
        "PP 표지 선택",
        "다양한 스프링 색상",
        "튼튼한 제본",
      ],
      mainImage: null,
      thumbnails: [null, null, null, null],
      highlights: [
        {
          icon: "Link2",
          title: "편리한 사용",
          desc: "180도 완전히 펼쳐지는 스프링",
        },
        { icon: "Shield", title: "내구성", desc: "PP 표지로 오래 사용 가능" },
      ],
    },
  };
  return (
    contents[name] || {
      title: name,
      description: "",
      features: ["", "", "", ""],
      mainImage: null,
      thumbnails: [null, null, null, null],
      highlights: [
        { icon: "FileText", title: "", desc: "" },
        { icon: "Sparkles", title: "", desc: "" },
      ],
    }
  );
}
