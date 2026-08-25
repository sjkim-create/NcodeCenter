# 원본 엑셀 보관 폴더

여기에 원본 엑셀(.xlsx)을 넣으면 import 스크립트가 자동으로 읽습니다.
(없으면 C:\Users\NeoLab\Downloads 를 대신 찾습니다)

| 파일 | 용도 | 생성물 |
|---|---|---|
| `2_New_NSP_Ncode_List.xlsx` | 편집(소리펜) 원장 · 코드구분(N/G)·SOBP·페이지·심볼 | `web/data/editing-data.json`, `web/data/seed-customers.json` |
| `(필기펜)NWP_Ncode_List.xlsx` | 오너코드 발급 리스트(예약/사용) | `web/data/ownership-data.json` |

## 재생성
```
python db/import/build_all_from_nsp.py        # 편집 + 코드 프로젝트 시드
python db/import/build_ownership_data.py "<필기펜 엑셀 경로>"
```
