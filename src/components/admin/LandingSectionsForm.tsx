import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "@/lib/supabase";
import { uploadImage } from "@/lib/supabase";

import { adminFormStyles as styles } from "./adminFormStyles";
import HeroForm from "./HeroForm";

type TabType = "hero" | "about" | "products" | "edu100" | "cta";

interface FormData {
  // About 섹션
  landing_about_text: string;
  // CTA 섹션
  landing_cta_title: string;
  landing_cta_subtitle: string;
  landing_cta_text: string;
  landing_cta_list: string;
  landing_cta_button_text: string;
  landing_cta_button_link: string;
  // Products 섹션
  landing_products_ids: string;
  landing_products_count: string;
  // EDU+100 섹션
  landing_edu100_images: string;
  landing_edu100_speed: string;
  landing_edu100_title: string;
  landing_edu100_subtitle: string;
  landing_edu100_text: string;
  landing_edu100_button_text: string;
  landing_edu100_button_link: string;
}

interface PrintItem {
  id: string;
  title: string;
  image: string | null;
  tag: string | null;
  is_published: boolean;
}

const defaultValues: FormData = {
  landing_about_text:
    "20년 경력의 인쇄 전문가가 운영하는\nSungjinprint입니다.\n\n무선제본, 중철제본, 스프링제본 등\n다양한 제본 서비스와 빠른 납기를 제공합니다.\n\n50부 이상 대량 주문 시 단가가 낮아지며,\n최신 장비로 깔끔한 인쇄 품질을 보장합니다.\n언제든 편하게 문의해 주세요.",
  landing_cta_title: "Contact",
  landing_cta_subtitle: "문의하기",
  landing_cta_text:
    "견적 문의, 상담, 샘플 요청 등 무엇이든 편하게 문의해 주세요.",
  landing_cta_list:
    "책자, 카탈로그, 브로슈어 인쇄를 의뢰하고 싶다\n대량 인쇄 견적을 받고 싶다\n용지 선택이나 후가공에 대해 상담하고 싶다\n납기 일정을 확인하고 싶다\n용지 샘플을 받아보고 싶다 등",
  landing_cta_button_text: "문의하기",
  landing_cta_button_link: "/contact",
  landing_products_ids: "[]",
  landing_products_count: "6",
  landing_edu100_images: "[]",
  landing_edu100_speed: "3000",
  landing_edu100_title: "Edu+100",
  landing_edu100_subtitle: "교재인쇄 서비스",
  landing_edu100_text:
    "학원, 학교, 기업교육에 최적화된 교재 인쇄 서비스입니다.\n다양한 표지 디자인 갤러리에서 원하는 디자인을 선택하고,\n간편하게 주문할 수 있습니다.",
  landing_edu100_button_text: "자세히 보기",
  landing_edu100_button_link: "/edu100",
};

export default function LandingSectionsForm() {
  const [activeTab, setActiveTab] = useState<TabType>("hero");
  const [formData, setFormData] = useState<FormData>(defaultValues);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Products 탭 상태
  const [allPrints, setAllPrints] = useState<PrintItem[]>([]);
  const [selectedPrintIds, setSelectedPrintIds] = useState<string[]>([]);

  // EDU+100 이미지 업로드 상태
  const [edu100Images, setEdu100Images] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSettings();
    loadPrints();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value");

      if (error) throw error;

      if (data) {
        const configMap: Record<string, string> = {};
        data.forEach((item: { key: string; value: string }) => {
          configMap[item.key] = item.value;
        });

        const newFormData: FormData = {
          landing_about_text:
            configMap.landing_about_text || defaultValues.landing_about_text,
          landing_cta_title:
            configMap.landing_cta_title || defaultValues.landing_cta_title,
          landing_cta_subtitle:
            configMap.landing_cta_subtitle ||
            defaultValues.landing_cta_subtitle,
          landing_cta_text:
            configMap.landing_cta_text || defaultValues.landing_cta_text,
          landing_cta_list:
            configMap.landing_cta_list || defaultValues.landing_cta_list,
          landing_cta_button_text:
            configMap.landing_cta_button_text ||
            defaultValues.landing_cta_button_text,
          landing_cta_button_link:
            configMap.landing_cta_button_link ||
            defaultValues.landing_cta_button_link,
          landing_products_ids:
            configMap.landing_products_ids ||
            defaultValues.landing_products_ids,
          landing_products_count:
            configMap.landing_products_count ||
            defaultValues.landing_products_count,
          landing_edu100_images:
            configMap.landing_edu100_images ||
            defaultValues.landing_edu100_images,
          landing_edu100_speed:
            configMap.landing_edu100_speed ||
            defaultValues.landing_edu100_speed,
          landing_edu100_title:
            configMap.landing_edu100_title ||
            defaultValues.landing_edu100_title,
          landing_edu100_subtitle:
            configMap.landing_edu100_subtitle ||
            defaultValues.landing_edu100_subtitle,
          landing_edu100_text:
            configMap.landing_edu100_text || defaultValues.landing_edu100_text,
          landing_edu100_button_text:
            configMap.landing_edu100_button_text ||
            defaultValues.landing_edu100_button_text,
          landing_edu100_button_link:
            configMap.landing_edu100_button_link ||
            defaultValues.landing_edu100_button_link,
        };

        setFormData(newFormData);

        try {
          const ids = JSON.parse(newFormData.landing_products_ids || "[]");
          setSelectedPrintIds(Array.isArray(ids) ? ids : []);
        } catch {
          setSelectedPrintIds([]);
        }

        try {
          const imgs = JSON.parse(newFormData.landing_edu100_images || "[]");
          setEdu100Images(Array.isArray(imgs) ? imgs : []);
        } catch {
          setEdu100Images([]);
        }
      }
    } catch (error) {
      console.error("설정 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPrints = async () => {
    try {
      const { data, error } = await supabase
        .from("prints")
        .select("id, title, image, tag, is_published")
        .eq("is_published", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setAllPrints(data || []);
    } catch (error) {
      console.error("prints 로드 실패:", error);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      let fieldsToSave: string[] = [];

      if (activeTab === "about") {
        fieldsToSave = ["landing_about_text"];
      } else if (activeTab === "cta") {
        fieldsToSave = [
          "landing_cta_title",
          "landing_cta_subtitle",
          "landing_cta_text",
          "landing_cta_list",
          "landing_cta_button_text",
          "landing_cta_button_link",
        ];
      } else if (activeTab === "products") {
        const idsJson = JSON.stringify(selectedPrintIds);
        setFormData((prev) => ({ ...prev, landing_products_ids: idsJson }));
        const updates = [
          {
            key: "landing_products_ids",
            value: idsJson,
            updated_at: new Date().toISOString(),
          },
          {
            key: "landing_products_count",
            value: formData.landing_products_count,
            updated_at: new Date().toISOString(),
          },
        ];
        const { error } = await supabase
          .from("site_settings")
          .upsert(updates, { onConflict: "key" });

        if (error) throw error;
        setMessage({ type: "success", text: "저장되었습니다." });
        setTimeout(() => setMessage(null), 3000);
        setSaving(false);
        return;
      } else if (activeTab === "edu100") {
        const imgsJson = JSON.stringify(edu100Images);
        setFormData((prev) => ({ ...prev, landing_edu100_images: imgsJson }));
        const edu100Fields = [
          "landing_edu100_speed",
          "landing_edu100_title",
          "landing_edu100_subtitle",
          "landing_edu100_text",
          "landing_edu100_button_text",
          "landing_edu100_button_link",
        ];
        const updates = [
          ...edu100Fields.map((key) => ({
            key,
            value: formData[key as keyof FormData],
            updated_at: new Date().toISOString(),
          })),
          {
            key: "landing_edu100_images",
            value: imgsJson,
            updated_at: new Date().toISOString(),
          },
        ];
        const { error } = await supabase
          .from("site_settings")
          .upsert(updates, { onConflict: "key" });

        if (error) throw error;
        setMessage({ type: "success", text: "저장되었습니다." });
        setTimeout(() => setMessage(null), 3000);
        setSaving(false);
        return;
      }

      const updates = fieldsToSave.map((key) => ({
        key,
        value: formData[key as keyof FormData],
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("site_settings")
        .upsert(updates, { onConflict: "key" });

      if (error) throw error;

      setMessage({ type: "success", text: "저장되었습니다." });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("저장 실패:", error);
      setMessage({ type: "error", text: "저장에 실패했습니다." });
    } finally {
      setSaving(false);
    }
  };

  // ─── Products 탭 핸들러 ───
  const togglePrint = useCallback((printId: string) => {
    setSelectedPrintIds((prev) => {
      if (prev.includes(printId)) {
        return prev.filter((id) => id !== printId);
      }
      return [...prev, printId];
    });
  }, []);

  const movePrint = useCallback((index: number, direction: -1 | 1) => {
    setSelectedPrintIds((prev) => {
      const newArr = [...prev];
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= newArr.length) return prev;
      [newArr[index], newArr[newIndex]] = [newArr[newIndex], newArr[index]];
      return newArr;
    });
  }, []);

  const removePrint = useCallback((printId: string) => {
    setSelectedPrintIds((prev) => prev.filter((id) => id !== printId));
  }, []);

  // ─── EDU+100 이미지 핸들러 ───
  const handleEdu100ImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) return;

    setUploading(true);
    try {
      const publicUrl = await uploadImage(file, "landing-edu100");
      setEdu100Images((prev) => [...prev, publicUrl]);
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeEdu100Image = useCallback((index: number) => {
    setEdu100Images((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const moveEdu100Image = useCallback((index: number, direction: -1 | 1) => {
    setEdu100Images((prev) => {
      const newArr = [...prev];
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= newArr.length) return prev;
      [newArr[index], newArr[newIndex]] = [newArr[newIndex], newArr[index]];
      return newArr;
    });
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>로딩 중...</div>
    );
  }

  const selectedPrintsInfo = selectedPrintIds
    .map((id) => allPrints.find((p) => p.id === id))
    .filter(Boolean) as PrintItem[];

  return (
    <div style={styles.form}>
      {/* 탭 네비게이션 */}
      <div style={localStyles.tabs}>
        {(
          [
            ["hero", "Hero"],
            ["products", "Products"],
            ["edu100", "Edu+100"],
            ["about", "About"],
            ["cta", "CTA"],
          ] as [TabType, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            style={{
              ...localStyles.tab,
              ...(activeTab === key ? localStyles.tabActive : {}),
            }}
          >
            {label} 섹션
          </button>
        ))}
      </div>

      {/* Hero 섹션 */}
      {activeTab === "hero" && (
        <div style={{ margin: "-1rem" }}>
          <HeroForm />
        </div>
      )}

      {message && activeTab !== "hero" && (
        <div
          style={
            message.type === "success"
              ? styles.messageSuccess
              : styles.messageError
          }
        >
          {message.text}
        </div>
      )}

      {/* Products 섹션 */}
      {activeTab === "products" && (
        <div style={styles.formGrid}>
          <div style={localStyles.sectionHeader}>
            <h3 style={localStyles.sectionTitle}>Products 섹션</h3>
            <p style={localStyles.sectionDesc}>
              랜딩 페이지에 노출할 인쇄 상품을 선택하고 순서를 설정합니다.
            </p>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>노출 개수</label>
            <select
              name="landing_products_count"
              value={formData.landing_products_count}
              onChange={handleChange}
              style={styles.select}
            >
              {[3, 4, 6, 8, 9, 12].map((n) => (
                <option key={n} value={n}>
                  {n}개
                </option>
              ))}
            </select>
            <p style={styles.hint}>
              랜딩 페이지에 표시할 최대 상품 수입니다. 선택된 상품이 없으면
              최신 상품이 자동으로 표시됩니다.
            </p>
          </div>

          {selectedPrintsInfo.length > 0 && (
            <div style={styles.formGroup}>
              <label style={styles.label}>
                선택된 상품 ({selectedPrintsInfo.length}개)
              </label>
              <div style={localStyles.selectedList}>
                {selectedPrintsInfo.map((item, index) => (
                  <div key={item.id} style={localStyles.selectedItem}>
                    <span style={localStyles.selectedIndex}>{index + 1}</span>
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.title}
                        style={localStyles.selectedThumb}
                      />
                    )}
                    <span style={localStyles.selectedName}>{item.title}</span>
                    {item.tag && (
                      <span style={localStyles.selectedTag}>{item.tag}</span>
                    )}
                    <div style={localStyles.selectedActions}>
                      <button
                        type="button"
                        onClick={() => movePrint(index, -1)}
                        disabled={index === 0}
                        style={localStyles.moveBtn}
                        title="위로"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => movePrint(index, 1)}
                        disabled={index === selectedPrintsInfo.length - 1}
                        style={localStyles.moveBtn}
                        title="아래로"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => removePrint(item.id)}
                        style={localStyles.removeBtn}
                        title="제거"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={styles.formGroup}>
            <label style={styles.label}>상품 선택</label>
            <p style={styles.hint}>
              클릭하여 랜딩 페이지에 노출할 상품을 선택/해제합니다.
            </p>
            <div style={localStyles.printGrid}>
              {allPrints.map((item) => {
                const isSelected = selectedPrintIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => togglePrint(item.id)}
                    style={{
                      ...localStyles.printCard,
                      ...(isSelected ? localStyles.printCardSelected : {}),
                    }}
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        style={localStyles.printCardImage}
                      />
                    ) : (
                      <div style={localStyles.printCardPlaceholder}>
                        No Image
                      </div>
                    )}
                    <div style={localStyles.printCardInfo}>
                      <span style={localStyles.printCardTitle}>
                        {item.title}
                      </span>
                      {item.tag && (
                        <span style={localStyles.printCardTag}>{item.tag}</span>
                      )}
                    </div>
                    {isSelected && (
                      <div style={localStyles.printCardCheck}>✓</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* EDU+100 섹션 */}
      {activeTab === "edu100" && (
        <div style={styles.formGrid}>
          <div style={localStyles.sectionHeader}>
            <h3 style={localStyles.sectionTitle}>Edu+100 섹션</h3>
            <p style={localStyles.sectionDesc}>
              랜딩 페이지의 Edu+100 소개 섹션을 편집합니다. 왼쪽 이미지
              캐러셀과 오른쪽 텍스트로 구성됩니다.
            </p>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              캐러셀 이미지 ({edu100Images.length}개)
            </label>
            <p style={styles.hint}>
              이미지를 추가하고 순서를 변경할 수 있습니다.
            </p>

            {edu100Images.length > 0 && (
              <div style={localStyles.imageList}>
                {edu100Images.map((img, index) => (
                  <div key={index} style={localStyles.imageItem}>
                    <img
                      src={img}
                      alt={`이미지 ${index + 1}`}
                      style={localStyles.imageThumb}
                    />
                    <div style={localStyles.imageActions}>
                      <button
                        type="button"
                        onClick={() => moveEdu100Image(index, -1)}
                        disabled={index === 0}
                        style={localStyles.moveBtn}
                        title="위로"
                      >
                        ◀
                      </button>
                      <button
                        type="button"
                        onClick={() => moveEdu100Image(index, 1)}
                        disabled={index === edu100Images.length - 1}
                        style={localStyles.moveBtn}
                        title="아래로"
                      >
                        ▶
                      </button>
                      <button
                        type="button"
                        onClick={() => removeEdu100Image(index)}
                        style={localStyles.removeBtn}
                        title="삭제"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={styles.addButton}
            >
              {uploading ? "업로드 중..." : "+ 이미지 추가"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleEdu100ImageUpload}
              style={{ display: "none" }}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>캐러셀 전환 속도</label>
            <select
              name="landing_edu100_speed"
              value={formData.landing_edu100_speed}
              onChange={handleChange}
              style={styles.select}
            >
              <option value="2000">2초</option>
              <option value="3000">3초</option>
              <option value="4000">4초</option>
              <option value="5000">5초</option>
              <option value="7000">7초</option>
            </select>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>제목</label>
              <input
                type="text"
                name="landing_edu100_title"
                value={formData.landing_edu100_title}
                onChange={handleChange}
                style={styles.input}
                placeholder="Edu+100"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>부제목 (라벨)</label>
              <input
                type="text"
                name="landing_edu100_subtitle"
                value={formData.landing_edu100_subtitle}
                onChange={handleChange}
                style={styles.input}
                placeholder="교재인쇄 서비스"
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>설명 텍스트</label>
            <textarea
              name="landing_edu100_text"
              value={formData.landing_edu100_text}
              onChange={handleChange}
              rows={6}
              style={styles.textarea}
              placeholder="Edu+100 소개 텍스트를 입력하세요"
            />
            <p style={styles.hint}>줄바꿈은 그대로 유지됩니다.</p>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>버튼 텍스트</label>
              <input
                type="text"
                name="landing_edu100_button_text"
                value={formData.landing_edu100_button_text}
                onChange={handleChange}
                style={styles.input}
                placeholder="자세히 보기"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>버튼 링크</label>
              <input
                type="text"
                name="landing_edu100_button_link"
                value={formData.landing_edu100_button_link}
                onChange={handleChange}
                style={styles.input}
                placeholder="/edu100"
              />
            </div>
          </div>

          <div style={localStyles.preview}>
            <h4 style={localStyles.previewTitle}>미리보기</h4>
            <div style={localStyles.edu100Preview}>
              <div style={localStyles.edu100PreviewImage}>
                {edu100Images.length > 0 ? (
                  <img
                    src={edu100Images[0]}
                    alt="미리보기"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <span style={{ color: "#9ca3af", fontSize: "0.875rem" }}>
                    이미지 없음
                  </span>
                )}
              </div>
              <div style={localStyles.edu100PreviewText}>
                <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                  {formData.landing_edu100_subtitle}
                </span>
                <strong
                  style={{
                    fontSize: "1.25rem",
                    display: "block",
                    margin: "0.25rem 0 0.5rem",
                  }}
                >
                  {formData.landing_edu100_title}
                </strong>
                <p
                  style={{
                    fontSize: "0.8125rem",
                    color: "#6b7280",
                    lineHeight: 1.6,
                    whiteSpace: "pre-line",
                  }}
                >
                  {formData.landing_edu100_text}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* About 섹션 */}
      {activeTab === "about" && (
        <div style={styles.formGrid}>
          <div style={localStyles.sectionHeader}>
            <h3 style={localStyles.sectionTitle}>About 섹션</h3>
            <p style={localStyles.sectionDesc}>
              랜딩 페이지의 회사 소개 섹션 텍스트를 편집합니다.
            </p>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>소개 텍스트</label>
            <textarea
              name="landing_about_text"
              value={formData.landing_about_text}
              onChange={handleChange}
              rows={10}
              style={styles.textarea}
              placeholder="회사 소개 텍스트를 입력하세요"
            />
            <p style={styles.hint}>
              줄바꿈은 그대로 유지됩니다. 빈 줄을 넣으면 문단이 구분됩니다.
            </p>
          </div>

          <div style={localStyles.preview}>
            <h4 style={localStyles.previewTitle}>미리보기</h4>
            <div style={localStyles.previewContent}>
              {formData.landing_about_text.split("\n").map((line, i) =>
                line ? (
                  <span key={i}>
                    {line}
                    <br />
                  </span>
                ) : (
                  <br key={i} />
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* CTA 섹션 */}
      {activeTab === "cta" && (
        <div style={styles.formGrid}>
          <div style={localStyles.sectionHeader}>
            <h3 style={localStyles.sectionTitle}>CTA 섹션</h3>
            <p style={localStyles.sectionDesc}>
              랜딩 페이지 하단의 문의하기 섹션을 편집합니다.
            </p>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>제목</label>
              <input
                type="text"
                name="landing_cta_title"
                value={formData.landing_cta_title}
                onChange={handleChange}
                style={styles.input}
                placeholder="Contact"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>부제목</label>
              <input
                type="text"
                name="landing_cta_subtitle"
                value={formData.landing_cta_subtitle}
                onChange={handleChange}
                style={styles.input}
                placeholder="문의하기"
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>설명 텍스트</label>
            <input
              type="text"
              name="landing_cta_text"
              value={formData.landing_cta_text}
              onChange={handleChange}
              style={styles.input}
              placeholder="견적 문의, 상담, 샘플 요청 등..."
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>목록 항목</label>
            <textarea
              name="landing_cta_list"
              value={formData.landing_cta_list}
              onChange={handleChange}
              rows={6}
              style={styles.textarea}
              placeholder="한 줄에 하나씩 입력하세요"
            />
            <p style={styles.hint}>
              한 줄에 하나의 항목을 입력하세요. 각 항목 앞에 불릿(・)이 자동으로
              붙습니다.
            </p>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>버튼 텍스트</label>
              <input
                type="text"
                name="landing_cta_button_text"
                value={formData.landing_cta_button_text}
                onChange={handleChange}
                style={styles.input}
                placeholder="문의하기"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>버튼 링크</label>
              <input
                type="text"
                name="landing_cta_button_link"
                value={formData.landing_cta_button_link}
                onChange={handleChange}
                style={styles.input}
                placeholder="/contact"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab !== "hero" && (
        <div style={styles.formActions}>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={styles.submitButton}
          >
            {saving ? "저장 중..." : "저장하기"}
          </button>
        </div>
      )}
    </div>
  );
}

const localStyles: Record<string, React.CSSProperties> = {
  tabs: {
    display: "flex",
    gap: "0.25rem",
    marginBottom: "1.5rem",
    borderBottom: "1px solid #e5e7eb",
    paddingBottom: "0",
    overflowX: "auto",
  },
  tab: {
    padding: "0.75rem 1.25rem",
    background: "none",
    border: "none",
    borderBottom: "2px solid transparent",
    fontSize: "0.8125rem",
    fontWeight: 500,
    color: "#6b7280",
    cursor: "pointer",
    marginBottom: "-1px",
    whiteSpace: "nowrap",
  },
  tabActive: {
    color: "#000",
    borderBottomColor: "#000",
  },
  sectionHeader: {
    marginBottom: "0.5rem",
  },
  sectionTitle: {
    fontSize: "1.125rem",
    fontWeight: 600,
    color: "#111827",
    margin: 0,
  },
  sectionDesc: {
    fontSize: "0.875rem",
    color: "#6b7280",
    marginTop: "0.25rem",
  },
  preview: {
    padding: "1rem",
    background: "#f9fafb",
    borderRadius: "0.5rem",
    border: "1px solid #e5e7eb",
  },
  previewTitle: {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "0.75rem",
  },
  previewContent: {
    fontSize: "1.25rem",
    lineHeight: 1.8,
    color: "#374151",
  },
  selectedList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    padding: "0.75rem",
    background: "#f9fafb",
    borderRadius: "0.5rem",
    border: "1px solid #e5e7eb",
  },
  selectedItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.5rem",
    background: "white",
    borderRadius: "0.375rem",
    border: "1px solid #e5e7eb",
  },
  selectedIndex: {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#9ca3af",
    minWidth: "1.5rem",
    textAlign: "center",
  },
  selectedThumb: {
    width: "48px",
    height: "32px",
    objectFit: "cover",
    borderRadius: "0.25rem",
  },
  selectedName: {
    flex: 1,
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "#111827",
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  selectedTag: {
    fontSize: "0.6875rem",
    padding: "2px 8px",
    background: "#f3f4f6",
    borderRadius: "9999px",
    color: "#6b7280",
    whiteSpace: "nowrap",
  },
  selectedActions: {
    display: "flex",
    gap: "0.25rem",
    flexShrink: 0,
  },
  moveBtn: {
    padding: "0.25rem 0.5rem",
    background: "#f3f4f6",
    border: "1px solid #e5e7eb",
    borderRadius: "0.25rem",
    fontSize: "0.625rem",
    cursor: "pointer",
    color: "#374151",
  },
  removeBtn: {
    padding: "0.25rem 0.5rem",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "0.25rem",
    fontSize: "0.625rem",
    cursor: "pointer",
    color: "#dc2626",
  },
  printGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gap: "0.75rem",
    marginTop: "0.5rem",
  },
  printCard: {
    position: "relative",
    border: "2px solid #e5e7eb",
    borderRadius: "0.5rem",
    overflow: "hidden",
    cursor: "pointer",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  printCardSelected: {
    borderColor: "#000",
    boxShadow: "0 0 0 1px #000",
  },
  printCardImage: {
    width: "100%",
    aspectRatio: "3 / 2",
    objectFit: "cover",
    display: "block",
  },
  printCardPlaceholder: {
    width: "100%",
    aspectRatio: "3 / 2",
    background: "#f3f4f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#9ca3af",
    fontSize: "0.75rem",
  },
  printCardInfo: {
    padding: "0.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  printCardTitle: {
    fontSize: "0.75rem",
    fontWeight: 500,
    color: "#111827",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  printCardTag: {
    fontSize: "0.625rem",
    color: "#6b7280",
  },
  printCardCheck: {
    position: "absolute",
    top: "0.5rem",
    right: "0.5rem",
    width: "1.5rem",
    height: "1.5rem",
    borderRadius: "50%",
    background: "#000",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.75rem",
    fontWeight: 700,
  },
  imageList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: "0.75rem",
    marginBottom: "0.75rem",
  },
  imageItem: {
    position: "relative",
    borderRadius: "0.5rem",
    overflow: "hidden",
    border: "1px solid #e5e7eb",
  },
  imageThumb: {
    width: "100%",
    aspectRatio: "4 / 3",
    objectFit: "cover",
    display: "block",
  },
  imageActions: {
    display: "flex",
    justifyContent: "center",
    gap: "0.25rem",
    padding: "0.375rem",
    background: "#f9fafb",
  },
  edu100Preview: {
    display: "flex",
    gap: "1rem",
    alignItems: "center",
  },
  edu100PreviewImage: {
    flex: "0 0 45%",
    aspectRatio: "4 / 3",
    borderRadius: "0.5rem",
    overflow: "hidden",
    background: "#f3f4f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  edu100PreviewText: {
    flex: 1,
    minWidth: 0,
  },
};
