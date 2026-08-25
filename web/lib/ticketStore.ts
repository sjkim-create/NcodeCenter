"use client";

// 발급된 티켓 원장 + 정산(과금) 등록
// - 활동 로그는 7일만 보관하므로, 티켓 자체는 별도 원장으로 남긴다.
// - 과금은 업체마다 다르게 등록: 유료(금액) / 무료 / 체험용(1달)

import { useSyncExternalStore } from "react";
import ledgerSeed from "@/data/ticket-ledger.json";

const KEY = "ncc-tickets-v1";
const SEED_KEY = "ncc-tickets-seeded-v2";   // 대장 시드 1회 주입 표식 (v2: BookVolume 환산)

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
  at: string;                 // 발급 일시 (KST, ISO)
  by: string;                 // 발급인
  summary: string;            // 한 줄 요약
  params: Record<string, string | number>;   // Key 정보 확인용 전체 항목
  // 정산
  billing: Billing;
  amount: number;             // 유료 금액(원)
  trialUntil?: string;        // 체험 만료일 (발급일 + 1개월)
  billNote?: string;
  billedAt?: string;          // 정산 등록 일시
  billedBy?: string;
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
let version = 0;
const subs = new Set<() => void>();
const notify = () => { version++; subs.forEach((f) => f()); };
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* */ } };

export function hydrateTickets() {
  try { list = JSON.parse(localStorage.getItem(KEY) ?? "[]") as Ticket[]; }
  catch { list = []; }
  // 대장(nkey HLP) 시드 1회 주입 — 과거 발급 이력을 목록 뒤에 채운다
  try {
    if (!localStorage.getItem(SEED_KEY)) {
      const mine = list.filter((t) => t.src !== "ledger");   // 직접 발급분은 유지, 이전 대장분은 교체
      let id = Math.max(0, ...mine.map((x) => x.id));
      const seeded: Ticket[] = LEDGER.map((r) => ({ ...r, id: ++id }));
      list = [...mine, ...seeded];
      localStorage.setItem(SEED_KEY, "1");
      persist();
    }
  } catch { /* */ }
  notify();
}
export const allTickets = () => list;

export function addTicket(t: Omit<Ticket, "id" | "no" | "at" | "billing" | "amount">): Ticket {
  const id = Math.max(0, ...list.map((x) => x.id)) + 1;
  const no = Math.max(0, ...list.map((x) => x.no)) + 1;
  const rec: Ticket = { ...t, id, no, at: nowKst(), billing: "미정", amount: 0 };
  list = [rec, ...list];
  persist(); notify();
  return rec;
}

export function setBilling(id: number, patch: { billing: Billing; amount?: number; billNote?: string; trialUntil?: string; by?: string }) {
  list = list.map((t) => {
    if (t.id !== id) return t;
    const billing = patch.billing;
    return {
      ...t, billing,
      amount: billing === "유료" ? Math.max(0, patch.amount ?? t.amount) : 0,
      trialUntil: billing === "체험" ? (patch.trialUntil || plusMonth(t.at)) : undefined,
      billNote: patch.billNote ?? t.billNote,
      billedAt: nowKst(), billedBy: patch.by ?? t.billedBy,
    };
  });
  persist(); notify();
}

export function deleteTicket(id: number) {
  list = list.filter((t) => t.id !== id);
  persist(); notify();
}

export const useTickets = () =>
  useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => version, () => 0);
