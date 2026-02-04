import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import ImageUploader from './ImageUploader';
import BlockNoteEditor from './BlockNoteEditor';

const supabaseUrl = 'https://zqtmzbcfzozgzspslccp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxdG16YmNmem96Z3pzcHNsY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzM2NjAsImV4cCI6MjA4NTI0OTY2MH0.H7w5s_8sSm-_-oU8Ft9fZah6i4NjC6GqQ-GoR3_8MVo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface HeroSettings {
  id: string;
  title_line1: string;
  title_line2: string;
  hero_content: string | null;
  image_url: string | null;
}

export default function HeroForm() {
  const [settings, setSettings] = useState<HeroSettings | null>(null);
  const [heroContent, setHeroContent] = useState<string>('');
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
        // hero_content가 있으면 사용, 없으면 기존 title_line1, title_line2로 초기화
        if (data.hero_content) {
          setHeroContent(data.hero_content);
        } else {
          // 기존 데이터를 BlockNote 형식으로 변환
          const initialContent = [
            {
              type: 'heading',
              props: { level: 1 },
              content: [{ type: 'text', text: data.title_line1 || '안녕하세요' }]
            },
            {
              type: 'heading',
              props: { level: 1 },
              content: [{ type: 'text', text: data.title_line2 || 'Sungjinprint 입니다.' }]
            }
          ];
          setHeroContent(JSON.stringify(initialContent));
        }
      } else {
        // 새로 생성
        const initialContent = [
          {
            type: 'heading',
            props: { level: 1 },
            content: [{ type: 'text', text: '안녕하세요' }]
          },
          {
            type: 'heading',
            props: { level: 1 },
            content: [{ type: 'text', text: 'Sungjinprint 입니다.' }]
          }
        ];
        
        const { data: newData, error: insertError } = await supabase
          .from('hero_settings')
          .insert([{
            title_line1: '안녕하세요',
            title_line2: 'Sungjinprint 입니다.',
            hero_content: JSON.stringify(initialContent),
            image_url: null
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        setSettings(newData);
        setHeroContent(JSON.stringify(initialContent));
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
          hero_content: heroContent,
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

  // BlockNote JSON을 미리보기용 HTML로 변환
  const renderPreview = () => {
    if (!heroContent) return null;
    
    try {
      const blocks = JSON.parse(heroContent);
      if (!Array.isArray(blocks)) return null;

      return blocks.map((block: any, index: number) => {
        const content = block.content?.map((c: any) => {
          let text = c.text || '';
          if (c.styles?.bold) text = <strong key={Math.random()}>{text}</strong>;
          if (c.styles?.italic) text = <em key={Math.random()}>{text}</em>;
          return text;
        }) || [];

        const textAlign = block.props?.textAlignment || 'left';
        const style = { textAlign: textAlign as 'left' | 'center' | 'right' };

        switch (block.type) {
          case 'heading':
            const level = block.props?.level || 1;
            const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
            return <HeadingTag key={index} style={style}>{content}</HeadingTag>;
          case 'paragraph':
            if (content.length === 0 || (content.length === 1 && content[0] === '')) {
              return <br key={index} />;
            }
            return <p key={index} style={style}>{content}</p>;
          default:
            return <p key={index} style={style}>{content}</p>;
        }
      });
    } catch {
      return <p>미리보기를 불러올 수 없습니다.</p>;
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

      <div className="editor-section">
        <label>Hero 텍스트</label>
        <p className="help-text">
          자유롭게 텍스트를 입력하고 스타일을 조절하세요. 
          제목(H1, H2, H3), 굵기, 기울임, 정렬 등을 설정할 수 있습니다.
        </p>
        <BlockNoteEditor
          initialContent={heroContent}
          onChange={setHeroContent}
          height="250px"
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
          <div className="preview-text">
            {renderPreview()}
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

        .editor-section {
          margin-bottom: 1.5rem;
        }

        .editor-section label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: #374151;
        }

        .help-text {
          font-size: 0.8rem;
          color: #6b7280;
          margin-bottom: 0.75rem;
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

        .preview-text h1 {
          font-size: 2.5rem;
          font-weight: 600;
          margin: 0;
          line-height: 1.2;
        }

        .preview-text h2 {
          font-size: 2rem;
          font-weight: 600;
          margin: 0;
          line-height: 1.2;
        }

        .preview-text h3 {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0;
          line-height: 1.2;
        }

        .preview-text p {
          font-size: 1rem;
          margin: 0.5rem 0;
          line-height: 1.5;
        }

        .preview-image {
          margin-top: 1rem;
        }

        .preview-image img {
          max-width: 100%;
          height: auto;
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
