// ============================================================
// ProductView.jsx - 고객용 상품 상세 페이지
// v1 ProductDetail.jsx 기반, nagi Layout.astro 안에서 렌더링
// PreviewBlock은 shared 컴포넌트 사용
// ============================================================

import { useEffect,useState } from 'react';

import DOMPurify from 'isomorphic-dompurify';

import { PreviewBlock } from '@/components/shared/PreviewBlock';
import { PriceBox } from '@/components/shared/PriceBox';
import { getDefaultCustomer } from '@/lib/builderData';
import { formatBusinessDate, getBusinessDate } from '@/lib/businessDays';
import { loadPricingData } from '@/lib/dbService';
import { getIconComponent } from '@/lib/highlightIcons';
import { calculatePrice, estimateThickness, validateBindingThickness } from '@/lib/priceEngine';

export default function ProductView({ product: initialProduct }) {
  const [product] = useState(initialProduct);
  const [customer, setCustomer] = useState(() => extractDefaultsFromBlocks(initialProduct?.blocks));
  const [selectedImage, setSelectedImage] = useState(0);
  const [dbPapers, setDbPapers] = useState({});
  const [dbPapersList, setDbPapersList] = useState([]);
  const [pricingDataLoaded, setPricingDataLoaded] = useState(false);

  useEffect(() => {
    loadDbPapers();
  }, []);

  // DB에서 용지 데이터 로드
  const loadDbPapers = async () => {
    try {
      const data = await loadPricingData();
      if (data?.papers) {
        const paperMap = {};
        data.papers.forEach(p => {
          paperMap[p.code] = {
            name: p.name,
            desc: p.description || '',
            image_url: p.image_url || null
          };
        });
        setDbPapers(paperMap);
        setDbPapersList(data.papers);
      }
      setPricingDataLoaded(true);
    } catch (err) {
      console.error('Failed to load paper data:', err);
      setPricingDataLoaded(true);
    }
  };

  // 연동 규칙 체크
  const checkLinkRules = () => {
    const coverPrintBlock = product?.blocks?.find(b => b.type === 'cover_print');
    const backBlock = product?.blocks?.find(b => b.type === 'back');
    if (coverPrintBlock && backBlock && customer.coverPrint === 'front_back') {
      return { backDisabled: true };
    }
    const ppBlock = product?.blocks?.find(b => b.type === 'pp');
    if (ppBlock && coverPrintBlock && customer.pp === 'none' && customer.coverPrint === 'none') {
      return { error: '전면 커버(PP 또는 표지인쇄) 중 하나는 선택해야 합니다.' };
    }
    return {};
  };

  // printOptions를 innerSide/innerColor로 매핑
  const mapPrintOptionsToCustomer = (cust, blocks) => {
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
  };

  // 접지 선택 핸들러
  const handleFoldSelect = (foldOpt, cfg) => {
    const currentWeight = customer.weight || 100;
    const needsOsi = currentWeight >= 150;
    const osiLines = foldOpt - 1;

    if (foldOpt === customer.finishing?.fold && customer.finishing?.foldEnabled) {
      setCustomer(prev => ({
        ...prev,
        finishing: { ...prev.finishing, foldEnabled: false, fold: null, osiEnabled: false, osi: null }
      }));
    } else {
      setCustomer(prev => ({
        ...prev,
        finishing: {
          ...prev.finishing,
          foldEnabled: true,
          fold: foldOpt,
          ...(needsOsi && cfg.osi?.enabled ? { osiEnabled: true, osi: osiLines } : {})
        }
      }));
    }
  };

  if (!product) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">상품을 찾을 수 없습니다</h2>
        <a href="/" className="mt-4 inline-block px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors font-medium">
          홈으로
        </a>
      </div>
    );
  }

  const content = product.content || {};
  const blocks = product.blocks?.filter(b => b.on && !b.hidden) || [];
  const linkStatus = checkLinkRules();

  // 가격 데이터 로드 전에는 계산하지 않음 (SSR 시 getSizeInfo가 비어있음)
  const defaultPrice = { total: 0, unitPrice: 0, perUnit: 0, sheets: 0, faces: 0 };
  let price = defaultPrice;
  if (pricingDataLoaded) {
    try {
      price = calculatePrice(mapPrintOptionsToCustomer(customer, product?.blocks), customer.qty, product.product_type || product.id) || defaultPrice;
    } catch (e) {
      console.warn('Price calculation error:', e.message);
    }
  }

  // 두께 검증 (inner_layer 또는 pages 블록의 maxThickness 기반)
  const thicknessBlock = product?.blocks?.find(b => b.on &&
    ['inner_layer_saddle', 'inner_layer_leaf', 'pages', 'pages_saddle', 'pages_leaf'].includes(b.type));
  let thicknessCheck = { error: false, message: null, thickness: 0 };

  if (thicknessBlock?.config?.maxThickness && customer.pages > 0) {
    const innerWeight = customer.innerWeight || customer.weight || 80;
    const innerPaper = customer.innerPaper || customer.paper || '';
    const paperThickness = estimateThickness(innerWeight, innerPaper);

    // 통일 공식: 페이지 수 / 2 × 용지두께 (모든 제본 동일)
    const totalThickness = (customer.pages / 2) * paperThickness;

    const bindingType = thicknessBlock.type.includes('saddle') ? 'saddle' : 'perfect';
    const validation = validateBindingThickness(bindingType, totalThickness, thicknessBlock.config.maxThickness);
    thicknessCheck = { ...validation, thickness: totalThickness };

    // 디버그 로그 (개발 시 확인용)
    console.log('[두께검증]', {
      blockType: thicknessBlock.type,
      pages: customer.pages,
      weight: innerWeight,
      paperThickness,
      totalThickness: totalThickness.toFixed(2) + 'mm',
      maxThickness: thicknessBlock.config.maxThickness + 'mm',
      error: validation.error
    });
  }

  // 두께 검증 결과를 price에 병합 (항상 적용)
  if (thicknessCheck.thickness > 0) {
    price = {
      ...price,
      thicknessValidation: thicknessCheck,
      totalThickness: thicknessCheck.thickness
    };
  }

  const images = [
    content.mainImage,
    ...(content.thumbnails || [])
  ].filter(Boolean);

  return (
    <div className="product-view">
      {/* 연동 에러 표시 */}
      {linkStatus.error && (
        <div className="pv-error">
          <span>&#9888; {linkStatus.error}</span>
        </div>
      )}

      <div className="pv-grid">
        {/* 왼쪽: 이미지 영역 */}
        <div className="pv-images">
          {/* 메인 이미지 */}
          <div className="pv-main-image">
            {images[selectedImage] ? (
              <img src={images[selectedImage]} alt={product.name} />
            ) : content.mainImage ? (
              <img src={content.mainImage} alt={product.name} />
            ) : (
              <div className="pv-no-image">
                <svg className="w-16 h-16 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p>이미지 없음</p>
              </div>
            )}
          </div>

          {/* 썸네일 */}
          {images.length > 1 && (
            <div className="pv-thumbnails">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className={`pv-thumb ${selectedImage === idx ? 'active' : ''}`}
                  onClick={() => setSelectedImage(idx)}
                >
                  <img src={img} alt={`썸네일${idx + 1}`} />
                </div>
              ))}
            </div>
          )}

          {/* 하이라이트 카드 */}
          {content.highlights && content.highlights.length > 0 && (
            <div className="pv-highlights">
              {content.highlights.map((h, idx) => {
                const IconComp = getIconComponent(h.icon);
                return (
                  <div key={idx} className="pv-highlight-card">
                    <div className="pv-highlight-icon">
                      <IconComp size={32} strokeWidth={1.3} />
                    </div>
                    <div className="pv-highlight-text">
                      <span className="pv-highlight-title">{h.title}</span>
                      <p className="pv-highlight-desc">{h.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* 오른쪽: 옵션 영역 */}
        <div className="pv-options">
          <h1 className="pv-product-title">{content.title || product.name}</h1>

          {content.description && (
            <p className="pv-product-desc">{content.description}</p>
          )}

          {/* 주요 특징 */}
          {renderFeatures(content)}

          {/* 블록 미리보기 */}
          {blocks.map(block => (
            <PreviewBlock
              key={block.id}
              block={block}
              customer={customer}
              setCustomer={setCustomer}
              calculatePrice={calculatePrice}
              linkStatus={linkStatus}
              handleFoldSelect={handleFoldSelect}
              productType={product.product_type || product.id}
              dbPapers={dbPapers}
              dbPapersList={dbPapersList}
              allBlocks={product?.blocks || []}
              thicknessError={price.thicknessValidation?.error}
            />
          ))}

          {/* 가격 표시 - 공유 컴포넌트 */}
          <PriceBox
            price={price}
            customer={customer}
            isPreview={false}
            onOrderClick={() => {
              const finishingList = [];
              if (customer.finishing?.foldEnabled) finishingList.push(`접지 ${customer.finishing.fold}단`);
              if (customer.finishing?.osiEnabled) finishingList.push(`오시 ${customer.finishing.osi}줄`);
              if (customer.finishing?.mising) finishingList.push('미싱');
              if (customer.finishing?.corner) finishingList.push('귀도리');
              if (customer.finishing?.punch) finishingList.push('타공');
              if (customer.finishing?.coating) {
                const typeNames = { matte: '무광코팅', gloss: '유광코팅' };
                const sideNames = { single: '단면', double: '양면' };
                finishingList.push(`${typeNames[customer.finishing.coatingType] || '코팅'} ${sideNames[customer.finishing.coatingSide] || ''}`);
              }

              const paperName = dbPapers[customer.paper]?.name || customer.paper;
              const weightText = customer.weight ? `${customer.weight}g` : '';
              const paperFullName = `${paperName} ${weightText}`.trim();
              const isBinding = ['perfect', 'saddle', 'spring'].includes(product.product_type || product.id);

              sessionStorage.setItem('checkoutProduct', JSON.stringify({
                name: product.name,
                type: product.product_type || product.id,
                spec: {
                  size: customer.size || '맞춤',
                  paper: paperFullName,
                  color: `${customer.color === 'color' ? '컬러' : '흑백'} ${customer.side === 'single' ? '단면' : '양면'}`,
                  finishing: finishingList,
                  quantity: customer.qty,
                  pages: customer.pages,
                },
                price: price.total,
                productionDays: 2,
                paperWeight: customer.weight || 120,
                paperCode: customer.paper,
                isBinding,
                innerWeight: isBinding ? (customer.innerWeight || 80) : null,
                coverWeight: isBinding ? (customer.coverWeight || customer.weight || 200) : null,
                // Server-side price verification data
                customerSelection: customer,
              }));

              window.location.href = '/upload';
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// BlockNote JSON → 텍스트 렌더링
// ============================================================
function renderBlockContent(blocks) {
  if (!Array.isArray(blocks)) return null;
  return blocks.map(block => {
    const text = block.content
      ?.filter(c => c.type === 'text')
      ?.map(c => c.text)
      ?.join('') || '';
    if (!text) return null;
    if (block.type === 'bulletListItem') return <li key={block.id}>{text}</li>;
    if (block.type === 'paragraph') return <p key={block.id}>{text}</p>;
    return <span key={block.id}>{text}</span>;
  }).filter(Boolean);
}


function renderFeatures(content) {
  // 1) featuresHtml이 BlockNote JSON 배열인 경우
  if (content.featuresHtml) {
    let parsed = content.featuresHtml;
    if (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed); } catch { parsed = null; }
    }
    if (Array.isArray(parsed)) {
      const items = renderBlockContent(parsed);
      if (items && items.length > 0) {
        const hasBullets = parsed.some(b => b.type === 'bulletListItem');
        return (
          <div className="pv-features">
            <h3>주요 특징</h3>
            {hasBullets ? <ul>{items}</ul> : <div>{items}</div>}
          </div>
        );
      }
    }
    // 2) featuresHtml이 일반 HTML 문자열인 경우
    if (typeof content.featuresHtml === 'string' && content.featuresHtml.trim().startsWith('<')) {
      return (
        <div className="pv-features">
          <h3>주요 특징</h3>
          <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content.featuresHtml) }} />
        </div>
      );
    }
  }

  // 3) features가 문자열 배열인 경우
  if (Array.isArray(content.features) && content.features.length > 0) {
    return (
      <div className="pv-features">
        <h3>주요 특징</h3>
        <ul>
          {content.features.map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      </div>
    );
  }

  return null;
}

// ============================================================
// 블록 설정에서 기본값 추출
// ============================================================
function extractDefaultsFromBlocks(blocks) {
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
