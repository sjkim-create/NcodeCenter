"use client";

import raw from "@/data/ownership-data.json";
import { useActivities, TYPE_META } from "@/lib/activityStore";

type Rec = { owner: number; product: string; account: string };
type Section = { section: number; legacy: boolean; test_dev?: boolean; owned?: number; records: Rec[] };
type Data = {
  sections: Section[];
  accounts: { name: string; owners: number; books: number }[];
  meta: { records: number; account_count: number };
};
const DATA = raw as unknown as Data;

const fmt = (n: number) => n.toLocaleString();

// 코드는 모두 '할당됨'(발급) — 예약/사용중 구분 없음(PC-004). Section별 소유 owner 수.
const sectionStats = DATA.sections.map((s) => ({
  section: s.section,
  legacy: s.legacy,
  test_dev: s.test_dev,
  owned: s.owned ?? new Set(s.records.map((r) => r.owner)).size,
}));
const maxSec = Math.max(1, ...sectionStats.map((s) => s.owned));
const totalBooks = DATA.accounts.reduce((n, a) => n + (a.books || 0), 0);
const topAccounts = DATA.accounts.slice(0, 6);
const maxAcc = Math.max(1, ...topAccounts.map((a) => a.owners));

export default function DashboardView() {
  return (
    <div style={{ padding: "20px 22px" }}>
      {/* KPI — 모두 '할당됨' 기준 규모 */}
      <div style={S.kpiRow}>
        <Kpi icon="🧩" label="할당 코드 레코드" value={DATA.meta.records} sub="Owner×Book 원장 (모두 발급)" tone="#5f8ff0" />
        <Kpi icon="🏢" label="업체(ACCOUNT)" value={DATA.meta.account_count} sub="등록 업체" tone="#5cb4e6" />
        <Kpi icon="📚" label="할당 Book 합계" value={totalBooks} sub="발급된 book 총량" tone="#14b8a6" />
        <Kpi icon="🗂" label="코드 섹션" value={DATA.sections.length} sub="Section 수" tone="#8b7ff0" />
      </div>

      <div style={S.grid}>
        {/* Left */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <Card title="Section별 소유 현황" hint="소유 owner 수 (모두 할당됨)">
            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 4 }}>
              {sectionStats.map((s) => (
                <div key={s.section} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 92, fontSize: 12.5, flex: "none" }}>
                    Section {s.section}
                    {s.test_dev ? (
                      <span style={S.testdev} title="상용 미출시 · 개발/테스트 전용">테스트/개발</span>
                    ) : s.legacy ? (
                      <span style={S.legacy}>레거시</span>
                    ) : null}
                  </div>
                  <div style={{ flex: 1, display: "flex", height: 16, borderRadius: 5, overflow: "hidden", background: "#f1f3f7" }}>
                    <div title={`소유 owner ${s.owned}`} style={{ width: `${(s.owned / maxSec) * 100}%`, background: "#5f8ff0" }} />
                  </div>
                  <div style={{ width: 60, textAlign: "right", fontSize: 12, color: "#6b7280", flex: "none" }}>{fmt(s.owned)}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="업체별 점유 Top 6" hint="소유 owner 수">
            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 4 }}>
              {topAccounts.map((a, i) => (
                <div key={a.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 20, color: "#9ca3af", fontSize: 12, flex: "none" }}>{i + 1}</div>
                  <div style={{ width: 150, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: "none" }}>{a.name}</div>
                  <div style={{ flex: 1, height: 14, borderRadius: 5, background: "#f1f3f7", overflow: "hidden" }}>
                    <div style={{ width: `${(a.owners / maxAcc) * 100}%`, height: "100%", background: `hsl(${(i * 42) % 360} 62% 55%)` }} />
                  </div>
                  <div style={{ width: 64, textAlign: "right", fontSize: 12, color: "#6b7280", flex: "none" }}>owner {a.owners}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card title="코드 상태" hint="할당됨 / 미발급">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ ...S.dot, background: "#5f8ff0" }} />
                <span style={{ fontSize: 13 }}>할당됨(발급)</span>
                <b style={{ marginLeft: "auto", fontSize: 15 }}>{fmt(DATA.meta.records)}</b>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ ...S.dot, background: "#d1d5db" }} />
                <span style={{ fontSize: 13, color: "#6b7280" }}>미발급 (섹션 정원의 잔여)</span>
              </div>
              <div style={{ fontSize: 11.5, color: "#9ca3af", lineHeight: 1.5, borderTop: "1px solid #f1f3f7", paddingTop: 8 }}>
                코드 상태는 <b>할당됨 / 미발급</b> 두 가지입니다. 예약(선점) vs 사용중 구분은 폐기되었습니다.
              </div>
            </div>
          </Card>

          <Card title="최근 활동 (내부 직원)" hint="시간순" action="전체 로그">
            <RecentActivity />
          </Card>
        </div>
      </div>
    </div>
  );
}

function RecentActivity() {
  const acts = useActivities().slice(0, 7);
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

function Kpi({ icon, label, value, sub, tone }: { icon: string; label: string; value: number; sub: string; tone: string }) {
  return (
    <div style={S.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 12, color: "#6b7280" }}>{label}</div>
        <span style={{ ...S.kpiIcon, background: tone + "18" }}>{icon}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4, color: tone }}>{fmt(value)}</div>
      <div style={{ fontSize: 11.5, color: "#9ca3af" }}>{sub}</div>
    </div>
  );
}

function Card({ title, hint, action, children }: { title: string; hint?: string; action?: string; children: React.ReactNode }) {
  return (
    <div style={S.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <div><span style={{ fontWeight: 700, fontSize: 14 }}>{title}</span>{hint && <span style={{ fontSize: 11.5, color: "#9ca3af", marginLeft: 8 }}>{hint}</span>}</div>
        {action && <span style={{ fontSize: 12, color: "#5f8ff0", cursor: "pointer" }}>{action} →</span>}
      </div>
      {children}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  kpiRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 16 },
  grid: { display: "grid", gridTemplateColumns: "1fr 360px", gap: 16, alignItems: "start" },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "15px 16px" },
  kpiIcon: { width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center", fontSize: 15 },
  dot: { display: "inline-block", width: 9, height: 9, borderRadius: "50%", marginRight: 6, verticalAlign: 0 },
  legacy: { fontSize: 9, color: "#92400e", background: "#fef3c7", borderRadius: 4, padding: "0 4px", marginLeft: 4 },
  testdev: { fontSize: 9, color: "#6d5bd0", background: "#eceafd", borderRadius: 4, padding: "0 4px", marginLeft: 4 },
};
