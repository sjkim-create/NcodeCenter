"use client";

// OID-01 OID 관리대장 — 업체 + index 로 보는 OID 대장 (Ncode 정보 탭)
// OID 좌표는 SOBP 맵에서 **OID 종류로 필터**해 볼 수 있고 `PC-035`,
// 이 화면은 **업체별 index 목록**(book 미분할 업체 포함)을 본다.
import { useMemo, useState } from "react";
import { S } from "./ui";
import { PenChip } from "./sobp";
import { OID_TOTAL, oidCompanies, totalUsedIndex, usedIndexCount, indexLabel, type OidCompany } from "@/lib/oidLedger";

const TEAL = "#0f766e";

export default function OidView({ embedded }: { embedded?: boolean } = {}) {
  const all = oidCompanies();
  const [q, setQ] = useState("");
  const [fIdx, setFIdx] = useState<"전체" | "book" | "none">("전체");
  const [sel, setSel] = useState<string>(all[0]?.company ?? "");

  const list = useMemo(() => all
    .filter((g) => (fIdx === "전체" ? true : g.indexBy === fIdx))
    .filter((g) => (q ? (g.company + " " + g.items.map((i) => i.title).join(" ")).toLowerCase().includes(q.toLowerCase()) : true)),
    [all, fIdx, q]);
  const cur = list.find((g) => g.company === sel) ?? list[0];
  const used = totalUsedIndex();
  const items = useMemo(() => {
    if (!cur) return [];
    if (!q) return cur.items;
    const k = q.toLowerCase();
    return cur.items.filter((i) => `${i.title} ${i.idx ?? ""}`.toLowerCase().includes(k));
  }, [cur, q]);

  return (
    <div style={{ padding: embedded ? 0 : "18px 20px" }}>
      {/* 개념 안내 — OID 는 SOBP 좌표 관리 대상이 아니다 */}
      <div style={{ ...S.card, padding: "12px 14px", background: "#f0fdfa", border: "1px solid #99f6e4", marginBottom: 12, fontSize: 12.5, color: "#115e59", lineHeight: 1.8 }}>
        <b>OID = index 만 갖는 코드</b> — 외부 코드를 <b>우리 펜으로 읽으려고</b> 만든 방식입니다. OID 책을 우리 펜으로 찍으면 <b>코드 값이 1개만</b> 나옵니다. (옛 <b>IDS</b> 표기도 같은 것입니다)
        <br />총량이 <b>약 {OID_TOTAL.toLocaleString()}개</b>뿐이라 책의 양이 많지 않으면 <b>book 으로 코드를 나누지 않습니다</b>.
        업체 구분에는 S/O 를 써 왔고, 분량이 늘어난 업체만 <b>book 번호(=OID index)</b> 로 나눠 관리했습니다.
        <br />이 화면은 그 이력을 <b>업체 + index</b> 로 모아 봅니다. 좌표로 보려면 <b>SOBP 맵에서 종류 [OID]</b> 로 필터하세요.
      </div>

      {/* 요약 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 12 }}>
        {[
          ["관리 업체", all.length.toLocaleString(), "#111827"],
          ["대장 항목", all.reduce((n, g) => n + g.count, 0).toLocaleString(), TEAL],
          ["사용 index", used.toLocaleString(), "#2563eb"],
          ["OID 총량(약)", OID_TOTAL.toLocaleString(), "#6b7280"],
        ].map(([l, v, c]) => (
          <div key={l} style={{ ...S.card, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: "#6b7280" }}>{l}</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* 필터 */}
      <div style={{ ...S.card, padding: "10px 12px", marginBottom: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 12.5 }}>
        <b style={{ fontSize: 13 }}>OID 관리대장</b>
        <div style={{ display: "flex", gap: 4 }}>
          {([["전체", "전체"], ["book", "index 관리(book)"], ["none", "미분할(업체 단위)"]] as const).map(([v, label]) => (
            <button key={v} onClick={() => setFIdx(v)} style={chip(fIdx === v)}>{label}</button>
          ))}
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="업체 · 교재 · index 검색" style={{ ...S.input, width: 240, marginLeft: "auto" }} />
        <span style={{ color: "#9ca3af" }}>{list.length}업체</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 12, alignItems: "start" }}>
        {/* 업체 목록 — 대장의 관리 단위 */}
        <div style={{ ...S.card, padding: 8 }}>
          <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, padding: "2px 4px 6px" }}>업체 (관리 단위)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "calc(100vh - 330px)", overflowY: "auto" }}>
            {list.map((g) => {
              const on = cur?.company === g.company;
              return (
                <button key={g.company} onClick={() => setSel(g.company)}
                  style={{ display: "block", width: "100%", textAlign: "left", cursor: "pointer", borderRadius: 9, padding: "10px 12px",
                    border: `1px solid ${on ? TEAL : "#eef0f4"}`, borderLeft: `3px solid ${on ? TEAL : "transparent"}`, background: on ? "#f0fdfa" : "#fff" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <b style={{ fontSize: 13, color: on ? TEAL : "#111827" }}>{g.company}</b>
                    <PenChip pen={g.pen} small />
                    <span style={{ ...S.tag, fontSize: 9.5, background: g.indexBy === "book" ? "#ccfbf1" : "#f3f4f6", color: g.indexBy === "book" ? TEAL : "#9ca3af", fontWeight: 700 }}>
                      {g.indexBy === "book" ? "index 관리" : "미분할"}
                    </span>
                  </div>
                  <div style={{ fontSize: 10.5, color: "#6b7280", marginTop: 3 }}>{g.count}건 · index {indexLabel(g)}</div>
                  <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }} title="이 업체 OID 이력의 좌표(S/O·Book)">📝 {g.sobpMemo}</div>
                </button>
              );
            })}
            {list.length === 0 && <div style={{ fontSize: 12, color: "#9ca3af", padding: 12, textAlign: "center" }}>조건에 맞는 업체가 없습니다.</div>}
          </div>
        </div>

        {/* 항목 표 — index + 교재 */}
        <div style={{ minWidth: 0 }}>
          {!cur ? (
            <div style={{ ...S.card, padding: 24, fontSize: 13, color: "#9ca3af" }}>왼쪽에서 업체를 선택하세요.</div>
          ) : (
            <>
              <div style={{ ...S.card, padding: "12px 14px", marginBottom: 10, fontSize: 12.5, color: "#374151", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <b style={{ fontSize: 14 }}>{cur.company}</b>
                <PenChip pen={cur.pen} />
                <span style={{ ...S.tag, background: "#ccfbf1", color: TEAL, fontWeight: 700 }}>
                  {cur.indexBy === "book" ? `index ${indexLabel(cur)}` : "book 미분할 (업체 단위 관리)"}
                </span>
                <span style={{ color: "#9ca3af" }}>{cur.count}건</span>
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 11.5, color: "#6b7280" }} title="이 업체 OID 이력의 좌표(S/O·Book)">📝 좌표: <b>{cur.sobpMemo}</b></span>
              </div>
              <div style={{ ...S.card, padding: 0, overflowX: "auto" }}>
                <table style={{ ...S.table, minWidth: 720 }}>
                  <thead>
                    <tr>{["index", "교재 · 프로젝트", "페이지", "발급일", "사용 고객사"].map((h) => <th key={h} style={S.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {items.map((i, n) => (
                      <tr key={n} style={{ borderTop: "1px solid #eef0f4" }}>
                        <td style={{ ...S.td, fontFamily: "ui-monospace,monospace", fontWeight: 700, color: i.idx != null ? TEAL : "#d1d5db" }}>
                          {i.idx != null ? i.idx : "—"}
                        </td>
                        <td style={S.td}>{i.title || "—"}</td>
                        <td style={{ ...S.td, color: "#6b7280" }}>{i.pages ? `${i.pages}p` : "—"}</td>
                        <td style={{ ...S.td, fontFamily: "ui-monospace,monospace", color: "#6b7280" }}>{i.date ?? "—"}</td>
                        <td style={{ ...S.td, color: "#6b7280" }}>{i.cu ?? "—"}</td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr><td colSpan={5} style={{ ...S.td, textAlign: "center", color: "#9ca3af", padding: 26 }}>검색 결과가 없습니다.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {cur.indexBy === "none" && (
                <div style={{ marginTop: 8, fontSize: 11.5, color: "#6b7280", lineHeight: 1.7 }}>
                  ※ 이 업체는 분량이 적어 <b>book 으로 나누지 않고</b> 업체 단위(S/O)로만 관리해 왔습니다. index 칸이 비어 있는 것은 정상입니다.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const chip = (on: boolean): React.CSSProperties => ({
  fontSize: 12, borderRadius: 7, padding: "5px 10px", cursor: "pointer",
  border: `1px solid ${on ? "#5eead4" : "#e5e7eb"}`, background: on ? "#f0fdfa" : "#fff",
  color: on ? TEAL : "#6b7280", fontWeight: on ? 700 : 400,
});
