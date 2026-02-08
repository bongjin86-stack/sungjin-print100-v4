// DB Service Test Script
import {
  loadPricingData,
  getPaperWeights,
  getPaperCost,
  getSizeInfo,
} from "./src/lib/dbService.ts";

async function test() {
  console.log("🔄 DB 서비스 테스트 시작...\n");

  try {
    // 1. 데이터 로드
    console.log("1️⃣ 가격 데이터 로드 중...");
    const data = await loadPricingData();
    console.log("✅ 로드 완료\n");

    // 2. 용지 목록
    console.log("2️⃣ 용지 목록:");
    data.papers.forEach((p) => {
      console.log(`   - ${p.name} (${p.code})`);
    });
    console.log("");

    // 3. 사이즈 목록
    console.log("3️⃣ 사이즈 목록:");
    data.sizes.forEach((s) => {
      console.log(
        `   - ${s.name} (${s.code}): ${s.width}x${s.height}mm, ${s.up_count}장`
      );
    });
    console.log("");

    // 4. 용지별 평량 조회
    console.log("4️⃣ 용지별 평량:");
    const snowWeights = getPaperWeights("snow", "467x315");
    const mojoWeights = getPaperWeights("mojo", "467x315");
    console.log(`   - 스노우지 (467x315): ${snowWeights.join(", ")}g`);
    console.log(`   - 모조지 (467x315): ${mojoWeights.join(", ")}g`);
    console.log("");

    // 5. 용지 단가 조회
    console.log("5️⃣ 용지 단가 조회:");
    const snowCost = getPaperCost("snow", 120, "467x315");
    const mojoCost = getPaperCost("mojo", 80, "467x315");
    console.log(
      `   - 스노우지 120g (467x315): ${snowCost?.cost_per_sheet}원/장, 마진율 ${snowCost?.margin_rate}`
    );
    console.log(
      `   - 모조지 80g (467x315): ${mojoCost?.cost_per_sheet}원/장, 마진율 ${mojoCost?.margin_rate}`
    );
    console.log("");

    // 6. 사이즈 정보 조회
    console.log("6️⃣ 사이즈 정보 조회:");
    const a4Info = getSizeInfo("a4");
    if (a4Info) {
      console.log(
        `   - A4: ${a4Info.width}x${a4Info.height}mm, ${a4Info.up_count}장`
      );
    }
    console.log("");

    // 7. 통계
    console.log("7️⃣ 데이터 통계:");
    console.log(`   - 용지 종류: ${data.papers.length}개`);
    console.log(`   - 용지 단가: ${data.paperCosts.length}개`);
    console.log(`   - 사이즈: ${data.sizes.length}개`);
    console.log(`   - 인쇄비 구간: ${data.printCosts.length}개`);
    console.log(`   - 후가공 종류: ${data.finishingTypes.length}개`);
    console.log(`   - 후가공 비용: ${data.finishingCosts.length}개`);
    console.log(`   - 제본 종류: ${data.bindingTypes.length}개`);
    console.log(`   - 제본 비용: ${data.bindingCosts.length}개`);
    console.log("");

    console.log("✅ 모든 테스트 통과!");
  } catch (error) {
    console.error("❌ 테스트 실패:", error.message);
    console.error(error);
  }
}

test();
