"use client";

// 티켓 고객사 — App Key 관리 · N Key 관리 전용 고객사 명단 `PC-123`
// - 정본은 nkey(HLP).xlsx 대장의 **프로젝트명**(Ncode 티켓 · Scode 티켓 · 2018 이전 티켓 시트) 이다.
//   web/data/ticket-ledger.json (db/import/build_ticket_ledger.py) 의 company 값을 그대로 쓴다.
// - **고객사 관리(companies)와 별개**다. 티켓 화면에서 등록해도 고객사 관리에는 생기지 않고,
//   고객사 관리에서 등록한 고객사도 여기에 나오지 않는다.
// - 고객사의 식별은 **이름**이다(티켓·계정이 company 이름을 들고 있으므로 이름으로 잇는다).
// - 발급 범위(S/O/B)는 **대장 이력의 S/O/B** + **SOBP 맵에서 (K) 로 직접 할당한 S/O** 이다 `PC-125`.
//   대장 이력이 없는 신규 고객사는 등록할 때 범위를 직접 넣는다.
import { useSyncExternalStore } from "react";
import ledgerSeed from "@/data/ticket-ledger.json";
import { BOOK_CAP, PAGE_CAP, codeKind, patternOf, type TicketPattern } from "@/lib/codeKind";
import { custKey } from "@/lib/keyCustomer";
import type { Project } from "@/lib/customerData";

const KEY = "ncc-ticket-customers-v1";

// 발급 화면의 범위 선택(SobpRangePicker)과 같은 모양
export type TicketRange = {
  pt: TicketPattern; section: number; owner: number;
  bookStart: number; bookEnd: number; pageStart: number; pageEnd: number; bookCount: number;
};
export type TicketCustomer = {
  id: number;
  name: string;
  src: "ledger" | "manual";      // 대장 고객사 / 티켓 화면에서 등록
  ranges: TicketRange[];         // 대장 이력 범위(ledger) 또는 등록 시 입력한 범위(manual)
  createdAt?: string;
  createdBy?: string;
};

type LedgerRow = { company: string; params: Record<string, string | number> };
const LEDGER = ledgerSeed as unknown as LedgerRow[];

const ptOf = (codeType: unknown): TicketPattern => {
  const s = String(codeType ?? "");
  return s.includes("Scode") ? "Scode" : s.includes("PDS2") ? "PDS2" : s.includes("OID") ? "OID" : "PDS3";
};
const num = (v: unknown) => (typeof v === "number" ? v : v == null || v === "" ? null : Number.isFinite(+v) ? +v : null);

/** 범위 하나 만들기 — Book 미지정이면 그 오너 전체(섹션 정원) */
export function makeRange(pt: TicketPattern, section: number, owner: number, bookStart?: number | null, bookEnd?: number | null, pageVol?: number | null): TicketRange {
  const bcap = BOOK_CAP[pt]?.[section] ?? 4096, pcap = PAGE_CAP[pt]?.[section] ?? 512;
  const bs = bookStart ?? 0, be = bookEnd ?? (bookStart == null ? bcap - 1 : bookStart);
  return { pt, section, owner, bookStart: bs, bookEnd: be, pageStart: 0, pageEnd: (pageVol || pcap) - 1, bookCount: Math.max(1, be - bs + 1) };
}

// 대장 이력 → 고객사별 범위: (종류·Section·Owner) 로 묶고 Book 은 이력의 최소~최대로 잡는다
function ledgerCustomers(): TicketCustomer[] {
  const by = new Map<string, Map<string, { pt: TicketPattern; s: number; o: number; whole: boolean; bMin: number; bMax: number; pv: number }>>();
  for (const r of LEDGER) {
    const p = r.params ?? {};
    const s = num(p.Section), o = num(p.Owner);
    if (!r.company) continue;
    if (!by.has(r.company)) by.set(r.company, new Map());
    if (s == null || o == null) continue;
    const pt = ptOf(p["Code Type"]);
    const k = `${pt}:${s}:${o}`;
    const bs = num(p["Book Start"]), bv = num(p["Book Volume"]) ?? 1, pv = num(p["Page Volume"]) ?? 0;
    const g = by.get(r.company)!;
    const cur = g.get(k) ?? { pt, s, o, whole: false, bMin: Infinity, bMax: -Infinity, pv: 0 };
    if (bs == null) cur.whole = true;
    else { cur.bMin = Math.min(cur.bMin, bs); cur.bMax = Math.max(cur.bMax, bs + bv - 1); }
    cur.pv = Math.max(cur.pv, pv);
    g.set(k, cur);
  }
  let id = 0;
  return [...by.entries()].map(([name, g]) => ({
    id: ++id, name, src: "ledger" as const,
    ranges: [...g.values()].map((x) => x.whole
      ? makeRange(x.pt, x.s, x.o, null, null, x.pv)
      : makeRange(x.pt, x.s, x.o, x.bMin, x.bMax, x.pv)),
  }));
}
const LEDGER_CUSTOMERS = ledgerCustomers();

// 티켓 화면에서 등록한 고객사만 저장한다(대장 고객사는 매번 대장에서 다시 만든다)
let manual: TicketCustomer[] = [];
let hydrated = false;
let version = 0;
const subs = new Set<() => void>();
const notify = () => { version++; subs.forEach((f) => f()); };
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(manual)); } catch { /* */ } };

export function hydrateTicketCustomers() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try { manual = JSON.parse(localStorage.getItem(KEY) ?? "[]") as TicketCustomer[]; } catch { manual = []; }
  notify();
}

const norm = (s: string) => s.trim().toLowerCase();
export const allTicketCustomers = (): TicketCustomer[] =>
  [...LEDGER_CUSTOMERS, ...manual].sort((a, b) => a.name.localeCompare(b.name, "ko"));
export const ticketCustomerById = (id: number) => allTicketCustomers().find((c) => c.id === id);
export const ticketCustomerByName = (name?: string) =>
  name ? allTicketCustomers().find((c) => norm(c.name) === norm(name)) : undefined;
/** SOBP 맵에서 이 티켓 고객사에 직접 할당한 S/O → 발급 범위 `PC-125` */
export function allocRangesOfKeyCustomer(projects: Project[], name?: string): TicketRange[] {
  if (!name) return [];
  const k = custKey(name);
  return projects.filter((p) => p.keyCustomer && custKey(p.keyCustomer) === k).flatMap((p) => p.issued.map((b) => {
    const pt = patternOf(codeKind(b.kind ?? "N", b.section));
    const r = makeRange(pt, b.section, b.owner, b.bookStart, b.bookEnd);
    return r;
  }));
}
/** 계정·티켓이 들고 있는 고객사 이름으로 발급 범위를 찾는다 — 대장 이력(또는 등록 시 입력) + SOBP 맵 직접 할당 */
export const rangesOfTicketCustomer = (name?: string, projects: Project[] = []): TicketRange[] => {
  const own = ticketCustomerByName(name)?.ranges ?? [];
  const alloc = allocRangesOfKeyCustomer(projects, name)
    .filter((a) => !own.some((r) => r.pt === a.pt && r.section === a.section && r.owner === a.owner));
  return [...own, ...alloc];
};

/** 티켓 고객사 등록 — 고객사 관리와 무관하다. 이름은 티켓 고객사 안에서만 유일 */
export function addTicketCustomer(name: string, ranges: TicketRange[], by?: string): { ok: true; customer: TicketCustomer } | { ok: false; msg: string } {
  hydrateTicketCustomers();
  const n = name.trim();
  if (!n) return { ok: false, msg: "고객사명을 입력하세요." };
  if (ticketCustomerByName(n)) return { ok: false, msg: `이미 있는 티켓 고객사입니다: ${n}` };
  const id = Math.max(1000, ...manual.map((c) => c.id)) + 1;     // 대장 고객사(1~)와 번호가 겹치지 않게
  const customer: TicketCustomer = { id, name: n, src: "manual", ranges, createdAt: new Date().toISOString(), createdBy: by };
  manual = [...manual, customer];
  persist(); notify();
  return { ok: true, customer };
}

export const useTicketCustomers = () =>
  useSyncExternalStore((f) => { subs.add(f); hydrateTicketCustomers(); return () => { subs.delete(f); }; }, () => version, () => 0);
