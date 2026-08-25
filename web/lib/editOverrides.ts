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

export const overrideOf = (k: string, s: number, o: number, b: number): BookOverride | undefined => map[ovrKey(k, s, o, b)];
export const overridesMap = () => map;

export const useBookOverrides = () =>
  useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => version, () => 0);
