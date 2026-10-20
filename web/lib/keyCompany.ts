"use client";

// 키 발급 고객사 = **고객사 관리(companies) 고객사** `PC-153`
// - App Key 관리 · N Key 관리는 고객사 관리에 등록된 고객사를 불러와 키를 발급한다(고객사 등록은 고객사 관리에서만).
// - 계정은 다르다: App Key 관리의 계정 = **계정 ↔ App Key 매칭**(scope key) /
//   고객사 관리의 계정 = **고객사가 서비스 권한을 갖는 서비스 계정**(scope service). 서로 섞지 않는다.
// - 과거 대장(Caster_계정_퍼미션_티켓.xlsx · nkey(HLP).xlsx)은 이름이 고객사 관리와 다를 수 있어 아래 규칙으로 잇는다.
//   · App Key 계정: coRef(새 발급) → 고객사명 일치
//   · N Key 티켓 : coRef(새 발급) → 이름 + **Owner 번호**(고객사명 끝 -오너) → 고객사명 일치 → 이름이 하나뿐이면 그 고객사
//   · 어디에도 안 맞으면 「미연결」(예: hyssos · inkwrx) — 억지로 붙이지 않는다
import type { Company, Project } from "@/lib/customerData";
import { codeKind, patternOf } from "@/lib/codeKind";
import { keyNameOf } from "@/lib/keyCustomer";
import { makeRange, rangesOfTicketRows, ticketCustomerByName, type TicketRange } from "@/lib/ticketCustomerStore";

const norm = (s?: string) => (s ?? "").trim().toLowerCase();
/** 비교용 이름 — 괄호 · 끝의 -오너 · 기호 · 공백을 뺀다 (KODION-46 → kodion, Inform DS-302 → informds) */
export const baseName = (s?: string) =>
  (s ?? "").replace(/\(.*?\)/g, "").replace(/-\d+\s*$/, "").replace(/[^0-9A-Za-z가-힣]/g, "").toLowerCase();
/** 고객사명 끝의 -오너 번호 (KODION-46 → 46) */
export const ownerSuffix = (s?: string): number | null => { const m = /-(\d+)\s*$/.exec(s ?? ""); return m ? Number(m[1]) : null; };

type AccLike = { company: string; coRef?: number };
type TicketLike = { company: string; coRef?: number; params?: Record<string, string | number> };

export function companyOfAccount(a: AccLike, companies: Company[]): Company | undefined {
  if (a.coRef) { const c = companies.find((x) => x.id === a.coRef); if (c) return c; }
  return companies.find((c) => norm(c.name) === norm(a.company));
}

export function companyOfNTicket(t: TicketLike, companies: Company[]): Company | undefined {
  if (t.coRef) { const c = companies.find((x) => x.id === t.coRef); if (c) return c; }
  // Owner 가 맞는 「이름-오너」 고객사가 먼저다 — ufit(O311) 은 Ufit 이 아니라 ufit-311
  const b = baseName(t.company);
  const cands = b ? companies.filter((c) => baseName(c.name) === b) : [];
  const owner = Number(t.params?.Owner);
  const byOwner = Number.isFinite(owner) ? cands.find((c) => ownerSuffix(c.name) === owner) : undefined;
  if (byOwner) return byOwner;
  const exact = companies.find((c) => norm(c.name) === norm(t.company));
  if (exact) return exact;
  return cands.length === 1 ? cands[0] : undefined;
}

/** 고객사의 SOBP 할당(고객사 관리 고객사로 할당한 프로젝트) → 발급 범위 */
function sobpRangesOf(co: Company, projects: Project[]): TicketRange[] {
  return projects.filter((p) => !p.keyCustomer && p.companyId === co.id).flatMap((p) => p.issued.map((b) =>
    makeRange(patternOf(codeKind(b.kind ?? "N", b.section)), b.section, b.owner, b.bookStart, b.bookEnd)));
}
/** SOBP 맵에서 (K) 로 할당한 범위 중 이 고객사 것(이름 + Owner) — 옛 티켓 고객사 할당분 */
function keyAllocRangesOf(co: Company, projects: Project[]): TicketRange[] {
  const b = baseName(co.name), own = ownerSuffix(co.name);
  return projects.filter((p) => p.keyCustomer && baseName(keyNameOf(p.keyCustomer)) === b).flatMap((p) => p.issued
    .filter((x) => own == null || x.owner === own)
    .map((x) => makeRange(patternOf(codeKind(x.kind ?? "N", x.section)), x.section, x.owner, x.bookStart, x.bookEnd)));
}
const dedupe = (rs: TicketRange[]) =>
  rs.filter((r, i, arr) => arr.findIndex((x) => x.pt === r.pt && x.section === r.section && x.owner === r.owner && x.bookStart === r.bookStart && x.bookEnd === r.bookEnd) === i);

/** App Key 발급 범위 — Caster 대장 이력(그 고객사 계정들) + 고객사의 SOBP 할당 */
export function appKeyRangesOfCompany(co: Company | undefined, projects: Project[]): TicketRange[] {
  if (!co) return [];
  const ledger = ticketCustomerByName(co.name, "appkey")?.ranges ?? [];
  return dedupe([...ledger, ...sobpRangesOf(co, projects)]);
}

/** N Key 발급 범위 — nkey(HLP) 대장 이력(이 고객사로 이어진 티켓) + 고객사의 SOBP 할당 + (K) 할당 */
//   잇기는 **전체 고객사 목록**으로 판단해야 한다(한 곳만 주면 「이름이 하나뿐」 규칙이 잘못 붙는다)
export function nKeyRangesOfCompany(co: Company | undefined, projects: Project[], tickets: TicketLike[], companies: Company[]): TicketRange[] {
  if (!co) return [];
  const mine = tickets.filter((t) => companyOfNTicket(t, companies)?.id === co.id);
  return dedupe([...rangesOfTicketRows(mine), ...sobpRangesOf(co, projects), ...keyAllocRangesOf(co, projects)]);
}

// ── 서비스 티켓 `PC-172` ─────────────────────────────────────────────
/** 서비스 티켓 발급 범위 = 고객사의 SOBP 할당 + **공유(커먼) 코드 사용 고객사이면 그 S/O** `PC-171`
 *  (공유 코드는 Owner 를 여럿이 쓰므로 Book 은 서비스 티켓끼리 겹치지 않게만 잡는다) */
export type ServiceRange = TicketRange & { shared?: boolean };
export function serviceRangesOfCompany(co: Company | undefined, projects: Project[], memberCodes: string[]): ServiceRange[] {
  if (!co) return [];
  const own: ServiceRange[] = sobpRangesOf(co, projects);
  const shared: ServiceRange[] = memberCodes.flatMap((ck) => {
    const [k, s, o] = ck.split(":");
    if (k === "A") return [];                                     // 이력전용 OID(옛 IDS)는 발급하지 않는다
    return [{ ...makeRange(patternOf(codeKind(k, +s)), +s, +o, null, null), shared: true }];
  });
  return dedupe([...own, ...shared]) as ServiceRange[];
}
