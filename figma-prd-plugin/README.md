# PRD Sync — Figma Plugin

GitHub의 PRD 마크다운을 읽어서 Figma 프레임 옆에 설명 레이어를 자동 생성한다.

원본: `neostudio-team/product-docs` → `figma-prd-plugin`
이 폴더는 NcodeCenter에서 바로 쓰려고 복사해 둔 것이다. 원본이 바뀌면 다시 복사한다.

## 설치 (최초 1회)

1. **Figma Desktop** 앱 실행 — 웹 버전에서는 로컬 플러그인을 못 올린다.
2. **Plugins** → **Development** → **Import plugin from manifest...**
3. 이 폴더의 `manifest.json` 선택

등록 후에는 **Plugins** → **Development** → **PRD Sync** 로 실행한다.

## 설정 (최초 1회)

플러그인 실행 → **설정** 탭.

1. **GitHub Token** 입력 → **연결**
   - Personal Access Token (classic) 기준 `repo` 스코프가 필요하다. NcodeCenter가 private이라 public-only 토큰으로는 안 된다.
   - 토큰은 Figma `clientStorage`에 저장되므로 이 PC의 Figma에만 남는다.
2. **저장소**: `sjkim-create/NcodeCenter`
3. **브랜치**: `main`
4. **PRD 경로**: `docs/figma/prd`
5. **설정 저장**

> 플러그인은 GitHub API에서 읽으므로 **push된 내용** 기준이다.
> 로컬에서 PRD를 고쳤다면 커밋·푸시한 뒤 플러그인을 다시 실행해야 반영된다.

## 사용

| 버튼 | 동작 |
| --- | --- |
| PRD 추가 (선택 프레임) | 선택한 프레임에만 |
| PRD 추가 (현재 페이지) | 현재 페이지 최상위 프레임 전체 |
| PRD 추가 (모든 페이지) | 파일 전체 |
| PRD 삭제 (현재 페이지 / 모든 페이지) | 생성된 설명 레이어 일괄 삭제 |

각 프레임 기준으로:
- **오른쪽** — 해당 상태의 `## 3. 상태별 변화` 내용
- **왼쪽** — 그 화면의 첫 상태(S01) 프레임에만 `## 2. 화면 구성` 내용

## 프레임 이름 규칙

```
DSH-01:S01 기본 · 데이터 정상
 └───┘ └─┘
 화면ID 상태ID
```

- `[DSH-01:S01] …`, `DSH-01: S01 …` 형태도 인식한다.
- 상태 번호는 **두 자리**(`S01`). 상태 매칭이 부분 일치라 `S1` 로 두면 `S10`~`S17` 이 함께 걸린다.

전체 프레임 이름 목록은 [docs/figma/prd/FRAME-NAMES.md](../docs/figma/prd/FRAME-NAMES.md) 참고.

## 현재 등록된 화면 (19종)

`PRD-00` 공통 · `DSH-01` · `INF-01` · `LOG-01` · `MEM-01` · `MEM-02` · `INF-04` ·
`PRJ-01` · `PRJ-02` · `PRJ-03` · `PRJ-04` · `PRJ-06` · `SOB-01` · `SOB-02` ·
`TKT-04` · `TKT-01` · `TKT-03` · `TKT-02`

매칭 기준은 PRD 본문의 `**화면 ID**: DSH-01` 선언이다. 파일명이 아니다.
`FRAME-NAMES.md` 는 이 선언이 없어 자동으로 무시된다.

## 파일 구조

```
figma-prd-plugin/
├── manifest.json   # 플러그인 설정 (networkAccess: api.github.com)
├── code.js         # Figma 캔버스 로직 — 레이어 생성·배치·삭제
└── ui.html         # 패널 UI + GitHub API + 마크다운 파싱
```

## 잘 안 될 때

- **"처리할 화면 ID가 있는 프레임이 없습니다"** — 프레임 이름에 `DSH-01` 같은 ID가 없다. 최상위 프레임만 훑으므로 그룹 안에 있으면 안 잡힌다.
- **"매칭된 섹션 없음"** — 프레임의 상태 ID가 PRD의 `### DSH-01: S01 …` 헤딩과 안 맞는다.
- **연결 실패 / 404** — 토큰 스코프(`repo`) 또는 PRD 경로 확인.
- 폰트는 `Noto Sans KR`(Bold/Regular)과 `Noto Sans`(SemiBold)를 쓴다. 설치돼 있어야 한다.
