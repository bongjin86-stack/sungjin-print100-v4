/**
 * PreviewBlock.jsx
 *
 * AdminBuilder 전용 - 고객 화면 미리보기 블록
 *
 * 기능:
 * - 각 블록 타입별 고객 UI 렌더링
 * - 옵션 선택 (버튼, 드롭다운)
 * - 18개 이상의 블록 타입 지원
 *
 * 주의:
 * - 새 블록 타입 추가 시 switch case 추가 필요
 * - BlockSettings.jsx도 함께 수정 필요
 */

import { DB } from '@/lib/builderData';
import { formatBusinessDate,getBusinessDate } from '@/lib/businessDays';
import { validateCoatingWeight } from '@/lib/priceEngine';

export function PreviewBlock({ block, customer, setCustomer, calculatePrice, linkStatus, handleFoldSelect, productType, dbPapers = {}, dbPapersList = [], allBlocks = [] }) {
  const cfg = block.config;
  const isDisabled = block.locked;

  // 뒷판 비활성화 체크
  if (block.type === 'back' && linkStatus?.backDisabled) {
    return (
      <div className="mb-4 opacity-50">
        <p className="text-sm font-medium text-gray-400 mb-2">{block.label} <span className="text-xs">(앞뒤표지 선택으로 비활성화)</span></p>
        <div className="p-3 border rounded-xl border-gray-200 bg-white">
          <p className="text-xs text-gray-400">앞뒤표지 인쇄 선택 시 뒷판이 필요하지 않습니다.</p>
        </div>
      </div>
    );
  }

  switch (block.type) {
    case 'size':
      return (
        <div className="py-4 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900 mb-3">{block.label}</p>
          <div className="flex gap-2">
            {cfg.options?.map(s => (
              <button
                key={s}
                disabled={isDisabled}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm transition-all border-[1.5px] ${
                  customer.size === s
                    ? 'bg-white border-[#0071E3] text-[#1D1D1F] font-medium shadow-[0_0_0_1px_#0071E3]'
                    : 'bg-white border-[#D2D2D7] text-[#1D1D1F] hover:border-[#86868B]'
                } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, size: s }))}
              >
                {DB.sizeMultipliers[s]?.name || s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      );

    case 'paper':
      // 블록 label 기준으로 필드명 결정 (블록별 독립 저장)
      const isCoverPaper = block.label.includes('표지');
      const isInnerPaper = block.label.includes('내지');
      const paperField = isCoverPaper ? 'coverPaper' : isInnerPaper ? 'innerPaper' : 'paper';
      const weightField = isCoverPaper ? 'coverWeight' : isInnerPaper ? 'innerWeight' : 'weight';

      return (
        <div className="py-4 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900 mb-3">{block.label}</p>
          <div className="space-y-2">
            {Object.entries(cfg.papers || {}).map(([code, weights]) => {
              const paper = dbPapersList.find(p => p.code === code) || DB.papers.find(p => p.code === code);
              if (!paper || !weights.length) return null;
              const isSelected = customer[paperField] === code;
              return (
                <div
                  key={code}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border-[1.5px] ${
                    isSelected ? 'bg-white border-[#0071E3] shadow-[0_0_0_1px_#0071E3]' : 'bg-white border-[#D2D2D7] hover:border-[#86868B]'
                  } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, [paperField]: code, [weightField]: weights[0] }))}
                >
                  {/* 용지 이미지 */}
                  <div className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden">
                    {dbPapers[code]?.image_url ? (
                      <img src={dbPapers[code].image_url} alt={dbPapers[code]?.name || paper.name} className="w-full h-full object-cover" />
                    ) : (
                      <div
                        className="w-full h-full"
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
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${isSelected ? 'font-medium text-gray-900' : 'text-gray-700'}`}>{dbPapers[code]?.name || paper.name}</p>
                    <p className="text-xs text-gray-400 truncate">{dbPapers[code]?.desc || paper.desc}</p>
                  </div>
                  <div className="flex gap-1">
                    {weights.map(w => (
                      <button
                        key={w}
                        disabled={isDisabled}
                        className={`px-2.5 py-1 text-xs rounded-lg transition-all border-[1.5px] ${
                          isSelected && customer[weightField] === w
                            ? 'bg-white border-[#0071E3] text-[#1D1D1F] font-medium shadow-[0_0_0_1px_#0071E3]'
                            : 'bg-white border-[#D2D2D7] text-[#1D1D1F] hover:border-[#86868B]'
                        }`}
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

    case 'pp':
      return (
        <div className="py-4 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900 mb-3">{block.label}</p>
          <div className="flex gap-2">
            {cfg.options?.map(o => (
              <button
                key={o}
                disabled={isDisabled}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm transition-all border-[1.5px] ${
                  customer.pp === o
                    ? 'bg-white border-[#0071E3] text-[#1D1D1F] font-medium shadow-[0_0_0_1px_#0071E3]'
                    : 'bg-white border-[#D2D2D7] text-[#1D1D1F] hover:border-[#86868B]'
                }`}
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
        <div className="py-4 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900 mb-3">{block.label}</p>
          <div className="flex gap-2 mb-3">
            {cfg.options?.map(o => (
              <button
                key={o}
                disabled={isDisabled}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm transition-all border-[1.5px] ${
                  customer.coverPrint === o
                    ? 'bg-white border-[#0071E3] text-[#1D1D1F] font-medium shadow-[0_0_0_1px_#0071E3]'
                    : 'bg-white border-[#D2D2D7] text-[#1D1D1F] hover:border-[#86868B]'
                }`}
                onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, coverPrint: o }))}
              >
                {o === 'none' ? '없음' : o === 'front_only' ? '앞표지만' : '앞뒤표지'}
              </button>
            ))}
          </div>

          {/* 표지인쇄 선택 시 용지 선택 표시 */}
          {customer.coverPrint !== 'none' && cfg.papers && (
            <div className="pt-3 mt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">표지 용지</p>
              <div className="space-y-2">
                {Object.entries(cfg.papers).map(([code, weights]) => {
                  const paper = dbPapersList.find(p => p.code === code) || DB.papers.find(p => p.code === code);
                  if (!paper || !weights.length) return null;
                  const isSelected = customer.coverPaper === code;
                  return (
                    <div
                      key={code}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer border-[1.5px] transition-all ${
                        isSelected ? 'bg-white border-[#0071E3] shadow-[0_0_0_1px_#0071E3]' : 'bg-white border-[#D2D2D7] hover:border-[#86868B]'
                      }`}
                      onClick={() => setCustomer(prev => ({ ...prev, coverPaper: code, coverWeight: weights[0] }))}
                    >
                      <span className={`text-sm ${isSelected ? 'font-medium' : ''}`}>{paper.name}</span>
                      <div className="flex gap-1">
                        {weights.map(w => (
                          <button
                            key={w}
                            className={`px-2.5 py-1 text-xs rounded-lg transition-all border-[1.5px] ${
                              isSelected && customer.coverWeight === w
                                ? 'bg-white border-[#0071E3] text-[#1D1D1F] font-medium shadow-[0_0_0_1px_#0071E3]'
                                : 'bg-white border-[#D2D2D7] text-[#1D1D1F] hover:border-[#86868B]'
                            }`}
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

    case 'print':
      return (
        <div className="py-4 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900 mb-3">{block.label}</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-2">컬러</p>
              <div className="flex gap-2">
                {cfg.color && (
                  <button
                    disabled={isDisabled}
                    className={`flex-1 py-2.5 rounded-xl text-sm transition-all border-[1.5px] ${
                      customer.color === 'color'
                        ? 'bg-white border-[#0071E3] text-[#1D1D1F] font-medium shadow-[0_0_0_1px_#0071E3]'
                        : 'bg-white border-[#D2D2D7] text-[#1D1D1F] hover:border-[#86868B]'
                    }`}
                    onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, color: 'color' }))}
                  >
                    컬러
                  </button>
                )}
                {cfg.mono && (
                  <button
                    disabled={isDisabled}
                    className={`flex-1 py-2.5 rounded-xl text-sm transition-all border-[1.5px] ${
                      customer.color === 'mono'
                        ? 'bg-white border-[#0071E3] text-[#1D1D1F] font-medium shadow-[0_0_0_1px_#0071E3]'
                        : 'bg-white border-[#D2D2D7] text-[#1D1D1F] hover:border-[#86868B]'
                    }`}
                    onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, color: 'mono' }))}
                  >
                    흑백
                  </button>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">인쇄면</p>
              <div className="flex gap-2">
                {cfg.single && (
                  <button
                    disabled={isDisabled}
                    className={`flex-1 py-2.5 rounded-xl text-sm transition-all border-[1.5px] ${
                      customer.side === 'single'
                        ? 'bg-white border-[#0071E3] text-[#1D1D1F] font-medium shadow-[0_0_0_1px_#0071E3]'
                        : 'bg-white border-[#D2D2D7] text-[#1D1D1F] hover:border-[#86868B]'
                    }`}
                    onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, side: 'single' }))}
                  >
                    단면
                  </button>
                )}
                {cfg.double && (
                  <button
                    disabled={isDisabled}
                    className={`flex-1 py-2.5 rounded-xl text-sm transition-all border-[1.5px] ${
                      customer.side === 'double'
                        ? 'bg-white border-[#0071E3] text-[#1D1D1F] font-medium shadow-[0_0_0_1px_#0071E3]'
                        : 'bg-white border-[#D2D2D7] text-[#1D1D1F] hover:border-[#86868B]'
                    }`}
                    onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, side: 'double' }))}
                  >
                    양면
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      );


    case 'finishing':
      return (
        <div className="py-4 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900 mb-3">{block.label}</p>
          <div className="space-y-3">
            {/* 후가공 옵션 체크박스 */}
            <div className="flex gap-2 flex-wrap">
              {cfg.coating?.enabled && (() => {
                // 코팅 대상 용지 평량 결정
                let currentWeight = 80;
                if (cfg.coating?.linkedPaper) {
                  // 연동된 용지 블록에서 평량 가져오기
                  const linkedBlock = allBlocks?.find(b => b.id === cfg.coating.linkedPaper);
                  if (linkedBlock) {
                    // 블록 라벨로 어떤 weight 필드인지 결정
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
                  // 자동: 표지 > 메인 > 내지 순으로 체크
                  currentWeight = customer.coverWeight || customer.weight || customer.innerWeight || 80;
                }
                const coatingValidation = validateCoatingWeight(currentWeight);
                const isCoatingDisabled = !coatingValidation.valid;

                return (
                  <div className="relative group">
                    <button
                      disabled={isCoatingDisabled}
                      className={`px-4 py-2 rounded-xl text-sm transition-all border-[1.5px] ${
                        isCoatingDisabled
                          ? 'bg-[#F5F5F7] text-[#AEAEB2] border-[#D2D2D7] cursor-not-allowed'
                          : customer.finishing?.coating
                            ? 'bg-white border-[#0071E3] text-[#1D1D1F] font-medium shadow-[0_0_0_1px_#0071E3]'
                            : 'bg-white border-[#D2D2D7] text-[#1D1D1F] hover:border-[#86868B]'
                      }`}
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
                      코팅
                    </button>
                    {isCoatingDisabled && (
                      <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block z-10">
                        <div className="bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                          {coatingValidation.message}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
              {cfg.osi?.enabled && (
                <button
                  className={`px-4 py-2 rounded-xl text-sm transition-all border-[1.5px] ${
                    customer.finishing?.osiEnabled
                      ? 'bg-white border-[#0071E3] text-[#1D1D1F] font-medium shadow-[0_0_0_1px_#0071E3]'
                      : 'bg-white border-[#D2D2D7] text-[#1D1D1F] hover:border-[#86868B]'
                  }`}
                  onClick={() => setCustomer(prev => ({
                    ...prev,
                    finishing: {
                      ...prev.finishing,
                      osiEnabled: !prev.finishing?.osiEnabled,
                      osi: !prev.finishing?.osiEnabled ? (prev.finishing?.osi || 1) : null
                    }
                  }))}
                >
                  오시
                </button>
              )}
              {cfg.fold?.enabled && (
                <button
                  className={`px-4 py-2 rounded-xl text-sm transition-all border-[1.5px] ${
                    customer.finishing?.foldEnabled
                      ? 'bg-white border-[#0071E3] text-[#1D1D1F] font-medium shadow-[0_0_0_1px_#0071E3]'
                      : 'bg-white border-[#D2D2D7] text-[#1D1D1F] hover:border-[#86868B]'
                  }`}
                  onClick={() => {
                    if (!customer.finishing?.foldEnabled) {
                      handleFoldSelect(customer.finishing?.fold || 2, cfg);
                    } else {
                      setCustomer(prev => ({
                        ...prev,
                        finishing: { ...prev.finishing, foldEnabled: false, fold: null }
                      }));
                    }
                  }}
                >
                  접지
                </button>
              )}
              {cfg.corner && (
                <button
                  className={`px-4 py-2 rounded-xl text-sm transition-all border-[1.5px] ${
                    customer.finishing?.corner
                      ? 'bg-white border-[#0071E3] text-[#1D1D1F] font-medium shadow-[0_0_0_1px_#0071E3]'
                      : 'bg-white border-[#D2D2D7] text-[#1D1D1F] hover:border-[#86868B]'
                  }`}
                  onClick={() => setCustomer(prev => ({ ...prev, finishing: { ...prev.finishing, corner: !prev.finishing?.corner } }))}
                >
                  귀도리
                </button>
              )}
              {cfg.punch && (
                <button
                  className={`px-4 py-2 rounded-xl text-sm transition-all border-[1.5px] ${
                    customer.finishing?.punch
                      ? 'bg-white border-[#0071E3] text-[#1D1D1F] font-medium shadow-[0_0_0_1px_#0071E3]'
                      : 'bg-white border-[#D2D2D7] text-[#1D1D1F] hover:border-[#86868B]'
                  }`}
                  onClick={() => setCustomer(prev => ({ ...prev, finishing: { ...prev.finishing, punch: !prev.finishing?.punch } }))}
                >
                  타공
                </button>
              )}
              {cfg.mising && (
                <button
                  className={`px-4 py-2 rounded-xl text-sm transition-all border-[1.5px] ${
                    customer.finishing?.mising
                      ? 'bg-white border-[#0071E3] text-[#1D1D1F] font-medium shadow-[0_0_0_1px_#0071E3]'
                      : 'bg-white border-[#D2D2D7] text-[#1D1D1F] hover:border-[#86868B]'
                  }`}
                  onClick={() => setCustomer(prev => ({ ...prev, finishing: { ...prev.finishing, mising: !prev.finishing?.mising } }))}
                >
                  미싱
                </button>
              )}
            </div>

            {/* 코팅 하위 옵션 */}
            {customer.finishing?.coating && cfg.coating?.enabled && (
              <div className="pl-4 pt-3 border-l-2 border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="flex gap-2">
                    {(cfg.coating?.matte ?? true) && (
                      <button
                        className={`px-3 py-1.5 rounded-lg text-sm transition-all border-[1.5px] ${
                          customer.finishing?.coatingType === 'matte'
                            ? 'bg-white border-[#0071E3] text-[#1D1D1F] font-medium shadow-[0_0_0_1px_#0071E3]'
                            : 'bg-white border-[#D2D2D7] text-[#1D1D1F] hover:border-[#86868B]'
                        }`}
                        onClick={() => setCustomer(prev => ({ ...prev, finishing: { ...prev.finishing, coatingType: 'matte' } }))}
                      >
                        무광
                      </button>
                    )}
                    {(cfg.coating?.gloss ?? true) && (
                      <button
                        className={`px-3 py-1.5 rounded-lg text-sm transition-all border-[1.5px] ${
                          customer.finishing?.coatingType === 'gloss'
                            ? 'bg-white border-[#0071E3] text-[#1D1D1F] font-medium shadow-[0_0_0_1px_#0071E3]'
                            : 'bg-white border-[#D2D2D7] text-[#1D1D1F] hover:border-[#86868B]'
                        }`}
                        onClick={() => setCustomer(prev => ({ ...prev, finishing: { ...prev.finishing, coatingType: 'gloss' } }))}
                      >
                        유광
                      </button>
                    )}
                  </div>
                  <span className="text-gray-300">|</span>
                  <div className="flex gap-2">
                    {(cfg.coating?.single ?? true) && (
                      <button
                        className={`px-3 py-1.5 rounded-lg text-sm transition-all border-[1.5px] ${
                          customer.finishing?.coatingSide === 'single'
                            ? 'bg-white border-[#0071E3] text-[#1D1D1F] font-medium shadow-[0_0_0_1px_#0071E3]'
                            : 'bg-white border-[#D2D2D7] text-[#1D1D1F] hover:border-[#86868B]'
                        }`}
                        onClick={() => setCustomer(prev => ({ ...prev, finishing: { ...prev.finishing, coatingSide: 'single' } }))}
                      >
                        단면
                      </button>
                    )}
                    {(cfg.coating?.double ?? true) && (
                      <button
                        className={`px-3 py-1.5 rounded-lg text-sm transition-all border-[1.5px] ${
                          customer.finishing?.coatingSide === 'double'
                            ? 'bg-white border-[#0071E3] text-[#1D1D1F] font-medium shadow-[0_0_0_1px_#0071E3]'
                            : 'bg-white border-[#D2D2D7] text-[#1D1D1F] hover:border-[#86868B]'
                        }`}
                        onClick={() => setCustomer(prev => ({ ...prev, finishing: { ...prev.finishing, coatingSide: 'double' } }))}
                      >
                        양면
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 오시 하위 옵션 */}
            {customer.finishing?.osiEnabled && cfg.osi?.enabled && (
              <div className="pl-4 pt-3 border-l-2 border-gray-200">
                <div className="flex gap-2">
                  {[1, 2, 3].map(n => (
                    <button
                      key={n}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-all border-[1.5px] ${
                        customer.finishing?.osi === n
                          ? 'bg-white border-[#0071E3] text-[#1D1D1F] font-medium shadow-[0_0_0_1px_#0071E3]'
                          : 'bg-white border-[#D2D2D7] text-[#1D1D1F] hover:border-[#86868B]'
                      }`}
                      onClick={() => setCustomer(prev => ({ ...prev, finishing: { ...prev.finishing, osi: n } }))}
                    >
                      {n}줄
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 접지 하위 옵션 */}
            {customer.finishing?.foldEnabled && cfg.fold?.enabled && (
              <div className="pl-4 pt-3 border-l-2 border-gray-200">
                <div className="flex gap-2">
                  {[2, 3, 4].map(n => (
                    <button
                      key={n}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-all border-[1.5px] ${
                        customer.finishing?.fold === n
                          ? 'bg-white border-[#0071E3] text-[#1D1D1F] font-medium shadow-[0_0_0_1px_#0071E3]'
                          : 'bg-white border-[#D2D2D7] text-[#1D1D1F] hover:border-[#86868B]'
                      }`}
                      onClick={() => handleFoldSelect(n, cfg)}
                    >
                      {n}단
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      );

    case 'back':
      return (
        <div className="py-4 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900 mb-3">{block.label}</p>
          <div className="flex gap-2">
            {cfg.options?.map(o => (
              <button
                key={o}
                disabled={isDisabled}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm transition-all border-[1.5px] ${
                  customer.back === o
                    ? 'bg-white border-[#0071E3] text-[#1D1D1F] font-medium shadow-[0_0_0_1px_#0071E3]'
                    : 'bg-white border-[#D2D2D7] text-[#1D1D1F] hover:border-[#86868B]'
                }`}
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
        <div className="py-4 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900 mb-3">{block.label}</p>
          <div className="flex gap-2">
            {cfg.options?.map(o => (
              <button
                key={o}
                disabled={isDisabled}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm transition-all border-[1.5px] ${
                  customer.springColor === o
                    ? 'bg-white border-[#0071E3] text-[#1D1D1F] font-medium shadow-[0_0_0_1px_#0071E3]'
                    : 'bg-white border-[#D2D2D7] text-[#1D1D1F] hover:border-[#86868B]'
                }`}
                onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, springColor: o }))}
              >
                {o === 'black' ? '블랙' : '화이트'}
              </button>
            ))}
          </div>
        </div>
      );

    case 'spring_options':
      // PP=없음 AND 표지인쇄=없음 검증
      const ppIsNone = customer.pp === 'none';
      const coverPrintIsNone = customer.coverPrint === 'none';
      const showCoverError = ppIsNone && coverPrintIsNone;

      // 뒷판 비활성화: 표지인쇄=앞뒤표지
      const isBackDisabled = customer.coverPrint === 'front_back';

      return (
        <div className="mb-4">
          <div className="mb-2">
            <p className="text-sm font-medium text-gray-900">{block.label}</p>
            {block.desc && <p className="text-xs text-gray-400">{block.desc}</p>}
          </div>
          <div className="p-3 border rounded-xl border-gray-200 space-y-3">

            {/* 에러 메시지 */}
            {showCoverError && (
              <div className="p-2 bg-error/10 border border-error/30 rounded-lg">
                <p className="text-xs text-error">전면 커버(PP 또는 표지인쇄) 중 하나는 선택해야 합니다.</p>
              </div>
            )}

            {/* PP - 가로 체크박스 */}
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-500 font-medium">PP</span>
              <div className="flex gap-3">
                {cfg.pp?.options?.filter(o => o.enabled).map(opt => (
                  <label key={opt.id} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="pp"
                      checked={customer.pp === opt.id}
                      disabled={isDisabled}
                      onChange={() => !isDisabled && setCustomer(prev => ({ ...prev, pp: opt.id }))}
                      className="radio radio-sm"
                    />
                    <span className="text-xs">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 표지인쇄 / 뒷판 / 스프링색상 - 3칸 드롭다운 */}
            <div className="grid grid-cols-3 gap-2">
              {/* 표지인쇄 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">표지인쇄</label>
                <select
                  value={customer.coverPrint}
                  disabled={isDisabled}
                  onChange={(e) => !isDisabled && setCustomer(prev => ({ ...prev, coverPrint: e.target.value }))}
                  className="select select-bordered select-sm w-full text-xs"
                >
                  {cfg.coverPrint?.options?.filter(o => o.enabled).map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* 뒷판 */}
              <div className={isBackDisabled ? 'opacity-50' : ''}>
                <label className="text-xs text-gray-500 mb-1 block">
                  뒷판 {isBackDisabled && <span className="text-gray-400">(자동)</span>}
                </label>
                <select
                  value={customer.back}
                  disabled={isDisabled || isBackDisabled}
                  onChange={(e) => !isDisabled && !isBackDisabled && setCustomer(prev => ({ ...prev, back: e.target.value }))}
                  className="select select-bordered select-sm w-full text-xs"
                >
                  {cfg.back?.options?.filter(o => o.enabled).map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* 스프링색상 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">스프링색상</label>
                <select
                  value={customer.springColor}
                  disabled={isDisabled}
                  onChange={(e) => !isDisabled && setCustomer(prev => ({ ...prev, springColor: e.target.value }))}
                  className="select select-bordered select-sm w-full text-xs"
                >
                  {cfg.springColor?.options?.filter(o => o.enabled).map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 표지인쇄 선택 시 용지 선택 */}
            {customer.coverPrint !== 'none' && cfg.coverPrint?.papers && (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-400 mb-2">표지 용지 선택</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(cfg.coverPrint.papers).map(([code, weights]) => {
                    const paper = dbPapersList.find(p => p.code === code) || DB.papers.find(p => p.code === code);
                    if (!paper || !weights.length) return null;
                    return weights.map(w => (
                      <button
                        key={`${code}-${w}`}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-all border-[1.5px] ${
                          customer.coverPaper === code && customer.coverWeight === w
                            ? 'bg-white border-[#0071E3] text-[#1D1D1F] font-medium shadow-[0_0_0_1px_#0071E3]'
                            : 'bg-white border-[#D2D2D7] text-[#1D1D1F] hover:border-[#86868B]'
                        }`}
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

    case 'delivery':
      const businessDaysMap = { 'same': 0, 'next1': 1, 'next2': 2, 'next3': 3 };
      return (
        <div className="py-2 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900 mb-2">출고일</p>
          <div className="flex gap-1">
            {cfg.options?.filter(opt => opt.enabled).map(opt => {
              const days = businessDaysMap[opt.id] ?? 2;
              const date = getBusinessDate(days);
              const dateStr = formatBusinessDate(date);
              return (
                <button
                  key={opt.id}
                  className={`flex-1 py-3 px-2 rounded-xl text-center transition-all border-[1.5px] ${
                    customer.delivery === opt.id
                      ? 'bg-white border-[#0071E3] shadow-[0_0_0_1px_#0071E3]'
                      : 'bg-white border-[#D2D2D7] hover:border-[#86868B]'
                  }`}
                  onClick={() => setCustomer(prev => ({ ...prev, delivery: opt.id, deliveryPercent: opt.percent }))}
                >
                  <p className={`text-sm font-medium ${customer.delivery === opt.id ? 'text-[#1D1D1F]' : 'text-[#1D1D1F]'}`}>{dateStr}</p>
                  <p className={`text-xs ${
                    customer.delivery === opt.id
                      ? 'text-[#86868B]'
                      : opt.percent > 0 ? 'text-red-500' : opt.percent < 0 ? 'text-green-600' : 'text-[#86868B]'
                  }`}>
                    {opt.percent > 0 ? `+${opt.percent}%` : opt.percent < 0 ? `${opt.percent}%` : '기준가'}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      );

    case 'pages_saddle':
    case 'pages_leaf':
    case 'pages':
      return (
        <div className="py-2 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900 mb-2">페이지 수</p>
          <div className="flex items-center gap-2">
            <button
              disabled={isDisabled}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm transition-all"
              onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, pages: Math.max(cfg.min, prev.pages - cfg.step) }))}
            >
              −
            </button>
            <div className="flex-1 text-center">
              <span className="text-lg font-semibold text-gray-900">{customer.pages}</span>
              <span className="text-gray-400 ml-1 text-sm">p</span>
            </div>
            <button
              disabled={isDisabled}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm transition-all"
              onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, pages: Math.min(cfg.max, prev.pages + cfg.step) }))}
            >
              +
            </button>
          </div>
        </div>
      );

    case 'inner_layer_saddle':
    case 'inner_layer_leaf':
      return (
        <div className="mb-4 p-4 border rounded-xl bg-white">
          <p className="text-sm font-medium text-gray-900 mb-3">{block.label}</p>

          {/* 내지 용지 */}
          {!cfg.paperHidden && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1">내지 용지</p>
              {Object.entries(cfg.papers || {}).map(([code, weights]) => {
                const paper = dbPapersList.find(p => p.code === code) || DB.papers.find(p => p.code === code);
                if (!paper || !weights.length) return null;
                return (
                  <div
                    key={code}
                    className={`p-2 border rounded-lg mb-1 cursor-pointer ${
                      customer.innerPaper === code ? 'bg-gray-100 border-gray-400' : 'bg-white border-gray-200'
                    } ${cfg.paperLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => !cfg.paperLocked && setCustomer(prev => ({ ...prev, innerPaper: code, innerWeight: weights[0] }))}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{paper.name}</span>
                      <div className="flex gap-1">
                        {weights.map(w => (
                          <button
                            key={w}
                            disabled={cfg.paperLocked}
                            className={`px-2 py-0.5 text-xs rounded ${
                              customer.innerPaper === code && customer.innerWeight === w ? 'bg-gray-800' : 'bg-gray-50'
                            }`}
                            onClick={(e) => { e.stopPropagation(); !cfg.paperLocked && setCustomer(prev => ({ ...prev, innerPaper: code, innerWeight: w })); }}
                          >
                            {w}g
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 내지 인쇄 */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            {!cfg.printColorHidden && (
              <div>
                <p className="text-xs text-gray-500 mb-1">컬러</p>
                <div className="flex gap-1">
                  {cfg.color && (
                    <button
                      disabled={cfg.printColorLocked}
                      className={`flex-1 py-1 text-xs border rounded transition-colors ${customer.innerColor === 'color' ? 'border-gray-400 bg-gray-100 text-gray-900 font-medium' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                      onClick={() => !cfg.printColorLocked && setCustomer(prev => ({ ...prev, innerColor: 'color' }))}
                    >
                      컬러
                    </button>
                  )}
                  {cfg.mono && (
                    <button
                      disabled={cfg.printColorLocked}
                      className={`flex-1 py-1 text-xs border rounded transition-colors ${customer.innerColor === 'mono' ? 'border-gray-400 bg-gray-100 text-gray-900 font-medium' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                      onClick={() => !cfg.printColorLocked && setCustomer(prev => ({ ...prev, innerColor: 'mono' }))}
                    >
                      흑백
                    </button>
                  )}
                </div>
              </div>
            )}
            {!cfg.printSideHidden && (
              <div>
                <p className="text-xs text-gray-500 mb-1">면수</p>
                <div className="flex gap-1">
                  {cfg.single && (
                    <button
                      disabled={cfg.printSideLocked}
                      className={`flex-1 py-1 text-xs border rounded transition-colors ${customer.innerSide === 'single' ? 'border-gray-400 bg-gray-100 text-gray-900 font-medium' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                      onClick={() => !cfg.printSideLocked && setCustomer(prev => ({ ...prev, innerSide: 'single' }))}
                    >
                      단면
                    </button>
                  )}
                  {cfg.double && (
                    <button
                      disabled={cfg.printSideLocked}
                      className={`flex-1 py-1 text-xs border rounded transition-colors ${customer.innerSide === 'double' ? 'border-gray-400 bg-gray-100 text-gray-900 font-medium' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                      onClick={() => !cfg.printSideLocked && setCustomer(prev => ({ ...prev, innerSide: 'double' }))}
                    >
                      양면
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 페이지 수 */}
          {!cfg.pagesHidden && (
            <div>
              <p className="text-xs text-gray-500 mb-1">페이지 수</p>
              <div className="flex items-center gap-2">
                <button
                  disabled={cfg.pagesLocked}
                  className="w-7 h-7 border rounded flex items-center justify-center bg-white hover:bg-white"
                  onClick={() => !cfg.pagesLocked && setCustomer(prev => ({ ...prev, pages: Math.max(cfg.min, prev.pages - cfg.step) }))}
                >
                  −
                </button>
                <input
                  type="text"
                  value={customer.pages + 'p'}
                  readOnly
                  className="w-14 text-center border rounded py-1 text-sm bg-white"
                />
                <button
                  disabled={cfg.pagesLocked}
                  className="w-7 h-7 border rounded flex items-center justify-center bg-white hover:bg-white"
                  onClick={() => !cfg.pagesLocked && setCustomer(prev => ({ ...prev, pages: Math.min(cfg.max, prev.pages + cfg.step) }))}
                >
                  +
                </button>
                <span className="text-xs text-gray-400">{cfg.min}~{cfg.max}p</span>
              </div>
              {block.type === 'inner_layer_saddle' && (
                <p className="text-xs text-gray-500 mt-1">내지: {Math.max(0, customer.pages - 4)}p (표지 4p 제외)</p>
              )}
            </div>
          )}
        </div>
      );

    case 'quantity':
      return (
        <div className="py-4 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900 mb-3">수량</p>
          <div className="qty-table-wrapper">
            <table className="qty-table">
              <thead>
                <tr>
                  <th>수량</th>
                  <th>단가</th>
                  <th>총 가격</th>
                </tr>
              </thead>
              <tbody>
                {cfg.options?.map((q) => {
                  const p = calculatePrice(customer, q, productType) || { unitPrice: 0, total: 0 };
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
