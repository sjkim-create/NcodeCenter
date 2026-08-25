# NcodeCenter — SOBP 할당 (NDP 연동) 참조

> **성격**: 참조 문서. 코드를 쓰는 **서비스 클라이언트가 NDP로부터 SOBP를 할당받는 방법**을 정리한다.
> **정책 정본**: [운영 정책 §7](NcodeCenter-Operations-Policy.md) — 이 문서와 정책이 충돌하면 운영 정책이 우선.
> **앱 화면**: 없음 — 정책·참조 문서로만 관리(화면 미구현 결정, 2026-08-21).
> **원본**: Ncode Printer Driver — "NDP 로부터 SOBP 를 할당받는 방법" (PrinterDrivers 설계 문서, 2026-08 수령).
>
> ⚠️ **구현 상태 2층위**
> - ✅ **구현 완료**: NDP OAuth 인증 체인 (router discovery → 로그인 → token 자동 갱신) — 클라이언트(Companion 앱) 측
> - 📋 **설계 확정 / 스펙 미정**: SOBP 실시간 발급 API `/ncode/issue` — "서버 실시간 발급"은 확정, 엔드포인트 스펙 미정

---

## 1. SOBP 란

**SOBP = Section / Owner / Book / Page** — Ncode 페이지를 전역에서 유일하게 식별하는 page information.
펜이 종이의 도트 패턴을 읽으면 SOBP가 복원되고, 그 값으로 서버에 등록된 배경 문서와 필기가 매칭된다.

| 필드 | NcodeCenter (코드 관리) | Ncode 프린터 (실시간 발급) |
|---|---|---|
| **Section** | 판형(length)·코드 종류(N/G)로 결정되는 코드 풀 | 프린터 생성 문서 전용 코드 풀 |
| **Owner** | 고객사/프로젝트 식별 축 — **공유 불가**(운영 정책 §5) | NDP 리소스오너(고객사별 독립, 고보안 고객은 전용 S/O 범위) |
| **Book** | 상품·교재 1권 | 인쇄 문서 1건 (원본 문서 버전과 1:1 — 원본이 수정되면 새 Book) |
| **Page** | Book 내 페이지 (NcodeCenter 원장은 1-based) | 문서 내 페이지 순번 |

**핵심 원칙: SOBP는 서버(NDP) 중심으로 할당한다.** 클라이언트가 임의 생성하면 고객사·기기 간 충돌을 막을 수 없다.
→ NcodeCenter의 **무겹침**·**SO 공유 불가** 원칙과 동일한 근거.

---

## 2. 할당 경로 2가지

| 경로 | 주체 · 화면 | 쓰임 | 상태 |
|---|---|---|---|
| **A. 관리자 할당(블록 단위)** | 내부 직원 — `[SOBP 맵] ▸ 직접 코드 할당` | 고객사·프로젝트에 S/O/B/P 블록 배정 + **사용 서비스** 지정 | ✅ 구현됨 |
| **B. 실시간 서버 발급(페이지 단위)** | 서비스 클라이언트 — NDP `/ncode/issue` | 인쇄·생성 시점마다 페이지 수만큼 SOBP 즉시 발급 | 📋 설계 확정 · 스펙 미정 |

- 경로 B는 **사전 임베드 방식이 아니다** — 발급 시점에 서버가 미사용 Book을 골라 Page 1..N을 **연속 배정**한다.
- 경로 B로 나간 코드도 결국 "어느 고객사(Owner)의 것"인지 남아야 한다. 사용 서비스 항목은 **casterN · 폼솔루션 · 서비스없음 3종**이므로(PC-026), 프린터용 코드는 **서비스 없음(코드만 발급)** 으로 할당하고 용도는 프로젝트명·메모로 구분한다. (구 `NCODEPRINTER` 항목 폐지 — PC-019 대체)
- 두 경로는 배타가 아니다: **관리자가 A로 블록(코드 풀)을 잡아 주고, 클라이언트는 그 안에서 B로 소비**하는 구성이 기본.

---

## 3. 선행 조건 — NDP 인증 체인 ✅ (구현 완료)

SOBP 요청에는 NDP access token이 필요하다. 클라이언트(Companion 앱)가 WebCaster(nl-lib4-ndp)와 동일 프로토콜로 구현.

### 3.1 서비스 디스커버리 — Router에서 AUTH 서버 찾기

NDP는 고정 URL이 아니라 **Router를 통한 service discovery** 구조다.

```
GET /gateway/v2/server?applicationId=«id»&resourceOwnerId=«owner»
→ { resultElements: [ {type:"AUTH", url}, … ] }   // type == "AUTH" 의 url 을 이후 OAuth base 로 채택
```

- `applicationId` / `resourceOwnerId` 는 설정에 저장(기본 resourceOwnerId = WebCaster와 같은 `neolab`).
- OAuth client 자격증명은 빌드 시 생성기가 DEV DB에서 읽어 emit(시크릿 비커밋).

### 3.2 OAuth 2.0 Authorization Code 로그인

시스템 브라우저 + custom URL scheme 딥링크 방식.

```
/oauth/v2/authorize?client_id&response_type=code&scope&redirect_uri
→ 딥링크로 code 수신 → POST /oauth/v2/token (Basic client_id:client_secret)
→ { access_token, refresh_token, expires_in, userId }   // 로컬 암호화(DPAPI) 저장
```

- provider = `ndp` / `google` / `apple` — 흐름 동일, (client_id, client_secret) 쌍만 상이. 딥링크 대기 timeout 5분.

### 3.3 Token 수명 관리

발급 요청은 인쇄 시점마다 발생하므로 토큰은 항상 살아 있어야 한다.

- 만료 **5분 전 자동 refresh**(`grant_type=refresh_token`).
- refresh 실패/장기 오프라인 → 만료. refresh_token이 살아 있으면 silent refresh, 그것도 만료면 토큰 정리 후 재로그인.
- 로그아웃 = `POST /oauth/v2/revoke` + 로컬 삭제.
- access token은 이후 SOBP 발급·업로드 호출에 **Bearer**로 첨부.

---

## 4. SOBP 할당 흐름 📋 (설계 확정 — API 스펙 미정)

결정: **ncode 페이지 ID(SOBP)는 서버 실시간 발급.** 서버 API는 `/ncode/issue`(페이지 ID 발급) + `/documents/register`(업로드)로 계획, 스펙 확정 대기.

### 4.1 인쇄 잡 1건 end-to-end

| # | 단계 | 내용 |
|---|------|------|
| ① | 인쇄 요청 | 앱에서 Ncode 프린터로 인쇄 → 스풀러가 PDF 생성, 포트 모니터가 처리 폴더에 전달 |
| ② | 잡 준비 | 다이얼로그(모드·프린터·문서 메타) 확인 → 처리 코어 preflight로 **페이지 수 N**·크기·방향 확정 |
| ③ | SOBP 발급 요청 | `Authorization: Bearer «access_token»` + (owner · 문서 해시 · 페이지 수 · 메타) |
| ④ | 서버 배정 | 고객사 코드 풀에서 **미사용 Book 선택 → Page 1..N 연속 할당**(충돌 방지 = 서버 중앙 관리) → 이벤트 `sobp.allocated` |
| ⑤ | 배경 문서 등록 | 원본 PDF·배경·메타를 SOBP 매핑과 함께 업로드 → `paperhub.uploaded`. **등록 완료 전 인쇄 금지** |
| ⑥ | 코드 합성 | 받은 시작 SOBP로 도트 패턴 합성(페이지마다 Page 증가, 예 `5.1.123.1 → 5.1.123.N`) |
| ⑦ | 실제 출력 | 실프린터 출력 → 완료 화면에 사용된 SOBP 범위 표시 |

> 클라이언트 현황: 합성 CLI는 `--sobp «시작 SOBP» --advance perfile` 인자를 이미 받는 구조(기본값 `5.1.1.1`).
> 발급 API 확정 시 "할당 응답 → `--sobp`" 연결 코드가 추가된다.

### 4.2 실패 처리 — 어디서 멈추고 무엇을 살리나

"등록 안 된 Ncode 종이"가 세상에 나가는 것이 최악의 실패다. 따라서 게이트 순서가 중요하다.

| 실패 지점 | 정책 |
|---|---|
| 토큰 무효 | silent refresh → 실패 시 재로그인 유도(발급 진행 안 함) |
| SOBP 발급 실패 | **인쇄 중단.** 재시도 / 관리자에게 코드 재고(잔여 블록) 확인 요청 |
| 배경 문서 등록 실패 | **인쇄 중단(기본).** 등록 없는 Ncode 출력물은 필기 매칭 불가 |
| 실제 프린터 출력 실패 | 등록 유지 — **같은 SOBP로 재인쇄** |
| 발급됐지만 미사용된 SOBP | 회수(반납) 정책 **미정** — 협의 필요 (운영 정책 §7) |

### 4.3 오프라인 대비 — 사전 발급 블록

- 실시간 발급이 원칙이나, 오프라인 대비로 **블록 사전 확보**(예: Book k ~ k+m) 개념이 설계에 포함.
- 오프라인 인쇄는 그 블록에서 SOBP를 소비하고 로컬 큐에 등록 대기 → 재접속 시 **등록·사용량 서버 동기화**. 동기화 전까지 다른 기기에서 배경 조회 제한.
- ⚠️ **NcodeCenter 표기 주의**: 예약(RESERVED) **상태** 개념은 폐기(PC-004·PC-005). 사전 확보 블록도 원장에서는 **'할당됨(발급)'** 으로 기록하고, 별도 예약 상태를 만들지 않는다.

---

## 5. SOBP 재사용 · 버전 정책

"출력된 종이"와 "등록된 배경"이 정확히 일치해야 하므로 조건이 엄격하다. **기본값: 재사용 금지.**

| 상황 | 처리 |
|---|---|
| 원본 PDF 해시·페이지 수·크기·방향·배율 중 **하나라도 다름** | **새 Book(새 SOBP)** 로 등록, 이전 문서와 파생(derived_from) 연결 |
| 완전 동일본을 복수 출력 | 같은 SOBP 재사용 가능(단 여러 명이 같은 종이에 쓰면 필기 레이어 충돌) |
| 검토자별로 나눠 출력 | 검토자마다 다른 SOBP — 필기 레이어 독립 관리 |
| 일부 페이지만 재인쇄 | 기존 SOBP 유지(페이지 렌더링 해시 검증 필요) |

---

## 6. 연동 이벤트

| 이벤트 | 시점 | NcodeCenter 활용 |
|---|---|---|
| `printjob.created` | 인쇄 작업 생성 | — |
| `sobp.allocated` | **페이지별 SOBP 할당 완료** | 사용량 집계·활동 로그 반영 지점 |
| `paperhub.uploaded` | 배경 문서 등록 완료 | 등록률 관제 |
| `physical_print.completed` | 실제 인쇄 완료 | 실사용 확인 |

---

## 7. NcodeCenter 반영 매핑

| 항목 | 반영 위치 | 상태 |
|---|---|---|
| 사용 서비스 구분 | 전용 항목 **폐지**(PC-026) — 프린터용 코드는 `서비스 없음(코드만 발급)` 으로 할당 | 🟡 용도 구분 방법 재검토 필요 |
| Owner = 고객사 전용, SO 공유 불가 | 운영 정책 §5 · SOBP 맵 발급 규칙 | ✅ 기존 정책과 일치 |
| Book 내 Page 연속 배정 | 운영 정책 §1 · `web/lib/allocationEngine.ts` | ✅ 기존 정책과 일치 |
| 실시간 발급 API(`/ncode/issue`) 연동·원장 동기화 | NDP 위임 — 설계 필요 | 📋 스펙 대기 |
| 미사용 SOBP 회수 정책 | 운영 정책 §7 협의 항목 | 🟡 협의 필요 |
| 사전 확보 블록 표기 | 원장 '할당됨'으로 기록(예약 상태 없음) | ✅ PC-004·005 적용 |

---

## 8. 원본 소스 파일 맵 (클라이언트 측, 참고)

| 역할 | 파일 |
|---|---|
| Router service discovery | `PrinterDrivers/Windows/CompanionApp/Services/Auth/NdpConfigClient.cs` |
| OAuth 로그인 / refresh / revoke | `PrinterDrivers/Windows/CompanionApp/Services/Auth/NdpAuthService.cs` |
| Token 암호화 보관(DPAPI) | `PrinterDrivers/Windows/CompanionApp/Services/Auth/SecureTokenStore.cs` |
| NDP 설정(router · owner · appId) | `PrinterDrivers/Windows/CompanionApp/Services/AppSettings.cs` |
| 잡 처리(합성 → 저장 → 업로드 → 인쇄) | `PrinterDrivers/Windows/Core/JobProcessor.cs` |
| SOBP CLI 주입 지점 | `PatternGenCLI/CliArgs.cs` (`--sobp`, `--advance`) |

> 이 파일들은 **NcodeCenter 저장소 밖(PrinterDrivers)** 이다. NcodeCenter는 발급 결과의 **소유권·용도·규모**만 관리한다.
