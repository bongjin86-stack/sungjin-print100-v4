/**
 * TemplateSelector.jsx
 *
 * AdminBuilder 전용 - 템플릿 선택/관리 UI
 *
 * 기능:
 * - 템플릿 목록 표시
 * - 드래그앤드롭으로 순서 변경 (Sortable.js 사용)
 * - 템플릿 선택, 추가, 삭제
 * - 더블클릭으로 이름 편집
 * - 아이콘 변경
 */

import { forwardRef } from 'react'

const TemplateSelector = forwardRef(function TemplateSelector({
  templates,
  currentTemplateId,
  editingTemplateId,
  editingTemplateName,
  setEditingTemplateName,
  onSelect,
  onDelete,
  onAdd,
  onChangeIcon,
  onStartEditName,
  onFinishEditName
}, ref) {
  return (
    <div className="card bg-white shadow-xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gray-500">템플릿 (드래그하여 순서 변경)</span>
      </div>
      <div ref={ref} className="flex gap-2 flex-wrap">
        {templates.sort((a, b) => a.order - b.order).map((template) => (
          <div
            key={template.id}
            className={`group relative inline-flex items-center gap-2.5 pl-3 pr-2 py-2 rounded-md cursor-pointer transition-all border ${
              currentTemplateId === template.id
                ? 'bg-gray-100 border-gray-300'
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onSelect(template.id)}
          >
            <span
              className="text-sm cursor-pointer opacity-60"
              onClick={(e) => { e.stopPropagation(); onChangeIcon(template.id); }}
              title="클릭하여 아이콘 변경"
            >
              {template.icon}
            </span>

            {editingTemplateId === template.id ? (
              <input
                type="text"
                value={editingTemplateName}
                onChange={(e) => setEditingTemplateName(e.target.value)}
                onBlur={onFinishEditName}
                onKeyDown={(e) => e.key === 'Enter' && onFinishEditName()}
                className="input input-bordered input-xs w-24 h-6"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                className="text-sm text-gray-700"
                onDoubleClick={(e) => { e.stopPropagation(); onStartEditName(template.id, template.name); }}
                title="더블클릭하여 이름 수정"
              >
                {template.name}
              </span>
            )}

            <button
              className="w-4 h-4 flex items-center justify-center rounded text-xs opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); onDelete(template.id); }}
              title="삭제"
            >
              ✕
            </button>
          </div>
        ))}

        <button
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-dashed border-gray-200 hover:border-gray-400 hover:bg-gray-50 text-gray-400 hover:text-gray-700 transition-all"
          onClick={onAdd}
        >
          <span className="text-sm">+</span>
          <span className="text-sm">추가</span>
        </button>
      </div>
    </div>
  );
});

export default TemplateSelector
