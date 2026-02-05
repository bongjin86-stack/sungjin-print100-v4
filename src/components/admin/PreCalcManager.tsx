import React, { useEffect,useState } from 'react';

import { supabase } from '@/lib/supabase';

interface SizePaperPriceRow {
  id: number;
  up_count: number;
  cost_per_sheet: number;
  margin_rate: number;
  sell_price_per_sheet: number;
  sell_price_per_copy: number;
  is_active: boolean;
  size?: { id: number; code: string; name: string };
  paper_cost?: {
    id: number;
    paper_id: number;
    weight: number;
    paper?: { id: number; code: string; name: string };
  };
}

export default function PreCalcManager() {
  const [data, setData] = useState<SizePaperPriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: rows, error: fetchError } = await supabase
        .from('size_paper_price')
        .select('*, size:sizes(id, code, name), paper_cost:paper_costs(id, paper_id, weight, paper:papers(id, code, name))')
        .eq('is_active', true)
        .order('id');

      if (fetchError) throw fetchError;
      setData(rows || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    if (!window.confirm('1차 계산 데이터를 재계산하시겠습니까?\n기존 데이터가 갱신됩니다.')) return;

    try {
      setRecalculating(true);
      const { error: rpcError } = await supabase.rpc('populate_size_paper_price');
      if (rpcError) throw rpcError;

      alert('재계산 완료!');
      loadData();
    } catch (err: any) {
      alert('재계산 실패: ' + err.message);
    } finally {
      setRecalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">1차 계산 데이터</h1>
          <p className="text-gray-500 mt-1">사이즈 x 용지 조합별 선계산된 가격 데이터입니다.</p>
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
          <h1 className="text-2xl font-semibold text-gray-900">1차 계산 데이터</h1>
          <p className="text-gray-500 mt-1">사이즈 x 용지 조합별 선계산된 가격 데이터입니다.</p>
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
          <h1 className="text-2xl font-semibold text-gray-900">1차 계산 데이터</h1>
          <p className="text-gray-500 mt-1">사이즈 x 용지 조합별 선계산된 가격 데이터입니다.</p>
        </div>
        <button
          onClick={handleRecalculate}
          disabled={recalculating}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {recalculating ? '재계산 중...' : '재계산'}
        </button>
      </div>

      {/* 요약 카드 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">데이터 요약</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-[#3455DB]">{data.length}</p>
            <p className="text-sm text-gray-500 mt-1">총 레코드</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#3455DB]">
              {new Set(data.map(d => d.size?.code).filter(Boolean)).size}
            </p>
            <p className="text-sm text-gray-500 mt-1">사이즈 종류</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#3455DB]">
              {new Set(data.map(d => d.paper_cost?.paper?.code).filter(Boolean)).size}
            </p>
            <p className="text-sm text-gray-500 mt-1">용지 종류</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#3455DB]">
              {new Set(data.map(d => d.paper_cost?.weight).filter(Boolean)).size}
            </p>
            <p className="text-sm text-gray-500 mt-1">평량 종류</p>
          </div>
        </div>
      </div>

      {/* 데이터 테이블 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">사이즈</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">용지</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">평량</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">배수</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">용지 원가</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">마진율</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">전지 판매가</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">낱장 판매가</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {row.size?.name || '-'}
                    <span className="ml-1 text-xs text-gray-400">({row.size?.code})</span>
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    {row.paper_cost?.paper?.name || '-'}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-900">{row.paper_cost?.weight}g</td>
                  <td className="px-4 py-3 text-center font-medium text-[#3455DB]">{row.up_count}</td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    {Number(row.cost_per_sheet).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-700">
                      {(Number(row.margin_rate) * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {Number(row.sell_price_per_sheet).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-orange-600">
                    {Number(row.sell_price_per_copy).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
