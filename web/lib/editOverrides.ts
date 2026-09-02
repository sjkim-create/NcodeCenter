"use client";

// 편집 프로젝트에서 등록/변경한 Book 단위 값을 SOBP 맵이 읽도록 공유하는 경량 오버라이드 저장소.
// - 공유(커먼) 코드의 "사용 고객사(cu)" 등록 → SOBP 맵 해당 Book 에 고객사명·상태 반영
// - 키: `${k}/${s}/${o}/${b}` · 값: { cu, ea } (ea=1 편집 / 0 사용가능)

import { useSyncExternalStore } from "react";

const KEY = "ncc-book-ovr-v1";
export type BookOverride = { cu?: string; ea?: number };

let map: Record<string, BookOverride> = {};
let version = 0;
const subs = new Set<() => void>();
const notify = () => { version++; subs.forEach((f) => f()); };

export function hydrateOverrides() {
  try { map = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, BookOverride>; }
  catch { map = {}; }
  notify();
}

const ovrKey = (k: string, s: number, o: number, b: number) => `${k}/${s}/${o}/${b}`;

export function setBookOverride(k: string, s: number, o: number, b: number, v: BookOverride) {
  const key = ovrKey(k, s, o, b);
  const cur = map[key] ?? {};
  const next = { ...cur, ...v };
  if (!next.cu) { delete map[key]; }               // cu 비우면 제거(원본 데이터로 복귀)
  else map[key] = next;
  try { localStorage.setItem(KEY, JSON.stringify(map)); } catch { /* */ }
  notify();
}

// 편집 프로젝트에서 고객사를 지우면 그 고객사가 남긴 Book 오버라이드도 모두 지운다 `PC-075`
//   이 저장소를 hydrate 하지 않은 화면(편집 프로젝트)에서도 부르므로 **보관된 값**을 직접 읽고 쓴다.
//   (메모리 map 만 보면 비어 있어 아무것도 못 지우거나, 반대로 남의 오버라이드를 날릴 수 있다)
export function clearOverridesOfCustomer(cu: string) {
  let saved: Record<string, BookOverride> = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, BookOverride>; }
  catch { saved = {}; }
  const kept = Object.fromEntries(Object.entries(saved).filter(([, v]) => v.cu !== cu));
  if (Object.keys(kept).length === Object.keys(saved).length) return;   // 지울 것이 없으면 그대로 둔다
  try { localStorage.setItem(KEY, JSON.stringify(kept)); } catch { /* */ }
  map = kept;
  notify();
}

export const overrideOf = (k: string, s: number, o: number, b: number): BookOverride | undefined => map[ovrKey(k, s, o, b)];
export const overridesMap = () => map;

export const useBookOverrides = () =>
  useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => version, () => 0);
