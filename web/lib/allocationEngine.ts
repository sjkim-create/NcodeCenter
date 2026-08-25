/**
 * NcodeCenter — 자동 연속 할당 엔진 (Allocation Engine)
 * ------------------------------------------------------------------
 * 운영 정책(§1) 반영:
 *  - 무겹침(최우선): 기존 할당과 절대 겹치지 않음.
 *  - 연속성 = book 단위: 연속 부족 시 book 분리, 각 book 내 page 연속(조각 병합 금지)이 기본.
 *  - 서비스별 연속성 요건 분기: opts.pageContiguityRequired
 *      true (기본, NeoStudio2 등 book 종속): book 분리·page 연속(같은 book 조각 병합 금지).
 *      false (CasterN 등 연속 불필요): 조각 허용 — 떨어진 page도 채워 효율 우선.
 *
 * 순수 함수(네트워크/상태 없음). 서버(/allocations/preview)와 프론트 미리보기가 공유.
 */

export interface ReservedGrid {
  id: number;          // ReservedCode.id (또는 전용 owner grid id)
  section: number;
  owner: number;
  bookStart: number;
  bookEnd: number;
  pageStart: number;
  pageEnd: number;
  type?: string;       // 'PDS2'|'PDS3' 등 (선택)
}

/** 이미 점유된 구간 (IssuedCode / 사용중 allocation) */
export interface Occupied {
  reservedCodeId: number;
  book: number;
  pageStart: number;
  pageEnd: number;
}

export interface AllocRun {
  reservedCodeId: number;
  section: number;
  owner: number;
  book: number;
  pageStart: number;
  pageEnd: number;
  count: number;
}

export interface AllocResult {
  ok: boolean;
  contiguous: boolean;   // true=단일 연속 1 run
  runs: AllocRun[];
  requested: number;
  allocated: number;
  shortBy: number;
}

export interface AllocOptions {
  /** 분리 허용 조각 수 상한(초과 시 ok=false). 기본: 제한 없음 */
  maxFragments?: number;
  /**
   * page 연속성 필요 여부(서비스/대상 앱 기준, 운영정책 §1).
   *  true (기본): book 분리·book 내 page 연속(같은 book 조각 병합 금지) — NeoStudio2 등.
   *  false: 조각 허용(떨어진 page 사용 가능) — CasterN 등 연속 불필요 서비스.
   */
  pageContiguityRequired?: boolean;
}

interface FreeRun {
  rc: ReservedGrid;
  book: number;
  start: number;
  end: number;
  len: number;
}

/** 한 book 안에서 예약 page범위 − 점유구간 = 연속 빈 run 목록 */
function freeRunsForBook(rc: ReservedGrid, book: number, occupied: Occupied[]): FreeRun[] {
  const lo = rc.pageStart;
  const hi = rc.pageEnd;
  const occ = occupied
    .filter((o) => o.reservedCodeId === rc.id && o.book === book)
    .map((o) => ({ s: Math.max(o.pageStart, lo), e: Math.min(o.pageEnd, hi) }))
    .filter((o) => o.s <= o.e)
    .sort((a, b) => a.s - b.s);

  const runs: FreeRun[] = [];
  let cursor = lo;
  for (const o of occ) {
    if (o.s > cursor) runs.push({ rc, book, start: cursor, end: o.s - 1, len: o.s - cursor });
    cursor = Math.max(cursor, o.e + 1);
    if (cursor > hi) break;
  }
  if (cursor <= hi) runs.push({ rc, book, start: cursor, end: hi, len: hi - cursor + 1 });
  return runs;
}

function allFreeRuns(grids: ReservedGrid[], occupied: Occupied[]): FreeRun[] {
  const out: FreeRun[] = [];
  for (const rc of grids) {
    for (let book = rc.bookStart; book <= rc.bookEnd; book++) {
      out.push(...freeRunsForBook(rc, book, occupied));
    }
  }
  return out;
}

function mkRun(fr: FreeRun, ps: number, pe: number): AllocRun {
  return {
    reservedCodeId: fr.rc.id,
    section: fr.rc.section,
    owner: fr.rc.owner,
    book: fr.book,
    pageStart: ps,
    pageEnd: pe,
    count: pe - ps + 1,
  };
}

const ascByAddress = (a: FreeRun, b: FreeRun): number =>
  a.rc.owner - b.rc.owner || a.book - b.book || a.start - b.start;

/**
 * N 페이지를 자동 배정한다.
 *  1) 한 book 안에서 길이 N 이상 연속 빈 구간 → 완전 연속 할당(첫 N칸).
 *  2) 없으면:
 *     - pageContiguityRequired=true(기본): book 분리. book마다 최장 연속 run 1개만(조각 병합 금지).
 *     - pageContiguityRequired=false: 조각 허용. 큰 빈 구간부터 채움(같은 book 여러 조각 가능).
 * 어느 격자로도 N을 못 채우면 ok=false(shortBy).
 */
export function allocate(
  grids: ReservedGrid[],
  occupied: Occupied[],
  pages: number,
  opts: AllocOptions = {}
): AllocResult {
  const N = Math.max(0, Math.floor(pages));
  if (N === 0) {
    return { ok: true, contiguous: true, runs: [], requested: 0, allocated: 0, shortBy: 0 };
  }

  const contiguityRequired = opts.pageContiguityRequired ?? true;
  const runs = allFreeRuns(grids, occupied).sort(ascByAddress);

  // 1) 연속 우선: 낮은 주소부터 first-fit
  for (const r of runs) {
    if (r.len >= N) {
      return {
        ok: true,
        contiguous: true,
        runs: [mkRun(r, r.start, r.start + N - 1)],
        requested: N,
        allocated: N,
        shortBy: 0,
      };
    }
  }

  // 2) 분리
  let candidates: FreeRun[];
  if (contiguityRequired) {
    // book 분리: book마다 '가장 큰 연속 빈 run' 1개만(같은 book 조각 병합 금지)
    const bestPerBook = new Map<string, FreeRun>();
    for (const r of runs) {
      const key = `${r.rc.id}:${r.book}`;
      const cur = bestPerBook.get(key);
      if (!cur || r.len > cur.len) bestPerBook.set(key, r);
    }
    candidates = [...bestPerBook.values()];
  } else {
    // 조각 허용(CasterN 등): 모든 빈 run 사용 가능
    candidates = [...runs];
  }
  // 큰 구간부터 채워 조각 수 최소화
  candidates.sort((a, b) => b.len - a.len || ascByAddress(a, b));

  const chosen: AllocRun[] = [];
  let remaining = N;
  for (const r of candidates) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, r.len);
    chosen.push(mkRun(r, r.start, r.start + take - 1));
    remaining -= take;
  }

  chosen.sort((a, b) => a.owner - b.owner || a.book - b.book || a.pageStart - b.pageStart);

  const allocated = N - remaining;
  const withinLimit = opts.maxFragments == null || chosen.length <= opts.maxFragments;
  const ok = remaining === 0 && withinLimit;

  return { ok, contiguous: false, runs: chosen, requested: N, allocated, shortBy: remaining };
}
