import { useState } from 'react';

import { adminFormStyles as styles } from './adminFormStyles';
import BlockNoteEditor from './BlockNoteEditor';

interface NewsData {
  id?: string;
  title: string;
  category: string;
  pub_date: string;
  content: string;
}

interface NewsFormProps {
  initialData?: NewsData;
  mode: 'create' | 'edit';
}

const categories = [
  { id: 'information', name: '정보' },
  { id: 'event', name: '이벤트' },
  { id: 'notice', name: '공지' },
];

export default function NewsForm({ initialData, mode }: NewsFormProps) {
  const [formData, setFormData] = useState<NewsData>({
    title: initialData?.title || '',
    category: initialData?.category || 'information',
    pub_date: initialData?.pub_date || new Date().toISOString().split('T')[0],
    content: initialData?.content || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleContentChange = (content: string) => {
    setFormData((prev) => ({ ...prev, content }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setMessage({ type: 'error', text: '제목을 입력해주세요.' });
      return;
    }

    if (!formData.content.trim() || formData.content === '[]') {
      setMessage({ type: 'error', text: '내용을 입력해주세요.' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const url = mode === 'create' ? '/api/news' : `/api/news/${initialData?.id}`;

      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setMessage({
          type: 'success',
          text: mode === 'create' ? '공지사항이 등록되었습니다.' : '공지사항이 수정되었습니다.',
        });

        // 성공 시 목록 페이지로 이동
        setTimeout(() => {
          window.location.href = '/admin/news';
        }, 1000);
      } else {
        const error = await response.json();
        throw new Error(error.message || '저장에 실패했습니다.');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      {message && (
        <div style={message.type === 'success' ? styles.messageSuccess : styles.messageError}>{message.text}</div>
      )}

      <div style={styles.formGrid}>
        <div style={styles.formGroup}>
          <label style={styles.labelRequired}>
            제목 <span style={styles.requiredBadge}>필수</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="공지사항 제목을 입력하세요"
            style={styles.input}
          />
        </div>

        <div style={styles.formRow}>
          <div style={styles.formGroup}>
            <label style={styles.labelRequired}>
              카테고리 <span style={styles.requiredBadge}>필수</span>
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
              style={styles.select}
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.labelRequired}>
              발행일 <span style={styles.requiredBadge}>필수</span>
            </label>
            <input
              type="date"
              name="pub_date"
              value={formData.pub_date}
              onChange={(e) => setFormData((prev) => ({ ...prev, pub_date: e.target.value }))}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.labelRequired}>
            내용 <span style={styles.requiredBadge}>필수</span>
          </label>
          <p style={styles.hint}>슬래시(/)를 입력하면 다양한 블록을 추가할 수 있습니다.</p>
          <BlockNoteEditor
            initialContent={formData.content}
            onChange={handleContentChange}
            height="400px"
            placeholder="내용을 입력하세요..."
          />
        </div>
      </div>

      <div style={styles.formActions}>
        <a href="/admin/news" style={styles.cancelButton}>
          취소
        </a>
        <button type="submit" disabled={isSubmitting} style={styles.submitButton}>
          {isSubmitting ? '저장 중...' : mode === 'create' ? '등록하기' : '수정하기'}
        </button>
      </div>
    </form>
  );
}
