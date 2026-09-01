# -*- coding: utf-8 -*-
"""SOB-02 직접 코드 할당 — 실제 화면(SOBP 맵의 코드 할당 창) 상태 그대로.

자동 추천은 사용하지 않기로 확정 → 모드 토글 없음. 이 창은 항상 직접 선택이다.
상태는 화면에서 실제로 갈라지는 것만 담는다(S1~S10).
"""
from shell import page, frame
from p_tkt01 import sel, field
import p_sob01

CODE, NAME = 'SOB-02', '직접 코드 할당'
PRD = 'docs/prd/SOB-02_직접 코드 할당.md'

SC_C = {'S': '#5f8ff0', 'O': '#14b8a6', 'B': '#8b5cf6', 'P': '#f59e0b'}

SERVICES = (
    ('NONE', '서비스 없음 (코드만 발급)', '코드만 발급 — 자체 서비스 미사용(사용량 모니터링 불가).'),
    ('CASTERN', 'casterN (편집툴)', 'casterN 편집툴 — [편집 프로젝트]에서 관리·모니터링.'),
    ('FORMSOLUTION', '폼솔루션', '자체 서비스 — 코드 사용량이 모니터링됩니다.'),
)


# ── 조각 ────────────────────────────────────────────────────────────
def sc(k, v):
    return ('<span style="display:inline-flex;align-items:center;gap:5px;'
            'border:1px solid #e5e7eb;border-radius:8px;padding:2px 6px 2px 2px;'
            'background:#fff;font-size:12px;white-space:nowrap">'
            '<span style="background:%s;color:#fff;font-weight:700;font-size:10.5px;'
            'border-radius:6px;padding:2px 6px;min-width:12px;text-align:center">%s</span>'
            '<span style="font-family:ui-monospace,monospace;color:#111827">%s</span></span>'
            % (SC_C[k], k, v))


# 코드 종류(좌표 속성) 배지 — PDS3 · PDS2 · PDS4(S-code) · OID · IDS
KIND_C = {'PDS3': '#2563eb', 'PDS2': '#d97706', 'PDS4': '#7c3aed',
          'OID': '#0f766e', 'IDS': '#6b7280'}


def pbadge(k='N', fs=9):
    k = {'N': 'PDS3', 'G': 'PDS2'}.get(k, k)
    return ('<span style="font-size:%spx;font-weight:700;color:#fff;background:%s;'
            'border-radius:4px;padding:1px 5px">%s</span>'
            % (fs, KIND_C.get(k, '#2563eb'), k))


def help_i(t=''):
    return ('<span title="%s" style="display:inline-flex;align-items:center;'
            'justify-content:center;width:14px;height:14px;border-radius:50%%;'
            'border:1px solid #cbd5e1;color:#94a3b8;font-size:9px;flex:none">?</span>' % t)


def tag(text, bg, fg, fs='9.5px'):
    return ('<span style="font-size:%s;background:%s;color:%s;border-radius:5px;'
            'padding:2px 7px;font-weight:700">%s</span>' % (fs, bg, fg, text))


def notebox(kind, inner):
    c = {'lock': ('#fef2f2', '#fecaca', '#991b1b'),
         'share': ('#faf5ff', '#e9d5ff', '#6b21a8'),
         'base': ('#f5f9ff', '#bfdbfe', '#1e3a8a')}[kind]
    return ('<div style="display:flex;align-items:center;gap:4px;border:1px solid %s;'
            'background:%s;color:%s;border-radius:10px;padding:8px 12px;font-size:12.5px;'
            'margin-bottom:12px">%s</div>' % (c[1], c[0], c[2], inner))


def kind_chips(kind='PDS3', fixed=False):
    """코드 종류 — 이 창에서 고르지 않는다 `PC-051`. 이미 쓰는 종류만 배지로 보여 준다."""
    if fixed:
        return ('<div class="inp" style="background:#fafbfc;display:flex;align-items:center;gap:6px">'
                '%s</div>' % pbadge(kind))
    return ('<div class="inp" style="background:#fafbfc;display:flex;align-items:center;'
            'gap:6px;color:#9ca3af;font-size:11.5px">미정 · 발급 때 지정</div>')
    out = ''
    for k in ('PDS2', 'PDS3'):
        on = (k == kind)
        out += ('<span style="flex:1;text-align:center;font-size:12px;border-radius:7px;'
                'padding:7px 4px;font-weight:%s;border:1px solid %s;background:%s;color:%s">%s</span>'
                % ('700' if on else '400',
                   KIND_C[k] if on else '#e5e7eb',
                   ('#fef3c7' if k == 'PDS2' else '#eef6ff') if on else '#fff',
                   KIND_C[k] if on else '#6b7280', k))
    return '<div style="display:flex;gap:5px">%s</div>' % out


def svc_chips(svc='NONE'):
    """사용 서비스 — 복수 선택 `PC-049`. 서비스 없음은 단독 선택"""
    on_set = svc if isinstance(svc, (list, tuple)) else [svc]
    out = ''
    for v, short in (('CASTERN', 'casterN'), ('FORMSOLUTION', '폼솔루션'), ('NONE', '서비스 없음')):
        on = v in on_set
        out += ('<span style="flex:1;text-align:center;font-size:11.5px;border-radius:7px;'
                'padding:7px 4px;font-weight:%s;border:1px solid %s;background:%s;color:%s">%s</span>'
                % ('700' if on else '400', '#93c5fd' if on else '#e5e7eb',
                   '#eef6ff' if on else '#fff', '#2563eb' if on else '#6b7280', short))
    return '<div style="display:flex;gap:5px">%s</div>' % out


def cust_svc(cust='', svc='NONE', kind='PDS3', kind_fixed=False, used=False):
    """고객사 · 사용 서비스 · 코드 종류 — 한 행 `PC-047`.
    이미 발급된 좌표(used)면 고객사는 **상태 표시**, 사용 서비스만 바꿀 수 있다 `PC-048`"""
    if used:
        co = ('<div class="inp" style="background:#fafbfc;display:flex;align-items:center;gap:6px">'
              '<b>%s</b><span style="font-size:11px;color:#9ca3af">보유</span></div>' % cust)
    else:
        co = sel(cust or '고객사 선택 또는 검색', ph=not cust)
    return ('<div style="display:grid;grid-template-columns:1.2fr 1fr 1.1fr;gap:12px;'
            'align-items:start;margin-top:10px;border:1px solid #eef0f4;border-radius:10px;'
            'padding:12px 13px">%s%s%s</div>'
            % (field('고객사', co, not used),
               field('사용 서비스 (복수 선택)', svc_chips(svc)),
               field('코드 종류', kind_chips(kind, kind_fixed))))


def owned(cust='웅진씽크빅', rows=None):
    if not cust:
        return ''
    rows = [] if rows is None else rows
    head = ('<div style="display:flex;align-items:center;gap:6px;font-size:12px;'
            'color:#6b7280;margin-bottom:6px"><b style="color:#374151">%s</b> 기존 보유 코드'
            '<span style="color:#9ca3af">%d건</span>%s</div>'
            % (cust, len(rows),
               help_i('이 고객사가 이미 할당받은 S/O 입니다.\n'
                      '· 코드를 클릭하면 그 S/O로 이동해 이어서 추가 발급할 수 있습니다.')))
    if not rows:
        body = ('<div style="font-size:12px;color:#9ca3af;padding:6px 0">'
                '보유한 코드가 없습니다 — 새 S/O로 발급됩니다.</div>')
    else:
        cells = ''
        for k, s, o, b, p, on in rows:
            inner = pbadge(k) + sc('S', s) + sc('O', o) + sc('B', b)
            if p:
                inner += sc('P', p)
            cells += ('<span title="이 S/O 로 이동해서 이어서 추가 발급 (시작 Book 자동)" '
                      'style="display:inline-flex;align-items:center;gap:6px;border-radius:8px;'
                      'padding:4px 8px;font-size:11.5px;border:1px solid %s;background:%s">%s</span>'
                      % ('#93c5fd' if on else '#eef0f4', '#eef6ff' if on else '#fff', inner))
        body = ('<div style="display:grid;grid-template-columns:repeat(2,1fr);'
                'justify-items:start;gap:6px;max-height:112px;overflow-y:auto">%s</div>'
                '<div style="font-size:11px;color:#9ca3af;margin-top:5px">'
                '코드를 클릭하면 해당 S/O로 이동하고 <b>시작 Book이 가장 빠른 빈 번호</b>로 '
                '자동 설정됩니다.</div>' % cells)
    return '<div style="margin-top:10px">%s%s</div>' % (head, body)


def detail(cust='웅진씽크빅', sec=3, own=17, locked=None, cross=False, kind='PDS3', shared=False):
    """발급 대상 — 좌표는 지도에서 고른다. 모달에서는 상태만 보여 준다 `PC-046`"""
    lk = bool(locked)
    st = ('🔒 전용 · 추가 발급 불가', '#fee2e2', '#991b1b') if lk else (
         ('공유 OWNER · Book 만 배타', '#f3e8ff', '#6b21a8') if shared else (
         ('사용 중 · 이어서 발급', '#ccfbf1', '#0f766e') if cross else ('미발급 · 신규 발급', '#eef6ff', '#2563eb')))
    bar = '<span style="font-size:11.5px;color:#6b7280;font-weight:700">발급 대상</span>'
    bar += sc('S', sec) + sc('O', own) + pbadge(kind) + tag(st[0], st[1], st[2])
    bar += ('<span style="flex:1"></span>'
            '<span style="font-size:11px;color:#9ca3af">owner 전체 점유 · 규모는 편집 시 집계</span>')
    msg = ''
    if lk:
        msg = ('<div style="margin-top:7px;font-size:12px;color:#b91c1c;font-weight:700">'
               '“%s” 전용으로 추가 발급이 불가</div>' % locked)
    return ('<div style="border:1px solid %s;background:%s;border-radius:10px;padding:11px 13px">'
            '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">%s</div>%s</div>'
            % ('#fecaca' if lk else '#e5e7eb', '#fef2f2' if lk else '#fafbfc', bar, msg))


def modal(title, body, save_off=False, save='할당'):
    return ('<div class="ovl"><div class="mdl xw">'
            '<div class="mh"><div class="mt">%s</div><div class="mx">✕</div></div>'
            '%s<div class="mf"><div class="btn gho">취소</div>'
            '<div class="btn pri"%s>%s</div></div></div></div>'
            % (title, body, ' style="opacity:.5"' if save_off else '', save))


T = '코드 할당'
OWN2 = [('N', 3, 17, '0~99', '', True), ('G', 0, 212, '111~199', '1~4,095', False)]

CLOSE = [('[취소] · ✕', '클릭', '<code>SOB-01</code>', '변경 없이 복귀')]


def scr(overlay, h=1180):
    return frame('SOB-01', 'SOBP 맵',
                 p_sob01.content(pds='N', sel_s=3, sel_o=17),
                 overlay=overlay, height=h)


def build():
    B = []

    B.append((
        'S1', '진입 직후 — 고객사 미선택', '기본',
        '<code>SOB-01</code> 의 <b>[＋ 직접 코드 할당]</b> 으로 열린다. 구성은 세 묶음이다 '
        '<code>PC-046</code> — ① <b>발급 대상</b>(좌표·종류·상태를 <b>보여 주기만</b> 한다) '
        '② <b>발급 정보</b>(고객사 · 사용 서비스 · 코드 종류) ③ <b>보유 코드</b>(고객사를 고르면 나온다). '
        '좌표(Section · Owner)는 <b>지도에서 고른 값</b>이라 모달에서 바꾸지 않는다. '
        '<b>[할당]</b> 은 고객사를 고르기 전에는 눌리지 않고, 사용 서비스 기본값은 <b>서비스 없음</b>.',
        scr(modal(T, detail('') + cust_svc('', 'NONE') + owned(''), save_off=True)),
        [('고객사 *', '목록 선택 또는 직접 입력(검색)', '기존 보유 코드 영역 표시',
          '<code>MEM-01</code> 에 등록된 고객사만 — <b>여기서 신규 고객사를 만들지 않는다</b>'),
         ('사용 서비스', '선택', '아래 안내문 교체',
          'casterN / 폼솔루션 / 서비스 없음 <b>3종</b> <code>PC-026</code>'),
         ('코드 종류', '—', '<b>미정 · 발급 때 지정</b>',
          '<b>PDS3 · PDS2 · PDS4</b> 중 하나(단일 선택). 골라도 <b>S/O 가 바뀌지 않는다</b> '
          '<code>PC-046</code>. 이미 쓰는 종류가 있으면 <b>그 종류로 고정</b>되고 문구로만 보여 준다. '
          'OID 는 index 부여라 할당 대상이 아니다 <code>PC-035</code>'),
         ('Section · Owner', '—', '<b>상태 표시</b>',
          '지도에서 고른 좌표를 <b>보여 주기만</b> 한다 — 셀렉트·입력 칸을 두지 않는다 <code>PC-046</code>'),
         ('[할당]', '—', '비활성',
          '고객사 미선택 · 전용 · 과거 혼용 좌표 · 공유 코드 미사용 고객사 중 하나라도 걸리면 잠긴다'),
         ('[할당]', '강제 실행', '확인창',
          '<b>고객사를 선택하세요. (신규 고객사는 고객사 관리에서 등록)</b>')] + CLOSE))

    B.append((
        'S2', '고객사 선택 · 보유 코드 없음', '분기',
        '이 고객사가 아직 받은 코드가 없는 경우. 안내 한 줄만 나온다 — '
        '<b>보유한 코드가 없습니다 — 새 S/O로 발급됩니다.</b>',
        scr(modal(T, detail('아이스크림에듀') + cust_svc('아이스크림에듀', 'NONE')
                  + owned('아이스크림에듀', []))),
        [('[할당]', '클릭', '<code>SOB-01</code> 복귀', '지도 갱신 · 선택 Book 초기화'),
         ('미등록 고객사', '[할당]', '확인창 → <code>MEM-02</code>',
          '<b>고객사 관리에 등록된 고객사가 아닙니다. 먼저 고객사 관리에서 등록하세요.</b>')]
        + CLOSE))

    B.append((
        'S3', '고객사 선택 · 보유 코드 있음', '분기',
        '이 고객사가 이미 받은 코드를 <b>2열</b> 로 보여준다(많으면 영역 안에서 스크롤). '
        '지금 보고 있는 코드 종류·S·O 와 같은 칸만 <b>파랑으로 강조</b>된다. '
        'Page 범위는 <b>지정된 코드에만</b> 붙는다.',
        scr(modal(T, detail('웅진씽크빅') + cust_svc('웅진씽크빅', 'NONE')
                  + owned('웅진씽크빅', OWN2))),
        [('보유 코드', '클릭', '그 S/O 로 이동',
          '지도 선택이 함께 바뀌고 <b>시작 Book 이 가장 빠른 빈 번호</b> 로 자동 설정된다'),
         ('보유 코드', '클릭 — 빈 Book 없음', '인라인 오류',
          '<b>S{n}/O{n} 에 사용 가능한 Book 번호가 없습니다.</b>')] + CLOSE))

    B.append((
        'S4', '사용 서비스 = casterN', '분기',
        '<code>P-14</code> — casterN 으로 지정하면 그 코드는 '
        '<b>편집 프로젝트(<code>PRJ-02</code>) 관리 대상</b> 이 된다. '
        '이후 편집 진행과 정산은 <code>PRJ-03</code> 에서 이어진다.',
        scr(modal(T, detail('웅진씽크빅') + cust_svc('웅진씽크빅', 'CASTERN')
                  + owned('웅진씽크빅', OWN2))),
        [('사용 서비스 = casterN', '선택', '<code>PRJ-02</code> → <code>PRJ-03</code>',
          '이 코드가 편집 대상으로 표시된다'),
         ('[할당]', '성공', '<code>LOG-01</code>',
          '<b>{고객사} · PDS3 S{n}/O{n} · casterN (편집툴) · SO 점유(전체 book 사용가능)</b>')]
        + CLOSE))

    B.append((
        'S5', '사용 서비스 — 복수 선택', '분기',
        '<code>PC-026</code> — 지정할 수 있는 서비스는 3종뿐이고, '
        '<b>여러 서비스를 함께 고를 수 있다</b> <code>PC-049</code>. '
        '<b>서비스 없음</b> 은 단독 선택이라 고르면 나머지가 해제된다. '
        '그 외 용도(Ncode 프린터 등)의 코드는 <b>서비스 없음(코드만 발급)</b> 으로 할당한다.',
        scr(modal(T, detail('웅진씽크빅')
                  + cust_svc('웅진씽크빅', ['CASTERN', 'FORMSOLUTION'])
                  + owned('웅진씽크빅', OWN2))),
        [('사용 서비스', '복수 선택', '칩 다중 활성',
          'casterN · 폼솔루션 을 함께 지정할 수 있다 <code>PC-049</code>'),
         ('서비스 없음', '선택', '나머지 해제', '단독 선택 항목'),
         ('[할당]', '성공', '<code>LOG-01</code>',
          '<b>{고객사} · PDS3 S{n}/O{n} · casterN (편집툴) · 폼솔루션 · SO 점유</b>')] + CLOSE))

    B.append((
        'S6', '전용 코드 — 입력 잠금', '차단',
        '<code>P-05</code> 무겹침 — 이 S/O 를 <b>다른 고객사가 전용으로 쓰고 있는</b> 경우. '
        '발급 대상이 빨강으로 바뀌고 <b>🔒 전용 · 추가 발급 불가</b> 배지와 '
        '<b>“{업체명}” 전용으로 추가 발급이 불가</b> 한 줄이 나온다 <code>PC-048</code>. '
        '고객사는 <b>보유 업체 상태 표시</b>(입력 칸이 아니다), 코드 종류도 배지로만 보여 주며, '
        '바꿀 수 있는 것은 <b>사용 서비스</b> 하나다.',
        scr(modal(T, detail('웅진씽크빅', locked='대교')
                  + cust_svc('대교', 'NONE', kind_fixed=True, used=True)
                  + owned('대교', OWN2), save_off=True, save='사용 서비스 저장')),
        [('고객사', '—', '<b>상태 표시</b>', '보유 업체명 + <b>보유</b> — 고르는 값이 아니다 <code>PC-048</code>'),
         ('코드 종류', '—', '<b>상태 표시</b>', '쓰고 있는 종류를 배지로만 보여 준다'),
         ('사용 서비스', '선택', '<b>[사용 서비스 저장]</b> 활성',
          '현재 지정된 값이 그대로 뜨고, 바꾸면 저장 버튼이 열린다 <code>PC-048</code>'),
         ('[사용 서비스 저장]', '클릭', '<code>SOB-01</code> 복귀',
          '그 좌표의 <b>사용 서비스만</b> 바꾼다 — 코드는 새로 발급하지 않는다'),
         ('추가 발급', '—', '<b>불가</b>',
          'SO 단위 점유라 이미 발급된 좌표에는 다시 발급하지 않는다 <code>P-05</code>')] + CLOSE))

    B.append((
        'S7', '공유 OWNER', '분기',
        '<code>P-07</code> 의 예외 · <code>P-12</code> — 미리 <b>공유(커먼) 코드로 지정된 Owner</b>. '
        '여러 고객사가 같은 Owner 를 쓸 수 있고 <b>Book 번호만 겹치지 않으면 된다</b>. '
        '전용 잠금이 걸리지 않는다.',
        scr(modal(T, detail('웅진씽크빅', sec=3, own=964, shared=True)
                  + cust_svc('웅진씽크빅', 'NONE', kind='PDS2')
                  + owned('웅진씽크빅', OWN2))),
        [('공유 판정', '자동', '보라 안내', '공유로 지정된 Owner 면 항상 이 상태'),
         ('현재 사용 고객사', '안내 아이콘', '툴팁', '공유 사유 + 실사용 고객사 목록'),
         ('사용 고객사 검사', '고객사 선택', '<b>차단</b>',
          '<b>[고객사 관리] 에서 이 공통코드의 사용 고객사(하위 등록)로 체크한 곳에만</b> 발급한다 '
          '<code>PC-045</code> — 아니면 🚫 안내 + <b>[할당] 비활성</b>. 보유(대표) 고객사는 예외'),
         ('[할당]', '클릭', '정상 발급', '사용 고객사이고 Book 번호가 겹치지 않으면 발급된다')] + CLOSE))

    B.append((
        'S8', '같은 S/O 를 여러 종류가 함께 사용', '분기',
        '<code>PC-039</code> — <b>좌표(SOBP)가 코드 종류보다 상위</b>다. 예전의 '
        '<b>🚫 영역 할당됨</b> 차단은 <b>폐지</b>했고, 좌표가 어떤 종류인지는 <b>용도 표시</b>로만 남는다. '
        '같은 <b>S/O</b> 안에서 <b>Book 을 나눠</b> PDS2·PDS3 를 함께 쓰는 <b>과거 이력 3건</b>'
        '(S3/O42 · S3/O44 · S3/O1020)은 그대로 보여 준다. '
        '다만 <b>신규 발급은 한 S/O 에 한 종류만</b> 하므로 이 화면에서는 막는다 <code>PC-041</code>.',
        scr(modal(T, detail('웅진씽크빅', cross=True)
                  + cust_svc('웅진씽크빅', 'NONE', kind_fixed=True, used=True)
                  + owned('웅진씽크빅', OWN2), save_off=True)),
        [('종류 배타', '—', '폐지', '<b>🚫 영역 할당됨</b> 배지·차단·확인창을 모두 없앴다'),
         ('코드 종류', '선택', '용도 표시',
          '할당한 좌표가 <b>PDS2 / PDS3 / PDS4</b> 중 무엇으로 쓰이는지만 기록한다'),
         ('전용 잠금', '—', '유지', '<b>다른 고객사</b> 전용 코드는 여전히 잠긴다(S6)'),
         ('(S,O,B) 중복', '—', '<b>확인 필요</b>',
          '⚠ 실데이터에 Book 까지 겹치는 사례 <b>1건</b>(S3/O1017/B1 · J research) — '
          '장부 표기 확인 필요')] + CLOSE))

    B.append((
        'S9', '저장 실패 — 확인창', '오류',
        '[할당] 을 누르면 아래 순서로 확인하고, 하나라도 걸리면 <b>확인창을 띄우고 멈춘다</b>. '
        '창은 닫히지 않아 값을 고쳐 다시 시도할 수 있다.',
        scr(modal(T, detail('웅진씽크빅') + cust_svc('웅진씽크빅', 'NONE')
                  + owned('웅진씽크빅', OWN2)
                  + '<div class="toast err" style="margin:12px 0 0">'
                    '⚠ 할당이 저장되지 않았습니다.<br>저장 용량을 초과했습니다.</div>')),
        [('① 고객사 미선택', '확인창', '중단',
          '<b>고객사를 선택하세요. (신규 고객사는 고객사 관리에서 등록)</b>'),
         ('② 전용 코드', '확인창', '중단',
          '<b>전용 코드입니다. S{n}/O{n} 는 이미 {고객사} 에 할당되어 있습니다.</b>'),
         ('③ 반대 코드 종류 충돌', '확인창', '중단',
          '<b>{PDS3|PDS2} 에서 이 owner를 이미 사용 중입니다. '
          '같은 S/O 는 PDS3·PDS2 중 한쪽만 사용할 수 있습니다.</b>'),
         ('④ 미등록 고객사', '확인창', '중단 → <code>MEM-02</code>',
          '<b>고객사 관리에 등록된 고객사가 아닙니다. 먼저 고객사 관리에서 등록하세요.</b>'),
         ('⑤ 저장 실패', '확인창', '중단',
          '<b>⚠ 할당이 저장되지 않았습니다.</b> + 사유')] + CLOSE))

    B.append((
        'S10', '할당 성공', '완료',
        '<b>owner 전체를 그 고객사가 점유</b>한다. Owner 아래 모든 Book 이 '
        '<b>사용가능</b> 이 되고, 실제 발급 규모(코드 수)는 <b>0으로 시작해 편집 시 집계</b>된다. '
        '창이 닫히고 지도로 돌아가며 선택 Book 이 초기화된다.',
        frame('SOB-01', 'SOBP 맵',
              p_sob01.content(pds='N', sel_s=3, sel_o=17, sel_b=0), height=1180),
        [('[할당]', '성공', '<code>SOB-01</code>', '지도 갱신 · 선택 Book 초기화'),
         ('발급 결과', '자동', '<code>PRJ-01</code>',
          '<b>{고객사} 코드발급 · S{n}/O{n}</b> 코드 프로젝트가 생성된다'),
         ('발급 결과', '자동', '<code>LOG-01</code>', '<b>코드 할당(등록)</b> 으로 기록'),
         ('할당 취소·회수', '—', '<b>미결</b>',
          '⚠ §7 — 되돌리기 기능이 없다. 잘못 할당하면 <code>PRJ-01</code> 에서 프로젝트를 지워야 한다')]))

    intro = ('<b>NcodeCenter에서 코드의 주인이 정해지는 유일한 지점</b>이며, '
             '이 코드를 어떤 서비스가 쓸지(<b>사용 서비스</b>)도 여기서만 지정한다 '
             '<code>PC-011</code>. 할당 단위는 <b>S/O</b> — Owner 전체를 그 고객사가 점유한다.<br>'
             '<code>SOB-01</code> 의 <b>[＋ 직접 코드 할당]</b> 으로만 열리며, '
             '<b>자동 추천은 사용하지 않는다</b>(모드 토글 없음).')
    return page(CODE, NAME, PRD, intro, B)
