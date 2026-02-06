/**
 * BlockSettings.jsx
 *
 * AdminBuilder 전용 - 블록 설정 패널
 *
 * 기능:
 * - 각 블록 타입별 관리자 설정 UI
 * - 옵션 활성화/비활성화
 * - 기본값 설정 (더블클릭)
 * - 18개 이상의 블록 타입 지원
 *
 * 주의:
 * - 새 블록 타입 추가 시 switch case 추가 필요
 * - PreviewBlock.jsx도 함께 수정 필요
 */

import { DB, TEMPLATES } from '@/lib/builderData';

function BlockSettings({
  block, updateCfg, updateBlockProp, toggleSizeOption, togglePaper, toggleWeight,
  toggleArrayOption, addQty, removeQty, newQtyInput, setNewQtyInput, allBlocks, dbPapersList
}) {
  // DB에서 정렬된 용지 목록 사용 (없으면 하드코딩된 목록 폴백)
  const papersList = dbPapersList?.length > 0 ? dbPapersList : DB.papers;
  const cfg = block.config;

  switch (block.type) {
    case 'size':
      return (
        <div>
          <p className="text-xs text-info bg-info/10 px-3 py-2 rounded-lg mb-3">
            더블클릭으로 기본값 설정 (★ 표시)
          </p>
          <label className="text-xs text-gray-500 block mb-2">사이즈 옵션</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(DB.sizeMultipliers).map(([code, info]) => (
              <label
                key={code}
                className="flex items-center gap-1 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                onDoubleClick={() => updateCfg(block.id, 'default', code)}
              >
                <input
                  type="checkbox"
                  checked={cfg.options?.includes(code)}
                  onChange={(e) => toggleSizeOption(block.id, code, e.target.checked)}
                  className="checkbox checkbox-sm"
                />
                {info.name}
                {cfg.default === code && <span className="text-warning ml-1">★</span>}
              </label>
            ))}
          </div>
        </div>
      );

    case 'paper':
      return (
        <div>
          <p className="text-xs text-info bg-info/10 px-3 py-2 rounded-lg mb-3">
            더블클릭으로 기본값 설정 (★ 표시)
          </p>
          <label className="text-xs text-gray-500 block mb-2">용지 선택</label>
          {papersList.map(paper => {
            const isOn = cfg.papers && cfg.papers[paper.code];
            const isDefaultPaper = cfg.default?.paper === paper.code;
            return (
              <div key={paper.code} className="mb-2 p-3 bg-white rounded-lg border border-gray-200">
                <label
                  className="flex items-center gap-2 text-sm font-medium cursor-pointer"
                  onDoubleClick={() => {
                    // 이미 기본값이면 해제, 아니면 설정
                    if (isDefaultPaper) {
                      updateCfg(block.id, 'default', { ...cfg.default, paper: null });
                    } else {
                      updateCfg(block.id, 'default', { ...cfg.default, paper: paper.code });
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!isOn}
                    onChange={(e) => togglePaper(block.id, paper.code, e.target.checked)}
                    className="checkbox checkbox-sm"
                  />
                  {paper.name}
                  {isDefaultPaper && <span className="text-warning">★</span>}
                </label>
                {isOn && (
                  <div className="flex flex-wrap gap-2 mt-2 ml-6">
                    {DB.weights[paper.code]?.map(w => (
                      <label
                        key={w}
                        className="flex items-center gap-1 text-xs bg-gray-50 px-2 py-1 rounded cursor-pointer"
                        onDoubleClick={() => {
                          // 이미 기본값이면 해제, 아니면 설정
                          if (cfg.default?.weight === w && isDefaultPaper) {
                            updateCfg(block.id, 'default', { ...cfg.default, weight: null });
                          } else {
                            updateCfg(block.id, 'default', { ...cfg.default, weight: w });
                          }
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={cfg.papers[paper.code]?.includes(w)}
                          onChange={(e) => toggleWeight(block.id, paper.code, w, e.target.checked)}
                          className="checkbox checkbox-xs"
                        />
                        {w}g
                        {cfg.default?.weight === w && isDefaultPaper && <span className="text-warning ml-1">★</span>}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );

    case 'pp':
      return (
        <div>
          <label className="text-xs text-gray-500 block mb-2">PP 옵션</label>
          <div className="flex flex-wrap gap-3">
            {[{code:'clear',name:'투명'},{code:'frosted',name:'불투명'},{code:'none',name:'없음'}].map(opt => (
              <label key={opt.code} className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={cfg.options?.includes(opt.code)}
                  onChange={(e) => toggleArrayOption(block.id, opt.code, e.target.checked)}
                  className="checkbox checkbox-sm"
                />
                {opt.name}
              </label>
            ))}
          </div>
          <div className="mt-3">
            <label className="text-xs text-gray-500 block mb-1">기본값</label>
            <select
              value={cfg.default || ''}
              onChange={(e) => updateCfg(block.id, 'default', e.target.value)}
              className="select select-bordered select-sm"
            >
              {cfg.options?.map(o => (
                <option key={o} value={o}>{o === 'clear' ? '투명' : o === 'frosted' ? '불투명' : '없음'}</option>
              ))}
            </select>
          </div>
        </div>
      );

    case 'cover_print':
      return (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-2">표지인쇄 옵션</label>
            <div className="flex flex-wrap gap-3">
              {[{code:'none',name:'없음 (내지가 첫페이지)'},{code:'front_only',name:'앞표지만 인쇄'},{code:'front_back',name:'앞뒤표지 인쇄'}].map(opt => (
                <label key={opt.code} className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={cfg.options?.includes(opt.code)}
                    onChange={(e) => toggleArrayOption(block.id, opt.code, e.target.checked)}
                  />
                  {opt.name}
                </label>
              ))}
            </div>
          </div>

          <div className="alert alert-warning">
            <p className="text-xs font-medium mb-2">⚠️ 연동 규칙</p>
            <p className="text-xs">• "앞뒤표지 인쇄" 선택 시 → 뒷판 블록 비활성화</p>
            <p className="text-xs">• PP=없음 AND 표지인쇄=없음 → 불가 (에러)</p>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-2">표지 용지 (표지인쇄 선택 시 표시)</label>
            {papersList.map(paper => {
              const isOn = cfg.papers && cfg.papers[paper.code];
              return (
                <div key={paper.code} className="mb-2 p-2 bg-white rounded-lg border border-gray-200">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!isOn}
                      onChange={(e) => {
                        let papersObj = { ...cfg.papers };
                        if (e.target.checked) {
                          papersObj[paper.code] = DB.weights[paper.code].filter(w => w >= 150).slice(0, 3);
                        } else {
                          delete papersObj[paper.code];
                        }
                        updateCfg(block.id, 'papers', papersObj);
                      }}
                    />
                    {paper.name}
                  </label>
                  {isOn && (
                    <div className="flex flex-wrap gap-2 mt-2 ml-6">
                      {DB.weights[paper.code]?.filter(w => w >= 150).map(w => (
                        <label key={w} className="flex items-center gap-1 text-xs bg-gray-50 px-2 py-1 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={cfg.papers[paper.code]?.includes(w)}
                            onChange={(e) => {
                              let papers = { ...cfg.papers };
                              let ws = papers[paper.code] || [];
                              if (e.target.checked) {
                                if (!ws.includes(w)) ws = [...ws, w].sort((a,b) => a-b);
                              } else {
                                ws = ws.filter(ww => ww !== w);
                              }
                              papers[paper.code] = ws;
                              updateCfg(block.id, 'papers', papers);
                            }}
                          />
                          {w}g
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );

    case 'print':
      return (
        <div className="space-y-4">
          <p className="text-xs text-info bg-info/10 px-3 py-2 rounded-lg">
            더블클릭으로 기본값 설정 (★ 표시)
          </p>
          <div>
            <label className="text-xs text-gray-500 block mb-2">컬러</label>
            <div className="flex gap-3">
              <label
                className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                onDoubleClick={() => updateCfg(block.id, 'default', { ...cfg.default, color: 'color' })}
              >
                <input type="checkbox" checked={cfg.color} onChange={(e) => updateCfg(block.id, 'color', e.target.checked)} />
                컬러
                {cfg.default?.color === 'color' && <span className="text-warning">★</span>}
              </label>
              <label
                className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                onDoubleClick={() => updateCfg(block.id, 'default', { ...cfg.default, color: 'mono' })}
              >
                <input type="checkbox" checked={cfg.mono} onChange={(e) => updateCfg(block.id, 'mono', e.target.checked)} />
                흑백
                {cfg.default?.color === 'mono' && <span className="text-warning">★</span>}
              </label>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-2">면수</label>
            <div className="flex gap-3">
              <label
                className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                onDoubleClick={() => updateCfg(block.id, 'default', { ...cfg.default, side: 'single' })}
              >
                <input type="checkbox" checked={cfg.single} onChange={(e) => updateCfg(block.id, 'single', e.target.checked)} />
                단면
                {cfg.default?.side === 'single' && <span className="text-warning">★</span>}
              </label>
              <label
                className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                onDoubleClick={() => updateCfg(block.id, 'default', { ...cfg.default, side: 'double' })}
              >
                <input type="checkbox" checked={cfg.double} onChange={(e) => updateCfg(block.id, 'double', e.target.checked)} />
                양면
                {cfg.default?.side === 'double' && <span className="text-warning">★</span>}
              </label>
            </div>
          </div>
        </div>
      );


    case 'finishing':
      return (
        <div className="space-y-4">
          <p className="text-xs text-info bg-info/10 px-3 py-2 rounded-lg mb-3">
            더블클릭으로 기본값 설정 (★ 표시)
          </p>
          <div>
            <label className="text-xs text-gray-500 block mb-2">기본 후가공</label>
            <div className="flex gap-3 flex-wrap">
              <label
                className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                onDoubleClick={() => updateCfg(block.id, 'default', { ...cfg.default, coating: !cfg.default?.coating })}
              >
                <input type="checkbox" checked={cfg.coating?.enabled ?? false} onChange={(e) => updateCfg(block.id, 'coating', { ...cfg.coating, enabled: e.target.checked, matte: true, gloss: true, single: true, double: true })} />
                코팅
                {cfg.default?.coating && <span className="text-warning ml-1">★</span>}
              </label>
              {cfg.coating?.enabled && (
                <div className="flex gap-2 ml-2 items-center flex-wrap">
                  <label
                    className="flex items-center gap-1 text-sm bg-white px-2 py-1 rounded border border-gray-200 cursor-pointer hover:bg-gray-50"
                    onDoubleClick={() => updateCfg(block.id, 'default', { ...cfg.default, coatingType: cfg.default?.coatingType === 'matte' ? null : 'matte' })}
                  >
                    <input type="checkbox" checked={cfg.coating?.matte ?? true} onChange={(e) => updateCfg(block.id, 'coating', { ...cfg.coating, matte: e.target.checked })} />
                    무광
                    {cfg.default?.coatingType === 'matte' && <span className="text-warning ml-1">★</span>}
                  </label>
                  <label
                    className="flex items-center gap-1 text-sm bg-white px-2 py-1 rounded border border-gray-200 cursor-pointer hover:bg-gray-50"
                    onDoubleClick={() => updateCfg(block.id, 'default', { ...cfg.default, coatingType: cfg.default?.coatingType === 'gloss' ? null : 'gloss' })}
                  >
                    <input type="checkbox" checked={cfg.coating?.gloss ?? true} onChange={(e) => updateCfg(block.id, 'coating', { ...cfg.coating, gloss: e.target.checked })} />
                    유광
                    {cfg.default?.coatingType === 'gloss' && <span className="text-warning ml-1">★</span>}
                  </label>
                  <span className="text-gray-300 mx-1">|</span>
                  <label
                    className="flex items-center gap-1 text-sm bg-white px-2 py-1 rounded border border-gray-200 cursor-pointer hover:bg-gray-50"
                    onDoubleClick={() => updateCfg(block.id, 'default', { ...cfg.default, coatingSide: cfg.default?.coatingSide === 'single' ? null : 'single' })}
                  >
                    <input type="checkbox" checked={cfg.coating?.single ?? true} onChange={(e) => updateCfg(block.id, 'coating', { ...cfg.coating, single: e.target.checked })} />
                    단면
                    {cfg.default?.coatingSide === 'single' && <span className="text-warning ml-1">★</span>}
                  </label>
                  <label
                    className="flex items-center gap-1 text-sm bg-white px-2 py-1 rounded border border-gray-200 cursor-pointer hover:bg-gray-50"
                    onDoubleClick={() => updateCfg(block.id, 'default', { ...cfg.default, coatingSide: cfg.default?.coatingSide === 'double' ? null : 'double' })}
                  >
                    <input type="checkbox" checked={cfg.coating?.double ?? true} onChange={(e) => updateCfg(block.id, 'coating', { ...cfg.coating, double: e.target.checked })} />
                    양면
                    {cfg.default?.coatingSide === 'double' && <span className="text-warning ml-1">★</span>}
                  </label>
                  <span className="text-xs text-gray-400 ml-2">평량기준:</span>
                  <select
                    value={cfg.coating?.linkedPaper || ''}
                    onChange={(e) => updateCfg(block.id, 'coating', { ...cfg.coating, linkedPaper: e.target.value || null })}
                    className="text-xs px-2 py-1 border border-gray-200 rounded bg-white"
                  >
                    <option value="">자동</option>
                    {allBlocks?.filter(b => ['paper', 'cover_print', 'inner_layer_saddle', 'inner_layer_leaf'].includes(b.type) && b.on).map(b => (
                      <option key={b.id} value={b.id}>{b.label}</option>
                    ))}
                  </select>
                </div>
              )}
              <label
                className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                onDoubleClick={() => updateCfg(block.id, 'default', { ...cfg.default, corner: !cfg.default?.corner })}
              >
                <input type="checkbox" checked={cfg.corner} onChange={(e) => updateCfg(block.id, 'corner', e.target.checked)} />
                귀도리
                {cfg.default?.corner && <span className="text-warning ml-1">★</span>}
              </label>
              <label
                className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                onDoubleClick={() => updateCfg(block.id, 'default', { ...cfg.default, punch: !cfg.default?.punch })}
              >
                <input type="checkbox" checked={cfg.punch} onChange={(e) => updateCfg(block.id, 'punch', e.target.checked)} />
                타공
                {cfg.default?.punch && <span className="text-warning ml-1">★</span>}
              </label>
              <label
                className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                onDoubleClick={() => updateCfg(block.id, 'default', { ...cfg.default, mising: !cfg.default?.mising })}
              >
                <input type="checkbox" checked={cfg.mising} onChange={(e) => updateCfg(block.id, 'mising', e.target.checked)} />
                미싱
                {cfg.default?.mising && <span className="text-warning ml-1">★</span>}
              </label>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-2">오시 (접는 선)</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input type="checkbox" checked={cfg.osi?.enabled ?? false} onChange={(e) => updateCfg(block.id, 'osi', { ...cfg.osi, enabled: e.target.checked })} />
                오시 사용
              </label>
              {cfg.osi?.enabled && (
                <div className="flex gap-2">
                  {[1, 2, 3].map(n => (
                    <label key={n} className="flex items-center gap-1 text-sm bg-white px-2 py-1 rounded border border-gray-200 cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" checked={cfg.osi?.options?.includes(n) ?? false} onChange={(e) => {
                        const opts = cfg.osi?.options || [];
                        updateCfg(block.id, 'osi', { ...cfg.osi, options: e.target.checked ? [...opts, n] : opts.filter(x => x !== n) });
                      }} />
                      {n}줄
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-2">접지 (접는 회수)</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input type="checkbox" checked={cfg.fold?.enabled ?? false} onChange={(e) => updateCfg(block.id, 'fold', { ...cfg.fold, enabled: e.target.checked })} />
                접지 사용
              </label>
              {cfg.fold?.enabled && (
                <div className="flex gap-2">
                  {[2, 3, 4].map(n => (
                    <label key={n} className="flex items-center gap-1 text-sm bg-white px-2 py-1 rounded border border-gray-200 cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" checked={cfg.fold?.options?.includes(n) ?? false} onChange={(e) => {
                        const opts = cfg.fold?.options || [];
                        updateCfg(block.id, 'fold', { ...cfg.fold, options: e.target.checked ? [...opts, n] : opts.filter(x => x !== n) });
                      }} />
                      {n}단
                    </label>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">* 130g 이상 용지에서 접지 선택 시 오시 자동 활성화 (2단→1줄, 3단→2줄, 4단→3줄)</p>
          </div>
        </div>
      );

    case 'back':
      return (
        <div>
          <label className="text-xs text-gray-500 block mb-2">뒷판 옵션</label>
          <div className="flex gap-3">
            {[{code:'white',name:'화이트'},{code:'black',name:'블랙'},{code:'none',name:'없음'}].map(opt => (
              <label key={opt.code} className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={cfg.options?.includes(opt.code)}
                  onChange={(e) => toggleArrayOption(block.id, opt.code, e.target.checked)}
                />
                {opt.name}
              </label>
            ))}
          </div>
        </div>
      );

    case 'spring_color':
      return (
        <div>
          <label className="text-xs text-gray-500 block mb-2">스프링 색상</label>
          <div className="flex gap-3">
            {[{code:'black',name:'블랙'},{code:'white',name:'화이트'}].map(opt => (
              <label key={opt.code} className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={cfg.options?.includes(opt.code)}
                  onChange={(e) => toggleArrayOption(block.id, opt.code, e.target.checked)}
                />
                {opt.name}
              </label>
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

      // 옵션이 cfg에 없으면 기본 템플릿 복사해서 저장하는 함수
      const initializeOptions = () => {
        updateCfg(block.id, 'pp', defaultSpringCfg.pp || {});
        updateCfg(block.id, 'coverPrint', defaultSpringCfg.coverPrint || {});
        updateCfg(block.id, 'back', defaultSpringCfg.back || {});
        updateCfg(block.id, 'springColor', defaultSpringCfg.springColor || {});
      };

      const needsInit = !cfg.pp?.options?.length && !cfg.coverPrint?.options?.length && !cfg.back?.options?.length && !cfg.springColor?.options?.length;

      return (
        <div className="space-y-4">
          {/* 초기화 버튼 (옵션이 없을 때) */}
          {needsInit && (
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-700 mb-2">옵션이 설정되지 않았습니다.</p>
              <button
                className="btn btn-sm btn-warning"
                onClick={initializeOptions}
              >
                기본 옵션으로 초기화
              </button>
            </div>
          )}

          {/* PP 옵션 - 가로 체크박스 */}
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400 font-medium">PP (전면 커버)</label>
              <div className="flex items-center gap-4">
                {ppOptions.map(opt => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                    onDoubleClick={() => {
                      const newOptions = ppOptions.map(o => ({ ...o, default: o.id === opt.id }));
                      updateCfg(block.id, 'pp', { ...(cfg.pp || {}), options: newOptions });
                    }}
                  >
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={opt.enabled}
                      onChange={(e) => {
                        const newOptions = ppOptions.map(o =>
                          o.id === opt.id ? { ...o, enabled: e.target.checked } : o
                        );
                        updateCfg(block.id, 'pp', { ...(cfg.pp || {}), options: newOptions });
                      }}
                    />
                    <span className={opt.default ? 'font-medium' : ''}>{opt.label}</span>
                    {opt.default && <span className="text-gray-500 text-xs">★</span>}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* 3열 드롭다운 레이아웃 */}
          <div className="grid grid-cols-3 gap-4">
            {/* 표지인쇄 */}
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <label className="text-xs text-gray-400 font-medium block mb-3">표지인쇄</label>
              <select
                className="select select-bordered select-sm w-full mb-3"
                value={coverPrintOptions.find(o => o.default)?.id || ''}
                onChange={(e) => {
                  const newOptions = coverPrintOptions.map(o => ({ ...o, default: o.id === e.target.value }));
                  updateCfg(block.id, 'coverPrint', { ...(cfg.coverPrint || {}), options: newOptions });
                }}
              >
                {coverPrintOptions.filter(o => o.enabled).map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
              <div className="space-y-1">
                {coverPrintOptions.map(opt => (
                  <label key={opt.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-xs"
                      checked={opt.enabled}
                      onChange={(e) => {
                        const newOptions = coverPrintOptions.map(o =>
                          o.id === opt.id ? { ...o, enabled: e.target.checked } : o
                        );
                        updateCfg(block.id, 'coverPrint', { ...(cfg.coverPrint || {}), options: newOptions });
                      }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {/* 뒷판 */}
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <label className="text-xs text-gray-400 font-medium block mb-3">뒷판</label>
              <select
                className="select select-bordered select-sm w-full mb-3"
                value={backOptions.find(o => o.default)?.id || ''}
                onChange={(e) => {
                  const newOptions = backOptions.map(o => ({ ...o, default: o.id === e.target.value }));
                  updateCfg(block.id, 'back', { ...(cfg.back || {}), options: newOptions });
                }}
              >
                {backOptions.filter(o => o.enabled).map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
              <div className="space-y-1">
                {backOptions.map(opt => (
                  <label key={opt.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-xs"
                      checked={opt.enabled}
                      onChange={(e) => {
                        const newOptions = backOptions.map(o =>
                          o.id === opt.id ? { ...o, enabled: e.target.checked } : o
                        );
                        updateCfg(block.id, 'back', { ...(cfg.back || {}), options: newOptions });
                      }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-300 mt-2 pt-2 border-t border-gray-200">앞뒤표지 시 비활성화</p>
            </div>

            {/* 스프링 색상 */}
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <label className="text-xs text-gray-400 font-medium block mb-3">스프링 색상</label>
              <select
                className="select select-bordered select-sm w-full mb-3"
                value={springColorOptions.find(o => o.default)?.id || ''}
                onChange={(e) => {
                  const newOptions = springColorOptions.map(o => ({ ...o, default: o.id === e.target.value }));
                  updateCfg(block.id, 'springColor', { ...(cfg.springColor || {}), options: newOptions });
                }}
              >
                {springColorOptions.filter(o => o.enabled).map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
              <div className="space-y-1">
                {springColorOptions.map(opt => (
                  <label key={opt.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-xs"
                      checked={opt.enabled}
                      onChange={(e) => {
                        const newOptions = springColorOptions.map(o =>
                          o.id === opt.id ? { ...o, enabled: e.target.checked } : o
                        );
                        updateCfg(block.id, 'springColor', { ...(cfg.springColor || {}), options: newOptions });
                      }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* 표지 용지 설정 */}
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <label className="text-xs text-gray-400 font-medium block mb-3">표지 용지 (앞표지/앞뒤표지 선택 시)</label>
            <div className="grid grid-cols-2 gap-4">
              {papersList.map(paper => {
                const isOn = cfg.coverPrint?.papers && cfg.coverPrint.papers[paper.code];
                return (
                  <div key={paper.code} className="space-y-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={!!isOn}
                        onChange={(e) => {
                          let papersObj = { ...cfg.coverPrint?.papers };
                          if (e.target.checked) {
                            papersObj[paper.code] = DB.weights[paper.code].filter(w => w >= 150).slice(0, 3);
                          } else {
                            delete papersObj[paper.code];
                          }
                          updateCfg(block.id, 'coverPrint', { ...cfg.coverPrint, papers: papersObj });
                        }}
                      />
                      <span className="font-medium">{paper.name}</span>
                    </label>
                    {isOn && (
                      <div className="flex flex-wrap gap-1 ml-6">
                        {DB.weights[paper.code]?.filter(w => w >= 150).map(w => (
                          <label key={w} className="inline-flex items-center gap-1 text-xs bg-gray-50 px-2 py-1 rounded cursor-pointer hover:bg-gray-100 transition-colors">
                            <input
                              type="checkbox"
                              className="checkbox checkbox-xs"
                              checked={cfg.coverPrint.papers[paper.code]?.includes(w)}
                              onChange={(e) => {
                                let papersObj = { ...cfg.coverPrint.papers };
                                let ws = papersObj[paper.code] || [];
                                if (e.target.checked) {
                                  if (!ws.includes(w)) ws = [...ws, w].sort((a,b) => a-b);
                                } else {
                                  ws = ws.filter(ww => ww !== w);
                                }
                                papersObj[paper.code] = ws;
                                updateCfg(block.id, 'coverPrint', { ...cfg.coverPrint, papers: papersObj });
                              }}
                            />
                            {w}g
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 연동 규칙 안내 */}
          <p className="text-xs text-gray-400">
            PP=없음 AND 표지인쇄=없음 → 에러 · 표지인쇄=앞뒤표지 → 뒷판 비활성화
          </p>
        </div>
      );
    }

    case 'delivery': {
      // 고정 출고일 옵션 4개 (하드코딩) - ID는 절대 변경 불가
      const FIXED_DELIVERY_OPTIONS = [
        { id: 'same', label: '당일', days: 0, defaultPercent: 30 },
        { id: 'next1', label: '1영업일', days: 1, defaultPercent: 15 },
        { id: 'next2', label: '2영업일', days: 2, defaultPercent: 0 },
        { id: 'next3', label: '3영업일', days: 3, defaultPercent: -5 },
      ];

      // cfg.options에서 고정 ID만 추출 (커스텀 옵션 무시)
      const getOptionConfig = (id) => {
        const opt = cfg.options?.find(o => o.id === id);
        if (opt) return opt;
        // 없으면 기본값
        const fixedOpt = FIXED_DELIVERY_OPTIONS.find(o => o.id === id);
        return { id, enabled: id !== 'same', percent: fixedOpt?.defaultPercent || 0 };
      };

      // 옵션 업데이트 - 항상 고정 4개 ID만 저장
      const updateDeliveryOption = (optId, field, value) => {
        // 고정 ID가 아니면 무시
        if (!FIXED_DELIVERY_OPTIONS.find(o => o.id === optId)) return;

        // 고정 4개 옵션으로 새 배열 생성
        const newOptions = FIXED_DELIVERY_OPTIONS.map(fixedOpt => {
          const current = getOptionConfig(fixedOpt.id);
          if (fixedOpt.id === optId) {
            return { ...current, id: fixedOpt.id, [field]: value };
          }
          return { ...current, id: fixedOpt.id };
        });
        updateCfg(block.id, 'options', newOptions);
      };

      // 리셋 함수 - 기본값으로 초기화
      const resetToDefault = () => {
        const defaultOptions = FIXED_DELIVERY_OPTIONS.map(o => ({
          id: o.id,
          enabled: o.id !== 'same',
          percent: o.defaultPercent
        }));
        updateCfg(block.id, 'options', defaultOptions);
        updateCfg(block.id, 'default', 'next2');
      };

      return (
        <div className="space-y-4">
          {/* 출고 기준 마감시간 */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <label className="text-xs text-blue-700 font-medium block mb-2">출고 기준 마감시간</label>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={cfg.cutoffTime || '14:00'}
                onChange={(e) => updateCfg(block.id, 'cutoffTime', e.target.value)}
                className="input input-bordered input-sm w-32"
              />
              <span className="text-xs text-blue-600">이후 주문은 다음 영업일 기준</span>
            </div>
          </div>

          {/* 출고일 옵션 목록 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-500">출고일 옵션 (고정 4개)</label>
              <button
                onClick={resetToDefault}
                className="text-xs text-blue-500 hover:underline"
              >
                기본값으로 리셋
              </button>
            </div>
            <div className="space-y-2">
              {FIXED_DELIVERY_OPTIONS.map(fixedOpt => {
                const cfgOpt = getOptionConfig(fixedOpt.id);
                const isEnabled = cfgOpt.enabled !== false;
                const percent = cfgOpt.percent ?? fixedOpt.defaultPercent;
                const isDefault = cfg.default === fixedOpt.id;

                return (
                  <div
                    key={fixedOpt.id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${isEnabled ? 'bg-white' : 'bg-gray-50'}`}
                    onDoubleClick={() => updateCfg(block.id, 'default', fixedOpt.id)}
                  >
                    {/* 활성화 체크박스 */}
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) => updateDeliveryOption(fixedOpt.id, 'enabled', e.target.checked)}
                      className="checkbox checkbox-sm"
                    />

                    {/* 라벨 (고정) */}
                    <span className={`w-20 text-sm ${isEnabled ? 'text-gray-700' : 'text-gray-400'}`}>
                      {fixedOpt.label}
                    </span>

                    {/* 영업일 수 표시 */}
                    <span className="text-xs text-gray-400 w-16">
                      {fixedOpt.days === 0 ? '출고 당일' : `+${fixedOpt.days}영업일`}
                    </span>

                    {/* 기본값 표시 */}
                    {isDefault && <span className="text-warning text-sm">★</span>}

                    {/* percent 입력 */}
                    <div className="flex items-center gap-1 ml-auto">
                      <input
                        type="number"
                        value={percent}
                        onChange={(e) => updateDeliveryOption(fixedOpt.id, 'percent', parseInt(e.target.value) || 0)}
                        className="w-16 px-2 py-1 border rounded text-sm text-center"
                        disabled={!isEnabled}
                      />
                      <span className="text-xs text-gray-400">%</span>
                    </div>

                    {/* percent 표시 */}
                    <span className={`text-xs w-14 text-right ${percent > 0 ? 'text-red-500' : percent < 0 ? 'text-blue-500' : 'text-gray-500'}`}>
                      {percent > 0 ? `+${percent}%` : percent === 0 ? '기준가' : `${percent}%`}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-2">더블클릭으로 기본값 설정 (★)</p>
          </div>
        </div>
      );
    }

    case 'quantity':
      return (
        <div>
          <p className="text-xs text-info bg-info/10 px-3 py-2 rounded-lg mb-3">
            더블클릭으로 기본값 설정 (★ 표시)
          </p>
          <label className="text-xs text-gray-500 block mb-2">수량 옵션</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {cfg.options?.map(q => (
              <span
                key={q}
                className="inline-flex items-center gap-1 px-3 py-1 bg-gray-50 text-gray-700 rounded-lg text-sm cursor-pointer hover:bg-gray-100"
                onDoubleClick={() => updateCfg(block.id, 'default', q)}
              >
                {q}부
                {cfg.default === q && <span className="text-warning">★</span>}
                <button onClick={() => removeQty(block.id, q)} className="text-gray-400 hover:text-error ml-1">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              value={newQtyInput}
              onChange={(e) => setNewQtyInput(e.target.value)}
              placeholder="수량 추가"
              className="flex-1 select select-bordered select-sm"
            />
            <button
              onClick={() => { addQty(block.id, parseInt(newQtyInput)); setNewQtyInput(''); }}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-semibold hover:bg-gray-900"
            >
              추가
            </button>
          </div>
        </div>
      );

    case 'pages_saddle':
    case 'pages_leaf':
    case 'pages':
      return (
        <div className="space-y-4">
          {/* 페이지 수 범위 */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">최소 (p)</label>
              <input
                type="number"
                value={cfg.min}
                onChange={(e) => updateCfg(block.id, 'min', parseInt(e.target.value))}
                className="w-full select select-bordered select-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">단위</label>
              <input
                type="number"
                value={cfg.step}
                onChange={(e) => updateCfg(block.id, 'step', parseInt(e.target.value))}
                className="w-full select select-bordered select-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">기본값</label>
              <input
                type="number"
                value={cfg.default || cfg.min}
                min={cfg.min}
                step={cfg.step}
                onChange={(e) => updateCfg(block.id, 'default', parseInt(e.target.value))}
                className="w-full select select-bordered select-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">두께제한 (mm)</label>
              <input
                type="number"
                value={cfg.maxThickness || ''}
                step="0.1"
                min="0"
                placeholder="예: 2.5"
                onChange={(e) => updateCfg(block.id, 'maxThickness', parseFloat(e.target.value) || null)}
                className="w-full select select-bordered select-sm"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400">
            💡 두께제한: 중철 2.5mm, 무선 50mm, 스프링 20mm 권장. 용지+평량+페이지로 두께 자동 계산되어 초과 시 에러 표시.
          </p>

          {/* 제본 타입 선택 (pages 타입일 때만) */}
          {block.type === 'pages' && (
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <label className="text-xs text-gray-600 font-medium block mb-2">제본 타입</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`bindingType_${block.id}`}
                    checked={cfg.bindingType === 'saddle'}
                    onChange={() => updateCfg(block.id, 'bindingType', 'saddle')}
                  />
                  <span className="text-sm">중철 (4p 표지 분리)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`bindingType_${block.id}`}
                    checked={cfg.bindingType === 'leaf'}
                    onChange={() => updateCfg(block.id, 'bindingType', 'leaf')}
                  />
                  <span className="text-sm">낱장 (무선/스프링)</span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                📌 수식: {cfg.bindingType === 'saddle' ? '내지 페이지 = 총 페이지 - 4 (표지 제외)' : '내지 페이지 = 입력값 그대로'}
              </p>
            </div>
          )}

          {/* 연동 블록 선택 UI - bindingType이 설정된 경우에만 표시 */}
          {block.type === 'pages' && cfg.bindingType && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <label className="text-xs text-amber-700 font-medium block mb-3">
                연동 블록 선택 (필수)
              </label>
              <p className="text-xs text-amber-600 mb-3">
                페이지 수에 따라 용지/인쇄 비용을 계산할 블록을 선택하세요.
              </p>

              {/* 중철일 때: 내지 블록만 선택 (표지는 별도 계산됨) */}
              {cfg.bindingType === 'saddle' && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">
                    표지는 별도 옵션에서 자동 계산됩니다. 내지만 연동하세요.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">내지 용지 블록</label>
                      <select
                        value={cfg.linkedBlocks?.innerPaper || ''}
                        onChange={(e) => updateCfg(block.id, 'linkedBlocks', {
                          ...cfg.linkedBlocks,
                          innerPaper: parseInt(e.target.value) || null
                        })}
                        className={`select select-bordered select-sm w-full ${!cfg.linkedBlocks?.innerPaper ? 'border-error' : ''}`}
                      >
                        <option value="">선택하세요</option>
                        {allBlocks?.filter(b => b.type === 'paper' && b.id !== block.id).map(b => (
                          <option key={b.id} value={b.id}>{b.label} (ID: {b.id})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">내지 인쇄 블록</label>
                      <select
                        value={cfg.linkedBlocks?.innerPrint || ''}
                        onChange={(e) => updateCfg(block.id, 'linkedBlocks', {
                          ...cfg.linkedBlocks,
                          innerPrint: parseInt(e.target.value) || null
                        })}
                        className={`select select-bordered select-sm w-full ${!cfg.linkedBlocks?.innerPrint ? 'border-error' : ''}`}
                      >
                        <option value="">선택하세요</option>
                        {allBlocks?.filter(b => b.type === 'print' && b.id !== block.id).map(b => (
                          <option key={b.id} value={b.id}>{b.label} (ID: {b.id})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* 낱장(무선/스프링)일 때: 내지 블록만 선택 (2개) */}
              {cfg.bindingType === 'leaf' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">내지 용지 블록</label>
                    <select
                      value={cfg.linkedBlocks?.innerPaper || ''}
                      onChange={(e) => updateCfg(block.id, 'linkedBlocks', {
                        ...cfg.linkedBlocks,
                        innerPaper: parseInt(e.target.value) || null
                      })}
                      className={`select select-bordered select-sm w-full ${!cfg.linkedBlocks?.innerPaper ? 'border-error' : ''}`}
                    >
                      <option value="">선택하세요</option>
                      {allBlocks?.filter(b => b.type === 'paper' && b.id !== block.id).map(b => (
                        <option key={b.id} value={b.id}>{b.label} (ID: {b.id})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">내지 인쇄 블록</label>
                    <select
                      value={cfg.linkedBlocks?.innerPrint || ''}
                      onChange={(e) => updateCfg(block.id, 'linkedBlocks', {
                        ...cfg.linkedBlocks,
                        innerPrint: parseInt(e.target.value) || null
                      })}
                      className={`select select-bordered select-sm w-full ${!cfg.linkedBlocks?.innerPrint ? 'border-error' : ''}`}
                    >
                      <option value="">선택하세요</option>
                      {allBlocks?.filter(b => b.type === 'print' && b.id !== block.id).map(b => (
                        <option key={b.id} value={b.id}>{b.label} (ID: {b.id})</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* 연동 상태 표시 */}
              {(() => {
                const hasAllLinks = cfg.bindingType === 'saddle'
                  ? (cfg.linkedBlocks?.coverPaper && cfg.linkedBlocks?.coverPrint &&
                     cfg.linkedBlocks?.innerPaper && cfg.linkedBlocks?.innerPrint)
                  : (cfg.linkedBlocks?.innerPaper && cfg.linkedBlocks?.innerPrint);

                return !hasAllLinks ? (
                  <div className="mt-3 p-2 bg-error/10 rounded border border-error/30">
                    <p className="text-xs text-error">
                      모든 연동 블록을 선택해야 가격 계산이 정상 작동합니다.
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 p-2 bg-success/10 rounded border border-success/30">
                    <p className="text-xs text-success">연동 설정 완료</p>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      );

    case 'inner_layer_saddle':
    case 'inner_layer_leaf':
      return (
        <div className="space-y-4">
          <p className="text-xs text-info bg-info/10 px-3 py-2 rounded-lg">
            더블클릭으로 기본값 설정 (★ 표시)
          </p>

          {/* 내지 용지 - paper 블록과 동일한 스타일 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-500">내지 용지</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                  <input type="checkbox" className="checkbox checkbox-xs" checked={cfg.paperLocked} onChange={(e) => updateCfg(block.id, 'paperLocked', e.target.checked)} />
                  고정
                </label>
                <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                  <input type="checkbox" className="checkbox checkbox-xs" checked={cfg.paperHidden} onChange={(e) => updateCfg(block.id, 'paperHidden', e.target.checked)} />
                  숨김
                </label>
              </div>
            </div>
            {papersList.map(paper => {
              const isOn = cfg.papers && cfg.papers[paper.code];
              const isDefaultPaper = cfg.defaultPaper?.paper === paper.code;
              return (
                <div key={paper.code} className="mb-2 p-3 bg-white rounded-lg border border-gray-200">
                  <label
                    className="flex items-center gap-2 text-sm font-medium cursor-pointer"
                    onDoubleClick={() => updateCfg(block.id, 'defaultPaper', { ...cfg.defaultPaper, paper: paper.code })}
                  >
                    <input
                      type="checkbox"
                      checked={!!isOn}
                      onChange={(e) => togglePaper(block.id, paper.code, e.target.checked)}
                      className="checkbox checkbox-sm"
                    />
                    {paper.name}
                    {isDefaultPaper && <span className="text-warning">★</span>}
                  </label>
                  {isOn && (
                    <div className="flex flex-wrap gap-2 mt-2 ml-6">
                      {DB.weights[paper.code]?.map(w => (
                        <label
                          key={w}
                          className="flex items-center gap-1 text-xs bg-gray-50 px-2 py-1 rounded cursor-pointer"
                          onDoubleClick={() => updateCfg(block.id, 'defaultPaper', { paper: paper.code, weight: w })}
                        >
                          <input
                            type="checkbox"
                            checked={cfg.papers[paper.code]?.includes(w)}
                            onChange={(e) => toggleWeight(block.id, paper.code, w, e.target.checked)}
                            className="checkbox checkbox-xs"
                          />
                          {w}g
                          {cfg.defaultPaper?.paper === paper.code && cfg.defaultPaper?.weight === w && <span className="text-warning ml-1">★</span>}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 컬러 - print 블록과 동일한 스타일 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-500">컬러</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                  <input type="checkbox" className="checkbox checkbox-xs" checked={cfg.printColorLocked} onChange={(e) => updateCfg(block.id, 'printColorLocked', e.target.checked)} />
                  고정
                </label>
                <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                  <input type="checkbox" className="checkbox checkbox-xs" checked={cfg.printColorHidden} onChange={(e) => updateCfg(block.id, 'printColorHidden', e.target.checked)} />
                  숨김
                </label>
              </div>
            </div>
            <div className="flex gap-3">
              <label
                className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                onDoubleClick={() => updateCfg(block.id, 'defaultPrint', { ...cfg.defaultPrint, color: 'color' })}
              >
                <input type="checkbox" checked={cfg.color} onChange={(e) => updateCfg(block.id, 'color', e.target.checked)} className="checkbox checkbox-sm" />
                컬러
                {cfg.defaultPrint?.color === 'color' && <span className="text-warning">★</span>}
              </label>
              <label
                className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                onDoubleClick={() => updateCfg(block.id, 'defaultPrint', { ...cfg.defaultPrint, color: 'mono' })}
              >
                <input type="checkbox" checked={cfg.mono} onChange={(e) => updateCfg(block.id, 'mono', e.target.checked)} className="checkbox checkbox-sm" />
                흑백
                {cfg.defaultPrint?.color === 'mono' && <span className="text-warning">★</span>}
              </label>
            </div>
          </div>

          {/* 면수 - print 블록과 동일한 스타일 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-500">면수</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                  <input type="checkbox" className="checkbox checkbox-xs" checked={cfg.printSideLocked} onChange={(e) => updateCfg(block.id, 'printSideLocked', e.target.checked)} />
                  고정
                </label>
                <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                  <input type="checkbox" className="checkbox checkbox-xs" checked={cfg.printSideHidden} onChange={(e) => updateCfg(block.id, 'printSideHidden', e.target.checked)} />
                  숨김
                </label>
              </div>
            </div>
            <div className="flex gap-3">
              <label
                className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                onDoubleClick={() => updateCfg(block.id, 'defaultPrint', { ...cfg.defaultPrint, side: 'single' })}
              >
                <input type="checkbox" checked={cfg.single} onChange={(e) => updateCfg(block.id, 'single', e.target.checked)} className="checkbox checkbox-sm" />
                단면
                {cfg.defaultPrint?.side === 'single' && <span className="text-warning">★</span>}
              </label>
              <label
                className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                onDoubleClick={() => updateCfg(block.id, 'defaultPrint', { ...cfg.defaultPrint, side: 'double' })}
              >
                <input type="checkbox" checked={cfg.double} onChange={(e) => updateCfg(block.id, 'double', e.target.checked)} className="checkbox checkbox-sm" />
                양면
                {cfg.defaultPrint?.side === 'double' && <span className="text-warning">★</span>}
              </label>
            </div>
          </div>

          {/* 페이지 수 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-500">페이지 수</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                  <input type="checkbox" className="checkbox checkbox-xs" checked={cfg.pagesLocked} onChange={(e) => updateCfg(block.id, 'pagesLocked', e.target.checked)} />
                  고정
                </label>
                <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                  <input type="checkbox" className="checkbox checkbox-xs" checked={cfg.pagesHidden} onChange={(e) => updateCfg(block.id, 'pagesHidden', e.target.checked)} />
                  숨김
                </label>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="text-xs text-gray-400 block mb-1">최소</label>
                <input
                  type="number"
                  value={cfg.min}
                  onChange={(e) => updateCfg(block.id, 'min', parseInt(e.target.value))}
                  className="input input-bordered input-sm w-full"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">단위</label>
                <input
                  type="number"
                  value={cfg.step}
                  onChange={(e) => updateCfg(block.id, 'step', parseInt(e.target.value))}
                  className="input input-bordered input-sm w-full"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">기본값</label>
                <input
                  type="number"
                  value={cfg.defaultPages || cfg.min}
                  onChange={(e) => updateCfg(block.id, 'defaultPages', parseInt(e.target.value))}
                  className="input input-bordered input-sm w-full"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">두께제한</label>
                <input
                  type="number"
                  step="0.1"
                  value={cfg.maxThickness || ''}
                  onChange={(e) => updateCfg(block.id, 'maxThickness', e.target.value ? parseFloat(e.target.value) : null)}
                  className="input input-bordered input-sm w-full"
                  placeholder="mm"
                />
              </div>
            </div>
          </div>
        </div>
      );

    default:
      return <p className="text-xs text-gray-400">설정 없음</p>;
  }
}

export default BlockSettings;
