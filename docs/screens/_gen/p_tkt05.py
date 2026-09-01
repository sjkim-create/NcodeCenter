# -*- coding: utf-8 -*-
"""TKT-05 발급 상세·수정 — 실제 화면 구조 그대로.

TKT-03 Key 관리 목록에서 발급 한 건을 열어 기록을 바로잡고 정산을 등록한다.
탭 2개(발급 기본정보 / 정산 정보)이며 [저장] 한 번으로 두 탭이 함께 기록된다.
폐기된 '정산 등록 모달'과 'Key 정보 확인 모달'의 기능이 이 화면으로 흡수됐다.
N Key · App Key 를 같은 화면으로 연다.
"""
from shell import page, frame
from p_tkt01 import field

CODE, NAME = 'TKT-05', '발급 상세·수정'
PRD = 'docs/prd/TKT-05_발급 상세·수정.md'

BILL = {'미정': ('#f3f4f6', '#6b7280'), '유료': ('#eef6ff', '#1d4ed8'),
        '무료': ('#dcfce7', '#166534'), '체험': ('#fef3c7', '#92400e')}
KINDS = (('미정', '미등록'), ('유료', '금액 입력'), ('무료', '청구 없음'), ('체험', '1개월'))

# 발급 당시 파라미터 — 종류에 따라 항목 구성이 다르다
NKEY_ROWS = (('Company Name', '웅진씽크빅'), ('Issued Time', '20260827'),
             ('Valid Until Time', '99999999 (무제한)'), ('Section', '3'), ('Owner', '17'),
             ('Ticket Version', '1'), ('Book Start', '400'), ('Book Volume', '100'),
             ('Page Start', '1'), ('Page Volume', '4096'), ('Code Type', 'PDS2'),
             ('TicketType', 'Unlimited'), ('Separate Each Book', 'N (1개 티켓 병합)'))
APP_ROWS = (('Company Name', '대교'), ('Account Id', 'daekyo_edit@daekyo.com'),
            ('Service', 'CasterN'), ('Usage', 'CasterN'),
            ('AppKey', 'ncc_live_8f3a1c…'), ('Code Type', 'PDS3'),
            ('Section', '3'), ('Owner', '212'), ('Book Start', '0'), ('Book End', '99'),
            ('Page Start', '1'), ('Page End', '4096'), ('ValidUntil', '무제한'),
            ('IssuedAt', '2026-08-26 16:40'))


def tag(text, bg, fg, bold=True):
    return ('<span style="font-size:11px;background:%s;color:%s;border-radius:5px;'
            'padding:2px 7px;white-space:nowrap;%s">%s</span>'
            % (bg, fg, 'font-weight:700' if bold else '', text))


def head(kind='N Key', no=142, ledger=False):
    kb = tag(kind, '#fef3c7' if kind == 'App Key' else '#eef6ff',
             '#92400e' if kind == 'App Key' else '#2563eb')
    led = (' ' + tag('대장', '#f3f4f6', '#9ca3af', False)) if ledger else ''
    return ('<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;'
            'flex-wrap:wrap"><div style="font-weight:700;font-size:14px">발급 상세 · 수정</div>'
            '%s<code style="font-family:ui-monospace,monospace;color:#374151;'
            'font-size:12.5px">발급 %d번</code>%s%s</div>'
            % (kb, no, tag('웅진씽크빅' if kind == 'N Key' else '대교', '#f3f4f6', '#6b7280', False), led))


def tabs(active='base'):
    out = ''
    for v, label in (('base', '발급 기본정보'), ('bill', '정산 정보')):
        on = (v == active)
        out += ('<div style="padding:9px 16px;font-size:13px;border-bottom:2px solid %s;'
                'color:%s;%s">%s</div>'
                % ('#5f8ff0' if on else 'transparent', '#111827' if on else '#6b7280',
                   'font-weight:700' if on else '', label))
    return ('<div style="display:flex;border-bottom:1px solid #eef0f4;margin-bottom:14px">'
            '%s</div>' % out)


def locked(v):
    return '<div class="inp" style="background:#f7f8fa;color:#6b7280">%s</div>' % v


def base_tab(kind='N Key', summary=None, err=False):
    rows = NKEY_ROWS if kind == 'N Key' else APP_ROWS
    s = summary if summary is not None else (
        'PDS2 S3/O17/B400~499 · Book 100권 · P1~4096 · 병합 1장 · 유효 무제한'
        if kind == 'N Key' else
        '계정 daekyo_edit@daekyo.com · CasterN · PDS3 S3/O212/B0~99 · 무제한')
    fixed = ('<div class="g3">' + field('고객사', locked('웅진씽크빅' if kind == 'N Key' else '대교'))
             + field('발급일시', locked('2026-08-27 10:12')) + field('발급인', locked('김순정'))
             + '</div>')
    sm = ('<div style="margin-top:12px">'
          + field('발급 내용 (목록 표기)',
                  '<div class="inp%s">%s</div>' % (' err' if err else '', s or ''), True)
          + '</div>')
    tbl = ''.join('<tr><td style="padding:6px 12px;color:#374151;font-weight:600;'
                  'font-family:ui-monospace,monospace">%s</td>'
                  '<td style="padding:5px 10px"><div class="inp" style="padding:6px 9px;'
                  'font-size:12.5px">%s</div></td></tr>' % kv for kv in rows)
    key = ('<div style="margin-top:16px">'
           '<div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:6px">'
           'Key 정보 <span style="font-weight:400;color:#9ca3af">· %d개 항목 · '
           '값만 수정합니다</span></div>'
           '<div style="border:1px solid #eef0f4;border-radius:9px;overflow:hidden">'
           '<table style="width:100%%;border-collapse:collapse;font-size:12.5px">'
           '<tr style="background:#fafbfc"><th style="text-align:left;width:240px;'
           'padding:8px 12px;color:#6b7280;font-size:11.5px">Key</th>'
           '<th style="text-align:left;padding:8px 12px;color:#6b7280;font-size:11.5px">'
           'Value</th></tr>%s</table></div>'
           '<div style="font-size:11px;color:#9ca3af;margin-top:6px;line-height:1.6">'
           '이미 내려받은 키 파일은 바뀌지 않습니다. 여기 수정은 <b>발급 원장의 기록</b>을 '
           '바로잡는 용도입니다.</div></div>' % (len(rows), tbl))
    return fixed + sm + key


def bill_tab(bill='미정', err=False, billed=True):
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
        extra = ('<div style="max-width:320px">%s</div>'
                 % field('금액 (원)', '<div class="inp%s">%s</div>'
                         % (' err' if err else '', '0' if err else '3500000'), True))
    elif bill == '체험':
        extra = ('<div style="max-width:320px">%s'
                 '<div style="font-size:11.5px;color:#92400e;margin-top:4px">'
                 '만료되면 목록에서 <b>(만료)</b>로 표시되고 상단에 경고가 뜹니다.</div></div>'
                 % field('체험 만료일 (기본 = 발급일 + 1개월)',
                         '<div class="inp">2026-09-26</div>'))
    elif bill == '무료':
        extra = ('<div style="font-size:12.5px;color:#166534">청구하지 않는 티켓으로 '
                 '기록됩니다. (사유는 아래 비고에 남겨 주세요)</div>')
    note = ('<div style="margin-top:12px">%s</div>'
            % field('비고 (사유·계약 정보)',
                    '<div class="inp ph">예) 2026 연간 계약 포함 · 데모 제공</div>'))
    last = ('<div style="font-size:11.5px;color:#9ca3af;margin-top:10px">'
            '최근 등록: 2026-08-26 16:52 · 김순정</div>') if billed else ''
    return ('<div style="font-size:12px;color:#6b7280;margin-bottom:6px">과금 유형 '
            '<span style="color:#9ca3af">· 업체·티켓마다 다르게 등록할 수 있습니다</span></div>'
            '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;'
            'margin-bottom:14px">%s</div>%s%s%s' % (cards, extra, note, last))


def form(tab='base', kind='N Key', bill='미정', err=None, toast=None, summary=None,
         ledger=False, no=142):
    body = tabs(tab)
    if tab == 'base':
        body += base_tab(kind, summary, err == 'summary')
    else:
        body += bill_tab(bill, err == 'amount')
    body += ('<div style="display:flex;align-items:center;gap:8px;margin-top:18px;'
             'padding-top:14px;border-top:1px solid #eef0f4">'
             '<div class="btn gho" style="color:#dc2626;border-color:#fecaca">발급 기록 삭제</div>'
             '<span style="flex:1"></span><div class="btn gho">목록</div>'
             '<div class="btn pri">저장</div></div>')
    if toast:
        color = '#047857' if toast[0] == 'ok' else '#dc2626'
        body += ('<div style="margin-top:10px;font-size:12.5px;color:%s;text-align:right">'
                 '%s</div>' % (color, toast[1]))
    return ('<div style="max-width:900px"><div class="card"><div class="bd">%s%s</div></div>'
            '</div>' % (head(kind, no, ledger), body))


def notfound():
    return ('<div style="max-width:900px"><div class="card"><div class="bd" '
            'style="font-size:13px;color:#6b7280;padding:24px">발급 기록을 찾을 수 없습니다. '
            '<span style="color:#2563eb">Key 관리 목록으로</span></div></div></div>')


def dlg():
    return ('<div class="ovl"><div class="mdl" style="width:460px">'
            '<div class="mh"><div class="mt">발급 기록 삭제</div><div class="mx">✕</div></div>'
            '<div style="font-size:13px;color:#374151;line-height:1.8">'
            '발급 <b>142번</b> 기록을 삭제할까요?</div>'
            '<div class="mf"><div class="btn gho">취소</div>'
            '<div class="btn dgr">삭제</div></div></div></div>')


def F(inner, h=1180, overlay=''):
    return frame('TKT-03', '발급 상세 · 수정', inner, height=h, overlay=overlay)


NAV = [('[목록]', '클릭', '<code>TKT-03</code>', 'Key 관리 목록'),
       ('저장(자동)', '—', '<code>LOG-01</code>', '활동 로그에 <b>발급 수정</b> 기록')]


def build():
    B = []

    B.append((
        'S1', '발급 기본정보 탭 — 기본', '기본',
        '<code>TKT-03</code> 목록의 <b>발급번호 · 발급 내용 · [상세]</b> 로 들어오면 이 탭이 '
        '먼저 열린다. <b>고객사 · 발급일시 · 발급인은 원장 기준값이라 잠금</b>이고, '
        '발급 내용과 Key 정보만 고친다. 머리말에 종류 · 발급 번호 · 고객사가 붙는다.',
        F(form()),
        [('고객사 · 발급일시 · 발급인', '표시', '<b>잠금</b>', '원장 기준값'),
         ('발급 내용', '입력', '목록 표기', '<b>필수</b>'),
         ('Key 정보', '조회', '13개 항목', 'Key · Value 2열'),
         ('탭 전환', '클릭', '정산 정보', '입력 중 내용은 유지된다'),
         ('안내 문구', '표시', '—',
          '<b>이미 내려받은 키 파일은 바뀌지 않습니다. 여기 수정은 발급 원장의 기록을 '
          '바로잡는 용도입니다.</b>')] + NAV))

    B.append((
        'S2', 'Key 정보 값 수정', '분기',
        '발급 당시 파라미터를 <b>값만</b> 고친다. <b>항목을 추가하거나 지울 수 없다.</b> '
        '원래 숫자였던 항목은 저장할 때 숫자로 되돌려 형식이 흐트러지지 않게 한다.',
        F(form(summary='PDS2 S3/O17/B400~499 · Book 100권 · P1~4096 · 병합 1장 · 유효 261231')),
        [('Value 칸', '입력', '값 수정', '항목명(Key)은 고칠 수 없다'),
         ('항목 추가·삭제', '—', '<b>불가</b>', '발급 시 기록된 구성을 유지한다'),
         ('숫자 항목', '저장', '숫자로 복원', 'Section · Owner · Book Start 등'),
         ('키 파일', '—', '<b>바뀌지 않음</b>', '발급 시점에 이미 내려받았다')]))

    B.append((
        'S3', '정산 정보 탭 — 미정', '기본',
        '<code>TKT-03</code> 목록의 <b>[정산]</b> 으로 들어오면 <b>이 탭이 선택된 상태</b>로 '
        '열린다. <b>미정</b> 은 아직 과금을 결정하지 않은 상태이며 추가 입력이 없다. '
        '목록 상단의 <b>정산 미등록</b> 건수에 포함된다.',
        F(form(tab='bill', bill='미정'), h=880),
        [('진입', '—', '정산 탭 자동 선택', '목록 [정산] 로 들어온 경우'),
         ('과금 유형', '클릭', '미정 / 유료 / 무료 / 체험', '4칸 중 하나'),
         ('미정', '선택', '추가 입력 없음', '목록 <b>정산 미등록</b> 에 집계'),
         ('비고', '입력', '사유·계약 정보', '유형과 무관하게 유지된다')] + NAV))

    B.append((
        'S4', '정산 정보 탭 — 유료', '분기',
        '<b>유료</b> 를 고르면 <b>금액(원)</b> 입력칸이 나온다. 금액은 필수이며 '
        '목록의 <b>유료 합계</b> 에 더해진다.',
        F(form(tab='bill', bill='유료'), h=920),
        [('유료', '선택', '금액 입력칸', '<b>필수</b>'),
         ('금액', '입력', '원 단위', '목록 <b>유료 합계</b> 에 반영'),
         ('다른 유형으로 변경', '—', '금액 0 으로 복원', 'PRD §4.5(나)')]))

    B.append((
        'S5', '정산 정보 탭 — 체험', '분기',
        '<b>체험</b> 을 고르면 <b>체험 만료일</b> 이 나온다. 기본값은 <b>발급일 + 1개월</b>이고 '
        '달력으로 바꿀 수 있다. 만료되면 목록에서 <b>(만료)</b> 로 표시되고 상단에 경고가 뜬다.',
        F(form(tab='bill', bill='체험'), h=940),
        [('체험', '선택', '만료일 입력칸', ''),
         ('만료일 기본값', '자동', '<b>발급일 + 1개월</b>',
          '예) 발급 2026-08-26 → 2026-09-26'),
         ('만료 후', '—', '<code>TKT-03</code> 경고', '<b>(만료)</b> 표시 + 목록 상단 배너'),
         ('다른 유형으로 변경', '—', '만료일 비움', 'PRD §4.5(나)')]))

    B.append((
        'S6', '정산 정보 탭 — 무료', '분기',
        '<b>무료</b> 는 청구하지 않는 티켓으로 기록된다. 추가 입력이 없고 '
        '<b>사유는 비고</b> 에 남긴다.',
        F(form(tab='bill', bill='무료'), h=880),
        [('무료', '선택', '추가 입력 없음',
          '<b>청구하지 않는 티켓으로 기록됩니다. (사유는 아래 비고에 남겨 주세요)</b>'),
         ('비고', '입력', '사유', '예) 데모 제공'),
         ('목록 금액', '표시', '<b>-</b>', '유료가 아니면 금액을 표기하지 않는다')]))

    B.append((
        'S7', '검증 실패 — 발급 내용 비움', '검증',
        '<b>[저장]</b> 은 두 탭을 함께 기록한다. 발급 내용이 비어 있으면 '
        '<b>발급 기본정보 탭으로 자동 전환</b>하고 그 자리에서 멈춘다.',
        F(form(tab='base', summary='', err='summary',
               toast=('err', '발급 내용을 입력하세요.'))),
        [('[저장]', '클릭', '① 발급 내용 검사', '비었으면 중단'),
         ('탭', '자동', '<b>발급 기본정보</b> 로 전환', '어느 탭에 있든 해당 탭을 연다'),
         ('메시지', '표시', '—', '<b>발급 내용을 입력하세요.</b>')]))

    B.append((
        'S8', '검증 실패 — 유료 금액 0', '검증',
        '유료인데 금액이 0이면 <b>정산 정보 탭으로 자동 전환</b>하고 멈춘다. '
        '발급 기본정보 탭에서 저장을 눌러도 마찬가지다.',
        F(form(tab='bill', bill='유료', err='amount',
               toast=('err', '유료는 금액을 입력해야 합니다.')), h=920),
        [('[저장]', '클릭', '② 유료 금액 검사', '0 이면 중단'),
         ('탭', '자동', '<b>정산 정보</b> 로 전환', ''),
         ('메시지', '표시', '—', '<b>유료는 금액을 입력해야 합니다.</b>')]))

    B.append((
        'S9', '저장 완료', '완료',
        '검증을 통과하면 <b>발급 기본정보와 정산 정보가 함께</b> 기록된다. '
        '<b>목록으로 돌아가지 않고 이 화면에 머무른다</b> — 이어서 다른 항목을 고칠 수 있다. '
        '<code>LOG-01</code> 활동 로그에 <b>발급 수정</b> 으로 남는다.',
        F(form(tab='bill', bill='유료',
               toast=('ok', '발급 기본정보와 정산 정보가 저장되었습니다.')), h=920),
        [('[저장]', '클릭', '두 탭 함께 기록', '탭은 저장 단위가 아니다'),
         ('메시지', '표시', '—', '<b>발급 기본정보와 정산 정보가 저장되었습니다.</b>'),
         ('화면', '—', '머무름', '목록으로 이동하지 않는다'),
         ('활동 로그', '자동', '<code>LOG-01</code>', '<b>발급 수정</b>')] + NAV))

    B.append((
        'S10', 'App Key 건 열람', '변형',
        'App Key 발급 건도 <b>같은 화면</b>으로 연다. 머리말 종류 표기가 <b>App Key</b> 로 '
        '바뀌고 <b>Key 정보 항목 구성이 다르다</b> — 계정 ID · Service · AppKey 등이 들어간다. '
        '탭 구성과 저장 방식은 동일하다.',
        F(form(kind='App Key', no=141), h=1220),
        [('종류 표기', '표시', '<b>App Key</b>', 'N Key 와 구분'),
         ('Key 정보', '조회', '14개 항목', 'Account Id · Service · AppKey 포함'),
         ('발급 출처', '—', '<code>TKT-02</code>', '계정 등록·수정의 CasterN 탭에서 발급'),
         ('탭 · 저장', '—', '동일', 'N Key 와 같은 방식')]))

    B.append((
        'S11', '발급 기록 삭제 확인', '차단',
        '<b>[발급 기록 삭제]</b> 는 확인을 거친다. 삭제해도 <b>발급 번호는 다시 쓰지 않는다.</b>',
        F(form(), overlay=dlg()),
        [('[발급 기록 삭제]', '클릭', '확인창', '<b>발급 142번 기록을 삭제할까요?</b>'),
         ('[삭제]', '클릭', '<code>TKT-03</code>', '목록에서 제거 후 이동'),
         ('[취소] · ✕', '클릭', '변경 없음', '')]))

    B.append((
        'S12', '발급 기록 없음', '빈 상태',
        '삭제된 건이나 잘못된 주소로 들어온 경우. 목록으로 돌아가는 링크만 남는다.',
        F(notfound(), h=420),
        [('안내', '표시', '—', '<b>발급 기록을 찾을 수 없습니다.</b>'),
         ('[Key 관리 목록으로]', '클릭', '<code>TKT-03</code>', '목록으로 이동')]))

    intro = ('발급된 티켓 <b>한 건</b>을 열어 기록을 바로잡고 정산을 등록하는 화면이다. '
             '<b>N Key 와 App Key 를 같은 화면</b>으로 열며, 종류에 따라 머리말 표기와 '
             'Key 정보 항목 구성만 달라진다. 탭은 <b>발급 기본정보 / 정산 정보</b> 2개이고 '
             '<b>[저장] 한 번으로 두 탭이 함께 기록</b>된다 — 탭은 화면을 나눠 보여줄 뿐 '
             '저장 단위가 아니다. 폐기된 <b>정산 등록 모달</b>과 <b>Key 정보 확인 모달</b>의 '
             '기능이 이 화면으로 흡수됐다. 계산 규칙은 PRD §4.5.')
    return page(CODE, NAME, PRD, intro, B)
