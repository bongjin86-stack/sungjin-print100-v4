import { useState } from 'react';

interface ServicesFormProps {
  mode: 'create' | 'edit';
  initialData?: {
    id: string;
    slug: string;
    title: string;
    title_en: string;
    description: string;
    detail_description: string;
    image: string;
    tasks: string[];
    sort_order: number;
    is_active: boolean;
  };
}

export default function ServicesForm({ mode, initialData }: ServicesFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    slug: initialData?.slug || '',
    title: initialData?.title || '',
    title_en: initialData?.title_en || '',
    description: initialData?.description || '',
    detail_description: initialData?.detail_description || '',
    image: initialData?.image || '',
    sort_order: initialData?.sort_order || 1,
    is_active: initialData?.is_active ?? true,
  });
  const [tasks, setTasks] = useState<string[]>(initialData?.tasks || []);
  const [newTask, setNewTask] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }));
  };

  const addTask = () => {
    if (newTask.trim()) {
      setTasks([...tasks, newTask.trim()]);
      setNewTask('');
    }
  };

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      ...formData,
      tasks: JSON.stringify(tasks),
    };

    try {
      const url = mode === 'create' ? '/api/services' : `/api/services/${initialData?.id}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        window.location.href = '/admin/services';
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
            <label style={styles.label}>슬러그 (URL)</label>
            <input
              type="text"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              placeholder="wireless-binding"
              required
              style={styles.input}
            />
            <span style={styles.hint}>URL에 사용될 고유 식별자</span>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>정렬 순서</label>
            <input
              type="number"
              name="sort_order"
              value={formData.sort_order}
              onChange={handleChange}
              min={1}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.formRow}>
          <div style={styles.formGroup}>
            <label style={styles.label}>제목 (한글)</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="무선제본"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>제목 (영문)</label>
            <input
              type="text"
              name="title_en"
              value={formData.title_en}
              onChange={handleChange}
              placeholder="Wireless Binding"
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>짧은 설명</label>
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="책등에 접착제를 사용하여 내지를 표지에 붙이는 방식입니다."
            style={styles.input}
          />
          <span style={styles.hint}>목록에서 보여지는 짧은 설명</span>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>상세 설명</label>
          <textarea
            name="detail_description"
            value={formData.detail_description}
            onChange={handleChange}
            placeholder="무선제본은 책등에 접착제를 사용하여 내지를 표지에 붙이는 방식입니다. 깔끔하고 전문적인 마감으로 책자, 카탈로그, 보고서, 논문집 등에 널리 사용됩니다."
            rows={4}
            style={styles.textarea}
          />
          <span style={styles.hint}>상세 페이지에서 보여지는 긴 설명</span>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>이미지 URL</label>
          <input
            type="text"
            name="image"
            value={formData.image}
            onChange={handleChange}
            placeholder="/images/services/wireless-binding.jpg"
            style={styles.input}
          />
          {formData.image && (
            <div style={styles.imagePreview}>
              <img src={formData.image} alt="미리보기" style={styles.previewImg} />
            </div>
          )}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>제공 서비스 목록</label>
          <div style={styles.tasksContainer}>
            <div style={styles.tasksList}>
              {tasks.map((task, index) => (
                <div key={index} style={styles.taskItem}>
                  <span>{task}</span>
                  <button
                    type="button"
                    onClick={() => removeTask(index)}
                    style={styles.removeTaskBtn}
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
            <div style={styles.addTaskRow}>
              <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="새 서비스 항목 추가"
                style={styles.input}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTask())}
              />
              <button
                type="button"
                onClick={addTask}
                style={styles.addTaskBtn}
              >
                추가
              </button>
            </div>
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>공개 여부</label>
          <select
            name="is_active"
            value={formData.is_active ? 'true' : 'false'}
            onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.value === 'true' }))}
            style={styles.select}
          >
            <option value="true">공개</option>
            <option value="false">비공개</option>
          </select>
        </div>
      </div>

      <div style={styles.formActions}>
        <button
          type="button"
          onClick={() => window.location.href = '/admin/services'}
          style={styles.cancelButton}
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          style={styles.submitButton}
        >
          {isSubmitting ? '저장 중...' : (mode === 'create' ? '추가하기' : '수정하기')}
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
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.5rem',
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
    lineHeight: 1.6,
  },
  select: {
    padding: '0.75rem 1rem',
    border: '1px solid #e5e7eb',
    borderRadius: '0.375rem',
    fontSize: '1rem',
    outline: 'none',
    background: 'white',
    maxWidth: '200px',
  },
  hint: {
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  imagePreview: {
    marginTop: '0.5rem',
    width: '200px',
    height: '150px',
    borderRadius: '0.375rem',
    overflow: 'hidden',
    background: '#f3f4f6',
  },
  previewImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  tasksContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  tasksList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  taskItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: '#f3f4f6',
    padding: '0.5rem 0.75rem',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
  },
  removeTaskBtn: {
    background: 'none',
    border: 'none',
    color: '#991b1b',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 'bold',
  },
  addTaskRow: {
    display: 'flex',
    gap: '0.5rem',
  },
  addTaskBtn: {
    padding: '0.75rem 1.5rem',
    background: '#e5e7eb',
    color: '#374151',
    border: 'none',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
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
