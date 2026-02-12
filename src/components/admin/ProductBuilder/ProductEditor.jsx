/**
 * ProductEditor.jsx
 *
 * AdminBuilder 전용 - 상품 정보 편집 컴포넌트
 *
 * 기능:
 * - 메인 이미지 업로드 + 삭제
 * - 썸네일 4개 업로드 + 개별 삭제
 * - 특징 카드 2개 편집
 * - 상품명, 설명 편집
 * - 주요 특징 에디터 (NotionEditor)
 *
 * 레이아웃: ProductView.css .pv-* 클래스 공유 (빌더 ↔ 상품페이지 동일)
 */

import { useRef } from "react";

import BlockNoteEditor from "@/components/admin/BlockNoteEditor";

function ProductEditor({
  content,
  imageUploading,
  onMainImageUpload,
  onThumbnailUpload,
  onUpdateContent,
}) {
  // 파일 입력 refs
  const mainImageRef = useRef(null);
  const thumbImageRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
  ];

  // 하이라이트 업데이트 헬퍼
  const updateHighlight = (idx, field, value) => {
    const newHighlights = [...content.highlights];
    newHighlights[idx] = { ...newHighlights[idx], [field]: value };
    onUpdateContent({ highlights: newHighlights });
  };

  return (
    <div className="pv-grid">
      {/* 왼쪽: 이미지 영역 */}
      <div className="pv-left-col">
       <div className="pv-images" style={{ position: 'static', maxHeight: 'none' }}>
        {/* 메인 이미지 */}
        <input
          ref={mainImageRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onMainImageUpload}
        />
        <div className="relative group/main">
          <div
            className={`pv-main-image cursor-pointer border border-dashed border-gray-200 hover:border-gray-400 transition-colors ${imageUploading ? "opacity-50" : ""}`}
            onClick={() => mainImageRef.current?.click()}
          >
            {content.mainImage ? (
              <img src={content.mainImage} alt="메인" />
            ) : (
              <div className="pv-no-image">
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>+</div>
                <p>{imageUploading ? "업로드 중..." : "메인 이미지"}</p>
              </div>
            )}
          </div>
          {content.mainImage && (
            <button
              type="button"
              className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-black/40 text-white text-xs hover:bg-red-500 transition-colors opacity-0 group-hover/main:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateContent({ mainImage: null });
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* 썸네일 4개 */}
        <div className="pv-thumbnails">
          {[0, 1, 2, 3].map((idx) => (
            <div key={idx} className="relative group/thumb">
              <input
                ref={thumbImageRefs[idx]}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onThumbnailUpload(e, idx)}
              />
              <div
                className={`pv-thumb cursor-pointer hover:border-gray-400 transition-colors ${imageUploading ? "opacity-50" : ""}`}
                style={{ borderStyle: 'dashed' }}
                onClick={() => thumbImageRefs[idx].current?.click()}
              >
                {content.thumbnails?.[idx] ? (
                  <img
                    src={content.thumbnails[idx]}
                    alt={`썸네일${idx + 1}`}
                  />
                ) : (
                  <span style={{ fontSize: '1.25rem', color: '#d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>+</span>
                )}
              </div>
              {content.thumbnails?.[idx] && (
                <button
                  type="button"
                  className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-black/40 text-white text-[10px] hover:bg-red-500 transition-colors opacity-0 group-hover/thumb:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    const newThumbnails = [...(content.thumbnails || [])];
                    newThumbnails[idx] = null;
                    onUpdateContent({ thumbnails: newThumbnails });
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
       </div>{/* /pv-images */}
      </div>

      {/* 오른쪽: 정보 영역 */}
      <div className="pv-options">
        {/* 제목 */}
        <input
          type="text"
          value={content.title}
          onChange={(e) => onUpdateContent({ title: e.target.value })}
          className="pv-product-title bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-primary outline-none w-full"
          placeholder="상품명"
        />

        {/* 설명 */}
        <input
          type="text"
          value={content.description}
          onChange={(e) => onUpdateContent({ description: e.target.value })}
          className="pv-product-desc bg-transparent border-b border-transparent hover:border-gray-200 focus:border-primary outline-none w-full"
          placeholder="상품 설명"
        />
      </div>

      {/* 주요특징 섹션 (2컬럼 전체) — 특징카드 + 에디터 */}
      {content.featuresHtml !== null || content.features?.length || content.highlights?.length ? (
        <div className="col-span-2 border border-gray-100 rounded-xl p-4 relative">
          <button
            type="button"
            className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full text-gray-300 hover:bg-red-50 hover:text-red-400 transition-colors text-sm"
            onClick={() => onUpdateContent({ featuresHtml: null, features: null, highlights: [] })}
            title="주요특징 섹션 삭제"
          >
            ✕
          </button>
          <p className="font-medium text-sm mb-3 text-gray-500">주요 특징</p>
          <div className="grid grid-cols-2 gap-6">
            {/* 좌: 특징 카드 */}
            <div className="grid grid-cols-2 gap-3 content-start">
              {content.highlights?.map((h, idx) => (
                <div key={idx} className="p-3 border border-gray-200 rounded-xl relative group">
                  <button
                    type="button"
                    className="absolute top-1 right-1 text-gray-300 hover:text-red-400 text-xs hidden group-hover:block"
                    onClick={() => {
                      const newHighlights = content.highlights.filter((_, i) => i !== idx);
                      onUpdateContent({ highlights: newHighlights });
                    }}
                  >
                    ✕
                  </button>
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="text"
                      value={h.icon}
                      onChange={(e) => updateHighlight(idx, "icon", e.target.value)}
                      className="text-xl w-8 text-center bg-transparent border-b border-transparent hover:border-gray-200 focus:border-primary outline-none"
                      placeholder="🔹"
                    />
                    <input
                      type="text"
                      value={h.title}
                      onChange={(e) => updateHighlight(idx, "title", e.target.value)}
                      className="font-medium text-sm bg-transparent border-b border-transparent hover:border-gray-200 focus:border-primary outline-none flex-1"
                      placeholder="제목"
                    />
                  </div>
                  <input
                    type="text"
                    value={h.desc}
                    onChange={(e) => updateHighlight(idx, "desc", e.target.value)}
                    className="text-xs text-gray-500 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-primary outline-none w-full"
                    placeholder="설명"
                  />
                </div>
              ))}
              {(content.highlights?.length || 0) < 4 && (
                <button
                  type="button"
                  className="p-3 border border-dashed border-gray-200 rounded-xl text-gray-300 hover:text-gray-400 hover:border-gray-300 transition-colors flex items-center justify-center text-sm"
                  onClick={() => {
                    const newHighlights = [...(content.highlights || []), { icon: "🔹", title: "", desc: "" }];
                    onUpdateContent({ highlights: newHighlights });
                  }}
                >
                  + 카드
                </button>
              )}
            </div>
            {/* 우: 에디터 */}
            <div>
              <BlockNoteEditor
                initialContent={
                  content.featuresHtml ||
                  "<ul><li>" +
                    (content.features?.join("</li><li>") || "") +
                    "</li></ul>"
                }
                onChange={(html) => onUpdateContent({ featuresHtml: html })}
              />
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="col-span-2 p-3 border border-dashed border-gray-200 rounded-xl text-gray-400 hover:text-gray-500 hover:border-gray-300 transition-colors text-sm text-center"
          onClick={() => onUpdateContent({
            featuresHtml: "<ul><li></li></ul>",
            highlights: [{ icon: "⚡", title: "", desc: "" }, { icon: "🎨", title: "", desc: "" }],
          })}
        >
          + 주요 특징 섹션 추가
        </button>
      )}
    </div>
  );
}

export default ProductEditor;
