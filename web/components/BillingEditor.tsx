"use client";

// 정산 입력 공용 조각 — App Key 티켓 · 서비스 티켓이 같은 모양을 쓴다 `PC-176` `PC-177`
//   과금 유형은 N Key 관리와 같은 4종: 미정 · 유료(금액) · 무료 · 체험(1개월).
import { useState } from "react";
import { S, Field } from "./ui";
import { BILLINGS, BILL_COLOR, daysLeft, plusMonth, today, type Billing } from "@/lib/ticketStore";
import { wsTag as tag } from "./KeyWorkspaceUI";

export type BillInfo = { billing?: Billing; amount?: number; trialUntil?: string; billNote?: string; billedAt?: string; billedBy?: string };
export type BillPatch = { billing: Billing; amount: number; trialUntil?: string; billNote: string };

/** 정산 배지 — 유료는 금액, 체험은 D-day / (만료) */
export function BillTag({ v }: { v: BillInfo }) {
  const b = v.billing ?? "미정", c = BILL_COLOR[b];
  const left = b === "체험" ? daysLeft(v.trialUntil) : null;
  return (
    <span style={tag(c.bg, c.fg)} title="정산">
      {b}{b === "유료" && v.amount ? ` ${v.amount.toLocaleString()}원` : ""}{left != null ? (left < 0 ? " (만료)" : ` D-${left}`) : ""}
    </span>
  );
}

/** 정산 입력 — baseDate(발급 · 지정일) + 1개월이 체험 만료일 기본값. 저장은 onSave 가 맡는다 */
export function BillingEditor({ v, baseDate, onSave }: { v: BillInfo; baseDate: string; onSave: (p: BillPatch) => void }) {
  const [billing, setBilling] = useState<Billing>(v.billing ?? "미정");
  const [amount, setAmount] = useState(v.amount ?? 0);
  // 대장 발급분은 발급일이 비어 있을 수 있다 — 날짜가 아니면 오늘을 기준으로 한다
  const base = /^\d{4}-\d{2}-\d{2}/.test(baseDate) ? baseDate : today();
  const [trial, setTrial] = useState(v.trialUntil ?? plusMonth(base));
  const [note, setNote] = useState(v.billNote ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const save = () => {
    if (billing === "유료" && amount <= 0) { setMsg({ ok: false, text: "유료는 금액을 입력해야 합니다." }); return; }
    onSave({ billing, amount: billing === "유료" ? amount : 0, trialUntil: billing === "체험" ? trial : undefined, billNote: note.trim() });
    setMsg({ ok: true, text: "정산 정보가 저장되었습니다." });
  };
  return (
    <div style={{ marginTop: 14, border: "1px solid #eef0f4", borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>정산 <span style={{ fontSize: 11.5, fontWeight: 400, color: "#9ca3af" }}>· 고객사 · 티켓마다 다르게 등록할 수 있습니다</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
        {BILLINGS.map((b) => {
          const on = billing === b; const bc = BILL_COLOR[b];
          return (
            <button key={b} type="button" onClick={() => setBilling(b)}
              style={{ padding: "9px 8px", borderRadius: 9, cursor: "pointer", fontSize: 12.5, fontWeight: on ? 700 : 400,
                border: `1px solid ${on ? bc.fg : "#e5e7eb"}`, background: on ? bc.bg : "#fff", color: on ? bc.fg : "#6b7280" }}>
              {b}
              <div style={{ fontSize: 10, fontWeight: 400, color: on ? bc.fg : "#9ca3af", marginTop: 2 }}>
                {b === "유료" ? "금액 입력" : b === "무료" ? "청구 없음" : b === "체험" ? "1개월" : "미등록"}
              </div>
            </button>
          );
        })}
      </div>
      {billing === "유료" && (
        <div style={{ maxWidth: 320 }}>
          <Field label="금액 (원) *">
            <input type="number" min={0} step={10000} style={S.input} value={amount} onChange={(e) => setAmount(Math.max(0, Math.round(+e.target.value)))} />
          </Field>
        </div>
      )}
      {billing === "체험" && (
        <div style={{ maxWidth: 320 }}>
          <Field label="체험 만료일 (기본 = 1개월 뒤)">
            <input type="date" style={S.input} value={trial} onChange={(e) => setTrial(e.target.value)} />
          </Field>
        </div>
      )}
      {billing === "무료" && <div style={{ fontSize: 12.5, color: "#166534" }}>청구하지 않는 티켓으로 기록됩니다. (사유는 아래 비고에 남겨 주세요)</div>}
      <div style={{ marginTop: 10 }}>
        <Field label="비고 (사유 · 계약 정보)">
          <input style={S.input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="예) 2026 연간 계약 포함 · 데모 제공" />
        </Field>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
        {v.billedAt && <span style={{ fontSize: 11.5, color: "#9ca3af" }}>최근 등록: {v.billedAt.slice(0, 16).replace("T", " ")}{v.billedBy ? ` · ${v.billedBy}` : ""}</span>}
        {msg && <span style={{ fontSize: 12, color: msg.ok ? "#166534" : "#b91c1c" }}>{msg.text}</span>}
        <span style={{ flex: 1 }} />
        <button type="button" onClick={save} style={S.primary}>정산 저장</button>
      </div>
    </div>
  );
}
