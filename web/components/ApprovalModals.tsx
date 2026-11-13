"use client";

// 승인 요청 모달 — 고객사 관리(고객 가입) · 직원 계정(첫 방문 직원) 같은 모양 `PC-303`
//   머리 버튼 「🔔 승인 요청 n건」을 누르면 바로 열린다. 한 줄 = 한 요청, 줄 끝에 [승인] [거절]
//   고객사: 서비스 · 업체명 · 이메일 · 이름 · 요청 일시   /   직원: 이름 · 이메일 · 요청 일시
import Link from "next/link";
import { useState } from "react";
import { Modal, S } from "./ui";
import { store, useStore } from "@/lib/store";
import { auth, useAuth, currentUser, pendingRequests, type PermReq } from "@/lib/authStore";
import { logActivity } from "@/lib/activityStore";
import { onboarding, useOnboarding, onboardServiceToCompany, onboardServiceLabel, type OnboardingRequest } from "@/lib/onboardingStore";

const MONO: React.CSSProperties = { fontFamily: "ui-monospace,monospace", fontSize: 12 };
const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", fontSize: 11.5, color: "#6b7280", fontWeight: 600, background: "#fafbfc", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "9px 10px", fontSize: 12.5, borderTop: "1px solid #eef0f4", verticalAlign: "middle" };
const btnOk: React.CSSProperties = { ...S.primary, padding: "5px 12px", fontSize: 12.5 };
const btnNo: React.CSSProperties = { ...S.ghost, padding: "5px 12px", fontSize: 12.5, color: "#dc2626", borderColor: "#fecaca", marginLeft: 6 };

/** 머리 버튼 — 대기 요청이 있을 때만 「🔔 승인 요청 n건」 */
export function ApprovalButton({ n, onClick }: { n: number; onClick: () => void }) {
  if (n <= 0) return null;
  return (
    <button type="button" onClick={onClick}
      style={{ fontSize: 12.5, padding: "6px 12px", borderRadius: 8, cursor: "pointer", border: "1px solid #fcd34d", background: "#fffbeb", color: "#92400e", fontWeight: 700 }}>
      🔔 승인 요청 {n}건
    </button>
  );
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid #eef0f4", borderRadius: 10, overflow: "auto", maxHeight: 440 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{head.map((h, i) => <th key={h} style={{ ...th, textAlign: i === head.length - 1 ? "right" : "left" }}>{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
const Empty = () => <div style={{ fontSize: 13, color: "#6b7280", padding: "22px 0", textAlign: "center" }}>대기 중인 승인 요청이 없습니다.</div>;
const Foot = ({ onClose }: { onClose: () => void }) => (
  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}><button type="button" onClick={onClose} style={S.ghost}>닫기</button></div>
);

/* ── 고객사 — 우리 서비스(CasterN · 폼솔루션 · SDK)에 SSO 로 처음 로그인한 고객 `PC-116` ── */
export function CompanyApprovalModal({ onClose }: { onClose: () => void }) {
  const { companies } = useStore();
  const me = currentUser(useAuth());
  const pending = useOnboarding().requests.filter((r) => r.status === "PENDING");
  const [done, setDone] = useState<{ ok: boolean; org: string; companyId?: number; email?: string } | null>(null);
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");

  // 승인 → 같은 이름 고객사가 있으면 연결, 없으면 새로 등록. 그 뒤 계정 추가로 안내 `PC-133`
  const approve = (r: OnboardingRequest) => {
    const svc = onboardServiceToCompany(r.service);
    const existing = companies.find((c) => norm(c.name) === norm(r.org));
    let cid: number;
    if (existing) {
      cid = existing.id;
      if (svc && !(existing.services ?? []).includes(svc)) store.upsertCompany({ ...existing, services: [...(existing.services ?? []), svc] });
    } else {
      cid = store.upsertCompany({
        id: 0, name: r.org, manager: r.name, contact: r.email, address: "", bizNo: "",
        bankName: "", accountNo: "", taxEmail: r.email, docs: [], services: svc ? [svc] : [],
      });
    }
    onboarding.approve(r.id, cid, me?.name);
    // 직원이 처리한 기록으로 읽히게 — 고객이 NcodeCenter 에 온 것이 아니다 `PC-320`
    logActivity("approval", `고객사 승인 요청 승인 — ${r.org} · ${onboardServiceLabel(r.service)} · ${r.email} → ${existing ? "기존 고객사 연결" : "고객사 신규 등록"}`, me?.name);
    setDone({ ok: true, org: r.org, companyId: cid, email: r.email });
  };
  const reject = (r: OnboardingRequest) => {
    if (!window.confirm(`${r.org} (${r.email}) 의 승인 요청을 거절할까요?`)) return;
    onboarding.reject(r.id, me?.name);
    logActivity("approval", `고객사 승인 요청 거절 — ${r.org} · ${onboardServiceLabel(r.service)} · ${r.email}`, me?.name);   // `PC-320`
    setDone({ ok: false, org: r.org });
  };

  return (
    <Modal onClose={onClose} title={`승인 요청 ${pending.length}건`} width={860}>
      {done && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 12.5, padding: "8px 12px", borderRadius: 9,
          background: done.ok ? "#ecfdf5" : "#f3f4f6", color: done.ok ? "#047857" : "#6b7280" }}>
          {done.ok ? <>✅ <b>{done.org}</b> 승인 — 고객사로 등록했습니다.</> : <>거절 — <b>{done.org}</b></>}
          <span style={{ flex: 1 }} />
          {done.ok && done.companyId && (
            <Link href={`/companies/${done.companyId}?email=${encodeURIComponent(done.email ?? "")}`} onClick={onClose}
              style={{ color: "#047857", fontWeight: 700, textDecoration: "none" }}>계정 추가 →</Link>
          )}
        </div>
      )}
      {pending.length === 0 ? <Empty /> : (
        <Table head={["서비스", "업체명", "이메일", "이름", "요청 일시", "처리"]}>
          {pending.map((r) => (
            <tr key={r.id}>
              <td style={td}><span style={{ ...S.tag, background: "#eef6ff", color: "#2563eb", fontWeight: 700, whiteSpace: "nowrap" }}>{onboardServiceLabel(r.service)}</span></td>
              <td style={{ ...td, fontWeight: 700 }}>{r.org}</td>
              <td style={{ ...td, ...MONO, color: "#374151" }}>{r.email}</td>
              <td style={td}>{r.name}</td>
              <td style={{ ...td, ...MONO, color: "#6b7280", whiteSpace: "nowrap" }}>{r.firstLoginAt.slice(0, 16)}</td>
              <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                <button type="button" onClick={() => approve(r)} style={btnOk}>승인</button>
                <button type="button" onClick={() => reject(r)} style={btnNo}>거절</button>
              </td>
            </tr>
          ))}
        </Table>
      )}
      <Foot onClose={onClose} />
    </Modal>
  );
}

/* ── 직원 — 로그인 화면 [첫 방문 — 승인 요청]으로 들어온 내부 직원 `PC-299` ── */
export function StaffApprovalModal({ onClose }: { onClose: () => void }) {
  const a = useAuth();
  const me = currentUser(a);
  const reqs = pendingRequests(a);
  const [done, setDone] = useState<{ ok: boolean; name: string } | null>(null);
  const approve = (r: PermReq) => { auth.approveRequest(r.id, me?.name); setDone({ ok: true, name: r.name }); };
  const reject = (r: PermReq) => {
    if (!window.confirm(`${r.name}(${r.email}) 의 승인 요청을 거절할까요?`)) return;
    auth.rejectRequest(r.id, me?.name); setDone({ ok: false, name: r.name });
  };
  return (
    <Modal onClose={onClose} title={`승인 요청 ${reqs.length}건`} width={640}>
      {done && (
        <div style={{ marginBottom: 10, fontSize: 12.5, padding: "8px 12px", borderRadius: 9, background: done.ok ? "#ecfdf5" : "#f3f4f6", color: done.ok ? "#047857" : "#6b7280" }}>
          {done.ok ? <>✅ <b>{done.name}</b> 승인 — STAFF 로 직원 명단에 들어갔습니다.</> : <>거절 — <b>{done.name}</b></>}
        </div>
      )}
      {reqs.length === 0 ? <Empty /> : (
        <Table head={["이름", "이메일", "요청 일시", "처리"]}>
          {reqs.map((r) => (
            <tr key={r.id}>
              <td style={{ ...td, fontWeight: 700 }}>{r.name}</td>
              <td style={{ ...td, ...MONO, color: "#374151" }}>{r.email}</td>
              <td style={{ ...td, ...MONO, color: "#6b7280", whiteSpace: "nowrap" }}>{r.createdAt.slice(0, 16)}</td>
              <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                <button type="button" onClick={() => approve(r)} style={btnOk}>승인</button>
                <button type="button" onClick={() => reject(r)} style={btnNo}>거절</button>
              </td>
            </tr>
          ))}
        </Table>
      )}
      <Foot onClose={onClose} />
    </Modal>
  );
}
