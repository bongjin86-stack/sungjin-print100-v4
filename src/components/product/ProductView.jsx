// ============================================================
// ProductView.jsx - 고객용 상품 상세 페이지
// v1 ProductDetail.jsx 기반, nagi Layout.astro 안에서 렌더링
// PreviewBlock은 shared 컴포넌트 사용
// ============================================================

import { useEffect, useMemo, useRef, useState } from "react";

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
import { DB } from "@/lib/builderData";
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
  const [detailOpen, setDetailOpen] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    loadDbPapers();
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
        // fileSpec 추가금 계산: 사이즈 블록의 fileSpecPrices에서 선택한 옵션 금액
        const sizeBlock = product?.blocks?.find((b) => b.on && b.type === "size");
        const fileSpecPrice = sizeBlock?.config?.trimEnabled
          ? (sizeBlock.config.fileSpecPrices || {})[customer.fileSpec || "with_bleed"] || 0
          : 0;

        // 가이드 블록 가격 합산
        const guidePriceTotal = Object.entries(customer.guides || {}).reduce((sum, [blockId, state]) => {
          const guideBlock = product?.blocks?.find((b) => String(b.id) === String(blockId) && b.on && b.type === "guide");
          const opt = guideBlock?.config?.options?.find((o) => o.id === state.selected);
          return sum + (opt?.price || 0);
        }, 0);

        const res = await fetch("/api/calculate-price", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer: mapPrintOptionsToCustomer(customer, product?.blocks),
            qty: customer.qty,
            productType: product.product_type || product.id,
            allQtys,
            fileSpecPrice,
            guidePriceTotal,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setServerPrice(data.selected || null);
          if (data.byQty) setQtyPrices(data.byQty);
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
  const blocks = product.blocks?.filter((b) => b.on && !b.hidden && b.type !== "guide") || [];
  const detailBlocks = blocks.filter((b) => b.type !== "quantity");
  const quantityBlock = blocks.find((b) => b.type === "quantity");
  // 전체 순번 계산 (가이드 → fileSpec → 상세옵션)
  const guideBlocks = product?.blocks?.filter((b) => b.on && !b.hidden && b.type === "guide") || [];
  const linkStatus = checkLinkRules(product?.blocks, customer);

  // 모든 사전 질문(가이드+fileSpec) 완료 여부
  const allPrereqsDone = useMemo(() => {
    const guideBlocks = product?.blocks?.filter((b) => b.on && !b.hidden && b.type === "guide") || [];
    const allGuidesConfirmed = guideBlocks.length === 0 ||
      guideBlocks.every((b) => customer.guides?.[b.id]?.confirmed);
    const sizeBlock = product?.blocks?.find((b) => b.on && b.type === "size");
    const needsFileSpec = sizeBlock?.config?.trimEnabled;
    const fileSpecDone = !needsFileSpec || customer.fileSpecConfirmed;
    return allGuidesConfirmed && fileSpecDone;
  }, [product, customer]);

  // 사전 질문 완료 시 상세옵션 자동 펼침
  useEffect(() => {
    if (allPrereqsDone) setDetailOpen(true);
  }, [allPrereqsDone]);

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

  const images = [content.mainImage, ...(content.thumbnails || [])].filter(
    Boolean
  );

  return (
    <div className="product-view">
      {/* 연동 에러 표시 */}
      {linkStatus.error && (
        <div className="pv-error">
          <span>&#9888; {linkStatus.error}</span>
        </div>
      )}

      <div className="pv-grid">
        {/* 왼쪽 컬럼: 이미지만 */}
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

        </div>{/* end pv-images */}

        {/* 오른쪽: 옵션 영역 */}
        <div className="pv-options">
          <h1 className="pv-product-title">{content.title || product.name}</h1>

          {content.description && (
            <p className="pv-product-desc">{content.description}</p>
          )}

          {/* 주요 특징 */}
          {renderFeatures(content)}

          {/* 가이드 블록들 */}
          {guideBlocks.map((block, gIdx) => {
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
                  {!isOpen && selectedOpt ? (
                    <div
                      className="pv-step-done"
                      onClick={() => setCustomer((prev) => ({
                        ...prev,
                        guides: { ...prev.guides, [block.id]: { ...guideState, confirmed: false } },
                      }))}
                    >
                      <span className="pv-step-check">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </span>
                      <span className="pv-step-title">{gCfg.title || block.label}</span>
                      <span className="pv-step-value">{selectedOpt.label}</span>
                      {selectedOpt.price > 0 && (
                        <span className="pv-step-price">+{selectedOpt.price.toLocaleString()}원</span>
                      )}
                      <span className="pv-step-change">변경</span>
                    </div>
                  ) : (
                    <>
                    <div className="pv-addons-title">{gCfg.title || block.label}</div>
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
                            {opt.hint && <p className="pv-fs-card-hint">{opt.hint}</p>}
                          </div>
                        );
                      })}
                    </div>
                    </>
                  )}
                </div>
              );
            })}

          {/* 파일 작업 방식 (재단 상품만) */}
          {(() => {
            const sizeBlock = product?.blocks?.find((b) => b.on && b.type === "size");
            const fsCfg = sizeBlock?.config;
            if (!fsCfg?.trimEnabled) return null;

            const allSizes = dbSizes || DB.sizeMultipliers;
            const sizeMode = fsCfg.mode || "preset";
            const bleed = fsCfg.bleed ?? 2;
            const selectedSizeInfo = allSizes[customer.size];
            const curWidth = sizeMode === "custom" ? (customer.customWidth || 0) : (selectedSizeInfo?.width || 0);
            const curHeight = sizeMode === "custom" ? (customer.customHeight || 0) : (selectedSizeInfo?.height || 0);
            const bleedWidth = curWidth + bleed * 2;
            const bleedHeight = curHeight + bleed * 2;

            if (curWidth <= 0 || curHeight <= 0) return null;

            const fsPrices = fsCfg.fileSpecPrices || {};
            const fsTexts = fsCfg.fileSpecTexts || {};
            const fileSpecOptions = [
              {
                value: "with_bleed",
                label: fsTexts.with_bleed?.label || "재단 여백을 포함해서 작업했어요",
                size: `${bleedWidth}×${bleedHeight}mm`,
                hint: fsTexts.with_bleed?.hint || `상하좌우 ${bleed}mm 재단 여백이 포함된 파일이에요. 이미지가 재단면까지 이어지는 디자인이라면, 여백 영역까지 이미지를 확장해서 작업해 주세요. 별도 보정 없이 바로 제작을 진행합니다.`,
                price: fsPrices.with_bleed || 0,
              },
              {
                value: "exact",
                label: fsTexts.exact?.label || "완성 사이즈 그대로 작업했어요",
                size: `${curWidth}×${curHeight}mm`,
                hint: fsTexts.exact?.hint || `완성 사이즈는 동일하게 ${curWidth}×${curHeight}mm로 제작돼요. 가장자리에 이미지나 배경색이 없다면 그대로 재단을 진행합니다. 가장자리에 이미지가 닿아 있는 경우 살짝 확대 후 재단하며, 테두리 1~2mm가 잘릴 수 있어요. 중요한 내용은 테두리에서 최소 1cm 안쪽에 배치하는 게 좋아요.`,
                price: fsPrices.exact || 0,
              },
              {
                value: "fit",
                label: fsTexts.fit?.label || "다른 사이즈로 작업했어요",
                size: null,
                hint: fsTexts.fit?.hint || `선택하신 사이즈(${curWidth}×${curHeight}mm)와 다른 규격의 파일이에요. 파일 확인 후 비율에 맞춰 조정하며, 상하좌우 여백이 생기거나 일부가 잘릴 수 있어요. 필요한 경우 작업 전 연락드립니다.`,
                price: fsPrices.fit || 0,
              },
            ];

            const currentFs = customer.fileSpec || "with_bleed";
            const isOpen = !customer.fileSpecConfirmed;
            const selectedOpt = fileSpecOptions.find((o) => o.value === currentFs);

            return (
              <div className="pv-file-spec-section">
                {!isOpen && selectedOpt ? (
                  <div
                    className="pv-step-done"
                    onClick={() => setCustomer((prev) => ({ ...prev, fileSpecConfirmed: false }))}
                  >
                    <span className="pv-step-check">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </span>
                    <span className="pv-step-title">{fsCfg.fileSpecTitle || "파일 방식"}</span>
                    <span className="pv-step-value">{selectedOpt.label}</span>
                    {selectedOpt.size && <span className="pv-step-size">{selectedOpt.size}</span>}
                    {selectedOpt.price > 0 && (
                      <span className="pv-step-price">+{selectedOpt.price.toLocaleString()}원</span>
                    )}
                    <span className="pv-step-change">변경</span>
                  </div>
                ) : (
                  <>
                  <div className="pv-addons-title">{fsCfg.fileSpecTitle || "어떤 파일로 올리시나요?"}</div>
                  <div className="pv-fs-cards">
                    {fileSpecOptions.map((opt, idx) => {
                      const isCurrent = currentFs === opt.value;
                      return (
                        <div
                          key={opt.value}
                          className={`pv-fs-card ${isCurrent ? "selected" : ""}`}
                          onClick={() => {
                            setCustomer((prev) => ({ ...prev, fileSpec: opt.value, fileSpecConfirmed: true }));
                          }}
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
                              {opt.size && <p className="pv-fs-card-size">{opt.size}</p>}
                            </div>
                            {isCurrent && (
                              <span className="pv-fs-card-check">
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              </span>
                            )}
                          </div>
                          <p className="pv-fs-card-hint">{opt.hint}</p>
                        </div>
                      );
                    })}
                  </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* 상세옵션 (1-2 완료 시 자동 오픈) */}
          {detailBlocks.length > 0 && (
            <>
              {!detailOpen ? (
                <div className="pv-step-locked">
                  <span className="pv-step-title">상세옵션</span>
                </div>
              ) : (
                <>
                  <div className="pv-detail-header" onClick={() => setDetailOpen(!detailOpen)}>
                    <span className="pv-detail-label">상세옵션</span>
                    <span className={`pv-detail-arrow open`}>&#9660;</span>
                  </div>
                  {detailBlocks.map((block) => (
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
                    />
                  ))}
                </>
              )}
            </>
          )}

          {/* 수량 (항상 보임) */}
          {quantityBlock && (
            <PreviewBlock
              block={quantityBlock}
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
            />
          )}

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

              sessionStorage.setItem(
                "checkoutProduct",
                JSON.stringify({
                  name: product.name,
                  type: product.product_type || product.id,
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
                  // Server-side price verification data
                  customerSelection: customer,
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
function renderBlockContent(blocks) {
  if (!Array.isArray(blocks)) return null;
  return blocks
    .map((block) => {
      const text =
        block.content
          ?.filter((c) => c.type === "text")
          ?.map((c) => c.text)
          ?.join("") || "";
      if (!text) return null;
      if (block.type === "bulletListItem")
        return <li key={block.id}>{text}</li>;
      if (block.type === "paragraph") return <p key={block.id}>{text}</p>;
      return <span key={block.id}>{text}</span>;
    })
    .filter(Boolean);
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
