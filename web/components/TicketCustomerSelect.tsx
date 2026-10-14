"use client";

// 티켓 고객사 선택 — App Key 관리 · N Key 관리 공용 `PC-123`
// 고객사 관리(companies)가 아니라 nkey(HLP) 대장의 프로젝트명 + 티켓 화면에서 등록한 고객사만 보여 준다.
// [＋ 신규 등록] 으로 대장에 없는 고객사를 추가한다(고객사 관리에는 생기지 않는다).
import { useState } from "react";
import { S } from "./ui";
import type { TicketPattern } from "@/lib/codeKind";
import {
  addTicketCustomer, allTicketCustomers, makeRange, useTicketCustomers, type TicketCustomer,
} from "@/lib/ticketCustomerStore";

const PTS: { v: TicketPattern; label: string; section: number }[] = [
  { v: "PDS3", label: "PDS3 (Ncode)", section: 3 },
  { v: "Scode", label: "PDS4 (Scode)", section: 44 },
  { v: "PDS2", label: "PDS2", section: 3 },
  { v: "OID", label: "OID", section: 3 },
];

/** 티켓 고객사 등록 폼 — 이름 + 발급 범위 1건(Book 비우면 오너 전체) */
export function TicketCustomerAddForm({ by, onAdded }: { by?: string; onAdded: (c: TicketCustomer) => void }) {
  const [name, setName] = useState("");
  const [pt, setPt] = useState<TicketPattern>("PDS3");
  const [sec, setSec] = useState("3");
  const [owner, setOwner] = useState("");
  const [bs, setBs] = useState("");
  const [be, setBe] = useState("");
  const [err, setErr] = useState("");

  const save = () => {
    const s = Number(sec), o = Number(owner);
    const b0 = bs.trim() === "" ? null : Number(bs), b1 = be.trim() === "" ? null : Number(be);
    if (!name.trim()) { setErr("고객사명을 입력하세요."); return; }
    if (!Number.isInteger(s) || !Number.isInteger(o) || owner.trim() === "") { setErr("Section · Owner 를 숫자로 입력하세요."); return; }
    if (b0 != null && b1 != null && b1 < b0) { setErr("End Book 은 Start Book 보다 작을 수 없습니다."); return; }
    const r = addTicketCustomer(name, [makeRange(pt, s, o, b0, b1 ?? b0)], by);
    if (!r.ok) { setErr(r.msg); return; }
    setName(""); setOwner(""); setBs(""); setBe(""); setErr("");
    onAdded(r.customer);
  };

  return (
    <div style={{ padding: 10, border: "1px dashed #c7d2fe", borderRadius: 10, background: "#f8faff" }}>
      <div style={{ fontSize: 11.5, color: "#4338ca", marginBottom: 8 }}>티켓 고객사 등록 · 고객사 관리와 별개입니다 · 발급 범위를 함께 입력합니다 (Book 을 비우면 오너 전체가 범위입니다)</div>
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 0.6fr 0.8fr 0.8fr 0.8fr", gap: 6 }}>
        <input style={S.input} placeholder="고객사명 *" value={name} onChange={(e) => setName(e.target.value)} />
        <select style={S.input} value={pt} onChange={(e) => { const v = e.target.value as TicketPattern; setPt(v); setSec(String(PTS.find((p) => p.v === v)?.section ?? 3)); }}>
          {PTS.map((p) => <option key={p.v} value={p.v}>{p.label}</option>)}
        </select>
        <input style={S.input} placeholder="S *" value={sec} onChange={(e) => setSec(e.target.value)} />
        <input style={S.input} placeholder="Owner *" value={owner} onChange={(e) => setOwner(e.target.value)} />
        <input style={S.input} placeholder="Start Book" value={bs} onChange={(e) => setBs(e.target.value)} />
        <input style={S.input} placeholder="End Book" value={be} onChange={(e) => setBe(e.target.value)} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
        {err && <span style={{ fontSize: 12, color: "#dc2626" }}>{err}</span>}
        <span style={{ flex: 1 }} />
        <button type="button" onClick={save} style={S.primary}>등록</button>
      </div>
    </div>
  );
}

export function TicketCustomerSelect({ value, onChange, by }: { value: number; onChange: (id: number) => void; by?: string }) {
  useTicketCustomers();
  const list = allTicketCustomers();
  const [adding, setAdding] = useState(false);
  const ledgerN = list.filter((c) => c.src === "ledger").length;
  return (
    <div>
      <div style={{ display: "flex", gap: 6 }}>
        <select style={S.input} value={value} onChange={(e) => onChange(+e.target.value)}>
          <option value={0}>- 선택 ({list.length}곳 · 대장 {ledgerN}) -</option>
          {list.map((c) => <option key={c.id} value={c.id}>{c.name}{c.src === "manual" ? " · 신규" : ""}</option>)}
        </select>
        <button type="button" onClick={() => setAdding((a) => !a)} style={{ ...S.smallBtn, whiteSpace: "nowrap" }}
          title="nkey(HLP) 대장에 없는 고객사를 티켓 고객사로 등록 — 고객사 관리와는 별개">
          {adding ? "취소" : "＋ 신규 등록"}
        </button>
      </div>
      {adding && (
        <div style={{ marginTop: 8 }}>
          <TicketCustomerAddForm by={by} onAdded={(c) => { onChange(c.id); setAdding(false); }} />
        </div>
      )}
    </div>
  );
}
