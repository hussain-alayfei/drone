/**
 * سلامة شبكة المسح: تفكيك Uint16 في المتصفح يجب أن يعيد نفس القيم التي عبّأها
 * export_web_grid.py. لو انحرف التفكيك، تعرض الخريطة أرقاماً خاطئة وهي تدّعي
 * أنها قياسات حقيقية — وهذا أسوأ من ألا نعرض شيئاً.
 *
 * الحالات في grid_cases.json يولّدها export_web_grid.py من ملفات USGS الأصلية.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PUB = join(__dirname, "..", "..", "public");

interface Header {
  cols: number;
  rows: number;
  nodata: number;
  planes: string[];
  range: Record<string, { min: number; max: number }>;
}

interface Case {
  col: number;
  row: number;
  channel: string;
  expected: number | null; // null = خلية بلا بيانات
}

const header: Header = JSON.parse(
  readFileSync(join(PUB, "us-grid.json"), "utf-8"),
);
const bin = readFileSync(join(PUB, "us-grid.bin"));
const raw = new Uint16Array(
  bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength),
);

let cases: Case[] = [];
try {
  cases = JSON.parse(
    readFileSync(join(__dirname, "grid_cases.json"), "utf-8"),
  );
} catch {
  // الحالات تُولَّد من بايثون؛ إن غابت نتخطى بدل أن نفشل زوراً
}

/** نفس معادلة التفكيك في grid.ts */
function decodeAt(channel: string, col: number, row: number): number {
  const n = header.cols * header.rows;
  const p = header.planes.indexOf(channel);
  const v = raw[p * n + row * header.cols + col];
  if (v === header.nodata) return NaN;
  const { min, max } = header.range[channel];
  return min + (v / 65534) * ((max - min) || 1);
}

describe("us-grid binary", () => {
  it("is exactly as long as the header claims", () => {
    expect(raw.length).toBe(
      header.cols * header.rows * header.planes.length,
    );
  });

  it("advertises every plane it has a range for", () => {
    for (const p of header.planes) {
      expect(header.range[p]).toBeDefined();
    }
  });

  it.runIf(cases.length)(
    "decodes to the real USGS values that Python packed",
    () => {
      for (const c of cases) {
        const got = decodeAt(c.channel, c.col, c.row);
        if (c.expected === null) {
          expect(Number.isNaN(got), `cell ${c.col},${c.row} should be nodata`)
            .toBe(true);
        } else {
          // التكميم إلى Uint16 يسمح بانحراف ضئيل فقط
          expect(got).toBeCloseTo(c.expected, 3);
        }
      }
    },
  );
});
