// 가격 계산 엔진 v2 - DB 기반 정확한 계산
// ============================================================
// MASTER_DOCUMENT v3.6 + DB 스키마 완전 반영
// 단위: per_copy, per_face, per_hole, per_batch

import type { CustomerSelection } from '@/lib/builderData';
import {
  getBindingCost,
  getCoatingCost,
  getFinishingCost,
  getFinishingCostByLines,
  getPaperCost,
  getPrintCostPerFace,
  getSizeInfo,
  getSizePaperPrice
} from '@/lib/dbService';

// ============================================================
// 선계산된 가격 테이블 사용 플래그
// false: dbService 캐시의 Map 인덱스로 O(1) 실시간 계산 (권장)
// true: size_paper_price 테이블 사용 (deprecated)
// ============================================================
export const USE_PRECALC = false;

export interface PriceBreakdown {
  paper?: number;
  print?: number;
  cutting?: number;
  coating?: number;
  osi?: number;
  fold?: number;
  corner?: number;
  punch?: number;
  mising?: number;
  delivery?: number;
  coverPaper?: number;
  coverPrint?: number;
  coverCoating?: number;
  innerPaper?: number;
  innerPrint?: number;
  binding?: number;
  pp?: number;
  springCoverPaper?: number;
  springCoverPrint?: number;
}

export interface SingleLayerResult {
  total: number;
  breakdown: PriceBreakdown;
  perUnit: number;
  unitPrice: number;
  sheets: number;
  faces: number;
  upCount: number;
  baseSheet: string;
}

export interface ThicknessValidation {
  valid: boolean;
  warning: boolean;
  error: boolean;
  message: string | null;
}

export interface BindingResult {
  total: number;
  breakdown: PriceBreakdown;
  perUnit: number;
  unitPrice: number;
  coverSheets: number;
  coverFaces: number;
  innerSheets: number;
  innerFaces: number;
  totalThickness: number;
  thicknessValidation: ThicknessValidation;
  pages: number;
}

/**
 * 단일 레이어 가격 계산 (전단, 리플릿, 엽서)
 */
export function calculateSingleLayerPrice(customer: CustomerSelection, qty: number): SingleLayerResult {
  const breakdown: PriceBreakdown = {};
  let total = 0;

  const sizeInfo = getSizeInfo(customer.size);
  if (!sizeInfo) {
    throw new Error(`사이즈 정보를 찾을 수 없습니다: ${customer.size}`);
  }

  const upCount = sizeInfo.up_count;
  const baseSheet = sizeInfo.base_sheet;
  const sheets = Math.ceil(qty / upCount);
  const isSingle = customer.side === 'single';
  const faces = sheets * (isSingle ? 1 : 2);
  const isColor = customer.color === 'color';

  // 1. 용지비 계산
  let paperTotal: number;

  if (USE_PRECALC) {
    const precalc = getSizePaperPrice(customer.size, customer.paper, customer.weight);
    if (precalc) {
      paperTotal = Math.round(precalc.sell_price_per_copy * qty);
    } else {
      const paperCostData = getPaperCost(customer.paper, customer.weight, baseSheet);
      if (!paperCostData) {
        throw new Error(`용지 단가를 찾을 수 없습니다: ${customer.paper} ${customer.weight}g ${baseSheet}`);
      }
      paperTotal = Math.round(paperCostData.cost_per_sheet * paperCostData.margin_rate * sheets);
    }
  } else {
    const paperCostData = getPaperCost(customer.paper, customer.weight, baseSheet);
    if (!paperCostData) {
      throw new Error(`용지 단가를 찾을 수 없습니다: ${customer.paper} ${customer.weight}g ${baseSheet}`);
    }
    paperTotal = Math.round(paperCostData.cost_per_sheet * paperCostData.margin_rate * sheets);
  }

  breakdown.paper = paperTotal;
  total += paperTotal;

  // 2. 인쇄비
  const printCostPerFace = getPrintCostPerFace(faces);
  const adjustedPrintCost = isColor
    ? printCostPerFace
    : Math.round(printCostPerFace * 0.65);

  const printTotal = adjustedPrintCost * faces;
  breakdown.print = printTotal;
  total += printTotal;

  // 3. 재단비
  const cuttingCost = getFinishingCost('cutting');
  if (cuttingCost) {
    const cuttingTotal = cuttingCost.setup_cost + (cuttingCost.cost_per_unit * qty);
    breakdown.cutting = cuttingTotal;
    total += cuttingTotal;
  }

  // 4. 코팅비
  if (customer.finishing?.coating) {
    const coatingSide = customer.finishing.coatingSide || 'single';
    const isDouble = coatingSide === 'double';
    const coatingFaces = isDouble ? faces : sheets;
    const coatingCost = getCoatingCost(coatingFaces, isDouble);

    if (coatingCost) {
      const coatingTotal = coatingCost.setup_cost + (coatingCost.cost_per_unit * coatingFaces);
      breakdown.coating = coatingTotal;
      total += coatingTotal;
    }
  }

  // 5. 오시
  if (customer.finishing?.osiEnabled && customer.finishing?.osi > 0) {
    const osiCount = customer.finishing.osi;
    const osiCost = getFinishingCostByLines('creasing', osiCount, qty);

    if (osiCost) {
      const osiTotal = osiCost.setup_cost + (osiCost.cost_per_unit * qty);
      breakdown.osi = osiTotal;
      total += osiTotal;
    }
  }

  // 6. 접지
  if (customer.finishing?.foldEnabled && customer.finishing?.fold > 0) {
    const foldCount = customer.finishing.fold;
    const foldCost = getFinishingCostByLines('folding', foldCount, qty);

    if (foldCost) {
      const foldTotal = foldCost.setup_cost + (foldCost.cost_per_unit * qty);
      breakdown.fold = foldTotal;
      total += foldTotal;
    }
  }

  // 7. 귀도리
  if (customer.finishing?.corner) {
    const cornerCost = getFinishingCost('corner_rounding');

    if (cornerCost) {
      const batches = Math.ceil(qty / 100);
      const cornerTotal = cornerCost.setup_cost + (cornerCost.cost_per_unit * batches);
      breakdown.corner = cornerTotal;
      total += cornerTotal;
    }
  }

  // 8. 타공
  if (customer.finishing?.punch) {
    const punchCost = getFinishingCost('punching');

    if (punchCost) {
      const holes = customer.punchHoles || 2;
      const punchTotal = punchCost.setup_cost + (punchCost.cost_per_unit * holes * qty);
      breakdown.punch = punchTotal;
      total += punchTotal;
    }
  }

  // 9. 미싱
  if (customer.finishing?.mising) {
    const misingCost = getFinishingCost('perforating');

    if (misingCost) {
      const misingTotal = misingCost.setup_cost + (misingCost.cost_per_unit * qty);
      breakdown.mising = misingTotal;
      total += misingTotal;
    }
  }

  // 10. 출고일 할인/할증
  const deliveryPercent = customer.deliveryPercent || 0;
  const deliveryRate = 1 + (deliveryPercent / 100);

  if (deliveryRate !== 1.00) {
    const deliveryAdjustment = Math.round(total * (deliveryRate - 1));
    breakdown.delivery = deliveryAdjustment;
    total = Math.round(total * deliveryRate);
  }

  const perUnit = qty > 0 ? Math.round(total / qty) : 0;

  return {
    total,
    breakdown,
    perUnit,
    unitPrice: perUnit,
    sheets,
    faces,
    upCount,
    baseSheet
  };
}

/**
 * 제본 상품 가격 계산 (중철, 무선, 스프링)
 */
export function calculateBindingPrice(
  customer: CustomerSelection,
  qty: number,
  bindingType: 'saddle' | 'perfect' | 'spring'
): BindingResult {
  const breakdown: PriceBreakdown = {};
  let total = 0;

  const sizeInfo = getSizeInfo(customer.size);
  if (!sizeInfo) {
    throw new Error(`사이즈 정보를 찾을 수 없습니다: ${customer.size}`);
  }

  const baseSheet = sizeInfo.base_sheet;

  // 1. 표지 계산
  const coverSheets = qty;
  const coverFaces = coverSheets * 2;
  const coverIsColor = customer.coverColor === 'color';

  let coverPaperTotal = 0;
  if (USE_PRECALC) {
    const precalc = getSizePaperPrice(customer.size, customer.coverPaper, customer.coverWeight);
    if (precalc) {
      coverPaperTotal = Math.round(precalc.sell_price_per_sheet * coverSheets);
    } else {
      const coverPaperCost = getPaperCost(customer.coverPaper, customer.coverWeight, baseSheet);
      if (coverPaperCost) {
        coverPaperTotal = Math.round(coverPaperCost.cost_per_sheet * coverPaperCost.margin_rate * coverSheets);
      }
    }
  } else {
    const coverPaperCost = getPaperCost(customer.coverPaper, customer.coverWeight, baseSheet);
    if (coverPaperCost) {
      coverPaperTotal = Math.round(coverPaperCost.cost_per_sheet * coverPaperCost.margin_rate * coverSheets);
    }
  }
  breakdown.coverPaper = coverPaperTotal;
  total += coverPaperTotal;

  // 표지 인쇄비
  const coverPrintCost = getPrintCostPerFace(coverFaces);
  const adjustedCoverPrintCost = coverIsColor
    ? coverPrintCost
    : Math.round(coverPrintCost * 0.65);
  const coverPrintTotal = adjustedCoverPrintCost * coverFaces;
  breakdown.coverPrint = coverPrintTotal;
  total += coverPrintTotal;

  // 표지 코팅
  if (customer.coverCoating && customer.coverCoating !== 'none') {
    const coatingSide = customer.coverCoatingSide || 'double';
    const coatingFaces = coatingSide === 'double' ? coverFaces : coverSheets;
    const coatingCost = getCoatingCost(coatingFaces, coatingSide === 'double');

    if (coatingCost) {
      const coatingTotal = coatingCost.setup_cost + (coatingCost.cost_per_unit * coatingFaces);
      breakdown.coverCoating = coatingTotal;
      total += coatingTotal;
    }
  }

  // 2. 내지 계산
  const pages = customer.pages || 16;
  const innerIsSingle = customer.innerSide === 'single';
  let innerSheets: number;

  if (bindingType === 'saddle') {
    // 중철: 대지 접지 방식 (단면 없음)
    innerSheets = Math.ceil(Math.max(0, pages - 4) / 4) * qty;
  } else {
    // 무선/스프링: 단면은 1페이지/장, 양면은 2페이지/장
    innerSheets = innerIsSingle
      ? (pages * qty)
      : (Math.ceil(pages / 2) * qty);
  }

  const innerFaces = innerSheets * (innerIsSingle ? 1 : 2);
  const innerIsColor = customer.innerColor === 'color';

  let innerPaperTotal = 0;
  if (USE_PRECALC) {
    const precalc = getSizePaperPrice(customer.size, customer.innerPaper, customer.innerWeight);
    if (precalc) {
      innerPaperTotal = Math.round(precalc.sell_price_per_sheet * innerSheets);
    } else {
      const innerPaperCost = getPaperCost(customer.innerPaper, customer.innerWeight, baseSheet);
      if (innerPaperCost) {
        innerPaperTotal = Math.round(innerPaperCost.cost_per_sheet * innerPaperCost.margin_rate * innerSheets);
      }
    }
  } else {
    const innerPaperCost = getPaperCost(customer.innerPaper, customer.innerWeight, baseSheet);
    if (innerPaperCost) {
      innerPaperTotal = Math.round(innerPaperCost.cost_per_sheet * innerPaperCost.margin_rate * innerSheets);
    }
  }
  breakdown.innerPaper = innerPaperTotal;
  total += innerPaperTotal;

  // 내지 인쇄비 (up_count 적용: A4면 467x315 대비 2배수이므로 면당 단가 1/2)
  const sizeUpCount = sizeInfo.up_count;
  const baseSheetFaces = Math.ceil(innerFaces / sizeUpCount);  // 실제 인쇄 면수 (467x315 기준)
  const innerPrintCost = getPrintCostPerFace(baseSheetFaces);
  const adjustedInnerPrintCost = innerIsColor
    ? innerPrintCost
    : Math.round(innerPrintCost * 0.65);
  const innerPrintTotal = adjustedInnerPrintCost * baseSheetFaces;
  breakdown.innerPrint = innerPrintTotal;
  total += innerPrintTotal;

  // 3. 제본비
  const bindingCost = getBindingCost(bindingType, qty);
  if (bindingCost) {
    const bindingTotal = bindingCost.setup_cost + (bindingCost.cost_per_copy * qty);
    breakdown.binding = bindingTotal;
    total += bindingTotal;
  }

  // 4. 스프링제본 추가 옵션
  if (bindingType === 'spring') {
    if (customer.pp && customer.pp !== 'none') {
      const ppCost = getFinishingCost('pp_cover');
      if (ppCost) {
        const ppTotal = ppCost.setup_cost + (ppCost.cost_per_unit * qty);
        breakdown.pp = ppTotal;
        total += ppTotal;
      }
    }

    if (customer.coverPrint && customer.coverPrint !== 'none') {
      const springCoverSheets = qty;
      const springCoverFaces = customer.coverPrint === 'front_back'
        ? springCoverSheets * 2
        : springCoverSheets;

      const springCoverPaperCost = getPaperCost(customer.coverPaper, customer.coverWeight, baseSheet);
      if (springCoverPaperCost) {
        const springCoverPaperTotal = Math.round(
          springCoverPaperCost.cost_per_sheet * springCoverPaperCost.margin_rate * springCoverSheets
        );
        breakdown.springCoverPaper = springCoverPaperTotal;
        total += springCoverPaperTotal;
      }

      const springCoverPrintCost = getPrintCostPerFace(springCoverFaces);
      const springCoverPrintTotal = springCoverPrintCost * springCoverFaces;
      breakdown.springCoverPrint = springCoverPrintTotal;
      total += springCoverPrintTotal;
    }
  }

  // 5. 후가공 (finishing block - 표지 후가공)
  // 코팅: finishing block에서 설정된 경우 (coverCoating이 이미 처리되지 않은 경우만)
  if (customer.finishing?.coating && !breakdown.coverCoating) {
    const coatingSide = customer.finishing.coatingSide || 'single';
    const isDouble = coatingSide === 'double';
    const coatingFaces = isDouble ? coverFaces : coverSheets;
    const coatingCost = getCoatingCost(coatingFaces, isDouble);

    if (coatingCost) {
      const coatingTotal = coatingCost.setup_cost + (coatingCost.cost_per_unit * coatingFaces);
      breakdown.coverCoating = coatingTotal;
      total += coatingTotal;
    }
  }

  // 오시
  if (customer.finishing?.osiEnabled && customer.finishing?.osi > 0) {
    const osiCount = customer.finishing.osi;
    const osiCost = getFinishingCostByLines('creasing', osiCount, qty);

    if (osiCost) {
      const osiTotal = osiCost.setup_cost + (osiCost.cost_per_unit * qty);
      breakdown.osi = osiTotal;
      total += osiTotal;
    }
  }

  // 접지
  if (customer.finishing?.foldEnabled && customer.finishing?.fold > 0) {
    const foldCount = customer.finishing.fold;
    const foldCost = getFinishingCostByLines('folding', foldCount, qty);

    if (foldCost) {
      const foldTotal = foldCost.setup_cost + (foldCost.cost_per_unit * qty);
      breakdown.fold = foldTotal;
      total += foldTotal;
    }
  }

  // 귀도리
  if (customer.finishing?.corner) {
    const cornerCost = getFinishingCost('corner_rounding');

    if (cornerCost) {
      const batches = Math.ceil(qty / 100);
      const cornerTotal = cornerCost.setup_cost + (cornerCost.cost_per_unit * batches);
      breakdown.corner = cornerTotal;
      total += cornerTotal;
    }
  }

  // 타공
  if (customer.finishing?.punch) {
    const punchCost = getFinishingCost('punching');

    if (punchCost) {
      const holes = customer.punchHoles || 2;
      const punchTotal = punchCost.setup_cost + (punchCost.cost_per_unit * holes * qty);
      breakdown.punch = punchTotal;
      total += punchTotal;
    }
  }

  // 미싱
  if (customer.finishing?.mising) {
    const misingCost = getFinishingCost('perforating');

    if (misingCost) {
      const misingTotal = misingCost.setup_cost + (misingCost.cost_per_unit * qty);
      breakdown.mising = misingTotal;
      total += misingTotal;
    }
  }

  // 6. 출고일 할인/할증
  const deliveryPercent = customer.deliveryPercent || 0;
  const deliveryRate = 1 + (deliveryPercent / 100);

  if (deliveryRate !== 1.00) {
    const deliveryAdjustment = Math.round(total * (deliveryRate - 1));
    breakdown.delivery = deliveryAdjustment;
    total = Math.round(total * deliveryRate);
  }

  const perUnit = qty > 0 ? Math.round(total / qty) : 0;

  // 7. 두께 계산 및 검증
  const totalThickness = calculateBindingThickness(
    bindingType,
    pages,
    customer.innerWeight || 80,
    customer.coverWeight || 200,
    customer.innerPaper || '',
    customer.coverPaper || ''
  );

  const thicknessValidation = validateBindingThickness(bindingType, totalThickness, customer.maxThickness);

  return {
    total,
    breakdown,
    perUnit,
    unitPrice: perUnit,
    coverSheets,
    coverFaces,
    innerSheets,
    innerFaces,
    totalThickness,
    thicknessValidation,
    pages
  };
}

/**
 * 메인 가격 계산 함수 (자동 판별)
 */
export function calculatePrice(
  customer: CustomerSelection,
  qty: number,
  productType: string = 'flyer'
): SingleLayerResult | BindingResult {
  if (productType === 'flyer' || productType === 'leaflet' || productType === 'postcard') {
    return calculateSingleLayerPrice(customer, qty);
  } else if (productType === 'saddle' || productType === 'perfect' || productType === 'spring') {
    return calculateBindingPrice(customer, qty, productType as 'saddle' | 'perfect' | 'spring');
  } else {
    throw new Error(`알 수 없는 상품 타입: ${productType}`);
  }
}

// ============================================================
// 두께 계산 유틸리티
// ============================================================

/**
 * 용지 1장 두께 추정 (mm)
 *
 * 두께 계수 (mm/g) - 2026-02-06 검증 완료:
 * - 아트지/스노우지: 0.0009 (한국/해외 평균)
 * - 모조지: 0.00115 (한국/해외 일치)
 * - 랑데뷰/인스퍼: 0.0012 (프리미엄 용지, 평량보다 두꺼움)
 * - 크라프트: 0.0012
 *
 * 참고: DB paper_costs.thickness에 실제값 저장됨
 * 이 함수는 DB 데이터 없을 때 fallback용
 */
export function estimateThickness(weight: number, paperCode: string = ''): number {
  const thicknessFactors: Record<string, number> = {
    'art': 0.0009,
    'snow': 0.0009,
    'mojo': 0.00115,
    'inspirer': 0.0012,
    'rendezvous': 0.0012,
    'matte': 0.0009,
    'ivory': 0.0010,
    'kraft': 0.0012,
    'default': 0.0010
  };

  const code = paperCode.toLowerCase();
  let factor = thicknessFactors.default;

  for (const [key, value] of Object.entries(thicknessFactors)) {
    if (code.includes(key)) {
      factor = value;
      break;
    }
  }

  return weight * factor;
}

export function calculateBindingThickness(
  bindingType: string,
  pages: number,
  innerWeight: number,
  coverWeight: number,
  innerPaperCode: string = '',
  coverPaperCode: string = ''
): number {
  const innerThickness = estimateThickness(innerWeight, innerPaperCode);
  const coverThickness = estimateThickness(coverWeight, coverPaperCode);

  // 통일 공식: 페이지 수 / 2 × 용지두께 (모든 제본 동일)
  // - 중철: 접혀서 2겹
  // - 무선/스프링: 낱장 앞뒤
  const innerLayerThickness = (pages / 2) * innerThickness;

  if (bindingType === 'saddle') {
    // 중철: 내지만 (표지는 접힌 1장이라 무시)
    return innerLayerThickness;
  } else if (bindingType === 'perfect') {
    // 무선: 내지 + 표지 1장
    return innerLayerThickness + coverThickness;
  } else if (bindingType === 'spring') {
    // 스프링: 내지 + 표지 2장 (앞뒤 분리)
    return innerLayerThickness + coverThickness * 2;
  }

  return innerLayerThickness;
}

export function validateBindingThickness(
  bindingType: string,
  thickness: number,
  customLimit?: number // 빌더에서 설정한 커스텀 두께 제한 (mm)
): ThicknessValidation {
  // 기본 제한값 (빌더 설정이 없을 때 사용)
  const defaultLimits: Record<string, number> = {
    saddle: 2.5,
    perfect: 50,
    spring: 20
  };

  const limit = customLimit || defaultLimits[bindingType];
  if (!limit) return { valid: true, warning: false, error: false, message: null };

  const bindingNames: Record<string, string> = {
    saddle: '중철제본',
    perfect: '무선제본',
    spring: '스프링제본'
  };

  if (thickness > limit) {
    return {
      valid: false,
      warning: false,
      error: true,
      message: `${bindingNames[bindingType] || '제본'} 두께 ${limit}mm 초과 (현재: ${thickness.toFixed(1)}mm)`
    };
  }

  return { valid: true, warning: false, error: false, message: null };
}

export function validateCoatingWeight(weight: number): { valid: boolean; message: string | null } {
  if (weight <= 150) {
    return {
      valid: false,
      message: '150g 이하 용지는 코팅이 불가합니다.'
    };
  }
  return { valid: true, message: null };
}

export default calculatePrice;
