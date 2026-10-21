"use client";

// 구간 사용 현황 — 고른 S/O 범위 안에서 **이미 발급된 구간**과 **비어 있는 Book 구간**, 그리고 지금 입력한 구간을 쓸 수 있는지 `PC-195`
// - App Key 관리 · N Key 관리 · 고객사 관리 ▸ 서비스 티켓의 발급(지정) 폼이 같은 조각을 쓴다.
// - 발급분은 전체 고객사 기준(App Key · N Key · 서비스 티켓) — 상위 SOBP 를 나눠 쓰는 하위 고객사끼리도 보인다.
// - 비어 있는 구간을 누르면 Start Book 을 그 자리로 옮긴다.
import { occupiedSobp, spansOverlap, type SobpSpan } from "@/lib/rangeGuard";
import { SobpChips } from "./sobp";
import { S } from "./ui";

const MAX = 1e9;
const KIND_C: Record<string, [string, string]> = { "App Key": ["#f5f3ff", "#6d28d9"], "N Key": ["#eef6ff", "#1d4ed8"], "서비스 티켓": ["#ecfdf5", "#047857"] };
const tag = (bg: string, fg: string): React.CSSProperties => ({ ...S.tag, background: bg, color: fg, fontWeight: 700, fontSize: 10.5 });
const span = (a: number, b: number, cap: number) => (b >= MAX || b > cap ? `${a}~${cap}` : a === b ? `${a}` : `${a}~${b}`);

export function SobpUsage({ range, cand, exclude, onPickBook }: {
  range: { section: number; owner: number; bookStart: number; bookEnd: number; pageEnd?: number };
  cand?: SobpSpan;            // 지금 입력한 구간
  exclude?: string;           // 수정 중인 자기 자신(ref)
  onPickBook?: (b: number) => void;
}) {
  const occ = occupiedSobp().filter((o) => o.ref !== exclude && o.section === range.section && o.owner === range.owner
    && o.bookStart <= range.bookEnd && o.bookEnd >= range.bookStart)
    .sort((a, b) => a.bookStart - b.bookStart || a.pageStart - b.pageStart);
  // 비어 있는 Book 구간 = 어떤 발급분도 닿지 않은 Book(페이지 무관)
  const gaps: [number, number][] = [];
  let cur = range.bookStart;
  for (const o of occ) {
    const s0 = Math.max(o.bookStart, range.bookStart), e0 = Math.min(o.bookEnd, range.bookEnd);
    if (s0 > cur) gaps.push([cur, s0 - 1]);
    cur = Math.max(cur, e0 + 1);
    if (cur > range.bookEnd) break;
  }
  if (cur <= range.bookEnd) gaps.push([cur, range.bookEnd]);
  const hit = cand ? occ.find((o) => spansOverlap(o, cand)) : undefined;
  const pe = range.pageEnd ?? 511;

  return (
    <div style={{ marginTop: 10, border: "1px solid #eef0f4", borderRadius: 10, background: "#fafbfc", padding: "9px 12px", fontSize: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
        <b style={{ color: "#374151" }}>구간 사용 현황</b>
        <span style={{ color: "#9ca3af" }}>S{range.section} / O{range.owner} · 발급 {occ.length}건 · 빈 Book 구간 {gaps.length}곳</span>
        <span style={{ flex: 1 }} />
        {cand && (hit
          ? <span style={tag("#fef2f2", "#b91c1c")}>입력 구간 겹침 — {hit.kind} · {hit.who}</span>
          : <span style={tag("#dcfce7", "#166534")}>입력 구간 사용 가능</span>)}
      </div>
      {/* 비어 있는 Book 구간 — 누르면 Start Book 이동 */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: occ.length ? 8 : 0 }}>
        <span style={{ color: "#6b7280", minWidth: 64 }}>빈 구간</span>
        {gaps.length === 0 && <span style={{ color: "#b45309" }}>비어 있는 Book 이 없습니다 — 같은 Book 이면 Page 를 나눠야 합니다.</span>}
        {gaps.slice(0, 8).map(([a, b]) => (
          <button key={a} type="button" disabled={!onPickBook} onClick={() => onPickBook?.(a)} title={onPickBook ? `Start Book 을 ${a} 로` : undefined}
            style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#166534", borderRadius: 7, padding: "2px 8px", fontSize: 11.5, cursor: onPickBook ? "pointer" : "default", fontFamily: "ui-monospace,monospace" }}>
            B{a === b ? a : `${a}~${b}`}
          </button>
        ))}
        {gaps.length > 8 && <span style={{ color: "#9ca3af" }}>외 {gaps.length - 8}곳</span>}
      </div>
      {/* 이미 발급된 구간 */}
      {occ.length > 0 && (
        <div style={{ maxHeight: 132, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
          {occ.map((o) => {
            const on = !!cand && spansOverlap(o, cand);
            return (
              <div key={o.ref} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", padding: "3px 6px", borderRadius: 7,
                background: on ? "#fef2f2" : "transparent", border: `1px solid ${on ? "#fecaca" : "transparent"}` }}>
                <span style={tag(...(KIND_C[o.kind] ?? ["#f3f4f6", "#6b7280"]))}>{o.kind}</span>
                <span style={{ color: "#374151", minWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }} title={o.who}>{o.who}</span>
                <SobpChips b={span(o.bookStart, o.bookEnd, range.bookEnd)} p={span(o.pageStart, o.pageEnd, pe)} small />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
