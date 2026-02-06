/**
 * 출고일 계산 (영업일 기준)
 * @param businessDays - 제작 영업일 수
 * @returns "2026.02.04 (수)" 형식
 */
export function calculateReleaseDate(businessDays: number): string {
  const today = new Date();
  let count = 0;
  const result = new Date(today);

  while (count < businessDays) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
  }

  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const year = result.getFullYear();
  const month = String(result.getMonth() + 1).padStart(2, '0');
  const day = String(result.getDate()).padStart(2, '0');
  const weekday = weekdays[result.getDay()];

  return `${year}.${month}.${day} (${weekday})`;
}

/**
 * 특정 날짜 기준으로 출고일 계산 (영업일 기준)
 * @param startDate - 기준 날짜
 * @param businessDays - 제작 영업일 수
 * @returns "2026.02.04 (수)" 형식
 */
export function calculateReleaseDateFrom(
  startDate: string | Date,
  businessDays: number
): string {
  const start = new Date(startDate);
  let count = 0;
  const result = new Date(start);

  while (count < businessDays) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
  }

  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const year = result.getFullYear();
  const month = String(result.getMonth() + 1).padStart(2, '0');
  const day = String(result.getDate()).padStart(2, '0');
  const weekday = weekdays[result.getDay()];

  return `${year}.${month}.${day} (${weekday})`;
}
