# -*- coding: utf-8 -*-
"""TKT-02 N Key 관리 — 「고객사 | 발급 티켓 | 발급 상세·정산」 3단 한 화면 `PC-149` `PC-153` `PC-158`

옛 TKT-03(N Key 관리 목록) · TKT-04(N Key 발급) · TKT-05(발급 상세·수정) · TKT-06(N Key 불러오기)을 한 화면으로 합쳤다.
고객사 = 고객사 관리(MEM-01) 고객사를 불러온다. 자료 = nkey(HLP) N Key 발급 대장(정본) + 새로 발급한 N Key.
그림 조각은 kws.py(= web/components/KeyWorkspaceUI.tsx)와 같다.
"""
from shell import page, frame
import kws
from kws import tg, fld, MONO

CODE, NAME = 'TKT-02', 'N Key 관리'
PRD = 'docs/prd/TKT-02_N Key 관리.md'
FT = 'N Key 관리'
NOTE = '고객사는 고객사 관리에서 불러옵니다 · 자료: nkey(HLP) N Key 발급 대장 + 새로 발급'

# (고객사, 건수, 미정) — 왼쪽 칸에는 「미정 n」 을 보이지 않는다 `PC-198`
COS = (('네오랩타이완-101', 1, 1), ('ACE Solution-700', 1, 1), ('ezwrite-305', 1, 1), ('Global Communications Inc.-202', 1, 0),
       ('Globalspace-308', 1, 0), ('ICsolutions-300', 1, 1), ('ICsolutions-301', 1, 1), ('ICsolutions-302', 1, 1),
       ('Inform DS-302', 16, 1), ('InformDS-231', 1, 0), ('KODION-46', 2, 0), ('Luginbühl-450', 7, 4),
       ('Photron-241', 1, 1), ('Snave UK-309', 1, 0), ('Study123', 1, 1), ('ufit-311', 2, 2))
# (No, S/O/B, 정산, 권수, 발급인, 발급일, 금액, 대장)
T = {
    'KODION-46': ((36, 'S3/O46/B10', '무료', 2, '황락평', '2026-07-07', '', True), (35, 'S3/O46/B8', '무료', 2, '황락평', '2025-11-20', '', True)),
    'Inform DS-302': ((21, 'S3/O302/B7008', '미정', 300, '안진', '2026-03-17', '', True), (20, 'S3/O302/B6808', '유료', 200, '안진', '2026-03-17', '₩0', True),
                      (19, 'S3/O302/B6708', '유료', 100, '안진', '2025-08-13', '₩0', True), (18, 'S3/O302/B6208', '유료', 500, '안진', '2025-04-14', '₩0', True)),
    'Luginbühl-450': ((34, 'S3/O450/B435', '유료', 196, '안진', '2026-03-06', '₩0', True), (33, 'S3/O450/B239', '유료', 196, '안진', '2025-11-25', '₩0', True),
                      (32, 'S3/O450/B160', '유료', 79, '안진', '2025-10-13', '₩0', True), (31, 'S3/O450/B120', '미정', 40, '최승혁', '2023-12-23', '', True),
                      (30, 'S3/O450/B80', '미정', 40, '최승혁', '2023-10-11', '', True)),
    '고객사 미연결': ((58, 'S44/O503', '미정', 0, '황효정', '2020-01-01', '', True), (57, 'S44/O502', '미정', 0, '황효정', '2020-01-01', '', True),
                 (49, 'S44/O311', '미정', 0, '최승혁', '2020-01-01', '', True), (37, 'S44/O281', '미정', 0, '황효정', '2020-01-01', '', True)),
}
LEDGER_NAME = {58: 'hyssos', 57: 'hyssos', 49: 'ICsolutions', 37: 'inkwrx'}


def head_(scope='전체 고객사', filt=False, stats=None, expired=0):
    st = stats or (('발급 티켓', '61건', '#111827'), ('유료 합계', '₩0', '#1d4ed8'), ('유료 건수', '22건', '#2563eb'),
                   ('무료 건수', '4건', '#166534'), ('체험 건수', '0건', '#92400e'), ('정산 미등록', '35건', '#dc2626'))
    out = (kws.title('N Key 관리', '집계 대상 <b style="color:#111827">%s</b>%s' % (scope, ' · 필터 적용' if filt else ''), NOTE) +
           kws.stats(list(st)))
    if expired:
        out += kws.warn_bar('⚠ 체험 기간이 만료된 티켓 <b>%d건</b> — 유료 전환 또는 회수 여부를 확인하세요.' % expired)
    return out


def filter_bar(bill='', src='', q='', hits=None):
    b = ''.join(kws.chip(x, bill == v) for v, x in (('', '정산 전체'), ('미정', '미정'), ('유료', '유료'), ('무료', '무료')))
    s = ''.join(kws.chip(x, src == v) for v, x in (('', '전체'), ('ledger', '대장'), ('new', '신규발급')))
    filt = bool(bill or src or q)
    return ('<div style="%s;padding:10px 12px;margin-bottom:12px;display:flex;gap:8px;align-items:center;font-size:12.5px">'
            '<b style="color:#374151">필터</b><div style="display:flex;gap:4px">%s</div><span style="color:#d1d5db">|</span>'
            '<div style="display:flex;gap:4px">%s</div><div class="inp%s" style="width:260px">%s</div>%s'
            '<span style="flex:1"></span>%s<span class="btn sm">📂 N Key 불러오기</span></div>'
            % (kws.CARD, b, s, '' if q else ' ph', q or '고객사 · 발급 내용 · 발급인 · 번호 검색',
               '<span class="lnk">필터 해제</span>' if filt else '',
               ('<span style="color:#6b7280">전체 <b style="color:#111827">%s건</b> · 고객사 <b style="color:#111827">%s곳</b></span>' % hits) if (filt and hits) else ''))


# 상위 고객사(공통코드 보유) — ▶ 로 접고 편다. App Key 관리와 같은 묶음 `PC-197` `PC-198`
GROUPS = {'네오노트-0-27': (6, ('네오랩컨버전스', '애슐런', '에슐런러닝(개념원리에듀)', '프랭클린', '하나금융투자', '호주 애슐런')),
          '네오노트-1012': (30, ('네스프레소', '네오랩컨버전스', '라미'))}


def left(sel='', view='issued', rows=None, unlinked=(4, 6), h=600, search='', empty='', total_all=(61, 35), count=None, open_=None):
    if rows is None:
        rows = [(n, c, n == sel, td, False) for n, c, td in COS]
    if view == 'all' and not search and open_:   # 전체 고객사 — 상위 묶음
        cnt, subs = GROUPS[open_]
        rows = rows[:1] + [kws.co_group(open_, 0, False, cnt, [(x, 0, x == sel) for x in subs], open_=True, more=cnt - len(subs))] + rows[1:]
    allrow = [] if search else [('전체', total_all[0], sel == '', total_all[1], True)]
    ul = ('고객사 미연결', unlinked[1], sel == '고객사 미연결', unlinked[0]) if (unlinked and not search) else None
    return kws.co_col(allrow + rows, h, view=view, issued=31, total=536, count=count, search=search, empty=empty, unlinked=ul)


def tcard(co, t, on=False, unl=False):
    no, sob, bill, vol, by, at, amt, ledger = t
    return kws.item('<div style="display:flex;align-items:center;gap:6px"><span style="%s;font-size:11.5px;color:#2563eb;font-weight:700">No.%d</span>'
                    '<b style="%s;font-size:12.5px">%s</b><span style="flex:1"></span>%s</div>'
                    '<div style="display:flex;align-items:center;gap:6px;margin-top:4px;font-size:11.5px;color:#6b7280">%s%s<span>%s</span>%s%s'
                    '<span style="margin-left:auto;%s">%s</span></div>'
                    % (MONO, no, MONO, sob, kws.bill_tag(bill), tg('대장', '#f3f4f6', '#9ca3af') if ledger else '',
                       ('<span>%d권</span>' % vol) if vol else '', by,
                       ('<b style="color:#1d4ed8">%s</b>' % amt) if amt else '',
                       ('<span style="color:#b45309">대장명 %s</span>' % LEDGER_NAME.get(no, '')) if unl else '', MONO, at), on=on)


def group_head(name, n, amt=''):
    return ('<div style="display:flex;align-items:center;gap:6px;padding:6px 2px;margin:4px 0 6px;border-bottom:1px solid #eef0f4;font-size:12.5px">'
            '<b style="color:%s">%s</b><span style="color:#9ca3af">%d건</span><span style="flex:1"></span>%s'
            '<span style="color:#2563eb;font-size:11.5px">›</span></div>'
            % ('#b45309' if name == '고객사 미연결' else '#111827', name, n,
               ('<b style="color:#1d4ed8;font-size:11.5px">%s</b>' % amt) if amt else ''))


def mid(groups, sel_no=None, h=600, count=None, grouped=True, warn='', empty=''):
    body = ''
    if warn:
        body += '<div style="font-size:11.5px;color:#b45309;margin-bottom:8px;line-height:1.6">%s</div>' % warn
    n = 0
    for name, ts in groups:
        if grouped:
            body += group_head(name, len(ts), '₩0' if any(x[2] == '유료' for x in ts) else '')
        for t in ts:
            body += tcard(name, t, on=(t[0] == sel_no), unl=(name == '고객사 미연결'))
            n += 1
    if empty:
        body += kws.empty(empty)
    return kws.mid_col('발급 티켓', '%s건' % (count if count is not None else n), '＋ N Key 발급', body, h)


KODION_PARAMS = (('Company Name', 'KODION'), ('Section', '3'), ('Owner', '46'), ('Book Start', '10'), ('Book Volume', '2'),
                 ('Page Start', '0'), ('Page Volume', '512'), ('Code Type', 'Ncode_PDS3'), ('Issued Time', '20260707'),
                 ('Valid Until Time', '99999999 (무제한)'), ('Ticket Type', 'Unlimited'), ('Ticket Version', '1'),
                 ('Separate Each Book', 'N (1개 티켓 병합)'), ('구분(대장)', '무상'), ('담당(대장)', '황락평'))


def ticket_detail(tab='base', no=36, co='KODION', bill='무료', amount='', trial='', note='무상', err='', toast='', at='2026-07-07 00:00', by='황락평', editing=False, currency='KRW', fx=''):
    """발급 상세 — 보기(읽기 전용) → [티켓 수정] → 수정 상태(파란 테두리 · 수정 전 · 탭 숨김) `PC-201`"""
    t = '' if editing else kws.tabs((('base', '발급 기본정보', ''), ('bill', '정산 정보', '')), tab)
    head = ('<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap"><b style="font-size:14px;color:%s">%s</b>'
            '%s<span style="%s;font-size:12.5px">발급 %d번</span>%s%s</div>'
            % ('#1d4ed8' if editing else '#111827', '티켓 수정' if editing else '발급 상세',
               tg('N Key', '#eef6ff', '#2563eb'), MONO, no, tg(co, '#f3f4f6', '#6b7280', False), tg('대장', '#f3f4f6', '#9ca3af')))
    SUM = 'Ncode_PDS3 S3/O46/B10 · Book 2권 · P0~511 · 기간 무제한'
    if tab == 'base' or editing:
        body = (('<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;padding:8px 12px;border-radius:9px;border:1px solid #93c5fd;'
                 'background:#f0f7ff;font-size:12.5px"><b style="color:#1d4ed8">수정 전</b><span style="color:#374151">%s</span></div>' % SUM) if editing else '') + (
                '<div class="g3">' + fld('고객사', co, ro=True) + fld('발급일시', at, ro=True, mono=True) + fld('발급인', by, ro=True) + '</div>'
                '<div style="margin-top:12px">' + (fld('발급 내용 (목록 표기) *', '' if err == 'sum' else SUM, err=(err == 'sum')) if editing
                                                     else fld('발급 내용 (목록 표기)', SUM, ro=True)) + '</div>'
                + ('<div class="inline-err">발급 내용을 입력하세요.</div>' if err == 'sum' else '') +
                '<div style="margin-top:16px;font-size:12px;font-weight:700;color:#374151;margin-bottom:6px">Key 정보 '
                '<span style="font-weight:400;color:#9ca3af">· 15개 항목%s</span></div>' % (' · 값만 수정합니다' if editing else '') +
                kws.kv_table(KODION_PARAMS[:9], editable=editing) +
                ('<div style="font-size:11px;color:#9ca3af;margin-top:6px">이미 내려받은 키 파일은 바뀌지 않습니다. 여기 수정은 <b>발급 원장의 기록</b>을 바로잡는 용도입니다. '
                 '코드 구간을 바꾸면 사용할 수 있는 구간인지 검사합니다.</div>' if editing else ''))
        if editing:
            body = '<div style="border:1px solid #93c5fd;background:#fbfdff;border-radius:10px;padding:14px 16px">%s</div>' % body
    else:
        # 정산 정보 — App Key · 서비스 티켓과 같은 공용 정산 입력 `PC-202`
        body = kws.billing_box(bill, amount, note, '2026-10-20 10:20 · 김순정' if note else '—', currency=currency, fx=fx, trial=trial, bare=True, err=err)
    # 보기 [티켓 수정] / 수정 [취소] [수정 저장] / 정산 탭 [정산 저장] — 발급 기록 삭제 없음 `PC-192` `PC-201`
    foot = kws.footer('', '<span class="btn gho">취소</span><span class="btn pri">수정 저장</span>' if editing else
                      ('<span class="btn pri">티켓 수정</span>' if tab == 'base' else ''))   # 정산 탭 저장은 정산 입력 안 [정산 저장]
    msg = kws.toast_line(toast) if toast else ''
    return '<div style="%s;padding:18px">%s%s%s%s%s</div>' % (kws.CARD, head, t, body, foot, msg)


def nkey_form(co='KODION-46', picked=False, open_=False, common=False, sep=False, over=False, err='', toast='', rng=None):
    rng = rng or (('3', '46', '8~11', '0~511'), ('3', '46', '1~11', '0~511'), ('14', '46', '5~6', '0~31'))
    sel = rng[0] if picked else None
    if common:
        pick = ('<div style="font-size:12px;color:#6b7280;margin-bottom:6px">사용 고객사 * <span style="color:#a855f7;font-weight:700">공통코드</span>'
                '<span style="color:#9ca3af"> (선택하면 코드가 자동으로 지정됩니다)</span></div><div class="inp">한솔교육 · Common-21 (PDS2 S3/O21)</div>'
                '<div style="font-size:11.5px;color:#6b21a8;margin-top:6px">발급 코드: <b>PDS2 · S3 / O21</b> · 사용 고객사 <b>한솔교육</b></div>')
    else:
        pick = ('<div style="font-size:12px;color:#6b7280;margin-bottom:6px">발급 범위 (nkey 대장 이력 · SOBP 할당) * '
                '<span style="color:#9ca3af">(선택하면 Section·Owner·Book·Code Type 이 자동으로 채워집니다)</span></div>' +
                kws.range_picker(open_, sel, rng))
    if picked or common:   # 구간 사용 현황 — 하위 고객사끼리도 보인다 `PC-195`
        pick += (kws.usage_box('3', '21', ['0~165', '167~899', '983~4095'], [('App Key', '유니메이션', '166', '1~4095'), ('App Key', '스콜라스틱', '900~982', '0~2000')])
                 if common else kws.usage_box('3', '46', ['0~7', '12~4095'], [('N Key', 'KODION', '8~9', '0~511'), ('N Key', 'KODION', '10~11', '0~511')], ok=not over))
    bs, bv = ('8', '4' if not over else '6') if (picked or common) else ('', '')
    grid1 = ('<div class="g4" style="margin-top:12px">' + fld('Start Book (시작 북코드)', bs, ph=not bs) + fld('Book 볼륨 (권)', bv, ph=not bv, err=over) +
             fld('Start Page', '1 (기본)') + fld('Page 볼륨', '512') + '</div>'
             '<div style="margin-top:10px">' + fld('Valid Until Time (사용기간 끝)', '<span style="color:#9ca3af">연도-월-일</span>',
                                                   extra='<span style="font-size:12.5px;white-space:nowrap">☑ 무제한</span>') + '</div>'
             '<div class="g3" style="margin-top:10px">' + fld('Code Type', 'PDS3') + fld('Issued Time (발급일 · 고정)', '20261015', ro=True) +
             fld('Ticket Version', '1', ro=True) + '</div>')
    sepline = ('<label style="display:flex;align-items:center;gap:6px;font-size:12.5px;color:#374151">%s <b>Separate Each Book</b>'
               '<span style="color:#9ca3af">(체크하면 북코드별 개별 티켓, 해제하면 1개 티켓으로 병합합니다)</span></label>' % ('☑' if sep else '☐'))
    foot = kws.footer(sepline, '<span class="btn gho">취소</span><span class="btn pri"%s>N Key 발급</span>' % ('' if (picked or common) else ' style="opacity:.5"'))
    plan = ''
    if picked or common:
        plan = ('<div style="margin-top:8px;font-size:12px;color:#6b7280">발급 예정: <b style="color:#111827">S3/O46/B8~%s</b> · %s · P1~512%s</div>'
                % ('13' if over else '11', '개별 티켓 4장' if sep else '병합 티켓 1장',
                   ' <b style="color:#dc2626">· ⚠ 할당 범위(B11) 초과</b>' if over else ''))
    msg = ('<div style="margin-top:10px;font-size:12.5px;color:%s">%s</div>' % ('#dc2626' if err else '#2563eb', err or toast)) if (err or toast) else ''
    info = ('<div style="margin-top:12px;background:#fafbfc;border:1px dashed #e5e7eb;border-radius:8px;padding:10px 12px;font-size:11.5px;color:#6b7280;line-height:1.7">'
            '발급하면 티켓이 <b>zip 파일(폴더 형태)</b>로 다운로드됩니다. 다운로드 폴더에서 zip의 압축을 풀어 그 폴더째 <b>nproj 폴더</b> 또는 '
            '<b>내 PC &gt; 문서 &gt; NeoLAB &gt; CodeTickets</b>에 넣은 뒤 <b>Caster lite</b>에서 사용합니다.</div>')
    head = ('<div style="display:flex;align-items:baseline;gap:10px;margin-bottom:12px"><b style="font-size:15px">N Key 발급</b>'
            '<span style="font-size:13px;color:#6b7280">%s</span>%s<span style="flex:1"></span>'
            '<span style="font-size:11.5px;color:#9ca3af">SOBP 코드 사용 허가 (Caster lite 티켓)</span></div>'
            % (co, tg('PDS3 S3/O46', '#eef6ff', '#2563eb') if picked else ''))
    return ('<div style="%s;padding:18px">%s%s<div style="margin-top:12px">%s</div>%s%s%s%s%s</div>'
            % (kws.CARD, head, fld('고객사 *', co, ro=True), pick, grid1, foot, plan, msg, info))


def keyinfo_modal(err=False, q=''):
    rows = KODION_PARAMS[:13]
    if q:
        rows = tuple(r for r in rows if q.lower() in r[0].lower())
    tbl = ('<div class="toast err" style="margin:0 0 10px">⚠ JSON 형식의 티켓 파일이 아닙니다. Key 생성으로 내려받은 .json 파일을 선택하세요.</div>'
           '<div class="empty" style="padding:20px">표시할 항목이 없습니다.</div>') if err else kws.kv_table(rows)
    return ('<div class="ovl"><div class="mdl w"><div class="mh"><div class="mt">N Key 불러오기 '
            '<span style="font-size:12px;color:#6b7280;font-weight:400">%s</span></div><div class="mx">✕</div></div>'
            '<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px"><span style="font-size:12px;color:#6b7280">%s</span>'
            '<span style="flex:1"></span><div class="inp%s" style="width:220px">%s</div><span class="btn sm">표 복사</span></div>%s'
            '<div class="mf"><div class="btn gho">닫기</div></div></div></div>'
            % ('broken.json' if err else 'Ticket_KODION_S3O46_B10-11.json',
               '0개 항목 (불러온 파일)' if err else '%d개 항목 (불러온 파일)' % len(rows),
               '' if q else ' ph', q or '항목 검색', tbl))


def fr(content, height=900, overlay=''):
    return frame('TKT-02', FT, content, height=height, overlay=overlay)


def col_h(height, extra=0):
    """3단 칸 높이 — 화면 끝(100vh)까지 `PC-156` `PC-157` (머리 · 집계 · 필터 바를 뺀 높이)"""
    return height - 60 - 40 - 102 - 62 - 28 - extra


ZERO = (('발급 티켓', '0건', '#111827'), ('유료 합계', '₩0', '#1d4ed8'), ('유료 건수', '0건', '#2563eb'),
        ('무료 건수', '0건', '#166534'), ('체험 건수', '0건', '#92400e'), ('정산 미등록', '0건', '#9ca3af'))
ALL_GROUPS = (('KODION-46', T['KODION-46']), ('Inform DS-302', T['Inform DS-302'][:3]), ('Luginbühl-450', T['Luginbühl-450'][:1]))


def build():
    B = []
    H, F = head_(), filter_bar()

    B.append(('S1', '기본 — 전체 · 고객사별 묶음', '기본',
              '좌측 메뉴 <b>[티켓 발급] ▸ [N Key 관리]</b>(<code>/tickets/nkey</code>). 위는 <b>정산 집계 6칸</b>과 <b>필터 바</b>, 아래는 3단이다. '
              '왼쪽 고객사는 <b>고객사 관리 고객사</b>(기본 = N Key 가 이어진 발급 고객사 31곳) <code>PC-153</code>. 「전체」를 고르면 가운데가 '
              '<b>고객사별 묶음</b>(고객사 머리 · 건수 · 유료 합계)이고 오른쪽은 가장 최근 발급 건의 상세다. nkey(HLP) 발급 대장 61건은 <b>정본</b>이라 늘 보인다 <code>PC-155</code>. '
              '왼쪽 고객사 칸은 <b>App Key 관리와 같은 모양</b> — 이름 · 건수만 보이고 「미정 n」 은 보이지 않는다(정산 미등록은 집계 칸) <code>PC-198</code>.',
              fr(H + F + kws.grid(left(h=col_h(1000)), mid(ALL_GROUPS, sel_no=36, h=col_h(1000), count=61), ticket_detail()), 1000),
              [('고객사', '클릭', 'S2', '집계 · 목록이 그 고객사 기준'),
               ('고객사 묶음 머리', '클릭', '그 고객사만 보기', ''),
               ('티켓 카드', '클릭', '오른쪽 발급 상세', 'No · S/O/B · 정산 · 대장 · 권수 · 발급인 · 금액 · 발급일'),
               ('[＋ N Key 발급]', '클릭', 'S12', '고른 고객사로 시작'),
               ('[📂 N Key 불러오기]', '클릭', 'S17', '.json 파일 선택')]))

    B.append(('S2', '고객사 선택 — 집계가 그 고객사 기준', '분기',
              '고객사를 고르면 <b>집계 6칸이 그 고객사 기준</b>으로 다시 계산되고(머리에 「집계 대상 {고객사}」), 가운데는 그 고객사 티켓만 최근순으로 보인다.',
              fr(head_('Luginbühl-450', stats=(('발급 티켓', '7건', '#111827'), ('유료 합계', '₩0', '#1d4ed8'), ('유료 건수', '3건', '#2563eb'),
                                                   ('무료 건수', '0건', '#166534'), ('체험 건수', '0건', '#92400e'), ('정산 미등록', '4건', '#dc2626'))) + F +
                 kws.grid(left('Luginbühl-450', h=col_h(1000)), mid((('Luginbühl-450', T['Luginbühl-450']),), sel_no=34, h=col_h(1000), grouped=False),
                          ticket_detail(no=34, co='Luginbühl', bill='유료', at='2026-03-06 00:00', by='안진')), 1000),
              [('집계 6칸', '—', '그 고객사 기준', '페이지·묶음과 무관하게 필터 결과 전체')]))

    B.append(('S3', '필터 — 전체에서 걸고 고객사별로', '분기',
              '필터(정산 · 출처 · 검색)는 <b>전체 발급분에 먼저</b> 건다 <code>PC-150</code>. 왼쪽은 <b>맞는 발급이 있는 고객사만</b> 남고 건수도 필터 결과로 바뀌며, '
              '가운데는 고객사별로 묶여 보인다. 오른쪽 티켓이 결과에서 빠지면 첫 결과로 바뀐다. 검색은 고객사명도 찾는다.',
              fr(head_(filt=True, stats=(('발급 티켓', '35건', '#111827'), ('유료 합계', '₩0', '#1d4ed8'), ('유료 건수', '0건', '#2563eb'),
                                         ('무료 건수', '0건', '#166534'), ('체험 건수', '0건', '#92400e'), ('정산 미등록', '35건', '#dc2626'))) +
                 filter_bar(bill='미정', hits=('35', '12')) +
                 kws.grid(left(rows=[(n, td, False, td, False) for n, c, td in COS if td], total_all=(35, 35), count='12/31', h=col_h(1000)),
                          mid((('Inform DS-302', T['Inform DS-302'][:1]), ('Luginbühl-450', T['Luginbühl-450'][3:])), sel_no=21, h=col_h(1000), count=35),
                          ticket_detail(no=21, co='InformDS', bill='미정', note='판매용 (미사용건)', at='2026-03-17 00:00', by='안진')), 1000),
              [('정산 칩', '클릭', '미정 · 유료 · 무료', '체험은 집계 칸으로 본다'),
               ('출처 칩', '클릭', '전체 · 대장 · 신규발급', ''),
               ('검색', '입력', '고객사 · 발급 내용 · 발급인 · 번호', ''),
               ('[필터 해제]', '클릭', 'S1', '')]))

    B.append(('S4', '필터 결과 없음', '빈 상태', '필터에 맞는 발급이 없으면 왼쪽 · 가운데에 안내만 남는다.',
              fr(head_(filt=True, stats=(('발급 티켓', '0건', '#111827'), ('유료 합계', '₩0', '#1d4ed8'), ('유료 건수', '0건', '#2563eb'),
                                         ('무료 건수', '0건', '#166534'), ('체험 건수', '0건', '#92400e'), ('정산 미등록', '0건', '#9ca3af'))) +
                 filter_bar(src='new', q='Photron', hits=('0', '0')) +
                 kws.grid(left(rows=[], total_all=(0, 0), count='0/31', empty='필터에 맞는 고객사가 없습니다.', unlinked=None, h=col_h(900)),
                          mid((), h=col_h(900), count=0, empty='필터에 맞는 N Key 가 없습니다.'),
                          kws.right_empty('발급 티켓을 선택하거나 <b>[＋ N Key 발급]</b>을 누르세요.')), 900),
              [('[필터 해제]', '클릭', 'S1', '')]))

    trial = (('발급 티켓', '3건', '#111827'), ('유료 합계', '₩0', '#1d4ed8'), ('유료 건수', '0건', '#2563eb'),
             ('무료 건수', '0건', '#166534'), ('체험 건수', '3건', '#92400e'), ('정산 미등록', '0건', '#9ca3af'))
    tt = ((62, 'S3/O46/B12', '체험', 2, '김순정', '2026-09-01', '', False), (63, 'S3/O46/B14', '체험', 2, '김순정', '2026-10-10', '', False))
    trial_mid = mid((('KODION-46', tt),), sel_no=62, h=col_h(1000, 44), grouped=False).replace(
        '김순정</span><span style="margin-left:auto', '김순정</span><span style="color:#dc2626">~10-01 (만료)</span><span style="margin-left:auto', 1).replace(
        '김순정</span><span style="margin-left:auto', '김순정</span><span style="color:#92400e">~11-10 D-26</span><span style="margin-left:auto', 1)
    B.append(('S5', '체험 — 만료 경고 · D-day', '변형',
              '체험 티켓은 카드에 <b>만료일과 잔여일</b>(D-n)을 보이고, 지난 건은 <b>(만료)</b>로 붉게 표시한다. 만료 건이 있으면 집계 아래에 경고가 붙는다.',
              fr(head_('KODION-46', stats=trial, expired=1) + F +
                 kws.grid(left('KODION-46', h=col_h(1000, 44)), trial_mid,
                          ticket_detail('bill', no=62, co='KODION-46', bill='체험', trial='2026-10-01', note='데모 제공', at='2026-09-01 10:20', by='김순정')), 1000),
              [('체험 잔여일', '—', 'D-{n} / (만료)', '잔여일 = 체험 만료일 − 오늘'),
               ('경고', '—', '집계 아래', '<b>⚠ 체험 기간이 만료된 티켓 {n}건 — 유료 전환 또는 회수 여부를 확인하세요.</b>')]))

    B.append(('S6', '고객사 미연결', '변형',
              'nkey 대장 티켓은 이름 + <b>Owner 번호</b>(고객사명 끝 -오너)로 고객사 관리 고객사에 잇는다. 안 맞으면 왼쪽 맨 아래 <b>「고객사 미연결」</b>로 모으고 '
              '카드에 대장명을 보인다(hyssos 4 · inkwrx 1 · ICsolutions O311 1). 고객사 관리에 「이름-오너」로 등록하면 자동으로 이어진다 <code>PC-153</code> <code>PC-155</code>.',
              fr(head_('고객사 미연결', stats=(('발급 티켓', '6건', '#111827'), ('유료 합계', '₩0', '#1d4ed8'), ('유료 건수', '0건', '#2563eb'),
                                              ('무료 건수', '0건', '#166534'), ('체험 건수', '0건', '#92400e'), ('정산 미등록', '6건', '#dc2626'))) + F +
                 kws.grid(left('고객사 미연결', h=col_h(1000)),
                          mid((('고객사 미연결', T['고객사 미연결']),), sel_no=58, h=col_h(1000), grouped=False, count=6,
                              warn='대장의 고객사명 · Owner 와 맞는 고객사가 고객사 관리에 없는 티켓입니다. 고객사 관리에 「이름-오너」로 등록하면 그 고객사로 이어집니다.'),
                          ticket_detail(no=58, co='hyssos', bill='미정', note='', at='2020-01-01 00:00', by='황효정')), 1000),
              [('고객사 미연결', '클릭', '그 티켓들', '대장명 표시'), ('고객사 관리 등록', '—', '자동 연결', '<code>MEM-02</code>')]))

    B.append(('S7', '전체 고객사 — 처음 발급', '분기',
              '<b>[전체 고객사 536]</b>로 바꾸면 고객사 관리의 모든 고객사가 나온다. 아직 N Key 가 없는 고객사를 고르면 가운데가 빈 안내이고 '
              '<b>[＋ N Key 발급]</b>으로 첫 발급을 한다.',
              fr(head_('에듀테크랩', stats=(('발급 티켓', '0건', '#111827'), ('유료 합계', '₩0', '#1d4ed8'), ('유료 건수', '0건', '#2563eb'),
                                           ('무료 건수', '0건', '#166534'), ('체험 건수', '0건', '#92400e'), ('정산 미등록', '0건', '#9ca3af'))) + F +
                 kws.grid(left('에듀테크랩', view='all', search='에듀테크', rows=[('에듀테크랩', 0, True, 0, False)], count=1, h=col_h(900)),
                          mid((), h=col_h(900), count=0, empty='발급된 N Key 가 없습니다.<br>[＋ N Key 발급]으로 발급하세요.'),
                          kws.right_empty('발급 티켓을 선택하거나 <b>[＋ N Key 발급]</b>을 누르세요.')), 900),
              [('[전체 고객사]', '클릭', '고객사 관리 전체', ''), ('[＋ N Key 발급]', '클릭', 'S12', '')]))

    G1 = (('KODION-46', T['KODION-46']),)
    LK = left('KODION-46', h=col_h(1000))
    HK = head_('KODION-46', stats=(('발급 티켓', '2건', '#111827'), ('유료 합계', '₩0', '#1d4ed8'), ('유료 건수', '0건', '#2563eb'),
                                   ('무료 건수', '2건', '#166534'), ('체험 건수', '0건', '#92400e'), ('정산 미등록', '0건', '#9ca3af')))
    B.append(('S8', '발급 상세 — 정산 정보 · 유료', '분기',
              '오른쪽 <b>정산 정보</b> 탭 — App Key · 서비스 티켓과 같은 정산 입력이다. <b>왼쪽에서 과금 유형</b>(미정 · 유료 · 무료 · 체험)을 고르고 <b>오른쪽에 금액</b>을 넣는다. '
              '금액은 <b>원 · USD</b> 중 고르고, USD 면 <b>환율 기록</b>(1 USD = n원 · 선택 · 자동 아님)을 적어 둘 수 있다. 비고는 3줄 입력 <code>PC-202</code>. '
              '정산은 이 탭의 <b>[정산 저장]</b>으로 따로 기록한다 <code>PC-201</code>.',
              fr(HK + F + kws.grid(LK, mid(G1, sel_no=36, h=col_h(1000), grouped=False),
                                   ticket_detail('bill', bill='유료', amount='2,500', note='2026 연간 계약 · 해외', currency='USD', fx='1,385')), 1000),
              [('과금 유형', '선택', '미정 · 유료 · 무료 · 체험', '유료→다른 유형: 금액 0 / 체험→다른 유형: 만료일 비움'),
               ('금액 · 통화', '입력 · 원 / USD', '유료일 때 필수', '목록 · 배지는 1,200,000원 / $2,500 · 유료 합계는 원화(USD 는 환율 기록분만)'),
               ('환율 기록', '입력 (선택)', 'USD 일 때', '1 USD = n원 · 자동 환산 아님 · ≈ 원화 표시'), ('[정산 저장]', '클릭', '정산 기록', '<b>정산 정보가 저장되었습니다.</b> · <code>LOG-01</code>')]))

    B.append(('S9', '정산 정보 — 체험 · 무료', '변형',
              '<b>체험</b>이면 체험 만료일(기본 = 발급일 + 1개월)을 받고, <b>무료</b>면 「청구하지 않는 티켓」 안내만 나온다.',
              fr(HK + F + kws.grid(LK, mid(G1, sel_no=35, h=col_h(1000), grouped=False),
                                   ticket_detail('bill', no=35, bill='체험', trial='2025-12-20', note='', at='2025-11-20 00:00')), 1000),
              [('체험 만료일', '달력', '기본 발급일 + 1개월', '만료되면 (만료) · 경고(S5)'),
               ('무료', '선택', '안내만', '사유는 비고')]))

    B.append(('S10', '저장 검증 실패', '오류',
              '정산 탭 [정산 저장] — 유료인데 금액 0 이면 멈춘다. 티켓 수정 [수정 저장] — 발급 내용이 비었으면 멈춘다(S21) <code>PC-201</code>.',
              fr(HK + F + kws.grid(LK, mid(G1, sel_no=36, h=col_h(1000), grouped=False),
                                   ticket_detail('bill', bill='유료', amount='0', err='amt', note='')), 1000),
              [('발급 내용 비움', '[수정 저장]', '<b>차단</b>', '<b>발급 내용을 입력하세요.</b>'),
               ('유료 금액 0', '[정산 저장]', '<b>차단</b>', '<b>유료는 금액을 입력해야 합니다.</b>')]))

    B.append(('S11', '티켓 수정 저장 완료', '분기', '[수정 저장]이 끝나면 <b>보기</b>로 돌아가 고친 값을 보인다 <code>PC-201</code>. 정산 탭은 [정산 저장]으로 따로 기록되고 집계 · 카드의 정산 표시가 바로 바뀐다.',
              fr(HK + F + kws.grid(LK, mid(G1, sel_no=36, h=col_h(1000), grouped=False),
                                   ticket_detail(toast='티켓 수정 — 발급 36번')), 1000),
              [('수정 저장(자동)', '—', '<code>LOG-01</code>', '티켓 수정 · {고객사} · 발급 {No}번 · N Key'),
               ('정산 저장(자동)', '—', '<code>LOG-01</code>', '정산 등록 · {고객사} · 발급 {No}번 · N Key · {정산}')]))

    B.append(('S12', 'N Key 발급 — 범위 선택', '분기',
              '<b>[＋ N Key 발급]</b>을 누르면 오른쪽에 발급 폼이 열린다. 고객사는 왼쪽에서 고른 값(「전체」면 고른다). <b>발급 범위</b> = nkey 대장 이력(이 고객사로 이어진 티켓) '
              '+ 고객사의 <b>SOBP 할당</b> <code>PC-153</code>. 고르면 Start Book · Book 볼륨 · Page 볼륨 · Code Type 이 채워지고 <b>발급 예정</b> 줄이 나온다.',
              fr(HK + F + kws.grid(LK, mid(G1, h=col_h(1150), grouped=False), nkey_form(picked=True, open_=True)), 1150),
              [('발급 범위', '선택', 'S·O·B·P 칩', '없으면 <b>이 고객사에 할당된 SOBP 범위가 없습니다.</b> → <code>SOB-02</code>'),
               ('Valid Until Time', '무제한 / 날짜', '기본 무제한', ''),
               ('Separate Each Book', '체크', '북코드별 개별 티켓', '해제 = 1개 티켓 병합'),
               ('[N Key 발급]', '클릭', 'S15', 'zip 다운로드'), ('[취소]', '클릭', '이전 상세', '')]))

    B.append(('S13', 'N Key 발급 — 공통코드 고객사', '변형',
              '공통코드를 가진 고객사는 범위 목록 대신 <b>사용 고객사</b>를 고른다 — 그 고객사가 쓰는 코드로 범위가 자동 지정되고, 사용 고객사명이 티켓과 파일명에 들어간다. '
              '이력 전용 공통코드는 제외한다.',
              fr(head_('Common-21', stats=ZERO) + F +
                 kws.grid(left('Common-21', view='all', search='Common', rows=[('Common-21', 0, True, 0, False)], count=1, h=col_h(1150)),
                          mid((), h=col_h(1150), count=0, empty='발급된 N Key 가 없습니다.<br>[＋ N Key 발급]으로 발급하세요.'),
                                                   nkey_form(co='Common-21', common=True)), 1150),
              [('사용 고객사', '선택 (필수)', '범위 자동 지정', '<b>공통코드 회사입니다. 사용 고객사를 선택하세요.</b>')]))

    B.append(('S14', 'N Key 발급 — 범위 초과 · 검증 실패', '오류',
              'Book 끝이 할당 범위를 넘으면 발급 예정 줄에 <b>⚠ 할당 범위(B{끝}) 초과</b>가 붙고, [N Key 발급] 때 검증에 걸린다. 검사는 순서대로 하고 하나라도 걸리면 멈춘다.',
              fr(HK + F + kws.grid(LK, mid(G1, h=col_h(1150), grouped=False),
                                   nkey_form(picked=True, over=True, err='Book 볼륨은 1~4권이어야 합니다. (B8~B11)')), 1150),
              [('① 고객사', '미선택', '<b>차단</b>', '<b>고객사를 선택하세요.</b>'),
               ('② 공통코드 사용 고객사', '미선택', '<b>차단</b>', '<b>공통코드 회사입니다. 사용 고객사를 선택하세요.</b>'),
               ('③ 발급 범위', '미선택', '<b>차단</b>', '<b>발급 범위를 선택하세요.</b>'),
               ('④ Start Book', '범위 밖', '<b>차단</b>', '<b>Start Book은 {시작}~{끝} 범위여야 합니다.</b>'),
               ('⑤ Book 볼륨', '초과', '<b>차단</b>', '<b>Book 볼륨은 1~{최대}권이어야 합니다. (B{시작}~B{끝})</b>'),
               ('⑥ Page 볼륨', '0', '<b>차단</b>', '<b>Page 볼륨은 1 이상이어야 합니다.</b>'),
               ('⑦ Valid Until Time', '형식', '<b>차단</b>', '<b>Valid Until Time 은 6자리(YYMMDD)이거나 무제한이어야 합니다.</b>')]))

    G2 = (('KODION-46', ((64, 'S3/O46/B8', '미정', 4, '김순정', '2026-10-15', '', False),) + T['KODION-46']),)
    B.append(('S15', 'N Key 발급 완료 → 정산 정보', '분기',
              '[N Key 발급]을 누르면 티켓이 <b>zip</b>(폴더 형태)으로 내려받아지고, 가운데 맨 위에 새 티켓이 생기며 오른쪽은 <b>그 티켓의 정산 정보 탭</b>으로 바로 이어진다 '
              '— 발급 직후 정산을 등록한다 <code>PC-149</code>.',
              fr(HK + F + kws.grid(LK, mid(G2, sel_no=64, h=col_h(1000), grouped=False),
                                   ticket_detail('bill', no=64, co='KODION-46', bill='미정', note='', at='2026-10-15 14:02', by='김순정')
                                   .replace(tg('대장', '#f3f4f6', '#9ca3af'), '')), 1000),
              [('zip', '다운로드', 'Ticket_{고객사}[_{사용고객사}]_S{S}O{O}_B{시작}[-{끝}].zip', 'Separate Each Book = Book 하나당 파일 1개'),
               ('발급(자동)', '—', '목록 · 집계 · <code>LOG-01</code>', '티켓 발급 · 신규발급')]))

    B.append(('S16', '코드 구간 수정 — 사용할 수 없는 구간', '오류',
              '발급 기록은 <b>지우지 않고 고친다</b> <code>PC-192</code>. Key 정보에서 <b>Section · Owner · Book · Page</b> 를 바꾸면 [저장] 때 '
              '① 이 고객사의 발급 범위(대장 이력 · SOBP 할당) 안인지 ② 다른 발급분과 겹치지 않는지(자기 자신 제외) 본다. 사용할 수 없는 구간이면 저장하지 않는다.',
              fr(HK + F + kws.grid(LK, mid(G1, sel_no=36, h=col_h(1000), grouped=False),
                                  ticket_detail(editing=True, toast='이 고객사의 발급 범위(SOBP 할당) 밖의 코드 구간입니다. 할당된 Section · Owner · Book 안에서 고치세요.').replace('#047857', '#dc2626')), 1000),
              [('범위 밖', '[수정 저장]', '<b>차단</b>', '<b>이 고객사의 발급 범위(SOBP 할당) 밖의 코드 구간입니다. 할당된 Section · Owner · Book 안에서 고치세요.</b>'),
               ('겹침', '[수정 저장]', '<b>차단</b>', '<b>이미 {App Key / N Key / 서비스 티켓}로 발급된 SOBP 와 겹칩니다 — … 다른 Book · Page 를 고르세요.</b>'),
               ('구간 그대로', '[수정 저장]', '저장', '발급 내용 등 다른 값만 바꾸면 검사하지 않는다')]))

    B.append(('S17', 'N Key 불러오기 — 항목 표', '분기',
              '필터 바의 <b>[📂 N Key 불러오기]</b>로 내려받은 키 파일(.json)을 열어 <b>Key · Value</b> 표로 본다. <b>조회 전용</b>이고 원장에 없는 외부 파일도 연다. '
              '검색은 항목명과 값을 함께 찾고 [표 복사]는 보이는 항목만 복사한다.',
              fr(H + F + kws.grid(left(h=col_h(1000)), mid(ALL_GROUPS, sel_no=36, h=col_h(1000), count=61), ticket_detail()), 1000,
                 overlay=keyinfo_modal()),
              [('항목 검색', '입력', '표 거름', '없으면 <b>"{검색어}" 에 맞는 항목이 없습니다.</b>'),
               ('[표 복사]', '클릭', '보이는 항목 복사', ''), ('[닫기] · ✕', '클릭', 'S1', '필터·선택 유지')]))

    B.append(('S18', 'N Key 불러오기 — 형식 오류', '오류', 'JSON 티켓 파일이 아니면 오류 안내와 빈 표가 나온다. 창은 닫히지 않아 바로 다른 파일을 고를 수 있다.',
              fr(H + F + kws.grid(left(h=col_h(1000)), mid(ALL_GROUPS, sel_no=36, h=col_h(1000), count=61), ticket_detail()), 1000,
                 overlay=keyinfo_modal(err=True)),
              [('형식 오류', '—', '안내 + 빈 표', '<b>⚠ JSON 형식의 티켓 파일이 아닙니다. Key 생성으로 내려받은 .json 파일을 선택하세요.</b>')]))

    # 하위 고객사 — 상위 묶음 안 · 전체 목록에서 바로 골라 발급(모든 상위 SOBP) `PC-197` `PC-198` `PC-199`
    NLC = (('0', '27', '0~16383', '0~4095', '네오노트-0-27'), ('3', '27', '0~8191', '0~511', '네오노트-3-27'),
           ('3', '1012', '0~8191', '0~511', '네오노트-1012'), ('3', '1013', '0~8191', '0~511', '스마트클래스키트-1013'))
    B.append(('S19', '하위 고객사 — 상위 묶음 · 바로 선택해 발급', '분기',
              '<b>[전체 고객사]</b>에서 상위 고객사(공통코드 보유)의 <b>▶</b> 를 누르면 하위 고객사가 <b>세로 안내선</b> 안에 펼쳐진다(기본 접힘 · 「하위 n」) <code>PC-197</code> <code>PC-198</code>. '
              '하위 고객사는 <b>목록 제자리에도</b> 있어 묶음을 열지 않고 바로 골라도 된다 <code>PC-199</code>. 하위 고객사로 [＋ N Key 발급]을 열면 발급 범위에 '
              '<b>그 하위 고객사가 들어간 모든 상위 고객사의 SOBP</b> 가 「상위 · 상위 고객사명」 과 함께 나온다. 발급 폼의 고객사 선택도 하위 고객사를 상위 밑에 들여 보인다. '
              '상위 고객사를 고르고 「사용 고객사」 로 고르는 방식(S13)도 그대로다.',
              fr(head_('네오랩컨버전스', stats=ZERO) + F +
                 kws.grid(left('네오랩컨버전스', view='all', open_='네오노트-0-27', h=col_h(1150),
                               rows=[('(주)투이아이앤씨', 0, False, 0, False), ('가우스-1022', 0, False, 0, False), ('교원구몬-10', 0, False, 0, False)]),
                          mid((), h=col_h(1150), count=0, empty='발급된 N Key 가 없습니다.<br>[＋ N Key 발급]으로 발급하세요.'),
                          nkey_form(co='네오랩컨버전스', open_=True, rng=NLC)), 1150),
              [('상위 고객사 ▶', '클릭', '하위 고객사 펼침 / 접힘', '검색 중이면 저절로 펼침'),
               ('하위 고객사', '클릭', '그 고객사 기준 집계 · 발급 티켓', '사용 고객사로 발급한 티켓도 그 하위 고객사로 잡힌다'),
               ('발급 범위', '선택', '모든 상위 SOBP', '「상위 · 상위 고객사명」 · 구간 사용 현황으로 겹침 확인 <code>PC-195</code>')]))

    # 고객사 검색 → 가운데 발급 티켓 `PC-199`
    B.append(('S20', '고객사 검색 → 발급 티켓', '분기',
              '왼쪽 <b>고객사 검색</b>에 이름을 넣으면 가운데 발급 티켓 칸이 <b>검색한 고객사들의 발급 티켓</b>(고객사별 묶음)으로 바뀐다 — 머리는 「집계 대상 고객사 검색 「…」」 <code>PC-199</code>. '
              '하위 고객사를 검색하면 그 하위 고객사로 발급한 티켓과, 상위 고객사에서 <b>사용 고객사</b>로 그 하위 고객사에 발급한 티켓이 함께 나온다. 고객사를 누르면 그 고객사만 본다.',
              fr(head_('고객사 검색 「Inform」', stats=(('발급 티켓', '17건', '#111827'), ('유료 합계', '₩0', '#1d4ed8'), ('유료 건수', '16건', '#2563eb'),
                                                  ('무료 건수', '0건', '#166534'), ('체험 건수', '0건', '#92400e'), ('정산 미등록', '1건', '#dc2626'))) + F +
                 kws.grid(left(view='issued', search='Inform', rows=[('Inform DS-302', 16, False, 0, False), ('InformDS-231', 1, False, 0, False)], count=2, h=col_h(1000)),
                          mid((('Inform DS-302', T['Inform DS-302']),), sel_no=21, h=col_h(1000), count=17),
                          ticket_detail(no=21, co='InformDS', bill='미정', note='판매용 (미사용건)', at='2026-03-17 00:00', by='안진')), 1000),
              [('고객사 검색', '입력', '가운데 = 검색한 고객사의 발급 티켓', '「전체」 기준 · 고객사별 묶음'),
               ('고객사', '클릭', 'S2', '그 고객사만'),
               ('검색어 지움', '—', 'S1', '')]))

    # 티켓 수정 — 보기에서 [티켓 수정]으로 수정 상태 `PC-201`
    B.append(('S21', '티켓 수정 — 수정 상태', '분기',
              '오른쪽 발급 상세는 <b>보기</b>(읽기 전용)로 열린다. <b>[티켓 수정]</b>을 누르면 App Key 관리처럼 <b>수정 상태</b>로 바뀐다 — 제목 <b>「티켓 수정」</b>, '
              '파란 테두리, <b>수정 전</b> 발급 내용, 탭 숨김(입력에 집중). 발급 내용과 Key 정보 값을 고치고 <b>[수정 저장]</b>, <b>[취소]</b>면 고친 값을 버리고 보기로 돌아간다 <code>PC-201</code>. '
              '발급 기록은 지우지 않는다 <code>PC-192</code>.',
              fr(HK + F + kws.grid(LK, mid(G1, sel_no=36, h=col_h(1000), grouped=False), ticket_detail(editing=True)), 1000),
              [('[티켓 수정]', '클릭', '수정 상태', '발급 기본정보 탭에서 · 정산 탭은 [정산 저장]'),
               ('[수정 저장]', '클릭', 'S11', '코드 구간을 바꿨으면 사용할 수 있는 구간인지 검사(S16)'),
               ('[취소]', '클릭', '보기', '고친 값 버림')]))

    intro = ('N Key 를 발급하고 정산하는 화면이다. 「<b>고객사 | 발급 티켓 | 발급 상세·정산</b>」 3단 한 화면이며 옛 <code>TKT-03</code> N Key 관리 · '
             '<code>TKT-04</code> N Key 발급 · <code>TKT-05</code> 발급 상세·수정 · <code>TKT-06</code> N Key 불러오기를 합쳤다 <code>PC-149</code> <code>PC-158</code>. '
             '고객사는 <b>고객사 관리 고객사를 불러온다</b> <code>PC-153</code>. <b>정산 집계 6칸</b>은 고른 고객사 · 필터 기준이고, 필터는 전체에 걸고 고객사별로 묶어 본다 '
             '<code>PC-150</code>. 화면 모양은 <code>TKT-01</code> App Key 관리와 같은 조각을 쓴다 <code>PC-154</code>.')
    return page(CODE, NAME, PRD, intro, B)
