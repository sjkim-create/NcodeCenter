"use client";

// App Key 관리(TKT-01) 오른쪽 칸 — 계정 추가 · 계정 상세 `PC-158`
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
import { addTicket, deleteTicket, hydrateTickets, setBilling, ticketById, updateTicket, useTickets } from "@/lib/ticketStore";
import { BillingEditor, BillTag } from "./BillingEditor";
import { sobpOverlapMsg } from "@/lib/rangeGuard";
import { SobpRangePicker, type SobpRange } from "./TicketsView";
import { SobpUsage } from "./SobpUsage";
import { SobpChips } from "./sobp";
import { useTicketCustomers } from "@/lib/ticketCustomerStore";
import { appKeyRangesOfCompany, companyOfAccount } from "@/lib/keyCompany";
import type { Company } from "@/lib/customerData";
import { CODE_KINDS, patternOf, type CodeKind } from "@/lib/codeKind";
import {
  caster, useCaster, genAppKey,
  keyRanges, rangeText, rangeBooks, rangePeriod, type KeyRange,
  type CasterAccount,
} from "@/lib/accountStore";

const PAGE_DEFAULT = 512;   // Page 볼륨 기본값 — N Key 발급과 같은 값 `PC-059`
// 범위의 pt → 코드 종류 `PC-064`
const CT_OF: Record<string, CodeKind> = { PDS3: "PDS3", PDS2: "PDS2", Scode: "PDS4", OID: "OID" };

/* 옛 계정 목록은 App Key 관리 3단 화면(AppKeyWorkspace)으로 옮겼다 `PC-146` */

/* ── 공용 조각 ─────────────────────────────────────────────────── */
// Key 정보 카드 — N Key 발급 상세(`TKT-02`)의 Key 정보 항목을 계정 기준으로 보여 준다 `PC-059`
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
// 정산 — N Key 관리처럼 **별도 탭** `PC-178`. 계정 추가 화면에는 발급된 티켓이 없어 두지 않는다
// 발급 내역 — 지금까지 발급한 티켓을 **첫 탭의 표**로 본다(발급 폼과 분리) `PC-200`
export type AccTab = "hist" | "info" | "key" | "bill";
const ACC_TABS: { v: AccTab; label: string }[] = [
  { v: "info", label: "계정 정보" },
  { v: "key", label: "App Key 발급" },
];
const ACC_TABS_DETAIL: { v: AccTab; label: string }[] = [
  { v: "hist", label: "발급 내역" },
  { v: "key", label: "App Key 발급" },
  { v: "bill", label: "정산" },
  { v: "info", label: "계정 정보" },
];
function AccTabs({ tab, onTab, badge, items = ACC_TABS }: { tab: AccTab; onTab: (v: AccTab) => void; badge?: Partial<Record<AccTab, string>>; items?: { v: AccTab; label: string }[] }) {
  return (
    <div style={{ display: "flex", borderBottom: "1px solid #eef0f4", marginBottom: 14 }}>
      {items.map(({ v, label }) => {
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

// 영역 제목 — 번호를 붙이지 않는다. N Key 발급 상세(`TKT-02`)와 같은 결 `PC-052`
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

// App Key 발급 범위 — 고객사 관리 고객사 기준: Caster 대장 이력 + 그 고객사의 SOBP 할당 `PC-153`
function useRanges(co?: Company): SobpRange[] {
  useTicketCustomers();
  const { projects } = useStore();
  return appKeyRangesOfCompany(co, projects);
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
  // 라벨·조작 방식은 N Key 발급(`TKT-02`)과 같게 맞춘다 `PC-051`
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
  // 원장 티켓을 먼저 만들어 그 id 를 범위에 연결한다 — [티켓 수정] 시 함께 고친다 `PC-192`
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

/* ── TKT-01 계정 추가 ───────────────────────────────────────────── */
// embedded — App Key 관리 3단 화면의 오른쪽 칸으로 쓴다 `PC-146`. 고객사는 왼쪽에서 고른 값으로 고정
export function AccountNewView({ embedded = false, fixedCompanyId = 0, onDone, onCancel }: {
  embedded?: boolean; fixedCompanyId?: number; onDone?: (accountId: string) => void; onCancel?: () => void;
} = {}) {
  const router = useRouter();
  const me = currentUser(useAuth());
  useCaster();
  useTicketCustomers();
  useEffect(() => { hydrateTickets(); }, []);   // App Key 발급분이 Key 발급 목록에 쌓이도록 원장 로드

  const [companyId, setCompanyId] = useState(fixedCompanyId);
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

  // 고객사 = **고객사 관리 고객사** `PC-153` — 계정은 이 화면의 App Key 계정(서비스 계정과 별개)
  const { companies } = useStore();
  const company = companyId ? companies.find((c) => c.id === companyId) : undefined;
  const ranges = useRanges(company);
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
    // N Key · App Key · 서비스 티켓은 SOBP 가 겹칠 수 없다 `PC-174` — 계정을 만들기 전에 막는다
    if (wantKey && range) {
      const clash = sobpOverlapMsg({ section: range.section, owner: range.owner, bookStart: keyBS, bookEnd: keyBS + keyVol - 1, pageStart: pStart, pageEnd: pStart + keyPVol - 1 });
      if (clash) { setToast({ ok: false, text: clash }); return; }
    }

    const acc: CasterAccount = {
      id: id.trim(), pwd: pwd.trim(), name: name.trim(), services: [], settings: {}, scope: "key",   // 인증 서비스·권한 없음 `PC-131`
      companyId: company.id, company: company.name, coRef: company.id, addr: addr.trim(), homepage: homepage.trim(),
      createdAt: "",
    };
    const r = caster.addAccount(acc);
    if (!r.ok) { setToast({ ok: false, text: r.msg }); return; }
    logActivity("ticket", `계정 등록 · ${company.name} · ${acc.id}`, me?.name);
    if (wantKey && range) issueAppKey(acc, range, keyBS, keyVol, pStart, keyPVol, ctype, unlimited ? "무제한" : (until || "무제한"), me?.name, since);
    if (onDone) { onDone(acc.id); return; }  // 3단 화면 — 오른쪽 칸에서 바로 그 계정 상세로 `PC-146`
    router.push("/tickets/account");        // 목록에 노출
  };

  // App Key 발급 — **사용처 전체 공통 · 계정당 1개** `PC-050`
  const keyBS = bStart ?? range?.bookStart ?? 0;
  const keyVol = Math.max(1, Math.min(bVol ?? (range?.bookCount ?? 1), range ? range.bookEnd - keyBS + 1 : 1));
  const keyPVol = Math.max(1, pVol ?? PAGE_DEFAULT);
  // 체크박스 없이 **탭을 열면 바로 입력**한다 — 범위를 고르면 발급, 안 고르면 계정만 등록 `PC-071`
  const appKeyBlock = (
    <div>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>발급 범위 (Caster 대장 이력 · SOBP 할당) <span style={{ color: "#9ca3af" }}>(선택하면 Section·Owner·Book·Code Type 이 자동으로 채워집니다 · 선택하지 않으면 계정만 등록합니다)</span></div>
      <SobpRangePicker company={!!company} ranges={ranges} value={sobpIdx} onSelect={(i) => { setSobpIdx(i); setBStart(null); setBVol(null); const r = ranges[i]; if (r) setCtype(CT_OF[r.pt] ?? "PDS3"); }} />
      {/* 구간 사용 현황 — 발급된 구간 · 빈 Book · 입력 구간 사용 가능 여부 `PC-195` */}
      {range && <SobpUsage range={range} onPickBook={(b) => setBStart(b)}
        cand={{ section: range.section, owner: range.owner, bookStart: keyBS, bookEnd: keyBS + keyVol - 1, pageStart: pStart, pageEnd: pStart + keyPVol - 1 }} />}
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
    <div style={embedded ? undefined : { padding: "18px 20px", maxWidth: 900 }}>
      <div style={{ ...S.card, padding: 18 }}>
        {/* 제목은 상단에만 — 여기서는 고른 고객사를 크게 `PC-069` */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
          {embedded && <><b style={{ fontSize: 15 }}>새 계정 추가</b><span style={{ ...S.tag, background: "#dbeafe", color: "#1d4ed8", fontWeight: 700 }}>작성 중</span></>}
          <div style={{ fontSize: embedded ? 13 : 20, fontWeight: embedded ? 400 : 800, color: company ? (embedded ? "#6b7280" : "#111827") : "#c7cdd6" }}>
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
            {embedded && fixedCompanyId
              ? <div style={{ ...S.input, background: "#f7f8fa", color: "#6b7280" }}>{company?.name}</div>
              : (
                <select style={S.input} value={companyId} onChange={(e) => onCompany(Number(e.target.value))}>
                  <option value={0}>- 고객사 관리 고객사 선택 -</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
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
          {!embedded && <Link href="/tickets/account" style={{ ...S.ghost, textDecoration: "none" }}>목록</Link>}
          <span style={{ flex: 1 }} />
          {embedded
            ? <button onClick={onCancel} style={S.ghost}>취소</button>
            : <Link href="/tickets/account" style={{ ...S.ghost, textDecoration: "none" }}>취소</Link>}
          <button onClick={submit} style={S.primary}>계정 추가</button>
        </div>
        {toast && <div style={{ marginTop: 10, fontSize: 12.5, color: toast.ok ? "#047857" : "#dc2626", textAlign: "right" }}>{toast.text}</div>}
      </div>
    </div>
  );
}

/* ── TKT-01 계정 상세 · 수정 ────────────────────────────────────── */
// embedded — App Key 관리 3단 화면의 오른쪽 칸 `PC-146`
export function AccountDetailView({ accountId, embedded = false, onDeleted }: { accountId: string; embedded?: boolean; onDeleted?: () => void }) {
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
  const tabQ = sp.get("tab") as AccTab;
  // 목록에서 누른 항목의 탭 `PC-067` · 없으면 발급 내역(발급분이 없으면 App Key 발급) `PC-200`
  const hasKey = cast.appKeys.some((k) => k.accountId === accountId);
  const tab0: AccTab = tabQ === "key" || tabQ === "bill" || tabQ === "info" || tabQ === "hist" ? tabQ : hasKey ? "hist" : "key";
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
  const [openKey, setOpenKey] = useState(false);   // 발급 내역 표 — 고른 줄 아래 Key 정보 펼침 `PC-200`
  // 티켓 수정 중 — 위의 발급 폼을 그 티켓 값으로 채워 고친다 `PC-192` `PC-193`
  const [editRange, setEditRange] = useState<{ keyId: number; idx: number; bound: SobpRange } | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  // 계정 값 주입 (최초 1회 — 편집 중 스토어 변경에 덮이지 않도록)
  useEffect(() => {
    if (!acc || loaded) return;
    setName(acc.name); setPwd(acc.pwd); setAddr(acc.addr); setHomepage(acc.homepage);
    setLoaded(true);
  }, [acc, loaded]);

  const { companies } = useStore();
  const ranges = useRanges(acc ? companyOfAccount(acc, companies) : undefined);   // 고객사 관리 고객사로 잇는다 `PC-153`
  const formRanges = editRange ? [editRange.bound] : ranges;   // 수정 중이면 그 티켓의 테두리 하나
  const range = formRanges[sobpIdx];
  const keys = cast.appKeys.filter((k) => k.accountId === accountId);
  // App Key 는 **계정당 1개**이고 **사용처 전체에 공통**이다 `PC-050`
  const myKey = keys[0];
  // 발급 내역 항목(=키의 각 코드 범위/티켓) — 선택하면 아래 Key 정보에 표시 `PC-120`
  const rangeItems = keys.flatMap((k) => keyRanges(k).map((r, i) => ({ k, r, i })));
  const selected = (selRange && rangeItems.find((x) => x.k.id === selRange.keyId && x.i === selRange.idx)) || rangeItems[0] || null;
  const nTodo = rangeItems.filter((x) => (x.r.billing ?? "미정") === "미정").length;   // 정산 미등록 티켓 수 `PC-178`
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
    const clash = sobpOverlapMsg({ section: range.section, owner: range.owner, bookStart: keyBS, bookEnd: keyBS + keyVol - 1, pageStart: pStart, pageEnd: pStart + keyPVol - 1 });
    if (clash) { setToast({ ok: false, text: clash }); return; }   // SOBP 무겹침 `PC-174`
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
  // [티켓 수정] — 위 발급 폼에 그 티켓 값을 채운다. 테두리 = 같은 S/O 의 할당 범위 ∪ 지금 쓰는 구간
  const startEdit = (k: typeof keys[number], i: number) => {
    const r = keyRanges(k)[i]; if (!r) return;
    const bs0 = r.bookStart ?? 0, be0 = r.bookEnd ?? (r.bookVol ? bs0 + r.bookVol - 1 : bs0);
    const ps0 = r.pageStart ?? 0, pe0 = r.pageEnd ?? ps0 + (r.pageVol ?? 512) - 1;
    const own = ranges.find((x) => x.section === r.section && x.owner === r.owner && bs0 >= x.bookStart && bs0 <= x.bookEnd);
    const lo = Math.min(own?.bookStart ?? bs0, bs0), hi = Math.max(own?.bookEnd ?? be0, be0);
    const bound: SobpRange = { pt: own?.pt ?? r.pt, section: r.section, owner: r.owner, bookStart: lo, bookEnd: hi,
      pageStart: Math.min(own?.pageStart ?? 0, ps0), pageEnd: Math.max(own?.pageEnd ?? pe0, pe0), bookCount: hi - lo + 1 };
    const pr = rangePeriod(k, r);
    setEditRange({ keyId: k.id, idx: i, bound }); setSelRange({ keyId: k.id, idx: i }); setSobpIdx(0);
    setBStart(bs0); setBVol(be0 - bs0 + 1); setPStart(ps0); setPVol(pe0 - ps0 + 1);
    setCtype(CT_OF[r.pt] ?? "PDS3"); setSince(pr.since); setUnlimited(pr.until === "무제한"); setUntil(pr.until === "무제한" ? "" : pr.until);
    setTab("key");
    setTimeout(() => document.getElementById("ak-issue-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };
  const cancelEdit = () => { setEditRange(null); resetIssueForm(); };
  const saveEdit = () => {
    if (!editRange || !range) return;
    const k = keys.find((x) => x.id === editRange.keyId); const r = k ? keyRanges(k)[editRange.idx] : undefined;
    if (!k || !r) return;
    const untilStr = untilVal();
    if (!unlimited && until && since && until < since) { setToast({ ok: false, text: "사용기간 끝이 시작보다 앞설 수 없습니다." }); return; }
    const cand = { section: r.section, owner: r.owner, bookStart: keyBS, bookEnd: keyBS + keyVol - 1, pageStart: pStart, pageEnd: pStart + keyPVol - 1 };
    const clash = sobpOverlapMsg(cand, `${acc.id}#${editRange.idx}`);   // 자기 자신은 빼고 본다 `PC-192`
    if (clash) { setToast({ ok: false, text: clash }); return; }
    const patch: Partial<KeyRange> = { pt: patternOf(ctype), bookStart: cand.bookStart, bookEnd: cand.bookEnd, bookVol: keyVol,
      pageStart: pStart, pageEnd: cand.pageEnd, pageVol: keyPVol, since, until: untilStr };
    caster.updateKeyRange(k.id, editRange.idx, patch);
    const nr = { ...r, ...patch } as KeyRange;
    const t = r.ticketId ? ticketById(r.ticketId) : undefined;   // 원장 티켓의 Key 정보도 같은 값으로
    if (t) updateTicket(t.id, { summary: `계정 ${acc.id} · ${rangeText(nr)} · 기간 ${since || "즉시"}~${untilStr}`,
      params: { ...t.params, "Book Start": cand.bookStart, "Book Volume": keyVol, "Book End": cand.bookEnd,
        "Page Start": pStart, "Page Volume": keyPVol, "Page End": cand.pageEnd, "Code Type": ctype,
        "Valid From Time": since ? since.replace(/-/g, "") : "즉시",
        "Valid Until Time": untilStr === "무제한" ? "99999999 (무제한)" : untilStr.replace(/-/g, ""),
        "Ticket Type": untilStr === "무제한" ? "Unlimited" : "Period" } });
    logActivity("ticket", `App Key 티켓 수정 · ${acc.company} · ${acc.id} · ${rangeText(nr)} · 기간 ${since || "즉시"}~${untilStr}`, me?.name);
    setEditRange(null); resetIssueForm();
    setToast({ ok: true, text: `티켓 수정 — ${rangeText(nr)} · ${since || "즉시"}~${untilStr}` });
  };
  const addKey = () => {
    if (!range) { setToast({ ok: false, text: "발급 범위를 선택하세요." }); return; }
    if (myKey) { setToast({ ok: false, text: "App Key 는 계정당 1개입니다. 아래에서 코드 범위를 더 발급하세요." }); return; }
    const clash = sobpOverlapMsg({ section: range.section, owner: range.owner, bookStart: keyBS, bookEnd: keyBS + keyVol - 1, pageStart: pStart, pageEnd: pStart + keyPVol - 1 });
    if (clash) { setToast({ ok: false, text: clash }); return; }   // SOBP 무겹침 `PC-174`
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
          {/* 현재 App Key — 사용기간은 아래 각 범위(=티켓)마다 지정한다 `PC-118` · 수정 중에는 숨김 `PC-194` */}
          <div style={{ display: editRange ? "none" : "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12,
            border: "1px solid #eef0f4", background: "#fafbfc", borderRadius: 9, padding: "10px 12px", fontSize: 12.5 }}>
            {myKey.key
              ? <code style={{ fontFamily: "ui-monospace,monospace", color: "#2563eb", wordBreak: "break-all" }}>{myKey.key}</code>
              : <span style={{ ...S.tag, background: "#fef3c7", color: "#92400e", fontWeight: 700 }}>키 미기재</span>}
            <span style={{ ...S.tag, background: "#eef6ff", color: "#2563eb", fontWeight: 700 }}>코드 범위 {keyRanges(myKey).length}개</span>
            <span style={{ color: "#9ca3af", fontSize: 11.5 }}>· 사용기간은 범위마다 지정</span>
          </div>

          {/* 코드 범위 발급 — 범위마다 사용기간을 함께 지정 `PC-118`. [티켓 수정]도 이 폼에서 고친다 `PC-193` */}
          <div id="ak-issue-form" />
          {editRange && (() => {
            const k = keys.find((x) => x.id === editRange.keyId); const r = k ? keyRanges(k)[editRange.idx] : undefined;
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "8px 12px", borderRadius: 9, border: "1px solid #93c5fd", background: "#f0f7ff", fontSize: 12.5 }}>
                <b style={{ color: "#1d4ed8" }}>수정 전</b>
                {r && <span style={{ fontFamily: "ui-monospace,monospace", color: "#374151" }}>{rangeText(r)} · {rangePeriod(keys.find((x) => x.id === editRange.keyId)!, r).since || "즉시"}~{rangePeriod(keys.find((x) => x.id === editRange.keyId)!, r).until}</span>}
                <span style={{ color: "#6b7280" }}>· 할당 범위 B{editRange.bound.bookStart}~{editRange.bound.bookEnd} 안에서 고칩니다</span>
              </div>
            );
          })()}
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>발급 범위 (Caster 대장 이력 · SOBP 할당) * <span style={{ color: "#9ca3af" }}>(선택하면 Section·Owner·Book·Code Type 이 자동으로 채워집니다 · 사용기간을 함께 지정합니다)</span></div>
          <SobpRangePicker company ranges={formRanges} value={sobpIdx} onSelect={(i) => { setSobpIdx(i); setBStart(null); setBVol(null); const r = formRanges[i]; if (r) setCtype(CT_OF[r.pt] ?? "PDS3"); }} />
          {/* 구간 사용 현황 — 수정 중이면 자기 자신은 빼고 본다 `PC-195` */}
          {range && <SobpUsage range={range} onPickBook={(b) => setBStart(b)} exclude={editRange ? `${acc.id}#${editRange.idx}` : undefined}
            cand={{ section: range.section, owner: range.owner, bookStart: keyBS, bookEnd: keyBS + keyVol - 1, pageStart: pStart, pageEnd: pStart + keyPVol - 1 }} />}
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
            {editRange ? (
              <>
                <button onClick={cancelEdit} style={S.ghost}>취소</button>
                <button onClick={saveEdit} disabled={!range} style={{ ...S.primary, ...(!range ? { opacity: 0.5, cursor: "not-allowed" } : {}) }}>수정 저장</button>
              </>
            ) : (
              <button onClick={addRange} disabled={!range} style={{ ...S.primary, ...(!range ? { opacity: 0.5, cursor: "not-allowed" } : {}) }}>코드 범위 발급</button>
            )}
          </div>
          {issuedCard}
        </>
      ) : (
        <>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>발급 범위 (Caster 대장 이력 · SOBP 할당) * <span style={{ color: "#9ca3af" }}>(선택하면 Section·Owner·Book·Code Type 이 자동으로 채워집니다)</span></div>
          <SobpRangePicker company ranges={ranges} value={sobpIdx} onSelect={(i) => { setSobpIdx(i); setBStart(null); setBVol(null); const r = ranges[i]; if (r) setCtype(CT_OF[r.pt] ?? "PDS3"); }} />
          {range && <SobpUsage range={range} onPickBook={(b) => setBStart(b)}
            cand={{ section: range.section, owner: range.owner, bookStart: keyBS, bookEnd: keyBS + keyVol - 1, pageStart: pStart, pageEnd: pStart + keyPVol - 1 }} />}
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
    <div style={embedded ? undefined : { padding: "18px 20px", maxWidth: 900 }}>
      <div style={{ ...S.card, padding: 18 }}>
        {/* 제목은 상단(브레드크럼)에만 두고, 여기서는 **고객사명을 크게** 보여 준다 `PC-069` */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: embedded ? 15 : 20, fontWeight: 800, color: "#111827" }}>{embedded ? (acc.name || acc.id) : acc.company}</div>
          <code style={{ fontFamily: "ui-monospace,monospace", color: "#374151", fontSize: 12.5 }}>{acc.id}</code>
        </div>

        {/* 탭 3개 `PC-062` */}
        <AccTabs tab={tab} onTab={setTab} items={ACC_TABS_DETAIL}
          badge={{ hist: rangeItems.length ? `${rangeItems.length}` : undefined, bill: nTodo ? `미정 ${nTodo}` : undefined }} />

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
        {/* 수정 중이면 이 칸만 보인다 — 제목 「티켓 수정」 · 파란 테두리 `PC-194` */}
        <div style={{ ...SEC, marginTop: 0, display: tab === "key" ? "block" : "none", ...(editRange ? { borderColor: "#93c5fd", background: "#fbfdff" } : {}) }}>
          {editRange
            ? <SecHead t="티켓 수정" d="· 발급된 티켓의 정보를 고칩니다 — 다른 발급분과 겹치지 않는 구간이면 저장됩니다" />
            : <SecHead t="App Key 발급" d={`· 계정당 1개 · 발급된 키 ${keys.length}개`} tip={myKey ? "이 계정에는 이미 App Key 가 발급돼 있습니다 — 계정당 1개입니다. 코드 범위(=티켓)를 더 발급할 수 있고, **사용기간은 범위마다 함께 지정**합니다(PC-118). 발급된 키 · 티켓은 지우지 않고 [티켓 수정]으로 고칩니다(PC-192)." : "고객사 별 계정 개수 제한 없음 · App Key 는 계정당 1개 발급"} />}
          {appKeyBlock}
        </div>



        {/* 발급 내역 — 지금까지 발급한 티켓(코드 범위)을 표로 본다. 줄을 누르면 그 아래에 Key 정보 `PC-120` `PC-200` */}
        <div style={{ ...SEC, marginTop: 0, display: tab === "hist" ? "block" : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10, fontSize: 12, color: "#6b7280" }}>
            <b style={{ fontSize: 13.5, color: "#111827" }}>발급 내역</b>
            <span>티켓 <b style={{ color: "#111827" }}>{rangeItems.length}</b>건</span>
            {nTodo > 0 && <span style={{ color: "#dc2626" }}>정산 미정 {nTodo}</span>}
            <span style={{ flex: 1 }} />
            {myKey && (myKey.key
              ? <span title="App Key — 계정당 1개, 모든 티켓에 공통">App Key <code style={{ fontFamily: "ui-monospace,monospace", color: "#374151" }}>{myKey.key}</code></span>
              : <span style={{ ...S.tag, background: "#fef3c7", color: "#92400e", fontWeight: 700 }} title="대장에 App Key 값이 적혀 있지 않습니다">App Key 미기재</span>)}
          </div>
          {rangeItems.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "#9ca3af", padding: "28px 0", textAlign: "center", border: "1px dashed #e5e7eb", borderRadius: 10, lineHeight: 1.8 }}>
              발급한 티켓이 없습니다.<br />
              <button onClick={() => setTab("key")} style={{ ...S.linkBtn, fontSize: 12.5 }}>App Key 발급으로</button>
            </div>
          ) : (
            <div style={{ border: "1px solid #eef0f4", borderRadius: 10, overflow: "hidden" }}>
              {rangeItems.map(({ k, r, i }, n) => {
                const isSel = !!selected && selected.k.id === k.id && selected.i === i;
                const p = rangePeriod(k, r);
                const t = r.ticketId ? ticketById(r.ticketId) : undefined;
                const at = [t?.at, r.since, k.createdAt].map((x) => (x ?? "").slice(0, 10)).find((x) => /^\d{4}-\d{2}-\d{2}$/.test(x));
                const ledger = t?.src === "ledger" || k.seeded;
                const bs = r.bookStart, be = r.bookEnd ?? (bs != null && r.bookVol ? bs + r.bookVol - 1 : bs);
                const ps = r.pageStart, pe = r.pageEnd ?? (ps != null && r.pageVol ? ps + r.pageVol - 1 : ps);
                const span = (a?: number | null, z?: number | null) => (a == null ? "전체" : z == null || z === a ? `${a}` : `${a}~${z}`);
                return (
                  <div key={`${k.id}-${i}`} style={{ borderTop: n ? "1px solid #f1f3f6" : "none" }}>
                    <div onClick={() => { if (isSel) setOpenKey((v) => !v); else { setSelRange({ keyId: k.id, idx: i }); setOpenKey(true); } }}
                      title="누르면 아래에 이 티켓의 Key 정보가 열립니다(다시 누르면 접힘)"
                      style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", cursor: "pointer", background: isSel ? "#f0f7ff" : "#fff" }}>
                      <span style={{ width: 18, flex: "0 0 18px", paddingTop: 2, fontSize: 11.5, color: isSel ? "#2563eb" : "#9ca3af", fontWeight: 700 }}>{n + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <SobpChips k={CT_OF[r.pt] ?? r.pt} s={r.section} o={r.owner} b={span(bs, be)} p={span(ps, pe)} small />
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 5, fontSize: 11.5, color: "#6b7280" }}>
                          {at ? <span style={{ fontFamily: "ui-monospace,monospace" }}>{at}</span> : null}
                          {ledger && <span style={{ ...S.tag, background: "#f3f4f6", color: "#6b7280" }} title="개발팀 대장에서 들어온 발급분">대장</span>}
                          <span style={{ color: "#d1d5db" }}>·</span>
                          <span>{rangeBooks(r) != null ? `${rangeBooks(r)!.toLocaleString()}권` : "권수 —"}</span>
                          <span style={{ color: "#d1d5db" }}>·</span>
                          <span>{p.since || "즉시"} ~ {p.until}</span>
                        </div>
                      </div>
                      <BillTag v={r} />
                      {/* 발급된 티켓은 지우지 않고 고친다 `PC-192` — [App Key 발급] 폼에서 고친다 `PC-193` */}
                      <button onClick={(e) => { e.stopPropagation(); startEdit(k, i); }} style={{ ...S.ghost, padding: "3px 9px", fontSize: 11 }}>수정</button>
                      <span style={{ fontSize: 10, color: "#9ca3af", paddingTop: 5, transform: isSel && openKey ? "rotate(90deg)" : "none", transition: "transform .15s" }}>▶</span>
                    </div>
                    {isSel && openKey && (() => {
                      const params = {
                        "Company Name": acc.company, "Account Id": acc.id, "App Key": k.key || "미기재", "Code Type": r.pt,
                        Section: r.section, Owner: r.owner,
                        "Book Start": r.bookStart ?? "-", "Book Volume": rangeBooks(r) ?? "-", "Book End": r.bookEnd ?? "-",
                        "Page Start": r.pageStart ?? "-", "Page Volume": r.pageVol ?? "-", "Page End": r.pageEnd ?? "-",
                        "Valid From Time": p.since ? p.since.replace(/-/g, "") : "즉시",
                        "Valid Until Time": p.until === "무제한" ? "99999999 (무제한)" : (p.until || "").replace(/-/g, ""),
                        "Ticket Type": p.until === "무제한" ? "Unlimited" : "Period",
                      } as Record<string, string | number>;
                      return (
                        <div style={{ padding: "10px 12px 12px", background: "#fbfdff", borderTop: "1px solid #e0ecff" }}>
                          <KeyCard title="Key 정보" empty="" params={params} />
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 정산 탭 — 티켓(코드 범위)을 고르고 그 정산을 등록한다. N Key 관리의 정산 탭과 같은 결 `PC-177` `PC-178` */}
        <div style={{ ...SEC, marginTop: 0, display: tab === "bill" ? "block" : "none" }}>
          <SecHead t="정산할 티켓" d={`· 티켓(코드 범위)마다 등록 · 미정 ${nTodo}건`} />
          {rangeItems.length === 0 ? (
            <div style={{ fontSize: 12, color: "#9ca3af", padding: "6px 0" }}>발급된 티켓이 없습니다. [App Key 발급] 탭에서 먼저 발급하세요.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 4 }}>
              {rangeItems.map(({ k, r, i }) => {
                const isSel = !!selected && selected.k.id === k.id && selected.i === i;
                const p = rangePeriod(k, r);
                return (
                  <div key={`${k.id}-${i}`} onClick={() => setSelRange({ keyId: k.id, idx: i })} title="선택하면 아래에서 이 티켓의 정산을 등록합니다"
                    style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", cursor: "pointer", fontSize: 11.5, color: "#6b7280",
                      border: `1px solid ${isSel ? "#93c5fd" : "#eef0f4"}`, background: isSel ? "#f0f7ff" : "#fff", borderRadius: 8, padding: "6px 8px" }}>
                    <span style={{ color: isSel ? "#2563eb" : "#d1d5db", fontWeight: 700, fontSize: 11 }}>{isSel ? "▸" : "·"}</span>
                    <span style={{ fontFamily: "ui-monospace,monospace", color: "#374151" }}>{rangeText(r)}</span>
                    <span>{p.since || "즉시"} ~ {p.until}</span>
                    <span style={{ flex: 1 }} />
                    <BillTag v={r} />
                  </div>
                );
              })}
            </div>
          )}
          {selected && (
            <BillingEditor key={`${selected.k.id}-${selected.i}`} v={selected.r} baseDate={selected.r.since || selected.k.createdAt.slice(0, 10)}
              onSave={(p) => {
                caster.setRangeBilling(selected.k.id, selected.i, { ...p, billedBy: me?.name ?? "" });
                if (selected.r.ticketId) setBilling(selected.r.ticketId, { ...p, by: me?.name ?? "" });   // 원장 티켓에도 같은 값
                logActivity("ticket", `App Key 정산 · ${acc.company} · ${acc.id} · ${rangeText(selected.r)} · ${p.billing}${p.billing === "유료" ? ` ${p.amount.toLocaleString()}원` : ""}`, me?.name);
              }} />
          )}
        </div>

        {/* 이동·저장 버튼은 화면 맨 아래에 모은다 `PC-069` · 티켓 수정 중에는 숨긴다 `PC-194` */}
        {/* 계정 저장 · 삭제는 [계정 정보] 탭에서만 `PC-200` */}
        <div style={{ display: editRange || tab !== "info" ? "none" : "flex", alignItems: "center", gap: 8, marginTop: 16 }}>
          {!embedded && <Link href="/tickets/account" style={{ ...S.ghost, textDecoration: "none" }}>목록</Link>}
          <span style={{ flex: 1 }} />
          {/* 발급된 티켓이 있는 계정은 지우지 않는다(티켓 삭제 없음) `PC-192` */}
          <button disabled={keys.length > 0} title={keys.length ? "발급된 App Key 티켓이 있는 계정은 삭제할 수 없습니다" : undefined}
            onClick={() => { if (confirm("이 계정을 삭제할까요?")) { caster.removeAccount(acc.id); if (onDeleted) onDeleted(); else router.push("/tickets/account"); } }}
            style={{ ...S.ghost, color: "#dc2626", borderColor: "#fecaca", opacity: keys.length ? 0.4 : 1, cursor: keys.length ? "not-allowed" : "pointer" }}>계정 삭제</button>
          <button onClick={save} style={S.primary}>저장</button>
        </div>
        {toast && <div style={{ marginTop: 10, fontSize: 12.5, color: toast.ok ? "#047857" : "#dc2626", textAlign: "right" }}>{toast.text}</div>}
      </div>
    </div>
  );
}
