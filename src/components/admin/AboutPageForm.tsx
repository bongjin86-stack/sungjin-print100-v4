import { useState } from 'react';
import ToastEditor from './ToastEditor';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zqtmzbcfzozgzspslccp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxdG16YmNmem96Z3pzcHNsY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzM2NjAsImV4cCI6MjA4NTI0OTY2MH0.H7w5s_8sSm-_-oU8Ft9fZah6i4NjC6GqQ-GoR3_8MVo';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface AboutPageFormProps {
  initialSettings: Record<string, string>;
}

interface SectionState {
  expanded: boolean;
}

export default function AboutPageForm({ initialSettings }: AboutPageFormProps) {
  const [settings, setSettings] = useState<Record<string, string>>(initialSettings);
  const [sections, setSections] = useState<Record<string, SectionState>>({
    strength: { expanded: false },
    quality: { expanded: false },
    values: { expanded: false },
    history: { expanded: false },
    ceo: { expanded: false },
    team: { expanded: false },
    cta: { expanded: false },
  });
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const toggleSection = (section: string) => {
    setSections(prev => ({
      ...prev,
      [section]: { ...prev[section], expanded: !prev[section].expanded }
    }));
  };

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const toggleVisibility = async (key: string) => {
    const newValue = settings[key] === 'true' ? 'false' : 'true';
    updateSetting(key, newValue);
    await saveSetting(key, newValue);
  };

  const saveSetting = async (key: string, value: string) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      if (!response.ok) throw new Error('저장 실패');
      return true;
    } catch (error) {
      console.error('Save error:', error);
      return false;
    }
  };

  const saveSection = async (sectionPrefix: string, keys: string[]) => {
    setSaving(sectionPrefix);
    setMessage(null);
    
    try {
      for (const key of keys) {
        const fullKey = `${sectionPrefix}_${key}`;
        if (settings[fullKey] !== undefined) {
          await saveSetting(fullKey, settings[fullKey]);
        }
      }
      setMessage({ type: 'success', text: '저장되었습니다.' });
    } catch (error) {
      setMessage({ type: 'error', text: '저장 중 오류가 발생했습니다.' });
    } finally {
      setSaving(null);
    }
  };

  const handleImageUpload = async (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    try {
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const ext = file.name.split('.').pop();
      const fileName = `about/${timestamp}-${randomStr}.${ext}`;

      const { error } = await supabase.storage
        .from('images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
      updateSetting(key, urlData.publicUrl);
    } catch (err: any) {
      console.error('Upload error:', err);
      alert('업로드 실패: ' + (err.message || '알 수 없는 오류'));
    }
  };

  const renderToggle = (key: string) => (
    <label className="toggle-switch">
      <input
        type="checkbox"
        checked={settings[key] === 'true'}
        onChange={() => toggleVisibility(key)}
      />
      <span className="toggle-slider"></span>
      <span className="toggle-label">{settings[key] === 'true' ? '표시' : '숨김'}</span>
    </label>
  );

  const renderImageUpload = (key: string, label: string) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div className="image-upload-area">
        <div className="image-preview">
          {settings[key] ? (
            <img src={settings[key]} alt={label} />
          ) : (
            <span className="preview-placeholder">이미지를 선택하세요</span>
          )}
        </div>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleImageUpload(key, e)}
          style={{ display: 'none' }}
          id={`file-${key}`}
        />
        <button
          type="button"
          onClick={() => document.getElementById(`file-${key}`)?.click()}
          className="btn"
        >
          이미지 선택
        </button>
      </div>
    </div>
  );

  return (
    <div className="about-page-form">
      {message && (
        <div className={`form-message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* 강점 섹션 */}
      <div className="section-card">
        <div className="section-header" onClick={() => toggleSection('strength')}>
          <div className="section-title">
            <span className={`expand-icon ${sections.strength.expanded ? 'expanded' : ''}`}>▶</span>
            <h3>Sungjinprint의 강점</h3>
          </div>
          <div className="section-controls" onClick={(e) => e.stopPropagation()}>
            {renderToggle('about_strength_visible')}
          </div>
        </div>
        {sections.strength.expanded && (
          <div className="section-content">
            <div className="form-group">
              <label className="form-label">제목</label>
              <input
                type="text"
                value={settings['about_strength_title'] || ''}
                onChange={(e) => updateSetting('about_strength_title', e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">내용</label>
              <ToastEditor
                initialValue={settings['about_strength_content'] || ''}
                onChange={(content) => updateSetting('about_strength_content', content)}
                height="200px"
              />
            </div>
            {renderImageUpload('about_strength_image', '이미지')}
            <div className="section-actions">
              <button
                className="btn btn-primary"
                onClick={() => saveSection('about_strength', ['title', 'content', 'image', 'visible'])}
                disabled={saving === 'about_strength'}
              >
                {saving === 'about_strength' ? '저장 중...' : '이 섹션 저장'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 품질 섹션 */}
      <div className="section-card">
        <div className="section-header" onClick={() => toggleSection('quality')}>
          <div className="section-title">
            <span className={`expand-icon ${sections.quality.expanded ? 'expanded' : ''}`}>▶</span>
            <h3>품질에 대한 고집</h3>
          </div>
          <div className="section-controls" onClick={(e) => e.stopPropagation()}>
            {renderToggle('about_quality_visible')}
          </div>
        </div>
        {sections.quality.expanded && (
          <div className="section-content">
            <div className="form-group">
              <label className="form-label">제목</label>
              <input
                type="text"
                value={settings['about_quality_title'] || ''}
                onChange={(e) => updateSetting('about_quality_title', e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">내용</label>
              <ToastEditor
                initialValue={settings['about_quality_content'] || ''}
                onChange={(content) => updateSetting('about_quality_content', content)}
                height="200px"
              />
            </div>
            {renderImageUpload('about_quality_image', '이미지')}
            <div className="section-actions">
              <button
                className="btn btn-primary"
                onClick={() => saveSection('about_quality', ['title', 'content', 'image', 'visible'])}
                disabled={saving === 'about_quality'}
              >
                {saving === 'about_quality' ? '저장 중...' : '이 섹션 저장'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Values 섹션 */}
      <div className="section-card">
        <div className="section-header" onClick={() => toggleSection('values')}>
          <div className="section-title">
            <span className={`expand-icon ${sections.values.expanded ? 'expanded' : ''}`}>▶</span>
            <h3>Our Values (선택하는 이유)</h3>
          </div>
          <div className="section-controls" onClick={(e) => e.stopPropagation()}>
            {renderToggle('about_values_visible')}
          </div>
        </div>
        {sections.values.expanded && (
          <div className="section-content">
            <div className="form-group">
              <label className="form-label">섹션 제목</label>
              <input
                type="text"
                value={settings['about_values_title'] || ''}
                onChange={(e) => updateSetting('about_values_title', e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">섹션 부제목</label>
              <input
                type="text"
                value={settings['about_values_subtitle'] || ''}
                onChange={(e) => updateSetting('about_values_subtitle', e.target.value)}
                className="form-input"
              />
            </div>
            
            <div className="values-grid">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="value-item">
                  <h4>항목 {i}</h4>
                  <div className="form-group">
                    <label className="form-label">제목</label>
                    <input
                      type="text"
                      value={settings[`about_values_item${i}_title`] || ''}
                      onChange={(e) => updateSetting(`about_values_item${i}_title`, e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">내용</label>
                    <textarea
                      value={settings[`about_values_item${i}_content`] || ''}
                      onChange={(e) => updateSetting(`about_values_item${i}_content`, e.target.value)}
                      className="form-textarea"
                      rows={3}
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="section-actions">
              <button
                className="btn btn-primary"
                onClick={() => saveSection('about_values', [
                  'title', 'subtitle', 'visible',
                  'item1_title', 'item1_content',
                  'item2_title', 'item2_content',
                  'item3_title', 'item3_content',
                  'item4_title', 'item4_content',
                ])}
                disabled={saving === 'about_values'}
              >
                {saving === 'about_values' ? '저장 중...' : '이 섹션 저장'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* History 섹션 */}
      <div className="section-card">
        <div className="section-header" onClick={() => toggleSection('history')}>
          <div className="section-title">
            <span className={`expand-icon ${sections.history.expanded ? 'expanded' : ''}`}>▶</span>
            <h3>History (회사 연혁)</h3>
          </div>
          <div className="section-controls" onClick={(e) => e.stopPropagation()}>
            {renderToggle('about_history_visible')}
          </div>
        </div>
        {sections.history.expanded && (
          <div className="section-content">
            <p className="hint">연혁 항목은 별도의 "연혁 관리" 메뉴에서 편집할 수 있습니다.</p>
            <a href="/admin/history" className="btn">연혁 관리로 이동</a>
          </div>
        )}
      </div>

      {/* CEO 메시지 섹션 */}
      <div className="section-card">
        <div className="section-header" onClick={() => toggleSection('ceo')}>
          <div className="section-title">
            <span className={`expand-icon ${sections.ceo.expanded ? 'expanded' : ''}`}>▶</span>
            <h3>CEO 메시지</h3>
          </div>
          <div className="section-controls" onClick={(e) => e.stopPropagation()}>
            {renderToggle('ceo_visible')}
          </div>
        </div>
        {sections.ceo.expanded && (
          <div className="section-content">
            <p className="hint">CEO 메시지는 별도의 "CEO 메시지" 메뉴에서 편집할 수 있습니다.</p>
            <a href="/admin/ceo" className="btn">CEO 메시지 관리로 이동</a>
          </div>
        )}
      </div>

      {/* Team 섹션 */}
      <div className="section-card">
        <div className="section-header" onClick={() => toggleSection('team')}>
          <div className="section-title">
            <span className={`expand-icon ${sections.team.expanded ? 'expanded' : ''}`}>▶</span>
            <h3>Meet Our Team (팀 소개)</h3>
          </div>
          <div className="section-controls" onClick={(e) => e.stopPropagation()}>
            {renderToggle('team_visible')}
          </div>
        </div>
        {sections.team.expanded && (
          <div className="section-content">
            <div className="form-group">
              <label className="form-label">섹션 제목</label>
              <input
                type="text"
                value={settings['team_title'] || ''}
                onChange={(e) => updateSetting('team_title', e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">섹션 부제목</label>
              <input
                type="text"
                value={settings['team_subtitle'] || ''}
                onChange={(e) => updateSetting('team_subtitle', e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">소개 내용</label>
              <ToastEditor
                initialValue={settings['team_description'] || ''}
                onChange={(content) => updateSetting('team_description', content)}
                height="200px"
              />
            </div>
            <div className="section-actions">
              <button
                className="btn btn-primary"
                onClick={() => saveSection('team', ['title', 'subtitle', 'description', 'visible'])}
                disabled={saving === 'team'}
              >
                {saving === 'team' ? '저장 중...' : '이 섹션 저장'}
              </button>
            </div>
            <hr style={{ margin: '24px 0' }} />
            <p className="hint">팀원 정보는 별도의 "팀 관리" 메뉴에서 편집할 수 있습니다.</p>
            <a href="/admin/team" className="btn">팀원 관리로 이동</a>
          </div>
        )}
      </div>

      {/* CTA 섹션 */}
      <div className="section-card">
        <div className="section-header" onClick={() => toggleSection('cta')}>
          <div className="section-title">
            <span className={`expand-icon ${sections.cta.expanded ? 'expanded' : ''}`}>▶</span>
            <h3>문의하기 (CTA)</h3>
          </div>
          <div className="section-controls" onClick={(e) => e.stopPropagation()}>
            {renderToggle('about_cta_visible')}
          </div>
        </div>
        {sections.cta.expanded && (
          <div className="section-content">
            <p className="hint">문의하기 섹션의 표시 여부만 설정할 수 있습니다.</p>
          </div>
        )}
      </div>

      <style>{`
        .about-page-form { }
        
        .form-message { padding: 12px 16px; border-radius: 8px; margin-bottom: 24px; }
        .form-message.success { background: #d4edda; color: #155724; }
        .form-message.error { background: #f8d7da; color: #721c24; }
        
        .section-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          margin-bottom: 16px;
          overflow: hidden;
        }
        
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          cursor: pointer;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .section-header:hover {
          background: #f3f4f6;
        }
        
        .section-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .section-title h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
        }
        
        .expand-icon {
          font-size: 0.75rem;
          transition: transform 0.2s;
          color: #6b7280;
        }
        
        .expand-icon.expanded {
          transform: rotate(90deg);
        }
        
        .section-controls {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .section-content {
          padding: 20px;
        }
        
        .toggle-switch {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }
        
        .toggle-switch input {
          display: none;
        }
        
        .toggle-slider {
          width: 44px;
          height: 24px;
          background: #e5e7eb;
          border-radius: 12px;
          position: relative;
          transition: background 0.2s;
        }
        
        .toggle-slider::after {
          content: '';
          position: absolute;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          top: 2px;
          left: 2px;
          transition: transform 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        
        .toggle-switch input:checked + .toggle-slider {
          background: #10b981;
        }
        
        .toggle-switch input:checked + .toggle-slider::after {
          transform: translateX(20px);
        }
        
        .toggle-label {
          font-size: 0.875rem;
          color: #6b7280;
        }
        
        .form-group { margin-bottom: 20px; }
        .form-label { display: block; margin-bottom: 8px; font-weight: 500; color: #374151; }
        .form-input, .form-textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 1rem;
          box-sizing: border-box;
        }
        .form-textarea { resize: vertical; font-family: inherit; }
        .hint { font-size: 0.875rem; color: #6b7280; margin-bottom: 12px; }
        
        .btn { padding: 8px 16px; border: 1px solid #ddd; border-radius: 6px; background: white; cursor: pointer; text-decoration: none; display: inline-block; }
        .btn-primary { background: #333; color: white; border-color: #333; }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        
        .section-actions { margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
        
        .image-upload-area { border: 2px dashed #ddd; border-radius: 8px; padding: 16px; }
        .image-preview { width: 200px; height: 150px; background: #f9f9f9; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; overflow: hidden; }
        .image-preview img { width: 100%; height: 100%; object-fit: cover; }
        .preview-placeholder { color: #999; font-size: 0.875rem; }
        
        .values-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-top: 16px;
        }
        
        .value-item {
          background: #f9fafb;
          padding: 16px;
          border-radius: 8px;
        }
        
        .value-item h4 {
          margin: 0 0 12px 0;
          font-size: 0.875rem;
          color: #6b7280;
        }
        
        @media (max-width: 768px) {
          .values-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
