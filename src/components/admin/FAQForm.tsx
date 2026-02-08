import { useState } from "react";

import { adminFormStyles as styles } from "./adminFormStyles";

interface FAQFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    question: string;
    answer: string;
    sort_order: number;
    is_active: boolean;
  };
}

export default function FAQForm({ mode, initialData }: FAQFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    question: initialData?.question || "",
    answer: initialData?.answer || "",
    sort_order: initialData?.sort_order || 0,
    is_active: initialData?.is_active ?? true,
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseInt(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url =
        mode === "create" ? "/api/faq" : `/api/faq/${initialData?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        window.location.href = "/admin/faq";
      } else {
        const error = await res.json();
        alert(error.message || "저장에 실패했습니다.");
      }
    } catch {
      alert("저장에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.formGrid}>
        <div style={styles.formGroup}>
          <label style={styles.labelRequired}>
            질문 <span style={styles.requiredBadge}>필수</span>
          </label>
          <input
            type="text"
            name="question"
            value={formData.question}
            onChange={handleChange}
            placeholder="자주 묻는 질문을 입력하세요"
            required
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.labelRequired}>
            답변 <span style={styles.requiredBadge}>필수</span>
          </label>
          <textarea
            name="answer"
            value={formData.answer}
            onChange={handleChange}
            placeholder="질문에 대한 답변을 입력하세요"
            required
            rows={6}
            style={styles.textarea}
          />
          <p style={styles.hint}>줄바꿈은 그대로 유지됩니다.</p>
        </div>

        <div style={styles.formRow}>
          <div style={styles.formGroup}>
            <label style={styles.label}>정렬 순서</label>
            <input
              type="number"
              name="sort_order"
              value={formData.sort_order}
              onChange={handleChange}
              min={0}
              style={styles.input}
            />
            <p style={styles.hint}>숫자가 작을수록 위에 표시됩니다.</p>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>공개 여부</label>
            <select
              name="is_active"
              value={formData.is_active ? "true" : "false"}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  is_active: e.target.value === "true",
                }))
              }
              style={styles.select}
            >
              <option value="true">공개</option>
              <option value="false">비공개</option>
            </select>
          </div>
        </div>
      </div>

      <div style={styles.formActions}>
        <button
          type="button"
          onClick={() => (window.location.href = "/admin/faq")}
          style={styles.cancelButton}
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          style={styles.submitButton}
        >
          {isSubmitting
            ? "저장 중..."
            : mode === "create"
              ? "작성하기"
              : "수정하기"}
        </button>
      </div>
    </form>
  );
}
