"use client";

// DSH-01 대시보드 — 분야별로 나눠 본다. 정산을 맨 위에 둔다 `PC-242`
//   ① 정산         : 편집 청구액 · Key 발급 정산 / 미정산 금액 추정 — N Key · App Key 나눠서
//   ② 코드(SOBP)  : 할당율 · 업체별 점유  (Section별 소유 현황은 뺐다 `PC-102` — SOBP 맵에서 본다)
//   ③ 편집(CasterN): 고객사·교재 규모 · 진행 상태 · 전용 단가 적용
//   ④ 운영         : 액션 필요 알림 · 최근 활동
// 색은 NEO UI 테마(`shared/config/light-theme.ts` — Figma 컬러칩과 1:1)의 팔레트만 쓴다 `PC-242`
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import raw from "@/data/ownership-data.json";
import { useActivities, TYPE_META } from "@/lib/activityStore";
import { useStore } from "@/lib/store";
import { EDIT_CUSTOMERS } from "@/lib/editingData";
import { loadCustomCustomers, type EditCustomer } from "@/lib/editingCustomers";
import { rateOf, settle, won, customRateCount } from "@/lib/pricing";
import { allTickets, hydrateTickets, useTickets, daysLeft, krwOf } from "@/lib/ticketStore";
import { useCaster, accountScope, accountTickets } from "@/lib/accountStore";
import { lightTheme } from "@/shared/config/light-theme";

// NEO UI 테마 팔레트 — 화면 색은 여기서만 고른다 `PC-242`
const TB = lightTheme.brand!, TS = lightTheme.semantic!, TG = lightTheme.grey!;
const C = {
  primary: TB.primary, primaryDark: TB.primaryDarker, primaryBg: TB.primaryLighter,
  cyan: TB.secondaryDarker,
  success: TS.successDark, warning: TS.warningDark, error: TS.errorDark,
  info: TS.infoDark,
  warningBg: TS.warningBg, errorBg: TS.errorBg,
  ink: TG.darkest, sub: TG.dark, dim: TG.base, line: TG.lighter, bg: TG.lightest,
};

type Rec = { owner: number; product: string; account: string };
type Section = { section: number; legacy: boolean; test_dev?: boolean; owned?: number; total_owners?: number; records: Rec[] };
type Data = {
  sections: Section[];
  accounts: { name: string; owners: number; books: number }[];
  meta: { records: number; account_count: number };
};
const DATA = raw as unknown as Data;

const fmt = (n: number) => n.toLocaleString();
const pct1 = (n: number) => `${(Math.round(n * 10) / 10).toFixed(1)}%`;

/* ── ① 코드(SOBP) — 정적 집계 ── */
const sectionStats = DATA.sections.map((s) => ({
  section: s.section,
  legacy: s.legacy,
  test_dev: s.test_dev,
  owned: s.owned ?? new Set(s.records.map((r) => r.owner)).size,
  cap: s.total_owners ?? 0,
}));
const ownerCap = sectionStats.reduce((n, s) => n + s.cap, 0);
const ownerUsed = sectionStats.reduce((n, s) => n + s.owned, 0);
const ownerFree = Math.max(0, ownerCap - ownerUsed);
const allocRate = ownerCap ? (ownerUsed / ownerCap) * 100 : 0;
// 정원 대비 사용률이 높은 섹션 — 코드 여력은 늦게 알면 손쓸 수 없다
const tightSections = sectionStats.filter((s) => s.cap > 0 && s.owned / s.cap >= 0.5)
  .sort((a, b) => b.owned / b.cap - a.owned / a.cap);
const topAccounts = DATA.accounts.slice(0, 10);
const maxAcc = Math.max(1, ...topAccounts.map((a) => a.owners));

/* ── ② 편집 ── */
const EDIT_KEY = "ncc-edit12-";   // 교재 편집 캐시 (고객사명 단위)
const nzc = (x: string) => x.replace(/\s+/g, "").replace(/\(.*\)/g, "").toLowerCase();
// 심볼 합계 — 배열 0번은 [Ncode 적용] **페이지 수**라 심볼로 세지 않는다 `PC-085`
const sumOf = (a?: number[]) => (a ?? []).slice(1).reduce((x, y) => x + y, 0);
type BRow = { pg?: number; sm?: number[]; pm?: number[]; pu?: number; su?: number; dcRate?: number; dcAmt?: number; use?: string };
const stateOf = (v?: string) => (v === "완료" || v === "보류" ? v : "진행중");
const ST_TONE: Record<string, string> = { 진행중: C.primary, 완료: C.success, 보류: C.warning };
// 업체별 점유 Top 10 — 테마 색을 흰색과 섞은 파스텔 10색 `PC-244`
const pastel = (hex: string, w = 0.4) => {
  const n = parseInt(hex.slice(1), 16), m = (c: number) => Math.round(c + (255 - c) * w);
  return `rgb(${m(n >> 16)}, ${m((n >> 8) & 255)}, ${m(n & 255)})`;
};
const TOP_PASTEL = [TB.primary, TB.secondary, TS.success, TS.warning, TS.error, TS.info, TB.primaryDark, TS.successDark, TS.warningDark, TS.errorDark].map((h) => pastel(h));

/* ── 정산 집계 — N Key · App Key 같은 계산 `PC-242` ── */
//   유료 금액은 원화 기준 — 달러는 환율을 적어 둔 것만 원화로 본다 `PC-202`
//   미정산 추정 = 미정 티켓마다 그 고객사의 최근 유료 금액(없으면 유료 평균)
type BillItem = { company: string; billing?: string; krw: number; at: string; trialUntil?: string };
function billStats(items: BillItem[]) {
  const paid = items.filter((t) => t.billing === "유료" && t.krw > 0);
  const avg = paid.length ? Math.round(paid.reduce((a, t) => a + t.krw, 0) / paid.length) : 0;
  const lastOf = new Map<string, number>();
  [...paid].sort((a, b) => (a.at < b.at ? 1 : -1)).forEach((t) => { if (!lastOf.has(t.company)) lastOf.set(t.company, t.krw); });
  const todo = items.filter((t) => !t.billing || t.billing === "미정");
  let est = 0, byCo = 0, byAvg = 0;
  todo.forEach((t) => { const own = lastOf.get(t.company); if (own) { est += own; byCo++; } else if (avg) { est += avg; byAvg++; } });
  const trial = items.filter((t) => t.billing === "체험");
  return {
    // 유료 건수는 과금 유형 기준(금액을 아직 안 적은 유료도 센다) · 금액 합은 적힌 것만
    total: items.length, paidN: items.filter((t) => t.billing === "유료").length, paidAmt: paid.reduce((a, t) => a + t.krw, 0),
    freeN: items.filter((t) => t.billing === "무료").length, trialN: trial.length, todoN: todo.length, est, byCo, byAvg,
    expired: trial.filter((t) => (daysLeft(t.trialUntil) ?? 0) < 0).length,
    soon: trial.filter((t) => { const d = daysLeft(t.trialUntil); return d != null && d >= 0 && d <= 7; }).length,
  };
}

export default function DashboardView() {
  const { companies, projects } = useStore();
  const tv = useTickets();   // 원장이 로드 · 바뀌면 정산 집계를 다시 한다
  const cast = useCaster();
  const [custom, setCustom] = useState<EditCustomer[]>([]);
  const [edits, setEdits] = useState<Record<string, BRow[]>>({});   // 고객사별 교재 편집 캐시

  useEffect(() => {
    hydrateTickets();
    setCustom(loadCustomCustomers());
    // 편집 상세에서 저장한 교재는 localStorage 에 있다 — 시드보다 우선한다
    const m: Record<string, BRow[]> = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k?.startsWith(EDIT_KEY)) continue;
        const v = JSON.parse(localStorage.getItem(k) ?? "[]");
        if (Array.isArray(v)) m[k.slice(EDIT_KEY.length)] = v as BRow[];
      }
    } catch { /* */ }
    setEdits(m);
  }, []);

  // 편집 집계 — 편집 프로젝트 화면과 같은 계산식(settle + 고객사 단가)
  const edit = useMemo(() => {
    const rateFor = (name: string) => rateOf(companies.find((c) => nzc(c.name) === nzc(name)));
    const st = { 진행중: 0, 완료: 0, 보류: 0 } as Record<string, number>;
    const agg = EDIT_CUSTOMERS.reduce((a, c) => {
      const cRate = rateFor(c.customer);
      const rows = (edits[c.customer] ?? ((c as { bookRows?: BRow[] }).bookRows ?? [])) as BRow[];
      const m = rows.reduce((x, r) => {
        st[stateOf(r.use)]++;
        const b = settle({ pg: r.pg ?? 0, sym: sumOf(r.sm) + sumOf(r.pm), pu: r.pu, su: r.su, dcRate: r.dcRate, dcAmt: r.dcAmt }, cRate);
        return { cost: x.cost + b.total, listed: x.listed + b.listed };
      }, { cost: 0, listed: 0 });
      return { cost: a.cost + m.cost, listed: a.listed + m.listed, books: a.books + rows.length };
    }, { cost: 0, listed: 0, books: 0 });
    // 편집 단가 전용 적용 고객사 — 기본 단가에서 한 항목이라도 바꾼 고객사
    const custom편집단가 = companies.filter((c) => customRateCount(c) > 0);
    return { ...agg, custs: EDIT_CUSTOMERS.length + custom.length, st, rateCusts: custom편집단가.length };
  }, [companies, custom, edits]);

  /* ── ① 정산 — N Key · App Key 나눠서 `PC-242` ── */
  const billN = useMemo(() => billStats(allTickets().filter((t) => t.kind === "N").map((t) =>
    ({ company: t.company, billing: t.billing, krw: krwOf(t) ?? 0, at: t.at, trialUntil: t.trialUntil }))), [tv]);   // eslint-disable-line react-hooks/exhaustive-deps
  const billA = useMemo(() => billStats(cast.accounts.flatMap((a) => accountTickets(a).map((r) =>
    ({ company: a.company, billing: r.billing, krw: krwOf(r) ?? 0, at: r.since ?? "", trialUntil: r.trialUntil })))), [cast.accounts]);

  /* ── ④ 운영 알림 ── */
  const noKey = cast.accounts.filter((a) => accountScope(a) === "key" && !cast.appKeys.some((k) => k.accountId === a.id)).length;
  const closedCo = companies.filter((c) => c.closed).length;
  const closedProj = projects.filter((p) => companies.find((c) => c.id === p.companyId)?.closed).length;

  return (
    <div style={{ padding: "20px 22px" }}>
      {/* ① 정산 — 맨 위 · N Key / App Key 나눠서 `PC-242` */}
      <SectionHead title="정산" note="편집 청구액과 Key 발급 과금 — N Key · App Key 나눠서" href="/tickets/nkey" action="N Key 관리" />
      <div style={S.kpi5}>
        <Kpi icon="💰" label="편집 비용 청구액" value={won(edit.cost)}
          sub={edit.listed > edit.cost ? `정가 ${won(edit.listed)} · 할인 −${won(edit.listed - edit.cost)}` : "할인 없음"}
          tone={C.cyan} href="/projects/editing" />
        <Kpi tag="N Key" icon="🧾" label="Key 발급 정산" value={won(billN.paidAmt)}
          sub={`유료 ${billN.paidN} · 무료 ${billN.freeN} · 체험 ${billN.trialN} · 미정 ${billN.todoN}`} tone={C.primary} href="/tickets/nkey" />
        <Kpi tag="N Key" icon="❓" label="미정산 금액 추정" value={billN.est ? `~${won(billN.est)}` : "—"}
          sub={billN.todoN ? `미정 ${fmt(billN.todoN)}건 · 고객사 단가 ${billN.byCo} / 평균 ${billN.byAvg}` : "미정산 없음"}
          tone={billN.todoN ? C.error : C.dim} href="/tickets/nkey" />
        <Kpi tag="App Key" icon="🧾" label="Key 발급 정산" value={won(billA.paidAmt)}
          sub={`유료 ${billA.paidN} · 무료 ${billA.freeN} · 체험 ${billA.trialN} · 미정 ${billA.todoN}`} tone={C.primary} href="/tickets/account" />
        <Kpi tag="App Key" icon="❓" label="미정산 금액 추정" value={billA.est ? `~${won(billA.est)}` : "—"}
          sub={billA.todoN ? `미정 ${fmt(billA.todoN)}건 · 고객사 단가 ${billA.byCo} / 평균 ${billA.byAvg}` : "미정산 없음"}
          tone={billA.todoN ? C.error : C.dim} href="/tickets/account" />
      </div>


      {/* ② 코드 (SOBP) */}
      <SectionHead title="코드 (SOBP)" note="발급 여력과 점유 분포" href="/ownership" action="SOBP 맵" />
      <div style={S.kpi3}>
        <Kpi icon="🗺" label="코드 할당율" value={pct1(allocRate)} sub={`owner 정원 ${fmt(ownerCap)} 기준`} tone={C.primary} href="/ownership">
          <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", background: C.primaryBg, marginTop: 6 }}>
            <div style={{ width: `${Math.min(100, allocRate)}%`, background: C.primary }} />
          </div>
        </Kpi>
        <Kpi icon="🧩" label="발급 owner" value={fmt(ownerUsed)} sub={`레코드 ${fmt(DATA.meta.records)}건 · 업체 ${fmt(DATA.meta.account_count)}곳`} tone={C.info} href="/projects" />
        <Kpi icon="🕳" label="미발급 owner" value={fmt(ownerFree)} sub={tightSections.length ? `Section ${tightSections[0].section} 사용률 ${pct1(tightSections[0].owned / tightSections[0].cap * 100)}` : "여유 있음"} tone={C.dim} href="/ownership" />
      </div>
      {/* Section별 소유 현황 카드는 뺐다 `PC-102` — 같은 정보를 SOBP 맵에서 본다. 업체별 점유만 전폭으로 */}
      <Card title="업체별 점유 Top 10" hint="소유 owner 수">
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 4 }}>   {/* 순위 줄 간격 9 → 14 `PC-243` */}
          {topAccounts.map((a, i) => (
            <div key={a.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 20, color: C.dim, fontSize: 12, flex: "none" }}>{i + 1}</div>
              <div style={{ width: 130, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: "none" }} title={a.name}>{a.name}</div>
              <div style={{ flex: 1, height: 14, borderRadius: 5, background: C.bg, overflow: "hidden" }}>
                <div style={{ width: `${(a.owners / maxAcc) * 100}%`, height: "100%", background: TOP_PASTEL[i % TOP_PASTEL.length] }} />
              </div>
              <div style={{ width: 62, textAlign: "right", fontSize: 12, color: C.sub, flex: "none" }}>owner {a.owners}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* ③ 편집 (CasterN) */}
      <SectionHead title="편집 (CasterN)" note="편집 프로젝트 규모와 진행 상태" href="/projects/editing" action="편집 프로젝트" />
      <div style={S.kpi3}>
        <Kpi icon="🎬" label="CasterN 고객사" value={fmt(edit.custs)} sub={`편집 교재 ${fmt(edit.books)}권`} tone={C.primary} href="/projects/editing" />
        <Kpi icon="✅" label="편집 완료 교재" value={fmt(edit.st.완료)} sub={`전체 ${fmt(edit.books)}권 중 ${edit.books ? pct1(edit.st.완료 / edit.books * 100) : "0%"}`} tone={C.success} href="/projects/editing" />
        <Kpi icon="💵" label="전용 단가 고객사" value={fmt(edit.rateCusts)} sub={`전체 고객사 ${fmt(companies.length)}곳 중`} tone={C.warning} href="/companies" />
      </div>
      <Card title="편집 진행 상태 분포" hint={`교재 ${fmt(edit.books)}권`}>
        <div style={{ display: "flex", height: 22, borderRadius: 6, overflow: "hidden", background: C.bg, marginBottom: 12 }}>
          {(["진행중", "완료", "보류"] as const).map((k) => {
            const n = edit.st[k]; if (!n) return null;
            return <div key={k} title={`${k} ${fmt(n)}권`} style={{ width: `${(n / Math.max(1, edit.books)) * 100}%`, background: ST_TONE[k] }} />;
          })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {(["진행중", "완료", "보류"] as const).map((k) => (
            <div key={k} style={{ border: `1px solid ${C.line}`, borderRadius: 9, padding: "9px 11px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.sub }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: ST_TONE[k], flex: "none" }} />{k}
              </div>
              <div style={{ fontSize: 19, fontWeight: 800, color: ST_TONE[k], marginTop: 2 }}>{fmt(edit.st[k])}</div>
              <div style={{ fontSize: 11, color: C.dim }}>{edit.books ? pct1(edit.st[k] / edit.books * 100) : "0%"}</div>
            </div>
          ))}
        </div>
        {edit.st.완료 === 0 && edit.st.보류 === 0 && (
          <div style={{ fontSize: 11, color: C.dim, marginTop: 10, lineHeight: 1.6 }}>
            시드 데이터에는 진행 상태 값이 없어 전부 <b>진행중</b>으로 집계됩니다. 편집 상세에서 교재 상태를 바꾸면 여기에 반영됩니다.
          </div>
        )}
      </Card>

      {/* ④ 운영 */}
      <SectionHead title="운영" note="확인·처리가 필요한 항목" href="/activity" action="전체 로그" />
      <div style={S.grid2}>
        <Card title="운영 알림">
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Alert n={billN.todoN} label="정산 미등록 티켓 · N Key" note={billN.est ? `추정 ${won(billN.est)} — 과금 유형 미정` : "발급했지만 과금 유형이 미정"} href="/tickets/nkey" />
            <Alert n={billA.todoN} label="정산 미등록 티켓 · App Key" note={billA.est ? `추정 ${won(billA.est)} — 과금 유형 미정` : "발급했지만 과금 유형이 미정"} href="/tickets/account" />
            <Alert n={billN.expired + billA.expired} label="체험 기간 만료" note={`N Key ${billN.expired} · App Key ${billA.expired} — 유료 전환 또는 회수 확인`} href="/tickets/nkey" danger />
            <Alert n={billN.soon + billA.soon} label="체험 만료 임박 (7일 내)" note={`N Key ${billN.soon} · App Key ${billA.soon} — 사전 안내 대상`} href="/tickets/nkey" />
            <Alert n={noKey} label="App Key 미연동 계정" note="계정만 있고 발급 키 없음" href="/tickets/account" />
            <Alert n={closedCo} label="사업 종료 고객사" note={`보유 코드 프로젝트 ${fmt(closedProj)}건 — 회수 검토`} href="/companies" />
            <Alert n={tightSections.length} label="정원 50% 이상 사용 Section" note={tightSections.map((s) => `S${s.section} ${Math.round(s.owned / s.cap * 100)}%`).join(" · ") || "여유 있음"} href="/ownership" />
          </div>
        </Card>
        <Card title="최근 활동 (내부 직원)" hint="시간순">
          <RecentActivity />
        </Card>
      </div>
    </div>
  );
}

function SectionHead({ title, note, href, action }: { title: string; note: string; href: string; action: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "22px 0 10px", paddingBottom: 6, borderBottom: `1px solid ${C.line}` }}>
      <span style={{ fontSize: 14.5, fontWeight: 800, color: C.ink }}>{title}</span>
      <span style={{ fontSize: 11.5, color: C.dim }}>{note}</span>
      <span style={{ flex: 1 }} />
      <Link href={href} style={{ fontSize: 12, color: C.primary, textDecoration: "none" }}>{action} →</Link>
    </div>
  );
}

// 건수가 0이면 회색 처리 — 할 일이 없다는 것도 정보다
function Alert({ n, label, note, href, danger }: { n: number; label: string; note: string; href: string; danger?: boolean }) {
  const on = n > 0;
  const fg = !on ? C.dim : danger ? C.error : C.warning;
  const bg = !on ? C.bg : danger ? C.errorBg : C.warningBg;
  return (
    <Link href={href} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 0", textDecoration: "none", color: "inherit", borderTop: `1px solid ${C.bg}` }}>
      <span style={{ minWidth: 34, textAlign: "center", fontWeight: 800, fontSize: 14, color: fg, background: bg, borderRadius: 7, padding: "3px 6px" }}>{n}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 12.5, color: on ? C.ink : C.dim, fontWeight: on ? 600 : 400 }}>{label}</span>
        <span style={{ display: "block", fontSize: 11, color: C.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{note}</span>
      </span>
      <span style={{ color: TG.light, fontSize: 12 }}>→</span>
    </Link>
  );
}

function RecentActivity() {
  const acts = useActivities().slice(0, 8);
  if (acts.length === 0) return <div style={{ fontSize: 12.5, color: C.dim, padding: "10px 0" }}>기록된 활동이 없습니다. (고객사 수정·코드 할당·프로젝트 등록·티켓 발급·교재 작업·로그인 시 기록)</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {acts.map((a) => {
        const meta = TYPE_META[a.type];
        return (
          <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 12.5 }}>
            <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 11, color: C.dim, width: 74, flex: "none" }}>{a.at.slice(5, 16).replace("T", " ")}</span>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "#fff", background: meta.color, borderRadius: 5, padding: "1px 6px", whiteSpace: "nowrap", flex: "none" }}>{meta.label}</span>
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.detail}</span>
            <span style={{ color: C.sub, flex: "none" }}>{a.actor}</span>
          </div>
        );
      })}
    </div>
  );
}

// value 는 이미 포맷된 문자열 — 금액·퍼센트도 같은 카드를 쓴다
function Kpi({ icon, label, value, sub, tone, href, tag, children }: {
  icon: string; label: string; value: string; sub: string; tone: string; href?: string; tag?: "N Key" | "App Key"; children?: React.ReactNode;
}) {
  const body = (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 12, color: C.sub, display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
          {/* N Key · App Key 구분 꼬리표 `PC-242` */}
          {tag && <span style={{ fontSize: 10.5, fontWeight: 700, borderRadius: 5, padding: "1px 6px",
            background: tag === "N Key" ? C.primaryBg : TB.secondaryLighter, color: tag === "N Key" ? C.primaryDark : C.cyan }}>{tag}</span>}
          {label}
        </div>
        <span style={{ ...S.kpiIcon, background: tone + "18" }}>{icon}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: tone, lineHeight: 1.2, whiteSpace: "nowrap" }}>{value}</div>
      <div style={{ fontSize: 11.5, color: C.dim }}>{sub}</div>
      {children}
    </>
  );
  return href
    ? <Link href={href} style={{ ...S.card, display: "block", textDecoration: "none", color: "inherit" }}>{body}</Link>
    : <div style={S.card}>{body}</div>;
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={S.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <div><span style={{ fontWeight: 700, fontSize: 14 }}>{title}</span>{hint && <span style={{ fontSize: 11.5, color: C.dim, marginLeft: 8 }}>{hint}</span>}</div>
      </div>
      {children}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  kpi3: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 14 },
  kpi5: { display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 14, marginBottom: 14 },   // 정산 — 편집 + N Key 2 + App Key 2 `PC-242`
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, alignItems: "start" },
  card: { background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: "15px 16px" },   // 다른 화면 카드와 같은 모양(ui.tsx S.card)
  kpiIcon: { width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center", fontSize: 15 },
};
