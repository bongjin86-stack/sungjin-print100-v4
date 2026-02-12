/**
 * CoverGallery — 카드 클릭 시 모달을 여는 래퍼
 *
 * 그리드/카드는 Astro 네이티브 렌더링 (scoped styles),
 * 이 컴포넌트는 모달 열기/닫기만 담당.
 */
import { useEffect, useState } from "react";
import CoverModal from "./CoverModal";

export default function CoverGalleryClient({ covers }) {
  const [selectedCover, setSelectedCover] = useState(null);

  // 카드 클릭 이벤트 위임
  useEffect(() => {
    const handler = (e) => {
      const card = e.target.closest("[data-cover-id]");
      if (!card) return;
      e.preventDefault();
      const id = card.dataset.coverId;
      const cover = covers.find((c) => c.id === id);
      if (cover) setSelectedCover(cover);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [covers]);

  if (!selectedCover) return null;

  return <CoverModal cover={selectedCover} onClose={() => setSelectedCover(null)} />;
}
