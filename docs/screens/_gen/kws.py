# -*- coding: utf-8 -*-
"""키 발급 3단 화면 공용 그림 — TKT-01 App Key 관리 · TKT-02 N Key 관리 `PC-154` `PC-158`

web/components/KeyWorkspaceUI.tsx 와 같은 조각을 HTML 로 옮긴다. 두 화면 정의서가 이 모듈만 쓰므로
모양(색 · 크기 · 간격)은 여기서만 정한다.
"""

CARD = 'background:#fff;border:1px solid #e5e7eb;border-radius:12px'
HD = 'padding:13px 16px;border-bottom:1px solid #eef0f4;display:flex;align-items:center;gap:8px'
MONO = 'font-family:ui-monospace,monospace'


def tg(text, bg, fg, bold=True):
    return ('<span style="font-size:11px;background:%s;color:%s;border-radius:5px;padding:2px 8px;'
            'white-space:nowrap;%s">%s</span>' % (bg, fg, 'font-weight:700' if bold else '', text))


BILL = {'미정': ('#f3f4f6', '#6b7280'), '유료': ('#dbeafe', '#1d4ed8'),
        '무료': ('#dcfce7', '#166534'), '체험': ('#fef3c7', '#92400e')}


def bill_tag(b):
    bg, fg = BILL[b]
    return tg(b, bg, fg)


def billing_box(sel='유료', amount='1200000', note='2026 연간 계약 포함', last='2026-10-20 10:20 · 김순정'):
    """정산 — 미정 · 유료 · 무료 · 체험 4종 (web/components/BillingEditor.tsx) `PC-176` `PC-177`"""
    sub = {'미정': '미등록', '유료': '금액 입력', '무료': '청구 없음', '체험': '1개월'}
    btns = ''.join('<div style="padding:9px 8px;border-radius:9px;text-align:center;font-size:12.5px;border:1px solid %s;background:%s;color:%s;font-weight:%s">'
                   '%s<div style="font-size:10px;font-weight:400;margin-top:2px">%s</div></div>'
                   % (BILL[b][1] if b == sel else '#e5e7eb', BILL[b][0] if b == sel else '#fff',
                      BILL[b][1] if b == sel else '#6b7280', '700' if b == sel else '400', b, sub[b]) for b in BILL)
    amt = ('<div class="fld" style="max-width:320px"><span class="lbl">금액 (원) *</span><div class="inp">%s</div></div>' % amount
           if sel == '유료' else '')
    return ('<div style="margin-top:14px;border:1px solid #eef0f4;border-radius:10px;padding:12px 14px">'
            '<div style="font-size:13px;font-weight:700;margin-bottom:8px">정산 <span style="font-size:11.5px;font-weight:400;color:#9ca3af">'
            '· 고객사 · 티켓마다 다르게 등록할 수 있습니다</span></div>'
            '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px">%s</div>%s'
            '<div class="fld" style="margin-top:10px"><span class="lbl">비고 (사유 · 계약 정보)</span><div class="inp">%s</div></div>'
            '<div style="display:flex;align-items:center;gap:8px;margin-top:12px"><span style="font-size:11.5px;color:#9ca3af">최근 등록: %s</span>'
            '<span style="flex:1"></span><span class="btn pri">정산 저장</span></div></div>' % (btns, amt, note, last))


def chip(label, on=False):
    return ('<span style="font-size:12.5px;padding:6px 12px;border-radius:8px;white-space:nowrap;font-weight:%s;'
            'border:1px solid %s;background:%s;color:%s">%s</span>'
            % ('700' if on else '400', '#93c5fd' if on else '#e5e7eb', '#eef6ff' if on else '#fff',
               '#1d4ed8' if on else '#6b7280', label))


def head_btn(label, off=False):
    return ('<span class="btn pri" style="padding:6px 12px;font-size:12.5px%s">%s</span>'
            % (';opacity:.5' if off else '', label))


def title(name, scope, note):
    """화면 머리 — 제목 · 집계 대상 · 오른쪽 안내"""
    return ('<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:12.5px;color:#6b7280">'
            '<b style="font-size:15px;color:#111827">%s</b><span>· %s</span><span style="flex:1"></span>'
            '<span style="font-size:11.5px;color:#9ca3af">%s</span></div>' % (name, scope, note))


def stats(items):
    """집계 카드 줄 — items: (라벨, 값, 색)"""
    cells = ''.join('<div style="%s;padding:10px 12px"><div style="font-size:11px;color:#6b7280">%s</div>'
                    '<div style="font-size:17px;font-weight:700;color:%s">%s</div></div>' % (CARD, l, c, v)
                    for l, v, c in items)
    return ('<div style="display:grid;grid-template-columns:repeat(%d,1fr);gap:10px;margin-bottom:12px">%s</div>'
            % (len(items), cells))


def warn_bar(text):
    return ('<div style="background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;border-radius:9px;padding:9px 12px;'
            'font-size:12.5px;margin-bottom:12px">%s</div>' % text)


def co_item(label, n, on=False, todo=0, warn=False, bold=False):
    return ('<div style="display:flex;align-items:center;gap:6px;border-radius:9px;padding:8px 10px;font-size:13px;'
            'background:%s;color:%s;font-weight:%s"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">%s</span>'
            '<span style="flex:1"></span>%s<span style="font-size:10.5px;border-radius:999px;padding:1px 8px;font-weight:700;'
            'background:%s;color:%s">%d</span></div>'
            % ('#eef6ff' if on else 'transparent', '#1d4ed8' if on else ('#b45309' if warn else '#374151'),
               '700' if (on or bold) else '400', label,
               ('<span style="font-size:10.5px;color:#dc2626;white-space:nowrap">미정 %d</span>' % todo) if todo else '',
               '#dbeafe' if on else '#f3f4f6', '#1d4ed8' if on else ('#6b7280' if n else '#c7cdd6'), n))


def co_col(rows, height, view='issued', issued=15, total=537, count=None, search='', unlinked=None, empty=''):
    """왼쪽 칸 — 고객사(고객사 관리) · [발급 고객사][전체 고객사] · 검색 · 목록 · 고객사 미연결
    rows: (라벨, 건수, 선택, 미정, 굵게)"""
    li = ''.join(co_item(l, n, on, td, bold=b) for l, n, on, td, b in rows)
    if empty:
        li += '<div style="font-size:12px;color:#9ca3af;padding:14px 6px;text-align:center;line-height:1.7">%s</div>' % empty
    if unlinked:
        lb, n, on, td = unlinked
        li += ('<div style="border-top:1px solid #eef0f4;margin-top:6px;padding-top:6px">%s</div>'
               % co_item(lb, n, on, td, warn=True))
    srch = ('<div class="inp%s" style="margin-bottom:8px">%s</div>' % ('' if search else ' ph', search or '고객사 검색'))
    return ('<div style="%s;height:%dpx;display:flex;flex-direction:column;overflow:hidden">'
            '<div style="%s"><b style="font-size:14px">고객사</b><span style="font-size:11.5px;color:#9ca3af">%s곳</span>'
            '<span style="flex:1"></span><span style="font-size:11px;color:#9ca3af">고객사 관리</span></div>'
            '<div style="padding:10px;display:flex;flex-direction:column;flex:1;min-height:0">'
            '<div style="display:flex;gap:4px;margin-bottom:8px">%s%s</div>%s'
            '<div style="flex:1;overflow:hidden">%s</div></div></div>'
            % (CARD, height, HD, count if count is not None else (issued if view == 'issued' else total),
               chip('발급 고객사 %d' % issued, view == 'issued'), chip('전체 고객사 %d' % total, view == 'all'),
               srch, li))


def mid_col(title_, count, btn, body, height, btn_off=False, sub=''):
    """가운데 칸 — 머리(제목 · 건수 · 버튼) + 목록(화면 끝까지)"""
    return ('<div style="%s;height:%dpx;display:flex;flex-direction:column;overflow:hidden">'
            '<div style="%s"><b style="font-size:14px">%s</b><span style="font-size:11.5px;color:#9ca3af">%s</span>'
            '<span style="flex:1"></span>%s</div>%s<div style="padding:12px;flex:1;overflow:hidden">%s</div></div>'
            % (CARD, height, HD, title_, count, head_btn(btn, btn_off), sub, body))


def item(inner, on=False, dashed=False):
    """목록 카드 — 선택 / 보통 / 작성 중(점선)"""
    if dashed:
        return ('<div style="border:1px dashed #5f8ff0;background:#f5f9ff;border-radius:10px;padding:10px 12px;margin-bottom:8px">%s</div>'
                % inner)
    return ('<div style="border:1px solid %s;background:%s;border-radius:10px;padding:10px 12px;margin-bottom:8px">%s</div>'
            % ('#5f8ff0' if on else '#eef0f4', '#f5f9ff' if on else '#fff', inner))


def draft_card(title_, desc):
    return item('<div style="display:flex;align-items:center;gap:6px"><b style="font-size:13.5px;color:#1d4ed8">%s</b>%s</div>'
                '<div style="font-size:11.5px;color:#6b7280;margin-top:4px">%s</div>'
                % (title_, tg('작성 중', '#dbeafe', '#1d4ed8'), desc), dashed=True)


def empty(text):
    return '<div style="font-size:12px;color:#9ca3af;padding:24px 0;text-align:center;line-height:1.7">%s</div>' % text


def grid(left, mid, right):
    return ('<div style="display:grid;grid-template-columns:270px 330px minmax(0,1fr);gap:12px;align-items:start">'
            '%s%s<div style="min-width:0">%s</div></div>' % (left, mid, right))


def right_empty(text):
    return ('<div style="%s;padding:48px 0;text-align:center;color:#9ca3af;font-size:12.5px;line-height:1.8">%s</div>'
            % (CARD, text))


def tabs(items, active):
    """밑줄 탭 — items: (값, 라벨, 배지)"""
    out = ''
    for v, lb, badge in items:
        on = v == active
        b = (' <span style="font-size:10.5px;color:#2563eb;background:#eef6ff;border-radius:999px;padding:0 7px;font-weight:700">%s</span>'
             % badge) if badge else ''
        out += ('<span style="padding:9px 16px;font-size:13px;color:%s;font-weight:%s;border-bottom:2px solid %s;margin-bottom:-1px">%s%s</span>'
                % ('#111827' if on else '#6b7280', '700' if on else '400', '#5f8ff0' if on else 'transparent', lb, b))
    return '<div style="display:flex;border-bottom:1px solid #eef0f4;margin-bottom:14px">%s</div>' % out


def sec_head(t, d=''):
    return ('<div style="display:flex;align-items:baseline;gap:8px;margin:0 0 10px"><b style="font-size:13px">%s</b>'
            '<span style="font-size:11.5px;color:#9ca3af">%s</span></div>' % (t, d))


def fld(label, val, ro=False, ph=False, err=False, extra='', mono=False):
    cls = 'inp' + (' ro' if ro else '') + (' ph' if ph else '') + (' err' if err else '')
    st = (MONO + ';' if mono else '') + ('display:flex;justify-content:space-between;align-items:center;gap:6px' if extra else '')
    return ('<div class="fld"><span class="lbl">%s</span><div class="%s" style="%s">%s%s</div></div>'
            % (label, cls, st, val, extra))


def kv_table(rows, editable=False):
    tr = ''.join('<tr><td style="padding:6px 12px;font-weight:600;%s;color:#374151;width:220px">%s</td><td style="padding:%s">%s</td></tr>'
                 % (MONO, k, '5px 10px' if editable else '6px 12px',
                    ('<div class="inp" style="padding:6px 9px;font-size:12.5px">%s</div>' % v) if editable else v)
                 for k, v in rows)
    return ('<div style="border:1px solid #eef0f4;border-radius:9px;overflow:hidden"><table style="font-size:12.5px">'
            '<tr><th>Key</th><th>Value</th></tr>%s</table></div>' % tr)


def footer(left, right):
    return ('<div style="display:flex;align-items:center;gap:8px;margin-top:18px;padding-top:14px;border-top:1px solid #eef0f4">'
            '%s<span style="flex:1"></span>%s</div>' % (left, right))


def toast_line(text, ok=True):
    return ('<div style="margin-top:10px;font-size:12.5px;color:%s;text-align:right">%s</div>'
            % ('#047857' if ok else '#dc2626', text))


def range_picker(open_=False, sel=None, ranges=()):
    """발급 범위 선택 — 접힘: S·O·B·P 칩 / 펼침: 번호 + 칩 목록"""
    def chips(r):
        s, o, b, p = r
        return ''.join('<span style="font-size:11px;border-radius:5px;padding:1px 6px;margin-right:4px;background:#f3f4f6;color:#374151">'
                       '<b style="color:#9ca3af">%s</b> %s</span>' % (k, v) for k, v in (('S', s), ('O', o), ('B', b), ('P', p)))
    head = chips(sel) if sel else '<span style="color:#9ca3af">- 범위 선택 -</span>'
    box = ('<div class="inp" style="display:flex;align-items:center;justify-content:space-between">%s'
           '<span style="color:#9ca3af">%s</span></div>' % (head, '▲' if open_ else '▼'))
    if not open_:
        return box
    li = ''.join('<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;%s">'
                 '<span style="font-size:11px;color:#9ca3af;width:16px">%d</span>%s%s</div>'
                 % ('background:#eef6ff' if r == sel else '', i + 1, chips(r), ' <b style="color:#2563eb">✓</b>' if r == sel else '')
                 for i, r in enumerate(ranges))
    return box + ('<div style="border:1px solid #e5e7eb;border-radius:8px;margin-top:4px;background:#fff;'
                  'box-shadow:0 8px 20px rgba(15,23,42,.08)">%s</div>' % li)
