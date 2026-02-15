import React, { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

/**
 * 인쇄비 관리 페이지 컴포넌트
 * - print_costs 테이블: 면수 구간별 인쇄비
 * - CRUD 기능 포함
 */
export default function PrintPage() {
  const [printCosts, setPrintCosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    if (type === "success") setTimeout(() => setMessage(null), 3000);
  };

  // CRUD 상태
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    min_faces: "",
    max_faces: "",
    cost_per_face: "",
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: printError } = await supabase
        .from("print_costs")
        .select("*")
        .order("min_faces");

      if (printError) throw printError;

      setPrintCosts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      min_faces: "",
      max_faces: "",
      cost_per_face: "",
      is_active: true,
    });
    setShowAddForm(false);
    setEditingId(null);
  };

  // 추가
  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("print_costs").insert({
        min_faces: parseInt(formData.min_faces),
        max_faces: formData.max_faces ? parseInt(formData.max_faces) : null,
        cost_per_face: parseInt(formData.cost_per_face),
        is_active: formData.is_active,
      });

      if (error) throw error;

      showMessage("success", "추가 완료!");
      resetForm();
      loadData();
    } catch (err) {
      showMessage("error", "추가 실패: " + err.message);
    }
  };

  // 수정 시작
  const startEdit = (cost) => {
    setEditingId(cost.id);
    setFormData({
      min_faces: cost.min_faces,
      max_faces: cost.max_faces || "",
      cost_per_face: cost.cost_per_face,
      is_active: cost.is_active,
    });
  };

  // 수정 저장
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from("print_costs")
        .update({
          min_faces: parseInt(formData.min_faces),
          max_faces: formData.max_faces ? parseInt(formData.max_faces) : null,
          cost_per_face: parseInt(formData.cost_per_face),
          is_active: formData.is_active,
        })
        .eq("id", editingId);

      if (error) throw error;

      showMessage("success", "수정 완료!");
      resetForm();
      loadData();
    } catch (err) {
      showMessage("error", "수정 실패: " + err.message);
    }
  };

  // 삭제
  const handleDelete = async (id) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;

    try {
      const { error } = await supabase
        .from("print_costs")
        .delete()
        .eq("id", id);

      if (error) throw error;

      showMessage("success", "삭제 완료!");
      loadData();
    } catch (err) {
      showMessage("error", "삭제 실패: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">인쇄비 관리</h1>
          <p className="text-gray-500 mt-1">
            면수 구간별 인쇄 단가를 관리합니다.
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
          <h1 className="text-2xl font-semibold text-gray-900">인쇄비 관리</h1>
          <p className="text-gray-500 mt-1">
            면수 구간별 인쇄 단가를 관리합니다.
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
          <h1 className="text-2xl font-semibold text-gray-900">인쇄비 관리</h1>
          <p className="text-gray-500 mt-1">
            면수 구간별 인쇄 단가를 관리합니다.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-[#3455DB] hover:bg-[#2a44b0] text-white text-sm font-medium rounded-lg transition-colors"
        >
          + 새로 추가
        </button>
      </div>

      {/* 메시지 배너 */}
      {message && (
        <div
          className={`rounded-xl p-4 mb-6 ${message.type === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}
        >
          {message.text}
        </div>
      )}

      {/* 인쇄비 설명 */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
        <h3 className="font-semibold text-amber-900 mb-2">인쇄비 계산 방식</h3>
        <ul className="text-sm text-amber-800 space-y-1">
          <li>인쇄비는 면(face) 단위로 계산됩니다.</li>
          <li>양면 인쇄 시: 수량 x 2 = 총 면수</li>
          <li>면수 구간에 따라 면당 단가가 달라집니다.</li>
        </ul>
      </div>

      {/* 추가/수정 폼 */}
      {(showAddForm || editingId) && (
        <div className="bg-white rounded-xl border border-gray-200 mb-6 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            {editingId ? "인쇄비 수정" : "새 인쇄비 추가"}
          </h3>
          <form
            onSubmit={editingId ? handleUpdate : handleAdd}
            className="grid grid-cols-2 md:grid-cols-5 gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                최소 면수 *
              </label>
              <input
                type="number"
                value={formData.min_faces}
                onChange={(e) =>
                  setFormData({ ...formData, min_faces: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3455DB] focus:border-transparent"
                placeholder="1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                최대 면수
              </label>
              <input
                type="number"
                value={formData.max_faces}
                onChange={(e) =>
                  setFormData({ ...formData, max_faces: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3455DB] focus:border-transparent"
                placeholder="비워두면 무제한"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                면당 단가 *
              </label>
              <input
                type="number"
                value={formData.cost_per_face}
                onChange={(e) =>
                  setFormData({ ...formData, cost_per_face: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3455DB] focus:border-transparent"
                placeholder="35"
                required
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
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
                {editingId ? "수정" : "추가"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 인쇄비 테이블 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                구간
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                최소 면수
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                최대 면수
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                면당 단가
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
            {printCosts.map((cost, idx) => (
              <tr key={cost.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-center font-medium text-gray-900">
                  {idx + 1}구간
                </td>
                <td className="px-4 py-3 text-center text-gray-900">
                  {(cost.min_faces || 0).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-center text-gray-900">
                  {cost.max_faces
                    ? (cost.max_faces || 0).toLocaleString()
                    : "무제한"}
                </td>
                <td className="px-4 py-3 text-right font-medium text-[#3455DB]">
                  {(cost.cost_per_face || 0).toLocaleString()}원/면
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
                      onClick={() => startEdit(cost)}
                      className="px-2 py-1 text-xs border border-gray-300 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(cost.id)}
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

      {/* 요약 정보 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          인쇄비 데이터 요약
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-[#3455DB]">
              {printCosts.length}
            </p>
            <p className="text-sm text-gray-500 mt-1">총 구간</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#3455DB]">
              {printCosts.length > 0
                ? Math.min(
                    ...printCosts.map((c) => c.cost_per_face || 0)
                  ).toLocaleString()
                : 0}
            </p>
            <p className="text-sm text-gray-500 mt-1">최저 단가 (원/면)</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#3455DB]">
              {printCosts.length > 0
                ? Math.max(
                    ...printCosts.map((c) => c.cost_per_face || 0)
                  ).toLocaleString()
                : 0}
            </p>
            <p className="text-sm text-gray-500 mt-1">최고 단가 (원/면)</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#3455DB]">
              {printCosts.filter((c) => c.is_active).length}
            </p>
            <p className="text-sm text-gray-500 mt-1">활성 구간</p>
          </div>
        </div>
      </div>
    </div>
  );
}
