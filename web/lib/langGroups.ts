"use client";

// 확장 언어 슬롯 그룹 `PC-327`
// - 기본 코드(Common S3/O21 · Cake S3/O1009) 교재를 등록할 때, 같은 Book 을 **확장 언어 슬롯 Owner** 에서도 쓰면
//   교재를 언어마다 따로 만들지 않고 **한 교재 안에서 슬롯을 체크**한다.
// - 슬롯은 Owner 만 기록한다. 언어별 심볼은 소리펜 심볼 입력의 Compound n언어 칸에 넣는다(슬롯 심볼 칸 · 슬롯별 ncp2 없음).
// - 슬롯 Owner · 언어 정리는 「확장 언어 슬롯」 화면(LangSlotView)과 같다.
import { codeKind, type CodeKind } from "./codeKind";
import { langsOfOwner } from "./languageSlots";

export type LangGroup = { key: "COMMON" | "CAKE"; label: string; kind: CodeKind; section: number; base: number; ext: number[] };

export const LANG_GROUPS: LangGroup[] = [
  // Common — PDS2(소리펜) · 기본 O21 · 확장 O964~983(작은 번호부터)
  { key: "COMMON", label: "Common", kind: "PDS2", section: 3, base: 21, ext: Array.from({ length: 983 - 964 + 1 }, (_, i) => 964 + i) },
  // Cake — PDS3 · 기본 O1009 · 확장 O1003~984(큰 번호부터)
  { key: "CAKE", label: "Cake", kind: "PDS3", section: 3, base: 1009, ext: Array.from({ length: 1003 - 984 + 1 }, (_, i) => 1003 - i) },
];

// Cake 확장 슬롯의 언어(정리된 것만) — LangSlotView 와 같은 값
const CAKE_LANGS: Record<number, string[]> = { 1003: ["BTS", "중국어", "인도네시아어", "러시아어"] };

/** 이 교재 코드가 확장 언어 슬롯을 쓸 수 있는 기본 코드인가 */
export const langGroupOf = (k: string, s: number, o: number): LangGroup | undefined =>
  LANG_GROUPS.find((g) => g.section === s && g.base === o && codeKind(k, s) === g.kind);

/** 확장 Owner 의 슬롯 · 언어 — 기본 Owner 가 슬롯 1~4, 확장 Owner 는 순서대로 4개씩(5~8, 9~12 …) `PC-327`
 *  Common = language-slots.json(빌드 원본 LANG_SLOTS) · Cake = 「확장 언어 슬롯」 화면 정리값. 언어가 없는 슬롯은 뺀다 */
export const extSlotLangs = (g: LangGroup, owner: number): { slot: number; lang: string }[] => {
  if (g.key === "COMMON") return langsOfOwner(owner).filter((x) => x.lang).map((x) => ({ slot: x.slot, lang: x.lang }));
  const start = 5 + g.ext.indexOf(owner) * 4;
  return (CAKE_LANGS[owner] ?? []).map((lang, i) => ({ slot: start + i, lang })).filter((x) => x.lang);
};
/** 확장 Owner 의 언어 이름들 */
export const extLangs = (g: LangGroup, owner: number): string[] => extSlotLangs(g, owner).map((x) => x.lang);
/** 「5 베트남어 · 6 러시아어 …」 — 언어가 없으면 「지정된 언어 없음」 */
export const extLangText = (g: LangGroup, owner: number): string => {
  const l = extSlotLangs(g, owner);
  return l.length ? l.map((x) => `${x.slot} ${x.lang}`).join(" · ") : "지정된 언어 없음";
};

/** 교재에 붙는 확장 슬롯 기록 — 슬롯 Owner */
export type ExtSlot = { o: number };
