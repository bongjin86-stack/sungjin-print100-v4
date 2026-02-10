import { useEffect, useState } from "react";

import { adminFormStyles as baseStyles } from "./adminFormStyles";
import BlockNoteEditor from "./BlockNoteEditor";
import ImageUploader from "./ImageUploader";

interface PrintsFormProps {
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
    linked_product_id?: string;
    order_button_text?: string;
    field_labels?: string | Record<string, string>;
  };
}

interface Product {
  id: string;
  name: string;
  is_published: boolean;
}

const DEFAULT_LABELS = {
  meta1_label: "분류",
  meta2_label: "카테고리",
  meta3_label: "연도",
  overview_label: "개요",
  support_label: "주요 내용",
  achievements_label: "상세 정보",
};

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

// field_labels 파싱
function parseFieldLabels(
  value: unknown
): Record<string, string> {
  if (!value) return { ...DEFAULT_LABELS };
  if (typeof value === "object" && !Array.isArray(value))
    return { ...DEFAULT_LABELS, ...(value as Record<string, string>) };
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return { ...DEFAULT_LABELS, ...parsed };
    } catch {
      return { ...DEFAULT_LABELS };
    }
  }
  return { ...DEFAULT_LABELS };
}

export default function PrintsForm({ mode, initialData }: PrintsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [existingTags, setExistingTags] = useState<string[]>([]);
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
    linked_product_id: initialData?.linked_product_id || "",
    order_button_text: initialData?.order_button_text || "주문하기",
  });

  const [fieldLabels, setFieldLabels] = useState<Record<string, string>>(
    parseFieldLabels(initialData?.field_labels)
  );

  // 리스트 형태로 관리
  const [supportList, setSupportList] = useState<string[]>(
    parseStringArray(initialData?.support)
  );
  const [achievementsList, setAchievementsList] = useState<
    { title: string; description: string }[]
  >(parseAchievements(initialData?.achievements));

  // 상품 목록 + 기존 태그 가져오기
  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setProducts(data);
        }
      })
      .catch(() => {});

    fetch("/api/prints")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const tags = [...new Set(
            data.map((p: { tag?: string }) => p.tag).filter(Boolean)
          )].sort() as string[];
          setExistingTags(tags);
        }
      })
      .catch(() => {});
  }, []);

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

  const handleLabelChange = (key: string, value: string) => {
    setFieldLabels((prev) => ({ ...prev, [key]: value }));
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
      linked_product_id: formData.linked_product_id || null,
      field_labels: fieldLabels,
    };

    try {
      const url =
        mode === "create"
          ? "/api/prints"
          : `/api/prints/${initialData?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        window.location.href = "/admin/prints";
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
              placeholder="제목"
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
              placeholder="부제목"
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
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <select
                value={existingTags.includes(formData.tag) ? formData.tag : ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, tag: e.target.value }))}
                style={{ ...(styles.select || styles.input), flex: 1 }}
              >
                <option value="">태그 선택</option>
                {existingTags.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <span style={{ color: "#999", fontSize: "0.75rem" }}>또는</span>
            </div>
            <input
              type="text"
              value={formData.tag}
              onChange={(e) => setFormData((prev) => ({ ...prev, tag: e.target.value }))}
              placeholder="직접 입력 (새 태그 가능)"
              style={{ ...styles.input, marginTop: "0.5rem" }}
            />
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>설명</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="간단한 설명"
            rows={2}
            style={styles.textarea}
          />
        </div>

        {/* 이미지 업로더 */}
        <ImageUploader
          currentImage={formData.image}
          folder="prints"
          onUpload={handleImageUpload}
          label="대표 이미지"
        />

        <div style={styles.formGroup}>
          <label style={styles.label}>개요 (Overview)</label>
          <textarea
            name="overview"
            value={formData.overview}
            onChange={handleChange}
            placeholder="개요를 입력하세요"
            rows={3}
            style={styles.textarea}
          />
        </div>

        {/* Support 리스트 에디터 */}
        <div style={styles.formGroup}>
          <label style={styles.label}>주요 내용 (Support)</label>
          <p style={styles.hint}>항목별로 입력하세요.</p>
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
          <p style={styles.hint}>제목/설명 형태로 입력하세요.</p>
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

        {/* 상품 연결 */}
        <div
          style={{
            ...styles.formGroup,
            padding: "1rem",
            background: "#f0fdf4",
            borderRadius: "0.5rem",
            border: "1px solid #bbf7d0",
          }}
        >
          <label style={{ ...styles.label, color: "#166534" }}>
            연결 상품 (주문하기 버튼)
          </label>
          <p style={styles.hint}>
            상품을 선택하면 상세 페이지에 "주문하기" 버튼이 표시됩니다.
          </p>
          <select
            name="linked_product_id"
            value={formData.linked_product_id}
            onChange={handleChange}
            style={styles.select}
          >
            <option value="">연결 안 함 (목록으로 돌아가기 버튼만 표시)</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {!p.is_published ? "(비공개)" : ""}
              </option>
            ))}
          </select>

          {formData.linked_product_id && (
            <div style={{ marginTop: "0.5rem" }}>
              <label style={styles.label}>버튼 텍스트</label>
              <input
                type="text"
                name="order_button_text"
                value={formData.order_button_text}
                onChange={handleChange}
                placeholder="주문하기"
                style={styles.input}
              />
            </div>
          )}
        </div>

        {/* 필드 라벨 커스터마이징 */}
        <div
          style={{
            ...styles.formGroup,
            padding: "1rem",
            background: "#fefce8",
            borderRadius: "0.5rem",
            border: "1px solid #fde68a",
          }}
        >
          <label style={{ ...styles.label, color: "#854d0e" }}>
            필드 라벨 커스터마이징
          </label>
          <p style={styles.hint}>
            상세 페이지에 표시되는 섹션 제목을 변경할 수 있습니다.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.5rem",
            }}
          >
            {Object.entries(DEFAULT_LABELS).map(([key, defaultVal]) => (
              <div key={key}>
                <label
                  style={{
                    fontSize: "0.75rem",
                    color: "#6b7280",
                    marginBottom: "0.25rem",
                    display: "block",
                  }}
                >
                  {defaultVal} 라벨
                </label>
                <input
                  type="text"
                  value={fieldLabels[key] || ""}
                  onChange={(e) => handleLabelChange(key, e.target.value)}
                  placeholder={defaultVal}
                  style={styles.input}
                />
              </div>
            ))}
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
          onClick={() => (window.location.href = "/admin/prints")}
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

// 공통 스타일 + PrintsForm 전용 스타일
const styles: Record<string, React.CSSProperties> = {
  ...baseStyles,
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
