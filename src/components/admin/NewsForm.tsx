import { useState, useEffect, useRef } from 'react';
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
    setFormData(prev => ({ ...prev, content }));
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
      const url = mode === 'create' 
        ? '/api/news' 
        : `/api/news/${initialData?.id}`;
      
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
          text: mode === 'create' ? '공지사항이 등록되었습니다.' : '공지사항이 수정되었습니다.' 
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
        text: error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="news-form">
      {message && (
        <div className={`form-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="title" className="form-label">
          제목 <span className="required">필수</span>
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          className="form-input"
          placeholder="공지사항 제목을 입력하세요"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="category" className="form-label">
            카테고리 <span className="required">필수</span>
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            className="form-select"
          >
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="pub_date" className="form-label">
            발행일 <span className="required">필수</span>
          </label>
          <input
            type="date"
            id="pub_date"
            name="pub_date"
            value={formData.pub_date}
            onChange={(e) => setFormData(prev => ({ ...prev, pub_date: e.target.value }))}
            className="form-input"
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">
          내용 <span className="required">필수</span>
        </label>
        <p className="form-hint">슬래시(/)를 입력하면 다양한 블록을 추가할 수 있습니다.</p>
        <BlockNoteEditor
          initialContent={formData.content}
          onChange={handleContentChange}
          height="400px"
          placeholder="내용을 입력하세요..."
        />
      </div>

      <div className="form-actions">
        <a href="/admin/news" className="btn-cancel">
          취소
        </a>
        <button 
          type="submit" 
          className="btn-submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? '저장 중...' : (mode === 'create' ? '등록하기' : '수정하기')}
        </button>
      </div>

      <style>{`
        .news-form {
          max-width: 900px;
        }

        .form-message {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          font-size: 14px;
        }

        .form-message.success {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .form-message.error {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .form-group {
          margin-bottom: 24px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        @media (max-width: 600px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }

        .form-label {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 500;
          color: var(--c-text, #222828);
        }

        .form-hint {
          font-size: 12px;
          color: var(--c-text-light, #8a9292);
          margin-bottom: 8px;
        }

        .required {
          background: var(--c-primary, #222828);
          color: #fff;
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .form-input,
        .form-select {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid var(--c-border, #d9d9d9);
          border-radius: 8px;
          font-size: 15px;
          color: var(--c-text, #222828);
          background: var(--c-bg, #fff);
          transition: border-color 0.2s;
        }

        .form-input:focus,
        .form-select:focus {
          outline: none;
          border-color: var(--c-primary, #222828);
        }

        .form-input::placeholder {
          color: var(--c-text-light, #8a9292);
        }

        .form-select {
          cursor: pointer;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid var(--c-border-light, #f0f2f2);
        }

        .btn-cancel {
          padding: 12px 24px;
          background: var(--c-bg-secondary, #f5f7f7);
          color: var(--c-text, #222828);
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-cancel:hover {
          background: #e8eaea;
        }

        .btn-submit {
          padding: 12px 32px;
          background: var(--c-primary, #222828);
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-submit:hover:not(:disabled) {
          background: var(--c-primary-light, #4a5050);
        }

        .btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </form>
  );
}
