"use client";

// SOBP 무겹침 — **N Key · App Key · 서비스 티켓은 SOBP 가 절대 겹칠 수 없다** `PC-174`
// - 고객사를 가리지 않고 **전체**에서 검사한다(같은 종류끼리도). 같은 Section · Owner 에서 Book · Page 구간이 모두 겹치면 겹침.
// - 대장(과거 발급분)에 End 가 없으면 Start + Volume 으로 끝을 잡고, Start 도 비어 있으면 그 Owner 전체를 쓴 것으로 본다.
// - 세 발급 지점(App Key 관리 · N Key 관리 · 고객사 관리 ▸ 서비스 티켓)이 모두 이 함수를 쓴다.
import { caster, accountTickets } from "./accountStore";
import { allTickets, hydrateTickets } from "./ticketStore";
import { allServiceTickets } from "./serviceTicketStore";

export type SobpSpan = { section: number; owner: number; bookStart: number; bookEnd: number; pageStart: number; pageEnd: number };
export type Occupied = SobpSpan & { kind: "App Key" | "N Key" | "서비스 티켓"; who: string; ref: string };

const MAX = 1e9;
const val = (v: unknown): number | null => (v === "" || v == null || !Number.isFinite(Number(v)) ? null : Number(v));
/** 구간 끝 — End 가 있으면 End, 없으면 Start + Volume - 1, Start 도 없으면 끝까지(Owner 전체) */
const endOf = (start: number | null, end: number | null, vol: number | null) =>
  end != null ? end : start != null && vol != null ? start + vol - 1 : start == null ? MAX : start;

/** 지금 발급된 모든 SOBP 범위 — App Key · N Key · 서비스 티켓 */
export function occupiedSobp(): Occupied[] {
  hydrateTickets();
  const out: Occupied[] = [];
  for (const a of caster.snapshot().accounts) {   // App Key 티켓 = 계정 소속 `PC-206`
    accountTickets(a).forEach((r, i) => out.push({ kind: "App Key", who: a.company, ref: `${a.id}#${i}`,
      section: r.section, owner: r.owner,
      bookStart: r.bookStart ?? 0, bookEnd: endOf(r.bookStart, r.bookEnd, r.bookVol ?? null),
      pageStart: r.pageStart ?? 0, pageEnd: endOf(r.pageStart, r.pageEnd, r.pageVol ?? null) }));
  }
  for (const t of allTickets()) {
    if (t.kind !== "N") continue;
    const p = t.params ?? {};
    out.push({ kind: "N Key", who: t.company, ref: `N${t.id}`,
      section: val(p.Section) ?? -1, owner: val(p.Owner) ?? -1,
      bookStart: val(p["Book Start"]) ?? 0, bookEnd: endOf(val(p["Book Start"]), val(p["Book End"]), val(p["Book Volume"])),
      pageStart: val(p["Page Start"]) ?? 0, pageEnd: endOf(val(p["Page Start"]), val(p["Page End"]), val(p["Page Volume"])) });
  }
  for (const t of allServiceTickets()) {
    out.push({ kind: "서비스 티켓", who: t.company, ref: `S${t.id}`,
      section: t.section, owner: t.owner, bookStart: t.bookStart, bookEnd: t.bookEnd, pageStart: t.pageStart, pageEnd: t.pageEnd });
  }
  return out;
}

export const spansOverlap = (a: SobpSpan, b: SobpSpan) =>
  a.section === b.section && a.owner === b.owner &&
  a.bookStart <= b.bookEnd && b.bookStart <= a.bookEnd &&
  a.pageStart <= b.pageEnd && b.pageStart <= a.pageEnd;

/** N Key 티켓 파라미터 → SOBP 구간 (End 가 없으면 Start + Volume) `PC-192` */
export function spanOfParams(p: Record<string, string | number>): SobpSpan {
  return { section: val(p.Section) ?? -1, owner: val(p.Owner) ?? -1,
    bookStart: val(p["Book Start"]) ?? 0, bookEnd: endOf(val(p["Book Start"]), val(p["Book End"]), val(p["Book Volume"])),
    pageStart: val(p["Page Start"]) ?? 0, pageEnd: endOf(val(p["Page Start"]), val(p["Page End"]), val(p["Page Volume"])) };
}
const span = (a: number, b: number) => (b >= MAX ? `${a}~` : a === b ? `${a}` : `${a}~${b}`);
/** 겹치는 발급분이 있으면 안내 문구, 없으면 ""
 *  exclude = 수정 중인 티켓 자신(ref) — 「App Key: {계정}#{범위순번}」 · 「N{id}」 · 「S{id}」 `PC-192` */
export function sobpOverlapMsg(cand: SobpSpan, exclude?: string): string {
  const hit = occupiedSobp().find((o) => o.ref !== exclude && spansOverlap(o, cand));
  if (!hit) return "";
  return `이미 ${hit.kind}로 발급된 SOBP 와 겹칩니다 — ${hit.who} · S${hit.section}/O${hit.owner}/B${span(hit.bookStart, hit.bookEnd)}/P${span(hit.pageStart, hit.pageEnd)}. ` +
    "N Key · App Key · 서비스 티켓은 SOBP 가 겹칠 수 없습니다. 다른 Book · Page 를 고르세요.";
}
