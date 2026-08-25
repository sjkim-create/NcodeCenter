"use client";

// 고객사/프로젝트/업무로그 단일 공유 스토어
// - 두 화면(고객사·프로젝트)이 같은 데이터를 공유(추가/수정/삭제 즉시 반영)
// - localStorage 지속 → 새로고침/페이지 이동해도 유지 (테스트 편의)
// - 시드: 엑셀(ownership-data) 파생 seed-customers.json

import { useSyncExternalStore } from "react";
import seed from "@/data/seed-customers.json";
import type { Company, Project, WorkLog, WorkKind } from "./customerData";

export type State = { companies: Company[]; projects: Project[]; logs: WorkLog[] };

const KEY = "ncc-store-v25";  // v25: 하위(공통코드 사용) 고객사도 정식 회사 레코드로 생성(214건) — 옛 캐시 폐기
const SEED = seed as unknown as State;

let state: State = SEED;
let hydrated = false;
const subs = new Set<() => void>();

// 고객사·프로젝트는 절대 잃으면 안 되는 핵심 데이터 → 저장 실패 시 큰 캐시를 비우고 재시도
let lastPersistError = "";
export const persistError = () => lastPersistError;
function persist() {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify(state);
  try {
    localStorage.setItem(KEY, payload);
    lastPersistError = "";
  } catch {
    // 용량 초과(QuotaExceeded) 추정 → 편집 상세 캐시(ncc-edit*) 등 재생성 가능한 데이터를 비우고 재시도
    try {
      const drop: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k !== KEY && (k.startsWith("ncc-edit") || k.startsWith("ncc-activity"))) drop.push(k);
      }
      drop.forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(KEY, payload);
      lastPersistError = "";
    } catch {
      lastPersistError = "브라우저 저장 공간이 가득 차 변경을 저장하지 못했습니다. 다른 탭/사이트 데이터를 정리하거나 편집 화면 캐시를 초기화하세요.";
    }
  }
}
function commit(next: State) { state = next; persist(); subs.forEach((f) => f()); }

// 최초 클라이언트 구독 시 localStorage 로드 (SSR/첫 렌더는 SEED → hydration 일치)
function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { state = JSON.parse(raw); subs.forEach((f) => f()); }
  } catch { /* ignore */ }
}

let seq = 100000;
const nid = () => ++seq;

export const store = {
  subscribe(cb: () => void) { subs.add(cb); hydrate(); return () => { subs.delete(cb); }; },
  snapshot() { return state; },
  serverSnapshot() { return SEED; },

  reset() { commit(JSON.parse(JSON.stringify(SEED))); },

  // ── 고객사 ──
  upsertCompany(c: Company): number {
    if (c.id) { commit({ ...state, companies: state.companies.map((x) => (x.id === c.id ? c : x)) }); return c.id; }
    const id = Math.max(0, ...state.companies.map((x) => x.id)) + 1;
    commit({ ...state, companies: [{ ...c, id }, ...state.companies] });
    return id;
  },
  deleteCompany(id: number) {
    commit({
      ...state,
      companies: state.companies.filter((x) => x.id !== id),
      projects: state.projects.filter((p) => p.companyId !== id),
      logs: state.logs.filter((l) => l.companyId !== id),
    });
  },

  // ── 프로젝트 ──
  upsertProject(p: Project): number {
    if (p.id) { commit({ ...state, projects: state.projects.map((x) => (x.id === p.id ? p : x)) }); return p.id; }
    const id = Math.max(0, ...state.projects.map((x) => x.id)) + 1;
    commit({ ...state, projects: [{ ...p, id }, ...state.projects] });
    return id;
  },
  deleteProject(id: number) {
    commit({
      ...state,
      projects: state.projects.filter((x) => x.id !== id),
      logs: state.logs.filter((l) => l.projectId !== id),
    });
  },

  // ── 업무 로그 (단일 원장) ──
  addLog(companyId: number, projectId: number | null, kind: WorkKind, content: string, author = "김직원", authorEmail = "") {
    const no = Math.max(0, ...state.logs.filter((l) => l.companyId === companyId).map((l) => l.no)) + 1;
    const log: WorkLog = { id: nid(), no, companyId, projectId, date: new Date().toISOString().slice(0, 10), kind, content, author, authorEmail };
    commit({ ...state, logs: [log, ...state.logs] });
  },
  // 수정 시 날짜를 수정일로 갱신 (작성자는 유지)
  updateLog(id: number, patch: Partial<Pick<WorkLog, "kind" | "content" | "projectId">>) {
    const date = new Date().toISOString().slice(0, 10);
    commit({ ...state, logs: state.logs.map((l) => (l.id === id ? { ...l, ...patch, date, edited: true } : l)) });
  },
  deleteLog(id: number) { commit({ ...state, logs: state.logs.filter((l) => l.id !== id) }); },
};

export function useStore(): State {
  return useSyncExternalStore(store.subscribe, store.snapshot, store.serverSnapshot);
}
