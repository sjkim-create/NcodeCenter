"use client";

// 연간 라이선스 비용 — **고객사마다 1건**, App Key · N Key 따로 `PC-212`
//   티켓이 아니라 **키 발급**(그 고객사가 App Key / N Key 를 발급받음)으로 생기는 비용이다.
//   항목은 금액(원 · USD) · 기간(시작~끝)만. 티켓 정산(`PC-177` `PC-202`)과는 별개로 기록한다.
//   대시보드 집계는 나중에 붙인다.
import { useSyncExternalStore } from "react";
import { nowKst, type Currency } from "./ticketStore";

const KEY = "ncc-licenses-v1";

export type LicenseKind = "APP" | "N";
export const LICENSE_LABEL: Record<LicenseKind, string> = { APP: "App Key", N: "N Key" };

export type License = {
  kind: LicenseKind;
  companyId: number;
  company: string;
  amount: number;          // 연간 금액 — currency 단위
  currency: Currency;      // 원(KRW) · 달러(USD)
  fxRate?: number;         // 환율 기록(1 USD = n원) — USD 일 때 · 선택 · 자동 아님 `PC-215`
  since: string;           // 라이선스 기간 시작 (YYYY-MM-DD)
  until: string;           // 라이선스 기간 끝 (YYYY-MM-DD)
  updatedAt: string;
  by: string;
};

let list: License[] = [];
let hydrated = false;
let version = 0;
const subs = new Set<() => void>();
const notify = () => { version++; subs.forEach((f) => f()); };
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* */ } };

export function hydrateLicenses() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try { list = JSON.parse(localStorage.getItem(KEY) ?? "[]") as License[]; } catch { list = []; }
  notify();
}
export const allLicenses = () => { hydrateLicenses(); return list; };
export const licenseOf = (kind: LicenseKind, companyId: number) =>
  allLicenses().find((l) => l.kind === kind && l.companyId === companyId);

/** 라이선스 저장 — 고객사 · 종류마다 1건(있으면 고친다) */
export function saveLicense(l: Omit<License, "updatedAt">) {
  hydrateLicenses();
  const rec: License = { ...l, amount: Math.max(0, l.amount), updatedAt: nowKst() };
  list = [...list.filter((x) => !(x.kind === l.kind && x.companyId === l.companyId)), rec];
  persist(); notify();
}

export const useLicenses = () =>
  useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => version, () => 0);

/** 기본 기간 — 오늘부터 1년(끝 = 1년 뒤 전날) */
export const yearFrom = (d: string) => {
  const [y, m, dd] = d.slice(0, 10).split("-").map(Number);
  const t = new Date(Date.UTC(y + 1, m - 1, dd));
  t.setUTCDate(t.getUTCDate() - 1);
  return t.toISOString().slice(0, 10);
};
