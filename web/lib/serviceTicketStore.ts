"use client";

// 서비스 티켓 원장 `PC-171` `PC-173`
// - App Key · N Key 와 별개인 세 번째 티켓. **주인 = 고객사** — 소속 user(서비스 계정) 전원이 이 범위 · 기간을 공유한다.
// - 고객사 관리 ▸ 서비스 티켓에서, 할당받은 SOBP 안의 Book · Page 범위와 사용기간을 정해 지정한다.
// - N Key · App Key · 서비스 티켓은 SOBP 가 절대 겹칠 수 없다(검사는 lib/rangeGuard) `PC-174`.
// - 기간은 **키 관리에서만** 정한다 — SOBP 할당에는 기간이 없다 `PC-175`.
import { useSyncExternalStore } from "react";
import { nowKst, today, plusMonth, type Billing } from "./ticketStore";

const KEY = "ncc-service-tickets-v1";

// 서비스 구분 `PC-186` — 서비스 티켓은 서비스마다 따로 지정한다
export type TicketService = "CASTERN" | "FORMSOLUTION";
export const TICKET_SERVICES: { v: TicketService; label: string; bg: string; fg: string }[] = [
  { v: "CASTERN", label: "casterN", bg: "#eef6ff", fg: "#1d4ed8" },
  { v: "FORMSOLUTION", label: "폼솔루션", bg: "#fff7ed", fg: "#c2410c" },
];
export const ticketServiceOf = (v?: string) => TICKET_SERVICES.find((s) => s.v === v);

export type ServiceTicket = {
  id: number;
  no: number;              // 발급 번호 (삭제해도 재사용하지 않음)
  companyId: number;       // 고객사 관리 고객사
  company: string;
  pt: string;              // 코드 종류(패턴) — PDS3 · PDS2 · Scode · OID
  section: number; owner: number;
  bookStart: number; bookVol: number; bookEnd: number;
  pageStart: number; pageVol: number; pageEnd: number;
  since: string;           // 사용기간 시작 (YYYY-MM-DD)
  until: string;           // 사용기간 끝 (YYYY-MM-DD)
  shared?: boolean;        // 공유(커먼) 코드 안에서 발급
  service?: TicketService; // 서비스 구분 — 이 티켓으로 승인하는 서비스 `PC-186` (옛 기록은 비어 있음 = 미지정)
  at: string;              // 발급 일시 (KST)
  by: string;
  // 정산 — N Key 와 같은 4종(미정 · 유료 · 무료 · 체험) `PC-176`. 지정할 때는 미정
  billing?: Billing;
  amount?: number;         // 유료 금액 — currency 단위(기본 원)
  currency?: "KRW" | "USD";   // 금액 통화 `PC-202`
  fxRate?: number;            // 환율 기록(1 USD = n원 · 수기) `PC-202`
  trialUntil?: string;     // 체험 만료일 (기본 = 지정일 + 1개월)
  billNote?: string;
  billedAt?: string;
  billedBy?: string;
};

let list: ServiceTicket[] = [];
let hydrated = false;
let version = 0;
const subs = new Set<() => void>();
const notify = () => { version++; subs.forEach((f) => f()); };
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* */ } };

export function hydrateServiceTickets() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try { list = JSON.parse(localStorage.getItem(KEY) ?? "[]") as ServiceTicket[]; } catch { list = []; }
  notify();
}
export const allServiceTickets = () => { hydrateServiceTickets(); return list; };
export const serviceTicketsOf = (companyId: number) => allServiceTickets().filter((t) => t.companyId === companyId);

export function addServiceTicket(t: Omit<ServiceTicket, "id" | "no" | "at">): ServiceTicket {
  hydrateServiceTickets();
  const id = Math.max(0, ...list.map((x) => x.id)) + 1;
  const no = Math.max(0, ...list.map((x) => x.no)) + 1;
  const rec: ServiceTicket = { ...t, id, no, at: nowKst() };
  list = [rec, ...list];
  persist(); notify();
  return rec;
}
/** 정산 등록 — 유료면 금액, 체험이면 만료일을 함께 둔다 `PC-176` */
export function setServiceBilling(id: number, patch: { billing: Billing; amount?: number; currency?: "KRW" | "USD"; fxRate?: number; trialUntil?: string; billNote?: string; by?: string }) {
  hydrateServiceTickets();
  list = list.map((t) => {
    if (t.id !== id) return t;
    const b = patch.billing;
    return { ...t, billing: b,
      amount: b === "유료" ? Math.max(0, patch.amount ?? t.amount ?? 0) : 0,
      currency: b === "유료" ? (patch.currency ?? t.currency ?? "KRW") : undefined,
      fxRate: b === "유료" && (patch.currency ?? t.currency) === "USD" ? (patch.fxRate || undefined) : undefined,
      trialUntil: b === "체험" ? (patch.trialUntil || plusMonth(t.at)) : undefined,
      billNote: patch.billNote ?? t.billNote, billedAt: nowKst(), billedBy: patch.by ?? t.billedBy };
  });
  persist(); notify();
}
export const billingOf = (t: ServiceTicket): Billing => t.billing ?? "미정";

/** 발급된 티켓 수정 — 삭제는 하지 않고 정보만 고친다 `PC-192` */
export function updateServiceTicket(id: number, patch: Partial<Omit<ServiceTicket, "id" | "no" | "companyId" | "company" | "at">>) {
  hydrateServiceTickets();
  list = list.map((t) => (t.id === id ? { ...t, ...patch } : t));
  persist(); notify();
}
export function deleteServiceTicket(id: number) {
  hydrateServiceTickets();
  list = list.filter((t) => t.id !== id);
  persist(); notify();
}

/** 사용 상태 — 시작 전 / 사용 중 / 만료 */
export type TicketState = "대기" | "사용 중" | "만료";
export const ticketState = (t: { since: string; until: string }): TicketState => {
  const d = today();
  if (t.until && t.until < d) return "만료";
  if (t.since && t.since > d) return "대기";
  return "사용 중";
};
export const STATE_COLOR: Record<TicketState, { bg: string; fg: string }> = {
  대기: { bg: "#fef3c7", fg: "#92400e" },
  "사용 중": { bg: "#dcfce7", fg: "#166534" },
  만료: { bg: "#f3f4f6", fg: "#6b7280" },
};
export const serviceTicketText = (t: Pick<ServiceTicket, "pt" | "section" | "owner" | "bookStart" | "bookEnd" | "pageStart" | "pageEnd">) =>
  `${t.pt} S${t.section}/O${t.owner}/B${t.bookStart}~${t.bookEnd}/P${t.pageStart}~${t.pageEnd}`;

export const useServiceTickets = () =>
  useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => version, () => 0);
