// 가격 계산 엔진 v2 - DB 기반 정확한 계산
// ============================================================
// MASTER_DOCUMENT v3.6 + DB 스키마 완전 반영
// 단위: per_copy, per_face, per_hole, per_batch

import type { CustomerSelection } from "@/lib/builderData";
import {
  getBindingCost,
  getCoatingCost,
  getFinishingCost,
  getFinishingCostByLines,
  getFinishingCostTiers,
  getPaperCost,
  getPrintCostPerFace,
  getSizeInfo,
} from "@/lib/dbService";

// 가격 계산 상수
const PRICE_CONSTANTS = {
  MONO_DISCOUNT_RATE: 0.45, // 흑백 인쇄 할인율 (컬러 대비)
  CORNER_BATCH_SIZE: 100, // 귀도리 배치 단위
  DEFAULT_PUNCH_HOLES: 2, // 기본 타공 구멍 수
} as const;

/**
 * 누적(마지널) 비용 계산
 * 각 구간의 단가는 해당 구간 내 수량에만 적용
 * 예: 1~50: 100원, 51~100: 12원 → 80매 = 50×100 + 30×12 = 5,360원
 */
function calculateCumulativeCost(
  tiers: Array<{
    min_qty: number;
    max_qty: number | null;
    setup_cost: number;
    cost_per_unit: number;
  }>,
  qty: number
): number {
  if (tiers.length === 0) return 0;

  const setupCost = tiers[0].setup_cost;
  let total = setupCost;
  let remaining = qty;

  for (const tier of tiers) {
    if (remaining <= 0) break;

    const tierSize =
      tier.max_qty !== null ? tier.max_qty - tier.min_qty + 1 : remaining;
    const unitsInTier = Math.min(remaining, tierSize);
    total += unitsInTier * tier.cost_per_unit;
    remaining -= unitsInTier;
  }

  return total;
}

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
  estimatedWeight: number;
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
  estimatedWeight: number;
}

/**
 * 후가공 비용 공통 계산 (코팅 제외: 오시, 접지, 귀도리, 타공, 미싱)
 * 코팅은 단일레이어/제본에서 분기가 달라 각 함수에서 직접 처리
 */
function calculateFinishingCosts(
  customer: CustomerSelection,
  qty: number,
  breakdown: PriceBreakdown
): number {
  let finishingTotal = 0;

  // 오시
  if (customer.finishing?.osiEnabled && customer.finishing?.osi > 0) {
    const osiCount = customer.finishing.osi;
    const osiCost = getFinishingCostByLines("creasing", osiCount, qty);

    if (osiCost) {
      const osiTotal = osiCost.setup_cost + osiCost.cost_per_unit * qty;
      breakdown.osi = osiTotal;
      finishingTotal += osiTotal;
    }
  }

  // 접지
  if (customer.finishing?.foldEnabled && customer.finishing?.fold > 0) {
    const foldCount = customer.finishing.fold;
    const foldCost = getFinishingCostByLines("folding", foldCount, qty);

    if (foldCost) {
      const foldTotal = foldCost.setup_cost + foldCost.cost_per_unit * qty;
      breakdown.fold = foldTotal;
      finishingTotal += foldTotal;
    }
  }

  // 귀도리
  if (customer.finishing?.corner) {
    const cornerCost = getFinishingCost("corner_rounding", qty);

    if (cornerCost) {
      const batches = Math.ceil(qty / PRICE_CONSTANTS.CORNER_BATCH_SIZE);
      const cornerTotal =
        cornerCost.setup_cost + cornerCost.cost_per_unit * batches;
      breakdown.corner = cornerTotal;
      finishingTotal += cornerTotal;
    }
  }

  // 타공
  if (customer.finishing?.punch) {
    const punchCost = getFinishingCost("punching", qty);

    if (punchCost) {
      const holes = customer.punchHoles || PRICE_CONSTANTS.DEFAULT_PUNCH_HOLES;
      const punchTotal =
        punchCost.setup_cost + punchCost.cost_per_unit * holes * qty;
      breakdown.punch = punchTotal;
      finishingTotal += punchTotal;
    }
  }

  // 미싱
  if (customer.finishing?.mising) {
    const misingCost = getFinishingCost("perforating", qty);

    if (misingCost) {
      const misingTotal =
        misingCost.setup_cost + misingCost.cost_per_unit * qty;
      breakdown.mising = misingTotal;
      finishingTotal += misingTotal;
    }
  }

  return finishingTotal;
}

/**
 * 출고일 할인/할증 적용
 * @returns 조정 후 total
 */
function applyDeliveryAdjustment(
  total: number,
  deliveryPercent: number,
  breakdown: PriceBreakdown
): number {
  const deliveryRate = 1 + deliveryPercent / 100;

  if (deliveryRate !== 1.0) {
    const deliveryAdjustment = Math.round(total * (deliveryRate - 1));
    breakdown.delivery = deliveryAdjustment;
    return Math.round(total * deliveryRate);
  }

  return total;
}

/**
 * 단일 레이어 가격 계산 (전단, 리플릿, 엽서)
 */
export function calculateSingleLayerPrice(
  customer: CustomerSelection,
  qty: number
): SingleLayerResult {
  const breakdown: PriceBreakdown = {};
  let total = 0;

  const sizeInfo = getSizeInfo(customer.size);
  if (!sizeInfo) {
    throw new Error(`사이즈 정보를 찾을 수 없습니다: ${customer.size}`);
  }

  const upCount = sizeInfo.up_count;
  const baseSheet = sizeInfo.base_sheet;
  const sheets = Math.ceil(qty / upCount);
  const isSingle = customer.side === "single";
  const faces = sheets * (isSingle ? 1 : 2);
  const isColor = customer.color === "color";

  // 1. 용지비 계산
  const paperCostData = getPaperCost(
    customer.paper,
    customer.weight,
    baseSheet
  );
  if (!paperCostData) {
    throw new Error(
      `용지 단가를 찾을 수 없습니다: ${customer.paper} ${customer.weight}g ${baseSheet}`
    );
  }
  const paperTotal = Math.round(
    paperCostData.cost_per_sheet * paperCostData.margin_rate * sheets
  );

  breakdown.paper = paperTotal;
  total += paperTotal;

  // 2. 인쇄비
  const printCostPerFace = getPrintCostPerFace(faces);
  const adjustedPrintCost = isColor
    ? printCostPerFace
    : Math.round(printCostPerFace * PRICE_CONSTANTS.MONO_DISCOUNT_RATE);

  const printTotal = adjustedPrintCost * faces;
  breakdown.print = printTotal;
  total += printTotal;

  // 3. 재단비 (누적 구간 계산)
  const cuttingTiers = getFinishingCostTiers("cutting");
  if (cuttingTiers && cuttingTiers.length > 0) {
    const cuttingTotal = calculateCumulativeCost(cuttingTiers, qty);
    breakdown.cutting = cuttingTotal;
    total += cuttingTotal;
  }

  // 4. 코팅비
  if (customer.finishing?.coating) {
    const coatingSide = customer.finishing.coatingSide || "single";
    const isDouble = coatingSide === "double";
    const coatingFaces = isDouble ? faces : sheets;
    const coatingCost = getCoatingCost(coatingFaces, isDouble);

    if (coatingCost) {
      const coatingTotal =
        coatingCost.setup_cost + coatingCost.cost_per_unit * coatingFaces;
      breakdown.coating = coatingTotal;
      total += coatingTotal;
    }
  }

  // 5-9. 후가공 (오시, 접지, 귀도리, 타공, 미싱)
  total += calculateFinishingCosts(customer, qty, breakdown);

  // 10. 출고일 할인/할증
  total = applyDeliveryAdjustment(
    total,
    customer.deliveryPercent || 0,
    breakdown
  );

  const perUnit = qty > 0 ? Math.round(total / qty) : 0;

  // 예상 무게 계산 (kg)
  // 무게(g) = (width_mm × height_mm / 1,000,000) × gsm × sheets
  const paperAreaM2 = (sizeInfo.width * sizeInfo.height) / 1_000_000;
  const paperGsm = customer.weight || 100;
  const estimatedWeight = (paperAreaM2 * paperGsm * sheets) / 1000;

  return {
    total,
    breakdown,
    perUnit,
    unitPrice: perUnit,
    sheets,
    faces,
    upCount,
    baseSheet,
    estimatedWeight,
  };
}

// ============================================================
// 제본 가격 서브 함수
// ============================================================

/** 표지 비용 (용지 + 인쇄 + 코팅) */
function calculateCoverCosts(
  customer: CustomerSelection,
  qty: number,
  baseSheet: string,
  breakdown: PriceBreakdown
): { total: number; coverSheets: number; coverFaces: number } {
  let total = 0;
  const coverSheets = qty;
  const coverFaces = coverSheets * 2;
  const coverIsColor = customer.coverColor === "color";

  // 표지 용지비
  let coverPaperTotal = 0;
  const coverPaperCost = getPaperCost(
    customer.coverPaper,
    customer.coverWeight,
    baseSheet
  );
  if (coverPaperCost) {
    coverPaperTotal = Math.round(
      coverPaperCost.cost_per_sheet * coverPaperCost.margin_rate * coverSheets
    );
  }
  breakdown.coverPaper = coverPaperTotal;
  total += coverPaperTotal;

  // 표지 인쇄비
  const coverPrintCost = getPrintCostPerFace(coverFaces);
  const adjustedCoverPrintCost = coverIsColor
    ? coverPrintCost
    : Math.round(coverPrintCost * PRICE_CONSTANTS.MONO_DISCOUNT_RATE);
  const coverPrintTotal = adjustedCoverPrintCost * coverFaces;
  breakdown.coverPrint = coverPrintTotal;
  total += coverPrintTotal;

  // 표지 코팅
  if (customer.coverCoating && customer.coverCoating !== "none") {
    const coatingSide = customer.coverCoatingSide || "double";
    const coatingFaces = coatingSide === "double" ? coverFaces : coverSheets;
    const coatingCost = getCoatingCost(coatingFaces, coatingSide === "double");

    if (coatingCost) {
      const coatingTotal =
        coatingCost.setup_cost + coatingCost.cost_per_unit * coatingFaces;
      breakdown.coverCoating = coatingTotal;
      total += coatingTotal;
    }
  }

  return { total, coverSheets, coverFaces };
}

/** 내지 비용 (용지 + 인쇄) */
function calculateInnerCosts(
  customer: CustomerSelection,
  qty: number,
  baseSheet: string,
  bindingType: "saddle" | "perfect" | "spring",
  sizeUpCount: number,
  breakdown: PriceBreakdown
): { total: number; innerSheets: number; innerFaces: number; pages: number } {
  let total = 0;
  const pages = customer.pages || 16;
  const innerIsSingle = customer.innerSide === "single";
  let innerSheets: number;

  if (bindingType === "saddle") {
    // 중철: 대지 접지 방식 (단면 없음)
    innerSheets = Math.ceil(Math.max(0, pages - 4) / 4) * qty;
  } else {
    // 무선/스프링: 단면은 1페이지/장, 양면은 2페이지/장
    innerSheets = innerIsSingle ? pages * qty : Math.ceil(pages / 2) * qty;
  }

  const innerFaces = innerSheets * (innerIsSingle ? 1 : 2);
  const innerIsColor = customer.innerColor === "color";

  // 내지 용지비
  let innerPaperTotal = 0;
  const innerPaperCost = getPaperCost(
    customer.innerPaper,
    customer.innerWeight,
    baseSheet
  );
  if (innerPaperCost) {
    innerPaperTotal = Math.round(
      innerPaperCost.cost_per_sheet * innerPaperCost.margin_rate * innerSheets
    );
  }
  breakdown.innerPaper = innerPaperTotal;
  total += innerPaperTotal;

  // 내지 인쇄비 (up_count 적용)
  const baseSheetFaces = Math.ceil(innerFaces / sizeUpCount);
  const innerPrintCost = getPrintCostPerFace(baseSheetFaces);
  const adjustedInnerPrintCost = innerIsColor
    ? innerPrintCost
    : Math.round(innerPrintCost * PRICE_CONSTANTS.MONO_DISCOUNT_RATE);
  const innerPrintTotal = adjustedInnerPrintCost * baseSheetFaces;
  breakdown.innerPrint = innerPrintTotal;
  total += innerPrintTotal;

  return { total, innerSheets, innerFaces, pages };
}

/** 제본비 */
function calculateBindingSetupCost(
  bindingType: "saddle" | "perfect" | "spring",
  qty: number,
  breakdown: PriceBreakdown
): number {
  const bindingCost = getBindingCost(bindingType, qty);
  if (bindingCost) {
    const bindingTotal =
      bindingCost.setup_cost + bindingCost.cost_per_copy * qty;
    breakdown.binding = bindingTotal;
    return bindingTotal;
  }
  return 0;
}

/** 스프링제본 추가 옵션 (PP + 표지인쇄) */
function calculateSpringExtras(
  customer: CustomerSelection,
  qty: number,
  baseSheet: string,
  breakdown: PriceBreakdown
): number {
  let total = 0;

  // PP 커버
  if (customer.pp && customer.pp !== "none") {
    const ppCost = getFinishingCost("pp_cover", qty);
    if (ppCost) {
      const ppTotal = ppCost.setup_cost + ppCost.cost_per_unit * qty;
      breakdown.pp = ppTotal;
      total += ppTotal;
    }
  }

  // 표지인쇄
  if (customer.coverPrint && customer.coverPrint !== "none") {
    const springCoverSheets = qty;
    const springCoverFaces =
      customer.coverPrint === "front_back"
        ? springCoverSheets * 2
        : springCoverSheets;

    const springCoverPaperCost = getPaperCost(
      customer.coverPaper,
      customer.coverWeight,
      baseSheet
    );
    if (springCoverPaperCost) {
      const springCoverPaperTotal = Math.round(
        springCoverPaperCost.cost_per_sheet *
          springCoverPaperCost.margin_rate *
          springCoverSheets
      );
      breakdown.springCoverPaper = springCoverPaperTotal;
      total += springCoverPaperTotal;
    }

    const springCoverPrintCost = getPrintCostPerFace(springCoverFaces);
    const springCoverPrintTotal = springCoverPrintCost * springCoverFaces;
    breakdown.springCoverPrint = springCoverPrintTotal;
    total += springCoverPrintTotal;
  }

  return total;
}

/**
 * 제본 상품 가격 계산 (중철, 무선, 스프링)
 */
export function calculateBindingPrice(
  customer: CustomerSelection,
  qty: number,
  bindingType: "saddle" | "perfect" | "spring"
): BindingResult {
  const breakdown: PriceBreakdown = {};
  let total = 0;

  const sizeInfo = getSizeInfo(customer.size);
  if (!sizeInfo) {
    throw new Error(`사이즈 정보를 찾을 수 없습니다: ${customer.size}`);
  }

  const baseSheet = sizeInfo.base_sheet;

  // 1. 표지 비용
  const cover = calculateCoverCosts(customer, qty, baseSheet, breakdown);
  total += cover.total;

  // 2. 내지 비용
  const inner = calculateInnerCosts(
    customer,
    qty,
    baseSheet,
    bindingType,
    sizeInfo.up_count,
    breakdown
  );
  total += inner.total;

  // 3. 제본비
  total += calculateBindingSetupCost(bindingType, qty, breakdown);

  // 4. 스프링제본 추가 옵션
  if (bindingType === "spring") {
    total += calculateSpringExtras(customer, qty, baseSheet, breakdown);
  }

  // 5. 후가공 코팅 (finishing block에서 설정된 경우, coverCoating이 이미 처리되지 않은 경우만)
  if (customer.finishing?.coating && !breakdown.coverCoating) {
    const coatingSide = customer.finishing.coatingSide || "single";
    const isDouble = coatingSide === "double";
    const coatingFaces = isDouble ? cover.coverFaces : cover.coverSheets;
    const coatingCost = getCoatingCost(coatingFaces, isDouble);

    if (coatingCost) {
      const coatingTotal =
        coatingCost.setup_cost + coatingCost.cost_per_unit * coatingFaces;
      breakdown.coverCoating = coatingTotal;
      total += coatingTotal;
    }
  }

  // 후가공 (오시, 접지, 귀도리, 타공, 미싱)
  total += calculateFinishingCosts(customer, qty, breakdown);

  // 6. 출고일 할인/할증
  total = applyDeliveryAdjustment(
    total,
    customer.deliveryPercent || 0,
    breakdown
  );

  const perUnit = qty > 0 ? Math.round(total / qty) : 0;

  // 7. 두께 계산 및 검증
  const totalThickness = calculateBindingThickness(
    bindingType,
    inner.pages,
    customer.innerWeight || 80,
    customer.coverWeight || 200,
    customer.innerPaper || "",
    customer.coverPaper || "",
    customer.innerSide || "double"
  );

  const thicknessValidation = validateBindingThickness(
    bindingType,
    totalThickness,
    customer.maxThickness
  );

  // 예상 무게 계산 (kg)
  const paperAreaM2 = (sizeInfo.width * sizeInfo.height) / 1_000_000;
  const coverGsm = customer.coverWeight || 200;
  const innerGsm = customer.innerWeight || 80;
  const coverWeight = (paperAreaM2 * coverGsm * cover.coverSheets) / 1000;
  const innerWeight = (paperAreaM2 * innerGsm * inner.innerSheets) / 1000;
  const estimatedWeight = coverWeight + innerWeight;

  return {
    total,
    breakdown,
    perUnit,
    unitPrice: perUnit,
    coverSheets: cover.coverSheets,
    coverFaces: cover.coverFaces,
    innerSheets: inner.innerSheets,
    innerFaces: inner.innerFaces,
    totalThickness,
    thicknessValidation,
    pages: inner.pages,
    estimatedWeight,
  };
}

/**
 * 메인 가격 계산 함수 (자동 판별)
 */
export function calculatePrice(
  customer: CustomerSelection,
  qty: number,
  productType: string = "flyer"
): SingleLayerResult | BindingResult {
  if (
    productType === "flyer" ||
    productType === "leaflet" ||
    productType === "postcard"
  ) {
    return calculateSingleLayerPrice(customer, qty);
  } else if (
    productType === "saddle" ||
    productType === "perfect" ||
    productType === "spring"
  ) {
    return calculateBindingPrice(
      customer,
      qty,
      productType as "saddle" | "perfect" | "spring"
    );
  } else if (productType === "outsourced") {
    return {
      total: 0,
      breakdown: {},
      perUnit: 0,
      unitPrice: 0,
      sheets: 0,
      faces: 0,
      upCount: 0,
      baseSheet: "outsourced",
      estimatedWeight: 0,
    } as SingleLayerResult;
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
export function estimateThickness(
  weight: number,
  paperCode: string = ""
): number {
  const thicknessFactors: Record<string, number> = {
    art: 0.0009,
    snow: 0.0009,
    mojo: 0.00115,
    inspirer: 0.0012,
    rendezvous: 0.0012,
    matte: 0.0009,
    ivory: 0.001,
    kraft: 0.0012,
    default: 0.001,
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
  innerPaperCode: string = "",
  coverPaperCode: string = "",
  innerSide: string = "double" // 단면/양면
): number {
  const innerThickness = estimateThickness(innerWeight, innerPaperCode);
  const coverThickness = estimateThickness(coverWeight, coverPaperCode);

  // 장수 계산: 양면이면 pages/2, 단면이면 pages
  // - 양면: 1장에 앞뒤 2페이지
  // - 단면: 1장에 1페이지
  const innerSheets = innerSide === "single" ? pages : pages / 2;
  const innerLayerThickness = innerSheets * innerThickness;

  if (bindingType === "saddle") {
    // 중철: 내지만 (표지는 접힌 1장이라 무시)
    return innerLayerThickness;
  } else if (bindingType === "perfect") {
    // 무선: 내지 + 표지 1장
    return innerLayerThickness + coverThickness;
  } else if (bindingType === "spring") {
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
    spring: 20,
  };

  const limit = customLimit || defaultLimits[bindingType];
  if (!limit)
    return { valid: true, warning: false, error: false, message: null };

  const bindingNames: Record<string, string> = {
    saddle: "중철제본",
    perfect: "무선제본",
    spring: "스프링제본",
  };

  if (thickness > limit) {
    return {
      valid: false,
      warning: false,
      error: true,
      message: `${bindingNames[bindingType] || "제본"} 두께 ${limit}mm 초과 (현재: ${thickness.toFixed(1)}mm)`,
    };
  }

  return { valid: true, warning: false, error: false, message: null };
}

// validateCoatingWeight → blockDefaults.ts로 이관됨 (규칙 제어센터)

export default calculatePrice;
