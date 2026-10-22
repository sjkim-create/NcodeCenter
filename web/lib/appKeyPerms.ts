// App Key 권한 — Caster(Web Caster) 권한 20항목. 계정(App Key)마다 true / false 로 지정한다 `PC-207`
//   개발팀 대장 Caster_계정_퍼미션_티켓.xlsx 의 「분류 · Permission · 값 · 설명」 표와 같은 항목 · 순서.
//   기본값은 모두 false — 대장 계정은 대장의 값을 그대로 가져온다.
//   (고객사 관리 서비스 계정의 CasterN 권한 6종과는 별개다 `PC-105`)
export type AppKeyPerm = { group: string; key: string; desc: string };

export const APPKEY_PERMS: AppKeyPerm[] = [
  { group: "Project", key: "Project/New/Enabled", desc: "새 프로젝트" },
  { group: "Project", key: "Project/Review/Enabled", desc: "프로젝트 리뷰 기능" },
  { group: "Edit", key: "Edit/Symbol/Enabled", desc: "심볼편집" },
  { group: "Edit", key: "Edit/Symbol/RectWithText/Create/Enabled", desc: "사각형 생성 (마우스 터치 시 PDF 배경에 있는 텍스트를 함께 추출해서 입력), 사전 편집용" },
  { group: "Edit", key: "Edit/Resource/Add/Enabled", desc: "음성펜용 리소스 추가" },
  { group: "Edit", key: "Edit/Resource/Delete/Enabled", desc: "음성펜용 리소스 삭제" },
  { group: "Edit", key: "Edit/Resource/DragDrop/Enabled", desc: "음성펜용 리소스 Drag & Drop" },
  { group: "Export", key: "Export/NcodePDF/Enabled", desc: "Ncode PDF 익스포트" },
  { group: "Export", key: "Export/NCP/Enabled", desc: "NCP2 익스포트" },
  { group: "Export", key: "Export/PackageForApp/Enabled", desc: "App용 패키지 익스포트" },
  { group: "Export", key: "Export/NcodePDF/CustomExport4HyundaiMotor/Enabled", desc: "현대차 전용 커스텀 익스포트 모드 (하나의 양식을 여러 book 코드로 대량 복제 가능하게)" },
  { group: "Settings", key: "Settings/Ncode/Enabled", desc: "Ncode 설정" },
  { group: "Settings", key: "Settings/Project/Enabled", desc: "Project 설정" },
  { group: "Settings", key: "Settings/PageAttrForApp/Enabled", desc: "App용 페이지 설정 (보이기/안보이기)" },
  { group: "Settings", key: "Settings/PageAlias/Import/Enabled", desc: "페이지 별명들을 .csv 에서 가져와서 설정하기" },
  { group: "Settings", key: "Settings/ActionTable/Import/Enabled", desc: "심볼의 액션 명칭들을 .csv 에서 가져와서 설정하기" },
  { group: "Settings", key: "Settings/DrawingPreset/Configure/Enabled", desc: "툴바의 드로잉 명령들을 재구성 설정하기" },
  { group: "Tool", key: "ResourcesView/Tool/Enabled", desc: "리소스 뷰의 툴 기능" },
  { group: "Ncode", key: "Ncode/Mode/ExtendedBookCode/Enabled", desc: "Ncode 의 확장모드 (book code에 owner+book 을 사용)" },
  { group: "Nproj", key: "Nproj/Writer/StartPageSideAttr/Enabled", desc: ".nproj 저장 시 시작페이지의 면 (side) 속성을 함께 기록할 것인지 지정" },
];

/** 기본값 — 모두 false */
export const defaultAppKeyPerms = (): Record<string, boolean> => Object.fromEntries(APPKEY_PERMS.map((p) => [p.key, false]));
/** 저장값을 20항목으로 맞춘다 — 없는 항목은 false */
export const normAppKeyPerms = (v?: Record<string, boolean>): Record<string, boolean> =>
  Object.fromEntries(APPKEY_PERMS.map((p) => [p.key, v?.[p.key] === true]));
