// DB Service Layer - Pricing Data Management (최적화 버전)
// ============================================================
// v2: Promise.all 병렬 쿼리 + Map 인덱스 O(1) 조회
// sungjin-print100 v1의 최적화를 TypeScript로 적용

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
  SizePaperPrice,
  BuilderData,
} from './types/database';

// 전역 캐시
let cachedData: PricingData | null = null;

// 인덱스 맵 (O(1) 조회용)
interface IndexMaps {
  size: Map<string, Size>;
  paper: Map<string, Paper>;
  paperCost: Map<string, PaperCost>;
  paperWeights: Map<string, number[]>;
  finishingType: Map<string, FinishingType>;
  finishingCostByTypeId: Map<string, FinishingCost[]>;
  bindingType: Map<string, BindingType>;
  bindingCostByTypeId: Map<string, BindingCost[]>;
  sizePaperPrice: Map<string, SizePaperPrice>;
}

let indexMaps: IndexMaps | null = null;

/**
 * 캐시 데이터로부터 Map 인덱스 빌드
 */
function buildIndexMaps(data: PricingData): IndexMaps {
  const maps: IndexMaps = {
    size: new Map(),
    paper: new Map(),
    paperCost: new Map(),
    paperWeights: new Map(),
    finishingType: new Map(),
    finishingCostByTypeId: new Map(),
    bindingType: new Map(),
    bindingCostByTypeId: new Map(),
    sizePaperPrice: new Map(),
  };

  // 사이즈: code → size
  data.sizes.forEach(s => maps.size.set(s.code, s));

  // 용지: code → paper
  data.papers.forEach(p => maps.paper.set(p.code, p));

  // 용지 단가: "paperId:weight:baseSheet" → paperCost
  data.paperCosts.forEach(pc => {
    maps.paperCost.set(`${pc.paper_id}:${pc.weight}:${pc.base_sheet}`, pc);
  });

  // 용지 평량: "paperCode:baseSheet" → [weight, ...]
  data.paperCosts.forEach(pc => {
    const paper = data.papers.find(p => p.id === pc.paper_id);
    if (!paper) return;
    const key = `${paper.code}:${pc.base_sheet}`;
    if (!maps.paperWeights.has(key)) maps.paperWeights.set(key, []);
    maps.paperWeights.get(key)!.push(pc.weight);
  });
  maps.paperWeights.forEach(weights => weights.sort((a, b) => a - b));

  // 후가공 타입: code → finishingType
  data.finishingTypes.forEach(ft => maps.finishingType.set(ft.code, ft));

  // 후가공 비용: finishingTypeId → [finishingCost, ...]
  data.finishingCosts.forEach(fc => {
    if (!maps.finishingCostByTypeId.has(fc.finishing_type_id)) {
      maps.finishingCostByTypeId.set(fc.finishing_type_id, []);
    }
    maps.finishingCostByTypeId.get(fc.finishing_type_id)!.push(fc);
  });

  // 제본 타입: code → bindingType
  data.bindingTypes.forEach(bt => maps.bindingType.set(bt.code, bt));

  // 제본 비용: bindingTypeId → [bindingCost, ...]
  data.bindingCosts.forEach(bc => {
    if (!maps.bindingCostByTypeId.has(bc.binding_type_id)) {
      maps.bindingCostByTypeId.set(bc.binding_type_id, []);
    }
    maps.bindingCostByTypeId.get(bc.binding_type_id)!.push(bc);
  });

  // 선계산 가격: "sizeCode:paperCode:weight" → precalcRow
  (data.sizePaperPrice || []).forEach(spp => {
    const sizeCode = spp.size?.code;
    const paperCode = spp.paper_cost?.paper?.code;
    const weight = spp.paper_cost?.weight;
    if (sizeCode && paperCode && weight != null) {
      maps.sizePaperPrice.set(`${sizeCode}:${paperCode}:${weight}`, spp);
    }
  });

  return maps;
}

/**
 * Supabase에서 모든 가격 데이터를 병렬 로드
 * 한 번 로드 후 캐싱 + Map 인덱스 빌드
 */
export async function loadPricingData(): Promise<PricingData> {
  if (cachedData) return cachedData;

  try {
    // 9개 쿼리 병렬 실행 (순차 ~900ms → 병렬 ~100ms)
    const [
      { data: papers, error: e1 },
      { data: paperCosts, error: e2 },
      { data: sizes, error: e3 },
      { data: printCosts, error: e4 },
      { data: finishingTypes, error: e5 },
      { data: finishingCosts, error: e6 },
      { data: bindingTypes, error: e7 },
      { data: bindingCosts, error: e8 },
      { data: sizePaperPrice, error: e9 },
    ] = await Promise.all([
      supabase
        .from('papers').select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }).order('id'),
      supabase
        .from('paper_costs').select('*, paper:papers(id, code, name)')
        .eq('is_active', true)
        .order('paper_id').order('weight'),
      supabase
        .from('sizes').select('*')
        .eq('is_active', true)
        .order('up_count', { ascending: false }),
      supabase
        .from('print_costs').select('*')
        .eq('is_active', true)
        .order('min_faces'),
      supabase
        .from('finishing_types').select('*')
        .eq('is_active', true)
        .order('id'),
      supabase
        .from('finishing_costs').select('*, finishing_type:finishing_types(id, code, name)')
        .eq('is_active', true)
        .order('finishing_type_id'),
      supabase
        .from('binding_types').select('*')
        .eq('is_active', true)
        .order('id'),
      supabase
        .from('binding_costs').select('*, binding_type:binding_types(id, code, name)')
        .eq('is_active', true)
        .order('binding_type_id').order('min_qty'),
      supabase
        .from('size_paper_price')
        .select('*, size:sizes(id, code, name), paper_cost:paper_costs(id, paper_id, weight, paper:papers(id, code, name))')
        .eq('is_active', true),
    ]);

    if (e1) throw e1;
    if (e2) throw e2;
    if (e3) throw e3;
    if (e4) throw e4;
    if (e5) throw e5;
    if (e6) throw e6;
    if (e7) throw e7;
    if (e8) throw e8;
    if (e9) console.warn('size_paper_price 로드 실패 (테이블 없을 수 있음):', e9.message);

    cachedData = {
      papers: papers as Paper[],
      paperCosts: paperCosts as PaperCost[],
      sizes: sizes as Size[],
      printCosts: printCosts as PrintCost[],
      finishingTypes: finishingTypes as FinishingType[],
      finishingCosts: finishingCosts as FinishingCost[],
      bindingTypes: bindingTypes as BindingType[],
      bindingCosts: bindingCosts as BindingCost[],
      sizePaperPrice: (sizePaperPrice as SizePaperPrice[]) || [],
    };

    // Map 인덱스 빌드 (O(1) 조회용)
    indexMaps = buildIndexMaps(cachedData);

    return cachedData;

  } catch (error) {
    console.error('DB 데이터 로드 실패:', error);
    throw error;
  }
}

// ============================================================
// 조회 함수들 (Map 기반 O(1) 조회)
// ============================================================

/**
 * 용지별 평량 목록 반환
 */
export function getPaperWeights(paperCode: string, baseSheet: string = '467x315'): number[] {
  if (!indexMaps) return [];
  return indexMaps.paperWeights.get(`${paperCode}:${baseSheet}`) || [];
}

/**
 * 용지 단가 조회
 */
export function getPaperCost(
  paperCode: string,
  weight: number,
  baseSheet: string = '467x315'
): { cost_per_sheet: number; margin_rate: number } | null {
  if (!indexMaps) return null;
  const paper = indexMaps.paper.get(paperCode);
  if (!paper) return null;
  const pc = indexMaps.paperCost.get(`${paper.id}:${weight}:${baseSheet}`);
  return pc ? { cost_per_sheet: pc.cost_per_sheet, margin_rate: pc.margin_rate } : null;
}

/**
 * 인쇄비 단가 조회 (구간 탐색 - 배열 소규모)
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
 */
export function getFinishingCost(finishingCode: string): {
  setup_cost: number;
  cost_per_unit: number;
  unit_type: string;
} | null {
  if (!indexMaps) return null;
  const ft = indexMaps.finishingType.get(finishingCode);
  if (!ft) return null;
  const costs = indexMaps.finishingCostByTypeId.get(ft.id);
  if (!costs || costs.length === 0) return null;
  const fc = costs[0];
  return { setup_cost: fc.setup_cost, cost_per_unit: fc.cost_per_unit, unit_type: fc.unit_type };
}

/**
 * 오시/접지 비용 조회 (줄 수/단 수 + 수량 구간)
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
  if (!indexMaps) return null;
  const ft = indexMaps.finishingType.get(finishingCode);
  if (!ft) return null;
  const costs = indexMaps.finishingCostByTypeId.get(ft.id);
  if (!costs) return null;

  const pattern = finishingCode === 'creasing' ? `${lines}줄` : `${lines}단`;
  const fc = costs.find(
    c => c.notes && c.notes.includes(pattern) &&
         qty >= c.min_qty && qty <= c.max_qty
  );
  return fc ? { setup_cost: fc.setup_cost, cost_per_unit: fc.cost_per_unit, unit_type: fc.unit_type } : null;
}

/**
 * 코팅 비용 조회 (수량 구간 + 양면 세팅비)
 */
export function getCoatingCost(qty: number, isDouble: boolean = false): {
  setup_cost: number;
  cost_per_unit: number;
  unit_type: string;
} | null {
  if (!indexMaps) return null;
  const ft = indexMaps.finishingType.get('coating');
  if (!ft) return null;
  const costs = indexMaps.finishingCostByTypeId.get(ft.id);
  if (!costs) return null;

  const fc = costs.find(
    c => qty >= c.min_qty && (c.max_qty === 0 || c.max_qty === null || qty <= c.max_qty)
  );
  if (!fc) return null;
  return {
    setup_cost: isDouble ? (fc.setup_cost_double || fc.setup_cost) : fc.setup_cost,
    cost_per_unit: fc.cost_per_unit,
    unit_type: fc.unit_type
  };
}

/**
 * 제본 비용 조회 (수량 구간)
 */
export function getBindingCost(bindingCode: string, qty: number): {
  setup_cost: number;
  cost_per_copy: number;
} | null {
  if (!indexMaps) return null;
  const bt = indexMaps.bindingType.get(bindingCode);
  if (!bt) return null;
  const costs = indexMaps.bindingCostByTypeId.get(bt.id);
  if (!costs) return null;

  const bc = costs.find(c => qty >= c.min_qty && qty <= c.max_qty);
  return bc ? { setup_cost: bc.setup_cost, cost_per_copy: bc.cost_per_copy } : null;
}

/**
 * 사이즈 정보 조회
 */
export function getSizeInfo(sizeCode: string): {
  name: string;
  width: number;
  height: number;
  base_sheet: string;
  up_count: number;
} | null {
  if (!indexMaps) return null;
  const size = indexMaps.size.get(sizeCode);
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
  indexMaps = null;
}

// ============================================================
// 선계산된 가격 테이블 (size_paper_price) 조회
// ============================================================

/**
 * 선계산된 가격 조회 (Map O(1))
 */
export function getSizePaperPrice(
  sizeCode: string,
  paperCode: string,
  weight: number
): {
  sell_price_per_copy: number;
  sell_price_per_sheet: number;
  up_count: number;
} | null {
  if (!indexMaps) return null;
  const found = indexMaps.sizePaperPrice.get(`${sizeCode}:${paperCode}:${weight}`);
  if (!found) return null;
  return {
    sell_price_per_copy: Number(found.sell_price_per_copy),
    sell_price_per_sheet: Number(found.sell_price_per_sheet),
    up_count: found.up_count
  };
}

/**
 * 빌더용 데이터 구조로 변환
 */
export function getBuilderData(): BuilderData | null {
  if (!cachedData || !indexMaps) return null;

  const paperWeightsMap: BuilderData['paperWeights'] = {};
  cachedData.papers.forEach(paper => {
    const weights467 = indexMaps!.paperWeights.get(`${paper.code}:467x315`) || [];
    const weights390 = indexMaps!.paperWeights.get(`${paper.code}:390x270`) || [];
    paperWeightsMap[paper.code] = {
      '467x315': weights467,
      '390x270': weights390,
      all: [...new Set([...weights467, ...weights390])].sort((a, b) => a - b)
    };
  });

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
