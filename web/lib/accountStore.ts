"use client";

// 서비스 계정 + App Key 서비스 DB (목업 · localStorage)
// - 계정: 서비스 로그인용 (회사정보·ID(email)·PWD·NAME·ADDR·HOMEPAGE)
// - App Key: 관리자가 발급 → 이 스토어(서비스 DB)에 등록 + 계정과 연동. 계정 로그인 시 연동된 SOBP로 작업
// - service(사용처): 이 계정이 연동되는 서비스. 각 서비스는 자기 계정만 로그인시킨다.
//   (CasterN = Caster U 웹 편집툴 / FORMSOLUTION = 폼솔루션 / SDK = 직접 연동)
import { useSyncExternalStore } from "react";

// 사용처(연동 서비스) — 계정 로그인 허용 범위를 가르는 값
export type AccountService = "CASTERN" | "FORMSOLUTION" | "SDK";
export const ACCOUNT_SERVICES: { v: AccountService; label: string; desc: string }[] = [
  { v: "CASTERN", label: "CasterN", desc: "Caster U 웹 편집툴 · 계정 로그인" },
  { v: "FORMSOLUTION", label: "폼솔루션", desc: "폼솔루션 서비스 · 계정 로그인" },
  { v: "SDK", label: "SDK 연동", desc: "id/pwd + SOBP 직접 사용" },
];
export const accountServiceLabel = (v?: string) => ACCOUNT_SERVICES.find((s) => s.v === v)?.label ?? "미지정";

export type CasterAccount = {
  id: string;          // = 로그인 ID(email)
  service: AccountService;   // 사용처 — 이 계정이 연동되는 서비스
  pwd: string;
  name: string;
  companyId: number;
  company: string;     // 회사명
  addr: string;
  homepage: string;
  createdAt: string;
};
export type AppKey = {
  id: number;
  key: string;         // 발급 App Key (ncc_live_...)
  accountId: string;   // 연동 계정(email)
  service: AccountService;   // 사용처 — 계정과 동일한 서비스
  company: string;
  pt: string; section: number; owner: number; bookStart: number; bookEnd: number;
  pageStart: number; pageEnd: number;
  until: string;       // 만료(YYYY-MM-DD) / "무제한"
  createdAt: string;
};
type State = { accounts: CasterAccount[]; appKeys: AppKey[] };

const KEY = "ncc-caster-v1";
const kstNow = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 19).replace("T", " ");

let state: State = { accounts: [], appKeys: [] };
let hydrated = false;
const subs = new Set<() => void>();
let seq = 1;

function persist() { if (typeof window !== "undefined") { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* */ } } }
function commit(next: State) { state = next; persist(); subs.forEach((f) => f()); }
function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try { const raw = localStorage.getItem(KEY); if (raw) { state = JSON.parse(raw); seq = Math.max(0, ...state.appKeys.map((k) => k.id)) + 1; subs.forEach((f) => f()); } } catch { /* */ }
}

export const caster = {
  subscribe(cb: () => void) { subs.add(cb); hydrate(); return () => { subs.delete(cb); }; },
  snapshot() { return state; },
  serverSnapshot() { return EMPTY; },

  addAccount(a: Omit<CasterAccount, "createdAt">): { ok: boolean; msg: string } {
    if (state.accounts.some((x) => x.id.toLowerCase() === a.id.toLowerCase())) return { ok: false, msg: "이미 등록된 ID(email)입니다." };
    commit({ ...state, accounts: [{ ...a, createdAt: kstNow() }, ...state.accounts] });
    return { ok: true, msg: "계정 등록됨" };
  },
  removeAccount(id: string) {
    commit({ ...state, accounts: state.accounts.filter((a) => a.id !== id), appKeys: state.appKeys.filter((k) => k.accountId !== id) });
  },
  addAppKey(k: Omit<AppKey, "id" | "createdAt">) {
    const rec: AppKey = { ...k, id: seq++, createdAt: kstNow() };
    commit({ ...state, appKeys: [rec, ...state.appKeys] });
    return rec;
  },
  removeAppKey(id: number) { commit({ ...state, appKeys: state.appKeys.filter((k) => k.id !== id) }); },

  // 서비스별 계정 목록 — 각 서비스는 자기 계정만 로그인 대상으로 본다.
  accountsOfService(service: AccountService) { return state.accounts.filter((a) => a.service === service); },
  // 서비스 로그인 허용 판정 — 계정이 그 서비스에 연동돼 있고 유효한 App Key가 있어야 한다.
  canLogin(service: AccountService, accountId: string) {
    const acc = state.accounts.find((a) => a.id.toLowerCase() === accountId.toLowerCase());
    if (!acc || acc.service !== service) return false;
    return state.appKeys.some((k) => k.accountId === acc.id && k.service === service);
  },
};
const EMPTY: State = { accounts: [], appKeys: [] };

export function useCaster(): State {
  return useSyncExternalStore(caster.subscribe, caster.snapshot, caster.serverSnapshot);
}
