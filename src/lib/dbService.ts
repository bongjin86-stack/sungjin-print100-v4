// DB Service Layer - Pricing Data Management
// ============================================================
// sungjin-print100의 가격 DB 서비스를 TypeScript로 재작성
// 용지, 사이즈, 인쇄비, 후가공, 제본 데이터 로딩 및 조회

import { supabase } from './supabase';
import type {
  PricingData,
  Paper,
  PaperCost,
  Size,
  PrintCost,
  FinishingType,
  FinishingCost,
  BindingType,
  BindingCost,
  BuilderData,
} from './types/database';

// 전역 캐시
let cachedData: PricingData | null = null;

/**
 * Supabase에서 모든 가격 데이터를 로드
 * 한 번 로드 후 캐싱하여 재사용
 */
export async function loadPricingData(): Promise<PricingData> {
  // 캐시가 있으면 반환
  if (cachedData) {
    return cachedData;
  }

  try {
    // 1. 용지 데이터 (sort_order 순서로 정렬)
    const { data: papers, error: papersError } = await supabase
      .from('papers')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('id');
    
    if (papersError) throw papersError;

    // 2. 용지 단가
    const { data: paperCosts, error: paperCostsError } = await supabase
      .from('paper_costs')
      .select(`
        *,
        paper:papers(id, code, name)
      `)
      .eq('is_active', true)
      .order('paper_id')
      .order('weight');
    
    if (paperCostsError) throw paperCostsError;

    // 3. 사이즈
    const { data: sizes, error: sizesError } = await supabase
      .from('sizes')
      .select('*')
      .eq('is_active', true)
      .order('up_count', { ascending: false });
    
    if (sizesError) throw sizesError;

    // 4. 인쇄비
    const { data: printCosts, error: printCostsError } = await supabase
      .from('print_costs')
      .select('*')
      .eq('is_active', true)
      .order('min_faces');
    
    if (printCostsError) throw printCostsError;

    // 5. 후가공 타입
    const { data: finishingTypes, error: finishingTypesError } = await supabase
      .from('finishing_types')
      .select('*')
      .eq('is_active', true)
      .order('id');
    
    if (finishingTypesError) throw finishingTypesError;

    // 6. 후가공 비용
    const { data: finishingCosts, error: finishingCostsError } = await supabase
      .from('finishing_costs')
      .select(`
        *,
        finishing_type:finishing_types(id, code, name)
      `)
      .eq('is_active', true)
      .order('finishing_type_id');
    
    if (finishingCostsError) throw finishingCostsError;

    // 7. 제본 타입
    const { data: bindingTypes, error: bindingTypesError } = await supabase
      .from('binding_types')
      .select('*')
      .eq('is_active', true)
      .order('id');
    
    if (bindingTypesError) throw bindingTypesError;

    // 8. 제본 비용
    const { data: bindingCosts, error: bindingCostsError } = await supabase
      .from('binding_costs')
      .select(`
        *,
        binding_type:binding_types(id, code, name)
      `)
      .eq('is_active', true)
      .order('binding_type_id')
      .order('min_qty');
    
    if (bindingCostsError) throw bindingCostsError;

    // 데이터 구조화 및 캐싱
    cachedData = {
      papers: papers as Paper[],
      paperCosts: paperCosts as PaperCost[],
      sizes: sizes as Size[],
      printCosts: printCosts as PrintCost[],
      finishingTypes: finishingTypes as FinishingType[],
      finishingCosts: finishingCosts as FinishingCost[],
      bindingTypes: bindingTypes as BindingType[],
      bindingCosts: bindingCosts as BindingCost[],
    };

    return cachedData;

  } catch (error) {
    console.error('DB 데이터 로드 실패:', error);
    throw error;
  }
}

/**
 * 용지별 평량 목록 반환
 * @param paperCode - 용지 코드 (mojo, snow, inspirer)
 * @param baseSheet - 용지 사이즈 (467x315, 390x270)
 * @returns 평량 배열
 */
export function getPaperWeights(paperCode: string, baseSheet: string = '467x315'): number[] {
  if (!cachedData) return [];
  
  const paper = cachedData.papers.find(p => p.code === paperCode);
  if (!paper) return [];

  return cachedData.paperCosts
    .filter(pc => pc.paper_id === paper.id && pc.base_sheet === baseSheet)
    .map(pc => pc.weight)
    .sort((a, b) => a - b);
}

/**
 * 용지 단가 조회
 * @param paperCode - 용지 코드
 * @param weight - 평량
 * @param baseSheet - 용지 사이즈
 * @returns { cost_per_sheet, margin_rate } 또는 null
 */
export function getPaperCost(
  paperCode: string,
  weight: number,
  baseSheet: string = '467x315'
): { cost_per_sheet: number; margin_rate: number } | null {
  if (!cachedData) return null;
  
  const paper = cachedData.papers.find(p => p.code === paperCode);
  if (!paper) return null;

  const paperCost = cachedData.paperCosts.find(
    pc => pc.paper_id === paper.id && 
          pc.weight === weight && 
          pc.base_sheet === baseSheet
  );

  return paperCost ? {
    cost_per_sheet: paperCost.cost_per_sheet,
    margin_rate: paperCost.margin_rate
  } : null;
}

/**
 * 인쇄비 단가 조회
 * @param faces - 총 면수
 * @returns 면당 단가
 */
export function getPrintCostPerFace(faces: number): number {
  if (!cachedData) return 0;
  
  const tier = cachedData.printCosts.find(
    pc => faces >= pc.min_faces && faces <= pc.max_faces
  );
  
  return tier ? tier.cost_per_face : 85;
}

/**
 * 후가공 비용 조회
 * @param finishingCode - 후가공 코드
 * @returns { setup_cost, cost_per_unit, unit_type } 또는 null
 */
export function getFinishingCost(finishingCode: string): {
  setup_cost: number;
  cost_per_unit: number;
  unit_type: string;
} | null {
  if (!cachedData) return null;

  const finishingType = cachedData.finishingTypes.find(
    ft => ft.code === finishingCode
  );
  if (!finishingType) return null;

  const finishingCost = cachedData.finishingCosts.find(
    fc => fc.finishing_type_id === finishingType.id
  );

  return finishingCost ? {
    setup_cost: finishingCost.setup_cost,
    cost_per_unit: finishingCost.cost_per_unit,
    unit_type: finishingCost.unit_type
  } : null;
}

/**
 * 오시/접지 비용 조회 (줄 수/단 수 기반)
 * notes 컬럼에서 줄 수 파싱하여 매칭
 * @param finishingCode - 후가공 코드 ('creasing' 또는 'folding')
 * @param lines - 줄 수/단 수 (1, 2, 3 또는 2, 3, 4)
 * @param qty - 수량
 * @returns { setup_cost, cost_per_unit, unit_type } 또는 null
 */
export function getFinishingCostByLines(
  finishingCode: string,
  lines: number,
  qty: number
): {
  setup_cost: number;
  cost_per_unit: number;
  unit_type: string;
} | null {
  if (!cachedData) return null;

  const finishingType = cachedData.finishingTypes.find(
    ft => ft.code === finishingCode
  );
  if (!finishingType) return null;

  // notes에서 줄 수/단 수 파싱하여 매칭
  const pattern = finishingCode === 'creasing' ? `${lines}줄` : `${lines}단`;

  const finishingCost = cachedData.finishingCosts.find(
    fc => fc.finishing_type_id === finishingType.id &&
          fc.notes && fc.notes.includes(pattern) &&
          qty >= fc.min_qty &&
          qty <= fc.max_qty
  );

  return finishingCost ? {
    setup_cost: finishingCost.setup_cost,
    cost_per_unit: finishingCost.cost_per_unit,
    unit_type: finishingCost.unit_type
  } : null;
}

/**
 * 코팅 비용 조회 (수량 구간 + 양면 세팅비 지원)
 * @param qty - 수량 (면수 기준)
 * @param isDouble - 양면 여부
 * @returns { setup_cost, cost_per_unit, unit_type } 또는 null
 */
export function getCoatingCost(qty: number, isDouble: boolean = false): {
  setup_cost: number;
  cost_per_unit: number;
  unit_type: string;
} | null {
  if (!cachedData) return null;

  const finishingType = cachedData.finishingTypes.find(
    ft => ft.code === 'coating'
  );
  if (!finishingType) return null;

  // 수량 구간에 맞는 비용 조회
  const finishingCost = cachedData.finishingCosts.find(
    fc => fc.finishing_type_id === finishingType.id &&
          qty >= fc.min_qty &&
          (fc.max_qty === 0 || fc.max_qty === null || qty <= fc.max_qty)
  );
  if (!finishingCost) return null;

  return {
    setup_cost: isDouble ? (finishingCost.setup_cost_double || finishingCost.setup_cost) : finishingCost.setup_cost,
    cost_per_unit: finishingCost.cost_per_unit,
    unit_type: finishingCost.unit_type
  };
}

/**
 * 제본 비용 조회 (수량 기반)
 * @param bindingCode - 제본 코드
 * @param qty - 수량
 * @returns { setup_cost, cost_per_copy } 또는 null
 */
export function getBindingCost(bindingCode: string, qty: number): {
  setup_cost: number;
  cost_per_copy: number;
} | null {
  if (!cachedData) return null;
  
  const bindingType = cachedData.bindingTypes.find(
    bt => bt.code === bindingCode
  );
  if (!bindingType) return null;

  const bindingCost = cachedData.bindingCosts.find(
    bc => bc.binding_type_id === bindingType.id &&
          qty >= bc.min_qty &&
          qty <= bc.max_qty
  );

  return bindingCost ? {
    setup_cost: bindingCost.setup_cost,
    cost_per_copy: bindingCost.cost_per_copy
  } : null;
}

/**
 * 사이즈 정보 조회
 * @param sizeCode - 사이즈 코드
 * @returns { name, width, height, base_sheet, up_count } 또는 null
 */
export function getSizeInfo(sizeCode: string): {
  name: string;
  width: number;
  height: number;
  base_sheet: string;
  up_count: number;
} | null {
  if (!cachedData) return null;
  
  const size = cachedData.sizes.find(s => s.code === sizeCode);
  
  return size ? {
    name: size.name,
    width: size.width,
    height: size.height,
    base_sheet: size.base_sheet,
    up_count: size.up_count
  } : null;
}

/**
 * 캐시 초기화 (관리자 페이지에서 가격 변경 시 사용)
 */
export function clearCache(): void {
  cachedData = null;
}

/**
 * 빌더용 데이터 구조로 변환
 * builderData.ts에서 사용할 형식으로 변환
 */
export function getBuilderData(): BuilderData | null {
  if (!cachedData) return null;

  // 용지별 평량 맵 생성
  const paperWeightsMap: BuilderData['paperWeights'] = {};
  cachedData.papers.forEach(paper => {
    const weights467 = getPaperWeights(paper.code, '467x315');
    const weights390 = getPaperWeights(paper.code, '390x270');
    paperWeightsMap[paper.code] = {
      '467x315': weights467,
      '390x270': weights390,
      all: [...new Set([...weights467, ...weights390])].sort((a, b) => a - b)
    };
  });

  // 사이즈 맵 생성
  const sizesMap: BuilderData['sizes'] = {};
  cachedData.sizes.forEach(size => {
    sizesMap[size.code] = {
      name: size.name,
      multiplier: size.up_count,
      base_sheet: size.base_sheet
    };
  });

  return {
    papers: cachedData.papers,
    paperWeights: paperWeightsMap,
    sizes: sizesMap,
    finishingTypes: cachedData.finishingTypes,
    bindingTypes: cachedData.bindingTypes
  };
}
