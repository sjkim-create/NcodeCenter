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
import casterLedger from "@/data/caster-ledger.json";

// 사용처(연동 서비스) — 계정 로그인 허용 범위를 가르는 값
// ── 인증 서비스 `PC-076` ──────────────────────────
// **인증 서비스** = 이 계정이 우리 서비스 어디에 로그인하나(외부 고객사의 사용 인증).
//   고객사 관리의 **사용 서비스**(우리가 그 고객사를 어느 서비스로 다루나)와는 다른 값이다.
// 고르는 값은 2개뿐이고, **아무것도 고르지 않으면 = SDK 연동(코드만 할당)** — App Key 만 발급한다.
export type AccountService = "CASTERN" | "FORMSOLUTION" | "SDK";
// SDK 는 **고르는 값이 아니다** — 옛 데이터 호환용으로만 타입에 남긴다(= 선택 없음).
export const SDK_ONLY_LABEL = "SDK 연동 (코드만 할당)";
// ready=false → 인증 서비스로 선택은 되지만 권한·설정은 아직 정의되지 않음(준비중)
export const ACCOUNT_SERVICES: { v: AccountService; label: string; desc: string; ready: boolean }[] = [
  // 안내문 `PC-104` — 고객사 관리의 casterN(우리가 편집)과 구분한다
  { v: "CASTERN", label: "CasterN", desc: "casterN 서비스를 사용하기 위한 계정과 App Key 를 발급하여, 발급된 계정으로 CasterN 서비스를 직접 사용하는 고객사", ready: true },
  { v: "FORMSOLUTION", label: "폼솔루션", desc: "폼솔루션 서비스 · 계정 로그인", ready: false },
];
export const accountServiceLabel = (v?: string) => ACCOUNT_SERVICES.find((s) => s.v === v)?.label ?? "미지정";
// 고른 인증 서비스 표기 — 비어 있으면 SDK 연동(코드만 할당) `PC-076`
export const authServiceText = (svcs?: AccountService[]) => {
  const s = (svcs ?? []).filter((v) => v === "CASTERN" || v === "FORMSOLUTION");
  return s.length ? s.map(accountServiceLabel).join(" · ") : SDK_ONLY_LABEL;
};
// 권한·설정 화면이 준비된 서비스인지 — false면 등록 화면에서 「준비중」으로 노출한다.
export const accountServiceReady = (v?: string) => ACCOUNT_SERVICES.find((s) => s.v === v)?.ready ?? false;

// CasterN 사용자 권한 6종 — 계정마다 개별 선택 또는 모두 선택한다. (사용처에 CasterN 이 포함될 때만 의미)
//   ※ 「App 페이지 설정」 은 권한 항목에서 뺐다 `PC-058`.
//   ※ `PC-103` 에서 대장의 Web Caster 권한 키 20종으로 바꿨다가 **6종 체크로 되돌렸다** `PC-105` —
//      대장의 키는 아래 LEDGER_TO_PERM 으로 6종에 접어서 넣는다(리소스 Add·Delete·DragDrop 중 하나라도 true → 리소스 편집).
//   ※ 권한 키는 **소문자 snake_case** 이고 화면에는 「라벨 (키)」 로 보인다 `PC-106` — 예: 프로젝트 생성 (project_new)
export type CasterPerm =
  | "project_new" | "symbol_edit" | "resource_edit"
  | "export_ncode_pdf" | "export_ncp2" | "export_app_package";
export const CASTERN_PERMS: { v: CasterPerm; label: string; desc: string }[] = [
  { v: "project_new", label: "프로젝트 생성", desc: "편집 프로젝트를 새로 만든다" },
  { v: "symbol_edit", label: "심볼 편집", desc: "심볼(코드 영역) 편집" },
  { v: "resource_edit", label: "리소스 편집", desc: "음원·이미지 등 리소스 편집" },
  { v: "export_ncode_pdf", label: "Ncode PDF 내보내기", desc: "Ncode가 입혀진 PDF 출력" },
  { v: "export_ncp2", label: "NCP2 내보내기", desc: "NCP2 파일 내보내기" },
  { v: "export_app_package", label: "App용 패키지 내보내기", desc: "App에서 쓰는 패키지 내보내기" },
];
export const ALL_PERMS: CasterPerm[] = CASTERN_PERMS.map((p) => p.v);
/** 화면 표기 — 「라벨 (키)」 `PC-106` */
export const permLabel = (v: string) => { const p = CASTERN_PERMS.find((x) => x.v === v); return p ? `${p.label} (${p.v})` : v; };
// 옛 대문자 키(PROJECT_CREATE …) → 소문자 키 `PC-106`
const OLD_UPPER: Record<string, CasterPerm> = {
  PROJECT_CREATE: "project_new", SYMBOL_EDIT: "symbol_edit", RESOURCE_EDIT: "resource_edit",
  EXPORT_NCODE_PDF: "export_ncode_pdf", EXPORT_NCP2: "export_ncp2", EXPORT_APP_PACKAGE: "export_app_package",
};
// 대장(Web Caster)의 권한 키 → 6종 `PC-105`. 여기 없는 키(Settings·Tool·Ncode·Nproj 등)는 화면에 두지 않는다.
const LEDGER_TO_PERM: Record<string, CasterPerm> = {
  "Project/New/Enabled": "project_new",
  "Edit/Symbol/Enabled": "symbol_edit",
  "Edit/Resource/Add/Enabled": "resource_edit", "Edit/Resource/Delete/Enabled": "resource_edit", "Edit/Resource/DragDrop/Enabled": "resource_edit",
  "Export/NcodePDF/Enabled": "export_ncode_pdf",
  "Export/NCP/Enabled": "export_ncp2",
  "Export/PackageForApp/Enabled": "export_app_package",
};
// 저장된 권한 정리 — 옛 6종은 그대로, `PC-103` 때 저장된 키 형식은 6종으로 접는다
const migratePerms = (ps?: string[]): CasterPerm[] =>
  [...new Set((ps ?? []).map((p) => (ALL_PERMS as string[]).includes(p) ? (p as CasterPerm) : OLD_UPPER[p] ?? LEDGER_TO_PERM[p]).filter(Boolean) as CasterPerm[])];

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
  phone?: string;
  since?: string;      // 사용기간 시작 (YYYY-MM-DD) `PC-103`
  until?: string;      // 사용기간 끝 (YYYY-MM-DD / "무제한" / "") `PC-103`
  seeded?: boolean;    // 개발팀 대장에서 들어온 계정 — 비밀번호는 저장하지 않았다(「대장 참조」) `PC-103`
  note?: string;       // 대장의 안내문(영업용 테스트 계정 등)
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
// 코드 범위(티켓) — App Key 하나에 **여러 개**를 물릴 수 있다 `PC-103`
//   대장에서 한 계정이 PDS2·PDS3 를 함께 쓰거나(네오랩), 같은 Owner 안에서 Book 구간을 여러 번 받은(tranwisdom) 경우가 있다.
//   S·O 는 대장이 구간(0~1023)으로 준 것도 있어 *End 를 둔다. Book·Page 가 비어 있으면 null.
export type KeyRange = {
  pt: string;
  section: number; sectionEnd?: number | null;
  owner: number; ownerEnd?: number | null;
  bookStart: number | null; bookEnd: number | null; bookVol?: number;
  pageStart: number | null; pageEnd: number | null; pageVol?: number;
  count?: number | null;   // 대장의 수량(권수)
  note?: string;
};
export type AppKey = {
  id: number;
  key: string;         // 발급 App Key — **영문·숫자 29자 난수** `PC-066` · 대장에 키가 없으면 "" (미기재)
  accountId: string;   // 연동 계정(email)
  services: AccountService[];   // 사용처 — 계정의 사용처 전체(공통)
  company: string;
  ranges?: KeyRange[]; // 코드 범위 목록 `PC-103` — 아래 낱개 필드는 첫 범위(옛 데이터 호환)
  seeded?: boolean;    // 대장 시드 `PC-103`
  pt: string; section: number; owner: number; bookStart: number; bookEnd: number;
  bookVol: number;     // Book Volume — 발급 권수 (bookEnd = bookStart + bookVol - 1)
  pageStart: number; pageEnd: number;
  pageVol?: number;    // Page Volume — 발급 페이지 수 (pageEnd = pageStart + pageVol - 1) `PC-059`
  until: string;       // 만료(YYYY-MM-DD) / "무제한"
  createdAt: string;
  /** @deprecated 사용처별 키였던 시절 필드 — hydrate 에서 services 로 옮긴다 */
  service?: AccountService;
};
// App Key 값 = **영문·숫자 29자 난수** `PC-066` — 접두어(ncc_live_ 등)를 붙이지 않는다.
export const APP_KEY_LEN = 29;
const APP_KEY_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
export function genAppKey(): string {
  const buf = new Uint32Array(APP_KEY_LEN);
  (globalThis.crypto ?? window.crypto).getRandomValues(buf);
  return Array.from(buf, (n) => APP_KEY_CHARS[n % APP_KEY_CHARS.length]).join("");
}
const isAppKey = (v: string) => new RegExp(`^[0-9A-Za-z]{${APP_KEY_LEN}}$`).test(v);

// 계정의 App Key — 1개만 있다
export const appKeyOf = (s: { appKeys: AppKey[] }, accountId: string) =>
  s.appKeys.find((k) => k.accountId === accountId);
// App Key 의 코드 범위 목록 — ranges 가 없으면 낱개 필드를 한 범위로 `PC-103`
export const keyRanges = (k: AppKey): KeyRange[] =>
  k.ranges?.length ? k.ranges : [{ pt: k.pt, section: k.section, owner: k.owner, bookStart: k.bookStart, bookEnd: k.bookEnd,
    bookVol: k.bookVol, pageStart: k.pageStart, pageEnd: k.pageEnd, pageVol: k.pageVol }];
const span = (a: number | null | undefined, b?: number | null) =>
  a == null ? "—" : b != null && b !== a ? `${a}~${b}` : `${a}`;
/** 범위 한 줄 표기 — "PDS3 S3/O450/B0~238/P0~511" */
export const rangeText = (r: KeyRange) =>
  `${r.pt} S${span(r.section, r.sectionEnd)}/O${span(r.owner, r.ownerEnd)}/B${span(r.bookStart, r.bookEnd)}/P${span(r.pageStart, r.pageEnd)}`;
export const rangeBooks = (r: KeyRange) =>
  r.count ?? (r.bookStart != null && r.bookEnd != null ? r.bookEnd - r.bookStart + 1 : null);
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
// 옛 데이터의 "SDK" 선택값 → **선택 없음**(= SDK 연동) `PC-076`
const dropSdk = (v?: AccountService[]) => (v ?? []).filter((x) => x !== "SDK");
function migrate(s: State): State {
  const accounts = s.accounts.map((a) => {
    // 권한 키는 옛 6종 → Web Caster 20종으로 `PC-103`
    if (a.settings?.CASTERN?.perms) a = { ...a, settings: { ...a.settings, CASTERN: { ...a.settings.CASTERN, perms: migratePerms(a.settings.CASTERN.perms) } } };
    if (a.perms) a = { ...a, perms: migratePerms(a.perms) };
    if (a.services?.length && a.settings) return { ...a, services: dropSdk(a.services) };
    const services = dropSdk(a.services?.length ? a.services : a.service ? [a.service] : []);
    const settings: AccountSettings = { ...a.settings };
    if (services.includes("CASTERN") && !settings.CASTERN) settings.CASTERN = { perms: a.perms ?? [] };
    const { service: _drop, perms: _dropPerms, ...rest } = a;
    return { ...rest, services, settings };
  });
  // App Key: 사용처별(service) → 계정 공통(services) `PC-050`
  const appKeys = s.appKeys.map((k) => {
    if (k.seeded) return k;                                   // 대장 시드는 키 값을 다시 만들지 않는다 `PC-103`
    if (k.services?.length && isAppKey(k.key)) return { ...k, services: dropSdk(k.services) };
    if (k.services?.length) return { ...k, key: genAppKey(), services: dropSdk(k.services) };   // 키 형식만 갱신 `PC-066`
    const acc = accounts.find((a) => a.id === k.accountId);
    const services = dropSdk(acc?.services?.length ? acc.services : (k.service ? [k.service] : []));
    const vol = k.bookVol ?? Math.max(1, (k.bookEnd ?? 0) - (k.bookStart ?? 0) + 1);
    const { service: _drop, ...rest } = k;
    // 옛 형식(ncc_live_…)으로 발급된 키는 새 규칙(영문·숫자 29자)으로 다시 만든다 `PC-066`
    const key = isAppKey(k.key) ? k.key : genAppKey();
    return { ...rest, key, services, bookVol: vol };
  });
  return { ...s, accounts, appKeys };
}

// ── 개발팀 대장 시드 `PC-103` ─────────────────────────────
//   web/data/caster-ledger.json (db/import/build_caster_ledger.py) 의 계정·권한·코드 범위를 **1회** 넣는다.
//   이미 같은 ID 가 있으면 건너뛴다. 지운 계정은 다시 들어오지 않는다(표식 SEED_KEY).
//   비밀번호는 대장에 있어도 **저장하지 않는다** — pwd "" · 화면에는 「대장 참조」.
const SEED_KEY = "ncc-caster-seeded-v1";
type LedgerAccount = {
  sheet: string; company: string; companyId: number; id: string; name: string; since: string; until: string;
  appKey: string; perms: Record<string, boolean>; ranges: KeyRange[]; note: string; addr: string; phone: string; homepage: string;
};
function seedFromLedger(s: State): State {
  const rows = casterLedger.accounts as LedgerAccount[];
  const have = new Set(s.accounts.map((a) => a.id.toLowerCase()));
  const accounts = [...s.accounts];
  const appKeys = [...s.appKeys];
  for (const r of rows) {
    const id = r.id || `${r.company} (계정 미기재)`;          // 대장에 계정이 비어 있는 시트(영신사)
    if (have.has(id.toLowerCase())) continue;
    have.add(id.toLowerCase());
    const permKeys = Object.keys(r.perms);
    const on = migratePerms(permKeys.filter((k) => r.perms[k]));   // 대장 키 → 6종 `PC-105`
    // Web Caster 권한이 적혀 있으면 CasterN 계정, 아니면 App Key 만 받는 SDK 연동(선택 없음)
    const services: AccountService[] = permKeys.length ? ["CASTERN"] : [];
    accounts.push({
      id, services, settings: permKeys.length ? { CASTERN: { perms: on } } : {},
      pwd: "", name: r.name || "", companyId: r.companyId, company: r.company,
      addr: r.addr || "", homepage: r.homepage || "", phone: r.phone || "",
      since: r.since || "", until: r.until || "", seeded: true, note: r.note || "",
      createdAt: r.since ? `${r.since} 00:00:00` : "대장",
    });
    if (r.ranges.length || r.appKey) {
      const f = r.ranges[0];
      appKeys.push({
        id: seq++, key: r.appKey || "", accountId: id, services, company: r.company,
        ranges: r.ranges, seeded: true,
        pt: f?.pt ?? "PDS3", section: f?.section ?? 0, owner: f?.owner ?? 0,
        bookStart: f?.bookStart ?? 0, bookEnd: f?.bookEnd ?? 0, bookVol: rangeBooks(f ?? { pt: "", section: 0, owner: 0, bookStart: null, bookEnd: null, pageStart: null, pageEnd: null }) ?? 0,
        pageStart: f?.pageStart ?? 0, pageEnd: f?.pageEnd ?? 0,
        until: r.until || "무제한", createdAt: r.since ? `${r.since} 00:00:00` : "대장",
      });
    }
  }
  return { accounts, appKeys };
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      state = migrate(JSON.parse(raw));
      seq = Math.max(0, ...state.appKeys.map((k) => k.id)) + 1;
    }
    if (!localStorage.getItem(SEED_KEY)) {                 // 대장 시드 1회 `PC-103`
      state = seedFromLedger(state);
      seq = Math.max(0, ...state.appKeys.map((k) => k.id)) + 1;
      localStorage.setItem(SEED_KEY, "1");
    }
    persist();
    subs.forEach((f) => f());
  } catch { /* */ }
}

export const caster = {
  subscribe(cb: () => void) { subs.add(cb); hydrate(); return () => { subs.delete(cb); }; },
  snapshot() { return state; },
  serverSnapshot() { return EMPTY; },

  addAccount(a: Omit<CasterAccount, "createdAt">): { ok: boolean; msg: string } {
    if (state.accounts.some((x) => x.id.toLowerCase() === a.id.toLowerCase())) return { ok: false, msg: "이미 등록된 ID(email)입니다." };
    // 인증 서비스는 **0개도 정상** — 아무것도 고르지 않으면 SDK 연동(코드만 할당) `PC-076`
    commit({ ...state, accounts: [{ ...a, createdAt: kstNow() }, ...state.accounts] });
    return { ok: true, msg: "계정 등록됨" };
  },
  // 계정 수정 — ID(email)·고객사는 바꾸지 않는다(키 연동 기준값).
  // 사용처를 빼도 해당 App Key 는 지우지 않는다. 계정에 없는 사용처의 키는 연동이 끊긴 상태로 남고
  // canLogin 이 막는다. (키 삭제는 상세 화면에서 담당자가 직접 판단)
  updateAccount(id: string, patch: Partial<Omit<CasterAccount, "id" | "companyId" | "company" | "createdAt">>) {
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
  // 발급된 App Key 에 코드 범위를 하나 더 물린다 `PC-103`
  addKeyRange(id: number, r: KeyRange) {
    const appKeys = state.appKeys.map((k) => (k.id === id ? { ...k, ranges: [...keyRanges(k), r] } : k));
    commit({ ...state, appKeys });
  },
  removeKeyRange(id: number, idx: number) {
    const appKeys = state.appKeys.map((k) => {
      if (k.id !== id) return k;
      const rs = keyRanges(k).filter((_, i) => i !== idx);
      const f = rs[0];
      return { ...k, ranges: rs, ...(f ? { pt: f.pt, section: f.section, owner: f.owner, bookStart: f.bookStart ?? 0, bookEnd: f.bookEnd ?? 0, pageStart: f.pageStart ?? 0, pageEnd: f.pageEnd ?? 0 } : {}) };
    });
    commit({ ...state, appKeys });
  },

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
