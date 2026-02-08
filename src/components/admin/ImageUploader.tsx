import React, { useRef, useState } from "react";

import { uploadImage } from "@/lib/supabase";

interface ImageUploaderProps {
  currentImage?: string;
  folder: string;
  onUpload: (url: string) => void;
  label?: string;
}

export default function ImageUploader({
  currentImage,
  folder,
  onUpload,
  label = "이미지",
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 업로드 가능합니다.");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("파일 크기는 10MB 이하여야 합니다.");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const publicUrl = await uploadImage(file, folder);
      setPreview(publicUrl);
      onUpload(publicUrl);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="image-uploader">
      <label className="uploader-label">{label}</label>

      <div className="uploader-container">
        {preview ? (
          <div className="preview-container">
            <img src={preview} alt="Preview" className="preview-image" />
            <button
              type="button"
              className="change-btn"
              onClick={handleClick}
              disabled={uploading}
            >
              {uploading ? "업로드 중..." : "이미지 변경"}
            </button>
          </div>
        ) : (
          <div className="upload-placeholder" onClick={handleClick}>
            <div className="placeholder-icon">📷</div>
            <div className="placeholder-text">
              {uploading ? "업로드 중..." : "클릭하여 이미지 업로드"}
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />
      </div>

      {error && <div className="upload-error">{error}</div>}

      {preview && (
        <div className="image-url">
          <small>URL: {preview}</small>
        </div>
      )}

      <style>{`
        .image-uploader {
          margin-bottom: 1.5rem;
        }

        .uploader-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #333;
          margin-bottom: 0.5rem;
        }

        .uploader-container {
          border: 2px dashed #ddd;
          border-radius: 0.5rem;
          overflow: hidden;
          transition: border-color 0.2s;
        }

        .uploader-container:hover {
          border-color: #999;
        }

        .preview-container {
          position: relative;
        }

        .preview-image {
          width: 100%;
          max-height: 300px;
          object-fit: cover;
          display: block;
        }

        .change-btn {
          position: absolute;
          bottom: 1rem;
          right: 1rem;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 0.25rem;
          cursor: pointer;
          font-size: 0.875rem;
          transition: background 0.2s;
        }

        .change-btn:hover:not(:disabled) {
          background: rgba(0, 0, 0, 0.9);
        }

        .change-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .upload-placeholder {
          padding: 3rem 2rem;
          text-align: center;
          cursor: pointer;
          background: #f9f9f9;
        }

        .upload-placeholder:hover {
          background: #f0f0f0;
        }

        .placeholder-icon {
          font-size: 3rem;
          margin-bottom: 0.5rem;
        }

        .placeholder-text {
          color: #666;
          font-size: 0.875rem;
        }

        .upload-error {
          color: #dc3545;
          font-size: 0.75rem;
          margin-top: 0.5rem;
        }

        .image-url {
          margin-top: 0.5rem;
          padding: 0.5rem;
          background: #f5f5f5;
          border-radius: 0.25rem;
          word-break: break-all;
        }

        .image-url small {
          color: #666;
          font-size: 0.75rem;
        }
      `}</style>
    </div>
  );
}
