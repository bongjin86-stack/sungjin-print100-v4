import { useState, useEffect, useCallback } from 'react';
import { getOrders, STATUS_LABELS, STATUS_COLORS } from '@/lib/orderService';
import OrderDetailModal from './OrderDetailModal';

// 정렬 옵션
const SORT_OPTIONS = [
  { value: 'created_at:desc', label: '최신순' },
  { value: 'created_at:asc', label: '오래된순' },
  { value: 'total_amount:desc', label: '금액높은순' },
  { value: 'total_amount:asc', label: '금액낮은순' },
];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 필터 상태
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('created_at:desc');
  const [page, setPage] = useState(1);
  const limit = 20;

  // 모달 상태
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  // 주문 목록 로드
  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [sortBy, order] = sort.split(':');
      const result = await getOrders({
        status: status === 'all' ? null : status,
        search,
        page,
        limit,
        sortBy,
        order,
      });

      setOrders(result.orders);
      setTotal(result.total);
      setStatusCounts(result.statusCounts);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [status, search, sort, page]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // 검색 디바운스
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // 상태 탭 변경
  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    setPage(1);
  };

  // 정렬 변경
  const handleSortChange = (e) => {
    setSort(e.target.value);
    setPage(1);
  };

  // 금액 포맷
  const formatPrice = (price) => {
    return `₩${price?.toLocaleString() || 0}`;
  };

  // 날짜 포맷
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  };

  // 상품 요약
  const getItemSummary = (items) => {
    if (!items || items.length === 0) return '-';
    const first = items[0];
    return {
      name: first.productName || '-',
      spec: `${first.spec?.size || ''} · ${first.spec?.quantity || 0}부${first.spec?.pages ? ` · ${first.spec.pages}p` : ''}`,
    };
  };

  // 페이지네이션
  const totalPages = Math.ceil(total / limit);

  // 상태 탭 목록
  const statusTabs = [
    { key: 'all', label: '전체' },
    { key: 'pending', label: '입금대기' },
    { key: 'confirmed', label: '입금확인' },
    { key: 'in_production', label: '제작중' },
    { key: 'shipped', label: '배송중' },
    { key: 'completed', label: '완료' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* 페이지 타이틀 */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900">주문관리</h2>
        <p className="text-gray-500 mt-1">총 {statusCounts.all || 0}건의 주문</p>
      </div>

      {/* 상태 탭 */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleStatusChange(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              status === tab.key
                ? 'bg-[#222828] text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.label}
            <span className={`ml-1 px-2 py-0.5 rounded text-xs ${
              status === tab.key
                ? 'bg-white/20'
                : tab.key === 'all'
                  ? 'bg-gray-100 text-gray-600'
                  : STATUS_COLORS[tab.key]
            }`}>
              {statusCounts[tab.key] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* 검색 및 정렬 */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="주문번호, 고객명, 전화번호로 검색"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#222828]/20 focus:border-[#222828]"
          />
          <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>
        <select
          value={sort}
          onChange={handleSortChange}
          className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#222828]/20"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 로딩 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#222828]"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">주문이 없습니다.</p>
        </div>
      ) : (
        <>
          {/* 주문 목록 테이블 */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">주문번호</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">고객정보</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">상품</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">금액</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">주문일</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => {
                  const itemSummary = getItemSummary(order.items);
                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrderId(order.id)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm font-medium text-gray-900">{order.order_number}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{order.recipient || '-'}</div>
                        <div className="text-xs text-gray-500">{order.customer_phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{itemSummary.name}</div>
                        <div className="text-xs text-gray-500">{itemSummary.spec}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-sm font-semibold text-gray-900">{formatPrice(order.total_amount)}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                          {STATUS_LABELS[order.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-500">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button className="text-gray-400 hover:text-gray-600">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-gray-500">
              {((page - 1) * limit) + 1}-{Math.min(page * limit, total)} / {total}건
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                이전
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-1.5 rounded-lg text-sm ${
                      page === pageNum
                        ? 'bg-[#222828] text-white'
                        : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                다음
              </button>
            </div>
          </div>
        </>
      )}

      {/* 주문 상세 모달 */}
      {selectedOrderId && (
        <OrderDetailModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onUpdate={loadOrders}
        />
      )}
    </div>
  );
}
