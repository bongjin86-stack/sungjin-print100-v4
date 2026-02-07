import React, { useEffect, useRef, useState } from 'react';

import { supabase, uploadImage } from '@/lib/supabase';

export default function LogoUploader() {
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 초기 로드
  useEffect(() => {
    loadCurrentLogo();
  }, []);

  const loadCurrentLogo = async () => {
    try {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'logo_url')
        .single();

      if (data?.value) {
        setLogoUrl(data.value);
      }
    } catch (err) {
      // 없으면 무시
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (SVG, PNG만 허용)
    const allowedTypes = ['image/png', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setError('SVG 또는 PNG 파일만 업로드 가능합니다.');
      return;
    }

    // Validate file size (max 5MB for logo)
    if (file.size > 5 * 1024 * 1024) {
      setError('파일 크기는 5MB 이하여야 합니다.');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const publicUrl = await uploadImage(file, 'general');
      setLogoUrl(publicUrl);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || '업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!logoUrl) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          key: 'logo_url',
          value: logoUrl,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('로고를 삭제하시겠습니까? 기본 텍스트 로고로 표시됩니다.')) return;

    setSaving(true);
    try {
      await supabase
        .from('site_settings')
        .delete()
        .eq('key', 'logo_url');

      setLogoUrl('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || '삭제에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="logo-uploader">
      <div className="logo-preview-area">
        {logoUrl ? (
          <div className="logo-preview">
            <div className="preview-box light">
              <span className="preview-label">밝은 배경</span>
              <img src={logoUrl} alt="Logo preview" />
            </div>
            <div className="preview-box dark">
              <span className="preview-label">어두운 배경</span>
              <img src={logoUrl} alt="Logo preview" />
            </div>
          </div>
        ) : (
          <div className="no-logo">
            <span>로고가 설정되지 않았습니다</span>
            <small>기본 텍스트 "Sungjinprint"가 표시됩니다</small>
          </div>
        )}
      </div>

      <div className="logo-actions">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/svg+xml"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        <button
          type="button"
          className="btn-upload"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? '업로드 중...' : logoUrl ? '이미지 변경' : '이미지 업로드'}
        </button>

        {logoUrl && (
          <>
            <button
              type="button"
              className="btn-save"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? '저장 중...' : '저장'}
            </button>
            <button
              type="button"
              className="btn-remove"
              onClick={handleRemove}
              disabled={saving}
            >
              삭제
            </button>
          </>
        )}
      </div>

      {error && <div className="message error">{error}</div>}
      {success && <div className="message success">저장되었습니다!</div>}

      <p className="hint">
        허용 형식: SVG, PNG (투명 배경 권장)
      </p>
      <p className="hint recommend">
        추천: SVG (벡터, 무한 확대 가능, 용량 작음)
      </p>

      <style>{`
        .logo-uploader {
          padding: 1rem 0;
        }

        .logo-preview-area {
          margin-bottom: 1rem;
        }

        .logo-preview {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .preview-box {
          padding: 1.5rem;
          border-radius: 0.5rem;
          text-align: center;
        }

        .preview-box.light {
          background: #f5f5f5;
          border: 1px solid #ddd;
        }

        .preview-box.dark {
          background: #1a1a1a;
        }

        .preview-label {
          display: block;
          font-size: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .preview-box.light .preview-label {
          color: #666;
        }

        .preview-box.dark .preview-label {
          color: #999;
        }

        .preview-box img {
          max-height: 50px;
          max-width: 100%;
          object-fit: contain;
        }

        .no-logo {
          background: #f9f9f9;
          border: 2px dashed #ddd;
          border-radius: 0.5rem;
          padding: 2rem;
          text-align: center;
        }

        .no-logo span {
          display: block;
          color: #666;
          margin-bottom: 0.25rem;
        }

        .no-logo small {
          color: #999;
          font-size: 0.75rem;
        }

        .logo-actions {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .logo-actions button {
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-upload {
          background: #f0f0f0;
          border: 1px solid #ddd;
          color: #333;
        }

        .btn-upload:hover:not(:disabled) {
          background: #e5e5e5;
        }

        .btn-save {
          background: var(--c-primary, #3455DB);
          border: none;
          color: white;
        }

        .btn-save:hover:not(:disabled) {
          opacity: 0.9;
        }

        .btn-remove {
          background: transparent;
          border: 1px solid #dc3545;
          color: #dc3545;
        }

        .btn-remove:hover:not(:disabled) {
          background: #dc3545;
          color: white;
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .message {
          padding: 0.5rem 0.75rem;
          border-radius: 0.25rem;
          font-size: 0.875rem;
          margin-bottom: 0.75rem;
        }

        .message.error {
          background: #fee2e2;
          color: #dc2626;
        }

        .message.success {
          background: #dcfce7;
          color: #16a34a;
        }

        .hint {
          font-size: 0.75rem;
          color: #666;
          margin: 0 0 0.25rem 0;
        }

        .hint.recommend {
          color: #3455DB;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
