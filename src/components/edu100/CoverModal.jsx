import { useEffect, useState } from "react";

export default function CoverModal({ cover, onClose }) {
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, []);

  if (!cover) return null;

  // 메인 + 썸네일 이미지 배열 (빌더/ProductView 동일 포맷)
  const images = [cover.image, ...(cover.thumbnails || [])].filter(Boolean);

  return (
    <div className="edu100-modal-overlay" onClick={onClose}>
      <div className="edu100-modal" onClick={(e) => e.stopPropagation()}>
        {/* 메인 이미지 */}
        {images.length > 0 && (
          <div className="edu100-modal-image">
            <img src={images[selectedImage] || images[0]} alt={cover.title} />
          </div>
        )}

        {/* 썸네일 네비게이션 */}
        {images.length > 1 && (
          <div className="edu100-modal-thumbs">
            {images.map((img, idx) => (
              <div
                key={idx}
                className={`edu100-modal-thumb ${selectedImage === idx ? "active" : ""}`}
                onClick={() => setSelectedImage(idx)}
              >
                <img src={img} alt={`썸네일${idx + 1}`} />
              </div>
            ))}
          </div>
        )}

        {/* 콘텐츠 영역 */}
        <div className="edu100-modal-body">
          <h2 className="edu100-modal-title">{cover.title}</h2>

          {cover.description && (
            <div
              className="edu100-modal-desc"
              dangerouslySetInnerHTML={{ __html: cover.description }}
            />
          )}

          {/* 디자인 비용 안내 */}
          {cover.design_fee > 0 && (
            <p className="edu100-modal-fee">
              +{cover.design_fee.toLocaleString()}원
            </p>
          )}

          {/* 버튼 영역 */}
          <div className="edu100-modal-actions">
            {cover.linked_product_id && (
              <a
                href={`/product/${cover.linked_product_id}?designId=${cover.id}`}
                className="edu100-order-btn"
              >
                이 디자인으로 주문하기
              </a>
            )}
            <button
              type="button"
              className="edu100-close-btn"
              onClick={onClose}
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
