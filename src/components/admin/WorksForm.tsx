import { useState, useRef, useEffect } from 'react';
import BlockNoteEditor from './BlockNoteEditor';
import ImageUploader from './ImageUploader';

interface WorksFormProps {
  mode: 'create' | 'edit';
  initialData?: {
    id: string;
    title: string;
    subtitle?: string;
    description?: string;
    client?: string;
    category_id?: string;
    year?: string;
    tag?: string;
    content: string;
    image: string;
    overview?: string;
    support?: string;
    achievements?: string;
    is_published: boolean;
  };
}

export default function WorksForm({ mode, initialData }: WorksFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    subtitle: initialData?.subtitle || '',
    description: initialData?.description || '',
    client: initialData?.client || '',
    category_id: initialData?.category_id || '',
    year: initialData?.year || new Date().getFullYear().toString(),
    tag: initialData?.tag || '',
    image: initialData?.image || '',
    overview: initialData?.overview || '',
    support: initialData?.support || '',
    achievements: initialData?.achievements || '',
    content: initialData?.content || '',
    is_published: initialData?.is_published ?? true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleImageUpload = (url: string) => {
    setFormData(prev => ({ ...prev, image: url }));
  };

  const handleContentChange = (content: string) => {
    setFormData(prev => ({ ...prev, content }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      ...formData,
    };

    try {
      const url = mode === 'create' ? '/api/works' : `/api/works/${initialData?.id}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        window.location.href = '/admin/works';
      } else {
        const error = await res.json();
        alert(error.message || '저장에 실패했습니다.');
      }
    } catch (error) {
      alert('저장에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.formGrid}>
        <div style={styles.formRow}>
          <div style={styles.formGroup}>
            <label style={styles.label}>제목 *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="프로젝트 제목"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>부제목</label>
            <input
              type="text"
              name="subtitle"
              value={formData.subtitle}
              onChange={handleChange}
              placeholder="프로젝트 부제목"
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.formRow}>
          <div style={styles.formGroup}>
            <label style={styles.label}>클라이언트</label>
            <input
              type="text"
              name="client"
              value={formData.client}
              onChange={handleChange}
              placeholder="클라이언트명"
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>연도</label>
            <input
              type="text"
              name="year"
              value={formData.year}
              onChange={handleChange}
              placeholder="2024"
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>태그</label>
            <input
              type="text"
              name="tag"
              value={formData.tag}
              onChange={handleChange}
              placeholder="웹 개발"
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>설명</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="프로젝트에 대한 간단한 설명"
            rows={2}
            style={styles.textarea}
          />
        </div>

        {/* 이미지 업로더 */}
        <ImageUploader
          currentImage={formData.image}
          folder="works"
          onUpload={handleImageUpload}
          label="대표 이미지"
        />

        <div style={styles.formRow}>
          <div style={styles.formGroup}>
            <label style={styles.label}>개요 (Overview)</label>
            <textarea
              name="overview"
              value={formData.overview}
              onChange={handleChange}
              placeholder="프로젝트 개요"
              rows={3}
              style={styles.textarea}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>지원 내용 (Support)</label>
            <textarea
              name="support"
              value={formData.support}
              onChange={handleChange}
              placeholder="제공한 서비스/지원 내용"
              rows={3}
              style={styles.textarea}
            />
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>성과 (Achievements)</label>
          <textarea
            name="achievements"
            value={formData.achievements}
            onChange={handleChange}
            placeholder="프로젝트 성과"
            rows={3}
            style={styles.textarea}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>공개 여부</label>
          <select
            name="is_published"
            value={formData.is_published ? 'true' : 'false'}
            onChange={(e) => setFormData(prev => ({ ...prev, is_published: e.target.value === 'true' }))}
            style={styles.select}
          >
            <option value="true">공개</option>
            <option value="false">비공개</option>
          </select>
        </div>
      </div>

      <div style={styles.editorSection}>
        <label style={styles.label}>상세 내용</label>
        <p style={styles.hint}>슬래시(/)를 입력하면 다양한 블록을 추가할 수 있습니다.</p>
        <BlockNoteEditor
          initialContent={formData.content}
          onChange={handleContentChange}
          height="400px"
          placeholder="상세 내용을 입력하세요..."
        />
      </div>

      <div style={styles.formActions}>
        <button
          type="button"
          onClick={() => window.location.href = '/admin/works'}
          style={styles.cancelButton}
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          style={styles.submitButton}
        >
          {isSubmitting ? '저장 중...' : (mode === 'create' ? '작성하기' : '수정하기')}
        </button>
      </div>
    </form>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  form: {
    background: 'white',
    borderRadius: '0.5rem',
    padding: '2rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  formGrid: {
    display: 'grid',
    gap: '1.5rem',
    marginBottom: '2rem',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontWeight: 600,
    fontSize: '0.875rem',
    color: '#374151',
  },
  hint: {
    fontSize: '0.75rem',
    color: '#6b7280',
    marginBottom: '0.5rem',
  },
  input: {
    padding: '0.75rem 1rem',
    border: '1px solid #e5e7eb',
    borderRadius: '0.375rem',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  textarea: {
    padding: '0.75rem 1rem',
    border: '1px solid #e5e7eb',
    borderRadius: '0.375rem',
    fontSize: '1rem',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  select: {
    padding: '0.75rem 1rem',
    border: '1px solid #e5e7eb',
    borderRadius: '0.375rem',
    fontSize: '1rem',
    outline: 'none',
    background: 'white',
  },
  editorSection: {
    marginBottom: '2rem',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid #e5e7eb',
  },
  cancelButton: {
    padding: '0.75rem 1.5rem',
    background: '#e5e7eb',
    color: '#374151',
    border: 'none',
    borderRadius: '0.375rem',
    fontSize: '1rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  submitButton: {
    padding: '0.75rem 1.5rem',
    background: '#000',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    fontSize: '1rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
};
