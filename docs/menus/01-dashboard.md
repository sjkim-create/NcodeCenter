# 메뉴 1 — 대시보드 (Dashboard)

> ⚠️ **정책 변경(2026-08-03) — 예약(RESERVED) 폐기**: 아래 **예약(선점) vs 사용중** 상태 구분·필터·빗금·KPI(§4 등) 서술은 **폐기**되었습니다. 코드 상태는 **할당됨 / 미발급**이며, 현재 대시보드는 할당 규모(레코드·업체·Book·섹션) 중심입니다. 근거: [운영 정책 §0 Changelog](../NcodeCenter-Operations-Policy.md) PC-004·005.

> 상위: [구조 MD](../NcodeCenter-Structure.md) 메뉴 #1 · 역할 **Staff/Admin** · 요구사항 **#2** · 신규
> 관련: [DB 구조](../NcodeCenter-DB.md) · [데이터](../data/NcodeCenter-Dashboard-Data.md)

---

## 1. 목적

Ncode가 **어디에(Section/Owner/Book/Page) · 얼마나(사용/예약/잔여) · 누가(업체=ACCOUNT) 소유**했고, **내부 직원이 무엇을 했는지**를 한 화면에서 파악한다. 특히 **미리 잡아만 둔 예약(선점)인지, 실제 사용중인지**를 구분해 보여주는 것이 핵심.

---

## 2. 화면 구성 (위젯)

| # | 위젯 | 목적 | 상태 |
|--:|------|------|------|
| 2.1 | **Ncode 소유권 맵** | Section×Owner 소유·예약/사용중·잔여 | ✅ 구현 |
| 2.2 | **고객(ACCOUNT)별 점유 분석** | 업체별 owner/book 점유 순위 | ✅ 구현 |
| 2.3 | **SOBP 사용현황 드릴다운** | Section→Owner→Book→Page used/total/avail | 🟡 프로토타입(HTML) → React 이관 |
| 2.4 | **할당현황 추이** | 오늘/이달/최근1년 할당량·분포 | ⬜ 예정(DB 연동) |
| 2.5 | **직원 활동 요약 + 승인 대기** | 최근 활동 + 대기 건수 알림 | ⬜ 예정 |

레이아웃: 상단 툴바(필터) → 좌: 소유권 맵(넓게) · 우: 점유 분석 → 하단: 추이/활동(예정).

---

## 3. 위젯별 상세

### 2.1 Ncode 소유권 맵 ✅
- **축**: Section(행) × **Owner**(열, 격자 최대 120버킷).
- **색**: **ACCOUNT(업체)** 별(골든앵글 색상).
- **상태 구분(핵심)**: **사용중=solid / 예약(선점)=빗금 패턴**. 상태 필터(전체 / 사용중 / 예약).
- **제품 필터**: PDS3(Ncode) / PDS2(Gcode) / MIXED / UNKNOWN.
- **고객 필터**: 특정 ACCOUNT 선택 시 해당 소유만 강조(나머지 흐리게).
- **레거시 표기**: 정보표 밖 Section(1·44)은 `레거시` 배지. owner가 정보표 max 초과 시 `범위초과`.
- **Section별 헤더**: `owner 0~max · 소유 N (사용중 x · 예약 y) / 전체 · 잔여`. 잔여는 정보표 섹션만(레거시는 미확인).
- **공유 owner 배너**: 한 Owner를 여러 프로젝트가 Book 단위로 나눠 쓰는 경우 정보 표시(충돌 아님).
- **툴팁(셀)**: owner 범위 · 소유 ACCOUNT · 상태 · 제품.
- **데이터**: `web/data/ownership-data.json` (빌더 `db/import/build_ownership_data.py`, XLSX 마스터+상세 병합).
- **구현**: `web/app/ownership/page.tsx` + `web/components/OwnershipDashboard.tsx`.

### 2.2 고객(ACCOUNT)별 점유 분석 ✅
- 각 업체가 소유한 **owner 수·book 수** 순위 막대. **필터와 무관하게 항상** 표시(제품/상태 필터는 반영).
- 막대 클릭 → 해당 ACCOUNT로 필터/해제(맵과 연동).
- KPI: ACCOUNT 수 · 사용중 owner · 예약 owner · (선택 시) 해당 업체 owner/book.

### 2.3 SOBP 사용현황 드릴다운 🟡
- **연계 드릴다운**: Section 선택 → Owner 축 → Book 축 → Page 축. 각 레벨 **used / total / available** 숫자+막대.
- 상위 선택이 하위 사용량으로 연계(그래프만으로 사용/가용 확인).
- **현재**: 프로토타입 `docs/prototypes/ncode-usage-drilldown.html`(목데이터).
- **TODO**: 상세시트 **book-level 파싱(형식별 어댑터)** 로 실데이터화 + React 이관.

### 2.4 할당현황 추이 ⬜
- **오늘 / 이달 / 최근 1년** 할당 페이지·티켓 수(추이).
- 분포: 회사·Section·제품(PDS2/3)·등급별.
- **데이터**: NcodeCenter DB `allocations`/`tickets` 집계(`created_at` 기준).

### 2.5 직원 활동 요약 + 승인 대기 ⬜
- 최근 내부 직원 활동 요약(→ 메뉴 9 활동 로그로 연결).
- 승인 대기(가입/코드 요청) 건수 배지.
- **데이터**: `activity_log`, `allocation_requests(status=PENDING)`, `customers(status=PENDING)`.

---

## 4. 상태 정의 — 예약(선점) vs 사용중 (요구 반영)

| status | 의미 | 출처 | 표기 |
|--------|------|------|------|
| **RESERVED** | 예약·선점 (B2B 선할당, 보유/타처 활용, 상세 없음) | 마스터 등록부 전용 | 빗금 패턴 |
| **ACTIVE** | 사용중 (book/page 발급내역 있음) | 상세시트 존재 | solid |

> NcodeCenter의 목적 중 하나 = "미리 할당만 해둔 건지, 실제 사용중인지" 확인. 대시보드에서 **상태 필터·시각 구분·KPI**로 제공. (현재 스냅샷: 예약 243 / 사용중 36)

---

## 5. 데이터 소스

- **현재(소유권·점유)**: `web/data/ownership-data.json` ← XLSX(마스터 + 상세시트) 병합. 상세: [데이터 MD](../data/NcodeCenter-Dashboard-Data.md).
- **향후(추이·활동·집계)**: NcodeCenter **Postgres** — `allocations(status)`, `tickets`, `activity_log`, `allocation_requests`. [DB 구조](../NcodeCenter-DB.md).

---

## 6. 구현 현황 / 남은 작업

- ✅ **구현**: 소유권 맵(상태·제품·고객 필터), 고객별 점유 — `web/app/ownership`.
- 🟡 **프로토타입**: SOBP 드릴다운(HTML, 목데이터).
- ⬜ **예정**:
  1. 드릴다운 실데이터화(상세시트 book-level 파싱) + React 이관
  2. 할당현황 추이·분포(DB 집계)
  3. 직원 활동 요약 + 승인 대기 알림
  4. 대시보드 홈(`/`)에 위젯 통합 배치

---

## 7. 정책 반영 / 확인 ([운영 정책](../NcodeCenter-Operations-Policy.md))

> 대시보드는 조회 화면이므로 아래 항목을 **표시·구분** 관점에서 반영/확인한다.

- [x] **예약(RESERVED) vs 사용중(IN_USE)** 상태 구분·필터 (빗금/솔리드)
- [x] **SO 공유 불가** 원칙 — 공유 owner는 지양 대상으로 **정보 표기**(배너)
- [ ] **코드 종류(N/G)** 표시 — 제품 필터 PDS2/3(≈G/N). (S코드 제외)
- [ ] **펜 구분(Ncp/Ndp)** 표시 — 동일 SOBP의 소리펜/필기펜 분리 관리 시각화(데이터 확보 후)
- [ ] 등급별 SO 차등·사전 예약 용도(B2B/연구/소리펜) 참고 표기

## 8. 미결정 / 확인 필요

- UNKNOWN 제품(246 owner, 상세시트 없는 레거시) 표시 방식 — 별도 색/그룹?
- 추이 위젯의 기간 기준(발급일 vs 등록일), 등급 필터 필요 여부.
- 소유권 맵과 드릴다운을 한 화면에 합칠지, 탭으로 나눌지.
