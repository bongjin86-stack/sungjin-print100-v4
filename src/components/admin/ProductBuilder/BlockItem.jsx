/**
 * BlockItem.jsx
 *
 * AdminBuilder 전용 - 블록 리스트의 각 아이템 UI
 *
 * 주의:
 * - 이 파일은 AdminBuilder에서만 사용됩니다
 * - 블록 설정 패널(BlockSettings)은 별도 파일입니다
 * - 새 블록 타입 추가 시 getBlockSummary도 수정 필요
 */

import { BLOCK_TYPES, DB } from "@/lib/builderData";

// ============================================================
// 블록 아이템 컴포넌트
// ============================================================
function BlockItem({
  block,
  index,
  isDragOver,
  onBlockDragStart,
  onBlockDragOver,
  onBlockDrop,
  onBlockDragEnd,
  isEditing,
  toggleBlock,
  toggleEdit,
  removeBlock,
  labelInput,
  setLabelInput,
  descInput,
  setDescInput,
  applySettings,
  updateBlockProp,
  updateCfg,
  toggleSizeOption,
  togglePaper,
  toggleWeight,
  toggleArrayOption,
  addQty,
  removeQty,
  newQtyInput,
  setNewQtyInput,
  allBlocks,
  dbPapersList = [],
  dbWeights,
  dbSizes,
  BlockSettingsComponent, // BlockSettings 컴포넌트를 props로 받음
}) {
  const blockType = BLOCK_TYPES[block.type] || {
    name: block.type,
    icon: "📦",
    color: "from-stone-100 to-stone-200",
  };

  return (
    <div
      data-block-id={block.id}
      onDragOver={onBlockDragOver}
      onDrop={onBlockDrop}
      className={`rounded-lg border transition-all ${isDragOver ? "border-blue-400 border-t-2" : ""} ${isEditing ? "border-gray-300 bg-gray-50/30" : "border-gray-200"} ${!block.on ? "opacity-40" : ""}`}
    >
      <div className="flex items-center gap-3 p-3">
        <div
          className="drag-handle cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 text-base select-none px-1 -ml-1 transition-colors"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move';
            const blockEl = e.currentTarget.closest('[data-block-id]');
            if (blockEl) e.dataTransfer.setDragImage(blockEl, 20, 20);
            onBlockDragStart?.();
          }}
          onDragEnd={onBlockDragEnd}
        >
          ⋮⋮
        </div>

        <input
          type="checkbox"
          checked={block.on}
          onChange={() => toggleBlock(block.id)}
          className="checkbox checkbox-sm checkbox-neutral"
        />

        <div
          className={`w-9 h-9 rounded-md bg-gradient-to-br ${blockType.color} flex items-center justify-center text-lg`}
        >
          {blockType.icon}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">{block.label}</p>
            {block.optional && (
              <span className="text-xs text-gray-400 px-1.5 py-0.5 bg-gray-50 rounded">
                선택
              </span>
            )}
            {block.locked && (
              <span className="text-xs text-gray-400 px-1.5 py-0.5 bg-gray-50 rounded">
                고정
              </span>
            )}
            {block.hidden && (
              <span className="text-xs text-gray-400 px-1.5 py-0.5 bg-gray-50 rounded">
                숨김
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {block.desc || getBlockSummary(block, dbPapersList, dbSizes)}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            className={`w-8 h-8 flex items-center justify-center rounded text-sm transition-colors ${isEditing ? "bg-neutral text-neutral-content" : "hover:bg-gray-50 text-gray-400"}`}
            onClick={() => toggleEdit(block.id)}
            title="설정"
          >
            ⚙
          </button>
          <button
            className="w-8 h-8 flex items-center justify-center rounded text-sm hover:bg-error/10 hover:text-error text-gray-400 transition-colors"
            onClick={() => removeBlock(block.id)}
            title="삭제"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 설정 패널 */}
      {isEditing && (
        <div className="border-t-2 border-primary/30 bg-gray-50 rounded-b-xl p-4">
          {/* 라벨명 */}
          <div className="mb-4">
            <label className="text-xs text-gray-500 block mb-1">라벨명</label>
            <input
              type="text"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              className="input input-bordered input-sm w-full"
            />
          </div>

          {/* 설명 */}
          <div className="mb-4">
            <label className="text-xs text-gray-500 block mb-1">
              설명 (라벨 아래 표시)
            </label>
            <input
              type="text"
              value={descInput}
              onChange={(e) => setDescInput(e.target.value)}
              placeholder="예: 사이즈를 선택해주세요"
              className="input input-bordered input-sm w-full"
            />
          </div>

          {/* 블록 속성: 선택/필수, 고정, 숨김 */}
          <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-2 font-medium">블록 속성</p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={block.optional}
                  onChange={(e) =>
                    updateBlockProp(block.id, "optional", e.target.checked)
                  }
                  className="checkbox checkbox-sm"
                />
                <span>선택</span>
                <span className="text-xs text-gray-400">
                  (체크 안 하면 필수)
                </span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={block.locked}
                  onChange={(e) =>
                    updateBlockProp(block.id, "locked", e.target.checked)
                  }
                  className="checkbox checkbox-sm"
                />
                <span>고정</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={block.hidden}
                  onChange={(e) =>
                    updateBlockProp(block.id, "hidden", e.target.checked)
                  }
                  className="checkbox checkbox-sm"
                />
                <span>숨김</span>
              </label>
            </div>
          </div>

          {/* 블록별 상세 설정 - BlockSettings 컴포넌트 사용 */}
          {BlockSettingsComponent && (
            <BlockSettingsComponent
              block={block}
              updateCfg={updateCfg}
              updateBlockProp={updateBlockProp}
              toggleSizeOption={toggleSizeOption}
              togglePaper={togglePaper}
              toggleWeight={toggleWeight}
              toggleArrayOption={toggleArrayOption}
              addQty={addQty}
              removeQty={removeQty}
              newQtyInput={newQtyInput}
              setNewQtyInput={setNewQtyInput}
              allBlocks={allBlocks}
              dbPapersList={dbPapersList}
              dbWeights={dbWeights}
              dbSizes={dbSizes}
            />
          )}

          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => toggleEdit(null)}
              className="btn btn-ghost btn-sm"
            >
              취소
            </button>
            <button
              onClick={() => applySettings(block.id, labelInput, descInput)}
              className="btn btn-primary btn-sm"
            >
              ✓ 적용
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 블록 요약 텍스트
// ============================================================
export function getBlockSummary(block, dbPapersList = [], dbSizes = null) {
  const cfg = block.config;
  // DB에서 정렬된 용지 목록 사용 (없으면 하드코딩된 목록 폴백)
  const papersList = dbPapersList?.length > 0 ? dbPapersList : DB.papers;
  const sizes = dbSizes || DB.sizeMultipliers;

  switch (block.type) {
    case "size":
      return (
        cfg.options?.map((s) => sizes[s]?.name || s.toUpperCase()).join(", ") ||
        "-"
      );
    case "paper":
      return (
        Object.keys(cfg.papers || {})
          .map((p) => papersList.find((pp) => pp.code === p)?.name)
          .filter(Boolean)
          .join(", ") || "-"
      );
    case "print":
      const colors = [cfg.color && "컬러", cfg.mono && "흑백"]
        .filter(Boolean)
        .join("/");
      const sides = [cfg.single && "단면", cfg.double && "양면"]
        .filter(Boolean)
        .join("/");
      return `${colors}, ${sides}`;
    case "pp":
      return (
        cfg.options
          ?.map((o) =>
            o === "clear" ? "투명" : o === "frosted" ? "불투명" : "없음"
          )
          .join(", ") || "-"
      );
    case "cover_print":
      return (
        cfg.options
          ?.map((o) =>
            o === "none" ? "없음" : o === "front_only" ? "앞표지만" : "앞뒤표지"
          )
          .join(", ") || "-"
      );
    case "back":
      return (
        cfg.options
          ?.map((o) =>
            o === "white" ? "화이트" : o === "black" ? "블랙" : "없음"
          )
          .join(", ") || "-"
      );
    case "spring_color":
      return (
        cfg.options
          ?.map((o) => (o === "black" ? "블랙" : "화이트"))
          .join(", ") || "-"
      );
    case "spring_options":
      const ppOpts =
        cfg.pp?.options
          ?.filter((o) => o.enabled)
          .map((o) => o.label)
          .join("/") || "";
      const cpOpts =
        cfg.coverPrint?.options
          ?.filter((o) => o.enabled)
          .map((o) => o.label)
          .join("/") || "";
      return `PP:${ppOpts}, 표지:${cpOpts}`;
    case "delivery":
      // 배열 구조 지원 + 기존 개별 키 구조 호환
      if (cfg.options?.length > 0) {
        return (
          cfg.options
            .filter((opt) => opt.enabled)
            .map((opt) => opt.label)
            .join(", ") || "-"
        );
      }
      return (
        [
          cfg.same && "당일",
          cfg.next1 && "1영업일",
          cfg.next2 && "2영업일",
          cfg.next3 && "3영업일",
        ]
          .filter(Boolean)
          .join(", ") || "-"
      );
    case "quantity":
      return cfg.options?.map((q) => `${q}부`).join(", ") || "-";
    case "pages_saddle":
    case "pages_leaf":
    case "pages":
      return `최소 ${cfg.min}p, ${cfg.step}p 단위${cfg.maxThickness ? `, 두께제한 ${cfg.maxThickness}mm` : ""}`;
    case "inner_layer_saddle":
    case "inner_layer_leaf": {
      const papers = cfg.papers
        ? Object.keys(cfg.papers)
            .map((p) => papersList.find((pp) => pp.code === p)?.name || p)
            .join("/")
        : "";
      const pages = cfg.min ? `${cfg.min}p~, ${cfg.step}p단위` : "";
      const thickness = cfg.maxThickness ? `, ≤${cfg.maxThickness}mm` : "";
      return `${papers} ${pages}${thickness}` || "내지 설정";
    }
    default:
      return "-";
  }
}

export default BlockItem;
