"use client";

// 고객사 관리 — MEM-01 목록 / MEM-02 등록·상세수정
// 목록에서 [＋ 고객사 등록] → /companies/new, 행을 누르면 /companies/{id} 상세·수정.
// 등록·수정은 모달이 아니라 별도 페이지다(계정 발급·Key 관리와 같은 구조).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { S, Field, Modal, AutoTextarea } from "./ui";
import { store, useStore } from "@/lib/store";
import { useAuth, currentUser } from "@/lib/authStore";
import { logActivity } from "@/lib/activityStore";
import { onboarding, useOnboarding, onboardServiceToCompany, onboardServiceLabel,
         type OnboardingRequest } from "@/lib/onboardingStore";
import { Company, CompanyDoc, WorkKind, WorkLog, projectCodes, nextId,
         SERVICE, companyServices } from "@/lib/customerData";
import { SOUND_ITEMS, PEN_ITEMS, rateMapOf, customRateCount, type RateItem } from "@/lib/pricing";
import { COMMON_CODES, codeKey, codesOfCompany, isCommonCodeCompany, type CommonCode } from "@/lib/commonCodes";
import { codesOfMember, addMember, removeMember, hydrateMembers, useCommonMembers } from "@/lib/commonMembers";
import { caster, useCaster, accountScope, isActive, type CasterAccount } from "@/lib/accountStore";
import { CompanyAccountsPanel, type AccountOps } from "./CompanyAccountsPanel";

type Draft = Omit<Company, "id">;
const EMPTY: Draft = { name: "", manager: "", contact: "", address: "", bizNo: "", bankName: "", accountNo: "", taxEmail: "", docs: [] };
const KIND_BG: Record<string, string> = { 요청: "#fef3c7", 처리: "#dcfce7", 메모: "#eef2f7" };
const KIND_FG: Record<string, string> = { 요청: "#92400e", 처리: "#166534", 메모: "#475569" };

type LogDraft = { id: number | null; kind: WorkKind; content: string; projectId: number | null };
// 고객사 상세 섹션 `PC-136`
type Sec = "base" | "rate" | "docs" | "acc" | "memo";
type FormSec = "base" | "rate" | "docs";
const SEC_KEYS: Record<FormSec, (keyof Draft)[]> = {
  base: ["name", "manager", "contact", "bizNo", "address", "bankName", "accountNo", "taxEmail"],
  rate: ["rates", "pageUnit", "symbolUnit"],
  docs: ["docs"],
};
const SEC_LABEL: Record<FormSec, string> = { base: "기본 정보", rate: "편집 단가", docs: "관련 서류" };
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
  const me = currentUser(useAuth());
  const onb = useOnboarding();                                     // 온보딩(승인요청) 피드 `PC-116`
  const pending = onb.requests.filter((r) => r.status === "PENDING");
  const [approved, setApproved] = useState<{ companyId: number; email: string; org: string } | null>(null);
  const [showOnboard, setShowOnboard] = useState(false);   // 가입 승인 요청 모달 `PC-119`
  const [delTarget, setDelTarget] = useState<Company | null>(null);
  // 서비스 계정 열 `PC-135` — 고객사별 서비스 계정 수(명), 누르면 명단
  const cast = useCaster();
  const svcAccountsOf = (cid: number) => cast.accounts.filter((a) => accountScope(a) === "service" && a.companyId === cid);
  const [accTarget, setAccTarget] = useState<Company | null>(null);
  const [toast, setToast] = useState("");
  const [q, setQ] = useState("");   // 업체 검색
  const [classFilter, setClassFilter] = useState<"" | "holder" | "member" | "solo">("");   // 구분 필터: 상위/하위/단독
  // 정렬: 0 최근순(기본, createdAt desc) `PC-119` / 1 이름 오름 / -1 이름 내림
  const [sortDir, setSortDir] = useState<0 | 1 | -1>(0);
  useEffect(() => { hydrateMembers(); }, []);
  useCommonMembers();   // 멤버십(하위 귀속) 변경 시 재렌더

  // 업체명·담당자·연락처·사업자번호·주소로 검색
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");
  const classOf = (name: string): "holder" | "member" | "solo" => isHolderCo(name) ? "holder" : isMemberCo(name) ? "member" : "solo";
  const shown = companies
    .filter((c) => (q ? norm(`${c.name} ${c.manager} ${c.contact} ${c.bizNo} ${c.address}`).includes(norm(q)) : true))
    .filter((c) => (classFilter ? classOf(c.name) === classFilter : true));
  // 클릭 순환: 최근순(0) → 이름 오름(1) → 이름 내림(-1) → 최근순
  const toggleSort = () => setSortDir((d) => (d === 0 ? 1 : d === 1 ? -1 : 0));

  // 페이지네이션 (편집 프로젝트 목록과 동일 · 기본 50건씩)
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  useEffect(() => { setPage(1); }, [q, classFilter, sortDir]);
  // 정렬 — 최근순(등록시각 desc, 없으면 뒤로) 기본, 또는 이름 오름/내림 `PC-119`
  const allRows = shown
    .map((c) => ({ kind: "co" as const, c }))
    .sort((a, b) => {
      if (sortDir === 0) {
        const ca = a.c.createdAt ?? "", cb = b.c.createdAt ?? "";
        if (ca !== cb) return ca < cb ? 1 : -1;   // 최근(큰 날짜)이 위로
        return a.c.name.localeCompare(b.c.name, "ko");
      }
      return a.c.name.localeCompare(b.c.name, "ko") * (sortDir === -1 ? -1 : 1);
    });
  const totalPages = Math.max(1, Math.ceil(allRows.length / perPage));
  const curPage = Math.min(page, totalPages);
  const pageRows = allRows.slice((curPage - 1) * perPage, curPage * perPage);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 4000); };
  const logCount = (cid: number) => logs.filter((l) => l.companyId === cid).length;

  // ── 온보딩 승인요청 처리 `PC-116` ───────────────────────────────
  // 승인 → 같은 이름 고객사가 있으면 연결, 없으면 신규 등록. 그 뒤 App Key 발급으로 안내.
  const approveReq = (r: OnboardingRequest) => {
    const svc = onboardServiceToCompany(r.service);
    const existing = companies.find((c) => norm(c.name) === norm(r.org));
    let cid: number;
    if (existing) {
      cid = existing.id;
      if (svc && !(existing.services ?? []).includes(svc))
        store.upsertCompany({ ...existing, services: [...(existing.services ?? []), svc] });
    } else {
      cid = store.upsertCompany({
        id: 0, name: r.org, manager: r.name, contact: r.email, address: "", bizNo: "",
        bankName: "", accountNo: "", taxEmail: r.email, docs: [], services: svc ? [svc] : [],
      });
    }
    onboarding.approve(r.id, cid, me?.name);
    logActivity("company", `온보딩 승인 · ${r.org} (${r.email})${existing ? " · 기존 고객사 연결" : " · 신규 등록"}`, me?.name);
    setApproved({ companyId: cid, email: r.email, org: r.org });
    flash(`승인됨 · ${r.org} ${existing ? "연결" : "고객사 등록"} · 고객사 상세에서 계정을 추가하세요`);
  };
  const rejectReq = (r: OnboardingRequest) => {
    if (!confirm(`${r.org} (${r.email}) 의 가입 요청을 거절할까요?`)) return;
    onboarding.reject(r.id, me?.name);
    logActivity("company", `온보딩 거절 · ${r.org} (${r.email})`, me?.name);
    flash(`거절됨 · ${r.org}`);
  };
  // 시뮬레이션 — 로그인 기록 서버가 새 고객 SSO 로그인을 밀어 넣는 상황을 원클릭으로 만든다.
  //   프로토타입이라 실제 데이터가 없으므로, 클릭할 때마다 가상의 신규 고객 1건이 승인 대기로 유입된다.
  const DEMO_POOL: { org: string; domain: string; name: string; service: "CASTERN" | "FORMSOLUTION" | "SDK" }[] = [
    { org: "미래출판", domain: "miraebooks.co.kr", name: "정출판", service: "CASTERN" },
    { org: "한빛교육", domain: "hanbitedu.kr", name: "오한빛", service: "FORMSOLUTION" },
    { org: "코드리더", domain: "codereader.io", name: "S. Lee", service: "SDK" },
    { org: "에듀팜", domain: "edufarm.co.kr", name: "김에듀", service: "CASTERN" },
    { org: "노트플러스", domain: "noteplus.kr", name: "박노트", service: "FORMSOLUTION" },
    { org: "펜메이커", domain: "penmaker.io", name: "최펜", service: "CASTERN" },
  ];
  const simulateLogin = () => {
    const used = new Set(onb.requests.map((r) => r.domain));
    const pick = DEMO_POOL.find((d) => !used.has(d.domain))
      ?? { ...DEMO_POOL[Math.floor(Math.random() * DEMO_POOL.length)], domain: `co${Date.now() % 100000}.kr` };
    const email = `${["kim", "lee", "park", "choi", "dev", "admin"][Math.floor(Math.random() * 6)]}@${pick.domain}`;
    onboarding.recordLogin({ email, name: pick.name, org: pick.org, service: pick.service });
    flash(`새 SSO 로그인 유입 — ${pick.org} (${email}) 승인 대기 추가됨`);
  };

  return (
    <div style={{ padding: "20px 22px" }}>
      {/* 가입 승인 요청 — **카드로 건수만** 표시, 클릭하면 모달로 목록·승인 `PC-119` */}
      {pending.length > 0 && (
        <button onClick={() => setShowOnboard(true)}
          style={{ width: "100%", textAlign: "left", cursor: "pointer", border: "1px solid #fcd34d", background: "#fffbeb",
            borderRadius: 12, padding: "13px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>🔔</span>
          <b style={{ fontSize: 13.5, color: "#92400e" }}>가입 승인 요청 {pending.length}건</b>
          <span style={{ fontSize: 11.5, color: "#b45309" }}>· 새 고객이 우리 서비스에 SSO 로그인했습니다. 클릭하여 확인·승인하세요.</span>
          <span style={{ flex: 1 }} />
          <span style={{ ...S.primary, padding: "6px 14px", pointerEvents: "none" }}>확인·승인 →</span>
        </button>
      )}

      {/* 승인 직후 — 그 고객사의 **계정 및 서비스 권한**에서 SSO 이메일로 계정을 추가한다 `PC-116` `PC-133` */}
      {approved && (
        <div style={{ border: "1px solid #a7f3d0", background: "#ecfdf5", borderRadius: 12, padding: "12px 16px", marginBottom: 14,
          display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 15 }}>✅</span>
          <b style={{ fontSize: 13, color: "#065f46" }}>{approved.org} 승인 완료</b>
          <span style={{ fontSize: 12, color: "#047857" }}>고객사 상세의 계정 및 서비스 권한에서 이 이메일로 계정을 추가하세요.</span>
          <span style={{ flex: 1 }} />
          <Link href={`/companies/${approved.companyId}?email=${encodeURIComponent(approved.email)}`}
            style={{ ...S.primary, textDecoration: "none", padding: "6px 14px" }}>계정 추가 →</Link>
          <button onClick={() => setApproved(null)} style={{ ...S.ghost, padding: "6px 10px" }}>닫기</button>
        </div>
      )}

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
        <button onClick={simulateLogin} style={{ ...S.ghost, borderColor: "#fcd34d", color: "#92400e", background: "#fffbeb" }}
          title="프로토타입 시뮬레이션 — 새 고객이 우리 서비스에 SSO 로그인한 상황을 만들어 승인 대기에 1건 추가합니다">🧪 새 SSO 로그인 (시뮬레이션)</button>
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
            <tr>{["No", "업체명", "담당자 / 연락처", "서비스 계정", "사업자번호", "은행 / 계좌", "커먼 코드", "편집 단가", "주소", "서류", "업무", "작업"].map((h) => (
              h === "업체명"
                ? <th key={h} style={{ ...S.th, textAlign: "center", cursor: "pointer", userSelect: "none" }} onClick={toggleSort} title="정렬: 최근순 → 가나다 오름 → 가나다 내림">
                    {h}<span style={{ marginLeft: 3, fontSize: 10, color: sortDir === 0 ? "#2563eb" : "#9ca3af" }}>{sortDir === 0 ? "최근순" : sortDir === 1 ? "▲" : "▼"}</span>
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
                {/* 서비스 계정 — 명수, 누르면 명단 `PC-135` */}
                <td style={{ ...S.td, textAlign: "center" }}>
                  {(() => { const n = svcAccountsOf(c.id).length; return n > 0
                    ? <button onClick={(e) => { e.stopPropagation(); setAccTarget(c); }} title="서비스 계정 명단 보기"
                        style={{ ...S.linkBtn, fontWeight: 700, color: "#2563eb" }}>{n}명</button>
                    : <span style={{ color: "#d1d5db" }}>-</span>;
                  })()}
                </td>
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
            {allRows.length === 0 && <tr><td colSpan={12} style={{ ...S.td, textAlign: "center", color: "#9ca3af", padding: 30 }}>{q ? `"${q}" 검색 결과가 없습니다.` : "등록된 고객사가 없습니다."}</td></tr>}
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

      {/* 가입 승인 요청 모달 `PC-119` — 카드 클릭 시 목록·승인 */}
      {showOnboard && (
        <Modal onClose={() => setShowOnboard(false)} title={`가입 승인 요청 ${pending.length}건`}>
          <p style={{ fontSize: 12.5, color: "#6b7280", margin: "0 0 12px", lineHeight: 1.6 }}>
            새 고객이 우리 서비스에 SSO 로그인한 기록입니다. 승인하면 고객사로 등록되고, 고객사 상세의 계정 및 서비스 권한에서 이 이메일로 계정을 추가할 수 있습니다.
          </p>
          {pending.length === 0 ? (
            <div style={{ fontSize: 13, color: "#6b7280", padding: "18px 0", textAlign: "center" }}>대기 중인 요청이 없습니다. ✅</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 440, overflow: "auto" }}>
              {pending.map((r) => (
                <div key={r.id} style={{ border: "1px solid #fde68a", background: "#fffbeb", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                    <span style={{ ...S.tag, background: "#eef6ff", color: "#2563eb", fontWeight: 700 }}>{onboardServiceLabel(r.service)}</span>
                    <b style={{ fontSize: 13 }}>{r.org}</b>
                    <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 11.5, color: "#2563eb" }}>{r.email}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "#9ca3af", marginBottom: 8 }}>{r.name} · {r.provider} SSO · 로그인 {r.loginCount}회 · {r.firstLoginAt}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => approveReq(r)} style={{ ...S.primary, padding: "6px 14px" }}>승인 → 고객사 등록</button>
                    <button onClick={() => rejectReq(r)} style={{ ...S.ghost, padding: "6px 12px", color: "#dc2626", borderColor: "#fecaca" }}>거절</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <button onClick={() => setShowOnboard(false)} style={S.ghost}>닫기</button>
          </div>
        </Modal>
      )}

      {/* 서비스 계정 명단 `PC-135` — 이름 · 이메일 · 계정 상태 · 최근 접속일 */}
      {accTarget && (() => {
        const list = svcAccountsOf(accTarget.id);
        const nOn = list.filter(isActive).length;
        return (
          <Modal onClose={() => setAccTarget(null)} title={`${accTarget.name} · 서비스 계정 ${list.length}명`} width={680}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
              활성 <b style={{ color: "#047857" }}>{nOn}명</b> · 비활성 <b style={{ color: "#9ca3af" }}>{list.length - nOn}명</b>
            </div>
            <div style={{ border: "1px solid #eef0f4", borderRadius: 10, overflow: "hidden" }}>
              <table style={{ ...S.table }}>
                <thead><tr>{["이름", "이메일", "계정 상태", "최근 접속일"].map((h) => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {list.map((a) => (
                    <tr key={a.id} style={{ borderTop: "1px solid #eef0f4" }}>
                      <td style={S.td}>{a.name || <span style={{ color: "#9ca3af" }}>-</span>}</td>
                      <td style={{ ...S.td, fontFamily: "ui-monospace,monospace", fontSize: 12 }}>{a.id}</td>
                      <td style={S.td}>
                        {isActive(a)
                          ? <span style={{ ...S.tag, background: "#ecfdf5", color: "#047857", fontWeight: 700 }}>활성</span>
                          : <span style={{ ...S.tag, background: "#f3f4f6", color: "#6b7280", fontWeight: 700 }}>비활성</span>}
                      </td>
                      <td style={{ ...S.td, fontFamily: "ui-monospace,monospace", fontSize: 12, color: a.lastLoginAt ? "#374151" : "#9ca3af" }}>
                        {a.lastLoginAt ? a.lastLoginAt.slice(0, 16).replace("T", " ") : "접속 기록 없음"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button onClick={() => setAccTarget(null)} style={S.ghost}>닫기</button>
              <button onClick={() => router.push(`/companies/${accTarget.id}?sec=acc`)} style={S.primary}>계정 관리 →</button>
            </div>
          </Modal>
        );
      })()}

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
export function CompanyFormView({ companyId, prefillEmail = "", initialSec = "" }: { companyId: number; prefillEmail?: string; initialSec?: string }) {
  const router = useRouter();
  const { companies, projects, logs } = useStore();
  const me = currentUser(useAuth());
  useEffect(() => { hydrateMembers(); }, []);
  useCommonMembers();

  const isNew = !companyId;
  const company = isNew ? null : companies.find((c) => c.id === companyId);

  // 입력 항목이 길어 탭으로 나눈다. 수정 화면에서는 우측 업무요청 메모가 탭과 무관하게 항상 보인다.
  // 섹션 메뉴 `PC-136` — 기본 정보 · 사용 서비스 · 편집 단가 · 관련 서류 · 서비스 계정 · 업무 메모
  const [sec, setSec] = useState<Sec>(prefillEmail || initialSec === "acc" ? "acc" : "base");
  const [moreOpen, setMoreOpen] = useState(false);       // ⋯ 메뉴(고객사 삭제)
  // 프로젝트 상태 — 머리말 오른쪽에서 고객사 전체를 진행중 / 사업 종료로 바꾼다 `PC-139`
  const [closeAsk, setCloseAsk] = useState(false);
  const [closeNote, setCloseNote] = useState("");
  const [form, setForm] = useState<Draft>(EMPTY);
  const [memberCodes, setMemberCodes] = useState<Set<string>>(new Set());   // 이 고객사가 사용하는 공통코드(하위 등록)
  const [memberInit, setMemberInit] = useState<Set<string>>(new Set());     // 저장된 공통코드 — 변경 여부 판단용 `PC-136`
  const [logDraft, setLogDraft] = useState<LogDraft>(EMPTY_LOG);
  const [delOpen, setDelOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState("");
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 4000); };

  // 계정 및 서비스 권한 `PC-128` — 고객사별 서비스 로그인 계정(여러 개). 신규 등록 중에는 임시로 두었다가 [등록] 때 저장
  const cast = useCaster();
  const [drafts, setDrafts] = useState<CasterAccount[]>([]);
  const svcAccounts = isNew ? drafts
    : cast.accounts.filter((a) => accountScope(a) === "service" && a.companyId === companyId);
  // 고객사 사용 서비스 = **그 고객사 서비스 계정들이 쓰는 서비스의 합** `PC-138`
  //   계정에 CasterN 사용을 체크하면 → 이 고객사가 편집 프로젝트 대상이 되고 CasterN 을 쓴다.
  const servicesOfAccounts = (list: CasterAccount[]) =>
    SERVICE.map((x) => x.v).filter((v) => list.some((a) => (a.services ?? []).includes(v as never)));
  const syncServices = () => {
    if (!companyId) return;
    const cur = store.snapshot().companies.find((c) => c.id === companyId);
    if (!cur) return;
    const mine = caster.snapshot().accounts.filter((a) => accountScope(a) === "service" && a.companyId === companyId);
    // 계정이 하나도 없으면 기존 지정값을 그대로 둔다 — 옛 casterN 고객사(계정 없음)를 지키기 위해 `PC-138`
    if (mine.length === 0) return;
    const services = servicesOfAccounts(mine);
    if (JSON.stringify(companyServices(cur)) !== JSON.stringify(services)) store.upsertCompany({ ...cur, services });
  };
  const dupId = (id: string) => [...cast.accounts, ...drafts].some((x) => x.id.toLowerCase() === id.toLowerCase());
  const accountOps: AccountOps = isNew ? {
    // 등록 화면에서 계정을 추가하면 **고객사와 계정을 함께 바로 등록**한다 — 「임시」 상태를 두지 않는다 `PC-142`
    add: (a) => {
      if (dupId(a.id)) return { ok: false, msg: "이미 등록된 ID(email)입니다." };
      if (!form.name.trim()) return { ok: false, msg: "기본 정보(업체명)를 먼저 입력하세요." };
      save([a], "acc");
      return { ok: true, msg: "" };
    },
    update: (id, patch) => setDrafts((d) => d.map((x) => (x.id === id ? { ...x, ...patch } : x))),
    remove: (id) => setDrafts((d) => d.filter((x) => x.id !== id)),
  } : {
    add: (a) => {
      const r = caster.addAccount({ ...a, companyId, company: company?.name ?? form.name });
      if (r.ok) { logActivity("company", `계정 추가 · ${company?.name ?? form.name} · ${a.id}`, me?.name); syncServices(); }
      return r;
    },
    update: (id, patch) => { caster.updateAccount(id, patch); syncServices(); },
    remove: (id) => { caster.removeAccount(id); syncServices(); logActivity("company", `계정 삭제 · ${company?.name ?? form.name} · ${id}`, me?.name); },
  };

  // 고객사 값 주입 (최초 1회 — 편집 중 스토어 변경에 덮이지 않도록)
  useEffect(() => {
    if (loaded) return;
    if (isNew) { setForm({ ...EMPTY, docs: [] }); setMemberCodes(new Set()); setLoaded(true); return; }
    if (!company) return;
    setForm({ ...company, docs: [...company.docs] });
    setMemberCodes(new Set(codesOfMember(company.name)));
    setMemberInit(new Set(codesOfMember(company.name)));
    setLoaded(true);
  }, [isNew, company, loaded]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setForm((f) => ({ ...f, [k]: v }));

  // 섹션별 저장 `PC-136` — 섹션마다 [저장]·[취소]가 있고, 고친 뒤 저장하지 않은 섹션은 메뉴에 ● 를 붙인다.
  //   등록 화면은 섹션 구분 없이 [등록] 한 번으로 고객사 + 서비스 계정을 함께 저장한다.
  const pickKeys = (o: Partial<Draft> | null | undefined, sc: FormSec) =>
    JSON.stringify(SEC_KEYS[sc].map((k) => (o as Record<string, unknown> | null | undefined)?.[k] ?? null));
  const sameSet = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((x) => b.has(x));
  const isDirty = (sc: Sec): boolean => {
    if (isNew || !company || sc === "memo" || sc === "acc") return false;
    return pickKeys(form, sc) !== pickKeys(company, sc) || (sc === "base" && !sameSet(memberCodes, memberInit));
  };
  const syncMembers = (name: string) => {
    // 공통코드 사용 고객사(하위) 등록 — 중앙 멤버십에 동기화. 자기(대표) 코드는 제외
    COMMON_CODES.filter((c) => !c.historyOnly && c.company !== name.trim()).forEach((c) => {
      if (memberCodes.has(codeKey(c))) addMember(c.k, c.s, c.o, name);
      else removeMember(c.k, c.s, c.o, name);
    });
  };
  const saveSection = (sc: FormSec) => {
    if (!company) return;
    if (sc === "base" && !form.name.trim()) { flash("업체명은 필수입니다."); return; }
    const patch = Object.fromEntries(SEC_KEYS[sc].map((k) => [k, (form as Record<string, unknown>)[k]]));
    const next = { ...company, ...patch } as Company;
    store.upsertCompany(next);
    if (sc === "base") { syncMembers(next.name); setMemberInit(new Set(memberCodes)); }
    logActivity("company", `수정 · ${next.name} · ${SEC_LABEL[sc]}`, me?.name);
    flash(`저장됨 · ${SEC_LABEL[sc]}`);
  };
  const cancelSection = (sc: FormSec) => {
    if (!company) return;
    const restore = Object.fromEntries(SEC_KEYS[sc].map((k) => [k, (company as unknown as Record<string, unknown>)[k]]));
    setForm((f) => ({ ...f, ...restore, ...(sc === "docs" ? { docs: [...company.docs] } : {}) }));
    if (sc === "base") setMemberCodes(new Set(memberInit));
  };

  // 진행중 ⇄ 사업 종료 — 수정 화면은 바로 저장, 등록 화면은 [등록] 때 함께 저장 `PC-139`
  const setStatus = (closed: boolean, note = "") => {
    setForm((f) => ({ ...f, closed, closedNote: closed ? note : f.closedNote }));
    setCloseAsk(false);
    if (isNew || !company) return;
    const cur = store.snapshot().companies.find((c) => c.id === company.id) ?? company;
    store.upsertCompany({ ...cur, closed, closedNote: closed ? note : cur.closedNote });
    logActivity("company", `${closed ? "사업 종료" : "진행중으로 변경"} · ${cur.name}${closed && note ? ` · ${note}` : ""}`, me?.name);
    flash(closed ? `사업 종료로 바꿨습니다 · ${cur.name}` : `진행중으로 바꿨습니다 · ${cur.name}`);
  };

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

  // extra = 등록과 함께 저장할 계정, goSec = 등록 뒤 열 섹션 `PC-142`
  const save = (extra: CasterAccount[] = [], goSec = "") => {
    if (!form.name.trim()) { flash("업체명은 필수입니다."); return; }
    const withAcc = [...drafts, ...extra];
    // 등록 — 사용 서비스는 함께 추가한 계정들의 서비스로 정한다 `PC-138`
    const savedId = store.upsertCompany({ ...form, id: companyId, ...(isNew ? { services: servicesOfAccounts(withAcc) } : {}) });
    if (isNew) withAcc.forEach((d) => caster.addAccount({ ...d, companyId: savedId, company: form.name.trim() }));
    // 공통코드 사용 고객사(하위) 등록 — 중앙 멤버십에 동기화 (히스토리 시드는 유지)
    //   자기(대표) 코드는 제외 — 대표 회사는 자기 코드의 하위 고객사가 될 수 없다.
    COMMON_CODES.filter((c) => !c.historyOnly && c.company !== form.name.trim()).forEach((c) => {
      if (memberCodes.has(codeKey(c))) addMember(c.k, c.s, c.o, form.name);
      else removeMember(c.k, c.s, c.o, form.name);
    });
    logActivity("company", `${isNew ? "등록" : "수정"} · ${form.name}`, me?.name);
    if (isNew) { router.push(`/companies/${savedId}${goSec ? `?sec=${goSec}` : ""}`); return; }   // 등록 후 상세로 `PC-128` `PC-142`
    setMemberInit(new Set(memberCodes));
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

  // 머리말 요약 · 메뉴 배지
  // 사용 서비스 = 계정들의 서비스 `PC-138`. 계정이 아직 없는 기존 고객사(옛 지정값)는 저장된 값을 함께 보여 준다
  const svcList = [...new Set([...(isNew ? [] : companyServices(company ?? form)), ...servicesOfAccounts(svcAccounts)])];
  const nOn = svcAccounts.filter(isActive).length;
  const nRate = customRateCount(form);
  const NAV: { v: Sec; label: string; badge?: string; grp?: string }[] = [
    { v: "base", label: "기본 정보", grp: "고객사 정보" },
    { v: "rate", label: "편집 단가", badge: nRate ? `전용 ${nRate}` : undefined },
    { v: "docs", label: "관련 서류", badge: form.docs.length ? String(form.docs.length) : undefined },
    { v: "acc", label: "서비스 계정", badge: `${svcList.length ? svcList.map((x) => (x === "CASTERN" ? "casterN" : "폼솔루션")).join("·") + " · " : ""}${svcAccounts.length}`, grp: "운영" },
    { v: "memo", label: "업무 메모", badge: isNew ? undefined : String(companyLogs.length) },
  ];
  const cls = isHolderCo(form.name) ? ["상위 고객사", "#ecfdf5", "#047857"] : isMemberCo(form.name) ? ["하위 고객사", "#f3e8ff", "#7e22ce"] : ["단독", "#f3f4f6", "#9ca3af"];

  // 섹션 카드 — 머리 · 본문 · 아래 [취소][저장] (등록 화면은 [등록])
  // 컴포넌트가 아니라 **렌더 함수**로 둔다 — 렌더마다 새 컴포넌트가 되면 입력칸이 다시 마운트돼 포커스를 잃는다
  const secWrap = ({ sc, title, desc, right, children }: { sc: FormSec; title: string; desc?: string; right?: React.ReactNode; children: React.ReactNode }) => (
    <div style={secCard}>
      <div style={secHd}>
        <b style={{ fontSize: 14 }}>{title}</b>
        {desc && <span style={{ fontSize: 11.5, color: "#9ca3af" }}>{desc}</span>}
        <span style={{ flex: 1 }} />
        {right}
      </div>
      <div style={{ padding: "16px 18px" }}>{children}</div>
      <div style={secFt}>
        {isDirty(sc) && <span style={{ fontSize: 12, color: "#b45309" }}>● 저장하지 않은 변경이 있습니다</span>}
        <span style={{ flex: 1 }} />
        {isNew ? (
          <>
            <Link href="/companies" style={{ ...S.ghost, textDecoration: "none" }}>취소</Link>
            <button onClick={() => save()} style={S.primary}>등록</button>
          </>
        ) : (
          <>
            <button onClick={() => cancelSection(sc)} style={S.ghost} disabled={!isDirty(sc)}>취소</button>
            <button onClick={() => saveSection(sc)} style={S.primary}>저장</button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ padding: "16px 20px", maxWidth: 1680 }}>
      {/* 머리말 — 업체명 · 구분 · 진행 상태 · 요약 · ⋯(고객사 삭제) `PC-136` */}
      <div style={{ ...secCard, padding: "12px 16px", flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <Link href="/companies" title="목록" style={{ ...S.ghost, textDecoration: "none", padding: "5px 11px" }}>←</Link>
        <div style={{ fontSize: 20, fontWeight: 800, color: form.name ? "#111827" : "#c7cdd6" }}>{form.name || (isNew ? "새 고객사" : "")}</div>
        {form.name && <span style={{ ...S.tag, background: cls[1], color: cls[2], fontWeight: 700 }}>{cls[0]}</span>}
        {isNew && <span style={{ ...S.tag, background: "#fff7ed", color: "#c2410c", fontWeight: 700 }}>등록 중</span>}
        <div style={{ display: "flex", gap: 16, marginLeft: 8, color: "#6b7280", fontSize: 12.5, flexWrap: "wrap" }}>
          <span>사용 서비스 <b style={{ color: "#111827" }}>{svcList.length ? svcList.map((x) => (x === "CASTERN" ? "casterN" : "폼솔루션")).join(" · ") : "없음"}</b></span>
          <span>서비스 계정 <b style={{ color: "#111827" }}>{svcAccounts.length}명</b> (활성 {nOn})</span>
          {!isNew && <span>업무 메모 <b style={{ color: "#111827" }}>{companyLogs.length}건</b></span>}
          <span>편집 단가 <b style={{ color: "#111827" }}>{nRate ? `전용 ${nRate}항목` : "기본"}</b></span>
        </div>
        <span style={{ flex: 1 }} />
        {/* 프로젝트 상태 — 고객사 전체를 진행중 / 사업 종료로 `PC-139` */}
        <div style={{ position: "relative" }}>
          <div style={{ display: "inline-flex", border: "1px solid #e5e7eb", borderRadius: 999, overflow: "hidden" }}
            title={form.closed && form.closedNote ? `종료 사유: ${form.closedNote}` : "사업 종료 시 코드 발급 이력만 유지되고, 목록·코드 프로젝트에서 비활성(회색)으로 표시됩니다"}>
            <button type="button" onClick={() => { if (form.closed && (isNew || confirm("진행중으로 되돌릴까요?"))) setStatus(false); }}
              style={{ border: 0, padding: "6px 14px", fontSize: 12.5, cursor: "pointer", fontWeight: !form.closed ? 700 : 400,
                background: !form.closed ? "#ecfdf5" : "#fff", color: !form.closed ? "#047857" : "#9ca3af" }}>진행중</button>
            <button type="button" onClick={() => { if (!form.closed) { setCloseNote(""); setCloseAsk(true); } }}
              style={{ border: 0, borderLeft: "1px solid #e5e7eb", padding: "6px 14px", fontSize: 12.5, cursor: "pointer", fontWeight: form.closed ? 700 : 400,
                background: form.closed ? "#fef2f2" : "#fff", color: form.closed ? "#b91c1c" : "#9ca3af" }}>사업 종료</button>
          </div>
          {closeAsk && (<>
            <div onClick={() => setCloseAsk(false)} style={{ position: "fixed", inset: 0, zIndex: 19 }} />
            <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 20, width: 340, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, boxShadow: "0 12px 32px rgba(15,23,42,.14)", padding: 14 }}>
              <b style={{ fontSize: 13 }}>사업 종료로 바꿀까요?</b>
              <div style={{ fontSize: 11.5, color: "#6b7280", margin: "4px 0 10px", lineHeight: 1.6 }}>코드 발급 이력만 유지되고, 목록·코드 프로젝트에서 비활성(회색)으로 표시됩니다.</div>
              <input style={S.input} value={closeNote} onChange={(e) => setCloseNote(e.target.value)} placeholder="종료 사유 / 코드 이관 메모 (예: 엠베스트-28로 코드 이관)" autoFocus />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                <button type="button" onClick={() => setCloseAsk(false)} style={S.ghost}>취소</button>
                <button type="button" onClick={() => setStatus(true, closeNote.trim())} style={{ ...S.primary, background: "#dc2626", borderColor: "#dc2626" }}>사업 종료</button>
              </div>
            </div>
          </>)}
        </div>
        {/* 등록 화면 — 어느 섹션에서든 [등록] 한 번으로 고객사 + 서비스 계정을 저장한다 `PC-136` */}
        {isNew && (<>
          <Link href="/companies" style={{ ...S.ghost, textDecoration: "none" }}>취소</Link>
          <button onClick={() => save()} style={S.primary}>등록</button>
        </>)}
        {!isNew && (
          <div style={{ position: "relative" }}>
            <button onClick={() => setMoreOpen((o) => !o)} style={{ ...S.ghost, padding: "5px 11px" }} title="더 보기">⋯</button>
            {moreOpen && (<>
              <div onClick={() => setMoreOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 19 }} />
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 20, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, boxShadow: "0 12px 32px rgba(15,23,42,.14)", minWidth: 140, overflow: "hidden" }}>
                <button onClick={() => { setMoreOpen(false); setDelOpen(true); }}
                  style={{ display: "block", width: "100%", textAlign: "left", border: 0, background: "#fff", padding: "10px 14px", fontSize: 12.5, color: "#dc2626", cursor: "pointer" }}>고객사 삭제</button>
              </div>
            </>)}
          </div>
        )}
      </div>

      {toast && <div style={S.toast}>{toast}</div>}

      {/* 섹션 메뉴 | 본문 — 서비스 계정만 본문이 「카드 목록 | 상세」 2칸(전체 3단) `PC-136` */}
      <div style={{ display: "grid", gridTemplateColumns: "210px minmax(0, 1fr)", gap: 12, alignItems: "start" }}>
        <nav style={{ ...secCard, padding: 8 }}>
          {NAV.map((n) => {
            const on = sec === n.v;
            const dirty = isDirty(n.v);
            const locked = n.v === "acc" && !form.name.trim();   // 기본 정보가 먼저 `PC-139`
            return (
              <div key={n.v}>
                {n.grp && <div style={{ fontSize: 10.5, color: "#9ca3af", padding: n.v === "base" ? "6px 12px 2px" : "10px 12px 2px", borderTop: n.v === "base" ? "none" : "1px solid #eef0f4", marginTop: n.v === "base" ? 0 : 6 }}>{n.grp}</div>}
                <button onClick={() => { if (locked) { flash("기본 정보(업체명)를 먼저 입력하세요."); setSec("base"); return; } setSec(n.v); }}
                  title={locked ? "기본 정보(업체명)를 먼저 입력하세요" : undefined}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", border: 0, borderRadius: 9, padding: "9px 12px", cursor: locked ? "not-allowed" : "pointer", fontSize: 13,
                    background: on ? "#eef6ff" : "transparent", color: locked ? "#c7cdd6" : on ? "#1d4ed8" : "#374151", fontWeight: on ? 700 : 400 }}>
                  {n.label}
                  <span style={{ flex: 1 }} />
                  {dirty && <span title="저장하지 않은 변경" style={{ width: 7, height: 7, borderRadius: "50%", background: "#f59e0b" }} />}
                  {n.badge && <span style={{ fontSize: 10.5, borderRadius: 999, padding: "1px 8px", fontWeight: 700, background: on ? "#dbeafe" : "#f3f4f6", color: on ? "#1d4ed8" : "#6b7280" }}>{n.badge}</span>}
                </button>
              </div>
            );
          })}
        </nav>

        <div style={{ minWidth: 0 }}>
          {sec === "base" && secWrap({ sc: "base", title: "기본 정보", desc: "· 필수는 업체명", children: (<>
              <div style={{ ...S.grid2, maxWidth: 900 }}>
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
              </div>
              {/* 프로젝트 상태 · 공통코드 사용 고객사 — 기본 정보에 둔다 `PC-138` */}
              <div style={{ maxWidth: 900, marginTop: 18, paddingTop: 16, borderTop: "1px solid #eef0f4" }}>
                        <div style={{ display: "grid", gap: 14 }}>
                          {/* 공통코드 사용 고객사(하위) 등록 — 대표 회사 아래 귀속. 코드 할당 없이(기 발급) 편집·티켓만 */}
                          <div>
                            <div style={{ ...secHead, margin: "0 0 8px" }}>
                              공통코드 사용 고객사 (하위 등록) <span style={{ color: "#9ca3af", fontWeight: 400 }}>· 대표 회사 아래로 귀속 · 코드 할당 불필요</span>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                              {COMMON_CODES.filter((c) => !c.historyOnly).map((c) => {
                                const key = codeKey(c); const cOn = memberCodes.has(key);
                                const own = !!form.name.trim() && c.company === form.name.trim();   // 이 고객사가 이 코드의 대표(자기 코드) → 비활성화
                                return (
                                  <label key={key} style={{ display: "flex", alignItems: "flex-start", gap: 9, cursor: own ? "not-allowed" : "pointer", opacity: own ? 0.55 : 1,
                                    border: `1px solid ${!own && cOn ? "#bfdbfe" : "#eef0f4"}`, background: own ? "#f3f4f6" : cOn ? "#f5f9ff" : "#fafbfc", borderRadius: 9, padding: "9px 11px" }}>
                                    <input type="checkbox" checked={cOn && !own} disabled={own} style={{ marginTop: 2 }}
                                      onChange={(e) => setMemberCodes((prev) => { const n = new Set(prev); if (e.target.checked) n.add(key); else n.delete(key); return n; })} />
                                    <span style={{ fontSize: 12.5 }}>
                                      <b style={{ color: own ? "#9ca3af" : cOn ? "#1e3a8a" : "#374151" }}>{c.name}</b>
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
                          </div>
                        </div>
              </div>
              {isNew && <div style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 12 }}>업체명을 입력하면 왼쪽 <b>서비스 계정</b>에서 계정을 추가할 수 있습니다. 계정을 추가하면 고객사가 함께 등록됩니다.</div>}
            </>) })}

          {sec === "rate" && secWrap({ sc: "rate", title: "편집 단가", desc: "· 2026 항목별", children: (<>
              <div style={{ maxWidth: 980 }}>
              {(() => {
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
              </div>
            </>) })}

          {sec === "docs" && secWrap({ sc: "docs", title: "관련 서류", desc: "· 항목명 수정 가능", children: (<>
              <div style={{ maxWidth: 900 }}>
          <div style={{ display: "flex", marginBottom: 10 }}><button onClick={addDoc} style={{ ...S.smallBtn, marginLeft: "auto" }}>＋ 서류 추가</button></div>
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
              </div>
            </>) })}

          {/* 서비스 계정 — 카드 목록 | 상세 `PC-128` `PC-136` */}
          {sec === "acc" && !form.name.trim() && (
            <div style={{ ...secCard, padding: "40px 0", alignItems: "center", color: "#9ca3af", fontSize: 12.5 }}>기본 정보(업체명)를 먼저 입력하세요.</div>
          )}
          {sec === "acc" && !!form.name.trim() && (<div style={{ display: "grid", gap: 12 }}>
            <CompanyAccountsPanel accounts={svcAccounts} ops={accountOps} draft={isNew} initialId={prefillEmail}
              companyName={form.name.trim()} companyServices={svcList}
              appKeyOf={(id) => cast.appKeys.find((k) => k.accountId === id)?.key} />
          </div>)}

          {sec === "memo" && (
            <div style={secCard}>
              <div style={secHd}>
                <b style={{ fontSize: 14 }}>업무 메모</b>
                <span style={{ fontSize: 11.5, color: "#9ca3af" }}>· 고객사 전용 원장 · 번호 유지 · 본인 글만 수정/삭제</span>
              </div>
              <div style={{ padding: "16px 18px", maxWidth: 980 }}>
                {isNew ? <div style={emptyBox}>업무 메모는 고객사를 등록한 뒤 기록할 수 있습니다.</div> : (<>
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
                </>)}
              </div>
            </div>
          )}
        </div>
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
const secCard: React.CSSProperties = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, display: "flex", flexDirection: "column" };
const secHd: React.CSSProperties = { padding: "13px 18px", borderBottom: "1px solid #eef0f4", display: "flex", alignItems: "center", gap: 8 };
const secFt: React.CSSProperties = { padding: "11px 18px", borderTop: "1px solid #eef0f4", display: "flex", alignItems: "center", gap: 8 };

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
