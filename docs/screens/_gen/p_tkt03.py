# -*- coding: utf-8 -*-
"""TKT-03 계정 + App Key — 실제 화면 구조 그대로.

카드 한 장 안에 ① 계정 → ② 할당된 SOBP 범위 → ③ 발급 조건 이 이어지고,
맨 아래에 서비스 DB(계정 & App Key) 목록이 붙는다.
"""
from shell import page, frame
from p_tkt01 import menu, sel, field, picker, chips

CODE, NAME = 'TKT-03', '계정 + App Key'
PRD = 'docs/prd/TKT-03_계정+App Key.md'

# lib/accountStore.ts ACCOUNT_SERVICES
SERVICES = (('CasterN', 'Caster U 웹 편집툴 · 계정 로그인'),
            ('폼솔루션', '폼솔루션 서비스 · 계정 로그인'),
            ('SDK 연동', 'id/pwd + SOBP 직접 사용'))

ACCOUNTS = (('wj_edit@wjthinkbig.com', '웅진 편집팀', 'CasterN', 2),
            ('wj_sdk@wjthinkbig.com', '웅진 SDK', 'SDK 연동', 1),
            ('wj_old@wjthinkbig.com', '(구) 담당자', None, 1))

KEYS = {
    'wj_edit@wjthinkbig.com': (
        ('ncc_live_9f3c1a08b2', 'PDS2', 'S3/O17/B400~499', 'CasterN', '2027-12-31',
         '2026-08-20 14:02'),
        ('ncc_live_41d7e6b590', 'PDS2', 'S3/O17/B500~599', 'CasterN', '무제한',
         '2026-08-22 09:41')),
    'wj_sdk@wjthinkbig.com': (
        ('ncc_live_c02b77ae13', 'PDS2', 'S0/O17/B111~199', 'SDK 연동', '2026-12-31',
         '2026-08-25 17:10'),),
    'wj_old@wjthinkbig.com': (
        ('ncc_live_7e8840cc21', 'PDS3', 'S3/O17/B0~99', '미지정', '무제한',
         '2025-11-03 11:26'),),
}


def step(n, title, desc=''):
    d = ('<span style="font-size:11.5px;color:#9ca3af">· %s</span>' % desc) if desc else ''
    return ('<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">'
            '<span style="background:#5f8ff0;color:#fff;font-weight:700;font-size:11px;'
            'border-radius:50%%;width:20px;height:20px;display:grid;place-items:center">%d</span>'
            '<b style="font-size:13px;color:#111827">%s</b>%s</div>' % (n, title, d))


def tag(text, bg, fg, bold=True):
    return ('<span style="font-size:11px;background:%s;color:%s;border-radius:5px;'
            'padding:2px 7px;%s">%s</span>'
            % (bg, fg, 'font-weight:700' if bold else '', text))


def acct_field(state):
    """계정 칸 4분기"""
    if state == 'empty':
        return ('<div class="inp" style="background:#f7f8fa;color:#9ca3af">'
                '고객사를 먼저 선택</div>')
    if state in ('new', 'sdk'):
        return ('<div class="inp" style="background:#f0fdf4;color:#166534;'
                'border-color:#86efac">등록된 계정 없음 → 신규 등록</div>')
    if state == 'switch':
        return sel('＋ 신규 계정 등록')
    return sel('wj_edit@wjthinkbig.com (웅진 편집팀)')


def acct_inputs(sdk=False, err=None):
    pwd = ('<span style="color:#9ca3af">비밀번호 미요청 시 임의 생성</span>'
           if (sdk or err == 'pw') else '••••••••••')
    return ('<div class="g2" style="margin-top:12px">'
            + field('NAME (담당자/사용자명)', '<div class="inp">웅진 편집팀</div>')
            + field('ID (EMAIL)',
                    '<div class="inp%s">%s</div>'
                    % (' err' if err in ('id', 'dup') else '',
                       'wj_edit' if err == 'id' else 'wj_edit@wjthinkbig.com'), True)
            + field('PWD',
                    '<div style="display:flex;gap:6px">'
                    '<div class="inp%s" style="flex:1">%s</div>'
                    '<div class="btn sm" style="white-space:nowrap">임의 생성</div></div>'
                    % (' err' if err == 'pw' else '', pwd), True)
            + field('ADDR (주소)', '<div class="inp">경기도 파주시 회동길 20</div>')
            + field('HOMEPAGE', '<div class="inp">https://www.wjthinkbig.com</div>')
            + '</div>')


def svc_select(svc='CasterN'):
    label = [('%s — %s' % (n, d)) for n, d in SERVICES if n == svc][0]
    return (field('사용처 (연동 서비스)', sel(label), True)
            + '<div style="font-size:10.5px;color:#9ca3af;margin-top:4px;line-height:1.5">'
              '계정은 <b>선택한 서비스에서만 로그인</b>됩니다. '
              '서비스는 자기 계정만 관리·인증합니다.</div>')


def until_field(unlimited=True):
    return field('만료일 (기간)',
                 '<div style="display:flex;gap:8px;align-items:center">'
                 '<div class="inp" style="opacity:%s">%s</div>'
                 '<label style="font-size:12.5px;color:#374151;display:flex;align-items:center;'
                 'gap:4px;white-space:nowrap"><input type="checkbox"%s> 무제한</label></div>'
                 % ('.5' if unlimited else '1',
                    'yyyy-mm-dd' if unlimited else '2027-12-31',
                    ' checked' if unlimited else ''))


def result_box():
    return ('<div style="margin-top:14px;background:#fffbeb;border:1px solid #fde68a;'
            'border-radius:10px;padding:12px 14px">'
            '<div style="font-size:12px;color:#92400e;font-weight:700;margin-bottom:6px">'
            '발급 완료 — 계정 + App Key (서비스 DB 등록됨)</div>'
            '<div style="font-size:12.5px;color:#111827;line-height:1.9">'
            '<div>계정 ID: <code>wj_edit@wjthinkbig.com</code></div>'
            '<div>PWD: <code>Kq7mZ2xR4a</code></div>'
            '<div style="display:flex;gap:8px;align-items:center">App Key: '
            '<code style="flex:1;word-break:break-all">'
            'ncc_live_9f3c1a08b2d4471e60c8aa35719fbe02c1d6</code>'
            '<div class="btn sm">전체 복사</div></div></div></div>')


def db_section(state='exist'):
    head = ('<div style="font-weight:700;font-size:13px;margin-bottom:8px">'
            '서비스 DB · 계정 &amp; App Key <span style="color:#9ca3af;font-weight:400">%s</span>'
            '</div>')
    if state == 'empty':
        return ('<div style="margin-top:16px;border-top:1px solid #eef0f4;padding-top:12px">'
                + head % '· 고객사 선택 시 표시'
                + '<div style="font-size:12px;color:#9ca3af;padding:8px 0">'
                  '고객사를 선택하세요.</div></div>')
    if state in ('new', 'sdk'):
        return ('<div style="margin-top:16px;border-top:1px solid #eef0f4;padding-top:12px">'
                + head % '· 웅진씽크빅 (계정 0)'
                + '<div style="font-size:12px;color:#9ca3af;padding:8px 0">'
                  '웅진씽크빅에 등록된 계정이 없습니다.</div></div>')
    rows = ''
    for aid, nm, svc, nk in ACCOUNTS:
        svc_tag = (tag(svc, '#ecfdf5', '#047857') if svc
                   else tag('미지정', '#fef2f2', '#b91c1c'))
        keyrows = ''
        for k, pt, sobp, ks, until, at in KEYS[aid]:
            keyrows += ('<div style="display:flex;align-items:center;gap:8px;margin-top:6px;'
                        'padding-left:10px;font-size:11.5px;color:#6b7280;flex-wrap:wrap">'
                        '<code>%s…</code>%s<span>%s</span><span>유효 %s</span>'
                        '<span style="flex:1"></span><code>%s</code>'
                        '<span style="color:#dc2626">키 삭제</span></div>'
                        % (k[:18],
                           tag('%s %s' % (pt, sobp),
                               '#eef6ff' if pt == 'PDS3' else '#fef3c7',
                               '#2563eb' if pt == 'PDS3' else '#92400e', False),
                           ks, until, at))
        rows += ('<div style="border:1px solid #eef0f4;border-radius:10px;padding:10px 12px;'
                 'margin-bottom:8px">'
                 '<div style="display:flex;align-items:center;gap:8px;font-size:12.5px;'
                 'flex-wrap:wrap"><b>웅진씽크빅</b><code>%s</code>'
                 '<span style="color:#6b7280">%s</span>%s%s'
                 '<span style="flex:1"></span>'
                 '<span style="color:#dc2626">삭제</span></div>%s</div>'
                 % (aid, nm, svc_tag,
                    tag('App Key %d' % nk, '#eef6ff' if nk else '#f3f4f6',
                        '#2563eb' if nk else '#9ca3af', False),
                    keyrows))
    return ('<div style="margin-top:16px;border-top:1px solid #eef0f4;padding-top:12px">'
            + head % ('· 웅진씽크빅 (계정 %d)' % len(ACCOUNTS)) + rows + '</div>')


def form(state='exist', svc='CasterN', unlimited=True, rng='closed', err=None,
         done=False, toast=None):
    empty = (state == 'empty')
    norange = (rng == 'none')
    ready = not empty and not norange

    # ① 계정
    s1 = (step(1, '계정', 'App Key와 연동될 로그인 계정')
          + '<div class="g2">%s%s</div>'
          % (field('회사정보 (고객사)', sel('- 선택 -' if empty else '웅진씽크빅', ph=empty), True),
             field('계정', acct_field(state))))
    if state in ('new', 'sdk', 'switch'):
        s1 += acct_inputs(sdk=(state == 'sdk'), err=err)

    # ② 범위
    if empty:
        pk = picker('nocompany')
    elif norange:
        pk = picker('norange')
    else:
        pk = picker('open' if rng == 'open' else 'closed')
    s2 = ('<div style="margin-top:16px">%s%s</div>'
          % (step(2, '할당된 SOBP 범위', '고객사를 먼저 선택' if empty else '웅진씽크빅'), pk))

    # ③ 발급 조건
    s3 = ('<div style="margin-top:16px">%s<div class="g2">%s%s</div></div>'
          % (step(3, '발급 조건', '사용처 · 만료'), svc_select(svc), until_field(unlimited)))

    btn_label = 'App Key 발급' if state == 'exist' else '계정 등록 + App Key 발급'
    btn = ('<div style="display:flex;justify-content:flex-end;margin-top:14px">'
           '<div class="btn %s">%s</div></div>'
           % ('pri' if ready else 'dis', btn_label))
    ts = ''
    if toast:
        ok = not err
        ts = ('<div style="margin-top:10px;font-size:12.5px;color:%s">%s</div>'
              % ('#047857' if ok else '#dc2626', toast))

    return ('<div class="card"><div class="bd">'
            '<div style="font-weight:700;font-size:14px;margin-bottom:4px">App Key 발급 '
            '<span style="color:#9ca3af;font-weight:400;font-size:12px">'
            '· 계정 + SOBP 를 한 번에 발급</span></div>'
            '<div style="font-size:11.5px;color:#9ca3af;margin-bottom:12px">'
            'App Key는 <b>계정과 연동되는 키</b>입니다. 계정을 먼저 등록(또는 선택)해야 '
            '발급됩니다.</div>'
            '%s%s%s%s%s%s%s</div></div>'
            % (s1, s2, s3, result_box() if done else '', btn, ts,
               db_section('empty' if empty else state)))


def content(**kw):
    return ('<div style="display:grid;grid-template-columns:220px 1fr;gap:14px;'
            'align-items:start">%s<div style="max-width:900px">%s</div></div>'
            % (menu('app'), form(**kw)))


def scr(h=1240, **kw):
    return frame('TKT-01', '티켓 발급', content(**kw), height=h)


NAV = [('발급 메뉴 [N Key]', '클릭', '<code>TKT-01</code>', '고객사 선택 유지'),
       ('발급 메뉴 [발급 목록 · 정산]', '클릭', '<code>TKT-04</code>', '발급 이력·정산')]


def build():
    B = []

    B.append((
        'S1', '진입 — 고객사 미선택', '기본',
        '<code>TKT-01</code> 좌측 발급 메뉴 <b>[계정 + App Key]</b> 로 들어온다. '
        '고객사를 고르기 전에는 계정 칸이 <b>고객사를 먼저 선택</b> 으로 잠기고, '
        '범위·서비스 DB 도 안내만 나오며 <b>발급 버튼이 비활성</b>이다.',
        scr(state='empty', h=1080),
        [('회사정보 (고객사) *', '선택', 'S2 또는 S3',
          '등록된 계정이 있으면 <b>첫 계정 자동 선택</b>(S3), 없으면 <b>신규 등록</b>(S2)'),
         ('고객사 선택 시', '자동', 'ADDR 채움 · 초기화',
          '고객사 주소가 <b>자동 입력</b>되고 SOBP 범위·발급 결과는 초기화'),
         ('계정 칸', '—', '잠금', '<b>고객사를 먼저 선택</b>'),
         ('서비스 DB', '—', '안내', '<b>고객사를 선택하세요.</b>'),
         ('발급 버튼', '—', '비활성', '범위를 고르기 전에는 눌리지 않는다')] + NAV))

    B.append((
        'S2', '등록된 계정 없음 → 신규 등록', '기본',
        '<code>PC-002</code> — 고객이 직접 계정을 만들지 않고 <b>직원이 대신 등록</b>한다. '
        '계정 칸이 초록 안내로 바뀌고 아래에 <b>계정 입력 5칸</b> 이 나온다. '
        '버튼 라벨도 <b>[계정 등록 + App Key 발급]</b> 으로 바뀐다.',
        scr(state='new'),
        [('ID (EMAIL) *', '입력', '—', '<b>이메일 형식</b> 필수 · 이미 등록된 ID 불가'),
         ('PWD *', '입력', '—', '비밀번호 미요청 고객사는 <b>[임의 생성]</b>'),
         ('[임의 생성]', '클릭', 'PWD 자동 채움', '10자리 무작위 문자열'),
         ('ADDR', '—', '자동 채움', '<code>MEM-01</code> 의 고객사 주소 · 수정 가능'),
         ('발급 버튼', '클릭', 'S9', '계정 등록과 키 발급이 <b>한 번에</b> 처리된다'),
         ('서비스 DB', '—', '안내', '<b>웅진씽크빅에 등록된 계정이 없습니다.</b>')] + NAV))

    B.append((
        'S3', '기존 계정 선택', '분기',
        '이 고객사에 이미 계정이 있으면 <b>목록에서 고른다</b>. '
        '신규 입력 항목은 나오지 않고 버튼 라벨이 <b>[App Key 발급]</b> 이 된다. '
        '계정 하나에 App Key 를 <b>여러 개</b> 발급할 수 있다.',
        scr(state='exist', h=1320),
        [('계정', '선택', '발급 대상 계정 지정', '목록 맨 아래에 <b>＋ 신규 계정 등록</b>'),
         ('계정 변경', '선택', '발급 결과 초기화', '이전 발급 결과 영역이 사라진다'),
         ('발급 버튼', '클릭', 'S9', '기존 계정에 키만 추가'),
         ('App Key 상한', '—', '<b>미결</b>', '⚠ §7 — 계정당 키 개수 제한 미정')] + NAV))

    B.append((
        'S4', '＋ 신규 계정 등록으로 전환', '분기',
        '기존 계정이 있어도 목록에서 <b>＋ 신규 계정 등록</b> 을 고르면 '
        '계정 입력 항목이 다시 나온다. 같은 고객사에 <b>담당자별로 계정을 나눠</b> '
        '발급할 때 쓴다.',
        scr(state='switch', h=1400),
        [('＋ 신규 계정 등록', '선택', '입력 항목 표시', '버튼 라벨도 [계정 등록 + App Key 발급]'),
         ('기존 계정으로 복귀', '선택', 'S3', '목록에서 계정을 다시 고르면 된다'),
         ('ID 중복', '발급', '인라인 오류', '<b>이미 등록된 ID(email)입니다.</b>')] + NAV))

    B.append((
        'S5', 'SOBP 범위 목록 펼침', '분기',
        '<code>P-05</code> — 범위를 <b>직접 타이핑하지 않는다</b>. '
        '고객사가 할당받은 범위만 고를 수 있고, 고른 범위의 '
        '<b>Section · Owner · Book · Page · PatternType</b> 이 키에 그대로 연결된다 '
        '<code>P-02</code>.',
        scr(state='exist', rng='open', h=1400),
        [('범위 트리거', '클릭', '목록 펼침', '접힘 상태에서는 선택된 범위만 칩으로 표시'),
         ('범위 항목', '클릭', '선택 반영 · 닫힘', '순번 + S/O/B/P 칩 · 선택 항목에 <b>✓</b>'),
         ('목록 밖', '클릭', '닫힘', '선택은 그대로'),
         ('범위 미선택', '발급', '인라인 오류', '<b>할당된 SOBP 범위를 선택하세요.</b>')] + NAV))

    B.append((
        'S6', '할당된 SOBP 범위 없음', '차단',
        '고객사는 골랐지만 <code>SOB-02</code> 로 할당받은 코드가 없는 경우. '
        '<b>발급 버튼이 비활성</b>으로 유지된다.',
        scr(state='exist', rng='none', h=1320),
        [('범위 자리', '표시', '—', '<b>이 고객사에 할당된 SOBP 범위가 없습니다.</b>'),
         ('발급 버튼', '—', '비활성', ''),
         ('해결', '이동', '<code>SOB-02</code>', '코드를 할당한 뒤 재시도'),
         ('미등록 고객사', '이동', '<code>MEM-02</code>', '고객사 등록 후 재시도')] + NAV))

    B.append((
        'S7', '사용처 = SDK 연동', '분기',
        '<code>P-13</code> — 사용처는 <b>계정이 로그인할 수 있는 서비스</b>를 정한다. '
        'SDK 연동은 화면 로그인이 아니라 <b>id/pwd + SOBP 를 직접 쓰는</b> 방식이라 '
        '비밀번호를 고객이 요청하지 않는 경우가 많고, 이때 <b>[임의 생성]</b> 으로 지정한다.',
        scr(state='sdk', svc='SDK 연동'),
        [('사용처', '선택', '—', 'CasterN / 폼솔루션 / SDK 연동 <b>3종</b> · 기본 CasterN'),
         ('사용처 효과', '—', '로그인 범위',
          '계정은 <b>그 서비스에서만</b> 로그인된다 — 다른 서비스에서는 인증되지 않는다'),
         ('[임의 생성]', '클릭', 'PWD 채움', '비밀번호 미요청 고객사(SDK)용'),
         ('사용처 변경', '—', '<b>미결</b>',
          '⚠ §7 — 현재는 계정 재등록. 기존 App Key 처리 방식 미정')] + NAV))

    B.append((
        'S8', '만료일 지정 (무제한 해제)', '분기',
        '<b>무제한</b> 이 기본이며 이때 날짜 입력은 흐리게 잠긴다. '
        '체크를 풀면 달력으로 만료일을 고른다. 값은 App Key 에 <b>유효 기한</b> 으로 기록된다.',
        scr(state='exist', unlimited=False, h=1320),
        [('무제한', '체크', '날짜 잠금', 'App Key 유효 기한 = <b>무제한</b>'),
         ('무제한', '해제', '달력 활성', '고른 날짜가 유효 기한이 된다'),
         ('키 회수(폐기)', '—', '<b>미결</b>',
          '⚠ §7 — 삭제 외에 “정지 / 만료 처리” 상태가 필요한지 미정')] + NAV))

    B.append((
        'S9', '발급 완료', '완료',
        '결과 영역에 <b>계정 ID · PWD · App Key</b> 가 나온다. '
        '<b>[전체 복사]</b> 로 세 값을 한 번에 복사해 고객사에 전달한다. '
        '신규 계정이었다면 입력 항목이 비워지고 <b>방금 만든 계정이 선택 상태</b>가 된다.',
        scr(state='exist', done=True, h=1420,
            toast='App Key 발급 완료 — 계정과 연동되어 서비스 DB에 등록되었습니다.'),
        [('발급 결과', '표시', '—', '<b>발급 완료 — 계정 + App Key (서비스 DB 등록됨)</b>'),
         ('[전체 복사]', '클릭', '클립보드', '<b>계정·키 정보가 복사되었습니다.</b>'),
         ('서비스 DB', '자동', '목록에 추가', '계정 아래에 새 App Key 행이 붙는다'),
         ('발급 이력', '자동', '<code>TKT-04</code>', 'App Key 종류로 1건 추가'),
         ('활동 로그', '자동', '<code>LOG-01</code>', '<b>티켓 발급</b> 으로 기록'),
         ('비밀번호 전달', '—', '<b>미결</b>',
          '⚠ §7 — 현재는 화면 표시·복사. 안전한 전달 경로 필요 여부 미정')] + NAV))

    B.append((
        'S10', '검증 실패 — 인라인 메시지', '오류',
        '발급 버튼은 <b>순서대로 검사</b>하고 하나라도 걸리면 그 자리에서 멈춘다. '
        '메시지는 버튼 아래 <b>빨간 한 줄</b>로 나오고 입력값은 그대로 남는다. '
        '①~④는 <b>신규 계정일 때만</b> 검사한다.',
        scr(state='new', err='id', h=1240,
            toast='계정 ID는 이메일 형식이어야 합니다.'),
        [('① 회사 미선택', '검사', '중단', '<b>회사(고객사)를 선택하세요.</b>'),
         ('② ID 형식 오류', '검사', '중단', '<b>계정 ID는 이메일 형식이어야 합니다.</b>'),
         ('③ 비밀번호 없음', '검사', '중단',
          '<b>비밀번호가 필요합니다. (요청 없으면 [임의 생성])</b>'),
         ('④ 범위 미선택', '검사', '중단', '<b>할당된 SOBP 범위를 선택하세요.</b>'),
         ('⑤ ID 중복', '등록', '중단', '<b>이미 등록된 ID(email)입니다.</b>'),
         ('⑥ 계정 미선택', '검사', '중단', '<b>계정을 선택하세요.</b> (기존 계정 모드)')] + NAV))

    B.append((
        'S11', '서비스 DB · 계정 & App Key', '목록',
        '선택한 고객사의 <b>계정별 App Key</b> 를 확인·정리한다. '
        '계정 줄에 <b>사용처 배지</b> 와 <b>App Key 개수</b> 가, 키 줄에 '
        '<b>코드 범위 배지 · 사용처 · 유효 기한 · 생성 일시</b> 가 나온다. '
        '사용처가 없는 과거 계정은 <b>미지정</b>(빨강)으로 표시된다.',
        scr(state='exist', h=1320),
        [('사용처 배지', '표시', '—', '이 계정이 <b>로그인할 수 있는 서비스</b>'),
         ('미지정 배지', '표시', '—',
          '사용처가 없는 과거 계정 — ⚠ §7 일괄 지정 방법 미정'),
         ('App Key {n} 배지', '표시', '—', '이 계정에 연동된 키 개수'),
         ('계정 [삭제]', '클릭', 'S12 확인창', '연동 App Key 가 <b>함께</b> 삭제된다'),
         ('[키 삭제]', '클릭', '즉시 삭제', '<b>확인창 없이</b> 해당 키만 삭제된다')] + NAV))

    B.append((
        'S12', '계정 삭제 확인창', '확인창',
        '계정을 지우면 <b>연동된 App Key 도 함께</b> 사라진다. '
        '되돌릴 수 없으므로 확인창으로 한 번 막는다.',
        frame('TKT-01', '티켓 발급', content(state='exist'),
              overlay='<div class="ovl"><div class="mdl">'
                      '<div class="mh"><div class="mt">확인</div><div class="mx">✕</div></div>'
                      '<div style="font-size:13px;color:#374151;line-height:1.7">'
                      '이 계정과 연동 App Key를 삭제할까요?</div>'
                      '<div class="mf"><div class="btn gho">취소</div>'
                      '<div class="btn dan">삭제</div></div></div></div>',
              height=1320),
        [('[삭제]', '클릭', '계정 + 키 삭제', '서비스 DB 목록에서 사라진다'),
         ('[취소]', '클릭', '<code>TKT-03</code>', '변경 없음'),
         ('키만 삭제', '—', '확인창 없음', '[키 삭제]는 확인 없이 바로 지운다')] + NAV))

    intro = ('<b>App Key = 계정과 연동되는 키</b>. 온라인 편집툴(Caster U)·폼솔루션·SDK 에서 쓰며 '
             '<b>계정(ID/PWD)과 SOBP 범위를 한 번에</b> 발급한다. '
             '계정이 없으면 발급할 수 없으므로 신규 고객사는 이 화면에서 '
             '계정 등록과 키 발급을 한 흐름으로 처리한다.<br>'
             '카드 한 장 안에 <b>① 계정 → ② 할당된 SOBP 범위 → ③ 발급 조건</b> 이 이어지고, '
             '맨 아래에 <b>서비스 DB</b> 목록이 붙는다. '
             '<code>TKT-01</code> 과 <b>고객사 선택값을 공유</b>한다.')
    return page(CODE, NAME, PRD, intro, B)
