import { useState } from "react";

import { supabase, uploadImage } from "@/lib/supabase";

import BlockNoteEditor from "./BlockNoteEditor";

interface CeoData {
  subtitle: string;
  catchphrase: string;
  message: string;
  image: string;
}

interface CeoFormProps {
  initialData: CeoData;
}

export default function CeoForm({ initialData }: CeoFormProps) {
  const [formData, setFormData] = useState<CeoData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [uploadStatus, setUploadStatus] = useState("");

  const handleContentChange = (content: string) => {
    setFormData((prev) => ({ ...prev, message: content }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 업로드 가능합니다.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("파일 크기는 10MB 이하여야 합니다.");
      return;
    }

    setUploadStatus("업로드 중...");

    try {
      const publicUrl = await uploadImage(file, "ceo");
      setFormData((prev) => ({ ...prev, image: publicUrl }));
      setUploadStatus("업로드 완료!");
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploadStatus("업로드 실패: " + (err.message || "알 수 없는 오류"));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const settings = [
        { key: "ceo_subtitle", value: formData.subtitle },
        { key: "ceo_catchphrase", value: formData.catchphrase },
        { key: "ceo_message", value: formData.message },
        { key: "ceo_image", value: formData.image },
      ];

      for (const setting of settings) {
        const response = await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(setting),
        });
        if (!response.ok) throw new Error("저장 실패");
      }

      setMessage({ type: "success", text: "저장되었습니다." });
    } catch (error) {
      setMessage({ type: "error", text: "저장 중 오류가 발생했습니다." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="ceo-form">
      {message && (
        <div className={`form-message ${message.type}`}>{message.text}</div>
      )}

      <div className="form-group">
        <label htmlFor="subtitle" className="form-label">
          섹션 부제목
        </label>
        <input
          type="text"
          id="subtitle"
          value={formData.subtitle}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, subtitle: e.target.value }))
          }
          className="form-input"
          placeholder="대표 메시지"
        />
        <span className="hint">"Message from CEO" 아래에 표시되는 텍스트</span>
      </div>

      <div className="form-group">
        <label htmlFor="catchphrase" className="form-label">
          캐치프레이즈
        </label>
        <input
          type="text"
          id="catchphrase"
          value={formData.catchphrase}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, catchphrase: e.target.value }))
          }
          className="form-input"
          placeholder="미래의 당연함을, 조용히 대담하게."
        />
        <span className="hint">강조되는 한 줄 메시지</span>
      </div>

      <div className="form-group">
        <label className="form-label">메시지 내용</label>
        <span className="hint">
          슬래시(/)를 입력하면 다양한 블록을 추가할 수 있습니다.
        </span>
        <BlockNoteEditor
          initialContent={formData.message}
          onChange={handleContentChange}
          height="400px"
          placeholder="CEO 메시지를 입력하세요..."
        />
      </div>

      <div className="form-group">
        <label className="form-label">CEO 이미지</label>
        <div className="image-upload-area">
          <div className="image-preview">
            {formData.image ? (
              <img src={formData.image} alt="CEO" />
            ) : (
              <span className="preview-placeholder">이미지를 선택하세요</span>
            )}
          </div>
          <input
            type="file"
            id="imageFile"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: "none" }}
          />
          <div className="upload-buttons">
            <button
              type="button"
              onClick={() => document.getElementById("imageFile")?.click()}
              className="btn"
            >
              이미지 선택
            </button>
            {uploadStatus && (
              <span className="upload-status">{uploadStatus}</span>
            )}
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? "저장 중..." : "저장"}
        </button>
      </div>

      <style>{`
        .ceo-form { }
        .form-message { padding: 12px 16px; border-radius: 8px; margin-bottom: 24px; }
        .form-message.success { background: #d4edda; color: #155724; }
        .form-message.error { background: #f8d7da; color: #721c24; }
        
        .form-group { margin-bottom: 24px; }
        .form-label { display: block; margin-bottom: 8px; font-weight: 500; color: #374151; }
        .form-input {
          width: 100%;
          padding: 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 1rem;
          box-sizing: border-box;
        }
        .hint { font-size: 0.75rem; color: #6b7280; margin-top: 4px; display: block; margin-bottom: 8px; }
        
        .btn { padding: 8px 16px; border: 1px solid #ddd; border-radius: 6px; background: white; cursor: pointer; }
        .btn-primary { background: #333; color: white; border-color: #333; padding: 12px 32px; }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        
        .form-actions { display: flex; justify-content: flex-end; padding-top: 16px; border-top: 1px solid #e5e7eb; }
        
        .image-upload-area { border: 2px dashed #ddd; border-radius: 8px; padding: 16px; }
        .image-preview { width: 200px; height: 200px; background: #f9f9f9; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; overflow: hidden; }
        .image-preview img { width: 100%; height: 100%; object-fit: cover; }
        .preview-placeholder { color: #999; font-size: 0.875rem; }
        .upload-buttons { display: flex; align-items: center; gap: 12px; }
        .upload-status { font-size: 0.75rem; color: #666; }
      `}</style>
    </form>
  );
}
