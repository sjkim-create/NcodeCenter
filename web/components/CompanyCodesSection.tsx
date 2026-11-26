"use client";

// 고객사 관리 ▸ 공통코드 · 확장 언어 `PC-330`
// ① 상위 고객사(공통코드) 지정 — 이 고객사가 SOBP 맵에서 할당받은 S/O 를 [공통코드로 지정] 하면
//    모든 고객사의 「공통코드 사용 고객사(하위 등록)」 목록에 상위 고객사로 나타난다.
// ② 확장 언어 그룹 — **고객사당 기본 1개** `PC-373`(옛 기본 코드마다 `PC-357`). 할당받은 코드 중 기본 코드를 골라 그룹을 만들고,
//    같은 Section 의 다른 할당 코드를 확장 코드로 넣는다. 슬롯별 언어도 여기서 넣고 고친다(Owner 당 4칸 · 순서 자유 · 빈 칸 허용).
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { S } from "./ui";
import { Sc } from "./sobp";
import { InfoTip } from "./KeyWorkspaceUI";
import { useStore } from "@/lib/store";
import type { Company } from "@/lib/customerData";
import { COMMON_CODES, addCommonCode, removeCommonCode, isCustomCommonCode, hydrateCommonCodes, useCommonCodes, commonCodeOf, withOwner, isCommonSO, COMMON_EXT_MSG } from "@/lib/commonCodes";
import { membersOf, codesOfMember, hydrateMembers, useCommonMembers } from "@/lib/commonMembers";
import {
  groupsOfCompany, allLangGroups, groupOwners, saveLangGroup, deleteLangGroup, hydrateLangGroups, useLangGroups,
  langRows, langGroupOf, extLangText, groupOfOwner, type LangGroup,
} from "@/lib/langGroups";
import { codeKind } from "@/lib/codeKind";
import { logActivity } from "@/lib/activityStore";
import { useAuth, currentUser } from "@/lib/authStore";

type Draft = Omit<LangGroup, "id" | "label"> & { id?: number };
const card: React.CSSProperties = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 12 };
const hd: React.CSSProperties = { padding: "13px 18px", borderBottom: "1px solid #eef0f4", display: "flex", alignItems: "center", gap: 8 };
const ft: React.CSSProperties = { padding: "11px 18px", borderTop: "1px solid #eef0f4", display: "flex", alignItems: "center", gap: 8 };
const four = (a: string[] = []) => [0, 1, 2, 3].map((i) => a[i] ?? "");

export function CompanyCodesSection({ company }: { company: Company }) {
  const { projects } = useStore();
  const me = currentUser(useAuth());
  useCommonCodes(); useCommonMembers(); useLangGroups();
  useEffect(() => { hydrateCommonCodes(); hydrateMembers(); hydrateLangGroups(); }, []);

  // 이 고객사가 SOBP 맵에서 할당받은 S/O — 할당 종류(N/G)가 있으면 공통코드 지정 때 기본값으로 쓴다
  const allocated = useMemo(() => {
    const m = new Map<string, { s: number; o: number; k?: string }>();
    for (const p of projects) if (!p.keyCustomer && p.companyId === company.id)
      for (const b of p.issued) { const key = `${b.section}/${b.owner}`; if (!m.has(key)) m.set(key, { s: b.section, o: b.owner, k: b.kind }); }
    return [...m.values()].sort((a, b) => a.s - b.s || a.o - b.o);
  }, [projects, company.id]);

  // 상위 고객사(공통코드) 지정과 확장 언어 그룹은 **다른 일**이라 위아래가 아니라 **탭**으로 나눈다 `PC-362`
  const nHeld = COMMON_CODES.filter((c) => c.company === company.name && !c.historyOnly && allocated.some((a) => a.s === c.s && a.o === c.o)).length;
  const inherited = inheritedLangGroups(company.name);   // 하위 고객사 — 상위 고객사 그룹을 그대로 승계 `PC-373`
  const nGroups = groupsOfCompany(company.id).length + inherited.length;
  const [tab, setTab] = useState<"holder" | "lang">("holder");
  const TABS: { v: "holder" | "lang"; label: string; n: number }[] = [
    { v: "holder", label: "상위 고객사 (공통코드)", n: nHeld },
    { v: "lang", label: "확장 언어 그룹", n: nGroups },
  ];
  return (
    <div>
      <div role="tablist" aria-label="공통코드 · 확장 언어" style={{ display: "flex", gap: 4, marginBottom: 10, borderBottom: "1px solid #e5e7eb" }}>
        {TABS.map((t) => {
          const on = tab === t.v;
          return (
            <button key={t.v} type="button" role="tab" aria-selected={on} onClick={() => setTab(t.v)}
              style={{ border: 0, borderBottom: `2px solid ${on ? "#2563eb" : "transparent"}`, background: "none", cursor: "pointer",
                padding: "8px 14px", marginBottom: -1, fontSize: 13, fontWeight: on ? 700 : 400, color: on ? "#2563eb" : "#4b5563" }}>
              {t.label}
              <span style={{ ...S.tag, marginLeft: 6, fontSize: 10.5, padding: "0 6px", background: on ? "#eef6ff" : "#f3f4f6", color: on ? "#2563eb" : "#6b7280", fontWeight: 700 }}>{t.n}</span>
            </button>
          );
        })}
      </div>
      {tab === "holder"
        ? <HolderCard company={company} allocated={allocated} me={me?.name ?? ""} />
        : (
          <>
            {inherited.map((x) => <InheritedGroupCard key={x.g.id} code={x.code} g={x.g} />)}
            {/* 하위 고객사는 할당받은 코드가 없으면 자기 그룹 칸을 두지 않는다 — 상위 그룹 승계만 */}
            {(allocated.length > 0 || inherited.length === 0) && <LangGroupCard key={company.id} company={company} allocated={allocated} me={me?.name ?? ""} />}
          </>
        )}
    </div>
  );
}

/** 하위 고객사가 승계하는 상위 고객사의 확장 언어 그룹 `PC-373`
 *  — 이 고객사가 공통코드 사용 고객사(하위)로 등록된 코드 중, 그 코드가 확장 언어 그룹의 기본 코드인 것 */
export function inheritedLangGroups(name: string): { code: (typeof COMMON_CODES)[number]; g: LangGroup }[] {
  const out: { code: (typeof COMMON_CODES)[number]; g: LangGroup }[] = [];
  for (const key of codesOfMember(name)) {
    const [k, s, o] = key.split(":");
    const code = commonCodeOf(k, +s, +o);
    if (!code || code.historyOnly || code.company === name) continue;
    const g = langGroupOf(code.k, code.s, code.o);
    if (g && !out.some((x) => x.g.id === g.id)) out.push({ code, g });
  }
  return out;
}

/* ── 승계한 확장 언어 그룹(읽기 전용) ─────────────────────── */
function InheritedGroupCard({ code, g }: { code: (typeof COMMON_CODES)[number]; g: LangGroup }) {
  const owners = groupOwners(g);
  return (
    <div style={card}>
      <div style={{ ...hd, flexWrap: "wrap" }}>
        <b style={{ fontSize: 14, whiteSpace: "nowrap" }}>🌐 확장 언어 그룹</b>
        <span style={{ ...S.tag, fontSize: 10.5, background: "#f3e8ff", color: "#7e22ce", fontWeight: 700, whiteSpace: "nowrap" }}>승계 · {withOwner(code.company, code.o)}</span>
        <span style={{ fontSize: 11.5, color: "#6b7280" }}>기본 S{g.section ?? "-"}/O{g.base} · 확장 {g.ext.length}개</span>
        <InfoTip title="확장 언어 그룹 승계" width={340}>
          이 고객사는 <b>{withOwner(code.company, code.o)}</b> 공통코드의 <b>하위 고객사</b>라서 상위 고객사의 확장 언어 그룹을 <b>그대로 씁니다</b>.
          기본 · 확장 코드와 언어는 상위 고객사에서 고치고, 여기서는 보기만 합니다.
        </InfoTip>
      </div>
      <div style={{ padding: "12px 18px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
          {owners.map((o, i) => (
            <div key={o} style={{ display: "flex", alignItems: "flex-start", gap: 6, borderRadius: 9, padding: "7px 10px",
              border: `1px solid ${i === 0 ? "#bfdbfe" : "#a5f3fc"}`, background: i === 0 ? "#f5f9ff" : "#f0fdff" }}>
              <Sc k="S" v={g.section ?? 0} small /><Sc k="O" v={o} small />
              <span style={{ fontSize: 11.5, lineHeight: 1.5 }}>
                <b style={{ color: i === 0 ? "#1d4ed8" : "#0e7490" }}>{i === 0 ? "기본" : `확장 ${i}`}</b>
                <span style={{ color: "#6b7280" }}> · {extLangText(g, o)}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── ① 상위 고객사(공통코드) ───────────────────────────────── */
function HolderCard({ company, allocated, me }: { company: Company; allocated: { s: number; o: number; k?: string }[]; me: string }) {
  const codeOf = (s: number, o: number) => COMMON_CODES.find((c) => c.s === s && c.o === o && c.company === company.name && !c.historyOnly);
  const held = allocated.filter((a) => codeOf(a.s, a.o));
  return (
    <div style={card}>
      <div style={hd}>
        <b style={{ fontSize: 14 }}>상위 고객사 (공통코드)</b>
        <span style={{ fontSize: 11.5, color: held.length ? "#047857" : "#9ca3af", fontWeight: held.length ? 700 : 400 }}>
          {held.length ? `상위 고객사 · 공통코드 ${held.length}건` : "공통코드 없음"}
        </span>
        <InfoTip title="공통코드 지정" width={330}>
          할당받은 S/O 를 <b>공통코드로 지정</b>하면 이 고객사가 <b>상위 고객사</b>가 되고, 모든 고객사의 <b>공통코드 사용 고객사(하위 등록)</b> 목록에 나타납니다.
          하위 고객사는 그 코드의 Book 을 나눠 씁니다.
        </InfoTip>
      </div>
      <div style={{ padding: "12px 18px" }}>
        {allocated.length === 0 && (
          <div style={{ fontSize: 12.5, color: "#9ca3af", lineHeight: 1.7 }}>
            할당받은 코드가 없습니다. <Link href="/ownership" style={{ color: "#2563eb" }}>SOBP 맵</Link>에서 먼저 할당하세요.
          </div>
        )}
        {/* 할당받은 S/O 마다 작은 카드 — 공통코드 사용 고객사(하위 등록) 카드와 같은 모양 `PC-333` */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
        {allocated.map((a) => {
          const c = codeOf(a.s, a.o);
          const custom = c ? isCustomCommonCode(c) : false;
          const k: "G" | "N" = a.k === "G" ? "G" : "N";   // 할당 종류를 따른다 `PC-358`
          const members = c ? membersOf(c.k, c.s, c.o).length : 0;
          return (
            <div key={`${a.s}/${a.o}`} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", borderRadius: 9, padding: "9px 11px",
              border: `1px solid ${c ? "#a7f3d0" : "#eef0f4"}`, background: c ? "#f0fdf8" : "#fafbfc" }}>
              <Sc k="S" v={a.s} small /><Sc k="O" v={a.o} small />
              {c ? (
                <>
                  <span style={{ ...S.tag, fontSize: 10.5, background: "#ecfdf5", color: "#047857", fontWeight: 700 }}>공통코드 · {c.label.split(" · ")[0]}</span>
                  <div style={{ flexBasis: "100%", height: 0 }} />
                  <span style={{ fontSize: 11.5, color: "#6b7280" }}>하위 고객사 {members}곳</span>
                  <span style={{ flex: 1 }} />
                  {custom
                    ? <button type="button" onClick={() => {
                        if (members > 0 && !confirm(`하위 고객사 ${members}곳이 이 공통코드를 쓰고 있습니다. 지정을 해제할까요?`)) return;
                        removeCommonCode(c.k, c.s, c.o);
                        logActivity("company", `공통코드 지정 해제 · ${company.name} · S${a.s}/O${a.o}`, me);
                      }} style={{ ...S.ghost, padding: "3px 10px", fontSize: 12 }}>지정 해제</button>
                    : <span style={{ fontSize: 11, color: "#9ca3af" }} title="처음부터 등록된 공통코드 — 여기서 해제하지 않습니다">기본 등록</span>}
                </>
              ) : (
                <>
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>전용 코드</span>
                  <div style={{ flexBasis: "100%", height: 0 }} />
                  {/* 코드 종류(PDS2 / PDS3) 셀렉트는 없앴다 — 할당 종류를 따른다(미정이면 PDS3) `PC-358` */}
                  {(() => {
                    // 확장 언어 그룹의 **확장** 코드는 공용 코드로 지정하지 않는다 — 공용 코드는 그룹에서 기본으로만 `PC-374`
                    const asExt = groupOfOwner(a.s, a.o)?.role === "ext";
                    return (
                      <button type="button" disabled={asExt}
                        title={asExt ? "확장 언어 그룹의 확장 코드입니다 — 공용 코드는 확장 언어 그룹에서 기본으로만 설정할 수 있어 지정할 수 없습니다" : undefined}
                        onClick={() => {
                          if (asExt) return;
                          if (addCommonCode(company.name, k, a.s, a.o)) logActivity("company", `공통코드 지정 · ${company.name} · ${k === "G" ? "PDS2" : "PDS3"} S${a.s}/O${a.o}`, me);
                        }} style={{ ...S.primary, padding: "4px 10px", fontSize: 12, marginLeft: "auto", ...(asExt ? { opacity: 0.45, cursor: "not-allowed" } : {}) }}>공통코드로 지정</button>
                    );
                  })()}
                </>
              )}
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}

/* ── ② 확장 언어 그룹 ───────────────────────────────────── */
// 할당받은 코드 중 기본 코드 1개를 골라 그룹을 만들고, 그 그룹의 확장 코드 · 언어를 정한다 `PC-373`.
//   예: S0/O4 기본 = 확장 O5 · O6, O7 · O20 은 단독. 공통코드 지정(①)과는 별개다.
//   코드 종류는 고르지 않는다 — 기본 코드의 할당 종류를 따른다.
// **고객사당 기본 1개 · 그룹 1개** `PC-373` — 기본 코드 1개 + 지정한 Owner 만 확장, 지정하지 않은 코드는 **단독(전용) 코드**로 그대로 둔다
//   (옛 「할당된 코드는 모두 기본 또는 확장이어야 저장」 `PC-363` · 「기본 코드마다 그룹 여러 개」 `PC-357` 를 바꿈).
//   옛 규칙으로 그룹이 둘 이상 저장된 고객사는 데이터를 건드리지 않고, 하나만 남길 때까지 저장을 막는다.
type Alloc = { s: number; o: number; k?: string };
const TOO_MANY = (bases: string) => `기본 코드는 고객사당 1개입니다 — 지금 기본 ${bases}. 하나만 기본으로 두고 나머지는 확장 또는 단독으로 바꾸세요.`;
type DG = Draft & { _k: string; _new?: boolean };
const kindOfAlloc = (a?: Alloc) => (a?.k ? codeKind(a.k, a.s) : undefined);
const soKey = (s: number | null, o: number) => `${s ?? 0}/${o}`;

function LangGroupCard({ company, allocated, me }: { company: Company; allocated: Alloc[]; me: string }) {
  useLangGroups();
  const fromStore = (): DG[] => groupsOfCompany(company.id).map((g) => ({ ...g, _k: `g${g.id}` }));
  const [drafts, setDrafts] = useState<DG[]>(fromStore);
  const [err, setErr] = useState("");
  const saved = groupsOfCompany(company.id);
  const strip = (x: DG[]) => JSON.stringify(x.map(({ _k, _new, ...r }) => r));   // eslint-disable-line @typescript-eslint/no-unused-vars
  const dirty = strip(drafts) !== strip(saved.map((g) => ({ ...g, _k: "" })));
  // 다른 고객사 그룹에 든 코드(옛 슬롯 고객사 등) — 이 고객사 코드라도 이미 지정된 것으로 본다
  const otherCo = new Map<string, LangGroup>();
  for (const g of allLangGroups()) if (g.companyId !== company.id) for (const o of groupOwners(g)) otherCo.set(soKey(g.section, o), g);
  const codesOf = (x: DG[]) => new Set(x.flatMap((g) => groupOwners(g).map((o) => soKey(g.section, o))));
  const inDrafts = codesOf(drafts);
  const free = allocated.filter((a) => !inDrafts.has(soKey(a.s, a.o)) && !otherCo.has(soKey(a.s, a.o)));
  const totalLangs = drafts.reduce((n, g) => n + Object.values(g.langs).reduce((m, v) => m + four(v).filter((x) => x.trim()).length, 0), 0);
  const upd = (k: string) => (f: (x: DG) => DG) => { setErr(""); setDrafts((ds) => ds.map((x) => (x._k === k ? f(x) : x))); };

  // 코드 지정 — 모든 할당 코드를 펼쳐 놓고 코드마다 바로 고른다 `PC-364`
  //   "" = 단독(전용 코드) · "base" = 기본(그 코드로 그룹이 생긴다) · "ext:{그룹}" = 그 기본 코드 그룹의 확장
  //   기본 코드를 다른 역할로 바꾸면 그 그룹이 풀리고 확장 코드들은 단독 코드로 돌아간다(언어는 코드를 따라간다)
  const roleOf = (a: Alloc): string => {
    for (const g of drafts) {
      if (g.section !== a.s) continue;
      if (g.base === a.o) return "base";
      if (g.ext.includes(a.o)) return `ext:${g._k}`;
    }
    return "";
  };
  const setRole = (a: Alloc, v: string) => {
    setErr("");
    setDrafts((ds0) => {
      let ds = ds0.map((g) => ({ ...g, ext: [...g.ext], langs: { ...g.langs } }));
      let carry: string[] | undefined;
      // 1) 지금 자리에서 뺀다
      const asBase = ds.find((g) => g.section === a.s && g.base === a.o);
      if (asBase) { carry = asBase.langs[String(a.o)]; ds = ds.filter((g) => g !== asBase); }
      for (const g of ds) {
        if (g.section !== a.s) continue;
        const p = g.ext.indexOf(a.o);
        if (p >= 0) { carry = g.langs[String(a.o)]; g.ext.splice(p, 1); delete g.langs[String(a.o)]; }
      }
      // 2) 새 자리에 넣는다
      if (v === "base") {
        ds.push({ companyId: company.id, company: company.name, kind: kindOfAlloc(a), section: a.s, base: a.o, langCount: 4, ext: [],
          langs: carry ? { [String(a.o)]: carry } : {}, _k: `n${Date.now()}${a.o}`, _new: true });
      } else if (v.startsWith("ext:")) {
        const g = ds.find((x) => x._k === v.slice(4));
        if (g) { g.ext.push(a.o); if (carry) g.langs[String(a.o)] = carry; }
      }
      return ds.sort((x, y) => (x.section ?? 0) - (y.section ?? 0) || (x.base ?? 0) - (y.base ?? 0));
    });
  };
  const cancel = () => { setDrafts(fromStore()); setErr(""); };
  const save = () => {
    const low = drafts.find((g) => g.langCount < 1);
    if (low) { alert(`S${low.section}/O${low.base} 그룹 — 필요 언어 수는 1 이상이어야 합니다.`); return; }
    // 기본은 고객사당 1개 `PC-373` — 지정하지 않은 코드는 단독 코드로 저장된다(막지 않는다 · 옛 `PC-363`)
    if (drafts.length > 1) {
      const msg = TOO_MANY(drafts.map((g) => `O${g.base}`).join(" · "));
      setErr(msg);
      alert(msg);
      return;
    }
    // 공용 코드는 기본으로만 — 확장에 든 공용 코드가 있으면(옛 저장값) 저장하지 않는다 `PC-374`
    const badExt = drafts.flatMap((g) => g.ext.filter((o) => isCommonSO(g.section, o)).map((o) => ({ s: g.section, o })))[0];
    if (badExt) { const msg = COMMON_EXT_MSG(badExt.s, badExt.o) + " 기본 또는 단독으로 바꾸세요."; setErr(msg); alert(msg); return; }
    const keepIds = new Set(drafts.filter((g) => g.id != null).map((g) => g.id));
    for (const g of saved) if (!keepIds.has(g.id)) {
      deleteLangGroup(g.id);
      logActivity("company", `확장 언어 그룹 삭제 · ${company.name} · 기본 S${g.section}/O${g.base}`, me);
    }
    for (const { _k, _new, ...g } of drafts) {   // eslint-disable-line @typescript-eslint/no-unused-vars
      const keep = new Set(groupOwners(g).map(String));
      const langs = Object.fromEntries(Object.entries(g.langs).filter(([k]) => k.startsWith("#") || keep.has(k)));
      const rec = saveLangGroup({ ...g, langs, company: company.name });
      logActivity("company", `확장 언어 그룹 ${_new ? "등록" : "수정"} · ${company.name} · 기본 S${rec.section}/O${rec.base} · 언어 ${rec.langCount}개 · 확장 ${rec.ext.map((o) => `O${o}`).join("·") || "없음"}`, me);
    }
    setDrafts(fromStore()); setErr("");
  };
  const nFree = free.length;

  return (
    <div style={card}>
      <div style={hd}>
        <b style={{ fontSize: 14 }}>확장 언어 그룹</b>
        {drafts.length
          ? <span style={{ fontSize: 11.5, color: "#0e7490", fontWeight: 700 }}>그룹 {drafts.length}개 · 등록한 언어 {totalLangs}개</span>
          : <span style={{ fontSize: 11.5, color: "#9ca3af" }}>사용 안 함</span>}
        {drafts.length > 0 && nFree > 0 && <span style={{ fontSize: 11.5, color: "#6b7280" }}>· 단독 {nFree}개</span>}
        <InfoTip title="확장 언어 그룹" width={380}>
          할당된 코드 중 <b>기본 1개</b>를 고르고, 확장 언어로 쓸 Owner 만 <b>확장</b>으로 고릅니다. 지정하지 않은 코드는 <b>단독(전용) 코드</b>로 그대로 남습니다.
          <b>공용 코드</b>는 기본으로만 설정할 수 있고 확장으로는 넣을 수 없습니다.
          Owner 하나에 언어 슬롯 4개 — 기본 코드가 슬롯 1~4, 확장 코드는 순서대로 5~8 · 9~12 … 입니다.
          공통코드 지정과는 별개이고, 이 고객사의 하위 고객사는 이 그룹을 그대로 승계합니다.
        </InfoTip>
      </div>
      <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
        {allocated.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "#9ca3af", lineHeight: 1.7 }}>
            할당받은 코드가 없습니다. <Link href="/ownership" style={{ color: "#2563eb" }}>SOBP 맵</Link>에서 먼저 할당하세요.
          </div>
        ) : (
          <>
            {/* 옛 규칙(기본 코드마다 그룹 `PC-357`)으로 그룹이 둘 이상인 고객사 — 데이터는 그대로 두고 알린다 `PC-373` */}
            {drafts.length > 1 && (
              <div role="alert" style={{ fontSize: 12, color: "#dc2626", fontWeight: 700 }}>⚠ {TOO_MANY(drafts.map((g) => `O${g.base}`).join(" · "))}</div>
            )}
            {/* 코드 지정 — 모든 할당 코드를 펼쳐 놓는다(만들기 버튼 없이 바로 고른다) `PC-364` */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>코드 지정 <span style={{ fontWeight: 400, color: "#9ca3af" }}>· {allocated.length}개</span></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
                {allocated.map((a) => {
                  const ext = otherCo.get(soKey(a.s, a.o));
                  const v = ext ? "" : roleOf(a);
                  const tone = ext ? { bd: "#e5e7eb", bg: "#f9fafb", fg: "#6b7280" }
                    : v === "base" ? { bd: "#bfdbfe", bg: "#f5f9ff", fg: "#1d4ed8" }
                    : v ? { bd: "#a5f3fc", bg: "#f0fdff", fg: "#0e7490" }
                    : { bd: "#eef0f4", bg: "#fafbfc", fg: "#6b7280" };   // 단독 — 경고색 아님 `PC-373`
                  const bases = drafts.filter((g) => g.section === a.s && g.base !== a.o);
                  // 기본은 고객사당 1개 — 기본이 이미 있으면 다른 코드에는 「기본」 을 내지 않는다(기본 바꾸기는 그룹 칸의 [기본 ▾]) `PC-373`
                  const canBase = v === "base" || drafts.length === 0;
                  // 공용 코드는 **기본으로만** — 확장 항목을 내지 않는다 `PC-374`
                  const common = isCommonSO(a.s, a.o);
                  return (
                    <div key={soKey(a.s, a.o)} style={{ display: "flex", alignItems: "center", gap: 6, borderRadius: 9, padding: "7px 10px", border: `1px solid ${tone.bd}`, background: tone.bg }}>
                      <Sc k="S" v={a.s} small /><Sc k="O" v={a.o} small />
                      {common && <span title="공용 코드 — 확장 언어 그룹에서는 기본으로만 설정할 수 있습니다" style={{ ...S.tag, fontSize: 9.5, padding: "0 5px", background: "#ecfdf5", color: "#047857", fontWeight: 700, flexShrink: 0 }}>공용</span>}
                      {ext ? (
                        <span style={{ fontSize: 11, color: tone.fg, marginLeft: "auto" }} title={`${ext.company} 그룹(기본 O${ext.base})에 든 코드`}>{ext.company} 그룹</span>
                      ) : (
                        <select aria-label={`S${a.s}/O${a.o} 지정`} value={v} onChange={(e) => setRole(a, e.target.value)}
                          style={{ ...S.input, width: "auto", flex: 1, minWidth: 0, padding: "3px 6px", fontSize: 12, fontWeight: 700, color: tone.fg, background: "#fff" }}>
                          <option value="">단독 (전용 코드)</option>
                          {canBase && <option value="base">기본</option>}
                          {/* 옛 저장값으로 이미 확장에 든 공용 코드는 그 항목만 남겨 보인다(저장 때 막힘) */}
                          {(common ? bases.filter((g) => v === `ext:${g._k}`) : bases).map((g) => <option key={g._k} value={`ext:${g._k}`}>확장 · 기본 O{g.base}</option>)}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* 그룹 칸 — 기본으로 고른 코드마다(언어 · 확장 순서 · 기본 바꾸기) */}
            {drafts.map((g) => {
              const others = codesOf(drafts.filter((x) => x._k !== g._k));
              const cands = allocated.filter((a) => a.s === (g.section ?? 0) && !others.has(soKey(a.s, a.o)) && !otherCo.has(soKey(a.s, a.o)) && !groupOwners(g).includes(a.o));
              return <GroupBlock key={g._k} d={g} setD={upd(g._k)} cands={cands} allocated={allocated} />;
            })}
          </>
        )}
      </div>
      {(drafts.length > 0 || saved.length > 0) && (
        <div style={{ ...ft, flexWrap: "wrap" }}>
          {err
            ? <span role="alert" style={{ fontSize: 12, color: "#dc2626", fontWeight: 700, flexBasis: "100%" }}>⚠ {err}</span>
            : dirty && <span style={{ fontSize: 12, color: "#b45309" }}>● 저장하지 않은 변경이 있습니다</span>}
          <span style={{ flex: 1 }} />
          <button type="button" onClick={cancel} style={S.ghost} disabled={!dirty}>취소</button>
          <button type="button" onClick={save} style={S.primary}>저장</button>
        </div>
      )}
    </div>
  );
}

// 그룹 하나 — 기본 코드 · 필요 언어 수 · 코드 · 역할 · 언어 표 (코드 넣고 빼기는 위 「코드 지정」에서 `PC-364` · 저장은 카드 아래 한 번에 `PC-363`)
function GroupBlock({ d, setD, cands, allocated }: {
  d: DG; setD: (f: (x: DG) => DG) => void; cands: Alloc[]; allocated: Alloc[];
}) {
  const sec = d.section ?? 0;
  const rows = langRows(d);   // pos 0 = 기본 · pos k = 확장 k · 코드 없는 자리(#pos)는 언어가 있을 때만 보인다
  const hasLang = (key: string) => four(d.langs[key]).some((x) => x.trim());
  const visible = rows.filter((r) => r.owner != null || hasLang(r.key));
  const allLangs = rows.flatMap((r) => four(d.langs[r.key]).map((l, i) => ({ slot: r.start + i, lang: l.trim(), owner: r.owner }))).filter((x) => x.lang);
  const setLang = (key: string, i: number, v: string) => setD((x) => {
    const row = four(x.langs[key]); row[i] = v;
    return { ...x, langs: { ...x.langs, [key]: row } };
  });
  // 확장 코드의 순서 바꾸기 — 다른 확장 코드와 맞바꾼다 · 언어는 코드를 따라간다 `PC-346`
  const swapExt = (o: number, k: number) => setD((x) => {
    const ext = [...x.ext]; const p = ext.indexOf(o); const q = ext[k - 1];
    if (p < 0 || q == null) return x;
    ext[k - 1] = o; ext[p] = q;
    return { ...x, ext };
  });
  // 마지막 확장 코드 빼기 — 중간을 비우면 뒤 슬롯 번호가 당겨지므로 마지막만(뺀 코드는 단독(전용) 코드가 된다 `PC-373`)
  const dropLast = () => setD((x) => {
    const o = x.ext[x.ext.length - 1]; const langs = { ...x.langs };
    if (o != null) delete langs[String(o)];
    return { ...x, ext: x.ext.slice(0, -1), langs };
  });
  // 기본 코드 바꾸기 — 그룹의 기본은 늘 **1개**, 나머지는 확장 `PC-362`
  //   확장 코드를 고르면 둘이 자리를 맞바꾸고, 그룹 밖 코드를 고르면 옛 기본은 마지막 확장으로 간다 · 언어는 코드를 따라간다
  const setBase = (o: number) => setD((x) => {
    if (o === x.base || x.base == null) return x;
    const old = x.base; const ext = [...x.ext]; const p = ext.indexOf(o);
    if (p >= 0) ext[p] = old; else ext.push(old);
    return { ...x, base: o, ext, kind: kindOfAlloc(allocated.find((a) => a.s === (x.section ?? 0) && a.o === o)) };
  });
  // 확장 k 자리에 코드 넣기 — 빈 다음 자리면 덧붙이고, 이미 코드가 있는 자리면 그 코드를 빼고 바꾼다
  const putExt = (o: number, k: number) => setD((x) => {
    const ext = [...x.ext]; const langs = { ...x.langs };
    if (k - 1 < ext.length) { delete langs[String(ext[k - 1])]; ext[k - 1] = o; } else ext.push(o);
    const ph = langs[`#${k}`];   // 코드 없이 그 자리에 넣어 둔 언어 → 이 코드에 언어가 없으면 옮긴다
    if (ph && !four(langs[String(o)]).some((v) => v.trim())) { langs[String(o)] = ph; delete langs[`#${k}`]; }
    return { ...x, ext, langs };
  });
  const COLS = "190px repeat(4, minmax(64px, 1fr))";
  const nextK = d.ext.length + 1;

  return (
    <div style={{ border: `1px solid ${d._new ? "#67e8f9" : "#a5f3fc"}`, borderRadius: 10, overflow: "hidden" }}>
      {/* 그룹 머리 — 기본 코드 · 필요 언어 수 · [그룹 삭제] */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "9px 12px", background: "#f0fdff", borderBottom: "1px solid #cffafe" }}>
        <b style={{ fontSize: 12.5, color: "#0e7490" }}>🌐 기본</b>
        <Sc k="S" v={sec} small /><Sc k="O" v={d.base ?? 0} small />
        {d._new && <span style={{ ...S.tag, fontSize: 10.5, background: "#fef3c7", color: "#b45309", fontWeight: 700 }}>새 그룹</span>}
        <span style={{ fontSize: 11.5, color: "#6b7280" }}>확장 {d.ext.length ? d.ext.map((o) => `O${o}`).join(" · ") : "없음"}</span>
        <span style={{ flex: 1 }} />
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151" }}>
          필요 언어 수
          <input type="number" min={1} value={d.langCount} aria-label={`S${sec}/O${d.base} 필요 언어 수`}
            onChange={(e) => { const v = Math.max(0, Math.round(+e.target.value)); setD((x) => ({ ...x, langCount: v })); }} style={{ ...S.input, width: 70, padding: "4px 8px" }} />
        </label>
      </div>
      <div style={{ padding: "10px 12px" }}>
        {/* 등록한 언어 — 슬롯 번호 순서로 한 줄에 `PC-334` */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", fontSize: 12 }}>
          <span style={{ color: "#374151", fontWeight: 700, marginRight: 2 }}>등록한 언어 {allLangs.length} / {d.langCount}</span>
          {allLangs.length === 0 && <span style={{ color: "#9ca3af" }}>아직 없음</span>}
          {allLangs.map((x) => (
            <span key={x.slot} title={x.owner != null ? `O${x.owner} · 슬롯 ${x.slot}` : `할당 전 · 슬롯 ${x.slot}`}
              style={{ ...S.tag, fontSize: 11, background: x.owner != null ? "#ecfeff" : "#f3f4f6", color: x.owner != null ? "#0e7490" : "#6b7280" }}>
              <span style={{ fontFamily: "ui-monospace,monospace", opacity: 0.7, marginRight: 3 }}>{x.slot}</span>{x.lang}
            </span>
          ))}
        </div>
        {/* 코드 · 역할 · 언어 — 한 표 */}
        <div style={{ marginTop: 10, border: "1px solid #eef0f4", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: COLS, background: "#fafbfc", fontSize: 11.5, color: "#6b7280", fontWeight: 600 }}>
            <div style={{ padding: "7px 10px", display: "flex", alignItems: "center", gap: 4 }}>
              코드 · 역할
              <InfoTip title="코드 · 역할 · 언어" width={360}>
                기본 코드는 <b>1개</b>로 슬롯 1~4, 나머지는 확장 — 확장 1 = 5~8 · 확장 2 = 9~12 … 입니다. 기본도 다른 코드로 바꿀 수 있습니다(나머지는 확장).
                확장 코드끼리 순서를 바꾸면 <b>언어는 코드를 따라갑니다</b>.
                코드를 넣고 빼는 것은 위 <b>코드 지정</b>에서 합니다. 여기서는 마지막 확장만 뺄 수 있습니다(뒤 번호가 당겨지지 않게) — 뺀 코드는 단독(전용) 코드가 됩니다.
              </InfoTip>
            </div>
            {[1, 2, 3, 4].map((i) => <div key={i} style={{ padding: "7px 6px" }}>슬롯 {i}</div>)}
          </div>
          {visible.map((r) => {
            const o = r.owner;
            const isLast = r.pos >= 1 && r.pos === d.ext.length;
            const tone = r.pos === 0 ? { bg: "#eef6ff", fg: "#2563eb" } : { bg: "#ecfeff", fg: "#0e7490" };
            return (
              <div key={r.key} style={{ display: "grid", gridTemplateColumns: COLS, alignItems: "center", borderTop: "1px solid #eef0f4" }}>
                <div style={{ padding: "6px 8px", display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
                  {o != null ? (
                    <>
                      <Sc k="S" v={sec} small /><Sc k="O" v={o} small />
                      {r.pos === 0 ? (
                        // 기본 — 다른 코드로 바꿀 수 있다(확장 코드 · 그룹 밖 코드) · 기본은 1개 `PC-362`
                        //   지금 기본이 **공용 코드**면 바꾸지 않는다 — 바꾸면 공용 코드가 확장이 되므로 `PC-374`
                        <select aria-label={`S${sec}/O${o} 기본 코드 바꾸기`} value={String(o)} onChange={(e) => setBase(+e.target.value)}
                          title={isCommonSO(sec, o) ? "공용 코드는 기본으로만 설정할 수 있어 다른 코드로 바꾸지 않습니다(바꾸면 이 코드가 확장이 됩니다)" : "다른 코드를 기본으로 — 확장 코드면 자리를 맞바꾸고, 단독 코드면 지금 기본이 마지막 확장이 됩니다"}
                          style={{ ...S.input, padding: "3px 6px", fontSize: 12, minWidth: 0, flex: 1, background: tone.bg, color: tone.fg, fontWeight: 700 }}>
                          <option value={String(o)}>기본{isCommonSO(sec, o) ? " · 공용" : ""}</option>
                          {!isCommonSO(sec, o) && d.ext.map((x, i) => <option key={x} value={String(x)}>기본 ← O{x} (확장 {i + 1})</option>)}
                          {!isCommonSO(sec, o) && cands.map((a) => <option key={a.o} value={String(a.o)}>기본 ← O{a.o}</option>)}
                        </select>
                      ) : (
                        <select aria-label={`S${sec}/O${o} 역할`} value={String(r.pos)}
                          onChange={(e) => (e.target.value === "" ? dropLast() : swapExt(o, +e.target.value))}
                          style={{ ...S.input, padding: "3px 6px", fontSize: 12, minWidth: 0, flex: 1, background: tone.bg, color: tone.fg, fontWeight: 700 }}>
                          {d.ext.map((_, i) => <option key={i} value={String(i + 1)}>확장 {i + 1}</option>)}
                          {isLast && <option value="">— 빼기</option>}
                        </select>
                      )}
                    </>
                  ) : (
                    <>
                      {/* 코드 없이 언어만 들어 있는 자리 — 코드를 고르면 그 자리의 확장 코드가 된다 */}
                      <select aria-label={`확장 ${r.pos} 코드 선택`} value=""
                        onChange={(e) => { if (e.target.value) putExt(+e.target.value, Math.min(r.pos, nextK)); }}
                        style={{ ...S.input, padding: "3px 6px", fontSize: 12, minWidth: 0, flex: 1, color: "#b45309", borderColor: "#fde68a" }}>
                        <option value="">코드 선택</option>
                        {/* 확장 자리에는 공용 코드를 넣지 않는다 `PC-374` */}
                        {cands.filter((a) => !isCommonSO(a.s, a.o)).map((a) => <option key={a.o} value={String(a.o)}>S{a.s} · O{a.o}</option>)}
                      </select>
                      <span style={{ ...S.tag, fontSize: 9.5, background: tone.bg, color: tone.fg, fontWeight: 700, flexShrink: 0 }}>확장 {r.pos}</span>
                    </>
                  )}
                </div>
                {four(d.langs[r.key]).map((v, i) => (
                  <div key={i} style={{ padding: "5px 6px", display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 10.5, color: "#9ca3af", fontFamily: "ui-monospace,monospace", minWidth: 16, textAlign: "right" }}>{r.start + i}</span>
                    <input value={v} placeholder="지정된 언어 없음" aria-label={`${o != null ? `S${sec}/O${o}` : `확장 ${r.pos}`} 슬롯 ${r.start + i} 언어`}
                      onChange={(e) => setLang(r.key, i, e.target.value)} style={{ ...S.input, padding: "5px 7px", fontSize: 12 }} />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
