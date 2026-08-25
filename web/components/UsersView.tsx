"use client";

import { useState } from "react";
import { S, Field, Modal } from "./ui";
import { auth, useAuth, currentUser, Role } from "@/lib/authStore";

const roleTag = (r: Role) => ({ background: r === "ADMIN" ? "#eef6ff" : "#f3f4f6", color: r === "ADMIN" ? "#2563eb" : "#475569" });
const DEPTS = ["국내사업부", "해외사업부", "서비스기획팀", "SW개발팀", "펌웨어 팀"];

export default function UsersView() {
  const s = useAuth();
  const me = currentUser(s);
  const [add, setAdd] = useState<{ name: string; email: string; department: string; role: Role } | null>(null);
  const [toast, setToast] = useState("");
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3000); };

  const pending = s.requests.filter((r) => r.status === "PENDING");

  const saveAdd = () => {
    if (!add) return;
    if (!add.name.trim() || !add.email.trim()) { flash("이름·이메일은 필수입니다."); return; }
    if (!auth.addUser(add)) { flash("이미 등록된 이메일입니다."); return; }
    flash(`추가됨 · ${add.name}`); setAdd(null);
  };

  return (
    <div style={{ padding: "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
        <p style={{ margin: 0, color: "#6b7280", fontSize: 13 }}>
          내부 직원 계정·권한(ADMIN/STAFF) 관리. 등록 이메일로 로그인 · 권한요청 승인. 로그인: <b>{me ? `${me.name}(${me.role})` : "비로그인"}</b>
        </p>
        <div style={{ flex: 1 }} />
        <button onClick={() => setAdd({ name: "", email: "", department: DEPTS[0], role: "STAFF" })} style={S.primary}>＋ 사용자 추가</button>
      </div>

      {toast && <div style={S.toast}>{toast}</div>}

      {/* 권한 요청 */}
      <div style={{ ...S.card, padding: 0, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ padding: "10px 14px", fontWeight: 700, fontSize: 13, borderBottom: "1px solid #eef0f4", display: "flex", alignItems: "center", gap: 8 }}>
          권한 요청 <span style={{ ...S.tag, ...(pending.length ? { background: "#fef3c7", color: "#92400e" } : {}) }}>{pending.length} 대기</span>
        </div>
        <table style={{ ...S.table, textAlign: "center" }}>
          <thead><tr>{["요청일", "이름", "이메일", "부서", "요청 권한", "사유", "상태", "처리"].map((h) => <th key={h} style={{ ...S.th, textAlign: "center" }}>{h}</th>)}</tr></thead>
          <tbody>
            {s.requests.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid #eef0f4" }}>
                <td style={{ ...S.td, color: "#9ca3af", fontFamily: "ui-monospace,monospace" }}>{r.createdAt}</td>
                <td style={{ ...S.td, fontWeight: 600 }}>{r.name}</td>
                <td style={{ ...S.td, fontFamily: "ui-monospace,monospace", fontSize: 11.5 }}>{r.email}</td>
                <td style={S.td}>{r.department}</td>
                <td style={S.td}><span style={{ ...S.tag, ...roleTag(r.role) }}>{r.role}</span></td>
                <td style={{ ...S.td, fontSize: 12, color: "#6b7280", textAlign: "left", maxWidth: 220 }}>{r.reason}</td>
                <td style={S.td}>{r.status === "PENDING" ? <span style={{ color: "#92400e" }}>대기</span> : r.status === "APPROVED" ? <span style={{ color: "#047857" }}>승인</span> : <span style={{ color: "#dc2626" }}>거부</span>}</td>
                <td style={S.td}>
                  {r.status === "PENDING" ? (
                    <>
                      <button onClick={() => { auth.approveRequest(r.id); flash(`승인 · ${r.name}`); }} style={{ ...S.linkBtn, color: "#047857" }}>승인</button>
                      <button onClick={() => { auth.rejectRequest(r.id); flash(`거부 · ${r.name}`); }} style={{ ...S.linkBtn, color: "#dc2626" }}>거부</button>
                    </>
                  ) : "-"}
                </td>
              </tr>
            ))}
            {s.requests.length === 0 && <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", color: "#9ca3af", padding: 24 }}>권한 요청이 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* 사용자 목록 */}
      <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", fontWeight: 700, fontSize: 13, borderBottom: "1px solid #eef0f4" }}>사용자 ({s.users.length})</div>
        <table style={{ ...S.table, textAlign: "center" }}>
          <thead><tr>{["부서", "이름", "이메일", "권한", "상태", "삭제"].map((h) => <th key={h} style={{ ...S.th, textAlign: "center" }}>{h}</th>)}</tr></thead>
          <tbody>
            {s.users.map((u) => (
              <tr key={u.id} style={{ borderTop: "1px solid #eef0f4" }}>
                <td style={S.td}>{u.department}</td>
                <td style={{ ...S.td, fontWeight: 600 }}>{u.name}{me?.id === u.id && <span style={{ ...S.tag, marginLeft: 6, background: "#ecfdf5", color: "#047857" }}>나</span>}</td>
                <td style={{ ...S.td, fontFamily: "ui-monospace,monospace", fontSize: 11.5 }}>{u.email}</td>
                <td style={S.td}>
                  <select value={u.role} onChange={(e) => auth.updateUser(u.id, { role: e.target.value as Role })} style={{ ...S.input, width: 100, ...roleTag(u.role) }}>
                    <option value="ADMIN">ADMIN</option><option value="STAFF">STAFF</option>
                  </select>
                </td>
                <td style={S.td}>
                  <button onClick={() => auth.updateUser(u.id, { enabled: !u.enabled })} style={{ ...S.tag, cursor: "pointer", border: 0, ...(u.enabled ? { background: "#dcfce7", color: "#166534" } : { background: "#f3f4f6", color: "#9ca3af" }) }}>{u.enabled ? "활성" : "비활성"}</button>
                </td>
                <td style={S.td}>
                  <button onClick={() => { if (confirm(`${u.name} 계정을 삭제할까요?`)) auth.deleteUser(u.id); }} style={{ ...S.linkBtn, color: "#dc2626" }}>삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {add && (
        <Modal onClose={() => setAdd(null)} title="사용자 추가">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="이름 *"><input style={S.input} value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} /></Field>
            <Field label="이메일 *"><input style={S.input} value={add.email} onChange={(e) => setAdd({ ...add, email: e.target.value })} placeholder="name@neolab.net" /></Field>
            <Field label="부서">
              <select style={S.input} value={add.department} onChange={(e) => setAdd({ ...add, department: e.target.value })}>
                {DEPTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="권한">
              <select style={S.input} value={add.role} onChange={(e) => setAdd({ ...add, role: e.target.value as Role })}>
                <option value="STAFF">STAFF</option><option value="ADMIN">ADMIN</option>
              </select>
            </Field>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button onClick={() => setAdd(null)} style={S.ghost}>취소</button>
            <button onClick={saveAdd} style={S.primary}>추가</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
