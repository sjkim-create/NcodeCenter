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


def billing_box(sel='유료', amount='1,200,000', note='2026 연간 계약 포함', last='2026-10-20 10:20 · 김순정',
                currency='KRW', fx='', trial='', bare=False, err=''):
    """정산 — 왼쪽 과금 유형(미정 · 유료 · 무료 · 체험) · 오른쪽 금액(원 · USD) / 체험 만료일 · 비고 3줄
    (web/components/BillingEditor.tsx — App Key · N Key · 서비스 티켓 공용) `PC-176` `PC-177` `PC-202`"""
    sub = {'미정': '미등록', '유료': '금액 입력', '무료': '청구 없음', '체험': '1개월'}
    btns = ''.join('<div style="padding:8px;border-radius:9px;text-align:center;font-size:12.5px;border:1px solid %s;background:%s;color:%s;font-weight:%s">'
                   '%s<div style="font-size:10px;font-weight:400;margin-top:2px">%s</div></div>'
                   % (BILL[b][1] if b == sel else '#e5e7eb', BILL[b][0] if b == sel else '#fff',
                      BILL[b][1] if b == sel else '#6b7280', '700' if b == sel else '400', b, sub[b]) for b in BILL)
    lab = '<div style="font-size:12px;color:#6b7280;margin-bottom:6px">%s</div>'
    if sel == '유료':
        segs = ''.join('<span style="padding:7px 12px;font-size:12.5px;%s">%s</span>'
                       % ('background:#eef6ff;color:#1d4ed8;font-weight:700' if c == currency else 'background:#fff;color:#6b7280', l)
                       for c, l in (('KRW', '원'), ('USD', 'USD')))
        right = (lab % '금액 *' + '<div style="display:flex;gap:6px"><div style="display:inline-flex;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">%s</div>'
                 '<div class="inp%s" style="flex:1;text-align:right">%s</div></div>' % (segs, ' err' if err == 'amt' else '', amount or '0'))
        if err == 'amt':
            right += '<div class="inline-err">유료는 금액을 입력해야 합니다.</div>'
        if currency == 'USD':
            right += ('<div style="margin-top:8px">' + lab % '환율 기록 <span style="color:#9ca3af">(선택 · 자동 아님)</span>' +
                      '<div style="display:flex;align-items:center;gap:6px;font-size:12.5px;color:#6b7280"><span>1 USD =</span>'
                      '<div class="inp%s" style="flex:1;text-align:right">%s</div><span>원</span></div>%s</div>'
                      % ('' if fx else ' ph', fx or '예) 1,385',
                         ('<div style="font-size:11.5px;color:#6b7280;margin-top:4px">≈ %s원 (기록한 환율 기준)</div>'
                          % '{:,}'.format(round(float(amount.replace(',', '')) * float(fx.replace(',', ''))))) if fx else ''))
    elif sel == '체험':
        right = '<div class="fld"><span class="lbl">체험 만료일 (기본 = 1개월 뒤)</span><div class="inp">%s</div></div>' % (trial or '2026-11-20')
    elif sel == '무료':
        right = '<div style="font-size:12.5px;color:#166534;padding-top:24px">청구하지 않는 티켓으로 기록됩니다.<br>사유는 아래 비고에 남겨 주세요.</div>'
    else:
        right = '<div style="font-size:12.5px;color:#9ca3af;padding-top:24px">과금 유형을 고르면 금액 · 기간을 입력합니다.</div>'
    body = ('<div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:start">'
            '<div>%s<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">%s</div></div><div>%s</div></div>'
            '<div class="fld" style="margin-top:12px"><span class="lbl">비고 (사유 · 계약 정보)</span>'
            '<div class="inp%s" style="min-height:72px;align-items:flex-start;line-height:1.6">%s</div></div>'
            '<div style="display:flex;align-items:center;gap:8px;margin-top:12px"><span style="font-size:11.5px;color:#9ca3af">최근 등록: %s</span>'
            '<span style="flex:1"></span><span class="btn pri">정산 저장</span></div>'
            % (lab % '과금 유형', btns, right, '' if note else ' ph', note or '예) 2026 연간 계약 포함 · 데모 제공', last))
    if bare:
        return body
    return ('<div style="margin-top:14px;border:1px solid #eef0f4;border-radius:10px;padding:12px 14px">'
            '<div style="font-size:13px;font-weight:700;margin-bottom:10px">정산 <span style="font-size:11.5px;font-weight:400;color:#9ca3af">'
            '· 고객사 · 티켓마다 다르게 등록할 수 있습니다</span></div>%s</div>' % body)


def license_box(kind='App Key', co='Study123', amount='1,200,000', saved=True, since='2026-10-22', until='2027-10-21', usd=False, fx=''):
    """연간 라이선스 비용 — 고객사마다 1건(App Key · N Key 따로) · 금액 · 기간 (web/components/BillingEditor.tsx LicenseEditor) `PC-212`"""
    state = tg(('$%s / 년' if usd else '%s원 / 년') % amount, '#dcfce7', '#166534') if saved else tg('미등록', '#fef2f2', '#dc2626')
    on, off = 'background:#eef6ff;color:#1d4ed8;font-weight:700', 'color:#6b7280'
    seg = ('<div style="display:inline-flex;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">'
           '<span style="padding:7px 12px;font-size:12.5px;%s">원</span>'
           '<span style="padding:7px 12px;font-size:12.5px;%s">USD</span></div>' % ((off, on) if usd else (on, off)))
    return ('<div style="margin-bottom:14px;border:1px solid #e9d5ff;background:#fcfaff;border-radius:10px;padding:12px 14px">'
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><b style="font-size:13px">연간 라이선스 비용</b>%s'
            '<span style="font-size:11.5px;color:#9ca3af">· 고객사 %s · 고객사마다 1건 · 티켓이 아니라 키 발급으로 생기는 비용</span><span style="flex:1"></span>%s</div>'
            '<div style="display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:12px;align-items:end">'
            '<div class="fld"><span class="lbl">연간 금액</span><div style="display:flex;gap:6px">%s<div class="inp" style="flex:1;text-align:right">%s</div></div></div>'
            '<div class="fld"><span class="lbl">기간 시작</span><div class="inp">%s</div></div>'
            '<div class="fld"><span class="lbl">기간 끝 (기본 1년)</span><div class="inp">%s</div></div></div>'
            '%s<div style="display:flex;justify-content:flex-end;margin-top:10px"><span class="btn pri">라이선스 저장</span></div></div>'
            % (tg(kind, '#f3e8ff', '#7e22ce'), co, state, seg, amount if saved else '0', since, until,
               # USD 면 환율 기록(선택 · 자동 아님) `PC-215`
               ('<div style="margin-top:10px;font-size:12px;color:#6b7280">환율 기록 <span style="color:#9ca3af">(선택 · 자동 아님)</span>'
                '<div style="display:flex;align-items:center;gap:6px;margin-top:6px;max-width:420px">1 USD = <div class="inp%s" style="flex:1;text-align:right">%s</div> 원%s</div></div>'
                % ('' if fx else ' ph', fx or '예) 1,385', (' <span style="font-size:11.5px">≈ %s원 / 년</span>' % '{:,}'.format(round(float(amount.replace(',', '')) * float(fx.replace(',', ''))))) if fx else '')) if usd else ''))


def license_slide(kind='App Key', co='Study123', open_=False, saved=False, amount='3,000,000', until='2027-10-22'):
    """연간 라이선스 — 오른쪽 칸 맨 위 작은 탭 + 누르면 발급 상세 위로 오른쪽 슬라이드 패널 `PC-270`
    (web/components/BillingEditor.tsx LicenseSlide) — 키를 발급받은 그 고객사(하위면 하위)에 붙는다"""
    st = tg('%s원 / 년 · ~%s' % (amount, until), '#f0fdf4', '#166534', bold=False) if saved else tg('미등록', '#fef2f2', '#dc2626', bold=False)
    pill = ('<span style="display:inline-flex;align-items:center;gap:6px;padding:5px 10px 5px 6px;font-size:12px;border-radius:9px;'
            'border:1px solid %s;background:%s;color:#374151"><span style="width:14px;text-align:center;font-weight:700">%s</span><b style="font-weight:800">연간 라이선스</b>%s</span>'   # 화살표 앞 · 패널 머리와 같은 바탕 · 패널과 같은 테두리 `PC-268`
            % ('#F7B008', '#fdeec4' if open_ else '#fff8e6', '›' if open_ else '‹', st))
    panel = ''
    if open_:
        on, off = 'background:#eef6ff;color:#1d4ed8;font-weight:700', 'color:#6b7280'
        panel = ('<div style="position:absolute;top:calc(100%% + 6px);right:0;z-index:5;width:min(420px,100%%);background:#fff;border:1px solid #F7B008;'
                 'border-radius:12px;box-shadow:0 18px 40px rgba(15,23,42,.18)">'
                 '<div style="display:flex;align-items:center;gap:8px;padding:11px 14px;border-bottom:1px solid #fde7b0;background:#fff8e6;border-radius:12px 12px 0 0">'
                 '<b style="font-size:13.5px">연간 라이선스</b>%s<span style="font-size:12px;color:#6b7280">%s</span><span style="flex:1"></span><span style="color:#9ca3af">✕</span></div>'
                 '<div style="padding:12px 14px 14px"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
                 '<div class="fld" style="grid-column:1/-1"><span class="lbl">연간 금액</span><div style="display:flex;gap:6px">'
                 '<div style="display:inline-flex;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden"><span style="padding:7px 12px;font-size:12.5px;%s">원</span>'
                 '<span style="padding:7px 12px;font-size:12.5px;%s">USD</span></div><div class="inp" style="flex:1;text-align:right">%s</div></div></div>'
                 '<div class="fld"><span class="lbl">기간 시작</span><div class="inp">2026-10-23</div></div>'
                 '<div class="fld"><span class="lbl">기간 끝 (기본 1년)</span><div class="inp">%s</div></div></div>'
                 '<div style="display:flex;justify-content:flex-end;margin-top:10px"><span class="btn pri">라이선스 저장</span></div></div></div>'
                 % (tg(kind, '#f3e8ff', '#7e22ce'), co, on, off, amount if saved else '0', until))
    return '<div style="position:relative;margin-bottom:8px;display:flex;justify-content:flex-end">%s%s</div>' % (pill, panel)


def usage_box(s, o, gaps, occ, ok=True):
    """구간 사용 현황 (web/components/SobpUsage.tsx) `PC-195` — gaps: ['0~165', …] · occ: [(종류, 고객사, B, P), …]"""
    kc = {'App Key': ('#f5f3ff', '#6d28d9'), 'N Key': ('#eef6ff', '#1d4ed8'), '서비스 티켓': ('#ecfdf5', '#047857')}
    sc = ('<span style="display:inline-flex;align-items:center;gap:3px;border:1px solid #e5e7eb;border-radius:6px;padding:1px 5px 1px 1px;background:#fff;font-size:10.5px">'
          '<span style="background:%s;color:#fff;font-weight:700;font-size:9px;border-radius:4px;padding:1px 4px">%s</span><span style="' + MONO + '">%s</span></span>')
    g = ''.join('<span style="border:1px solid #bbf7d0;background:#f0fdf4;color:#166534;border-radius:7px;padding:2px 8px;font-size:11.5px;' + MONO + '">B%s</span>' % x for x in gaps)
    # occ 5번째 값 = 겹치는 티켓 이름(파일명) — 빨간 줄 + 누르면 그 티켓으로 `PC-225`
    rows = ''.join('<div style="display:flex;align-items:center;gap:6px;padding:3px 6px;%s">%s<span style="color:#374151;min-width:90px">%s</span>%s%s%s</div>'
                   % ('border-radius:7px;background:#fef2f2;border:1px solid #fecaca' if len(r) > 4 else '',
                      tg(r[0], *kc[r[0]]), r[1], sc % ('#8b5cf6', 'B', r[2]), sc % ('#f59e0b', 'P', r[3]),
                      ('<span style="margin-left:auto;font-size:11.5px;color:#b91c1c;text-decoration:underline;' + MONO + '">%s ↗</span>' % r[4]) if len(r) > 4 else '')
                   for r in occ)
    if not gaps:
        g = '<span style="color:#b45309">비어 있는 Book 영역이 없습니다.</span>'   # `PC-225`
    st = tg('입력 구간 사용 가능', '#dcfce7', '#166534') if ok else tg('입력 구간 겹침', '#fef2f2', '#b91c1c')
    return ('<div style="margin-top:10px;border:1px solid #eef0f4;border-radius:10px;background:#fafbfc;padding:9px 12px;font-size:12px">'
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><b style="color:#374151">구간 사용 현황</b>'
            '<span style="color:#9ca3af">S%s / O%s · 발급 %d건 · 빈 Book 구간 %d곳</span><span style="flex:1"></span>%s</div>'
            '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:8px"><span style="color:#6b7280;min-width:64px">빈 구간</span>%s</div>%s</div>'
            % (s, o, len(occ), len(gaps), st, g, rows))


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


def co_item(label, n, on=False, todo=0, warn=False, bold=False, fold=None, sub=False):
    """고객사 한 줄 — [▶ 접기] · 이름 · (하위 n) · 건수 배지. App Key · N Key 같은 모양 `PC-198`
    「미정 n」 표시는 없앴다(todo 는 받기만) · fold = ('open' | 'closed', 하위 수) · sub = 하위 고객사(세로 안내선 안)"""
    slot = ''
    if not sub:
        slot = ('<span style="width:16px;flex:0 0 16px;display:inline-flex;justify-content:center;color:#9ca3af;font-size:10px;%s">▶</span>'
                % ('visibility:hidden' if not fold else ('transform:rotate(90deg)' if fold[0] == 'open' else '')))
    sub_n = ('<span style="font-size:10.5px;color:#9ca3af;white-space:nowrap">하위 %d</span>' % fold[1]) if fold else ''
    return ('<div style="display:flex;align-items:center;gap:6px;border-radius:9px;padding:%s;font-size:%s;'
            'background:%s;color:%s;font-weight:%s">%s<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">%s</span>%s'
            '<span style="flex:1"></span><span style="font-size:10.5px;border-radius:999px;padding:1px 8px;font-weight:700;'
            'background:%s;color:%s">%d</span></div>'
            % ('6px 10px' if sub else '8px 10px 8px 4px', '12.5px' if sub else '13px',
               '#eef6ff' if on else 'transparent', '#1d4ed8' if on else ('#b45309' if warn else ('#4b5563' if sub else '#374151')),
               '700' if (on or bold) else '400', slot, label, sub_n,
               '#dbeafe' if on else '#f3f4f6', '#1d4ed8' if on else ('#6b7280' if n else '#c7cdd6'), n))


def co_group(label, n, on, total_subs, subs=(), open_=False, more=0):
    """상위 고객사 묶음 — ▶ 로 하위 고객사를 접고 편다(기본 접힘). 하위는 세로 안내선 안에 들여 `PC-196` `PC-198`
    subs: (라벨, 건수, 선택)"""
    head = co_item(label, n, on, fold=('open' if open_ else 'closed', total_subs))
    if not open_:
        return head
    li = ''.join(co_item(l, c, o, sub=True) for l, c, o in subs)
    if more:
        li += '<div style="font-size:11px;color:#9ca3af;padding:4px 10px">… 외 %d곳</div>' % more
    return head + '<div style="margin:1px 0 4px 17px;padding-left:6px;border-left:2px solid #e5e7eb">%s</div>' % li


def sobp_chips(kind, s_, o, b, p_):
    """SOBP 칩 — 종류 · S · O · B · P (web/components/sobp.tsx SobpChips small)"""
    sc = ('<span style="display:inline-flex;align-items:center;gap:3px;border:1px solid #e5e7eb;border-radius:6px;padding:1px 5px 1px 1px;'
          'background:#fff;font-size:10.5px"><span style="background:%s;color:#fff;font-weight:700;font-size:9px;border-radius:4px;padding:1px 4px">%s</span>'
          '<span style="' + MONO + '">%s</span></span>')
    return ('<span style="display:inline-flex;align-items:center;gap:4px;flex-wrap:wrap">'
            '<span style="background:#2563eb;color:#fff;font-weight:700;font-size:9.5px;border-radius:4px;padding:1px 5px">%s</span>%s%s%s%s</span>'
            % (kind, sc % ('#5f8ff0', 'S', s_), sc % ('#14b8a6', 'O', o), sc % ('#8b5cf6', 'B', b), sc % ('#f59e0b', 'P', p_)))


def co_col(rows, height, view='issued', issued=14, total=536, count=None, search='', unlinked=None, empty='',
           issued_label='발급 고객사', right=''):
    """왼쪽 칸 — 고객사(고객사 관리) · [발급 고객사][전체 고객사] · 검색 · 목록 · 고객사 미연결
    rows: (라벨, 건수, 선택, 미정, 굵게) 또는 미리 그린 줄(co_group)"""
    li = ''.join(r if isinstance(r, str) else co_item(r[0], r[1], r[2], r[3], bold=r[4]) for r in rows)
    if empty:
        li += '<div style="font-size:12px;color:#9ca3af;padding:14px 6px;text-align:center;line-height:1.7">%s</div>' % empty
    if unlinked:
        lb, n, on, td = unlinked
        li += ('<div style="border-top:1px solid #eef0f4;margin-top:6px;padding-top:6px">%s</div>'
               % co_item(lb, n, on, td, warn=True))
    srch = ('<div class="inp%s" style="margin-bottom:8px">%s</div>' % ('' if search else ' ph', search or '고객사 검색'))
    return ('<div style="%s;height:%dpx;display:flex;flex-direction:column;overflow:hidden">'
            '<div style="%s"><b style="font-size:14px">고객사</b><span style="font-size:11.5px;color:#9ca3af">%s곳</span>'
            '<span style="flex:1"></span>%s</div>'
            '<div style="padding:10px;display:flex;flex-direction:column;flex:1;min-height:0">'
            '<div style="display:flex;gap:4px;margin-bottom:8px">%s%s</div>%s'
            '<div style="flex:1;overflow:hidden">%s</div></div></div>'
            % (CARD, height, HD, count if count is not None else (issued if view == 'issued' else total),
               right or '<span style="font-size:11px;color:#9ca3af">고객사 관리</span>',
               chip('%s %d' % (issued_label, issued), view == 'issued'), chip('전체 고객사 %d' % total, view == 'all'),
               srch, li))


def co_ws_head(view='ws', pending=3):
    """고객사 관리 머리 — 제목 · 가입 승인 요청 · [3단 보기][표 보기] · 집계 6칸 (web/components/CompaniesWorkspace.tsx) `PC-204`"""
    pend = ('<span style="font-size:12.5px;padding:6px 12px;border-radius:8px;border:1px solid #fcd34d;background:#fffbeb;color:#92400e;font-weight:700">'
            '🔔 가입 승인 요청 %d건</span>' % pending) if (pending and view == 'ws') else ''
    return ('<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:12.5px;color:#6b7280">'
            '<b style="font-size:15px;color:#111827">고객사 관리</b><span>· 업체(고객사) 마스터 · 사업자 / 계좌 / 서류 / 서비스 티켓 · 계정 / 업무 원장</span>'
            '<span style="flex:1"></span>%s<div style="display:flex;gap:4px">%s%s</div></div>'
            % (pend, chip('3단 보기', view == 'ws'), chip('표 보기', view == 'table')) +
            stats([('고객사', '536곳', '#111827'), ('진행중', '535곳', '#047857'), ('사업 종료 ›', '1곳', '#9ca3af'),
                   ('상위 고객사', '6곳', '#047857'), ('하위 고객사', '211곳', '#7e22ce'), ('코드 프로젝트', '511건', '#2563eb')]))


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
        s, o, b, p = r[:4]
        # 하위 고객사가 받은 상위 고객사 SOBP 는 「상위 · 고객사」 를 붙인다 `PC-199`
        par = ('<span style="font-size:11px;color:#6b7280;margin-left:2px">상위 · %s</span>' % r[4]) if len(r) > 4 else ''
        return ''.join('<span style="font-size:11px;border-radius:5px;padding:1px 6px;margin-right:4px;background:#f3f4f6;color:#374151">'
                       '<b style="color:#9ca3af">%s</b> %s</span>' % (k, v) for k, v in (('S', s), ('O', o), ('B', b), ('P', p))) + par
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
