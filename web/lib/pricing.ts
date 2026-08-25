"use client";

// 편집 비용 단가 · 정산 (2026 단가표 — 항목별 개별 단가)
//
// 정산 = Σ(항목 수량 × 항목 단가) − 할인.  항목 = "수량 × 단가"로 통일(단위는 설명용).
//   ① 전사 기본 단가(BASE) — RATE_ITEMS.base
//   ② 고객사 단가 — 고객사 관리에서 항목별로 덮어씀 (Company.rates[key], 미지정=기본)
//   ③ 프로젝트(교재) 할인 — 편집 상세에서 할인율/할인액
//
// 청구액 = Σ(수량×단가) × (1 − 할인율) − 추가 할인액

export const won = (n: number) => `₩${Math.round(n).toLocaleString()}`;
const pos = (v: unknown, d: number) => (typeof v === "number" && isFinite(v) && v >= 0 ? v : d);

// ── 단가 항목 테이블 (소리펜 / 필기펜) ──────────────────────────
export type Pen = "sound" | "pen";
export type RateUnit = "page" | "symbol" | "each";
export type RateItem = { key: string; pen: Pen; label: string; unit: RateUnit; base: number };

export const RATE_ITEMS: RateItem[] = [
  // 소리펜
  { key: "s_page",   pen: "sound", label: "Ncode 적용",        unit: "page",   base: 500 },
  { key: "s_edit",   pen: "sound", label: "Ncode 편집(기본)",  unit: "symbol", base: 1000 },
  { key: "s_cmp2",   pen: "sound", label: "Compound 2언어",    unit: "symbol", base: 1300 },
  { key: "s_cmp3",   pen: "sound", label: "Compound 3언어",    unit: "symbol", base: 1600 },
  { key: "s_cmp4",   pen: "sound", label: "Compound 4언어",    unit: "symbol", base: 1900 },
  { key: "s_cmp5",   pen: "sound", label: "Compound 5언어",    unit: "symbol", base: 2200 },
  { key: "s_cmp6",   pen: "sound", label: "Compound 6언어",    unit: "symbol", base: 2500 },
  { key: "s_cmp7",   pen: "sound", label: "Compound 7언어",    unit: "symbol", base: 2800 },
  { key: "s_cmp8",   pen: "sound", label: "Compound 8언어",    unit: "symbol", base: 3100 },
  { key: "s_slot",   pen: "sound", label: "슬롯전환",          unit: "each",   base: 3000 },
  { key: "s_group",  pen: "sound", label: "그룹재생",          unit: "each",   base: 5000 },
  { key: "s_game",   pen: "sound", label: "게임",              unit: "each",   base: 50000 },
  { key: "s_prompt", pen: "sound", label: "프롬프트 편집",     unit: "each",   base: 50000 },
  { key: "s_rag",    pen: "sound", label: "RAG 데이터 업로드", unit: "each",   base: 50000 },
  { key: "s_4color", pen: "sound", label: "4도 Ncode 출력",    unit: "page",   base: 1000 },
  // 필기펜
  { key: "w_page",   pen: "pen",   label: "Ncode 적용",        unit: "page",   base: 500 },
  { key: "w_none",   pen: "pen",   label: "none 편집비용",     unit: "symbol", base: 1000 },
  { key: "w_custom", pen: "pen",   label: "Custom",            unit: "symbol", base: 1000 },  // (구 캘린더) · 단가 확인 필요
  { key: "w_action", pen: "pen",   label: "action 변경 편집",  unit: "symbol", base: 1500 },
  { key: "w_upload", pen: "pen",   label: "노트서버 업로드",   unit: "each",   base: 10000 }, // (구 링크)
  { key: "w_kep",    pen: "pen",   label: "교원구몬/KEP",      unit: "each",   base: 1000 },  // 단가 확인 필요
];
export const SOUND_ITEMS = RATE_ITEMS.filter((r) => r.pen === "sound");
export const PEN_ITEMS = RATE_ITEMS.filter((r) => r.pen === "pen");
// 편집 상세 심볼 배열(수량) 순서 = "적용/페이지"를 뺀 나머지 항목 (페이지는 book.pg 사용)
export const SOUND_QTY = SOUND_ITEMS.filter((r) => r.key !== "s_page");   // 14개(4도출력 포함)
export const PEN_QTY = PEN_ITEMS.filter((r) => r.key !== "w_page");        // 3개
const itemOf = (key: string) => RATE_ITEMS.find((r) => r.key === key)!;

export type RateMap = Record<string, number>;

// 고객사 단가맵 — 기본값 + 고객사 override(rates). 옛 pageUnit/symbolUnit도 흡수(적용/편집).
export function rateMapOf(c?: { rates?: RateMap; pageUnit?: number; symbolUnit?: number } | null): RateMap {
  const m: RateMap = {};
  for (const it of RATE_ITEMS) m[it.key] = it.base;
  if (c?.pageUnit != null)   { m.s_page = c.pageUnit; m.w_page = c.pageUnit; }       // 구 데이터 호환
  if (c?.symbolUnit != null) { m.s_edit = c.symbolUnit; m.w_none = c.symbolUnit; }
  if (c?.rates) for (const k in c.rates) if (typeof c.rates[k] === "number" && isFinite(c.rates[k])) m[k] = c.rates[k];
  return m;
}
// 고객사 전용 단가(기본과 다름)가 하나라도 있는가
export const hasCustomRates = (c?: { rates?: RateMap; pageUnit?: number; symbolUnit?: number } | null): boolean => {
  const m = rateMapOf(c);
  return RATE_ITEMS.some((it) => m[it.key] !== it.base);
};
export const customRateCount = (c?: { rates?: RateMap; pageUnit?: number; symbolUnit?: number } | null): number => {
  const m = rateMapOf(c);
  return RATE_ITEMS.filter((it) => m[it.key] !== it.base).length;
};

// ── 교재(책) 1건 정산 ──────────────────────────────────────────
//   ty: "소리펜"이면 소리펜 항목, 아니면 필기펜 항목 사용. pg=페이지, sm/pm=항목별 수량.
export type BookQty = { ty?: string; pg: number; sm: number[]; pm: number[]; dcRate?: number; dcAmt?: number };
export type BookBill = {
  pageAmt: number;    // 적용(페이지) 금액
  symAmt: number;     // 편집·기능 금액(페이지 제외)
  gross: number;      // 할인 전 합계
  rateDc: number;     // 할인율 적용액
  amtDc: number;      // 추가 할인액
  total: number;      // 최종 청구액
  discount: number;   // 총 할인액
  pct: number;        // 할인율(%)
  byKey: Record<string, number>;   // 항목별 금액
};

export function settleBook(row: BookQty, rate: RateMap): BookBill {
  const pg = Math.max(0, row.pg || 0);
  const isPen = (row.ty ?? "소리펜") !== "소리펜";
  const pageKey = isPen ? "w_page" : "s_page";
  const byKey: Record<string, number> = {};
  const pageAmt = pg * (rate[pageKey] ?? itemOf(pageKey).base);
  byKey[pageKey] = pageAmt;

  let symAmt = 0;
  SOUND_QTY.forEach((it, i) => { const q = Math.max(0, row.sm?.[i] || 0); if (q) { const amt = q * (rate[it.key] ?? it.base); byKey[it.key] = amt; symAmt += amt; } });
  PEN_QTY.forEach((it, i) => { const q = Math.max(0, row.pm?.[i] || 0); if (q) { const amt = q * (rate[it.key] ?? it.base); byKey[it.key] = amt; symAmt += amt; } });

  const gross = pageAmt + symAmt;
  const dcRate = Math.min(100, Math.max(0, row.dcRate ?? 0));
  const rateDc = Math.round((gross * dcRate) / 100);
  const amtDc = Math.max(0, row.dcAmt ?? 0);
  const total = Math.max(0, gross - rateDc - amtDc);
  const discount = gross - total;
  return { pageAmt, symAmt, gross, rateDc, amtDc, total, discount, byKey, pct: gross > 0 ? Math.round((discount / gross) * 1000) / 10 : 0 };
}
export const bookHasDiscount = (row: BookQty) => (row.dcRate ?? 0) > 0 || (row.dcAmt ?? 0) > 0;

// ── (호환) 구 단순 정산 — 요약 데이터만 있는 목록(EditingProjectsView)용 ──
export const BASE_RATE = { page: RATE_ITEMS.find((r) => r.key === "s_page")!.base, symbol: RATE_ITEMS.find((r) => r.key === "s_edit")!.base } as const;
export type Rate = { page: number; symbol: number };
export const rateOf = (c?: { rates?: RateMap; pageUnit?: number; symbolUnit?: number } | null): Rate => {
  const m = rateMapOf(c);
  return { page: m.s_page, symbol: m.s_edit };
};
export const isCustomRate = (r: Rate) => r.page !== BASE_RATE.page || r.symbol !== BASE_RATE.symbol;
export type BillInput = { pg: number; sym: number; pu?: number; su?: number; dcRate?: number; dcAmt?: number };
export type Bill = { rate: Rate; pageAmt: number; symAmt: number; listed: number; gross: number; unitDc: number; rateDc: number; amtDc: number; discount: number; total: number; pct: number };
export function settle(row: BillInput, cRate: Rate): Bill {
  const pg = Math.max(0, row.pg || 0), sym = Math.max(0, row.sym || 0);
  const rate: Rate = { page: pos(row.pu, cRate.page), symbol: pos(row.su, cRate.symbol) };
  const pageAmt = pg * rate.page, symAmt = sym * rate.symbol, gross = pageAmt + symAmt;
  const listed = pg * cRate.page + sym * cRate.symbol;
  const dcRate = Math.min(100, Math.max(0, row.dcRate ?? 0));
  const rateDc = Math.round((gross * dcRate) / 100), amtDc = Math.max(0, row.dcAmt ?? 0);
  const total = Math.max(0, gross - rateDc - amtDc), discount = listed - total;
  return { rate, pageAmt, symAmt, listed, gross, unitDc: listed - gross, rateDc, amtDc, discount, total, pct: listed > 0 ? Math.round((discount / listed) * 1000) / 10 : 0 };
}
export const hasDiscount = (row: BillInput, cRate: Rate) =>
  (row.dcRate ?? 0) > 0 || (row.dcAmt ?? 0) > 0 || (row.pu != null && row.pu !== cRate.page) || (row.su != null && row.su !== cRate.symbol);
