# -*- coding: utf-8 -*-
"""TKT-04 발급 목록 및 정산 (+ TKT-05 정산 등록 모달) — 실제 화면 구조 그대로.

요약 5칸 → (체험 만료 배너) → 한 줄 필터 → 10열 표. 목록은 폭 제한 없이 전체를 쓴다.
TKT-05 정산 등록은 이 화면 위 모달(S8~S12), TKT-02 Key 정보는 S7.
"""
from shell import page, frame
from p_tkt01 import sel, field, tkt02

CODE, NAME = 'TKT-04', 'Key 발급 정산'
PRD = 'docs/prd/TKT-04_Key 발급 정산.md'

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
            '%s%s%s%s%s%s%s<span style="flex:1"></span>%s</div>'
            % (sel('고객사 전체', w=180),
               g(('전체', 'N Key', 'App Key'), kind), div,
               g(('정산 전체', '미정', '유료', '무료'), bill), div,
               g(('전체', '대장', '신규발급'), src), '', srch))


HEADS = (('No', None), ('발급일시', 'at'), ('종류', None), ('고객사', 'company'),
         ('발급 내용', None), ('발급인', 'by'), ('정산', None), ('금액', None),
         ('비고', None), ('작업', None))


def table(rows=None, empty=None, sort=('at', -1)):
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
        msg = ('아직 발급된 티켓이 없습니다. 왼쪽 [티켓 발급] 메뉴의 '
               '[N Key 발급] 또는 [계정 발급]에서 발급하세요.'
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
                 '<td style="color:#9ca3af;font-family:ui-monospace,monospace">%d</td>'
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
                 '<td style="white-space:nowrap"><span class="btn sm">정산 등록</span>'
                 '<span class="lnk" style="margin-left:6px">Key 정보</span>'
                 '<span class="lnk" style="margin-left:6px;color:#dc2626">삭제</span></td>'
                 '</tr>'
                 % (no, at, kb, cust, ledb, desc, by or '-', bc,
                    '#1d4ed8' if amt else '#d1d5db', amt or '-', memo or '-'))
    return ('<div class="card" style="padding:0;overflow:auto">'
            '<table style="text-align:center;min-width:1040px"><tr>%s</tr>%s</table></div>'
            % (th, body))


def content(kpi=None, warn=False, kind='전체', bill='정산 전체', src='전체', q='',
            rows=None, empty=None, sort=('at', -1)):
    body = (kpis(kpi) + (banner() if warn else '')
            + bar(kind, bill, src, q)
            + table(ROWS if (rows is None and not empty) else rows, empty, sort))
    return '<div style="min-width:0">%s</div>' % body


# ── TKT-05 정산 등록 모달 ──────────────────────────────────────────
KINDS = (('미정', '미등록'), ('유료', '금액 입력'), ('무료', '청구 없음'), ('체험', '1개월'))


def tkt05(bill='미정', recent=True, err=False):
    cards = ''
    for nm, sub in KINDS:
        on = (nm == bill)
        bg, fg = BILL[nm]
        cards += ('<div style="padding:10px 8px;border-radius:9px;font-size:12.5px;'
                  'text-align:center;border:1px solid %s;background:%s;color:%s;%s">%s'
                  '<div style="font-size:10px;font-weight:400;color:%s;margin-top:2px">%s</div>'
                  '</div>'
                  % (fg if on else '#e5e7eb', bg if on else '#fff',
                     fg if on else '#6b7280', 'font-weight:700' if on else '', nm,
                     fg if on else '#9ca3af', sub))
    extra = ''
    if bill == '유료':
        extra = ('<div style="max-width:320px">%s'
                 '<div style="font-size:11.5px;color:#6b7280;margin-top:4px">'
                 '대교 최근 유료 발급: <b>₩4,800,000</b>'
                 '<span class="lnk" style="margin-left:6px">같은 금액 적용</span></div></div>'
                 % field('금액 (원)',
                         '<div class="inp%s">%s</div>'
                         % (' err' if err else '', '0' if err else '3500000'), True))
    elif bill == '체험':
        extra = ('<div style="max-width:320px">%s'
                 '<div style="font-size:11.5px;color:#92400e;margin-top:4px">'
                 '만료되면 목록에서 <b>(만료)</b>로 표시되고 상단에 경고가 뜹니다.</div></div>'
                 % field('체험 만료일 (기본 = 발급일 + 1개월)',
                         '<div class="inp">2026-09-25</div>'))
    elif bill == '무료':
        extra = ('<div style="font-size:12.5px;color:#166534">청구하지 않는 티켓으로 '
                 '기록됩니다. (사유는 아래 비고에 남겨 주세요)</div>')
    rec = ''
    if recent:
        rec = ('<div style="font-size:11.5px;color:#9ca3af;margin-top:10px">'
               '최근 등록: 2026-08-26 16:52 · 김순정</div>')
    return ('<div class="ovl"><div class="mdl w" style="width:620px">'
            '<div class="mh"><div class="mt">정산 등록 — 발급 141번 '
            '<span class="tag">TKT-05</span></div><div class="mx">✕</div></div>'
            '<div style="background:#f5f9ff;border:1px solid #bfdbfe;border-radius:9px;'
            'padding:10px 12px;font-size:12.5px;color:#1e3a8a;margin-bottom:14px">'
            '<b>대교</b> · App Key · 2026-08-26 16:40'
            '<div style="color:#6b7280;margin-top:3px">계정 daekyo_edit@daekyo.com · '
            'CasterN · PDS3 S3/O212/B0~99 · 무제한</div></div>'
            '<div style="font-size:12px;color:#6b7280;margin-bottom:6px">과금 유형 '
            '<span style="color:#9ca3af">· 업체·티켓마다 다르게 등록할 수 있습니다</span></div>'
            '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;'
            'margin-bottom:14px">%s</div>%s'
            '<div style="margin-top:12px">%s</div>%s'
            '<div class="mf"><div class="btn gho">취소</div>'
            '<div class="btn pri">저장</div></div></div></div>'
            % (cards, extra,
               field('비고 (사유·계약 정보)',
                     '<div class="inp ph">예) 2026 연간 계약 포함 · 데모 제공</div>'), rec))


def alertbox(msg):
    return ('<div class="ovl"><div class="mdl">'
            '<div class="mh"><div class="mt">확인</div><div class="mx">✕</div></div>'
            '<div style="font-size:13px;color:#374151;line-height:1.7">%s</div>'
            '<div class="mf"><div class="btn pri">확인</div></div></div></div>' % msg)


NAV = [('사이드바 [N Key 발급]', '클릭', '<code>TKT-01</code>', '고객사 선택 유지'),
       ('사이드바 [계정 발급]', '클릭', '<code>TKT-03</code>', '')]

H = 1120


def build():
    B = []

    B.append((
        'S1', 'Key 발급 정산 목록 — 기본', '기본',
        '좌측 메뉴 <b>[티켓 발급] ▸ [Key 발급 정산]</b>(<code>/tickets/list</code>) 으로 들어온다. '
        '요약 5칸 → 필터 → 10열 표 순서이며 <b>최근순</b>으로 정렬되어 있다. '
        '요약은 <b>필터를 반영한 결과</b> 기준으로 다시 계산된다.',
        frame('TKT-04', 'Key 발급 정산', content(), height=H),
        [('요약 5칸', '표시', '—',
          '발급 티켓 · 유료 합계 · 유료 건수 · 무료/체험 · <b>정산 미등록</b>(0이 아니면 빨강)'),
         ('No', '표시', '—', '발급 번호 — <b>삭제해도 다시 쓰지 않는다</b>'),
         ('[정산 등록]', '클릭', 'S8 <code>TKT-05</code>', '과금 유형·금액 등록'),
         ('[Key 정보]', '클릭', 'S7 <code>TKT-02</code>', '발급된 티켓의 <b>저장값</b>'),
         ('[삭제]', '클릭', 'S13 확인창', '')] + NAV))

    B.append((
        'S2', '체험 만료 경고 · 대장 배지', '경고',
        '체험 만료 건이 있으면 목록 위에 <b>빨간 배너</b>가 뜬다. '
        '정산 열의 체험 행은 아래 줄에 <b>~만료일 (D-n)</b> 을 보여주고, '
        '기한이 지나면 <b>(만료)</b> 빨강으로 바뀐다. '
        'nkey(HLP) 발급 대장에서 가져온 과거 이력은 고객사명 옆에 <b>대장</b> 배지가 붙는다.',
        frame('TKT-04', 'Key 발급 정산', content(warn=True), height=H + 60),
        [('배너', '표시', '—',
          '<b>⚠ 체험 기간이 만료된 티켓 1건 — 유료 전환 또는 회수 여부를 확인하세요.</b>'),
         ('체험 진행 중', '표시', '—', '<b>~2026-09-25 (D-29)</b> 주황'),
         ('체험 만료', '표시', '—', '<b>~2026-07-31 (만료)</b> 빨강'),
         ('대장 배지', 'hover', '툴팁',
          '<b>nkey(HLP) 발급 대장에서 가져온 과거 이력</b>'),
         ('대장 이력', '참고', '—', '발급인이 비어 있어 <b>-</b> 로 표시된다')] + NAV))

    B.append((
        'S3', '필터 — 종류 · 정산 · 출처', '필터',
        '필터는 한 줄에 이어지고 구분선(<b>|</b>)으로 묶음이 나뉜다. '
        '⚠ <b>정산 필터에는 「체험」이 없다</b> — <code>정산 전체 · 미정 · 유료 · 무료</code> 4개뿐이다. '
        '고객사 목록에는 <b>발급 이력이 있는 고객사만</b> 나온다.',
        frame('TKT-04', 'Key 발급 정산',
              content(kind='App Key', bill='유료', src='신규발급',
                      rows=(ROWS[1],),
                      kpi=(('발급 티켓', '1', '#111827'), ('유료 합계', '₩3,500,000', '#1d4ed8'),
                           ('유료 건수', '1건', '#2563eb'), ('무료 / 체험', '0 / 0건', '#166534'),
                           ('정산 미등록', '0건', '#9ca3af'))),
              height=H - 200),
        [('고객사', '선택', '해당 고객사만', '기본 <b>고객사 전체</b>'),
         ('종류', '클릭', '전체 / N Key / App Key', ''),
         ('정산', '클릭', '정산 전체 / 미정 / 유료 / 무료',
          '<b>체험은 필터로 고를 수 없다</b>'),
         ('출처', '클릭', '전체 / 대장 / 신규발급',
          '대장 = nkey(HLP) 발급 대장 · 신규발급 = 이 화면에서 발급한 티켓'),
         ('검색', '입력', '발급 내용 + 발급인', '<b>고객사·내용 검색</b>'),
         ('요약', '자동', '재계산', '필터 결과 기준으로 5칸이 모두 다시 계산된다')] + NAV))

    B.append((
        'S4', '정렬 — 머리글 클릭', '분기',
        '정렬 가능한 열은 <b>발급일시 · 고객사 · 발급인</b> 3개다. '
        '머리글을 누르면 오름/내림이 바뀐다. 정렬 중인 열은 <b>▲ / ▼</b>(파랑), '
        '나머지는 <b>↕</b>(회색)로 표시된다. 기본은 <b>발급일시 내림차순</b>.',
        frame('TKT-04', 'Key 발급 정산',
              content(sort=('company', 1),
                      rows=(ROWS[2], ROWS[1], ROWS[4], ROWS[3], ROWS[0], ROWS[5])),
              height=H),
        [('발급일시', '클릭', '오름 ⇄ 내림', '기본값은 <b>내림차순(최근순)</b>'),
         ('고객사', '클릭', '가나다순', '한국어 정렬'),
         ('발급인', '클릭', '가나다순', ''),
         ('정렬 안 된 열', '표시', '—', '<b>↕</b> 회색'),
         ('No · 종류 · 금액 등', '클릭', '<b>동작 없음</b>', '정렬 대상이 아니다')] + NAV))

    B.append((
        'S5', '필터 결과 없음', '빈 상태',
        '필터에 맞는 티켓이 없을 때. 표에는 안내만 남고 <b>요약 5칸은 0건 기준</b>으로 '
        '다시 계산된다.',
        frame('TKT-04', 'Key 발급 정산',
              content(kind='App Key', bill='무료', empty='filter',
                      kpi=(('발급 티켓', '0', '#111827'), ('유료 합계', '₩0', '#1d4ed8'),
                           ('유료 건수', '0건', '#2563eb'), ('무료 / 체험', '0 / 0건', '#166534'),
                           ('정산 미등록', '0건', '#9ca3af'))),
              height=H - 320),
        [('표', '표시', '—', '<b>필터에 맞는 티켓이 없습니다.</b>'),
         ('요약', '자동', '0건 기준', '정산 미등록도 0이라 회색으로 바뀐다'),
         ('해제', '필터 클릭', 'S1', '<b>일괄 해제 버튼은 없다</b> — 칩을 각각 [전체]로 되돌린다')]
        + NAV))

    B.append((
        'S6', '발급 이력 없음', '빈 상태',
        '아직 한 건도 발급하지 않은 상태. 필터 결과 없음(S5)과 <b>문구가 다르다</b>.',
        frame('TKT-04', 'Key 발급 정산',
              content(empty='none',
                      kpi=(('발급 티켓', '0', '#111827'), ('유료 합계', '₩0', '#1d4ed8'),
                           ('유료 건수', '0건', '#2563eb'), ('무료 / 체험', '0 / 0건', '#166534'),
                           ('정산 미등록', '0건', '#9ca3af'))),
              height=H - 320),
        [('표', '표시', '—',
          '<b>아직 발급된 티켓이 없습니다. 왼쪽 [티켓 발급] 메뉴의 [N Key 발급] 또는 '
          '[계정 발급]에서 발급하세요.</b>'),
         ('해결', '이동', '<code>TKT-01</code> / <code>TKT-03</code>', '발급 후 이 목록에 쌓인다')]
        + NAV))

    B.append((
        'S7', 'TKT-02 · Key 정보 (발급된 값)', '모달',
        '<code>TKT-01</code> 의 [🔍 Key 정보 확인]과 <b>같은 모달</b>이지만, '
        '여기서는 <b>이미 발급된 티켓에 저장된 값</b>을 보여준다. '
        '화면 구성은 동일하고 데이터 출처만 다르다.',
        frame('TKT-04', 'Key 발급 정산', content(), overlay=tkt02('input'), height=H),
        [('[Key 정보]', '클릭', '저장값 표', '발급 당시 기록된 항목 그대로'),
         ('항목 검색', '입력', '행 필터', ''),
         ('[표 복사]', '클릭', '클립보드', ''),
         ('[📂 Key 불러오기]', '클릭', '파일 값',
          '고객사가 보관 중인 <code>.json</code> 과 대조할 때'),
         ('[닫기] · ✕', '클릭', '<code>TKT-04</code>', '목록으로 복귀')]))

    B.append((
        'S8', 'TKT-05 · 정산 등록 — 미정', '모달',
        '행의 <b>[정산 등록]</b> 으로 열린다. 상단 파란 박스에 <b>대상 티켓</b>(고객사 · 종류 · '
        '발급일시 · 발급 내용)이 나온다. 과금 유형은 <b>미정 / 유료 / 무료 / 체험</b> 4종이며 '
        '업체·티켓마다 다르게 등록할 수 있다. <b>미정</b> 은 추가 입력이 없다.',
        frame('TKT-04', 'Key 발급 정산', content(), overlay=tkt05('미정'), height=H),
        [('대상 티켓', '표시', '—', '잘못 열었으면 [취소]로 닫는다'),
         ('과금 유형', '클릭', 'S9~S11', '선택한 칸만 색이 채워진다'),
         ('미정', '선택', '추가 입력 없음',
          '<code>TKT-04</code> 상단 <b>정산 미등록</b> 건수에 포함된 상태 유지'),
         ('비고', '입력', '—', '사유·계약 정보'),
         ('최근 등록', '표시', '—', '이미 등록한 이력이 있으면 <b>일시 · 등록자</b>'),
         ('[저장]', '클릭', '<code>TKT-04</code> 갱신',
          '목록의 정산·금액·비고가 즉시 바뀌고 <code>LOG-01</code> 에 기록'),
         ('[취소] · ✕', '클릭', '<code>TKT-04</code>', '변경 없음')]))

    B.append((
        'S9', 'TKT-05 · 유료', '모달',
        '<b>금액(원)</b> 입력이 나타난다. 같은 고객사의 <b>최근 유료 금액</b>이 함께 표시되어 '
        '<b>[같은 금액 적용]</b> 으로 그대로 가져올 수 있다 — 업체별 단가 참고용이다.',
        frame('TKT-04', 'Key 발급 정산', content(), overlay=tkt05('유료'), height=H),
        [('금액 (원) *', '입력', '—', '<b>0보다 커야 한다</b> · 1만 원 단위로 오르내린다'),
         ('최근 유료 발급', '표시', '—', '같은 고객사의 직전 유료 건 금액'),
         ('[같은 금액 적용]', '클릭', '금액 채움', ''),
         ('금액 0 · 미입력', '[저장]', 'S12 확인창', '<b>유료는 금액을 입력해야 합니다.</b>'),
         ('[저장]', '클릭', '목록 갱신', '정산 <b>유료</b> + 금액이 파랑으로 표시된다')]))

    B.append((
        'S10', 'TKT-05 · 무료', '모달',
        '청구하지 않는 티켓. 추가 입력은 없고 <b>초록 안내</b>만 나온다. '
        '사유는 비고에 남긴다.',
        frame('TKT-04', 'Key 발급 정산', content(), overlay=tkt05('무료'), height=H),
        [('무료', '선택', '안내 표시',
          '<b>청구하지 않는 티켓으로 기록됩니다. (사유는 아래 비고에 남겨 주세요)</b>'),
         ('비고', '입력', '—', '무료 사유를 남기는 자리'),
         ('[저장]', '클릭', '목록 갱신', '금액 열은 <b>-</b> 로 남는다')]))

    B.append((
        'S11', 'TKT-05 · 체험', '모달',
        '<b>체험 만료일</b> 입력이 나타난다. 기본값은 <b>발급일 + 1개월</b>이며 바꿀 수 있다. '
        '만료되면 목록에서 <b>(만료)</b> 로 바뀌고 상단 배너(S2)가 뜬다.',
        frame('TKT-04', 'Key 발급 정산', content(), overlay=tkt05('체험'), height=H),
        [('체험 만료일', '선택', '—', '기본 = <b>발급일 + 1개월</b>'),
         ('안내', '표시', '—',
          '<b>만료되면 목록에서 (만료)로 표시되고 상단에 경고가 뜹니다.</b>'),
         ('[저장]', '클릭', '목록 갱신', '정산 열에 <b>체험</b> + <b>~만료일 (D-n)</b>'),
         ('체험 필터', '참고', '<b>없음</b>', '정산 필터에서 체험만 골라볼 수는 없다')]))

    B.append((
        'S12', 'TKT-05 · 금액 오류 확인창', '오류',
        '유료를 골랐는데 금액이 <b>0 이하</b>면 저장되지 않는다. '
        '확인창을 닫으면 모달은 그대로 남아 금액을 고칠 수 있다.',
        frame('TKT-04', 'Key 발급 정산',
              content(),
              overlay=tkt05('유료', err=True)
                      + alertbox('유료는 금액을 입력해야 합니다.'),
              height=H),
        [('[저장]', '클릭', '확인창', '<b>유료는 금액을 입력해야 합니다.</b>'),
         ('[확인]', '클릭', 'S9 복귀', '입력값은 그대로 남는다'),
         ('다른 검증', '—', '<b>없음</b>',
          '비고·체험 만료일에는 별도 검증이 없다')]))

    B.append((
        'S13', '발급 기록 삭제 확인창', '확인창',
        '발급 기록을 목록에서 제거한다. <b>발급 번호는 다시 쓰이지 않는다.</b>',
        frame('TKT-04', 'Key 발급 정산', content(),
              overlay=alertbox('발급 141번 기록을 삭제할까요?'), height=H),
        [('[삭제]', '클릭', '확인창', '<b>발급 {No}번 기록을 삭제할까요?</b>'),
         ('[확인]', '클릭', '목록에서 제거', '요약 5칸이 다시 계산된다'),
         ('[취소]', '클릭', '<code>TKT-04</code>', '변경 없음'),
         ('발급 번호', '참고', '—', '삭제해도 <b>재사용하지 않는다</b>'),
         ('키 회수', '—', '<b>미결</b>',
          '⚠ 목록에서 지워도 <b>이미 나간 티켓 파일·App Key 는 무효화되지 않는다</b>')]))

    intro = ('발급된 티켓을 모아 보고 <b>정산(과금)</b> 을 등록하는 화면이다. '
             '이 화면만 <b>폭 제한 없이</b> 전체를 쓴다(N Key·App Key 발급 폼은 900px 제한).<br>'
             'nkey(HLP) 발급 대장에서 가져온 <b>과거 이력</b>과 이 시스템에서 발급한 '
             '<b>신규 발급</b>이 한 목록에 섞여 있고, <b>대장</b> 배지와 출처 필터로 구분한다.<br>'
             'S7 은 <code>TKT-02</code> Key 정보 확인, S8~S12 는 <code>TKT-05</code> 정산 등록 '
             '모달이다.')
    return page(CODE, NAME, PRD, intro, B)
