import React, { useState, useEffect, useRef } from 'react';
import { supabase, uploadImage, deleteImage } from '@/lib/supabase';
import { clearCache } from '@/lib/dbService';

/**
 * 용지 관리 페이지 컴포넌트
 * - papers 테이블: 용지 종류
 * - paper_costs 테이블: 용지별 단가
 * - CRUD 기능 포함
 */
export default function PapersPage() {
  const [papers, setPapers] = useState([]);
  const [paperCosts, setPaperCosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // CRUD 상태 - 용지 종류
  const [showAddPaper, setShowAddPaper] = useState(false);
  const [editingPaperId, setEditingPaperId] = useState(null);
  const [paperFormData, setPaperFormData] = useState({
    code: '', name: '', description: '', is_active: true, image_url: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [quickUploadPaperId, setQuickUploadPaperId] = useState(null);
  const imageInputRef = useRef(null);
  const quickImageInputRef = useRef(null);

  // CRUD 상태 - 용지 단가
  const [showAddCost, setShowAddCost] = useState(false);
  const [editingCostId, setEditingCostId] = useState(null);
  const [costFormData, setCostFormData] = useState({
    paper_id: '', weight: '', base_sheet: '467x315', cost_per_sheet: '', margin_rate: '1.5', is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [papersRes, costsRes] = await Promise.all([
        supabase.from('papers').select('*').order('sort_order').order('id'),
        supabase.from('paper_costs').select('*, paper:papers(id, code, name)').order('paper_id').order('weight')
      ]);

      if (papersRes.error) throw papersRes.error;
      if (costsRes.error) throw costsRes.error;

      setPapers(papersRes.data);
      setPaperCosts(costsRes.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 용지 종류 CRUD
  const resetPaperForm = () => {
    setPaperFormData({ code: '', name: '', description: '', is_active: true, image_url: '' });
    setImageFile(null);
    setImagePreview(null);
    setShowAddPaper(false);
    setEditingPaperId(null);
  };

  // 이미지 파일 선택 처리
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      // 미리보기 생성
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // 이미지 업로드 처리
  const uploadPaperImage = async (code) => {
    if (!imageFile) return paperFormData.image_url; // 기존 URL 유지

    const ext = imageFile.name.split('.').pop();
    const path = `papers/${code}.${ext}`;

    try {
      const url = await uploadImage(path, imageFile);
      return url;
    } catch (err) {
      console.error('이미지 업로드 실패:', err);
      throw err;
    }
  };

  // 테이블에서 바로 이미지 업로드 (빠른 업로드)
  const handleQuickImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !quickUploadPaperId) return;

    const paper = papers.find(p => p.id === quickUploadPaperId);
    if (!paper) return;

    try {
      setUploading(true);
      const ext = file.name.split('.').pop();
      const path = `papers/${paper.code}.${ext}`;
      const url = await uploadImage(path, file);

      // DB 업데이트
      const { error } = await supabase
        .from('papers')
        .update({ image_url: url })
        .eq('id', quickUploadPaperId);

      if (error) throw error;
      loadData();
    } catch (err) {
      alert('이미지 업로드 실패: ' + err.message);
    } finally {
      setUploading(false);
      setQuickUploadPaperId(null);
    }
  };

  // 빠른 업로드 시작
  const startQuickUpload = (paperId) => {
    setQuickUploadPaperId(paperId);
    setTimeout(() => quickImageInputRef.current?.click(), 0);
  };

  const handleAddPaper = async (e) => {
    e.preventDefault();
    try {
      setUploading(true);

      // 이미지 업로드 (있는 경우)
      let imageUrl = '';
      if (imageFile) {
        imageUrl = await uploadPaperImage(paperFormData.code);
      }

      const { error } = await supabase.from('papers').insert({
        ...paperFormData,
        image_url: imageUrl || null
      });
      if (error) throw error;
      alert('용지 추가 완료!');
      resetPaperForm();
      loadData();
    } catch (err) {
      alert('추가 실패: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const startEditPaper = (paper) => {
    setEditingPaperId(paper.id);
    setPaperFormData({
      code: paper.code, name: paper.name, description: paper.description || '', is_active: paper.is_active, image_url: paper.image_url || ''
    });
    setImagePreview(paper.image_url || null);
    setImageFile(null);
  };

  const handleUpdatePaper = async (e) => {
    e.preventDefault();
    try {
      setUploading(true);

      // 이미지 업로드 (새 파일 선택된 경우)
      let imageUrl = paperFormData.image_url;
      if (imageFile) {
        imageUrl = await uploadPaperImage(paperFormData.code);
      }

      const { error } = await supabase.from('papers').update({
        ...paperFormData,
        image_url: imageUrl || null
      }).eq('id', editingPaperId);
      if (error) throw error;
      alert('수정 완료!');
      resetPaperForm();
      loadData();
    } catch (err) {
      alert('수정 실패: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePaper = async (id) => {
    if (!window.confirm('이 용지를 삭제하면 관련 단가도 삭제됩니다. 계속하시겠습니까?')) return;
    try {
      const { error } = await supabase.from('papers').delete().eq('id', id);
      if (error) throw error;
      alert('삭제 완료!');
      loadData();
    } catch (err) {
      alert('삭제 실패: ' + err.message);
    }
  };

  // 용지 순서 초기화 (현재 순서대로 1, 2, 3... 재설정)
  const resetPaperOrder = async () => {
    if (!window.confirm('모든 용지의 순서를 1, 2, 3... 으로 재설정하시겠습니까?')) return;

    try {
      const updates = papers.map((paper, index) =>
        supabase.from('papers').update({ sort_order: index + 1 }).eq('id', paper.id)
      );
      await Promise.all(updates);
      alert('순서 초기화 완료!');
      clearCache(); // 가격 데이터 캐시 초기화
      loadData();
    } catch (err) {
      alert('순서 초기화 실패: ' + err.message);
    }
  };

  // 용지 순서 변경 (위로/아래로)
  const movePaper = async (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === papers.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const currentPaper = papers[index];
    const targetPaper = papers[newIndex];

    try {
      // sort_order 값 교환
      const currentOrder = currentPaper.sort_order ?? index;
      const targetOrder = targetPaper.sort_order ?? newIndex;

      await Promise.all([
        supabase.from('papers').update({ sort_order: targetOrder }).eq('id', currentPaper.id),
        supabase.from('papers').update({ sort_order: currentOrder }).eq('id', targetPaper.id)
      ]);

      clearCache(); // 가격 데이터 캐시 초기화
      loadData();
    } catch (err) {
      alert('순서 변경 실패: ' + err.message);
    }
  };

  // 용지 단가 CRUD
  const resetCostForm = () => {
    setCostFormData({ paper_id: '', weight: '', base_sheet: '467x315', cost_per_sheet: '', margin_rate: '1.5', is_active: true });
    setShowAddCost(false);
    setEditingCostId(null);
  };

  const handleAddCost = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('paper_costs').insert({
        paper_id: parseInt(costFormData.paper_id),
        weight: parseInt(costFormData.weight),
        base_sheet: costFormData.base_sheet,
        cost_per_sheet: parseInt(costFormData.cost_per_sheet),
        margin_rate: parseFloat(costFormData.margin_rate),
        is_active: costFormData.is_active
      });
      if (error) throw error;
      alert('단가 추가 완료!');
      resetCostForm();
      loadData();
    } catch (err) {
      alert('추가 실패: ' + err.message);
    }
  };

  const startEditCost = (cost) => {
    setEditingCostId(cost.id);
    setCostFormData({
      paper_id: cost.paper_id, weight: cost.weight, base_sheet: cost.base_sheet,
      cost_per_sheet: cost.cost_per_sheet, margin_rate: cost.margin_rate || '1.5', is_active: cost.is_active
    });
  };

  const handleUpdateCost = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('paper_costs').update({
        paper_id: parseInt(costFormData.paper_id),
        weight: parseInt(costFormData.weight),
        base_sheet: costFormData.base_sheet,
        cost_per_sheet: parseInt(costFormData.cost_per_sheet),
        margin_rate: parseFloat(costFormData.margin_rate),
        is_active: costFormData.is_active
      }).eq('id', editingCostId);
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
      const { error } = await supabase.from('paper_costs').delete().eq('id', id);
      if (error) throw error;
      alert('삭제 완료!');
      loadData();
    } catch (err) {
      alert('삭제 실패: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">용지 관리</h1>
          <p className="text-gray-500 mt-1">용지 종류 및 단가를 관리합니다.</p>
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
          <h1 className="text-2xl font-semibold text-gray-900">용지 관리</h1>
          <p className="text-gray-500 mt-1">용지 종류 및 단가를 관리합니다.</p>
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
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">용지 관리</h1>
        <p className="text-gray-500 mt-1">용지 종류 및 단가를 관리합니다.</p>
      </div>

      {/* 용지 종류 섹션 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">용지 종류 (papers)</h2>
          <div className="flex gap-2">
            <button onClick={resetPaperOrder} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors">순서 초기화</button>
            <button onClick={() => setShowAddPaper(true)} className="px-3 py-1.5 bg-[#3455DB] hover:bg-[#2a44b0] text-white text-sm font-medium rounded-lg transition-colors">+ 용지 추가</button>
          </div>
        </div>

        {(showAddPaper || editingPaperId) && (
          <div className="bg-white rounded-xl border border-gray-200 mb-4 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">{editingPaperId ? '용지 수정' : '새 용지 추가'}</h3>
            <form onSubmit={editingPaperId ? handleUpdatePaper : handleAddPaper} className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <input type="text" placeholder="코드 (예: artpaper)" value={paperFormData.code} onChange={(e) => setPaperFormData({...paperFormData, code: e.target.value})} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3455DB] focus:border-transparent" required />
                <input type="text" placeholder="이름 (예: 아트지)" value={paperFormData.name} onChange={(e) => setPaperFormData({...paperFormData, name: e.target.value})} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3455DB] focus:border-transparent" required />
                <input type="text" placeholder="설명" value={paperFormData.description} onChange={(e) => setPaperFormData({...paperFormData, description: e.target.value})} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3455DB] focus:border-transparent" />
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={paperFormData.is_active} onChange={(e) => setPaperFormData({...paperFormData, is_active: e.target.checked})} className="w-4 h-4 rounded border-gray-300 text-[#3455DB] focus:ring-[#3455DB]" /> <span className="text-sm text-gray-700">활성</span></label>
              </div>

              {/* 이미지 업로드 */}
              <div className="flex items-center gap-4">
                <div
                  onClick={() => imageInputRef.current?.click()}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 hover:border-[#3455DB] flex items-center justify-center cursor-pointer transition-colors overflow-hidden bg-gray-50"
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="미리보기" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl text-gray-400">+</span>
                  )}
                </div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <div className="text-sm">
                  <p className="font-medium text-gray-900">용지 샘플 이미지</p>
                  <p className="text-gray-500">클릭하여 이미지 선택 (권장: 정사각형)</p>
                  {imageFile && <p className="text-[#3455DB] mt-1">{imageFile.name}</p>}
                </div>
              </div>

              <div className="flex gap-2">
                <button type="submit" disabled={uploading} className="px-4 py-2 bg-[#3455DB] hover:bg-[#2a44b0] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                  {uploading ? '업로드 중...' : (editingPaperId ? '수정' : '추가')}
                </button>
                <button type="button" onClick={resetPaperForm} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors">취소</button>
              </div>
            </form>
          </div>
        )}

        {/* 빠른 이미지 업로드용 hidden input */}
        <input
          ref={quickImageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleQuickImageUpload}
        />

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase w-20">순서</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">이미지</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">코드</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">설명</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">상태</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {papers.map((paper, index) => (
                <tr key={paper.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3 text-center">
                    <div className="flex flex-col gap-1 items-center">
                      <button
                        onClick={() => movePaper(index, 'up')}
                        disabled={index === 0}
                        className={`px-2 py-0.5 text-xs rounded transition-colors ${index === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-200'}`}
                      >
                        ▲
                      </button>
                      <span className="text-xs text-gray-400">{paper.sort_order ?? '-'}</span>
                      <button
                        onClick={() => movePaper(index, 'down')}
                        disabled={index === papers.length - 1}
                        className={`px-2 py-0.5 text-xs rounded transition-colors ${index === papers.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-200'}`}
                      >
                        ▼
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div
                      onClick={() => startQuickUpload(paper.id)}
                      className={`w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-[#3455DB] transition-all relative group ${uploading && quickUploadPaperId === paper.id ? 'opacity-50' : ''}`}
                      style={{maxWidth: '48px', maxHeight: '48px'}}
                    >
                      {paper.image_url ? (
                        <>
                          <img src={paper.image_url} alt={paper.name} className="w-full h-full object-cover" style={{maxWidth: '48px', maxHeight: '48px'}} />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-lg">+</span>
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-400 text-xl font-bold">+</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-gray-900">{paper.code}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{paper.name}</td>
                  <td className="px-4 py-3 text-gray-500">{paper.description || '-'}</td>
                  <td className="px-4 py-3 text-center"><span className={`px-2 py-1 text-xs rounded-full ${paper.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{paper.is_active ? '활성' : '비활성'}</span></td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => startEditPaper(paper)} className="px-2 py-1 text-xs border border-gray-300 hover:bg-gray-100 rounded-lg transition-colors mr-1">수정</button>
                    <button onClick={() => handleDeletePaper(paper.id)} className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors">삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 용지 단가 섹션 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">용지 단가 (paper_costs)</h2>
          <button onClick={() => setShowAddCost(true)} className="px-3 py-1.5 bg-[#3455DB] hover:bg-[#2a44b0] text-white text-sm font-medium rounded-lg transition-colors">+ 단가 추가</button>
        </div>

        {(showAddCost || editingCostId) && (
          <div className="bg-white rounded-xl border border-gray-200 mb-4 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">{editingCostId ? '단가 수정' : '새 단가 추가'}</h3>
            <form onSubmit={editingCostId ? handleUpdateCost : handleAddCost} className="grid grid-cols-2 md:grid-cols-7 gap-4">
              <select value={costFormData.paper_id} onChange={(e) => setCostFormData({...costFormData, paper_id: e.target.value})} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3455DB] focus:border-transparent" required>
                <option value="">용지 선택</option>
                {papers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="number" placeholder="평량 (g)" value={costFormData.weight} onChange={(e) => setCostFormData({...costFormData, weight: e.target.value})} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3455DB] focus:border-transparent" required />
              <select value={costFormData.base_sheet} onChange={(e) => setCostFormData({...costFormData, base_sheet: e.target.value})} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3455DB] focus:border-transparent">
                <option value="467x315">467x315</option>
                <option value="390x270">390x270</option>
              </select>
              <input type="number" placeholder="장당 단가" value={costFormData.cost_per_sheet} onChange={(e) => setCostFormData({...costFormData, cost_per_sheet: e.target.value})} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3455DB] focus:border-transparent" required />
              <input type="number" step="0.1" placeholder="마진율" value={costFormData.margin_rate} onChange={(e) => setCostFormData({...costFormData, margin_rate: e.target.value})} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3455DB] focus:border-transparent" />
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={costFormData.is_active} onChange={(e) => setCostFormData({...costFormData, is_active: e.target.checked})} className="w-4 h-4 rounded border-gray-300 text-[#3455DB] focus:ring-[#3455DB]" /> <span className="text-sm text-gray-700">활성</span></label>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-[#3455DB] hover:bg-[#2a44b0] text-white text-sm font-medium rounded-lg transition-colors">{editingCostId ? '수정' : '추가'}</button>
                <button type="button" onClick={resetCostForm} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors">취소</button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">용지</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">평량</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">기준 용지</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">장당 단가</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">마진율</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">상태</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paperCosts.map((cost) => (
                <tr key={cost.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{cost.paper?.name || '-'}</td>
                  <td className="px-4 py-3 text-center text-gray-900">{cost.weight}g</td>
                  <td className="px-4 py-3 text-center"><span className={`px-2 py-1 text-xs rounded-full ${cost.base_sheet === '467x315' ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'}`}>{cost.base_sheet}</span></td>
                  <td className="px-4 py-3 text-right font-medium text-[#3455DB]">{(cost.cost_per_sheet || 0).toLocaleString()}원</td>
                  <td className="px-4 py-3 text-center text-gray-900">{cost.margin_rate || '-'}</td>
                  <td className="px-4 py-3 text-center"><span className={`px-2 py-1 text-xs rounded-full ${cost.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{cost.is_active ? '활성' : '비활성'}</span></td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => startEditCost(cost)} className="px-2 py-1 text-xs border border-gray-300 hover:bg-gray-100 rounded-lg transition-colors mr-1">수정</button>
                    <button onClick={() => handleDeleteCost(cost.id)} className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors">삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 요약 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">데이터 요약</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-[#3455DB]">{papers.length}</p>
            <p className="text-sm text-gray-500 mt-1">용지 종류</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#3455DB]">{paperCosts.length}</p>
            <p className="text-sm text-gray-500 mt-1">단가 데이터</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#3455DB]">{paperCosts.filter(c => c.base_sheet === '467x315').length}</p>
            <p className="text-sm text-gray-500 mt-1">467x315</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#3455DB]">{paperCosts.filter(c => c.base_sheet === '390x270').length}</p>
            <p className="text-sm text-gray-500 mt-1">390x270</p>
          </div>
        </div>
      </div>
    </div>
  );
}
