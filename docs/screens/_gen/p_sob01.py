# -*- coding: utf-8 -*-
"""SOB-01 SOBP 맵 — web/components/OwnershipMap.tsx 실제 화면 기준

그림의 값(사용 owner 수 · 카드 · 칩 · 남은 개수 · Page 용량)은 로컬 앱(시드 데이터) 화면에서
상태마다 그대로 옮겼다 (2026-11-23).

카드 칩 순서 — OWNER · BOOK 모두 [번호] → [상태(공유 포함)] → [종류(용도)] → (펜) `PC-040`
"""
from shell import page, frame

CODE, NAME = 'SOB-01', 'SOBP 맵'
PRD = 'docs/prd/SOB-01_SOBP 맵.md'

ST_C = {'편집': '#5f8ff0', '코드발급': '#14b8a6', '사용가능': '#f59e0b',
        '공유': '#a855f7', '미사용': '#eef1f6'}
F_CHIPS = ('전체', '발급 전체', '코드 미발급', '편집', '공유', '사용가능')
SOBP_C = {'S': '#5f8ff0', 'O': '#14b8a6', 'B': '#8b5cf6', 'P': '#f59e0b'}
# 코드 종류 4종 — 표시 순서 = 코드 필터 순서 (전체 · PDS2 · PDS3 · PDS4 · OID) `PC-039` (web/lib/codeKind.ts)
KIND_C = {'PDS2': '#d97706', 'PDS3': '#2563eb', 'PDS4': '#7c3aed', 'OID': '#0f766e'}
KINDS = ('PDS2', 'PDS3', 'PDS4', 'OID')


# ── 공통 조각 ────────────────────────────────────────────────────
def chip(label, on):
    return ('<span style="font-size:11.5px;border-radius:7px;padding:4px 9px;'
            'border:1px solid %s;background:%s;color:%s">%s</span>'
            % ('#93c5fd' if on else '#e5e7eb', '#eef6ff' if on else '#fff',
               '#2563eb' if on else '#6b7280', label))


def sc(k, v):
    return ('<span style="display:inline-flex;align-items:center;gap:3px;'
            'border:1px solid #e5e7eb;border-radius:6px;padding:1px 5px 1px 1px;'
            'background:#fff;font-size:10.5px;white-space:nowrap">'
            '<span style="background:%s;color:#fff;font-weight:700;font-size:9px;'
            'border-radius:4px;padding:1px 4px;min-width:9px;text-align:center">%s</span>'
            '<span style="font-family:ui-monospace,monospace;color:#111827">%s</span></span>'
            % (SOBP_C[k], k, v))


def kind_chip(k):
    return ('<span style="display:inline-flex;align-items:center;border-radius:6px;'
            'padding:1px 5px;font-size:9.5px;font-weight:700;color:#fff;background:%s;'
            'white-space:nowrap">%s</span>' % (KIND_C[k], k))


def pen_chip(pen):
    sound = (pen == '소리펜')
    return ('<span style="display:inline-flex;align-items:center;border-radius:6px;'
            'padding:1px 5px;font-size:9.5px;font-weight:700;white-space:nowrap;'
            'color:%s;background:%s">%s</span>'
            % ('#9a3412' if sound else '#3730a3', '#ffedd5' if sound else '#e0e7ff', pen))


def lg(color, text):
    return ('<span><i style="display:inline-block;width:11px;height:11px;background:%s;'
            'border-radius:2px;vertical-align:-1px;margin-right:4px"></i>%s</span>'
            % (color, text))


def st_badge(st):
    if st == '코드 미발급':
        return ('<span style="font-size:9px;white-space:nowrap;background:#f3f4f6;color:#9ca3af;'
                'border-radius:5px;padding:2px 7px">코드 미발급</span>')
    return ('<span style="font-size:9px;white-space:nowrap;background:%s;color:#fff;'
            'font-weight:700;border-radius:5px;padding:2px 7px">%s</span>' % (ST_C[st], st))


def colcard(title, inner, pad_b='6px'):
    return ('<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:8px">'
            '<div style="font-size:11px;color:#9ca3af;font-weight:700;padding:2px 4px %s">%s</div>'
            '%s</div>' % (pad_b, title, inner))


def cardbtn(inner, on):
    return ('<div style="display:block;width:100%%;text-align:left;border:1px solid %s;'
            'background:%s;border-radius:9px;padding:7px 9px;margin:2px 0">%s</div>'
            % ('#93c5fd' if on else '#eef0f4', '#f5f9ff' if on else '#fff', inner))


def from_input(label, ph, value=''):
    if value:
        inner = ('<span style="font-family:ui-monospace,monospace;color:#111827">%s</span>'
                 '<span style="position:absolute;right:4px;top:3px;color:#9ca3af;font-size:12px">✕</span>' % value)
    else:
        inner = '<span style="font-family:ui-monospace,monospace;color:#9ca3af">%s</span>' % ph
    return ('<div style="position:relative;margin-bottom:6px">'
            '<span style="position:absolute;left:7px;top:5px;font-size:11px;color:#9ca3af;'
            'font-family:ui-monospace,monospace;z-index:1">%s</span>'
            '<div style="width:100%%;box-sizing:border-box;padding:4px 20px 4px 18px;'
            'font-size:11.5px;border:1px solid #e5e7eb;border-radius:7px;position:relative">'
            '%s</div></div>' % (label, inner))


def more_btn(rest):
    return ('<div style="display:block;width:100%%;margin:6px 0 2px;padding:7px 0;'
            'font-size:11.5px;border:1px dashed #cbd5e1;border-radius:8px;background:#fafbfc;'
            'color:#2563eb;text-align:center">＋ 더 보기 '
            '<span style="color:#9ca3af">(남은 %s)</span></div>' % rest)


def sub_line(text, color='#6b7280', bold=False):
    return ('<div style="font-size:10px;color:%s;font-weight:%s;margin-top:2px;overflow:hidden;'
            'text-overflow:ellipsis;white-space:nowrap">%s</div>' % (color, '700' if bold else '400', text))


# ── 툴바 · 할당 진입 ─────────────────────────────────────────────
def toolbar(kind='전체', fstat='전체', acct=''):
    pchips = ''.join(chip(k, k == kind) for k in ('전체',) + KINDS)
    grp = ('<div style="display:flex;align-items:center;gap:6px;padding:3px 8px 3px 6px;'
           'background:#f7f8fa;border-radius:9px">'
           '<span style="font-size:11px;color:#6b7280;font-weight:700">%s</span>'
           '<div style="display:flex;gap:4px">%s</div></div>')
    fchips = ''.join(chip(v, v == fstat) for v in F_CHIPS)
    legend = ''.join(lg(ST_C[k], '코드 미발급' if k == '미사용' else k)
                     for k in ('코드발급', '편집', '사용가능', '공유', '미사용'))
    av = acct if acct else '<span style="color:#9ca3af">고객사 검색 · 비우면 전체</span>'
    return ('<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;'
            'padding:10px 12px;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:12px;'
            'font-size:12.5px;background:#fff">'
            '<b style="font-size:13px;margin-right:2px">SOBP 맵</b>%s%s'
            '<div style="width:200px;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;'
            'font-size:13px;background:#fff" title="비우면 전체, 입력하면 해당 고객사만">%s</div>'
            '<span style="display:inline-flex;gap:10px;font-size:12px;width:100%%;padding-top:2px;'
            'border-top:1px dashed #eef0f4;margin-top:2px">%s</span>'
            '</div>' % (grp % ('코드', pchips), grp % ('상태', fchips), av, legend))


def alloc_row(s, o):
    return ('<div style="display:flex;gap:12px;align-items:center;margin-bottom:12px;flex-wrap:wrap">'
            '<span style="background:#5f8ff0;color:#fff;border-radius:9px;padding:9px 18px;'
            'font-size:13px;font-weight:700;display:inline-flex;align-items:center;gap:7px">'
            '<span style="font-size:15px;line-height:1">＋</span> 직접 코드 할당</span>'
            '<span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;'
            'color:#6b7280">발급 대상 %s%s</span>'
            '<span style="font-size:11.5px;color:#9ca3af">'
            '위에서 고른 Section·Owner에 코드를 발급합니다.</span></div>' % (sc('S', s), sc('O', o)))


# ── SECTION ─────────────────────────────────────────────────────
# (section, 사용 owner, 정원, 추천제외)
SEC_ALL = ((0, 28, '524,288', 0), (3, 232, '4,096', 0), (4, 1, '1,024', 0), (5, 163, '256', 0),
           (10, 15, '1,024', 0), (11, 1, '1,024', 0), (14, 10, '4,096', 0), (15, 0, '32,768', 0),
           (44, 21, '4,096', 0))
SEC_PDS2 = ((0, 7, '524,288', 1), (3, 25, '4,096', 0), (14, 0, '4,096', 1))
SEC_PDS3 = ((0, 23, '1,024', 0), (3, 213, '1,024', 0), (5, 163, '256', 0), (10, 15, '1,024', 0),
            (11, 1, '1,024', 0), (14, 10, '1,024', 0), (15, 0, '32,768', 0))
SEC_PDS4 = ((44, 21, '4,096', 0),)
SEC_OID = ((3, 8, '4,096', 0), (4, 1, '1,024', 0))


def sec_col(rows, sel):
    out = ''
    for s, used, cap, excl in rows:
        tag = ('<span style="font-size:8.5px;margin-left:4px;background:#f3f4f6;color:#9ca3af;'
               'border-radius:5px;padding:2px 7px" title="테스트/개발 전용 · 자동 추천 제외(직접 선택은 가능)">'
               '추천제외</span>') if excl else ''
        out += cardbtn('%s%s<div style="font-size:10px;color:#9ca3af;margin-top:2px">사용 owner %d / %s</div>'
                       % (sc('S', s), tag, used, cap), s == sel)
    return colcard('SECTION', out)


# ── OWNER ───────────────────────────────────────────────────────
# 행: (owner, 상태, [종류], 아랫줄) — 아랫줄 = 보유 고객사 문자열 | ('lang', 그룹 고객사, 역할, 언어줄)
def role_chip(t):
    bg, fg, tip = (('#dbeafe', '#1d4ed8', '기본 Owner · 슬롯 1~4') if t == '기본' else
                   ('#fef3c7', '#b45309', '고객사 관리 ▸ 공통코드 · 확장 언어 에서 역할을 고르세요') if t == '역할 미지정' else
                   ('#cffafe', '#0e7490', '확장 언어'))
    return ('<span title="%s" style="font-size:9px;font-weight:700;border-radius:4px;padding:0 4px;'
            'line-height:14px;white-space:nowrap;flex-shrink:0;background:%s;color:%s">%s</span>' % (tip, bg, fg, t))


def own_col(rows, sel, ph, ofrom='', more=None, empty=None):
    if empty:
        inner = (from_input('O', ph, ofrom) +
                 '<div style="font-size:11.5px;color:#9ca3af;padding:12px 8px;text-align:center;line-height:1.7">%s'
                 '<div style="display:block;width:100%%;margin:8px 0 2px;padding:7px 0;font-size:11.5px;'
                 'border:1px solid #cbd5e1;border-radius:8px;background:#fafbfc;color:#2563eb">필터 해제</div></div>'
                 % empty + (more_btn(more) if more else ''))
        return colcard('OWNER', inner, '4px')
    out = ''
    for o, st, kinds, sub in rows:
        if isinstance(sub, tuple):
            _, co, role, langs = sub
            low = ('<div style="display:flex;align-items:center;gap:4px;margin-top:2px;min-width:0">'
                   '<span style="font-size:10px;color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">%s</span>%s</div>'
                   '<div style="font-size:9.5px;color:#0e7490;margin-top:2px;line-height:1.4;overflow:hidden;'
                   'text-overflow:ellipsis;white-space:nowrap">🌐 %s</div>' % (co, role_chip(role), langs))
        else:
            low = sub_line(sub) if sub else ''
        out += cardbtn('<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;row-gap:3px">%s%s%s</div>%s'
                       % (sc('O', o), st_badge(st), ''.join(kind_chip(k) for k in kinds), low), o == sel)
    return colcard('OWNER', from_input('O', ph, ofrom) + out + (more_btn(more) if more else ''), '4px')


# ── BOOK ────────────────────────────────────────────────────────
# 행: (book, 상태, 종류|None, 펜|None, 라벨)
def book_col(rows, sel, ph, bfrom='', more=None, shared=False, nobook=None):
    box = ''
    if nobook:
        box = ('<div style="border:1px dashed #99f6e4;background:#f0fdfa;border-radius:9px;padding:9px 10px;margin-top:4px">'
               '<div style="font-size:11px;font-weight:700;color:#0f766e;margin-bottom:4px">book 미분할 · %d건</div>'
               '<div style="font-size:10.5px;color:#115e59;line-height:1.6;margin-bottom:5px">분량이 적어 <b>book 으로 나누지 않은</b> OID 입니다. '
               '업체(S/O) 단위로 관리합니다.</div>%s</div>'
               % (len(nobook), ''.join('<div style="font-size:10.5px;color:#374151;padding:2px 0">· %s</div>' % t for t in nobook)))
    out = ''
    for b, st, kind, pen, label in rows:
        out += cardbtn('<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;row-gap:3px">%s%s%s%s</div>%s'
                       % (sc('B', b), st_badge(st), kind_chip(kind) if kind else '', pen_chip(pen) if pen else '',
                          sub_line(label, '#7e22ce' if shared else '#6b7280', shared) if label else ''), b == sel)
    return colcard('BOOK', from_input('B', ph, bfrom) + box + out + (more_btn(more) if more else ''), '4px')


# ── PAGE (PageView) ─────────────────────────────────────────────
def stat(label, val, pct, color, sub=None):
    s = ('<div style="font-size:10px;color:#9ca3af;margin-top:2px">%s</div>' % sub) if sub else ''
    return ('<div style="border:1px solid #eef0f4;border-radius:10px;padding:10px">'
            '<div style="font-size:10.5px;color:#6b7280">%s</div>'
            '<div style="font-size:17px;font-weight:700;color:%s">%s'
            '<span style="font-size:10px;color:#9ca3af;font-weight:400">p</span>'
            '<span style="font-size:12px;color:#9ca3af;font-weight:600;margin-left:6px">%s%%</span>'
            '</div>%s</div>' % (label, color, val, pct, s))


def bar(label, value, width, bg, fg):
    return ('<div style="position:relative;height:50px;background:#f7f8fa;'
            'border:1px solid #e5e7eb;border-radius:6px;margin-top:6px;overflow:hidden">'
            '<div style="position:absolute;left:0;top:0;bottom:0;width:%.1f%%;background:%s"></div>'
            '<div style="position:absolute;left:12px;top:0;bottom:0;display:flex;align-items:center;'
            'gap:8px;z-index:3;white-space:nowrap;text-shadow:0 1px 2px rgba(255,255,255,.85)">'
            '<span style="font-size:11.5px;color:#6b7280;font-weight:600">%s</span>'
            '<b style="font-size:12.5px;color:%s">%s</b></div></div>'
            % (width, bg, label, fg, value))


def fmt_pct(v):
    s = ('%.1f' % v).rstrip('0').rstrip('.')
    return s


def page_col(sec, own, book, pmax, total=0, kind=None, cust=None, shared=False, edited=False,
             others=0, sub='', tip=False):
    """cust=None → 미사용. shared=True → 「공유 고객사」 라벨(cust='' 면 「사용 고객사 없음」)"""
    in_use = cust is not None
    REC = min(1000, pmax)
    remain = max(0, pmax - total)
    pv = lambda v: fmt_pct(round(v * 1000.0 / pmax) / 10.0)
    over = total > REC
    rec_pct = min(100.0, REC * 100.0 / pmax)
    use_pct = min(total, REC) * 100.0 / pmax
    hatch_w = min(100.0 - rec_pct, (total - REC) * 100.0 / pmax) if over else 0
    fill_c = '#88D7FF'
    vs_rec = int(round(total * 100.0 / REC)) if REC else 0

    # 코드 타입은 편집 · 키 발급에서 정한 Book 에만 붙는다 `PC-280`
    head = ('<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'
            '<span style="font-size:13px;font-weight:700">Page 용량</span>%s'
            '<span style="display:inline-flex;align-items:center;gap:3px">%s%s%s</span></div>'
            % (kind_chip(kind) if kind else '', sc('S', sec), sc('O', own), sc('B', book)))
    if in_use:
        tag = ('<span style="background:%s;color:%s;border-radius:5px;padding:2px 7px;font-size:11px">%s</span>'
               % (('#eef6ff', '#2563eb', '편집') if edited else ('#ccfbf1', '#0f766e', '사용가능')))
        if edited:
            tag += ('<span style="margin-left:6px;background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;'
                    'border-radius:5px;padding:2px 7px;font-size:11px">✏️ 편집으로 이동 →</span>')
        if others:
            tag += '<span style="color:#9ca3af;margin-left:6px">외 %d건</span>' % others
        box = ('<div style="margin-top:8px;margin-bottom:12px;border-radius:12px;padding:14px 16px;'
               'border:1px solid #bfdbfe;background:#f5f9ff">'
               '<div style="font-size:11px;color:%s">%s</div>'
               '<div style="font-size:22px;font-weight:800;color:%s;margin-top:2px">%s</div>'
               '<div style="font-size:12.5px;color:#374151;margin-top:4px">%s</div></div>'
               % ('#7e22ce' if shared else '#6b7280', '공유 고객사' if shared else '고객사',
                  '#7e22ce' if shared else '#1d4ed8', (cust or '사용 고객사 없음') if shared else cust, tag))
    else:
        box = ('<div style="margin-top:8px;margin-bottom:12px;border-radius:12px;padding:14px 16px;'
               'border:1px solid #e5e7eb;background:#fafbfc">'
               '<div style="font-size:15px;font-weight:700;color:#9ca3af">'
               '미사용 (발급 가능) — 이 S/O/B에는 사용 중인 프로젝트가 없습니다.</div></div>')
    stats = (stat('전체 사용 가능', '{:,}'.format(pmax), 100, '#111827')
             + stat('권장 사용량 (기준 1,000p)', '{:,}'.format(REC), pv(REC), '#b45309')
             + stat('실 사용 Page', '{:,}'.format(total), pv(total), '#2563eb',
                    ('권장 대비 %d%%' % vs_rec) if in_use else None)
             + stat('잔여 (발급 가능)', '{:,}'.format(remain), pv(remain), '#166534'))
    bars = (bar('전체 사용 가능', '{:,}p · 100%'.format(pmax), 100, '#eef1f6', '#374151')
            + bar('권장 사용량 (기준 1,000p)', '{:,}p · {}%'.format(REC, pv(REC)), rec_pct, '#fbe3ca', '#92400e'))
    hatch = ''
    if over:
        hatch = ('<div style="position:absolute;left:%.1f%%;top:0;bottom:0;width:%.1f%%;'
                 'background:repeating-linear-gradient(45deg,#fca5a5 0 7px,#fee2e2 7px 14px)"></div>' % (rec_pct, hatch_w))
    over_txt = (' ⚠ 초과 +{:,}p'.format(total - REC)) if over else ''
    subl = ('<div style="font-size:11px;color:#334155;margin-top:2px;white-space:nowrap;overflow:hidden;'
            'text-overflow:ellipsis">%s</div>' % sub) if (in_use and sub) else ''
    bars += ('<div style="position:relative;height:50px;background:#f7f8fa;border:1px solid #e5e7eb;'
             'border-radius:6px;margin-top:6px;overflow:hidden">'
             '<div style="position:absolute;left:0;top:0;bottom:0;width:%.1f%%;background:%s"></div>%s'
             '<div style="position:absolute;left:12px;top:0;bottom:0;display:flex;flex-direction:column;'
             'justify-content:center;z-index:3;text-shadow:0 1px 2px rgba(255,255,255,.9)">'
             '<div style="font-size:12.5px;font-weight:800;color:#0f172a;white-space:nowrap">'
             '실 사용 %s · %s%%<span style="font-weight:600;color:%s;margin-left:8px">권장 대비 %d%%%s</span></div>%s</div></div>'
             % (use_pct, fill_c, hatch, '{:,}p'.format(total), pv(total),
                '#b91c1c' if over else '#334155', vs_rec, over_txt, subl))
    if tip:
        def tbox(top, left, html):
            return ('<div style="position:absolute;top:%dpx;left:%d%%;background:#111827;color:#fff;font-size:11.5px;'
                    'padding:7px 10px;border-radius:7px;z-index:9;line-height:1.5;white-space:nowrap;'
                    'box-shadow:0 6px 18px rgba(0,0,0,.28)">%s</div>' % (top, left, html))
        rec_left = max(0, REC - total)
        c_name, c_proj = (sub.split(' · ') + ['', ''])[:2]
        tips = (tbox(14, 26, '전체 {:,}p (100%)<br>잔여(발급 가능) {:,}p ({}%)'.format(pmax, remain, pv(remain)))
                + tbox(70, 14, '권장 {:,}p ({}%)<br>권장 내 미사용 {:,}p'.format(REC, pv(REC), rec_left))
                + tbox(126, 4, '실 사용 {:,}p ({}%)<br>권장 대비 {}%<br><b>{}</b><br>교재: {}'
                       .format(total, pv(total), vs_rec, c_name, c_proj)))
        bars = ('<div style="position:relative">%s%s<div style="font-size:10.5px;color:#9ca3af;margin-top:8px">'
                '※ 실제 화면에서는 마우스를 올린 막대의 툴팁 <b>하나만</b> 뜬다 — 정의서라 함께 표시</div></div>' % (bars, tips))
    legend = ''.join(lg(c, tx) for c, tx in (
        ('#ef4444' if over else fill_c, '실사용 {:,}p ({}%)'.format(total, pv(total))),
        ('#fbe3ca', '권장 {:,}p ({}%)'.format(REC, pv(REC))),
        ('#eef1f6', '전체 {:,}p (100%)'.format(pmax))))
    warn = '<span style="color:#b91c1c;font-weight:700">⚠ 권장 초과</span>' if over else ''
    used_range = ('<div style="font-size:10.5px;color:#9ca3af;margin-top:6px">사용 구간 P1~P{:,}</div>'.format(total)
                  if in_use else '')
    return ('<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px">%s%s'
            '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px">%s</div>'
            '<div style="font-size:11.5px;color:#6b7280;margin-bottom:6px">용량 맵 · 막대 길이 = 페이지 비율 (전체 기준 100%%)</div>'
            '<div style="position:relative">'
            '<div style="position:absolute;left:%.1f%%;top:0;bottom:18px;width:0;border-left:2px dashed #f0b429;z-index:2"></div>%s'
            '<div style="position:relative;height:16px;font-size:10px;color:#b45309;margin-top:2px">'
            '<span style="position:absolute;left:calc(%.1f%% + 4px);white-space:nowrap">▲ 권장 %s</span></div></div>'
            '<div style="display:flex;gap:14px;font-size:10.5px;color:#6b7280;margin-top:8px">%s%s</div>%s</div>'
            % (head, box, stats, rec_pct, bars, rec_pct, '{:,}p'.format(REC), legend, warn, used_range))


# ── 화면 데이터 (로컬 앱 상태별 값) ───────────────────────────────
U = '코드 미발급'
OWN_ALL_S0 = ((0, U, [], ''), (1, '코드발급', [], 'neoa-1'), (2, '코드발급', [], 'neotest-2'),
              (3, '코드발급', [], 'neo1024-3'), (4, U, [], ''), (5, U, [], ''), (6, U, [], ''), (7, U, [], ''),
              (8, '코드발급', [], 'Reserved For R&D-8'), (9, '코드발급', [], 'Reserved For R&D-9'),
              (10, '편집', ['PDS2'], '교원구몬-10, 교원구몬'), (11, '편집', ['PDS2'], '교원에듀-11, 교원에듀'))
BOOK_NEOA = tuple((b, '사용가능', None, None, 'neoa-1') for b in range(10))
BOOK_GUMON = lambda start, n: tuple((b, '사용가능', None, None, '교원구몬') for b in range(start, start + n))
BOOK_EMPTY = lambda n, start=0: tuple((b, U, None, None, '') for b in range(start, start + n))
PG_NEOA = dict(pmax=4096, total=1, cust='neoa-1', sub='neoa-1 · neoa-1 코드발급 · S0/O1')
PG_GUMON = dict(pmax=4096, total=16777, cust='교원구몬', sub='교원구몬 · 교원구몬 코드발급 · S0/O10')
C21 = 'Common-21'


def content(kind='전체', fstat='전체', acct='', secs=SEC_ALL, sel_s=0, sel_o=1, sel_b=0,
            own=OWN_ALL_S0, oph='0 ~ 524,287', ofrom='', omore='524,208', oempty=None,
            books=BOOK_NEOA, bph='0 ~ 16,383', bfrom='', bmore='16,304', bshared=False, nobook=None,
            pg=None):
    pk = dict(sec=sel_s, own=sel_o, book=sel_b)
    pk.update(pg or {})
    return ('<div style="margin:-2px">%s%s'
            '<div style="display:grid;grid-template-columns:150px 150px 150px 1fr;gap:10px;align-items:start">'
            '%s%s%s%s</div></div>'
            % (toolbar(kind, fstat, acct), alloc_row(sel_s, sel_o), sec_col(secs, sel_s),
               own_col(own, sel_o, oph, ofrom, omore, oempty),
               book_col(books, sel_b, bph, bfrom, bmore, bshared, nobook),
               page_col(**pk)))


NAV = [('발급된 코드의 고객사 확인', '이동', '<code>MEM-01</code>', '업체 상세'),
       ('발급 코드의 프로젝트 확인', '이동', '<code>PRJ-01</code>', '고객사별 코드 프로젝트'),
       ('편집 상태 코드의 편집 내역', '이동', '<code>PRJ-02</code> → <code>PRJ-03</code>', '')]


def build():
    B = []

    B.append((
        'S1', '기본 — 코드 전체 · 상태 전체', '기본',
        '<b>좌표(SOBP)가 먼저</b>다 <code>PC-032</code>. Section·Owner·Book·Page 로 코드를 짚고, '
        '그 좌표가 <b>PDS2 · PDS3 · PDS4(S-code, Section 44) · OID</b> 중 무엇으로 쓰이는지를 '
        '<b>종류 칩</b>으로 보인다. <b>옛 IDS(A코드) 표기는 OID 와 같은 것</b>이다 <code>PC-035</code>.<br>'
        '상단은 <b>「코드」 필터(전체 · PDS2 · PDS3 · PDS4 · OID)</b> 와 <b>「상태」 필터</b> 두 묶음이고, '
        '바로 옆에 고객사 검색이 붙는다 <code>PC-333</code> <code>PC-039</code>. '
        '처음 연 상태 = 코드 <b>전체</b> · 상태 <b>전체</b> · 고객사 비움 · <b>첫 좌표(S0 / O1 / B0)</b>. '
        '전체 보기의 Section 정원은 그 섹션을 쓰는 <b>종류들의 최대치</b>다.',
        frame('SOB-01', 'SOBP 맵', content(pg=PG_NEOA), height=1180),
        [('코드 필터', '클릭', 'S2 (PDS2) · S18 (PDS4) · S19 (OID)',
          '<b>전체 / PDS2 / PDS3 / PDS4 / OID</b> 5칸. 고르면 Section 목록이 다시 그려지고 '
          '<b>그 종류의 첫 좌표(S→O→B)로 이동</b>하며 번호 점프·더 보기·상태 필터는 초기화된다 <code>PC-038</code>'),
         ('OWNER · BOOK 종류 칩', '표시', '—',
          '그 좌표가 어떤 종류로 쓰이는지 <b>용도 표시</b> — 종류가 정해진 기록이 있을 때만 붙는다. 한 owner 가 Book 을 나눠 '
          '<b>PDS2·PDS3 를 함께</b> 쓸 수 있다 <code>PC-039</code> <code>PC-281</code>'),
         ('카드 칩 순서', '표시', '통일', 'OWNER·BOOK 모두 <b>[번호] → [상태] → [종류] → (펜)</b> 순서다 <code>PC-040</code>'),
         ('상태 필터 칩', '클릭', 'S3~S7', '전체 / 발급 전체 / 코드 미발급 / 편집 / 공유 / 사용가능 <b>6종</b>'),
         ('고객사 검색', '입력·선택', 'S8', '자리표시 <b>고객사 검색 · 비우면 전체</b> — 목록에서 고르거나 정확히 입력하면 코드 종류·S·O·B 가 한꺼번에 이동'),
         ('SECTION 항목', '클릭', 'Owner·Book 초기화', '<b>사용 owner {n} / {정원}</b>'),
         ('OWNER 항목', '클릭', 'Book 갱신', 'Book 선택이 풀린다'),
         ('BOOK 항목', '클릭', 'Page 용량 갱신', ''),
         ('Page 용량 머리', '표시', '—', '<b>코드 타입이 정해진 Book</b>(편집 · 키 발급에서 정함)일 때만 종류 칩 <code>PC-280</code>'),
         ('Page 고객사 박스', '표시', '—', '고객사 · <b>편집 / 사용가능</b> 태그 · 편집이면 <b>✏️ 편집으로 이동 →</b> · 기록이 여럿이면 <b>외 {n}건</b>'),
         ('O · B 번호 입력', '입력', 'S9', '그 번호부터 노출 · ✕로 초기화'),
         ('[＋ 더 보기]', '클릭', '80개씩 추가', '한 번에 <b>80개</b>씩 · 스크롤로도 이어 로드'),
         ('상위 선택 변경', '자동', '첫 항목으로 이동', '현재 선택이 목록에서 사라지면 <b>첫 항목</b>으로 되돌린다'),
         ('[＋ 직접 코드 할당]', '클릭', '<code>SOB-02</code> 모달', '같은 화면 위에 <b>모달</b>로 열린다'),
         ('Page 막대', '마우스 오버', 'S17 툴팁', '막대별 수치 안내')] + NAV))

    B.append((
        'S2', 'PDS2(Gcode)로 전환', '분기',
        '코드 필터를 <b>PDS2</b> 로 바꾸면 Section이 <b>0 · 3 · 14</b> 3개로 바뀌고, '
        '테스트/개발 전용인 <b>S0·S14</b> 에 <b>추천제외</b> 배지가 붙는다. PDS2 의 첫 좌표 <b>S0 / O10 / B111</b> 로 이동한다 '
        '(목록은 0번부터 보이고 선택한 B111 은 스크롤 아래). '
        '⚠ <b>PDS3 에는 추천제외 Section 이 하나도 없다.</b> <b>PDS4</b> 는 Section <b>44</b>, <b>OID</b> 는 데이터가 있는 Section(3 · 4)만 나온다.',
        frame('SOB-01', 'SOBP 맵',
              content(kind='PDS2', secs=SEC_PDS2, sel_o=10, sel_b=111,
                      own=OWN_ALL_S0[:10] + ((10, '편집', ['PDS2'], '교원구몬-10'), (11, '편집', ['PDS2'], '교원에듀-11')),
                      bph='0 ~ 8,191', bmore='8,112',
                      books=tuple((b, '사용가능', None, None, '교원구몬-10') for b in range(8)),
                      pg=dict(pmax=1024, total=0, kind='PDS2', cust='교원구몬-10', edited=True, others=1,
                              sub='교원구몬-10 · MP3SHEET')),
              height=1180),
        [('추천제외 배지', 'hover', '툴팁', '<b>테스트/개발 전용 · 자동 추천 제외(직접 선택은 가능)</b> — PDS2 의 S0·S14만'),
         ('Section 정원', '표시', '—', 'PDS2 S0 은 owner 524,288 · S3 4,096 · S14 4,096'),
         ('페이지 정원', '표시', '—', 'PDS2 S0 은 page 1,024 → 권장 1,000p 가 97.7%'),
         ('전환 시', '자동', '첫 좌표로 이동', 'Owner·Book 선택 · 번호 점프 · 더 보기 · 상태 필터가 모두 처음으로')]))

    st_states = (
        ('S3', '발급 전체', '발급(할당)된 코드 전체 — 편집·공유·사용가능 포함',
         dict(sel_o=10, own=tuple(r for r in OWN_ALL_S0 if r[1] != U)[:7] + (
             (12, '코드발급', [], 'iconix1-12'), (13, '코드발급', [], 'iconix2-13'), (14, '편집', ['PDS2'], '삼성영어-14'),
             (15, '편집', ['PDS2'], '헤르만헤세-15'), (16, '코드발급', [], 'NeolabJP-16')),
              books=BOOK_GUMON(0, 6), pg=PG_GUMON)),
        ('S4', '코드 미발급', '아직 발급되지 않은 빈 코드',
         dict(sel_o=0, own=tuple((o, U, [], '') for o in (0, 4, 5, 6, 7, 20, 21, 22, 23, 24, 25, 26)),
              books=BOOK_EMPTY(6), pg=dict(pmax=4096))),
        ('S5', '편집', '발급된 코드 중 실제 편집에 쓰인 코드',
         dict(sel_o=10, own=((10, '편집', ['PDS2'], '교원구몬-10, 교원구몬'), (11, '편집', ['PDS2'], '교원에듀-11, 교원에듀'),
                             (14, '편집', ['PDS2'], '삼성영어-14'), (15, '편집', ['PDS2'], '헤르만헤세-15'),
                             (17, '편집', ['PDS2'], '웅진씽크빅-17'), (18, '편집', ['PDS2'], '잉글리시에그-18'),
                             (27, '공유', ['PDS3'], '네오노트-0-27'), (1006, '편집', ['PDS2'], '구몬S-1006')),
              books=BOOK_GUMON(0, 6), pg=PG_GUMON)),
        ('S6', '공유', '여러 고객사가 함께 쓰도록 지정된 OWNER — 발급 여부와 무관하게 <b>공유</b> 배지',
         dict(sel_s=3, sel_o=27, oph='0 ~ 4,095', omore='4,016', bph='0 ~ 8,191', bmore='8,112', bshared=True,
              own=((27, '공유', ['PDS3'], '(K)맥컬리, (K)iuEdu, (K)NHN EDU, (K)에듀프레소, (K)영업용 테스트 코드'),
                   (1012, '공유', ['PDS3'], '네오노트-1012')),
              books=((0, '사용가능', None, None, ''),) + tuple((b, '편집', 'PDS3', '필기펜', '') for b in range(1, 6)),
              pg=dict(pmax=4096))),
        ('S7', '사용가능', '공유 코드 중 아직 편집하지 않은 것 — 예: 코드 <b>PDS2</b> · Section 3 의 Common-21 확장 Owner',
         dict(kind='PDS2', secs=SEC_PDS2, sel_s=3, sel_o=966, oph='0 ~ 4,095', omore='4,016', bph='0 ~ 4,095', bmore='4,016',
              own=tuple((o, '공유', [], ('lang', C21, '확장 %d' % (o - 963), '지정된 언어 없음')) for o in range(966, 978)),
              books=tuple((b, '사용가능', None, None, '') for b in range(3)), pg=dict(pmax=4096))),
    )
    for sid, lab, note, kw in st_states:
        B.append((
            sid, '상태 필터 — %s' % lab, '필터',
            '칩 <b>[%s]</b> 를 고른 상태. %s' % (lab, note),
            frame('SOB-01', 'SOBP 맵', content(fstat=lab, **kw), height=1120),
            [('[%s] 칩' % lab, '클릭', '해당 Owner만', note),
             ('필터 유지', '자동', 'Section·코드 종류 변경 후에도 유지', '결과가 비면 S10 안내 + [필터 해제]'),
             ('[전체] 칩', '클릭', 'S1 복귀', '')]))

    B.append((
        'S8', '고객사 검색 → 좌표 이동', '분기',
        '<b>목록에서 고르거나 정확히 입력</b>하면 그 고객사의 첫 코드로 <b>코드 종류·S·O·B 가 한꺼번에 이동</b>하고 번호 점프가 풀린다 '
        '— 「교원구몬」 은 <b>PDS3 · S0 / O10 / B0</b> 로 이동하고 목록은 그 고객사 것만 남는다. 부분 입력이면 <b>필터로만</b> 동작한다.',
        frame('SOB-01', 'SOBP 맵',
              content(kind='PDS3', acct='교원구몬', secs=SEC_PDS3, sel_o=10, oph='0 ~ 1,023', omore='944',
                      own=((10, '코드발급', [], '교원구몬, 교원구몬-10'),), books=BOOK_GUMON(0, 6), pg=PG_GUMON),
              height=1120),
        [('정확 입력 · 목록 선택', 'Enter/선택', '코드 종류·S·O·B 동시 이동', '그 고객사의 첫 코드 기준'),
         ('부분 입력', '입력', '필터로만 동작', '이동하지 않음'),
         ('비우기', '입력', '전체', '고객사 제한 해제'),
         ('검색 대상', '참고', '—', '보유 고객사 + <b>공유 코드의 실사용 고객사</b> 모두')]))

    B.append((
        'S9', 'O · B 번호 점프', '분기',
        '입력값을 <b>0 ~ 정원-1</b> 로 보정한 뒤 그 번호부터만 노출한다. '
        '값이 있으면 <b>✕</b>(초기화) 버튼이 나타나고, 누르면 목록이 처음으로 돌아간다. (O 8 · B 3 입력)',
        frame('SOB-01', 'SOBP 맵',
              content(sel_o=10, sel_b=3, ofrom='8', omore='524,200', bfrom='3', bmore='16,301',
                      own=tuple(r for r in OWN_ALL_S0 if r[0] >= 8), books=BOOK_GUMON(3, 8),
                      pg=dict(PG_GUMON)), height=1120),
        [('O 입력', '숫자 입력', '그 번호부터 노출', '자리표시 <code>0 ~ {정원-1}</code>'),
         ('B 입력', '숫자 입력', '그 번호부터 노출', ''),
         ('✕', '클릭', '초기화', '목록이 처음으로 돌아간다'),
         ('숫자 외 입력', '입력', '무시', '숫자만 받는다'),
         ('범위 초과', '입력', '정원-1로 보정', '')]))

    B.append((
        'S10', 'Owner 결과 없음 — 필터 때문', '빈 상태',
        '필터를 걸어서 Owner 가 하나도 남지 않은 경우(Section 5 · 상태 공유). <b>어떤 필터 때문인지</b> 문장에 넣어 알려주고 '
        '<b>[필터 해제]</b> 한 번으로 모두 푼다. 안내에 들어가는 조건은 <b>상태 · 고객사 · 검색어 · O 번호 이후</b> 를 이어 붙인다. '
        '아래 <b>[＋ 더 보기]</b> 는 그대로 남는다.',
        frame('SOB-01', 'SOBP 맵',
              content(fstat='공유', sel_s=5, sel_o=0, oph='0 ~ 255', omore='176',
                      oempty='S5 에는 <b style="color:#b45309">상태 공유</b> 에<br>해당하는 Owner가 없습니다.',
                      books=BOOK_EMPTY(4), pg=dict(pmax=4096)), height=1000),
        [('안내 문구', '표시', '—', '<b>S{n} 에는 {걸린 필터} 에 해당하는 Owner가 없습니다.</b>'),
         ('[필터 해제]', '클릭', 'S1 복귀', '상태·고객사·검색·번호 점프·더 보기를 <b>한 번에</b> 초기화'),
         ('안내가 뜨는 조건', '참고', '—', '상태 필터 · 고객사 · 검색어 · 번호 점프 중 <b>하나라도 걸려 있을 때</b>')]))

    B.append((
        'S11', '사용 owner 0 인 Section (S15)', '빈 상태',
        '필터가 없으면 Owner 목록은 <b>코드 미발급 Owner 까지 모두</b> 보이므로 비지 않는다 — 사용 owner 가 0 인 '
        'Section 15 도 <b>O0 부터 코드 미발급</b> 카드가 이어진다. 목록이 비는 것은 필터를 걸었을 때뿐이다(S10). '
        '(필터 없이 비는 경우를 위한 <b>결과 없음</b> 문구는 남아 있다)',
        frame('SOB-01', 'SOBP 맵',
              content(sel_s=15, sel_o=0, oph='0 ~ 32,767', omore='32,688', bmore='4,016', bph='0 ~ 4,095',
                      own=tuple((o, U, [], '') for o in range(8)), books=BOOK_EMPTY(6), pg=dict(pmax=512)),
              height=1000),
        [('Section 15', '참고', '—', 'owner 정원 32,768 · page 512 — 사용 owner 0'),
         ('Owner · Book 목록', '표시', '—', '모두 <b>코드 미발급</b>'),
         ('결과 없음', '표시', '—', 'Book 목록 · OID book 미분할 안내가 모두 없을 때 <b>결과 없음</b>')]))

    B.append((
        'S12', 'Owner 배지 — 공유 · 확장 언어 그룹 · 종류', '변형',
        'Owner 배지는 <b>공유로 지정된 Owner 면 발급 여부와 무관하게 항상 공유</b>, 그 외에는 코드 상태 배지다. '
        '뒤에 <b>종류 칩</b>(용도)이 붙는다. 확장 언어 그룹 Owner 는 보유 고객사 대신 <b>그룹 고객사명 · 역할 칩 · 🌐 언어</b> 두 줄이 붙는다(S20). '
        '예전의 <b>🚫 영역 할당됨</b> 배지는 없앴다 — 종류는 배타가 아니라 용도 표시다 <code>PC-039</code>. '
        '(코드 PDS2 · Section 3 · O 17 부터)',
        frame('SOB-01', 'SOBP 맵',
              content(kind='PDS2', secs=SEC_PDS2, sel_s=3, sel_o=17, ofrom='17', oph='0 ~ 4,095', omore='3,999',
                      bph='0 ~ 4,095', bmore='4,016',
                      own=((17, '편집', ['PDS2'], '웅진씽크빅-17'), (18, '편집', ['PDS2'], '잉글리시에그-18'),
                           (19, U, [], ''), (20, '편집', ['PDS2'], '윤선생-20'),
                           (21, '공유', ['PDS2'], ('lang', C21, '기본', '한국어 외 3')), (22, U, [], ''),
                           (23, '편집', ['PDS2'], '아가월드-23'), (24, '편집', ['PDS2'], '자석나라-24'),
                           (25, '편집', ['PDS2'], '한솔교육-25'), (26, '편집', ['PDS2'], '팝펜스티커-26'),
                           (27, '코드발급', [], '(K)맥컬리, (K)iuEdu, (K)NHN EDU, (K)에듀프레소, (K)영업용 테스트 코드'),
                           (28, '코드발급', [], '엠베스트-28')),
                      books=((0, '사용가능', None, None, '웅진씽크빅-17'),
                             (1, '편집', 'PDS2', '소리펜', '범블비 잉글리시 전집'),
                             (2, '편집', 'PDS2', '소리펜', '첫생활 그림책 배꼽손'),
                             (3, '편집', 'PDS2', '소리펜', '곰돌이 학습지 베이비 1단계'),
                             (4, '편집', 'PDS2', '소리펜', '곰돌이 학습지 베이비 2단계'),
                             (5, '편집', 'PDS2', '소리펜', '곰돌이 학습지 베이비 3단계')),
                      pg=dict(pmax=4096)),
              height=1180),
        [('공유 배지', 'hover', '툴팁', '<b>공유 사유</b> · 보라 #a855f7 — 발급 여부보다 우선'),
         ('종류 칩', '표시', '—', '그 owner 좌표를 쓰는 종류(용도) — 종류가 정해진 기록이 없으면 붙지 않는다'),
         ('🌐 확장 언어 그룹 Owner', '표시', 'S20', '그룹 고객사명 옆 <b>역할 칩</b> + 다음 줄 <b>🌐 {첫 언어} 외 {n}</b> <code>PC-343</code> <code>PC-348</code>'),
         ('(K) 표기', '표시', '—', '키 발급(N Key) 대장 고객사'),
         ('일반 Owner의 Book 라벨', '표시', '—', '회색 = 보유 고객사 또는 교재명')]))

    B.append((
        'S13', 'Book 카드 — 종류 · 펜 칩', '변형',
        'Book 카드에는 <b>[번호] → [상태] → [종류] → [펜]</b> 칩이 붙는다 <code>PC-040</code>. 종류는 그 Book 을 편집 · 키 발급에서 '
        '정했을 때만 붙고, 한 Owner 안에서도 <b>Book 마다 다른 종류</b>일 수 있다 <code>PC-281</code>. '
        '펜은 <b>소리펜(NSP 원장)</b> 주황 · <b>필기펜(NWP 원장)</b> 남색. '
        '예전의 <b>🚫 다른 종류 발급 · 선택 불가</b> 차단은 폐지했다 — 어느 Book 이든 고를 수 있다 <code>PC-039</code>. (Section 3 · O27 · B1)',
        frame('SOB-01', 'SOBP 맵',
              content(sel_s=3, sel_o=27, sel_b=1, ofrom='27', oph='0 ~ 4,095', omore='3,989', bph='0 ~ 8,191', bmore='8,112',
                      bshared=True,
                      own=((27, '공유', ['PDS3'], '(K)맥컬리, (K)iuEdu, (K)NHN EDU, (K)에듀프레소, (K)영업용 테스트 코드'),
                           (28, '코드발급', ['PDS3'], '엠베스트-28'), (29, '편집', ['PDS2'], '메가북스-29'),
                           (30, '코드발급', [], 'netssystem-30'), (31, '편집', ['PDS2'], '대교-31, 대교'),
                           (32, '코드발급', [], 'patmos-32')),
                      books=((0, '사용가능', None, None, ''),) + tuple((b, '편집', 'PDS3', '필기펜', '') for b in range(1, 10)),
                      pg=dict(pmax=4096, total=18, kind='PDS3', cust='', shared=True, edited=True, others=1,
                              sub='네오노트-3-27 · 호주용 데모')),
              height=1180),
        [('종류 칩', '표시', '—', '그 Book 에 정해진 코드 종류 — 정하지 않은 Book 은 칩 없음 <code>PC-280</code>'),
         ('펜 칩', 'hover', '툴팁', '<b>소리펜 · NSP 원장</b> / <b>필기펜 · NWP 원장</b>'),
         ('다른 종류 Book', '클릭', 'Page 용량 갱신', '(폐지) 선택 불가 차단 없음 <code>PC-039</code>'),
         ('공유 Owner 의 Book 라벨', '표시', '—', '<b>보라 굵게</b> = 실사용 고객사(있을 때)')]))

    B.append((
        'S14', 'Page 용량 — 미사용(발급 가능)', '빈 상태',
        '선택한 S/O/B 에 쓰는 프로젝트가 없는 경우(S0 / O4 / B0). 고객사 박스가 회색 안내로 바뀌고 '
        '<b>실 사용 0p</b> 가 되며 <b>사용 구간</b> 줄이 사라진다. '
        '잔여 페이지는 <b>한 숫자</b>로만 보이고 코드 타입(PDS2 · PDS3)은 붙지 않는다 <code>PC-280</code>.',
        frame('SOB-01', 'SOBP 맵', content(sel_o=4, books=BOOK_EMPTY(6), pg=dict(pmax=4096)), height=1060),
        [('고객사 박스', '표시', '—', '<b>미사용 (발급 가능) — 이 S/O/B에는 사용 중인 프로젝트가 없습니다.</b>'),
         ('실 사용 Page', '표시', '—', '<b>0p · 0%</b> · 보조 문구 없음'),
         ('잔여 (발급 가능)', '표시', '<b>한 숫자</b>',
          '코드 타입별(PDS2 · PDS3)로 나누지 않는다 <code>PC-280</code> — 할당은 넓은 코드 타입 기준이고 타입은 편집 · 키 발급에서 정한다 <code>PC-279</code>'),
         ('사용 구간', '—', '<b>표시 안 됨</b>', '사용 중일 때만 나온다')]))

    B.append((
        'S15', 'Page 용량 — 공유 고객사', '분기',
        '공유로 지정된 Owner 면 라벨이 <b>고객사 → 공유 고객사</b> 로 바뀌고 보라로 표시된다. '
        '실사용 고객사가 없으면 <b>사용 고객사 없음</b>. 편집 기록이면 <b>편집</b> + <b>✏️ 편집으로 이동 →</b>, 기록이 여럿이면 <b>외 {n}건</b>. '
        '(S13 과 같은 좌표 S3 / O27 / B1 의 Page 칸)',
        frame('SOB-01', 'SOBP 맵',
              content(sel_s=3, sel_o=27, sel_b=1, ofrom='27', oph='0 ~ 4,095', omore=None, bph='0 ~ 8,191', bmore=None,
                      bshared=True, own=((27, '공유', ['PDS3'], '(K)맥컬리, (K)iuEdu, (K)NHN EDU, (K)에듀프레소, (K)영업용 테스트 코드'),),
                      books=((1, '편집', 'PDS3', '필기펜', ''),),
                      pg=dict(pmax=4096, total=18, kind='PDS3', cust='', shared=True, edited=True, others=1,
                              sub='네오노트-3-27 · 호주용 데모')),
              height=1060),
        [('공유 고객사 라벨', '표시', '—', '보라 표기'),
         ('사용 고객사 없음', '표시', '—', '실사용 고객사가 없을 때'),
         ('편집 배지', '표시', '—', '편집이면 <b>편집</b> + <b>✏️ 편집으로 이동 →</b> · 아니면 <b>사용가능</b>'),
         ('외 {n}건', '표시', '—', '같은 S/O/B 에 기록이 여럿일 때'),
         ('[✏️ 편집으로 이동 →]', '클릭', '<code>PRJ-02</code>', '그 Owner 의 편집 프로젝트로 바로 이동')]))

    B.append((
        'S16', '[＋ 더 보기] · 스크롤 로드', '분기',
        '남은 항목이 있을 때만 버튼이 보이고, 누르면 <b>80개씩</b> 늘어난다. '
        '목록을 <b>끝까지 스크롤</b>해도 같은 양이 자동으로 이어 로드된다. (처음 화면의 OWNER · BOOK 목록 끝)',
        frame('SOB-01', 'SOBP 맵', content(pg=PG_NEOA), height=1180),
        [('[＋ 더 보기]', '클릭', '80개 추가', '<b>(남은 {n})</b> 표시'),
         ('스크롤 하단 도달', '스크롤', '80개 자동 추가', '목록 끝에 가까워지면'),
         ('버튼 노출 조건', '참고', '—', '아직 안 보여준 항목이 남아 있을 때만'),
         ('필터·번호 변경 시', '자동', '노출 개수 초기화', '다시 80개부터')]))

    B.append((
        'S17', 'Page 막대 툴팁', '분기',
        '마우스를 따라다니는 툴팁. 전체·권장·실사용 막대마다 문구가 다르고, 실사용 막대는 <b>고객사·교재</b>까지 붙는다. '
        '권장 초과 구간(빗금)에는 <b>권장 초과 +{n}p</b> 전용 툴팁이 따로 있다.',
        frame('SOB-01', 'SOBP 맵', content(pg=dict(PG_NEOA, tip=True)), height=1180),
        [('전체 막대', 'hover', '툴팁', '<b>전체 {n}p (100%)</b> / <b>잔여(발급 가능) {n}p ({}%)</b>'),
         ('권장 막대', 'hover', '툴팁', '<b>권장 {n}p ({}%)</b> / <b>권장 내 미사용 {n}p</b>'),
         ('실사용 막대', 'hover', '툴팁', '<b>실 사용 {n}p ({}%)</b> / <b>권장 대비 {}%</b> / <b>{고객사}</b> / <b>교재: {교재명}</b>'),
         ('빗금 구간', 'hover', '툴팁', '<b>권장 초과 +{n}p ({}%)</b> / <b>실사용 {n}p / 권장 {n}p</b>'),
         ('마우스 이탈', '마우스 벗어남', '툴팁 닫힘', '')]))

    B.append((
        'S18', 'PDS4 (S-code) · Section 44', '분기',
        '<code>PC-032</code> — <b>Section 44 로 발급된 좌표는 PDS4(S-code)</b> 로 구분한다. '
        '코드 필터 <b>PDS4</b> 를 고르면 Section 은 <b>44</b> 하나만 남고(정원 owner 4,096 · book 256 · page 256), '
        '첫 좌표 <b>O300 / B0</b> 으로 이동한다. 원장의 <b>21 owner</b>((K)ICsolutions 등). (O 300 부터)',
        frame('SOB-01', 'SOBP 맵',
              content(kind='PDS4', secs=SEC_PDS4, sel_s=44, sel_o=300, ofrom='300', oph='0 ~ 4,095', omore='3,716',
                      bph='0 ~ 255', bmore='176',
                      own=tuple((o, '코드발급', [], '(K)ICsolutions') for o in range(300, 310)),
                      books=tuple((b, '사용가능', 'PDS4', None, '(K)ICsolutions') for b in range(6)),
                      pg=dict(pmax=256, total=1, kind='PDS4', cust='(K)ICsolutions',
                              sub='(K)ICsolutions · ICsolutions-300 코드발급 · S44/O300')),
              height=1120),
        [('코드 필터 [PDS4]', '클릭', 'Section 44', '섹션 목록이 <b>44</b> 하나로 바뀐다'),
         ('Section 44', '표시', '—', '<b>사용 owner 21 / 4,096</b>'),
         ('좌표 범위', '표시', '—', 'owner 0~4095 · book 0~255 · page 0~255 · xy 0~255 (Code Info 정식 범위 <code>PC-042</code>)'),
         ('이전 표기', '—', '정정', '과거 “테스트/개발 전용”으로만 적던 Section 44 를 <b>PDS4(S-code)</b> 로 분류한다')] + NAV))

    B.append((
        'S19', 'OID 좌표 보기', '분기',
        '<code>PC-035</code> — <b>OID</b> 는 index 만 갖는 코드(외부 코드를 우리 펜으로 판독)이고 <b>옛 IDS(A코드) 표기와 같은 것</b>이다. '
        '코드 필터 <b>OID</b> 로 좌표를 걸러 본다. Section 은 데이터가 있는 <b>3 · 4</b> 만 나오고, OID 는 같은 S/O 를 다른 종류와 '
        '함께 쓸 수 있어(index 부여) <b>OID 로 잡은 Book 만</b> 발급으로 표시된다. (S3 · O 17 부터 · B 431 부터) '
        'OID 설명은 코드 관리 정보 ▸ [티켓 정보] 탭의 OID 안내 카드에 있다(옛 OID 관리대장 탭은 폐지 <code>PC-325</code>).',
        frame('SOB-01', 'SOBP 맵',
              content(kind='OID', secs=SEC_OID, sel_s=3, sel_o=17, sel_b=431, ofrom='17', oph='0 ~ 4,095', omore='3,999',
                      bfrom='431', bph='0 ~ 8,191', bmore='7,681',
                      own=((17, '편집', ['OID'], '웅진씽크빅-17'), (18, '편집', ['OID'], '잉글리시에그-18'),
                           (19, U, [], ''), (20, U, [], ''), (21, '편집', ['OID'], ('lang', C21, '기본', '한국어 외 3')),
                           (22, U, [], ''), (23, U, [], ''), (24, U, [], ''), (25, '코드발급', ['OID'], '한솔교육-25'),
                           (26, U, [], '')),
                      books=tuple((b, '편집', 'OID', '소리펜', '범블비 잉글리시 전집 OID %d권' % (b - 430)) for b in range(431, 439)),
                      pg=dict(pmax=4096, total=0, kind='OID', cust='웅진씽크빅-17', edited=True, others=1,
                              sub='웅진씽크빅-17 · 범블비 잉글리시 전집 OID 1권')),
              height=1180),
        [('코드 필터 [OID]', '클릭', 'OID 좌표만', 'Section 3 · 4(옛 IDS 포함)'),
         ('같은 S/O 공유', '표시', '—', '예: <b>S3/O17</b> 은 PDS2 코드와 OID 가 함께 있고 <b>Book 으로 구분</b>된다'),
         ('Book 목록', '표시', '—', 'OID 로 발급된 Book(예: 431~)만 발급 상태'),
         ('book 미분할 업체', '표시', 'S21', '분량이 적어 book 을 나누지 않은 업체는 BOOK 열 맨 위에 안내 상자 <code>PC-036</code>'),
         ('OID 설명', '조회', '<code>INF-01</code>', '코드 관리 정보 ▸ [티켓 정보] 탭 OID 안내 카드 · 옛 OID 관리대장 탭은 폐지 <code>PC-325</code>')] + NAV))

    B.append((
        'S20', '확장 언어 그룹 Owner — 역할 칩', '변형',
        '<code>PC-330</code> <code>PC-343</code> <code>PC-348</code> — 고객사 관리에서 <b>확장 언어 그룹</b>에 넣은 Owner 는 '
        '보유 고객사 대신 <b>그룹 고객사명</b>으로 보이고 두 줄이 붙는다. ① 고객사명 옆 칩 <b>[기본]</b> / <b>[확장 1]</b> · <b>[확장 2]</b> … / '
        '<b>[역할 미지정]</b> ② <b>🌐 {첫 언어} 외 {n}</b> (언어가 없으면 <b>🌐 지정된 언어 없음</b>). '
        '그룹의 코드 종류가 할당 코드와 달라도 칩을 보인다 <code>PC-348</code>. (코드 PDS2 · S3 · O 964 부터 — Common-21 의 확장 Owner, 기본 O21 은 S12)',
        frame('SOB-01', 'SOBP 맵',
              content(kind='PDS2', secs=SEC_PDS2, sel_s=3, sel_o=964, ofrom='964', oph='0 ~ 4,095', omore='3,052',
                      bph='0 ~ 4,095', bmore='4,016',
                      own=((964, '공유', ['PDS2'], ('lang', C21, '확장 1', '베트남어 외 3')),
                           (965, '공유', ['PDS2'], ('lang', C21, '확장 2', '스리랑카어 외 1'))) +
                          tuple((o, '공유', [], ('lang', C21, '확장 %d' % (o - 963), '지정된 언어 없음')) for o in range(966, 974)),
                      books=tuple((b, '사용가능', None, None, '') for b in range(4)), pg=dict(pmax=4096)),
              height=1120),
        [('그룹 고객사명', '표시', '—', '보유 고객사 대신 <b>그룹 고객사</b> — 옛 방식으로 슬롯 고객사에 따로 할당된 Owner 도 그룹 고객사로 보인다(할당 기록은 툴팁)'),
         ('[기본]', 'hover', '툴팁', '<b>기본 Owner · 슬롯 1~4</b>'),
         ('[확장 {k}]', 'hover', '툴팁', '<b>확장 언어 {k} · 슬롯 {a}~{b}</b> — 확장 순서대로 1 · 2 … <code>PC-348</code>'),
         ('[역할 미지정]', 'hover', '툴팁', '<b>고객사 관리 ▸ 공통코드 · 확장 언어 에서 역할을 고르세요</b> — 코드 할당 창에서 할당한 Owner 는 이 상태로 들어온다 <code>PC-335</code>'),
         ('🌐 언어 줄', 'hover', '툴팁', '<b>🌐 {첫 언어} 외 {n}</b> · 툴팁에 언어 전체 · 언어가 없으면 <b>🌐 지정된 언어 없음</b>'),
         ('역할 · 언어 변경', '이동', '<code>MEM-02</code>', '이 화면에서는 보기만 한다 — 역할 · 언어는 고객사 관리 ▸ 공통코드 · 확장 언어 에서')]))

    B.append((
        'S21', 'OID book 미분할 안내', '분기',
        '<code>PC-036</code> — 분량이 적어 <b>book 으로 나누지 않은</b> OID 업체(예: 한솔교육 S3/O25)를 고르면 '
        'BOOK 열 맨 위에 <b>book 미분할 · {n}건</b> 안내 상자와 항목 목록이 붙는다(최대 12건). (코드 OID · S3 · O 25 부터)',
        frame('SOB-01', 'SOBP 맵',
              content(kind='OID', secs=SEC_OID, sel_s=3, sel_o=25, ofrom='25', oph='0 ~ 4,095', omore='3,991',
                      bph='0 ~ 8,191', bmore='8,112',
                      own=((25, '코드발급', ['OID'], '한솔교육-25'), (26, U, [], ''), (27, U, [], ''), (28, U, [], '')),
                      nobook=['Ready Readers Book', '신기한 영어나라'],
                      books=((0, '사용가능', 'OID', None, '한솔교육-25'),) + BOOK_EMPTY(3, 1), pg=dict(pmax=4096)),
              height=1060),
        [('안내 상자', '표시', '—', '<b>book 미분할 · {n}건</b> · <b>분량이 적어 book 으로 나누지 않은 OID 입니다. 업체(S/O) 단위로 관리합니다.</b> · 항목 <b>· {교재명}</b>'),
         ('12건 초과', '표시', '—', '<b>… 외 {n}건</b> 줄이 붙는다(옛 OID 관리대장 탭 안내는 폐지에 맞춰 뺐다 <code>PC-325</code>)'),
         ('Book 카드', '표시', '—', '안내 상자 아래에 일반 Book 목록이 이어진다')]))

    intro = ('<b>Section → Owner → Book → Page</b> 드릴다운 코드 지도. 조회 전용이며 저장 동작이 없다. '
             '상태는 <b>실제 화면에서 갈라지는 것</b>만 담았고, 그림의 값은 로컬 앱 시드 데이터 화면에서 옮겼다(2026-11-23). '
             'OWNER · BOOK · Page 목록은 칸 안에서 스크롤된다(앞부분만 그렸다).<br>'
             '<b>[＋ 직접 코드 할당]</b> 은 이 화면 위에 모달로 열리지만 화면코드가 달라 <code>SOB-02</code> 로 분리했다.')
    return page(CODE, NAME, PRD, intro, B)
