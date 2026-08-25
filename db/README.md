# NcodeCenter DB (Vercel + Postgres)

NcodeCenter 자체 데이터 계층. 설계 배경은 [`../docs/NcodeCenter-DB-Design.md`](../docs/NcodeCenter-DB-Design.md).

```
db/
├── migrations/
│   └── 0001_init.sql          # 전체 스키마 (테이블·인덱스·중복방지 제약)
└── seed/
    └── 0001_sections_dim.sql  # N코드 정보표 참조 데이터(Section×제품 max·length)
```

## 사전 준비 — 시크릿은 .env로 (채팅/커밋 금지)

Vercel Postgres / Neon / Supabase에서 발급한 연결 문자열을 **환경변수**로만 둔다.

```bash
# .env (반드시 .gitignore 에 포함, 커밋 금지)
POSTGRES_URL="postgres://USER:PASSWORD@HOST/DB?sslmode=require"
```

> 토큰/비밀번호를 채팅에 붙여넣거나 소스에 하드코딩하지 말 것. Vercel은 `vercel env pull`로 `.env.local`을 받을 수 있다.

## 실행

```bash
# 1) 스키마
psql "$POSTGRES_URL" -f db/migrations/0001_init.sql
# 2) 참조 데이터 시드
psql "$POSTGRES_URL" -f db/seed/0001_sections_dim.sql
```

Vercel Postgres 대시보드의 Query 탭이나 Neon/Supabase SQL 편집기에 파일 내용을 붙여넣어 실행해도 된다.

## 검증 (연결 후)

```sql
-- 테이블 생성 확인
SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1;
-- 시드 확인 (10행: PDS3 7 + PDS2 3)
SELECT product, count(*) FROM sections_dim GROUP BY product;
-- 중복방지 제약 동작 확인(같은 SOBP 사각영역 겹침 insert 시 에러여야 정상)
```

## 요구사항

- PostgreSQL 12+ (생성열 `GENERATED ALWAYS AS ... STORED`, `int4range`).
- `btree_gist` 확장 — `0001_init.sql`에서 `CREATE EXTENSION IF NOT EXISTS btree_gist;` 로 활성화(중복방지 EXCLUDE 제약에 필요). Vercel Postgres/Neon/Supabase 모두 지원.

## 참고 / 다음 단계

- 로컬에 psql/도커가 없어 **라이브 DB 검증은 미실행** 상태(표준 Postgres 문법으로 작성). DB 프로비저닝 후 위 검증 쿼리로 확인.
- 다음: `grades`/데모 `customers` seed → CSV → `allocations` import 스크립트 → 프로토타입 대시보드를 이 DB에 연결.
