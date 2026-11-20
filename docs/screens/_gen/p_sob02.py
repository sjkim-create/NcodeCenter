# -*- coding: utf-8 -*-
"""SOB-02 직접 코드 할당 — 실제 화면(SOBP 맵의 코드 할당 창) 상태 그대로.

자동 추천은 사용하지 않기로 확정 → 모드 토글 없음. 이 창은 항상 직접 선택이다.
상태는 화면에서 실제로 갈라지는 것만 담는다(S1~S10).
"""
from shell import page, frame
from shell import sel, field
import p_sob01

CODE, NAME = 'SOB-02', '직접 코드 할당'
PRD = 'docs/prd/SOB-02_직접 코드 할당.md'

SC_C = {'S': '#5f8ff0', 'O': '#14b8a6', 'B': '#8b5cf6', 'P': '#f59e0b'}

SERVICES = (
    ('NONE', 'SDK 연동 (코드만 할당)', '코드만 발급 — 자체 서비스 미사용(사용량 모니터링 불가).'),
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
    """사용 서비스 — **읽기 표시** `PC-076`. 고객사 관리에서 정한 값을 그대로 보여 준다"""
    on_set = [v for v in (svc if isinstance(svc, (list, tuple)) else [svc])
              if v in ('CASTERN', 'FORMSOLUTION')]
    label = {'CASTERN': 'casterN (편집툴)', 'FORMSOLUTION': '폼솔루션'}
    if on_set:
        body = ''.join('<span style="font-size:10.5px;border-radius:6px;padding:2px 7px;'
                       'font-weight:700;background:#eef6ff;color:#2563eb">%s</span>' % label[v]
                       for v in on_set)
    else:
        body = '<span style="font-size:12px;color:#9ca3af">SDK 연동 (코드만 할당)</span>'
    return ('<div class="inp" style="background:#fafbfc;display:flex;align-items:center;gap:6px">'
            '%s<span style="flex:1"></span>'
            '<span style="font-size:11px;color:#2563eb">고객사 관리 &rarr;</span></div>' % body)


def cust_svc(cust='', svc='NONE', kind='PDS3', kind_fixed=False, used=False):
    """고객사 · 사용 서비스 · 코드 종류 — 한 행 `PC-047`.
    이미 발급된 좌표(used)면 고객사는 **상태 표시**이고, 사용 서비스도 **읽기 전용**이다 `PC-076`"""
    if used:
        co = ('<div class="inp" style="background:#fafbfc;display:flex;align-items:center;gap:6px">'
              '<b>%s</b><span style="font-size:11px;color:#9ca3af">보유</span></div>' % cust)
    else:
        co = sel(cust or '고객사 선택 또는 검색', ph=not cust)
    # 코드 종류 칸은 두지 않는다 `PC-074` — 종류는 발급(App Key·N Key)·편집에서 정한다
    return ('<div style="display:grid;grid-template-columns:1.2fr 1.4fr;gap:12px;'
            'align-items:start;margin-top:10px;border:1px solid #eef0f4;border-radius:10px;'
            'padding:12px 13px">%s%s</div>'
            % (field('고객사', co, not used),
               field('사용 서비스', svc_chips(svc))))


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


def detail(cust='웅진씽크빅', sec=3, own=17, locked=None, cross=False, kind='PDS3', shared=False,
           block=None):
    """발급 대상 — 좌표는 지도에서 고른다. 모달에서는 상태만 보여 준다 `PC-046`
    block: 막힘 사유 한 줄(확장 Owner 막힘 등) — 상태 배지는 그대로, 상자만 빨강 `PC-337`"""
    if block and not locked:
        h = detail(cust, sec, own, None, cross, kind, shared)
        h = h.replace('border:1px solid #e5e7eb;background:#fafbfc', 'border:1px solid #fecaca;background:#fef2f2', 1)
        return (h[:-len('</div>')]
                + '<div style="margin-top:7px;font-size:12px;color:#b91c1c;font-weight:700">%s</div></div>'
                % block)
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


def mdl(title, body, save_off=False, save='할당'):
    btn = ('<div class="btn pri"%s>%s</div>' % (' style="opacity:.5"' if save_off else '', save)
           if save else '')
    return ('<div class="mdl xw">'
            '<div class="mh"><div class="mt">%s</div><div class="mx">✕</div></div>'
            '%s<div class="mf"><div class="btn gho">취소</div>%s</div></div>'
            % (title, body, btn))


def modal(title, body, save_off=False, save='할당'):
    return '<div class="ovl">%s</div>' % mdl(title, body, save_off, save)


def modal2(*parts):
    """정의서 전용 — 한 상태에 갈래 두 개를 위아래로 겹쳐 보여 준다. parts = (캡션, mdl html) …"""
    out = ''
    for cap, m in parts:
        out += ('<div style="width:900px;max-width:94%%;color:#fff;font-size:12px;font-weight:700;'
                'margin:10px 0 6px">%s</div>%s' % (cap, m))
    return '<div class="ovl" style="align-content:center">%s</div>' % out


# ── 확장 언어 그룹 칸 `PC-330` `PC-332` `PC-335` `PC-336` `PC-337` ─────────
def info_i(t=''):
    return ('<span title="%s" style="display:inline-flex;align-items:center;justify-content:center;'
            'width:15px;height:15px;border-radius:50%%;border:1px solid #cbd5e1;color:#64748b;'
            'font-size:10px;flex:none">ⓘ</span>' % t)


def gsel(v):
    return ('<span style="display:inline-flex;align-items:center;gap:6px;border:1px solid #e5e7eb;'
            'border-radius:8px;padding:4px 8px;background:#fff;font-size:12px;color:#111827">'
            '%s<span style="color:#9ca3af;font-size:10px">▾</span></span>' % v)


def ginp(v, w=60):
    return ('<span style="display:inline-block;width:%dpx;box-sizing:border-box;border:1px solid #e5e7eb;'
            'border-radius:8px;padding:4px 8px;background:#fff;font-size:12px;'
            'font-family:ui-monospace,monospace;color:#111827">%s</span>' % (w, v))


def gchip(o, kind='ok'):
    """미리보기 칩 — here: 이 좌표 / ok: 새로 할당 / mine: 이미 보유 / no: 쓸 수 없음"""
    st = {'here': ('#67e8f9', '#ecfeff', '#0e7490', '✓', '이 좌표', '700'),
          'ok': ('#a5f3fc', '#fff', '#0e7490', '✓', '새로 할당', '400'),
          'mine': ('#a5f3fc', '#fff', '#0e7490', '보유', '이미 이 고객사가 보유 — 그룹에 넣기만', '400'),
          'no': ('#fecaca', '#fef2f2', '#b91c1c', '✕', '쓸 수 없음: 다른 고객사', '400')}[kind]
    return ('<span title="%s" style="display:inline-flex;align-items:center;gap:3px;font-size:11px;'
            'border-radius:6px;padding:2px 7px;border:1px solid %s;background:%s;color:%s;'
            'font-weight:%s">O%d %s</span>' % (st[4], st[0], st[1], st[2], st[5], o, st[3]))


GRP_INFO = ('확장 Owner 는 O{o} 와 붙어 있지 않아도 됩니다. 개수와 방향(O{o} 이전 / 이후)을 고르면 '
            '그 방향에서 비어 있는 연속 범위를 가까운 순으로 보여 줍니다. 목록에 없으면 [직접 입력] 으로 '
            '시작 번호를 넣으세요. 필요한 수보다 많이 할당해도 됩니다. 역할(기본 · 확장)은 고객사 관리에서 정합니다.')


def grp_panel(company='Common-21', kind='PDS2', langs=10, need=3, grp_n=21, pending=0,
              cur=0, n=2, dir_='이후', rng='O1~O2 (2개)', start=None, chips=(), opts=None):
    """🌐 확장 언어 그룹 칸 — ① 안내 ② 확장 Owner 개수 · 방향 · 범위(또는 직접 입력) · 미리보기 칩.
    역할 버튼은 없다 `PC-335`. opts: 범위 셀렉트를 펼친 모습(정의서 전용)"""
    l1 = ('<b style="color:#0e7490">🌐 확장 언어 그룹</b>'
          '<span style="color:#111827;font-weight:700">%s</span>'
          '<span style="color:#374151">%s · 언어 %d개 · <b>Owner %d개 이상 필요</b></span>'
          % (company, kind, langs, need))
    if grp_n:
        l1 += ('<span style="color:#6b7280">· 그룹 Owner %d개%s</span>'
               % (grp_n, (' (역할 미지정 %d)' % pending) if pending else ''))
    l1 += ('<span style="flex:1"></span><span style="font-size:11.5px;color:#2563eb" '
           'title="기본 · 확장 슬롯 역할과 언어는 고객사 관리 ▸ 공통코드 · 확장 언어 에서 정합니다">'
           '역할 · 언어는 고객사 관리에서 &rarr;</span>')
    l2 = ('<span style="color:#6b7280;font-weight:700">확장 Owner</span>%s'
          '<span style="color:#6b7280">개</span>%s' % (ginp(n), gsel('O%d %s 번호' % (cur, dir_))))
    if n > 0:
        l2 += gsel('직접 입력' if start is not None else rng)
        if start is not None:
            l2 += '<span style="color:#6b7280">시작 O</span>' + ginp(start, 90)
    l2 += info_i(GRP_INFO.format(o=cur))
    drop = ''
    if opts:
        drop = ('<div style="margin:4px 0 0 236px;width:170px;border:1px solid #e5e7eb;border-radius:8px;'
                'background:#fff;box-shadow:0 6px 18px rgba(0,0,0,.12);padding:4px 0;font-size:12px">%s</div>'
                % ''.join('<div style="padding:4px 10px;%s">%s</div>'
                          % ('background:#eef6ff;color:#2563eb;font-weight:700' if i == 0 else
                             ('border-top:1px solid #f1f5f9;color:#2563eb' if o == '직접 입력' else 'color:#111827'),
                             o) for i, o in enumerate(opts)))
    ch = ''
    if chips:
        ch = ('<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:7px">%s</div>'
              % ''.join(gchip(o, k) for o, k in chips))
    return ('<div style="margin-top:10px;border:1px solid #a5f3fc;background:#f0fdff;border-radius:10px;'
            'padding:11px 13px">'
            '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px">%s</div>'
            '<div style="margin-top:9px"><div style="display:flex;align-items:center;gap:6px;'
            'flex-wrap:wrap;font-size:12px">%s</div>%s%s</div></div>' % (l1, l2, drop, ch))


def grp_none():
    """고른 고객사에 그룹이 없음 `PC-332`"""
    return ('<div style="margin-top:10px;font-size:12px;color:#6b7280;display:flex;align-items:center;'
            'gap:6px;flex-wrap:wrap"><span>🌐 확장 언어 그룹 없음</span>'
            '<span style="color:#2563eb">언어 확장이 필요하면 고객사 관리 ▸ 공통코드 · 확장 언어 에서 '
            '먼저 켜세요 &rarr;</span></div>')


def grp_in(label='Common-21', role='확장 슬롯', langs='베트남어 · 러시아어 · …'):
    """이 S/O 가 이미 어느 그룹의 Owner — 소속 한 줄(보기만) `PC-332`"""
    tail = '역할 · 언어는 고객사 관리에서 정합니다' if role == '역할 미지정' else langs
    return ('<div style="margin-top:10px;font-size:12px;color:#0e7490;background:#f0fdff;'
            'border:1px solid #a5f3fc;border-radius:8px;padding:7px 10px">'
            '🌐 확장 언어 그룹 <b>%s</b> · %s · %s</div>' % (label, role, tail))


T = '코드 할당'
OWN2 = [('N', 3, 17, '0~99', '', True), ('G', 0, 212, '111~199', '1~4,095', False)]

CLOSE = [('[취소] · ✕', '클릭', '<code>SOB-01</code>', '변경 없이 복귀')]


def scr(overlay, h=1180):
    return frame('SOB-01', 'SOBP 맵',
                 p_sob01.content(pds='N', sel_s=3, sel_o=17),
                 overlay=overlay, height=h)


# 확장 언어 그룹 상태 — 지도 뒤판은 S3/O0 · 앞쪽 Owner 가 비어 있는 모습
FREE_O = tuple((o, '미사용', '', None) for o in range(0, 11))


def scr_free(overlay, h=1180):
    return frame('SOB-01', 'SOBP 맵',
                 p_sob01.content(pds='N', sel_s=3, sel_o=0, own_rows=FREE_O, own_more='1,013',
                                 book_rows=tuple((b, '미사용', '', False) for b in range(4)),
                                 book_more='8,188',
                                 page_kw=dict(in_use=False, total=0, pmax=512, sec=3, own=0)),
                 overlay=overlay, height=h)


def build():
    B = []

    B.append((
        'S1', '진입 직후 — 고객사 미선택', '기본',
        '<code>SOB-01</code> 의 <b>[＋ 직접 코드 할당]</b> 으로 열린다. 구성은 세 묶음이다 '
        '<code>PC-046</code> — ① <b>발급 대상</b>(좌표·종류·상태를 <b>보여 주기만</b> 한다) '
        '② <b>발급 정보</b>(고객사 · 사용 서비스 · 코드 종류) ③ <b>보유 코드</b>(고객사를 고르면 나온다). '
        '좌표(Section · Owner)는 <b>지도에서 고른 값</b>이라 모달에서 바꾸지 않는다. '
        '<b>[할당]</b> 은 고객사를 고르기 전에는 눌리지 않는다. '
        '<b>사용 서비스는 고르는 값이 아니다</b> <code>PC-076</code> — 고른 고객사의 값을 읽어 보여 준다.',
        scr(modal(T, detail('') + cust_svc('', 'NONE') + owned(''), save_off=True)),
        [('고객사 *', '목록 선택 또는 직접 입력(검색)', '기존 보유 코드 영역 표시',
          '<code>MEM-01</code> 에 등록된 고객사만 — <b>여기서 신규 고객사를 만들지 않는다</b>'),
         ('사용 서비스', '—', '<b>읽기 표시</b>',
          '고객사 관리에서 정한 값 <code>PC-076</code>. 지정이 없으면 <b>SDK 연동 (코드만 할당)</b>. '
          '옆의 <b>[고객사 관리 &rarr;]</b> 로 바꾸러 간다'),
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
        '<code>P-14</code> — 고객사 관리에서 <b>사용 서비스 = casterN</b> 으로 지정된 고객사 '
        '<code>PC-076</code>. 그 고객사는 <b>편집 프로젝트(<code>PRJ-02</code>) 관리 대상</b> 이 된다. '
        '이후 편집 진행과 정산은 <code>PRJ-03</code> 에서 이어진다. '
        '이 창에서는 <b>바꾸지 못하고 읽기만</b> 한다.',
        scr(modal(T, detail('웅진씽크빅') + cust_svc('웅진씽크빅', 'CASTERN')
                  + owned('웅진씽크빅', OWN2))),
        [('사용 서비스 = casterN', '—', '<code>PRJ-02</code> → <code>PRJ-03</code>',
          '서비스 계정 권한 표시 — 편집 프로젝트 대상은 등록 고객사 전부라 이와 무관 <code>PC-187</code>'),
         ('[할당]', '성공', '<code>LOG-01</code>',
          '<b>{고객사} · S{n}/O{n} · SO 점유(코드 종류 미정) · 사용 서비스 casterN (편집툴)</b>')]
        + CLOSE))

    B.append((
        'S5', '사용 서비스 — 복수 지정 고객사', '분기',
        '<code>PC-076</code> — 고르는 서비스는 <b>casterN · 폼솔루션 2종</b>뿐이고, '
        '한 고객사가 <b>둘 다</b> 쓸 수 있다. 지정은 <b>고객사 관리</b>에서 한다. '
        '아무것도 지정하지 않은 고객사는 <b>SDK 연동 (코드만 할당)</b> 으로 보인다 — '
        '그 외 용도(Ncode 프린터 등)의 코드가 여기 해당한다.',
        scr(modal(T, detail('웅진씽크빅')
                  + cust_svc('웅진씽크빅', ['CASTERN', 'FORMSOLUTION'])
                  + owned('웅진씽크빅', OWN2))),
        [('사용 서비스', '—', '배지 2개',
          'casterN · 폼솔루션을 함께 지정한 고객사 <code>PC-076</code>'),
         ('지정 없음', '—', '<b>SDK 연동 (코드만 할당)</b>', '우리 서비스를 거치지 않는 고객사'),
         ('[고객사 관리 &rarr;]', '클릭', '<code>MEM-02</code>', '사용 서비스는 거기서 바꾼다'),
         ('[할당]', '성공', '<code>LOG-01</code>',
          '<b>{고객사} · S{n}/O{n} · SO 점유 · 사용 서비스 casterN (편집툴) · 폼솔루션</b>')] + CLOSE))

    B.append((
        'S6', '전용 코드 — 입력 잠금', '차단',
        '<code>P-05</code> 무겹침 — 이 S/O 를 <b>다른 고객사가 전용으로 쓰고 있는</b> 경우. '
        '발급 대상이 빨강으로 바뀌고 <b>🔒 전용 · 추가 발급 불가</b> 배지와 '
        '<b>“{업체명}” 전용으로 추가 발급이 불가</b> 한 줄이 나온다 <code>PC-048</code>. '
        '고객사는 <b>보유 업체 상태 표시</b>(입력 칸이 아니다), 코드 종류도 배지로만 보여 준다. '
        '<b>이 창은 조회 전용</b>이다 <code>PC-076</code> — 사용 서비스도 읽기라 저장할 것이 없고 '
        '<b>[취소]</b> 만 남는다.',
        scr(modal(T, detail('웅진씽크빅', locked='대교')
                  + cust_svc('대교', 'CASTERN', kind_fixed=True, used=True)
                  + owned('대교', OWN2), save_off=True, save='')),
        [('고객사', '—', '<b>상태 표시</b>', '보유 업체명 + <b>보유</b> — 고르는 값이 아니다 <code>PC-048</code>'),
         ('코드 종류', '—', '<b>상태 표시</b>', '쓰고 있는 종류를 배지로만 보여 준다'),
         ('사용 서비스', '—', '<b>읽기 표시</b>',
          '그 고객사의 값을 보여 줄 뿐 여기서 바꾸지 않는다 <code>PC-076</code>'),
         ('저장 버튼', '—', '<b>없음</b>',
          '옛 <b>[사용 서비스 저장]</b> 은 폐지 — 조회 전용이다 <code>PC-076</code>'),
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
        '<b>Book 마다 다른 코드 타입</b>을 쓸 수 있어(B1 PDS2 · B2 PDS3) 이 화면에서도 막지 않는다 '
        '<code>PC-281</code> (<code>PC-041</code> 폐기).',
        scr(modal(T, detail('웅진씽크빅', cross=True)
                  + cust_svc('웅진씽크빅', 'NONE', kind_fixed=True, used=True)
                  + owned('웅진씽크빅', OWN2))),
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
         ('할당 취소·회수', '—', '<b>없음</b>',
          '할당(고객사 매핑)은 <b>되돌리지 않는다</b> — 서비스에 회수 기능이 없다 <code>PC-165</code>')]))

    # ── 확장 언어 그룹 `PC-330` `PC-332` `PC-335` `PC-336` `PC-337` ──────────
    GC = 'Common-21'
    RANGES = ['O%d~O%d (2개)' % (a, a + 1) for a in range(1, 17, 2)] + ['직접 입력']
    B.append((
        'S11', '확장 언어 그룹 — 확장 Owner 범위', '분기',
        '<code>PC-330</code> — 고른 고객사에 <b>확장 언어 그룹</b>(<code>MEM-02</code> §4.12)이 있고 '
        '같은 Section 이면(그룹 Section 이 미정이면 어느 Section 이든 <code>PC-333</code>) '
        '발급 정보 아래에 <b>🌐 확장 언어 그룹</b> 칸이 생긴다. '
        '① 안내 한 줄 <b>{고객사} · {종류} · 언어 {n}개 · Owner {k}개 이상 필요 · 그룹 Owner {m}개</b> + '
        '오른쪽 <b>[역할 · 언어는 고객사 관리에서 →]</b> <code>PC-336</code> '
        '② <b>확장 Owner [n]개 · [O{n} 이전 / 이후 번호] · [범위]</b> — 확장 Owner 는 이 O 와 '
        '<b>붙어 있지 않아도 된다</b>. 범위 셀렉트는 그 방향의 <b>빈 연속 범위</b>를 가까운 순으로 '
        '<b>최대 8개</b> + <b>직접 입력</b> <code>PC-337</code>. '
        '<b>역할 버튼은 없다</b> — 할당한 Owner 는 그룹에 <b>역할 미지정</b>으로 들어가고 '
        '역할 · 언어는 고객사 관리에서 정한다 <code>PC-335</code>. '
        '(정의서에서는 범위 셀렉트를 펼친 모습을 함께 보인다.)',
        scr_free(modal(T, detail(GC, sec=3, own=0) + cust_svc(GC, 'NONE')
                       + grp_panel(GC, 'PDS2', 10, 3, 21, cur=0, n=2, dir_='이후',
                                   rng='O1~O2 (2개)', opts=RANGES,
                                   chips=((0, 'here'), (1, 'ok'), (2, 'ok')))
                       + owned(GC, []))),
        [('🌐 확장 언어 그룹 칸', '자동', '표시',
          '고른 고객사에 그룹이 있고 같은 Section(또는 그룹 Section 미정)일 때만 · (K) 티켓 고객사에는 없다'),
         ('① 안내', '—', '한 줄',
          '<b>{고객사} · {PDS2/PDS3} · 언어 {n}개 · Owner {k}개 이상 필요</b>(기본 1 + 필요 확장) · '
          '그룹에 Owner 가 있으면 <b>· 그룹 Owner {m}개 (역할 미지정 {p})</b> <code>PC-336</code>'),
         ('[역할 · 언어는 고객사 관리에서 →]', '클릭', '<code>MEM-02</code>',
          '그 고객사 상세 ▸ 공통코드 · 확장 언어 — 역할 · 언어는 거기서만 정한다 <code>PC-335</code>'),
         ('확장 Owner 개수', '입력', '0 ~ 40',
          '이 O 는 <b>빼고</b> 센다(이 O 는 늘 할당) · 기본값 = 필요한 Owner 수 − 그룹 Owner 수 − 이 O(그룹에 없으면 1), '
          '0 이상 · <b>0 이면 범위 셀렉트를 감춘다</b>'),
         ('방향', '선택', '<b>O{n} 이전 번호 / O{n} 이후 번호</b>',
          '바꾸면 범위가 다시 계산된다 <code>PC-336</code>'),
         ('범위', '선택', '<b>O{a}~O{b} ({n}개)</b>',
          '그 방향의 빈 연속 범위를 가까운 순으로 최대 8개(겹치지 않게) + <b>직접 입력</b> · '
          '기본값 = 가장 가까운 범위 · 없으면 <b>할당할 수 있는 범위 없음</b> <code>PC-337</code>'),
         ('빈 번호 기준', '참고', '—',
          '다른 고객사 보유 없음 · 이 좌표 아님 · 그룹에 없음(이 고객사가 이미 가진 Owner 는 포함) · '
          '이전 번호면 번호가 줄어드는 순서로 잇는다'),
         ('ⓘ', '클릭', '말풍선',
          '<b>확장 Owner 는 O{n} 와 붙어 있지 않아도 됩니다. … 역할(기본 · 확장)은 고객사 관리에서 정합니다.</b>'),
         ('미리보기 칩', '표시', '—',
          '<b>O{n} ✓</b>(이 좌표 — 맨 앞) · <b>O{n} ✓</b>(새로 할당) · <b>O{n} 보유</b>(이 고객사가 이미 보유) · '
          '<b>O{n} ✕</b>(쓸 수 없음)'),
         ('역할 버튼', '—', '<b>없음</b>',
          '옛 [일반 할당] [기본 Owner] [확장 슬롯] 폐지 <code>PC-335</code>'),
         ('[할당]', '성공', '<code>LOG-01</code>',
          '이 S/O + 확장 Owner 를 같은 고객사에 할당하고 그룹에 <b>역할 미지정</b>으로 넣는다 · '
          '<b>{고객사} · 확장 언어 그룹에 넣기(역할 미지정) · S{s} · O{n}·O{n}</b>')] + CLOSE))

    B.append((
        'S12', '확장 언어 그룹 — 직접 입력 · 막힘', '차단',
        '<code>PC-337</code> — 범위 셀렉트에서 <b>직접 입력</b>을 고르면 옆에 <b>시작 O [ ]</b> 칸이 생기고, '
        '시작 번호부터 방향대로 n개를 잡는다. 그중 <b>쓸 수 없는 번호</b>(다른 고객사 보유 · 이 좌표 · '
        '이미 그룹 · 범위 밖)는 칩이 빨강 <b>O{n} ✕</b> 가 되고, 발급 대상 상자가 빨강으로 바뀌며 '
        '<b>확장 Owner O{n} 는 쓸 수 없습니다({이유}) — 범위를 바꾸세요.</b> 한 줄이 나온다. '
        '이 상태에서 [할당] 을 누르면 같은 문구의 확인창을 띄우고 멈춘다.',
        scr_free(modal(T, detail(GC, sec=3, own=0,
                                 block='확장 Owner O983 는 쓸 수 없습니다(NeoLAB) — 범위를 바꾸세요.')
                       + cust_svc(GC, 'NONE')
                       + grp_panel(GC, 'PDS2', 10, 3, 21, cur=0, n=2, dir_='이후', start=982,
                                   chips=((0, 'here'), (982, 'ok'), (983, 'no')))
                       + owned(GC, []))),
        [('범위 셀렉트 [직접 입력]', '선택', '<b>시작 O [ ]</b> 칸 표시',
          '처음 값은 지금 고른 범위의 시작(없으면 이 O 다음 번호)'),
         ('시작 O', '숫자 입력', '미리보기 갱신', '시작 번호부터 방향대로 n개'),
         ('쓸 수 없는 번호', '자동', '칩 <b>O{n} ✕</b>',
          '툴팁 <b>쓸 수 없음: {고객사 · 이 좌표 · 이미 그룹 · 범위 밖}</b>'),
         ('막힘 한 줄', '자동', '발급 대상 상자',
          '<b>확장 Owner O{n} 는 쓸 수 없습니다({이유}) — 범위를 바꾸세요.</b>'),
         ('[할당] · [그룹에 넣기]', '클릭', '확인창 · 중단', '같은 문구 — 창은 닫히지 않는다'),
         ('범위 셀렉트로 되돌림', '선택', '막힘 해제', '목록의 범위는 모두 빈 번호라 막히지 않는다')] + CLOSE))

    B.append((
        'S13', '확장 언어 그룹 없음 · 이미 그룹 Owner', '분기',
        '<code>PC-332</code> — 그룹 칸이 안 나오는 경우에도 <b>한 줄</b>로 이유를 보여 준다. '
        '① 고른 고객사에 그룹이 없으면 <b>🌐 확장 언어 그룹 없음</b> + '
        '<b>[언어 확장이 필요하면 고객사 관리 ▸ 공통코드 · 확장 언어 에서 먼저 켜세요 →]</b> '
        '② 이 S/O 가 이미 어느 그룹의 Owner 이면 고객사를 고르기 전에도 '
        '<b>🌐 확장 언어 그룹 {그룹} · {역할} · {언어 …}</b> 를 보여 준다(보기만). '
        '(정의서에서는 두 갈래를 위아래로 함께 보인다.)',
        frame('SOB-01', 'SOBP 맵',
              p_sob01.content(pds='N', sel_s=3, sel_o=17),
              overlay=modal2(
                  ('① 고른 고객사에 그룹 없음',
                   mdl(T, detail('아이스크림에듀') + cust_svc('아이스크림에듀', 'NONE') + grp_none()
                       + owned('아이스크림에듀', []))),
                  ('② 이미 그룹에 든 Owner — 고객사 미선택',
                   mdl(T, detail('', sec=3, own=965, shared=True, kind='PDS2') + cust_svc('', 'NONE')
                       + grp_in(GC, '확장 슬롯') + owned(''), save_off=True))),
              height=1500),
        [('그룹 없음', '자동', '한 줄 + 링크',
          '<b>🌐 확장 언어 그룹 없음</b> · 링크는 그 고객사 상세(<code>MEM-02</code>)로 — '
          '그룹은 고객사 관리에서 먼저 켠다'),
         ('그룹 Section 다름', '자동', '한 줄',
          '<b>🌐 확장 언어 그룹 · S{s} 그룹이라 이 Section(S{s})에서는 연결하지 않습니다</b>'),
         ('이미 그룹 Owner', '자동', '한 줄(보기만)',
          '<b>🌐 확장 언어 그룹 {그룹} · 기본 Owner / 확장 슬롯 · {언어 · 언어 …}</b> — '
          '언어가 없으면 <b>지정된 언어 없음</b>'),
         ('역할 미지정 Owner', '자동', '한 줄(보기만)',
          '<b>🌐 확장 언어 그룹 {그룹} · 역할 미지정 · 역할 · 언어는 고객사 관리에서 정합니다</b>'),
         ('표시 조건', '참고', '—',
          '고객사를 아직 안 고름 · 고른 고객사가 그 그룹 고객사가 아님(예전 슬롯 고객사 보유 포함)')] + CLOSE))

    B.append((
        'S14', '이미 쓰는 좌표 — [그룹에 넣기]', '분기',
        '<code>PC-332</code> <code>PC-335</code> — 이미 쓰는 좌표(조회 전용)라도 <b>보유 고객사가 한 곳</b>이고 '
        '그 고객사에 같은 Section 그룹이 있으면 그룹 칸을 그대로 보여 주고, 아래 버튼은 '
        '<b>[할당]</b> 대신 <b>[그룹에 넣기]</b> 가 된다. 이 S/O 는 다시 할당하지 않고 '
        '<b>그룹에만 넣는다</b>(역할 미지정). 이 고객사가 이미 가진 Owner 는 칩 <b>O{n} 보유</b> 로 보인다.',
        scr(modal(T, detail('웅진씽크빅', cross=True)
                  + cust_svc('웅진씽크빅', 'NONE', kind_fixed=True, used=True)
                  + grp_panel('웅진씽크빅', 'PDS3', 7, 2, 0, cur=17, n=2, dir_='이후',
                              rng='O18~O19 (2개)',
                              chips=((17, 'here'), (18, 'mine'), (19, 'ok')))
                  + owned('웅진씽크빅', OWN2 + [('N', 3, 18, '0~49', '', False)]),
                  save='그룹에 넣기')),
        [('보유 고객사', '자동', '그 고객사로 판단',
          '고객사 입력칸이 없는 조회 전용 좌표 — 보유 고객사가 <b>한 곳</b>일 때만'),
         ('[그룹에 넣기]', '클릭', '<code>LOG-01</code>',
          '이 S/O 는 그룹에만 넣고, 확장 Owner 중 새 번호는 할당 후 넣는다 · '
          '<b>{고객사} · 확장 언어 그룹에 넣기(역할 미지정) · S{s} · O{n}·O{n}</b>'),
         ('O{n} 보유', '표시', '—', '이 고객사가 이미 보유 — 할당 없이 그룹에 넣기만'),
         ('버튼 감춤', '자동', '—',
          '이 좌표가 이미 그룹에 있고 함께 할당할 Owner 도 없으면 [그룹에 넣기] 를 감춘다'),
         ('보유 고객사 여러 곳', '자동', '칸 없음', '어느 고객사로 볼지 정할 수 없어 그룹 칸을 보이지 않는다')]
        + CLOSE))

    intro = ('<b>NcodeCenter에서 코드의 주인이 정해지는 유일한 지점</b>이며, '
             '<b>사용 서비스와 코드 종류는 여기서 정하지 않는다</b> — '
             '서비스는 고객사 속성이라 <code>MEM-02</code> 에서 정한다 <code>PC-076</code> '
             '<code>PC-011</code>. 할당 단위는 <b>S/O</b> — Owner 전체를 그 고객사가 점유한다.<br>'
             '<code>SOB-01</code> 의 <b>[＋ 직접 코드 할당]</b> 으로만 열리며, '
             '<b>자동 추천은 사용하지 않는다</b>(모드 토글 없음).')
    return page(CODE, NAME, PRD, intro, B)
