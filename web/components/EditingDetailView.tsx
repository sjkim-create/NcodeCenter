"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { S, Field, AutoTextarea } from "./ui";
import { codeKind, kindMeta, type CodeKind } from "@/lib/codeKind";
import { SobpChips } from "./sobp";
import type { WorkKind } from "@/lib/customerData";
import { useAuth, currentUser } from "@/lib/authStore";
import { useStore } from "@/lib/store";
import { assignedSOFor, editableBookNumbers, projectBooks, sharedInfo } from "@/lib/codeUsage";
import { hydrateShared, useSharedOwners, COMMON_LABEL, commonRangesText } from "@/lib/sharedOwners";
import { membersOf, hydrateMembers, useCommonMembers } from "@/lib/commonMembers";
import { setBookOverride } from "@/lib/editOverrides";
import { logActivity } from "@/lib/activityStore";
import { EDIT_CUSTOMERS } from "@/lib/editingData";
import { BASE_RATE, RATE_ITEMS, rateMapOf, settleBook, bookHasDiscount, hasCustomRates, SOUND_QTY, PEN_QTY, type RateMap } from "@/lib/pricing";

const KIND_BG: Record<string, string> = { 요청: "#fef3c7", 처리: "#dcfce7", 메모: "#eef2f7" };
const KIND_FG: Record<string, string> = { 요청: "#92400e", 처리: "#166534", 메모: "#475569" };

type Att = { mode: "file" | "link"; value: string; note: string };
type BookLog = { id: number; no: number; kind: WorkKind; content: string; date: string; author: string; authorEmail?: string; edited?: boolean };
type BR = {
  b: number; s: number; o: number; k: string; pg: number; t: string; f: string; bytes: number; ty: string;
  sm: number[]; pm: number[]; m: string; d: string;
  sp?: number; set?: number; del?: string; nmod?: string; iss?: string; use?: string;
  det?: Att; out?: Att; app?: Att; pmdl?: string; logs?: BookLog[];
  // 프로젝트(교재)별 단가·할인 — 미지정이면 고객사 단가·할인 0
  pu?: number; su?: number; dcRate?: number; dcAmt?: number; dcNote?: string;
  // 등록 시점의 고객사 단가 스냅샷 — 이후 고객사 단가가 바뀌어도 이 교재는 이 단가로 정산한다.
  //   rs = 항목별 단가맵 · rsAt = 적용 시점(YYYY-MM-DD). 없는(구) 교재는 현재 고객사 단가로 계산.
  rs?: RateMap; rsAt?: string;
  cu?: string;   // 사용 고객사 — 공유 OWNER(레퍼런스 코드)일 때만 사용
  _cust?: string;   // 전체 고객사 보기에서만 채워지는 보유 고객사명 `PC-040`
  nhist?: { date: string; movedAt: string; by: string }[];   // 완료→진행중 전환 시 보관하는 ncp2 최종수정 이력
};
type Cust = { customer: string; owner: string; owners?: number[]; codeKinds: string[]; books: number; pages: number; symbols: number; soundSymbols: number; penSymbols: number; sizeMB: number; topMethods?: [string, number][]; bookRows?: BR[] };
const D = { customers: EDIT_CUSTOMERS as unknown as Cust[] };

const SOUND_LABELS = SOUND_QTY.map((r) => r.label);   // 편집(기본)·Compound2~8·슬롯전환·그룹재생·게임·프롬프트·RAG·4도출력 (14)
const PEN_LABELS = PEN_QTY.map((r) => r.label);        // none·action·노트서버 (3)
const SOUND_N = SOUND_QTY.length, PEN_N = PEN_QTY.length;
const zeros = (n: number) => Array<number>(n).fill(0);
// 배열 길이를 현재 항목 수에 맞춤(구 데이터 호환): 부족하면 0 채움, 넘치면 자름
const fitArr = (arr: unknown, n: number): number[] => { const a = Array.isArray(arr) ? arr.map((x) => Number(x) || 0) : []; return Array.from({ length: n }, (_, i) => a[i] ?? 0); };
const TYPES = ["소리펜", "필기펜", "교원구몬/KEP"];
const STATES = ["진행중", "완료", "보류"] as const;
const ST_COLOR: Record<string, { bg: string; fg: string }> = {
  진행중: { bg: "#eef6ff", fg: "#2563eb" }, 완료: { bg: "#dcfce7", fg: "#166534" }, 보류: { bg: "#fef3c7", fg: "#92400e" },
};
// 기존 데이터(O/X)는 진행중으로 간주
const stateOf = (v?: string) => (v === "완료" || v === "보류" || v === "진행중" ? v : "진행중");
const PEN_MODELS = ["C30(PO)", "C71(BH)", "C71(BH2)", "C71(BH5)", "C71(BH6)", "C90", "C91", "C133", "C160", "C161", "C190", "C192", "C200", "C1000(PO)", "NSP-C1000-PO", "연구수업용"];
const METHODS = [
  "기능 없음",
  "소리펜_기본", "소리펜_멀티터치", "소리펜_멀티언어", "소리펜_그룹재생(0x02)", "소리펜_슬롯전환(0x20)", "소리펜_게임", "소리펜_영상호출", "소리펜_LED(핀덴카)", "소리펜_녹음재생", "소리펜_기타 기능", "소리펜_프롬프트", "소리펜_발음평가",
  "필기펜_공유", "필기펜_플래너 연동", "필기펜_URL 링크 연동", "필기펜_gif 연동", "필기펜_PDF 연동", "필기펜_MP3 연동", "필기펜_기타 기능", "KEP_ICT(필기펜)", "교원구몬_내공100",
];

const won = (n: number) => `₩${Math.round(n).toLocaleString()}`;
const today = () => new Date().toISOString().slice(0, 10);
const sSum = (r: BR) => r.sm.reduce((a, b) => a + b, 0);
const pSum = (r: BR) => r.pm.reduce((a, b) => a + b, 0);
const tSum = (r: BR) => sSum(r) + pSum(r);
// Ncode 정보 기준 Book 최대치 (PDS·Section별)
const BOOK_MAX: Record<string, Record<number, number>> = {
  N: { 0: 16384, 3: 8192, 5: 4096, 10: 4096, 11: 8192, 14: 8192, 15: 4096 },
  G: { 0: 8192, 3: 4096, 14: 4096 },
};
const EMPTY = (o: number): BR => ({ b: 0, s: 0, o, k: "N", pg: 0, t: "", f: "", bytes: 0, ty: "소리펜", sm: zeros(SOUND_N), pm: zeros(PEN_N), m: "", d: "" });

// bookIdx — 교재 편집 화면(모달이 아니라 별도 페이지)에서만 넘어온다.
//   "new" = 교재(책) 추가 · 숫자 = rows 인덱스의 교재 수정
export default function EditingDetailView({ owner: ownerProp, custName, embedded, seedCustomer, ownerFilter, pdsLock, allCustomers, bookIdx }: { owner?: string; custName?: string; embedded?: boolean; seedCustomer?: Cust; ownerFilter?: number | null; pdsLock?: CodeKind | ""; allCustomers?: boolean; bookIdx?: string } = {}) {
  const params = useParams();
  const router = useRouter();
  const owner = String(ownerProp ?? params.owner ?? "");
  const bookMode = bookIdx != null;
  const listHref = `/projects/editing/${encodeURIComponent(owner)}`;
  const bookHref = (i: number | "new") => `${listHref}/book/${i}`;
  const authState = useAuth();
  const staff = authState.users.filter((u) => u.enabled); // 발급인(코드 할당자) 명단
  const me = currentUser(authState);
  // 본인이 작성한 메모만 수정·삭제 가능
  const isMine = (l: BookLog) => !!me && (l.authorEmail ? l.authorEmail === me.email : l.author === me.name);
  // 고객사 식별은 이름 우선 (분리된 네오노트-0-27/3-27 등은 owner가 모두 27로 같아 owner만으론 충돌)
  // 전체 고객사 모드 — 모든 고객사의 교재를 한 목록으로 본다(읽기 전용) `PC-040`
  const allCust = useMemo<Cust | undefined>(() => {
    if (!allCustomers) return undefined;
    const rows2 = D.customers.flatMap((c) => (c.bookRows ?? []).map((r) => ({ ...r, _cust: c.customer })));
    return { customer: "전체 고객사", owner: "", owners: [], codeKinds: [], books: rows2.length,
      pages: 0, symbols: 0, soundSymbols: 0, penSymbols: 0, sizeMB: 0, bookRows: rows2 as BR[] };
  }, [allCustomers]);
  const cust = allCust
    ?? (custName ? D.customers.find((c) => c.customer === custName) : undefined)
    ?? D.customers.find((c) => c.owner === owner) ?? seedCustomer;
  const st = useStore(); // 코드 프로젝트(발급 내역) — 할당된 S/O 조회용

  const key = `ncc-edit12-${cust?.customer ?? owner}`;   // v12: 고객사명 식별(오너 충돌 방지) — 옛 편집 캐시 폐기
  const readOnly = !!allCustomers;                        // 전체 고객사 보기 = 조회 전용
  // 구버전 데이터(mb=MB) → bytes 로 정규화
  // 빌드 데이터는 빈 값/0 배열을 빼서 내보내므로 여기서 기본값을 복원한다 (구버전 mb=MB → bytes 도 정규화)
  const norm = (arr: unknown[]): BR[] => (arr as (BR & { mb?: number })[]).map((r) => ({
    ...r,
    pg: r.pg ?? 0, t: r.t ?? "", f: r.f ?? "", m: r.m ?? "", d: r.d ?? "", ty: r.ty ?? "소리펜",
    sm: fitArr(r.sm, SOUND_N), pm: fitArr(r.pm, PEN_N),
    bytes: r.bytes ?? Math.round(((r.mb ?? 0) as number) * 1e6),
  }));
  const base = useMemo(() => norm(cust?.bookRows ?? []), [cust]);
  const [rows, setRows] = useState<BR[]>(base);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [fS, setFS] = useState<number | null>(null);   // Section 필터
  const [fO, setFO] = useState<number | null>(null);   // Owner 필터
  const [fB, setFB] = useState<number | null>(null);   // Book 필터
  const [fM, setFM] = useState("");                    // 편집방식 필터
  const [fT, setFT] = useState("");                    // 타입 필터
  const [fK, setFK] = useState("");                    // 코드(PDS) 필터
  const [fSt, setFSt] = useState("");                  // 진행 상태 필터
  const [fCu, setFCu] = useState("");                  // 사용 고객사 필터 (공유 코드)
  const [fOwnerCust, setFOwnerCust] = useState("");    // 고객사 필터 — 전체 고객사 보기 `PC-040`
  useSharedOwners();                                   // 공유 OWNER 변경 시 리렌더
  useEffect(() => { hydrateShared(); hydrateMembers(); }, []);
  useCommonMembers();
  const [sort, setSort] = useState<{ key: "t" | "d" | null; dir: 1 | -1 }>({ key: null, dir: 1 });   // 교재명·발급일 정렬
  // 고객사 단가 — 고객사 관리에 입력된 값. 없으면 기본 단가(500/1,000)
  const nzc = (x: string) => x.replace(/\s+/g, "").replace(/\(.*\)/g, "").toLowerCase();
  const myCompany = useMemo(
    () => st.companies.find((c) => nzc(c.name) === nzc(cust?.customer ?? "")),
    [st.companies, cust]
  );
  const rateMap: RateMap = rateMapOf(myCompany);   // 항목별 단가(고객사 기준)
  const customRates = hasCustomRates(myCompany);    // 고객사 전용 단가 존재 여부
  const applyUnit = rateMap.s_page;   // 적용 단가(페이지) — 표시용 대표값
  const editUnit = rateMap.s_edit;    // 편집(기본) 단가 — 표시용 대표값
  const [editing, setEditing] = useState<{ idx: number; row: BR } | null>(null);
  const [pick, setPick] = useState("");
  const [penPick, setPenPick] = useState("");
  const [basis, setBasis] = useState(false);
  const [kepOpen, setKepOpen] = useState(false);
  const [logDraft, setLogDraft] = useState<{ id: number | null; kind: WorkKind; content: string }>({ id: null, kind: "요청", content: "" });
  const [toast, setToast] = useState("");

  // 고객사(owner) 전환 시 해당 고객사 데이터로 재로드 (localStorage 우선, 없으면 시드)
  useEffect(() => {
    setEditing(null); setQ(""); setPage(1); setFS(null); setFO(null); setFB(null); setFM(""); setFT(""); setFK(""); setFSt(""); setFCu(""); setFOwnerCust(""); setSort({ key: null, dir: 1 });
    if (allCustomers) { setRows(base); return; }             // 전체 보기는 캐시를 쓰지 않는다
    try { const raw = localStorage.getItem(key); setRows(raw ? norm(JSON.parse(raw)) : base); }
    catch { setRows(base); }
  }, [key, base]);
  useEffect(() => { setPage(1); }, [ownerFilter, pdsLock, fS, fO, fB, fM, fT, fK, fSt, fCu, fOwnerCust]);
  const toggleSort = (k: "t" | "d") => { setSort((s2) => (s2.key === k ? (s2.dir === 1 ? { key: k, dir: -1 } : { key: null, dir: 1 }) : { key: k, dir: 1 })); setPage(1); };
  // 저장 실패(용량 초과) 시 다른 편집 캐시를 비우고 재시도 — 조용히 사라지지 않도록 경고
  const commit = (next: BR[]) => {
    if (readOnly) { flash("전체 고객사 보기는 조회 전용입니다. 고객사를 선택해 수정하세요."); return; }
    setRows(next);
    const payload = JSON.stringify(next);
    try { localStorage.setItem(key, payload); return; }
    catch { /* 아래에서 정리 후 재시도 */ }
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("ncc-edit") && k !== key)   // 재생성 가능한 다른 고객사 캐시
        .forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(key, payload);
    } catch {
      flash("⚠ 브라우저 저장 공간이 가득 차 저장하지 못했습니다. 다른 사이트 데이터를 정리한 뒤 다시 저장하세요.");
    }
  };

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3000); };
  // 교재에 적용할 단가 — 등록 시 스냅샷(rs)이 있으면 그것, 없으면 현재 고객사 단가
  const rateOf = (r: BR): RateMap => r.rs ?? rateMap;
  // 교재 1건 정산 (교재 단가 스냅샷 → 교재별 할인 적용)
  const bill = (r: BR) => settleBook({ ty: r.ty, pg: r.pg, sm: r.sm, pm: r.pm, dcRate: r.dcRate, dcAmt: r.dcAmt }, rateOf(r));
  const cost = (r: BR) => bill(r).total;                 // 청구액
  const discounted = (r: BR) => bookHasDiscount(r);

  if (!cust) return <div style={{ padding: 24 }}>편집 데이터를 찾을 수 없습니다. (owner {owner}) <Link href="/projects/editing">← 목록</Link></div>;

  // 교원구몬/KEP·산출물이 필요한 프로젝트인지 (현재는 구몬학습 등 실제 데이터 있는 곳만)
  const hasKep = (cust.bookRows ?? []).some((r) => r.det || r.out || r.app || r.use || r.set || (r.pm?.[4] ?? 0) > 0);   // KEP = 필기펜 항목 index 4
  const bookHasKep = (r: BR) => !!(r.det || r.out || r.app || r.use || r.set);

  // 업무요청 메모 = 교재(책) 단위 (메모1~3 대체). editing.row.logs 에 저장.
  const bookLogs = editing ? [...(editing.row.logs ?? [])].sort((a, b) => a.no - b.no) : [];
  const submitMemo = () => {
    if (!editing || !logDraft.content.trim()) return;
    const logs = editing.row.logs ?? [];
    if (logDraft.id) {
      const target = logs.find((l) => l.id === logDraft.id);
      if (target && !isMine(target)) { alert("본인이 작성한 메모만 수정할 수 있습니다."); return; }
      // 수정 시 날짜를 수정일로 갱신 (작성자 유지)
      setF("logs", logs.map((l) => (l.id === logDraft.id ? { ...l, kind: logDraft.kind, content: logDraft.content.trim(), date: today(), edited: true } : l)));
    } else {
      const no = Math.max(0, ...logs.map((l) => l.no)) + 1;
      const id = Math.max(0, ...logs.map((l) => l.id)) + 1;
      setF("logs", [...logs, { id, no, kind: logDraft.kind, content: logDraft.content.trim(), date: today(), author: me?.name ?? "미로그인", authorEmail: me?.email ?? "" }]);
    }
    setLogDraft({ id: null, kind: "요청", content: "" });
  };
  const delMemo = (l: BookLog) => {
    if (!isMine(l)) { alert(`${l.author} 님이 작성한 메모입니다. 본인 글만 삭제할 수 있습니다.`); return; }
    setF("logs", (editing?.row.logs ?? []).filter((x) => x.id !== l.id));
  };
  const startEditMemo = (l: BookLog) => {
    if (!isMine(l)) { alert(`${l.author} 님이 작성한 메모입니다. 본인 글만 수정할 수 있습니다.`); return; }
    setLogDraft({ id: l.id, kind: l.kind, content: l.content });
  };

  const uniqS = (a: string[]) => [...new Set(a.filter(Boolean))].sort((x, y) => x.localeCompare(y, "ko"));
  // 편집방식은 "A, B" 복수 저장 → 개별 항목으로 펼쳐서 옵션 구성
  const methodsOf = (r: BR) => (r.m ? r.m.split(",").map((s) => s.trim()).filter(Boolean) : []);
  const methodOpts = uniqS(rows.flatMap(methodsOf));
  const typeOpts = uniqS(rows.map((r) => r.ty));
  // 코드 종류(좌표 속성) — PDS3 · PDS2 · PDS4(Section 44) · OID(옛 IDS 포함) `PC-037`
  const kindOpts = uniqS(rows.map((r) => codeKind(r.k, r.s)));
  const ownerCustOpts = uniqS(rows.map((r) => r._cust ?? ""));   // 전체 보기의 고객사 목록
  // 공유 OWNER(레퍼런스 코드)를 쓰는 교재 → 실제 사용 고객사를 별도 항목으로 관리
  const isSharedRow = (r: BR) => !!sharedInfo(r.s, r.o, r.k);
  const hasSharedRows = rows.some(isSharedRow);
  const custOpts = uniqS(rows.filter(isSharedRow).map((r) => r.cu ?? ""));
  // 커먼 코드 사용 고객사 후보 — 중앙 멤버십(히스토리 + 고객사 등록)에서 이 코드(k/s/o)의 하위 고객사
  const commonCandidates = (k: string, sec: number, own: number) => membersOf(k, sec, own).map((m) => m.name);
  const filtered = rows.map((r, i) => [r, i] as const)
    .filter(([r]) => (pdsLock ? codeKind(r.k, r.s) === pdsLock : true))   // 목록에서 고른 코드 종류 강제
    .filter(([r]) => (ownerFilter == null ? true : r.o === ownerFilter))
    .filter(([r]) => (fS == null ? true : r.s === fS))
    .filter(([r]) => (fO == null ? true : r.o === fO))
    .filter(([r]) => (fB == null ? true : r.b === fB))
    .filter(([r]) => (fM ? methodsOf(r).includes(fM) : true))
    .filter(([r]) => (fT ? r.ty === fT : true))
    .filter(([r]) => (fK ? codeKind(r.k, r.s) === fK : true))
    .filter(([r]) => (fOwnerCust ? r._cust === fOwnerCust : true))
    .filter(([r]) => (fSt ? stateOf(r.use) === fSt : true))
    .filter(([r]) => (fCu ? (r.cu ?? "") === fCu : true))
    .filter(([r]) => (q ? `${r.t ?? ""} ${r.cu ?? ""}`.toLowerCase().includes(q.toLowerCase()) : true));   // 교재명·사용고객사 검색
  // 교재명(가나다) / 발급일(날짜) 정렬 — 값 없는 행은 항상 뒤로
  if (sort.key) {
    const k = sort.key;
    filtered.sort(([a], [b]) => {
      const va = (k === "t" ? a.t : a.d) ?? "", vb = (k === "t" ? b.t : b.d) ?? "";
      if (!va && !vb) return 0;
      if (!va) return 1;
      if (!vb) return -1;
      return k === "t" ? va.localeCompare(vb, "ko") * sort.dir : (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
    });
  }
  // 페이징 (전체 건수 모두 열람 가능)
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const curPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((curPage - 1) * perPage, curPage * perPage);

  // 요약·비용은 현재 필터(S/O/B·검색) 결과 기준으로 집계
  const agg = filtered.reduce((a, [r]) => {
    const b = bill(r);
    return { books: a.books + 1, pages: a.pages + r.pg, sound: a.sound + sSum(r), pen: a.pen + pSum(r), sym: a.sym + tSum(r),
             bytes: a.bytes + r.bytes, cost: a.cost + b.total, listed: a.listed + b.gross, dc: a.dc + b.discount,
             pageAmt: a.pageAmt + b.pageAmt, symAmt: a.symAmt + b.symAmt,   // PDF편집비 · 심볼편집비 (할인 전)
             dcBooks: a.dcBooks + (discounted(r) ? 1 : 0) };
  }, { books: 0, pages: 0, sound: 0, pen: 0, sym: 0, bytes: 0, cost: 0, listed: 0, dc: 0, pageAmt: 0, symAmt: 0, dcBooks: 0 });
  const aggPct = agg.listed > 0 ? Math.round((agg.dc / agg.listed) * 1000) / 10 : 0;
  const isFiltered = fS != null || fO != null || fB != null || !!fM || !!fT || !!fK || !!fSt || !!fCu || !!fOwnerCust || !!q;
  const clearFilters = () => { setFS(null); setFO(null); setFB(null); setFM(""); setFT(""); setFK(""); setFSt(""); setFCu(""); setFOwnerCust(""); setQ(""); setPage(1); };

  // 할당된 S/O (수정 불가) — 편집 데이터 + 소유권 데이터 + 코드 프로젝트 발급 내역
  const allocBooks = useMemo(() => projectBooks(st.projects, st.companies), [st]);
  const assignedSO = useMemo(
    () => assignedSOFor(cust?.customer ?? "", allocBooks),
    [cust, allocBooks]
  );

  // 사용 가능한 Book 번호 — 발급된 SO 아래 편집 안 된(사용 가능) Book 을 노출 (편집된 Book 만 제외)
  const freeBooks = (k: string, sec: number, own: number, keep?: number) =>
    editableBookNumbers(k, sec, own, BOOK_MAX[k]?.[sec] ?? 4096, 300, keep, allocBooks);

  // 교재 편집은 별도 페이지 — 목록에서는 이동만 하고, 편집 상태는 그 페이지에서 만든다.
  const openAdd = () => router.push(bookHref("new"));
  const openEdit = (idx: number) => router.push(bookHref(idx));

  // 편집 페이지 진입 시 대상 교재를 폼에 올린다 (rows 가 localStorage 로 채워진 뒤)
  useEffect(() => {
    if (!bookMode || editing) return;
    if (bookIdx === "new") {
      const a = assignedSO[0];                      // 할당된 S/O 기본값 (수정 불가)
      const row = EMPTY(Number(owner) || 0);
      if (a) { row.k = a.k; row.s = a.s; row.o = a.o; row.b = freeBooks(a.k, a.s, a.o)[0] ?? 0; }
      setKepOpen(true); setLogDraft({ id: null, kind: "요청", content: "" });
      setEditing({ idx: -1, row });
      return;
    }
    const idx = Number(bookIdx);
    const r = rows[idx];
    if (!r) return;
    setKepOpen(bookHasKep(r)); setLogDraft({ id: null, kind: "요청", content: "" });
    setEditing({ idx, row: { ...r, sm: [...r.sm], pm: [...r.pm], logs: r.logs ? r.logs.map((l) => ({ ...l })) : [] } });
  }, [bookMode, bookIdx, rows, editing, assignedSO, owner]);   // eslint-disable-line react-hooks/exhaustive-deps
  const setF = <K extends keyof BR>(k: K, v: BR[K]) => setEditing((e) => (e ? { ...e, row: { ...e.row, [k]: v } } : e));
  const setSm = (i: number, v: number) => setEditing((e) => (e ? { ...e, row: { ...e.row, sm: e.row.sm.map((x, j) => (j === i ? v : x)) } } : e));
  const setPm = (i: number, v: number) => setEditing((e) => (e ? { ...e, row: { ...e.row, pm: e.row.pm.map((x, j) => (j === i ? v : x)) } } : e));
  // 진행 상태 변경 — 완료는 ncp2 최종수정 필수, 완료 해제 시 날짜를 이력으로 이관
  const changeState = (next: string) => {
    if (!editing) return;
    const cur = stateOf(editing.row.use);
    if (next === "완료" && !(editing.row.nmod ?? "").trim()) {
      alert("ncp2 최종수정 날짜가 비어 있어 완료할 수 없습니다. 날짜를 입력한 뒤 완료로 변경하세요.");
      return;
    }
    if (cur === "완료" && next !== "완료") {
      const keep = (editing.row.nmod ?? "").trim();
      const hist = keep
        ? [...(editing.row.nhist ?? []), { date: keep, movedAt: today(), by: me?.name ?? "" }]
        : (editing.row.nhist ?? []);
      // 편집 재요청 → 날짜는 비우고 이력으로 남김
      setEditing((e) => (e ? { ...e, row: { ...e.row, use: next, nmod: "", nhist: hist } } : e));
      return;
    }
    setF("use", next);
  };

  const locked = stateOf(editing?.row.use) === "완료";   // 완료 = 내용 잠금

  const saveRow = () => {
    if (!editing) return;
    // 공유 OWNER는 여러 고객사가 함께 쓰므로 어느 고객사 것인지 반드시 남긴다
    if (isSharedRow(editing.row) && !(editing.row.cu ?? "").trim()) {
      alert(`S${editing.row.s}/O${editing.row.o} 는 공유 코드입니다. 사용 고객사를 입력하세요.`); return;
    }
    // 단가 스냅샷 — 신규 교재는 현재 고객사 단가로 고정한다.
    // 스냅샷이 없는 구 교재도 저장 시점에 현재 적용 단가로 고정해, 이후 단가 변경의 영향을 받지 않게 한다.
    const r: BR = editing.row.rs ? editing.row : { ...editing.row, rs: { ...rateMap }, rsAt: today() };
    const next = editing.idx === -1 ? [r, ...rows] : rows.map((x, i) => (i === editing.idx ? r : x));
    commit(next);
    // 공유(커먼) 코드면 SOBP 맵에 사용 고객사·상태(편집)를 반영 (편집 프로젝트 등록 = 편집 관리 → ea=1)
    if (isSharedRow(r) && (r.cu ?? "").trim()) setBookOverride(r.k, r.s, r.o, r.b, { cu: r.cu!.trim(), ea: 1 });
    if (editing.idx === -1) logActivity("bookAdd", `${cust?.customer ?? owner} · S${editing.row.s}/O${editing.row.o}/B${editing.row.b} · ${editing.row.t || "교재"}`, me?.name);
    else logActivity("bookEdit", `${cust?.customer ?? owner} · S${editing.row.s}/O${editing.row.o}/B${editing.row.b} · ${editing.row.t || "교재"}`, me?.name);
    setEditing(null);
    router.push(listHref);        // 저장 후 교재 목록으로
  };
  const delRow = (idx: number) => {
    if (!confirm("이 책(교재) 편집 행을 삭제할까요?")) return;
    commit(rows.filter((_, i) => i !== idx));
    setEditing(null);
    if (bookMode) router.push(listHref);
  };

  const selMethods = editing?.row.m ? editing.row.m.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const addMethod = (v: string) => { if (v && !selMethods.includes(v)) setF("m", [...selMethods, v].join(", ")); setPick(""); };
  const rmMethod = (v: string) => setF("m", selMethods.filter((x) => x !== v).join(", "));

  const selPens = editing?.row.pmdl ? editing.row.pmdl.split(/[/,]/).map((s) => s.trim()).filter(Boolean) : [];
  const addPen = (v: string) => { if (v && !selPens.includes(v)) setF("pmdl", [...selPens, v].join(" / ")); setPenPick(""); };
  const rmPen = (v: string) => setF("pmdl", selPens.filter((x) => x !== v).join(" / "));

  return (
    <div style={{ padding: embedded ? "2px 2px 18px" : "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        {!embedded && <Link href="/projects/editing" style={{ ...S.ghost, textDecoration: "none", padding: "6px 12px" }}>← 편집 프로젝트</Link>}
        <div style={{ fontSize: 18, fontWeight: 700 }}>{cust.customer}</div>
        <span style={{ ...S.tag, fontFamily: "ui-monospace,monospace" }}>owner {cust.owners && cust.owners.length ? cust.owners.join("·") : owner}</span>
        {[...new Set((cust.bookRows ?? []).map((r) => codeKind(r.k, r.s)))].map((k) => <span key={k} style={{ ...S.tag, background: kindMeta(k).bg, color: kindMeta(k).color, fontWeight: 700 }}>{kindMeta(k).short}</span>)}
        <div style={{ flex: 1 }} />
        {!readOnly && <button onClick={() => { if (confirm("엑셀 시드로 초기화할까요?")) { commit(base); flash("초기화됨"); } }} style={{ ...S.ghost, marginRight: 8 }}>초기화</button>}
        {!readOnly && <button onClick={openAdd} style={S.primary}>＋ 교재(책) 추가</button>}
      </div>

      {toast && <div style={S.toast}>{toast}</div>}

      {/* 교재 편집 페이지에서는 목록·KPI·필터를 감춘다 (모달이 아니라 별도 화면) */}
      {!bookMode && (<>

      {/* KPI — 편집량(수량) · 정산(금액) 2묶음 */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <KpiGroup title="편집량" grow={5} items={[
          [isFiltered ? "교재(책)·필터" : "교재(책)", agg.books.toLocaleString(), ""],
          ["TOTAL PAGE", agg.pages.toLocaleString(), "PDF 편집 대상"],
          ["소리펜 심볼 합", agg.sound.toLocaleString(), ""],
          ["필기펜 심볼 합", agg.pen.toLocaleString(), ""],
          ["심볼 합계", agg.sym.toLocaleString(), "소리펜+필기펜"],
        ]} />
        <KpiGroup title="정산" grow={3} accent items={[
          ["적용비(페이지)", won(agg.pageAmt), `${agg.pages.toLocaleString()}p × ${applyUnit.toLocaleString()}`],
          ["편집·기능비", won(agg.symAmt), `심볼·기능 ${agg.sym.toLocaleString()} (항목별 단가)`],
          ["청구액", won(agg.cost), agg.dc !== 0 ? `할인 −${won(agg.dc)}` : "할인 없음"],
        ]} />
      </div>

      <div style={{ ...S.card, padding: "10px 12px", marginBottom: 10, fontSize: 12.5, color: "#374151", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ ...S.tag, background: customRates ? "#fef3c7" : "#f3f4f6", color: customRates ? "#92400e" : "#6b7280", fontWeight: 700 }}
          title={(customRates ? "고객사 관리에서 지정한 전용 단가(항목별)" : "고객사 전용 단가가 없어 전사 기본 단가로 계산합니다.") + " · 신규 교재에 적용되는 단가입니다. 기존 교재는 등록 시점 단가로 정산됩니다."}>
          {customRates ? "고객사 단가" : "기본 단가"} (신규 교재 기준) : 적용 - {applyUnit.toLocaleString()}원/페이지 · 편집(기본) - {editUnit.toLocaleString()}원/심볼
        </span>
        {customRates && (
          <span style={{ fontSize: 11, color: "#9ca3af" }}>항목별 단가는 고객사 관리 참조</span>
        )}
        {agg.dcBooks > 0 && (
          <span style={{ ...S.tag, background: "#eef6ff", color: "#2563eb" }} title="고객사 단가와 다른 단가·할인이 걸린 교재 수 — 단가는 각 행의 정산 칸에 표시됩니다">
            프로젝트 단가·할인 {agg.dcBooks}건
          </span>
        )}
        {agg.dc !== 0 && (
          <span style={{ ...S.tag, background: "#fee2e2", color: "#b91c1c", fontWeight: 700 }} title={`할인 적용 교재 ${agg.dcBooks}건 · 기준가 ${won(agg.listed)}`}>
            할인 −{won(agg.dc)} ({aggPct}%)
          </span>
        )}
        <span>청구액 <b style={{ color: "#2563eb", fontSize: 15 }}>{won(agg.cost)}</b></span>
        <div style={{ position: "relative" }}>
          <button onClick={() => setBasis((v) => !v)} title="계산식 · 단가 근거"
            style={{ width: 22, height: 22, borderRadius: "50%", border: "1px solid #bfdbfe", background: basis ? "#2563eb" : "#eff6ff", color: basis ? "#fff" : "#2563eb", cursor: "pointer", fontWeight: 700, fontSize: 12, lineHeight: 1 }}>?</button>
          {basis && (
            <div style={basisBox}>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>계산식 · 단가 근거</div>
              <div style={{ color: "#9ca3af", marginBottom: 8 }}>단가는 3단계로 적용됩니다 — 기본 단가 → 고객사 단가(고객사 관리) → 프로젝트 단가·할인(교재 편집 수정).</div>

              {/* 현재 화면(필터 반영) 계산식 */}
              <div style={{ background: "#f5f9ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "9px 11px", marginBottom: 10, color: "#1e3a8a" }}>
                <div style={{ fontWeight: 700, marginBottom: 5 }}>◼ 현재 집계 계산식 {isFiltered && <span style={{ color: "#2563eb" }}>(필터 {filtered.length.toLocaleString()}건 기준)</span>}</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
                  <tbody>
                    <Line label="적용비용" detail={`페이지 ${agg.pages.toLocaleString()} × ${applyUnit.toLocaleString()}`} value={won(agg.pageAmt)} />
                    <Line label="편집·기능비" detail={`심볼·기능 ${agg.sym.toLocaleString()} (항목별 단가 합)`} value={`＋ ${won(agg.symAmt)}`} />
                    <Line label="기준가" detail="고객사 단가 기준 합계" value={won(agg.listed)} />
                    {agg.dc !== 0 && <Line label={`할인 (${aggPct}%)`} detail={`할인 적용 교재 ${agg.dcBooks}건`} value={`− ${won(agg.dc)}`} minus />}
                    <tr style={{ borderTop: "2px solid #bfdbfe" }}>
                      <td style={{ padding: "7px 0", fontWeight: 700 }}>청구액</td>
                      <td style={{ padding: "7px 0", textAlign: "right", fontWeight: 700, fontSize: 14, color: "#2563eb", fontFamily: "ui-monospace,monospace" }}>{won(agg.cost)}</td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px dashed #bfdbfe", color: "#374151" }}>
                  적용 단가 <b>{won(applyUnit)}</b>/페이지 · 편집 단가 <b>{won(editUnit)}</b>/심볼
                  <span style={{ marginLeft: 6, color: "#6b7280" }}>
                    {customRates ? `— ${cust?.customer} 전용 단가 (기본 ${BASE_RATE.page}/${BASE_RATE.symbol})` : "— 전사 기본 단가"}
                  </span>
                  {!myCompany && <div style={{ color: "#b45309", marginTop: 3 }}>※ 고객사 관리에 등록되지 않아 기본 단가로 계산됩니다.</div>}
                </div>
              </div>

              <div style={{ fontWeight: 700, color: "#111827", marginBottom: 4 }}>◼ 소리펜 변경후 단가 <span style={{ color: "#dc2626" }}>(전사 기본값)</span></div>
              <ul style={{ margin: "0 0 6px", paddingLeft: 16, lineHeight: 1.7 }}>
                <li>적용 <b>₩500</b>/페이지 <span style={{ color: "#9ca3af" }}>(변경전 300)</span></li>
                <li>편집 <b>₩1,000</b>/심볼 <span style={{ color: "#9ca3af" }}>(변경전 900)</span></li>
                <li style={{ color: "#9ca3af" }}>전 고객사 공통(교원구몬·대교·웅진·YBM·크레버스 등). 예외: 잉글리시에그 편집 변경전 600, 트윈클은 보드 단가(정규3장 50만·비정규1장 10만·코드재적용 장당 5만).</li>
              </ul>
              <div style={{ borderTop: "1px solid #eef0f4", paddingTop: 8, marginBottom: 2, fontWeight: 700 }}>◼ 개별 견적서 (참고)</div>

              <div style={{ fontWeight: 700, color: "#2563eb", marginBottom: 2 }}>① 2026-07-16 · 양지사 플래너 4종</div>
              <ul style={{ margin: "0 0 8px", paddingLeft: 16, lineHeight: 1.7 }}>
                <li>적용 <b>500원</b>/페이지 · 편집 <b>1,000~1,500원</b>/심볼 · 노트서버 업로드 <b>10,000원</b>/건</li>
                <li style={{ color: "#9ca3af" }}>합계 ₩35,232,000 (VAT 별도)</li>
              </ul>

              <div style={{ fontWeight: 700, color: "#2563eb", marginBottom: 2 }}>② 2026-05-26 · 블루래빗 생생자연관찰</div>
              <ul style={{ margin: "0 0 8px", paddingLeft: 16, lineHeight: 1.7 }}>
                <li>적용 <b>1,000원</b>/페이지 · 편집(기본) <b>2,000원</b>/심볼 · 편집(프롬프트) <b>50,000원</b>/세션</li>
                <li style={{ color: "#9ca3af" }}>총 ₩30,514,000 (VAT 포함)</li>
              </ul>

              <div style={{ borderTop: "1px solid #eef0f4", paddingTop: 8, color: "#374151", lineHeight: 1.7 }}>
                <div><b>정의</b></div>
                · 적용 = PDF 1페이지 당 (인쇄데이터에 Ncode 적용)<br />
                · 편집(기본) = <b>음원 재생 영역 1개 = 심볼</b> (mp3 개수와 다름)<br />
                · 프롬프트 = 대화(포코로) 세션 1개 당 · 별도 단가
              </div>
              <div style={{ textAlign: "right", marginTop: 8 }}><button onClick={() => setBasis(false)} style={S.linkBtn}>닫기</button></div>
            </div>
          )}
        </div>
        {isFiltered && (
          <button onClick={clearFilters}
            style={{ ...S.smallBtn, marginLeft: "auto", color: "#2563eb", whiteSpace: "nowrap" }}>
            필터 해제 ({filtered.length.toLocaleString()}/{rows.length.toLocaleString()})
          </button>
        )}
        <div style={{ position: "relative", marginLeft: isFiltered ? 8 : "auto" }}>
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder={hasSharedRows ? "교재명·사용고객사 검색" : "교재명 검색"} style={{ ...S.input, width: hasSharedRows ? 260 : 220, paddingRight: 26 }} />
          {q && <button onClick={() => { setQ(""); setPage(1); }} title="검색어 지우기"
            style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", border: 0, background: "none", color: "#9ca3af", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>×</button>}
        </div>
      </div>

      <div style={{ ...S.card, padding: 0, overflow: "auto" }}>
        <table style={{ ...S.table, textAlign: "center", minWidth: 1120 }}>
          <thead>
            {/* 공유 OWNER를 쓰는 고객사면 "사용 고객사" 열이 교재명 왼쪽에 추가된다 */}
            <tr>{["No", "상태", ...(readOnly ? ["고객사"] : []), ...(hasSharedRows ? ["사용 고객사"] : []), "교재명", "코드", "타입", "S/O/B", "페이지", "심볼 개수", "편집방식", "발급일", "최종 수정일", "메모", "ncp2 크기(byte)", "정산 (청구액)"].map((h) => {
              const k = h === "교재명" ? "t" : h === "발급일" ? "d" : null;   // 정렬 가능한 항목
              return (
                <th key={h} style={{ ...S.th, textAlign: "center", cursor: k ? "pointer" : "default", userSelect: "none" }}
                  onClick={() => k && toggleSort(k)} title={k ? "클릭하면 오름차순 → 내림차순 → 해제" : undefined}>
                  {h}{k && <span style={{ marginLeft: 3, color: sort.key === k ? "#2563eb" : "#d1d5db" }}>{sort.key === k ? (sort.dir === 1 ? "▲" : "▼") : "↕"}</span>}
                </th>
              );
            })}</tr>
            {/* 항목명 아래 필터 — S 선택 → O 목록, O 선택 → B 목록이 종속되어 좁혀짐 */}
            <tr>
              <th style={filterTh} />
              {/* 상태 */}
              <th style={filterTh}>
                <select value={fSt} onChange={(e) => setFSt(e.target.value)} style={{ ...fSel, minWidth: 62 }} title="진행 상태">
                  <option value="">전체</option>
                  {STATES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </th>
              {/* 고객사 (전체 보기) */}
              {readOnly && (
                <th style={filterTh}>
                  <select value={fOwnerCust} onChange={(e) => { setFOwnerCust(e.target.value); setPage(1); }} style={{ ...fSel, maxWidth: 130 }} title="고객사">
                    <option value="">고객사 전체</option>
                    {ownerCustOpts.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </th>
              )}
              {/* 사용 고객사 (공유 코드) */}
              {hasSharedRows && (
                <th style={filterTh}>
                  <select value={fCu} onChange={(e) => setFCu(e.target.value)} style={{ ...fSel, maxWidth: 120 }} title="사용 고객사">
                    <option value="">전체</option>
                    {custOpts.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </th>
              )}
              <th style={filterTh} />
              {/* 코드(PDS) */}
              <th style={filterTh}>
                <select value={pdsLock || fK} onChange={(e) => setFK(e.target.value)} disabled={!!pdsLock} style={{ ...fSel, minWidth: 58, ...(pdsLock ? { background: "#f3f4f6", color: "#6b7280" } : {}) }} title={pdsLock ? "목록의 PDS 필터로 고정됨" : "코드 종류"}>
                  {!pdsLock && <option value="">전체</option>}
                  {(pdsLock ? [pdsLock] : kindOpts).map((v) => <option key={v} value={v}>{kindMeta(v as CodeKind).short}</option>)}
                </select>
              </th>
              {/* 타입 */}
              <th style={filterTh}>
                <select value={fT} onChange={(e) => setFT(e.target.value)} style={{ ...fSel, minWidth: 74 }} title="타입">
                  <option value="">전체</option>
                  {typeOpts.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </th>
              {/* S/O/B 필터 제거 — 대장 기준 1고객사=1오너라 필터 불필요 */}
              <th style={filterTh} />
              {/* 페이지 · 합계 */}
              {Array.from({ length: 2 }, (_, i) => <th key={i} style={filterTh} />)}
              {/* 편집방식 */}
              <th style={filterTh}>
                <select value={fM} onChange={(e) => setFM(e.target.value)} style={{ ...fSel, maxWidth: 170 }} title="편집방식">
                  <option value="">편집방식 전체</option>
                  {methodOpts.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </th>
              {/* 발급일 · 최종 수정일 · 메모 · ncp2 · 정산 */}
              {Array.from({ length: 5 }, (_, i) => <th key={`t${i}`} style={filterTh} />)}
            </tr>
          </thead>
          <tbody>
            {pageRows.map(([r, idx]) => (
              <tr key={idx} onClick={() => { if (!readOnly) openEdit(idx); }} title={readOnly ? "전체 보기는 조회 전용 — 왼쪽에서 고객사를 고르면 수정할 수 있습니다" : "클릭하면 수정"} style={{ borderTop: "1px solid #eef0f4", cursor: readOnly ? "default" : "pointer" }}>
                <td style={{ ...S.td, color: "#9ca3af", fontFamily: "ui-monospace,monospace" }}>{idx + 1}</td>
                <td style={S.td}><span style={{ ...S.tag, fontSize: 10, ...ST_COLOR[stateOf(r.use)] }}>{stateOf(r.use)}</span></td>
                {readOnly && <td style={{ ...S.td, fontSize: 11.5, textAlign: "left", maxWidth: 140, fontWeight: 600 }}>{r._cust ?? "-"}</td>}
                {hasSharedRows && (
                  <td style={{ ...S.td, fontSize: 11.5, textAlign: "left", maxWidth: 130 }}>
                    {isSharedRow(r)
                      ? (r.cu
                        ? <span style={{ ...S.tag, background: "#f3e8ff", color: "#7e22ce", fontWeight: 700 }}>{r.cu}</span>
                        : <span style={{ color: "#d97706" }} title="공유 코드인데 사용 고객사가 비어 있습니다. 교재를 열어 입력하세요.">미입력</span>)
                      : <span style={{ color: "#d1d5db" }}>-</span>}
                  </td>
                )}
                <td style={{ ...S.td, fontWeight: 600, textAlign: "left", maxWidth: 200 }}>{r.t || "-"}<div style={{ color: "#9ca3af", fontSize: 10.5 }}>{r.f}</div></td>
                <td style={S.td}><span style={{ ...S.tag, background: kindMeta(codeKind(r.k, r.s)).bg, color: kindMeta(codeKind(r.k, r.s)).color, fontWeight: 700 }}>{kindMeta(codeKind(r.k, r.s)).short}</span></td>
                <td style={{ ...S.td, fontSize: 11 }}>{r.ty}</td>
                <td style={S.td}><SobpChips s={r.s} o={r.o} b={r.b} small /></td>
                <td style={S.td}>{(() => { const st = typeof r.sp === "number" ? r.sp : 1; return `${st.toLocaleString()}~${(st + r.pg - 1).toLocaleString()}`; })()}<div style={{ fontSize: 10, color: "#9ca3af" }}>{r.pg.toLocaleString()}p</div></td>
                {/* 심볼 개수 (합계) */}
                <td style={{ ...S.td, fontWeight: 700, whiteSpace: "nowrap" }}>
                  {tSum(r).toLocaleString()}
                </td>
                <td style={{ ...S.td, fontSize: 10.5, color: "#6b7280", textAlign: "left", maxWidth: 180 }}>{r.m || "-"}</td>
                <td style={{ ...S.td, fontSize: 11, color: "#6b7280" }}>{r.d || "-"}</td>
                <td style={{ ...S.td, fontSize: 11, color: r.nmod ? "#374151" : "#d1d5db" }}>{r.nmod || "-"}</td>
                <td style={S.td}>{(r.logs?.length ?? 0) > 0 ? <span style={{ ...S.tag, background: "#eef6ff", color: "#2563eb" }}>{r.logs!.length}</span> : <span style={{ color: "#d1d5db" }}>0</span>}</td>
                <td style={{ ...S.td, color: "#9ca3af", fontFamily: "ui-monospace,monospace", fontSize: 11 }}>{(r.bytes ?? 0).toLocaleString()}</td>
                <td style={{ ...S.td, color: "#2563eb", fontWeight: 600, whiteSpace: "nowrap" }}>
                  {(() => {
                    const b = bill(r);
                    return (
                      <>
                        {won(b.total)}
                        {b.discount !== 0 && (
                          <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 400 }}>
                            <s>{won(b.gross)}</s> <span style={{ color: "#dc2626", fontWeight: 700 }}>−{b.pct}%</span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 14px", borderTop: "1px solid #eef0f4", flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              전체 <b style={{ color: "#111827" }}>{filtered.length.toLocaleString()}</b>건 중 {((curPage - 1) * perPage + 1).toLocaleString()}~{Math.min(curPage * perPage, filtered.length).toLocaleString()} 표시
              <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }} style={{ marginLeft: 8, fontSize: 12, padding: "3px 6px", border: "1px solid #e5e7eb", borderRadius: 6 }}>
                {[25, 50, 100, 200, 500].map((n) => <option key={n} value={n}>{n}건씩</option>)}
                <option value={filtered.length || 1}>전체 보기</option>
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
        {filtered.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "#9ca3af" }}>결과 없음</div>}
      </div>

      </>)}

      {bookMode && !editing && (
        <div style={{ ...S.card, padding: 24, fontSize: 13, color: "#6b7280" }}>
          교재를 찾을 수 없습니다. <Link href={listHref} style={{ color: "#2563eb" }}>교재 목록으로</Link>
        </div>
      )}

      {bookMode && editing && (
        <div style={{ ...S.card, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{editing.idx === -1 ? "교재(책) 추가" : "교재(책) 편집 수정"}</div>
            {editing.idx !== -1 && editing.row.t && <span style={{ ...S.tag, background: "#f3f4f6", color: "#6b7280" }}>{editing.row.t}</span>}
            <span style={{ ...S.tag, fontFamily: "ui-monospace,monospace" }}>S{editing.row.s}/O{editing.row.o}/B{editing.row.b}</span>
          </div>
          {/* 진행 상태 — 완료 시 아래 내용 전체 잠김 */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", border: "1px solid #eef0f4", borderRadius: 10, padding: "10px 14px", marginBottom: 12, background: "#fafbfc" }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "#374151" }}>진행 상태</span>
            <div style={{ display: "flex", gap: 4 }}>
              {STATES.map((v) => {
                const on = stateOf(editing.row.use) === v;
                return <button key={v} onClick={() => changeState(v)} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 7, cursor: "pointer", fontWeight: on ? 700 : 400, border: on ? "1px solid #93c5fd" : "1px solid #e5e7eb", background: on ? ST_COLOR[v].bg : "#fff", color: on ? ST_COLOR[v].fg : "#6b7280" }}>{v}</button>;
              })}
            </div>
            {locked && <span style={{ fontSize: 12, color: "#166534" }}>🔒 완료 처리되어 내용이 잠겼습니다. 수정하려면 <b>진행중</b>으로 변경하세요.</span>}
            {!locked && !(editing.row.nmod ?? "").trim() && <span style={{ fontSize: 11.5, color: "#9ca3af" }}>※ 완료하려면 ncp2 최종수정 날짜가 필요합니다.</span>}
            {(editing.row.nhist ?? []).length > 0 && (
              <div style={{ width: "100%", marginTop: 4, fontSize: 11.5, color: "#6b7280" }}>
                <b style={{ color: "#374151" }}>ncp2 최종수정 이력</b>
                {(editing.row.nhist ?? []).map((h, i) => (
                  <div key={i} style={{ fontFamily: "ui-monospace,monospace", marginTop: 2 }}>· {h.date} <span style={{ color: "#9ca3af" }}>(완료 해제 {h.movedAt}{h.by ? ` · ${h.by}` : ""})</span></div>
                ))}
              </div>
            )}
          </div>

          <fieldset disabled={locked} style={{ border: 0, padding: 0, margin: 0, opacity: locked ? 0.6 : 1 }}>

          {/* 0행: 사용할 코드 — 어떤 코드냐에 따라 고객사 입력 필요 여부가 달라지므로 맨 위에 배치 */}
          {(() => {
            const sh = sharedInfo(editing.row.s, editing.row.o, editing.row.k);
            return (
              <div style={{ ...rowBox, borderColor: sh ? "#e9d5ff" : "#bfdbfe", background: sh ? "#faf5ff" : "#f5f9ff" }}>
                <div style={{ ...rowHead, display: "flex", alignItems: "center", gap: 8, color: sh ? "#6b21a8" : "#1e3a8a" }}>
                  사용할 코드
                  {sh
                    ? <span style={{ ...S.tag, background: "#a855f7", color: "#fff", fontWeight: 700 }} title={sh.note}>공유 코드 · 여러 고객사 사용</span>
                    : <span style={{ ...S.tag, background: "#eef6ff", color: "#2563eb", fontWeight: 700 }}>전용 코드 · {cust.customer}</span>}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: sh ? "1.4fr 1fr 1.2fr" : "1.4fr 1fr", gap: 10 }}>
                  <Field label={`할당된 S / O${editing.idx === -1 && assignedSO.length > 1 ? " (선택)" : " (수정 불가)"}`}>
                    {editing.idx === -1 && assignedSO.length > 1 ? (
                      <select style={S.input} value={`${editing.row.k}/${editing.row.s}/${editing.row.o}`}
                        onChange={(e) => { const [k, sv, ov] = e.target.value.split("/"); setEditing((ed) => (ed ? { ...ed, row: { ...ed.row, k, s: +sv, o: +ov, b: freeBooks(k, +sv, +ov)[0] ?? 0 } } : ed)); }}>
                        {assignedSO.map((a) => (
                          <option key={`${a.k}/${a.s}/${a.o}`} value={`${a.k}/${a.s}/${a.o}`}>
                            {a.k === "N" ? "N(PDS3)" : "G(PDS2)"} · S{a.s} / O{a.o}{sharedInfo(a.s, a.o, a.k) ? " · 공유" : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div style={{ ...S.input, background: "#fff", color: "#374151", display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ ...S.tag, background: editing.row.k === "N" ? "#eef6ff" : "#fef3c7", color: editing.row.k === "N" ? "#2563eb" : "#92400e" }}>{editing.row.k === "N" ? "N(PDS3)" : "G(PDS2)"}</span>
                        <b style={{ fontFamily: "ui-monospace,monospace" }}>S{editing.row.s} / O{editing.row.o}</b>
                        <span style={{ fontSize: 11, color: "#9ca3af" }}>할당된 코드</span>
                      </div>
                    )}
                  </Field>
                  <Field label="Book (사용 가능 번호)">
                    <select style={{ ...S.input, background: "#fff" }} value={editing.row.b} onChange={(e) => setF("b", +e.target.value)}>
                      {freeBooks(editing.row.k, editing.row.s, editing.row.o, editing.idx === -1 ? undefined : editing.row.b)
                        .map((b) => <option key={b} value={b}>B{b}</option>)}
                    </select>
                  </Field>
                  {sh && (() => {
                    const cands = commonCandidates(editing.row.k, editing.row.s, editing.row.o);
                    const cur = editing.row.cu ?? "";
                    return (
                      <Field label={`사용 고객사 *${sh.group ? ` (${COMMON_LABEL[sh.group]})` : ""}`}>
                        <select style={{ ...S.input, background: "#fff" }} value={cur} onChange={(e) => setF("cu", e.target.value)}>
                          <option value="">- 선택 -</option>
                          {cands.map((n) => <option key={n} value={n}>{n}</option>)}
                          {cur && !cands.includes(cur) && <option value={cur}>{cur} (미체크)</option>}
                        </select>
                        {cands.length === 0 && (
                          <div style={{ fontSize: 10.5, color: "#b45309", marginTop: 3 }}>
                            후보 없음 — 고객사 관리에서 {sh.group ? COMMON_LABEL[sh.group] : "커먼 코드"} 를 체크하세요.
                          </div>
                        )}
                      </Field>
                    );
                  })()}
                </div>
                <div style={{ fontSize: 11.5, marginTop: 8, color: sh ? "#6b21a8" : "#6b7280" }}>
                  {sh
                    ? <>
                        {sh.note}
                        {sh.group && <span style={{ color: "#9ca3af" }}> · {commonRangesText(sh.group)}</span>}
                        <br />여러 고객사가 Book 번호만 나눠 쓰는 코드입니다 — <b>{sh.group ? COMMON_LABEL[sh.group] : "커먼 코드"} 를 체크한 고객사만</b> 후보로 나옵니다.
                      </>
                    : `이 S/O는 ${cust.customer} 전용입니다. 별도 고객사 입력이 필요 없습니다.`}
                </div>
              </div>
            );
          })()}

          {/* 1행: 기본 정보 */}
          <div style={rowBox}>
            <div style={rowHead}>기본 정보</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <Field label="교재명"><input style={S.input} value={editing.row.t} onChange={(e) => setF("t", e.target.value)} /></Field>
              <Field label="ncp2 파일명"><input style={S.input} value={editing.row.f} onChange={(e) => setF("f", e.target.value)} /></Field>
              <Field label="ncp2 파일 크기 (byte)">
                <input type="number" min={0} step={1} style={S.input} value={editing.row.bytes}
                  onChange={(e) => setF("bytes", Math.max(0, Math.round(+e.target.value)))} />
              </Field>
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={{ fontSize: 11, color: "#6b7280", display: "flex", alignItems: "center", gap: 8 }}>
                펜 모델 <span style={{ color: "#9ca3af" }}>· 다중 선택</span>
                <select style={{ ...S.input, width: 200 }} value={penPick} onChange={(e) => addPen(e.target.value)}>
                  <option value="">＋ 펜 모델 추가…</option>
                  {PEN_MODELS.filter((pm) => !selPens.includes(pm)).map((pm) => <option key={pm} value={pm}>{pm}</option>)}
                </select>
              </label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                {selPens.length === 0 && <span style={{ fontSize: 12, color: "#9ca3af" }}>선택된 펜 모델 없음</span>}
                {selPens.map((pm) => (
                  <span key={pm} style={{ ...S.tag, background: "#eef6ff", color: "#2563eb", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {pm}<button onClick={() => rmPen(pm)} style={{ border: 0, background: "none", color: "#dc2626", cursor: "pointer", padding: 0 }}>✕</button>
                  </span>
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginTop: 10 }}>
              <Field label="타입"><select style={S.input} value={editing.row.ty} onChange={(e) => setF("ty", e.target.value)}>{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginTop: 10 }}>
              <Field label="Start Page"><input type="number" min={0} style={S.input} value={typeof editing.row.sp === "number" ? editing.row.sp : 1} onChange={(e) => setF("sp", Math.max(0, +e.target.value))} /></Field>
              <Field label="Total Page"><input type="number" style={S.input} value={editing.row.pg} onChange={(e) => setF("pg", +e.target.value)} /></Field>
              <Field label="발급일자 (Ncode 발급일)">
                <input type="date" style={S.input} value={editing.row.d} onChange={(e) => setF("d", e.target.value)} />
                {!editing.row.d && <div style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 2 }}>원본에 발급일 없음 — 직접 입력</div>}
              </Field>
              <Field label="ncp2 최종수정 (완료 필수)">
                <input type="date" style={S.input} value={editing.row.nmod ?? ""} onChange={(e) => setF("nmod", e.target.value)} />
              </Field>
            </div>
            <div style={{ marginTop: 10, maxWidth: 300 }}>
              <Field label="발급인 (코드 할당자 · 사용자 명단)">
                <select style={S.input} value={editing.row.iss ?? ""} onChange={(e) => setF("iss", e.target.value)}>
                  <option value="">- 선택 -</option>
                  {staff.map((u) => <option key={u.id} value={u.name}>{u.name} ({u.role})</option>)}
                  {editing.row.iss && !staff.some((u) => u.name === editing.row.iss) && <option value={editing.row.iss}>{editing.row.iss} (미등록)</option>}
                </select>
              </Field>
            </div>
            {/* 편집 방식 (기본 정보 영역) */}
            <div style={{ marginTop: 10 }}>
              <label style={{ fontSize: 11, color: "#6b7280", display: "flex", alignItems: "center", gap: 8 }}>
                편집 방식 <span style={{ color: "#9ca3af" }}>· 선택해서 추가 (복수)</span>
                <select style={{ ...S.input, maxWidth: 260 }} value={pick} onChange={(e) => addMethod(e.target.value)}>
                  <option value="">＋ 편집방식 선택…</option>
                  {METHODS.filter((mm) => !selMethods.includes(mm)).map((mm) => <option key={mm} value={mm}>{mm}</option>)}
                </select>
              </label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                {selMethods.length === 0 && <span style={{ fontSize: 12, color: "#9ca3af" }}>선택된 편집방식 없음</span>}
                {selMethods.map((mm) => (
                  <span key={mm} style={{ ...S.tag, background: "#eef6ff", color: "#2563eb", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {mm}<button onClick={() => rmMethod(mm)} style={{ border: 0, background: "none", color: "#dc2626", cursor: "pointer", padding: 0 }}>✕</button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 2행: 소리펜(좌) / 필기펜(우) 심볼 입력 */}
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 12 }}>
            <div style={rowBox}>
              <div style={rowHead}>소리펜 심볼 입력</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {SOUND_LABELS.map((lab, i) => (
                  <Field key={lab} label={lab}><input type="number" style={S.input} value={editing.row.sm[i]} onChange={(e) => setSm(i, +e.target.value)} /></Field>
                ))}
              </div>
            </div>
            <div style={rowBox}>
              <div style={rowHead}>필기펜 심볼 입력</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                {PEN_LABELS.map((lab, i) => (
                  <Field key={lab} label={lab}><input type="number" style={S.input} value={editing.row.pm[i]} onChange={(e) => setPm(i, +e.target.value)} /></Field>
                ))}
              </div>
            </div>
          </div>

          {/* 3행: 합산 — 편집량(TOTAL PAGE·심볼) / 정산(PDF·심볼 편집비·청구액) */}
          {(() => { const eb = bill(editing.row); return (
          <div style={{ ...rowBox, background: "#f5f9ff", borderColor: "#bfdbfe" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13 }}>TOTAL PAGE <b style={{ color: "#2563eb", fontSize: 17 }}>{(editing.row.pg || 0).toLocaleString()}</b><span style={{ color: "#9ca3af", fontSize: 11 }}> p</span></span>
              <span style={{ color: "#cbd5e1" }}>|</span>
              <span style={{ fontSize: 13 }}>소리펜 합 <b style={{ color: "#2563eb" }}>{sSum(editing.row).toLocaleString()}</b></span>
              <span style={{ fontSize: 13 }}>필기펜 합 <b style={{ color: "#2563eb" }}>{pSum(editing.row).toLocaleString()}</b></span>
              <span style={{ fontSize: 13 }}>심볼 합계 <b style={{ color: "#2563eb", fontSize: 16 }}>{tSum(editing.row).toLocaleString()}</b></span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", marginTop: 8, paddingTop: 8, borderTop: "1px dashed #bfdbfe" }}>
              <span style={{ fontSize: 12.5, color: "#374151" }}>적용비 <b>{won(eb.pageAmt)}</b><span style={{ color: "#9ca3af", fontSize: 11 }}> ({(editing.row.pg || 0).toLocaleString()}p × {(rateOf(editing.row)[editing.row.ty !== "소리펜" ? "w_page" : "s_page"]).toLocaleString()})</span></span>
              <span style={{ fontSize: 12.5, color: "#374151" }}>편집·기능비 <b>{won(eb.symAmt)}</b><span style={{ color: "#9ca3af", fontSize: 11 }}> (항목별 단가 합)</span></span>
              <span style={{ marginLeft: "auto", fontSize: 14 }}>청구액 <b style={{ color: "#2563eb", fontSize: 18 }}>{won(eb.total)}</b></span>
            </div>
          </div>
          ); })()}

          {/* 3-B행: 프로젝트 단가 · 할인 정산 */}
          {(() => {
            const row = editing.row;
            const b = bill(row);
            const dcOn = discounted(row);
            const num = (v: string) => (v.trim() === "" ? undefined : Math.max(0, Math.round(+v)));
            return (
              <div style={{ ...rowBox, borderColor: dcOn ? "#fecaca" : "#eef0f4", background: dcOn ? "#fffafa" : "#fff" }}>
                <div style={{ ...rowHead, display: "flex", alignItems: "center", gap: 8 }}>
                  편집 단가 · 할인 정산
                  {(() => {
                    const rr = rateOf(row);
                    const frozen = !!row.rs;
                    // 스냅샷과 현재 고객사 단가가 다른가 (= 고객사 단가가 그 뒤로 바뀜)
                    const changed = frozen && RATE_ITEMS.some((it) => (rr[it.key] ?? it.base) !== (rateMap[it.key] ?? it.base));
                    return (
                      <>
                        <span style={{ ...S.tag, background: frozen ? "#eef6ff" : (customRates ? "#fef3c7" : "#f3f4f6"), color: frozen ? "#2563eb" : (customRates ? "#92400e" : "#6b7280") }}
                          title={frozen
                            ? `등록 시점(${row.rsAt ?? "-"})의 고객사 단가로 정산합니다. 이후 고객사 단가가 바뀌어도 이 교재는 바뀌지 않습니다.`
                            : (myCompany ? "고객사 관리에서 지정한 현재 항목별 단가로 계산 (저장하면 이 단가로 고정됩니다)" : "고객사 관리에 미등록 — 기본 단가")}>
                          {frozen ? `등록 시 단가 (${row.rsAt ?? "-"})` : (customRates ? "고객사 단가" : "기본 단가")} · 적용 {rr.s_page.toLocaleString()} / 편집 {rr.s_edit.toLocaleString()}
                        </span>
                        {changed && (
                          <button onClick={() => { if (confirm("이 교재를 현재 고객사 단가로 다시 계산할까요? (등록 시 단가가 대체됩니다)")) setEditing((ed) => (ed ? { ...ed, row: { ...ed.row, rs: { ...rateMap }, rsAt: today() } } : ed)); }}
                            style={{ ...S.smallBtn, color: "#b45309" }} title={`현재 고객사 단가: 적용 ${rateMap.s_page.toLocaleString()} / 편집 ${rateMap.s_edit.toLocaleString()}`}>
                            ⚠ 고객사 단가 변경됨 — 현재 단가로 갱신
                          </button>
                        )}
                      </>
                    );
                  })()}
                  {dcOn && <span style={{ ...S.tag, background: "#fee2e2", color: "#b91c1c", fontWeight: 700 }}>할인 적용</span>}
                  <button onClick={() => setEditing((ed) => (ed ? { ...ed, row: { ...ed.row, dcRate: undefined, dcAmt: undefined, dcNote: undefined } } : ed))}
                    style={{ ...S.smallBtn, marginLeft: "auto" }} title="할인 없음으로 되돌리기">할인 초기화</button>
                </div>

                <div style={{ fontSize: 11.5, color: "#6b7280", marginBottom: 8 }}>단가는 <b>고객사 관리</b>에서 항목별로 지정합니다. 교재는 <b>등록 시점의 단가로 고정</b>되며, 이후 고객사 단가가 바뀌어도 기존 교재의 청구액은 그대로 유지됩니다. 여기서는 이 교재의 할인만 입력합니다.</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  <Field label="할인율 (%)">
                    <input type="number" min={0} max={100} step={0.5} style={S.input} value={row.dcRate ?? 0}
                      onChange={(e) => setF("dcRate", Math.min(100, Math.max(0, +e.target.value)))} />
                  </Field>
                  <Field label="추가 할인액 (₩)">
                    <input type="number" min={0} step={1000} style={S.input} value={row.dcAmt ?? 0}
                      onChange={(e) => setF("dcAmt", Math.max(0, Math.round(+e.target.value)))} />
                  </Field>
                  <Field label="할인 사유">
                    <input style={S.input} value={row.dcNote ?? ""} onChange={(e) => setF("dcNote", e.target.value)} placeholder="예) 재작업분 · 물량 협의" />
                  </Field>
                </div>

                {/* 정산 내역 */}
                <div style={{ marginTop: 12, border: "1px solid #eef0f4", borderRadius: 9, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                    <tbody>
                      <Line label="적용비 (페이지)" detail={`${row.pg.toLocaleString()}p × ${(rateOf(row)[row.ty !== "소리펜" ? "w_page" : "s_page"]).toLocaleString()}`} value={won(b.pageAmt)} />
                      <Line label="편집·기능비" detail={`심볼·기능 ${tSum(row).toLocaleString()} (항목별 단가 합)`} value={`＋ ${won(b.symAmt)}`} />
                      <Line label="합계 (할인 전)" detail="적용비 + 편집·기능비" value={won(b.gross)} />
                      {b.rateDc > 0 && <Line label={`할인율 ${row.dcRate}%`} detail="합계 기준" value={`− ${won(b.rateDc)}`} minus />}
                      {b.amtDc > 0 && <Line label="추가 할인액" detail={row.dcNote || "-"} value={`− ${won(b.amtDc)}`} minus />}
                      <tr style={{ borderTop: "2px solid #e5e7eb", background: "#f5f9ff" }}>
                        <td style={{ padding: "10px 12px", fontWeight: 700, color: "#1e3a8a" }}>
                          최종 청구액
                          {b.discount !== 0 && <span style={{ marginLeft: 8, ...S.tag, background: "#fee2e2", color: "#b91c1c", fontWeight: 700 }}>총 할인 {won(b.discount)} ({b.pct}%)</span>}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 17, color: "#2563eb", whiteSpace: "nowrap" }}>{won(b.total)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>
                  단가를 고객사 단가와 같게 두고 할인율·할인액을 0으로 하면 할인 없음(기준가 그대로)입니다. 고객사 단가 변경은 <b>멤버 관리 &gt; 고객사 관리</b>에서 합니다.
                </div>
              </div>
            );
          })()}

          {/* 4행: 교원구몬/KEP·산출물 · 메모 */}
          <div style={rowBox}>
            {(hasKep || editing.idx === -1) && (
              <>
                <div style={{ ...rowHead, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 10 }} onClick={() => setKepOpen((v) => !v)}>
                  교원구몬/KEP · 산출물 <span style={{ fontWeight: 400, color: "#9ca3af", fontSize: 11 }}>· 세트 개수 · 파일/링크 + 설명</span>
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "#3b82f6" }}>{kepOpen ? "접기 ▲" : "펼치기 ▼"}</span>
                </div>
                {kepOpen && (
                  <>
                    <div style={{ maxWidth: 200, marginBottom: 10 }}>
                      <Field label="세트 개수"><input type="number" style={S.input} value={editing.row.set ?? 0} onChange={(e) => setF("set", +e.target.value)} /></Field>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                      <AttField label="세부내역" att={editing.row.det} onChange={(a) => setF("det", a)} />
                      <AttField label="출력용파일" att={editing.row.out} onChange={(a) => setF("out", a)} />
                      <AttField label="APP 데이터" att={editing.row.app} onChange={(a) => setF("app", a)} />
                    </div>
                  </>
                )}
              </>
            )}

            <div style={{ ...rowHead, marginTop: 14 }}>업무요청 메모 <span style={{ fontWeight: 400, color: "#9ca3af", fontSize: 11 }}>· 요청/처리/메모 (메모1~3 대체)</span></div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <select style={{ ...S.input, width: 76 }} value={logDraft.kind} onChange={(e) => setLogDraft((d) => ({ ...d, kind: e.target.value as WorkKind }))}>
                <option value="요청">요청</option><option value="처리">처리</option><option value="메모">메모</option>
              </select>
              <AutoTextarea value={logDraft.content} onChange={(v) => setLogDraft((d) => ({ ...d, content: v }))} onSubmit={submitMemo} placeholder="내용 입력 · Enter 기록 · Shift+Enter 줄바꿈" style={{ flex: 1 }} />
              <button onClick={submitMemo} style={{ ...S.smallBtn, whiteSpace: "nowrap" }}>{logDraft.id ? "수정 저장" : "＋ 기록"}</button>
              {logDraft.id && <button onClick={() => setLogDraft({ id: null, kind: "요청", content: "" })} style={S.smallBtn}>취소</button>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10, maxHeight: 220, overflow: "auto" }}>
              {bookLogs.length === 0 && <div style={{ fontSize: 12, color: "#9ca3af" }}>기록된 업무 메모가 없습니다.</div>}
              {bookLogs.map((l) => (
                <div key={l.id} style={{ border: `1px solid ${logDraft.id === l.id ? "#93c5fd" : "#eef0f4"}`, borderRadius: 8, padding: "6px 8px" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 11.5 }}>
                    <span style={{ minWidth: 22, textAlign: "center", background: "#f3f4f6", borderRadius: 5, fontFamily: "ui-monospace,monospace", color: "#374151" }}>{l.no}</span>
                    <span style={{ ...S.tag, background: KIND_BG[l.kind], color: KIND_FG[l.kind] }}>{l.kind}</span>
                    {l.date && <span style={{ color: "#9ca3af", fontFamily: "ui-monospace,monospace" }}>{l.date}{l.edited ? " (수정됨)" : ""}</span>}
                    <span style={{ color: isMine(l) ? "#2563eb" : "#9ca3af", fontWeight: isMine(l) ? 700 : 400 }}>{l.author || "-"}{isMine(l) ? " (나)" : ""}</span>
                    <span style={{ flex: 1 }} />
                    {isMine(l)
                      ? <button onClick={() => delMemo(l)} style={{ ...S.linkBtn, color: "#dc2626" }}>삭제</button>
                      : <span style={{ fontSize: 10.5, color: "#d1d5db" }}>🔒 타인 글</span>}
                  </div>
                  <div onClick={() => startEditMemo(l)} title={isMine(l) ? "클릭하면 위에서 수정" : "본인 글만 수정할 수 있습니다"} style={{ marginTop: 4, whiteSpace: "pre-wrap", cursor: isMine(l) ? "pointer" : "default", fontSize: 12.5 }}>{l.content}</div>
                </div>
              ))}
            </div>
          </div>
          </fieldset>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 18, paddingTop: 14, borderTop: "1px solid #eef0f4" }}>
            {editing.idx !== -1 && !locked && (
              <button onClick={() => delRow(editing.idx)}
                style={{ ...S.ghost, color: "#dc2626", borderColor: "#fecaca" }}>교재 삭제</button>
            )}
            <span style={{ flex: 1 }} />
            <Link href={listHref} style={{ ...S.ghost, textDecoration: "none" }}>목록</Link>
            <button onClick={saveRow} style={S.primary}>{editing.idx === -1 ? "추가" : "저장"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// 첨부(링크 기본 / 파일 + 설명) 입력. 링크는 새창으로 열림
// 정산 내역 한 줄
function Line({ label, detail, value, sub, minus }: { label: string; detail?: string; value: string; sub?: string; minus?: boolean }) {
  return (
    <tr style={{ borderTop: "1px solid #f3f4f6" }}>
      <td style={{ padding: "7px 12px", color: "#374151" }}>
        <b style={{ color: minus ? "#b91c1c" : "#374151" }}>{label}</b>
        {detail && <div style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 1 }}>{detail}</div>}
        {sub && <div style={{ fontSize: 10.5, color: "#b45309", marginTop: 1 }}>{sub}</div>}
      </td>
      <td style={{ padding: "7px 12px", textAlign: "right", fontWeight: 600, whiteSpace: "nowrap", color: minus ? "#b91c1c" : "#111827", fontFamily: "ui-monospace,monospace" }}>{value}</td>
    </tr>
  );
}

function AttField({ label, att, onChange }: { label: string; att?: Att; onChange: (a: Att) => void }) {
  const a: Att = att ?? { mode: "link", value: "", note: "" };
  return (
    <div style={{ border: "1px solid #eef0f4", borderRadius: 8, padding: 10 }}>
      <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6, fontWeight: 600 }}>{label}</div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <select style={{ ...S.input, width: 64 }} value={a.mode} onChange={(e) => onChange({ ...a, mode: e.target.value as Att["mode"] })}>
          <option value="link">링크</option><option value="file">파일</option>
        </select>
        {a.mode === "file" ? (
          <label style={{ ...S.input, flex: 1, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: a.value ? "#111827" : "#9ca3af" }}>
            <span style={S.smallBtn as React.CSSProperties}>파일</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.value || "선택 없음"}</span>
            <input type="file" style={{ display: "none" }} onChange={(e) => onChange({ ...a, value: e.target.files?.[0]?.name ?? a.value })} />
          </label>
        ) : (
          <>
            <input style={{ ...S.input, flex: 1 }} value={a.value} placeholder="https://..." onChange={(e) => onChange({ ...a, value: e.target.value })} />
            <a href={a.value || undefined} target="_blank" rel="noopener noreferrer" title="새 탭으로 열기"
              style={{ ...(S.smallBtn as React.CSSProperties), whiteSpace: "nowrap", textDecoration: "none", display: "inline-flex", alignItems: "center", opacity: a.value ? 1 : 0.4, pointerEvents: a.value ? "auto" : "none" }}>↗ 열기</a>
          </>
        )}
      </div>
      <input style={{ ...S.input, marginTop: 6 }} value={a.note} placeholder="링크/파일에 대한 내용·설명" onChange={(e) => onChange({ ...a, note: e.target.value })} />
    </div>
  );
}

const basisBox: React.CSSProperties = { position: "absolute", top: 28, left: 0, width: 430, maxHeight: "70vh", overflowY: "auto", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, boxShadow: "0 12px 32px rgba(15,23,42,.18)", padding: 14, fontSize: 12, color: "#111827", zIndex: 30 };
// 페이지 버튼 & 표시할 페이지 번호 창(최대 7개)
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

// KPI 묶음 카드 — 편집량(수량) / 정산(금액) 그룹으로 구분
function KpiGroup({ title, items, grow, accent }: { title: string; items: string[][]; grow: number; accent?: boolean }) {
  return (
    <div style={{ flex: grow, minWidth: 260, border: `1px solid ${accent ? "#dbeafe" : "#eef0f4"}`, borderRadius: 12, padding: "8px 10px 10px", background: accent ? "#f7faff" : "#fff" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: accent ? "#2563eb" : "#6b7280", marginBottom: 6, paddingLeft: 2 }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 8 }}>
        {items.map(([l, v, sub], i) => (
          <div key={i} style={{ background: "#fff", border: "1px solid #f0f2f5", borderRadius: 8, padding: "7px 9px" }}>
            <div style={{ fontSize: 10.5, color: "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: accent ? "#2563eb" : "#111827" }}>{v}</div>
            {sub && <div style={{ fontSize: 9.5, color: "#9ca3af", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

const filterTh: React.CSSProperties = { padding: "4px 4px 8px", background: "#fbfcfd", borderBottom: "1px solid #eef0f4" };
const fSel: React.CSSProperties = { fontSize: 10.5, padding: "3px 4px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", color: "#374151", maxWidth: 72 };
const rowBox: React.CSSProperties = { border: "1px solid #eef0f4", borderRadius: 10, padding: 14, marginBottom: 12, background: "#fff" };
const rowHead: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: "#374151", marginBottom: 10 };
