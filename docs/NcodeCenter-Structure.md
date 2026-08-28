# NcodeCenter — 시스템 구조 (Structure)

> ⚠️ **정책 변경(2026-08-03) — 예약(RESERVED) 폐기**: 본문의 **예약(선점)/사용중(IN_USE) 구분·"Ncode 예약" 메뉴** 서술은 **폐기**되었습니다. 코드 상태는 **할당됨 / 미발급** 2가지입니다. 근거: [운영 정책 §0 Changelog](NcodeCenter-Operations-Policy.md) PC-003~005.

> Ncode **자동관리 시스템**의 단일 구조 문서(=전체 지도). 시스템 정의·도메인 모델·역할·**메뉴 구조도(§4)**·**문서(MD) 구조도(§8)**·아키텍처를 한곳에 둔다. 새 MD는 §8 규칙대로 배치하고 여기서 링크한다.
> - **DB 구조는 별도**: [`NcodeCenter-DB.md`](NcodeCenter-DB.md)
> - **운영 정책(개발 반영 기준)**: [`NcodeCenter-Operations-Policy.md`](NcodeCenter-Operations-Policy.md) ★ **신규 화면 개발 시 반드시 참조·확인**
> - **데이터(실데이터/스냅샷)**: [`data/NcodeCenter-Dashboard-Data.md`](data/NcodeCenter-Dashboard-Data.md)
> - **메뉴별 상세 MD**: `docs/menus/` 에 1메뉴=1파일(확정된 것부터). 각 메뉴 MD에는 **정책 준수 체크리스트** 포함.
> 기반 참조: `webcaster.admin`(neostudio-team) · https://ndp-dev.neolab.net:14443/tickets

---

## 0. 시스템 정의

NcodeCenter는 **내부 직원이 운영**하는 **Ncode 자동관리 시스템**이다. (외부 고객이 직접 요청하지 않음)

1. **업체/프로젝트 등록** — 내부 직원이 코드가 필요한 업체/프로젝트(편집툴 CasterN·폼솔루션·아이글·기타 코드전용)를 **직접 등록**한다.
2. **코드 할당** — 내부 직원이 등록된 업체/프로젝트에 코드를 할당한다.
   - 편집툴·아이글·기타 → **직접 할당**(연속 배정).
   - 폼솔루션 → 등급별 코드 **풀을 미리 할당(선점)** → **폼솔루션 end-user가 등급을 선택하면 풀에서 자동 배정**(폼솔루션 서비스 내).
3. **자동 할당 원칙** — 자동 배정은 **전용 owner 코드 안에서**. **연속 우선**, 한 book에 연속이 부족하면 **book을 분리하되 각 book 내 page 연속성 유지**(조각 병합 금지).
4. **관리** — 위 전 과정 + **예약(선점) vs 사용중** 상태를 **대시보드·활동 로그**로 관리.

---

## 1. 도메인 모델 (용어)

Ncode 코드는 계층 주소다: **Section → Owner → Book → Page**.

| 계층 | 의미 | 비고 |
|------|------|------|
| **Section** | 코드 체계/제품군 구분 | 정보표 0/3/5/10/11/14/15 (+ **테스트/개발용 1·44**: 상용 미출시) |
| **Owner** | **프로젝트·제품라인 단위** (업체에 종속) | 한 업체(ACCOUNT)가 여러 Owner 보유 가능. 예: MathLAB=S5/O100 |
| **Book** | **Owner 안의 개별 상품/교재** | 예: MathLAB O100의 Book 1~9 = Algebra·Geometry… |
| **Page** | 상품(Book)의 페이지 | Book별 Start~Total |
| **ACCOUNT(고객사)** | **업체** | Owner의 상위 소유 주체 |

- **코드 종류**: **N코드 / G코드** (S코드는 NcodeCenter 범위 **제외**). 물리 체계 PDS3≈N, PDS2≈G. Book 단위로 정해짐. 발급 기준(운영정책 §4): 해외 N · 국내 소리펜 G · 국내 소리+필기 N.
- **펜 구분**: **Ncp(소리펜) / Ndp(필기펜)** — 동일 SOBP라도 Ncp/Ndp로 **분리 관리**(구분 관리 원칙).
- **2.3m 규칙**: 페이지 1장 ≤ 2.3m면 overflow 없음 → **판형 무시, 페이지 수만으로 티케팅**.
- **상태(핵심)**: **RESERVED(예약·선점, 선할당)** / **ACTIVE(사용중, 발급내역 있음)**.
- **SO 공유 불가(원칙)**: **Section·Owner는 프로젝트/고객사 식별 축** → 프로젝트 간 공유하지 않음. 빈 공간이 남아도 다른 프로젝트가 같은 SO 재활용 금지. (데이터상 공유 owner는 지양 대상)
- **연속성**: 자동 할당은 **연속 부족 → book 분리, book 내 page 연속**(조각 병합 금지)이 기본. 연속성 요건은 **서비스별 상이**(CasterN 불필요 / NeoStudio2 book 종속).
- **테스트/개발용 Section (1·44)**: 정보표에 없는 **상용 미출시** 코드 — 개발·테스트만 진행되고 서비스로 나가지 않음. 실데이터엔 존재하므로 **삭제하지 않고 "테스트/개발"로 구분 표기**하며, 각 화면·데이터에서 **이력으로 관리**(대시보드 배지, 데이터 `test_dev` 플래그).

> 상세·근거: [운영 정책](NcodeCenter-Operations-Policy.md).

---

## 2. 사용자 역할

**NcodeCenter 접근 = 내부 직원 전용.**

| 역할 | 설명 | 접근 |
|------|------|------|
| **Admin** | 시스템 관리자(네오랩 내부) | 전 메뉴 + 사용자·권한·설정 |
| **Staff** | 내부 운영 직원 | 업체/프로젝트 등록·코드 할당·발급·예약·대시보드·로그 |

**외부 행위자(NcodeCenter 직접 접근 X)**
- **등록 대상 업체/프로젝트**: 편집툴(CasterN)·폼솔루션·아이글·기타 — 직원이 대신 등록·할당.
- **폼솔루션 end-user**: 폼솔루션 서비스 내에서 **등급 선택 → 미리 할당된 풀에서 자동 배정**(NcodeCenter는 규칙·풀·연동 제공).

> 로그·감사 대상은 **내부 직원(Admin/Staff) 활동만**.

---

## 3. 서비스 유형 · 할당 정책

| 서비스 유형 | 예시 | 할당 주체·방식 | 공간 |
|-------------|------|----------------|------|
| **폼솔루션** | Form Solution | 직원이 **풀 미리 할당** → **end-user 등급 선택 시 자동 배정** | 전용 owner 내, 등급(grade)별 상한 |
| **편집툴** | **casterN** | 직원이 **직접 할당(수동)** | 주로 **사전 예약** 범위 |
| **아이글·기타** | 코드전용 | 직원이 **직접 할당** | 프로젝트별 |

- **owner 고정 ≠ 사전 예약**: 전용 owner=폼솔루션 풀의 배정 공간(등록/고객사에서 관리). 사전 예약=주로 casterN이 범위를 미리 확보.
- **폼솔루션 등급 자동 배정**: 직원이 등급별 SO·코드양 풀을 선점(RESERVED) → end-user가 등급 선택 시 풀에서 자동(IN_USE). 등급 상한 초과 등은 `설정` 정책.
- **자동 연속 할당**: 연속 우선 → 부족 시 book 분리(각 book page 연속). 엔진: `web/lib/allocationEngine.ts` (서비스별 `pageContiguityRequired` 플래그).

---

## 4. 메뉴 구조도

> **정본**: 메뉴 = `web/lib/menu.ts` · 라우트 = `web/app/**`. 화면 목록·코드는 [IA](NcodeCenter-IA.md), 화면별 명세는 [PRD](prd/README.md).
> **확장 규칙**: NcodeCenter는 사내에서 **Ncode를 쓰는 모든 서비스**의 프로젝트 현황(집계·상태)을 관리한다.
> 서비스가 늘어나면 `menu.ts`의 **`SERVICE_MENUS` 배열에 1건만 추가**한다 — 화면이 있으면 하위 메뉴로 펼쳐지고, 없으면 `/services/{key}` 안내(예정) 메뉴가 된다.

```
NcodeCenter
├─ 대시보드                                  DSH-01   (/)
├─ [코드]
│   ├─ SOBP 맵                               SOB-01   (/ownership)
│   └─ 코드 프로젝트                          PRJ-01   (/projects)  ← 전 서비스 공통 조회
├─ [티켓 발급]                                ← 발급 메뉴를 사이드바 그룹으로 분리
│   ├─ 계정 발급 (목록)                       TKT-03   (/tickets/account)
│   │   └─ 계정 등록·상세 수정                 TKT-06   (/tickets/account/new · /{email})
│   ├─ N Key 발급                            TKT-01   (/tickets/nkey)
│   └─ Key 발급 정산                          TKT-04   (/tickets/list)
├─ [서비스 관리]                              ← 사내 Ncode 사용 서비스별 관리 (확장 축)
│   ├─ CasterN 서비스 관리                    (구현)
│   │   ├─ 편집 프로젝트                      PRJ-02   (/projects/editing)
│   │   └─ PUI 코드 (피지컬)                  PRJ-06   (/pui)
│   └─ 폼솔루션 서비스 관리        예정        (/services/formsolution)
├─ [멤버 관리]
│   ├─ 고객사 관리                            MEM-01   (/companies)
│   └─ 활동 로그          ★Admin              LOG-01   (/activity)
└─ [정보]
    ├─ Ncode 정보                             INF-01   (/info)
    ├─ 브랜드 (CI)                            (PRD 없음)
    └─ DB 구조                                (PRD 없음)
```

### 서비스 ↔ 관리 메뉴 매핑

| 사용 서비스(`SOB-02`에서 지정) | 관리 메뉴 | 상태 |
|---|---|---|
| `CASTERN` casterN(편집툴) | CasterN 서비스 관리 (편집 프로젝트 · PUI 코드) | ✅ 구현 |
| `FORMSOLUTION` 폼솔루션 | 폼솔루션 서비스 관리 (등급별 풀 현황) | ⬜ 예정 |
| `NONE` 서비스 없음 | (관리 메뉴 없음 — 코드만 발급, 사용량 모니터링 불가) | — |

> **사용 서비스는 3종**(casterN · 폼솔루션 · 서비스없음)이다. 아이글·NeoStudio2·Ncode 프린터는 항목에서 폐지했다(PC-026) — 해당 코드는 **서비스 없음(코드만 발급)** 으로 관리한다.

> **코드 프로젝트(PRJ-01)** 는 **사용 서비스 필터로 전 서비스 코드를 조회**하므로 특정 서비스 그룹이 아닌 **[코드] 그룹**에 둔다. 서비스별 화면은 그 서비스 고유의 관리 기능만 담는다.

---

## 5. 핵심 화면 흐름

> **NcodeCenter는 내부 직원 운영 시스템**이다. **내부 직원이 업체/프로젝트를 직접 등록**하고 **코드를 할당**한다. **가입 요청·가입 승인은 폼솔루션(사용자)에게만** 해당하며, 폼솔루션은 미리 할당한 코드 풀에서 **사용자가 가입 승인 후 등급을 선택해 자동 배정**받는다. **편집툴·아이글·기타는 고객 요청 없이 직원이 등록·직접 할당**한다.

```
[NcodeCenter 내부 직원 (Admin/Staff)]
 ① 업체/프로젝트 등록  (2 등록 · 7 고객사)
     · 서비스 유형: 편집툴(CasterN) / 폼솔루션 / 아이글 / 기타 코드전용 업체
     · (폼솔루션) 등급 체계 · 전용 owner 지정
        │
        ▼
 ② 코드 할당/발급  (3 요청·할당 · 6 할당)
     ├─ 편집툴·아이글·기타 → 프로젝트에 직접 할당(연속 배정, 부족 시 book 분리)
     └─ 폼솔루션 → 등급별 SO·코드양 '풀'을 미리 할당(선점 = RESERVED)
        │
        ▼
 ③ (4 티켓) 기간·페이지 limit 발급 · (9 활동 로그) 기록 · (1 대시보드) 집계

────────────────────────────────────────────────────────────
[폼솔루션 사용자]  (폼솔루션 서비스 내부 — NcodeCenter 직접 접근 X)
 → 가입 요청 → (② 가입 승인) → 본인 상태에 맞는 '등급' 선택
 → 등급에 맞는 코드 양을 NcodeCenter '풀'에서 자동 배정받아 사용 (→ IN_USE)
   ※ 가입 요청·가입 승인은 **폼솔루션 사용자에게만** 해당.
   ※ 편집툴·아이글·기타는 고객 요청/가입 없이 **직원이 등록·직접 할당**.
   ※ NcodeCenter = 등급→코드양 규칙 + 코드 풀 제공/연동(API)
```

---

## 6. 아키텍처 개요

```
[외부 고객] ──요청──▶ NcodeCenter (Next.js/Vercel + Postgres)
                         │  · 업체/프로젝트 등록·할당엔진·예약/사용중 원장·대시보드·활동로그(자체 DB)
                         └──프록시──▶ NDP Ncode 서버 (/ncode/v2/*) — 실제 코드 발급/집행
```

- **기반**: `webcaster.admin`(Spring Boot BFF, NDP 프록시)을 참조. 발급/예약/할당/회사/권한 API가 NDP와 연동돼 있음.
- **NcodeCenter 스택(확정)**: **Next.js(App Router) + Postgres(Vercel/Neon/Supabase)**. 코드 발급은 NDP 위임, NcodeCenter는 업체/프로젝트 등록·코드 할당·예약/사용중 원장·활동로그·대시보드를 담당(폼솔루션 end-user 등급 배정은 연동/API).
- **DB 구조**: [`NcodeCenter-DB.md`](NcodeCenter-DB.md).

---

## 7. 현재 구현 현황

- **web/** (Next.js 15 + React 19) — 로컬: `npm run dev` → http://localhost:3000
  - `/ownership` 소유권 맵(마스터+상세 병합, 예약/사용중, 제품·고객 필터) ✅
  - `/db` DB 구조 뷰(테이블·관계·도메인계층) ✅
  - `lib/allocationEngine.ts` 자동 연속 할당 엔진(`pageContiguityRequired` 서비스별 연속성) ✅
- **db/**: Postgres 마이그레이션(`migrations/0001_init.sql`: allocations usage_status·code_type·pen_type, grade_so 등)·시드·임포트(`import/`, XLSX→JSON).
- **데이터 파이프라인**: `db/import/build_ownership_data.py` → `web/data/ownership-data.json`.
- 프로토타입(HTML, 참고용): `docs/prototypes/`.

---

## 8. 문서(MD) 구조도 — 문서 지도 & 배치 규칙

> **MD가 계속 추가되므로, 모든 문서는 아래 지도에 위치를 가진다.** 새 MD는 규칙에 따라 배치하고 이 문서(§4/§8)에서 링크한다.

```
NcodeCenter/
├── docs/
│   ├── NcodeCenter-Structure.md          ★ 구조 단일(지도). 정의·도메인·역할·메뉴구조도·문서구조도·아키텍처·로드맵
│   ├── NcodeCenter-DB.md                 DB 구조(테이블·관계). 앱 뷰 = /db
│   ├── NcodeCenter-Operations-Policy.md  운영 정책(개발 반영 기준). ★ 신규 화면 필수 참조
│   ├── NcodeCenter-SOBP-Allocation.md    SOBP 할당(NDP 연동) 참조 — 실시간 발급 흐름·인증 체인·재사용 정책
│   ├── prd/                              ★ 화면별 PRD (1화면코드=1파일, `{화면code}_{화면명}.md`) — IA v2.0 기준 17개
│   ├── menus/                            (구) 메뉴별 상세 — PRD로 이관 중
│   │   ├── 01-dashboard.md               ✅
│   │   ├── 03-requests-allocation.md     ✅
│   │   └── (02·04~11 = 예정)
│   ├── data/                             데이터 MD (실데이터 스냅샷·매핑)
│   │   └── NcodeCenter-Dashboard-Data.md
│   └── prototypes/                       초기 HTML 프로토타입(참고용)
├── db/                                   Postgres: migrations/ · seed/ · import/(XLSX→JSON)
└── web/                                  Next.js 앱: app/(라우트) · components/ · lib/(engine·schema) · data/(json)
```

### 문서 종류별 역할 & 새 MD 배치 규칙

| 종류 | 위치 | 역할 | 새로 추가할 때 |
|------|------|------|----------------|
| **구조(지도)** | `docs/NcodeCenter-Structure.md` | 시스템 전체 지도(이 문서) | 정의·도메인·메뉴 변화 시 여기 갱신 |
| **화면 PRD** | `docs/prd/{화면code}_{화면명}.md` | 화면 1개 기능 명세(개요·Flow·정책·사용법·메시지·연결 화면) | IA에 화면코드 추가 → PRD 작성 → [prd/README](prd/README.md) 목록에 등록. **디자인·DB 스펙 제외** |
| **메뉴 상세(구)** | `docs/menus/NN-name.md` | PRD 이전의 메뉴 스펙 | 신규 작성 금지 — PRD로 대체 |
| **DB 구조** | `docs/NcodeCenter-DB.md` | 테이블·관계 | 변경 시 `db/migrations/*` + `web/lib/dbSchema.ts`(=/db 뷰) 동기화 |
| **운영 정책** | `docs/NcodeCenter-Operations-Policy.md` | 발급·할당 원칙 | 정책 추가/변경 → 관련 메뉴 MD 체크리스트 반영 |
| **연동 참조** | `docs/NcodeCenter-SOBP-Allocation.md` | 외부(NDP 등) 연동 흐름 참조 | 정책성 내용은 **운영 정책에 요약**하고 상세만 참조 문서에 |
| **데이터** | `docs/data/*.md` | 실데이터 스냅샷·매핑 | 데이터/파이프라인 변화 시 (json은 `web/data/`) |
| **프로토타입** | `docs/prototypes/*.html` | 초기 실험(참고) | 정식 화면은 `web/`(Next.js)로 |

> 규칙 요약: **① 메뉴 = docs/menus/ 한 파일** ② **DB 변경 3동기화**(MD·migration·schema뷰) ③ **정책은 Operations-Policy 단일 + 메뉴 체크리스트** ④ **데이터는 docs/data/** ⑤ **화면 소스는 web/**.

---

## 9. 요구사항 ↔ 메뉴 매핑

| 요구 | 내용 | 담당 메뉴 |
|------|------|-----------|
| #1 | 기간 + 페이지수 limit | 4 티켓 |
| #2 | 대시보드(할당현황 + 내부 직원 로그, 예약/사용중) | 1 대시보드, 9 활동 로그 |
| #3 | N코드 정보(섹션·2.3m·PDS2/3) | 10 Ncode 정보 |
| #4 | 2.3m 이하 → 페이지수로만 티케팅 | 4 티켓, 6 할당, 11 설정 |
| #5 | 직원이 업체/프로젝트 등록 → 코드 할당(폼솔루션=풀 미리할당→end-user 등급 자동배정) | 2·3·5·6·7 |

## 10. 로드맵

1. 이 구조 확정 → **메뉴별 상세 MD**(`docs/menus/`) 순차 작성.
2. **DB 구조 확정**([`NcodeCenter-DB.md`](NcodeCenter-DB.md)) — 업체/Owner(프로젝트)/Book(상품)/Page + 예약·사용중 status 반영.
3. 상세시트 **book-level 파싱(형식별 어댑터)** → 제품 book단위·드릴다운 실데이터.
4. 티켓·드릴다운 등 나머지 화면 **Next.js 이관**.
