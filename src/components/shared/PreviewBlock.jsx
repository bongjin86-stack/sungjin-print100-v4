/**
 * PreviewBlock.jsx - 공유 컴포넌트
 *
 * 블록 타입별 옵션 UI 렌더링 (고객용 + 빌더 미리보기 공용)
 *
 * 사용처:
 * - ProductView.jsx (고객용 상품 페이지)
 * - ProductBuilder/index.jsx (관리자 빌더 미리보기)
 *
 * 스타일: ProductView.css의 pv-* 클래스 사용
 */

import { DB, TEMPLATES } from '@/lib/builderData';
import { formatBusinessDate, getBusinessDate } from '@/lib/businessDays';
import { validateCoatingWeight } from '@/lib/priceEngine';

export function PreviewBlock({ block, customer, setCustomer, calculatePrice, linkStatus, handleFoldSelect, productType, dbPapers = {}, dbPapersList = [], allBlocks = [], thicknessError = false }) {
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
          <div className="pv-btn-row">
            {cfg.color && (
              <button
                disabled={isDisabled}
                className={`pv-btn flex-1 ${customer[colorKey] === 'color' ? 'active' : ''}`}
                onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, [colorKey]: 'color' }))}
              >컬러</button>
            )}
            {cfg.mono && (
              <button
                disabled={isDisabled}
                className={`pv-btn flex-1 ${customer[colorKey] === 'mono' ? 'active' : ''}`}
                onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, [colorKey]: 'mono' }))}
              >흑백</button>
            )}
            {cfg.single && (
              <button
                disabled={isDisabled}
                className={`pv-btn flex-1 ${customer[sideKey] === 'single' ? 'active' : ''}`}
                onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, [sideKey]: 'single' }))}
              >단면</button>
            )}
            {cfg.double && (
              <button
                disabled={isDisabled}
                className={`pv-btn flex-1 ${customer[sideKey] === 'double' ? 'active' : ''}`}
                onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, [sideKey]: 'double' }))}
              >양면</button>
            )}
          </div>
        </div>
      );
    }

    case 'finishing': {
      // 코팅 관련 로직
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
        <div className="pv-block">
          <p className="pv-block-label">{block.label}</p>
          <div className="pv-finishing-list">
            {/* 코팅 */}
            {cfg.coating?.enabled && (
              <div className={`pv-finishing-row ${customer.finishing?.coating ? 'expanded' : ''} ${isCoatingDisabled ? 'disabled' : ''}`}>
                <div
                  className="pv-finishing-toggle"
                  onClick={() => !isCoatingDisabled && setCustomer(prev => ({
                    ...prev,
                    finishing: {
                      ...prev.finishing,
                      coating: !prev.finishing?.coating,
                      coatingType: !prev.finishing?.coating ? (prev.finishing?.coatingType || 'matte') : null,
                      coatingSide: !prev.finishing?.coating ? (prev.finishing?.coatingSide || 'single') : null
                    }
                  }))}
                >
                  <span className="pv-finishing-name">코팅</span>
                  <span className="pv-finishing-icon" aria-hidden="true" />
                </div>
                {customer.finishing?.coating && (
                  <div className="pv-finishing-options">
                    <div className="pv-opt-group">
                      {(cfg.coating?.matte ?? true) && (
                        <button className={`pv-opt-btn ${customer.finishing?.coatingType === 'matte' ? 'active' : ''}`}
                          onClick={() => setCustomer(prev => ({ ...prev, finishing: { ...prev.finishing, coatingType: 'matte' } }))}
                        >무광</button>
                      )}
                      {(cfg.coating?.gloss ?? true) && (
                        <button className={`pv-opt-btn ${customer.finishing?.coatingType === 'gloss' ? 'active' : ''}`}
                          onClick={() => setCustomer(prev => ({ ...prev, finishing: { ...prev.finishing, coatingType: 'gloss' } }))}
                        >유광</button>
                      )}
                    </div>
                    <span className="pv-opt-divider">|</span>
                    <div className="pv-opt-group">
                      {(cfg.coating?.single ?? true) && (
                        <button className={`pv-opt-btn ${customer.finishing?.coatingSide === 'single' ? 'active' : ''}`}
                          onClick={() => setCustomer(prev => ({ ...prev, finishing: { ...prev.finishing, coatingSide: 'single' } }))}
                        >단면</button>
                      )}
                      {(cfg.coating?.double ?? true) && (
                        <button className={`pv-opt-btn ${customer.finishing?.coatingSide === 'double' ? 'active' : ''}`}
                          onClick={() => setCustomer(prev => ({ ...prev, finishing: { ...prev.finishing, coatingSide: 'double' } }))}
                        >양면</button>
                      )}
                    </div>
                  </div>
                )}
                {isCoatingDisabled && <span className="pv-finishing-hint">{coatingValidation.message}</span>}
              </div>
            )}

            {/* 오시 */}
            {cfg.osi?.enabled && (
              <div className={`pv-finishing-row ${customer.finishing?.osiEnabled ? 'expanded' : ''}`}>
                <div
                  className="pv-finishing-toggle"
                  onClick={() => setCustomer(prev => ({
                    ...prev,
                    finishing: { ...prev.finishing, osiEnabled: !prev.finishing?.osiEnabled, osi: !prev.finishing?.osiEnabled ? (prev.finishing?.osi || 1) : null }
                  }))}
                >
                  <span className="pv-finishing-name">오시</span>
                  <span className="pv-finishing-icon" aria-hidden="true" />
                </div>
                {customer.finishing?.osiEnabled && (
                  <div className="pv-finishing-options">
                    <div className="pv-opt-group">
                      {[1, 2, 3].map(n => (
                        <button key={n}
                          className={`pv-opt-btn ${customer.finishing?.osi === n ? 'active' : ''}`}
                          onClick={() => setCustomer(prev => ({ ...prev, finishing: { ...prev.finishing, osi: n } }))}
                        >{n}줄</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 접지 */}
            {cfg.fold?.enabled && (
              <div className={`pv-finishing-row ${customer.finishing?.foldEnabled ? 'expanded' : ''}`}>
                <div
                  className="pv-finishing-toggle"
                  onClick={() => {
                    if (!customer.finishing?.foldEnabled) {
                      handleFoldSelect(customer.finishing?.fold || 2, cfg);
                    } else {
                      setCustomer(prev => ({ ...prev, finishing: { ...prev.finishing, foldEnabled: false, fold: null, osiEnabled: false, osi: null } }));
                    }
                  }}
                >
                  <span className="pv-finishing-name">접지</span>
                  <span className="pv-finishing-icon" aria-hidden="true" />
                </div>
                {customer.finishing?.foldEnabled && (
                  <div className="pv-finishing-options">
                    <div className="pv-opt-group">
                      {[2, 3, 4].map(n => (
                        <button key={n}
                          className={`pv-opt-btn ${customer.finishing?.fold === n ? 'active' : ''}`}
                          onClick={() => handleFoldSelect(n, cfg)}
                        >{n}단</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 귀도리 */}
            {cfg.corner && (
              <div className={`pv-finishing-row ${customer.finishing?.corner ? 'expanded' : ''}`}>
                <div
                  className="pv-finishing-toggle"
                  onClick={() => setCustomer(prev => ({ ...prev, finishing: { ...prev.finishing, corner: !prev.finishing?.corner } }))}
                >
                  <span className="pv-finishing-name">귀도리</span>
                  <span className="pv-finishing-icon" aria-hidden="true" />
                </div>
              </div>
            )}

            {/* 타공 */}
            {cfg.punch && (
              <div className={`pv-finishing-row ${customer.finishing?.punch ? 'expanded' : ''}`}>
                <div
                  className="pv-finishing-toggle"
                  onClick={() => setCustomer(prev => ({ ...prev, finishing: { ...prev.finishing, punch: !prev.finishing?.punch } }))}
                >
                  <span className="pv-finishing-name">타공</span>
                  <span className="pv-finishing-icon" aria-hidden="true" />
                </div>
              </div>
            )}

            {/* 미싱 */}
            {cfg.mising && (
              <div className={`pv-finishing-row ${customer.finishing?.mising ? 'expanded' : ''}`}>
                <div
                  className="pv-finishing-toggle"
                  onClick={() => setCustomer(prev => ({ ...prev, finishing: { ...prev.finishing, mising: !prev.finishing?.mising } }))}
                >
                  <span className="pv-finishing-name">미싱</span>
                  <span className="pv-finishing-icon" aria-hidden="true" />
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

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
      // 옵션이 없으면 TEMPLATES.spring에서 기본값 가져오기
      const defaultSpringCfg = TEMPLATES.spring?.blocks?.find(b => b.type === 'spring_options')?.config || {};
      const ppOptions = cfg.pp?.options?.length > 0 ? cfg.pp.options : defaultSpringCfg.pp?.options || [];
      const coverPrintOptions = cfg.coverPrint?.options?.length > 0 ? cfg.coverPrint.options : defaultSpringCfg.coverPrint?.options || [];
      const backOptions = cfg.back?.options?.length > 0 ? cfg.back.options : defaultSpringCfg.back?.options || [];
      const springColorOptions = cfg.springColor?.options?.length > 0 ? cfg.springColor.options : defaultSpringCfg.springColor?.options || [];
      const coverPrintPapers = cfg.coverPrint?.papers || defaultSpringCfg.coverPrint?.papers || {};

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

            {ppOptions.length > 0 && (
              <div className="pv-spring-row">
                <span className="pv-spring-label">PP</span>
                <div className="pv-radio-group">
                  {ppOptions.filter(o => o.enabled !== false).map(opt => (
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
            )}

            <div className="pv-spring-selects">
              {coverPrintOptions.length > 0 && (
                <div>
                  <label className="pv-select-label">표지인쇄</label>
                  <select
                    value={customer.coverPrint || ''}
                    disabled={isDisabled}
                    onChange={(e) => !isDisabled && setCustomer(prev => ({ ...prev, coverPrint: e.target.value }))}
                    className="pv-select"
                  >
                    {coverPrintOptions.filter(o => o.enabled !== false).map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}
              {backOptions.length > 0 && (
                <div className={isBackDisabled ? 'opacity-50' : ''}>
                  <label className="pv-select-label">
                    뒷판 {isBackDisabled && <span>(자동)</span>}
                  </label>
                  <select
                    value={customer.back || ''}
                    disabled={isDisabled || isBackDisabled}
                    onChange={(e) => !isDisabled && !isBackDisabled && setCustomer(prev => ({ ...prev, back: e.target.value }))}
                    className="pv-select"
                  >
                    {backOptions.filter(o => o.enabled !== false).map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}
              {springColorOptions.length > 0 && (
                <div>
                  <label className="pv-select-label">스프링색상</label>
                  <select
                    value={customer.springColor || ''}
                    disabled={isDisabled}
                    onChange={(e) => !isDisabled && setCustomer(prev => ({ ...prev, springColor: e.target.value }))}
                    className="pv-select"
                  >
                    {springColorOptions.filter(o => o.enabled !== false).map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {customer.coverPrint !== 'none' && Object.keys(coverPrintPapers).length > 0 && (
              <div className="pv-sub-section">
                <p className="pv-sub-label">표지 용지 선택</p>
                <div className="pv-btn-row" style={{ flexWrap: 'wrap' }}>
                  {Object.entries(coverPrintPapers).map(([code, weights]) => {
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
      // 고정 옵션 4개 (ID와 days 매핑)
      const FIXED_OPTIONS = [
        { id: 'same', label: '당일', days: 0, defaultPercent: 30 },
        { id: 'next1', label: '1영업일', days: 1, defaultPercent: 15 },
        { id: 'next2', label: '2영업일', days: 2, defaultPercent: 0 },
        { id: 'next3', label: '3영업일', days: 3, defaultPercent: -5 },
      ];

      // cfg.options에서 설정 가져오기 (고정 ID만)
      const getOptionConfig = (id) => cfg.options?.find(o => o.id === id);

      // 고정 4개 옵션 기반으로 활성화된 것만 필터
      const activeOptions = FIXED_OPTIONS
        .map(fixed => {
          const cfgOpt = getOptionConfig(fixed.id);
          return {
            id: fixed.id,
            label: fixed.label,
            days: fixed.days,
            enabled: cfgOpt?.enabled ?? (fixed.id !== 'same'), // 당일은 기본 비활성화
            percent: cfgOpt?.percent ?? fixed.defaultPercent,
          };
        })
        .filter(opt => opt.enabled);

      // 당일 선택 여부
      const isSameDaySelected = customer.delivery === 'same';

      return (
        <div className="pv-block">
          <p className="pv-block-label">출고일</p>
          <div className="pv-delivery-row">
            {activeOptions.map(opt => {
              const date = getBusinessDate(opt.days);
              const dateStr = formatBusinessDate(date);

              return (
                <button
                  key={opt.id}
                  className={`pv-delivery-btn ${customer.delivery === opt.id ? 'active' : ''}`}
                  onClick={() => setCustomer(prev => ({
                    ...prev,
                    delivery: opt.id,
                    deliveryDays: opt.days,
                    deliveryPercent: opt.percent,
                    deliveryDate: dateStr
                  }))}
                >
                  <p className="pv-delivery-date">{dateStr}</p>
                  <p className={`pv-delivery-percent ${opt.percent > 0 ? 'up' : opt.percent < 0 ? 'down' : ''}`}>
                    {opt.percent > 0 ? `+${opt.percent}%` : opt.percent < 0 ? `${opt.percent}%` : '기준가'}
                  </p>
                </button>
              );
            })}
          </div>
          {/* 당일 선택 시 경고 메시지 */}
          {isSameDaySelected && (
            <p className="pv-delivery-warning">
              ⚠️ 당일 제작은 반드시 고객센터로 문의 후 주문해주세요.
            </p>
          )}
        </div>
      );
    }

    case 'pages_saddle':
    case 'pages_leaf':
    case 'pages': {
      // 페이지 입력값 검증 (최소값, step 배수)
      const validatePages = (value) => {
        let pages = parseInt(value) || cfg.min;
        pages = Math.max(cfg.min, pages);
        // step 배수로 맞춤
        const remainder = (pages - cfg.min) % cfg.step;
        if (remainder !== 0) {
          pages = pages - remainder + cfg.step;
        }
        return pages;
      };
      return (
        <div className={`pv-block ${thicknessError ? 'pv-block-error' : ''}`}>
          <p className="pv-block-label">페이지 수</p>
          <div className={`pv-pages-row ${thicknessError ? 'pv-pages-error' : ''}`}>
            <button
              disabled={isDisabled}
              className="pv-pages-btn"
              onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, pages: Math.max(cfg.min, prev.pages - cfg.step) }))}
            >−</button>
            <div className="pv-pages-val">
              <input
                type="number"
                disabled={isDisabled}
                className={`pv-pages-input ${thicknessError ? 'pv-pages-input-error' : ''}`}
                value={customer.pages}
                min={cfg.min}
                step={cfg.step}
                onChange={(e) => !isDisabled && setCustomer(prev => ({ ...prev, pages: parseInt(e.target.value) || cfg.min }))}
                onBlur={(e) => !isDisabled && setCustomer(prev => ({ ...prev, pages: validatePages(e.target.value) }))}
              />
              <span className={`pv-pages-unit ${thicknessError ? 'pv-pages-unit-error' : ''}`}>p</span>
            </div>
            <button
              disabled={isDisabled}
              className="pv-pages-btn"
              onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, pages: prev.pages + cfg.step }))}
            >+</button>
          </div>
        </div>
      );
    }

    case 'inner_layer_saddle':
    case 'inner_layer_leaf': {
      // 페이지 입력값 검증 (최소값, step 배수)
      const validateInnerPages = (value) => {
        const minPages = cfg.min || 4;
        const stepPages = cfg.step || 2;
        let pages = parseInt(value) || minPages;
        pages = Math.max(minPages, pages);
        const remainder = (pages - minPages) % stepPages;
        if (remainder !== 0) {
          pages = pages - remainder + stepPages;
        }
        return pages;
      };

      return (
        <div className={`pv-block ${thicknessError ? 'pv-block-error' : ''}`}>
          <p className="pv-block-label">{block.label}</p>

          {/* 내지 용지 - paper 블록과 동일한 스타일 */}
          {!cfg.paperHidden && (
            <div className="pv-paper-list">
              {Object.entries(cfg.papers || {}).map(([code, weights]) => {
                const paper = dbPapersList.find(p => p.code === code) || DB.papers.find(p => p.code === code);
                if (!paper || !weights.length) return null;
                const isSelected = customer.innerPaper === code;
                return (
                  <div
                    key={code}
                    className={`pv-paper-item ${isSelected ? 'active' : ''} ${cfg.paperLocked ? 'disabled' : ''}`}
                    onClick={() => !cfg.paperLocked && setCustomer(prev => ({ ...prev, innerPaper: code, innerWeight: weights[0] }))}
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
                          disabled={cfg.paperLocked}
                          className={`pv-weight-btn ${isSelected && customer.innerWeight === w ? 'active' : ''}`}
                          onClick={(e) => { e.stopPropagation(); !cfg.paperLocked && setCustomer(prev => ({ ...prev, innerPaper: code, innerWeight: w })); }}
                        >
                          {w}g
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 인쇄 옵션 - 라벨 없이 버튼만 표시, 개수에 따라 자동 조절 */}
          <div className="pv-btn-row" style={{ marginTop: '0.75rem' }}>
            {!cfg.printColorHidden && cfg.color && (
              <button disabled={cfg.printColorLocked}
                className={`pv-btn flex-1 ${customer.innerColor === 'color' ? 'active' : ''}`}
                onClick={() => !cfg.printColorLocked && setCustomer(prev => ({ ...prev, innerColor: 'color' }))}
              >컬러</button>
            )}
            {!cfg.printColorHidden && cfg.mono && (
              <button disabled={cfg.printColorLocked}
                className={`pv-btn flex-1 ${customer.innerColor === 'mono' ? 'active' : ''}`}
                onClick={() => !cfg.printColorLocked && setCustomer(prev => ({ ...prev, innerColor: 'mono' }))}
              >흑백</button>
            )}
            {!cfg.printSideHidden && cfg.single && (
              <button disabled={cfg.printSideLocked}
                className={`pv-btn flex-1 ${customer.innerSide === 'single' ? 'active' : ''}`}
                onClick={() => !cfg.printSideLocked && setCustomer(prev => ({ ...prev, innerSide: 'single' }))}
              >단면</button>
            )}
            {!cfg.printSideHidden && cfg.double && (
              <button disabled={cfg.printSideLocked}
                className={`pv-btn flex-1 ${customer.innerSide === 'double' ? 'active' : ''}`}
                onClick={() => !cfg.printSideLocked && setCustomer(prev => ({ ...prev, innerSide: 'double' }))}
              >양면</button>
            )}
          </div>

          {/* 페이지 수 - pages 블록과 동일한 스타일 (입력 필드 포함) */}
          {!cfg.pagesHidden && (
            <div className={`pv-pages-row ${thicknessError ? 'pv-pages-error' : ''}`} style={{ marginTop: '0.75rem' }}>
              <button
                disabled={cfg.pagesLocked}
                className="pv-pages-btn"
                onClick={() => !cfg.pagesLocked && setCustomer(prev => ({ ...prev, pages: Math.max(cfg.min || 4, prev.pages - (cfg.step || 2)) }))}
              >−</button>
              <div className="pv-pages-val">
                <input
                  type="number"
                  disabled={cfg.pagesLocked}
                  className={`pv-pages-input ${thicknessError ? 'pv-pages-input-error' : ''}`}
                  value={customer.pages || cfg.defaultPages || cfg.min}
                  min={cfg.min || 4}
                  step={cfg.step || 2}
                  onChange={(e) => !cfg.pagesLocked && setCustomer(prev => ({ ...prev, pages: parseInt(e.target.value) || cfg.min || 4 }))}
                  onBlur={(e) => !cfg.pagesLocked && setCustomer(prev => ({ ...prev, pages: validateInnerPages(e.target.value) }))}
                />
                <span className={`pv-pages-unit ${thicknessError ? 'pv-pages-unit-error' : ''}`}>p</span>
              </div>
              <button
                disabled={cfg.pagesLocked}
                className="pv-pages-btn"
                onClick={() => !cfg.pagesLocked && setCustomer(prev => ({ ...prev, pages: (customer.pages || cfg.defaultPages || cfg.min || 4) + (cfg.step || 2) }))}
              >+</button>
            </div>
          )}
        </div>
      );
    }

    case 'quantity':
      return (
        <div className="pv-block">
          <p className="pv-block-label">{block.label || '수량'}</p>
          <div className="pv-qty-table-wrap">
            <table className="pv-qty-table">
              <thead>
                <tr>
                  <th>부수</th>
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

export default PreviewBlock;
