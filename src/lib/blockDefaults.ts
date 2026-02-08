/**
 * @module blockDefaults
 * @description 블록 규칙 제어센터 (Block Rules Control Center)
 *
 * ⚠️  블록 간 연동, 검증, 기본값 로직은 반드시 이 파일에서만 관리합니다.
 *     다른 파일에 규칙을 분산시키지 마세요.
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  함수명                       │  역할                       │
 * ├─────────────────────────────────────────────────────────────┤
 * │  extractDefaultsFromBlocks    │  블록 config → 초기값 매핑  │
 * │  extractDefaultsFromBlock     │  단일 블록 기본값 추출       │
 * │  checkLinkRules               │  블록 간 연동 규칙 체크     │
 * │  checkThickness               │  제본 두께 제한 검증        │
 * │  validateCoatingWeight        │  코팅 무게 제한 (≤150g 불가)│
 * │  getCoatingWeight             │  코팅 기준 용지 평량 결정    │
 * │  getFoldUpdate                │  접지 → 오시 자동 연동      │
 * │  mapPrintOptionsToCustomer    │  인쇄옵션 → 고객값 매핑     │
 * │  getPaperBlockRole            │  용지 블록 역할 판별 (cover/inner/default) │
 * └─────────────────────────────────────────────────────────────┘
 *
 * [사용처]
 * - PreviewBlock.jsx       (공용 블록 UI — 고객 + 관리자 미리보기)
 * - ProductView.jsx        (고객 상품 페이지)
 * - ProductBuilder/index.jsx (관리자 빌더)
 *
 * [의존성]
 * - builderData.ts   : getDefaultCustomer()
 * - businessDays.ts  : 영업일 계산
 * - priceEngine.ts   : estimateThickness(), validateBindingThickness() (두께 계산만)
 *
 * [규칙 추가 시 체크리스트]
 * 1. 이 파일에 함수 추가
 * 2. 위 테이블에 항목 추가
 * 3. CLAUDE.md "Block Rules Control Center" 섹션 업데이트
 * 4. src/data/rules.ts 에 규칙 메타데이터 추가
 */

import type { Block, BlockConfig, CustomerSelection } from "@/lib/builderData";
import { getDefaultCustomer } from "@/lib/builderData";
import { formatBusinessDate, getBusinessDate } from "@/lib/businessDays";
import { estimateThickness, validateBindingThickness } from "@/lib/priceEngine";

// ============================================================
// 반환 타입 정의
// ============================================================

export interface LinkRulesResult {
  backDisabled?: boolean;
  error?: string;
}

export interface ThicknessResult {
  error: boolean;
  warning?: boolean;
  valid?: boolean;
  message: string | null;
  thickness: number;
}

export interface FoldUpdateResult {
  foldEnabled: boolean;
  fold: number | null;
  osiEnabled?: boolean;
  osi?: number | null;
}

// ============================================================
// 코팅 무게 제한 (priceEngine에서 이관)
// ============================================================
export function validateCoatingWeight(weight: number): {
  valid: boolean;
  message: string | null;
} {
  if (weight <= 150) {
    return { valid: false, message: "150g 이하 용지는 코팅이 불가합니다." };
  }
  return { valid: true, message: null };
}

// ============================================================
// 코팅 기준 용지 평량 결정 (finishing 블록용)
// ============================================================
export function getCoatingWeight(
  blocks: any[],
  customer: any,
  productType: string
): number {
  const finishingBlock = blocks?.find((b) => b.on && b.type === "finishing");
  if (!finishingBlock) return customer.weight || 80;

  const cfg = finishingBlock.config;
  const isBindingProduct = ["saddle", "perfect", "spring"].includes(
    productType
  );

  // 1) linkedPaper가 설정된 경우: 해당 블록 기준으로 평량 결정
  if (cfg?.coating?.linkedPaper) {
    const linkedBlock = blocks?.find((b) => b.id === cfg.coating.linkedPaper);
    if (linkedBlock) {
      const isInner =
        linkedBlock.type === "inner_layer_saddle" ||
        linkedBlock.type === "inner_layer_leaf" ||
        linkedBlock.label?.includes("내지");
      const isCover =
        linkedBlock.type === "cover_print" ||
        linkedBlock.label?.includes("표지");

      if (isInner) return customer.innerWeight || 80;
      if (isCover) return customer.coverWeight || 80;
      return customer.weight || 80;
    }
    // linkedPaper가 설정됐지만 블록을 찾을 수 없음 → 아래 자동 감지로 폴백
  }

  // 2) 자동 감지: 제본 상품은 coverWeight 우선, 단층 상품은 weight
  if (isBindingProduct) {
    return customer.coverWeight || customer.weight || 80;
  }
  return customer.weight || 80;
}

// ============================================================
// 용지 블록 역할 판별 (블록 자체 role 우선, linkedBlocks 폴백)
// ============================================================
export function getPaperBlockRole(
  block: any,
  allBlocks: any[]
): "default" | "cover" | "inner" {
  // 1. 블록 자체 role 설정 (우선)
  if (block.config?.role === "cover" || block.config?.role === "inner") {
    return block.config.role;
  }
  // 2. 폴백: 다른 블록의 linkedBlocks 역추적 (하위 호환)
  if (
    allBlocks.some((b) => b.config?.linkedBlocks?.coverPaper === block.id)
  )
    return "cover";
  if (
    allBlocks.some((b) => b.config?.linkedBlocks?.innerPaper === block.id)
  )
    return "inner";
  return "default";
}

// ============================================================
// 블록 설정에서 기본값 추출
// ============================================================
export function extractDefaultsFromBlocks(
  blocks: Block[] | null
): CustomerSelection & Record<string, any> {
  const defaults: any = { ...getDefaultCustomer() };
  if (!blocks) return defaults;

  for (const block of blocks) {
    const bd = extractDefaultsFromBlock(block, blocks);
    // finishing은 merge (base 기본값 유지)
    if (bd.finishing) {
      defaults.finishing = { ...defaults.finishing, ...bd.finishing };
    }
    const { finishing: _, ...rest } = bd;
    Object.assign(defaults, rest);
  }

  return defaults;
}

// ============================================================
// 연동 규칙 체크 (스프링제본: 앞뒤표지 선택 시 뒷판 비활성화)
// ============================================================
export function checkLinkRules(
  blocks: Block[],
  customer: CustomerSelection
): LinkRulesResult {
  if (!blocks) return {};

  const coverPrintBlock = blocks.find((b) => b.type === "cover_print");
  const backBlock = blocks.find((b) => b.type === "back");
  const ppBlock = blocks.find((b) => b.type === "pp");
  const springOptionsBlock = blocks.find(
    (b) => b.on && b.type === "spring_options"
  );

  // 개별 블록 또는 spring_options 복합 블록에서 PP/표지인쇄/뒷판 존재 여부 결정
  const hasCoverPrint =
    !!coverPrintBlock || !!springOptionsBlock?.config?.coverPrint?.enabled;
  const hasBack = !!backBlock || !!springOptionsBlock?.config?.back?.enabled;
  const hasPP = !!ppBlock || !!springOptionsBlock?.config?.pp?.enabled;

  // 앞뒤표지 선택 시 뒷판 비활성화
  if (hasCoverPrint && hasBack) {
    if (customer.coverPrint === "front_back") {
      return { backDisabled: true };
    }
  }

  // PP와 표지인쇄 둘 다 없음인지 체크
  if (hasPP && hasCoverPrint) {
    if (customer.pp === "none" && customer.coverPrint === "none") {
      return {
        error: "전면 커버(PP 또는 표지인쇄) 중 하나는 선택해야 합니다.",
      };
    }
  }

  return {};
}

// ============================================================
// 접지 선택 — 순수 로직 (finishing 업데이트 객체 반환)
// ============================================================
export function getFoldUpdate(
  foldOpt: number,
  cfg: BlockConfig,
  customer: CustomerSelection
): FoldUpdateResult {
  const currentWeight = customer.weight || 100;
  const needsOsi = currentWeight >= 130;
  const osiLines = foldOpt - 1;

  if (foldOpt === customer.finishing?.fold && customer.finishing?.foldEnabled) {
    // 이미 선택된 값을 다시 클릭하면 해제 → 오시도 같이 해제
    return { foldEnabled: false, fold: null, osiEnabled: false, osi: null };
  } else {
    // 새로운 값 선택
    return {
      foldEnabled: true,
      fold: foldOpt,
      ...(needsOsi && cfg.osi?.enabled
        ? { osiEnabled: true, osi: osiLines }
        : {}),
    };
  }
}

// ============================================================
// 두께 검증 (ProductView + Builder 공용)
// ============================================================
export function checkThickness(
  blocks: Block[],
  customer: CustomerSelection
): ThicknessResult {
  const thicknessBlock = blocks?.find(
    (b) =>
      b.on &&
      [
        "inner_layer_saddle",
        "inner_layer_leaf",
        "pages",
        "pages_saddle",
        "pages_leaf",
      ].includes(b.type)
  );

  if (!thicknessBlock?.config?.maxThickness || !(customer.pages > 0)) {
    return { error: false, message: null, thickness: 0 };
  }

  const innerWeight = customer.innerWeight || customer.weight || 80;
  const innerPaper = customer.innerPaper || customer.paper || "";
  const paperThickness = estimateThickness(innerWeight, innerPaper);
  const totalThickness = (customer.pages / 2) * paperThickness;

  const bindingType = thicknessBlock.type.includes("saddle")
    ? "saddle"
    : "perfect";
  const validation = validateBindingThickness(
    bindingType,
    totalThickness,
    thicknessBlock.config.maxThickness
  );
  return { ...validation, thickness: totalThickness };
}

// ============================================================
// printOptions를 innerSide/innerColor로 매핑
// ============================================================
export function mapPrintOptionsToCustomer(
  cust: CustomerSelection & Record<string, any>,
  blocks: Block[]
): CustomerSelection & Record<string, any> {
  if (!blocks) return cust;
  const pagesBlock = blocks.find((b) => b.type === "pages");
  const linkedBlocks = pagesBlock?.config?.linkedBlocks || {};
  const innerPrintBlockId = linkedBlocks.innerPrint;
  const innerPrintOpt = innerPrintBlockId
    ? cust.printOptions?.[innerPrintBlockId]
    : null;
  const coverPrintBlockId = linkedBlocks.coverPrint;
  const coverPrintOpt = coverPrintBlockId
    ? cust.printOptions?.[coverPrintBlockId]
    : null;
  return {
    ...cust,
    innerSide: innerPrintOpt?.side || cust.innerSide || "double",
    innerColor: innerPrintOpt?.color || cust.innerColor || "color",
    coverSide: coverPrintOpt?.side || cust.coverSide || "double",
    coverColor: coverPrintOpt?.color || cust.coverColor || "color",
  };
}

// ============================================================
// 단일 블록에서 기본값 추출 (applySettings용)
// extractDefaultsFromBlocks의 단일 블록 버전
// ============================================================
export function extractDefaultsFromBlock(
  block: any,
  allBlocks: any[]
): Record<string, any> {
  if (!block?.on || !block?.config) return {};
  const cfg = block.config;
  const result: Record<string, any> = {};

  switch (block.type) {
    case "size":
      if (cfg.default) result.size = cfg.default;
      break;
    case "paper": {
      const role = getPaperBlockRole(block, allBlocks);
      if (role === "cover") {
        if (cfg.default?.paper) result.coverPaper = cfg.default.paper;
        if (cfg.default?.weight) result.coverWeight = cfg.default.weight;
      } else if (role === "inner") {
        if (cfg.default?.paper) result.innerPaper = cfg.default.paper;
        if (cfg.default?.weight) result.innerWeight = cfg.default.weight;
      } else {
        if (cfg.default?.paper) result.paper = cfg.default.paper;
        if (cfg.default?.weight) result.weight = cfg.default.weight;
      }
      break;
    }
    case "print": {
      const isInnerPrint = allBlocks.some(
        (b) => b.config?.linkedBlocks?.innerPrint === block.id
      );
      const isCoverPrint = allBlocks.some(
        (b) => b.config?.linkedBlocks?.coverPrint === block.id
      );
      if (isInnerPrint) {
        if (cfg.default?.color) result.innerColor = cfg.default.color;
        if (cfg.default?.side) result.innerSide = cfg.default.side;
      } else {
        if (cfg.default?.color) result.color = cfg.default.color;
        if (cfg.default?.side) result.side = cfg.default.side;
      }
      if (isCoverPrint) {
        if (cfg.default?.color) result.coverColor = cfg.default.color;
      }
      break;
    }
    case "quantity":
      if (cfg.default) result.qty = cfg.default;
      break;
    case "delivery":
      if (cfg.default) {
        result.delivery = cfg.default;
        const opts = cfg.options || [];
        const defaultOpt = opts.find((o: any) => o.id === cfg.default);
        if (defaultOpt) result.deliveryPercent = defaultOpt.percent;
        const businessDaysMap: Record<string, number> = {
          same: 0,
          next1: 1,
          next2: 2,
          next3: 3,
        };
        const days = businessDaysMap[cfg.default] ?? 2;
        const date = getBusinessDate(days);
        result.deliveryDate = formatBusinessDate(date);
      }
      break;
    case "pages":
    case "pages_saddle":
    case "pages_leaf":
      if (cfg.default) result.pages = cfg.default;
      if (cfg.maxThickness) result.maxThickness = cfg.maxThickness;
      break;
    case "pp":
      if (cfg.default) result.pp = cfg.default;
      break;
    case "back":
      if (cfg.default) result.back = cfg.default;
      break;
    case "spring_color":
      if (cfg.default) result.springColor = cfg.default;
      break;
    case "spring_options": {
      if (cfg.pp?.enabled) {
        const ppDefault =
          cfg.pp.options?.find((o: any) => o.default)?.id ||
          cfg.pp.options?.[0]?.id;
        if (ppDefault) result.pp = ppDefault;
      }
      if (cfg.coverPrint?.enabled) {
        const coverPrintDefault =
          cfg.coverPrint.options?.find((o: any) => o.default)?.id ||
          cfg.coverPrint.options?.[0]?.id;
        if (coverPrintDefault) result.coverPrint = coverPrintDefault;
        if (cfg.coverPrint.defaultPaper?.paper)
          result.coverPaper = cfg.coverPrint.defaultPaper.paper;
        if (cfg.coverPrint.defaultPaper?.weight)
          result.coverWeight = cfg.coverPrint.defaultPaper.weight;
      }
      if (cfg.back?.enabled) {
        const backDefault =
          cfg.back.options?.find((o: any) => o.default)?.id ||
          cfg.back.options?.[0]?.id;
        if (backDefault) result.back = backDefault;
      }
      if (cfg.springColor?.enabled) {
        const springColorDefault =
          cfg.springColor.options?.find((o: any) => o.default)?.id ||
          cfg.springColor.options?.[0]?.id;
        if (springColorDefault) result.springColor = springColorDefault;
      }
      break;
    }
    case "finishing":
      if (cfg.default) {
        const hasCoating =
          cfg.default.coating ||
          !!cfg.default.coatingType ||
          !!cfg.default.coatingSide;
        result.finishing = {
          coating: hasCoating,
          coatingType: hasCoating ? cfg.default.coatingType || "matte" : null,
          coatingSide: hasCoating ? cfg.default.coatingSide || "single" : null,
          corner: cfg.default.corner || false,
          punch: cfg.default.punch || false,
          mising: cfg.default.mising || false,
        };
      }
      break;
    case "cover_print":
      if (cfg.default) result.coverPrint = cfg.default;
      if (cfg.defaultPaper?.paper) result.coverPaper = cfg.defaultPaper.paper;
      if (cfg.defaultPaper?.weight)
        result.coverWeight = cfg.defaultPaper.weight;
      break;
    case "inner_layer_saddle":
    case "inner_layer_leaf":
      if (cfg.defaultPaper?.paper) result.innerPaper = cfg.defaultPaper.paper;
      if (cfg.defaultPaper?.weight)
        result.innerWeight = cfg.defaultPaper.weight;
      if (cfg.defaultPrint?.color) result.innerColor = cfg.defaultPrint.color;
      if (cfg.defaultPrint?.side) result.innerSide = cfg.defaultPrint.side;
      if (cfg.defaultPages) result.pages = cfg.defaultPages;
      if (cfg.maxThickness) result.maxThickness = cfg.maxThickness;
      break;
  }

  return result;
}
