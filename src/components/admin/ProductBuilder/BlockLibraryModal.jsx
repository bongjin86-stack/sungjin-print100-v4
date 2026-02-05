/**
 * BlockLibraryModal.jsx
 *
 * AdminBuilder 전용 - 블록 추가 시 표시되는 모달
 *
 * 사용 가능한 블록 타입을 그리드로 표시하고
 * 클릭 시 해당 블록을 추가합니다.
 */

import { BLOCK_TYPES } from '@/lib/builderData';

function BlockLibraryModal({ isOpen, onClose, onAddBlock }) {
  if (!isOpen) return null;

  const handleAddBlock = (type) => {
    onAddBlock(type);
    onClose();
  };

  return (
    <div className="modal modal-open" onClick={onClose}>
      <div className="modal-box w-[600px] max-w-5xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">블록 라이브러리</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">✕</button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(BLOCK_TYPES).map(([type, info]) => (
            <button
              key={type}
              onClick={() => handleAddBlock(type)}
              className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 transition-all text-left"
            >
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${info.color} flex items-center justify-center text-xl mb-2`}>
                {info.icon}
              </div>
              <p className="font-medium text-sm text-gray-700">{info.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{info.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default BlockLibraryModal;
