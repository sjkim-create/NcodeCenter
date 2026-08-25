// 언어 슬롯 매핑 (PDS2 · Section 3 공유코드)
// - 원본은 db/import/build_all_sources.py 의 LANG_SLOTS (등록 UI 없이 거기서 직접 관리)
// - 빌드가 web/data/language-slots.json 으로 생성 → 여기서 읽어 조회만 한다.
// COMMON-21(기본 언어) + 확장 언어 슬롯(964~983). 언어 확장 시 빌드 상수에 한 줄 추가 후 재빌드.

import data from "@/data/language-slots.json";

export type LangSlot = { owner: number; slot: number; lang: string; base: boolean };

export const LANG_PDS: string = data.pds;            // "G" = PDS2(소리펜)
export const LANG_SECTION: number = data.section;    // 3
export const LANG_BASE_OWNER: number = data.baseOwner; // 21
export const LANG_SLOTS = data.slots as LangSlot[];

// 이 owner가 다루는 언어들 (예: 964 → 베트남어·러시아어·몽골어·크메르어)
export const langsOfOwner = (owner: number): LangSlot[] =>
  LANG_SLOTS.filter((s) => s.owner === owner);

// 슬롯 번호 → 언어명 / owner
export const langOfSlot = (slot: number): string | undefined =>
  LANG_SLOTS.find((s) => s.slot === slot)?.lang;
export const ownerOfSlot = (slot: number): number | undefined =>
  LANG_SLOTS.find((s) => s.slot === slot)?.owner;

// 이 owner가 언어 슬롯 공유코드인가 / 기본 언어(21) owner 인가
export const isLangOwner = (owner: number): boolean =>
  LANG_SLOTS.some((s) => s.owner === owner);
export const isBaseLangOwner = (owner: number): boolean => owner === LANG_BASE_OWNER;

// owner 별 언어 라벨 (예: "베트남어·러시아어·몽골어·캄보디아어(크메르어)")
export const langLabelOfOwner = (owner: number): string =>
  langsOfOwner(owner).map((s) => s.lang).join("·");
