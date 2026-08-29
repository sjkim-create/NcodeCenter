# -*- coding: utf-8 -*-
"""TKT-04 N Key 발급 — 실제 화면 구조 그대로.

발급 메뉴는 사이드바 [티켓 발급] 그룹으로 빠졌고, 화면은 발급 폼 한 장(최대 900px)이다.
sel() · field() · tkt02() 는 TKT-01 / TKT-03 / SOB-02 / PRJ-02 / PRJ-04 가 함께 쓴다.
"""
from shell import page, frame

CODE, NAME = 'TKT-04', 'N Key 발급'
PRD = 'docs/prd/TKT-04_N Key 발급.md'

USE_NOTE = ('Key 생성 시 티켓이 <b>zip 파일(폴더 형태)</b>로 다운로드됩니다. 다운로드 폴더에서 zip의 '
            '압축을 풀어 그 폴더째 <b>nproj 폴더</b> 또는 <b>내 PC &gt; 문서 &gt; NeoLAB &gt; '
            'CodeTickets</b>(<code>C:\\Users\\Documents\\NeoLab\\CodeTickets</code>)에 넣은 뒤 '
            '<b>Caster lite</b>에서 사용합니다.')

SC = {'S': '#5f8ff0', 'O': '#14b8a6', 'B': '#8b5cf6', 'P': '#f59e0b'}


# ── 공용 입력 조각 (다른 모듈에서 import) ────────────────────────────
def sel(v, ph=False, err=False, w=None):
    st = ('width:%dpx;' % w) if w else ''
    cls = 'inp' + (' ph' if ph else '') + (' err' if err else '')
    return ('<div class="%s" style="%sdisplay:flex;align-items:center;justify-content:space-between">'
            '%s<span style="color:#9ca3af;font-size:10px">▾</span></div>' % (cls, st, v))


def field(label, inner, req=False, err=None, hint=None):
    r = ' <span style="color:#dc2626">*</span>' if req else ''
    e = '<div class="inline-err">%s</div>' % err if err else ''
    h = ('<div style="font-size:11px;color:#9ca3af;margin-top:3px">%s</div>' % hint) if hint else ''
    return '<div class="fld"><span class="lbl">%s%s</span>%s%s%s</div>' % (label, r, inner, h, e)


def sb(k, v):
    return ('<span style="display:inline-flex;align-items:center;gap:5px;border:1px solid #eef0f4;'
            'border-radius:8px;padding:2px 7px 2px 2px;background:#fff;font-size:12px">'
            '<span style="background:%s;color:#fff;font-weight:700;font-size:10.5px;'
            'border-radius:6px;padding:2px 6px;min-width:12px;text-align:center">%s</span>'
            '<span style="font-family:ui-monospace,monospace;color:#111827">%s</span></span>'
            % (SC[k], k, v))


# 웅진씽크빅이 할당받은 SOBP 범위 (Section, Owner, Book, Page)
RANGES = ((3, 17, '400~499', '0~4,095'),
          (3, 17, '500~599', '0~4,095'),
          (0, 17, '111~199', '0~1,023'))


def chips(i):
    s, o, b, p = RANGES[i]
    return sb('S', s) + sb('O', o) + sb('B', b) + sb('P', p)


def picker(state='closed', value=0):
    """할당된 SOBP 범위 — 접힘 트리거 + 펼침 목록"""
    note = ('<div style="font-size:12px;color:#9ca3af;padding:9px 12px;border:1px solid #eef0f4;'
            'border-radius:10px;background:#fafbfc">%s</div>')
    if state == 'nocompany':
        return note % '고객사를 먼저 선택하세요.'
    if state == 'norange':
        return note % '이 고객사에 할당된 SOBP 범위가 없습니다.'
    trig = ('<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;'
            'border:1px solid #e5e7eb;border-radius:10px;background:#fff;min-height:40px">'
            '%s<span style="margin-left:auto;color:#9ca3af;font-size:12px">%s</span></div>'
            % (chips(value), '▲' if state == 'open' else '▼'))
    if state != 'open':
        return '<div style="position:relative">%s</div>' % trig
    rows = ''
    for i in range(len(RANGES)):
        on = (i == value)
        rows += ('<div style="display:flex;align-items:center;gap:8px;padding:9px 12px;'
                 'background:%s;%s">'
                 '<span style="font-size:11px;color:%s;width:16px;text-align:center;'
                 'font-weight:700">%d</span>%s%s</div>'
                 % ('#eef6ff' if on else '#fff',
                    'border-top:1px solid #f1f3f6' if i else '',
                    '#2563eb' if on else '#9ca3af', i + 1, chips(i),
                    '<span style="margin-left:auto;font-size:11px;color:#2563eb;'
                    'font-weight:700">✓</span>' if on else ''))
    return ('<div style="position:relative">%s'
            '<div style="position:absolute;z-index:20;top:calc(100%% + 4px);left:0;right:0;'
            'border:1px solid #e5e7eb;border-radius:10px;background:#fff;'
            'box-shadow:0 12px 32px rgba(15,23,42,.14);max-height:260px;overflow:hidden">%s</div>'
            '</div>' % (trig, rows))


CU = (('아들과딸', 21), ('한국뉴베리', 27), ('새알교육', 1012))


def cu_select(picked=0):
    """공통코드 고객사 — 범위 목록을 대체한다"""
    label = ('- 사용 고객사 선택 (3곳) -' if picked is None
             else '%s · COMMON-%d (PDS2 S3/O%d)' % (CU[picked][0], CU[picked][1], CU[picked][1]))
    out = ('<div style="font-size:12px;color:#6b7280;margin-bottom:6px">'
           '사용 고객사 <span style="color:#dc2626">*</span> '
           '<span style="color:#a855f7;font-weight:700">공통코드</span>'
           '<span style="color:#9ca3af"> (선택 시 코드 O21/O27/O1012 자동 지정)</span></div>'
           + sel(label, ph=(picked is None)))
    if picked is not None:
        out += ('<div style="font-size:11.5px;color:#6b21a8;margin-top:6px">발급 코드: '
                '<b>PDS2 · S3 / O%d</b> · 사용 고객사 <b>%s</b></div>'
                % (CU[picked][1], CU[picked][0]))
    return out


# ── 발급 폼 ────────────────────────────────────────────────────────
def form(state='ready', sep=False, unlimited=True, err=None, over=False,
         cust='웅진씽크빅', bstart=400, books=100):
    ready = state not in ('empty', 'norange')
    ro = '' if ready else ' ro'
    dash = '—'

    if state == 'empty':
        right = picker('nocompany')
    elif state == 'norange':
        right = picker('norange')
    elif state == 'common':
        right = cu_select(0)
    elif state == 'common_empty':
        right = cu_select(None)
    else:
        right = ('<div style="font-size:12px;color:#6b7280;margin-bottom:6px">'
                 '할당된 SOBP 범위 <span style="color:#dc2626">*</span> '
                 '<span style="color:#9ca3af">(선택 시 Section·Owner·Book·PatternType 자동)</span>'
                 '</div>' + picker('open' if state == 'open' else 'closed'))

    head = ('<div style="display:grid;grid-template-columns:1fr 1.4fr;gap:12px;'
            'align-items:start">%s<div>%s</div></div>'
            % (field('회사이름 (고객사)',
                     sel(cust if state != 'empty' else '- 선택 -', ph=(state == 'empty')), True),
               right))

    bend = bstart + books - 1
    row4 = ('<div class="g4" style="margin-top:12px">'
            + field('Start Book%s' % (' · 400~499' if ready else ' (시작 북코드)'),
                    '<div class="inp%s">%s</div>' % (ro, bstart if ready else dash))
            + field('Book 볼륨 (권)%s' % (' · 최대 %d' % (499 - bstart + 1) if ready else ''),
                    '<div class="inp%s">%s</div>' % (ro, books if ready else dash))
            + field('Start Page (시작 페이지)', sel('1 (기본)' if ready else dash, ph=not ready))
            + field('Page 볼륨%s' % (' · 최대 4,096' if ready else ' (페이지 가용 범위)'),
                    '<div class="inp%s">%s</div>' % (ro, '4096' if ready else dash))
            + '</div>')

    date_box = ('<div style="display:flex;gap:8px;align-items:center">'
                '<div class="inp%s" style="max-width:190px;opacity:%s">%s</div>'
                '<label style="display:flex;align-items:center;gap:4px;font-size:12.5px;'
                'color:#374151;white-space:nowrap">'
                '<input type="checkbox"%s> 무제한</label></div>'
                % (ro, '.5' if unlimited else '1',
                   '2027-12-31' if not unlimited else 'yyyy-mm-dd',
                   ' checked' if unlimited else ''))
    row_valid = ('<div class="g4" style="margin-top:4px">%s</div>'
                 % field('ValidUntilTime (사용 기한)', date_box))

    row_auto = ('<div class="g3" style="margin-top:4px">'
                + field('IssuedTime (발급일·고정)', '<div class="inp ro">20260827</div>')
                + field('PatternType',
                        '<div class="inp ro">%s</div>' % ('Ncode_PDS2' if ready else dash))
                + field('TicketVersion', '<div class="inp ro">1</div>')
                + '</div>')

    btns = ('<div style="display:flex;align-items:center;gap:12px;margin-top:12px;'
            'padding-top:12px;border-top:1px solid #eef0f4">'
            '<label style="display:flex;align-items:center;gap:6px;font-size:12.5px;color:#374151">'
            '<input type="checkbox"%s> <b>Separate each book</b> '
            '<span style="color:#9ca3af">(체크: 북코드별 개별 티켓 / 해제: 1개 티켓에 병합)</span>'
            '</label><span style="flex:1"></span>'
            '<div class="btn gho">목록</div>'
            '<div class="btn %s">Key 생성</div></div>'
            % (' checked' if sep else '', 'pri' if ready else 'dis'))

    summary = ''
    if ready:
        warn = ('<span style="color:#dc2626;font-weight:700"> · ⚠ 할당 범위(B499) 초과</span>'
                if over else '')
        summary = ('<div style="margin-top:8px;font-size:12px;color:#6b7280">발급 예정: '
                   '<b style="color:#111827">S3/O17/B%d~%d</b> · %s · P1~4096%s</div>'
                   % (bstart, bend,
                      ('개별 티켓 %d장' % books) if sep else '병합 티켓 1장', warn))

    toast = ''
    if err:
        toast = ('<div style="margin-top:10px;font-size:12.5px;color:#2563eb">%s</div>' % err)

    return ('<div class="card"><div class="bd">'
            '<div style="font-weight:700;font-size:14px;margin-bottom:12px">N Key 발급 '
            '<span style="color:#9ca3af;font-weight:400;font-size:12px">'
            '· SOBP 코드 사용 허가 (Caster lite 티켓)</span></div>'
            '%s%s%s%s%s%s%s'
            '<div style="margin-top:12px;background:#fafbfc;border:1px dashed #e5e7eb;'
            'border-radius:8px;padding:10px 12px;font-size:11.5px;color:#6b7280;'
            'line-height:1.7">%s</div>'
            '</div></div>'
            % (head, row4, row_valid, row_auto, btns, summary, toast, USE_NOTE))


def content(**kw):
    return '<div style="max-width:900px">%s</div>' % form(**kw)


# ── TKT-02 Key 정보 확인 (TKT-03 도 사용) ──────────────────────────
KEYROWS = (('CompanyName', '웅진씽크빅'), ('IssuedTime', '20260827'),
           ('ValidUntilTime', '99999999 (무제한)'), ('Section', '3'), ('Owner', '17'),
           ('TicketVersion', '1'), ('BookStart', '400'), ('BookVolume', '100'),
           ('PageStart', '1'), ('PageVolume', '4096'), ('PatternType', 'Ncode_PDS2'),
           ('TicketType', 'Unlimited'), ('SeparateEachBook', 'N (1개 티켓 병합)'))


def tkt02(mode='input', err=None, empty=False, fname=None):
    if empty:
        body = ('<div style="padding:24px;text-align:center;color:#9ca3af;font-size:12.5px">%s</div>'
                % ('키 파일을 선택하세요.' if mode == 'file' else '표시할 항목이 없습니다.'))
        n = 0
    else:
        body = ('<table><tr><th style="width:240px">Key</th><th>Value</th></tr>'
                + ''.join('<tr><td style="font-family:ui-monospace,monospace;font-weight:600;'
                          'color:#374151">%s</td><td style="color:#111827">%s</td></tr>' % kv
                          for kv in KEYROWS) + '</table>')
        n = len(KEYROWS)
    tabs = ('<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;'
            'margin-bottom:12px">'
            '<span class="chip%s">현재 입력값</span>'
            '<span class="chip%s">📂 Key 불러오기</span>%s<span style="flex:1"></span>'
            '<div class="inp ph" style="width:150px">항목 검색</div></div>'
            % (' on' if mode == 'input' else '', ' on' if mode == 'file' else '',
               ('<span style="font-size:11.5px;color:#6b7280;'
                'font-family:ui-monospace,monospace">%s</span>' % fname) if fname else ''))
    errbox = ''
    if err:
        errbox = ('<div style="background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;'
                  'border-radius:8px;padding:9px 11px;font-size:12.5px;margin-bottom:10px">'
                  '⚠ %s</div>' % err)
    cap = ('<div style="font-size:12px;color:#6b7280;margin-bottom:6px">Key Info '
           '<span style="color:#9ca3af">· %d개 항목%s</span></div>'
           % (n, ' (불러온 파일)' if mode == 'file' else ' (아직 생성 전 · 화면 입력값 기준)'))
    return ('<div class="ovl"><div class="mdl w" style="width:720px">'
            '<div class="mh"><div class="mt">Key 정보 확인 '
            '<span class="tag">TKT-02</span></div><div class="mx">✕</div></div>%s%s%s'
            '<div style="border:1px solid #eef0f4;border-radius:9px;overflow:hidden;'
            'max-height:420px">%s</div>'
            '<div class="mf"><div class="btn gho">표 복사</div>'
            '<div class="btn pri">닫기</div></div></div></div>'
            % (tabs, errbox, cap, body))


MENU_ACTS = [
    ('사이드바 [계정 발급]', '클릭', '<code>TKT-01</code>', '<b>고객사 선택 유지</b>'),
    ('사이드바 [Key 관리]', '클릭', '<code>TKT-03</code>', '발급·정산 목록'),
]

CLOSE = [('[닫기] · ✕ · 배경', '클릭', '<code>TKT-04</code>', '입력값은 그대로 남는다')]


def scr(**kw):
    return frame('TKT-04', 'N Key 발급', content(**kw), height=1060)


def build():
    B = []

    B.append((
        'S1', '진입 직후 — 고객사 미선택', '기본',
        '좌측 메뉴 [티켓 발급] → <b>N Key 발급</b>이 기본으로 열린다. '
        '고객사를 고르기 전에는 SOBP 범위 자리에 안내만 나오고 '
        '<b>Book·Page 입력이 잠겨 있으며</b> <b>[Key 생성]</b> 도 눌리지 않는다.',
        scr(state='empty'),
        [('회사이름 (고객사) *', '선택', 'S3 (범위 목록 표시)',
          '<code>MEM-01</code> 에 등록된 고객사만 · 바꾸면 <b>아래 입력이 모두 초기화</b>된다'),
         ('할당된 SOBP 범위', '—', '안내만', '<b>고객사를 먼저 선택하세요.</b>'),
         ('Book · Page 입력', '—', '잠금', '범위를 고르기 전에는 값을 넣을 수 없다'),
         ('[Key 생성]', '—', '비활성', '범위가 없으면 잠긴다'),
         ('[목록]', '클릭', '<code>TKT-03</code>', 'Key 관리 목록으로')] + MENU_ACTS))

    B.append((
        'S2', '할당된 SOBP 범위 없음', '차단',
        '고객사는 골랐지만 <code>SOB-02</code> 로 할당받은 코드가 없는 경우. '
        '먼저 코드를 할당해야 티켓을 발급할 수 있다 <code>P-05</code>.',
        scr(state='norange'),
        [('범위 자리', '표시', '—', '<b>이 고객사에 할당된 SOBP 범위가 없습니다.</b>'),
         ('[Key 생성]', '강제 실행', '인라인 메시지',
          '<b>이 고객사에 할당된 SOBP 범위가 없습니다.</b>'),
         ('해결', '이동', '<code>SOB-02</code>', 'SOBP 맵에서 코드를 할당한 뒤 재시도'),
         ('미등록 고객사', '이동', '<code>MEM-02</code>', '고객사 등록 후 재시도')] + MENU_ACTS))

    B.append((
        'S3', '범위 선택 완료 — 발급 준비', '기본',
        '범위를 고르면 <b>Start Book · Book 볼륨 · Page 볼륨</b> 이 자동으로 채워지고 '
        'PatternType 이 확정된다 <code>P-02</code>(PDS3→Ncode_PDS3 · PDS2→Ncode_PDS2 · PDS4→Scode · OID→OID). 버튼 아래에 <b>발급 예정</b> 요약이 나온다.',
        scr(state='ready'),
        [('할당된 SOBP 범위', '클릭', 'S4 (목록 펼침)', '접힌 상태에서는 선택된 범위만 칩으로 표시'),
         ('자동 채움', '—', 'Start Book / Book 볼륨 / Page 볼륨',
          'Start Book = 범위 시작 · Book 볼륨 = <b>범위 전체 권수</b> · Page 볼륨 = Section 상한'),
         ('Start Book', '숫자 입력', '요약 갱신', '허용 <b>400~499</b>'),
         ('Book 볼륨 (권)', '숫자 입력', '요약 갱신', '<b>1 ~ 100</b> (범위 끝까지)'),
         ('Start Page', '선택', '요약 갱신', '<b>0 / 1(기본) / 2</b>'),
         ('Page 볼륨', '숫자 입력', '요약 갱신',
          '라벨에 <b>최대 4,096</b> 안내 — 다만 <b>초과해도 막지 않는다</b> (§7 미결)'),
         ('[Key 생성]', '클릭', 'S10', '검증 통과 시 zip 다운로드')] + MENU_ACTS))

    B.append((
        'S4', 'SOBP 범위 목록 펼침', '분기',
        '범위마다 <b>순번 + S·O·B·P 칩</b> 으로 보여준다. 현재 선택한 항목은 강조되고 '
        '<b>✓</b> 가 붙는다. 목록 밖을 클릭하면 닫힌다.',
        scr(state='open'),
        [('범위 항목', '클릭', 'S3 (선택 반영)', '자동 채움 실행 후 목록이 닫힌다'),
         ('목록 밖', '클릭', '닫힘', '선택은 그대로'),
         ('▼ / ▲', '클릭', '펼침 · 접힘', ''),
         ('항목이 많을 때', '스크롤', '—', '목록 영역 안에서 스크롤')] + MENU_ACTS))

    B.append((
        'S5', '공통코드 고객사 — 사용 고객사 지정', '분기',
        '<code>P-12</code> — 공통(커먼) 코드를 보유한 고객사면 <b>범위 목록 자리가 '
        '「사용 고객사」 선택으로 바뀐다</b>. 고르면 그 고객사가 쓰는 코드로 <b>범위가 자동 지정</b>된다. '
        '지정값은 티켓 정보와 파일명에 들어간다. <b>이력 전용 공통코드는 목록에서 빠진다.</b>',
        scr(state='common'),
        [('사용 고객사 *', '선택', '범위 자동 지정',
          '목록은 <b>{사용 고객사} · {코드}</b> 형태 · 사용자 등록분은 <b>· 신규</b> 표시'),
         ('선택 결과', '표시', '—', '<b>발급 코드: PDS2 · S3 / O21 · 사용 고객사 아들과딸</b>'),
         ('미선택 상태', '[Key 생성]', '인라인 메시지',
          '<b>공통코드 회사입니다. 사용 고객사를 선택하세요.</b>'),
         ('파일명', '발급 시', '—', '<code>Ticket_{고객사}_{사용고객사}_S3O21_B...</code>')]
        + MENU_ACTS))

    B.append((
        'S6', 'Separate each book 체크', '분기',
        '체크하면 <b>북코드마다 티켓 파일이 1개씩</b> 만들어지고, 해제하면 <b>1개 티켓으로 병합</b>된다. '
        '요약줄의 티켓 장수가 바로 바뀐다.',
        scr(state='ready', sep=True),
        [('Separate each book', '체크', '요약 갱신', '<b>개별 티켓 100장</b>'),
         ('Separate each book', '해제', '요약 갱신', '<b>병합 티켓 1장</b>'),
         ('zip 구성', '발급 시', '—',
          '체크 = Book 하나당 파일 1개 / 해제 = 병합 파일 1개 (zip 은 항상 1개)')] + MENU_ACTS))

    B.append((
        'S7', '사용 기한 지정 (무제한 해제)', '분기',
        '<b>무제한</b> 이 기본이며 이때 날짜 입력은 흐리게 잠긴다. 체크를 풀면 '
        '<b>달력으로 날짜</b>를 고른다. 티켓에는 <b>6자리(YYMMDD)</b> 로 들어간다.',
        scr(state='ready', unlimited=False),
        [('무제한', '체크', '날짜 잠금', '티켓에 <code>99999999</code> 로 기록'),
         ('무제한', '해제', '달력 활성', '날짜를 고르면 6자리로 변환되어 기록'),
         ('형식 오류', '[Key 생성]', '인라인 메시지',
          '<b>ValidUntilTime은 6자리(YYMMDD)이거나 무제한이어야 합니다.</b>')] + MENU_ACTS))

    B.append((
        'S8', '할당 범위 초과 경고', '경고',
        'Book 끝 번호가 할당 범위를 넘으면 요약줄에 <b>빨강 경고</b>가 붙는다. '
        '버튼은 여전히 눌리지만 <b>검증에서 막힌다</b> <code>P-05</code>.',
        scr(state='ready', bstart=480, books=40, over=True),
        [('요약줄', '표시', '—', '<b>· ⚠ 할당 범위(B499) 초과</b>'),
         ('[Key 생성]', '클릭', 'S9 (검증 실패)',
          '<b>Book 볼륨은 1~20권이어야 합니다. (B480~B499)</b>'),
         ('Page 볼륨 초과', '—', '<b>경고 없음</b>',
          '⚠ Book 과 달리 Page 는 상한을 넘겨도 경고도 차단도 없다 (§7 미결)')] + MENU_ACTS))

    B.append((
        'S9', '검증 실패 — 인라인 메시지', '오류',
        '[Key 생성] 은 <b>①~⑦ 순서로 검사</b>하고 하나라도 걸리면 그 자리에서 멈춘다. '
        '메시지는 버튼 아래 <b>파란 한 줄</b>로 나오고, 입력값은 그대로 남는다.',
        scr(state='ready', bstart=480, books=40, over=True,
            err='Book 볼륨은 1~20권이어야 합니다. (B480~B499)'),
        [('① 고객사 미선택', '검사', '중단', '<b>고객사를 선택하세요.</b>'),
         ('② 사용 고객사 미선택', '검사', '중단',
          '<b>공통코드 회사입니다. 사용 고객사를 선택하세요.</b> (공통코드 고객사만)'),
         ('③ 할당 범위 없음', '검사', '중단', '<b>이 고객사에 할당된 SOBP 범위가 없습니다.</b>'),
         ('④ Start Book 범위 밖', '검사', '중단',
          '<b>Start Book은 400~499 범위여야 합니다.</b>'),
         ('⑤ Book 볼륨 초과', '검사', '중단',
          '<b>Book 볼륨은 1~{최대}권이어야 합니다. (B{시작}~B{끝})</b>'),
         ('⑥ Page 볼륨 오류', '검사', '중단', '<b>Page 볼륨은 1 이상이어야 합니다.</b>'),
         ('⑦ 사용 기한 형식', '검사', '중단',
          '<b>ValidUntilTime은 6자리(YYMMDD)이거나 무제한이어야 합니다.</b>')] + MENU_ACTS))

    B.append((
        'S10', 'Key 생성 성공', '완료',
        '티켓이 <b>zip 1개</b>로 다운로드되고 발급 이력이 남는다. 화면은 그대로 유지되어 '
        '<b>이어서 다음 범위를 발급</b>할 수 있다.',
        scr(state='ready',
            err='Key 생성됨 · 티켓 1장(병합) · B400~499 — '
                'zip(Ticket_웅진씽크빅_S3O17_B400-499.zip)으로 다운로드됩니다.'),
        [('다운로드', '자동', '—',
          '<code>Ticket_{고객사}[_{사용고객사}]_S{n}O{n}_B{시작}[-{끝}].zip</code>'),
         ('zip 내용', '—', '—',
          '병합 = 티켓 파일 1개 / 개별 = Book 하나당 1개 (각 1권)'),
         ('발급 이력', '자동', '<code>TKT-03</code>', '발급 목록에 1건 추가'),
         ('활동 로그', '자동', '<code>LOG-01</code>', '<b>티켓 발급</b> 으로 기록'),
         ('사용 방법', '표시', '—', '하단 점선 안내 — 압축 해제 후 <b>Caster lite</b> 에서 사용'),
         ('재발급', '—', '<b>미결</b>', '⚠ §7 — 같은 범위 재생성 시 이전 티켓 무효화 여부 미정')]
        + MENU_ACTS))

    intro = ('<b>티켓 = 고객사가 이미 할당받은 SOBP 코드를 실제로 쓸 수 있게 하는 사용 허가</b>다. '
             '발급 메뉴는 사이드바 <b>[티켓 발급]</b> 그룹(<code>TKT-04</code> N Key 발급 · '
             '<code>TKT-01</code> 계정 발급 · <code>TKT-03</code> 발급 목록 · 정산)이며, '
             '이 화면은 그중 <b>N Key 발급</b>(<code>/tickets/nkey</code>)이다.<br>'
             '<b>N Key</b> = 물리 키 · 오프라인 편집툴(Caster lite) 용 · <b>계정 불필요</b>. '
             '고객사 선택값은 <code>TKT-04</code> · <code>TKT-01</code> · <code>TKT-03</code> '
             '<b>3개 화면이 공유</b>한다.<br>'
             'S11~S13 은 이 화면에서 열리는 <b><code>TKT-02</code> Key 정보 확인</b> 모달이다.')
    return page(CODE, NAME, PRD, intro, B)
