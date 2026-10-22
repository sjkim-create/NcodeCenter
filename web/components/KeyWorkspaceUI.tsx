"use client";

// 키 발급 3단 화면 공용 UI — App Key 관리 · N Key 관리가 **같은 조각**을 쓴다 `PC-154`
//   한쪽만 고치면 화면이 어긋나므로 모양(색 · 크기 · 간격)은 여기서만 정한다.
import { useEffect, useMemo, useRef, useState } from "react";
import { S } from "./ui";
import { codesOfCompany } from "@/lib/commonCodes";
import { membersOf, hydrateMembers, useCommonMembers } from "@/lib/commonMembers";

const nz = (s: string) => s.replace(/\s+/g, "").toLowerCase();
/** 상위 고객사 id → 하위 고객사 id 목록 — 상위가 보유한 공통코드의 멤버 중 고객사 관리에 등록된 곳 `PC-196` `PC-197`
 *  App Key 관리 · N Key 관리 고객사 목록과 발급 폼 고객사 선택이 같은 묶음을 쓴다 */
export function useSubsOf(companies: { id: number; name: string }[]): Map<number, number[]> {
  useEffect(() => { hydrateMembers(); }, []);
  const ver = useCommonMembers();
  return useMemo(() => {
    const byName = new Map(companies.map((c) => [nz(c.name), c.id]));
    const m = new Map<number, number[]>();
    for (const c of companies) {
      const ids = new Set<number>();
      for (const cc of codesOfCompany(c.name)) {
        if (cc.historyOnly) continue;
        for (const mb of membersOf(cc.k, cc.s, cc.o)) { const id = byName.get(nz(mb.name)); if (id && id !== c.id) ids.add(id); }
      }
      if (ids.size) m.set(c.id, [...ids]);
    }
    return m;
  }, [companies, ver]);
}

/** 상 · 하위로 묶은 고객사 — 상위 고객사마다 그 하위 고객사(가나다순) `PC-197` `PC-198`
 *  하위 고객사는 **목록 제자리에도** 그대로 둔다 — 전체 고객사에서 바로 골라 발급할 수 있게 `PC-199` */
export function nestCompanies<T extends { id: number; name: string }>(list: T[], all: T[], subsOf: Map<number, number[]>, keep: (c: T) => boolean = () => true): { c: T; subs: T[] }[] {
  return list.map((c) => ({
    c,
    subs: (subsOf.get(c.id) ?? [])
      .map((id) => all.find((x) => x.id === id)).filter((x): x is T => !!x && keep(x))
      .sort((a, b) => a.name.localeCompare(b.name, "ko")),
  }));
}

/** 상위 고객사 묶음 — 상위 줄의 ▸ 로 하위 고객사를 접고 편다(기본 접힘) `PC-198`
 *  하위 고객사는 왼쪽 세로 안내선 안에 들여 보인다. 검색 중이면 저절로 펼친다 */
export type WsFold = { open: boolean; n: number; onToggle: () => void };
export function WsCoGroup({ n, autoOpen, head, children }: { n: number; autoOpen: boolean; head: (fold?: WsFold) => React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(autoOpen);
  useEffect(() => { if (autoOpen) setOpen(true); }, [autoOpen]);
  if (n === 0) return <>{head()}</>;
  return (
    <div>
      {head({ open, n, onToggle: () => setOpen((v) => !v) })}
      {open && <div style={{ margin: "1px 0 4px 17px", paddingLeft: 6, borderLeft: "2px solid #e5e7eb" }}>{children}</div>}
    </div>
  );
}

/** 화면 아래 끝(100vh)까지 채우는 스크롤 목록 — 위쪽 머리 · 집계 높이를 빼고 남은 높이를 쓴다 `PC-156`
 *  (창 크기 · 스크롤 · 위쪽 내용이 바뀌면 다시 잰다) */
export function WsFillScroll({ children, style, gap = 28 }: { children: React.ReactNode; style?: React.CSSProperties; gap?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [h, setH] = useState<number>(640);
  useEffect(() => {
    const fit = () => {
      const el = ref.current; if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;   // 문서 기준 위치 — 스크롤해도 높이가 흔들리지 않게
      setH(Math.max(240, window.innerHeight - top - gap));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(document.body);
    window.addEventListener("resize", fit);
    return () => { ro.disconnect(); window.removeEventListener("resize", fit); };
  }, [gap]);
  return <div ref={ref} style={{ ...style, height: h, overflowY: "auto" }}>{children}</div>;
}

export const WS_CARD: React.CSSProperties = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12 };
export const WS_HD: React.CSSProperties = { padding: "13px 16px", borderBottom: "1px solid #eef0f4", display: "flex", alignItems: "center", gap: 8 };
export const WS_GRID: React.CSSProperties = { display: "grid", gridTemplateColumns: "270px 330px minmax(0, 1fr)", gap: 12, alignItems: "start" };
export const WS_EMPTY: React.CSSProperties = { fontSize: 12, color: "#9ca3af", padding: "24px 0", textAlign: "center", lineHeight: 1.7 };
export const WS_HEAD_BTN: React.CSSProperties = { ...S.primary, padding: "6px 12px", fontSize: 12.5, whiteSpace: "nowrap" };

/** 필터 · 전환 칩 */
export const wsChip = (on: boolean): React.CSSProperties => ({
  fontSize: 12.5, padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontWeight: on ? 700 : 400, whiteSpace: "nowrap",
  border: `1px solid ${on ? "#93c5fd" : "#e5e7eb"}`, background: on ? "#eef6ff" : "#fff", color: on ? "#1d4ed8" : "#6b7280",
});
export const wsTag = (bg: string, fg: string): React.CSSProperties => ({ ...S.tag, background: bg, color: fg, fontWeight: 700 });

/** 화면 머리 — 제목 · 집계 대상 · 오른쪽 안내 */
export function WsTitle({ title, scope, note }: { title: string; scope?: React.ReactNode; note: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 12.5, color: "#6b7280", flexWrap: "wrap" }}>
      <b style={{ fontSize: 15, color: "#111827" }}>{title}</b>
      {scope && <span>· {scope}</span>}
      <span style={{ flex: 1 }} />
      <span style={{ fontSize: 11.5, color: "#9ca3af" }}>{note}</span>
    </div>
  );
}

/** 집계 카드 줄 */
export function WsStats({ items }: { items: [string, string, string][] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 10, marginBottom: 12 }}>
      {items.map(([l, v, c], i) => (
        <div key={i} style={{ ...WS_CARD, padding: "10px 12px" }}>
          <div style={{ fontSize: 11, color: "#6b7280" }}>{l}</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: c }}>{v}</div>
        </div>
      ))}
    </div>
  );
}

/** 왼쪽 칸 머리 — 「고객사 n곳 · 고객사 관리」 */
export function WsCoHead({ count, right }: { count: React.ReactNode; right?: React.ReactNode }) {
  // right — 오른쪽 자리(기본 「고객사 관리」 출처 표시). 고객사 관리 3단은 [＋ 고객사 등록] `PC-204`
  return (
    <div style={WS_HD}>
      <b style={{ fontSize: 14, whiteSpace: "nowrap" }}>고객사</b>
      <span style={{ fontSize: 11.5, color: "#9ca3af", whiteSpace: "nowrap" }}>{count}곳</span>
      <span style={{ flex: 1 }} />
      {right ?? <span style={{ fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap" }}>고객사 관리</span>}
    </div>
  );
}

/** 발급 고객사 / 전체 고객사 전환 */
export type CoView = "issued" | "all";
export function WsCoToggle({ view, onView, issued, total, issuedLabel = "발급 고객사" }: { view: CoView; onView: (v: CoView) => void; issued: number; total: number; issuedLabel?: string }) {
  // issuedLabel — 고객사 관리 3단은 「진행중」 `PC-204`
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
      <button type="button" onClick={() => onView("issued")} style={wsChip(view === "issued")}>{issuedLabel} {issued}</button>
      <button type="button" onClick={() => onView("all")} style={wsChip(view === "all")}>전체 고객사 {total}</button>
    </div>
  );
}

/** 고객사 한 줄 — [접기 ▸] · 이름 · (하위 n) · 건수 배지. App Key 관리 · N Key 관리 같은 모양 `PC-198` */
export function WsCoItem({ label, n, on, warn = false, bold = false, sub = false, fold, title, onClick }: {
  label: string; n: number; on: boolean; warn?: boolean; bold?: boolean; sub?: boolean; fold?: WsFold; title?: string; onClick: () => void;
}) {
  // sub = 하위 고객사 — 묶음(WsCoGroup)의 세로 안내선 안에 놓인다
  return (
    <button type="button" onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", textAlign: "left", border: 0, borderRadius: 9, padding: sub ? "6px 10px" : "8px 10px 8px 4px", cursor: "pointer", fontSize: sub ? 12.5 : 13,
        background: on ? "#eef6ff" : "transparent", color: on ? "#1d4ed8" : warn ? "#b45309" : sub ? "#4b5563" : "#374151", fontWeight: on || bold ? 700 : 400 }}>
      {!sub && (
        <span role="button" aria-label={fold ? (fold.open ? "하위 고객사 접기" : "하위 고객사 펼치기") : undefined}
          onClick={fold ? (e) => { e.stopPropagation(); fold.onToggle(); } : undefined}
          style={{ width: 16, height: 16, flex: "0 0 16px", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 4, color: "#9ca3af", fontSize: 10,
            transform: fold?.open ? "rotate(90deg)" : "none", transition: "transform .15s", visibility: fold ? "visible" : "hidden" }}>▶</span>
      )}
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={label}>{label}</span>
      {fold && <span style={{ fontSize: 10.5, color: "#9ca3af", fontWeight: 400, whiteSpace: "nowrap" }}>하위 {fold.n}</span>}
      <span style={{ flex: 1 }} />
      <span title={title} style={{ fontSize: 10.5, borderRadius: 999, padding: "1px 8px", fontWeight: 700, background: on ? "#dbeafe" : "#f3f4f6", color: on ? "#1d4ed8" : n ? "#6b7280" : "#c7cdd6" }}>{n}</span>
    </button>
  );
}

/** 카드(목록 항목) 테두리 — 선택 / 보통 */
export const wsItem = (on: boolean): React.CSSProperties => ({
  border: `1px solid ${on ? "#5f8ff0" : "#eef0f4"}`, background: on ? "#f5f9ff" : "#fff", borderRadius: 10, padding: "10px 12px", marginBottom: 8, cursor: "pointer",
});

/** 상세 밑줄 탭 — App Key 계정 상세 · 서비스 티켓 상세가 같은 모양을 쓴다 `PC-178` `PC-179` */
export function WsTabs<T extends string>({ items, tab, onTab, badge }: { items: { v: T; label: string }[]; tab: T; onTab: (v: T) => void; badge?: Partial<Record<T, string>> }) {
  return (
    <div style={{ display: "flex", borderBottom: "1px solid #eef0f4", marginBottom: 14 }}>
      {items.map(({ v, label }) => {
        const on = tab === v;
        return (
          <button key={v} type="button" onClick={() => onTab(v)}
            style={{ border: 0, background: "none", padding: "9px 16px", fontSize: 13, cursor: "pointer",
              color: on ? "#111827" : "#6b7280", fontWeight: on ? 700 : 400,
              borderBottom: `2px solid ${on ? "#5f8ff0" : "transparent"}`, marginBottom: -1 }}>
            {label}
            {badge?.[v] && <span style={{ ...S.tag, fontSize: 9.5, marginLeft: 5, background: "#eef6ff", color: "#2563eb", fontWeight: 700 }}>{badge[v]}</span>}
          </button>
        );
      })}
    </div>
  );
}
