"use client";

// 고객사 관리 ▸ 서비스 티켓 `PC-171` `PC-173`
// - App Key · N Key 와 별개인 세 번째 티켓. **주인 = 고객사** — 사용자에게 발급하는 키가 아니라
//   내부에서 **고객사 계정(서비스 계정)들과 매칭해 서비스 사용을 승인하는 기준**이다.
//   그래서 [티켓 발급] 메뉴가 아니라 **고객사 관리(MEM-02)의 섹션**에서 지정한다 `PC-173`.
// - 고객사가 SOBP 맵에서 할당받은 범위(공유 코드 사용 고객사면 그 S/O 포함) 안에서
//   Start Book · Book 볼륨 · Start Page · Page 볼륨 · 사용기간 시작 · 끝 을 정해 지정한다.
// - 한 고객사 안에서 App Key · N Key · 서비스 티켓의 범위는 겹치지 않는다. 공유 코드 Book 은 고객사끼리도 겹치지 않는다.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { S, Field } from "./ui";
import { SobpRangePicker } from "./TicketsView";
import { useStore } from "@/lib/store";
import { useAuth, currentUser } from "@/lib/authStore";
import { logActivity } from "@/lib/activityStore";
import { hydrateTickets, useTickets, today } from "@/lib/ticketStore";
import { BillingEditor, BillTag } from "./BillingEditor";
import { codesOfMember, hydrateMembers, useCommonMembers } from "@/lib/commonMembers";
import { serviceRangesOfCompany, type ServiceRange } from "@/lib/keyCompany";
import { sobpOverlapMsg } from "@/lib/rangeGuard";
import {
  addServiceTicket, deleteServiceTicket, allServiceTickets, hydrateServiceTickets, useServiceTickets,
  ticketState, STATE_COLOR, serviceTicketText, setServiceBilling, type ServiceTicket,
} from "@/lib/serviceTicketStore";
import type { Company } from "@/lib/customerData";
import { WS_CARD as card, WS_HD as hd, WS_EMPTY, WS_HEAD_BTN, wsTag as tag, wsItem } from "./KeyWorkspaceUI";   // 키 화면과 같은 조각 `PC-154`

const PAGE_DEFAULT = 512;   // Page 볼륨 기본값 — App Key · N Key 발급과 같은 값
type Right = { kind: "t"; id: number } | { kind: "add" } | { kind: "none" };

/** 만료 후 동작 — 숨김 안내(눌러야 펼쳐진다) `PC-171` ④ */
export function ExpiryNote() {
  return (
    <details style={{ marginTop: 12, border: "1px solid #eef0f4", borderRadius: 9, background: "#fafbfc", padding: "8px 12px", fontSize: 12 }}>
      <summary style={{ cursor: "pointer", color: "#6b7280", fontWeight: 700 }}>ⓘ 만료 후 동작</summary>
      <div style={{ marginTop: 8, color: "#374151", lineHeight: 1.75 }}>
        <b>사용기간이 끝나면</b>
        <div>• 이 범위의 코드로 <b>편집 · 추가 작업을 할 수 없습니다.</b> (당사 서버를 거치는 서비스 — casterN 편집, Ncode SDK)</div>
        <div>• <b>이미 만든 작업물(PDF)의 인쇄 · 배포는 막을 수 없습니다.</b> 실물 출판물에는 코드가 남습니다.</div>
        <div>• 계약이 끝난 코드는 다른 고객사에 다시 할당될 수 있으며, 이때 기존 출판물을 당사 서버로 서비스하면 데이터가 겹칠 수 있습니다.</div>
      </div>
    </details>
  );
}

// 범위 안에서 이 고객사 서비스 티켓이 덮은 Book 수
const coveredBooks = (r: ServiceRange, ts: ServiceTicket[]) => {
  const set = new Set<number>();
  for (const t of ts) {
    if (t.section !== r.section || t.owner !== r.owner) continue;
    for (let b = Math.max(r.bookStart, t.bookStart); b <= Math.min(r.bookEnd, t.bookEnd); b++) set.add(b);
  }
  return set.size;
};
// 범위 안에서 아직 티켓이 없는 첫 Book
const firstFreeBook = (r: ServiceRange, ts: ServiceTicket[]) => {
  for (let b = r.bookStart; b <= r.bookEnd; b++)
    if (!ts.some((t) => t.section === r.section && t.owner === r.owner && b >= t.bookStart && b <= t.bookEnd)) return b;
  return r.bookStart;
};

/** 고객사 관리 ▸ 서비스 티켓 섹션 — 「할당 범위 · 티켓 목록 | 티켓 상세 / 지정」 2칸 `PC-173` */
export function CompanyServiceTickets({ company, accountCount }: { company: Company; accountCount: number }) {
  const { projects } = useStore();
  const me = currentUser(useAuth());
  useServiceTickets(); useTickets(); useCommonMembers();
  useEffect(() => { hydrateServiceTickets(); hydrateTickets(); hydrateMembers(); }, []);

  const mine = allServiceTickets().filter((t) => t.companyId === company.id).sort((a, b) => b.no - a.no);
  const ranges = useMemo(() => serviceRangesOfCompany(company, projects, codesOfMember(company.name)), [company, projects]);   // eslint-disable-line react-hooks/exhaustive-deps
  const first = (): Right => (mine[0] ? { kind: "t", id: mine[0].id } : { kind: "none" });
  const [right, setRight] = useState<Right>({ kind: "none" });
  // 티켓은 브라우저 저장분이라 서버 렌더에는 없다 — 마운트 뒤에 그리고 첫 티켓을 고른다(하이드레이션 불일치 방지)
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); setRight(first()); }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  if (!mounted) return null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "340px minmax(0, 1fr)", gap: 12, alignItems: "start" }}>
      {/* 왼쪽 — 할당 SOBP 범위 · 서비스 티켓 */}
      <div style={card}>
        <div style={hd}>
          <b style={{ fontSize: 14 }}>서비스 티켓</b>
          <span style={{ fontSize: 11.5, color: "#9ca3af" }}>{mine.length}건</span>
          <span style={{ flex: 1 }} />
          <button type="button" onClick={() => setRight({ kind: "add" })} style={WS_HEAD_BTN}>＋ 티켓 지정</button>
        </div>
        <div style={{ padding: 12 }}>
          <div style={{ fontSize: 11.5, color: "#6b7280", lineHeight: 1.6, marginBottom: 10 }}>
            사용자에게 발급하는 키가 아닙니다. 이 고객사의 <b>서비스 계정 {accountCount}명</b>이 서비스를 쓸 때 티켓의 범위와 기간으로 승인합니다.
          </div>
          {/* 할당 SOBP 범위 — 범위마다 티켓이 덮은 Book 수 `PC-171` ② */}
          <div style={{ border: "1px solid #eef0f4", borderRadius: 10, padding: "9px 11px", marginBottom: 10, background: "#fafbfc" }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "#374151", marginBottom: 6 }}>할당 SOBP 범위 <span style={{ fontWeight: 400, color: "#9ca3af" }}>· 티켓 지정 Book / 전체</span></div>
            {ranges.length === 0 && <div style={{ fontSize: 11.5, color: "#9ca3af", lineHeight: 1.6 }}>SOBP 할당이 없습니다. <Link href="/ownership" style={{ color: "#2563eb" }}>SOBP 맵</Link>에서 먼저 할당하세요.</div>}
            {ranges.map((r, i) => {
              const cov = coveredBooks(r, mine), full = cov >= r.bookCount;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, padding: "3px 0", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "ui-monospace,monospace", color: "#374151" }}>{r.pt} S{r.section}/O{r.owner}/B{r.bookStart}~{r.bookEnd}</span>
                  {r.shared && <span style={tag("#f3e8ff", "#7e22ce")}>공유</span>}
                  <span style={{ flex: 1 }} />
                  <span style={tag(full ? "#dcfce7" : cov ? "#eef6ff" : "#fef3c7", full ? "#166534" : cov ? "#2563eb" : "#92400e")}>{cov.toLocaleString()} / {r.bookCount.toLocaleString()}권</span>
                </div>
              );
            })}
          </div>
          {right.kind === "add" && (
            <div style={{ border: "1px dashed #5f8ff0", background: "#f5f9ff", borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <b style={{ fontSize: 13.5, color: "#1d4ed8" }}>새 서비스 티켓</b>
                <span style={tag("#dbeafe", "#1d4ed8")}>작성 중</span>
              </div>
              <div style={{ fontSize: 11.5, color: "#6b7280", marginTop: 4 }}>오른쪽에서 범위와 사용기간을 정하고 [티켓 지정]을 누르세요.</div>
            </div>
          )}
          {mine.length === 0 && right.kind !== "add" && <div style={WS_EMPTY}>서비스 티켓이 없습니다.<br />[＋ 티켓 지정]으로 지정하세요.</div>}
          {mine.map((t) => {
            const on = right.kind === "t" && right.id === t.id;
            const st = ticketState(t);
            return (
              <div key={t.id} onClick={() => setRight({ kind: "t", id: t.id })} style={wsItem(on)}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <b style={{ fontSize: 13 }}>No.{t.no}</b>
                  <span style={tag(STATE_COLOR[st].bg, STATE_COLOR[st].fg)}>{st}</span>
                  {t.shared && <span style={tag("#f3e8ff", "#7e22ce")}>공유</span>}
                  <span style={{ flex: 1 }} />
                  <BillTag v={t} />
                </div>
                <div style={{ fontFamily: "ui-monospace,monospace", fontSize: 11.5, color: "#374151", marginTop: 4 }}>{serviceTicketText(t)}</div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>{t.since} ~ {t.until}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 오른쪽 — 티켓 상세 / 지정 */}
      <div style={{ minWidth: 0 }}>
        {right.kind === "t" && (() => {
          const t = mine.find((x) => x.id === right.id);
          return t ? <TicketDetail key={t.id} t={t} me={me?.name ?? ""} onDeleted={() => { const rest = mine.filter((x) => x.id !== t.id); setRight(rest[0] ? { kind: "t", id: rest[0].id } : { kind: "none" }); }} /> : null;
        })()}
        {right.kind === "add" && (
          <IssueForm key={`add-${company.id}`} coId={company.id} coName={company.name} ranges={ranges} mine={mine} me={me?.name ?? ""}
            onDone={(id) => setRight({ kind: "t", id })} onCancel={() => setRight(first())} />
        )}
        {right.kind === "none" && (
          <div style={{ ...card, padding: "48px 0", textAlign: "center", color: "#9ca3af", fontSize: 12.5, lineHeight: 1.8 }}>
            티켓을 선택하거나 <b>[＋ 티켓 지정]</b>을 누르세요.
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 티켓 상세 ─────────────────────────────────────────────── */
function TicketDetail({ t, onDeleted, me }: { t: ServiceTicket; onDeleted: () => void; me: string }) {
  const st = ticketState(t);
  const rows: [string, string | number][] = [
    ["Company Name", t.company], ["Code Type", t.pt], ["Section", t.section], ["Owner", t.owner],
    ["Book Start", t.bookStart], ["Book Volume", t.bookVol], ["Book End", t.bookEnd],
    ["Page Start", t.pageStart], ["Page Volume", t.pageVol], ["Page End", t.pageEnd],
    ["Valid From Time", t.since], ["Valid Until Time", t.until], ["지정 일시", t.at.replace("T", " ")], ["지정인", t.by || "-"],
  ];
  const del = () => {
    if (!confirm(`서비스 티켓 No.${t.no} 을(를) 삭제할까요?\n${serviceTicketText(t)}`)) return;
    deleteServiceTicket(t.id);
    logActivity("ticket", `서비스 티켓 삭제 · ${t.company} · No.${t.no} · ${serviceTicketText(t)}`, me);
    onDeleted();
  };
  return (
    <div style={card}>
      <div style={hd}>
        <b style={{ fontSize: 14 }}>서비스 티켓 No.{t.no}</b>
        <span style={tag(STATE_COLOR[st].bg, STATE_COLOR[st].fg)}>{st}</span>
        {t.shared && <span style={tag("#f3e8ff", "#7e22ce")}>공유 코드</span>}
        <span style={{ flex: 1 }} />
        <button type="button" onClick={del} style={{ ...S.smallBtn, color: "#dc2626" }}>티켓 삭제</button>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>이 고객사의 서비스 계정은 아래 범위와 사용기간 안에서 서비스 사용이 승인됩니다.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "6px 18px" }}>
          {rows.map(([k, v]) => (
            <div key={k} style={{ display: "flex", gap: 8, fontSize: 12.5, borderBottom: "1px dashed #f1f3f6", padding: "4px 0" }}>
              <span style={{ color: "#9ca3af", minWidth: 120 }}>{k}</span>
              <b style={{ fontFamily: "ui-monospace,monospace", color: "#111827" }}>{v}</b>
            </div>
          ))}
        </div>
        <ExpiryNote />
        {/* 정산 — N Key 와 같은 4종 `PC-176` */}
        <BillingEditor key={t.id} v={t} baseDate={t.at.slice(0, 10)} onSave={(p) => {
          setServiceBilling(t.id, { ...p, by: me });
          logActivity("ticket", `서비스 티켓 정산 · ${t.company} · No.${t.no} · ${p.billing}${p.billing === "유료" ? ` ${p.amount.toLocaleString()}원` : ""}`, me);
        }} />
      </div>
    </div>
  );
}

/* ── 티켓 지정 ─────────────────────────────────────────────── */
function IssueForm({ coId, coName, ranges, mine, me, onDone, onCancel }: {
  coId: number; coName: string; ranges: ServiceRange[]; mine: ServiceTicket[]; me: string;
  onDone: (id: number) => void; onCancel: () => void;
}) {
  const [idx, setIdx] = useState(-1);
  const [bStart, setBStart] = useState(0);
  const [bVol, setBVol] = useState(1);
  const [pStart, setPStart] = useState(0);
  const [pVol, setPVol] = useState(PAGE_DEFAULT);
  const [since, setSince] = useState(today());
  const [until, setUntil] = useState("");
  const [err, setErr] = useState("");
  const r = ranges[idx];
  const pick = (i: number) => {
    const x = ranges[i]; setIdx(i); setErr("");
    if (!x) return;
    setBStart(firstFreeBook(x, mine)); setBVol(1); setPStart(x.pageStart); setPVol(Math.min(PAGE_DEFAULT, x.pageEnd - x.pageStart + 1));
  };
  const maxVol = r ? Math.max(1, r.bookEnd - bStart + 1) : 1;
  const maxPVol = r ? Math.max(1, r.pageEnd - pStart + 1) : 1;

  const issue = () => {
    if (!r) { setErr("지정 범위(할당 SOBP)를 선택하세요."); return; }
    if (!since || !until) { setErr("사용기간 시작과 끝을 모두 정하세요."); return; }
    if (until < since) { setErr("사용기간 끝이 시작보다 앞설 수 없습니다."); return; }
    const cand = { section: r.section, owner: r.owner, bookStart: bStart, bookEnd: bStart + bVol - 1, pageStart: pStart, pageEnd: pStart + pVol - 1 };
    // N Key · App Key · 서비스 티켓은 SOBP 가 절대 겹칠 수 없다 — 고객사를 가리지 않고 전체에서 검사 `PC-174`
    const clash = sobpOverlapMsg(cand);
    if (clash) { setErr(clash); return; }
    const t = addServiceTicket({ companyId: coId, company: coName, pt: r.pt, section: r.section, owner: r.owner,
      bookStart: cand.bookStart, bookVol: bVol, bookEnd: cand.bookEnd, pageStart: pStart, pageVol: pVol, pageEnd: cand.pageEnd,
      since, until, shared: r.shared, by: me });
    logActivity("ticket", `서비스 티켓 지정 · ${coName} · No.${t.no} · ${serviceTicketText(t)} · 기간 ${since}~${until}`, me);
    onDone(t.id);
  };

  return (
    <div style={card}>
      <div style={hd}><b style={{ fontSize: 14 }}>서비스 티켓 지정</b><span style={{ fontSize: 11.5, color: "#9ca3af" }}>{coName}</span></div>
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>지정 범위 (할당 SOBP · 공유 코드) *</div>
        <SobpRangePicker company ranges={ranges} value={idx} onSelect={pick} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 12 }}>
          <Field label={`Start Book ${r ? `· ${r.bookStart}~${r.bookEnd}` : ""}`}>
            <input type="number" style={S.input} value={bStart} disabled={!r} min={r?.bookStart} max={r?.bookEnd}
              onChange={(e) => r && setBStart(Math.max(r.bookStart, Math.min(r.bookEnd, +e.target.value || 0)))} />
          </Field>
          <Field label={`Book 볼륨 (권) ${r ? `· 최대 ${maxVol}` : ""}`}>
            <input type="number" style={S.input} value={Math.min(bVol, maxVol)} disabled={!r} min={1} max={maxVol}
              onChange={(e) => setBVol(Math.max(1, Math.min(maxVol, +e.target.value || 1)))} />
          </Field>
          <Field label={`Start Page ${r ? `· ${r.pageStart}~${r.pageEnd}` : ""}`}>
            <input type="number" style={S.input} value={pStart} disabled={!r} min={r?.pageStart} max={r?.pageEnd}
              onChange={(e) => r && setPStart(Math.max(r.pageStart, Math.min(r.pageEnd, +e.target.value || 0)))} />
          </Field>
          <Field label={`Page 볼륨 ${r ? `· 최대 ${maxPVol}` : ""}`}>
            <input type="number" style={S.input} value={Math.min(pVol, maxPVol)} disabled={!r} min={1} max={maxPVol}
              onChange={(e) => setPVol(Math.max(1, Math.min(maxPVol, +e.target.value || 1)))} />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          <Field label="Valid From Time (사용기간 시작) *">
            <input type="date" style={S.input} value={since} disabled={!r} onChange={(e) => setSince(e.target.value)} />
          </Field>
          <Field label="Valid Until Time (사용기간 끝) *">
            <input type="date" style={S.input} value={until} disabled={!r} min={since || undefined} onChange={(e) => setUntil(e.target.value)} />
          </Field>
        </div>
        <ExpiryNote />
        {err && <div style={{ marginTop: 12, fontSize: 12.5, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 9, padding: "9px 12px" }}>{err}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button type="button" onClick={onCancel} style={S.ghost}>취소</button>
          <button type="button" onClick={issue} disabled={!r} style={{ ...S.primary, opacity: r ? 1 : 0.5 }}>티켓 지정</button>
        </div>
      </div>
    </div>
  );
}

