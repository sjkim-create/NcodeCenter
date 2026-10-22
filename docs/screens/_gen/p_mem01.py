# -*- coding: utf-8 -*-
"""MEM-01 고객사 관리 — [표 보기] 목록 표 (web/components/CompaniesView.tsx CompaniesTable) `PC-204`
고객사 관리는 3단(MEM-02)이 기본이고, 머리의 [표 보기]로 이 목록 표를 연다."""
from shell import page, frame
import kws

CODE, NAME = 'MEM-01', '고객사 관리'
PRD = 'docs/prd/MEM-01_고객사 관리.md'

TIERS = (('', '전체', 536, '#374151', '#eef6ff'),
         ('holder', '상위 고객사', 6, '#047857', '#ecfdf5'),
         ('member', '하위 고객사', 211, '#7e22ce', '#f3e8ff'),
         ('solo', '단독 고객사', 319, '#6b7280', '#f3f4f6'))

# 업체명, 계층, 담당자, 연락처, 사업자번호, 은행, 계좌, 커먼코드, 전용단가수, 주소, 서류, 업무, 종료
ROWS = [
    ('구몬학습', 'holder', '이정민', '02-3149-3000', '120-81-31344', '국민', '123401-04-***',
     ('held', 'S0/O10'), 6, '서울 강남구 논현로 431', 4, 12, False),
    ('교원에듀', 'member', '박서연', '02-3149-3100', '120-81-31351', '국민', '123401-04-***',
     ('used', 'S0/O10', '구몬학습'), 0, '서울 강남구 논현로 431', 2, 5, False),
    ('웅진씽크빅', 'solo', '김태호', '031-956-7000', '215-81-06943', '신한', '140-011-***',
     None, 3, '경기 파주시 회동길 20', 3, 8, False),
    ('대교', 'solo', '정하늘', '02-3289-4000', '104-81-26509', '우리', '1005-902-***',
     None, 0, '서울 관악구 보라매로 3길 23', 2, 6, False),
    ('한솔교육', 'solo', '오세훈', '02-2001-6000', '211-81-15881', '하나', '162-910-***',
     None, 2, '서울 중구 소월로 2길 12', 5, 14, False),
    ('엠베스트', 'solo', '최유진', '02-6255-0000', '211-88-01234', '국민', '123456-11-***',
     None, 0, '서울 서초구 효령로 321', 1, 3, False),
    ('메가북스', 'solo', '강민석', '02-6255-1000', '211-88-05678', '국민', '123456-22-***',
     None, 0, '서울 서초구 효령로 321', 0, 2, True),
    ('크레버스', 'solo', '윤소라', '02-3444-8000', '211-86-11223', '신한', '110-222-***',
     None, 1, '서울 강남구 언주로 508', 2, 4, False),
    ('시원스쿨', 'solo', '한지우', '02-6009-1000', '119-86-33445', '카카오', '3333-01-***',
     None, 0, '서울 영등포구 국회대로 74길 12', 1, 2, False),
    ('아들과딸', 'member', '서보람', '031-955-2000', '128-81-55667', '농협', '301-0123-***',
     ('used', 'S3/O21', 'NeoLAB'), 0, '경기 파주시 문발로 203', 0, 1, False),
]

TIER_TAG = {
    'holder': ('상위 고객사', '#047857', '#ecfdf5',
               '공통(커먼)코드를 보유한 상위(대표) 고객사 · 하위 고객사가 이 코드를 함께 사용'),
    'member': ('하위 고객사', '#7e22ce', '#f3e8ff',
               '공통(커먼)코드를 사용하는 하위 고객사'),
    'solo': ('단독', '#9ca3af', '#f3f4f6', '자체 코드만 쓰는 단독 고객사 (하위/상위 관계 없음)'),
}


def toolbar(search='', filtered=None):
    sv = (search or '<span style="color:#9ca3af">업체명·담당자·사업자번호 검색</span>')
    clear = ('<span style="position:absolute;right:6px;top:50%;transform:translateY(-50%);'
             'color:#9ca3af;font-size:15px">×</span>') if search else ''
    return ('<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;'
            'flex-wrap:wrap">'
            '<p style="margin:0;color:#6b7280;font-size:13px">'
            '업체(고객사) 마스터 · 사업자/계좌/서류/업무 원장. 행을 클릭하면 수정 화면으로 이동합니다. '
            '고객사 536곳 · 프로젝트 511건</p>'
            '<div style="flex:1"></div>'
            '<div style="position:relative">'
            '<div style="width:240px;padding:8px 26px 8px 10px;border:1px solid #e5e7eb;'
            'border-radius:8px;font-size:13px;background:#fff">%s</div>%s</div>'
            '<span style="background:#5f8ff0;color:#fff;border-radius:9px;padding:9px 16px;'
            'font-size:13px;font-weight:600">＋ 고객사 등록</span></div>' % (sv, clear))


def tier_filter(active='', shown=None):
    pre = ''
    if shown is not None:
        pre = ('<span>검색 <b style="color:#111827">%s</b>건 · </span>' % shown)
    pills = ''
    for v, label, n, fg, bg in TIERS:
        on = (v == active)
        pills += ('<span style="font-size:11.5px;font-weight:700;padding:4px 10px;'
                  'border-radius:999px;border:1px solid %s;background:%s;color:%s">%s '
                  '<span style="font-weight:400">%s</span></span>'
                  % (fg if on else '#e5e7eb', bg if on else '#fff', fg if on else '#6b7280',
                     label, '{:,}'.format(n)))
    return ('<div style="font-size:12px;color:#6b7280;margin-bottom:8px;display:flex;'
            'align-items:center;gap:6px;flex-wrap:wrap">%s<span>구분 필터:</span>%s</div>'
            % (pre, pills))


def common_cell(cc):
    if cc is None:
        return '<span style="color:#d1d5db">-</span>'
    if cc[0] == 'held':
        return ('<span style="font-size:9px;background:#f3e8ff;color:#7e22ce;font-weight:700;'
                'margin-right:3px;border-radius:5px;padding:2px 7px" title="보유(상위)">%s</span>'
                % cc[1])
    return ('<span style="font-size:9px;background:#faf5ff;color:#7e22ce;border:1px solid #e9d5ff;'
            'font-weight:700;margin-right:3px;border-radius:5px;padding:2px 7px" '
            'title="사용(하위) · 귀속 %s">↳%s</span>' % (cc[2], cc[1]))


# 서비스 계정 수 `PC-135` — 고객사별 서비스 로그인 계정(명). 0 이면 -
ACC_N = {'웅진씽크빅': 3, '구몬학습': 2, '교원에듀': 1}


def table(rows, search=''):
    HEAD = ['No', '업체명', '담당자 / 연락처', '서비스 계정', '사업자번호', '은행 / 계좌', '커먼 코드',
            '편집 단가', '주소', '서류', '업무', '작업']
    th = ''
    for h in HEAD:
        # 업체명 옆 정렬 셀렉트 — 최신순 / 오름차순 (가나다) / 내림차순 `PC-161`
        sort = ('<span style="margin-left:6px;font-size:11.5px;padding:2px 6px;border:1px solid #e5e7eb;border-radius:6px;'
                'background:#fff;color:#1d4ed8;font-weight:600;white-space:nowrap">최신순 ▾</span>' if h == '업체명' else '')
        th += ('<th style="text-align:center;padding:10px 12px;color:#6b7280;font-weight:600;'
               'background:#fafbfc;font-size:11.5px;%s">%s%s</th>'
               % ('white-space:nowrap' if h == '업체명' else '', h, sort))
    if not rows:
        msg = ('&quot;%s&quot; 검색 결과가 없습니다.' % search) if search else '등록된 고객사가 없습니다.'
        tb = ('<tr><td colspan="12" style="padding:30px;text-align:center;color:#9ca3af;'
              'font-size:12.5px">%s</td></tr>' % msg)
    else:
        tb = ''
        for i, r in enumerate(rows, start=1):
            (nm, tier, mgr, tel, biz, bank, acct, cc, custom, addr, docs, work, closed) = r
            lbl, fg, bg, tip = TIER_TAG[tier]
            tag = ('<span style="margin-left:6px;font-size:9.5px;background:%s;color:%s;'
                   'font-weight:700;border-radius:5px;padding:2px 7px" title="%s">%s</span>'
                   % (bg, fg, tip, lbl))
            end = ('<span style="margin-left:4px;font-size:9.5px;background:#f3f4f6;color:#6b7280;'
                   'font-weight:700;border-radius:5px;padding:2px 7px" title="프로젝트 종료">종료</span>'
                   ) if closed else ''
            price = (('<span style="color:#b45309;font-weight:700" '
                      'title="고객사 전용 단가가 지정된 항목 수">전용 %d항목</span>' % custom)
                     if custom else '<span style="color:#9ca3af" title="전사 기본 단가">기본</span>')
            rowst = ('background:#fafafa;opacity:.6;' if closed else '')
            tb += ('<tr style="border-top:1px solid #eef0f4;%s">'
                   '<td style="padding:10px 12px;text-align:center;color:#9ca3af;'
                   'font-family:ui-monospace,monospace">%d</td>'
                   '<td style="padding:10px 12px;font-weight:600;text-align:left">%s%s%s</td>'
                   '<td style="padding:10px 12px;text-align:left">%s'
                   '<div style="color:#9ca3af;font-size:11px">%s</div></td>'
                   '<td style="padding:10px 12px;text-align:center">%s</td>'
                   '<td style="padding:10px 12px;font-family:ui-monospace,monospace;'
                   'font-size:11.5px">%s</td>'
                   '<td style="padding:10px 12px;text-align:left">%s'
                   '<div style="color:#9ca3af;font-size:11px">%s</div></td>'
                   '<td style="padding:10px 12px;text-align:center;white-space:nowrap">%s</td>'
                   '<td style="padding:10px 12px;text-align:center;'
                   'font-family:ui-monospace,monospace;font-size:11.5px">%s</td>'
                   '<td style="padding:10px 12px;color:#6b7280;max-width:180px;text-align:left">%s</td>'
                   '<td style="padding:10px 12px;text-align:center">'
                   '<span style="font-size:11px;background:#eef2f7;color:#475569;'
                   'border-radius:5px;padding:2px 7px">%d</span></td>'
                   '<td style="padding:10px 12px;text-align:center">'
                   '<span style="font-size:11px;background:#eef2f7;color:#475569;'
                   'border-radius:5px;padding:2px 7px">%d</span></td>'
                   '<td style="padding:10px 12px;text-align:center">'
                   '<span style="color:#dc2626;font-size:12.5px">삭제</span></td></tr>'
                   % (rowst, i, nm, tag, end, mgr, tel,
                      ('<span style="color:#2563eb;font-weight:700">%d명</span>' % ACC_N[nm]) if ACC_N.get(nm) else '<span style="color:#d1d5db">-</span>',
                      biz, bank, acct,
                      common_cell(cc), price, addr, docs, work))
    foot = ''
    if rows:
        foot = ('<div style="display:flex;align-items:center;justify-content:space-between;'
                'gap:10px;padding:10px 14px;border-top:1px solid #eef0f4;flex-wrap:wrap">'
                '<div style="font-size:12px;color:#6b7280">전체 '
                '<b style="color:#111827">536</b>건 중 1~50 표시'
                '<span style="margin-left:8px;font-size:12px;padding:3px 6px;'
                'border:1px solid #e5e7eb;border-radius:6px">50건씩 ▾</span></div>'
                '<div style="display:flex;align-items:center;gap:4px">%s'
                '<span style="font-size:11.5px;color:#9ca3af;margin-left:6px">1 / 11</span>'
                '</div></div>'
                % ''.join('<span style="font-size:12px;padding:4px 9px;border-radius:7px;'
                          'border:1px solid %s;background:%s;color:%s">%s</span>'
                          % ('#5f8ff0' if on else '#e5e7eb',
                             '#5f8ff0' if on else '#fff',
                             '#fff' if on else ('#cbd5e1' if dis else '#4b5563'), lb)
                          for lb, on, dis in (('«', False, True), ('‹', False, True),
                                              ('1', True, False), ('2', False, False),
                                              ('3', False, False), ('4', False, False),
                                              ('5', False, False), ('›', False, False),
                                              ('»', False, False))))
    return ('<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;'
            'padding:0;overflow:hidden">'
            '<table style="width:100%%;border-collapse:collapse;font-size:12.5px;'
            'text-align:center"><thead><tr>%s</tr></thead><tbody>%s</tbody></table>%s</div>'
            % (th, tb, foot))


# ── 가입 승인 요청(온보딩) `PC-119` ─────────────────────────────────
PEND = [
    ('CasterN', '학원북스', 'kim@hakwonbooks.co.kr', '김대표', 'google', 3, '2026-09-27 10:12:33'),
    ('폼솔루션', '스마트에듀', 'admin@smartedu.kr', '이지현', 'google', 1, '2026-09-28 14:40:02'),
    ('SDK 연동', '펜톡', 'dev@pentalk.io', 'Park J.', 'google', 2, '2026-09-29 09:05:51'),
]


def onboard_card(n=3):
    return ('<div style="width:100%%;border:1px solid #fcd34d;background:#fffbeb;border-radius:12px;'
            'padding:13px 16px;margin-bottom:14px;display:flex;align-items:center;gap:10px">'
            '<span style="font-size:16px">🔔</span>'
            '<b style="font-size:13.5px;color:#92400e">가입 승인 요청 %d건</b>'
            '<span style="font-size:11.5px;color:#b45309">· 새 고객이 우리 서비스에 SSO 로그인했습니다. '
            '클릭하여 확인·승인하세요.</span><span style="flex:1"></span>'
            '<span style="background:#5f8ff0;color:#fff;border-radius:9px;padding:6px 14px;'
            'font-size:13px;font-weight:600">확인·승인 →</span></div>' % n)


def onboard_modal(rows=PEND):
    items = ''
    for svc, org, email, name, prov, cnt, at in rows:
        items += ('<div style="border:1px solid #fde68a;background:#fffbeb;border-radius:10px;'
                  'padding:10px 12px;margin-bottom:8px">'
                  '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">'
                  '<span class="tag b">%s</span><b style="font-size:13px">%s</b>'
                  '<span style="font-family:ui-monospace,monospace;font-size:11.5px;color:#2563eb">%s</span></div>'
                  '<div style="font-size:11.5px;color:#9ca3af;margin-bottom:8px">%s · %s SSO · 로그인 %d회 · %s</div>'
                  '<div style="display:flex;gap:8px">'
                  '<span class="btn pri" style="padding:6px 14px">승인 → 고객사 등록</span>'
                  '<span class="btn gho" style="padding:6px 12px;color:#dc2626;border-color:#fecaca">거절</span>'
                  '</div></div>' % (svc, org, email, name, prov, cnt, at))
    return ('<div class="ovl"><div class="mdl w"><div class="mh">'
            '<div class="mt">가입 승인 요청 %d건</div><div class="mx">✕</div></div>'
            '<div style="font-size:12.5px;color:#6b7280;margin-bottom:12px;line-height:1.6">'
            '새 고객이 우리 서비스에 SSO 로그인한 기록입니다. 승인하면 고객사로 등록되고, '
            '고객사 상세의 계정 및 서비스 권한에서 이 이메일로 계정을 추가할 수 있습니다.</div>%s'
            '<div class="mf"><div class="btn gho">닫기</div></div></div></div>' % (len(rows), items))


def approved_card(org='학원북스'):
    return ('<div style="border:1px solid #a7f3d0;background:#ecfdf5;border-radius:12px;'
            'padding:12px 16px;margin-bottom:14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">'
            '<span style="font-size:15px">✅</span>'
            '<b style="font-size:13px;color:#065f46">%s 승인 완료</b>'
            '<span style="font-size:12px;color:#047857">고객사 상세의 계정 및 서비스 권한에서 이 이메일로 계정을 추가하세요.</span>'
            '<span style="flex:1"></span>'
            '<span style="background:#5f8ff0;color:#fff;border-radius:9px;padding:6px 14px;'
            'font-size:13px;font-weight:600">계정 추가 →</span>'
            '<span class="btn gho" style="padding:6px 10px">닫기</span></div>' % org)


def content(rows=None, search='', tier='', shown=None, toast='', onboard=None, approved=None):
    rows = ROWS if rows is None else rows
    top = ''
    if onboard:
        top += onboard_card(onboard)
    if approved:
        top += approved_card(approved)
    return kws.co_ws_head('table') + top + toolbar(search) + tier_filter(tier, shown) + toast + table(rows, search)


BASE = [
    ('[3단 보기]', '클릭', '<code>MEM-02</code> 3단', '고객사 | 섹션 메뉴 | 상세 <code>PC-204</code>'),
    ('행 클릭', '클릭', '<code>MEM-02</code> 3단의 그 고객사',
     '툴팁 <b>클릭하면 수정 화면으로 이동합니다</b> · 종료 업체는 <b>프로젝트 종료 고객사 (코드 발급 이력만)</b>'),
    ('업체명 옆 정렬 셀렉트', '선택', '목록 다시 정렬', '최신순(기본) / 오름차순 (가나다) / 내림차순 <code>PC-161</code>'),
    ('검색', '입력', '즉시 필터링', '<b>업체명·담당자·사업자번호</b> · ×로 해제'),
    ('구분 필터 칩', '클릭', '해당 계층만',
     '전체 / 상위(초록) / 하위(보라) / 단독(회색) — 각 칩에 건수'),
    ('[＋ 고객사 등록]', '클릭', '<code>MEM-02</code> (등록 모드)', '기본 정보 → [등록] 또는 서비스 계정 [계정 추가] <code>PC-142</code>'),
    ('서비스 계정 {n}명', '클릭', 'S13 명단 창', '고객사별 서비스 계정 수 <code>PC-135</code>'),
    ('행 [삭제]', '클릭', 'S5 삭제 확인', '행 클릭과 분리(<code>stopPropagation</code>)'),
    ('건수 선택', '드롭다운', '표시 건수 변경', '50 / 100 / 200 / 500 / 전체 보기'),
    ('«  ‹  1..  ›  »', '클릭', '페이지 이동', '우측에 <b>{현재} / {전체}</b>'),
]


def build():
    boards = []

    boards.append((
        'S1', '기본 · 전체 목록', '기본',
        '좌측 메뉴 [고객사 관리]는 <b>3단</b>(<code>MEM-02</code>)으로 열리고, 머리의 <b>[표 보기]</b>를 누르면 이 목록 표가 나온다(<code>/companies?view=table</code>) <code>PC-204</code>. '
        '구현은 <b>안내문 + 검색 + [＋ 고객사 등록]</b> 툴바 아래에 '
        '<b>구분 필터 줄</b>이 따로 있고, 표는 <b>12열</b>(No · 업체명 · 담당자/연락처 · 서비스 계정 · 사업자번호 · '
        '은행/계좌 · 커먼 코드 · 편집 단가 · <b>주소</b> · 서류 · 업무 · 작업)이다. '
        '표 하단에 <b>표시 건수 선택 + 페이지네이션</b>이 붙는다. '
        '',
        frame('MEM-01', '고객사 관리', content(), height=900),
        BASE + [
            ('커먼 코드 열', '조회', '—',
             '보유(상위)는 <b>S0/O10</b> 진보라, 사용(하위)는 <b>↳S3/O21</b> 연보라+테두리, 없으면 <b>-</b>'),
            ('편집 단가 열', '조회', '—', '<b>전용 {n}항목</b>(주황 굵게) / <b>기본</b>(회색) <code>P-16</code>')]))

    boards.append((
        'S2', '구분 필터 · 하위 고객사', '필터',
        '<code>P-11</code> — 계층은 <b>상위(공통코드 보유) / 하위(공통코드 사용) / 단독</b> 3분류이며 '
        '<b>하위 고객사도 정식 회사 레코드</b>로 함께 표시된다. '
        '필터가 걸리면 앞에 <b>검색 {n}건 ·</b>가 붙는다.',
        frame('MEM-01', '고객사 관리',
              content([r for r in ROWS if r[1] == 'member'], tier='member', shown=34),
              height=760),
        [('[하위 고객사] 칩', '클릭', '하위만 표시', '활성 시 보라 테두리·배경'),
         ('[전체] 칩', '클릭', '전체 복귀', ''),
         ('커먼 코드', '조회', '—', '<b>↳{S/O}</b> + 툴팁에 <b>귀속 {상위 고객사}</b>'),
         ('행 클릭', '클릭', '<code>MEM-02</code>', '하위 고객사도 동일하게 수정 가능')]))

    boards.append((
        'S3', '검색 결과 없음', '빈 상태',
        '검색 결과가 없으면 표 본문이 <b>한 줄 안내</b>로 대체된다(<code>colSpan 11</code>). '
        '하단 페이지네이션은 <b>표시되지 않는다</b>.',
        frame('MEM-01', '고객사 관리',
              content([], search='존재하지않는업체', shown=0), height=620),
        [('빈 목록', '표시', '—', '<b>"{검색어}" 검색 결과가 없습니다.</b>'),
         ('등록 0건일 때', '표시', '—', '<b>등록된 고객사가 없습니다.</b>'),
         ('× (검색 지우기)', '클릭', '전체 목록 복귀', ''),
         ('페이지네이션', '—', '<b>숨김</b>', '결과가 있을 때만 표시')]))

    boards.append((
        'S4', '프로젝트 종료 업체', '변형',
        'PRD §5 — 사업이 끝난 고객사는 <b>행 전체가 흐리게</b>(배경 #fafafa · 불투명도 0.6) 표시되고 '
        '<b>종료</b> 배지가 붙는다. 툴팁은 종료 사유(<code>closedNote</code>)를 보여준다. '
        '코드 발급 이력은 보존된다.',
        frame('MEM-01', '고객사 관리', content(), height=900),
        [('종료 행', '표시', '—', '흐리게 + <b>종료</b> 배지'),
         ('종료 배지', 'hover', '툴팁', '종료 사유 · 없으면 <b>프로젝트 종료</b>'),
         ('행 클릭', '클릭', '<code>MEM-02</code>', '툴팁 <b>프로젝트 종료 고객사 (코드 발급 이력만)</b>'),
         ('[삭제]', '클릭', 'S14', 'SOBP 가 할당된 고객사는 <b>삭제 불가</b> — 종료로 처리한다 <code>PC-166</code>')]))

    def del_modal(typed=False):
        btn = ('background:#dc2626;color:#fff' if typed
               else 'background:#f1f5f9;color:#94a3b8;border:1px solid #e5e7eb')
        val = ('웅진씽크빅' if typed else '<span style="color:#9ca3af">웅진씽크빅</span>')
        return ('<div class="ovl"><div class="mdl">'
                '<div class="mh"><div class="mt">고객사 삭제</div><div class="mx">✕</div></div>'
                '<div style="font-size:13px;color:#374151;line-height:1.7">'
                '삭제하려면 아래에 <b>웅진씽크빅</b> 을(를) 그대로 입력하세요.</div>'
                '<div class="toast err" style="margin:12px 0 0"><b>SOBP 할당 전 고객사만 삭제할 수 있습니다.</b><br>'
                '서류 · 업무 원장 기록도 함께 삭제됩니다.</div>'
                '<div class="fld" style="margin-top:12px"><div class="inp">%s</div></div>'
                '<div class="mf"><div class="btn gho">취소</div>'
                '<div style="border-radius:9px;padding:9px 16px;font-size:13px;font-weight:600;'
                '%s">삭제 확정</div></div></div></div>' % (val, btn))

    boards.append((
        'S5', '삭제 확인 · 이름 미입력', '확인창',
        'PRD §4.5 — <b>SOBP 할당 전 고객사</b>만 이 확인창이 뜬다 <code>PC-166</code>. '
        '업체명을 정확히 입력해야 확정된다. 기본은 <b>[삭제 확정] 비활성</b>.',
        frame('MEM-01', '고객사 관리', content(), overlay=del_modal(False), height=900),
        [('이름 입력', '입력', '[삭제 확정] 활성', '업체명과 <b>정확히 일치</b>해야 활성'),
         ('[삭제 확정]', '—', '<b>비활성</b>', ''),
         ('[취소] · [✕]', '클릭', 'S1 복귀', '')]))

    boards.append((
        'S6', '삭제 확인 · 이름 일치', '확인창',
        '업체명이 정확히 일치하면 [삭제 확정]이 활성화된다.',
        frame('MEM-01', '고객사 관리', content(), overlay=del_modal(True), height=900),
        [('[삭제 확정]', '클릭', 'S7', '고객사 · 서류 · 업무 원장 삭제 후 목록 갱신'),
         ('[취소]', '클릭', 'S1 복귀', '')]))

    toast_del = '<div class="toast">삭제됨 · 웅진씽크빅</div>'
    boards.append((
        'S7', '삭제 완료 · 상단 알림', '성공',
        'PRD §5 메시지 — 삭제 후 목록이 갱신되고 상단 알림이 뜬다. '
        '<code>LOG-01</code>에 <b>고객사 관리</b> 활동으로 기록된다.',
        frame('MEM-01', '고객사 관리',
              content([r for r in ROWS if r[0] != '웅진씽크빅'], toast=toast_del), height=900),
        [('상단 알림', '표시', '—', '<b>삭제됨 · {업체명}</b>'),
         ('목록', '자동', '갱신', ''),
         ('활동 로그', '자동 기록', '<code>LOG-01</code>', '<b>고객사 관리</b>')]))

    # S8 초기화 확인창 — [초기화] 버튼 삭제로 결번 `PC-160` (S9~ 번호는 Figma 프레임 이름 유지를 위해 그대로)

    toast_new = '<div class="toast">등록됨 · 시원스쿨</div>'
    boards.append((
        'S9', '등록 · 수정 완료 복귀', '성공',
        '<code>MEM-02</code>에서 [저장]하면 목록이 갱신되고 상단 알림이 뜬다. 신규 [등록]은 계정을 이어서 추가하도록 '
        '<b>상세·수정 화면</b>으로 간다 <code>PC-128</code>. 등록된 고객사는 <code>SOB-02</code> 직접 코드 할당의 '
        '<b>선택 대상</b>이 되고, App Key 관리 · N Key 관리에서 <b>불러와 키를 발급</b>할 수 있다 <code>PC-153</code>.',
        frame('MEM-01', '고객사 관리', content(toast=toast_new), height=900),
        [('상단 알림', '표시', '—', '등록: <b>등록됨 · {업체명}</b> / 수정: <b>수정됨 · {업체명}</b>'),
         ('(등록 직후)', '자동', '<code>SOB-02</code> · <code>TKT-01</code> · <code>TKT-02</code> 편입', '코드 할당 · App Key · N Key 발급 대상 <code>PC-153</code>'),
         ('코드 할당하러 가기', '좌측 메뉴', '<code>SOB-01</code> → <code>SOB-02</code>', ''),
         ('코드 보유 현황', '좌측 메뉴', '<code>PRJ-01</code>', ''),
         ('편집 실적·정산', '좌측 메뉴', '<code>PRJ-02</code> → <code>PRJ-03</code>', '')]))

    # ── 가입 승인 요청(온보딩) `PC-119` ─────────────────────────────
    boards.append((
        'S10', '가입 승인 요청 카드', '변형',
        '<code>PC-119</code> — 새 고객이 우리 서비스(CasterN·폼솔루션 등)에 <b>SSO 로그인</b>하면 그 기록이 '
        '<b>가입 승인 요청</b>으로 잡힌다. 목록 상단에 <b>건수만 담은 카드</b>가 뜨고(인라인 목록 아님), '
        '<b>카드를 클릭하면 모달</b>로 확인·승인한다. 사이드바 [고객사 관리]와 상단 🔔에도 대기 건수 배지가 붙는다.',
        frame('MEM-01', '고객사 관리', content(onboard=3), height=940),
        [('가입 승인 요청 카드', '클릭', 'S11 (모달)', '노랑 카드 · 건수만 표시'),
         ('사이드바 [고객사 관리] 배지 · 🔔', '표시', '—', '대기 건수 빨간 배지')]))

    boards.append((
        'S11', '가입 승인 모달', '모달',
        '카드를 누르면 모달로 <b>대기 요청 목록</b>이 뜬다. 각 건에 <b>서비스 · 회사 · SSO 이메일 · 로그인 정보</b>와 '
        '<b>[승인 → 고객사 등록] / [거절]</b> 버튼. 승인하면 목록에서 사라지고 여러 건을 연속 처리한다.',
        frame('MEM-01', '고객사 관리', content(onboard=3), overlay=onboard_modal(), height=940),
        [('[승인 → 고객사 등록]', '클릭', 'S12 · 고객사 등록', '같은 이름 있으면 연결, 없으면 신규 등록'),
         ('[거절]', '클릭', 'confirm 후 목록에서 제거', '거절로 기록'),
         ('[닫기] · [✕]', '클릭', 'S10 복귀', '')]))

    boards.append((
        'S12', '승인 완료 · 최근 상단', '성공',
        '승인하면 고객사로 등록되고 <b>최근 등록 고객사가 목록 최상단</b>에 온다(<code>PC-119</code> · createdAt 내림차순). '
        '상단 초록 카드의 <b>[계정 추가 →]</b>로 그 고객사 상세의 <b>계정 및 서비스 권한</b>(<code>MEM-02</code> S17)으로 바로 간다 — '
        'SSO 이메일이 ID 칸에 미리 들어간다. <code>PC-133</code>',
        frame('MEM-01', '고객사 관리',
              content(rows=[('학원북스', 'solo', '김대표', 'kim@hakwonbooks.co.kr', '—', '—', '—',
                             None, 0, '—', 0, 0, False)] + ROWS,
                      onboard=2, approved='학원북스'),
              height=1020),
        [('초록 완료 카드', '표시', '—', '<b>{org} 승인 완료</b>'),
         ('[계정 추가 →]', '클릭', '<code>MEM-02</code> S17', 'SSO 이메일 미리 입력 (<code>/companies/{id}?email=</code>) <code>PC-133</code>'),
         ('목록 최상단', '자동', '최근 고객사', 'createdAt 내림차순 기본 정렬'),
         ('업체명 정렬 셀렉트', '선택', '최신순 · 오름차순 · 내림차순', '<code>PC-161</code>')]))

    # 서비스 계정 명단 창 `PC-135` `PC-144`
    acc_rows = ''.join(
        '<tr style="border-top:1px solid #eef0f4"><td style="padding:9px 12px">%s</td>'
        '<td style="padding:9px 12px;font-family:ui-monospace,monospace;font-size:12px">%s</td>'
        '<td style="padding:9px 12px">%s</td><td style="padding:9px 12px;font-family:ui-monospace,monospace;font-size:12px;color:%s">%s</td></tr>'
        % (n + (' <span style="font-size:11px;background:#fef3c7;color:#92400e;border-radius:5px;padding:2px 8px;font-weight:700">OWNER</span>'
                if m == 'kim@wjthinkbig.com' else ''),
           m, ('<span style="font-size:11px;background:#ecfdf5;color:#047857;border-radius:5px;padding:2px 8px;font-weight:700">활성</span>' if on
                  else '<span style="font-size:11px;background:#f3f4f6;color:#6b7280;border-radius:5px;padding:2px 8px;font-weight:700">비활성</span>'),
           '#374151' if last[0].isdigit() else '#9ca3af', last)
        for n, m, on, last in (('김태호', 'kim@wjthinkbig.com', True, '2026-10-14 09:12'),
                               ('편집팀', 'edit01@wjthinkbig.com', True, '2026-10-02 17:40'),
                               ('이전 담당', 'old@wjthinkbig.com', False, '접속 기록 없음')))
    acc_mdl = ('<div class="ovl"><div class="mdl w"><div class="mh"><div class="mt">웅진씽크빅 · 서비스 계정 3명</div><div class="mx">✕</div></div>'
               '<div style="font-size:12px;color:#6b7280;margin-bottom:10px">활성 <b style="color:#047857">2명</b> · 비활성 <b style="color:#9ca3af">1명</b></div>'
               '<div style="border:1px solid #eef0f4;border-radius:10px;overflow:hidden"><table style="width:100%;border-collapse:collapse;font-size:12.5px">'
               '<tr style="background:#fafbfc;color:#6b7280;font-size:11.5px"><th style="text-align:left;padding:9px 12px">이름</th>'
               '<th style="text-align:left;padding:9px 12px">이메일</th><th style="text-align:left;padding:9px 12px">계정 상태</th>'
               '<th style="text-align:left;padding:9px 12px">최근 접속일</th></tr>' + acc_rows + '</table></div>'
               '<div class="mf"><div class="btn gho">닫기</div><div class="btn pri">계정 관리 →</div></div></div></div>')
    boards.append((
        'S13', '서비스 계정 명단', '모달',
        '목록의 <b>서비스 계정</b> 열은 고객사별 서비스 계정 수(<b>{n}명</b>, 없으면 -)다 <code>PC-135</code>. 명수를 누르면 '
        '행 이동 없이 <b>명단 창</b>이 열려 <b>이름 · 이메일 · 계정 상태 · 최근 접속일</b>을 본다. <b>[계정 관리 →]</b> 는 그 고객사 상세의 '
        '<b>서비스 계정</b> 섹션(<code>MEM-02</code> S11)을 연다 <code>PC-144</code>. App Key 관리의 키 발급 계정은 세지 않는다.',
        frame('MEM-01', '고객사 관리', content(), overlay=acc_mdl, height=940),
        [('서비스 계정 열 {n}명', '클릭', '명단 창', '행 클릭(상세 이동)과 분리'),
         ('명단 창 위', '표시', '활성 · 비활성 인원', ''),
         ('최근 접속일', '표시', '—', '서비스 로그인 기록이 없으면 <b>접속 기록 없음</b>'),
         ('OWNER 배지', '표시', '맨 위', '고객사 OWNER 계정(1명) <code>PC-159</code>'),
         ('[계정 관리 →]', '클릭', '<code>MEM-02</code> S11', '<code>/companies/{id}?sec=acc</code>'),
         ('[닫기] · ✕', '클릭', 'S1', '')]))


    blocked = ('<div class="ovl"><div class="mdl">'
               '<div class="mh"><div class="mt">고객사 삭제 불가</div><div class="mx">✕</div></div>'
               '<div class="toast err" style="margin:0">'
               '<b>교원구몬</b> 은(는) <b>SOBP 가 할당된 고객사</b>입니다 (S/O 2개 · 코드 프로젝트 2건).<br>'
               '• SOBP 할당 전 고객사만 삭제할 수 있습니다. 할당된 코드는 회수하지 않습니다.<br>'
               '• 거래가 끝났다면 상세 화면에서 <b>사업 종료</b>로 바꾸세요. 코드 발급 이력은 그대로 보관됩니다.</div>'
               '<div class="mf"><div class="btn gho">닫기</div></div></div></div>')
    boards.append((
        'S14', '삭제 불가 · SOBP 할당 고객사', '확인창',
        'PRD §4.5 — <b>SOBP 가 할당된 고객사</b>(코드 프로젝트에 발급 블록이 있는 고객사)는 삭제할 수 없다 '
        '<code>PC-166</code>. 서비스에 코드 회수 기능이 없으므로 <code>PC-165</code>, 거래가 끝나면 '
        '<code>MEM-02</code> 에서 <b>사업 종료</b>로 처리한다(S4).',
        frame('MEM-01', '고객사 관리', content(), overlay=blocked, height=900),
        [('[삭제]', '클릭', '이 안내창', 'SOBP 할당 고객사일 때 — 확인 입력란 · [삭제 확정] 없음'),
         ('안내', '표시', '—', '할당된 S/O 개수 · 코드 프로젝트 건수'),
         ('[닫기] · ✕', '클릭', 'S1', ''),
         ('사업 종료', '이동', '<code>MEM-02</code>', '종료 토글 → S4')]))
    intro = ('코드를 발급받는 <b>업체(고객사) 마스터</b>. 사업자·계좌·서류·편집 단가·업무 이력을 관리한다. '
             '<b>App Key 관리 · N Key 관리(<code>TKT-01</code> · <code>TKT-02</code>)는 이 고객사를 불러와 키를 발급</b>한다 '
             '<code>PC-153</code>. 고객사마다 <b>서비스 계정</b>(서비스 권한 · OWNER 1명 · 선택)을 <code>MEM-02</code>에서 관리한다 '
             '<code>PC-128</code> <code>PC-159</code> — App Key 관리의 App Key 계정과는 다른 계정이다. '
             '목록은 <b>업체명 옆 정렬 셀렉트</b>(최신순 · 오름차순 · 내림차순)로 정렬한다 <code>PC-161</code>. '
             '계층은 <code>P-11</code>에 따라 <b>상위 / 하위 / 단독</b> 3분류이고 구분 필터로 거른다. '
             '<b>행을 클릭하면 <code>MEM-02</code> 수정 화면</b>으로 이동한다. '
             '')
    return page(CODE, NAME, PRD, intro, boards)
