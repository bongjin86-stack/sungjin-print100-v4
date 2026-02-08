/**
 * 박스 수량 및 무게 자동 계산
 * 기준: 467x315mm 원지 (A4 2up), 30cm 박스
 */

export interface PackagingResult {
  totalSheets: number;
  totalThickness: number;
  boxCount: number;
  totalWeight: number;
  weightPerBox: number;
  needsFreight: boolean;
}

export interface BindingPackagingResult {
  boxCount: number;
  totalWeight: number;
  weightPerBox: number;
  needsFreight: boolean;
}

export function calculatePackaging(
  quantity: number,
  paperThickness: number,
  paperWeight: number,
  isDoubleSided = true
): PackagingResult {
  if (!quantity || !paperThickness || !paperWeight) {
    return {
      totalSheets: 0,
      totalThickness: 0,
      boxCount: 1,
      totalWeight: 0,
      weightPerBox: 0,
      needsFreight: false,
    };
  }

  const sheetsPerUnit = isDoubleSided ? 2 : 1;
  const totalSheets = Math.ceil(quantity / sheetsPerUnit);
  const totalThickness = totalSheets * paperThickness;
  const boxCount = Math.max(1, Math.ceil(totalThickness / 300));
  const sheetArea = 0.147105; // 467x315mm
  const totalWeightGrams = totalSheets * sheetArea * paperWeight;
  const totalWeight = totalWeightGrams / 1000;
  const weightPerBox = boxCount > 0 ? totalWeight / boxCount : 0;
  const needsFreight = weightPerBox > 30;

  return {
    totalSheets,
    totalThickness: Math.round(totalThickness * 10) / 10,
    boxCount,
    totalWeight: Math.round(totalWeight * 10) / 10,
    weightPerBox: Math.round(weightPerBox * 10) / 10,
    needsFreight,
  };
}

export const PAPER_THICKNESS: Record<string, number> = {
  snow_100: 0.111,
  snow_120: 0.133,
  snow_150: 0.166,
  snow_180: 0.2,
  snow_200: 0.222,
  snow_250: 0.278,
  snow_300: 0.333,
  art_100: 0.095,
  art_120: 0.114,
  art_150: 0.143,
  art_180: 0.171,
  art_200: 0.19,
  art_250: 0.238,
  art_300: 0.286,
};

export function estimateThickness(
  weight: number,
  paperType: "snow" | "art" = "snow"
): number {
  const ratio = paperType === "art" ? 0.00095 : 0.00111;
  return weight * ratio;
}

export function calculateBindingPackaging(
  quantity: number,
  pages: number,
  innerWeight?: number,
  coverWeight?: number
): BindingPackagingResult {
  if (!quantity || !pages) {
    return {
      boxCount: 1,
      totalWeight: 0,
      weightPerBox: 0,
      needsFreight: false,
    };
  }

  const sheetArea = 0.06237; // A4 210x297mm
  const innerSheets = Math.ceil(pages / 2);
  const innerWeightKg =
    (innerSheets * quantity * sheetArea * (innerWeight || 80)) / 1000;
  const coverWeightKg =
    (quantity * sheetArea * 2 * (coverWeight || 200)) / 1000;
  const totalWeight = innerWeightKg + coverWeightKg;
  const thicknessPerBook = pages * 0.1;
  const totalThickness = thicknessPerBook * quantity;
  const boxCount = Math.max(1, Math.ceil(totalThickness / 300));
  const weightPerBox = boxCount > 0 ? totalWeight / boxCount : 0;

  return {
    boxCount,
    totalWeight: Math.round(totalWeight * 10) / 10,
    weightPerBox: Math.round(weightPerBox * 10) / 10,
    needsFreight: weightPerBox > 30,
  };
}
