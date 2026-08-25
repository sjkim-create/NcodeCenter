"use client";

// 활동 로그 — 실제 사용자 행동을 기록(로컬 스토어). 일자·월별 집계로 조회.
import { useSyncExternalStore } from "react";

export type ActivityType =
  | "company"     // 고객사 관리 (수정/등록)
  | "alloc"       // 코드 할당(등록) — SOBP 맵
  | "project"     // 프로젝트 등록 — 코드 프로젝트
  | "ticket"      // 티켓 발급
  | "bookAdd"     // 교재 추가 — 편집 프로젝트
  | "bookEdit"    // 교재 작업 — 교재 수정
  | "login"       // 로그인
  | "logout";     // 로그아웃

export type Activity = { id: number; type: ActivityType; actor: string; detail: string; at: string }; // at = ISO datetime

export const TYPE_META: Record<ActivityType, { label: string; color: string }> = {
  company: { label: "고객사 관리", color: "#5f8ff0" },
  alloc: { label: "코드 할당(등록)", color: "#9b87d9" },
  project: { label: "프로젝트 등록", color: "#14b8a6" },
  ticket: { label: "티켓 발급", color: "#8ec674" },
  bookAdd: { label: "교재 추가", color: "#f0a94a" },
  bookEdit: { label: "교재 작업", color: "#d69a4a" },
  login: { label: "로그인", color: "#6b7280" },
  logout: { label: "로그아웃", color: "#9ca3af" },
};

const KEY = "ncc-activity-v3";       // v3: 초기화(기존 기록 삭제) · 한국시간(KST) 저장 + 7일 보관
const KST_OFFSET_MS = 9 * 3600 * 1000;
const RETAIN_DAYS = 7;               // 테스트: 최근 7일만 기록 유지

// 한국시간(KST) 벽시계 문자열 "YYYY-MM-DDTHH:mm:ss" — 실행 환경 TZ와 무관하게 UTC+9로 고정
function kstNow(): string { return new Date(Date.now() + KST_OFFSET_MS).toISOString().slice(0, 19); }
function kstCutoff(): string { return new Date(Date.now() + KST_OFFSET_MS - RETAIN_DAYS * 86400000).toISOString().slice(0, 19); }
function prune(l: Activity[]): Activity[] { const c = kstCutoff(); return l.filter((a) => a.at.slice(0, 19) >= c); }

let list: Activity[] = [];
let hydrated = false;
const subs = new Set<() => void>();
let seq = 1;

function persist() { if (typeof window !== "undefined") { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* */ } } }
function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { list = prune(JSON.parse(raw)); seq = Math.max(0, ...list.map((a) => a.id)) + 1; persist(); subs.forEach((f) => f()); }
  } catch { /* */ }
}

// 실제 시각(KST) 기록. (SSR/빌드 시엔 호출되지 않음 — 사용자 액션 시점에만 호출)
export function logActivity(type: ActivityType, detail: string, actor = "") {
  if (typeof window === "undefined") return;
  hydrate();
  const who = actor || currentActor();
  list = prune([{ id: seq++, type, actor: who, detail, at: kstNow() }, ...list]).slice(0, 5000);
  persist();
  subs.forEach((f) => f());
}

// 로그인 사용자 이름(있으면). authStore를 직접 참조하지 않도록 setter로 주입.
let _actor = "";
export function setActivityActor(name: string) { _actor = name || ""; }
function currentActor() { return _actor || "알 수 없음"; }

export const activityStore = {
  subscribe(cb: () => void) { subs.add(cb); hydrate(); return () => { subs.delete(cb); }; },
  snapshot() { return list; },
  serverSnapshot() { return EMPTY; },
  clear() { list = []; persist(); subs.forEach((f) => f()); },
};
const EMPTY: Activity[] = [];

export function useActivities(): Activity[] {
  return useSyncExternalStore(activityStore.subscribe, activityStore.snapshot, activityStore.serverSnapshot);
}
