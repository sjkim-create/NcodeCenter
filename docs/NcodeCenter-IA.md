# NcodeCenter — 정보구조(IA) / 메뉴 구조도

> **개발 완료된 화면 기준**의 정보구조 문서. 사이드바 메뉴 정의(`web/lib/menu.ts`)와 실제 라우트(`web/app/**`)를 정본으로 한다.
> 상위 개념 지도는 [NcodeCenter-Structure.md §4](NcodeCenter-Structure.md)를 참조. 이 문서는 **실제 구현된 화면**만 다룬다.
> 화면별 상세 명세는 **[PRD](prd/README.md)** (화면코드 단위, IA `NcodeCenter_001_IA_001` v2.0 기준).

## 화면 ID 규칙

- 형식: `PREFIX-NN` (예: 고객사 = `CLI-01`)
- **Depth**: 1 = 그룹(메뉴 분류) · 2 = 화면(라우트) · 3 = 탭/상세/모달(화면 내부)
- 접두사(PREFIX)

| 접두사 | 영역 | 접두사 | 영역 |
|--------|------|--------|------|
| `DSH` | 대시보드 | `CLI` | 고객사(Client) |
| `TKT` | 티켓 발급 | `LOG` | 활동 로그 |
| `SOB` | SOBP 맵 | `INF` | 코드 관리 정보 |
| `PRJ` | 프로젝트 | `BRD` | 브랜드(CI) |
| `PUI` | PUI 코드 | `DBS` | DB 구조 |
| `SVC` | 서비스 관리(예정) | | |
| `CMN` | 공통(로그인·계정) | | |

---

## 1. 메뉴 트리 (계층)

```
NcodeCenter
├─ 대시보드                         DSH-01   (/)
├─ [코드]
│   ├─ SOBP 맵                      SOB-01   (/ownership)
│   └─ 코드 프로젝트                PRJ-01   (/projects)   ← 전 서비스 공통
│       └─ 프로젝트 상세(우측)      PRJ-01-1
├─ [티켓 발급]                              ← 발급 메뉴를 사이드바 그룹으로 분리
│   ├─ 계정 발급 (목록)             TKT-01   (/tickets/account)
│   │   ├─ 계정 등록                TKT-02   (/tickets/account/new)
│   │   └─ 계정 상세·수정           TKT-02   (/tickets/account/{email})
│   ├─ N Key 발급                   TKT-04   (/tickets/nkey)
│   └─ Key 발급 정산                TKT-03   (/tickets/list)
├─ [서비스 관리]                            ← 사내 Ncode 사용 서비스별 (확장 축)
│   ├─ CasterN 서비스 관리
│   │   ├─ 편집 프로젝트            PRJ-02   (/projects/editing)
│   │   │   └─ 편집 프로젝트 상세   PRJ-03   (우측 상세 패널)
│   │   └─ PUI 코드 (피지컬)        PUI-01   (/pui)
│   └─ 폼솔루션 서비스 관리  예정    SVC-01   (/services/formsolution)
├─ [멤버 관리]
│   ├─ 고객사 관리                  CLI-01   (/companies)
│   │   └─ 고객사 수정(모달)        CLI-01-1
│   └─ 활동 로그       ★Admin       LOG-01   (/activity)
├─ [정보]
│   ├─ 코드 관리 정보                   INF-01   (/info)
│   │   ├─ Code Info                INF-01-1
│   │   ├─ 확장 언어 슬롯           INF-01-2
│   │   ├─ 발급 구조                INF-01-3
│   │   ├─ OID 관리대장             INF-04     ← index 전용 코드(좌표 관리 아님)
│   │   └─ 알아야 할 사항           INF-01-4
│   ├─ 브랜드 (CI)                  BRD-01   (/brand)
│   └─ DB 구조                      DBS-01   (/db)
└─ [공통]
    ├─ 로그인                       CMN-01   (/login)
    └─ 개인정보 수정(헤더 모달)     CMN-02
```

★Admin = 관리자(role=ADMIN) 전용 노출.

---

## 2. 메뉴 구조도 (표)

| 화면 ID | 메뉴명 | Depth | 경로(Path) | 컴포넌트 | 권한 | 기능 설명 |
|---------|--------|:---:|------------|----------|------|-----------|
| **DSH-01** | 대시보드 | 2 | `/` | `DashboardView` | Staff/Admin | 할당 코드 레코드·업체·Book·섹션 KPI, 코드 사용 현황 요약 (코드 상태 = 할당됨/미발급) |
| — | **코드** (그룹) | 1 | — | — | — | 소유권 지도·코드 프로젝트(전 서비스 공통) 영역 |
| **SOB-01** | SOBP 맵 | 2 | `/ownership` | `OwnershipMap` | Staff/Admin | Section·Owner·Book·Page 소유권 지도, 상태(발급/미발급/편집/공유/사용가능)·제품·고객사 필터 드릴다운. 직접 코드 할당 시 **사용 서비스** 지정(Ncode 프린터 포함) |
| — | **서비스 관리** (그룹) | 1 | — | — | — | 사내에서 Ncode를 쓰는 **서비스별 프로젝트 현황(집계·상태)** 관리 영역. 서비스 추가 = `menu.ts` `SERVICE_MENUS` 1건 추가 |
| — | └ **CasterN 서비스 관리** (헤더) | 1 | — | — | — | casterN 편집툴 고유 관리 — 편집 프로젝트·PUI 코드 |
| **PRJ-01** | 코드 프로젝트 | 2 | `/projects` | `ProjectsView` | Staff/Admin | 고객사별 코드 프로젝트 목록(마스터), 공유(커먼) 코드 표시·검색 |
| PRJ-01-1 | └ 프로젝트 상세 | 3 | `/projects` (우측 패널) | `ProjectsView` | Staff/Admin | 선택 프로젝트의 코드종류·Section/Owner·발급 상세 |

| — | **티켓 발급** (그룹) | 1 | — | — | — | 발급 메뉴 3종을 담는 사이드바 그룹 (코드 다음, 서비스 관리 앞) |
| **TKT-01** | 계정 발급 (목록) | 2 | `/tickets/account` | `AccountsListView` | Staff/Admin | 계정 목록 — 요약 4칸 · 고객사/사용처/검색 필터 · 8열 표(CasterN 권한·App Key 수) |
| **TKT-02** | └ 계정 등록 | 3 | `/tickets/account/new` | `AccountNewView` | Staff/Admin | ① 계정 정보 → ② 사용처·권한(CasterN 7종) → ③ App Key(선택) → [계정 추가] |
| **TKT-02** | └ 계정 상세·수정 | 3 | `/tickets/account/{email}` | `AccountDetailView` | Staff/Admin | 계정 정보·권한 수정, App Key 발급·삭제, 계정 삭제 |
| **TKT-04** | N Key 발급 | 2 | `/tickets/nkey` | `TicketsView` (`NKeyForm`) | Staff/Admin | 물리 N Key(HLP) 발급 폼 — 고객사·SOBP 범위 선택 후 zip 발급 |
| **TKT-03** | Key 발급 정산 | 2 | `/tickets/list` | `TicketsView` (`TicketListView`) | Staff/Admin | 발급 티켓 목록·정산, 대장(HLP 발급대장)/신규 발급 필터 |
| **PRJ-02** | 편집 프로젝트 | 2 | `/projects/editing` | `EditingProjectsView` | Staff/Admin | 편집 고객사 목록, 발급규모(페이지)·편집원가(심볼) 단가 기준 집계·검색·고객사 추가 |
| **PRJ-03** | 편집 프로젝트 상세 | 2 | `/projects/editing/[owner]` | `EditingDetailView` | Staff/Admin | 오너별 Book·편집 가능 범위·할당 SO·공유 정보 상세 |
| **PUI-01** | PUI 코드 (피지컬) | 2 | `/pui` | `PuiView` | Staff/Admin | 피지컬 UI 기능표 — 카테고리·기능별 Book/Page·파라미터 참조 |
| **SVC-01** | 폼솔루션 서비스 관리 | 2 | `/services/formsolution` | `MenuPlaceholder` | Staff/Admin | ⬜ 예정 — 등급별 SO 풀 현황·end-user 자동 배정 내역 |
| — | **멤버 관리** (그룹) | 1 | — | — | — | 고객사·감사 로그 영역 |
| **CLI-01** | 고객사 관리 | 2 | `/companies` | `CompaniesView` | Admin | 고객사 CRUD, 서비스유형·등급·전용 owner·커먼 코드 보유 필터·가나다 정렬 |
| CLI-01-1 | └ 고객사 수정 | 3 | `/companies` (모달) | `CompaniesView` | Admin | 고객사 정보 수정 폼(단가 지정 포함) |
| **LOG-01** | 활동 로그 | 2 | `/activity` | `ActivityLogView` | **Admin 전용** | 내부 직원 감사 로그(등록·할당·발급·삭제…) 월별 조회 |
| — | **정보** (그룹) | 1 | — | — | — | 참조·가이드 영역 |
| **INF-01** | 코드 관리 정보 | 2 | `/info` | `InfoView` | 전 역할 | Ncode 참조 정보(탭 통합) |
| INF-01-1 | └ Code Info | 3 | `/info` (탭) | `RangeTable` | 전 역할 | 섹션 범위표(PDS2·PDS3·**PDS4**)·2.3m·코드 체계 참조 |
| INF-01-2 | └ 확장 언어 슬롯 | 3 | `/info` (탭) | `LangSlotView` | 전 역할 | COMMON-21 기본 + 964~983 확장 언어 슬롯 |
| INF-01-3 | └ 발급 구조 | 3 | `/info` (탭) | `NcodeInfoView` | 전 역할 | PDS2(Gcode)/PDS3(Ncode) 발급 구조 |
| INF-01-4 | └ 알아야 할 사항 | 3 | `/info` (탭) | `NcodeGuideView` | 전 역할 | 운영 가이드·주의사항 |
| **BRD-01** | 브랜드 (CI) | 2 | `/brand` | `BrandGuide` | 전 역할 | 로고·색상·타이포 등 브랜드 가이드 |
| **DBS-01** | DB 구조 | 2 | `/db` | `DbSchema` | 전 역할 | 테이블·관계·도메인 계층 스키마 뷰 |
| — | **공통** | 1 | — | — | — | 인증·계정 |
| **CMN-01** | 로그인 | 2 | `/login` | `LoginView` | 전체 | 이메일·비밀번호 로그인(셸 미표시) |
| **CMN-02** | 개인정보 수정 | 3 | (헤더 모달) | `AppShell` | 로그인 사용자 | 이름·비밀번호 변경 |

---

## 3. 리다이렉트(레거시 경로)

> 과거 경로는 통합된 현재 화면으로 자동 이동. IA 상 별도 화면으로 세지 않는다.

| 레거시 경로 | → 이동 대상 | 사유 |
|-------------|------------|------|
| `/register` | `/projects` (PRJ-01) | 업체/프로젝트 등록 → 고객사·프로젝트로 분리 |
| `/ncode-info` | `/info` (INF-01) | 코드 관리 정보 탭 통합 |
| `/info/guide` | `/info` (INF-01-4) | 알아야 할 사항 탭 통합 |
| `/info/ncode` | `/info` (INF-01-3) | 발급 구조 탭 통합 |

---

## 4. 요약

- **최상위 그룹 6개**: 대시보드(단독) · 코드 · **서비스 관리** · 멤버 관리 · 정보 · 공통
- **주요 화면(Depth 2) 13개**(+ 서비스 관리 예정 1개) + **하위 탭/상세/모달(Depth 3) 다수**
- **Admin 전용**: 활동 로그(LOG-01), 고객사 관리(CLI-01)
- **정본 소스**: 메뉴 = `web/lib/menu.ts` · 라우트 = `web/app/**/page.tsx`
