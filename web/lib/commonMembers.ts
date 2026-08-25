"use client";

// ── 공통코드 사용 고객사(하위 고객사) 중앙 멤버십 ──────────────────────────
// 코드별(k:s:o) 사용 고객사 목록. 두 소스를 합친다:
//   ① 히스토리 시드 = 빌드가 엑셀 cu 에서 생성한 common-members.json (읽기 전용)
//   ② 사용자 등록 = 고객사 등록 시 추가 (localStorage, 코드별 이름 목록)
// 모든 화면(고객사 관리·편집 프로젝트·티켓·검색)이 이 단일 소스를 참조한다.

import { useSyncExternalStore } from "react";
import seed from "@/data/common-members.json";
import { codeKey } from "./commonCodes";

type MemberMap = Record<string, string[]>;   // "k:s:o" → [고객사명]
const SEED = seed as MemberMap;
const KEY = "ncc-common-members-v1";

let added: MemberMap = {};       // 사용자 등록분 (localStorage)
let version = 0;
const subs = new Set<() => void>();
const notify = () => { version++; subs.forEach((f) => f()); };
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(added)); } catch { /* */ } };

export function hydrateMembers() {
  try { added = JSON.parse(localStorage.getItem(KEY) ?? "{}") as MemberMap; }
  catch { added = {}; }
  notify();
}

const nz = (s: string) => s.replace(/\s+/g, "").toLowerCase();

// 코드(k,s,o)의 사용 고객사 — 히스토리 시드 + 사용자 등록 (중복 제거·정렬)
export function membersOf(k: string, s: number, o: number): { name: string; seeded: boolean }[] {
  const ck = codeKey({ k, s, o });
  const seedList = SEED[ck] ?? [];
  const addList = added[ck] ?? [];
  const seen = new Set<string>();
  const out: { name: string; seeded: boolean }[] = [];
  for (const n of seedList) { if (!seen.has(nz(n))) { seen.add(nz(n)); out.push({ name: n, seeded: true }); } }
  for (const n of addList) { if (!seen.has(nz(n))) { seen.add(nz(n)); out.push({ name: n, seeded: false }); } }
  return out.sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

// 이 고객사가 등록/사용 중인 공통코드 key 들
export function codesOfMember(name: string): string[] {
  const n = nz(name);
  const keys = new Set<string>();
  for (const [ck, list] of Object.entries(SEED)) if (list.some((x) => nz(x) === n)) keys.add(ck);
  for (const [ck, list] of Object.entries(added)) if (list.some((x) => nz(x) === n)) keys.add(ck);
  return [...keys];
}

export function addMember(k: string, s: number, o: number, name: string) {
  const ck = codeKey({ k, s, o }); const nm = name.trim();
  if (!nm) return;
  const list = added[ck] ?? [];
  if (!list.some((x) => nz(x) === nz(nm)) && !(SEED[ck] ?? []).some((x) => nz(x) === nz(nm))) {
    added = { ...added, [ck]: [...list, nm] };
    persist(); notify();
  }
}
export function removeMember(k: string, s: number, o: number, name: string) {
  const ck = codeKey({ k, s, o });
  if (!added[ck]) return;   // 히스토리 시드는 삭제 불가(이력 보존)
  added = { ...added, [ck]: added[ck].filter((x) => nz(x) !== nz(name)) };
  persist(); notify();
}

export const useCommonMembers = () =>
  useSyncExternalStore(
    (f) => { subs.add(f); return () => { subs.delete(f); }; },
    () => version,
    () => 0,
  );
