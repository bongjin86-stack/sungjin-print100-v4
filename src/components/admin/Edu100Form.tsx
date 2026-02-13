import { useEffect, useRef, useState } from "react";

import { uploadImage } from "@/lib/supabase";

import { adminFormStyles as styles } from "./adminFormStyles";
import BlockNoteEditor from "./BlockNoteEditor";

interface CoverField {
  label: string;
  placeholder?: string;
  type?: "text" | "color" | "select";
  options?: string[];
}

interface Edu100FormProps {
  mode: "create" | "edit";
  sectionId?: string;
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
    fields?: CoverField[];
    design_fee?: number;
    section_id?: string;
  };
}

export default function Edu100Form({ mode, initialData, sectionId }: Edu100FormProps) {
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
    fields: (initialData?.fields as CoverField[]) || [],
    design_fee: initialData?.design_fee ?? 0,
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
    fetch("/api/products?all=1")
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
      section_id: sectionId || initialData?.section_id || null,
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

        {/* 디자인 비용 */}
        <div style={styles.formGroup}>
          <label style={styles.label}>디자인 비용 (원)</label>
          <p style={{ fontSize: "0.75rem", color: "#9ca3af", margin: "0 0 0.5rem" }}>
            시리즈 총합 수량 미달 시 청구할 디자인 비용. 0이면 무료.
          </p>
          <input
            type="number"
            name="design_fee"
            value={formData.design_fee}
            onChange={handleChange}
            placeholder="예: 30000"
            min={0}
            style={styles.input}
          />
        </div>

        {/* 고객 입력 필드 */}
        <div style={styles.formGroup}>
          <label style={styles.label}>고객 입력 필드</label>
          <p style={{ fontSize: "0.75rem", color: "#9ca3af", margin: "0 0 0.5rem" }}>
            고객이 주문 시 입력할 항목을 정의합니다 (예: 제목, 부제목, 색상 등)
          </p>
          {(formData.fields || []).map((field: CoverField, idx: number) => {
            const fieldType = field.type || "text";
            const updateField = (patch: Partial<CoverField>) => {
              const newFields = [...(formData.fields || [])];
              newFields[idx] = { ...newFields[idx], ...patch };
              setFormData((prev) => ({ ...prev, fields: newFields }));
            };
            return (
              <div
                key={idx}
                style={{
                  marginBottom: "0.75rem",
                  padding: "0.75rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.5rem",
                  background: "#fafafa",
                }}
              >
                {/* 상단: 라벨 + 타입 + 삭제 */}
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem" }}>
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => updateField({ label: e.target.value })}
                    placeholder="라벨 (예: 제목)"
                    style={{ ...styles.input, flex: 1 }}
                  />
                  <select
                    value={fieldType}
                    onChange={(e) => {
                      const newType = e.target.value as CoverField["type"];
                      const patch: Partial<CoverField> = { type: newType };
                      if (newType === "color" || newType === "select") {
                        patch.options = field.options?.length ? field.options : [];
                        patch.placeholder = undefined;
                      } else {
                        patch.placeholder = field.placeholder || "";
                      }
                      updateField(patch);
                    }}
                    style={{ ...styles.select, width: "auto", minWidth: "90px", flexShrink: 0 }}
                  >
                    <option value="text">텍스트</option>
                    <option value="color">색상</option>
                    <option value="select">선택</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const newFields = (formData.fields || []).filter(
                        (_: CoverField, i: number) => i !== idx
                      );
                      setFormData((prev) => ({ ...prev, fields: newFields }));
                    }}
                    style={{
                      padding: "0.25rem 0.5rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.375rem",
                      background: "white",
                      color: "#ef4444",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      flexShrink: 0,
                    }}
                  >
                    삭제
                  </button>
                </div>

                {/* 타입별 하위 설정 */}
                {fieldType === "text" && (
                  <input
                    type="text"
                    value={field.placeholder || ""}
                    onChange={(e) => updateField({ placeholder: e.target.value })}
                    placeholder="안내 문구 (예: 표지 제목을 입력하세요)"
                    style={{ ...styles.input, width: "100%" }}
                  />
                )}

                {fieldType === "color" && (
                  <div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.5rem" }}>
                      {(field.options || []).map((hex: string, cIdx: number) => (
                        <div key={cIdx} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          <input
                            type="color"
                            value={hex}
                            onChange={(e) => {
                              const newOpts = [...(field.options || [])];
                              newOpts[cIdx] = e.target.value;
                              updateField({ options: newOpts });
                            }}
                            style={{ width: "2rem", height: "2rem", border: "none", padding: 0, cursor: "pointer", borderRadius: "0.25rem" }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newOpts = (field.options || []).filter((_: string, i: number) => i !== cIdx);
                              updateField({ options: newOpts });
                            }}
                            style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "0.75rem", padding: "0" }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => updateField({ options: [...(field.options || []), "#3B82F6"] })}
                      style={{ fontSize: "0.75rem", color: "#6b7280", background: "none", border: "1px dashed #d1d5db", borderRadius: "0.25rem", padding: "0.25rem 0.5rem", cursor: "pointer" }}
                    >
                      + 색상 추가
                    </button>
                  </div>
                )}

                {fieldType === "select" && (
                  <div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "0.5rem" }}>
                      {(field.options || []).map((opt: string, oIdx: number) => (
                        <div key={oIdx} style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...(field.options || [])];
                              newOpts[oIdx] = e.target.value;
                              updateField({ options: newOpts });
                            }}
                            placeholder="옵션명"
                            style={{ ...styles.input, flex: 1 }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newOpts = (field.options || []).filter((_: string, i: number) => i !== oIdx);
                              updateField({ options: newOpts });
                            }}
                            style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "0.75rem", padding: "0" }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => updateField({ options: [...(field.options || []), ""] })}
                      style={{ fontSize: "0.75rem", color: "#6b7280", background: "none", border: "1px dashed #d1d5db", borderRadius: "0.25rem", padding: "0.25rem 0.5rem", cursor: "pointer" }}
                    >
                      + 옵션 추가
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => {
              const newFields = [...(formData.fields || []), { label: "", placeholder: "", type: "text" }];
              setFormData((prev) => ({ ...prev, fields: newFields }));
            }}
            style={{
              padding: "0.375rem 0.75rem",
              border: "1px dashed #d1d5db",
              borderRadius: "0.375rem",
              background: "white",
              color: "#6b7280",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            + 필드 추가
          </button>
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
