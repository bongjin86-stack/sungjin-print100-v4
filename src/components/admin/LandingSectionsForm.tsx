import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "@/lib/supabase";
import { uploadImage } from "@/lib/supabase";

import { adminFormStyles as styles } from "./adminFormStyles";
import HeroForm from "./HeroForm";

type TabType =
  | "hero"
  | "order"
  | "about"
  | "products"
  | "works"
  | "edu100"
  | "cta";

const DEFAULT_SECTION_ORDER = [
  "hero",
  "partners",
  "service",
  "products",
  "works",
  "edu100",
  "about",
  "news",
  "cta",
];

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero (히어로)",
  partners: "Partners (파트너)",
  service: "Service (서비스 소개)",
  products: "Prints (인쇄 상품)",
  works: "Works (제작실적)",
  edu100: "Edu+100 (교재인쇄)",
  about: "About (회사 소개)",
  news: "News (뉴스)",
  cta: "CTA (문의하기)",
};

const HEADER_MENU_ITEMS = [
  { key: "/about/", label: "회사소개" },
  { key: "/services/", label: "서비스" },
  { key: "/works/", label: "Works" },
  { key: "/prints/", label: "Prints" },
  { key: "/edu100/", label: "Edu+100" },
  { key: "/news/", label: "공지사항" },
  { key: "/contact/", label: "문의하기" },
];

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
  landing_products_title: string;
  landing_products_subtitle: string;
  landing_products_link_text: string;
  landing_products_description: string;
  landing_products_image: string;
  landing_products_sub_items: string;
  // Works 섹션
  landing_works_title: string;
  landing_works_subtitle: string;
  landing_works_link_text: string;
  landing_works_description: string;
  landing_works_image: string;
  landing_works_sub_items: string;
  // EDU+100 섹션
  landing_edu100_images: string;
  landing_edu100_speed: string;
  landing_edu100_title: string;
  landing_edu100_subtitle: string;
  landing_edu100_text: string;
  landing_edu100_button_text: string;
  landing_edu100_button_link: string;
  // 섹션 순서
  landing_section_order: string;
  // 섹션 숨김
  landing_section_hidden: string;
  // 헤더 메뉴 숨김
  header_hidden_items: string;
}

interface ListItem {
  id: string;
  title: string;
  image: string | null;
  tag: string | null;
  is_published: boolean;
}

interface SubItem {
  type: "custom" | "product";
  image?: string;
  title?: string;
  text?: string;
  productId?: string;
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
  landing_products_title: "Products",
  landing_products_subtitle: "인쇄 상품",
  landing_products_link_text: "View all products",
  landing_products_description: "",
  landing_products_image: "",
  landing_products_sub_items: "[]",
  landing_works_title: "Works",
  landing_works_subtitle: "제작실적",
  landing_works_link_text: "전체보기",
  landing_works_description: "",
  landing_works_image: "",
  landing_works_sub_items: "[]",
  landing_edu100_images: "[]",
  landing_edu100_speed: "3000",
  landing_edu100_title: "Edu+100",
  landing_edu100_subtitle: "교재인쇄 서비스",
  landing_edu100_text:
    "학원, 학교, 기업교육에 최적화된 교재 인쇄 서비스입니다.\n다양한 표지 디자인 갤러리에서 원하는 디자인을 선택하고,\n간편하게 주문할 수 있습니다.",
  landing_edu100_button_text: "자세히 보기",
  landing_edu100_button_link: "/edu100",
  landing_section_order: JSON.stringify(DEFAULT_SECTION_ORDER),
  landing_section_hidden: "[]",
  header_hidden_items: "[]",
};

export default function LandingSectionsForm() {
  const [activeTab, setActiveTab] = useState<TabType>("order");
  const [formData, setFormData] = useState<FormData>(defaultValues);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Products/Works 이미지 업로드 상태
  const [sectionUploading, setSectionUploading] = useState(false);
  const productsMainFileRef = useRef<HTMLInputElement>(null);
  const worksMainFileRef = useRef<HTMLInputElement>(null);
  const subItemFileRef = useRef<HTMLInputElement>(null);

  // 서브 아이템 상태
  const [productsSubItems, setProductsSubItems] = useState<SubItem[]>([]);
  const [worksSubItems, setWorksSubItems] = useState<SubItem[]>([]);

  // DB 목록 (상품/작품 선택용)
  const [allPrints, setAllPrints] = useState<ListItem[]>([]);
  const [allWorks, setAllWorks] = useState<ListItem[]>([]);

  // 섹션 순서 상태
  const [sectionOrder, setSectionOrder] = useState<string[]>(
    DEFAULT_SECTION_ORDER
  );

  // 섹션 숨김 상태
  const [sectionHidden, setSectionHidden] = useState<string[]>([]);

  // 헤더 메뉴 숨김 상태
  const [headerHidden, setHeaderHidden] = useState<string[]>([]);

  // EDU+100 이미지 업로드 상태
  const [edu100Images, setEdu100Images] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSettings();
    loadPrints();
    loadWorks();
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
          landing_products_description:
            configMap.landing_products_description ||
            defaultValues.landing_products_description,
          landing_products_image:
            configMap.landing_products_image ||
            defaultValues.landing_products_image,
          landing_products_sub_items:
            configMap.landing_products_sub_items ||
            defaultValues.landing_products_sub_items,
          landing_works_title:
            configMap.landing_works_title || defaultValues.landing_works_title,
          landing_works_subtitle:
            configMap.landing_works_subtitle ||
            defaultValues.landing_works_subtitle,
          landing_works_link_text:
            configMap.landing_works_link_text ||
            defaultValues.landing_works_link_text,
          landing_works_description:
            configMap.landing_works_description ||
            defaultValues.landing_works_description,
          landing_works_image:
            configMap.landing_works_image ||
            defaultValues.landing_works_image,
          landing_works_sub_items:
            configMap.landing_works_sub_items ||
            defaultValues.landing_works_sub_items,
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
          landing_section_order:
            configMap.landing_section_order ||
            defaultValues.landing_section_order,
          landing_section_hidden:
            configMap.landing_section_hidden ||
            defaultValues.landing_section_hidden,
          header_hidden_items:
            configMap.header_hidden_items || defaultValues.header_hidden_items,
          landing_products_title:
            configMap.landing_products_title ||
            defaultValues.landing_products_title,
          landing_products_subtitle:
            configMap.landing_products_subtitle ||
            defaultValues.landing_products_subtitle,
          landing_products_link_text:
            configMap.landing_products_link_text ||
            defaultValues.landing_products_link_text,
        };

        setFormData(newFormData);

        try {
          const items = JSON.parse(
            newFormData.landing_products_sub_items || "[]"
          );
          setProductsSubItems(Array.isArray(items) ? items : []);
        } catch {
          setProductsSubItems([]);
        }

        try {
          const items = JSON.parse(
            newFormData.landing_works_sub_items || "[]"
          );
          setWorksSubItems(Array.isArray(items) ? items : []);
        } catch {
          setWorksSubItems([]);
        }

        try {
          const imgs = JSON.parse(newFormData.landing_edu100_images || "[]");
          setEdu100Images(Array.isArray(imgs) ? imgs : []);
        } catch {
          setEdu100Images([]);
        }

        try {
          const order = JSON.parse(
            newFormData.landing_section_order ||
              JSON.stringify(DEFAULT_SECTION_ORDER)
          );
          setSectionOrder(Array.isArray(order) ? order : DEFAULT_SECTION_ORDER);
        } catch {
          setSectionOrder(DEFAULT_SECTION_ORDER);
        }

        try {
          const hidden = JSON.parse(newFormData.landing_section_hidden || "[]");
          setSectionHidden(Array.isArray(hidden) ? hidden : []);
        } catch {
          setSectionHidden([]);
        }

        try {
          const hdrHidden = JSON.parse(newFormData.header_hidden_items || "[]");
          setHeaderHidden(Array.isArray(hdrHidden) ? hdrHidden : []);
        } catch {
          setHeaderHidden([]);
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

  const loadWorks = async () => {
    try {
      const { data, error } = await supabase
        .from("works")
        .select("id, title, image, tag, is_published")
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAllWorks(data || []);
    } catch (error) {
      console.error("works 로드 실패:", error);
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

  const purgeLandingCache = async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/purge-cache", { method: "POST" });
      const data = await res.json();
      return data.success === true;
    } catch {
      return false;
    }
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
        const subItemsJson = JSON.stringify(productsSubItems);
        const now = new Date().toISOString();
        const updates = [
          "landing_products_title",
          "landing_products_subtitle",
          "landing_products_link_text",
          "landing_products_description",
          "landing_products_image",
        ].map((key) => ({
          key,
          value: formData[key as keyof FormData],
          updated_at: now,
        }));
        updates.push({
          key: "landing_products_sub_items",
          value: subItemsJson,
          updated_at: now,
        });
        const { error } = await supabase
          .from("site_settings")
          .upsert(updates, { onConflict: "key" });

        if (error) throw error;
        setFormData((prev) => ({
          ...prev,
          landing_products_sub_items: subItemsJson,
        }));
        const purged = await purgeLandingCache();
        setMessage({
          type: "success",
          text: purged
            ? "저장되었습니다."
            : "저장되었습니다. (캐시 반영에 최대 1시간 소요될 수 있습니다)",
        });
        setTimeout(() => setMessage(null), 5000);
        setSaving(false);
        return;
      } else if (activeTab === "works") {
        const subItemsJson = JSON.stringify(worksSubItems);
        const now = new Date().toISOString();
        const updates = [
          "landing_works_title",
          "landing_works_subtitle",
          "landing_works_link_text",
          "landing_works_description",
          "landing_works_image",
        ].map((key) => ({
          key,
          value: formData[key as keyof FormData],
          updated_at: now,
        }));
        updates.push({
          key: "landing_works_sub_items",
          value: subItemsJson,
          updated_at: now,
        });
        const { error } = await supabase
          .from("site_settings")
          .upsert(updates, { onConflict: "key" });

        if (error) throw error;
        setFormData((prev) => ({
          ...prev,
          landing_works_sub_items: subItemsJson,
        }));
        const purged = await purgeLandingCache();
        setMessage({
          type: "success",
          text: purged
            ? "저장되었습니다."
            : "저장되었습니다. (캐시 반영에 최대 1시간 소요될 수 있습니다)",
        });
        setTimeout(() => setMessage(null), 5000);
        setSaving(false);
        return;
      } else if (activeTab === "order") {
        const orderJson = JSON.stringify(sectionOrder);
        const hiddenJson = JSON.stringify(sectionHidden);
        const headerHiddenJson = JSON.stringify(headerHidden);
        const now = new Date().toISOString();
        const updates = [
          { key: "landing_section_order", value: orderJson, updated_at: now },
          { key: "landing_section_hidden", value: hiddenJson, updated_at: now },
          {
            key: "header_hidden_items",
            value: headerHiddenJson,
            updated_at: now,
          },
        ];
        const { error } = await supabase
          .from("site_settings")
          .upsert(updates, { onConflict: "key" });

        if (error) throw error;
        setFormData((prev) => ({
          ...prev,
          landing_section_order: orderJson,
          landing_section_hidden: hiddenJson,
          header_hidden_items: headerHiddenJson,
        }));
        const purged = await purgeLandingCache();
        setMessage({
          type: "success",
          text: purged
            ? "저장되었습니다."
            : "저장되었습니다. (캐시 반영에 최대 1시간 소요될 수 있습니다)",
        });
        setTimeout(() => setMessage(null), 5000);
        setSaving(false);
        return;
      } else if (activeTab === "edu100") {
        const imgsJson = JSON.stringify(edu100Images);
        const now = new Date().toISOString();
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
            updated_at: now,
          })),
          { key: "landing_edu100_images", value: imgsJson, updated_at: now },
        ];
        const { error } = await supabase
          .from("site_settings")
          .upsert(updates, { onConflict: "key" });

        if (error) throw error;
        setFormData((prev) => ({ ...prev, landing_edu100_images: imgsJson }));
        const purged = await purgeLandingCache();
        setMessage({
          type: "success",
          text: purged
            ? "저장되었습니다."
            : "저장되었습니다. (캐시 반영에 최대 1시간 소요될 수 있습니다)",
        });
        setTimeout(() => setMessage(null), 5000);
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

      const purged = await purgeLandingCache();
      setMessage({
        type: "success",
        text: purged
          ? "저장되었습니다."
          : "저장되었습니다. (캐시 반영에 최대 1시간 소요될 수 있습니다)",
      });
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      console.error("저장 실패:", error);
      setMessage({ type: "error", text: "저장에 실패했습니다." });
    } finally {
      setSaving(false);
    }
  };

  // ─── 메인 이미지 업로드 핸들러 ───
  const handleMainImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "landing_products_image" | "landing_works_image",
    bucket: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) return;

    setSectionUploading(true);
    try {
      const publicUrl = await uploadImage(file, bucket);
      setFormData((prev) => ({ ...prev, [field]: publicUrl }));
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setSectionUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  // ─── 서브 아이템 핸들러 (공용) ───
  const addSubItem = useCallback(
    (
      setter: React.Dispatch<React.SetStateAction<SubItem[]>>,
      type: "custom" | "product"
    ) => {
      setter((prev) => [
        ...prev,
        type === "custom"
          ? { type: "custom", image: "", title: "", text: "" }
          : { type: "product", productId: "" },
      ]);
    },
    []
  );

  const removeSubItem = useCallback(
    (setter: React.Dispatch<React.SetStateAction<SubItem[]>>, index: number) => {
      setter((prev) => prev.filter((_, i) => i !== index));
    },
    []
  );

  const moveSubItem = useCallback(
    (
      setter: React.Dispatch<React.SetStateAction<SubItem[]>>,
      index: number,
      direction: -1 | 1
    ) => {
      setter((prev) => {
        const newArr = [...prev];
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= newArr.length) return prev;
        [newArr[index], newArr[newIndex]] = [newArr[newIndex], newArr[index]];
        return newArr;
      });
    },
    []
  );

  const updateSubItem = useCallback(
    (
      setter: React.Dispatch<React.SetStateAction<SubItem[]>>,
      index: number,
      field: string,
      value: string
    ) => {
      setter((prev) =>
        prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
      );
    },
    []
  );

  const handleSubItemImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<SubItem[]>>,
    index: number,
    bucket: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) return;

    setSectionUploading(true);
    try {
      const publicUrl = await uploadImage(file, bucket);
      setter((prev) =>
        prev.map((item, i) => (i === index ? { ...item, image: publicUrl } : item))
      );
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setSectionUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  // ─── 섹션 순서 핸들러 ───
  const moveSection = useCallback((index: number, direction: -1 | 1) => {
    setSectionOrder((prev) => {
      const newArr = [...prev];
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= newArr.length) return prev;
      [newArr[index], newArr[newIndex]] = [newArr[newIndex], newArr[index]];
      return newArr;
    });
  }, []);

  const resetSectionOrder = useCallback(() => {
    setSectionOrder(DEFAULT_SECTION_ORDER);
    setSectionHidden([]);
  }, []);

  const toggleSectionHidden = useCallback((key: string) => {
    setSectionHidden((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  const toggleHeaderHidden = useCallback((path: string) => {
    setHeaderHidden((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
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

  // ─── 서브 아이템 에디터 렌더 (공용) ───
  const renderSubItemsEditor = (
    items: SubItem[],
    setter: React.Dispatch<React.SetStateAction<SubItem[]>>,
    catalog: ListItem[],
    catalogLabel: string,
    bucket: string
  ) => (
    <div style={styles.formGroup}>
      <label style={styles.label}>
        서브 아이템 ({items.length}개)
      </label>
      <p style={styles.hint}>
        이미지+텍스트 또는 {catalogLabel}을(를) 연결할 수 있습니다.
      </p>

      {items.map((item, index) => (
        <div key={index} style={localStyles.subItemCard}>
          <div style={localStyles.subItemHeader}>
            <span style={localStyles.subItemIndex}>#{index + 1}</span>
            <select
              value={item.type}
              onChange={(e) =>
                updateSubItem(setter, index, "type", e.target.value)
              }
              style={{ ...styles.select, flex: 1 }}
            >
              <option value="custom">이미지 + 텍스트</option>
              <option value="product">{catalogLabel} 연결</option>
            </select>
            <div style={localStyles.selectedActions}>
              <button
                type="button"
                onClick={() => moveSubItem(setter, index, -1)}
                disabled={index === 0}
                style={localStyles.moveBtn}
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => moveSubItem(setter, index, 1)}
                disabled={index === items.length - 1}
                style={localStyles.moveBtn}
              >
                ▼
              </button>
              <button
                type="button"
                onClick={() => removeSubItem(setter, index)}
                style={localStyles.removeBtn}
              >
                ✕
              </button>
            </div>
          </div>

          {item.type === "custom" ? (
            <div style={localStyles.subItemBody}>
              {item.image && (
                <img
                  src={item.image}
                  alt=""
                  style={localStyles.productsSubImageThumb}
                />
              )}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                <input
                  type="text"
                  value={item.title || ""}
                  onChange={(e) =>
                    updateSubItem(setter, index, "title", e.target.value)
                  }
                  style={styles.input}
                  placeholder="제목"
                />
                <input
                  type="text"
                  value={item.text || ""}
                  onChange={(e) =>
                    updateSubItem(setter, index, "text", e.target.value)
                  }
                  style={styles.input}
                  placeholder="설명"
                />
                <label style={localStyles.subItemUploadBtn}>
                  {item.image ? "이미지 변경" : "+ 이미지"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleSubItemImageUpload(e, setter, index, bucket)
                    }
                    style={{ display: "none" }}
                  />
                </label>
              </div>
            </div>
          ) : (
            <div style={localStyles.subItemBody}>
              <select
                value={item.productId || ""}
                onChange={(e) =>
                  updateSubItem(setter, index, "productId", e.target.value)
                }
                style={styles.select}
              >
                <option value="">-- {catalogLabel} 선택 --</option>
                {catalog.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} {p.tag ? `(${p.tag})` : ""}
                  </option>
                ))}
              </select>
              {item.productId && (
                (() => {
                  const found = catalog.find((p) => p.id === item.productId);
                  return found?.image ? (
                    <img
                      src={found.image}
                      alt={found.title}
                      style={localStyles.productsSubImageThumb}
                    />
                  ) : null;
                })()
              )}
            </div>
          )}
        </div>
      ))}

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
        <button
          type="button"
          onClick={() => addSubItem(setter, "custom")}
          style={styles.addButton}
        >
          + 이미지/텍스트 추가
        </button>
        <button
          type="button"
          onClick={() => addSubItem(setter, "product")}
          style={styles.addButton}
        >
          + {catalogLabel} 연결
        </button>
      </div>
    </div>
  );

  return (
    <div style={styles.form}>
      {/* 탭 네비게이션 */}
      <div style={localStyles.tabs}>
        <button
          type="button"
          onClick={() => setActiveTab("order")}
          style={{
            ...localStyles.tab,
            ...localStyles.tabOrder,
            ...(activeTab === "order" ? localStyles.tabActive : {}),
          }}
        >
          순서/노출
        </button>
        <span style={localStyles.tabDivider} />
        {(
          [
            ["hero", "Hero"],
            ["products", "Prints"],
            ["works", "Works"],
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

      {/* 섹션 순서 */}
      {activeTab === "order" && (
        <div style={styles.formGrid}>
          <div style={localStyles.sectionHeader}>
            <h3 style={localStyles.sectionTitle}>섹션 순서 관리</h3>
            <p style={localStyles.sectionDesc}>
              메인 페이지에 표시되는 섹션의 순서를 변경합니다. 위/아래 버튼으로
              순서를 조정하세요.
            </p>
          </div>

          <div style={localStyles.orderList}>
            {sectionOrder.map((key, index) => {
              const isHidden = sectionHidden.includes(key);
              return (
                <div
                  key={key}
                  style={{
                    ...localStyles.orderItem,
                    ...(isHidden ? { opacity: 0.5 } : {}),
                  }}
                >
                  <span style={localStyles.orderIndex}>{index + 1}</span>
                  <span
                    style={{
                      ...localStyles.orderLabel,
                      ...(isHidden
                        ? { textDecoration: "line-through", color: "#9ca3af" }
                        : {}),
                    }}
                  >
                    {SECTION_LABELS[key] || key}
                  </span>
                  <div style={localStyles.selectedActions}>
                    <button
                      type="button"
                      onClick={() => moveSection(index, -1)}
                      disabled={index === 0}
                      style={localStyles.moveBtn}
                      title="위로"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSection(index, 1)}
                      disabled={index === sectionOrder.length - 1}
                      style={localStyles.moveBtn}
                      title="아래로"
                    >
                      ▼
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSectionHidden(key)}
                    style={{
                      ...localStyles.visibilityBtn,
                      ...(isHidden
                        ? localStyles.visibilityBtnHidden
                        : localStyles.visibilityBtnVisible),
                    }}
                    title={isHidden ? "노출하기" : "숨기기"}
                  >
                    {isHidden ? "비노출" : "노출"}
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={resetSectionOrder}
            style={{
              ...localStyles.moveBtn,
              padding: "0.5rem 1rem",
              fontSize: "0.8125rem",
              marginTop: "0.5rem",
            }}
          >
            기본 순서로 초기화
          </button>

          <div style={{ ...localStyles.sectionHeader, marginTop: "2rem" }}>
            <h3 style={localStyles.sectionTitle}>헤더 메뉴 관리</h3>
            <p style={localStyles.sectionDesc}>
              헤더 내비게이션에 표시할 메뉴를 설정합니다. 비노출로 설정하면
              헤더에서 해당 메뉴가 숨겨집니다.
            </p>
          </div>

          <div style={localStyles.orderList}>
            {HEADER_MENU_ITEMS.map((item) => {
              const isHidden = headerHidden.includes(item.key);
              return (
                <div
                  key={item.key}
                  style={{
                    ...localStyles.orderItem,
                    ...(isHidden ? { opacity: 0.5 } : {}),
                  }}
                >
                  <span
                    style={{
                      ...localStyles.orderLabel,
                      ...(isHidden
                        ? { textDecoration: "line-through", color: "#9ca3af" }
                        : {}),
                    }}
                  >
                    {item.label}
                  </span>
                  <span style={localStyles.headerMenuPath}>{item.key}</span>
                  <button
                    type="button"
                    onClick={() => toggleHeaderHidden(item.key)}
                    style={{
                      ...localStyles.visibilityBtn,
                      ...(isHidden
                        ? localStyles.visibilityBtnHidden
                        : localStyles.visibilityBtnVisible),
                    }}
                    title={isHidden ? "노출하기" : "숨기기"}
                  >
                    {isHidden ? "비노출" : "노출"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Products 섹션 */}
      {activeTab === "products" && (
        <div style={styles.formGrid}>
          <div style={localStyles.sectionHeader}>
            <h3 style={localStyles.sectionTitle}>Prints 섹션</h3>
            <p style={localStyles.sectionDesc}>
              메인 페이지의 인쇄 상품 섹션을 편집합니다. Library 스타일 레이아웃.
            </p>
            <a href="/admin/prints" style={localStyles.crossLink}>
              Prints 상품 목록 관리 &rarr;
            </a>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>섹션 제목</label>
              <input
                type="text"
                name="landing_products_title"
                value={formData.landing_products_title}
                onChange={handleChange}
                style={styles.input}
                placeholder="Products"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>부제목 (라벨)</label>
              <input
                type="text"
                name="landing_products_subtitle"
                value={formData.landing_products_subtitle}
                onChange={handleChange}
                style={styles.input}
                placeholder="인쇄 상품"
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>링크 텍스트</label>
            <input
              type="text"
              name="landing_products_link_text"
              value={formData.landing_products_link_text}
              onChange={handleChange}
              style={styles.input}
              placeholder="View all products"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>설명 텍스트</label>
            <textarea
              name="landing_products_description"
              value={formData.landing_products_description}
              onChange={handleChange}
              rows={3}
              style={styles.textarea}
              placeholder="사이드바에 표시될 설명 텍스트"
            />
            <p style={styles.hint}>
              데스크탑에서 왼쪽 사이드바에 표시됩니다. 모바일에서는 숨겨집니다.
            </p>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>메인 이미지</label>
            {formData.landing_products_image && (
              <div style={localStyles.productsImagePreview}>
                <img
                  src={formData.landing_products_image}
                  alt="메인 이미지 미리보기"
                  style={localStyles.productsImageThumb}
                />
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      landing_products_image: "",
                    }))
                  }
                  style={localStyles.removeBtn}
                  title="삭제"
                >
                  ✕
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => productsMainFileRef.current?.click()}
              disabled={sectionUploading}
              style={styles.addButton}
            >
              {sectionUploading
                ? "업로드 중..."
                : formData.landing_products_image
                  ? "이미지 변경"
                  : "+ 이미지 업로드"}
            </button>
            <input
              ref={productsMainFileRef}
              type="file"
              accept="image/*"
              onChange={(e) =>
                handleMainImageUpload(e, "landing_products_image", "landing-products")
              }
              style={{ display: "none" }}
            />
            <p style={styles.hint}>
              히어로와 비슷한 와이드 비율(2.3:1)로 표시됩니다.
            </p>
          </div>

          {renderSubItemsEditor(
            productsSubItems,
            setProductsSubItems,
            allPrints,
            "상품",
            "landing-products"
          )}
        </div>
      )}

      {/* Works 섹션 */}
      {activeTab === "works" && (
        <div style={styles.formGrid}>
          <div style={localStyles.sectionHeader}>
            <h3 style={localStyles.sectionTitle}>Works 섹션</h3>
            <p style={localStyles.sectionDesc}>
              메인 페이지의 제작실적 섹션을 편집합니다. 오른쪽 사이드바 + 왼쪽 콘텐츠 구조입니다.
            </p>
            <a href="/admin/works" style={localStyles.crossLink}>
              Works 작품 목록 관리 &rarr;
            </a>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>제목</label>
              <input
                type="text"
                name="landing_works_title"
                value={formData.landing_works_title}
                onChange={handleChange}
                style={styles.input}
                placeholder="Works"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>부제목</label>
              <input
                type="text"
                name="landing_works_subtitle"
                value={formData.landing_works_subtitle}
                onChange={handleChange}
                style={styles.input}
                placeholder="제작실적"
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>링크 텍스트</label>
            <input
              type="text"
              name="landing_works_link_text"
              value={formData.landing_works_link_text}
              onChange={handleChange}
              style={styles.input}
              placeholder="전체보기"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>설명 텍스트</label>
            <textarea
              name="landing_works_description"
              value={formData.landing_works_description}
              onChange={handleChange}
              rows={3}
              style={styles.textarea}
              placeholder="사이드바에 표시될 설명 텍스트"
            />
            <p style={styles.hint}>
              데스크탑에서 오른쪽 사이드바에 표시됩니다. 모바일에서는 숨겨집니다.
            </p>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>메인 이미지</label>
            {formData.landing_works_image && (
              <div style={localStyles.productsImagePreview}>
                <img
                  src={formData.landing_works_image}
                  alt="메인 이미지 미리보기"
                  style={localStyles.productsImageThumb}
                />
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      landing_works_image: "",
                    }))
                  }
                  style={localStyles.removeBtn}
                  title="삭제"
                >
                  ✕
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => worksMainFileRef.current?.click()}
              disabled={sectionUploading}
              style={styles.addButton}
            >
              {sectionUploading
                ? "업로드 중..."
                : formData.landing_works_image
                  ? "이미지 변경"
                  : "+ 이미지 업로드"}
            </button>
            <input
              ref={worksMainFileRef}
              type="file"
              accept="image/*"
              onChange={(e) =>
                handleMainImageUpload(e, "landing_works_image", "landing-works")
              }
              style={{ display: "none" }}
            />
            <p style={styles.hint}>
              히어로와 비슷한 와이드 비율(2.3:1)로 표시됩니다.
            </p>
          </div>

          {renderSubItemsEditor(
            worksSubItems,
            setWorksSubItems,
            allWorks,
            "작품",
            "landing-works"
          )}
        </div>
      )}

      {/* EDU+100 섹션 */}
      {activeTab === "edu100" && (
        <div style={styles.formGrid}>
          <div style={localStyles.sectionHeader}>
            <h3 style={localStyles.sectionTitle}>Edu+100 섹션</h3>
            <p style={localStyles.sectionDesc}>
              메인 페이지의 Edu+100 소개 섹션을 편집합니다. 왼쪽 이미지 캐러셀과
              오른쪽 텍스트로 구성됩니다.
            </p>
            <a href="/admin/edu100" style={localStyles.crossLink}>
              Edu+100 표지/실적 관리 &rarr;
            </a>
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
                <div style={{ marginTop: "0.75rem" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.375rem 1rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "9999px",
                      fontSize: "0.8125rem",
                      color: "#374151",
                      background: "transparent",
                    }}
                  >
                    {formData.landing_edu100_button_text || "자세히 보기"}
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </span>
                  {formData.landing_edu100_button_link && (
                    <span
                      style={{
                        display: "block",
                        marginTop: "0.25rem",
                        fontSize: "0.6875rem",
                        color: "#9ca3af",
                      }}
                    >
                      링크: {formData.landing_edu100_button_link}
                    </span>
                  )}
                </div>
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
              메인 페이지의 회사 소개 섹션 텍스트를 편집합니다.
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
              메인 페이지 하단의 문의하기 섹션을 편집합니다.
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
  tabOrder: {
    fontWeight: 600,
  },
  tabDivider: {
    width: "1px",
    alignSelf: "stretch",
    margin: "0.5rem 0.25rem",
    background: "#d1d5db",
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
  crossLink: {
    display: "inline-block",
    marginTop: "0.5rem",
    fontSize: "0.8125rem",
    fontWeight: 500,
    color: "#0369a1",
    textDecoration: "none",
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
  orderList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    padding: "0.75rem",
    background: "#f9fafb",
    borderRadius: "0.5rem",
    border: "1px solid #e5e7eb",
  },
  orderItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.625rem 0.75rem",
    background: "white",
    borderRadius: "0.375rem",
    border: "1px solid #e5e7eb",
  },
  orderIndex: {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#9ca3af",
    minWidth: "1.5rem",
    textAlign: "center",
  },
  orderLabel: {
    flex: 1,
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "#111827",
  },
  headerMenuPath: {
    fontSize: "0.75rem",
    color: "#9ca3af",
    fontFamily: "monospace",
  },
  visibilityBtn: {
    marginLeft: "auto",
    padding: "0.25rem 0.625rem",
    border: "1px solid",
    borderRadius: "9999px",
    fontSize: "0.6875rem",
    fontWeight: 500,
    cursor: "pointer",
    flexShrink: 0,
  },
  visibilityBtnVisible: {
    background: "#ecfdf5",
    borderColor: "#6ee7b7",
    color: "#059669",
  },
  visibilityBtnHidden: {
    background: "#fef2f2",
    borderColor: "#fecaca",
    color: "#dc2626",
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
  subItemCard: {
    padding: "0.75rem",
    background: "#f9fafb",
    borderRadius: "0.5rem",
    border: "1px solid #e5e7eb",
    marginBottom: "0.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  subItemHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  subItemIndex: {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#9ca3af",
    minWidth: "2rem",
  },
  subItemBody: {
    display: "flex",
    alignItems: "start",
    gap: "0.75rem",
  },
  subItemUploadBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "0.25rem 0.75rem",
    background: "white",
    border: "1px solid #d1d5db",
    borderRadius: "0.375rem",
    fontSize: "0.75rem",
    color: "#374151",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  productsImagePreview: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.5rem",
    background: "#f9fafb",
    borderRadius: "0.5rem",
    border: "1px solid #e5e7eb",
    marginBottom: "0.5rem",
  },
  productsImageThumb: {
    width: "100%",
    maxWidth: "320px",
    aspectRatio: "2.3 / 1",
    objectFit: "cover",
    borderRadius: "0.375rem",
    display: "block",
  },
  productsSubImageThumb: {
    width: "120px",
    aspectRatio: "4 / 3",
    objectFit: "cover",
    borderRadius: "0.375rem",
    display: "block",
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
