"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { S, Field, Modal } from "./ui";
import { codeKind, CODE_KINDS, kindMeta, type CodeKind } from "@/lib/codeKind";
import { store, useStore } from "@/lib/store";
import EditingDetailView from "./EditingDetailView";
import { EditCustomer, loadCustomCustomers, saveCustomCustomers } from "@/lib/editingCustomers";
import { clearOverridesOfCustomer } from "@/lib/editOverrides";
import { customersOfService } from "@/lib/serviceCustomers";
import { EDIT_CUSTOMERS, EDIT_SUMMARY } from "@/lib/editingData";
import { rateOf, settle, BASE_RATE, won } from "@/lib/pricing";
import { Sc } from "./sobp";

type Cust = {
  customer: string; owner: string; owners?: number[]; codeKinds: string[];
  books: number; pages: number; symbols: number;
  soundSymbols: number; penSymbols: number; sizeMB: number;
  bookRows?: { o: number; [k: string]: unknown }[];
};
const D = { summary: EDIT_SUMMARY, customers: EDIT_CUSTOMERS as unknown as Cust[] };
const toFull = (c: EditCustomer): Cust => ({ ...c, owners: /^\d+$/.test(c.owner) ? [Number(c.owner)] : [], books: 0, pages: 0, symbols: 0, soundSymbols: 0, penSymbols: 0, sizeMB: 0 });

// 편집 고객사 고유 식별자 — owner 만으로는 유일하지 않다(예: owner 100 = MathLAB·Neolab POD, owner 900 = RECO·TEST)
const uidOf = (c: { owner: string; customer: string }) => `${c.owner}#${c.customer}`;

// 편집 고객사의 코드 종류 — 교재 행의 (k, section) 으로 판별한다 `PC-037`
const kindsOfCust = (c: { bookRows?: { k?: string; s?: number }[]; codeKinds?: string[] }): CodeKind[] => {
  const rows = c.bookRows ?? [];
  if (rows.length) return [...new Set(rows.map((r) => codeKind(r.k, r.s ?? -1)))];
  return [...new Set((c.codeKinds ?? []).map((k) => codeKind(k, -1)))];
};

export default function EditingProjectsView() {
  const sp = useSearchParams();
  const spOwner = sp.get("owner") ?? "";
  // 첫 화면은 특정 고객사를 고르지 않고 **전체 고객사** 를 보여준다 `PC-038`
  //   (URL 에 owner 가 있으면 그 고객사로 바로 연다 — SOBP 맵 [✏️ 편집으로 이동 →])
  const initCust = D.customers.find((c) => c.owner === spOwner);
  const [sel, setSel] = useState<string>(initCust ? uidOf(initCust) : "");
  const [q, setQ] = useState("");
  const [pds, setPds] = useState<"ALL" | CodeKind>("ALL");   // 좌표의 코드 종류 (PDS3·PDS2·PDS4·OID)
  const [custom, setCustom] = useState<EditCustomer[]>([]);
  const [addForm, setAddForm] = useState<{ companyId: number; owner: string; kind: "N" | "G" } | null>(null);
  const st = useStore(); // 고객사 관리에 등록된 고객사/프로젝트

  useEffect(() => { setCustom(loadCustomCustomers()); }, []);

  const all = useMemo(() => [...custom.map(toFull), ...D.customers], [custom]);
  const customOwners = useMemo(() => new Set(custom.map((c) => c.owner)), [custom]);
  // PDS 필터를 교재(행) 단위로 적용한 집계 — 요약·카드 수치가 필터를 따라간다
  const sumOf = (a?: number[]) => (a ?? []).reduce((x, y) => x + y, 0);
  // 고객사 단가 — 고객사 관리에 등록된 값(없으면 기본 단가)
  const nzc = (x: string) => x.replace(/\s+/g, "").replace(/\(.*\)/g, "").toLowerCase();
  const rateFor = useMemo(() => (name: string) => rateOf(st.companies.find((c) => nzc(c.name) === nzc(name))), [st.companies]);
  type BRow = { k?: string; s?: number; pg?: number; bytes?: number; sm?: number[]; pm?: number[]; pu?: number; su?: number; dcRate?: number; dcAmt?: number };
  const statOf = useMemo(() => (c: Cust) => {
    const rows = (c.bookRows ?? []) as BRow[];
    const use = pds === "ALL" ? rows : rows.filter((r) => codeKind(r.k, r.s ?? -1) === pds);
    const cRate = rateFor(c.customer);
    if (rows.length === 0) {
      // 교재 행이 없는 고객사(직접 추가) — 요약값만 있으므로 고객사 단가로 환산
      const listed = c.pages * cRate.page + c.symbols * cRate.symbol;
      return { books: c.books, pages: c.pages, symbols: c.symbols, sizeMB: c.sizeMB, listed, cost: listed };
    }
    const money = use.reduce((a, r) => {
      const b = settle({ pg: r.pg ?? 0, sym: sumOf(r.sm) + sumOf(r.pm), pu: r.pu, su: r.su, dcRate: r.dcRate, dcAmt: r.dcAmt }, cRate);
      return { listed: a.listed + b.listed, cost: a.cost + b.total };
    }, { listed: 0, cost: 0 });
    return {
      books: use.length,
      pages: use.reduce((a, r) => a + (r.pg ?? 0), 0),
      symbols: use.reduce((a, r) => a + sumOf(r.sm) + sumOf(r.pm), 0),
      sizeMB: Math.round(use.reduce((a, r) => a + (r.bytes ?? 0), 0) / 1e6),
      ...money,
    };
  }, [pds, rateFor]);

  const list = useMemo(
    () => all
      .filter((c) => (pds === "ALL" ? true : kindsOfCust(c as never).includes(pds)))
      .filter((c) => (q ? (c.customer + c.owner).toLowerCase().includes(q.toLowerCase()) : true))
      .slice()
      .sort((a, b) => a.customer.localeCompare(b.customer, "ko")),   // 고객사명 오름차순
    [q, all, pds]
  );
  // 화면에 보이는 목록 기준 합계
  const agg = useMemo(() => list.reduce((a, c) => {
    const st2 = statOf(c);
    return { books: a.books + st2.books, pages: a.pages + st2.pages, symbols: a.symbols + st2.symbols, sizeMB: a.sizeMB + st2.sizeMB,
             listed: a.listed + st2.listed, cost: a.cost + st2.cost };
  }, { books: 0, pages: 0, symbols: 0, sizeMB: 0, listed: 0, cost: 0 }), [list, statOf]);
  const isFiltered = pds !== "ALL" || !!q;
  const maxSym = Math.max(1, ...list.map((c) => statOf(c).symbols));
  const selCust = all.find((c) => uidOf(c) === sel) ?? all.find((c) => c.owner === sel);

  const openAdd = () => setAddForm({ companyId: 0, owner: "", kind: "N" });
  // 편집(casterN) 대상 고객사 — **고객사 관리의 사용 서비스** 지정을 따른다 `PC-076`
  const casternCos = useMemo(() => customersOfService("CASTERN", st.companies, st.projects), [st.companies, st.projects]);
  // 선택한 고객사가 보유한 코드의 Owner 목록 (코드 프로젝트 발급 내역 기준)
  const ownerOptsOf = (companyId: number) => {
    const m = new Map<string, { owner: number; kind: "N" | "G"; section: number }>();
    st.projects.filter((p) => p.companyId === companyId).forEach((p) =>
      p.issued.forEach((b) => m.set(`${b.kind ?? "N"}/${b.section}/${b.owner}`,
        { owner: b.owner, kind: (b.kind ?? "N") as "N" | "G", section: b.section })));
    return [...m.values()].sort((a, b) => a.section - b.section || a.owner - b.owner);
  };
  const onPickCompany = (companyId: number) => {
    const opts = ownerOptsOf(companyId);
    setAddForm({ companyId, owner: opts.length === 1 ? String(opts[0].owner) : "", kind: opts[0]?.kind ?? "N" });
  };
  const saveAdd = () => {
    if (!addForm) return;
    const co = st.companies.find((c) => c.id === addForm.companyId);
    if (!co) { alert("고객사 관리에 등록된 고객사를 선택하세요."); return; }
    const owner = addForm.owner.trim();
    if (!owner) { alert("Owner 코드를 선택하세요. (여러 개면 하나를 고르세요)"); return; }
    // 1) 해당 (고객사·owner) 코드 프로젝트에 편집 플래그 → SOBP 맵·코드 프로젝트에 "편집"으로 반영
    const proj = st.projects.filter((p) => p.companyId === co.id)
      .find((p) => p.issued.some((b) => String(b.owner) === owner));
    if (proj) store.upsertProject({ ...proj, editing: true, editingOwner: Number(owner) || proj.editingOwner });
    // 2) 편집 프로젝트 좌측 목록 반영 — 같은 고객사명+owner가 이미 있으면 그 항목으로 이동, 없으면 새로 추가.
    //    (owner 번호만으로 찾으면 같은 owner의 다른 고객사가 잡히므로 고객사명까지 일치해야 함)
    const existing = all.find((c) => c.customer === co.name && (String(c.owner) === owner || (c.owners ?? []).includes(Number(owner))));
    if (existing) { setSel(uidOf(existing)); }
    else {
      const nc = { customer: co.name, owner, codeKinds: [addForm.kind] };
      const next = [nc, ...custom];
      setCustom(next); saveCustomCustomers(next); setSel(uidOf(nc));
    }
    setAddForm(null);
  };
  // 편집 고객사가 물고 있는 코드 프로젝트 — 추가(saveAdd)와 같은 기준으로 찾는다
  const projOf = (customer: string, owner: string) => {
    const co = st.companies.find((x) => nzc(x.name) === nzc(customer));
    if (!co) return undefined;
    return st.projects.filter((p) => p.companyId === co.id)
      .find((p) => p.issued.some((b) => String(b.owner) === owner));
  };
  // 삭제하면 **편집 흔적을 모두 되돌린다** `PC-075`
  //   ① 좌측 목록 ② 추가한 교재 캐시 ③ SOBP 맵 Book 오버라이드 ④ 코드 프로젝트의 편집 플래그
  const delCustom = (c: Cust) => {
    if (!confirm("이 고객사를 편집 프로젝트에서 삭제할까요?\n추가한 교재와 SOBP 맵의 편집 표시도 함께 지워집니다.")) return;
    const next = custom.filter((x) => x.owner !== c.owner || x.customer !== c.customer);
    setCustom(next); saveCustomCustomers(next);
    // ② 교재 캐시 — 현재 키(v12·고객사명)와 옛 키(v11·owner)를 함께 정리
    try {
      localStorage.removeItem(`ncc-edit12-${c.customer}`);
      localStorage.removeItem(`ncc-edit11-${c.owner}`);
    } catch { /* */ }
    // ③ 공유(커먼) 코드 Book 에 남긴 사용 고객사·편집 표시
    clearOverridesOfCustomer(c.customer);
    // ④ 같은 코드 프로젝트를 쓰는 편집 고객사가 더 없으면 편집 플래그를 되돌린다
    //    (플래그가 남으면 SOBP 맵 OWNER 카드에 '편집' 배지가 계속 보인다)
    const proj = projOf(c.customer, c.owner);
    if (proj && !next.some((x) => projOf(x.customer, x.owner)?.id === proj.id)) {
      store.upsertProject({ ...proj, editing: false, editingOwner: undefined });
    }
    if (sel === uidOf(c)) setSel(D.customers[0] ? uidOf(D.customers[0]) : "");
  };

  return (
    <div style={{ padding: "16px 18px" }}>
      {/* 전체 요약 */}
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 12.5, color: "#6b7280", marginBottom: 12 }}>
        <span>편집 고객사 <b style={{ color: "#111827" }}>{list.length.toLocaleString()}</b></span>
        <span>편집 북코드 <b style={{ color: "#111827" }}>{agg.books.toLocaleString()}</b></span>
        <span>총 심볼 <b style={{ color: "#2563eb" }}>{agg.symbols.toLocaleString()}</b></span>
        <span>리소스 <b style={{ color: "#111827" }}>{(agg.sizeMB / 1000).toFixed(1)}GB</b></span>
        <span>청구액 <b style={{ color: "#2563eb" }}>{won(agg.cost)}</b>
          {agg.listed !== agg.cost && (
            <span style={{ color: "#b91c1c", marginLeft: 5 }}>
              (기준가 {won(agg.listed)} · 할인 −{won(agg.listed - agg.cost)})
            </span>
          )}
          <span style={{ color: "#9ca3af", marginLeft: 5 }} title={`기본 단가 적용 ${BASE_RATE.page} / 편집 ${BASE_RATE.symbol} · 고객사 단가는 고객사 관리에서 지정`}>· 고객사 단가 기준</span>
        </span>
        {isFiltered
          ? <span style={{ color: "#2563eb" }}>· 필터 적용 (전체 {D.summary.customers}곳 / {D.summary.books.toLocaleString()}권)</span>
          : <span style={{ color: "#9ca3af" }}>· 편집현황 장부에 있는 업체만 표시</span>}
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        {/* 좌: 고객사 목록 */}
        <div style={{ width: 280, flexShrink: 0 }}>
          <div style={{ ...S.card, padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 13, flex: 1 }}>고객사 선택</div>
              <button onClick={openAdd} style={{ ...S.smallBtn, background: "#5f8ff0", color: "#fff", border: 0 }}>＋ 고객사</button>
            </div>
            {/* 코드 종류 필터 */}
            <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
              {([["ALL", "전체"] as const, ...CODE_KINDS.map((k) => [k.v, k.short] as const)]).map(([v, label]) => (
                <button key={v} onClick={() => setPds(v)} style={pdsChip(pds === v)}>{label}</button>
              ))}
            </div>
            <div style={{ position: "relative", marginBottom: 10 }}>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="고객사 · owner 검색" style={{ ...S.input, paddingRight: 28 }} />
              {q && <button onClick={() => setQ("")} title="검색어 지우기" style={clearBtn}>×</button>}
            </div>
            <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6 }}>{list.length}곳 표시{pds !== "ALL" ? ` · ${kindMeta(pds).label} 보유` : ""}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "calc(100vh - 220px)", overflowY: "auto" }}>
              {list.map((c) => {
                const id = uidOf(c);
                const active = id === sel;
                const isCustom = customOwners.has(c.owner);
                return (
                  <button key={id} onClick={() => setSel(id)} style={{ ...card, ...(active ? cardActive : {}) }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, flex: 1, color: active ? "#1d4ed8" : "#111827" }}>{c.customer}</span>
                      {isCustom && <span style={{ ...S.tag, fontSize: 10, background: "#ecfdf5", color: "#047857" }}>신규</span>}
                      {kindsOfCust(c as never).map((k) => <span key={k} style={{ ...S.tag, fontSize: 10, background: kindMeta(k).bg, color: kindMeta(k).color, fontWeight: 700 }}>{kindMeta(k).short}</span>)}
                    </div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                      {pds === "ALL" ? "북" : kindMeta(pds).short} {statOf(c).books.toLocaleString()}권
                      {isCustom && <span onClick={(e) => { e.stopPropagation(); delCustom(c); }} style={{ color: "#dc2626", marginLeft: 8, cursor: "pointer" }}>삭제</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                      <div style={{ flex: 1, height: 4, background: "#eef0f4", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${Math.max(3, (statOf(c).symbols / maxSym) * 100)}%`, height: "100%", background: active ? "#2563eb" : "#93c5fd" }} />
                      </div>
                      <span style={{ fontSize: 10.5, color: active ? "#1d4ed8" : "#6b7280", fontFamily: "ui-monospace,monospace" }}>심볼 {statOf(c).symbols.toLocaleString()}</span>
                    </div>
                  </button>
                );
              })}
              {list.length === 0 && <div style={{ fontSize: 12, color: "#9ca3af", padding: 12, textAlign: "center" }}>결과 없음</div>}
            </div>
          </div>
        </div>

        {/* 우: 상세 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...S.card, padding: 16 }}>
            {selCust
              ? (
                <>
                  <button onClick={() => setSel("")} style={{ ...S.linkBtn, padding: 0, marginBottom: 8 }}>← 전체 고객사</button>
                  <EditingDetailView key={sel} owner={selCust.owner} custName={selCust.customer} embedded pdsLock={pds === "ALL" ? "" : pds} seedCustomer={customOwners.has(selCust.owner) ? (selCust as never) : undefined} />
                </>
              )
              : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                    <b style={{ fontSize: 14 }}>전체 고객사</b>
                    <span style={{ ...S.tag, background: "#eef6ff", color: "#2563eb", fontWeight: 700 }}>{list.length}곳</span>
                    {pds !== "ALL" && <span style={{ ...S.tag, background: kindMeta(pds).bg, color: kindMeta(pds).color, fontWeight: 700 }}>{kindMeta(pds).short} 보유</span>}
                    <span style={{ fontSize: 11.5, color: "#9ca3af" }}>모든 고객사의 교재를 한 목록으로 봅니다 · 조회 전용(수정은 고객사 선택 후)</span>
                  </div>
                  {/* 고객사 상세와 같은 표 — 항목 셀렉트 필터 + 페이지네이션 `PC-040` */}
                  <EditingDetailView allCustomers embedded pdsLock={pds === "ALL" ? "" : pds} />
                </>
              )}
          </div>
        </div>
      </div>

      {/* 고객사 추가 모달 — 등록된 고객사 불러오기 + 그 고객사의 Owner 코드 선택 */}
      {addForm && (() => {
        const opts = addForm.companyId ? ownerOptsOf(addForm.companyId) : [];
        const co = st.companies.find((c) => c.id === addForm.companyId);
        return (
          <Modal onClose={() => setAddForm(null)} title="편집 고객사 추가">
            {/* SOBP 맵에서 **사용 서비스 = casterN** 으로 지정한 고객사만 후보다 `PC-057` */}
            <Field label={`casterN 고객사 * (SOBP 맵에서 사용 서비스 지정)`}>
              <select style={S.input} value={addForm.companyId} onChange={(e) => onPickCompany(+e.target.value)}>
                <option value={0}>- 고객사 선택 ({casternCos.length}곳) -</option>
                {casternCos.map((c) => <option key={c.company.id} value={c.company.id}>{c.company.name}</option>)}
              </select>
              {casternCos.length === 0 && (
                <div style={{ fontSize: 11.5, color: "#b45309", marginTop: 5, lineHeight: 1.6 }}>
                  casterN 으로 지정된 고객사가 없습니다 — <b>SOBP 맵 ▸ 직접 코드 할당</b> 에서 사용 서비스를 <b>casterN</b> 으로 지정하세요.
                </div>
              )}
            </Field>

            {addForm.companyId > 0 && (
              opts.length > 0 ? (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
                    Owner 코드 * <span style={{ color: "#9ca3af" }}>{opts.length > 1 ? `· ${opts.length}개 중 선택` : ""}</span>
                  </div>
                  {/* SOBP chip 버튼 — 클릭해서 Owner 선택 */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {opts.map((o) => {
                      const on = addForm.owner === String(o.owner) && addForm.kind === o.kind;
                      return (
                        <button key={`${o.kind}/${o.section}/${o.owner}`} type="button"
                          onClick={() => setAddForm((f) => (f ? { ...f, owner: String(o.owner), kind: o.kind } : f))}
                          style={{ display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer",
                            border: `1px solid ${on ? "#93c5fd" : "#e5e7eb"}`, background: on ? "#eef6ff" : "#fff",
                            borderRadius: 9, padding: "5px 8px" }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", borderRadius: 5, padding: "1px 5px",
                            background: o.kind === "N" ? "#2563eb" : "#d97706" }}>{o.kind === "N" ? "N(PDS3)" : "G(PDS2)"}</span>
                          <Sc k="S" c="#5f8ff0" v={o.section} />
                          <Sc k="O" c="#14b8a6" v={o.owner} />
                        </button>
                      );
                    })}
                  </div>
                  <p style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 8 }}>
                    선택한 Owner 코드가 <b>편집 관리</b> 대상이 되어 코드 프로젝트·SOBP 맵에서 <b>편집</b> 플래그로 표시됩니다.
                  </p>
                </div>
              ) : (
                // 코드 할당은 **SOBP 맵에서만** 한다 — 여기서 Owner/코드 종류를 직접 입력하지 않는다 `PC-045`
                <div style={{ marginTop: 12 }}>
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 9, padding: "11px 13px", fontSize: 12.5, color: "#991b1b", lineHeight: 1.7 }}>
                    🚫 <b>{co?.name}</b> 는 아직 <b>할당된 코드가 없습니다.</b>
                    <div style={{ marginTop: 4, color: "#7f1d1d" }}>
                      코드 할당은 <b>[SOBP 맵]</b> 에서만 합니다. 먼저 SOBP 맵에서 이 고객사에 코드를 할당한 뒤 다시 추가하세요.
                    </div>
                    <a href="/ownership" style={{ display: "inline-block", marginTop: 8, fontSize: 12, fontWeight: 700, color: "#b91c1c" }}>SOBP 맵으로 이동 →</a>
                  </div>
                </div>
              )
            )}

            <p style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 12 }}>추가 후 우측 상세에서 <b>＋교재(책) 추가</b>로 편집 교재를 등록하세요.</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button onClick={() => setAddForm(null)} style={S.ghost}>취소</button>
              <button onClick={saveAdd} disabled={!addForm.companyId || !addForm.owner.trim()}
                style={{ ...S.primary, ...(!addForm.companyId || !addForm.owner.trim() ? { opacity: 0.5, cursor: "not-allowed" } : {}) }}>추가</button>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}

const clearBtn: React.CSSProperties = {
  position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
  border: 0, background: "none", color: "#9ca3af", fontSize: 16, lineHeight: 1, cursor: "pointer", padding: "0 4px",
};
const pdsChip = (on: boolean): React.CSSProperties => ({
  flex: 1, fontSize: 10.5, padding: "4px 2px", borderRadius: 7, cursor: "pointer", whiteSpace: "nowrap",
  border: on ? "1px solid #93c5fd" : "1px solid #e5e7eb", background: on ? "#eef6ff" : "#fff",
  color: on ? "#2563eb" : "#6b7280", fontWeight: on ? 700 : 400,
});
const card: React.CSSProperties = {
  display: "block", width: "100%", textAlign: "left",
  background: "#fff", border: "1px solid #eef0f4", borderRadius: 10, padding: "10px 12px", cursor: "pointer",
};
const cardActive: React.CSSProperties = { border: "1px solid #93c5fd", background: "#f5f9ff", boxShadow: "0 2px 8px rgba(95,143,240,.12)" };
