"use client";

// 고객사 관리 — 「고객사 | 섹션 메뉴 | 상세」 3단 한 화면 `PC-204`
// - App Key 관리 · N Key 관리와 같은 조각(KeyWorkspaceUI)을 쓴다 — 머리 · 집계 · 고객사 칸 · 상위 고객사 묶음(▶ 접기)
// - 왼쪽: 고객사(기본 = 진행중 · [전체]로 전환 · 검색 · [＋ 고객사 등록])
// - 가운데 · 오른쪽: 고객사 상세(섹션 메뉴 | 내용) — 기존 MEM-02 를 그대로 품는다
// - 머리의 [표 보기]로 기존 고객사 목록 표(정렬 · 구분 필터 · 페이지 · 가입 승인 요청)를 연다
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { useCaster, accountScope } from "@/lib/accountStore";
import { useOnboarding } from "@/lib/onboardingStore";
import { isCommonCodeCompany } from "@/lib/commonCodes";
import { CompaniesTable, CompanyFormView } from "./CompaniesView";
import {
  WS_CARD as card, WS_HEAD_BTN, wsChip, WsStats, WsCoHead, WsCoToggle, WsCoItem, WsCoGroup, WsFillScroll,
  useSubsOf, nestCompanies, type CoView, type WsFold,
} from "./KeyWorkspaceUI";

type View = "ws" | "table";

export function CompaniesWorkspace({ companyId = 0, isNew = false, prefillEmail = "", initialSec = "", initialView = "ws" }: {
  companyId?: number; isNew?: boolean; prefillEmail?: string; initialSec?: string; initialView?: View;
}) {
  const { companies, projects } = useStore();
  const cast = useCaster();
  const onb = useOnboarding();
  const pending = onb.requests.filter((r) => r.status === "PENDING").length;
  const subsOf = useSubsOf(companies);   // 상위 → 하위 고객사 — App Key · N Key 와 같은 묶음

  const [view, setView] = useState<View>(initialView);
  const [coView, setCoView] = useState<CoView>("issued");   // issued = 진행중
  const [q, setQ] = useState("");
  const open = companies.filter((c) => !c.closed);
  const svcN = (id: number) => cast.accounts.filter((a) => accountScope(a) === "service" && a.companyId === id).length;

  // 첫 선택 — 경로의 고객사 · 없으면 진행중 첫 고객사(가나다순)
  const first = useMemo(() => [...open].sort((a, b) => a.name.localeCompare(b.name, "ko"))[0], [open.length]);   // eslint-disable-line react-hooks/exhaustive-deps
  const [selId, setSelId] = useState(companyId);
  useEffect(() => { if (!selId && !isNew && first) setSelId(first.id); }, [first, selId, isNew]);
  useEffect(() => {   // 사업 종료 고객사를 경로로 열면 [전체]에서 보이게
    const c = companies.find((x) => x.id === companyId);
    if (c?.closed) setCoView("all");
  }, [companyId, companies]);
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

  const list = (coView === "issued" ? open : companies)
    .filter((c) => (q ? c.name.toLowerCase().includes(q.toLowerCase()) : true))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  const coRow = (id: number, label: string, closed: boolean, sub = false, fold?: WsFold) =>
    <WsCoItem key={id} label={closed ? `${label} (사업 종료)` : label} n={svcN(id)} on={!adding && id === selId} warn={false} sub={sub} fold={fold}
      title="서비스 계정" onClick={() => pick(id)} />;

  const holders = companies.filter((c) => isCommonCodeCompany(c.name)).length;
  const members = new Set([...subsOf.values()].flat()).size;

  return (
    <div style={{ padding: "16px 20px", maxWidth: 1680 }}>
      {/* 머리 — 제목 · [3단 | 표 보기] · 가입 승인 요청 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 12.5, color: "#6b7280", flexWrap: "wrap" }}>
        <b style={{ fontSize: 15, color: "#111827" }}>고객사 관리</b>
        <span>· 업체(고객사) 마스터 · 사업자 / 계좌 / 서류 / 서비스 티켓 · 계정 / 업무 원장</span>
        <span style={{ flex: 1 }} />
        {pending > 0 && view === "ws" && (
          <button type="button" onClick={() => toView("table")} title="[표 보기]에서 확인 · 승인합니다"
            style={{ ...wsChip(false), borderColor: "#fcd34d", background: "#fffbeb", color: "#92400e", fontWeight: 700 }}>🔔 가입 승인 요청 {pending}건</button>
        )}
        <div style={{ display: "inline-flex", gap: 4 }}>
          <button type="button" onClick={() => toView("ws")} style={wsChip(view === "ws")}>3단 보기</button>
          <button type="button" onClick={() => toView("table")} style={wsChip(view === "table")}>표 보기</button>
        </div>
      </div>
      <WsStats items={[
        ["고객사", `${companies.length}곳`, "#111827"],
        ["진행중", `${open.length}곳`, "#047857"],
        ["사업 종료", `${companies.length - open.length}곳`, "#9ca3af"],
        ["상위 고객사", `${holders}곳`, "#047857"],
        ["하위 고객사", `${members}곳`, "#7e22ce"],
        ["코드 프로젝트", `${projects.length}건`, "#2563eb"],
      ]} />

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
              <WsCoToggle view={coView} onView={setCoView} issued={open.length} total={companies.length} issuedLabel="진행중" />
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
    </div>
  );
}
