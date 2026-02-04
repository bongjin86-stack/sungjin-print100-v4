import { useState } from 'react';
import ToastEditor from './ToastEditor';

interface TeamSectionData {
  title: string;
  subtitle: string;
  description: string;
}

interface TeamSectionFormProps {
  initialData: TeamSectionData;
}

export default function TeamSectionForm({ initialData }: TeamSectionFormProps) {
  const [formData, setFormData] = useState<TeamSectionData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleContentChange = (content: string) => {
    setFormData(prev => ({ ...prev, description: content }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const settings = [
        { key: 'team_title', value: formData.title },
        { key: 'team_subtitle', value: formData.subtitle },
        { key: 'team_description', value: formData.description },
      ];

      for (const setting of settings) {
        const response = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(setting),
        });
        if (!response.ok) throw new Error('저장 실패');
      }

      setMessage({ type: 'success', text: '저장되었습니다.' });
    } catch (error) {
      setMessage({ type: 'error', text: '저장 중 오류가 발생했습니다.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="team-section-form">
      {message && (
        <div className={`form-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="title" className="form-label">섹션 제목</label>
        <input
          type="text"
          id="title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          className="form-input"
          placeholder="Meet Our Team"
        />
        <span className="hint">섹션의 대제목 (영문)</span>
      </div>

      <div className="form-group">
        <label htmlFor="subtitle" className="form-label">섹션 부제목</label>
        <input
          type="text"
          id="subtitle"
          value={formData.subtitle}
          onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
          className="form-input"
          placeholder="팀 소개"
        />
        <span className="hint">대제목 아래에 표시되는 텍스트</span>
      </div>

      <div className="form-group">
        <label className="form-label">소개 내용</label>
        <ToastEditor
          initialValue={formData.description}
          onChange={handleContentChange}
          height="300px"
        />
        <span className="hint">마크다운 형식으로 작성하세요. 엔터로 줄바꿈, **굵게**, *기울임* 등 사용 가능</span>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? '저장 중...' : '저장'}
        </button>
      </div>

      <style>{`
        .team-section-form { }
        .form-message { padding: 12px 16px; border-radius: 8px; margin-bottom: 24px; }
        .form-message.success { background: #d4edda; color: #155724; }
        .form-message.error { background: #f8d7da; color: #721c24; }
        
        .form-group { margin-bottom: 24px; }
        .form-label { display: block; margin-bottom: 8px; font-weight: 500; color: #374151; }
        .form-input {
          width: 100%;
          padding: 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 1rem;
          box-sizing: border-box;
        }
        .hint { font-size: 0.75rem; color: #6b7280; margin-top: 4px; display: block; }
        
        .btn { padding: 8px 16px; border: 1px solid #ddd; border-radius: 6px; background: white; cursor: pointer; }
        .btn-primary { background: #333; color: white; border-color: #333; padding: 12px 32px; }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        
        .form-actions { display: flex; justify-content: flex-end; padding-top: 16px; border-top: 1px solid #e5e7eb; }
      `}</style>
    </form>
  );
}
