/**
 * محمّل شبكة المسح الإشعاعي الحقيقية (USGS NURE / BMNUS، غرب الولايات المتحدة).
 *
 * الملفان في public/ ويُجلبان عند الطلب — لا يدخلان حزمة JS.
 * كل خلية = متوسط النقاط المقيسة الواقعة داخلها (12 كم)، ولا تُستنبط قيم
 * لخلايا بلا بيانات: تبقى NODATA وتُرسم كفجوة.
 *
 * يولّدهما drone/export_web_grid.py — أي تغيير في الصيغة هناك يستلزم تعديل هنا.
 */
export type Channel = "K" | "U" | "Th" | "TC";

export interface GridHeader {
  cols: number;
  rows: number;
  nodata: number;
  cellKm: number;
  bounds: { lat0: number; lat1: number; lon0: number; lon1: number };
  channels: Channel[];
  planes: string[];
  range: Record<string, { min: number; max: number }>;
  source: string;
}

export interface Grid {
  header: GridHeader;
  /** قيم مفكوكة إلى وحداتها الأصلية؛ NaN = لا بيانات */
  plane: Record<string, Float32Array>;
  /** القنوات المتاحة فعلاً في هذا التصدير */
  channels: Channel[];
  at(channel: string, col: number, row: number): number;
  latLon(col: number, row: number): { lat: number; lon: number };
}

const U16_MAX = 65534;

function decode(
  raw: Uint16Array,
  offset: number,
  n: number,
  min: number,
  max: number,
  nodata: number,
): Float32Array {
  const span = max - min || 1;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const v = raw[offset + i];
    out[i] = v === nodata ? NaN : min + (v / U16_MAX) * span;
  }
  return out;
}

let cached: Promise<Grid> | null = null;

export function loadGrid(): Promise<Grid> {
  if (cached) return cached;

  cached = (async () => {
    const [header, bin] = await Promise.all([
      fetch("/us-grid.json").then((r) => {
        if (!r.ok) throw new Error(`us-grid.json: ${r.status}`);
        return r.json() as Promise<GridHeader>;
      }),
      fetch("/us-grid.bin").then((r) => {
        if (!r.ok) throw new Error(`us-grid.bin: ${r.status}`);
        return r.arrayBuffer();
      }),
    ]);

    const n = header.cols * header.rows;
    const raw = new Uint16Array(bin);
    if (raw.length < n * header.planes.length) {
      throw new Error("us-grid.bin is shorter than its header claims");
    }

    const plane: Record<string, Float32Array> = {};
    header.planes.forEach((name, i) => {
      const { min, max } = header.range[name];
      plane[name] = decode(raw, i * n, n, min, max, header.nodata);
    });

    const idx = (c: number, r: number) => r * header.cols + c;

    return {
      header,
      plane,
      channels: header.channels,
      at: (channel, col, row) => plane[channel]?.[idx(col, row)] ?? NaN,
      latLon: (col, row) => ({
        lat: plane.lat[idx(col, row)],
        lon: plane.lon[idx(col, row)],
      }),
    } satisfies Grid;
  })();

  return cached;
}
