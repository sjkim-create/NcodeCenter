"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { S, Field, Modal } from "./ui";
import { store, useStore, persistError } from "@/lib/store";
import { useAuth, currentUser } from "@/lib/authStore";
import { logActivity } from "@/lib/activityStore";
import { EDIT_BOOKS, projectBooks, rangesFor, ownersFor, usedBookMap, canAllocate, sharedInfo, ownerHolders, isBookEdited, RANGES, type BookRec, type CodeStatus } from "@/lib/codeUsage";
// 자동 추천(SOBP 추천)은 폐기 `PC-028` — 추천 제외 섹션 표시에만 쓴다
import { isExcluded, type Pds } from "@/lib/sobpRecommend";
import { hydrateShared, markShared, useSharedOwners, customShared, BUILT_IN } from "@/lib/sharedOwners";
import { commonCodeOf } from "@/lib/commonCodes";
import { membersOf, hydrateMembers, useCommonMembers } from "@/lib/commonMembers";
import { langLabelOfOwner, isLangOwner, LANG_PDS, LANG_SECTION } from "@/lib/languageSlots";
import { hydrateOverrides, overrideOf, useBookOverrides } from "@/lib/editOverrides";
import { Sc, SobpChips, KindChip, PenChip } from "./sobp";
import { codeKind, CODE_KINDS, kindMeta, type CodeKind } from "@/lib/codeKind";
import { SERVICE, type ServiceType } from "@/lib/customerData";

// 좌표(SOBP) 정원 — 코드 종류·섹션별 owner/book/page 최대치 (코드 관리 정보 기준)
//   좌표가 먼저이고 종류는 좌표의 속성이다. PDS4 = Section 44(S-code) · OID = index 전용(옛 IDS 포함).
const SCALE: Partial<Record<CodeKind, Record<number, { o: number; b: number; p: number }>>> = {
  PDS3: { 0: { o: 1024, b: 16384, p: 4096 }, 3: { o: 1024, b: 8192, p: 512 }, 5: { o: 256, b: 4096, p: 4096 }, 10: { o: 1024, b: 4096, p: 1024 }, 11: { o: 1024, b: 8192, p: 512 }, 14: { o: 1024, b: 8192, p: 32 }, 15: { o: 32768, b: 4096, p: 512 } },
  PDS2: { 0: { o: 524288, b: 8192, p: 1024 }, 3: { o: 4096, b: 4096, p: 4096 }, 14: { o: 4096, b: 4096, p: 1024 } },
  // PDS4(S-code) — Code Info 정식 범위: owner 0~4095 · bookcode 0~255 · page 0~255 · xy 0~255 `PC-042`
  PDS4: { 44: { o: 4096, b: 256, p: 256 } },
  // OID = index 전용(옛 IDS/A코드 포함) — 데이터가 있는 Section 만 노출
  OID: { 3: { o: 4096, b: 8192, p: 4096 }, 4: { o: 1024, b: 4096, p: 512 } },
};
// 종류 → 데이터 종류값(코드 원장·편집 데이터의 k). PDS4 는 Section 44 로 판별하므로 원장 기준 N 을 쓴다.
//   OID 는 데이터 k="O" 와 옛 IDS 표기 k="A" 를 함께 본다 (동일 용어, PC-035).
const DK: Record<CodeKind, string> = { PDS3: "N", PDS2: "G", PDS4: "N", OID: "O" };
// 직접 코드 할당에서 고를 수 있는 종류 — OID 는 index 부여라 좌표 할당 대상이 아니다.
const ALLOC_KINDS: CodeKind[] = ["PDS3", "PDS2", "PDS4"];
const hue = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; };

// 사용 중: 편집 데이터(교재) + 소유권 데이터(범위) + 코드 프로젝트(신규 할당)
type Rec = BookRec & { edited: boolean };
const PAGE_O = 80;           // Owner 카드 1회 노출 개수 (스크롤/더 보기로 확장)
const PAGE_B = 80;           // Book 카드 1회 노출 개수 (스크롤/더 보기로 확장)
const uniqSort = (a: number[]) => [...new Set(a)].sort((x, y) => x - y);
// 시작 번호 직접 입력값 → 0 ~ max-1 로 보정 (빈 값이면 0)
const clampNum = (v: string, max: number) => {
  const n = parseInt(v.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? Math.max(0, Math.min(max - 1, n)) : 0;
};
const rank = (s: CodeStatus) => (s === "편집" ? 3 : s === "코드발급" ? 2 : s === "사용가능" ? 1 : 0);
// 상태 색 — 범례와 동일한 팔레트 (카드 배지에 그대로 적용). 공유는 상태가 아니라 OWNER 속성.
const ST_C: Record<string, string> = { 편집: "#5f8ff0", 코드발급: "#14b8a6", 사용가능: "#f59e0b", 공유: "#a855f7", 미사용: "#eef1f6" };
// 표시 라벨 — 상태 '미사용'은 '코드 미발급'으로 노출. '사용가능'은 그대로 사용.
const stLabel = (s: string) => (s === "미사용" ? "코드 미발급" : s);
// 상태 필터 칩 표시 라벨 — 내부 필터값은 유지하고 화면 표기만 분리
const F_LABEL: Record<string, string> = {
  "전체": "전체", "코드 발급": "발급 전체", "코드 미발급": "코드 미발급",
  "편집": "편집", "공유": "공유", "사용가능": "사용가능",
};
const stColor = (st: string): React.CSSProperties =>
  st === "미사용" ? { background: "#f3f4f6", color: "#9ca3af" } : { background: ST_C[st], color: "#fff", fontWeight: 700 };

export default function OwnershipMap() {
  const { companies, projects } = useStore();
  const me = currentUser(useAuth());
  // 사업 종료 고객사 — 발급됐던 코드를 리셋(미발급)해 다른 회사가 재할당 가능하게 한다.
  const _cnz = (s?: string) => (s ?? "").replace(/\s+/g, "").toLowerCase();
  const closedNames = useMemo(() => new Set(companies.filter((c) => c.closed).map((c) => _cnz(c.name))), [companies]);
  // 스토어(코드 프로젝트)의 발급 내역 → 맵 레코드 (신규 할당분 포함). 사업 종료 회사 코드는 제외 → 미발급.
  const RECS: Rec[] = useMemo(
    () => [...EDIT_BOOKS, ...projectBooks(projects, companies)]
      .filter((r) => !closedNames.has(_cnz(r.cust)))
      .map((r) => ({ ...r, edited: r.status === "편집" })),
    [projects, companies, closedNames]
  );

  const [kind, setKind] = useState<CodeKind | "ALL">("ALL");   // 코드 필터 — 전체 / PDS2 / PDS3 / PDS4 / OID `PC-039`
  //   전체(ALL)는 원장이 N·G 양쪽으로 잡히므로 "N" 으로 조회하면 모두 포함된다.
  const pds = kind === "ALL" ? "N" : DK[kind];             // 데이터 조회용 종류값
  // 종류 칩을 고르면 그 종류의 **첫 좌표(S→O→B)** 로 이동한다 `PC-038`
  //   ① 편집·코드 데이터(RECS) 의 첫 좌표 → ② 원장(ownersFor) 의 첫 owner → ③ 첫 Section·owner 0
  const firstSobpOf = (k2: CodeKind | "ALL") => {
    const secList = k2 === "ALL"
      ? [...new Set(Object.values(SCALE).flatMap((m) => Object.keys(m).map(Number)))].sort((a, b) => a - b)
      : Object.keys(SCALE[k2] ?? {}).map(Number).sort((a, b) => a - b);
    const hit = RECS
      .filter((r) => (k2 === "ALL" || codeKind(r.k, r.sec) === k2) && secList.includes(r.sec))
      .sort((a, b) => a.sec - b.sec || a.owner - b.owner || a.book - b.book)[0];
    if (hit) return { s: hit.sec, o: hit.owner, b: hit.nb ? -1 : hit.book };
    for (const s2 of secList) {
      const own = ownersFor(k2 === "ALL" ? "N" : DK[k2], s2).filter((r) => !closedNames.has(_cnz(r.account)))
        .sort((a, b) => a.owner - b.owner)[0];
      if (own) return { s: s2, o: own.owner, b: -1 };
    }
    return { s: secList[0] ?? 0, o: -1, b: -1 };
  };

  // 자동 추천(SOBP 추천)은 PDS3·PDS2 만 대상 — PDS4(Section 44)·OID 는 직접 선택으로 다룬다.
  const recoPds: Pds = kind === "PDS2" ? "G" : "N";
  const recoTarget = kind === "PDS3" || kind === "PDS2" || kind === "ALL";
  const [alloc, setAlloc] = useState<{ company: string; newCompany: string; bookStart: number; books: number; pages: number; mode: "코드발급" | "편집"; shared: boolean; service: ServiceType } | null>(null);
  const [aKindSel, setAKindSel] = useState<CodeKind | null>(null);                    // 할당 모달의 코드 종류(지도 선택과 분리) `PC-046`
  const [selS, setSelS] = useState(0);
  const [selO, setSelO] = useState(1);
  const [selB, setSelB] = useState(0);
  const [fAcct, setFAcct] = useState("");
  const [fStat, setFStat] = useState<"전체" | "코드 발급" | "코드 미발급" | "편집" | "공유" | "사용가능">("전체");
  const shVer = useSharedOwners();                     // 공유 OWNER 변경 시 리렌더
  useCommonMembers();                                  // 공통코드 사용 고객사(하위 등록) 변경 시 리렌더
  useBookOverrides();                                   // 편집 프로젝트의 Book 오버라이드(사용 고객사) 변경 시 리렌더
  useEffect(() => { hydrateShared(); hydrateOverrides(); hydrateMembers(); }, []);   // 마운트 후 localStorage 로드
  const [q, setQ] = useState("");
  const [tip, setTip] = useState<{ x: number; y: number; html: string } | null>(null);
  const [oLimit, setOLimit] = useState(PAGE_O);   // Owner 노출 개수
  const [bLimit, setBLimit] = useState(PAGE_B);   // Book 노출 개수
  const [oFrom, setOFrom] = useState("");         // Owner 시작 번호 직접 입력 → 그 번호부터 노출
  const [bFrom, setBFrom] = useState("");         // Book 시작 번호 직접 입력 → 그 번호부터 노출

  // 목록 스크롤이 바닥 근처면 다음 묶음을 로드(보이는 부분만 우선 렌더)
  const onScrollMore = (grow: (fn: (v: number) => number) => void) => (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 160) grow((v) => v + PAGE_O);
  };

  const secs = useMemo(() => {
    if (kind !== "ALL") return Object.keys(SCALE[kind] ?? {}).map(Number).sort((a, b) => a - b);
    const all = new Set<number>();
    Object.values(SCALE).forEach((m) => Object.keys(m).forEach((k2) => all.add(Number(k2))));
    return [...all].sort((a, b) => a - b);
  }, [kind]);
  // 전체 보기의 섹션 정원 = 그 섹션을 쓰는 종류들의 최대치
  const dimsOf = (sec: number) => {
    if (kind !== "ALL") return (SCALE[kind] ?? {})[sec];
    const cand = Object.values(SCALE).map((m) => m[sec]).filter(Boolean);
    if (!cand.length) return undefined;
    return { o: Math.max(...cand.map((c) => c.o)), b: Math.max(...cand.map((c) => c.b)), p: Math.max(...cand.map((c) => c.p)) };
  };
  const scale = dimsOf(secs.includes(selS) ? selS : secs[0]) ?? { o: 1024, b: 4096, p: 512 };
  const curS = secs.includes(selS) ? selS : secs[0];
  // 고객사 목록 — 공유 코드의 실제 사용 고객사(cu)도 포함해 검색·필터에서 찾을 수 있게 한다
  const accounts = useMemo(() => [...new Set(RECS.flatMap((r) => [r.cu, r.cust]).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "ko")), [RECS]);

  const secRecs = useMemo(
    () => RECS.filter((r) => r.sec === curS && (kind === "ALL" || codeKind(r.k, r.sec) === kind)),
    [RECS, kind, curS]);
  // owner 별 코드 종류(용도 표시) — 한 owner 가 Book 을 나눠 PDS2·PDS3 를 함께 쓸 수 있다 `PC-039`
  const ownerKinds = useMemo(() => {
    const m = new Map<number, CodeKind[]>();
    secRecs.forEach((r) => {
      if (r.fromProject && !r.kindSet) return;      // 원장 보강(코드 종류 미정)은 배지에 쓰지 않는다
      const kd = codeKind(r.k, r.sec);
      const cur = m.get(r.owner) ?? [];
      if (!cur.includes(kd)) m.set(r.owner, [...cur, kd]);
    });
    return m;
  }, [secRecs]);
  // 소유권 데이터(할당된 코드) · 사업 종료 회사 제외
  const secOwners = useMemo(
    () => ownersFor(pds, curS).filter((r) => !closedNames.has(_cnz(r.account))),
    [pds, curS, closedNames]);
  const ownerInfo = useMemo(() => {
    // accts = OWNER에 표시할 고객사(보유 업체)명 · cus = 공유 코드의 실제 사용 고객사(검색용)
    const m = new Map<number, { status: CodeStatus; accts: Set<string>; cus: Set<string> }>();
    const put = (o: number, status: CodeStatus, acct?: string, cu?: string) => {
      const cur = m.get(o) ?? { status: "미사용" as CodeStatus, accts: new Set<string>(), cus: new Set<string>() };
      if (rank(status) > rank(cur.status)) cur.status = status;
      if (acct) cur.accts.add(acct);
      if (cu) cur.cus.add(cu);
      m.set(o, cur);
    };
    secRecs.forEach((r) => {
      // 공유 OWNER: 보유자만 OWNER 라벨(accts)에, 실사용 고객사(cu·공유프로젝트 cust)는 검색용(cus)
      if (sharedInfo(curS, r.owner, pds)) {
        if (r.fromProject) put(r.owner, r.status, undefined, r.cust);   // 공유코드 프로젝트 = 사용 고객사
        else put(r.owner, r.status, r.cust, r.cu);                       // 원본(보유자) + 사용고객사(cu)
      } else {
        put(r.owner, r.status, r.cust);                                  // 일반 OWNER = 고객사명
      }
    });
    secOwners.forEach((r) => put(r.owner, r.status, r.account));
    return m;
  }, [secRecs, secOwners]);
  const usedOwners = useMemo(() => uniqSort([...ownerInfo.keys()]), [ownerInfo]);

  // Owner 카드 — 항상 코드(번호) 오름차순. oFrom 입력 시 그 번호부터 노출
  const oBase = clampNum(oFrom, scale.o);
  const freeOwners = Array.from({ length: Math.max(0, Math.min(scale.o - oBase, oLimit)) }, (_, i) => oBase + i).filter((o) => !ownerInfo.has(o));
  // 공유 OWNER는 번호가 커서 기본 노출 범위 밖일 수 있으므로 목록에 직접 합친다
  const sharedOwners = useMemo(() => {
    const out: number[] = [];
    BUILT_IN.filter((r) => r.sec === curS && r.k === pds).forEach((r) => { for (let o = r.from; o <= r.to; o++) out.push(o); });
    customShared().filter((r) => r.k === pds && r.sec === curS).forEach((r) => out.push(r.owner));
    return uniqSort(out.filter((o) => o < scale.o));
  }, [curS, pds, scale.o, shVer]);   // eslint-disable-line react-hooks/exhaustive-deps
  let ownerNums = uniqSort([...usedOwners, ...freeOwners, ...sharedOwners, ...(selO >= 0 ? [selO] : [])]);
  if (oBase > 0) ownerNums = ownerNums.filter((o) => o >= oBase);
  if (fAcct) ownerNums = ownerNums.filter((o) => { const i = ownerInfo.get(o); return [...(i?.accts ?? []), ...(i?.cus ?? [])].some((a) => a.includes(fAcct)); });
  const oStat = (o: number): CodeStatus => ownerInfo.get(o)?.status ?? "미사용";
  if (fStat === "공유") ownerNums = ownerNums.filter((o) => !!sharedInfo(curS, o, pds));
  else if (fStat === "코드 발급") ownerNums = ownerNums.filter((o) => oStat(o) !== "미사용");         // 발급된 코드 전체
  else if (fStat === "코드 미발급") ownerNums = ownerNums.filter((o) => oStat(o) === "미사용");        // 기존 미사용
  else if (fStat === "편집") ownerNums = ownerNums.filter((o) => oStat(o) === "편집");
  // 사용가능 = 공유(커먼) 코드 중 아직 편집되지 않은 것 (코드만 확보 포함)
  else if (fStat === "사용가능") ownerNums = ownerNums.filter((o) => !!sharedInfo(curS, o, pds) && oStat(o) !== "편집");
  if (q) ownerNums = ownerNums.filter((o) => { const i = ownerInfo.get(o); return `o${o} ${[...(i?.accts ?? []), ...(i?.cus ?? [])].join(" ")}`.toLowerCase().includes(q.toLowerCase()); });
  ownerNums = uniqSort(ownerNums);

  // Section·PDS를 바꿔도 필터는 유지되므로, 결과가 비면 원인을 알려주고 한 번에 해제할 수 있게 한다
  const filterOn = fStat !== "전체" || !!fAcct || !!q || oBase > 0;
  const filterLabel = [fStat !== "전체" ? `상태 ${F_LABEL[fStat]}` : "", fAcct ? `고객사 ${fAcct}` : "", q ? `검색 "${q}"` : "", oBase > 0 ? `O${oBase} 이후` : ""].filter(Boolean).join(" · ");
  const clearFilters = () => { setFStat("전체"); setFAcct(""); setQ(""); setOFrom(""); setBFrom(""); setOLimit(PAGE_O); setBLimit(PAGE_B); };

  const curO = selO >= 0 && ownerNums.includes(selO) ? selO : (ownerNums[0] ?? 0);
  const ownRecs = secRecs.filter((r) => r.owner === curO && !r.nb);
  // book 을 나누지 않은 행(OID) — Book 카드 없이 목록으로 안내한다 `PC-036`
  const noBookRecs = secRecs.filter((r) => r.owner === curO && r.nb);
  // 사업 종료 회사 할당 제외(→ 미발급) + Book 범위는 이 PDS/Section 의 정원(scale.b, = 코드 관리 정보 기준)으로 클램프.
  //   (대장에 다른 PDS 기준의 넓은 범위 book_end 가 들어와도 유효 범위 밖 Book 은 노출하지 않는다)
  const ownRanges = useMemo(() =>
    rangesFor(pds, curS, curO)
      .filter((r) => !closedNames.has(_cnz(r.account)))
      .map((r) => ({ ...r, start: Math.min(r.start, scale.b - 1), end: Math.min(r.end, scale.b - 1) }))
      .filter((r) => r.start <= r.end),
    [pds, curS, curO, closedNames, scale.b]);

  // 정책 `PC-039`: **좌표(SOBP)가 상위 개념**이다. 좌표를 먼저 할당하고, 그 좌표가
  //   PDS2·PDS3·PDS4·OID 중 무엇인지는 **용도 표시**일 뿐이다.
  //   → 예전의 "같은 S/O 는 한 종류만" 배타(🚫 영역 할당됨)는 폐기했다.
  //     (실데이터에서도 한 고객사가 같은 S/O 안에서 Book 을 나눠 PDS2·PDS3 를 함께 쓰고 있다)
  const usedBooks = uniqSort(ownRecs.map((r) => r.book));
  // 소유권 범위(다른 곳에서 할당된 코드)는 범위마다 앞에서 최대 60권까지 카드로 노출
  // 할당 범위는 범위 끝까지 노출 — 표시 상한(bLimit) 내에서
  const bBase = clampNum(bFrom, scale.b);
  const rangeBooks = uniqSort(ownRanges.flatMap((r) => {
    const st = Math.max(r.start, bBase);
    const len = Math.min(r.end - st + 1, Math.max(0, bBase + bLimit - st));
    return Array.from({ length: Math.max(0, len) }, (_, i) => st + i);
  }));
  const showTo = Math.min(scale.b, bBase + bLimit);
  const freeBooksList = Array.from({ length: Math.max(0, showTo - bBase) }, (_, i) => bBase + i)
    .filter((b) => !usedBooks.includes(b) && !rangeBooks.includes(b));
  let bookNums = uniqSort([...usedBooks, ...rangeBooks, ...freeBooksList, ...(selB >= 0 ? [selB] : [])]);   // 항상 코드 오름차순
  if (bBase > 0) bookNums = bookNums.filter((b) => b >= bBase);
  // Book 라벨: 공유(커먼) 코드 → 고객사명(cu), 그 외 → 프로젝트/교재명(title)
  const shOwner = !!sharedInfo(curS, curO, pds);
  // 발급(할당) 여부 — 전용 OWNER는 이 S/O에 할당/발급 이력이 있으면 그 아래 Book 이 모두 '사용가능/편집'.
  const soHolder = ownRanges[0]?.account ?? ownRecs[0]?.cust ?? "";
  // OID 는 owner 전체를 점유하지 않는다 — 인덱스로 잡은 Book 만 발급이고 나머지는 미발급으로 남는다.
  const ownerIssued = !shOwner && (ownRanges.length > 0 || ownRecs.some((r) => codeKind(r.k, r.sec) !== "OID"));
  const bookStatus = (b: number): { st: CodeStatus; who: string; title: string; label: string } => {
    // 편집 프로젝트에서 등록한 사용 고객사(오버라이드) — 공유 코드에 우선 반영
    const ovr = shOwner ? overrideOf(pds, curS, curO, b) : undefined;
    const rs = ownRecs.filter((r) => r.book === b);
    if (rs.length || ovr) {
      const cuSet = [...new Set([...(ovr?.cu ? [ovr.cu] : []), ...rs.map((r) => r.cu).filter(Boolean)])];
      const cu = cuSet.join(", ");
      const title = rs.map((r) => (r.fromProject ? "" : r.title)).find(Boolean) ?? "";   // 실제 교재명만(코드발급 프로젝트명 제외)
      const who = [...new Set(rs.map((r) => r.cust))].join(", ");
      // 편집 판정은 codeUsage.isBookEdited 로 단일화 → 편집 프로젝트 '교재 추가'와 동일 결과.
      //   (광역 코드발급 프로젝트 fromProject 는 편집으로 치지 않음 → 빈 Book 은 '사용가능')
      const st: CodeStatus = isBookEdited(rs, ovr?.ea) ? "편집" : "사용가능";
      // 공유(커먼) 코드의 '고객사'는 실사용 고객사(cu)만 표시 — 비어 있으면 기본 오너명(who)으로 폴백하지 않는다.
      const label = shOwner ? cu : (title || who);
      return { st, who, title, label };
    }
    // 공유(커먼) OWNER 는 지정=발급된 코드 → 편집 안 된 Book 은 모두 사용가능 (미발급 아님)
    if (shOwner) return { st: "사용가능", who: "", title: "", label: "" };
    // 전용 OWNER: 할당 범위 안, 또는 발급된 SO 아래 Book 은 편집 전까지 모두 사용가능
    const rg = ownRanges.find((r) => b >= r.start && b <= r.end);
    if (rg) return { st: "사용가능", who: rg.account, title: "", label: rg.account };
    if (ownerIssued) return { st: "사용가능", who: soHolder, title: "", label: soHolder };
    return { st: "미사용", who: "", title: "", label: "" };
  };
  const curB = selB >= 0 && bookNums.includes(selB) ? selB : (bookNums[0] ?? 0);
  const bookRecs = ownRecs.filter((r) => r.book === curB);

  // 필터·상위 선택이 바뀌어 현재 선택이 목록에서 사라지면 첫 코드로 자동 이동
  const ownerKey = ownerNums.join(",");
  const bookKey = bookNums.join(",");
  useEffect(() => {
    if (selO !== curO) { setSelO(curO); setSelB(-1); }
  }, [ownerKey, curO]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (selB !== curB) setSelB(curB);
  }, [bookKey, curB]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ padding: "18px 20px" }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 12, fontSize: 12.5 }}>
        <b style={{ fontSize: 13, marginRight: 2 }}>SOBP 맵</b>
        {/* 코드 필터 — 좌표의 용도(종류). 고르면 그 종류의 첫 좌표로 이동한다 `PC-039` */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 8px 3px 6px", background: "#f7f8fa", borderRadius: 9 }}>
          <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 700 }}>코드</span>
          <div style={{ display: "flex", gap: 4 }}>
            {([{ v: "ALL" as const, short: "전체", desc: "코드 종류 구분 없이 좌표 전체" }, ...CODE_KINDS]).map((k) => (
              <button key={k.v} title={`${k.desc} — 고르면 첫 좌표로 이동합니다`}
                onClick={() => {
                  const f = firstSobpOf(k.v);
                  setKind(k.v); setSelS(f.s); setSelO(f.o); setSelB(f.b);
                  setOLimit(PAGE_O); setBLimit(PAGE_B); setOFrom(""); setBFrom(""); setFStat("전체");
                }}
                style={chip(kind === k.v)}>{k.short}</button>
            ))}
          </div>
        </div>
        {/* 상태 필터 */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 8px 3px 6px", background: "#f7f8fa", borderRadius: 9 }}>
          <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 700 }}>상태</span>
          <div style={{ display: "flex", gap: 4 }}>
            {(["전체", "코드 발급", "코드 미발급", "편집", "공유", "사용가능"] as const).map((k) => (
              <button key={k} onClick={() => setFStat(k)} style={chip(fStat === k)}
                title={k === "코드 발급" ? "발급(할당)된 코드 전체 (편집·공유·사용가능 포함)"
                  : k === "코드 미발급" ? "아직 발급되지 않은 빈 코드"
                  : k === "공유" ? "여러 고객사가 함께 쓰도록 지정된 OWNER"
                  : k === "사용가능" ? "공유(커먼) 코드 중 아직 편집하지 않은 것" : undefined}>{F_LABEL[k]}</button>
            ))}
          </div>
        </div>
        <input list="ncc-acct-list" value={fAcct}
          onChange={(e) => {
            const v = e.target.value; setFAcct(v);
            const hit = RECS.filter((r) => r.cust === v || r.cu === v).sort((a, b) => a.sec - b.sec || a.owner - b.owner)[0];
            if (v && hit) {   // 목록에서 고르거나 정확히 입력하면 그 고객사 S/O 로 이동, 부분입력이면 필터만
              setKind(codeKind(hit.k, hit.sec)); setSelS(hit.sec); setSelO(hit.owner); setSelB(hit.book); setOFrom(""); setBFrom("");
            }
          }}
          placeholder="고객사 검색 · 비우면 전체" title="비우면 전체, 입력하면 해당 고객사만" style={{ ...S.input, width: 180, marginLeft: "auto" }} />
        <datalist id="ncc-acct-list">{accounts.map((a) => <option key={a} value={a} />)}</datalist>
        <span style={{ display: "inline-flex", gap: 10, fontSize: 12, width: "100%", paddingTop: 2, borderTop: "1px dashed #eef0f4", marginTop: 2 }}>{(["코드발급", "편집", "사용가능", "공유", "미사용"] as const).map((k) => <Lg key={k} c={ST_C[k]} t={stLabel(k)} />)}</span>
      </div>

      {/* 코드 할당 진입 — 필터 아래 배치 */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <button onClick={() => { setAKindSel(null); setAlloc({ company: "", newCompany: "", bookStart: curB, books: 1, pages: Math.min(scale.p, 1000), mode: "코드발급", shared: false, service: "NONE" }); }}
          style={{ ...S.primary, padding: "9px 18px", fontSize: 13, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 7, whiteSpace: "nowrap" }}>
          <span style={{ fontSize: 15, lineHeight: 1 }}>＋</span> 직접 코드 할당
        </button>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280" }}>
          발급 대상 <SobpChips s={curS} o={curO} small />
        </span>
        <span style={{ fontSize: 11.5, color: "#9ca3af" }}>위에서 고른 Section·Owner에 코드를 발급합니다.</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "150px 150px 150px 1fr", gap: 10, alignItems: "start" }}>
        {/* Section (코드 관리 정보 사용가능) */}
        <div style={{ ...S.card, padding: 8 }}>
          <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, padding: "2px 4px 6px" }}>SECTION</div>
          {secs.map((s) => {
            const on = s === curS; const used = uniqSort(RECS.filter((r) => r.sec === s && (kind === "ALL" || codeKind(r.k, r.sec) === kind)).map((r) => r.owner)).length;
            return (
              <button key={s} onClick={() => { setSelS(s); setSelO(-1); setSelB(-1); setOLimit(PAGE_O); setBLimit(PAGE_B); setOFrom(""); setBFrom(""); }} style={cardBtn(on)}>
                <Sc k="S" v={s} small />
                {recoTarget && isExcluded(recoPds, s) && <span title="테스트/개발 전용 · 자동 추천 제외(직접 선택은 가능)" style={{ ...S.tag, fontSize: 8.5, marginLeft: 4, background: "#f3f4f6", color: "#9ca3af" }}>추천제외</span>}
                <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>사용 owner {used} / {(dimsOf(s)?.o ?? 0).toLocaleString()}</div>
              </button>
            );
          })}
        </div>

        {/* Owner */}
        <div style={{ ...S.card, padding: 8 }}>
          <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, padding: "2px 4px 4px" }}>OWNER</div>
          <FromInput label="O" value={oFrom} max={scale.o} onChange={(v) => { setOFrom(v); setOLimit(PAGE_O); setSelO(-1); setSelB(-1); }} />
          <div onScroll={onScrollMore(setOLimit)} style={{ maxHeight: "calc(100vh - 282px)", overflowY: "auto" }}>
            {ownerNums.map((o) => {
              const info = ownerInfo.get(o); const st = info?.status ?? "미사용"; const on = o === curO;
              const accts = [...(info?.accts ?? [])];
              return (
                <button key={o} onClick={() => { setSelO(o); setSelB(-1); setBLimit(PAGE_B); setBFrom(""); }} style={cardBtn(on)}>
                  {/* 칩 순서는 BOOK 카드와 같다 — [번호] [상태] [종류(용도)] `PC-040` */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", rowGap: 3 }}>
                    <Sc k="O" v={o} small />
                    {(() => {
                      const sh = sharedInfo(curS, o, pds);
                      const idle = st === "미사용";
                      // 공유(커먼)는 OWNER 속성 → 코드 발급 여부와 무관하게 항상 "공유"로 표기
                      if (sh) return (
                        <span style={{ ...S.tag, fontSize: 9, fontWeight: 700, whiteSpace: "nowrap",
                          background: ST_C["공유"], color: "#fff" }}
                          title={sh.note}>
                          공유
                        </span>
                      );
                      return <span style={{ ...S.tag, fontSize: 9, whiteSpace: "nowrap", ...stColor(st) }}>{stLabel(st)}</span>;
                    })()}
                    {/* 이 owner 좌표가 어떤 코드 종류로 쓰이는지 — 용도 표시 `PC-039` */}
                    {ownerKinds.get(o)?.map((kd) => <KindChip key={kd} kind={kd} small />)}
                  </div>
                  {accts.length > 0 && <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{accts.join(", ")}</div>}
                  {pds === LANG_PDS && curS === LANG_SECTION && isLangOwner(o) && (
                    <div style={{ fontSize: 9.5, color: "#7e22ce", marginTop: 2, lineHeight: 1.4 }} title="언어 슬롯 (db에서 직접 관리)">🌐 {langLabelOfOwner(o)}</div>
                  )}
                </button>
              );
            })}
            {ownerNums.length === 0 && (
              <div style={{ fontSize: 11.5, color: "#9ca3af", padding: "12px 8px", textAlign: "center", lineHeight: 1.7 }}>
                {filterOn ? (
                  <>
                    S{curS} 에는 <b style={{ color: "#b45309" }}>{filterLabel}</b> 에<br />해당하는 Owner가 없습니다.
                    <button onClick={clearFilters} style={{ ...moreBtn, borderStyle: "solid", color: "#2563eb", marginTop: 8 }}>필터 해제</button>
                  </>
                ) : "결과 없음"}
              </div>
            )}
            {oBase + oLimit < scale.o && (
              <button onClick={() => setOLimit((v) => v + PAGE_O)} style={moreBtn}>
                ＋ 더 보기 <span style={{ color: "#9ca3af" }}>(남은 {(scale.o - oBase - oLimit).toLocaleString()})</span>
              </button>
            )}
          </div>
        </div>

        {/* Book */}
        <div style={{ ...S.card, padding: 8 }}>
          <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, padding: "2px 4px 4px" }}>BOOK</div>
          <FromInput label="B" value={bFrom} max={scale.b} onChange={(v) => { setBFrom(v); setBLimit(PAGE_B); setSelB(-1); }} />
            {noBookRecs.length > 0 && (
              <div style={{ border: "1px dashed #99f6e4", background: "#f0fdfa", borderRadius: 9, padding: "9px 10px", marginTop: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#0f766e", marginBottom: 4 }}>book 미분할 · {noBookRecs.length}건</div>
                <div style={{ fontSize: 10.5, color: "#115e59", lineHeight: 1.6, marginBottom: 5 }}>
                  분량이 적어 <b>book 으로 나누지 않은</b> OID 입니다. 업체(S/O) 단위로 관리합니다.
                </div>
                {noBookRecs.slice(0, 12).map((r, i) => (
                  <div key={i} style={{ fontSize: 10.5, color: "#374151", padding: "2px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.title}>· {r.title || "(제목 없음)"}</div>
                ))}
                {noBookRecs.length > 12 && <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>… 외 {noBookRecs.length - 12}건 — 코드 관리 정보 ▸ OID 관리대장</div>}
              </div>
            )}
          <div onScroll={onScrollMore(setBLimit)} style={{ maxHeight: "calc(100vh - 282px)", overflowY: "auto" }}>
            {bookNums.map((b) => {
              const bs = bookStatus(b); const st = bs.st; const on = b === curB;
              const bookKind = ownRecs.find((r) => r.book === b);
              return (
                <button key={b} onClick={() => setSelB(b)} style={cardBtn(on)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", rowGap: 3 }}>
                    <Sc k="B" v={b} small />
                    <span style={{ ...S.tag, fontSize: 9, whiteSpace: "nowrap", ...stColor(st) }}>{stLabel(st)}</span>
                    {/* 좌표 속성: 코드 종류 · 펜 구분 (용도 표시) */}
                    {bookKind && <KindChip kind={codeKind(bookKind.k, bookKind.sec)} small />}
                    {ownRecs.find((r) => r.book === b && r.pen)?.pen && <PenChip pen={ownRecs.find((r) => r.book === b && r.pen)?.pen} small />}
                  </div>
                  {bs.label && <div style={{ fontSize: 10, color: shOwner ? "#7e22ce" : "#6b7280", fontWeight: shOwner ? 700 : 400, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={shOwner ? `사용 고객사: ${bs.label}${bs.title ? ` · 교재: ${bs.title}` : ""}` : bs.label}>{bs.label}</div>}
                </button>
              );
            })}
            {bookNums.length === 0 && noBookRecs.length === 0 && <div style={{ fontSize: 11.5, color: "#9ca3af", padding: 10, textAlign: "center" }}>결과 없음</div>}
            {bBase + bLimit < scale.b && (
              <button onClick={() => setBLimit((v) => v + PAGE_B)} style={moreBtn}>
                ＋ 더 보기 <span style={{ color: "#9ca3af" }}>(남은 {(scale.b - bBase - bLimit).toLocaleString()})</span>
              </button>
            )}
          </div>
        </div>

        {/* Page 그리드맵 */}
        <div style={{ ...S.card, padding: 16 }}>
          <PageView sec={curS} owner={curO} book={curB} recs={bookRecs} pmax={scale.p} dk={pds} setTip={setTip} />
        </div>
      </div>

      {/* 코드 할당 — 신규 업체 최초 할당 / 기존 업체 추가 발급 */}
      {alloc && (() => {
        const name = alloc.company.trim();
        // 이 S/O 가 이미 쓰는 코드 종류 (OID 는 index 부여라 제외)
        const soKinds = [...new Set(RECS.filter((r) => r.sec === curS && r.owner === curO)
          .map((r) => codeKind(r.k, r.sec)))].filter((k2) => k2 !== "OID");
        // 이 Section 에서 고를 수 있는 종류 (PDS4 는 Section 44 에만 있다)
        const kindOpts = ALLOC_KINDS.filter((k2) => (SCALE[k2] ?? {})[curS]);
        // 할당 종류 — **모달 안에서만 바뀌는 값**이라 고르더라도 지도의 S/O 선택은 그대로다 `PC-046`
        //   이미 쓰는 종류가 있으면 그 종류로 고정하고 상태로만 보여 준다 (한 S/O = 한 종류 `PC-041`)
        const aKind: CodeKind = soKinds.length === 1 ? soKinds[0]
          : (aKindSel && kindOpts.includes(aKindSel) ? aKindSel : (kind === "ALL" ? (kindOpts[0] ?? "PDS3") : kind));
        const kindFixed = soKinds.length > 0;
        // 과거 혼용 좌표(S3/O42 등)에는 신규 발급하지 않는다 `PC-041`
        const mixedBlock = soKinds.length > 1;
        const allocBooks = projectBooks(projects, companies);
        const nzn = (x: string) => x.replace(/\s+/g, "").replace(/\(.*\)/g, "").toLowerCase();
        // 공유(커먼) 코드는 **고객사 관리에서 사용 고객사로 등록한 곳**에만 발급한다 `PC-045`
        //   레지스트리에 있는 공통코드일 때만 검사한다(임의 지정 공유 OWNER 는 대상 아님).
        const cCode = commonCodeOf(pds, curS, curO);
        const cMembers = cCode ? membersOf(pds, curS, curO).map((m) => m.name) : [];
        const commonBlock = !!cCode && !!name
          && nzn(name) !== nzn(cCode.company)                       // 보유(대표) 고객사는 예외
          && !cMembers.some((m) => nzn(m) === nzn(name));
        const usedNow = usedBookMap(pds, curS, curO, allocBooks);                 // 실제 등록된 교재
        const otherRanges = rangesFor(pds, curS, curO).filter((r) => nzn(r.account) !== nzn(name));
        const freeBooks: number[] = [];
        for (let b = 0; b < scale.b && freeBooks.length < 300; b++) {
          if (usedNow.has(b)) continue;
          if (otherRanges.some((r) => b >= r.start && b <= r.end)) continue;
          freeBooks.push(b);
        }
        const firstFree = freeBooks[0];
        const start = freeBooks.includes(alloc.bookStart) ? alloc.bookStart : (firstFree ?? alloc.bookStart);
        const known = sharedInfo(curS, curO, pds);          // 이미 공유로 지정된 OWNER
        const shared = known ?? (alloc.shared ? { note: "이번 할당에서 공유로 지정", custom: true } : null);
        const holders = ownerHolders(pds, curS, curO, allocBooks);
        const check = canAllocate(pds, curS, curO, name, { start, end: start + alloc.books - 1 }, allocBooks, alloc.shared);
        // 전용(비공유) 코드가 이미 다른 업체에 할당된 S/O → 발급 상세 입력 전체 잠금 (공유 체크 시 해제)
        const others = holders.filter((h) => nzn(h) !== nzn(name));
        const locked = !shared && others.length > 0;
        const lockIn = (s: React.CSSProperties): React.CSSProperties =>
          locked ? { ...s, background: "#f3f4f6", color: "#9ca3af", cursor: "not-allowed" } : s;
        // 선택 고객사가 이미 보유한 코드(S/O/Book/Page)
        const nzc = (x: string) => x.replace(/\s+/g, "").toLowerCase();
        const myCo = companies.find((c) => nzc(c.name) === nzc(name));
        const myAlloc = !myCo ? [] : projects.filter((p) => p.companyId === myCo.id)
          .flatMap((p) => p.issued.map((b) => ({ k: b.kind ?? "N", s: b.section, o: b.owner,
            bs: b.bookStart, be: b.bookEnd, ps: b.pageStart, pe: b.pageEnd, codes: b.codes })))
          .sort((a, b) => a.s - b.s || a.o - b.o);
        // 좌표 상태 한 줄 — 셀렉트 없이 상태만 보여 준다 `PC-046`
        const stLabel2 = locked ? `🔒 전용 · 추가 발급 불가`
          : shared ? "공유 OWNER · Book 만 배타"
          : soKinds.length ? "사용 중 · 이어서 발급"
          : "미발급 · 신규 발급";
        const stBg = locked ? "#fee2e2" : shared ? "#f3e8ff" : soKinds.length ? "#ccfbf1" : "#eef6ff";
        const stFg = locked ? "#991b1b" : shared ? "#6b21a8" : soKinds.length ? "#0f766e" : "#2563eb";
        const blockMsg = locked ? `이미 ${others.join(", ")} 전용입니다 — 추가 발급 대상이 아닙니다.`
          : mixedBlock ? `이 S/O 는 ${soKinds.join(" · ")} 가 함께 쓰인 과거 이력 좌표입니다 — 신규 발급은 다른 Owner 를 고르세요.`
          : commonBlock ? `${name} 는 공유 코드 ${cCode!.name} 의 사용 고객사가 아닙니다 — [고객사 관리] 에서 하위 등록하세요.`
          : "";
        const save = () => {
          if (!name) { alert("고객사를 선택하세요. (신규 고객사는 고객사 관리에서 등록)"); return; }
          if (locked) { alert(blockMsg); return; }
          if (commonBlock) { alert(blockMsg); return; }
          if (mixedBlock) { alert(blockMsg); return; }
          // 고객사 관리에 등록된 고객사에만 발급 (여기서 신규 생성하지 않음)
          const norm = (x: string) => x.replace(/\s+/g, "").toLowerCase();
          const co = companies.find((c) => norm(c.name) === norm(name));
          if (!co) { alert("고객사 관리에 등록된 고객사가 아닙니다. 먼저 고객사 관리에서 등록하세요."); return; }
          const companyId = co.id;
          // 직접 코드 할당 = SO 단위. owner 전체를 점유(모든 book 사용가능)하되,
          // 실제 발급 규모(codes)는 편집 시 집계 → 여기서는 codes 0 (점유만).
          store.upsertProject({
            id: 0, name: `${co.name} 코드발급 · S${curS}/O${curO}`, companyId, service: alloc.service, grade: "",
            editing: alloc.service === "CASTERN", editingOwner: curO, symbols: 0,
            issued: [{ id: 1, date: new Date().toISOString().slice(0, 10), codes: 0, kind: DK[aKind] as "N" | "G" | "A" | "O",
                       by: me?.name ?? "", section: curS, owner: curO, bookStart: 0, bookEnd: scale.b - 1, pageStart: 1, pageEnd: 1 }],
          });
          // 저장 실패(용량 초과 등) 시 사라진 것처럼 보이지 않도록 즉시 경고
          if (persistError()) { alert(`⚠ 할당이 저장되지 않았습니다.\n${persistError()}`); return; }
          logActivity("alloc", `${co.name} · ${kindMeta(aKind).short} S${curS}/O${curO} · ${SERVICE.find((s) => s.v === alloc.service)?.label ?? "서비스 없음"} · SO 점유(전체 book 사용가능)`, me?.name);
          setSelB(0); setAlloc(null);
        };
        return (
          <Modal onClose={() => setAlloc(null)} title={`코드 할당 — S${curS}/O${curO}`} width={720}>
            {/* 1. 발급 대상 — 좌표는 지도에서 고른다. 여기서는 **상태만** 보여 준다 `PC-046` */}
            <div style={{ border: `1px solid ${blockMsg ? "#fecaca" : "#e5e7eb"}`, background: blockMsg ? "#fef2f2" : "#fafbfc",
              borderRadius: 10, padding: "11px 13px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: "#6b7280" }}>발급 대상</span>
                <Sc k="S" c="#5f8ff0" v={curS} />
                <Sc k="O" c="#14b8a6" v={curO} />
                <KindChip kind={aKind} small />
                <span style={{ ...S.tag, fontSize: 9.5, background: stBg, color: stFg, fontWeight: 700 }}>{stLabel2}</span>
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 11, color: "#9ca3af" }}>owner 전체 점유 · 규모는 편집 시 집계</span>
              </div>
              {blockMsg && <div style={{ marginTop: 7, fontSize: 12, color: "#b91c1c", fontWeight: 700, lineHeight: 1.6 }}>{blockMsg}</div>}
            </div>

            {/* 2. 발급 정보 */}
            <div style={{ marginTop: 10, border: "1px solid #eef0f4", borderRadius: 10, padding: "12px 13px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="고객사 *">
                  <input list="ncc-alloc-acct" style={S.input} value={alloc.company}
                    placeholder="고객사 선택 또는 검색"
                    onChange={(e) => setAlloc({ ...alloc, company: e.target.value })} />
                  <datalist id="ncc-alloc-acct">{companies.map((c) => <option key={c.id} value={c.name} />)}</datalist>
                </Field>
                <Field label="사용 서비스">
                  <select style={S.input} value={alloc.service} onChange={(e) => setAlloc({ ...alloc, service: e.target.value as ServiceType })}>
                    {SERVICE.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
                  </select>
                </Field>
              </div>

              {/* 코드 종류 — 비어 있는 좌표에서만 고른다. 골라도 S/O 는 바뀌지 않는다 `PC-046` */}
              <div style={{ marginTop: 11, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11.5, color: "#6b7280", fontWeight: 700, minWidth: 58 }}>코드 종류</span>
                {kindFixed ? (
                  <span style={{ fontSize: 12, color: "#6b7280" }}>
                    이 S/O 는 <b style={{ color: kindMeta(aKind).color }}>{soKinds.join(" · ")}</b> 로 사용 중 — 같은 종류로 발급합니다.
                  </span>
                ) : kindOpts.map((k2) => {
                  const on = k2 === aKind;
                  return (
                    <button key={k2} onClick={() => setAKindSel(k2)}
                      style={{ fontSize: 12, borderRadius: 7, padding: "5px 11px", cursor: "pointer", fontWeight: on ? 700 : 400,
                        border: `1px solid ${on ? kindMeta(k2).color : "#e5e7eb"}`,
                        background: on ? kindMeta(k2).bg : "#fff", color: on ? kindMeta(k2).color : "#6b7280" }}>
                      {kindMeta(k2).short}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. 선택 고객사가 이미 가진 코드 — 클릭하면 그 좌표로 이동 */}
            {name && myAlloc.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11.5, color: "#6b7280", marginBottom: 6 }}>
                  <b style={{ color: "#374151" }}>{name}</b> 보유 코드 <span style={{ color: "#9ca3af" }}>{myAlloc.length}건 · 클릭하면 이동</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", justifyItems: "start", gap: 6, maxHeight: 96, overflowY: "auto" }}>
                  {myAlloc.map((a, i) => {
                    const on = a.s === curS && a.o === curO;
                    return (
                      <button key={i} title="이 S/O 로 이동"
                        onClick={() => { setKind(codeKind(a.k as string, a.s)); setSelS(a.s); setSelO(a.o); setSelB(-1); setAKindSel(null); }}
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, borderRadius: 8, padding: "4px 8px", fontSize: 11.5, cursor: "pointer",
                          border: on ? "1px solid #93c5fd" : "1px solid #eef0f4", background: on ? "#eef6ff" : "#fff" }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", background: a.k === "N" ? "#2563eb" : "#d97706", borderRadius: 4, padding: "1px 5px" }}>{a.k === "N" ? "PDS3" : "PDS2"}</span>
                        <Sc k="S" c="#5f8ff0" v={a.s} />
                        <Sc k="O" c="#14b8a6" v={a.o} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button onClick={() => setAlloc(null)} style={S.ghost}>취소</button>
              {true && (
                <button onClick={save} disabled={locked || !name || mixedBlock || commonBlock}
                  style={{ ...S.primary, ...(locked || !name || mixedBlock || commonBlock ? { opacity: 0.5, cursor: "not-allowed" } : {}) }}>할당</button>
              )}
            </div>
          </Modal>
        );
      })()}

      {tip && <div style={{ position: "fixed", left: tip.x + 12, top: tip.y + 12, background: "#111827", color: "#fff", fontSize: 11.5, padding: "7px 10px", borderRadius: 7, pointerEvents: "none", zIndex: 50, lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: tip.html }} />}
    </div>
  );
}

// 권장 사용량: Book 당 권장 발급 페이지(고정 1,000p). 전체 용량이 더 작으면 전체가 상한.
const RECOMMEND_PAGES = 1000;

function Stat({ label, value, pct, color, sub }: { label: string; value: number; pct: number; color: string; sub?: string }) {
  return (
    <div style={{ border: "1px solid #eef0f4", borderRadius: 10, padding: 10 }}>
      <div style={{ fontSize: 10.5, color: "#6b7280" }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color }}>
        {value.toLocaleString()}<span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 400 }}>p</span>
        <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600, marginLeft: 6 }}>{pct}%</span>
      </div>
      {sub && <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// 높이 고정(50px) · 폭만 비율로 조절되는 막대
function Bar({ h, label, value, width, bg, fg, tip, setTip }: { h: number; label: string; value: string; width: number; bg: string; fg: string; tip: string; setTip: (t: { x: number; y: number; html: string } | null) => void }) {
  return (
    <div style={{ position: "relative", height: h, background: "#f7f8fa", border: "1px solid #e5e7eb", borderRadius: 6, marginTop: 6, overflow: "hidden" }}>
      <div
        onMouseMove={(e) => setTip({ x: e.clientX, y: e.clientY, html: tip })}
        onMouseLeave={() => setTip(null)}
        style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.max(0.5, width)}%`, background: bg }} />
      <div style={{ position: "absolute", left: 12, top: 0, bottom: 0, display: "flex", alignItems: "center", gap: 8, zIndex: 3, pointerEvents: "none", whiteSpace: "nowrap", textShadow: "0 1px 2px rgba(255,255,255,.85)" }}>
        <span style={{ fontSize: 11.5, color: "#6b7280", fontWeight: 600 }}>{label}</span>
        <b style={{ fontSize: 12.5, color: fg }}>{value}</b>
      </div>
    </div>
  );
}

function PageView({ sec, owner, book, recs, pmax, dk, setTip }: { sec: number; owner: number; book: number; recs: Rec[]; pmax: number; dk?: string; setTip: (t: { x: number; y: number; html: string } | null) => void }) {
  const r = recs[0];
  const k = r?.k ?? dk ?? "N";
  const shared = !!sharedInfo(sec, owner, k);               // 공유(커먼) 코드 여부
  const ovr = shared ? overrideOf(k, sec, owner, book) : undefined;   // 편집 프로젝트에서 등록한 사용 고객사
  const cuName = ovr?.cu || [...new Set(recs.map((x) => x.cu).filter(Boolean))].join(", ");   // 사용 고객사
  const projTitle = recs.map((x) => x.title).find(Boolean) ?? "";     // 프로젝트명(교재명)
  const inUse = recs.length > 0 || !!cuName;
  // 페이지는 1부터 시작 (Start Page 미입력 시 1)
  const start = r && r.sp && r.sp > 0 ? r.sp : 1;
  const total = r?.pg ?? 0;
  const end = start + total - 1; // 마지막 사용 페이지(포함)
  const remain = Math.max(0, pmax - total);
  const rec = Math.min(RECOMMEND_PAGES, pmax);            // 권장 사용량(고정 1,000p)
  const pct = (v: number) => Math.round((v / pmax) * 1000) / 10;
  const over = total > rec;                               // 권장 초과 여부
  const c = "#88D7FF"; // 실사용 막대: 글자 가독성을 위한 파스텔 블루

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Page 용량</span>
        <SobpChips k={k} s={sec} o={owner} b={book} small />
      </div>
      {/* 사용 프로젝트 강조 (칸 크게) */}
      <div style={{ marginTop: 8, marginBottom: 12, borderRadius: 12, padding: "14px 16px", border: `1px solid ${inUse ? "#bfdbfe" : "#e5e7eb"}`, background: inUse ? "#f5f9ff" : "#fafbfc" }}>
        {inUse ? (
          <>
            <div style={{ fontSize: 11, color: shared ? "#7e22ce" : "#6b7280" }}>{shared ? "공유 고객사" : "고객사"}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: shared ? "#7e22ce" : "#1d4ed8", marginTop: 2 }}>{shared ? (cuName || "사용 고객사 없음") : (r?.cust || "-")}</div>
            <div style={{ fontSize: 12.5, color: "#374151", marginTop: 4 }}>
              {(() => { const isEd = !!(r?.edited || ovr?.ea === 1 || (!r?.fromProject && r?.title && String(r.title).trim())); return (
              <span style={{ ...S.tag, background: isEd ? "#eef6ff" : "#ccfbf1", color: isEd ? "#2563eb" : "#0f766e" }}>{isEd ? "편집" : "사용가능"}</span>
              ); })()}
              {(r?.edited || ovr?.ea === 1 || (!r?.fromProject && r?.title && String(r.title).trim())) && (   // 편집 상태 → 편집 프로젝트로 이동
                <Link href={`/projects/editing?owner=${owner}`} style={{ textDecoration: "none" }}>
                  <span style={{ ...S.tag, marginLeft: 6, background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0", cursor: "pointer" }} title="편집 프로젝트로 이동">✏️ 편집으로 이동 →</span>
                </Link>
              )}
              {recs.length > 1 && <span style={{ color: "#9ca3af", marginLeft: 6 }}>외 {recs.length - 1}건</span>}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 15, fontWeight: 700, color: "#9ca3af" }}>미사용 (발급 가능) — 이 S/O/B에는 사용 중인 프로젝트가 없습니다.</div>
        )}
      </div>

      {/* 전체 / 권장 / 실사용 요약 (숫자 + %) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
        <Stat label="전체 사용 가능" value={pmax} pct={100} color="#111827" />
        <Stat label={`권장 사용량 (기준 ${RECOMMEND_PAGES.toLocaleString()}p)`} value={rec} pct={pct(rec)} color="#b45309" />
        <Stat label="실 사용 Page" value={total} pct={pct(total)} color="#2563eb" sub={inUse ? `권장 대비 ${rec ? Math.round((total / rec) * 100) : 0}%` : undefined} />
        <Stat label="잔여 (발급 가능)" value={remain} pct={pct(remain)} color="#166534" />
      </div>

      {/* 용량 맵 — 행 높이 50px 고정, 폭(width)만 페이지 비율로 조절 */}
      <div style={{ fontSize: 11.5, color: "#6b7280", marginBottom: 6 }}>용량 맵 · 막대 길이 = 페이지 비율 (전체 기준 100%)</div>
      <div style={{ position: "relative" }}>
        {/* 권장 기준선 */}
        <div style={{ position: "absolute", left: `${Math.min(100, (rec / pmax) * 100)}%`, top: 0, bottom: 18, width: 0, borderLeft: "2px dashed #f0b429", zIndex: 2, pointerEvents: "none" }} />

        {/* 전체 */}
        <Bar h={50} label="전체 사용 가능" value={`${pmax.toLocaleString()}p · 100%`} width={100} bg="#eef1f6" fg="#374151"
          tip={`전체 ${pmax.toLocaleString()}p (100%)<br>잔여(발급 가능) ${remain.toLocaleString()}p (${pct(remain)}%)`} setTip={setTip} />

        {/* 권장 (1,000p 고정) */}
        <Bar h={50} label={`권장 사용량 (기준 ${RECOMMEND_PAGES.toLocaleString()}p)`} value={`${rec.toLocaleString()}p · ${pct(rec)}%`}
          width={Math.min(100, (rec / pmax) * 100)} bg="#fbe3ca" fg="#92400e"
          tip={`권장 ${rec.toLocaleString()}p (${pct(rec)}%)<br>권장 내 미사용 ${Math.max(0, rec - total).toLocaleString()}p`} setTip={setTip} />

        {/* 실사용 — 권장까지는 실색, 초과분은 빗금 */}
        <div style={{ position: "relative", height: 50, background: "#f7f8fa", border: "1px solid #e5e7eb", borderRadius: 6, marginTop: 6, overflow: "hidden" }}>
          <div
            onMouseMove={(e) => setTip({ x: e.clientX, y: e.clientY, html: `실 사용 ${total.toLocaleString()}p (${pct(total)}%)<br>권장 대비 ${rec ? Math.round((total / rec) * 100) : 0}%${inUse ? `<br><b>${(shared ? (cuName || r?.cust) : r?.cust) ?? "-"}</b>${projTitle ? `<br>교재: ${projTitle}` : ""}` : ""}` })}
            onMouseLeave={() => setTip(null)}
            style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min(100, Math.max(total > 0 ? 1 : 0, (Math.min(total, rec) / pmax) * 100))}%`, background: c }} />
          {over && (
            <div
              onMouseMove={(e) => setTip({ x: e.clientX, y: e.clientY, html: `권장 초과 +${(total - rec).toLocaleString()}p (${pct(total - rec)}%)<br>실사용 ${total.toLocaleString()}p / 권장 ${rec.toLocaleString()}p` })}
              onMouseLeave={() => setTip(null)}
              style={{ position: "absolute", left: `${(rec / pmax) * 100}%`, top: 0, bottom: 0, width: `${Math.min(100 - (rec / pmax) * 100, ((total - rec) / pmax) * 100)}%`, background: "repeating-linear-gradient(45deg,#fca5a5 0 7px,#fee2e2 7px 14px)" }} />
          )}
          <div style={{ position: "absolute", left: 12, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center", zIndex: 3, pointerEvents: "none", textShadow: "0 1px 2px rgba(255,255,255,.9)" }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap" }}>
              실 사용 {total.toLocaleString()}p · {pct(total)}%
              <span style={{ fontWeight: 600, color: over ? "#b91c1c" : "#334155", marginLeft: 8 }}>권장 대비 {rec ? Math.round((total / rec) * 100) : 0}%{over ? ` ⚠ 초과 +${(total - rec).toLocaleString()}p` : ""}</span>
            </div>
            {inUse && <div style={{ fontSize: 11, color: "#334155", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "70vw" }}>{(shared ? (cuName || r?.cust) : r?.cust) ?? "-"}{projTitle ? ` · ${projTitle}` : ""}</div>}
          </div>
        </div>
        <div style={{ position: "relative", height: 16, fontSize: 10, color: "#b45309", marginTop: 2 }}>
          <span style={{ position: "absolute", left: `min(calc(${Math.min(100, (rec / pmax) * 100)}% + 4px), calc(100% - 96px))`, whiteSpace: "nowrap" }}>▲ 권장 {rec.toLocaleString()}p</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 14, fontSize: 10.5, color: "#6b7280", marginTop: 8 }}>
        <Lg c={over ? "#ef4444" : c} t={`실사용 ${total.toLocaleString()}p (${pct(total)}%)`} />
        <Lg c="#fbe3ca" t={`권장 ${rec.toLocaleString()}p (${pct(rec)}%)`} />
        <Lg c="#eef1f6" t={`전체 ${pmax.toLocaleString()}p (100%)`} />
        {over && <span style={{ color: "#b91c1c", fontWeight: 700 }}>⚠ 권장 초과</span>}
      </div>
      {inUse && <div style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 6 }}>사용 구간 P{start.toLocaleString()}~P{end.toLocaleString()}</div>}
    </div>
  );
}

const chip = (on: boolean): React.CSSProperties => ({ fontSize: 11.5, borderRadius: 7, padding: "4px 9px", cursor: "pointer", border: on ? "1px solid #93c5fd" : "1px solid #e5e7eb", background: on ? "#eef6ff" : "#fff", color: on ? "#2563eb" : "#6b7280" });
// SOBP 미니 칩 (S/O/B/P 각각 표시)
// 부가 설명은 ? 툴팁으로 (화면 정리)
const moreBtn: React.CSSProperties = {
  display: "block", width: "100%", margin: "6px 0 2px", padding: "7px 0", fontSize: 11.5,
  border: "1px dashed #cbd5e1", borderRadius: 8, background: "#fafbfc", color: "#2563eb", cursor: "pointer",
};
const cardBtn = (on: boolean): React.CSSProperties => ({ display: "block", width: "100%", textAlign: "left", border: `1px solid ${on ? "#93c5fd" : "#eef0f4"}`, background: on ? "#f5f9ff" : "#fff", borderRadius: 9, padding: "7px 9px", margin: "2px 0", cursor: "pointer" });
// 번호 직접 입력 → 입력한 번호부터 이후 목록만 노출
function FromInput({ label, value, max, onChange }: { label: string; value: string; max: number; onChange: (v: string) => void }) {
  return (
    <div style={{ position: "relative", marginBottom: 6 }}>
      <span style={{ position: "absolute", left: 7, top: 5, fontSize: 11, color: "#9ca3af", fontFamily: "ui-monospace,monospace" }}>{label}</span>
      <input value={value} inputMode="numeric" onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))}
        placeholder={`0 ~ ${(max - 1).toLocaleString()}`} title={`${label} 번호를 입력하면 그 번호부터 이후 목록만 표시됩니다.`}
        style={{ width: "100%", boxSizing: "border-box", padding: "4px 20px 4px 18px", fontSize: 11.5,
                 border: "1px solid #e5e7eb", borderRadius: 7, fontFamily: "ui-monospace,monospace" }} />
      {value && <button onClick={() => onChange("")} title="초기화"
        style={{ position: "absolute", right: 4, top: 3, border: 0, background: "none", color: "#9ca3af", cursor: "pointer", fontSize: 12, lineHeight: "16px", padding: "0 3px" }}>✕</button>}
    </div>
  );
}
function Lg({ c, t }: { c: string; t: string }) { return <span><i style={{ display: "inline-block", width: 11, height: 11, background: c, borderRadius: 2, verticalAlign: -1, marginRight: 4 }} />{t}</span>; }
