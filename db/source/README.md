# 원본 엑셀 보관 폴더

여기에 원본 엑셀(.xlsx)을 넣으면 import 스크립트가 자동으로 읽습니다.
(없으면 C:\Users\NeoLab\Downloads 를 대신 찾습니다)

| 파일 | 용도 | 생성물 |
|---|---|---|
| `2_New_NSP_Ncode_List.xlsx` | 편집(소리펜) 원장 · 코드구분(N/G)·SOBP·페이지·심볼 | `web/data/editing-data.json`, `web/data/seed-customers.json` |
| `(필기펜)NWP_Ncode_List.xlsx` | 오너코드 발급 리스트(예약/사용) | `web/data/ownership-data.json` |
| `Caster_계정_퍼미션_티켓.xlsx` | App Key(Caster) 계정 · 권한 · 티켓 대장 | `web/data/caster-ledger.json` |
| `261116_APP KEY 계정 정보.xlsx` | 계정별 티켓 · 코드 소유 고객사 매칭 — 한 계정 여러 고객사 · N Key 전용 계정 옮김 `PC-322` | `caster-ledger.json`(coRefs · movedToNKey) · `ticket-ledger.json`(No.62~68) |
| `nkey(HLP).xlsx` | N Key 발급 대장 | `web/data/ticket-ledger.json` |

## 재생성
```
python db/import/build_all_from_nsp.py        # 편집 + 코드 프로젝트 시드
python db/import/build_ownership_data.py "<필기펜 엑셀 경로>"
python db/import/build_caster_ledger.py       # App Key 대장 (먼저)
python db/import/build_ticket_ledger.py       # N Key 대장 (caster-ledger 의 movedToNKey 를 씀)
```
