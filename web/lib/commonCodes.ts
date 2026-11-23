import { useSyncExternalStore } from "react";
// ── 공통(커먼) 코드 레지스트리 — 단일 정본 ──────────────────────────────
// 코드 식별 = (타입 k, section s, owner o). 대표 회사(holder company)가 이 코드를 보유하고,
// 사용 고객사(cu)는 lib/commonMembers 의 중앙 멤버십으로 관리한다.
// db/import/build_all_sources.py 의 COMMON_CODES 와 (k,s,o) 가 일치해야 한다.

export type CodeType = "N" | "G" | "A";   // N=PDS3(Ncode) · G=PDS2(Gcode) · A=OID(옛 IDS 표기 — OID 와 같은 것, PC-035)

export type CommonCode = {
  k: CodeType; s: number; o: number;   // 코드 정본
  name: string;      // 화면 표시명 (대표회사-코드)
  holder: string;    // 대표 브랜드 (그룹핑)
  company: string;   // 이 코드를 보유한 고객사(대장) 이름 — 티켓/검색 진입점
  label: string;     // PDS·S/O 라벨
  historyOnly?: boolean;   // A(옛 IDS = OID) 등 이력전용 — 코드 할당·편집 등록 없이 검색/이력만
};

// 등록 기준 `PC-044` — **여러 고객사가 함께 쓰는 코드**만 공통코드다.
//   보유 고객사 1곳뿐(자기 자신·자사)이거나 사용 고객사 이력이 아예 없으면 일반 코드로 둔다.
//   ※ 이력전용 OID(A4/O27) 만 사용 고객사 0곳이어도 유지한다(검색·이력용).
//   ※ Common 추가 언어 슬롯(G3/O964) 는 **제외** `PC-082` — 사용 고객사가 0곳이고, 다국어 편집용
//      레퍼런스라 하위 고객사를 두지 않는다. 공유 OWNER 판정은 `sharedOwners.ts` 가 그대로 맡는다.
export const COMMON_CODES: CommonCode[] = [
  { k: "G", s: 3, o: 21,   name: "Common-21",              holder: "Common",       company: "Common-21",              label: "PDS2 · S3/O21" },
  { k: "N", s: 0, o: 27,   name: "네오노트-0-27",            holder: "네오노트",     company: "네오노트-0-27",            label: "PDS3 · S0/O27" },
  { k: "N", s: 3, o: 27,   name: "네오노트-3-27",            holder: "네오노트",     company: "네오노트-3-27",            label: "PDS3 · S3/O27" },
  { k: "N", s: 3, o: 1012, name: "네오노트-1012",            holder: "네오노트",     company: "네오노트-1012",            label: "PDS3 · S3/O1012" },
  { k: "N", s: 3, o: 1013, name: "스마트클래스키트-1013",     holder: "스마트클래스키트", company: "스마트클래스키트-1013",     label: "PDS3 · S3/O1013" },
  { k: "A", s: 4, o: 27,   name: "네오노트-IDS-27",          holder: "네오노트",     company: "네오노트-IDS-27",          label: "OID · S4/O27", historyOnly: true },
];

export const codeKey = (c: { k: string; s: number; o: number }) => `${c.k}:${c.s}:${c.o}`;

export const commonCodeOf = (k: string, s: number, o: number): CommonCode | undefined =>
  COMMON_CODES.find((c) => c.k === k && c.s === s && c.o === o);

// 이 고객사(대장 회사)가 보유한 공통코드들 — 티켓/검색 진입점
export const codesOfCompany = (companyName: string): CommonCode[] =>
  COMMON_CODES.filter((c) => c.company === companyName);

export const isCommonCodeCompany = (companyName: string): boolean =>
  COMMON_CODES.some((c) => c.company === companyName);

// ── 화면에서 지정한 공통코드(상위 고객사) `PC-330` ─────────────────────────
// 고객사 관리 ▸ 공통코드 · 확장 언어 에서 그 고객사가 할당받은 S/O 를 [공통코드로 지정] 하면 여기 들어간다.
// 위 COMMON_CODES(기본 등록분)에 덧붙여 모든 화면(하위 등록 목록 · 키 발급 · SOBP 맵 …)이 같은 목록을 본다.
// 기본 등록분은 화면에서 지우지 않는다 — 지정 해제는 화면에서 지정한 것만.
const CUSTOM_KEY = "ncc-common-codes-custom-v1";
let custom: CommonCode[] = [];
let ccHydrated = false;
let ccVersion = 0;
const ccSubs = new Set<() => void>();
const ccNotify = () => { ccVersion++; ccSubs.forEach((f) => f()); };
const ccPersist = () => { try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom)); } catch { /* */ } };

export function hydrateCommonCodes() {
  if (ccHydrated || typeof window === "undefined") return;
  ccHydrated = true;
  try { custom = JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? "[]") as CommonCode[]; } catch { custom = []; }
  for (const c of custom) if (!COMMON_CODES.some((x) => codeKey(x) === codeKey(c))) COMMON_CODES.push(c);
  ccNotify();
}
export const useCommonCodes = () =>
  useSyncExternalStore((f) => { ccSubs.add(f); return () => { ccSubs.delete(f); }; }, () => ccVersion, () => 0);
/** 화면에서 지정한 공통코드인가(지정 해제 가능) */
export const isCustomCommonCode = (c: { k: string; s: number; o: number }) => custom.some((x) => codeKey(x) === codeKey(c));

/** 고객사의 S/O 를 공통코드로 지정 — k = N(PDS3) · G(PDS2) */
export function addCommonCode(company: string, k: "N" | "G", s: number, o: number): CommonCode | null {
  hydrateCommonCodes();
  if (COMMON_CODES.some((x) => x.k === k && x.s === s && x.o === o)) return null;
  const label = `${k === "G" ? "PDS2" : "PDS3"} · S${s}/O${o}`;
  const mine = COMMON_CODES.filter((x) => x.company === company).length;
  const rec: CommonCode = { k, s, o, name: mine ? `${company} · S${s}/O${o}` : company, holder: company, company, label };
  custom = [...custom, rec];
  COMMON_CODES.push(rec);
  ccPersist(); ccNotify();
  return rec;
}
/** 「고객사-owner」 표기 — 이름이 이미 「-{owner}」 로 끝나면 그대로(예: Common-21 · 네오노트-0-27) `PC-362` */
export const withOwner = (name: string, o?: number | string | null) => {
  const ow = String(o ?? "").trim();
  return !ow || name.endsWith(`-${ow}`) ? name : `${name}-${ow}`;
};
/** 화면에서 지정한 공통코드 해제 */
export function removeCommonCode(k: string, s: number, o: number) {
  hydrateCommonCodes();
  const key = codeKey({ k, s, o });
  if (!custom.some((x) => codeKey(x) === key)) return;
  custom = custom.filter((x) => codeKey(x) !== key);
  const i = COMMON_CODES.findIndex((x) => codeKey(x) === key);
  if (i >= 0) COMMON_CODES.splice(i, 1);
  ccPersist(); ccNotify();
}
