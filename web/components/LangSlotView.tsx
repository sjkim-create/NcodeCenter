"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { S } from "./ui";
import { allLangGroups, hydrateLangGroups, useLangGroups, langRows, type LangGroup } from "@/lib/langGroups";

// 코드 관리 정보 ▸ 확장 언어 슬롯 — **보기 전용** `PC-330`
// 그룹 · 슬롯별 언어의 정본은 고객사 관리 ▸ 공통코드 · 확장 언어 (그룹 먼저) 이고, Owner 연결은 SOBP 맵 할당 창에서 한다.
// 그룹마다 기본 Owner + 확장 Owner 를 Owner 당 4슬롯 카드로 늘어놓는다. 언어가 없는 슬롯은 「사용가능」.
const COLORS = ["#2563eb", "#db2777", "#0e7490", "#7c3aed", "#d97706"];

export default function LangSlotView({ embedded }: { embedded?: boolean }) {
  useLangGroups();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { hydrateLangGroups(); setMounted(true); }, []);
  const groups = mounted ? allLangGroups() : [];
  const [filter, setFilter] = useState<number | "all">("all");
  const shown = groups.filter((g) => filter === "all" || g.id === filter);
  return (
    <div style={{ padding: embedded ? 0 : "20px 22px" }}>
      <p style={{ margin: "0 0 12px", color: "#6b7280", fontSize: 13, lineHeight: 1.7 }}>
        확장 언어 슬롯 — 기본 Owner 에서 언어가 늘면 그룹에 연결된 확장 Owner 의 슬롯을 씁니다. Owner 하나에 4슬롯.
        <br />그룹 · 언어는 <Link href="/companies" style={{ color: "#2563eb" }}>고객사 관리</Link> ▸ 공통코드 · 확장 언어 에서, Owner 연결은 <Link href="/ownership" style={{ color: "#2563eb" }}>SOBP 맵</Link> 할당 창에서 합니다.
      </p>

      {/* 그룹 필터 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {([["all", "전체"] as const, ...groups.map((g) => [g.id, `${g.label} · O${g.base}`] as const)]).map(([v, lab], i) => {
          const on = filter === v;
          const c = v === "all" ? "#374151" : COLORS[(i - 1) % COLORS.length];
          return (
            <button key={String(v)} onClick={() => setFilter(v)}
              style={{ border: `1px solid ${on ? c : "#e5e7eb"}`, background: on ? c : "#fff", color: on ? "#fff" : "#6b7280",
                borderRadius: 8, padding: "5px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
              {lab}
            </button>
          );
        })}
      </div>

      {mounted && groups.length === 0 && <div style={{ ...S.card, padding: 16, color: "#9ca3af", fontSize: 12.5 }}>등록된 확장 언어 그룹이 없습니다.</div>}
      {shown.map((g) => <GroupSection key={g.id} g={g} color={COLORS[groups.indexOf(g) % COLORS.length]} />)}
    </div>
  );
}

function GroupSection({ g, color }: { g: LangGroup; color: string }) {
  const extTxt = g.ext.length ? `O${Math.min(...g.ext)}~O${Math.max(...g.ext)} (${g.ext.length}개)` : "없음";
  return (
    <div style={{ ...S.card, padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <span style={{ background: color, color: "#fff", fontWeight: 700, borderRadius: 6, padding: "3px 10px", fontSize: 12.5 }}>{g.label} · 기본 O{g.base}</span>
        <b style={{ fontSize: 14 }}>확장 언어 슬롯</b>
        <span style={{ color: "#6b7280", fontSize: 12 }}>{g.kind ? `${g.kind} · ` : ""}Section {g.section ?? "미정"} · 기본 {g.base != null ? `O${g.base}` : "미정"} · 확장 {extTxt} · 필요 언어 {g.langCount}개 · 오너당 4슬롯</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(168px, 1fr))", gap: 8 }}>
        {/* 필요한 Owner 수만큼 — 아직 할당 전인 자리도 카드로(고객사 관리에서 미리 넣은 언어) `PC-334` */}
        {langRows(g).map((r) => {
          const o = r.owner;
          const base = r.pos === 0;
          const slots = [0, 1, 2, 3].map((i) => ({ slot: r.start + i, lang: g.langs[r.key]?.[i] ?? "" }));
          return (
            <div key={r.key} style={{ border: `1px ${o == null ? "dashed" : "solid"} #e5e7eb`, borderRadius: 10, overflow: "hidden", background: "#fff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", borderBottom: "1px solid #eef0f4", background: base ? "#eef6ff" : "#fafbfc" }}>
                <b style={{ fontFamily: "ui-monospace,monospace", fontSize: 12.5, color: o == null ? "#9ca3af" : base ? color : "#111827" }}>{o != null ? `O${o}` : "할당 전"}</b>
                {base && <span style={{ ...S.tag, fontSize: 9, background: color, color: "#fff", fontWeight: 700 }}>기본</span>}
                <span style={{ marginLeft: "auto", fontSize: 10, color: "#9ca3af" }}>슬롯 {slots[0].slot}~{slots[3].slot}</span>
              </div>
              <div style={{ padding: "4px 8px 6px" }}>
                {slots.map((s) => (
                  <div key={s.slot} style={{ display: "flex", gap: 6, fontSize: 11.5, padding: "2px 0", alignItems: "baseline" }}>
                    <span style={{ color: "#9ca3af", fontFamily: "ui-monospace,monospace", minWidth: 18, textAlign: "right" }}>{s.slot}</span>
                    <span style={{ color: s.lang.trim() ? "#111827" : "#94a3b8" }}>{s.lang.trim() || "사용가능"}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
