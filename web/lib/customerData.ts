// 고객사 관리 / 프로젝트 관리 공용 데이터 모델 (mock)
// DB 연결 시 customers / projects / work_logs / allocations 테이블에 매핑

// ── 네오랩 서비스 (고객사가 쓰는 서비스) ─────────────
// 서비스는 **고객사 속성**이다 `PC-076` — 지정은 [고객사 관리]에서 하고, SOBP 맵·계정은 그 값을 읽기만 한다.
//   · 사용 서비스(고객사) = 우리가 이 고객사를 어느 서비스로 다루나  → 편집 프로젝트·폼솔루션 목록의 기준
//   · 인증 서비스(계정)   = 이 계정이 우리 서비스 어디에 로그인하나 → App Key 관리 `accountStore.ts`
// 고르는 값은 **2개뿐**이고, **아무것도 고르지 않으면 = SDK 연동(코드만 할당)** 이다 `PC-076`.
export type ServiceType =
  | "CASTERN" | "FORMSOLUTION" | "NONE";
// NONE 은 **고르는 값이 아니다** — 옛 데이터 호환용으로만 남긴다(= 선택 없음).
export const SDK_ONLY = "SDK 연동 (코드만 할당)";
export const SERVICE: { v: ServiceType; label: string; desc: string; ready: boolean }[] = [
  { v: "CASTERN", label: "casterN (편집툴)", desc: "우리가 이 고객사 자료를 편집한다 — [편집 프로젝트]의 대상이 된다", ready: true },
  { v: "FORMSOLUTION", label: "폼솔루션", desc: "폼솔루션 서비스로 관리한다 — 서비스 개발 전이라 아직 지정된 고객사가 없다", ready: false },
];
const SERVICE_LABEL: Record<string, string> = { CASTERN: "casterN (편집툴)", FORMSOLUTION: "폼솔루션", NONE: SDK_ONLY };
export const serviceLabel = (v: ServiceType) => SERVICE_LABEL[v] ?? v;
export const serviceShort = (v: ServiceType) => (v === "CASTERN" ? "casterN" : v === "FORMSOLUTION" ? "폼솔루션" : "SDK 연동");
export const GRADES = ["a", "b", "c"];

// ── 고객사(업체) 마스터 ─────────────────────────────
export type CompanyDoc = { id: number; label: string; fileName: string }; // 항목명(수정가능) + 파일명
export type Company = {
  id: number;
  name: string;        // 업체명
  manager: string;     // 담당자(기본)
  contact: string;     // 연락처
  address: string;     // 주소
  bizNo: string;       // 사업자등록증번호
  bankName: string;    // 은행명
  accountNo: string;   // 계좌번호
  taxEmail?: string;   // 세금계산서 발행용 이메일
  docs: CompanyDoc[];  // 관련 서류
  // 편집 단가 — 항목별 개별 단가(미지정=전사 기본값). lib/pricing.ts RATE_ITEMS 참조.
  rates?: Record<string, number>;   // 항목 key(s_page/s_edit/s_cmp2…/w_none…) → 단가
  pageUnit?: number;   // (구) 적용 단가 — rates 미지정 시 s_page/w_page로 흡수
  symbolUnit?: number; // (구) 편집 단가 — rates 미지정 시 s_edit/w_none로 흡수
  // 사용 서비스 — **이 고객사를 우리 어느 서비스로 다루나** `PC-076`.
  //   비어 있으면 = SDK 연동(코드만 할당). 편집 프로젝트·폼솔루션 목록이 이 값을 기준으로 고객사를 불러온다.
  services?: ServiceType[];
  // 커먼 코드(공유 코드) 사용 여부 — 체크한 업체만 편집 프로젝트의 "사용 고객사" 후보가 된다
  nspCommon?: boolean; // NSP Common Code (소리펜) — S3/O21 · S3/O964~983
  nwpCommon?: boolean; // NWP Common Code (필기펜) — S0/O27 · S3/O27 · S3/O1012~1013
  closed?: boolean;    // 프로젝트 종료(사업 정리) — 코드 발급 이력만 유지, 화면에서 비활성 표시
  closedNote?: string; // 종료 사유/이관 메모 (예: 엠베스트-28로 코드 이관)
};

// ── 발급 SOBP 내역 (프로젝트가 발급받은 코드 블록, 여러 건 가능) ─
export type SOBP = { section: number; owner: number; bookStart: number; bookEnd: number; pageStart: number; pageEnd: number };
export type IssuedSOBP = SOBP & { id: number; date: string; codes: number; used?: number; kind?: "N" | "G" | "A" | "O"   /* 좌표 코드 종류값: N=PDS3 · G=PDS2 · A=IDS · O=OID (PDS4 는 Section 44 로 판별) */; by?: string };
// codes = 발급(할당) 규모 = Book수 × Page수 · used = 실제 등록된 교재 페이지 합
export const sobpText = (s: SOBP) =>
  `S${s.section}/O${s.owner}/B${s.bookStart}~${s.bookEnd}/P${s.pageStart}~${s.pageEnd}`;

// ── 프로젝트 ────────────────────────────────────────
// 예: "네오노트" 서비스를 여러 업체가, 또는 한 업체가 프로젝트별로 각각 관리
export type Project = {
  id: number;
  name: string;            // 프로젝트명
  companyId: number;       // 고객사(업체) 참조
  service: ServiceType;    // 사용 서비스 대표값 (services 의 첫 값 — 옛 데이터 호환)
  services?: ServiceType[];// 사용 서비스 (다중) — 한 좌표를 여러 서비스가 함께 쓸 수 있다 `PC-049`
  grade: string;           // 폼솔루션만
  issued: IssuedSOBP[];    // 발급 SOBP 내역 (0건이면 미발급)
  editingOwner?: number;   // 편집 프로젝트 연결 owner (엑셀 시트)
  symbols?: number;        // 편집 심볼 총합(진행 표시용)
  editing?: boolean;       // 편집 관리 플래그 (편집 프로젝트에 등록되면 true)
  shared?: boolean;        // 공유(커먼) 코드 프로젝트 — 여러 고객사가 함께 쓰는 Owner
  codeOnly?: boolean;      // 대장 할당만 있고 편집(책)은 없는 코드발급-only 프로젝트
  editLinkOwner?: number;  // 예외: 이 코드의 편집 실적이 다른 owner에 귀속 → [편집] 칩으로 이동
  editLinkLabel?: string;  // [편집] 칩에 표시할 대상 라벨
};
/** @deprecated 서비스는 **고객사 속성**이다 `PC-076` — 화면에서는 `companyServices` 를 쓴다.
 *  프로젝트의 service·services 는 옛 데이터 호환으로만 남긴다. */
export const projectServices = (p: { service: ServiceType; services?: ServiceType[] }): ServiceType[] =>
  p.services && p.services.length ? p.services : [p.service];
/** @deprecated `companyUsesService` 를 쓴다 `PC-076` */
export const usesService = (p: { service: ServiceType; services?: ServiceType[] }, v: ServiceType) =>
  projectServices(p).includes(v);

// ── 고객사 사용 서비스 `PC-076` ───────────────────
// 고르는 값(casterN·폼솔루션)만 남긴다. 빈 배열 = SDK 연동(코드만 할당).
export const companyServices = (c?: { services?: ServiceType[] }): ServiceType[] =>
  (c?.services ?? []).filter((v) => v === "CASTERN" || v === "FORMSOLUTION");
export const companyUsesService = (c: { services?: ServiceType[] } | undefined, v: ServiceType) =>
  companyServices(c).includes(v);
// 화면 표기 — 아무것도 안 골랐으면 SDK 연동으로 읽는다
export const companyServiceText = (c?: { services?: ServiceType[] }) => {
  const s = companyServices(c);
  return s.length ? s.map(serviceLabel).join(" · ") : SDK_ONLY;
};

export const projectCodes = (p: Project) => p.issued.reduce((s, b) => s + b.codes, 0);       // 발급 규모(B×P)
export const projectUsed = (p: Project) => p.issued.reduce((s, b) => s + (b.used ?? 0), 0);   // 실등록 페이지

// ── 업무 메모 (단일 원장 = 중복 방지) ────────────────
// projectId=null → "고객사 공통", projectId 지정 → 해당 프로젝트 일감
export type WorkKind = "요청" | "처리" | "메모";
export type WorkLog = {
  id: number;
  no: number;          // 고객사 내 안정 번호(삭제해도 유지·미재사용)
  companyId: number;
  projectId: number | null;
  date: string;
  kind: WorkKind;
  content: string;
  author: string;     // 작성자(로그인 사용자) — 본인 글만 수정·삭제 가능
  authorEmail?: string;
  edited?: boolean;   // 수정 이력(날짜는 수정일로 갱신)
};

export const SEED_COMPANIES: Company[] = [
  {
    id: 1, name: "MathLAB", manager: "김수학", contact: "010-1111-2222", address: "서울 강남구 테헤란로 12",
    bizNo: "123-45-67890", bankName: "국민은행", accountNo: "123456-01-987654",
    docs: [
      { id: 1, label: "사업자등록증", fileName: "mathlab_bizreg.pdf" },
      { id: 2, label: "계약서", fileName: "mathlab_contract_2024.pdf" },
    ],
  },
  {
    id: 2, name: "비상교육", manager: "장민지", contact: "02-333-4444", address: "서울 구로구 디지털로 300",
    bizNo: "220-88-11223", bankName: "신한은행", accountNo: "110-222-333444",
    docs: [{ id: 1, label: "NDA", fileName: "visang_nda.pdf" }],
  },
  {
    id: 3, name: "아이글", manager: "한윤정", contact: "031-555-6666", address: "경기 성남시 분당구 판교로 50",
    bizNo: "144-81-55667", bankName: "우리은행", accountNo: "1002-777-888999",
    docs: [],
  },
];

export const SEED_PROJECTS: Project[] = [
  {
    id: 1, name: "네오노트 수학 콘텐츠", companyId: 1, service: "NONE", grade: "",
    issued: [{ id: 1, date: "2026-05-10", codes: 140, section: 5, owner: 100, bookStart: 1, bookEnd: 5, pageStart: 1, pageEnd: 140 },
             { id: 2, date: "2026-06-05", codes: 122, section: 5, owner: 100, bookStart: 6, bookEnd: 9, pageStart: 1, pageEnd: 140 }],
  },
  {
    id: 2, name: "폼솔루션 문제은행", companyId: 1, service: "FORMSOLUTION", grade: "a",
    issued: [{ id: 1, date: "2026-04-01", codes: 60, section: 5, owner: 101, bookStart: 0, bookEnd: 3, pageStart: 0, pageEnd: 60 }],
  },
  {
    id: 3, name: "스마트펜 솔루션", companyId: 2, service: "CASTERN", grade: "",
    issued: [{ id: 1, date: "2026-03-15", codes: 1200, section: 3, owner: 941, bookStart: 0, bookEnd: 1200, pageStart: 0, pageEnd: 255 }],
  },
  {
    id: 4, name: "코드 발급 전용(외주)", companyId: 2, service: "NONE", grade: "",
    issued: [],
  },
  {
    id: 5, name: "에듀플랫폼(수능)", companyId: 3, service: "NONE", grade: "",
    issued: [{ id: 1, date: "2026-07-02", codes: 40, section: 10, owner: 0, bookStart: 1, bookEnd: 40, pageStart: 0, pageEnd: 1023 }],
  },
];

// 실제 시드는 store.ts가 seed-customers.json(엑셀 파생)에서 로드

let _seq = 1000;
export const nextId = () => ++_seq;
