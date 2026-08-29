"use client";

// 코드 종류 — SOBP 좌표의 속성 (단일 소스)
//
// 개념: **좌표(SOBP)가 먼저**다. Section·Owner·Book·Page 로 코드를 지정하고,
//       그 좌표가 어떤 코드 체계인지(PDS2 / PDS3 / PDS4 / OID)를 속성으로 갖는다.
//       좌표가 유일하므로 "코드 중복"은 성립하지 않고, 좌표마다 종류만 구분하면 된다.
//
// - PDS3 (Ncode) : 현행 N코드                         · 데이터 k="N"
// - PDS2 (Gcode) : 이전 세대 G코드                     · 데이터 k="G"
// - PDS4 (S-code): **Section 44** 로 발급된 좌표        · 섹션으로 판별(데이터 k 무관)
// - OID          : **index 만 갖는 코드** — 외부 코드를 우리 펜으로 읽으려고 만든 방식. 데이터 k="O" · **k="A"(옛 IDS 표기)도 같은 것**.
//                  펜으로 찍으면 코드 값이 1개만 나오고, 총량이 약 6만 개뿐이라 분량이 적으면 book 으로 나누지 않는다.
//                  좌표(SOBP) 지도·목록에서 **OID 로 필터**해 보고, 업체별 index 목록은 코드 관리 정보의 OID 관리대장에서 본다.
//                  ※ **IDS = OID 동일 용어** — 따로 구분하지 않는다 `PC-035`.
//
// 펜 구분(소리펜 NSP / 필기펜 NWP)도 좌표 속성이다. 데이터 pen="S"|"W".

export type CodeKind = "PDS3" | "PDS2" | "PDS4" | "OID";
export type PenKind = "NSP" | "NWP";

// PDS4(S-code) 로 취급하는 섹션 — 현재는 Section 44
export const PDS4_SECTIONS = [44];
export const isPds4Section = (section: number) => PDS4_SECTIONS.includes(section);

type KindMeta = { v: CodeKind; label: string; short: string; desc: string; color: string; bg: string };
// 코드 종류 4종 — 지도·목록의 필터 축 `PC-035`
// 표시 순서 — 코드 필터 라벨 순서와 같다 (전체 · PDS2 · PDS3 · PDS4 · OID) `PC-039`
export const CODE_KINDS: KindMeta[] = [
  { v: "PDS2", label: "PDS2 (Gcode)", short: "PDS2", desc: "이전 세대 G코드", color: "#d97706", bg: "#fef3c7" },
  { v: "PDS3", label: "PDS3 (Ncode)", short: "PDS3", desc: "현행 N코드", color: "#2563eb", bg: "#eef6ff" },
  { v: "PDS4", label: "PDS4 (S-code)", short: "PDS4", desc: `S-code · Section ${PDS4_SECTIONS.join("·")}`, color: "#7c3aed", bg: "#f3e8ff" },
  { v: "OID", label: "OID", short: "OID", desc: "index 전용 · 외부 코드 판독용 (옛 IDS 표기 포함)", color: "#0f766e", bg: "#ccfbf1" },
];
const ALL_KIND_META: KindMeta[] = CODE_KINDS;
export const kindMeta = (k: CodeKind) => ALL_KIND_META.find((x) => x.v === k) ?? CODE_KINDS[0];
export const kindLabel = (k: CodeKind) => kindMeta(k).short;

// 데이터 k(N/G/A/O) + 섹션 → 코드 종류. 섹션이 PDS4 구간이면 섹션이 우선한다.
export function codeKind(k: string | undefined, section: number): CodeKind {
  // OID = 옛 IDS(A코드)와 같은 것 — 동일하게 OID 로 본다 `PC-035`
  if (k === "O" || k === "A") return "OID";
  if (isPds4Section(section)) return "PDS4";
  return k === "G" ? "PDS2" : "PDS3";
}

// 종류 → 데이터 k 후보 (필터용). PDS4 는 섹션으로 판별하므로 k 로 좁히지 않는다.
export const kindMatches = (kind: CodeKind, k: string | undefined, section: number) => codeKind(k, section) === kind;

export const PEN_KINDS: { v: PenKind; label: string; data: "S" | "W" }[] = [
  { v: "NSP", label: "소리펜", data: "S" },
  { v: "NWP", label: "필기펜", data: "W" },
];
export const penKind = (pen?: string): PenKind | undefined => (pen === "S" ? "NSP" : pen === "W" ? "NWP" : undefined);
export const penLabel = (pen?: string) => (pen === "S" ? "소리펜" : pen === "W" ? "필기펜" : "");

// OID 는 같은 S/O 를 다른 종류와 공유한다(index 부여) — 종류 배타(무겹침) 검사에서만 제외한다.
export const isOid = (kind: CodeKind) => kind === "OID";
export const sharesOwnerSpace = (kind: CodeKind) => kind === "OID";

// 티켓(N Key) PatternType — 티켓 파라미터의 코드 패턴 값.
//   PDS4(S-code)·OID 의 정확한 파라미터 표기는 개발팀 확인 필요(현재는 패턴명 그대로).
export type TicketPattern = "PDS3" | "PDS2" | "Scode" | "OID";
export const patternOf = (kind: CodeKind): TicketPattern =>
  kind === "PDS4" ? "Scode" : kind === "OID" ? "OID" : kind === "PDS2" ? "PDS2" : "PDS3";
export const patternTypeParam = (p: TicketPattern) =>
  p === "PDS3" ? "Ncode_PDS3" : p === "PDS2" ? "Ncode_PDS2" : p;
