/**
 * PreviewBlock.jsx - 공유 컴포넌트
 *
 * 블록 타입별 옵션 UI 렌더링 (고객용 + 빌더 미리보기 공용)
 *
 * 사용처:
 * - ProductView.jsx (고객용 상품 페이지)
 * - ProductBuilder/index.jsx (관리자 빌더 미리보기)
 *
 * 스타일: ProductView.css의 pv-* 클래스 사용
 */

import { memo, useEffect, useRef, useState } from "react";

import {
  getCoatingWeight,
  getPaperBlockRole,
  mapPrintOptionsToCustomer,
  validateCoatingWeight,
} from "@/lib/blockDefaults";
import {
  DB,
  FIXED_DELIVERY_OPTIONS,
  getSpringOptionsDefaults,
  TEMPLATES,
} from "@/lib/builderData";
import {
  formatBusinessDate,
  getBusinessDate,
  isBusinessDay,
} from "@/lib/businessDays";

/** BlockNote JSON → 구조화된 렌더링 (trim notice용) */
function renderNoticeBody(notice) {
  if (!notice) return null;
  let parsed = notice;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  const items = parsed
    .map((block, bIdx) => {
      const textParts = (block.content || [])
        .filter((c) => c.type === "text" && c.text)
        .map((c, cIdx) => {
          let el = c.text;
          const s = c.styles || {};
          if (s.bold) el = <strong key={`${bIdx}-${cIdx}`}>{el}</strong>;
          if (s.italic) el = <em key={`${bIdx}-${cIdx}`}>{el}</em>;
          return <span key={`${bIdx}-${cIdx}`}>{el}</span>;
        });
      if (!textParts.length) return null;
      if (block.type === "bulletListItem")
        return <li key={block.id || bIdx}>{textParts}</li>;
      return <p key={block.id || bIdx}>{textParts}</p>;
    })
    .filter(Boolean);
  if (items.length === 0) return null;
  const hasBullets = parsed.some((b) => b.type === "bulletListItem");
  return hasBullets ? <ul>{items}</ul> : <div>{items}</div>;
}

const PAPER_SWATCH_GRADIENTS = {
  snow: "linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)",
  mojo: "linear-gradient(135deg, #fefcf3 0%, #fef3c7 50%, #fde68a 100%)",
  artpaper: "linear-gradient(135deg, #ffffff 0%, #fafafa 100%)",
  rendezvous: "linear-gradient(135deg, #faf5ef 0%, #f5ebe0 50%, #eddfcc 100%)",
  inspire: "linear-gradient(135deg, #f5f5f4 0%, #e7e5e4 50%, #d6d3d1 100%)",
  inspirer: "linear-gradient(135deg, #f5f5f4 0%, #e7e5e4 50%, #d6d3d1 100%)",
};
const DEFAULT_PAPER_SWATCH =
  "linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)";

function QuantityTable({
  displayQtys,
  isCustomQty,
  customer,
  setCustomer,
  qtyPrices,
  qtyMin,
  qtyMax,
  cfg,
  productType,
  allBlocks,
}) {
  const [customPrice, setCustomPrice] = useState(null);

  const fetchCustomPrice = async (qty) => {
    try {
      const mapped = mapPrintOptionsToCustomer(customer, allBlocks);
      const res = await fetch("/api/calculate-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: mapped,
          qty,
          productType: productType || "flyer",
          allQtys: [qty],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.selected) setCustomPrice(data.selected);
      }
    } catch (e) {
      console.warn("Custom qty price error:", e);
    }
  };

  return (
    <>
      <div className="pv-qty-table-wrap">
        <table className="pv-qty-table">
          <thead>
            <tr>
              <th>부수</th>
              {cfg.showUnitPrice !== false && <th>단가</th>}
              <th>총 가격</th>
            </tr>
          </thead>
          <tbody>
            {displayQtys.map((q) => {
              const isCustom = isCustomQty && q === customer.qty;
              const p = isCustom
                ? customPrice || qtyPrices?.[q] || qtyPrices?.[String(q)] || {}
                : qtyPrices?.[q] || qtyPrices?.[String(q)] || {};
              const unitPrice = p.unitPrice || p.perUnit || 0;
              const total = p.total || 0;
              const isSelected = customer.qty === q;
              return (
                <tr
                  key={q}
                  className={`${isSelected ? "selected" : ""} ${isCustom ? "custom" : ""}`}
                  onClick={() => setCustomer((prev) => ({ ...prev, qty: q }))}
                >
                  <td>
                    {q}부{isCustom && " ✎"}
                  </td>
                  {cfg.showUnitPrice !== false && (
                    <td className="unit-price">
                      1부당 {unitPrice.toLocaleString()}원
                    </td>
                  )}
                  <td>{total.toLocaleString()}원</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {cfg.allowCustom && (
        <CustomQtyInput
          qtyMin={qtyMin}
          qtyMax={qtyMax}
          isCustomQty={isCustomQty}
          customerQty={customer.qty}
          setCustomer={setCustomer}
          onCustomPrice={(qty) => {
            setCustomPrice(null);
            fetchCustomPrice(qty);
          }}
        />
      )}
      {cfg.contactThreshold > 0 && customer.qty >= cfg.contactThreshold && (
        <p className="pv-delivery-warning">
          {cfg.contactMessage || "주문 전 고객센터로 문의해주세요."}
        </p>
      )}
    </>
  );
}

function CustomQtyInput({
  qtyMin,
  qtyMax,
  isCustomQty,
  customerQty,
  setCustomer,
  onCustomPrice,
}) {
  const [inputVal, setInputVal] = useState(
    isCustomQty ? String(customerQty) : ""
  );
  const debounceRef = useRef(null);

  // 블러/엔터 시 min/max 클램핑 적용
  const applyQty = (val) => {
    const raw = val !== undefined ? val : inputVal;
    const v = parseInt(raw);
    if (!v || isNaN(v)) return;
    const clamped = Math.min(Math.max(v, qtyMin), qtyMax);
    setInputVal(String(clamped));
    setCustomer((prev) => ({ ...prev, qty: clamped }));
    if (onCustomPrice) onCustomPrice(clamped);
  };

  // 타이핑 중 유효 범위면 자동 적용 (400ms 디바운스)
  const handleChange = (e) => {
    const val = e.target.value;
    setInputVal(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const v = parseInt(val);
    if (v && !isNaN(v) && v >= qtyMin && v <= qtyMax) {
      debounceRef.current = setTimeout(() => {
        setCustomer((prev) => ({ ...prev, qty: v }));
        if (onCustomPrice) onCustomPrice(v);
      }, 400);
    }
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="pv-custom-qty">
      <label className="pv-custom-qty-label">직접입력</label>
      <div className="pv-custom-qty-input-wrap">
        <input
          type="number"
          className="pv-custom-qty-input"
          placeholder={`${qtyMin}~${qtyMax}`}
          min={qtyMin}
          max={qtyMax}
          value={inputVal}
          onChange={handleChange}
          onBlur={() => applyQty()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (debounceRef.current) clearTimeout(debounceRef.current);
              applyQty();
            }
          }}
        />
        <span className="pv-custom-qty-unit">부</span>
      </div>
      {inputVal &&
        parseInt(inputVal) > 0 &&
        (parseInt(inputVal) < qtyMin || parseInt(inputVal) > qtyMax) && (
          <p className="pv-custom-qty-error">
            {qtyMin}~{qtyMax}부 사이로 입력해주세요
          </p>
        )}
    </div>
  );
}

/** 상담 가능 여부 + 다음 오픈 시간 계산 (businessDays.ts 영업일 공유) */
function getConsultStatus(cfg) {
  const now = new Date();
  const openTime = cfg.openTime || "09:00";
  const closeTime = cfg.closeTime || "18:00";

  const [openH, openM] = openTime.split(":").map(Number);
  const [closeH, closeM] = closeTime.split(":").map(Number);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const openMin = openH * 60 + openM;
  const closeMin = closeH * 60 + closeM;

  const todayBiz = isBusinessDay(now);
  const isOpen = todayBiz && nowMin >= openMin && nowMin < closeMin;

  if (isOpen) return { isOpen: true, nextOpen: null };

  // 오늘 영업일인데 아직 오픈 전
  if (todayBiz && nowMin < openMin) {
    return { isOpen: false, nextOpen: `오늘 ${openTime}` };
  }

  // 다음 영업일 찾기
  const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];
  const next = new Date(now);
  for (let i = 1; i <= 14; i++) {
    next.setDate(next.getDate() + 1);
    if (isBusinessDay(next)) {
      if (i === 1) return { isOpen: false, nextOpen: `내일 ${openTime}` };
      const m = next.getMonth() + 1;
      const d = next.getDate();
      const dayName = DAY_NAMES[next.getDay()];
      return { isOpen: false, nextOpen: `${m}/${d}(${dayName}) ${openTime}` };
    }
  }
  return { isOpen: false, nextOpen: null };
}

/** 디자인 선택 블록 — 표지 디자인 카드 그리드 + 변경 타입 라디오 */
function DesignSelectBlock({
  cfg,
  tiers,
  designs,
  selectedDesign,
  designTier,
  setCustomer,
}) {
  const [loaded, setLoaded] = useState(false);
  const [designList, setDesignList] = useState(designs || []);

  // 디자인 목록 fetch (최초 1회)
  useEffect(() => {
    if (loaded || designList.length > 0) return;
    const table = cfg.sourceTable || "edu100_covers";
    const tag = cfg.sourceTag || "";
    let url = `/api/${table.replace("_covers", "")}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        let list = Array.isArray(data) ? data : [];
        if (tag) list = list.filter((d) => d.tag === tag);
        list = list.filter((d) => d.is_published !== false);
        setDesignList(list);
        setCustomer((prev) => ({ ...prev, _designs: list }));

        // URL에서 designId 자동 선택
        const params = new URLSearchParams(window.location.search);
        const designId = params.get("designId");
        if (designId) {
          const found = list.find((d) => d.id === designId);
          if (found) {
            setCustomer((prev) => ({ ...prev, selectedDesign: found }));
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  return (
    <div>
      {/* 디자인 카드 그리드 */}
      {designList.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
            gap: "0.75rem",
            marginBottom: "1rem",
          }}
        >
          {designList.map((d) => {
            const isSelected = selectedDesign?.id === d.id;
            return (
              <div
                key={d.id}
                onClick={() =>
                  setCustomer((prev) => ({ ...prev, selectedDesign: d }))
                }
                style={{
                  cursor: "pointer",
                  borderRadius: "0.5rem",
                  overflow: "hidden",
                  border: isSelected
                    ? "2px solid #000"
                    : "2px solid transparent",
                  boxShadow: isSelected
                    ? "0 0 0 1px #000"
                    : "0 1px 3px rgba(0,0,0,0.08)",
                  transition: "all 0.15s",
                }}
              >
                {d.image ? (
                  <img
                    src={d.image}
                    alt={d.title}
                    style={{
                      width: "100%",
                      aspectRatio: "3/4",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "3/4",
                      background: "#f3f4f6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.7rem",
                      color: "#999",
                    }}
                  >
                    No img
                  </div>
                )}
                <div
                  style={{
                    padding: "0.375rem",
                    fontSize: "0.7rem",
                    fontWeight: isSelected ? 600 : 400,
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {d.title}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {designList.length === 0 && loaded && (
        <p style={{ color: "#999", fontSize: "0.875rem", padding: "1rem 0" }}>
          등록된 디자인이 없습니다.
        </p>
      )}

      {/* 변경 타입 라디오 */}
      {tiers.length > 0 && (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          {tiers.map((tier) => (
            <label
              key={tier.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.625rem 0.75rem",
                borderRadius: "0.5rem",
                border:
                  designTier === tier.id
                    ? "2px solid #000"
                    : "1px solid #e5e7eb",
                cursor: "pointer",
                fontSize: "0.875rem",
                background: designTier === tier.id ? "#fafafa" : "white",
                transition: "all 0.15s",
              }}
            >
              <input
                type="radio"
                name="designTier"
                checked={designTier === tier.id}
                onChange={() =>
                  setCustomer((prev) => ({ ...prev, designTier: tier.id }))
                }
                style={{ accentColor: "#000" }}
              />
              <span style={{ flex: 1 }}>{tier.label}</span>
              {tier.price > 0 && (
                <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                  +{tier.price.toLocaleString()}원
                </span>
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/** 상담 블록 — FAQ 아코디언 + 상담시간 표시 */
function ConsultationBlock({ cfg, faqs }) {
  const [openFaq, setOpenFaq] = useState(null);
  const [status, setStatus] = useState(() => getConsultStatus(cfg));

  // 1분마다 상태 갱신
  useEffect(() => {
    const timer = setInterval(() => setStatus(getConsultStatus(cfg)), 60_000);
    return () => clearInterval(timer);
  }, [cfg.openTime, cfg.closeTime, cfg.offDays]);

  return (
    <div className="pv-consult">
      <div className="pv-consult-header">
        <div className="pv-consult-avatar">SJ</div>
        <div className="pv-consult-info">
          <div className="pv-consult-name">
            {cfg.title || "성진프린트 상담"}
          </div>
          {status.isOpen ? (
            <div className="pv-consult-status">
              <span className="pv-consult-dot" />
              상담 가능
            </div>
          ) : (
            <div className="pv-consult-status offline">
              <span className="pv-consult-dot offline" />
              {status.nextOpen ? `${status.nextOpen}에 상담 가능` : "상담 불가"}
            </div>
          )}
        </div>
      </div>

      <div className="pv-consult-bubble">
        <strong>안녕하세요! 👋</strong>
        {cfg.message || ""}
      </div>

      {faqs.length > 0 && (
        <div className="pv-consult-replies">
          {faqs.map((faq) => (
            <div key={faq.id} className="pv-consult-faq-item">
              <button
                type="button"
                className={`pv-consult-reply${openFaq === faq.id ? " active" : ""}`}
                onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
              >
                <span>
                  {faq.emoji}&nbsp;&nbsp;{faq.text}
                </span>
                <svg
                  className={`pv-consult-chevron${openFaq === faq.id ? " open" : ""}`}
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M4 6l4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {openFaq === faq.id && faq.answer && (
                <div className="pv-consult-answer">{faq.answer}</div>
              )}
            </div>
          ))}
        </div>
      )}

      <a
        href={cfg.kakaoUrl || "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="pv-consult-cta"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
          <path d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.95 5.29 4.84 6.68-.2.97-.72 3.04-.76 3.23 0 0-.01.09.05.13.06.04.13.02.13.02.18-.03 2.15-1.42 3.04-2.1.87.14 1.78.21 2.7.21 5.52 0 10-3.58 10-8C22 6.58 17.52 3 12 3z" />
        </svg>
        {cfg.ctaText || "카카오톡으로 상담하기"}
      </a>
    </div>
  );
}

function PreviewBlockInner({
  block,
  customer,
  setCustomer,
  qtyPrices,
  linkStatus,
  handleFoldSelect,
  productType,
  dbPapers = {},
  dbPapersList = [],
  allBlocks = [],
  thicknessError = false,
  dbSizes,
  designCover = null,
}) {
  const cfg = block.config;
  const isDisabled = block.locked;

  switch (block.type) {
    case "size": {
      const sizeMode = cfg.mode || "preset";
      const allSizes = dbSizes || DB.sizeMultipliers;
      const selectedSizeInfo = allSizes[customer.size];
      const bleed = cfg.bleed ?? 2;

      // 현재 치수 (preset 또는 custom 입력값)
      const curWidth =
        sizeMode === "custom"
          ? customer.customWidth || 0
          : selectedSizeInfo?.width || 0;
      const curHeight =
        sizeMode === "custom"
          ? customer.customHeight || 0
          : selectedSizeInfo?.height || 0;
      const bleedWidth = curWidth + bleed * 2;
      const bleedHeight = curHeight + bleed * 2;

      // custom 모드: 합계 검증
      const customSum =
        (customer.customWidth || 0) + (customer.customHeight || 0);
      const selectedCustomOpt = (cfg.customOptions || []).find(
        (o) => customer.size === `custom_${o.maxSum}`
      );
      const maxPrintW = 305;
      const maxPrintH = 455;
      const customSizeOverMax =
        sizeMode === "custom" &&
        customer.customWidth &&
        customer.customHeight &&
        (Math.min(customer.customWidth, customer.customHeight) > maxPrintW ||
          Math.max(customer.customWidth, customer.customHeight) > maxPrintH);
      const customSumOver =
        sizeMode === "custom" &&
        selectedCustomOpt &&
        customSum > selectedCustomOpt.maxSum;

      return (
        <div className="pv-block">
          <p className="pv-block-label">{block.label}</p>

          {/* preset 모드: 기존 버튼 */}
          {sizeMode === "preset" && (
            <>
              <div className="pv-btn-row">
                {cfg.options?.map((s) => (
                  <button
                    key={s}
                    disabled={isDisabled}
                    className={`pv-btn ${customer.size === s ? "active" : ""} ${isDisabled ? "disabled" : ""}`}
                    onClick={() =>
                      !isDisabled &&
                      setCustomer((prev) => ({ ...prev, size: s }))
                    }
                  >
                    {allSizes[s]?.name || s.toUpperCase()}
                  </button>
                ))}
              </div>
              {/* 치수는 파일 작업 방식 카드 안에서 표시 */}
            </>
          )}

          {/* custom 모드: 구간 선택 + 직접 입력 */}
          {sizeMode === "custom" && (
            <>
              <div className="pv-btn-row">
                {(cfg.customOptions || []).map((opt) => {
                  const code = `custom_${opt.maxSum}`;
                  return (
                    <button
                      key={code}
                      disabled={isDisabled}
                      className={`pv-btn ${customer.size === code ? "active" : ""} ${isDisabled ? "disabled" : ""}`}
                      onClick={() =>
                        !isDisabled &&
                        setCustomer((prev) => ({ ...prev, size: code }))
                      }
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* 가로/세로 직접 입력 */}
              {customer.size?.startsWith("custom_") && (
                <div className="pv-size-input-section">
                  <p className="pv-size-input-label">
                    실제 사이즈를 입력해 주세요:
                  </p>
                  <div className="pv-size-input-row">
                    <label className="pv-size-input-field">
                      <span>가로</span>
                      <input
                        type="number"
                        value={customer.customWidth || ""}
                        placeholder="mm"
                        min={10}
                        onChange={(e) =>
                          setCustomer((prev) => ({
                            ...prev,
                            customWidth: Number(e.target.value),
                          }))
                        }
                      />
                      <span>mm</span>
                    </label>
                    <span className="pv-size-input-x">×</span>
                    <label className="pv-size-input-field">
                      <span>세로</span>
                      <input
                        type="number"
                        value={customer.customHeight || ""}
                        placeholder="mm"
                        min={10}
                        onChange={(e) =>
                          setCustomer((prev) => ({
                            ...prev,
                            customHeight: Number(e.target.value),
                          }))
                        }
                      />
                      <span>mm</span>
                    </label>
                  </div>
                  {/* 합계 표시 */}
                  {customer.customWidth > 0 && customer.customHeight > 0 && (
                    <p
                      className={`pv-size-sum ${customSumOver ? "error" : ""}`}
                    >
                      가로+세로 합: {customSum}mm
                      {selectedCustomOpt &&
                        (customSumOver
                          ? ` (${selectedCustomOpt.maxSum}mm 초과)`
                          : ` (${selectedCustomOpt.maxSum}mm 이내 ✓)`)}
                    </p>
                  )}
                  {/* 인쇄 가능 영역 초과 경고 */}
                  {customSizeOverMax && (
                    <p className="pv-size-sum error">
                      인쇄 가능한 최대 크기(305×455mm)를 초과합니다.
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* 재단 상품 주의사항 */}
          {cfg.trimEnabled &&
            customer.size &&
            curWidth > 0 &&
            curHeight > 0 && (
              <div className="pv-trim-notice">
                <div className="pv-trim-notice-size">
                  {selectedSizeInfo?.name || customer.size} ({curWidth}×
                  {curHeight}mm)
                  {" / "}재단 여백 포함 시 {bleedWidth}×{bleedHeight}mm
                </div>
                <div className="pv-trim-notice-body">
                  <p className="pv-trim-notice-title">주의사항</p>
                  {renderNoticeBody(cfg.trimNotice) || (
                    <ul>
                      <li>
                        재단 여백({bleed}mm)을 포함한 사이즈로 제공해 주시면
                        가장 좋아요
                      </li>
                      <li>
                        정사이즈({curWidth}×{curHeight}mm) 파일 제공 시,
                        가장자리에 이미지가 닿아 있으면 살짝 확대 후 재단하며
                        1~2mm 잘릴 수 있어요
                      </li>
                      <li>
                        선택한 사이즈와 다른 파일은 비율에 맞게 조정하며, 여백이
                        생기거나 일부가 잘릴 수 있어요
                      </li>
                    </ul>
                  )}
                </div>
              </div>
            )}
        </div>
      );
    }

    case "paper": {
      const role = getPaperBlockRole(block, allBlocks);
      const paperField =
        role === "cover"
          ? "coverPaper"
          : role === "inner"
            ? "innerPaper"
            : "paper";
      const weightField =
        role === "cover"
          ? "coverWeight"
          : role === "inner"
            ? "innerWeight"
            : "weight";

      const handlePaperSelect = (code, w) => {
        if (isDisabled) return;
        setCustomer((prev) => ({
          ...prev,
          [paperField]: code,
          [weightField]: w,
        }));
      };

      // 커스텀 용지 모드 (외주블록용)
      if (cfg.customPapers) {
        return (
          <div className="pv-block">
            <p className="pv-block-label">{block.label}</p>
            <div className="pv-paper-list">
              {cfg.customPapers.map((cp) => {
                const isSelected = customer[paperField] === cp.id;
                return (
                  <div
                    key={cp.id}
                    className={`pv-paper-item ${isSelected ? "active" : ""} ${isDisabled ? "disabled" : ""}`}
                    onClick={() =>
                      handlePaperSelect(cp.id, cp.weights?.[0] || 0)
                    }
                  >
                    <div className="pv-paper-thumb">
                      {cp.image ? (
                        <img
                          src={cp.image}
                          alt={cp.name}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div
                          className="pv-paper-swatch"
                          style={{ background: DEFAULT_PAPER_SWATCH }}
                        />
                      )}
                    </div>
                    <div className="pv-paper-info">
                      <p
                        className={`pv-paper-name ${isSelected ? "active" : ""}`}
                      >
                        {cp.name}
                      </p>
                    </div>
                    {(cp.weights || []).length > 0 && (
                      <div className="pv-weight-btns">
                        {cp.weights.map((w) => (
                          <button
                            key={w}
                            disabled={isDisabled}
                            className={`pv-weight-btn ${isSelected && customer[weightField] === w ? "active" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePaperSelect(cp.id, w);
                            }}
                          >
                            {w}g
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      // 기존 DB 용지 모드
      return (
        <div className="pv-block">
          <p className="pv-block-label">{block.label}</p>
          <div className="pv-paper-list">
            {Object.entries(cfg.papers || {}).map(([code, weights]) => {
              const paper =
                dbPapersList.find((p) => p.code === code) ||
                DB.papers.find((p) => p.code === code);
              if (!paper || !weights.length) return null;
              const isSelected = customer[paperField] === code;
              return (
                <div
                  key={code}
                  className={`pv-paper-item ${isSelected ? "active" : ""} ${isDisabled ? "disabled" : ""}`}
                  onClick={() => handlePaperSelect(code, weights[0])}
                >
                  <div className="pv-paper-thumb">
                    {dbPapers[code]?.image_url ? (
                      <img
                        src={dbPapers[code].image_url}
                        alt={dbPapers[code]?.name || paper.name}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div
                        className="pv-paper-swatch"
                        style={{
                          background:
                            PAPER_SWATCH_GRADIENTS[code] ||
                            DEFAULT_PAPER_SWATCH,
                        }}
                      />
                    )}
                  </div>
                  <div className="pv-paper-info">
                    <p
                      className={`pv-paper-name ${isSelected ? "active" : ""}`}
                    >
                      {dbPapers[code]?.name || paper.name}
                    </p>
                    <p className="pv-paper-desc">
                      {dbPapers[code]?.desc || paper.desc}
                    </p>
                  </div>
                  <div className="pv-weight-btns">
                    {weights.map((w) => (
                      <button
                        key={w}
                        disabled={isDisabled}
                        className={`pv-weight-btn ${isSelected && customer[weightField] === w ? "active" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePaperSelect(code, w);
                        }}
                      >
                        {w}g
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    case "pp":
      return (
        <div className="pv-block">
          <p className="pv-block-label">{block.label}</p>
          <div className="pv-btn-row">
            {cfg.options?.map((o) => (
              <button
                key={o}
                disabled={isDisabled}
                className={`pv-btn ${customer.pp === o ? "active" : ""}`}
                onClick={() =>
                  !isDisabled && setCustomer((prev) => ({ ...prev, pp: o }))
                }
              >
                {o === "clear" ? "투명" : o === "frosted" ? "불투명" : "없음"}
              </button>
            ))}
          </div>
        </div>
      );

    case "cover_print":
      return (
        <div className="pv-block">
          <p className="pv-block-label">{block.label}</p>
          <div className="pv-btn-row" style={{ marginBottom: "0.75rem" }}>
            {cfg.options?.map((o) => (
              <button
                key={o}
                disabled={isDisabled}
                className={`pv-btn ${customer.coverPrint === o ? "active" : ""}`}
                onClick={() =>
                  !isDisabled &&
                  setCustomer((prev) => ({ ...prev, coverPrint: o }))
                }
              >
                {o === "none"
                  ? "없음"
                  : o === "front_only"
                    ? "앞표지만"
                    : "앞뒤표지"}
              </button>
            ))}
          </div>
          {customer.coverPrint !== "none" && cfg.papers && (
            <div className="pv-sub-section">
              <p className="pv-sub-label">표지 용지</p>
              <div className="pv-paper-list">
                {Object.entries(cfg.papers).map(([code, weights]) => {
                  const paper =
                    dbPapersList.find((p) => p.code === code) ||
                    DB.papers.find((p) => p.code === code);
                  if (!paper || !weights.length) return null;
                  const isSelected = customer.coverPaper === code;
                  return (
                    <div
                      key={code}
                      className={`pv-paper-item compact ${isSelected ? "active" : ""}`}
                      onClick={() =>
                        setCustomer((prev) => ({
                          ...prev,
                          coverPaper: code,
                          coverWeight: weights[0],
                        }))
                      }
                    >
                      <span
                        className={`pv-paper-name ${isSelected ? "active" : ""}`}
                      >
                        {paper.name}
                      </span>
                      <div className="pv-weight-btns">
                        {weights.map((w) => (
                          <button
                            key={w}
                            className={`pv-weight-btn ${isSelected && customer.coverWeight === w ? "active" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCustomer((prev) => ({
                                ...prev,
                                coverPaper: code,
                                coverWeight: w,
                              }));
                            }}
                          >
                            {w}g
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );

    case "print": {
      const isBinding = ["saddle", "perfect", "spring"].includes(productType);
      const isInner =
        isBinding &&
        allBlocks.some((b) => b.config?.linkedBlocks?.innerPrint === block.id);
      const colorKey = isInner ? "innerColor" : "color";
      const sideKey = isInner ? "innerSide" : "side";
      return (
        <div className="pv-block">
          <p className="pv-block-label">{block.label}</p>
          <div className="pv-btn-row">
            {cfg.color && (
              <button
                disabled={isDisabled}
                className={`pv-btn flex-1 ${customer[colorKey] === "color" ? "active" : ""}`}
                onClick={() =>
                  !isDisabled &&
                  setCustomer((prev) => ({ ...prev, [colorKey]: "color" }))
                }
              >
                컬러
              </button>
            )}
            {cfg.mono && (
              <button
                disabled={isDisabled}
                className={`pv-btn flex-1 ${customer[colorKey] === "mono" ? "active" : ""}`}
                onClick={() =>
                  !isDisabled &&
                  setCustomer((prev) => ({ ...prev, [colorKey]: "mono" }))
                }
              >
                흑백
              </button>
            )}
            {cfg.single && (
              <button
                disabled={isDisabled}
                className={`pv-btn flex-1 ${customer[sideKey] === "single" ? "active" : ""}`}
                onClick={() =>
                  !isDisabled &&
                  setCustomer((prev) => ({ ...prev, [sideKey]: "single" }))
                }
              >
                단면
              </button>
            )}
            {cfg.double && (
              <button
                disabled={isDisabled}
                className={`pv-btn flex-1 ${customer[sideKey] === "double" ? "active" : ""}`}
                onClick={() =>
                  !isDisabled &&
                  setCustomer((prev) => ({ ...prev, [sideKey]: "double" }))
                }
              >
                양면
              </button>
            )}
          </div>
        </div>
      );
    }

    case "finishing": {
      // 코팅 평량 판정 → blockDefaults.getCoatingWeight() 단일 함수 사용
      const currentWeight = getCoatingWeight(allBlocks, customer, productType);
      const coatingValidation = validateCoatingWeight(currentWeight);
      const isCoatingDisabled = !coatingValidation.valid;

      return (
        <div className="pv-block">
          <p className="pv-block-label">{block.label}</p>
          <div className="pv-finishing-list">
            {/* 코팅 */}
            {cfg.coating?.enabled && (
              <div
                className={`pv-finishing-row ${customer.finishing?.coating ? "expanded" : ""} ${isCoatingDisabled ? "disabled" : ""}`}
              >
                <div
                  className="pv-finishing-toggle"
                  onClick={() =>
                    !isCoatingDisabled &&
                    setCustomer((prev) => ({
                      ...prev,
                      finishing: {
                        ...prev.finishing,
                        coating: !prev.finishing?.coating,
                        coatingType: !prev.finishing?.coating
                          ? prev.finishing?.coatingType || "matte"
                          : null,
                        coatingSide: !prev.finishing?.coating
                          ? prev.finishing?.coatingSide || "single"
                          : null,
                      },
                    }))
                  }
                >
                  <span className="pv-finishing-name">코팅</span>
                  <span className="pv-finishing-icon" aria-hidden="true" />
                </div>
                {customer.finishing?.coating && !isCoatingDisabled && (
                  <div className="pv-finishing-options">
                    <div className="pv-opt-group">
                      {(cfg.coating?.matte ?? true) && (
                        <button
                          className={`pv-opt-btn ${customer.finishing?.coatingType === "matte" ? "active" : ""}`}
                          onClick={() =>
                            setCustomer((prev) => ({
                              ...prev,
                              finishing: {
                                ...prev.finishing,
                                coatingType: "matte",
                              },
                            }))
                          }
                        >
                          무광
                        </button>
                      )}
                      {(cfg.coating?.gloss ?? true) && (
                        <button
                          className={`pv-opt-btn ${customer.finishing?.coatingType === "gloss" ? "active" : ""}`}
                          onClick={() =>
                            setCustomer((prev) => ({
                              ...prev,
                              finishing: {
                                ...prev.finishing,
                                coatingType: "gloss",
                              },
                            }))
                          }
                        >
                          유광
                        </button>
                      )}
                    </div>
                    <span className="pv-opt-divider">|</span>
                    <div className="pv-opt-group">
                      {(cfg.coating?.single ?? true) && (
                        <button
                          className={`pv-opt-btn ${customer.finishing?.coatingSide === "single" ? "active" : ""}`}
                          onClick={() =>
                            setCustomer((prev) => ({
                              ...prev,
                              finishing: {
                                ...prev.finishing,
                                coatingSide: "single",
                              },
                            }))
                          }
                        >
                          단면
                        </button>
                      )}
                      {(cfg.coating?.double ?? true) && (
                        <button
                          className={`pv-opt-btn ${customer.finishing?.coatingSide === "double" ? "active" : ""}`}
                          onClick={() =>
                            setCustomer((prev) => ({
                              ...prev,
                              finishing: {
                                ...prev.finishing,
                                coatingSide: "double",
                              },
                            }))
                          }
                        >
                          양면
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {isCoatingDisabled && (
                  <span className="pv-finishing-hint">
                    {coatingValidation.message}
                  </span>
                )}
              </div>
            )}

            {/* 오시 */}
            {cfg.osi?.enabled && (
              <div
                className={`pv-finishing-row ${customer.finishing?.osiEnabled ? "expanded" : ""}`}
              >
                <div
                  className="pv-finishing-toggle"
                  onClick={() =>
                    setCustomer((prev) => ({
                      ...prev,
                      finishing: {
                        ...prev.finishing,
                        osiEnabled: !prev.finishing?.osiEnabled,
                        osi: !prev.finishing?.osiEnabled
                          ? prev.finishing?.osi || 1
                          : null,
                      },
                    }))
                  }
                >
                  <span className="pv-finishing-name">오시</span>
                  <span className="pv-finishing-icon" aria-hidden="true" />
                </div>
                {customer.finishing?.osiEnabled && (
                  <div className="pv-finishing-options">
                    <div className="pv-opt-group">
                      {(cfg.osi?.options || [1, 2, 3]).map((n) => (
                        <button
                          key={n}
                          className={`pv-opt-btn ${customer.finishing?.osi === n ? "active" : ""}`}
                          onClick={() =>
                            setCustomer((prev) => ({
                              ...prev,
                              finishing: { ...prev.finishing, osi: n },
                            }))
                          }
                        >
                          {n}줄
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 접지 */}
            {cfg.fold?.enabled && (
              <div
                className={`pv-finishing-row ${customer.finishing?.foldEnabled ? "expanded" : ""}`}
              >
                <div
                  className="pv-finishing-toggle"
                  onClick={() =>
                    handleFoldSelect(customer.finishing?.fold || 2, cfg)
                  }
                >
                  <span className="pv-finishing-name">접지</span>
                  <span className="pv-finishing-icon" aria-hidden="true" />
                </div>
                {customer.finishing?.foldEnabled && (
                  <div className="pv-finishing-options">
                    <div className="pv-opt-group">
                      {(cfg.fold?.options || [2, 3, 4]).map((n) => (
                        <button
                          key={n}
                          className={`pv-opt-btn ${customer.finishing?.fold === n ? "active" : ""}`}
                          onClick={() => handleFoldSelect(n, cfg)}
                        >
                          {n}단
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 귀도리 */}
            {cfg.corner && (
              <div
                className={`pv-finishing-row ${customer.finishing?.corner ? "expanded" : ""}`}
              >
                <div
                  className="pv-finishing-toggle"
                  onClick={() =>
                    setCustomer((prev) => ({
                      ...prev,
                      finishing: {
                        ...prev.finishing,
                        corner: !prev.finishing?.corner,
                      },
                    }))
                  }
                >
                  <span className="pv-finishing-name">귀도리</span>
                  <span className="pv-finishing-icon" aria-hidden="true" />
                </div>
              </div>
            )}

            {/* 타공 */}
            {cfg.punch && (
              <div
                className={`pv-finishing-row ${customer.finishing?.punch ? "expanded" : ""}`}
              >
                <div
                  className="pv-finishing-toggle"
                  onClick={() =>
                    setCustomer((prev) => ({
                      ...prev,
                      finishing: {
                        ...prev.finishing,
                        punch: !prev.finishing?.punch,
                      },
                    }))
                  }
                >
                  <span className="pv-finishing-name">타공</span>
                  <span className="pv-finishing-icon" aria-hidden="true" />
                </div>
              </div>
            )}

            {/* 미싱 */}
            {cfg.mising && (
              <div
                className={`pv-finishing-row ${customer.finishing?.mising ? "expanded" : ""}`}
              >
                <div
                  className="pv-finishing-toggle"
                  onClick={() =>
                    setCustomer((prev) => ({
                      ...prev,
                      finishing: {
                        ...prev.finishing,
                        mising: !prev.finishing?.mising,
                      },
                    }))
                  }
                >
                  <span className="pv-finishing-name">미싱</span>
                  <span className="pv-finishing-icon" aria-hidden="true" />
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    case "back":
      if (linkStatus?.backDisabled) {
        return (
          <div className="pv-block opacity-50">
            <p className="pv-block-label">
              {block.label}{" "}
              <span className="text-xs">(앞뒤표지 선택으로 비활성화)</span>
            </p>
            <div className="pv-block-disabled-msg">
              <p>앞뒤표지 인쇄 선택 시 뒷판이 필요하지 않습니다.</p>
            </div>
          </div>
        );
      }
      return (
        <div className="pv-block">
          <p className="pv-block-label">{block.label}</p>
          <div className="pv-btn-row">
            {cfg.options?.map((o) => (
              <button
                key={o}
                disabled={isDisabled}
                className={`pv-btn ${customer.back === o ? "active" : ""} ${isDisabled ? "disabled" : ""}`}
                onClick={() =>
                  !isDisabled && setCustomer((prev) => ({ ...prev, back: o }))
                }
              >
                {o === "white" ? "화이트" : o === "black" ? "블랙" : "없음"}
              </button>
            ))}
          </div>
        </div>
      );

    case "spring_color":
      return (
        <div className="pv-block">
          <p className="pv-block-label">{block.label}</p>
          <div className="pv-btn-row">
            {cfg.options?.map((o) => (
              <button
                key={o}
                disabled={isDisabled}
                className={`pv-btn ${customer.springColor === o ? "active" : ""}`}
                onClick={() =>
                  !isDisabled &&
                  setCustomer((prev) => ({ ...prev, springColor: o }))
                }
              >
                {o === "black" ? "블랙" : "화이트"}
              </button>
            ))}
          </div>
        </div>
      );

    case "spring_options": {
      const {
        ppOptions,
        coverPrintOptions,
        backOptions,
        springColorOptions,
        coverPrintPapers,
      } = getSpringOptionsDefaults(cfg);

      // 연동 규칙은 blockDefaults.checkLinkRules()에서 관리 → linkStatus prop으로 전달됨
      const showCoverError = !!linkStatus?.error;
      const isBackDisabled = !!linkStatus?.backDisabled;

      return (
        <div className="pv-block">
          <p className="pv-block-label">{block.label}</p>
          {block.desc && <p className="pv-block-desc">{block.desc}</p>}
          <div className="pv-spring-options">
            {showCoverError && (
              <div className="pv-spring-error">
                <p>{linkStatus.error}</p>
              </div>
            )}

            {ppOptions.length > 0 && (
              <div className="pv-spring-row">
                <span className="pv-spring-label">PP</span>
                <div className="pv-radio-group">
                  {ppOptions
                    .filter((o) => o.enabled !== false)
                    .map((opt) => (
                      <label key={opt.id} className="pv-radio">
                        <input
                          type="radio"
                          name="pp"
                          checked={customer.pp === opt.id}
                          disabled={isDisabled}
                          onChange={() =>
                            !isDisabled &&
                            setCustomer((prev) => ({ ...prev, pp: opt.id }))
                          }
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                </div>
              </div>
            )}

            <div className="pv-spring-selects">
              {coverPrintOptions.length > 0 && (
                <div>
                  <label className="pv-select-label">표지인쇄</label>
                  <select
                    value={customer.coverPrint || ""}
                    disabled={isDisabled}
                    onChange={(e) =>
                      !isDisabled &&
                      setCustomer((prev) => ({
                        ...prev,
                        coverPrint: e.target.value,
                      }))
                    }
                    className="pv-select"
                  >
                    {coverPrintOptions
                      .filter((o) => o.enabled !== false)
                      .map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                  </select>
                </div>
              )}
              {backOptions.length > 0 && (
                <div className={isBackDisabled ? "opacity-50" : ""}>
                  <label className="pv-select-label">
                    뒷판 {isBackDisabled && <span>(자동)</span>}
                  </label>
                  <select
                    value={customer.back || ""}
                    disabled={isDisabled || isBackDisabled}
                    onChange={(e) =>
                      !isDisabled &&
                      !isBackDisabled &&
                      setCustomer((prev) => ({ ...prev, back: e.target.value }))
                    }
                    className="pv-select"
                  >
                    {backOptions
                      .filter((o) => o.enabled !== false)
                      .map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                  </select>
                </div>
              )}
              {springColorOptions.length > 0 && (
                <div>
                  <label className="pv-select-label">스프링색상</label>
                  <select
                    value={customer.springColor || ""}
                    disabled={isDisabled}
                    onChange={(e) =>
                      !isDisabled &&
                      setCustomer((prev) => ({
                        ...prev,
                        springColor: e.target.value,
                      }))
                    }
                    className="pv-select"
                  >
                    {springColorOptions
                      .filter((o) => o.enabled !== false)
                      .map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            {customer.coverPrint !== "none" &&
              Object.keys(coverPrintPapers).length > 0 && (
                <div className="pv-sub-section">
                  <p className="pv-sub-label">표지 용지 선택</p>
                  <div className="pv-btn-row" style={{ flexWrap: "wrap" }}>
                    {Object.entries(coverPrintPapers).map(([code, weights]) => {
                      const paper =
                        dbPapersList.find((p) => p.code === code) ||
                        DB.papers.find((p) => p.code === code);
                      if (!paper || !weights.length) return null;
                      return weights.map((w) => (
                        <button
                          key={`${code}-${w}`}
                          className={`pv-btn-sm ${customer.coverPaper === code && customer.coverWeight === w ? "active" : ""}`}
                          onClick={() =>
                            setCustomer((prev) => ({
                              ...prev,
                              coverPaper: code,
                              coverWeight: w,
                            }))
                          }
                        >
                          {paper.name} {w}g
                        </button>
                      ));
                    })}
                  </div>
                </div>
              )}
          </div>
        </div>
      );
    }

    case "delivery": {
      // cfg.options에서 설정 가져오기 (고정 ID만)
      const getOptionConfig = (id) => cfg.options?.find((o) => o.id === id);

      // 고정 4개 옵션 기반으로 활성화된 것만 필터
      const activeOptions = FIXED_DELIVERY_OPTIONS.map((fixed) => {
        const cfgOpt = getOptionConfig(fixed.id);
        return {
          id: fixed.id,
          label: fixed.label,
          days: fixed.days,
          enabled: cfgOpt?.enabled ?? true,
          percent: cfgOpt?.percent ?? fixed.defaultPercent,
        };
      }).filter((opt) => opt.enabled);

      return (
        <div className="pv-block">
          <p className="pv-block-label">출고일</p>
          <div className="pv-delivery-row">
            {activeOptions.map((opt) => {
              const date = getBusinessDate(opt.days);
              const dateStr = formatBusinessDate(date);

              return (
                <button
                  key={opt.id}
                  className={`pv-delivery-btn ${customer.delivery === opt.id ? "active" : ""}`}
                  onClick={() =>
                    setCustomer((prev) => ({
                      ...prev,
                      delivery: opt.id,
                      deliveryDays: opt.days,
                      deliveryPercent: opt.percent,
                      deliveryDate: dateStr,
                    }))
                  }
                >
                  <p className="pv-delivery-date">{dateStr}</p>
                  <p
                    className={`pv-delivery-percent ${opt.percent > 0 ? "up" : opt.percent < 0 ? "down" : ""}`}
                  >
                    {opt.percent > 0
                      ? `+${opt.percent}%`
                      : opt.percent < 0
                        ? `${opt.percent}%`
                        : "기준가"}
                  </p>
                </button>
              );
            })}
          </div>
          {(() => {
            const selectedOpt = cfg.options?.find(
              (o) => o.id === customer.delivery
            );
            return selectedOpt?.message ? (
              <p className="pv-delivery-warning">{selectedOpt.message}</p>
            ) : null;
          })()}
        </div>
      );
    }

    case "pages_saddle":
    case "pages_leaf":
    case "pages": {
      // 페이지 입력값 검증 (최소값, step 배수)
      const validatePages = (value) => {
        let pages = parseInt(value) || cfg.min;
        pages = Math.max(cfg.min, pages);
        // step 배수로 맞춤
        const remainder = (pages - cfg.min) % cfg.step;
        if (remainder !== 0) {
          pages = pages - remainder + cfg.step;
        }
        return pages;
      };
      return (
        <div className={`pv-block ${thicknessError ? "pv-block-error" : ""}`}>
          <p className="pv-block-label">페이지 수</p>
          <div
            className={`pv-pages-row ${thicknessError ? "pv-pages-error" : ""}`}
          >
            <button
              disabled={isDisabled}
              className="pv-pages-btn"
              onClick={() =>
                !isDisabled &&
                setCustomer((prev) => ({
                  ...prev,
                  pages: Math.max(cfg.min, prev.pages - cfg.step),
                }))
              }
            >
              −
            </button>
            <div className="pv-pages-val">
              <input
                type="number"
                disabled={isDisabled}
                className={`pv-pages-input ${thicknessError ? "pv-pages-input-error" : ""}`}
                value={customer.pages}
                min={cfg.min}
                step={cfg.step}
                onChange={(e) =>
                  !isDisabled &&
                  setCustomer((prev) => ({
                    ...prev,
                    pages: parseInt(e.target.value) || cfg.min,
                  }))
                }
                onBlur={(e) =>
                  !isDisabled &&
                  setCustomer((prev) => ({
                    ...prev,
                    pages: validatePages(e.target.value),
                  }))
                }
              />
              <span
                className={`pv-pages-unit ${thicknessError ? "pv-pages-unit-error" : ""}`}
              >
                p
              </span>
            </div>
            <button
              disabled={isDisabled}
              className="pv-pages-btn"
              onClick={() =>
                !isDisabled &&
                setCustomer((prev) => ({
                  ...prev,
                  pages: prev.pages + cfg.step,
                }))
              }
            >
              +
            </button>
          </div>
        </div>
      );
    }

    case "inner_layer_saddle":
    case "inner_layer_leaf": {
      // 페이지 입력값 검증 (최소값, step 배수)
      const validateInnerPages = (value) => {
        const minPages = cfg.min || 4;
        const stepPages = cfg.step || 2;
        let pages = parseInt(value) || minPages;
        pages = Math.max(minPages, pages);
        const remainder = (pages - minPages) % stepPages;
        if (remainder !== 0) {
          pages = pages - remainder + stepPages;
        }
        return pages;
      };

      return (
        <div className={`pv-block ${thicknessError ? "pv-block-error" : ""}`}>
          <p className="pv-block-label">{block.label}</p>

          {/* 내지 용지 - paper 블록과 동일한 스타일 */}
          {!cfg.paperHidden && (
            <div className="pv-paper-list">
              {Object.entries(cfg.papers || {}).map(([code, weights]) => {
                const paper =
                  dbPapersList.find((p) => p.code === code) ||
                  DB.papers.find((p) => p.code === code);
                if (!paper || !weights.length) return null;
                const isSelected = customer.innerPaper === code;
                return (
                  <div
                    key={code}
                    className={`pv-paper-item ${isSelected ? "active" : ""} ${cfg.paperLocked ? "disabled" : ""}`}
                    onClick={() =>
                      !cfg.paperLocked &&
                      setCustomer((prev) => ({
                        ...prev,
                        innerPaper: code,
                        innerWeight: weights[0],
                      }))
                    }
                  >
                    <div className="pv-paper-thumb">
                      {dbPapers[code]?.image_url ? (
                        <img
                          src={dbPapers[code].image_url}
                          alt={dbPapers[code]?.name || paper.name}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div
                          className="pv-paper-swatch"
                          style={{
                            background:
                              PAPER_SWATCH_GRADIENTS[code] ||
                              DEFAULT_PAPER_SWATCH,
                          }}
                        />
                      )}
                    </div>
                    <div className="pv-paper-info">
                      <p
                        className={`pv-paper-name ${isSelected ? "active" : ""}`}
                      >
                        {dbPapers[code]?.name || paper.name}
                      </p>
                      <p className="pv-paper-desc">
                        {dbPapers[code]?.desc || paper.desc}
                      </p>
                    </div>
                    <div className="pv-weight-btns">
                      {weights.map((w) => (
                        <button
                          key={w}
                          disabled={cfg.paperLocked}
                          className={`pv-weight-btn ${isSelected && customer.innerWeight === w ? "active" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            !cfg.paperLocked &&
                              setCustomer((prev) => ({
                                ...prev,
                                innerPaper: code,
                                innerWeight: w,
                              }));
                          }}
                        >
                          {w}g
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 인쇄 옵션 - 라벨 없이 버튼만 표시, 개수에 따라 자동 조절 */}
          <div className="pv-btn-row" style={{ marginTop: "0.75rem" }}>
            {!cfg.printColorHidden && cfg.color && (
              <button
                disabled={cfg.printColorLocked}
                className={`pv-btn flex-1 ${customer.innerColor === "color" ? "active" : ""}`}
                onClick={() =>
                  !cfg.printColorLocked &&
                  setCustomer((prev) => ({ ...prev, innerColor: "color" }))
                }
              >
                컬러
              </button>
            )}
            {!cfg.printColorHidden && cfg.mono && (
              <button
                disabled={cfg.printColorLocked}
                className={`pv-btn flex-1 ${customer.innerColor === "mono" ? "active" : ""}`}
                onClick={() =>
                  !cfg.printColorLocked &&
                  setCustomer((prev) => ({ ...prev, innerColor: "mono" }))
                }
              >
                흑백
              </button>
            )}
            {!cfg.printSideHidden && cfg.single && (
              <button
                disabled={cfg.printSideLocked}
                className={`pv-btn flex-1 ${customer.innerSide === "single" ? "active" : ""}`}
                onClick={() =>
                  !cfg.printSideLocked &&
                  setCustomer((prev) => ({ ...prev, innerSide: "single" }))
                }
              >
                단면
              </button>
            )}
            {!cfg.printSideHidden && cfg.double && (
              <button
                disabled={cfg.printSideLocked}
                className={`pv-btn flex-1 ${customer.innerSide === "double" ? "active" : ""}`}
                onClick={() =>
                  !cfg.printSideLocked &&
                  setCustomer((prev) => ({ ...prev, innerSide: "double" }))
                }
              >
                양면
              </button>
            )}
          </div>

          {/* 페이지 수 - pages 블록과 동일한 스타일 (입력 필드 포함) */}
          {!cfg.pagesHidden && (
            <div
              className={`pv-pages-row ${thicknessError ? "pv-pages-error" : ""}`}
              style={{ marginTop: "0.75rem" }}
            >
              <button
                disabled={cfg.pagesLocked}
                className="pv-pages-btn"
                onClick={() =>
                  !cfg.pagesLocked &&
                  setCustomer((prev) => ({
                    ...prev,
                    pages: Math.max(cfg.min || 4, prev.pages - (cfg.step || 2)),
                  }))
                }
              >
                −
              </button>
              <div className="pv-pages-val">
                <input
                  type="number"
                  disabled={cfg.pagesLocked}
                  className={`pv-pages-input ${thicknessError ? "pv-pages-input-error" : ""}`}
                  value={customer.pages || cfg.defaultPages || cfg.min}
                  min={cfg.min || 4}
                  step={cfg.step || 2}
                  onChange={(e) =>
                    !cfg.pagesLocked &&
                    setCustomer((prev) => ({
                      ...prev,
                      pages: parseInt(e.target.value) || cfg.min || 4,
                    }))
                  }
                  onBlur={(e) =>
                    !cfg.pagesLocked &&
                    setCustomer((prev) => ({
                      ...prev,
                      pages: validateInnerPages(e.target.value),
                    }))
                  }
                />
                <span
                  className={`pv-pages-unit ${thicknessError ? "pv-pages-unit-error" : ""}`}
                >
                  p
                </span>
              </div>
              <button
                disabled={cfg.pagesLocked}
                className="pv-pages-btn"
                onClick={() =>
                  !cfg.pagesLocked &&
                  setCustomer((prev) => ({
                    ...prev,
                    pages:
                      (customer.pages || cfg.defaultPages || cfg.min || 4) +
                      (cfg.step || 2),
                  }))
                }
              >
                +
              </button>
            </div>
          )}
        </div>
      );
    }

    case "quantity": {
      const isCustomQty =
        cfg.allowCustom &&
        customer.qty > 0 &&
        !cfg.options?.includes(customer.qty);
      const qtyMin = cfg.min ?? 10;
      const qtyMax = cfg.max ?? 5000;

      // 프리셋 + 커스텀 수량을 정렬 병합
      const displayQtys = isCustomQty
        ? [...(cfg.options || []), customer.qty].sort((a, b) => a - b)
        : [...(cfg.options || [])];

      return (
        <div className="pv-block">
          <p className="pv-block-label">{block.label || "수량"}</p>
          <QuantityTable
            displayQtys={displayQtys}
            isCustomQty={isCustomQty}
            customer={customer}
            setCustomer={setCustomer}
            qtyPrices={qtyPrices}
            qtyMin={qtyMin}
            qtyMax={qtyMax}
            cfg={cfg}
            productType={productType}
            allBlocks={allBlocks}
          />
        </div>
      );
    }

    case "consultation": {
      const faqs = cfg.faqs || [];
      return <ConsultationBlock cfg={cfg} faqs={faqs} />;
    }

    case "design_select": {
      const tiers = cfg.tiers || [];
      const designs = customer._designs || [];
      const selectedDesign = customer.selectedDesign;
      const designTier = customer.designTier || cfg.defaultTier || "type_a";

      return (
        <div className="pv-block-section">
          <DesignSelectBlock
            cfg={cfg}
            tiers={tiers}
            designs={designs}
            selectedDesign={selectedDesign}
            designTier={designTier}
            setCustomer={setCustomer}
          />
        </div>
      );
    }

    case "text_input": {
      const textInputs = customer.textInputs || {};
      const source = cfg.source || "manual";

      // cover 모드: designCover의 fields 기반 다중 입력
      if (source === "cover") {
        const coverFields = designCover?.fields || [];
        if (coverFields.length === 0) {
          return (
            <div className="pv-block">
              <p className="pv-block-label">{block.label}</p>
              <p className="text-xs text-gray-400">
                디자인을 선택하면 입력 필드가 표시됩니다.
              </p>
            </div>
          );
        }
        const fieldValues = textInputs[block.id] || {};
        const updateCoverField = (label, value) => {
          setCustomer((prev) => ({
            ...prev,
            textInputs: {
              ...(prev.textInputs || {}),
              [block.id]: {
                ...((prev.textInputs || {})[block.id] || {}),
                [label]: value,
              },
            },
          }));
        };
        return (
          <div className="pv-block">
            <style>{`.pv-book-input::placeholder { color: #d1d5db; }`}</style>
            <p className="pv-block-label">{block.label}</p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.625rem",
              }}
            >
              {coverFields.map((field) => {
                const ft = field.type || "text";
                const val = fieldValues[field.label] || "";
                if (ft === "color") {
                  return (
                    <div key={field.label}>
                      <label
                        style={{
                          fontSize: "0.8rem",
                          color: "#6b7280",
                          display: "block",
                          marginBottom: "0.375rem",
                        }}
                      >
                        {field.label}
                      </label>
                      <div
                        style={{
                          display: "flex",
                          gap: "0.5rem",
                          flexWrap: "wrap",
                        }}
                      >
                        {(field.options || []).map((hex) => (
                          <button
                            key={hex}
                            type="button"
                            onClick={() => updateCoverField(field.label, hex)}
                            style={{
                              width: "2rem",
                              height: "2rem",
                              borderRadius: "50%",
                              background: hex,
                              border:
                                val === hex
                                  ? "2.5px solid #222"
                                  : "2px solid #e5e7eb",
                              cursor: "pointer",
                              outline: val === hex ? "2px solid white" : "none",
                              outlineOffset: "-4px",
                            }}
                            title={hex}
                          />
                        ))}
                      </div>
                    </div>
                  );
                }
                if (ft === "select") {
                  return (
                    <div key={field.label}>
                      <label
                        style={{
                          fontSize: "0.8rem",
                          color: "#6b7280",
                          display: "block",
                          marginBottom: "0.375rem",
                        }}
                      >
                        {field.label}
                      </label>
                      <div
                        style={{
                          display: "flex",
                          gap: "0.375rem",
                          flexWrap: "wrap",
                        }}
                      >
                        {(field.options || []).map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => updateCoverField(field.label, opt)}
                            style={{
                              padding: "0.375rem 0.75rem",
                              borderRadius: "1.5rem",
                              border:
                                val === opt
                                  ? "1.5px solid #222"
                                  : "1px solid #d1d5db",
                              background: val === opt ? "#222" : "white",
                              color: val === opt ? "white" : "#374151",
                              fontSize: "0.8rem",
                              cursor: "pointer",
                            }}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={field.label}>
                    <label
                      style={{
                        fontSize: "0.8rem",
                        color: "#6b7280",
                        display: "block",
                        marginBottom: "0.375rem",
                      }}
                    >
                      {field.label}
                    </label>
                    <input
                      type="text"
                      value={val}
                      onChange={(e) =>
                        updateCoverField(field.label, e.target.value)
                      }
                      placeholder={
                        field.placeholder || `${field.label}을(를) 입력하세요`
                      }
                      className="pv-book-input"
                      style={{
                        width: "100%",
                        border: "1px solid #e5e7eb",
                        borderRadius: "0.5rem",
                        padding: "0.625rem 0.75rem",
                        fontSize: "0.875rem",
                        outline: "none",
                        background: "white",
                        color: "#111",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#9ca3af";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "#e5e7eb";
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      // manual 모드: 기존 단일 textarea
      const value =
        typeof textInputs[block.id] === "string" ? textInputs[block.id] : "";
      return (
        <div className="pv-block">
          <p className="pv-block-label">{block.label}</p>
          <textarea
            value={value}
            onChange={(e) => {
              const val = cfg.maxLength
                ? e.target.value.slice(0, cfg.maxLength)
                : e.target.value;
              setCustomer((prev) => ({
                ...prev,
                textInputs: { ...(prev.textInputs || {}), [block.id]: val },
              }));
            }}
            placeholder={cfg.placeholder || "내용을 입력해주세요"}
            rows={cfg.rows || 3}
            className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-gray-400 transition-colors"
          />
          {cfg.maxLength && (
            <p className="text-xs text-gray-400 text-right mt-1">
              {value.length}/{cfg.maxLength}
            </p>
          )}
        </div>
      );
    }

    case "books": {
      const books = customer.books || [];
      const minBooks = cfg.minBooks ?? 1;
      const maxBooks = cfg.maxBooks ?? 10;
      const defaultPages = cfg.defaultPages ?? 100;
      const defaultQty = cfg.defaultQty ?? 30;
      const pagesMin = cfg.pagesMin ?? 4;
      const pagesMax = cfg.pagesMax ?? 500;
      const pagesStep = cfg.pagesStep ?? 2;
      const coverFields = designCover?.fields || [];

      // 가격 설정
      const pagePrice = cfg.pagePrice ?? 40;
      const bindingFee = cfg.bindingFee ?? 1500;
      const freeDesignMinQty = cfg.freeDesignMinQty ?? 100;
      const designFee = designCover?.design_fee ?? 0;

      // 가이드 블록 가격 합산 (에폭시 등)
      const guidePriceTotal = Object.entries(customer.guides || {}).reduce(
        (sum, [blockId, state]) => {
          const guideBlock = allBlocks.find(
            (b) => String(b.id) === String(blockId) && b.type === "guide"
          );
          const opt = guideBlock?.config?.options?.find(
            (o) => o.id === state?.selected
          );
          return sum + (opt?.price || 0);
        },
        0
      );
      const activeGuideLabels = Object.entries(customer.guides || {}).reduce(
        (arr, [blockId, state]) => {
          const guideBlock = allBlocks.find(
            (b) => String(b.id) === String(blockId) && b.type === "guide"
          );
          const opt = guideBlock?.config?.options?.find(
            (o) => o.id === state?.selected
          );
          if (opt?.price > 0) arr.push({ label: opt.label, price: opt.price });
          return arr;
        },
        []
      );

      const addBook = () => {
        if (books.length >= maxBooks) return;
        setCustomer((prev) => ({
          ...prev,
          books: [
            ...(prev.books || []),
            {
              id: Date.now(),
              fields: {},
              pages: defaultPages,
              qty: defaultQty,
            },
          ],
        }));
      };

      const removeBook = (bookId) => {
        setCustomer((prev) => {
          const current = prev.books || [];
          if (current.length <= minBooks) return prev;
          return { ...prev, books: current.filter((b) => b.id !== bookId) };
        });
      };

      const updateBook = (bookId, key, value) => {
        setCustomer((prev) => ({
          ...prev,
          books: (prev.books || []).map((b) =>
            b.id === bookId ? { ...b, [key]: value } : b
          ),
        }));
      };

      const updateBookField = (bookId, label, value) => {
        setCustomer((prev) => ({
          ...prev,
          books: (prev.books || []).map((b) =>
            b.id === bookId
              ? { ...b, fields: { ...b.fields, [label]: value } }
              : b
          ),
        }));
      };

      /** 필드 타입별 렌더링 */
      const renderField = (field, book) => {
        const fieldType = field.type || "text";
        const currentVal = book.fields?.[field.label] || "";

        if (fieldType === "color") {
          const colors = field.options || [];
          return (
            <div key={field.label} style={{ marginBottom: "0.25rem" }}>
              <label
                style={{
                  fontSize: "0.8rem",
                  color: "#6b7280",
                  display: "block",
                  marginBottom: "0.375rem",
                }}
              >
                {field.label}
              </label>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {colors.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => updateBookField(book.id, field.label, hex)}
                    style={{
                      width: "2rem",
                      height: "2rem",
                      borderRadius: "50%",
                      background: hex,
                      border:
                        currentVal === hex
                          ? "2.5px solid #222"
                          : "2px solid #e5e7eb",
                      cursor: "pointer",
                      outline: currentVal === hex ? "2px solid white" : "none",
                      outlineOffset: "-4px",
                      transition: "border 0.15s",
                    }}
                    title={hex}
                  />
                ))}
              </div>
            </div>
          );
        }

        if (fieldType === "select") {
          const options = field.options || [];
          return (
            <div key={field.label} style={{ marginBottom: "0.25rem" }}>
              <label
                style={{
                  fontSize: "0.8rem",
                  color: "#6b7280",
                  display: "block",
                  marginBottom: "0.375rem",
                }}
              >
                {field.label}
              </label>
              <div
                style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}
              >
                {options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => updateBookField(book.id, field.label, opt)}
                    style={{
                      padding: "0.375rem 0.75rem",
                      borderRadius: "1.5rem",
                      border:
                        currentVal === opt
                          ? "1.5px solid #222"
                          : "1px solid #d1d5db",
                      background: currentVal === opt ? "#222" : "white",
                      color: currentVal === opt ? "white" : "#374151",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          );
        }

        // text (default)
        return (
          <div key={field.label} style={{ marginBottom: "0.25rem" }}>
            <label
              style={{
                fontSize: "0.8rem",
                color: "#6b7280",
                display: "block",
                marginBottom: "0.375rem",
              }}
            >
              {field.label}
            </label>
            <input
              type="text"
              value={currentVal}
              onChange={(e) =>
                updateBookField(book.id, field.label, e.target.value)
              }
              placeholder={
                field.placeholder || `${field.label}을(를) 입력하세요`
              }
              className="pv-book-input"
              style={{
                width: "100%",
                border: "1px solid #e5e7eb",
                borderRadius: "0.5rem",
                padding: "0.625rem 0.75rem",
                fontSize: "0.875rem",
                outline: "none",
                background: "white",
                color: "#111",
                transition: "border 0.15s",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#9ca3af";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e5e7eb";
              }}
            />
          </div>
        );
      };

      // 가격 요약 계산
      const totalQty = books.reduce((s, b) => s + (b.qty || 1), 0);
      const bookCosts = books.map((book) => {
        const pages = book.pages || defaultPages;
        const qty = book.qty || 1;
        const perCopy = pages * pagePrice + bindingFee + guidePriceTotal;
        return { perCopy, subtotal: perCopy * qty, qty, pages };
      });
      const subtotalAll = bookCosts.reduce((s, c) => s + c.subtotal, 0);
      const showDesignFee = designFee > 0 && totalQty < freeDesignMinQty;
      const grandTotal = subtotalAll + (showDesignFee ? designFee : 0);

      return (
        <div className="pv-block">
          <style>{`.pv-book-input::placeholder { color: #d1d5db; }`}</style>
          <p className="pv-block-label">{block.label}</p>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            {books.map((book, idx) => (
              <div
                key={book.id}
                style={{
                  borderRadius: "0.875rem",
                  overflow: "hidden",
                  border: "1px solid #e5e7eb",
                  background: "white",
                }}
              >
                {/* 헤더 */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.625rem 0.875rem",
                    background: "#f9fafb",
                    borderBottom: "1px solid #f0f0f0",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "#222",
                    }}
                  >
                    {idx + 1}권
                  </span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                      {bookCosts[idx]?.subtotal?.toLocaleString()}원
                    </span>
                    <button
                      onClick={() => removeBook(book.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#b0b0b0",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                        padding: "0.125rem 0.375rem",
                      }}
                    >
                      삭제
                    </button>
                  </div>
                </div>
                {/* 본문 */}
                <div
                  style={{
                    padding: "0.875rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.625rem",
                  }}
                >
                  {/* 커버 필드 */}
                  {coverFields.map((field) => renderField(field, book))}

                  {/* 페이지 수 + 수량 */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "0.5rem",
                      marginTop: coverFields.length > 0 ? "0.25rem" : 0,
                    }}
                  >
                    <div>
                      <label
                        style={{
                          fontSize: "0.8rem",
                          color: "#6b7280",
                          display: "block",
                          marginBottom: "0.375rem",
                        }}
                      >
                        페이지 수
                      </label>
                      <input
                        type="number"
                        value={book.pages}
                        min={pagesMin}
                        max={pagesMax}
                        step={pagesStep}
                        onChange={(e) =>
                          updateBook(book.id, "pages", Number(e.target.value))
                        }
                        onBlur={(e) => {
                          e.target.style.borderColor = "#e5e7eb";
                          let v = Number(e.target.value) || pagesMin;
                          v = Math.max(pagesMin, Math.min(pagesMax, v));
                          const rem = (v - pagesMin) % pagesStep;
                          if (rem !== 0) v = v - rem + pagesStep;
                          v = Math.min(v, pagesMax);
                          updateBook(book.id, "pages", v);
                        }}
                        className="pv-book-input"
                        style={{
                          width: "100%",
                          border: "1px solid #e5e7eb",
                          borderRadius: "0.5rem",
                          padding: "0.625rem 0.75rem",
                          fontSize: "0.875rem",
                          outline: "none",
                          background: "white",
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = "#9ca3af";
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: "0.8rem",
                          color: "#6b7280",
                          display: "block",
                          marginBottom: "0.375rem",
                        }}
                      >
                        수량
                      </label>
                      <input
                        type="number"
                        value={book.qty}
                        min={1}
                        onChange={(e) =>
                          updateBook(book.id, "qty", Number(e.target.value))
                        }
                        onBlur={(e) => {
                          e.target.style.borderColor = "#e5e7eb";
                          const v = Math.max(1, Number(e.target.value) || 1);
                          updateBook(book.id, "qty", v);
                        }}
                        className="pv-book-input"
                        style={{
                          width: "100%",
                          border: "1px solid #e5e7eb",
                          borderRadius: "0.5rem",
                          padding: "0.625rem 0.75rem",
                          fontSize: "0.875rem",
                          outline: "none",
                          background: "white",
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = "#9ca3af";
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {books.length < maxBooks && (
              <button
                onClick={addBook}
                style={{
                  padding: "0.75rem",
                  border: "1px dashed #d1d5db",
                  borderRadius: "0.875rem",
                  background: "white",
                  color: "#6b7280",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#9ca3af";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#d1d5db";
                }}
              >
                + 시리즈 추가
              </button>
            )}

            {/* 가격 요약 */}
            {books.length > 0 && (
              <div
                style={{
                  borderRadius: "0.875rem",
                  border: "1px solid #e5e7eb",
                  background: "#fafafa",
                  padding: "0.875rem",
                }}
              >
                <p
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "#222",
                    marginBottom: "0.5rem",
                  }}
                >
                  주문 요약
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.25rem",
                  }}
                >
                  {books.map((book, idx) => (
                    <div
                      key={book.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.8rem",
                        color: "#6b7280",
                      }}
                    >
                      <span>
                        {idx + 1}권 ({bookCosts[idx]?.pages}p ×{" "}
                        {bookCosts[idx]?.qty}부)
                      </span>
                      <span>
                        {bookCosts[idx]?.subtotal?.toLocaleString()}원
                      </span>
                    </div>
                  ))}
                  {activeGuideLabels.map((g) => (
                    <div
                      key={g.label}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.8rem",
                        color: "#6b7280",
                      }}
                    >
                      <span>
                        {g.label} (권당 +{g.price.toLocaleString()}원)
                      </span>
                      <span>포함</span>
                    </div>
                  ))}
                  {showDesignFee && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.8rem",
                        color: "#ef4444",
                      }}
                    >
                      <span>디자인 비용 ({freeDesignMinQty}부 미만)</span>
                      <span>+{designFee.toLocaleString()}원</span>
                    </div>
                  )}
                  {designFee > 0 && !showDesignFee && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.8rem",
                        color: "#16a34a",
                      }}
                    >
                      <span>디자인 비용 ({freeDesignMinQty}부 이상 무료)</span>
                      <span>0원</span>
                    </div>
                  )}
                  <div
                    style={{
                      borderTop: "1px solid #e5e7eb",
                      marginTop: "0.375rem",
                      paddingTop: "0.375rem",
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "#111",
                    }}
                  >
                    <span>합계 ({totalQty}부)</span>
                    <span>{grandTotal.toLocaleString()}원</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}

export const PreviewBlock = memo(PreviewBlockInner);
export default PreviewBlock;
