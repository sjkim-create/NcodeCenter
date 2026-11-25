"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { S, Field, AutoTextarea } from "./ui";
import { InfoTip } from "./KeyWorkspaceUI";
import { langGroupOf, groupOfOwner, extLangText, ownerSlots, type ExtSlot } from "@/lib/langGroups";
import { CN_FIELDS, CN_SOURCES, setManual, type CnKey } from "@/lib/casterLink";
import { allEditBooks, alignLegacyServiceTickets } from "@/lib/bookOwnership";
import { codeKind, codeTypeRangeErr, kindMeta, type CodeKind } from "@/lib/codeKind";
import { SobpChips, Sc } from "./sobp";
import type { WorkKind } from "@/lib/customerData";
import { useAuth, currentUser } from "@/lib/authStore";
import { useStore } from "@/lib/store";
import { assignedSOFor, editableBookNumbers, projectBooks, sameBookSpace, sharedInfo } from "@/lib/codeUsage";
import { penModelsByType } from "@/lib/penModels";
import { hydrateShared, useSharedOwners, COMMON_LABEL, commonRangesText } from "@/lib/sharedOwners";
import { hydrateMembers, useCommonMembers } from "@/lib/commonMembers";
import { allServiceTickets, hydrateServiceTickets, useServiceTickets, ticketState, serviceTicketText, type ServiceTicket } from "@/lib/serviceTicketStore";
import { setBookOverride } from "@/lib/editOverrides";
import { logActivity } from "@/lib/activityStore";
import { EDIT_CUSTOMERS } from "@/lib/editingData";
import { loadCustomCustomers } from "@/lib/editingCustomers";
import { BASE_RATE, RATE_ITEMS, rateMapOf, settleBook, bookHasDiscount, hasCustomRates, SOUND_QTY, PEN_QTY, S_PAGE_I, W_PAGE_I, ncodeApplied, CMP_EXTRA_FROM, type RateMap } from "@/lib/pricing";

const KIND_BG: Record<string, string> = { 요청: "#fef3c7", 처리: "#dcfce7", 메모: "#eef2f7" };
const KIND_FG: Record<string, string> = { 요청: "#92400e", 처리: "#166534", 메모: "#475569" };

type Att = { mode: "file" | "link"; value: string; note: string };
type BookLog = { id: number; no: number; kind: WorkKind; content: string; date: string; author: string; authorEmail?: string; edited?: boolean };
const CU_NONE = "__CU_NONE__";   // 사용 고객사 필터의 (미입력) 값 `PC-109`
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
  // 확장 언어 코드 — 그룹 기본 코드 교재면 **고른** 확장 코드가 같은 Book 으로 붙는다 `PC-366`(코드마다 casterN 연동 값) `PC-327` `PC-359`
  ext?: ExtSlot[];
  // Compound 9언어 이상 심볼 수량 — cx[i] = (9 + i)언어 · (기본 + 고른 확장 코드 수) × 4 언어까지 `PC-367`
  cx?: number[];
  _cust?: string;   // 전체 고객사 보기에서만 채워지는 보유 고객사명 `PC-040`
  nhist?: { date: string; movedAt: string; by: string }[];   // 완료→진행중 전환 시 보관하는 ncp2 최종수정 이력
  // 같은 코드(SOBP)에 작업물(ncp2)이 여럿인 교재 — wn=작업 번호 · wc=그 코드의 작업 수. 코드는 1개, 작업은 N행 `PC-110`
  wn?: number; wc?: number;
  // 프로젝트명 — casterN 에서 저장한 .nproj 파일명. casterN 저장 때 자동으로 채워진다(직접 입력 없음) `PC-282`
  //   ncp2 파일명(f) · 크기(bytes) · 최종수정(nmod) 도 casterN 내보내기 · 저장 때마다 최신 값으로 덮어쓴다.
  pj?: string;
  // 편집 유형 — 유입 경로(casterN 마스터 계정 / Resource Studio) · 연동이 채운다 `PC-284`
  //   d(옛 발급일자)는 **최초 등록일**(교재 생성 요청이 처음 들어온 날짜)로 쓴다 `PC-284`
  src?: string;
  // casterN 연동 칸 중 **직접 입력**한 칸 — 자동 값이 들어오면 자동이 우선(덮어쓰고 지운다) `PC-361`
  man?: CnKey[];
};
type Cust = { customer: string; owner: string; owners?: number[]; codeKinds: string[]; books: number; pages: number; symbols: number; soundSymbols: number; penSymbols: number; sizeMB: number; topMethods?: [string, number][]; bookRows?: BR[] };
const D = { customers: EDIT_CUSTOMERS as unknown as Cust[] };

const SOUND_LABELS = SOUND_QTY.map((r) => r.label);   // 편집(기본)·Compound2~8·슬롯전환·그룹재생·게임·프롬프트·RAG·4도출력 (14)
const PEN_LABELS = PEN_QTY.map((r) => r.label);        // none·action·노트서버 (3)
const SOUND_N = SOUND_QTY.length, PEN_N = PEN_QTY.length;
const zeros = (n: number) => Array<number>(n).fill(0);
// 배열 길이를 현재 항목 수에 맞춤(구 데이터 호환): 부족하면 0 채움, 넘치면 자름
const fitArr = (arr: unknown, n: number): number[] => { const a = Array.isArray(arr) ? arr.map((x) => Number(x) || 0) : []; return Array.from({ length: n }, (_, i) => a[i] ?? 0); };
// 타입은 **소리펜 · 필기펜 2종** `PC-086` — 교원구몬/KEP 는 폐지(실데이터도 없다).
//   옛 값이 남아 있으면 필기펜으로 읽는다(적용비·심볼 단가가 필기펜 기준이었다).
const TYPES = ["소리펜", "필기펜"];
const normTy = (v?: string) => (v === "소리펜" ? "소리펜" : "필기펜");
const STATES = ["진행중", "완료", "보류"] as const;
const ST_COLOR: Record<string, { bg: string; fg: string }> = {
  진행중: { bg: "#eef6ff", fg: "#2563eb" }, 완료: { bg: "#dcfce7", fg: "#166534" }, 보류: { bg: "#fef3c7", fg: "#92400e" },
};
// 기존 데이터(O/X)는 진행중으로 간주
const stateOf = (v?: string) => (v === "완료" || v === "보류" || v === "진행중" ? v : "진행중");
// 펜 모델 목록은 **공용 저장소**에서 온다 `PC-101` — `lib/penModels.ts`
//   [코드 관리 정보 ▸ 펜 모델] 에서 한 곳으로 관리한다.
// 편집 방식 — **타입에 맞는 것만** 고른다 `PC-087`.
//   KEP_ICT(필기펜) · 교원구몬_내공100 은 폐지 `PC-086` (타입에서 교원구몬/KEP 를 뺀 것과 같은 정리).
const METHODS = [
  "기능 없음",
  "소리펜_기본", "소리펜_멀티터치", "소리펜_멀티언어", "소리펜_그룹재생(0x02)", "소리펜_슬롯전환(0x20)", "소리펜_게임", "소리펜_영상호출", "소리펜_LED(핀덴카)", "소리펜_녹음재생", "소리펜_기타 기능", "소리펜_프롬프트", "소리펜_발음평가",
  "필기펜_공유", "필기펜_플래너 연동", "필기펜_URL 링크 연동", "필기펜_gif 연동", "필기펜_PDF 연동", "필기펜_MP3 연동", "필기펜_기타 기능",
];
// 그 타입의 편집방식만 남긴다 — 「기능 없음」은 양쪽 공통 `PC-087`
const methodsForType = (ty?: string) => {
  const pre = normTy(ty) === "소리펜" ? "소리펜_" : "필기펜_";
  return METHODS.filter((m) => m === "기능 없음" || m.startsWith(pre));
};

// 입력칸 너비는 **격자에 맞춘다** `PC-099` — 항목마다 제각각이면 구도가 깨진다.
//   발급인 · 펜 모델 · 타입 · 편집 방식을 6열 격자 **한 줄**(1 · 2 · 1 · 2칸)에 둔다 `PC-278`.
//   칩이 붙는 셀렉트(펜 모델 · 편집 방식)는 칸 폭을 다 쓰고, 고른 값(칩)은 셀렉트 **아래**에 흐른다.
const SUB5: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const SEL_2: React.CSSProperties = { width: "100%" };
const CHIPS_3: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", minHeight: 22 };

const won = (n: number) => `₩${Math.round(n).toLocaleString()}`;
const today = () => new Date().toISOString().slice(0, 10);
// 심볼 합계에서 **[Ncode 적용] 수량은 뺀다** `PC-085` — 페이지 수이지 심볼이 아니다.
const sSum = (r: BR) => r.sm.reduce((a, b, i) => a + (i === S_PAGE_I ? 0 : b), 0) + (r.cx ?? []).reduce((a, b) => a + (b || 0), 0);
const pSum = (r: BR) => r.pm.reduce((a, b, i) => a + (i === W_PAGE_I ? 0 : b), 0);
const tSum = (r: BR) => sSum(r) + pSum(r);
// 코드 관리 정보 기준 Book 최대치 (PDS·Section별)
const BOOK_MAX: Record<string, Record<number, number>> = {
  N: { 0: 16384, 3: 8192, 5: 4096, 10: 4096, 11: 8192, 14: 8192, 15: 4096 },
  G: { 0: 8192, 3: 4096, 14: 4096 },
};
const BOOK_STEP = 100;   // Book 번호 노출 단위 `PC-046`

// Book 선택기 — 목록을 **닫지 않고** 100개씩 이어 본다 `PC-057`
//   네이티브 <select> 는 항목을 고르면 닫혀서 [＋더 보기] 를 넣을 수 없다.
function BookPicker({ value, list, more, step, onPick, onMore }: {
  value: number; list: number[]; more: boolean; step: number;
  onPick: (b: number) => void; onMore: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen((v) => !v)}
        style={{ ...S.input, background: "#fff", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center" }}>
        <span style={{ fontFamily: "ui-monospace,monospace" }}>B{value}</span>
        <span style={{ flex: 1 }} />
        <span style={{ color: "#9ca3af", fontSize: 10 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 19 }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: "calc(100% + 4px)", zIndex: 20,
            background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,.12)",
            maxHeight: 260, overflowY: "auto" }}>
            {list.map((b) => (
              <button key={b} type="button" onClick={() => { onPick(b); setOpen(false); }}
                style={{ display: "block", width: "100%", textAlign: "left", border: 0, cursor: "pointer",
                  padding: "6px 10px", fontSize: 12.5, fontFamily: "ui-monospace,monospace",
                  background: b === value ? "#eef6ff" : "#fff", color: b === value ? "#2563eb" : "#374151", fontWeight: b === value ? 700 : 400 }}>
                B{b}
              </button>
            ))}
            {more && (
              // 목록을 닫지 않고 아래로 100개를 더 붙인다
              <button type="button" onClick={(e) => { e.stopPropagation(); onMore(); }}
                style={{ display: "block", width: "100%", textAlign: "center", border: 0, borderTop: "1px solid #eef0f4",
                  cursor: "pointer", padding: "8px 10px", fontSize: 12, background: "#fafbfc", color: "#2563eb", fontWeight: 700,
                  position: "sticky", bottom: 0 }}>
                ＋ {step}개 더 보기
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
const EMPTY = (o: number): BR => ({ b: 0, s: 0, o, k: "N", pg: 0, t: "", f: "", bytes: 0, ty: "소리펜", sm: zeros(SOUND_N), pm: zeros(PEN_N), m: "", d: "" });

// bookIdx — 교재 편집 화면(모달이 아니라 별도 페이지)에서만 넘어온다.
//   "new" = 교재(책) 추가 · 숫자 = rows 인덱스의 교재 수정
// initCu — 편집 프로젝트 목록에서 **하위 고객사**를 골라 들어오면 사용 고객사 필터를 그 고객사로 연다 `PC-293`
export default function EditingDetailView({ owner: ownerProp, custName, embedded, seedCustomer, ownerFilter, pdsLock, allCustomers, bookIdx, initCu }: { owner?: string; custName?: string; embedded?: boolean; seedCustomer?: Cust; ownerFilter?: number | null; pdsLock?: CodeKind | ""; allCustomers?: boolean; bookIdx?: string; initCu?: string } = {}) {
  const params = useParams();
  const router = useRouter();
  const sp = useSearchParams();
  const owner = String(ownerProp ?? params.owner ?? "");
  // 고객사 식별자 — owner 번호는 여러 고객사가 공유할 수 있어(예: 커먼 코드) **고객사명**을 함께 넘긴다 `PC-045`
  const custKey = custName || (sp.get("c") ?? "");
  const bookMode = bookIdx != null;
  // 하위 고객사로 들어온 경우 — 교재 추가 · 수정 · 목록 사이에서 ?cu={하위 고객사} 로 이어 가고 머리에 「상위 ▸ 하위」 `PC-368`
  const cuParam = sp.get("cu") ?? "";
  const qs = (cu: string, extra?: Record<string, string>) => {
    const p = new URLSearchParams();
    if (custKey) p.set("c", custKey);
    if (cu) p.set("cu", cu);
    for (const [k, v] of Object.entries(extra ?? {})) p.set(k, v);
    const t = p.toString();
    return t ? `?${t}` : "";
  };
  const listHref = `/projects/editing/${encodeURIComponent(owner)}${qs(cuParam)}`;
  // 목록에서 하위 고객사(사용 고객사 필터 = 그 고객사)로 보고 있을 때만 넘긴다 — 필터를 바꿨으면 넘기지 않는다
  const subNow = () => { const v = initCu || cuParam; return v && fCu === v ? v : ""; };
  const bookHref = (i: number | "new", extra?: Record<string, string>) => `/projects/editing/${encodeURIComponent(owner)}/book/${i}${qs(subNow(), extra)}`;
  // 편집 프로젝트에서 사용자가 추가한 고객사(시드에 없는) — 교재 페이지에서도 같은 고객사를 찾기 위해 함께 본다
  const [customCusts, setCustomCusts] = useState<{ customer: string; owner: string; codeKinds: string[] }[]>([]);
  useEffect(() => { setCustomCusts(loadCustomCustomers()); }, []);
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
  // 이름이 주어지면 **이름으로만** 찾는다 — owner 번호로 폴백하면 같은 owner 의 다른 고객사가 잡힌다 `PC-045`
  const customSeed = useMemo<Cust | undefined>(() => {
    const c = customCusts.find((x) => (custKey ? x.customer === custKey : x.owner === owner));
    return c ? { customer: c.customer, owner: c.owner, owners: [], codeKinds: c.codeKinds,
                 books: 0, pages: 0, symbols: 0, soundSymbols: 0, penSymbols: 0, sizeMB: 0, bookRows: [] } as Cust : undefined;
  }, [customCusts, custKey, owner]);
  const cust = allCust
    ?? (custKey ? D.customers.find((c) => c.customer === custKey) : undefined)
    ?? (custKey ? undefined : D.customers.find((c) => c.owner === owner))
    ?? seedCustomer ?? customSeed;
  const st = useStore(); // 코드 프로젝트(발급 내역) — 할당된 S/O 조회용

  const key = `ncc-edit14-${cust?.customer ?? owner}`;   // v14: 심볼 배열 자리 재정렬(발음평가 편집 추가 · RAG·4도 폐기) `PC-115` — 옛 캐시 폐기
  const readOnly = !!allCustomers;                        // 전체 고객사 보기 = 조회 전용
  // 구버전 데이터(mb=MB) → bytes 로 정규화
  // 빌드 데이터는 빈 값/0 배열을 빼서 내보내므로 여기서 기본값을 복원한다 (구버전 mb=MB → bytes 도 정규화)
  const norm = (arr: unknown[]): BR[] => (arr as (BR & { mb?: number })[]).map((r) => ({
    ...r,
    pg: r.pg ?? 0, t: r.t ?? "", f: r.f ?? "", m: r.m ?? "", d: r.d ?? "", ty: normTy(r.ty),
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
  // 목록에서 타입 · 편집방식 열을 뺐다 — 필터도 함께 없앤다(교재 편집 화면에는 남는다) `PC-282`
  const [fK, setFK] = useState("");                    // 코드(PDS) 필터
  const [fSt, setFSt] = useState("");                  // 진행 상태 필터
  const [fCu, setFCu] = useState("");                  // 사용 고객사 필터 · CU_NONE = (미입력) `PC-109`
  const [fOwnerCust, setFOwnerCust] = useState("");    // 고객사 필터 — 전체 고객사 보기 `PC-040`
  const [fExt, setFExt] = useState(false);             // 확장 언어 교재만 `PC-344`
  const [cnTab, setCnTab] = useState(0);               // casterN 연동 — 코드 탭(0 = 기본, k = 확장 k) `PC-359`
  useSharedOwners();                                   // 공유 OWNER 변경 시 리렌더
  useEffect(() => { hydrateShared(); hydrateMembers(); }, []);
  useCommonMembers();
  const [sort, setSort] = useState<{ key: "t" | "p" | "d" | "b" | null; dir: 1 | -1 }>({ key: null, dir: 1 });   // 교재명·최초 등록일·Book 정렬
  const [bText, setBText] = useState("");            // Book 필터 입력값(번호 또는 낮은순/높은순) `PC-057`
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
  // dupOf — [복제]로 연 등록 폼: 원본 행 인덱스. 코드(S/O/B·종류)는 원본에 고정하고 기본 정보·심볼은 초기화한다 `PC-112`
  const [editing, setEditing] = useState<{ idx: number; row: BR; dupOf?: number } | null>(null);
  const [pick, setPick] = useState("");
  const [penPick, setPenPick] = useState("");
  const [basis, setBasis] = useState(false);
  const [kepOpen, setKepOpen] = useState(false);
  const [logDraft, setLogDraft] = useState<{ id: number | null; kind: WorkKind; content: string }>({ id: null, kind: "요청", content: "" });
  const [toast, setToast] = useState("");
  const [bookLimit, setBookLimit] = useState(BOOK_STEP);   // Book 번호 노출 개수 (＋100씩) `PC-046`
  // 이 고객사의 교재를 **로컬 저장분까지 읽었는지** `PC-092`
  //   첫 렌더의 rows 는 시드(base)라, 이 표시가 없으면 편집 폼이 **저장 전 값**으로 채워진다.
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  // 확장 언어 슬롯 — 그 Owner 의 같은 Book 을 **다른 편집 프로젝트 교재**가 이미 쓰는지 `PC-327`
  //   (예: 「Common 추가 언어 슬롯-964」 에 따로 등록된 교재). 같은 기본 Book 의 다른 작업(복제)은 같은 슬롯을 함께 쓴다.
  //   **같은 사용 고객사**가 그 슬롯 Book 을 따로 등록해 둔 교재(옛 방식 — 언어마다 교재 1개)는 막지 않고 「따로 등록됨」으로 알린다.
  //   편집 데이터는 고치지 않는다 — 따로 등록된 교재는 그대로 둔다. 다른 고객사가 쓰는 Book 만 막는다.
  const otherBooks = useMemo(() => (loadedKey === null ? [] : allEditBooks()), [loadedKey]);   // eslint-disable-line react-hooks/exhaustive-deps
  const slotIdx = useMemo(() => {
    const m = new Map<string, typeof otherBooks>();
    for (const x of otherBooks) { const key = `${codeKind(x.k, x.s)}/${x.s}/${x.o}/${x.b}`; m.set(key, [...(m.get(key) ?? []), x]); }
    return m;
  }, [otherBooks]);
  const slotBooks = (k: string, s2: number, o: number, b: number) => slotIdx.get(`${codeKind(k, s2)}/${s2}/${o}/${b}`) ?? [];
  // 다른 고객사가 쓰는 슬롯 Book — 있으면 「교재 프로젝트 · 교재명」, 없으면 ""
  const extTakenBy = (k: string, s2: number, o: number, b: number, cu = ""): string => {
    const hit = slotBooks(k, s2, o, b).find((x) => (x.cu ?? "") !== cu);
    return hit ? `${hit.cust} · ${hit.t || "교재"}${hit.cu ? ` (${hit.cu})` : ""}` : "";
  };
  // 같은 사용 고객사가 따로 등록한 슬롯 교재
  const extLegacy = (k: string, s2: number, o: number, b: number, cu = "") =>
    slotBooks(k, s2, o, b).filter((x) => (x.cu ?? "") === cu);
  // 그룹 기본 코드 교재의 확장 코드 — 교재마다 **고른 것만**(그룹 확장 순서대로 · 받은 casterN 연동 값은 그대로) `PC-366`
  //   (옛: 그룹의 확장 코드를 모두 자동으로 `PC-359`)
  const extOf = (r: BR): ExtSlot[] => {
    const g = langGroupOf(r.k, r.s, r.o);
    if (!g) return [];
    const mine = r.ext ?? [];
    return g.ext.flatMap((o) => mine.filter((e) => e.o === o).slice(0, 1));
  };
  // 확장 언어 코드 고르기 · 빼기 `PC-366` — 뺄 때 그 코드의 casterN 연동 값이 있으면 확인
  const addExt = (os: number[]) => setEditing((ed) => (ed ? { ...ed, row: { ...ed.row, ext: [...(ed.row.ext ?? []), ...os.filter((o) => !(ed.row.ext ?? []).some((e) => e.o === o)).map((o) => ({ o }))] } } : ed));
  const rmExt = (o: number) => {
    const e0 = (editing?.row.ext ?? []).find((e) => e.o === o);
    if (e0 && (e0.pj || e0.f || e0.nmod || e0.bytes) && !confirm(`O${o} 의 casterN 연동 값(ncp2 파일명 · 최종수정 등)이 함께 지워집니다. 빼시겠습니까?`)) return;
    setEditing((ed) => (ed ? { ...ed, row: { ...ed.row, ext: (ed.row.ext ?? []).filter((e) => e.o !== o) } } : ed));
  };
  // Compound 언어 수 상한 — 그룹 기본 코드 교재면 (기본 + **고른** 확장 코드 수) × 4, 아니면 단가표 그대로(8) `PC-367`
  //   (옛: 그룹 설정의 코드 수 × 4 `PC-359`)
  const cmpMax = (r: BR) => (langGroupOf(r.k, r.s, r.o) ? 4 * (1 + extOf(r).length) : 8);

  // 고객사(owner) 전환 시 해당 고객사 데이터로 재로드 (localStorage 우선, 없으면 시드)
  useEffect(() => {
    setEditing(null); setQ(""); setPage(1); setFS(null); setFO(null); setFB(null); setFK(""); setFSt(""); setFCu(initCu ?? cuParam); setFOwnerCust(""); setSort({ key: null, dir: 1 });
    setLoadedKey(null);
    if (allCustomers) { setRows(base); setLoadedKey(key); return; }   // 전체 보기는 캐시를 쓰지 않는다
    try { const raw = localStorage.getItem(key); setRows(raw ? norm(JSON.parse(raw)) : base); }
    catch { setRows(base); }
    setLoadedKey(key);
  }, [key, base]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1); }, [ownerFilter, pdsLock, fS, fO, fB, fK, fSt, fCu, fOwnerCust, fExt]);
  const toggleSort = (k: "t" | "p" | "d") => { setSort((s2) => (s2.key === k ? (s2.dir === 1 ? { key: k, dir: -1 } : { key: null, dir: 1 }) : { key: k, dir: 1 })); setPage(1); };
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
  const bill = (r: BR) => settleBook({ ty: r.ty, pg: r.pg, sm: r.sm, pm: r.pm, cx: r.cx, dcRate: r.dcRate, dcAmt: r.dcAmt }, rateOf(r));
  const cost = (r: BR) => bill(r).total;                 // 청구액
  const discounted = (r: BR) => bookHasDiscount(r);


  // 산출물(세트 개수·세부내역·출력용파일·APP 데이터)이 있는 프로젝트인지 `PC-089`
  //   옛 판정에 있던 `pm[4] > 0`(교원구몬/KEP 항목)은 뺐다 — 그 단가 항목은 폐지됐다 `PC-084`.
  const hasKep = (cust?.bookRows ?? []).some((r) => r.det || r.out || r.app || r.use || r.set);
  // 같은 코드(k/s/o/b)의 작업 순번 — 행 인덱스 → {wn, wc}. 목록 기준으로 세므로 [복제]한 행도 바로 반영된다 `PC-110` `PC-112`
  const workSeq = useMemo(() => {
    const cnt = new Map<string, number>(); const m = new Map<number, { wn: number; wc: number }>();
    const key = (r: BR) => `${r.k}/${r.s}/${r.o}/${r.b}`;
    for (const r of rows) cnt.set(key(r), (cnt.get(key(r)) ?? 0) + 1);
    const seq = new Map<string, number>();
    rows.forEach((r, i) => { const k = key(r); seq.set(k, (seq.get(k) ?? 0) + 1); m.set(i, { wn: seq.get(k)!, wc: cnt.get(k)! }); });
    return m;
  }, [rows]);
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
  // 코드 종류(좌표 속성) — PDS3 · PDS2 · PDS4(Section 44) · OID(옛 IDS 포함) `PC-037`
  const kindOpts = uniqS(rows.map((r) => codeKind(r.k, r.s)));
  const ownerCustOpts = uniqS(rows.map((r) => r._cust ?? ""));   // 전체 보기의 고객사 목록
  // 공유 OWNER(레퍼런스 코드)를 쓰는 교재 → 실제 사용 고객사를 별도 항목으로 관리
  const isSharedRow = (r: BR) => !!sharedInfo(r.s, r.o, r.k);
  const hasSharedRows = rows.some(isSharedRow);
  // 사용 고객사 열 — 공유 코드 고객사뿐 아니라 **교재에 사용 고객사 값이 하나라도 있는 고객사**(예: 네오노트-14-27)에도 보인다 `PC-109`
  //   공유 목록(sharedOwners)에 없는 S/O 라도 편집 대장이 고객사별로 나눠 쓰던 코드면 같은 항목으로 관리한다.
  // 사용 고객사 — **직접 고르지 않는다**. 이 S/O/B 를 덮는 서비스 티켓의 고객사 이름을 상태값으로 보여 준다 `PC-289`
  //   코드 타입: 티켓 PDS2 = 교재 PDS2 · 티켓 PDS3 = 교재 PDS3 · PDS4. OID 는 서비스 티켓이 없다.
  //   서비스 티켓끼리는 겹칠 수 없어(상위 · 하위 포함 `PC-174` `PC-291`) 보통 한 장만 잡힌다. 옛 데이터로 여러 장이면 좁은 범위 → 사용 중 → 최근 발급 순.
  //   티켓 원장은 브라우저 저장소에 있어, 첫 렌더(서버와 같은 화면)에서는 읽지 않고 저장분을 읽은 뒤(loadedKey)부터 찾는다.
  useServiceTickets();
  // 기존 공용 코드 교재의 사용 고객사에 서비스 티켓을 자동 발급(1회) `PC-292` — 이후 사용 고객사는 티켓의 고객사로 진하게 뜬다
  useEffect(() => { hydrateServiceTickets(); alignLegacyServiceTickets(st.companies); }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  const ticketOf = (r: BR): ServiceTicket | undefined => {
    if (loadedKey === null) return undefined;
    const ck = codeKind(r.k, r.s);    const pt = ck === "OID" ? null : ck === "PDS2" ? "PDS2" : "PDS3";
    if (!pt) return undefined;
    const hits = allServiceTickets().filter((t) => t.pt === pt && t.section === r.s && t.owner === r.o && t.bookStart <= r.b && r.b <= t.bookEnd);
    return hits.sort((a, b) => (a.bookEnd - a.bookStart) - (b.bookEnd - b.bookStart)
      || +(ticketState(b) === "사용 중") - +(ticketState(a) === "사용 중") || b.no - a.no)[0];
  };
  // 티켓이 없으면 **교재에 등록돼 있던 사용 고객사**를 쓴다(흐리게 + 「티켓 필요」) `PC-290`
  const cuOf = (r: BR) => ticketOf(r)?.company ?? (r.cu ?? "").trim();
  const isOid = (r: BR) => codeKind(r.k, r.s) === "OID";
  const cuMode = hasSharedRows || rows.some((r) => !!cuOf(r));
  const custOpts = uniqS(rows.map(cuOf));
  // 사용 고객사 상태값 — 이름 태그(만료 · 대기 티켓이면 상태를 덧붙임) · 티켓 없이 등록된 이름은 흐리게 + 티켓 필요 · 둘 다 없으면 「티켓 없음」 `PC-289` `PC-290`
  const cuBadge = (r: BR) => {
    const t = ticketOf(r);
    const reg = (r.cu ?? "").trim();
    // OID 는 서비스 티켓 대상이 아니다 — 등록된 사용 고객사를 그대로 보이고 「티켓 필요」를 붙이지 않는다
    if (!t && isOid(r)) return reg
      ? <span style={{ ...S.tag, background: "#f3f4f6", color: "#4b5563", fontWeight: 600 }} title="OID 는 서비스 티켓 대상이 아닙니다 — 등록된 사용 고객사">{reg}</span>
      : <span style={{ color: "#9ca3af" }}>-</span>;
    if (!t && reg) return (
      <span title={`서비스 티켓이 없습니다. 고객사 관리에서 ${reg} 에 S${r.s}/O${r.o}/B${r.b} 서비스 티켓을 발급하세요.`}
        style={{ display: "inline-flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
        <span style={{ ...S.tag, background: "#f9fafb", color: "#9ca3af", border: "1px dashed #d1d5db", fontWeight: 600 }}>{reg}</span>
        <span style={{ fontSize: 10.5, color: "#d97706", fontWeight: 700, whiteSpace: "nowrap" }}>⚠ 티켓 필요</span>
      </span>
    );
    if (!t) return <span style={{ color: "#9ca3af" }} title={`S${r.s}/O${r.o}/B${r.b} 를 덮는 서비스 티켓이 없습니다`}>티켓 없음</span>;
    const st = ticketState(t);
    return (
      <span title={`${t.test ? "테스트 티켓" : "서비스 티켓"} #${t.no} · ${serviceTicketText(t)} · ${t.since} ~ ${t.until}`}>
        <span style={{ ...S.tag, background: "#f3e8ff", color: "#7e22ce", fontWeight: 700 }}>{t.company}</span>
        {st !== "사용 중" && <span style={{ fontSize: 10.5, color: "#9ca3af", marginLeft: 4 }}>{st}</span>}
      </span>
    );
  };
  // 확장 언어 교재 — 확장 슬롯을 붙인 교재 + 같은 사용 고객사가 슬롯 Book 을 따로 등록해 둔 교재(옛 방식) `PC-344`
  const hasExt = (r: BR) => {
    if ((r.ext ?? []).length) return true;
    const g = langGroupOf(r.k, r.s, r.o);
    return !!g && g.ext.some((o) => extLegacy(r.k, r.s, o, r.b, (r.cu ?? "").trim()).length > 0);
  };
  const extGroup = !readOnly && rows.some((r) => !!langGroupOf(r.k, r.s, r.o));   // 이 고객사에 확장 언어 그룹이 있는가
  const extCount = extGroup ? rows.filter(hasExt).length : 0;
  const filtered = rows.map((r, i) => [r, i] as const)
    .filter(([r]) => (fExt ? hasExt(r) : true))
    .filter(([r]) => (pdsLock ? codeKind(r.k, r.s) === pdsLock : true))   // 목록에서 고른 코드 종류 강제
    .filter(([r]) => (ownerFilter == null ? true : r.o === ownerFilter))
    .filter(([r]) => (fS == null ? true : r.s === fS))
    .filter(([r]) => (fO == null ? true : r.o === fO))
    .filter(([r]) => (fB == null ? true : r.b === fB))
    .filter(([r]) => (fK ? codeKind(r.k, r.s) === fK : true))
    .filter(([r]) => (fOwnerCust ? r._cust === fOwnerCust : true))
    .filter(([r]) => (fCu ? (fCu === CU_NONE ? !ticketOf(r) && !isOid(r) : cuOf(r) === fCu) : true))   // (티켓 없음) = 티켓 필요 교재 포함 `PC-109` `PC-289` `PC-290`
    .filter(([r]) => (q ? `${r.t ?? ""} ${r.f ?? ""} ${cuOf(r)}`.toLowerCase().includes(q.toLowerCase()) : true));   // 교재명·프로젝트명(ncp2 파일명 포함)·사용고객사 검색 `PC-282`
  // 교재명(가나다) / 최초 등록일(날짜) 정렬 — 값 없는 행은 항상 뒤로
  if (sort.key === "b") {
    filtered.sort(([a], [b]) => (a.b - b.b) * sort.dir);
  } else if (sort.key) {
    const k = sort.key;
    filtered.sort(([a], [b]) => {
      const pick = (r: BR) => (k === "t" ? r.t : k === "p" ? r.f : r.d) ?? "";   // p = NCP2명 `PC-369`
      const va = pick(a), vb = pick(b);
      if (!va && !vb) return 0;
      if (!va) return 1;
      if (!vb) return -1;
      return k !== "d" ? va.localeCompare(vb, "ko") * sort.dir : (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
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
  const isFiltered = fS != null || fO != null || fB != null || !!fK || !!fCu || !!fOwnerCust || !!q || fExt;
  const clearFilters = () => { setFS(null); setFO(null); setFB(null); setBText(""); setFK(""); setFSt(""); setFCu(""); setFOwnerCust(""); setQ(""); setFExt(false); setSort({ key: null, dir: 1 }); setPage(1); };

  // 할당된 S/O (수정 불가) — 편집 데이터 + 소유권 데이터 + 코드 프로젝트 발급 내역
  const allocBooks = useMemo(() => projectBooks(st.projects, st.companies), [st]);
  const assignedSO = useMemo(
    () => assignedSOFor(cust?.customer ?? "", allocBooks),
    [cust, allocBooks]
  );
  // 좌표(S/O) 단위로 합친다 `PC-083` — 종류(N·G)는 뒤의 [코드 종류]에서 고르므로
  //   같은 S/O 가 두 줄로 나올 이유가 없다. k 는 그 좌표에서 쓸 수 있는 기본값만 남긴다.
  const assignedCoords = useMemo(() => {
    const m = new Map<string, { s: number; o: number; ks: string[] }>();
    for (const a of assignedSO) {
      const key = `${a.s}/${a.o}`;
      const cur = m.get(key);
      if (cur) { if (!cur.ks.includes(a.k)) cur.ks.push(a.k); }
      else m.set(key, { s: a.s, o: a.o, ks: [a.k] });
    }
    return [...m.values()].sort((x, y) => x.s - y.s || x.o - y.o);
  }, [assignedSO]);

  // 사용 가능한 Book 번호 — 발급된 SO 아래 편집 안 된(사용 가능) Book 을 노출 (편집된 Book 만 제외)
  //   한 번에 다 그리면 느려서 **100개씩** 보여 주고 [더 보기] 로 100씩 늘린다 `PC-046`
  //   **사용한 Book 은 노출하지 않는다** `PC-112` — 이 고객사 교재 목록(화면에서 추가한 행 포함)에 있는 Book 도 뺀다.
  const freeBooks = (k: string, sec: number, own: number, keep?: number, limit = bookLimit) => {
    const used = new Set(rows.filter((r) => sameBookSpace(r.k, k) && r.s === sec && r.o === own && r.b !== keep).map((r) => r.b));   // 다른 타입이 쓴 Book 도 뺀다 `PC-281`
    return editableBookNumbers(k, sec, own, BOOK_MAX[k]?.[sec] ?? 4096, limit, keep, allocBooks, used);
  };

  // 교재 편집은 별도 페이지 — 목록에서는 이동만 하고, 편집 상태는 그 페이지에서 만든다.
  const openAdd = () => router.push(bookHref("new"));
  // [복제] — 같은 코드(S/O/B)에 작업물을 하나 더 만든다. 코드는 고정, 기본 정보·심볼은 초기화 `PC-112`
  const openDup = (idx: number) => router.push(bookHref("new", { dup: String(idx) }));
  const openEdit = (idx: number) => router.push(bookHref(idx));

  // 편집 페이지 진입 시 대상 교재를 폼에 올린다 (rows 가 localStorage 로 채워진 뒤)
  useEffect(() => {
    // **로컬 저장분을 읽기 전에는 폼을 만들지 않는다** `PC-092` —
    //   먼저 만들면 시드값이 올라가고, 이 효과는 editing 이 생긴 뒤 다시 돌지 않는다.
    if (!bookMode || editing || loadedKey !== key) return;
    if (bookIdx === "new") {
      const dupIdx = sp.get("dup") != null ? Number(sp.get("dup")) : null;
      const src = dupIdx != null ? rows[dupIdx] : undefined;
      const row = EMPTY(Number(owner) || 0);
      if (src) {
        // 복제 — 코드(종류·S/O/B)와 교재명·사용 고객사만 물려받고 나머지(파일·크기·날짜·타입·편집 방식·심볼·산출물)는 비운다 `PC-112`
        row.k = src.k; row.s = src.s; row.o = src.o; row.b = src.b; row.t = src.t;
        if (src.cu) row.cu = src.cu;
      } else {
        // 할당된 S/O 기본값 — 확장 언어 코드는 교재 코드로 고르지 않는다 `PC-359`
        const a = assignedSO.find((x) => groupOfOwner(x.s, x.o)?.role !== "ext") ?? assignedSO[0];
        if (a) { row.k = a.k; row.s = a.s; row.o = a.o; row.b = freeBooks(a.k, a.s, a.o)[0] ?? 0; }
      }
      setKepOpen(true); setLogDraft({ id: null, kind: "요청", content: "" });
      setEditing(src ? { idx: -1, row, dupOf: dupIdx! } : { idx: -1, row });
      return;
    }
    const idx = Number(bookIdx);
    const r = rows[idx];
    if (!r) return;
    setKepOpen(bookHasKep(r)); setLogDraft({ id: null, kind: "요청", content: "" });
    setEditing({ idx, row: { ...r, sm: [...r.sm], pm: [...r.pm], ...(r.cx ? { cx: [...r.cx] } : {}), ...(r.ext ? { ext: r.ext.map((e) => ({ ...e })) } : {}), logs: r.logs ? r.logs.map((l) => ({ ...l })) : [] } });
    setCnTab(0);
  }, [bookMode, bookIdx, rows, editing, assignedSO, owner, loadedKey, key]);   // eslint-disable-line react-hooks/exhaustive-deps

  // 훅은 모두 호출한 뒤에 분기한다 — 고객사를 늦게(로컬 저장분) 찾는 경우가 있어 조건부 훅이 되면 안 된다 `PC-045`
  const custMissing = !cust;

  const setF = <K extends keyof BR>(k: K, v: BR[K]) => setEditing((e) => (e ? { ...e, row: { ...e.row, [k]: v } } : e));
  // `Total Page`(pg) 와 [Ncode 적용] 수량은 **서로 물리지 않는다** `PC-089`.
  //   · Total Page — 직접 입력 · **목록의 페이지 항목**에 그대로 나간다
  //   · Ncode 적용 — 직접 입력 · **적용비 계산**에 쓴다 `PC-085`
  const setSm = (i: number, v: number) => setEditing((e) => (e ? { ...e, row: { ...e.row, sm: e.row.sm.map((x, j) => (j === i ? v : x)) } } : e));
  const setPm = (i: number, v: number) => setEditing((e) => (e ? { ...e, row: { ...e.row, pm: e.row.pm.map((x, j) => (j === i ? v : x)) } } : e));
  const setCx = (i: number, v: number) => setEditing((e) => (e ? { ...e, row: { ...e.row, cx: Array.from({ length: Math.max(i + 1, e.row.cx?.length ?? 0) }, (_, j) => (j === i ? v : e.row.cx?.[j] ?? 0)) } } : e));
  // 진행 상태 변경 — 완료는 ncp2 최종수정 필수, 완료 해제 시 날짜를 이력으로 이관
  const changeState = (next: string) => {
    if (!editing) return;
    const cur = stateOf(editing.row.use);
    // 그룹 기본 코드 교재는 **모든 코드 탭**(기본 + 고른 확장 `PC-366`)에 ncp2 최종수정이 있어야 완료 `PC-359`
    const extNow = extOf(editing.row);
    if (next === "완료" && extNow.length) {
      const miss = [...(!(editing.row.nmod ?? "").trim() ? [`O${editing.row.o}(기본)`] : []), ...extNow.filter((e) => !(e.nmod ?? "").trim()).map((e) => `O${e.o}`)];
      if (miss.length) {
        alert(`ncp2 최종수정 날짜가 비어 있는 코드가 있어 완료할 수 없습니다 — ${miss.join(" · ")}. casterN 에서 코드마다 ncp2 를 내보낸 뒤 완료로 변경하세요.`);
        return;
      }
    }
    if (next === "완료" && !(editing.row.nmod ?? "").trim()) {
      alert("ncp2 최종수정 날짜가 비어 있어 완료할 수 없습니다. casterN 에서 ncp2 를 내보낸 뒤 완료로 변경하세요.");
      return;
    }
    if (cur === "완료" && next !== "완료") {
      const keep = (editing.row.nmod ?? "").trim();
      const hist = keep
        ? [...(editing.row.nhist ?? []), { date: keep, movedAt: today(), by: me?.name ?? "" }]
        : (editing.row.nhist ?? []);
      // 편집 재요청 → 날짜는 비우고 이력으로 남김
      setEditing((e) => (e ? { ...e, row: { ...e.row, use: next, nmod: "", nhist: hist, ...(e.row.ext ? { ext: e.row.ext.map((x) => ({ ...x, nmod: "" })) } : {}) } } : e));   // 확장 코드 탭의 최종수정도 비운다 `PC-359`
      return;
    }
    setF("use", next);
  };

  const locked = stateOf(editing?.row.use) === "완료";   // 완료 = 내용 잠금

  const saveRow = () => {
    if (!editing) return;
    // 할당은 넓은 코드 타입 기준 — 고른 코드 종류의 범위를 넘으면 막는다 `PC-279` (새 교재만 · OID 는 index 라 제외)
    const rowKind = codeKind(editing.row.k, editing.row.s);
    if (editing.idx === -1 && editing.dupOf == null && rowKind !== "OID") {
      const ctErr = codeTypeRangeErr(rowKind, { section: editing.row.s, owner: editing.row.o, bookStart: editing.row.b, bookEnd: editing.row.b });
      if (ctErr) { alert(ctErr); return; }
    }
    // 공유 코드의 사용 고객사 필수 검사는 없앴다 — 사용 고객사는 서비스 티켓에서 자동으로 정해진다 `PC-289`
    // 확장 언어 코드 — 그룹 기본 코드 교재면 **고른** 확장 코드만 붙인다 `PC-366`
    //   고른 코드 중 같은 Book 을 다른 고객사 교재가 쓰는 것이 있으면 막는다 · 기본 코드가 아니면 버린다
    let extRow = editing.row;
    if (!langGroupOf(editing.row.k, editing.row.s, editing.row.o)) {
      if ((editing.row.ext ?? []).length) extRow = { ...editing.row, ext: undefined };
    } else {
      const ext = extOf(editing.row);
      const cu0 = (editing.row.cu ?? "").trim();
      const bad = ext.find((e) => extTakenBy(editing.row.k, editing.row.s, e.o, editing.row.b, cu0));
      if (bad) {
        alert(`S${editing.row.s}/O${bad.o}/B${editing.row.b} 은 이미 다른 고객사 교재가 쓰고 있습니다 — ${extTakenBy(editing.row.k, editing.row.s, bad.o, editing.row.b, cu0)}. 확장 언어 코드에서 O${bad.o} 를 빼거나 다른 Book 을 고르세요.`);
        return;
      }
      extRow = { ...editing.row, ext };
    }
    // 같은 코드(S/O/B) 교재는 [복제]로만 만든다 — 일반 추가에서 겹치면 막는다 `PC-112`
    //   Book 하나는 한 코드 타입만 — 다른 타입(PDS2 · PDS3)이 쓴 Book 도 막는다 `PC-281`
    if (editing.idx === -1 && editing.dupOf == null && rows.some((r) => sameBookSpace(r.k, editing.row.k) && r.s === editing.row.s && r.o === editing.row.o && r.b === editing.row.b)) {
      alert(`S${editing.row.s}/O${editing.row.o}/B${editing.row.b} 에는 이미 교재가 있습니다. 같은 코드에 작업물을 더 만들려면 목록의 [복제]를 쓰세요.`); return;
    }
    // ncp2 파일명 중복 검사는 저장에서 하지 않는다 — 파일명은 casterN 내보내기에서 자동으로 들어오고 이 화면에서 고칠 수 없다 `PC-282`
    //   (옛 장부에 같은 파일명이 이미 110종 있어, 여기서 막으면 그 교재는 저장할 길이 없다. 중복은 casterN · 서버 매칭에서 다룬다)
    // 단가 스냅샷 — 신규 교재는 현재 고객사 단가로 고정한다.
    // 스냅샷이 없는 구 교재도 저장 시점에 현재 적용 단가로 고정해, 이후 단가 변경의 영향을 받지 않게 한다.
    const r: BR = extRow.rs ? extRow : { ...extRow, rs: { ...rateMap }, rsAt: today() };
    const next = editing.idx === -1 ? [r, ...rows] : rows.map((x, i) => (i === editing.idx ? r : x));
    commit(next);
    // 공유(커먼) 코드면 SOBP 맵에 사용 고객사·상태(편집)를 반영 (편집 프로젝트 등록 = 편집 관리 → ea=1)
    if (isSharedRow(r) && cuOf(r)) setBookOverride(r.k, r.s, r.o, r.b, { cu: cuOf(r), ea: 1 });   // 티켓의 고객사 `PC-289`
    // 확장 언어 슬롯 Book 도 SOBP 맵에 편집 표시 `PC-327`
    for (const e of r.ext ?? []) setBookOverride(r.k, r.s, e.o, r.b, { ...(cuOf(r) ? { cu: cuOf(r) } : {}), ea: 1 });
    if (editing.idx === -1) logActivity("edit", `교재 추가 · ${cust?.customer ?? owner} · S${editing.row.s}/O${editing.row.o}/B${editing.row.b} · ${editing.row.t || "교재"}`, me?.name);
    else logActivity("edit", `교재 작업 · ${cust?.customer ?? owner} · S${editing.row.s}/O${editing.row.o}/B${editing.row.b} · ${editing.row.t || "교재"}`, me?.name);
    setEditing(null);
    router.push(listHref);        // 저장 후 교재 목록으로
  };
  const delRow = (idx: number) => {
    if (!confirm("이 책(교재) 편집 행을 삭제할까요?")) return;
    const gone = rows[idx];
    commit(rows.filter((_, i) => i !== idx));
    if (gone) logActivity("edit", `교재 삭제 · ${cust?.customer ?? owner} · S${gone.s}/O${gone.o}/B${gone.b} · ${gone.t || "교재"}`, me?.name);   // `PC-248`
    setEditing(null);
    if (bookMode) router.push(listHref);
  };

  const selMethods = editing?.row.m ? editing.row.m.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const addMethod = (v: string) => { if (v && !selMethods.includes(v)) setF("m", [...selMethods, v].join(", ")); setPick(""); };
  const rmMethod = (v: string) => setF("m", selMethods.filter((x) => x !== v).join(", "));

  const selPens = editing?.row.pmdl ? editing.row.pmdl.split(/[/,]/).map((s) => s.trim()).filter(Boolean) : [];
  const addPen = (v: string) => {
    if (v && !selPens.includes(v)) setF("pmdl", [...selPens, v].join(" / "));
    setPenPick("");
  };
  const rmPen = (v: string) => setF("pmdl", selPens.filter((x) => x !== v).join(" / "));

  if (custMissing) return <div style={{ padding: 24 }}>편집 데이터를 찾을 수 없습니다. (owner {owner}) <Link href="/projects/editing">← 목록</Link></div>;

  return (
    <div style={{ padding: embedded ? "2px 2px 18px" : "20px 22px" }}>
      {/* 전체 고객사 보기는 바깥 머리(「전체 고객사 n곳」)가 제목이라 여기 제목 줄을 두지 않는다 `PC-277` */}
      {!allCustomers && <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        {!embedded && (
          // 교재 등록·상세에서는 **그 고객사 교재 목록**으로, 교재 목록 화면에서는 편집 프로젝트로 `PC-056`
          <Link href={bookMode ? listHref : "/projects/editing"} style={{ ...S.ghost, textDecoration: "none", padding: "6px 12px" }}>
            {bookMode ? "목록" : "편집 프로젝트"}
          </Link>
        )}
        <div style={{ fontSize: 18, fontWeight: 700 }}>{cust.customer}</div>
        {/* 하위 고객사로 들어온 교재 추가 · 수정 · 목록 — 「상위 ▸ 하위」 `PC-368` */}
        {!embedded && cuParam && (bookMode || fCu === cuParam) && (
          <div style={{ fontSize: 18, fontWeight: 700, color: "#7e22ce" }} title={`하위 고객사 — ${cust.customer} 코드를 쓰는 ${cuParam}`}>
            <span style={{ color: "#9ca3af", fontWeight: 400, marginRight: 6 }}>▸</span>{cuParam}
          </div>
        )}
        <span style={{ ...S.tag, fontFamily: "ui-monospace,monospace" }}>owner {cust.owners && cust.owners.length ? cust.owners.join("·") : owner}</span>
        {[...new Set((cust.bookRows ?? []).map((r) => codeKind(r.k, r.s)))].map((k) => <span key={k} style={{ ...S.tag, background: kindMeta(k).bg, color: kindMeta(k).color, fontWeight: 700 }}>{kindMeta(k).short}</span>)}
        {/* 확장 언어 그룹 고객사 — [전체] [🌐 확장 언어 n] 로 확장 언어 교재만 거른다 `PC-344` */}
        {extGroup && !bookMode && (
          <span style={{ display: "inline-flex", gap: 4 }}>
            {([[false, "전체"], [true, `🌐 확장 언어 ${extCount}`]] as const).map(([v, lab]) => (
              <button key={String(v)} type="button" aria-pressed={fExt === v} onClick={() => { setFExt(v); setPage(1); }}
                title={v ? "확장 언어 슬롯을 붙인 교재 · 슬롯 Book 을 따로 등록해 둔 교재만" : undefined}
                style={{ fontSize: 12, padding: "3px 10px", borderRadius: 999, cursor: "pointer", fontWeight: fExt === v ? 700 : 400,
                  border: `1px solid ${fExt === v ? (v ? "#67e8f9" : "#93c5fd") : "#e5e7eb"}`, background: fExt === v ? (v ? "#ecfeff" : "#eef6ff") : "#fff", color: fExt === v ? (v ? "#0e7490" : "#1d4ed8") : "#374151" }}>{lab}</button>
            ))}
          </span>
        )}
        {/* 목록용 버튼 — 교재 편집 화면에서는 숨긴다 `PC-054` · 줄이 좁으면 두 버튼이 함께 오른쪽 아래로 `PC-277` */}
        {!readOnly && !bookMode && (
          <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            <button type="button" onClick={() => { if (confirm("엑셀 시드로 초기화할까요?")) { commit(base); flash("초기화됨"); } }} style={S.ghost}>초기화</button>
            <button type="button" onClick={openAdd} style={S.primary}>＋ 교재(책) 추가</button>
          </div>
        )}
      </div>}

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
          <button type="button" onClick={() => setBasis((v) => !v)} title="계산식 · 단가 근거" aria-label="계산식 · 단가 근거" aria-expanded={basis}
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
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder={hasSharedRows ? "교재명·NCP2명·사용고객사 검색" : "교재명·NCP2명 검색"} style={{ ...S.input, width: hasSharedRows ? 280 : 240, paddingRight: 26 }} />
          {q && <button onClick={() => { setQ(""); setPage(1); }} title="검색어 지우기"
            style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", border: 0, background: "none", color: "#9ca3af", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>×</button>}
        </div>
      </div>

      <div style={{ ...S.card, padding: 0, overflow: "auto" }}>
        <table style={{ ...S.table, textAlign: "center", minWidth: 1120 }}>
          <thead>
            {/* 열 순서 `PC-369` — No · 코드 · S/O/B · 교재명 · NCP2명 · 페이지 · 심볼 개수 · (고객사) · (사용 고객사) · 최초 등록일 · ncp2 최종수정 · 메모 · 정산 · (복제)
                 프로젝트명 · 상태 열은 없앴다 */}
            <tr>{["No", "코드", "S/O/B", "교재명", "NCP2명", "페이지", "심볼 개수", ...(readOnly ? ["고객사"] : []), ...(cuMode ? ["사용 고객사"] : []), "최초 등록일", "ncp2 최종수정", "메모", "정산 (청구액)", ...(readOnly ? [] : ["복제"])].map((h) => {
              const k = h === "교재명" ? "t" : h === "NCP2명" ? "p" : h === "최초 등록일" ? "d" : null;   // 정렬 가능한 항목 — 옛 발급일 `PC-284` · p = NCP2명(옛 프로젝트명 `PC-369`)
              return (
                <th key={h} style={{ ...S.th, textAlign: h === "S/O/B" ? "left" : "center", cursor: k ? "pointer" : "default", userSelect: "none" }}
                  onClick={() => k && toggleSort(k)} title={k ? "클릭하면 오름차순 → 내림차순 → 해제" : undefined}>
                  {h}{k && <span style={{ marginLeft: 3, color: sort.key === k ? "#2563eb" : "#d1d5db" }}>{sort.key === k ? (sort.dir === 1 ? "▲" : "▼") : "↕"}</span>}
                </th>
              );
            })}</tr>
            {/* 항목명 아래 필터 — S 선택 → O 목록, O 선택 → B 목록이 종속되어 좁혀짐 */}
            <tr>
              <th style={filterTh} />
              {/* 코드(PDS) */}
              <th style={filterTh}>
                <select value={pdsLock || fK} onChange={(e) => setFK(e.target.value)} disabled={!!pdsLock} style={{ ...fSel, minWidth: 58, ...(pdsLock ? { background: "#f3f4f6", color: "#6b7280" } : {}) }} title={pdsLock ? "목록의 PDS 필터로 고정됨" : "코드 종류"}>
                  {!pdsLock && <option value="">전체</option>}
                  {(pdsLock ? [pdsLock] : kindOpts).map((v) => <option key={v} value={v}>{kindMeta(v as CodeKind).short}</option>)}
                </select>
              </th>
              {/* Book(B) 필터 — 낮은순 · 높은순 · 직접 입력 `PC-052` */}
              <th style={filterTh}>
                {/* 입력칸을 눌러 **번호를 직접 치거나** 목록에서 정렬을 고른다 `PC-057` */}
                <div style={{ display: "flex", gap: 4, alignItems: "center", justifyContent: "flex-start" }}>
                  <input list="ncc-bfilter" value={bText} placeholder="B 전체" title="Book 번호를 입력하거나 낮은순·높은순을 고르세요"
                    onChange={(e) => {
                      const v = e.target.value.trim();
                      setBText(v);
                      if (v === "낮은순" || v === "높은순") { setFB(null); setSort({ key: "b", dir: v === "낮은순" ? 1 : -1 }); }
                      else if (v === "") { setFB(null); setSort({ key: null, dir: 1 }); }
                      else if (/^\d+$/.test(v)) { setFB(+v); }
                      else { setFB(null); }
                      setPage(1);
                    }}
                    style={{ ...fSel, minWidth: 86 }} />
                  <datalist id="ncc-bfilter">
                    <option value="낮은순" />
                    <option value="높은순" />
                  </datalist>
                  {bText && (
                    <button type="button" onClick={() => { setBText(""); setFB(null); setSort({ key: null, dir: 1 }); setPage(1); }}
                      style={{ border: 0, background: "none", color: "#9ca3af", cursor: "pointer", fontSize: 12, padding: 0 }} title="B 전체로">✕</button>
                  )}
                </div>
              </th>
              {/* 교재명 · NCP2명 */}
              <th style={filterTh} />
              <th style={filterTh} />
              {/* 페이지 · 합계 */}
              {Array.from({ length: 2 }, (_, i) => <th key={i} style={filterTh} />)}
              {/* 고객사 (전체 보기) */}
              {readOnly && (
                <th style={filterTh}>
                  <select value={fOwnerCust} onChange={(e) => { setFOwnerCust(e.target.value); setPage(1); }} style={{ ...fSel, maxWidth: 130 }} title="고객사">
                    <option value="">고객사 전체</option>
                    {ownerCustOpts.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </th>
              )}
              {/* 사용 고객사 — 비어 있는 교재만 따로 볼 수 있다 `PC-109` */}
              {cuMode && (
                <th style={filterTh}>
                  <select value={fCu} onChange={(e) => setFCu(e.target.value)} style={{ ...fSel, maxWidth: 120 }} title="사용 고객사">
                    <option value="">전체</option>
                    <option value={CU_NONE}>(티켓 없음)</option>
                    {custOpts.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </th>
              )}
              {/* 최초 등록일 · ncp2 최종수정 · 메모 · 정산 (· 복제) */}
              {Array.from({ length: readOnly ? 4 : 5 }, (_, i) => <th key={`t${i}`} style={filterTh} />)}
            </tr>
          </thead>
          <tbody>
            {pageRows.map(([r, idx]) => (
              <tr key={idx} onClick={() => { if (!readOnly) openEdit(idx); }} title={readOnly ? "전체 보기는 조회 전용 — 왼쪽에서 고객사를 고르면 수정할 수 있습니다" : "클릭하면 수정"} style={{ borderTop: "1px solid #eef0f4", cursor: readOnly ? "default" : "pointer" }}>
                <td style={{ ...S.td, color: "#9ca3af", fontFamily: "ui-monospace,monospace" }}>{idx + 1}</td>
                <td style={S.td}><span style={{ ...S.tag, background: kindMeta(codeKind(r.k, r.s)).bg, color: kindMeta(codeKind(r.k, r.s)).color, fontWeight: 700 }}>{kindMeta(codeKind(r.k, r.s)).short}</span></td>
                <td style={{ ...S.td, textAlign: "left" }}>
                  {/* S · O · B 칩 옆에 확장 언어 슬롯 칩 [확장] {o} — 같은 칩 모양으로 **한 줄에**(아래로 내리지 않는다) `PC-327`
                      실선 = 이 교재에 고른 슬롯 · 점선 = 같은 사용 고객사가 그 슬롯 Book 을 따로 등록해 둔 교재(표시만 · 데이터는 그대로) */}
                  {(() => {
                    const g = langGroupOf(r.k, r.s, r.o);
                    const mine = (r.ext ?? []).map((e) => e.o);
                    const legacy = g ? g.ext.filter((o) => !mine.includes(o) && extLegacy(r.k, r.s, o, r.b, (r.cu ?? "").trim()).length > 0) : [];
                    return (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, flexWrap: "nowrap", whiteSpace: "nowrap" }}>
                        {/* SobpChips 는 안에서 줄바꿈하므로 같은 칩(Sc)을 직접 늘어놓는다 */}
                        <Sc k="S" v={r.s} name="Section" small />
                        <Sc k="O" v={r.o} name="Owner" small />
                        <Sc k="B" v={r.b} name="Book" small />
                        {g && mine.slice(0, 2).map((o) => (
                          <Sc key={`m${o}`} k="확장" v={o} c="#0891b2" small name={`확장 언어 코드 S${r.s}/O${o}/B${r.b} — ${extLangText(g, o)}`} />
                        ))}
                        {/* 확장 코드가 많으면(예: Common-21 확장 20개) 둘만 보이고 나머지는 +n `PC-359` */}
                        {g && mine.length > 2 && (
                          <span title={mine.slice(2).map((o) => `O${o}`).join(" · ")} style={{ fontSize: 10.5, color: "#0891b2", fontWeight: 700 }}>+{mine.length - 2}</span>
                        )}
                        {g && legacy.map((o) => (
                          <Sc key={`l${o}`} k="확장" v={o} c="#0891b2" small dashed
                            name={`같은 Book 이 확장 슬롯에 따로 등록돼 있습니다 — S${r.s}/O${o}/B${r.b} (${extLangText(g, o)})\n교재를 열어 확장 언어 슬롯을 고르면 이 교재에 묶여 보입니다(따로 등록된 교재는 그대로)`} />
                        ))}
                      </span>
                    );
                  })()}
                </td>
                <td style={{ ...S.td, fontWeight: 600, textAlign: "left", maxWidth: 200 }}>
                  {r.t || "-"}
                  {/* 같은 코드의 작업이 여럿이면 몇 번째 작업인지 표시 — 코드 1개 · 작업 N행 `PC-110` */}
                  {(() => {   // 같은 코드의 작업 수는 현재 목록에서 센다([복제]로 늘어난 행 포함) `PC-112`
                    const w = workSeq.get(idx);
                    return w && w.wc > 1 ? <span style={{ ...S.tag, marginLeft: 5, fontSize: 10, background: "#fff7ed", color: "#c2410c", fontWeight: 700 }} title={`같은 코드(S${r.s}/O${r.o}/B${r.b})에 작업물이 ${w.wc}건 — 이 행은 ${w.wn}번째`}>작업 {w.wn}/{w.wc}</span> : null;
                  })()}
                </td>
                {/* NCP2명 — casterN 에서 내보낸 ncp2 파일명(자동 · 직접 등록 가능) · 프로젝트명 열은 두지 않는다 `PC-369` */}
                <td style={{ ...S.td, textAlign: "left", maxWidth: 220, fontSize: 11, fontFamily: "ui-monospace,monospace", wordBreak: "break-all" }}>
                  {r.f ? <span style={{ color: "#374151" }}>{r.f}</span> : <span style={{ color: "#d1d5db" }} title="casterN 에서 ncp2 를 내보내면 채워집니다">미연동</span>}
                </td>
                <td style={S.td}>{(() => { const st = typeof r.sp === "number" ? r.sp : 1; return `${st.toLocaleString()}~${(st + r.pg - 1).toLocaleString()}`; })()}<div style={{ fontSize: 10, color: "#9ca3af" }}>{r.pg.toLocaleString()}p</div></td>
                {/* 심볼 개수 (합계) */}
                <td style={{ ...S.td, fontWeight: 700, whiteSpace: "nowrap" }}>
                  {tSum(r).toLocaleString()}
                </td>
                {readOnly && <td style={{ ...S.td, fontSize: 11.5, textAlign: "left", maxWidth: 140, fontWeight: 600 }}>{r._cust ?? "-"}</td>}
                {cuMode && (
                  <td style={{ ...S.td, fontSize: 11.5, textAlign: "left", maxWidth: 130 }}>
                    {/* 서비스 티켓의 고객사(자동) · 없으면 **티켓 없음** `PC-289` */}
                    {cuBadge(r)}
                  </td>
                )}
                <td style={{ ...S.td, fontSize: 11, color: "#6b7280" }}>{r.d || "-"}</td>
                <td style={{ ...S.td, fontSize: 11, color: r.nmod ? "#374151" : "#d1d5db" }}>{r.nmod || "-"}</td>
                <td style={S.td}>{(r.logs?.length ?? 0) > 0 ? <span style={{ ...S.tag, background: "#eef6ff", color: "#2563eb" }}>{r.logs!.length}</span> : <span style={{ color: "#d1d5db" }}>0</span>}</td>
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
                {!readOnly && (
                  <td style={S.td} onClick={(e) => e.stopPropagation()}>
                    {/* 같은 코드에 작업물을 하나 더 — 코드 고정 · 기본 정보·심볼 초기화 `PC-112` */}
                    <button onClick={() => openDup(idx)} style={{ ...S.ghost, padding: "3px 8px", fontSize: 11 }} title="같은 S/O/B 코드로 교재 행을 하나 더 만듭니다 (ncp2 가 다른 작업물)">복제</button>
                  </td>
                )}
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
            <div style={{ fontWeight: 700, fontSize: 15 }}>{editing.idx === -1 ? (editing.dupOf != null ? "교재(책) 복제 추가" : "교재(책) 추가") : "교재(책) 편집 수정"}</div>
            {/* 복제 — 코드는 원본에 고정, 기본 정보·심볼은 새로 입력 `PC-112` */}
            {editing.dupOf != null && (
              <span style={{ ...S.tag, background: "#fff7ed", color: "#c2410c", fontWeight: 600, fontSize: 11 }}>
                복제 · 코드 S{editing.row.s}/O{editing.row.o}/B{editing.row.b} 고정 — 기본 정보·심볼 입력은 초기화됨 · casterN 연동 항목은 새 작업으로 채워집니다
              </span>
            )}
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
            {!locked && (() => {
              // 그룹 기본 코드 교재는 코드 탭마다 최종수정이 필요하다 `PC-359`
              const miss = [...(!(editing.row.nmod ?? "").trim() ? [`O${editing.row.o}`] : []), ...extOf(editing.row).filter((e) => !(e.nmod ?? "").trim()).map((e) => `O${e.o}`)];
              if (!miss.length) return null;
              return <span style={{ fontSize: 11.5, color: "#9ca3af" }}>※ 완료하려면 ncp2 최종수정 날짜가 필요합니다{extOf(editing.row).length ? ` — 비어 있는 코드 ${miss.length > 3 ? `${miss.slice(0, 3).join(" · ")} 외 ${miss.length - 3}개` : miss.join(" · ")}` : ""}.</span>;
            })()}
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
                {/* 한 줄 — 할당된 S/O · Book · 코드 종류 · (확장 언어 슬롯) · (사용 고객사) `PC-327` */}
                <div style={{ display: "grid", gridTemplateColumns: ["1.3fr", "0.9fr", "0.9fr",
                  ...(langGroupOf(editing.row.k, editing.row.s, editing.row.o) ? ["1.6fr"] : []), ...(sh || cuMode ? ["1.1fr"] : [])].join(" "), gap: 10, alignItems: "start" }}>
                  {/* 좌표만 고른다 `PC-083` — 종류는 뒤의 [코드 종류]에서 정한다 `PC-054` */}
                  <Field label={`할당된 S / O${editing.idx === -1 && editing.dupOf == null && assignedCoords.length > 0 ? " (선택)" : " (수정 불가)"}`}>
                    {editing.idx === -1 && editing.dupOf == null && assignedCoords.length > 0 ? (
                      <select style={S.input} value={`${editing.row.s}/${editing.row.o}`}
                        onChange={(e) => {
                          const [sv, ov] = e.target.value.split("/").map(Number);
                          // 지금 고른 종류를 그대로 쓰되, 그 좌표에서 못 쓰는 종류면 첫 값으로 맞춘다
                          const ks = assignedCoords.find((c) => c.s === sv && c.o === ov)?.ks ?? [];
                          const k = ks.includes(editing.row.k) ? editing.row.k : (ks[0] ?? editing.row.k);
                          setBookLimit(BOOK_STEP);
                          setEditing((ed) => (ed ? { ...ed, row: { ...ed.row, k, s: sv, o: ov, b: freeBooks(k, sv, ov, undefined, BOOK_STEP)[0] ?? 0 } } : ed));
                        }}>
                        {/* 확장 언어 그룹 — 기본 코드는 「· 기본」, 확장 코드는 「· 확장 언어 (기본 O{n})」로 보이고 **고를 수 없다** `PC-359` */}
                        {assignedCoords.map((a) => {
                          const gr = groupOfOwner(a.s, a.o);
                          return (
                            <option key={`${a.s}/${a.o}`} value={`${a.s}/${a.o}`} disabled={gr?.role === "ext"}>
                              S{a.s} / O{a.o}{gr?.role === "base" ? " · 기본" : gr?.role === "ext" ? ` · 확장 언어 (기본 O${gr.g.base})` : ""}{a.ks.some((k) => sharedInfo(a.s, a.o, k)) ? " · 공유" : ""}
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <div style={{ ...S.input, background: "#fff", color: "#374151", display: "flex", alignItems: "center", gap: 6 }}>
                        <b style={{ fontFamily: "ui-monospace,monospace" }}>S{editing.row.s} / O{editing.row.o}</b>
                        {langGroupOf(editing.row.k, editing.row.s, editing.row.o) && <span style={{ ...S.tag, fontSize: 10, background: "#dbeafe", color: "#1d4ed8", fontWeight: 700 }}>기본</span>}
                        <span style={{ fontSize: 11, color: "#9ca3af" }}>할당된 코드</span>
                      </div>
                    )}
                  </Field>
                  {/* Book — 목록을 **열어 둔 채** 100개씩 이어 볼 수 있어야 해서 직접 만든 드롭다운을 쓴다 `PC-057` */}
                  {(() => {
                    // 복제·수정에서는 Book 을 바꾸지 않는다(코드 고정) `PC-112`
                    if (editing.dupOf != null || editing.idx !== -1) {
                      return (
                        <Field label="Book (수정 불가)">
                          <div style={{ ...S.input, background: "#f9fafb", color: "#374151", display: "flex", alignItems: "center", gap: 6 }}>
                            <b style={{ fontFamily: "ui-monospace,monospace" }}>B{editing.row.b}</b>
                            <span style={{ fontSize: 11, color: "#9ca3af" }}>{editing.dupOf != null ? "복제 원본의 코드" : "등록된 코드"}</span>
                          </div>
                        </Field>
                      );
                    }
                    const probe = freeBooks(editing.row.k, editing.row.s, editing.row.o, undefined, bookLimit + 1);
                    const more = probe.length > bookLimit;
                    const list = more ? probe.slice(0, bookLimit) : probe;
                    return (
                      <Field label={`Book (사용 가능 번호${more ? ` · ${list.length}개 표시` : ` ${list.length}개`})`}>
                        <BookPicker value={editing.row.b} list={list} more={more} step={BOOK_STEP}
                          onPick={(b) => setF("b", b)} onMore={() => setBookLimit((v) => v + BOOK_STEP)} />
                      </Field>
                    );
                  })()}
                  {/* 코드 종류 — Book 다음에 둔다 `PC-054`. 좌표 할당에서는 정하지 않는다 `PC-051` */}
                  {(() => {
                    const isP4 = editing.row.s === 44;
                    const opts: { v: CodeKind; k: string }[] = isP4
                      ? [{ v: "PDS4", k: "N" }]
                      : [{ v: "PDS2", k: "G" }, { v: "PDS3", k: "N" }, { v: "OID", k: "O" }];
                    const cur = codeKind(editing.row.k, editing.row.s);
                    return (
                      <Field label="코드 종류">
                        <select style={{ ...S.input, background: "#fff" }} value={cur} disabled={isP4 || editing.idx !== -1 || editing.dupOf != null}
                          onChange={(e) => {
                            const hit = opts.find((o) => o.v === (e.target.value as CodeKind));
                            if (!hit) return;
                            setBookLimit(BOOK_STEP);
                            setEditing((ed) => (ed ? { ...ed, row: { ...ed.row, k: hit.k, b: freeBooks(hit.k, ed.row.s, ed.row.o, undefined, BOOK_STEP)[0] ?? 0 } } : ed));
                          }}>
                          {opts.map((o) => <option key={o.v} value={o.v}>{kindMeta(o.v).short}</option>)}
                        </select>
                      </Field>
                    );
                  })()}
                  {/* 확장 언어 코드 — 셀렉트로 **여러 개 고른다**(고른 칩 ✕ 로 빼기) `PC-366` (옛: 그룹 설정대로 모두 자동 `PC-359`)
                      · 항목마다 그 코드에 할당된 언어 슬롯이 보인다 · 고른 코드만 casterN 연동 탭이 생긴다
                      · 다른 고객사 교재가 그 Book 을 쓰는 코드는 고를 수 없다(「사용 중」) */}
                  {(() => {
                    const g = langGroupOf(editing.row.k, editing.row.s, editing.row.o);
                    if (!g) return null;
                    const cu0 = (editing.row.cu ?? "").trim();
                    const sel = extOf(editing.row).map((e) => e.o);
                    const takenOf = (o: number) => extTakenBy(editing.row.k, editing.row.s, o, editing.row.b, cu0);
                    const left = g.ext.filter((o) => !sel.includes(o));
                    const leftFree = left.filter((o) => !takenOf(o));
                    return (
                      <Field label={`확장 언어 코드 · 복수 선택 (${sel.length} / ${g.ext.length}개)`}>
                        <div style={SUB5}>
                          <select style={{ ...S.input, ...SEL_2 }} value="" aria-label="확장 언어 코드 추가" disabled={locked || left.length === 0}
                            onChange={(e) => { const v = e.target.value; if (v) addExt(v === "*" ? leftFree : [Number(v)]); }}>
                            <option value="">{left.length ? "＋ 확장 언어 코드 추가…" : "확장 언어 코드를 모두 골랐습니다"}</option>
                            {leftFree.length > 1 && <option value="*">모두 추가 ({leftFree.length}개)</option>}
                            {left.map((o) => {
                              const tk = takenOf(o);
                              return <option key={o} value={o} disabled={!!tk}>O{o} · 확장 {g.ext.indexOf(o) + 1} — {extLangText(g, o)}{tk ? " (사용 중)" : ""}</option>;
                            })}
                          </select>
                          <div style={CHIPS_3}>
                            {sel.length === 0 && <span style={{ fontSize: 12, color: "#9ca3af" }}>{g.ext.length ? "선택한 확장 언어 코드 없음" : "확장 코드 없음"}</span>}
                            {sel.map((o) => {
                              const tk = takenOf(o);
                              return (
                                <span key={o} title={`확장 ${g.ext.indexOf(o) + 1} · S${editing.row.s}/O${o}/B${editing.row.b} — ${extLangText(g, o)}${tk ? `\n다른 고객사가 사용 중 — ${tk}` : ""}`}
                                  style={{ ...S.tag, fontSize: 11, background: tk ? "#fef2f2" : "#ecfeff", color: tk ? "#b91c1c" : "#0e7490", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                                  🌐 O{o}{tk ? " 사용 중" : ""}
                                  {!locked && <button type="button" aria-label={`O${o} 빼기`} onClick={() => rmExt(o)} style={{ border: 0, background: "none", color: "#dc2626", cursor: "pointer", padding: 0 }}>✕</button>}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </Field>
                    );
                  })()}
                  {/* 사용 고객사 — 고르지 않는다. 이 S/O/B 에 서비스 티켓을 받은 고객사 이름이 상태값으로 뜬다 `PC-289`
                      (옛 방식: 공유 코드는 커먼 코드 체크 고객사 중 선택 · 그 밖은 직접 입력 `PC-109`) */}
                  {(sh || cuMode) && (
                    <Field label="사용 고객사 (서비스 티켓)">
                      <div style={{ ...S.input, background: "#f9fafb", display: "flex", alignItems: "center", gap: 6, minHeight: 34 }}>
                        {cuBadge(editing.row)}
                      </div>
                    </Field>
                  )}
                </div>
                {/* 고른 확장 언어 코드의 언어 슬롯 — 기본 코드(슬롯 1~4)와 함께 코드마다 한 줄 `PC-366` */}
                {(() => {
                  const g = langGroupOf(editing.row.k, editing.row.s, editing.row.o);
                  const sel = extOf(editing.row).map((e) => e.o);
                  if (!g || !sel.length) return null;
                  const line = (o: number, label: string, base: boolean) => (
                    <div key={o} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 12 }}>
                      <span style={{ minWidth: 96, fontWeight: 700, color: base ? "#1d4ed8" : "#0e7490" }}>{label} · O{o}</span>
                      {ownerSlots(g, o).map((x) => (
                        <span key={x.slot} style={{ ...S.tag, fontSize: 11, background: x.lang ? "#fff" : "#f9fafb", color: x.lang ? "#374151" : "#c0c6cf", border: "1px solid #eef0f4" }}>
                          {x.slot} {x.lang || "비어 있음"}
                        </span>
                      ))}
                    </div>
                  );
                  return (
                    <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 8, border: "1px solid #a5f3fc", background: "#f0fdff", display: "flex", flexDirection: "column", gap: 5 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: "#0e7490" }}>언어 슬롯 · 코드 {1 + sel.length}개</div>
                      {line(editing.row.o, "기본", true)}
                      {sel.map((o) => line(o, `확장 ${g.ext.indexOf(o) + 1}`, false))}
                    </div>
                  );
                })()}
                <div style={{ fontSize: 11.5, marginTop: 8, color: sh ? "#6b21a8" : "#6b7280" }}>
                  {sh
                    ? <>
                        {sh.note}
                        {sh.group && <span style={{ color: "#9ca3af" }}> · {commonRangesText(sh.group)}</span>}
                        <br />여러 고객사가 Book 번호만 나눠 쓰는 코드입니다 — 사용 고객사는 <b>이 Book 에 서비스 티켓을 받은 고객사</b>로 표시됩니다.
                      </>
                    : cuMode
                      ? `이 S/O는 ${cust.customer} 코드입니다. 사용 고객사는 이 Book 에 서비스 티켓을 받은 고객사로 표시됩니다.`
                      : `이 S/O는 ${cust.customer} 전용입니다. 별도 고객사 입력이 필요 없습니다.`}
                </div>
              </div>
            );
          })()}

          {/* 1행: 기본 정보 */}
          <div style={rowBox}>
            <div style={rowHead}>기본 정보
              {/* 같은 코드의 작업이 여럿이면 안내 — 코드 1개 · 작업 N행, ncp2 파일명으로 구분 `PC-110` */}
              {editing.row.wc && editing.row.wc > 1 && (
                <span style={{ ...S.tag, marginLeft: 8, fontSize: 11, background: "#fff7ed", color: "#c2410c", fontWeight: 600 }}>
                  같은 코드(S{editing.row.s}/O{editing.row.o}/B{editing.row.b})의 작업 {editing.row.wn}/{editing.row.wc} — ncp2 파일명으로 구분
                </span>
              )}
            </div>
            {/* 교재명 — 연동이 NPROJ 타이틀(없으면 NPROJ 파일명)로 처음 채우고 여기서 고칠 수 있다. 이후 전송에서는 바꾸지 않는다 `PC-284`.
                프로젝트 · ncp2 · 편집 유형 · 최초 등록일은 아래 [casterN 연동]에 자동으로 채워진다 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 10 }}>
              <div style={{ gridColumn: "span 2" }}>
                <Field label="교재명"><input style={S.input} value={editing.row.t} placeholder="교재명 입력" onChange={(e) => setF("t", e.target.value)} /></Field>
              </div>
            </div>
            {/* 발급인 · 펜 모델 · 타입 · 편집 방식 — 한 줄 `PC-278` (발급인이 앞 `PC-096` · 편집 방식은 타입 바로 옆 `PC-087`).
                아래 [Start Page] 행과 **같은 6열 격자**를 써서 시작 열을 맞춘다 `PC-098` */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 10, marginTop: 10, alignItems: "start" }}>
              <Field label="발급인">
                <select style={S.input} title="코드 할당자 · 사용자 명단" value={editing.row.iss ?? ""} onChange={(e) => setF("iss", e.target.value)}>
                  <option value="">- 선택 -</option>
                  {staff.map((u) => <option key={u.id} value={u.name}>{u.name} ({u.role})</option>)}
                  {editing.row.iss && !staff.some((u) => u.name === editing.row.iss) && <option value={editing.row.iss}>{editing.row.iss} (미등록)</option>}
                </select>
              </Field>
              {/* 항목명은 **위**, 고른 값은 셀렉트 **오른쪽** — 다른 항목과 같은 결 `PC-097` */}
              <div style={{ gridColumn: "span 2" }}>
              <Field label="펜 모델 · 복수 선택">
                <div style={SUB5}>
                  {/* 타입(소리펜/필기펜)에 맞는 펜 모델만 · 대표모델로 묶어 보여 준다 `PC-325` */}
                  {(() => {
                    const pm = penModelsByType(normTy(editing.row.ty));
                    const reps = [...new Set(pm.map((m) => m.rep))];
                    return (
                      <select style={{ ...S.input, ...SEL_2 }} value={penPick} onChange={(e) => addPen(e.target.value)}>
                        <option value="">＋ {normTy(editing.row.ty)} 펜 모델 추가…</option>
                        {reps.map((rep) => {
                          const opts = pm.filter((m) => m.rep === rep && !selPens.includes(m.name));
                          return opts.length ? (
                            <optgroup key={rep} label={rep}>
                              {opts.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
                            </optgroup>
                          ) : null;
                        })}
                      </select>
                    );
                  })()}
                  <div style={CHIPS_3}>
                    {selPens.length === 0 && <span style={{ fontSize: 12, color: "#9ca3af" }}>선택된 펜 모델 없음</span>}
                    {selPens.map((pm) => (
                      <span key={pm} style={{ ...S.tag, background: "#eef6ff", color: "#2563eb", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        {pm}<button type="button" aria-label={`${pm} 빼기`} onClick={() => rmPen(pm)} style={{ border: 0, background: "none", color: "#dc2626", cursor: "pointer", padding: 0 }}>✕</button>
                      </span>
                    ))}
                  </div>
                </div>
              </Field>
              </div>
              {/* 편집 방식은 타입을 따라가므로 바로 옆에 둔다 `PC-087` */}
              <Field label="타입">
                <select style={S.input} value={normTy(editing.row.ty)}
                  onChange={(e) => {
                    const ty = e.target.value;
                    // 타입을 바꾸면 그 타입에 없는 편집방식은 떨군다 `PC-087`
                    const keep = methodsForType(ty);
                    const kept = (ed0: string) => ed0.split(",").map((x) => x.trim()).filter((x) => x && keep.includes(x)).join(", ");
                    setEditing((ed) => (ed ? { ...ed, row: { ...ed.row, ty, m: kept(ed.row.m ?? "") } } : ed));
                  }}>
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <div style={{ gridColumn: "span 2" }}>
              <Field label="편집 방식 · 복수 선택">
                <div style={SUB5}>
                  <select style={{ ...S.input, ...SEL_2 }} title={`${normTy(editing.row.ty)} 타입의 편집 방식만 고를 수 있습니다`} value={pick} onChange={(e) => addMethod(e.target.value)}>
                    <option value="">＋ 편집방식 선택…</option>
                    {methodsForType(editing.row.ty).filter((mm) => !selMethods.includes(mm)).map((mm) => <option key={mm} value={mm}>{mm}</option>)}
                  </select>
                  <div style={CHIPS_3}>
                    {selMethods.length === 0 && <span style={{ fontSize: 12, color: "#9ca3af" }}>선택된 편집방식 없음</span>}
                    {selMethods.map((mm) => (
                      <span key={mm} style={{ ...S.tag, background: "#eef6ff", color: "#2563eb", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        {mm}<button type="button" aria-label={`${mm} 빼기`} onClick={() => rmMethod(mm)} style={{ border: 0, background: "none", color: "#dc2626", cursor: "pointer", padding: 0 }}>✕</button>
                      </span>
                    ))}
                  </div>
                </div>
              </Field>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 10, marginTop: 10 }}>
              <Field label="Start Page"><input type="number" min={0} style={S.input} value={typeof editing.row.sp === "number" ? editing.row.sp : 1} onChange={(e) => setF("sp", Math.max(0, +e.target.value))} /></Field>
              {/* Total Page — **직접 입력** · 목록의 페이지 항목에 반영된다. 청구액과는 무관 `PC-089` */}
              <Field label="Total Page">
                <input type="number" min={0} style={S.input} value={editing.row.pg}
                  onChange={(e) => setF("pg", Math.max(0, +e.target.value))} />
                <div style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 2 }}>목록의 페이지 항목 · 청구액과 무관</div>
              </Field>
              {/* 발급일자는 casterN 연동의 **최초 등록일**(자동)로 옮겼다 `PC-284` */}
            </div>
          </div>

          {/* casterN 연동 — **자동**으로 채워지지만 **직접 등록도 할 수 있다** `PC-282` `PC-284` `PC-361`
              · 직접 넣은 칸은 「직접」 표시 · casterN 에서 자동 값이 들어오면 **자동 값이 우선**(덮어쓴다 — lib/casterLink applyAutoLink)
              · 같은 코드 + 같은 ncp2 파일명으로 다시 들어오면 이 교재를 최신 값으로 갱신
              · 편집 유형 = 유입 경로 · 최초 등록일 = 첫 생성 요청 날짜(옛 발급일자)
              · 그룹 기본 코드 교재는 **코드마다 탭**(기본 + 위에서 고른 확장 코드만 `PC-366`) `PC-359` */}
          {(() => {
            const exts = extOf(editing.row);
            const gx = langGroupOf(editing.row.k, editing.row.s, editing.row.o);
            const tabs: { label: string; o: number }[] = exts.length
              ? [{ label: "기본", o: editing.row.o }, ...exts.map((e) => ({ label: `확장 ${(gx?.ext.indexOf(e.o) ?? 0) + 1}`, o: e.o }))]
              : [];
            const t = tabs.length ? Math.min(cnTab, tabs.length - 1) : 0;
            const valOf = (i: number) => (i === 0 ? editing.row : exts[i - 1]);
            const cv = valOf(t);
            // 직접 입력 — 기본 코드(교재 행) 또는 그 확장 코드 기록에 넣는다
            const put = (key: CnKey, value: string | number | undefined) => setEditing((ed) => {
              if (!ed) return ed;
              if (t === 0) return { ...ed, row: setManual(ed.row, key, value) };
              const ext = extOf(ed.row).map((e, i) => (i === t - 1 ? setManual(e, key, value) : e));
              return { ...ed, row: { ...ed.row, ext } };
            });
            return (
          <div style={rowBox}>
            <div style={{ ...rowHead, display: "flex", alignItems: "center", gap: 6 }}>
              casterN 연동
              <span style={{ ...S.tag, fontSize: 10.5, background: "#f3f4f6", color: "#6b7280", fontWeight: 700 }}>자동 우선</span>
              {tabs.length > 0 && <span style={{ fontSize: 11.5, color: "#0e7490", fontWeight: 400 }}>코드 {tabs.length}개 · 코드마다 등록</span>}
              <InfoTip title="casterN 연동 설명" width={360}>
                casterN 에서 ncp2 를 내보내면 그때 지정한 파일명이 <b>ncp2 파일명</b>으로 채워집니다(목록의 NCP2명).
                연동 전에는 <b>직접 등록</b>할 수 있습니다. 직접 넣은 칸에는 「직접」이 붙고, casterN 에서 값이 들어오면 <b>자동 값으로 바뀝니다</b>.
                같은 코드 · 같은 ncp2 파일명으로 다시 들어오면 이 교재가 최신 값으로 바뀝니다.
              </InfoTip>
            </div>
            {tabs.length > 0 && (
              <div role="tablist" aria-label="casterN 연동 코드" style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10, borderBottom: "1px solid #eef0f4", paddingBottom: 6 }}>
                {tabs.map((x, i) => {
                  const on = i === t; const v = valOf(i); const done = !!(v.nmod ?? "").trim();
                  return (
                    <button key={x.o} type="button" role="tab" aria-selected={on} onClick={() => setCnTab(i)}
                      title={done ? `ncp2 최종수정 ${v.nmod}` : "ncp2 최종수정 없음"}
                      style={{ fontSize: 12, padding: "4px 10px", borderRadius: 7, cursor: "pointer", fontWeight: on ? 700 : 400,
                        border: on ? "1px solid #93c5fd" : "1px solid #e5e7eb", background: on ? "#eef6ff" : "#fff", color: on ? "#2563eb" : "#374151" }}>
                      {x.label} · O{x.o}{done && <span style={{ color: "#16a34a", marginLeft: 4 }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 10 }}>
              {CN_FIELDS.map((fd) => {
                const raw = cv[fd.key];
                const manual = (cv.man ?? []).includes(fd.key);
                const st: React.CSSProperties = { ...S.input, ...(fd.mono ? { fontFamily: "ui-monospace,monospace" } : {}), ...(manual ? { borderColor: "#fcd34d", background: "#fffdf5" } : {}) };
                const lab = `${fd.label}${manual ? " · 직접" : ""}`;
                return (
                  <div key={fd.key} style={{ gridColumn: `span ${fd.span}` }}>
                    <Field label={lab}>
                      {fd.type === "src" ? (
                        <select style={st} value={String(raw ?? "")} aria-label={fd.label} onChange={(e) => put(fd.key, e.target.value)}>
                          <option value="">미연동</option>
                          {CN_SOURCES.map((o) => <option key={o} value={o}>{o}</option>)}
                          {raw && !CN_SOURCES.includes(String(raw)) && <option value={String(raw)}>{String(raw)}</option>}
                        </select>
                      ) : fd.type === "number" ? (
                        <input type="number" min={0} style={st} value={raw ? Number(raw) : ""} placeholder="미연동" aria-label={fd.label}
                          onChange={(e) => put(fd.key, e.target.value === "" ? 0 : Math.max(0, Math.round(+e.target.value)))} />
                      ) : (
                        <input type={fd.type} style={st} value={String(raw ?? "")} placeholder="미연동" aria-label={fd.label} title={raw ? String(raw) : undefined}
                          onChange={(e) => put(fd.key, e.target.value)} />
                      )}
                    </Field>
                  </div>
                );
              })}
            </div>
          </div>
            );
          })()}

          {/* 2행: 소리펜(좌) / 필기펜(우) 심볼 입력 — **타입에 맞는 쪽만 입력한다** `PC-091` */}
          {(() => {
            const penOn = normTy(editing.row.ty) !== "소리펜";
            const off = { background: "#f3f4f6", color: "#9ca3af", cursor: "not-allowed" } as React.CSSProperties;
            const dim = (on: boolean): React.CSSProperties => (on ? {} : { opacity: 0.55 });
            const lock = (on: boolean) => (on ? null : (
              <span style={{ ...S.tag, marginLeft: 6, fontSize: 9.5, background: "#f3f4f6", color: "#9ca3af", fontWeight: 700 }}
                title={`타입이 ${normTy(editing.row.ty)} 이라 잠겨 있습니다 · 타입을 바꾸면 열립니다`}>잠김</span>
            ));
            return (
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 12 }}>
            <div style={{ ...rowBox, ...dim(!penOn) }}>
              <div style={rowHead}>소리펜 심볼 입력{lock(!penOn)}
                {langGroupOf(editing.row.k, editing.row.s, editing.row.o) && (
                  <span style={{ fontSize: 11.5, color: "#0e7490", fontWeight: 400, marginLeft: 8 }}
                    title="확장 언어 그룹 — 기본 코드 4언어 + 고른 확장 언어 코드 하나마다 4언어">🌐 Compound {cmpMax(editing.row)}언어까지</span>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {/* Compound 항목은 **(기본 + 고른 확장 코드 수) × 4 언어까지** — 고른 확장이 없으면 4언어, 1개면 8언어, 2개면 12언어 `PC-367` `PC-359`
                    (상한보다 큰 항목은 감춘다 · 이미 값이 있으면 그대로 보인다) · 9언어 이상은 8언어 뒤에 이어 붙인다 */}
                {SOUND_LABELS.flatMap((lab, i) => {
                  const key = SOUND_QTY[i].key, mx = cmpMax(editing.row);
                  const n = key.startsWith("s_cmp") ? Number(key.slice(5)) : 0;
                  const out: React.ReactNode[] = [];
                  if (!(n && n > mx && !(editing.row.sm[i] > 0))) {
                    out.push(<Field key={lab} label={lab}><input type="number" disabled={penOn} style={{ ...S.input, ...(penOn ? off : {}) }} value={editing.row.sm[i]} onChange={(e) => setSm(i, +e.target.value)} /></Field>);
                  }
                  if (key === "s_cmp8") {
                    for (let n2 = CMP_EXTRA_FROM; n2 <= Math.max(mx, CMP_EXTRA_FROM - 1 + (editing.row.cx ?? []).length); n2++) {
                      const j = n2 - CMP_EXTRA_FROM;
                      if (n2 > mx && !((editing.row.cx?.[j] ?? 0) > 0)) continue;
                      out.push(<Field key={`cx${n2}`} label={`Compound ${n2}언어`}><input type="number" disabled={penOn} style={{ ...S.input, ...(penOn ? off : {}) }} value={editing.row.cx?.[j] ?? 0} onChange={(e) => setCx(j, +e.target.value)} /></Field>);
                    }
                  }
                  return out;
                })}
              </div>
            </div>
            <div style={{ ...rowBox, ...dim(penOn) }}>
              <div style={rowHead}>필기펜 심볼 입력{lock(penOn)}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                {PEN_LABELS.map((lab, i) => (
                  <Field key={lab} label={lab}><input type="number" disabled={!penOn} style={{ ...S.input, ...(!penOn ? off : {}) }} value={editing.row.pm[i]} onChange={(e) => setPm(i, +e.target.value)} /></Field>
                ))}
              </div>
            </div>
          </div>
            );
          })()}

          {/* 3행: 합산 — 편집량(TOTAL PAGE·심볼) / 정산(PDF·심볼 편집비·청구액) */}
          {(() => { const eb = bill(editing.row); return (
          <div style={{ ...rowBox, background: "#f5f9ff", borderColor: "#bfdbfe" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              {/* 정산 영역이므로 **적용비 기준값**을 보여 준다 `PC-090` — 기본 정보의 Total Page 가 아니다.
                  값은 **타입이 정하는 활성 펜**의 [Ncode 적용] 이다 `PC-091` */}
              <span style={{ fontSize: 13 }}>Ncode 적용 수 <b style={{ color: "#2563eb", fontSize: 17 }}>{ncodeApplied(editing.row).toLocaleString()}</b><span style={{ color: "#9ca3af", fontSize: 11 }}> p · {normTy(editing.row.ty)} 기준</span></span>
              <span style={{ color: "#cbd5e1" }}>|</span>
              <span style={{ fontSize: 13 }}>소리펜 합 <b style={{ color: "#2563eb" }}>{sSum(editing.row).toLocaleString()}</b></span>
              <span style={{ fontSize: 13 }}>필기펜 합 <b style={{ color: "#2563eb" }}>{pSum(editing.row).toLocaleString()}</b></span>
              <span style={{ fontSize: 13 }}>심볼 합계 <b style={{ color: "#2563eb", fontSize: 16 }}>{tSum(editing.row).toLocaleString()}</b></span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", marginTop: 8, paddingTop: 8, borderTop: "1px dashed #bfdbfe" }}>
              {/* 적용비 = **[Ncode 적용] 입력 수량** × 단가 `PC-085` — Total Page 로 계산하지 않는다 */}
              <span style={{ fontSize: 12.5, color: "#374151" }}>적용비 <b>{won(eb.pageAmt)}</b>
                <span style={{ color: "#9ca3af", fontSize: 11 }}> ({normTy(editing.row.ty)} Ncode 적용 {ncodeApplied(editing.row).toLocaleString()}p × 단가)</span></span>
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
                      <Line label="적용비 (Ncode 적용)" detail={`${normTy(row.ty)} ${ncodeApplied(row).toLocaleString()}p × 단가`} value={won(b.pageAmt)} />
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

          {/* 4행: 산출물 · 메모 `PC-089` */}
          <div style={rowBox}>
            {(hasKep || editing.idx === -1) && (
              <>
                <div style={{ ...rowHead, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 10 }} onClick={() => setKepOpen((v) => !v)}>
                  산출물 <span style={{ fontWeight: 400, color: "#9ca3af", fontSize: 11 }}>· 세트 개수 · 세부내역 · 출력용파일 · APP 데이터 (파일/링크 + 설명)</span>
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
      {/* 칸이 좁으면 칸 밖으로 숫자가 넘치지 않고 다음 줄로 내려간다 `PC-277` */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${accent ? 150 : 118}px, 1fr))`   /* 금액(₩ 10자리)은 더 넓게 */, gap: 8 }}>
        {items.map(([l, v, sub], i) => (
          <div key={i} title={sub || undefined} style={{ background: "#fff", border: "1px solid #f0f2f5", borderRadius: 8, padding: "7px 9px", minWidth: 0 }}>
            <div style={{ fontSize: 10.5, color: "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: accent ? "#2563eb" : "#111827", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{v}</div>
            {sub && <div style={{ fontSize: 10.5, color: "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>}
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
