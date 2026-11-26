# -*- coding: utf-8 -*-
"""MEM-02 고객사 등록·수정 — 고객사 관리 3단 「고객사 | 섹션 메뉴 | 본문」 `PC-136`~`PC-144` `PC-204`.

등록(/companies/new) · 상세(/companies/{id}) 같은 구조. 섹션 = 고객사 정보(기본 정보 · 편집 단가 · 관련 서류 · 공통코드 · 확장 언어) / 운영(서비스 계정 · 서비스 티켓 · 업무 메모) `PC-358`.
공통코드 · 확장 언어(S27~S32) = 탭 [상위 고객사 (공통코드)] [확장 언어 그룹] `PC-362` — 확장 언어 그룹은 고객사당 기본 1개(그룹 하나) ·
지정하지 않은 코드는 단독(전용) 코드 · 하위 고객사는 상위 그룹 승계 `PC-373`, 할당 코드를 모두 펼친 「코드 지정」 `PC-364`,
공용 코드는 기본으로만 `PC-374` (web/components/CompanyCodesSection.tsx).
진행 상태는 머리말 오른쪽 진행중/사업 종료, 서비스 계정은 「카드 목록 | 상세」 + 서비스 권한 탭.
등록과 저장 순서는 PRD §4.8.
"""
from shell import page, frame
import kws

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
    return sec_card('편집 단가', '· 2026 항목별', '<div style="max-width:980px">' + ('<div><div style="display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700">편집 단가 (2026 항목별) '
            '<span style="font-size:11px;color:#9ca3af;font-weight:400">'
            '· 기본값에서 바꾼 항목만 전용 단가</span> %s<div class="sp"></div>'
            '<span class="btn sm">전체 기본값</span></div>'
            '<div style="padding-top:6px">%s%s'
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
                   ('#7e22ce', '#faf5ff', '#e9d5ff')))) + '</div>')


def docs_card():
    """관련 서류 — 「· 항목명 수정 가능」 · 줄 = 항목명 입력칸 · [파일] + 파일명(없으면 「선택 없음」) · 삭제 (CompaniesView.tsx)"""
    rows = (('사업자등록증', 'wj_biz_license.pdf'), ('통장 사본', 'wj_bank.jpg'), ('2026 단가 합의서', 'wj_price_2026.pdf'))
    li = ''.join('<div style="display:grid;grid-template-columns:130px 1fr auto;gap:8px;align-items:center;margin-bottom:8px">'
                 '<div class="inp" style="font-weight:600">%s</div>'
                 '<div class="inp" style="display:flex;align-items:center;gap:8px"><span class="btn sm">파일</span><span>%s</span></div>'
                 '<span class="lnk" style="color:#dc2626">삭제</span></div>' % (lb, fn) for lb, fn in rows)
    inner = ('<div style="max-width:900px"><div style="display:flex;margin-bottom:10px"><span class="btn sm" style="margin-left:auto">＋ 서류 추가</span></div>%s</div>' % li)
    return sec_card('관련 서류', '· 항목명 수정 가능', inner)


MEMO_PROJ = {'3': '웅진씽크빅 코드발급 · S3/O17', '2': '웅진씽크빅 코드발급 · S3/O17', '1': ''}
KIND_TAG = {'요청': ('#eef6ff', '#2563eb'), '처리': ('#ecfdf5', '#047857'), '메모': ('#f3f4f6', '#6b7280')}


def memo_card(draft='', hi=None, editing=None, new=False):
    """업무 메모 — 고객사 전용 원장 · 번호 유지 · 본인 글만 수정/삭제 (CompaniesView.tsx 업무 메모 섹션)
    입력: [프로젝트 ▾(고객사 공통 / 고객사 프로젝트)] [종류 ▾] · 내용 · [＋ 기록](고치는 중이면 [수정 저장] [취소])
    목록: 카드 — 번호 · 프로젝트 태그 · 종류 · 일시(수정됨) · 작성자(나) · [삭제] / 🔒 타인 글 — 본문을 누르면 위에서 수정"""
    head = ('<div style="padding:13px 18px;border-bottom:1px solid #eef0f4;display:flex;align-items:center;gap:8px">'
            '<b style="font-size:14px">업무 메모</b><span style="font-size:11.5px;color:#9ca3af">· 고객사 전용 원장 · 번호 유지 · 본인 글만 수정/삭제</span></div>')
    if new:
        body = '<div style="font-size:12px;color:#9ca3af;padding:10px 12px;background:#fafbfc;border:1px dashed #e5e7eb;border-radius:8px">업무 메모는 고객사를 등록한 뒤 기록할 수 있습니다.</div>'
        return '<div style="' + CARD + '">' + head + '<div style="padding:16px 18px">' + body + '</div></div>'
    cards = ''
    for no, kind, _who, ts, writer, txt in MEMOS:
        mine = writer == '김순정'
        pj = MEMO_PROJ.get(no) or ''
        bg, fg = KIND_TAG[kind]
        cards += ('<div style="border:1px solid %s;border-radius:8px;padding:6px 8px;margin-bottom:8px;%s">'
                  '<div style="display:flex;gap:8px;align-items:center;font-size:11.5px">'
                  '<span style="min-width:22px;text-align:center;background:#f3f4f6;border-radius:5px;font-family:ui-monospace,monospace;color:#374151">%s</span>'
                  '%s%s<span style="color:#9ca3af;font-family:ui-monospace,monospace">%s</span>'
                  '<span style="color:%s;font-weight:%s">%s</span><span style="flex:1"></span>%s</div>'
                  '<div style="margin-top:4px;font-size:12.5px">%s</div></div>'
                  % ('#93c5fd' if editing == no else '#eef0f4', 'background:#fff7ed;' if hi == no else '', no,
                     tg(pj or '고객사 공통', '#eef6ff' if pj else '#f3f4f6', '#2563eb' if pj else '#6b7280', False),
                     tg(kind, bg, fg, False), ts + (' (수정됨)' if no == '2' else ''),
                     '#2563eb' if mine else '#9ca3af', '700' if mine else '400', writer + (' (나)' if mine else ''),
                     '<span class="lnk" style="color:#dc2626">삭제</span>' if mine else '<span style="font-size:10.5px;color:#d1d5db">🔒 타인 글</span>',
                     txt))
    dv = draft or '<span style="color:#9ca3af">내용 입력 · Enter 기록 · Shift+Enter 줄바꿈</span>'
    btn = ('<span class="btn sm">수정 저장</span><span class="btn sm">취소</span>' if editing else '<span class="btn sm">＋ 기록</span>')
    body = ('<div style="display:grid;grid-template-columns:1fr 76px;gap:8px">'
            '<div class="inp" style="display:flex;justify-content:space-between">%s<span style="color:#9ca3af">▾</span></div>'
            '<div class="inp" style="display:flex;justify-content:space-between">%s<span style="color:#9ca3af">▾</span></div></div>'
            '<div style="display:flex;gap:8px;margin-top:8px;align-items:flex-start"><div class="inp" style="flex:1;min-height:38px">%s</div>%s</div>'
            '<div style="margin-top:12px">%s</div>'
            % ('웅진씽크빅 코드발급 · S3/O17' if editing else '고객사 공통', '처리' if editing else '요청', dv, btn, cards))
    return '<div style="' + CARD + '">' + head + '<div style="padding:16px 18px;max-width:980px">' + body + '</div></div>'




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
OWNERS = {'kim@wjthinkbig.com'}   # 고객사 OWNER 계정 — 고객사당 1명 `PC-159`


def tg(text, bg, fg, bold=True):
    return ('<span style="font-size:11px;background:%s;color:%s;border-radius:5px;padding:2px 8px;'
            'white-space:nowrap;%s">%s</span>' % (bg, fg, 'font-weight:700' if bold else '', text))


KIND_C = {'하위 고객사': ('#f3e8ff', '#7e22ce'), '상위 고객사': ('#ecfdf5', '#047857'), '단독': ('#f3f4f6', '#9ca3af')}


def header(new=False, closed=False, popover=False, name=CO, n_acc=3, n_on=2, svc='casterN', kind='하위 고객사'):
    """머리말 — 업체명 · 구분 · 요약 · 진행중/사업 종료 · ⋯ (등록 화면의 [취소][등록]은 섹션 아래 한 곳 `PC-331`)"""
    nm = (name or '새 고객사')
    if new and kind == '하위 고객사':
        kind = '단독'   # 새 고객사는 하위 등록 전이라 「단독」
    cls = tg(kind, *KIND_C[kind]) if name else ''
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
    right = ('' if new else '<span class="btn gho" style="padding:5px 11px">⋯</span>')   # 등록 버튼은 섹션 아래에만 `PC-331`
    return ('<div style="' + CARD + ';padding:12px 16px;display:flex;align-items:center;gap:10px;margin-bottom:12px">'
            '<div style="font-size:20px;font-weight:800;color:%s">%s</div>%s%s%s'
            '<span style="flex:1"></span><div style="position:relative">%s%s</div>%s</div>'
            % ('#111827' if name else '#c7cdd6', nm, cls, newtag, summ, seg, pop, right))


NAVS = (('base', '기본 정보', '', '고객사 정보'), ('rate', '편집 단가', '전용 2', ''), ('docs', '관련 서류', '3', ''),
        ('codes', '공통코드 · 확장 언어', '', ''),   # 관련 서류 아래 · 배지 상위 / 🌐 · 등록 화면에서는 잠김 `PC-330`
        ('acc', '서비스 계정', 'casterN · 3', '운영'), ('ticket', '서비스 티켓', '2', ''), ('memo', '업무 메모', '5', ''))   # 서비스 티켓 = 운영 묶음(서비스 계정 아래) `PC-358`


def nav(active='base', new=False, locked=False, dirty=(), codes=''):
    """codes = 공통코드 · 확장 언어 메뉴 배지 — 상위 고객사면 「상위」, 확장 언어 그룹이 있으면 「🌐」 `PC-330`"""
    out = ''
    for v, label, badge, grp in NAVS:
        if v == 'codes':
            badge = codes
        if new:
            badge = {'rate': '', 'docs': '', 'codes': '', 'acc': '0', 'ticket': '', 'memo': ''}.get(v, badge)
        if grp:
            out += ('<div style="font-size:10.5px;color:#9ca3af;padding:%s;%s">%s</div>'
                    % ('6px 12px 2px' if v == 'base' else '10px 12px 2px',
                       '' if v == 'base' else 'border-top:1px solid #eef0f4;margin-top:6px', grp))
        on = v == active
        lk = (locked and v == 'acc') or (new and v in ('ticket', 'codes'))   # 서비스 티켓 · 공통코드 · 확장 언어는 등록된 고객사에만 `PC-173` `PC-330`
        dot = ('<span style="width:7px;height:7px;border-radius:50%;background:#f59e0b"></span>' if v in dirty else '')
        b = ('<span style="font-size:10.5px;border-radius:999px;padding:1px 8px;font-weight:700;background:%s;color:%s">%s</span>'
             % ('#dbeafe' if on else '#f3f4f6', '#1d4ed8' if on else '#6b7280', badge)) if badge else ''
        out += ('<div style="display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:9px;font-size:13px;'
                'background:%s;color:%s;font-weight:%s">%s<span style="flex:1"></span>%s%s</div>'
                % ('#eef6ff' if on else 'transparent', '#c7cdd6' if lk else ('#1d4ed8' if on else '#374151'),
                   '700' if on else '400', label, dot, b))
    return '<div style="' + CARD + ';padding:8px">' + out + '</div>'


# 왼쪽 고객사 칸 — 구분 셀렉트(전체 · 상위 · 하위 · 단독 · 진행중 · 사업 종료) · 상위 고객사 묶음(▶ 접힘) · [＋ 고객사 등록] `PC-204`
# 옛 확장 슬롯 고객사(「Common 추가 언어 슬롯-964~983」 · 「Cake-984~1003」)는 목록에서 숨긴다 — 그룹 고객사 확장 Owner `PC-330`
LEFT = ('(주)투이아이앤씨', '21세기 북스', 'Common-21', '가구소-1022', '대교', ('네오노트-0-27', 6), ('네오노트-1012', 31), '네오노트-3-27',
        '시원스쿨', '아들과딸', '엠베스트', CO, '크레버스', '한솔교육')
# 이름 옆 배지 — 상위 고객사 「하위 n」(▶ 묶음이 있으면 그 「하위 n」 하나만) · 확장 언어 그룹 「확장 언어」 `PC-342`
SUB_T, LANG_T = ('#ecfdf5', '#047857'), ('#ecfeff', '#0e7490')
LEFT_TAGS = {'Common-21': (('하위 50',) + SUB_T, ('확장 언어',) + LANG_T), '네오노트-3-27': (('하위 149',) + SUB_T,)}


def ltag(t, bg, fg):
    return ('<span style="font-size:10px;border-radius:5px;padding:0 5px;font-weight:700;white-space:nowrap;line-height:16px;'
            'margin-left:5px;background:%s;color:%s">%s</span>' % (bg, fg, t))


def left_col(adding=False, sel=CO, tags=None, closed=False, grp=None):
    """grp = (상위 고객사, 하위 수, 하위 목록, 외 n곳) — 그 상위 고객사 묶음을 ▶ 펼쳐 하위 고객사를 고른 그림(S31)"""
    rows = []
    tagmap = dict(LEFT_TAGS)
    tagmap.update(tags or {})
    if adding:
        rows.append('<div style="border:1px dashed #5f8ff0;background:#f5f9ff;border-radius:9px;padding:8px 10px;margin-bottom:6px;'
                    'font-size:13px;color:#1d4ed8;font-weight:700">새 고객사 <span style="font-size:11px;font-weight:400;color:#6b7280">'
                    '· 오른쪽에서 입력 후 [등록]</span></div>')
    for x in LEFT:
        if isinstance(x, tuple):
            rows.append(kws.co_group(x[0], 0, False, x[1]))
        elif grp and x == grp[0]:   # ▶ 묶음 — 「하위 n」 은 묶음 머리의 것 하나만 `PC-342`
            lb = x + ''.join(ltag(*t) for t in tagmap.get(x, ()) if not t[0].startswith('하위'))
            rows.append(kws.co_group(lb, 0, False, grp[1], [(n, 1 if n == sel else 0, n == sel) for n in grp[2]], open_=True, more=grp[3]))
        else:
            lb = x + (' (사업 종료)' if (closed and x == sel) else '') + ''.join(ltag(*t) for t in tagmap.get(x, ()))
            rows.append((lb, 3 if x == CO else (1 if x == sel else 0), (x == sel and not adding), 0, False))
    # 보기 칩 대신 구분 셀렉트(건수) `PC-300`
    sel = ('<div class="inp" style="margin-bottom:8px;display:flex;justify-content:space-between">전체 고객사 (536)'
           '<span style="color:#9ca3af">▾</span></div>')
    return kws.co_col(rows, 820, view='all', issued=535, total=536, chips=False, top=sel,
                      right='<span class="btn pri" style="padding:5px 10px;font-size:12px">＋ 고객사 등록</span>')


def layout(head, nv, body, sel=CO, tags=None, closed=False, grp=None):
    """고객사 관리 3단 — 머리 · 집계 / 고객사 | (머리말 + 섹션 메뉴 | 본문) `PC-204`"""
    inner = (head + '<div style="display:grid;grid-template-columns:210px minmax(0,1fr);gap:12px;align-items:start">'
             + nv + '<div style="min-width:0">' + body + '</div></div>')
    return (kws.co_ws_head('ws') + '<div style="display:grid;grid-template-columns:270px minmax(0,1fr);gap:12px;align-items:start">'
            + left_col(adding='등록 중' in head, sel=sel, tags=tags, closed=closed, grp=grp) + '<div style="min-width:0">' + inner + '</div></div>')


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
             ('스마트클래스키트-1013', 'PDS3 · S3/O1013', False, False),
             ('시원스쿨-4', 'PDS3 · S0/O4', False, False)]   # 화면에서 지정한 공통코드(S27) — 이름 = 「고객사-owner」 `PC-362`
    if empty:
        items = [(n, l, False, d) for n, l, _c, d in items]
    if parent:
        items[0] = ('Common-21 ' + tg('대표(자기) 코드', '#e5e7eb', '#6b7280'), 'PDS2 · S3/O21', False, True)
    # 확장 언어 슬롯이 묶인 공통코드는 셋째 줄에 범위만 — 툴팁에 언어가 지정된 슬롯 `PC-329`
    ext = {'Common-21': '<div style="font-size:11px;color:#0e7490;margin-top:3px">🌐 확장 언어 슬롯 S3/O964~983</div>'}
    li = ''.join('<label style="display:flex;align-items:flex-start;gap:9px;border:1px solid %s;background:%s;'
                 'border-radius:9px;padding:9px 11px;font-size:12.5px;opacity:%s"><input type="checkbox"%s%s style="margin-top:2px">'
                 '<span><b style="color:%s">%s</b><div style="font-size:11px;color:#9ca3af;margin-top:2px">%s</div>%s</span></label>'
                 % ('#bfdbfe' if (ck and not dis) else '#eef0f4', '#f3f4f6' if dis else ('#f5f9ff' if ck else '#fafbfc'),
                    '0.55' if dis else '1', ' checked' if (ck and not dis) else '', ' disabled' if dis else '',
                    '#9ca3af' if dis else ('#1e3a8a' if ck else '#374151'), nm, lb, ext.get(nm.split(' ')[0], ''))
                 for nm, lb, ck, dis in items)
    note = ('<div style="font-size:11px;color:#9ca3af;margin-top:6px;line-height:1.7">선택하면 이 고객사가 해당 <b>공통코드의 '
            '사용 고객사(하위)</b>로 등록됩니다. 이미 발급된 공통코드를 쓰므로 <b>코드 할당은 없고</b>, 편집 프로젝트·티켓 발급에서 하위 고객사로 관리됩니다.</div>')
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
            '추가할 수 있고, 그때 고객사가 함께 등록됩니다. <b>서비스 계정은 선택</b>이라 계정 없이 [등록]으로 고객사만 등록할 수 있습니다 '
            '<code>PC-159</code>.</div>' if new else '')
    inner = ('<div class="g2" style="gap:12px;max-width:900px">' + fs + '</div>' + common_block(parent, empty=bool(new)) + hint)
    return sec_card('기본 정보', '· 필수는 업체명', inner, new=bool(new), dirty=dirty)


def acc_card_list(sel=0, adding=False, accs=ACCS, new=False):
    rows = ''
    for i, (nm, mail, on, n, last, seeded, _k) in enumerate(accs):
        cur = (i == sel and not adding)
        rows += ('<div style="border:1px solid %s;background:%s;border-radius:10px;padding:10px 12px;margin-bottom:8px">'
                 '<div style="display:flex;align-items:center;gap:6px"><b style="font-size:13.5px">%s</b>%s%s</div>'
                 '<div style="font-family:ui-monospace,monospace;font-size:11.5px;color:#6b7280;margin-top:2px">%s</div>'
                 '<div style="display:flex;align-items:center;gap:6px;margin-top:7px">%s%s'
                 '<span style="margin-left:auto;font-size:11px;color:#9ca3af">%s</span></div></div>'
                 % ('#5f8ff0' if cur else '#eef0f4', '#f5f9ff' if cur else '#fff', nm,
                    tg('OWNER', '#fef3c7', '#92400e') if mail in OWNERS else '',
                    tg('대장', '#f0fdfa', '#0f766e') if seeded else '', mail,
                    tg('활성', '#ecfdf5', '#047857') if on else tg('비활성', '#f3f4f6', '#6b7280'),
                    tg('CasterN %d/6' % n, '#eef6ff', '#2563eb') if n is not None else tg('권한 없음', '#f3f4f6', '#9ca3af'),
                    last))
    if not accs:
        rows = ('<div style="font-size:12px;color:#9ca3af;padding:24px 0;text-align:center;line-height:1.7">'
                '서비스 계정이 없습니다.<br>계정 없이도 고객사를 등록·사용할 수 있습니다.<br>필요하면 [＋ 계정 추가]로 등록하세요.</div>')
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
                '<div style="font-size:11.5px;color:#9ca3af">이 계정에 CasterN 사용 권한을 주고 제어합니다</div></div>'
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


def owner_box(state):
    """OWNER (대표 계정) — 고객사당 1명 `PC-159`
    state: self(이 계정이 OWNER) · first(OWNER 없음 → 첫 계정 체크) · other(다른 OWNER 있음, 체크 안 함) · switch(체크 → 바뀜 안내)"""
    on = state in ('self', 'first', 'switch')
    hint = {'self': '이 계정이 이 고객사의 OWNER 입니다.', 'first': '이 계정이 이 고객사의 OWNER 입니다.',
            'other': '지금 OWNER: 김태호 (kim@wjthinkbig.com)',
            'switch': '<b style="color:#b45309">저장하면 OWNER 가 김태호 (kim@wjthinkbig.com) 에서 이 계정으로 바뀝니다.</b>',
            'none': '지금 OWNER 가 없습니다.'}[state]
    return ('<div style="display:flex;align-items:flex-start;gap:10px;margin-top:12px;border:1px solid %s;background:%s;border-radius:10px;padding:10px 12px">'
            '<span style="width:15px;height:15px;border-radius:3px;border:1px solid %s;background:%s;color:#fff;font-size:10px;display:grid;place-items:center;margin-top:2px">%s</span>'
            '<span><span style="display:block;font-size:13px;font-weight:700;color:%s">OWNER (대표 계정)</span>'
            '<span style="display:block;font-size:11.5px;color:#9ca3af;margin-top:2px">고객사당 1명만 지정합니다. %s</span></span></div>'
            % ('#fcd34d' if on else '#e5e7eb', '#fffbeb' if on else '#fff', '#2563eb' if on else '#cbd5e1',
               '#2563eb' if on else '#fff', '✓' if on else '', '#92400e' if on else '#374151', hint))


def acc_detail(mode='edit', acc=ACCS[0], cast_on=True, n=6, tab='CASTERN', err='', dirty=False, new_draft=False, id_val='', owner='self'):
    nm, mail, on, _n, last, seeded, key = acc
    isnew = mode == 'new'

    def f(lb, v, ro=False, ph=False, extra=''):
        return ('<div class="fld"><span class="lbl">%s</span><div class="inp%s%s" style="%s">%s%s</div></div>'
                % (lb, ' ro' if ro else '', ' ph' if ph else '', 'justify-content:space-between' if extra else '', v, extra))
    seg = ('<div class="fld"><span class="lbl">계정 상태</span><div style="display:inline-flex;border:1px solid #e5e7eb;'
           'border-radius:999px;overflow:hidden;align-self:flex-start"><span style="padding:6px 16px;font-size:12.5px;%s">활성</span>'
           '<span style="padding:6px 16px;font-size:12.5px;%s">비활성</span></div></div>'
           % ('background:#ecfdf5;color:#047857;font-weight:700' if (on or isnew) else 'color:#9ca3af',
              'color:#9ca3af' if (on or isnew) else 'background:#f3f4f6;color:#374151;font-weight:700'))
    if isnew:
        grid = (f('ID (이메일) *', id_val or 'user@company.com', ph=not id_val) +
                f('NAME (담당자명)', '', ph=True) + seg)
    else:
        grid = (f('ID (이메일) *', mail, ro=True) + f('NAME (담당자명)', nm) + seg)
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
    ft_left += ('<span style="font-size:11.5px;color:#9ca3af">계정을 추가하면 고객사가 함께 등록됩니다 · 계정 없이 등록하려면 위 [등록]</span>' if (isnew and new_draft) else '')
    ft_right = ('<span class="btn gho">취소</span><span class="btn pri">계정 추가</span>' if isnew
                else '<span class="btn gho"%s>취소</span><span class="btn pri">저장</span>' % ('' if dirty else ' style="opacity:.5"'))
    return ('<div style="' + CARD + '"><div style="padding:13px 16px;border-bottom:1px solid #eef0f4;display:flex;align-items:center;gap:8px">'
            + head + '</div><div style="padding:14px 16px">' + area('기본 정보', top=0) +
            '<div class="g2" style="gap:12px">' + grid + '</div>' + owner_box(owner) + perm_box(cast_on, n, tab) + info + e +
            '</div><div style="padding:11px 16px;border-top:1px solid #eef0f4;display:flex;align-items:center;gap:8px">'
            + ft_left + '<span style="flex:1"></span>' + ft_right + '</div></div>')


def acc_section(list_html, detail_html):
    return ('<div style="display:grid;grid-template-columns:300px minmax(0,1fr);gap:12px;align-items:start">'
            + list_html + detail_html + '</div>')


def memo_section():
    m = memo_card()
    return m


# ── 서비스 티켓 `PC-171` `PC-173` ── 할당 범위 · 티켓 목록 | 티켓 상세 / 지정
TK_RANGES = ((('3', '17', '431~464'), False), (('3', '21', '0~4095'), True))   # 할당된 SOBP — S · O · B 칩만 `PC-181`
TICKETS = (('2', '사용 중', ('3', '17', '431~450', '0~511'), '2026-10-20 ~ 2027-10-19', ('유료 3,000,000원', '#eef6ff', '#1d4ed8')),
           ('1', '만료', ('3', '17', '451~455', '0~511'), '2025-01-01 ~ 2025-12-31', ('체험 (만료)', '#fef3c7', '#92400e')))
SC = '<span style="display:inline-flex;align-items:center;gap:3px;border:1px solid #e5e7eb;border-radius:6px;padding:1px 5px 1px 1px;background:#fff;font-size:10.5px"><span style="background:%s;color:#fff;font-weight:700;font-size:9px;border-radius:4px;padding:1px 4px">%s</span><span style="font-family:ui-monospace,monospace;color:#111827">%s</span></span>'
SOBP_C = (('S', '#5f8ff0'), ('O', '#14b8a6'), ('B', '#8b5cf6'), ('P', '#f59e0b'))


def sobp_chips(vals):
    """SOBP 맵과 같은 S · O · B · P 칩 (web/components/sobp.tsx SobpChips small)"""
    return ('<span style="display:inline-flex;gap:4px;flex-wrap:wrap">%s</span>'
            % ''.join(SC % (c, k, v) for (k, c), v in zip(SOBP_C, vals)))
ST_C = {'사용 중': ('#dcfce7', '#166534'), '대기': ('#fef3c7', '#92400e'), '만료': ('#f3f4f6', '#6b7280')}


def expiry_note(open_=False):
    """만료 후 동작 — 눌러야 펼쳐지는 숨김 안내 `PC-171` ④"""
    body = ('<div style="margin-top:8px;color:#374151;line-height:1.75"><b>사용기간이 끝나면</b>'
            '<div>• 이 범위의 코드로 <b>편집 · 추가 작업을 할 수 없습니다.</b> (당사 서버를 거치는 서비스 — casterN 편집, Ncode SDK)</div>'
            '<div>• <b>이미 만든 작업물(PDF)의 인쇄 · 배포는 막을 수 없습니다.</b> 실물 출판물에는 코드가 남습니다.</div></div>'
            if open_ else '')
    return ('<div style="margin-top:12px;border:1px solid #eef0f4;border-radius:9px;background:#fafbfc;padding:8px 12px;font-size:12px">'
            '<b style="color:#6b7280">%s ⓘ 만료 후 동작</b>%s</div>' % ('▾' if open_ else '▸', body))


TIP = ('<div style="position:absolute;top:calc(100% + 8px);left:-10px;z-index:5;width:300px;background:#1f2937;color:#f9fafb;border-radius:10px;'
       'padding:10px 14px;font-size:12.5px;line-height:1.6;font-weight:400;box-shadow:0 12px 32px rgba(15,23,42,.25)">'
       '<span style="position:absolute;top:-5px;left:16px;width:10px;height:10px;background:#1f2937;transform:rotate(45deg)"></span>'
       '사용자에게 발급하는 키가 아닙니다. 이 고객사의 <b>서비스 계정 3명</b>이 서비스를 쓸 때 티켓의 범위와 기간으로 승인합니다.</div>')


def ticket_list(adding=False, sel='2', help_=False):
    rng = ''
    for vals, shared in TK_RANGES:
        rng += ('<div style="display:flex;align-items:center;gap:6px;padding:3px 0">%s%s</div>'
                % (sobp_chips(vals), tg('공유', '#f3e8ff', '#7e22ce') if shared else ''))
    add = ('<div style="border:1px dashed #5f8ff0;background:#f5f9ff;border-radius:10px;padding:10px 12px;margin-bottom:8px">'
           '<div style="display:flex;align-items:center;gap:6px"><b style="font-size:13.5px;color:#1d4ed8">새 서비스 티켓</b>%s</div>'
           '<div style="font-size:11.5px;color:#6b7280;margin-top:4px">오른쪽에서 범위와 사용기간을 정하고 [티켓 지정]을 누르세요.</div></div>'
           % tg('작성 중', '#dbeafe', '#1d4ed8')) if adding else ''
    cards = ''
    for no, st, txt, per, bill in TICKETS:
        cur = (no == sel and not adding)
        cards += ('<div style="border:1px solid %s;background:%s;border-radius:10px;padding:10px 12px;margin-bottom:8px">'
                  '<div style="display:flex;align-items:center;gap:6px"><b style="font-size:13px">No.%s</b>%s%s<span style="flex:1"></span>%s</div>'
                  '<div style="margin-top:5px">%s</div>'
                  '<div style="font-size:11px;color:#9ca3af;margin-top:3px">%s</div></div>'
                  % ('#5f8ff0' if cur else '#eef0f4', '#f5f9ff' if cur else '#fff', no, tg('casterN', '#eef6ff', '#1d4ed8'), tg(st, *ST_C[st]), tg(*bill), sobp_chips(txt), per))
    hint = ''   # ⓘ 설명은 본문에 넣지 않고 ⓘ 바로 아래 말풍선 토스트로 띄운다 `PC-182` `PC-184`
    return ('<div style="' + CARD + '"><div style="padding:13px 16px;border-bottom:1px solid #eef0f4;display:flex;align-items:center;gap:8px">'
            '<b style="font-size:14px">서비스 티켓</b><span style="font-size:11.5px;color:#9ca3af">2건</span>'
            '<span style="position:relative;display:inline-flex"><span style="font-size:12px;color:%s;background:%s;border-radius:999px;width:20px;text-align:center">ⓘ</span>%s</span><span style="flex:1"></span>'
            '<span class="btn pri" style="padding:6px 12px;font-size:12.5px">＋ 티켓 지정</span></div><div style="padding:12px">%s'
            '<div style="border:1px solid #eef0f4;border-radius:10px;padding:8px 10px;margin-bottom:10px;background:#fafbfc">'
            '<div style="font-size:11.5px;font-weight:700;color:#374151;margin-bottom:6px">할당된 SOBP</div>%s</div>%s%s</div></div>'
            % ('#2563eb' if help_ else '#9ca3af', '#eef6ff' if help_ else 'transparent', TIP if help_ else '', hint, rng, add, cards))


def ticket_tabs(active='info'):
    """상세 탭 — 티켓 정보 · 정산 `PC-179`"""
    out = ''
    for v, lb, badge in (('info', '티켓 정보', ''), ('bill', '정산', '')):
        on = v == active
        out += ('<span style="padding:9px 16px;font-size:13px;color:%s;font-weight:%s;border-bottom:2px solid %s;margin-bottom:-1px">%s</span>'
                % ('#111827' if on else '#6b7280', '700' if on else '400', '#5f8ff0' if on else 'transparent', lb))
    return '<div style="display:flex;border-bottom:1px solid #eef0f4;margin-bottom:14px">%s</div>' % out


def ticket_detail(tab='info'):
    rows = (('Company Name', CO), ('Service (서비스)', 'casterN'), ('Code Type', 'PDS3'), ('Section', '3'), ('Owner', '17'),
            ('Book Start', '431'), ('Book Volume', '20'), ('Book End', '450'), ('Page Start', '0'),
            ('Page Volume', '512'), ('Page End', '511'), ('Valid From Time', '2026-10-20'), ('Valid Until Time', '2027-10-19'),
            ('지정 일시', '2026-10-20 10:12:05'), ('지정인', '김순정'))
    cells = ''.join('<div style="display:flex;gap:8px;font-size:12.5px;border-bottom:1px dashed #f1f3f6;padding:4px 0">'
                    '<span style="color:#9ca3af;min-width:120px">%s</span><b style="font-family:ui-monospace,monospace">%s</b></div>' % r
                    for r in rows)
    return ('<div style="' + CARD + '"><div style="padding:13px 16px;border-bottom:1px solid #eef0f4;display:flex;align-items:center;gap:8px">'
            '<b style="font-size:14px">서비스 티켓 No.2</b>%s%s<span style="flex:1"></span>'
            '</div><div style="padding:16px">%s%s</div></div>'   # [티켓 수정]은 티켓 정보 아래 오른쪽 `PC-238`
            % (tg('사용 중', *ST_C['사용 중']), tg('casterN', '#eef6ff', '#1d4ed8'), ticket_tabs(tab),
               ('<div style="font-size:12px;color:#6b7280;margin-bottom:10px">이 고객사의 서비스 계정은 아래 범위와 사용기간 안에서 서비스 사용이 승인됩니다.</div>'
                '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 18px">%s</div>%s' % (cells, expiry_note()) + '<div style="display:flex;justify-content:flex-end;margin-top:18px;padding-top:14px;border-top:1px solid #eef0f4"><span class="btn pri">티켓 수정</span></div>')
               if tab == 'info' else
               ('<div style="font-size:12px;color:#6b7280">이 서비스 티켓(No.2 · PDS3 S3/O17/B431~450/P0~511)의 정산을 등록합니다.</div>' + billing_box())))


def billing_box():
    """정산 — App Key · N Key 와 같은 공용 정산 입력 `PC-176` `PC-202`"""
    return kws.billing_box(amount='3,000,000')


def ticket_form(err='', open_=False, start='451'):
    def f(lb, v):
        return '<div class="fld"><span class="lbl">%s</span><div class="inp">%s</div></div>' % (lb, v)
    pick = ('<div class="inp" style="display:flex;align-items:center;gap:6px"><span style="font-family:ui-monospace,monospace">'
            'S 3 · O 17 · B 431~464 · P 0~511</span><span style="flex:1"></span><span style="color:#9ca3af;font-size:11px">▼</span></div>')
    # 구간 사용 현황 — 발급된 구간 · 빈 Book · 입력 구간 사용 가능 여부 `PC-195`
    pick += kws.usage_box('3', '17', ['451~464'], [('서비스 티켓', CO, '431~450', '0~511')], ok=not err)
    e = ('<div style="margin-top:12px;font-size:12.5px;color:#b91c1c;background:#fef2f2;border:1px solid #fecaca;'
         'border-radius:9px;padding:9px 12px">%s</div>' % err) if err else ''
    return ('<div style="' + CARD + '"><div style="padding:13px 16px;border-bottom:1px solid #eef0f4;display:flex;align-items:center;gap:8px">'
            '<b style="font-size:14px">서비스 티켓 지정</b><span style="font-size:11.5px;color:#9ca3af">%s</span></div><div style="padding:16px">'
            '<div style="display:flex;gap:32px;flex-wrap:wrap;align-items:flex-start;margin-bottom:22px"><div>'
            '<div style="font-size:12px;color:#6b7280;margin-bottom:6px">서비스 *</div>'
            '<div style="display:flex;gap:8px"><span style="padding:8px 18px;border-radius:9px;font-size:13px;font-weight:700;'
            'border:1px solid #1d4ed8;background:#eef6ff;color:#1d4ed8">casterN</span><span style="padding:8px 18px;border-radius:9px;font-size:13px;'
            'border:1px solid #e5e7eb;background:#fff;color:#6b7280">폼솔루션</span></div></div><div style="border-left:1px solid #e5e7eb;padding-left:32px">'
            '<div style="font-size:12px;color:#6b7280;margin-bottom:6px">Code Type *</div>'
            '<div style="display:flex;gap:8px"><span style="padding:8px 18px;border-radius:9px;font-size:13px;font-weight:700;'
            'border:1px solid #2563eb;background:#eef6ff;color:#2563eb">PDS3</span><span style="padding:8px 18px;border-radius:9px;font-size:13px;'
            'border:1px solid #e5e7eb;background:#fff;color:#6b7280">PDS2</span></div></div></div>'
            '<div style="font-size:12px;color:#6b7280;margin-bottom:6px">지정 범위 (할당 SOBP · 공유 코드) *</div>%s'
            '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:22px">%s%s%s%s</div>'
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:22px">%s%s</div>'
            '%s%s'
            '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:22px"><span class="btn gho">취소</span>'
            '<span class="btn pri">티켓 지정</span></div></div></div>'
            % (CO, pick, f('Start Book · 431~464', start), f('Book Size (권) · 최대 14', '5'), f('Start Page · 0~511', '0'),
               f('Page Size · 최대 512', '512'), f('Valid From Time (사용기간 시작) *', '2026-10-20'),
               f('Valid Until Time (사용기간 끝) *', '2027-10-19'), expiry_note(open_), e))


# ── 공통코드 · 확장 언어 `PC-330` ── 탭 [상위 고객사 (공통코드)] [확장 언어 그룹] `PC-362` (web/components/CompanyCodesSection.tsx)
# 확장 언어 그룹 = 고객사당 기본 1개(그룹 하나) · 지정하지 않은 코드는 단독(전용) 코드 · 하위 고객사는 상위 그룹 승계 `PC-373`
# 할당 코드를 모두 펼친 「코드 지정」 `PC-364` (옛 「기본 코드마다 그룹」 `PC-357` · 「모두 지정해야 저장」 `PC-363` 폐지)
CC = CARD + ';margin-bottom:12px'
CHD = 'padding:13px 18px;border-bottom:1px solid #eef0f4;display:flex;align-items:center;gap:8px'
CFT = 'padding:11px 18px;border-top:1px solid #eef0f4;display:flex;align-items:center;gap:8px;flex-wrap:wrap'
BREAK = '<div style="flex-basis:100%;height:0"></div>'
LG = '시원스쿨'   # 공통코드 · 확장 언어 예시 고객사 (S27~S30) — 할당 S0 · O4 · O5 · O6 · O7 · O20 → O4 기본 = 확장 O5 · O6, O7 · O20 단독
SUBCO = '전북교육청'   # 하위 고객사 승계 예시 (S31) — Common-21(S3/O21) 공통코드 사용 고객사 `PC-373`


def ii():
    """ⓘ — 설명은 본문에 두지 않고 누르면 그 자리 아래 말풍선 `PC-182`"""
    return '<span style="font-size:12px;color:#9ca3af;width:18px;text-align:center;display:inline-block">ⓘ</span>'


def dd(v, w=None, tone=None, ph=False, dis=False, flex=False):
    """셀렉트 모양 — v ▾ · tone = (배경, 글자, 테두리)"""
    st = 'display:inline-flex;align-items:center;justify-content:space-between;gap:6px;padding:4px 8px;font-size:12px;'
    if w:
        st += 'width:%dpx;' % w
    if flex:
        st += 'flex:1;min-width:0;'
    if tone:
        st += 'background:%s;color:%s;font-weight:700;border-color:%s;' % tone
    if dis:
        st += 'opacity:.5;'
    return ('<span class="inp%s" style="%s">%s<span style="font-size:10px;opacity:.7">▾</span></span>'
            % (' ph' if ph else '', st, v))


def drop(options, cur=0):
    """펼친 셀렉트 목록 — options 중 cur 번째가 지금 값"""
    return ('<div style="position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:5;min-width:170px;background:#fff;border:1px solid #e5e7eb;'
            'border-radius:8px;box-shadow:0 10px 24px rgba(15,23,42,.14);padding:4px;font-size:12px;font-weight:400;color:#374151">'
            + ''.join('<div style="padding:5px 8px;border-radius:6px;white-space:nowrap;%s">%s</div>'
                      % ('background:#eef6ff;color:#1d4ed8;font-weight:700' if i == cur else '', t) for i, t in enumerate(options))
            + '</div>')


def codes_tabs(active='holder', n_holder=1, n_lang=2):
    """섹션 위 탭 — 상위 고객사(공통코드) 지정과 확장 언어 그룹은 다른 일 `PC-362` · n = 공통코드 수 · 그룹 수"""
    out = ''
    for v, lb, n in (('holder', '상위 고객사 (공통코드)', n_holder), ('lang', '확장 언어 그룹', n_lang)):
        on = v == active
        out += ('<span style="padding:8px 14px;margin-bottom:-1px;font-size:13px;border-bottom:2px solid %s;color:%s;font-weight:%s">%s'
                '<span style="font-size:10.5px;border-radius:5px;padding:0 6px;margin-left:6px;font-weight:700;background:%s;color:%s">%d</span></span>'
                % ('#2563eb' if on else 'transparent', '#2563eb' if on else '#4b5563', '700' if on else '400', lb,
                   '#eef6ff' if on else '#f3f4f6', '#2563eb' if on else '#6b7280', n))
    return '<div style="display:flex;gap:4px;margin-bottom:10px;border-bottom:1px solid #e5e7eb">' + out + '</div>'


def so_card(s, o, common=None, members=0, custom=True):
    """할당받은 S/O 하나 — 공통코드면 「공통코드 · PDS」 · 하위 n곳 · [지정 해제]/기본 등록, 아니면 전용 코드 · [공통코드로 지정] `PC-333`
    전용 코드의 코드 종류(PDS3 / PDS2) 셀렉트는 없앴다 — 할당 기록의 종류를 따르고 미정이면 PDS3 `PC-358`"""
    if common:
        inner = (sobp_chips((s, o)) + tg('공통코드 · ' + common, '#ecfdf5', '#047857') + BREAK +
                 '<span style="font-size:11.5px;color:#6b7280">하위 고객사 %d곳</span><span style="flex:1"></span>' % members +
                 ('<span class="btn gho" style="padding:3px 10px;font-size:12px">지정 해제</span>' if custom
                  else '<span style="font-size:11px;color:#9ca3af">기본 등록</span>'))
        bd, bg = '#a7f3d0', '#f0fdf8'
    else:
        inner = (sobp_chips((s, o)) + '<span style="font-size:11px;color:#9ca3af">전용 코드</span>' + BREAK +
                 '<span class="btn pri" style="padding:4px 10px;font-size:12px;margin-left:auto">공통코드로 지정</span>')
        bd, bg = '#eef0f4', '#fafbfc'
    return ('<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;border-radius:9px;padding:9px 11px;'
            'border:1px solid ' + bd + ';background:' + bg + '">' + inner + '</div>')


def holder_card(cards):
    """① 상위 고객사 (공통코드) 탭 — cards: (s, o, common, members, custom)"""
    n = sum(1 for c in cards if c[2])
    st = ('<span style="font-size:11.5px;color:#047857;font-weight:700">상위 고객사 · 공통코드 %d건</span>' % n if n
          else '<span style="font-size:11.5px;color:#9ca3af">공통코드 없음</span>')
    grid = ''.join(so_card(*c) for c in cards)
    return ('<div style="' + CC + '"><div style="' + CHD + '"><b style="font-size:14px">상위 고객사 (공통코드)</b>' + st + ii() +
            '</div><div style="padding:12px 18px"><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px">'
            + grid + '</div></div></div>')


LCOLS = 'display:grid;grid-template-columns:190px repeat(4,minmax(64px,1fr))'
BASE_T = ('#eef6ff', '#2563eb', '#bfdbfe')
EXT_T = ('#ecfeff', '#0e7490', '#a5f3fc')


COMMON_CHIP = ('<span style="font-size:9.5px;border-radius:5px;padding:0 5px;font-weight:700;background:#ecfdf5;color:#047857;'
               'white-space:nowrap;flex-shrink:0">공용</span>')   # 공용(공통)코드 칸 — 확장 언어 그룹에서는 기본으로만 `PC-374`


def assign_grid(cells, open_=None, common=()):
    """코드 지정 — 할당된 코드를 모두 펼쳐 놓고 코드마다 셀렉트로 바로 고른다 `PC-364`
    cells: (s, o, 값) — 값: '' 단독 (전용 코드) · '기본' · '확장 · 기본 O{n}' · 'grp:{고객사}'(다른 고객사 그룹에 든 코드 — 바꿀 수 없음)
    단독 칸은 회색(경고색 아님) `PC-373` · open_: (o, options, cur) — 그 코드의 셀렉트를 펼친 그림
    common = 공용(공통)코드의 O — S · O 옆 「공용」 칩 · 셀렉트에 확장 항목 없음 `PC-374`"""
    out = ''
    for s, o, v in cells:
        if v.startswith('grp:'):
            bd, bg, fg = '#e5e7eb', '#f9fafb', '#6b7280'
            right = '<span style="font-size:11px;color:%s;margin-left:auto">%s 그룹</span>' % (fg, v[4:])
        else:
            if v == '기본':
                bd, bg, fg = '#bfdbfe', '#f5f9ff', '#1d4ed8'
            elif v:
                bd, bg, fg = '#a5f3fc', '#f0fdff', '#0e7490'
            else:   # 단독 (전용 코드) — 회색 · 경고색 아님 `PC-373`
                bd, bg, fg = '#eef0f4', '#fafbfc', '#6b7280'
            dl = drop(open_[1], open_[2]) if (open_ and open_[0] == o) else ''
            right = ('<span style="position:relative;display:flex;flex:1;min-width:0">' + dd(v or '단독 (전용 코드)', tone=('#fff', fg, '#e5e7eb'), flex=True)
                     + dl + '</span>')
        out += ('<div style="display:flex;align-items:center;gap:6px;border-radius:9px;padding:7px 10px;border:1px solid %s;background:%s">%s%s%s</div>'
                % (bd, bg, sobp_chips((s, o)), COMMON_CHIP if o in common else '', right))
    return ('<div><div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:6px">코드 지정 '
            '<span style="font-weight:400;color:#9ca3af">· %d개</span></div>'
            '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px">%s</div></div>' % (len(cells), out))


def lang_chips(items, need):
    """등록한 언어 n / m — 슬롯 번호 순 칩 `PC-334`"""
    ch = ''.join('<span style="font-size:11px;border-radius:5px;padding:2px 8px;background:%s;color:%s">'
                 '<span style="font-family:ui-monospace,monospace;opacity:.7;margin-right:3px">%d</span>%s</span>'
                 % ((('#ecfeff', '#0e7490') if own else ('#f3f4f6', '#6b7280')) + (slot, lang)) for slot, lang, own in items)
    return ('<div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;font-size:12px">'
            '<b style="color:#374151;margin-right:2px">등록한 언어 %d / %d</b>%s</div>'
            % (len(items), need, ch or '<span style="color:#9ca3af">아직 없음</span>'))


def lang_row(s, o, label, tone, langs, start, dl=''):
    """표 한 줄 = 코드 하나 — 「S · O · [역할 ▾]」 + 언어 4칸 `PC-346` `PC-347`"""
    head = sobp_chips((s, o)) + '<span style="position:relative;display:flex;flex:1;min-width:0">' + dd(label, tone=tone, flex=True) + dl + '</span>'
    cells = ''
    for i, v in enumerate(langs):
        cells += ('<div style="padding:5px 6px;display:flex;align-items:center;gap:4px">'
                  '<span style="font-size:10.5px;color:#9ca3af;font-family:ui-monospace,monospace;min-width:16px;text-align:right">%d</span>'
                  '<div class="inp%s" style="padding:5px 7px;font-size:12px;flex:1;min-width:0;white-space:nowrap;overflow:hidden">%s</div></div>'
                  % (start + i, '' if v else ' ph', v or '지정된 언어 없음'))
    return ('<div style="' + LCOLS + ';align-items:center;border-top:1px solid #eef0f4">'
            '<div style="padding:6px 8px;display:flex;align-items:center;gap:4px;min-width:0">' + head + '</div>' + cells + '</div>')


def group_block(s, base, ext, need, langs, new=False, base_open=None, base_label='기본'):
    """그룹 칸 하나 — 머리 🌐 기본 S · O · 확장 O… · 필요 언어 수 / 등록한 언어 칩 / 코드 · 역할 · 언어 표 `PC-357` `PC-364`
    [그룹 삭제] · [＋ 언어 등록] 없음 — 넣고 빼기는 위 코드 지정에서. base_open = 첫 줄 [기본 ▾] 을 펼친 그림의 항목 `PC-362`
    base_label = 첫 줄 셀렉트 글 — 기본이 공용 코드면 「기본 · 공용」 `PC-374`"""
    owners = [base] + list(ext)
    four = lambda o: (tuple(langs.get(o, ())) + ('', '', '', ''))[:4]
    chips = [(p * 4 + 1 + i, l, True) for p, o in enumerate(owners) for i, l in enumerate(four(o)) if l]
    head = ('<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:9px 12px;background:#f0fdff;border-bottom:1px solid #cffafe">'
            '<b style="font-size:12.5px;color:#0e7490">🌐 기본</b>' + sobp_chips((s, base)) +
            (tg('새 그룹', '#fef3c7', '#b45309') if new else '') +
            '<span style="font-size:11.5px;color:#6b7280">확장 %s</span><span style="flex:1"></span>'
            '<span style="display:flex;align-items:center;gap:6px;font-size:12px;color:#374151">필요 언어 수'
            '<span class="inp" style="width:70px;padding:4px 8px">%d</span></span></div>'
            % (' · '.join('O' + x for x in ext) if ext else '없음', need))
    th = ('<div style="' + LCOLS + ';background:#fafbfc;font-size:11.5px;color:#6b7280;font-weight:600">'
          '<div style="padding:7px 10px;display:flex;align-items:center;gap:4px">코드 · 역할' + ii() + '</div>'
          + ''.join('<div style="padding:7px 6px">슬롯 %d</div>' % i for i in range(1, 5)) + '</div>')
    rows = lang_row(s, base, base_label, BASE_T, four(base), 1, drop(base_open) if base_open else '')
    for k, o in enumerate(ext, 1):
        rows += lang_row(s, o, '확장 %d' % k, EXT_T, four(o), k * 4 + 1)
    return ('<div style="border:1px solid %s;border-radius:10px;overflow:visible">' % ('#67e8f9' if new else '#a5f3fc') + head +
            '<div style="padding:10px 12px">' + lang_chips(chips, need) +
            '<div style="margin-top:10px;border:1px solid #eef0f4;border-radius:10px;overflow:visible">' + th + rows + '</div></div></div>')


def lang_tab(cells, groups='', status='', n_free=0, dirty=False, err='', open_=None, top_err='', common=()):
    """② 확장 언어 그룹 탭 — 머리 · 코드 지정 · 그룹 칸 · 카드 아래 [취소] [저장](한 번에 `PC-363`)
    n_free = 단독 코드 수(머리 「· 단독 {n}개」 회색 `PC-373`) · top_err = 코드 지정 위 빨간 줄(기본이 둘 이상 — 옛 저장값 `PC-373`)
    common = 공용 코드의 O(코드 지정 칸 「공용」 칩 `PC-374`)"""
    st = (('<span style="font-size:11.5px;color:#0e7490;font-weight:700">%s</span>' % status) if status
          else '<span style="font-size:11.5px;color:#9ca3af">사용 안 함</span>')
    if status and n_free:
        st += '<span style="font-size:11.5px;color:#6b7280">· 단독 %d개</span>' % n_free
    top = ('<div style="font-size:12px;color:#dc2626;font-weight:700">⚠ %s</div>' % top_err) if top_err else ''
    ft = ''
    if groups:
        left = (('<span style="font-size:12px;color:#dc2626;font-weight:700;flex-basis:100%%">⚠ %s</span>' % err) if err
                else ('<span style="font-size:12px;color:#b45309">● 저장하지 않은 변경이 있습니다</span>' if dirty else ''))
        ft = ('<div style="' + CFT + '">' + left + '<span style="flex:1"></span>'
              '<span class="btn gho"%s>취소</span><span class="btn pri">저장</span></div>' % ('' if (dirty or err) else ' style="opacity:.5"'))
    return ('<div style="' + CC + '"><div style="' + CHD + '"><b style="font-size:14px">확장 언어 그룹</b>' + st + ii() + '</div>'
            '<div style="padding:12px 18px;display:flex;flex-direction:column;gap:12px">' + top + assign_grid(cells, open_, common) + groups + '</div>' + ft + '</div>')


def inherited_card(parent, s, rows):
    """하위 고객사가 승계한 상위 고객사의 확장 언어 그룹 — 읽기 전용 `PC-373`
    rows: (o, 역할 '기본' / '확장 k', 언어 글 「5 베트남어 · 6 러시아어 …」 또는 「지정된 언어 없음」)"""
    cells = ''
    for o, role, txt in rows:
        base = role == '기본'
        cells += ('<div style="display:flex;align-items:flex-start;gap:6px;border-radius:9px;padding:7px 10px;border:1px solid %s;background:%s">'
                  '%s<span style="font-size:11.5px;line-height:1.5"><b style="color:%s">%s</b><span style="color:#6b7280"> · %s</span></span></div>'
                  % ('#bfdbfe' if base else '#a5f3fc', '#f5f9ff' if base else '#f0fdff', sobp_chips((s, o)),
                     '#1d4ed8' if base else '#0e7490', role, txt))
    return ('<div style="' + CC + '"><div style="' + CHD + ';flex-wrap:wrap"><b style="font-size:14px">🌐 확장 언어 그룹</b>'
            + tg('승계 · ' + parent, '#f3e8ff', '#7e22ce') +
            '<span style="font-size:11.5px;color:#6b7280">기본 S%s/O%s · 확장 %d개</span>%s</div>'
            '<div style="padding:12px 18px"><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px">%s</div></div></div>'
            % (s, rows[0][0], len(rows) - 1, ii(), cells))


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
               ('공통코드 · 확장 언어 · 서비스 티켓 (메뉴)', '클릭', '<b>잠김</b>', '<b>고객사를 먼저 등록하세요.</b> — 할당받은 코드가 있어야 하므로 등록된 고객사에만 <code>PC-330</code> <code>PC-173</code>'),
               ('섹션 아래 [등록]', '클릭', '고객사만 등록 → 상세(기본 정보)', '<b>서비스 계정 없이도 등록</b> <code>PC-159</code> · 입력한 모든 섹션 함께 저장 · <code>LOG-01</code>'),
               ('섹션 아래 [취소]', '클릭', '<code>MEM-01</code>', '아무것도 저장되지 않는다 · 머리말에는 버튼이 없다 <code>PC-331</code>'),
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
                                                      acc_detail('new', cast_on=True, n=6, new_draft=True, owner='first')) + '<div style="' + CARD + ';margin-top:12px;padding:11px 18px;display:flex;align-items:center;gap:8px"><span style="flex:1"></span><span class="btn gho">취소</span><span class="btn pri">등록</span></div>'), height=1200),
              [('ID (이메일)', '입력 (필수)', '—', '이메일 형식 · 전체에서 유일 · 비밀번호는 받지 않는다(SSO) <code>PC-159</code>'),
               ('OWNER (대표 계정)', '체크', '첫 계정은 체크된 채 시작', '고객사당 1명 <code>PC-159</code>'),
               ('서비스 권한', '선택', 'CasterN 사용 · 권한 6종', '켠 서비스가 고객사의 사용 서비스가 된다 <code>PC-138</code>'),
               ('[계정 추가]', '클릭', '<b>고객사 + 계정 등록</b> → 상세(서비스 계정)', '<code>/companies/{id}?sec=acc</code> <code>PC-142</code>'),
               ('계정 아래 [취소] [등록]', '클릭', '계정 없이 고객사만 등록 / 취소', '다른 섹션과 같은 자리(카드 아래) <code>PC-331</code> · 폼 안내 <b>계정 없이 등록하려면 위 [등록]</b>')]))

    # ── 상세 · 고객사 정보 ──
    B.append(('S4', '상세 — 기본 정보', '기본',
              '<code>MEM-01</code> 행 클릭으로 진입. 기본 정보 섹션에 업체 정보와 <b>공통코드 사용 고객사</b>가 있고, 아래 [저장]은 <b>이 섹션만</b> 저장한다 '
              '<code>PC-136</code>. 머리말 오른쪽에서 진행중/사업 종료를 바꾼다(S9).',
              frame('MEM-01', FR, layout(H, nav('base'), base_section()), height=1200),
              [('섹션 메뉴', '클릭', '그 섹션 본문', '고객사 정보(기본 정보 · 편집 단가 · 관련 서류 · 공통코드 · 확장 언어) / 운영(서비스 계정 · <b>서비스 티켓</b> · 업무 메모) — 서비스 티켓은 운영 묶음 서비스 계정 아래 <code>PC-358</code>'),
               ('공통코드 체크', '체크', '하위 고객사 등록', '기본 정보 [저장] 때 함께 반영 · 코드 할당 없음'),
               ('공통코드 카드 이름', '—', '「고객사-owner」', '상위 고객사 이름을 <b>{고객사}-{owner}</b> 로 — 예: 화면에서 지정한 시원스쿨 S0/O4 → <b>시원스쿨-4</b>(S27) · 이름이 이미 「-owner」 로 끝나면 그대로(Common-21 · 네오노트-0-27) <code>PC-362</code>'),
               ('Common-21 카드 셋째 줄', '마우스 올림', '툴팁', '<b>🌐 확장 언어 슬롯 S3/O964~983</b> — 범위만(사용 슬롯 나열 없음) · 툴팁에 언어가 지정된 슬롯 <b>S3/O964 — 5 베트남어 · 6 러시아어 …</b> <code>PC-329</code>'),
               ('왼쪽 목록 이름 옆 배지', '—', '하위 n · 확장 언어', '상위 고객사면 <b>하위 {n}</b>(▶ 묶음이 있으면 그 「하위 n」 하나만) · 확장 언어 그룹이 있으면 <b>확장 언어</b>(툴팁 <b>확장 언어 그룹 · 언어 {n}개</b>) — 예: Common-21 「하위 50」「확장 언어」 · 네오노트-3-27 「하위 149」 <code>PC-342</code>'),
               ('[저장]', '클릭', '기본 정보만 저장', '<b>저장됨 · 기본 정보</b> · <code>LOG-01</code>'),
               ('⋯ [고객사 삭제]', '클릭', '<code>MEM-01</code> 삭제 확인창',
                'SOBP 할당 전 고객사만 — 업체명 재입력 확인(<code>MEM-01</code> S5 · S6). '
                'SOBP 할당 고객사는 <b>삭제 불가</b> 안내(<code>MEM-01</code> S14) · 사업 종료로 처리 <code>PC-166</code>')]))
    B.append(('S5', '저장하지 않은 변경', '분기',
              '고치고 저장하지 않으면 <b>메뉴에 ●</b>, 본문 아래에 안내가 붙는다. [취소]는 마지막 저장값으로 되돌린다. 섹션은 서로 따로 저장된다.',
              frame('MEM-01', FR, layout(H, nav('base', dirty=('base',)), base_section(dirty=True, edited=True)), height=1200),
              [('메뉴 ●', '표시', '—', '저장 안 한 섹션'),
               ('[취소]', '클릭', '되돌림', '마지막 저장값'),
               ('다른 섹션 이동', '클릭', '값 유지', '화면을 떠나면 사라진다')]))
    B.append(('S6', '대표(상위) 회사 — 자기 공통코드 비활성', '분기',
              '대표(상위) 회사는 자기 코드의 하위가 될 수 없어 해당 공통코드가 <b>회색 · 체크 불가</b>이고 <b>「대표(자기) 코드」</b> 배지가 붙는다 <code>PC-015</code>. 아래 설명은 늘 같은 문장이다(따로 경고하지 않는다).',
              frame('MEM-01', FR, layout(H, nav('base'), base_section(parent=True)), height=1240),
              [('자기 보유 공통코드', '—', '<b>비활성</b>', '회색 · 선택 불가 · 「대표(자기) 코드」'), ('다른 공통코드', '체크', '하위 등록', '')]))
    B.append(('S7', '편집 단가', '분기',
              '소리펜 · 필기펜 그룹 카드. 기본값에서 바꾼 항목만 전용 단가(주황)이고 그룹·전체 [기본값]으로 되돌린다. 변경은 <b>이후 등록되는 교재부터</b> 적용 <code>PC-027</code>.',
              frame('MEM-01', FR, layout(H, nav('rate'), price_card(2)), height=1300),
              [('단가 입력', '입력', '전용 단가', '기본값과 다르면 강조'), ('[전체 기본값]', '클릭', '모든 항목 기본 단가로', ''), ('카드 아래 [저장]', '클릭', '편집 단가만 저장', '')]))
    B.append(('S8', '관련 서류', '분기', '줄마다 <b>항목명 입력칸</b> · <b>[파일]</b> + 파일명 · 삭제. 항목명을 고치고 파일을 붙인 뒤 카드 아래 [저장]으로 이 섹션만 저장한다.',
              frame('MEM-01', FR, layout(H, nav('docs'), docs_card()), height=900),
              [('[＋ 서류 추가]', '클릭', '빈 줄', ''), ('항목명', '입력', '—', '자리표시 <b>항목명</b>'), ('[파일]', '클릭', '파일 선택', '고르기 전 <b>선택 없음</b>'), ('[삭제]', '클릭', '줄 제거', ''), ('서류 없음', '—', '빈 안내', '<b>등록된 서류가 없습니다.</b>')]))
    B.append(('S9', '사업 종료 전환', '분기',
              '머리말 오른쪽 <b>[사업 종료]</b>를 누르면 종료 사유 / 코드 이관 메모를 받는 창이 열리고 [사업 종료]로 <b>바로 저장</b>된다 <code>PC-139</code>.',
              frame('MEM-01', FR, layout(header(popover=True), nav('base'), base_section()), height=1200),
              [('[사업 종료]', '클릭', '사유 입력 창', ''),
               ('창 [사업 종료]', '클릭', '<b>바로 저장</b>', '<b>사업 종료로 바꿨습니다 · {업체명}</b>'),
               ('창 [취소]', '클릭', '닫힘', '변경 없음')]))
    B.append(('S10', '사업 종료 상태', '변형',
              '사업 종료면 머리말 전환이 붉게 표시되고, 마우스를 올리면 종료 사유가 보인다. [진행중]은 확인 후 바로 저장된다.',
              frame('MEM-01', FR, layout(header(closed=True), nav('base'), base_section(), closed=True), height=1200),
              [('[진행중]', '클릭', '확인 후 바로 저장', '<b>진행중으로 바꿨습니다 · {업체명}</b>'),
               ('왼쪽 목록', '—', '「{업체명} (사업 종료)」', '코드 발급 이력은 보존')]))

    # ── 서비스 계정 ──
    B.append(('S11', '서비스 계정 — 카드 목록 | 상세', '기본',
              '「카드 목록 | 상세」. 카드를 고르면 오른쪽 상세에서 <b>기본 정보 · 서비스 권한 · 접속 · 이력</b>을 본다. 고친 뒤 <b>[저장]</b> <code>PC-136</code> <code>PC-141</code>.',
              frame('MEM-01', FR, layout(H, nav('acc'), acc_section(acc_card_list(0), acc_detail('edit'))), height=1150),
              [('카드', '클릭', '오른쪽 상세', '이름 · 이메일 · 활성/비활성 · CasterN n/6 · 최근 접속'),
               ('서비스 권한 탭', '클릭', 'CasterN / 폼솔루션', '탭 머리에 사용 점 · 권한 수 <code>PC-140</code>'),
               ('권한 카드', '클릭', '개별 지정', '[모두 선택]/[모두 해제]'),
               ('계정 상태', '선택', '활성 / 비활성', '비활성 = 서비스 로그인 불가 <code>PC-135</code>'),
               ('OWNER (대표 계정)', '체크', 'S21', '고객사당 1명 · 카드에 OWNER 배지 · 맨 위 <code>PC-159</code>'),
               ('[저장]', '클릭', '그 계정만 저장', '<b>저장됨 · {ID}</b> · 사용 서비스 다시 계산 <code>PC-138</code>'),
               ('계정 4개 이상', '—', '목록 위 검색칸', '자리표시 <b>이름 · 이메일 검색</b>'),
               ('App Key 와 연결된 계정', '—', '상세 머리 「App Key 연결」 · 접속 · 이력에 App Key 줄', '키 값이 없으면 <b>대장에 키 값 미기재</b>'),
               ('CasterN 사용 · 권한 0개', '—', '주황 경고', '<b>권한이 하나도 선택되지 않았습니다. 이 계정은 CasterN 에 로그인해도 쓸 수 있는 기능이 없습니다.</b>'),
               ('OWNER 없는 고객사', '—', 'OWNER 칸 안내', '<b>지금 OWNER 가 없습니다.</b>')]))
    B.append(('S12', '서비스 계정 — 계정 추가', '분기',
              '<b>[＋ 계정 추가]</b>를 누르면 오른쪽에 등록 폼이 나온다(모달 아님). 새 계정은 고객사의 현재 사용 서비스를 기본으로 켜고 CasterN 이면 권한 6종 모두. [계정 추가]로 <b>바로 저장</b>된다.',
              frame('MEM-01', FR, layout(H, nav('acc'), acc_section(acc_card_list(adding=True), acc_detail('new', owner='other'))), height=1150),
              [('OWNER (대표 계정)', '체크', '체크하면 S21 처럼 바뀜 안내', 'OWNER 가 이미 있으면 체크 안 된 채 시작'),
               ('[계정 추가]', '클릭', '바로 저장', '<b>계정 추가됨 · {ID}</b>'), ('[취소]', '클릭', '상세로', '')]))
    B.append(('S13', '서비스 권한 — CasterN 사용 안 함', '변형',
              '사용 스위치를 끄면 권한 그리드가 <b>흐려지기만</b> 하고 자리를 지킨다 — 켜고 끌 때 화면이 밀리지 않는다 <code>PC-140</code>.',
              frame('MEM-01', FR, layout(H, nav('acc', dirty=()), acc_section(acc_card_list(1), acc_detail('edit', ACCS[1], cast_on=False, n=3, dirty=True, owner='other'))), height=1200),
              [('사용 스위치', '끔', '그리드 흐림', '저장하면 이 계정은 CasterN 을 쓰지 않는다'),
               ('모든 계정이 끔', '저장', '고객사 casterN 해제', '사용 서비스 표시만 바뀐다 · 편집 프로젝트 대상과는 무관 <code>PC-138</code> <code>PC-187</code>')]))
    B.append(('S14', '서비스 권한 — 폼솔루션 탭', '변형', '폼솔루션은 준비중 — 권한 항목이 아직 없다.',
              frame('MEM-01', FR, layout(H, nav('acc'), acc_section(acc_card_list(0), acc_detail('edit', tab='FORM'))), height=1100),
              [('폼솔루션 사용', '켬', '폼솔루션 서비스 관리에 나타남', '권한 항목 없음')]))
    B.append(('S15', '계정 추가 오류', '오류', 'ID 는 이메일 형식이고 전체에서 유일해야 한다(App Key 계정 포함). 비밀번호는 받지 않는다 <code>PC-159</code>.',
              frame('MEM-01', FR, layout(H, nav('acc'), acc_section(acc_card_list(adding=True),
                    acc_detail('new', id_val='kim@wjthinkbig.com', err='이미 웅진씽크빅에 등록된 서비스 계정입니다. 서비스 계정은 이메일당 고객사 하나만 등록할 수 있습니다.', owner='other'))), height=1170),
              [('ID 중복', '[계정 추가]', '<b>차단</b>', '서비스 계정은 이메일당 고객사 하나 <code>PC-324</code> — <b>이미 {고객사}에 등록된 서비스 계정입니다. …</b> / App Key 계정 이메일이면 <b>이미 App Key 계정으로 등록된 이메일입니다({고객사}). …</b>'),
               ('ID 형식', '[계정 추가]', '<b>차단</b>', '<b>ID 는 이메일 형식이어야 합니다.</b>')]))
    dlg = ('<div class="ovl"><div class="mdl"><div class="mh"><div class="mt">계정 삭제</div><div class="mx">✕</div></div>'
           '<div style="font-size:13px;color:#374151;line-height:1.7">계정 edit01@wjthinkbig.com 을(를) 삭제할까요?</div>'
           '<div class="mf"><div class="btn gho">취소</div><div class="btn dan">삭제</div></div></div></div>')
    B.append(('S16', '계정 삭제 확인창', '확인창', '[계정 삭제]는 확인을 거친다. 연결된 App Key 도 함께 지워진다.',
              frame('MEM-01', FR, layout(H, nav('acc'), acc_section(acc_card_list(1), acc_detail('edit', ACCS[1], n=3, owner='other'))), overlay=dlg, height=1200),
              [('[삭제]', '클릭', '계정 제거', '사용 서비스 다시 계산 · <code>LOG-01</code>'), ('[취소] · ✕', '클릭', 'S11', '')]))
    B.append(('S17', '승인 후 계정 추가', '분기',
              '<code>MEM-01</code> 승인 요청 모달의 <b>[계정 추가 →]</b>로 들어오면 서비스 계정 등록 폼이 열리고 SSO 이메일이 ID 칸에 들어가 있다 <code>PC-133</code>.',
              frame('MEM-01', FR, layout(H, nav('acc'), acc_section(acc_card_list(adding=True), acc_detail('new', id_val='teacher@newschool.kr', owner='other'))), height=1150),
              [('ID (이메일)', '자동', 'SSO 이메일', '<code>?email=</code>'), ('[계정 추가]', '클릭', '바로 저장', '')]))

    # ── 업무 메모 ──
    B.append(('S18', '업무 메모', '기본', '고객사 전용 업무 원장(번호 유지). 위에서 <b>프로젝트</b>(고객사 공통 / 이 고객사의 코드 프로젝트)와 <b>종류</b>를 고르고 내용을 넣어 '
              'Enter 또는 <b>[＋ 기록]</b>. 목록은 카드 — 번호 · 프로젝트 태그 · 종류 · 일시(수정됨) · 작성자(나). 본인 글은 본문을 누르면 위 입력창에서 고치고(<b>[수정 저장] [취소]</b>), [삭제] 할 수 있다. 남의 글은 <b>🔒 타인 글</b>.',
              frame('MEM-01', FR, layout(H, nav('memo'), memo_card(draft='범블비 전집 2차 33권 코드 재발급 요청 접수 — 8/28까지 회신 예정')), height=900),
              [('프로젝트', '선택', '고객사 공통 / 고객사 프로젝트', '카드에 프로젝트 태그'), ('종류', '선택', '요청 / 처리 / 메모', ''),
               ('Enter · [＋ 기록]', '입력', '바로 기록', 'Shift+Enter 줄바꿈'),
               ('본인 글 본문', '클릭', '위 입력창에서 수정', '버튼이 <b>[수정 저장] [취소]</b> · 고친 글은 <b>(수정됨)</b>'),
               ('본인 글 [삭제]', '클릭', 'S20 확인창', ''), ('기록 없음', '—', '빈 안내', '<b>기록된 업무가 없습니다.</b> · 등록 화면은 <b>업무 메모는 고객사를 등록한 뒤 기록할 수 있습니다.</b>')]))
    err_ovl = ('<div class="ovl" style="background:none;place-items:start center;padding-top:16px"><div class="toast err" '
               'style="width:680px;margin:0">박지훈 님이 작성한 메모입니다. 본인 글만 수정할 수 있습니다.</div></div>')
    B.append(('S19', '남의 메모 수정 시도', '오류', '다른 직원이 쓴 메모는 수정·삭제할 수 없다.',
              frame('MEM-01', FR, layout(H, nav('memo'), memo_card(hi='1')), overlay=err_ovl, height=900),
              [('남의 메모 본문', '클릭', '<b>차단</b>', '<b>{작성자} 님이 작성한 메모입니다. 본인 글만 수정할 수 있습니다.</b> · 카드에는 [삭제] 대신 <b>🔒 타인 글</b>')]))
    memo_del = ('<div class="ovl"><div class="mdl"><div class="mh"><div class="mt">메모 삭제</div><div class="mx">✕</div></div>'
                '<div style="font-size:13px;color:#374151;line-height:1.7">메모 2번을 삭제할까요?</div>'
                '<div class="mf"><div class="btn gho">취소</div><div class="btn dan">삭제</div></div></div></div>')
    B.append(('S20', '메모 삭제 확인창', '확인창', '본인이 쓴 메모를 지울 때 확인을 거친다.',
              frame('MEM-01', FR, layout(H, nav('memo'), memo_card()), overlay=memo_del, height=900),
              [('[삭제]', '클릭', '메모 제거', ''), ('[취소] · ✕', '클릭', 'S18', '')]))

    # ── OWNER · 계정 없음 `PC-159` ──
    B.append(('S21', 'OWNER 지정 — 기존 OWNER 바뀜', '분기',
              '다른 계정에서 <b>OWNER (대표 계정)</b>를 체크하면 「저장하면 OWNER 가 {기존} 에서 이 계정으로 바뀝니다」가 나오고, '
              '[저장]하면 기존 OWNER 는 <b>자동으로 풀린다</b> — OWNER 는 <b>고객사당 1명</b> <code>PC-159</code>.',
              frame('MEM-01', FR, layout(H, nav('acc'), acc_section(acc_card_list(1), acc_detail('edit', ACCS[1], n=3, dirty=True, owner='switch'))), height=1200),
              [('OWNER 체크', '체크', '바뀜 안내', '기존 OWNER 이름 · ID'),
               ('[저장]', '클릭', 'OWNER 이동', '기존 OWNER 해제 · 카드 OWNER 배지 이동 · <b>저장됨 · {ID}</b>'),
               ('OWNER 해제', '체크 풂 · [저장]', 'OWNER 없음', '이후 첫 새 계정이 OWNER 로 시작')]))
    B.append(('S22', '서비스 계정 없음 — 선택', '빈 상태',
              '<b>서비스 계정은 선택</b>이다. 계정이 없어도 고객사는 등록·사용할 수 있고, 등록 폼을 저절로 열지 않는다 — '
              '고객사가 서비스(CasterN 등)에 로그인해야 할 때 <b>[＋ 계정 추가]</b>로 만든다 <code>PC-159</code>.',
              frame('MEM-01', FR, layout(header(n_acc=0, n_on=0, svc=''), nav('acc'),
                    acc_section(acc_card_list(accs=()),
                                '<div style="' + CARD + ';padding:40px 0;text-align:center;color:#9ca3af;font-size:12.5px;line-height:1.8">'
                                '서비스 계정은 선택입니다.<br>고객사가 서비스(CasterN 등)에 로그인해야 할 때 [＋ 계정 추가]로 등록합니다.</div>')), height=800),
              [('[＋ 계정 추가]', '클릭', 'S12', '첫 계정은 OWNER 로 시작'),
               ('사용 서비스', '—', '기존 지정값 유지', '계정이 없으면 다시 계산하지 않는다 <code>PC-138</code>')]))

    # ── 서비스 티켓 `PC-171` `PC-173` ──
    B.append(('S23', '서비스 티켓 — 할당 범위 · 목록 | 상세', '기본',
              '서비스 티켓은 사용자에게 발급하는 키가 아니라 <b>고객사 계정과 매칭해 서비스 사용을 승인하는 기준</b>이다. '
              '그래서 [티켓 발급] 메뉴가 아니라 여기서 지정한다 <code>PC-173</code>. 주인은 <b>고객사</b>, 이 고객사의 서비스 계정 전원이 '
              '티켓의 범위 · 기간으로 승인된다. 이 설명은 본문에 두지 않고 머리의 <b>ⓘ</b> 를 누르면 <b>ⓘ 바로 아래</b> 말풍선 토스트로 잠깐 보인다(그림 = 띄운 상태) <code>PC-182</code> <code>PC-184</code>.',
              frame('MEM-01', FR, layout(H, nav('ticket'), acc_section(ticket_list(help_=True), ticket_detail())), height=1000),
              [('ⓘ', '클릭', '토스트', '<b>누른 ⓘ 바로 아래</b> 말풍선에 <b>사용자에게 발급하는 키가 아닙니다. 이 고객사의 서비스 계정 {n}명이 서비스를 쓸 때 티켓의 범위와 기간으로 승인합니다.</b> — 5초 뒤 사라지고 누르면 바로 닫힌다 · 본문에는 넣지 않는다 <code>PC-182</code>'),
               ('할당된 SOBP', '—', 'S · O · B 칩', 'SOBP 맵과 같은 칩 · 코드 종류(PDS2/PDS3) · 권 수는 보이지 않는다 · SOBP 할당 + <b>공유 코드 사용 고객사면 그 S/O</b>(공유 배지) <code>PC-181</code>'),
               ('티켓 카드', '클릭', '오른쪽 상세', 'No. · <b>사용 중 / 대기 / 만료</b> · 정산 배지 · S · O · B · P 칩 · 사용기간'),
               ('[＋ 티켓 지정]', '클릭', 'S24', ''),
               ('[티켓 수정]', '클릭(티켓 정보 아래 오른쪽 <code>PC-238</code>)', 'S24 폼(수정 모드)', '티켓은 <b>지우지 않고 고친다</b> — 그 티켓 값으로 채운 지정 폼 · 머리 「서비스 티켓 수정 · No.{n}」 · 버튼 [수정 저장] · 겹침 검사에서 자기 자신 제외 <code>PC-192</code>'),
               ('[정산] 탭', '클릭', 'S26', '상세 탭 = 티켓 정보 · 정산 <code>PC-179</code> · 카드에 정산 배지'),
               ('ⓘ 만료 후 동작', '클릭', '펼침', '숨김 안내 — S24'),
               ('등록 화면', '—', '<b>잠김</b>', '고객사를 먼저 등록해야 열린다 · <b>고객사를 먼저 등록하세요.</b>')]))
    B.append(('S24', '서비스 티켓 — 지정 폼 · 만료 후 동작 펼침', '분기',
              '할당된 SOBP 에서 고르고 <b>Start Book · Book Size · Start Page · Page Size · 사용기간 시작 · 끝</b>을 정한다(모두 필수). '
              'Start Book 기본값은 <b>범위 안에서 아직 티켓이 없는 첫 Book</b>. 「ⓘ 만료 후 동작」 은 눌러야 펼쳐지는 숨김 안내다 <code>PC-171</code> ④.',
              frame('MEM-01', FR, layout(H, nav('ticket'), acc_section(ticket_list(adding=True), ticket_form(open_=True))), height=1150),
              [('서비스', '선택 (필수)', 'casterN / 폼솔루션', '이 티켓으로 승인하는 서비스 · 고객사가 쓰는 서비스가 하나면 그것으로 시작 <code>PC-186</code>'),
               ('Code Type', '선택 (필수)', 'PDS3 / PDS2', '서비스 옆에 나란히(세로선으로 구분) · 범위를 고르면 그 범위의 종류로 맞추고, 직접 고르면 그대로 둔다 <code>PC-188</code>'),
               ('지정 범위', '선택', 'Section · Owner 자동', '할당 SOBP · <b>하위 고객사면 상위 SOBP 영역</b>(공유) <code>PC-195</code>'),
               ('구간 사용 현황', '자동', '범위 아래', '이미 발급된 구간(App Key · N Key · 서비스 티켓 · 고객사) · <b>빈 Book 구간</b>(누르면 Start Book 이동) · 입력 구간 사용 가능 / 겹침 <code>PC-195</code>'),
               ('Book · Page', '입력', '범위 안으로 제한', 'Page Size 기본 512'),
               ('사용기간', '입력 (필수)', '—', '무제한 없음 · 기간은 키 관리에서만 정한다(SOBP 할당에는 기간 없음) <code>PC-175</code>'),
               ('[티켓 지정]', '클릭', 'S23 상세', '<b>필수 항목이 하나라도 비면 비활성</b> · 툴팁 <b>입력하지 않은 항목: {항목들}</b> <code>PC-189</code> · 겹침 검사 통과 시 · <code>LOG-01</code> 티켓 발급 활동'),
               ('[취소]', '클릭', 'S23', '')]))
    B.append(('S25', '서비스 티켓 — 겹침 오류', '오류',
              '<b>N Key · App Key · 서비스 티켓은 SOBP 가 절대 겹칠 수 없다</b> — 고객사를 가리지 않고 전체 발급분과 비교한다 <code>PC-174</code>.',
              frame('MEM-01', FR, layout(H, nav('ticket'), acc_section(ticket_list(adding=True),
                    ticket_form(err='이미 서비스 티켓로 발급된 SOBP 와 겹칩니다 — %s · S3/O17/B431~450/P0~511. N Key · App Key · 서비스 티켓은 SOBP 가 겹칠 수 없습니다. 다른 Book · Page 를 고르세요.' % CO, start='445'))), height=1050),
              [('⓪ 서비스 미선택', '—', '오류', '<b>서비스(casterN / 폼솔루션)를 선택하세요.</b> <code>PC-186</code>'),
               ('① 범위 미선택', '—', '오류', '<b>지정 범위(할당 SOBP)를 선택하세요.</b>'),
               ('② 기간 비어 있음', '—', '오류', '<b>사용기간 시작과 끝을 모두 정하세요.</b>'),
               ('③ 끝 &lt; 시작', '—', '오류', '<b>사용기간 끝이 시작보다 앞설 수 없습니다.</b>'),
               ('④ SOBP 겹침', '—', '오류', '<b>이미 {App Key / N Key / 서비스 티켓}로 발급된 SOBP 와 겹칩니다 — {고객사} · S/O/B/P. N Key · App Key · 서비스 티켓은 SOBP 가 겹칠 수 없습니다.</b> (전체 고객사 기준)'),
               ('⑤ Code Type 범위', '—', '오류', '<b>{종류} 의 S{n} Owner 는 0~{n} 입니다</b> · Book · Page 범위도 같은 식 · <b>S{n} 은 {종류} 코드 타입이 없습니다.</b> <code>PC-279</code>'),
               ('⑥ 교재 검사', '—', '오류', '<b>티켓 범위 안에 다른 고객사({이름}) 소유 교재가 있습니다 …</b> · <b>범위를 바꾸면 이 고객사 소유 교재가 티켓 범위를 벗어납니다 …</b> <code>PC-291</code>')]))
    B.append(('S26', '서비스 티켓 — 정산 탭', '분기',
              'N Key · App Key 처럼 <b>정산은 별도 탭</b>이다 <code>PC-179</code>. 고른 서비스 티켓의 정산을 N Key 와 같은 4종으로 등록한다 <code>PC-176</code>.',
              frame('MEM-01', FR, layout(H, nav('ticket'), acc_section(ticket_list(), ticket_detail('bill'))), height=1000),
              [('[정산] 탭', '클릭', '정산 입력', '정산 미등록이면 탭에 <b>미정</b> 배지'),
               ('과금 유형', '선택', '미정 · 유료 · 무료 · 체험', '유료 = 금액 필수 · 체험 = 만료일(기본 1개월 뒤)'),
               ('[정산 저장]', '클릭', '저장', '<b>정산 정보가 저장되었습니다.</b> · 금액 0 이면 <b>유료는 금액을 입력해야 합니다.</b> · <code>LOG-01</code>'),
               ('[티켓 정보] 탭', '클릭', 'S23', '')]))

    # ── 공통코드 · 확장 언어 `PC-330` — 탭 `PC-362` · 코드 지정 `PC-364` · 고객사당 기본 1개 · 단독 코드 · 하위 고객사 승계 `PC-373` ──
    lg_holder = [('0', '4', 'PDS3', 3, True), ('0', '5', None, 0, True), ('0', '6', None, 0, True),
                 ('0', '7', None, 0, True), ('0', '20', None, 0, True)]
    lg_tags = {LG: (('하위 3',) + SUB_T, ('확장 언어',) + LANG_T)}
    lg_tags0 = {LG: (('하위 3',) + SUB_T,)}   # 저장된 그룹이 없을 때(S29) — 「확장 언어」 배지 없음
    lg_head = header(name=LG, kind='상위 고객사', n_acc=1, n_on=1)
    g4_langs = {'4': ('한국어', '영어', '중국어', '일본어'), '5': ('베트남어', '태국어'), '6': ('러시아어',)}
    g20_langs = {'20': ('한국어', '영어'), '7': ('스페인어',)}
    lg_cells = [('0', '4', '기본'), ('0', '5', '확장 · 기본 O4'), ('0', '6', '확장 · 기본 O4'), ('0', '7', ''), ('0', '20', '')]
    too_many = '기본 코드는 고객사당 1개입니다 — 지금 기본 O4 · O20. 하나만 기본으로 두고 나머지는 확장 또는 단독으로 바꾸세요.'
    B.append(('S27', '공통코드 · 확장 언어 — 상위 고객사 탭', '기본',
              '<b>등록된 고객사</b>의 메뉴 <b>[공통코드 · 확장 언어]</b>(관련 서류 아래). 상위 고객사(공통코드) 지정과 확장 언어 그룹은 <b>다른 일</b>이라 '
              '섹션 위 <b>탭 [상위 고객사 (공통코드) {n}] [확장 언어 그룹 {n}]</b> 으로 나눈다(처음엔 상위 고객사 탭) <code>PC-362</code>. '
              '이 탭은 이 고객사가 <b>SOBP 맵에서 할당받은 S/O</b> 를 하나씩 작은 카드로 보이고, 전용 코드는 <b>[공통코드로 지정]</b> 만 누른다 — '
              '코드 종류(PDS3 / PDS2) 셀렉트는 없다(할당 기록의 종류를 따르고 미정이면 PDS3) <code>PC-333</code> <code>PC-358</code>.',
              frame('MEM-01', FR, layout(lg_head, nav('codes', codes='상위 🌐'), codes_tabs('holder', 1, 1) + holder_card(lg_holder),
                                         sel=LG, tags=lg_tags), height=900),
              [('섹션 메뉴', '클릭', '이 섹션', '<b>공통코드 · 확장 언어</b> — 관련 서류 아래 · 배지: 상위 고객사면 <b>상위</b>, 확장 언어 그룹이 있으면(승계 포함 — S31) <b>🌐</b> · 등록 화면에서는 잠김(S1) <code>PC-330</code> <code>PC-373</code>'),
               ('탭', '클릭', '상위 고객사 (공통코드) / 확장 언어 그룹(S28)', '탭 옆 숫자 = 이 고객사의 공통코드 수 · 저장된 확장 언어 그룹 수(하위 고객사는 승계한 그룹 포함 — S31 <code>PC-373</code>) · 처음엔 상위 고객사 탭 <code>PC-362</code>'),
               ('전용 코드 카드', '—', 'S · O 칩 · 「전용 코드」 · [공통코드로 지정]', '코드 종류 셀렉트 없음 <code>PC-358</code> · 확장 언어 그룹의 확장 코드는 [공통코드로 지정] 비활성(S32) <code>PC-374</code>'),
               ('[공통코드로 지정]', '클릭', '「공통코드 · {PDS2/PDS3}」 · 하위 고객사 0곳 · [지정 해제]', '종류 = 할당 기록의 종류(미정이면 PDS3) <code>PC-358</code> · 이 고객사가 <b>상위 고객사</b>가 된다(머리말 분류 · 목록 구분) · 모든 고객사의 <b>공통코드 사용 고객사(하위 등록)</b>(S4)에 「고객사-owner」(예: <b>시원스쿨-4</b>)로 나타난다 <code>PC-362</code> · <code>LOG-01</code>'),
               ('[지정 해제]', '클릭', '전용 코드로', '화면에서 지정한 공통코드만 · 하위가 있으면 확인창 <b>하위 고객사 {n}곳이 이 공통코드를 쓰고 있습니다. 지정을 해제할까요?</b> · 처음부터 등록된 공통코드는 <b>기본 등록</b>(해제 없음)'),
               ('할당 코드 없음', '—', '안내', '<b>할당받은 코드가 없습니다. SOBP 맵에서 먼저 할당하세요.</b>(SOBP 맵 링크) — 확장 언어 그룹 탭도 같다(하위 고객사가 승계한 그룹만 있으면 승계 카드만 — S31)'),
               ('ⓘ', '클릭', '말풍선', '<b>할당받은 S/O 를 공통코드로 지정하면 이 고객사가 상위 고객사가 되고, 모든 고객사의 공통코드 사용 고객사(하위 등록) 목록에 나타납니다. 하위 고객사는 그 코드의 Book 을 나눠 씁니다.</b>'),
               ('옛 슬롯 고객사', '—', '<b>왼쪽 목록에서 숨김</b>', '「Common 추가 언어 슬롯-964~983」 · 「Cake-984~1003」 처럼 할당받은 S/O 가 모두 다른 고객사 그룹의 확장 슬롯인 고객사 — 그 Owner 는 그룹 고객사(Common-21 · Cake-1009) 아래에서 보인다 · 할당 · 편집 데이터는 그대로 <code>PC-330</code> <code>PC-340</code>')]))
    B.append(('S28', '확장 언어 그룹 — 코드 지정 · 그룹 칸', '기본',
              '[확장 언어 그룹] 탭. 위 <b>코드 지정</b> 에 할당된 코드를 <b>모두 펼쳐</b> 놓고 코드마다 셀렉트(<b>단독 (전용 코드) / 기본 / 확장 · 기본 O{n}</b>)로 바로 고른다 — '
              '만들기 · 언어 등록 버튼은 없다 <code>PC-364</code>. 고객사 한 곳에 <b>기본 코드는 1개(그룹 하나)</b>이고 <b>지정한 Owner 만 확장</b>이다 — '
              '지정하지 않은 코드는 <b>단독(전용) 코드</b>로 회색 칸 그대로 저장된다 <code>PC-373</code>. 예: 할당 S0 · O4 · O5 · O6 · O7 · O20 → '
              '<b>O4 기본 = 확장 O5 · O6</b>, O7 · O20 은 단독(머리 <b>· 단독 2개</b>). '
              '아래 <b>그룹 칸 하나</b> — 머리(🌐 기본 S · O · 확장 · 필요 언어 수)와 등록한 언어 칩 · 코드 · 역할 · 언어 한 표뿐이고, 「코드 종류」 칸은 없다(Section · 종류는 기본 코드를 따름). '
              '기본 바꾸기는 표 첫 줄 <b>[기본 ▾]</b> — 확장 코드와 단독 코드가 후보(그림 = 펼친 상태) <code>PC-362</code>. 저장은 카드 아래 [취소] [저장] 한 번 <code>PC-363</code>.',
              frame('MEM-01', FR, layout(lg_head, nav('codes', codes='상위 🌐'),
                                         codes_tabs('lang', 1, 1) +
                                         lang_tab(lg_cells,
                                                  group_block('0', '4', ['5', '6'], 12, g4_langs,
                                                              base_open=['기본', '기본 ← O5 (확장 1)', '기본 ← O6 (확장 2)', '기본 ← O7', '기본 ← O20']),
                                                  status='그룹 1개 · 등록한 언어 7개', n_free=2),
                                         sel=LG, tags=lg_tags), height=1150),
              [('머리', '—', '그룹 {n}개 · 등록한 언어 {n}개 · 단독 {n}개', '그룹이 없으면 <b>사용 안 함</b> · 그룹이 있고 단독 코드가 있으면 <b>· 단독 {n}개</b>(회색) <code>PC-373</code> · 할당 코드가 없으면 <b>할당받은 코드가 없습니다. SOBP 맵에서 먼저 할당하세요.</b> <code>PC-364</code>'),
               ('코드 지정 · {n}개', '—', '할당 코드마다 칸', 'S · O + 셀렉트 · 칸 색 기본 파랑 · 확장 청록 · <b>단독 회색</b>(경고색 아님) <code>PC-364</code> <code>PC-373</code>'),
               ('코드 셀렉트', '선택', 'S29', '<b>단독 (전용 코드) / 기본 / 확장 · 기본 O{n}</b> · 기본이 이미 있으면 다른 코드에는 <b>기본</b>이 없다(바꾸기는 그룹 칸의 [기본 ▾]) <code>PC-373</code> · 한 코드는 한 역할만 <code>PC-364</code> · 공용 코드는 확장 항목 없음(S32) <code>PC-374</code>'),
               ('단독 (전용 코드)', '—', '그대로 저장', '확장 언어와 상관없는 전용 코드로 남는다 — 저장을 막지 않는다(옛 「할당 코드를 모두 지정해야 저장」 <code>PC-363</code> 폐지) <code>PC-373</code>'),
               ('다른 고객사 그룹에 든 코드', '—', '셀렉트 대신 「{그룹 고객사} 그룹」', '회색 · 바꿀 수 없음 · 단독 수에 넣지 않는다'),
               ('그룹 칸 머리', '—', '🌐 기본 S · O · 확장 O{n} · O{n}(없으면 없음)', '고객사당 하나 <code>PC-373</code> · [그룹 삭제] · [＋ 언어 등록] 없음 — 그룹을 지우려면 코드 지정에서 기본 코드를 <b>단독</b>으로(저장 때 반영) <code>PC-364</code> · 「코드 종류」 칸 없음 <code>PC-357</code>'),
               ('필요 언어 수', '입력', '1 이상', '필요 확장 Owner = ⌈언어 수 ÷ 4⌉ − 1(자리 수 계산에만) · 0 이면 저장 차단 <b>S{s}/O{n} 그룹 — 필요 언어 수는 1 이상이어야 합니다.</b>'),
               ('등록한 언어 {n} / {필요}', '—', '슬롯 번호 순 칩', '툴팁 <b>O{n} · 슬롯 {s}</b> / <b>할당 전 · 슬롯 {s}</b> · 없으면 <b>아직 없음</b> <code>PC-334</code>'),
               ('[기본 ▾] (표 첫 줄)', '선택', '기본 코드 바꿈', '<b>기본 ← O{n} (확장 k)</b> = 자리 맞바꿈 · <b>기본 ← O{n}</b>(같은 Section 의 단독 코드) = 지금 기본이 마지막 확장 · 언어는 코드를 따라간다 · 코드 종류는 새 기본 코드의 할당 종류 · 저장해야 반영 <code>PC-362</code>'),
               ('[확장 k ▾]', '선택', '확장 코드끼리 맞바꿈', '확장 1 … 확장 {n} · 마지막 확장에만 <b>— 빼기</b> — 뺀 코드는 언어가 지워지고 코드 지정에서 <b>단독</b>이 된다(그대로 저장된다) <code>PC-346</code> <code>PC-373</code>'),
               ('코드 없이 언어만 든 자리', '—', '[코드 선택 ▾] [확장 k] 줄', '그 자리에 언어가 있을 때만 보인다 · 코드를 고르면 그 자리의 확장 코드가 된다 <code>PC-347</code>'),
               ('언어 칸', '입력', '슬롯 1~4(기본) · 5~8(확장 1) …', '빈 칸 = 지정된 언어 없음 · 언어 순서는 없다(펌웨어팀과 정한 슬롯)'),
               ('코드 · 역할 ⓘ', '클릭', '말풍선', '<b>기본 코드는 1개로 슬롯 1~4, 나머지는 확장 — 확장 1 = 5~8 · 확장 2 = 9~12 … 입니다. 기본도 다른 코드로 바꿀 수 있습니다(나머지는 확장). … 뺀 코드는 단독(전용) 코드가 됩니다.</b>'),
               ('머리 ⓘ', '클릭', '말풍선', '<b>할당된 코드 중 기본 1개를 고르고, 확장 언어로 쓸 Owner 만 확장으로 고릅니다. 지정하지 않은 코드는 단독(전용) 코드로 그대로 남습니다. … 이 고객사의 하위 고객사는 이 그룹을 그대로 승계합니다.</b> <code>PC-373</code>'),
               ('카드 아래 [저장]', '클릭', '그룹 칸을 저장', '지정하지 않은 코드는 단독으로 저장 · 기본이 둘 이상이면 저장 안 됨(S30) <code>PC-373</code> · <code>LOG-01</code> <b>확장 언어 그룹 등록/수정 · {고객사} · 기본 S{s}/O{n} · 언어 {n}개 · 확장 O{n}·O{n}</b> <code>PC-363</code>'),
               ('카드 아래 [취소]', '클릭', '되돌림', '마지막 저장값 · 변경이 없으면 비활성')]))
    B.append(('S29', '확장 언어 그룹 — 기본을 고르면 그룹 칸 · 나머지는 단독', '분기',
              '그룹이 없던 고객사에서 코드 지정의 O4 를 <b>기본</b>으로 고르면 아래에 O4 그룹 칸이 <b>「새 그룹」</b> 으로 생기고(필요 언어 수 4), '
              '이어서 O5 · O6 을 <b>확장 · 기본 O4</b> 로 고른 모습이다. 지정하지 않은 O7 · O20 은 <b>단독 (전용 코드)</b> 회색 칸 그대로이고 머리에 <b>· 단독 2개</b>(회색). '
              '기본이 생기면 다른 코드의 셀렉트에는 <b>기본이 없다</b> — O7 셀렉트를 펼치면 <b>단독 (전용 코드) / 확장 · 기본 O4</b> (그림 = 펼친 상태) <code>PC-364</code> <code>PC-373</code>.',
              frame('MEM-01', FR, layout(lg_head, nav('codes', dirty=('codes',), codes='상위'),
                                         codes_tabs('lang', 1, 0) +
                                         lang_tab(lg_cells,
                                                  group_block('0', '4', ['5', '6'], 4, {}, new=True),
                                                  status='그룹 1개 · 등록한 언어 0개', n_free=2, dirty=True,
                                                  open_=('7', ['단독 (전용 코드)', '확장 · 기본 O4'], 0)),
                                         sel=LG, tags=lg_tags0), height=1100),
              [('[기본]', '선택', '그 코드로 그룹 칸 생김', '머리 <b>새 그룹</b> · 필요 언어 수 4 · 그 코드에 언어가 있으면 따라온다 · 고객사당 하나 <code>PC-364</code> <code>PC-373</code>'),
               ('기본이 있을 때 다른 코드 셀렉트', '—', '<b>단독 (전용 코드) / 확장 · 기본 O{n}</b>', '<b>기본</b> 항목이 없다 — 기본 바꾸기는 그룹 칸 첫 줄 [기본 ▾](S28) <code>PC-373</code>'),
               ('[확장 · 기본 O{n}]', '선택', '그 그룹의 마지막 확장', '그룹 칸 머리 「확장 …」 과 표에 줄이 붙는다 · 언어는 코드를 따라간다'),
               ('[단독 (전용 코드)]', '선택', '그룹에서 뺌', '기본 코드를 단독(또는 확장)으로 바꾸면 <b>그 그룹이 풀리고</b> 확장 코드들은 단독으로 돌아간다 — 그룹 지우기는 이렇게(저장 때 반영)'),
               ('지정하지 않은 코드', '—', '회색 칸 · 머리 「· 단독 {n}개」', '경고가 아니다 — 이대로 [저장]하면 <b>단독(전용) 코드</b>로 저장된다 <code>PC-373</code>(옛 「노란 칸 · 저장 막힘」 <code>PC-363</code> 폐지)'),
               ('그룹이 하나도 없음', '—', '머리 「사용 안 함」', '코드 칸이 모두 단독(회색) · 셀렉트는 <b>단독 (전용 코드) / 기본</b> · 저장된 그룹도 없으면 카드 아래 버튼 없음'),
               ('탭 숫자', '—', '저장된 그룹 수', '새 그룹은 저장해야 탭 숫자 · 메뉴 🌐 · 목록 「확장 언어」 배지에 반영'),
               ('메뉴 ●', '표시', '저장 안 한 섹션', '카드 아래 <b>● 저장하지 않은 변경이 있습니다</b> · [취소] 활성')]))
    save_dlg = ('<div class="ovl"><div class="mdl">'
                '<div style="font-size:13px;color:#374151;line-height:1.7">' + too_many + '</div>'
                '<div class="mf"><div class="btn pri">확인</div></div></div></div>')
    B.append(('S30', '확장 언어 그룹 — 기본이 둘 이상(옛 저장값)', '오류',
              '옛 규칙(기본 코드마다 그룹 <code>PC-357</code>)으로 <b>기본이 둘 이상</b> 저장된 고객사 — 예: O4 기본 = 확장 O5 · O6 / O20 기본 = 확장 O7. '
              '<b>데이터는 그대로</b> 두고 코드 지정 위에 빨간 줄이 뜬다. 이대로 [저장]하면 <b>저장되지 않고</b> 확인창이 뜨며, 닫은 뒤에도 카드 아래에 같은 빨간 줄이 남는다 — '
              '하나만 기본으로 두고 나머지를 확장 또는 단독으로 바꾸면 사라진다 <code>PC-373</code>. 옛 「지정 안 한 코드 저장 막힘」 <code>PC-363</code> 은 없앴다.',
              frame('MEM-01', FR, layout(lg_head, nav('codes', codes='상위 🌐'),
                                         codes_tabs('lang', 1, 2) +
                                         lang_tab([('0', '4', '기본'), ('0', '5', '확장 · 기본 O4'), ('0', '6', '확장 · 기본 O4'),
                                                   ('0', '7', '확장 · 기본 O20'), ('0', '20', '기본')],
                                                  group_block('0', '4', ['5', '6'], 12, g4_langs) +
                                                  group_block('0', '20', ['7'], 8, g20_langs),
                                                  status='그룹 2개 · 등록한 언어 10개', err=too_many, top_err=too_many),
                                         sel=LG, tags=lg_tags), overlay=save_dlg, height=1300),
              [('코드 지정 위 빨간 줄', '표시', '열자마자', '기본이 둘 이상이면 <b>⚠ 기본 코드는 고객사당 1개입니다 — 지금 기본 O{n} · O{n}. 하나만 기본으로 두고 나머지는 확장 또는 단독으로 바꾸세요.</b> · 데이터는 고칠 때까지 그대로 <code>PC-373</code>'),
               ('[저장]', '클릭', '<b>저장 안 됨</b> · 확인창', '확인창 <b>기본 코드는 고객사당 1개입니다 — 지금 기본 O{n} · O{n}. 하나만 기본으로 두고 나머지는 확장 또는 단독으로 바꾸세요.</b> <code>PC-373</code>'),
               ('확인창 [확인]', '클릭', '닫힘', '카드 아래에도 같은 빨간 줄 <b>⚠ 기본 코드는 고객사당 1개입니다 — …</b> 이 남는다 · 코드 지정을 고치면 사라진다'),
               ('고치는 법', '선택', '기본 하나만 남김', '나머지 기본 코드를 <b>확장 · 기본 O{n}</b> 또는 <b>단독</b>으로 — 그 그룹이 풀리고 그 확장 코드들은 단독으로 돌아간다 → [저장]'),
               ('지정하지 않은 코드', '—', '검사 없음', '단독(전용) 코드로 저장 — 옛 「할당된 코드를 모두 기본 또는 확장 언어로 지정해야 저장」 확인창 <code>PC-363</code> 폐지 <code>PC-373</code>'),
               ('그룹을 모두 지우는 저장', '[저장]', '저장됨', '모든 기본 코드를 단독으로 → 검사 없음')]))
    c21_rows = ([('21', '기본', '1 한국어 · 2 영어 · 3 중국어 · 4 일본어'),
                 ('964', '확장 1', '5 베트남어 · 6 러시아어 · 7 몽골어 · 8 캄보디아어(크메르어)'),
                 ('965', '확장 2', '9 스리랑카어 · 10 필리핀어(따갈로그어)')]
                + [(str(o), '확장 %d' % (o - 963), '지정된 언어 없음') for o in range(966, 984)])
    B.append(('S31', '확장 언어 그룹 — 하위 고객사 승계', '분기',
              '공통코드 사용 고객사(하위, §4.4)는 그 공통코드가 확장 언어 그룹의 기본 코드이면 <b>상위 고객사의 그룹을 그대로 승계</b>한다 <code>PC-373</code>. '
              '예: <b>전북교육청</b>(Common-21 하위) — [확장 언어 그룹] 탭에 승계 카드 <b>🌐 확장 언어 그룹 [승계 · Common-21] 기본 S3/O21 · 확장 20개</b> — '
              '코드마다 S · O · <b>기본 / 확장 k</b> · 언어(<b>5 베트남어 · 6 러시아어 …</b> / <b>지정된 언어 없음</b>)이고 <b>읽기 전용</b>이다. '
              '전북교육청은 할당받은 코드가 없어 <b>자기 그룹 칸(코드 지정)은 나오지 않는다</b>. 탭 수 · 메뉴 🌐 배지에 승계 그룹이 들어간다.',
              frame('MEM-01', FR, layout(header(name=SUBCO, kind='하위 고객사', n_acc=1, n_on=1), nav('codes', codes='🌐'),
                                         codes_tabs('lang', 0, 1) + inherited_card('Common-21', '3', c21_rows),
                                         sel=SUBCO, grp=('Common-21', 50, ('인천교육청', '장원교육', SUBCO, '중앙일보', '청담어학원'), 45)),
                    height=1000),
              [('승계 카드 머리', '—', '🌐 확장 언어 그룹 · [승계 · {상위 고객사-owner}] · 기본 S{s}/O{n} · 확장 {n}개', '보라 칩 = 상위 고객사 「고객사-owner」(예: <b>Common-21</b>) <code>PC-362</code> <code>PC-373</code>'),
               ('ⓘ', '클릭', '말풍선', '<b>이 고객사는 {상위} 공통코드의 하위 고객사라서 상위 고객사의 확장 언어 그룹을 그대로 씁니다. 기본 · 확장 코드와 언어는 상위 고객사에서 고치고, 여기서는 보기만 합니다.</b>'),
               ('코드 칸', '—', 'S · O · 기본 / 확장 k · 언어', '기본 → 확장 1 · 확장 2 … 순 · 언어 <b>{슬롯} {언어} · …</b>(예: <b>5 베트남어 · 6 러시아어 · 7 몽골어 · 8 캄보디아어(크메르어)</b>) · 언어가 없으면 <b>지정된 언어 없음</b> · 칸 색 기본 파랑 · 확장 청록'),
               ('읽기 전용', '—', '셀렉트 · 입력 · [저장] 없음', '기본 · 확장 코드와 언어는 상위 고객사(Common-21)의 이 탭(S28)에서 고친다'),
               ('자기 그룹 칸', '—', '할당 코드가 없으면 없음', '하위 고객사가 할당받은 코드가 없으면 코드 지정 · 그룹 칸이 나오지 않는다 · 할당받은 코드가 있으면 승계 카드 아래에 이 고객사의 확장 언어 그룹 카드(S28)도 나온다'),
               ('승계 조건', '—', '공통코드 사용 고객사', '하위 등록(§4.4)한 공통코드가 확장 언어 그룹의 <b>기본 코드</b>일 때 · 그룹마다 카드 하나 · 상위 고객사 자신에게는 없다'),
               ('탭 숫자 · 메뉴 배지', '—', '승계 그룹 포함', '[확장 언어 그룹 {n}] · 메뉴 <b>🌐</b> 에 승계한 그룹을 센다 <code>PC-373</code>'),
               ('편집 교재 · 티켓', '참고', '그대로', '편집 교재(<code>PRJ-04</code> §4.2.1)는 원래 상위 그룹의 확장 언어 코드를 고른다 · 티켓 발급 범위는 승계로 바뀌지 않는다')]))
    # ── 공용 코드는 기본으로만 `PC-374` — Common-21(공용 코드 S3/O21 = 그룹 기본 · 확장 O964~983) ──
    c21_langs = {'21': ('한국어', '영어', '중국어', '일본어'), '964': ('베트남어', '러시아어', '몽골어', '캄보디아어(크메르어)'),
                 '965': ('스리랑카어', '필리핀어(따갈로그어)')}
    common_ext = 'S{s}/O{n} 는 공용 코드라 확장 언어 그룹에서 기본으로만 설정할 수 있습니다 — 확장으로는 넣을 수 없습니다. 기본 또는 단독으로 바꾸세요.'
    B.append(('S32', '확장 언어 그룹 — 공용 코드는 기본으로만', '분기',
              '공용(공통)코드는 확장 언어 그룹에서 <b>기본으로만</b> 설정하고 <b>확장으로는 넣지 않는다</b> <code>PC-374</code>. '
              '예: <b>Common-21</b>(상위 고객사 · 공용 코드 S3/O21) ▸ 공통코드 · 확장 언어 ▸ [확장 언어 그룹] 탭 — 코드 지정의 S3 · O21 칸에 초록 작은 칩 <b>공용</b> 이 붙고, '
              '셀렉트는 <b>단독 (전용 코드) / 기본</b> 뿐이다(확장 항목 없음 · 그림 = 펼친 상태). '
              '아래 그룹 칸 <b>기본 O21 · 확장 O964 ~ O983</b> 의 표 첫 줄 셀렉트는 <b>기본 · 공용</b> 하나뿐 — 다른 코드와 맞바꾸면 공용 코드가 확장이 되므로 바꾸지 않는다(그림 = 펼친 상태). '
              '확장 자리 「코드 선택」 후보에서도 공용 코드는 빠지고, 상위 고객사 탭에서 확장 코드의 [공통코드로 지정] 은 흐리게(비활성) 보인다. '
              '옛 저장값으로 확장에 공용 코드가 든 채 [저장]하면 저장되지 않고 확인창이 뜬다(아래 표). SOBP 할당 창도 같은 규칙(<code>SOB-02</code> S11 · S14).',
              frame('MEM-01', FR, layout(header(name='Common-21', kind='상위 고객사', n_acc=1, n_on=1), nav('codes', codes='상위 🌐'),
                                         codes_tabs('lang', 1, 1) +
                                         lang_tab([('3', '21', '기본')],
                                                  group_block('3', '21', [str(o) for o in range(964, 984)], 10, c21_langs,
                                                              base_open=['기본 · 공용'], base_label='기본 · 공용'),
                                                  status='그룹 1개 · 등록한 언어 10개',
                                                  open_=('21', ['단독 (전용 코드)', '기본'], 1), common=('21',)),
                                         sel='Common-21'), height=1900),
              [('「공용」 칩', '—', '공용 코드 칸', 'S · O 옆 초록 작은 칩 <b>공용</b> · 툴팁 <b>공용 코드 — 확장 언어 그룹에서는 기본으로만 설정할 수 있습니다</b> <code>PC-374</code>'),
               ('공용 코드 셀렉트', '선택', '<b>단독 (전용 코드) / 기본</b>', '<b>확장 · 기본 O{n}</b> 항목이 없다 · 다른 코드가 이미 기본이면 <b>단독 (전용 코드)</b> 하나뿐(기본은 고객사당 1개 <code>PC-373</code>) — '
                '그때 공용 코드를 기본으로 하려면 그룹 칸 [기본 ▾] 의 <b>기본 ← O{n}</b> <code>PC-374</code>'),
               ('[기본 · 공용 ▾] (표 첫 줄)', '—', '항목 <b>기본 · 공용</b> 하나뿐', '기본이 공용 코드면 다른 코드로 바꾸지 않는다(바꾸면 공용 코드가 확장이 되므로) · 툴팁 <b>공용 코드는 기본으로만 설정할 수 있어 다른 코드로 바꾸지 않습니다(바꾸면 이 코드가 확장이 됩니다)</b> · '
                '그룹을 풀려면 코드 지정에서 기본 코드를 <b>단독</b>으로 <code>PC-374</code>'),
               ('기본이 공용 코드가 아닐 때 [기본 ▾]', '선택', '기본 ← O{n}', '같은 Section 의 단독 공용 코드도 후보 — 고르면 공용 코드가 기본, 지금 기본은 마지막 확장(S28) <code>PC-362</code>'),
               ('확장 자리 [코드 선택 ▾]', '선택', '공용 코드 제외', '코드 없이 언어만 든 자리의 후보에 공용 코드가 나오지 않는다 <code>PC-347</code> <code>PC-374</code>'),
               ('[저장] — 확장에 공용 코드(옛 저장값)', '클릭', '<b>저장 안 됨</b> · 확인창', '확인창 <b>' + common_ext + '</b> · [확인] 뒤 카드 아래 같은 빨간 줄 <b>⚠ S{s}/O{n} 는 공용 코드라 …</b> · '
                '필요 언어 수 · 기본 1개(S30) 확인 다음에 본다 <code>PC-374</code>'),
               ('옛 저장값 공용 코드 칸', '—', '셀렉트 <b>단독 (전용 코드) / 확장 · 기본 O{n}</b>', '이미 확장에 든 공용 코드는 지금 값만 남겨 보인다 — <b>단독</b>으로 바꾸거나 그룹 칸 [기본 ▾] 의 <b>기본 ← O{n} (확장 k)</b> 로 기본과 맞바꾸면 [저장] 된다'),
               ('상위 고객사 탭 [공통코드로 지정]', '—', '확장 코드는 <b>비활성</b>(흐림)', '확장 언어 그룹의 확장 코드 카드 — 툴팁 <b>확장 언어 그룹의 확장 코드입니다 — 공용 코드는 확장 언어 그룹에서 기본으로만 설정할 수 있어 지정할 수 없습니다</b> · '
                '지정하려면 먼저 그룹에서 빼거나(단독) 기본으로 · 기본 · 단독 코드는 그대로 지정할 수 있다(S27) <code>PC-374</code>'),
               ('머리 ⓘ', '클릭', '말풍선', '… <b>공용 코드는 기본으로만 설정할 수 있고 확장으로는 넣을 수 없습니다.</b> … <code>PC-374</code>'),
               ('공용 코드', '참고', '공통코드 목록', '처음부터 등록된 공통코드 + 상위 고객사 탭(S27)에서 지정한 공통코드 · 코드 종류(PDS2 / PDS3)와 상관없이'),
               ('SOBP 할당 창', '참고', '<code>SOB-02</code> S11 · S14', '공용 코드 좌표는 [연결할 그룹] 의 확장으로 넣지 않는다 — 같은 문구 한 줄 · [그룹에 넣기] · [할당] 비활성 <code>PC-374</code>')]))

    intro = ('고객사를 <b>등록</b>하고 <b>상세·수정</b>하는 화면이다. 「<b>머리말 + 섹션 메뉴 | 본문</b>」 구조이며 '
             '섹션은 고객사 정보(기본 정보 · 편집 단가 · 관련 서류 · <b>공통코드 · 확장 언어</b>)와 운영(서비스 계정 · <b>서비스 티켓</b> · 업무 메모)이다 <code>PC-136</code> <code>PC-173</code> <code>PC-330</code> <code>PC-358</code>. '
             '공통코드 · 확장 언어는 탭 [상위 고객사 (공통코드)] [확장 언어 그룹] 이고, 확장 언어 그룹은 <b>고객사당 기본 코드 1개(그룹 하나)</b> — 할당 코드를 모두 펼친 코드 지정에서 바로 고르고, 지정하지 않은 코드는 <b>단독(전용) 코드</b>로 저장되며, 하위 고객사는 상위 고객사의 그룹을 <b>승계</b>한다 <code>PC-362</code> <code>PC-364</code> <code>PC-373</code>. '
             '공용(공통)코드는 그룹의 <b>기본으로만</b> 설정한다 — 확장 불가 <code>PC-374</code>. '
             '<b>등록</b>은 한 번 — 섹션 아래 [등록] 또는 서비스 계정 [계정 추가](고객사 함께 등록). 그 뒤는 <b>섹션·계정 단위로 저장</b>한다(PRD §4.8). '
             '진행 상태는 머리말 오른쪽 진행중/사업 종료 <code>PC-139</code>, 사용 서비스는 <b>서비스 계정의 서비스</b> <code>PC-138</code>, '
             '서비스 계정은 「카드 목록 | 상세」와 서비스 권한 탭 <code>PC-140</code> — <b>선택</b>이고, 비밀번호는 받지 않으며 <b>OWNER 는 1명</b> <code>PC-159</code>.')
    return page(CODE, NAME, PRD, intro, B)
