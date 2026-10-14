# -*- coding: utf-8 -*-
"""TKT-02 계정 등록·수정 — 실제 화면 구조 그대로.

App Key 관리의 **키 발급 계정**(티켓 고객사) 화면이다 `PC-123` `PC-128`.
탭 2개 = 계정 정보 · App Key 발급 — 인증 서비스·권한은 삭제했다 `PC-131`
(서비스 로그인 계정과 CasterN 권한은 고객사 관리 `MEM-02` 의 계정 및 서비스 권한에서 다룬다).
등록(/tickets/account/new) : 계정 정보 + App Key 발급(선택) → [계정 추가]
상세·수정(/tickets/account/{email}) : 계정 정보 수정 + [저장] · App Key 코드 범위(=티켓) 발급·삭제
App Key 는 계정당 1개이고, 그 아래 코드 범위(=티켓)를 여러 건 발급한다 `PC-050` `PC-118`.
"""
from shell import page, frame
from p_tkt01 import sel, field

CODE, NAME = 'TKT-02', '계정 등록·수정'
PRD = 'docs/prd/TKT-02_계정 등록·수정.md'

CO = 'InformDS'                     # 티켓 고객사(nkey(HLP) 대장 프로젝트명) `PC-123`
ACC_ID = 'dev@informds.com'
KEY = '7Kq3xF9dR2mA8pZ1vT6bN4sJ0wG5c'   # 영문·숫자 29자 `PC-066`

# InformDS 의 발급 범위 — 대장 이력의 S/O/B `PC-123` (S, O, B, P)
RANGES = ((3, 302, '0~8,191', '0~511'),
          (3, 231, '8,100~8,191', '0~511'))

# 상세 화면의 App Key — 계정당 1개. 한 키에 **코드 범위(=티켓)를 여러 개** 물린다 `PC-118`.
#   (키, 생성일시, 범위 목록[(코드종류, 'S/O/B/P', 권수, 사용기간), ...])
KEYS = ((KEY, '2026-10-02 14:02',
         [('PDS3', 'S3/O302/B6808~7007/P0~511', '200권', '2026-10-02 ~ 무제한'),
          ('PDS3', 'S3/O231/B8100~8191/P0~511', '92권', '2026-10-14 ~ 2027-10-13')]),)

SC = {'S': '#5f8ff0', 'O': '#14b8a6', 'B': '#8b5cf6', 'P': '#f59e0b'}


def sb(k, v):
    return ('<span style="display:inline-flex;align-items:center;gap:5px;border:1px solid #eef0f4;'
            'border-radius:8px;padding:2px 7px 2px 2px;background:#fff;font-size:12px">'
            '<span style="background:%s;color:#fff;font-weight:700;font-size:10.5px;'
            'border-radius:6px;padding:2px 6px;min-width:12px;text-align:center">%s</span>'
            '<span style="font-family:ui-monospace,monospace;color:#111827">%s</span></span>'
            % (SC[k], k, v))


def chips(i):
    s, o, b, p = RANGES[i]
    return ('<span style="display:inline-flex;gap:6px;flex-wrap:wrap">%s%s%s%s</span>'
            % (sb('S', s), sb('O', o), sb('B', b), sb('P', p)))


def picker(state='closed', value=0):
    """발급 범위 (대장 이력 · SOBP 할당) — 접힘 트리거 + 펼침 목록 `PC-123`"""
    note = ('<div style="font-size:12px;color:#9ca3af;padding:9px 12px;border:1px solid #eef0f4;'
            'border-radius:10px;background:#fafbfc">%s</div>')
    if state == 'nocompany':
        return note % '고객사를 먼저 선택하세요.'
    if state == 'norange':
        return note % '이 고객사의 발급 범위(대장 이력)가 없습니다.'
    inner = (chips(value) if state != 'closed'
             else '<span style="color:#9ca3af;font-size:12.5px">- 범위 선택 -</span>')
    trig = ('<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;'
            'border:1px solid #e5e7eb;border-radius:10px;background:#fff;min-height:40px">'
            '%s<span style="margin-left:auto;color:#9ca3af;font-size:12px">%s</span></div>'
            % (inner, '▲' if state == 'open' else '▼'))
    if state != 'open':
        return trig
    rows = ''
    for i in range(len(RANGES)):
        on = (i == value)
        rows += ('<div style="display:flex;align-items:center;gap:8px;padding:9px 12px;background:%s;%s">'
                 '<span style="font-size:11px;color:%s;width:16px;text-align:center;font-weight:700">%d</span>'
                 '%s%s</div>'
                 % ('#eef6ff' if on else '#fff', 'border-top:1px solid #f1f3f6' if i else '',
                    '#2563eb' if on else '#9ca3af', i + 1, chips(i),
                    '<span style="margin-left:auto;font-size:11px;color:#2563eb;font-weight:700">✓</span>'
                    if on else ''))
    return (trig + '<div style="margin-top:4px;border:1px solid #e5e7eb;border-radius:10px;'
            'background:#fff;box-shadow:0 12px 32px rgba(15,23,42,.14);overflow:hidden">' + rows + '</div>')


def acc_tabs(active='계정 정보', key_badge=''):
    """화면 탭 — 계정 정보 · App Key 발급 (인증 서비스 및 권한은 삭제 `PC-131`)"""
    out = ''
    for label in ('계정 정보', 'App Key 발급'):
        on = (label == active)
        b = ''
        if label == 'App Key 발급' and key_badge:
            b = (' <span style="font-size:9.5px;background:#eef6ff;color:#2563eb;border-radius:5px;'
                 'padding:1px 6px;font-weight:700">%s</span>' % key_badge)
        out += ('<span style="padding:9px 16px;font-size:13px;border-bottom:2px solid %s;'
                'margin-bottom:-1px;color:%s;font-weight:%s">%s%s</span>'
                % ('#5f8ff0' if on else 'transparent', '#111827' if on else '#6b7280',
                   '700' if on else '400', label, b))
    return ('<div style="display:flex;border-bottom:1px solid #eef0f4;margin-bottom:14px">'
            '%s</div>' % out)


def step(title, desc=''):
    """영역 제목 — 번호를 붙이지 않는다 `PC-052`"""
    d = ('<span style="font-size:11.5px;color:#9ca3af">· ' + desc + '</span>') if desc else ''
    return ('<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">'
            '<b style="font-size:13px;color:#111827">' + title + '</b>' + d + '</div>')


def tag(text, bg, fg, bold=True):
    return ('<span style="font-size:11px;background:' + bg + ';color:' + fg + ';'
            'border-radius:5px;padding:2px 7px;white-space:nowrap;'
            + ('font-weight:700' if bold else '') + '">' + text + '</span>')


def big_head(name):
    """제목은 상단에만 두고 카드에는 고객사명을 크게 `PC-069`"""
    c = '#111827' if name else '#c7cdd6'
    return ('<div style="font-size:20px;font-weight:800;color:%s;margin-bottom:6px">%s</div>'
            % (c, name or '고객사를 선택하세요'))


def cust_select(empty=True, adding=False):
    """고객사 = 티켓 고객사 선택 + [＋ 신규 등록] `PC-123`"""
    s = ('<div style="display:flex;gap:6px">'
         + sel('- 선택 (17곳 · 대장 17) -' if empty else CO, ph=empty)
         + '<span class="btn sm" style="white-space:nowrap">' + ('취소' if adding else '＋ 신규 등록')
         + '</span></div>')
    if adding:
        s += ('<div style="margin-top:8px;padding:10px;border:1px dashed #c7d2fe;border-radius:10px;'
              'background:#f8faff">'
              '<div style="font-size:11.5px;color:#4338ca;margin-bottom:8px">티켓 고객사 등록 · '
              '고객사 관리와 별개입니다 · 발급 범위를 함께 입력합니다 (Book 을 비우면 오너 전체가 범위입니다)</div>'
              '<div style="display:grid;grid-template-columns:1.6fr 1fr 0.6fr 0.8fr 0.8fr 0.8fr;gap:6px">'
              '<div class="inp">에듀테크랩</div>' + sel('PDS3 (Ncode)')
              + '<div class="inp">3</div><div class="inp">512</div>'
              '<div class="inp ph">Start Book</div><div class="inp ph">End Book</div></div>'
              '<div style="display:flex;justify-content:flex-end;margin-top:8px">'
              '<span class="btn pri">등록</span></div></div>')
    return s


def acct_inputs(edit=False, err=None, empty=True, adding=False):
    """계정 정보 — 등록은 입력, 상세는 ID·고객사 잠금"""
    co = ('<div class="inp" style="background:#f7f8fa;color:#6b7280">' + CO + '</div>'
          if edit else cust_select(empty, adding))
    idc = ('<div class="inp" style="background:#f7f8fa;color:#6b7280;'
           'font-family:ui-monospace,monospace">' + ACC_ID + '</div>' if edit
           else '<div class="inp' + (' err' if err == 'id' else '') + '">'
                + ('informds' if err == 'id' else
                   ('<span style="color:#9ca3af">user@company.com</span>' if empty else ACC_ID)) + '</div>')
    filled = edit or not empty
    pwd = ('••••••••••' if filled and err != 'pw'
           else '<span style="color:#9ca3af">비밀번호 미요청 시 임의 생성</span>')
    nm = 'InformDS 개발팀' if filled else ''
    addr = 'Seoul, Gangnam-gu' if filled else '<span style="color:#9ca3af">주소</span>'
    home = 'https://www.informds.com' if filled else '<span style="color:#9ca3af">https://</span>'
    out = ('<div class="g2">'
           + field('고객사', co, not edit)
           + field('NAME (담당자명)', '<div class="inp">' + nm + '</div>')
           + field('ID (이메일)', idc, not edit)
           + field('PWD (비밀번호)',
                   '<div style="display:flex;gap:6px">'
                   '<div class="inp' + (' err' if err == 'pw' else '') + '" style="flex:1">' + pwd + '</div>'
                   '<div class="btn sm" style="white-space:nowrap">임의 생성</div></div>', True)
           + field('ADDR (주소)', '<div class="inp">' + addr + '</div>')
           + field('HOMEPAGE (홈페이지)', '<div class="inp">' + home + '</div>')
           + '</div>')
    if edit:        # 사용기간은 계정이 아니라 **코드 범위(=티켓)별 기간** `PC-118`
        out += ('<div style="margin-top:10px;font-size:11.5px;color:#6b7280;background:#fafbfc;'
                'border:1px solid #eef0f4;border-radius:9px;padding:8px 11px">'
                '사용기간(시작·끝)은 계정 속성이 아니라 <b>코드 범위(=티켓)마다 유지되는 기간</b>입니다. '
                '<b>[App Key 발급]</b> 탭에서 코드 범위를 발급할 때 함께 지정합니다.</div>')
    return out


HINT = '선택하면 Section·Owner·Book·Code Type 이 자동으로 채워집니다'


def range_head(req=True, extra=''):
    return ('<div style="font-size:12px;color:#6b7280;margin-bottom:6px">발급 범위 (대장 이력 · SOBP 할당)%s '
            '<span style="color:#9ca3af">(%s%s)</span></div>' % (' *' if req else '', HINT, extra))


def book_page_fields():
    return ('<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:12px">'
            + field('Start Book · 6,808~8,191', '<div class="inp">6808</div>')
            + field('Book 볼륨 (권) · 최대 1,384', '<div class="inp">200</div>')
            + field('Start Page', sel('1 (기본)'))
            + field('Page 볼륨 · 최대 512', '<div class="inp">512</div>') + '</div>')


def period_fields():
    """코드 범위(=티켓) 발급 시 함께 지정하는 사용기간 `PC-118` — 항목명은 영문 (한글) `PC-132`"""
    return ('<div style="display:grid;grid-template-columns:0.9fr 1fr 1.4fr;gap:10px;margin-top:10px">'
            + field('Code Type', sel('PDS3'))
            + field('Valid From Time (사용기간 시작)', '<div class="inp ph">yyyy-mm-dd</div>')
            + field('Valid Until Time (사용기간 끝)',
                    '<div style="display:flex;gap:8px;align-items:center">'
                    '<div class="inp ph" style="opacity:.5">yyyy-mm-dd</div>'
                    '<label style="font-size:12.5px;color:#374151;display:flex;align-items:center;gap:4px;'
                    'white-space:nowrap"><input type="checkbox" checked> 무제한</label></div>')
            + '</div>')


def fixed_fields(on=True):
    v = ('S3 / O302' if on else '-')
    return ('<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:baseline;margin-top:10px;'
            'padding:8px 11px;background:#fafbfc;border:1px solid #eef0f4;border-radius:9px;font-size:11.5px">'
            '<span style="color:#6b7280;font-weight:700">자동·고정</span>'
            '<span><span style="color:#9ca3af">Section · Owner</span> <b style="font-family:ui-monospace,monospace">%s</b></span>'
            '<span><span style="color:#9ca3af">Ticket Type</span> <b style="font-family:ui-monospace,monospace">Unlimited</b></span>'
            '<span><span style="color:#9ca3af">Ticket Version</span> <b style="font-family:ui-monospace,monospace">1</b></span>'
            '</div>' % v)


PT_BG = {'PDS2': ('#fef3c7', '#92400e'), 'PDS3': ('#eef6ff', '#2563eb'), 'PDS4': ('#f3e8ff', '#7e22ce')}


def _del_btn(label):
    return ('<span class="btn gho" style="padding:3px 10px;font-size:11px;color:#dc2626;'
            'border-color:#fecaca;background:#fff">' + label + '</span>')


def key_rows(sel_=(0, 0), extra=None):
    """발급 내역 — 키 한 줄 + 그 키에 물린 코드 범위(=티켓) 목록 `PC-118` `PC-121`"""
    rows = ''
    for ki, (k, at, ranges) in enumerate(KEYS):
        ranges = list(ranges) + (extra or [])
        lines = ''
        for ri, (pt, sobp, books, period) in enumerate(ranges):
            bg, fg = PT_BG.get(pt, PT_BG['PDS3'])
            on = (ki, ri) == sel_
            lines += ('<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;'
                      'border:1px solid %s;background:%s;border-radius:8px;padding:4px 6px">'
                      % ('#93c5fd' if on else 'transparent', '#f0f7ff' if on else 'transparent')
                      + '<span style="color:%s;font-weight:700;font-size:11px">%s</span>'
                      % ('#2563eb' if on else '#d1d5db', '▸' if on else '·')
                      + '<span style="font-size:11px;background:%s;color:%s;border-radius:5px;padding:2px 7px;'
                        'font-family:ui-monospace,monospace">%s %s</span>' % (bg, fg, pt, sobp)
                      + '<span>' + books + '</span>' + tag(period, '#eef6ff', '#2563eb')
                      + '<span style="flex:1"></span>' + _del_btn('티켓 삭제') + '</div>')
        rows += ('<div style="border:1px solid #eef0f4;border-radius:9px;padding:8px 10px;'
                 'font-size:11.5px;color:#6b7280">'
                 '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'
                 '<code>' + k + '</code>'
                 + '<span>코드 범위 %d개</span>' % len(ranges)
                 + '<span style="flex:1"></span><code>' + at + '</code>' + _del_btn('키 삭제') + '</div>'
                 '<div style="display:flex;flex-direction:column;gap:4px;margin-top:6px">' + lines + '</div></div>')
    return '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px">' + rows + '</div>'


def key_info_card(sel_=(0, 0)):
    """Key 정보 — 발급 내역에서 선택한 티켓(범위)의 값 `PC-120`. Service·Usage 항목은 없다 `PC-131`"""
    k, _at, ranges = KEYS[sel_[0]]
    pt, sobp, books, period = ranges[sel_[1]]
    since, until = [x.strip() for x in period.split('~')]
    kv = [('Company Name', CO), ('Account Id', ACC_ID), ('App Key', k), ('Code Type', pt),
          ('코드 범위', sobp), ('권수', books),
          ('Valid From Time', since.replace('-', '')),
          ('Valid Until Time', '99999999 (무제한)' if until == '무제한' else until.replace('-', '')),
          ('Ticket Type', 'Unlimited' if until == '무제한' else 'Period'), ('Ticket Version', '1')]
    rows = ''.join('<div style="display:flex;gap:8px;padding:5px 11px;font-size:11.5px;'
                   'border-top:1px solid #f6f7f9"><span style="color:#6b7280;min-width:120px;'
                   'font-family:ui-monospace,monospace">%s</span>'
                   '<span style="color:#111827;word-break:break-all">%s</span></div>' % kvp for kvp in kv)
    return (step('Key 정보', '선택한 발급 내역 (%s %s)' % (pt, sobp))
            + '<div style="border:1px solid #eef0f4;border-radius:10px;overflow:hidden">' + rows + '</div>')


def result_box():
    return ('<div style="margin-top:12px;background:#fffbeb;border:1px solid #fde68a;'
            'border-radius:10px;padding:12px 14px">'
            '<div style="font-size:12px;color:#92400e;font-weight:700;margin-bottom:6px">'
            '발급 완료 — App Key (서비스 DB 등록됨)</div>'
            '<div style="font-size:12.5px;color:#111827;line-height:1.9">'
            '<div>ID: <code>' + ACC_ID + '</code></div><div>PWD: <code>Kq7mZ2xR4a</code></div>'
            '<div style="display:flex;gap:8px;align-items:center">App Key: '
            '<code style="flex:1;word-break:break-all">' + KEY + '</code>'
            '<div class="btn sm">전체 복사</div></div></div></div>')


def new_key_panel(rng='closed'):
    """등록 — App Key 발급 탭. 범위를 고르면 함께 발급, 안 고르면 계정만 등록 `PC-071`"""
    on = rng != 'closed'
    return (step('App Key 발급', '계정당 1개')
            + range_head(False, ' · 선택하지 않으면 계정만 등록합니다') + picker(rng)
            + book_page_fields() + period_fields() + fixed_fields(on)
            + ('<div style="font-size:11.5px;color:#6b7280;margin-top:6px">발급 범위 <b>PDS3 S3/O302/B6808~7007</b> '
               '· 200권 · <b>P1~512</b> <span style="color:#9ca3af">(할당 B0~8191)</span></div>' if on else ''))


def edit_key_panel(rng='closed', issued=False, sel_=(0, 0), extra=None):
    """상세 — 코드 범위(=티켓) 발급 폼 + 발급 내역 + Key 정보 `PC-118` `PC-120`"""
    on = rng != 'closed'
    form = (range_head(True, ' · 사용기간을 함께 지정합니다') + picker(rng) + book_page_fields() + period_fields()
            + '<div style="display:flex;align-items:center;gap:10px;margin-top:10px">'
            + ('<span style="font-size:11.5px;color:#6b7280">발급 범위 <b>PDS3 S3/O302/B6808~7007</b> · 200권 '
               '· <b>P1~512</b> · 기간 즉시~무제한</span>' if on else '')
            + '<span style="flex:1"></span><div class="btn ' + ('pri' if on else 'dis') + '">코드 범위 발급</div></div>')
    return (step('App Key 발급', '계정당 1개 · 발급된 키 1개') + form
            + (result_box() if issued else '')
            + '<div style="margin-top:18px;border-top:1px solid #eef0f4;padding-top:14px">'
            + step('App Key 발급 내역', '발급된 키 1개 · 티켓을 선택하면 아래 Key 정보가 바뀝니다')
            + key_rows(sel_, extra) + key_info_card(sel_) + '</div>')


def new_form(active='계정 정보', rng='closed', err=None, empty=True, adding=False, toast=None):
    panel = (new_key_panel(rng) if active == 'App Key 발급'
             else step('계정 정보', '키 발급 계정') + acct_inputs(err=err, empty=empty, adding=adding))
    body = (big_head('' if empty and active == '계정 정보' and not err else CO)
            + acc_tabs(active, '발급' if rng != 'closed' else '') + panel
            + '<div style="display:flex;align-items:center;gap:8px;margin-top:16px">'
              '<div class="btn gho">목록</div><span style="flex:1"></span>'
              '<div class="btn gho">취소</div><div class="btn pri">계정 추가</div></div>')
    if toast:
        body += ('<div style="margin-top:10px;font-size:12.5px;color:#dc2626;text-align:right">' + toast + '</div>')
    return '<div style="max-width:900px"><div class="card"><div class="bd">' + body + '</div></div></div>'


def edit_form(active='계정 정보', rng='closed', issued=False, toast=None, sel_=(0, 0), extra=None):
    panel = (edit_key_panel(rng, issued, sel_, extra) if active == 'App Key 발급'
             else step('계정 정보', 'ID(email) · 고객사는 변경할 수 없습니다') + acct_inputs(edit=True))
    body = big_head(CO) + acc_tabs(active, '1') + panel
    if toast:
        body += ('<div style="margin-top:10px;font-size:12.5px;color:#047857;text-align:right">' + toast + '</div>')
    body += ('<div style="display:flex;align-items:center;gap:8px;margin-top:16px">'
             '<div class="btn gho">목록</div><span style="flex:1"></span>'
             '<div class="btn gho" style="color:#dc2626;border-color:#fecaca">계정 삭제</div>'
             '<div class="btn pri">저장</div></div>')
    return '<div style="max-width:900px"><div class="card"><div class="bd">' + body + '</div></div></div>'


def scr_new(h=900, **kw):
    return frame('TKT-01', '계정 및 App Key 등록', new_form(**kw), height=h)


def scr_edit(h=1500, **kw):
    return frame('TKT-01', '계정 및 App Key 상세 수정', edit_form(**kw), height=h)


def dlg(title, msg, ok='확인'):
    return ('<div class="ovl"><div class="mdl" style="width:480px">'
            '<div class="mh"><div class="mt">%s</div><div class="mx">✕</div></div>'
            '<div style="font-size:13px;color:#374151;line-height:1.8">%s</div>'
            '<div class="mf"><div class="btn gho">취소</div><div class="btn dan">%s</div></div></div></div>'
            % (title, msg, ok))


NAV = [('[목록] · [취소]', '클릭', '<code>TKT-01</code>', '계정 목록으로 돌아간다'),
       ('사이드바 [N Key 관리]', '클릭', '<code>TKT-03</code>', 'N Key 발급·정산 목록')]


def build():
    B = []

    B.append((
        'S1', '계정 등록 — 진입', '기본',
        '<code>TKT-01</code> 의 <b>[＋ 계정 추가]</b> 로 들어온다. 탭은 <b>계정 정보 · App Key 발급</b> 2개이고 '
        '<b>한 번에 한 탭</b>만 보인다 <code>PC-062</code>. 인증 서비스·권한 탭은 없다 <code>PC-131</code> — '
        '서비스 로그인 계정과 CasterN 권한은 <code>MEM-02</code> <b>계정 및 서비스 권한</b>에서 다룬다 <code>PC-128</code>. '
        '고객사는 <b>티켓 고객사</b>(nkey(HLP) 대장 프로젝트명 17곳 + 신규 등록분)에서 고른다 <code>PC-123</code>.',
        scr_new(active='계정 정보', h=760),
        [('고객사', '선택', '티켓 고객사', '고객사 관리와 별개 · 주소·사용 서비스를 끌어오지 않는다 <code>PC-123</code>'),
         ('[＋ 신규 등록]', '클릭', 'S2', '대장에 없는 티켓 고객사 등록'),
         ('ID (이메일)', '입력', '이메일 형식', '전체에서 <b>유일</b>(고객사 관리 서비스 계정 포함)'),
         ('PWD (비밀번호) [임의 생성]', '클릭', '10자리 자동', '비밀번호를 요청하지 않는 고객사'),
         ('[App Key 발급] 탭', '클릭', 'S3', '범위를 고르면 계정과 함께 발급'),
         ('[계정 추가]', '클릭', '<code>TKT-01</code>', '목록으로 이동')] + NAV))

    B.append((
        'S2', '티켓 고객사 신규 등록', '분기',
        '대장에 없는 고객사는 고객사 선택 옆 <b>[＋ 신규 등록]</b> 으로 바로 등록한다 <code>PC-123</code>. '
        '고객사명과 <b>발급 범위 1건</b>(코드 종류 · S · Owner · Start Book · End Book)을 함께 넣고, '
        'Book 을 비우면 오너 전체가 범위다. 등록하면 그 고객사가 바로 선택된다. <b>고객사 관리에는 생기지 않는다.</b>',
        scr_new(active='계정 정보', adding=True, h=860),
        [('고객사명 *', '입력', '—', '티켓 고객사 안에서 <b>유일</b>'),
         ('코드 종류 · S · Owner *', '입력', '—', 'PDS3(Ncode) · PDS4(Scode) · PDS2 · OID'),
         ('Start Book · End Book', '입력', '—', '비우면 <b>오너 전체</b>가 범위'),
         ('[등록]', '클릭', '고객사 선택됨', '고객사 관리와 별개로 저장 · N Key 관리 [고객사] 탭에도 나온다'),
         ('중복 이름', '[등록]', '<b>차단</b>', '<b>이미 있는 티켓 고객사입니다: {이름}</b>')] + NAV))

    B.append((
        'S3', 'App Key 발급 탭 — 함께 발급', '분기',
        'App Key 는 <b>계정당 1개</b>다 <code>PC-050</code>. 탭을 열면 바로 입력하고, <b>발급 범위를 고르면 계정과 함께 발급</b>, '
        '고르지 않으면 계정만 등록한다 <code>PC-071</code>. 범위는 <b>대장 이력의 S/O/B</b>와 SOBP 맵에서 '
        '<b>(K)</b>로 할당한 S/O 다 <code>PC-123</code> <code>PC-125</code>. 사용기간은 <b>티켓별</b>로 함께 지정한다 <code>PC-118</code>.',
        scr_new(active='App Key 발급', rng='open', h=1000),
        [('발급 범위', '선택', 'S·O·B·P 자동', '선택하면 Section·Owner·Book·Code Type 이 자동으로 채워집니다'),
         ('Start Book · Book 볼륨 (권)', '입력', '범위 안에서', '<b>Book End = Start + 볼륨 − 1</b> <code>PC-050</code>'),
         ('Start Page · Page 볼륨', '입력', '—', '계정별 B·P 영역 <code>PC-059</code>'),
         ('Code Type', '선택', 'PDS2 · PDS3 · PDS4 · OID', '기본값은 범위의 종류 <code>PC-064</code>'),
         ('Valid From / Until Time', '입력', '사용기간', '끝은 날짜 또는 <b>무제한</b> <code>PC-118</code>'),
         ('범위 없음', '—', '안내', '<b>이 고객사의 발급 범위(대장 이력)가 없습니다.</b>'),
         ('범위 미선택', '[계정 추가]', '계정만 등록', '키는 상세에서 나중에 발급')]))

    B.append((
        'S4', '등록 검증 실패', '검증',
        '검사는 <b>고객사 → ID 형식 → 비밀번호 → ID 중복</b> 순서로 하고, 하나라도 걸리면 그 자리에서 멈춘다. '
        '메시지는 버튼 아래 한 줄로 나온다. 인증 서비스 검사는 없다 <code>PC-131</code>.',
        scr_new(active='계정 정보', err='id', empty=False, toast='ID 는 이메일 형식이어야 합니다.', h=800),
        [('① 고객사 미선택', '검증', '중단', '<b>고객사를 선택하세요.</b>'),
         ('② ID 형식', '검증', '중단', '<b>ID 는 이메일 형식이어야 합니다.</b>'),
         ('③ 비밀번호', '검증', '중단', '<b>비밀번호가 필요합니다. (요청 없으면 [임의 생성])</b>'),
         ('④ ID 중복', '검증', '중단', '<b>이미 등록된 ID(email)입니다.</b>')]))

    B.append((
        'S5', '계정 상세 — 계정 정보 탭', '기본',
        'ID(이메일)·고객사는 <b>잠금</b>이고 나머지를 고쳐 <b>[저장]</b> 한다. 사용기간은 계정이 아니라 '
        '<b>코드 범위(=티켓)별 기간</b>이라 안내문만 둔다 <code>PC-118</code>.',
        scr_edit(active='계정 정보', h=760),
        [('ID · 고객사', '표시', '<b>잠금</b>', '키 연동 기준값'),
         ('사용기간 안내', '표시', '—', '[App Key 발급] 탭에서 범위를 발급할 때 지정 <code>PC-118</code>'),
         ('[저장]', '클릭', '반영', '<b>계정 정보가 저장되었습니다.</b>'),
         ('[계정 삭제]', '클릭', 'S9 확인창', '')] + NAV))

    B.append((
        'S6', '상세 — App Key 발급 완료', '분기',
        '키가 없는 계정에서 범위를 고르고 발급하면 결과에 <b>ID · PWD · App Key</b> 가 나오고 '
        '<b>[전체 복사]</b> 로 한 번에 복사한다. 발급(=티켓)마다 <code>TKT-03</code> 원장과 <code>LOG-01</code> 에 기록된다 <code>PC-119</code>.',
        scr_edit(active='App Key 발급', rng='sel', issued=True, h=1640,
                 toast='App Key 발급 완료 — 계정과 연동되어 서비스 DB에 등록되었습니다.'),
        [('발급 버튼', '클릭', '키 생성', '범위 선택 전에는 <b>비활성</b>'),
         ('발급 결과', '표시', '—', 'ID · PWD · App Key(영문·숫자 29자 <code>PC-066</code>)'),
         ('[전체 복사]', '클릭', '복사', '<b>계정·키 정보가 복사되었습니다.</b>'),
         ('원장 티켓', '자동', '<code>TKT-03</code>', '발급(=티켓)마다 1건 <code>PC-119</code>')]))

    B.append((
        'S7', '이미 발급된 계정 — 코드 범위(티켓) 발급', '분기',
        'App Key 는 <b>계정당 1개</b>이고 그 아래 <b>코드 범위(=티켓)를 여러 건</b> 발급한다 <code>PC-118</code>. '
        '범위마다 <b>사용기간</b>을 함께 지정한다. 삭제는 <b>[티켓 삭제]</b>(그 티켓 + 연결 원장 티켓 <code>PC-121</code>)와 '
        '<b>[키 삭제]</b>(키 전체) 두 가지다.',
        scr_edit(active='App Key 발급', rng='sel', h=1560),
        [('[코드 범위 발급]', '클릭', '티켓 추가 + 원장 티켓', '범위 선택 전 <b>비활성</b> · <code>TKT-03</code>·<code>LOG-01</code> 기록'),
         ('[티켓 삭제]', '클릭', '그 티켓만 삭제', '연결 원장 티켓도 함께 · 마지막이면 키도 함께(확인창) <code>PC-121</code>'),
         ('[키 삭제]', '클릭', '키 전체 삭제', '키와 모든 티켓 제거'),
         ('마지막 티켓 삭제', '확인창', '—', '<b>마지막 티켓입니다. 삭제하면 이 App Key 도 함께 삭제됩니다. 진행할까요?</b>')]))

    B.append((
        'S8', '발급 내역 선택 → Key 정보', '분기',
        '[App Key 발급 내역]의 <b>티켓을 선택</b>하면(▸ 파란 강조) 아래 <b>Key 정보</b>가 그 티켓 값으로 바뀐다 <code>PC-120</code>. '
        '항목은 Company Name · Account Id · App Key · Code Type · 코드 범위 · 권수 · Valid From/Until Time · Ticket Type · '
        'Ticket Version 이다 — <b>Service · Usage 항목은 없다</b> <code>PC-131</code>. 기본 선택은 첫 티켓이다.',
        scr_edit(active='App Key 발급', sel_=(0, 1), h=1560),
        [('발급 내역 티켓', '클릭', 'Key 정보 갱신', '선택 티켓 파란 강조 ▸'),
         ('기본 선택', '표시', '첫 티켓', ''),
         ('Key 정보', '조회', '선택 티켓 값', 'Valid From·Until = 그 티켓의 사용기간 <code>PC-118</code>')]))

    B.append((
        'S9', '계정 삭제 확인', '확인창',
        '<b>[계정 삭제]</b> 는 확인을 거친다. 계정과 <b>연동된 App Key 가 함께</b> 삭제된다.',
        frame('TKT-01', '계정 및 App Key 상세 수정', edit_form(active='계정 정보'), height=760,
              overlay=dlg('계정 삭제', '이 계정과 연동 App Key를 삭제할까요?', '삭제')),
        [('확인창 문구', '표시', '—', '<b>이 계정과 연동 App Key를 삭제할까요?</b>'),
         ('[삭제]', '클릭', '<code>TKT-01</code>', '계정 + 연동 키 삭제 후 목록으로'),
         ('[취소] · ✕', '클릭', '변경 없음', '')]))

    intro = ('<code>TKT-01</code> 계정 목록에서 열리는 <b>등록</b>과 <b>상세·수정</b> 두 화면이다. '
             '여기 계정은 <b>티켓 고객사</b>(nkey(HLP) 대장 프로젝트명 + 신규 등록분)의 <b>키 발급 계정</b>이다 '
             '<code>PC-123</code> <code>PC-128</code>. 탭은 <b>계정 정보 · App Key 발급</b> 2개이고, '
             '인증 서비스·권한은 <b>삭제</b>했다 <code>PC-131</code> — 서비스 로그인 계정과 CasterN 권한은 '
             '고객사 관리 <code>MEM-02</code> 의 <b>계정 및 서비스 권한</b>에서 다룬다. '
             'App Key 는 <b>계정당 1개</b> <code>PC-050</code>이며 그 아래 <b>코드 범위(=티켓)를 여러 건</b> 발급하고, '
             '사용기간은 티켓마다 지정한다 <code>PC-118</code>. 발급 범위는 <b>대장 이력의 S/O/B</b>와 SOBP 맵 '
             '<b>(K)</b> 할당에서 고른다.')
    return page(CODE, NAME, PRD, intro, B)
