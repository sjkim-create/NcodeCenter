"use client";

// 코드 사용 현황 단일 소스
// - 경량 코드 데이터(code-usage.json): 교재(책) 단위 = 편집/코드발급 (지도·목록용, 번들 최소화)
// - 소유권 데이터(ownership-data.json): owner·book 범위 단위 = 이미 발급(할당)된 코드
//   (원장의 코드는 모두 '할당됨' — 예약/사용중 구분 없음, PC-004)
// - 코드 프로젝트(store.projects): 화면에서 신규 할당한 코드
// 세 소스를 합쳐 "이 Book을 쓸 수 있는가"를 판단한다.
//
// 상태는 코드발급 / 편집 / 미사용 3가지. "공유"는 상태가 아니라 OWNER에 붙는 속성(lib/sharedOwners.ts).

import compact from "@/data/code-usage.json";
import ownership from "@/data/ownership-data.json";
import type { Project, Company } from "./customerData";
import { sharedOf, BUILT_IN, builtInShared } from "./sharedOwners";

// 사용가능 = 공유(커먼) 코드에서 편집하지 않고 코드만 잡아 둔 상태 (예: 레퍼런스 스콜라스틱)
export type CodeStatus = "편집" | "코드발급" | "사용가능" | "미사용";
export type Usage = { status: CodeStatus; cust: string; title?: string; cu?: string };

type CRow = { k: string; s: number; o: number; b: number; p: number; sp?: number; c: string; t: string; e: number; cu?: string; ea?: number };
const ROWS = compact as unknown as CRow[];

// 편집 여부 = "편집현황" 파일에 실린 교재(e=1). 소리펜/필기펜 목록은 코드 할당 자료.
export const isEditedRow = (r: CRow) => r.e === 1;

type ORec = { account: string; owner: number; product: string; book_start: number | null; book_end: number | null };
type OSec = { section: number; records: ORec[] };
const OD = (ownership as unknown as { sections: OSec[] }).sections;

export type BookRec = { k: string; sec: number; owner: number; book: number; pg: number; sp: number; cust: string; title: string; status: CodeStatus; cu?: string; ea?: number; fromProject?: boolean };

// 공유(커먼) 코드의 상태 판정: 실제 편집(ea=1)이면 편집, 아니면 사용가능(코드만 할당).
//   레퍼런스 시트의 '편집' O/X 기준. 편집현황 파일의 중복행(cu·ea 없음)은 코드만 할당으로 취급해 편집을 강제하지 않는다.
const bookStatus = (r: CRow): CodeStatus => {
  if (builtInShared(r.s, r.o, r.k)) return r.ea === 1 ? "편집" : "사용가능";
  return r.e === 1 ? "편집" : "코드발급";
};

// 모든 교재(책) — 경량 데이터에서 생성. cu = 공유(커먼) 코드에서 실제 사용 고객사
export const EDIT_BOOKS: BookRec[] = ROWS.map((r) => ({
  k: r.k, sec: r.s, owner: r.o, book: r.b, pg: r.p, sp: r.sp ?? 0,
  cust: r.c, title: r.t, status: bookStatus(r), cu: r.cu, ea: r.ea,
}));

// 소유권 데이터의 owner·book 범위 (다른 곳에서 이미 쓰는 코드)
export type Range = { k: string[]; sec: number; owner: number; start: number; end: number; account: string; status: CodeStatus };
const kindsOf = (product: string) => (product === "PDS3" ? ["N"] : product === "PDS2" ? ["G"] : ["N", "G"]);

export const RANGES: Range[] = OD.flatMap((s) =>
  s.records.filter((r) => r.book_start != null).map((r) => ({
    k: kindsOf(r.product), sec: s.section, owner: r.owner,
    start: r.book_start as number, end: (r.book_end ?? r.book_start) as number,
    account: r.account, status: "코드발급" as CodeStatus,   // 원장의 코드 = 모두 할당됨(발급)
  }))
);
export const rangesFor = (k: string, sec: number, owner: number) =>
  RANGES.filter((r) => r.k.includes(k) && r.sec === sec && r.owner === owner);

// 소유권 데이터가 아는 owner (book 범위가 없어도 owner 자체는 점유 상태)
export type OwnerRec = { owner: number; account: string; status: CodeStatus };
export const ownersFor = (k: string, sec: number): OwnerRec[] =>
  OD.filter((s) => s.section === sec).flatMap((s) =>
    s.records.filter((r) => kindsOf(r.product).includes(k)).map((r) => ({
      owner: r.owner, account: r.account, status: "코드발급" as CodeStatus,
    }))
  );

// 코드 프로젝트(스토어)에서 할당한 코드
export function projectBooks(projects: Project[], companies: Company[]): BookRec[] {
  const out: BookRec[] = [];
  for (const p of projects) {
    const cust = companies.find((c) => c.id === p.companyId)?.name ?? "-";
    const status: CodeStatus = p.editing || (p.symbols ?? 0) > 0 ? "편집" : "코드발급";
    for (const b of p.issued) {
      const span = Math.min(500, Math.max(1, b.bookEnd - b.bookStart + 1));
      for (let i = 0; i < span; i++) {
        out.push({ k: b.kind ?? "N", sec: b.section, owner: b.owner, book: b.bookStart + i,
                   pg: Math.max(1, Math.round(b.codes / span)), sp: b.pageStart || 0, cust, title: p.name, status, fromProject: true });
      }
    }
  }
  return out;
}

// 특정 S/O에서 이미 쓰이는 Book → 사용 정보
export function usedBookMap(k: string, sec: number, owner: number, extra: BookRec[] = []): Map<number, Usage> {
  const m = new Map<number, Usage>();
  const put = (b: number, u: Usage) => {
    const cur = m.get(b);
    if (!cur) { m.set(b, u); return; }
    // 상태는 높은 우선순위 유지, cu(공유 고객사)·title 은 어느 레코드든 값이 있으면 보존
    const cu = u.cu ?? cur.cu;
    const title = u.title || cur.title;
    m.set(b, rank(u.status) > rank(cur.status) ? { ...u, cu, title } : { ...cur, cu, title });
  };
  for (const r of [...EDIT_BOOKS, ...extra]) {
    if (r.k === k && r.sec === sec && r.owner === owner) put(r.book, { status: r.status, cust: r.cust, title: r.title, cu: r.cu });
  }
  return m;
}
const rank = (s: CodeStatus) => (s === "편집" ? 3 : s === "코드발급" ? 2 : s === "사용가능" ? 1 : 0);

// 사용 중인지 (개별 Book + 소유권 범위)
export function bookUsage(b: number, used: Map<number, Usage>, ranges: ReturnType<typeof rangesFor>): Usage | null {
  const u = used.get(b);
  if (u) return u;
  const r = ranges.find((x) => b >= x.start && b <= x.end);
  return r ? { status: r.status, cust: r.account } : null;
}

// 사용 가능한(비어 있는) Book 번호 — 다른 곳에서 쓰는 코드는 제외
export function freeBookNumbers(k: string, sec: number, owner: number, max: number, limit = 300, keep?: number, extra: BookRec[] = []): number[] {
  const used = usedBookMap(k, sec, owner, extra);
  const ranges = rangesFor(k, sec, owner);
  const out: number[] = [];
  for (let b = 0; b < max && out.length < limit; b++) {
    if (b === keep) { out.push(b); continue; }
    if (!bookUsage(b, used, ranges)) out.push(b);
  }
  if (keep != null && !out.includes(keep)) out.unshift(keep);
  return out;
}

// 공유(커먼) 코드의 실제 사용 고객사(cu) 목록 — 티켓 발급의 '사용 고객사' 후보.
export function sharedCustomers(k: string, sec: number, owner: number): string[] {
  const set = new Set<string>();
  for (const r of EDIT_BOOKS) {
    if (r.k === k && r.sec === sec && r.owner === owner && r.cu) set.add(r.cu);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "ko"));
}

// ── 단일 판정: 이 Book이 '편집됨'인가 ──────────────────────────────
//   실제 편집(교재명 · 편집 레코드 · 오버라이드 ea=1)만 '편집'으로 본다.
//   광역 코드발급 프로젝트(fromProject)가 범위로 덮은 것은 편집이 아니다 → '사용가능'.
//   SOBP 맵 Book 상태 · 편집 프로젝트 '교재 추가'가 이 함수를 함께 써서 물려있는 메뉴가 어긋나지 않게 한다.
export function isBookEdited(recs: BookRec[] | undefined, overrideEa?: number): boolean {
  if (overrideEa === 1) return true;
  return !!recs?.some((r) => !r.fromProject && (r.status === "편집" || (r.title || "").trim() !== ""));
}

// 특정 S/O의 Book별 레코드 목록 (EDIT_BOOKS + extra=코드 프로젝트)
export function bookRecordsOf(k: string, sec: number, owner: number, extra: BookRec[] = []): Map<number, BookRec[]> {
  const m = new Map<number, BookRec[]>();
  for (const r of [...EDIT_BOOKS, ...extra]) {
    if (r.k === k && r.sec === sec && r.owner === owner) {
      const arr = m.get(r.book);
      if (arr) arr.push(r); else m.set(r.book, [r]);
    }
  }
  return m;
}

// 편집 프로젝트 '교재 추가'용 — 편집 안 된(=사용 가능) Book 번호.
//   발급된 SO 아래의 Book 은 편집되기 전까지 모두 '사용 가능'(isBookEdited 로 SOBP 맵과 동일 판정).
export function editableBookNumbers(k: string, sec: number, owner: number, max: number, limit = 300, keep?: number, extra: BookRec[] = []): number[] {
  const byBook = bookRecordsOf(k, sec, owner, extra);
  const out: number[] = [];
  for (let b = 0; b < max && out.length < limit; b++) {
    if (b === keep) { out.push(b); continue; }
    if (isBookEdited(byBook.get(b))) continue;   // 실제 편집된 코드만 제외
    out.push(b);                                   // 편집 안 됨 = 사용 가능
  }
  if (keep != null && !out.includes(keep)) out.unshift(keep);
  return out;
}

// 고객사별 편집(심볼·편집방식·ncp2 중 하나라도 있는) 교재 수 — 화면 간 편집 판정 통일
const normName = (x: string) => x.replace(/\s+/g, "").replace(/\(.*\)/g, "").toLowerCase();
const EDITED_BY_NAME = EDIT_BOOKS.reduce<Record<string, number>>((m, r) => {
  if (r.status === "편집") m[normName(r.cust)] = (m[normName(r.cust)] ?? 0) + 1;
  return m;
}, {});
export const editedBooksOf = (company: string) => EDITED_BY_NAME[normName(company)] ?? 0;

// ── 공유 OWNER ─────────────────────────────────────────
// 원칙은 1 OWNER = 1 고객사(전용). 공유로 지정된 OWNER만 여러 업체가 함께 사용 가능(Book 단위로만 배타).
// 내장 목록 + 코드 할당 시 [공유 OWNER] 체크로 지정한 값 → lib/sharedOwners.ts
export const SHARED_SO = BUILT_IN;
export const sharedInfo = (sec: number, owner: number, k = "N") => sharedOf(k, sec, owner);
export const isSharedSO = (sec: number, owner: number, k = "N") => !!sharedOf(k, sec, owner);

// 이 S/O를 이미 점유한 업체들 (편집 데이터 + 소유권 데이터 + 코드 프로젝트)
export function ownerHolders(k: string, sec: number, owner: number, extra: BookRec[] = []): string[] {
  const set = new Set<string>();
  for (const r of [...EDIT_BOOKS, ...extra]) if (r.k === k && r.sec === sec && r.owner === owner && r.cust) set.add(r.cust);
  for (const s of OD) if (s.section === sec) for (const r of s.records) {
    if (r.owner === owner && kindsOf(r.product).includes(k) && r.account) set.add(r.account.replace(/\(.*\)/g, "").trim());
  }
  return [...set];
}

// 코드 할당 가능 여부 — 충돌 차단의 단일 판정 지점
// asShared = 이번 할당에서 [공유 OWNER]를 체크한 경우 → 전용 충돌 검사를 건너뛴다 (Book 충돌은 그대로 검사)
export function canAllocate(
  k: string, sec: number, owner: number, company: string,
  books: { start: number; end: number }, extra: BookRec[] = [], asShared = false
): { ok: boolean; reason: string; holders: string[]; shared: boolean; conflicts: number[] } {
  const holders = ownerHolders(k, sec, owner, extra);
  const shared = isSharedSO(sec, owner, k) || asShared;
  const norm = (x: string) => x.replace(/\s+/g, "").replace(/\(.*\)/g, "").toLowerCase();
  const others = holders.filter((h) => norm(h) !== norm(company));

  // Book 충돌 (공유 코드도 Book은 배타)
  const used = usedBookMap(k, sec, owner, extra);
  const ranges = rangesFor(k, sec, owner);
  const conflicts: number[] = [];
  for (let b = books.start; b <= books.end && conflicts.length < 20; b++) if (bookUsage(b, used, ranges)) conflicts.push(b);

  if (!shared && others.length) {
    return { ok: false, shared, holders, conflicts, reason: `S${sec}/O${owner} 는 이미 ${others.join(", ")} 에 할당된 전용 코드입니다. 공유 OWNER로 지정하거나 다른 S/O를 사용하세요.` };
  }
  if (conflicts.length) {
    return { ok: false, shared, holders, conflicts, reason: `이미 사용 중인 Book: ${conflicts.slice(0, 10).join(", ")}${conflicts.length > 10 ? " …" : ""}` };
  }
  return { ok: true, shared, holders, conflicts, reason: "" };
}

// 고객사(계정)에 할당된 S/O 목록 — 편집 데이터 + 소유권 데이터 + 코드 프로젝트
export function assignedSOFor(customer: string, extra: BookRec[] = []): { k: string; s: number; o: number; from: string }[] {
  const m = new Map<string, { k: string; s: number; o: number; from: string }>();
  const add = (k: string, s: number, o: number, from: string) => {
    const key = `${k}/${s}/${o}`;
    if (!m.has(key)) m.set(key, { k, s, o, from });
  };
  // 소유권 데이터의 계정명은 표기가 조금씩 달라 느슨하게 매칭 ("구몬" ↔ "구몬학습")
  const norm = (x: string) => x.replace(/\s+/g, "").toLowerCase();
  const cn = norm(customer);
  const same = (a: string) => {
    const an = norm(a).replace(/\(.*\)/g, "");
    return !!cn && !!an && (an === cn || (cn.length >= 2 && an.includes(cn)) || (an.length >= 2 && cn.includes(an)));
  };
  for (const r of [...EDIT_BOOKS, ...extra]) if (same(r.cust)) add(r.k, r.sec, r.owner, "발급");
  for (const s of OD) for (const r of s.records) {
    if (!same(r.account)) continue;
    const ks = r.product === "PDS3" ? ["N"] : r.product === "PDS2" ? ["G"] : ["N", "G"];
    ks.forEach((k) => add(k, s.section, r.owner, "발급"));
  }
  return [...m.values()].sort((a, b) => a.s - b.s || a.o - b.o);
}
