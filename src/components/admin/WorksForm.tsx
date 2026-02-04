import { useState, useRef, useEffect } from 'react';
import { Editor } from '@toast-ui/react-editor';
import '@toast-ui/editor/dist/toastui-editor.css';

interface WorksFormProps {
  mode: 'create' | 'edit';
  initialData?: {
    id: string;
    title: string;
    description: string;
    tag: string;
    content: string;
    image: string;
    is_published: boolean;
  };
}

export default function WorksForm({ mode, initialData }: WorksFormProps) {
  const editorRef = useRef<Editor>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    tag: initialData?.tag || '',
    image: initialData?.image || '',
    is_published: initialData?.is_published ?? true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const content = editorRef.current?.getInstance().getMarkdown() || '';
    
    const payload = {
      ...formData,
      content,
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
        <div style={styles.formGroup}>
          <label style={styles.label}>제목</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="용지 선택 가이드"
            required
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
            placeholder="인쇄 가이드"
            style={styles.input}
          />
          <span style={styles.hint}>카테고리 또는 분류 태그</span>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>설명</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="인쇄 용지 선택에 대한 가이드입니다."
            rows={3}
            style={styles.textarea}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>대표 이미지 URL</label>
          <input
            type="text"
            name="image"
            value={formData.image}
            onChange={handleChange}
            placeholder="https://images.unsplash.com/..."
            style={styles.input}
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
        <label style={styles.label}>내용</label>
        <div style={styles.editorWrapper}>
          <Editor
            ref={editorRef}
            initialValue={initialData?.content || '# 새 인쇄가이드\n\n내용을 입력하세요.'}
            previewStyle="vertical"
            height="500px"
            initialEditType="markdown"
            useCommandShortcut={true}
            toolbarItems={[
              ['heading', 'bold', 'italic', 'strike'],
              ['hr', 'quote'],
              ['ul', 'ol', 'task', 'indent', 'outdent'],
              ['table', 'image', 'link'],
              ['code', 'codeblock'],
            ]}
          />
        </div>
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
  hint: {
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  editorSection: {
    marginBottom: '2rem',
  },
  editorWrapper: {
    marginTop: '0.5rem',
    border: '1px solid #e5e7eb',
    borderRadius: '0.375rem',
    overflow: 'hidden',
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
