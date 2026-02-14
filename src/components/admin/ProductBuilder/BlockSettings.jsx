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

import BlockNoteEditor from "@/components/admin/BlockNoteEditor";
import {
  DB,
  FIXED_DELIVERY_OPTIONS,
  getSpringOptionsDefaults,
  TEMPLATES,
} from "@/lib/builderData";
import { uploadImage } from "@/lib/supabase";

import PaperSelector from "./PaperSelector";

function BlockSettings({
  block,
  updateCfg,
  updateBlockProp,
  toggleSizeOption,
  togglePaper,
  toggleWeight,
  toggleArrayOption,
  addQty,
  removeQty,
  newQtyInput,
  setNewQtyInput,
  allBlocks,
  dbPapersList,
  dbWeights,
  dbSizes,
}) {
  // DB에서 정렬된 용지 목록 사용 (없으면 하드코딩된 목록 폴백)
  const papersList = dbPapersList?.length > 0 ? dbPapersList : DB.papers;
  const weights = dbWeights || DB.weights;
  const sizes = dbSizes || DB.sizeMultipliers;
  const cfg = block.config;

  switch (block.type) {
    case "size":
      return (
        <div>
          {/* 사이즈 모드 선택 */}
          <label className="text-xs text-gray-500 block mb-2">
            사이즈 모드
          </label>
          <select
            value={cfg.mode || "preset"}
            onChange={(e) => updateCfg(block.id, "mode", e.target.value)}
            className="select select-bordered select-sm w-full mb-3"
          >
            <option value="preset">규격 사이즈 (A4, A5, B5 등)</option>
            <option value="custom">커스텀 사이즈 (가로+세로 합 구간)</option>
          </select>

          {/* preset 모드: 기존 사이즈 옵션 */}
          {(cfg.mode || "preset") === "preset" && (
            <>
              <p className="text-xs text-info bg-info/10 px-3 py-2 rounded-lg mb-3">
                더블클릭으로 기본값 설정 (★ 표시)
              </p>
              <label className="text-xs text-gray-500 block mb-2">
                사이즈 옵션
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {Object.entries(sizes).map(([code, info]) => (
                  <label
                    key={code}
                    className="flex items-center gap-1 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                    onDoubleClick={() => updateCfg(block.id, "default", code)}
                  >
                    <input
                      type="checkbox"
                      checked={cfg.options?.includes(code)}
                      onChange={(e) =>
                        toggleSizeOption(block.id, code, e.target.checked)
                      }
                      className="checkbox checkbox-sm"
                    />
                    {info.name}
                    {info.width && info.height && (
                      <span className="text-gray-400 text-xs ml-1">
                        ({info.width}×{info.height})
                      </span>
                    )}
                    {cfg.default === code && (
                      <span className="text-warning ml-1">★</span>
                    )}
                  </label>
                ))}
              </div>
            </>
          )}

          {/* custom 모드: 가로+세로 합 구간 */}
          {cfg.mode === "custom" && (
            <div className="mb-3">
              <label className="text-xs text-gray-500 block mb-2">
                사이즈 구간 (가로+세로 합)
              </label>
              <p className="text-xs text-info bg-info/10 px-3 py-2 rounded-lg mb-3">
                인쇄 가능 최대: 305×455mm (전지 기준)
              </p>
              {(cfg.customOptions || []).map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <input
                    type="number"
                    value={opt.maxSum}
                    onChange={(e) => {
                      const newOpts = [...(cfg.customOptions || [])];
                      newOpts[idx] = {
                        ...newOpts[idx],
                        maxSum: Number(e.target.value),
                        label: `${e.target.value}mm`,
                      };
                      updateCfg(block.id, "customOptions", newOpts);
                    }}
                    className="input input-bordered input-sm w-24"
                    placeholder="합계mm"
                  />
                  <span className="text-xs text-gray-400">mm</span>
                  <span className="text-xs text-gray-500">배수:</span>
                  <input
                    type="number"
                    value={opt.multiplier}
                    onChange={(e) => {
                      const newOpts = [...(cfg.customOptions || [])];
                      newOpts[idx] = {
                        ...newOpts[idx],
                        multiplier: Number(e.target.value),
                      };
                      updateCfg(block.id, "customOptions", newOpts);
                    }}
                    className="input input-bordered input-sm w-16"
                    placeholder="배수"
                  />
                  <button
                    className="btn btn-ghost btn-sm text-error"
                    onClick={() => {
                      const newOpts = (cfg.customOptions || []).filter(
                        (_, i) => i !== idx
                      );
                      updateCfg(block.id, "customOptions", newOpts);
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                className="btn btn-ghost btn-sm text-primary"
                onClick={() => {
                  const newOpts = [
                    ...(cfg.customOptions || []),
                    { label: "300mm", maxSum: 300, multiplier: 4 },
                  ];
                  updateCfg(block.id, "customOptions", newOpts);
                }}
              >
                + 구간 추가
              </button>
            </div>
          )}

          {/* 공통: 재단 설정 */}
          <div className="border-t border-gray-200 pt-3 mt-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={cfg.trimEnabled || false}
                onChange={(e) =>
                  updateCfg(block.id, "trimEnabled", e.target.checked)
                }
                className="checkbox checkbox-sm"
              />
              재단 상품 (사이즈 아래 주의사항 표시)
            </label>
            {cfg.trimEnabled && (
              <div className="mt-2 ml-6 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">재단 여백:</span>
                  <input
                    type="number"
                    value={cfg.bleed ?? 2}
                    min={1}
                    max={10}
                    onChange={(e) =>
                      updateCfg(block.id, "bleed", Number(e.target.value))
                    }
                    className="input input-bordered input-sm w-16"
                  />
                  <span className="text-xs text-gray-400">mm (상하좌우)</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-gray-200">
                  <span className="text-xs font-medium text-gray-700 block mb-1">
                    주의사항 내용
                  </span>
                  <p className="text-xs text-gray-400 mb-2">
                    비워두면 기본 텍스트가 표시됩니다. 글머리 기호(•)로 작성하면
                    목록으로 표시돼요.
                  </p>
                  <BlockNoteEditor
                    initialContent={cfg.trimNotice ?? ""}
                    onChange={(html) =>
                      updateCfg(block.id, "trimNotice", html || undefined)
                    }
                    height="120px"
                    placeholder="• 재단 여백(2mm)을 포함한 사이즈로 제공해 주시면 가장 좋아요&#10;• 정사이즈 파일 제공 시, 가장자리에 이미지가 닿아 있으면 살짝 확대 후 재단하며 1~2mm 잘릴 수 있어요&#10;• 선택한 사이즈와 다른 파일은 비율에 맞게 조정하며, 여백이 생기거나 일부가 잘릴 수 있어요"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      );

    case "paper":
      // 커스텀 용지 모드 (외주블록용 — DB 무관, 라벨만 자유 편집)
      if (cfg.customPapers) {
        const cp = cfg.customPapers || [];
        const isDefaultPaperFn = (paperId) => cfg.default?.paper === paperId;
        return (
          <div>
            {/* 용지 역할 — 표지/내지 구분 */}
            <div className="mb-3 p-3 bg-white rounded-lg border border-gray-200">
              <label className="text-xs text-gray-500 block mb-1">
                용지 역할
              </label>
              <select
                value={cfg.role || "default"}
                onChange={(e) =>
                  updateCfg(
                    block.id,
                    "role",
                    e.target.value === "default" ? undefined : e.target.value
                  )
                }
                className="select select-bordered select-sm w-full"
              >
                <option value="default">기본 (단층 상품)</option>
                <option value="cover">표지 용지</option>
                <option value="inner">내지 용지</option>
              </select>
            </div>
            <p className="text-xs text-info bg-info/10 px-3 py-2 rounded-lg mb-3">
              더블클릭으로 기본값 설정 (★ 표시). 용지명을 자유롭게 수정
              가능합니다.
            </p>
            {cp.map((p, i) => {
              const isDefault = isDefaultPaperFn(p.id);
              return (
                <div
                  key={p.id || i}
                  className="mb-2 p-3 bg-white rounded-lg border border-gray-200"
                >
                  <div
                    className="flex items-center gap-2 text-sm font-medium"
                    onDoubleClick={(e) => {
                      if (e.target.tagName === "INPUT") return;
                      updateCfg(block.id, "default", {
                        paper: p.id,
                        weight: p.weights?.[0] || 0,
                      });
                    }}
                  >
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateCfg(block.id, "customPapers", (prev) =>
                          (prev || []).map((pp, j) =>
                            j === i ? { ...pp, name: val } : pp
                          )
                        );
                      }}
                      className="input input-bordered input-xs flex-1"
                      placeholder="용지 이름"
                    />
                    {isDefault && <span className="text-warning">★</span>}
                    {/* 이미지 */}
                    {p.image ? (
                      <div className="relative w-8 h-8 rounded overflow-hidden border flex-shrink-0">
                        <img
                          src={p.image}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => {
                            updateCfg(block.id, "customPapers", (prev) =>
                              (prev || []).map((pp, j) =>
                                j === i ? { ...pp, image: null } : pp
                              )
                            );
                          }}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-3.5 h-3.5 text-[9px] flex items-center justify-center"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <label className="btn btn-xs btn-ghost text-gray-400 cursor-pointer flex-shrink-0">
                        img
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const url = await uploadImage(file, "products");
                              updateCfg(block.id, "customPapers", (prev) =>
                                (prev || []).map((pp, j) =>
                                  j === i ? { ...pp, image: url } : pp
                                )
                              );
                            } catch (err) {
                              console.error("이미지 업로드 실패:", err);
                            }
                          }}
                        />
                      </label>
                    )}
                    <button
                      onClick={() =>
                        updateCfg(block.id, "customPapers", (prev) =>
                          (prev || []).filter((_, j) => j !== i)
                        )
                      }
                      className="btn btn-xs btn-ghost text-red-400 flex-shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                  {/* 평량 */}
                  <div className="flex flex-wrap gap-2 mt-2 ml-6">
                    {(p.weights || []).map((w, wi) => (
                      <span
                        key={wi}
                        className="group/wt flex items-center gap-1 text-xs bg-gray-50 px-2 py-1 rounded cursor-pointer hover:bg-gray-100 select-none"
                        onDoubleClick={() =>
                          updateCfg(block.id, "default", {
                            paper: p.id,
                            weight: w,
                          })
                        }
                      >
                        {w}g
                        {isDefault && cfg.default?.weight === w && (
                          <span className="text-warning ml-1">★</span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateCfg(block.id, "customPapers", (prev) =>
                              (prev || []).map((pp, j) =>
                                j === i
                                  ? {
                                      ...pp,
                                      weights: (pp.weights || []).filter(
                                        (v) => v !== w
                                      ),
                                    }
                                  : pp
                              )
                            );
                          }}
                          className="hidden group-hover/wt:inline text-red-300 hover:text-red-500 ml-0.5"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                    <input
                      type="number"
                      placeholder="g"
                      id={`wt-input-${p.id}`}
                      className="input input-bordered input-xs w-14"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const val = Number(e.target.value);
                          if (val > 0) {
                            updateCfg(block.id, "customPapers", (prev) =>
                              (prev || []).map((pp, j) =>
                                j === i
                                  ? {
                                      ...pp,
                                      weights: (pp.weights || []).includes(val)
                                        ? pp.weights
                                        : [...(pp.weights || []), val],
                                    }
                                  : pp
                              )
                            );
                            e.target.value = "";
                          }
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById(
                          `wt-input-${p.id}`
                        );
                        const val = Number(input?.value);
                        if (val > 0) {
                          updateCfg(block.id, "customPapers", (prev) =>
                            (prev || []).map((pp, j) =>
                              j === i
                                ? {
                                    ...pp,
                                    weights: (pp.weights || []).includes(val)
                                      ? pp.weights
                                      : [...(pp.weights || []), val],
                                  }
                                : pp
                            )
                          );
                          if (input) input.value = "";
                        }
                      }}
                      className="btn btn-xs btn-ghost text-gray-500"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
            <button
              onClick={() =>
                updateCfg(block.id, "customPapers", (prev) => [
                  ...(prev || []),
                  { id: `paper_${Date.now()}`, name: "새 용지", weights: [80] },
                ])
              }
              className="btn btn-xs btn-outline mt-2"
            >
              + 용지 추가
            </button>
          </div>
        );
      }
      // 기존 DB 용지 모드
      return (
        <div>
          {/* 용지 역할 — 제본 상품에서 표지/내지 구분 */}
          <div className="mb-3 p-3 bg-white rounded-lg border border-gray-200">
            <label className="text-xs text-gray-500 block mb-1">
              용지 역할
            </label>
            <select
              value={cfg.role || "default"}
              onChange={(e) =>
                updateCfg(
                  block.id,
                  "role",
                  e.target.value === "default" ? undefined : e.target.value
                )
              }
              className="select select-bordered select-sm w-full"
            >
              <option value="default">기본 (단층 상품)</option>
              <option value="cover">표지 용지</option>
              <option value="inner">내지 용지</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">
              제본 상품에서 동일 용지 블록을 여러 개 사용할 때 역할을
              지정합니다.
            </p>
          </div>
          <p className="text-xs text-info bg-info/10 px-3 py-2 rounded-lg mb-3">
            더블클릭으로 기본값 설정 (★ 표시)
          </p>
          <PaperSelector
            blockId={block.id}
            papers={papersList}
            weights={weights}
            selectedPapers={cfg.papers || {}}
            defaultValue={cfg.default}
            togglePaper={togglePaper}
            toggleWeight={toggleWeight}
            onDefaultPaper={(code, isAlready) =>
              updateCfg(block.id, "default", {
                ...cfg.default,
                paper: isAlready ? null : code,
              })
            }
            onDefaultWeight={(code, w, isDefaultPaper) =>
              updateCfg(block.id, "default", {
                ...cfg.default,
                weight: cfg.default?.weight === w && isDefaultPaper ? null : w,
              })
            }
            label="용지 선택"
          />
        </div>
      );

    case "pp":
      return (
        <div>
          <label className="text-xs text-gray-500 block mb-2">PP 옵션</label>
          <div className="flex flex-wrap gap-3">
            {[
              { code: "clear", name: "투명" },
              { code: "frosted", name: "불투명" },
              { code: "none", name: "없음" },
            ].map((opt) => (
              <label
                key={opt.code}
                className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={cfg.options?.includes(opt.code)}
                  onChange={(e) =>
                    toggleArrayOption(block.id, opt.code, e.target.checked)
                  }
                  className="checkbox checkbox-sm"
                />
                {opt.name}
              </label>
            ))}
          </div>
          <div className="mt-3">
            <label className="text-xs text-gray-500 block mb-1">기본값</label>
            <select
              value={cfg.default || ""}
              onChange={(e) => updateCfg(block.id, "default", e.target.value)}
              className="select select-bordered select-sm"
            >
              {cfg.options?.map((o) => (
                <option key={o} value={o}>
                  {o === "clear" ? "투명" : o === "frosted" ? "불투명" : "없음"}
                </option>
              ))}
            </select>
          </div>
        </div>
      );

    case "cover_print":
      return (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-2">
              표지인쇄 옵션
            </label>
            <div className="flex flex-wrap gap-3">
              {[
                { code: "none", name: "없음 (내지가 첫페이지)" },
                { code: "front_only", name: "앞표지만 인쇄" },
                { code: "front_back", name: "앞뒤표지 인쇄" },
              ].map((opt) => (
                <label
                  key={opt.code}
                  className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={cfg.options?.includes(opt.code)}
                    onChange={(e) =>
                      toggleArrayOption(block.id, opt.code, e.target.checked)
                    }
                  />
                  {opt.name}
                </label>
              ))}
            </div>
          </div>

          <div className="alert alert-warning">
            <p className="text-xs font-medium mb-2">⚠️ 연동 규칙</p>
            <p className="text-xs">
              • "앞뒤표지 인쇄" 선택 시 → 뒷판 블록 비활성화
            </p>
            <p className="text-xs">• PP=없음 AND 표지인쇄=없음 → 불가 (에러)</p>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-2">
              표지 용지 (표지인쇄 선택 시 표시)
            </label>
            {papersList.map((paper) => {
              const isOn = cfg.papers && cfg.papers[paper.code];
              return (
                <div
                  key={paper.code}
                  className="mb-2 p-2 bg-white rounded-lg border border-gray-200"
                >
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!isOn}
                      onChange={(e) => {
                        let papersObj = { ...cfg.papers };
                        if (e.target.checked) {
                          papersObj[paper.code] = weights[paper.code]
                            .filter((w) => w >= 150)
                            .slice(0, 3);
                        } else {
                          delete papersObj[paper.code];
                        }
                        updateCfg(block.id, "papers", papersObj);
                      }}
                    />
                    {paper.name}
                  </label>
                  {isOn && (
                    <div className="flex flex-wrap gap-2 mt-2 ml-6">
                      {weights[paper.code]
                        ?.filter((w) => w >= 150)
                        .map((w) => (
                          <label
                            key={w}
                            className="flex items-center gap-1 text-xs bg-gray-50 px-2 py-1 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={cfg.papers[paper.code]?.includes(w)}
                              onChange={(e) => {
                                let papers = { ...cfg.papers };
                                let ws = papers[paper.code] || [];
                                if (e.target.checked) {
                                  if (!ws.includes(w))
                                    ws = [...ws, w].sort((a, b) => a - b);
                                } else {
                                  ws = ws.filter((ww) => ww !== w);
                                }
                                papers[paper.code] = ws;
                                updateCfg(block.id, "papers", papers);
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

    case "print":
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
                onDoubleClick={() =>
                  updateCfg(block.id, "default", {
                    ...cfg.default,
                    color: "color",
                  })
                }
              >
                <input
                  type="checkbox"
                  checked={cfg.color}
                  onChange={(e) =>
                    updateCfg(block.id, "color", e.target.checked)
                  }
                />
                컬러
                {cfg.default?.color === "color" && (
                  <span className="text-warning">★</span>
                )}
              </label>
              <label
                className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                onDoubleClick={() =>
                  updateCfg(block.id, "default", {
                    ...cfg.default,
                    color: "mono",
                  })
                }
              >
                <input
                  type="checkbox"
                  checked={cfg.mono}
                  onChange={(e) =>
                    updateCfg(block.id, "mono", e.target.checked)
                  }
                />
                흑백
                {cfg.default?.color === "mono" && (
                  <span className="text-warning">★</span>
                )}
              </label>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-2">면수</label>
            <div className="flex gap-3">
              <label
                className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                onDoubleClick={() =>
                  updateCfg(block.id, "default", {
                    ...cfg.default,
                    side: "single",
                  })
                }
              >
                <input
                  type="checkbox"
                  checked={cfg.single}
                  onChange={(e) =>
                    updateCfg(block.id, "single", e.target.checked)
                  }
                />
                단면
                {cfg.default?.side === "single" && (
                  <span className="text-warning">★</span>
                )}
              </label>
              <label
                className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                onDoubleClick={() =>
                  updateCfg(block.id, "default", {
                    ...cfg.default,
                    side: "double",
                  })
                }
              >
                <input
                  type="checkbox"
                  checked={cfg.double}
                  onChange={(e) =>
                    updateCfg(block.id, "double", e.target.checked)
                  }
                />
                양면
                {cfg.default?.side === "double" && (
                  <span className="text-warning">★</span>
                )}
              </label>
            </div>
          </div>
        </div>
      );

    case "finishing":
      return (
        <div className="space-y-4">
          <p className="text-xs text-info bg-info/10 px-3 py-2 rounded-lg mb-3">
            더블클릭으로 기본값 설정 (★ 표시)
          </p>
          <div>
            <label className="text-xs text-gray-500 block mb-2">
              기본 후가공
            </label>
            <div className="flex gap-3 flex-wrap">
              <label
                className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                onDoubleClick={() =>
                  updateCfg(block.id, "default", {
                    ...cfg.default,
                    coating: !cfg.default?.coating,
                  })
                }
              >
                <input
                  type="checkbox"
                  checked={cfg.coating?.enabled ?? false}
                  onChange={(e) =>
                    updateCfg(block.id, "coating", {
                      ...cfg.coating,
                      enabled: e.target.checked,
                      matte: true,
                      gloss: true,
                      single: true,
                      double: true,
                    })
                  }
                />
                코팅
                {cfg.default?.coating && (
                  <span className="text-warning ml-1">★</span>
                )}
              </label>
              {cfg.coating?.enabled && (
                <div className="flex gap-2 ml-2 items-center flex-wrap">
                  <label
                    className="flex items-center gap-1 text-sm bg-white px-2 py-1 rounded border border-gray-200 cursor-pointer hover:bg-gray-50"
                    onDoubleClick={() =>
                      updateCfg(block.id, "default", {
                        ...cfg.default,
                        coatingType:
                          cfg.default?.coatingType === "matte" ? null : "matte",
                      })
                    }
                  >
                    <input
                      type="checkbox"
                      checked={cfg.coating?.matte ?? true}
                      onChange={(e) =>
                        updateCfg(block.id, "coating", {
                          ...cfg.coating,
                          matte: e.target.checked,
                        })
                      }
                    />
                    무광
                    {cfg.default?.coatingType === "matte" && (
                      <span className="text-warning ml-1">★</span>
                    )}
                  </label>
                  <label
                    className="flex items-center gap-1 text-sm bg-white px-2 py-1 rounded border border-gray-200 cursor-pointer hover:bg-gray-50"
                    onDoubleClick={() =>
                      updateCfg(block.id, "default", {
                        ...cfg.default,
                        coatingType:
                          cfg.default?.coatingType === "gloss" ? null : "gloss",
                      })
                    }
                  >
                    <input
                      type="checkbox"
                      checked={cfg.coating?.gloss ?? true}
                      onChange={(e) =>
                        updateCfg(block.id, "coating", {
                          ...cfg.coating,
                          gloss: e.target.checked,
                        })
                      }
                    />
                    유광
                    {cfg.default?.coatingType === "gloss" && (
                      <span className="text-warning ml-1">★</span>
                    )}
                  </label>
                  <span className="text-gray-300 mx-1">|</span>
                  <label
                    className="flex items-center gap-1 text-sm bg-white px-2 py-1 rounded border border-gray-200 cursor-pointer hover:bg-gray-50"
                    onDoubleClick={() =>
                      updateCfg(block.id, "default", {
                        ...cfg.default,
                        coatingSide:
                          cfg.default?.coatingSide === "single"
                            ? null
                            : "single",
                      })
                    }
                  >
                    <input
                      type="checkbox"
                      checked={cfg.coating?.single ?? true}
                      onChange={(e) =>
                        updateCfg(block.id, "coating", {
                          ...cfg.coating,
                          single: e.target.checked,
                        })
                      }
                    />
                    단면
                    {cfg.default?.coatingSide === "single" && (
                      <span className="text-warning ml-1">★</span>
                    )}
                  </label>
                  <label
                    className="flex items-center gap-1 text-sm bg-white px-2 py-1 rounded border border-gray-200 cursor-pointer hover:bg-gray-50"
                    onDoubleClick={() =>
                      updateCfg(block.id, "default", {
                        ...cfg.default,
                        coatingSide:
                          cfg.default?.coatingSide === "double"
                            ? null
                            : "double",
                      })
                    }
                  >
                    <input
                      type="checkbox"
                      checked={cfg.coating?.double ?? true}
                      onChange={(e) =>
                        updateCfg(block.id, "coating", {
                          ...cfg.coating,
                          double: e.target.checked,
                        })
                      }
                    />
                    양면
                    {cfg.default?.coatingSide === "double" && (
                      <span className="text-warning ml-1">★</span>
                    )}
                  </label>
                  <span className="text-xs text-gray-400 ml-2">평량기준:</span>
                  <select
                    value={cfg.coating?.linkedPaper || ""}
                    onChange={(e) =>
                      updateCfg(block.id, "coating", {
                        ...cfg.coating,
                        linkedPaper: e.target.value || null,
                      })
                    }
                    className="text-xs px-2 py-1 border border-gray-200 rounded bg-white"
                  >
                    <option value="">자동</option>
                    {allBlocks
                      ?.filter(
                        (b) =>
                          [
                            "paper",
                            "cover_print",
                            "inner_layer_saddle",
                            "inner_layer_leaf",
                          ].includes(b.type) && b.on
                      )
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.label}
                        </option>
                      ))}
                  </select>
                </div>
              )}
              <label
                className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                onDoubleClick={() =>
                  updateCfg(block.id, "default", {
                    ...cfg.default,
                    corner: !cfg.default?.corner,
                  })
                }
              >
                <input
                  type="checkbox"
                  checked={cfg.corner}
                  onChange={(e) =>
                    updateCfg(block.id, "corner", e.target.checked)
                  }
                />
                귀도리
                {cfg.default?.corner && (
                  <span className="text-warning ml-1">★</span>
                )}
              </label>
              <label
                className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                onDoubleClick={() =>
                  updateCfg(block.id, "default", {
                    ...cfg.default,
                    punch: !cfg.default?.punch,
                  })
                }
              >
                <input
                  type="checkbox"
                  checked={cfg.punch}
                  onChange={(e) =>
                    updateCfg(block.id, "punch", e.target.checked)
                  }
                />
                타공
                {cfg.default?.punch && (
                  <span className="text-warning ml-1">★</span>
                )}
              </label>
              <label
                className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                onDoubleClick={() =>
                  updateCfg(block.id, "default", {
                    ...cfg.default,
                    mising: !cfg.default?.mising,
                  })
                }
              >
                <input
                  type="checkbox"
                  checked={cfg.mising}
                  onChange={(e) =>
                    updateCfg(block.id, "mising", e.target.checked)
                  }
                />
                미싱
                {cfg.default?.mising && (
                  <span className="text-warning ml-1">★</span>
                )}
              </label>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-2">
              오시 (접는 선)
            </label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={cfg.osi?.enabled ?? false}
                  onChange={(e) =>
                    updateCfg(block.id, "osi", {
                      ...cfg.osi,
                      enabled: e.target.checked,
                    })
                  }
                />
                오시 사용
              </label>
              {cfg.osi?.enabled && (
                <div className="flex gap-2">
                  {[1, 2, 3].map((n) => (
                    <label
                      key={n}
                      className="flex items-center gap-1 text-sm bg-white px-2 py-1 rounded border border-gray-200 cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={cfg.osi?.options?.includes(n) ?? false}
                        onChange={(e) => {
                          const opts = cfg.osi?.options || [];
                          updateCfg(block.id, "osi", {
                            ...cfg.osi,
                            options: e.target.checked
                              ? [...opts, n]
                              : opts.filter((x) => x !== n),
                          });
                        }}
                      />
                      {n}줄
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-2">
              접지 (접는 회수)
            </label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={cfg.fold?.enabled ?? false}
                  onChange={(e) =>
                    updateCfg(block.id, "fold", {
                      ...cfg.fold,
                      enabled: e.target.checked,
                    })
                  }
                />
                접지 사용
              </label>
              {cfg.fold?.enabled && (
                <div className="flex gap-2">
                  {[2, 3, 4].map((n) => (
                    <label
                      key={n}
                      className="flex items-center gap-1 text-sm bg-white px-2 py-1 rounded border border-gray-200 cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={cfg.fold?.options?.includes(n) ?? false}
                        onChange={(e) => {
                          const opts = cfg.fold?.options || [];
                          updateCfg(block.id, "fold", {
                            ...cfg.fold,
                            options: e.target.checked
                              ? [...opts, n]
                              : opts.filter((x) => x !== n),
                          });
                        }}
                      />
                      {n}단
                    </label>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              * 130g 이상 용지에서 접지 선택 시 오시 자동 활성화 (2단→1줄,
              3단→2줄, 4단→3줄)
            </p>
          </div>
        </div>
      );

    case "back":
      return (
        <div>
          <label className="text-xs text-gray-500 block mb-2">뒷판 옵션</label>
          <div className="flex gap-3">
            {[
              { code: "white", name: "화이트" },
              { code: "black", name: "블랙" },
              { code: "none", name: "없음" },
            ].map((opt) => (
              <label
                key={opt.code}
                className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={cfg.options?.includes(opt.code)}
                  onChange={(e) =>
                    toggleArrayOption(block.id, opt.code, e.target.checked)
                  }
                />
                {opt.name}
              </label>
            ))}
          </div>
        </div>
      );

    case "spring_color":
      return (
        <div>
          <label className="text-xs text-gray-500 block mb-2">
            스프링 색상
          </label>
          <div className="flex gap-3">
            {[
              { code: "black", name: "블랙" },
              { code: "white", name: "화이트" },
            ].map((opt) => (
              <label
                key={opt.code}
                className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={cfg.options?.includes(opt.code)}
                  onChange={(e) =>
                    toggleArrayOption(block.id, opt.code, e.target.checked)
                  }
                />
                {opt.name}
              </label>
            ))}
          </div>
        </div>
      );

    case "spring_options": {
      const {
        ppOptions,
        coverPrintOptions,
        backOptions,
        springColorOptions,
        defaultSpringCfg,
      } = getSpringOptionsDefaults(cfg);

      // 옵션이 cfg에 없으면 기본 템플릿 복사해서 저장하는 함수
      const initializeOptions = () => {
        updateCfg(block.id, "pp", defaultSpringCfg.pp || {});
        updateCfg(block.id, "coverPrint", defaultSpringCfg.coverPrint || {});
        updateCfg(block.id, "back", defaultSpringCfg.back || {});
        updateCfg(block.id, "springColor", defaultSpringCfg.springColor || {});
      };

      const needsInit =
        !cfg.pp?.options?.length &&
        !cfg.coverPrint?.options?.length &&
        !cfg.back?.options?.length &&
        !cfg.springColor?.options?.length;

      return (
        <div className="space-y-4">
          {/* 초기화 버튼 (옵션이 없을 때) */}
          {needsInit && (
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-700 mb-2">
                옵션이 설정되지 않았습니다.
              </p>
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
              <label className="text-xs text-gray-400 font-medium">
                PP (전면 커버)
              </label>
              <div className="flex items-center gap-4">
                {ppOptions.map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                    onDoubleClick={() => {
                      const newOptions = ppOptions.map((o) => ({
                        ...o,
                        default: o.id === opt.id,
                      }));
                      updateCfg(block.id, "pp", {
                        ...(cfg.pp || {}),
                        options: newOptions,
                      });
                    }}
                  >
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={opt.enabled}
                      onChange={(e) => {
                        const newOptions = ppOptions.map((o) =>
                          o.id === opt.id
                            ? { ...o, enabled: e.target.checked }
                            : o
                        );
                        updateCfg(block.id, "pp", {
                          ...(cfg.pp || {}),
                          options: newOptions,
                        });
                      }}
                    />
                    <span className={opt.default ? "font-medium" : ""}>
                      {opt.label}
                    </span>
                    {opt.default && (
                      <span className="text-gray-500 text-xs">★</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* 3열 드롭다운 레이아웃 */}
          <div className="grid grid-cols-3 gap-4">
            {/* 표지인쇄 */}
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <label className="text-xs text-gray-400 font-medium block mb-3">
                표지인쇄
              </label>
              <select
                className="select select-bordered select-sm w-full mb-3"
                value={coverPrintOptions.find((o) => o.default)?.id || ""}
                onChange={(e) => {
                  const newOptions = coverPrintOptions.map((o) => ({
                    ...o,
                    default: o.id === e.target.value,
                  }));
                  updateCfg(block.id, "coverPrint", {
                    ...(cfg.coverPrint || {}),
                    options: newOptions,
                  });
                }}
              >
                {coverPrintOptions
                  .filter((o) => o.enabled)
                  .map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
              </select>
              <div className="space-y-1">
                {coverPrintOptions.map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                  >
                    <input
                      type="checkbox"
                      className="checkbox checkbox-xs"
                      checked={opt.enabled}
                      onChange={(e) => {
                        const newOptions = coverPrintOptions.map((o) =>
                          o.id === opt.id
                            ? { ...o, enabled: e.target.checked }
                            : o
                        );
                        updateCfg(block.id, "coverPrint", {
                          ...(cfg.coverPrint || {}),
                          options: newOptions,
                        });
                      }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {/* 뒷판 */}
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <label className="text-xs text-gray-400 font-medium block mb-3">
                뒷판
              </label>
              <select
                className="select select-bordered select-sm w-full mb-3"
                value={backOptions.find((o) => o.default)?.id || ""}
                onChange={(e) => {
                  const newOptions = backOptions.map((o) => ({
                    ...o,
                    default: o.id === e.target.value,
                  }));
                  updateCfg(block.id, "back", {
                    ...(cfg.back || {}),
                    options: newOptions,
                  });
                }}
              >
                {backOptions
                  .filter((o) => o.enabled)
                  .map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
              </select>
              <div className="space-y-1">
                {backOptions.map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                  >
                    <input
                      type="checkbox"
                      className="checkbox checkbox-xs"
                      checked={opt.enabled}
                      onChange={(e) => {
                        const newOptions = backOptions.map((o) =>
                          o.id === opt.id
                            ? { ...o, enabled: e.target.checked }
                            : o
                        );
                        updateCfg(block.id, "back", {
                          ...(cfg.back || {}),
                          options: newOptions,
                        });
                      }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-300 mt-2 pt-2 border-t border-gray-200">
                앞뒤표지 시 비활성화
              </p>
            </div>

            {/* 스프링 색상 */}
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <label className="text-xs text-gray-400 font-medium block mb-3">
                스프링 색상
              </label>
              <select
                className="select select-bordered select-sm w-full mb-3"
                value={springColorOptions.find((o) => o.default)?.id || ""}
                onChange={(e) => {
                  const newOptions = springColorOptions.map((o) => ({
                    ...o,
                    default: o.id === e.target.value,
                  }));
                  updateCfg(block.id, "springColor", {
                    ...(cfg.springColor || {}),
                    options: newOptions,
                  });
                }}
              >
                {springColorOptions
                  .filter((o) => o.enabled)
                  .map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
              </select>
              <div className="space-y-1">
                {springColorOptions.map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                  >
                    <input
                      type="checkbox"
                      className="checkbox checkbox-xs"
                      checked={opt.enabled}
                      onChange={(e) => {
                        const newOptions = springColorOptions.map((o) =>
                          o.id === opt.id
                            ? { ...o, enabled: e.target.checked }
                            : o
                        );
                        updateCfg(block.id, "springColor", {
                          ...(cfg.springColor || {}),
                          options: newOptions,
                        });
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
            <label className="text-xs text-gray-400 font-medium block mb-3">
              표지 용지 (앞표지/앞뒤표지 선택 시)
            </label>
            <div className="grid grid-cols-2 gap-4">
              {papersList.map((paper) => {
                const isOn =
                  cfg.coverPrint?.papers && cfg.coverPrint.papers[paper.code];
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
                            papersObj[paper.code] = weights[paper.code]
                              .filter((w) => w >= 150)
                              .slice(0, 3);
                          } else {
                            delete papersObj[paper.code];
                          }
                          updateCfg(block.id, "coverPrint", {
                            ...cfg.coverPrint,
                            papers: papersObj,
                          });
                        }}
                      />
                      <span className="font-medium">{paper.name}</span>
                    </label>
                    {isOn && (
                      <div className="flex flex-wrap gap-1 ml-6">
                        {weights[paper.code]
                          ?.filter((w) => w >= 150)
                          .map((w) => (
                            <label
                              key={w}
                              className="inline-flex items-center gap-1 text-xs bg-gray-50 px-2 py-1 rounded cursor-pointer hover:bg-gray-100 transition-colors"
                            >
                              <input
                                type="checkbox"
                                className="checkbox checkbox-xs"
                                checked={cfg.coverPrint.papers[
                                  paper.code
                                ]?.includes(w)}
                                onChange={(e) => {
                                  let papersObj = { ...cfg.coverPrint.papers };
                                  let ws = papersObj[paper.code] || [];
                                  if (e.target.checked) {
                                    if (!ws.includes(w))
                                      ws = [...ws, w].sort((a, b) => a - b);
                                  } else {
                                    ws = ws.filter((ww) => ww !== w);
                                  }
                                  papersObj[paper.code] = ws;
                                  updateCfg(block.id, "coverPrint", {
                                    ...cfg.coverPrint,
                                    papers: papersObj,
                                  });
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

    case "delivery": {
      // cfg.options에서 고정 ID만 추출 (커스텀 옵션 무시)
      const getOptionConfig = (id) => {
        const opt = cfg.options?.find((o) => o.id === id);
        if (opt) return opt;
        // 없으면 기본값
        const fixedOpt = FIXED_DELIVERY_OPTIONS.find((o) => o.id === id);
        return {
          id,
          enabled: true,
          percent: fixedOpt?.defaultPercent || 0,
        };
      };

      // 옵션 업데이트 - 항상 고정 4개 ID만 저장
      const updateDeliveryOption = (optId, field, value) => {
        // 고정 ID가 아니면 무시
        if (!FIXED_DELIVERY_OPTIONS.find((o) => o.id === optId)) return;

        // 고정 4개 옵션으로 새 배열 생성
        const newOptions = FIXED_DELIVERY_OPTIONS.map((fixedOpt) => {
          const current = getOptionConfig(fixedOpt.id);
          if (fixedOpt.id === optId) {
            return { ...current, id: fixedOpt.id, [field]: value };
          }
          return { ...current, id: fixedOpt.id };
        });
        updateCfg(block.id, "options", newOptions);
      };

      // 리셋 함수 - 기본값으로 초기화
      const resetToDefault = () => {
        const defaultOptions = FIXED_DELIVERY_OPTIONS.map((o) => ({
          id: o.id,
          enabled: true,
          percent: o.defaultPercent,
        }));
        updateCfg(block.id, "options", defaultOptions);
        updateCfg(block.id, "default", "next2");
      };

      return (
        <div className="space-y-4">
          {/* 출고 기준 마감시간 */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <label className="text-xs text-blue-700 font-medium block mb-2">
              출고 기준 마감시간
            </label>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={cfg.cutoffTime || "14:00"}
                onChange={(e) =>
                  updateCfg(block.id, "cutoffTime", e.target.value)
                }
                className="input input-bordered input-sm w-32"
              />
              <span className="text-xs text-blue-600">
                이후 주문은 다음 영업일 기준
              </span>
            </div>
          </div>

          {/* 출고일 옵션 목록 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-500">
                출고일 옵션 (고정 4개)
              </label>
              <button
                onClick={resetToDefault}
                className="text-xs text-blue-500 hover:underline"
              >
                기본값으로 리셋
              </button>
            </div>
            <div className="space-y-2">
              {FIXED_DELIVERY_OPTIONS.map((fixedOpt) => {
                const cfgOpt = getOptionConfig(fixedOpt.id);
                const isEnabled = cfgOpt.enabled !== false;
                const percent = cfgOpt.percent ?? fixedOpt.defaultPercent;
                const isDefault = cfg.default === fixedOpt.id;

                const optMessage = cfgOpt.message || "";

                return (
                  <div key={fixedOpt.id} className="space-y-1">
                    <div
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${isEnabled ? "bg-white" : "bg-gray-50"}`}
                      onDoubleClick={() =>
                        updateCfg(block.id, "default", fixedOpt.id)
                      }
                    >
                      {/* 활성화 체크박스 */}
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) =>
                          updateDeliveryOption(
                            fixedOpt.id,
                            "enabled",
                            e.target.checked
                          )
                        }
                        className="checkbox checkbox-sm"
                      />

                      {/* 라벨 (고정) */}
                      <span
                        className={`w-20 text-sm ${isEnabled ? "text-gray-700" : "text-gray-400"}`}
                      >
                        {fixedOpt.label}
                      </span>

                      {/* 영업일 수 표시 */}
                      <span className="text-xs text-gray-400 w-16">
                        {fixedOpt.days === 0
                          ? "출고 당일"
                          : `+${fixedOpt.days}영업일`}
                      </span>

                      {/* 기본값 표시 */}
                      {isDefault && (
                        <span className="text-warning text-sm">★</span>
                      )}

                      {/* percent 입력 */}
                      <div className="flex items-center gap-1 ml-auto">
                        <input
                          type="number"
                          value={percent}
                          onChange={(e) =>
                            updateDeliveryOption(
                              fixedOpt.id,
                              "percent",
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="w-16 px-2 py-1 border rounded text-sm text-center"
                          disabled={!isEnabled}
                        />
                        <span className="text-xs text-gray-400">%</span>
                      </div>

                      {/* percent 표시 */}
                      <span
                        className={`text-xs w-14 text-right ${percent > 0 ? "text-red-500" : percent < 0 ? "text-blue-500" : "text-gray-500"}`}
                      >
                        {percent > 0
                          ? `+${percent}%`
                          : percent === 0
                            ? "기준가"
                            : `${percent}%`}
                      </span>
                    </div>
                    {/* 옵션별 안내 메시지 */}
                    {isEnabled && (
                      <input
                        type="text"
                        value={optMessage}
                        onChange={(e) =>
                          updateDeliveryOption(
                            fixedOpt.id,
                            "message",
                            e.target.value
                          )
                        }
                        placeholder="안내 메시지 (비워두면 미표시)"
                        className="input input-bordered input-xs w-full ml-7 text-orange-600 placeholder:text-gray-300"
                        style={{ maxWidth: "calc(100% - 1.75rem)" }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              더블클릭으로 기본값 설정 (★)
            </p>
          </div>
        </div>
      );
    }

    case "quantity":
      return (
        <div>
          <p className="text-xs text-info bg-info/10 px-3 py-2 rounded-lg mb-3">
            더블클릭으로 기본값 설정 (★ 표시)
          </p>
          <label className="text-xs text-gray-500 block mb-2">수량 옵션</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {cfg.options?.map((q) => (
              <span
                key={q}
                className="inline-flex items-center gap-1 px-3 py-1 bg-gray-50 text-gray-700 rounded-lg text-sm cursor-pointer hover:bg-gray-100"
                onDoubleClick={() => updateCfg(block.id, "default", q)}
              >
                {q}부
                {cfg.default === q && <span className="text-warning">★</span>}
                <button
                  onClick={() => removeQty(block.id, q)}
                  className="text-gray-400 hover:text-error ml-1"
                >
                  ×
                </button>
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
              onClick={() => {
                addQty(block.id, parseInt(newQtyInput));
                setNewQtyInput("");
              }}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-semibold hover:bg-gray-900"
            >
              추가
            </button>
          </div>
          <div className="divider my-3" />
          <label className="flex items-center gap-2 text-sm cursor-pointer mb-3">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={cfg.showUnitPrice !== false}
              onChange={(e) =>
                updateCfg(block.id, "showUnitPrice", e.target.checked)
              }
            />
            1부당 단가 표시
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer mb-3">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={cfg.allowCustom || false}
              onChange={(e) =>
                updateCfg(block.id, "allowCustom", e.target.checked)
              }
            />
            직접입력 허용
          </label>
          {cfg.allowCustom && (
            <div className="flex gap-3">
              <label className="flex-1">
                <span className="text-xs text-gray-500">최소 수량</span>
                <input
                  type="number"
                  className="input input-bordered input-sm w-full"
                  value={cfg.min ?? 10}
                  onChange={(e) =>
                    updateCfg(block.id, "min", parseInt(e.target.value) || 10)
                  }
                />
              </label>
              <label className="flex-1">
                <span className="text-xs text-gray-500">최대 수량</span>
                <input
                  type="number"
                  className="input input-bordered input-sm w-full"
                  value={cfg.max ?? 5000}
                  onChange={(e) =>
                    updateCfg(block.id, "max", parseInt(e.target.value) || 5000)
                  }
                />
              </label>
            </div>
          )}
          <div className="divider my-3" />
          <label className="text-xs text-gray-500 block mb-2">
            고객센터 문의 안내
          </label>
          <div className="flex gap-3 mb-3">
            <label className="flex-1">
              <span className="text-xs text-gray-500">
                문의 기준 수량 (0=사용안함)
              </span>
              <input
                type="number"
                className="input input-bordered input-sm w-full"
                value={cfg.contactThreshold ?? 0}
                onChange={(e) =>
                  updateCfg(
                    block.id,
                    "contactThreshold",
                    parseInt(e.target.value) || 0
                  )
                }
              />
            </label>
          </div>
          {cfg.contactThreshold > 0 && (
            <label className="flex-1">
              <span className="text-xs text-gray-500">안내 문구</span>
              <input
                type="text"
                className="input input-bordered input-sm w-full"
                value={cfg.contactMessage ?? ""}
                placeholder="주문 전 고객센터로 문의해주세요."
                onChange={(e) =>
                  updateCfg(block.id, "contactMessage", e.target.value)
                }
              />
            </label>
          )}
          <div className="divider my-3" />
          <label className="text-xs text-gray-500 block mb-2">가격 절삭</label>
          <div className="flex items-center gap-3 mb-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={cfg.roundEnabled ?? false}
                onChange={(e) =>
                  updateCfg(block.id, "roundEnabled", e.target.checked)
                }
                className="checkbox checkbox-sm"
              />
              <span>절삭 사용</span>
            </label>
          </div>
          {cfg.roundEnabled && (
            <div className="flex gap-3">
              <label className="flex-1">
                <span className="text-xs text-gray-500">절삭 단위 (원)</span>
                <select
                  className="select select-bordered select-sm w-full"
                  value={cfg.roundUnit ?? 100}
                  onChange={(e) =>
                    updateCfg(block.id, "roundUnit", parseInt(e.target.value))
                  }
                >
                  <option value={10}>10원</option>
                  <option value={100}>100원</option>
                  <option value={1000}>1,000원</option>
                </select>
              </label>
              <label className="flex-1">
                <span className="text-xs text-gray-500">절삭 방식</span>
                <select
                  className="select select-bordered select-sm w-full"
                  value={cfg.roundMethod ?? "floor"}
                  onChange={(e) =>
                    updateCfg(block.id, "roundMethod", e.target.value)
                  }
                >
                  <option value="floor">내림</option>
                  <option value="round">반올림</option>
                  <option value="ceil">올림</option>
                </select>
              </label>
            </div>
          )}
        </div>
      );

    case "pages_saddle":
    case "pages_leaf":
    case "pages":
      return (
        <div className="space-y-4">
          {/* 페이지 수 범위 */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                최소 (p)
              </label>
              <input
                type="number"
                value={cfg.min}
                onChange={(e) =>
                  updateCfg(block.id, "min", parseInt(e.target.value))
                }
                className="w-full select select-bordered select-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">단위</label>
              <input
                type="number"
                value={cfg.step}
                onChange={(e) =>
                  updateCfg(block.id, "step", parseInt(e.target.value))
                }
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
                onChange={(e) =>
                  updateCfg(block.id, "default", parseInt(e.target.value))
                }
                className="w-full select select-bordered select-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                두께제한 (mm)
              </label>
              <input
                type="number"
                value={cfg.maxThickness || ""}
                step="0.1"
                min="0"
                placeholder="예: 2.5"
                onChange={(e) =>
                  updateCfg(
                    block.id,
                    "maxThickness",
                    parseFloat(e.target.value) || null
                  )
                }
                className="w-full select select-bordered select-sm"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400">
            💡 두께제한: 중철 2.5mm, 무선 50mm, 스프링 20mm 권장.
            용지+평량+페이지로 두께 자동 계산되어 초과 시 에러 표시.
          </p>

          {/* 제본 타입 선택 (pages 타입 + 외주블록 아닐 때만) */}
          {block.type === "pages" && block.source !== "outsourced" && (
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <label className="text-xs text-gray-600 font-medium block mb-2">
                제본 타입
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`bindingType_${block.id}`}
                    checked={cfg.bindingType === "saddle"}
                    onChange={() =>
                      updateCfg(block.id, "bindingType", "saddle")
                    }
                  />
                  <span className="text-sm">중철 (4p 표지 분리)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`bindingType_${block.id}`}
                    checked={cfg.bindingType === "leaf"}
                    onChange={() => updateCfg(block.id, "bindingType", "leaf")}
                  />
                  <span className="text-sm">낱장 (무선/스프링)</span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                📌 수식:{" "}
                {cfg.bindingType === "saddle"
                  ? "내지 페이지 = 총 페이지 - 4 (표지 제외)"
                  : "내지 페이지 = 입력값 그대로"}
              </p>
            </div>
          )}

          {/* 연동 블록 선택 UI - bindingType이 설정된 경우 + 외주 아닐 때만 */}
          {block.type === "pages" &&
            block.source !== "outsourced" &&
            cfg.bindingType && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <label className="text-xs text-amber-700 font-medium block mb-3">
                  연동 블록 선택 (필수)
                </label>
                <p className="text-xs text-amber-600 mb-3">
                  페이지 수에 따라 용지/인쇄 비용을 계산할 블록을 선택하세요.
                </p>

                {/* 중철일 때: 내지 블록만 선택 (표지는 별도 계산됨) */}
                {cfg.bindingType === "saddle" && (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-500">
                      표지는 별도 옵션에서 자동 계산됩니다. 내지만 연동하세요.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">
                          내지 용지 블록
                        </label>
                        <select
                          value={cfg.linkedBlocks?.innerPaper || ""}
                          onChange={(e) =>
                            updateCfg(block.id, "linkedBlocks", {
                              ...cfg.linkedBlocks,
                              innerPaper: parseInt(e.target.value) || null,
                            })
                          }
                          className={`select select-bordered select-sm w-full ${!cfg.linkedBlocks?.innerPaper ? "border-error" : ""}`}
                        >
                          <option value="">선택하세요</option>
                          {allBlocks
                            ?.filter(
                              (b) => b.type === "paper" && b.id !== block.id
                            )
                            .map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.label} (ID: {b.id})
                              </option>
                            ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">
                          내지 인쇄 블록
                        </label>
                        <select
                          value={cfg.linkedBlocks?.innerPrint || ""}
                          onChange={(e) =>
                            updateCfg(block.id, "linkedBlocks", {
                              ...cfg.linkedBlocks,
                              innerPrint: parseInt(e.target.value) || null,
                            })
                          }
                          className={`select select-bordered select-sm w-full ${!cfg.linkedBlocks?.innerPrint ? "border-error" : ""}`}
                        >
                          <option value="">선택하세요</option>
                          {allBlocks
                            ?.filter(
                              (b) => b.type === "print" && b.id !== block.id
                            )
                            .map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.label} (ID: {b.id})
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* 낱장(무선/스프링)일 때: 내지 블록만 선택 (2개) */}
                {cfg.bindingType === "leaf" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">
                        내지 용지 블록
                      </label>
                      <select
                        value={cfg.linkedBlocks?.innerPaper || ""}
                        onChange={(e) =>
                          updateCfg(block.id, "linkedBlocks", {
                            ...cfg.linkedBlocks,
                            innerPaper: parseInt(e.target.value) || null,
                          })
                        }
                        className={`select select-bordered select-sm w-full ${!cfg.linkedBlocks?.innerPaper ? "border-error" : ""}`}
                      >
                        <option value="">선택하세요</option>
                        {allBlocks
                          ?.filter(
                            (b) => b.type === "paper" && b.id !== block.id
                          )
                          .map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.label} (ID: {b.id})
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">
                        내지 인쇄 블록
                      </label>
                      <select
                        value={cfg.linkedBlocks?.innerPrint || ""}
                        onChange={(e) =>
                          updateCfg(block.id, "linkedBlocks", {
                            ...cfg.linkedBlocks,
                            innerPrint: parseInt(e.target.value) || null,
                          })
                        }
                        className={`select select-bordered select-sm w-full ${!cfg.linkedBlocks?.innerPrint ? "border-error" : ""}`}
                      >
                        <option value="">선택하세요</option>
                        {allBlocks
                          ?.filter(
                            (b) => b.type === "print" && b.id !== block.id
                          )
                          .map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.label} (ID: {b.id})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* 연동 상태 표시 */}
                {(() => {
                  const hasAllLinks =
                    cfg.bindingType === "saddle"
                      ? cfg.linkedBlocks?.coverPaper &&
                        cfg.linkedBlocks?.coverPrint &&
                        cfg.linkedBlocks?.innerPaper &&
                        cfg.linkedBlocks?.innerPrint
                      : cfg.linkedBlocks?.innerPaper &&
                        cfg.linkedBlocks?.innerPrint;

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

    case "inner_layer_saddle":
    case "inner_layer_leaf":
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
                  <input
                    type="checkbox"
                    className="checkbox checkbox-xs"
                    checked={cfg.paperLocked}
                    onChange={(e) =>
                      updateCfg(block.id, "paperLocked", e.target.checked)
                    }
                  />
                  고정
                </label>
                <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-xs"
                    checked={cfg.paperHidden}
                    onChange={(e) =>
                      updateCfg(block.id, "paperHidden", e.target.checked)
                    }
                  />
                  숨김
                </label>
              </div>
            </div>
            <PaperSelector
              blockId={block.id}
              papers={papersList}
              weights={weights}
              selectedPapers={cfg.papers || {}}
              defaultValue={cfg.defaultPaper}
              togglePaper={togglePaper}
              toggleWeight={toggleWeight}
              onDefaultPaper={(code) =>
                updateCfg(block.id, "defaultPaper", {
                  ...cfg.defaultPaper,
                  paper: code,
                })
              }
              onDefaultWeight={(code, w) =>
                updateCfg(block.id, "defaultPaper", {
                  paper: code,
                  weight: w,
                })
              }
            />
          </div>

          {/* 컬러 - print 블록과 동일한 스타일 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-500">컬러</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-xs"
                    checked={cfg.printColorLocked}
                    onChange={(e) =>
                      updateCfg(block.id, "printColorLocked", e.target.checked)
                    }
                  />
                  고정
                </label>
                <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-xs"
                    checked={cfg.printColorHidden}
                    onChange={(e) =>
                      updateCfg(block.id, "printColorHidden", e.target.checked)
                    }
                  />
                  숨김
                </label>
              </div>
            </div>
            <div className="flex gap-3">
              <label
                className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                onDoubleClick={() =>
                  updateCfg(block.id, "defaultPrint", {
                    ...cfg.defaultPrint,
                    color: "color",
                  })
                }
              >
                <input
                  type="checkbox"
                  checked={cfg.color}
                  onChange={(e) =>
                    updateCfg(block.id, "color", e.target.checked)
                  }
                  className="checkbox checkbox-sm"
                />
                컬러
                {cfg.defaultPrint?.color === "color" && (
                  <span className="text-warning">★</span>
                )}
              </label>
              <label
                className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                onDoubleClick={() =>
                  updateCfg(block.id, "defaultPrint", {
                    ...cfg.defaultPrint,
                    color: "mono",
                  })
                }
              >
                <input
                  type="checkbox"
                  checked={cfg.mono}
                  onChange={(e) =>
                    updateCfg(block.id, "mono", e.target.checked)
                  }
                  className="checkbox checkbox-sm"
                />
                흑백
                {cfg.defaultPrint?.color === "mono" && (
                  <span className="text-warning">★</span>
                )}
              </label>
            </div>
          </div>

          {/* 면수 - print 블록과 동일한 스타일 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-500">면수</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-xs"
                    checked={cfg.printSideLocked}
                    onChange={(e) =>
                      updateCfg(block.id, "printSideLocked", e.target.checked)
                    }
                  />
                  고정
                </label>
                <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-xs"
                    checked={cfg.printSideHidden}
                    onChange={(e) =>
                      updateCfg(block.id, "printSideHidden", e.target.checked)
                    }
                  />
                  숨김
                </label>
              </div>
            </div>
            <div className="flex gap-3">
              <label
                className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                onDoubleClick={() =>
                  updateCfg(block.id, "defaultPrint", {
                    ...cfg.defaultPrint,
                    side: "single",
                  })
                }
              >
                <input
                  type="checkbox"
                  checked={cfg.single}
                  onChange={(e) =>
                    updateCfg(block.id, "single", e.target.checked)
                  }
                  className="checkbox checkbox-sm"
                />
                단면
                {cfg.defaultPrint?.side === "single" && (
                  <span className="text-warning">★</span>
                )}
              </label>
              <label
                className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                onDoubleClick={() =>
                  updateCfg(block.id, "defaultPrint", {
                    ...cfg.defaultPrint,
                    side: "double",
                  })
                }
              >
                <input
                  type="checkbox"
                  checked={cfg.double}
                  onChange={(e) =>
                    updateCfg(block.id, "double", e.target.checked)
                  }
                  className="checkbox checkbox-sm"
                />
                양면
                {cfg.defaultPrint?.side === "double" && (
                  <span className="text-warning">★</span>
                )}
              </label>
            </div>
          </div>

          {/* 페이지 수 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-500">페이지 수</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-xs"
                    checked={cfg.pagesLocked}
                    onChange={(e) =>
                      updateCfg(block.id, "pagesLocked", e.target.checked)
                    }
                  />
                  고정
                </label>
                <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-xs"
                    checked={cfg.pagesHidden}
                    onChange={(e) =>
                      updateCfg(block.id, "pagesHidden", e.target.checked)
                    }
                  />
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
                  onChange={(e) =>
                    updateCfg(block.id, "min", parseInt(e.target.value))
                  }
                  className="input input-bordered input-sm w-full"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">단위</label>
                <input
                  type="number"
                  value={cfg.step}
                  onChange={(e) =>
                    updateCfg(block.id, "step", parseInt(e.target.value))
                  }
                  className="input input-bordered input-sm w-full"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  기본값
                </label>
                <input
                  type="number"
                  value={cfg.defaultPages || cfg.min}
                  onChange={(e) =>
                    updateCfg(
                      block.id,
                      "defaultPages",
                      parseInt(e.target.value)
                    )
                  }
                  className="input input-bordered input-sm w-full"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  두께제한
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={cfg.maxThickness || ""}
                  onChange={(e) =>
                    updateCfg(
                      block.id,
                      "maxThickness",
                      e.target.value ? parseFloat(e.target.value) : null
                    )
                  }
                  className="input input-bordered input-sm w-full"
                  placeholder="mm"
                />
              </div>
            </div>
          </div>
        </div>
      );

    case "guide": {
      const guideOptions = cfg.options || [];

      const updateGuideOption = (idx, field, value) => {
        const newOptions = [...guideOptions];
        newOptions[idx] = { ...newOptions[idx], [field]: value };
        updateCfg(block.id, "options", newOptions);
      };

      const addGuideOption = () => {
        const newId = `opt_${Date.now()}`;
        const newOptions = [
          ...guideOptions,
          {
            id: newId,
            label: `옵션 ${guideOptions.length + 1}`,
            hint: "",
            price: 0,
          },
        ];
        updateCfg(block.id, "options", newOptions);
      };

      const removeGuideOption = (idx) => {
        if (guideOptions.length <= 1) return;
        const removed = guideOptions[idx];
        const newOptions = guideOptions.filter((_, i) => i !== idx);
        updateCfg(block.id, "options", newOptions);
        // 삭제된 게 default면 첫 번째로 변경
        if (cfg.default === removed.id) {
          updateCfg(block.id, "default", newOptions[0]?.id || "");
        }
      };

      return (
        <div className="space-y-4">
          {/* 섹션 제목 */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">
              섹션 제목
            </label>
            <input
              type="text"
              value={cfg.title || ""}
              onChange={(e) => updateCfg(block.id, "title", e.target.value)}
              className="input input-bordered input-sm w-full"
              placeholder="질문을 입력하세요"
            />
          </div>

          {/* 옵션 목록 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-500">옵션 목록</label>
              <button
                onClick={addGuideOption}
                className="text-xs text-blue-500 hover:underline"
              >
                + 옵션 추가
              </button>
            </div>
            <div className="space-y-3">
              {guideOptions.map((opt, idx) => {
                const isDefault = cfg.default === opt.id;
                return (
                  <div
                    key={opt.id}
                    className={`p-3 rounded-lg border ${isDefault ? "border-blue-300 bg-blue-50/50" : "border-gray-200 bg-gray-50"}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-gray-400 w-5">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={opt.label || ""}
                        onChange={(e) =>
                          updateGuideOption(idx, "label", e.target.value)
                        }
                        className="input input-bordered input-sm flex-1"
                        placeholder="옵션 라벨"
                      />
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={opt.price || 0}
                          onChange={(e) =>
                            updateGuideOption(
                              idx,
                              "price",
                              Number(e.target.value)
                            )
                          }
                          className="input input-bordered input-sm w-24 text-right"
                        />
                        <span className="text-xs text-gray-400">원</span>
                      </div>
                    </div>
                    <BlockNoteEditor
                      initialContent={opt.hint || ""}
                      onChange={(html) => updateGuideOption(idx, "hint", html)}
                      height="80px"
                      placeholder="설명 (고객에게 표시)"
                    />
                    <div className="flex items-center justify-between mt-1.5">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name={`guide-default-${block.id}`}
                          checked={isDefault}
                          onChange={() =>
                            updateCfg(block.id, "default", opt.id)
                          }
                          className="radio radio-xs"
                        />
                        <span className="text-xs text-gray-500">기본값</span>
                      </label>
                      {guideOptions.length > 1 && (
                        <button
                          onClick={() => removeGuideOption(idx)}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    case "consultation": {
      const faqs = cfg.faqs || [];
      return (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">
              상담 제목
            </label>
            <input
              type="text"
              value={cfg.title || ""}
              onChange={(e) => updateCfg(block.id, "title", e.target.value)}
              className="input input-bordered input-sm w-full"
              placeholder="성진프린트 상담"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">
              안내 메시지
            </label>
            <textarea
              value={cfg.message || ""}
              onChange={(e) => updateCfg(block.id, "message", e.target.value)}
              className="textarea textarea-bordered textarea-sm w-full"
              placeholder="주문 전 궁금한 점이 있으시면..."
              rows={2}
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">
              카카오톡 URL
            </label>
            <input
              type="url"
              value={cfg.kakaoUrl || ""}
              onChange={(e) => updateCfg(block.id, "kakaoUrl", e.target.value)}
              className="input input-bordered input-sm w-full"
              placeholder="https://pf.kakao.com/..."
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">
              버튼 텍스트
            </label>
            <input
              type="text"
              value={cfg.ctaText || ""}
              onChange={(e) => updateCfg(block.id, "ctaText", e.target.value)}
              className="input input-bordered input-sm w-full"
              placeholder="카카오톡으로 상담하기"
            />
          </div>

          <div className="border-t pt-3">
            <label className="text-xs text-gray-500 block mb-2">
              상담 가능 시간
            </label>
            <div className="flex items-center gap-2 mb-1">
              <input
                type="time"
                value={cfg.openTime || "09:00"}
                onChange={(e) =>
                  updateCfg(block.id, "openTime", e.target.value)
                }
                className="input input-bordered input-sm"
              />
              <span className="text-xs text-gray-400">~</span>
              <input
                type="time"
                value={cfg.closeTime || "18:00"}
                onChange={(e) =>
                  updateCfg(block.id, "closeTime", e.target.value)
                }
                className="input input-bordered input-sm"
              />
            </div>
            <p className="text-[11px] text-gray-400 mb-0">
              주말/공휴일은 출고일과 동일하게 자동 휴무 처리됩니다.
            </p>
          </div>

          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-500">자주 묻는 질문</label>
              <button
                type="button"
                onClick={() => {
                  const newId = `faq_${Date.now()}`;
                  updateCfg(block.id, "faqs", [
                    ...faqs,
                    { id: newId, emoji: "❓", text: "" },
                  ]);
                }}
                className="btn btn-xs btn-ghost"
              >
                + 추가
              </button>
            </div>
            {faqs.map((faq, i) => (
              <div
                key={faq.id}
                className="mb-3 border border-gray-200 rounded-lg p-2"
              >
                <div className="flex items-center gap-1 mb-1">
                  <input
                    type="text"
                    value={faq.emoji || ""}
                    onChange={(e) => {
                      const updated = [...faqs];
                      updated[i] = { ...updated[i], emoji: e.target.value };
                      updateCfg(block.id, "faqs", updated);
                    }}
                    className="input input-bordered input-sm w-12 text-center"
                    maxLength={2}
                  />
                  <input
                    type="text"
                    value={faq.text || ""}
                    onChange={(e) => {
                      const updated = [...faqs];
                      updated[i] = { ...updated[i], text: e.target.value };
                      updateCfg(block.id, "faqs", updated);
                    }}
                    className="input input-bordered input-sm flex-1"
                    placeholder="질문 내용"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      updateCfg(
                        block.id,
                        "faqs",
                        faqs.filter((_, j) => j !== i)
                      );
                    }}
                    className="btn btn-xs btn-ghost text-red-400"
                  >
                    ✕
                  </button>
                </div>
                <textarea
                  value={faq.answer || ""}
                  onChange={(e) => {
                    const updated = [...faqs];
                    updated[i] = { ...updated[i], answer: e.target.value };
                    updateCfg(block.id, "faqs", updated);
                  }}
                  className="textarea textarea-bordered textarea-sm w-full mt-1"
                  placeholder="답변 내용"
                  rows={2}
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "design_select": {
      const tiers = cfg.tiers || [];
      return (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">
              소스 테이블
            </label>
            <input
              type="text"
              value={cfg.sourceTable || "edu100_covers"}
              onChange={(e) =>
                updateCfg(block.id, "sourceTable", e.target.value)
              }
              className="input input-bordered input-sm w-full"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">
              태그 필터 (비우면 전체)
            </label>
            <input
              type="text"
              value={cfg.sourceTag || ""}
              onChange={(e) => updateCfg(block.id, "sourceTag", e.target.value)}
              className="input input-bordered input-sm w-full"
              placeholder="예: 국어"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">
              변경 타입 목록
            </label>
            <div className="space-y-2">
              {tiers.map((tier, i) => (
                <div
                  key={tier.id || i}
                  className="flex gap-2 items-center bg-white p-2 rounded border"
                >
                  <input
                    type="text"
                    value={tier.id}
                    onChange={(e) => {
                      const updated = [...tiers];
                      updated[i] = { ...updated[i], id: e.target.value };
                      updateCfg(block.id, "tiers", updated);
                    }}
                    className="input input-bordered input-xs w-20"
                    placeholder="ID"
                  />
                  <input
                    type="text"
                    value={tier.label}
                    onChange={(e) => {
                      const updated = [...tiers];
                      updated[i] = { ...updated[i], label: e.target.value };
                      updateCfg(block.id, "tiers", updated);
                    }}
                    className="input input-bordered input-xs flex-1"
                    placeholder="라벨"
                  />
                  <input
                    type="number"
                    value={tier.price}
                    onChange={(e) => {
                      const updated = [...tiers];
                      updated[i] = {
                        ...updated[i],
                        price: Number(e.target.value),
                      };
                      updateCfg(block.id, "tiers", updated);
                    }}
                    className="input input-bordered input-xs w-24"
                    placeholder="가격"
                  />
                  <input
                    type="number"
                    value={tier.minQty}
                    onChange={(e) => {
                      const updated = [...tiers];
                      updated[i] = {
                        ...updated[i],
                        minQty: Number(e.target.value),
                      };
                      updateCfg(block.id, "tiers", updated);
                    }}
                    className="input input-bordered input-xs w-20"
                    placeholder="최소수량"
                  />
                  <button
                    onClick={() =>
                      updateCfg(
                        block.id,
                        "tiers",
                        tiers.filter((_, j) => j !== i)
                      )
                    }
                    className="btn btn-xs btn-ghost text-red-400"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={() =>
                  updateCfg(block.id, "tiers", [
                    ...tiers,
                    {
                      id: `type_${tiers.length + 1}`,
                      label: "",
                      price: 0,
                      minQty: 20,
                    },
                  ])
                }
                className="btn btn-xs btn-outline"
              >
                + 타입 추가
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">
              기본 타입
            </label>
            <select
              value={cfg.defaultTier || ""}
              onChange={(e) =>
                updateCfg(block.id, "defaultTier", e.target.value)
              }
              className="select select-bordered select-sm w-full"
            >
              {tiers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label || t.id}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={cfg.showImageInLeft ?? true}
              onChange={(e) =>
                updateCfg(block.id, "showImageInLeft", e.target.checked)
              }
              className="checkbox checkbox-xs"
            />
            선택한 디자인 이미지를 왼쪽 컬럼에 표시
          </label>
        </div>
      );
    }

    case "text_input":
      return (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">
              입력 소스
            </label>
            <select
              value={cfg.source || "manual"}
              onChange={(e) => updateCfg(block.id, "source", e.target.value)}
              className="select select-bordered select-sm w-full"
            >
              <option value="manual">기존 텍스트 입력</option>
              <option value="cover">커버 필드 연동</option>
            </select>
          </div>
          {(cfg.source || "manual") === "manual" ? (
            <>
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  안내 문구 (placeholder)
                </label>
                <input
                  type="text"
                  value={cfg.placeholder || ""}
                  onChange={(e) =>
                    updateCfg(block.id, "placeholder", e.target.value)
                  }
                  className="input input-bordered input-sm w-full"
                  placeholder="예: 표지에 넣을 내용을 입력해주세요"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">
                    최대 글자수
                  </label>
                  <input
                    type="number"
                    value={cfg.maxLength || 500}
                    onChange={(e) =>
                      updateCfg(block.id, "maxLength", Number(e.target.value))
                    }
                    className="input input-bordered input-sm w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">
                    줄 수
                  </label>
                  <input
                    type="number"
                    value={cfg.rows || 3}
                    min={1}
                    max={10}
                    onChange={(e) =>
                      updateCfg(block.id, "rows", Number(e.target.value))
                    }
                    className="input input-bordered input-sm w-full"
                  />
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-info bg-info/10 px-3 py-2 rounded-lg">
              edu100 커버의 fields 배열에서 라벨/placeholder를 자동으로
              가져옵니다. 고객이 디자인을 선택하면 해당 커버의 필드가
              표시됩니다.
            </p>
          )}
        </div>
      );

    case "books":
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                최소 권수
              </label>
              <input
                type="number"
                value={cfg.minBooks ?? 1}
                min={1}
                onChange={(e) =>
                  updateCfg(block.id, "minBooks", Number(e.target.value))
                }
                className="input input-bordered input-sm w-full"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                최대 권수
              </label>
              <input
                type="number"
                value={cfg.maxBooks ?? 10}
                min={1}
                onChange={(e) =>
                  updateCfg(block.id, "maxBooks", Number(e.target.value))
                }
                className="input input-bordered input-sm w-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                기본 페이지 수
              </label>
              <input
                type="number"
                value={cfg.defaultPages ?? 100}
                min={4}
                onChange={(e) =>
                  updateCfg(block.id, "defaultPages", Number(e.target.value))
                }
                className="input input-bordered input-sm w-full"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                기본 수량
              </label>
              <input
                type="number"
                value={cfg.defaultQty ?? 30}
                min={1}
                onChange={(e) =>
                  updateCfg(block.id, "defaultQty", Number(e.target.value))
                }
                className="input input-bordered input-sm w-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                페이지 최소
              </label>
              <input
                type="number"
                value={cfg.pagesMin ?? 4}
                min={2}
                onChange={(e) =>
                  updateCfg(block.id, "pagesMin", Number(e.target.value))
                }
                className="input input-bordered input-sm w-full"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                페이지 최대
              </label>
              <input
                type="number"
                value={cfg.pagesMax ?? 500}
                onChange={(e) =>
                  updateCfg(block.id, "pagesMax", Number(e.target.value))
                }
                className="input input-bordered input-sm w-full"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                페이지 단위
              </label>
              <input
                type="number"
                value={cfg.pagesStep ?? 2}
                min={1}
                onChange={(e) =>
                  updateCfg(block.id, "pagesStep", Number(e.target.value))
                }
                className="input input-bordered input-sm w-full"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2 mb-1 font-semibold">
            가격 설정
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                페이지 단가
              </label>
              <input
                type="number"
                value={cfg.pagePrice ?? 40}
                min={0}
                onChange={(e) =>
                  updateCfg(block.id, "pagePrice", Number(e.target.value))
                }
                className="input input-bordered input-sm w-full"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                제본 비용
              </label>
              <input
                type="number"
                value={cfg.bindingFee ?? 1500}
                min={0}
                onChange={(e) =>
                  updateCfg(block.id, "bindingFee", Number(e.target.value))
                }
                className="input input-bordered input-sm w-full"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                무료 디자인 최소 수량
              </label>
              <input
                type="number"
                value={cfg.freeDesignMinQty ?? 100}
                min={0}
                onChange={(e) =>
                  updateCfg(
                    block.id,
                    "freeDesignMinQty",
                    Number(e.target.value)
                  )
                }
                className="input input-bordered input-sm w-full"
              />
            </div>
          </div>
        </div>
      );

    default:
      return <p className="text-xs text-gray-400">설정 없음</p>;
  }
}

export default BlockSettings;
