# -*- coding: utf-8 -*-
"""TKT-03 Key 관리 — 실제 화면 구조 그대로.

요약 5칸 → (체험 만료 배너) → 도구 막대 → 10열 표 → 페이지네이션.
정산 등록·Key 정보 모달은 폐기되어 발급 상세(TKT-02)의 탭으로 이동했다.
이 화면에 남은 창은 N Key 불러오기(외부 .json 확인) 하나뿐이다.
"""
from shell import page, frame
from p_tkt01 import sel, field

CODE, NAME = 'TKT-03', 'Key 관리'
PRD = 'docs/prd/TKT-03_Key 관리.md'

# lib/ticketStore.ts BILL_COLOR
BILL = {'미정': ('#f3f4f6', '#6b7280'), '유료': ('#eef6ff', '#1d4ed8'),
        '무료': ('#dcfce7', '#166534'), '체험': ('#fef3c7', '#92400e')}

# (No, 발급일시, 종류, 고객사, 대장, 발급내용, 발급인, 정산, 체험꼬리, 금액, 비고)
ROWS = (
    (142, '2026-08-27 10:12', 'N Key', '웅진씽크빅', False,
     'PDS2 S3/O17/B400~499 · Book 100권 · P1~4096 · 병합 1장 · 유효 무제한',
     '김순정', '미정', None, None, None),
    (141, '2026-08-26 16:40', 'App Key', '대교', False,
     '계정 daekyo_edit@daekyo.com · CasterN · PDS3 S3/O212/B0~99 · 무제한',
     '김순정', '유료', None, '₩3,500,000', '2026 연간 계약 포함'),
    (140, '2026-08-25 11:05', 'N Key', '아이스크림에듀', False,
     'PDS3 S5/O88/B0~9 · Book 10권 · P1~4096 · 개별티켓 10장 · 유효 261231',
     '박지훈', '체험', ('~2026-09-25', 'D-29'), None, None),
    (139, '2026-08-20 09:33', 'N Key', '한국뉴베리', False,
     'PDS2 S3/O21/B3~3 · Book 1권 · P1~4096 · 병합 1장 · 유효 무제한',
     '김순정', '체험', ('~2026-07-31', '만료'), None, '공유코드 데모'),
    (138, '2025-12-11 00:00', 'N Key', '교원구몬', True,
     'PDS3 S0/O10/B0~63 · Book 64권 · 유효 무제한',
     '', '무료', None, None, '데모 제공'),
    (137, '2025-11-03 14:26', 'App Key', '웅진씽크빅', True,
     '계정 wj_old@wjthinkbig.com · 미지정 · PDS3 S3/O17/B0~99 · 무제한',
     '', '유료', None, '₩4,800,000', None),
)

KPI = (('발급 티켓', '142', '#111827'), ('유료 합계', '₩8,300,000', '#1d4ed8'),
       ('유료 건수', '3건', '#2563eb'), ('무료 / 체험', '1 / 2건', '#166534'),
       ('정산 미등록', '2건', '#dc2626'))


def tag(text, bg, fg, fs='11px', bold=True):
    return ('<span style="font-size:%s;background:%s;color:%s;border-radius:5px;'
            'padding:2px 7px;white-space:nowrap;%s">%s</span>'
            % (fs, bg, fg, 'font-weight:700' if bold else '', text))


def kpis(kpi=None):
    cards = ''
    for k, v, c in (kpi or KPI):
        cards += ('<div class="card" style="padding:10px 12px">'
                  '<div style="font-size:11px;color:#6b7280">%s</div>'
                  '<div style="font-size:17px;font-weight:700;color:%s">%s</div></div>'
                  % (k, c, v))
    return ('<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;'
            'margin-bottom:12px">%s</div>' % cards)


def banner(n=1):
    return ('<div style="background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;'
            'border-radius:9px;padding:9px 12px;font-size:12.5px;margin-bottom:12px">'
            '⚠ 체험 기간이 만료된 티켓 <b>%d건</b> — 유료 전환 또는 회수 여부를 '
            '확인하세요.</div>' % n)


def chip(label, on):
    return ('<span style="font-size:12px;border-radius:7px;padding:5px 10px;'
            'border:1px solid %s;background:%s;color:%s;%s">%s</span>'
            % ('#93c5fd' if on else '#e5e7eb', '#eef6ff' if on else '#fff',
               '#2563eb' if on else '#6b7280', 'font-weight:700' if on else '', label))


def bar(kind='전체', bill='정산 전체', src='전체', q=''):
    def g(items, active):
        return ('<div style="display:flex;gap:4px">%s</div>'
                % ''.join(chip(x, x == active) for x in items))
    div = '<span style="color:#d1d5db">|</span>'
    srch = ('<div class="inp%s" style="width:190px">%s</div>'
            % ('' if q else ' ph', q or '고객사·내용 검색'))
    return ('<div class="card" style="padding:10px 12px;margin-bottom:10px;display:flex;'
            'gap:8px;align-items:center;flex-wrap:wrap;font-size:12.5px">'
            '%s%s%s%s%s%s<span style="flex:1"></span>%s'
            '<span class="btn gho" style="white-space:nowrap">📂 N Key 불러오기</span>'
            '<span class="btn pri" style="white-space:nowrap">＋ N Key 발급</span></div>'
            % (sel('고객사 전체', w=180),
               g(('전체', 'N Key', 'App Key'), kind), div,
               g(('정산 전체', '미정', '유료', '무료'), bill), div,
               g(('전체', '대장', '신규발급'), src), srch))


HEADS = (('No', None), ('발급일시', 'at'), ('종류', None), ('고객사', 'company'),
         ('발급 내용', None), ('발급인', 'by'), ('정산', None), ('금액', None),
         ('비고', None), ('작업', None))


def table(rows=None, empty=None, sort=('at', -1), pg=''):
    th = ''
    for h, k in HEADS:
        mark = ''
        if k:
            if k == sort[0]:
                mark = ('<span style="margin-left:3px;color:#2563eb">%s</span>'
                        % ('▲' if sort[1] == 1 else '▼'))
            else:
                mark = '<span style="margin-left:3px;color:#d1d5db">↕</span>'
        th += ('<th style="text-align:center;%s">%s%s</th>'
               % ('cursor:pointer' if k else '', h, mark))
    body = ''
    if empty:
        msg = ('아직 발급된 티켓이 없습니다. [＋ N Key 발급] 또는 '
               '[계정 발급 (App Key 발급)] 메뉴에서 발급하세요.'
               if empty == 'none' else '필터에 맞는 티켓이 없습니다.')
        body = ('<tr><td colspan="10" style="text-align:center;color:#9ca3af;'
                'padding:30px">%s</td></tr>' % msg)
    for (no, at, kind, cust, led, desc, by, bill, tr, amt, memo) in (rows or ()):
        kb = tag(kind, '#fef3c7' if kind == 'App Key' else '#eef6ff',
                 '#92400e' if kind == 'App Key' else '#2563eb', bold=False)
        ledb = (' ' + tag('대장', '#f3f4f6', '#9ca3af', '8.5px', False)) if led else ''
        bg, fg = BILL[bill]
        bc = tag(bill, bg, fg)
        if tr:
            bad = (tr[1] == '만료')
            bc += ('<div style="font-size:10px;margin-top:2px;color:%s">%s %s</div>'
                   % ('#dc2626' if bad else '#92400e', tr[0],
                      '(만료)' if bad else '(%s)' % tr[1]))
        body += ('<tr>'
                 '<td style="font-family:ui-monospace,monospace">'
                 '<span style="color:#2563eb;font-weight:600">%d</span></td>'
                 '<td style="font-family:ui-monospace,monospace;font-size:11.5px;'
                 'white-space:nowrap">%s</td>'
                 '<td>%s</td>'
                 '<td style="font-weight:600;text-align:left">%s%s</td>'
                 '<td style="text-align:left;font-size:11.5px;color:#6b7280;'
                 'max-width:300px">%s</td>'
                 '<td style="font-size:11.5px">%s</td>'
                 '<td>%s</td>'
                 '<td style="font-weight:700;color:%s;white-space:nowrap">%s</td>'
                 '<td style="text-align:left;font-size:11px;color:#9ca3af;'
                 'max-width:160px">%s</td>'
                 '<td style="white-space:nowrap"><span class="btn sm">정산</span>'
                 '<span class="lnk" style="margin-left:6px">상세</span>'
                 '<span class="lnk" style="margin-left:6px;color:#dc2626">삭제</span></td>'
                 '</tr>'
                 % (no, at, kb, cust, ledb, desc, by or '-', bc,
                    '#1d4ed8' if amt else '#d1d5db', amt or '-', memo or '-'))
    return ('<div class="card" style="padding:0;overflow:auto">'
            '<table style="text-align:center;min-width:1040px"><tr>%s</tr>%s</table>%s</div>'
            % (th, body, pg))


def content(kpi=None, warn=False, kind='전체', bill='정산 전체', src='전체', q='',
            rows=None, empty=None, sort=('at', -1), total=142, per=50, cur=1):
    body = (kpis(kpi) + (banner() if warn else '')
            + bar(kind, bill, src, q)
            + table(ROWS if (rows is None and not empty) else rows, empty, sort,
                    pager(total, per, cur)))
    return '<div style="min-width:0">%s</div>' % body


# ── 페이지네이션 ────────────────────────────────────────────────
def pager(total=142, per=50, cur=1):
    import math
    if total <= 0:
        return ''
    pages = max(1, int(math.ceil(total / float(per))))
    cur = min(cur, pages)
    start = (cur - 1) * per + 1
    end = min(cur * per, total)
    size = min(7, pages)
    first = max(1, cur - size // 2)
    if first + size - 1 > pages:
        first = pages - size + 1

    def pb(label, on=False, dis=False):
        return ('<span style="min-width:28px;display:inline-block;text-align:center;'
                'font-size:12px;padding:4px 7px;border-radius:6px;border:1px solid %s;'
                'background:%s;color:%s;%s">%s</span>'
                % ('#93c5fd' if on else '#e5e7eb', '#eef6ff' if on else '#fff',
                   '#d1d5db' if dis else ('#2563eb' if on else '#4b5563'),
                   'font-weight:700' if on else '', label))

    nums = ''.join(pb(str(first + i), on=(first + i == cur)) for i in range(size))
    return ('<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;'
            'padding:10px 14px;border-top:1px solid #eef0f4;flex-wrap:wrap">'
            '<div style="font-size:12px;color:#6b7280">전체 '
            '<b style="color:#111827">{:,}</b>건 중 {:,}~{:,} 표시'
            '<span style="margin-left:8px;font-size:12px;padding:3px 6px;border:1px solid #e5e7eb;'
            'border-radius:6px">{}건씩 ▾</span></div>'
            '<div style="display:flex;align-items:center;gap:4px">{}{}{}{}{}'
            '<span style="font-size:11.5px;color:#9ca3af;margin-left:6px">{} / {}</span>'
            '</div></div>').format(
        total, start, end, per,
        pb('«', dis=(cur == 1)), pb('‹', dis=(cur == 1)), nums,
        pb('›', dis=(cur == pages)), pb('»', dis=(cur == pages)), cur, pages)


# ── N Key 불러오기 (외부 .json 확인) ─────────────────────────────
KEYROWS = (('CompanyName', '웅진씽크빅'), ('IssuedTime', '20260827'),
           ('ValidUntilTime', '99999999 (무제한)'), ('Section', '3'), ('Owner', '17'),
           ('TicketVersion', '1'), ('BookStart', '400'), ('BookVolume', '100'),
           ('PageStart', '1'), ('PageVolume', '4096'), ('PatternType', 'PDS2'),
           ('TicketType', 'Unlimited'), ('SeparateEachBook', 'N (1개 티켓 병합)'))


def keyload(err=False, fname='Ticket_웅진씽크빅_S3O17_B400-499.json'):
    if err:
        body = ('<div style="padding:24px;text-align:center;color:#9ca3af;font-size:12.5px">'
                '표시할 항목이 없습니다.</div>')
        n = 0
    else:
        body = ('<table><tr><th style="width:240px">Key</th><th>Value</th></tr>'
                + ''.join('<tr><td style="font-family:ui-monospace,monospace;font-weight:600;'
                          'color:#374151">%s</td><td style="color:#111827">%s</td></tr>' % kv
                          for kv in KEYROWS) + '</table>')
        n = len(KEYROWS)
    sub = ('<div style="background:#f5f9ff;border:1px solid #bfdbfe;border-radius:9px;'
           'padding:9px 12px;font-size:12.5px;color:#1e3a8a;margin-bottom:12px">%s</div>' % fname)
    errbox = ''
    if err:
        errbox = ('<div style="background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;'
                  'border-radius:8px;padding:9px 11px;font-size:12.5px;margin-bottom:10px">'
                  '⚠ JSON 형식의 티켓 파일이 아닙니다. Key 생성으로 내려받은 .json 파일을 '
                  '선택하세요.</div>')
    cap = ('<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">'
           '<div style="font-size:12px;color:#6b7280">Key Info '
           '<span style="color:#9ca3af">· %d개 항목 (불러온 파일)</span></div>'
           '<span style="flex:1"></span>'
           '<div class="inp ph" style="width:150px">항목 검색</div></div>' % n)
    return ('<div class="ovl"><div class="mdl w" style="width:720px">'
            '<div class="mh"><div class="mt">N Key 불러오기 '
            '<span class="tag">TKT-05</span></div><div class="mx">✕</div></div>%s%s%s'
            '<div style="border:1px solid #eef0f4;border-radius:9px;overflow:hidden;'
            'max-height:420px">%s</div>'
            '<div class="mf"><div class="btn gho">표 복사</div>'
            '<div class="btn pri">닫기</div></div></div></div>'
            % (sub, errbox, cap, body))


def deldlg():
    return ('<div class="ovl"><div class="mdl" style="width:440px">'
            '<div class="mh"><div class="mt">발급 기록 삭제</div><div class="mx">✕</div></div>'
            '<div style="font-size:13px;color:#374151;line-height:1.7">'
            '발급 <b>142번</b> 기록을 삭제할까요?</div>'
            '<div class="mf"><div class="btn gho">취소</div>'
            '<div class="btn dgr">삭제</div></div></div></div>')


H = 980
NAV = [('사이드바 [계정 발급 (App Key 발급)]', '클릭', '<code>TKT-01</code>', 'App Key 발급'),
       ('사이드바 [코드 프로젝트]', '클릭', '<code>PRJ-01</code>', '발급 원장'),
       ('고객사 계약·단가', '확인', '<code>MEM-01</code>', '업체 상세')]

ROW_ACTS = [
    ('<b>행 전체</b>', '클릭', '<code>TKT-05</code>', '<b>레코드를 누르면 발급 상세로 간다</b> <code>PC-050</code>'),
    ('행 [정산]', '클릭', '<code>TKT-05</code>', '발급 상세 — <b>정산 정보 탭이 선택된 상태</b>'),
    ('행 [상세]', '클릭', '<code>TKT-05</code>', '발급 상세 — 발급 기본정보 탭'),
    ('행 [삭제]', '클릭', '확인창', '<b>발급 {No}번 기록을 삭제할까요?</b> · 행 이동과 분리된다'),
]


def build():
    B = []

    def F(inner, h=H, overlay=''):
        return frame('TKT-03', 'Key 관리', inner, height=h, overlay=overlay)

    B.append((
        'S1', '기본 목록 · 최근순', '기본',
        '요약 5칸 → 도구 막대 → 10열 표 → 페이지네이션 순서다. 목록에는 '
        '<b>N Key 와 App Key 가 함께</b> 쌓인다 — N Key 는 이 메뉴에서, App Key 는 '
        '계정 등록·수정 화면에서 발급된다. 기본 정렬은 <b>발급일시 내림차순</b>이다. '
        '⚠ <b>정산 등록·Key 정보 모달은 폐기</b>되어 발급 상세의 탭으로 이동했다.',
        F(content()),
        [('요약 5칸', '조회', '—',
          '발급 티켓 142 · 유료 합계 ₩8,300,000 · 유료 3건 · 무료/체험 1/2건 · 정산 미등록 2건'),
         ('요약 기준', '—', '필터 결과 <b>전체</b>', '페이지를 넘겨도 합계는 변하지 않는다'),
         ('[＋ N Key 발급]', '클릭', '<code>TKT-04</code>', 'N Key 생성'),
         ('[📂 N Key 불러오기]', '클릭', '<code>TKT-06</code>', '외부 .json 키 파일 확인'),
         ('페이지네이션', '조회', '—', '기본 <b>50건씩</b> · 전체 142건 중 1~50 표시')]
        + ROW_ACTS + NAV))

    B.append((
        'S2', '체험 만료 경고 · 대장 이력', '분기',
        '체험 만료 건이 있으면 목록 위에 경고가 뜬다. 체험은 정산 배지 아래에 '
        '<b>~만료일 (D-n)</b>, 기간이 지났으면 <b>(만료)</b> 로 표시된다. '
        '과거 발급 이력은 고객사명 옆에 <b>대장</b> 배지가 붙는다. 잔여일 계산은 PRD §4.7(나).',
        F(content(warn=True), h=H + 60),
        [('배너', '표시', '—',
          '<b>⚠ 체험 기간이 만료된 티켓 1건 — 유료 전환 또는 회수 여부를 확인하세요.</b>'),
         ('체험 진행 중', '표시', '—', '<b>~2026-09-25 (D-29)</b>'),
         ('체험 만료', '표시', '—', '<b>~2026-07-31 (만료)</b>'),
         ('대장 배지', 'hover', '툴팁', '<b>발급 대장에서 가져온 과거 이력</b>'),
         ('대장 이력', '참고', '—', '발급인이 비어 있어 <b>-</b> 로 표시된다')] + NAV))

    B.append((
        'S3', '필터 — 종류 · 정산 · 출처', '필터',
        '필터는 한 줄에 이어지고 구분선(<b>|</b>)으로 묶음이 나뉜다. '
        '⚠ <b>정산 필터에는 「체험」이 없다</b> — 정산 전체 · 미정 · 유료 · 무료 4개뿐이다. '
        '고객사 목록에는 <b>발급 이력이 있는 고객사만</b> 나온다. '
        '필터가 바뀌면 <b>1페이지로 되돌아간다</b>.',
        F(content(kind='App Key', bill='유료', src='신규발급', rows=(ROWS[1],),
                  kpi=(('발급 티켓', '1', '#111827'), ('유료 합계', '₩3,500,000', '#1d4ed8'),
                       ('유료 건수', '1건', '#2563eb'), ('무료 / 체험', '0 / 0건', '#166534'),
                       ('정산 미등록', '0건', '#9ca3af')), total=1),
          h=H - 220),
        [('고객사', '선택', '해당 고객사만', '기본 <b>고객사 전체</b>'),
         ('종류', '클릭', '전체 / N Key / App Key', ''),
         ('정산', '클릭', '정산 전체 / 미정 / 유료 / 무료', '<b>체험은 필터로 고를 수 없다</b>'),
         ('출처', '클릭', '전체 / 대장 / 신규발급', ''),
         ('검색', '입력', '발급 내용 + 발급인', '<b>고객사·내용 검색</b>'),
         ('요약', '자동', '재계산', '필터 결과 기준으로 5칸이 모두 다시 계산된다'),
         ('페이지', '자동', '1페이지', '필터·검색·정렬이 바뀌면 되돌아간다')] + NAV))

    B.append((
        'S4', '정렬 — 머리글 클릭', '분기',
        '정렬 가능한 열은 <b>발급일시 · 고객사 · 발급인</b> 3개다. 머리글을 누르면 '
        '오름/내림이 바뀐다. 기본은 <b>발급일시 내림차순</b>이다.',
        F(content(sort=('company', 1),
                  rows=(ROWS[2], ROWS[1], ROWS[4], ROWS[3], ROWS[0], ROWS[5]))),
        [('발급일시', '클릭', '오름 ⇄ 내림', '기본값은 <b>내림차순(최근순)</b>'),
         ('고객사', '클릭', '가나다순', '한국어 정렬'),
         ('발급인', '클릭', '가나다순', ''),
         ('No · 종류 · 금액 등', '클릭', '<b>동작 없음</b>', '정렬 대상이 아니다')] + NAV))

    B.append((
        'S5', '필터 결과 없음', '빈 상태',
        '필터에 맞는 티켓이 없을 때. 표에는 안내만 남고 <b>요약 5칸은 0건 기준</b>으로 '
        '다시 계산된다. <b>페이지네이션 막대는 사라진다.</b>',
        F(content(empty='filter', bill='무료',
                  kpi=(('발급 티켓', '0', '#111827'), ('유료 합계', '₩0', '#1d4ed8'),
                       ('유료 건수', '0건', '#2563eb'), ('무료 / 체험', '0 / 0건', '#166534'),
                       ('정산 미등록', '0건', '#9ca3af')), total=0),
          h=H - 380),
        [('표', '표시', '—', '<b>필터에 맞는 티켓이 없습니다.</b>'),
         ('요약', '자동', '0건 기준', '금액도 <b>₩0</b>'),
         ('페이지네이션', '표시', '<b>없음</b>', '목록이 비면 막대를 그리지 않는다')]))

    B.append((
        'S6', '발급 이력 없음', '빈 상태',
        '아직 한 건도 발급하지 않은 상태. 안내 문구가 <b>발급 동선</b>을 알려준다.',
        F(content(empty='none',
                  kpi=(('발급 티켓', '0', '#111827'), ('유료 합계', '₩0', '#1d4ed8'),
                       ('유료 건수', '0건', '#2563eb'), ('무료 / 체험', '0 / 0건', '#166534'),
                       ('정산 미등록', '0건', '#9ca3af')), total=0),
          h=H - 380),
        [('표', '표시', '—',
          '<b>아직 발급된 티켓이 없습니다. [＋ N Key 발급] 또는 '
          '[계정 발급 (App Key 발급)] 메뉴에서 발급하세요.</b>'),
         ('[＋ N Key 발급]', '클릭', '<code>TKT-04</code>', 'N Key 생성'),
         ('사이드바 [계정 발급]', '클릭', '<code>TKT-01</code>', 'App Key 발급')]))

    B.append((
        'S7', '페이지 이동 · 건수 변경', '분기',
        '페이지당 건수는 <b>25 / 50 / 100 / 200 / 500 / 전체 보기</b> 중 고른다(기본 50건). '
        '표시 범위 계산은 PRD §4.7(다). <b>요약 합계는 페이지와 무관</b>하게 '
        '필터 결과 전체 기준을 유지한다.',
        F(content(cur=3)),
        [('건수 선택', '변경', '1페이지로', '25 / 50 / 100 / 200 / 500 / 전체 보기'),
         ('페이지 번호', '클릭', '해당 페이지', '현재 위치 기준 <b>최대 7개</b>'),
         ('« ‹ › »', '클릭', '처음 · 이전 · 다음 · 끝', '양 끝에서는 비활성'),
         ('표시 범위', '조회', '—', '<b>전체 142건 중 101~142 표시 · 3 / 3</b>'),
         ('요약 5칸', '조회', '변하지 않음', '페이지를 넘겨도 합계는 그대로다')] + NAV))

    B.append((
        'S8', '발급 기록 삭제 확인', '차단',
        '행 <b>[삭제]</b> 는 확인을 거친다. 삭제해도 <b>발급 번호는 다시 쓰지 않는다.</b>',
        F(content(), overlay=deldlg()),
        [('행 [삭제]', '클릭', '확인창', '<b>발급 142번 기록을 삭제할까요?</b>'),
         ('[삭제]', '클릭', '목록에서 제거', '발급 번호는 재사용하지 않는다'),
         ('[취소] · ✕', '클릭', '변경 없음', '')]))

    intro = ('발급된 티켓(N Key · App Key)의 <b>전체 이력을 조회하고, 발급 건별로 '
             '상세·정산 화면에 들어가는 진입점</b>이다. 목록에는 두 종류가 함께 쌓이며 '
             '종류 필터로 구분한다. <b>정산 등록과 Key 정보 확인은 이 화면의 모달이 아니라 '
             '발급 상세(TKT-02)의 탭</b>이다. 요약 합계는 <b>필터 결과 전체</b> 기준이라 '
             '페이지를 넘겨도 변하지 않는다. 계산 규칙은 PRD §4.7.')
    return page(CODE, NAME, PRD, intro, B)
