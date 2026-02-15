import { useState } from "react";

import { uploadImage } from "@/lib/supabase";

/**
 * 이미지 업로드 공통 hook
 * ProductBuilder, Edu100Form 등에서 메인 이미지 + 썸네일 4개 업로드에 사용
 *
 * @param {string} folder - Supabase Storage 폴더명 (예: "products", "edu100")
 * @returns {{ imageUploading: boolean, upload: (e: Event) => Promise<string|null> }}
 */
export function useImageUpload(folder) {
  const [imageUploading, setImageUploading] = useState(false);

  /**
   * input[type=file] onChange 이벤트에서 파일을 추출하여 업로드
   * @param {Event} e - file input change event
   * @returns {Promise<string|null>} 업로드된 URL 또는 null
   */
  const upload = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return null;
    try {
      setImageUploading(true);
      return await uploadImage(file, folder);
    } finally {
      setImageUploading(false);
    }
  };

  return { imageUploading, upload };
}
