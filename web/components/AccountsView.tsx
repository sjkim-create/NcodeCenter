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
import { addTicket, fmtMoney, hydrateTickets, setBilling, ticketById, updateTicket, useTickets } from "@/lib/ticketStore";
import { BillingEditor, BillTag, LicenseEditor } from "./BillingEditor";
import { sobpOverlapMsg } from "@/lib/rangeGuard";
import { SobpRangePicker, FormSec, type SobpRange } from "./TicketsView";
import { SobpUsage } from "./SobpUsage";
import { APPKEY_PERMS, normAppKeyPerms } from "@/lib/appKeyPerms";
import { InfoTip, WsTabs } from "./KeyWorkspaceUI";
import { SobpChips } from "./sobp";
import { useTicketCustomers } from "@/lib/ticketCustomerStore";
import { appKeyRangesOfCompany, companyOfAccount } from "@/lib/keyCompany";
import type { Company } from "@/lib/customerData";
import { CODE_KINDS, patternOf, type CodeKind } from "@/lib/codeKind";
import {
  caster, useCaster, genAppKey,
  accountTickets, periodCode, ticketInfo, appTicketName, rangeText, rangeBooks, rangePeriod, type KeyRange,
  type CasterAccount,
} from "@/lib/accountStore";

const PAGE_DEFAULT = 512;   // Page Size 기본값 — N Key 발급과 같은 값 `PC-059`
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
// App Key 와 티켓은 다른 개념 — 탭을 나눈다 `PC-208`
//   App Key(계정당 1개 · 권한) / 티켓(계정 소속 · 여러 개 · App Key 를 먼저 발급한 계정에만)
//   App Key 는 계정을 만들 때 **자동 생성**(1계정 1키)이라 따로 탭 · 목록을 두지 않고 [계정 정보]에 보인다 `PC-210`
export type AccTab = "hist" | "info" | "perm" | "ticket" | "bill";
const ACC_TABS: { v: AccTab; label: string }[] = [
  { v: "info", label: "계정 정보" },
];
// 탭 순서 — 티켓 내역 · 티켓 발급 · 정산 · 계정 정보 · 권한 `PC-211`
const ACC_TABS_DETAIL: { v: AccTab; label: string }[] = [
  { v: "hist", label: "티켓 내역" },
  { v: "ticket", label: "티켓 발급" },
  { v: "bill", label: "정산" },
  { v: "info", label: "계정 정보" },
  { v: "perm", label: "권한" },          // App Key 권한 20항목 `PC-207`
];
function AccTabs({ tab, onTab, badge, items = ACC_TABS }: { tab: AccTab; onTab: (v: AccTab) => void; badge?: Partial<Record<AccTab, string>>; items?: { v: AccTab; label: string }[] }) {
  return <WsTabs items={items} tab={tab} onTab={onTab} badge={badge} />;   // 공용 탭 `PC-276`
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
      <Field label={`Book Size (권) ${range ? `· 최대 ${maxVol}` : ""}`}>
        <input type="number" style={S.input} value={bookVol} min={1} max={maxVol} disabled={!range}
          onChange={(e) => onVol(Math.max(1, Math.min(maxVol, +e.target.value || 1)))} />
      </Field>
      <Field label="Start Page">
        <select style={S.input} value={pageStart} disabled={!range} onChange={(e) => onPStart(+e.target.value)}>
          <option value={0}>0</option><option value={1}>1 (기본)</option><option value={2}>2</option>
        </select>
      </Field>
      <Field label="Page Size">
        <input type="number" style={S.input} value={pageVol} min={1} disabled={!range}
          onChange={(e) => onPVol(Math.max(1, +e.target.value || 1))} />
      </Field>
    </>
  );
}

// App Key 는 **계정당 1개**이고 그 계정의 **사용처 전체에 공통**이다 `PC-050`.
// App Key 와 티켓은 다른 개념 — 키는 **범위 없이 키만** 발급하고, 티켓은 [티켓 발급]에서 따로 발급한다 `PC-208`
function issueAppKey(acc: CasterAccount, by?: string) {
  const key = genKeyStr();
  const rec = caster.addAppKey({ key, accountId: acc.id, services: [], company: acc.company,
    pt: "", section: 0, owner: 0, bookStart: 0, bookEnd: 0, bookVol: 0, pageStart: 0, pageEnd: 0, until: "무제한",
    ranges: [] });                                       // 티켓은 키가 아니라 계정에 `PC-206`
  if (!rec) return "";                                   // 이미 발급된 계정 — 계정당 App Key 1개
  logActivity("appkey", `App Key 발급 · ${acc.company} · ${acc.id} · ${key}`, by);
  return key;
}

/* ── App Key 권한 — 분류 · Permission · 값(true / false) · 설명 `PC-207` ── */
// 개발팀 대장(Caster_계정_퍼미션_티켓.xlsx)의 권한 표와 같은 모양. 기본 모두 false
// 한 번 저장하면 확정 — 이후는 값만 보여 주고 바꿀 수 없다(변경은 고객사 요청 시 DB 직접) `PC-275`
function KeyPermsEditor({ value, fixed, onSave }: { value?: Record<string, boolean>; fixed: boolean; onSave: (v: Record<string, boolean>) => void }) {
  const saved = normAppKeyPerms(value);
  const [v, setV] = useState(saved);
  const [msg, setMsg] = useState("");
  const dirty = !fixed && APPKEY_PERMS.some((p) => v[p.key] !== saved[p.key]);
  const save = () => {
    const n = Object.values(v).filter(Boolean).length;
    if (!confirm(`App Key 권한을 저장할까요?\n(true ${n} / ${APPKEY_PERMS.length})\n\n저장한 뒤에는 권한을 바꿀 수 없습니다.`)) return;
    onSave(v); setMsg("권한이 저장되었습니다.");
  };
  const nOn = Object.values(v).filter(Boolean).length;
  const setAll = (b: boolean) => setV(Object.fromEntries(APPKEY_PERMS.map((p) => [p.key, b])));
  const seg = (on: boolean, tone: "t" | "f"): React.CSSProperties => ({ border: 0, padding: "3px 10px", fontSize: 11.5, cursor: "pointer", fontFamily: "ui-monospace,monospace",
    fontWeight: on ? 700 : 400, background: on ? (tone === "t" ? "#dcfce7" : "#f3f4f6") : "#fff", color: on ? (tone === "t" ? "#166534" : "#374151") : "#c7cdd6" });
  const th: React.CSSProperties = { padding: "7px 10px", fontSize: 11.5, color: "#6b7280", fontWeight: 700, textAlign: "left", background: "#fafbfc", borderBottom: "1px solid #eef0f4" };
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10, fontSize: 12, color: "#6b7280" }}>
        <b style={{ fontSize: 13.5, color: "#111827" }}>App Key 권한</b>
        {/* 숨김 설명 — Caster U 권한 `PC-214` */}
        <InfoTip title="App Key 권한이란?">
          <b>Caster U 권한</b>입니다. 이 App Key 로 Caster U 를 쓸 때 켜고 끄는 기능 20항목이며, 값이 <b>true</b> 인 기능만 쓸 수 있습니다. 기본값은 모두 false 입니다.
          <br />권한은 <b>한 번 저장하면 확정</b>되어 바꿀 수 없습니다. 고객사 요청으로 바꿔야 하면 DB 에서 직접 수정합니다.
        </InfoTip>
        <span>true <b style={{ color: "#166534" }}>{nOn}</b> / {APPKEY_PERMS.length}</span>
        {fixed && <span title="저장된 권한은 바꿀 수 없습니다 · 변경은 DB 에서 직접 수정합니다" style={{ padding: "1px 7px", borderRadius: 999, background: "#f3f4f6", color: "#374151", fontSize: 11 }}>확정</span>}
        <span style={{ flex: 1 }} />
        {!fixed && <>
          <button type="button" onClick={() => setAll(true)} style={{ ...S.ghost, padding: "4px 10px", fontSize: 11.5 }}>모두 true</button>
          <button type="button" onClick={() => setAll(false)} style={{ ...S.ghost, padding: "4px 10px", fontSize: 11.5 }}>모두 false</button>
        </>}
      </div>
      <div style={{ border: "1px solid #eef0f4", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead><tr><th style={{ ...th, width: 76 }}>분류</th><th style={th}>Permission</th><th style={{ ...th, width: 108, textAlign: "center" }}>값</th><th style={th}>설명</th></tr></thead>
          <tbody>
            {APPKEY_PERMS.map((p, i) => {
              const first = i === 0 || APPKEY_PERMS[i - 1].group !== p.group;
              const on = v[p.key];
              return (
                <tr key={p.key} style={{ borderTop: first && i ? "1px solid #e5e7eb" : "1px solid #f3f4f6", background: on ? "#fff" : "#fafbfc" }}>
                  <td style={{ padding: "6px 10px", color: "#374151", fontWeight: 600, verticalAlign: "top" }}>{first ? p.group : ""}</td>
                  {/* 줄바꿈은 「/」 에서만 */}
                  <td style={{ padding: "6px 10px", fontFamily: "ui-monospace,monospace", fontSize: 11.5, color: "#374151" }}>{p.key.split("/").join("/​")}</td>
                  <td style={{ padding: "4px 10px", textAlign: "center" }}>
                    {fixed
                      ? <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 11.5, fontWeight: on ? 700 : 400, color: on ? "#166534" : "#9ca3af" }}>{on ? "true" : "false"}</span>
                      : <span style={{ display: "inline-flex", border: "1px solid #e5e7eb", borderRadius: 7, overflow: "hidden" }}>
                          <button type="button" onClick={() => setV({ ...v, [p.key]: true })} style={seg(on, "t")}>true</button>
                          <button type="button" onClick={() => setV({ ...v, [p.key]: false })} style={{ ...seg(!on, "f"), borderLeft: "1px solid #e5e7eb" }}>false</button>
                        </span>}
                  </td>
                  <td style={{ padding: "6px 10px", color: "#6b7280", fontSize: 12 }}>{p.desc}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {fixed
        ? msg && <div style={{ marginTop: 12, fontSize: 12, color: "#166534" }}>{msg}</div>
        : <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
            {dirty && <span style={{ fontSize: 12, color: "#b45309" }}>● 저장하지 않은 변경이 있습니다</span>}
            <span style={{ flex: 1 }} />
            <button type="button" disabled={!dirty} onClick={() => setV(saved)} style={{ ...S.ghost, opacity: dirty ? 1 : 0.5 }}>취소</button>
            <button type="button" onClick={save} style={S.primary}>권한 저장</button>
          </div>}
    </div>
  );
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
  const [phone, setPhone] = useState("");   // PHONE (전화번호) `PC-209`
  const [homepage, setHomepage] = useState("");
  const [tab, setTab] = useState<AccTab>("info");        // 화면 탭 `PC-062`
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  // 고객사 = **고객사 관리 고객사** `PC-153` — 계정은 이 화면의 App Key 계정(서비스 계정과 별개)
  const { companies } = useStore();
  const company = companyId ? companies.find((c) => c.id === companyId) : undefined;

  const onCompany = (cid: number) => {
    setCompanyId(cid);
    // 티켓 고객사는 고객사 관리와 별개라 주소·사용 서비스를 끌어오지 않는다 `PC-123` (옛 `PC-076` 자동 체크 폐지)
  };

  // 가입 승인(SSO) 계정은 고객사 관리의 계정 및 서비스 권한에서 추가한다 `PC-133` — 여기서 미리 채우지 않는다

  const submit = () => {
    if (!company) { setToast({ ok: false, text: "고객사를 선택하세요." }); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(id.trim())) { setToast({ ok: false, text: "ID 는 이메일 형식이어야 합니다." }); return; }
    if (!pwd.trim()) { setToast({ ok: false, text: "비밀번호가 필요합니다. (요청 없으면 [임의 생성])" }); return; }

    const acc: CasterAccount = {
      id: id.trim(), pwd: pwd.trim(), name: name.trim(), services: [], settings: {}, scope: "key",   // 인증 서비스·권한 없음 `PC-131`
      companyId: company.id, company: company.name, coRef: company.id, addr: addr.trim(), phone: phone.trim(), homepage: homepage.trim(),
      createdAt: "",
    };
    const r = caster.addAccount(acc);
    if (!r.ok) { setToast({ ok: false, text: r.msg }); return; }
    logActivity("appkey", `계정 등록 · ${company.name} · ${acc.id}`, me?.name);
    issueAppKey(acc, me?.name);   // 계정을 만들면 App Key 자동 생성 — 1계정 1키 `PC-210`. 티켓은 계정 상세 [티켓 발급]에서
    if (onDone) { onDone(acc.id); return; }  // 3단 화면 — 오른쪽 칸에서 바로 그 계정 상세로 `PC-146`
    router.push("/tickets/account");        // 목록에 노출
  };

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


        {/* 계정 정보 */}
        <div style={{ ...SEC, marginTop: 0, display: tab === "info" ? "block" : "none" }}>
        <SecHead t="계정 정보" d="· 키 발급 계정 · [계정 추가] 때 App Key 자동 생성" tip="고객사 별 계정 개수 제한 없음 · App Key 는 계정당 1개 — 계정을 만들면 자동으로 생성됩니다(PC-210)" />
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
              <input style={S.input} value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="비밀번호 미요청 시 임의 생성" title="계정을 만든 뒤에는 바꿀 수 없습니다" />
              <button onClick={() => setPwd(genPwdStr())} style={{ ...S.smallBtn, whiteSpace: "nowrap" }} title="비밀번호를 요청하지 않는 고객사(SDK)는 담당자가 임의 지정">임의 생성</button>
            </div>
          </Field>
          <Field label="PHONE (전화번호)"><input style={S.input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" /></Field>
          <Field label="HOMEPAGE (홈페이지)"><input style={S.input} value={homepage} onChange={(e) => setHomepage(e.target.value)} placeholder="https://" /></Field>
          <Field label="ADDR (주소)" full><input style={S.input} value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="주소" /></Field>
          <Field label="App Key" full>
            <div style={{ ...S.input, background: "#f7f8fa", color: "#9ca3af" }}>[계정 추가] 때 자동 생성 (영문 소문자 · 숫자 29자 · 1계정 1키)</div>
          </Field>
        </div>

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
  const [addr, setAddr] = useState("");
  const [phone, setPhone] = useState("");   // PHONE (전화번호) `PC-209`
  const [homepage, setHomepage] = useState("");
  // 사용기간 시작 — 새 발급은 오늘이 기본, 수정은 그 티켓에 등록했던 날짜 `PC-118` `PC-265`
  const todayDash = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const [since, setSince] = useState(todayDash);
  const [loaded, setLoaded] = useState(false);
  const sp = useSearchParams();
  const tabQ = sp.get("tab") as AccTab;
  // 목록에서 누른 항목의 탭 `PC-067` · 없으면 발급 내역(발급분이 없으면 App Key 발급) `PC-200`
  const hasKey = cast.appKeys.some((k) => k.accountId === accountId);
  const hasTicket = accountTickets(cast.accounts.find((a) => a.id === accountId)).length > 0;
  // 첫 탭 — 티켓이 있으면 티켓 내역, 키만 있으면 티켓 발급, 키가 없으면 App Key `PC-208`
  // ?tab=key(옛 링크)는 계정 정보로 — App Key 는 계정 정보에 있다 `PC-210`
  const tab0: AccTab = (["bill", "info", "hist", "perm", "ticket"] as string[]).includes(tabQ) ? tabQ
    : (tabQ as string) === "key" ? "info" : hasTicket ? "hist" : hasKey ? "ticket" : "info";
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
  const [selRange, setSelRange] = useState<{ keyId: number; idx: number } | null>(null);
  const [tname, setTname] = useState("");   // 티켓 이름 — 비우면 제안 이름(placeholder)으로 `PC-261`
  const [autoName, setAutoName] = useState(false);   // 입력 없이 칸을 벗어나면 제안 이름을 값으로(진하게) — 범위를 바꾸면 따라 바뀐다 `PC-262`
  const [info, setInfo] = useState("");   // 티켓 Info `PC-206`   // 발급 내역 선택 → 아래 Key 정보 `PC-120`
  const [openKey, setOpenKey] = useState(false);   // 발급 내역 표 — 고른 줄 아래 Key 정보 펼침 `PC-200`
  // 티켓 수정 중 — 위의 발급 폼을 그 티켓 값으로 채워 고친다 `PC-192` `PC-193`
  const [editRange, setEditRange] = useState<{ keyId: number; idx: number; bound: SobpRange } | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  // 계정 값 주입 (최초 1회 — 편집 중 스토어 변경에 덮이지 않도록)
  useEffect(() => {
    if (!acc || loaded) return;
    setName(acc.name); setAddr(acc.addr); setPhone(acc.phone ?? ""); setHomepage(acc.homepage);
    setLoaded(true);
  }, [acc, loaded]);

  const { companies } = useStore();
  const accCo = acc ? companyOfAccount(acc, companies) : undefined;   // 고객사 관리 고객사로 잇는다 `PC-153`
  const ranges = useRanges(accCo);
  // 수정 중이면 그 티켓의 테두리 하나(옛 OID · PDS4 값도 그대로) / 새 발급은 PDS2 · PDS3 범위만 `PC-220`
  const formRanges = editRange ? [editRange.bound] : ranges.filter((r) => ["PDS2", "PDS3"].includes(CT_OF[r.pt] ?? r.pt));
  const range = formRanges[sobpIdx];
  const keys = cast.appKeys.filter((k) => k.accountId === accountId);
  // App Key 는 **계정당 1개**이고 **사용처 전체에 공통**이다 `PC-050`
  const myKey = keys[0];
  // 발급 내역 항목(=키의 각 코드 범위/티켓) — 선택하면 아래 Key 정보에 표시 `PC-120`
  // 티켓은 **계정 소속** `PC-206` — 계정당 여러 개. App Key(계정당 1개)는 티켓과 별개다
  const tickets = accountTickets(acc);
  const rangeItems = tickets.map((r, i) => ({ k: myKey, r, i }));
  const selected = (selRange && rangeItems.find((x) => x.i === selRange.idx)) || rangeItems[0] || null;
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
    // PWD 는 계정을 만들 때만 정한다 — 이후 수정 불가라 저장하지 않는다 `PC-274`
    const r = caster.updateAccount(acc.id, {
      name: name.trim(), addr: addr.trim(), phone: phone.trim(), homepage: homepage.trim(),
    });
    if (!r.ok) { setToast({ ok: false, text: r.msg }); return; }
    logActivity("appkey", `계정 수정 · ${acc.company} · ${acc.id}`, me?.name);
    setToast({ ok: true, text: "계정 정보가 저장되었습니다." });
  };

  const keyBS = bStart ?? range?.bookStart ?? 0;
  const keyVol = Math.max(1, Math.min(bVol ?? (range?.bookCount ?? 1), range ? range.bookEnd - keyBS + 1 : 1));
  const keyPVol = Math.max(1, pVol ?? PAGE_DEFAULT);
  const untilVal = () => (unlimited ? "무제한" : (until || "무제한"));
  // 티켓 이름 제안 — .nkey 파일명 규칙과 같게 {고객사}_{S}s_{O}o_{Book Size}b_{Page Size}p_{발급일} `PC-261` `PC-263`
  //   새 발급 = 오늘(발급일) · 수정 = 그 티켓의 발급일
  const todayYmd = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, "");
  const editT = editRange ? tickets[editRange.idx] : undefined;
  const editTk = editT?.ticketId ? ticketById(editT.ticketId) : undefined;
  const nameDate = editRange ? (String(editTk?.params["Issued Time"] ?? "").replace(/\D/g, "").slice(0, 8) || (editTk?.at ?? editT?.since ?? "").slice(0, 10).replace(/-/g, "") || todayYmd) : todayYmd;
  const suggestName = range ? appTicketName({ co: accCo?.name ?? acc.company, section: range.section, owner: range.owner,
    bookVolume: keyVol, pageVolume: keyPVol, date: nameDate }) : "";
  const ticketName = (autoName ? "" : tname.trim()) || suggestName;
  // Owner Size — Owner 개수. 범위가 아니면 1 `PC-264` `PC-265`
  const ownerSize = editT && editT.ownerEnd != null && editT.ownerEnd > editT.owner ? editT.ownerEnd - editT.owner + 1 : 1;
  const resetIssueForm = () => { setSobpIdx(-1); setBStart(null); setBVol(null); setSince(todayDash()); setUntil(""); setUnlimited(true); setInfo(""); setTname(""); setAutoName(false); };
  // 발급된 키에 코드 범위(=티켓)를 하나 더 발급 — **범위마다 사용기간을 함께 지정** `PC-118`
  //   범위 발급 = 티켓 발급이므로 **원장(Key 발급 목록)에도 티켓 1건을 남긴다** `PC-119`
  const addRange = () => {
    if (!myKey) { setToast({ ok: false, text: "App Key 를 먼저 발급하세요." }); return; }   // 티켓은 App Key 가 있는 계정에만 `PC-208`
    if (!range) return;
    const clash = sobpOverlapMsg({ section: range.section, owner: range.owner, bookStart: keyBS, bookEnd: keyBS + keyVol - 1, pageStart: pStart, pageEnd: pStart + keyPVol - 1 });
    if (clash) { setToast({ ok: false, text: clash }); return; }   // SOBP 무겹침 `PC-174`
    const untilStr = untilVal();
    const r: KeyRange = { pt: range.pt, section: range.section, owner: range.owner, bookStart: keyBS, bookEnd: keyBS + keyVol - 1, bookVol: keyVol,
      pageStart: pStart, pageEnd: pStart + keyPVol - 1, pageVol: keyPVol, since, until: untilStr, info: info.trim() || undefined, name: ticketName };
    // 원장 티켓을 먼저 만들어 그 id 를 범위에 연결한다 `PC-119`·`PC-121`
    const t = addTicket({ kind: "APP", companyId: acc.companyId, company: acc.company, accountId: acc.id, by: me?.name ?? "",
      summary: `계정 ${acc.id} · ${rangeText(r)} · 기간 ${since || "즉시"}~${untilStr}`,
      params: {
        "Ticket Name": ticketName,   // `PC-261`
        "Company Name": acc.company, "Account Id": acc.id,
        "App Key": myKey.key || "미기재",
        "Issued Time": new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, ""),
        "Valid From Time": since ? since.replace(/-/g, "") : "즉시",
        "Valid Until Time": untilStr === "무제한" ? "99999999 (무제한)" : untilStr.replace(/-/g, ""),
        Section: r.section, Owner: r.owner, "Owner Size": 1,   // App Key 는 Ticket Version 없음 `PC-272`
        "Book Start": r.bookStart ?? 0, "Book Volume": r.bookVol ?? 0, "Book End": r.bookEnd ?? 0,
        "Page Start": r.pageStart ?? 0, "Page Volume": r.pageVol ?? 0, "Page End": r.pageEnd ?? 0,
        "Code Type": ctype, Info: info.trim() || "-",   // Ticket Type(= 코드 재사용)은 N Key 에만 `PC-259`
      } });
    caster.addAccountTicket(acc.id, { ...r, ticketId: t.id });   // 티켓 = 계정 소속 `PC-206`
    logActivity("appkey", `티켓 발급 · ${acc?.company} · ${acc?.id} · ${rangeText(r)} · 기간 ${since || "즉시"}~${untilStr}`, me?.name);
    resetIssueForm();
    setToast({ ok: true, text: `티켓 발급 — ${rangeText(r)} · ${since || "즉시"}~${untilStr}` });
  };
  // [티켓 수정] — 위 발급 폼에 그 티켓 값을 채운다. 테두리 = 같은 S/O 의 할당 범위 ∪ 지금 쓰는 구간
  const startEdit = (_k: unknown, i: number) => {
    const r = tickets[i]; if (!r) return;
    const bs0 = r.bookStart ?? 0, be0 = r.bookEnd ?? (r.bookVol ? bs0 + r.bookVol - 1 : bs0);
    const ps0 = r.pageStart ?? 0, pe0 = r.pageEnd ?? ps0 + (r.pageVol ?? 512) - 1;
    const own = ranges.find((x) => x.section === r.section && x.owner === r.owner && bs0 >= x.bookStart && bs0 <= x.bookEnd);
    const lo = Math.min(own?.bookStart ?? bs0, bs0), hi = Math.max(own?.bookEnd ?? be0, be0);
    const bound: SobpRange = { pt: own?.pt ?? r.pt, section: r.section, owner: r.owner, bookStart: lo, bookEnd: hi,
      pageStart: Math.min(own?.pageStart ?? 0, ps0), pageEnd: Math.max(own?.pageEnd ?? pe0, pe0), bookCount: hi - lo + 1 };
    const pr = rangePeriod(myKey, r);
    const t0 = r.ticketId ? ticketById(r.ticketId) : undefined;   // 사용기간 시작이 비어 있던 옛 발급분은 그 티켓의 발급일 `PC-265`
    const since0 = pr.since || [t0?.at, myKey?.createdAt].map((x) => (x ?? "").slice(0, 10)).find((x) => /^\d{4}-\d{2}-\d{2}$/.test(x)) || "";
    setEditRange({ keyId: 0, idx: i, bound }); setSelRange({ keyId: 0, idx: i }); setSobpIdx(0); setInfo(ticketInfo(r)); setTname(r.name ?? ""); setAutoName(false);
    setBStart(bs0); setBVol(be0 - bs0 + 1); setPStart(ps0); setPVol(pe0 - ps0 + 1);
    setCtype(CT_OF[r.pt] ?? "PDS3"); setSince(since0); setUnlimited(!pr.until || pr.until === "무제한"); setUntil(!pr.until || pr.until === "무제한" ? "" : pr.until);   // 비어 있는 기한 = 무제한(Key 정보와 같게)
    setTab("ticket");
    setTimeout(() => document.getElementById("ak-issue-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };
  const cancelEdit = () => { setEditRange(null); resetIssueForm(); };
  const saveEdit = () => {
    if (!editRange || !range) return;
    const r = tickets[editRange.idx];
    if (!r) return;
    const untilStr = untilVal();
    if (!unlimited && until && since && until < since) { setToast({ ok: false, text: "사용기간 끝이 시작보다 앞설 수 없습니다." }); return; }
    const cand = { section: r.section, owner: r.owner, bookStart: keyBS, bookEnd: keyBS + keyVol - 1, pageStart: pStart, pageEnd: pStart + keyPVol - 1 };
    const clash = sobpOverlapMsg(cand, `${acc.id}#${editRange.idx}`);   // 자기 자신은 빼고 본다 `PC-192`
    if (clash) { setToast({ ok: false, text: clash }); return; }
    const patch: Partial<KeyRange> = { pt: patternOf(ctype), bookStart: cand.bookStart, bookEnd: cand.bookEnd, bookVol: keyVol,
      pageStart: pStart, pageEnd: cand.pageEnd, pageVol: keyPVol, since, until: untilStr, info: info.trim() || undefined, name: ticketName };
    caster.updateAccountTicket(acc.id, editRange.idx, patch);
    const nr = { ...r, ...patch } as KeyRange;
    const t = r.ticketId ? ticketById(r.ticketId) : undefined;   // 원장 티켓의 Key 정보도 같은 값으로
    if (t) updateTicket(t.id, { summary: `계정 ${acc.id} · ${rangeText(nr)} · 기간 ${since || "즉시"}~${untilStr}`,
      params: { ...Object.fromEntries(Object.entries(t.params).filter(([k]) => k !== "Ticket Type")), "Ticket Name": ticketName, "Book Start": cand.bookStart, "Book Volume": keyVol, "Book End": cand.bookEnd,
        "Page Start": pStart, "Page Volume": keyPVol, "Page End": cand.pageEnd, "Code Type": ctype, Info: info.trim() || "-",
        "Valid From Time": since ? since.replace(/-/g, "") : "즉시",
        "Valid Until Time": untilStr === "무제한" ? "99999999 (무제한)" : untilStr.replace(/-/g, "") } });   // 옛 Ticket Type 은 지운다 `PC-259`
    logActivity("appkey", `티켓 수정 · ${acc.company} · ${acc.id} · ${rangeText(nr)} · 기간 ${since || "즉시"}~${untilStr}`, me?.name);
    setEditRange(null); resetIssueForm();
    setToast({ ok: true, text: `티켓 수정 — ${rangeText(nr)} · ${since || "즉시"}~${untilStr}` });
  };
  // App Key 발급 — 범위 없이 키만 · 계정당 1개 `PC-208`
  const addKey = () => {
    if (myKey) { setToast({ ok: false, text: "App Key 는 1계정 1키입니다." }); return; }
    const key = issueAppKey(acc, me?.name);
    setIssued(key);
    setToast({ ok: true, text: "App Key 발급 완료 — 계정과 연동되어 서비스 DB에 등록되었습니다." });
  };

  // 발급 · 수정 공용 — 2열 짝 묶음(N Key 발급과 같은 모양) `PC-223`
  //   티켓 속성: Code Type · Section/Owner / Info(티켓 메모)   기간: 사용기간 시작 · 끝 — Ticket Type(= 코드 재사용)은 N Key 에만 `PC-259` · Ticket Version 은 App Key 에 없다 `PC-272`
  //   기간은 티켓별로 유지된다 `PC-117`
  const fixedSt: React.CSSProperties = { ...S.input, background: "#f7f8fa", color: "#6b7280" };
  const attrFields = (
    <FormSec title="티켓 속성" cols={4}>
      {/* 티켓 이름 — 제안 이름(.nkey 파일명 규칙)을 placeholder 로, 비워 두면 그 이름으로 발급 `PC-261` */}
      <div style={{ gridColumn: "1 / -1" }}><Field label="Ticket Name (티켓 이름)">
        <input style={{ ...S.input, fontFamily: "ui-monospace,monospace" }} value={autoName ? suggestName : tname} disabled={!range}
          onChange={(e) => { setAutoName(false); setTname(e.target.value); }}
          onBlur={() => { if (!tname.trim() || autoName) setAutoName(!!suggestName); }}   // 입력 없이 벗어나면 제안 이름을 진하게 `PC-262`
          placeholder={suggestName || "{고객사}_{S}s_{O}o_{Book Size}b_{Page Size}p_{발급일}"} />
      </Field></div>
      <Field label="Code Type (발급 범위 따름)">
        {/* 고른 범위의 할당 타입으로 고정 `PC-220` */}
        <input style={fixedSt} value={range ? ctype : "-"} readOnly title="발급 범위의 코드 타입으로 정해집니다" />
      </Field>
      {/* Owner Size — 범위가 아니면 1 · 고칠 수 없음(Section · Owner 는 발급 범위에서) `PC-265` */}
      <Field label="Owner Size">
        <input style={fixedSt} value={range ? ownerSize : "-"} readOnly title="Owner 개수 — 범위가 아니면 1" />
      </Field>
      {/* 티켓 Info — 티켓 메모(예: sample) `PC-206` */}
      <div style={{ gridColumn: "span 2" }}><Field label="Info (티켓 메모)">
        <input style={S.input} value={info} disabled={!range} onChange={(e) => setInfo(e.target.value)} placeholder="예) sample · 2026 교재용" />
      </Field></div>
    </FormSec>
  );
  // 입력 칸 너비 통일 — 모든 줄 4칸 격자 `PC-236`
  const periodFields = (
    <FormSec cols={4}>
      <Field label="Valid From Time (사용기간 시작)">
        <input type="date" style={S.input} value={since} disabled={!range} onChange={(e) => setSince(e.target.value)} />
      </Field>
      {/* 무제한 체크는 항목명(사용기간 끝) 옆 `PC-237` */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}><label style={{ fontSize: 11, color: "#6b7280" }} title="발급 요청의 period(YYMMDD · 무제한 = 991231) `PC-264`">Valid Until Time (기한)</label>
          <label style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11.5, color: "#374151", whiteSpace: "nowrap", cursor: "pointer" }}>
            <input type="checkbox" checked={unlimited} onChange={(e) => setUnlimited(e.target.checked)} /> 무제한
          </label>
        </div>
        <input type="date" style={{ ...S.input, opacity: unlimited ? 0.5 : 1 }} value={until} disabled={unlimited || !range} min={since || undefined} onChange={(e) => setUntil(e.target.value)} />
      </div>
    </FormSec>
  );

  // 발급 완료 안내(신규·재발급 공용)
  const issuedCard = issued && (
    <div style={{ marginTop: 12, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ fontSize: 12, color: "#92400e", fontWeight: 700, marginBottom: 6 }}>발급 완료 — App Key (서비스 DB 등록됨)</div>
      <div style={{ fontSize: 12.5, color: "#111827", lineHeight: 1.9 }}>
        <div>계정 ID: <code style={{ fontFamily: "ui-monospace,monospace" }}>{acc.id}</code></div>
        <div>PWD: <code style={{ fontFamily: "ui-monospace,monospace" }}>{acc.pwd || "없음"}</code></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          App Key: <code style={{ flex: 1, fontFamily: "ui-monospace,monospace", wordBreak: "break-all" }}>{issued}</code>
          <button onClick={() => { try { navigator.clipboard.writeText(`ID: ${acc.id}\nPWD: ${acc.pwd || "없음"}\nAppKey: ${issued}`); setToast({ ok: true, text: "계정·키 정보가 복사되었습니다." }); } catch { /* */ } }} style={S.smallBtn}>전체 복사</button>
        </div>
      </div>
    </div>
  );

  // App Key — [계정 정보] 안. 1계정 1키 `PC-210` — 이전 정책으로 2개 이상 발급된 계정은 모두 보인다
  const keyCopy = (k: string) => { try { navigator.clipboard.writeText(k); setToast({ ok: true, text: "App Key 가 복사되었습니다." }); } catch { /* */ } };
  const keyBlock = (
    <>
      {keys.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {keys.map((k, i) => (
            <div key={k.id} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", border: "1px solid #e5e7eb", background: "#f7f8fa", borderRadius: 8, padding: "7px 10px", fontSize: 12.5 }}>
              {keys.length > 1 && <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700 }}>{i + 1}</span>}
              {k.key
                ? <code style={{ fontFamily: "ui-monospace,monospace", color: "#2563eb", fontSize: 13, wordBreak: "break-all" }}>{k.key}</code>
                : <span style={{ ...S.tag, background: "#fef3c7", color: "#92400e", fontWeight: 700 }} title="대장에 App Key 값이 적혀 있지 않습니다">키 미기재</span>}
              {k.key && <button onClick={() => keyCopy(k.key)} style={S.smallBtn}>복사</button>}
              <span style={{ flex: 1 }} />
              <span style={{ color: "#9ca3af", fontSize: 11.5 }}>생성 {/^\d{4}-/.test(k.createdAt) ? k.createdAt.slice(0, 10) : "대장"}</span>
            </div>
          ))}
          {keys.length > 1 && (
            <div style={{ fontSize: 11.5, color: "#b45309" }}>이전 정책으로 App Key 가 {keys.length}개 생성된 계정입니다 — 앞으로는 1계정 1앱키이며 새 키는 만들지 않습니다.</div>
          )}
        </div>
      ) : (
        // 옛 대장 계정 중 키가 없는 경우만 — 지금은 계정을 만들면 자동 생성된다
        <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px dashed #e5e7eb", borderRadius: 8, padding: "7px 10px", fontSize: 12.5, color: "#6b7280" }}>
          <span style={{ flex: 1 }}>App Key 가 없는 계정입니다(옛 대장 계정).</span>
          <button onClick={addKey} style={{ ...S.primary, padding: "5px 12px", fontSize: 12 }}>App Key 생성</button>
        </div>
      )}
      {issuedCard}
    </>
  );

  // 티켓 발급 탭 — App Key 를 먼저 발급한 계정에만 `PC-208`. [티켓 수정]도 이 폼에서 고친다 `PC-193`
  const ticketBlock = myKey ? (
    <>
          {/* 코드 범위 발급 — 범위마다 사용기간을 함께 지정 `PC-118`. [티켓 수정]도 이 폼에서 고친다 `PC-193` */}
          <div id="ak-issue-form" />
          {editRange && (() => {
            const r = tickets[editRange.idx];
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "8px 12px", borderRadius: 9, border: "1px solid #93c5fd", background: "#f0f7ff", fontSize: 12.5 }}>
                <b style={{ color: "#1d4ed8" }}>수정 전</b>
                {r && <span style={{ fontFamily: "ui-monospace,monospace", color: "#374151" }}>{rangeText(r)} · {rangePeriod(myKey, r).since || "즉시"}~{rangePeriod(myKey, r).until}</span>}
                <span style={{ color: "#6b7280" }}>· 할당 범위 B{editRange.bound.bookStart}~{editRange.bound.bookEnd} 안에서 고칩니다</span>
              </div>
            );
          })()}
          <Field label="발급 범위 * (Caster 대장 이력 · SOBP 할당 — 고르면 Section · Owner · Book · Code Type 이 채워집니다)">
          <SobpRangePicker company showType ranges={formRanges} value={sobpIdx} onSelect={(i) => { setSobpIdx(i); setBStart(null); setBVol(null); const r = formRanges[i]; if (r) setCtype(CT_OF[r.pt] ?? "PDS3"); }} />
          </Field>
          {/* 구간 사용 현황 — 수정 중이면 자기 자신은 빼고 본다 `PC-195` */}
          {range && <SobpUsage range={range} onPickBook={(b) => setBStart(b)} exclude={editRange ? `${acc.id}#${editRange.idx}` : undefined}
            cand={{ section: range.section, owner: range.owner, bookStart: keyBS, bookEnd: keyBS + keyVol - 1, pageStart: pStart, pageEnd: pStart + keyPVol - 1 }} />}
          {periodFields}   {/* 기간 · 버전을 티켓 속성 위로 `PC-230` */}
          {/* 순서: 기간 → 코드 구간 → 버전 → 티켓 속성 `PC-223` `PC-234` */}
          <FormSec cols={4}>
            <BookRangeFields range={range} bookStart={keyBS} bookVol={keyVol} pageStart={pStart} pageVol={keyPVol}
                              onStart={setBStart} onVol={setBVol} onPStart={setPStart} onPVol={setPVol} />
          </FormSec>
          {attrFields}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 14, paddingTop: 12, borderTop: "1px solid #eef0f4" }}>
            {range && (
              <span style={{ fontSize: 11.5, color: "#6b7280", flex: 1, minWidth: 200 }}>
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
              <button onClick={addRange} disabled={!range} style={{ ...S.primary, ...(!range ? { opacity: 0.5, cursor: "not-allowed" } : {}) }}>티켓 발급</button>
            )}
          </div>
    </>
  ) : (
    <div style={{ border: "1px dashed #e5e7eb", borderRadius: 10, padding: "28px 16px", fontSize: 12.5, color: "#9ca3af", textAlign: "center", lineHeight: 1.8 }}>
      App Key 가 없는 계정입니다. 티켓은 App Key 가 있는 계정에만 발급할 수 있습니다.<br />
      <button onClick={() => setTab("info")} style={{ ...S.linkBtn, fontSize: 12.5 }}>계정 정보에서 App Key 생성</button>
    </div>
  );

  return (
    <div style={embedded ? undefined : { padding: "18px 20px", maxWidth: 900 }}>
      <div style={{ ...S.card, padding: 18 }}>
        {/* 제목은 상단(브레드크럼)에만 두고, 여기서는 **고객사명을 크게** 보여 준다 `PC-069` */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: embedded ? 15 : 20, fontWeight: 800, color: "#111827" }}>{embedded ? acc.id : acc.company}</div>
          {!embedded && <code style={{ fontFamily: "ui-monospace,monospace", color: "#374151", fontSize: 12.5 }}>{acc.id}</code>}
          {embedded && acc.name && <span style={{ fontSize: 12.5, color: "#6b7280" }}>담당자 {acc.name}</span>}
        </div>

        {/* 탭 3개 `PC-062` */}
        <AccTabs tab={tab} onTab={setTab} items={ACC_TABS_DETAIL}
          badge={{ hist: rangeItems.length ? `${rangeItems.length}` : undefined, bill: nTodo ? `미정 ${nTodo}` : undefined,
            perm: `${Object.values(normAppKeyPerms(acc.keyPerms)).filter(Boolean).length}/${APPKEY_PERMS.length}` }} />

        {/* 계정 정보 */}
        <div style={{ ...SEC, marginTop: 0, display: tab === "info" ? "block" : "none" }}>
        <SecHead t="계정 정보" d="· ID(email) · PWD · 고객사는 변경할 수 없습니다" tip="고객사 별 계정 개수 제한 없음 · App Key 는 계정당 1개 발급" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="고객사"><div style={{ ...S.input, background: "#f7f8fa", color: "#6b7280" }}>{acc.company}</div></Field>
          <Field label="NAME (담당자명)"><input style={S.input} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="ID (이메일)"><div style={{ ...S.input, background: "#f7f8fa", color: "#6b7280", fontFamily: "ui-monospace,monospace" }}>{acc.id}</div></Field>
          {/* PWD — 계정을 만들 때만 정하고 화면에서는 수정 불가 `PC-274`
              대장에 비밀번호가 없으면 DB 에도 비워 둔다 · 고객사가 변경을 요청하면 그때 DB 에서 직접 수정 */}
          <Field label="PWD (비밀번호)">
            <div style={{ ...S.input, background: "#f7f8fa", color: acc.pwd ? "#6b7280" : "#9ca3af", fontFamily: acc.pwd ? "ui-monospace,monospace" : undefined }}
              title={acc.pwd ? "비밀번호는 계정을 만들 때만 정합니다 · 변경 요청은 DB 에서 직접 수정" : "비밀번호 없음 — 대장에 없어 DB 에도 두지 않았습니다 · 변경 요청은 DB 에서 직접 수정"}>{acc.pwd || "없음"}</div>
          </Field>
          <Field label="PHONE (전화번호)"><input style={S.input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" /></Field>
          <Field label="HOMEPAGE (홈페이지)"><input style={S.input} value={homepage} onChange={(e) => setHomepage(e.target.value)} placeholder="https://" /></Field>
          <Field label="ADDR (주소)" full><input style={S.input} value={addr} onChange={(e) => setAddr(e.target.value)} /></Field>
          {/* App Key — 1계정 1키 · 계정을 만들 때 자동 생성 `PC-210` */}
          <Field label={keys.length > 1 ? `App Key (${keys.length}개 · 이전 정책)` : "App Key"} full>{keyBlock}</Field>
        </div>
        {/* 사용기간은 계정이 아니라 **코드 범위(=티켓)별 기간**이다 `PC-118` → [App Key 발급] 탭에서 범위 발급 시 설정 */}
        <div style={{ marginTop: 10, fontSize: 11.5, color: "#6b7280", background: "#fafbfc", border: "1px solid #eef0f4", borderRadius: 9, padding: "8px 11px" }}>
          사용기간(시작·끝)은 계정 속성이 아니라 <b>티켓마다 유지되는 기간</b>입니다. <b>[티켓 발급]</b> 탭에서 <b>티켓을 발급할 때</b> 함께 지정합니다.
        </div>
        {acc.note && (
          <div style={{ marginTop: 10, fontSize: 11.5, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 9, padding: "8px 11px", whiteSpace: "pre-line", lineHeight: 1.7 }}>{acc.note}</div>
        )}

        </div>


        {/* 티켓 발급 — 수정 중이면 제목 「티켓 수정」 · 파란 테두리 `PC-194` */}
        <div style={{ ...SEC, marginTop: 0, display: tab === "ticket" ? "block" : "none", ...(editRange ? { borderColor: "#93c5fd", background: "#fbfdff" } : {}) }}>
          {editRange
            ? <SecHead t="티켓 수정" d="· 발급된 티켓의 정보를 고칩니다 — 다른 발급분과 겹치지 않는 구간이면 저장됩니다" />
            : <SecHead t="티켓 발급" d={`· 계정 소속 · 발급된 티켓 ${tickets.length}개`} tip="티켓 = Code Type · Section · Owner · Book · Page · Info · Period. SOBP 가 바뀌면 App Key 대신 티켓을 더 발급합니다. 발급된 티켓은 지우지 않고 [수정]으로 고칩니다(PC-192)." />}
          {ticketBlock}
        </div>

        {/* 티켓 내역 — 지금까지 발급한 티켓(코드 범위)을 표로 본다. 줄을 누르면 그 아래에 Key 정보 `PC-120` `PC-200` */}
        <div style={{ ...SEC, marginTop: 0, display: tab === "hist" ? "block" : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10, fontSize: 12, color: "#6b7280" }}>
            <b style={{ fontSize: 13.5, color: "#111827" }}>티켓 내역</b>
            <span>티켓 <b style={{ color: "#111827" }}>{rangeItems.length}</b>건</span>
            {nTodo > 0 && <span style={{ color: "#dc2626" }}>정산 미정 {nTodo}</span>}
            <span style={{ flex: 1 }} />
          </div>
          {rangeItems.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "#9ca3af", padding: "28px 0", textAlign: "center", border: "1px dashed #e5e7eb", borderRadius: 10, lineHeight: 1.8 }}>
              발급한 티켓이 없습니다.<br />
              <button onClick={() => setTab(myKey ? "ticket" : "info")} style={{ ...S.linkBtn, fontSize: 12.5 }}>{myKey ? "티켓 발급으로" : "계정 정보에서 App Key 생성"}</button>
            </div>
          ) : (
            <div style={{ border: "1px solid #eef0f4", borderRadius: 10, overflow: "hidden" }}>
              {rangeItems.map(({ k, r, i }, n) => {
                const isSel = !!selected && selected.i === i;
                const p = rangePeriod(k, r);
                const t = r.ticketId ? ticketById(r.ticketId) : undefined;
                const at = [t?.at, r.since, k?.createdAt].map((x) => (x ?? "").slice(0, 10)).find((x) => /^\d{4}-\d{2}-\d{2}$/.test(x));
                const ledger = t ? t.src === "ledger" : !!acc.seeded;   // 원장 티켓이 없으면 대장 시드분
                // Owner — 범위가 아니면 1개(그 번호만) `PC-264`
                const own = r.ownerEnd != null && r.ownerEnd !== r.owner ? `${r.owner}~${r.ownerEnd}` : `${r.owner}`;
                const ct = CT_OF[r.pt] ?? r.pt;   // Code Type(= 발급 요청 ncodetype) — 따로 「Type」 코드를 두지 않는다 `PC-264`
                const bs = r.bookStart, be = r.bookEnd ?? (bs != null && r.bookVol ? bs + r.bookVol - 1 : bs);
                const ps = r.pageStart, pe = r.pageEnd ?? (ps != null && r.pageVol ? ps + r.pageVol - 1 : ps);
                const span = (a?: number | null, z?: number | null) => (a == null ? "전체" : z == null || z === a ? `${a}` : `${a}~${z}`);
                return (
                  <div key={i} style={{ borderTop: n ? "1px solid #f1f3f6" : "none" }}>
                    <div onClick={() => { if (isSel) setOpenKey((v) => !v); else { setSelRange({ keyId: 0, idx: i }); setOpenKey(true); } }}
                      title="누르면 아래에 이 티켓의 Key 정보가 열립니다(다시 누르면 접힘)"
                      style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", cursor: "pointer", background: isSel ? "#f0f7ff" : "#fff" }}>
                      <span style={{ width: 18, flex: "0 0 18px", paddingTop: 2, fontSize: 11.5, color: isSel ? "#2563eb" : "#9ca3af", fontWeight: 700 }}>{n + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* 티켓 이름 `PC-261` */}
                        {r.name && <div style={{ fontFamily: "ui-monospace,monospace", fontSize: 12, fontWeight: 700, color: "#111827", marginBottom: 4, wordBreak: "break-all" }}>{r.name}</div>}
                        {/* 티켓 = Code Type · Section · Owner · Book · Page · Info · Period `PC-206` `PC-264` */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <code style={{ fontFamily: "ui-monospace,monospace", fontSize: 11.5, fontWeight: 700, color: "#1d4ed8" }} title="Code Type">{ct}</code>
                          <SobpChips s={r.section} o={own} b={span(bs, be)} p={span(ps, pe)} small />
                          {ticketInfo(r) && <span style={{ fontSize: 11.5, color: "#374151" }} title="Info">{ticketInfo(r)}</span>}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 5, fontSize: 11.5, color: "#6b7280" }}>
                          {at ? <span style={{ fontFamily: "ui-monospace,monospace" }}>{at}</span> : null}
                          {ledger && <span style={{ ...S.tag, background: "#f3f4f6", color: "#6b7280" }} title="개발팀 대장에서 들어온 발급분">대장</span>}
                          <span style={{ color: "#d1d5db" }}>·</span>
                          <span>{rangeBooks(r) != null ? `${rangeBooks(r)!.toLocaleString()}권` : "권수 —"}</span>
                          <span style={{ color: "#d1d5db" }}>·</span>
                          <span title="Period = 기한(사용기간 끝) YYMMDD — 무제한 = 991231">기한 <b style={{ fontFamily: "ui-monospace,monospace", color: "#374151" }}>{periodCode(p.until)}</b></span>
                          <span style={{ color: "#d1d5db" }}>·</span>
                          <span>{p.since || "즉시"} ~ {p.until}</span>
                        </div>
                      </div>
                      <BillTag v={r} />
                      <span style={{ fontSize: 10, color: "#9ca3af", paddingTop: 5, transform: isSel && openKey ? "rotate(90deg)" : "none", transition: "transform .15s" }}>▶</span>
                    </div>
                    {isSel && openKey && (() => {
                      // Key 정보 — App Key 관리 대장(Caster 계정 · 퍼미션 · 티켓)과 같은 순서 `PC-272`
                      //   계정(고객사 · 계정 · App Key) → 티켓(Code Type · Section · Owner · Book · Page) → 사용기간 → 메모
                      //   Ticket Version 은 App Key 에 없다 · Period 는 Valid Until Time(기한)으로 · 비어 있는 기한은 무제한
                      const from0 = p.since || (at ?? "");
                      const nB = rangeBooks(r), nP = r.pageVol ?? (ps != null && pe != null ? pe - ps + 1 : null);
                      const params = {
                        "Company Name": acc.company, "Account Id": acc.id, "App Key": k?.key || "미기재",
                        "Ticket Name": r.name || "-", "Code Type": ct,
                        Section: r.section, Owner: own,
                        "Owner Size": r.ownerEnd != null && r.ownerEnd > r.owner ? r.ownerEnd - r.owner + 1 : 1,
                        Book: `${span(bs, be)}${nB != null ? ` (${nB.toLocaleString()}권)` : ""}`,
                        Page: `${span(ps, pe)}${nP != null ? ` (${nP.toLocaleString()}쪽)` : ""}`,
                        "Valid From Time": from0 || "-",
                        "Valid Until Time": !p.until || p.until === "무제한" ? "무제한" : p.until,
                        Info: ticketInfo(r) || "-",
                      } as Record<string, string | number>;
                      return (
                        <div style={{ padding: "10px 12px 12px", background: "#fbfdff", borderTop: "1px solid #e0ecff" }}>
                          <KeyCard title="Key 정보" empty="" params={params} />
                          {/* [티켓 수정] — N Key · 서비스 티켓과 같은 자리: 상세(Key 정보) 아래 오른쪽 `PC-238`
                              발급된 티켓은 지우지 않고 [티켓 발급] 폼에서 고친다 `PC-192` `PC-193` */}
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 18, paddingTop: 14, borderTop: "1px solid #eef0f4" }}>
                            <span style={{ flex: 1 }} />
                            <button onClick={() => startEdit(k, i)} style={S.primary}>티켓 수정</button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 권한 탭 — App Key 가 가지는 Caster 권한 20항목 true / false `PC-207` */}
        <div style={{ ...SEC, marginTop: 0, display: tab === "perm" ? "block" : "none" }}>
          <KeyPermsEditor key={acc.id} value={acc.keyPerms} fixed={!!(acc.seeded || acc.keyPermsFixed)}
            onSave={(v) => { caster.setKeyPerms(acc.id, v); logActivity("appkey", `App Key 권한 · ${acc.company} · ${acc.id} · true ${Object.values(v).filter(Boolean).length}/${APPKEY_PERMS.length}`, me?.name); }} />
        </div>

        {/* 정산 탭 — 티켓(코드 범위)을 고르고 그 정산을 등록한다. N Key 관리의 정산 탭과 같은 결 `PC-177` `PC-178` */}
        <div style={{ ...SEC, marginTop: 0, display: tab === "bill" ? "block" : "none" }}>
          {/* 연간 라이선스 비용 — 고객사마다 1건(App Key) · 키 발급으로 생기는 비용 `PC-212` */}
          {/* 연간 라이선스는 App Key 관리 오른쪽 칸 맨 위 탭으로 옮겼다 `PC-270` */}
          <SecHead t="정산할 티켓" d={`· 티켓마다 등록 · 미정 ${nTodo}건`} />
          {rangeItems.length === 0 ? (
            <div style={{ fontSize: 12, color: "#9ca3af", padding: "6px 0" }}>발급된 티켓이 없습니다. [티켓 발급] 탭에서 먼저 발급하세요.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 4 }}>
              {rangeItems.map(({ k, r, i }) => {
                const isSel = !!selected && selected.i === i;
                const p = rangePeriod(k, r);
                return (
                  <div key={i} onClick={() => setSelRange({ keyId: 0, idx: i })} title="선택하면 아래에서 이 티켓의 정산을 등록합니다"
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
            <BillingEditor key={selected.i} v={selected.r} baseDate={selected.r.since || (selected.k?.createdAt ?? "").slice(0, 10)}
              onSave={(p) => {
                caster.setTicketBilling(acc.id, selected.i, { ...p, billedBy: me?.name ?? "" });   // 티켓마다 정산 `PC-206`
                if (selected.r.ticketId) setBilling(selected.r.ticketId, { ...p, by: me?.name ?? "" });   // 원장 티켓에도 같은 값
                logActivity("billing", `App Key 정산 · ${acc.company} · ${acc.id} · ${rangeText(selected.r)} · ${p.billing}${p.billing === "유료" ? ` ${fmtMoney(p)}` : ""}`, me?.name);
              }} />
          )}
        </div>

        {/* 이동·저장 버튼은 화면 맨 아래에 모은다 `PC-069` · 티켓 수정 중에는 숨긴다 `PC-194` */}
        {/* 계정 저장 · 삭제는 [계정 정보] 탭에서만 `PC-200` */}
        <div style={{ display: editRange || tab !== "info" ? "none" : "flex", alignItems: "center", gap: 8, marginTop: 16 }}>
          {!embedded && <Link href="/tickets/account" style={{ ...S.ghost, textDecoration: "none" }}>목록</Link>}
          <span style={{ flex: 1 }} />
          {/* 발급된 티켓이 있는 계정은 지우지 않는다(티켓 삭제 없음) `PC-192` */}
          <button disabled={keys.length + tickets.length > 0} title={keys.length + tickets.length ? "App Key 나 티켓이 발급된 계정은 삭제할 수 없습니다" : undefined}
            onClick={() => { if (confirm("이 계정을 삭제할까요?")) { caster.removeAccount(acc.id); if (onDeleted) onDeleted(); else router.push("/tickets/account"); } }}
            style={{ ...S.ghost, color: "#dc2626", borderColor: "#fecaca", opacity: keys.length + tickets.length ? 0.4 : 1, cursor: keys.length + tickets.length ? "not-allowed" : "pointer" }}>계정 삭제</button>
          <button onClick={save} style={S.primary}>저장</button>
        </div>
        {toast && <div style={{ marginTop: 10, fontSize: 12.5, color: toast.ok ? "#047857" : "#dc2626", textAlign: "right" }}>{toast.text}</div>}
      </div>
    </div>
  );
}
