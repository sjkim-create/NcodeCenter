"use client";

// 온보딩(가입 승인) 스토어 — SSO 로그인 기록 → 승인요청 `PC-116`
// ─────────────────────────────────────────────────────────────
// 흐름: 새 고객이 **우리 서비스(CasterN/폼솔루션 등)에 SSO 로그인**하면 그 기록이
//   **따로 관리되는 로그인 기록 서버**에 쌓인다. NcodeCenter 는 그 기록을
//   **승인요청(온보딩)** 으로 인지하고 [고객사 관리]에서 alert 로 보여 준다.
//   담당자가 **승인**하면 고객사로 등록되고, 그 고객사 기준으로 [App Key 관리]에서
//   계정·권한(App Key)을 발급한다.
//
// ※ 로그인 기록 서버는 아직 없어(목업 우선) 이 스토어가 그 피드를 대신한다.
//   실제 연동 시 seed 대신 서버 API(폴링/웹훅)로 PENDING 레코드를 채우면 된다.
//   내부 직원용 NcodeCenter 콘솔 로그인(@neolab.net)과는 별개다 — 저쪽은 authStore.
import { useSyncExternalStore } from "react";

// 로그인이 일어난 우리 서비스 (계정의 인증 서비스와 같은 축)
export type OnboardService = "CASTERN" | "FORMSOLUTION" | "SDK";
export type OnboardStatus = "PENDING" | "APPROVED" | "REJECTED";

export type OnboardingRequest = {
  id: number;
  email: string;         // SSO 로그인 계정 (id 로도 쓴다)
  name: string;          // 로그인 사용자 표시명
  org: string;           // 회사/조직명 (도메인 기반 추정 · 승인 시 고객사명 후보)
  domain: string;        // 이메일 도메인
  provider: string;      // SSO 공급자 (google 등)
  service: OnboardService;// 어느 서비스에 로그인했나
  firstLoginAt: string;  // 최초 로그인 시각 (기록 서버 기준)
  loginCount: number;    // 로그인 횟수 (같은 계정 재로그인 시 증가)
  status: OnboardStatus;
  companyId?: number;    // 승인 시 연결된 고객사 id
  decidedAt?: string;    // 승인/거절 시각
  decidedBy?: string;    // 처리한 직원
  note?: string;
};

type State = { requests: OnboardingRequest[] };
const KEY = "ncc-onboarding-v1";
const kstNow = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 19).replace("T", " ");
const kstDay = () => kstNow().slice(0, 10);

// ── 시드: 로그인 기록 서버가 보내온 새 고객 SSO 로그인(승인 대기) ──
// 고객은 @neolab.net 이 아닌 자기 회사 도메인으로 로그인한다.
const SEED: State = {
  requests: [
    { id: 1, email: "kim@hakwonbooks.co.kr", name: "김대표", org: "학원북스", domain: "hakwonbooks.co.kr",
      provider: "google", service: "CASTERN", firstLoginAt: "2026-09-27 10:12:33", loginCount: 3, status: "PENDING" },
    { id: 2, email: "admin@smartedu.kr", name: "이지현", org: "스마트에듀", domain: "smartedu.kr",
      provider: "google", service: "FORMSOLUTION", firstLoginAt: "2026-09-28 14:40:02", loginCount: 1, status: "PENDING" },
    { id: 3, email: "dev@pentalk.io", name: "Park J.", org: "펜톡", domain: "pentalk.io",
      provider: "google", service: "SDK", firstLoginAt: "2026-09-29 09:05:51", loginCount: 2, status: "PENDING" },
  ],
};

let state: State = SEED;
let hydrated = false;
let seq = 100;
const subs = new Set<() => void>();

function persist() { if (typeof window !== "undefined") { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* */ } } }
function commit(next: State) { state = next; persist(); subs.forEach((f) => f()); }
function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { state = JSON.parse(raw); }
    seq = Math.max(seq, ...state.requests.map((r) => r.id)) + 1;
    subs.forEach((f) => f());
  } catch { /* */ }
}

// 이메일 도메인 → 조직명 추정 (승인 화면에서 고칠 수 있다)
const orgGuess = (email: string) => {
  const d = (email.split("@")[1] ?? "").split(".")[0];
  return d ? d.charAt(0).toUpperCase() + d.slice(1) : "신규 고객";
};

export const onboarding = {
  subscribe(cb: () => void) { subs.add(cb); hydrate(); return () => { subs.delete(cb); }; },
  snapshot() { return state; },
  serverSnapshot() { return SEED; },

  pending() { return state.requests.filter((r) => r.status === "PENDING"); },

  // 새 SSO 로그인 기록 유입 — 같은 이메일이면 loginCount 만 올린다.
  //   실제 연동 시 기록 서버가 이 형태로 밀어 넣는다. (지금은 [테스트] 버튼)
  recordLogin(p: { email: string; name?: string; service?: OnboardService; provider?: string; org?: string }) {
    const email = p.email.trim().toLowerCase();
    if (!email) return;
    const domain = email.split("@")[1] ?? "";
    const exist = state.requests.find((r) => r.email.toLowerCase() === email);
    if (exist) {
      commit({ requests: state.requests.map((r) => (r.id === exist.id ? { ...r, loginCount: r.loginCount + 1 } : r)) });
      return exist.id;
    }
    const rec: OnboardingRequest = {
      id: seq++, email, name: p.name?.trim() || email.split("@")[0], org: p.org?.trim() || orgGuess(email),
      domain, provider: p.provider || "google", service: p.service || "SDK",
      firstLoginAt: kstNow(), loginCount: 1, status: "PENDING",
    };
    commit({ requests: [rec, ...state.requests] });
    return rec.id;
  },

  // 승인 — 고객사 등록은 호출부(CompaniesView)가 store.upsertCompany 로 처리하고
  //   여기서는 상태와 연결된 companyId 만 남긴다(스토어 간 의존 제거).
  approve(id: number, companyId: number, by?: string) {
    commit({ requests: state.requests.map((r) => (r.id === id
      ? { ...r, status: "APPROVED", companyId, decidedAt: kstNow(), decidedBy: by } : r)) });
  },
  reject(id: number, by?: string, note?: string) {
    commit({ requests: state.requests.map((r) => (r.id === id
      ? { ...r, status: "REJECTED", decidedAt: kstNow(), decidedBy: by, note } : r)) });
  },
  // 잘못 처리한 건을 다시 대기로
  reopen(id: number) {
    commit({ requests: state.requests.map((r) => (r.id === id
      ? { ...r, status: "PENDING", companyId: undefined, decidedAt: undefined, decidedBy: undefined } : r)) });
  },
  reset() { commit(JSON.parse(JSON.stringify(SEED))); seq = 100; },
};

export function useOnboarding(): State {
  return useSyncExternalStore(onboarding.subscribe, onboarding.snapshot, onboarding.serverSnapshot);
}

// 온보딩 서비스 → 고객사 사용 서비스(ServiceType) 매핑값
export const onboardServiceToCompany = (s: OnboardService): "CASTERN" | "FORMSOLUTION" | null =>
  s === "CASTERN" ? "CASTERN" : s === "FORMSOLUTION" ? "FORMSOLUTION" : null;

export const onboardServiceLabel = (s: OnboardService) =>
  s === "CASTERN" ? "CasterN" : s === "FORMSOLUTION" ? "폼솔루션" : "SDK 연동";
export { kstDay };
