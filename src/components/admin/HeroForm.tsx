import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import ImageUploader from './ImageUploader';

const supabaseUrl = 'https://zqtmzbcfzozgzspslccp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxdG16YmNmem96Z3pzcHNsY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzM2NjAsImV4cCI6MjA4NTI0OTY2MH0.H7w5s_8sSm-_-oU8Ft9fZah6i4NjC6GqQ-GoR3_8MVo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface TextStyle {
  fontSize: number;
  letterSpacing: number;
  fontWeight: number;
}

interface HeroSettings {
  id: string;
  title_line1: string;
  title_line2: string;
  image_url: string | null;
  style_line1?: TextStyle;
  style_line2?: TextStyle;
}

const defaultStyle: TextStyle = {
  fontSize: 48,
  letterSpacing: 0,
  fontWeight: 500,
};

export default function HeroForm() {
  const [settings, setSettings] = useState<HeroSettings | null>(null);
  const [styleLine1, setStyleLine1] = useState<TextStyle>(defaultStyle);
  const [styleLine2, setStyleLine2] = useState<TextStyle>({ ...defaultStyle, fontSize: 48 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('hero_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings(data);
        if (data.style_line1) setStyleLine1(data.style_line1);
        if (data.style_line2) setStyleLine2(data.style_line2);
      } else {
        const { data: newData, error: insertError } = await supabase
          .from('hero_settings')
          .insert([{
            title_line1: '안녕하세요',
            title_line2: 'Sungjinprint 입니다.',
            image_url: null,
            style_line1: defaultStyle,
            style_line2: defaultStyle
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        setSettings(newData);
      }
    } catch (err: any) {
      console.error('Error fetching hero settings:', err);
      setMessage({ type: 'error', text: '설정을 불러오는데 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('hero_settings')
        .update({
          title_line1: settings.title_line1,
          title_line2: settings.title_line2,
          image_url: settings.image_url,
          style_line1: styleLine1,
          style_line2: styleLine2,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id);

      if (error) throw error;

      setMessage({ type: 'success', text: '저장되었습니다!' });
    } catch (err: any) {
      console.error('Error saving hero settings:', err);
      setMessage({ type: 'error', text: '저장에 실패했습니다.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  if (!settings) {
    return <div className="error">설정을 불러올 수 없습니다.</div>;
  }

  return (
    <div className="hero-form">
      <h2>Hero 섹션 관리</h2>
      
      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* 첫 번째 줄 텍스트 */}
      <div className="text-section">
        <div className="form-group">
          <label htmlFor="title_line1">첫 번째 줄 텍스트</label>
          <input
            type="text"
            id="title_line1"
            value={settings.title_line1}
            onChange={(e) => setSettings({ ...settings, title_line1: e.target.value })}
            placeholder="예: 안녕하세요"
          />
        </div>
        
        <div className="style-controls">
          <div className="style-control">
            <label>글자 크기</label>
            <div className="slider-group">
              <input
                type="range"
                min="24"
                max="96"
                value={styleLine1.fontSize}
                onChange={(e) => setStyleLine1({ ...styleLine1, fontSize: Number(e.target.value) })}
              />
              <span className="value">{styleLine1.fontSize}px</span>
            </div>
          </div>
          
          <div className="style-control">
            <label>자간</label>
            <div className="slider-group">
              <input
                type="range"
                min="-5"
                max="20"
                value={styleLine1.letterSpacing}
                onChange={(e) => setStyleLine1({ ...styleLine1, letterSpacing: Number(e.target.value) })}
              />
              <span className="value">{styleLine1.letterSpacing}px</span>
            </div>
          </div>
          
          <div className="style-control">
            <label>굵기</label>
            <div className="slider-group">
              <input
                type="range"
                min="300"
                max="900"
                step="100"
                value={styleLine1.fontWeight}
                onChange={(e) => setStyleLine1({ ...styleLine1, fontWeight: Number(e.target.value) })}
              />
              <span className="value">{styleLine1.fontWeight}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 두 번째 줄 텍스트 */}
      <div className="text-section">
        <div className="form-group">
          <label htmlFor="title_line2">두 번째 줄 텍스트</label>
          <input
            type="text"
            id="title_line2"
            value={settings.title_line2}
            onChange={(e) => setSettings({ ...settings, title_line2: e.target.value })}
            placeholder="예: Sungjinprint 입니다."
          />
        </div>
        
        <div className="style-controls">
          <div className="style-control">
            <label>글자 크기</label>
            <div className="slider-group">
              <input
                type="range"
                min="24"
                max="96"
                value={styleLine2.fontSize}
                onChange={(e) => setStyleLine2({ ...styleLine2, fontSize: Number(e.target.value) })}
              />
              <span className="value">{styleLine2.fontSize}px</span>
            </div>
          </div>
          
          <div className="style-control">
            <label>자간</label>
            <div className="slider-group">
              <input
                type="range"
                min="-5"
                max="20"
                value={styleLine2.letterSpacing}
                onChange={(e) => setStyleLine2({ ...styleLine2, letterSpacing: Number(e.target.value) })}
              />
              <span className="value">{styleLine2.letterSpacing}px</span>
            </div>
          </div>
          
          <div className="style-control">
            <label>굵기</label>
            <div className="slider-group">
              <input
                type="range"
                min="300"
                max="900"
                step="100"
                value={styleLine2.fontWeight}
                onChange={(e) => setStyleLine2({ ...styleLine2, fontWeight: Number(e.target.value) })}
              />
              <span className="value">{styleLine2.fontWeight}</span>
            </div>
          </div>
        </div>
      </div>

      <ImageUploader
        currentImage={settings.image_url || undefined}
        folder="hero"
        onUpload={(url) => setSettings({ ...settings, image_url: url })}
        label="Hero 이미지"
      />

      <div className="preview-section">
        <h3>미리보기</h3>
        <div className="hero-preview">
          <div 
            className="preview-line1"
            style={{
              fontSize: `${styleLine1.fontSize}px`,
              letterSpacing: `${styleLine1.letterSpacing}px`,
              fontWeight: styleLine1.fontWeight,
            }}
          >
            {settings.title_line1}
          </div>
          <div 
            className="preview-line2"
            style={{
              fontSize: `${styleLine2.fontSize}px`,
              letterSpacing: `${styleLine2.letterSpacing}px`,
              fontWeight: styleLine2.fontWeight,
            }}
          >
            {settings.title_line2}
          </div>
          {settings.image_url && (
            <div className="preview-image">
              <img src={settings.image_url} alt="Hero Preview" />
            </div>
          )}
        </div>
      </div>

      <button 
        className="save-btn" 
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? '저장 중...' : '저장하기'}
      </button>

      <style>{`
        .hero-form {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
        }

        .hero-form h2 {
          margin-bottom: 1.5rem;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .message {
          padding: 1rem;
          border-radius: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .message.success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .message.error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .text-section {
          background: #f8f9fa;
          padding: 1.5rem;
          border-radius: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #333;
          margin-bottom: 0.5rem;
        }

        .form-group input[type="text"] {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 0.5rem;
          font-size: 1rem;
          transition: border-color 0.2s;
        }

        .form-group input[type="text"]:focus {
          outline: none;
          border-color: #007bff;
        }

        .style-controls {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-top: 1rem;
        }

        .style-control {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .style-control label {
          font-size: 0.75rem;
          font-weight: 500;
          color: #666;
        }

        .slider-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .slider-group input[type="range"] {
          flex: 1;
          height: 6px;
          border-radius: 3px;
          background: #ddd;
          cursor: pointer;
          -webkit-appearance: none;
        }

        .slider-group input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #007bff;
          cursor: pointer;
        }

        .slider-group .value {
          min-width: 50px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #007bff;
          text-align: right;
        }

        .preview-section {
          margin: 2rem 0;
          padding: 1.5rem;
          background: #f8f9fa;
          border-radius: 0.75rem;
        }

        .preview-section h3 {
          font-size: 1rem;
          font-weight: 500;
          margin-bottom: 1rem;
          color: #666;
        }

        .hero-preview {
          background: white;
          padding: 2rem;
          border-radius: 0.75rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .preview-line1,
        .preview-line2 {
          line-height: 1.3;
          color: #333;
          transition: all 0.2s;
        }

        .preview-line1 {
          margin-bottom: 0.25rem;
        }

        .preview-image {
          margin-top: 1.5rem;
          border-radius: 1rem;
          overflow: hidden;
        }

        .preview-image img {
          width: 100%;
          height: auto;
          display: block;
        }

        .save-btn {
          width: 100%;
          padding: 1rem;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .save-btn:hover:not(:disabled) {
          background: #0056b3;
        }

        .save-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .loading, .error {
          text-align: center;
          padding: 2rem;
          color: #666;
        }

        @media (max-width: 640px) {
          .style-controls {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
