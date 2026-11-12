"use client";

// MEM-03 직원 계정 — 이 콘솔을 쓰는 내부 직원 · 역할(ADMIN/STAFF) · 사용 중지 `PC-297`
//   직원은 회사 계정(@neolab.net)으로 처음 로그인하면 그 이메일로 **자동 등록**(STAFF)된다 — 여기서 손으로 등록하지 않는다 `PC-297`
//   여기서는 이름(고칠 수 있음) · 부서 · 역할 · 사용 중지만. 이메일 = 로그인 계정이라 고칠 수 없다.
//   계정은 지우지 않는다(활동 로그 · 담당자 기록이 이름을 쓴다) — 그만둔 직원은 「사용 중지」.
//   ADMIN 전용 화면(활동 로그와 같은 차단).
import { useEffect, useMemo, useState } from "react";
import { S } from "./ui";
import { auth, useAuth, currentUser, ALLOWED_DOMAINS, type Role, type User } from "@/lib/authStore";
import { logActivity } from "@/lib/activityStore";
import { WsStats, InfoTip } from "./KeyWorkspaceUI";

const roleTag = (r: Role) => ({ background: r === "ADMIN" ? "#eef6ff" : "#f3f4f6", color: r === "ADMIN" ? "#2563eb" : "#475569" });
const DEPTS = ["국내사업부", "해외사업부", "서비스기획팀", "SW개발팀", "펌웨어 팀"];
type StatusFilter = "all" | "on" | "off";
type SortKey = "name" | "dept" | "role" | "status";
const deptOf = (u: User) => (u.department && u.department !== "-" ? u.department : "");

export default function UsersView() {
  const s = useAuth();
  const me = currentUser(s);
  // ⚠ 훅은 조건부 return 앞에서 모두 선언
  const [q, setQ] = useState("");
  const [st, setSt] = useState<StatusFilter>("all");
  const [names, setNames] = useState<Record<string, string>>({});   // 이름 고치는 중인 값
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const flash = (ok: boolean, text: string) => { setToast({ ok, text }); setTimeout(() => setToast(null), 3000); };

  const users = s.users;
  const activeAdmins = users.filter((u) => u.role === "ADMIN" && u.enabled);
  // 정렬 — 이름 · 부서 · 상태 머리를 누르면 그 순서(다시 누르면 반대) `PC-297`
  //   순서는 머리를 누를 때만 다시 정한다 — 사용 중지 · 역할 · 이름 · 부서를 바꿔도 줄이 그 자리에 머문다
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: "name", asc: true });
  const [order, setOrder] = useState<string[]>([]);
  const cmp = (key: SortKey, asc: boolean) => (a: User, b: User) => {
    const byName = a.name.localeCompare(b.name, "ko");
    const d = key === "name" ? byName
      : key === "dept" ? ((deptOf(a) ? 0 : 1) - (deptOf(b) ? 0 : 1)) || deptOf(a).localeCompare(deptOf(b), "ko")   // 미지정은 끝
      : key === "role" ? (a.role === b.role ? 0 : a.role === "ADMIN" ? -1 : 1)   // ADMIN → STAFF
      : Number(b.enabled) - Number(a.enabled);   // 사용 중 → 사용 중지
    return (asc ? d : -d) || byName;
  };
  const sortBy = (key: SortKey) => {
    const next = { key, asc: sort.key === key ? !sort.asc : true };
    setSort(next);
    setOrder([...users].sort(cmp(next.key, next.asc)).map((u) => u.id));
  };
  const rows = useMemo(() => {
    const pos = new Map(order.map((id, i) => [id, i]));
    const base = [...users].sort(cmp(sort.key, sort.asc));   // 처음 · 새로 들어온 직원은 지금 정렬 기준으로
    const rank = (u: User) => pos.get(u.id) ?? order.length + base.indexOf(u);
    return users
      .filter((u) => (st === "all" ? true : st === "on" ? u.enabled : !u.enabled))
      .filter((u) => !q.trim() || `${u.name} ${u.email} ${u.department}`.toLowerCase().includes(q.trim().toLowerCase()))
      .sort((a, b) => (order.length ? rank(a) - rank(b) : cmp(sort.key, sort.asc)(a, b)));
  }, [users, st, q, order, sort]);   // eslint-disable-line react-hooks/exhaustive-deps
  // 처음 열 때 순서를 한 번 정해 둔다 — 이름을 고쳐도 줄이 움직이지 않게
  useEffect(() => { if (!order.length && users.length) setOrder([...users].sort(cmp(sort.key, sort.asc)).map((u) => u.id)); }, [users.length]);   // eslint-disable-line react-hooks/exhaustive-deps

  if (me?.role !== "ADMIN") {
    return (
      <div style={{ padding: "40px 22px", display: "flex", justifyContent: "center" }}>
        <div style={{ ...S.card, padding: "28px 32px", textAlign: "center", maxWidth: 420 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🔒</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>접근 권한이 없습니다</div>
          <div style={{ fontSize: 12.5, color: "#6b7280", marginTop: 6 }}>직원 계정은 관리자(ADMIN) 계정만 관리할 수 있습니다.</div>
        </div>
      </div>
    );
  }

  // 마지막 ADMIN 은 STAFF 로 바꾸거나 사용 중지할 수 없다 — 관리자가 없어지는 것을 막는다
  const lastAdmin = (u: User) => u.role === "ADMIN" && u.enabled && activeAdmins.length <= 1;
  const setRole = (u: User, role: Role) => {
    if (role === u.role) return;
    if (role === "STAFF" && lastAdmin(u)) { flash(false, "관리자(ADMIN)가 한 명은 있어야 합니다. 다른 직원을 먼저 ADMIN 으로 지정하세요."); return; }
    auth.updateUser(u.id, { role });
    logActivity("access", `직원 계정 · 역할 변경 · ${u.name}(${u.email}) · ${u.role} → ${role}`, me.name);
    flash(true, `역할 변경 — ${u.name} · ${role}`);
  };
  const setDept = (u: User, department: string) => {
    if (department === u.department) return;
    auth.updateUser(u.id, { department });
    logActivity("access", `직원 계정 · 부서 변경 · ${u.name} · ${department}`, me.name);
  };
  const toggle = (u: User) => {
    if (u.enabled && u.id === me.id) { flash(false, "로그인한 내 계정은 사용 중지할 수 없습니다."); return; }
    if (u.enabled && lastAdmin(u)) { flash(false, "관리자(ADMIN)가 한 명은 있어야 합니다. 다른 직원을 먼저 ADMIN 으로 지정하세요."); return; }
    auth.updateUser(u.id, { enabled: !u.enabled });
    logActivity("access", `직원 계정 · ${u.enabled ? "사용 중지" : "다시 사용"} · ${u.name}(${u.email})`, me.name);
    flash(true, `${u.enabled ? "사용 중지" : "다시 사용"} — ${u.name}`);
  };
  // 이름 — 표에서 바로 고친다(칸을 벗어나거나 Enter 면 저장). 비우면 원래 이름으로 `PC-297`
  const saveName = (u: User) => {
    const v = names[u.id];
    if (v === undefined) return;
    const name = v.trim();
    setNames(({ [u.id]: _drop, ...rest }) => rest);
    if (!name) { flash(false, "이름은 비울 수 없습니다."); return; }
    if (name === u.name) return;
    auth.updateUser(u.id, { name });
    logActivity("access", `직원 계정 · 이름 변경 · ${u.email} · ${u.name} → ${name}`, me.name);
    flash(true, `이름 변경 — ${name}`);
  };

  const chip = (on: boolean): React.CSSProperties => ({
    fontSize: 12.5, padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontWeight: on ? 700 : 400,
    border: `1px solid ${on ? "#93c5fd" : "#e5e7eb"}`, background: on ? "#eef6ff" : "#fff", color: on ? "#1d4ed8" : "#6b7280",
  });
  const nOff = users.filter((u) => !u.enabled).length;
  // 정렬 머리 — 지금 정렬 중이면 ▲ / ▼, 아니면 흐린 ↕
  const sortTh = (label: string, key: SortKey, extra?: React.ReactNode) => {
    const on = sort.key === key;
    return (
      <th style={{ ...S.th, textAlign: "left" }} aria-sort={on ? (sort.asc ? "ascending" : "descending") : "none"}>
        <button type="button" onClick={() => sortBy(key)} title={`${label} 순으로 정렬 — 다시 누르면 반대`}
          style={{ border: 0, background: "transparent", padding: 0, font: "inherit", color: on ? "#1d4ed8" : "inherit", fontWeight: on ? 700 : "inherit", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
          {label}<span style={{ fontSize: 10, color: on ? "#1d4ed8" : "#c0c4cc" }}>{on ? (sort.asc ? "▲" : "▼") : "↕"}</span>
        </button>
        {extra && <span style={{ marginLeft: 4, verticalAlign: "middle" }}>{extra}</span>}
      </th>
    );
  };

  return (
    <div style={{ padding: "18px 20px" }}>
      <WsStats items={[
        ["직원", `${users.length}명`, "#111827"],
        ["ADMIN", `${users.filter((u) => u.role === "ADMIN" && u.enabled).length}명`, "#2563eb"],
        ["STAFF", `${users.filter((u) => u.role === "STAFF" && u.enabled).length}명`, "#475569"],
        ["사용 중지", `${nOff}명`, nOff ? "#dc2626" : "#9ca3af"],
      ]} />

      {/* overflow 를 자르지 않는다 — ⓘ 말풍선이 표가 짧아도 카드 밖으로 다 보이게 */}
      <div style={{ ...S.card, padding: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "10px 14px", borderBottom: "1px solid #eef0f4" }}>
          <b style={{ fontSize: 13.5 }}>직원 계정</b>
          <InfoTip title="직원 계정이란?" width={340}>
            이 콘솔을 쓰는 내부 직원입니다. 회사 계정(@{ALLOWED_DOMAINS[0]})으로 처음 로그인하면 <b>그 이메일로 자동 등록</b>(STAFF)됩니다 — 따로 등록하지 않습니다.
            여기서는 이름 · 부서 · 역할 · 사용 여부를 정합니다. 그만둔 직원은 지우지 않고 「사용 중지」합니다(로그인할 수 없게 됩니다).
          </InfoTip>
          <span style={{ width: 8 }} />
          {([["all", `전체 ${users.length}`], ["on", "사용 중"], ["off", `사용 중지 ${nOff}`]] as [StatusFilter, string][]).map(([v, l]) => (
            <button key={v} type="button" onClick={() => setSt(v)} style={chip(st === v)}>{l}</button>
          ))}
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름 · 이메일 · 부서 검색" aria-label="이름 · 이메일 · 부서 검색"
            style={{ ...S.input, width: 220, marginLeft: 4 }} />
        </div>
        <table style={{ ...S.table }}>
          <thead><tr>
            {sortTh("이름", "name")}
            <th style={{ ...S.th, textAlign: "left" }}>이메일 (로그인 계정)</th>
            {sortTh("부서", "dept")}
            {/* 역할 — 정렬(ADMIN → STAFF) · ⓘ 역할 차이(지금 구현 기준) `PC-297` */}
            {sortTh("역할", "role", (
                <InfoTip title="역할 차이" width={340}>
                  <b>ADMIN</b> — 모든 메뉴 + <b>활동 로그</b>(누가 언제 무엇을 했는지) · <b>직원 계정</b>(이름 · 부서 · 역할 · 사용 중지) 관리.<br />
                  <b>STAFF</b> — 고객사 관리 · 코드 할당 · 편집 · App Key / N Key 발급 · 정산 등 업무 메뉴 전부. 활동 로그 · 직원 계정은 보이지 않습니다.<br />
                  관리자(ADMIN)는 한 명 이상 있어야 합니다.
                </InfoTip>
            ))}
            {sortTh("상태", "status")}
          </tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} style={{ borderTop: "1px solid #eef0f4", opacity: u.enabled ? 1 : 0.55 }}>
                <td style={{ ...S.td, fontWeight: 600 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <input value={names[u.id] ?? u.name} aria-label={`${u.email} 이름`} title="고치고 칸을 벗어나거나 Enter 를 누르면 저장됩니다"
                      onChange={(e) => setNames({ ...names, [u.id]: e.target.value })} onBlur={() => saveName(u)}
                      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setNames(({ [u.id]: _d, ...rest }) => rest); }}
                      style={{ ...S.input, width: 130, fontWeight: 600 }} />
                    {me.id === u.id && <span style={{ ...S.tag, background: "#ecfdf5", color: "#047857" }}>나</span>}
                  </span>
                </td>
                {/* 이메일 = 로그인한 회사 계정 — 고칠 수 없다 */}
                <td style={{ ...S.td, fontFamily: "ui-monospace,monospace", fontSize: 12, color: "#6b7280" }}>{u.email}</td>
                <td style={S.td}>
                  <select value={DEPTS.includes(u.department) ? u.department : ""} onChange={(e) => setDept(u, e.target.value)} style={{ ...S.input, width: 140 }} aria-label={`${u.name} 부서`}>
                    {!DEPTS.includes(u.department) && <option value="">{u.department && u.department !== "-" ? u.department : "- 미지정 -"}</option>}
                    {DEPTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </td>
                <td style={S.td}>
                  <select value={u.role} onChange={(e) => setRole(u, e.target.value as Role)} style={{ ...S.input, width: 110, ...roleTag(u.role) }} aria-label={`${u.name} 역할`}>
                    <option value="ADMIN">ADMIN</option><option value="STAFF">STAFF</option>
                  </select>
                </td>
                <td style={S.td}>
                  <button type="button" onClick={() => toggle(u)} title={u.enabled ? "누르면 사용 중지 — 로그인할 수 없게 됩니다" : "누르면 다시 사용"}
                    style={{ ...S.tag, cursor: "pointer", border: 0, ...(u.enabled ? { background: "#dcfce7", color: "#166534" } : { background: "#f3f4f6", color: "#9ca3af" }) }}>
                    {u.enabled ? "사용 중" : "사용 중지"}
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} style={{ ...S.td, textAlign: "center", color: "#9ca3af", padding: 28 }}>조건에 맞는 직원이 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>
      {toast && <div style={{ marginTop: 10, fontSize: 12.5, color: toast.ok ? "#047857" : "#dc2626", textAlign: "right" }}>{toast.text}</div>}

    </div>
  );
}
