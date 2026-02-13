import { useState } from "react";

import { adminFormStyles as styles } from "./adminFormStyles";
import BlockNoteEditor from "./BlockNoteEditor";

interface BlogData {
  id?: string;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  category: string;
  tags: string[];
  is_published: boolean;
  pub_date: string;
}

interface BlogFormProps {
  initialData?: BlogData;
  mode: "create" | "edit";
}

const categories = [
  { id: "general", name: "일반" },
  { id: "design", name: "디자인" },
  { id: "printing", name: "인쇄" },
  { id: "guide", name: "가이드" },
  { id: "news", name: "소식" },
];

export default function BlogForm({ initialData, mode }: BlogFormProps) {
  const [formData, setFormData] = useState<BlogData>({
    title: initialData?.title || "",
    excerpt: initialData?.excerpt || "",
    content: initialData?.content || "",
    image: initialData?.image || "",
    category: initialData?.category || "general",
    tags: initialData?.tags || [],
    is_published: initialData?.is_published ?? false,
    pub_date: initialData?.pub_date || new Date().toISOString().split("T")[0],
  });
  const [tagInput, setTagInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleContentChange = (content: string) => {
    setFormData((prev) => ({ ...prev, content }));
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tagToRemove),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setMessage({ type: "error", text: "제목을 입력해주세요." });
      return;
    }

    if (!formData.content.trim() || formData.content === "[]") {
      setMessage({ type: "error", text: "내용을 입력해주세요." });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const url =
        mode === "create" ? "/api/blog" : `/api/blog/${initialData?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setMessage({
          type: "success",
          text: mode === "create" ? "블로그 글이 등록되었습니다." : "블로그 글이 수정되었습니다.",
        });

        setTimeout(() => {
          window.location.href = "/admin/blog";
        }, 1000);
      } else {
        const error = await response.json();
        throw new Error(error.message || "저장에 실패했습니다.");
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "저장 중 오류가 발생했습니다.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      {message && (
        <div
          style={
            message.type === "success" ? styles.messageSuccess : styles.messageError
          }
        >
          {message.text}
        </div>
      )}

      <div style={styles.formGrid}>
        {/* 제목 */}
        <div style={styles.formGroup}>
          <label style={styles.labelRequired}>
            제목 <span style={styles.requiredBadge}>필수</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder="블로그 제목을 입력하세요"
            style={styles.input}
          />
        </div>

        {/* 요약 */}
        <div style={styles.formGroup}>
          <label style={styles.label}>요약 (SEO 설명)</label>
          <textarea
            value={formData.excerpt}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, excerpt: e.target.value }))
            }
            placeholder="검색엔진에 표시될 요약문을 입력하세요 (2~3줄)"
            rows={3}
            style={styles.textarea}
          />
        </div>

        <div style={styles.formRow}>
          {/* 카테고리 */}
          <div style={styles.formGroup}>
            <label style={styles.label}>카테고리</label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, category: e.target.value }))
              }
              style={styles.select}
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* 발행일 */}
          <div style={styles.formGroup}>
            <label style={styles.label}>발행일</label>
            <input
              type="date"
              value={formData.pub_date}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, pub_date: e.target.value }))
              }
              style={styles.input}
            />
          </div>

          {/* 공개 여부 */}
          <div style={styles.formGroup}>
            <label style={styles.label}>공개 여부</label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                fontSize: "14px",
                marginTop: "4px",
              }}
            >
              <input
                type="checkbox"
                checked={formData.is_published}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, is_published: e.target.checked }))
                }
                style={{ width: "16px", height: "16px" }}
              />
              공개
            </label>
          </div>
        </div>

        {/* 대표 이미지 */}
        <div style={styles.formGroup}>
          <label style={styles.label}>대표 이미지</label>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                background: "#f3f4f6",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                cursor: isUploading ? "not-allowed" : "pointer",
                fontSize: "13px",
                color: "#374151",
                whiteSpace: "nowrap",
                opacity: isUploading ? 0.6 : 1,
              }}
            >
              {isUploading ? "업로드 중..." : "이미지 선택"}
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                disabled={isUploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setIsUploading(true);
                  try {
                    const fd = new FormData();
                    fd.append("file", file);
                    const res = await fetch("/api/upload", { method: "POST", body: fd });
                    if (!res.ok) throw new Error("업로드 실패");
                    const data = await res.json();
                    setFormData((prev) => ({ ...prev, image: data.url }));
                  } catch {
                    setMessage({ type: "error", text: "이미지 업로드에 실패했습니다." });
                  } finally {
                    setIsUploading(false);
                    e.target.value = "";
                  }
                }}
              />
            </label>
            {formData.image && (
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, image: "" }))}
                style={{
                  padding: "8px 12px",
                  background: "#fef2f2",
                  color: "#dc2626",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                삭제
              </button>
            )}
          </div>
          {formData.image && (
            <img
              src={formData.image}
              alt="미리보기"
              style={{
                maxWidth: "300px",
                maxHeight: "200px",
                objectFit: "cover",
                borderRadius: "8px",
                marginTop: "8px",
              }}
            />
          )}
        </div>

        {/* 태그 */}
        <div style={styles.formGroup}>
          <label style={styles.label}>태그</label>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="태그 입력 후 Enter"
              style={{ ...styles.input, flex: 1, marginBottom: 0 }}
            />
            <button
              type="button"
              onClick={addTag}
              style={{
                padding: "8px 16px",
                background: "#f3f4f6",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "13px",
                whiteSpace: "nowrap",
              }}
            >
              추가
            </button>
          </div>
          {formData.tags.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: "6px",
                flexWrap: "wrap",
                marginTop: "8px",
              }}
            >
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 10px",
                    background: "#e0e7ff",
                    color: "#4338ca",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: 500,
                  }}
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#4338ca",
                      cursor: "pointer",
                      padding: "0 2px",
                      fontSize: "14px",
                      lineHeight: 1,
                    }}
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 본문 */}
        <div style={styles.formGroup}>
          <label style={styles.labelRequired}>
            본문 <span style={styles.requiredBadge}>필수</span>
          </label>
          <p style={styles.hint}>
            슬래시(/)를 입력하면 다양한 블록을 추가할 수 있습니다.
          </p>
          <BlockNoteEditor
            initialContent={formData.content}
            onChange={handleContentChange}
            height="500px"
            placeholder="블로그 내용을 입력하세요..."
          />
        </div>
      </div>

      <div style={styles.formActions}>
        <a href="/admin/blog" style={styles.cancelButton}>
          취소
        </a>
        <button
          type="submit"
          disabled={isSubmitting}
          style={styles.submitButton}
        >
          {isSubmitting
            ? "저장 중..."
            : mode === "create"
              ? "등록하기"
              : "수정하기"}
        </button>
      </div>
    </form>
  );
}
