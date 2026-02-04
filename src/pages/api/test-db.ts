// DB Service Test API
// GET /api/test-db

import type { APIRoute } from 'astro';
import { loadPricingData, getPaperWeights, getPaperCost } from '../../lib/dbService';

export const GET: APIRoute = async () => {
  try {
    // DB 데이터 로드
    const data = await loadPricingData();

    // 용지별 평량 조회 테스트
    const snowWeights = getPaperWeights('snow', '467x315');
    const mojoWeights = getPaperWeights('mojo', '467x315');

    // 용지 단가 조회 테스트
    const snowCost = getPaperCost('snow', 120, '467x315');
    const mojoCost = getPaperCost('mojo', 80, '467x315');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'DB 서비스 테스트 성공',
        data: {
          papers: data.papers.map(p => ({ code: p.code, name: p.name })),
          sizes: data.sizes.map(s => ({ code: s.code, name: s.name })),
          printCostTiers: data.printCosts.length,
          finishingTypes: data.finishingTypes.map(f => ({ code: f.code, name: f.name })),
          bindingTypes: data.bindingTypes.map(b => ({ code: b.code, name: b.name })),
          tests: {
            snowWeights,
            mojoWeights,
            snowCost,
            mojoCost,
          },
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
