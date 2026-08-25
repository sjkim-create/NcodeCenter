"use client";

// 공유 OWNER 원장
//
// 원칙은 "1 OWNER = 1 고객사(전용)" 이지만, 특수하게 여러 고객사가 한 OWNER를 함께 쓰는 코드가 있다.
// 코드 할당 시 [공유 OWNER]를 체크하면 그 S/O가 여기에 기록되고, 이후
//  · 다른 고객사에도 같은 S/O로 발급할 수 있다 (Book 번호만 배타)
//  · SOBP 맵에서 "공유" 로 필터·표시된다
//
// 내장 목록(BUILT_IN)은 기존에 확인된 레퍼런스 코드이며 해제할 수 없다.

import { useSyncExternalStore } from "react";

const KEY = "ncc-shared-so-v1";

export type SharedRec = { k: string; sec: number; owner: number; note?: string; by?: string; date?: string };

// ── 커먼 코드(Common Code) ─────────────────────────────
// 여러 고객사가 함께 쓰는 확정 공유 코드. 고객사 관리에서 NSP/NWP 커먼 코드를 체크한 업체만
// 편집 프로젝트의 "사용 고객사" 후보로 올라온다.
export type CommonGroup = "NSP" | "NWP";
export const COMMON_LABEL: Record<CommonGroup, string> = {
  NSP: "PDS2(NSP-소리펜)",
  NWP: "PDS3(NWP-필기펜)",
};
export const COMMON_PEN: Record<CommonGroup, string> = { NSP: "소리펜", NWP: "필기펜" };

// k = 이 커먼 코드가 속한 PDS: "N"=PDS3(Ncode·NWP·필기펜), "G"=PDS2(Gcode·NSP·소리펜)
// 범위(from~to)는 사이 값까지 모두 공유 코드로 취급한다 (예: O964~983, O984~1003).
export const BUILT_IN: { k: "N" | "G"; sec: number; from: number; to: number; pen: string; note: string; group: CommonGroup }[] = [
  // ── PDS3 (Ncode · NWP · 필기펜) ──
  { group: "NWP", k: "N", sec: 0, from: 27, to: 27, pen: "필기펜", note: "NWP 커먼 코드 · 기본 공유 PUI" },
  { group: "NWP", k: "N", sec: 3, from: 27, to: 27, pen: "필기펜", note: "NWP 커먼 코드 · 기본 공유 PUI" },
  { group: "NWP", k: "N", sec: 3, from: 1012, to: 1012, pen: "필기펜", note: "NWP 커먼 코드 · 기타 PUI" },
  // ── PDS2 (Gcode · NSP · 소리펜) ──
  { group: "NSP", k: "G", sec: 3, from: 21, to: 21, pen: "소리펜", note: "NSP 커먼 코드 · 레퍼런스 (팝펜 호환 가능)" },
  { group: "NSP", k: "G", sec: 3, from: 964, to: 983, pen: "소리펜", note: "NSP 커먼 코드 · 레퍼런스 (다국어 편집용)" },
];
// k 를 넘기면 해당 PDS의 커먼 코드만 매칭 (안 넘기면 PDS 무관 — 고객사 커먼 코드 표기용)
export const builtInShared = (sec: number, owner: number, k?: string) =>
  BUILT_IN.find((r) => r.sec === sec && owner >= r.from && owner <= r.to && (k == null || r.k === k)) ?? null;

// 이 S/O가 어느 커먼 코드 그룹인지 (아니면 null)
export const commonGroupOf = (sec: number, owner: number): CommonGroup | null =>
  builtInShared(sec, owner)?.group ?? null;

// 커먼 코드 그룹별 S/O 표기 — 화면 안내용(텍스트)
export const commonRangesText = (g: CommonGroup) =>
  BUILT_IN.filter((r) => r.group === g)
    .map((r) => `S${r.sec}/O${r.from === r.to ? r.from : `${r.from}~${r.to}`}`)
    .join(" · ");

// 커먼 코드 그룹별 S/O 범위 — 칩 렌더용(구조화)
export const commonRanges = (g: CommonGroup): { sec: number; owner: string }[] =>
  BUILT_IN.filter((r) => r.group === g)
    .map((r) => ({ sec: r.sec, owner: r.from === r.to ? String(r.from) : `${r.from}~${r.to}` }));

// ── 사용자가 지정한 공유 OWNER ─────────────────────────
let custom: SharedRec[] = [];      // 마운트 후 hydrate() 로 채운다 (SSR/하이드레이션 불일치 방지)
let version = 0;
const subs = new Set<() => void>();
const notify = () => { version++; subs.forEach((f) => f()); };

const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(custom)); } catch { /* */ } };

export function hydrateShared() {
  try { custom = JSON.parse(localStorage.getItem(KEY) ?? "[]") as SharedRec[]; }
  catch { custom = []; }
  notify();
}

export const customShared = () => custom;
export const isCustomShared = (k: string, sec: number, owner: number) =>
  custom.some((r) => r.k === k && r.sec === sec && r.owner === owner);

export function markShared(r: SharedRec) {
  if (isCustomShared(r.k, r.sec, r.owner)) return;
  custom = [...custom, r];
  persist(); notify();
}
export function unmarkShared(k: string, sec: number, owner: number) {
  custom = custom.filter((r) => !(r.k === k && r.sec === sec && r.owner === owner));
  persist(); notify();
}

// 내장 + 사용자 지정 통합 판정
export function sharedOf(k: string, sec: number, owner: number): { note: string; pen?: string; custom: boolean; group?: CommonGroup } | null {
  const b = builtInShared(sec, owner, k);
  if (b) return { note: b.note, pen: b.pen, custom: false, group: b.group };
  const c = custom.find((r) => r.k === k && r.sec === sec && r.owner === owner);
  return c ? { note: c.note || "코드 할당 시 공유로 지정", custom: true } : null;
}

// 변경 시 리렌더 (컴포넌트에서 사용)
export const useSharedOwners = () =>
  useSyncExternalStore(
    (f) => { subs.add(f); return () => { subs.delete(f); }; },
    () => version,
    () => 0
  );
