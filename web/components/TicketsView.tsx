"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { S, Field, Modal, BLUE } from "./ui";
import { useAuth, currentUser } from "@/lib/authStore";
import { logActivity } from "@/lib/activityStore";
import { makeZip } from "@/lib/zip";
import { codeKind, kindLabel, patternOf, patternTypeParam, CODE_KINDS, PAGE_CAP, BOOK_CAP, type CodeKind } from "@/lib/codeKind";
import { codesOfCompany } from "@/lib/commonCodes";
import { membersOf, hydrateMembers, useCommonMembers } from "@/lib/commonMembers";
import { companyOfNTicket, nKeyRangesOfCompany } from "@/lib/keyCompany";
import { sobpOverlapMsg, spanOfParams, spansOverlap } from "@/lib/rangeGuard";
import { SobpUsage } from "./SobpUsage";
import {
  WS_CARD, WS_HD, WS_GRID, WS_EMPTY, WS_HEAD_BTN, wsItem,
  WsTitle, WsStats, WsCoHead, WsCoToggle, WsCoItem, WsFillScroll, WsCoGroup, useSubsOf, nestCompanies, type CoView, type WsFold,
} from "./KeyWorkspaceUI";   // App Key 관리와 같은 조각 `PC-154`
import { useCaster } from "@/lib/accountStore";
import { useStore } from "@/lib/store";
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

// N Key 관리 — [목록 → 등록] 한 쌍. 계정 발급(AccountsView)과 같은 구조다.
//   · tab="list" → /tickets/nkey      발급·정산 목록 (옛 "Key 발급 정산" 메뉴)
//   · tab="nkey" → /tickets/nkey/new  N Key 생성 (Caster lite 티켓)
// 목록은 **N Key 만** 다룬다 `PC-061`. App Key 는 계정 단위라 **계정 발급(계정 상세)** 에서 본다.
export default function TicketsView({ tab }: { tab: Tab }) {
  const me = currentUser(useAuth());
  useTickets();
  useEffect(() => { hydrateTickets(); }, []);

  const [newCompanyId, setNewCompanyId] = useState(0);    // 발급 화면 — 늘 미선택에서 시작 `PC-070`
  const [companyId, setCompanyIdState] = useState(0);     // 회사 선택 → 발급 목록 필터 기준
  useEffect(() => { setCompanyIdState(readCompanyId()); }, []);   // 화면 이동 후에도 고객사 유지
  const setCompanyId = (n: number) => {
    setCompanyIdState(n);
    try { sessionStorage.setItem(CO_KEY, String(n)); } catch { /* */ }
  };

  return (
    <div style={{ padding: tab === "list" ? "16px 20px" : "18px 20px" }}>
      {/* 발급 화면은 **고객사를 고르지 않은 상태**로 시작한다 `PC-070` — 목록 필터 값을 물려받지 않는다 */}
      {tab === "nkey" && <div style={{ maxWidth: 900 }}><NKeyForm me={me} companyId={newCompanyId} setCompanyId={setNewCompanyId} /></div>}
      {tab === "list" && <NKeyWorkspace />}
    </div>
  );
}

/* ── 발급 목록 + 정산(과금) 등록 ── */
const won = (n: number) => `₩${Math.round(n).toLocaleString()}`;

// N Key 관리 — 「고객사 | 발급 티켓 | 발급 상세·정산」 3단 `PC-149` `PC-153`
// - 고객사 = **고객사 관리에 등록된 고객사**를 불러온다(여기서 고객사를 등록하지 않는다) `PC-153`
// - 자료: nkey(HLP).xlsx(ticket-ledger.json) N Key 발급 대장 + 이 화면에서 새로 발급한 N Key
//   대장 티켓은 이름 + **Owner 번호**로 고객사 관리 고객사에 잇고, 안 맞으면 「고객사 미연결」로 둔다(lib/keyCompany)
// - 위: 정산 집계(발급 티켓 · 유료 합계 · 유료 건수 · 무료/체험 · 정산 미등록) — **고른 고객사 · 필터 기준**, 체험 만료 경고
// - 왼쪽: 고객사(기본 = N Key 발급 고객사 · [전체 고객사]) — 맨 위 「전체」 · 고객사별 발급 건수 · 정산 미등록 건수
// - 가운데: 발급 티켓 카드 + [＋ N Key 발급] / 오른쪽: 발급 상세(발급 기본정보 · 정산 정보) / N Key 발급 폼
type NRight = { kind: "t"; id: number; tab?: "base" | "bill" } | { kind: "new" } | { kind: "none" };
const ALL_CO = "";        // 전체
const UNLINKED_CO = "u";  // 고객사 관리에 이어지지 않은 대장 티켓
function NKeyWorkspace() {
  const sp = useSearchParams();
  const me = currentUser(useAuth());
  useTickets();
  const { companies } = useStore();
  const [ready, setReady] = useState(false);
  useEffect(() => { hydrateTickets(); setReady(true); }, []);
  const tickets = ready ? allTickets().filter((t) => t.kind === "N") : [];

  // 티켓 → 고객사 관리 고객사 키(id 문자열 · 미연결 = "u")
  const keyOf = useMemo(() => {
    const m = new Map<number, string>();
    for (const t of tickets) { const c = companyOfNTicket(t, companies); m.set(t.id, c ? String(c.id) : UNLINKED_CO); }
    return m;
  }, [tickets, companies]);
  const coKey = (t: Ticket) => keyOf.get(t.id) ?? UNLINKED_CO;
  // 공통코드 티켓의 사용 고객사(하위) — 고객사 관리에 등록돼 있으면 그 하위 고객사 티켓으로도 본다 `PC-199`
  const subKeyOf = useMemo(() => {
    const byName = new Map(companies.map((c) => [c.name.replace(/\s+/g, "").toLowerCase(), String(c.id)]));
    const m = new Map<number, string>();
    for (const t of tickets) {
      const uc = String(t.params?.["Used Customer"] ?? "").replace(/\s+/g, "").toLowerCase();
      const k = uc && uc !== "-" ? byName.get(uc) : undefined;
      if (k) m.set(t.id, k);
    }
    return m;
  }, [tickets, companies]);
  const ownKey = (t: Ticket) => subKeyOf.get(t.id) ?? coKey(t);   // 하위 고객사가 있으면 하위, 없으면 고객사
  const isOf = (t: Ticket, k: string) => coKey(t) === k || subKeyOf.get(t.id) === k;
  const labelOf = (k: string) => (k === ALL_CO ? "전체 고객사" : k === UNLINKED_CO ? "고객사 미연결" : companies.find((c) => String(c.id) === k)?.name ?? "고객사 미연결");
  const [view, setView] = useState<CoView>("issued");
  const issuedKeys = new Set([...keyOf.values(), ...subKeyOf.values()].filter((k) => k !== UNLINKED_CO));
  const subsOf = useSubsOf(companies);   // 상위 → 하위 고객사 — App Key 관리와 같은 묶음 `PC-197`
  // 왼쪽 목록 — 발급 고객사(N Key 가 이어진 고객사 + 하위 고객사가 발급받은 상위 고객사) / 전체 고객사(고객사 관리 전체)
  const names = (view === "issued"
    ? companies.filter((c) => issuedKeys.has(String(c.id)) || (subsOf.get(c.id) ?? []).some((id) => issuedKeys.has(String(id))))
    : companies)
    .slice().sort((a, b) => a.name.localeCompare(b.name, "ko")).map((c) => String(c.id));

  const [co, setCo] = useState<string>(ALL_CO);
  const [right, setRight] = useState<NRight>({ kind: "none" });
  const [cq, setCq] = useState("");
  const [fBill, setFBill] = useState<"" | Billing>("");
  const [fSrc, setFSrc] = useState<"" | "ledger" | "new">("");
  const [q, setQ] = useState("");
  const [inited, setInited] = useState(false);
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

  const ofCo = (k: string) => tickets.filter((t) => (k === ALL_CO ? true : isOf(t, k)));
  const sortAt = (a: Ticket, b: Ticket) => (a.at < b.at ? 1 : a.at > b.at ? -1 : b.no - a.no);   // 최근순

  // 첫 선택 — ?t= 발급 / ?co= 고객사 / ?new=1 발급 폼 · 없으면 전체 + 최근 발급
  useEffect(() => {
    if (!ready || inited) return;
    const tq = Number(sp.get("t") || 0), coQ = sp.get("co") ?? "", isNew = sp.get("new") === "1";
    const t = tq ? tickets.find((x) => x.id === tq) : undefined;
    if (t) { setCo(coKey(t)); setRight({ kind: "t", id: t.id, tab: sp.get("tab") === "bill" ? "bill" : "base" }); }
    else {
      const c = companies.some((x) => String(x.id) === coQ) ? coQ : ALL_CO;
      if (c && !issuedKeys.has(c)) setView("all");
      setCo(c);
      if (isNew) setRight({ kind: "new" });
      else { const first = [...ofCo(c)].sort(sortAt)[0]; setRight(first ? { kind: "t", id: first.id } : { kind: "none" }); }
    }
    setInited(true);
  }, [ready, inited, tickets.length]);   // eslint-disable-line react-hooks/exhaustive-deps

  // 필터는 **전체 발급분에 먼저** 건다 → 왼쪽 고객사 건수 · 가운데 목록이 그 결과를 고객사별로 보여 준다 `PC-150`
  const hits = (t: Ticket) =>
    (fBill ? t.billing === fBill : true)
    && (fSrc === "ledger" ? t.src === "ledger" : fSrc === "new" ? t.src !== "ledger" : true)
    && (q ? (labelOf(coKey(t)) + " " + t.company + " " + t.summary + " " + t.by + " " + t.no).toLowerCase().includes(q.toLowerCase()) : true);
  const hitAll = tickets.filter(hits);
  const hitOf = (k: string) => hitAll.filter((t) => (k === ALL_CO ? true : isOf(t, k)));
  // 고객사 검색 중 「전체」면 가운데에 검색한 고객사(하위 고객사 포함)의 발급 티켓을 보인다 `PC-199`
  const cqHit = (k: string) => k !== UNLINKED_CO && labelOf(k).toLowerCase().includes(cq.toLowerCase());
  const list = (co === ALL_CO && cq ? hitAll.filter((t) => cqHit(coKey(t)) || cqHit(ownKey(t))) : hitOf(co)).sort(sortAt);
  // 필터를 바꿨는데 오른쪽 티켓이 결과에 없으면 결과의 첫 티켓으로 바꾼다
  useEffect(() => {
    if (!inited || right.kind !== "t" || list.some((t) => t.id === right.id)) return;
    setRight(list[0] ? { kind: "t", id: list[0].id } : { kind: "none" });
  }, [fBill, fSrc, q, cq]);   // eslint-disable-line react-hooks/exhaustive-deps
  // 고객사를 검색하면 가운데를 검색 결과(전체 기준)로 바꾼다 `PC-199`
  useEffect(() => { if (inited && cq) setCo(ALL_CO); }, [cq]);   // eslint-disable-line react-hooks/exhaustive-deps
  // 정산 집계 — 고른 고객사 · 필터 결과 기준 (옛 목록 요약과 같은 규칙)
  const agg = list.reduce((a, t) => ({
    paid: a.paid + (t.billing === "유료" ? 1 : 0), amount: a.amount + (t.billing === "유료" ? t.amount : 0),
    free: a.free + (t.billing === "무료" ? 1 : 0), trial: a.trial + (t.billing === "체험" ? 1 : 0),
    todo: a.todo + (t.billing === "미정" ? 1 : 0),
    expired: a.expired + (t.billing === "체험" && (daysLeft(t.trialUntil) ?? 0) < 0 ? 1 : 0),
  }), { paid: 0, amount: 0, free: 0, trial: 0, todo: 0, expired: 0 });

  const pickCo = (name: string) => {
    setCo(name);
    const first = [...hitOf(name)].sort(sortAt)[0];
    setRight(first ? { kind: "t", id: first.id } : { kind: "none" });
  };
  const filtered0 = !!(fBill || fSrc || q);
  // 필터가 걸리면 맞는 발급이 있는 고객사만 남긴다
  const coList = names.filter((k) => (cq ? labelOf(k).toLowerCase().includes(cq.toLowerCase()) : true))
    .filter((k) => (filtered0 ? hitOf(k).length > 0 : true));
  const unlinkedN = hitOf(UNLINKED_CO).length;
  // 「전체」일 때 가운데 목록은 고객사별 묶음 — 고객사는 가장 최근 발급 순
  const groups = co === ALL_CO
    ? [...new Set(list.map((t) => ownKey(t)))].map((k) => ({ key: k, ts: list.filter((t) => ownKey(t) === k) }))   // 하위 고객사 티켓은 하위 고객사로 묶는다 `PC-199`
    : [{ key: co, ts: list }];
  const coCompany = companies.find((c) => String(c.id) === co);
  const filtered = !!(fBill || fSrc || q);

  const card = WS_CARD, hd = WS_HD;
  // 고객사 한 줄 — App Key 관리와 같은 모양(미정 표시 없음) `PC-198`
  const coBtn = (name: string, label: string, n: number, warn = false, sub = false, fold?: WsFold) =>
    <WsCoItem key={name || "__all"} label={label} n={n} on={co === name} warn={warn} sub={sub} fold={fold} bold={name === ALL_CO} title="N Key 발급 건수" onClick={() => pickCo(name)} />;
  // 하위 고객사는 상위 고객사 밑에 들여 보인다 — App Key 관리와 같다 `PC-197`
  const keepCo = (k: string) => (cq ? labelOf(k).toLowerCase().includes(cq.toLowerCase()) : true) && (filtered0 ? hitOf(k).length > 0 : true);
  const coRows = nestCompanies(coList.map((k) => companies.find((c) => String(c.id) === k)!).filter(Boolean), companies, subsOf, (c) => keepCo(String(c.id)));

  if (!ready) return null;   // 발급 원장을 읽기 전에는 0건 집계가 잠깐 보이지 않게
  return (
    <div style={{ maxWidth: 1680 }}>
      {/* 정산 집계 — 금액 · 건수는 고른 고객사와 필터를 따른다 */}
      <WsTitle title="N Key 관리" scope={<>집계 대상 <b style={{ color: "#111827" }}>{co === ALL_CO && cq ? `고객사 검색 「${cq}」` : labelOf(co)}</b>{filtered ? " · 필터 적용" : ""}</>}
        note="고객사는 고객사 관리에서 불러옵니다 · 자료: nkey(HLP) N Key 발급 대장 + 새로 발급" />
      <WsStats items={[
        ["발급 티켓", `${list.length.toLocaleString()}건`, "#111827"],
        ["유료 합계", won(agg.amount), "#1d4ed8"],
        ["유료 건수", `${agg.paid}건`, "#2563eb"],
        ["무료 / 체험", `${agg.free} / ${agg.trial}건`, "#166534"],
        ["정산 미등록", `${agg.todo}건`, agg.todo ? "#dc2626" : "#9ca3af"],
      ]} />
      {agg.expired > 0 && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: 9, padding: "9px 12px", fontSize: 12.5, marginBottom: 12 }}>
          ⚠ 체험 기간이 만료된 티켓 <b>{agg.expired}건</b> — 유료 전환 또는 회수 여부를 확인하세요.
        </div>
      )}

      {/* 필터 — 전체 발급분에 건다. 왼쪽 고객사 · 가운데 목록이 이 결과를 고객사별로 나눠 보여 준다 `PC-150` */}
      <div style={{ ...card, padding: "10px 12px", marginBottom: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 12.5 }}>
        <b style={{ fontSize: 12.5, color: "#374151" }}>필터</b>
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
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="고객사 · 발급 내용 · 발급인 · 번호 검색" style={{ ...S.input, width: 260 }} />
        {filtered && <button onClick={() => { setFBill(""); setFSrc(""); setQ(""); }} style={S.linkBtn}>필터 해제</button>}
        <span style={{ flex: 1 }} />
        {filtered && <span style={{ color: "#6b7280" }}>전체 <b style={{ color: "#111827" }}>{hitAll.length}건</b> · 고객사 <b style={{ color: "#111827" }}>{coList.length}곳</b></span>}
        <label style={{ ...S.smallBtn, whiteSpace: "nowrap" }} title="발급된 키 파일(.json)을 열어 내용을 확인합니다. 목록에 없는 외부 키도 됩니다.">
          📂 N Key 불러오기
          <input type="file" accept=".json,application/json" style={{ display: "none" }}
            onChange={(e) => { loadKeyFile(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      </div>

      <div style={WS_GRID}>
        {/* ① N Key 고객사 */}
        <div style={card}>
          <WsCoHead count={filtered ? `${coList.length}/${names.length}` : names.length} />
          <div style={{ padding: 10 }}>
            <WsCoToggle view={view} onView={setView} issued={issuedKeys.size} total={companies.length} />
            <input style={{ ...S.input, marginBottom: 8 }} value={cq} onChange={(e) => setCq(e.target.value)} placeholder="고객사 검색" />
            {/* 고객사 목록 — 화면 아래 끝(100vh)까지 `PC-156` */}
            <WsFillScroll>
              {!cq && coBtn(ALL_CO, "전체", hitAll.length)}
              {/* 상위 고객사 ▸ 접기 · 펼치기 — 하위는 세로 안내선 안에 `PC-198` */}
              {coRows.map(({ c, subs }) => (
                <WsCoGroup key={c.id} n={subs.length} autoOpen={!!cq}
                  head={(fold) => coBtn(String(c.id), c.name, hitOf(String(c.id)).length, false, false, fold)}>
                  {subs.map((x) => coBtn(String(x.id), x.name, hitOf(String(x.id)).length, false, true))}
                </WsCoGroup>
              ))}
              {coList.length === 0 && <div style={{ fontSize: 12, color: "#9ca3af", padding: "14px 6px", textAlign: "center", lineHeight: 1.7 }}>{filtered ? "필터에 맞는 고객사가 없습니다." : view === "issued" && cq ? <>발급 고객사에 없습니다.<br />[전체 고객사]에서 찾아 발급하세요.</> : "검색 결과가 없습니다."}</div>}
              {unlinkedN > 0 && !cq && (
                <div style={{ borderTop: "1px solid #eef0f4", marginTop: 6, paddingTop: 6 }}>
                  {coBtn(UNLINKED_CO, "고객사 미연결", unlinkedN, true)}
                </div>
              )}
            </WsFillScroll>
          </div>
        </div>

        {/* ② 발급 티켓 */}
        <div style={card}>
          <div style={hd}>
            <b style={{ fontSize: 14 }}>발급 티켓</b>
            <span style={{ fontSize: 11.5, color: "#9ca3af" }}>{list.length}건</span>
            <span style={{ flex: 1 }} />
            <button type="button" onClick={() => setRight({ kind: "new" })} style={WS_HEAD_BTN}>＋ N Key 발급</button>
          </div>
          {/* 발급 티켓 목록 — 화면 아래 끝(100vh)까지 `PC-157` */}
          <WsFillScroll style={{ padding: 12 }}>
            {co === UNLINKED_CO && (
              <div style={{ fontSize: 11.5, color: "#b45309", marginBottom: 8, lineHeight: 1.6 }}>
                대장의 고객사명 · Owner 와 맞는 고객사가 고객사 관리에 없는 티켓입니다. 고객사 관리에 「이름-오너」로 등록하면 그 고객사로 이어집니다.
              </div>
            )}
            {list.length === 0 && (
              <div style={WS_EMPTY}>
                {ofCo(co).length === 0 ? <>발급된 N Key 가 없습니다.<br />[＋ N Key 발급]으로 발급하세요.</> : "필터에 맞는 N Key 가 없습니다."}
              </div>
            )}
            {groups.map((g) => (
              <div key={g.key || "__all"}>
              {co === ALL_CO && (
                <button type="button" onClick={() => pickCo(g.key)} title="이 고객사만 보기"
                  style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", border: 0, background: "none", padding: "6px 2px", margin: "4px 0 6px", borderBottom: "1px solid #eef0f4", cursor: "pointer", fontSize: 12.5 }}>
                  <b style={{ color: g.key === UNLINKED_CO ? "#b45309" : "#111827" }}>{labelOf(g.key)}</b>
                  <span style={{ color: "#9ca3af" }}>{g.ts.length}건</span>
                  <span style={{ flex: 1 }} />
                  {g.ts.some((t) => t.billing === "유료") && <b style={{ color: "#1d4ed8", fontSize: 11.5 }}>{won(g.ts.reduce((x, t) => x + (t.billing === "유료" ? t.amount : 0), 0))}</b>}
                  <span style={{ color: "#2563eb", fontSize: 11.5 }}>›</span>
                </button>
              )}
            {g.ts.map((t) => {
              const on = right.kind === "t" && right.id === t.id;
              const c = BILL_COLOR[t.billing];
              const left = t.billing === "체험" ? daysLeft(t.trialUntil) : null;
              const p = t.params ?? {};
              const bs = p["Book Start"];
              const sob = p.Section !== undefined ? `S${p.Section}/O${p.Owner}${bs !== undefined && bs !== "" ? `/B${bs}` : ""}` : t.summary.slice(0, 28);
              return (
                <div key={t.id} onClick={() => setRight({ kind: "t", id: t.id })} style={wsItem(on)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 11.5, color: "#2563eb", fontWeight: 700 }}>No.{t.no}</span>
                    <b style={{ fontSize: 12.5, fontFamily: "ui-monospace,monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sob}</b>
                    <span style={{ flex: 1 }} />
                    <span style={{ ...S.tag, background: c.bg, color: c.fg, fontWeight: 700 }}>{t.billing}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, fontSize: 11.5, color: "#6b7280" }}>
                    {t.src === "ledger" && <span style={{ ...S.tag, background: "#f3f4f6", color: "#9ca3af" }} title="nkey(HLP) 발급 대장에서 가져온 과거 이력">대장</span>}
                    {p["Book Volume"] ? <span>{p["Book Volume"]}권</span> : null}
                    <span>{t.by || "-"}</span>
                    {coKey(t) === UNLINKED_CO && <span style={{ color: "#b45309" }}>대장명 {t.company}</span>}
                    {t.billing === "유료" && <b style={{ color: "#1d4ed8" }}>{won(t.amount)}</b>}
                    {t.billing === "체험" && t.trialUntil && <span style={{ color: (left ?? 0) < 0 ? "#dc2626" : "#92400e" }}>~{t.trialUntil.slice(5)} {(left ?? 0) < 0 ? "(만료)" : `D-${left}`}</span>}
                    <span style={{ marginLeft: "auto", fontFamily: "ui-monospace,monospace" }}>{t.at.slice(0, 10)}</span>
                  </div>
                </div>
              );
            })}
              </div>
            ))}
          </WsFillScroll>
        </div>

        {/* ③ 발급 상세 · 정산 / N Key 발급 / 고객사 등록 */}
        <div style={{ minWidth: 0 }}>
          {right.kind === "t" && (
            <TicketDetailView key={`${right.id}-${right.tab ?? ""}`} ticketId={right.id} embedded initTab={right.tab}
              onDeleted={() => { const rest = list.filter((x) => x.id !== right.id); setRight(rest[0] ? { kind: "t", id: rest[0].id } : { kind: "none" }); }} />
          )}
          {right.kind === "new" && (
            <NKeyEmbeddedForm key={`new-${co}`} me={me} initCompanyId={coCompany?.id ?? 0}
              onIssued={(t) => { setCo(String(t.coRef ?? ALL_CO)); setFBill(""); setFSrc(""); setQ(""); setRight({ kind: "t", id: t.id, tab: "bill" }); }}
              onCancel={() => { const first = list[0]; setRight(first ? { kind: "t", id: first.id } : { kind: "none" }); }} />
          )}
          {right.kind === "none" && (
            <div style={{ ...card, padding: "48px 0", textAlign: "center", color: "#9ca3af", fontSize: 12.5, lineHeight: 1.8 }}>
              발급 티켓을 선택하거나 <b>[＋ N Key 발급]</b>을 누르세요.
            </div>
          )}
        </div>
      </div>

      {loadedKey && (
        <KeyInfoModal title="N Key 불러오기" subtitle={loadedKey.name}
          source="불러온 파일" all={loadedKey.rows} err={loadedKey.err} onClose={() => setLoadedKey(null)} />
      )}
    </div>
  );
}

// 3단 화면 오른쪽 칸의 N Key 발급 폼 — 왼쪽에서 고른 고객사로 시작한다(바꿀 수 있음)
function NKeyEmbeddedForm({ me, initCompanyId, onIssued, onCancel }: {
  me: ReturnType<typeof currentUser>; initCompanyId: number; onIssued: (t: Ticket) => void; onCancel: () => void;
}) {
  const [companyId, setCompanyId] = useState(initCompanyId);
  return <NKeyForm me={me} companyId={companyId} setCompanyId={setCompanyId} embedded onIssued={onIssued} onCancel={onCancel} />;
}

/* ── 발급 상세 · 수정 — 목록에서 발급번호·발급내용을 누르면 열린다 ── */
// embedded — N Key 관리 3단 화면의 오른쪽 칸 `PC-149`. initTab 으로 정산 정보 탭을 바로 연다(발급 직후)
export function TicketDetailView({ ticketId, embedded = false, initTab, onDeleted }: {
  ticketId: number; embedded?: boolean; initTab?: "base" | "bill"; onDeleted?: () => void;
}) {
  const router = useRouter();
  const me = currentUser(useAuth());
  const { projects, companies } = useStore();
  useTickets();

  const [ready, setReady] = useState(false);
  useEffect(() => { hydrateTickets(); setReady(true); }, []);

  const t = ready ? ticketById(ticketId) : undefined;

  // 목록의 [정산] 은 ?tab=bill 로 들어와 정산 정보 탭을 바로 연다.
  const sp = useSearchParams();
  const [tab, setTab] = useState<"base" | "bill">(initTab ?? (sp.get("tab") === "bill" ? "bill" : "base"));
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
          발급 기록을 찾을 수 없습니다. <Link href="/tickets/nkey" style={{ color: "#2563eb" }}>N Key 관리 목록으로</Link>
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
    // 코드 구간(Section · Owner · Book · Page)을 바꿨으면 **사용 가능한 구간**인지 본다 `PC-192`
    //   ① 이 고객사의 발급 범위(대장 이력 · SOBP 할당) 안 ② 다른 발급분과 겹치지 않음(자기 자신 제외)
    const before = spanOfParams(t.params), after = spanOfParams(params);
    const moved = JSON.stringify(before) !== JSON.stringify(after);
    if (moved) {
      const co = companyOfNTicket(t, companies);
      const inside = nKeyRangesOfCompany(co, projects, allTickets(), companies).some((x) =>
        x.section === after.section && x.owner === after.owner && after.bookStart >= x.bookStart && after.bookEnd <= x.bookEnd);
      if (!inside && !spansOverlap(before, after)) { setTab("base"); setToast({ ok: false, text: "이 고객사의 발급 범위(SOBP 할당) 밖의 코드 구간입니다. 할당된 Section · Owner · Book 안에서 고치세요." }); return; }
      const clash = sobpOverlapMsg(after, `N${t.id}`);
      if (clash) { setTab("base"); setToast({ ok: false, text: clash }); return; }
    }
    updateTicket(t.id, { summary: summary.trim(), params });
    setBilling(t.id, { billing, amount, billNote: billNote.trim(), trialUntil: trial, by: me?.name ?? "" });
    logActivity("ticket", `발급 수정 · ${t.company} · 발급 ${t.no}번 · ${kindLabel2} · ${billing}`, me?.name);
    setToast({ ok: true, text: "발급 기본정보와 정산 정보가 저장되었습니다." });
  };

  const TABS = [["base", "발급 기본정보"], ["bill", "정산 정보"]] as const;

  return (
    <div style={embedded ? undefined : { padding: "18px 20px", maxWidth: 900 }}>
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
          {/* 발급된 티켓은 지우지 않는다 — 정보만 고친다(코드 구간은 사용 가능한 구간일 때만) `PC-192` */}
          <span style={{ flex: 1 }} />
          {!embedded && <Link href="/tickets/nkey" style={{ ...S.ghost, textDecoration: "none" }}>목록</Link>}
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
// 범위의 pt(PDS3·PDS2·Scode·OID) → 코드 종류 `PC-064`
const CT_OF: Record<string, CodeKind> = { PDS3: "PDS3", PDS2: "PDS2", Scode: "PDS4", OID: "OID" };
const yyyymmdd = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, ""); // KST

// Caster lite 티켓을 붙여넣는 대상 폴더 (안내용)
const CODE_TICKETS = "C:\\Users\\Documents\\NeoLab\\CodeTickets";

// 고객사 = **티켓 고객사**(nkey(HLP) 대장 프로젝트명 + 티켓 화면 등록분) — 고객사 관리와 별개 `PC-123`
function NKeyForm({ me, companyId, setCompanyId, embedded = false, onIssued, onCancel }: {
  me: ReturnType<typeof currentUser>; companyId: number; setCompanyId: (n: number) => void;
  embedded?: boolean; onIssued?: (t: Ticket) => void; onCancel?: () => void;   // 3단 화면 오른쪽 칸 `PC-149`
}) {
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
  const [ctype, setCtype] = useState<CodeKind>("PDS3");   // Code Type — 직접 고른다 `PC-064`
  useEffect(() => { hydrateTickets(); }, []);
  // 그 고객사의 계정 중 **아직 N Key 가 없는 계정**만 발급 대상이다 `PC-059`

  const { projects, companies } = useStore();
  const subsOf = useSubsOf(companies);   // 고객사 선택 — 상 · 하위 구별 `PC-197`
  // 고객사 = **고객사 관리 고객사** `PC-153`
  const company = companyId ? companies.find((c) => c.id === companyId) : undefined;
  const issuedTime = yyyymmdd();

  useEffect(() => { hydrateMembers(); }, []);
  useCommonMembers();   // 사용자 등록분 변경 시 리렌더

  // 공통(커먼) 코드 회사인가 → 이 회사가 보유한 공통코드들 (중앙 레지스트리). 이력전용(A/IDS)은 티켓 발급 제외.
  const commonCodes = useMemo(() => (company ? codesOfCompany(company.name).filter((c) => !c.historyOnly) : []), [company]);
  const isCommon = commonCodes.length > 0;

  // 고객사 선택 시 발급 범위 — **대장 이력의 S/O/B** (Section/Owner/BookStart/PatternType/PageVolume 자동) `PC-123`
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
    // N Key 발급 범위 = nkey 대장 이력(이 고객사로 이어진 티켓) + 고객사의 SOBP 할당 + (K) 할당 `PC-153`
    return nKeyRangesOfCompany(company, projects, allTickets().filter((t) => t.kind === "N"), companies);
  }, [company, isCommon, commonCodes, projects, companies]);
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
    setCtype(CT_OF[r.pt] ?? "PDS3");        // 범위의 종류를 기본값으로 `PC-064`
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
    "Company Name": company?.name ?? "-",
    "Issued Time": issuedTime,
    "Valid Until Time": untilUnlimited ? "99999999 (무제한)" : validValue,
    Section: range?.section ?? "-",
    Owner: range?.owner ?? "-",
    "Ticket Version": 1,
    "Book Start": bookStart,
    "Book Volume": books,
    "Page Start": pageStart,
    "Page Volume": pageVolume,
    "Code Type": ctype,
    "Ticket Type": "Unlimited",
    "Separate Each Book": separate ? "Y (북코드별 개별 티켓)" : "N (1개 티켓 병합)",
    ...(isCommon ? { "Used Customer": selCu?.cu ?? "-" } : {}),   // 공통코드: 사용 고객사
  });

  // 6자리(YYMMDD) ↔ 달력(YYYY-MM-DD)
  const sixToDate = (s2: string) => (/^\d{6}$/.test(s2) ? `20${s2.slice(0, 2)}-${s2.slice(2, 4)}-${s2.slice(4, 6)}` : "");
  const dateToSix = (d: string) => (d ? d.slice(2).replace(/-/g, "") : "");
  const validValue = untilUnlimited ? "99999999" : validUntil;

  const genKey = () => {
    if (!company) { setToast("고객사를 선택하세요."); return; }
    if (isCommon && !selCu) { setToast("공통코드 회사입니다. 사용 고객사를 선택하세요."); return; }
    if (!range) { setToast("발급 범위를 선택하세요."); return; }
    if (bookStart < range.bookStart || bookStart > range.bookEnd) { setToast(`Start Book은 ${range.bookStart}~${range.bookEnd} 범위여야 합니다.`); return; }
    if (books < 1 || bookEnd > range.bookEnd) { setToast(`Book 볼륨은 1~${maxBooks}권이어야 합니다. (B${bookStart}~B${range.bookEnd})`); return; }
    if (pageVolume < 1) { setToast("Page 볼륨은 1 이상이어야 합니다."); return; }
    if (!untilUnlimited && !/^\d{6}$/.test(validUntil)) { setToast("Valid Until Time 은 6자리(YYMMDD)이거나 무제한이어야 합니다."); return; }
    // N Key · App Key · 서비스 티켓은 SOBP 가 겹칠 수 없다 `PC-174`
    const clash = sobpOverlapMsg({ section: range.section, owner: range.owner, bookStart, bookEnd, pageStart, pageEnd: pageStart + pageVolume - 1 });
    if (clash) { setToast(clash); return; }
    const ticket = {
      companyName: company.name, issuedTime, validUntilTime: validValue,
      ...(selCu ? { usedCustomer: selCu.cu } : {}),   // 공통코드: 사용 고객사
      section: range.section, owner: range.owner, ticketVersion: 1,
      bookStart, bookVolume: books, pageStart, pageVolume,
      patternType: patternTypeParam(patternOf(ctype)), ticketType: "Unlimited", separateEachBook: separate,
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
    const issued = addTicket({ kind: "N", companyId: company.id, company: company.name, coRef: company.id,
                by: me?.name ?? "", summary, params: ticketParams() });
    logActivity("ticket", `N Key · ${company.name} · ${summary}`, me?.name);
    if (onIssued) { onIssued(issued); return; }   // 3단 화면 — 발급한 티켓의 정산 정보 탭으로 `PC-149`
    setToast(`N Key 발급됨 · 티켓 ${separate ? books + "개(개별 파일)" : "1장(병합)"} · B${bookStart}~${bookEnd} — zip(${folder}.zip)으로 다운로드됩니다.`);
  };

  const fixed: React.CSSProperties = { ...S.input, background: "#f3f4f6", color: "#6b7280" };

  return (
    <div style={{ ...S.card, padding: 18 }}>
      {/* 제목은 화면(브레드크럼)에 한 번만 두고, 여기서는 **고른 고객사**를 크게 보여 준다 `PC-068` */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        {embedded && <b style={{ fontSize: 15 }}>N Key 발급</b>}
        <div style={{ fontSize: embedded ? 13 : 20, fontWeight: embedded ? 400 : 800, color: company ? (embedded ? "#6b7280" : "#111827") : "#c7cdd6" }}>
          {company?.name ?? "고객사를 선택하세요"}
        </div>
        {range && (
          <span style={{ ...S.tag, background: "#eef6ff", color: "#2563eb", fontWeight: 700 }}>
            {range.pt} S{range.section}/O{range.owner}
          </span>
        )}
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11.5, color: "#9ca3af" }}>SOBP 코드 사용 허가 (Caster lite 티켓)</span>
      </div>

      {/* 회사이름 + 할당된 SOBP 범위 (나란히) */}
      <div style={{ display: "grid", gridTemplateColumns: embedded ? "1fr" : "1fr 1.4fr", gap: 12, alignItems: "start" }}>
        <div>
          <Field label="고객사 *">
            {embedded && companyId
              ? <div style={{ ...S.input, background: "#f7f8fa", color: "#6b7280" }}>{company?.name}</div>
              : (
                <select style={S.input} value={companyId} onChange={(e) => onCompany(Number(e.target.value))}>
                  <option value={0}>- 고객사 관리 고객사 선택 -</option>
                  {/* 상 · 하위 고객사 구별 — 하위는 상위 밑에 들여 `PC-197` `PC-198` */}
                  {nestCompanies([...companies].sort((a, b) => a.name.localeCompare(b.name, "ko")), companies, subsOf).flatMap(({ c, subs }) => [
                    <option key={c.id} value={c.id}>{c.name}{subs.length ? ` · 하위 ${subs.length}` : ""}</option>,
                    ...subs.map((x) => <option key={`${c.id}-${x.id}`} value={x.id}>{`  ${x.name}`}</option>),
                  ])}
                </select>
              )}
          </Field>
        </div>
        <div>
          {isCommon ? (
            <>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
                사용 고객사 * <span style={{ color: "#a855f7", fontWeight: 700 }}>공통코드</span>
                <span style={{ color: "#9ca3af" }}> (선택하면 코드가 자동으로 지정됩니다)</span>
              </div>
              <select style={S.input} value={cuIdx} onChange={(e) => onCu(+e.target.value)}>
                <option value={-1}>- 사용 고객사 선택 ({cuCandidates.length}곳) -</option>
                {cuCandidates.map((c, i) => <option key={`${c.k}${c.owner}:${c.cu}`} value={i}>{c.label}</option>)}
              </select>
              {selCu && <div style={{ fontSize: 11.5, color: "#6b21a8", marginTop: 6 }}>발급 코드: <b>{kindLabel(codeKind(selCu.k, 3))} · S3 / O{selCu.owner}</b> · 사용 고객사 <b>{selCu.cu}</b></div>}
            </>
          ) : (
            <>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>발급 범위 (nkey 대장 이력 · SOBP 할당) * <span style={{ color: "#9ca3af" }}>(선택하면 Section·Owner·Book·Code Type 이 자동으로 채워집니다)</span></div>
              <SobpRangePicker company={!!company} ranges={ranges} value={sobpIdx} onSelect={onRange} />
            </>
          )}
        </div>
      </div>

      {/* 구간 사용 현황 — 상위 SOBP 를 나눠 쓰는 하위 고객사끼리도 보인다 `PC-195` */}
      {range && <SobpUsage range={range} onPickBook={(b) => setBookStart(b)}
        cand={{ section: range.section, owner: range.owner, bookStart, bookEnd, pageStart, pageEnd: pageStart + pageVolume - 1 }} />}

      {/* Book / Page 범위 — 한 행에 4개 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginTop: 12 }}>
        <Field label={`Start Book ${range ? `· ${range.bookStart}~${range.bookEnd}` : "(시작 북코드)"}`}>
          <input type="number" min={range?.bookStart ?? 0} max={range?.bookEnd ?? undefined} style={S.input} value={bookStart}
            onChange={(e) => setBookStart(Math.max(0, +e.target.value))} disabled={!range} />
        </Field>
        <Field label={`Book 볼륨 (권) ${range ? `· 최대 ${maxBooks}` : ""}`}>
          <input type="number" min={1} max={maxBooks} style={S.input} value={books} onChange={(e) => setBooks(Math.max(1, +e.target.value))} disabled={!range} />
        </Field>
        <Field label="Start Page">
          <select style={S.input} value={pageStart} onChange={(e) => setPageStart(+e.target.value)} disabled={!range}>
            <option value={0}>0</option><option value={1}>1 (기본)</option><option value={2}>2</option>
          </select>
        </Field>
        {/* 페이지 정원은 **회사에 할당된 SOB(코드 종류·Section)** 를 따른다 `PC-051` */}
        <Field label={`Page 볼륨 ${range ? `· 최대 ${(PAGE_CAP[range.pt]?.[range.section] ?? 0).toLocaleString()}` : ""}`}>
          <input type="number" min={1} max={range ? (PAGE_CAP[range.pt]?.[range.section] ?? undefined) : undefined} style={S.input} value={pageVolume}
            onChange={(e) => { const cap = range ? (PAGE_CAP[range.pt]?.[range.section] ?? Infinity) : Infinity; setPageVolume(Math.max(1, Math.min(cap, +e.target.value))); }} disabled={!range} />
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginTop: 4 }}>
        <Field label="Valid Until Time (사용기간 끝)" full>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="date" style={{ ...S.input, maxWidth: 190, opacity: untilUnlimited ? 0.5 : 1 }} disabled={untilUnlimited}
              value={sixToDate(validUntil)} onChange={(e) => setValidUntil(dateToSix(e.target.value))} title="달력에서 선택" />
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, color: "#374151", whiteSpace: "nowrap", cursor: "pointer" }}>
              <input type="checkbox" checked={untilUnlimited} onChange={(e) => setUntilUnlimited(e.target.checked)} /> 무제한
            </label>
          </div>
        </Field>
      </div>

      {/* 자동/고정 항목 — Key 정보 순서와 같게 Code Type → Issued Time `PC-072` */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginTop: 4 }}>
        <Field label="Code Type">
          <select style={S.input} value={ctype} disabled={!range} onChange={(e) => setCtype(e.target.value as CodeKind)}>
            {CODE_KINDS.map((k) => <option key={k.v} value={k.v}>{k.short}</option>)}
          </select>
        </Field>
        <Field label="Issued Time (발급일 · 고정)"><input style={fixed} value={issuedTime} readOnly /></Field>
        <Field label="Ticket Version"><input style={fixed} value={1} readOnly /></Field>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 12, paddingTop: 12, borderTop: "1px solid #eef0f4" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#374151", cursor: "pointer" }}>
          <input type="checkbox" checked={separate} onChange={(e) => setSeparate(e.target.checked)} />
          <b>Separate Each Book</b> <span style={{ color: "#9ca3af" }}>(체크하면 북코드별 개별 티켓, 해제하면 1개 티켓으로 병합합니다)</span>
        </label>
        <span style={{ flex: 1 }} />
        {embedded
          ? <button onClick={onCancel} style={{ ...S.ghost, whiteSpace: "nowrap" }}>취소</button>
          : <Link href="/tickets/nkey" style={{ ...S.ghost, textDecoration: "none" }}>목록</Link>}
        <button onClick={genKey} disabled={!range}
          style={{ ...S.primary, whiteSpace: "nowrap", ...(!range ? { opacity: 0.5, cursor: "not-allowed" } : {}) }}>N Key 발급</button>
      </div>
      {range && (
        <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
          발급 예정: <b style={{ color: "#111827" }}>S{range.section}/O{range.owner}/B{bookStart}~{bookEnd}</b> · {separate ? `개별 티켓 ${books}장` : "병합 티켓 1장"} · P{pageStart}~{pageStart + pageVolume - 1}
          {bookEnd > range.bookEnd && <span style={{ color: "#dc2626", fontWeight: 700 }}> · ⚠ 할당 범위(B{range.bookEnd}) 초과</span>}
        </div>
      )}
      {toast && <div style={{ marginTop: 10, fontSize: 12.5, color: "#2563eb" }}>{toast}</div>}

      <div style={{ marginTop: 12, background: "#fafbfc", border: "1px dashed #e5e7eb", borderRadius: 8, padding: "10px 12px", fontSize: 11.5, color: "#6b7280", lineHeight: 1.7 }}>
        발급하면 티켓이 <b>zip 파일(폴더 형태)</b>로 다운로드됩니다. 다운로드 폴더에서 zip의 압축을 풀어 그 폴더째 <b>nproj 폴더</b> 또는 <b>내 PC &gt; 문서 &gt; NeoLAB &gt; CodeTickets</b>(<code>{CODE_TICKETS}</code>)에 넣은 뒤 <b>Caster lite</b>에서 사용합니다.
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
  if (ranges.length === 0) return note("이 고객사의 발급 범위(대장 이력)가 없습니다.");
  const sel = ranges[value];
  // 하위 고객사가 받은 상위 고객사 SOBP — 어느 상위 것인지 보인다 `PC-199`
  const parentTag = (r: SobpRange) => {
    const p = (r as SobpRange & { parent?: string }).parent;
    return p ? <span style={{ fontSize: 11, color: "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={`상위 고객사 ${p}의 SOBP`}>상위 · {p}</span> : null;
  };
  return (
    <div style={{ position: "relative" }}>
      {/* 트리거(접힘) */}
      <button onClick={() => setOpen((o) => !o)}
        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff", cursor: "pointer", minHeight: 40 }}>
        {sel ? <><Chips r={sel} />{parentTag(sel)}</> : <span style={{ color: "#9ca3af", fontSize: 12.5 }}>- 범위 선택 -</span>}
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
                  {parentTag(r)}
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

