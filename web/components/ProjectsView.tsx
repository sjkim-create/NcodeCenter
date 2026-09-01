"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { S, Field, Modal } from "./ui";
import { KindChip, Sc, SobpChips } from "./sobp";
import { codeKind, CODE_KINDS, kindLabel, type CodeKind } from "@/lib/codeKind";
import { store, useStore } from "@/lib/store";
import {
  Project, ServiceType,
  SERVICE, serviceLabel, GRADES, projectCodes, projectUsed, projectServices, usesService,
} from "@/lib/customerData";
import { EDIT_BOOKS } from "@/lib/codeUsage";
import { codesOfCompany, isCommonCodeCompany, type CommonCode } from "@/lib/commonCodes";
import { membersOf, hydrateMembers, useCommonMembers } from "@/lib/commonMembers";
import { logActivity } from "@/lib/activityStore";

type Draft = Omit<Project, "id">;

// 고객사별 코드 종류 — 좌표(SOBP) 속성으로 판별 (PDS3 · PDS2 · PDS4 · OID). 옛 IDS(A) = OID 동일 `PC-035`
const KIND_BY_NAME: Record<string, CodeKind[]> = EDIT_BOOKS.reduce((m, r) => {
  const kd = codeKind(r.k, r.sec);
  const cur = m[r.cust] ?? [];
  if (!cur.includes(kd)) m[r.cust] = [...cur, kd];
  return m;
}, {} as Record<string, CodeKind[]>);
const PDS_FILTERS = [{ v: "ALL" as const, label: "전체" },
  ...CODE_KINDS.map((k) => ({ v: k.v, label: k.label }))];
// 고객사 카드 부제용 짧은 사용 서비스명
const SHORT_SVC: Record<string, string> = { CASTERN: "casterN", FORMSOLUTION: "폼솔루션", NONE: "서비스 없음" };
const shortSvc = (v: string) => SHORT_SVC[v] ?? serviceLabel(v as ServiceType);

export default function ProjectsView() {
  const { companies, projects } = useStore();
  useEffect(() => { hydrateMembers(); }, []);
  useCommonMembers();   // 공통코드 사용 고객사(하위) 변경 시 재렌더
  const emptyDraft = (): Draft => ({ name: "", companyId: companies[0]?.id ?? 0, service: "NONE", grade: "", issued: [] });

  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<Draft>(emptyDraft);
  const [delTarget, setDelTarget] = useState<Project | null>(null);
  const [delConfirm, setDelConfirm] = useState("");
  const [toast, setToast] = useState("");
  const [selCo, setSelCo] = useState<number>(0);
  const [selP, setSelP] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [pds, setPds] = useState<"ALL" | CodeKind>("ALL");
  const [flag, setFlag] = useState<"ALL" | "편집" | "코드발급">("ALL");
  const [svc, setSvc] = useState<"ALL" | ServiceType>("ALL");
  const [memberQ, setMemberQ] = useState("");            // 하위 고객사 검색
  const [selMember, setSelMember] = useState<string | null>(null);   // 선택된 하위 고객사
  useEffect(() => { setSelMember(null); setMemberQ(""); }, [selP, selCo]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 4000); };
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setForm((f) => ({ ...f, [k]: v }));
  const companyName = (id: number) => companies.find((c) => c.id === id)?.name ?? "-";

  const openEdit = (p: Project) => { setForm({ ...p, issued: p.issued.map((b) => ({ ...b })) }); setEditing(p); };
  const close = () => setEditing(null);

  // 발급 SOBP 내역 (view only — 발급/수정은 [Ncode 예약·할당]에서 처리)
  const draftCodes = form.issued.reduce((s, b) => s + (b.codes || 0), 0);

  const save = () => {
    if (!form.name.trim()) { flash("프로젝트명은 필수입니다."); return; }
    if (!form.companyId) { flash("고객사를 선택하세요."); return; }
    const id = store.upsertProject({ ...form, id: editing?.id ?? 0 });
    if (!editing?.id) logActivity("project", `${companyName(form.companyId)} / ${form.name}`);
    flash(editing?.id ? `수정됨 · ${form.name}` : `등록됨 · ${companyName(form.companyId)} / ${form.name}`);
    if (!editing?.id) setEditing({ ...form, id } as Project);
    else setEditing(null);
  };

  const confirmDelete = () => {
    if (!delTarget) return;
    const n = projectCodes(delTarget);
    store.deleteProject(delTarget.id);
    flash(`삭제됨 · ${delTarget.name} · 발급 코드 ${n.toLocaleString()}건 reset`);
    setDelTarget(null); setDelConfirm("");
  };

  const curCo = companies.find((c) => c.id === selCo) ?? companies[0];
  const kindsOf = (name: string) => KIND_BY_NAME[name] ?? [];
  // 편집 플래그 = casterN 서비스와 동일 기준(편집 데이터/심볼 보유) — 뱃지⇔사용서비스 일치
  const isEditing = (p: Project) =>
    usesService(p, "CASTERN") || !!p.editing || (p.symbols ?? 0) > 0;
  // 공통(커먼)코드 대장 프로젝트 → 이 프로젝트가 대표하는 공통코드 (하위 사용 고객사 노출용)
  const commonCodeOfProject = (p: Project): CommonCode | undefined => {
    const iss = p.issued[0];
    const cname = companyName(p.companyId);
    if (!iss || !isCommonCodeCompany(cname)) return undefined;
    const codes = codesOfCompany(cname);
    return codes.find((c) => c.k === (iss.kind ?? "N") && c.s === iss.section && c.o === iss.owner) ?? codes[0];
  };
  // 필터(PDS·편집여부)를 프로젝트 단위로 적용 — 집계·카드 수치가 필터를 따라간다
  const projKind = (p: Project) => codeKind(p.issued[0]?.kind, p.issued[0]?.section ?? -1);
  const matchProject = (p: Project) =>
    (pds === "ALL" || projKind(p) === pds) &&
    (flag === "ALL" || (flag === "편집" ? isEditing(p) : !isEditing(p))) &&
    (svc === "ALL" || usesService(p, svc));
  const projectsOf = (cid: number) => projects.filter((p) => p.companyId === cid && matchProject(p));

  const coList = companies
    .filter((c) => (pds === "ALL" && flag === "ALL" && svc === "ALL") || projectsOf(c.id).length > 0)
    .filter((c) => (q ? c.name.toLowerCase().includes(q.toLowerCase()) : true))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));   // 고객사명 오름차순(한글·영어)

  // 필터 결과 기준 집계
  const shownProjects = coList.flatMap((c) => projectsOf(c.id));
  const totalAlloc = shownProjects.reduce((s2, r) => s2 + projectCodes(r), 0);
  const totalUsed = shownProjects.reduce((s2, r) => s2 + projectUsed(r), 0);
  const isFiltered = pds !== "ALL" || flag !== "ALL" || svc !== "ALL" || !!q;

  const coProjects = projectsOf(curCo?.id ?? -1);
  const proj = coProjects.find((p) => p.id === selP) ?? null;

  return (
    <div style={{ padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12, gap: 10, flexWrap: "wrap" }}>
        <p style={{ margin: 0, color: "#6b7280", fontSize: 12.5 }}>
          고객사 <b style={{ color: "#111827" }}>{coList.length.toLocaleString()}</b> · 프로젝트 <b style={{ color: "#111827" }}>{shownProjects.length.toLocaleString()}</b>
          {" · "}발급 코드 <b style={{ color: "#2563eb" }}>{totalAlloc.toLocaleString()}</b> · 실등록 <b style={{ color: "#0f766e" }}>{totalUsed.toLocaleString()}</b>
          {isFiltered
            ? <span style={{ color: "#2563eb" }}> · 필터 적용 (전체 {companies.length}곳 / {projects.length}건)</span>
            : <span style={{ color: "#9ca3af" }}> · 할당된 코드를 업체·서비스별로 조회 (발급은 [Ncode 예약·할당])</span>}
        </p>
        <div style={{ flex: 1 }} />
        <button onClick={() => { if (confirm("테스트 데이터를 초기화할까요? (엑셀 시드로 복원)")) store.reset(); }} style={S.ghost}>초기화</button>
      </div>

      {toast && <div style={S.toast}>{toast}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "280px 250px 1fr", gap: 12, alignItems: "start" }}>
        {/* 고객사 카드 */}
        <div style={{ ...S.card, padding: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>고객사 선택</div>
          <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
            {PDS_FILTERS.map((f) => (
              <button key={f.v} onClick={() => { setPds(f.v); setSelP(null); }} style={pdsChip(pds === f.v)}>{f.label}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
            {(["ALL", "편집", "코드발급"] as const).map((f) => (
              <button key={f} onClick={() => { setFlag(f); setSelP(null); }} style={pdsChip(flag === f)}>{f === "ALL" ? "전체" : f}</button>
            ))}
          </div>
          <select value={svc} onChange={(e) => { setSvc(e.target.value as "ALL" | ServiceType); setSelP(null); }}
            style={{ ...S.input, marginBottom: 8, fontSize: 11.5, padding: "6px 8px" }} title="사용 서비스로 검색">
            <option value="ALL">사용 서비스 · 전체</option>
            {SERVICE.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
          </select>
          <div style={{ position: "relative", marginBottom: 8 }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="고객사 검색" style={{ ...S.input, paddingRight: 28 }} />
            {q && <button onClick={() => setQ("")} title="검색어 지우기" style={clearBtn}>×</button>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: "calc(100vh - 230px)", overflowY: "auto" }}>
            {coList.map((c) => {
              const ps = projectsOf(c.id);
              const codes = ps.reduce((s2, p) => s2 + projectCodes(p), 0);
              const svcs = [...new Set(ps.flatMap((p) => projectServices(p)))].sort((a, b) => (a === "NONE" ? 1 : 0) - (b === "NONE" ? 1 : 0));
              const on = c.id === (curCo?.id ?? -1);
              return (
                <button key={c.id} onClick={() => { setSelCo(c.id); setSelP(null); }} style={{ ...cardBtn(on), ...(c.closed ? { opacity: 0.6 } : {}) }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: on ? "#1d4ed8" : "#111827", display: "flex", alignItems: "center", gap: 6 }}>
                    {c.name}{c.closed && <span style={{ ...S.tag, fontSize: 9, background: "#f3f4f6", color: "#6b7280", fontWeight: 700 }} title={c.closedNote || "프로젝트 종료"}>종료</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                    <span title={`프로젝트 ${ps.length}건`}>
                      {ps.length === 0 ? "서비스 없음" : svcs.map(shortSvc).join(" · ")} · 코드 {codes.toLocaleString()}
                    </span>
                    {kindsOf(c.name).map((k) => (
                      <span key={k} style={{ ...S.tag, fontSize: 9.5, background: CODE_KINDS.find((x) => x.v === k)?.bg, color: CODE_KINDS.find((x) => x.v === k)?.color, fontWeight: 700 }}>{k}</span>
                    ))}
                  </div>
                </button>
              );
            })}
            {coList.length === 0 && <div style={{ fontSize: 12, color: "#9ca3af", padding: 10, textAlign: "center" }}>결과 없음</div>}
          </div>
        </div>

        {/* 프로젝트 카드 */}
        <div style={{ ...S.card, padding: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>프로젝트 {curCo && <span style={{ color: "#9ca3af", fontWeight: 400 }}>· {curCo.name} ({coProjects.length})</span>}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: "calc(100vh - 230px)", overflowY: "auto" }}>
            {coProjects.map((p) => {
              const on = p.id === selP;
              return (
                <button key={p.id} onClick={() => setSelP(p.id)} style={cardBtn(on)}>
                  <div style={{ fontWeight: 700, fontSize: 12.5, color: on ? "#1d4ed8" : "#111827" }}>{stripSO(p.name)}</div>
                  {/* 코드 종류 + S/O 칩 */}
                  <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 4, flexWrap: "wrap" }}>
                    {soOf(p).slice(0, 4).map((a) => (
                      <span key={`${a.k}/${a.s}/${a.o}`} style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <KindChip k={a.k} sec={a.s} small />
                        <Sc k="S" name="Section" v={a.s} c="#5f8ff0" small />
                        <Sc k="O" name="Owner" v={a.o} c="#14b8a6" small />
                      </span>
                    ))}
                    {soOf(p).length > 4 && <span style={{ fontSize: 10, color: "#9ca3af" }}>+{soOf(p).length - 4}</span>}
                    {p.issued.length === 0 && <span style={{ fontSize: 10.5, color: "#d1d5db" }}>미발급</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                    {projectServices(p).map((v) => <span key={v} style={{ ...S.tag, fontSize: 9.5, marginRight: 3, ...(v === "NONE" ? { background: "#f3f4f6", color: "#6b7280" } : {}) }}>{serviceLabel(v)}</span>)}
                    {isEditing(p) && <span style={{ ...S.tag, fontSize: 9.5, background: "#ecfdf5", color: "#047857" }}>편집</span>}
                    {p.shared && <span style={{ ...S.tag, fontSize: 9.5, background: "#f3e8ff", color: "#7e22ce", fontWeight: 700 }} title="여러 고객사가 함께 쓰는 공유(커먼) 코드">공유</span>}
                  </div>
                  <div style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 3 }}>발급 {projectCodes(p).toLocaleString()}코드 · {p.issued.length}블록</div>
                </button>
              );
            })}
            {coProjects.length === 0 && <div style={{ fontSize: 12, color: "#9ca3af", padding: 10, textAlign: "center" }}>이 고객사의 프로젝트가 없습니다.</div>}
          </div>
        </div>

        {/* 발급 구성 */}
        <div style={{ ...S.card, padding: 16 }}>
          {!proj ? (
            <div style={{ color: "#9ca3af", fontSize: 13, padding: 8 }}>
              <b style={{ color: "#374151" }}>{curCo?.name ?? "고객사"}</b> — 가운데에서 프로젝트를 선택하면 <b>어떤 코드가 어떻게 발급되었는지</b>(SOBP 블록·발급일·코드 수) 확인할 수 있습니다.
            </div>
          ) : (
            <>
              {curCo?.closed && (
                <div style={{ marginBottom: 10, padding: "8px 12px", background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12.5, color: "#4b5563" }}>
                  🛑 <b>프로젝트 종료 고객사</b> — 코드 발급 이력만 보관합니다.{curCo.closedNote ? ` (${curCo.closedNote})` : ""}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{stripSO(proj.name)}</div>
                <span style={{ ...S.tag }}>{companyName(proj.companyId)}</span>
                {curCo?.closed && <span style={{ ...S.tag, background: "#f3f4f6", color: "#6b7280", fontWeight: 700 }}>종료</span>}
                {/* 코드 종류 + S/O 칩 */}
                {soOf(proj).map((a) => (
                  <span key={`${a.k}/${a.s}/${a.o}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <KindChip k={a.k} sec={a.s} />
                    <Sc k="S" name="Section" v={a.s} c="#5f8ff0" />
                    <Sc k="O" name="Owner" v={a.o} c="#14b8a6" />
                  </span>
                ))}
                {projectServices(proj).map((v) => <span key={v} style={{ ...S.tag, marginRight: 3, ...(v === "NONE" ? { background: "#f3f4f6", color: "#6b7280" } : {}) }}>{serviceLabel(v)}</span>)}
                {proj.shared && <span style={{ ...S.tag, background: "#f3e8ff", color: "#7e22ce", fontWeight: 700 }} title="여러 고객사가 함께 쓰는 공유(커먼) 코드">공유 코드</span>}
                {proj.service === "FORMSOLUTION" && proj.grade && <span style={S.tag}>{proj.grade}등급</span>}
                {isEditing(proj) && proj.editingOwner != null && (
                  <Link href={`/projects/editing?owner=${proj.editingOwner}`} style={{ textDecoration: "none" }}>
                    <span style={{ ...S.tag, background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0", cursor: "pointer" }}>✏️ 편집 {(proj.symbols ?? 0) > 0 ? `${(proj.symbols ?? 0).toLocaleString()}심볼 ` : ""}→</span>
                  </Link>
                )}
                {proj.editLinkOwner != null && (   // 예외: 편집 실적이 다른 owner에 귀속 → 그 편집으로 이동
                  <Link href={`/projects/editing?owner=${proj.editLinkOwner}`} style={{ textDecoration: "none" }}>
                    <span style={{ ...S.tag, background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0", cursor: "pointer" }} title={`편집 실적은 ${proj.editLinkLabel ?? proj.editLinkOwner}에 귀속 — 클릭하면 이동`}>✏️ 편집 → {proj.editLinkLabel ?? `owner ${proj.editLinkOwner}`}</span>
                  </Link>
                )}
                <span style={{ flex: 1 }} />
                <button onClick={() => openEdit(proj)} style={S.smallBtn}>수정</button>
                <button onClick={() => { setDelTarget(proj); setDelConfirm(""); }} style={{ ...S.smallBtn, color: "#dc2626" }}>삭제</button>
              </div>

              {/* 발급 요약 */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, margin: "14px 0" }}>
                {[["발급 코드 (B×P)", projectCodes(proj).toLocaleString(), "#2563eb"], ["실등록 페이지", projectUsed(proj).toLocaleString(), "#0f766e"], ["편집 심볼", (proj.symbols ?? 0).toLocaleString(), "#047857"], ["코드 종류", (KIND_BY_NAME[companyName(proj.companyId)] ?? []).map(kindLabel).join(" · ") || "-", "#111827"]].map((x, i) => (
                  <div key={i} style={{ border: "1px solid #eef0f4", borderRadius: 10, padding: 10 }}>
                    <div style={{ fontSize: 10.5, color: "#6b7280" }}>{x[0]}</div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: x[2] }}>{x[1]}</div>
                  </div>
                ))}
              </div>

              {/* 발급 SOBP 내역 */}
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>발급 SOBP 내역 <span style={{ color: "#9ca3af", fontWeight: 400 }}>· 어떤 코드가 어떻게 발급되었는지 (조회 전용)</span></div>
              {proj.issued.length === 0 ? (
                <div style={emptyBox}>발급 내역이 없습니다. (미발급)</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 380, overflowY: "auto", marginBottom: 12 }}>
                  {proj.issued.slice().sort((a, b) => (a.date > b.date ? 1 : -1)).map((b, i) => (
                    <div key={b.id ?? i} style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid #eef0f4", borderRadius: 10, padding: "9px 11px", background: "#fafbfc", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, color: "#9ca3af", fontFamily: "ui-monospace,monospace", minWidth: 18 }}>{i + 1}</span>
                      <SobpChipRow b={b} />
                      <span style={{ flex: 1 }} />
                      <span style={{ fontSize: 11, color: "#9ca3af", fontFamily: "ui-monospace,monospace" }}>{b.date}</span>
                      <span style={{ ...S.tag, background: "#eef6ff", color: "#2563eb" }}>
                        {(b.bookEnd - b.bookStart + 1).toLocaleString()}권 × {Math.max(0, b.pageEnd - b.pageStart + 1).toLocaleString()}p = {b.codes.toLocaleString()}
                      </span>
                      {(b.used ?? 0) > 0 && <span style={{ ...S.tag, background: "#ccfbf1", color: "#0f766e" }}>실등록 {(b.used ?? 0).toLocaleString()}p</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* 공통코드 대장 — 사용 고객사(하위) 목록: 정렬·검색·클릭 시 SOBP */}
              {(() => {
                const cc = commonCodeOfProject(proj);
                if (!cc) return null;
                const all = membersOf(cc.k, cc.s, cc.o).slice().sort((a, b) => a.name.localeCompare(b.name, "ko"));
                const nq = memberQ.trim().toLowerCase();
                const members = nq ? all.filter((m) => m.name.toLowerCase().includes(nq)) : all;
                // 선택된 하위 고객사가 쓰는 SOBP (book 단위, 이 공통코드 범위 내)
                const memRows = selMember
                  ? [...new Map(EDIT_BOOKS.filter((r) => r.k === cc.k && r.sec === cc.s && r.owner === cc.o && r.cu === selMember)
                      .map((r) => [r.book, r])).values()].sort((a, b) => a.book - b.book)
                  : [];
                const memPages = memRows.reduce((s2, r) => s2 + (r.pg || 0), 0);
                return (
                  <div style={{ ...S.card, padding: "10px 12px", marginBottom: 12, background: "#faf5ff", border: "1px solid #e9d5ff" }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "#6b21a8", marginBottom: 8, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      사용 고객사 (하위) <span style={{ color: "#7e22ce" }}>{all.length}곳</span>
                      <span style={{ ...S.tag, background: "#fff", color: "#6b21a8", border: "1px solid #e9d5ff" }}>{cc.name} · {cc.label}</span>
                      <span style={{ fontWeight: 400, color: "#9ca3af", fontSize: 11 }}>· 공통(커먼)코드를 함께 쓰는 고객사 · 편집/티켓은 이 대장으로 진행</span>
                    </div>
                    {all.length === 0 ? (
                      <div style={{ fontSize: 12, color: "#9ca3af", padding: "4px 0" }}>등록된 사용 고객사가 없습니다.</div>
                    ) : (
                      <>
                        <div style={{ position: "relative", marginBottom: 8, maxWidth: 260 }}>
                          <input value={memberQ} onChange={(e) => setMemberQ(e.target.value)} placeholder="하위 고객사 검색"
                            style={{ ...S.input, height: 30, fontSize: 12, paddingRight: 46, background: "#fff" }} />
                          <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 10.5, color: "#9ca3af" }}>{members.length}/{all.length}</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(116px, 1fr))", gap: 5, paddingRight: 2 }}>
                          {members.map((m, i) => {
                            const on = m.name === selMember;
                            return (
                              <button key={i} onClick={() => setSelMember(on ? null : m.name)} title={`${m.name} — 클릭하면 사용 SOBP 표시`}
                                style={{ display: "inline-flex", alignItems: "center", justifyContent: "space-between", gap: 4, padding: "5px 9px",
                                  background: on ? "#7e22ce" : "#fff", color: on ? "#fff" : "#4b2a6b",
                                  border: `1px solid ${on ? "#7e22ce" : "#e9d5ff"}`, borderRadius: 8, fontSize: 12, cursor: "pointer",
                                  fontWeight: on ? 700 : 400, textAlign: "left", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</span>
                                {!m.seeded && <span style={{ ...S.tag, fontSize: 8.5, background: on ? "rgba(255,255,255,.25)" : "#eef6ff", color: on ? "#fff" : "#2563eb", fontWeight: 700 }}>신규</span>}
                              </button>
                            );
                          })}
                          {members.length === 0 && <div style={{ gridColumn: "1/-1", fontSize: 12, color: "#9ca3af", padding: 8 }}>&ldquo;{memberQ}&rdquo; 일치하는 하위 고객사가 없습니다.</div>}
                        </div>
                        {/* 선택된 하위 고객사의 사용 SOBP */}
                        {selMember && (
                          <div style={{ marginTop: 10, borderTop: "1px dashed #e9d5ff", paddingTop: 10 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#6b21a8", marginBottom: 6, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <b>{selMember}</b> 사용 SOBP
                              <span style={{ color: "#7e22ce", fontWeight: 400 }}>{memRows.length}권{memPages > 0 ? ` · ${memPages.toLocaleString()}p` : ""}</span>
                              <span style={{ fontWeight: 400, color: "#9ca3af", fontSize: 11 }}>· 이 대장 코드 {cc.label} 내에서 이 고객사가 쓰는 Book</span>
                            </div>
                            {memRows.length === 0 ? (
                              <div style={{ fontSize: 12, color: "#9ca3af", padding: "4px 0" }}>이 고객사의 개별 Book 사용 기록이 없습니다. (대장 코드 {cc.label} 공유)</div>
                            ) : (
                              <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 220, overflowY: "auto" }}>
                                {memRows.map((r, i) => (
                                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid #eef0f4", borderRadius: 8, padding: "6px 10px", background: "#fff", flexWrap: "wrap" }}>
                                    <span style={{ fontSize: 11, color: "#9ca3af", fontFamily: "ui-monospace,monospace", minWidth: 16 }}>{i + 1}</span>
                                    <SobpChips k={r.k} s={r.sec} o={r.owner} b={`${r.book}`} />
                                    {r.title && <span style={{ fontSize: 12, color: "#374151" }}>{r.title}</span>}
                                    <span style={{ flex: 1 }} />
                                    {(r.pg || 0) > 0 && <span style={{ ...S.tag, background: "#eef6ff", color: "#2563eb" }}>{(r.pg || 0).toLocaleString()}p</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>

      {/* 등록/수정 — 기본 정보 + 발급 SOBP (업무 메모 없음: 고객사 관리에서 관리) */}
      {editing && (
        <Modal onClose={close} title={editing.id ? "프로젝트 수정" : "프로젝트 등록"} width={720}>
          <div>
            <div style={colBox}>
              <div style={colHead}>기본 정보</div>
              <div style={S.grid2}>
                <Field label="프로젝트명 *"><input style={S.input} value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
                <Field label="고객사 (업체)">
                  <select style={S.input} value={form.companyId} onChange={(e) => set("companyId", +e.target.value)}>
                    {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="사용 서비스">
                  <select style={S.input} value={form.service} onChange={(e) => set("service", e.target.value as ServiceType)}>
                    {SERVICE.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
                  </select>
                </Field>
                {form.service === "FORMSOLUTION" && (
                  <Field label="등급 (폼솔루션)">
                    <select style={S.input} value={form.grade} onChange={(e) => set("grade", e.target.value)}>
                      <option value="">미지정</option>
                      {GRADES.map((g) => <option key={g} value={g}>{g} 등급</option>)}
                    </select>
                  </Field>
                )}
              </div>
              {form.service === "NONE" && (
                <div style={{ ...emptyBox, marginTop: 10, color: "#6b7280" }}>서비스 없이 <b>코드만 발급</b>받는 프로젝트입니다.</div>
              )}
              <div style={secHead}>발급 SOBP 내역 <span style={{ color: "#9ca3af", fontWeight: 400 }}>· 조회 전용 (발급은 [Ncode 예약·할당])</span>
                <span style={{ marginLeft: 8, color: "#2563eb", fontFamily: "ui-monospace,monospace" }}>합계 {draftCodes.toLocaleString()}코드</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflow: "auto" }}>
                {form.issued.length === 0 && <div style={emptyBox}>발급 내역이 없습니다. (미발급)</div>}
                {form.issued.map((b) => (
                  <div key={b.id} style={{ border: "1px solid #eef0f4", borderRadius: 10, padding: "10px 12px", background: "#fafbfc" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <SobpChipRow b={b} />
                      <span style={{ flex: 1 }} />
                      <span style={{ color: "#9ca3af", fontSize: 11, fontFamily: "ui-monospace,monospace" }}>{b.date}</span>
                      <span style={S.tag}>코드 {b.codes.toLocaleString()}건</span>
                    </div>
                  </div>
                ))}
                {form.issued.length > 0 && (
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>※ S=Section · O=Owner · B=Book · P=Page · 코드 수 = 발급 Ncode 개수(페이지 1장 = 1코드). 발급 추가·수정은 현재 숨김 상태.</div>
                )}
              </div>
            </div>

          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
            <button onClick={close} style={S.ghost}>{editing.id ? "닫기" : "취소"}</button>
            <button onClick={save} style={S.primary}>{editing.id ? "저장" : "등록"}</button>
          </div>
        </Modal>
      )}

      {/* 삭제 경고 */}
      {delTarget && (
        <Modal onClose={() => setDelTarget(null)} title="⚠ 프로젝트 삭제 — 신중히 확인하세요">
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "14px 16px", fontSize: 13, color: "#991b1b", lineHeight: 1.7 }}>
            <b>{companyName(delTarget.companyId)} / {delTarget.name}</b> 을(를) 삭제합니다.<br />
            • 삭제 시 <b>발급 코드 {projectCodes(delTarget).toLocaleString()}건이 reset</b>됩니다(회수).<br />
            • 되돌릴 수 없습니다. (고객사와 고객사 업무요청 메모는 유지)
          </div>
          <div style={{ marginTop: 14, fontSize: 12.5, color: "#374151" }}>확인을 위해 프로젝트명 <b>{delTarget.name}</b> 을(를) 입력하세요:</div>
          <input style={{ ...S.input, marginTop: 6 }} value={delConfirm} onChange={(e) => setDelConfirm(e.target.value)} placeholder={delTarget.name} />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button onClick={() => setDelTarget(null)} style={S.ghost}>취소</button>
            <button onClick={confirmDelete} disabled={delConfirm.trim() !== delTarget.name}
              style={{ ...S.danger, ...(delConfirm.trim() !== delTarget.name ? { opacity: 0.5, cursor: "not-allowed" } : {}) }}>삭제 확정 (코드 reset)</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// SOBP를 S/O/B/P 색상 칩으로 표시 (목록·수정 공용)
// 프로젝트명 끝의 "· S3/O1022" 표기 제거 — 옆에 S/O 칩으로 표시하므로 중복
const stripSO = (name: string) => name.replace(/\s*[·・|/-]?\s*S\s*\d+\s*\/\s*O\s*\d+\s*$/i, "").trim() || name;

// 프로젝트가 발급받은 S/O 목록 (중복 제거 · 코드 순)
const soOf = (p: { issued: { kind?: string; section: number; owner: number }[] }) => {
  const m = new Map<string, { k: string; s: number; o: number }>();
  p.issued.forEach((b) => { const k = b.kind ?? "N"; m.set(`${k}/${b.section}/${b.owner}`, { k, s: b.section, o: b.owner }); });
  return [...m.values()].sort((a, b) => a.s - b.s || a.o - b.o);
};

function SobpChipRow({ b }: { b: { kind?: string; section: number; owner: number; bookStart: number; bookEnd: number; pageStart: number; pageEnd: number } }) {
  return (
    <SobpChips k={b.kind ?? "N"} s={b.section} o={b.owner} b={`${b.bookStart}~${b.bookEnd}`} p={`${b.pageStart}~${b.pageEnd}`} />
  );
}

const secHead: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151", fontWeight: 700, margin: "18px 0 8px" };
const emptyBox: React.CSSProperties = { fontSize: 12, color: "#9ca3af", padding: "10px 12px", background: "#fafbfc", border: "1px dashed #e5e7eb", borderRadius: 8 };
const clearBtn: React.CSSProperties = {
  position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
  border: 0, background: "none", color: "#9ca3af", fontSize: 16, lineHeight: 1, cursor: "pointer", padding: "0 4px",
};
const pdsChip = (on: boolean): React.CSSProperties => ({
  flex: 1, fontSize: 10.5, padding: "4px 2px", borderRadius: 7, cursor: "pointer", whiteSpace: "nowrap",
  border: on ? "1px solid #93c5fd" : "1px solid #e5e7eb", background: on ? "#eef6ff" : "#fff",
  color: on ? "#2563eb" : "#6b7280", fontWeight: on ? 700 : 400,
});
const cardBtn = (on: boolean): React.CSSProperties => ({ display: "block", width: "100%", textAlign: "left", border: `1px solid ${on ? "#93c5fd" : "#eef0f4"}`, background: on ? "#f5f9ff" : "#fff", borderRadius: 10, padding: "9px 11px", cursor: "pointer" });
const colBox: React.CSSProperties = { border: "1px solid #eef0f4", borderRadius: 10, padding: 16, background: "#fff" };
const colHead: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #eef0f4" };
