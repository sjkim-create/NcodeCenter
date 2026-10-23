"use client";

// 발급된 티켓 원장 + 정산(과금) 등록
// - 활동 로그는 7일만 보관하므로, 티켓 자체는 별도 원장으로 남긴다.
// - 과금은 업체마다 다르게 등록: 유료(금액) / 무료 / 체험용(1달)

import { useSyncExternalStore } from "react";
import ledgerSeed from "@/data/ticket-ledger.json";

const KEY = "ncc-tickets-v1";
const SEED_KEY = "ncc-tickets-seeded-v2";   // 대장 시드 1회 주입 표식 (v2: BookVolume 환산)
const LEDGER_DEL_KEY = "ncc-tickets-ledger-deleted";   // 화면에서 지운 대장 발급번호 — 대장 복원에서 뺀다 `PC-155`

export type TicketKind = "N" | "APP";
export type Billing = "미정" | "유료" | "무료" | "체험";
export const BILLINGS: Billing[] = ["미정", "유료", "무료", "체험"];
export const BILLINGS_FILTER: Billing[] = ["미정", "유료", "무료"];   // 정산 필터(체험 제외)
export const BILL_COLOR: Record<Billing, { bg: string; fg: string }> = {
  미정: { bg: "#f3f4f6", fg: "#6b7280" },
  유료: { bg: "#eef6ff", fg: "#1d4ed8" },
  무료: { bg: "#dcfce7", fg: "#166534" },
  체험: { bg: "#fef3c7", fg: "#92400e" },
};

export type Ticket = {
  id: number;
  no: number;                 // 발급 번호 (삭제해도 재사용하지 않음)
  kind: TicketKind;
  companyId: number;
  company: string;
  accountId?: string;         // 연결 계정(email) — 계정 : 키 = **1:1** `PC-059`
  at: string;                 // 발급 일시 (KST, ISO)
  by: string;                 // 발급인
  summary: string;            // 한 줄 요약
  params: Record<string, string | number>;   // Key 정보 확인용 전체 항목
  // 정산
  billing: Billing;
  amount: number;             // 유료 금액 — currency 단위(기본 원)
  currency?: Currency;        // 금액 통화 — 원(KRW, 기본) · 달러(USD) `PC-202`
  fxRate?: number;            // 환율 기록(1 USD = n원) — 자동 아님, 적어 둔 값 `PC-202`
  trialUntil?: string;        // 체험 만료일 (발급일 + 1개월)
  billNote?: string;
  billedAt?: string;          // 정산 등록 일시
  billedBy?: string;
  coRef?: number;             // 고객사 관리 고객사 id — N Key 관리에서 발급한 티켓 `PC-153` (대장분은 이름+Owner 로 잇는다)
  src?: "ledger";             // nkey(HLP) 대장에서 가져온 과거 발급분
  period?: string;            // 대장 원본 기간 표기(무제한/~YYYY-MM-DD)
};

// nkey(HLP) 대장 시드 (과거 발급 이력)
type LedgerRow = Omit<Ticket, "id">;
const LEDGER = ledgerSeed as unknown as LedgerRow[];

// KST 기준 현재 시각
export const nowKst = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 19);
export const today = () => nowKst().slice(0, 10);
// 체험 만료일 = 기준일 + 1개월
export const plusMonth = (d: string) => {
  const [y, m, dd] = d.slice(0, 10).split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, dd));
  t.setUTCMonth(t.getUTCMonth() + 1);
  return t.toISOString().slice(0, 10);
};
// 체험 잔여일 (음수면 만료)
export const daysLeft = (until?: string) => {
  if (!until) return null;
  const a = new Date(`${until}T00:00:00Z`).getTime();
  const b = new Date(`${today()}T00:00:00Z`).getTime();
  return Math.round((a - b) / 86400000);
};

let list: Ticket[] = [];
let hydrated = false;
let version = 0;
const subs = new Set<() => void>();
const notify = () => { version++; subs.forEach((f) => f()); };
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* */ } };

// 저장분을 메모리로 1회 로드. 발급 화면(계정 발급 등)이 목록을 거치지 않고 바로 발급해도
// 원장이 빈 배열 위에 덮어써지지 않도록, 모든 변경 함수가 먼저 이걸 부른다.
// Key 정보 항목명 — 옛 붙여쓰기 표기를 띄어쓰기로 바꾼다 `PC-064`
//   이미 발급돼 저장된 티켓도 화면에서 같은 이름으로 보이게 한다.
const PARAM_ALIAS: Record<string, string> = {
  CompanyName: "Company Name", AccountId: "Account Id",
  IssuedTime: "Issued Time", ValidUntilTime: "Valid Until Time",
  TicketVersion: "Ticket Version", TicketType: "Ticket Type",
  BookStart: "Book Start", BookVolume: "Book Volume", BookEnd: "Book End",
  PageStart: "Page Start", PageVolume: "Page Volume", PageEnd: "Page End",
  PatternType: "Code Type", SeparateEachBook: "Separate Each Book",
  UsedCustomer: "Used Customer", AppKey: "App Key",
};
const normParams = (p?: Ticket["params"]): Ticket["params"] => {
  if (!p) return {};
  const out: Ticket["params"] = {};
  for (const [k, v] of Object.entries(p)) out[PARAM_ALIAS[k] ?? k] = v;
  return out;
};
// Key 정보 표시 순서 — Issued Time 은 Code Type 뒤에 둔다 `PC-070`
const PARAM_ORDER = [
  "Ticket Name",   // App Key 티켓 이름 `PC-261`
  "Company Name", "Account Id", "App Key", "Service", "Usage", "Used Customer",
  "Section", "Owner", "Book Start", "Book Volume", "Book End",
  "Page Start", "Page Volume", "Page End",
  "Code Type", "Issued Time", "Valid From Time", "Valid Until Time", "Ticket Type", "Ticket Version",
  "Separate Each Book",
  "Profile", "Code Reuse", "CasterN Permissions",   // HYBRID 권한 `PC-218` · Profile · Code Reuse 는 옛 발급분만(지금은 Ticket Version · Ticket Type) `PC-257` `PC-258`
];
const orderParams = (p: Ticket["params"]): Ticket["params"] => {
  const out: Ticket["params"] = {};
  for (const k of PARAM_ORDER) if (k in p) out[k] = p[k];
  for (const [k, v] of Object.entries(p)) if (!(k in out)) out[k] = v;   // 목록에 없는 항목은 뒤에
  return out;
};
const normTicket = (t: Ticket): Ticket => ({ ...t, params: orderParams(normParams(t.params)) });

export function hydrateTickets() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try { list = (JSON.parse(localStorage.getItem(KEY) ?? "[]") as Ticket[]).map(normTicket); }
  catch { list = []; }
  // 대장(nkey HLP) 시드 1회 주입 — 과거 발급 이력을 목록 뒤에 채운다
  try {
    if (!localStorage.getItem(SEED_KEY)) {
      const mine = list.filter((t) => t.src !== "ledger");   // 직접 발급분은 유지, 이전 대장분은 교체
      let id = Math.max(0, ...mine.map((x) => x.id));
      const seeded: Ticket[] = LEDGER.map((r) => normTicket({ ...r, id: ++id } as Ticket));
      list = [...mine, ...seeded];
      localStorage.setItem(SEED_KEY, "1");
      persist();
    }
  } catch { /* */ }
  // 대장은 정본이다 — 브라우저 저장분에서 빠진 대장 발급분(직접 지운 것 제외)을 다시 채운다 `PC-155`
  //   (다른 브라우저 · 저장소 정리 등으로 목록이 비어도 nkey(HLP) 발급 대장은 늘 보인다. 정산 등 화면에서 고친 값은 그대로 둔다)
  try {
    const deleted = new Set<number>(JSON.parse(localStorage.getItem(LEDGER_DEL_KEY) ?? "[]"));
    const have = new Set(list.filter((t) => t.src === "ledger").map((t) => t.no));
    const missing = LEDGER.filter((r) => !have.has(r.no) && !deleted.has(r.no));
    if (missing.length) {
      let id = Math.max(0, ...list.map((x) => x.id));
      list = [...list, ...missing.map((r) => normTicket({ ...r, id: ++id } as Ticket))];
    }
  } catch { /* */ }
  persist();        // 정리한 항목명을 저장해 둔다 `PC-064`
  notify();
}
export const allTickets = () => list;
export const ticketById = (id: number) => list.find((t) => t.id === id);

// 발급 기록 수정 — 발급 내용·Key 정보 항목만 고친다.
// 발급번호(no)·종류·고객사·발급일시·발급인은 원장 기준값이라 바꾸지 않는다.
export function updateTicket(id: number, patch: { summary: string; params: Record<string, string | number> }) {
  hydrateTickets();
  list = list.map((t) => (t.id === id ? { ...t, ...patch } : t));
  persist(); notify();
}

export function addTicket(t: Omit<Ticket, "id" | "no" | "at" | "billing" | "amount">): Ticket {
  hydrateTickets();
  const id = Math.max(0, ...list.map((x) => x.id)) + 1;
  const no = Math.max(0, ...list.map((x) => x.no)) + 1;
  const rec: Ticket = normTicket({ ...t, id, no, at: nowKst(), billing: "미정", amount: 0 } as Ticket);
  list = [rec, ...list];
  persist(); notify();
  return rec;
}

// 그 계정에 발급된 키 — 계정 : App Key = 1:1 · 계정 : N Key = 1:1 `PC-059`
export function ticketsOfAccount(accountId: string): Ticket[] {
  hydrateTickets();
  return list.filter((t) => t.accountId === accountId);
}
export function hasNKey(accountId: string): boolean {
  return ticketsOfAccount(accountId).some((t) => t.kind === "N");
}

// 정산 통화 — 원 · 달러, 달러면 환율을 적어 둘 수 있다(자동 환산 아님) `PC-202`
export type Currency = "KRW" | "USD";
export type Money = { amount?: number; currency?: Currency; fxRate?: number };
/** 금액 표기 — 1,200,000원 / $1,200 */
export const fmtMoney = (m: Money) =>
  m.currency === "USD" ? `$${(m.amount ?? 0).toLocaleString()}` : `${(m.amount ?? 0).toLocaleString()}원`;
/** 원화 환산 — 달러는 적어 둔 환율이 있을 때만(없으면 null) */
export const krwOf = (m: Money): number | null =>
  m.currency === "USD" ? (m.fxRate ? Math.round((m.amount ?? 0) * m.fxRate) : null) : (m.amount ?? 0);

export function setBilling(id: number, patch: { billing: Billing; amount?: number; currency?: Currency; fxRate?: number; billNote?: string; trialUntil?: string; by?: string }) {
  hydrateTickets();
  list = list.map((t) => {
    if (t.id !== id) return t;
    const billing = patch.billing;
    return {
      ...t, billing,
      amount: billing === "유료" ? Math.max(0, patch.amount ?? t.amount) : 0,
      currency: billing === "유료" ? (patch.currency ?? t.currency ?? "KRW") : undefined,
      fxRate: billing === "유료" && (patch.currency ?? t.currency) === "USD" ? (patch.fxRate || undefined) : undefined,
      trialUntil: billing === "체험" ? (patch.trialUntil || plusMonth(t.at)) : undefined,
      billNote: patch.billNote ?? t.billNote,
      billedAt: nowKst(), billedBy: patch.by ?? t.billedBy,
    };
  });
  persist(); notify();
}

export function deleteTicket(id: number) {
  hydrateTickets();
  const t = list.find((x) => x.id === id);
  if (t?.src === "ledger") {   // 대장분을 지우면 기억해 둔다 — 다음 로드 때 되살리지 않게 `PC-155`
    try {
      const del = new Set<number>(JSON.parse(localStorage.getItem(LEDGER_DEL_KEY) ?? "[]"));
      del.add(t.no); localStorage.setItem(LEDGER_DEL_KEY, JSON.stringify([...del]));
    } catch { /* */ }
  }
  list = list.filter((t) => t.id !== id);
  persist(); notify();
}

export const useTickets = () =>
  useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => version, () => 0);
