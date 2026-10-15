"use client";

// App Key 관리 — 「고객사 | App Key 계정 | 계정 상세」 3단 `PC-146` `PC-153`
// - 고객사 = **고객사 관리에 등록된 고객사**를 불러온다(여기서 고객사를 등록하지 않는다) `PC-153`
// - 계정 = **App Key 계정** — 계정과 App Key 가 매칭되는 개념(scope key).
//   고객사 관리의 서비스 계정(고객사가 서비스 권한을 갖는 계정, scope service)과는 다른 계정이다.
// - 과거 발급분: 개발팀 Caster_계정_퍼미션_티켓.xlsx(caster-ledger.json) 계정 — 고객사명으로 고객사 관리 고객사와 잇는다
// - 왼쪽: 고객사(기본 = App Key 계정이 있는 고객사 · [전체 고객사]로 전환 · 검색) / 가운데: App Key 계정 + [＋ 계정 추가]
// - 오른쪽: 계정 상세(계정 정보 · App Key 발급) / 계정 추가 폼
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { S } from "./ui";
import { AccountDetailView, AccountNewView } from "./AccountsView";
import { useCaster, accountScope, keyRanges, type CasterAccount } from "@/lib/accountStore";
import { useStore } from "@/lib/store";
import { companyOfAccount } from "@/lib/keyCompany";
import {
  WS_CARD as card, WS_HD as hd, WS_GRID, WS_EMPTY, WS_HEAD_BTN, wsTag as tag, wsItem,
  WsTitle, WsStats, WsCoHead, WsCoToggle, WsCoItem, WsFillScroll, type CoView,
} from "./KeyWorkspaceUI";   // N Key 관리와 같은 조각 `PC-154`
const UNLINKED = -1;   // 고객사 관리에 없는 고객사의 옛 대장 계정

type Right = { kind: "acc"; id: string } | { kind: "add" } | { kind: "none" };

export function AppKeyWorkspace() {
  const sp = useSearchParams();
  const cast = useCaster();
  const { companies } = useStore();
  const keyAccounts = cast.accounts.filter((a) => accountScope(a) === "key");

  // 계정 → 고객사 관리 고객사 id (없으면 미연결)
  const coOf = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of keyAccounts) m.set(a.id, companyOfAccount(a, companies)?.id ?? UNLINKED);
    return m;
  }, [keyAccounts, companies]);
  const accountsOf = (id: number): CasterAccount[] => keyAccounts.filter((a) => coOf.get(a.id) === id);
  const unlinked = accountsOf(UNLINKED);
  const issuedIds = new Set([...coOf.values()].filter((v) => v !== UNLINKED));
  const defaultRight = (id: number): Right => { const a = accountsOf(id)[0]; return a ? { kind: "acc", id: a.id } : { kind: "none" }; };

  const [coId, setCoId] = useState(0);
  const [right, setRight] = useState<Right>({ kind: "none" });
  const [q, setQ] = useState("");
  const [view, setView] = useState<CoView>("issued");
  const [inited, setInited] = useState(false);

  // 첫 선택 — ?acc= 계정 / ?co= 고객사 / ?add=1 계정 추가 · 없으면 App Key 계정이 있는 첫 고객사
  useEffect(() => {
    if (inited || companies.length === 0) return;
    const accQ = sp.get("acc"), coQ = Number(sp.get("co") || 0), add = sp.get("add") === "1";
    const acc = accQ ? keyAccounts.find((a) => a.id === accQ) : undefined;
    const first = companies.filter((c) => issuedIds.has(c.id)).sort((a, b) => a.name.localeCompare(b.name, "ko"))[0];
    const id = acc ? (coOf.get(acc.id) ?? 0) : (companies.some((c) => c.id === coQ) ? coQ : first?.id ?? 0);
    if (coQ && !issuedIds.has(coQ)) setView("all");
    setCoId(id);
    if (acc) setRight({ kind: "acc", id: acc.id });
    else if (add && id > 0) setRight({ kind: "add" });
    else setRight(defaultRight(id));
    setInited(true);
  }, [inited, companies.length, keyAccounts.length]);   // eslint-disable-line react-hooks/exhaustive-deps

  const co = companies.find((c) => c.id === coId);
  const accs = accountsOf(coId);
  const list = companies
    .filter((c) => (view === "issued" ? issuedIds.has(c.id) : true))
    .filter((c) => (q ? c.name.toLowerCase().includes(q.toLowerCase()) : true))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  const pickCo = (id: number) => { setCoId(id); setRight(defaultRight(id)); };
  const nKeys = keyAccounts.filter((a) => cast.appKeys.some((k) => k.accountId === a.id)).length;

  const coRow = (id: number, label: string, n: number, warn = false) =>
    <WsCoItem key={id} label={label} n={n} on={id === coId} warn={warn} title="App Key 계정" onClick={() => pickCo(id)} />;

  return (
    <div style={{ padding: "16px 20px", maxWidth: 1680 }}>
      {/* 머리 · 집계 — N Key 관리와 같은 모양 `PC-154` */}
      <WsTitle title="App Key 관리" scope={<>집계 대상 <b style={{ color: "#111827" }}>전체 고객사</b></>}
        note="고객사는 고객사 관리에서 불러옵니다 · App Key 계정은 서비스 계정과 별개입니다" />
      <WsStats items={[
        ["발급 고객사", `${issuedIds.size}곳`, "#111827"],
        ["App Key 계정", `${keyAccounts.length}개`, "#111827"],
        ["App Key 연동", `${nKeys}개`, "#2563eb"],
        ["App Key 없음", `${keyAccounts.length - nKeys}개`, keyAccounts.length - nKeys ? "#92400e" : "#9ca3af"],
        ["고객사 미연결", `${unlinked.length}개`, unlinked.length ? "#b45309" : "#9ca3af"],
      ]} />

      <div style={WS_GRID}>
        {/* ① 고객사 — 고객사 관리 */}
        <div style={card}>
          <WsCoHead count={list.length} />
          <div style={{ padding: 10 }}>
            <WsCoToggle view={view} onView={setView} issued={issuedIds.size} total={companies.length} />
            <input style={{ ...S.input, marginBottom: 8 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="고객사 검색" />
            {/* 고객사 목록 — 화면 아래 끝(100vh)까지 `PC-156` */}
            <WsFillScroll>
              {list.map((c) => coRow(c.id, c.name, accountsOf(c.id).length))}
              {list.length === 0 && (
                <div style={{ fontSize: 12, color: "#9ca3af", padding: "14px 6px", textAlign: "center", lineHeight: 1.7 }}>
                  {view === "issued" && q ? <>발급 고객사에 없습니다.<br />[전체 고객사]에서 찾아 계정을 추가하세요.</> : "검색 결과가 없습니다."}
                </div>
              )}
              {unlinked.length > 0 && !q && (
                <div style={{ borderTop: "1px solid #eef0f4", marginTop: 6, paddingTop: 6 }}>
                  {coRow(UNLINKED, "고객사 미연결", unlinked.length, true)}
                </div>
              )}
            </WsFillScroll>
          </div>
        </div>

        {/* ② App Key 계정 */}
        <div style={card}>
          <div style={hd}>
            <b style={{ fontSize: 14 }}>App Key 계정</b>
            <span style={{ fontSize: 11.5, color: "#9ca3af" }}>{accs.length}개</span>
            <span style={{ flex: 1 }} />
            <button type="button" disabled={!co} onClick={() => setRight({ kind: "add" })}
              style={{ ...WS_HEAD_BTN, opacity: co ? 1 : 0.5 }}>＋ 계정 추가</button>
          </div>
          {/* App Key 계정 목록 — 화면 아래 끝(100vh)까지 `PC-157` */}
          <WsFillScroll style={{ padding: 12 }}>
            {co && <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>{co.name}</div>}
            {coId === UNLINKED && <div style={{ fontSize: 11.5, color: "#b45309", marginBottom: 8, lineHeight: 1.6 }}>고객사 관리에 같은 이름의 고객사가 없는 옛 대장 계정입니다. 고객사 관리에 고객사를 등록하면 그 고객사로 이어집니다.</div>}
            {/* 계정 추가 중 — 새 계정 칸을 맨 위에 선택 상태로 보여 주고, 오른쪽은 빈 입력 폼 `PC-150` */}
            {right.kind === "add" && (
              <div style={{ border: "1px dashed #5f8ff0", background: "#f5f9ff", borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <b style={{ fontSize: 13.5, color: "#1d4ed8" }}>새 계정</b>
                  <span style={tag("#dbeafe", "#1d4ed8")}>작성 중</span>
                </div>
                <div style={{ fontSize: 11.5, color: "#6b7280", marginTop: 4 }}>오른쪽에서 계정 정보를 입력하고 [계정 추가]를 누르세요.</div>
              </div>
            )}
            {accs.length === 0 && right.kind !== "add" && (
              <div style={WS_EMPTY}>
                {co ? <>App Key 계정이 없습니다.<br />[＋ 계정 추가]로 등록하세요.</> : "왼쪽에서 고객사를 고르세요."}
              </div>
            )}
            {accs.map((a) => {
              const on = right.kind === "acc" && right.id === a.id;
              const key = cast.appKeys.find((k) => k.accountId === a.id);
              const nRange = key ? keyRanges(key).length : 0;
              return (
                <div key={a.id} onClick={() => setRight({ kind: "acc", id: a.id })} style={wsItem(on)}>
                  <b style={{ fontSize: 13.5 }}>{a.name || <span style={{ color: "#9ca3af", fontWeight: 400 }}>이름 없음</span>}</b>
                  <div style={{ fontFamily: "ui-monospace,monospace", fontSize: 11.5, color: "#6b7280", marginTop: 2 }}>{a.id}</div>
                  {coId === UNLINKED && <div style={{ fontSize: 11.5, color: "#b45309", marginTop: 2 }}>대장 고객사명: {a.company}</div>}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 7 }}>
                    {key ? <span style={tag("#f5f3ff", "#6d28d9")}>App Key</span> : <span style={tag("#f3f4f6", "#9ca3af")}>미발급</span>}
                    {nRange > 0 && <span style={tag("#eef6ff", "#2563eb")}>코드 범위 {nRange}</span>}
                    {a.seeded && <span style={tag("#f3f4f6", "#9ca3af")} title="개발팀 Caster 대장에서 들어온 계정">대장</span>}
                    <span style={{ marginLeft: "auto", fontSize: 11, color: "#9ca3af" }}>{a.createdAt ? a.createdAt.slice(0, 10) : ""}</span>
                  </div>
                </div>
              );
            })}
          </WsFillScroll>
        </div>

        {/* ③ 상세 / 계정 추가 */}
        <div style={{ minWidth: 0 }}>
          {right.kind === "acc" && (
            <AccountDetailView key={right.id} accountId={right.id} embedded
              onDeleted={() => { const rest = accs.filter((a) => a.id !== right.id); setRight(rest[0] ? { kind: "acc", id: rest[0].id } : { kind: "none" }); }} />
          )}
          {right.kind === "add" && co && (
            <AccountNewView key={`add-${co.id}`} embedded fixedCompanyId={co.id}
              onDone={(id) => setRight({ kind: "acc", id })}
              onCancel={() => { const first = accs[0]; setRight(first ? { kind: "acc", id: first.id } : { kind: "none" }); }} />
          )}
          {right.kind === "none" && (
            <div style={{ ...card, padding: "48px 0", textAlign: "center", color: "#9ca3af", fontSize: 12.5, lineHeight: 1.8 }}>
              {co ? <>계정을 선택하거나 <b>[＋ 계정 추가]</b>를 누르세요.</> : "왼쪽에서 고객사를 고르세요."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
