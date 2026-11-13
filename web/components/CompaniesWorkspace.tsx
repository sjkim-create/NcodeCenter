"use client";

// 고객사 관리 — 「고객사 | 섹션 메뉴 | 상세」 3단 한 화면 `PC-204`
// - App Key 관리 · N Key 관리와 같은 조각(KeyWorkspaceUI)을 쓴다 — 머리 · 고객사 칸 · 상위 고객사 묶음(▶ 접기)
// - 집계 카드 없음 · 왼쪽 고객사 칸의 구분 셀렉트(전체 · 상위 · 하위 · 단독 · 진행중 · 사업 종료, 건수)로 거른다 `PC-300`
// - 왼쪽: 고객사(기본 = 전체 고객사 · 검색 · [＋ 고객사 등록])
// - 가운데 · 오른쪽: 고객사 상세(섹션 메뉴 | 내용) — 기존 MEM-02 를 그대로 품는다
// - 머리의 [표 보기]로 기존 고객사 목록 표(정렬 · 구분 필터 · 페이지)를 연다 · [🔔 승인 요청 n건]은 바로 승인 모달 `PC-303`
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { useCaster, accountScope } from "@/lib/accountStore";
import { useOnboarding } from "@/lib/onboardingStore";
import { isCommonCodeCompany } from "@/lib/commonCodes";
import { CompaniesTable, CompanyFormView } from "./CompaniesView";
import { ApprovalButton, CompanyApprovalModal } from "./ApprovalModals";
import {
  WS_CARD as card, WS_HEAD_BTN, WsCoHead, WsCoItem, WsCoGroup, WsFillScroll,
  useSubsOf, nestCompanies, type WsFold,
} from "./KeyWorkspaceUI";

type View = "ws" | "table";
// 왼쪽 고객사 구분 셀렉트 `PC-300`
type CoFilter = "all" | "holder" | "member" | "solo" | "open" | "closed";
const FILTER_LABEL: Record<CoFilter, string> = { all: "전체 고객사", holder: "상위 고객사", member: "하위 고객사", solo: "단독 고객사", open: "진행중 고객사", closed: "사업 종료 고객사" };

export function CompaniesWorkspace({ companyId = 0, isNew = false, prefillEmail = "", initialSec = "", initialView = "ws" }: {
  companyId?: number; isNew?: boolean; prefillEmail?: string; initialSec?: string; initialView?: View;
}) {
  const { companies } = useStore();
  const cast = useCaster();
  const onb = useOnboarding();
  const pending = onb.requests.filter((r) => r.status === "PENDING").length;
  const subsOf = useSubsOf(companies);   // 상위 → 하위 고객사 — App Key · N Key 와 같은 묶음

  const [view, setView] = useState<View>(initialView);
  const [cf, setCf] = useState<CoFilter>("all");   // 기본 = 전체 고객사 `PC-300`
  const [q, setQ] = useState("");
  const [showApprove, setShowApprove] = useState(false);   // 승인 요청 모달 `PC-303`
  const open = companies.filter((c) => !c.closed);
  const svcN = (id: number) => cast.accounts.filter((a) => accountScope(a) === "service" && a.companyId === id).length;

  // 첫 선택 — 경로의 고객사 · 없으면 사업 중인 첫 고객사(가나다순)
  const first = useMemo(() => [...open].sort((a, b) => a.name.localeCompare(b.name, "ko"))[0], [open.length]);   // eslint-disable-line react-hooks/exhaustive-deps
  const [selId, setSelId] = useState(companyId);
  useEffect(() => { if (!selId && !isNew && first) setSelId(first.id); }, [first, selId, isNew]);
  // 사업 종료 고객사도 [전체 고객사]에 「(사업 종료)」로 보이므로 경로로 열 때 따로 바꾸지 않는다 `PC-300`
  const [adding, setAdding] = useState(isNew);

  // 고객사를 고르면 주소만 바꾼다(화면은 그대로) — 새로고침 · 링크 공유 때 그 고객사가 열린다
  const pick = (id: number) => {
    setSelId(id); setAdding(false);
    window.history.replaceState(null, "", `/companies/${id}`);
  };
  const startAdd = () => { setAdding(true); window.history.replaceState(null, "", "/companies/new"); };
  const toView = (v: View) => {
    setView(v);
    window.history.replaceState(null, "", v === "table" ? "/companies?view=table" : selId ? `/companies/${selId}` : "/companies");
  };

  const memberIds = useMemo(() => new Set([...subsOf.values()].flat()), [subsOf]);
  const isHolder = (c: { name: string }) => isCommonCodeCompany(c.name);
  // 단독 = 상위도 하위도 아닌 고객사 · 진행중 = 사업 종료가 아닌 고객사
  const matchOf = (f: CoFilter) => (c: (typeof companies)[number]) =>
    f === "holder" ? isHolder(c) : f === "member" ? memberIds.has(c.id) : f === "solo" ? !isHolder(c) && !memberIds.has(c.id)
      : f === "open" ? !c.closed : f === "closed" ? !!c.closed : true;
  const inFilter = matchOf(cf);
  const nOf = (f: CoFilter) => companies.filter(matchOf(f)).length;
  const list = companies.filter(inFilter)
    .filter((c) => (q ? c.name.toLowerCase().includes(q.toLowerCase()) : true))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  const coRow = (id: number, label: string, closed: boolean, sub = false, fold?: WsFold) =>
    <WsCoItem key={id} label={closed ? `${label} (사업 종료)` : label} n={svcN(id)} on={!adding && id === selId} warn={false} sub={sub} fold={fold}
      title="서비스 계정" onClick={() => pick(id)} />;

  return (
    <div style={{ padding: "16px 20px", maxWidth: 1680 }}>
      {/* 머리 — 제목 · 승인 요청 · [3단 | 표 보기] */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 12.5, color: "#6b7280", flexWrap: "wrap" }}>
        <b style={{ fontSize: 15, color: "#111827" }}>고객사 관리</b>
        <span>· 업체(고객사) 마스터 · 사업자 / 계좌 / 서류 / 서비스 티켓 · 계정 / 업무 원장</span>
        <span style={{ flex: 1 }} />
        {/* 승인 요청 — 누르면 바로 승인 모달(3단 · 표 보기 어디서나) `PC-303` */}
        <ApprovalButton n={pending} onClick={() => setShowApprove(true)} />
        {/* 보기 전환 — 아이콘 버튼 한 묶음(▦ 3단 보기 · ☰ 표 보기). 이름은 마우스를 올리면 `PC-306` */}
        <div role="group" aria-label="보기 전환" style={{ display: "inline-flex", border: "1px solid #d1d5db", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
          {([["ws", "3단 보기"], ["table", "표 보기"]] as [View, string][]).map(([v, label], i) => {
            const on = view === v;
            return (
              <button key={v} type="button" onClick={() => toView(v)} title={label} aria-label={label} aria-pressed={on}
                style={{ width: 36, height: 32, display: "grid", placeItems: "center", border: 0, borderLeft: i ? "1px solid #d1d5db" : 0, cursor: "pointer",
                  background: on ? "#e8f0fe" : "#fff", color: on ? "#2563eb" : "#374151" }}>
                {v === "ws" ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <rect x="2" y="2" width="5" height="5" rx="1" /><rect x="9" y="2" width="5" height="5" rx="1" />
                    <rect x="2" y="9" width="5" height="5" rx="1" /><rect x="9" y="9" width="5" height="5" rx="1" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <rect x="2" y="3" width="2" height="2" rx=".5" /><rect x="6" y="3.25" width="8" height="1.5" rx=".75" />
                    <rect x="2" y="7" width="2" height="2" rx=".5" /><rect x="6" y="7.25" width="8" height="1.5" rx=".75" />
                    <rect x="2" y="11" width="2" height="2" rx=".5" /><rect x="6" y="11.25" width="8" height="1.5" rx=".75" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>
      {/* 집계 카드 없음 — 건수는 왼쪽 고객사 칸의 구분 셀렉트에서 본다 `PC-300` */}

      {view === "table" ? (
        // 표 보기 — 기존 고객사 목록 표. 행을 누르면 3단의 그 고객사로 간다
        <CompaniesTable />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "270px minmax(0, 1fr)", gap: 12, alignItems: "start" }}>
          {/* ① 고객사 */}
          <div style={card}>
            <WsCoHead count={list.length}
              right={<button type="button" onClick={startAdd} style={{ ...WS_HEAD_BTN, padding: "5px 10px", fontSize: 12 }}>＋ 고객사 등록</button>} />
            <div style={{ padding: 10 }}>
              {/* 구분 셀렉트 — 항목마다 건수 · 고르면 아래 목록이 그 구분만(검색은 그 안에서) `PC-300` */}
              <select value={cf} onChange={(e) => setCf(e.target.value as CoFilter)} aria-label="고객사 구분"
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, marginBottom: 8, boxSizing: "border-box", background: "#fff" }}>
                {(Object.keys(FILTER_LABEL) as CoFilter[]).map((f) => <option key={f} value={f}>{FILTER_LABEL[f]} ({nOf(f)})</option>)}
              </select>
              <input style={{ width: "100%", padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, marginBottom: 8, boxSizing: "border-box" }}
                value={q} onChange={(e) => setQ(e.target.value)} placeholder="고객사 검색" />
              <WsFillScroll>
                {adding && (
                  <div style={{ border: "1px dashed #5f8ff0", background: "#f5f9ff", borderRadius: 9, padding: "8px 10px", marginBottom: 6, fontSize: 13, color: "#1d4ed8", fontWeight: 700 }}>
                    새 고객사 <span style={{ fontSize: 11, fontWeight: 400, color: "#6b7280" }}>· 오른쪽에서 입력 후 [등록]</span>
                  </div>
                )}
                {/* 상위 고객사 ▶ 접기 · 펼치기 — 하위는 세로 안내선 안. 하위 고객사는 목록 제자리에도 있다 `PC-198` `PC-199` */}
                {nestCompanies(list, companies, subsOf, (x) => (q ? x.name.toLowerCase().includes(q.toLowerCase()) : true)).map(({ c, subs }) => (
                  <WsCoGroup key={c.id} n={subs.length} autoOpen={!!q}
                    head={(fold) => coRow(c.id, c.name, !!c.closed, false, fold)}>
                    {subs.map((x) => coRow(x.id, x.name, !!x.closed, true))}
                  </WsCoGroup>
                ))}
                {list.length === 0 && <div style={{ fontSize: 12, color: "#9ca3af", padding: "14px 6px", textAlign: "center" }}>검색 결과가 없습니다.</div>}
              </WsFillScroll>
            </div>
          </div>

          {/* ② 섹션 메뉴 · ③ 상세 — 기존 고객사 상세를 품는다 */}
          {adding ? (
            <CompanyFormView key="new" companyId={0} embedded />
          ) : selId ? (
            <CompanyFormView key={selId} companyId={selId} embedded
              prefillEmail={selId === companyId ? prefillEmail : ""} initialSec={selId === companyId ? initialSec : ""} />
          ) : (
            <div style={{ ...card, padding: "48px 0", textAlign: "center", color: "#9ca3af", fontSize: 12.5 }}>
              왼쪽에서 고객사를 고르거나 <Link href="/companies/new" onClick={(e) => { e.preventDefault(); startAdd(); }} style={{ color: "#2563eb" }}>[＋ 고객사 등록]</Link>을 누르세요.
            </div>
          )}
        </div>
      )}
      {showApprove && <CompanyApprovalModal onClose={() => setShowApprove(false)} />}
    </div>
  );
}
