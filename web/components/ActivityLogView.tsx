"use client";

import { useMemo, useState } from "react";
import { useActivities, activityStore, TYPE_META, type ActivityType, type Activity } from "@/lib/activityStore";
import { useAuth, currentUser } from "@/lib/authStore";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
const ymd = (iso: string) => iso.slice(0, 10);
const hm = (iso: string) => iso.slice(11, 16);

// 활동 로그 — **주 / 월 달력** + 오른쪽 상세 `PC-251` `PC-252`
//   왼쪽: [주] = 한 주(일~토) 7칸 / [월] = 그 달 달력(앞뒤 주 포함 6줄). 칸마다 건수와 **활동 종류별 색**(색 막대 + 색 점)
//   오른쪽: 고른 날의 활동을 시간순으로(시각 · 종류 · 내용 · 직원)
//   기록은 한 달 보관 — ‹ › 로 지난 주 · 지난 달을 넘겨 본다. 처음엔 이번 주 · 오늘
const DAY_MS = 86400000;
const kstToday = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const addDays = (d: string, n: number) => new Date(Date.parse(d + "T00:00:00Z") + n * DAY_MS).toISOString().slice(0, 10);
const weekStartOf = (d: string) => addDays(d, -new Date(d + "T00:00:00Z").getUTCDay());   // 그 주 일요일
const md = (d: string) => `${+d.slice(5, 7)}.${+d.slice(8, 10)}`;
const monthStartOf = (d: string) => d.slice(0, 8) + "01";
const addMonths = (d: string, n: number) => {   // 그 달 1일 기준
  const y = +d.slice(0, 4), m = +d.slice(5, 7) - 1 + n;
  return new Date(Date.UTC(y + Math.floor(m / 12), ((m % 12) + 12) % 12, 1)).toISOString().slice(0, 10);
};

export default function ActivityLogView() {
  const me = currentUser(useAuth());
  const all = useActivities();
  // ⚠ 훅은 조건부 return 앞에서 모두 선언 (로그인 전/후 훅 개수 불일치 크래시 방지)
  const today = kstToday();
  const [type, setType] = useState<ActivityType | "__ALL__">("__ALL__");
  const [actor, setActor] = useState<string>("__ALL__");
  const [view, setView] = useState<"week" | "month">("week");     // 주 / 월 보기 `PC-252`
  const [week, setWeek] = useState<string>(weekStartOf(today));   // 주 보기 — 그 주 일요일
  const [month, setMonth] = useState<string>(monthStartOf(today)); // 월 보기 — 그 달 1일
  const [day, setDay] = useState<string>(today);                  // 오른쪽 상세에 보는 날

  const actors = useMemo(() => [...new Set(all.map((a) => a.actor))].sort(), [all]);
  const days7 = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(week, i)), [week]);
  const weekEnd = days7[6];
  // 월 보기 칸 — 그 달 1일이 든 주 일요일부터 6주(42칸)
  const monthEnd = addDays(addMonths(month, 1), -1);
  const cells = useMemo(() => view === "week" ? days7 : Array.from({ length: 42 }, (_, i) => addDays(weekStartOf(month), i)), [view, days7, month]);
  // 보는 기간 — 주 = 그 주, 월 = 그 달
  const from = view === "week" ? week : month, to = view === "week" ? weekEnd : monthEnd;
  // 기간 · 직원으로 거른 것(종류 칩 건수용) → 종류까지 거른 것(달력 · 상세용)
  const inWeek = useMemo(() => all.filter((a) => ymd(a.at) >= from && ymd(a.at) <= to)
    .filter((a) => actor === "__ALL__" || a.actor === actor), [all, from, to, actor]);
  const shown = useMemo(() => inWeek.filter((a) => type === "__ALL__" || a.type === type), [inWeek, type]);
  const byDay = useMemo(() => {
    const m = new Map<string, Activity[]>();
    for (const a of shown) { const d = ymd(a.at); if (!m.has(d)) m.set(d, []); m.get(d)!.push(a); }
    for (const l of m.values()) l.sort((x, y) => (x.at < y.at ? 1 : -1));
    return m;
  }, [shown]);
  const typeCount = (t: ActivityType) => inWeek.filter((a) => a.type === t).length;
  const goWeek = (n: number) => { const w = addDays(week, n * 7); setWeek(w); setDay(w <= today && today <= addDays(w, 6) ? today : w); };
  const goMonth = (n: number) => { const m = addMonths(month, n); setMonth(m); setDay(monthStartOf(today) === m ? today : m); };
  const go = (n: number) => (view === "week" ? goWeek(n) : goMonth(n));
  const toNow = () => { setWeek(weekStartOf(today)); setMonth(monthStartOf(today)); setDay(today); };
  // 보기를 바꾸면 고른 날이 든 주 / 달로
  const switchView = (v: "week" | "month") => { setView(v); setWeek(weekStartOf(day)); setMonth(monthStartOf(day)); };
  const dayItems = byDay.get(day) ?? [];
  const TYPES = Object.keys(TYPE_META) as ActivityType[];

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
    <div style={{ padding: "20px 22px", maxWidth: 1280 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 0 14px" }}>
        <p style={{ color: "#6b7280", fontSize: 13, margin: 0, flex: 1 }}>
          내부 직원 활동을 <b>주 · 월 달력</b>으로 보고, 날짜를 누르면 오른쪽에 그날 활동이 나온다. 기록은 <b>한 달</b> 보관 · 전체 {all.length.toLocaleString()}건
        </p>
        <button
          onClick={() => { if (confirm("활동 로그를 전부 삭제하고 새로 기록하시겠습니까? (되돌릴 수 없습니다)")) activityStore.clear(); }}
          style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, border: "1px solid #fecaca", background: "#fff", color: "#dc2626", cursor: "pointer", whiteSpace: "nowrap" }}>
          전체 삭제
        </button>
      </div>

      {/* 기간 — [주] [월] 보기 · 앞뒤 이동 · [이번 주]/[이번 달] `PC-252` */}
      <FilterRow label="기간 · 직원">
        <span style={{ display: "inline-flex", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          {(["week", "month"] as const).map((v, i) => (
            <button key={v} type="button" onClick={() => switchView(v)}
              style={{ border: 0, borderLeft: i ? "1px solid #e5e7eb" : 0, padding: "5px 12px", fontSize: 12.5, cursor: "pointer",
                fontWeight: view === v ? 700 : 400, background: view === v ? "#eef6ff" : "#fff", color: view === v ? "#1d4ed8" : "#6b7280" }}>{v === "week" ? "주" : "월"}</button>
          ))}
        </span>
        <button onClick={() => go(-1)} style={navBtn} title={view === "week" ? "지난 주" : "지난 달"}>‹</button>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#111827", minWidth: 190, textAlign: "center" }}>
          {view === "week" ? `${week.slice(0, 4)}. ${md(week)} (일) ~ ${md(weekEnd)} (토)` : `${month.slice(0, 4)}년 ${+month.slice(5, 7)}월`}
        </span>
        <button onClick={() => go(1)} style={navBtn} title={view === "week" ? "다음 주" : "다음 달"}>›</button>
        <button onClick={toNow}
          style={{ fontSize: 12, padding: "5px 11px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#6b7280", cursor: "pointer" }}>{view === "week" ? "이번 주" : "이번 달"}</button>
        <select value={actor} onChange={(e) => setActor(e.target.value)} style={{ ...sel, minWidth: 130, marginLeft: 8 }} title="직원">
          <option value="__ALL__">직원 전체</option>
          {actors.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </FilterRow>

      {/* 활동 종류 — 건수는 보는 기간(주 · 달) · 직원 기준 */}
      <FilterRow label="활동 종류">
        <Chip active={type === "__ALL__"} onClick={() => setType("__ALL__")}>전체 {inWeek.length}</Chip>
        {TYPES.map((t) => (
          <Chip key={t} active={type === t} onClick={() => setType(type === t ? "__ALL__" : t)}>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: TYPE_META[t].color, marginRight: 5 }} />
            {TYPE_META[t].label} {typeCount(t)}
          </Chip>
        ))}
      </FilterRow>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.25fr) minmax(0, 1fr)", gap: 16, marginTop: 14, alignItems: "start" }}>
        {/* ① 주 / 월 달력 */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 10 }}>
          {view === "month" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6, marginBottom: 6 }}>
              {WEEK.map((w, i) => <div key={w} style={{ textAlign: "center", fontSize: 11, color: i === 0 ? "#e05b50" : i === 6 ? "#3d96ce" : "#9ca3af" }}>{w}</div>)}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6 }}>
            {cells.map((d, i) => {
              const items = byDay.get(d) ?? [];
              const on = d === day, isToday = d === today, future = d > today;
              const outside = view === "month" && (d < month || d > monthEnd);   // 그 달 밖 날
              const compact = view === "month";
              const counts = TYPES.map((t) => [t, items.filter((a) => a.type === t).length] as const).filter(([, n]) => n > 0);
              return (
                <button key={d} type="button" onClick={() => setDay(d)} disabled={future}
                  style={{ display: "flex", flexDirection: "column", gap: compact ? 4 : 6, minHeight: compact ? 92 : 210, padding: compact ? "6px 6px" : "8px 7px", borderRadius: 10, textAlign: "left", cursor: future ? "default" : "pointer",
                    border: `1.5px solid ${on ? "#5f8ff0" : "#eef0f4"}`, background: on ? "#f0f5fe" : future || outside ? "#fafbfc" : "#fff", opacity: future ? 0.55 : outside ? 0.45 : 1 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    {!compact && <span style={{ fontSize: 11, color: i === 0 ? "#e05b50" : i === 6 ? "#3d96ce" : "#9ca3af" }}>{WEEK[i]}</span>}
                    <span style={{ fontSize: compact ? 13.5 : 18, fontWeight: 800, color: isToday ? "#fff" : "#111827", background: isToday ? "#5f8ff0" : "transparent", borderRadius: 7, padding: isToday ? "0 6px" : 0 }}>{+d.slice(8, 10)}</span>
                    {compact && items.length > 0 && <span style={{ marginLeft: "auto", fontSize: 10.5, color: "#374151", fontWeight: 600 }}>{items.length}</span>}
                  </div>
                  {!compact && <div style={{ fontSize: 11.5, color: items.length ? "#374151" : "#c0c6d0", fontWeight: 600 }}>{items.length ? `${items.length}건` : "—"}</div>}
                  {/* 종류별 색 막대 — 그날 비율 */}
                  {items.length > 0 && (
                    <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", background: "#f1f3f7" }}>
                      {counts.map(([t, n]) => <div key={t} title={`${TYPE_META[t].label} ${n}건`} style={{ width: `${(n / items.length) * 100}%`, background: TYPE_META[t].color }} />)}
                    </div>
                  )}
                  {/* 종류별 색 점 · 건수 — 월 보기는 점만(칸이 좁다) */}
                  {compact ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                      {counts.map(([t, n]) => <span key={t} title={`${TYPE_META[t].label} ${n}건`} style={{ width: 8, height: 8, borderRadius: "50%", background: TYPE_META[t].color }} />)}
                    </div>
                  ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {counts.map(([t, n]) => (
                      <span key={t} title={TYPE_META[t].label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10.5, color: "#4b5563", whiteSpace: "nowrap", overflow: "hidden" }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: TYPE_META[t].color, flex: "none" }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{TYPE_META[t].label}</span>
                        <b style={{ marginLeft: "auto" }}>{n}</b>
                      </span>
                    ))}
                  </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ② 고른 날의 상세 */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "12px 4px 6px", minHeight: 230 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "0 12px 8px", borderBottom: "1px solid #eef0f4" }}>
            <b style={{ fontSize: 15, color: "#111827" }}>{+day.slice(5, 7)}월 {+day.slice(8, 10)}일 ({WEEK[new Date(day + "T00:00:00Z").getUTCDay()]})</b>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>{dayItems.length}건{type !== "__ALL__" ? ` · ${TYPE_META[type].label}` : ""}{actor !== "__ALL__" ? ` · ${actor}` : ""}</span>
          </div>
          {dayItems.length === 0 ? (
            <div style={{ padding: "40px 12px", textAlign: "center", color: "#9ca3af", fontSize: 12.5 }}>이 날 활동이 없습니다.</div>
          ) : dayItems.map((a, i) => {
            const meta = TYPE_META[a.type];
            return (
              // 시각 · 종류 · 내용 / 직원 — 열 너비 고정 `PC-073`
              <div key={a.id} style={{ display: "grid", gridTemplateColumns: "44px 84px 1fr", alignItems: "start", gap: 10, padding: "9px 12px", borderTop: i ? "1px solid #f4f6f9" : "none" }}>
                <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 11.5, color: "#9ca3af", paddingTop: 3 }}>{hm(a.at)}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: meta.color, borderRadius: 6, padding: "3px 0", marginTop: 1, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={meta.label}>{meta.label}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ fontSize: 13, color: "#111827", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "break-word" }} title={a.detail}>{a.detail}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, color: "#6b7280", marginTop: 2 }}><span style={avatar}>{a.actor[0]}</span>{a.actor}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
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

const navBtn: React.CSSProperties = {
  fontSize: 13, width: 28, height: 28, borderRadius: 8, border: "1px solid #e5e7eb",
  background: "#fff", color: "#374151", cursor: "pointer", lineHeight: 1,
};
const navOff: React.CSSProperties = { color: "#d1d5db", cursor: "not-allowed" };

const sel: React.CSSProperties = {
  fontSize: 12.5, padding: "5px 10px", borderRadius: 8, border: "1px solid #e5e7eb",
  background: "#fff", color: "#374151", cursor: "pointer", minWidth: 96,
};

const avatar: React.CSSProperties = {
  display: "inline-grid", placeItems: "center", width: 16, height: 16, borderRadius: "50%",
  background: "#e5e7eb", color: "#374151", fontSize: 9, fontWeight: 700, marginRight: 3,
};
