# -*- coding: utf-8 -*-
"""MEM-02 고객사 등록·수정 — 「머리말 + 섹션 메뉴 | 본문」 `PC-136`~`PC-144`.

등록(/companies/new) · 상세(/companies/{id}) 같은 구조. 섹션 = 기본 정보 · 편집 단가 · 관련 서류 / 서비스 계정 · 업무 메모.
진행 상태는 머리말 오른쪽 진행중/사업 종료, 서비스 계정은 「카드 목록 | 상세」 + 서비스 권한 탭.
등록과 저장 순서는 PRD §4.8.
"""
from shell import page, frame

from shell import page, frame

CODE, NAME = 'MEM-02', '고객사 등록·수정'
PRD = 'docs/prd/MEM-02_고객사 등록·수정.md'

BASIC = (('업체명', '✔', '웅진씽크빅'), ('담당자', '', '김태호'), ('연락처', '', '031-956-7000'),
         ('사업자등록증번호', '', '215-81-06943'), ('주소', '', '경기도 파주시 회동길 20'),
         ('은행명', '', '신한은행'), ('계좌번호', '', '140-011-******'),
         ('세금계산서 발행용 이메일', '', 'tax@wjthinkbig.com'))

# lib/pricing.ts RATE_ITEMS — (항목, 단위, 기본단가, 전용여부)
# 소리펜 14항목 · 필기펜 4항목 `PC-115` `PC-084` — 양쪽 모두 'Ncode 적용'(페이지당)을 포함한다.
PRICE_NSP = (('Ncode 적용', '페이지당', '500', False),
             ('Ncode 편집(기본)', '심볼당', '1,200', True),
             ('Compound 2언어', '심볼당', '1,300', False),
             ('Compound 3언어', '심볼당', '1,600', False),
             ('Compound 4언어', '심볼당', '1,900', False),
             ('Compound 5언어', '심볼당', '2,200', False),
             ('Compound 6언어', '심볼당', '2,500', False),
             ('Compound 7언어', '심볼당', '2,800', False),
             ('Compound 8언어', '심볼당', '3,100', False),
             ('슬롯전환', '건당', '3,000', False),
             ('그룹재생', '건당', '5,000', False),
             ('게임', '건당', '60,000', True),
             ('프롬프트 편집', '건당', '50,000', False),
             ('발음평가 편집', '건당', '50,000', False))
# 필기펜 4항목 `PC-084` — action 변경 편집·교원구몬/KEP 는 폐지
PRICE_NWP = (('Ncode 적용', '페이지당', '500', False),
             ('기본 편집', '심볼당', '1,000', False),
             ('Custom', '심볼당', '1,500', False),
             ('노트서버 업로드', '건당', '10,000', False))

MEMOS = (('3', '요청', '고객사', '2026-08-24 16:20', '김순정', '범블비 전집 OID 북코드 33권 추가 발급 요청'),
         ('2', '처리', '내부', '2026-08-22 11:05', '김순정', 'S3/O17 Book 431~464 할당 완료 · 티켓 전달'),
         ('1', '메모', '내부', '2026-08-20 09:41', '박지훈', '2026년 편집 단가 협의 — 편집/게임 2항목 전용가 적용'))



def fld(label, req, val, ro=False, ph=False, err=False):
    cls = 'inp'
    if ro:
        cls += ' ro'
    if ph:
        cls += ' ph'
    if err:
        cls += ' err'
    r = ' <span style="color:#dc2626">*</span>' if req else ''
    return ('<div class="fld"><span class="lbl">%s%s</span><div class="%s">%s</div></div>'
            % (label, r, cls, val))



def price_card(n_custom=2):   # 전용 단가 예시 = 편집 · 게임 2항목 `PC-115`
    """항목별 단가 입력 — 2열 그리드. 기본값과 다르면 주황으로 강조된다."""
    def group(title, note, items, tone):
        # 소리펜·필기펜은 정산 단위가 다른 별개 묶음이라 카드로 나눠 색을 달리한다
        cells = ''
        n_own = 0
        for nm, unit, v, own in items:
            if own:
                n_own += 1
            cells += ('<label style="display:flex;align-items:center;gap:6px;font-size:12px">'
                      '<span style="flex:1;color:%s;%s">%s '
                      '<span style="color:#9ca3af;font-size:10.5px">%s</span></span>'
                      '<div class="inp" style="width:92px;text-align:right;padding:5px 8px;%s">'
                      '%s</div></label>'
                      % ('#b45309' if own else '#4b5563',
                         'font-weight:700' if own else '', nm, unit,
                         'border-color:#f59e0b;background:#fffbeb;' if own else '', v))
        fg, bg, bd = tone
        badge = ''
        if n_own:
            badge = ('<span class="tag y">전용 %d</span>'
                     '<span class="lnk" style="font-size:11px">기본값</span>' % n_own)
        return ('<div style="border:1px solid %s;border-radius:10px;overflow:hidden;'
                'margin-top:12px">'
                '<div style="display:flex;align-items:center;gap:7px;padding:9px 12px;'
                'background:%s;border-bottom:1px solid %s">'
                '<b style="font-size:12.5px;color:%s">%s</b>'
                '<span style="font-size:11px;color:#9ca3af">%s · %d항목</span>'
                '<span style="flex:1"></span>%s</div>'
                '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 14px;'
                'padding:11px 12px">%s</div></div>'
                % (bd, bg, bd, fg, title, note, len(items), badge, cells))
    badge = ('<span class="tag y">전용 %d항목</span>' % n_custom) if n_custom else ''
    return ('<div class="card"><div class="hd">편집 단가 (2026 항목별) '
            '<span style="font-size:11px;color:#9ca3af;font-weight:400">'
            '· 기본값에서 바꾼 항목만 전용 단가</span> %s<div class="sp"></div>'
            '<span class="btn sm">전체 기본값</span></div>'
            '<div class="bd" style="padding-top:6px">%s%s'
            '<div style="font-size:11px;color:#9ca3af;margin-top:8px;line-height:1.6">'
            '편집 프로젝트의 청구액이 이 단가로 계산됩니다(항목 수량 × 단가). '
            '단가를 바꾸면 <b>이후 등록되는 교재(책)부터 적용</b>되고, '
            '<b>기존 교재는 등록 당시 단가가 그대로 유지</b>됩니다. '
            '교재별 할인은 <b>편집 프로젝트 &gt; 교재 수정</b>에서. <code>PC-027</code></div>'
            '</div></div>'
            % (badge,
             group('🔊 소리펜', 'ncp2 산출 · mp3 심볼', PRICE_NSP,
                   ('#1d4ed8', '#f5f9ff', '#dbeafe')),
             group('✍ 필기펜', '필기 인식 · APP 연동', PRICE_NWP,
                   ('#7e22ce', '#faf5ff', '#e9d5ff'))))


def docs_card():
    return ('<div class="card"><div class="hd">관련 서류<div class="sp"></div>'
            '<span class="btn sm">＋ 서류 추가</span></div><div class="bd" style="padding:0">'
            '<table><tr><th>항목명</th><th style="width:210px">파일</th>'
            '<th style="width:56px">작업</th></tr>'
            '<tr><td>사업자등록증</td><td style="color:#5f8ff0">wj_biz_license.pdf</td>'
            '<td><span class="lnk" style="color:#dc2626">삭제</span></td></tr>'
            '<tr><td>통장 사본</td><td style="color:#5f8ff0">wj_bank.jpg</td>'
            '<td><span class="lnk" style="color:#dc2626">삭제</span></td></tr>'
            '<tr><td>2026 단가 합의서</td><td style="color:#5f8ff0">wj_price_2026.pdf</td>'
            '<td><span class="lnk" style="color:#dc2626">삭제</span></td></tr>'
            '</table></div></div>')


def memo_card(draft='', hi=None):
    rows = ''
    for no, kind, who, ts, writer, txt in MEMOS:
        cls = {'요청': 'tag b', '처리': 'tag g', '메모': 'tag'}[kind]
        mine = writer == '김순정'
        acts = ('<span class="lnk">수정</span><span class="lnk" style="color:#dc2626">삭제</span>'
                if mine else '<span style="color:#cbd5e1;font-size:11px">본인 글만 수정</span>')
        bg = ' style="background:#fff7ed"' if hi == no else ''
        rows += ('<tr%s><td style="color:#9ca3af">%s</td><td><span class="%s">%s</span></td>'
                 '<td style="font-size:11.5px;color:#6b7280">%s<br>%s</td>'
                 '<td>%s</td><td style="white-space:nowrap">%s</td></tr>'
                 % (bg, no, cls, kind, writer, ts, txt, acts))
    dv = draft or '<span style="color:#9ca3af">내용 입력 · Enter 기록 · Shift+Enter 줄바꿈</span>'
    return ('<div class="card" style="height:100%%"><div class="hd">업무요청 메모 '
            '<div class="sp"></div>'
            '<span style="font-size:11px;color:#9ca3af;font-weight:400">수정 화면 전용 · 탭과 무관하게 고정</span></div>'
            '<div class="bd" style="padding:12px 14px">'
            '<div class="row" style="gap:6px;margin-bottom:8px">'
            '<span class="chip on">요청</span><span class="chip">처리</span><span class="chip">메모</span></div>'
            '<div class="inp" style="min-height:56px">%s</div>'
            '<div style="font-size:11px;color:#9ca3af;margin-top:6px">'
            'Enter 기록 · Shift+Enter 줄바꿈 · <b>본인이 작성한 메모만</b> 수정·삭제할 수 있습니다.</div>'
            '</div><div style="padding:0 0 4px">'
            '<table><tr><th style="width:34px">No</th><th style="width:60px">종류</th>'
            '<th style="width:120px">작성자 / 시각</th><th>내용</th>'
            '<th style="width:100px">작업</th></tr>%s</table></div></div>' % (dv, rows))




# ══ 새 화면 구조 — 머리말 + 섹션 메뉴 | 본문 `PC-136`~`PC-144` ══════════════════

CO = '웅진씽크빅'
# (이름, 이메일, 활성, CasterN 권한 수(None=사용 안 함), 최근 접속, 대장, App Key)
ACCS = (('김태호', 'kim@wjthinkbig.com', True, 6, '10-14 접속', False, ''),
        ('편집팀', 'edit01@wjthinkbig.com', True, 3, '10-02 접속', False, ''),
        ('이전 담당', 'old@wjthinkbig.com', False, 6, '접속 기록 없음', False, ''))
PERMS = (('프로젝트 생성', 'project_new'), ('심볼 편집', 'symbol_edit'), ('리소스 편집', 'resource_edit'),
         ('Ncode PDF 내보내기', 'export_ncode_pdf'), ('NCP2 내보내기', 'export_ncp2'),
         ('App용 패키지 내보내기', 'export_app_package'))
CARD = 'background:#fff;border:1px solid #e5e7eb;border-radius:12px'


def tg(text, bg, fg, bold=True):
    return ('<span style="font-size:11px;background:%s;color:%s;border-radius:5px;padding:2px 8px;'
            'white-space:nowrap;%s">%s</span>' % (bg, fg, 'font-weight:700' if bold else '', text))


def header(new=False, closed=False, popover=False, name=CO, n_acc=3, n_on=2, svc='casterN'):
    """머리말 — 업체명 · 구분 · 요약 · 진행중/사업 종료 · ⋯(또는 [취소][등록])"""
    nm = (name or '새 고객사')
    cls = tg('하위 고객사', '#f3e8ff', '#7e22ce') if name else ''
    newtag = tg('등록 중', '#fff7ed', '#c2410c') if new else ''
    summ = ('<div style="display:flex;gap:16px;margin-left:8px;color:#6b7280;font-size:12.5px">'
            '<span>사용 서비스 <b style="color:#111827">%s</b></span>'
            '<span>서비스 계정 <b style="color:#111827">%d명</b> (활성 %d)</span>%s'
            '<span>편집 단가 <b style="color:#111827">%s</b></span></div>'
            % (svc or '없음', n_acc, n_on, '' if new else '<span>업무 메모 <b style="color:#111827">5건</b></span>',
               '기본' if new else '전용 2항목'))
    seg = ('<div style="display:inline-flex;border:1px solid #e5e7eb;border-radius:999px;overflow:hidden">'
           '<span style="padding:6px 14px;font-size:12.5px;%s">진행중</span>'
           '<span style="padding:6px 14px;font-size:12.5px;border-left:1px solid #e5e7eb;%s">사업 종료</span></div>'
           % ('background:#fff;color:#9ca3af' if closed else 'background:#ecfdf5;color:#047857;font-weight:700',
              'background:#fef2f2;color:#b91c1c;font-weight:700' if closed else 'background:#fff;color:#9ca3af'))
    pop = ''
    if popover:
        pop = ('<div style="position:absolute;right:0;top:calc(100% + 6px);width:340px;' + CARD + ';'
               'box-shadow:0 12px 32px rgba(15,23,42,.14);padding:14px;z-index:5">'
               '<b style="font-size:13px">사업 종료로 바꿀까요?</b>'
               '<div style="font-size:11.5px;color:#6b7280;margin:4px 0 10px;line-height:1.6">코드 발급 이력만 유지되고, '
               '목록·코드 프로젝트에서 비활성(회색)으로 표시됩니다.</div>'
               '<div class="inp">스마트펜 사업 정리 · 엠베스트-28로 코드 이관</div>'
               '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px">'
               '<span class="btn gho">취소</span><span class="btn dan">사업 종료</span></div></div>')
    right = ('<span class="btn gho">취소</span><span class="btn pri">등록</span>' if new
             else '<span class="btn gho" style="padding:5px 11px">⋯</span>')
    return ('<div style="' + CARD + ';padding:12px 16px;display:flex;align-items:center;gap:10px;margin-bottom:12px">'
            '<span class="btn gho" style="padding:5px 11px">←</span>'
            '<div style="font-size:20px;font-weight:800;color:%s">%s</div>%s%s%s'
            '<span style="flex:1"></span><div style="position:relative">%s%s</div>%s</div>'
            % ('#111827' if name else '#c7cdd6', nm, cls, newtag, summ, seg, pop, right))


NAVS = (('base', '기본 정보', '', '고객사 정보'), ('rate', '편집 단가', '전용 2', ''), ('docs', '관련 서류', '3', ''),
        ('acc', '서비스 계정', 'casterN · 3', '운영'), ('memo', '업무 메모', '5', ''))


def nav(active='base', new=False, locked=False, dirty=()):
    out = ''
    for v, label, badge, grp in NAVS:
        if new:
            badge = {'rate': '', 'docs': '', 'acc': '0', 'memo': ''}.get(v, badge)
        if grp:
            out += ('<div style="font-size:10.5px;color:#9ca3af;padding:%s;%s">%s</div>'
                    % ('6px 12px 2px' if v == 'base' else '10px 12px 2px',
                       '' if v == 'base' else 'border-top:1px solid #eef0f4;margin-top:6px', grp))
        on = v == active
        lk = locked and v == 'acc'
        dot = ('<span style="width:7px;height:7px;border-radius:50%;background:#f59e0b"></span>' if v in dirty else '')
        b = ('<span style="font-size:10.5px;border-radius:999px;padding:1px 8px;font-weight:700;background:%s;color:%s">%s</span>'
             % ('#dbeafe' if on else '#f3f4f6', '#1d4ed8' if on else '#6b7280', badge)) if badge else ''
        out += ('<div style="display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:9px;font-size:13px;'
                'background:%s;color:%s;font-weight:%s">%s<span style="flex:1"></span>%s%s</div>'
                % ('#eef6ff' if on else 'transparent', '#c7cdd6' if lk else ('#1d4ed8' if on else '#374151'),
                   '700' if on else '400', label, dot, b))
    return '<div style="' + CARD + ';padding:8px">' + out + '</div>'


def layout(head, nv, body):
    return (head + '<div style="display:grid;grid-template-columns:210px minmax(0,1fr);gap:12px;align-items:start">'
            + nv + '<div style="min-width:0">' + body + '</div></div>')


def sec_card(title, desc, inner, new=False, dirty=False):
    """섹션 카드 — 머리 · 본문 · 아래 [취소][저장] (등록 화면은 [취소][등록])"""
    ft = ('<span style="font-size:12px;color:#b45309">● 저장하지 않은 변경이 있습니다</span>' if dirty else '')
    btns = ('<span class="btn gho">취소</span><span class="btn pri">등록</span>' if new
            else '<span class="btn gho"%s>취소</span><span class="btn pri">저장</span>'
            % ('' if dirty else ' style="opacity:.5"'))
    return ('<div style="' + CARD + '"><div style="padding:13px 18px;border-bottom:1px solid #eef0f4;display:flex;'
            'align-items:center;gap:8px"><b style="font-size:14px">%s</b><span style="font-size:11.5px;color:#9ca3af">%s</span></div>'
            '<div style="padding:16px 18px">%s</div><div style="padding:11px 18px;border-top:1px solid #eef0f4;display:flex;'
            'align-items:center;gap:8px">%s<span style="flex:1"></span>%s</div></div>' % (title, desc, inner, ft, btns))


def common_block(parent=False, empty=False):
    items = [('Common-21', 'PDS2 · S3/O21', False, False), ('네오노트-0-27', 'PDS3 · S0/O27', False, False),
             ('네오노트-3-27', 'PDS3 · S3/O27', True, False), ('네오노트-1012', 'PDS3 · S3/O1012', False, False),
             ('스마트클래스키트-1013', 'PDS3 · S3/O1013', False, False)]
    if empty:
        items = [(n, l, False, d) for n, l, _c, d in items]
    if parent:
        items[0] = ('Common-21 ' + tg('대표(자기) 코드', '#e5e7eb', '#6b7280'), 'PDS2 · S3/O21', False, True)
    li = ''.join('<label style="display:flex;align-items:flex-start;gap:9px;border:1px solid %s;background:%s;'
                 'border-radius:9px;padding:9px 11px;font-size:12.5px;opacity:%s"><input type="checkbox"%s%s style="margin-top:2px">'
                 '<span><b style="color:%s">%s</b><div style="font-size:11px;color:#9ca3af;margin-top:2px">%s</div></span></label>'
                 % ('#bfdbfe' if (ck and not dis) else '#eef0f4', '#f3f4f6' if dis else ('#f5f9ff' if ck else '#fafbfc'),
                    '0.55' if dis else '1', ' checked' if (ck and not dis) else '', ' disabled' if dis else '',
                    '#9ca3af' if dis else ('#1e3a8a' if ck else '#374151'), nm, lb) for nm, lb, ck, dis in items)
    note = ('<div class="toast warn" style="margin:8px 0 0">대표(상위) 회사는 <b>자기 코드의 하위가 될 수 없어</b> 해당 항목이 비활성입니다.</div>'
            if parent else
            '<div style="font-size:11px;color:#9ca3af;margin-top:6px;line-height:1.7">선택하면 이 고객사가 해당 공통코드의 '
            '<b>사용 고객사(하위)</b>로 등록됩니다. 이미 발급된 공통코드를 쓰므로 코드 할당은 없습니다.</div>')
    return ('<div style="margin-top:18px;padding-top:16px;border-top:1px solid #eef0f4">'
            '<div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:8px">공통코드 사용 고객사 (하위 등록) '
            '<span style="color:#9ca3af;font-weight:400">· 대표 회사 아래로 귀속 · 코드 할당 불필요</span></div>'
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' + li + '</div>' + note + '</div>')


def base_section(new=False, err=False, dirty=False, parent=False, edited=False):
    vals = dict((lb, v) for lb, _r, v in BASIC)
    if edited:
        vals['담당자'] = '박민수'
    fs = ''
    for lb, req, _v in BASIC:
        ph = {'업체명': '업체명을 입력하세요', '담당자': '담당자명', '연락처': '02-0000-0000', '사업자등록증번호': '000-00-00000',
              '주소': '주소', '은행명': '은행명', '계좌번호': '계좌번호', '세금계산서 발행용 이메일': 'tax@company.com'}[lb]
        full = lb in ('주소', '세금계산서 발행용 이메일')
        empty = new and not (err is False and lb == '업체명' and new == 'named')
        v = ph if (new and not (new == 'named' and lb == '업체명')) else vals[lb]
        cls = 'inp' + (' ph' if (new and not (new == 'named' and lb == '업체명')) else '') + (' err' if (err and lb == '업체명') else '')
        fs += ('<div class="fld"%s><span class="lbl">%s%s</span><div class="%s">%s</div>%s</div>'
               % (' style="grid-column:1/-1"' if full else '', lb, ' <span style="color:#dc2626">*</span>' if req else '',
                  cls, v, '<div class="inline-err">업체명은 필수입니다.</div>' if (err and lb == '업체명') else ''))
    hint = ('<div style="font-size:11.5px;color:#9ca3af;margin-top:12px">업체명을 입력하면 왼쪽 <b>서비스 계정</b>에서 계정을 '
            '추가할 수 있습니다. 계정을 추가하면 고객사가 함께 등록됩니다.</div>' if new else '')
    inner = ('<div class="g2" style="gap:12px;max-width:900px">' + fs + '</div>' + common_block(parent, empty=bool(new)) + hint)
    return sec_card('기본 정보', '· 필수는 업체명', inner, new=bool(new), dirty=dirty)


def acc_card_list(sel=0, adding=False, accs=ACCS, new=False):
    rows = ''
    for i, (nm, mail, on, n, last, seeded, _k) in enumerate(accs):
        cur = (i == sel and not adding)
        rows += ('<div style="border:1px solid %s;background:%s;border-radius:10px;padding:10px 12px;margin-bottom:8px">'
                 '<div style="display:flex;align-items:center;gap:6px"><b style="font-size:13.5px">%s</b>%s</div>'
                 '<div style="font-family:ui-monospace,monospace;font-size:11.5px;color:#6b7280;margin-top:2px">%s</div>'
                 '<div style="display:flex;align-items:center;gap:6px;margin-top:7px">%s%s'
                 '<span style="margin-left:auto;font-size:11px;color:#9ca3af">%s</span></div></div>'
                 % ('#5f8ff0' if cur else '#eef0f4', '#f5f9ff' if cur else '#fff', nm,
                    tg('대장', '#f0fdfa', '#0f766e') if seeded else '', mail,
                    tg('활성', '#ecfdf5', '#047857') if on else tg('비활성', '#f3f4f6', '#6b7280'),
                    tg('CasterN %d/6' % n, '#eef6ff', '#2563eb') if n is not None else tg('권한 없음', '#f3f4f6', '#9ca3af'),
                    last))
    if not accs:
        rows = ('<div style="font-size:12px;color:#9ca3af;padding:24px 0;text-align:center;line-height:1.7">'
                '등록된 계정이 없습니다.<br>[＋ 계정 추가]로 등록하세요.</div>')
    n_on = sum(1 for a in accs if a[2])
    return ('<div style="' + CARD + '"><div style="padding:13px 16px;border-bottom:1px solid #eef0f4;display:flex;'
            'align-items:center;gap:8px"><b style="font-size:14px">서비스 계정</b><span style="font-size:11.5px;color:#9ca3af">'
            '%d명 · 활성 %d</span><span style="flex:1"></span><span class="btn pri" style="padding:6px 12px;font-size:12.5px">＋ 계정 추가</span></div>'
            '<div style="padding:12px">%s</div></div>' % (len(accs), n_on, rows))


def area(t, d='', top=18):
    return ('<div style="display:flex;align-items:baseline;gap:8px;margin:%dpx 0 8px"><b style="font-size:13px">%s</b>'
            '<span style="font-size:11.5px;color:#9ca3af">%s</span></div>' % (top, t, d))


def perm_box(cast_on=True, n=6, tab='CASTERN'):
    def tab_btn(v, label, on, cnt, soon):
        cur = v == tab
        return ('<span style="display:inline-flex;align-items:center;gap:6px;padding:11px 12px 9px;font-size:12.5px;'
                'font-weight:%s;color:%s;border-bottom:2px solid %s"><span style="width:7px;height:7px;border-radius:50%%;background:%s"></span>%s%s%s</span>'
                % ('700' if cur else '500', '#1d4ed8' if cur else '#6b7280', '#2563eb' if cur else 'transparent',
                   '#10b981' if on else '#d1d5db', label,
                   (' <span style="font-size:10.5px;color:#2563eb;background:#eef6ff;border-radius:999px;padding:0 7px;font-weight:700">%s</span>' % cnt) if cnt else '',
                   ' <span style="font-size:10px;color:#c2410c;background:#fff7ed;border-radius:999px;padding:0 7px;font-weight:700">준비중</span>' if soon else ''))
    bar = ('<div style="display:flex;gap:2px;padding:0 6px;background:#fafbfc;border-bottom:1px solid #eef0f4">'
           + tab_btn('CASTERN', 'CasterN', cast_on, ('%d/6' % n) if cast_on else '', False)
           + tab_btn('FORM', '폼솔루션', False, '', True) + '</div>')
    if tab == 'CASTERN':
        on = cast_on
        sw = ('<span style="width:40px;height:22px;border-radius:11px;background:%s;position:relative;flex:none;display:inline-block">'
              '<span style="position:absolute;top:2px;left:%dpx;width:18px;height:18px;border-radius:50%%;background:#fff"></span></span>'
              % ('#2563eb' if on else '#d1d5db', 20 if on else 2))
        cells = ''
        for i, (lb, k) in enumerate(PERMS):
            sel = on and i < n
            cells += ('<div style="display:flex;gap:8px;align-items:flex-start;border:1px solid %s;background:%s;border-radius:10px;padding:9px 11px">'
                      '<span style="width:16px;height:16px;border-radius:4px;border:1px solid %s;background:%s;color:#fff;font-size:11px;'
                      'display:grid;place-items:center;flex:none">%s</span><span><span style="display:block;font-size:12.5px;font-weight:%s;color:%s">%s</span>'
                      '<span style="display:block;font-size:10.5px;color:#9ca3af;font-family:ui-monospace,monospace">%s</span></span></div>'
                      % ('#93c5fd' if sel else '#e5e7eb', '#f0f6ff' if sel else '#fff', '#2563eb' if sel else '#cbd5e1',
                         '#2563eb' if sel else '#fff', '✓' if sel else '', '700' if sel else '500',
                         '#1d4ed8' if sel else '#374151', lb, k))
        body = ('<div style="display:flex;align-items:center;gap:12px">' + sw +
                '<div><div style="font-size:13px;font-weight:700;color:%s">CasterN %s</div>'
                '<div style="font-size:11.5px;color:#9ca3af">[편집 프로젝트]의 대상이 되고, 이 고객사 계정에 CasterN 사용 권한을 줄 수 있습니다</div></div>'
                '<span style="flex:1"></span><span class="btn sm" style="opacity:%s">%s</span></div>'
                '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:14px;opacity:%s">%s</div>'
                % ('#111827' if on else '#6b7280', '사용' if on else '사용 안 함', '1' if on else '.4',
                   '모두 해제' if n == 6 else '모두 선택', '1' if on else '.45', cells))
    else:
        sw = ('<span style="width:40px;height:22px;border-radius:11px;background:#d1d5db;position:relative;display:inline-block">'
              '<span style="position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:#fff"></span></span>')
        body = ('<div style="display:flex;align-items:center;gap:12px">' + sw +
                '<div><div style="font-size:13px;font-weight:700;color:#6b7280">폼솔루션 사용 안 함</div>'
                '<div style="font-size:11.5px;color:#9ca3af">폼솔루션 서비스 관리 화면에 나타납니다</div></div></div>'
                '<div style="margin-top:14px;font-size:12px;color:#9ca3af;border:1px dashed #e5e7eb;border-radius:10px;'
                'padding:18px 14px;text-align:center">이 서비스의 권한 항목은 아직 정의되지 않았습니다.</div>')
    return (area('서비스 권한', '· 켠 서비스가 이 고객사의 사용 서비스가 됩니다') +
            '<div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">' + bar +
            '<div style="padding:14px 16px">' + body + '</div></div>')


def acc_detail(mode='edit', acc=ACCS[0], cast_on=True, n=6, tab='CASTERN', err='', dirty=False, new_draft=False, id_val=''):
    nm, mail, on, _n, last, seeded, key = acc
    isnew = mode == 'new'

    def f(lb, v, ro=False, ph=False, extra=''):
        return ('<div class="fld"><span class="lbl">%s</span><div class="inp%s%s" style="%s">%s%s</div></div>'
                % (lb, ' ro' if ro else '', ' ph' if ph else '', 'justify-content:space-between' if extra else '', v, extra))
    gen = '<span class="btn sm">임의 생성</span>'
    seg = ('<div class="fld"><span class="lbl">계정 상태</span><div style="display:inline-flex;border:1px solid #e5e7eb;'
           'border-radius:999px;overflow:hidden;align-self:flex-start"><span style="padding:6px 16px;font-size:12.5px;%s">활성</span>'
           '<span style="padding:6px 16px;font-size:12.5px;%s">비활성</span></div></div>'
           % ('background:#ecfdf5;color:#047857;font-weight:700' if (on or isnew) else 'color:#9ca3af',
              'color:#9ca3af' if (on or isnew) else 'background:#f3f4f6;color:#374151;font-weight:700'))
    if isnew:
        grid = (f('ID (이메일) *', id_val or 'user@company.com', ph=not id_val) +
                f('PWD (비밀번호) *', '비밀번호 미요청 시 임의 생성', ph=True, extra=gen) +
                f('NAME (담당자명)', '', ph=True) + seg)
    else:
        grid = (f('ID (이메일) *', mail, ro=True) + f('PWD (비밀번호) *', '••••••••', extra=gen) +
                f('NAME (담당자명)', nm) + seg)
    info = ''
    if not isnew:
        info = (area('접속 · 이력') + '<div style="border:1px solid #eef0f4;border-radius:10px;padding:12px 14px;display:grid;'
                'grid-template-columns:110px 1fr;gap:6px 10px;font-size:12.5px"><span style="color:#6b7280">최근 접속일</span>'
                '<span style="font-family:ui-monospace,monospace">%s</span><span style="color:#6b7280">등록일</span>'
                '<span style="font-family:ui-monospace,monospace">2026-08-20</span></div>'
                % ('2026-10-14 09:12' if last.endswith('접속') else '<span style="color:#9ca3af">접속 기록 없음</span>'))
    e = ('<div style="font-size:12px;color:#dc2626;margin-top:10px">%s</div>' % err) if err else ''
    head = (('<b style="font-size:14px">서비스 계정 추가</b><span style="font-size:11.5px;color:#9ca3af">%s</span>' % (CO if not new_draft else '새 고객사 · 에듀테크랩'))
            if isnew else
            ('<b style="font-size:14px">%s</b><span style="font-size:11.5px;color:#9ca3af;font-family:ui-monospace,monospace">%s</span>' % (nm, mail)))
    ft_left = ('' if isnew else '<span class="btn gho" style="color:#dc2626;border-color:#fecaca">계정 삭제</span>')
    ft_left += ('<span style="font-size:12px;color:#b45309">● 저장하지 않은 변경이 있습니다</span>' if dirty else '')
    ft_left += ('<span style="font-size:11.5px;color:#9ca3af">계정을 추가하면 고객사가 함께 등록됩니다</span>' if (isnew and new_draft) else '')
    ft_right = ('<span class="btn gho">취소</span><span class="btn pri">계정 추가</span>' if isnew
                else '<span class="btn gho"%s>취소</span><span class="btn pri">저장</span>' % ('' if dirty else ' style="opacity:.5"'))
    return ('<div style="' + CARD + '"><div style="padding:13px 16px;border-bottom:1px solid #eef0f4;display:flex;align-items:center;gap:8px">'
            + head + '</div><div style="padding:14px 16px">' + area('기본 정보', top=0) +
            '<div class="g2" style="gap:12px">' + grid + '</div>' + perm_box(cast_on, n, tab) + info + e +
            '</div><div style="padding:11px 16px;border-top:1px solid #eef0f4;display:flex;align-items:center;gap:8px">'
            + ft_left + '<span style="flex:1"></span>' + ft_right + '</div></div>')


def acc_section(list_html, detail_html):
    return ('<div style="display:grid;grid-template-columns:300px minmax(0,1fr);gap:12px;align-items:start">'
            + list_html + detail_html + '</div>')


def memo_section():
    m = memo_card()
    return m


FR = '고객사 상세 · 수정'
FN = '고객사 등록'


def build():
    B = []
    H = header()

    # ── 등록 ──
    B.append(('S1', '등록 — 기본 정보 (서비스 계정 잠김)', '기본',
              '<code>MEM-01</code> <b>[＋ 고객사 등록]</b>으로 진입. 「머리말 + 섹션 메뉴 | 본문」 구조이고 기본 정보부터 연다. '
              '<b>업체명 필수</b>이며, 업체명을 넣기 전에는 <b>서비스 계정 메뉴가 잠겨</b> 있다 <code>PC-139</code>. 업무 메모는 등록 뒤에 쓴다.',
              frame('MEM-01', FN, layout(header(new=True, name='', n_acc=0, n_on=0, svc=''), nav('base', new=True, locked=True),
                                          base_section(new=True)), height=1200),
              [('업체명', '입력 (필수)', '—', '코드·프로젝트가 이 이름으로 연결된다'),
               ('서비스 계정 (메뉴)', '클릭', '<b>잠김</b>', '<b>기본 정보(업체명)를 먼저 입력하세요.</b> · 기본 정보로 돌아간다'),
               ('머리말 [등록]', '클릭', '고객사만 등록 → 상세(기본 정보)', '입력한 모든 섹션 함께 저장 · <code>LOG-01</code>'),
               ('머리말 [취소]', '클릭', '<code>MEM-01</code>', '아무것도 저장되지 않는다'),
               ('진행중 / 사업 종료', '선택', '—', '등록 때 함께 저장')]))
    B.append(('S2', '등록 — 업체명 미입력', '오류',
              '업체명 없이 [등록]하면 막는다. 입력란에도 오류를 표시한다.',
              frame('MEM-01', FN, '<div class="toast err">업체명은 필수입니다.</div>' +
                    layout(header(new=True, name='', n_acc=0, n_on=0, svc=''), nav('base', new=True, locked=True),
                           base_section(new=True, err=True)), height=1240),
              [('[등록]', '클릭', '<b>차단</b>', '<b>업체명은 필수입니다.</b>'),
               ('업체명 입력란', '표시', '오류 강조', '값을 넣으면 해제')]))
    B.append(('S3', '등록 — 서비스 계정에서 계정 추가', '분기',
              '업체명을 넣으면 서비스 계정이 열린다. 여기서 <b>[계정 추가]</b>를 누르면 <b>고객사와 그 계정을 함께 바로 등록</b>하고 '
              '상세 화면의 서비스 계정 섹션(S12)을 연다 — 「임시」 계정은 없다 <code>PC-142</code>.',
              frame('MEM-01', FN, layout(header(new=True, name='에듀테크랩', n_acc=0, n_on=0, svc=''), nav('acc', new=True),
                                          acc_section(acc_card_list(accs=(), adding=True),
                                                      acc_detail('new', cast_on=True, n=6, new_draft=True))), height=1100),
              [('ID (이메일) · PWD (비밀번호)', '입력 (필수)', '—', '이메일 형식 · 전체에서 유일 · [임의 생성]'),
               ('서비스 권한', '선택', 'CasterN 사용 · 권한 6종', '켠 서비스가 고객사의 사용 서비스가 된다 <code>PC-138</code>'),
               ('[계정 추가]', '클릭', '<b>고객사 + 계정 등록</b> → 상세(서비스 계정)', '<code>/companies/{id}?sec=acc</code> <code>PC-142</code>')]))

    # ── 상세 · 고객사 정보 ──
    B.append(('S4', '상세 — 기본 정보', '기본',
              '<code>MEM-01</code> 행 클릭으로 진입. 기본 정보 섹션에 업체 정보와 <b>공통코드 사용 고객사</b>가 있고, 아래 [저장]은 <b>이 섹션만</b> 저장한다 '
              '<code>PC-136</code>. 머리말 오른쪽에서 진행중/사업 종료를 바꾼다(S9).',
              frame('MEM-01', FR, layout(H, nav('base'), base_section()), height=1200),
              [('섹션 메뉴', '클릭', '그 섹션 본문', '고객사 정보(기본 정보 · 편집 단가 · 관련 서류) / 운영(서비스 계정 · 업무 메모)'),
               ('공통코드 체크', '체크', '하위 고객사 등록', '기본 정보 [저장] 때 함께 반영 · 코드 할당 없음'),
               ('[저장]', '클릭', '기본 정보만 저장', '<b>저장됨 · 기본 정보</b> · <code>LOG-01</code>'),
               ('⋯ [고객사 삭제]', '클릭', '삭제 확인(업체명 재입력)', '<code>MEM-01</code>')]))
    B.append(('S5', '저장하지 않은 변경', '분기',
              '고치고 저장하지 않으면 <b>메뉴에 ●</b>, 본문 아래에 안내가 붙는다. [취소]는 마지막 저장값으로 되돌린다. 섹션은 서로 따로 저장된다.',
              frame('MEM-01', FR, layout(H, nav('base', dirty=('base',)), base_section(dirty=True, edited=True)), height=1200),
              [('메뉴 ●', '표시', '—', '저장 안 한 섹션'),
               ('[취소]', '클릭', '되돌림', '마지막 저장값'),
               ('다른 섹션 이동', '클릭', '값 유지', '화면을 떠나면 사라진다')]))
    B.append(('S6', '대표(상위) 회사 — 자기 공통코드 비활성', '분기',
              '대표(상위) 회사는 자기 코드의 하위가 될 수 없어 해당 공통코드가 비활성이다 <code>PC-015</code>.',
              frame('MEM-01', FR, layout(H, nav('base'), base_section(parent=True)), height=1240),
              [('자기 보유 공통코드', '—', '<b>비활성</b>', '선택 불가'), ('다른 공통코드', '체크', '하위 등록', '')]))
    B.append(('S7', '편집 단가', '분기',
              '소리펜 · 필기펜 그룹 카드. 기본값에서 바꾼 항목만 전용 단가(주황)이고 그룹·전체 [기본값]으로 되돌린다. 변경은 <b>이후 등록되는 교재부터</b> 적용 <code>PC-027</code>.',
              frame('MEM-01', FR, layout(H, nav('rate'), price_card(2) +
                    '<div class="row" style="justify-content:flex-end;gap:8px;margin-top:10px"><span class="btn gho" style="opacity:.5">취소</span><span class="btn pri">저장</span></div>'),
                    height=1300),
              [('단가 입력', '입력', '전용 단가', '기본값과 다르면 강조'), ('[저장]', '클릭', '편집 단가만 저장', '')]))
    B.append(('S8', '관련 서류', '분기', '서류 항목명을 고치고 파일을 붙인다. [저장]으로 이 섹션만 저장한다.',
              frame('MEM-01', FR, layout(H, nav('docs'), docs_card() +
                    '<div class="row" style="justify-content:flex-end;gap:8px;margin-top:10px"><span class="btn gho" style="opacity:.5">취소</span><span class="btn pri">저장</span></div>'),
                    height=900),
              [('[＋ 서류 추가]', '클릭', '빈 줄', ''), ('[삭제]', '클릭', '줄 제거', '')]))
    B.append(('S9', '사업 종료 전환', '분기',
              '머리말 오른쪽 <b>[사업 종료]</b>를 누르면 종료 사유 / 코드 이관 메모를 받는 창이 열리고 [사업 종료]로 <b>바로 저장</b>된다 <code>PC-139</code>.',
              frame('MEM-01', FR, layout(header(popover=True), nav('base'), base_section()), height=1200),
              [('[사업 종료]', '클릭', '사유 입력 창', ''),
               ('창 [사업 종료]', '클릭', '<b>바로 저장</b>', '<b>사업 종료로 바꿨습니다 · {업체명}</b>'),
               ('창 [취소]', '클릭', '닫힘', '변경 없음')]))
    B.append(('S10', '사업 종료 상태', '변형',
              '사업 종료면 머리말 전환이 붉게 표시되고, 마우스를 올리면 종료 사유가 보인다. [진행중]은 확인 후 바로 저장된다.',
              frame('MEM-01', FR, layout(header(closed=True), nav('base'), base_section()), height=1200),
              [('[진행중]', '클릭', '확인 후 바로 저장', '<b>진행중으로 바꿨습니다 · {업체명}</b>'),
               ('목록', '—', '회색 · 종료 배지', '코드 발급 이력은 보존')]))

    # ── 서비스 계정 ──
    B.append(('S11', '서비스 계정 — 카드 목록 | 상세', '기본',
              '「카드 목록 | 상세」. 카드를 고르면 오른쪽 상세에서 <b>기본 정보 · 서비스 권한 · 접속 · 이력</b>을 본다. 고친 뒤 <b>[저장]</b> <code>PC-136</code> <code>PC-141</code>.',
              frame('MEM-01', FR, layout(H, nav('acc'), acc_section(acc_card_list(0), acc_detail('edit'))), height=1150),
              [('카드', '클릭', '오른쪽 상세', '이름 · 이메일 · 활성/비활성 · CasterN n/6 · 최근 접속'),
               ('서비스 권한 탭', '클릭', 'CasterN / 폼솔루션', '탭 머리에 사용 점 · 권한 수 <code>PC-140</code>'),
               ('권한 카드', '클릭', '개별 지정', '[모두 선택]/[모두 해제]'),
               ('계정 상태', '선택', '활성 / 비활성', '비활성 = 서비스 로그인 불가 <code>PC-135</code>'),
               ('[저장]', '클릭', '그 계정만 저장', '<b>저장됨 · {ID}</b> · 사용 서비스 다시 계산 <code>PC-138</code>')]))
    B.append(('S12', '서비스 계정 — 계정 추가', '분기',
              '<b>[＋ 계정 추가]</b>를 누르면 오른쪽에 등록 폼이 나온다(모달 아님). 새 계정은 고객사의 현재 사용 서비스를 기본으로 켜고 CasterN 이면 권한 6종 모두. [계정 추가]로 <b>바로 저장</b>된다.',
              frame('MEM-01', FR, layout(H, nav('acc'), acc_section(acc_card_list(adding=True), acc_detail('new'))), height=1100),
              [('[계정 추가]', '클릭', '바로 저장', '<b>계정 추가됨 · {ID}</b>'), ('[취소]', '클릭', '상세로', '')]))
    B.append(('S13', '서비스 권한 — CasterN 사용 안 함', '변형',
              '사용 스위치를 끄면 권한 그리드가 <b>흐려지기만</b> 하고 자리를 지킨다 — 켜고 끌 때 화면이 밀리지 않는다 <code>PC-140</code>.',
              frame('MEM-01', FR, layout(H, nav('acc', dirty=()), acc_section(acc_card_list(1), acc_detail('edit', ACCS[1], cast_on=False, n=3, dirty=True))), height=1150),
              [('사용 스위치', '끔', '그리드 흐림', '저장하면 이 계정은 CasterN 을 쓰지 않는다'),
               ('모든 계정이 끔', '저장', '고객사 casterN 해제', '편집 프로젝트 대상에서 빠진다 <code>PC-138</code>')]))
    B.append(('S14', '서비스 권한 — 폼솔루션 탭', '변형', '폼솔루션은 준비중 — 권한 항목이 아직 없다.',
              frame('MEM-01', FR, layout(H, nav('acc'), acc_section(acc_card_list(0), acc_detail('edit', tab='FORM'))), height=1050),
              [('폼솔루션 사용', '켬', '폼솔루션 서비스 관리에 나타남', '권한 항목 없음')]))
    B.append(('S15', '계정 추가 오류', '오류', 'ID 는 이메일 형식이고 전체에서 유일해야 한다(키 발급 계정 포함). 비밀번호가 없으면 막는다.',
              frame('MEM-01', FR, layout(H, nav('acc'), acc_section(acc_card_list(adding=True),
                    acc_detail('new', id_val='kim@wjthinkbig.com', err='이미 등록된 ID(email)입니다.'))), height=1120),
              [('ID 중복', '[계정 추가]', '<b>차단</b>', '<b>이미 등록된 ID(email)입니다.</b>'),
               ('ID 형식', '[계정 추가]', '<b>차단</b>', '<b>ID 는 이메일 형식이어야 합니다.</b>'),
               ('PWD 없음', '[계정 추가]', '<b>차단</b>', '<b>비밀번호가 필요합니다. (요청 없으면 [임의 생성])</b>')]))
    dlg = ('<div class="ovl"><div class="mdl"><div class="mh"><div class="mt">계정 삭제</div><div class="mx">✕</div></div>'
           '<div style="font-size:13px;color:#374151;line-height:1.7">계정 edit01@wjthinkbig.com 을(를) 삭제할까요?</div>'
           '<div class="mf"><div class="btn gho">취소</div><div class="btn dan">삭제</div></div></div></div>')
    B.append(('S16', '계정 삭제 확인창', '확인창', '[계정 삭제]는 확인을 거친다. 연결된 App Key 도 함께 지워진다.',
              frame('MEM-01', FR, layout(H, nav('acc'), acc_section(acc_card_list(1), acc_detail('edit', ACCS[1], n=3))), overlay=dlg, height=1150),
              [('[삭제]', '클릭', '계정 제거', '사용 서비스 다시 계산 · <code>LOG-01</code>'), ('[취소] · ✕', '클릭', 'S11', '')]))
    B.append(('S17', '가입 승인 후 계정 추가', '분기',
              '<code>MEM-01</code> 가입 승인 카드의 <b>[계정 추가 →]</b>로 들어오면 서비스 계정 등록 폼이 열리고 SSO 이메일이 ID 칸에 들어가 있다 <code>PC-133</code>.',
              frame('MEM-01', FR, layout(H, nav('acc'), acc_section(acc_card_list(adding=True), acc_detail('new', id_val='teacher@newschool.kr'))), height=1100),
              [('ID (이메일)', '자동', 'SSO 이메일', '<code>?email=</code>'), ('[계정 추가]', '클릭', '바로 저장', '')]))

    # ── 업무 메모 ──
    B.append(('S18', '업무 메모', '기본', '고객사 전용 업무 원장. Enter 로 바로 기록하고, 본인 글만 수정·삭제한다.',
              frame('MEM-01', FR, layout(H, nav('memo'), memo_card(draft='범블비 전집 2차 33권 코드 재발급 요청 접수 — 8/28까지 회신 예정')), height=900),
              [('종류', '선택', '요청 / 처리 / 메모', ''), ('Enter', '입력', '바로 기록', 'Shift+Enter 줄바꿈'),
               ('본인 글', '클릭', '수정 · 삭제', '')]))
    err_ovl = ('<div class="ovl" style="background:none;place-items:start center;padding-top:16px"><div class="toast err" '
               'style="width:680px;margin:0">박지훈 님이 작성한 메모입니다. 본인 글만 수정할 수 있습니다.</div></div>')
    B.append(('S19', '남의 메모 수정 시도', '오류', '다른 직원이 쓴 메모는 수정·삭제할 수 없다.',
              frame('MEM-01', FR, layout(H, nav('memo'), memo_card(hi='1')), overlay=err_ovl, height=900),
              [('남의 메모', '수정·삭제', '<b>차단</b>', '<b>{작성자} 님이 작성한 메모입니다. 본인 글만 수정할 수 있습니다.</b>')]))
    memo_del = ('<div class="ovl"><div class="mdl"><div class="mh"><div class="mt">메모 삭제</div><div class="mx">✕</div></div>'
                '<div style="font-size:13px;color:#374151;line-height:1.7">메모 2번을 삭제할까요?</div>'
                '<div class="mf"><div class="btn gho">취소</div><div class="btn dan">삭제</div></div></div></div>')
    B.append(('S20', '메모 삭제 확인창', '확인창', '본인이 쓴 메모를 지울 때 확인을 거친다.',
              frame('MEM-01', FR, layout(H, nav('memo'), memo_card()), overlay=memo_del, height=900),
              [('[삭제]', '클릭', '메모 제거', ''), ('[취소] · ✕', '클릭', 'S18', '')]))

    intro = ('고객사를 <b>등록</b>하고 <b>상세·수정</b>하는 화면이다. 「<b>머리말 + 섹션 메뉴 | 본문</b>」 구조이며 '
             '섹션은 고객사 정보(기본 정보 · 편집 단가 · 관련 서류)와 운영(서비스 계정 · 업무 메모)이다 <code>PC-136</code>. '
             '<b>등록</b>은 한 번 — 머리말 [등록] 또는 서비스 계정 [계정 추가](고객사 함께 등록). 그 뒤는 <b>섹션·계정 단위로 저장</b>한다(PRD §4.8). '
             '진행 상태는 머리말 오른쪽 진행중/사업 종료 <code>PC-139</code>, 사용 서비스는 <b>서비스 계정의 서비스</b> <code>PC-138</code>, '
             '서비스 계정은 「카드 목록 | 상세」와 서비스 권한 탭 <code>PC-140</code>.')
    return page(CODE, NAME, PRD, intro, B)
