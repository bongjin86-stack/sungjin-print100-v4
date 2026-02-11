// Database Types for Pricing System
// ============================================================

// 용지 (Papers)
export interface Paper {
  id: string;
  code: string;
  name: string;
  description: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 용지 단가 (Paper Costs)
export interface PaperCost {
  id: string;
  paper_id: string;
  weight: number;
  base_sheet: string; // '467x315' or '390x270'
  cost_per_sheet: number;
  margin_rate: number;
  thickness: number | null; // 용지 두께 (mm) - 제본 두께 계산용
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Join data
  paper?: {
    id: string;
    code: string;
    name: string;
  };
}

// 사이즈 (Sizes)
export interface Size {
  id: string;
  code: string;
  name: string;
  width: number;
  height: number;
  base_sheet: string;
  up_count: number; // 전지에서 몇 장 나오는지
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 인쇄비 (Print Costs)
export interface PrintCost {
  id: string;
  min_faces: number;
  max_faces: number;
  cost_per_face: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 후가공 종류 (Finishing Types)
export interface FinishingType {
  id: string;
  code: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 후가공 비용 (Finishing Costs)
export interface FinishingCost {
  id: string;
  finishing_type_id: string;
  min_qty: number;
  max_qty: number;
  setup_cost: number;
  setup_cost_double?: number; // 양면 세팅비 (코팅용)
  cost_per_unit: number;
  unit_type: string; // 'sheet', 'copy', 'line' 등
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Join data
  finishing_type?: {
    id: string;
    code: string;
    name: string;
  };
}

// 제본 종류 (Binding Types)
export interface BindingType {
  id: string;
  code: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 제본 비용 (Binding Costs)
export interface BindingCost {
  id: string;
  binding_type_id: string;
  min_qty: number;
  max_qty: number;
  setup_cost: number;
  cost_per_copy: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Join data
  binding_type?: {
    id: string;
    code: string;
    name: string;
  };
}

// 선계산된 가격 (Size × Paper 조합)
export interface SizePaperPrice {
  id: number;
  size_id: number;
  paper_cost_id: number;
  up_count: number;
  cost_per_sheet: number;
  margin_rate: number;
  sell_price_per_sheet: number;
  sell_price_per_copy: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Join data
  size?: {
    id: number;
    code: string;
    name: string;
  };
  paper_cost?: {
    id: number;
    paper_id: number;
    weight: number;
    paper?: {
      id: number;
      code: string;
      name: string;
    };
  };
}

// 전체 가격 데이터 (캐시용)
export interface PricingData {
  papers: Paper[];
  paperCosts: PaperCost[];
  sizes: Size[];
  printCosts: PrintCost[];
  finishingTypes: FinishingType[];
  finishingCosts: FinishingCost[];
  bindingTypes: BindingType[];
  bindingCosts: BindingCost[];
  sizePaperPrice: SizePaperPrice[];
}

// 빌더용 데이터 구조
export interface BuilderData {
  papers: Paper[];
  paperWeights: {
    [paperCode: string]: {
      "467x315": number[];
      "390x270": number[];
      all: number[];
    };
  };
  sizes: {
    [sizeCode: string]: {
      name: string;
      multiplier: number;
      base_sheet: string;
      width: number;
      height: number;
    };
  };
  finishingTypes: FinishingType[];
  bindingTypes: BindingType[];
}
