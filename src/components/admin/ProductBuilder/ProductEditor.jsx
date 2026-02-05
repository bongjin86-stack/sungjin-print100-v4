/**
 * ProductEditor.jsx
 *
 * AdminBuilder 전용 - 상품 정보 편집 컴포넌트
 *
 * 기능:
 * - 메인 이미지 업로드
 * - 썸네일 4개 업로드
 * - 특징 카드 2개 편집
 * - 상품명, 설명 편집
 * - 주요 특징 에디터 (NotionEditor)
 */

import { useRef } from 'react';

import BlockNoteEditor from '@/components/admin/BlockNoteEditor';

function ProductEditor({
  content,
  imageUploading,
  onMainImageUpload,
  onThumbnailUpload,
  onUpdateContent
}) {
  // 파일 입력 refs
  const mainImageRef = useRef(null);
  const thumbImageRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  // 하이라이트 업데이트 헬퍼
  const updateHighlight = (idx, field, value) => {
    const newHighlights = [...content.highlights];
    newHighlights[idx] = { ...newHighlights[idx], [field]: value };
    onUpdateContent({ highlights: newHighlights });
  };

  return (
    <div className="grid grid-cols-2 gap-8">
      {/* 왼쪽: 이미지 영역 */}
      <div>
        {/* 메인 이미지 */}
        <input
          ref={mainImageRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onMainImageUpload}
        />
        <div
          className={`aspect-square bg-gray-50 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors mb-4 overflow-hidden ${imageUploading ? 'opacity-50' : ''}`}
          onClick={() => mainImageRef.current?.click()}
        >
          {content.mainImage ? (
            <img src={content.mainImage} alt="메인" className="w-full h-full object-cover" />
          ) : (
            <>
              <div className="text-4xl text-gray-300 mb-2">+</div>
              <p className="text-sm text-gray-400">{imageUploading ? '업로드 중...' : '메인 이미지'}</p>
            </>
          )}
        </div>

        {/* 썸네일 4개 */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[0, 1, 2, 3].map(idx => (
            <div key={idx}>
              <input
                ref={thumbImageRefs[idx]}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onThumbnailUpload(e, idx)}
              />
              <div
                className={`aspect-square bg-gray-50 rounded-lg border border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors overflow-hidden ${imageUploading ? 'opacity-50' : ''}`}
                onClick={() => thumbImageRefs[idx].current?.click()}
              >
                {content.thumbnails?.[idx] ? (
                  <img src={content.thumbnails[idx]} alt={`썸네일${idx + 1}`} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl text-gray-300">+</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 특징 카드 2개 */}
        <div className="grid grid-cols-2 gap-3">
          {content.highlights?.map((h, idx) => (
            <div key={idx} className="p-3 border border-gray-200 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{h.icon}</span>
                <input
                  type="text"
                  value={h.title}
                  onChange={(e) => updateHighlight(idx, 'title', e.target.value)}
                  className="font-medium text-sm bg-transparent border-b border-transparent hover:border-gray-200 focus:border-primary outline-none"
                  placeholder="제목"
                />
              </div>
              <input
                type="text"
                value={h.desc}
                onChange={(e) => updateHighlight(idx, 'desc', e.target.value)}
                className="text-xs text-gray-500 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-primary outline-none w-full"
                placeholder="설명"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 오른쪽: 정보 영역 */}
      <div>
        {/* 제목 */}
        <input
          type="text"
          value={content.title}
          onChange={(e) => onUpdateContent({ title: e.target.value })}
          className="text-2xl font-bold mb-2 bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-primary outline-none w-full"
          placeholder="상품명"
        />

        {/* 설명 */}
        <input
          type="text"
          value={content.description}
          onChange={(e) => onUpdateContent({ description: e.target.value })}
          className="text-gray-600 mb-4 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-primary outline-none w-full"
          placeholder="상품 설명"
        />

        {/* 주요 특징 - 노션 스타일 에디터 */}
        <div className="mb-4">
          <p className="font-medium text-sm mb-2">주요 특징</p>
          <BlockNoteEditor
            initialContent={content.featuresHtml || '<ul><li>' + (content.features?.join('</li><li>') || '') + '</li></ul>'}
            onChange={(html) => onUpdateContent({ featuresHtml: html })}
          />
        </div>
      </div>
    </div>
  );
}

export default ProductEditor;
