"use client";

import { useState } from "react";
import { S } from "./ui";

// NSP 파일 「Common 추가 언어 슬롯 (964~983)」·「Cake (984~1003)」 시트의 코드 정리(언어 슬롯 매핑) 참조.
// 프로젝트(Common·Cake)별로 기본 오너 + 확장 오너를 오너당 4슬롯 카드로 표기. 언어 미지정 슬롯은 '사용가능'으로 노출.

type ProjCfg = {
  project: string; color: string; pds: string; baseOwner: number; baseLangs: string[];
  extOwners: number[]; known: Record<number, string[]>; extLabel: string;
};

const PROJECTS: ProjCfg[] = [
  {
    project: "Common", color: "#2563eb", pds: "PDS2 (Gcode)", baseOwner: 21,
    baseLangs: ["한국어", "영어", "중국어", "일본어"],
    extOwners: Array.from({ length: 983 - 964 + 1 }, (_, i) => 964 + i),  // O964~O983 (오름차순)
    known: { 964: ["베트남어", "러시아어", "몽골어", "캄보디아어(크메르어)"], 965: ["스리랑카어", "필리핀어(따갈로그어)"] },
    extLabel: "O964~O983",
  },
  {
    project: "Cake", color: "#db2777", pds: "PDS3 (Ncode)", baseOwner: 1009,
    baseLangs: ["한국어", "영어", "일본어", "스페인어"],
    extOwners: Array.from({ length: 1003 - 984 + 1 }, (_, i) => 1003 - i),  // O1003~O984 (내림차순)
    known: { 1003: ["BTS", "중국어", "인도네시아어", "러시아어"] },
    extLabel: "O1003~O984 (내림차순)",
  },
];

type OwnerCard = { owner: number; base: boolean; slots: { slot: number; lang: string }[] };
function buildOwners(cfg: ProjCfg): OwnerCard[] {
  const out: OwnerCard[] = [];
  let n = 1;
  const push = (owner: number, base: boolean, langs: string[]) => {
    out.push({ owner, base, slots: Array.from({ length: 4 }, (_, i) => ({ slot: n++, lang: langs[i] || "" })) });
  };
  push(cfg.baseOwner, true, cfg.baseLangs);
  for (const o of cfg.extOwners) push(o, false, cfg.known[o] || []);
  return out;
}

export default function LangSlotView({ embedded }: { embedded?: boolean }) {
  const [filter, setFilter] = useState<"all" | "Common" | "Cake">("all");
  const shown = PROJECTS.filter((p) => filter === "all" || p.project === filter);
  return (
    <div style={{ padding: embedded ? 0 : "20px 22px" }}>
      <p style={{ margin: "0 0 12px", color: "#6b7280", fontSize: 13 }}>
        확장 언어 슬롯 — 기본 언어에서 언어가 확장되면 해당 언어의 확장 오너 코드를 사용합니다. 오너마다 4개 슬롯.
        <br />출처: (소리펜)NSP_Ncode_List.xlsx 「Common 추가 언어 슬롯 (964~983)」·「Cake (984~1003)」 시트.
      </p>

      {/* 프로젝트 필터 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {(["all", "Common", "Cake"] as const).map((f) => {
          const on = filter === f;
          const c = f === "Common" ? "#2563eb" : f === "Cake" ? "#db2777" : "#374151";
          return (
            <button key={f} onClick={() => setFilter(f)}
              style={{ border: `1px solid ${on ? c : "#e5e7eb"}`, background: on ? c : "#fff", color: on ? "#fff" : "#6b7280",
                borderRadius: 8, padding: "5px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
              {f === "all" ? "전체" : f}
            </button>
          );
        })}
      </div>

      {shown.map((cfg) => <ProjectSection key={cfg.project} cfg={cfg} />)}
    </div>
  );
}

function ProjectSection({ cfg }: { cfg: ProjCfg }) {
  const owners = buildOwners(cfg);
  return (
    <div style={{ ...S.card, padding: 16, marginBottom: 16 }}>
      {/* 프로젝트 헤더 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <span style={{ background: cfg.color, color: "#fff", fontWeight: 700, borderRadius: 6, padding: "3px 10px", fontSize: 12.5 }}>{cfg.project}</span>
        <b style={{ fontSize: 14 }}>확장 언어 슬롯</b>
        <span style={{ color: "#6b7280", fontSize: 12 }}>{cfg.pds} · Section 3 · 기본 O{cfg.baseOwner} · 확장 {cfg.extLabel} · 오너 {owners.length}개 · 오너당 4슬롯</span>
      </div>
      {/* 오너 카드 그리드 — 화면 폭을 채우며 가로로 배치(스크롤 최소화) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(168px, 1fr))", gap: 8 }}>
        {owners.map((o) => <OwnerCardView key={o.owner} o={o} color={cfg.color} />)}
      </div>
    </div>
  );
}

function OwnerCardView({ o, color }: { o: OwnerCard; color: string }) {
  return (
    <div style={{ border: "1px solid #eef0f4", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", borderBottom: "1px solid #eef0f4",
        background: o.base ? "#eef6ff" : "#fafbfc" }}>
        <b style={{ fontFamily: "ui-monospace,monospace", fontSize: 12.5, color: o.base ? color : "#111827" }}>O{o.owner}</b>
        {o.base && <span style={{ ...S.tag, fontSize: 9, background: color, color: "#fff", fontWeight: 700 }}>기본</span>}
        <span style={{ marginLeft: "auto", fontSize: 10, color: "#9ca3af" }}>슬롯 {o.slots[0].slot}~{o.slots[3].slot}</span>
      </div>
      <div style={{ padding: "4px 8px 6px" }}>
        {o.slots.map((s) => (
          <div key={s.slot} style={{ display: "flex", gap: 6, fontSize: 11.5, padding: "2px 0", alignItems: "baseline" }}>
            <span style={{ color: "#9ca3af", fontFamily: "ui-monospace,monospace", minWidth: 18, textAlign: "right" }}>{s.slot}</span>
            <span style={{ color: s.lang ? "#111827" : "#94a3b8" }}>{s.lang || "사용가능"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
