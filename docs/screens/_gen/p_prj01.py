# -*- coding: utf-8 -*-
"""PRJ-01 코드 프로젝트 — web/components/ProjectsView.tsx 실제 구현 기준 (3단 구성)"""
from shell import page, frame

CODE, NAME = 'PRJ-01', '코드 프로젝트'
PRD = 'docs/prd/PRJ-01_코드 프로젝트.md'

# 실제 화면 값 (ncodecenter.vercel.app/projects)
SUMMARY = ('고객사 <b>534</b> · 프로젝트 <b>508</b> · 발급 코드 '
           '<b style="color:#2563eb">1,536,536,306</b> · 실등록 '
           '<b style="color:#0f766e">634,608</b>')

# (고객사명, 서비스요약, 코드수, [코드종류], 종료)
CUSTS = [
    ('21세기 북스', 'SDK 연동', '0', [], False),
    ('가쿠쇼', 'SDK 연동', '4,194,304', [], False),
    ('가쿠쇼-1022', 'casterN', '0', ['N'], False),
    ('강효원 과장님', 'SDK 연동', '0', [], False),
    ('고려대학교', 'SDK 연동', '0', [], False),
    ('과학기술정보통신부 / 한국특허전략개발원', 'SDK 연동', '0', [], False),
    ('광동대청', 'SDK 연동', '0', [], False),
    ('교원', 'SDK 연동', '0', [], False),
    ('교원구몬', 'SDK 연동', '8,388,608', [], False),
    ('교원구몬-10', 'casterN', '41,419', ['G', 'N'], False),
    ('신사고-6', 'SDK 연동', '29,286', ['N'], False),
]


def kind_chip(k):
    if k == 'N':
        return ('<span style="background:#2563eb;color:#fff;border-radius:6px;padding:2px 7px;'
                'font-size:10.5px;font-weight:700" title="PDS3 · Ncode">N(PDS3)</span>')
    return ('<span style="background:#d97706;color:#fff;border-radius:6px;padding:2px 7px;'
            'font-size:10.5px;font-weight:700" title="PDS2 · Gcode">G(PDS2)</span>')


def sc(k, v, color):
    return ('<span style="display:inline-flex;align-items:center;gap:5px;border:1px solid #e5e7eb;'
            'border-radius:8px;padding:2px 6px 2px 2px;background:#fff;font-size:12px">'
            '<span style="background:%s;color:#fff;font-weight:700;font-size:10.5px;'
            'border-radius:6px;padding:2px 6px;min-width:12px;text-align:center">%s</span>'
            '<span style="font-family:ui-monospace,monospace;color:#111827">%s</span></span>'
            % (color, k, v))


def kbadge(k):
    if k == 'N':
        return ('<span class="tag" style="font-size:9.5px;background:#eef6ff;color:#2563eb">N</span>')
    return ('<span class="tag" style="font-size:9.5px;background:#fef3c7;color:#92400e">G</span>')


def topbar_line(filtered=False):
    tail = ('<span style="color:#2563eb"> · 필터 적용 (전체 534곳 / 508건)</span>' if filtered
            else '<span style="color:#9ca3af"> · 할당된 코드를 업체·서비스별로 조회 '
                 '(발급은 [Ncode 예약·할당])</span>')
    return ('<div class="row" style="margin-bottom:12px;gap:10px;flex-wrap:wrap">'
            '<p style="margin:0;color:#6b7280;font-size:12.5px">%s%s</p>'
            '<div style="flex:1"></div>'
            '<div class="btn gho">초기화</div></div>' % (SUMMARY, tail))


def col_cust(pds='전체', flag='전체', svc='사용 서비스 · 전체', search='', sel='신사고-6',
             empty=False):
    def chips(items, active):
        return ''.join(
            '<span style="border:1px solid %s;background:%s;color:%s;border-radius:7px;'
            'padding:4px 9px;font-size:11.5px;font-weight:%s">%s</span>'
            % ('#5f8ff0' if x == active else '#e5e7eb',
               '#eff5ff' if x == active else '#fff',
               '#1d4ed8' if x == active else '#4b5563',
               '700' if x == active else '400', x)
            for x in items)
    sv = (search or '<span style="color:#9ca3af">고객사 검색</span>')
    clear = ('<span style="position:absolute;right:8px;top:50%;transform:translateY(-50%);'
             'color:#9ca3af">×</span>') if search else ''
    if empty:
        items = '<div class="empty" style="padding:10px;font-size:12px">결과 없음</div>'
    else:
        items = ''
        for nm, s, codes, kinds, closed in CUSTS:
            on = (nm == sel)
            end = ('<span class="tag" style="font-size:9px;background:#f3f4f6;color:#6b7280;'
                   'font-weight:700">종료</span>') if closed else ''
            kb = ''.join(kbadge(k) for k in kinds)
            items += ('<div style="border:1px solid %s;background:%s;border-radius:10px;'
                      'padding:8px 10px;margin-bottom:5px;text-align:left">'
                      '<div style="font-weight:700;font-size:13px;color:%s;display:flex;'
                      'align-items:center;gap:6px">%s%s</div>'
                      '<div style="font-size:11px;color:#9ca3af;margin-top:2px;display:flex;'
                      'align-items:center;gap:4px;flex-wrap:wrap">'
                      '<span>%s · 코드 %s</span>%s</div></div>'
                      % ('#5f8ff0' if on else '#eef0f4', '#eff5ff' if on else '#fff',
                         '#1d4ed8' if on else '#111827', nm, end, s, codes, kb))
    return ('<div class="card" style="align-self:start"><div style="padding:10px">'
            '<div style="font-weight:700;font-size:13px;margin-bottom:8px">고객사 선택</div>'
            '<div class="row" style="gap:4px;margin-bottom:8px">%s</div>'
            '<div class="row" style="gap:4px;margin-bottom:8px">%s</div>'
            '<div class="inp" style="margin-bottom:8px;font-size:11.5px;padding:6px 8px;'
            'display:flex;align-items:center;justify-content:space-between">%s'
            '<span style="color:#9ca3af;font-size:10px">▾</span></div>'
            '<div style="position:relative;margin-bottom:8px">'
            '<div class="inp" style="padding-right:28px">%s</div>%s</div>'
            '<div style="max-height:560px;overflow:hidden">%s</div>'
            '</div></div>'
            % (chips(['전체', 'PDS3', 'PDS2', 'PDS4', 'OID'], pds),
               chips(['전체', '편집', '코드발급'], flag), svc, sv, clear, items))


def col_proj(sel=None, empty=False, cust='신사고-6'):
    if empty:
        inner = ('<div class="empty" style="padding:10px;font-size:12px">'
                 '이 고객사의 프로젝트가 없습니다.</div>')
        n = 0
    else:
        on = (sel == '신사고-6 코드발급')
        inner = ('<div style="border:1px solid %s;background:%s;border-radius:10px;'
                 'padding:8px 10px;text-align:left">'
                 '<div style="font-weight:700;font-size:12.5px;color:%s">신사고-6 코드발급</div>'
                 '<div class="row" style="gap:3px;margin-top:4px;flex-wrap:wrap">'
                 '<span style="display:inline-flex;align-items:center;gap:3px">%s%s%s</span></div>'
                 '<div class="row" style="gap:4px;margin-top:4px;flex-wrap:wrap">'
                 '<span class="tag" style="font-size:9.5px;background:#f3f4f6;color:#6b7280">'
                 'SDK 연동 (코드만 할당)</span></div>'
                 '<div style="font-size:10.5px;color:#9ca3af;margin-top:3px">'
                 '발급 29,286코드 · 1블록</div></div>'
                 % ('#5f8ff0' if on else '#eef0f4', '#eff5ff' if on else '#fff',
                    '#1d4ed8' if on else '#111827',
                    kind_chip('N'), sc('S', '5', '#5f8ff0'), sc('O', '6', '#14b8a6')))
        n = 1
    return ('<div class="card" style="align-self:start"><div style="padding:10px">'
            '<div style="font-weight:700;font-size:13px;margin-bottom:8px">프로젝트 '
            '<span style="color:#9ca3af;font-weight:400">· %s (%d)</span></div>%s'
            '</div></div>' % (cust, n, inner))


def col_detail(state='none', share=False, cust='신사고-6', closed=False):
    banner = ('<div style="margin-bottom:10px;padding:8px 12px;background:#f3f4f6;'
              'border:1px solid #e5e7eb;border-radius:8px;font-size:12.5px;color:#4b5563">'
              '🛑 <b>프로젝트 종료 고객사</b> — 코드 발급 이력만 보관합니다. '
              '(엠베스트-28로 코드 이관)</div>') if closed else ''
    if state == 'none':
        return ('<div class="card"><div style="padding:16px">'
                '<div style="color:#9ca3af;font-size:13px;padding:8px">'
                '<b style="color:#374151">%s</b> — 가운데에서 프로젝트를 선택하면 '
                '<b>어떤 코드가 어떻게 발급되었는지</b>(SOBP 블록·발급일·코드 수) '
                '확인할 수 있습니다.</div></div></div>' % cust)
    kpi = ''.join('<div style="border:1px solid #eef0f4;border-radius:10px;padding:10px">'
                  '<div style="font-size:10.5px;color:#6b7280">%s</div>'
                  '<div style="font-size:17px;font-weight:700;color:%s">%s</div></div>' % k
                  for k in (('발급 코드 (B×P)', '#2563eb', '29,286'),
                            ('실등록 페이지', '#0f766e', '4,120'),
                            ('편집 심볼', '#047857', '0'),
                            ('코드 종류', '#111827', 'N(PDS3)')))
    blocks = ''.join(
        '<div class="row" style="gap:10px;border:1px solid #eef0f4;border-radius:10px;'
        'padding:9px 11px;background:#fafbfc;flex-wrap:wrap;margin-bottom:6px">'
        '<span style="font-size:11px;color:#9ca3af;font-family:ui-monospace,monospace;'
        'min-width:18px">%s</span>'
        '<span style="display:inline-flex;align-items:center;gap:4px">%s%s%s%s%s</span>'
        '<div style="flex:1"></div>'
        '<span style="font-size:11px;color:#9ca3af;font-family:ui-monospace,monospace">%s</span>'
        '<span class="tag" style="background:#eef6ff;color:#2563eb">%s</span>%s</div>'
        % (i, kind_chip('N'), sc('S', '5', '#5f8ff0'), sc('O', '6', '#14b8a6'),
           sc('B', b, '#8b5cf6'), sc('P', p, '#f59e0b'), d, calc, used)
        for i, b, p, d, calc, used in (
            ('1', '0~2,194', '0~12', '2016-10-18', '2,195권 × 13p = 28,535',
             '<span class="tag" style="background:#ccfbf1;color:#0f766e">실등록 4,120p</span>'),
            ('2', '2,195~2,251', '0~12', '2023-11-02', '57권 × 13p = 751', '')))
    subs = ''
    if share:
        chips = ''.join('<span style="display:inline-flex;align-items:center;'
                        'justify-content:space-between;padding:5px 9px;background:%s;color:%s;'
                        'border:1px solid %s;border-radius:8px;font-size:12px;font-weight:%s">'
                        '%s</span>'
                        % ('#7e22ce' if i == 1 else '#fff', '#fff' if i == 1 else '#4b2a6b',
                           '#7e22ce' if i == 1 else '#e9d5ff', '700' if i == 1 else '400', nm)
                        for i, nm in enumerate(['한국뉴베리', '아들과딸', '새알교육', '비전코람데오',
                                                '연두비', '미래엔영어', '파고다', '한솔']))
        subs = ('<div class="card" style="padding:10px 12px;margin-bottom:12px;'
                'background:#faf5ff;border-color:#e9d5ff">'
                '<div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:8px;'
                'font-size:12.5px;font-weight:700;color:#6b21a8">사용 고객사 (하위) '
                '<span style="color:#7e22ce">34곳</span>'
                '<span class="tag" style="background:#fff;color:#6b21a8;border:1px solid #e9d5ff">'
                'COMMON · N(PDS3) S3/O21</span>'
                '<span style="font-weight:400;color:#9ca3af;font-size:11px">'
                '· 공통(커먼)코드를 함께 쓰는 고객사 · 편집/티켓은 이 대장으로 진행</span></div>'
                '<div style="position:relative;max-width:260px;margin-bottom:8px">'
                '<div class="inp" style="height:30px;font-size:12px;padding-right:46px;'
                'background:#fff;color:#9ca3af">하위 고객사 검색</div>'
                '<span style="position:absolute;right:8px;top:50%%;transform:translateY(-50%%);'
                'font-size:10.5px;color:#9ca3af">8/34</span></div>'
                '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(116px,1fr));'
                'gap:5px">%s</div></div>' % chips)
    return ('<div class="card"><div style="padding:16px">%s'
            '<div class="row" style="gap:8px;flex-wrap:wrap">'
            '<div style="font-size:15px;font-weight:700">신사고-6 코드발급</div>'
            '<span class="tag">신사고-6</span>'
            '<span style="display:inline-flex;align-items:center;gap:4px">%s%s%s</span>'
            '<span class="tag" style="background:#f3f4f6;color:#6b7280">SDK 연동 (코드만 할당)</span>%s'
            '%s<div style="flex:1"></div>'
            '<span class="btn sm">수정</span>'
            '<span class="btn sm" style="color:#dc2626">삭제</span></div>'
            '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:14px 0">%s</div>'
            '%s'
            '<div style="font-size:12.5px;font-weight:700;margin-bottom:8px">발급 SOBP 내역 '
            '<span style="color:#9ca3af;font-weight:400">· 어떤 코드가 어떻게 발급되었는지 '
            '(조회 전용)</span></div>%s'
            '</div></div>'
            % (banner, kind_chip('N'), sc('S', '5', '#5f8ff0'), sc('O', '6', '#14b8a6'),
               ('<span class="tag" style="background:#f3f4f6;color:#6b7280;'
                'font-weight:700">종료</span>') if closed else '',
               ('<span class="tag" style="background:#f3e8ff;color:#7e22ce;font-weight:700">'
                '공유 코드</span>') if share else '',
               kpi, subs, blocks))


def content(pds='전체', flag='전체', svc='사용 서비스 · 전체', search='', sel_cust='신사고-6',
            sel_proj=None, detail='none', share=False, cust_empty=False, proj_empty=False,
            filtered=False, toast='', closed=False):
    return (topbar_line(filtered) + toast +
            '<div style="display:grid;grid-template-columns:280px 250px 1fr;gap:12px;'
            'align-items:start">%s%s%s</div>'
            % (col_cust(pds, flag, svc, search, sel_cust, cust_empty),
               col_proj(sel_proj, proj_empty, sel_cust),
               col_detail(detail, share, sel_cust, closed)))


NAV = [('[✏️ 편집 →]', '클릭', '<code>PRJ-02</code>', '해당 owner의 편집 프로젝트로 이동'),
       ('코드 신규 발급', '이동', '<code>SOB-01</code> → <code>SOB-02</code>',
        '<b>이 화면에서는 발급하지 않는다</b> <code>PC-011</code>'),
       ('고객사 정보·단가 확인', '이동', '<code>MEM-01</code> → <code>MEM-02</code>', ''),
       ('티켓 발급', '이동', '<code>TKT-04</code> / <code>TKT-01</code>', '발급된 코드로 사용 허가 생성')]


def build():
    boards = []

    boards.append((
        'S1', '기본 · 고객사 선택 (프로젝트 미선택)', '기본',
        '좌측 메뉴 [코드 ▸ 코드 프로젝트]로 진입. 실제 구현은 <b>3단 구성</b>이다 — '
        '① <b>고객사 선택</b>(280px) ② <b>프로젝트</b>(250px) ③ <b>발급 구성</b>(나머지). '
        '상단은 KPI 카드가 아니라 <b>요약 한 줄</b>이며 우측에 [초기화]가 있다. '
        '⚠ PRD §1은 "좌: 고객사 목록 · 우: 선택 프로젝트 상세" <b>2단</b>으로 적혀 있어 구현과 다르다.',
        frame('PRJ-01', '코드 프로젝트', content(), height=1000),
        [('코드 종류 칩', '클릭', '목록·집계 필터', '<b>전체 / PDS3 / PDS2 / PDS4(S-code) / OID</b> — 좌표 속성 기준 <code>PC-032</code> · 옛 IDS = OID 동일 <code>PC-035</code> · 선택 시 프로젝트 선택 해제'),
         ('유형 칩', '클릭', '목록·집계 필터', '<b>전체 / 편집 / 코드발급</b> — 편집 = casterN이거나 심볼 보유'),
         ('사용 서비스', '드롭다운 선택', '목록·집계 필터', '<b>사용 서비스 · 전체</b> 기본값 · casterN / 폼솔루션 / 서비스 없음'),
         ('고객사 검색', '입력', '즉시 필터링', '값이 있으면 <b>×</b>로 해제'),
         ('고객사 항목', '클릭', '② 프로젝트 목록 갱신', '부제 = <b>{사용서비스} · 코드 {n}</b> + 코드종류 배지 N/G'),
         ('프로젝트 카드', '클릭', 'S2 발급 구성', ''),
         ('[초기화]', '클릭', '확인창', '<b>테스트 데이터를 초기화할까요? (엑셀 시드로 복원)</b>'),
         ('③ 안내', '표시', '—',
          '<b>{고객사} — 가운데에서 프로젝트를 선택하면 어떤 코드가 어떻게 발급되었는지'
          '(SOBP 블록·발급일·코드 수) 확인할 수 있습니다.</b>')] + NAV))

    boards.append((
        'S2', '프로젝트 선택 · 발급 구성', '기본',
        '프로젝트를 고르면 ③에 <b>발급 요약 4종 + 발급 SOBP 내역</b>이 표시된다. '
        '발급 내역은 <b>조회 전용</b> — 발급/수정은 <code>SOB-02</code>(Ncode 예약·할당)에서 한다 '
        '<code>PC-011</code>.',
        frame('PRJ-01', '코드 프로젝트',
              content(sel_proj='신사고-6 코드발급', detail='full'), height=1000),
        [('발급 요약 4종', '조회', '—', '발급 코드(B×P) · 실등록 페이지 · 편집 심볼 · 코드 종류'),
         ('발급 SOBP 내역', '조회', '—', '블록마다 <b>N(PDS3) S O B P</b> 칩 + 발급일 + '
          '<b>{권}권 × {p}p = {코드}</b> + 실등록'),
         ('[수정]', '클릭', 'S5 프로젝트 수정 모달', ''),
         ('[삭제]', '클릭', 'S6 삭제 확인', '발급 코드가 <b>reset(회수)</b>'),
         ('미발급 프로젝트', '표시', '—', '<b>발급 내역이 없습니다. (미발급)</b>')] + NAV))

    boards.append((
        'S3', '필터 적용 · PDS3 + 편집', '필터',
        '필터는 <b>프로젝트 단위</b>로 적용되어 좌측 고객사 목록과 상단 집계가 함께 줄어든다. '
        '필터가 걸리면 요약 꼬리말이 <b>· 필터 적용 (전체 {n}곳 / {n}건)</b>으로 바뀐다.',
        frame('PRJ-01', '코드 프로젝트',
              content(pds='PDS3(Ncode)', flag='편집', svc='casterN (편집툴)',
                      sel_cust='교원구몬-10', filtered=True, proj_empty=True), height=940),
        [('PDS3(Ncode)', '클릭', 'PDS3 보유 고객사만', '프로젝트 선택 해제'),
         ('[편집]', '클릭', '편집 프로젝트만', 'casterN 서비스이거나 심볼 보유'),
         ('사용 서비스', '선택', '해당 서비스만', ''),
         ('상단 요약', '자동', '재계산', '<b>· 필터 적용 (전체 {n}곳 / {n}건)</b>'),
         ('[전체]', '클릭', 'S1 복귀', '')]))

    boards.append((
        'S4', '공유 코드 · 사용 고객사(하위)', '분기',
        '<code>P-12</code> — 공통(커먼) 코드 대장 프로젝트에는 <b>공유 코드</b> 배지와 '
        '<b>사용 고객사(하위) 목록</b>이 보라색 박스로 표시된다. '
        '<code>P-11</code> — 하위 고객사는 별도 화면이 아니라 여기서 확인한다.',
        frame('PRJ-01', '코드 프로젝트',
              content(sel_cust='NeoLAB', sel_proj='신사고-6 코드발급',
                      detail='full', share=True), height=1120),
        [('공유 코드 배지', '표시', '—', '여러 고객사가 함께 쓰는 공유(커먼) 코드'),
         ('하위 고객사 검색', '입력', '칩 필터', '우측에 <b>{표시}/{전체}</b>'),
         ('고객사 칩', '클릭', '그 고객사의 사용 SOBP 표시', 'Book 단위 · 다시 누르면 해제'),
         ('사용 고객사 없음', '표시', '—', '<b>등록된 사용 고객사가 없습니다.</b>')]))

    edit_modal = (
        '<div class="ovl"><div class="mdl w">'
        '<div class="mh"><div class="mt">프로젝트 수정</div><div class="mx">✕</div></div>'
        '<div style="display:grid;gap:12px">'
        '<div class="fld"><span class="lbl">프로젝트명 <span style="color:#dc2626">*</span></span>'
        '<div class="inp">신사고-6 코드발급</div></div>'
        '<div class="fld"><span class="lbl">고객사(업체) <span style="color:#dc2626">*</span></span>'
        '<div class="inp" style="display:flex;justify-content:space-between">신사고-6'
        '<span style="color:#9ca3af;font-size:10px">▾</span></div></div>'
        '<div class="fld"><span class="lbl">사용 서비스</span>'
        '<div class="inp" style="display:flex;justify-content:space-between">SDK 연동 (코드만 할당)'
        '<span style="color:#9ca3af;font-size:10px">▾</span></div>'
        '<div style="font-size:11px;color:#9ca3af;margin-top:3px">'
        '표시·변경 가능하나 <b>정본 지정은 <code>SOB-02</code></b> <code>PC-011</code></div></div>'
        '<div style="border:1px solid #e5e7eb;border-radius:9px;padding:11px 13px;font-size:12px;'
        'color:#6b7280;background:#f8fafc"><b style="color:#374151">발급 SOBP 내역</b> — 조회 전용<br>'
        '발급 추가·수정은 <b>현재 숨김 상태</b>입니다. (⚠ §7 미결)</div>'
        '</div><div class="mf"><div class="btn gho">취소</div><div class="btn pri">저장</div></div>'
        '</div></div>')
    boards.append((
        'S5', '프로젝트 수정 (모달)', '모달',
        'PRD §4.4 — ③ 상세의 <b>[수정]</b>으로 연다. 사용 서비스는 표시·변경 가능하나 '
        '<b>정본 지정 위치는 <code>SOB-02</code></b>다.',
        frame('PRJ-01', '코드 프로젝트',
              content(sel_proj='신사고-6 코드발급', detail='full'),
              overlay=edit_modal, height=1000),
        [('프로젝트명', '입력 (필수)', '—', '미입력 시 <b>프로젝트명은 필수입니다.</b>'),
         ('고객사(업체)', '선택 (필수)', '—', '미선택 시 <b>고객사를 선택하세요.</b>'),
         ('사용 서비스', '선택', '—', '정본은 <code>SOB-02</code>'),
         ('등급(폼솔루션)', '선택', '—', '사용 서비스가 폼솔루션일 때만'),
         ('[저장]', '클릭', '목록 갱신', '<b>수정됨 · {프로젝트명}</b>'),
         ('[취소] · [✕]', '클릭', 'S2 복귀', '')]))

    del_modal = ('<div class="ovl"><div class="mdl">'
                 '<div class="mh"><div class="mt">프로젝트 삭제</div><div class="mx">✕</div></div>'
                 '<div style="font-size:13px;color:#374151;line-height:1.7">'
                 '삭제하려면 아래에 <b>신사고-6 코드발급</b> 을(를) 그대로 입력하세요.</div>'
                 '<div class="toast err" style="margin:12px 0 0">삭제하면 이 프로젝트가 보유한 '
                 '<b>발급 코드 29,286건이 reset(회수)</b>됩니다. 되돌릴 수 없습니다.</div>'
                 '<div class="fld" style="margin-top:12px">'
                 '<div class="inp ph">신사고-6 코드발급</div></div>'
                 '<div class="mf"><div class="btn gho">취소</div>'
                 '<div class="btn dis">삭제 확정</div></div></div></div>')
    boards.append((
        'S6', '프로젝트 삭제 확인', '확인창',
        'PRD §4.5 — 삭제하면 <b>발급 코드가 reset(회수)</b> 되므로 '
        '<b>프로젝트명을 정확히 입력</b>해야 [삭제 확정]이 활성화된다.',
        frame('PRJ-01', '코드 프로젝트',
              content(sel_proj='신사고-6 코드발급', detail='full'),
              overlay=del_modal, height=1000),
        [('프로젝트명 입력', '입력', '[삭제 확정] 활성', '<b>정확히 일치</b>해야 활성'),
         ('[삭제 확정]', '클릭', '코드 reset · 목록 갱신',
          '<b>삭제됨 · {프로젝트명} · 발급 코드 {n}건 reset</b>'),
         ('[취소] · [✕]', '클릭', 'S2 복귀', '')]))

    boards.append((
        'S7', '검색 결과 없음', '빈 상태',
        '좌측 목록이 비면 <b>결과 없음</b>. 가운데는 <b>이 고객사의 프로젝트가 없습니다.</b>',
        frame('PRJ-01', '코드 프로젝트',
              content(search='폼솔루션', cust_empty=True, proj_empty=True,
                      sel_cust='—', filtered=True), height=760),
        [('좌측 목록', '표시', '—', '<b>결과 없음</b>'),
         ('가운데', '표시', '—', '<b>이 고객사의 프로젝트가 없습니다.</b>'),
         ('× (검색 지우기)', '클릭', '전체 복귀', ''),
         ('[전체] 칩', '클릭', '전체 복귀', '')]))

    boards.append((
        'S8', '프로젝트 종료 고객사', '분기',
        '<code>MEM-02</code> 에서 <b>사업 종료</b>로 바꾼 고객사. 좌측 목록에서 흐려지고 '
        '<b>종료</b> 배지가 붙으며, 상세 위에 회색 배너가 나온다. '
        '<b>코드 발급 이력은 그대로 보관</b>된다.',
        frame('PRJ-01', '코드 프로젝트',
              content(sel_proj='신사고-6 코드발급', detail='full', closed=True),
              height=1000),
        [('상세 배너', '표시', '—',
          '<b>🛑 프로젝트 종료 고객사 — 코드 발급 이력만 보관합니다. ({이관 메모})</b>'),
         ('좌측 카드', '표시', '—', '흐려지고 <b>종료</b> 배지'),
         ('발급 내역', '—', '유지', '조회는 그대로 된다'),
         ('되돌리기', '이동', '<code>MEM-02</code>', '토글을 <b>진행중</b>으로 되돌린다')] + NAV))

    intro = ('<b>고객사별로 어떤 코드(SOBP)를 얼마나 발급받았는지</b>를 조회·검색하는 화면. '
             '코드 발급 자체는 <code>SOB-02</code>에서 이뤄지므로 '
             '<b>이 화면에는 프로젝트 등록 기능이 없다</b>(조회·검색 전용 / 수정·삭제만 가능). '
             '실제 구현은 <b>고객사 선택 → 프로젝트 → 발급 구성</b> 3단이며, '
             '좌측에 <b>코드 종류(PDS2/PDS3) · 유형(편집/코드발급) · 사용 서비스</b> 3중 필터가 있다. '
             ' (2026-08-27 확인).')
    return page(CODE, NAME, PRD, intro, boards)
