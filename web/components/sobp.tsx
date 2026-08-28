"use client";

// SOBP 표시 공용 칩 — 어느 메뉴든 SOBP(Section·Owner·Book·Page)는 이 컴포넌트로 통일한다.
// 좌표(SOBP)가 먼저이고, 코드 종류(PDS3·PDS2·PDS4·OID·IDS)는 그 좌표의 속성이다. → lib/codeKind.ts
// 색상: S 파랑 · O 청록 · B 보라 · P 주황.
import React from "react";
import { codeKind, kindMeta, penLabel, type CodeKind } from "@/lib/codeKind";

export const SOBP_C: Record<string, string> = { S: "#5f8ff0", O: "#14b8a6", B: "#8b5cf6", P: "#f59e0b" };

// 코드 종류 칩 — 좌표 속성(PDS3 · PDS2 · PDS4 · OID · IDS).
// k=데이터 종류값(N/G/A/O), sec=Section(44면 PDS4). kind 를 직접 넘겨도 된다.
export function KindChip({ k, sec, kind, small }: { k?: string; sec?: number; kind?: CodeKind; small?: boolean }) {
  const kd = kind ?? codeKind(k, sec ?? -1);
  const m = kindMeta(kd);
  return (
    <span title={`${m.label} · ${m.desc}`}
      style={{ display: "inline-flex", alignItems: "center", borderRadius: 6, padding: small ? "1px 5px" : "2px 7px",
        fontSize: small ? 9.5 : 10.5, fontWeight: 700, color: "#fff", background: m.color, whiteSpace: "nowrap" }}>
      {m.short}
    </span>
  );
}
// 이전 이름 유지 (N/G 만 쓰던 호출부 호환)
export const PdsChip = ({ k, small }: { k: string; small?: boolean }) => <KindChip k={k} small={small} />;

// 펜 구분 칩 — 소리펜(NSP) / 필기펜(NWP)
export function PenChip({ pen, small }: { pen?: string; small?: boolean }) {
  const label = penLabel(pen);
  if (!label) return null;
  const sound = pen === "S";
  return (
    <span title={sound ? "소리펜 · NSP 원장" : "필기펜 · NWP 원장"}
      style={{ display: "inline-flex", alignItems: "center", borderRadius: 6, padding: small ? "1px 5px" : "2px 7px",
        fontSize: small ? 9.5 : 10.5, fontWeight: 700, whiteSpace: "nowrap",
        color: sound ? "#9a3412" : "#3730a3", background: sound ? "#ffedd5" : "#e0e7ff" }}>
      {label}
    </span>
  );
}

// 단일 값 칩 (S 3 / O 21 / B 0~10 / P 1~512 …)
export function Sc({ k, v, c, name, small }: { k: string; v: React.ReactNode; c?: string; name?: string; small?: boolean }) {
  const color = c ?? SOBP_C[k] ?? "#94a3b8";
  return (
    <span title={name} style={{ display: "inline-flex", alignItems: "center", gap: small ? 3 : 5, border: "1px solid #e5e7eb",
      borderRadius: small ? 6 : 8, padding: small ? "1px 5px 1px 1px" : "2px 6px 2px 2px", background: "#fff", fontSize: small ? 10.5 : 12, whiteSpace: "nowrap" }}>
      <span style={{ background: color, color: "#fff", fontWeight: 700, fontSize: small ? 9 : 10.5, borderRadius: small ? 4 : 6,
        padding: small ? "1px 4px" : "2px 6px", minWidth: small ? 9 : 12, textAlign: "center" }}>{k}</span>
      <span style={{ fontFamily: "ui-monospace,monospace", color: "#111827" }}>{v}</span>
    </span>
  );
}

// SOBP 조합 칩 행 — 전달된 값만 표시 (k=코드종류, s/o/b/p)
export function SobpChips({ k, s, o, b, p, pen, small, gap }: {
  k?: string; s?: number | string; o?: number | string; b?: number | string; p?: number | string; pen?: string; small?: boolean; gap?: number;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: gap ?? 4, flexWrap: "wrap", rowGap: 3 }}>
      {k != null && <KindChip k={k} sec={typeof s === "number" ? s : Number(s)} small={small} />}
      {pen != null && <PenChip pen={pen} small={small} />}
      {s != null && <Sc k="S" v={s} name="Section" small={small} />}
      {o != null && <Sc k="O" v={o} name="Owner" small={small} />}
      {b != null && <Sc k="B" v={b} name="Book" small={small} />}
      {p != null && <Sc k="P" v={p} name="Page" small={small} />}
    </span>
  );
}
