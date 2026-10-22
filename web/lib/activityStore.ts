"use client";

// 활동 로그 — 실제 사용자 행동을 기록(로컬 스토어). 일자·월별 집계로 조회.
import { useSyncExternalStore } from "react";

// 활동 종류 = 지금 메뉴 기준 8종 `PC-248`
//   정산은 세 티켓(App Key · N Key · 서비스 티켓) 공통이라 따로 둔다 — 재무 확인 때 한 번에 거른다
export type ActivityType =
  | "company"     // 고객사 — 멤버 관리 ▸ 고객사 관리 (등록 · 수정 · 사업 종료 · 온보딩 · 서비스 계정)
  | "alloc"       // 코드 할당 — 코드 ▸ SOBP 맵 (할당 · 해제)
  | "edit"        // 편집 — 서비스 관리 ▸ CasterN 편집 (편집 고객사 추가 · 삭제 · 교재 추가 · 작업 · 삭제)
  | "appkey"      // App Key — 티켓 발급 ▸ App Key 관리 (계정 · 키 · 권한 · 티켓 발급 · 수정)
  | "nkey"        // N Key — 티켓 발급 ▸ N Key 관리 (발급 · 수정 · 키 다운로드)
  | "svcTicket"   // 서비스 티켓 — 고객사 관리 ▸ 서비스 티켓 (지정 · 수정)
  | "billing"     // 정산 — 세 티켓 정산 · 연간 라이선스 비용
  | "access";     // 접속 — 로그인 · 로그아웃

export type Activity = { id: number; type: ActivityType; actor: string; detail: string; at: string }; // at = ISO datetime

// 색은 NEO UI 테마 팔레트(light-theme.ts) `PC-242` `PC-248`
export const TYPE_META: Record<ActivityType, { label: string; color: string }> = {
  company: { label: "고객사", color: "#5F8FF0" },
  alloc: { label: "코드 할당", color: "#3A66C8" },
  edit: { label: "편집", color: "#3D96CE" },
  appkey: { label: "App Key", color: "#7BCDF1" },
  nkey: { label: "N Key", color: "#6FB152" },
  svcTicket: { label: "서비스 티켓", color: "#8EC674" },
  billing: { label: "정산", color: "#E09A2E" },
  access: { label: "접속", color: "#9CA3AF" },
};

// 옛 종류 → 새 종류 — 남아 있는 기록(7일)을 옮긴다 `PC-248`
//   옛 「티켓 발급」은 문구 앞머리로 가른다: 정산 → 정산 · 서비스 티켓 → 서비스 티켓 · N Key 가 들어가면 N Key · 그 밖(App Key · 계정 · 티켓 · 권한)은 App Key
function migrateType(a: { type: string; detail: string }): ActivityType {
  switch (a.type) {
    case "company": case "alloc": case "edit": case "appkey": case "nkey": case "svcTicket": case "billing": case "access":
      return a.type;
    case "project": return "alloc";
    case "bookAdd": case "bookEdit": return "edit";
    case "login": case "logout": return "access";
    case "ticket": {
      const d = a.detail;
      if (/^(서비스 티켓 정산|App Key 정산|정산 등록)/.test(d)) return "billing";
      if (/^서비스 티켓/.test(d)) return "svcTicket";
      if (/N Key/.test(d)) return "nkey";
      return "appkey";
    }
    default: return "company";
  }
}

const KEY = "ncc-activity-v3";       // v3: 한국시간(KST) 저장 · 보관 한 달 `PC-252`
const KST_OFFSET_MS = 9 * 3600 * 1000;
const RETAIN_DAYS = 31;              // 보관 한 달 — 그보다 오래된 기록은 지운다 `PC-251` `PC-252`

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
    if (raw) { list = prune((JSON.parse(raw) as Activity[]).map((x) => ({ ...x, type: migrateType(x) }))); seq = Math.max(0, ...list.map((a) => a.id)) + 1; persist(); subs.forEach((f) => f()); }
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
