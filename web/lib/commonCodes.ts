// ── 공통(커먼) 코드 레지스트리 — 단일 정본 ──────────────────────────────
// 코드 식별 = (타입 k, section s, owner o). 대표 회사(holder company)가 이 코드를 보유하고,
// 사용 고객사(cu)는 lib/commonMembers 의 중앙 멤버십으로 관리한다.
// db/import/build_all_sources.py 의 COMMON_CODES 와 (k,s,o) 가 일치해야 한다.

export type CodeType = "N" | "G" | "A";   // N=PDS3(Ncode) · G=PDS2(Gcode) · A=IDS(초창기, 이력전용)

export type CommonCode = {
  k: CodeType; s: number; o: number;   // 코드 정본
  name: string;      // 화면 표시명 (대표회사-코드)
  holder: string;    // 대표 브랜드 (그룹핑)
  company: string;   // 이 코드를 보유한 고객사(대장) 이름 — 티켓/검색 진입점
  label: string;     // PDS·S/O 라벨
  historyOnly?: boolean;   // A(IDS) 등 이력전용 — 코드 할당·편집 등록 없이 검색/이력만
};

export const COMMON_CODES: CommonCode[] = [
  { k: "G", s: 3, o: 21,   name: "Common-21",              holder: "Common",       company: "Common-21",              label: "PDS2 · S3/O21" },
  { k: "N", s: 0, o: 27,   name: "네오노트-0-27",            holder: "네오노트",     company: "네오노트-0-27",            label: "PDS3 · S0/O27" },
  { k: "N", s: 3, o: 27,   name: "네오노트-3-27",            holder: "네오노트",     company: "네오노트-3-27",            label: "PDS3 · S3/O27" },
  { k: "N", s: 3, o: 1012, name: "네오노트-1012",            holder: "네오노트",     company: "네오노트-1012",            label: "PDS3 · S3/O1012" },
  { k: "N", s: 3, o: 1013, name: "스마트클래스키트-1013",     holder: "스마트클래스키트", company: "스마트클래스키트-1013",     label: "PDS3 · S3/O1013" },
  { k: "N", s: 3, o: 940,  name: "NLJ NTT-940",            holder: "NLJ NTT",      company: "NLJ NTT-940",            label: "PDS3 · S3/O940" },
  { k: "N", s: 14, o: 303, name: "딥스원테크-303",           holder: "딥스원테크",   company: "딥스원테크-303",           label: "PDS3 · S14/O303" },
  { k: "G", s: 3, o: 37,   name: "구몬D-37",                holder: "구몬D",        company: "구몬D-37",                label: "PDS2 · S3/O37" },
  { k: "G", s: 3, o: 964,  name: "Common 추가 언어 슬롯-964", holder: "Common",       company: "Common 추가 언어 슬롯-964", label: "PDS2 · S3/O964" },
  { k: "A", s: 4, o: 27,   name: "네오노트-IDS-27",          holder: "네오노트",     company: "네오노트-IDS-27",          label: "IDS · S4/O27", historyOnly: true },
];

export const codeKey = (c: { k: string; s: number; o: number }) => `${c.k}:${c.s}:${c.o}`;

export const commonCodeOf = (k: string, s: number, o: number): CommonCode | undefined =>
  COMMON_CODES.find((c) => c.k === k && c.s === s && c.o === o);

// 이 고객사(대장 회사)가 보유한 공통코드들 — 티켓/검색 진입점
export const codesOfCompany = (companyName: string): CommonCode[] =>
  COMMON_CODES.filter((c) => c.company === companyName);

export const isCommonCodeCompany = (companyName: string): boolean =>
  COMMON_CODES.some((c) => c.company === companyName);
