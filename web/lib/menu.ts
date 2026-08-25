// NcodeCenter 사이드바 메뉴 (구조 MD §4 메뉴 구조도 기준)
export type MenuItem = { no?: number; label: string; path: string; icon: string; ready?: boolean; child?: boolean; header?: boolean; admin?: boolean };
export type MenuGroup = { group: string | null; items: MenuItem[] };

export const MENU: MenuGroup[] = [
  { group: null, items: [{ no: 1, label: "대시보드", path: "/", icon: "▦", ready: true }] },
  {
    group: "코드",
    items: [
      { no: 4, label: "티켓 발급", path: "/tickets", icon: "🧾", ready: true },
      { label: "SOBP 맵", path: "/ownership", icon: "🗺️", ready: true },
    ],
  },
  {
    group: "프로젝트 관리",
    items: [
      { label: "코드 프로젝트", path: "/projects", icon: "🎫", ready: true },
      { label: "편집 프로젝트", path: "/projects/editing", icon: "✏️", ready: true },
      { label: "PUI 코드 (피지컬)", path: "/pui", icon: "🎛️", ready: true },
    ],
  },
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
      { label: "Ncode 정보", path: "/info", icon: "ℹ️", ready: true },
      { label: "브랜드 (CI)", path: "/brand", icon: "🎨", ready: true },
      { label: "DB 구조", path: "/db", icon: "🗄️", ready: true },
    ],
  },
];

export const ALL_ITEMS: MenuItem[] = MENU.flatMap((g) => g.items);
// 헤더(그룹)와 실제 화면이 같은 경로를 쓰는 경우 실제 화면 이름을 우선 표시
export const titleOf = (path: string): string =>
  ALL_ITEMS.find((i) => i.path === path && !i.header)?.label
  ?? ALL_ITEMS.find((i) => i.path === path)?.label
  ?? "NcodeCenter";
