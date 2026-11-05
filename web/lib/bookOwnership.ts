"use client";

// 교재(편집 프로젝트) ↔ 서비스 티켓 — 교재 소유 고객사 `PC-291`
// - 서비스 티켓과 교재의 코드 범위는 서로 겹쳐도 된다(교재 = 내부 편집 기록 `PC-283`).
// - 새 편집 데이터는 nproj 코드를 할당받은 고객사에 교재가 생긴다 `PC-284`.
// - 공용(커먼) 코드: 그 Book 에 서비스 티켓을 받은 **하위 고객사**가 교재 소유 고객사다.
//   티켓이 없으면 **상위 고객사**(공용 코드 보유 고객사) 소유다.
// - 상위 · 하위 고객사의 서비스 티켓은 서로 겹칠 수 없다(PC-174 그대로 · `PC-286` 의 「상위 티켓 안 분할」 폐기).
// - 서비스 티켓 생성 · 수정 검사
//   ⑤ 범위 안에 **다른 고객사 소유 교재**가 있으면 오류
//   ⑥ 수정으로 **이 고객사 소유 교재가 범위를 벗어나면** 오류
// - 서비스 티켓 기획 전부터 있던 공용 코드 교재는, 등록된 사용 고객사에 서비스 티켓을 **자동 발급**해 맞춘다(1회) `PC-292`
import { EDIT_CUSTOMERS } from "./editingData";
import { loadCustomCustomers } from "./editingCustomers";
import { COMMON_CODES, commonCodeOf } from "./commonCodes";
import { codeKind, patternOf } from "./codeKind";
import { makeRange } from "./ticketCustomerStore";
import { sobpOverlapMsg } from "./rangeGuard";
import { caster } from "./accountStore";
import { baseName } from "./keyCompany";
import { allServiceTickets, addServiceTicketsBulk, hydrateServiceTickets, type ServiceTicket } from "./serviceTicketStore";
import type { Company } from "./customerData";

export type EditBook = { cust: string; k: string; s: number; o: number; b: number; t: string; cu?: string; d?: string };

const EDIT_KEY = (name: string) => `ncc-edit14-${name}`;   // EditingDetailView 와 같은 키

/** 모든 편집 프로젝트의 교재 — 브라우저 저장분이 있으면 그것, 없으면 시드 */
export function allEditBooks(): EditBook[] {
  const out: EditBook[] = [];
  const names = [...EDIT_CUSTOMERS.map((c) => c.customer), ...loadCustomCustomers().map((c) => c.customer)];
  for (const name of [...new Set(names)]) {
    let rows: Partial<EditBook>[] | undefined;
    try { const raw = typeof window !== "undefined" ? localStorage.getItem(EDIT_KEY(name)) : null; if (raw) rows = JSON.parse(raw); } catch { /* */ }
    if (!rows) rows = (EDIT_CUSTOMERS.find((c) => c.customer === name)?.bookRows ?? []) as Partial<EditBook>[];
    for (const r of rows) {
      if (r.s == null || r.o == null || r.b == null) continue;
      out.push({ cust: name, k: r.k ?? "N", s: r.s, o: r.o, b: r.b, t: r.t ?? "", cu: (r.cu ?? "").trim() || undefined, d: r.d });
    }
  }
  return out;
}

/** 교재 코드 종류 → 서비스 티켓 Code Type (PDS4 는 PDS3 · OID 는 서비스 티켓 없음) */
export const ticketPtOf = (k: string, s: number): "PDS2" | "PDS3" | null => {
  const ck = codeKind(k, s);
  return ck === "OID" ? null : ck === "PDS2" ? "PDS2" : "PDS3";
};
type Span = { pt: string; section: number; owner: number; bookStart: number; bookEnd: number };
const covers = (t: Span, bk: { k: string; s: number; o: number; b: number }) =>
  t.pt === ticketPtOf(bk.k, bk.s) && t.section === bk.s && t.owner === bk.o && t.bookStart <= bk.b && bk.b <= t.bookEnd;

/** 교재 소유 고객사 — 그 Book 을 덮는 서비스 티켓의 고객사 → 없으면 공용 코드 보유(상위) 고객사 → 그 밖은 편집 프로젝트 고객사 */
export function ownerOfBook(bk: EditBook, tickets: ServiceTicket[] = allServiceTickets()): { name: string; by: "ticket" | "parent" | "project" } {
  const t = tickets.find((x) => covers(x, bk));
  if (t) return { name: t.company, by: "ticket" };
  const cc = commonCodeOf(bk.k === "O" ? "A" : bk.k, bk.s, bk.o);
  if (cc) return { name: cc.company, by: "parent" };
  return { name: bk.cust, by: "project" };
}

const bookLabel = (bk: EditBook) => `S${bk.s}/O${bk.o}/B${bk.b}${bk.t ? ` 「${bk.t}」` : ""}`;
const more = (n: number) => (n > 1 ? ` 외 ${n - 1}건` : "");

/** 서비스 티켓 생성 · 수정 때 교재 검사 — 문제가 없으면 "" `PC-291` */
export function ticketBookErr(cand: Span & { company: string }, edit?: ServiceTicket): string {
  const books = allEditBooks();
  const others = allServiceTickets().filter((t) => t.id !== edit?.id);
  // ⑤ 범위 안에 다른 고객사 소유 교재 — 비공용 코드는 할당받은 고객사만 티켓을 받으므로 공용 코드에서만 생긴다
  const foreign = books.filter((bk) => covers(cand, bk)).filter((bk) => {
    const o = ownerOfBook(bk, others);
    return o.by !== "project" && o.name !== cand.company;
  });
  if (foreign.length) {
    const o = ownerOfBook(foreign[0], others);
    return `티켓 범위 안에 다른 고객사(${o.name}) 소유 교재가 있습니다 — ${bookLabel(foreign[0])}${more(foreign.length)}. 그 Book 을 빼고 범위를 정하세요.`;
  }
  // ⑥ 수정으로 이 고객사 소유 교재가 범위를 벗어남
  if (edit) {
    const out = books.filter((bk) => covers(edit, bk) && !covers(cand, bk));
    if (out.length)
      return `범위를 바꾸면 이 고객사 소유 교재가 티켓 범위를 벗어납니다 — ${bookLabel(out[0])}${more(out.length)}. 교재가 있는 Book 을 포함하도록 범위를 정하세요.`;
  }
  return "";
}

// ── 기존 공용 코드 교재 → 사용 고객사 서비스 티켓 자동 발급(1회) `PC-292` ─────────────────
const ALIGN_KEY = "ncc-svc-align-v1";
const matchCompany = (name: string, companies: Company[]) => {
  const ex = companies.filter((c) => c.name.trim().toLowerCase() === name.trim().toLowerCase());
  if (ex.length === 1) return ex[0];
  const bs = companies.filter((c) => baseName(c.name) === baseName(name));
  return bs.length === 1 ? bs[0] : undefined;
};

/** 공용 코드마다 Book 순으로 훑어, **같은 사용 고객사가 이어지는 구간**을 티켓 하나로 만든다.
 *  다른 고객사 교재 · 사용 고객사 없는 교재(상위 소유)가 끼면 구간을 끊는다 → 상위 · 하위 · 하위끼리 겹치지 않는다.
 *  고객사 관리에 없는 이름 · 기존 티켓(App Key · N Key · 서비스 티켓)과 겹치는 구간은 만들지 않는다(「티켓 필요」로 남음). */
export function alignLegacyServiceTickets(companies: Company[]): { made: number; skipped: number } | null {
  if (typeof window === "undefined" || companies.length === 0) return null;
  try { if (localStorage.getItem(ALIGN_KEY)) return null; } catch { return null; }
  hydrateServiceTickets();
  caster.subscribe(() => {})();   // App Key 겹침 검사용으로 계정 원장을 읽어 둔다
  const books = allEditBooks();
  const recs: Omit<ServiceTicket, "id" | "no" | "at">[] = [];
  let skipped = 0;
  for (const cc of COMMON_CODES.filter((c) => !c.historyOnly)) {
    const list = books.filter((bk) => bk.k === cc.k && bk.s === cc.s && bk.o === cc.o).sort((a, b) => a.b - b.b);
    const pt = ticketPtOf(cc.k, cc.s);
    if (!pt) continue;
    const full = makeRange(patternOf(codeKind(cc.k, cc.s)), cc.s, cc.o, null, null);
    let run: EditBook[] = [];
    const flush = () => {
      if (!run.length) return;
      const cu = run[0].cu!;
      const co = matchCompany(cu, companies);
      const span = { section: cc.s, owner: cc.o, bookStart: run[0].b, bookEnd: run[run.length - 1].b, pageStart: full.pageStart, pageEnd: full.pageEnd };
      if (co && co.name === cc.company) { run = []; return; }   // 상위 고객사 자신 — 티켓 없이 상위 소유
      if (!co || allServiceTickets().some((t) => covers(t, run[0])) || sobpOverlapMsg(span)) skipped++;
      else {
        const since = run.map((x) => x.d ?? "").filter(Boolean).sort()[0] ?? new Date().toISOString().slice(0, 10);
        recs.push({ companyId: co.id, company: co.name, pt, ...span, bookVol: span.bookEnd - span.bookStart + 1,
          pageVol: span.pageEnd - span.pageStart + 1, since, until: "2099-12-31", shared: true, service: "CASTERN", by: "시스템" });
      }
      run = [];
    };
    // 한 Book 에 사용 고객사가 둘 이상이면(옛 데이터) 누구 것인지 정할 수 없다 — 만들지 않고 「티켓 필요」로 남긴다
    const cuSet = new Map<number, Set<string>>();
    for (const bk of list) { const s = cuSet.get(bk.b) ?? new Set<string>(); s.add(bk.cu ?? ""); cuSet.set(bk.b, s); }
    for (const bk of list) {
      if ((cuSet.get(bk.b)?.size ?? 0) > 1) { flush(); skipped++; continue; }
      if (!bk.cu) { flush(); continue; }
      if (run.length && run[0].cu !== bk.cu) flush();
      run.push(bk);
    }
    flush();
  }
  addServiceTicketsBulk(recs);
  try { localStorage.setItem(ALIGN_KEY, new Date().toISOString()); } catch { /* */ }
  return { made: recs.length, skipped };
}
