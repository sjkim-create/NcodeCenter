# -*- coding: utf-8 -*-
"""TKT-01 App Key 관리 (계정 발급 · 계정 목록) — 실제 화면 구조 그대로.

요약 5칸 → 한 줄 필터(고객사·검색 + [＋ 계정 추가]) → 8열 표.
이 목록은 **티켓 고객사의 키 발급 계정만** 다룬다 `PC-123` `PC-128` — 인증 서비스·권한은 없다 `PC-131`.
등록·상세 수정은 TKT-02 (p_tkt02.py).
"""
from shell import page, frame
from p_tkt01 import sel

CODE, NAME = 'TKT-01', 'App Key 관리 (계정 발급)'
PRD = 'docs/prd/TKT-01_계정 발급.md'

# web/components/AccountsView.tsx (AccountsListView) — 키 발급 계정만 `PC-128`
#   (고객사, ID(email), 이름, App Key, 코드 범위 수, 사용기간, 등록일)
# 고객사 = **티켓 고객사**(nkey(HLP) 대장 프로젝트명 + 티켓 화면 [＋ 신규 등록]분) — 고객사 관리와 별개 `PC-123`
# App Key 는 개수가 아니라 **키 값**(영문·숫자 29자)을 그대로 보여 준다 `PC-067` `PC-066`
# 코드 범위 = 그 키에 물린 S/O/B 범위 수(nkey 대장 이력 · SOBP 맵 (K) 할당에서 고른다) `PC-123`
# 개발팀 대장 시드 계정(네오랩 등 15건)은 **서비스 계정**이라 고객사 관리(MEM-02)로 옮겨 갔다 `PC-128`
ROWS = (
    ('InformDS', 'dev@informds.com', 'InformDS 개발팀',
     '7Kq2mX9vB4tR8nL1cW6pZ3hY5jD0f', 2, '2026-10-02 ~ 무제한', '2026-10-02'),
    ('KODION', 'app@kodion.co.kr', '김도윤',
     'aP4sE8gN2kV7uQ1rT9yH3wM6bC5xZ', 1, '2026-10-06 ~ 2027-10-05', '2026-10-06'),
    ('ICsolutions', 'key@icsolutions.com', 'IC Solutions',
     'R3dF7hJ1lK9oI5uY2tG8eW4qA6sZb', 3, '2026-10-08 ~ 무제한 … 외 2', '2026-10-08'),
    ('hyssos', 'support@hyssos.com', '',
     '', 0, '', '2026-10-10'),
    ('Wondrx', 'sdk@wondrx.io', 'Wondrx Inc.',
     'm2N8bV4cX6zL1kJ9hG3fD7sA5pQ0w', 1, '2026-10-13 ~ 2027-04-12', '2026-10-13'),
)

# 요약 5칸 — 모두 **키 발급 계정** 기준 · 마지막 칸 = 티켓 고객사 수 `PC-123` `PC-128`
KPI = (('등록 계정', '5', '#111827'), ('App Key 연동', '4', '#2563eb'),
       ('App Key 없음', '1', '#92400e'), ('발급 App Key', '4', '#7c3aed'),
       ('티켓 고객사', '5', '#0f766e'))


def tag(text, bg, fg, bold=True):
    return ('<span style="font-size:11px;background:' + bg + ';color:' + fg + ';'
            'border-radius:5px;padding:2px 7px;white-space:nowrap;'
            + ('font-weight:700' if bold else '') + '">' + text + '</span>')


def kpis(kpi=None):
    cards = ''
    for k, v, c in (kpi or KPI):
        cards += ('<div class="card" style="padding:10px 12px">'
                  '<div style="font-size:11px;color:#6b7280">' + k + '</div>'
                  '<div style="font-size:17px;font-weight:700;color:' + c + '">' + v
                  + '</div></div>')
    return ('<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;'
            'margin-bottom:12px">' + cards + '</div>')


def bar(company='고객사 전체', q='', count=5):
    srch = ('<div class="inp' + ('' if q else ' ph') + '" style="width:230px">'
            + (q or 'ID(email) · 이름 · 고객사 검색') + '</div>')
    return ('<div class="card" style="padding:10px 12px;margin-bottom:10px;display:flex;'
            'gap:8px;align-items:center;flex-wrap:wrap;font-size:12.5px">'
            + sel(company, w=200) + srch
            + '<span style="color:#9ca3af">' + str(count) + '건</span>'
            '<span style="flex:1"></span>'
            '<span class="btn pri">＋ 계정 추가</span></div>')


HEADS = ('고객사', 'ID (EMAIL)', '이름', 'App Key', '코드 범위', '사용기간', '등록일', '')


def table(rows=None, empty=None):
    th = ''.join('<th style="text-align:center">' + h + '</th>' for h in HEADS)
    body = ''
    if empty:
        msg = ('등록된 계정이 없습니다. [＋ 계정 추가]로 등록하세요.'
               if empty == 'none' else '조건에 맞는 계정이 없습니다.')
        body = ('<tr><td colspan="8" style="text-align:center;color:#9ca3af;'
                'padding:30px">' + msg + '</td></tr>')
    for (co, aid, nm, keys, nrange, period, at) in (ROWS if rows is None else rows):
        if keys:
            key_tag = ('<span style="font-family:ui-monospace,monospace;font-size:11px;'
                       'color:#2563eb">%s</span>' % keys)
        else:
            key_tag = tag('미발급', '#f3f4f6', '#9ca3af', bold=False)
        range_tag = (tag('%d개' % nrange, '#eef6ff', '#2563eb') if nrange
                     else '<span style="color:#c7cbd4">—</span>')
        period_txt = (period if period else '<span style="color:#c7cbd4">—</span>')
        body += ('<tr>'
                 '<td style="text-align:left;font-weight:600">' + co + '</td>'
                 '<td style="text-align:left"><span class="lnk" '
                 'style="font-family:ui-monospace,monospace;font-weight:600">' + aid
                 + '</span></td>'
                 '<td style="text-align:left">' + (nm or '—') + '</td>'
                 '<td style="white-space:nowrap">' + key_tag + '</td>'
                 '<td style="white-space:nowrap">' + range_tag + '</td>'
                 '<td style="font-family:ui-monospace,monospace;color:#6b7280;'
                 'white-space:nowrap;font-size:11.5px">' + period_txt + '</td>'
                 '<td style="font-family:ui-monospace,monospace;color:#6b7280">' + at
                 + '</td>'
                 '<td style="white-space:nowrap;text-align:right">'
                 '<span class="lnk">상세</span>'
                 '<span class="lnk" style="margin-left:6px;color:#dc2626">삭제</span>'
                 '</td></tr>')
    return ('<div class="card" style="padding:0;overflow:auto">'
            '<table style="text-align:center;min-width:1120px"><tr>' + th + '</tr>'
            + body + '</table></div>')


def content(kpi=None, company='고객사 전체', q='', count=5, rows=None, empty=None):
    return ('<div style="min-width:0">' + kpis(kpi) + bar(company, q, count)
            + table(rows, empty) + '</div>')


def scr(h=760, **kw):
    return frame('TKT-01', 'App Key 관리 (계정 발급)', content(**kw), height=h)


NAV = [('사이드바 [N Key 관리]', '클릭', '<code>TKT-03</code>',
        'N Key 발급 목록 · 등록은 목록의 추가 버튼으로 들어갑니다'),
       ('서비스 계정', '—', '<code>MEM-02</code> ▸ <b>계정 및 서비스 권한</b>',
        '서비스 로그인 계정·CasterN 권한은 고객사 관리에서 관리합니다 <code>PC-128</code>')]

ZERO_KPI = (('등록 계정', '0', '#111827'), ('App Key 연동', '0', '#2563eb'),
            ('App Key 없음', '0', '#92400e'), ('발급 App Key', '0', '#7c3aed'),
            ('티켓 고객사', '0', '#0f766e'))


def build():
    B = []

    B.append((
        'S1', '계정 목록 — 기본', '기본',
        '사이드바 <b>[티켓 발급] ▸ [App Key 관리 (계정 발급)]</b>(<code>/tickets/account</code>) 의 '
        '첫 화면입니다. <b>티켓 고객사의 키 발급 계정</b>을 한 표로 봅니다 <code>PC-128</code>. '
        '고객사는 고객사 관리(<code>MEM-01</code>)와 별개인 <b>티켓 고객사</b>입니다 <code>PC-123</code>. '
        '한 고객사에 계정을 <b>여러 개</b> 둘 수 있습니다 <code>PC-029</code>. '
        '<b>ID</b> 나 <b>[상세]</b> 를 누르면 <code>TKT-02</code> 상세·수정으로 갑니다. '
        '인증 서비스·권한은 이 화면에서 다루지 않습니다 <code>PC-131</code>.',
        scr(),
        [('[＋ 계정 추가]', '클릭', '<code>TKT-02</code> 등록',
          '<code>/tickets/account/new</code>'),
         ('ID (이메일) · [상세]', '클릭', '<code>TKT-02</code> 상세·수정',
          '<code>/tickets/account/{email}</code>'),
         ('[삭제]', '클릭', 'S5 확인창', '계정과 <b>연동 App Key가 함께</b> 삭제됩니다'),
         ('요약 5칸', '표시', '—', '등록 계정 · App Key 연동 · App Key 없음 · 발급 App Key · '
          '<b>티켓 고객사</b> — 모두 <b>키 발급 계정</b> 기준으로 셉니다 '
          '<code>PC-123</code> <code>PC-128</code>'),
         ('고객사 칸', '표시', '—',
          '<b>티켓 고객사</b> 이름(nkey 대장 프로젝트명 또는 티켓 화면에서 '
          '<b>[＋ 신규 등록]</b>한 고객사)을 표시합니다 <code>PC-123</code>'),
         ('레코드(행)', '클릭', '<code>TKT-02</code>',
          '<b>행 어디를 눌러도 계정 상세로 갑니다</b> <code>PC-053</code> · 행 안의 [상세]·[삭제]는 분리합니다'),
         ('App Key 칸', '표시', '—',
          '<b>발급된 키 값을 그대로</b> 보여 줍니다 <code>PC-067</code> — 영문·숫자 <b>29자</b> '
          '<code>PC-066</code> · 없으면 <b>미발급</b>'),
         ('코드 범위 칸', '표시', '—',
          '그 키에 물린 <b>S/O/B 범위 수</b>를 표시합니다 — 범위는 nkey 대장 이력과 SOBP 맵 '
          '<b>(K)</b> 할당에서 고릅니다 <code>PC-123</code> · 툴팁에 범위 전체'),
         ('사용기간 칸', '표시', '—',
          '첫 코드 범위(=티켓)의 <b>시작 ~ 끝</b>(무제한) · 여럿이면 <b>… 외 N</b> · 없으면 — '
          '<code>PC-118</code>'),
         ('등록일 칸', '표시', '—', '화면에서 계정을 등록한 날짜를 표시합니다'),
         ('App Key · 코드 범위 칸', '클릭', '<code>TKT-02</code> ▸ <b>App Key 발급</b> 탭',
          '항목마다 그 항목의 탭으로 갑니다 <code>PC-067</code>'),
         ('그 밖의 셀(행)', '클릭', '<code>TKT-02</code> ▸ <b>계정 정보</b> 탭',
          '기본 이동입니다 <code>PC-067</code>')] + NAV))

    B.append((
        'S2', '등록된 계정 없음', '기본',
        '아직 키 발급 계정이 하나도 없을 때입니다. 개발팀 대장 시드 계정은 서비스 계정이라 '
        '고객사 관리로 옮겨 갔으므로 <b>처음에는 이 상태로 시작합니다</b> <code>PC-128</code>. '
        '표 자리에 안내만 나오고 <b>[＋ 계정 추가]</b> 로 등록을 시작하세요.',
        scr(h=520, kpi=ZERO_KPI, count=0, rows=(), empty='none'),
        [('안내 문구', '표시', '—',
          '<b>등록된 계정이 없습니다. [＋ 계정 추가]로 등록하세요.</b>'),
         ('[＋ 계정 추가]', '클릭', '<code>TKT-02</code> 등록', '계정 수 제한은 없습니다')] + NAV))

    B.append((
        'S3', '필터 · 검색', '분기',
        '고객사 · 검색어로 목록을 좁힙니다. 검색은 '
        '<b>ID(email) · 이름 · 고객사</b> 를 함께 봅니다. 두 조건은 <b>동시에</b> 걸립니다.',
        scr(h=560, company='KODION', q='kodion', count=1, rows=ROWS[1:2]),
        [('고객사', '선택', '해당 고객사만',
          '<b>고객사 전체</b> + 키 발급 계정이 있는 <b>티켓 고객사</b>만 목록에 나옵니다 <code>PC-123</code>'),
         ('검색', '입력', '즉시 필터', 'ID(email) · 이름 · 고객사'),
         ('건수', '표시', '—', '필터 결과 건수를 표시합니다'),
         ('요약 5칸', '—', '고정',
          '요약은 <b>전체 키 발급 계정 기준</b>이며 필터의 영향을 받지 않습니다')] + NAV))

    B.append((
        'S4', '결과 없음', '차단',
        '조건에 맞는 계정이 없을 때입니다. 필터를 바꾸거나 계정을 새로 등록하세요.',
        scr(h=520, company='hyssos', q='test', count=0, rows=(), empty='filter'),
        [('안내 문구', '표시', '—', '<b>조건에 맞는 계정이 없습니다.</b>'),
         ('필터 해제', '선택', 'S1', '고객사를 전체로, 검색어를 비우면 S1 로 돌아갑니다')] + NAV))

    B.append((
        'S5', '계정 삭제 확인창', '확인창',
        '계정을 지우면 <b>연동된 App Key 도 함께</b> 사라집니다. '
        '되돌릴 수 없으므로 확인창으로 한 번 막습니다.',
        frame('TKT-01', 'App Key 관리 (계정 발급)', content(),
              overlay='<div class="ovl"><div class="mdl">'
                      '<div class="mh"><div class="mt">확인</div>'
                      '<div class="mx">✕</div></div>'
                      '<div style="font-size:13px;color:#374151;line-height:1.7">'
                      '이 계정과 연동 App Key를 삭제할까요?</div>'
                      '<div class="mf"><div class="btn gho">취소</div>'
                      '<div class="btn dan">삭제</div></div></div></div>',
              height=760),
        [('[삭제]', '클릭', '계정 + 키 삭제', '목록에서 사라집니다'),
         ('[취소]', '클릭', '<code>TKT-01</code>', '변경 없음'),
         ('키만 삭제', '—', '<code>TKT-02</code>',
          '개별 App Key 는 상세 화면에서 지우세요')] + NAV))

    intro = ('<b>App Key 관리 (계정 발급)</b> 는 <b>티켓 고객사의 키 발급 계정</b>을 관리하는 화면입니다 '
             '<code>PC-128</code>. 이 화면은 <b>목록</b>이며 등록·상세 수정은 <code>TKT-02</code> 입니다.<br>'
             '고객사는 nkey(HLP) 대장의 프로젝트명(17곳)과 티켓 화면에서 <b>[＋ 신규 등록]</b>한 '
             '<b>티켓 고객사</b>이며, 고객사 관리(<code>MEM-01</code>)와 별개입니다. 발급 범위(S/O/B)는 '
             'nkey 대장 이력과 SOBP 맵의 <b>(K)</b> 할당에서 고릅니다 <code>PC-123</code>.<br>'
             '계정은 <b>고객사당 여러 개</b>(제한 없음)를 둘 수 있고 ID(email)만 전체에서 '
             '유일하면 됩니다 <code>PC-029</code>. <b>App Key 발급은 선택</b>이라 '
             '계정만 먼저 만들어 두었다가 나중에 상세 화면에서 키를 붙일 수 있습니다.<br>'
             '인증 서비스·CasterN 권한은 이 화면에서 다루지 않습니다 <code>PC-131</code>. '
             '개발팀 대장 시드 계정(네오랩 등)은 <b>서비스 계정</b>이라 고객사 관리 상세(<code>MEM-02</code>)의 '
             '<b>계정 및 서비스 권한</b>으로 옮겨 갔습니다 <code>PC-128</code>.')
    return page(CODE, NAME, PRD, intro, B)
