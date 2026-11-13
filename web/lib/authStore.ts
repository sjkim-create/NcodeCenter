"use client";

// 사용자·권한 + 권한요청 + 로그인 세션 (localStorage 공유 스토어)
import { useSyncExternalStore } from "react";
import { STAFF_USERS } from "./staffUsers";
import { logActivity, setActivityActor } from "./activityStore";

export type Role = "ADMIN" | "STAFF";

// 허용 회사 도메인 — 이 도메인 계정만 승인 요청 · 로그인할 수 있다(첫 방문은 관리자 승인 후 사용 `PC-299`)
export const ALLOWED_DOMAINS = (process.env.NEXT_PUBLIC_ALLOWED_DOMAINS ?? "neolab.net")
  .split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
const domainOf = (email: string) => email.split("@")[1]?.toLowerCase() ?? "";
export const isCompanyEmail = (email: string) => ALLOWED_DOMAINS.includes(domainOf(email));
export type User = { id: string; email: string; name: string; department: string; role: Role; enabled: boolean; password: string };
export type PermReq = { id: number; name: string; email: string; department: string; role: Role; reason: string; status: "PENDING" | "APPROVED" | "REJECTED"; createdAt: string };
export type AuthState = { users: User[]; requests: PermReq[]; currentEmail: string | null };

const KEY = "ncc-auth-v8";
// 부서 목록 — 직원 계정 화면의 부서 선택지 `PC-305`
export const DEPTS = ["국내사업팀", "해외사업팀", "서비스기획팀", "SW개발팀", "펌웨어개발팀", "개발품질팀", "재무회계팀"];
// 예전 부서 이름 → 새 이름(이미 저장된 직원 값을 맞춘다) `PC-305`
const DEPT_RENAME: Record<string, string> = { "국내사업부": "국내사업팀", "해외사업부": "해외사업팀", "펌웨어 팀": "펌웨어개발팀" };
// 초기 비밀번호 = 이메일과 동일. 부서는 명단(staffUsers)에 지정, 없으면 순번 배정
const SEED: AuthState = {
  users: STAFF_USERS.map((u, i) => ({ id: u.id, email: u.id, name: u.name, department: u.department ?? DEPTS[i % DEPTS.length], role: u.role, enabled: true, password: u.id })),
  // 첫 방문 승인 요청(시험용 1건) `PC-299`
  requests: [{ id: 1, name: "정하늘", email: "staff.jung@neolab.net", department: "-", role: "STAFF", reason: "", status: "PENDING", createdAt: "2026-11-13 10:05" }],
  currentEmail: null,
};

let state: AuthState = SEED;
let hydrated = false;
const subs = new Set<() => void>();
let seq = 1000;
const nid = () => ++seq;
const today = () => new Date().toISOString().slice(0, 10);
const kstNow = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 16).replace("T", " ");   // 요청 일시 = 한국 시각 `PC-303`

// 프로토타입 데모 세션 쿠키 — 미들웨어가 SSO 세션 대신 인정한다 `PC-116`.
//   실 서비스용이 아니라 Google 없이 프로토타입을 열람/시연하기 위한 통로.
function setDemoCookie(on: boolean) {
  if (typeof document === "undefined") return;
  document.cookie = on
    ? "ncc_demo=1; path=/; max-age=86400; samesite=lax"
    : "ncc_demo=; path=/; max-age=0; samesite=lax";
}

function persist() { if (typeof window !== "undefined") { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* */ } } }
function commit(next: AuthState) { state = next; persist(); subs.forEach((f) => f()); }
function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      state = JSON.parse(raw);
      // 명단(staffUsers)에 새로 넣은 직원이 저장분에 없으면 채운다 — 이미 있는 직원의 값은 그대로 `PC-297`
      const missing = SEED.users.filter((u) => !state.users.some((x) => x.email.toLowerCase() === u.email.toLowerCase()));
      if (missing.length) { state = { ...state, users: [...state.users, ...missing] }; persist(); }
      if (state.users.some((u) => DEPT_RENAME[u.department])) {
        state = { ...state, users: state.users.map((u) => (DEPT_RENAME[u.department] ? { ...u, department: DEPT_RENAME[u.department] } : u)) };
        persist();
      }
      // 시험용 승인 요청도 저장분에 없으면 채운다(이미 처리한 요청은 그대로) `PC-299`
      const reqs = state.requests ?? [];
      const missReq = SEED.requests.filter((r) => !reqs.some((x) => x.email.toLowerCase() === r.email.toLowerCase())
        && !state.users.some((u) => u.email.toLowerCase() === r.email.toLowerCase()));
      if (missReq.length || !state.requests) { state = { ...state, requests: [...reqs, ...missReq] }; persist(); }
      seq = Math.max(seq, ...state.requests.map((r) => r.id));
      const cur = state.currentEmail ? state.users.find((u) => u.email === state.currentEmail) : null;
      if (cur) setActivityActor(cur.name);   // 새로고침해도 활동 기록 작성자 유지
      // 로그인 상태(currentEmail)면 데모 세션 쿠키를 다시 세워 미들웨어 게이트와 일치시킨다 `PC-116`.
      //   (쿠키 만료 등으로 어긋나면 /login ↔ 게이트 리다이렉트 루프 = 화면 사라짐 → 방지)
      setDemoCookie(!!cur);
      subs.forEach((f) => f());
    }
  } catch { /* */ }
}

export const auth = {
  subscribe(cb: () => void) { subs.add(cb); hydrate(); return () => { subs.delete(cb); }; },
  snapshot() { return state; },
  serverSnapshot() { return SEED; },

  addUser(u: Omit<User, "id" | "enabled" | "password"> & { enabled?: boolean; password?: string }) {
    if (state.users.some((x) => x.email === u.email)) return false;
    commit({ ...state, users: [{ ...u, id: u.email, enabled: u.enabled ?? true, password: u.password ?? u.email }, ...state.users] });
    return true;
  },
  updateUser(id: string, patch: Partial<User>) { commit({ ...state, users: state.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) }); },
  changePassword(id: string, password: string) { commit({ ...state, users: state.users.map((u) => (u.id === id ? { ...u, password } : u)) }); },
  deleteUser(id: string) { commit({ ...state, users: state.users.filter((u) => u.id !== id), currentEmail: state.currentEmail === id ? null : state.currentEmail }); },

  // 회사 계정(SSO) 세션 → 로컬 스토어 동기화. 명단에 없는 계정은 들이지 않는다 — 첫 방문은 승인 요청 후 관리자 승인 `PC-299`
  setSession(s: { email: string; name: string; role: Role } | null) {
    if (!s) {
      if (state.currentEmail !== null) commit({ ...state, currentEmail: null });
      setActivityActor("");
      return;
    }
    const wasLoggedIn = state.currentEmail?.toLowerCase() === s.email.toLowerCase();
    const existing = state.users.find((u) => u.email.toLowerCase() === s.email.toLowerCase());
    if (existing && !existing.enabled) {
      // 사용 중지한 직원 — 회사 계정으로 들어와도 콘솔에 들이지 않는다 `PC-297`
      if (state.currentEmail !== null) commit({ ...state, currentEmail: null });
      setActivityActor("");
      return;
    }
    if (!existing) {
      // 미등록(승인 전) — 자동 등록하지 않는다 `PC-299` (로그인 화면의 [첫 방문 — 승인 요청]으로)
      if (state.currentEmail !== null) commit({ ...state, currentEmail: null });
      setActivityActor("");
      return;
    }
    {
      // 이름 · 역할 · 부서 · 사용 여부는 직원 계정 화면에서 정한 값을 유지한다 — 이름은 비어 있을 때만 회사 프로필 값 `PC-297`
      //   (사용 중지한 직원을 로그인만으로 다시 켜지 않는다)
      const users = state.users.map((u) => (u.id === existing.id ? { ...u, name: u.name || s.name } : u));
      commit({ ...state, users, currentEmail: existing.email });
    }
    setActivityActor(s.name || s.email);
    if (!wasLoggedIn) logActivity("access", `로그인 · 회사 계정 접속 · ${s.email}`, s.name || s.email);
  },

  login(email: string, password: string): { ok: boolean; msg: string } {
    const em = email.trim();
    const u = state.users.find((x) => x.email.toLowerCase() === em.toLowerCase());
    // 관리자가 승인한(등록된) 계정만 로그인 가능. 첫 방문은 [첫 방문 — 승인 요청] `PC-299`
    if (!u) {
      if (!isCompanyEmail(em)) return { ok: false, msg: `회사 계정(@${ALLOWED_DOMAINS[0]})만 로그인할 수 있습니다.` };
      return pendingOf(em)
        ? { ok: false, msg: "승인 대기 중인 계정입니다. 관리자가 승인하면 로그인할 수 있습니다." }
        : { ok: false, msg: "등록되지 않은 계정입니다. [첫 방문 — 승인 요청]으로 먼저 요청하세요." };
    }
    if (!u.enabled) return { ok: false, msg: "비활성화된 계정입니다. 관리자에게 문의하세요." };
    if (u.password !== password) return { ok: false, msg: "비밀번호가 일치하지 않습니다. (초기 비밀번호 = 이메일)" };
    commit({ ...state, currentEmail: u.email });
    setActivityActor(u.name);
    setDemoCookie(true);   // 데모 세션 → 미들웨어(SSO 게이트) 통과 `PC-116`
    try { localStorage.setItem("ncc-last-email", u.email); } catch { /* */ }   // 재로그인 시 계정 기억
    logActivity("access", `로그인 · 일반 접속 · ${u.email}`, u.name);
    return { ok: true, msg: `${u.name}(${u.role})으로 로그인` };
  },
  // 프로토타입 데모 로그인 — Google/비밀번호 없이 즉시 입장(관리자 우선) `PC-116`.
  //   실제 데이터가 아니라 시연·검토용 통로. 데모 세션 쿠키를 심어 미들웨어(SSO 게이트)를 통과한다.
  demoLogin(): { ok: boolean; msg: string } {
    const u = state.users.find((x) => x.role === "ADMIN" && x.enabled)
      ?? state.users.find((x) => x.enabled) ?? state.users[0];
    if (!u) return { ok: false, msg: "데모로 로그인할 계정이 없습니다." };
    commit({ ...state, currentEmail: u.email });
    setActivityActor(u.name);
    setDemoCookie(true);
    logActivity("access", `로그인 · 프로토타입 데모 접속 · ${u.email}`, u.name);
    return { ok: true, msg: `${u.name}(${u.role})으로 데모 로그인` };
  },
  logout() {
    const u = state.currentEmail ? state.users.find((x) => x.email === state.currentEmail) : null;
    if (u) logActivity("access", `로그아웃 · ${u.email}`, u.name);
    setActivityActor("");
    setDemoCookie(false);   // 데모 세션 쿠키 제거
    commit({ ...state, currentEmail: null });
  },

  // 첫 방문 승인 요청 — 이름 · 회사 이메일만 받는다. 역할은 STAFF · 부서 미지정으로 요청 `PC-299`
  requestAccess(p: { name: string; email: string }): { ok: boolean; msg: string } {
    const name = p.name.trim(), email = p.email.trim().toLowerCase();
    if (!name) return { ok: false, msg: "이름을 입력하세요." };
    if (!email) return { ok: false, msg: "회사 이메일을 입력하세요." };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, msg: "이메일 형식이 올바르지 않습니다." };
    if (!isCompanyEmail(email)) return { ok: false, msg: `회사 계정(@${ALLOWED_DOMAINS[0]})만 요청할 수 있습니다.` };
    if (state.users.some((u) => u.email.toLowerCase() === email)) return { ok: false, msg: "이미 등록된 계정입니다. 로그인하세요." };
    if (pendingOf(email)) return { ok: false, msg: "이미 승인 요청한 계정입니다. 관리자 승인을 기다려 주세요." };
    commit({ ...state, requests: [{ id: nid(), name, email, department: "-", role: "STAFF", reason: "", status: "PENDING", createdAt: kstNow() }, ...state.requests] });
    logActivity("access", `승인 요청 · 첫 방문 · ${email}`, name);
    return { ok: true, msg: "승인 요청을 보냈습니다. 관리자가 승인하면 로그인할 수 있습니다." };
  },
  // 직원 직접 등록 — ADMIN 이 직원 계정 화면에서 바로 등록(승인 요청 없이) `PC-309`
  //   등록하면 사용 중 · 초기 비밀번호 = 이메일. 같은 이메일의 대기 승인 요청은 승인 처리로 닫는다
  registerStaff(p: { name: string; email: string; department: string; role: Role }, by?: string): { ok: boolean; msg: string } {
    const name = p.name.trim(), email = p.email.trim().toLowerCase();
    if (!name) return { ok: false, msg: "이름을 입력하세요." };
    if (!email) return { ok: false, msg: "회사 이메일을 입력하세요." };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, msg: "이메일 형식이 올바르지 않습니다." };
    if (!isCompanyEmail(email)) return { ok: false, msg: `회사 계정(@${ALLOWED_DOMAINS[0]})만 등록할 수 있습니다.` };
    if (state.users.some((u) => u.email.toLowerCase() === email)) return { ok: false, msg: "이미 등록된 직원입니다." };
    const nu: User = { id: email, email, name, department: p.department || "-", role: p.role, enabled: true, password: email };
    commit({ ...state, users: [nu, ...state.users],
      requests: state.requests.map((r) => (r.status === "PENDING" && r.email.toLowerCase() === email ? { ...r, status: "APPROVED" } : r)) });
    logActivity("access", `직원 등록 — ${name} · ${email} · ${p.role}`, by);
    return { ok: true, msg: `직원 등록 — ${name}` };
  },
  addRequest(r: Omit<PermReq, "id" | "status" | "createdAt">) {
    commit({ ...state, requests: [{ ...r, id: nid(), status: "PENDING", createdAt: today() }, ...state.requests] });
  },
  // 승인 — 직원 명단에 STAFF · 사용 중으로 등록(초기 비밀번호 = 이메일) `PC-299`
  approveRequest(id: number, by?: string) {
    const r = state.requests.find((x) => x.id === id);
    if (!r || r.status !== "PENDING") return;
    const users = state.users.some((u) => u.email === r.email)
      ? state.users.map((u) => (u.email === r.email ? { ...u, enabled: true, role: r.role, department: r.department, name: r.name } : u))
      : [{ id: r.email, email: r.email, name: r.name, department: r.department, role: r.role, enabled: true, password: r.email }, ...state.users];
    commit({ ...state, users, requests: state.requests.map((x) => (x.id === id ? { ...x, status: "APPROVED" } : x)) });
    logActivity("access", `직원 승인 — ${r.name} · ${r.email}`, by);
  },
  rejectRequest(id: number, by?: string) {
    const r = state.requests.find((x) => x.id === id);
    if (!r || r.status !== "PENDING") return;
    commit({ ...state, requests: state.requests.map((x) => (x.id === id ? { ...x, status: "REJECTED" } : x)) });
    logActivity("access", `직원 승인 거절 — ${r.name} · ${r.email}`, by);
  },
};

// 승인 대기 중인 요청(같은 이메일) `PC-299`
function pendingOf(email: string) {
  return (state.requests ?? []).find((r) => r.status === "PENDING" && r.email.toLowerCase() === email.toLowerCase());
}
export const pendingRequests = (s: AuthState) => (s.requests ?? []).filter((r) => r.status === "PENDING");

export function useAuth(): AuthState {
  return useSyncExternalStore(auth.subscribe, auth.snapshot, auth.serverSnapshot);
}
export function currentUser(s: AuthState): User | null {
  return s.currentEmail ? s.users.find((u) => u.email === s.currentEmail) ?? null : null;
}
