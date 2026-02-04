import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import ImageUploader from './ImageUploader';

const supabaseUrl = 'https://zqtmzbcfzozgzspslccp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxdG16YmNmem96Z3pzcHNsY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzM2NjAsImV4cCI6MjA4NTI0OTY2MH0.H7w5s_8sSm-_-oU8Ft9fZah6i4NjC6GqQ-GoR3_8MVo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface HeroSettings {
  id: string;
  title_line1: string;
  title_line2: string;
  image_url: string | null;
}

export default function HeroForm() {
  const [settings, setSettings] = useState<HeroSettings | null>(null);
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
      } else {
        // 초기 데이터가 없으면 기본값으로 생성
        const { data: newData, error: insertError } = await supabase
          .from('hero_settings')
          .insert([{
            title_line1: '안녕하세요',
            title_line2: 'Sungjinprint 입니다.',
            image_url: null
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

      <ImageUploader
        currentImage={settings.image_url || undefined}
        folder="hero"
        onUpload={(url) => setSettings({ ...settings, image_url: url })}
        label="Hero 이미지"
      />

      <div className="preview-section">
        <h3>미리보기</h3>
        <div className="hero-preview">
          <div className="preview-title">
            <span>{settings.title_line1}</span>
            <br />
            <span>{settings.title_line2}</span>
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

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #333;
          margin-bottom: 0.5rem;
        }

        .form-group input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 0.5rem;
          font-size: 1rem;
          transition: border-color 0.2s;
        }

        .form-group input:focus {
          outline: none;
          border-color: #007bff;
        }

        .preview-section {
          margin: 2rem 0;
          padding: 1.5rem;
          background: #f8f9fa;
          border-radius: 0.5rem;
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
          border-radius: 0.5rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .preview-title {
          font-size: 1.5rem;
          font-weight: 500;
          line-height: 1.6;
          margin-bottom: 1rem;
        }

        .preview-image {
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
      `}</style>
    </div>
  );
}
