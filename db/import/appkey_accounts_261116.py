# -*- coding: utf-8 -*-
"""261116 App Key 계정 정보(계정별 티켓 · 코드 소유 고객사 매칭) — 두 대장 빌드가 함께 쓴다  `PC-323`

원본: db/source/261116_APP KEY 계정 정보.xlsx  시트 「계정별 티켓」
  열: 계정 | 고객사 | 티켓타입 | 티켓영역(S O B) | 만료일 | 오너코드 발급 리스트 매칭 목록 | 구분
  · 계정이 빈 행 = 위 계정의 티켓이 이어진다
  · 「매칭 목록」 = 그 티켓 코드를 가진 고객사(NcodeCenter 고객사 「이름-오너」로 찾는다)
  · 「구분」 = DB 제외 · 삭제 등 — 이 행은 연결에 쓰지 않는다

쓰는 곳
  · build_caster_ledger.py : N Key 만 받은 계정(NKEY_ONLY)은 App Key 대장에서 빼고,
                             나머지 계정은 티켓마다 코드 소유 고객사(coRef)를 달아 여러 고객사에 잇는다
  · build_ticket_ledger.py : NKEY_ONLY 계정의 티켓을 N Key 대장에 더한다
"""
import os
import re

import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "source", "261116_APP KEY 계정 정보.xlsx")

# 확인 결과(2026-11-16) — Caster 사용에 필요한 N Key 만 받았고 SDK 를 쓰지 않아 App Key 발급 이력이 없다
#   → App Key 관리에서 빼고 N Key 관리에 더한다 `PC-323`
NKEY_ONLY = {
    "edupresso@gmail.com", "neotest@neolab.net", "sb.son@funcrews.com", "sungkyu.chun@mackerly.com",
    "tuan.pham@iuedu.vn", "vsritharan@scholastic.asia", "yeonwoong.jo@nhnedu.com",
}
NKEY_ONLY_NOTE = "Caster 사용에 필요한 N Key 만 발급 · SDK 미사용으로 App Key 발급 이력 없음(2026-11-16 확인) — App Key 대장에서 옮김"
SKIP_GUBUN = ("DB 제외", "삭제")


def _cell(v):
    if v is None:
        return ""
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v).strip()


def _span(tok, key):
    """'O300-301' → (300, 301) · 'B0' → (0, 0)"""
    m = re.search(key + r"\s*(\d+)(?:\s*-\s*(\d+))?", tok)
    if not m:
        return None, None
    a = int(m.group(1))
    return a, int(m.group(2)) if m.group(2) else a


def parse_area(txt):
    s0, _ = _span(txt, "S")
    o0, o1 = _span(txt, "O")
    b0, b1 = _span(txt, "B")
    if s0 is None or o0 is None:
        return None
    return {"section": s0, "owner": o0, "ownerEnd": o1 if o1 != o0 else None, "bookStart": b0, "bookEnd": b1}


def match_name(v):
    """매칭 목록 → 고객사 이름(없으면 '') — 「미입력 고객사 ==> X」 는 X, 괄호 설명은 뺀다"""
    s = _cell(v)
    if "==>" in s:
        s = s.split("==>", 1)[1]
    s = re.sub(r"\((?:고객사|추가)[^)]*\)", "", s).strip()   # 「(고객사 추가 등록)」 같은 설명만 뺀다 — (주) 는 둔다
    if not s or s in ("미입력 고객사", "전 범위 할당", "퇴사자 계정"):
        return ""
    return s


def rows():
    """[{id, company, pt, area, until, match, gubun}] — 계정이 빈 행은 위 계정으로 채운다"""
    wb = openpyxl.load_workbook(SRC, data_only=True)
    ws = wb.worksheets[0]
    out, cur_id, cur_co = [], "", ""
    for r in ws.iter_rows(min_row=2, values_only=True):
        r = list(r) + [None] * 8
        if _cell(r[0]):
            cur_id, cur_co = _cell(r[0]), _cell(r[1])
        if not cur_id:
            continue
        area = parse_area(_cell(r[3])) if _cell(r[3]) else None
        until = ""
        if r[4] is not None:
            try:
                until = r[4].date().isoformat()
            except Exception:
                until = _cell(r[4])[:10]
        out.append({"id": cur_id, "company": cur_co, "pt": _cell(r[2]), "area": area,
                    "until": "무제한" if until.startswith("2099") else until,
                    "match": match_name(r[5]), "gubun": _cell(r[6])})
    return out


def resolve_company(companies, name, section, owner):
    """매칭 이름 + Section · Owner → 고객사 관리 고객사 — 「이름-S-O」 → 「이름-O」 → 이름 그대로"""
    if not name:
        return None
    norm = lambda s: re.sub(r"[\s()（）\-_.,]", "", str(s or "").lower())
    for want in (f"{name}-{section}-{owner}", f"{name}-{owner}"):
        hit = next((c for c in companies if norm(c["name"]) == norm(want)), None)
        if hit:
            return hit
    return next((c for c in companies if norm(c["name"]) == norm(name)), None)
