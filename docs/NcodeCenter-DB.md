# NcodeCenter — DB 설계

> ✅ **동기화됨(2026-08-03)**: 이 문서는 앱 스키마 뷰(`web/lib/dbSchema.ts` = 정본)와 일치한다. 코드 상태 = **할당됨/미발급**(예약 폐기, PC-003~005). `usage_status`·`reservations`는 레거시로 스키마만 유지. 공통코드(`common_codes`/`common_members`)·프로젝트/편집 테이블 반영 완료. 근거: [운영 정책 §0 Changelog](NcodeCenter-Operations-Policy.md).

> NcodeCenter 자체 데이터 계층 설계. 코드 발급/집행은 NDP가 담당하지만, **고객사(계층·공통코드)·전용 owner·할당 원장(SOBP×고객)·코드/편집 프로젝트·티켓·활동로그** 는 NcodeCenter DB가 보관한다. (내부 직원 전용 운영 — 외부 가입승인 없음, PC-002)
> 기본 대상: **관계형(Postgres — Vercel Postgres/Neon/Supabase)**. Firestore 매핑은 §5.
> 관련: [구조](NcodeCenter-Structure.md) · [데이터](data/NcodeCenter-Dashboard-Data.md)

---

## 1. 왜 관계형(Postgres) 권장

이 도메인의 핵심 질의는 **범위(range) 기반**이다: `[book_start,book_end] × [page_start,page_end]` 의 중복 탐지, 빈 구간(gap) 계산, Section/Owner/Book/Page별 사용량 집계, 고객별 점유 집계. Postgres는 범위 조건·`GROUP BY`·인덱스·`int4range/int8range`+GiST로 이를 자연스럽게 처리한다. Firestore(문서형)는 범위 겹침 질의가 약해 대시보드 집계·충돌검사에 불리하다. → **Vercel + Postgres 권장**, Firebase를 쓸 경우 §5 방식으로 우회.

---

## 2. 도메인 모델 & 엔티티 개요

**계층**: `업체(customers=ACCOUNT) ─< Owner(프로젝트/제품라인) ─< Book(상품/교재) ─< Page`.
소유·발급 원장 `allocations`의 한 행 = **하나의 Book 범위**(= Owner 아래 상품 단위). Owner 단위는 `(customer, product, section, owner)`로 그룹.

**코드 상태**: 코드는 **할당됨(발급) / 미발급(빈 코드)** 2가지(예약/사용중 구분 폐기, PC-004). `allocations`의 모든 행 = 할당됨. `usage_status` 컬럼은 **레거시로만 유지**.
- `is_deleted` = 레코드 삭제 여부(수명주기).

```
grades ──< customers(고객사) ──< customer_users
              │  │  └─< owner_pins            (자동 대상: 전용 owner)
              │  └────< reservations          (레거시·미사용)
              │
common_codes(상위=대장 보유) ──< common_members ──> customers(하위)   ★ 공통(커먼)코드
              │
              └────< allocation_requests ──> allocations   (승인 결과)
                                   │
allocations(Owner·Book 원장) ──1:1─ tickets(기간·페이지 limit)
customers ──< projects(코드 프로젝트) ──< project_issued
customers ──< editing_books(편집 프로젝트=casterN) · work_logs(업무 메모)
staff_users ──< activity_log         (내부 직원 audit)
sections_dim (참조: Section×제품별 Owner/Book/Page max·length)
```

> **공통(커먼)코드 = 상위 코드 개념(중요)**: 코드 정본 `(code_type k, section, owner)` 을 **대장(상위) 고객사가 보유**하고, 여러 **하위 고객사가 사용(멤버십)** 한다. 고객사 계층(상위/하위/단독)이 여기서 판정된다. → §3 `common_codes` · `common_members` (PC-006~009·013~014).

- **allocations** = Owner×Book 소유/발급 원장(대시보드·소유권·import 근간). 모든 행=할당됨, `project_name`(Owner=프로젝트명)·`book_name`(Book=상품/교재명) 보유.
- **projects / project_issued** = 코드 프로젝트(조회 전용)와 발급 SOBP 내역. **editing_books** = 편집 프로젝트(=casterN) 책 단위 원장. **work_logs** = 업무 메모 원장.
- **tickets** = 기간(issue~expire)+페이지 limit 사용허가.
- 코드 종류(PDS3=Ncode / PDS2=Gcode / **PDS4=S-code(Section 44)** / **OID**=index 전용)는 **좌표(SOBP)의 속성**이며 Book 단위로 기록한다(allocations.product) `PC-032` `PC-035`.
  한 (Section,Owner)는 PDS2·PDS3·PDS4 중 한 종류만 쓴다. 펜 구분(NSP 소리펜 / NWP 필기펜)도 좌표 속성으로 함께 기록한다.
- **OID** 는 index 전용 코드다 `PC-033` — 좌표 조회는 종류 **[OID]** 필터로 하고, 업체별 index 목록은 별도 대장(`oid-data.json` · 화면 `OID-01`)에서 본다. **옛 IDS(A) = OID 동일** `PC-035`.
- NDP 연동 시 `allocations.ndp_issued_code_id`, `tickets.ndp_ticket_id` 로 원격 식별자 보관.

---

## 3. Postgres DDL

```sql
-- 참조: N코드 정보표 (Section×제품별 최대범위·길이)
CREATE TABLE sections_dim (
  product     TEXT   NOT NULL CHECK (product IN ('PDS2','PDS3','PDS4','OID')),  -- 좌표 속성: PDS2=Gcode · PDS3=Ncode · PDS4=S-code(Section 44) · OID=index 전용
  pen         TEXT   CHECK (pen IN ('NSP','NWP')),                 -- 펜 구분(좌표 속성): NSP=소리펜 · NWP=필기펜
  section     INT    NOT NULL,
  owner_max   BIGINT NOT NULL,
  book_max    INT    NOT NULL,
  page_max    INT    NOT NULL,
  length_mm   INT    NOT NULL,
  PRIMARY KEY (product, section)
);

-- 등급 정책 (폼솔루션 자동 할당 상한/승인 임계치)
CREATE TABLE grades (
  id                     SERIAL PRIMARY KEY,
  name                   TEXT NOT NULL UNIQUE,       -- 예: A/B/C
  auto_page_cap          BIGINT,                     -- 등급별 자동 할당 상한(총 페이지)
  volume_approval_pages  INT,                         -- 이 양 초과 요청은 관리자 승인으로 전환
  note                   TEXT
);

-- 등급별 SO 차등 (운영정책 §3): 등급×코드종류 → Section·페이지상한
CREATE TABLE grade_so (
  id         SERIAL PRIMARY KEY,
  grade_id   INT NOT NULL REFERENCES grades(id),
  code_type  TEXT NOT NULL CHECK (code_type IN ('N','G')),
  section    INT  NOT NULL,                    -- 등급별 S (예: a=0, b=3)
  page_cap   INT,                              -- 이 SO 페이지 상한
  UNIQUE (grade_id, code_type)
);

-- 고객사 마스터 — 계층(상위/하위/단독)은 공통코드 보유·멤버십으로 판정. 서비스·등급은 프로젝트/할당에서 지정.
CREATE TABLE customers (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,                       -- 업체명
  manager       TEXT,                                -- 담당자
  contact       TEXT,                                -- 연락처
  address       TEXT,                                -- 주소
  biz_no        TEXT,                                -- 사업자등록번호
  bank_name     TEXT, account_no TEXT,               -- 은행 / 계좌
  tax_email     TEXT,                                -- 세금계산서 이메일
  rates         JSONB,                               -- 편집 단가(2026 항목별): key(s_page/s_edit/s_cmp2…/w_none…)→단가, 미지정=전사 기본값
  page_unit     INT, symbol_unit INT,                -- (구) 적용/편집 단가 — rates로 흡수
  docs          JSONB,                               -- 관련 서류(라벨+파일명)
  closed        BOOLEAN NOT NULL DEFAULT FALSE,      -- 프로젝트 종료 = 발급 이력만 유지
  closed_note   TEXT,                                -- 종료/이관 메모
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 계정(App Key) 부여 고객 사용자 = 서비스 계정
CREATE TABLE customer_users (
  id           SERIAL PRIMARY KEY,
  customer_id  INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  user_ref     TEXT NOT NULL,                        -- 계정 식별(email · App Key 연동)
  service      TEXT NOT NULL                         -- 사용처(연동 서비스) — 이 서비스에서만 로그인 허용
                 CHECK (service IN ('CASTERN','FORMSOLUTION','SDK')),
  UNIQUE (customer_id, user_ref)
);

-- 공통(커먼)코드 레지스트리 — 상위(대장) 고객사가 보유하는 코드 정본 (PC-006~009)
--  코드 식별 = (code_type, section, owner). 여러 하위 고객사가 함께 사용(멤버십).
CREATE TABLE common_codes (
  code_type    TEXT NOT NULL CHECK (code_type IN ('N','G','A','O')),  -- N=PDS3 · G=PDS2 · O·A=OID(옛 IDS 표기 포함). PDS4 는 Section 44 로 판별
  section      INT    NOT NULL,
  owner        BIGINT NOT NULL,
  name         TEXT NOT NULL,                     -- 코드명 (예: 네오노트-3-27)
  holder       TEXT,                              -- 대표 브랜드(그룹핑)
  company      TEXT NOT NULL,                     -- 보유 대장 고객사(= 상위)
  history_only BOOLEAN NOT NULL DEFAULT FALSE,    -- A(옛 IDS = OID) = 코드 할당·편집 없이 검색/이력만
  PRIMARY KEY (code_type, section, owner)
);

-- 공통코드 사용 멤버십 — 공통코드를 쓰는 하위 고객사 (PC-013·014)
--  빌드 시드(common-members.json) + 수동 추가. 하위 고객사는 정식 customers 레코드.
CREATE TABLE common_members (
  id          SERIAL PRIMARY KEY,
  code_type   TEXT NOT NULL, section INT NOT NULL, owner BIGINT NOT NULL,
  customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,   -- 하위 고객사
  seeded      BOOLEAN NOT NULL DEFAULT FALSE,     -- 빌드 시드 / 수동 추가 구분
  FOREIGN KEY (code_type, section, owner) REFERENCES common_codes(code_type, section, owner),
  UNIQUE (code_type, section, owner, customer_id)
);

-- 전용 owner 고정 (자동 대상 서비스: 폼솔루션)
CREATE TABLE owner_pins (
  id           SERIAL PRIMARY KEY,
  customer_id  INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product      TEXT NOT NULL,
  section      INT  NOT NULL,
  owner        BIGINT NOT NULL,
  note         TEXT,
  UNIQUE (product, section, owner)                   -- 한 owner는 한 고객 전용
);

-- 사전 예약 (레거시·미사용) — 예약 개념 폐기(PC-004). 스키마만 유지, 신규 로직 미사용.
CREATE TABLE reservations (
  id           SERIAL PRIMARY KEY,
  customer_id  INT NOT NULL REFERENCES customers(id),
  product      TEXT NOT NULL,
  section      INT  NOT NULL,
  owner        BIGINT NOT NULL,
  book_start   INT NOT NULL, book_end INT NOT NULL,
  page_start   INT NOT NULL, page_end INT NOT NULL,
  description  TEXT,
  ndp_reserved_code_id BIGINT,                        -- NDP 원격 식별자(있으면)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 할당 원장 (Owner×Book × 업체) — 대시보드/소유권/import 근간
--  한 행 = Owner 아래 하나의 Book 범위. Owner=프로젝트, Book=상품/교재.
CREATE TABLE allocations (
  id            BIGSERIAL PRIMARY KEY,
  customer_id   INT NOT NULL REFERENCES customers(id),   -- 업체(ACCOUNT)
  product       TEXT NOT NULL CHECK (product IN ('PDS2','PDS3','PDS4','OID')),  -- 좌표 속성(PDS3≈N · PDS2≈G · PDS4=S-code · OID=index 전용)
  code_type     TEXT CHECK (code_type IN ('N','G')),      -- 코드 종류(운영정책 §4, S 제외)
  pen_type      TEXT CHECK (pen_type IN ('Ncp','Ndp')),   -- 펜 구분 — 동일 SOBP라도 분리 관리
  section       INT  NOT NULL,
  owner         BIGINT NOT NULL,                          -- Owner = 프로젝트/제품라인
  project_name  TEXT,                                     -- Owner 이름(프로젝트명)
  book_start    INT NOT NULL, book_end INT NOT NULL,      -- Book = 상품(단일이면 start=end)
  page_start    INT NOT NULL, page_end INT NOT NULL,
  book_name     TEXT,                                     -- Book 이름(상품/교재명)
  usage_status  TEXT NOT NULL DEFAULT 'IN_USE'            -- 레거시: 모든 행=할당됨(예약/사용중 구분 폐기, PC-004)
                CHECK (usage_status IN ('RESERVED','IN_USE')),
  service       TEXT,                                     -- 사용 서비스(CASTERN/AIGLE/FORMSOLUTION/NEONOTE/NONE) — SOBP 할당서 지정(PC-011)
  source        TEXT NOT NULL DEFAULT 'MANUAL'            -- AUTO(엔진)/MANUAL/IMPORT
                CHECK (source IN ('AUTO','MANUAL','IMPORT')),
  is_deleted    BOOLEAN NOT NULL DEFAULT FALSE,           -- 레코드 수명주기
  ndp_issued_code_id BIGINT,
  issued_at     TIMESTAMPTZ,                              -- 발급일
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  book_range    int4range GENERATED ALWAYS AS (int4range(book_start, book_end, '[]')) STORED,
  page_range    int4range GENERATED ALWAYS AS (int4range(page_start, page_end, '[]')) STORED
);
CREATE INDEX ix_alloc_space   ON allocations (product, section, owner, book_start);
CREATE INDEX ix_alloc_cust    ON allocations (customer_id);
CREATE INDEX ix_alloc_usage   ON allocations (usage_status);
CREATE INDEX ix_alloc_book_gist ON allocations USING gist (book_range);
-- 같은 (product,section,owner,펜)에서 할당된 Book×Page 사각영역 중복(이중발급) 방지
-- ALTER TABLE allocations ADD CONSTRAINT no_overlap
--   EXCLUDE USING gist (product WITH =, section WITH =, owner WITH =, COALESCE(pen_type,'') WITH =, book_range WITH &&, page_range WITH &&)
--   WHERE (is_deleted = FALSE);

-- 코드 프로젝트 (조회 전용) — 업체별 발급 SOBP + 사용 서비스. 등록은 SOBP 맵에서(PC-011).
CREATE TABLE projects (
  id            SERIAL PRIMARY KEY,
  customer_id   INT NOT NULL REFERENCES customers(id),
  name          TEXT NOT NULL,                        -- 프로젝트명
  service       TEXT CHECK (service IN ('CASTERN','AIGLE','FORMSOLUTION','NEONOTE','NONE')),  -- NEONOTE=NeoStudio2
  grade         TEXT,                                 -- 폼솔루션 등급(a/b/c)
  editing_owner BIGINT,                               -- ★ editing_books.owner 연결(편집)
  symbols       INT,                                  -- 편집 심볼 총합(진행 표시)
  editing       BOOLEAN NOT NULL DEFAULT FALSE,       -- 편집 등록됨(=casterN)
  shared        BOOLEAN NOT NULL DEFAULT FALSE,       -- 공유(커먼) 코드 프로젝트
  code_only     BOOLEAN NOT NULL DEFAULT FALSE        -- 대장 할당만(편집 없음)
);

-- 프로젝트 발급 SOBP 내역 (한 프로젝트에 여러 블록)
CREATE TABLE project_issued (
  id           SERIAL PRIMARY KEY,
  project_id   INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  section      INT NOT NULL, owner BIGINT NOT NULL,
  book_start   INT NOT NULL, book_end INT NOT NULL,
  page_start   INT NOT NULL, page_end INT NOT NULL,
  codes        INT,                                   -- 발급 코드 수 = 페이지 용량
  kind         TEXT CHECK (kind IN ('N','G','A','O')),   -- 좌표 코드 종류값 (O=OID · PDS4 는 Section 44)
  issued_at    DATE
);

-- 편집 프로젝트 (책 단위, =casterN) — 엑셀(2_New_NSP) 원장. 소리펜7·필기펜4 모드 심볼 → 편집 비용.
CREATE TABLE editing_books (
  id               BIGSERIAL PRIMARY KEY,
  customer_id      INT NOT NULL REFERENCES customers(id),
  owner            BIGINT,                            -- ★ projects.editing_owner 매칭
  section          INT, book INT,
  code_type        TEXT CHECK (code_type IN ('N','G')),
  pen_type         TEXT, pen_model TEXT,              -- 타입(소리펜/필기펜) / 펜모델(C90…)
  title            TEXT, ncp2_file TEXT,              -- 교재명 / ncp2 파일명
  start_page       INT, total_page INT,
  resource_mb      NUMERIC,                           -- ncp2 파일 크기
  issued_at        DATE, deleted_at DATE,             -- 북코드 발급/삭제일
  ncp2_modified_at DATE,
  issuer           TEXT,                              -- 발급인
  sound_symbols    JSONB,                             -- 소리펜 항목별 수량(14): 편집기본·Compound2~8·슬롯전환·그룹재생·게임·프롬프트·RAG·4도출력
  pen_symbols      JSONB,                             -- 필기펜 항목별 수량(5): none편집·Custom·action변경·노트서버업로드·교원구몬/KEP
  symbol_total     INT,                               -- 소리펜합+필기펜합
  edit_methods     TEXT[],                            -- 편집방식(복수)
  kep_used         TEXT, set_count INT,               -- 교원구몬 사용여부(O/X) / 세트 수
  detail           JSONB, output_file JSONB, app_data JSONB,  -- 세부·출력파일·APP데이터
  work_logs        JSONB                              -- 업무요청 메모(요청/처리/메모)
);

-- 업무 원장 (메모) — 고객사+프로젝트 단일 원장. no = 고객사 내 안정 번호.
CREATE TABLE work_logs (
  id           BIGSERIAL PRIMARY KEY,
  no           INT,                                   -- 고객사 내 표시번호(삭제해도 유지)
  customer_id  INT NOT NULL REFERENCES customers(id),
  project_id   INT REFERENCES projects(id),          -- NULL = 고객사 공통
  kind         TEXT,                                  -- 요청/처리/메모
  content      TEXT, author TEXT,
  log_date     DATE
);

-- 티켓 (기간 + 페이지 limit)
CREATE TABLE tickets (
  id               BIGSERIAL PRIMARY KEY,
  allocation_id    BIGINT REFERENCES allocations(id),
  customer_id      INT NOT NULL REFERENCES customers(id),
  product          TEXT NOT NULL,
  section          INT NOT NULL, owner BIGINT NOT NULL,
  book             INT NOT NULL, book_allowed_max INT NOT NULL,
  page             INT NOT NULL, page_allowed_max INT NOT NULL,
  issue_time       TIMESTAMPTZ NOT NULL,
  expire_time      TIMESTAMPTZ,                        -- NULL = 무제한
  issuer_id        TEXT,
  ndp_ticket_id    BIGINT,
  status           TEXT NOT NULL DEFAULT 'ISSUED'
                   CHECK (status IN ('ISSUED','EXPIRED','REVOKED')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_ticket_cust ON tickets (customer_id);

-- 코드 요청/승인 워크플로우
CREATE TABLE allocation_requests (
  id             BIGSERIAL PRIMARY KEY,
  customer_id    INT NOT NULL REFERENCES customers(id),
  product        TEXT NOT NULL,
  requested_pages INT NOT NULL,
  requested_section INT,
  mode           TEXT NOT NULL CHECK (mode IN ('AUTO','APPROVAL')),   -- 유형+양 게이트 결과
  status         TEXT NOT NULL DEFAULT 'PENDING'
                 CHECK (status IN ('PENDING','APPROVED','REJECTED','ISSUED')),
  approver_id    TEXT,
  reject_reason  TEXT,
  result_allocation_id BIGINT REFERENCES allocations(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at     TIMESTAMPTZ
);
CREATE INDEX ix_req_status ON allocation_requests (status, created_at);

-- 내부 직원 계정
CREATE TABLE staff_users (
  id         TEXT PRIMARY KEY,                         -- 이메일 등
  name       TEXT,
  role       TEXT NOT NULL CHECK (role IN ('ADMIN','STAFF')),
  enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 내부 직원 활동 audit (외부 고객 활동은 대상 아님)
CREATE TABLE activity_log (
  id          BIGSERIAL PRIMARY KEY,
  actor_id    TEXT NOT NULL REFERENCES staff_users(id),
  action      TEXT NOT NULL,                           -- APPROVE/REJECT/ISSUE/DELETE/LOGIN...
  target_type TEXT,                                    -- REQUEST/TICKET/ALLOCATION/CUSTOMER...
  target_id   TEXT,
  detail      JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_log_actor ON activity_log (actor_id, created_at);
CREATE INDEX ix_log_time  ON activity_log (created_at);
```

---

## 4. 주요 질의 (대시보드/검증)

- **Section별 소유 Owner 수(할당됨)**: `SELECT section, COUNT(DISTINCT owner) FROM allocations WHERE product=$1 AND NOT is_deleted GROUP BY section;`
- **할당 규모 요약**: `SELECT COUNT(*) FROM allocations WHERE NOT is_deleted;` (모든 행=할당됨)
- **서비스별 코드 현황**: `SELECT service, COUNT(*) FROM allocations WHERE NOT is_deleted GROUP BY service;`
- **업체별 점유(페이지)**: `(book_end-book_start+1)*(page_end-page_start+1)` 합계를 `customer_id`로 집계.
- **중복 탐지**: `no_overlap` 배타제약(위 주석) 또는 `book_range && ... AND page_range && ...` 자기조인.
- **범위 초과 검출**: `allocations` JOIN `sections_dim` 후 `owner>owner_max OR book_end>book_max OR page_end>page_max`.
- **가용(남은 영역)**: `sections_dim` 총량 − 집계 사용량.

---

## 5. Firebase(Firestore) 선택 시 매핑

- 컬렉션: `customers`, `common_codes`, `common_members`, `owner_pins`, `allocations`, `projects`, `editing_books`, `tickets`, `allocation_requests`, `activity_log`, `sections_dim`(참조). (`reservations`=레거시)
- 문서 필드는 §3 컬럼과 동일. `allocations` 문서에 `product`,`section`,`owner`,`bookStart/End`,`pageStart/End`,`customerId` 유지.
- **한계**: Firestore는 범위 겹침(&&) 질의가 없어 **중복/gap/집계**를 서버(클라우드 함수)에서 로드 후 계산해야 함 → 대시보드 집계용 **파생 캐시 문서**(`stats/{product}`) 를 함수로 갱신 권장.
- 규칙: 외부 고객은 자기 `customerId` 문서만 read, 쓰기는 함수 경유. 활동로그는 내부 전용.

---

## 6. 기존 base(webcaster.admin)와의 관계

- 기존 앱은 로컬 DB에 `users`+세션만 두고 나머지는 NDP 프록시. NcodeCenter DB는 여기에 **신규 도메인 테이블**을 추가하는 것.
- **배포 선택지**:
  - (A) 기존 **Java+MariaDB 유지** + 위 테이블을 MariaDB에 추가(문법만 MariaDB로: `int4range`→일반 컬럼+앱단 검사).
  - (B) **Vercel + Postgres**로 신규 서버리스 구성(프로토타입 HTML들이 이미 순수 JS라 이식 쉬움). ← 토큰 제공 의사와 부합.
  - (C) **Firebase/Firestore** (§5, 집계는 함수로).

---

## 7. XLSX/CSV import 매핑

XLSX 원장(오너코드_발급리스트) 1행 → `allocations` 1행 (모두 **할당됨**, 예약/사용중 구분 없음):
- `source='IMPORT'`, 마스터=product UNKNOWN(태깅 전), 상세시트=`book_name`(교재명)·`product`(PDS2/3)·`issued_at`.
- 공통: `customer→customer_id`, `product`, `section`, `owner`, `project_name`, `book_start/end`, `page_start/end`.
- 공통(커먼)코드 시트(cu) → `common_codes`(대장) + `common_members`(하위). 편집 시트(2_New_NSP) → `editing_books`.
- import 후 §4 검증(중복·범위초과) 자동.
> 현재 파이프라인은 대시보드용 JSON(`web/data/ownership-data.json`·`common-members.json` 등)까지 완료. DB 적재는 프로비저닝 후.

## 8. 확정 & 산출물

- **스택 확정: (B) Vercel + Postgres**, 범위 = **전체 스키마 마이그레이션**.
- 산출물:
  - `db/migrations/0001_init.sql` — 전체 스키마(테이블·인덱스·중복방지 EXCLUDE, `btree_gist`). 코드 상태=할당됨/미발급(예약 폐기, `usage_status`는 레거시).
  - `db/seed/0001_sections_dim.sql` — N코드 정보표 참조(PDS3 7 + PDS2 3).
  - `db/README.md` — 실행법(psql/Vercel), `.env` 시크릿, 검증 쿼리.
- **앱 내 스키마 뷰**: `web/app/db` — 이 문서의 테이블 구조를 앱에서 시각적으로 확인.
- 상태: 로컬 psql/도커 부재로 **라이브 검증 미실행**(표준 Postgres 문법). 프로비저닝 후 확인.
- 다음: `grades`/데모 `customers` seed → import 스크립트(DB 적재) → 대시보드 DB 연결.
- **운영정책 반영([Operations-Policy](NcodeCenter-Operations-Policy.md))**: ✅ `allocations.code_type(N/G)`·`pen_type(Ncp/Ndp)` + `grade_so`(등급별 SO) 반영. 무겹침 EXCLUDE는 **펜(Ncp/Ndp) 구분 포함**(동일 SOBP라도 펜 다르면 겹침 아님). 서비스별 연속성은 엔진 `pageContiguityRequired`(웹 `web/lib/allocationEngine.ts`)로 처리.
