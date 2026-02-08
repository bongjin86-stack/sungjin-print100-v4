import { useEffect, useState } from "react";

import { adminFormStyles as styles, mergeStyles } from "./adminFormStyles";
import ImageUploader from "./ImageUploader";

interface Product {
  id: string;
  name: string;
  icon: string;
  is_published?: boolean;
}

interface ServicesFormProps {
  mode: "create" | "edit";
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
    linked_product_id: string | null;
    order_button_text: string | null;
  };
}

export default function ServicesForm({ mode, initialData }: ServicesFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    slug: initialData?.slug || "",
    title: initialData?.title || "",
    title_en: initialData?.title_en || "",
    description: initialData?.description || "",
    detail_description: initialData?.detail_description || "",
    image: initialData?.image || "",
    sort_order: initialData?.sort_order || 1,
    is_active: initialData?.is_active ?? true,
    linked_product_id: initialData?.linked_product_id || "",
    order_button_text: initialData?.order_button_text || "주문하기",
  });
  const [tasks, setTasks] = useState<string[]>(initialData?.tasks || []);
  const [newTask, setNewTask] = useState("");
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data: Product[]) =>
        setProducts(data.filter((p) => p.is_published !== false))
      )
      .catch(() => setProducts([]));
  }, []);

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

  const handleImageUpload = (url: string) => {
    setFormData((prev) => ({ ...prev, image: url }));
  };

  const addTask = () => {
    if (newTask.trim()) {
      setTasks([...tasks, newTask.trim()]);
      setNewTask("");
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
      linked_product_id: formData.linked_product_id || null,
      order_button_text: formData.order_button_text || "주문하기",
      tasks: JSON.stringify(tasks),
    };

    try {
      const url =
        mode === "create"
          ? "/api/services"
          : `/api/services/${initialData?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        window.location.href = "/admin/services";
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
            <label style={styles.labelRequired}>
              슬러그 (URL) <span style={styles.requiredBadge}>필수</span>
            </label>
            <input
              type="text"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              placeholder="wireless-binding"
              required
              style={styles.input}
            />
            <p style={styles.hint}>URL에 사용될 고유 식별자</p>
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
            <label style={styles.labelRequired}>
              제목 (한글) <span style={styles.requiredBadge}>필수</span>
            </label>
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
          <p style={styles.hint}>목록에서 보여지는 짧은 설명</p>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>상세 설명</label>
          <textarea
            name="detail_description"
            value={formData.detail_description}
            onChange={handleChange}
            placeholder="무선제본은 책등에 접착제를 사용하여 내지를 표지에 붙이는 방식입니다."
            rows={4}
            style={styles.textarea}
          />
          <p style={styles.hint}>상세 페이지에서 보여지는 긴 설명</p>
        </div>

        {/* 이미지 업로더 */}
        <ImageUploader
          currentImage={formData.image}
          folder="services"
          onUpload={handleImageUpload}
          label="서비스 이미지"
        />

        {/* 제공 서비스 목록 */}
        <div style={styles.formGroup}>
          <label style={styles.label}>제공 서비스 목록</label>
          <div style={styles.listEditor}>
            <div style={localStyles.tasksList}>
              {tasks.map((task, index) => (
                <div key={index} style={styles.tagItem}>
                  <span>{task}</span>
                  <button
                    type="button"
                    onClick={() => removeTask(index)}
                    style={styles.tagRemoveButton}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div style={styles.listItem}>
              <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="새 서비스 항목 추가"
                style={styles.listInput}
                onKeyPress={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addTask())
                }
              />
              <button
                type="button"
                onClick={addTask}
                style={localStyles.addTaskBtn}
              >
                추가
              </button>
            </div>
          </div>
        </div>

        {/* 연결 상품 */}
        <div style={styles.formGroup}>
          <label style={styles.label}>연결 상품</label>
          <div style={styles.formRow}>
            <select
              name="linked_product_id"
              value={formData.linked_product_id}
              onChange={handleChange}
              style={mergeStyles(styles.select, { maxWidth: "none" })}
            >
              <option value="">선택 안 함</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              name="order_button_text"
              value={formData.order_button_text}
              onChange={handleChange}
              placeholder="주문하기"
              style={styles.input}
            />
          </div>
          <p style={styles.hint}>
            고객이 이 서비스 페이지에서 버튼을 누르면 연결된 상품 페이지로
            이동합니다
          </p>
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
            style={mergeStyles(styles.select, { maxWidth: "200px" })}
          >
            <option value="true">공개</option>
            <option value="false">비공개</option>
          </select>
        </div>
      </div>

      <div style={styles.formActions}>
        <button
          type="button"
          onClick={() => (window.location.href = "/admin/services")}
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
              ? "추가하기"
              : "수정하기"}
        </button>
      </div>
    </form>
  );
}

// 이 컴포넌트 전용 스타일
const localStyles: Record<string, React.CSSProperties> = {
  tasksList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
  },
  addTaskBtn: {
    padding: "0.5rem 1rem",
    background: "#e5e7eb",
    color: "#374151",
    border: "none",
    borderRadius: "0.375rem",
    fontSize: "0.875rem",
    fontWeight: 500,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
};
