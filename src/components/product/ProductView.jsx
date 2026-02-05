// ============================================================
// ProductView.jsx - 고객용 상품 상세 페이지
// v1 ProductDetail.jsx 기반, nagi Layout.astro 안에서 렌더링
// PreviewBlock을 inline으로 포함 (빌더 import 안 함)
// ============================================================

import { useEffect,useState } from 'react';

import DOMPurify from 'isomorphic-dompurify';

import { DB, getDefaultCustomer } from '@/lib/builderData';
import { formatBusinessDate,getBusinessDate } from '@/lib/businessDays';
import { loadPricingData } from '@/lib/dbService';
import { getIconComponent } from '@/lib/highlightIcons';
import { calculatePrice, validateCoatingWeight } from '@/lib/priceEngine';

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
            />
          ))}

          {/* 가격 표시 */}
          <div className="pv-price-box">
            <div className="pv-price-row">
              <div>
                <p className="pv-price-name">{product.name}</p>
                <p className="pv-price-spec">{customer.qty}부 · {customer.pages || '-'}장</p>
              </div>
              <div className="pv-price-amount">
                <p className="pv-price-total">
                  {price.total.toLocaleString()}<span className="pv-price-unit">원</span>
                </p>
                <p className="pv-price-vat">부가세 별도</p>
              </div>
            </div>

            {/* 두께 경고/에러 */}
            {price.thicknessValidation?.error && (
              <div className="pv-thickness-error">
                <p>&#9888; {price.thicknessValidation.message}</p>
              </div>
            )}
            {price.thicknessValidation?.warning && !price.thicknessValidation?.error && (
              <div className="pv-thickness-warning">
                <p>&#9888; {price.thicknessValidation.message}</p>
              </div>
            )}

            {price.totalThickness > 0 && (
              <p className="pv-thickness-info">
                총 두께: {price.totalThickness.toFixed(1)}mm
              </p>
            )}
          </div>

          {/* 주문하기 버튼 */}
          <button
            onClick={() => {
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
              }));

              window.location.href = '/upload';
            }}
            className="pv-order-btn"
          >
            주문하기
          </button>
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
        }
        break;
      case 'pages':
      case 'pages_saddle':
      case 'pages_leaf':
        if (cfg.default) defaults.pages = cfg.default;
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
        break;
    }
  });

  return defaults;
}

// ============================================================
// PreviewBlock - 블록 타입별 옵션 UI (빌더에서 복사)
// ============================================================
function PreviewBlock({ block, customer, setCustomer, calculatePrice, linkStatus, handleFoldSelect, productType, dbPapers = {}, dbPapersList = [], allBlocks = [] }) {
  const cfg = block.config;
  const isDisabled = block.locked;

  // 뒷판 비활성화
  if (block.type === 'back' && linkStatus?.backDisabled) {
    return (
      <div className="pv-block opacity-50">
        <p className="pv-block-label">{block.label} <span className="text-xs">(앞뒤표지 선택으로 비활성화)</span></p>
        <div className="pv-block-disabled-msg">
          <p>앞뒤표지 인쇄 선택 시 뒷판이 필요하지 않습니다.</p>
        </div>
      </div>
    );
  }

  switch (block.type) {
    case 'size':
      return (
        <div className="pv-block">
          <p className="pv-block-label">{block.label}</p>
          <div className="pv-btn-row">
            {cfg.options?.map(s => (
              <button
                key={s}
                disabled={isDisabled}
                className={`pv-btn ${customer.size === s ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
                onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, size: s }))}
              >
                {DB.sizeMultipliers[s]?.name || s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      );

    case 'paper': {
      const isCoverPaper = block.label.includes('표지');
      const isInnerPaper = block.label.includes('내지');
      const paperField = isCoverPaper ? 'coverPaper' : isInnerPaper ? 'innerPaper' : 'paper';
      const weightField = isCoverPaper ? 'coverWeight' : isInnerPaper ? 'innerWeight' : 'weight';

      return (
        <div className="pv-block">
          <p className="pv-block-label">{block.label}</p>
          <div className="pv-paper-list">
            {Object.entries(cfg.papers || {}).map(([code, weights]) => {
              const paper = dbPapersList.find(p => p.code === code) || DB.papers.find(p => p.code === code);
              if (!paper || !weights.length) return null;
              const isSelected = customer[paperField] === code;
              return (
                <div
                  key={code}
                  className={`pv-paper-item ${isSelected ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
                  onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, [paperField]: code, [weightField]: weights[0] }))}
                >
                  <div className="pv-paper-thumb">
                    {dbPapers[code]?.image_url ? (
                      <img src={dbPapers[code].image_url} alt={dbPapers[code]?.name || paper.name} />
                    ) : (
                      <div
                        className="pv-paper-swatch"
                        style={{
                          background: code === 'snow'
                            ? 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)'
                            : code === 'mojo'
                            ? 'linear-gradient(135deg, #fefcf3 0%, #fef3c7 50%, #fde68a 100%)'
                            : code === 'artpaper'
                            ? 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)'
                            : code === 'rendezvous'
                            ? 'linear-gradient(135deg, #faf5ef 0%, #f5ebe0 50%, #eddfcc 100%)'
                            : code === 'inspire' || code === 'inspirer'
                            ? 'linear-gradient(135deg, #f5f5f4 0%, #e7e5e4 50%, #d6d3d1 100%)'
                            : 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)'
                        }}
                      />
                    )}
                  </div>
                  <div className="pv-paper-info">
                    <p className={`pv-paper-name ${isSelected ? 'active' : ''}`}>{dbPapers[code]?.name || paper.name}</p>
                    <p className="pv-paper-desc">{dbPapers[code]?.desc || paper.desc}</p>
                  </div>
                  <div className="pv-weight-btns">
                    {weights.map(w => (
                      <button
                        key={w}
                        disabled={isDisabled}
                        className={`pv-weight-btn ${isSelected && customer[weightField] === w ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); !isDisabled && setCustomer(prev => ({ ...prev, [paperField]: code, [weightField]: w })); }}
                      >
                        {w}g
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    case 'pp':
      return (
        <div className="pv-block">
          <p className="pv-block-label">{block.label}</p>
          <div className="pv-btn-row">
            {cfg.options?.map(o => (
              <button
                key={o}
                disabled={isDisabled}
                className={`pv-btn ${customer.pp === o ? 'active' : ''}`}
                onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, pp: o }))}
              >
                {o === 'clear' ? '투명' : o === 'frosted' ? '불투명' : '없음'}
              </button>
            ))}
          </div>
        </div>
      );

    case 'cover_print':
      return (
        <div className="pv-block">
          <p className="pv-block-label">{block.label}</p>
          <div className="pv-btn-row" style={{ marginBottom: '0.75rem' }}>
            {cfg.options?.map(o => (
              <button
                key={o}
                disabled={isDisabled}
                className={`pv-btn ${customer.coverPrint === o ? 'active' : ''}`}
                onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, coverPrint: o }))}
              >
                {o === 'none' ? '없음' : o === 'front_only' ? '앞표지만' : '앞뒤표지'}
              </button>
            ))}
          </div>
          {customer.coverPrint !== 'none' && cfg.papers && (
            <div className="pv-sub-section">
              <p className="pv-sub-label">표지 용지</p>
              <div className="pv-paper-list">
                {Object.entries(cfg.papers).map(([code, weights]) => {
                  const paper = dbPapersList.find(p => p.code === code) || DB.papers.find(p => p.code === code);
                  if (!paper || !weights.length) return null;
                  const isSelected = customer.coverPaper === code;
                  return (
                    <div
                      key={code}
                      className={`pv-paper-item compact ${isSelected ? 'active' : ''}`}
                      onClick={() => setCustomer(prev => ({ ...prev, coverPaper: code, coverWeight: weights[0] }))}
                    >
                      <span className={`pv-paper-name ${isSelected ? 'active' : ''}`}>{paper.name}</span>
                      <div className="pv-weight-btns">
                        {weights.map(w => (
                          <button
                            key={w}
                            className={`pv-weight-btn ${isSelected && customer.coverWeight === w ? 'active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); setCustomer(prev => ({ ...prev, coverPaper: code, coverWeight: w })); }}
                          >
                            {w}g
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );

    case 'print': {
      const isBinding = ['saddle', 'perfect', 'spring'].includes(productType);
      const isInner = isBinding && allBlocks.some(b => b.config?.linkedBlocks?.innerPrint === block.id);
      const colorKey = isInner ? 'innerColor' : 'color';
      const sideKey = isInner ? 'innerSide' : 'side';
      return (
        <div className="pv-block">
          <p className="pv-block-label">{block.label}</p>
          <div className="pv-print-grid">
            <div>
              <p className="pv-sub-label">컬러</p>
              <div className="pv-btn-row">
                {cfg.color && (
                  <button
                    disabled={isDisabled}
                    className={`pv-btn ${customer[colorKey] === 'color' ? 'active' : ''}`}
                    onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, [colorKey]: 'color' }))}
                  >컬러</button>
                )}
                {cfg.mono && (
                  <button
                    disabled={isDisabled}
                    className={`pv-btn ${customer[colorKey] === 'mono' ? 'active' : ''}`}
                    onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, [colorKey]: 'mono' }))}
                  >흑백</button>
                )}
              </div>
            </div>
            <div>
              <p className="pv-sub-label">인쇄면</p>
              <div className="pv-btn-row">
                {cfg.single && (
                  <button
                    disabled={isDisabled}
                    className={`pv-btn ${customer[sideKey] === 'single' ? 'active' : ''}`}
                    onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, [sideKey]: 'single' }))}
                  >단면</button>
                )}
                {cfg.double && (
                  <button
                    disabled={isDisabled}
                    className={`pv-btn ${customer[sideKey] === 'double' ? 'active' : ''}`}
                    onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, [sideKey]: 'double' }))}
                  >양면</button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    case 'finishing':
      return (
        <div className="pv-block">
          <p className="pv-block-label">{block.label}</p>
          <div className="pv-finishing">
            <div className="pv-btn-row" style={{ flexWrap: 'wrap' }}>
              {cfg.coating?.enabled && (() => {
                let currentWeight = 80;
                if (cfg.coating?.linkedPaper) {
                  const linkedBlock = allBlocks?.find(b => b.id === cfg.coating.linkedPaper);
                  if (linkedBlock) {
                    const isCover = linkedBlock.label?.includes('표지');
                    const isInner = linkedBlock.label?.includes('내지');
                    if (linkedBlock.type === 'inner_layer_saddle' || linkedBlock.type === 'inner_layer_leaf' || isInner) {
                      currentWeight = customer.innerWeight || 80;
                    } else if (linkedBlock.type === 'cover_print' || isCover) {
                      currentWeight = customer.coverWeight || 80;
                    } else {
                      currentWeight = customer.weight || 80;
                    }
                  }
                } else {
                  currentWeight = customer.coverWeight || customer.weight || customer.innerWeight || 80;
                }
                const coatingValidation = validateCoatingWeight(currentWeight);
                const isCoatingDisabled = !coatingValidation.valid;
                return (
                  <div className="pv-tooltip-wrap">
                    <button
                      disabled={isCoatingDisabled}
                      className={`pv-btn ${isCoatingDisabled ? 'disabled-gray' : customer.finishing?.coating ? 'active' : ''}`}
                      onClick={() => !isCoatingDisabled && setCustomer(prev => ({
                        ...prev,
                        finishing: {
                          ...prev.finishing,
                          coating: !prev.finishing?.coating,
                          coatingType: !prev.finishing?.coating ? (prev.finishing?.coatingType || 'matte') : null,
                          coatingSide: !prev.finishing?.coating ? (prev.finishing?.coatingSide || 'single') : null
                        }
                      }))}
                    >코팅</button>
                    {isCoatingDisabled && <div className="pv-tooltip">{coatingValidation.message}</div>}
                  </div>
                );
              })()}
              {cfg.osi?.enabled && (
                <button
                  className={`pv-btn ${customer.finishing?.osiEnabled ? 'active' : ''}`}
                  onClick={() => setCustomer(prev => ({
                    ...prev,
                    finishing: { ...prev.finishing, osiEnabled: !prev.finishing?.osiEnabled, osi: !prev.finishing?.osiEnabled ? (prev.finishing?.osi || 1) : null }
                  }))}
                >오시</button>
              )}
              {cfg.fold?.enabled && (
                <button
                  className={`pv-btn ${customer.finishing?.foldEnabled ? 'active' : ''}`}
                  onClick={() => {
                    if (!customer.finishing?.foldEnabled) {
                      handleFoldSelect(customer.finishing?.fold || 2, cfg);
                    } else {
                      setCustomer(prev => ({ ...prev, finishing: { ...prev.finishing, foldEnabled: false, fold: null, osiEnabled: false, osi: null } }));
                    }
                  }}
                >접지</button>
              )}
              {cfg.corner && (
                <button
                  className={`pv-btn ${customer.finishing?.corner ? 'active' : ''}`}
                  onClick={() => setCustomer(prev => ({ ...prev, finishing: { ...prev.finishing, corner: !prev.finishing?.corner } }))}
                >귀도리</button>
              )}
              {cfg.punch && (
                <button
                  className={`pv-btn ${customer.finishing?.punch ? 'active' : ''}`}
                  onClick={() => setCustomer(prev => ({ ...prev, finishing: { ...prev.finishing, punch: !prev.finishing?.punch } }))}
                >타공</button>
              )}
              {cfg.mising && (
                <button
                  className={`pv-btn ${customer.finishing?.mising ? 'active' : ''}`}
                  onClick={() => setCustomer(prev => ({ ...prev, finishing: { ...prev.finishing, mising: !prev.finishing?.mising } }))}
                >미싱</button>
              )}
            </div>

            {/* 코팅 하위 옵션 */}
            {customer.finishing?.coating && cfg.coating?.enabled && (
              <div className="pv-sub-options">
                <div className="pv-btn-row">
                  {(cfg.coating?.matte ?? true) && (
                    <button className={`pv-btn-sm ${customer.finishing?.coatingType === 'matte' ? 'active' : ''}`}
                      onClick={() => setCustomer(prev => ({ ...prev, finishing: { ...prev.finishing, coatingType: 'matte' } }))}
                    >무광</button>
                  )}
                  {(cfg.coating?.gloss ?? true) && (
                    <button className={`pv-btn-sm ${customer.finishing?.coatingType === 'gloss' ? 'active' : ''}`}
                      onClick={() => setCustomer(prev => ({ ...prev, finishing: { ...prev.finishing, coatingType: 'gloss' } }))}
                    >유광</button>
                  )}
                </div>
                <span className="pv-divider">|</span>
                <div className="pv-btn-row">
                  {(cfg.coating?.single ?? true) && (
                    <button className={`pv-btn-sm ${customer.finishing?.coatingSide === 'single' ? 'active' : ''}`}
                      onClick={() => setCustomer(prev => ({ ...prev, finishing: { ...prev.finishing, coatingSide: 'single' } }))}
                    >단면</button>
                  )}
                  {(cfg.coating?.double ?? true) && (
                    <button className={`pv-btn-sm ${customer.finishing?.coatingSide === 'double' ? 'active' : ''}`}
                      onClick={() => setCustomer(prev => ({ ...prev, finishing: { ...prev.finishing, coatingSide: 'double' } }))}
                    >양면</button>
                  )}
                </div>
              </div>
            )}

            {/* 오시 하위 옵션 */}
            {customer.finishing?.osiEnabled && cfg.osi?.enabled && (
              <div className="pv-sub-options">
                <div className="pv-btn-row">
                  {[1, 2, 3].map(n => (
                    <button key={n}
                      className={`pv-btn-sm ${customer.finishing?.osi === n ? 'active' : ''}`}
                      onClick={() => setCustomer(prev => ({ ...prev, finishing: { ...prev.finishing, osi: n } }))}
                    >{n}줄</button>
                  ))}
                </div>
              </div>
            )}

            {/* 접지 하위 옵션 */}
            {customer.finishing?.foldEnabled && cfg.fold?.enabled && (
              <div className="pv-sub-options">
                <div className="pv-btn-row">
                  {[2, 3, 4].map(n => (
                    <button key={n}
                      className={`pv-btn-sm ${customer.finishing?.fold === n ? 'active' : ''}`}
                      onClick={() => handleFoldSelect(n, cfg)}
                    >{n}단</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      );

    case 'back':
      return (
        <div className="pv-block">
          <p className="pv-block-label">{block.label}</p>
          <div className="pv-btn-row">
            {cfg.options?.map(o => (
              <button
                key={o}
                disabled={isDisabled}
                className={`pv-btn ${customer.back === o ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
                onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, back: o }))}
              >
                {o === 'white' ? '화이트' : o === 'black' ? '블랙' : '없음'}
              </button>
            ))}
          </div>
        </div>
      );

    case 'spring_color':
      return (
        <div className="pv-block">
          <p className="pv-block-label">{block.label}</p>
          <div className="pv-btn-row">
            {cfg.options?.map(o => (
              <button
                key={o}
                disabled={isDisabled}
                className={`pv-btn ${customer.springColor === o ? 'active' : ''}`}
                onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, springColor: o }))}
              >
                {o === 'black' ? '블랙' : '화이트'}
              </button>
            ))}
          </div>
        </div>
      );

    case 'spring_options': {
      const ppIsNone = customer.pp === 'none';
      const coverPrintIsNone = customer.coverPrint === 'none';
      const showCoverError = ppIsNone && coverPrintIsNone;
      const isBackDisabled = customer.coverPrint === 'front_back';

      return (
        <div className="pv-block">
          <p className="pv-block-label">{block.label}</p>
          {block.desc && <p className="pv-block-desc">{block.desc}</p>}
          <div className="pv-spring-options">
            {showCoverError && (
              <div className="pv-spring-error">
                <p>전면 커버(PP 또는 표지인쇄) 중 하나는 선택해야 합니다.</p>
              </div>
            )}

            <div className="pv-spring-row">
              <span className="pv-spring-label">PP</span>
              <div className="pv-radio-group">
                {cfg.pp?.options?.filter(o => o.enabled).map(opt => (
                  <label key={opt.id} className="pv-radio">
                    <input
                      type="radio"
                      name="pp"
                      checked={customer.pp === opt.id}
                      disabled={isDisabled}
                      onChange={() => !isDisabled && setCustomer(prev => ({ ...prev, pp: opt.id }))}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="pv-spring-selects">
              <div>
                <label className="pv-select-label">표지인쇄</label>
                <select
                  value={customer.coverPrint}
                  disabled={isDisabled}
                  onChange={(e) => !isDisabled && setCustomer(prev => ({ ...prev, coverPrint: e.target.value }))}
                  className="pv-select"
                >
                  {cfg.coverPrint?.options?.filter(o => o.enabled).map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className={isBackDisabled ? 'opacity-50' : ''}>
                <label className="pv-select-label">
                  뒷판 {isBackDisabled && <span>(자동)</span>}
                </label>
                <select
                  value={customer.back}
                  disabled={isDisabled || isBackDisabled}
                  onChange={(e) => !isDisabled && !isBackDisabled && setCustomer(prev => ({ ...prev, back: e.target.value }))}
                  className="pv-select"
                >
                  {cfg.back?.options?.filter(o => o.enabled).map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="pv-select-label">스프링색상</label>
                <select
                  value={customer.springColor}
                  disabled={isDisabled}
                  onChange={(e) => !isDisabled && setCustomer(prev => ({ ...prev, springColor: e.target.value }))}
                  className="pv-select"
                >
                  {cfg.springColor?.options?.filter(o => o.enabled).map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {customer.coverPrint !== 'none' && cfg.coverPrint?.papers && (
              <div className="pv-sub-section">
                <p className="pv-sub-label">표지 용지 선택</p>
                <div className="pv-btn-row" style={{ flexWrap: 'wrap' }}>
                  {Object.entries(cfg.coverPrint.papers).map(([code, weights]) => {
                    const paper = dbPapersList.find(p => p.code === code) || DB.papers.find(p => p.code === code);
                    if (!paper || !weights.length) return null;
                    return weights.map(w => (
                      <button
                        key={`${code}-${w}`}
                        className={`pv-btn-sm ${customer.coverPaper === code && customer.coverWeight === w ? 'active' : ''}`}
                        onClick={() => setCustomer(prev => ({ ...prev, coverPaper: code, coverWeight: w }))}
                      >
                        {paper.name} {w}g
                      </button>
                    ));
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    case 'delivery': {
      const businessDaysMap = { 'same': 0, 'next1': 1, 'next2': 2, 'next3': 3 };
      return (
        <div className="pv-block">
          <p className="pv-block-label">출고일</p>
          <div className="pv-delivery-row">
            {cfg.options?.filter(opt => opt.enabled).map(opt => {
              const days = businessDaysMap[opt.id] ?? 2;
              const date = getBusinessDate(days);
              const dateStr = formatBusinessDate(date);
              return (
                <button
                  key={opt.id}
                  className={`pv-delivery-btn ${customer.delivery === opt.id ? 'active' : ''}`}
                  onClick={() => setCustomer(prev => ({ ...prev, delivery: opt.id, deliveryPercent: opt.percent }))}
                >
                  <p className="pv-delivery-date">{dateStr}</p>
                  <p className={`pv-delivery-percent ${opt.percent > 0 ? 'up' : opt.percent < 0 ? 'down' : ''}`}>
                    {opt.percent > 0 ? `+${opt.percent}%` : opt.percent < 0 ? `${opt.percent}%` : '기준가'}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    case 'pages_saddle':
    case 'pages_leaf':
    case 'pages':
      return (
        <div className="pv-block">
          <p className="pv-block-label">페이지 수</p>
          <div className="pv-pages-row">
            <button
              disabled={isDisabled}
              className="pv-pages-btn"
              onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, pages: Math.max(cfg.min, prev.pages - cfg.step) }))}
            >−</button>
            <div className="pv-pages-val">
              <span className="pv-pages-num">{customer.pages}</span>
              <span className="pv-pages-unit">p</span>
            </div>
            <button
              disabled={isDisabled}
              className="pv-pages-btn"
              onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, pages: Math.min(cfg.max, prev.pages + cfg.step) }))}
            >+</button>
          </div>
        </div>
      );

    case 'inner_layer_saddle':
    case 'inner_layer_leaf':
      return (
        <div className="pv-block pv-inner-layer">
          <p className="pv-block-label">{block.label}</p>

          {!cfg.paperHidden && (
            <div className="pv-inner-section">
              <p className="pv-sub-label">내지 용지</p>
              {Object.entries(cfg.papers || {}).map(([code, weights]) => {
                const paper = dbPapersList.find(p => p.code === code) || DB.papers.find(p => p.code === code);
                if (!paper || !weights.length) return null;
                return (
                  <div
                    key={code}
                    className={`pv-inner-paper ${customer.innerPaper === code ? 'active' : ''} ${cfg.paperLocked ? 'disabled' : ''}`}
                    onClick={() => !cfg.paperLocked && setCustomer(prev => ({ ...prev, innerPaper: code, innerWeight: weights[0] }))}
                  >
                    <span className="pv-paper-name">{paper.name}</span>
                    <div className="pv-weight-btns">
                      {weights.map(w => (
                        <button
                          key={w}
                          disabled={cfg.paperLocked}
                          className={`pv-weight-btn ${customer.innerPaper === code && customer.innerWeight === w ? 'active' : ''}`}
                          onClick={(e) => { e.stopPropagation(); !cfg.paperLocked && setCustomer(prev => ({ ...prev, innerPaper: code, innerWeight: w })); }}
                        >{w}g</button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pv-print-grid">
            {!cfg.printColorHidden && (
              <div>
                <p className="pv-sub-label">컬러</p>
                <div className="pv-btn-row">
                  {cfg.color && (
                    <button disabled={cfg.printColorLocked}
                      className={`pv-btn-sm ${customer.innerColor === 'color' ? 'active' : ''}`}
                      onClick={() => !cfg.printColorLocked && setCustomer(prev => ({ ...prev, innerColor: 'color' }))}
                    >컬러</button>
                  )}
                  {cfg.mono && (
                    <button disabled={cfg.printColorLocked}
                      className={`pv-btn-sm ${customer.innerColor === 'mono' ? 'active' : ''}`}
                      onClick={() => !cfg.printColorLocked && setCustomer(prev => ({ ...prev, innerColor: 'mono' }))}
                    >흑백</button>
                  )}
                </div>
              </div>
            )}
            {!cfg.printSideHidden && (
              <div>
                <p className="pv-sub-label">면수</p>
                <div className="pv-btn-row">
                  {cfg.single && (
                    <button disabled={cfg.printSideLocked}
                      className={`pv-btn-sm ${customer.innerSide === 'single' ? 'active' : ''}`}
                      onClick={() => !cfg.printSideLocked && setCustomer(prev => ({ ...prev, innerSide: 'single' }))}
                    >단면</button>
                  )}
                  {cfg.double && (
                    <button disabled={cfg.printSideLocked}
                      className={`pv-btn-sm ${customer.innerSide === 'double' ? 'active' : ''}`}
                      onClick={() => !cfg.printSideLocked && setCustomer(prev => ({ ...prev, innerSide: 'double' }))}
                    >양면</button>
                  )}
                </div>
              </div>
            )}
          </div>

          {!cfg.pagesHidden && (
            <div className="pv-inner-section">
              <p className="pv-sub-label">페이지 수</p>
              <div className="pv-pages-row">
                <button disabled={cfg.pagesLocked} className="pv-pages-btn"
                  onClick={() => !cfg.pagesLocked && setCustomer(prev => ({ ...prev, pages: Math.max(cfg.min, prev.pages - cfg.step) }))}
                >−</button>
                <div className="pv-pages-val">
                  <span className="pv-pages-num">{customer.pages}</span>
                  <span className="pv-pages-unit">p</span>
                </div>
                <button disabled={cfg.pagesLocked} className="pv-pages-btn"
                  onClick={() => !cfg.pagesLocked && setCustomer(prev => ({ ...prev, pages: Math.min(cfg.max, prev.pages + cfg.step) }))}
                >+</button>
                <span className="pv-pages-range">{cfg.min}~{cfg.max}p</span>
              </div>
              {block.type === 'inner_layer_saddle' && (
                <p className="pv-pages-note">내지: {Math.max(0, customer.pages - 4)}p (표지 4p 제외)</p>
              )}
            </div>
          )}
        </div>
      );

    case 'quantity':
      return (
        <div className="pv-block">
          <p className="pv-block-label">수량</p>
          <div className="pv-qty-table-wrap">
            <table className="pv-qty-table">
              <thead>
                <tr>
                  <th>수량</th>
                  <th>단가</th>
                  <th>총 가격</th>
                </tr>
              </thead>
              <tbody>
                {cfg.options?.map((q) => {
                  let p = { unitPrice: 0, total: 0 };
                  try { p = calculatePrice(customer, q, productType) || p; } catch (e) { /* pricing data not loaded */ }
                  const unitPrice = p.unitPrice || p.perUnit || 0;
                  const total = p.total || 0;
                  const isSelected = customer.qty === q;
                  return (
                    <tr
                      key={q}
                      className={isSelected ? 'selected' : ''}
                      onClick={() => setCustomer(prev => ({ ...prev, qty: q }))}
                    >
                      <td>{q}부</td>
                      <td className="unit-price">1부당 {unitPrice.toLocaleString()}원</td>
                      <td>{total.toLocaleString()}원</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );

    default:
      return null;
  }
}
