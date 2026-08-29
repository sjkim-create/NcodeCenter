"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { S, Field, Modal, BLUE } from "./ui";
import { useStore } from "@/lib/store";
import { useAuth, currentUser } from "@/lib/authStore";
import { logActivity } from "@/lib/activityStore";
import { makeZip } from "@/lib/zip";
import { codeKind, kindLabel, patternOf, patternTypeParam } from "@/lib/codeKind";
import { codesOfCompany } from "@/lib/commonCodes";
import { membersOf, hydrateMembers, useCommonMembers } from "@/lib/commonMembers";
import {
  addTicket, allTickets, deleteTicket, hydrateTickets, setBilling, ticketById, updateTicket, useTickets,
  BILLINGS, BILLINGS_FILTER, BILL_COLOR, daysLeft, plusMonth, type Billing, type Ticket,
} from "@/lib/ticketStore";

type Tab = "nkey" | "list";

// 발급 화면 사이 고객사 선택값 공유 — 발급 메뉴가 사이드바로 나뉘어 화면이 바뀌어도 유지한다.
const CO_KEY = "ncc-ticket-company";
const readCompanyId = () => {
  if (typeof window === "undefined") return 0;
  try { return Number(sessionStorage.getItem(CO_KEY)) || 0; } catch { return 0; }
};

// Key 관리 (N Key 발급) — [목록 → 등록] 한 쌍. 계정 발급(AccountsView)과 같은 구조다.
//   · tab="list" → /tickets/nkey      발급·정산 목록 (옛 "Key 발급 정산" 메뉴)
//   · tab="nkey" → /tickets/nkey/new  N Key 생성 (Caster lite 티켓)
// 목록에는 N Key(여기서 발급)와 App Key(계정 발급에서 발급)가 함께 쌓인다 — 종류 필터로 구분.
export default function TicketsView({ tab }: { tab: Tab }) {
  const { companies, projects } = useStore();
  const me = currentUser(useAuth());
  useTickets();
  useEffect(() => { hydrateTickets(); }, []);

  const [companyId, setCompanyIdState] = useState(0);     // 회사 선택 → 발급 목록 필터 기준
  useEffect(() => { setCompanyIdState(readCompanyId()); }, []);   // 화면 이동 후에도 고객사 유지
  const setCompanyId = (n: number) => {
    setCompanyIdState(n);
    try { sessionStorage.setItem(CO_KEY, String(n)); } catch { /* */ }
  };

  return (
    <div style={{ padding: "18px 20px" }}>
      {tab === "nkey" && <div style={{ maxWidth: 900 }}><NKeyForm companies={companies} projects={projects} me={me} companyId={companyId} setCompanyId={setCompanyId} /></div>}
      {tab === "list" && <TicketListView />}
    </div>
  );
}

/* ── 발급 목록 + 정산(과금) 등록 ── */
const won = (n: number) => `₩${Math.round(n).toLocaleString()}`;

// 정산 등록·수정은 발급 상세(/tickets/nkey/[id])로 넘긴다 — 목록은 조회·이동만 한다.
function TicketListView() {
  useTickets();
  const rows = allTickets();
  const [fCo, setFCo] = useState("");
  const [fKind, setFKind] = useState<"" | "N" | "APP">("");
  const [fBill, setFBill] = useState<"" | Billing>("");
  const [fSrc, setFSrc] = useState<"" | "ledger" | "new">("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: "at" | "company" | "by"; dir: 1 | -1 }>({ key: "at", dir: -1 });   // 기본: 최근순
  const toggleSort = (key: "at" | "company" | "by") =>
    setSort((s) => (s.key === key ? { key, dir: (s.dir === 1 ? -1 : 1) as 1 | -1 } : { key, dir: key === "at" ? -1 : 1 }));
  // 외부 키 파일(.json) 불러오기 — 목록에 없는 키도 내용을 확인한다.
  const [loadedKey, setLoadedKey] = useState<{ name: string; rows: KV[]; err?: string } | null>(null);
  const loadKeyFile = (f?: File) => {
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try { setLoadedKey({ name: f.name, rows: toKV(JSON.parse(String(rd.result))) }); }
      catch { setLoadedKey({ name: f.name, rows: [], err: "JSON 형식의 티켓 파일이 아닙니다. Key 생성으로 내려받은 .json 파일을 선택하세요." }); }
    };
    rd.readAsText(f);
  };

  // 페이지네이션 (고객사 관리 목록과 동일 · 기본 50건씩)
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  useEffect(() => { setPage(1); }, [fCo, fKind, fBill, fSrc, q, sort.key, sort.dir]);

  const list = rows
    .filter((t) => (fCo ? t.company === fCo : true))
    .filter((t) => (fKind ? t.kind === fKind : true))
    .filter((t) => (fBill ? t.billing === fBill : true))
    .filter((t) => (fSrc === "ledger" ? t.src === "ledger" : fSrc === "new" ? t.src !== "ledger" : true))
    .filter((t) => (q ? (t.summary + " " + t.by).toLowerCase().includes(q.toLowerCase()) : true))   // 발급내용·발급인 검색
    .sort((a, b) => {
      const k = sort.key;
      const va = k === "at" ? a.at : k === "company" ? a.company : a.by;
      const vb = k === "at" ? b.at : k === "company" ? b.company : b.by;
      const c = k === "at" ? (va < vb ? -1 : va > vb ? 1 : a.no - b.no) : va.localeCompare(vb, "ko");
      return c * sort.dir || b.no - a.no;
    });

  const coOpts = [...new Set(rows.map((t) => t.company))].sort((a, b) => a.localeCompare(b, "ko"));
  const agg = list.reduce((a, t) => ({
    paid: a.paid + (t.billing === "유료" ? 1 : 0), amount: a.amount + (t.billing === "유료" ? t.amount : 0),
    free: a.free + (t.billing === "무료" ? 1 : 0), trial: a.trial + (t.billing === "체험" ? 1 : 0),
    todo: a.todo + (t.billing === "미정" ? 1 : 0),
    expired: a.expired + (t.billing === "체험" && (daysLeft(t.trialUntil) ?? 0) < 0 ? 1 : 0),
  }), { paid: 0, amount: 0, free: 0, trial: 0, todo: 0, expired: 0 });

  // 요약·정산 합계는 필터 결과(list) 전체 기준, 표만 현재 페이지를 그린다.
  const totalPages = Math.max(1, Math.ceil(list.length / perPage));
  const curPage = Math.min(page, totalPages);
  const pageRows = list.slice((curPage - 1) * perPage, curPage * perPage);

  return (
    <div>
      {/* 요약 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 12 }}>
        {[
          ["발급 티켓", list.length.toLocaleString(), "#111827"],
          ["유료 합계", won(agg.amount), "#1d4ed8"],
          ["유료 건수", `${agg.paid}건`, "#2563eb"],
          ["무료 / 체험", `${agg.free} / ${agg.trial}건`, "#166534"],
          ["정산 미등록", `${agg.todo}건`, agg.todo ? "#dc2626" : "#9ca3af"],
        ].map(([l, v, c], i) => (
          <div key={i} style={{ ...S.card, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: "#6b7280" }}>{l}</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: c }}>{v}</div>
          </div>
        ))}
      </div>
      {agg.expired > 0 && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: 9, padding: "9px 12px", fontSize: 12.5, marginBottom: 12 }}>
          ⚠ 체험 기간이 만료된 티켓 <b>{agg.expired}건</b> — 유료 전환 또는 회수 여부를 확인하세요.
        </div>
      )}

      {/* 필터 */}
      <div style={{ ...S.card, padding: "10px 12px", marginBottom: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 12.5 }}>
        <select value={fCo} onChange={(e) => setFCo(e.target.value)} style={{ ...S.input, width: 180 }}>
          <option value="">고객사 전체</option>
          {coOpts.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <div style={{ display: "flex", gap: 4 }}>
          {([["", "전체"], ["N", "N Key"], ["APP", "App Key"]] as const).map(([v, l]) => (
            <button key={v} onClick={() => setFKind(v)} style={chip(fKind === v)}>{l}</button>
          ))}
        </div>
        <span style={{ color: "#d1d5db" }}>|</span>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => setFBill("")} style={chip(fBill === "")}>정산 전체</button>
          {BILLINGS_FILTER.map((b) => <button key={b} onClick={() => setFBill(b)} style={chip(fBill === b)}>{b}</button>)}
        </div>
        <span style={{ color: "#d1d5db" }}>|</span>
        <div style={{ display: "flex", gap: 4 }}>
          {([["", "전체"], ["ledger", "대장"], ["new", "신규발급"]] as const).map(([v, l]) => (
            <button key={v} onClick={() => setFSrc(v)} style={chip(fSrc === v)} title={v === "ledger" ? "nkey(HLP) 발급 대장" : v === "new" ? "이 화면에서 발급한 티켓" : undefined}>{l}</button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="고객사·내용 검색" style={{ ...S.input, width: 190 }} />
        <label style={{ ...S.ghost, display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}
          title="발급된 키 파일(.json)을 열어 내용을 확인합니다. 목록에 없는 외부 키도 됩니다.">
          📂 N Key 불러오기
          <input type="file" accept=".json,application/json" style={{ display: "none" }}
            onChange={(e) => { loadKeyFile(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        <Link href="/tickets/nkey/new" style={{ ...S.primary, textDecoration: "none", whiteSpace: "nowrap" }}>＋ N Key 발급</Link>
      </div>

      <div style={{ ...S.card, padding: 0, overflow: "auto" }}>
        <table style={{ ...S.table, textAlign: "center", minWidth: 1040 }}>
          <thead>
            <tr>{([
              ["No", null], ["발급일시", "at"], ["종류", null], ["고객사", "company"], ["발급 내용", null],
              ["발급인", "by"], ["정산", null], ["금액", null], ["비고", null], ["작업", null],
            ] as const).map(([h, k]) => (
              <th key={h} style={{ ...S.th, textAlign: "center", cursor: k ? "pointer" : "default", userSelect: "none" }}
                onClick={() => k && toggleSort(k)} title={k ? "클릭하면 정렬" : undefined}>
                {h}{k && <span style={{ marginLeft: 3, color: sort.key === k ? "#2563eb" : "#d1d5db" }}>{sort.key === k ? (sort.dir === 1 ? "▲" : "▼") : "↕"}</span>}
              </th>
            ))}</tr>
          </thead>
          <tbody>
            {pageRows.map((t) => {
              const c = BILL_COLOR[t.billing];
              const left = t.billing === "체험" ? daysLeft(t.trialUntil) : null;
              return (
                <tr key={t.id} style={{ borderTop: "1px solid #eef0f4" }}>
                  <td style={{ ...S.td, fontFamily: "ui-monospace,monospace" }}>
                    <Link href={`/tickets/nkey/${t.id}`} style={{ color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>{t.no}</Link>
                  </td>
                  <td style={{ ...S.td, fontFamily: "ui-monospace,monospace", fontSize: 11.5, whiteSpace: "nowrap" }}>{t.at.slice(0, 16).replace("T", " ")}</td>
                  <td style={S.td}><span style={{ ...S.tag, background: t.kind === "APP" ? "#fef3c7" : "#eef6ff", color: t.kind === "APP" ? "#92400e" : "#2563eb" }}>{t.kind === "APP" ? "App Key" : "N Key"}</span></td>
                  <td style={{ ...S.td, fontWeight: 600, textAlign: "left" }}>
                    {t.company}
                    {t.src === "ledger" && <span style={{ ...S.tag, fontSize: 8.5, marginLeft: 5, background: "#f3f4f6", color: "#9ca3af" }} title="nkey(HLP) 발급 대장에서 가져온 과거 이력">대장</span>}
                  </td>
                  <td style={{ ...S.td, textAlign: "left", fontSize: 11.5, maxWidth: 300 }}>
                    <Link href={`/tickets/nkey/${t.id}`} style={{ color: "#6b7280", textDecoration: "none" }} title="클릭하면 상세·수정">{t.summary}</Link>
                  </td>
                  <td style={{ ...S.td, fontSize: 11.5 }}>{t.by || "-"}</td>
                  <td style={S.td}>
                    <span style={{ ...S.tag, background: c.bg, color: c.fg, fontWeight: 700 }}>{t.billing}</span>
                    {t.billing === "체험" && t.trialUntil && (
                      <div style={{ fontSize: 10, marginTop: 2, color: (left ?? 0) < 0 ? "#dc2626" : "#92400e" }}>
                        ~{t.trialUntil} {(left ?? 0) < 0 ? "(만료)" : `(D-${left})`}
                      </div>
                    )}
                  </td>
                  <td style={{ ...S.td, fontWeight: 700, color: t.billing === "유료" ? "#1d4ed8" : "#d1d5db", whiteSpace: "nowrap" }}>
                    {t.billing === "유료" ? won(t.amount) : "-"}
                  </td>
                  <td style={{ ...S.td, textAlign: "left", fontSize: 11, color: "#9ca3af", maxWidth: 160 }}>{t.billNote || "-"}</td>
                  <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                    <Link href={`/tickets/nkey/${t.id}?tab=bill`} style={{ ...S.smallBtn, textDecoration: "none" }}>정산</Link>
                    <Link href={`/tickets/nkey/${t.id}`} style={{ ...S.linkBtn, marginLeft: 6, textDecoration: "none" }}>상세</Link>
                    <button onClick={() => { if (confirm(`발급 ${t.no}번 기록을 삭제할까요?`)) deleteTicket(t.id); }} style={{ ...S.linkBtn, marginLeft: 6, color: "#dc2626" }}>삭제</button>
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr><td colSpan={10} style={{ ...S.td, textAlign: "center", color: "#9ca3af", padding: 30 }}>
                {rows.length === 0 ? "아직 발급된 티켓이 없습니다. [＋ N Key 발급] 또는 [계정 발급 (App Key 발급)] 메뉴에서 발급하세요." : "필터에 맞는 티켓이 없습니다."}
              </td></tr>
            )}
          </tbody>
        </table>
        {list.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 14px", borderTop: "1px solid #eef0f4", flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              전체 <b style={{ color: "#111827" }}>{list.length.toLocaleString()}</b>건 중 {((curPage - 1) * perPage + 1).toLocaleString()}~{Math.min(curPage * perPage, list.length).toLocaleString()} 표시
              <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }} style={{ marginLeft: 8, fontSize: 12, padding: "3px 6px", border: "1px solid #e5e7eb", borderRadius: 6 }}>
                {[25, 50, 100, 200, 500].map((n) => <option key={n} value={n}>{n}건씩</option>)}
                <option value={list.length || 1}>전체 보기</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button onClick={() => setPage(1)} disabled={curPage === 1} style={pgBtn(false, curPage === 1)}>«</button>
              <button onClick={() => setPage(curPage - 1)} disabled={curPage === 1} style={pgBtn(false, curPage === 1)}>‹</button>
              {pageWindow(curPage, totalPages).map((n) => (
                <button key={n} onClick={() => setPage(n)} style={pgBtn(n === curPage, false)}>{n}</button>
              ))}
              <button onClick={() => setPage(curPage + 1)} disabled={curPage === totalPages} style={pgBtn(false, curPage === totalPages)}>›</button>
              <button onClick={() => setPage(totalPages)} disabled={curPage === totalPages} style={pgBtn(false, curPage === totalPages)}>»</button>
              <span style={{ fontSize: 11.5, color: "#9ca3af", marginLeft: 6 }}>{curPage} / {totalPages}</span>
            </div>
          </div>
        )}
      </div>

      {loadedKey && (
        <KeyInfoModal
          title="N Key 불러오기" subtitle={loadedKey.name}
          source="불러온 파일" all={loadedKey.rows} err={loadedKey.err} onClose={() => setLoadedKey(null)} />
      )}
    </div>
  );
}

/* ── 발급 상세 · 수정 — 목록에서 발급번호·발급내용을 누르면 열린다 ── */
export function TicketDetailView({ ticketId }: { ticketId: number }) {
  const router = useRouter();
  const me = currentUser(useAuth());
  useTickets();

  const [ready, setReady] = useState(false);
  useEffect(() => { hydrateTickets(); setReady(true); }, []);

  const t = ready ? ticketById(ticketId) : undefined;

  // 목록의 [정산] 은 ?tab=bill 로 들어와 정산 정보 탭을 바로 연다.
  const sp = useSearchParams();
  const [tab, setTab] = useState<"base" | "bill">(sp.get("tab") === "bill" ? "bill" : "base");
  // ① 발급 기본정보
  const [summary, setSummary] = useState("");
  const [kv, setKv] = useState<{ k: string; v: string; num: boolean }[]>([]);
  // ② 정산 정보 — 탭이 달라도 [저장] 한 번에 함께 저장한다.
  const [billing, setBilling2] = useState<Billing>("미정");
  const [amount, setAmount] = useState(0);
  const [billNote, setBillNote] = useState("");
  const [trial, setTrial] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  // 티켓 값 주입 (최초 1회 — 편집 중 스토어 변경에 덮이지 않도록)
  useEffect(() => {
    if (!t || loaded) return;
    setSummary(t.summary);
    setKv(Object.entries(t.params).map(([k, v]) => ({ k, v: String(v), num: typeof v === "number" })));
    setBilling2(t.billing); setAmount(t.amount); setBillNote(t.billNote ?? ""); setTrial(t.trialUntil ?? plusMonth(t.at));
    setLoaded(true);
  }, [t, loaded]);

  if (!ready) return null;
  if (!t) {
    return (
      <div style={{ padding: "18px 20px", maxWidth: 900 }}>
        <div style={{ ...S.card, padding: 24, fontSize: 13, color: "#6b7280" }}>
          발급 기록을 찾을 수 없습니다. <Link href="/tickets/nkey" style={{ color: "#2563eb" }}>Key 관리 목록으로</Link>
        </div>
      </div>
    );
  }

  const kindLabel2 = t.kind === "APP" ? "App Key" : "N Key";

  // 저장 — 탭을 나눠 놨을 뿐이라 [저장]은 두 탭 내용을 함께 기록한다.
  const save = () => {
    if (!summary.trim()) { setTab("base"); setToast({ ok: false, text: "발급 내용을 입력하세요." }); return; }
    if (billing === "유료" && amount <= 0) { setTab("bill"); setToast({ ok: false, text: "유료는 금액을 입력해야 합니다." }); return; }
    // 원래 숫자였던 항목은 숫자로 되돌린다 (표시·재사용 시 타입 유지)
    const params = Object.fromEntries(kv.map((r) => [
      r.k, r.num && r.v.trim() !== "" && !Number.isNaN(Number(r.v)) ? Number(r.v) : r.v,
    ]));
    updateTicket(t.id, { summary: summary.trim(), params });
    setBilling(t.id, { billing, amount, billNote: billNote.trim(), trialUntil: trial, by: me?.name ?? "" });
    logActivity("ticket", `발급 수정 · ${t.company} · 발급 ${t.no}번 · ${kindLabel2} · ${billing}`, me?.name);
    setToast({ ok: true, text: "발급 기본정보와 정산 정보가 저장되었습니다." });
  };

  const TABS = [["base", "발급 기본정보"], ["bill", "정산 정보"]] as const;

  return (
    <div style={{ padding: "18px 20px", maxWidth: 900 }}>
      <div style={{ ...S.card, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>발급 상세 · 수정</div>
          <span style={{ ...S.tag, background: t.kind === "APP" ? "#fef3c7" : "#eef6ff", color: t.kind === "APP" ? "#92400e" : "#2563eb", fontWeight: 700 }}>{kindLabel2}</span>
          <code style={{ fontFamily: "ui-monospace,monospace", color: "#374151", fontSize: 12.5 }}>발급 {t.no}번</code>
          <span style={{ ...S.tag, background: "#f3f4f6", color: "#6b7280" }}>{t.company}</span>
          {t.src === "ledger" && <span style={{ ...S.tag, background: "#f3f4f6", color: "#9ca3af" }} title="nkey(HLP) 발급 대장에서 가져온 과거 이력">대장</span>}
        </div>

        {/* 탭 — 발급 기본정보 / 정산 정보. 저장은 아래 [저장] 하나로 두 탭 모두 반영된다. */}
        <div style={{ display: "flex", borderBottom: "1px solid #eef0f4", marginBottom: 14 }}>
          {TABS.map(([v, l]) => {
            const on = tab === v;
            return (
              <button key={v} onClick={() => setTab(v)}
                style={{ border: 0, background: "none", padding: "9px 16px", fontSize: 13, cursor: "pointer",
                  color: on ? "#111827" : "#6b7280", fontWeight: on ? 700 : 400,
                  borderBottom: `2px solid ${on ? BLUE : "transparent"}`, marginBottom: -1 }}>
                {l}
              </button>
            );
          })}
        </div>

        {tab === "base" ? (
          <>
            {/* 고객사·일시·발급인은 원장 기준값이라 고정 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <Field label="고객사"><div style={{ ...S.input, background: "#f7f8fa", color: "#6b7280" }}>{t.company}</div></Field>
              <Field label="발급일시"><div style={{ ...S.input, background: "#f7f8fa", color: "#6b7280", fontFamily: "ui-monospace,monospace" }}>{t.at.slice(0, 16).replace("T", " ")}</div></Field>
              <Field label="발급인"><div style={{ ...S.input, background: "#f7f8fa", color: "#6b7280" }}>{t.by || "-"}</div></Field>
            </div>
            <div style={{ marginTop: 12 }}>
              <Field label="발급 내용 (목록 표기) *">
                <input style={S.input} value={summary} onChange={(e) => setSummary(e.target.value)} />
              </Field>
            </div>

            {/* Key 정보 — 발급 당시 파라미터를 값만 수정 */}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
                Key 정보 <span style={{ fontWeight: 400, color: "#9ca3af" }}>· {kv.length}개 항목 · 값만 수정합니다</span>
              </div>
              <div style={{ border: "1px solid #eef0f4", borderRadius: 9, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ background: "#fafbfc" }}>
                      <th style={{ ...S.th, textAlign: "left", width: 240 }}>Key</th>
                      <th style={{ ...S.th, textAlign: "left" }}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kv.map((r, i) => (
                      <tr key={r.k} style={{ borderTop: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "6px 12px", color: "#374151", fontWeight: 600, fontFamily: "ui-monospace,monospace", wordBreak: "break-all" }}>{r.k}</td>
                        <td style={{ padding: "5px 10px" }}>
                          <input style={{ ...S.input, padding: "6px 9px", fontSize: 12.5 }} value={r.v}
                            onChange={(e) => setKv(kv.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)))} />
                        </td>
                      </tr>
                    ))}
                    {kv.length === 0 && (
                      <tr><td colSpan={2} style={{ padding: 24, textAlign: "center", color: "#9ca3af" }}>기록된 Key 항목이 없습니다.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6, lineHeight: 1.6 }}>
                이미 내려받은 키 파일은 바뀌지 않습니다. 여기 수정은 <b>발급 원장의 기록</b>을 바로잡는 용도입니다.
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>과금 유형 <span style={{ color: "#9ca3af" }}>· 업체·티켓마다 다르게 등록할 수 있습니다</span></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 14 }}>
              {BILLINGS.map((b) => {
                const on = billing === b; const bc = BILL_COLOR[b];
                return (
                  <button key={b} onClick={() => setBilling2(b)}
                    style={{ padding: "10px 8px", borderRadius: 9, cursor: "pointer", fontSize: 12.5, fontWeight: on ? 700 : 400,
                      border: `1px solid ${on ? bc.fg : "#e5e7eb"}`, background: on ? bc.bg : "#fff", color: on ? bc.fg : "#6b7280" }}>
                    {b}
                    <div style={{ fontSize: 10, fontWeight: 400, color: on ? bc.fg : "#9ca3af", marginTop: 2 }}>
                      {b === "유료" ? "금액 입력" : b === "무료" ? "청구 없음" : b === "체험" ? "1개월" : "미등록"}
                    </div>
                  </button>
                );
              })}
            </div>

            {billing === "유료" && (
              <div style={{ maxWidth: 320 }}>
                <Field label="금액 (원) *">
                  <input type="number" min={0} step={10000} style={S.input} value={amount} onChange={(e) => setAmount(Math.max(0, Math.round(+e.target.value)))} />
                </Field>
              </div>
            )}
            {billing === "체험" && (
              <div style={{ maxWidth: 320 }}>
                <Field label="체험 만료일 (기본 = 발급일 + 1개월)">
                  <input type="date" style={S.input} value={trial} onChange={(e) => setTrial(e.target.value)} />
                </Field>
                <div style={{ fontSize: 11.5, color: "#92400e", marginTop: 4 }}>만료되면 목록에서 <b>(만료)</b>로 표시되고 상단에 경고가 뜹니다.</div>
              </div>
            )}
            {billing === "무료" && <div style={{ fontSize: 12.5, color: "#166534" }}>청구하지 않는 티켓으로 기록됩니다. (사유는 아래 비고에 남겨 주세요)</div>}

            <div style={{ marginTop: 12 }}>
              <Field label="비고 (사유·계약 정보)">
                <input style={S.input} value={billNote} onChange={(e) => setBillNote(e.target.value)} placeholder="예) 2026 연간 계약 포함 · 데모 제공" />
              </Field>
            </div>

            {t.billedAt && <div style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 10 }}>최근 등록: {t.billedAt.slice(0, 16).replace("T", " ")} {t.billedBy ? `· ${t.billedBy}` : ""}</div>}
          </>
        )}

        {/* 하단 액션 — [목록]은 여기 있다. 저장은 두 탭 내용을 함께 기록한다. */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 18, paddingTop: 14, borderTop: "1px solid #eef0f4" }}>
          <button onClick={() => { if (confirm(`발급 ${t.no}번 기록을 삭제할까요?`)) { deleteTicket(t.id); router.push("/tickets/nkey"); } }}
            style={{ ...S.ghost, color: "#dc2626", borderColor: "#fecaca" }}>발급 기록 삭제</button>
          <span style={{ flex: 1 }} />
          <Link href="/tickets/nkey" style={{ ...S.ghost, textDecoration: "none" }}>목록</Link>
          <button onClick={save} style={S.primary}>저장</button>
        </div>
        {toast && <div style={{ marginTop: 10, fontSize: 12.5, color: toast.ok ? "#047857" : "#dc2626", textAlign: "right" }}>{toast.text}</div>}
      </div>
    </div>
  );
}

/* ── N Key: Caster lite 티켓 파라미터(회사이름·Section/Owner·Book·Page·PatternType 등) ── */
const PATTERNS = ["OID", "PDS2", "PDS3", "Scode"] as const;
type Pattern = (typeof PATTERNS)[number];
// 패턴·섹션별 Page 가용 범위(자동 채움 참고값)
const PAGE_CAP: Partial<Record<Pattern, Record<number, number>>> = {
  PDS3: { 0: 4096, 3: 512, 5: 4096, 10: 1024, 11: 512, 14: 32, 15: 512 },
  PDS2: { 0: 1024, 3: 4096, 14: 1024 },
  Scode: { 44: 256 },          // PDS4 (S-code) — Section 44
  OID: { 3: 4096 },            // OID — 인덱스 전용(같은 S/O 공유, B/P로 구분)
};
// 패턴·섹션별 Book 정원 (Ncode 정보 기준)
const BOOK_CAP: Partial<Record<Pattern, Record<number, number>>> = {
  PDS3: { 0: 16384, 3: 8192, 5: 4096, 10: 4096, 11: 8192, 14: 8192, 15: 4096 },
  PDS2: { 0: 8192, 3: 4096, 14: 4096 },
  Scode: { 44: 256 },
  OID: { 3: 8192 },
};
const yyyymmdd = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, ""); // KST

// Caster lite 티켓을 붙여넣는 대상 폴더 (안내용)
const CODE_TICKETS = "C:\\Users\\Documents\\NeoLab\\CodeTickets";

function NKeyForm({ companies, projects, me, companyId, setCompanyId }: { companies: ReturnType<typeof useStore>["companies"]; projects: ReturnType<typeof useStore>["projects"]; me: ReturnType<typeof currentUser>; companyId: number; setCompanyId: (n: number) => void }) {
  const [sobpIdx, setSobpIdx] = useState(-1);
  const [bookStart, setBookStart] = useState(0);   // Start Book (할당 범위 안에서 직접 입력)
  const [books, setBooks] = useState(1);           // Book 볼륨(권)
  const [pageStart, setPageStart] = useState(1);   // 0 / 1(기본) / 2
  const [pageVolume, setPageVolume] = useState(512);
  const [untilUnlimited, setUntilUnlimited] = useState(true); // 무제한(기본)
  const [validUntil, setValidUntil] = useState("");           // YYMMDD 6자리
  const [separate, setSeparate] = useState(false);
  const [toast, setToast] = useState("");
  const [cuIdx, setCuIdx] = useState(-1);           // 공통코드 회사의 '사용 고객사' 선택

  const company = companies.find((c) => c.id === companyId);
  const issuedTime = yyyymmdd();

  useEffect(() => { hydrateMembers(); }, []);
  useCommonMembers();   // 사용자 등록분 변경 시 리렌더

  // 공통(커먼) 코드 회사인가 → 이 회사가 보유한 공통코드들 (중앙 레지스트리). 이력전용(A/IDS)은 티켓 발급 제외.
  const commonCodes = useMemo(() => (company ? codesOfCompany(company.name).filter((c) => !c.historyOnly) : []), [company]);
  const isCommon = commonCodes.length > 0;

  // 고객사 선택 시 할당된 SOBP 범위 (Section/Owner/BookStart/PatternType/PageVolume 자동)
  //   · 공통코드 회사면 공통코드를 범위로 제공 (Book/Page = 섹션 정원)
  const ranges = useMemo(() => {
    if (!company) return [];
    if (isCommon) {
      return commonCodes.map((c) => {
        const pt: Pattern = patternOf(codeKind(c.k, c.s));
        const bcap = BOOK_CAP[pt]?.[c.s] ?? 4096, pcap = PAGE_CAP[pt]?.[c.s] ?? 512;
        return { pt, section: c.s, owner: c.o, bookStart: 0, bookEnd: bcap - 1, pageStart: 0, pageEnd: pcap - 1, bookCount: bcap };
      });
    }
    return projects.filter((p) => p.companyId === company.id).flatMap((p) => p.issued.map((b) => {
      const pt: Pattern = patternOf(codeKind(b.kind, b.section));
      return { pt, section: b.section, owner: b.owner, bookStart: b.bookStart, bookEnd: b.bookEnd,
        pageStart: b.pageStart, pageEnd: b.pageEnd, bookCount: Math.max(1, b.bookEnd - b.bookStart + 1) };
    }));
  }, [company, isCommon, commonCodes, projects]);
  const range = ranges[sobpIdx];

  // 공통코드 회사의 '사용 고객사' 후보 — 각 코드의 중앙 멤버십(히스토리+등록). 코드 라벨과 함께 한 목록으로.
  const cuCandidates = useMemo(() => {
    if (!isCommon) return [];
    return commonCodes.flatMap((c) =>
      membersOf(c.k, c.s, c.o).map((m) => ({ cu: m.name, k: c.k, section: c.s, owner: c.o, label: `${m.name} · ${c.label}${m.seeded ? "" : " · 신규"}` })));
  }, [isCommon, commonCodes]);
  const selCu = cuCandidates[cuIdx];

  const onCompany = (id: number) => { setCompanyId(id); setSobpIdx(-1); setBooks(1); setPageStart(1); setBookStart(0); setCuIdx(-1); };
  const onRange = (i: number) => {
    setSobpIdx(i); const r = ranges[i]; if (!r) return;
    setBookStart(r.bookStart);
    setBooks(r.bookCount);
    setPageVolume(PAGE_CAP[r.pt]?.[r.section] ?? pageVolume);
  };
  // 공통코드 회사: '사용 고객사' 선택 → 그 고객사가 쓰는 공통코드(타입·섹션·오너)를 자동으로 범위 지정
  const onCu = (i: number) => {
    setCuIdx(i); const sc = cuCandidates[i]; if (!sc) return;
    const ri = ranges.findIndex((r) => r.owner === sc.owner && r.section === sc.section && (r.pt === "PDS3") === (sc.k === "N"));
    if (ri >= 0) onRange(ri);
  };
  // 남은 권수 = 시작 Book 부터 할당 범위 끝까지
  const maxBooks = range ? Math.max(1, range.bookEnd - bookStart + 1) : 1;
  const bookEnd = bookStart + books - 1;

  // 발급 파라미터 — 화면 표시·키 생성·정보 확인이 같은 값을 쓴다
  const ticketParams = () => ({
    CompanyName: company?.name ?? "-",
    IssuedTime: issuedTime,
    ValidUntilTime: untilUnlimited ? "99999999 (무제한)" : validValue,
    Section: range?.section ?? "-",
    Owner: range?.owner ?? "-",
    TicketVersion: 1,
    BookStart: bookStart,
    BookVolume: books,
    PageStart: pageStart,
    PageVolume: pageVolume,
    PatternType: range ? patternTypeParam(range.pt) : "-",
    TicketType: "Unlimited",
    SeparateEachBook: separate ? "Y (북코드별 개별 티켓)" : "N (1개 티켓 병합)",
    ...(isCommon ? { UsedCustomer: selCu?.cu ?? "-" } : {}),   // 공통코드: 사용 고객사
  });

  // 6자리(YYMMDD) ↔ 달력(YYYY-MM-DD)
  const sixToDate = (s2: string) => (/^\d{6}$/.test(s2) ? `20${s2.slice(0, 2)}-${s2.slice(2, 4)}-${s2.slice(4, 6)}` : "");
  const dateToSix = (d: string) => (d ? d.slice(2).replace(/-/g, "") : "");
  const validValue = untilUnlimited ? "99999999" : validUntil;

  const genKey = () => {
    if (!company) { setToast("고객사를 선택하세요."); return; }
    if (isCommon && !selCu) { setToast("공통코드 회사입니다. 사용 고객사를 선택하세요."); return; }
    if (!range) { setToast("이 고객사에 할당된 SOBP 범위가 없습니다."); return; }
    if (bookStart < range.bookStart || bookStart > range.bookEnd) { setToast(`Start Book은 ${range.bookStart}~${range.bookEnd} 범위여야 합니다.`); return; }
    if (books < 1 || bookEnd > range.bookEnd) { setToast(`Book 볼륨은 1~${maxBooks}권이어야 합니다. (B${bookStart}~B${range.bookEnd})`); return; }
    if (pageVolume < 1) { setToast("Page 볼륨은 1 이상이어야 합니다."); return; }
    if (!untilUnlimited && !/^\d{6}$/.test(validUntil)) { setToast("ValidUntilTime은 6자리(YYMMDD)이거나 무제한이어야 합니다."); return; }
    const ticket = {
      companyName: company.name, issuedTime, validUntilTime: validValue,
      ...(selCu ? { usedCustomer: selCu.cu } : {}),   // 공통코드: 사용 고객사
      section: range.section, owner: range.owner, ticketVersion: 1,
      bookStart, bookVolume: books, pageStart, pageVolume,
      patternType: range.pt, ticketType: "Unlimited", separateEachBook: separate,
    };
    // 생성된 키는 폴더로 관리 → zip 하나로 다운로드 (폴더 안에 티켓 파일들).
    // 개별 파일명 = zip 파일명 그대로, B 숫자만 증가. (공통코드는 사용 고객사명 포함)
    const cuTag = selCu ? `_${selCu.cu}` : "";
    const base = `Ticket_${company.name}${cuTag}_S${range.section}O${range.owner}`;
    const rangeTag = books === 1 ? `B${bookStart}` : `B${bookStart}-${bookEnd}`;
    const folder = `${base}_${rangeTag}`;
    const entries = separate
      // Separate each book: StartBook 부터 Book 볼륨 수만큼 개별 파일(각 1권)
      ? Array.from({ length: books }, (_, i) => {
          const bs = bookStart + i;
          return { name: `${folder}/${base}_B${bs}.json`, content: JSON.stringify({ ...ticket, bookStart: bs, bookVolume: 1 }, null, 2) };
        })
      : [{ name: `${folder}/${folder}.json`, content: JSON.stringify(ticket, null, 2) }];
    const url = URL.createObjectURL(makeZip(entries));
    const a = document.createElement("a");
    a.href = url; a.download = `${folder}.zip`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    const summary = `${selCu ? `[사용 고객사: ${selCu.cu}] ` : ""}${range.pt} S${range.section}/O${range.owner}/B${bookStart}~${bookEnd} · Book ${books}권 · P${pageStart}~${pageStart + pageVolume - 1} · ${separate ? "개별티켓 " + books + "장" : "병합 1장"} · 유효 ${untilUnlimited ? "무제한" : validValue}`;
    addTicket({ kind: "N", companyId: company.id, company: company.name, by: me?.name ?? "", summary, params: ticketParams() });
    logActivity("ticket", `N Key · ${company.name} · ${summary}`, me?.name);
    setToast(`Key 생성됨 · 티켓 ${separate ? books + "개(개별 파일)" : "1장(병합)"} · B${bookStart}~${bookEnd} — zip(${folder}.zip)으로 다운로드됩니다.`);
  };

  const fixed: React.CSSProperties = { ...S.input, background: "#f3f4f6", color: "#6b7280" };

  return (
    <div style={{ ...S.card, padding: 18 }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>N Key 발급 <span style={{ color: "#9ca3af", fontWeight: 400, fontSize: 12 }}>· SOBP 코드 사용 허가 (Caster lite 티켓)</span></div>

      {/* 회사이름 + 할당된 SOBP 범위 (나란히) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 12, alignItems: "start" }}>
        <Field label="회사이름 (고객사) *">
          <select style={S.input} value={companyId} onChange={(e) => onCompany(+e.target.value)}>
            <option value={0}>- 선택 -</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <div>
          {isCommon ? (
            <>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
                사용 고객사 * <span style={{ color: "#a855f7", fontWeight: 700 }}>공통코드</span>
                <span style={{ color: "#9ca3af" }}> (선택 시 코드 O21/O27/O1012 자동 지정)</span>
              </div>
              <select style={S.input} value={cuIdx} onChange={(e) => onCu(+e.target.value)}>
                <option value={-1}>- 사용 고객사 선택 ({cuCandidates.length}곳) -</option>
                {cuCandidates.map((c, i) => <option key={`${c.k}${c.owner}:${c.cu}`} value={i}>{c.label}</option>)}
              </select>
              {selCu && <div style={{ fontSize: 11.5, color: "#6b21a8", marginTop: 6 }}>발급 코드: <b>{kindLabel(codeKind(selCu.k, 3))} · S3 / O{selCu.owner}</b> · 사용 고객사 <b>{selCu.cu}</b></div>}
            </>
          ) : (
            <>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>할당된 SOBP 범위 * <span style={{ color: "#9ca3af" }}>(선택 시 Section·Owner·Book·PatternType 자동)</span></div>
              <SobpRangePicker company={!!company} ranges={ranges} value={sobpIdx} onSelect={onRange} />
            </>
          )}
        </div>
      </div>

      {/* Book / Page 범위 — 한 행에 4개 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 12 }}>
        <Field label={`Start Book ${range ? `· ${range.bookStart}~${range.bookEnd}` : "(시작 북코드)"}`}>
          <input type="number" min={range?.bookStart ?? 0} max={range?.bookEnd ?? undefined} style={S.input} value={bookStart}
            onChange={(e) => setBookStart(Math.max(0, +e.target.value))} disabled={!range} />
        </Field>
        <Field label={`Book 볼륨 (권) ${range ? `· 최대 ${maxBooks}` : ""}`}>
          <input type="number" min={1} max={maxBooks} style={S.input} value={books} onChange={(e) => setBooks(Math.max(1, +e.target.value))} disabled={!range} />
        </Field>
        <Field label="Start Page (시작 페이지)">
          <select style={S.input} value={pageStart} onChange={(e) => setPageStart(+e.target.value)} disabled={!range}>
            <option value={0}>0</option><option value={1}>1 (기본)</option><option value={2}>2</option>
          </select>
        </Field>
        <Field label={`Page 볼륨 ${range ? `· 최대 ${(PAGE_CAP[range.pt]?.[range.section] ?? 0).toLocaleString()}` : "(페이지 가용 범위)"}`}>
          <input type="number" min={1} style={S.input} value={pageVolume} onChange={(e) => setPageVolume(Math.max(1, +e.target.value))} disabled={!range} />
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 4 }}>
        <Field label="ValidUntilTime (사용 기한)" full>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="date" style={{ ...S.input, maxWidth: 190, opacity: untilUnlimited ? 0.5 : 1 }} disabled={untilUnlimited}
              value={sixToDate(validUntil)} onChange={(e) => setValidUntil(dateToSix(e.target.value))} title="달력에서 선택" />
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, color: "#374151", whiteSpace: "nowrap", cursor: "pointer" }}>
              <input type="checkbox" checked={untilUnlimited} onChange={(e) => setUntilUnlimited(e.target.checked)} /> 무제한
            </label>
          </div>
        </Field>
      </div>

      {/* 자동/고정 항목 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 4 }}>
        <Field label="IssuedTime (발급일·고정)"><input style={fixed} value={issuedTime} readOnly /></Field>
        <Field label="PatternType"><input style={fixed} value={range ? patternTypeParam(range.pt) : "-"} readOnly /></Field>
        <Field label="TicketVersion"><input style={fixed} value={1} readOnly /></Field>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, paddingTop: 12, borderTop: "1px solid #eef0f4" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#374151", cursor: "pointer" }}>
          <input type="checkbox" checked={separate} onChange={(e) => setSeparate(e.target.checked)} />
          <b>Separate each book</b> <span style={{ color: "#9ca3af" }}>(체크: 북코드별 개별 티켓 / 해제: 1개 티켓에 병합)</span>
        </label>
        <span style={{ flex: 1 }} />
        <Link href="/tickets/nkey" style={{ ...S.ghost, textDecoration: "none" }}>목록</Link>
        <button onClick={genKey} disabled={!range} style={{ ...S.primary, ...(!range ? { opacity: 0.5, cursor: "not-allowed" } : {}) }}>Key 생성</button>
      </div>
      {range && (
        <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
          발급 예정: <b style={{ color: "#111827" }}>S{range.section}/O{range.owner}/B{bookStart}~{bookEnd}</b> · {separate ? `개별 티켓 ${books}장` : "병합 티켓 1장"} · P{pageStart}~{pageStart + pageVolume - 1}
          {bookEnd > range.bookEnd && <span style={{ color: "#dc2626", fontWeight: 700 }}> · ⚠ 할당 범위(B{range.bookEnd}) 초과</span>}
        </div>
      )}
      {toast && <div style={{ marginTop: 10, fontSize: 12.5, color: "#2563eb" }}>{toast}</div>}

      <div style={{ marginTop: 12, background: "#fafbfc", border: "1px dashed #e5e7eb", borderRadius: 8, padding: "10px 12px", fontSize: 11.5, color: "#6b7280", lineHeight: 1.7 }}>
        Key 생성 시 티켓이 <b>zip 파일(폴더 형태)</b>로 다운로드됩니다. 다운로드 폴더에서 zip의 압축을 풀어 그 폴더째 <b>nproj 폴더</b> 또는 <b>내 PC &gt; 문서 &gt; NeoLAB &gt; CodeTickets</b>(<code>{CODE_TICKETS}</code>)에 넣은 뒤 <b>Caster lite</b>에서 사용합니다.
      </div>
    </div>
  );
}

/* ── 목록 공용 조각 (필터 칩 · 페이지네이션 · Key 항목 표) ── */
const chip = (on: boolean): React.CSSProperties => ({
  fontSize: 12.5, padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontWeight: on ? 700 : 400,
  border: `1px solid ${on ? "#93c5fd" : "#e5e7eb"}`, background: on ? "#eef6ff" : "#fff", color: on ? "#1d4ed8" : "#6b7280",
});

// 페이지네이션 — 고객사 관리(CompaniesView)·편집 상세와 동일한 표기
const pgBtn = (on: boolean, disabled: boolean): React.CSSProperties => ({
  minWidth: 28, fontSize: 12, padding: "4px 7px", borderRadius: 6, cursor: disabled ? "default" : "pointer",
  border: `1px solid ${on ? "#93c5fd" : "#e5e7eb"}`, background: on ? "#eef6ff" : "#fff",
  color: disabled ? "#d1d5db" : on ? "#2563eb" : "#4b5563", fontWeight: on ? 700 : 400,
});
function pageWindow(cur: number, total: number): number[] {
  const size = Math.min(7, total);
  let start = Math.max(1, cur - Math.floor(size / 2));
  if (start + size - 1 > total) start = total - size + 1;
  return Array.from({ length: size }, (_, i) => start + i);
}
type KV = { k: string; v: string };
const toKV = (o: unknown, prefix = ""): KV[] => {
  if (o == null) return [];
  if (Array.isArray(o)) return o.flatMap((x, i) => toKV(x, `${prefix}[${i + 1}]`));
  if (typeof o === "object") return Object.entries(o as Record<string, unknown>)
    .flatMap(([k, v]) => (v !== null && typeof v === "object"
      ? toKV(v, prefix ? `${prefix}.${k}` : k)
      : [{ k: prefix ? `${prefix}.${k}` : k, v: String(v) }]));
  return [{ k: prefix || "value", v: String(o) }];
};

// Key 항목 뷰어 — 레코드의 발급 파라미터 / 외부에서 불러온 키 파일을 같은 표로 보여준다.
// 파일 선택은 이 모달이 아니라 부르는 쪽(목록 툴바)에서 한다.
function KeyInfoModal({ title, subtitle, source, all, err, onClose }: {
  title: string; subtitle?: string; source: string; all: KV[]; err?: string; onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const rows = all.filter((r) => (q ? (r.k + r.v).toLowerCase().includes(q.toLowerCase()) : true));

  return (
    <Modal onClose={onClose} title={title} width={720}>
      {subtitle && (
        <div style={{ background: "#f5f9ff", border: "1px solid #bfdbfe", borderRadius: 9, padding: "9px 12px", fontSize: 12.5, color: "#1e3a8a", marginBottom: 12 }}>
          {subtitle}
        </div>
      )}

      {err && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: 8, padding: "9px 11px", fontSize: 12.5, marginBottom: 10 }}>⚠ {err}</div>}

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          Key Info <span style={{ color: "#9ca3af" }}>· {rows.length}개 항목 ({source})</span>
        </div>
        <span style={{ flex: 1 }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="항목 검색" style={{ ...S.input, width: 150 }} />
      </div>
      <div style={{ border: "1px solid #eef0f4", borderRadius: 9, overflow: "hidden", maxHeight: 420, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: "#fafbfc" }}>
              <th style={{ ...S.th, textAlign: "left", width: 240 }}>Key</th>
              <th style={{ ...S.th, textAlign: "left" }}>Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderTop: "1px solid #f3f4f6" }}>
                <td style={{ padding: "7px 12px", color: "#374151", fontWeight: 600, fontFamily: "ui-monospace,monospace", wordBreak: "break-all" }}>{r.k}</td>
                <td style={{ padding: "7px 12px", color: "#111827", wordBreak: "break-all" }}>{r.v || <span style={{ color: "#d1d5db" }}>-</span>}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={2} style={{ padding: 24, textAlign: "center", color: "#9ca3af" }}>
                {all.length === 0 ? "표시할 항목이 없습니다." : `"${q}" 에 맞는 항목이 없습니다.`}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
        <button onClick={() => { try { navigator.clipboard?.writeText(rows.map((r) => `${r.k}\t${r.v}`).join("\n")); } catch { /* */ } }}
          style={S.ghost}>표 복사</button>
        <button onClick={onClose} style={S.primary}>닫기</button>
      </div>
    </Modal>
  );
}

function StepHead({ n, t, d }: { n: number; t: string; d?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <span style={{ background: "#5f8ff0", color: "#fff", fontWeight: 700, fontSize: 11, borderRadius: "50%", width: 20, height: 20, display: "grid", placeItems: "center" }}>{n}</span>
      <b style={{ fontSize: 13, color: "#111827" }}>{t}</b>
      {d && <span style={{ fontSize: 11.5, color: "#9ca3af" }}>· {d}</span>}
    </div>
  );
}

// 할당된 SOBP 범위 선택 — 셀렉트(접힘) → 클릭 시 칩 리스트 펼침
export type SobpRange = { pt: string; section: number; owner: number; bookStart: number; bookEnd: number; pageStart: number; pageEnd: number; bookCount: number };
function Chips({ r }: { r: SobpRange }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <SB k="S" c="#5f8ff0" v={r.section} />
      <SB k="O" c="#14b8a6" v={r.owner} />
      <SB k="B" c="#8b5cf6" v={`${r.bookStart}~${r.bookEnd}`} />
      <SB k="P" c="#f59e0b" v={`${r.pageStart}~${r.pageEnd}`} />
    </span>
  );
}
export function SobpRangePicker({ company, ranges, value, onSelect }: { company: boolean; ranges: SobpRange[]; value: number; onSelect: (i: number) => void }) {
  const [open, setOpen] = useState(false);
  const note = (t: string) => <div style={{ fontSize: 12, color: "#9ca3af", padding: "9px 12px", border: "1px solid #eef0f4", borderRadius: 10, background: "#fafbfc" }}>{t}</div>;
  if (!company) return note("고객사를 먼저 선택하세요.");
  if (ranges.length === 0) return note("이 고객사에 할당된 SOBP 범위가 없습니다.");
  const sel = ranges[value];
  return (
    <div style={{ position: "relative" }}>
      {/* 트리거(접힘) */}
      <button onClick={() => setOpen((o) => !o)}
        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff", cursor: "pointer", minHeight: 40 }}>
        {sel ? <Chips r={sel} /> : <span style={{ color: "#9ca3af", fontSize: 12.5 }}>- 범위 선택 -</span>}
        <span style={{ marginLeft: "auto", color: "#9ca3af", fontSize: 12 }}>{open ? "▲" : "▼"}</span>
      </button>
      {/* 펼침 목록 */}
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 19 }} />
          <div style={{ position: "absolute", zIndex: 20, top: "calc(100% + 4px)", left: 0, right: 0, border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff", boxShadow: "0 12px 32px rgba(15,23,42,.14)", maxHeight: 260, overflowY: "auto" }}>
            {ranges.map((r, i) => {
              const on = i === value;
              return (
                <button key={i} onClick={() => { onSelect(i); setOpen(false); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "9px 12px", border: 0, borderTop: i ? "1px solid #f1f3f6" : "none", background: on ? "#eef6ff" : "#fff", cursor: "pointer" }}>
                  <span style={{ fontSize: 11, color: on ? "#2563eb" : "#9ca3af", width: 16, textAlign: "center", fontWeight: 700 }}>{i + 1}</span>
                  <Chips r={r} />
                  {on && <span style={{ marginLeft: "auto", fontSize: 11, color: "#2563eb", fontWeight: 700 }}>✓</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
function SB({ k, c, v }: { k: string; c: string; v: string | number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, border: "1px solid #eef0f4", borderRadius: 8, padding: "2px 7px 2px 2px", background: "#fff", fontSize: 12 }}>
      <span style={{ background: c, color: "#fff", fontWeight: 700, fontSize: 10.5, borderRadius: 6, padding: "2px 6px", minWidth: 12, textAlign: "center" }}>{k}</span>
      <span style={{ fontFamily: "ui-monospace,monospace", color: "#111827" }}>{v}</span>
    </span>
  );
}

