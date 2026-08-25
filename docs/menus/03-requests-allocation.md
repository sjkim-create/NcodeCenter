# 메뉴 3 — 코드 요청/할당 (Requests / Allocation) ★

> ⚠️ **정책 변경(2026-08-03) — 예약(RESERVED) 폐기**: 본문의 **사전 예약(선점)·`RESERVED→IN_USE` 상태 전이** 서술은 **폐기**되었습니다. 코드는 발급 시 곧바로 **할당됨**(예약/사용중 구분 없음). 근거: [운영 정책 §0 Changelog](../NcodeCenter-Operations-Policy.md) PC-003~005.

> 상위: [구조 MD](../NcodeCenter-Structure.md) 메뉴 #3 · 역할 **전 역할(범위별)** · 요구사항 **#4·#5** · 신규(핵심)
> **정책 밀도 최고** — [운영 정책](../NcodeCenter-Operations-Policy.md) §1·3·4·5 집중 반영.
> 관련: [DB 구조](../NcodeCenter-DB.md) · 엔진 `web/lib/allocationEngine.ts`

---

## 1. 목적

**내부 직원이** 등록된 업체/프로젝트에 코드를 할당한다. (외부 고객이 직접 요청하지 않음) **폼솔루션**은 직원이 등급별 코드 **풀을 미리 할당**하고, **end-user가 등급을 선택하면 풀에서 자동 배정**된다. 모든 할당은 운영 정책(무겹침·SO 미공유·연속성·코드종류·펜구분)을 지킨다.

---

## 2. 할당 방식 (서비스 유형별)

| 서비스 유형 | 할당 방식 |
|-------------|-----------|
| **편집툴(casterN)** | 직원이 **직접 할당**(주로 사전 예약 범위) |
| **아이글·기타 코드전용** | 직원이 **직접 할당**(프로젝트별) |
| **폼솔루션** | 직원이 **등급별 SO·코드양 풀 미리 할당(선점)** → **end-user 등급 선택 시 풀에서 자동 배정** |

- 등급·풀 상한은 [설정]/`grade_so` 관리. 폼솔루션 end-user 자동 배정은 등급 상한 내에서.

---

## 3. 정책 반영 (핵심)

### 3.1 (정책 §1) 연속성 — book 분리, 서비스별 분기
- 자동 할당 기본: **연속 우선 → 부족 시 book 분리, book 내 page 연속**(조각 병합 금지).
- **무겹침(최우선)**: 기존 할당과 절대 겹치지 않음(엔진 + DB EXCLUDE 제약).
- **서비스별 연속성 요건 분기**(요청/대상 앱 기준):
  - **CasterN** → 연속 불필요 → **떨어진 page 허용**(효율↑).
  - **NeoStudio2** → **book 종속** → book 내 page 연속(기본).
  - **외부 업체 제공** → 그 업체 개발물이 떨어진 코드를 읽을 수 있는지에 따라.
- 구현: 엔진 옵션 **`pageContiguityRequired`** (true=book 연속 기본 / false=CasterN 등 조각 허용).

### 3.2 (정책 §3) Owner 고정 + 등급별 SO 차등
- 자동 대상 서비스는 **전용 owner 고정** 안에서 배정. (owner 고정 ≠ 사전 예약)
- **등급마다 SO(Section–Owner) 다르게**:

  | 등급 | 규모 | SO |
  |------|------|----|
  | a | 1,000p | SO – S 0 |
  | b | 100p | SO – S 3 |

- **폼솔루션은 등급별로 S를 둘 다** 가질 수 있게(개발 확인 필요). page 규모에 따라 사용 **OBP 배정**.
- **사전 예약(선점)**: B2B/연구/소리펜 고객사용으로 미리 확보(소리펜·팝펜 혼용 방지). 상태 `RESERVED`.
- **펜 혼용**: 동일 SOBP라도 **Ncp(소리펜)/Ndp(필기펜) 분리 관리** — 요청 시 펜 구분 지정.

### 3.3 (정책 §4) 코드 종류 N/G
- 요청 시 코드 종류 결정(고객/용도 기준): **해외 N · 국내 소리펜 G · 국내 소리+필기 N**. (S코드 제외)
- 신규/편집 할당은 **편집 파트 참여** 하에 진행(안전).

### 3.4 (정책 §5) SO 공유 불가
- **Section·Owner는 프로젝트/고객사 식별 축** → 다른 프로젝트가 같은 SO 재활용 금지.
- 빈 공간이 남아도 **새 프로젝트는 새 SO**로 배정(자동 할당은 전용 owner 내, 예약은 별도 SO).

---

## 4. 화면 흐름

```
[내부 직원] 업체/프로젝트 선택 → 코드 할당(코드종류 N/G · 펜 Ncp/Ndp · 페이지수 · 대상앱)
     ├─ 편집툴·아이글·기타 → allocationEngine(연속성 플래그) → 미리보기 → 발급(IN_USE)
     └─ 폼솔루션 → 등급별 SO·코드양 풀 미리 할당(RESERVED)
                              │
                              ▼
[폼솔루션 end-user] (폼솔루션 서비스 내) 등급 선택
     → 풀에서 등급 상한 내 자동 배정(RESERVED→IN_USE)
     
공통: 무겹침/SO미공유 검증 · 모든 직원 행위 활동 로그 기록
```

- 직원 발급/end-user 배정 시점에 상태 전이: `RESERVED(선점) → IN_USE(사용중)`.

---

## 5. 입력 / 필드

| 필드 | 설명 |
|------|------|
| 고객(업체) | ACCOUNT |
| 서비스 유형 | 폼솔루션 / casterN / (기타) |
| 대상 앱 | CasterN / NeoStudio2 / 외부업체 → **연속성 요건 결정** |
| 코드 종류 | N / G |
| 펜 구분 | Ncp(소리펜) / Ndp(필기펜) |
| 요청 페이지 수 | 양 게이트 판정 |
| (등급) | 자동 SO·상한 결정 |

---

## 6. 자동 연속 할당 미리보기

- 엔진 `allocate(grids, occupied, N, opts)` — 전용 owner 격자 − 기존 할당 = 빈 구간 계산.
- `opts.pageContiguityRequired`: 대상 앱으로 결정(CasterN=false, NeoStudio2/기본=true).
- 결과: 연속 1구간 or book 분리 다구간(각 book page 연속) / 조각 허용 시 page 분리.
- 미리보기 → 확정 발급(`ISSUED`, allocations `usage_status='IN_USE'`).
- 프로토타입: `docs/prototypes/allocation-preview.html`(로직 데모).

---

## 7. 정책 반영 / 확인 ([운영 정책](../NcodeCenter-Operations-Policy.md))

- [x] **무겹침** — 엔진 + DB EXCLUDE(IN_USE)
- [x] **SO 공유 불가** — 자동=전용 owner, 신규=새 SO
- [x] **연속성 book 단위 + 서비스 분기** — `pageContiguityRequired` 플래그
- [x] **코드 종류 N/G** — 요청 필드(해외 N·국내 소리펜 G·국내 소리+필기 N)
- [x] **펜 구분 Ncp/Ndp** — 요청 필드, 동일 SOBP 분리 관리
- [x] **등급별 SO 차등 · 사전 예약(선점)** — 자동 SO 매핑 + RESERVED
- [ ] **Owner 발급 이원화**(소규모=NeoStudio2 book 흡수) — 임계 물량 정의 필요

---

## 8. 데이터 / DB

- `allocation_requests`(요청/승인), `allocations`(발급 결과, `usage_status=IN_USE`), `owner_pins`(전용 owner), `grade_so`(등급별 SO, 예정), `code_type/pen_type`(예정).
- [DB 구조](../NcodeCenter-DB.md).

---

## 9. 미결정 / 협의 필요

- [ ] 폼솔루션 **등급별 S 둘 다** 개발 가능 여부(개발팀)
- [ ] 서비스별 **연속성 분기** 최종 규칙(CasterN/NeoStudio2/외부)
- [ ] **편집 신규 할당** 프로세스(편집 파트)
- [ ] **소규모 흡수 임계 물량**(별도 owner vs NeoStudio2 book)
