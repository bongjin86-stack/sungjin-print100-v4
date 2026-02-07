import { useEffect, useState } from 'react';

import { supabase, uploadImage } from '@/lib/supabase';

import { adminFormStyles as styles } from './adminFormStyles';

type TabType = 'strength' | 'quality' | 'values' | 'history' | 'ceo' | 'team';

interface FormData {
  // 강점 섹션
  about_strength_visible: string;
  about_strength_title: string;
  about_strength_content: string;
  about_strength_image: string;
  // 품질 섹션
  about_quality_visible: string;
  about_quality_title: string;
  about_quality_content: string;
  about_quality_image: string;
  // Values 섹션
  about_values_visible: string;
  about_values_title: string;
  about_values_subtitle: string;
  about_values_item1_title: string;
  about_values_item1_content: string;
  about_values_item2_title: string;
  about_values_item2_content: string;
  about_values_item3_title: string;
  about_values_item3_content: string;
  about_values_item4_title: string;
  about_values_item4_content: string;
  // 연혁 섹션
  about_history_visible: string;
  // CEO 섹션
  ceo_visible: string;
  ceo_subtitle: string;
  ceo_catchphrase: string;
  ceo_message: string;
  ceo_image: string;
  // Team 섹션
  team_visible: string;
  team_title: string;
  team_subtitle: string;
  team_description: string;
}

interface HistoryItem {
  id: number;
  year: string;
  month: string;
  event: string;
  sort_order: number;
}

interface TeamMember {
  id: number;
  name: string;
  position: string;
  image_path: string;
  sort_order: number;
}

const defaultValues: FormData = {
  about_strength_visible: 'true',
  about_strength_title: 'Sungjinprint의 강점',
  about_strength_content: '',
  about_strength_image: '',
  about_quality_visible: 'true',
  about_quality_title: '품질에 대한 고집',
  about_quality_content: '',
  about_quality_image: '',
  about_values_visible: 'true',
  about_values_title: 'Our Values',
  about_values_subtitle: 'Sungjinprint를 선택하는 이유',
  about_values_item1_title: '',
  about_values_item1_content: '',
  about_values_item2_title: '',
  about_values_item2_content: '',
  about_values_item3_title: '',
  about_values_item3_content: '',
  about_values_item4_title: '',
  about_values_item4_content: '',
  about_history_visible: 'true',
  ceo_visible: 'true',
  ceo_subtitle: '대표 메시지',
  ceo_catchphrase: '',
  ceo_message: '',
  ceo_image: '',
  team_visible: 'true',
  team_title: 'Meet Our Team',
  team_subtitle: '팀 소개',
  team_description: '',
};

export default function AboutPageForm() {
  const [activeTab, setActiveTab] = useState<TabType>('strength');
  const [formData, setFormData] = useState<FormData>(defaultValues);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 연혁 & 팀 데이터
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [editingHistory, setEditingHistory] = useState<HistoryItem | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsRes, historyRes, teamRes] = await Promise.all([
        supabase.from('site_settings').select('key, value'),
        supabase.from('history').select('*').order('year', { ascending: false }),
        supabase.from('team').select('*').order('sort_order', { ascending: true }),
      ]);

      if (settingsRes.data) {
        const configMap: Record<string, string> = {};
        settingsRes.data.forEach((item: { key: string; value: string }) => {
          configMap[item.key] = item.value;
        });

        setFormData((prev) => {
          const newData = { ...prev };
          Object.keys(prev).forEach((key) => {
            if (configMap[key] !== undefined) {
              newData[key as keyof FormData] = configMap[key];
            }
          });
          return newData;
        });
      }

      if (historyRes.data) setHistoryItems(historyRes.data);
      if (teamRes.data) setTeamMembers(teamRes.data);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggle = (key: keyof FormData) => {
    setFormData((prev) => ({
      ...prev,
      [key]: prev[key] === 'true' ? 'false' : 'true',
    }));
  };

  const handleImageUpload = async (key: keyof FormData, file: File) => {
    try {
      const publicUrl = await uploadImage(file, 'about');
      setFormData((prev) => ({ ...prev, [key]: publicUrl }));
    } catch (err) {
      console.error('업로드 실패:', err);
      alert('이미지 업로드에 실패했습니다.');
    }
  };

  const getFieldsForTab = (tab: TabType): string[] => {
    switch (tab) {
      case 'strength':
        return ['about_strength_visible', 'about_strength_title', 'about_strength_content', 'about_strength_image'];
      case 'quality':
        return ['about_quality_visible', 'about_quality_title', 'about_quality_content', 'about_quality_image'];
      case 'values':
        return [
          'about_values_visible', 'about_values_title', 'about_values_subtitle',
          'about_values_item1_title', 'about_values_item1_content',
          'about_values_item2_title', 'about_values_item2_content',
          'about_values_item3_title', 'about_values_item3_content',
          'about_values_item4_title', 'about_values_item4_content',
        ];
      case 'history':
        return ['about_history_visible'];
      case 'ceo':
        return ['ceo_visible', 'ceo_subtitle', 'ceo_catchphrase', 'ceo_message', 'ceo_image'];
      case 'team':
        return ['team_visible', 'team_title', 'team_subtitle', 'team_description'];
      default:
        return [];
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const fieldsToSave = getFieldsForTab(activeTab);
      const updates = fieldsToSave.map((key) => ({
        key,
        value: formData[key as keyof FormData],
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from('site_settings').upsert(updates, { onConflict: 'key' });
      if (error) throw error;

      setMessage({ type: 'success', text: '저장되었습니다.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('저장 실패:', error);
      setMessage({ type: 'error', text: '저장에 실패했습니다.' });
    } finally {
      setSaving(false);
    }
  };

  // 연혁 CRUD
  const handleSaveHistory = async () => {
    if (!editingHistory) return;
    try {
      if (editingHistory.id) {
        await supabase.from('history').update({
          year: editingHistory.year,
          month: editingHistory.month,
          event: editingHistory.event,
        }).eq('id', editingHistory.id);
      } else {
        await supabase.from('history').insert({
          year: editingHistory.year,
          month: editingHistory.month,
          event: editingHistory.event,
          sort_order: historyItems.length,
        });
      }
      setEditingHistory(null);
      const { data } = await supabase.from('history').select('*').order('year', { ascending: false });
      if (data) setHistoryItems(data);
    } catch (err) {
      alert('저장에 실패했습니다.');
    }
  };

  const handleDeleteHistory = async (id: number) => {
    if (!confirm('삭제하시겠습니까?')) return;
    await supabase.from('history').delete().eq('id', id);
    setHistoryItems((prev) => prev.filter((item) => item.id !== id));
  };

  // 팀원 CRUD
  const handleSaveMember = async () => {
    if (!editingMember) return;
    try {
      if (editingMember.id) {
        await supabase.from('team').update({
          name: editingMember.name,
          position: editingMember.position,
          image_path: editingMember.image_path,
        }).eq('id', editingMember.id);
      } else {
        await supabase.from('team').insert({
          name: editingMember.name,
          position: editingMember.position,
          image_path: editingMember.image_path,
          sort_order: teamMembers.length,
        });
      }
      setEditingMember(null);
      const { data } = await supabase.from('team').select('*').order('sort_order', { ascending: true });
      if (data) setTeamMembers(data);
    } catch (err) {
      alert('저장에 실패했습니다.');
    }
  };

  const handleDeleteMember = async (id: number) => {
    if (!confirm('삭제하시겠습니까?')) return;
    await supabase.from('team').delete().eq('id', id);
    setTeamMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleMemberImageUpload = async (file: File) => {
    if (!editingMember) return;
    try {
      const publicUrl = await uploadImage(file, 'team');
      setEditingMember({ ...editingMember, image_path: publicUrl });
    } catch (err) {
      alert('업로드 실패');
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>로딩 중...</div>;
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: 'strength', label: '강점' },
    { id: 'quality', label: '품질' },
    { id: 'values', label: 'Values' },
    { id: 'history', label: '연혁' },
    { id: 'ceo', label: 'CEO' },
    { id: 'team', label: 'Team' },
  ];

  const renderVisibilityToggle = (key: keyof FormData) => (
    <div style={localStyles.toggleRow}>
      <span style={localStyles.toggleLabel}>섹션 표시</span>
      <button
        type="button"
        onClick={() => handleToggle(key)}
        style={{
          ...localStyles.toggle,
          background: formData[key] === 'true' ? '#10b981' : '#d1d5db',
        }}
      >
        <span
          style={{
            ...localStyles.toggleKnob,
            transform: formData[key] === 'true' ? 'translateX(20px)' : 'translateX(0)',
          }}
        />
      </button>
      <span style={localStyles.toggleStatus}>{formData[key] === 'true' ? '표시' : '숨김'}</span>
    </div>
  );

  const renderImageUpload = (key: keyof FormData, label: string) => (
    <div style={styles.formGroup}>
      <label style={styles.label}>{label}</label>
      <div style={localStyles.imageUpload}>
        {formData[key] ? (
          <img src={formData[key]} alt={label} style={localStyles.imagePreview} />
        ) : (
          <div style={localStyles.imagePlaceholder}>이미지 없음</div>
        )}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => e.target.files?.[0] && handleImageUpload(key, e.target.files[0])}
          style={{ marginTop: '0.5rem' }}
        />
      </div>
    </div>
  );

  const renderTextareaWithPreview = (
    name: string,
    value: string,
    label: string,
    rows: number = 6,
    placeholder?: string
  ) => (
    <div style={styles.formGroup}>
      <label style={styles.label}>{label}</label>
      <textarea
        name={name}
        value={value}
        onChange={handleChange}
        rows={rows}
        style={styles.textarea}
        placeholder={placeholder}
      />
      <p style={localStyles.hint}>줄바꿈(Enter)이 그대로 반영됩니다.</p>
      {value && (
        <div style={localStyles.preview}>
          <span style={localStyles.previewLabel}>미리보기</span>
          <div style={localStyles.previewContent}>
            {value.split('\n').map((line, i) =>
              line ? (
                <span key={i}>
                  {line}
                  <br />
                </span>
              ) : (
                <br key={i} />
              )
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={styles.form}>
      {/* 탭 네비게이션 */}
      <div style={localStyles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...localStyles.tab,
              ...(activeTab === tab.id ? localStyles.tabActive : {}),
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {message && (
        <div style={message.type === 'success' ? styles.messageSuccess : styles.messageError}>
          {message.text}
        </div>
      )}

      {/* 강점 섹션 */}
      {activeTab === 'strength' && (
        <div style={styles.formGrid}>
          {renderVisibilityToggle('about_strength_visible')}
          <div style={styles.formGroup}>
            <label style={styles.label}>제목</label>
            <input
              type="text"
              name="about_strength_title"
              value={formData.about_strength_title}
              onChange={handleChange}
              style={styles.input}
            />
          </div>
          {renderTextareaWithPreview(
            'about_strength_content',
            formData.about_strength_content,
            '내용',
            10
          )}
          {renderImageUpload('about_strength_image', '이미지')}
        </div>
      )}

      {/* 품질 섹션 */}
      {activeTab === 'quality' && (
        <div style={styles.formGrid}>
          {renderVisibilityToggle('about_quality_visible')}
          <div style={styles.formGroup}>
            <label style={styles.label}>제목</label>
            <input
              type="text"
              name="about_quality_title"
              value={formData.about_quality_title}
              onChange={handleChange}
              style={styles.input}
            />
          </div>
          {renderTextareaWithPreview(
            'about_quality_content',
            formData.about_quality_content,
            '내용',
            10
          )}
          {renderImageUpload('about_quality_image', '이미지')}
        </div>
      )}

      {/* Values 섹션 */}
      {activeTab === 'values' && (
        <div style={styles.formGrid}>
          {renderVisibilityToggle('about_values_visible')}
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>제목</label>
              <input
                type="text"
                name="about_values_title"
                value={formData.about_values_title}
                onChange={handleChange}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>부제목</label>
              <input
                type="text"
                name="about_values_subtitle"
                value={formData.about_values_subtitle}
                onChange={handleChange}
                style={styles.input}
              />
            </div>
          </div>
          <div style={localStyles.valuesGrid}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={localStyles.valueItem}>
                <h4 style={localStyles.valueItemTitle}>항목 {i}</h4>
                <input
                  type="text"
                  name={`about_values_item${i}_title`}
                  value={formData[`about_values_item${i}_title` as keyof FormData]}
                  onChange={handleChange}
                  placeholder="제목"
                  style={{ ...styles.input, marginBottom: '0.5rem' }}
                />
                <textarea
                  name={`about_values_item${i}_content`}
                  value={formData[`about_values_item${i}_content` as keyof FormData]}
                  onChange={handleChange}
                  placeholder="내용"
                  rows={3}
                  style={styles.textarea}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 연혁 섹션 */}
      {activeTab === 'history' && (
        <div style={styles.formGrid}>
          {renderVisibilityToggle('about_history_visible')}
          <div style={localStyles.listHeader}>
            <h4 style={{ margin: 0 }}>연혁 목록</h4>
            <button
              type="button"
              onClick={() => setEditingHistory({ id: 0, year: '', month: '', event: '', sort_order: 0 })}
              style={localStyles.addBtn}
            >
              + 추가
            </button>
          </div>
          <div style={localStyles.listContainer}>
            {historyItems.map((item) => (
              <div key={item.id} style={localStyles.listItem}>
                <span style={localStyles.listItemDate}>{item.year}.{item.month || '00'}</span>
                <span style={localStyles.listItemText}>{item.event}</span>
                <div style={localStyles.listItemActions}>
                  <button onClick={() => setEditingHistory(item)} style={localStyles.editBtn}>수정</button>
                  <button onClick={() => handleDeleteHistory(item.id)} style={localStyles.deleteBtn}>삭제</button>
                </div>
              </div>
            ))}
            {historyItems.length === 0 && <p style={{ color: '#6b7280' }}>등록된 연혁이 없습니다.</p>}
          </div>

          {/* 연혁 편집 모달 */}
          {editingHistory && (
            <div style={localStyles.modal}>
              <div style={localStyles.modalContent}>
                <h4>{editingHistory.id ? '연혁 수정' : '연혁 추가'}</h4>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="연도"
                    value={editingHistory.year}
                    onChange={(e) => setEditingHistory({ ...editingHistory, year: e.target.value })}
                    style={{ ...styles.input, flex: 1 }}
                  />
                  <input
                    type="text"
                    placeholder="월"
                    value={editingHistory.month}
                    onChange={(e) => setEditingHistory({ ...editingHistory, month: e.target.value })}
                    style={{ ...styles.input, width: '80px' }}
                  />
                </div>
                <textarea
                  placeholder="내용"
                  value={editingHistory.event}
                  onChange={(e) => setEditingHistory({ ...editingHistory, event: e.target.value })}
                  rows={3}
                  style={{ ...styles.textarea, marginBottom: '1rem' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button onClick={() => setEditingHistory(null)} style={localStyles.cancelBtn}>취소</button>
                  <button onClick={handleSaveHistory} style={localStyles.saveModalBtn}>저장</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CEO 섹션 */}
      {activeTab === 'ceo' && (
        <div style={styles.formGrid}>
          {renderVisibilityToggle('ceo_visible')}
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>부제목</label>
              <input
                type="text"
                name="ceo_subtitle"
                value={formData.ceo_subtitle}
                onChange={handleChange}
                style={styles.input}
                placeholder="대표 메시지"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>캐치프레이즈</label>
              <input
                type="text"
                name="ceo_catchphrase"
                value={formData.ceo_catchphrase}
                onChange={handleChange}
                style={styles.input}
                placeholder="미래의 당연함을, 조용히 대담하게."
              />
            </div>
          </div>
          {renderTextareaWithPreview(
            'ceo_message',
            formData.ceo_message,
            '메시지 내용',
            10
          )}
          {renderImageUpload('ceo_image', 'CEO 이미지')}
        </div>
      )}

      {/* Team 섹션 */}
      {activeTab === 'team' && (
        <div style={styles.formGrid}>
          {renderVisibilityToggle('team_visible')}
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>제목</label>
              <input
                type="text"
                name="team_title"
                value={formData.team_title}
                onChange={handleChange}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>부제목</label>
              <input
                type="text"
                name="team_subtitle"
                value={formData.team_subtitle}
                onChange={handleChange}
                style={styles.input}
              />
            </div>
          </div>
          {renderTextareaWithPreview(
            'team_description',
            formData.team_description,
            '소개 내용',
            6
          )}

          <div style={localStyles.listHeader}>
            <h4 style={{ margin: 0 }}>팀원 목록</h4>
            <button
              type="button"
              onClick={() => setEditingMember({ id: 0, name: '', position: '', image_path: '', sort_order: 0 })}
              style={localStyles.addBtn}
            >
              + 추가
            </button>
          </div>
          <div style={localStyles.teamGrid}>
            {teamMembers.map((member) => (
              <div key={member.id} style={localStyles.teamCard}>
                {member.image_path ? (
                  <img src={member.image_path} alt={member.name} style={localStyles.teamImage} />
                ) : (
                  <div style={localStyles.teamImagePlaceholder}>이미지 없음</div>
                )}
                <div style={localStyles.teamInfo}>
                  <strong>{member.name}</strong>
                  <span>{member.position}</span>
                </div>
                <div style={localStyles.teamActions}>
                  <button onClick={() => setEditingMember(member)} style={localStyles.editBtn}>수정</button>
                  <button onClick={() => handleDeleteMember(member.id)} style={localStyles.deleteBtn}>삭제</button>
                </div>
              </div>
            ))}
          </div>

          {/* 팀원 편집 모달 */}
          {editingMember && (
            <div style={localStyles.modal}>
              <div style={localStyles.modalContent}>
                <h4>{editingMember.id ? '팀원 수정' : '팀원 추가'}</h4>
                <input
                  type="text"
                  placeholder="이름"
                  value={editingMember.name}
                  onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                  style={{ ...styles.input, marginBottom: '0.5rem' }}
                />
                <input
                  type="text"
                  placeholder="직책"
                  value={editingMember.position}
                  onChange={(e) => setEditingMember({ ...editingMember, position: e.target.value })}
                  style={{ ...styles.input, marginBottom: '0.5rem' }}
                />
                <div style={localStyles.imageUpload}>
                  {editingMember.image_path ? (
                    <img src={editingMember.image_path} alt="Preview" style={localStyles.imagePreviewSmall} />
                  ) : (
                    <div style={localStyles.imagePlaceholder}>이미지 없음</div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleMemberImageUpload(e.target.files[0])}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button onClick={() => setEditingMember(null)} style={localStyles.cancelBtn}>취소</button>
                  <button onClick={handleSaveMember} style={localStyles.saveModalBtn}>저장</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 저장 버튼 */}
      {activeTab !== 'history' && activeTab !== 'team' && (
        <div style={styles.formActions}>
          <button type="button" onClick={handleSave} disabled={saving} style={styles.submitButton}>
            {saving ? '저장 중...' : '저장하기'}
          </button>
        </div>
      )}

      {(activeTab === 'history' || activeTab === 'team') && (
        <div style={styles.formActions}>
          <button type="button" onClick={handleSave} disabled={saving} style={styles.submitButton}>
            {saving ? '저장 중...' : '표시 설정 저장'}
          </button>
        </div>
      )}
    </div>
  );
}

const localStyles: Record<string, React.CSSProperties> = {
  hint: {
    fontSize: '0.75rem',
    color: '#6b7280',
    marginTop: '0.25rem',
  },
  preview: {
    marginTop: '1rem',
    padding: '1rem',
    background: '#f9fafb',
    borderRadius: '0.5rem',
    border: '1px solid #e5e7eb',
  },
  previewLabel: {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '0.75rem',
  },
  previewContent: {
    fontSize: '1rem',
    lineHeight: 1.8,
    color: '#374151',
  },
  tabs: {
    display: 'flex',
    gap: '0.25rem',
    marginBottom: '1.5rem',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '0',
    flexWrap: 'wrap',
  },
  tab: {
    padding: '0.625rem 1rem',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#6b7280',
    cursor: 'pointer',
    marginBottom: '-1px',
  },
  tabActive: {
    color: '#000',
    borderBottomColor: '#000',
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem',
    background: '#f9fafb',
    borderRadius: '0.5rem',
    marginBottom: '1rem',
  },
  toggleLabel: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#374151',
  },
  toggle: {
    width: '44px',
    height: '24px',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    position: 'relative' as const,
    transition: 'background 0.2s',
  },
  toggleKnob: {
    position: 'absolute' as const,
    top: '2px',
    left: '2px',
    width: '20px',
    height: '20px',
    background: 'white',
    borderRadius: '50%',
    transition: 'transform 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  },
  toggleStatus: {
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  valuesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1rem',
  },
  valueItem: {
    padding: '1rem',
    background: '#f9fafb',
    borderRadius: '0.5rem',
  },
  valueItemTitle: {
    margin: '0 0 0.75rem 0',
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  listHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  addBtn: {
    padding: '0.5rem 1rem',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  listContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.75rem 1rem',
    background: '#f9fafb',
    borderRadius: '0.5rem',
  },
  listItemDate: {
    fontWeight: 600,
    minWidth: '70px',
    color: '#374151',
  },
  listItemText: {
    flex: 1,
    color: '#4b5563',
  },
  listItemActions: {
    display: 'flex',
    gap: '0.5rem',
  },
  editBtn: {
    padding: '0.25rem 0.75rem',
    background: '#e5e7eb',
    border: 'none',
    borderRadius: '0.25rem',
    cursor: 'pointer',
    fontSize: '0.75rem',
  },
  deleteBtn: {
    padding: '0.25rem 0.75rem',
    background: '#fee2e2',
    color: '#dc2626',
    border: 'none',
    borderRadius: '0.25rem',
    cursor: 'pointer',
    fontSize: '0.75rem',
  },
  modal: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    background: 'white',
    padding: '1.5rem',
    borderRadius: '0.75rem',
    width: '100%',
    maxWidth: '400px',
  },
  cancelBtn: {
    padding: '0.5rem 1rem',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
  },
  saveModalBtn: {
    padding: '0.5rem 1rem',
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
  },
  imageUpload: {
    padding: '1rem',
    background: '#f9fafb',
    borderRadius: '0.5rem',
    border: '1px dashed #d1d5db',
  },
  imagePreview: {
    width: '200px',
    height: '150px',
    objectFit: 'cover' as const,
    borderRadius: '0.5rem',
    marginBottom: '0.5rem',
  },
  imagePreviewSmall: {
    width: '100px',
    height: '100px',
    objectFit: 'cover' as const,
    borderRadius: '0.5rem',
    marginBottom: '0.5rem',
  },
  imagePlaceholder: {
    width: '100px',
    height: '100px',
    background: '#e5e7eb',
    borderRadius: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9ca3af',
    fontSize: '0.75rem',
    marginBottom: '0.5rem',
  },
  teamGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '1rem',
  },
  teamCard: {
    background: '#f9fafb',
    borderRadius: '0.5rem',
    overflow: 'hidden',
    border: '1px solid #e5e7eb',
  },
  teamImage: {
    width: '100%',
    height: '120px',
    objectFit: 'cover' as const,
  },
  teamImagePlaceholder: {
    width: '100%',
    height: '120px',
    background: '#e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9ca3af',
    fontSize: '0.75rem',
  },
  teamInfo: {
    padding: '0.75rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.25rem',
  },
  teamActions: {
    padding: '0 0.75rem 0.75rem',
    display: 'flex',
    gap: '0.5rem',
  },
};
