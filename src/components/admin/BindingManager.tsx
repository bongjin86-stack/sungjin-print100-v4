import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * 제본 관리 페이지 컴포넌트
 * - binding_types 테이블: 제본 종류
 * - binding_costs 테이블: 제본별 비용
 * - CRUD 기능 포함
 */
export default function BindingPage() {
  const [bindingTypes, setBindingTypes] = useState([]);
  const [bindingCosts, setBindingCosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // CRUD 상태 - Types
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [editingTypeId, setEditingTypeId] = useState(null);
  const [typeFormData, setTypeFormData] = useState({
    code: '',
    name: '',
    description: '',
    is_active: true
  });

  // CRUD 상태 - Costs
  const [showCostForm, setShowCostForm] = useState(false);
  const [editingCostId, setEditingCostId] = useState(null);
  const [costFormData, setCostFormData] = useState({
    binding_type_id: '',
    setup_cost: '',
    min_qty: '',
    max_qty: '',
    cost_per_copy: '',
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 제본 종류 조회 (모든 레코드)
      const { data: typesData, error: typesError } = await supabase
        .from('binding_types')
        .select('*')
        .order('id');

      if (typesError) throw typesError;

      // 제본 비용 조회 (타입 정보 포함, 모든 레코드)
      const { data: costsData, error: costsError } = await supabase
        .from('binding_costs')
        .select(`
          *,
          binding_type:binding_types(id, code, name)
        `)
        .order('binding_type_id')
        .order('min_qty');

      if (costsError) throw costsError;

      setBindingTypes(typesData);
      setBindingCosts(costsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // === Type CRUD ===
  const resetTypeForm = () => {
    setTypeFormData({
      code: '',
      name: '',
      description: '',
      is_active: true
    });
    setShowTypeForm(false);
    setEditingTypeId(null);
  };

  const handleAddType = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('binding_types')
        .insert({
          code: typeFormData.code,
          name: typeFormData.name,
          description: typeFormData.description || null,
          is_active: typeFormData.is_active
        });

      if (error) throw error;

      alert('제본 종류 추가 완료!');
      resetTypeForm();
      loadData();
    } catch (err) {
      alert('추가 실패: ' + err.message);
    }
  };

  const startEditType = (type) => {
    setEditingTypeId(type.id);
    setTypeFormData({
      code: type.code,
      name: type.name,
      description: type.description || '',
      is_active: type.is_active
    });
  };

  const handleUpdateType = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('binding_types')
        .update({
          code: typeFormData.code,
          name: typeFormData.name,
          description: typeFormData.description || null,
          is_active: typeFormData.is_active
        })
        .eq('id', editingTypeId);

      if (error) throw error;

      alert('수정 완료!');
      resetTypeForm();
      loadData();
    } catch (err) {
      alert('수정 실패: ' + err.message);
    }
  };

  const handleDeleteType = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까? 연결된 비용 데이터도 삭제될 수 있습니다.')) return;

    try {
      const { error } = await supabase
        .from('binding_types')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('삭제 완료!');
      loadData();
    } catch (err) {
      alert('삭제 실패: ' + err.message);
    }
  };

  // === Cost CRUD ===
  const resetCostForm = () => {
    setCostFormData({
      binding_type_id: '',
      setup_cost: '',
      min_qty: '',
      max_qty: '',
      cost_per_copy: '',
      is_active: true
    });
    setShowCostForm(false);
    setEditingCostId(null);
  };

  const handleAddCost = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('binding_costs')
        .insert({
          binding_type_id: parseInt(costFormData.binding_type_id),
          setup_cost: parseInt(costFormData.setup_cost) || 0,
          min_qty: parseInt(costFormData.min_qty),
          max_qty: parseInt(costFormData.max_qty),
          cost_per_copy: parseInt(costFormData.cost_per_copy),
          is_active: costFormData.is_active
        });

      if (error) throw error;

      alert('비용 추가 완료!');
      resetCostForm();
      loadData();
    } catch (err) {
      alert('추가 실패: ' + err.message);
    }
  };

  const startEditCost = (cost) => {
    setEditingCostId(cost.id);
    setCostFormData({
      binding_type_id: cost.binding_type_id,
      setup_cost: cost.setup_cost || '',
      min_qty: cost.min_qty,
      max_qty: cost.max_qty,
      cost_per_copy: cost.cost_per_copy,
      is_active: cost.is_active
    });
  };

  const handleUpdateCost = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('binding_costs')
        .update({
          binding_type_id: parseInt(costFormData.binding_type_id),
          setup_cost: parseInt(costFormData.setup_cost) || 0,
          min_qty: parseInt(costFormData.min_qty),
          max_qty: parseInt(costFormData.max_qty),
          cost_per_copy: parseInt(costFormData.cost_per_copy),
          is_active: costFormData.is_active
        })
        .eq('id', editingCostId);

      if (error) throw error;

      alert('수정 완료!');
      resetCostForm();
      loadData();
    } catch (err) {
      alert('수정 실패: ' + err.message);
    }
  };

  const handleDeleteCost = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('binding_costs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('삭제 완료!');
      loadData();
    } catch (err) {
      alert('삭제 실패: ' + err.message);
    }
  };

  // 제본 타입별로 그룹화
  const groupedByType = bindingCosts.reduce((acc, cost) => {
    const typeId = cost.binding_type_id;
    if (!acc[typeId]) acc[typeId] = [];
    acc[typeId].push(cost);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">제본 관리</h1>
          <p className="text-gray-500 mt-1">제본 종류 및 비용을 관리합니다.</p>
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
          <h1 className="text-2xl font-semibold text-gray-900">제본 관리</h1>
          <p className="text-gray-500 mt-1">제본 종류 및 비용을 관리합니다.</p>
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
          <h1 className="text-2xl font-semibold text-gray-900">제본 관리</h1>
          <p className="text-gray-500 mt-1">제본 종류 및 비용을 관리합니다.</p>
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

      {/* 제본 종류 설명 */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
        <h3 className="font-semibold text-amber-900 mb-2">제본 종류 설명</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-amber-800">
          <div>
            <strong>중철 (saddle):</strong> 가운데를 철심으로 고정
            <br />
            <span className="text-xs">페이지: 4의 배수, 최소 8p</span>
          </div>
          <div>
            <strong>무선 (perfect):</strong> 접착제로 제본
            <br />
            <span className="text-xs">페이지: 최소 40p</span>
          </div>
          <div>
            <strong>스프링 (spring):</strong> 스프링으로 제본
            <br />
            <span className="text-xs">페이지: 제한 없음</span>
          </div>
        </div>
      </div>

      {/* Type 추가/수정 폼 */}
      {(showTypeForm || editingTypeId) && (
        <div className="bg-green-50 border border-green-200 rounded-xl mb-6 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">{editingTypeId ? '제본 종류 수정' : '새 제본 종류 추가'}</h3>
          <form onSubmit={editingTypeId ? handleUpdateType : handleAddType} className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">코드 *</label>
              <input
                type="text"
                value={typeFormData.code}
                onChange={(e) => setTypeFormData({...typeFormData, code: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3455DB] focus:border-transparent"
                placeholder="예: saddle"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
              <input
                type="text"
                value={typeFormData.name}
                onChange={(e) => setTypeFormData({...typeFormData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3455DB] focus:border-transparent"
                placeholder="예: 중철"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
              <input
                type="text"
                value={typeFormData.description}
                onChange={(e) => setTypeFormData({...typeFormData, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3455DB] focus:border-transparent"
                placeholder="설명"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={typeFormData.is_active}
                  onChange={(e) => setTypeFormData({...typeFormData, is_active: e.target.checked})}
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
                {editingTypeId ? '수정' : '추가'}
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
        <div className="bg-blue-50 border border-blue-200 rounded-xl mb-6 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">{editingCostId ? '제본 비용 수정' : '새 제본 비용 추가'}</h3>
          <form onSubmit={editingCostId ? handleUpdateCost : handleAddCost} className="grid grid-cols-2 md:grid-cols-7 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">제본 종류 *</label>
              <select
                value={costFormData.binding_type_id}
                onChange={(e) => setCostFormData({...costFormData, binding_type_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3455DB] focus:border-transparent"
                required
              >
                <option value="">선택</option>
                {bindingTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.name} ({type.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">최소 수량 *</label>
              <input
                type="number"
                value={costFormData.min_qty}
                onChange={(e) => setCostFormData({...costFormData, min_qty: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3455DB] focus:border-transparent"
                placeholder="1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">최대 수량 *</label>
              <input
                type="number"
                value={costFormData.max_qty}
                onChange={(e) => setCostFormData({...costFormData, max_qty: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3455DB] focus:border-transparent"
                placeholder="999999"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">세팅비</label>
              <input
                type="number"
                value={costFormData.setup_cost}
                onChange={(e) => setCostFormData({...costFormData, setup_cost: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3455DB] focus:border-transparent"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">부당 단가 *</label>
              <input
                type="number"
                value={costFormData.cost_per_copy}
                onChange={(e) => setCostFormData({...costFormData, cost_per_copy: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3455DB] focus:border-transparent"
                placeholder="100"
                required
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={costFormData.is_active}
                  onChange={(e) => setCostFormData({...costFormData, is_active: e.target.checked})}
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
                {editingCostId ? '수정' : '추가'}
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

      {/* 제본 종류 테이블 */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">제본 종류</h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">코드</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">설명</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">상태</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {bindingTypes.map((type) => (
                <tr key={type.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm text-gray-900">{type.code}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{type.name}</td>
                  <td className="px-4 py-3 text-gray-500">{type.description || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      type.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {type.is_active ? '활성' : '비활성'}
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

      {/* 제본 비용 테이블 */}
      {bindingTypes.map((type) => {
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
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">수량 구간</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">세팅비</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">부당 단가</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">상태</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">작업</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {costs.map((cost) => (
                      <tr key={cost.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-center text-gray-900">
                          {(cost.min_qty || 0).toLocaleString()} ~ {cost.max_qty >= 999999 ? '무제한' : (cost.max_qty || 0).toLocaleString()}부
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900">
                          {(cost.setup_cost || 0).toLocaleString()}원
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-[#3455DB]">
                          {(cost.cost_per_copy || 0).toLocaleString()}원/부
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            cost.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {cost.is_active ? '활성' : '비활성'}
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

      {/* 예시 계산 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <h3 className="font-semibold text-blue-900 mb-3">예시 계산</h3>
        <div className="space-y-3 text-sm text-blue-800">
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <div className="font-medium text-gray-900 mb-1">중철 제본 100부</div>
            <div className="text-gray-600">
              세팅비 + (부당 단가 x 수량) = 총 제본비
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <div className="font-medium text-gray-900 mb-1">무선 제본 500부</div>
            <div className="text-gray-600">
              세팅비 + (부당 단가 x 수량) = 총 제본비
            </div>
          </div>
        </div>
      </div>

      {/* 요약 정보 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">제본 데이터 요약</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-[#3455DB]">{bindingTypes.length}</p>
            <p className="text-sm text-gray-500 mt-1">제본 종류</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#3455DB]">{bindingCosts.length}</p>
            <p className="text-sm text-gray-500 mt-1">총 비용 데이터</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#3455DB]">{bindingTypes.filter(t => t.is_active).length}</p>
            <p className="text-sm text-gray-500 mt-1">활성 종류</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#3455DB]">{bindingCosts.filter(c => c.is_active).length}</p>
            <p className="text-sm text-gray-500 mt-1">활성 비용</p>
          </div>
        </div>
      </div>
    </div>
  );
}
