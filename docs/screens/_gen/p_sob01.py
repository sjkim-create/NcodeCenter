# -*- coding: utf-8 -*-
"""SOB-01 SOBP 맵 — web/components/OwnershipMap.tsx JSX state 분기 그대로

state 목록 (컴포넌트 선언 순서)
  pds      "N" | "G"                       코드 종류 칩
  fStat    전체|코드 발급|코드 미발급|편집|공유|사용가능
  fAcct    고객사 입력(datalist)            정확 입력 시 좌표 이동
  selS/selO/selB                           드릴다운 선택
  oFrom/bFrom                              번호 점프 (입력 시 ✕)
  oLimit/bLimit  PAGE_O=PAGE_B=80          [＋ 더 보기]
  tip      {x,y,html} | null               막대 hover 툴팁
  alloc    {...} | null                    ← 직접 코드 할당 모달 = SOB-02
  q        (UI 없음 · clearFilters에서만 사용)
"""
from shell import page, frame

CODE, NAME = 'SOB-01', 'SOBP 맵'
PRD = 'docs/prd/SOB-01_SOBP 맵.md'

ST_C = {'편집': '#5f8ff0', '코드발급': '#14b8a6', '사용가능': '#f59e0b',
        '공유': '#a855f7', '미사용': '#eef1f6'}
F_CHIPS = (('전체', '전체'), ('코드 발급', '발급 전체'), ('코드 미발급', '코드 미발급'),
           ('편집', '편집'), ('공유', '공유'), ('사용가능', '사용가능'))
SOBP_C = {'S': '#5f8ff0', 'O': '#14b8a6', 'B': '#8b5cf6', 'P': '#f59e0b'}

# SCALE — PDS별 Section 정원 (o / b / p)
SCALE = {
    'N': {0: (1024, 16384, 4096), 3: (1024, 8192, 512), 5: (256, 4096, 4096),
          10: (1024, 4096, 1024), 11: (1024, 8192, 512), 14: (1024, 8192, 32),
          15: (32768, 4096, 512)},
    'G': {0: (524288, 8192, 1024), 3: (4096, 4096, 4096), 14: (4096, 4096, 1024)},
    # PDS4 = S-code (Section 44) · OID = 인덱스 전용(같은 S/O 공유, B/P로 구분)
    'PDS4': {44: (1024, 256, 256)},
    'OID': {3: (4096, 8192, 4096), 4: (1024, 4096, 512)},
}
SCALE['PDS3'] = SCALE['N']
SCALE['전체'] = {s2: max((m[s2] for m in (SCALE['N'], SCALE['G'], SCALE['PDS4'], SCALE['OID'])
                          if s2 in m), key=lambda d: d[0])
                 for s2 in sorted({s3 for m in (SCALE['N'], SCALE['G'], SCALE['PDS4'], SCALE['OID'])
                                   for s3 in m})}
SCALE['PDS2'] = SCALE['G']
# RECOMMEND_EXCLUDE — N은 없음, G는 0·14
EXCLUDE = {'N': [], 'G': [0, 14], 'PDS3': [], 'PDS2': [0, 14], 'PDS4': [], 'OID': [], '전체': []}
# 실제 화면(ncodecenter.vercel.app/ownership) 사용 owner 수
USED_N = {0: 43, 3: 196, 5: 163, 10: 15, 11: 1, 14: 10, 15: 0}
USED_G = {0: 27, 3: 184, 14: 9}
USED_PDS4 = {44: 21}          # Section 44 원장 21 owner
USED_OID = {3: 8, 4: 1}       # OID 좌표 (웅진·Common·한솔 등 8업체 · 옛 IDS 네오노트 S4/O27)
USED_ALL = {0: 48, 3: 213, 4: 1, 5: 163, 10: 15, 11: 1, 14: 10, 15: 0, 44: 21}   # 전체 보기
# 언어 슬롯 — LANG_PDS="G", LANG_SECTION=3
LANG_PDS, LANG_SECTION = 'G', 3


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


# 코드 종류(좌표 속성) — lib/codeKind.ts 와 같은 값·색
# 코드 종류 4종 — OID 는 옛 IDS(A코드) 표기와 같은 것으로 함께 본다 (PC-035)
KINDS = (('PDS3', '#2563eb', '현행 N코드'), ('PDS2', '#d97706', '이전 세대 G코드'),
         ('PDS4', '#7c3aed', 'S-code · Section 44'),
         ('OID', '#0f766e', 'index 전용 · 외부 코드 판독용 (옛 IDS 포함)'))
KIND_C = {k: c for k, c, _ in KINDS}


def pds_chip(k='PDS3'):
    k = {'N': 'PDS3', 'G': 'PDS2'}.get(k, k)
    return ('<span style="display:inline-flex;align-items:center;border-radius:6px;'
            'padding:1px 5px;font-size:9.5px;font-weight:700;color:#fff;background:%s;'
            'white-space:nowrap" title="%s">%s</span>'
            % (KIND_C.get(k, '#2563eb'), k, k))


def pen_chip(pen='소리펜'):
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
    """stColor + stLabel"""
    if st == '미사용':
        return ('<span style="font-size:9px;white-space:nowrap;background:#f3f4f6;color:#9ca3af;'
                'border-radius:5px;padding:2px 7px">코드 미발급</span>')
    return ('<span style="font-size:9px;white-space:nowrap;background:%s;color:#fff;'
            'font-weight:700;border-radius:5px;padding:2px 7px">%s</span>' % (ST_C[st], st))


def blocked_badge():
    return ('<span style="font-size:9px;white-space:nowrap;background:#d1d5db;color:#4b5563;'
            'font-weight:700;border-radius:5px;padding:2px 7px">🚫 영역 할당됨</span>')


def colcard(title, inner, pad_b='6px'):
    return ('<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:8px">'
            '<div style="font-size:11px;color:#9ca3af;font-weight:700;padding:2px 4px %s">%s</div>'
            '%s</div>' % (pad_b, title, inner))


def cardbtn(inner, on, disabled=False):
    extra = 'background:#eceef1;opacity:.65;' if disabled else (
        'background:%s;' % ('#f5f9ff' if on else '#fff'))
    return ('<div style="display:block;width:100%%;text-align:left;border:1px solid %s;'
            '%sborder-radius:9px;padding:7px 9px;margin:2px 0">%s</div>'
            % ('#93c5fd' if on else '#eef0f4', extra, inner))


def from_input(label, mx, value=''):
    if value:
        inner = ('<span style="font-family:ui-monospace,monospace;color:#111827">%s</span>'
                 '<span style="position:absolute;right:4px;top:3px;color:#9ca3af;font-size:12px">'
                 '✕</span>' % value)
    else:
        inner = ('<span style="font-family:ui-monospace,monospace;color:#9ca3af">0 ~ %s</span>'
                 % mx)
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


# ── 툴바 · 할당 진입 ─────────────────────────────────────────────
def toolbar(pds='전체', fstat='전체', acct=''):
    pds = {'N': 'PDS3', 'G': 'PDS2', 'ALL': '전체'}.get(pds, pds)
    # 코드 필터 — 전체 + 4종 (PC-039)
    pchips = ''.join(chip(k, (k == pds)) for k in ('전체',) + tuple(k for k, _, _ in KINDS))
    grp = ('<div style="display:flex;align-items:center;gap:6px;padding:3px 8px 3px 6px;'
           'background:#f7f8fa;border-radius:9px">'
           '<span style="font-size:11px;color:#6b7280;font-weight:700">%s</span>'
           '<div style="display:flex;gap:4px">%s</div></div>')
    fchips = ''.join(chip(lab, v == fstat) for v, lab in F_CHIPS)
    legend = ''.join(lg(ST_C[k], '코드 미발급' if k == '미사용' else k)
                     for k in ('코드발급', '편집', '사용가능', '공유', '미사용'))
    av = (acct if acct else '<span style="color:#9ca3af">고객사 전체 · 직접 입력</span>')
    return ('<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;'
            'padding:10px 12px;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:12px;'
            'font-size:12.5px;background:#fff">'
            '<b style="font-size:13px">SOBP 맵</b>'
            '%s%s'
            '<div style="width:180px;margin-left:auto;padding:8px 10px;border:1px solid #e5e7eb;'
            'border-radius:8px;font-size:13px;background:#fff" '
            'title="비우면 전체, 입력하면 해당 고객사만">%s</div>'
            '<span style="display:inline-flex;gap:10px;font-size:12px;width:100%%;padding-top:2px;'
            'border-top:1px dashed #eef0f4;margin-top:2px">%s</span>'
            '</div>' % (grp % ('코드', pchips), grp % ('상태', fchips), av, legend))


def alloc_row(s=0, o=10):
    return ('<div style="display:flex;gap:12px;align-items:center;margin-bottom:12px;'
            'flex-wrap:wrap">'
            '<span style="background:#5f8ff0;color:#fff;border-radius:9px;padding:9px 18px;'
            'font-size:13px;font-weight:700;display:inline-flex;align-items:center;gap:7px">'
            '<span style="font-size:15px;line-height:1">＋</span> 직접 코드 할당</span>'
            '<span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;'
            'color:#6b7280">발급 대상 %s%s</span>'
            '<span style="font-size:11.5px;color:#9ca3af">'
            '위에서 고른 Section·Owner에 코드를 발급합니다.</span></div>' % (sc('S', s), sc('O', o)))


# ── SECTION ─────────────────────────────────────────────────────
def sec_col(pds='N', sel=0):
    used = {'N': USED_N, 'PDS3': USED_N, 'G': USED_G, 'PDS2': USED_G,
            'PDS4': USED_PDS4, 'OID': USED_OID, '전체': USED_ALL}.get(pds, USED_N)
    rows = ''
    for s in sorted(SCALE[pds]):
        o_cap = SCALE[pds][s][0]
        tag = ''
        if s in EXCLUDE[pds]:
            tag = ('<span style="font-size:8.5px;margin-left:4px;background:#f3f4f6;color:#9ca3af;'
                   'border-radius:5px;padding:2px 7px" '
                   'title="테스트/개발 전용 · 자동 추천 제외(직접 선택은 가능)">추천제외</span>')
        rows += cardbtn('%s%s<div style="font-size:10px;color:#9ca3af;margin-top:2px">'
                        '사용 owner %d / %s</div>'
                        % (sc('S', s), tag, used.get(s, 0), '{:,}'.format(o_cap)), s == sel)
    return colcard('SECTION', rows)


# ── OWNER ───────────────────────────────────────────────────────
# (owner, 상태, accts, 배지종류)  배지종류: None | 'shared' | 'blocked'
OWN_S0 = ((0, '미사용', '', None), (1, '코드발급', 'neoa-1', None),
          (2, '코드발급', 'neotest-2', None), (3, '코드발급', 'neo1024-3', None),
          (4, '미사용', '', None), (5, '미사용', '', None), (6, '미사용', '', None),
          (7, '미사용', '', None), (8, '코드발급', 'Reserved For R&D-8', None),
          (9, '코드발급', 'Reserved For R&D-9', None),
          (10, '편집', '교원구몬-10, 교원구몬', None))


def own_col(rows=None, sel=10, mx='1,023', ofrom='', empty=None, flabel=None, more='1,013'):
    """empty: None | 'filter' | 'none'"""
    if empty == 'filter':
        inner = from_input('O', mx, ofrom) + (
            '<div style="font-size:11.5px;color:#9ca3af;padding:12px 8px;text-align:center;'
            'line-height:1.7">S5 에는 <b style="color:#b45309">%s</b> 에<br>'
            '해당하는 Owner가 없습니다.'
            '<div style="display:block;width:100%%;margin:8px 0 2px;padding:7px 0;font-size:11.5px;'
            'border:1px solid #cbd5e1;border-radius:8px;background:#fafbfc;color:#2563eb">'
            '필터 해제</div></div>' % flabel)
        return colcard('OWNER', inner, '4px')
    if empty == 'none':
        inner = from_input('O', mx, ofrom) + (
            '<div style="font-size:11.5px;color:#9ca3af;padding:12px 8px;text-align:center;'
            'line-height:1.7">결과 없음</div>')
        return colcard('OWNER', inner, '4px')

    rows = OWN_S0 if rows is None else rows
    out = ''
    for o, st, accts, kind in rows:
        if kind == 'shared':
            badge = ('<span style="font-size:9px;font-weight:700;white-space:nowrap;background:%s;'
                     'color:#fff;border-radius:5px;padding:2px 7px" '
                     'title="여러 고객사가 함께 쓰도록 지정된 OWNER">공유</span>' % ST_C['공유'])
        elif kind == 'blocked':
            badge = blocked_badge()
        else:
            badge = st_badge(st)
        sub = ''
        if accts:
            sub = ('<div style="font-size:10px;color:#6b7280;margin-top:2px;overflow:hidden;'
                   'text-overflow:ellipsis;white-space:nowrap">%s</div>' % accts)
        lang = ''
        if kind == 'lang':
            badge = st_badge(st)
            lang = ('<div style="font-size:9.5px;color:#7e22ce;margin-top:2px;line-height:1.4" '
                    'title="언어 슬롯 (db에서 직접 관리)">🌐 Common 확장 · 베트남어</div>')
        out += cardbtn('<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;'
                       'row-gap:3px">%s%s</div>%s%s' % (sc('O', o), badge, sub, lang), o == sel)
    tail = more_btn(more) if more else ''
    return colcard('OWNER', from_input('O', mx, ofrom) + out + tail, '4px')


# ── BOOK ────────────────────────────────────────────────────────
BOOK_O10 = tuple((b, '사용가능', '교원구몬', False) for b in range(9))


def book_col(rows=None, sel=0, mx='16,383', bfrom='', empty=False, more='16,303',
             shared=False, other_pds='PDS2'):
    if empty:
        inner = from_input('B', mx, bfrom) + (
            '<div style="font-size:11.5px;color:#9ca3af;padding:10px;text-align:center">'
            '결과 없음</div>')
        return colcard('BOOK', inner, '4px')
    rows = BOOK_O10 if rows is None else rows
    out = ''
    for b, st, label, blocked in rows:
        if blocked:
            badge = blocked_badge()
            sub = ('<div style="font-size:10px;color:#9ca3af;margin-top:2px">'
                   '%s 발급 · 선택 불가</div>' % other_pds)
        else:
            badge = st_badge(st)
            sub = ''
            if label:
                sub = ('<div style="font-size:10px;color:%s;font-weight:%s;margin-top:2px;'
                       'overflow:hidden;text-overflow:ellipsis;white-space:nowrap">%s</div>'
                       % ('#7e22ce' if shared else '#6b7280', '700' if shared else '400', label))
        out += cardbtn('<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;'
                       'row-gap:3px">%s%s</div>%s' % (sc('B', b), badge, sub),
                       b == sel, blocked)
    tail = more_btn(more) if more else ''
    return colcard('BOOK', from_input('B', mx, bfrom) + out + tail, '4px')


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


def page_col(in_use=True, shared=False, edited=False, sec=0, own=10, book=0,
             pmax=4096, total=1636, cust='교원구몬', proj='교원구몬 코드발급',
             pds='N', tip=False):
    REC = min(1000, pmax)
    remain = max(0, pmax - total)
    pv = lambda v: round(v * 1000.0 / pmax) / 10.0
    over = total > REC
    rec_pct = min(100.0, REC * 100.0 / pmax)
    use_pct = min(total, REC) * 100.0 / pmax
    hatch_w = min(100.0 - rec_pct, (total - REC) * 100.0 / pmax) if over else 0
    fill_c = '#88D7FF'
    vs_rec = int(round(total * 100.0 / REC)) if REC else 0

    head = ('<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'
            '<span style="font-size:13px;font-weight:700">Page 용량</span>'
            '<span style="display:inline-flex;align-items:center;gap:3px">%s%s%s%s</span></div>'
            % (pds_chip(pds), sc('S', sec), sc('O', own), sc('B', book)))

    if in_use:
        if edited:
            tag = ('<span style="background:#eef6ff;color:#2563eb;border-radius:5px;'
                   'padding:2px 7px;font-size:11px">편집</span>'
                   '<span style="margin-left:6px;background:#ecfdf5;color:#047857;'
                   'border:1px solid #a7f3d0;border-radius:5px;padding:2px 7px;font-size:11px">'
                   '✏️ 편집으로 이동 →</span>')
        else:
            tag = ('<span style="background:#ccfbf1;color:#0f766e;border-radius:5px;'
                   'padding:2px 7px;font-size:11px">사용가능</span>')
        box = ('<div style="margin-top:8px;margin-bottom:12px;border-radius:12px;'
               'padding:14px 16px;border:1px solid #bfdbfe;background:#f5f9ff">'
               '<div style="font-size:11px;color:%s">%s</div>'
               '<div style="font-size:22px;font-weight:800;color:%s;margin-top:2px">%s</div>'
               '<div style="font-size:12.5px;color:#374151;margin-top:4px">%s</div></div>'
               % ('#7e22ce' if shared else '#6b7280', '공유 고객사' if shared else '고객사',
                  '#7e22ce' if shared else '#1d4ed8',
                  cust if cust else '사용 고객사 없음', tag))
    else:
        box = ('<div style="margin-top:8px;margin-bottom:12px;border-radius:12px;'
               'padding:14px 16px;border:1px solid #e5e7eb;background:#fafbfc">'
               '<div style="font-size:15px;font-weight:700;color:#9ca3af">'
               '미사용 (발급 가능) — 이 S/O/B에는 사용 중인 프로젝트가 없습니다.</div></div>')

    stats = (stat('전체 사용 가능', '{:,}'.format(pmax), 100, '#111827')
             + stat('권장 사용량 (기준 1,000p)', '{:,}'.format(REC), pv(REC), '#b45309')
             + stat('실 사용 Page', '{:,}'.format(total), pv(total), '#2563eb',
                    ('권장 대비 %d%%' % vs_rec) if in_use else None)
             + stat('잔여 (발급 가능)', '{:,}'.format(remain), pv(remain), '#166534'))

    bars = (bar('전체 사용 가능', '{:,}p · 100%'.format(pmax), 100, '#eef1f6', '#374151')
            + bar('권장 사용량 (기준 1,000p)', '{:,}p · {}%'.format(REC, pv(REC)),
                  rec_pct, '#fbe3ca', '#92400e'))
    hatch = ''
    if over:
        hatch = ('<div style="position:absolute;left:%.1f%%;top:0;bottom:0;width:%.1f%%;'
                 'background:repeating-linear-gradient(45deg,#fca5a5 0 7px,#fee2e2 7px 14px)">'
                 '</div>' % (rec_pct, hatch_w))
    over_txt = (' ⚠ 초과 +{:,}p'.format(total - REC)) if over else ''
    sub_line = ''
    if in_use:
        sub_line = ('<div style="font-size:11px;color:#334155;margin-top:2px;white-space:nowrap;'
                    'overflow:hidden;text-overflow:ellipsis">%s · %s · S%d/O%d</div>'
                    % (cust, proj, sec, own))
    bars += ('<div style="position:relative;height:50px;background:#f7f8fa;'
             'border:1px solid #e5e7eb;border-radius:6px;margin-top:6px;overflow:hidden">'
             '<div style="position:absolute;left:0;top:0;bottom:0;width:%.1f%%;background:%s">'
             '</div>%s'
             '<div style="position:absolute;left:12px;top:0;bottom:0;display:flex;'
             'flex-direction:column;justify-content:center;z-index:3;'
             'text-shadow:0 1px 2px rgba(255,255,255,.9)">'
             '<div style="font-size:12.5px;font-weight:800;color:#0f172a;white-space:nowrap">'
             '실 사용 %s · %s%%<span style="font-weight:600;color:%s;margin-left:8px">'
             '권장 대비 %d%%%s</span></div>%s</div></div>'
             % (use_pct, fill_c, hatch, '{:,}p'.format(total), pv(total),
                '#b91c1c' if over else '#334155', vs_rec, over_txt, sub_line))

    # 막대 hover 툴팁 — 실제로는 하나씩만 뜨지만, 정의서에서는 4종을 한 번에 보여준다.
    # 막대 컨테이너가 overflow:hidden 이라 바깥 래퍼에 얹는다.
    if tip:
        def tbox(top, left, html):
            return ('<div style="position:absolute;top:%dpx;left:%d%%;background:#111827;'
                    'color:#fff;font-size:11.5px;padding:7px 10px;border-radius:7px;z-index:9;'
                    'line-height:1.5;white-space:nowrap;box-shadow:0 6px 18px rgba(0,0,0,.28)">'
                    '%s</div>' % (top, left, html))
        rec_left = max(0, REC - total)
        tips = (tbox(14, 26, '전체 {:,}p (100%)<br>잔여(발급 가능) {:,}p ({}%)'
                     .format(pmax, remain, pv(remain)))
                + tbox(70, 14, '권장 {:,}p ({}%)<br>권장 내 미사용 {:,}p'
                       .format(REC, pv(REC), rec_left))
                + tbox(126, 4, '실 사용 {:,}p ({}%)<br>권장 대비 {}%<br><b>{}</b><br>교재: {}'
                       .format(total, pv(total), vs_rec, cust, proj)))
        if over:
            tips += tbox(126, 46, '권장 초과 +{:,}p ({}%)<br>실사용 {:,}p / 권장 {:,}p'
                         .format(total - REC, pv(total - REC), total, REC))
        bars = ('<div style="position:relative">%s%s'
                '<div style="font-size:10.5px;color:#9ca3af;margin-top:8px">'
                '※ 실제 화면에서는 마우스를 올린 막대의 툴팁 <b>하나만</b> 뜬다 — '
                '정의서라 4종을 함께 표시</div></div>' % (bars, tips))

    legend = ''.join(lg(c, tx) for c, tx in (
        ('#ef4444' if over else fill_c, '실사용 {:,}p ({}%)'.format(total, pv(total))),
        ('#fbe3ca', '권장 {:,}p ({}%)'.format(REC, pv(REC))),
        ('#eef1f6', '전체 {:,}p (100%)'.format(pmax))))
    warn = ('<span style="color:#b91c1c;font-weight:700">⚠ 권장 초과</span>' if over else '')
    used_range = ''
    if in_use:
        used_range = ('<div style="font-size:10.5px;color:#9ca3af;margin-top:6px">'
                      '사용 구간 P1~P{:,}</div>'.format(total))
    return ('<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;'
            'padding:16px">%s%s'
            '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;'
            'margin-bottom:14px">%s</div>'
            '<div style="font-size:11.5px;color:#6b7280;margin-bottom:6px">'
            '용량 맵 · 막대 길이 = 페이지 비율 (전체 기준 100%%)</div>'
            '<div style="position:relative">'
            '<div style="position:absolute;left:%.1f%%;top:0;bottom:18px;width:0;'
            'border-left:2px dashed #f0b429;z-index:2"></div>%s'
            '<div style="position:relative;height:16px;font-size:10px;color:#b45309;'
            'margin-top:2px"><span style="position:absolute;left:calc(%.1f%% + 4px);'
            'white-space:nowrap">▲ 권장 %s</span></div></div>'
            '<div style="display:flex;gap:14px;font-size:10.5px;color:#6b7280;'
            'margin-top:8px">%s%s</div>%s</div>'
            % (head, box, stats, rec_pct, bars, rec_pct, '{:,}p'.format(REC),
               legend, warn, used_range))


# ── 조립 ────────────────────────────────────────────────────────
def content(pds='N', fstat='전체', acct='', sel_s=0, sel_o=10, sel_b=0,
            own_rows=None, own_empty=None, flabel=None, own_from='', own_more='1,013',
            book_rows=None, book_empty=False, book_from='', book_more='16,303',
            book_shared=False, page_kw=None):
    pk = dict(sec=sel_s, own=sel_o, book=sel_b, pds=pds)
    pk.update(page_kw or {})
    o_cap = SCALE[pds][sel_s][0] if sel_s in SCALE[pds] else 1024
    b_cap = SCALE[pds][sel_s][1] if sel_s in SCALE[pds] else 16384
    return ('<div style="margin:-2px">%s%s'
            '<div style="display:grid;grid-template-columns:150px 150px 150px 1fr;gap:10px;'
            'align-items:start">%s%s%s%s</div></div>'
            % (toolbar(pds, fstat, acct), alloc_row(sel_s, sel_o),
               sec_col(pds, sel_s),
               own_col(own_rows, sel_o, '{:,}'.format(o_cap - 1), own_from,
                       own_empty, flabel, own_more),
               book_col(book_rows, sel_b, '{:,}'.format(b_cap - 1), book_from,
                        book_empty, book_more, book_shared),
               page_col(**pk)))


NAV = [('발급된 코드의 고객사 확인', '이동', '<code>MEM-01</code>', '업체 상세'),
       ('발급 코드의 프로젝트 확인', '이동', '<code>PRJ-01</code>', '고객사별 코드 프로젝트'),
       ('편집 상태 코드의 편집 내역', '이동', '<code>PRJ-02</code> → <code>PRJ-03</code>', '')]


def build():
    B = []

    B.append((
        'S1', '기본 — 코드 전체 · 상태 전체', '기본',
        '<b>좌표(SOBP)가 먼저</b>다 <code>PC-032</code>. Section·Owner·Book·Page 로 코드를 짚고, '
        '그 좌표가 <b>PDS3 · PDS2 · PDS4(S-code, Section 44) · OID</b> 중 무엇인지를 '
        '<b>종류 칩</b>으로 가른다. 좌표는 유일하므로 중복은 성립하지 않는다. '
        '<b>옛 IDS(A코드) 표기는 OID 와 같은 것</b>으로 함께 본다 <code>PC-035</code>.<br>'
        '상단은 <b>「코드」 필터(전체 · PDS2 · PDS3 · PDS4 · OID)</b> 와 '
        '<b>「상태」 필터</b> 두 묶음이고, 오른쪽에 고객사 검색이 붙는다 <code>PC-039</code>. '
        '처음 연 상태 = 코드 <b>전체</b> · 상태 <b>전체</b> · 고객사 비움이며, '
        '전체 보기의 Section 정원은 그 섹션을 쓰는 <b>종류들의 최대치</b>다.',
        frame('SOB-01', 'SOBP 맵', content(pds='전체'), height=1180),
        [('코드 필터', '클릭', 'S2 (PDS2) · S18 (PDS4) · S19 (OID)',
          '<b>전체 / PDS2 / PDS3 / PDS4 / OID</b> 5칸. 고르면 Section 목록이 다시 그려지고 '
          '<b>그 종류의 첫 좌표(S→O→B)로 이동</b>하며 번호 점프·더 보기·상태 필터는 초기화된다 '
          '<code>PC-038</code>'),
         ('OWNER · BOOK 종류 배지', '표시', '—',
          '그 좌표가 어떤 종류로 쓰이는지 <b>용도 표시</b>. 한 owner 가 Book 을 나눠 '
          '<b>PDS2·PDS3 를 함께</b> 쓸 수 있다 <code>PC-039</code>'),
         ('카드 칩 순서', '표시', '통일',
          'OWNER·BOOK 모두 <b>[번호] → [상태] → [종류] → (펜)</b> 순서다 <code>PC-040</code>'),
         ('상태 필터 칩', '클릭', 'S3~S7', '전체 / 발급 전체 / 코드 미발급 / 편집 / 공유 / 사용가능 <b>6종</b>'),
         ('고객사 입력', '입력·선택', 'S8', '목록에서 고르거나 정확히 입력하면 코드 종류·S·O·B 가 한꺼번에 이동'),
         ('SECTION 항목', '클릭', 'Owner·Book 초기화', '<b>사용 owner {n} / {정원}</b>'),
         ('OWNER 항목', '클릭', 'Book 갱신', 'Book 선택이 풀린다'),
         ('BOOK 항목', '클릭', 'Page 용량 갱신', ''),
         ('O · B 번호 입력', '입력', 'S9', '그 번호부터 노출 · ✕로 초기화'),
         ('[＋ 더 보기]', '클릭', '80개씩 추가', '한 번에 <b>80개</b>씩 · 스크롤로도 이어 로드'),
         ('상위 선택 변경', '자동', '첫 항목으로 이동',
          '현재 선택이 목록에서 사라지면 <b>첫 항목</b>으로 되돌린다'),
         ('[＋ 직접 코드 할당]', '클릭', '<code>SOB-02</code> 모달',
          '같은 화면 위에 <b>모달</b>로 열린다'),
         ('Page 막대', '마우스 오버', 'S17 툴팁', '막대별 수치 안내')] + NAV))

    B.append((
        'S2', 'PDS2(Gcode)로 전환', '분기',
        '종류 칩을 <b>PDS2</b> 로 바꾸면 Section이 <b>0 · 3 · 14</b> 3개로 바뀌고, '
        '테스트/개발 전용인 <b>S0·S14</b> 에 <b>추천제외</b> 배지가 붙는다. '
        '⚠ <b>PDS3 에는 추천제외 Section 이 하나도 없다.</b> '
        '<b>PDS4</b> 는 Section <b>44</b>, <b>OID</b> 는 데이터가 있는 Section(3 · 4)만 나온다.',
        frame('SOB-01', 'SOBP 맵',
              content(pds='G', sel_s=0, sel_o=10, sel_b=0,
                      own_more='524,197', book_more='8,111',
                      page_kw=dict(pmax=1024, total=780, cust='구몬학습',
                                   proj='구몬학습 코드발급', edited=True)),
              height=1180),
        [('추천제외 배지', 'hover', '툴팁',
          '<b>테스트/개발 전용 · 자동 추천 제외(직접 선택은 가능)</b> — G의 S0·S14만'),
         ('Section 정원', '표시', '—', 'G S0은 owner 524,288 · S3 4,096 · S14 4,096'),
         ('페이지 정원', '표시', '—', 'G S0은 page 1,024 → 권장 1,000p가 97.7%'),
         ('전환 시', '자동', '선택 초기화', 'Owner·Book 선택 · 번호 점프 · 더 보기가 모두 처음으로')]))

    for sid, val, lab, note in (
        ('S3', '코드 발급', '발급 전체', '발급(할당)된 코드 전체 — 편집·공유·사용가능 포함'),
        ('S4', '코드 미발급', '코드 미발급', '아직 발급되지 않은 빈 코드'),
        ('S5', '편집', '편집', '발급된 코드 중 실제 편집에 쓰인 코드'),
        ('S6', '공유', '공유', '여러 고객사가 함께 쓰도록 지정된 OWNER'),
        ('S7', '사용가능', '사용가능',
         '공유 코드 중 아직 편집하지 않은 것'),
    ):
        if val == '코드 미발급':
            rows = tuple(r for r in OWN_S0 if r[1] == '미사용')
            sel = 0
            pk = dict(in_use=False, total=0)
        elif val == '편집':
            rows = ((10, '편집', '교원구몬-10, 교원구몬', None),)
            sel = 10
            pk = {}
        elif val in ('공유', '사용가능'):
            rows = ((21, '사용가능', 'NeoLAB', 'shared'), (964, '사용가능', 'NeoLAB', 'shared'))
            sel = 21
            pk = dict(shared=True, cust='아들과딸', proj='COMMON 공유', total=2588)
        else:
            rows = tuple(r for r in OWN_S0 if r[1] != '미사용')
            sel = 10
            pk = {}
        B.append((
            sid, '상태 필터 — %s' % lab, '필터',
            '칩 라벨은 <b>%s</b> 로 나온다. %s' % (lab, note),
            frame('SOB-01', 'SOBP 맵',
                  content(fstat=val, own_rows=rows, sel_o=sel, own_more=None,
                          page_kw=pk), height=1120),
            [('[%s] 칩' % lab, '클릭', '해당 Owner만', note),
             ('필터 유지', '자동', 'Section·PDS 변경 후에도 유지',
              '결과가 비면 S10 안내 + [필터 해제]'),
             ('[전체] 칩', '클릭', 'S1 복귀', '')]))

    B.append((
        'S8', '고객사 검색 → 좌표 이동', '분기',
        '<b>목록에서 고르거나 정확히 입력</b>하면 그 고객사의 첫 코드로 '
        '<b>코드 종류·S·O·B 가 한꺼번에 이동</b>하고 번호 점프가 풀린다. '
        '부분 입력이면 <b>필터로만</b> 동작한다.',
        frame('SOB-01', 'SOBP 맵',
              content(acct='교원구몬', own_rows=((10, '편집', '교원구몬-10, 교원구몬', None),),
                      own_more=None), height=1120),
        [('정확 입력 · 목록 선택', 'Enter/선택', '코드 종류·S·O·B 동시 이동', '그 고객사의 첫 코드 기준'),
         ('부분 입력', '입력', '필터로만 동작', '이동하지 않음'),
         ('비우기', '입력', '전체', '고객사 제한 해제'),
         ('검색 대상', '참고', '—', '보유 고객사 + <b>공유 코드의 실사용 고객사</b> 모두')]))

    B.append((
        'S9', 'O · B 번호 점프', '분기',
        '입력값을 <b>0 ~ 정원-1</b> 로 보정한 뒤 그 번호부터만 노출한다. '
        '값이 있으면 <b>✕</b>(초기화) 버튼이 나타나고, 누르면 목록이 처음으로 돌아간다.',
        frame('SOB-01', 'SOBP 맵',
              content(own_from='8', book_from='3',
                      own_rows=tuple(r for r in OWN_S0 if r[0] >= 8), sel_o=10,
                      book_rows=tuple(r for r in BOOK_O10 if r[0] >= 3), sel_b=3,
                      own_more='1,012', book_more='16,300',
                      page_kw=dict(book=3)), height=1120),
        [('O 입력', '숫자 입력', '그 번호부터 노출', '플레이스홀더 <code>0 ~ {정원-1}</code>'),
         ('B 입력', '숫자 입력', '그 번호부터 노출', ''),
         ('✕', '클릭', '초기화', '목록이 처음으로 돌아간다'),
         ('숫자 외 입력', '입력', '무시', '숫자만 받는다'),
         ('범위 초과', '입력', '정원-1로 보정', '')]))

    B.append((
        'S10', 'Owner 결과 없음 — 필터 때문', '빈 상태',
        '필터를 걸어서 Owner 가 하나도 남지 않은 경우. <b>어떤 필터 때문인지</b> 문장에 넣어 '
        '알려주고 <b>[필터 해제]</b> 한 번으로 모두 푼다. 안내에 들어가는 조건은 '
        '<b>상태 · 고객사 · 검색어 · O 번호 이후</b> 를 이어 붙인다.',
        frame('SOB-01', 'SOBP 맵',
              content(fstat='공유', sel_s=5, sel_o=0, own_empty='filter',
                      flabel='상태 공유', book_empty=True,
                      page_kw=dict(in_use=False, total=0, pmax=4096, sec=5, own=0)),
              height=1000),
        [('안내 문구', '표시', '—', '<b>S{n} 에는 {걸린 필터} 에 해당하는 Owner가 없습니다.</b>'),
         ('[필터 해제]', '클릭', 'S1 복귀',
          '상태·고객사·검색·번호 점프·더 보기를 <b>한 번에</b> 초기화'),
         ('안내가 뜨는 조건', '참고', '—',
          '상태 필터 · 고객사 · 검색어 · 번호 점프 중 <b>하나라도 걸려 있을 때</b>')]))

    B.append((
        'S11', 'Owner 결과 없음 · 필터 없음', '빈 상태',
        '필터가 하나도 없는데 목록이 빈 경우에는 안내 없이 <b>결과 없음</b> 만 표시한다. '
        'Book 목록이 비어도 마찬가지다.',
        frame('SOB-01', 'SOBP 맵',
              content(sel_s=15, sel_o=0, own_empty='none', book_empty=True,
                      page_kw=dict(in_use=False, total=0, pmax=512, sec=15, own=0)),
              height=1000),
        [('Owner 빈 목록', '표시', '—', '<b>결과 없음</b>'),
         ('Book 빈 목록', '표시', '—', '<b>결과 없음</b>'),
         ('Section 15', '참고', '—', 'owner 정원 32,768 · page 512 — 사용 owner 0')]))

    B.append((
        'S12', 'Owner 배지 — 공유 / 🚫 / 언어 슬롯', '변형',
        'Owner 배지는 <b>우선순위 3단</b> 이다 — ① 공유로 지정된 Owner 는 발급 여부와 무관하게 '
        '항상 <b>공유</b> ② 반대 코드 종류가 선점했고 아직 미발급이면 <b>🚫 영역 할당됨</b> '
        '③ 그 외에는 코드 상태 배지. 언어 슬롯 줄(🌐)은 <b>PDS2 의 S3</b> 에서만 붙는다.',
        frame('SOB-01', 'SOBP 맵',
              content(pds='G', sel_s=3, sel_o=21,
                      own_rows=((17, '편집', '웅진씽크빅', None),
                                (21, '사용가능', 'NeoLAB', 'shared'),
                                (26, '미사용', '', 'blocked'),
                                (964, '사용가능', 'NeoLAB', 'lang')),
                      own_more='4,075', book_more='4,087', book_shared=True,
                      book_rows=((0, '편집', '한국뉴베리', False),
                                 (1, '편집', '아들과딸', False),
                                 (2, '사용가능', '새알교육', False)),
                      sel_b=0,
                      page_kw=dict(shared=True, cust='한국뉴베리', proj='루하의명작',
                                   pmax=4096, total=1636, edited=True)),
              height=1180),
        [('공유 배지', 'hover', '툴팁', '<b>여러 고객사가 함께 쓰도록 지정된 OWNER</b> · 보라 #a855f7'),
         ('🚫 영역 할당됨', 'hover', '툴팁',
          '(폐지) 예전의 <b>🚫 영역 할당됨</b> 배지는 없앴다 — 종류는 배타가 아니라 '
          '<b>용도 표시</b>다 <code>PC-039</code>'),
         ('🌐 언어 슬롯', '표시', '—', '<b>db에서 직접 관리</b> · PDS2 S3 에서만'),
         ('공유 Owner의 Book 라벨', '표시', '—', '<b>보라 굵게</b> = 실사용 고객사'),
         ('일반 Owner의 Book 라벨', '표시', '—', '회색 = 프로젝트/교재명')]))

    B.append((
        'S13', 'Book 🚫 영역 할당됨 (비활성)', '변형',
        '반대 코드 종류가 이미 발급한 Book 은 <b>회색으로 눌리지 않는다</b>. '
        'Book 카드에는 <b>상태 배지 + 종류 배지(용도) + 펜 배지</b> 가 붙는다. '
        '예전의 <b>다른 종류 발급 · 선택 불가</b> 차단은 폐지했다 <code>PC-039</code>.',
        frame('SOB-01', 'SOBP 맵',
              content(sel_s=3, sel_o=26, sel_b=0,
                      own_rows=((26, '미사용', '', 'blocked'),),
                      own_more=None,
                      book_rows=((0, '미사용', '', True), (1, '미사용', '', True),
                                 (2, '미사용', '', True)),
                      book_more='8,189',
                      page_kw=dict(in_use=False, total=0, pmax=512, sec=3, own=26)),
              height=1060),
        [('🚫 Book', '클릭', '<b>동작 없음</b>', '선택 불가'),
         ('hover', '마우스 오버', '툴팁',
          '(폐지) 다른 종류가 쓰는 Book 도 <b>선택할 수 있다</b> — 좌표가 상위 개념이다'),
         ('배타 단위', '참고', '—',
          '배타는 <b>owner 단위</b> — 반대 코드 종류가 그 owner를 쓰면 book 전체가 막힌다')]))

    B.append((
        'S14', 'Page 용량 — 미사용(발급 가능)', '빈 상태',
        '선택한 S/O/B 에 쓰는 프로젝트가 없는 경우. 고객사 박스가 회색 안내로 바뀌고 '
        '<b>실 사용 0p</b> 가 되며 <b>사용 구간</b> 줄이 사라진다.',
        frame('SOB-01', 'SOBP 맵',
              content(sel_s=0, sel_o=4, sel_b=0,
                      own_rows=tuple(r for r in OWN_S0 if r[1] == '미사용'),
                      own_more=None,
                      book_rows=((b, '미사용', '', False) for b in range(4)),
                      book_more='16,379',
                      page_kw=dict(in_use=False, total=0, own=4)),
              height=1060),
        [('고객사 박스', '표시', '—',
          '<b>미사용 (발급 가능) — 이 S/O/B에는 사용 중인 프로젝트가 없습니다.</b>'),
         ('실 사용 Page', '표시', '—', '<b>0p · 0%</b> · 보조 문구 없음'),
         ('잔여 (발급 가능)', '표시', '—', '<b>4,096p · 100%</b>'),
         ('사용 구간', '—', '<b>표시 안 됨</b>', '사용 중일 때만 나온다')]))

    B.append((
        'S15', 'Page 용량 — 공유 고객사', '분기',
        '공유로 지정된 Owner 면 라벨이 <b>고객사 → 공유 고객사</b> 로 바뀌고 보라로 표시된다. '
        '실사용 고객사가 없으면 <b>사용 고객사 없음</b> 으로 표시된다.',
        frame('SOB-01', 'SOBP 맵',
              content(pds='G', sel_s=3, sel_o=21, sel_b=0,
                      own_rows=((21, '사용가능', 'NeoLAB', 'shared'),),
                      own_more=None, book_shared=True,
                      book_rows=((0, '편집', '한국뉴베리', False),),
                      own_from='', book_more=None,
                      page_kw=dict(shared=True, cust='', proj='루하의명작',
                                   pmax=4096, total=0, in_use=True)),
              height=1060),
        [('공유 고객사 라벨', '표시', '—', '보라 표기'),
         ('사용 고객사 없음', '표시', '—', '실사용 고객사가 없을 때'),
         ('편집 배지', '표시', '—',
          '편집이면 <b>편집</b> + <b>✏️ 편집으로 이동 →</b> · 아니면 <b>사용가능</b>'),
         ('[✏️ 편집으로 이동 →]', '클릭', '<code>PRJ-02</code>',
          '그 Owner 의 편집 프로젝트로 바로 이동')]))

    B.append((
        'S16', '[＋ 더 보기] · 스크롤 로드', '분기',
        '남은 항목이 있을 때만 버튼이 보이고, 누르면 <b>80개씩</b> 늘어난다. '
        '목록을 <b>끝까지 스크롤</b>해도 같은 양이 자동으로 이어 로드된다.',
        frame('SOB-01', 'SOBP 맵',
              content(own_more='943', book_more='16,303'), height=1180),
        [('[＋ 더 보기]', '클릭', '80개 추가', '<b>(남은 {n})</b> 표시'),
         ('스크롤 하단 도달', '스크롤', '80개 자동 추가', '목록 끝에 가까워지면'),
         ('버튼 노출 조건', '참고', '—', '아직 안 보여준 항목이 남아 있을 때만'),
         ('필터·번호 변경 시', '자동', '노출 개수 초기화', '다시 80개부터')]))

    B.append((
        'S17', 'Page 막대 툴팁', '분기',
        '마우스를 따라다니는 툴팁. '
        '전체·권장·실사용 막대마다 문구가 다르고, 실사용 막대는 <b>고객사·교재</b>까지 붙는다. '
        '권장 초과 구간(빗금)에는 <b>권장 초과 +{n}p</b> 전용 툴팁이 따로 있다.',
        frame('SOB-01', 'SOBP 맵', content(page_kw=dict(tip=True)), height=1180),
        [('전체 막대', 'hover', '툴팁', '<b>전체 {n}p (100%)</b> / <b>잔여(발급 가능) {n}p ({}%)</b>'),
         ('권장 막대', 'hover', '툴팁', '<b>권장 {n}p ({}%)</b> / <b>권장 내 미사용 {n}p</b>'),
         ('실사용 막대', 'hover', '툴팁',
          '<b>실 사용 {n}p ({}%)</b> / <b>권장 대비 {}%</b> / <b>{고객사}</b> / <b>교재: {교재명}</b>'),
         ('빗금 구간', 'hover', '툴팁',
          '<b>권장 초과 +{n}p ({}%)</b> / <b>실사용 {n}p / 권장 {n}p</b>'),
         ('마우스 이탈', '마우스 벗어남', '툴팁 닫힘', '')]))

    B.append((
        'S18', 'PDS4 (S-code) · Section 44', '분기',
        '<code>PC-032</code> — <b>Section 44 로 발급된 좌표는 PDS4(S-code)</b> 로 구분한다. '
        '종류 칩 <b>PDS4</b> 를 고르면 Section 은 <b>44</b> 하나만 남고, 원장에 있는 '
        '<b>21 owner</b>(ICsolutions-300 등)가 목록에 나온다.',
        frame('SOB-01', 'SOBP 맵',
              content(pds='PDS4', sel_s=44, sel_o=300, sel_b=0,
                      own_more='1,003', book_more='175',
                      page_kw=dict(pmax=256, total=120, cust='ICsolutions-300',
                                   proj='ICsolutions 코드발급')),
              height=1120),
        [('종류 칩 [PDS4]', '클릭', 'Section 44', '섹션 목록이 <b>44</b> 하나로 바뀐다'),
         ('Section 44', '표시', '—', '원장 기준 <b>사용 owner 21</b> · 정원 1,024'),
         ('좌표 범위', '표시', '—',
          'owner 0~4095 · book 0~255 · page 0~255 · xy 0~255 (Code Info 정식 범위 <code>PC-042</code>)'),
         ('이전 표기', '—', '정정', '과거 “테스트/개발 전용”으로만 적던 Section 44 를 '
          '<b>PDS4(S-code)</b> 로 분류한다')] + NAV))

    B.append((
        'S19', 'OID 좌표 보기', '분기',
        '<code>PC-035</code> — <b>OID</b> 는 index 만 갖는 코드(외부 코드를 우리 펜으로 판독)이고 '
        '<b>옛 IDS(A코드) 표기와 같은 것</b>이다. 종류 칩 <b>OID</b> 로 좌표를 걸러 본다. '
        'Section 은 데이터가 있는 <b>3 · 4</b> 만 나오고, OID 는 같은 S/O 를 다른 종류와 '
        '함께 쓸 수 있어(index 부여) <b>OID 로 잡은 Book 만</b> 발급으로 표시된다. '
        '업체별 index 목록은 <code>OID-01</code> 관리대장(Ncode 정보 탭)에서 본다.',
        frame('SOB-01', 'SOBP 맵',
              content(pds='OID', sel_s=3, sel_o=17, sel_b=431,
                      own_more='4,077', book_more='8,111',
                      page_kw=dict(pmax=4096, total=2, cust='웅진씽크빅-17',
                                   proj='범블비 잉글리시 전집 OID 1권', edited=True)),
              height=1180),
        [('종류 칩 [OID]', '클릭', 'OID 좌표만', 'Section 3 · 4(옛 IDS 포함)'),
         ('같은 S/O 공유', '표시', '—',
          '예: <b>S3/O17</b> 은 PDS2 코드와 OID 가 함께 있고 <b>Book 으로 구분</b>된다'),
         ('Book 목록', '표시', '—', 'OID 로 발급된 Book(예: 431~449)만 발급 상태'),
         ('book 미분할 업체', '표시', 'OWNER 까지',
          '분량이 적어 book 을 나누지 않은 업체(예: <b>한솔교육 S3/O25</b>)는 OWNER 로 나오고, '
          'BOOK 열 맨 위에 <b>『book 미분할 · {n}건』 안내 + 항목 목록</b>이 붙는다 <code>PC-036</code>'),
         ('IDS 표기', '—', '통합', '옛 <b>IDS(A코드)</b> 는 OID 와 <b>같은 것</b>으로 함께 나온다'),
         ('업체·index 목록', '조회', '<code>OID-01</code>',
          'Ncode 정보 ▸ OID 관리대장 탭 (book 미분할 업체 포함)')] + NAV))

    intro = ('<b>Section → Owner → Book → Page</b> 드릴다운 코드 지도. 조회 전용이며 저장 동작이 없다. '
             '상태는 <b>실제 화면에서 갈라지는 것</b>만 담았다.<br>'
             '<b>[＋ 직접 코드 할당]</b> 은 이 화면 위에 모달로 열리지만 화면코드가 달라 '
             '<code>SOB-02</code> 로 분리했다.')
    return page(CODE, NAME, PRD, intro, B)
