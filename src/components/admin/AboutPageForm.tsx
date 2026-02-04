import { useState, useEffect } from 'react';
import BlockNoteEditor from './BlockNoteEditor';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zqtmzbcfzozgzspslccp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxdG16YmNmem96Z3pzcHNsY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzM2NjAsImV4cCI6MjA4NTI0OTY2MH0.H7w5s_8sSm-_-oU8Ft9fZah6i4NjC6GqQ-GoR3_8MVo';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface TeamMember {
  id: number;
  name: string;
  position: string;
  image_path: string;
  sort_order: number;
  is_pet: boolean;
}

interface HistoryItem {
  id: number;
  year: string;
  month: string;
  event: string;
  sort_order: number;
}

interface AboutPageFormProps {
  initialSettings: Record<string, string>;
  initialTeamMembers?: TeamMember[];
  initialHistoryItems?: HistoryItem[];
}

interface SectionState {
  expanded: boolean;
}

export default function AboutPageForm({ initialSettings, initialTeamMembers = [], initialHistoryItems = [] }: AboutPageFormProps) {
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
  
  // Team members state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialTeamMembers);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamUploadStatus, setTeamUploadStatus] = useState('');
  
  // CEO image upload status
  const [ceoUploadStatus, setCeoUploadStatus] = useState('');
  
  // History state
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>(initialHistoryItems);
  const [editingHistory, setEditingHistory] = useState<HistoryItem | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  // Global save state
  const [savingAll, setSavingAll] = useState(false);

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

  const handleSaveAllVisibility = async () => {
    setSavingAll(true);
    setMessage(null);
    
    try {
      const visibilityKeys = [
        'about_strength_visible',
        'about_quality_visible',
        'about_values_visible',
        'about_history_visible',
        'ceo_visible',
        'team_visible',
        'about_cta_visible',
      ];
      
      for (const key of visibilityKeys) {
        if (settings[key] !== undefined) {
          await saveSetting(key, settings[key]);
        }
      }
      setMessage({ type: 'success', text: '전체 설정이 저장되었습니다.' });
    } catch (error) {
      setMessage({ type: 'error', text: '저장 중 오류가 발생했습니다.' });
    } finally {
      setSavingAll(false);
    }
  };

  const saveSection = async (sectionPrefix: string, keys: string[]) => {
    setSaving(sectionPrefix);
    setMessage(null);
    
    try {
      for (const key of keys) {
        const fullKey = key.startsWith(sectionPrefix) ? key : `${sectionPrefix}_${key}`;
        const settingKey = key.startsWith(sectionPrefix) ? key : fullKey;
        if (settings[settingKey] !== undefined) {
          await saveSetting(settingKey, settings[settingKey]);
        }
      }
      setMessage({ type: 'success', text: '저장되었습니다.' });
    } catch (error) {
      setMessage({ type: 'error', text: '저장 중 오류가 발생했습니다.' });
    } finally {
      setSaving(null);
    }
  };

  const saveCeoSection = async () => {
    setSaving('ceo');
    setMessage(null);
    
    try {
      const ceoKeys = ['ceo_subtitle', 'ceo_catchphrase', 'ceo_message', 'ceo_image'];
      for (const key of ceoKeys) {
        if (settings[key] !== undefined) {
          await saveSetting(key, settings[key]);
        }
      }
      setMessage({ type: 'success', text: 'CEO 메시지가 저장되었습니다.' });
    } catch (error) {
      setMessage({ type: 'error', text: '저장 중 오류가 발생했습니다.' });
    } finally {
      setSaving(null);
    }
  };

  const handleImageUpload = async (key: string, e: React.ChangeEvent<HTMLInputElement>, folder: string = 'about') => {
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
      const fileName = `${folder}/${timestamp}-${randomStr}.${ext}`;

      const { error } = await supabase.storage
        .from('images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
      updateSetting(key, urlData.publicUrl);
      
      if (key === 'ceo_image') {
        setCeoUploadStatus('업로드 완료!');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      alert('업로드 실패: ' + (err.message || '알 수 없는 오류'));
    }
  };

  // Team member functions
  const fetchTeamMembers = async () => {
    const { data, error } = await supabase
      .from('team')
      .select('*')
      .order('sort_order', { ascending: true });
    
    if (!error && data) {
      setTeamMembers(data);
    }
  };

  const handleAddMember = () => {
    setEditingMember({ id: 0, name: '', position: '', image_path: '', sort_order: teamMembers.length, is_pet: false });
    setTeamUploadStatus('');
    setShowTeamModal(true);
  };

  const handleEditMember = (member: TeamMember) => {
    setEditingMember({ ...member });
    setTeamUploadStatus('');
    setShowTeamModal(true);
  };

  const handleDeleteMember = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
      await fetch(`/api/team/${id}`, { method: 'DELETE' });
      await fetchTeamMembers();
    } catch (error) {
      console.error('Error:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleSaveMember = async () => {
    if (!editingMember) return;
    
    try {
      const data = {
        name: editingMember.name,
        position: editingMember.position,
        image_path: editingMember.image_path,
        sort_order: editingMember.sort_order,
        is_pet: editingMember.is_pet,
      };
      
      if (editingMember.id) {
        await fetch(`/api/team/${editingMember.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      } else {
        await fetch('/api/team', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      }
      
      setShowTeamModal(false);
      await fetchTeamMembers();
    } catch (error) {
      console.error('Error:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const handleTeamImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingMember) return;

    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    setTeamUploadStatus('업로드 중...');

    try {
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const ext = file.name.split('.').pop();
      const fileName = `team/${timestamp}-${randomStr}.${ext}`;

      const { error } = await supabase.storage
        .from('images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
      setEditingMember({ ...editingMember, image_path: urlData.publicUrl });
      setTeamUploadStatus('업로드 완료!');
    } catch (err: any) {
      console.error('Upload error:', err);
      setTeamUploadStatus('업로드 실패');
    }
  };

  // History functions
  const fetchHistoryItems = async () => {
    const { data, error } = await supabase
      .from('history')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false });
    
    if (!error && data) {
      setHistoryItems(data);
    }
  };

  const handleAddHistory = () => {
    setEditingHistory({ id: 0, year: '', month: '', event: '', sort_order: 0 });
    setShowHistoryModal(true);
  };

  const handleEditHistory = (item: HistoryItem) => {
    setEditingHistory({ ...item });
    setShowHistoryModal(true);
  };

  const handleDeleteHistory = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
      await fetch(`/api/history/${id}`, { method: 'DELETE' });
      await fetchHistoryItems();
    } catch (error) {
      console.error('Error:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleSaveHistory = async () => {
    if (!editingHistory) return;
    
    try {
      const data = {
        year: editingHistory.year,
        month: editingHistory.month,
        event: editingHistory.event,
        sort_order: editingHistory.sort_order,
      };
      
      if (editingHistory.id) {
        await fetch(`/api/history/${editingHistory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      } else {
        await fetch('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      }
      
      setShowHistoryModal(false);
      await fetchHistoryItems();
    } catch (error) {
      console.error('Error:', error);
      alert('저장 중 오류가 발생했습니다.');
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

  const renderImageUpload = (key: string, label: string, folder: string = 'about') => (
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
          onChange={(e) => handleImageUpload(key, e, folder)}
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
              <BlockNoteEditor
                initialContent={settings['about_strength_content'] || ''}
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
              <BlockNoteEditor
                initialContent={settings['about_quality_content'] || ''}
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
            <div className="history-management">
              <div className="history-header">
                <h4>연혁 관리</h4>
                <button className="btn btn-primary btn-sm" onClick={handleAddHistory}>새 연혁 추가</button>
              </div>
              <div className="history-list">
                {historyItems.map((item) => (
                  <div key={item.id} className="history-item">
                    <div className="history-year">{item.year}{item.month && `.${item.month}`}</div>
                    <div className="history-event">{item.event}</div>
                    <div className="history-actions">
                      <button className="btn btn-sm" onClick={() => handleEditHistory(item)}>수정</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeleteHistory(item.id)}>삭제</button>
                    </div>
                  </div>
                ))}
                {historyItems.length === 0 && (
                  <p className="hint">등록된 연혁이 없습니다.</p>
                )}
              </div>
            </div>
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
            <div className="form-group">
              <label className="form-label">섹션 부제목</label>
              <input
                type="text"
                value={settings['ceo_subtitle'] || ''}
                onChange={(e) => updateSetting('ceo_subtitle', e.target.value)}
                className="form-input"
                placeholder="대표 메시지"
              />
              <span className="hint">"Message from CEO" 아래에 표시되는 텍스트</span>
            </div>

            <div className="form-group">
              <label className="form-label">캐치프레이즈</label>
              <input
                type="text"
                value={settings['ceo_catchphrase'] || ''}
                onChange={(e) => updateSetting('ceo_catchphrase', e.target.value)}
                className="form-input"
                placeholder="미래의 당연함을, 조용히 대담하게."
              />
              <span className="hint">강조되는 한 줄 메시지</span>
            </div>

            <div className="form-group">
              <label className="form-label">메시지 내용</label>
              <BlockNoteEditor
                initialContent={settings['ceo_message'] || ''}
                onChange={(content) => updateSetting('ceo_message', content)}
                height="300px"
              />
              <span className="hint">마크다운 형식으로 작성하세요. 엔터로 줄바꿈, **굵게**, *기울임* 등 사용 가능</span>
            </div>

            <div className="form-group">
              <label className="form-label">CEO 이미지</label>
              <div className="image-upload-area">
                <div className="image-preview ceo-image-preview">
                  {settings['ceo_image'] ? (
                    <img src={settings['ceo_image']} alt="CEO" />
                  ) : (
                    <span className="preview-placeholder">이미지를 선택하세요</span>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload('ceo_image', e, 'ceo')}
                  style={{ display: 'none' }}
                  id="file-ceo_image"
                />
                <div className="upload-buttons">
                  <button
                    type="button"
                    onClick={() => document.getElementById('file-ceo_image')?.click()}
                    className="btn"
                  >
                    이미지 선택
                  </button>
                  {ceoUploadStatus && <span className="upload-status">{ceoUploadStatus}</span>}
                </div>
              </div>
            </div>

            <div className="section-actions">
              <button
                className="btn btn-primary"
                onClick={saveCeoSection}
                disabled={saving === 'ceo'}
              >
                {saving === 'ceo' ? '저장 중...' : 'CEO 메시지 저장'}
              </button>
            </div>
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
              <BlockNoteEditor
                initialContent={settings['team_description'] || ''}
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
                {saving === 'team' ? '저장 중...' : '섹션 설정 저장'}
              </button>
            </div>
            
            <hr style={{ margin: '24px 0' }} />
            
            {/* 팀원 관리 */}
            <div className="team-management">
              <div className="team-header">
                <h4>팀원 관리</h4>
                <button className="btn btn-primary btn-sm" onClick={handleAddMember}>
                  새 팀원 추가
                </button>
              </div>
              
              <div className="team-grid">
                {teamMembers.map((member) => (
                  <div key={member.id} className="team-card">
                    <div className="team-card-image">
                      {member.image_path ? (
                        <img src={member.image_path} alt={member.name} />
                      ) : (
                        <div className="placeholder">이미지 없음</div>
                      )}
                    </div>
                    <div className="team-card-info">
                      <h5>{member.name}</h5>
                      <p>{member.position}</p>
                    </div>
                    <div className="team-card-actions">
                      <button className="btn btn-sm" onClick={() => handleEditMember(member)}>수정</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeleteMember(member.id)}>삭제</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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

      {/* 전체 설정 저장 버튼 */}
      <div className="global-save-section">
        <button
          className="btn btn-primary btn-lg"
          onClick={handleSaveAllVisibility}
          disabled={savingAll}
        >
          {savingAll ? '저장 중...' : '전체 설정 저장'}
        </button>
        <p className="hint">각 섹션의 표시/숨김 설정을 저장합니다.</p>
      </div>

           {/* History Modal */}
      {showHistoryModal && editingHistory && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingHistory.id ? '연혁 수정' : '연혁 추가'}</h3>
            <div className="form-group">
              <label className="form-label">연도</label>
              <input
                type="text"
                value={editingHistory.year}
                onChange={(e) => setEditingHistory({ ...editingHistory, year: e.target.value })}
                className="form-input"
                placeholder="2024"
              />
            </div>
            <div className="form-group">
              <label className="form-label">월 (선택사항)</label>
              <input
                type="text"
                value={editingHistory.month}
                onChange={(e) => setEditingHistory({ ...editingHistory, month: e.target.value })}
                className="form-input"
                placeholder="01"
              />
            </div>
            <div className="form-group">
              <label className="form-label">내용</label>
              <textarea
                value={editingHistory.event}
                onChange={(e) => setEditingHistory({ ...editingHistory, event: e.target.value })}
                className="form-textarea"
                rows={3}
                placeholder="연혁 내용을 입력하세요"
              />
            </div>
            <div className="form-group">
              <label className="form-label">정렬 순서</label>
              <input
                type="number"
                value={editingHistory.sort_order}
                onChange={(e) => setEditingHistory({ ...editingHistory, sort_order: parseInt(e.target.value) || 0 })}
                className="form-input"
              />
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowHistoryModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={handleSaveHistory}>저장</button>
            </div>
          </div>
        </div>
      )}

      {/* Team Modal */}
      {showTeamModal && editingMember && (
        <div className="modal-overlay" onClick={() => setShowTeamModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingMember.id ? '팀원 수정' : '팀원 추가'}</h3>
            <div className="form-group">
              <label className="form-label">이름</label>
              <input
                type="text"
                value={editingMember.name}
                onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                className="form-input"
                placeholder="홍길동"
              />
            </div>
            <div className="form-group">
              <label className="form-label">직책</label>
              <input
                type="text"
                value={editingMember.position}
                onChange={(e) => setEditingMember({ ...editingMember, position: e.target.value })}
                className="form-input"
                placeholder="대표이사"
              />
            </div>
            <div className="form-group">
              <label className="form-label">프로필 이미지</label>
              <div className="image-upload-area">
                <div className="image-preview">
                  {editingMember.image_path ? (
                    <img src={editingMember.image_path} alt="Preview" />
                  ) : (
                    <span className="preview-placeholder">이미지를 선택하세요</span>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleTeamImageUpload}
                  style={{ display: 'none' }}
                  id="team-member-image"
                />
                <div className="upload-buttons">
                  <button
                    type="button"
                    onClick={() => document.getElementById('team-member-image')?.click()}
                    className="btn"
                  >
                    이미지 선택
                  </button>
                  {teamUploadStatus && <span className="upload-status">{teamUploadStatus}</span>}
                </div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">정렬 순서</label>
              <input
                type="number"
                value={editingMember.sort_order}
                onChange={(e) => setEditingMember({ ...editingMember, sort_order: parseInt(e.target.value) || 0 })}
                className="form-input"
              />
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowTeamModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={handleSaveMember}>저장</button>
            </div>
          </div>
        </div>
      )}

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
        .hint { font-size: 0.875rem; color: #6b7280; margin-top: 4px; display: block; }
        
        .btn { padding: 8px 16px; border: 1px solid #ddd; border-radius: 6px; background: white; cursor: pointer; text-decoration: none; display: inline-block; }
        .btn-primary { background: #333; color: white; border-color: #333; }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-danger { background: #dc3545; color: white; border-color: #dc3545; }
        .btn-sm { padding: 4px 12px; font-size: 0.875rem; }
        .btn-lg { padding: 12px 32px; font-size: 1.1rem; }
        
        .global-save-section {
          margin-top: 32px;
          padding: 24px;
          background: #f9fafb;
          border-radius: 12px;
          text-align: center;
        }
        .global-save-section .hint { margin-top: 12px; }
        
        .section-actions { margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
        
        .image-upload-area { border: 2px dashed #ddd; border-radius: 8px; padding: 16px; }
        .image-preview { width: 200px; height: 150px; background: #f9f9f9; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; overflow: hidden; }
        .image-preview img { width: 100%; height: 100%; object-fit: cover; }
        .ceo-image-preview { width: 200px; height: 200px; }
        .preview-placeholder { color: #999; font-size: 0.875rem; }
        .upload-buttons { display: flex; align-items: center; gap: 12px; }
        .upload-status { font-size: 0.75rem; color: #28a745; }
        
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
        
        /* History Management Styles */
        .history-management { margin-top: 0; }
        .history-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .history-header h4 { margin: 0; font-size: 1rem; font-weight: 600; }
        .history-list { display: flex; flex-direction: column; gap: 8px; }
        .history-item { display: flex; align-items: center; gap: 16px; padding: 12px 16px; background: #f9fafb; border-radius: 8px; }
        .history-year { font-weight: 600; min-width: 80px; color: #333; }
        .history-event { flex: 1; color: #666; }
        .history-actions { display: flex; gap: 8px; }

        /* Team Management Styles */
        .team-management { margin-top: 16px; }
        .team-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .team-header h4 { margin: 0; font-size: 1rem; font-weight: 600; }
        
        .team-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
        }
        
        .team-card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .team-card-image {
          height: 150px;
          background: #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .team-card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .team-card-image .placeholder {
          color: #9ca3af;
          font-size: 0.875rem;
        }
        
        .team-card-info {
          padding: 12px;
        }
        
        .team-card-info h5 {
          margin: 0 0 4px 0;
          font-size: 1rem;
          font-weight: 600;
        }
        
        .team-card-info p {
          margin: 0;
          color: #6b7280;
          font-size: 0.875rem;
        }
        
        .team-card-actions {
          padding: 0 12px 12px;
          display: flex;
          gap: 8px;
        }
        
        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .modal-content {
          background: white;
          padding: 24px;
          border-radius: 12px;
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
        }
        
        .modal-content h3 {
          margin: 0 0 20px 0;
          font-size: 1.25rem;
          font-weight: 600;
        }
        
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }
        
        @media (max-width: 768px) {
          .values-grid {
            grid-template-columns: 1fr;
          }
          .team-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
