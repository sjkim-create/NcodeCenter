// NcodeCenter 사이드바 메뉴 (구조 MD §4 메뉴 구조도 기준)
export type MenuItem = { no?: number; label: string; path: string; icon: string; ready?: boolean; child?: boolean; header?: boolean; admin?: boolean };
export type MenuGroup = { group: string | null; items: MenuItem[] };

// ── 서비스별 관리 메뉴 ─────────────────────────────
// NcodeCenter는 사내에서 Ncode를 쓰는 "모든 서비스"의 프로젝트 현황(집계·상태)을 관리한다.
// 서비스가 늘어나면 아래 배열에 1건만 추가한다.
//   · items 가 있으면  → 헤더 + 하위 메뉴로 펼쳐진다 (구현된 서비스)
//   · items 가 비면    → /services/{key} 안내 화면으로 연결되는 '예정' 메뉴가 된다
export type ServiceMenu = {
  key: string;                 // 라우트 키 (/services/{key})
  service: string;             // customerData.ServiceType 값 — SOBP 할당의 '사용 서비스'와 연결
  label: string;               // 메뉴 표기
  icon: string;
  ready: boolean;              // 화면 구현 여부
  desc: string;                // 안내 화면 설명
  features: string[];          // 안내 화면 · 예정 기능
  items: MenuItem[];           // 하위 화면 (구현된 서비스만)
};

export const SERVICE_MENUS: ServiceMenu[] = [
  {
    key: "castern",
    service: "CASTERN",
    label: "CasterN 서비스 관리",
    icon: "🎬",
    ready: true,
    desc: "casterN 편집툴이 쓰는 코드의 프로젝트·편집·정산 현황",
    features: ["편집 프로젝트·교재별 편집량·정산", "PUI(페이퍼) 코드 기능표"],
    items: [
      { label: "편집 프로젝트", path: "/projects/editing", icon: "✏️", ready: true },
      { label: "PUI 코드 (페이퍼)", path: "/pui", icon: "🎛️", ready: true },
    ],
  },
  {
    key: "formsolution",
    service: "FORMSOLUTION",
    label: "폼솔루션 서비스 관리",
    icon: "📄",
    ready: false,
    desc: "폼솔루션이 쓰는 등급별 코드 풀의 배정·잔여 현황",
    features: ["등급별 SO 풀 현황(잔여/소진)", "end-user 자동 배정 내역", "한도 초과 시 관리자 승인 대기"],
    items: [],
  },
];

// 서비스 메뉴 → 사이드바 항목으로 전개
const serviceItems = (): MenuItem[] =>
  SERVICE_MENUS.flatMap((s): MenuItem[] =>
    s.items.length
      ? [
          { label: s.label, path: s.items[0].path, icon: s.icon, header: true, ready: s.ready },
          ...s.items.map((i) => ({ ...i, child: true })),
        ]
      : [{ label: s.label, path: `/services/${s.key}`, icon: s.icon, ready: s.ready }]
  );

export const MENU: MenuGroup[] = [
  { group: null, items: [{ no: 1, label: "대시보드", path: "/", icon: "▦", ready: true }] },
  {
    group: "코드",
    items: [
      { label: "SOBP 맵", path: "/ownership", icon: "🗺️", ready: true },
      // 코드 프로젝트 = 전 서비스 공통 조회(사용 서비스 필터) → 특정 서비스 그룹에 두지 않는다.
      { label: "코드 프로젝트", path: "/projects", icon: "🎫", ready: true },
    ],
  },
  {
    // 발급 메뉴를 화면 안 좌측 탭이 아니라 사이드바 그룹으로 관리한다.
    // 각 메뉴는 [목록 → 등록] 한 쌍 — 메뉴는 목록을 열고, 등록은 목록의 추가 버튼으로 들어간다.
    //   · 계정 발급 (App Key 발급) : /tickets/account → /tickets/account/new
    //   · Key 관리 (N Key 발급)    : /tickets/nkey    → /tickets/nkey/new   (옛 "Key 발급 정산" = 이 목록)
    // 메뉴명의 괄호 = 그 화면에서 발급하는 키. Key 관리 목록에는 두 종류가 함께 쌓인다.
    group: "티켓 발급",
    items: [
      { no: 4, label: "계정 발급 (App Key 발급)", path: "/tickets/account", icon: "🔑", ready: true },
      { label: "Key 관리 (N Key 발급)", path: "/tickets/nkey", icon: "🧾", ready: true },
    ],
  },
  { group: "서비스 관리", items: serviceItems() },
  {
    group: "멤버 관리",
    items: [
      { no: 7, label: "고객사 관리", path: "/companies", icon: "👥", ready: true },
      { no: 9, label: "활동 로그", path: "/activity", icon: "📝", ready: true, admin: true },
    ],
  },
  {
    group: "정보",
    items: [
      { label: "코드 관리 정보", path: "/info", icon: "ℹ️", ready: true },
      { label: "브랜드 (CI)", path: "/brand", icon: "🎨", ready: true },
      { label: "DB 구조", path: "/db", icon: "🗄️", ready: true },
    ],
  },
];

export const ALL_ITEMS: MenuItem[] = MENU.flatMap((g) => g.items);
// 헤더(그룹)와 실제 화면이 같은 경로를 쓰는 경우 실제 화면 이름을 우선 표시
export const titleOf = (path: string): string => {
  // 메뉴에 없는 하위 화면(등록·상세)
  if (path === "/tickets/account/new") return "계정 등록";
  if (path.startsWith("/tickets/account/")) return "계정 상세 · 수정";
  if (path === "/tickets/nkey/new") return "N Key 생성";
  if (path.startsWith("/tickets/nkey/")) return "발급 상세 · 수정";
  if (path === "/companies/new") return "고객사 등록";
  if (path.startsWith("/companies/")) return "고객사 상세 · 수정";
  if (/\/projects\/editing\/[^/]+\/book\/new$/.test(path)) return "교재(책) 추가";
  if (/\/projects\/editing\/[^/]+\/book\//.test(path)) return "교재(책) 편집 수정";
  if (path.startsWith("/services/")) {
    const key = path.split("/")[2];
    return SERVICE_MENUS.find((s) => s.key === key)?.label ?? "서비스 관리";
  }
  return (
    ALL_ITEMS.find((i) => i.path === path && !i.header)?.label
    ?? ALL_ITEMS.find((i) => i.path === path)?.label
    ?? "NcodeCenter"
  );
};
