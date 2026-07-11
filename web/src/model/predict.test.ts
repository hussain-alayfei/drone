/**
 * اختبار التطابق: مشي الأشجار في المتصفح يجب أن يعيد نفس تنبؤات sklearn
 * (clay/sand) لنفس القراءات، والصنف المشتق يجب أن يطابق مثلث USDA في بايثون.
 * الحالات من export_web_model.py — لو انحرف أحد الطرفين ينكشف هنا.
 */
import { beforeAll, describe, expect, it } from "vitest";
import cases from "./parity_cases.json";
import {
  ensureModel,
  predict,
  toSoilClass,
  usdaTexture,
  type GammaReading,
} from "./predict";

interface Case {
  reading: GammaReading;
  expected: { clay: number; sand: number; soil: string };
}

beforeAll(async () => {
  await ensureModel();
});

describe("regression parity with sklearn", () => {
  (cases as Case[]).forEach((c, i) => {
    it(`case ${i}: K=${c.reading.K.toFixed(2)} Th=${c.reading.Th.toFixed(2)}`, () => {
      const p = predict(c.reading);
      expect(p.clay).toBeCloseTo(c.expected.clay, 6);
      expect(p.sand).toBeCloseTo(c.expected.sand, 6);
      expect(p.soil).toBe(c.expected.soil);
    });
  });
});

describe("USDA texture triangle (canonical points)", () => {
  const canon: [number, number, number, string][] = [
    [95, 3, 2, "sand"],
    [82, 12, 6, "loamy sand"],
    [65, 25, 10, "sandy loam"],
    [40, 40, 20, "loam"],
    [20, 65, 15, "silt loam"],
    [5, 90, 5, "silt"],
    [60, 15, 25, "sandy clay loam"],
    [33, 34, 33, "clay loam"],
    [10, 57, 33, "silty clay loam"],
    [50, 5, 45, "sandy clay"],
    [7, 48, 45, "silty clay"],
    [20, 20, 60, "clay"],
  ];
  canon.forEach(([sand, silt, clay, want]) => {
    it(`${want} (${sand}/${silt}/${clay})`, () => {
      expect(usdaTexture(sand, silt, clay)).toBe(want);
    });
  });

  it("groups by clay content (clay loam is Clay, not Loam)", () => {
    expect(toSoilClass(33, 33)).toBe("Clay");
    expect(toSoilClass(20, 40)).toBe("Loam");
    expect(toSoilClass(5, 90)).toBe("Sandy");
  });
});
