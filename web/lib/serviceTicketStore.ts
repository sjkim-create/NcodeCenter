"use client";

// 서비스 티켓 원장 `PC-171` `PC-172`
// - App Key · N Key 와 별개인 세 번째 티켓. **주인 = 고객사** — 소속 user(서비스 계정) 전원이 이 범위 · 기간을 공유한다.
// - 고객사가 SOBP 맵에서 할당받은 코드 안에서 Book · Page 범위와 사용기간을 정해 발급한다.
// - 한 고객사 안에서 App Key · N Key · 서비스 티켓의 범위는 겹치지 않는다(검사는 lib/keyCompany).
// - 사용기간은 SOBP 할당 기간을 넘지 못한다 — 할당 기간 필드가 생기면 그 값으로 상한을 건다(지금은 할당일만 있다).
import { useSyncExternalStore } from "react";
import { nowKst, today } from "./ticketStore";

const KEY = "ncc-service-tickets-v1";

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
  at: string;              // 발급 일시 (KST)
  by: string;
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
