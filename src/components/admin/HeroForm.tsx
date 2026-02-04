import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import ImageUploader from './ImageUploader';

const supabaseUrl = 'https://zqtmzbcfzozgzspslccp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxdG16YmNmem96Z3pzcHNsY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzM2NjAsImV4cCI6MjA4NTI0OTY2MH0.H7w5s_8sSm-_-oU8Ft9fZah6i4NjC6GqQ-GoR3_8MVo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface HeroLine {
  id: string;
  text: string;
  fontSize: number;
  letterSpacing: number;
  fontWeight: number;
  marginBottom: number;
}

interface HeroSettings {
  id: string;
  title_line1: string;
  title_line2: string;
  image_url: string | null;
  lines: HeroLine[];
}

const defaultLines: HeroLine[] = [
  {
    id: '1',
    text: '안녕하세요',
    fontSize: 48,
    letterSpacing: 0,
    fontWeight: 500,
    marginBottom: 8
  },
  {
    id: '2',
    text: 'Sungjinprint 입니다.',
    fontSize: 48,
    letterSpacing: 0,
    fontWeight: 700,
    marginBottom: 0
  }
];

export default function HeroForm() {
  const [settings, setSettings] = useState<HeroSettings | null>(null);
  const [lines, setLines] = useState<HeroLine[]>(defaultLines);
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
        // lines가 있으면 사용, 없으면 기존 title_line1, title_line2로 초기화
        if (data.lines && Array.isArray(data.lines) && data.lines.length > 0) {
          setLines(data.lines);
        } else {
          // 기존 데이터를 lines 형식으로 변환
          const initialLines: HeroLine[] = [
            {
              id: '1',
              text: data.title_line1 || '안녕하세요',
              fontSize: 48,
              letterSpacing: 0,
              fontWeight: 500,
              marginBottom: 8
            },
            {
              id: '2',
              text: data.title_line2 || 'Sungjinprint 입니다.',
              fontSize: 48,
              letterSpacing: 0,
              fontWeight: 700,
              marginBottom: 0
            }
          ];
          setLines(initialLines);
        }
      } else {
        // 새로 생성
        const { data: newData, error: insertError } = await supabase
          .from('hero_settings')
          .insert([{
            title_line1: '안녕하세요',
            title_line2: 'Sungjinprint 입니다.',
            lines: defaultLines,
            image_url: null
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        setSettings(newData);
        setLines(defaultLines);
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
          lines: lines,
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

  const updateLine = (id: string, field: keyof HeroLine, value: string | number) => {
    setLines(prev => prev.map(line => 
      line.id === id ? { ...line, [field]: value } : line
    ));
  };

  const addLine = () => {
    const newLine: HeroLine = {
      id: Date.now().toString(),
      text: '새 텍스트',
      fontSize: 36,
      letterSpacing: 0,
      fontWeight: 500,
      marginBottom: 8
    };
    setLines(prev => [...prev, newLine]);
  };

  const removeLine = (id: string) => {
    if (lines.length <= 1) {
      setMessage({ type: 'error', text: '최소 1개의 줄이 필요합니다.' });
      return;
    }
    setLines(prev => prev.filter(line => line.id !== id));
  };

  const moveLine = (id: string, direction: 'up' | 'down') => {
    const index = lines.findIndex(line => line.id === id);
    if (direction === 'up' && index > 0) {
      const newLines = [...lines];
      [newLines[index - 1], newLines[index]] = [newLines[index], newLines[index - 1]];
      setLines(newLines);
    } else if (direction === 'down' && index < lines.length - 1) {
      const newLines = [...lines];
      [newLines[index], newLines[index + 1]] = [newLines[index + 1], newLines[index]];
      setLines(newLines);
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

      <div className="lines-section">
        <div className="section-header">
          <label>텍스트 줄 관리</label>
          <button className="add-line-btn" onClick={addLine}>+ 줄 추가</button>
        </div>
        <p className="help-text">
          각 줄의 텍스트와 스타일을 개별적으로 조절할 수 있습니다.
        </p>

        {lines.map((line, index) => (
          <div key={line.id} className="line-card">
            <div className="line-header">
              <span className="line-number">줄 {index + 1}</span>
              <div className="line-actions">
                <button 
                  className="move-btn" 
                  onClick={() => moveLine(line.id, 'up')}
                  disabled={index === 0}
                >
                  ↑
                </button>
                <button 
                  className="move-btn" 
                  onClick={() => moveLine(line.id, 'down')}
                  disabled={index === lines.length - 1}
                >
                  ↓
                </button>
                <button 
                  className="delete-btn" 
                  onClick={() => removeLine(line.id)}
                >
                  삭제
                </button>
              </div>
            </div>

            <div className="line-content">
              <input
                type="text"
                className="text-input"
                value={line.text}
                onChange={(e) => updateLine(line.id, 'text', e.target.value)}
                placeholder="텍스트 입력"
              />

              <div className="sliders-grid">
                <div className="slider-group">
                  <label>글자 크기</label>
                  <div className="slider-row">
                    <input
                      type="range"
                      min="16"
                      max="120"
                      value={line.fontSize}
                      onChange={(e) => updateLine(line.id, 'fontSize', parseInt(e.target.value))}
                    />
                    <span className="slider-value">{line.fontSize}px</span>
                  </div>
                </div>

                <div className="slider-group">
                  <label>자간</label>
                  <div className="slider-row">
                    <input
                      type="range"
                      min="-10"
                      max="30"
                      value={line.letterSpacing}
                      onChange={(e) => updateLine(line.id, 'letterSpacing', parseInt(e.target.value))}
                    />
                    <span className="slider-value">{line.letterSpacing}px</span>
                  </div>
                </div>

                <div className="slider-group">
                  <label>굵기</label>
                  <div className="slider-row">
                    <input
                      type="range"
                      min="100"
                      max="900"
                      step="100"
                      value={line.fontWeight}
                      onChange={(e) => updateLine(line.id, 'fontWeight', parseInt(e.target.value))}
                    />
                    <span className="slider-value">{line.fontWeight}</span>
                  </div>
                </div>

                <div className="slider-group">
                  <label>아래 여백</label>
                  <div className="slider-row">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={line.marginBottom}
                      onChange={(e) => updateLine(line.id, 'marginBottom', parseInt(e.target.value))}
                    />
                    <span className="slider-value">{line.marginBottom}px</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
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
          <div className="preview-text">
            {lines.map((line) => (
              <div
                key={line.id}
                style={{
                  fontSize: `${line.fontSize}px`,
                  letterSpacing: `${line.letterSpacing}px`,
                  fontWeight: line.fontWeight,
                  marginBottom: `${line.marginBottom}px`,
                  lineHeight: 1.2
                }}
              >
                {line.text}
              </div>
            ))}
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
          max-width: 900px;
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

        .lines-section {
          margin-bottom: 2rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .section-header label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
        }

        .add-line-btn {
          padding: 0.5rem 1rem;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .add-line-btn:hover {
          background: #059669;
        }

        .help-text {
          font-size: 0.8rem;
          color: #6b7280;
          margin-bottom: 1rem;
        }

        .line-card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .line-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .line-number {
          font-weight: 600;
          color: #374151;
        }

        .line-actions {
          display: flex;
          gap: 0.5rem;
        }

        .move-btn {
          padding: 0.25rem 0.75rem;
          background: #e5e7eb;
          border: none;
          border-radius: 0.25rem;
          cursor: pointer;
          font-size: 0.875rem;
        }

        .move-btn:hover:not(:disabled) {
          background: #d1d5db;
        }

        .move-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .delete-btn {
          padding: 0.25rem 0.75rem;
          background: #fee2e2;
          color: #dc2626;
          border: none;
          border-radius: 0.25rem;
          cursor: pointer;
          font-size: 0.875rem;
        }

        .delete-btn:hover {
          background: #fecaca;
        }

        .line-content {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .text-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          font-size: 1rem;
        }

        .text-input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .sliders-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        @media (max-width: 640px) {
          .sliders-grid {
            grid-template-columns: 1fr;
          }
        }

        .slider-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .slider-group label {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .slider-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .slider-row input[type="range"] {
          flex: 1;
          height: 6px;
          -webkit-appearance: none;
          background: #e5e7eb;
          border-radius: 3px;
          cursor: pointer;
        }

        .slider-row input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          background: #2563eb;
          border-radius: 50%;
          cursor: pointer;
        }

        .slider-value {
          min-width: 50px;
          font-size: 0.875rem;
          color: #2563eb;
          font-weight: 500;
          text-align: right;
        }

        .preview-section {
          margin-top: 2rem;
          padding: 1.5rem;
          background: #f8f9fa;
          border-radius: 0.75rem;
        }

        .preview-section h3 {
          font-size: 0.875rem;
          color: #6b7280;
          margin-bottom: 1rem;
        }

        .hero-preview {
          background: white;
          border-radius: 0.5rem;
          padding: 2rem;
          min-height: 200px;
        }

        .preview-text {
          margin-bottom: 1.5rem;
        }

        .preview-image {
          margin-top: 1rem;
        }

        .preview-image img {
          max-width: 100%;
          max-height: 300px;
          object-fit: cover;
          border-radius: 0.5rem;
        }

        .save-btn {
          width: 100%;
          padding: 1rem;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          margin-top: 1.5rem;
          transition: background 0.2s;
        }

        .save-btn:hover:not(:disabled) {
          background: #1d4ed8;
        }

        .save-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .loading, .error {
          padding: 2rem;
          text-align: center;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
}
