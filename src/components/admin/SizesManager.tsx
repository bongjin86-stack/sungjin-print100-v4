import React, { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

/**
 * 사이즈 관리 페이지 컴포넌트
 * - sizes 테이블: 인쇄 사이즈 (A4, A3, B5, A5, 신국판)
 * - 배수(up), 기준 용지 사이즈 표시
 * - CRUD 기능 포함
 */
export default function SizesPage() {
  const [sizes, setSizes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // CRUD 상태
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    width: "",
    height: "",
    base_sheet: "467x315",
    up_count: "",
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: sizesError } = await supabase
        .from("sizes")
        .select("*")
        .order("id");

      if (sizesError) throw sizesError;

      setSizes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      width: "",
      height: "",
      base_sheet: "467x315",
      up_count: "",
      is_active: true,
    });
    setShowAddForm(false);
    setEditingId(null);
  };

  // 추가
  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("sizes").insert({
        code: formData.code,
        name: formData.name,
        width: parseInt(formData.width),
        height: parseInt(formData.height),
        base_sheet: formData.base_sheet,
        up_count: parseInt(formData.up_count),
        is_active: formData.is_active,
      });

      if (error) throw error;

      alert("추가 완료!");
      resetForm();
      loadData();
    } catch (err) {
      alert("추가 실패: " + err.message);
    }
  };

  // 수정 시작
  const startEdit = (size) => {
    setEditingId(size.id);
    setFormData({
      code: size.code,
      name: size.name,
      width: size.width,
      height: size.height,
      base_sheet: size.base_sheet || "467x315",
      up_count: size.up_count,
      is_active: size.is_active,
    });
  };

  // 수정 저장
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from("sizes")
        .update({
          code: formData.code,
          name: formData.name,
          width: parseInt(formData.width),
          height: parseInt(formData.height),
          base_sheet: formData.base_sheet,
          up_count: parseInt(formData.up_count),
          is_active: formData.is_active,
        })
        .eq("id", editingId);

      if (error) throw error;

      alert("수정 완료!");
      resetForm();
      loadData();
    } catch (err) {
      alert("수정 실패: " + err.message);
    }
  };

  // 삭제
  const handleDelete = async (id) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;

    try {
      const { error } = await supabase.from("sizes").delete().eq("id", id);

      if (error) throw error;

      alert("삭제 완료!");
      loadData();
    } catch (err) {
      alert("삭제 실패: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">사이즈 관리</h1>
          <p className="text-gray-500 mt-1">인쇄 사이즈를 관리합니다.</p>
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
          <h1 className="text-2xl font-semibold text-gray-900">사이즈 관리</h1>
          <p className="text-gray-500 mt-1">인쇄 사이즈를 관리합니다.</p>
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
          <h1 className="text-2xl font-semibold text-gray-900">사이즈 관리</h1>
          <p className="text-gray-500 mt-1">인쇄 사이즈를 관리합니다.</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-[#3455DB] hover:bg-[#2a44b0] text-white text-sm font-medium rounded-lg transition-colors"
        >
          + 새로 추가
        </button>
      </div>

      {/* 추가/수정 폼 */}
      {(showAddForm || editingId) && (
        <div className="bg-white rounded-xl border border-gray-200 mb-6 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            {editingId ? "사이즈 수정" : "새 사이즈 추가"}
          </h3>
          <form
            onSubmit={editingId ? handleUpdate : handleAdd}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                코드 *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3455DB] focus:border-transparent"
                placeholder="예: a4"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이름 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3455DB] focus:border-transparent"
                placeholder="예: A4"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                가로 (mm) *
              </label>
              <input
                type="number"
                value={formData.width}
                onChange={(e) =>
                  setFormData({ ...formData, width: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3455DB] focus:border-transparent"
                placeholder="210"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                세로 (mm) *
              </label>
              <input
                type="number"
                value={formData.height}
                onChange={(e) =>
                  setFormData({ ...formData, height: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3455DB] focus:border-transparent"
                placeholder="297"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                기준 용지
              </label>
              <select
                value={formData.base_sheet}
                onChange={(e) =>
                  setFormData({ ...formData, base_sheet: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3455DB] focus:border-transparent"
              >
                <option value="467x315">467x315</option>
                <option value="390x270">390x270</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                배수 (up) *
              </label>
              <input
                type="number"
                value={formData.up_count}
                onChange={(e) =>
                  setFormData({ ...formData, up_count: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3455DB] focus:border-transparent"
                placeholder="2"
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

      {/* 사이즈 테이블 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                코드
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                사이즈명
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                가로 (mm)
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                세로 (mm)
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                기준 용지
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                배수 (up)
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
            {sizes.map((size) => (
              <tr key={size.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-sm text-gray-900">
                  {size.code}
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {size.name}
                </td>
                <td className="px-4 py-3 text-center text-gray-900">
                  {size.width}
                </td>
                <td className="px-4 py-3 text-center text-gray-900">
                  {size.height}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      size.base_sheet === "467x315"
                        ? "bg-gray-100 text-gray-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {size.base_sheet}
                  </span>
                </td>
                <td className="px-4 py-3 text-center font-medium text-[#3455DB]">
                  {size.up_count}개
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      size.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {size.is_active ? "활성" : "비활성"}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => startEdit(size)}
                      className="px-2 py-1 text-xs border border-gray-300 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(size.id)}
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
          사이즈 데이터 요약
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-[#3455DB]">{sizes.length}</p>
            <p className="text-sm text-gray-500 mt-1">총 사이즈</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#3455DB]">
              {sizes.filter((s) => s.base_sheet === "467x315").length}
            </p>
            <p className="text-sm text-gray-500 mt-1">467x315 사용</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#3455DB]">
              {sizes.filter((s) => s.base_sheet === "390x270").length}
            </p>
            <p className="text-sm text-gray-500 mt-1">390x270 사용</p>
          </div>
        </div>
      </div>
    </div>
  );
}
