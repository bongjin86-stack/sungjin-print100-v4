import React, { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

/**
 * 후가공 관리 페이지 컴포넌트
 * - finishing_types 테이블: 후가공 종류
 * - finishing_costs 테이블: 후가공별 비용
 * - CRUD 기능 포함
 */
export default function FinishingPage() {
  const [finishingTypes, setFinishingTypes] = useState([]);
  const [finishingCosts, setFinishingCosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // CRUD 상태 - Types
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [editingTypeId, setEditingTypeId] = useState(null);
  const [typeFormData, setTypeFormData] = useState({
    code: "",
    name: "",
    unit_type: "per_copy",
    description: "",
    is_active: true,
  });

  // CRUD 상태 - Costs
  const [showCostForm, setShowCostForm] = useState(false);
  const [editingCostId, setEditingCostId] = useState(null);
  const [costFormData, setCostFormData] = useState({
    finishing_type_id: "",
    setup_cost: "",
    setup_cost_double: "",
    min_qty: "",
    max_qty: "",
    cost_per_unit: "",
    unit_type: "per_copy",
    notes: "",
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 후가공 종류 조회 (모든 레코드)
      const { data: typesData, error: typesError } = await supabase
        .from("finishing_types")
        .select("*")
        .order("id");

      if (typesError) throw typesError;

      // 후가공 비용 조회 (타입 정보 포함, 모든 레코드)
      const { data: costsData, error: costsError } = await supabase
        .from("finishing_costs")
        .select(
          `
          *,
          finishing_type:finishing_types(id, code, name)
        `
        )
        .order("finishing_type_id")
        .order("min_qty");

      if (costsError) throw costsError;

      setFinishingTypes(typesData);
      setFinishingCosts(costsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 단위 타입 한글 변환
  const getUnitTypeLabel = (unitType) => {
    const labels = {
      per_copy: "부당",
      per_face: "면당",
      per_hole: "구멍당",
      per_batch: "100개당",
    };
    return labels[unitType] || unitType;
  };

  // === Type CRUD ===
  const resetTypeForm = () => {
    setTypeFormData({
      code: "",
      name: "",
      unit_type: "per_copy",
      description: "",
      is_active: true,
    });
    setShowTypeForm(false);
    setEditingTypeId(null);
  };

  const handleAddType = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("finishing_types").insert({
        code: typeFormData.code,
        name: typeFormData.name,
        unit_type: typeFormData.unit_type,
        description: typeFormData.description || null,
        is_active: typeFormData.is_active,
      });

      if (error) throw error;

      alert("후가공 종류 추가 완료!");
      resetTypeForm();
      loadData();
    } catch (err) {
      alert("추가 실패: " + err.message);
    }
  };

  const startEditType = (type) => {
    setEditingTypeId(type.id);
    setTypeFormData({
      code: type.code,
      name: type.name,
      unit_type: type.unit_type || "per_copy",
      description: type.description || "",
      is_active: type.is_active,
    });
  };

  const handleUpdateType = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from("finishing_types")
        .update({
          code: typeFormData.code,
          name: typeFormData.name,
          unit_type: typeFormData.unit_type,
          description: typeFormData.description || null,
          is_active: typeFormData.is_active,
        })
        .eq("id", editingTypeId);

      if (error) throw error;

      alert("수정 완료!");
      resetTypeForm();
      loadData();
    } catch (err) {
      alert("수정 실패: " + err.message);
    }
  };

  const handleDeleteType = async (id) => {
    if (
      !window.confirm(
        "정말 삭제하시겠습니까? 연결된 비용 데이터도 삭제될 수 있습니다."
      )
    )
      return;

    try {
      const { error } = await supabase
        .from("finishing_types")
        .delete()
        .eq("id", id);

      if (error) throw error;

      alert("삭제 완료!");
      loadData();
    } catch (err) {
      alert("삭제 실패: " + err.message);
    }
  };

  // === Cost CRUD ===
  const resetCostForm = () => {
    setCostFormData({
      finishing_type_id: "",
      setup_cost: "",
      setup_cost_double: "",
      min_qty: "",
      max_qty: "",
      cost_per_unit: "",
      unit_type: "per_copy",
      notes: "",
      is_active: true,
    });
    setShowCostForm(false);
    setEditingCostId(null);
  };

  const handleAddCost = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("finishing_costs").insert({
        finishing_type_id: parseInt(costFormData.finishing_type_id),
        setup_cost: parseInt(costFormData.setup_cost) || 0,
        setup_cost_double: costFormData.setup_cost_double
          ? parseInt(costFormData.setup_cost_double)
          : null,
        min_qty: parseInt(costFormData.min_qty),
        max_qty:
          costFormData.max_qty !== "" ? parseInt(costFormData.max_qty) : null,
        cost_per_unit: parseInt(costFormData.cost_per_unit),
        unit_type: costFormData.unit_type,
        notes: costFormData.notes || null,
        is_active: costFormData.is_active,
      });

      if (error) throw error;

      alert("비용 추가 완료!");
      resetCostForm();
      loadData();
    } catch (err) {
      alert("추가 실패: " + err.message);
    }
  };

  const costFormRef = React.useRef<HTMLDivElement>(null);

  const startEditCost = (cost) => {
    setEditingCostId(cost.id);
    setCostFormData({
      finishing_type_id: cost.finishing_type_id,
      setup_cost: cost.setup_cost ?? "",
      setup_cost_double: cost.setup_cost_double ?? "",
      min_qty: cost.min_qty ?? "",
      max_qty: cost.max_qty ?? "",
      cost_per_unit: cost.cost_per_unit ?? "",
      unit_type: cost.unit_type || "per_copy",
      notes: cost.notes || "",
      is_active: cost.is_active,
    });
    setTimeout(
      () =>
        costFormRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        }),
      50
    );
  };

  const handleUpdateCost = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from("finishing_costs")
        .update({
          finishing_type_id: parseInt(costFormData.finishing_type_id),
          setup_cost: parseInt(costFormData.setup_cost) || 0,
          setup_cost_double: costFormData.setup_cost_double
            ? parseInt(costFormData.setup_cost_double)
            : null,
          min_qty: parseInt(costFormData.min_qty),
          max_qty:
            costFormData.max_qty !== "" ? parseInt(costFormData.max_qty) : null,
          cost_per_unit: parseInt(costFormData.cost_per_unit),
          unit_type: costFormData.unit_type,
          notes: costFormData.notes || null,
          is_active: costFormData.is_active,
        })
        .eq("id", editingCostId);

      if (error) throw error;

      alert("수정 완료!");
      resetCostForm();
      loadData();
    } catch (err) {
      alert("수정 실패: " + err.message);
    }
  };

  const handleDeleteCost = async (id) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;

    try {
      const { error } = await supabase
        .from("finishing_costs")
        .delete()
        .eq("id", id);

      if (error) throw error;

      alert("삭제 완료!");
      loadData();
    } catch (err) {
      alert("삭제 실패: " + err.message);
    }
  };

  // 후가공 타입별로 그룹화
  const groupedByType = finishingCosts.reduce((acc, cost) => {
    const typeId = cost.finishing_type_id;
    if (!acc[typeId]) acc[typeId] = [];
    acc[typeId].push(cost);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">후가공 관리</h1>
          <p className="text-gray-500 mt-1">
            후가공 종류 및 비용을 관리합니다.
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3455DB]"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">후가공 관리</h1>
          <p className="text-gray-500 mt-1">
            후가공 종류 및 비용을 관리합니다.
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 mb-4">에러: {error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-[#3455DB] text-white rounded-lg hover:bg-[#2a44b0] transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">후가공 관리</h1>
          <p className="text-gray-500 mt-1">
            후가공 종류 및 비용을 관리합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTypeForm(true)}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
          >
            + 종류 추가
          </button>
          <button
            onClick={() => setShowCostForm(true)}
            className="px-3 py-1.5 bg-[#3455DB] hover:bg-[#2a44b0] text-white text-sm font-medium rounded-lg transition-colors"
          >
            + 비용 추가
          </button>
        </div>
      </div>

      {/* 단위 타입 설명 */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
        <h3 className="font-semibold text-amber-900 mb-2">단위 타입 설명</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-amber-800">
          <div>
            <strong>per_copy:</strong> 부당 (수량 x 단가)
          </div>
          <div>
            <strong>per_face:</strong> 면당 (면수 x 단가)
          </div>
          <div>
            <strong>per_hole:</strong> 구멍당 (구멍수 x 수량 x 단가)
          </div>
          <div>
            <strong>per_batch:</strong> 100개당
          </div>
        </div>
      </div>

      {/* Type 추가/수정 폼 */}
      {(showTypeForm || editingTypeId) && (
        <div className="bg-green-50 border border-green-200 rounded-xl mb-6 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            {editingTypeId ? "후가공 종류 수정" : "새 후가공 종류 추가"}
          </h3>
          <form
            onSubmit={editingTypeId ? handleUpdateType : handleAddType}
            className="grid grid-cols-2 md:grid-cols-6 gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                코드 *
              </label>
              <input
                type="text"
                value={typeFormData.code}
                onChange={(e) =>
                  setTypeFormData({ ...typeFormData, code: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3455DB] focus:border-transparent"
                placeholder="예: coating"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이름 *
              </label>
              <input
                type="text"
                value={typeFormData.name}
                onChange={(e) =>
                  setTypeFormData({ ...typeFormData, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3455DB] focus:border-transparent"
                placeholder="예: 코팅"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                단위 타입
              </label>
              <select
                value={typeFormData.unit_type}
                onChange={(e) =>
                  setTypeFormData({
                    ...typeFormData,
                    unit_type: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3455DB] focus:border-transparent"
              >
                <option value="per_copy">부당</option>
                <option value="per_face">면당</option>
                <option value="per_hole">구멍당</option>
                <option value="per_batch">100개당</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                설명
              </label>
              <input
                type="text"
                value={typeFormData.description}
                onChange={(e) =>
                  setTypeFormData({
                    ...typeFormData,
                    description: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3455DB] focus:border-transparent"
                placeholder="설명"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={typeFormData.is_active}
                  onChange={(e) =>
                    setTypeFormData({
                      ...typeFormData,
                      is_active: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded border-gray-300 text-[#3455DB] focus:ring-[#3455DB]"
                />
                <span className="text-sm text-gray-700">활성화</span>
              </label>
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-[#3455DB] hover:bg-[#2a44b0] text-white text-sm font-medium rounded-lg transition-colors"
              >
                {editingTypeId ? "수정" : "추가"}
              </button>
              <button
                type="button"
                onClick={resetTypeForm}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Cost 추가/수정 폼 */}
      {(showCostForm || editingCostId) && (
        <div
          ref={costFormRef}
          className="bg-blue-50 border border-blue-200 rounded-xl mb-6 p-6"
        >
          <h3 className="font-semibold text-gray-900 mb-4">
            {editingCostId ? "후가공 비용 수정" : "새 후가공 비용 추가"}
          </h3>
          <form
            onSubmit={editingCostId ? handleUpdateCost : handleAddCost}
            className="grid grid-cols-2 md:grid-cols-5 gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                후가공 종류 *
              </label>
              <select
                value={costFormData.finishing_type_id}
                onChange={(e) =>
                  setCostFormData({
                    ...costFormData,
                    finishing_type_id: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3455DB] focus:border-transparent"
                required
              >
                <option value="">선택</option>
                {finishingTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name} ({type.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                최소 수량 *
              </label>
              <input
                type="number"
                value={costFormData.min_qty}
                onChange={(e) =>
                  setCostFormData({ ...costFormData, min_qty: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3455DB] focus:border-transparent"
                placeholder="1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                최대 수량
              </label>
              <input
                type="number"
                value={costFormData.max_qty}
                onChange={(e) =>
                  setCostFormData({ ...costFormData, max_qty: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3455DB] focus:border-transparent"
                placeholder="비워두면 무제한"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                세팅비
              </label>
              <input
                type="number"
                value={costFormData.setup_cost}
                onChange={(e) =>
                  setCostFormData({
                    ...costFormData,
                    setup_cost: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3455DB] focus:border-transparent"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                양면 세팅비
              </label>
              <input
                type="number"
                value={costFormData.setup_cost_double}
                onChange={(e) =>
                  setCostFormData({
                    ...costFormData,
                    setup_cost_double: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3455DB] focus:border-transparent"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                단가 *
              </label>
              <input
                type="number"
                value={costFormData.cost_per_unit}
                onChange={(e) =>
                  setCostFormData({
                    ...costFormData,
                    cost_per_unit: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3455DB] focus:border-transparent"
                placeholder="10"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                단위 타입
              </label>
              <select
                value={costFormData.unit_type}
                onChange={(e) =>
                  setCostFormData({
                    ...costFormData,
                    unit_type: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3455DB] focus:border-transparent"
              >
                <option value="per_copy">부당</option>
                <option value="per_face">면당</option>
                <option value="per_hole">구멍당</option>
                <option value="per_batch">100개당</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                비고
              </label>
              <input
                type="text"
                value={costFormData.notes}
                onChange={(e) =>
                  setCostFormData({ ...costFormData, notes: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3455DB] focus:border-transparent"
                placeholder="비고"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={costFormData.is_active}
                  onChange={(e) =>
                    setCostFormData({
                      ...costFormData,
                      is_active: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded border-gray-300 text-[#3455DB] focus:ring-[#3455DB]"
                />
                <span className="text-sm text-gray-700">활성화</span>
              </label>
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-[#3455DB] hover:bg-[#2a44b0] text-white text-sm font-medium rounded-lg transition-colors"
              >
                {editingCostId ? "수정" : "추가"}
              </button>
              <button
                type="button"
                onClick={resetCostForm}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 후가공 종류 테이블 */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          후가공 종류
        </h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  코드
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  이름
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  단위 타입
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  설명
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  상태
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {finishingTypes.map((type) => (
                <tr key={type.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm text-gray-900">
                    {type.code}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {type.name}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                      {getUnitTypeLabel(type.unit_type)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {type.description || "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        type.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {type.is_active ? "활성" : "비활성"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => startEditType(type)}
                        className="px-2 py-1 text-xs border border-gray-300 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDeleteType(type.id)}
                        className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 후가공 종류별 비용 테이블 */}
      {finishingTypes.map((type) => {
        const costs = groupedByType[type.id] || [];

        return (
          <div key={type.id} className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              {type.name} 비용
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({type.code})
              </span>
            </h3>

            {costs.length > 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        수량 구간
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        세팅비
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        양면 세팅비
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        단가
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        단위
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        상태
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {costs.map((cost) => (
                      <tr key={cost.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-center text-gray-900">
                          {(cost.min_qty || 0).toLocaleString()} ~{" "}
                          {cost.max_qty >= 999999
                            ? "무제한"
                            : (cost.max_qty || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900">
                          {(cost.setup_cost || 0).toLocaleString()}원
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900">
                          {cost.setup_cost_double
                            ? `${cost.setup_cost_double.toLocaleString()}원`
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-[#3455DB]">
                          {(cost.cost_per_unit || 0).toLocaleString()}원
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                            {getUnitTypeLabel(cost.unit_type)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              cost.is_active
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {cost.is_active ? "활성" : "비활성"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => startEditCost(cost)}
                              className="px-2 py-1 text-xs border border-gray-300 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleDeleteCost(cost.id)}
                              className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-500">
                비용 데이터가 없습니다.
              </div>
            )}
          </div>
        );
      })}

      {/* 요약 정보 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          후가공 데이터 요약
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-[#3455DB]">
              {finishingTypes.length}
            </p>
            <p className="text-sm text-gray-500 mt-1">후가공 종류</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#3455DB]">
              {finishingCosts.length}
            </p>
            <p className="text-sm text-gray-500 mt-1">총 비용 데이터</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#3455DB]">
              {finishingTypes.filter((t) => t.is_active).length}
            </p>
            <p className="text-sm text-gray-500 mt-1">활성 종류</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#3455DB]">
              {finishingCosts.filter((c) => c.is_active).length}
            </p>
            <p className="text-sm text-gray-500 mt-1">활성 비용</p>
          </div>
        </div>
      </div>
    </div>
  );
}
