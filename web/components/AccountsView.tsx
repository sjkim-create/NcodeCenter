"use client";

// 계정 발급 — TKT-03 계정 목록 / TKT-06 계정 등록·수정
// 목록에서 [＋ 계정 추가] → 등록 화면(① 계정 정보 → ② 사용처·권한),
// 목록의 계정을 누르면 상세·수정 화면에서 정보를 고치고 App Key 를 추가·삭제한다.
// ② 는 서비스 탭 구조 — 사용처는 중복 선택하고, 조건은 선택한 탭의 서비스 것만 보인다.
// App Key 는 CasterN 전용 조건이라 CasterN 탭 안에서만 노출한다.
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { S, Field, BLUE } from "./ui";
import { useStore } from "@/lib/store";
import { useAuth, currentUser } from "@/lib/authStore";
import { logActivity } from "@/lib/activityStore";
import { addTicket, hydrateTickets, ticketsOfAccount, useTickets } from "@/lib/ticketStore";
import { SobpRangePicker, type SobpRange } from "./TicketsView";
import { servicesOfCompany } from "@/lib/serviceCustomers";
import { codeKind, patternOf, patternTypeParam, CODE_KINDS, type CodeKind, type TicketPattern } from "@/lib/codeKind";
import {
  caster, useCaster, genAppKey, ACCOUNT_SERVICES, accountServiceLabel, accountServiceReady,
  CASTERN_PERMS, ALL_PERMS, permLabel, casternPerms, hasService,
  type AccountService, type CasterPerm, type CasterAccount, type AccountSettings,
} from "@/lib/accountStore";

const accountHref = (id: string, tab?: AccTab) =>
  `/tickets/account/${encodeURIComponent(id)}${tab && tab !== "info" ? `?tab=${tab}` : ""}`;
const PAGE_DEFAULT = 512;   // Page 볼륨 기본값 — N Key 발급과 같은 값 `PC-059`
// 범위의 pt → 코드 종류 `PC-064`
const CT_OF: Record<string, CodeKind> = { PDS3: "PDS3", PDS2: "PDS2", Scode: "PDS4", OID: "OID" };

/* ── TKT-03 계정 목록 ───────────────────────────────────────────── */
export function AccountsListView() {
  const router = useRouter();          // 레코드 클릭 → 상세 `PC-053`
  const { companies } = useStore();
  const cast = useCaster();
  const [fCo, setFCo] = useState(0);
  const [fSvc, setFSvc] = useState<"" | AccountService>("");
  const [q, setQ] = useState("");

  const rows = cast.accounts
    .filter((a) => (fCo ? a.companyId === fCo : true))
    .filter((a) => (fSvc ? hasService(a, fSvc) : true))
    .filter((a) => (q ? `${a.id} ${a.name} ${a.company}`.toLowerCase().includes(q.toLowerCase()) : true));
  const keysOf = (id: string) => cast.appKeys.filter((k) => k.accountId === id);
  const coOpts = companies.filter((c) => cast.accounts.some((a) => a.companyId === c.id));

  return (
    <div style={{ padding: "18px 20px" }}>
      {/* 요약 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 12 }}>
        {[
          ["등록 계정", cast.accounts.length.toLocaleString(), "#111827"],
          ["App Key 연동", cast.accounts.filter((a) => keysOf(a.id).length).length.toLocaleString(), "#2563eb"],
          ["App Key 없음", cast.accounts.filter((a) => !keysOf(a.id).length).length.toLocaleString(), "#92400e"],
          ["발급 App Key", cast.appKeys.length.toLocaleString(), "#7c3aed"],
        ].map(([l, v, c]) => (
          <div key={l} style={{ ...S.card, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: "#6b7280" }}>{l}</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* 필터 + 계정 추가 */}
      <div style={{ ...S.card, padding: "10px 12px", marginBottom: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 12.5 }}>
        <select value={fCo} onChange={(e) => setFCo(+e.target.value)} style={{ ...S.input, width: 200 }}>
          <option value={0}>고객사 전체</option>
          {coOpts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={fSvc} onChange={(e) => setFSvc(e.target.value as AccountService | "")} style={{ ...S.input, width: 170 }}>
          <option value="">사용 서비스 전체</option>
          {ACCOUNT_SERVICES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ID(email) · 이름 · 고객사 검색" style={{ ...S.input, width: 240 }} />
        <span style={{ color: "#9ca3af" }}>{rows.length}건</span>
        <span style={{ flex: 1 }} />
        <Link href="/tickets/account/new" style={{ ...S.primary, textDecoration: "none" }}>＋ 계정 추가</Link>
      </div>

      {/* 목록 */}
      <div style={{ ...S.card, padding: 0, overflowX: "auto" }}>
        <table style={{ ...S.table, minWidth: 1120 }}>
          <thead>
            <tr>{["고객사", "ID (EMAIL)", "이름", "사용 서비스", "App Key", "등록일", ""].map((h) => (
              <th key={h} style={S.th}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const keys = keysOf(a.id);
              const svcs = a.services ?? [];
              return (
                // 레코드를 누르면 상세로 간다 `PC-053` — 항목마다 그 항목의 탭으로 `PC-067`
                <tr key={a.id} onClick={() => router.push(accountHref(a.id))} title="클릭하면 계정 정보"
                  style={{ borderTop: "1px solid #eef0f4", cursor: "pointer" }}>
                  <td style={S.td}>{a.company}</td>
                  <td style={{ ...S.td, fontFamily: "ui-monospace,monospace", color: "#2563eb", fontWeight: 600 }}>{a.id}</td>
                  <td style={S.td}>{a.name || "—"}</td>
                  {/* 사용 서비스 → [사용 서비스 및 권한] 탭 `PC-067` */}
                  <td style={S.td} title="클릭하면 사용 서비스 및 권한"
                    onClick={(e) => { e.stopPropagation(); router.push(accountHref(a.id, "svc")); }}>
                    {svcs.length === 0
                      ? <span style={{ ...S.tag, background: "#fef2f2", color: "#b91c1c", fontWeight: 700 }}>미지정</span>
                      : <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
                          {svcs.map((sv) => (
                            <span key={sv} title={accountServiceReady(sv) ? undefined : "권한·설정 준비중"}
                              style={{ ...S.tag, background: "#ecfdf5", color: "#047857", fontWeight: 700, ...(accountServiceReady(sv) ? {} : { background: "#f3f4f6", color: "#6b7280" }) }}>
                              {accountServiceLabel(sv)}{accountServiceReady(sv) ? "" : " · 준비중"}
                            </span>
                          ))}
                        </span>}
                  </td>
                  {/* App Key → [App Key 발급] 탭 · 키 값을 그대로 보여 준다 `PC-067` */}
                  <td style={{ ...S.td, textAlign: "left" }} title="클릭하면 App Key 발급"
                    onClick={(e) => { e.stopPropagation(); router.push(accountHref(a.id, "key")); }}>
                    {keys.length === 0
                      ? <span style={{ ...S.tag, background: "#f3f4f6", color: "#9ca3af" }}>미발급</span>
                      : <code style={{ fontFamily: "ui-monospace,monospace", fontSize: 11, color: "#2563eb", wordBreak: "break-all" }}>{keys[0].key}</code>}
                  </td>
                  <td style={{ ...S.td, fontFamily: "ui-monospace,monospace", color: "#6b7280" }}>{a.createdAt?.slice(0, 10)}</td>
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

// 화면 탭 — 계정 정보 · 사용 서비스 및 권한 · App Key 발급 `PC-062`
export type AccTab = "info" | "svc" | "key";
const ACC_TABS: { v: AccTab; label: string }[] = [
  { v: "info", label: "계정 정보" },
  { v: "svc", label: "사용 서비스 및 권한" },
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

// CasterN 권한 6종 — 개별 선택 / [모두 선택]·[모두 해제] `PC-058`
function PermPicker({ value, onChange }: { value: CasterPerm[]; onChange: (v: CasterPerm[]) => void }) {
  const all = value.length === ALL_PERMS.length;
  const toggle = (p: CasterPerm) => onChange(value.includes(p) ? value.filter((x) => x !== p) : [...value, p]);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 11.5, color: "#6b7280" }}>선택 {value.length} / {ALL_PERMS.length}</span>
        <span style={{ flex: 1 }} />
        <button onClick={() => onChange(all ? [] : [...ALL_PERMS])} style={S.smallBtn}>{all ? "모두 해제" : "모두 선택"}</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(215px, 1fr))", gap: 6 }}>
        {CASTERN_PERMS.map((p) => {
          const on = value.includes(p.v);
          return (
            <label key={p.v} title={p.desc}
              style={{ display: "flex", alignItems: "center", gap: 7, border: `1px solid ${on ? "#c7ddff" : "#eef0f4"}`, background: on ? "#f7faff" : "#fff", borderRadius: 9, padding: "8px 10px", fontSize: 12.5, cursor: "pointer" }}>
              <input type="checkbox" checked={on} onChange={() => toggle(p.v)} />
              <span style={{ color: on ? "#1d4ed8" : "#374151", fontWeight: on ? 700 : 400 }}>{p.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

// 사용처(연동 서비스) — 중복 선택. 한 계정으로 여러 서비스를 쓸 수 있다.
// 사용처 · 서비스별 조건 — 탭 구조.
// 탭 = 서비스 / 패널 = 그 서비스의 사용 여부 + 자기 조건.
// 선택한 서비스의 설정이 아래로 쌓이지 않도록 한 번에 한 서비스만 보여준다.
// casternExtra — CasterN 에만 딸린 조건(App Key 발급). CasterN 탭 안에서만 노출된다.
function ServiceTabs({ services, settings, onServices, onSettings, casternExtra }: {
  services: AccountService[];
  settings: AccountSettings;
  onServices: (v: AccountService[]) => void;
  onSettings: (v: AccountSettings) => void;
  casternExtra?: ReactNode;
}) {
  const [tab, setTab] = useState<AccountService>("CASTERN");
  const meta = ACCOUNT_SERVICES.find((x) => x.v === tab);
  const on = services.includes(tab);
  const toggle = () => onServices(on ? services.filter((x) => x !== tab) : [...services, tab]);

  return (
    <div style={{ border: "1px solid #eef0f4", borderRadius: 10, overflow: "hidden" }}>
      {/* 탭 바 — 체크된 서비스에 ✓ */}
      <div style={{ display: "flex", borderBottom: "1px solid #eef0f4", background: "#fafbfc" }}>
        {ACCOUNT_SERVICES.map((sv) => {
          const active = sv.v === tab;
          const picked = services.includes(sv.v);
          return (
            <button key={sv.v} onClick={() => setTab(sv.v)} title={sv.desc}
              style={{ flex: 1, border: 0, borderBottom: `2px solid ${active ? BLUE : "transparent"}`,
                background: active ? "#fff" : "transparent", padding: "9px 10px", fontSize: 12.5, cursor: "pointer",
                color: active ? "#111827" : "#6b7280", fontWeight: active ? 700 : 400,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 5, whiteSpace: "nowrap" }}>
              <span style={{ color: picked ? "#047857" : "#d1d5db", fontWeight: 700 }}>{picked ? "✓" : "○"}</span>
              {sv.label}
              {!sv.ready && <span style={{ ...S.tag, background: "#fff7ed", color: "#c2410c", fontSize: 10 }}>준비중</span>}
            </button>
          );
        })}
      </div>

      {/* 패널 — 현재 탭 서비스의 조건만 */}
      <div style={{ padding: "12px 14px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, cursor: "pointer" }}>
          <input type="checkbox" checked={on} onChange={toggle} />
          <b style={{ color: on ? "#1d4ed8" : "#374151" }}>{meta?.label ?? tab}</b>
          <span style={{ color: "#9ca3af", fontSize: 11.5 }}>· {meta?.desc}</span>
        </label>

        <div style={{ marginTop: 10 }}>
          {!on ? (
            <div style={{ fontSize: 11.5, color: "#9ca3af" }}>사용 서비스로 선택하면 이 서비스의 조건을 설정할 수 있습니다.</div>
          ) : tab === "CASTERN" ? (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
                사용자 권한 <span style={{ fontWeight: 400, color: "#9ca3af" }}>· 개별 또는 모두 선택</span>
              </div>
              <PermPicker
                value={settings.CASTERN?.perms ?? []}
                onChange={(perms) => onSettings({ ...settings, CASTERN: { ...settings.CASTERN, perms } })}
              />
              {casternExtra && (
                <div style={{ marginTop: 14, borderTop: "1px solid #eef0f4", paddingTop: 12 }}>{casternExtra}</div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.6, border: "1px solid #eef0f4", background: "#fafbfc", borderRadius: 9, padding: "10px 12px" }}>
              <b style={{ color: "#c2410c" }}>준비중</b> — 이 서비스의 권한·설정 항목은 아직 정의되지 않았습니다. 사용 서비스 연동만 등록됩니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const genPwdStr = () => {
  const buf = new Uint8Array(9);
  (globalThis.crypto ?? window.crypto).getRandomValues(buf);
  return btoa(String.fromCharCode(...buf)).replace(/[+/=]/g, "").slice(0, 10);
};
// App Key 값 생성은 스토어의 규칙을 그대로 쓴다 — 영문·숫자 29자 `PC-066`
const genKeyStr = genAppKey;

// 고객사가 할당받은 SOBP 범위 목록
function useRanges(companyId: number): SobpRange[] {
  const { projects } = useStore();
  return useMemo(() => {
    if (!companyId) return [];
    return projects.filter((p) => p.companyId === companyId).flatMap((p) => p.issued.map((b) => {
      const pt = patternOf(codeKind(b.kind, b.section));
      return { pt, section: b.section, owner: b.owner, bookStart: b.bookStart, bookEnd: b.bookEnd,
        pageStart: b.pageStart, pageEnd: b.pageEnd, bookCount: Math.max(1, b.bookEnd - b.bookStart + 1) };
    }));
  }, [projects, companyId]);
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
                     pageStart: number, pageVol: number, ctype: CodeKind, until: string, by?: string) {
  const services = acc.services ?? [];
  const bs = bookStart, be = bookStart + bookVol - 1;
  const key = genKeyStr();
  const rec = caster.addAppKey({ key, accountId: acc.id, services, company: acc.company, pt: range.pt,
    section: range.section, owner: range.owner, bookStart: bs, bookEnd: be, bookVol,
    pageStart, pageEnd: pageStart + pageVol - 1, pageVol, until });
  if (!rec) return "";                                  // 이미 발급된 계정
  const svcText = services.map(accountServiceLabel).join(" · ") || "미지정";
  const summary = `계정 ${acc.id} · ${svcText} · ${range.pt} S${range.section}/O${range.owner}/B${bs}~${be}(${bookVol}권) · P${pageStart}~${pageStart + pageVol - 1} · ${until}`;
  addTicket({ kind: "APP", companyId: acc.companyId, company: acc.company, accountId: acc.id, by: by ?? "", summary,
    params: {
      "Company Name": acc.company, "Account Id": acc.id, Service: svcText, Usage: svcText,
      "App Key": key,
      "Issued Time": new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, ""),
      "Valid Until Time": until === "무제한" ? "99999999 (무제한)" : until.replace(/-/g, ""),
      Section: range.section, Owner: range.owner,
      "Ticket Version": 1,
      "Book Start": bs, "Book Volume": bookVol, "Book End": be,
      "Page Start": pageStart, "Page Volume": pageVol, "Page End": pageStart + pageVol - 1,
      "Code Type": ctype,
      "Ticket Type": until === "무제한" ? "Unlimited" : "Period",
    } });
  logActivity("ticket", `App Key · ${acc.company} · ${summary} · ${key}`, by);
  return key;
}

/* ── TKT-06 계정 등록 ───────────────────────────────────────────── */
export function AccountNewView() {
  const router = useRouter();
  const { companies } = useStore();
  const me = currentUser(useAuth());
  useCaster();
  useEffect(() => { hydrateTickets(); }, []);   // App Key 발급분이 Key 발급 목록에 쌓이도록 원장 로드

  const [companyId, setCompanyId] = useState(0);
  const [id, setId] = useState("");
  const [pwd, setPwd] = useState("");
  const [name, setName] = useState("");
  const [addr, setAddr] = useState("");
  const [homepage, setHomepage] = useState("");
  const [services, setServices] = useState<AccountService[]>(["CASTERN"]);
  const [settings, setSettings] = useState<AccountSettings>({ CASTERN: { perms: [...ALL_PERMS] } });
  const [tab, setTab] = useState<AccTab>("info");        // 화면 탭 `PC-062`
  const [sobpIdx, setSobpIdx] = useState(-1);
  const [bStart, setBStart] = useState<number | null>(null);
  const [bVol, setBVol] = useState<number | null>(null);
  const [pStart, setPStart] = useState(1);              // 계정별 Page 영역 `PC-059`
  const [ctype, setCtype] = useState<CodeKind>("PDS3"); // Code Type — 직접 고른다 `PC-064`
  const [pVol, setPVol] = useState<number | null>(null);
  const [until, setUntil] = useState("");
  const [unlimited, setUnlimited] = useState(true);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  const company = companies.find((c) => c.id === companyId);
  const ranges = useRanges(companyId);
  const { projects } = useStore();
  const range = ranges[sobpIdx];

  const hasCastern = services.includes("CASTERN");

  // 사용처를 새로 켜면 그 서비스의 기본 설정을 채운다. (CasterN 은 전체 권한이 기본)
  const onServices = (next: AccountService[]) => {
    setServices(next);
    if (next.includes("CASTERN") && !settings.CASTERN) setSettings({ ...settings, CASTERN: { perms: [...ALL_PERMS] } });
  };

  const onCompany = (cid: number) => {
    setCompanyId(cid); setSobpIdx(-1);
    const c = companies.find((x) => x.id === cid);
    if (c) setAddr(c.address || "");        // 고객사 주소 자동 입력
    // 사용처는 **SOBP 맵에서 지정한 사용 서비스**를 그대로 체크한다 `PC-057`
    //   casterN → CasterN · 폼솔루션 → 폼솔루션 · SDK 연동(코드만 할당) → SDK
    const map: Record<string, AccountService> = { CASTERN: "CASTERN", FORMSOLUTION: "FORMSOLUTION", NONE: "SDK" };
    const next = [...new Set(servicesOfCompany(cid, projects).map((v) => map[v]).filter(Boolean))] as AccountService[];
    if (!next.length) return;
    setServices(next);
    setSettings(next.includes("CASTERN") ? { CASTERN: { perms: [...ALL_PERMS] } } : {});
  };

  const submit = () => {
    if (!company) { setToast({ ok: false, text: "회사(고객사)를 선택하세요." }); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(id.trim())) { setToast({ ok: false, text: "계정 ID는 이메일 형식이어야 합니다." }); return; }
    if (!pwd.trim()) { setToast({ ok: false, text: "비밀번호가 필요합니다. (요청 없으면 [임의 생성])" }); return; }
    if (services.length === 0) { setToast({ ok: false, text: "사용 서비스를 1개 이상 선택하세요." }); return; }
    // App Key 는 CasterN 전용 — 사용처에서 CasterN 이 빠졌으면 함께 발급하지 않는다.
    const wantKey = !!range;   // 범위를 골랐으면 함께 발급한다 `PC-071`

    // 선택하지 않은 사용처의 설정은 저장하지 않는다.
    const kept: AccountSettings = {};
    for (const sv of services) if (settings[sv]) kept[sv] = settings[sv];

    const acc: CasterAccount = {
      id: id.trim(), pwd: pwd.trim(), name: name.trim(), services, settings: kept,
      companyId: company.id, company: company.name, addr: addr.trim(), homepage: homepage.trim(),
      createdAt: "",
    };
    const r = caster.addAccount(acc);
    if (!r.ok) { setToast({ ok: false, text: r.msg }); return; }
    logActivity("ticket", `계정 등록 · ${company.name} · ${acc.id} · ${services.map(accountServiceLabel).join(" · ")}`, me?.name);
    if (wantKey && range) issueAppKey(acc, range, keyBS, keyVol, pStart, keyPVol, ctype, unlimited ? "무제한" : (until || "무제한"), me?.name);
    router.push("/tickets/account");        // 목록에 노출
  };

  // App Key 발급 — **사용처 전체 공통 · 계정당 1개** `PC-050`
  const keyBS = bStart ?? range?.bookStart ?? 0;
  const keyVol = Math.max(1, Math.min(bVol ?? (range?.bookCount ?? 1), range ? range.bookEnd - keyBS + 1 : 1));
  const keyPVol = Math.max(1, pVol ?? PAGE_DEFAULT);
  // 체크박스 없이 **탭을 열면 바로 입력**한다 — 범위를 고르면 발급, 안 고르면 계정만 등록 `PC-071`
  const appKeyBlock = (
    <div>
      <div style={{ fontSize: 11.5, color: "#6b7280", marginBottom: 5 }}>SOBP 맵에서 발급된 S / O <span style={{ color: "#9ca3af" }}>(고르면 Book 범위가 따라옵니다 · 고르지 않으면 계정만 등록)</span></div>
      <SobpRangePicker company={!!company} ranges={ranges} value={sobpIdx} onSelect={(i) => { setSobpIdx(i); setBStart(null); setBVol(null); const r = ranges[i]; if (r) setCtype(CT_OF[r.pt] ?? "PDS3"); }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 12 }}>
        <BookRangeFields range={range} bookStart={keyBS} bookVol={keyVol} pageStart={pStart} pageVol={keyPVol}
                          onStart={setBStart} onVol={setBVol} onPStart={setPStart} onPVol={setPVol} />
      </div>
      {/* 고르는 값 — Code Type · 만료일 `PC-071` */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 10, marginTop: 10 }}>
        <Field label="Code Type">
          <select style={S.input} value={ctype} disabled={!range} onChange={(e) => setCtype(e.target.value as CodeKind)}>
            {CODE_KINDS.map((k) => <option key={k.v} value={k.v}>{k.short}</option>)}
          </select>
        </Field>
        <Field label="만료일 (기간)">
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="date" style={{ ...S.input, opacity: unlimited ? 0.5 : 1 }} value={until} disabled={unlimited} onChange={(e) => setUntil(e.target.value)} />
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

        {/* 탭 3개 — 계정 정보 · 사용 서비스 및 권한 · App Key 발급 `PC-062` */}
        <AccTabs tab={tab} onTab={setTab} badge={{ svc: `${services.length}/${ACCOUNT_SERVICES.length}`, key: range ? "발급" : undefined }} />

        {/* 계정 정보 */}
        <div style={{ ...SEC, marginTop: 0, display: tab === "info" ? "block" : "none" }}>
        <SecHead t="계정 정보" d="· 서비스 로그인 계정" tip="고객사 별 계정 개수 제한 없음 · App Key 는 계정당 1개 발급 (사용 서비스 전체 공통)" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="회사정보 (고객사) *">
            <select style={S.input} value={companyId} onChange={(e) => onCompany(+e.target.value)}>
              <option value={0}>- 선택 -</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="NAME (담당자/사용자명)"><input style={S.input} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="ID (EMAIL) *"><input style={S.input} value={id} onChange={(e) => setId(e.target.value)} placeholder="user@company.com" /></Field>
          <Field label="PWD *">
            <div style={{ display: "flex", gap: 6 }}>
              <input style={S.input} value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="비밀번호 미요청 시 임의 생성" />
              <button onClick={() => setPwd(genPwdStr())} style={{ ...S.smallBtn, whiteSpace: "nowrap" }} title="비밀번호를 요청하지 않는 고객사(SDK)는 담당자가 임의 지정">임의 생성</button>
            </div>
          </Field>
          <Field label="ADDR (주소)"><input style={S.input} value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="고객사 주소 자동 · 수정 가능" /></Field>
          <Field label="HOMEPAGE"><input style={S.input} value={homepage} onChange={(e) => setHomepage(e.target.value)} placeholder="https://" /></Field>
        </div>

        </div>

        {/* App Key 발급 */}
        <div style={{ ...SEC, marginTop: 0, display: tab === "key" ? "block" : "none" }}>
          <SecHead t="App Key 발급" d="· 계정당 1개" tip="고객사 별 계정 개수 제한 없음 · App Key 는 계정당 1개 발급 (사용 서비스 전체 공통)" />
          {appKeyBlock}
        </div>

        {/* 사용 서비스 및 권한 — 서비스마다 그 조건만 노출 */}
        <div style={{ ...SEC, marginTop: 0, display: tab === "svc" ? "block" : "none" }}>
          <SecHead t="사용 서비스 및 권한" d="· 서비스를 고르고 · 서비스마다 조건이 다릅니다" />
          <div style={{ fontSize: 10.5, color: "#9ca3af", marginBottom: 6, lineHeight: 1.5 }}>
            사용 서비스는 <b>중복 선택</b>할 수 있습니다. 여러 서비스를 선택하면 <b>한 계정으로 각 서비스에 로그인</b>하며, 각 서비스는 자기 계정만 관리·인증합니다.
            <span style={{ marginLeft: 6 }}>선택 <b>{services.length}</b> / {ACCOUNT_SERVICES.length}</span>
          </div>
          <ServiceTabs services={services} settings={settings} onServices={onServices} onSettings={setSettings} />
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
  const [services, setServices] = useState<AccountService[]>([]);
  const [settings, setSettings] = useState<AccountSettings>({});
  const [loaded, setLoaded] = useState(false);
  const sp = useSearchParams();
  const tab0 = (sp.get("tab") as AccTab) || "info";            // 목록에서 누른 항목의 탭 `PC-067`
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
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  // 계정 값 주입 (최초 1회 — 편집 중 스토어 변경에 덮이지 않도록)
  useEffect(() => {
    if (!acc || loaded) return;
    setName(acc.name); setPwd(acc.pwd); setAddr(acc.addr); setHomepage(acc.homepage);
    setServices(acc.services ?? []); setSettings(acc.settings ?? {});
    setLoaded(true);
  }, [acc, loaded]);

  const ranges = useRanges(acc?.companyId ?? 0);
  const range = ranges[sobpIdx];
  const keys = cast.appKeys.filter((k) => k.accountId === accountId);
  // App Key 는 **계정당 1개**이고 **사용처 전체에 공통**이다 `PC-050`
  const myKey = keys[0];
  // 이 계정에 매핑된 티켓(Key 정보) — 계정 : App Key = 1:1 · 계정 : N Key = 1:1 `PC-059`
  useTickets();
  const myTickets = ticketsOfAccount(accountId);
  const appTicket = myTickets.find((x) => x.kind === "APP");
  const keyable = (acc?.services ?? []).length > 0 && !myKey;

  // 사용처를 새로 켜면 그 서비스의 기본 설정을 채운다.
  const onServices = (next: AccountService[]) => {
    setServices(next);
    if (next.includes("CASTERN") && !settings.CASTERN) setSettings({ ...settings, CASTERN: { perms: [...ALL_PERMS] } });
  };

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
    if (!pwd.trim()) { setToast({ ok: false, text: "비밀번호가 필요합니다. (요청 없으면 [임의 생성])" }); return; }
    if (services.length === 0) { setToast({ ok: false, text: "사용처(연동 서비스)를 1개 이상 선택하세요." }); return; }

    const kept: AccountSettings = {};
    for (const sv of services) if (settings[sv]) kept[sv] = settings[sv];

    const r = caster.updateAccount(acc.id, {
      name: name.trim(), pwd: pwd.trim(), addr: addr.trim(), homepage: homepage.trim(),
      services, settings: kept,
    });
    if (!r.ok) { setToast({ ok: false, text: r.msg }); return; }
    logActivity("ticket", `계정 수정 · ${acc.company} · ${acc.id} · ${services.map(accountServiceLabel).join(" · ")}`, me?.name);
    setToast({ ok: true, text: "계정 정보가 저장되었습니다." });
  };

  const keyBS = bStart ?? range?.bookStart ?? 0;
  const keyVol = Math.max(1, Math.min(bVol ?? (range?.bookCount ?? 1), range ? range.bookEnd - keyBS + 1 : 1));
  const keyPVol = Math.max(1, pVol ?? PAGE_DEFAULT);
  const addKey = () => {
    if (!range) { setToast({ ok: false, text: "할당된 SOBP 범위를 선택하세요." }); return; }
    if (myKey) { setToast({ ok: false, text: "App Key 는 계정당 1개입니다. 기존 키를 삭제한 뒤 다시 발급하세요." }); return; }
    const key = issueAppKey(acc, range, keyBS, keyVol, pStart, keyPVol, ctype, unlimited ? "무제한" : (until || "무제한"), me?.name);
    setIssued(key);
    setToast({ ok: true, text: "App Key 발급 완료 — 계정과 연동되어 서비스 DB에 등록되었습니다." });
  };

  // App Key 발급 — CasterN 전용 조건이라 ② 의 CasterN 탭 안에서만 노출한다.
  const appKeyBlock = (
    <>
      {myKey ? (
        // 안내는 제목 툴팁으로 옮겼다 `PC-071` — 발급 폼 자리에는 아무것도 두지 않는다
        null
      ) : (acc?.services ?? []).length === 0 ? (
        <div style={{ fontSize: 11.5, color: "#9ca3af", lineHeight: 1.6 }}>
          사용 서비스를 1개 이상 고르고 <b>[저장]</b> 하면 App Key 를 발급할 수 있습니다.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 11.5, color: "#6b7280", marginBottom: 5 }}>SOBP 맵에서 발급된 S / O * <span style={{ color: "#9ca3af" }}>(고르면 Book 범위가 따라옵니다)</span></div>
          <SobpRangePicker company ranges={ranges} value={sobpIdx} onSelect={(i) => { setSobpIdx(i); setBStart(null); setBVol(null); const r = ranges[i]; if (r) setCtype(CT_OF[r.pt] ?? "PDS3"); }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 12 }}>
            <BookRangeFields range={range} bookStart={keyBS} bookVol={keyVol} pageStart={pStart} pageVol={keyPVol}
                              onStart={setBStart} onVol={setBVol} onPStart={setPStart} onPVol={setPVol} />
          </div>
          {/* 고르는 값 — Code Type · 만료일 `PC-071` */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr auto", gap: 10, alignItems: "end", marginTop: 10 }}>
            <Field label="Code Type">
              <select style={S.input} value={ctype} disabled={!range} onChange={(e) => setCtype(e.target.value as CodeKind)}>
                {CODE_KINDS.map((k) => <option key={k.v} value={k.v}>{k.short}</option>)}
              </select>
            </Field>
            <Field label="만료일 (기간)">
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="date" style={{ ...S.input, opacity: unlimited ? 0.5 : 1 }} value={until} disabled={unlimited} onChange={(e) => setUntil(e.target.value)} />
                <label style={{ fontSize: 12.5, color: "#374151", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", cursor: "pointer" }}>
                  <input type="checkbox" checked={unlimited} onChange={(e) => setUnlimited(e.target.checked)} /> 무제한
                </label>
              </div>
            </Field>
            <button onClick={addKey} disabled={!range} style={{ ...S.primary, ...(!range ? { opacity: 0.5, cursor: "not-allowed" } : {}) }}>App Key 발급</button>
          </div>
          <FixedKeyFields range={range} unlimited={unlimited || !until} />
          {range && (
            <div style={{ fontSize: 11.5, color: "#6b7280", marginTop: 6 }}>
              발급 범위 <b>{range.pt} S{range.section}/O{range.owner}/B{keyBS}~{keyBS + keyVol - 1}</b> · {keyVol}권 · <b>P{pStart}~{pStart + keyPVol - 1}</b>
              <span style={{ color: "#9ca3af" }}> (할당 B{range.bookStart}~{range.bookEnd})</span>
            </div>
          )}
          {issued && (
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
          )}
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
        <AccTabs tab={tab} onTab={setTab} badge={{ svc: `${services.length}/${ACCOUNT_SERVICES.length}`, key: keys.length ? "1" : undefined }} />

        {/* 계정 정보 */}
        <div style={{ ...SEC, marginTop: 0, display: tab === "info" ? "block" : "none" }}>
        <SecHead t="계정 정보" d="· ID(email) · 고객사는 변경할 수 없습니다" tip="고객사 별 계정 개수 제한 없음 · App Key 는 계정당 1개 발급 (사용 서비스 전체 공통)" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="회사정보 (고객사)"><div style={{ ...S.input, background: "#f7f8fa", color: "#6b7280" }}>{acc.company}</div></Field>
          <Field label="NAME (담당자/사용자명)"><input style={S.input} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="ID (EMAIL)"><div style={{ ...S.input, background: "#f7f8fa", color: "#6b7280", fontFamily: "ui-monospace,monospace" }}>{acc.id}</div></Field>
          <Field label="PWD *">
            <div style={{ display: "flex", gap: 6 }}>
              <input style={S.input} value={pwd} onChange={(e) => setPwd(e.target.value)} />
              <button onClick={() => setPwd(genPwdStr())} style={{ ...S.smallBtn, whiteSpace: "nowrap" }}>임의 생성</button>
            </div>
          </Field>
          <Field label="ADDR (주소)"><input style={S.input} value={addr} onChange={(e) => setAddr(e.target.value)} /></Field>
          <Field label="HOMEPAGE"><input style={S.input} value={homepage} onChange={(e) => setHomepage(e.target.value)} placeholder="https://" /></Field>
        </div>

        </div>

        {/* App Key 발급 */}
        <div style={{ ...SEC, marginTop: 0, display: tab === "key" ? "block" : "none" }}>
          <SecHead t="App Key 발급" d={`· 계정당 1개 · 발급된 키 ${keys.length}개`} tip={myKey ? "이 계정에는 이미 App Key 가 발급돼 있습니다 — 계정당 1개입니다. 범위를 바꾸려면 발급 내역에서 키를 삭제한 뒤 다시 발급하세요." : "고객사 별 계정 개수 제한 없음 · App Key 는 계정당 1개 발급 (사용 서비스 전체 공통)"} />
          {appKeyBlock}
        </div>

        {/* 사용 서비스 및 권한 */}
        <div style={{ ...SEC, marginTop: 0, display: tab === "svc" ? "block" : "none" }}>
          <SecHead t="사용 서비스 및 권한" d="· 서비스를 고르고 · 서비스마다 조건이 다릅니다" />
          <div style={{ fontSize: 10.5, color: "#9ca3af", marginBottom: 6, lineHeight: 1.5 }}>
            사용 서비스는 <b>중복 선택</b>할 수 있습니다. App Key 는 <b>사용 서비스 전체에 공통</b>이라 서비스를 바꿔도 키는 그대로입니다 <code>PC-050</code>.
            <span style={{ marginLeft: 6 }}>선택 <b>{services.length}</b> / {ACCOUNT_SERVICES.length}</span>
          </div>
          <ServiceTabs services={services} settings={settings} onServices={onServices} onSettings={setSettings} />
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
              const linked = (acc.services ?? []).length > 0;   // 키는 사용처 전체 공통 `PC-050`
              return (
              <div key={k.id} style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${linked ? "#eef0f4" : "#fecaca"}`, background: linked ? "#fff" : "#fff7f7", borderRadius: 9, padding: "8px 10px", fontSize: 11.5, color: "#6b7280", flexWrap: "wrap" }}>
                <code style={{ fontFamily: "ui-monospace,monospace" }}>{k.key}</code>
                <span style={{ ...S.tag, background: k.pt === "PDS3" ? "#eef6ff" : "#fef3c7", color: k.pt === "PDS3" ? "#2563eb" : "#92400e" }}>{k.pt} S{k.section}/O{k.owner}/B{k.bookStart}~{k.bookEnd} · {k.bookVol ?? (k.bookEnd - k.bookStart + 1)}권</span>
                <span>{(k.services ?? []).map(accountServiceLabel).join(" · ") || "미지정"}</span>
                {!linked && <span style={{ ...S.tag, background: "#fef2f2", color: "#b91c1c", fontWeight: 700 }} title="계정 사용처에서 이 서비스가 빠져 로그인에 쓸 수 없습니다">연동 끊김</span>}
                <span>유효 {k.until}</span>
                <span style={{ flex: 1 }} />
                <span style={{ fontFamily: "ui-monospace,monospace" }}>{k.createdAt}</span>
                <button onClick={() => caster.removeAppKey(k.id)} style={{ ...S.linkBtn, color: "#dc2626" }}>키 삭제</button>
              </div>
              );
            })}
          </div>

          <SecHead t="Key 정보" d="· 이 계정에 발급된 App Key · 계정당 1개" />
          {/* N Key 는 이 화면에서 발급하지 않는다 — [N Key 관리] 메뉴에서 다룬다 `PC-068` */}
          <KeyCard title="App Key" params={appTicket?.params} empty="위에서 발급하세요." />
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
