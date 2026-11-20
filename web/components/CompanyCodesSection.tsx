"use client";

// 고객사 관리 ▸ 공통코드 · 확장 언어 `PC-330`
// ① 상위 고객사(공통코드) 지정 — 이 고객사가 SOBP 맵에서 할당받은 S/O 를 [공통코드로 지정] 하면
//    모든 고객사의 「공통코드 사용 고객사(하위 등록)」 목록에 상위 고객사로 나타난다.
// ② 확장 언어 그룹 — **그룹 먼저(B안)**. 여기서 그룹을 켜고(코드 종류 · 기본 Owner · 필요 언어 수),
//    SOBP 맵 할당 창에서 Owner 를 [기본 / 확장 슬롯] 으로 할당하면 그룹에 자동으로 연결된다.
//    슬롯별 언어는 여기서 넣고 고친다(Owner 당 4칸 · 순서 자유 · 빈 칸 허용).
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { S, Field } from "./ui";
import { Sc } from "./sobp";
import { InfoTip } from "./KeyWorkspaceUI";
import { useStore } from "@/lib/store";
import type { Company } from "@/lib/customerData";
import { COMMON_CODES, addCommonCode, removeCommonCode, isCustomCommonCode, hydrateCommonCodes, useCommonCodes } from "@/lib/commonCodes";
import { membersOf, hydrateMembers, useCommonMembers } from "@/lib/commonMembers";
import {
  groupOfCompany, saveLangGroup, deleteLangGroup, hydrateLangGroups, useLangGroups,
  langRows, type LangGroup,
} from "@/lib/langGroups";
import type { CodeKind } from "@/lib/codeKind";
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
  useCommonCodes(); useCommonMembers(); const lgv = useLangGroups();
  useEffect(() => { hydrateCommonCodes(); hydrateMembers(); hydrateLangGroups(); }, []);

  // 이 고객사가 SOBP 맵에서 할당받은 S/O — 할당 종류(N/G)가 있으면 공통코드 지정 때 기본값으로 쓴다
  const allocated = useMemo(() => {
    const m = new Map<string, { s: number; o: number; k?: string }>();
    for (const p of projects) if (!p.keyCustomer && p.companyId === company.id)
      for (const b of p.issued) { const key = `${b.section}/${b.owner}`; if (!m.has(key)) m.set(key, { s: b.section, o: b.owner, k: b.kind }); }
    return [...m.values()].sort((a, b) => a.s - b.s || a.o - b.o);
  }, [projects, company.id]);

  return (
    <div>
      <HolderCard company={company} allocated={allocated} me={me?.name ?? ""} />
      <LangGroupCard key={`${company.id}:${lgv}`} company={company} allocated={allocated} me={me?.name ?? ""} />
    </div>
  );
}

/* ── ① 상위 고객사(공통코드) ───────────────────────────────── */
function HolderCard({ company, allocated, me }: { company: Company; allocated: { s: number; o: number; k?: string }[]; me: string }) {
  const [pick, setPick] = useState<Record<string, "G" | "N">>({});
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
          const k = pick[`${a.s}/${a.o}`] ?? (a.k === "G" ? "G" : "N");
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
                  <select aria-label={`S${a.s}/O${a.o} 코드 종류`} value={k} onChange={(e) => setPick((p) => ({ ...p, [`${a.s}/${a.o}`]: e.target.value as "G" | "N" }))}
                    style={{ ...S.input, width: "auto", padding: "4px 8px", fontSize: 12 }}>
                    <option value="N">PDS3</option>
                    <option value="G">PDS2</option>
                  </select>
                  <button type="button" onClick={() => {
                    if (addCommonCode(company.name, k, a.s, a.o)) logActivity("company", `공통코드 지정 · ${company.name} · ${k === "G" ? "PDS2" : "PDS3"} S${a.s}/O${a.o}`, me);
                  }} style={{ ...S.primary, padding: "4px 10px", fontSize: 12, marginLeft: "auto" }}>공통코드로 지정</button>
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
// 역할(기본 · 확장 슬롯)과 언어는 **여기서만** 정한다 `PC-335`
// SOBP 맵에서는 영역(Owner)만 할당 → 그룹에 「역할 미지정」으로 들어온다 → 한 표에서 코드마다 역할을 고르고 언어를 넣는다 `PC-346`
function LangGroupCard({ company, allocated, me }: { company: Company; allocated: { s: number; o: number; k?: string }[]; me: string }) {
  const g = groupOfCompany(company.id);
  const blank = (): Draft => ({ companyId: company.id, company: company.name, kind: "PDS2", section: null, base: null, langCount: 4, ext: [], pending: [], langs: {} });
  const [d, setD] = useState<Draft | null>(g ? { ...g } : null);
  const dirty = !!d && JSON.stringify(d) !== JSON.stringify(g ? { ...g } : null);
  const pending = d?.pending ?? [];
  // 한 표에서 역할과 언어를 함께 — 줄 = 코드 하나(역할 셀렉트 + 언어 4칸) `PC-346`
  //   역할이 있는 코드 → 자리 순서(기본 · 확장 1 · 2 …) · 할당 전 자리(코드 없이 언어만 넣어 둔 자리) · 역할 미지정 코드는 맨 아래
  //   언어는 **코드를 따라간다** — 역할을 바꾸면 그 코드의 언어가 새 슬롯 번호로 옮겨진다. 할당 전 자리의 언어는 처음 들어오는 코드로.
  const rows = d ? langRows(d) : [];
  const inGroup = new Set(d ? [...(d.base != null ? [d.base] : []), ...d.ext] : []);
  const secOf = (o: number) => d?.section ?? allocated.find((a) => a.o === o)?.s ?? 0;
  const posOf = (x: Draft, o: number) => (x.base === o ? 0 : x.ext.indexOf(o) >= 0 ? x.ext.indexOf(o) + 1 : -1);
  type TRow = { key: string; o: number | null; s: number; pos: number; tag?: "pending" | "outside" };
  const outside = d ? allocated.filter((a) => (d.section == null || a.s === d.section) && !inGroup.has(a.o) && !pending.includes(a.o)) : [];
  const trows: TRow[] = d ? [
    ...rows.map((r) => ({ key: r.key, o: r.owner, s: r.owner != null ? secOf(r.owner) : d.section ?? 0, pos: r.pos })),
    ...pending.map((o) => ({ key: String(o), o, s: secOf(o), pos: -1, tag: "pending" as const })),
    ...outside.map((a) => ({ key: String(a.o), o: a.o, s: a.s, pos: -1, tag: "outside" as const })),
  ] : [];
  // 표 = **코드 기준** — 「S0 · O4 · 기본」 처럼 코드와 역할만 보인다 `PC-347`
  //   보이는 줄: 언어를 등록한 코드 · [＋ 언어 등록] 으로 추가한 코드 · 코드 없이 언어만 들어 있는 자리(그 줄에서 코드를 고른다)
  const [shown, setShown] = useState<string[]>([]);
  const hasLang = (key: string) => !!d && four(d.langs[key]).some((x) => x.trim());
  const visible = trows.filter((r) => (r.o == null ? hasLang(r.key) : hasLang(r.key) || shown.includes(r.key)));
  const roleText = (pos: number) => (pos === 0 ? "기본" : pos > 0 ? `확장 ${pos}` : "역할 선택");
  // 아직 표에 없는 코드 — [＋ 언어 등록] 에서 코드와 역할을 함께 골라 넣는다
  const restCodes = trows.filter((r) => r.o != null && !visible.includes(r));
  const firstFree = d ? (d.base == null ? 0 : d.ext.length + 1) : 0;
  const [addCode, setAddCode] = useState("");
  const [addRole, setAddRole] = useState<number | null>(null);
  // 등록한 언어 전체 — 슬롯 번호 순서로 한 줄에 모아 본다 `PC-334`
  const allLangs = d ? rows.flatMap((r) => four(d.langs[r.key]).map((l, i) => ({ slot: r.start + i, lang: l.trim(), owner: r.owner }))).filter((x) => x.lang) : [];
  const filled = allLangs.length;

  const setLang = (key: string, i: number, v: string) => setD((x) => {
    if (!x) return x;
    const row = four(x.langs[key]); row[i] = v;
    return { ...x, langs: { ...x.langs, [key]: row } };
  });
  // 코드의 역할 바꾸기 — t = null(역할 미지정) · 0(기본) · k(확장 k). 그 자리 코드와는 맞바꾸고, 빈 자리면 그 자리로 `PC-343` `PC-346`
  const setRole = (o: number, sec: number, t: number | null) => {
    setShown((sh) => [...new Set([...sh, String(o)])]);
    setD((x) => {
      if (!x) return x;
      let base = x.base; const ext = [...x.ext]; let pend = [...(x.pending ?? [])]; const langs = { ...x.langs };
      const p = posOf(x, o);
      if (t === null) {
        if (p === 0) base = null; else if (p > 0) ext.splice(p - 1, 1);
        if (!pend.includes(o)) pend.push(o);
      } else if (p !== t) {
        const q = t === 0 ? base : ext[t - 1] ?? null;
        pend = pend.filter((v) => v !== o);
        if (t === 0) base = o; else if (t - 1 < ext.length) ext[t - 1] = o; else ext.push(o);
        if (q != null) { if (p === 0) base = q; else if (p > 0) ext[p - 1] = q; else if (!pend.includes(q)) pend.push(q); }
        else if (p === 0) base = null; else if (p > 0) ext.splice(p - 1, 1);
        const ph = langs[`#${t}`];   // 할당 전 자리에 넣어 둔 언어 → 이 코드에 언어가 없으면 옮긴다
        if (ph && !four(langs[String(o)]).some((v) => v.trim())) { langs[String(o)] = ph; delete langs[`#${t}`]; }
      }
      const any = base != null || ext.length > 0 || pend.length > 0;
      return { ...x, base, ext, pending: pend, langs, section: t !== null ? (x.section ?? sec) : any ? x.section : null };
    });
  };
  const dropPending = (o: number) => setD((x) => (x ? { ...x, pending: (x.pending ?? []).filter((p) => p !== o), section: x.base != null || x.ext.length || (x.pending ?? []).some((p) => p !== o) ? x.section : null } : x));

  const save = () => {
    if (!d) return;
    if (d.langCount < 1) { alert("필요 언어 수는 1 이상이어야 합니다."); return; }
    const rec = saveLangGroup({ ...d, company: company.name });
    logActivity("company", `확장 언어 그룹 ${g ? "수정" : "등록"} · ${company.name} · ${rec.kind} S${rec.section ?? "미정"}${rec.base != null ? `/O${rec.base}` : ""} · 언어 ${rec.langCount}개 · 확장 Owner ${rec.ext.length}개${(rec.pending ?? []).length ? ` · 역할 미지정 ${(rec.pending ?? []).length}개` : ""}`, me);
  };
  const remove = () => {
    if (!g) { setD(null); return; }
    if (!confirm("확장 언어 그룹을 지울까요? SOBP 할당은 그대로 남고, 그룹 연결 · 슬롯 언어만 지워집니다.")) return;
    deleteLangGroup(g.id);
    logActivity("company", `확장 언어 그룹 삭제 · ${company.name}`, me);
    setD(null);
  };
  const COLS = "190px repeat(4, minmax(64px, 1fr))";

  return (
    <div style={card}>
      <div style={hd}>
        <b style={{ fontSize: 14 }}>확장 언어 그룹</b>
        {g
          ? <span style={{ fontSize: 11.5, color: "#0e7490", fontWeight: 700 }}>사용 · 언어 {g.langCount}개 · Owner {(g.base != null ? 1 : 0) + g.ext.length}개 지정{(g.pending ?? []).length ? ` · 역할 미지정 ${(g.pending ?? []).length}개` : ""}</span>
          : <span style={{ fontSize: 11.5, color: "#9ca3af" }}>{d ? "새 그룹" : "사용 안 함"}</span>}
        <InfoTip title="확장 언어 그룹" width={380}>
          Owner 하나에 언어 슬롯 4개입니다. 기본 Owner 가 슬롯 1~4, 확장 Owner 는 순서대로 5~8 · 9~12 … 입니다.
          <b> SOBP 맵</b>에서는 이 고객사에 영역(Owner)만 할당하고, 할당한 Owner 는 여기 <b>역할 미지정</b>으로 들어옵니다.
          아래 표에서 코드마다 <b>기본 / 확장</b> 역할을 고르고 언어를 넣습니다. 언어는 할당 전에도 미리 넣을 수 있습니다.
        </InfoTip>
        <span style={{ flex: 1 }} />
        {!d && <button type="button" onClick={() => setD(blank())} style={{ ...S.primary, padding: "5px 12px", fontSize: 12 }}>＋ 확장 언어 그룹 만들기</button>}
      </div>
      {d && (
        <>
          <div style={{ padding: "14px 18px" }}>
            {/* 그룹 기본값 — 코드 종류 · Section · 필요 언어 수 (기본 Owner 는 아래 표에서) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, alignItems: "start" }}>
              <Field label="코드 종류">
                <select value={d.kind} onChange={(e) => setD({ ...d, kind: e.target.value as CodeKind })} style={S.input}>
                  <option value="PDS2">PDS2</option>
                  <option value="PDS3">PDS3</option>
                </select>
              </Field>
              {/* Section 은 직접 넣지 않는다 — 할당받은 Owner 가 그룹에 들어올 때 정해진다(할당 전이면 미정) `PC-333` */}
              <Field label="Section">
                <div style={{ ...S.input, background: "#f9fafb", color: d.section == null ? "#9ca3af" : "#111827" }}
                  title="SOBP 맵에서 이 고객사에 처음 Owner 를 할당하면 그 Section 으로 정해집니다">
                  {d.section == null ? "SOBP 할당 때 정함" : `S${d.section}`}
                </div>
              </Field>
              <Field label="필요 언어 수">
                <input type="number" min={1} value={d.langCount} onChange={(e) => setD({ ...d, langCount: Math.max(0, Math.round(+e.target.value)) })} style={S.input} />
              </Field>
            </div>
            {/* 상태 — 역할 미지정 수 · SOBP 맵 링크 (필요한 Owner · 역할 지정 수는 보이지 않는다 `PC-339`) */}
            <div style={{ marginTop: 10, fontSize: 12, color: "#374151", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {pending.length > 0 && <span style={{ color: "#b45309" }}>역할 미지정 {pending.length}개</span>}
              <span style={{ flex: 1 }} />
              <Link href="/ownership" style={{ fontSize: 12, color: "#2563eb", textDecoration: "none" }}
                title="SOBP 맵에서 이 고객사에 Owner 를 할당하면 여기 역할 미지정으로 들어옵니다">SOBP 맵에서 영역 할당 →</Link>
            </div>
            {/* 등록한 언어 — 모든 자리의 언어를 슬롯 번호 순서로 한 줄에 `PC-334` */}
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", fontSize: 12 }}>
              <span style={{ color: "#374151", fontWeight: 700, marginRight: 2 }}>등록한 언어 {filled} / {d.langCount}</span>
              {allLangs.length === 0 && <span style={{ color: "#9ca3af" }}>아직 없음</span>}
              {allLangs.map((x) => (
                <span key={x.slot} title={x.owner != null ? `O${x.owner} · 슬롯 ${x.slot}` : `할당 전 · 슬롯 ${x.slot}`}
                  style={{ ...S.tag, fontSize: 11, background: x.owner != null ? "#ecfeff" : "#f3f4f6", color: x.owner != null ? "#0e7490" : "#6b7280" }}>
                  <span style={{ fontFamily: "ui-monospace,monospace", opacity: 0.7, marginRight: 3 }}>{x.slot}</span>{x.lang}
                </span>
              ))}
            </div>
            {/* 코드 · 역할 · 언어 — 한 표 `PC-346` */}
            <div style={{ marginTop: 12, border: "1px solid #eef0f4", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: COLS, background: "#fafbfc", fontSize: 11.5, color: "#6b7280", fontWeight: 600 }}>
                <div style={{ padding: "7px 10px", display: "flex", alignItems: "center", gap: 4 }}>
                  코드 · 역할
                  <InfoTip title="코드 · 역할 · 언어" width={360}>
                    SOBP 맵에서 이 고객사에 할당된 코드마다 <b>역할</b>(기본 = 슬롯 1~4 · 확장 1 = 5~8 · 확장 2 = 9~12 …)을 고르고 언어를 넣습니다.
                    이미 역할이 있는 코드를 다른 역할로 고르면 두 코드의 역할이 맞바뀌고, <b>언어는 코드를 따라갑니다</b>.
                    확장 중간 자리는 비울 수 없습니다(뒤 번호가 당겨지지 않게). 코드 없이 자리에 언어만 넣어 둘 수도 있습니다(할당 전).
                  </InfoTip>
                </div>
                {[1, 2, 3, 4].map((i) => <div key={i} style={{ padding: "7px 6px" }}>슬롯 {i}</div>)}
              </div>
              {visible.length === 0 && (
                <div style={{ padding: "12px", fontSize: 12, color: "#9ca3af", borderTop: "1px solid #eef0f4" }}>
                  {trows.some((r) => r.o != null) ? "등록한 언어가 없습니다. 아래 [＋ 언어 등록] 에서 코드를 골라 역할과 언어를 넣으세요." : <>할당된 코드가 없습니다. <Link href="/ownership" style={{ color: "#2563eb" }}>SOBP 맵</Link>에서 먼저 할당하세요.</>}
                </div>
              )}
              {visible.map((r) => {
                const o = r.o;
                const lastExt = r.pos >= 1 && r.pos === d.ext.length;
                const tone = r.pos === 0 ? { bg: "#eef6ff", fg: "#2563eb" } : r.pos > 0 ? { bg: "#ecfeff", fg: "#0e7490" } : { bg: "#fffbeb", fg: "#b45309" };
                return (
                  <div key={r.key} style={{ display: "grid", gridTemplateColumns: COLS, alignItems: "center", borderTop: "1px solid #eef0f4", background: r.pos < 0 ? "#fffdf5" : undefined }}>
                    <div style={{ padding: "6px 8px", display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
                      {o != null ? (
                        <>
                          {/* 코드 기준 — S · O · 역할 `PC-347` */}
                          <Sc k="S" v={r.s} small /><Sc k="O" v={o} small />
                          <select aria-label={`S${r.s}/O${o} 역할`} value={r.pos < 0 ? "" : String(r.pos)}
                            onChange={(e) => setRole(o, r.s, e.target.value === "" ? null : +e.target.value)}
                            style={{ ...S.input, padding: "3px 6px", fontSize: 12, minWidth: 0, flex: 1, background: tone.bg, color: tone.fg, fontWeight: 700 }}>
                            <option value="" disabled={r.pos >= 1 && !lastExt}>{r.pos < 0 ? "역할 선택" : "— 빼기"}</option>
                            <option value="0">기본</option>
                            {d.ext.map((_, i) => <option key={i} value={String(i + 1)}>확장 {i + 1}</option>)}
                            {r.pos < 1 && <option value={String(d.ext.length + 1)}>확장 {d.ext.length + 1}</option>}
                          </select>
                          {r.tag === "pending" && (
                            <button type="button" title="그룹에서 빼기(SOBP 할당은 그대로)" aria-label={`O${o} 그룹에서 빼기`} onClick={() => dropPending(o)}
                              style={{ border: 0, background: "none", color: "#9ca3af", cursor: "pointer", fontSize: 12, padding: "0 2px", flexShrink: 0 }}>✕</button>
                          )}
                        </>
                      ) : (
                        <>
                          {/* 코드 없이 언어만 들어 있는 자리 — 여기서 코드를 고르면 그 코드의 언어가 된다 */}
                          <select aria-label={`${roleText(r.pos)} 코드 선택`} value=""
                            onChange={(e) => { const c = trows.find((x) => x.o != null && String(x.o) === e.target.value); if (c && c.o != null) setRole(c.o, c.s, r.pos); }}
                            style={{ ...S.input, padding: "3px 6px", fontSize: 12, minWidth: 0, flex: 1, color: "#b45309", borderColor: "#fde68a" }}>
                            <option value="">코드 선택</option>
                            {trows.filter((x) => x.o != null && x.pos < 0).map((x) => <option key={x.key} value={String(x.o)}>S{x.s} · O{x.o}</option>)}
                          </select>
                          <span style={{ ...S.tag, fontSize: 9.5, background: tone.bg, color: tone.fg, fontWeight: 700, flexShrink: 0 }}>{roleText(r.pos)}</span>
                        </>
                      )}
                    </div>
                    {four(d.langs[r.key]).map((v, i) => (
                      <div key={i} style={{ padding: "5px 6px", display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 10.5, color: "#9ca3af", fontFamily: "ui-monospace,monospace", minWidth: 16, textAlign: "right" }}>{r.pos >= 0 ? r.pos * 4 + 1 + i : "–"}</span>
                        <input value={v} placeholder="지정된 언어 없음" aria-label={`${o != null ? `S${r.s}/O${o}` : roleText(r.pos)} 슬롯 ${r.pos >= 0 ? r.pos * 4 + 1 + i : i + 1} 언어`}
                          onChange={(e) => setLang(r.key, i, e.target.value)} style={{ ...S.input, padding: "5px 7px", fontSize: 12 }} />
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
            {/* ＋ 언어 등록 — 표에 없는 코드를 골라 역할과 함께 넣는다(S · O → 확장 2 등) `PC-338` `PC-347` */}
            {restCodes.length > 0 && (
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 12 }}>
                <b style={{ color: "#374151" }}>＋ 언어 등록</b>
                <select value={addCode} aria-label="언어 등록할 코드"
                  onChange={(e) => {
                    setAddCode(e.target.value);
                    const c = restCodes.find((x) => x.key === e.target.value);
                    setAddRole(c ? (c.pos >= 0 ? c.pos : firstFree) : null);
                  }}
                  style={{ ...S.input, width: "auto", padding: "4px 8px", fontSize: 12 }}>
                  <option value="">코드 선택</option>
                  {/* 코드만 보인다 — 역할은 옆 [역할] 셀렉트에서(이미 역할이 있으면 그 값이 미리 채워진다) `PC-355` */}
                  {restCodes.map((r) => <option key={r.key} value={r.key}>S{r.s} · O{r.o}</option>)}
                </select>
                <select value={addRole == null ? "" : String(addRole)} aria-label="언어 등록할 역할" disabled={!addCode}
                  onChange={(e) => setAddRole(e.target.value === "" ? null : +e.target.value)}
                  style={{ ...S.input, width: "auto", padding: "4px 8px", fontSize: 12 }}>
                  <option value="">역할</option>
                  <option value="0">기본</option>
                  {d.ext.map((_, i) => <option key={i} value={String(i + 1)}>확장 {i + 1}</option>)}
                  <option value={String(d.ext.length + 1)}>확장 {d.ext.length + 1}</option>
                </select>
                <button type="button" disabled={!addCode || addRole == null}
                  onClick={() => {
                    const c = restCodes.find((x) => x.key === addCode);
                    if (!c || c.o == null || addRole == null) return;
                    setShown((sh) => [...new Set([...sh, c.key])]);
                    if (c.pos !== addRole) setRole(c.o, c.s, addRole);
                    setAddCode(""); setAddRole(null);
                  }}
                  style={{ ...S.primary, padding: "4px 12px", fontSize: 12, ...(!addCode || addRole == null ? { opacity: 0.5, cursor: "not-allowed" } : {}) }}>추가</button>
                <InfoTip title="언어 등록" width={320}>
                  표에는 언어를 등록한 코드만 보입니다. 남은 코드는 여기서 <b>코드(S · O)와 역할</b>(기본 · 확장 k)을 골라 [추가] 한 뒤 언어를 넣고 저장하세요.
                  이미 다른 코드가 있는 역할을 고르면 두 코드의 역할이 맞바뀝니다.
                </InfoTip>
              </div>
            )}
          </div>
          <div style={ft}>
            {dirty && <span style={{ fontSize: 12, color: "#b45309" }}>● 저장하지 않은 변경이 있습니다</span>}
            <span style={{ flex: 1 }} />
            <button type="button" onClick={remove} style={{ ...S.ghost, color: "#dc2626" }}>{g ? "그룹 삭제" : "만들기 취소"}</button>
            <button type="button" onClick={() => setD(g ? { ...g } : null)} style={S.ghost} disabled={!dirty}>취소</button>
            <button type="button" onClick={save} style={S.primary}>저장</button>
          </div>
        </>
      )}
    </div>
  );
}
