# -*- coding: utf-8 -*-
"""TKT-06 N Key 불러오기 — 실제 화면 구조 그대로.

TKT-03 Key 관리 도구 막대의 [📂 N Key 불러오기] 로 열리는 창.
내려받은 키 파일(.json)을 읽어 항목을 Key·Value 표로 보여준다. 조회 전용이며
발급 원장에 없는 외부 파일도 연다. 배경은 TKT-03 목록이 그대로 깔린다.
"""
from shell import page, frame
import p_tkt04 as key                      # 배경으로 쓸 TKT-03 목록

CODE, NAME = 'TKT-06', 'N Key 불러오기'
PRD = 'docs/prd/TKT-06_N Key 불러오기.md'

FNAME = 'Ticket_웅진씽크빅_S3O17_B400-499.json'
ROWS = (('CompanyName', '웅진씽크빅'), ('IssuedTime', '20260827'),
        ('ValidUntilTime', '99999999 (무제한)'), ('Section', '3'), ('Owner', '17'),
        ('TicketVersion', '1'), ('BookStart', '400'), ('BookVolume', '100'),
        ('PageStart', '1'), ('PageVolume', '4096'), ('PatternType', 'PDS2'),
        ('TicketType', 'Unlimited'), ('SeparateEachBook', 'N (1개 티켓 병합)'))


def modal(rows=None, q='', err=False, empty_msg=None):
    rows = ROWS if rows is None else rows
    n = len(rows)
    if rows:
        body = ('<table><tr><th style="width:240px">Key</th><th>Value</th></tr>'
                + ''.join('<tr><td style="font-family:ui-monospace,monospace;'
                          'font-weight:600;color:#374151">%s</td>'
                          '<td style="color:#111827">%s</td></tr>' % kv for kv in rows)
                + '</table>')
    else:
        body = ('<div style="padding:24px;text-align:center;color:#9ca3af;font-size:12.5px">'
                '%s</div>' % (empty_msg or '표시할 항목이 없습니다.'))
    sub = ('<div style="background:#f5f9ff;border:1px solid #bfdbfe;border-radius:9px;'
           'padding:9px 12px;font-size:12.5px;color:#1e3a8a;margin-bottom:12px">%s</div>'
           % FNAME)
    errbox = ''
    if err:
        errbox = ('<div style="background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;'
                  'border-radius:8px;padding:9px 11px;font-size:12.5px;margin-bottom:10px">'
                  '⚠ JSON 형식의 티켓 파일이 아닙니다. Key 생성으로 내려받은 .json 파일을 '
                  '선택하세요.</div>')
    srch = ('<div class="inp%s" style="width:150px">%s</div>'
            % ('' if q else ' ph', q or '항목 검색'))
    cap = ('<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">'
           '<div style="font-size:12px;color:#6b7280">Key Info '
           '<span style="color:#9ca3af">· %d개 항목 (불러온 파일)</span></div>'
           '<span style="flex:1"></span>%s</div>' % (n, srch))
    return ('<div class="ovl"><div class="mdl w" style="width:720px">'
            '<div class="mh"><div class="mt">N Key 불러오기</div>'
            '<div class="mx">✕</div></div>%s%s%s'
            '<div style="border:1px solid #eef0f4;border-radius:9px;overflow:hidden;'
            'max-height:420px">%s</div>'
            '<div class="mf"><div class="btn gho">표 복사</div>'
            '<div class="btn pri">닫기</div></div></div></div>'
            % (sub, errbox, cap, body))


def F(overlay):
    """배경은 TKT-03 Key 관리 목록"""
    return frame('TKT-03', 'Key 관리', key.content(), height=980, overlay=overlay)


NAV = [('[닫기] · ✕', '클릭', '<code>TKT-03</code>', '목록의 필터·페이지 상태는 유지된다'),
       ('원장 건의 항목', '조회', '<code>TKT-05</code>', '발급 상세의 Key 정보 — 이 창과 별개'),
       ('파일 만들기', '—', '<code>TKT-04</code>', 'N Key 발급에서 내려받는다')]


def build():
    B = []

    B.append((
        'S1', '불러오기 완료 — 항목 표시', '기본',
        '<code>TKT-03</code> 도구 막대의 <b>[📂 N Key 불러오기]</b> 로 파일을 고르면 '
        '내용을 읽어 <b>Key · Value 2열</b>로 보여준다. 어떤 파일을 보고 있는지 '
        '<b>파일명이 위에 고정</b>된다. <b>발급 원장에 없는 외부 파일도 열 수 있다.</b> '
        '조회 전용이며 파일을 고쳐 저장하지 않는다.',
        F(modal()),
        [('[📂 N Key 불러오기]', '클릭', '파일 선택 창', '`.json` 대상'),
         ('파일명', '표시', '—', FNAME),
         ('항목 수', '표시', '—', '<b>13개 항목 (불러온 파일)</b>'),
         ('표', '조회', 'Key · Value', '파일에 든 항목을 <b>그대로</b> 나열'),
         ('중첩 값', '표시', '펼침', '한 줄씩 풀어서 보여준다'),
         ('같은 파일 재선택', '가능', '—', '파일을 고친 뒤 다시 확인할 수 있다'),
         ('[표 복사]', '클릭', '복사', '<b>현재 표시 중인</b> 항목')] + NAV))

    B.append((
        'S2', '항목 검색', '필터',
        '검색어로 표를 거른다. <b>항목명과 값을 함께</b> 찾는다. '
        '항목 수도 걸러진 개수로 함께 줄어들고, <b>[표 복사]</b> 는 걸러진 것만 복사한다.',
        F(modal(rows=(('BookStart', '400'), ('BookVolume', '100'),
                      ('SeparateEachBook', 'N (1개 티켓 병합)')), q='book')),
        [('항목 검색', '입력', '표 필터', '항목명 + 값'),
         ('항목 수', '자동', '재계산', '<b>3개 항목 (불러온 파일)</b>'),
         ('[표 복사]', '클릭', '걸러진 것만', '표시 중인 항목 기준'),
         ('검색어 지움', '—', '전체 복귀', '13개 항목으로 돌아온다')]))

    B.append((
        'S3', '검색 결과 없음', '빈 상태',
        '검색어에 맞는 항목이 없으면 표에 안내만 남는다. 검색어를 지우면 전체가 돌아온다. '
        '불러온 파일 자체는 그대로 유지된다.',
        F(modal(rows=(), q='owner999',
                empty_msg='"owner999" 에 맞는 항목이 없습니다.')),
        [('표', '표시', '—', '<b>"owner999" 에 맞는 항목이 없습니다.</b>'),
         ('파일명', '표시', '유지', '불러온 파일은 그대로'),
         ('검색어 지움', '—', '전체 복귀', '')]))

    B.append((
        'S4', '형식 오류', '검증',
        'JSON 으로 읽을 수 없는 파일을 고르면 오류 안내와 함께 <b>빈 표</b>가 남는다. '
        '<b>창은 닫히지 않아</b> 바로 다른 파일을 고를 수 있다.',
        F(modal(rows=(), err=True)),
        [('형식 오류', '표시', '—',
          '<b>⚠ JSON 형식의 티켓 파일이 아닙니다. Key 생성으로 내려받은 .json 파일을 '
          '선택하세요.</b>'),
         ('표', '표시', '—', '<b>표시할 항목이 없습니다.</b>'),
         ('창', '유지', '—', '닫히지 않는다 — 다른 파일 재선택 가능'),
         ('[닫기] · ✕', '클릭', '<code>TKT-03</code>', '목록으로')]))

    intro = ('내려받은 <b>키 파일(.json)</b> 을 열어 그 안에 무엇이 들어 있는지 확인하는 창이다. '
             '<code>TKT-03</code> Key 관리 도구 막대의 <b>[📂 N Key 불러오기]</b> 로 연다. '
             '<b>발급 원장에 없는 외부 파일도 확인할 수 있고</b>, 조회 전용이라 파일을 '
             '고쳐 저장하지 않는다. 원장에 있는 건의 항목은 <code>TKT-05</code> 발급 상세에서 '
             '본다 — 이 창은 <b>파일</b> 을 본다.')
    return page(CODE, NAME, PRD, intro, B)
