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
// 화면이 좁으면 왼쪽 · 가운데 칸이 먼저 줄어 상세 칸 자리를 지킨다 `PC-276`
export const WS_GRID: React.CSSProperties = { display: "grid", gridTemplateColumns: "minmax(210px, 270px) minmax(250px, 330px) minmax(380px, 1fr)", gap: 12, alignItems: "start" };
export const WS_EMPTY: React.CSSProperties = { fontSize: 12, color: "#6b7280", padding: "24px 0", textAlign: "center", lineHeight: 1.7 };
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
      <span style={{ fontSize: 11.5, color: "#6b7280" }}>{note}</span>
    </div>
  );
}

/** 집계 카드 줄 */
// 넷째 값(선택) — title = 마우스를 올리면 보이는 설명, onClick = 누르면 그 조건으로 거르기, on = 거르는 중 `PC-256`
export type WsStatOpt = { title?: string; onClick?: () => void; on?: boolean };
export function WsStats({ items }: { items: ([string, string, string] | [string, string, string, WsStatOpt])[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 10, marginBottom: 12 }}>
      {items.map(([l, v, c, o], i) => {
        const inner = (
          <>
            <div style={{ fontSize: 11, color: "#6b7280" }}>{l}{o?.onClick ? <span style={{ marginLeft: 4, color: o.on ? "#1d4ed8" : "#6b7280" }}>{o.on ? "· 거르는 중" : "›"}</span> : null}</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: c, fontVariantNumeric: "tabular-nums" }}>{v}</div>
          </>
        );
        return o?.onClick
          ? <button key={i} type="button" title={o.title} aria-pressed={!!o.on} onClick={o.onClick}
              style={{ ...WS_CARD, padding: "10px 12px", textAlign: "left", cursor: "pointer", font: "inherit", borderColor: o.on ? "#93c5fd" : undefined, background: o.on ? "#f5f9ff" : WS_CARD.background }}>{inner}</button>
          : <div key={i} title={o?.title} style={{ ...WS_CARD, padding: "10px 12px" }}>{inner}</div>;
      })}
    </div>
  );
}

/** 왼쪽 칸 머리 — 「고객사 n곳 · 고객사 관리」 */
export function WsCoHead({ count, right }: { count: React.ReactNode; right?: React.ReactNode }) {
  // right — 오른쪽 자리(기본 「고객사 관리」 출처 표시). 고객사 관리 3단은 [＋ 고객사 등록] `PC-204`
  return (
    <div style={WS_HD}>
      <b style={{ fontSize: 14, whiteSpace: "nowrap" }}>고객사</b>
      <span style={{ fontSize: 11.5, color: "#6b7280", whiteSpace: "nowrap" }}>{count}곳</span>
      <span style={{ flex: 1 }} />
      {right ?? <span style={{ fontSize: 11, color: "#6b7280", whiteSpace: "nowrap" }}>고객사 관리</span>}
    </div>
  );
}

/** 발급 고객사 / 전체 고객사 전환 */
export type CoView = "issued" | "all" | "closed";   // closed = 사업 종료(고객사 관리) `PC-256`
export function WsCoToggle({ view, onView, issued, total, issuedLabel = "발급 고객사", closed }: { view: CoView; onView: (v: CoView) => void; issued: number; total: number; issuedLabel?: string; closed?: number }) {
  // issuedLabel — 고객사 관리 3단은 「진행중」 `PC-204` · closed — 고객사 관리 3단의 「사업 종료」 칩 `PC-256`
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
      <button type="button" aria-pressed={view === "issued"} onClick={() => onView("issued")} style={wsChip(view === "issued")}>{issuedLabel} {issued}</button>
      <button type="button" aria-pressed={view === "all"} onClick={() => onView("all")} style={wsChip(view === "all")}>전체 고객사 {total}</button>
      {closed != null && <button type="button" aria-pressed={view === "closed"} onClick={() => onView("closed")} style={wsChip(view === "closed")}>사업 종료 {closed}</button>}
    </div>
  );
}

/** 고객사 한 줄 — [접기 ▸] · 이름 · (하위 n) · 건수 배지. App Key 관리 · N Key 관리 같은 모양 `PC-198` */
export function WsCoItem({ label, n, on, warn = false, bold = false, sub = false, fold, title, onClick }: {
  label: string; n: number; on: boolean; warn?: boolean; bold?: boolean; sub?: boolean; fold?: WsFold; title?: string; onClick: () => void;
}) {
  // sub = 하위 고객사 — 묶음(WsCoGroup)의 세로 안내선 안에 놓인다
  // 접기 ▶ 는 줄 버튼 밖의 따로 된 버튼 — 버튼 안에 버튼을 두지 않아 키보드로도 접고 편다 `PC-276`
  const row = (
    <button type="button" onClick={onClick} aria-current={on ? "true" : undefined}
      style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0, textAlign: "left", border: 0, borderRadius: 9, padding: sub ? "6px 10px" : "8px 10px 8px 2px", cursor: "pointer", fontSize: sub ? 12.5 : 13,
        background: "transparent", color: on ? "#1d4ed8" : warn ? "#b45309" : sub ? "#4b5563" : "#374151", fontWeight: on || bold ? 700 : 400 }}>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: sub ? 12.5 : 13 }} title={label}>{label}</span>
      {fold && <span style={{ fontSize: 10.5, color: "#6b7280", fontWeight: 400, whiteSpace: "nowrap" }}>하위 {fold.n}</span>}
      <span style={{ flex: 1 }} />
      <span title={title} style={{ fontSize: 10.5, borderRadius: 999, padding: "1px 8px", fontWeight: 700, fontVariantNumeric: "tabular-nums", background: on ? "#dbeafe" : "#f3f4f6", color: on ? "#1d4ed8" : n ? "#6b7280" : "#9ca3af" }}>{n}</span>
    </button>
  );
  if (sub) return <div style={{ display: "flex", borderRadius: 9, background: on ? "#eef6ff" : "transparent" }}>{row}</div>;
  return (
    <div style={{ display: "flex", alignItems: "center", borderRadius: 9, paddingLeft: 4, background: on ? "#eef6ff" : "transparent" }}>
      {fold
        ? <button type="button" aria-expanded={fold.open} aria-label={fold.open ? `${label} 하위 고객사 접기` : `${label} 하위 고객사 펼치기`} onClick={fold.onToggle}
            style={{ width: 18, height: 18, flex: "0 0 18px", padding: 0, border: 0, background: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 4, color: "#6b7280", fontSize: 10, cursor: "pointer",
              transform: fold.open ? "rotate(90deg)" : "none", transition: "transform .15s" }}>▶</button>
        : <span aria-hidden style={{ width: 18, flex: "0 0 18px" }} />}
      {row}
    </div>
  );
}

/** 카드(목록 항목) 테두리 — 선택 / 보통 */
export const wsItem = (on: boolean): React.CSSProperties => ({
  border: `1px solid ${on ? "#5f8ff0" : "#eef0f4"}`, background: on ? "#f5f9ff" : "#fff", borderRadius: 10, padding: "10px 12px", marginBottom: 8, cursor: "pointer",
});

/** 상세 밑줄 탭 — App Key 계정 상세 · 서비스 티켓 상세가 같은 모양을 쓴다 `PC-178` `PC-179` */
// 칸이 좁으면 탭 글자를 꺾지 않고 옆으로 넘긴다 `PC-276`
export function WsTabs<T extends string>({ items, tab, onTab, badge }: { items: { v: T; label: string }[]; tab: T; onTab: (v: T) => void; badge?: Partial<Record<T, string>> }) {
  return (
    <div role="tablist" style={{ display: "flex", borderBottom: "1px solid #eef0f4", marginBottom: 14, overflowX: "auto", scrollbarWidth: "none" }}>
      {items.map(({ v, label }) => {
        const on = tab === v;
        return (
          <button key={v} type="button" role="tab" aria-selected={on} onClick={() => onTab(v)}
            style={{ border: 0, background: "none", padding: "9px 14px", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", flex: "0 0 auto",
              color: on ? "#111827" : "#6b7280", fontWeight: on ? 700 : 400,
              borderBottom: `2px solid ${on ? "#5f8ff0" : "transparent"}`, marginBottom: -1 }}>
            {label}
            {badge?.[v] && <span style={{ ...S.tag, fontSize: 10.5, marginLeft: 5, background: "#eef6ff", color: "#2563eb", fontWeight: 700 }}>{badge[v]}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** ⓘ 숨김 설명 — 누르면 **바로 아래**에 말풍선(5초 뒤 사라짐). 본문에 설명을 늘어놓지 않는다 `PC-182` `PC-184` `PC-214` */
export function InfoTip({ title, width = 300, children }: { title?: string; width?: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { if (!open) return; const id = setTimeout(() => setOpen(false), 5000); return () => clearTimeout(id); }, [open]);
  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <button type="button" onClick={() => setOpen((v) => !v)} title={title} aria-label={title ?? "설명 보기"} aria-expanded={open}
        style={{ border: 0, background: open ? "#eef6ff" : "transparent", color: open ? "#2563eb" : "#6b7280", borderRadius: 999, width: 20, height: 20, cursor: "pointer", fontSize: 12, padding: 0 }}>ⓘ</button>
      {open && (
        <div role="status" onClick={() => setOpen(false)}
          style={{ position: "absolute", top: "calc(100% + 8px)", left: -10, zIndex: 60, width, cursor: "pointer",
            background: "#1f2937", color: "#f9fafb", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, lineHeight: 1.6, fontWeight: 400,
            boxShadow: "0 12px 32px rgba(15,23,42,.25)" }}>
          {/* 말풍선 꼬리 — ⓘ 를 가리킨다 */}
          <span style={{ position: "absolute", top: -5, left: 16, width: 10, height: 10, background: "#1f2937", transform: "rotate(45deg)" }} />
          {children}
        </div>
      )}
    </span>
  );
}
