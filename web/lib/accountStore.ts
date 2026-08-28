"use client";

// 서비스 계정 + App Key 서비스 DB (목업 · localStorage)
// - 계정: 서비스 로그인용 (회사정보·ID(email)·PWD·NAME·ADDR·HOMEPAGE)
//   한 고객사(companyId)에 계정을 여러 개 등록할 수 있다(개수 제한 없음). ID(email)만 전체에서 유일.
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

// CasterN 사용자 권한 7종 — 계정마다 개별 선택 또는 모두 선택한다. (사용처 = CasterN 일 때만 의미)
export type CasterPerm =
  | "PROJECT_CREATE" | "SYMBOL_EDIT" | "RESOURCE_EDIT"
  | "EXPORT_NCODE_PDF" | "EXPORT_NCP2" | "EXPORT_APP_PACKAGE" | "APP_PAGE_CONFIG";
export const CASTERN_PERMS: { v: CasterPerm; label: string; desc: string }[] = [
  { v: "PROJECT_CREATE", label: "프로젝트 생성", desc: "편집 프로젝트를 새로 만든다" },
  { v: "SYMBOL_EDIT", label: "심볼 편집", desc: "심볼(코드 영역) 편집" },
  { v: "RESOURCE_EDIT", label: "리소스 편집", desc: "음원·이미지 등 리소스 편집" },
  { v: "EXPORT_NCODE_PDF", label: "Ncode PDF 내보내기", desc: "Ncode가 입혀진 PDF 출력" },
  { v: "EXPORT_NCP2", label: "NCP2 내보내기", desc: "NCP2 파일 내보내기" },
  { v: "EXPORT_APP_PACKAGE", label: "App용 패키지 내보내기", desc: "App에서 쓰는 패키지 내보내기" },
  { v: "APP_PAGE_CONFIG", label: "App 페이지 설정", desc: "App 페이지 구성·설정" },
];
export const ALL_PERMS: CasterPerm[] = CASTERN_PERMS.map((p) => p.v);
export const permLabel = (v: string) => CASTERN_PERMS.find((p) => p.v === v)?.label ?? v;

export type CasterAccount = {
  id: string;          // = 로그인 ID(email)
  service: AccountService;   // 사용처 — 이 계정이 연동되는 서비스
  pwd: string;
  name: string;
  companyId: number;
  company: string;     // 회사명
  addr: string;
  homepage: string;
  perms?: CasterPerm[];   // CasterN 권한 (사용처 = CasterN 일 때 사용)
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
  // 계정 수정 — ID(email)·고객사는 바꾸지 않는다(키 연동 기준값).
  updateAccount(id: string, patch: Partial<Omit<CasterAccount, "id" | "companyId" | "company" | "createdAt">>) {
    const accounts = state.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a));
    // 계정의 사용처를 바꾸면 연동된 App Key 의 사용처도 함께 따라간다.
    const appKeys = patch.service
      ? state.appKeys.map((k) => (k.accountId === id ? { ...k, service: patch.service as AccountService } : k))
      : state.appKeys;
    commit({ ...state, accounts, appKeys });
    return { ok: true, msg: "계정 정보가 저장되었습니다." };
  },
  accountById(id: string) { return state.accounts.find((a) => a.id === id); },
  removeAccount(id: string) {
    commit({ ...state, accounts: state.accounts.filter((a) => a.id !== id), appKeys: state.appKeys.filter((k) => k.accountId !== id) });
  },
  addAppKey(k: Omit<AppKey, "id" | "createdAt">) {
    const rec: AppKey = { ...k, id: seq++, createdAt: kstNow() };
    commit({ ...state, appKeys: [rec, ...state.appKeys] });
    return rec;
  },
  removeAppKey(id: number) { commit({ ...state, appKeys: state.appKeys.filter((k) => k.id !== id) }); },

  // 고객사별 계정 목록 — 한 고객사에 여러 계정을 둘 수 있다(제한 없음).
  accountsOfCompany(companyId: number) { return state.accounts.filter((a) => a.companyId === companyId); },
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
