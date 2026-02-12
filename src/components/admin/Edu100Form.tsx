import { useEffect, useRef, useState } from "react";

import { uploadImage } from "@/lib/supabase";

import { adminFormStyles as styles } from "./adminFormStyles";
import BlockNoteEditor from "./BlockNoteEditor";

interface Edu100FormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    title: string;
    subtitle?: string;
    description?: string;
    image?: string;
    thumbnails?: (string | null)[];
    tag?: string;
    linked_product_id?: string;
    is_published: boolean;
    sort_order?: number;
  };
}

export default function Edu100Form({ mode, initialData }: Edu100FormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    subtitle: initialData?.subtitle || "",
    description: initialData?.description || "",
    image: initialData?.image || "",
    thumbnails: initialData?.thumbnails || [null, null, null, null],
    tag: initialData?.tag || "",
    linked_product_id: initialData?.linked_product_id || "",
    is_published: initialData?.is_published ?? false,
    sort_order: initialData?.sort_order ?? 0,
  });

  const mainImageRef = useRef<HTMLInputElement>(null);
  const thumbImageRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // 상품 목록 로드
  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setProducts(data);
      })
      .catch(() => {});
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  // 메인 이미지 업로드
  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImageUploading(true);
      const url = await uploadImage(file, "edu100");
      setFormData((prev) => ({ ...prev, image: url }));
    } catch (err: any) {
      alert("이미지 업로드 실패: " + err.message);
    } finally {
      setImageUploading(false);
    }
  };

  // 썸네일 업로드
  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImageUploading(true);
      const url = await uploadImage(file, "edu100");
      setFormData((prev) => {
        const newThumbnails = [...(prev.thumbnails || [null, null, null, null])];
        newThumbnails[index] = url;
        return { ...prev, thumbnails: newThumbnails };
      });
    } catch (err: any) {
      alert("이미지 업로드 실패: " + err.message);
    } finally {
      setImageUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      ...formData,
      sort_order: Number(formData.sort_order) || 0,
    };

    try {
      const url = mode === "create" ? "/api/edu100" : `/api/edu100/${initialData?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        window.location.href = "/admin/edu100";
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
        {/* 이미지 영역 - 빌더와 동일한 포맷 */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={styles.label}>표지 이미지</label>

          {/* 메인 이미지 */}
          <input
            ref={mainImageRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleMainImageUpload}
          />
          <div style={{ position: "relative", marginBottom: "0.5rem" }}>
            <div
              style={{
                aspectRatio: "3/2",
                background: "#f9fafb",
                borderRadius: "1rem",
                border: "1px dashed #e5e7eb",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                overflow: "hidden",
                opacity: imageUploading ? 0.5 : 1,
              }}
              onClick={() => mainImageRef.current?.click()}
            >
              {formData.image ? (
                <img
                  src={formData.image}
                  alt="메인"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <>
                  <div style={{ fontSize: "2.5rem", color: "#d1d5db", marginBottom: "0.5rem" }}>+</div>
                  <p style={{ fontSize: "0.875rem", color: "#9ca3af" }}>
                    {imageUploading ? "업로드 중..." : "메인 이미지"}
                  </p>
                </>
              )}
            </div>
            {formData.image && (
              <button
                type="button"
                style={{
                  position: "absolute",
                  top: "0.5rem",
                  right: "0.5rem",
                  width: "1.5rem",
                  height: "1.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.4)",
                  color: "white",
                  fontSize: "0.75rem",
                  border: "none",
                  cursor: "pointer",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setFormData((prev) => ({ ...prev, image: "" }));
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* 썸네일 4개 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
            {[0, 1, 2, 3].map((idx) => (
              <div key={idx} style={{ position: "relative" }}>
                <input
                  ref={thumbImageRefs[idx]}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => handleThumbnailUpload(e, idx)}
                />
                <div
                  style={{
                    aspectRatio: "3/2",
                    background: "#f9fafb",
                    borderRadius: "1rem",
                    border: "1px dashed #e5e7eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    overflow: "hidden",
                    opacity: imageUploading ? 0.5 : 1,
                  }}
                  onClick={() => thumbImageRefs[idx].current?.click()}
                >
                  {formData.thumbnails?.[idx] ? (
                    <img
                      src={formData.thumbnails[idx]!}
                      alt={`썸네일${idx + 1}`}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <span style={{ fontSize: "1.25rem", color: "#d1d5db" }}>+</span>
                  )}
                </div>
                {formData.thumbnails?.[idx] && (
                  <button
                    type="button"
                    style={{
                      position: "absolute",
                      top: "0.25rem",
                      right: "0.25rem",
                      width: "1.25rem",
                      height: "1.25rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "50%",
                      background: "rgba(0,0,0,0.4)",
                      color: "white",
                      fontSize: "10px",
                      border: "none",
                      cursor: "pointer",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFormData((prev) => {
                        const newThumbnails = [...(prev.thumbnails || [])];
                        newThumbnails[idx] = null;
                        return { ...prev, thumbnails: newThumbnails };
                      });
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={styles.formRow}>
          <div style={styles.formGroup}>
            <label style={styles.label}>제목 *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="표지 제목"
              required
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>부제</label>
            <input
              type="text"
              name="subtitle"
              value={formData.subtitle}
              onChange={handleChange}
              placeholder="부제"
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>설명</label>
          <p style={{ fontSize: "0.75rem", color: "#9ca3af", margin: "0 0 0.5rem" }}>
            슬래시(/)를 입력하면 다양한 블록을 추가할 수 있습니다.
          </p>
          <BlockNoteEditor
            initialContent={formData.description}
            onChange={(html: string) =>
              setFormData((prev) => ({ ...prev, description: html }))
            }
            height="200px"
            placeholder="표지에 대한 설명을 입력하세요..."
          />
        </div>

        <div style={styles.formRow}>
          <div style={styles.formGroup}>
            <label style={styles.label}>태그</label>
            <input
              type="text"
              name="tag"
              value={formData.tag}
              onChange={handleChange}
              placeholder="예: 국어, 수학, 영어"
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>정렬 순서</label>
            <input
              type="number"
              name="sort_order"
              value={formData.sort_order}
              onChange={handleChange}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>연결 상품</label>
          <select
            name="linked_product_id"
            value={formData.linked_product_id}
            onChange={handleChange}
            style={styles.select}
          >
            <option value="">선택 안함</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
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

      <div style={styles.formActions}>
        <button
          type="button"
          onClick={() => (window.location.href = "/admin/edu100")}
          style={styles.cancelButton}
        >
          취소
        </button>
        <button type="submit" disabled={isSubmitting} style={styles.submitButton}>
          {isSubmitting ? "저장 중..." : mode === "create" ? "등록하기" : "수정하기"}
        </button>
      </div>
    </form>
  );
}
