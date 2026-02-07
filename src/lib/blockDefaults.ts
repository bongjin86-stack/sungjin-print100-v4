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
 * │  checkLinkRules               │  블록 간 연동 규칙 체크     │
 * │  checkThickness               │  제본 두께 제한 검증        │
 * │  validateCoatingWeight        │  코팅 무게 제한 (≤150g 불가)│
 * │  getCoatingWeight             │  코팅 기준 용지 평량 결정    │
 * │  getFoldUpdate                │  접지 → 오시 자동 연동      │
 * │  mapPrintOptionsToCustomer    │  인쇄옵션 → 고객값 매핑     │
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

import { getDefaultCustomer } from '@/lib/builderData';
import { formatBusinessDate, getBusinessDate } from '@/lib/businessDays';
import { estimateThickness, validateBindingThickness } from '@/lib/priceEngine';

// ============================================================
// 코팅 무게 제한 (priceEngine에서 이관)
// ============================================================
export function validateCoatingWeight(weight: number): { valid: boolean; message: string | null } {
  if (weight <= 150) {
    return { valid: false, message: '150g 이하 용지는 코팅이 불가합니다.' };
  }
  return { valid: true, message: null };
}

// ============================================================
// 코팅 기준 용지 평량 결정 (finishing 블록용)
// ============================================================
export function getCoatingWeight(blocks: any[], customer: any, productType: string): number {
  const finishingBlock = blocks?.find(b => b.on && b.type === 'finishing');
  if (!finishingBlock) return customer.weight || 80;

  const cfg = finishingBlock.config;
  const isBindingProduct = ['saddle', 'perfect', 'spring'].includes(productType);

  // 1) linkedPaper가 설정된 경우: 해당 블록 기준으로 평량 결정
  if (cfg?.coating?.linkedPaper) {
    const linkedBlock = blocks?.find(b => b.id === cfg.coating.linkedPaper);
    if (linkedBlock) {
      const isInner = linkedBlock.type === 'inner_layer_saddle' ||
                      linkedBlock.type === 'inner_layer_leaf' ||
                      linkedBlock.label?.includes('내지');
      const isCover = linkedBlock.type === 'cover_print' ||
                      linkedBlock.label?.includes('표지');

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
// 블록 설정에서 기본값 추출
// ============================================================
export function extractDefaultsFromBlocks(blocks) {
  const defaults = { ...getDefaultCustomer() };
  if (!blocks) return defaults;

  blocks.forEach(block => {
    if (!block.on) return;
    const cfg = block.config;
    if (!cfg) return;

    switch (block.type) {
      case 'size':
        if (cfg.default) defaults.size = cfg.default;
        break;
      case 'paper': {
        const isCoverPaper = blocks.some(b => b.config?.linkedBlocks?.coverPaper === block.id);
        if (isCoverPaper) {
          if (cfg.default?.paper) defaults.coverPaper = cfg.default.paper;
          if (cfg.default?.weight) defaults.coverWeight = cfg.default.weight;
        } else {
          if (cfg.default?.paper) defaults.paper = cfg.default.paper;
          if (cfg.default?.weight) defaults.weight = cfg.default.weight;
        }
        break;
      }
      case 'print': {
        const isInnerPrint = blocks.some(b => b.config?.linkedBlocks?.innerPrint === block.id);
        const isCoverPrint = blocks.some(b => b.config?.linkedBlocks?.coverPrint === block.id);
        if (isInnerPrint) {
          if (cfg.default?.color) defaults.innerColor = cfg.default.color;
          if (cfg.default?.side) defaults.innerSide = cfg.default.side;
        } else {
          if (cfg.default?.color) defaults.color = cfg.default.color;
          if (cfg.default?.side) defaults.side = cfg.default.side;
        }
        if (isCoverPrint) {
          if (cfg.default?.color) defaults.coverColor = cfg.default.color;
        }
        break;
      }
      case 'quantity':
        if (cfg.default) defaults.qty = cfg.default;
        break;
      case 'delivery':
        if (cfg.default) {
          defaults.delivery = cfg.default;
          const opts = cfg.options || [];
          const defaultOpt = opts.find(o => o.id === cfg.default);
          if (defaultOpt) defaults.deliveryPercent = defaultOpt.percent;
          // 출고일 계산
          const businessDaysMap = { 'same': 0, 'next1': 1, 'next2': 2, 'next3': 3 };
          const days = businessDaysMap[cfg.default] ?? 2;
          const date = getBusinessDate(days);
          defaults.deliveryDate = formatBusinessDate(date);
        }
        break;
      case 'pages':
      case 'pages_saddle':
      case 'pages_leaf':
        if (cfg.default) defaults.pages = cfg.default;
        if (cfg.maxThickness) defaults.maxThickness = cfg.maxThickness;
        break;
      case 'pp':
        if (cfg.default) defaults.pp = cfg.default;
        break;
      case 'back':
        if (cfg.default) defaults.back = cfg.default;
        break;
      case 'spring_color':
        if (cfg.default) defaults.springColor = cfg.default;
        break;
      case 'spring_options': {
        // PP
        if (cfg.pp?.enabled) {
          const ppDefault = cfg.pp.options?.find(o => o.default)?.id || cfg.pp.options?.[0]?.id;
          if (ppDefault) defaults.pp = ppDefault;
        }
        // 표지인쇄
        if (cfg.coverPrint?.enabled) {
          const coverPrintDefault = cfg.coverPrint.options?.find(o => o.default)?.id || cfg.coverPrint.options?.[0]?.id;
          if (coverPrintDefault) defaults.coverPrint = coverPrintDefault;
          if (cfg.coverPrint.defaultPaper?.paper) defaults.coverPaper = cfg.coverPrint.defaultPaper.paper;
          if (cfg.coverPrint.defaultPaper?.weight) defaults.coverWeight = cfg.coverPrint.defaultPaper.weight;
        }
        // 뒷판
        if (cfg.back?.enabled) {
          const backDefault = cfg.back.options?.find(o => o.default)?.id || cfg.back.options?.[0]?.id;
          if (backDefault) defaults.back = backDefault;
        }
        // 스프링 색상
        if (cfg.springColor?.enabled) {
          const springColorDefault = cfg.springColor.options?.find(o => o.default)?.id || cfg.springColor.options?.[0]?.id;
          if (springColorDefault) defaults.springColor = springColorDefault;
        }
        break;
      }
      case 'finishing':
        if (cfg.default) {
          const hasCoating = cfg.default.coating || !!cfg.default.coatingType || !!cfg.default.coatingSide;
          defaults.finishing = {
            ...defaults.finishing,
            coating: hasCoating,
            coatingType: hasCoating ? (cfg.default.coatingType || 'matte') : null,
            coatingSide: hasCoating ? (cfg.default.coatingSide || 'single') : null,
            corner: cfg.default.corner || false,
            punch: cfg.default.punch || false,
            mising: cfg.default.mising || false,
          };
        }
        break;
      case 'cover_print':
        if (cfg.default) defaults.coverPrint = cfg.default;
        if (cfg.defaultPaper?.paper) defaults.coverPaper = cfg.defaultPaper.paper;
        if (cfg.defaultPaper?.weight) defaults.coverWeight = cfg.defaultPaper.weight;
        break;
      case 'inner_layer_saddle':
      case 'inner_layer_leaf':
        if (cfg.defaultPaper?.paper) defaults.innerPaper = cfg.defaultPaper.paper;
        if (cfg.defaultPaper?.weight) defaults.innerWeight = cfg.defaultPaper.weight;
        if (cfg.defaultPrint?.color) defaults.innerColor = cfg.defaultPrint.color;
        if (cfg.defaultPrint?.side) defaults.innerSide = cfg.defaultPrint.side;
        if (cfg.defaultPages) defaults.pages = cfg.defaultPages;
        if (cfg.maxThickness) defaults.maxThickness = cfg.maxThickness;
        break;
    }
  });

  return defaults;
}

// ============================================================
// 연동 규칙 체크 (스프링제본: 앞뒤표지 선택 시 뒷판 비활성화)
// ============================================================
export function checkLinkRules(blocks, customer) {
  if (!blocks) return {};

  const coverPrintBlock = blocks.find(b => b.type === 'cover_print');
  const backBlock = blocks.find(b => b.type === 'back');

  if (coverPrintBlock && backBlock) {
    if (customer.coverPrint === 'front_back') {
      return { backDisabled: true };
    }
  }

  // PP와 표지인쇄 둘 다 없음인지 체크
  const ppBlock = blocks.find(b => b.type === 'pp');
  if (ppBlock && coverPrintBlock) {
    if (customer.pp === 'none' && customer.coverPrint === 'none') {
      return { error: '전면 커버(PP 또는 표지인쇄) 중 하나는 선택해야 합니다.' };
    }
  }

  return {};
}

// ============================================================
// 접지 선택 — 순수 로직 (finishing 업데이트 객체 반환)
// ============================================================
export function getFoldUpdate(foldOpt, cfg, customer) {
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
      ...(needsOsi && cfg.osi?.enabled ? { osiEnabled: true, osi: osiLines } : {})
    };
  }
}

// ============================================================
// 두께 검증 (ProductView + Builder 공용)
// ============================================================
export function checkThickness(blocks, customer) {
  const thicknessBlock = blocks?.find(b => b.on &&
    ['inner_layer_saddle', 'inner_layer_leaf', 'pages', 'pages_saddle', 'pages_leaf'].includes(b.type));

  if (!thicknessBlock?.config?.maxThickness || !(customer.pages > 0)) {
    return { error: false, message: null, thickness: 0 };
  }

  const innerWeight = customer.innerWeight || customer.weight || 80;
  const innerPaper = customer.innerPaper || customer.paper || '';
  const paperThickness = estimateThickness(innerWeight, innerPaper);
  const totalThickness = (customer.pages / 2) * paperThickness;

  const bindingType = thicknessBlock.type.includes('saddle') ? 'saddle' : 'perfect';
  const validation = validateBindingThickness(bindingType, totalThickness, thicknessBlock.config.maxThickness);
  return { ...validation, thickness: totalThickness };
}

// ============================================================
// printOptions를 innerSide/innerColor로 매핑
// ============================================================
export function mapPrintOptionsToCustomer(cust, blocks) {
  if (!blocks) return cust;
  const pagesBlock = blocks.find(b => b.type === 'pages');
  const linkedBlocks = pagesBlock?.config?.linkedBlocks || {};
  const innerPrintBlockId = linkedBlocks.innerPrint;
  const innerPrintOpt = innerPrintBlockId ? cust.printOptions?.[innerPrintBlockId] : null;
  const coverPrintBlockId = linkedBlocks.coverPrint;
  const coverPrintOpt = coverPrintBlockId ? cust.printOptions?.[coverPrintBlockId] : null;
  return {
    ...cust,
    innerSide: innerPrintOpt?.side || cust.innerSide || 'double',
    innerColor: innerPrintOpt?.color || cust.innerColor || 'color',
    coverSide: coverPrintOpt?.side || cust.coverSide || 'double',
    coverColor: coverPrintOpt?.color || cust.coverColor || 'color',
  };
}
