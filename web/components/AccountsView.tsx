"use client";

// 계정 발급 — TKT-03 계정 목록 / TKT-06 계정 등록·수정
// 목록에서 [＋ 계정 추가] → 등록 화면(계정 정보 · App Key 발급),
// 목록의 계정을 누르면 상세·수정 화면에서 정보를 고치고 App Key 를 추가·삭제한다.
// App Key 관리 = 티켓 고객사의 **키 발급 계정**. 인증 서비스·권한은 다루지 않는다 —
// 서비스 계정과 권한은 고객사 관리에서 관리한다 `PC-128` `PC-131`
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { S, Field } from "./ui";
import { useStore } from "@/lib/store";
import { useAuth, currentUser } from "@/lib/authStore";
import { logActivity } from "@/lib/activityStore";
import { addTicket, deleteTicket, hydrateTickets, useTickets } from "@/lib/ticketStore";
import { SobpRangePicker, type SobpRange } from "./TicketsView";
import { rangesOfTicketCustomer, ticketCustomerById, useTicketCustomers } from "@/lib/ticketCustomerStore";
import { TicketCustomerSelect } from "./TicketCustomerSelect";
import { CODE_KINDS, type CodeKind } from "@/lib/codeKind";
import {
  caster, useCaster, genAppKey,
  keyRanges, rangeText, rangeBooks, rangePeriod, accountScope, type KeyRange,
  type CasterAccount,
} from "@/lib/accountStore";

const accountHref = (id: string, tab?: AccTab) =>
  `/tickets/account/${encodeURIComponent(id)}${tab && tab !== "info" ? `?tab=${tab}` : ""}`;
const PAGE_DEFAULT = 512;   // Page 볼륨 기본값 — N Key 발급과 같은 값 `PC-059`
// 범위의 pt → 코드 종류 `PC-064`
const CT_OF: Record<string, CodeKind> = { PDS3: "PDS3", PDS2: "PDS2", Scode: "PDS4", OID: "OID" };

/* ── TKT-03 계정 목록 ───────────────────────────────────────────── */
export function AccountsListView() {
  const router = useRouter();          // 레코드 클릭 → 상세 `PC-053`
  const cast = useCaster();
  const [fCo, setFCo] = useState("");      // 고객사 필터 = 계정의 고객사 이름(티켓 고객사) `PC-123`
  const [q, setQ] = useState("");

  // App Key 관리 = **키 발급 계정**만 — 서비스 로그인 계정(권한)은 고객사 관리에서 다룬다 `PC-128`
  const keyAccounts = cast.accounts.filter((a) => accountScope(a) === "key");
  const rows = keyAccounts
    .filter((a) => (fCo ? a.company === fCo : true))
    .filter((a) => (q ? `${a.id} ${a.name} ${a.company}`.toLowerCase().includes(q.toLowerCase()) : true));
  const keysOf = (id: string) => cast.appKeys.filter((k) => k.accountId === id);
  const coOpts = [...new Set(keyAccounts.map((a) => a.company))].sort((a, b) => a.localeCompare(b, "ko"));

  return (
    <div style={{ padding: "18px 20px" }}>
      {/* 요약 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 12 }}>
        {[
          ["등록 계정", keyAccounts.length.toLocaleString(), "#111827"],
          ["App Key 연동", keyAccounts.filter((a) => keysOf(a.id).length).length.toLocaleString(), "#2563eb"],
          ["App Key 없음", keyAccounts.filter((a) => !keysOf(a.id).length).length.toLocaleString(), "#92400e"],
          ["발급 App Key", keyAccounts.reduce((n, a) => n + keysOf(a.id).length, 0).toLocaleString(), "#7c3aed"],
          ["티켓 고객사", new Set(keyAccounts.map((a) => a.company)).size.toLocaleString(), "#0f766e"],
        ].map(([l, v, c]) => (
          <div key={l} style={{ ...S.card, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: "#6b7280" }}>{l}</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* 필터 + 계정 추가 */}
      <div style={{ ...S.card, padding: "10px 12px", marginBottom: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 12.5 }}>
        <select value={fCo} onChange={(e) => setFCo(e.target.value)} style={{ ...S.input, width: 200 }}>
          <option value="">고객사 전체</option>
          {coOpts.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ID(email) · 이름 · 고객사 검색" style={{ ...S.input, width: 240 }} />
        <span style={{ color: "#9ca3af" }}>{rows.length}건</span>
        <span style={{ flex: 1 }} />
        <Link href="/tickets/account/new" style={{ ...S.primary, textDecoration: "none" }}>＋ 계정 추가</Link>
      </div>

      {/* 목록 */}
      <div style={{ ...S.card, padding: 0, overflowX: "auto" }}>
        <table style={{ ...S.table, minWidth: 1320 }}>
          <thead>
            <tr>{["고객사", "ID (EMAIL)", "이름", "App Key", "코드 범위", "사용기간", "등록일", ""].map((h) => (
              <th key={h} style={S.th}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const keys = keysOf(a.id);
              return (
                // 레코드를 누르면 상세로 간다 `PC-053` — 항목마다 그 항목의 탭으로 `PC-067`
                <tr key={a.id} onClick={() => router.push(accountHref(a.id))} title="클릭하면 계정 정보"
                  style={{ borderTop: "1px solid #eef0f4", cursor: "pointer" }}>
                  <td style={S.td}>{a.company}</td>
                  <td style={{ ...S.td, fontFamily: "ui-monospace,monospace", color: "#2563eb", fontWeight: 600 }}>{a.id}</td>
                  <td style={S.td}>{a.name || "—"}</td>
                  {/* App Key → [App Key 발급] 탭 · 키 값을 그대로 보여 준다 `PC-067` */}
                  <td style={{ ...S.td, textAlign: "left" }} title="클릭하면 App Key 발급"
                    onClick={(e) => { e.stopPropagation(); router.push(accountHref(a.id, "key")); }}>
                    {keys.length === 0
                      ? <span style={{ ...S.tag, background: "#f3f4f6", color: "#9ca3af" }}>미발급</span>
                      : keys[0].key
                        ? <code style={{ fontFamily: "ui-monospace,monospace", fontSize: 11, color: "#2563eb", wordBreak: "break-all" }}>{keys[0].key}</code>
                        // 대장에 코드 범위는 있는데 키 값이 안 적힌 계정 `PC-103`
                        : <span style={{ ...S.tag, background: "#fef3c7", color: "#92400e", fontWeight: 700 }} title="대장에 App Key 값이 적혀 있지 않습니다">키 미기재</span>}
                  </td>
                  {/* 코드 범위 수 · 사용기간 `PC-103` */}
                  <td style={{ ...S.td, whiteSpace: "nowrap" }} title={keys[0] ? keyRanges(keys[0]).map(rangeText).join("\n") : undefined}
                    onClick={(e) => { e.stopPropagation(); router.push(accountHref(a.id, "key")); }}>
                    {keys[0] ? <span style={{ ...S.tag, background: "#eef6ff", color: "#2563eb", fontWeight: 700 }}>{keyRanges(keys[0]).length}개</span> : <span style={{ color: "#c7cbd4" }}>—</span>}
                  </td>
                  {/* 사용기간 = 코드 범위(=티켓)별 기간 `PC-118` — 목록엔 첫 범위 기준 요약 */}
                  <td style={{ ...S.td, fontFamily: "ui-monospace,monospace", color: "#6b7280", whiteSpace: "nowrap", fontSize: 11.5 }}>
                    {(() => {
                      const k0 = keys[0]; if (!k0) return <span style={{ color: "#c7cbd4" }}>—</span>;
                      const rs = keyRanges(k0); if (rs.length === 0) return <span style={{ color: "#c7cbd4" }}>—</span>;
                      const p = rangePeriod(k0, rs[0]);
                      return `${p.since || "즉시"} ~ ${p.until}${rs.length > 1 ? ` 외 ${rs.length - 1}` : ""}`;
                    })()}
                  </td>
                  <td style={{ ...S.td, fontFamily: "ui-monospace,monospace", color: "#6b7280" }}>
                    {a.seeded ? <span style={{ ...S.tag, background: "#f0fdfa", color: "#0f766e", fontWeight: 700 }} title="개발팀 대장에서 들어온 계정">대장</span> : a.createdAt?.slice(0, 10)}
                  </td>
                  <td style={{ ...S.td, textAlign: "right", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                    <Link href={accountHref(a.id)} style={{ ...S.linkBtn, textDecoration: "none" }}>상세</Link>
                    <button onClick={() => { if (confirm("이 계정과 연동 App Key를 삭제할까요?")) caster.removeAccount(a.id); }} style={{ ...S.linkBtn, color: "#dc2626" }}>삭제</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div style={{ padding: "26px 14px", textAlign: "center", color: "#9ca3af", fontSize: 12.5 }}>
            {cast.accounts.length === 0 ? "등록된 계정이 없습니다. [＋ 계정 추가]로 등록하세요." : "조건에 맞는 계정이 없습니다."}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 공용 조각 ─────────────────────────────────────────────────── */
// Key 정보 카드 — 발급 상세(`TKT-05`)의 Key 정보 항목을 계정 기준으로 보여 준다 `PC-059`
function KeyCard({ title, params, empty, href }: {
  title: string; params?: Record<string, string | number>; empty: string; href?: string;
}) {
  const rows = params ? Object.entries(params) : [];
  return (
    <div style={{ border: "1px solid #eef0f4", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 11px", background: "#fafbfc", borderBottom: "1px solid #eef0f4" }}>
        <b style={{ fontSize: 12.5 }}>{title}</b>
        <span style={{ ...S.tag, fontSize: 9.5, background: rows.length ? "#eef6ff" : "#f3f4f6", color: rows.length ? "#2563eb" : "#9ca3af", fontWeight: 700 }}>
          {rows.length ? "발급됨" : "미발급"}
        </span>
        <span style={{ flex: 1 }} />
        {href && <Link href={href} style={{ ...S.linkBtn, textDecoration: "none" }}>{rows.length ? "상세" : "발급"}</Link>}
      </div>
      {rows.length === 0 ? (
        <div style={{ padding: "14px 12px", fontSize: 11.5, color: "#9ca3af" }}>{empty}</div>
      ) : (
        <div>
          {rows.map(([k, v]) => (
            <div key={k} style={{ display: "flex", gap: 8, padding: "5px 11px", fontSize: 11.5, borderTop: "1px solid #f6f7f9" }}>
              <span style={{ color: "#6b7280", minWidth: 108, fontFamily: "ui-monospace,monospace" }}>{k}</span>
              <span style={{ color: "#111827", wordBreak: "break-all" }}>{String(v)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 화면 탭 — 계정 정보 · App Key 발급 (인증 서비스 및 권한은 삭제 `PC-131`)
export type AccTab = "info" | "key";
const ACC_TABS: { v: AccTab; label: string }[] = [
  { v: "info", label: "계정 정보" },
  { v: "key", label: "App Key 발급" },
];
function AccTabs({ tab, onTab, badge }: { tab: AccTab; onTab: (v: AccTab) => void; badge?: Partial<Record<AccTab, string>> }) {
  return (
    <div style={{ display: "flex", borderBottom: "1px solid #eef0f4", marginBottom: 14 }}>
      {ACC_TABS.map(({ v, label }) => {
        const on = tab === v;
        return (
          <button key={v} onClick={() => onTab(v)}
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

// 영역 제목 — 번호를 붙이지 않는다. Key 관리 상세(`TKT-05`)와 같은 결 `PC-052`
function SecHead({ t, d, tip }: { t: string; d?: string; tip?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
      {/* 설명은 본문에 늘어놓지 않고 **제목 툴팁**으로 둔다 `PC-070` */}
      <b style={{ fontSize: 13, color: "#111827", ...(tip ? { cursor: "help", borderBottom: "1px dotted #c7cdd6" } : {}) }} title={tip}>{t}</b>
      {d && <span style={{ fontSize: 11.5, color: "#9ca3af" }}>{d}</span>}
    </div>
  );
}
// 영역 묶음 — 항목을 카드로 구분한다 `PC-052`
const SEC: React.CSSProperties = { border: "1px solid #eef0f4", borderRadius: 10, padding: "14px 16px", marginTop: 12 };

const genPwdStr = () => {
  const buf = new Uint8Array(9);
  (globalThis.crypto ?? window.crypto).getRandomValues(buf);
  return btoa(String.fromCharCode(...buf)).replace(/[+/=]/g, "").slice(0, 10);
};
// App Key 값 생성은 스토어의 규칙을 그대로 쓴다 — 영문·숫자 29자 `PC-066`
const genKeyStr = genAppKey;

// 티켓 고객사의 발급 범위 — 고객사 관리의 SOBP 할당이 아니라 **nkey(HLP) 대장 이력의 S/O/B** `PC-123`
//   계정은 고객사 **이름**으로 티켓 고객사와 잇는다.
function useRanges(companyName?: string): SobpRange[] {
  useTicketCustomers();
  const { projects } = useStore();     // SOBP 맵에서 (K) 로 직접 할당한 S/O 포함 `PC-125`
  return rangesOfTicketCustomer(companyName, projects);
}

// App Key 발급 — 계정 등록·상세에서 공용으로 쓴다.
// App Key 는 CasterN 서비스에만 해당한다(SOBP 범위를 편집툴에 연동하는 키).
// App Key 발급 범위 입력 — 할당 SOBP 안에서 **Book Start · Book Volume(권수)** 를 정한다 `PC-050`
// 고정 값은 입력칸이 아니라 **한 줄 요약**으로 모아 보여 준다 `PC-071`
//   (Code Type · 만료일은 고르는 값이라 위쪽 입력 줄에 있다)
function FixedKeyFields({ range, unlimited }: { range?: SobpRange; unlimited: boolean }) {
  const item = (k: string, v: string) => (
    <span key={k} style={{ display: "inline-flex", alignItems: "baseline", gap: 5 }}>
      <span style={{ color: "#9ca3af" }}>{k}</span>
      <b style={{ color: "#374151", fontFamily: "ui-monospace,monospace" }}>{v}</b>
    </span>
  );
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "baseline",
      marginTop: 10, padding: "8px 11px", background: "#fafbfc", border: "1px solid #eef0f4", borderRadius: 9, fontSize: 11.5 }}>
      <span style={{ color: "#6b7280", fontWeight: 700 }}>자동·고정</span>
      {item("Section · Owner", range ? `S${range.section} / O${range.owner}` : "-")}
      {item("Ticket Type", unlimited ? "Unlimited" : "Period")}
      {item("Ticket Version", "1")}
    </div>
  );
}

function BookRangeFields({ range, bookStart, bookVol, pageStart, pageVol, onStart, onVol, onPStart, onPVol }: {
  range?: SobpRange; bookStart: number; bookVol: number; pageStart: number; pageVol: number;
  onStart: (v: number) => void; onVol: (v: number) => void;
  onPStart: (v: number) => void; onPVol: (v: number) => void;
}) {
  const min = range?.bookStart ?? 0;
  const max = range?.bookEnd ?? 0;
  const maxVol = Math.max(1, max - bookStart + 1);
  // 고객사가 가진 **S/O 안에서 B·P 영역만 계정마다 다르게** 잡는다 `PC-059`
  // 라벨·조작 방식은 N Key 발급(`TKT-04`)과 같게 맞춘다 `PC-051`
  return (
    <>
      <Field label={`Start Book ${range ? `· ${min}~${max}` : "(시작 북코드)"}`}>
        <input type="number" style={S.input} value={bookStart} min={min} max={max} disabled={!range}
          onChange={(e) => onStart(Math.max(min, Math.min(max, +e.target.value || 0)))} />
      </Field>
      <Field label={`Book 볼륨 (권) ${range ? `· 최대 ${maxVol}` : ""}`}>
        <input type="number" style={S.input} value={bookVol} min={1} max={maxVol} disabled={!range}
          onChange={(e) => onVol(Math.max(1, Math.min(maxVol, +e.target.value || 1)))} />
      </Field>
      <Field label="Start Page">
        <select style={S.input} value={pageStart} disabled={!range} onChange={(e) => onPStart(+e.target.value)}>
          <option value={0}>0</option><option value={1}>1 (기본)</option><option value={2}>2</option>
        </select>
      </Field>
      <Field label="Page 볼륨">
        <input type="number" style={S.input} value={pageVol} min={1} disabled={!range}
          onChange={(e) => onPVol(Math.max(1, +e.target.value || 1))} />
      </Field>
    </>
  );
}

// App Key 는 **계정당 1개**이고 그 계정의 **사용처 전체에 공통**이다 `PC-050`.
// 발급 시 **Book Start · Book Volume(권수)** 를 지정한다 — bookEnd = start + volume - 1.
function issueAppKey(acc: CasterAccount, range: SobpRange, bookStart: number, bookVol: number,
                     pageStart: number, pageVol: number, ctype: CodeKind, until: string, by?: string, since = "") {
  const bs = bookStart, be = bookStart + bookVol - 1;
  const key = genKeyStr();
  const periodText = `${since || "즉시"}~${until}`;
  const summary = `계정 ${acc.id} · ${range.pt} S${range.section}/O${range.owner}/B${bs}~${be}(${bookVol}권) · P${pageStart}~${pageStart + pageVol - 1} · 기간 ${periodText}`;
  // 원장 티켓을 먼저 만들어 그 id 를 범위에 연결한다 — [티켓 삭제] 시 함께 제거 `PC-121`
  const t = addTicket({ kind: "APP", companyId: acc.companyId, company: acc.company, accountId: acc.id, by: by ?? "", summary,
    params: {
      "Company Name": acc.company, "Account Id": acc.id,
      "App Key": key,
      "Issued Time": new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, ""),
      "Valid From Time": since ? since.replace(/-/g, "") : "즉시",
      "Valid Until Time": until === "무제한" ? "99999999 (무제한)" : until.replace(/-/g, ""),
      Section: range.section, Owner: range.owner,
      "Ticket Version": 1,
      "Book Start": bs, "Book Volume": bookVol, "Book End": be,
      "Page Start": pageStart, "Page Volume": pageVol, "Page End": pageStart + pageVol - 1,
      "Code Type": ctype,
      "Ticket Type": until === "무제한" ? "Unlimited" : "Period",
    } });
  const rec = caster.addAppKey({ key, accountId: acc.id, services: [], company: acc.company, pt: range.pt,
    section: range.section, owner: range.owner, bookStart: bs, bookEnd: be, bookVol,
    pageStart, pageEnd: pageStart + pageVol - 1, pageVol, since, until,   // 사용기간=티켓 기간 `PC-117`
    ranges: [{ pt: range.pt, section: range.section, owner: range.owner, bookStart: bs, bookEnd: be, bookVol,
               pageStart, pageEnd: pageStart + pageVol - 1, pageVol, since, until, ticketId: t.id }] });   // 범위=티켓 `PC-118`·`PC-121`
  if (!rec) { deleteTicket(t.id); return ""; }          // 이미 발급된 계정 → 티켓 롤백
  logActivity("ticket", `App Key · ${acc.company} · ${summary} · ${key}`, by);
  return key;
}

/* ── TKT-06 계정 등록 ───────────────────────────────────────────── */
export function AccountNewView() {
  const router = useRouter();
  const me = currentUser(useAuth());
  useCaster();
  useTicketCustomers();
  useEffect(() => { hydrateTickets(); }, []);   // App Key 발급분이 Key 발급 목록에 쌓이도록 원장 로드

  const [companyId, setCompanyId] = useState(0);
  const [id, setId] = useState("");
  const [pwd, setPwd] = useState("");
  const [name, setName] = useState("");
  const [addr, setAddr] = useState("");
  const [homepage, setHomepage] = useState("");
  const [tab, setTab] = useState<AccTab>("info");        // 화면 탭 `PC-062`
  const [sobpIdx, setSobpIdx] = useState(-1);
  const [bStart, setBStart] = useState<number | null>(null);
  const [bVol, setBVol] = useState<number | null>(null);
  const [pStart, setPStart] = useState(1);              // 계정별 Page 영역 `PC-059`
  const [ctype, setCtype] = useState<CodeKind>("PDS3"); // Code Type — 직접 고른다 `PC-064`
  const [pVol, setPVol] = useState<number | null>(null);
  const [since, setSince] = useState("");              // 사용기간 시작 — 티켓(발급)별 기간 `PC-117`
  const [until, setUntil] = useState("");
  const [unlimited, setUnlimited] = useState(true);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  // 고객사 = **티켓 고객사**(nkey(HLP) 대장 프로젝트명 + 티켓 화면 등록분) — 고객사 관리와 별개 `PC-123`
  const company = companyId ? ticketCustomerById(companyId) : undefined;
  const ranges = useRanges(company?.name);
  const range = ranges[sobpIdx];

  const onCompany = (cid: number) => {
    setCompanyId(cid); setSobpIdx(-1);
    // 티켓 고객사는 고객사 관리와 별개라 주소·사용 서비스를 끌어오지 않는다 `PC-123` (옛 `PC-076` 자동 체크 폐지)
  };

  // 가입 승인(SSO) 계정은 고객사 관리의 계정 및 서비스 권한에서 추가한다 `PC-133` — 여기서 미리 채우지 않는다

  const submit = () => {
    if (!company) { setToast({ ok: false, text: "고객사를 선택하세요." }); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(id.trim())) { setToast({ ok: false, text: "ID 는 이메일 형식이어야 합니다." }); return; }
    if (!pwd.trim()) { setToast({ ok: false, text: "비밀번호가 필요합니다. (요청 없으면 [임의 생성])" }); return; }
    const wantKey = !!range;   // 범위를 골랐으면 함께 발급한다 `PC-071`

    const acc: CasterAccount = {
      id: id.trim(), pwd: pwd.trim(), name: name.trim(), services: [], settings: {}, scope: "key",   // 인증 서비스·권한 없음 `PC-131`
      companyId: company.id, company: company.name, addr: addr.trim(), homepage: homepage.trim(),
      createdAt: "",
    };
    const r = caster.addAccount(acc);
    if (!r.ok) { setToast({ ok: false, text: r.msg }); return; }
    logActivity("ticket", `계정 등록 · ${company.name} · ${acc.id}`, me?.name);
    if (wantKey && range) issueAppKey(acc, range, keyBS, keyVol, pStart, keyPVol, ctype, unlimited ? "무제한" : (until || "무제한"), me?.name, since);
    router.push("/tickets/account");        // 목록에 노출
  };

  // App Key 발급 — **사용처 전체 공통 · 계정당 1개** `PC-050`
  const keyBS = bStart ?? range?.bookStart ?? 0;
  const keyVol = Math.max(1, Math.min(bVol ?? (range?.bookCount ?? 1), range ? range.bookEnd - keyBS + 1 : 1));
  const keyPVol = Math.max(1, pVol ?? PAGE_DEFAULT);
  // 체크박스 없이 **탭을 열면 바로 입력**한다 — 범위를 고르면 발급, 안 고르면 계정만 등록 `PC-071`
  const appKeyBlock = (
    <div>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>발급 범위 (대장 이력 · SOBP 할당) <span style={{ color: "#9ca3af" }}>(선택하면 Section·Owner·Book·Code Type 이 자동으로 채워집니다 · 선택하지 않으면 계정만 등록합니다)</span></div>
      <SobpRangePicker company={!!company} ranges={ranges} value={sobpIdx} onSelect={(i) => { setSobpIdx(i); setBStart(null); setBVol(null); const r = ranges[i]; if (r) setCtype(CT_OF[r.pt] ?? "PDS3"); }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 12 }}>
        <BookRangeFields range={range} bookStart={keyBS} bookVol={keyVol} pageStart={pStart} pageVol={keyPVol}
                          onStart={setBStart} onVol={setBVol} onPStart={setPStart} onPVol={setPVol} />
      </div>
      {/* 고르는 값 — Code Type · 사용기간(시작~끝) `PC-071` · 기간은 티켓별 `PC-117` */}
      <div style={{ display: "grid", gridTemplateColumns: "0.9fr 1fr 1.4fr", gap: 10, marginTop: 10 }}>
        <Field label="Code Type">
          <select style={S.input} value={ctype} disabled={!range} onChange={(e) => setCtype(e.target.value as CodeKind)}>
            {CODE_KINDS.map((k) => <option key={k.v} value={k.v}>{k.short}</option>)}
          </select>
        </Field>
        <Field label="Valid From Time (사용기간 시작)">
          <input type="date" style={S.input} value={since} disabled={!range} onChange={(e) => setSince(e.target.value)} />
        </Field>
        <Field label="Valid Until Time (사용기간 끝)">
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="date" style={{ ...S.input, opacity: unlimited ? 0.5 : 1 }} value={until} disabled={unlimited || !range} min={since || undefined} onChange={(e) => setUntil(e.target.value)} />
            <label style={{ fontSize: 12.5, color: "#374151", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", cursor: "pointer" }}>
              <input type="checkbox" checked={unlimited} onChange={(e) => setUnlimited(e.target.checked)} /> 무제한
            </label>
          </div>
        </Field>
      </div>
      <FixedKeyFields range={range} unlimited={unlimited || !until} />
      {range && (
        <div style={{ fontSize: 11.5, color: "#6b7280", marginTop: 6 }}>
          발급 범위 <b>{range.pt} S{range.section}/O{range.owner}/B{keyBS}~{keyBS + keyVol - 1}</b> · {keyVol}권 · <b>P{pStart}~{pStart + keyPVol - 1}</b>
          <span style={{ color: "#9ca3af" }}> (할당 B{range.bookStart}~{range.bookEnd})</span>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ padding: "18px 20px", maxWidth: 900 }}>
      <div style={{ ...S.card, padding: 18 }}>
        {/* 제목은 상단에만 — 여기서는 고른 고객사를 크게 `PC-069` */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: company ? "#111827" : "#c7cdd6" }}>
            {company?.name ?? "고객사를 선택하세요"}
          </div>
        </div>

        {/* 탭 2개 — 계정 정보 · App Key 발급 `PC-131` */}
        <AccTabs tab={tab} onTab={setTab} badge={{ key: range ? "발급" : undefined }} />

        {/* 계정 정보 */}
        <div style={{ ...SEC, marginTop: 0, display: tab === "info" ? "block" : "none" }}>
        <SecHead t="계정 정보" d="· 키 발급 계정" tip="고객사 별 계정 개수 제한 없음 · App Key 는 계정당 1개 발급" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="고객사 *">
            <TicketCustomerSelect value={companyId} onChange={onCompany} by={me?.name} />
          </Field>
          <Field label="NAME (담당자명)"><input style={S.input} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="ID (이메일) *"><input style={S.input} value={id} onChange={(e) => setId(e.target.value)} placeholder="user@company.com" /></Field>
          <Field label="PWD (비밀번호) *">
            <div style={{ display: "flex", gap: 6 }}>
              <input style={S.input} value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="비밀번호 미요청 시 임의 생성" />
              <button onClick={() => setPwd(genPwdStr())} style={{ ...S.smallBtn, whiteSpace: "nowrap" }} title="비밀번호를 요청하지 않는 고객사(SDK)는 담당자가 임의 지정">임의 생성</button>
            </div>
          </Field>
          <Field label="ADDR (주소)"><input style={S.input} value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="주소" /></Field>
          <Field label="HOMEPAGE (홈페이지)"><input style={S.input} value={homepage} onChange={(e) => setHomepage(e.target.value)} placeholder="https://" /></Field>
        </div>

        </div>

        {/* App Key 발급 */}
        <div style={{ ...SEC, marginTop: 0, display: tab === "key" ? "block" : "none" }}>
          <SecHead t="App Key 발급" d="· 계정당 1개" tip="고객사 별 계정 개수 제한 없음 · App Key 는 계정당 1개 발급" />
          {appKeyBlock}
        </div>


        {/* 이동·저장 버튼은 화면 아래에 모은다 `PC-064` */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}>
          <Link href="/tickets/account" style={{ ...S.ghost, textDecoration: "none" }}>목록</Link>
          <span style={{ flex: 1 }} />
          <Link href="/tickets/account" style={{ ...S.ghost, textDecoration: "none" }}>취소</Link>
          <button onClick={submit} style={S.primary}>계정 추가</button>
        </div>
        {toast && <div style={{ marginTop: 10, fontSize: 12.5, color: toast.ok ? "#047857" : "#dc2626", textAlign: "right" }}>{toast.text}</div>}
      </div>
    </div>
  );
}

/* ── TKT-06 계정 상세 · 수정 ────────────────────────────────────── */
export function AccountDetailView({ accountId }: { accountId: string }) {
  const router = useRouter();
  const me = currentUser(useAuth());
  const cast = useCaster();
  useEffect(() => { hydrateTickets(); }, []);   // App Key 발급분이 Key 발급 목록에 쌓이도록 원장 로드
  const acc = cast.accounts.find((a) => a.id === accountId);

  const [name, setName] = useState("");
  const [pwd, setPwd] = useState("");
  const [addr, setAddr] = useState("");
  const [homepage, setHomepage] = useState("");
  const [since, setSince] = useState("");                     // 사용기간 시작(범위 발급 시) — 범위별 기간 `PC-118`
  const [loaded, setLoaded] = useState(false);
  const sp = useSearchParams();
  const tab0 = ((sp.get("tab") as AccTab) === "key" ? "key" : "info") as AccTab;            // 목록에서 누른 항목의 탭 `PC-067`
  const [tab, setTab] = useState<AccTab>(tab0);                // 화면 탭 `PC-062`
  const [sobpIdx, setSobpIdx] = useState(-1);
  const [bStart, setBStart] = useState<number | null>(null);   // App Key Book Start `PC-050`
  const [bVol, setBVol] = useState<number | null>(null);       // App Key Book Volume(권수)
  const [pStart, setPStart] = useState(1);                     // 계정별 Page 영역 `PC-059`
  const [ctype, setCtype] = useState<CodeKind>("PDS3");        // Code Type `PC-064`
  const [pVol, setPVol] = useState<number | null>(null);
  const [until, setUntil] = useState("");
  const [unlimited, setUnlimited] = useState(true);
  const [issued, setIssued] = useState<string | null>(null);
  const [selRange, setSelRange] = useState<{ keyId: number; idx: number } | null>(null);   // 발급 내역 선택 → 아래 Key 정보 `PC-120`
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  // 계정 값 주입 (최초 1회 — 편집 중 스토어 변경에 덮이지 않도록)
  useEffect(() => {
    if (!acc || loaded) return;
    setName(acc.name); setPwd(acc.pwd); setAddr(acc.addr); setHomepage(acc.homepage);
    setLoaded(true);
  }, [acc, loaded]);

  const ranges = useRanges(acc?.company);
  const range = ranges[sobpIdx];
  const keys = cast.appKeys.filter((k) => k.accountId === accountId);
  // App Key 는 **계정당 1개**이고 **사용처 전체에 공통**이다 `PC-050`
  const myKey = keys[0];
  // 발급 내역 항목(=키의 각 코드 범위/티켓) — 선택하면 아래 Key 정보에 표시 `PC-120`
  const rangeItems = keys.flatMap((k) => keyRanges(k).map((r, i) => ({ k, r, i })));
  const selected = (selRange && rangeItems.find((x) => x.k.id === selRange.keyId && x.i === selRange.idx)) || rangeItems[0] || null;
  // 티켓 원장 변경(범위 발급 등) 시 재렌더 — Key 정보는 선택한 범위에서 만든다 `PC-120`
  useTickets();


  if (!acc) {
    return (
      <div style={{ padding: "18px 20px", maxWidth: 900 }}>
        <div style={{ ...S.card, padding: 24, fontSize: 13, color: "#6b7280" }}>
          계정을 찾을 수 없습니다. <Link href="/tickets/account" style={{ color: "#2563eb" }}>계정 목록으로</Link>
        </div>
      </div>
    );
  }

  const save = () => {
    // 대장 계정은 비밀번호를 저장하지 않았으므로 비워 둘 수 있다 `PC-103`
    if (!pwd.trim() && !acc.seeded) { setToast({ ok: false, text: "비밀번호가 필요합니다. (요청 없으면 [임의 생성])" }); return; }

    const r = caster.updateAccount(acc.id, {
      name: name.trim(), pwd: pwd.trim(), addr: addr.trim(), homepage: homepage.trim(),
    });
    if (!r.ok) { setToast({ ok: false, text: r.msg }); return; }
    logActivity("ticket", `계정 수정 · ${acc.company} · ${acc.id}`, me?.name);
    setToast({ ok: true, text: "계정 정보가 저장되었습니다." });
  };

  const keyBS = bStart ?? range?.bookStart ?? 0;
  const keyVol = Math.max(1, Math.min(bVol ?? (range?.bookCount ?? 1), range ? range.bookEnd - keyBS + 1 : 1));
  const keyPVol = Math.max(1, pVol ?? PAGE_DEFAULT);
  const untilVal = () => (unlimited ? "무제한" : (until || "무제한"));
  const resetIssueForm = () => { setSobpIdx(-1); setBStart(null); setBVol(null); setSince(""); setUntil(""); setUnlimited(true); };
  // 발급된 키에 코드 범위(=티켓)를 하나 더 발급 — **범위마다 사용기간을 함께 지정** `PC-118`
  //   범위 발급 = 티켓 발급이므로 **원장(Key 발급 목록)에도 티켓 1건을 남긴다** `PC-119`
  const addRange = () => {
    if (!range || !myKey) return;
    const untilStr = untilVal();
    const r: KeyRange = { pt: range.pt, section: range.section, owner: range.owner, bookStart: keyBS, bookEnd: keyBS + keyVol - 1, bookVol: keyVol,
      pageStart: pStart, pageEnd: pStart + keyPVol - 1, pageVol: keyPVol, since, until: untilStr };
    // 원장 티켓을 먼저 만들어 그 id 를 범위에 연결한다 `PC-119`·`PC-121`
    const t = addTicket({ kind: "APP", companyId: acc.companyId, company: acc.company, accountId: acc.id, by: me?.name ?? "",
      summary: `계정 ${acc.id} · ${rangeText(r)} · 기간 ${since || "즉시"}~${untilStr}`,
      params: {
        "Company Name": acc.company, "Account Id": acc.id,
        "App Key": myKey.key || "미기재",
        "Issued Time": new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, ""),
        "Valid From Time": since ? since.replace(/-/g, "") : "즉시",
        "Valid Until Time": untilStr === "무제한" ? "99999999 (무제한)" : untilStr.replace(/-/g, ""),
        Section: r.section, Owner: r.owner, "Ticket Version": 1,
        "Book Start": r.bookStart ?? 0, "Book Volume": r.bookVol ?? 0, "Book End": r.bookEnd ?? 0,
        "Page Start": r.pageStart ?? 0, "Page Volume": r.pageVol ?? 0, "Page End": r.pageEnd ?? 0,
        "Code Type": ctype,
        "Ticket Type": untilStr === "무제한" ? "Unlimited" : "Period",
      } });
    caster.addKeyRange(myKey.id, { ...r, ticketId: t.id });
    logActivity("ticket", `App Key 티켓 발급 · ${acc?.company} · ${acc?.id} · ${rangeText(r)} · 기간 ${since || "즉시"}~${untilStr}`, me?.name);
    resetIssueForm();
    setToast({ ok: true, text: `티켓 발급 — ${rangeText(r)} · ${since || "즉시"}~${untilStr}` });
  };
  // 티켓 삭제 — 이 코드 범위(=티켓)와 연결된 원장 티켓을 함께 제거 `PC-121`.
  //   마지막 티켓이면 App Key 도 함께 삭제(빈 키 방지). [키 삭제]와 구분된다.
  const delTicket = (k: typeof keys[number], i: number) => {
    const rs = keyRanges(k);
    const r = rs[i];
    if (!r) return;
    const last = rs.length <= 1;
    if (last && !confirm(`마지막 티켓입니다. 삭제하면 이 App Key 도 함께 삭제됩니다.\n${rangeText(r)}\n진행할까요?`)) return;
    if (r.ticketId) deleteTicket(r.ticketId);          // 원장 티켓 제거
    if (last) caster.removeAppKey(k.id); else caster.removeKeyRange(k.id, i);
    setSelRange(null);
    logActivity("ticket", `App Key 티켓 삭제 · ${acc.company} · ${acc.id} · ${rangeText(r)}`, me?.name);
    setToast({ ok: true, text: `티켓 삭제 — ${rangeText(r)}` });
  };
  const addKey = () => {
    if (!range) { setToast({ ok: false, text: "발급 범위를 선택하세요." }); return; }
    if (myKey) { setToast({ ok: false, text: "App Key 는 계정당 1개입니다. 아래에서 코드 범위를 더 발급하세요." }); return; }
    const key = issueAppKey(acc, range, keyBS, keyVol, pStart, keyPVol, ctype, untilVal(), me?.name, since);
    setIssued(key);
    setToast({ ok: true, text: "App Key 발급 완료 — 계정과 연동되어 서비스 DB에 등록되었습니다." });
  };

  // 발급·재발급 공용 — Code Type · 사용기간(시작~끝). 기간은 티켓별로 유지된다 `PC-117`
  const periodFields = (
    <div style={{ display: "grid", gridTemplateColumns: "0.9fr 1fr 1.4fr", gap: 10, marginTop: 10 }}>
      <Field label="Code Type">
        <select style={S.input} value={ctype} disabled={!range} onChange={(e) => setCtype(e.target.value as CodeKind)}>
          {CODE_KINDS.map((k) => <option key={k.v} value={k.v}>{k.short}</option>)}
        </select>
      </Field>
      <Field label="Valid From Time (사용기간 시작)">
        <input type="date" style={S.input} value={since} disabled={!range} onChange={(e) => setSince(e.target.value)} />
      </Field>
      <Field label="Valid Until Time (사용기간 끝)">
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="date" style={{ ...S.input, opacity: unlimited ? 0.5 : 1 }} value={until} disabled={unlimited || !range} min={since || undefined} onChange={(e) => setUntil(e.target.value)} />
          <label style={{ fontSize: 12.5, color: "#374151", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", cursor: "pointer" }}>
            <input type="checkbox" checked={unlimited} onChange={(e) => setUnlimited(e.target.checked)} /> 무제한
          </label>
        </div>
      </Field>
    </div>
  );

  // 발급 완료 안내(신규·재발급 공용)
  const issuedCard = issued && (
    <div style={{ marginTop: 12, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ fontSize: 12, color: "#92400e", fontWeight: 700, marginBottom: 6 }}>발급 완료 — App Key (서비스 DB 등록됨)</div>
      <div style={{ fontSize: 12.5, color: "#111827", lineHeight: 1.9 }}>
        <div>계정 ID: <code style={{ fontFamily: "ui-monospace,monospace" }}>{acc.id}</code></div>
        <div>PWD: <code style={{ fontFamily: "ui-monospace,monospace" }}>{pwd}</code></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          App Key: <code style={{ flex: 1, fontFamily: "ui-monospace,monospace", wordBreak: "break-all" }}>{issued}</code>
          <button onClick={() => { try { navigator.clipboard.writeText(`ID: ${acc.id}\nPWD: ${pwd}\nAppKey: ${issued}`); setToast({ ok: true, text: "계정·키 정보가 복사되었습니다." }); } catch { /* */ } }} style={S.smallBtn}>전체 복사</button>
        </div>
      </div>
    </div>
  );

  // App Key 발급 — CasterN 전용 조건이라 ② 의 CasterN 탭 안에서만 노출한다.
  const appKeyBlock = (
    <>
      {myKey ? (
        <>
          {/* 현재 App Key — 사용기간은 아래 각 범위(=티켓)마다 지정한다 `PC-118` */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12,
            border: "1px solid #eef0f4", background: "#fafbfc", borderRadius: 9, padding: "10px 12px", fontSize: 12.5 }}>
            {myKey.key
              ? <code style={{ fontFamily: "ui-monospace,monospace", color: "#2563eb", wordBreak: "break-all" }}>{myKey.key}</code>
              : <span style={{ ...S.tag, background: "#fef3c7", color: "#92400e", fontWeight: 700 }}>키 미기재</span>}
            <span style={{ ...S.tag, background: "#eef6ff", color: "#2563eb", fontWeight: 700 }}>코드 범위 {keyRanges(myKey).length}개</span>
            <span style={{ color: "#9ca3af", fontSize: 11.5 }}>· 사용기간은 범위마다 지정</span>
          </div>

          {/* 코드 범위 발급 — 범위마다 사용기간을 함께 지정 `PC-118` */}
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>발급 범위 (대장 이력 · SOBP 할당) * <span style={{ color: "#9ca3af" }}>(선택하면 Section·Owner·Book·Code Type 이 자동으로 채워집니다 · 사용기간을 함께 지정합니다)</span></div>
          <SobpRangePicker company ranges={ranges} value={sobpIdx} onSelect={(i) => { setSobpIdx(i); setBStart(null); setBVol(null); const r = ranges[i]; if (r) setCtype(CT_OF[r.pt] ?? "PDS3"); }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 12 }}>
            <BookRangeFields range={range} bookStart={keyBS} bookVol={keyVol} pageStart={pStart} pageVol={keyPVol}
                              onStart={setBStart} onVol={setBVol} onPStart={setPStart} onPVol={setPVol} />
          </div>
          {periodFields}
          <FixedKeyFields range={range} unlimited={unlimited || !until} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
            {range && (
              <span style={{ fontSize: 11.5, color: "#6b7280" }}>
                발급 범위 <b>{range.pt} S{range.section}/O{range.owner}/B{keyBS}~{keyBS + keyVol - 1}</b> · {keyVol}권 · <b>P{pStart}~{pStart + keyPVol - 1}</b> · 기간 {since || "즉시"}~{untilVal()}
              </span>
            )}
            <span style={{ flex: 1 }} />
            <button onClick={addRange} disabled={!range} style={{ ...S.primary, ...(!range ? { opacity: 0.5, cursor: "not-allowed" } : {}) }}>코드 범위 발급</button>
          </div>
          {issuedCard}
        </>
      ) : (
        <>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>발급 범위 (대장 이력 · SOBP 할당) * <span style={{ color: "#9ca3af" }}>(선택하면 Section·Owner·Book·Code Type 이 자동으로 채워집니다)</span></div>
          <SobpRangePicker company ranges={ranges} value={sobpIdx} onSelect={(i) => { setSobpIdx(i); setBStart(null); setBVol(null); const r = ranges[i]; if (r) setCtype(CT_OF[r.pt] ?? "PDS3"); }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 12 }}>
            <BookRangeFields range={range} bookStart={keyBS} bookVol={keyVol} pageStart={pStart} pageVol={keyPVol}
                              onStart={setBStart} onVol={setBVol} onPStart={setPStart} onPVol={setPVol} />
          </div>
          {periodFields}
          <FixedKeyFields range={range} unlimited={unlimited || !until} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
            {range && (
              <span style={{ fontSize: 11.5, color: "#6b7280" }}>
                발급 범위 <b>{range.pt} S{range.section}/O{range.owner}/B{keyBS}~{keyBS + keyVol - 1}</b> · {keyVol}권 · <b>P{pStart}~{pStart + keyPVol - 1}</b> · 기간 {since || "즉시"}~{untilVal()}
                <span style={{ color: "#9ca3af" }}> (할당 B{range.bookStart}~{range.bookEnd})</span>
              </span>
            )}
            <span style={{ flex: 1 }} />
            <button onClick={addKey} disabled={!range} style={{ ...S.primary, ...(!range ? { opacity: 0.5, cursor: "not-allowed" } : {}) }}>App Key 발급</button>
          </div>
          {issuedCard}
        </>
      )}
    </>
  );

  return (
    <div style={{ padding: "18px 20px", maxWidth: 900 }}>
      <div style={{ ...S.card, padding: 18 }}>
        {/* 제목은 상단(브레드크럼)에만 두고, 여기서는 **고객사명을 크게** 보여 준다 `PC-069` */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>{acc.company}</div>
          <code style={{ fontFamily: "ui-monospace,monospace", color: "#374151", fontSize: 12.5 }}>{acc.id}</code>
        </div>

        {/* 탭 3개 `PC-062` */}
        <AccTabs tab={tab} onTab={setTab} badge={{ key: keys.length ? "1" : undefined }} />

        {/* 계정 정보 */}
        <div style={{ ...SEC, marginTop: 0, display: tab === "info" ? "block" : "none" }}>
        <SecHead t="계정 정보" d="· ID(email) · 고객사는 변경할 수 없습니다" tip="고객사 별 계정 개수 제한 없음 · App Key 는 계정당 1개 발급" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="고객사"><div style={{ ...S.input, background: "#f7f8fa", color: "#6b7280" }}>{acc.company}</div></Field>
          <Field label="NAME (담당자명)"><input style={S.input} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="ID (이메일)"><div style={{ ...S.input, background: "#f7f8fa", color: "#6b7280", fontFamily: "ui-monospace,monospace" }}>{acc.id}</div></Field>
          <Field label={acc.seeded ? "PWD (비밀번호)" : "PWD (비밀번호) *"}>
            <div style={{ display: "flex", gap: 6 }}>
              {/* 대장 계정 — 비밀번호는 저장소에 두지 않았다 `PC-103` */}
              <input style={S.input} value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder={acc.seeded ? "대장 참조 (저장소에 두지 않음)" : ""} />
              <button onClick={() => setPwd(genPwdStr())} style={{ ...S.smallBtn, whiteSpace: "nowrap" }}>임의 생성</button>
            </div>
          </Field>
          <Field label="ADDR (주소)"><input style={S.input} value={addr} onChange={(e) => setAddr(e.target.value)} /></Field>
          <Field label="HOMEPAGE (홈페이지)"><input style={S.input} value={homepage} onChange={(e) => setHomepage(e.target.value)} placeholder="https://" /></Field>
        </div>
        {/* 사용기간은 계정이 아니라 **코드 범위(=티켓)별 기간**이다 `PC-118` → [App Key 발급] 탭에서 범위 발급 시 설정 */}
        <div style={{ marginTop: 10, fontSize: 11.5, color: "#6b7280", background: "#fafbfc", border: "1px solid #eef0f4", borderRadius: 9, padding: "8px 11px" }}>
          사용기간(시작·끝)은 계정 속성이 아니라 <b>코드 범위(=티켓)마다 유지되는 기간</b>입니다. <b>[App Key 발급]</b> 탭에서 <b>코드 범위를 발급할 때</b> 함께 지정합니다.
        </div>
        {acc.note && (
          <div style={{ marginTop: 10, fontSize: 11.5, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 9, padding: "8px 11px", whiteSpace: "pre-line", lineHeight: 1.7 }}>{acc.note}</div>
        )}

        </div>

        {/* App Key 발급 */}
        <div style={{ ...SEC, marginTop: 0, display: tab === "key" ? "block" : "none" }}>
          <SecHead t="App Key 발급" d={`· 계정당 1개 · 발급된 키 ${keys.length}개`} tip={myKey ? "이 계정에는 이미 App Key 가 발급돼 있습니다 — 계정당 1개입니다. 코드 범위(=티켓)를 더 발급할 수 있고, **사용기간은 범위마다 함께 지정**합니다(PC-118). 키 자체를 바꾸려면 발급 내역에서 삭제한 뒤 다시 발급하세요." : "고객사 별 계정 개수 제한 없음 · App Key 는 계정당 1개 발급"} />
          {appKeyBlock}
        </div>



        {/* 이 계정의 Key 정보 — 계정 : 키 = 1:1 매핑 `PC-059` */}
        <div style={{ ...SEC, marginTop: 0, display: tab === "key" ? "block" : "none" }}>
          {/* 발급 내역을 먼저 보고, 그 아래에서 Key 정보를 확인한다 `PC-070` */}
          <SecHead t="App Key 발급 내역" d={`· 발급된 키 ${keys.length}개`} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
            {keys.length === 0 ? (
              <div style={{ fontSize: 12, color: "#9ca3af", padding: "6px 0" }}>
                발급된 App Key가 없습니다.
              </div>
            ) : keys.map((k) => {
              const rs = keyRanges(k);                           // 코드 범위 여러 개 `PC-103`
              return (
              <div key={k.id} style={{ border: "1px solid #eef0f4", background: "#fff", borderRadius: 9, padding: "8px 10px", fontSize: 11.5, color: "#6b7280" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {k.key
                    ? <code style={{ fontFamily: "ui-monospace,monospace" }}>{k.key}</code>
                    : <span style={{ ...S.tag, background: "#fef3c7", color: "#92400e", fontWeight: 700 }} title="대장에 App Key 값이 적혀 있지 않습니다">키 미기재</span>}
                  <span title="사용기간은 각 코드 범위(=티켓)마다 지정됩니다 `PC-118`">코드 범위 {rs.length}개</span>
                  <span style={{ flex: 1 }} />
                  <span style={{ fontFamily: "ui-monospace,monospace" }}>{k.createdAt}</span>
                  {/* 키 삭제 — 키 전체 제거(지금처럼). 버튼 스타일 `PC-121` */}
                  <button onClick={() => caster.removeAppKey(k.id)}
                    style={{ ...S.ghost, padding: "4px 12px", fontSize: 11.5, fontWeight: 600, color: "#dc2626", borderColor: "#fecaca", background: "#fff" }}>키 삭제</button>
                </div>
                {/* 코드 범위 목록 — 한 키에 여러 범위 `PC-103` */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
                  {rs.map((r, i) => {
                    // 발급 내역 항목 선택 → 아래 Key 정보에 표시 `PC-120`
                    const isSel = !!selected && selected.k.id === k.id && selected.i === i;
                    return (
                    <div key={i} onClick={() => setSelRange({ keyId: k.id, idx: i })}
                      title="선택하면 아래 [Key 정보]에 이 발급 내역이 표시됩니다"
                      style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", cursor: "pointer",
                        border: `1px solid ${isSel ? "#93c5fd" : "transparent"}`, background: isSel ? "#f0f7ff" : "transparent",
                        borderRadius: 8, padding: "4px 6px" }}>
                      <span style={{ color: isSel ? "#2563eb" : "#d1d5db", fontWeight: 700, fontSize: 11 }}>{isSel ? "▸" : "·"}</span>
                      <span style={{ ...S.tag, background: r.pt === "PDS3" ? "#eef6ff" : r.pt === "PDS2" ? "#fef3c7" : "#f3e8ff", color: r.pt === "PDS3" ? "#2563eb" : r.pt === "PDS2" ? "#92400e" : "#7e22ce", fontFamily: "ui-monospace,monospace" }}>{rangeText(r)}</span>
                      <span>{rangeBooks(r) != null ? `${rangeBooks(r)!.toLocaleString()}권` : "권수 —"}</span>
                      {/* 범위(=티켓)별 사용기간 `PC-118` */}
                      {(() => { const p = rangePeriod(k, r); return <span style={{ ...S.tag, background: "#eef6ff", color: "#2563eb", fontWeight: 700 }} title="이 코드 범위의 사용기간">{p.since || "즉시"} ~ {p.until}</span>; })()}
                      {r.note && <span style={{ color: "#9ca3af" }}>{r.note}</span>}
                      <span style={{ flex: 1 }} />
                      {/* 티켓(=발급 범위)마다 삭제 — 원장 티켓도 함께 제거 `PC-121` */}
                      <button onClick={(e) => { e.stopPropagation(); delTicket(k, i); }}
                        style={{ ...S.ghost, padding: "3px 10px", fontSize: 11, color: "#dc2626", borderColor: "#fecaca", background: "#fff" }}>티켓 삭제</button>
                    </div>
                    );
                  })}
                </div>
              </div>
              );
            })}
          </div>

          {/* 발급 내역에서 선택한 항목(범위=티켓)의 Key 정보 `PC-120` */}
          <SecHead t="Key 정보" d={selected ? `· 선택한 발급 내역 (${rangeText(selected.r)})` : "· 발급 내역에서 항목을 선택하세요"} />
          {/* N Key 는 이 화면에서 발급하지 않는다 — [N Key 관리] 메뉴에서 다룬다 `PC-068` */}
          {(() => {
            const params = selected ? (() => {
              const { k, r } = selected;
              const p = rangePeriod(k, r);
              return {
                "Company Name": acc.company, "Account Id": acc.id,
                "App Key": k.key || "미기재",
                "Code Type": r.pt,
                Section: r.section, Owner: r.owner,
                "Book Start": r.bookStart ?? "-", "Book Volume": rangeBooks(r) ?? "-", "Book End": r.bookEnd ?? "-",
                "Page Start": r.pageStart ?? "-", "Page Volume": r.pageVol ?? "-", "Page End": r.pageEnd ?? "-",
                "Valid From Time": p.since ? p.since.replace(/-/g, "") : "즉시",
                "Valid Until Time": p.until === "무제한" ? "99999999 (무제한)" : (p.until || "").replace(/-/g, ""),
                "Ticket Type": p.until === "무제한" ? "Unlimited" : "Period",
              } as Record<string, string | number>;
            })() : undefined;
            return <KeyCard title="App Key" empty="위에서 App Key 를 발급하세요." params={params} />;
          })()}
        </div>

        {/* 이동·저장 버튼은 화면 맨 아래에 모은다 `PC-069` */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}>
          <Link href="/tickets/account" style={{ ...S.ghost, textDecoration: "none" }}>목록</Link>
          <span style={{ flex: 1 }} />
          <button onClick={() => { if (confirm("이 계정과 연동 App Key를 삭제할까요?")) { caster.removeAccount(acc.id); router.push("/tickets/account"); } }}
            style={{ ...S.ghost, color: "#dc2626", borderColor: "#fecaca" }}>계정 삭제</button>
          <button onClick={save} style={S.primary}>저장</button>
        </div>
        {toast && <div style={{ marginTop: 10, fontSize: 12.5, color: toast.ok ? "#047857" : "#dc2626", textAlign: "right" }}>{toast.text}</div>}
      </div>
    </div>
  );
}
