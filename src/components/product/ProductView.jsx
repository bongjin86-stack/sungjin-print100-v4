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
        const res = await fetch("/api/calculate-price", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer: mapPrintOptionsToCustomer(customer, product?.blocks),
            qty: customer.qty,
            productType: product.product_type || product.id,
            allQtys,
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
  const blocks = product.blocks?.filter((b) => b.on && !b.hidden) || [];
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
        {/* 왼쪽: 이미지 영역 */}
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
        </div>

        {/* 오른쪽: 옵션 영역 */}
        <div className="pv-options">
          <h1 className="pv-product-title">{content.title || product.name}</h1>

          {content.description && (
            <p className="pv-product-desc">{content.description}</p>
          )}

          {/* 주요 특징 */}
          {renderFeatures(content)}

          {/* 블록 미리보기 */}
          {blocks.map((block) => (
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
                    size: customer.size || "맞춤",
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
