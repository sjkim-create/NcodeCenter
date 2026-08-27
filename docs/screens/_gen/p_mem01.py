# -*- coding: utf-8 -*-
"""MEM-01 고객사 관리 — web/components/CompaniesView.tsx 실제 구현 기준"""
from shell import page, frame

CODE, NAME = 'MEM-01', '고객사 관리'
PRD = 'docs/prd/MEM-01_고객사 관리.md'

TIERS = (('', '전체', 534, '#374151', '#eef6ff'),
         ('holder', '상위 고객사', 8, '#047857', '#ecfdf5'),
         ('member', '하위 고객사', 34, '#7e22ce', '#f3e8ff'),
         ('solo', '단독 고객사', 492, '#6b7280', '#f3f4f6'))

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
            '고객사 534곳 · 프로젝트 508건</p>'
            '<div style="flex:1"></div>'
            '<div style="position:relative">'
            '<div style="width:240px;padding:8px 26px 8px 10px;border:1px solid #e5e7eb;'
            'border-radius:8px;font-size:13px;background:#fff">%s</div>%s</div>'
            '<span style="background:#fff;color:#374151;border:1px solid #e5e7eb;border-radius:9px;'
            'padding:9px 16px;font-size:13px">초기화</span>'
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


def table(rows, search=''):
    HEAD = ['No', '업체명', '담당자 / 연락처', '사업자번호', '은행 / 계좌', '커먼 코드',
            '편집 단가', '주소', '서류', '업무', '작업']
    th = ''
    for h in HEAD:
        sort = ('<span style="margin-left:3px;color:#2563eb">▲</span>' if h == '업체명' else '')
        th += ('<th style="text-align:center;padding:10px 12px;color:#6b7280;font-weight:600;'
               'background:#fafbfc;font-size:11.5px;%s">%s%s</th>'
               % ('cursor:pointer' if h == '업체명' else '', h, sort))
    if not rows:
        msg = ('&quot;%s&quot; 검색 결과가 없습니다.' % search) if search else '등록된 고객사가 없습니다.'
        tb = ('<tr><td colspan="11" style="padding:30px;text-align:center;color:#9ca3af;'
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
                   % (rowst, i, nm, tag, end, mgr, tel, biz, bank, acct,
                      common_cell(cc), price, addr, docs, work))
    foot = ''
    if rows:
        foot = ('<div style="display:flex;align-items:center;justify-content:space-between;'
                'gap:10px;padding:10px 14px;border-top:1px solid #eef0f4;flex-wrap:wrap">'
                '<div style="font-size:12px;color:#6b7280">전체 '
                '<b style="color:#111827">534</b>건 중 1~50 표시'
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


def content(rows=None, search='', tier='', shown=None, toast=''):
    rows = ROWS if rows is None else rows
    return toolbar(search) + tier_filter(tier, shown) + toast + table(rows, search)


BASE = [
    ('행 클릭', '클릭', '<code>MEM-02</code> (수정 모드)',
     '툴팁 <b>클릭하면 수정 화면으로 이동합니다</b> · 종료 업체는 <b>프로젝트 종료 고객사 (코드 발급 이력만)</b>'),
    ('업체명 헤더', '클릭', '가나다 정렬 토글', '↕ → ▲(오름) → ▼(내림) · 활성 시 화살표 파랑'),
    ('검색', '입력', '즉시 필터링', '<b>업체명·담당자·사업자번호</b> · ×로 해제'),
    ('구분 필터 칩', '클릭', '해당 계층만',
     '전체 / 상위(초록) / 하위(보라) / 단독(회색) — 각 칩에 건수'),
    ('[＋ 고객사 등록]', '클릭', '<code>MEM-02</code> (등록 모드)', '기본 정보만 · 업무 원장 없음'),
    ('행 [삭제]', '클릭', 'S5 삭제 확인', '행 클릭과 분리(<code>stopPropagation</code>)'),
    ('[초기화]', '클릭', 'S8 확인창', '엑셀 시드 복원'),
    ('건수 선택', '드롭다운', '표시 건수 변경', '50 / 100 / 200 / 500 / 전체 보기'),
    ('«  ‹  1..  ›  »', '클릭', '페이지 이동', '우측에 <b>{현재} / {전체}</b>'),
]


def build():
    boards = []

    boards.append((
        'S1', '기본 · 전체 목록', '기본',
        '좌측 메뉴 [고객사 관리]로 진입. 구현은 <b>안내문 + 검색 + [초기화] + [＋ 고객사 등록]</b> 툴바 아래에 '
        '<b>구분 필터 줄</b>이 따로 있고, 표는 <b>11열</b>(No · 업체명 · 담당자/연락처 · 사업자번호 · '
        '은행/계좌 · 커먼 코드 · 편집 단가 · <b>주소</b> · 서류 · 업무 · 작업)이다. '
        '표 하단에 <b>표시 건수 선택 + 페이지네이션</b>이 붙는다. '
        '기준: <code>web/components/CompaniesView.tsx</code>',
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
         ('[삭제]', '클릭', 'S5', '종료 ≠ 삭제 — 종료는 이력 보존, 삭제는 코드 reset')]))

    def del_modal(typed=False):
        btn = ('background:#dc2626;color:#fff' if typed
               else 'background:#f1f5f9;color:#94a3b8;border:1px solid #e5e7eb')
        val = ('웅진씽크빅' if typed else '<span style="color:#9ca3af">웅진씽크빅</span>')
        return ('<div class="ovl"><div class="mdl">'
                '<div class="mh"><div class="mt">고객사 삭제</div><div class="mx">✕</div></div>'
                '<div style="font-size:13px;color:#374151;line-height:1.7">'
                '삭제하려면 아래에 <b>웅진씽크빅</b> 을(를) 그대로 입력하세요.</div>'
                '<div class="toast err" style="margin:12px 0 0">삭제하면 이 고객사의 '
                '<b>프로젝트 3건 · 코드 8건이 reset(회수)</b>됩니다. 되돌릴 수 없습니다.</div>'
                '<div class="fld" style="margin-top:12px"><div class="inp">%s</div></div>'
                '<div class="mf"><div class="btn gho">취소</div>'
                '<div style="border-radius:9px;padding:9px 16px;font-size:13px;font-weight:600;'
                '%s">삭제 확정</div></div></div></div>' % (val, btn))

    boards.append((
        'S5', '삭제 확인 · 이름 미입력', '확인창',
        'PRD §4.4 — 삭제하면 그 고객사의 <b>프로젝트와 발급 코드가 reset(회수)</b> 되므로 '
        '업체명을 정확히 입력해야 확정된다. 기본은 <b>[삭제 확정] 비활성</b>.',
        frame('MEM-01', '고객사 관리', content(), overlay=del_modal(False), height=900),
        [('이름 입력', '입력', '[삭제 확정] 활성', '업체명과 <b>정확히 일치</b>해야 활성'),
         ('[삭제 확정]', '—', '<b>비활성</b>', ''),
         ('[취소] · [✕]', '클릭', 'S1 복귀', '')]))

    boards.append((
        'S6', '삭제 확인 · 이름 일치', '확인창',
        '업체명이 정확히 일치하면 [삭제 확정]이 활성화된다.',
        frame('MEM-01', '고객사 관리', content(), overlay=del_modal(True), height=900),
        [('[삭제 확정]', '클릭', 'S7', '프로젝트·코드 reset 후 목록 갱신'),
         ('[취소]', '클릭', 'S1 복귀', '')]))

    toast_del = '<div class="toast">삭제됨 · 웅진씽크빅 · 프로젝트 3건 / 코드 8건 reset</div>'
    boards.append((
        'S7', '삭제 완료 · 상단 알림', '성공',
        'PRD §5 메시지 — 삭제 후 목록이 갱신되고 상단 알림이 뜬다. '
        '<code>LOG-01</code>에 <b>고객사 관리</b> 활동으로 기록된다.',
        frame('MEM-01', '고객사 관리',
              content([r for r in ROWS if r[0] != '웅진씽크빅'], toast=toast_del), height=900),
        [('상단 알림', '표시', '—', '<b>삭제됨 · {업체명} · 프로젝트 {n}건 / 코드 {n}건 reset</b>'),
         ('목록', '자동', '갱신', ''),
         ('활동 로그', '자동 기록', '<code>LOG-01</code>', '<b>고객사 관리</b>')]))

    reset_modal = ('<div class="ovl"><div class="mdl">'
                   '<div class="mh"><div class="mt">확인</div><div class="mx">✕</div></div>'
                   '<div style="font-size:13px;color:#374151;line-height:1.7">'
                   '테스트 데이터를 초기화할까요? (엑셀 시드로 복원)</div>'
                   '<div class="mf"><div class="btn gho">취소</div>'
                   '<div class="btn dan">확인</div></div></div></div>')
    boards.append((
        'S8', '초기화 확인창', '확인창',
        'PRD §4.1 — [초기화]는 브라우저 <code>confirm()</code>으로 확인 후 '
        '<b>엑셀 시드 상태</b>로 되돌린다.',
        frame('MEM-01', '고객사 관리', content(), overlay=reset_modal, height=900),
        [('확인창 문구', '표시', '—', '<b>테스트 데이터를 초기화할까요? (엑셀 시드로 복원)</b>'),
         ('[확인]', '클릭', '시드 복원', '되돌릴 수 없음'),
         ('[취소]', '클릭', 'S1 복귀', '')]))

    toast_new = '<div class="toast">등록됨 · 시원스쿨</div>'
    boards.append((
        'S9', '등록 · 수정 완료 복귀', '성공',
        '<code>MEM-02</code>에서 저장하면 이 화면으로 복귀하며 목록이 갱신되고 상단 알림이 뜬다. '
        '등록 직후 그 고객사는 <code>SOB-02</code>·<code>TKT-01</code>의 <b>선택 대상</b>이 된다.',
        frame('MEM-01', '고객사 관리', content(toast=toast_new), height=900),
        [('상단 알림', '표시', '—', '등록: <b>등록됨 · {업체명}</b> / 수정: <b>수정됨 · {업체명}</b>'),
         ('(등록 직후)', '자동', '<code>SOB-02</code>·<code>TKT-01</code> 편입', '코드 할당·티켓 발급 가능'),
         ('코드 할당하러 가기', '좌측 메뉴', '<code>SOB-01</code> → <code>SOB-02</code>', ''),
         ('코드 보유 현황', '좌측 메뉴', '<code>PRJ-01</code>', ''),
         ('편집 실적·정산', '좌측 메뉴', '<code>PRJ-02</code> → <code>PRJ-03</code>', '')]))

    intro = ('코드를 발급받는 <b>업체(고객사) 마스터</b>. 사업자·계좌·서류·편집 단가·업무 이력을 관리한다. '
             '<b>모든 코드 발급과 티켓 발급의 선행 조건</b>이며, 여기에 등록되지 않은 업체에는 코드를 할당할 수 없다. '
             '계층은 <code>P-11</code>에 따라 <b>상위 / 하위 / 단독</b> 3분류이고 구분 필터로 거른다. '
             '<b>행을 클릭하면 <code>MEM-02</code> 수정 화면</b>으로 이동한다. '
             '기준: <code>web/components/CompaniesView.tsx</code>')
    return page(CODE, NAME, PRD, intro, boards)
