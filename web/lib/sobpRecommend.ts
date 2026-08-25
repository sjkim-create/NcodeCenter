"use client";

// SOBP 자동 할당 추천
// 정책(2026-07-22 개발팀 회의):
//  - 입력 조건: 판형(길이) / 권당 페이지 수 / 권수
//  - 신규 고객: 오너 신규 발급 → 판형·페이지 수에 맞는 섹션 선택
//  - 기존 고객: 기존 오너·S 유지, 잔여분에서 할당
//  - 추천 범위는 "오너 단위"까지. (오너 내부에서 B를 잘게 쪼개 추천하지 않음 — 파편화 방지)
//  - PDS2(Gcode)의 S0·S14 는 테스트/개발 전용(상용 미출시) → 추천 제외 (직접 선택은 허용)
import { EDIT_BOOKS, projectBooks, rangesFor, ownersFor, usedBookMap, bookUsage, type BookRec } from "./codeUsage";
import type { Company, Project } from "./customerData";

export type Pds = "N" | "G";
export type SectionSpec = { owner: number; book: number; page: number; length: number }; // length = 판형 최대(mm)

export const SECTION_SPEC: Record<Pds, Record<number, SectionSpec>> = {
  N: {
    0: { owner: 1024, book: 16384, page: 4096, length: 600 },
    3: { owner: 1024, book: 8192, page: 512, length: 2000 },
    5: { owner: 256, book: 4096, page: 4096, length: 1200 },
    10: { owner: 1024, book: 4096, page: 1024, length: 2427 },
    11: { owner: 1024, book: 8192, page: 512, length: 2000 },
    14: { owner: 1024, book: 8192, page: 32, length: 9000 },
    15: { owner: 32768, book: 4096, page: 512, length: 608 },
  },
  G: {
    0: { owner: 524288, book: 8192, page: 1024, length: 600 },
    3: { owner: 4096, book: 4096, page: 4096, length: 1500 },
    14: { owner: 4096, book: 4096, page: 1024, length: 9000 },
  },
};

// 추천 제외 섹션 — 테스트/개발 전용(상용 미출시). 직접 선택에서는 사용 가능.
export const RECOMMEND_EXCLUDE: Record<Pds, number[]> = { N: [], G: [0, 14] };
export const isExcluded = (pds: Pds, sec: number) => RECOMMEND_EXCLUDE[pds].includes(sec);

// 판형(용지) — 값은 "가장 긴 변(mm)" 기준
export const PAPER_SIZES: { label: string; mm: number }[] = [
  { label: "A5 (148×210)", mm: 210 },
  { label: "B5 (182×257)", mm: 257 },
  { label: "16절 (197×272)", mm: 272 },
  { label: "A4 (210×297)", mm: 297 },
  { label: "B4 (257×364)", mm: 364 },
  { label: "8절 (272×394)", mm: 394 },
  { label: "A3 (297×420)", mm: 420 },
  { label: "4절 (394×545)", mm: 545 },
  { label: "A2 (420×594)", mm: 594 },
  { label: "A1 (594×841)", mm: 841 },
  { label: "A0 (841×1189)", mm: 1189 },
];

// 해당 PDS에서 추천 가능한 섹션들의 최대 판형(mm) — 직접 입력 상한
export const maxRecommendLength = (pds: Pds): number =>
  Math.max(...Object.keys(SECTION_SPEC[pds]).map(Number).filter((s) => !isExcluded(pds, s)).map((s) => SECTION_SPEC[pds][s].length));

export type Pen = "소리펜" | "필기펜";
export type IssueMode = "코드발급" | "편집";
export type RecoInput = {
  pds?: Pds;             // 미지정이면 PDS 타입까지 추천
  pen: Pen;              // 용도(펜 종류)
  mode?: IssueMode;      // 발급 유형 — 편집이면 소리펜이어도 PDS3
  lengthMm: number;      // 판형(길이)
  pagesPerBook: number;  // 권당 페이지 수
  books: number;         // 권수
  company: string;       // 고객사명 (기존/신규 판단)
};
export type Reco = {
  ok: boolean;
  reason: string;
  pds: Pds;
  section: number;
  owner: number;
  bookStart: number;
  bookEnd: number;
  pageVolume: number;
  isNewOwner: boolean;
  spec: SectionSpec;
  alternatives: { section: number; length: number; page: number }[];
};

const norm = (x: string) => x.replace(/\s+/g, "").replace(/\(.*\)/g, "").toLowerCase();

export function recommendSobp(input: RecoInput, companies: Company[], projects: Project[]): Reco | { ok: false; reason: string } {
  const { pen, lengthMm, pagesPerBook, books, company } = input;
  const mode: IssueMode = input.mode ?? "코드발급";
  if (!company.trim()) return { ok: false, reason: "고객사를 먼저 선택하세요." };
  if (lengthMm <= 0 || pagesPerBook <= 0 || books <= 0) return { ok: false, reason: "판형·페이지 수·권수를 입력하세요." };

  const alloc = projectBooks(projects, companies);
  // 프로젝트 발급 범위 전체(확장 한계 없이) — 이미 할당된 구간을 절대 추천하지 않도록
  const pRanges = projects.flatMap((p) => p.issued
    .filter((b) => b.bookEnd >= b.bookStart)
    .map((b) => ({ k: (b.kind ?? "N") as Pds, sec: b.section, owner: b.owner, start: b.bookStart, end: b.bookEnd })));
  const all = [...EDIT_BOOKS, ...alloc];
  const mine = all.filter((r) => norm(r.cust) === norm(company));

  // PDS 선호: 필기펜 → PDS3 / 소리펜 → PDS2. 단 발급 유형이 "편집"이면 소리펜이어도 PDS3.
  const preferN = pen === "필기펜" || mode === "편집";
  const pdsList: Pds[] = input.pds ? [input.pds] : (preferN ? ["N", "G"] : ["G", "N"]);

  type Cand = { pds: Pds; sec: number; spec: SectionSpec; reuse?: { owner: number } };
  const cands: Cand[] = [];
  for (const pds of pdsList) {
    const specs = SECTION_SPEC[pds];
    for (const sec of Object.keys(specs).map(Number)) {
      if (isExcluded(pds, sec)) continue;                       // 테스트/개발 전용 제외
      const sp = specs[sec];
      if (sp.length < lengthMm || sp.page < pagesPerBook) continue;   // 판형·페이지 수용 불가
      const hit = mine.find((r) => r.k === pds && r.sec === sec);
      cands.push({ pds, sec, spec: sp, reuse: hit ? { owner: hit.owner } : undefined });
    }
  }
  if (cands.length === 0) {
    return { ok: false, reason: `판형 ${lengthMm}mm · ${pagesPerBook}p 를 수용하는 섹션이 없습니다. (조건을 낮추거나 직접 선택을 사용하세요)` };
  }

  // 정렬: ① 기존 S/O 재사용 ② 선호 PDS(펜 종류·발급 유형 기준) ③ 낭비 최소(판형→페이지)
  const pdsRank = (k: Pds) => (preferN ? (k === "N" ? 0 : 1) : (k === "G" ? 0 : 1));
  cands.sort((a, b) =>
    pdsRank(a.pds) - pdsRank(b.pds) ||
    (a.reuse ? 0 : 1) - (b.reuse ? 0 : 1) ||
    a.spec.length - b.spec.length ||
    a.spec.page - b.spec.page);

  const alt = cands.slice(1, 5).map((c) => ({ section: c.sec, length: c.spec.length, page: c.spec.page }));

  for (const c of cands) {
    const owner = c.reuse ? c.reuse.owner : firstFreeOwner(c.pds, c.sec, c.spec.owner, alloc);
    if (owner < 0) continue;
    const start = findFreeBookRun(c.pds, c.sec, owner, books, c.spec.book, alloc, pRanges);
    if (start < 0) continue;
    const label = c.pds === "N" ? "PDS3(Ncode)" : "PDS2(Gcode)";
    return {
      ok: true, pds: c.pds, section: c.sec, owner,
      bookStart: start, bookEnd: start + books - 1,
      pageVolume: Math.min(c.spec.page, pagesPerBook),
      isNewOwner: !c.reuse, spec: c.spec, alternatives: alt,
      reason: c.reuse
        ? `기존 고객 — ${label} S${c.sec}/O${owner} 를 유지하고 잔여 구간에서 할당합니다. (${pen})`
        : `신규 — ${pen}/${mode} 기준 ${label} 선호. 판형 ${lengthMm}mm·${pagesPerBook}p 를 수용하는 S${c.sec}(최대 ${c.spec.length}mm/${c.spec.page}p)에 신규 오너 O${owner} 발급.`,
    };
  }
  return { ok: false, reason: `조건을 만족하는 여유 오너/연속 ${books}권 구간을 찾지 못했습니다.` };
}

// 해당 섹션에서 아직 아무도 쓰지 않는 첫 오너
function firstFreeOwner(pds: Pds, sec: number, maxOwner: number, extra: BookRec[]): number {
  const used = new Set<number>();
  ownersFor(pds, sec).forEach((o) => used.add(o.owner));
  [...EDIT_BOOKS, ...extra].forEach((r) => { if (r.k === pds && r.sec === sec) used.add(r.owner); });
  for (let o = 1; o < Math.min(maxOwner, 100000); o++) if (!used.has(o)) return o;
  return -1;
}

// 연속으로 비어 있는 Book 구간의 시작점
function findFreeBookRun(pds: Pds, sec: number, owner: number, need: number, maxBook: number,
                        extra: BookRec[], pRanges: { k: Pds; sec: number; owner: number; start: number; end: number }[] = []): number {
  const used = usedBookMap(pds, sec, owner, extra);
  const ranges = rangesFor(pds, sec, owner);
  const mine = pRanges.filter((r) => r.k === pds && r.sec === sec && r.owner === owner);
  const taken = (b: number) => !!bookUsage(b, used, ranges) || mine.some((r) => b >= r.start && b <= r.end);
  let run = 0;
  const limit = Math.min(maxBook, 20000);
  for (let b = 0; b < limit; b++) {
    if (taken(b)) run = 0;
    else if (++run >= need) return b - need + 1;
  }
  return -1;
}
