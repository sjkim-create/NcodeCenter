"use client";

// 고객사 관리 ▸ 계정 및 서비스 권한 `PC-128`
// - 고객사마다 **서비스 로그인 계정을 여러 개** 둔다(개수 제한 없음 · ID(email)는 전체에서 유일).
// - 계정의 **서비스 권한**은 고객사의 **사용 서비스**에서 고른 서비스만 줄 수 있다.
//   casterN 을 체크하면 → 편집 프로젝트 대상 + 계정에 CasterN 사용·권한 6종 지정.
// - App Key 관리(티켓 고객사의 키 발급 계정)와는 다른 계정이다(scope = "service").
import { useState } from "react";
import { S } from "./ui";
import { PermPicker } from "./AccountsView";
import { ACCOUNT_SERVICES, ALL_PERMS, type AccountService, type CasterAccount } from "@/lib/accountStore";
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

export function CompanyAccountsPanel({ accounts, ops, companyName, companyServices, appKeyOf, draft }: {
  accounts: CasterAccount[];
  ops: AccountOps;
  companyName: string;
  companyServices: ServiceType[];          // 폼에서 고른 사용 서비스(저장 전 값 포함)
  appKeyOf?: (accountId: string) => string | undefined;
  draft?: boolean;                         // 신규 등록 중 — [등록] 할 때 함께 저장된다
}) {
  const allowed = companyServices.map((v) => ACC_OF[v]).filter(Boolean) as AccountService[];
  const [id, setId] = useState("");
  const [pwd, setPwd] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [open, setOpen] = useState<string | null>(null);   // 펼친 계정

  const add = () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(id.trim())) { setMsg({ ok: false, text: "계정 ID는 이메일 형식이어야 합니다." }); return; }
    if (!pwd.trim()) { setMsg({ ok: false, text: "비밀번호가 필요합니다. (요청 없으면 [임의 생성])" }); return; }
    // 고객사의 사용 서비스를 기본으로 켠다 — casterN 은 권한 6종 모두
    const acc: CasterAccount = {
      id: id.trim(), pwd: pwd.trim(), name: name.trim(), services: allowed,
      settings: allowed.includes("CASTERN") ? { CASTERN: { perms: [...ALL_PERMS] } } : {},
      companyId: 0, company: companyName, addr: "", homepage: "", createdAt: "", scope: "service",
    };
    const r = ops.add(acc);
    setMsg({ ok: r.ok, text: r.ok ? `계정 추가됨 · ${acc.id}` : r.msg });
    if (r.ok) { setId(""); setPwd(""); setName(""); setOpen(acc.id); }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <b style={{ fontSize: 13 }}>계정 및 서비스 권한</b>
        <span style={{ ...S.tag, background: "#eef6ff", color: "#2563eb", fontWeight: 700 }}>{accounts.length}개</span>
        <span style={{ fontSize: 11, color: "#9ca3af" }}>· 서비스 로그인 계정 · 개수 제한 없음{draft ? " · [등록] 시 함께 저장" : " · 바로 저장"}</span>
      </div>

      {/* 사용 서비스 상태 — 권한은 고객사의 사용 서비스 안에서만 줄 수 있다 */}
      <div style={{ fontSize: 11.5, color: "#6b7280", marginBottom: 10, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        사용 서비스
        {ACCOUNT_SERVICES.map((s) => {
          const on = allowed.includes(s.v);
          return <span key={s.v} style={{ ...S.tag, fontWeight: 700, background: on ? "#ecfdf5" : "#f3f4f6", color: on ? "#047857" : "#9ca3af" }}>{on ? "✓" : "○"} {s.label}</span>;
        })}
        {!allowed.length && <span style={{ color: "#9ca3af" }}>— 왼쪽 [사용 서비스]에서 casterN 을 체크하면 계정에 권한을 줄 수 있습니다</span>}
      </div>

      {/* 계정 추가 */}
      <div style={{ border: "1px dashed #c7d2fe", background: "#f8faff", borderRadius: 10, padding: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1.2fr 1fr auto", gap: 6 }}>
          <input style={S.input} placeholder="ID (EMAIL) *" value={id} onChange={(e) => setId(e.target.value)} />
          <div style={{ display: "flex", gap: 4 }}>
            <input style={S.input} placeholder="PWD *" value={pwd} onChange={(e) => setPwd(e.target.value)} />
            <button type="button" onClick={() => setPwd(genPwd())} style={{ ...S.smallBtn, whiteSpace: "nowrap" }} title="비밀번호 미요청 시 임의 생성">임의</button>
          </div>
          <input style={S.input} placeholder="NAME (담당자)" value={name} onChange={(e) => setName(e.target.value)} />
          <button type="button" onClick={add} style={{ ...S.primary, whiteSpace: "nowrap" }}>＋ 계정 추가</button>
        </div>
        {msg && <div style={{ fontSize: 12, marginTop: 6, color: msg.ok ? "#047857" : "#dc2626" }}>{msg.text}</div>}
      </div>

      {/* 계정 목록 — 누르면 서비스 권한을 펼친다 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
        {accounts.length === 0 && <div style={{ fontSize: 12, color: "#9ca3af", padding: "14px 0", textAlign: "center" }}>등록된 계정이 없습니다.</div>}
        {accounts.map((a) => {
          const isOpen = open === a.id;
          const key = appKeyOf?.(a.id);
          const svcs: AccountService[] = (a.services ?? []).filter((v) => v === "CASTERN" || v === "FORMSOLUTION");
          const perms = a.settings?.CASTERN?.perms ?? [];
          const toggleSvc = (v: AccountService) => {
            const on = svcs.includes(v);
            const services = on ? svcs.filter((x) => x !== v) : [...svcs, v];
            const settings = { ...a.settings };
            if (!on && v === "CASTERN" && !settings.CASTERN) settings.CASTERN = { perms: [...ALL_PERMS] };
            ops.update(a.id, { services, settings });
          };
          return (
            <div key={a.id} style={{ border: `1px solid ${isOpen ? "#bfdbfe" : "#eef0f4"}`, borderRadius: 10, background: "#fff" }}>
              <div onClick={() => setOpen(isOpen ? null : a.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", cursor: "pointer", flexWrap: "wrap" }}>
                <span style={{ color: "#9ca3af", fontSize: 11 }}>{isOpen ? "▾" : "▸"}</span>
                <code style={{ fontFamily: "ui-monospace,monospace", color: "#2563eb", fontWeight: 600, fontSize: 12.5 }}>{a.id}</code>
                {a.name && <span style={{ fontSize: 12, color: "#374151" }}>{a.name}</span>}
                {a.seeded && <span style={{ ...S.tag, background: "#f0fdfa", color: "#0f766e" }} title="개발팀 Caster 대장에서 들어온 계정">대장</span>}
                <span style={{ flex: 1 }} />
                {svcs.length
                  ? svcs.map((v) => (
                      <span key={v} style={{ ...S.tag, background: allowed.includes(v) ? "#ecfdf5" : "#fef2f2", color: allowed.includes(v) ? "#047857" : "#b91c1c", fontWeight: 700 }}
                        title={allowed.includes(v) ? undefined : "고객사 사용 서비스에서 빠진 서비스 — 권한이 적용되지 않습니다"}>
                        {ACCOUNT_SERVICES.find((s) => s.v === v)?.label}{v === "CASTERN" ? ` ${perms.length}/${ALL_PERMS.length}` : ""}
                      </span>))
                  : <span style={{ ...S.tag, background: "#f3f4f6", color: "#9ca3af" }}>권한 없음</span>}
                {key !== undefined && <span style={{ ...S.tag, background: "#f5f3ff", color: "#6d28d9" }} title={key || "대장에 키 값 미기재"}>App Key</span>}
              </div>

              {isOpen && (
                <div style={{ borderTop: "1px solid #eef0f4", padding: "10px 12px", display: "grid", gap: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 6, alignItems: "center" }}>
                    <input style={S.input} defaultValue={a.name} placeholder="NAME" onBlur={(e) => e.target.value !== a.name && ops.update(a.id, { name: e.target.value.trim() })} />
                    <input style={S.input} defaultValue={a.pwd} placeholder={a.seeded && !a.pwd ? "대장 참조" : "PWD"} onBlur={(e) => e.target.value !== a.pwd && ops.update(a.id, { pwd: e.target.value.trim() })} />
                    <button type="button" onClick={() => { if (confirm(`계정 ${a.id} 을(를) 삭제할까요?`)) ops.remove(a.id); }}
                      style={{ ...S.linkBtn, color: "#dc2626" }}>삭제</button>
                  </div>

                  {/* 서비스 권한 — 고객사 사용 서비스에 있는 서비스만 켤 수 있다 */}
                  {ACCOUNT_SERVICES.map((s) => {
                    const can = allowed.includes(s.v);
                    const on = svcs.includes(s.v);
                    return (
                      <div key={s.v} style={{ border: "1px solid #eef0f4", borderRadius: 9, padding: "9px 11px", background: can ? "#fff" : "#fafafa" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, cursor: can ? "pointer" : "not-allowed", opacity: can ? 1 : 0.6 }}>
                          <input type="checkbox" checked={on} disabled={!can && !on} onChange={() => toggleSvc(s.v)} />
                          <b style={{ color: on ? "#1d4ed8" : "#374151" }}>{s.label} 사용</b>
                          {!s.ready && <span style={{ ...S.tag, background: "#fff7ed", color: "#c2410c", fontSize: 10 }}>준비중</span>}
                          {!can && <span style={{ fontSize: 11, color: "#9ca3af" }}>· 고객사 사용 서비스에서 먼저 체크</span>}
                        </label>
                        {on && s.v === "CASTERN" && (
                          <div style={{ marginTop: 8 }}>
                            <PermPicker value={perms} onChange={(p) => ops.update(a.id, { settings: { ...a.settings, CASTERN: { ...a.settings?.CASTERN, perms: p } } })} />
                          </div>
                        )}
                        {on && s.v !== "CASTERN" && <div style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 6 }}>이 서비스의 권한 항목은 아직 정의되지 않았습니다.</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
