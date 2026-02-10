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
import { formatBusinessDate, getBusinessDate } from "@/lib/businessDays";

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
  displayQtys, isCustomQty, customer, setCustomer,
  qtyPrices, qtyMin, qtyMax, cfg, productType, allBlocks,
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
                  onClick={() =>
                    setCustomer((prev) => ({ ...prev, qty: q }))
                  }
                >
                  <td>{q}부{isCustom && " ✎"}</td>
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

function CustomQtyInput({ qtyMin, qtyMax, isCustomQty, customerQty, setCustomer, onCustomPrice }) {
  const [inputVal, setInputVal] = useState(isCustomQty ? String(customerQty) : "");
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
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
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
      {inputVal && parseInt(inputVal) > 0 && (parseInt(inputVal) < qtyMin || parseInt(inputVal) > qtyMax) && (
        <p className="pv-custom-qty-error">
          {qtyMin}~{qtyMax}부 사이로 입력해주세요
        </p>
      )}
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
}) {
  const cfg = block.config;
  const isDisabled = block.locked;

  switch (block.type) {
    case "size":
      return (
        <div className="pv-block">
          <p className="pv-block-label">{block.label}</p>
          <div className="pv-btn-row">
            {cfg.options?.map((s) => (
              <button
                key={s}
                disabled={isDisabled}
                className={`pv-btn ${customer.size === s ? "active" : ""} ${isDisabled ? "disabled" : ""}`}
                onClick={() =>
                  !isDisabled && setCustomer((prev) => ({ ...prev, size: s }))
                }
              >
                {(dbSizes || DB.sizeMultipliers)[s]?.name || s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      );

    case "paper": {
      const role = getPaperBlockRole(block, allBlocks);
      const paperField = role === "cover"
        ? "coverPaper"
        : role === "inner"
          ? "innerPaper"
          : "paper";
      const weightField = role === "cover"
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
          {cfg.sameDayMessage && customer.delivery === "same" && (
            <p className="pv-delivery-warning">
              {cfg.sameDayMessage}
            </p>
          )}
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
        cfg.allowCustom && customer.qty > 0 && !cfg.options?.includes(customer.qty);
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

    default:
      return null;
  }
}

export const PreviewBlock = memo(PreviewBlockInner);
export default PreviewBlock;
