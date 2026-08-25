-- NcodeCenter — 0001_init.sql
-- 대상: PostgreSQL (Vercel Postgres / Neon / Supabase)
-- 실행: psql "$POSTGRES_URL" -f db/migrations/0001_init.sql
-- 멱등: IF NOT EXISTS 사용. 범위 배타제약을 위해 btree_gist 필요.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ── 참조: N코드 정보표 (Section×제품별 최대범위·길이) ──────────────
CREATE TABLE IF NOT EXISTS sections_dim (
  product     TEXT   NOT NULL CHECK (product IN ('PDS2','PDS3')),  -- PDS2=Gcode, PDS3=Ncode
  section     INT    NOT NULL,
  owner_max   BIGINT NOT NULL,
  book_max    INT    NOT NULL,
  page_max    INT    NOT NULL,
  length_mm   INT    NOT NULL,
  PRIMARY KEY (product, section)
);

-- ── 등급 정책 ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grades (
  id                     SERIAL PRIMARY KEY,
  name                   TEXT NOT NULL UNIQUE,        -- 예: A/B/C
  auto_page_cap          BIGINT,                      -- 등급별 자동 할당 상한(총 페이지)
  volume_approval_pages  INT,                         -- 초과 요청은 관리자 승인으로 전환
  note                   TEXT
);

-- 등급별 SO 차등 (운영정책 §3): 등급×코드종류 → Section·페이지상한
--  예) a등급 N: section 0, 1000p / b등급 N: section 3, 100p
CREATE TABLE IF NOT EXISTS grade_so (
  id         SERIAL PRIMARY KEY,
  grade_id   INT NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
  code_type  TEXT NOT NULL CHECK (code_type IN ('N','G')),  -- G/N 구분
  section    INT  NOT NULL,                                 -- 등급별 S
  page_cap   INT,                                           -- 이 SO 페이지 상한
  note       TEXT,
  UNIQUE (grade_id, code_type)
);

-- ── 고객사 (서비스 유형·등급·가입 상태) ──────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  service_type  TEXT NOT NULL CHECK (service_type IN ('FORMSOLUTION','CASTERN')),
  grade_id      INT REFERENCES grades(id),
  status        TEXT NOT NULL DEFAULT 'PENDING'       -- 가입 승인: PENDING→ACTIVE
                CHECK (status IN ('PENDING','ACTIVE','SUSPENDED')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_users (
  id           SERIAL PRIMARY KEY,
  customer_id  INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  user_ref     TEXT NOT NULL,
  UNIQUE (customer_id, user_ref)
);

-- ── 전용 owner 고정 (자동 대상: 폼솔루션) ───────────────────────
CREATE TABLE IF NOT EXISTS owner_pins (
  id           SERIAL PRIMARY KEY,
  customer_id  INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product      TEXT NOT NULL,
  section      INT  NOT NULL,
  owner        BIGINT NOT NULL,
  note         TEXT,
  UNIQUE (product, section, owner)
);

-- ── 사전 예약 (레거시·미사용) — 예약 개념 폐기(PC-004), 스키마만 유지 ──
CREATE TABLE IF NOT EXISTS reservations (
  id           SERIAL PRIMARY KEY,
  customer_id  INT NOT NULL REFERENCES customers(id),
  product      TEXT NOT NULL,
  section      INT  NOT NULL,
  owner        BIGINT NOT NULL,
  book_start   INT NOT NULL, book_end INT NOT NULL,
  page_start   INT NOT NULL, page_end INT NOT NULL,
  description  TEXT,
  ndp_reserved_code_id BIGINT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (book_start <= book_end AND page_start <= page_end)
);

-- ── 할당 원장 (Owner×Book × 업체) — 대시보드/소유권/import 근간 ────
--  한 행 = Owner 아래 하나의 Book 범위. Owner=프로젝트, Book=상품/교재.
CREATE TABLE IF NOT EXISTS allocations (
  id            BIGSERIAL PRIMARY KEY,
  customer_id   INT NOT NULL REFERENCES customers(id),   -- 업체(ACCOUNT)
  product       TEXT NOT NULL CHECK (product IN ('PDS2','PDS3')),  -- 물리 체계(PDS3≈N, PDS2≈G)
  code_type     TEXT CHECK (code_type IN ('N','G')),      -- 코드 종류(운영정책 §4, S 제외)
  pen_type      TEXT CHECK (pen_type IN ('Ncp','Ndp')),   -- 펜 구분(소리펜/필기펜) — 동일 SOBP라도 분리 관리
  section       INT  NOT NULL,
  owner         BIGINT NOT NULL,                          -- Owner = 프로젝트/제품라인
  project_name  TEXT,                                     -- Owner 이름(프로젝트명)
  book_start    INT NOT NULL, book_end INT NOT NULL,      -- Book = 상품(단일이면 start=end)
  page_start    INT NOT NULL, page_end INT NOT NULL,
  book_name     TEXT,                                     -- Book 이름(상품/교재명)
  usage_status  TEXT NOT NULL DEFAULT 'IN_USE'            -- 코드 상태: 모두 '할당됨'(예약/사용중 구분 폐기, PC-004). 필드는 레거시로 유지
                CHECK (usage_status IN ('RESERVED','IN_USE')),
  source        TEXT NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('AUTO','MANUAL','IMPORT')),
  is_deleted    BOOLEAN NOT NULL DEFAULT FALSE,           -- 레코드 수명주기(usage와 별개)
  ndp_issued_code_id BIGINT,
  issued_at     TIMESTAMPTZ,                              -- 발급일
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (book_start <= book_end AND page_start <= page_end),
  book_range    int4range GENERATED ALWAYS AS (int4range(book_start, book_end, '[]')) STORED,
  page_range    int4range GENERATED ALWAYS AS (int4range(page_start, page_end, '[]')) STORED
);
CREATE INDEX IF NOT EXISTS ix_alloc_space     ON allocations (product, section, owner, book_start);
CREATE INDEX IF NOT EXISTS ix_alloc_cust      ON allocations (customer_id);
CREATE INDEX IF NOT EXISTS ix_alloc_usage     ON allocations (usage_status);
CREATE INDEX IF NOT EXISTS ix_alloc_book_gist ON allocations USING gist (book_range);

-- 같은 (product,section,owner,펜)에서 할당된 Book×Page 사각영역 중복(이중 발급) 방지.
--  펜(Ncp/Ndp)이 다르면 동일 SOBP라도 겹침 아님(운영정책 §3). NULL 펜은 ''로 취급(보수적).
ALTER TABLE allocations DROP CONSTRAINT IF EXISTS alloc_no_overlap;
ALTER TABLE allocations ADD CONSTRAINT alloc_no_overlap
  EXCLUDE USING gist (
    product WITH =, section WITH =, owner WITH =,
    (COALESCE(pen_type, '')) WITH =,
    book_range WITH &&, page_range WITH &&
  ) WHERE (is_deleted = FALSE AND usage_status = 'IN_USE');

-- ── 티켓 (기간 + 페이지 limit) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
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
  status           TEXT NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('ISSUED','EXPIRED','REVOKED')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_ticket_cust ON tickets (customer_id);

-- ── 코드 요청/승인 워크플로우 ────────────────────────────────────
CREATE TABLE IF NOT EXISTS allocation_requests (
  id             BIGSERIAL PRIMARY KEY,
  customer_id    INT NOT NULL REFERENCES customers(id),
  product        TEXT NOT NULL,
  requested_pages INT NOT NULL,
  requested_section INT,
  mode           TEXT NOT NULL CHECK (mode IN ('AUTO','APPROVAL')),
  status         TEXT NOT NULL DEFAULT 'PENDING'
                 CHECK (status IN ('PENDING','APPROVED','REJECTED','ISSUED')),
  approver_id    TEXT,
  reject_reason  TEXT,
  result_allocation_id BIGINT REFERENCES allocations(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_req_status ON allocation_requests (status, created_at);

-- ── 내부 직원 계정 ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_users (
  id         TEXT PRIMARY KEY,                          -- 이메일 등
  name       TEXT,
  role       TEXT NOT NULL CHECK (role IN ('ADMIN','STAFF')),
  enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 내부 직원 활동 audit (외부 고객 활동은 대상 아님) ────────────
CREATE TABLE IF NOT EXISTS activity_log (
  id          BIGSERIAL PRIMARY KEY,
  actor_id    TEXT NOT NULL REFERENCES staff_users(id),
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   TEXT,
  detail      JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_log_actor ON activity_log (actor_id, created_at);
CREATE INDEX IF NOT EXISTS ix_log_time  ON activity_log (created_at);
