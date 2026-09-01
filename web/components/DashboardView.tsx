"use client";

// DSH-01 대시보드 — 분야별로 나눠 본다.
//   ① 코드(SOBP)  : 할당율 · Section별 소유 · 업체별 점유
//   ② 편집(CasterN): 고객사·교재 규모 · 진행 상태 · 전용 단가 적용
//   ③ 정산         : 편집 청구액 · 미정산 금액 추정 · 정산 미등록
//   ④ 운영         : 액션 필요 알림 · 최근 활동
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import raw from "@/data/ownership-data.json";
import { useActivities, TYPE_META } from "@/lib/activityStore";
import { useStore } from "@/lib/store";
import { EDIT_CUSTOMERS } from "@/lib/editingData";
import { loadCustomCustomers, type EditCustomer } from "@/lib/editingCustomers";
import { rateOf, settle, won, customRateCount } from "@/lib/pricing";
import { allTickets, hydrateTickets, useTickets, daysLeft } from "@/lib/ticketStore";
import { useCaster } from "@/lib/accountStore";

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
const maxSec = Math.max(1, ...sectionStats.map((s) => s.owned));
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
const sumOf = (a?: number[]) => (a ?? []).reduce((x, y) => x + y, 0);
type BRow = { pg?: number; sm?: number[]; pm?: number[]; pu?: number; su?: number; dcRate?: number; dcAmt?: number; use?: string };
const stateOf = (v?: string) => (v === "완료" || v === "보류" ? v : "진행중");
const ST_TONE: Record<string, string> = { 진행중: "#5f8ff0", 완료: "#22c55e", 보류: "#f59e0b" };

export default function DashboardView() {
  const { companies, projects } = useStore();
  useTickets();
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

  /* ── ③ 정산 ── */
  const bill = useMemo(() => {
    const tickets = allTickets();
    const paid = tickets.filter((t) => t.billing === "유료" && t.amount > 0);
    const avg = paid.length ? Math.round(paid.reduce((a, t) => a + t.amount, 0) / paid.length) : 0;
    // 고객사별 최근 유료 금액 — 미정산 추정의 1순위 기준
    const lastOf = new Map<string, number>();
    [...paid].sort((a, b) => (a.at < b.at ? 1 : -1)).forEach((t) => { if (!lastOf.has(t.company)) lastOf.set(t.company, t.amount); });
    const todo = tickets.filter((t) => t.billing === "미정");
    let est = 0, byCo = 0, byAvg = 0;
    todo.forEach((t) => {
      const own = lastOf.get(t.company);
      if (own) { est += own; byCo++; } else if (avg) { est += avg; byAvg++; }
    });
    const free = tickets.filter((t) => t.billing === "무료").length;
    const trial = tickets.filter((t) => t.billing === "체험");
    return {
      total: tickets.length, paidN: paid.length, paidAmt: paid.reduce((a, t) => a + t.amount, 0),
      freeN: free, trialN: trial.length, todoN: todo.length, est, byCo, byAvg, avg,
      expired: trial.filter((t) => (daysLeft(t.trialUntil) ?? 0) < 0).length,
      soon: trial.filter((t) => { const d = daysLeft(t.trialUntil); return d != null && d >= 0 && d <= 7; }).length,
    };
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  /* ── ④ 운영 알림 ── */
  const noKey = cast.accounts.filter((a) => !cast.appKeys.some((k) => k.accountId === a.id)).length;
  const closedCo = companies.filter((c) => c.closed).length;
  const closedProj = projects.filter((p) => companies.find((c) => c.id === p.companyId)?.closed).length;

  return (
    <div style={{ padding: "20px 22px" }}>

      {/* ① 코드 (SOBP) */}
      <SectionHead title="코드 (SOBP)" note="발급 여력과 점유 분포" href="/ownership" action="SOBP 맵" />
      <div style={S.kpi3}>
        <Kpi icon="🗺" label="코드 할당율" value={pct1(allocRate)} sub={`owner 정원 ${fmt(ownerCap)} 기준`} tone="#8b7ff0" href="/ownership">
          <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", background: "#eceafd", marginTop: 6 }}>
            <div style={{ width: `${Math.min(100, allocRate)}%`, background: "#8b7ff0" }} />
          </div>
        </Kpi>
        <Kpi icon="🧩" label="발급 owner" value={fmt(ownerUsed)} sub={`레코드 ${fmt(DATA.meta.records)}건 · 업체 ${fmt(DATA.meta.account_count)}곳`} tone="#5f8ff0" href="/projects" />
        <Kpi icon="🕳" label="미발급 owner" value={fmt(ownerFree)} sub={tightSections.length ? `Section ${tightSections[0].section} 사용률 ${pct1(tightSections[0].owned / tightSections[0].cap * 100)}` : "여유 있음"} tone="#94a3b8" href="/ownership" />
      </div>
      <div style={S.grid2}>
        <Card title="Section별 소유 현황" hint="소유 owner / 정원">
          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 4 }}>
            {sectionStats.map((s) => {
              const use = s.cap ? (s.owned / s.cap) * 100 : 0;
              const hot = use >= 50;
              return (
                <div key={s.section} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 92, fontSize: 12.5, flex: "none" }}>
                    Section {s.section}
                    {s.test_dev ? <span style={S.testdev} title="상용 미출시 · 개발/테스트 전용">테스트/개발</span>
                      : s.legacy ? <span style={S.legacy}>레거시</span> : null}
                  </div>
                  <div style={{ flex: 1, display: "flex", height: 16, borderRadius: 5, overflow: "hidden", background: "#f1f3f7" }}>
                    <div title={`소유 owner ${s.owned} / 정원 ${s.cap}`} style={{ width: `${(s.owned / maxSec) * 100}%`, background: hot ? "#f59e0b" : "#5f8ff0" }} />
                  </div>
                  <div style={{ width: 108, textAlign: "right", fontSize: 12, color: "#6b7280", flex: "none" }}>
                    {fmt(s.owned)}<span style={{ color: "#c7cbd4", fontSize: 11 }}> / {fmt(s.cap)}</span>
                    {hot && <span style={{ color: "#b45309", fontWeight: 700, fontSize: 11 }}> {Math.round(use)}%</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card title="업체별 점유 Top 10" hint="소유 owner 수">
          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 4 }}>
            {topAccounts.map((a, i) => (
              <div key={a.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 20, color: "#9ca3af", fontSize: 12, flex: "none" }}>{i + 1}</div>
                <div style={{ width: 130, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: "none" }} title={a.name}>{a.name}</div>
                <div style={{ flex: 1, height: 14, borderRadius: 5, background: "#f1f3f7", overflow: "hidden" }}>
                  <div style={{ width: `${(a.owners / maxAcc) * 100}%`, height: "100%", background: `hsl(${(i * 42) % 360} 62% 55%)` }} />
                </div>
                <div style={{ width: 62, textAlign: "right", fontSize: 12, color: "#6b7280", flex: "none" }}>owner {a.owners}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ② 편집 (CasterN) */}
      <SectionHead title="편집 (CasterN)" note="편집 프로젝트 규모와 진행 상태" href="/projects/editing" action="편집 프로젝트" />
      <div style={S.kpi3}>
        <Kpi icon="🎬" label="CasterN 고객사" value={fmt(edit.custs)} sub={`편집 교재 ${fmt(edit.books)}권`} tone="#5f8ff0" href="/projects/editing" />
        <Kpi icon="✅" label="편집 완료 교재" value={fmt(edit.st.완료)} sub={`전체 ${fmt(edit.books)}권 중 ${edit.books ? pct1(edit.st.완료 / edit.books * 100) : "0%"}`} tone="#22c55e" href="/projects/editing" />
        <Kpi icon="💵" label="전용 단가 고객사" value={fmt(edit.rateCusts)} sub={`전체 고객사 ${fmt(companies.length)}곳 중`} tone="#b45309" href="/companies" />
      </div>
      <Card title="편집 진행 상태 분포" hint={`교재 ${fmt(edit.books)}권`}>
        <div style={{ display: "flex", height: 22, borderRadius: 6, overflow: "hidden", background: "#f1f3f7", marginBottom: 12 }}>
          {(["진행중", "완료", "보류"] as const).map((k) => {
            const n = edit.st[k]; if (!n) return null;
            return <div key={k} title={`${k} ${fmt(n)}권`} style={{ width: `${(n / Math.max(1, edit.books)) * 100}%`, background: ST_TONE[k] }} />;
          })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {(["진행중", "완료", "보류"] as const).map((k) => (
            <div key={k} style={{ border: "1px solid #eef0f4", borderRadius: 9, padding: "9px 11px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280" }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: ST_TONE[k], flex: "none" }} />{k}
              </div>
              <div style={{ fontSize: 19, fontWeight: 800, color: ST_TONE[k], marginTop: 2 }}>{fmt(edit.st[k])}</div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>{edit.books ? pct1(edit.st[k] / edit.books * 100) : "0%"}</div>
            </div>
          ))}
        </div>
        {edit.st.완료 === 0 && edit.st.보류 === 0 && (
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 10, lineHeight: 1.6 }}>
            시드 데이터에는 진행 상태 값이 없어 전부 <b>진행중</b>으로 집계됩니다. 편집 상세에서 교재 상태를 바꾸면 여기에 반영됩니다.
          </div>
        )}
      </Card>

      {/* ③ 정산 */}
      <SectionHead title="정산" note="편집 청구액과 Key 발급 과금" href="/tickets/nkey" action="N Key 관리" />
      <div style={S.kpi3}>
        <Kpi icon="💰" label="편집 비용 청구액" value={won(edit.cost)}
          sub={edit.listed > edit.cost ? `정가 ${won(edit.listed)} · 할인 −${won(edit.listed - edit.cost)}` : "할인 없음"}
          tone="#14b8a6" href="/projects/editing" />
        <Kpi icon="❓" label="미정산 금액 추정" value={bill.est ? `~${won(bill.est)}` : "—"}
          sub={bill.todoN ? `미정 ${fmt(bill.todoN)}건 · 고객사 단가 ${bill.byCo} / 평균 ${bill.byAvg}` : "미정산 없음"}
          tone={bill.todoN ? "#dc2626" : "#9ca3af"} href="/tickets/nkey" />
        <Kpi icon="🧾" label="Key 발급 정산" value={won(bill.paidAmt)}
          sub={`유료 ${bill.paidN} · 무료 ${bill.freeN} · 체험 ${bill.trialN} · 미정 ${bill.todoN}`}
          tone="#1d4ed8" href="/tickets/nkey" />
      </div>

      {/* ④ 운영 */}
      <SectionHead title="운영" note="확인·처리가 필요한 항목" href="/activity" action="전체 로그" />
      <div style={S.grid2}>
        <Card title="운영 알림">
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Alert n={bill.todoN} label="정산 미등록 티켓" note={bill.est ? `추정 ${won(bill.est)} — 과금 유형 미정` : "발급했지만 과금 유형이 미정"} href="/tickets/nkey" />
            <Alert n={bill.expired} label="체험 기간 만료" note="유료 전환 또는 회수 확인" href="/tickets/nkey" danger />
            <Alert n={bill.soon} label="체험 만료 임박 (7일 내)" note="사전 안내 대상" href="/tickets/nkey" />
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
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "22px 0 10px", paddingBottom: 6, borderBottom: "1px solid #eef0f4" }}>
      <span style={{ fontSize: 14.5, fontWeight: 800, color: "#111827" }}>{title}</span>
      <span style={{ fontSize: 11.5, color: "#9ca3af" }}>{note}</span>
      <span style={{ flex: 1 }} />
      <Link href={href} style={{ fontSize: 12, color: "#5f8ff0", textDecoration: "none" }}>{action} →</Link>
    </div>
  );
}

// 건수가 0이면 회색 처리 — 할 일이 없다는 것도 정보다
function Alert({ n, label, note, href, danger }: { n: number; label: string; note: string; href: string; danger?: boolean }) {
  const on = n > 0;
  const fg = !on ? "#9ca3af" : danger ? "#b91c1c" : "#92400e";
  const bg = !on ? "#f3f4f6" : danger ? "#fef2f2" : "#fef3c7";
  return (
    <Link href={href} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 0", textDecoration: "none", color: "inherit", borderTop: "1px solid #f5f6f8" }}>
      <span style={{ minWidth: 34, textAlign: "center", fontWeight: 800, fontSize: 14, color: fg, background: bg, borderRadius: 7, padding: "3px 6px" }}>{n}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 12.5, color: on ? "#111827" : "#9ca3af", fontWeight: on ? 600 : 400 }}>{label}</span>
        <span style={{ display: "block", fontSize: 11, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{note}</span>
      </span>
      <span style={{ color: "#d1d5db", fontSize: 12 }}>→</span>
    </Link>
  );
}

function RecentActivity() {
  const acts = useActivities().slice(0, 8);
  if (acts.length === 0) return <div style={{ fontSize: 12.5, color: "#9ca3af", padding: "10px 0" }}>기록된 활동이 없습니다. (고객사 수정·코드 할당·프로젝트 등록·티켓 발급·교재 작업·로그인 시 기록)</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {acts.map((a) => {
        const meta = TYPE_META[a.type];
        return (
          <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 12.5 }}>
            <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 11, color: "#9ca3af", width: 74, flex: "none" }}>{a.at.slice(5, 16).replace("T", " ")}</span>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "#fff", background: meta.color, borderRadius: 5, padding: "1px 6px", whiteSpace: "nowrap", flex: "none" }}>{meta.label}</span>
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.detail}</span>
            <span style={{ color: "#6b7280", flex: "none" }}>{a.actor}</span>
          </div>
        );
      })}
    </div>
  );
}

// value 는 이미 포맷된 문자열 — 금액·퍼센트도 같은 카드를 쓴다
function Kpi({ icon, label, value, sub, tone, href, children }: {
  icon: string; label: string; value: string; sub: string; tone: string; href?: string; children?: React.ReactNode;
}) {
  const body = (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 12, color: "#6b7280" }}>{label}</div>
        <span style={{ ...S.kpiIcon, background: tone + "18" }}>{icon}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: tone, lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: 11.5, color: "#9ca3af" }}>{sub}</div>
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
        <div><span style={{ fontWeight: 700, fontSize: 14 }}>{title}</span>{hint && <span style={{ fontSize: 11.5, color: "#9ca3af", marginLeft: 8 }}>{hint}</span>}</div>
      </div>
      {children}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  kpi3: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 14 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, alignItems: "start" },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "15px 16px" },
  kpiIcon: { width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center", fontSize: 15 },
  legacy: { fontSize: 9, color: "#92400e", background: "#fef3c7", borderRadius: 4, padding: "0 4px", marginLeft: 4 },
  testdev: { fontSize: 9, color: "#6d5bd0", background: "#eceafd", borderRadius: 4, padding: "0 4px", marginLeft: 4 },
};
