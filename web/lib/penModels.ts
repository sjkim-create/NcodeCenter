"use client";

// 펜 모델 목록 — **한 곳에서 공용으로 관리한다** `PC-101`
//
// 교재(책) 등록·수정에서 각자 로컬에 쌓던 것을 `PC-100` 거둬들이고,
// [코드 관리 정보 ▸ 펜 모델] 한 화면에서 보고 고치도록 모았다.
// 다른 참조 목록(`sharedOwners`·`commonMembers`)과 같은 얼개다 — **정본 + 추가분**.
//
//   · 정본(BUILT_IN) : 코드에 박아 둔 기본 모델. 배포하면 모두가 같은 값을 본다.
//   · 추가분          : 화면에서 늘린 모델. 이 브라우저에 남는다.
//
// ⚠ 서버 저장소가 없어 **추가분은 브라우저 단위**다. 팀 전체에 퍼뜨리려면
//   [코드 관리 정보 ▸ 펜 모델] 에서 확인하고 정본(BUILT_IN)에 반영해 배포한다.

import { useSyncExternalStore } from "react";

// 정본 — 기본 16종
export const BUILT_IN_PEN_MODELS = [
  "C30(PO)", "C71(BH)", "C71(BH2)", "C71(BH5)", "C71(BH6)",
  "C90", "C91", "C133", "C160", "C161", "C190", "C192", "C200",
  "C1000(PO)", "NSP-C1000-PO", "연구수업용",
];

const KEY = "ncc-pen-models-v1";

let extra: string[] = [];
let version = 0;
let hydrated = false;
const subs = new Set<() => void>();
const notify = () => { version++; subs.forEach((f) => f()); };

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try { extra = JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]; }
  catch { extra = []; }
  notify();
}
const persist = () => {
  try { localStorage.setItem(KEY, JSON.stringify(extra)); } catch { /* */ }
};

/** 정본 + 추가분 — 화면에 보여 줄 전체 목록 (정본이 앞) */
export const penModels = (): string[] =>
  [...BUILT_IN_PEN_MODELS, ...extra.filter((x) => !BUILT_IN_PEN_MODELS.includes(x))];

/** 이 브라우저에서 늘린 모델만 */
export const penModelsExtra = (): string[] => [...extra];

export const isBuiltInPen = (v: string) => BUILT_IN_PEN_MODELS.includes(v);

/** 목록에 없으면 추가한다. 이미 있으면 아무 일도 하지 않는다. */
export function addPenModel(name: string): { ok: boolean; msg: string } {
  const v = name.trim();
  if (!v) return { ok: false, msg: "모델명을 입력하세요." };
  if (penModels().includes(v)) return { ok: false, msg: "이미 있는 모델입니다." };
  extra = [...extra, v];
  persist(); notify();
  return { ok: true, msg: `${v} 추가됨` };
}

/** 추가분만 지울 수 있다 — 정본은 코드에서 관리한다. */
export function removePenModel(name: string): { ok: boolean; msg: string } {
  if (isBuiltInPen(name)) return { ok: false, msg: "기본 모델은 지울 수 없습니다." };
  extra = extra.filter((x) => x !== name);
  persist(); notify();
  return { ok: true, msg: `${name} 삭제됨` };
}

/** 목록이 바뀌면 다시 그린다 */
export const usePenModels = () => {
  useSyncExternalStore(
    (f) => { subs.add(f); hydrate(); return () => { subs.delete(f); }; },
    () => version,
    () => 0,
  );
  return penModels();
};
