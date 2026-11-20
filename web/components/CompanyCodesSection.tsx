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
// SOBP 맵에서는 영역(Owner)만 할당 → 그룹에 「역할 미지정」으로 들어온다 → 줄마다 Owner 를 골라 역할을 준다.
// 줄의 언어는 그 줄(자리)에 붙어 있다 — Owner 를 바꿔도 언어는 그 줄에 남는다.
function LangGroupCard({ company, allocated, me }: { company: Company; allocated: { s: number; o: number; k?: string }[]; me: string }) {
  const g = groupOfCompany(company.id);
  const blank = (): Draft => ({ companyId: company.id, company: company.name, kind: "PDS2", section: null, base: null, langCount: 4, ext: [], pending: [], langs: {} });
  const [d, setD] = useState<Draft | null>(g ? { ...g } : null);
  const dirty = !!d && JSON.stringify(d) !== JSON.stringify(g ? { ...g } : null);
  const pending = d?.pending ?? [];
  // 언어 줄 — 필요한 Owner 수만큼(할당 전 자리 포함) `PC-334`
  const rows = d ? langRows(d) : [];
  // 표에는 **언어를 등록한 줄만** 보인다 — 언어가 없는 줄(지정된 언어 없음)은 감추고, [＋ 언어 등록] 에서 골라 꺼낸다 `PC-338`
  // 꺼낸 줄은 이 화면에서 계속 보이고, 언어를 넣고 저장하면 목록에 남는다(언어 없이 저장하면 다시 감춰진다)
  const [shownPos, setShownPos] = useState<number[]>([]);
  const hasLang = (key: string) => !!d && four(d.langs[key]).some((x) => x.trim());
  const visible = rows.filter((r) => hasLang(r.key) || shownPos.includes(r.pos));
  const hiddenRows = rows.filter((r) => !visible.includes(r));
  const rowLabel = (r: { pos: number; owner: number | null }) => `${r.pos === 0 ? "기본" : `확장 ${r.pos}`} · ${r.owner != null ? `O${r.owner}` : "할당 전"} · 슬롯 ${r.pos * 4 + 1}~${r.pos * 4 + 4}`;
  // 등록한 언어 전체 — 슬롯 번호 순서로 한 줄에 모아 본다 `PC-334`
  const allLangs = d ? rows.flatMap((r) => four(d.langs[r.key]).map((l, i) => ({ slot: r.start + i, lang: l.trim(), owner: r.owner }))).filter((x) => x.lang) : [];
  const filled = allLangs.length;
  // 줄에 고를 수 있는 Owner — 역할 미지정 + 이 고객사가 할당받았지만 그룹 밖인 Owner(Section 이 정해졌으면 그 Section 만)
  const inGroup = new Set(d ? [...(d.base != null ? [d.base] : []), ...d.ext] : []);
  const cands = d ? [
    ...pending.map((o) => ({ s: d.section ?? allocated.find((a) => a.o === o)?.s ?? 0, o, tag: "역할 미지정" })),
    ...allocated.filter((a) => (d.section == null || a.s === d.section) && !inGroup.has(a.o) && !pending.includes(a.o)).map((a) => ({ s: a.s, o: a.o, tag: "그룹 밖" })),
  ] : [];

  const setLang = (key: string, i: number, v: string) => setD((x) => {
    if (!x) return x;
    const row = four(x.langs[key]); row[i] = v;
    return { ...x, langs: { ...x.langs, [key]: row } };
  });
  // 줄(pos)의 Owner 바꾸기 — null = 할당 전으로. 원래 Owner 는 역할 미지정으로 돌아가고, 언어는 줄에 남는다
  const assign = (pos: number, pick: { s: number; o: number } | null) => setD((x) => {
    if (!x) return x;
    const ext = [...x.ext];
    let base = x.base;
    const pend = [...(x.pending ?? [])];
    const langs = { ...x.langs };
    const old = pos === 0 ? base : ext[pos - 1] ?? null;
    const oldKey = old != null ? String(old) : `#${pos}`;
    const rowLangs = langs[oldKey]; delete langs[oldKey];
    if (old != null && !pend.includes(old)) pend.push(old);
    let newKey = `#${pos}`;
    if (pick) {
      const i = pend.indexOf(pick.o); if (i >= 0) pend.splice(i, 1);
      if (pos === 0) base = pick.o;
      else if (pos - 1 < ext.length) ext[pos - 1] = pick.o;
      else ext.push(pick.o);
      newKey = String(pick.o);
    } else if (pos === 0) base = null;
    else ext.splice(pos - 1, 1);
    if (rowLangs) langs[newKey] = rowLangs;
    const any = base != null || ext.length > 0 || pend.length > 0;
    return { ...x, base, ext, pending: pend, langs, section: pick ? (x.section ?? pick.s) : any ? x.section : null };
  });
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
  const COLS = "150px repeat(4, minmax(64px, 1fr))";

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
          아래 표에서 줄마다 Owner 를 골라 <b>기본 / 확장</b> 역할을 정하고 언어를 넣습니다. 언어는 할당 전에도 미리 넣을 수 있습니다.
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
            {/* 등록한 언어 — 모든 줄의 언어를 슬롯 번호 순서로 한 줄에 `PC-334` */}
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
            {/* 줄마다 Owner(역할) + 슬롯 4칸 — 필요한 Owner 수만큼 */}
            <div style={{ marginTop: 12, border: "1px solid #eef0f4", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: COLS, background: "#fafbfc", fontSize: 11.5, color: "#6b7280", fontWeight: 600 }}>
                <div style={{ padding: "7px 10px" }}>역할 · Owner</div>
                {[1, 2, 3, 4].map((i) => <div key={i} style={{ padding: "7px 6px" }}>슬롯 {i}</div>)}
              </div>
              {visible.length === 0 && (
                <div style={{ padding: "12px", fontSize: 12, color: "#9ca3af", borderTop: "1px solid #eef0f4" }}>
                  등록한 언어가 없습니다. 아래 [＋ 언어 등록] 에서 자리를 골라 언어를 넣으세요.
                </div>
              )}
              {visible.map((r) => {
                const o = r.owner;
                const isBase = r.pos === 0;
                // 확장 줄은 앞 줄부터 채운다 — 번호(슬롯) 순서가 비지 않게. 할당 전으로 되돌리기는 기본 · 마지막 확장만
                const reach = isBase || r.pos - 1 <= d.ext.length;
                const canClear = o != null && (isBase || r.pos === d.ext.length);
                return (
                  <div key={r.key} style={{ display: "grid", gridTemplateColumns: COLS, alignItems: "center", borderTop: "1px solid #eef0f4" }}>
                    <div style={{ padding: "6px 8px", display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ ...S.tag, fontSize: 9.5, background: isBase ? "#eef6ff" : "#ecfeff", color: isBase ? "#2563eb" : "#0e7490", fontWeight: 700, flexShrink: 0 }}>{isBase ? "기본" : `확장 ${r.pos}`}</span>
                      <select aria-label={`${isBase ? "기본" : `확장 ${r.pos}`} Owner`} disabled={!reach}
                        title={!reach ? "앞 확장 줄부터 채웁니다" : undefined}
                        value={o != null ? String(o) : ""}
                        onChange={(e) => {
                          if (e.target.value === "") { assign(r.pos, null); return; }
                          const c = cands.find((x) => String(x.o) === e.target.value);
                          if (c) assign(r.pos, c);
                        }}
                        style={{ ...S.input, padding: "4px 6px", fontSize: 12, minWidth: 0, color: o != null ? "#111827" : "#9ca3af" }}>
                        <option value="" disabled={o != null && !canClear}>할당 전</option>
                        {o != null && <option value={String(o)}>O{o}</option>}
                        {cands.map((c) => <option key={c.o} value={String(c.o)}>O{c.o} · {c.tag}</option>)}
                      </select>
                    </div>
                    {four(d.langs[r.key]).map((v, i) => (
                      <div key={i} style={{ padding: "5px 6px", display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 10.5, color: "#9ca3af", fontFamily: "ui-monospace,monospace", minWidth: 16, textAlign: "right" }}>{r.start + i}</span>
                        <input value={v} placeholder="지정된 언어 없음" aria-label={`${o != null ? `O${o}` : `${isBase ? "기본" : `확장 ${r.pos}`}(할당 전)`} 슬롯 ${r.start + i} 언어`}
                          onChange={(e) => setLang(r.key, i, e.target.value)} style={{ ...S.input, padding: "5px 7px", fontSize: 12 }} />
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
            {/* ＋ 언어 등록 — 감춰진 줄(언어 없음) 중 하나를 골라 표에 꺼낸다 `PC-338` */}
            {hiddenRows.length > 0 && (
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 12 }}>
                <select value="" aria-label="언어 등록할 자리"
                  onChange={(e) => { if (e.target.value !== "") setShownPos((p) => [...p, +e.target.value]); }}
                  style={{ ...S.input, width: "auto", padding: "4px 8px", fontSize: 12 }}>
                  <option value="">＋ 언어 등록</option>
                  {hiddenRows.map((r) => <option key={r.key} value={r.pos}>{rowLabel(r)}</option>)}
                </select>
                <InfoTip title="언어 등록" width={320}>
                  표에는 언어를 등록한 자리만 보입니다. 언어가 없는 자리(지정된 언어 없음)는 여기서 골라 표에 꺼낸 뒤 언어를 넣고 저장하면 목록에 남습니다.
                </InfoTip>
              </div>
            )}
            {/* 역할 미지정 — SOBP 맵에서 할당만 하고 아직 줄에 안 넣은 Owner */}
            {pending.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 12 }}>
                <span style={{ color: "#b45309", fontWeight: 700 }}>역할 미지정</span>
                {pending.map((p) => (
                  <span key={p} style={{ display: "inline-flex", alignItems: "center", gap: 4, border: "1px solid #fde68a", background: "#fffbeb", borderRadius: 6, padding: "2px 4px 2px 6px" }}>
                    <Sc k="O" v={p} small />
                    <button type="button" title="그룹에서 빼기(SOBP 할당은 그대로)" aria-label={`O${p} 그룹에서 빼기`} onClick={() => dropPending(p)}
                      style={{ border: 0, background: "none", color: "#9ca3af", cursor: "pointer", fontSize: 12, padding: "0 2px" }}>✕</button>
                  </span>
                ))}
                <span style={{ color: "#6b7280" }}>위 표에서 줄마다 Owner 를 고르면 역할이 정해집니다{rows.every((r) => r.owner != null) ? " · 줄이 모자라면 필요 언어 수를 늘리세요" : ""}</span>
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
