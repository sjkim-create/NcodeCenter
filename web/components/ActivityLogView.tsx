"use client";

import { useMemo, useState } from "react";
import { useActivities, activityStore, TYPE_META, type ActivityType, type Activity } from "@/lib/activityStore";
import { useAuth, currentUser } from "@/lib/authStore";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
const ymd = (iso: string) => iso.slice(0, 10);
const ym = (iso: string) => iso.slice(0, 7);
const hm = (iso: string) => iso.slice(11, 16);

export default function ActivityLogView() {
  const me = currentUser(useAuth());
  const all = useActivities();
  // ⚠ 훅은 조건부 return 앞에서 모두 선언 (로그인 전/후 훅 개수 불일치 크래시 방지)
  const [type, setType] = useState<ActivityType | "__ALL__">("__ALL__");
  const [actor, setActor] = useState<string>("__ALL__");
  // 기본은 **이번 달**만 본다 — 양이 많아 전체를 한 번에 펼치지 않는다 `PC-069`
  const thisMonth = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 7);   // KST
  const [year, setYear] = useState<string>(thisMonth.slice(0, 4));
  const [mm, setMm] = useState<string>(thisMonth.slice(5, 7));   // "01"~"12" · "__ALL__" = 그 해 전체
  const month = year === "__ALL__" ? "__ALL__" : mm === "__ALL__" ? `${year}-` : `${year}-${mm}`;

  const actors = useMemo(() => [...new Set(all.map((a) => a.actor))].sort(), [all]);
  const years = useMemo(() => [...new Set(all.map((a) => a.at.slice(0, 4)))].sort().reverse(), [all]);

  const filtered = useMemo(
    () => all
      .filter((a) => type === "__ALL__" || a.type === type)
      .filter((a) => actor === "__ALL__" || a.actor === actor)
      .filter((a) => month === "__ALL__" || (month.endsWith("-") ? a.at.startsWith(month) : ym(a.at) === month))
      .sort((a, b) => (a.at < b.at ? 1 : -1)),
    [all, type, actor, month]
  );

  // 월 → 일자 → 활동 그룹
  const grouped = useMemo(() => {
    const byMonth = new Map<string, Map<string, Activity[]>>();
    for (const a of filtered) {
      const m = ym(a.at), d = ymd(a.at);
      if (!byMonth.has(m)) byMonth.set(m, new Map());
      const days = byMonth.get(m)!;
      if (!days.has(d)) days.set(d, []);
      days.get(d)!.push(a);
    }
    return byMonth;
  }, [filtered]);

  const typeCount = (t: ActivityType) => all.filter((a) => a.type === t && (actor === "__ALL__" || a.actor === actor) && (month === "__ALL__" || (month.endsWith("-") ? a.at.startsWith(month) : ym(a.at) === month))).length;
  const monthLabel = (m: string) => `${m.slice(0, 4)}년 ${+m.slice(5, 7)}월`;

  // 활동 로그는 ADMIN 전용 (예: sj.kim) — 모든 훅 선언 이후에 분기
  if (me?.role !== "ADMIN") {
    return (
      <div style={{ padding: 40, maxWidth: 560 }}>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 28, textAlign: "center" }}>
          <div style={{ fontSize: 30, marginBottom: 8 }}>🔒</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>접근 권한이 없습니다</div>
          <div style={{ fontSize: 12.5, color: "#6b7280", marginTop: 6 }}>활동 로그는 관리자(ADMIN) 계정만 열람할 수 있습니다.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 22px", maxWidth: 1000 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 0 14px" }}>
        <p style={{ color: "#6b7280", fontSize: 13, margin: 0, flex: 1 }}>
          내부 직원 활동을 <b>월별 · 일자별</b>로 확인. 기본은 <b>이번 달</b>이며 연도·월·직원으로 고른다. · 전체 {all.length.toLocaleString()}건
        </p>
        <button
          onClick={() => { if (confirm("활동 로그를 전부 삭제하고 새로 기록하시겠습니까? (되돌릴 수 없습니다)")) activityStore.clear(); }}
          style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, border: "1px solid #fecaca", background: "#fff", color: "#dc2626", cursor: "pointer", whiteSpace: "nowrap" }}>
          전체 삭제
        </button>
      </div>

      {/* 기간·직원은 **셀렉트** — 데이터가 많아 목록에서 고르는 편이 낫다 `PC-069` */}
      <FilterRow label="기간 · 직원">
        <select value={year} onChange={(e) => setYear(e.target.value)} style={sel} title="연도">
          <option value="__ALL__">전체 연도</option>
          {years.map((y) => <option key={y} value={y}>{y}년</option>)}
          {!years.includes(thisMonth.slice(0, 4)) && <option value={thisMonth.slice(0, 4)}>{thisMonth.slice(0, 4)}년</option>}
        </select>
        <select value={mm} onChange={(e) => setMm(e.target.value)} disabled={year === "__ALL__"} style={{ ...sel, ...(year === "__ALL__" ? { background: "#f3f4f6", color: "#9ca3af" } : {}) }} title="월">
          <option value="__ALL__">전체 월</option>
          {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((m) => (
            <option key={m} value={m}>{+m}월</option>
          ))}
        </select>
        <select value={actor} onChange={(e) => setActor(e.target.value)} style={{ ...sel, minWidth: 130 }} title="직원">
          <option value="__ALL__">직원 전체</option>
          {actors.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <button onClick={() => { setYear(thisMonth.slice(0, 4)); setMm(thisMonth.slice(5, 7)); setActor("__ALL__"); setType("__ALL__"); }}
          style={{ fontSize: 12, padding: "5px 11px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#6b7280", cursor: "pointer" }}>
          이번 달
        </button>
      </FilterRow>

      {/* 활동 종류 필터 */}
      <FilterRow label="활동 종류">
        <Chip active={type === "__ALL__"} onClick={() => setType("__ALL__")}>전체</Chip>
        {(Object.keys(TYPE_META) as ActivityType[]).map((t) => (
          <Chip key={t} active={type === t} onClick={() => setType(type === t ? "__ALL__" : t)}>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: TYPE_META[t].color, marginRight: 5 }} />
            {TYPE_META[t].label} {typeCount(t)}
          </Chip>
        ))}
      </FilterRow>

      <div style={{ fontSize: 12, color: "#9ca3af", margin: "16px 0 10px" }}>조건에 맞는 활동 <b style={{ color: "#374151" }}>{filtered.length.toLocaleString()}</b>건</div>

      {filtered.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 40, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
          해당 조건의 활동이 없습니다. <div style={{ fontSize: 11.5, marginTop: 6 }}>고객사 수정·코드 할당·프로젝트 등록·티켓 발급·교재 추가/작업·로그인 시 자동 기록됩니다.</div>
        </div>
      ) : (
        [...grouped.entries()].map(([m, days]) => {
          const mCount = [...days.values()].reduce((s, d) => s + d.length, 0);
          return (
            <div key={m} style={{ marginBottom: 20 }}>
              {/* 월 헤더 */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>{monthLabel(m)}</div>
                <span style={{ fontSize: 11.5, color: "#9ca3af" }}>{mCount}건</span>
                <div style={{ flex: 1, height: 1, background: "#eef0f4" }} />
              </div>

              {[...days.entries()].map(([d, items]) => {
                const dt = new Date(d + "T00:00:00");
                return (
                  <div key={d} style={{ display: "grid", gridTemplateColumns: "92px 1fr", gap: 14, marginBottom: 12 }}>
                    {/* 일자 */}
                    <div style={{ textAlign: "right", paddingTop: 6 }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#374151", lineHeight: 1 }}>{+d.slice(8, 10)}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{d.slice(0, 7)} · {WEEK[dt.getDay()]}요일</div>
                      <div style={{ fontSize: 10.5, color: "#c0c6d0", marginTop: 2 }}>{items.length}건</div>
                    </div>
                    {/* 활동 카드 */}
                    <div style={{ background: "#fff", border: "1px solid #eef0f4", borderRadius: 12, padding: "6px 4px" }}>
                      {items.map((a, i) => {
                        const meta = TYPE_META[a.type];
                        return (
                          <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 12px", borderTop: i ? "1px solid #f4f6f9" : "none" }}>
                            <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 11.5, color: "#9ca3af", paddingTop: 2, width: 40, flex: "none" }}>{hm(a.at)}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: meta.color, borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap", flex: "none", marginTop: 1 }}>{meta.label}</span>
                            <span style={{ fontSize: 13, color: "#111827", flex: 1 }}>{a.detail}</span>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, color: "#6b7280", whiteSpace: "nowrap", flex: "none" }}><span style={avatar}>{a.actor[0]}</span>{a.actor}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })
      )}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
      <span style={{ fontSize: 11, color: "#9ca3af", width: 60, flex: "none", fontWeight: 600 }}>{label}</span>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 2, fontSize: 12.5, padding: "5px 11px",
      borderRadius: 20, cursor: "pointer",
      border: "1px solid " + (active ? "#5f8ff0" : "#e5e7eb"),
      background: active ? "#5f8ff0" : "#fff", color: active ? "#fff" : "#374151",
    }}>{children}</button>
  );
}

const sel: React.CSSProperties = {
  fontSize: 12.5, padding: "5px 10px", borderRadius: 8, border: "1px solid #e5e7eb",
  background: "#fff", color: "#374151", cursor: "pointer", minWidth: 96,
};

const avatar: React.CSSProperties = {
  display: "inline-grid", placeItems: "center", width: 16, height: 16, borderRadius: "50%",
  background: "#e5e7eb", color: "#374151", fontSize: 9, fontWeight: 700, marginRight: 3,
};
