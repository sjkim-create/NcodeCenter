"use client";

// 서비스 계정 + App Key 서비스 DB (목업 · localStorage)
// - 계정: 서비스 로그인용 (회사정보·ID(email)·PWD·NAME·ADDR·HOMEPAGE)
//   한 고객사(companyId)에 계정을 여러 개 등록할 수 있다(개수 제한 없음). ID(email)만 전체에서 유일.
// - App Key: 관리자가 발급 → 이 스토어(서비스 DB)에 등록 + 계정과 연동. 계정 로그인 시 연동된 SOBP로 작업
// - services(사용처): 이 계정이 연동되는 서비스 — 중복 선택 가능.
//   한 계정으로 여러 서비스를 쓸 수 있고, 각 서비스는 자기 계정만 로그인시킨다.
//   (CasterN = Caster U 웹 편집툴 / FORMSOLUTION = 폼솔루션 / SDK = 직접 연동)
// - settings(서비스별 설정): 서비스마다 권한·설정 항목이 다르다.
//   지금 권한 체계가 정의된 서비스는 CasterN 뿐이고, 나머지는 준비중이라 설정 항목이 없다.
import { useSyncExternalStore } from "react";

// 사용처(연동 서비스) — 계정 로그인 허용 범위를 가르는 값
export type AccountService = "CASTERN" | "FORMSOLUTION" | "SDK";
// ready=false → 사용처로 선택은 되지만 권한·설정은 아직 정의되지 않음(준비중)
export const ACCOUNT_SERVICES: { v: AccountService; label: string; desc: string; ready: boolean }[] = [
  { v: "CASTERN", label: "CasterN", desc: "Caster U 웹 편집툴 · 계정 로그인", ready: true },
  { v: "FORMSOLUTION", label: "폼솔루션", desc: "폼솔루션 서비스 · 계정 로그인", ready: false },
  { v: "SDK", label: "SDK 연동 (코드만 할당)", desc: "네오랩 서비스 없이 코드만 받아 직접 연동 · id/pwd + SOBP", ready: false },
];
export const accountServiceLabel = (v?: string) => ACCOUNT_SERVICES.find((s) => s.v === v)?.label ?? "미지정";
// 권한·설정 화면이 준비된 서비스인지 — false면 등록 화면에서 「준비중」으로 노출한다.
export const accountServiceReady = (v?: string) => ACCOUNT_SERVICES.find((s) => s.v === v)?.ready ?? false;

// CasterN 사용자 권한 6종 — 계정마다 개별 선택 또는 모두 선택한다. (사용처에 CasterN 이 포함될 때만 의미)
//   ※ 「App 페이지 설정」 은 권한 항목에서 뺐다 `PC-058` — 옛 데이터에 남아 있어도 화면에 나오지 않는다.
export type CasterPerm =
  | "PROJECT_CREATE" | "SYMBOL_EDIT" | "RESOURCE_EDIT"
  | "EXPORT_NCODE_PDF" | "EXPORT_NCP2" | "EXPORT_APP_PACKAGE";
export const CASTERN_PERMS: { v: CasterPerm; label: string; desc: string }[] = [
  { v: "PROJECT_CREATE", label: "프로젝트 생성", desc: "편집 프로젝트를 새로 만든다" },
  { v: "SYMBOL_EDIT", label: "심볼 편집", desc: "심볼(코드 영역) 편집" },
  { v: "RESOURCE_EDIT", label: "리소스 편집", desc: "음원·이미지 등 리소스 편집" },
  { v: "EXPORT_NCODE_PDF", label: "Ncode PDF 내보내기", desc: "Ncode가 입혀진 PDF 출력" },
  { v: "EXPORT_NCP2", label: "NCP2 내보내기", desc: "NCP2 파일 내보내기" },
  { v: "EXPORT_APP_PACKAGE", label: "App용 패키지 내보내기", desc: "App에서 쓰는 패키지 내보내기" },
];
export const ALL_PERMS: CasterPerm[] = CASTERN_PERMS.map((p) => p.v);
export const permLabel = (v: string) => CASTERN_PERMS.find((p) => p.v === v)?.label ?? v;

// 서비스별 설정 — 서비스마다 지정 항목이 다르다.
// CasterN: 사용자 권한 6종. 나머지 서비스는 아직 정의된 항목이 없다(준비중).
export type ServiceSettings = { perms?: CasterPerm[] };
export type AccountSettings = Partial<Record<AccountService, ServiceSettings>>;

export type CasterAccount = {
  id: string;          // = 로그인 ID(email)
  services: AccountService[];   // 사용처 — 이 계정이 연동되는 서비스(중복 선택 가능)
  settings?: AccountSettings;   // 서비스별 권한·설정
  pwd: string;
  name: string;
  companyId: number;
  company: string;     // 회사명
  addr: string;
  homepage: string;
  createdAt: string;
  /** @deprecated 단일 사용처 시절 필드 — hydrate 에서 services 로 옮긴다 */
  service?: AccountService;
  /** @deprecated CasterN 권한 — hydrate 에서 settings.CASTERN.perms 로 옮긴다 */
  perms?: CasterPerm[];
};

// 계정의 CasterN 권한 — 사용처에 CasterN 이 없으면 빈 배열
export const casternPerms = (a?: CasterAccount): CasterPerm[] =>
  a && a.services?.includes("CASTERN") ? a.settings?.CASTERN?.perms ?? [] : [];
export const hasService = (a: CasterAccount | undefined, s: AccountService) => !!a?.services?.includes(s);
// App Key — **한 계정에 1개**만 발급하고, 그 계정의 **사용처 전체에 공통**으로 쓴다 `PC-050`
//   좌표는 **고객사가 가진 S/O** 안에서 **B·P 영역만 계정마다 다르게** 잡는다 `PC-059`.
export type AppKey = {
  id: number;
  key: string;         // 발급 App Key (ncc_live_...)
  accountId: string;   // 연동 계정(email)
  services: AccountService[];   // 사용처 — 계정의 사용처 전체(공통)
  company: string;
  pt: string; section: number; owner: number; bookStart: number; bookEnd: number;
  bookVol: number;     // Book Volume — 발급 권수 (bookEnd = bookStart + bookVol - 1)
  pageStart: number; pageEnd: number;
  pageVol?: number;    // Page Volume — 발급 페이지 수 (pageEnd = pageStart + pageVol - 1) `PC-059`
  until: string;       // 만료(YYYY-MM-DD) / "무제한"
  createdAt: string;
  /** @deprecated 사용처별 키였던 시절 필드 — hydrate 에서 services 로 옮긴다 */
  service?: AccountService;
};
// 계정의 App Key — 1개만 있다
export const appKeyOf = (s: { appKeys: AppKey[] }, accountId: string) =>
  s.appKeys.find((k) => k.accountId === accountId);
type State = { accounts: CasterAccount[]; appKeys: AppKey[] };

const KEY = "ncc-caster-v1";
const kstNow = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 19).replace("T", " ");

let state: State = { accounts: [], appKeys: [] };
let hydrated = false;
const subs = new Set<() => void>();
let seq = 1;

function persist() { if (typeof window !== "undefined") { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* */ } } }
function commit(next: State) { state = next; persist(); subs.forEach((f) => f()); }
// 단일 사용처(service·perms) 로 저장된 기존 데이터를 다중 사용처(services·settings) 로 옮긴다.
function migrate(s: State): State {
  const accounts = s.accounts.map((a) => {
    if (a.services?.length && a.settings) return a;
    const services = a.services?.length ? a.services : a.service ? [a.service] : [];
    const settings: AccountSettings = { ...a.settings };
    if (services.includes("CASTERN") && !settings.CASTERN) settings.CASTERN = { perms: a.perms ?? [] };
    const { service: _drop, perms: _dropPerms, ...rest } = a;
    return { ...rest, services, settings };
  });
  // App Key: 사용처별(service) → 계정 공통(services) `PC-050`
  const appKeys = s.appKeys.map((k) => {
    if (k.services?.length) return k;
    const acc = accounts.find((a) => a.id === k.accountId);
    const services = acc?.services?.length ? acc.services : (k.service ? [k.service] : []);
    const vol = k.bookVol ?? Math.max(1, (k.bookEnd ?? 0) - (k.bookStart ?? 0) + 1);
    const { service: _drop, ...rest } = k;
    return { ...rest, services, bookVol: vol };
  });
  return { ...s, accounts, appKeys };
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      state = migrate(JSON.parse(raw));
      seq = Math.max(0, ...state.appKeys.map((k) => k.id)) + 1;
      persist();
      subs.forEach((f) => f());
    }
  } catch { /* */ }
}

export const caster = {
  subscribe(cb: () => void) { subs.add(cb); hydrate(); return () => { subs.delete(cb); }; },
  snapshot() { return state; },
  serverSnapshot() { return EMPTY; },

  addAccount(a: Omit<CasterAccount, "createdAt">): { ok: boolean; msg: string } {
    if (state.accounts.some((x) => x.id.toLowerCase() === a.id.toLowerCase())) return { ok: false, msg: "이미 등록된 ID(email)입니다." };
    if (!a.services?.length) return { ok: false, msg: "사용처(연동 서비스)를 1개 이상 선택하세요." };
    commit({ ...state, accounts: [{ ...a, createdAt: kstNow() }, ...state.accounts] });
    return { ok: true, msg: "계정 등록됨" };
  },
  // 계정 수정 — ID(email)·고객사는 바꾸지 않는다(키 연동 기준값).
  // 사용처를 빼도 해당 App Key 는 지우지 않는다. 계정에 없는 사용처의 키는 연동이 끊긴 상태로 남고
  // canLogin 이 막는다. (키 삭제는 상세 화면에서 담당자가 직접 판단)
  updateAccount(id: string, patch: Partial<Omit<CasterAccount, "id" | "companyId" | "company" | "createdAt">>) {
    if (patch.services && !patch.services.length) return { ok: false, msg: "사용처(연동 서비스)를 1개 이상 선택하세요." };
    const accounts = state.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a));
    commit({ ...state, accounts });
    return { ok: true, msg: "계정 정보가 저장되었습니다." };
  },
  accountById(id: string) { return state.accounts.find((a) => a.id === id); },
  removeAccount(id: string) {
    commit({ ...state, accounts: state.accounts.filter((a) => a.id !== id), appKeys: state.appKeys.filter((k) => k.accountId !== id) });
  },
  // 한 계정에 App Key 는 1개다 `PC-050` — 이미 있으면 발급하지 않는다(삭제 후 재발급).
  addAppKey(k: Omit<AppKey, "id" | "createdAt">) {
    if (state.appKeys.some((x) => x.accountId === k.accountId)) return undefined;
    const rec: AppKey = { ...k, id: seq++, createdAt: kstNow() };
    commit({ ...state, appKeys: [rec, ...state.appKeys] });
    return rec;
  },
  removeAppKey(id: number) { commit({ ...state, appKeys: state.appKeys.filter((k) => k.id !== id) }); },

  // 고객사별 계정 목록 — 한 고객사에 여러 계정을 둘 수 있다(제한 없음).
  accountsOfCompany(companyId: number) { return state.accounts.filter((a) => a.companyId === companyId); },
  // 서비스별 계정 목록 — 각 서비스는 자기 계정만 로그인 대상으로 본다.
  // 한 계정이 여러 서비스에 연동돼 있으면 각 서비스 목록에 모두 잡힌다.
  accountsOfService(service: AccountService) { return state.accounts.filter((a) => a.services?.includes(service)); },
  // 서비스 로그인 허용 판정 — 계정 사용처에 그 서비스가 있고, 그 서비스용 App Key가 있어야 한다.
  //   App Key 는 계정당 1개이고 사용처 전체에 공통이다 `PC-050`.
  canLogin(service: AccountService, accountId: string) {
    const acc = state.accounts.find((a) => a.id.toLowerCase() === accountId.toLowerCase());
    if (!acc || !acc.services?.includes(service)) return false;
    return state.appKeys.some((k) => k.accountId === acc.id);
  },
};
const EMPTY: State = { accounts: [], appKeys: [] };

export function useCaster(): State {
  return useSyncExternalStore(caster.subscribe, caster.snapshot, caster.serverSnapshot);
}
