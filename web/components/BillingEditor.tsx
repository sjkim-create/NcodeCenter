"use client";

// 정산 입력 공용 조각 — App Key 티켓 · N Key 티켓 · 서비스 티켓이 같은 모양을 쓴다 `PC-176` `PC-177` `PC-202`
//   과금 유형은 4종: 미정 · 유료(금액) · 무료 · 체험(1개월).
//   왼쪽에서 과금 유형을 고르고 오른쪽에 금액(원 · 달러)을 넣는다. 달러면 환율을 적어 둘 수 있다(자동 아님). 비고는 3줄.
import { useState } from "react";
import { S, Field } from "./ui";
import { BILLINGS, BILL_COLOR, daysLeft, fmtMoney, plusMonth, today, type Billing, type Currency } from "@/lib/ticketStore";
import { wsTag as tag } from "./KeyWorkspaceUI";
import { LICENSE_LABEL, licenseOf, saveLicense, useLicenses, yearFrom, type LicenseKind } from "@/lib/licenseStore";

export type BillInfo = { billing?: Billing; amount?: number; currency?: Currency; fxRate?: number; trialUntil?: string; billNote?: string; billedAt?: string; billedBy?: string };
export type BillPatch = { billing: Billing; amount: number; currency?: Currency; fxRate?: number; trialUntil?: string; billNote: string };

/** 정산 배지 — 유료는 금액(원 · $), 체험은 D-day / (만료) */
export function BillTag({ v }: { v: BillInfo }) {
  const b = v.billing ?? "미정", c = BILL_COLOR[b];
  const left = b === "체험" ? daysLeft(v.trialUntil) : null;
  return (
    <span style={tag(c.bg, c.fg)} title={v.currency === "USD" && v.fxRate ? `환율 기록 1 USD = ${v.fxRate.toLocaleString()}원` : "정산"}>
      {b}{b === "유료" && v.amount ? ` ${fmtMoney(v)}` : ""}{left != null ? (left < 0 ? " (만료)" : ` D-${left}`) : ""}
    </span>
  );
}

const SUB: Record<Billing, string> = { 유료: "금액 입력", 무료: "청구 없음", 체험: "1개월", 미정: "미등록" };
const LAB: React.CSSProperties = { fontSize: 12, color: "#6b7280", marginBottom: 6 };

/** 정산 입력 — baseDate(발급 · 지정일) + 1개월이 체험 만료일 기본값. 저장은 onSave 가 맡는다 */
export function BillingEditor({ v, baseDate, onSave, bare = false }: { v: BillInfo; baseDate: string; onSave: (p: BillPatch) => void; bare?: boolean }) {
  const [billing, setBilling] = useState<Billing>(v.billing ?? "미정");
  const [amount, setAmount] = useState(v.amount ?? 0);
  const [currency, setCurrency] = useState<Currency>(v.currency ?? "KRW");
  const [fx, setFx] = useState(v.fxRate ? String(v.fxRate) : "");
  // 대장 발급분은 발급일이 비어 있을 수 있다 — 날짜가 아니면 오늘을 기준으로 한다
  const base = /^\d{4}-\d{2}-\d{2}/.test(baseDate) ? baseDate : today();
  const [trial, setTrial] = useState(v.trialUntil ?? plusMonth(base));
  const [note, setNote] = useState(v.billNote ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fxNum = Number(fx.replace(/,/g, "")) || 0;
  const save = () => {
    if (billing === "유료" && amount <= 0) { setMsg({ ok: false, text: "유료는 금액을 입력해야 합니다." }); return; }
    onSave({
      billing, amount: billing === "유료" ? amount : 0,
      currency: billing === "유료" ? currency : undefined,
      fxRate: billing === "유료" && currency === "USD" && fxNum > 0 ? fxNum : undefined,
      trialUntil: billing === "체험" ? trial : undefined, billNote: note.trim(),
    });
    setMsg({ ok: true, text: "정산 정보가 저장되었습니다." });
  };
  const seg = (on: boolean): React.CSSProperties => ({ border: 0, padding: "0 12px", fontSize: 12.5, cursor: "pointer", fontWeight: on ? 700 : 400,
    background: on ? "#eef6ff" : "#fff", color: on ? "#1d4ed8" : "#6b7280" });

  return (
    <div style={bare ? undefined : { marginTop: 14, border: "1px solid #eef0f4", borderRadius: 10, padding: "12px 14px" }}>
      {!bare && <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>정산 <span style={{ fontSize: 11.5, fontWeight: 400, color: "#9ca3af" }}>· 고객사 · 티켓마다 다르게 등록할 수 있습니다</span></div>}
      {/* 왼쪽 과금 유형 · 오른쪽 금액(유료) / 체험 만료일(체험) `PC-202` */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 16, alignItems: "start" }}>
        <div>
          <div style={LAB}>과금 유형</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {BILLINGS.map((b) => {
              const on = billing === b; const bc = BILL_COLOR[b];
              return (
                <button key={b} type="button" onClick={() => setBilling(b)}
                  style={{ padding: "8px 8px", borderRadius: 9, cursor: "pointer", fontSize: 12.5, fontWeight: on ? 700 : 400,
                    border: `1px solid ${on ? bc.fg : "#e5e7eb"}`, background: on ? bc.bg : "#fff", color: on ? bc.fg : "#6b7280" }}>
                  {b}
                  <div style={{ fontSize: 10, fontWeight: 400, color: on ? bc.fg : "#9ca3af", marginTop: 2 }}>{SUB[b]}</div>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          {billing === "유료" && (
            <>
              <div style={LAB}>금액 *</div>
              <div style={{ display: "flex", gap: 6 }}>
                {/* 통화 — 원 · 달러 */}
                <div style={{ display: "inline-flex", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", flex: "0 0 auto" }}>
                  <button type="button" onClick={() => setCurrency("KRW")} style={seg(currency === "KRW")}>원</button>
                  <button type="button" onClick={() => setCurrency("USD")} style={{ ...seg(currency === "USD"), borderLeft: "1px solid #e5e7eb" }}>USD</button>
                </div>
                <input type="number" min={0} step={currency === "USD" ? 100 : 10000} style={{ ...S.input, textAlign: "right" }} value={amount}
                  onChange={(e) => setAmount(Math.max(0, Math.round(+e.target.value)))} />
              </div>
              {/* 환율 기록 — 선택 · 자동 아님 */}
              {currency === "USD" && (
                <div style={{ marginTop: 8 }}>
                  <div style={LAB}>환율 기록 <span style={{ color: "#9ca3af" }}>(선택 · 자동 아님)</span></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#6b7280" }}>
                    <span style={{ whiteSpace: "nowrap" }}>1 USD =</span>
                    <input inputMode="decimal" style={{ ...S.input, textAlign: "right" }} value={fx} onChange={(e) => setFx(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="예) 1,385" />
                    <span>원</span>
                  </div>
                  {fxNum > 0 && amount > 0 && <div style={{ fontSize: 11.5, color: "#6b7280", marginTop: 4 }}>≈ {Math.round(amount * fxNum).toLocaleString()}원 (기록한 환율 기준)</div>}
                </div>
              )}
            </>
          )}
          {billing === "체험" && (
            <Field label="체험 만료일 (기본 = 1개월 뒤)">
              <input type="date" style={S.input} value={trial} onChange={(e) => setTrial(e.target.value)} />
            </Field>
          )}
          {billing === "무료" && <div style={{ fontSize: 12.5, color: "#166534", paddingTop: 24 }}>청구하지 않는 티켓으로 기록됩니다.<br />사유는 아래 비고에 남겨 주세요.</div>}
          {billing === "미정" && <div style={{ fontSize: 12.5, color: "#9ca3af", paddingTop: 24 }}>과금 유형을 고르면 금액 · 기간을 입력합니다.</div>}
        </div>
      </div>
      {/* 비고 — 3줄 */}
      <div style={{ marginTop: 12 }}>
        <Field label="비고 (사유 · 계약 정보)">
          <textarea rows={3} style={{ ...S.input, minHeight: 72, resize: "vertical", lineHeight: 1.6, fontFamily: "inherit" }} value={note}
            onChange={(e) => setNote(e.target.value)} placeholder="예) 2026 연간 계약 포함 · 데모 제공" />
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

/** 연간 라이선스 비용 — 고객사마다 1건(App Key · N Key 따로) · 금액 · 기간만 `PC-212`
 *  티켓이 아니라 키 발급으로 생기는 비용이라 티켓 정산 위에 따로 둔다. 그 고객사의 모든 계정 · 티켓에서 같은 1건을 본다 */
export function LicenseEditor({ kind, companyId, company, by }: { kind: LicenseKind; companyId: number; company: string; by: string }) {
  useLicenses();
  const cur = licenseOf(kind, companyId);
  const [amount, setAmount] = useState(cur?.amount ?? 0);
  const [currency, setCurrency] = useState<Currency>(cur?.currency ?? "KRW");
  const [lfx, setLfx] = useState(cur?.fxRate ? String(cur.fxRate) : "");   // 환율 기록(USD) `PC-215`
  const lfxNum = Number(lfx.replace(/,/g, "")) || 0;
  const [since, setSince] = useState(cur?.since ?? today());
  const [until, setUntil] = useState(cur?.until ?? yearFrom(today()));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const save = () => {
    if (!since || !until) { setMsg({ ok: false, text: "라이선스 기간을 입력하세요." }); return; }
    if (until < since) { setMsg({ ok: false, text: "기간 끝이 시작보다 앞설 수 없습니다." }); return; }
    saveLicense({ kind, companyId, company, amount, currency, fxRate: currency === "USD" && lfxNum > 0 ? lfxNum : undefined, since, until, by });
    setMsg({ ok: true, text: "라이선스 비용이 저장되었습니다." });
  };
  const seg = (on: boolean): React.CSSProperties => ({ border: 0, padding: "0 12px", fontSize: 12.5, cursor: "pointer", fontWeight: on ? 700 : 400,
    background: on ? "#eef6ff" : "#fff", color: on ? "#1d4ed8" : "#6b7280" });
  return (
    <div style={{ marginBottom: 14, border: "1px solid #e9d5ff", background: "#fcfaff", borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <b style={{ fontSize: 13 }}>연간 라이선스 비용</b>
        <span style={tag("#f3e8ff", "#7e22ce")}>{LICENSE_LABEL[kind]}</span>
        <span style={{ fontSize: 11.5, color: "#9ca3af" }}>· 고객사 {company} · 고객사마다 1건 · 티켓이 아니라 키 발급으로 생기는 비용</span>
        <span style={{ flex: 1 }} />
        {cur ? <span style={tag("#dcfce7", "#166534")}>{fmtMoney(cur)} / 년</span> : <span style={tag("#fef2f2", "#dc2626")}>미등록</span>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr)", gap: 12, alignItems: "end" }}>
        <Field label="연간 금액">
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ display: "inline-flex", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", flex: "0 0 auto" }}>
              <button type="button" onClick={() => setCurrency("KRW")} style={seg(currency === "KRW")}>원</button>
              <button type="button" onClick={() => setCurrency("USD")} style={{ ...seg(currency === "USD"), borderLeft: "1px solid #e5e7eb" }}>USD</button>
            </div>
            <input type="number" min={0} step={currency === "USD" ? 100 : 10000} style={{ ...S.input, textAlign: "right" }} value={amount}
              onChange={(e) => setAmount(Math.max(0, Math.round(+e.target.value)))} />
          </div>
        </Field>
        <Field label="기간 시작">
          <input type="date" style={S.input} value={since} onChange={(e) => { setSince(e.target.value); if (e.target.value) setUntil(yearFrom(e.target.value)); }} />
        </Field>
        <Field label="기간 끝 (기본 1년)">
          <input type="date" style={S.input} value={until} min={since || undefined} onChange={(e) => setUntil(e.target.value)} />
        </Field>
      </div>
      {/* 환율 기록 — USD 일 때 · 선택 · 자동 아님 `PC-215` (티켓 정산과 같은 방식 `PC-202`) */}
      {currency === "USD" && (
        <div style={{ marginTop: 10, maxWidth: 420 }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>환율 기록 <span style={{ color: "#9ca3af" }}>(선택 · 자동 아님)</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#6b7280" }}>
            <span style={{ whiteSpace: "nowrap" }}>1 USD =</span>
            <input inputMode="decimal" style={{ ...S.input, textAlign: "right" }} value={lfx} onChange={(e) => setLfx(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="예) 1,385" />
            <span>원</span>
            {lfxNum > 0 && amount > 0 && <span style={{ whiteSpace: "nowrap", fontSize: 11.5 }}>≈ {Math.round(amount * lfxNum).toLocaleString()}원 / 년</span>}
          </div>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
        {cur && <span style={{ fontSize: 11.5, color: "#9ca3af" }}>최근 등록: {cur.updatedAt.slice(0, 16).replace("T", " ")}{cur.by ? ` · ${cur.by}` : ""}</span>}
        {msg && <span style={{ fontSize: 12, color: msg.ok ? "#166534" : "#b91c1c" }}>{msg.text}</span>}
        <span style={{ flex: 1 }} />
        <button type="button" onClick={save} style={S.primary}>라이선스 저장</button>
      </div>
    </div>
  );
}
