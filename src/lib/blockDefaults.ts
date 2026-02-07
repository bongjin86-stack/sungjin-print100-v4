/**
 * blockDefaults.ts — ProductView와 ProductBuilder 공용 함수
 * Phase 1: 기능 변경 없이 기존 코드 추출만 수행
 */

import { getDefaultCustomer } from '@/lib/builderData';
import { formatBusinessDate, getBusinessDate } from '@/lib/businessDays';

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
      case 'paper':
        if (cfg.default?.paper) defaults.paper = cfg.default.paper;
        if (cfg.default?.weight) defaults.weight = cfg.default.weight;
        break;
      case 'print': {
        const isInnerPrint = blocks.some(b => b.config?.linkedBlocks?.innerPrint === block.id);
        if (isInnerPrint) {
          if (cfg.default?.color) defaults.innerColor = cfg.default.color;
          if (cfg.default?.side) defaults.innerSide = cfg.default.side;
        } else {
          if (cfg.default?.color) defaults.color = cfg.default.color;
          if (cfg.default?.side) defaults.side = cfg.default.side;
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
  const needsOsi = currentWeight >= 150;
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
