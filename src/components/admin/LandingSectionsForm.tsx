import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

import { adminFormStyles as styles } from './adminFormStyles';
import HeroForm from './HeroForm';

type TabType = 'hero' | 'about' | 'cta';

interface FormData {
  // About 섹션
  landing_about_text: string;
  // CTA 섹션
  landing_cta_title: string;
  landing_cta_subtitle: string;
  landing_cta_text: string;
  landing_cta_list: string;
  landing_cta_button_text: string;
  landing_cta_button_link: string;
}

const defaultValues: FormData = {
  landing_about_text:
    '20년 경력의 인쇄 전문가가 운영하는\nSungjinprint입니다.\n\n무선제본, 중철제본, 스프링제본 등\n다양한 제본 서비스와 빠른 납기를 제공합니다.\n\n50부 이상 대량 주문 시 단가가 낮아지며,\n최신 장비로 깔끔한 인쇄 품질을 보장합니다.\n언제든 편하게 문의해 주세요.',
  landing_cta_title: 'Contact',
  landing_cta_subtitle: '문의하기',
  landing_cta_text: '견적 문의, 상담, 샘플 요청 등 무엇이든 편하게 문의해 주세요.',
  landing_cta_list:
    '책자, 카탈로그, 브로슈어 인쇄를 의뢰하고 싶다\n대량 인쇄 견적을 받고 싶다\n용지 선택이나 후가공에 대해 상담하고 싶다\n납기 일정을 확인하고 싶다\n용지 샘플을 받아보고 싶다 등',
  landing_cta_button_text: '문의하기',
  landing_cta_button_link: '/contact',
};

export default function LandingSectionsForm() {
  const [activeTab, setActiveTab] = useState<TabType>('hero');
  const [formData, setFormData] = useState<FormData>(defaultValues);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase.from('site_config').select('key, value');

      if (error) throw error;

      if (data) {
        const configMap: Record<string, string> = {};
        data.forEach((item: { key: string; value: string }) => {
          configMap[item.key] = item.value;
        });

        setFormData({
          landing_about_text: configMap.landing_about_text || defaultValues.landing_about_text,
          landing_cta_title: configMap.landing_cta_title || defaultValues.landing_cta_title,
          landing_cta_subtitle: configMap.landing_cta_subtitle || defaultValues.landing_cta_subtitle,
          landing_cta_text: configMap.landing_cta_text || defaultValues.landing_cta_text,
          landing_cta_list: configMap.landing_cta_list || defaultValues.landing_cta_list,
          landing_cta_button_text: configMap.landing_cta_button_text || defaultValues.landing_cta_button_text,
          landing_cta_button_link: configMap.landing_cta_button_link || defaultValues.landing_cta_button_link,
        });
      }
    } catch (error) {
      console.error('설정 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      // 현재 탭의 필드만 저장
      const fieldsToSave =
        activeTab === 'about'
          ? ['landing_about_text']
          : [
              'landing_cta_title',
              'landing_cta_subtitle',
              'landing_cta_text',
              'landing_cta_list',
              'landing_cta_button_text',
              'landing_cta_button_link',
            ];

      const updates = fieldsToSave.map((key) => ({
        key,
        value: formData[key as keyof FormData],
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from('site_config').upsert(updates, { onConflict: 'key' });

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

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>로딩 중...</div>;
  }

  return (
    <div style={styles.form}>
      {/* 탭 네비게이션 */}
      <div style={localStyles.tabs}>
        <button
          type="button"
          onClick={() => setActiveTab('hero')}
          style={{
            ...localStyles.tab,
            ...(activeTab === 'hero' ? localStyles.tabActive : {}),
          }}
        >
          Hero 섹션
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('about')}
          style={{
            ...localStyles.tab,
            ...(activeTab === 'about' ? localStyles.tabActive : {}),
          }}
        >
          About 섹션
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('cta')}
          style={{
            ...localStyles.tab,
            ...(activeTab === 'cta' ? localStyles.tabActive : {}),
          }}
        >
          CTA 섹션
        </button>
      </div>

      {/* Hero 섹션 */}
      {activeTab === 'hero' && (
        <div style={{ margin: '-1rem' }}>
          <HeroForm />
        </div>
      )}

      {message && activeTab !== 'hero' && (
        <div style={message.type === 'success' ? styles.messageSuccess : styles.messageError}>{message.text}</div>
      )}

      {/* About 섹션 */}
      {activeTab === 'about' && (
        <div style={styles.formGrid}>
          <div style={localStyles.sectionHeader}>
            <h3 style={localStyles.sectionTitle}>About 섹션</h3>
            <p style={localStyles.sectionDesc}>랜딩 페이지의 회사 소개 섹션 텍스트를 편집합니다.</p>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>소개 텍스트</label>
            <textarea
              name="landing_about_text"
              value={formData.landing_about_text}
              onChange={handleChange}
              rows={10}
              style={styles.textarea}
              placeholder="회사 소개 텍스트를 입력하세요"
            />
            <p style={styles.hint}>줄바꿈은 그대로 유지됩니다. 빈 줄을 넣으면 문단이 구분됩니다.</p>
          </div>

          <div style={localStyles.preview}>
            <h4 style={localStyles.previewTitle}>미리보기</h4>
            <div style={localStyles.previewContent}>
              {formData.landing_about_text.split('\n').map((line, i) =>
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
        </div>
      )}

      {/* CTA 섹션 */}
      {activeTab === 'cta' && (
        <div style={styles.formGrid}>
          <div style={localStyles.sectionHeader}>
            <h3 style={localStyles.sectionTitle}>CTA 섹션</h3>
            <p style={localStyles.sectionDesc}>랜딩 페이지 하단의 문의하기 섹션을 편집합니다.</p>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>제목</label>
              <input
                type="text"
                name="landing_cta_title"
                value={formData.landing_cta_title}
                onChange={handleChange}
                style={styles.input}
                placeholder="Contact"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>부제목</label>
              <input
                type="text"
                name="landing_cta_subtitle"
                value={formData.landing_cta_subtitle}
                onChange={handleChange}
                style={styles.input}
                placeholder="문의하기"
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>설명 텍스트</label>
            <input
              type="text"
              name="landing_cta_text"
              value={formData.landing_cta_text}
              onChange={handleChange}
              style={styles.input}
              placeholder="견적 문의, 상담, 샘플 요청 등..."
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>목록 항목</label>
            <textarea
              name="landing_cta_list"
              value={formData.landing_cta_list}
              onChange={handleChange}
              rows={6}
              style={styles.textarea}
              placeholder="한 줄에 하나씩 입력하세요"
            />
            <p style={styles.hint}>한 줄에 하나의 항목을 입력하세요. 각 항목 앞에 불릿(・)이 자동으로 붙습니다.</p>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>버튼 텍스트</label>
              <input
                type="text"
                name="landing_cta_button_text"
                value={formData.landing_cta_button_text}
                onChange={handleChange}
                style={styles.input}
                placeholder="문의하기"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>버튼 링크</label>
              <input
                type="text"
                name="landing_cta_button_link"
                value={formData.landing_cta_button_link}
                onChange={handleChange}
                style={styles.input}
                placeholder="/contact"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab !== 'hero' && (
        <div style={styles.formActions}>
          <button type="button" onClick={handleSave} disabled={saving} style={styles.submitButton}>
            {saving ? '저장 중...' : '저장하기'}
          </button>
        </div>
      )}
    </div>
  );
}

const localStyles: Record<string, React.CSSProperties> = {
  tabs: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1.5rem',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '0',
  },
  tab: {
    padding: '0.75rem 1.5rem',
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
  sectionHeader: {
    marginBottom: '0.5rem',
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  },
  sectionDesc: {
    fontSize: '0.875rem',
    color: '#6b7280',
    marginTop: '0.25rem',
  },
  preview: {
    padding: '1rem',
    background: '#f9fafb',
    borderRadius: '0.5rem',
    border: '1px solid #e5e7eb',
  },
  previewTitle: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.75rem',
  },
  previewContent: {
    fontSize: '1.25rem',
    lineHeight: 1.8,
    color: '#374151',
  },
};
