import { useState } from "react";

import { adminFormStyles as baseStyles } from "./adminFormStyles";
import BlockNoteEditor from "./BlockNoteEditor";
import ImageUploader from "./ImageUploader";

interface WorksFormProps {
  mode: "create" | "edit";
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
    support?: string | string[];
    achievements?: string | { title: string; description: string }[];
    is_published: boolean;
  };
}

// JSON 배열을 안전하게 파싱
function parseStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

// achievements 배열을 안전하게 파싱
function parseAchievements(
  value: unknown
): { title: string; description: string }[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export default function WorksForm({ mode, initialData }: WorksFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    subtitle: initialData?.subtitle || "",
    description: initialData?.description || "",
    client: initialData?.client || "",
    category_id: initialData?.category_id || "",
    year: initialData?.year || new Date().getFullYear().toString(),
    tag: initialData?.tag || "",
    image: initialData?.image || "",
    overview: initialData?.overview || "",
    content: initialData?.content || "",
    is_published: initialData?.is_published ?? true,
  });

  // 리스트 형태로 관리
  const [supportList, setSupportList] = useState<string[]>(
    parseStringArray(initialData?.support)
  );
  const [achievementsList, setAchievementsList] = useState<
    { title: string; description: string }[]
  >(parseAchievements(initialData?.achievements));

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleImageUpload = (url: string) => {
    setFormData((prev) => ({ ...prev, image: url }));
  };

  const handleContentChange = (content: string) => {
    setFormData((prev) => ({ ...prev, content }));
  };

  // Support 리스트 관리
  const addSupportItem = () => {
    setSupportList((prev) => [...prev, ""]);
  };

  const updateSupportItem = (index: number, value: string) => {
    setSupportList((prev) =>
      prev.map((item, i) => (i === index ? value : item))
    );
  };

  const removeSupportItem = (index: number) => {
    setSupportList((prev) => prev.filter((_, i) => i !== index));
  };

  // Achievements 리스트 관리
  const addAchievementItem = () => {
    setAchievementsList((prev) => [...prev, { title: "", description: "" }]);
  };

  const updateAchievementItem = (
    index: number,
    field: "title" | "description",
    value: string
  ) => {
    setAchievementsList((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const removeAchievementItem = (index: number) => {
    setAchievementsList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // 빈 항목 필터링
    const filteredSupport = supportList.filter((item) => item.trim() !== "");
    const filteredAchievements = achievementsList.filter(
      (item) => item.title.trim() !== "" || item.description.trim() !== ""
    );

    const payload = {
      ...formData,
      support: filteredSupport,
      achievements: filteredAchievements,
    };

    try {
      const url =
        mode === "create" ? "/api/works" : `/api/works/${initialData?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        window.location.href = "/admin/works";
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

        <div style={styles.formGroup}>
          <label style={styles.label}>개요 (Overview)</label>
          <textarea
            name="overview"
            value={formData.overview}
            onChange={handleChange}
            placeholder="프로젝트 개요를 입력하세요"
            rows={3}
            style={styles.textarea}
          />
        </div>

        {/* Support 리스트 에디터 */}
        <div style={styles.formGroup}>
          <label style={styles.label}>주요 내용 (Support)</label>
          <p style={styles.hint}>
            프로젝트에서 제공한 서비스나 지원 내용을 항목별로 입력하세요.
          </p>
          <div style={styles.listEditor}>
            {supportList.map((item, index) => (
              <div key={index} style={styles.listItem}>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => updateSupportItem(index, e.target.value)}
                  placeholder={`항목 ${index + 1}`}
                  style={styles.listInput}
                />
                <button
                  type="button"
                  onClick={() => removeSupportItem(index)}
                  style={styles.removeButton}
                >
                  삭제
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addSupportItem}
              style={styles.addButton}
            >
              + 항목 추가
            </button>
          </div>
        </div>

        {/* Achievements 리스트 에디터 */}
        <div style={styles.formGroup}>
          <label style={styles.label}>상세 정보 (Achievements)</label>
          <p style={styles.hint}>
            프로젝트 성과나 특징을 제목/설명 형태로 입력하세요.
          </p>
          <div style={styles.listEditor}>
            {achievementsList.map((item, index) => (
              <div key={index} style={styles.achievementItem}>
                <div style={styles.achievementFields}>
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) =>
                      updateAchievementItem(index, "title", e.target.value)
                    }
                    placeholder="제목"
                    style={styles.achievementTitle}
                  />
                  <textarea
                    value={item.description}
                    onChange={(e) =>
                      updateAchievementItem(
                        index,
                        "description",
                        e.target.value
                      )
                    }
                    placeholder="설명"
                    rows={2}
                    style={styles.achievementDesc}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeAchievementItem(index)}
                  style={styles.removeButton}
                >
                  삭제
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addAchievementItem}
              style={styles.addButton}
            >
              + 항목 추가
            </button>
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>공개 여부</label>
          <select
            name="is_published"
            value={formData.is_published ? "true" : "false"}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                is_published: e.target.value === "true",
              }))
            }
            style={styles.select}
          >
            <option value="true">공개</option>
            <option value="false">비공개</option>
          </select>
        </div>
      </div>

      <div style={styles.editorSection}>
        <label style={styles.label}>상세 내용</label>
        <p style={styles.hint}>
          슬래시(/)를 입력하면 다양한 블록을 추가할 수 있습니다.
        </p>
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
          onClick={() => (window.location.href = "/admin/works")}
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

// 공통 스타일 + WorksForm 전용 스타일
const styles: Record<string, React.CSSProperties> = {
  ...baseStyles,
  // WorksForm 전용 스타일
  achievementItem: {
    display: "flex",
    gap: "0.5rem",
    alignItems: "flex-start",
    padding: "0.75rem",
    background: "white",
    borderRadius: "0.375rem",
    border: "1px solid #e5e7eb",
  },
  achievementFields: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  achievementTitle: {
    padding: "0.5rem 0.75rem",
    border: "1px solid #e5e7eb",
    borderRadius: "0.375rem",
    fontSize: "0.875rem",
    fontWeight: 500,
    outline: "none",
  },
  achievementDesc: {
    padding: "0.5rem 0.75rem",
    border: "1px solid #e5e7eb",
    borderRadius: "0.375rem",
    fontSize: "0.875rem",
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
  },
};
