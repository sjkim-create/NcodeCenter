"use client";

// 확장 언어 슬롯 그룹 — 고객사에 속한 그룹 `PC-327` `PC-330`
// - **그룹 먼저(B안)**: 고객사 관리 ▸ 공통코드 · 확장 언어 에서 그룹을 켜고(코드 종류 · 필요 언어 수),
//   SOBP 맵 할당 창에서는 **영역(Owner)만** 할당한다 — 할당한 Owner 는 그룹에 「역할 미지정」으로 들어간다.
//   기본 · 확장 슬롯 역할과 언어는 고객사 관리에서만 정한다(고치는 곳 한 곳) `PC-335`
// - Owner 하나 = 언어 슬롯 4개. 기본 Owner 가 슬롯 1~4, 확장 Owner 는 연결한 순서대로 5~8 · 9~12 …
//   언어에는 정해진 순서가 없다 — 펌웨어팀과 정한 대로 슬롯마다 언어를 넣는다(빈 칸 허용).
// - 교재 등록(확장 언어 슬롯 고르기) · SOBP 맵 OWNER 카드 · 코드 관리 정보 「확장 언어 슬롯」 이 이 그룹을 읽는다.
import { useSyncExternalStore } from "react";
import { codeKind, type CodeKind } from "./codeKind";
import { langsOfOwner } from "./languageSlots";

export type LangGroup = {
  id: number;
  companyId: number; company: string;   // 그룹을 가진 고객사(고객사 관리)
  label: string;                        // 화면 표시 이름(= 고객사명)
  kind: CodeKind;                       // 코드 종류(PDS2 · PDS3) — 교재 등록에서 이 종류의 기본 코드일 때만 슬롯을 고른다
  section: number | null;               // 아직 할당 전이면 null — SOBP 할당 창에서 처음 연결한 Owner 의 Section 으로 정해진다 `PC-333`
  base: number | null;                  // 기본 Owner — 아직 할당 전이면 null(SOBP 할당 때 정한다)
  langCount: number;                    // 필요 언어 수 — 필요 확장 Owner 수 안내용
  ext: number[];                        // 확장 슬롯 Owner — 연결한 순서 = 슬롯 번호 순서
  pending?: number[];                   // 역할 미지정 — SOBP 맵에서 이 그룹 고객사에 할당했지만 기본/확장을 아직 안 정한 Owner `PC-335`
  langs: Record<string, string[]>;      // Owner → 슬롯 4칸 언어("" = 비어 있음)
};

const KEY = "ncc-lang-groups-v1";
const four = (a: string[] = []) => [0, 1, 2, 3].map((i) => a[i] ?? "");
const range = (a: number, b: number) => (a <= b ? Array.from({ length: b - a + 1 }, (_, i) => a + i) : Array.from({ length: a - b + 1 }, (_, i) => a - i));
// Common 언어 = db 빌드 원본(LANG_SLOTS → language-slots.json) — 처음 한 번 그룹 값으로 옮긴다
const commonLangs = (o: number) => four(langsOfOwner(o).sort((x, y) => x.slot - y.slot).map((x) => x.lang));

// 지금 운영 중인 두 그룹 — 첫 화면의 기본값(이후 고객사 관리에서 고친다)
const SEED: LangGroup[] = [
  { id: 1, companyId: 4, company: "Common-21", label: "Common-21", kind: "PDS2", section: 3, base: 21, langCount: 10,
    ext: range(964, 983), langs: { 21: commonLangs(21), 964: commonLangs(964), 965: commonLangs(965) } },
  { id: 2, companyId: 23, company: "Cake-1009", label: "Cake-1009", kind: "PDS3", section: 3, base: 1009, langCount: 8,
    ext: range(1003, 984), langs: { 1009: ["한국어", "영어", "일본어", "스페인어"], 1003: ["BTS", "중국어", "인도네시아어", "러시아어"] } },
];

let list: LangGroup[] = SEED;
let hydrated = false;
let version = 0;
const subs = new Set<() => void>();
const notify = () => { version++; subs.forEach((f) => f()); };
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* */ } };

export function hydrateLangGroups() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try { const raw = localStorage.getItem(KEY); if (raw) list = JSON.parse(raw) as LangGroup[]; } catch { /* 기본값 유지 */ }
  // 연결된 Owner 가 하나도 없는 그룹은 Section 미정 — 예전에 기본값(3)으로 채워 저장된 값을 비운다 `PC-333`
  list = list.map((g) => (g.base == null && g.ext.length === 0 && !(g.pending ?? []).length && g.section != null ? { ...g, section: null } : g));
  queueMicrotask(notify);   // 렌더 중에 처음 읽혀도 다른 컴포넌트를 그 자리에서 갱신하지 않게 — 알림은 렌더 뒤에
}
export const allLangGroups = () => { hydrateLangGroups(); return list; };
export const useLangGroups = () =>
  useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => version, () => 0);

export const groupOfCompany = (companyId: number) => allLangGroups().find((g) => g.companyId === companyId);
/** Owner 가 어느 그룹의 기본 / 확장 슬롯인지 — kind 를 주면 그 종류의 그룹만 */
export function groupOfOwner(section: number, owner: number, kind?: CodeKind): { g: LangGroup; role: "base" | "ext" | "pending" } | undefined {
  for (const g of allLangGroups()) {
    if (g.section !== section || (kind && kind !== g.kind)) continue;
    if (g.base === owner) return { g, role: "base" };
    if (g.ext.includes(owner)) return { g, role: "ext" };
    if ((g.pending ?? []).includes(owner)) return { g, role: "pending" };
  }
  return undefined;
}
/** 그룹에 든 Owner 전부 — 기본 · 확장 · 역할 미지정 */
export const groupOwners = (g: Pick<LangGroup, "base" | "ext" | "pending">) => [...(g.base != null ? [g.base] : []), ...g.ext, ...(g.pending ?? [])];
/** SOBP 할당 창 — 할당한 Owner 를 그룹에 「역할 미지정」으로 넣는다(역할은 고객사 관리에서) `PC-335` */
export function addPendingOwners(id: number, section: number, owners: number[]) {
  hydrateLangGroups();
  list = list.map((g) => {
    if (g.id !== id) return g;
    const have = new Set(groupOwners(g));
    const pending = [...(g.pending ?? [])];
    for (const o of owners) if (!have.has(o)) { pending.push(o); have.add(o); }
    return { ...g, section: g.section ?? section, pending };
  });
  persist(); notify();
}

/** 그룹 만들기 · 고치기 — 고객사 관리 */
export function saveLangGroup(g: Omit<LangGroup, "id" | "label"> & { id?: number }): LangGroup {
  hydrateLangGroups();
  const id = g.id ?? Math.max(0, ...list.map((x) => x.id)) + 1;
  const rec: LangGroup = settleLangs({ ...g, id, label: g.company });
  list = list.some((x) => x.id === id) ? list.map((x) => (x.id === id ? rec : x)) : [...list, rec];
  persist(); notify();
  return rec;
}
export function deleteLangGroup(id: number) {
  hydrateLangGroups();
  list = list.filter((x) => x.id !== id);
  persist(); notify();
}
/** SOBP 할당 창에서 Owner 를 그룹에 연결 — 기본 Owner 지정 · 확장 슬롯 덧붙이기(이미 있으면 그대로) */
export function linkGroupOwners(id: number, p: { section?: number; base?: number; ext?: number[] }) {
  hydrateLangGroups();
  list = list.map((g) => {
    if (g.id !== id) return g;
    const ext = [...g.ext];
    for (const o of p.ext ?? []) if (o !== (p.base ?? g.base) && !ext.includes(o)) ext.push(o);
    return settleLangs({ ...g, section: g.section ?? p.section ?? null, base: p.base ?? g.base, ext: ext.filter((o) => o !== (p.base ?? g.base)) });
  });
  persist(); notify();
}
/** 그룹의 언어 줄 — 필요한 Owner 수(기본 1 + 필요 확장)만큼, 아직 할당 전인 자리도 줄을 만든다 `PC-334`
 *  pos 0 = 기본 Owner, pos k = k번째 확장 Owner. 할당 전 자리의 언어는 `#pos` 키에 두었다가 Owner 가 연결되면 그 Owner 로 옮긴다. */
export type LangRow = { pos: number; owner: number | null; key: string; start: number };
export function langRows(g: Pick<LangGroup, "base" | "ext" | "langCount">): LangRow[] {
  const n = Math.max(needExtOwners(g.langCount), g.ext.length) + 1;
  return Array.from({ length: n }, (_, pos) => {
    const owner = pos === 0 ? g.base : g.ext[pos - 1] ?? null;
    return { pos, owner, key: owner != null ? String(owner) : `#${pos}`, start: pos * 4 + 1 };
  });
}
/** 할당 전 자리(#pos)에 넣어 둔 언어를 연결된 Owner 로 옮긴다(그 Owner 에 언어가 없을 때만) */
export function settleLangs<T extends Pick<LangGroup, "base" | "ext" | "langs">>(g: T): T {
  const langs = { ...g.langs };
  const owners = [g.base, ...g.ext];
  owners.forEach((o, pos) => {
    const tmp = langs[`#${pos}`];
    if (o == null || !tmp) return;
    if (!four(langs[o]).some((x) => x.trim())) langs[o] = four(tmp);
    delete langs[`#${pos}`];
  });
  return { ...g, langs };
}

/** 확장 슬롯 Owner 빼기(언어도 함께 지운다) */
export function unlinkGroupOwner(id: number, owner: number) {
  hydrateLangGroups();
  list = list.map((g) => {
    if (g.id !== id) return g;
    const langs = { ...g.langs }; delete langs[owner];
    return { ...g, ext: g.ext.filter((o) => o !== owner), langs };
  });
  persist(); notify();
}

/** 필요한 확장 Owner 수 — 기본 Owner 가 4개, 나머지를 4개씩 */
export const needExtOwners = (langCount: number) => Math.max(0, Math.ceil(Math.max(0, langCount) / 4) - 1);
/** Owner 의 슬롯 번호 시작값 — 기본 1, 확장은 연결 순서대로 5 · 9 · … */
export const slotStart = (g: LangGroup, owner: number) => {
  const pos = owner === g.base ? 0 : g.ext.indexOf(owner) + 1;
  return pos * 4 + 1;
};

/** 이 교재 코드가 확장 언어 슬롯을 쓸 수 있는 기본 코드인가 */
export const langGroupOf = (k: string, s: number, o: number): LangGroup | undefined =>
  allLangGroups().find((g) => g.section === s && g.base === o && codeKind(k, s) === g.kind);

/** Owner 의 슬롯 · 언어(언어가 있는 칸만) */
export const extSlotLangs = (g: LangGroup, owner: number): { slot: number; lang: string }[] => {
  const start = slotStart(g, owner);
  return four(g.langs[owner]).map((lang, i) => ({ slot: start + i, lang: lang.trim() })).filter((x) => x.lang);
};
/** 확장 Owner 의 언어 이름들 */
export const extLangs = (g: LangGroup, owner: number): string[] => extSlotLangs(g, owner).map((x) => x.lang);
/** 「5 베트남어 · 6 러시아어 …」 — 언어가 없으면 「지정된 언어 없음」 */
export const extLangText = (g: LangGroup, owner: number): string => {
  const l = extSlotLangs(g, owner);
  return l.length ? l.map((x) => `${x.slot} ${x.lang}`).join(" · ") : "지정된 언어 없음";
};
/** 슬롯 4칸(빈 칸 포함) */
export const ownerSlots = (g: LangGroup, owner: number) => {
  const start = slotStart(g, owner);
  return four(g.langs[owner]).map((lang, i) => ({ slot: start + i, lang }));
};

/** 교재에 붙는 확장 슬롯 기록 — 슬롯 Owner */
export type ExtSlot = { o: number };

/** 옛 방식으로 슬롯 Owner 를 따로 받은 고객사인가 — 할당받은 S/O 가 **모두** 다른 고객사 그룹의 확장 슬롯이면 그렇다 `PC-330`
 *  (예: 「Common 추가 언어 슬롯-964」 · 「Cake-1003」). 고객사 관리 목록에서는 숨기고, 그 Owner 는 그룹 고객사 아래에서 보인다.
 *  데이터(할당 · 편집 교재)는 그대로 둔다. */
export function isLangSlotCompany(co: { id: number }, projects: { companyId: number; keyCustomer?: string; issued: { section: number; owner: number }[] }[]): boolean {
  const mine = projects.filter((p) => !p.keyCustomer && p.companyId === co.id).flatMap((p) => p.issued);
  if (!mine.length) return false;
  return mine.every((b) => { const r = groupOfOwner(b.section, b.owner); return !!r && r.role === "ext" && r.g.companyId !== co.id; });
}
