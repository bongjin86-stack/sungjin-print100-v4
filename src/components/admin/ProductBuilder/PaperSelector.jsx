/**
 * PaperSelector.jsx
 *
 * 용지+평량 선택 UI (AdminBuilder 전용)
 * paper 블록, inner_layer_saddle/leaf 블록에서 공유
 */

function PaperSelector({
  blockId,
  papers,
  weights,
  selectedPapers,
  defaultKey = "default",
  defaultValue,
  togglePaper,
  toggleWeight,
  onDefaultPaper,
  onDefaultWeight,
  label,
}) {
  return (
    <div>
      {label && (
        <label className="text-xs text-gray-500 block mb-2">{label}</label>
      )}
      {papers.map((paper) => {
        const isOn = selectedPapers && selectedPapers[paper.code];
        const isDefaultPaper = defaultValue?.paper === paper.code;
        return (
          <div
            key={paper.code}
            className="mb-2 p-3 bg-white rounded-lg border border-gray-200"
          >
            <label
              className="flex items-center gap-2 text-sm font-medium cursor-pointer"
              onDoubleClick={() => onDefaultPaper(paper.code, isDefaultPaper)}
            >
              <input
                type="checkbox"
                checked={!!isOn}
                onChange={(e) =>
                  togglePaper(blockId, paper.code, e.target.checked)
                }
                className="checkbox checkbox-sm"
              />
              {paper.name}
              {isDefaultPaper && <span className="text-warning">★</span>}
            </label>
            {isOn && (
              <div className="flex flex-wrap gap-2 mt-2 ml-6">
                {weights[paper.code]?.map((w) => (
                  <label
                    key={w}
                    className="flex items-center gap-1 text-xs bg-gray-50 px-2 py-1 rounded cursor-pointer"
                    onDoubleClick={() =>
                      onDefaultWeight(paper.code, w, isDefaultPaper)
                    }
                  >
                    <input
                      type="checkbox"
                      checked={selectedPapers[paper.code]?.includes(w)}
                      onChange={(e) =>
                        toggleWeight(blockId, paper.code, w, e.target.checked)
                      }
                      className="checkbox checkbox-xs"
                    />
                    {w}g
                    {isDefaultPaper && defaultValue?.weight === w && (
                      <span className="text-warning ml-1">★</span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default PaperSelector;
