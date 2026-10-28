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

// 패턴·섹션별 Page 가용 범위 / Book 정원 (코드 관리 정보 기준) — N Key·App Key 발급과 티켓 고객사 범위가 함께 쓴다
export const PAGE_CAP: Partial<Record<TicketPattern, Record<number, number>>> = {
  PDS3: { 0: 4096, 3: 512, 5: 4096, 10: 1024, 11: 512, 14: 32, 15: 512 },
  PDS2: { 0: 1024, 3: 4096, 14: 1024 },
  Scode: { 44: 256 },          // PDS4 (S-code) — Section 44
  OID: { 3: 4096 },            // OID — 인덱스 전용(같은 S/O 공유, B/P로 구분)
};
export const BOOK_CAP: Partial<Record<TicketPattern, Record<number, number>>> = {
  PDS3: { 0: 16384, 3: 8192, 5: 4096, 10: 4096, 11: 8192, 14: 8192, 15: 4096 },
  PDS2: { 0: 8192, 3: 4096, 14: 4096 },
  Scode: { 44: 256 },
  OID: { 3: 8192 },
};
export const OWNER_CAP: Partial<Record<TicketPattern, Record<number, number>>> = {
  PDS3: { 0: 1024, 3: 1024, 5: 256, 10: 1024, 11: 1024, 14: 1024, 15: 32768 },
  PDS2: { 0: 524288, 3: 4096, 14: 4096 },
  Scode: { 44: 4096 },
  OID: { 3: 4096 },
};

// SOBP 할당 범위 — 할당 때는 코드 타입을 정하지 않는다(PDS2·PDS3 태그 없음) `PC-279`
//   그 S/O 를 쓸 수 있는 코드 타입 중 **넓은 쪽**으로 Book · Page 를 미리 잡아 둔다.
//   예) S3 O2000 = PDS2 만(PDS3 Owner 는 0~1023) → PDS2 범위 · S3 O5 = Book 은 PDS3(8192) · Page 는 PDS2(4096)
//   OID 는 index 부여라 할당 범위 계산에서 뺀다.
export function allocSpan(section: number, owner: number): { bookEnd: number; pageEnd: number } | null {
  const fit = (["PDS2", "PDS3", "Scode"] as TicketPattern[]).filter((pt) => (OWNER_CAP[pt]?.[section] ?? 0) > owner);
  if (!fit.length) return null;
  return {
    bookEnd: Math.max(...fit.map((pt) => BOOK_CAP[pt]?.[section] ?? 0)) - 1,
    pageEnd: Math.max(...fit.map((pt) => PAGE_CAP[pt]?.[section] ?? 0)) - 1,
  };
}

// 이 S/O 에서 쓸 수 있는 코드 타입 — Book 마다 다른 타입을 쓸 수 있다(B1 PDS2 · B2 PDS3) `PC-281`
export const kindsFor = (section: number, owner: number): CodeKind[] =>
  (["PDS3", "PDS2", "PDS4"] as CodeKind[]).filter((k) => (OWNER_CAP[patternOf(k)]?.[section] ?? 0) > owner);

// 발급(편집 · 키 발급)에서 코드 타입을 정하면 그 타입의 범위를 넘을 수 없다 `PC-279` — 넘으면 안내 문구, 안 넘으면 ""
export function codeTypeRangeErr(kind: CodeKind, c: { section: number; owner: number; bookStart: number; bookEnd: number; pageStart?: number; pageEnd?: number }): string {
  const pt = patternOf(kind);
  const o = OWNER_CAP[pt]?.[c.section], b = BOOK_CAP[pt]?.[c.section], p = PAGE_CAP[pt]?.[c.section];
  if (o == null || b == null || p == null) return `S${c.section} 은 ${kind} 코드 타입이 없습니다.`;
  if (c.owner >= o) return `${kind} 의 S${c.section} Owner 는 0~${o - 1} 입니다. O${c.owner} 는 ${kind} 로 쓸 수 없습니다.`;
  if (c.bookEnd >= b) return `${kind} 의 S${c.section} Book 은 0~${b - 1} 입니다. (지금 B${c.bookStart}~B${c.bookEnd})`;
  if (c.pageEnd != null && c.pageEnd >= p) return `${kind} 의 S${c.section} Page 는 0~${p - 1} 입니다. (지금 P${c.pageStart ?? 0}~P${c.pageEnd})`;
  return "";
}
