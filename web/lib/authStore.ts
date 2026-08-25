"use client";

// 사용자·권한 + 권한요청 + 로그인 세션 (localStorage 공유 스토어)
import { useSyncExternalStore } from "react";
import { STAFF_USERS } from "./staffUsers";
import { logActivity, setActivityActor } from "./activityStore";

export type Role = "ADMIN" | "STAFF";

// 허용 회사 도메인 — 이 도메인 계정이면 첫 로그인 시 자동 등록(승인 불필요)
export const ALLOWED_DOMAINS = (process.env.NEXT_PUBLIC_ALLOWED_DOMAINS ?? "neolab.net")
  .split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
const domainOf = (email: string) => email.split("@")[1]?.toLowerCase() ?? "";
export const isCompanyEmail = (email: string) => ALLOWED_DOMAINS.includes(domainOf(email));
export type User = { id: string; email: string; name: string; department: string; role: Role; enabled: boolean; password: string };
export type PermReq = { id: number; name: string; email: string; department: string; role: Role; reason: string; status: "PENDING" | "APPROVED" | "REJECTED"; createdAt: string };
export type AuthState = { users: User[]; requests: PermReq[]; currentEmail: string | null };

const KEY = "ncc-auth-v8";
// 초기 비밀번호 = 이메일과 동일. 부서는 명단(staffUsers)에 지정, 없으면 순번 배정
const DEPTS = ["국내사업부", "해외사업부", "서비스기획팀", "SW개발팀", "펌웨어 팀", "국내사업부", "서비스기획팀"];
const SEED: AuthState = {
  users: STAFF_USERS.map((u, i) => ({ id: u.id, email: u.id, name: u.name, department: u.department ?? DEPTS[i % DEPTS.length], role: u.role, enabled: true, password: u.id })),
  requests: [],
  currentEmail: null,
};

let state: AuthState = SEED;
let hydrated = false;
const subs = new Set<() => void>();
let seq = 1000;
const nid = () => ++seq;
const today = () => new Date().toISOString().slice(0, 10);

function persist() { if (typeof window !== "undefined") { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* */ } } }
function commit(next: AuthState) { state = next; persist(); subs.forEach((f) => f()); }
function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      state = JSON.parse(raw);
      const cur = state.currentEmail ? state.users.find((u) => u.email === state.currentEmail) : null;
      if (cur) setActivityActor(cur.name);   // 새로고침해도 활동 기록 작성자 유지
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

  // 회사 계정(SSO) 세션 → 로컬 스토어 동기화. 명단에 없는 회사 계정은 자동 등록(STAFF).
  setSession(s: { email: string; name: string; role: Role } | null) {
    if (!s) {
      if (state.currentEmail !== null) commit({ ...state, currentEmail: null });
      setActivityActor("");
      return;
    }
    const wasLoggedIn = state.currentEmail?.toLowerCase() === s.email.toLowerCase();
    const existing = state.users.find((u) => u.email.toLowerCase() === s.email.toLowerCase());
    if (existing) {
      // 이름은 IdP 값을 우선(회사 프로필), 역할/부서 등 로컬 편집값은 유지
      const users = state.users.map((u) => (u.id === existing.id ? { ...u, name: s.name || u.name, enabled: true } : u));
      commit({ ...state, users, currentEmail: existing.email });
    } else {
      const nu: User = { id: s.email, email: s.email, name: s.name, department: "-", role: s.role, enabled: true, password: "" };
      commit({ ...state, users: [nu, ...state.users], currentEmail: nu.email });
    }
    setActivityActor(s.name || s.email);
    if (!wasLoggedIn) logActivity("login", `회사 계정 접속 · ${s.email}`, s.name || s.email);
  },

  login(email: string, password: string): { ok: boolean; msg: string } {
    const em = email.trim();
    const u = state.users.find((x) => x.email.toLowerCase() === em.toLowerCase());
    // 회사에 "등록된" 계정만 로그인 가능. 신규 등록은 회사 Google 계정 인증(OAuth)으로만.
    if (!u) {
      return isCompanyEmail(em)
        ? { ok: false, msg: "회사에 등록되지 않은 계정입니다. 회사 Google 계정으로 로그인(인증)하면 등록됩니다." }
        : { ok: false, msg: `회사 계정(@${ALLOWED_DOMAINS[0]})만 로그인할 수 있습니다.` };
    }
    if (!u.enabled) return { ok: false, msg: "비활성화된 계정입니다. 관리자에게 문의하세요." };
    if (u.password !== password) return { ok: false, msg: "비밀번호가 일치하지 않습니다. (초기 비밀번호 = 이메일)" };
    commit({ ...state, currentEmail: u.email });
    setActivityActor(u.name);
    try { localStorage.setItem("ncc-last-email", u.email); } catch { /* */ }   // 재로그인 시 계정 기억
    logActivity("login", `일반 접속 · ${u.email}`, u.name);
    return { ok: true, msg: `${u.name}(${u.role})으로 로그인` };
  },
  logout() {
    const u = state.currentEmail ? state.users.find((x) => x.email === state.currentEmail) : null;
    if (u) logActivity("logout", `로그아웃 · ${u.email}`, u.name);
    setActivityActor("");
    commit({ ...state, currentEmail: null });
  },

  addRequest(r: Omit<PermReq, "id" | "status" | "createdAt">) {
    commit({ ...state, requests: [{ ...r, id: nid(), status: "PENDING", createdAt: today() }, ...state.requests] });
  },
  approveRequest(id: number) {
    const r = state.requests.find((x) => x.id === id);
    if (!r) return;
    const users = state.users.some((u) => u.email === r.email)
      ? state.users.map((u) => (u.email === r.email ? { ...u, enabled: true, role: r.role, department: r.department, name: r.name } : u))
      : [{ id: r.email, email: r.email, name: r.name, department: r.department, role: r.role, enabled: true, password: r.email }, ...state.users];
    commit({ ...state, users, requests: state.requests.map((x) => (x.id === id ? { ...x, status: "APPROVED" } : x)) });
  },
  rejectRequest(id: number) { commit({ ...state, requests: state.requests.map((x) => (x.id === id ? { ...x, status: "REJECTED" } : x)) }); },
};

export function useAuth(): AuthState {
  return useSyncExternalStore(auth.subscribe, auth.snapshot, auth.serverSnapshot);
}
export function currentUser(s: AuthState): User | null {
  return s.currentEmail ? s.users.find((u) => u.email === s.currentEmail) ?? null : null;
}
