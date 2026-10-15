"use client";

// 고객사 관리 ▸ 서비스 계정 — 「카드 목록 | 상세」 2칸 `PC-128` `PC-136`
// - 고객사마다 **서비스 로그인 계정을 여러 개** 둔다(개수 제한 없음 · ID(email)는 전체에서 유일).
// - 왼쪽 카드 목록에서 계정을 고르면 오른쪽에 상세, [＋ 계정 추가]를 누르면 오른쪽에 등록 폼이 나온다.
// - 계정의 **서비스 권한**에서 CasterN 사용을 체크하면 → 이 고객사가 **편집 프로젝트 대상**이 되고
//   그 계정이 CasterN 을 쓴다(권한 6종). 고객사의 사용 서비스 = 계정들의 서비스의 합 `PC-138`.
// - 상세의 변경은 **[저장]** 으로 반영한다(즉시 저장하지 않는다) `PC-136`.
// - App Key 관리(티켓 고객사의 키 발급 계정)와는 다른 계정이다(scope = "service").
import { useState } from "react";
import { S, Field } from "./ui";
import { ACCOUNT_SERVICES, ALL_PERMS, CASTERN_PERMS, isActive, type AccountService, type CasterAccount, type CasterPerm } from "@/lib/accountStore";
import type { ServiceType } from "@/lib/customerData";

export type AccountOps = {
  add: (a: CasterAccount) => { ok: boolean; msg: string };
  update: (id: string, patch: Partial<CasterAccount>) => void;
  remove: (id: string) => void;
};

const genPwd = () => {
  const buf = new Uint8Array(9);
  (globalThis.crypto ?? window.crypto).getRandomValues(buf);
  return btoa(String.fromCharCode(...buf)).replace(/[+/=]/g, "").slice(0, 10);
};
// 고객사 사용 서비스(ServiceType) → 계정 서비스(AccountService)
const ACC_OF: Partial<Record<ServiceType, AccountService>> = { CASTERN: "CASTERN", FORMSOLUTION: "FORMSOLUTION" };
const fmtAt = (s?: string) => (s ? s.slice(0, 16).replace("T", " ") : "");
const shortAt = (s?: string) => (s ? s.slice(5, 10) : "");

const card: React.CSSProperties = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, display: "flex", flexDirection: "column", minHeight: 0 };
const hd: React.CSSProperties = { padding: "13px 16px", borderBottom: "1px solid #eef0f4", display: "flex", alignItems: "center", gap: 8 };
const ft: React.CSSProperties = { padding: "11px 16px", borderTop: "1px solid #eef0f4", display: "flex", alignItems: "center", gap: 8 };
// 계정 상세의 영역 제목 — 기본 정보 · 서비스 권한 · 접속 · 이력 `PC-141`
const AreaTitle = ({ t, d, top = 18 }: { t: string; d?: string; top?: number }) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: `${top}px 0 8px` }}>
    <b style={{ fontSize: 13, color: "#111827" }}>{t}</b>
    {d && <span style={{ fontSize: 11.5, color: "#9ca3af" }}>{d}</span>}
  </div>
);
const tag = (bg: string, fg: string): React.CSSProperties => ({ ...S.tag, background: bg, color: fg, fontWeight: 700 });

export function CompanyAccountsPanel({ accounts, ops, companyName, companyServices, appKeyOf, draft, initialId = "" }: {
  accounts: CasterAccount[];
  ops: AccountOps;
  companyName: string;
  companyServices: ServiceType[];          // 지금 고객사가 쓰는 서비스(계정들의 합) — 새 계정의 기본값 `PC-138`
  appKeyOf?: (accountId: string) => string | undefined;
  draft?: boolean;                         // 신규 등록 중 — 계정을 추가하면 고객사와 함께 바로 등록된다 `PC-142`
  initialId?: string;                      // 가입 승인에서 넘어온 SSO 이메일 — 등록 폼에 미리 넣는다 `PC-133`
}) {
  const allowed = companyServices.map((v) => ACC_OF[v]).filter(Boolean) as AccountService[];
  // 오른쪽 칸: 고른 계정 상세 / 등록 폼. 승인에서 넘어오면 등록 폼부터 연다
  const [selId, setSelId] = useState<string | null>(initialId ? null : accounts[0]?.id ?? null);
  const [adding, setAdding] = useState(!!initialId || accounts.length === 0);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");

  const list = accounts.filter((a) => (q ? `${a.name} ${a.id}`.toLowerCase().includes(q.toLowerCase()) : true));
  const sel = adding ? undefined : accounts.find((a) => a.id === selId) ?? accounts[0];
  const nOn = accounts.filter(isActive).length;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px minmax(0, 1fr)", gap: 12, alignItems: "start" }}>
      {/* 카드 목록 */}
      <div style={card}>
        <div style={hd}>
          <b style={{ fontSize: 14 }}>서비스 계정</b>
          <span style={{ fontSize: 11.5, color: "#9ca3af" }}>{accounts.length}명 · 활성 {nOn}</span>
          <span style={{ flex: 1 }} />
          <button type="button" onClick={() => { setAdding(true); setMsg(""); }} style={{ ...S.primary, padding: "6px 12px", fontSize: 12.5 }}>＋ 계정 추가</button>
        </div>
        <div style={{ padding: 12 }}>
          {accounts.length > 3 && (
            <input style={{ ...S.input, marginBottom: 10 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름 · 이메일 검색" />
          )}
          {accounts.length === 0 && (
            <div style={{ fontSize: 12, color: "#9ca3af", padding: "24px 0", textAlign: "center", lineHeight: 1.7 }}>
              등록된 계정이 없습니다.<br />[＋ 계정 추가]로 등록하세요.
            </div>
          )}
          {list.map((a) => {
            const on = !adding && sel?.id === a.id;
            const cast = (a.services ?? []).includes("CASTERN");
            const perms = a.settings?.CASTERN?.perms ?? [];
            return (
              <div key={a.id} onClick={() => { setSelId(a.id); setAdding(false); setMsg(""); }}
                style={{ border: `1px solid ${on ? "#5f8ff0" : "#eef0f4"}`, background: on ? "#f5f9ff" : "#fff", borderRadius: 10, padding: "10px 12px", marginBottom: 8, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <b style={{ fontSize: 13.5 }}>{a.name || <span style={{ color: "#9ca3af", fontWeight: 400 }}>이름 없음</span>}</b>
                  {a.seeded && <span style={tag("#f0fdfa", "#0f766e")} title="개발팀 Caster 대장에서 들어온 계정">대장</span>}
                </div>
                <div style={{ fontFamily: "ui-monospace,monospace", fontSize: 11.5, color: "#6b7280", marginTop: 2 }}>{a.id}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 7 }}>
                  {isActive(a) ? <span style={tag("#ecfdf5", "#047857")}>활성</span> : <span style={tag("#f3f4f6", "#6b7280")}>비활성</span>}
                  {cast
                    ? <span style={tag("#eef6ff", "#2563eb")}>CasterN {perms.length}/{ALL_PERMS.length}</span>
                    : <span style={tag("#f3f4f6", "#9ca3af")}>권한 없음</span>}
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "#9ca3af" }}>{a.lastLoginAt ? `${shortAt(a.lastLoginAt)} 접속` : "접속 기록 없음"}</span>
                </div>
              </div>
            );
          })}
          {msg && <div style={{ fontSize: 12, color: "#047857", marginTop: 4 }}>{msg}</div>}
        </div>
      </div>

      {/* 상세 / 등록 */}
      {adding ? (
        <AccountForm key="__new" mode="new" companyName={companyName} allowed={allowed} draft={draft} initialId={initialId}
          onCancel={accounts.length ? () => setAdding(false) : undefined}
          onSubmit={(a) => {
            const r = ops.add(a);
            if (r.ok) { setAdding(false); setSelId(a.id); setMsg(`계정 추가됨 · ${a.id}`); }
            return r;
          }} />
      ) : sel ? (
        <AccountForm key={sel.id} mode="edit" account={sel} companyName={companyName} allowed={allowed} draft={draft}
          appKey={appKeyOf?.(sel.id)}
          onSubmit={(a) => { ops.update(sel.id, { name: a.name, pwd: a.pwd, active: a.active, services: a.services, settings: a.settings }); setMsg(`저장됨 · ${sel.id}`); return { ok: true, msg: "" }; }}
          onRemove={() => { if (confirm(`계정 ${sel.id} 을(를) 삭제할까요?`)) { ops.remove(sel.id); setSelId(null); setMsg(""); } }} />
      ) : (
        <div style={{ ...card, padding: "40px 0", alignItems: "center", color: "#9ca3af", fontSize: 12.5 }}>계정을 선택하거나 [＋ 계정 추가]를 누르세요.</div>
      )}
    </div>
  );
}

/** 계정 상세·등록 폼 — 변경은 [저장]/[계정 추가] 로만 반영한다 `PC-136` */
function AccountForm({ mode, account, companyName, allowed, draft, initialId = "", appKey, onSubmit, onCancel, onRemove }: {
  mode: "new" | "edit";
  account?: CasterAccount;
  companyName: string;
  allowed: AccountService[];
  draft?: boolean;
  initialId?: string;
  appKey?: string;
  onSubmit: (a: CasterAccount) => { ok: boolean; msg: string };
  onCancel?: () => void;
  onRemove?: () => void;
}) {
  const isNew = mode === "new";
  const start = (): { id: string; pwd: string; name: string; active: boolean; services: AccountService[]; perms: CasterPerm[] } => account
    ? { id: account.id, pwd: account.pwd, name: account.name, active: isActive(account),
        services: (account.services ?? []).filter((v) => v === "CASTERN" || v === "FORMSOLUTION"),
        perms: account.settings?.CASTERN?.perms ?? [] }
    // 새 계정 — 고객사 사용 서비스를 기본으로 켜고 casterN 은 권한 6종 모두
    : { id: initialId, pwd: "", name: "", active: true, services: allowed, perms: allowed.includes("CASTERN") ? [...ALL_PERMS] : [] };
  const [f, setF] = useState(start);
  const [err, setErr] = useState("");
  const [svcTab, setSvcTab] = useState<AccountService>("CASTERN");   // 서비스 권한 탭 `PC-140`
  const base = start();
  const dirty = !isNew && JSON.stringify(f) !== JSON.stringify(base);

  const toggleSvc = (v: AccountService) => setF((p) => {
    const on = p.services.includes(v);
    const services = on ? p.services.filter((x) => x !== v) : [...p.services, v];
    const perms = v === "CASTERN" && !on && p.perms.length === 0 ? [...ALL_PERMS] : p.perms;
    return { ...p, services, perms };
  });

  const submit = () => {
    if (isNew && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.id.trim())) { setErr("ID 는 이메일 형식이어야 합니다."); return; }
    if (!f.pwd.trim() && !(account?.seeded)) { setErr("비밀번호가 필요합니다. (요청 없으면 [임의 생성])"); return; }
    const acc: CasterAccount = {
      ...(account ?? { companyId: 0, company: companyName, addr: "", homepage: "", createdAt: "", scope: "service" as const }),
      id: f.id.trim(), pwd: f.pwd.trim(), name: f.name.trim(), active: f.active, services: f.services,
      settings: { ...(account?.settings ?? {}), CASTERN: { ...(account?.settings?.CASTERN ?? {}), perms: f.perms } },
    };
    const r = onSubmit(acc);
    if (!r.ok) setErr(r.msg); else setErr("");
  };

  return (
    <div style={card}>
      <div style={hd}>
        <b style={{ fontSize: 14 }}>{isNew ? "서비스 계정 추가" : f.name || account?.id}</b>
        <span style={{ fontSize: 11.5, color: "#9ca3af", fontFamily: isNew ? undefined : "ui-monospace,monospace" }}>{isNew ? companyName || "새 고객사" : account?.id}</span>
        <span style={{ flex: 1 }} />
        {!isNew && appKey !== undefined && <span style={tag("#f5f3ff", "#6d28d9")} title={appKey || "대장에 키 값 미기재"}>App Key 연결</span>}
      </div>
      <div style={{ padding: "14px 16px" }}>
        <AreaTitle t="기본 정보" top={0} />
        <div style={S.grid2}>
          <Field label="ID (이메일) *">
            {isNew
              ? <input style={S.input} value={f.id} onChange={(e) => setF({ ...f, id: e.target.value })} placeholder="user@company.com" />
              : <div style={{ ...S.input, background: "#f7f8fa", color: "#6b7280", fontFamily: "ui-monospace,monospace" }}>{f.id}</div>}
          </Field>
          <Field label={account?.seeded ? "PWD (비밀번호)" : "PWD (비밀번호) *"}>
            <div style={{ display: "flex", gap: 6 }}>
              <input style={S.input} value={f.pwd} onChange={(e) => setF({ ...f, pwd: e.target.value })}
                placeholder={account?.seeded && !account.pwd ? "대장 참조" : "비밀번호 미요청 시 임의 생성"} />
              <button type="button" onClick={() => setF({ ...f, pwd: genPwd() })} style={{ ...S.smallBtn, whiteSpace: "nowrap" }} title="비밀번호를 요청하지 않으면 임의로 만듭니다">임의 생성</button>
            </div>
          </Field>
          <Field label="NAME (담당자명)"><input style={S.input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="계정 상태">
            <div style={{ display: "inline-flex", border: "1px solid #e5e7eb", borderRadius: 999, overflow: "hidden", alignSelf: "flex-start" }}>
              {([true, false] as const).map((v) => {
                const on = f.active === v;
                return (
                  <button key={String(v)} type="button" onClick={() => setF({ ...f, active: v })}
                    style={{ border: 0, padding: "6px 16px", fontSize: 12.5, cursor: "pointer", fontWeight: on ? 700 : 400,
                      background: on ? (v ? "#ecfdf5" : "#f3f4f6") : "#fff", color: on ? (v ? "#047857" : "#374151") : "#9ca3af" }}>
                    {v ? "활성" : "비활성"}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>

        {/* 서비스 권한 — 서비스별 탭 + 사용 스위치 + 권한 그리드 `PC-140`
            체크한 서비스가 곧 이 고객사의 사용 서비스가 된다 `PC-138`. 그리드는 늘 같은 자리에 두고
            꺼져 있으면 흐리게만 해서, 켜고 끌 때 화면이 아래로 밀리지 않게 한다. */}
        <AreaTitle t="서비스 권한" d="· 켠 서비스가 이 고객사의 사용 서비스가 됩니다" />
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 6px", background: "#fafbfc", borderBottom: "1px solid #eef0f4" }}>
            <div style={{ display: "flex", gap: 2 }}>
              {ACCOUNT_SERVICES.map((sv) => {
                const cur = svcTab === sv.v;
                const on = f.services.includes(sv.v);
                const n = sv.v === "CASTERN" ? f.perms.length : 0;
                return (
                  <button key={sv.v} type="button" onClick={() => setSvcTab(sv.v)}
                    style={{ display: "flex", alignItems: "center", gap: 6, border: 0, background: "transparent", cursor: "pointer",
                      padding: "11px 12px 9px", fontSize: 12.5, fontWeight: cur ? 700 : 500,
                      color: cur ? "#1d4ed8" : "#6b7280", borderBottom: `2px solid ${cur ? "#2563eb" : "transparent"}` }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: on ? "#10b981" : "#d1d5db" }} />
                    {sv.label}
                    {sv.v === "CASTERN" && on && <span style={{ fontSize: 10.5, color: "#2563eb", background: "#eef6ff", borderRadius: 999, padding: "0 7px", fontWeight: 700 }}>{n}/{ALL_PERMS.length}</span>}
                    {!sv.ready && <span style={{ fontSize: 10, color: "#c2410c", background: "#fff7ed", borderRadius: 999, padding: "0 7px", fontWeight: 700 }}>준비중</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {(() => {
            const sv = ACCOUNT_SERVICES.find((x) => x.v === svcTab)!;
            const on = f.services.includes(sv.v);
            const isCast = sv.v === "CASTERN";
            const desc = isCast
              ? "[편집 프로젝트]의 대상이 되고, 이 고객사 계정에 CasterN 사용 권한을 줄 수 있습니다"
              : "폼솔루션 서비스 관리 화면에 나타납니다";
            const all = f.perms.length === ALL_PERMS.length;
            const togglePerm = (pm: CasterPerm) =>
              setF((prev) => ({ ...prev, perms: prev.perms.includes(pm) ? prev.perms.filter((x) => x !== pm) : [...prev.perms, pm] }));
            return (
              <div style={{ padding: "14px 16px" }}>
                {/* 사용 스위치 */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button type="button" role="switch" aria-checked={on} onClick={() => toggleSvc(sv.v)}
                    style={{ width: 40, height: 22, borderRadius: 11, border: 0, padding: 0, cursor: "pointer", position: "relative", flex: "none",
                      background: on ? "#2563eb" : "#d1d5db", transition: "background .15s" }}>
                    <span style={{ position: "absolute", top: 2, left: on ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .15s", boxShadow: "0 1px 2px rgba(0,0,0,.2)" }} />
                  </button>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: on ? "#111827" : "#6b7280" }}>{sv.label} {on ? "사용" : "사용 안 함"}</div>
                    <div style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 1 }}>{desc}</div>
                  </div>
                  <span style={{ flex: 1 }} />
                  {isCast && (
                    <button type="button" disabled={!on} onClick={() => setF({ ...f, perms: all ? [] : [...ALL_PERMS] })}
                      style={{ ...S.smallBtn, opacity: on ? 1 : 0.4, cursor: on ? "pointer" : "default" }}>{all ? "모두 해제" : "모두 선택"}</button>
                  )}
                </div>

                {/* 권한 그리드 — 꺼져 있으면 흐리게 */}
                {isCast ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 14,
                    opacity: on ? 1 : 0.45, pointerEvents: on ? "auto" : "none" }}>
                    {CASTERN_PERMS.map((pm) => {
                      const sel = on && f.perms.includes(pm.v);
                      return (
                        <button key={pm.v} type="button" onClick={() => togglePerm(pm.v)} title={pm.desc}
                          style={{ display: "flex", alignItems: "flex-start", gap: 8, textAlign: "left", cursor: "pointer", borderRadius: 10, padding: "9px 11px",
                            border: `1px solid ${sel ? "#93c5fd" : "#e5e7eb"}`, background: sel ? "#f0f6ff" : "#fff" }}>
                          <span style={{ width: 16, height: 16, borderRadius: 4, flex: "none", marginTop: 1, display: "grid", placeItems: "center", fontSize: 11, color: "#fff",
                            border: `1px solid ${sel ? "#2563eb" : "#cbd5e1"}`, background: sel ? "#2563eb" : "#fff" }}>{sel ? "✓" : ""}</span>
                          <span style={{ minWidth: 0 }}>
                            <span style={{ display: "block", fontSize: 12.5, fontWeight: sel ? 700 : 500, color: sel ? "#1d4ed8" : "#374151" }}>{pm.label}</span>
                            <span style={{ display: "block", fontSize: 10.5, color: "#9ca3af", fontFamily: "ui-monospace,monospace", marginTop: 1 }}>{pm.v}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ marginTop: 14, fontSize: 12, color: "#9ca3af", border: "1px dashed #e5e7eb", borderRadius: 10, padding: "18px 14px", textAlign: "center" }}>
                    이 서비스의 권한 항목은 아직 정의되지 않았습니다.
                  </div>
                )}
                {isCast && on && f.perms.length === 0 && (
                  <div style={{ fontSize: 11.5, color: "#b45309", marginTop: 8 }}>권한이 하나도 선택되지 않았습니다. 이 계정은 CasterN 에 로그인해도 쓸 수 있는 기능이 없습니다.</div>
                )}
              </div>
            );
          })()}
        </div>

        {!isNew && <AreaTitle t="접속 · 이력" />}
        {!isNew && (
          <div style={{ border: "1px solid #eef0f4", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: "6px 10px", fontSize: 12.5 }}>
              <span style={{ color: "#6b7280" }}>최근 접속일</span>
              <span style={{ fontFamily: "ui-monospace,monospace", color: account?.lastLoginAt ? "#374151" : "#9ca3af" }}>{fmtAt(account?.lastLoginAt) || "접속 기록 없음"}</span>
              <span style={{ color: "#6b7280" }}>등록일</span>
              <span style={{ fontFamily: "ui-monospace,monospace" }}>{account?.createdAt || "-"}</span>
              {appKey !== undefined && (<>
                <span style={{ color: "#6b7280" }}>App Key</span>
                <span style={{ fontFamily: "ui-monospace,monospace", wordBreak: "break-all", color: appKey ? "#374151" : "#9ca3af" }}>{appKey || "대장에 키 값 미기재"}</span>
              </>)}
            </div>
          </div>
        )}
        {err && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 10 }}>{err}</div>}
      </div>
      <div style={ft}>
        {!isNew && onRemove && <button type="button" onClick={onRemove} style={{ ...S.ghost, color: "#dc2626", borderColor: "#fecaca" }}>계정 삭제</button>}
        {dirty && <span style={{ fontSize: 12, color: "#b45309" }}>● 저장하지 않은 변경이 있습니다</span>}
        {isNew && draft && <span style={{ fontSize: 11.5, color: "#9ca3af" }}>계정을 추가하면 고객사가 함께 등록됩니다</span>}
        <span style={{ flex: 1 }} />
        {isNew ? (onCancel && <button type="button" onClick={onCancel} style={S.ghost}>취소</button>)
               : <button type="button" onClick={() => { setF(start()); setErr(""); }} style={S.ghost} disabled={!dirty}>취소</button>}
        <button type="button" onClick={submit} style={S.primary}>{isNew ? "계정 추가" : "저장"}</button>
      </div>
    </div>
  );
}
