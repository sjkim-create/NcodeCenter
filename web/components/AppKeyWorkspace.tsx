"use client";

// App Key 관리 — 「고객사 | App Key 계정 | 계정 상세」 3단 `PC-146` `PC-153`
// - 고객사 = **고객사 관리에 등록된 고객사**를 불러온다(여기서 고객사를 등록하지 않는다) `PC-153`
// - 계정 = **App Key 계정** — 계정과 App Key 가 매칭되는 개념(scope key).
//   고객사 관리의 서비스 계정(고객사가 서비스 권한을 갖는 계정, scope service)과는 다른 계정이다.
// - 과거 발급분: 개발팀 Caster_계정_퍼미션_티켓.xlsx(caster-ledger.json) 계정 — 고객사명으로 고객사 관리 고객사와 잇는다
// - 왼쪽: 고객사(기본 = App Key 계정이 있는 고객사 · [전체 고객사]로 전환 · 검색) / 가운데: App Key 계정 + [＋ 계정 추가]
// - 오른쪽: 계정 상세(계정 정보 · App Key 발급) / 계정 추가 폼
// - 하위 고객사(상위 고객사의 공통코드를 쓰는 고객사)는 상위 고객사 밑에 들여 보인다 — 골라서 계정을 만들면 상위 SOBP 영역으로 발급 `PC-195` `PC-196`
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { S } from "./ui";
import { LicenseSlide } from "./BillingEditor";
import { useAuth, currentUser } from "@/lib/authStore";
import { BILLINGS_FILTER, type Billing } from "@/lib/ticketStore";
import { AccountDetailView, AccountNewView } from "./AccountsView";
import { useCaster, accountScope, accountTickets, type CasterAccount } from "@/lib/accountStore";
import { useStore } from "@/lib/store";
import { companyOfAccount } from "@/lib/keyCompany";
import {
  WS_CARD as card, WS_HD as hd, WS_GRID, WS_EMPTY, WS_HEAD_BTN, wsTag as tag, wsItem,
  WsTitle, WsStats, WsCoHead, WsCoToggle, WsCoItem, WsFillScroll, WsCoGroup, useSubsOf, nestCompanies, type CoView, type WsFold,
} from "./KeyWorkspaceUI";   // N Key 관리와 같은 조각 `PC-154`
const UNLINKED = -1;   // 고객사 관리에 없는 고객사의 옛 대장 계정
const ALL = -2;        // 전체 — 모든 고객사의 계정을 고객사별로 묶어 본다(N Key 관리와 같게) `PC-269`

type Right = { kind: "acc"; id: string } | { kind: "add" } | { kind: "none" };

export function AppKeyWorkspace() {
  const sp = useSearchParams();
  const cast = useCaster();
  const { companies } = useStore();
  const me = currentUser(useAuth());   // 라이선스 저장인 `PC-270`
  const keyAccounts = cast.accounts.filter((a) => accountScope(a) === "key");

  // 계정 → 고객사 관리 고객사 id (없으면 미연결)
  const coOf = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of keyAccounts) m.set(a.id, companyOfAccount(a, companies)?.id ?? UNLINKED);
    return m;
  }, [keyAccounts, companies]);
  const accountsOf = (id: number): CasterAccount[] => (id === ALL ? keyAccounts : keyAccounts.filter((a) => coOf.get(a.id) === id));
  const unlinked = accountsOf(UNLINKED);
  const issuedIds = new Set([...coOf.values()].filter((v) => v !== UNLINKED));
  const defaultRight = (id: number): Right => {
    const a = id === ALL ? [...keyAccounts].sort((x, y) => (y.createdAt ?? "").localeCompare(x.createdAt ?? ""))[0] : accountsOf(id)[0];   // 전체 = 가장 최근 계정
    return a ? { kind: "acc", id: a.id } : { kind: "none" };
  };

  const [coId, setCoId] = useState(ALL);   // 기본 = 전체 `PC-269`
  const [right, setRight] = useState<Right>({ kind: "none" });
  const [q, setQ] = useState("");
  const [view, setView] = useState<CoView>("issued");
  // 필터 — N Key 관리와 같은 줄 `PC-266`: 정산(계정의 티켓 중 하나라도) · 검색(고객사 · 계정 ID · 티켓 이름) — 출처 필터 · App Key 검색은 없다 `PC-267`
  const [fBill, setFBill] = useState<"" | Billing>("");
  const [aq, setAq] = useState("");
  const filtered = !!(fBill || aq.trim());
  const accHit = (a: CasterAccount) => {
    if (fBill && !accountTickets(a).some((r) => (r.billing ?? "미정") === fBill)) return false;
    const k = aq.trim().toLowerCase();
    if (k) {
      const names = accountTickets(a).map((r) => r.name ?? "").join(" ");
      if (!`${a.company} ${a.id} ${names}`.toLowerCase().includes(k)) return false;
    }
    return true;
  };
  const [inited, setInited] = useState(false);

  const subsOf = useSubsOf(companies);   // 상위 → 하위 고객사 `PC-196`

  // 첫 선택 — ?acc= 계정 / ?co= 고객사 / ?add=1 계정 추가 · 없으면 App Key 계정이 있는 첫 고객사
  useEffect(() => {
    if (inited || companies.length === 0 || keyAccounts.length === 0) return;   // 계정을 불러온 뒤에 첫 선택
    const accQ = sp.get("acc"), coQ = Number(sp.get("co") || 0), add = sp.get("add") === "1";
    const acc = accQ ? keyAccounts.find((a) => a.id === accQ) : undefined;
    const id = acc ? (coOf.get(acc.id) ?? 0) : (companies.some((c) => c.id === coQ) ? coQ : ALL);   // 기본 = 전체 `PC-269`
    if (coQ && !issuedIds.has(coQ)) setView("all");
    setCoId(id);
    if (acc) setRight({ kind: "acc", id: acc.id });
    else if (add && id > 0) setRight({ kind: "add" });
    else setRight(defaultRight(id));
    setInited(true);
  }, [inited, companies.length, keyAccounts.length]);   // eslint-disable-line react-hooks/exhaustive-deps

  const co = companies.find((c) => c.id === coId);   // 전체 · 미연결이면 없음
  const accsAll = accountsOf(coId);                 // 이 고객사 계정 전부(연간 라이선스 대상 판단)
  const accs = accsAll.filter(accHit);              // 필터에 맞는 계정 `PC-266`
  // 전체 — 고객사별 묶음, 고객사는 가장 최근 등록 순 · 묶음 안도 최근 순 `PC-269`
  const newest = (xs: CasterAccount[]) => xs.reduce((m, a) => (a.createdAt ?? "") > m ? (a.createdAt ?? "") : m, "");
  const byNew = (a: CasterAccount, b: CasterAccount) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
  const groups = coId === ALL
    ? [...new Set(accs.map((a) => coOf.get(a.id)!))].map((k) => ({ key: k, as: accs.filter((a) => coOf.get(a.id) === k).sort(byNew) }))
        .sort((a, b) => newest(b.as).localeCompare(newest(a.as)))
    : [{ key: coId, as: accs }];
  const coName = (id: number) => (id === UNLINKED ? "고객사 미연결" : companies.find((c) => c.id === id)?.name ?? "고객사 미연결");
  const hitN = (id: number) => accountsOf(id).filter(accHit).length;
  const hitIds = new Set(keyAccounts.filter(accHit).map((a) => coOf.get(a.id)!));
  const list = companies
    // 발급 고객사 보기 — 하위 고객사가 발급받은 상위 고객사도 보여 하위 고객사를 고를 수 있게 `PC-196`
    .filter((c) => (view === "issued" ? issuedIds.has(c.id) || (subsOf.get(c.id) ?? []).some((id) => issuedIds.has(id)) : true))
    // 필터 중이면 맞는 계정이 있는 고객사(하위에 있으면 상위도)만 `PC-266`
    .filter((c) => (filtered ? hitIds.has(c.id) || (subsOf.get(c.id) ?? []).some((id) => hitIds.has(id)) : true))
    .filter((c) => (q ? c.name.toLowerCase().includes(q.toLowerCase()) : true))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  const pickCo = (id: number) => {
    setCoId(id);
    if (id !== ALL) { setRight(defaultRight(id)); return; }
    const a = [...keyAccounts].sort(byNew).find(accHit);   // 전체 — 가장 최근 계정
    setRight(a ? { kind: "acc", id: a.id } : { kind: "none" });
  };
  useEffect(() => {
    if (!filtered) { if (right.kind === "none" && accs.length) setRight({ kind: "acc", id: accs[0].id }); return; }   // 필터 해제 — 비운 상세를 되살린다
    // 지금 고객사에 맞는 계정이 있으면 그대로 · 보던 계정이 빠졌으면 맞는 첫 계정으로
    if (coId === ALL ? hitIds.size > 0 : hitIds.has(coId)) {
      const first = groups[0]?.as[0] ?? accs[0];
      if (right.kind === "acc" && !accs.some((a) => a.id === right.id)) setRight({ kind: "acc", id: first.id });
      return;
    }
    const firstHit = companies.filter((c) => hitIds.has(c.id)).sort((a, b) => a.name.localeCompare(b.name, "ko"))[0];
    const nextId = firstHit?.id ?? (hitIds.has(UNLINKED) ? UNLINKED : 0);
    if (!nextId || coId === ALL) { setRight({ kind: "none" }); return; }   // 맞는 계정이 하나도 없으면 상세를 비운다
    setCoId(nextId); const a = accountsOf(nextId).filter(accHit)[0]; setRight(a ? { kind: "acc", id: a.id } : { kind: "none" });
  }, [fBill, aq]);   // eslint-disable-line react-hooks/exhaustive-deps
  const nKeys = keyAccounts.filter((a) => cast.appKeys.some((k) => k.accountId === a.id)).length;

  const coRow = (id: number, label: string, n: number, warn = false, sub = false, fold?: WsFold) =>
    <WsCoItem key={id} label={label} n={n} on={id === coId} warn={warn} sub={sub} fold={fold} bold={id === ALL} title="App Key 계정" onClick={() => pickCo(id)} />;
  // 목록 — 상위 고객사가 목록에 있으면 하위 고객사는 그 밑에(발급 고객사 보기에서도 보인다) `PC-196`

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

      {/* 필터 — N Key 관리와 같은 줄. 계정에 건다 → 왼쪽 고객사 · 가운데 계정이 결과만 `PC-266` */}
      <div style={{ ...card, padding: "10px 12px", marginBottom: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 12.5 }}>
        <b style={{ fontSize: 12.5, color: "#374151" }}>필터</b>
        <div style={{ display: "flex", gap: 4 }} title="계정의 티켓 중 하나라도 이 정산이면">
          <button onClick={() => setFBill("")} style={fchip(fBill === "")}>정산 전체</button>
          {BILLINGS_FILTER.map((b) => <button key={b} onClick={() => setFBill(b)} style={fchip(fBill === b)}>{b}</button>)}
        </div>
        <input value={aq} onChange={(e) => setAq(e.target.value)} placeholder="고객사 · 계정 ID · 티켓 이름 검색" style={{ ...S.input, width: 260 }} />
        {filtered && <button onClick={() => { setFBill(""); setAq(""); }} style={S.linkBtn}>필터 해제</button>}
        <span style={{ flex: 1 }} />
        {filtered && <span style={{ color: "#6b7280" }}>계정 <b style={{ color: "#111827" }}>{keyAccounts.filter(accHit).length}개</b> · 고객사 <b style={{ color: "#111827" }}>{[...hitIds].filter((x) => x !== UNLINKED).length}곳</b></span>}
      </div>

      <div style={WS_GRID}>
        {/* ① 고객사 — 고객사 관리 */}
        <div style={card}>
          <WsCoHead count={filtered ? `${list.length}` : list.length} />
          <div style={{ padding: 10 }}>
            <WsCoToggle view={view} onView={setView} issued={issuedIds.size} total={companies.length} />
            <input style={{ ...S.input, marginBottom: 8 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="고객사 검색" />
            {/* 고객사 목록 — 화면 아래 끝(100vh)까지 `PC-156` */}
            <WsFillScroll>
              {/* 전체 — N Key 관리와 같은 자리 `PC-269` */}
              {!q && coRow(ALL, "전체", filtered ? keyAccounts.filter(accHit).length : keyAccounts.length)}
              {/* 상위 고객사 ▸ 접기 · 펼치기 — 하위는 세로 안내선 안에 `PC-198` */}
              {nestCompanies(list, companies, subsOf, (x) => (q ? x.name.toLowerCase().includes(q.toLowerCase()) : true)).map(({ c, subs }) => (
                <WsCoGroup key={c.id} n={subs.length} autoOpen={!!q}
                  head={(fold) => coRow(c.id, c.name, filtered ? hitN(c.id) : accountsOf(c.id).length, false, false, fold)}>
                  {subs.filter((x) => !filtered || hitIds.has(x.id)).map((x) => coRow(x.id, x.name, filtered ? hitN(x.id) : accountsOf(x.id).length, false, true))}
                </WsCoGroup>
              ))}
              {list.length === 0 && (
                <div style={{ fontSize: 12, color: "#9ca3af", padding: "14px 6px", textAlign: "center", lineHeight: 1.7 }}>
                  {view === "issued" && q ? <>발급 고객사에 없습니다.<br />[전체 고객사]에서 찾아 계정을 추가하세요.</> : "검색 결과가 없습니다."}
                </div>
              )}
              {unlinked.length > 0 && !q && (!filtered || hitIds.has(UNLINKED)) && (
                <div style={{ borderTop: "1px solid #eef0f4", marginTop: 6, paddingTop: 6 }}>
                  {coRow(UNLINKED, "고객사 미연결", filtered ? hitN(UNLINKED) : unlinked.length, true)}
                </div>
              )}
            </WsFillScroll>
          </div>
        </div>

        {/* ② App Key 계정 */}
        <div style={card}>
          <div style={hd}>
            <b style={{ fontSize: 14 }}>App Key 계정</b>
            <span style={{ fontSize: 11.5, color: "#9ca3af" }}>{filtered ? `${accs.length}/${accsAll.length}` : accs.length}개</span>
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
                {filtered && accsAll.length > 0 ? "필터에 맞는 계정이 없습니다." : coId === ALL ? "App Key 계정이 없습니다." : co ? <>App Key 계정이 없습니다.<br />[＋ 계정 추가]로 등록하세요.</> : "왼쪽에서 고객사를 고르세요."}
              </div>
            )}
            {groups.map((g) => (
              <div key={g.key}>
              {coId === ALL && (
                <button type="button" onClick={() => pickCo(g.key)} title="이 고객사만 보기"
                  style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", border: 0, background: "none", padding: "6px 2px", margin: "4px 0 6px", borderBottom: "1px solid #eef0f4", cursor: "pointer", fontSize: 12.5 }}>
                  <b style={{ color: g.key === UNLINKED ? "#b45309" : "#111827" }}>{coName(g.key)}</b>
                  <span style={{ color: "#9ca3af" }}>{g.as.length}개</span>
                  <span style={{ flex: 1 }} />
                  <span style={{ color: "#2563eb", fontSize: 11.5 }}>›</span>
                </button>
              )}
            {g.as.map((a) => {
              const on = right.kind === "acc" && right.id === a.id;
              const key = cast.appKeys.find((k) => k.accountId === a.id);
              const nRange = accountTickets(a).length;   // 티켓 = 계정 소속 `PC-206`
              return (
                <div key={a.id} onClick={() => setRight({ kind: "acc", id: a.id })} style={wsItem(on)}>
                  {/* 제목 = 계정 ID — 이름은 티켓에 붙는다(티켓 이름). 담당자명은 있을 때만 `PC-267` */}
                  <b style={{ fontSize: 13.5, wordBreak: "break-all" }}>{a.id}</b>
                  {a.name && <div style={{ fontSize: 11.5, color: "#6b7280", marginTop: 2 }}>담당자 {a.name}</div>}
                  {coOf.get(a.id) === UNLINKED && <div style={{ fontSize: 11.5, color: "#b45309", marginTop: 2 }}>대장 고객사명: {a.company}</div>}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 7 }}>
                    {key ? <span style={tag("#f5f3ff", "#6d28d9")}>App Key</span> : <span style={tag("#f3f4f6", "#9ca3af")}>미발급</span>}
                    {nRange > 0 && <span style={tag("#eef6ff", "#2563eb")}>티켓 {nRange}</span>}
                    {a.seeded && <span style={tag("#f3f4f6", "#9ca3af")} title="개발팀 Caster 대장에서 들어온 계정">대장</span>}
                    <span style={{ marginLeft: "auto", fontSize: 11, color: "#9ca3af" }}>{a.createdAt ? a.createdAt.slice(0, 10) : ""}</span>
                  </div>
                </div>
              );
            })}
              </div>
            ))}
          </WsFillScroll>
        </div>

        {/* ③ 상세 / 계정 추가 — 맨 위에 연간 라이선스 탭(이 고객사에 App Key 계정이 있을 때) `PC-270` */}
        <div style={{ minWidth: 0 }}>
          {co && accsAll.length > 0 && <LicenseSlide kind="APP" company={co} by={me?.name ?? ""} />}
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
              {co ? <>계정을 선택하거나 <b>[＋ 계정 추가]</b>를 누르세요.</> : coId === ALL ? "계정을 선택하세요." : "왼쪽에서 고객사를 고르세요."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 필터 칩 — N Key 관리 필터 줄과 같은 모양 `PC-266`
const fchip = (on: boolean): React.CSSProperties => ({
  fontSize: 12.5, padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontWeight: on ? 700 : 400,
  border: `1px solid ${on ? "#93c5fd" : "#e5e7eb"}`, background: on ? "#eef6ff" : "#fff", color: on ? "#1d4ed8" : "#6b7280",
});
