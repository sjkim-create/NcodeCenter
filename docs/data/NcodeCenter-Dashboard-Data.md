# NcodeCenter — 대시보드 데이터 (실데이터)

> ⚠️ **정책 변경(2026-08-03) — 예약(RESERVED) 폐기**: §"예약(선점) vs 사용중" 및 예약 243/사용중 36 스냅샷·빗금·상태 필터 서술은 **폐기**되었습니다. 데이터의 모든 코드는 **할당됨**(status 필드 제거). 근거: [운영 정책 §0 Changelog](../NcodeCenter-Operations-Policy.md) PC-004·005.

> ⚠️ **이 문서는 "데이터" 전용이다.** 시스템 구조·설계는 여기 두지 않는다.
> - 구조 MD: `docs/NcodeCenter-Structure.md` · DB 구조: `docs/NcodeCenter-DB.md`
> - **데이터 MD(이 문서 포함): `docs/data/`** 에서만 관리.
>
> 목적: 실제 관리 중인 **오너코드 발급 리스트(XLSX)** 를 대시보드(드릴다운/소유권/점유)와 `allocations` 테이블에 연결.

---

## 1. 원본 소스 — `(필기펜)NWP_Ncode_List.xlsx` (전체, **31시트**)

> 이전 `사본`은 10시트 부분본. **전체 파일 = 31시트**(마스터 1 + 상세 ~28 + 티켓발급리스트/P2UI Param).

**중요: 시트마다 레이아웃이 다른 이질적 워크북**(수년간 여러 팀이 축적). 단일 파서로 일괄 처리 불가.
**또한 마스터와 상세시트는 부분적으로 다른 데이터셋** — 상세시트엔 마스터에 없는 활성 고객(예: MathLAB S5/O100)이 있음 → 소유권은 **마스터 + 상세 병합**으로 구성.

| 시트 | 행수 | 성격 | 레이아웃(헤더) |
|------|-----:|------|----------------|
| **오너코드_발급리스트** | 1275 | **마스터 소유권 등록부** | `No, ACCOUNT, Section, Owner, CONTENTS(북코드범위), PAGE, X, Y, REG DATE` (데이터 r3+) |
| S0,3_O27_네오노트 | 2021 | 네오노트 일람표 | `PDS/IDS, 섹션, 오너, 북코드, 프로젝트, 고객사, 용도, 페이지수, 발급일, 발급인, 메모` (r6+) |
| S3_O1012_네오노트 | 2016 | 네오노트 일람표 | 위와 동일 (고객사 대개 공란) |
| S3_O1013_PUI | 654 | 네오노트 일람표 | 위와 동일 (r2~3 SECTION/OWNER 메타) |
| S3_O900_RECO | 1000 | 네오노트 일람표(변형) | **고객사 컬럼 없음**(컬럼 1칸 밀림) |
| S3_O54~56_포스트매스 | 1000 | 신형 | `고객사, 코드구분, Section, Owner, Book, StartPage, TotalPage...` (Book/Owner가 **범위**) |
| **S5_O100_MathLAB** | 1000 | 신형 | 위와 동일 (Book 단일, 9행) |
| S5_O1_구몬 | 426 | 구몬 | `구분,섹션,오너,북코드,과목단계,nproj,발급,수정,페이지,매핑개수...` (r6+) |
| S3_O28_엠베스트티켓발급 | 1491 | 엠베스트 | `오너,북코드,프로젝트,구분,용도,페이지,시작페이지...` (병합·주석 많음) |
| S10_O0_에듀플랫폼(아이글) | 1000 | 아이글 | `구분,섹션,오너,북코드,페이지(범위),프로젝트,발급...,Book,note` (r4+) |

→ **레이아웃 계열 5+종**: ① 신형(고객사/Book/StartPage) ② 네오노트 일람표 ③ 구몬 ④ 엠베스트 ⑤ 아이글, + 마스터.

## 2. 마스터 소유권 등록부 — 스냅샷 (핵심)

| 항목 | 값 |
|------|-----|
| 소유권 레코드 | **269** (파싱불가 4) |
| ACCOUNT(소유 주체) 수 | **126** |
| Section 종류 | 0, **1**, 3, 5, 10, 11, 14, **44** |
| Section별 | S0:27 · S1:6 · S3:184 · S5:6 · S10:15 · S11:1 · S14:9 · S44:21 |
| 상위 ACCOUNT | Solution(95), ICsolutions(20), 대표님 Scode전환(13), 몰스킨스티커(10), 포스트매스(3) … |

각 행 = `ACCOUNT × Section × Owner × 북코드범위(CONTENTS) × 페이지범위(PAGE)`.
예: `neoa · S0 · O1 · book 0~999 · page 0~1023`, `planning · S3 · O4 · book 0~16383 · page 0~4095`.

### ⚠️ 정합/확인 필요
- **정보표에 없는 Section 1, 44 = 상용 미출시 테스트/개발 전용 코드**(개발/테스트만, 서비스 미출시) → 삭제하지 않고 **"테스트/개발" 배지로 구분 표기**하며 이력 관리. 데이터에 `test_dev=true` 플래그.
- **마스터에 product 컬럼 없음(전체 26열 확인)** — 제목만 "PDS2/PDS3 CODE ASSIGN". 즉 **마스터는 Ncode/Gcode 혼용, 제품 구분은 상세시트에만 존재**.
- 마스터 book 범위가 매우 큼(예: `neolab S1 O1 book 0~4194303`) → Gcode(PDS2) 레거시.

### 제품(Ncode/Gcode) 재구성 — 마스터+상세 병합 (전체 31시트)
`build_ownership_data.py`: 상세시트(시트명→고객/Section/Owner, 셀→제품) **우선**, (Section,Owner)가 상세에 없으면 마스터(레거시, UNKNOWN).

| 결과 | 건수 | |
|------|-----:|--|
| 총 소유권 레코드 | **277** | 상세 34 + 마스터 243 |
| PDS3(Ncode) | 29 | 상세시트로 확인 |
| MIXED(PDS2+PDS3) | 2 | 예: O27 (book 단위로 갈림) |
| **UNKNOWN** | **246** | 마스터 전용(레거시), 상세시트 없음 |

> UNKNOWN 246은 **상세시트가 없는 레거시 owner** — 현재 정보로 제품 확정 불가(실제 상태). 추가 상세시트/규칙이 생기면 점진 보강.
> O27처럼 **한 owner에 두 제품이 섞이면** owner가 아니라 **book 단위 제품**이 정확 → 향후 상세시트 book-level 파싱 시 반영.

### 공유 owner (충돌 아님) — Book 단위로 나눠 씀
- **S5/O100**: `MathLAB` · `Neolab POD`
- **S3/O900**: `RECO` · `TEST`
> 같은 (Section,Owner)라도 **서로 다른 Book**을 쓰므로 코드는 겹치지 않음(=충돌 아님). 한 Owner를 여러 프로젝트가 **book 단위**로 공유하는 정상 케이스. 빌더가 둘 다 보존(`shared` 플래그), 대시보드에 정보 배너로 표기. → **소유는 book 단위**가 정확(향후 book-level 파싱 반영).

### 상태: 예약(선점) vs 사용중 (요구사항)
`status` = **상세시트 있음 → ACTIVE(사용중)** / **마스터 전용 → RESERVED(예약·선점)**.
- **RESERVED 243**: B2B용으로 **미리 할당·선점**한 코드(할당만 해두고 보유/타처 활용). 상세 발급내역 없음.
- **ACTIVE 36**: 상세시트에 book/page 발급내역이 있는 **실사용** 코드.
> 대시보드에서 **상태 필터(전체/사용중/예약)** + 예약셀은 **빗금 패턴**으로 구분, Section별 "사용중 N·예약 M", KPI에 사용중/예약 owner 수 표시.

## 3. 상세 시트(오너별) — 형식별 처리 필요

- **신형(고객사/Book/StartPage)**: `S5_O100_MathLAB`(MathLAB PDS3 S5/O100, Book1~9, 262p, 검증 OK), `S3_O54~56_포스트매스`(Owner·Book이 범위). → `db/import/xlsx_to_allocations.py` 로 파싱 가능(신형만).
- **나머지(네오노트/구몬/엠베스트/아이글)**: 컬럼 위치·범위표기가 제각각 → **형식별 어댑터** 필요(우선순위 협의 후 작성).

## 3-1. 소유권 대시보드 — **Next.js(React) 앱** (빌드 검증 완료) ✅

> HTML 프로토타입에서 **React(Next.js App Router)로 전환**. 페이지 소스는 MD와 분리.

- **앱 위치(페이지 소스)**: `web/` (Next.js) — `app/ownership/page.tsx` + `components/OwnershipDashboard.tsx`.
- **데이터(분리)**: `web/data/ownership-data.json` (빌더 생성, 앱이 import).
- **빌더**: `db/import/build_ownership_data.py "<xlsx>"` — 데이터(JSON)만 생성.
- **기능**: Section × Owner 소유권 맵(색=ACCOUNT), **상태 필터(사용중/예약, 예약=빗금)**, **제품 필터(PDS3/PDS2/MIXED/UNKNOWN)**, 레거시 Section 포함, ACCOUNT별 점유·필터, Section별 사용중/예약·잔여.
- **검증**: `next build` ✓ 컴파일·타입체크 통과, 5 페이지 생성(/, /ownership).
- 실행: `cd web && npm install && npm run dev` → http://localhost:3000/ownership

> 이전 자체완결 HTML(`docs/prototypes/*.html`)은 참고용으로만 남기고, 정식 화면은 `web/`(Next.js)에서 관리.

## 4. Import 도구

- `db/import/build_ownership_dashboard.py` — 마스터 → **소유권 대시보드 HTML + JSON** 생성(위 §3-1).
- `db/import/master_to_ownership.py` — **마스터 시트** → 소유권 레코드 파싱·검증·정합체크. `--json` 로 `master_ownership.json` 저장.
- `db/import/xlsx_to_allocations.py` — **신형 레이아웃** 시트(다중) → allocations 파싱·검증(범위초과 검출). 비신형 시트는 자동 스킵.
- `db/import/csv-to-allocations.mjs` — 신형 단일 CSV용(Node).
- 상세 형식별 어댑터(네오노트/구몬/엠베스트/아이글)는 미작성 — 우선순위 확정 후.

## 5. 갱신 이력

| 날짜 | 내용 |
|------|------|
| 2026-07-15 | 데이터 MD 분리 신설 |
| 2026-07-15 | `S5_O100_MathLAB.csv` 매핑 확정·스냅샷(9book/262p, 검증 OK) |
| 2026-07-15 | **XLSX(10시트) 확보** — 이질적 레이아웃 5+종 확인. 마스터 소유권 등록부 파싱(269레코드/126 ACCOUNT). Section 1/44·product 부재 이슈 발견. |
| 2026-07-15 | 결정: 마스터→소유권 대시보드 우선, Section 1/44 포함(레거시). S3 owner 1024 범위초과 플래그. |
| 2026-07-15 | **전체 XLSX(31시트) 확보**. 마스터+상세 병합(277=상세34+마스터243), 제품 PDS3 29·MIXED 2·UNKNOWN 246. **HTML→Next.js(React) 전환**, `web/` 앱 `next build` 검증 통과. |

## 6. 다음 결정 사항

1. **우선 대상**: (A) 마스터 소유권 등록부 → 소유권/점유 대시보드 실데이터 연결(가장 빠름·가치 큼) vs (B) 오너별 상세시트 형식별 어댑터부터.
2. **Section 1/44** 처리(포함/제외/매핑), **product 구분 규칙**(마스터 통합 vs 규칙).
3. 상세시트 중 **우선 형식**(네오노트 일람표가 시트 4개로 최다).
