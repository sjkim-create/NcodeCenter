"use client";

import { useMemo, useState } from "react";

type ServiceType = "FORMSOLUTION" | "CASTERN" | "AIGLE" | "ETC";
type Company = {
  id: number;
  company: string;
  project: string;
  manager: string;
  contact: string;
  address: string;
  serviceType: ServiceType;
  grade: string; // 폼솔루션만
  section: number;
  owner: number;
  bookStart: number; bookEnd: number;
  pageStart: number; pageEnd: number;
  allocatedCodes: number; // 삭제 시 reset 대상 수
};

const SERVICE: { v: ServiceType; label: string }[] = [
  { v: "FORMSOLUTION", label: "폼솔루션" },
  { v: "CASTERN", label: "편집툴 (casterN)" },
  { v: "AIGLE", label: "아이글" },
  { v: "ETC", label: "기타 코드전용" },
];
const serviceLabel = (v: ServiceType) => SERVICE.find((s) => s.v === v)?.label ?? v;
const GRADES = ["a", "b", "c"];

const SEED: Company[] = [
  { id: 1, company: "MathLAB", project: "Math 콘텐츠", manager: "김수학", contact: "010-1111-2222", address: "서울 강남구", serviceType: "FORMSOLUTION", grade: "a", section: 5, owner: 100, bookStart: 1, bookEnd: 9, pageStart: 1, pageEnd: 140, allocatedCodes: 262 },
  { id: 2, company: "비상교육", project: "스마트펜 솔루션", manager: "장민지", contact: "02-333-4444", address: "서울 구로구", serviceType: "CASTERN", grade: "", section: 3, owner: 941, bookStart: 0, bookEnd: 1200, pageStart: 0, pageEnd: 255, allocatedCodes: 1200 },
  { id: 3, company: "아이글", project: "에듀플랫폼(수능)", manager: "한윤정", contact: "031-555-6666", address: "경기 성남시", serviceType: "AIGLE", grade: "", section: 10, owner: 0, bookStart: 1, bookEnd: 40, pageStart: 0, pageEnd: 1023, allocatedCodes: 40 },
];

const EMPTY: Omit<Company, "id" | "allocatedCodes"> = {
  company: "", project: "", manager: "", contact: "", address: "",
  serviceType: "FORMSOLUTION", grade: "a", section: 5, owner: 0,
  bookStart: 0, bookEnd: 0, pageStart: 0, pageEnd: 0,
};

const BLUE = "#5f8ff0";
const sobp = (c: Company) => `S${c.section}/O${c.owner}/B${c.bookStart}~${c.bookEnd}/P${c.pageStart}~${c.pageEnd}`;

export default function RegisterView() {
  const [rows, setRows] = useState<Company[]>(SEED);
  const [editing, setEditing] = useState<Company | null>(null); // 폼 열림(수정 or 신규)
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [delTarget, setDelTarget] = useState<Company | null>(null);
  const [delConfirm, setDelConfirm] = useState("");
  const [toast, setToast] = useState<string>("");

  const openNew = () => { setForm(EMPTY); setEditing({ ...EMPTY, id: 0, allocatedCodes: 0 } as Company); };
  const openEdit = (c: Company) => { setForm({ ...c }); setEditing(c); };
  const closeForm = () => setEditing(null);

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.company.trim() || !form.project.trim()) { setToast("업체명·프로젝트명은 필수입니다."); return; }
    if (editing && editing.id) {
      setRows((r) => r.map((x) => (x.id === editing.id ? { ...x, ...form } : x)));
      flash(`수정됨 · ${form.company}`);
    } else {
      const id = Math.max(0, ...rows.map((r) => r.id)) + 1;
      setRows((r) => [{ id, allocatedCodes: 0, ...form }, ...r]);
      flash(`등록됨 · ${form.company} / ${form.project}`);
    }
    setEditing(null);
  };

  const confirmDelete = () => {
    if (!delTarget) return;
    const n = delTarget.allocatedCodes;
    setRows((r) => r.filter((x) => x.id !== delTarget.id));
    flash(`삭제됨 · ${delTarget.company} · 할당 코드 ${n.toLocaleString()}건 reset`);
    setDelTarget(null); setDelConfirm("");
  };

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 4000); };

  const totalAlloc = useMemo(() => rows.reduce((s, r) => s + r.allocatedCodes, 0), [rows]);

  return (
    <div style={{ padding: "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
        <p style={{ margin: 0, color: "#6b7280", fontSize: 13 }}>
          내부 직원이 업체·프로젝트를 등록·관리(=고객사 관리). 등록 {rows.length}건 · 할당 코드 {totalAlloc.toLocaleString()}
        </p>
        <div style={{ flex: 1 }} />
        <button onClick={openNew} style={S.primary}>＋ 새 등록</button>
      </div>

      {toast && <div style={S.toast}>{toast}</div>}

      <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
        <table style={S.table}>
          <thead>
            <tr>
              {["업체", "프로젝트", "서비스", "담당자 / 연락처", "SOBP", "등급", "할당", "작업"].map((h) => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} style={{ borderTop: "1px solid #eef0f4" }}>
                <td style={{ ...S.td, fontWeight: 600 }}>{c.company}</td>
                <td style={S.td}>{c.project}</td>
                <td style={S.td}><span style={S.tag}>{serviceLabel(c.serviceType)}</span></td>
                <td style={S.td}>{c.manager}<div style={{ color: "#9ca3af", fontSize: 11 }}>{c.contact}</div></td>
                <td style={{ ...S.td, fontFamily: "ui-monospace,monospace", fontSize: 11.5 }}>{sobp(c)}</td>
                <td style={S.td}>{c.serviceType === "FORMSOLUTION" ? (c.grade || "-") : "-"}</td>
                <td style={{ ...S.td, textAlign: "right" }}>{c.allocatedCodes.toLocaleString()}</td>
                <td style={S.td}>
                  <button onClick={() => openEdit(c)} style={S.linkBtn}>수정</button>
                  <button onClick={() => { setDelTarget(c); setDelConfirm(""); }} style={{ ...S.linkBtn, color: "#dc2626" }}>삭제</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", color: "#9ca3af", padding: 30 }}>등록된 업체가 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* 등록/수정 폼 모달 */}
      {editing && (
        <Modal onClose={closeForm} title={editing.id ? "업체/프로젝트 수정" : "업체/프로젝트 등록"} wide>
          <div style={S.grid2}>
            <Field label="업체명 *"><input style={S.input} value={form.company} onChange={(e) => set("company", e.target.value)} /></Field>
            <Field label="프로젝트명 *"><input style={S.input} value={form.project} onChange={(e) => set("project", e.target.value)} /></Field>
            <Field label="담당자"><input style={S.input} value={form.manager} onChange={(e) => set("manager", e.target.value)} /></Field>
            <Field label="연락처"><input style={S.input} value={form.contact} onChange={(e) => set("contact", e.target.value)} /></Field>
            <Field label="주소" full><input style={S.input} value={form.address} onChange={(e) => set("address", e.target.value)} /></Field>
            <Field label="서비스 유형">
              <select style={S.input} value={form.serviceType} onChange={(e) => set("serviceType", e.target.value as ServiceType)}>
                {SERVICE.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
              </select>
            </Field>
            {form.serviceType === "FORMSOLUTION" && (
              <Field label="등급 (폼솔루션)">
                <select style={S.input} value={form.grade} onChange={(e) => set("grade", e.target.value)}>
                  {GRADES.map((g) => <option key={g} value={g}>{g} 등급</option>)}
                </select>
              </Field>
            )}
          </div>

          <div style={{ fontSize: 12, color: "#6b7280", margin: "14px 0 6px", fontWeight: 600 }}>SOBP 지정 (코드 공간)</div>
          <div style={S.grid4}>
            <Field label="Section"><input type="number" style={S.input} value={form.section} onChange={(e) => set("section", +e.target.value)} /></Field>
            <Field label="Owner"><input type="number" style={S.input} value={form.owner} onChange={(e) => set("owner", +e.target.value)} /></Field>
            <Field label="Book 시작"><input type="number" style={S.input} value={form.bookStart} onChange={(e) => set("bookStart", +e.target.value)} /></Field>
            <Field label="Book 끝"><input type="number" style={S.input} value={form.bookEnd} onChange={(e) => set("bookEnd", +e.target.value)} /></Field>
            <Field label="Page 시작"><input type="number" style={S.input} value={form.pageStart} onChange={(e) => set("pageStart", +e.target.value)} /></Field>
            <Field label="Page 끝"><input type="number" style={S.input} value={form.pageEnd} onChange={(e) => set("pageEnd", +e.target.value)} /></Field>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
            <button onClick={closeForm} style={S.ghost}>취소</button>
            <button onClick={save} style={S.primary}>{editing.id ? "저장" : "등록"}</button>
          </div>
        </Modal>
      )}

      {/* 삭제 강력 경고 모달 */}
      {delTarget && (
        <Modal onClose={() => setDelTarget(null)} title="⚠ 업체 삭제 — 신중히 확인하세요">
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "14px 16px", fontSize: 13, color: "#991b1b", lineHeight: 1.7 }}>
            <b>{delTarget.company} / {delTarget.project}</b> 을(를) 삭제합니다.<br />
            • 삭제 업체는 <b>3~4년 뒤 재연락되는 경우가 많습니다.</b> 정말 삭제가 필요한지 재확인하세요.<br />
            • 삭제 시 이 업체에 <b>할당된 코드 {delTarget.allocatedCodes.toLocaleString()}건이 reset</b>됩니다(회수).<br />
            • 이 작업은 되돌릴 수 없습니다.
          </div>
          <div style={{ marginTop: 14, fontSize: 12.5, color: "#374151" }}>
            확인을 위해 업체명 <b>{delTarget.company}</b> 을(를) 입력하세요:
          </div>
          <input style={{ ...S.input, marginTop: 6 }} value={delConfirm} onChange={(e) => setDelConfirm(e.target.value)} placeholder={delTarget.company} />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button onClick={() => setDelTarget(null)} style={S.ghost}>취소</button>
            <button
              onClick={confirmDelete}
              disabled={delConfirm.trim() !== delTarget.company}
              style={{ ...S.danger, ...(delConfirm.trim() !== delTarget.company ? { opacity: 0.5, cursor: "not-allowed" } : {}) }}
            >
              삭제 확정 (코드 reset)
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: full ? "1 / -1" : undefined }}>
      <label style={{ fontSize: 11, color: "#6b7280" }}>{label}</label>
      {children}
    </div>
  );
}
function Modal({ title, wide, onClose, children }: { title: string; wide?: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.modal, width: wide ? 620 : 460 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
          <button onClick={onClose} style={{ ...S.linkBtn, fontSize: 16 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12 },
  primary: { background: BLUE, color: "#fff", border: 0, borderRadius: 9, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  ghost: { background: "#fff", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 9, padding: "9px 16px", fontSize: 13, cursor: "pointer" },
  danger: { background: "#dc2626", color: "#fff", border: 0, borderRadius: 9, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  linkBtn: { background: "none", border: 0, color: BLUE, cursor: "pointer", fontSize: 12.5, padding: "2px 6px" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12.5 },
  th: { textAlign: "left", padding: "10px 12px", color: "#6b7280", fontWeight: 600, background: "#fafbfc", fontSize: 11.5 },
  td: { padding: "10px 12px", verticalAlign: "top" },
  tag: { fontSize: 11, background: "#eef2f7", color: "#475569", borderRadius: 5, padding: "2px 7px" },
  toast: { background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", borderRadius: 9, padding: "9px 14px", fontSize: 12.5, marginBottom: 12 },
  overlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", display: "grid", placeItems: "center", zIndex: 50, padding: 20 },
  modal: { background: "#fff", borderRadius: 14, padding: "18px 20px", maxWidth: "94vw", maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.25)" },
  input: { width: "100%", padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, background: "#fff", boxSizing: "border-box" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  grid4: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 },
};
