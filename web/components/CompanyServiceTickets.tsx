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
import { SobpChips } from "./sobp";
import { SobpUsage } from "./SobpUsage";
import { useStore } from "@/lib/store";
import { useAuth, currentUser } from "@/lib/authStore";
import { logActivity } from "@/lib/activityStore";
import { fmtMoney, hydrateTickets, useTickets, today } from "@/lib/ticketStore";
import { BillingEditor, BillTag } from "./BillingEditor";
import { codesOfMember, hydrateMembers, useCommonMembers } from "@/lib/commonMembers";
import { serviceRangesOfCompany, type ServiceRange } from "@/lib/keyCompany";
import { sobpOverlapMsg } from "@/lib/rangeGuard";
import {
  addServiceTicket, updateServiceTicket, allServiceTickets, hydrateServiceTickets, useServiceTickets,
  ticketState, STATE_COLOR, serviceTicketText, setServiceBilling, TICKET_SERVICES, ticketServiceOf, type ServiceTicket, type TicketService,
} from "@/lib/serviceTicketStore";
import { companyServices, type Company } from "@/lib/customerData";
import { WS_CARD as card, WS_HD as hd, WS_EMPTY, WS_HEAD_BTN, wsTag as tag, wsItem, WsTabs } from "./KeyWorkspaceUI";   // 키 화면과 같은 조각 `PC-154`

const PAGE_DEFAULT = 512;   // Page 볼륨 기본값 — App Key · N Key 발급과 같은 값
type Right = { kind: "t"; id: number } | { kind: "add" } | { kind: "edit"; id: number } | { kind: "none" };

/** 만료 후 동작 — 숨김 안내(눌러야 펼쳐진다) `PC-171` ④ */
export function ExpiryNote() {
  return (
    <details style={{ marginTop: 12, border: "1px solid #eef0f4", borderRadius: 9, background: "#fafbfc", padding: "8px 12px", fontSize: 12 }}>
      <summary style={{ cursor: "pointer", color: "#6b7280", fontWeight: 700 }}>ⓘ 만료 후 동작</summary>
      <div style={{ marginTop: 8, color: "#374151", lineHeight: 1.75 }}>
        <b>사용기간이 끝나면</b>
        <div>• 이 범위의 코드로 <b>편집 · 추가 작업을 할 수 없습니다.</b> (당사 서버를 거치는 서비스 — casterN 편집, Ncode SDK)</div>
        <div>• <b>이미 만든 작업물(PDF)의 인쇄 · 배포는 막을 수 없습니다.</b> 실물 출판물에는 코드가 남습니다.</div>
      </div>
    </details>
  );
}

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
  const [help, setHelp] = useState(false);   // ⓘ 설명 — 본문이 아니라 **토스트**로 띄운다 `PC-181` `PC-182`
  useEffect(() => { if (!help) return; const id = setTimeout(() => setHelp(false), 5000); return () => clearTimeout(id); }, [help]);
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
          {/* 설명은 숨김 — ⓘ 를 누르면 **바로 아래**에 토스트로 잠깐 보인다(본문에 넣지 않는다) `PC-182` `PC-184` */}
          <span style={{ position: "relative", display: "inline-flex" }}>
            <button type="button" onClick={() => setHelp((v) => !v)} title="서비스 티켓이란?"
              style={{ border: 0, background: help ? "#eef6ff" : "transparent", color: help ? "#2563eb" : "#9ca3af", borderRadius: 999, width: 20, height: 20, cursor: "pointer", fontSize: 12, padding: 0 }}>ⓘ</button>
            {help && (
              <div role="status" onClick={() => setHelp(false)}
                style={{ position: "absolute", top: "calc(100% + 8px)", left: -10, zIndex: 60, width: 300, cursor: "pointer",
                  background: "#1f2937", color: "#f9fafb", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, lineHeight: 1.6, fontWeight: 400,
                  boxShadow: "0 12px 32px rgba(15,23,42,.25)" }}>
                {/* 말풍선 꼬리 — ⓘ 를 가리킨다 */}
                <span style={{ position: "absolute", top: -5, left: 16, width: 10, height: 10, background: "#1f2937", transform: "rotate(45deg)" }} />
                사용자에게 발급하는 키가 아닙니다. 이 고객사의 <b>서비스 계정 {accountCount}명</b>이 서비스를 쓸 때 티켓의 범위와 기간으로 승인합니다.
              </div>
            )}
          </span>
          <span style={{ flex: 1 }} />
          <button type="button" onClick={() => setRight({ kind: "add" })} style={WS_HEAD_BTN}>＋ 티켓 지정</button>
        </div>
        <div style={{ padding: 12 }}>
          {/* 할당된 SOBP — SOBP 맵과 같은 S · O · B 칩만 보인다 `PC-181` */}
          <div style={{ border: "1px solid #eef0f4", borderRadius: 10, padding: "8px 10px", marginBottom: 10, background: "#fafbfc" }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "#374151", marginBottom: 6 }}>할당된 SOBP</div>
            {ranges.length === 0 && <div style={{ fontSize: 11.5, color: "#9ca3af", lineHeight: 1.6 }}>SOBP 할당이 없습니다. <Link href="/ownership" style={{ color: "#2563eb" }}>SOBP 맵</Link>에서 먼저 할당하세요.</div>}
            {ranges.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", flexWrap: "wrap" }}>
                <SobpChips s={r.section} o={r.owner} b={`${r.bookStart}~${r.bookEnd}`} small />
                {r.shared && <span style={tag("#f3e8ff", "#7e22ce")}>공유</span>}
              </div>
            ))}
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
          {mine.length === 0 && right.kind !== "add" && <div style={WS_EMPTY}>서비스 티켓이 없습니다.</div>   /* 안내는 오른쪽 칸에만 — 중복 제거 `PC-183` */}
          {mine.map((t) => {
            const on = (right.kind === "t" || right.kind === "edit") && right.id === t.id;
            const st = ticketState(t);
            return (
              <div key={t.id} onClick={() => setRight({ kind: "t", id: t.id })} style={wsItem(on)}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <b style={{ fontSize: 13 }}>No.{t.no}</b>
                  <SvcTag v={t.service} />
                  <span style={tag(STATE_COLOR[st].bg, STATE_COLOR[st].fg)}>{st}</span>
                  {t.shared && <span style={tag("#f3e8ff", "#7e22ce")}>공유</span>}
                  <span style={{ flex: 1 }} />
                  <BillTag v={t} />
                </div>
                <div style={{ marginTop: 5 }}><SobpChips s={t.section} o={t.owner} b={`${t.bookStart}~${t.bookEnd}`} p={`${t.pageStart}~${t.pageEnd}`} small /></div>
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
          return t ? <TicketDetail key={t.id} t={t} me={me?.name ?? ""} onEdit={() => setRight({ kind: "edit", id: t.id })} /> : null;
        })()}
        {/* 티켓 수정 — 지정 폼을 그 티켓 값으로 연다 `PC-192` */}
        {right.kind === "edit" && (() => {
          const t = mine.find((x) => x.id === right.id);
          return t ? (
            <IssueForm key={`edit-${t.id}`} edit={t} coId={company.id} coName={company.name} coSvcs={[]} ranges={ranges} mine={mine} me={me?.name ?? ""}
              onDone={(id) => setRight({ kind: "t", id })} onCancel={() => setRight({ kind: "t", id: t.id })} />
          ) : null;
        })()}
        {right.kind === "add" && (
          <IssueForm key={`add-${company.id}`} coId={company.id} coName={company.name} coSvcs={companyServices(company).filter((v): v is TicketService => v === "CASTERN" || v === "FORMSOLUTION")} ranges={ranges} mine={mine} me={me?.name ?? ""}
            onDone={(id) => setRight({ kind: "t", id })} onCancel={() => setRight(first())} />
        )}
        {right.kind === "none" && (
          <div style={{ ...card, padding: "48px 0", textAlign: "center", color: "#9ca3af", fontSize: 12.5, lineHeight: 1.8 }}>
            티켓을 선택하거나 <b>[＋ 티켓 지정]</b>을 누르세요.<br />정산은 티켓 상세의 <b>[정산] 탭</b>에서 등록합니다.
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 티켓 상세 ─────────────────────────────────────────────── */
// 상세 탭 — 티켓 정보 · 정산. N Key · App Key 처럼 정산은 별도 탭 `PC-179`
type DetailTab = "info" | "bill";
const DETAIL_TABS: { v: DetailTab; label: string }[] = [{ v: "info", label: "티켓 정보" }, { v: "bill", label: "정산" }];

function TicketDetail({ t, onEdit, me }: { t: ServiceTicket; onEdit: () => void; me: string }) {
  const st = ticketState(t);
  const [tab, setTab] = useState<DetailTab>("info");
  const rows: [string, string | number][] = [
    ["Company Name", t.company], ["Service (서비스)", ticketServiceOf(t.service)?.label ?? "미지정"], ["Code Type", t.pt], ["Section", t.section], ["Owner", t.owner],
    ["Book Start", t.bookStart], ["Book Volume", t.bookVol], ["Book End", t.bookEnd],
    ["Page Start", t.pageStart], ["Page Volume", t.pageVol], ["Page End", t.pageEnd],
    ["Valid From Time", t.since], ["Valid Until Time", t.until], ["지정 일시", t.at.replace("T", " ")], ["지정인", t.by || "-"],
  ];
  return (
    <div style={card}>
      <div style={hd}>
        <b style={{ fontSize: 14 }}>서비스 티켓 No.{t.no}</b>
        <span style={tag(STATE_COLOR[st].bg, STATE_COLOR[st].fg)}>{st}</span>
        <SvcTag v={t.service} />
        {t.shared && <span style={tag("#f3e8ff", "#7e22ce")}>공유 코드</span>}
        <span style={{ flex: 1 }} />
        {/* 발급된 티켓은 지우지 않는다 — 정보만 고친다 `PC-192` */}
        <button type="button" onClick={onEdit} style={S.smallBtn}>티켓 수정</button>
      </div>
      <div style={{ padding: 16 }}>
        <WsTabs items={DETAIL_TABS} tab={tab} onTab={setTab} badge={{ bill: (t.billing ?? "미정") === "미정" ? "미정" : undefined }} />
        <div style={{ display: tab === "info" ? "block" : "none" }}>
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
        </div>
        {/* 정산 탭 — N Key 와 같은 4종 `PC-176` `PC-179` */}
        <div style={{ display: tab === "bill" ? "block" : "none" }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>이 서비스 티켓(No.{t.no} · {serviceTicketText(t)})의 정산을 등록합니다.</div>
          <BillingEditor key={t.id} v={t} baseDate={t.at.slice(0, 10)} onSave={(p) => {
            setServiceBilling(t.id, { ...p, by: me });
            logActivity("ticket", `서비스 티켓 정산 · ${t.company} · No.${t.no} · ${p.billing}${p.billing === "유료" ? ` ${fmtMoney(p)}` : ""}`, me);
          }} />
        </div>
      </div>
    </div>
  );
}

/** 서비스 구분 배지 — casterN · 폼솔루션 · (옛 기록) 미지정 `PC-186` */
function SvcTag({ v }: { v?: string }) {
  const s = ticketServiceOf(v);
  return s ? <span style={tag(s.bg, s.fg)}>{s.label}</span> : <span style={tag("#f3f4f6", "#9ca3af")}>서비스 미지정</span>;
}

/* ── 티켓 지정 ─────────────────────────────────────────────── */
function IssueForm({ edit, coId, coName, coSvcs, ranges, mine, me, onDone, onCancel }: {
  edit?: ServiceTicket;   // 있으면 수정 모드 — 그 티켓 값으로 채운다 `PC-192`
  coId: number; coName: string; coSvcs: TicketService[]; ranges: ServiceRange[]; mine: ServiceTicket[]; me: string;
  onDone: (id: number) => void; onCancel: () => void;
}) {
  // 수정 모드: 그 티켓이 속한 할당 범위(같은 S/O 에서 Book 이 들어가는 것)
  const editIdx = edit ? ranges.findIndex((x) => x.section === edit.section && x.owner === edit.owner && edit.bookStart >= x.bookStart && edit.bookStart <= x.bookEnd) : -1;
  // 서비스 구분 — 고객사가 쓰는 서비스가 하나면 그것으로 시작 `PC-186`
  const [svc, setSvc] = useState<TicketService | "">(edit?.service ?? (coSvcs.length === 1 ? coSvcs[0] : ""));
  // Code Type — PDS3 / PDS2 를 직접 고른다. 범위를 고르면 그 범위의 종류로 맞춘다 `PC-188`
  const [ctype, setCtype] = useState<"PDS3" | "PDS2">(edit?.pt === "PDS2" ? "PDS2" : "PDS3");
  const [ctypeSet, setCtypeSet] = useState(!!edit);   // 직접 고르면(또는 수정이면) 범위를 바꿔도 그대로 둔다
  const [idx, setIdx] = useState(editIdx);
  const [bStart, setBStart] = useState(edit?.bookStart ?? 0);
  const [bVol, setBVol] = useState(edit?.bookVol ?? 1);
  const [pStart, setPStart] = useState(edit?.pageStart ?? 0);
  const [pVol, setPVol] = useState(edit?.pageVol ?? PAGE_DEFAULT);
  const [since, setSince] = useState(edit?.since ?? today());
  const [until, setUntil] = useState(edit?.until ?? "");
  const [err, setErr] = useState("");
  const r = ranges[idx];
  const pick = (i: number) => {
    const x = ranges[i]; setIdx(i); setErr("");
    if (!x) return;
    if (!ctypeSet && (x.pt === "PDS2" || x.pt === "PDS3")) setCtype(x.pt);
    setBStart(firstFreeBook(x, mine.filter((m) => m.id !== edit?.id))); setBVol(1); setPStart(x.pageStart); setPVol(Math.min(PAGE_DEFAULT, x.pageEnd - x.pageStart + 1));
  };
  const maxVol = r ? Math.max(1, r.bookEnd - bStart + 1) : 1;
  const maxPVol = r ? Math.max(1, r.pageEnd - pStart + 1) : 1;
  // 필수 항목이 하나라도 비면 [티켓 지정]을 막는다 `PC-189` — 무엇이 빠졌는지는 버튼 툴팁으로
  const missing = [!svc && "서비스", !r && "지정 범위", !since && "사용기간 시작", !until && "사용기간 끝",
    since && until && until < since && "사용기간(끝이 시작보다 앞섬)"].filter(Boolean) as string[];
  const ready = missing.length === 0;

  const issue = () => {
    if (!svc) { setErr("서비스(casterN / 폼솔루션)를 선택하세요."); return; }
    if (!r) { setErr("지정 범위(할당 SOBP)를 선택하세요."); return; }
    if (!since || !until) { setErr("사용기간 시작과 끝을 모두 정하세요."); return; }
    if (until < since) { setErr("사용기간 끝이 시작보다 앞설 수 없습니다."); return; }
    const cand = { section: r.section, owner: r.owner, bookStart: bStart, bookEnd: bStart + bVol - 1, pageStart: pStart, pageEnd: pStart + pVol - 1 };
    // N Key · App Key · 서비스 티켓은 SOBP 가 절대 겹칠 수 없다 — 고객사를 가리지 않고 전체에서 검사 `PC-174`
    //   수정이면 자기 자신은 빼고 본다 — 사용 가능한 구간이면 고칠 수 있다 `PC-192`
    const clash = sobpOverlapMsg(cand, edit ? `S${edit.id}` : undefined);
    if (clash) { setErr(clash); return; }
    if (edit) {
      updateServiceTicket(edit.id, { pt: ctype, section: r.section, owner: r.owner,
        bookStart: cand.bookStart, bookVol: bVol, bookEnd: cand.bookEnd, pageStart: pStart, pageVol: pVol, pageEnd: cand.pageEnd,
        since, until, shared: r.shared, service: svc });
      logActivity("ticket", `서비스 티켓 수정 · ${coName} · No.${edit.no} · ${ticketServiceOf(svc)?.label} · ${ctype} S${r.section}/O${r.owner}/B${cand.bookStart}~${cand.bookEnd}/P${pStart}~${cand.pageEnd} · 기간 ${since}~${until}`, me);
      onDone(edit.id);
      return;
    }
    const t = addServiceTicket({ companyId: coId, company: coName, pt: ctype, section: r.section, owner: r.owner,
      bookStart: cand.bookStart, bookVol: bVol, bookEnd: cand.bookEnd, pageStart: pStart, pageVol: pVol, pageEnd: cand.pageEnd,
      since, until, shared: r.shared, service: svc, by: me });
    logActivity("ticket", `서비스 티켓 지정 · ${coName} · No.${t.no} · ${ticketServiceOf(svc)?.label} · ${serviceTicketText(t)} · 기간 ${since}~${until}`, me);
    onDone(t.id);
  };

  return (
    <div style={card}>
      <div style={hd}><b style={{ fontSize: 14 }}>{edit ? `서비스 티켓 수정 · No.${edit.no}` : "서비스 티켓 지정"}</b><span style={{ fontSize: 11.5, color: "#9ca3af" }}>{coName}</span></div>
      <div style={{ padding: 16 }}>
        {/* 서비스 · Code Type — 한 줄에 나란히, 두 항목은 세로선으로 떼어 놓는다 `PC-188` `PC-190` */}
        <div style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "flex-start", marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>서비스 *</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 0 }}>
              {TICKET_SERVICES.map((x) => {
                const on = svc === x.v;
                return (
                  <button key={x.v} type="button" onClick={() => setSvc(x.v)}
                    style={{ padding: "8px 18px", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: on ? 700 : 400,
                      border: `1px solid ${on ? x.fg : "#e5e7eb"}`, background: on ? x.bg : "#fff", color: on ? x.fg : "#6b7280" }}>{x.label}</button>
                );
              })}
            </div>
          </div>
          <div style={{ borderLeft: "1px solid #e5e7eb", paddingLeft: 32 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Code Type *</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 0 }}>
              {(["PDS3", "PDS2"] as const).map((k) => {
                const on = ctype === k;
                return (
                  <button key={k} type="button" onClick={() => { setCtype(k); setCtypeSet(true); }}
                    style={{ padding: "8px 18px", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: on ? 700 : 400,
                      border: `1px solid ${on ? "#2563eb" : "#e5e7eb"}`, background: on ? "#eef6ff" : "#fff", color: on ? "#2563eb" : "#6b7280" }}>{k}</button>
                );
              })}
            </div>
          </div>
        </div>
        {/* 항목 묶음 사이 세로 간격 22px — 지정 범위 · Book/Page · 사용기간이 구분되게 `PC-191` */}
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>지정 범위 (할당 SOBP · 공유 코드) *</div>
        <SobpRangePicker company ranges={ranges} value={idx} onSelect={pick} />
        {/* 구간 사용 현황 — 수정 중이면 자기 자신은 빼고 본다 `PC-195` */}
        {r && <SobpUsage range={r} exclude={edit ? `S${edit.id}` : undefined} onPickBook={(b) => setBStart(b)}
          cand={{ section: r.section, owner: r.owner, bookStart: bStart, bookEnd: bStart + Math.min(bVol, maxVol) - 1, pageStart: pStart, pageEnd: pStart + Math.min(pVol, maxPVol) - 1 }} />}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 22 }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 22 }}>
          <Field label="Valid From Time (사용기간 시작) *">
            <input type="date" style={S.input} value={since} disabled={!r} onChange={(e) => setSince(e.target.value)} />
          </Field>
          <Field label="Valid Until Time (사용기간 끝) *">
            <input type="date" style={S.input} value={until} disabled={!r} min={since || undefined} onChange={(e) => setUntil(e.target.value)} />
          </Field>
        </div>
        <div style={{ marginTop: 10 }}><ExpiryNote /></div>   {/* ExpiryNote 자체 위 여백 12 + 10 = 22 */}
        {err && <div style={{ marginTop: 12, fontSize: 12.5, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 9, padding: "9px 12px" }}>{err}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 22 }}>
          <button type="button" onClick={onCancel} style={S.ghost}>취소</button>
          <button type="button" onClick={issue} disabled={!ready} title={ready ? undefined : `입력하지 않은 항목: ${missing.join(" · ")}`}
            style={{ ...S.primary, opacity: ready ? 1 : 0.5, cursor: ready ? "pointer" : "not-allowed" }}>{edit ? "수정 저장" : "티켓 지정"}</button>
        </div>
      </div>
    </div>
  );
}

