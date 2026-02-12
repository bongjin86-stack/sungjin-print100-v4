// ============================================================
// ProductView.jsx - 고객용 상품 상세 페이지
// v1 ProductDetail.jsx 기반, nagi Layout.astro 안에서 렌더링
// PreviewBlock은 shared 컴포넌트 사용
// ============================================================

import { useEffect, useRef, useState } from "react";

import DOMPurify from "dompurify";

import { PreviewBlock } from "@/components/shared/PreviewBlock";
import { PriceBox } from "@/components/shared/PriceBox";
import {
  checkLinkRules,
  checkThickness,
  extractDefaultsFromBlocks,
  getFoldUpdate,
  mapPrintOptionsToCustomer,
} from "@/lib/blockDefaults";
import { DB, inferProductType } from "@/lib/builderData";
import { getBuilderData, loadPricingData } from "@/lib/dbService";
import { getIconComponent } from "@/lib/highlightIcons";

export default function ProductView({ product: initialProduct }) {
  const [product] = useState(initialProduct);
  const [customer, setCustomer] = useState(() =>
    extractDefaultsFromBlocks(initialProduct?.blocks)
  );
  const [selectedImage, setSelectedImage] = useState(0);
  const [dbPapers, setDbPapers] = useState({});
  const [dbPapersList, setDbPapersList] = useState([]);
  const [dbSizes, setDbSizes] = useState(null);
  const [pricingDataLoaded, setPricingDataLoaded] = useState(false);
  const [serverPrice, setServerPrice] = useState(null);
  const [qtyPrices, setQtyPrices] = useState({});
  const [designCover, setDesignCover] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    loadDbPapers();
    // ?designId URL 파라미터 → edu100 커버 이미지 로드
    const designId = new URLSearchParams(window.location.search).get("designId");
    if (designId) {
      fetch(`/api/edu100/${designId}`)
        .then((res) => res.ok ? res.json() : null)
        .then((cover) => { if (cover) setDesignCover(cover); })
        .catch(() => {});
    }
  }, []);

  // DB에서 용지 데이터 로드
  const loadDbPapers = async () => {
    try {
      const data = await loadPricingData();
      if (data?.papers) {
        const paperMap = {};
        data.papers.forEach((p) => {
          paperMap[p.code] = {
            name: p.name,
            desc: p.description || "",
            image_url: p.image_url || null,
          };
        });
        setDbPapers(paperMap);
        setDbPapersList(data.papers);
      }
      const bd = getBuilderData();
      if (bd?.sizes) setDbSizes(bd.sizes);
      setPricingDataLoaded(true);
    } catch (err) {
      console.error("Failed to load paper data:", err);
      setPricingDataLoaded(true);
    }
  };

  // 접지 선택 핸들러 (getFoldUpdate 래퍼)
  const handleFoldSelect = (foldOpt, cfg) => {
    const foldUpdate = getFoldUpdate(foldOpt, cfg, customer);
    setCustomer((prev) => ({
      ...prev,
      finishing: { ...prev.finishing, ...foldUpdate },
    }));
  };

  // 서버 가격 계산 (debounce 300ms)
  useEffect(() => {
    if (!pricingDataLoaded) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const qtyBlock = product?.blocks?.find(
        (b) => b.on && b.type === "quantity"
      );
      const presetQtys = qtyBlock?.config?.options || [];
      const allQtys = presetQtys.includes(customer.qty)
        ? presetQtys
        : [...presetQtys, customer.qty];

      try {
        // 가이드 블록 가격 합산
        const guidePriceTotal = Object.entries(customer.guides || {}).reduce((sum, [blockId, state]) => {
          const guideBlock = product?.blocks?.find((b) => String(b.id) === String(blockId) && b.on && b.type === "guide");
          const opt = guideBlock?.config?.options?.find((o) => o.id === state.selected);
          return sum + (opt?.price || 0);
        }, 0);

        // 디자인 타입 가격 합산
        const designBlock = product?.blocks?.find((b) => b.on && b.type === "design_select");
        const designTierPrice = designBlock?.config?.tiers?.find(
          (t) => t.id === customer.designTier
        )?.price || 0;
        const totalGuidePrice = guidePriceTotal + designTierPrice;

        // 외주 상품 가격 계산 (클라이언트 전용 — priceEngine 안 거침)
        const oCfg = product?.outsourced_config || product?.content?.outsourced_config;
        const isOutsourced = (product?.product_type === "outsourced") && oCfg;
        if (isOutsourced) {
          const pagesBlock = product?.blocks?.find((b) => b.on && b.type === "pages");
          const oPagePrice = oCfg.pagePrice ?? 40;
          const oBindingFee = oCfg.bindingFee ?? 1500;
          const qtyDiscounts = oCfg.qtyDiscounts || [];

          const findDiscount = (qty) => {
            const discount = [...qtyDiscounts]
              .sort((a, b) => b.minQty - a.minQty)
              .find((d) => qty >= d.minQty);
            return discount?.percent || 0;
          };

          // books 배열이 있으면 권별 합산 (books블록 config 우선, outsourced_config 폴백)
          const booksArr = customer.books || [];
          const booksBlock = product?.blocks?.find((b) => b.on && b.type === "books");
          const booksCfg = booksBlock?.config || {};
          // 무게 추정 (A4 기준 80g 내지 + 200g 표지)
          const areaM2 = 0.21 * 0.297; // A4
          const innerGsm = 80;
          const coverGsm = 200;

          if (booksArr.length > 0) {
            const bPagePrice = booksCfg.pagePrice ?? oPagePrice;
            const bBindingFee = booksCfg.bindingFee ?? oBindingFee;
            const freeDesignMinQty = booksCfg.freeDesignMinQty ?? 100;
            const coverDesignFee = designCover?.design_fee ?? 0;

            // 총 수량 합산 → 할인율 결정
            const totalQty = booksArr.reduce((s, b) => s + (b.qty || 1), 0);
            const discountPct = findDiscount(totalQty);

            let grandTotal = 0;
            let totalWeightG = 0;
            for (const book of booksArr) {
              const pages = book.pages || pagesBlock?.config?.default || 100;
              const qty = book.qty || 1;
              const perCopy = pages * bPagePrice + bBindingFee + totalGuidePrice;
              grandTotal += Math.round(perCopy * qty * (1 - discountPct / 100));
              // 권당 무게: 내지 sheets(pages/2) + 표지 1장
              const innerW = areaM2 * innerGsm * (pages / 2);
              const coverW = areaM2 * coverGsm * 1;
              totalWeightG += (innerW + coverW) * qty;
            }
            // 디자인 비용: 총합 수량 < freeDesignMinQty이면 청구
            if (coverDesignFee > 0 && totalQty < freeDesignMinQty) {
              grandTotal += coverDesignFee;
            }
            const unitPrice = totalQty > 0 ? Math.round(grandTotal / totalQty) : 0;
            const estimatedWeight = totalWeightG / 1000;
            const sel = { total: grandTotal, unitPrice, perUnit: unitPrice, sheets: 0, faces: 0, estimatedWeight };
            setServerPrice(sel);
            setQtyPrices({ [totalQty]: sel });
          } else {
            const oPages = customer.pages || pagesBlock?.config?.default || 100;
            const perCopy = oPages * oPagePrice + oBindingFee;

            // 각 수량별 가격 계산 (guidePriceTotal 포함 = 에폭시 등 가이드 옵션)
            const byQty = {};
            for (const q of allQtys) {
              const discountPct = findDiscount(q);
              const basePerCopy = perCopy + totalGuidePrice;
              const total = Math.round(basePerCopy * q * (1 - discountPct / 100));
              const unitPrice = Math.round(total / q);
              // 무게: 내지(pages/2 sheets) + 표지 1장
              const innerW = areaM2 * innerGsm * (oPages / 2);
              const coverW = areaM2 * coverGsm * 1;
              const estimatedWeight = ((innerW + coverW) * q) / 1000;
              byQty[q] = { total, unitPrice, perUnit: unitPrice, sheets: 0, faces: 0, estimatedWeight };
            }
            const sel = byQty[customer.qty] || {};
            setServerPrice(sel);
            setQtyPrices(byQty);
          }
        } else {
          const res = await fetch("/api/calculate-price", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customer: mapPrintOptionsToCustomer(customer, product?.blocks),
              qty: customer.qty,
              productType: inferProductType(product),
              allQtys,
              guidePriceTotal: totalGuidePrice,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            setServerPrice(data.selected || null);
            if (data.byQty) setQtyPrices(data.byQty);
          }
        }
      } catch (e) {
        console.warn("Price fetch error:", e.message);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [customer, pricingDataLoaded]);

  if (!product) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          상품을 찾을 수 없습니다
        </h2>
        <a
          href="/"
          className="mt-4 inline-block px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors font-medium"
        >
          홈으로
        </a>
      </div>
    );
  }

  const content = product.content || {};
  const allBlocks = product.blocks?.filter((b) => b.on && !b.hidden) || [];
  const linkStatus = checkLinkRules(product?.blocks, customer);


  // 서버에서 계산된 가격 사용
  const defaultPrice = {
    total: 0,
    unitPrice: 0,
    perUnit: 0,
    sheets: 0,
    faces: 0,
  };
  let price = serverPrice || defaultPrice;

  // 두께 검증 (공유 함수 사용)
  const thicknessCheck = checkThickness(product?.blocks, customer);
  if (thicknessCheck.thickness > 0) {
    price = {
      ...price,
      thicknessValidation: thicknessCheck,
      totalThickness: thicknessCheck.thickness,
    };
  }

  // 선택한 디자인 이미지가 있으면 맨 앞에 추가
  const designImages = designCover
    ? [designCover.image, ...(designCover.thumbnails || [])].filter(Boolean)
    : [];
  const baseImages = [content.mainImage, ...(content.thumbnails || [])].filter(Boolean);
  const images = designImages.length > 0 ? designImages : baseImages;

  return (
    <div className="product-view">
      {/* 연동 에러 표시 */}
      {linkStatus.error && (
        <div className="pv-error">
          <span>&#9888; {linkStatus.error}</span>
        </div>
      )}

      <div className="pv-grid">
        {/* 왼쪽 컬럼 */}
        <div className="pv-left-col">
        <div className="pv-images">
          {/* 메인 이미지 */}
          <div className="pv-main-image">
            {images[selectedImage] ? (
              <img src={images[selectedImage]} alt={product.name} />
            ) : content.mainImage ? (
              <img src={content.mainImage} alt={product.name} />
            ) : (
              <div className="pv-no-image">
                <svg
                  className="w-16 h-16 mx-auto mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p>이미지 없음</p>
              </div>
            )}
          </div>

          {/* 썸네일 */}
          {images.length > 1 && (
            <div className="pv-thumbnails">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className={`pv-thumb ${selectedImage === idx ? "active" : ""}`}
                  onClick={() => setSelectedImage(idx)}
                >
                  <img
                    src={img}
                    alt={`썸네일${idx + 1}`}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              ))}
            </div>
          )}

          {/* 하이라이트 카드 */}
          {content.highlights && content.highlights.length > 0 && (
            <div className="pv-highlights">
              {content.highlights.map((h, idx) => {
                const IconComp = getIconComponent(h.icon);
                return (
                  <div key={idx} className="pv-highlight-card">
                    <div className="pv-highlight-icon">
                      <IconComp size={32} strokeWidth={1.3} />
                    </div>
                    <div className="pv-highlight-text">
                      <span className="pv-highlight-title">{h.title}</span>
                      <p className="pv-highlight-desc">{h.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 상담 블록 (카카오톡) */}
          {allBlocks
            .filter((b) => b.type === "consultation")
            .map((block) => (
              <PreviewBlock
                key={block.id}
                block={block}
                customer={customer}
                setCustomer={setCustomer}
                qtyPrices={qtyPrices}
                linkStatus={linkStatus}
                handleFoldSelect={handleFoldSelect}
                productType={product.product_type || product.id}
                dbPapers={dbPapers}
                dbPapersList={dbPapersList}
                allBlocks={product?.blocks || []}
                thicknessError={price.thicknessValidation?.error}
                dbSizes={dbSizes}
                designCover={designCover}
              />
            ))}

        </div>{/* end pv-images */}
        </div>{/* end pv-left-col */}

        {/* 오른쪽: 옵션 영역 */}
        <div className="pv-options">
          <h1 className="pv-product-title">{content.title || product.name}</h1>

          {content.description && (
            <p className="pv-product-desc">{content.description}</p>
          )}

          {/* 주요 특징 */}
          {renderFeatures(content)}

          {/* 블록 빌더 순서대로 렌더링 (consultation은 왼쪽 컬럼) */}
          {allBlocks.filter((b) => b.type !== "consultation").map((block) => {
            if (block.type === "guide") {
              const gCfg = block.config || {};
              const gOptions = gCfg.options || [];
              const guideState = customer.guides?.[block.id] || {
                selected: gCfg.default || gOptions[0]?.id || "",
                confirmed: false,
              };
              const isOpen = !guideState.confirmed;
              const selectedOpt = gOptions.find((o) => o.id === guideState.selected);

              return (
                <div key={block.id} className="pv-file-spec-section">
                  <div className="pv-addons-title">
                    {gCfg.title || block.label}
                    {!isOpen && (
                      <button
                        className="pv-step-change"
                        style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer" }}
                        onClick={() => setCustomer((prev) => ({
                          ...prev,
                          guides: { ...prev.guides, [block.id]: { ...guideState, confirmed: false } },
                        }))}
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
                            onClick={() => setCustomer((prev) => ({
                              ...prev,
                              guides: { ...prev.guides, [block.id]: { selected: opt.id, confirmed: true } },
                            }))}
                          >
                            <div className="pv-fs-card-header">
                              <span className={`pv-fs-num ${isCurrent ? "active" : ""}`}>{idx + 1}</span>
                              <div className="pv-fs-card-title">
                                <div className="pv-fs-card-label-row">
                                  <span className="pv-fs-card-label">{opt.label}</span>
                                  {opt.price > 0 && (
                                    <span className="pv-fs-card-price">+{opt.price.toLocaleString()}원</span>
                                  )}
                                </div>
                              </div>
                              {isCurrent && (
                                <span className="pv-fs-card-check">
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </span>
                              )}
                            </div>
                            {opt.hint && renderHintContent(opt.hint)}
                          </div>
                        );
                      })}
                    </div>
                  ) : selectedOpt && (
                    <div className="pv-fs-cards">
                      <div
                        className="pv-fs-card selected"
                        onClick={() => setCustomer((prev) => ({
                          ...prev,
                          guides: { ...prev.guides, [block.id]: { ...guideState, confirmed: false } },
                        }))}
                      >
                        <div className="pv-fs-card-header">
                          <span className="pv-fs-card-check">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </span>
                          <div className="pv-fs-card-title">
                            <div className="pv-fs-card-label-row">
                              <span className="pv-fs-card-label">{selectedOpt.label}</span>
                              {selectedOpt.price > 0 && (
                                <span className="pv-fs-card-price">+{selectedOpt.price.toLocaleString()}원</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
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
                productType={product.product_type || product.id}
                dbPapers={dbPapers}
                dbPapersList={dbPapersList}
                allBlocks={product?.blocks || []}
                thicknessError={price.thicknessValidation?.error}
                dbSizes={dbSizes}
                designCover={designCover}
              />
            );
          })}

          {/* 가격 표시 - 공유 컴포넌트 */}
          <PriceBox
            price={price}
            customer={customer}
            isPreview={false}
            blocks={product?.blocks}
            onOrderClick={() => {
              const finishingList = [];
              if (customer.finishing?.foldEnabled)
                finishingList.push(`접지 ${customer.finishing.fold}단`);
              if (customer.finishing?.osiEnabled)
                finishingList.push(`오시 ${customer.finishing.osi}줄`);
              if (customer.finishing?.mising) finishingList.push("미싱");
              if (customer.finishing?.corner) finishingList.push("귀도리");
              if (customer.finishing?.punch) finishingList.push("타공");
              if (customer.finishing?.coating) {
                const typeNames = { matte: "무광코팅", gloss: "유광코팅" };
                const sideNames = { single: "단면", double: "양면" };
                finishingList.push(
                  `${typeNames[customer.finishing.coatingType] || "코팅"} ${sideNames[customer.finishing.coatingSide] || ""}`
                );
              }

              const paperName =
                dbPapers[customer.paper]?.name || customer.paper;
              const weightText = customer.weight ? `${customer.weight}g` : "";
              const paperFullName = `${paperName} ${weightText}`.trim();
              const isBinding = ["perfect", "saddle", "spring"].includes(
                product.product_type || product.id
              );

              // 텍스트 입력 블록 값 추출 (label → value)
              const textInputEntries = [];
              allBlocks.filter(b => b.type === "text_input").forEach(block => {
                const val = customer.textInputs?.[block.id];
                const source = block.config?.source || "manual";
                if (source === "cover" && val && typeof val === "object") {
                  // cover 모드: 객체를 {label, value}[] 로 전개
                  Object.entries(val).forEach(([label, v]) => {
                    if (v && String(v).trim()) {
                      textInputEntries.push({ label, value: String(v) });
                    }
                  });
                } else if (typeof val === "string" && val.trim()) {
                  textInputEntries.push({ label: block.label || "요청사항", value: val });
                }
              });
              // books 블록 값 추출 (권별 필드 + 페이지/수량)
              const booksArr = customer.books || [];
              const booksSummary = [];
              if (booksArr.length > 0) {
                const bBlock = product?.blocks?.find((b) => b.on && b.type === "books");
                const bCfg = bBlock?.config || {};
                const bPagePrice = bCfg.pagePrice ?? 40;
                const bBindingFee = bCfg.bindingFee ?? 1500;
                const bFreeDesignMinQty = bCfg.freeDesignMinQty ?? 100;
                const bDesignFee = designCover?.design_fee ?? 0;
                const bTotalQty = booksArr.reduce((s, b) => s + (b.qty || 1), 0);

                // 가이드 가격 합산 (실제 가격 계산과 동일한 공식)
                const bGuidePrice = Object.entries(customer.guides || {}).reduce((sum, [blockId, state]) => {
                  const gb = product?.blocks?.find((b) => String(b.id) === String(blockId) && b.on && b.type === "guide");
                  const opt = gb?.config?.options?.find((o) => o.id === state.selected);
                  return sum + (opt?.price || 0);
                }, 0);

                booksArr.forEach((book, idx) => {
                  const prefix = `${idx + 1}권`;
                  Object.entries(book.fields || {}).forEach(([label, v]) => {
                    if (v && String(v).trim()) {
                      textInputEntries.push({ label: `${prefix} ${label}`, value: String(v) });
                    }
                  });
                  textInputEntries.push({ label: `${prefix} 페이지`, value: `${book.pages}p` });
                  textInputEntries.push({ label: `${prefix} 수량`, value: `${book.qty}부` });
                  const perCopy = (book.pages || 100) * bPagePrice + bBindingFee + bGuidePrice;
                  booksSummary.push({
                    index: idx + 1,
                    pages: book.pages,
                    qty: book.qty,
                    perCopy,
                    subtotal: perCopy * (book.qty || 1),
                    fields: book.fields || {},
                  });
                });
                // 디자인 비용 정보
                if (bDesignFee > 0 && bTotalQty < bFreeDesignMinQty) {
                  booksSummary.push({ designFee: bDesignFee, totalQty: bTotalQty, freeMinQty: bFreeDesignMinQty });
                }
              }

              sessionStorage.setItem(
                "checkoutProduct",
                JSON.stringify({
                  name: product.name,
                  image: images[0] || null,
                  textInputs: textInputEntries.length > 0 ? textInputEntries : null,
                  booksSummary: booksSummary.length > 0 ? booksSummary : null,
                  type: inferProductType(product),
                  spec: {
                    size: customer.size?.startsWith("custom_")
                      ? `${customer.customWidth || 0}×${customer.customHeight || 0}mm`
                      : customer.size || "맞춤",
                    paper: paperFullName,
                    color: `${customer.color === "color" ? "컬러" : "흑백"} ${customer.side === "single" ? "단면" : "양면"}`,
                    finishing: finishingList,
                    quantity: customer.qty,
                    pages: customer.pages,
                  },
                  price: price.total,
                  productionDays: 2,
                  paperWeight: customer.weight || 120,
                  paperCode: customer.paper,
                  isBinding,
                  innerWeight: isBinding ? customer.innerWeight || 80 : null,
                  coverWeight: isBinding
                    ? customer.coverWeight || customer.weight || 200
                    : null,
                  // Server-side price verification data (transient 필드 제거)
                  customerSelection: (() => {
                    const { _designs, selectedDesign, textInputs, books, guides, ...clean } = customer;
                    return clean;
                  })(),
                })
              );

              window.location.href = "/upload";
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// BlockNote JSON → 텍스트 렌더링
// ============================================================
function renderInlineContent(contentArr) {
  if (!Array.isArray(contentArr)) return null;
  return contentArr
    .filter((c) => c.type === "text" && c.text)
    .map((c, i) => {
      let el = c.text;
      const s = c.styles || {};
      if (s.bold) el = <strong key={`b${i}`}>{el}</strong>;
      if (s.italic) el = <em key={`i${i}`}>{el}</em>;
      if (s.underline) el = <u key={`u${i}`}>{el}</u>;
      if (s.strike) el = <s key={`s${i}`}>{el}</s>;
      if (s.fontSize) el = <span key={`fs${i}`} style={{ fontSize: s.fontSize }}>{el}</span>;
      return <span key={i}>{el}</span>;
    });
}

function renderBlockContent(blocks) {
  if (!Array.isArray(blocks)) return null;
  return blocks
    .map((block) => {
      const inline = renderInlineContent(block.content);
      const hasText = block.content?.some((c) => c.type === "text" && c.text);
      if (!hasText) return null;
      switch (block.type) {
        case "heading": {
          const level = block.props?.level || 1;
          const Tag = `h${level}`;
          return <Tag key={block.id}>{inline}</Tag>;
        }
        case "bulletListItem":
          return <li key={block.id}>{inline}</li>;
        case "numberedListItem":
          return <li key={block.id}>{inline}</li>;
        case "paragraph":
          return <p key={block.id}>{inline}</p>;
        default:
          return <span key={block.id}>{inline}</span>;
      }
    })
    .filter(Boolean);
}

function renderHintContent(hint) {
  if (!hint) return null;
  let parsed = hint;
  if (typeof parsed === "string") {
    try { parsed = JSON.parse(parsed); } catch { parsed = null; }
  }
  if (Array.isArray(parsed)) {
    const items = renderBlockContent(parsed);
    if (items?.length > 0) {
      const listTypes = ["bulletListItem", "numberedListItem"];
      const hasList = parsed.some((b) => listTypes.includes(b.type));
      return <div className="pv-fs-card-hint">{hasList ? <ul>{items}</ul> : <div>{items}</div>}</div>;
    }
  }
  if (typeof hint === "string" && hint.trim()) {
    return <p className="pv-fs-card-hint">{hint}</p>;
  }
  return null;
}

function renderFeatures(content) {
  // 1) featuresHtml이 BlockNote JSON 배열인 경우
  if (content.featuresHtml) {
    let parsed = content.featuresHtml;
    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        parsed = null;
      }
    }
    if (Array.isArray(parsed)) {
      const items = renderBlockContent(parsed);
      if (items && items.length > 0) {
        const hasBullets = parsed.some((b) => b.type === "bulletListItem");
        return (
          <div className="pv-features">
            <h3>주요 특징</h3>
            {hasBullets ? <ul>{items}</ul> : <div>{items}</div>}
          </div>
        );
      }
    }
    // 2) featuresHtml이 일반 HTML 문자열인 경우
    if (
      typeof content.featuresHtml === "string" &&
      content.featuresHtml.trim().startsWith("<")
    ) {
      return (
        <div className="pv-features">
          <h3>주요 특징</h3>
          <div
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(content.featuresHtml),
            }}
          />
        </div>
      );
    }
  }

  // 3) features가 문자열 배열인 경우
  if (Array.isArray(content.features) && content.features.length > 0) {
    return (
      <div className="pv-features">
        <h3>주요 특징</h3>
        <ul>
          {content.features.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      </div>
    );
  }

  return null;
}
