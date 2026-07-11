/**
 * اختبار المطابقة Python ↔ TypeScript:
 * كل حالة في parity_cases.json حُسبت احتمالاتها بـ sklearn في export_web_model.py.
 * أي فرق > 1e-9 يعني انحراف منطق (ترتيب خصائص، معادلة، مشي الأشجار).
 */
import { beforeAll, describe, expect, it } from "vitest";
import cases from "./parity_cases.json";
import { ensureModel, predict, type SoilClass } from "./predict";

beforeAll(async () => {
  await ensureModel();
});

describe("RandomForest parity with sklearn", () => {
  it.each(cases.map((c, i) => [i, c] as const))(
    "case %i matches Python probabilities",
    (_i, c) => {
      const { probs } = predict(c.raw);
      for (const cls of Object.keys(c.expected) as SoilClass[]) {
        expect(probs[cls]).toBeCloseTo(c.expected[cls], 9);
      }
    },
  );

  it("predicts Sandy for a quartz-poor reading", () => {
    const { soil } = predict({
      K_pct: 0.5,
      U_ppm: 1.0,
      Th_ppm: 3.5,
      Cs137_Bq_kg: 2.0,
    });
    expect(soil).toBe("Sandy");
  });

  it("predicts Clay for a high-radionuclide reading", () => {
    const { soil } = predict({
      K_pct: 2.4,
      U_ppm: 3.9,
      Th_ppm: 14.5,
      Cs137_Bq_kg: 3.0,
    });
    expect(soil).toBe("Clay");
  });
});
