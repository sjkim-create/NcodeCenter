"use client";

// 계정 발급 — TKT-03 계정 목록 / TKT-06 계정 등록·수정
// 목록에서 [＋ 계정 추가] → 등록 화면(① 계정 정보 → ② 사용처·권한 → ③ App Key 발급(선택)),
// 목록의 계정을 누르면 상세·수정 화면에서 정보를 고치고 App Key 를 추가·삭제한다.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { S, Field } from "./ui";
import { useStore } from "@/lib/store";
import { useAuth, currentUser } from "@/lib/authStore";
import { logActivity } from "@/lib/activityStore";
import { addTicket } from "@/lib/ticketStore";
import { SobpRangePicker, type SobpRange } from "./TicketsView";
import {
  caster, useCaster, ACCOUNT_SERVICES, accountServiceLabel,
  CASTERN_PERMS, ALL_PERMS, permLabel,
  type AccountService, type CasterPerm, type CasterAccount,
} from "@/lib/accountStore";

const accountHref = (id: string) => `/tickets/account/${encodeURIComponent(id)}`;

/* ── TKT-03 계정 목록 ───────────────────────────────────────────── */
export function AccountsListView() {
  const { companies } = useStore();
  const cast = useCaster();
  const [fCo, setFCo] = useState(0);
  const [fSvc, setFSvc] = useState<"" | AccountService>("");
  const [q, setQ] = useState("");

  const rows = cast.accounts
    .filter((a) => (fCo ? a.companyId === fCo : true))
    .filter((a) => (fSvc ? a.service === fSvc : true))
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
          <option value="">사용처 전체</option>
          {ACCOUNT_SERVICES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ID(email) · 이름 · 고객사 검색" style={{ ...S.input, width: 240 }} />
        <span style={{ color: "#9ca3af" }}>{rows.length}건</span>
        <span style={{ flex: 1 }} />
        <Link href="/tickets/account/new" style={{ ...S.primary, textDecoration: "none" }}>＋ 계정 추가</Link>
      </div>

      {/* 목록 */}
      <div style={{ ...S.card, padding: 0, overflowX: "auto" }}>
        <table style={{ ...S.table, minWidth: 980 }}>
          <thead>
            <tr>{["고객사", "ID (EMAIL)", "이름", "사용처", "CasterN 권한", "App Key", "등록일", ""].map((h) => (
              <th key={h} style={S.th}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const keys = keysOf(a.id);
              const perms = a.perms ?? [];
              return (
                <tr key={a.id} style={{ borderTop: "1px solid #eef0f4" }}>
                  <td style={S.td}>{a.company}</td>
                  <td style={S.td}>
                    <Link href={accountHref(a.id)} style={{ fontFamily: "ui-monospace,monospace", color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>{a.id}</Link>
                  </td>
                  <td style={S.td}>{a.name || "—"}</td>
                  <td style={S.td}>
                    <span style={{ ...S.tag, background: a.service ? "#ecfdf5" : "#fef2f2", color: a.service ? "#047857" : "#b91c1c", fontWeight: 700 }}>{accountServiceLabel(a.service)}</span>
                  </td>
                  <td style={S.td}>
                    {a.service !== "CASTERN" ? <span style={{ color: "#9ca3af" }}>—</span>
                      : perms.length === 0 ? <span style={{ color: "#dc2626" }}>미지정</span>
                      : perms.length === ALL_PERMS.length ? <span style={{ ...S.tag, background: "#eef6ff", color: "#2563eb", fontWeight: 700 }}>전체 {perms.length}</span>
                      : <span title={perms.map(permLabel).join(" · ")}>{perms.length} / {ALL_PERMS.length}</span>}
                  </td>
                  <td style={S.td}>
                    <span style={{ ...S.tag, background: keys.length ? "#eef6ff" : "#f3f4f6", color: keys.length ? "#2563eb" : "#9ca3af" }}>{keys.length}</span>
                  </td>
                  <td style={{ ...S.td, fontFamily: "ui-monospace,monospace", color: "#6b7280" }}>{a.createdAt?.slice(0, 10)}</td>
                  <td style={{ ...S.td, textAlign: "right", whiteSpace: "nowrap" }}>
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
function StepHead({ n, t, d }: { n: number; t: string; d?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <span style={{ background: "#5f8ff0", color: "#fff", fontWeight: 700, fontSize: 11, borderRadius: "50%", width: 20, height: 20, display: "grid", placeItems: "center" }}>{n}</span>
      <b style={{ fontSize: 13, color: "#111827" }}>{t}</b>
      {d && <span style={{ fontSize: 11.5, color: "#9ca3af" }}>· {d}</span>}
    </div>
  );
}

// CasterN 권한 7종 — 개별 선택 / [모두 선택]·[모두 해제]
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

const genPwdStr = () => {
  const buf = new Uint8Array(9);
  (globalThis.crypto ?? window.crypto).getRandomValues(buf);
  return btoa(String.fromCharCode(...buf)).replace(/[+/=]/g, "").slice(0, 10);
};
const genKeyStr = () => {
  const buf = new Uint8Array(24);
  (globalThis.crypto ?? window.crypto).getRandomValues(buf);
  return `ncc_live_${Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("")}`;
};

// 고객사가 할당받은 SOBP 범위 목록
function useRanges(companyId: number): SobpRange[] {
  const { projects } = useStore();
  return useMemo(() => {
    if (!companyId) return [];
    return projects.filter((p) => p.companyId === companyId).flatMap((p) => p.issued.map((b) => {
      const pt = (b.kind ?? "N") === "N" ? "PDS3" : "PDS2";
      return { pt, section: b.section, owner: b.owner, bookStart: b.bookStart, bookEnd: b.bookEnd,
        pageStart: b.pageStart, pageEnd: b.pageEnd, bookCount: Math.max(1, b.bookEnd - b.bookStart + 1) };
    }));
  }, [projects, companyId]);
}

// App Key 발급 — 계정 등록·상세에서 공용으로 쓴다.
function issueAppKey(acc: CasterAccount, range: SobpRange, until: string, by?: string) {
  const key = genKeyStr();
  caster.addAppKey({ key, accountId: acc.id, service: acc.service, company: acc.company, pt: range.pt,
    section: range.section, owner: range.owner, bookStart: range.bookStart, bookEnd: range.bookEnd,
    pageStart: range.pageStart, pageEnd: range.pageEnd, until });
  const summary = `계정 ${acc.id} · ${accountServiceLabel(acc.service)} · ${range.pt} S${range.section}/O${range.owner}/B${range.bookStart}~${range.bookEnd} · ${until}`;
  addTicket({ kind: "APP", companyId: acc.companyId, company: acc.company, by: by ?? "", summary,
    params: {
      CompanyName: acc.company, AccountId: acc.id, Service: accountServiceLabel(acc.service), Usage: accountServiceLabel(acc.service),
      AppKey: key, PatternType: range.pt === "PDS3" ? "Ncode_PDS3" : "Ncode_PDS2",
      Section: range.section, Owner: range.owner,
      BookStart: range.bookStart, BookEnd: range.bookEnd,
      PageStart: range.pageStart, PageEnd: range.pageEnd,
      ValidUntil: until, IssuedAt: new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 16).replace("T", " "),
    } });
  logActivity("ticket", `App Key · ${acc.company} · ${summary} · ${key.slice(0, 16)}…`, by);
  return key;
}

/* ── TKT-06 계정 등록 ───────────────────────────────────────────── */
export function AccountNewView() {
  const router = useRouter();
  const { companies } = useStore();
  const me = currentUser(useAuth());
  useCaster();

  const [companyId, setCompanyId] = useState(0);
  const [id, setId] = useState("");
  const [pwd, setPwd] = useState("");
  const [name, setName] = useState("");
  const [addr, setAddr] = useState("");
  const [homepage, setHomepage] = useState("");
  const [service, setService] = useState<AccountService>("CASTERN");
  const [perms, setPerms] = useState<CasterPerm[]>([...ALL_PERMS]);
  const [withKey, setWithKey] = useState(false);          // ③ App Key 발급 — 선택
  const [sobpIdx, setSobpIdx] = useState(-1);
  const [until, setUntil] = useState("");
  const [unlimited, setUnlimited] = useState(true);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  const company = companies.find((c) => c.id === companyId);
  const ranges = useRanges(companyId);
  const range = ranges[sobpIdx];

  const onCompany = (cid: number) => {
    setCompanyId(cid); setSobpIdx(-1);
    const c = companies.find((x) => x.id === cid);
    if (c) setAddr(c.address || "");        // 고객사 주소 자동 입력
  };

  const submit = () => {
    if (!company) { setToast({ ok: false, text: "회사(고객사)를 선택하세요." }); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(id.trim())) { setToast({ ok: false, text: "계정 ID는 이메일 형식이어야 합니다." }); return; }
    if (!pwd.trim()) { setToast({ ok: false, text: "비밀번호가 필요합니다. (요청 없으면 [임의 생성])" }); return; }
    if (withKey && !range) { setToast({ ok: false, text: "할당된 SOBP 범위를 선택하세요." }); return; }

    const acc: CasterAccount = {
      id: id.trim(), pwd: pwd.trim(), name: name.trim(), service,
      companyId: company.id, company: company.name, addr: addr.trim(), homepage: homepage.trim(),
      perms: service === "CASTERN" ? perms : [], createdAt: "",
    };
    const r = caster.addAccount(acc);
    if (!r.ok) { setToast({ ok: false, text: r.msg }); return; }
    logActivity("ticket", `계정 등록 · ${company.name} · ${acc.id} · ${accountServiceLabel(service)}`, me?.name);
    if (withKey && range) issueAppKey(acc, range, unlimited ? "무제한" : (until || "무제한"), me?.name);
    router.push("/tickets/account");        // 목록에 노출
  };

  return (
    <div style={{ padding: "18px 20px", maxWidth: 900 }}>
      <div style={{ ...S.card, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>계정 등록 <span style={{ color: "#9ca3af", fontWeight: 400, fontSize: 12 }}>· ① 계정 정보 → ② 사용처·권한 → ③ App Key(선택)</span></div>
          <span style={{ flex: 1 }} />
          <Link href="/tickets/account" style={{ ...S.ghost, textDecoration: "none" }}>목록</Link>
        </div>
        <div style={{ fontSize: 11.5, color: "#9ca3af", marginBottom: 12 }}>
          한 고객사에 계정을 <b>여러 개</b> 등록할 수 있습니다(개수 제한 없음). App Key 발급은 <b>선택</b>이며, 나중에 계정 상세에서 발급할 수 있습니다.
        </div>

        {/* ① 계정 정보 */}
        <StepHead n={1} t="계정 정보" d="서비스 로그인 계정" />
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

        {/* ② 사용처 · 권한 */}
        <div style={{ marginTop: 16 }}>
          <StepHead n={2} t="사용처 · 권한" d="연동 서비스와 CasterN 권한" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="사용처 (연동 서비스) *">
              <select style={S.input} value={service} onChange={(e) => setService(e.target.value as AccountService)}>
                {ACCOUNT_SERVICES.map((sv) => <option key={sv.v} value={sv.v}>{sv.label} — {sv.desc}</option>)}
              </select>
              <div style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 4, lineHeight: 1.5 }}>
                계정은 <b>선택한 서비스에서만 로그인</b>됩니다. 서비스는 자기 계정만 관리·인증합니다.
              </div>
            </Field>
          </div>
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>CasterN 사용자 권한 <span style={{ fontWeight: 400, color: "#9ca3af" }}>· 개별 또는 모두 선택</span></div>
            {service === "CASTERN"
              ? <PermPicker value={perms} onChange={setPerms} />
              : <div style={{ fontSize: 12, color: "#9ca3af", border: "1px solid #eef0f4", background: "#fafbfc", borderRadius: 10, padding: "9px 12px" }}>사용처가 <b>CasterN</b> 일 때만 권한을 지정합니다.</div>}
          </div>
        </div>

        {/* ③ App Key 발급 (선택) */}
        <div style={{ marginTop: 16 }}>
          <StepHead n={3} t="App Key 발급" d="선택 — 지금 발급하지 않아도 됩니다" />
          <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "#374151", cursor: "pointer", marginBottom: 8 }}>
            <input type="checkbox" checked={withKey} onChange={(e) => setWithKey(e.target.checked)} />
            이 계정에 <b>App Key도 함께 발급</b>합니다 (SOBP 범위 연동)
          </label>
          {withKey && (
            <>
              <SobpRangePicker company={!!company} ranges={ranges} value={sobpIdx} onSelect={setSobpIdx} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                <Field label="만료일 (기간)">
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="date" style={{ ...S.input, opacity: unlimited ? 0.5 : 1 }} value={until} disabled={unlimited} onChange={(e) => setUntil(e.target.value)} />
                    <label style={{ fontSize: 12.5, color: "#374151", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", cursor: "pointer" }}>
                      <input type="checkbox" checked={unlimited} onChange={(e) => setUnlimited(e.target.checked)} /> 무제한
                    </label>
                  </div>
                </Field>
              </div>
            </>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
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
  const acc = cast.accounts.find((a) => a.id === accountId);

  const [name, setName] = useState("");
  const [pwd, setPwd] = useState("");
  const [addr, setAddr] = useState("");
  const [homepage, setHomepage] = useState("");
  const [service, setService] = useState<AccountService>("CASTERN");
  const [perms, setPerms] = useState<CasterPerm[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [sobpIdx, setSobpIdx] = useState(-1);
  const [until, setUntil] = useState("");
  const [unlimited, setUnlimited] = useState(true);
  const [issued, setIssued] = useState<string | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  // 계정 값 주입 (최초 1회 — 편집 중 스토어 변경에 덮이지 않도록)
  useEffect(() => {
    if (!acc || loaded) return;
    setName(acc.name); setPwd(acc.pwd); setAddr(acc.addr); setHomepage(acc.homepage);
    setService(acc.service); setPerms(acc.perms ?? []); setLoaded(true);
  }, [acc, loaded]);

  const ranges = useRanges(acc?.companyId ?? 0);
  const range = ranges[sobpIdx];
  const keys = cast.appKeys.filter((k) => k.accountId === accountId);

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
    caster.updateAccount(acc.id, {
      name: name.trim(), pwd: pwd.trim(), addr: addr.trim(), homepage: homepage.trim(),
      service, perms: service === "CASTERN" ? perms : [],
    });
    logActivity("ticket", `계정 수정 · ${acc.company} · ${acc.id} · ${accountServiceLabel(service)}`, me?.name);
    setToast({ ok: true, text: "계정 정보가 저장되었습니다." });
  };

  const addKey = () => {
    if (!range) { setToast({ ok: false, text: "할당된 SOBP 범위를 선택하세요." }); return; }
    const key = issueAppKey({ ...acc, service }, range, unlimited ? "무제한" : (until || "무제한"), me?.name);
    setIssued(key);
    setToast({ ok: true, text: "App Key 발급 완료 — 계정과 연동되어 서비스 DB에 등록되었습니다." });
  };

  return (
    <div style={{ padding: "18px 20px", maxWidth: 900 }}>
      <div style={{ ...S.card, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>계정 상세 · 수정</div>
          <code style={{ fontFamily: "ui-monospace,monospace", color: "#374151", fontSize: 12.5 }}>{acc.id}</code>
          <span style={{ ...S.tag, background: "#f3f4f6", color: "#6b7280" }}>{acc.company}</span>
          <span style={{ flex: 1 }} />
          <Link href="/tickets/account" style={{ ...S.ghost, textDecoration: "none" }}>목록</Link>
        </div>

        {/* ① 계정 정보 — ID·고객사는 고정 */}
        <StepHead n={1} t="계정 정보" d="ID(email) · 고객사는 변경할 수 없습니다" />
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

        {/* ② 사용처 · 권한 */}
        <div style={{ marginTop: 16 }}>
          <StepHead n={2} t="사용처 · 권한" d="연동 서비스와 CasterN 권한" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="사용처 (연동 서비스) *">
              <select style={S.input} value={service} onChange={(e) => setService(e.target.value as AccountService)}>
                {ACCOUNT_SERVICES.map((sv) => <option key={sv.v} value={sv.v}>{sv.label} — {sv.desc}</option>)}
              </select>
              <div style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 4, lineHeight: 1.5 }}>
                사용처를 바꾸면 <b>연동된 App Key의 사용처도 함께</b> 바뀝니다.
              </div>
            </Field>
          </div>
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>CasterN 사용자 권한 <span style={{ fontWeight: 400, color: "#9ca3af" }}>· 개별 또는 모두 선택</span></div>
            {service === "CASTERN"
              ? <PermPicker value={perms} onChange={setPerms} />
              : <div style={{ fontSize: 12, color: "#9ca3af", border: "1px solid #eef0f4", background: "#fafbfc", borderRadius: 10, padding: "9px 12px" }}>사용처가 <b>CasterN</b> 일 때만 권한을 지정합니다.</div>}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button onClick={() => { if (confirm("이 계정과 연동 App Key를 삭제할까요?")) { caster.removeAccount(acc.id); router.push("/tickets/account"); } }}
            style={{ ...S.ghost, color: "#dc2626", borderColor: "#fecaca" }}>계정 삭제</button>
          <button onClick={save} style={S.primary}>저장</button>
        </div>
        {toast && <div style={{ marginTop: 10, fontSize: 12.5, color: toast.ok ? "#047857" : "#dc2626", textAlign: "right" }}>{toast.text}</div>}

        {/* ③ App Key — 선택적으로 발급 */}
        <div style={{ marginTop: 18, borderTop: "1px solid #eef0f4", paddingTop: 14 }}>
          <StepHead n={3} t="App Key" d={`이 계정에 연동된 키 ${keys.length}개 · 선택 발급`} />
          <SobpRangePicker company ranges={ranges} value={sobpIdx} onSelect={setSobpIdx} />
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginTop: 12, flexWrap: "wrap" }}>
            <div style={{ width: 300 }}>
              <Field label="만료일 (기간)">
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="date" style={{ ...S.input, opacity: unlimited ? 0.5 : 1 }} value={until} disabled={unlimited} onChange={(e) => setUntil(e.target.value)} />
                  <label style={{ fontSize: 12.5, color: "#374151", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", cursor: "pointer" }}>
                    <input type="checkbox" checked={unlimited} onChange={(e) => setUnlimited(e.target.checked)} /> 무제한
                  </label>
                </div>
              </Field>
            </div>
            <span style={{ flex: 1 }} />
            <button onClick={addKey} disabled={!range} style={{ ...S.primary, ...(!range ? { opacity: 0.5, cursor: "not-allowed" } : {}) }}>App Key 발급</button>
          </div>

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

          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            {keys.length === 0 ? (
              <div style={{ fontSize: 12, color: "#9ca3af", padding: "6px 0" }}>발급된 App Key가 없습니다. 범위를 고르고 [App Key 발급]을 누르세요.</div>
            ) : keys.map((k) => (
              <div key={k.id} style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid #eef0f4", borderRadius: 9, padding: "8px 10px", fontSize: 11.5, color: "#6b7280", flexWrap: "wrap" }}>
                <code style={{ fontFamily: "ui-monospace,monospace" }}>{k.key.slice(0, 18)}…</code>
                <span style={{ ...S.tag, background: k.pt === "PDS3" ? "#eef6ff" : "#fef3c7", color: k.pt === "PDS3" ? "#2563eb" : "#92400e" }}>{k.pt} S{k.section}/O{k.owner}/B{k.bookStart}~{k.bookEnd}</span>
                <span>{accountServiceLabel(k.service)}</span>
                <span>유효 {k.until}</span>
                <span style={{ flex: 1 }} />
                <span style={{ fontFamily: "ui-monospace,monospace" }}>{k.createdAt}</span>
                <button onClick={() => caster.removeAppKey(k.id)} style={{ ...S.linkBtn, color: "#dc2626" }}>키 삭제</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
