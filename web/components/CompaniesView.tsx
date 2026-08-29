"use client";

// 고객사 관리 — MEM-01 목록 / MEM-02 등록·상세수정
// 목록에서 [＋ 고객사 등록] → /companies/new, 행을 누르면 /companies/{id} 상세·수정.
// 등록·수정은 모달이 아니라 별도 페이지다(계정 발급·Key 관리와 같은 구조).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { S, Field, Modal, AutoTextarea, BLUE } from "./ui";
import { store, useStore } from "@/lib/store";
import { useAuth, currentUser } from "@/lib/authStore";
import { logActivity } from "@/lib/activityStore";
import { Company, CompanyDoc, WorkKind, WorkLog, projectCodes, nextId } from "@/lib/customerData";
import { SOUND_ITEMS, PEN_ITEMS, rateMapOf, customRateCount, type RateItem } from "@/lib/pricing";
import { COMMON_CODES, codeKey, codesOfCompany, isCommonCodeCompany, type CommonCode } from "@/lib/commonCodes";
import { codesOfMember, addMember, removeMember, hydrateMembers, useCommonMembers } from "@/lib/commonMembers";

type Draft = Omit<Company, "id">;
const EMPTY: Draft = { name: "", manager: "", contact: "", address: "", bizNo: "", bankName: "", accountNo: "", taxEmail: "", docs: [] };
const KIND_BG: Record<string, string> = { 요청: "#fef3c7", 처리: "#dcfce7", 메모: "#eef2f7" };
const KIND_FG: Record<string, string> = { 요청: "#92400e", 처리: "#166534", 메모: "#475569" };

type LogDraft = { id: number | null; kind: WorkKind; content: string; projectId: number | null };
const EMPTY_LOG: LogDraft = { id: null, kind: "요청", content: "", projectId: null };

// 회사 분류 — 상위(공통코드 보유 대장) / 하위(공통코드 사용=멤버십 귀속) / 단독
const memberCodesOf = (name: string): CommonCode[] =>
  codesOfMember(name).map((k) => COMMON_CODES.find((c) => codeKey(c) === k)).filter(Boolean) as CommonCode[];
const isHolderCo = (name: string) => isCommonCodeCompany(name);
const isMemberCo = (name: string) => !isHolderCo(name) && memberCodesOf(name).length > 0;

/* ── MEM-01 고객사 목록 ─────────────────────────────────────────── */
export default function CompaniesView() {
  const router = useRouter();
  const { companies, projects, logs } = useStore();
  const [delTarget, setDelTarget] = useState<Company | null>(null);
  const [toast, setToast] = useState("");
  const [q, setQ] = useState("");   // 업체 검색
  const [classFilter, setClassFilter] = useState<"" | "holder" | "member" | "solo">("");   // 구분 필터: 상위/하위/단독
  const [sortDir, setSortDir] = useState<0 | 1 | -1>(1);  // 업체명 정렬: 1 오름(기본) / -1 내림
  useEffect(() => { hydrateMembers(); }, []);
  useCommonMembers();   // 멤버십(하위 귀속) 변경 시 재렌더

  // 업체명·담당자·연락처·사업자번호·주소로 검색
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");
  const classOf = (name: string): "holder" | "member" | "solo" => isHolderCo(name) ? "holder" : isMemberCo(name) ? "member" : "solo";
  const shown = companies
    .filter((c) => (q ? norm(`${c.name} ${c.manager} ${c.contact} ${c.bizNo} ${c.address}`).includes(norm(q)) : true))
    .filter((c) => (classFilter ? classOf(c.name) === classFilter : true));
  const toggleSort = () => setSortDir((d) => (d === -1 ? 1 : -1));

  // 페이지네이션 (편집 프로젝트 목록과 동일 · 기본 50건씩)
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  useEffect(() => { setPage(1); }, [q, classFilter, sortDir]);
  // 이름 기준 정렬 (하위 고객사도 정식 회사 레코드라 같은 목록에 섞여 노출)
  const dir = sortDir === -1 ? -1 : 1;
  const allRows = shown
    .map((c) => ({ kind: "co" as const, c }))
    .sort((a, b) => a.c.name.localeCompare(b.c.name, "ko") * dir);
  const totalPages = Math.max(1, Math.ceil(allRows.length / perPage));
  const curPage = Math.min(page, totalPages);
  const pageRows = allRows.slice((curPage - 1) * perPage, curPage * perPage);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 4000); };
  const logCount = (cid: number) => logs.filter((l) => l.companyId === cid).length;

  return (
    <div style={{ padding: "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <p style={{ margin: 0, color: "#6b7280", fontSize: 13 }}>
          업체(고객사) 마스터 · 사업자/계좌/서류/업무 원장. 행을 클릭하면 상세·수정 화면으로 이동합니다. 고객사 {companies.length}곳 · 프로젝트 {projects.length}건
        </p>
        <div style={{ flex: 1 }} />
        <div style={{ position: "relative" }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="업체명·담당자·사업자번호 검색"
            style={{ ...S.input, width: 240, paddingRight: 26 }} />
          {q && <button onClick={() => setQ("")} title="검색어 지우기"
            style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", border: 0, background: "none", color: "#9ca3af", cursor: "pointer", fontSize: 15, lineHeight: 1 }}>×</button>}
        </div>
        <button onClick={() => { if (confirm("테스트 데이터를 초기화할까요? (엑셀 시드로 복원)")) store.reset(); }} style={S.ghost}>초기화</button>
        <Link href="/companies/new" style={{ ...S.primary, textDecoration: "none" }}>＋ 고객사 등록</Link>
      </div>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {(q || classFilter) && <span>{q ? "검색 " : ""}<b style={{ color: "#111827" }}>{allRows.length.toLocaleString()}</b>건 · </span>}
        <span>구분 필터:</span>
        {([
          ["", "전체", companies.length, "#374151", "#eef6ff"],
          ["holder", "상위 고객사", companies.filter((c) => isHolderCo(c.name)).length, "#047857", "#ecfdf5"],
          ["member", "하위 고객사", companies.filter((c) => isMemberCo(c.name)).length, "#7e22ce", "#f3e8ff"],
          ["solo", "단독 고객사", companies.filter((c) => !isHolderCo(c.name) && !isMemberCo(c.name)).length, "#6b7280", "#f3f4f6"],
        ] as const).map(([v, label, n, fg, bg]) => {
          const on = classFilter === v;
          return (
            <button key={v} onClick={() => setClassFilter(v as typeof classFilter)}
              style={{ fontSize: 11.5, fontWeight: 700, padding: "4px 10px", borderRadius: 999, cursor: "pointer",
                border: `1px solid ${on ? fg : "#e5e7eb"}`, background: on ? bg : "#fff", color: on ? fg : "#6b7280" }}>
              {label} <span style={{ fontWeight: 400 }}>{n.toLocaleString()}</span>
            </button>
          );
        })}
      </div>

      {toast && <div style={S.toast}>{toast}</div>}

      <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
        <table style={{ ...S.table, textAlign: "center" }}>
          <thead>
            <tr>{["No", "업체명", "담당자 / 연락처", "사업자번호", "은행 / 계좌", "커먼 코드", "편집 단가", "주소", "서류", "업무", "작업"].map((h) => (
              h === "업체명"
                ? <th key={h} style={{ ...S.th, textAlign: "center", cursor: "pointer", userSelect: "none" }} onClick={toggleSort} title="클릭하면 가나다 정렬">
                    {h}<span style={{ marginLeft: 3, color: sortDir !== 0 ? "#2563eb" : "#d1d5db" }}>{sortDir === 1 ? "▲" : sortDir === -1 ? "▼" : "↕"}</span>
                  </th>
                : <th key={h} style={{ ...S.th, textAlign: "center" }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => {
              const no = (curPage - 1) * perPage + i + 1;
              const c = row.c;
              return (
              <tr key={c.id} onClick={() => router.push(`/companies/${c.id}`)} title={c.closed ? "프로젝트 종료 고객사 (코드 발급 이력만)" : "클릭하면 상세·수정 화면으로 이동"} style={{ borderTop: "1px solid #eef0f4", cursor: "pointer", background: c.closed ? "#fafafa" : undefined, opacity: c.closed ? 0.6 : 1 }}>
                <td style={{ ...S.td, textAlign: "center", color: "#9ca3af", fontFamily: "ui-monospace,monospace" }}>{no}</td>
                <td style={{ ...S.td, fontWeight: 600 }}>
                  {c.name}
                  {isHolderCo(c.name)
                    ? <span style={{ ...S.tag, marginLeft: 6, fontSize: 9.5, background: "#ecfdf5", color: "#047857", fontWeight: 700 }} title="공통(커먼)코드를 보유한 상위(대표) 고객사 · 하위 고객사가 이 코드를 함께 사용">상위 고객사</span>
                    : isMemberCo(c.name)
                    ? <span style={{ ...S.tag, marginLeft: 6, fontSize: 9.5, background: "#f3e8ff", color: "#7e22ce", fontWeight: 700 }} title={`공통(커먼)코드를 사용하는 하위 고객사 · 귀속: ${memberCodesOf(c.name).map((x) => x.company).join(", ")}`}>하위 고객사</span>
                    : <span style={{ ...S.tag, marginLeft: 6, fontSize: 9.5, background: "#f3f4f6", color: "#9ca3af", fontWeight: 700 }} title="자체 코드만 쓰는 단독 고객사 (하위/상위 관계 없음)">단독</span>}
                  {c.closed && <span style={{ ...S.tag, marginLeft: 4, fontSize: 9.5, background: "#f3f4f6", color: "#6b7280", fontWeight: 700 }} title={c.closedNote || "프로젝트 종료"}>종료</span>}
                </td>
                <td style={S.td}>{c.manager || "-"}<div style={{ color: "#9ca3af", fontSize: 11 }}>{c.contact}</div></td>
                <td style={{ ...S.td, fontFamily: "ui-monospace,monospace", fontSize: 11.5 }}>{c.bizNo || "-"}</td>
                <td style={S.td}>{c.bankName || "-"}<div style={{ color: "#9ca3af", fontSize: 11 }}>{c.accountNo}</div></td>
                <td style={{ ...S.td, textAlign: "center", whiteSpace: "nowrap" }}>
                  {(() => {
                    const held = codesOfCompany(c.name);           // 상위(보유) 코드
                    if (held.length) return held.map((cc) => <span key={cc.label} style={{ ...S.tag, fontSize: 9, background: "#f3e8ff", color: "#7e22ce", fontWeight: 700, marginRight: 3 }} title={`보유(상위): ${cc.name}`}>{cc.label.split(" · ")[0]}</span>);
                    const used = memberCodesOf(c.name);            // 하위(사용) 코드
                    if (used.length) return used.map((cc) => <span key={cc.label} style={{ ...S.tag, fontSize: 9, background: "#faf5ff", color: "#7e22ce", border: "1px solid #e9d5ff", fontWeight: 700, marginRight: 3 }} title={`사용(하위) · 귀속 ${cc.company}`}>↳{cc.label.split(" · ")[0]}</span>);
                    return <span style={{ color: "#d1d5db" }}>-</span>;
                  })()}
                </td>
                <td style={{ ...S.td, textAlign: "center", fontFamily: "ui-monospace,monospace", fontSize: 11.5 }}>
                  {(() => { const n = customRateCount(c); return n > 0
                    ? <span style={{ color: "#b45309", fontWeight: 700 }} title="고객사 전용 단가가 지정된 항목 수">전용 {n}항목</span>
                    : <span style={{ color: "#9ca3af" }} title="전사 기본 단가">기본</span>;
                  })()}
                </td>
                <td style={{ ...S.td, color: "#6b7280", maxWidth: 180 }}>{c.address || "-"}</td>
                <td style={{ ...S.td, textAlign: "center" }}><span style={S.tag}>{c.docs.length}</span></td>
                <td style={{ ...S.td, textAlign: "center" }}><span style={S.tag}>{logCount(c.id)}</span></td>
                <td style={S.td}>
                  <button onClick={(e) => { e.stopPropagation(); setDelTarget(c); }} style={{ ...S.linkBtn, color: "#dc2626" }}>삭제</button>
                </td>
              </tr>
              );
            })}
            {allRows.length === 0 && <tr><td colSpan={11} style={{ ...S.td, textAlign: "center", color: "#9ca3af", padding: 30 }}>{q ? `"${q}" 검색 결과가 없습니다.` : "등록된 고객사가 없습니다."}</td></tr>}
          </tbody>
        </table>
        {allRows.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 14px", borderTop: "1px solid #eef0f4", flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              전체 <b style={{ color: "#111827" }}>{allRows.length.toLocaleString()}</b>건 중 {((curPage - 1) * perPage + 1).toLocaleString()}~{Math.min(curPage * perPage, allRows.length).toLocaleString()} 표시
              <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }} style={{ marginLeft: 8, fontSize: 12, padding: "3px 6px", border: "1px solid #e5e7eb", borderRadius: 6 }}>
                {[25, 50, 100, 200, 500].map((n) => <option key={n} value={n}>{n}건씩</option>)}
                <option value={shown.length || 1}>전체 보기</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button onClick={() => setPage(1)} disabled={curPage === 1} style={pgBtn(false, curPage === 1)}>«</button>
              <button onClick={() => setPage(curPage - 1)} disabled={curPage === 1} style={pgBtn(false, curPage === 1)}>‹</button>
              {pageWindow(curPage, totalPages).map((n) => (
                <button key={n} onClick={() => setPage(n)} style={pgBtn(n === curPage, false)}>{n}</button>
              ))}
              <button onClick={() => setPage(curPage + 1)} disabled={curPage === totalPages} style={pgBtn(false, curPage === totalPages)}>›</button>
              <button onClick={() => setPage(totalPages)} disabled={curPage === totalPages} style={pgBtn(false, curPage === totalPages)}>»</button>
              <span style={{ fontSize: 11.5, color: "#9ca3af", marginLeft: 6 }}>{curPage} / {totalPages}</span>
            </div>
          </div>
        )}
      </div>

      {delTarget && (
        <DeleteCompanyModal target={delTarget} projects={projects}
          onClose={() => setDelTarget(null)}
          onDone={(msg) => { setDelTarget(null); flash(msg); }} />
      )}
    </div>
  );
}

/* ── MEM-02 고객사 등록 · 상세수정 ──────────────────────────────── */
// companyId = 0 → 등록(/companies/new) · 그 외 → 상세·수정(/companies/{id})
export function CompanyFormView({ companyId }: { companyId: number }) {
  const router = useRouter();
  const { companies, projects, logs } = useStore();
  const me = currentUser(useAuth());
  useEffect(() => { hydrateMembers(); }, []);
  useCommonMembers();

  const isNew = !companyId;
  const company = isNew ? null : companies.find((c) => c.id === companyId);

  // 입력 항목이 길어 탭으로 나눈다. 수정 화면에서는 우측 업무요청 메모가 탭과 무관하게 항상 보인다.
  const [tab, setTab] = useState<"base" | "rate" | "docs">("base");
  const [form, setForm] = useState<Draft>(EMPTY);
  const [memberCodes, setMemberCodes] = useState<Set<string>>(new Set());   // 이 고객사가 사용하는 공통코드(하위 등록)
  const [logDraft, setLogDraft] = useState<LogDraft>(EMPTY_LOG);
  const [delOpen, setDelOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState("");
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 4000); };

  // 고객사 값 주입 (최초 1회 — 편집 중 스토어 변경에 덮이지 않도록)
  useEffect(() => {
    if (loaded) return;
    if (isNew) { setForm({ ...EMPTY, docs: [] }); setMemberCodes(new Set()); setLoaded(true); return; }
    if (!company) return;
    setForm({ ...company, docs: [...company.docs] });
    setMemberCodes(new Set(codesOfMember(company.name)));
    setLoaded(true);
  }, [isNew, company, loaded]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setForm((f) => ({ ...f, [k]: v }));

  // 본인이 작성한 메모만 수정·삭제 가능
  const isMine = (l: WorkLog) => !!me && (l.authorEmail ? l.authorEmail === me.email : l.author === me.name);

  // 관련 서류
  const addDoc = () => set("docs", [...form.docs, { id: nextId(), label: "새 서류", fileName: "" }]);
  const setDoc = (id: number, patch: Partial<CompanyDoc>) => set("docs", form.docs.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const delDoc = (id: number) => set("docs", form.docs.filter((d) => d.id !== id));

  // 업무 원장 (공유 스토어)
  const companyProjects = projects.filter((p) => p.companyId === companyId);
  const projName = (pid: number | null) => (pid == null ? "고객사 공통" : projects.find((p) => p.id === pid)?.name ?? "?");
  const companyLogs = logs.filter((l) => l.companyId === companyId).sort((a, b) => a.no - b.no);

  const submitLog = () => {
    if (!companyId || !logDraft.content.trim()) return;
    if (logDraft.id) {
      const target = logs.find((l) => l.id === logDraft.id);
      if (target && !isMine(target)) { flash("본인이 작성한 메모만 수정할 수 있습니다."); return; }
      store.updateLog(logDraft.id, { kind: logDraft.kind, content: logDraft.content.trim(), projectId: logDraft.projectId });
    } else {
      store.addLog(companyId, logDraft.projectId, logDraft.kind, logDraft.content.trim(), me?.name ?? "미로그인", me?.email ?? "");
    }
    setLogDraft({ ...EMPTY_LOG, projectId: logDraft.projectId });
  };
  const startEditLog = (l: WorkLog) => {
    if (!isMine(l)) { flash(`${l.author} 님이 작성한 메모입니다. 본인 글만 수정할 수 있습니다.`); return; }
    setLogDraft({ id: l.id, kind: l.kind, content: l.content, projectId: l.projectId });
  };
  const removeLog = (l: WorkLog) => {
    if (!isMine(l)) { flash(`${l.author} 님이 작성한 메모입니다. 본인 글만 삭제할 수 있습니다.`); return; }
    if (confirm(`메모 ${l.no}번을 삭제할까요?`)) store.deleteLog(l.id);
  };

  const save = () => {
    if (!form.name.trim()) { flash("업체명은 필수입니다."); return; }
    store.upsertCompany({ ...form, id: companyId });
    // 공통코드 사용 고객사(하위) 등록 — 중앙 멤버십에 동기화 (히스토리 시드는 유지)
    //   자기(대표) 코드는 제외 — 대표 회사는 자기 코드의 하위 고객사가 될 수 없다.
    COMMON_CODES.filter((c) => !c.historyOnly && c.company !== form.name.trim()).forEach((c) => {
      if (memberCodes.has(codeKey(c))) addMember(c.k, c.s, c.o, form.name);
      else removeMember(c.k, c.s, c.o, form.name);
    });
    logActivity("company", `${isNew ? "등록" : "수정"} · ${form.name}`, me?.name);
    if (isNew) { router.push("/companies"); return; }   // 등록 후 목록으로
    flash(`수정됨 · ${form.name}`);
  };

  if (!isNew && !company) {
    return (
      <div style={{ padding: "20px 22px", maxWidth: 980 }}>
        <div style={{ ...S.card, padding: 24, fontSize: 13, color: "#6b7280" }}>
          고객사를 찾을 수 없습니다. <Link href="/companies" style={{ color: "#2563eb" }}>고객사 목록으로</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 22px", maxWidth: isNew ? 640 : 1100 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{isNew ? "고객사 등록" : "고객사 상세 · 수정"}</div>
        {!isNew && company && (
          <>
            <span style={{ ...S.tag, background: "#f3f4f6", color: "#6b7280" }}>{company.name}</span>
            {isHolderCo(company.name)
              ? <span style={{ ...S.tag, background: "#ecfdf5", color: "#047857", fontWeight: 700 }}>상위 고객사</span>
              : isMemberCo(company.name)
              ? <span style={{ ...S.tag, background: "#f3e8ff", color: "#7e22ce", fontWeight: 700 }}>하위 고객사</span>
              : <span style={{ ...S.tag, background: "#f3f4f6", color: "#9ca3af", fontWeight: 700 }}>단독</span>}
          </>
        )}
      </div>

      {toast && <div style={S.toast}>{toast}</div>}

      {/* 수정 시 좌(입력 탭)/우(업무 원장) 2단, 등록 시 1단(업무 메모 없음) */}
      <div style={{ display: "grid", gridTemplateColumns: isNew ? "1fr" : "1.15fr 0.85fr", gap: 20, alignItems: "start" }}>
        {/* 좌 — 항목이 길어 탭으로 나눈다 */}
        <div style={{ ...colBox, padding: 0 }}>
          <div style={{ display: "flex", borderBottom: "1px solid #eef0f4" }}>
            {([
              ["base", "기본 정보", ""],
              ["rate", "편집 단가", customRateCount(form) > 0 ? `전용 ${customRateCount(form)}` : ""],
              ["docs", "관련 서류", form.docs.length ? String(form.docs.length) : ""],
            ] as const).map(([v, label, badge]) => {
              const on = tab === v;
              return (
                <button key={v} onClick={() => setTab(v)}
                  style={{ border: 0, background: "none", padding: "11px 16px", fontSize: 13, cursor: "pointer",
                    color: on ? "#111827" : "#6b7280", fontWeight: on ? 700 : 400,
                    borderBottom: `2px solid ${on ? BLUE : "transparent"}`, marginBottom: -1,
                    display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                  {label}
                  {badge && <span style={{ ...S.tag, fontSize: 10, background: on ? "#eef6ff" : "#f3f4f6", color: on ? "#2563eb" : "#9ca3af", fontWeight: 700 }}>{badge}</span>}
                </button>
              );
            })}
          </div>
          <div style={{ padding: 16 }}>

        {tab === "base" && (<>
          <div style={S.grid2}>
            <Field label="업체명 *"><input style={S.input} value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
            <Field label="담당자"><input style={S.input} value={form.manager} onChange={(e) => set("manager", e.target.value)} /></Field>
            <Field label="연락처"><input style={S.input} value={form.contact} onChange={(e) => set("contact", e.target.value)} /></Field>
            <Field label="사업자등록증번호"><input style={S.input} value={form.bizNo} onChange={(e) => set("bizNo", e.target.value)} placeholder="000-00-00000" /></Field>
            <Field label="주소" full><input style={S.input} value={form.address} onChange={(e) => set("address", e.target.value)} /></Field>
            <Field label="은행명"><input style={S.input} value={form.bankName} onChange={(e) => set("bankName", e.target.value)} /></Field>
            <Field label="계좌번호"><input style={S.input} value={form.accountNo} onChange={(e) => set("accountNo", e.target.value)} /></Field>
            <Field label="세금계산서 발행용 이메일" full>
              <input type="email" style={S.input} value={form.taxEmail ?? ""} onChange={(e) => set("taxEmail", e.target.value)} placeholder="tax@company.com" />
            </Field>
            <Field label="프로젝트 상태" full>
              <div style={{ border: `1px solid ${form.closed ? "#fca5a5" : "#e5e7eb"}`, background: form.closed ? "#fef2f2" : "#fafbfc", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button type="button" role="switch" aria-checked={!!form.closed} onClick={() => set("closed", !form.closed)}
                    title={form.closed ? "사업 종료 → 진행중으로 되돌리기" : "사업 종료로 전환"}
                    style={{ width: 46, height: 26, borderRadius: 13, border: "none", padding: 0, cursor: "pointer", position: "relative",
                      background: form.closed ? "#ef4444" : "#d1d5db", transition: "background .15s", flexShrink: 0 }}>
                    <span style={{ position: "absolute", top: 3, left: form.closed ? 23 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .15s", boxShadow: "0 1px 2px rgba(0,0,0,.25)" }} />
                  </button>
                  <div>
                    <b style={{ fontSize: 13.5, color: form.closed ? "#b91c1c" : "#374151" }}>{form.closed ? "사업 종료" : "진행중"}</b>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>사업 종료 시 코드 발급 이력만 유지되고, 목록·코드 프로젝트에서 비활성(회색)으로 표시됩니다.</div>
                  </div>
                </div>
                {form.closed && (
                  <input style={{ ...S.input, marginTop: 10 }} value={form.closedNote ?? ""} onChange={(e) => set("closedNote", e.target.value)} placeholder="종료 사유 / 코드 이관 메모 (예: 엠베스트-28로 코드 이관)" />
                )}
              </div>
            </Field>
          </div>

          {/* 공통코드 사용 고객사(하위) 등록 — 대표 회사 아래 귀속. 코드 할당 없이(기 발급) 편집·티켓만 */}
          <div style={secHead}>
            공통코드 사용 고객사 (하위 등록) <span style={{ color: "#9ca3af", fontWeight: 400 }}>· 대표 회사 아래로 귀속 · 코드 할당 불필요</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {COMMON_CODES.filter((c) => !c.historyOnly).map((c) => {
              const key = codeKey(c); const on = memberCodes.has(key);
              const own = !!form.name.trim() && c.company === form.name.trim();   // 이 고객사가 이 코드의 대표(자기 코드) → 비활성화
              return (
                <label key={key} style={{ display: "flex", alignItems: "flex-start", gap: 9, cursor: own ? "not-allowed" : "pointer", opacity: own ? 0.55 : 1,
                  border: `1px solid ${!own && on ? "#bfdbfe" : "#eef0f4"}`, background: own ? "#f3f4f6" : on ? "#f5f9ff" : "#fafbfc", borderRadius: 9, padding: "9px 11px" }}>
                  <input type="checkbox" checked={on && !own} disabled={own} style={{ marginTop: 2 }}
                    onChange={(e) => setMemberCodes((prev) => { const n = new Set(prev); if (e.target.checked) n.add(key); else n.delete(key); return n; })} />
                  <span style={{ fontSize: 12.5 }}>
                    <b style={{ color: own ? "#9ca3af" : on ? "#1e3a8a" : "#374151" }}>{c.name}</b>
                    {own && <span style={{ ...S.tag, marginLeft: 6, fontSize: 9.5, background: "#e5e7eb", color: "#6b7280", fontWeight: 700 }}>대표(자기) 코드</span>}
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{c.label}</div>
                  </span>
                </label>
              );
            })}
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6, lineHeight: 1.7 }}>
            선택하면 이 고객사가 해당 <b>공통코드의 사용 고객사(하위)</b>로 등록됩니다. 이미 발급된 공통코드를 쓰므로 <b>코드 할당은 없고</b>, 편집 프로젝트·티켓 발급에서 하위 고객사로 관리됩니다.
          </div>
        </>)}

        {/* 편집 단가 — 항목별 개별 단가(2026 단가표). 기본값에서 바꾸면 이 고객사 전용 단가 */}
        {tab === "rate" && (() => {
            const rm = rateMapOf(form);
            const nCustom = customRateCount(form);
            const setRate = (key: string, base: number, raw: string) => setForm((f) => {
              const rates = { ...(f.rates || {}) };
              const v = Math.max(0, Math.round(+raw || 0));
              if (v === base) delete rates[key]; else rates[key] = v;
              return { ...f, rates, pageUnit: undefined, symbolUnit: undefined };  // 구 필드는 rates로 일원화
            });
            const unitTxt = (u: RateItem["unit"]) => u === "page" ? "페이지당" : u === "symbol" ? "심볼당" : "건당";
            // 소리펜 · 필기펜은 정산 단위가 다른 별개 묶음이라 카드로 나눠 색을 달리한다.
            const RateGroup = ({ title, note, items, tone }: {
              title: string; note: string; items: RateItem[]; tone: { fg: string; bg: string; bd: string };
            }) => {
              const nOwn = items.filter((it) => rm[it.key] !== it.base).length;
              const resetGroup = () => setForm((f) => {
                const rates = { ...(f.rates || {}) };
                items.forEach((it) => delete rates[it.key]);
                return { ...f, rates, pageUnit: undefined, symbolUnit: undefined };
              });
              return (
                <div style={{ border: `1px solid ${tone.bd}`, borderRadius: 10, overflow: "hidden", marginTop: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 12px", background: tone.bg, borderBottom: `1px solid ${tone.bd}` }}>
                    <b style={{ fontSize: 12.5, color: tone.fg }}>{title}</b>
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>{note} · {items.length}항목</span>
                    <span style={{ flex: 1 }} />
                    {nOwn > 0 && (
                      <>
                        <span style={{ ...S.tag, background: "#fef3c7", color: "#92400e", fontWeight: 700 }}>전용 {nOwn}</span>
                        <button onClick={resetGroup} style={{ ...S.linkBtn, fontSize: 11 }} title={`${title} 항목만 기본 단가로 되돌리기`}>기본값</button>
                      </>
                    )}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 14px", padding: "11px 12px" }}>
                    {items.map((it) => {
                      const own = rm[it.key] !== it.base;
                      return (
                        <label key={it.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                          <span style={{ flex: 1, color: own ? "#b45309" : "#4b5563", fontWeight: own ? 700 : 400 }}>
                            {it.label} <span style={{ color: "#9ca3af", fontSize: 10.5 }}>{unitTxt(it.unit)}</span>
                          </span>
                          <input type="number" min={0} step={10} value={rm[it.key]}
                            onChange={(e) => setRate(it.key, it.base, e.target.value)}
                            title={own ? `기본 ${it.base.toLocaleString()}원 → 전용 단가` : `전사 기본 ${it.base.toLocaleString()}원`}
                            style={{ ...S.input, width: 92, textAlign: "right", padding: "5px 8px",
                              borderColor: own ? "#f59e0b" : undefined, background: own ? "#fffbeb" : undefined }} />
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            };
            return (
              <>
                <div style={{ ...secHead, marginTop: 0 }}>
                  편집 단가 (2026 항목별) <span style={{ color: "#9ca3af", fontWeight: 400 }}>· 기본값에서 바꾼 항목만 전용 단가</span>
                  {nCustom > 0 && <span style={{ ...S.tag, background: "#fef3c7", color: "#92400e", fontWeight: 700 }}>전용 {nCustom}항목</span>}
                  <button onClick={() => setForm((f) => ({ ...f, rates: undefined, pageUnit: undefined, symbolUnit: undefined }))}
                    style={{ ...S.smallBtn, marginLeft: "auto" }} title="모든 항목을 기본 단가로 되돌리기">전체 기본값</button>
                </div>
                <RateGroup title="🔊 소리펜" note="ncp2 산출 · mp3 심볼" items={SOUND_ITEMS}
                  tone={{ fg: "#1d4ed8", bg: "#f5f9ff", bd: "#dbeafe" }} />
                <RateGroup title="✍ 필기펜" note="필기 인식 · APP 연동" items={PEN_ITEMS}
                  tone={{ fg: "#7e22ce", bg: "#faf5ff", bd: "#e9d5ff" }} />
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 12, lineHeight: 1.6 }}>
                  편집 프로젝트의 청구액이 이 단가로 계산됩니다(항목 수량 × 단가). 단가를 바꾸면 <b>이후 등록되는 교재(책)부터 적용</b>되고, <b>기존 교재는 등록 당시 단가가 그대로 유지</b>됩니다. 교재별 할인은 <b>편집 프로젝트 &gt; 교재 수정</b>에서.
                </div>
              </>
            );
          })()}

        {tab === "docs" && (<>
          <div style={{ ...secHead, marginTop: 0 }}>관련 서류 <span style={{ color: "#9ca3af", fontWeight: 400 }}>· 항목명 수정 가능</span>
            <button onClick={addDoc} style={{ ...S.smallBtn, marginLeft: "auto" }}>＋ 서류 추가</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {form.docs.length === 0 && <div style={emptyBox}>등록된 서류가 없습니다.</div>}
            {form.docs.map((d) => (
              <div key={d.id} style={{ display: "grid", gridTemplateColumns: "130px 1fr auto", gap: 8, alignItems: "center" }}>
                <input style={{ ...S.input, fontWeight: 600 }} value={d.label} onChange={(e) => setDoc(d.id, { label: e.target.value })} placeholder="항목명" />
                <label style={{ ...S.input, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: d.fileName ? "#111827" : "#9ca3af" }}>
                  <span style={S.smallBtn as React.CSSProperties}>파일</span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.fileName || "선택 없음"}</span>
                  <input type="file" style={{ display: "none" }} onChange={(e) => setDoc(d.id, { fileName: e.target.files?.[0]?.name ?? d.fileName })} />
                </label>
                <button onClick={() => delDoc(d.id)} style={{ ...S.linkBtn, color: "#dc2626" }}>삭제</button>
              </div>
            ))}
          </div>
        </>)}

          </div>
        </div>

        {/* 우 — 업무요청 메모. 탭과 무관하게 항상 보이고, 좌측을 스크롤해도 따라온다. */}
        {!isNew && (
          <div style={{ ...colBox, position: "sticky", top: 16 }}>
            <div style={colHead}>업무요청 메모 <span style={{ color: "#9ca3af", fontWeight: 400, fontSize: 11 }}>· 고객사 전용 원장 · 번호 유지 · 본인 글만 수정/삭제</span></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 76px", gap: 8 }}>
              <select style={S.input} value={logDraft.projectId ?? ""} onChange={(e) => setLogDraft((d) => ({ ...d, projectId: e.target.value ? +e.target.value : null }))}>
                <option value="">고객사 공통</option>
                {companyProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select style={S.input} value={logDraft.kind} onChange={(e) => setLogDraft((d) => ({ ...d, kind: e.target.value as WorkKind }))}>
                <option value="요청">요청</option><option value="처리">처리</option><option value="메모">메모</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "flex-start" }}>
              <AutoTextarea value={logDraft.content} onChange={(v) => setLogDraft((d) => ({ ...d, content: v }))} onSubmit={submitLog}
                placeholder="내용 입력 · Enter 기록 · Shift+Enter 줄바꿈" style={{ flex: 1 }} />
              <button onClick={submitLog} style={{ ...S.smallBtn, whiteSpace: "nowrap" }}>{logDraft.id ? "수정 저장" : "＋ 기록"}</button>
              {logDraft.id && <button onClick={() => setLogDraft(EMPTY_LOG)} style={S.smallBtn}>취소</button>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12, maxHeight: 520, overflow: "auto" }}>
              {companyLogs.length === 0 && <div style={emptyBox}>기록된 업무가 없습니다.</div>}
              {companyLogs.map((l) => (
                <div key={l.id} style={{ border: `1px solid ${logDraft.id === l.id ? "#93c5fd" : "#eef0f4"}`, borderRadius: 8, padding: "6px 8px" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 11.5 }}>
                    <span style={{ minWidth: 22, textAlign: "center", background: "#f3f4f6", borderRadius: 5, fontFamily: "ui-monospace,monospace", color: "#374151" }}>{l.no}</span>
                    <span style={{ ...S.tag, background: l.projectId ? "#eef6ff" : "#f3f4f6", color: l.projectId ? "#2563eb" : "#6b7280" }}>{projName(l.projectId)}</span>
                    <span style={{ ...S.tag, background: KIND_BG[l.kind], color: KIND_FG[l.kind] }}>{l.kind}</span>
                    <span style={{ color: "#9ca3af", fontFamily: "ui-monospace,monospace" }}>{l.date}{l.edited ? " (수정됨)" : ""}</span>
                    <span style={{ color: isMine(l) ? "#2563eb" : "#9ca3af", fontWeight: isMine(l) ? 700 : 400 }}>{l.author}{isMine(l) ? " (나)" : ""}</span>
                    <span style={{ flex: 1 }} />
                    {isMine(l)
                      ? <button onClick={() => removeLog(l)} style={{ ...S.linkBtn, color: "#dc2626" }}>삭제</button>
                      : <span style={{ fontSize: 10.5, color: "#d1d5db" }}>🔒 타인 글</span>}
                  </div>
                  <div onClick={() => startEditLog(l)} title={isMine(l) ? "클릭하면 위 입력창에서 수정" : "본인 글만 수정할 수 있습니다"} style={{ marginTop: 4, whiteSpace: "pre-wrap", cursor: isMine(l) ? "pointer" : "default", fontSize: 12.5 }}>{l.content}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 하단 액션 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 18 }}>
        {!isNew && <button onClick={() => setDelOpen(true)} style={{ ...S.ghost, color: "#dc2626", borderColor: "#fecaca" }}>고객사 삭제</button>}
        <span style={{ flex: 1 }} />
        <Link href="/companies" style={{ ...S.ghost, textDecoration: "none" }}>목록</Link>
        <button onClick={save} style={S.primary}>{isNew ? "등록" : "저장"}</button>
      </div>

      {delOpen && company && (
        <DeleteCompanyModal target={company} projects={projects}
          onClose={() => setDelOpen(false)}
          onDone={() => router.push("/companies")} />
      )}
    </div>
  );
}

/* ── 고객사 삭제 확인 — 목록·상세에서 함께 쓴다 ─────────────────── */
function DeleteCompanyModal({ target, projects, onClose, onDone }: {
  target: Company;
  projects: ReturnType<typeof useStore>["projects"];
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const ps = projects.filter((p) => p.companyId === target.id);
  const im = { projects: ps.length, codes: ps.reduce((s, p) => s + projectCodes(p), 0) };

  const run = () => {
    store.deleteCompany(target.id);
    onDone(`삭제됨 · ${target.name} · 프로젝트 ${im.projects}건 / 코드 ${im.codes.toLocaleString()}건 reset`);
  };

  return (
    <Modal onClose={onClose} title="⚠ 고객사 삭제 — 신중히 확인하세요">
      <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "14px 16px", fontSize: 13, color: "#991b1b", lineHeight: 1.7 }}>
        <b>{target.name}</b> 을(를) 삭제합니다.<br />
        • 삭제 업체는 <b>3~4년 뒤 재연락되는 경우가 많습니다.</b> 정말 삭제가 필요한지 재확인하세요.<br />
        • 이 고객사의 <b>프로젝트 {im.projects}건 / 발급 코드 {im.codes.toLocaleString()}건이 reset</b>됩니다(회수).<br />
        • 서류·업무 원장 기록도 함께 삭제되며, 되돌릴 수 없습니다.
      </div>
      <div style={{ marginTop: 14, fontSize: 12.5, color: "#374151" }}>확인을 위해 업체명 <b>{target.name}</b> 을(를) 입력하세요:</div>
      <input style={{ ...S.input, marginTop: 6 }} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={target.name} />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
        <button onClick={onClose} style={S.ghost}>취소</button>
        <button onClick={run} disabled={confirmText.trim() !== target.name}
          style={{ ...S.danger, ...(confirmText.trim() !== target.name ? { opacity: 0.5, cursor: "not-allowed" } : {}) }}>삭제 확정 (코드 reset)</button>
      </div>
    </Modal>
  );
}

const secHead: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151", fontWeight: 700, margin: "18px 0 8px" };
const emptyBox: React.CSSProperties = { fontSize: 12, color: "#9ca3af", padding: "10px 12px", background: "#fafbfc", border: "1px dashed #e5e7eb", borderRadius: 8 };
const colBox: React.CSSProperties = { border: "1px solid #eef0f4", borderRadius: 10, padding: 16, background: "#fff" };
const colHead: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #eef0f4" };

const pgBtn = (on: boolean, disabled: boolean): React.CSSProperties => ({
  minWidth: 28, fontSize: 12, padding: "4px 7px", borderRadius: 6, cursor: disabled ? "default" : "pointer",
  border: `1px solid ${on ? "#93c5fd" : "#e5e7eb"}`, background: on ? "#eef6ff" : "#fff",
  color: disabled ? "#d1d5db" : on ? "#2563eb" : "#4b5563", fontWeight: on ? 700 : 400,
});
function pageWindow(cur: number, total: number): number[] {
  const size = Math.min(7, total);
  let start = Math.max(1, cur - Math.floor(size / 2));
  if (start + size - 1 > total) start = total - size + 1;
  return Array.from({ length: size }, (_, i) => start + i);
}
