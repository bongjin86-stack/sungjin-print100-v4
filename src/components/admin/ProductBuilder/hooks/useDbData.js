/**
 * useDbData - DB 데이터 로드 훅
 *
 * 용지, 평량, 사이즈 데이터를 DB에서 로드하고 관리
 */

import { useEffect, useState } from "react";

import { getBuilderData, loadPricingData } from "@/lib/dbService";

export function useDbData() {
  // DB에서 로드한 용지 데이터 (이름, 설명, 이미지)
  const [dbPapers, setDbPapers] = useState({});
  // DB에서 로드한 용지 목록 (sort_order 순서 유지)
  const [dbPapersList, setDbPapersList] = useState([]);
  // DB 용지 평량 { snow: [100,120,...], ... }
  const [dbWeights, setDbWeights] = useState(null);
  // DB 사이즈 { a4: {name:'A4', multiplier:2}, ... }
  const [dbSizes, setDbSizes] = useState(null);
  // DB 데이터 로드 완료 여부
  const [dbLoaded, setDbLoaded] = useState(false);

  useEffect(() => {
    async function loadDbPapers() {
      try {
        const data = await loadPricingData();
        if (data?.papers) {
          // 용지 맵 (코드 -> 정보)
          const paperMap = {};
          data.papers.forEach((p) => {
            paperMap[p.code] = {
              name: p.name,
              desc: p.description || "",
              image_url: p.image_url || null,
            };
          });
          setDbPapers(paperMap);
          // 용지 목록 (sort_order 순서 유지)
          setDbPapersList(
            data.papers.map((p) => ({
              code: p.code,
              name: p.name,
              desc: p.description || "",
            }))
          );
        }
        // DB 평량/사이즈 로드 (loadPricingData 후 캐시 히트)
        const bd = getBuilderData();
        if (bd) {
          // paperWeights: { snow: { all: [100,120,...] } } → { snow: [100,120,...] }
          const weights = {};
          Object.entries(bd.paperWeights).forEach(([code, v]) => {
            weights[code] = v.all;
          });
          setDbWeights(weights);
          setDbSizes(bd.sizes);
        }
        setDbLoaded(true);
      } catch (err) {
        console.error("용지 데이터 로드 실패:", err);
        setDbLoaded(true);
      }
    }
    loadDbPapers();
  }, []);

  return { dbPapers, dbPapersList, dbWeights, dbSizes, dbLoaded };
}
