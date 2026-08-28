# -*- coding: utf-8 -*-
"""TKT-06 계정 등록·수정 — 실제 화면 구조 그대로.

등록(/tickets/account/new) : ① 계정 정보 → ② 사용처·권한 → ③ App Key(선택) → [계정 추가]
상세·수정(/tickets/account/{email}) : ①② 수정 + [저장] · ③ App Key 발급·삭제
"""
from shell import page, frame
from p_tkt01 import sel, field, picker

CODE, NAME = 'TKT-06', '계정 등록·수정'
PRD = 'docs/prd/TKT-06_계정 등록·수정.md'

# lib/accountStore.ts CASTERN_PERMS — CasterN 사용자 권한 7종
PERMS = ('프로젝트 생성', '심볼 편집', '리소스 편집', 'Ncode PDF 내보내기',
         'NCP2 내보내기', 'App용 패키지 내보내기', 'App 페이지 설정')

# 상세 화면의 App Key 목록 (키, 코드종류, SOBP, 사용처, 유효, 생성일시)
KEYS = (('ncc_live_9f3c1a08b2', 'PDS2', 'S3/O17/B400~499', 'CasterN', '2027-12-31',
         '2026-08-20 14:02'),
        ('ncc_live_41d7e6b590', 'PDS2', 'S3/O17/B500~599', 'CasterN', '무제한',
         '2026-08-22 09:41'))


def step(n, title, desc=''):
    d = ('<span style="font-size:11.5px;color:#9ca3af">· ' + desc + '</span>') if desc else ''
    return ('<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">'
            '<span style="background:#5f8ff0;color:#fff;font-weight:700;font-size:11px;'
            'border-radius:50%;width:20px;height:20px;display:grid;place-items:center">'
            + str(n) + '</span>'
            '<b style="font-size:13px;color:#111827">' + title + '</b>' + d + '</div>')


def tag(text, bg, fg, bold=True):
    return ('<span style="font-size:11px;background:' + bg + ';color:' + fg + ';'
            'border-radius:5px;padding:2px 7px;white-space:nowrap;'
            + ('font-weight:700' if bold else '') + '">' + text + '</span>')


def head(title, sub='', right='목록', chips=''):
    s = ('<span style="color:#9ca3af;font-weight:400;font-size:12px">· ' + sub
         + '</span>') if sub else ''
    return ('<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;'
            'flex-wrap:wrap"><div style="font-weight:700;font-size:14px">' + title + ' '
            + s + '</div>' + chips + '<span style="flex:1"></span>'
            '<span class="btn gho">' + right + '</span></div>')


def acct_inputs(edit=False, err=None, empty=True):
    """① 계정 정보 — 등록은 입력, 상세는 ID·고객사 잠금"""
    co = ('<div class="inp" style="background:#f7f8fa;color:#6b7280">웅진씽크빅</div>'
          if edit else sel('- 선택 -' if empty else '웅진씽크빅', ph=empty))
    idc = ('<div class="inp" style="background:#f7f8fa;color:#6b7280;'
           'font-family:ui-monospace,monospace">wj_edit@wjthinkbig.com</div>' if edit
           else '<div class="inp' + (' err' if err == 'id' else '') + '">'
                + ('wj_edit' if err == 'id' else
                   ('<span style="color:#9ca3af">user@company.com</span>' if empty
                    else 'wj_edit@wjthinkbig.com')) + '</div>')
    pwd = ('••••••••••' if (edit or not empty) and err != 'pw'
           else '<span style="color:#9ca3af">비밀번호 미요청 시 임의 생성</span>')
    nm = ('웅진 편집팀' if edit or not empty else '')
    return ('<div class="g2">'
            + field('회사정보 (고객사)', co, not edit)
            + field('NAME (담당자/사용자명)', '<div class="inp">' + nm + '</div>')
            + field('ID (EMAIL)', idc, not edit)
            + field('PWD',
                    '<div style="display:flex;gap:6px">'
                    '<div class="inp' + (' err' if err == 'pw' else '')
                    + '" style="flex:1">' + pwd + '</div>'
                    '<div class="btn sm" style="white-space:nowrap">임의 생성</div></div>',
                    True)
            + field('ADDR (주소)', '<div class="inp">'
                    + ('경기도 파주시 회동길 20' if edit or not empty else '') + '</div>')
            + field('HOMEPAGE', '<div class="inp">'
                    + ('https://www.wjthinkbig.com' if edit or not empty else '')
                    + '</div>')
            + '</div>')


def perm_box(selected=None, service='CasterN'):
    """② CasterN 권한 7종 — 개별 또는 모두 선택"""
    title = ('<div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:6px">'
             'CasterN 사용자 권한 <span style="font-weight:400;color:#9ca3af">'
             '· 개별 또는 모두 선택</span></div>')
    if service != 'CasterN':
        return (title + '<div style="font-size:12px;color:#9ca3af;border:1px solid #eef0f4;'
                'background:#fafbfc;border-radius:10px;padding:9px 12px">'
                '사용처가 <b>CasterN</b> 일 때만 권한을 지정합니다.</div>')
    sel_set = set(PERMS if selected is None else selected)
    cells = ''
    for p in PERMS:
        on = p in sel_set
        cells += ('<div style="display:flex;align-items:center;gap:7px;border:1px solid '
                  + ('#c7ddff' if on else '#eef0f4') + ';background:'
                  + ('#f7faff' if on else '#fff') + ';border-radius:9px;padding:8px 10px;'
                  'font-size:12.5px"><span style="width:13px;height:13px;border-radius:3px;'
                  'border:1px solid ' + ('#2563eb' if on else '#cbd5e1') + ';background:'
                  + ('#2563eb' if on else '#fff') + ';color:#fff;font-size:9px;'
                  'display:grid;place-items:center">' + ('✓' if on else '') + '</span>'
                  '<span style="color:' + ('#1d4ed8' if on else '#374151') + ';'
                  + ('font-weight:700' if on else '') + '">' + p + '</span></div>')
    n = len(sel_set)
    bar = ('<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">'
           '<span style="font-size:11.5px;color:#6b7280">선택 ' + str(n) + ' / 7</span>'
           '<span style="flex:1"></span><div class="btn sm">'
           + ('모두 해제' if n == 7 else '모두 선택') + '</div></div>')
    return (title + bar + '<div style="display:grid;grid-template-columns:repeat(3,1fr);'
            'gap:6px">' + cells + '</div>')


def svc_field(service='CasterN', note=None):
    label = {'CasterN': 'CasterN — Caster U 웹 편집툴 · 계정 로그인',
             '폼솔루션': '폼솔루션 — 폼솔루션 서비스 · 계정 로그인',
             'SDK 연동': 'SDK 연동 — id/pwd + SOBP 직접 사용'}[service]
    n = note or ('계정은 <b>선택한 서비스에서만 로그인</b>됩니다. '
                 '서비스는 자기 계정만 관리·인증합니다.')
    return ('<div class="g2">' + field('사용처 (연동 서비스)', sel(label), True)
            + '</div><div style="font-size:10.5px;color:#9ca3af;margin-top:4px;'
              'line-height:1.5">' + n + '</div>')


def until_field(unlimited=True):
    return field('만료일 (기간)',
                 '<div style="display:flex;gap:8px;align-items:center">'
                 '<div class="inp" style="opacity:' + ('.5' if unlimited else '1') + '">'
                 + ('yyyy-mm-dd' if unlimited else '2027-12-31') + '</div>'
                 '<label style="font-size:12.5px;color:#374151;display:flex;'
                 'align-items:center;gap:4px;white-space:nowrap">'
                 '<input type="checkbox"' + (' checked' if unlimited else '') + '> 무제한'
                 '</label></div>')


def key_option(on=False, rng='closed'):
    """③ App Key 발급(선택) — 체크하면 범위·만료가 열린다"""
    chk = ('<label style="display:flex;align-items:center;gap:7px;font-size:12.5px;'
           'color:#374151;margin-bottom:8px"><input type="checkbox"'
           + (' checked' if on else '') + '> 이 계정에 <b>App Key도 함께 발급</b>합니다 '
           '(SOBP 범위 연동)</label>')
    if not on:
        return chk
    return (chk + picker(rng) + '<div class="g2" style="margin-top:12px">'
            + until_field() + '</div>')


def key_rows():
    rows = ''
    for k, pt, sobp, svc, until, at in KEYS:
        rows += ('<div style="display:flex;align-items:center;gap:8px;border:1px solid '
                 '#eef0f4;border-radius:9px;padding:8px 10px;font-size:11.5px;'
                 'color:#6b7280;flex-wrap:wrap"><code>' + k + '…</code>'
                 + tag(pt + ' ' + sobp, '#fef3c7' if pt == 'PDS2' else '#eef6ff',
                       '#92400e' if pt == 'PDS2' else '#2563eb', False)
                 + '<span>' + svc + '</span><span>유효 ' + until + '</span>'
                 '<span style="flex:1"></span><code>' + at + '</code>'
                 '<span class="lnk" style="color:#dc2626">키 삭제</span></div>')
    return ('<div style="margin-top:12px;display:flex;flex-direction:column;gap:6px">'
            + rows + '</div>')


def result_box():
    return ('<div style="margin-top:12px;background:#fffbeb;border:1px solid #fde68a;'
            'border-radius:10px;padding:12px 14px">'
            '<div style="font-size:12px;color:#92400e;font-weight:700;margin-bottom:6px">'
            '발급 완료 — App Key (서비스 DB 등록됨)</div>'
            '<div style="font-size:12.5px;color:#111827;line-height:1.9">'
            '<div>계정 ID: <code>wj_edit@wjthinkbig.com</code></div>'
            '<div>PWD: <code>Kq7mZ2xR4a</code></div>'
            '<div style="display:flex;gap:8px;align-items:center">App Key: '
            '<code style="flex:1;word-break:break-all">'
            'ncc_live_9f3c1a08b2d4471e60c8aa35719fbe02c1d6</code>'
            '<div class="btn sm">전체 복사</div></div></div></div>')


# ── 등록 화면 ──────────────────────────────────────────────────────
def new_form(service='CasterN', perms=None, withkey=False, rng='closed', err=None,
             empty=True, toast=None):
    body = (head('계정 등록', '① 계정 정보 → ② 사용처·권한 → ③ App Key(선택)')
            + '<div style="font-size:11.5px;color:#9ca3af;margin-bottom:12px">'
              '한 고객사에 계정을 <b>여러 개</b> 등록할 수 있습니다(개수 제한 없음). '
              'App Key 발급은 <b>선택</b>이며, 나중에 계정 상세에서 발급할 수 있습니다.</div>'
            + step(1, '계정 정보', '서비스 로그인 계정') + acct_inputs(err=err, empty=empty)
            + '<div style="margin-top:16px">' + step(2, '사용처 · 권한',
                                                     '연동 서비스와 CasterN 권한')
            + svc_field(service) + '<div style="margin-top:10px">'
            + perm_box(perms, service) + '</div></div>'
            + '<div style="margin-top:16px">' + step(3, 'App Key 발급',
                                                     '선택 — 지금 발급하지 않아도 됩니다')
            + key_option(withkey, rng) + '</div>'
            + '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">'
              '<div class="btn gho">취소</div><div class="btn pri">계정 추가</div></div>')
    if toast:
        body += ('<div style="margin-top:10px;font-size:12.5px;color:#dc2626;'
                 'text-align:right">' + toast + '</div>')
    return '<div style="max-width:900px"><div class="card"><div class="bd">' + body \
           + '</div></div></div>'


# ── 상세 · 수정 화면 ───────────────────────────────────────────────
def edit_form(service='CasterN', perms=None, rng='closed', issued=False, toast=None):
    chips = ('<code style="font-size:12.5px;color:#374151">wj_edit@wjthinkbig.com</code>'
             + tag('웅진씽크빅', '#f3f4f6', '#6b7280', False))
    body = (head('계정 상세 · 수정', '', '목록', chips)
            + step(1, '계정 정보', 'ID(email) · 고객사는 변경할 수 없습니다')
            + acct_inputs(edit=True)
            + '<div style="margin-top:16px">' + step(2, '사용처 · 권한',
                                                     '연동 서비스와 CasterN 권한')
            + svc_field(service, '사용처를 바꾸면 <b>연동된 App Key의 사용처도 함께</b> '
                                 '바뀝니다.')
            + '<div style="margin-top:10px">' + perm_box(perms, service) + '</div></div>'
            + '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">'
              '<div class="btn gho" style="color:#dc2626;border-color:#fecaca">계정 삭제'
              '</div><div class="btn pri">저장</div></div>')
    if toast:
        body += ('<div style="margin-top:10px;font-size:12.5px;color:#047857;'
                 'text-align:right">' + toast + '</div>')
    body += ('<div style="margin-top:18px;border-top:1px solid #eef0f4;padding-top:14px">'
             + step(3, 'App Key', '이 계정에 연동된 키 2개 · 선택 발급') + picker(rng)
             + '<div style="display:flex;gap:12px;align-items:flex-end;margin-top:12px">'
               '<div style="width:300px">' + until_field() + '</div>'
               '<span style="flex:1"></span>'
               '<div class="btn ' + ('pri' if rng != 'closed' else 'dis')
             + '">App Key 발급</div></div>'
             + (result_box() if issued else '') + key_rows() + '</div>')
    return '<div style="max-width:900px"><div class="card"><div class="bd">' + body \
           + '</div></div></div>'


def scr_new(h=1180, **kw):
    return frame('TKT-03', '계정 등록', new_form(**kw), height=h)


def scr_edit(h=1300, **kw):
    return frame('TKT-03', '계정 상세 · 수정', edit_form(**kw), height=h)


NAV = [('[목록] · [취소]', '클릭', '<code>TKT-03</code>', '계정 목록으로 돌아간다'),
       ('사이드바 [N Key 발급]', '클릭', '<code>TKT-01</code>', '물리 키 발급')]


def build():
    B = []

    B.append((
        'S1', '계정 등록 — 진입', '기본',
        '<code>TKT-03</code> 목록의 <b>[＋ 계정 추가]</b> 로 들어온다'
        '(<code>/tickets/account/new</code>). ① 계정 정보 → ② 사용처·권한 → '
        '③ App Key(선택) 순서로 입력하고 <b>[계정 추가]</b> 를 누르면 '
        '목록에 나타난다. <code>PC-002</code> 고객이 아니라 <b>직원이 대신 등록</b>한다.',
        scr_new(),
        [('회사정보 (고객사) *', '선택', 'ADDR 자동 채움',
          '<code>MEM-01</code> 등록 고객사 · 주소가 자동 입력(수정 가능)'),
         ('ID (EMAIL) *', '입력', '—', '<b>이메일 형식</b> 필수 · 이미 등록된 ID 불가'),
         ('PWD *', '입력', '—', '비밀번호 미요청 고객사는 <b>[임의 생성]</b>'),
         ('사용처 *', '선택', '권한 칸 전환', '기본 <b>CasterN</b> · 폼솔루션 · SDK 연동'),
         ('[계정 추가]', '클릭', '<code>TKT-03</code> 목록', '등록된 계정이 목록에 나온다'),
         ('App Key', '—', '선택', '③에서 체크하지 않으면 <b>계정만</b> 등록된다')] + NAV))

    B.append((
        'S2', 'CasterN 권한 — 모두 선택', '기본',
        '<code>PC-031</code> — CasterN 계정은 권한 <b>7종</b>을 갖는다. '
        '기본값은 <b>모두 선택(7 / 7)</b> 이며 <b>[모두 해제]</b> 로 한 번에 끌 수 있다. '
        '권한: 프로젝트 생성 · 심볼 편집 · 리소스 편집 · Ncode PDF 내보내기 · '
        'NCP2 내보내기 · App용 패키지 내보내기 · App 페이지 설정.',
        scr_new(empty=False),
        [('권한 카드', '클릭', '개별 on/off', '체크된 카드는 파랗게 강조된다'),
         ('[모두 선택] / [모두 해제]', '클릭', '7개 일괄', '선택 수에 따라 라벨이 바뀐다'),
         ('선택 수', '표시', '—', '<b>선택 {n} / 7</b>'),
         ('권한 0개', '저장', '허용', '목록에서 <b>미지정</b>(빨강)으로 표시된다')] + NAV))

    B.append((
        'S3', 'CasterN 권한 — 개별 선택', '분기',
        '필요한 권한만 남긴다. 예) 편집만 하는 담당자에게 <b>내보내기 권한을 빼고</b> '
        '3개만 준다. 목록의 권한 칸에는 <b>3 / 7</b> 로 표시된다.',
        scr_new(empty=False, perms=PERMS[:3]),
        [('권한 카드', '클릭', '개별 선택', '선택 3 / 7'),
         ('목록 표시', '—', '<code>TKT-03</code>',
          '<b>{n} / 7</b> · 마우스를 올리면 권한 이름이 보인다'),
         ('[모두 선택]', '클릭', '7 / 7', '한 번에 전체 권한')] + NAV))

    B.append((
        'S4', '사용처 = 폼솔루션 / SDK', '분기',
        '<code>P-13</code> — 사용처는 계정이 <b>로그인할 수 있는 서비스</b>를 정한다. '
        'CasterN 이 아니면 권한 칸이 <b>안내로 잠긴다</b>(권한은 CasterN 전용). '
        'SDK 연동은 화면 로그인이 아니라 id/pwd + SOBP 직접 사용이라 비밀번호를 '
        '<b>[임의 생성]</b> 으로 지정하는 경우가 많다.',
        scr_new(empty=False, service='SDK 연동', h=1080),
        [('사용처', '선택', '권한 칸 잠금',
          '<b>사용처가 CasterN 일 때만 권한을 지정합니다.</b>'),
         ('[임의 생성]', '클릭', 'PWD 채움', '비밀번호 미요청 고객사(SDK)용'),
         ('저장되는 권한', '—', '없음', 'CasterN 이 아니면 권한은 <b>비워서</b> 저장된다')]
        + NAV))

    B.append((
        'S5', 'App Key 함께 발급 (선택)', '분기',
        '③에서 <b>[App Key도 함께 발급]</b> 을 체크하면 <b>할당된 SOBP 범위</b>와 '
        '<b>만료일</b>이 열린다 <code>P-05</code>. 체크하지 않으면 계정만 등록되고, '
        '키는 나중에 상세 화면(S6)에서 붙인다.',
        scr_new(empty=False, withkey=True, rng='open', h=1420),
        [('체크박스', '클릭', '범위·만료 표시', '해제하면 다시 숨는다'),
         ('범위 트리거', '클릭', '목록 펼침', '순번 + S/O/B/P 칩 · 선택 항목에 <b>✓</b>'),
         ('만료일', '입력', '유효 기한', '기본 <b>무제한</b> · 해제하면 달력'),
         ('[계정 추가]', '클릭', '계정 + App Key',
          '계정 등록과 키 발급이 <b>한 번에</b> 처리된다'),
         ('발급 기록', '자동', '<code>TKT-04</code> · <code>LOG-01</code>',
          'App Key 종류로 1건 · <b>티켓 발급</b> 로그')] + NAV))

    B.append((
        'S6', '등록 검증 실패', '오류',
        '검사는 <b>①회사 → ②ID 형식 → ③PWD → ④범위(App Key 체크 시)</b> 순서로 '
        '진행하고 하나라도 걸리면 그 자리에서 멈춘다. 메시지는 버튼 아래 '
        '<b>빨간 한 줄</b>로 나오고 입력값은 그대로 남는다.',
        scr_new(err='id', empty=False, toast='계정 ID는 이메일 형식이어야 합니다.'),
        [('① 회사 미선택', '검사', '중단', '<b>회사(고객사)를 선택하세요.</b>'),
         ('② ID 형식 오류', '검사', '중단', '<b>계정 ID는 이메일 형식이어야 합니다.</b>'),
         ('③ 비밀번호 없음', '검사', '중단',
          '<b>비밀번호가 필요합니다. (요청 없으면 [임의 생성])</b>'),
         ('④ 범위 미선택', '검사', '중단',
          '<b>할당된 SOBP 범위를 선택하세요.</b> (App Key 함께 발급일 때만)'),
         ('⑤ ID 중복', '등록', '중단', '<b>이미 등록된 ID(email)입니다.</b>')] + NAV))

    B.append((
        'S7', '계정 상세 · 수정', '기본',
        '목록에서 계정을 누르면 열린다(<code>/tickets/account/{email}</code>). '
        '<b>ID(email)·고객사는 바꿀 수 없고</b> 나머지(이름·PWD·주소·홈페이지·사용처·권한)를 '
        '고쳐 <b>[저장]</b> 한다. 아래 ③에서 이 계정의 <b>App Key를 발급·삭제</b>한다.',
        scr_edit(toast='계정 정보가 저장되었습니다.'),
        [('ID(email) · 고객사', '—', '잠금', '키 연동 기준값이라 수정하지 않는다'),
         ('사용처 변경', '저장', '키에도 적용',
          '연동된 <b>App Key의 사용처도 함께</b> 바뀐다'),
         ('권한', '수정', '저장', 'CasterN 일 때만 · 개별 또는 모두 선택'),
         ('[저장]', '클릭', '저장 완료', '<b>계정 정보가 저장되었습니다.</b>'),
         ('[계정 삭제]', '클릭', 'S9 확인창', '연동 App Key 가 <b>함께</b> 삭제된다'),
         ('App Key 목록', '표시', '—',
          '키 앞부분 · 코드 범위 배지 · 사용처 · 유효 기한 · 생성 일시 · [키 삭제]')] + NAV))

    B.append((
        'S8', '상세 — App Key 발급 완료', '완료',
        '범위를 고르고 <b>[App Key 발급]</b> 을 누르면 키가 만들어져 '
        '<b>서비스 DB</b>에 등록되고 아래 목록에 줄이 붙는다. '
        '<b>[전체 복사]</b> 로 ID·PWD·App Key 를 한 번에 복사해 고객사에 전달한다.',
        scr_edit(rng='closed', issued=True, h=1420),
        [('[App Key 발급]', '클릭', '키 생성', '범위를 고르기 전에는 <b>비활성</b>'),
         ('발급 결과', '표시', '—', '<b>발급 완료 — App Key (서비스 DB 등록됨)</b>'),
         ('[전체 복사]', '클릭', '클립보드', '<b>계정·키 정보가 복사되었습니다.</b>'),
         ('[키 삭제]', '클릭', '즉시 삭제', '<b>확인창 없이</b> 해당 키만 삭제된다'),
         ('발급 기록', '자동', '<code>TKT-04</code> · <code>LOG-01</code>',
          'App Key 종류로 1건 · <b>티켓 발급</b> 로그')] + NAV))

    B.append((
        'S9', '계정 삭제 확인창', '확인창',
        '상세 화면의 <b>[계정 삭제]</b>. 계정과 <b>연동된 App Key 가 함께</b> 사라지고 '
        '목록으로 돌아간다.',
        frame('TKT-03', '계정 상세 · 수정', edit_form(),
              overlay='<div class="ovl"><div class="mdl">'
                      '<div class="mh"><div class="mt">확인</div>'
                      '<div class="mx">✕</div></div>'
                      '<div style="font-size:13px;color:#374151;line-height:1.7">'
                      '이 계정과 연동 App Key를 삭제할까요?</div>'
                      '<div class="mf"><div class="btn gho">취소</div>'
                      '<div class="btn dan">삭제</div></div></div></div>',
              height=1300),
        [('[삭제]', '클릭', '<code>TKT-03</code>', '계정 + 키 삭제 후 목록으로'),
         ('[취소]', '클릭', '상세 유지', '변경 없음')] + NAV))

    intro = ('<b>계정 등록·수정</b> — <code>TKT-03</code> 계정 목록에서 열리는 두 화면이다. '
             '<b>등록</b>(<code>/tickets/account/new</code>)은 ① 계정 정보 → '
             '② 사용처·권한 → ③ App Key(선택) 3단계이고, '
             '<b>상세·수정</b>(<code>/tickets/account/{email}</code>)은 같은 ①② 를 고치고 '
             '③에서 App Key 를 발급·삭제한다.<br>'
             '<b>App Key 발급은 선택</b>이다 — 계정만 먼저 등록해 두었다가 나중에 붙일 수 '
             '있다. CasterN 계정은 <b>권한 7종</b>을 개별 또는 모두 선택한다 '
             '<code>PC-031</code>.')
    return page(CODE, NAME, PRD, intro, B)
