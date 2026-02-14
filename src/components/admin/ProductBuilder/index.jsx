// ============================================================
// AdminBuilder.jsx - 블록 시스템 업그레이드 v2
// - 스프링제본: PP + 표지인쇄 분리 + 연동
// - 내지 레이어 블록 (중철/낱장)
// - 블록 설정: 선택/필수, 고정, 숨김, 기본값
// ============================================================

import { useEffect, useMemo, useRef, useState } from "react";

import Sortable from "sortablejs";

import BlockNoteEditor from "@/components/admin/BlockNoteEditor";
// PreviewBlock은 shared 컴포넌트 사용 (ProductView와 동일)
import { PreviewBlock } from "@/components/shared/PreviewBlock";
import {
  checkLinkRules,
  checkThickness,
  extractDefaultsFromBlock,
  extractDefaultsFromBlocks,
  getFoldUpdate,
} from "@/lib/blockDefaults";
import {
  BLOCK_TYPES,
  DB,
  getDefaultConfig,
  getDefaultContent,
  getDefaultCustomer,
  inferProductType,
  TEMPLATES as DEFAULT_TEMPLATES,
} from "@/lib/builderData";
import { getIconComponent, ICON_LIST } from "@/lib/highlightIcons";
import { supabase, uploadImage } from "@/lib/supabase";

import BlockItem, { getBlockSummary } from "./BlockItem";
import BlockLibraryModal from "./BlockLibraryModal";
import BlockSettings from "./BlockSettings";
import { useDbData } from "./hooks/useDbData";
import { usePriceCalculation } from "./hooks/usePriceCalculation";
import PriceDisplay from "./PriceDisplay";
import ProductEditor from "./ProductEditor";
import TemplateSelector from "./TemplateSelector";

// ProductView와 동일한 스타일 사용
import "@/components/product/ProductView.css";

// BlockNote JSON hint를 렌더링하는 헬퍼 (ProductView.css의 pv-fs-card-hint 사용)
function renderBuilderHint(hint) {
  if (!hint) return null;
  let parsed = hint;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = null;
    }
  }
  if (Array.isArray(parsed)) {
    const items = parsed
      .map((block) => {
        const textParts = block.content
          ?.filter((c) => c.type === "text" && c.text)
          .map((c, i) => {
            let el = c.text;
            const s = c.styles || {};
            if (s.bold) el = <strong key={`b${i}`}>{el}</strong>;
            if (s.italic) el = <em key={`i${i}`}>{el}</em>;
            if (s.fontSize)
              el = (
                <span key={`fs${i}`} style={{ fontSize: s.fontSize }}>
                  {el}
                </span>
              );
            return <span key={i}>{el}</span>;
          });
        if (!textParts?.length) return null;
        if (block.type === "bulletListItem")
          return <li key={block.id}>{textParts}</li>;
        if (block.type === "heading") {
          const Tag = `h${block.props?.level || 3}`;
          return <Tag key={block.id}>{textParts}</Tag>;
        }
        return <p key={block.id}>{textParts}</p>;
      })
      .filter(Boolean);
    if (items.length > 0) {
      const hasList = parsed.some(
        (b) => b.type === "bulletListItem" || b.type === "numberedListItem"
      );
      return (
        <div className="pv-fs-card-hint">
          {hasList ? <ul>{items}</ul> : <div>{items}</div>}
        </div>
      );
    }
  }
  // 폴백: plain text
  if (typeof hint === "string" && hint.trim()) {
    return <p className="pv-fs-card-hint">{hint}</p>;
  }
  return null;
}

export default function AdminBuilder() {
  const urlParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const urlProductId = urlParams?.get("id") || null;
  const isNewProduct = urlParams?.get("new") === "true";

  // 템플릿 목록 상태
  const [templates, setTemplates] = useState(() => {
    const saved = localStorage.getItem("sungjin_templates_v4");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("템플릿 로드 실패:", e);
      }
    }
    return Object.entries(DEFAULT_TEMPLATES).map(([key, template], idx) => ({
      id: key,
      order: idx,
      icon:
        key === "flyer"
          ? "📄"
          : key === "perfect"
            ? "📚"
            : key === "saddle"
              ? "📎"
              : "🔗",
      ...template,
      content: getDefaultContent(template.name),
    }));
  });

  // 새 상품 생성 헬퍼 (기반 템플릿 블록 복사, id는 새로)
  const createNewProduct = (baseTemplate) => {
    const newId = `product_${Date.now()}`;
    if (baseTemplate) {
      return {
        ...baseTemplate,
        id: newId,
        order: templates.length,
        name: "새 상품",
        content: { ...baseTemplate.content, title: "" },
        blocks: baseTemplate.blocks.map((b) => ({
          ...b,
          config: { ...b.config },
        })),
      };
    }
    return {
      id: newId,
      order: templates.length,
      icon: "📄",
      name: "새 상품",
      blocks: [],
      content: getDefaultContent("새 상품"),
    };
  };

  // URL에서 id가 있으면 해당 템플릿으로, new=true면 새 상품, 없으면 첫 번째
  const [currentTemplateId, setCurrentTemplateId] = useState(() => {
    if (isNewProduct) {
      return templates[0]?.id || null; // 첫 템플릿을 기반으로 선택
    }
    if (urlProductId) {
      const saved = localStorage.getItem("sungjin_templates_v4");
      if (saved) {
        const savedTemplates = JSON.parse(saved);
        const found = savedTemplates.find((t) => t.id === urlProductId);
        if (found) return urlProductId;
      }
    }
    return templates[0]?.id || "flyer";
  });

  const [currentProduct, setCurrentProduct] = useState(() => {
    // new=true → 첫 번째 템플릿 기반 새 상품 (id는 새로 생성)
    if (isNewProduct) {
      return createNewProduct(templates[0]);
    }
    // URL에서 id가 있으면 해당 템플릿 로드
    if (urlProductId) {
      const saved = localStorage.getItem("sungjin_templates_v4");
      if (saved) {
        const savedTemplates = JSON.parse(saved);
        const found = savedTemplates.find((t) => t.id === urlProductId);
        if (found) {
          return {
            ...found,
            blocks: found.blocks.map((b) => ({
              ...b,
              config: { ...b.config },
            })),
          };
        }
      }
    }
    // 기본값: 첫 번째 템플릿
    const template = templates[0];
    return template
      ? {
          ...template,
          blocks: template.blocks.map((b) => ({
            ...b,
            config: { ...b.config },
          })),
        }
      : null;
  });

  const [customer, setCustomer] = useState(getDefaultCustomer());
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [labelInput, setLabelInput] = useState("");
  const [descInput, setDescInput] = useState("");
  const [newQtyInput, setNewQtyInput] = useState("");
  const [showBlockLibrary, setShowBlockLibrary] = useState(false);
  const [showOutsourcedLibrary, setShowOutsourcedLibrary] = useState(false);

  // 템플릿 편집 상태
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [editingTemplateName, setEditingTemplateName] = useState("");

  // DB 데이터 로드 (용지, 평량, 사이즈)
  const { dbPapers, dbPapersList, dbWeights, dbSizes, dbLoaded } = useDbData();

  // 상품 이미지 업로드 상태
  const [imageUploading, setImageUploading] = useState(false);

  // 서버 가격 계산
  const { serverPrice, qtyPrices } = usePriceCalculation(
    customer,
    currentProduct,
    currentTemplateId,
    dbLoaded
  );

  const blockListRef = useRef(null);
  const templateListRef = useRef(null);
  const mainImageRef = useRef(null);
  const thumbImageRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
  ];

  // localStorage 저장
  useEffect(() => {
    localStorage.setItem("sungjin_templates_v4", JSON.stringify(templates));
  }, [templates]);

  // URL 파라미터 변경 시 해당 상품 로드 (DB 우선)
  // dbLoaded 플래그로 이미 로드된 경우 스킵
  const [dbProductLoaded, setDbProductLoaded] = useState(false);

  useEffect(() => {
    async function loadProductFromDB() {
      if (!urlProductId) {
        return;
      }

      if (dbProductLoaded) {
        return;
      }

      // 1. DB에서 먼저 상품 로드 시도 (실제 저장된 상품)
      try {
        const { data: product, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", urlProductId)
          .single();

        if (error || !product) {
          console.warn(
            "[Builder] DB에서 상품을 찾을 수 없음, localStorage fallback 시도:",
            urlProductId
          );
          // 2. DB에 없으면 localStorage에서 찾기 (새 상품 작업 중일 수 있음)
          const localFound = templates.find((t) => t.id === urlProductId);
          if (localFound) {
            setCurrentTemplateId(urlProductId);
            setCurrentProduct({
              ...localFound,
              blocks: localFound.blocks.map((b) => ({
                ...b,
                config: { ...b.config },
              })),
            });
            setCustomer(extractDefaultsFromBlocks(localFound.blocks));
            setDbProductLoaded(true);
          }
          return;
        }

        // JSON 파싱 헬퍼 (문자열이면 파싱, 객체면 그대로)
        const parseJson = (val, fallback) => {
          if (!val) return fallback;
          if (typeof val === "object") return val;
          try {
            return JSON.parse(val);
          } catch {
            return fallback;
          }
        };

        const parsedContent = parseJson(product.content, {});
        const parsedBlocks = parseJson(product.blocks, []);
        // DB 상품 데이터를 빌더 형식으로 변환
        const builderProduct = {
          id: product.id,
          name: product.name,
          product_type: product.product_type,
          outsourced_config: parsedContent.outsourced_config || null,
          blocks: parsedBlocks,
          content: {
            title: parsedContent.title || product.name,
            description: parsedContent.description || product.description || "",
            mainImage: parsedContent.mainImage || product.main_image || null,
            thumbnails: parsedContent.thumbnails || [],
            features: parsedContent.features || [],
            featuresHtml: parsedContent.featuresHtml || null,
            highlights: parsedContent.highlights || [],
          },
          is_published: product.is_published,
        };

        setCurrentTemplateId(urlProductId);
        setCurrentProduct({
          ...builderProduct,
          blocks: builderProduct.blocks.map((b) => ({
            ...b,
            config: { ...b.config },
          })),
        });
        setCustomer(extractDefaultsFromBlocks(builderProduct.blocks));
        setDbProductLoaded(true);
      } catch (err) {
        console.error("[Builder] 상품 로드 오류:", err);
      }
    }

    loadProductFromDB();
  }, [urlProductId, dbProductLoaded, templates]);

  // 초기 로드 시 블록 기본값 적용
  useEffect(() => {
    if (currentProduct?.blocks) {
      setCustomer(extractDefaultsFromBlocks(currentProduct.blocks));
    }
  }, []); // 초기 마운트 시 1회만 실행

  // 블록 드래그 (네이티브 HTML5 Drag & Drop — React 상태로 제어)
  const dragBlockRef = useRef({ dragIdx: null });
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const handleBlockDragStart = (idx) => {
    dragBlockRef.current.dragIdx = idx;
  };

  const handleBlockDrop = (dropIdx) => {
    const dragIdx = dragBlockRef.current.dragIdx;
    if (dragIdx === null || dragIdx === dropIdx) return;
    setCurrentProduct((prev) => {
      const newBlocks = [...prev.blocks];
      const [moved] = newBlocks.splice(dragIdx, 1);
      newBlocks.splice(dropIdx, 0, moved);
      return { ...prev, blocks: newBlocks };
    });
    dragBlockRef.current.dragIdx = null;
    setDragOverIdx(null);
  };

  const handleBlockDragEnd = () => {
    dragBlockRef.current.dragIdx = null;
    setDragOverIdx(null);
  };

  // 템플릿 드래그앤드롭
  useEffect(() => {
    if (templateListRef.current) {
      Sortable.create(templateListRef.current, {
        animation: 150,
        onEnd: (evt) => {
          const newTemplates = [...templates];
          const [removed] = newTemplates.splice(evt.oldIndex, 1);
          newTemplates.splice(evt.newIndex, 0, removed);
          newTemplates.forEach((t, i) => (t.order = i));
          setTemplates(newTemplates);
        },
      });
    }
  }, [templates.length]);

  const linkStatus = checkLinkRules(currentProduct?.blocks, customer);

  // 접지 선택 핸들러 (getFoldUpdate 래퍼)
  const handleFoldSelect = (foldOpt, cfg) => {
    const foldUpdate = getFoldUpdate(foldOpt, cfg, customer);
    setCustomer((prev) => ({
      ...prev,
      finishing: { ...prev.finishing, ...foldUpdate },
    }));
  };

  // 상품 이미지 업로드 핸들러
  const handleMainImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setImageUploading(true);
      const url = await uploadImage(file, "products");
      setCurrentProduct((prev) => ({
        ...prev,
        content: { ...prev.content, mainImage: url },
      }));
    } catch (err) {
      alert("이미지 업로드 실패: " + err.message);
    } finally {
      setImageUploading(false);
    }
  };

  const handleThumbnailUpload = async (e, index) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setImageUploading(true);
      const url = await uploadImage(file, "products");
      setCurrentProduct((prev) => {
        const newThumbnails = [
          ...(prev.content.thumbnails || [null, null, null, null]),
        ];
        newThumbnails[index] = url;
        return {
          ...prev,
          content: { ...prev.content, thumbnails: newThumbnails },
        };
      });
    } catch (err) {
      alert("썸네일 업로드 실패: " + err.message);
    } finally {
      setImageUploading(false);
    }
  };

  const selectTemplate = (id) => {
    // 현재 템플릿 변경사항을 templates에 먼저 저장
    const updatedTemplates = templates.map((t) =>
      t.id === currentTemplateId ? { ...currentProduct } : t
    );
    setTemplates(updatedTemplates);

    // 새 템플릿 선택 (업데이트된 배열에서 조회)
    const template = updatedTemplates.find((t) => t.id === id);
    if (template) {
      setCurrentTemplateId(id);

      if (isNewProduct) {
        // 새 상품 모드: 템플릿 블록/설정만 복사, id는 새로 생성
        const newId = `product_${Date.now()}`;
        setCurrentProduct({
          ...template,
          id: newId,
          name: template.name + " (새 상품)",
          content: { ...template.content, title: "" },
          blocks: template.blocks.map((b) => ({
            ...b,
            config: { ...b.config },
          })),
        });
        history.replaceState(null, "", `?new=true&base=${id}`);
      } else {
        setCurrentProduct({
          ...template,
          blocks: template.blocks.map((b) => ({
            ...b,
            config: { ...b.config },
          })),
        });
      }
      setSelectedBlockId(null);
      setCustomer(extractDefaultsFromBlocks(template.blocks));
    }
  };

  // 템플릿 이름 수정
  const startEditTemplateName = (id, name) => {
    setEditingTemplateId(id);
    setEditingTemplateName(name);
  };

  const finishEditTemplateName = () => {
    if (editingTemplateId && editingTemplateName.trim()) {
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === editingTemplateId
            ? { ...t, name: editingTemplateName.trim() }
            : t
        )
      );
      if (currentProduct?.id === editingTemplateId) {
        setCurrentProduct((prev) => ({
          ...prev,
          name: editingTemplateName.trim(),
        }));
      }
    }
    setEditingTemplateId(null);
    setEditingTemplateName("");
  };

  // 템플릿 아이콘 변경
  const changeTemplateIcon = (id) => {
    const icons = ["📄", "📚", "📎", "🔗", "📖", "📑", "📋", "📝", "🗂️", "📁"];
    const template = templates.find((t) => t.id === id);
    const currentIdx = icons.indexOf(template?.icon) || 0;
    const nextIcon = icons[(currentIdx + 1) % icons.length];

    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, icon: nextIcon } : t))
    );
    if (currentProduct?.id === id) {
      setCurrentProduct((prev) => ({ ...prev, icon: nextIcon }));
    }
  };

  // 템플릿 삭제
  const deleteTemplate = (id) => {
    if (templates.length <= 1) {
      alert("최소 1개의 템플릿이 필요합니다.");
      return;
    }
    if (confirm("이 템플릿을 삭제하시겠습니까?")) {
      const newTemplates = templates.filter((t) => t.id !== id);
      setTemplates(newTemplates);
      if (currentTemplateId === id) {
        selectTemplate(newTemplates[0].id);
      }
    }
  };

  // 새 템플릿 저장
  const saveAsTemplate = () => {
    const newId = `template_${Date.now()}`;
    const newTemplate = {
      ...currentProduct,
      id: newId,
      order: templates.length,
      name: currentProduct.name + " (복사)",
      blocks: currentProduct.blocks.map((b) => ({
        ...b,
        config: { ...b.config },
      })),
    };
    setTemplates((prev) => [...prev, newTemplate]);
    setCurrentTemplateId(newId);
    setCurrentProduct(newTemplate);
  };

  // Supabase 상품 저장 공통 함수
  const saveProductToServer = (successMessage, productSnapshot) => {
    const prod = productSnapshot || currentProduct;
    const displayName = prod.content?.title || prod.name;
    fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: prod.id,
        name: displayName,
        description: prod.content?.description || "",
        main_image: prod.content?.mainImage || null,
        icon: prod.icon || "📄",
        sort_order: prod.order ?? 0,
        content: {
          ...(prod.content || {}),
          ...(prod.outsourced_config
            ? { outsourced_config: prod.outsourced_config }
            : {}),
        },
        blocks: prod.blocks || [],
        product_type: inferProductType(prod),
        is_published: true,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        alert(successMessage);
      })
      .catch((err) => {
        console.error("Supabase 저장 실패:", err);
        alert("저장에 실패했습니다. 다시 시도해주세요.");
      });
  };

  // 적용: 미리보기 반영만 (localStorage 템플릿 업데이트, DB 저장 X)
  const applyToTemplate = () => {
    setTemplates((prev) => {
      const exists = prev.some((t) => t.id === currentProduct.id);
      if (exists) {
        return prev.map((t) =>
          t.id === currentProduct.id ? { ...currentProduct } : t
        );
      }
      return [...prev, { ...currentProduct }];
    });
    setCurrentTemplateId(currentProduct.id);
  };

  // 블록 ON/OFF
  const toggleBlock = (id) => {
    setCurrentProduct((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === id ? { ...b, on: !b.on } : b)),
    }));
  };

  // 블록 설정 토글
  const toggleEdit = (id) => {
    if (selectedBlockId === id) {
      setSelectedBlockId(null);
    } else {
      setSelectedBlockId(id);
      const block = currentProduct.blocks.find((b) => b.id === id);
      setLabelInput(block?.label || "");
      setDescInput(block?.desc || "");
    }
  };

  // 블록 삭제
  const removeBlock = (id) => {
    setCurrentProduct((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((b) => b.id !== id),
    }));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  // 외주블록 개별 추가 (outsourced 템플릿의 프리셋 config 적용)
  const addOutsourcedBlock = (templateBlock) => {
    const tmpl = DEFAULT_TEMPLATES.outsourced;
    const newBlock = {
      ...templateBlock,
      id: crypto.randomUUID(),
      source: "outsourced",
      config: JSON.parse(JSON.stringify(templateBlock.config)),
    };
    setCurrentProduct((prev) => {
      // 용지 블록: 이미 하나 있으면 자동 역할 배정
      if (newBlock.type === "paper") {
        const existingPaper = prev.blocks.find(
          (b) => b.type === "paper" && b.on
        );
        if (existingPaper && !existingPaper.config?.role) {
          // 기존 블록을 표지로, 새 블록을 내지로
          return {
            ...prev,
            product_type: prev.product_type || "outsourced",
            outsourced_config:
              prev.outsourced_config || tmpl?.outsourced_config || {},
            blocks: [
              ...prev.blocks.map((b) =>
                b.id === existingPaper.id
                  ? {
                      ...b,
                      label: b.label === "용지" ? "표지 용지" : b.label,
                      config: { ...b.config, role: "cover" },
                    }
                  : b
              ),
              {
                ...newBlock,
                label: "내지 용지",
                config: { ...newBlock.config, role: "inner" },
              },
            ],
          };
        } else if (existingPaper) {
          // 기존이 cover면 새 블록은 inner, 그 반대도
          const newRole =
            existingPaper.config.role === "cover" ? "inner" : "cover";
          const newLabel = newRole === "inner" ? "내지 용지" : "표지 용지";
          newBlock.config.role = newRole;
          newBlock.label = newLabel;
        }
      }
      return {
        ...prev,
        product_type: prev.product_type || "outsourced",
        outsourced_config:
          prev.outsourced_config || tmpl?.outsourced_config || {},
        blocks: [...prev.blocks, newBlock],
      };
    });
    setShowOutsourcedLibrary(false);
  };

  // 블록 추가
  const addBlock = (type) => {
    const blockType = BLOCK_TYPES[type];
    const newBlock = {
      id: crypto.randomUUID(),
      type,
      label: blockType.name,
      desc: blockType.desc || "", // 블록 설명
      on: true,
      optional: true, // 기본값: 선택
      locked: false, // 기본값: 고정 안함
      hidden: false, // 기본값: 숨김 안함
      config: getDefaultConfig(type),
    };
    setCurrentProduct((prev) => ({
      ...prev,
      blocks: [...prev.blocks, newBlock],
    }));
    setShowBlockLibrary(false);
  };

  // 설정 적용 + 기본값을 customer에 반영
  const applySettings = (id, newLabel, newDesc) => {
    const block = currentProduct.blocks.find((b) => b.id === id);
    if (block) {
      const defaults = extractDefaultsFromBlock(block, currentProduct.blocks);
      setCustomer((prev) => {
        if (defaults.finishing) {
          return {
            ...prev,
            ...defaults,
            finishing: { ...prev.finishing, ...defaults.finishing },
          };
        }
        return { ...prev, ...defaults };
      });
    }

    setCurrentProduct((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === id ? { ...b, label: newLabel, desc: newDesc } : b
      ),
    }));
    setSelectedBlockId(null);
  };

  // 블록 속성 업데이트 (optional, locked, hidden)
  const updateBlockProp = (blockId, prop, value) => {
    setCurrentProduct((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === blockId ? { ...b, [prop]: value } : b
      ),
    }));
  };

  // config 업데이트 (value가 함수면 prev 기반으로 계산)
  const updateCfg = (blockId, key, valueOrFn) => {
    setCurrentProduct((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => {
        if (b.id !== blockId) return b;
        const val =
          typeof valueOrFn === "function"
            ? valueOrFn(b.config[key])
            : valueOrFn;
        return { ...b, config: { ...b.config, [key]: val } };
      }),
    }));
  };

  // 사이즈 옵션 토글
  const toggleSizeOption = (blockId, sizeCode, checked) => {
    setCurrentProduct((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => {
        if (b.id !== blockId) return b;
        let options = b.config.options || [];
        if (checked) {
          if (!options.includes(sizeCode)) options = [...options, sizeCode];
        } else {
          options = options.filter((s) => s !== sizeCode);
        }
        return { ...b, config: { ...b.config, options } };
      }),
    }));
  };

  // 용지 토글
  const togglePaper = (blockId, paperCode, checked) => {
    setCurrentProduct((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => {
        if (b.id !== blockId) return b;
        let papers = { ...b.config.papers };
        if (checked) {
          papers[paperCode] = (
            dbWeights?.[paperCode] ||
            DB.weights[paperCode] ||
            []
          ).slice(0, 3);
        } else {
          delete papers[paperCode];
        }
        return { ...b, config: { ...b.config, papers } };
      }),
    }));
  };

  // 평량 토글
  const toggleWeight = (blockId, paperCode, weight, checked) => {
    setCurrentProduct((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => {
        if (b.id !== blockId) return b;
        let papers = { ...b.config.papers };
        let ws = papers[paperCode] || [];
        if (checked) {
          if (!ws.includes(weight)) ws = [...ws, weight].sort((a, b) => a - b);
        } else {
          ws = ws.filter((w) => w !== weight);
        }
        papers[paperCode] = ws;
        return { ...b, config: { ...b.config, papers } };
      }),
    }));
  };

  // 배열 옵션 토글
  const toggleArrayOption = (blockId, option, checked) => {
    setCurrentProduct((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => {
        if (b.id !== blockId) return b;
        let options = b.config.options || [];
        if (checked) {
          if (!options.includes(option)) options = [...options, option];
        } else {
          options = options.filter((o) => o !== option);
        }
        return { ...b, config: { ...b.config, options } };
      }),
    }));
  };

  // 수량 추가/삭제
  const addQty = (blockId, qty) => {
    if (!qty || qty <= 0) return;
    setCurrentProduct((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => {
        if (b.id !== blockId) return b;
        let options = b.config.options || [];
        if (!options.includes(qty)) {
          options = [...options, qty].sort((a, b) => a - b);
        }
        return { ...b, config: { ...b.config, options } };
      }),
    }));
  };

  const removeQty = (blockId, qty) => {
    setCurrentProduct((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => {
        if (b.id !== blockId) return b;
        return {
          ...b,
          config: {
            ...b.config,
            options: b.config.options.filter((q) => q !== qty),
          },
        };
      }),
    }));
  };

  // 템플릿 저장: localStorage에만 저장 (DB X)
  const saveTemplate = () => {
    setTemplates((prev) => {
      const exists = prev.some((t) => t.id === currentProduct.id);
      if (exists) {
        return prev.map((t) =>
          t.id === currentProduct.id ? { ...currentProduct } : t
        );
      }
      return [...prev, { ...currentProduct }];
    });
    setCurrentTemplateId(currentProduct.id);
    const displayName = currentProduct.content?.title || currentProduct.name;
    alert(`"${displayName}" 템플릿 저장 완료!`);
  };

  // 상품 저장: DB에 저장 → /admin/products에 반영
  const saveProduct = () => {
    // 템플릿도 동기화
    setTemplates((prev) => {
      const exists = prev.some((t) => t.id === currentProduct.id);
      if (exists) {
        return prev.map((t) =>
          t.id === currentProduct.id ? { ...currentProduct } : t
        );
      }
      return [...prev, { ...currentProduct }];
    });
    setCurrentTemplateId(currentProduct.id);
    history.replaceState(null, "", `?id=${currentProduct.id}`);
    const displayName = currentProduct.content?.title || currentProduct.name;
    saveProductToServer(`"${displayName}" 상품 저장 완료!`);
  };

  // JSON 파일로 내보내기 (백업용)
  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(currentProduct, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${currentProduct.name}_config.json`;
    a.click();
  };

  // ON 블록 수
  const onCount = currentProduct?.blocks?.filter((b) => b.on).length || 0;

  // 서버에서 계산된 가격 사용
  const defaultPrice = {
    total: 0,
    unitPrice: 0,
    perUnit: 0,
    sheets: 0,
    faces: 0,
  };
  let price = serverPrice || defaultPrice;

  // 두께 검증 (ProductView와 동일 로직)
  const thicknessCheck = checkThickness(currentProduct?.blocks, customer);
  if (thicknessCheck.thickness > 0) {
    price = {
      ...price,
      thicknessValidation: thicknessCheck,
      totalThickness: thicknessCheck.thickness,
    };
  }

  // 콘텐츠
  const content =
    currentProduct?.content || getDefaultContent(currentProduct?.name || "");

  if (!currentProduct || !dbLoaded) {
    return <div className="p-8 text-center">데이터를 불러오는 중...</div>;
  }

  return (
    <div className="bg-white min-h-screen">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">상품 빌더</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={exportConfig}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              JSON
            </button>
            <button
              onClick={applyToTemplate}
              className="px-4 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-md transition-colors"
            >
              적용
            </button>
            <button
              onClick={saveProduct}
              className="px-4 py-1.5 bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium rounded-md transition-colors"
            >
              상품 저장
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        {/* 템플릿 선택 - 수정 모드(urlProductId 있음)에서는 숨김 */}
        {!urlProductId && (
          <div className="card bg-white shadow-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">
                템플릿 (드래그하여 순서 변경)
              </span>
              <button
                onClick={saveTemplate}
                className="px-3 py-1 border border-gray-300 hover:bg-gray-50 text-gray-600 text-xs font-medium rounded transition-colors"
              >
                템플릿 저장
              </button>
            </div>
            <div ref={templateListRef} className="flex gap-2 flex-wrap">
              {templates
                .sort((a, b) => a.order - b.order)
                .map((template) => (
                  <div
                    key={template.id}
                    className={`group relative inline-flex items-center gap-2.5 pl-3 pr-2 py-2 rounded-md cursor-pointer transition-all border ${
                      currentTemplateId === template.id
                        ? "bg-gray-100 border-gray-300"
                        : "bg-white border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => selectTemplate(template.id)}
                  >
                    <span
                      className="text-sm cursor-pointer opacity-60"
                      onClick={(e) => {
                        e.stopPropagation();
                        changeTemplateIcon(template.id);
                      }}
                      title="클릭하여 아이콘 변경"
                    >
                      {template.icon}
                    </span>

                    {editingTemplateId === template.id ? (
                      <input
                        type="text"
                        value={editingTemplateName}
                        onChange={(e) => setEditingTemplateName(e.target.value)}
                        onBlur={finishEditTemplateName}
                        onKeyDown={(e) =>
                          e.key === "Enter" && finishEditTemplateName()
                        }
                        className="input input-bordered input-xs w-24 h-6"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        className="text-sm text-gray-700"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          startEditTemplateName(template.id, template.name);
                        }}
                        title="더블클릭하여 이름 수정"
                      >
                        {template.name}
                      </span>
                    )}

                    <button
                      className="w-4 h-4 flex items-center justify-center rounded text-xs opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTemplate(template.id);
                      }}
                      title="삭제"
                    >
                      ✕
                    </button>
                  </div>
                ))}

              <button
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-dashed border-gray-200 hover:border-gray-400 hover:bg-gray-50 text-gray-400 hover:text-gray-700 transition-all"
                onClick={() => {
                  const newId = `template_${Date.now()}`;
                  const newTemplate = {
                    id: newId,
                    order: templates.length,
                    icon: "📄",
                    name: "새 상품",
                    blocks: [],
                    content: getDefaultContent("새 상품"),
                  };
                  setTemplates((prev) => [...prev, newTemplate]);
                  setCurrentTemplateId(newId);
                  setCurrentProduct(newTemplate);
                  // URL 업데이트로 새 상품 ID 보존
                  history.replaceState(null, "", `?id=${newId}`);
                }}
              >
                <span className="text-sm">+</span>
                <span className="text-sm">추가</span>
              </button>
            </div>
          </div>
        )}

        {/* 연동 에러 표시 */}
        {linkStatus.error && (
          <div className="alert alert-error mb-6">
            <span>⚠️ {linkStatus.error}</span>
          </div>
        )}

        {/* 고객 화면 미리보기 */}
        <div className="card bg-white shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">👁️</span>
              <div>
                <h2 className="font-bold text-gray-900">고객 화면 미리보기</h2>
                <p className="text-xs text-gray-500">
                  블록 순서대로 자동 렌더링 + 실시간 가격 계산
                </p>
              </div>
            </div>
            <span className="text-sm text-gray-400">블록 {onCount}개</span>
          </div>

          <div className="pv-grid">
            {/* 왼쪽: 이미지 + 가이드 */}
            <div className="pv-left-col">
              <div
                className="pv-images"
                style={{ position: "static", maxHeight: "none" }}
              >
                {/* 메인 이미지 */}
                <input
                  ref={mainImageRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleMainImageUpload}
                />
                <div className="relative group/main">
                  <div
                    className={`pv-main-image cursor-pointer border border-dashed border-gray-200 hover:border-gray-400 transition-colors ${imageUploading ? "opacity-50" : ""}`}
                    onClick={() => mainImageRef.current?.click()}
                  >
                    {content.mainImage ? (
                      <img src={content.mainImage} alt="메인" />
                    ) : (
                      <div className="pv-no-image">
                        <div
                          style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}
                        >
                          +
                        </div>
                        <p>{imageUploading ? "업로드 중..." : "메인 이미지"}</p>
                      </div>
                    )}
                  </div>
                  {content.mainImage && (
                    <button
                      type="button"
                      className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-black/40 text-white text-xs hover:bg-red-500 transition-colors opacity-0 group-hover/main:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentProduct((prev) => ({
                          ...prev,
                          content: { ...prev.content, mainImage: null },
                        }));
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* 썸네일 4개 */}
                <div className="pv-thumbnails">
                  {[0, 1, 2, 3].map((idx) => (
                    <div key={idx} className="relative group/thumb">
                      <input
                        ref={thumbImageRefs[idx]}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleThumbnailUpload(e, idx)}
                      />
                      <div
                        className={`pv-thumb cursor-pointer border-dashed hover:border-gray-400 transition-colors ${imageUploading ? "opacity-50" : ""}`}
                        style={{ borderStyle: "dashed" }}
                        onClick={() => thumbImageRefs[idx].current?.click()}
                      >
                        {content.thumbnails?.[idx] ? (
                          <img
                            src={content.thumbnails[idx]}
                            alt={`썸네일${idx + 1}`}
                          />
                        ) : (
                          <span
                            style={{
                              fontSize: "1.25rem",
                              color: "#d1d5db",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "100%",
                              height: "100%",
                            }}
                          >
                            +
                          </span>
                        )}
                      </div>
                      {content.thumbnails?.[idx] && (
                        <button
                          type="button"
                          className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-black/40 text-white text-[10px] hover:bg-red-500 transition-colors opacity-0 group-hover/thumb:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            const newThumbnails = [
                              ...(content.thumbnails || []),
                            ];
                            newThumbnails[idx] = null;
                            setCurrentProduct((prev) => ({
                              ...prev,
                              content: {
                                ...prev.content,
                                thumbnails: newThumbnails,
                              },
                            }));
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* 하이라이트 카드 */}
                {content.highlights?.length > 0 && (
                  <div className="pv-highlights relative group/hl">
                    <button
                      type="button"
                      className="absolute -top-3 right-0 text-xs text-gray-300 hover:text-red-400 transition-colors hidden group-hover/hl:block bg-white px-1"
                      onClick={() =>
                        setCurrentProduct((prev) => ({
                          ...prev,
                          content: {
                            ...prev.content,
                            highlights: [],
                            featuresHtml: null,
                            features: null,
                          },
                        }))
                      }
                    >
                      주요특징 삭제
                    </button>
                    {content.highlights.map((h, idx) => {
                      const IconComp = getIconComponent(h.icon);
                      const updateHighlight = (field, value) => {
                        const newHighlights = [...content.highlights];
                        newHighlights[idx] = { ...h, [field]: value };
                        setCurrentProduct((prev) => ({
                          ...prev,
                          content: {
                            ...prev.content,
                            highlights: newHighlights,
                          },
                        }));
                      };
                      return (
                        <div
                          key={idx}
                          className="pv-highlight-card group/card relative"
                        >
                          <button
                            type="button"
                            className="absolute -top-1 -right-1 text-gray-300 hover:text-red-400 text-xs hidden group-hover/card:block"
                            onClick={() => {
                              const newHighlights = content.highlights.filter(
                                (_, i) => i !== idx
                              );
                              setCurrentProduct((prev) => ({
                                ...prev,
                                content: {
                                  ...prev.content,
                                  highlights: newHighlights,
                                },
                              }));
                            }}
                          >
                            ✕
                          </button>
                          {/* 아이콘 선택 */}
                          <div className="pv-highlight-icon relative group">
                            <button
                              type="button"
                              className="flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                              onClick={(e) => {
                                const dropdown =
                                  e.currentTarget.nextElementSibling;
                                dropdown.classList.toggle("hidden");
                              }}
                            >
                              <IconComp
                                size={32}
                                strokeWidth={1.3}
                                className="text-[#222828]"
                              />
                            </button>
                            <div className="hidden absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-2 grid grid-cols-5 gap-1 w-[200px]">
                              {ICON_LIST.map(({ id, label, Component }) => (
                                <button
                                  key={id}
                                  type="button"
                                  title={label}
                                  className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${h.icon === id ? "bg-[#222828] text-white" : "hover:bg-gray-100 text-[#222828]"}`}
                                  onClick={(e) => {
                                    updateHighlight("icon", id);
                                    e.currentTarget.parentElement.classList.add(
                                      "hidden"
                                    );
                                  }}
                                >
                                  <Component size={16} strokeWidth={1.5} />
                                </button>
                              ))}
                            </div>
                          </div>
                          {/* 텍스트 */}
                          <div className="pv-highlight-text">
                            <input
                              type="text"
                              value={h.title || ""}
                              onChange={(e) =>
                                updateHighlight("title", e.target.value)
                              }
                              className="pv-highlight-title block w-full bg-transparent border-b border-transparent hover:border-gray-200 focus:border-[#222828] outline-none"
                              style={{ marginBottom: 0 }}
                              placeholder="제목"
                            />
                            <input
                              type="text"
                              value={h.desc || ""}
                              onChange={(e) =>
                                updateHighlight("desc", e.target.value)
                              }
                              className="pv-highlight-desc block w-full bg-transparent border-b border-transparent hover:border-gray-200 focus:border-[#222828] outline-none"
                              style={{ margin: 0 }}
                              placeholder="설명"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 상담 블록 (왼쪽 컬럼에 렌더링) */}
                {currentProduct?.blocks
                  ?.filter(
                    (b) => b.on && !b.hidden && b.type === "consultation"
                  )
                  .map((block) => (
                    <PreviewBlock
                      key={block.id}
                      block={block}
                      customer={customer}
                      setCustomer={setCustomer}
                      qtyPrices={{}}
                      linkStatus={{}}
                      handleFoldSelect={() => {}}
                      productType={
                        currentProduct.product_type || currentProduct.id
                      }
                      allBlocks={currentProduct?.blocks || []}
                      designCover={null}
                    />
                  ))}
              </div>
              {/* /pv-images */}
            </div>
            {/* /pv-left-col */}

            {/* 오른쪽: 옵션 영역 */}
            <div className="pv-options">
              {/* 제목 */}
              <input
                type="text"
                value={content.title}
                onChange={(e) => {
                  const val = e.target.value;
                  setCurrentProduct((prev) => ({
                    ...prev,
                    name: val || prev.name,
                    content: { ...prev.content, title: val },
                  }));
                }}
                className="pv-product-title bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-primary outline-none w-full"
                placeholder="상품명"
              />

              {/* 설명 */}
              <input
                type="text"
                value={content.description}
                onChange={(e) =>
                  setCurrentProduct((prev) => ({
                    ...prev,
                    content: { ...prev.content, description: e.target.value },
                  }))
                }
                className="pv-product-desc bg-transparent border-b border-transparent hover:border-gray-200 focus:border-primary outline-none w-full"
                placeholder="상품 설명"
              />

              {/* 주요 특징 - 노션 스타일 에디터 */}
              {content.featuresHtml ||
              content.features?.length ||
              content.highlights?.length ? (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="pv-features-label">주요 특징</p>
                    <button
                      type="button"
                      className="text-xs text-gray-300 hover:text-red-400 transition-colors"
                      onClick={() =>
                        setCurrentProduct((prev) => ({
                          ...prev,
                          content: {
                            ...prev.content,
                            featuresHtml: null,
                            features: null,
                            highlights: [],
                          },
                        }))
                      }
                    >
                      전체 삭제
                    </button>
                  </div>
                  <BlockNoteEditor
                    initialContent={
                      content.featuresHtml ||
                      content.features?.map((f) => `- ${f}`).join("\n") ||
                      ""
                    }
                    onChange={(html) =>
                      setCurrentProduct((prev) => ({
                        ...prev,
                        content: { ...prev.content, featuresHtml: html },
                      }))
                    }
                  />
                </div>
              ) : (
                <button
                  type="button"
                  className="mb-4 w-full p-3 border border-dashed border-gray-200 rounded-xl text-gray-400 hover:text-gray-500 hover:border-gray-300 transition-colors text-sm text-center"
                  onClick={() =>
                    setCurrentProduct((prev) => ({
                      ...prev,
                      content: {
                        ...prev.content,
                        featuresHtml: "<ul><li></li></ul>",
                        highlights: [
                          { icon: "Printer", title: "", desc: "" },
                          { icon: "Sparkles", title: "", desc: "" },
                        ],
                      },
                    }))
                  }
                >
                  + 주요 특징 추가
                </button>
              )}

              {/* 블록 빌더 순서대로 렌더링 (consultation은 왼쪽 컬럼) */}
              {currentProduct?.blocks
                ?.filter((b) => b.on && !b.hidden && b.type !== "consultation")
                .map((block) => {
                  if (block.type === "guide") {
                    const gCfg = block.config || {};
                    const gOptions = gCfg.options || [];
                    const guideState = customer.guides?.[block.id] || {
                      selected: gCfg.default || gOptions[0]?.id || "",
                      confirmed: false,
                    };
                    const isOpen = !guideState.confirmed;
                    const selectedOpt = gOptions.find(
                      (o) => o.id === guideState.selected
                    );

                    return (
                      <div key={block.id} className="pv-file-spec-section">
                        <div className="flex items-center">
                          <span
                            className="pv-addons-title"
                            style={{ marginBottom: 0 }}
                          >
                            {gCfg.title || block.label}
                          </span>
                          {!isOpen && (
                            <button
                              className="text-xs text-gray-400 font-medium ml-auto hover:text-gray-700 transition-colors"
                              onClick={() =>
                                setCustomer((prev) => ({
                                  ...prev,
                                  guides: {
                                    ...prev.guides,
                                    [block.id]: {
                                      ...guideState,
                                      confirmed: false,
                                    },
                                  },
                                }))
                              }
                            >
                              변경
                            </button>
                          )}
                        </div>
                        {isOpen ? (
                          <div className="pv-fs-cards">
                            {gOptions.map((opt, idx) => {
                              const isCurrent = guideState.selected === opt.id;
                              return (
                                <div
                                  key={opt.id}
                                  className={`pv-fs-card ${isCurrent ? "selected" : ""}`}
                                  onClick={() =>
                                    setCustomer((prev) => ({
                                      ...prev,
                                      guides: {
                                        ...prev.guides,
                                        [block.id]: {
                                          selected: opt.id,
                                          confirmed: true,
                                        },
                                      },
                                    }))
                                  }
                                >
                                  <div className="pv-fs-card-header">
                                    <span
                                      className={`pv-fs-num ${isCurrent ? "active" : ""}`}
                                    >
                                      {idx + 1}
                                    </span>
                                    <div className="pv-fs-card-title">
                                      <div className="pv-fs-card-label-row">
                                        <span className="pv-fs-card-label">
                                          {opt.label}
                                        </span>
                                        {opt.price > 0 && (
                                          <span className="pv-fs-card-price">
                                            +{opt.price.toLocaleString()}원
                                          </span>
                                        )}
                                      </div>
                                      {opt.hint && renderBuilderHint(opt.hint)}
                                    </div>
                                  </div>
                                  {isCurrent && (
                                    <span className="pv-fs-card-check">
                                      <svg
                                        width="12"
                                        height="12"
                                        viewBox="0 0 12 12"
                                        fill="none"
                                      >
                                        <path
                                          d="M2.5 6L5 8.5L9.5 3.5"
                                          stroke="white"
                                          strokeWidth="1.5"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                      </svg>
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          selectedOpt && (
                            <div style={{ marginTop: "0.75rem" }}>
                              <div
                                className="pv-fs-card selected cursor-pointer"
                                onClick={() =>
                                  setCustomer((prev) => ({
                                    ...prev,
                                    guides: {
                                      ...prev.guides,
                                      [block.id]: {
                                        ...guideState,
                                        confirmed: false,
                                      },
                                    },
                                  }))
                                }
                              >
                                <div className="pv-fs-card-header">
                                  <span
                                    className="pv-fs-check"
                                    style={{
                                      width: "1.25rem",
                                      height: "1.25rem",
                                    }}
                                  >
                                    <svg
                                      width="12"
                                      height="12"
                                      viewBox="0 0 12 12"
                                      fill="none"
                                    >
                                      <path
                                        d="M2.5 6L5 8.5L9.5 3.5"
                                        stroke="white"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  </span>
                                  <span className="pv-fs-card-label">
                                    {selectedOpt.label}
                                  </span>
                                  {selectedOpt.price > 0 && (
                                    <span className="pv-fs-card-price">
                                      +{selectedOpt.price.toLocaleString()}원
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    );
                  }

                  return (
                    <PreviewBlock
                      key={block.id}
                      block={block}
                      customer={customer}
                      setCustomer={setCustomer}
                      qtyPrices={qtyPrices}
                      linkStatus={linkStatus}
                      handleFoldSelect={handleFoldSelect}
                      productType={currentTemplateId}
                      dbPapers={dbPapers}
                      dbPapersList={dbPapersList}
                      allBlocks={currentProduct.blocks}
                      thicknessError={price.thicknessValidation?.error}
                      dbSizes={dbSizes}
                      designCover={null}
                    />
                  );
                })}

              {/* 가격 표시 - 공유 컴포넌트 사용 */}
              <PriceDisplay
                price={price}
                customer={customer}
                productName={currentProduct.name}
                blocks={currentProduct?.blocks}
              />
            </div>
          </div>
        </div>

        {/* 외주 단가 설정 (outsourced 상품일 때만 표시) */}
        {currentProduct.product_type === "outsourced" &&
          currentProduct.outsourced_config && (
            <div className="card bg-white shadow-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">🏭</span>
                <div>
                  <h2 className="font-bold text-gray-900">외주 단가 설정</h2>
                  <p className="text-xs text-gray-500">
                    고정 단가 기반 가격 계산
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">
                    페이지 단가 (원)
                  </label>
                  <input
                    type="number"
                    value={currentProduct.outsourced_config.pagePrice ?? 40}
                    onChange={(e) =>
                      setCurrentProduct((prev) => ({
                        ...prev,
                        outsourced_config: {
                          ...prev.outsourced_config,
                          pagePrice: Number(e.target.value),
                        },
                      }))
                    }
                    className="input input-bordered input-sm w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">
                    제본비 (원/권)
                  </label>
                  <input
                    type="number"
                    value={currentProduct.outsourced_config.bindingFee ?? 1500}
                    onChange={(e) =>
                      setCurrentProduct((prev) => ({
                        ...prev,
                        outsourced_config: {
                          ...prev.outsourced_config,
                          bindingFee: Number(e.target.value),
                        },
                      }))
                    }
                    className="input input-bordered input-sm w-full"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                권당 가격 = 페이지 수(pages 블록) × 페이지 단가 + 제본비
              </p>
              {/* 수량 할인 */}
              <div className="mt-4">
                <label className="text-xs text-gray-500 block mb-2">
                  수량 할인
                </label>
                <div className="space-y-2">
                  {(currentProduct.outsourced_config.qtyDiscounts || []).map(
                    (qd, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input
                          type="number"
                          value={qd.minQty}
                          onChange={(e) => {
                            const updated = [
                              ...(currentProduct.outsourced_config
                                .qtyDiscounts || []),
                            ];
                            updated[i] = {
                              ...updated[i],
                              minQty: Number(e.target.value),
                            };
                            setCurrentProduct((prev) => ({
                              ...prev,
                              outsourced_config: {
                                ...prev.outsourced_config,
                                qtyDiscounts: updated,
                              },
                            }));
                          }}
                          className="input input-bordered input-xs w-20"
                          placeholder="최소수량"
                        />
                        <span className="text-xs text-gray-400">부 이상 →</span>
                        <input
                          type="number"
                          value={qd.percent}
                          onChange={(e) => {
                            const updated = [
                              ...(currentProduct.outsourced_config
                                .qtyDiscounts || []),
                            ];
                            updated[i] = {
                              ...updated[i],
                              percent: Number(e.target.value),
                            };
                            setCurrentProduct((prev) => ({
                              ...prev,
                              outsourced_config: {
                                ...prev.outsourced_config,
                                qtyDiscounts: updated,
                              },
                            }));
                          }}
                          className="input input-bordered input-xs w-16"
                          placeholder="%"
                        />
                        <span className="text-xs text-gray-400">% 할인</span>
                        <button
                          onClick={() => {
                            const updated = (
                              currentProduct.outsourced_config.qtyDiscounts ||
                              []
                            ).filter((_, j) => j !== i);
                            setCurrentProduct((prev) => ({
                              ...prev,
                              outsourced_config: {
                                ...prev.outsourced_config,
                                qtyDiscounts: updated,
                              },
                            }));
                          }}
                          className="btn btn-xs btn-ghost text-red-400"
                        >
                          ✕
                        </button>
                      </div>
                    )
                  )}
                  <button
                    onClick={() => {
                      const updated = [
                        ...(currentProduct.outsourced_config.qtyDiscounts ||
                          []),
                        { minQty: 0, percent: 0 },
                      ];
                      setCurrentProduct((prev) => ({
                        ...prev,
                        outsourced_config: {
                          ...prev.outsourced_config,
                          qtyDiscounts: updated,
                        },
                      }));
                    }}
                    className="btn btn-xs btn-outline"
                  >
                    + 할인 구간
                  </button>
                </div>
              </div>
            </div>
          )}

        {/* 블록 빌더 */}
        <div className="card bg-white shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">🧱</span>
              <div>
                <h2 className="font-bold text-gray-900">블록 빌더</h2>
                <p className="text-xs text-gray-500">
                  드래그하여 순서 변경 · 체크박스로 ON/OFF · 톱니바퀴로 설정
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBlockLibrary(true)}
                className="btn btn-success btn-sm"
              >
                + 블록 추가
              </button>
              <button
                onClick={() => setShowOutsourcedLibrary(true)}
                className="btn btn-warning btn-sm"
              >
                + 외주블록
              </button>
            </div>
          </div>

          <div ref={blockListRef} className="space-y-2">
            {currentProduct.blocks.map((block, idx) => (
              <BlockItem
                key={block.id}
                block={block}
                index={idx}
                isDragOver={dragOverIdx === idx}
                onBlockDragStart={() => handleBlockDragStart(idx)}
                onBlockDragOver={(e) => {
                  e.preventDefault();
                  setDragOverIdx(idx);
                }}
                onBlockDrop={(e) => {
                  e.preventDefault();
                  handleBlockDrop(idx);
                }}
                onBlockDragEnd={handleBlockDragEnd}
                isEditing={selectedBlockId === block.id}
                toggleBlock={toggleBlock}
                toggleEdit={toggleEdit}
                removeBlock={removeBlock}
                labelInput={labelInput}
                setLabelInput={setLabelInput}
                descInput={descInput}
                setDescInput={setDescInput}
                applySettings={applySettings}
                updateBlockProp={updateBlockProp}
                updateCfg={updateCfg}
                toggleSizeOption={toggleSizeOption}
                togglePaper={togglePaper}
                toggleWeight={toggleWeight}
                toggleArrayOption={toggleArrayOption}
                addQty={addQty}
                removeQty={removeQty}
                newQtyInput={newQtyInput}
                setNewQtyInput={setNewQtyInput}
                allBlocks={currentProduct.blocks}
                dbPapersList={dbPapersList}
                dbWeights={dbWeights}
                dbSizes={dbSizes}
                BlockSettingsComponent={BlockSettings}
              />
            ))}
          </div>
        </div>

        {/* 블록 라이브러리 모달 */}
        {showBlockLibrary && (
          <div
            className="modal modal-open"
            onClick={() => setShowBlockLibrary(false)}
          >
            <div
              className="modal-box w-[600px] max-w-5xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">블록 라이브러리</h3>
                <button
                  onClick={() => setShowBlockLibrary(false)}
                  className="btn btn-ghost btn-sm btn-circle"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(BLOCK_TYPES).map(([type, info]) => (
                  <button
                    key={type}
                    onClick={() => addBlock(type)}
                    className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 transition-all text-left"
                  >
                    <div
                      className={`w-10 h-10 rounded-lg bg-gradient-to-br ${info.color} flex items-center justify-center text-xl mb-2`}
                    >
                      {info.icon}
                    </div>
                    <p className="font-medium text-sm text-gray-700">
                      {info.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{info.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 외주블록 라이브러리 모달 */}
        {showOutsourcedLibrary && (
          <div
            className="modal modal-open"
            onClick={() => setShowOutsourcedLibrary(false)}
          >
            <div
              className="modal-box w-[600px] max-w-5xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">외주블록 라이브러리</h3>
                <button
                  onClick={() => setShowOutsourcedLibrary(false)}
                  className="btn btn-ghost btn-sm btn-circle"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                외주 상품용 프리셋 블록입니다. 추가하면 product_type이
                outsourced로 설정됩니다.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {(DEFAULT_TEMPLATES.outsourced?.blocks || []).map(
                  (tmplBlock) => {
                    const info = BLOCK_TYPES[tmplBlock.type] || {};
                    return (
                      <button
                        key={tmplBlock.id}
                        onClick={() => addOutsourcedBlock(tmplBlock)}
                        className="p-4 rounded-lg border border-orange-200 hover:border-orange-400 hover:bg-orange-50/50 transition-all text-left"
                      >
                        <div
                          className={`w-10 h-10 rounded-lg bg-gradient-to-br ${info.color || "from-orange-100 to-orange-200"} flex items-center justify-center text-xl mb-2`}
                        >
                          {info.icon || "🏭"}
                        </div>
                        <p className="font-medium text-sm text-gray-700">
                          {tmplBlock.label}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {info.desc || ""}
                        </p>
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
