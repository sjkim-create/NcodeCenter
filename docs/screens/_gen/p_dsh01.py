# -*- coding: utf-8 -*-
"""DSH-01 대시보드 — web/components/DashboardView.tsx 실제 구현 기준"""
from shell import page, frame

CODE, NAME = 'DSH-01', '대시보드'
PRD = 'docs/prd/DSH-01_대시보드.md'

# data/ownership-data.json 실제 값
KPI = (('🧩', '할당 코드 레코드', '479', 'Owner×Book 원장 (모두 발급)', '#5f8ff0'),
       ('🏢', '업체(ACCOUNT)', '128', '등록 업체', '#5cb4e6'),
       ('📚', '할당 Book 합계', '7,234,247', '발급된 book 총량', '#14b8a6'),
       ('🗂', '코드 섹션', '8', 'Section 수', '#8b7ff0'))

# (section, owned, test_dev, legacy)
SECTIONS = ((0, 48, False, False), (1, 6, True, False), (3, 212, False, False),
            (5, 163, False, False), (10, 15, False, False), (11, 1, False, False),
            (14, 9, False, False), (44, 21, True, False))
MAX_SEC = 212

# accounts.slice(0,6) — 정렬하지 않고 앞 6개
TOP6 = (('neolab', 1), ('Solution', 96), ('NeoLAB POD', 156), ('몰스킨 스티커', 10),
        ('대표님 Scode->Ncode 전환 인식용', 13), ('CMS 에듀', 5))
MAX_ACC = 156

# lib/activityStore.ts TYPE_META
ACTS = (('08-26 11:24', '티켓 발급', '#8ec674', '웅진씽크빅 · S3/O17 · Book 431~464', '김순정'),
        ('08-26 10:58', '코드 할당(등록)', '#9b87d9', '크레버스 · S3/O945 · Book 25~28', '김순정'),
        ('08-26 10:12', '교재 작업', '#d69a4a', '구몬학습 · 영어 5A · 심볼 2,046', '박지훈'),
        ('08-26 09:47', '고객사 관리', '#5f8ff0', '시원스쿨 정보 수정', '김순정'),
        ('08-26 09:03', '로그인', '#6b7280', 'jihoon@neolab.net', '박지훈'),
        ('08-25 18:02', '로그아웃', '#9ca3af', 'soonjung@neolab.net', '김순정'),
        ('08-25 17:40', '교재 추가', '#f0a94a', '한솔교육 · 핀덴하이 · Book 143', '박지훈'))


def dcard(inner, pad='15px 16px'):
    return ('<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;'
            'padding:%s">%s</div>' % (pad, inner))


def chead(title, hint=None, action=None):
    h = ('<span style="font-size:11.5px;color:#9ca3af;margin-left:8px">%s</span>' % hint) if hint else ''
    a = ('<span style="font-size:12px;color:#5f8ff0">%s →</span>' % action) if action else ''
    return ('<div style="display:flex;justify-content:space-between;align-items:baseline;'
            'margin-bottom:10px"><div><span style="font-weight:700;font-size:14px">%s</span>%s</div>'
            '%s</div>' % (title, h, a))


def kpis():
    out = ''
    for icon, label, val, sub, tone in KPI:
        out += dcard(
            '<div style="display:flex;justify-content:space-between;align-items:flex-start">'
            '<div style="font-size:12px;color:#6b7280">%s</div>'
            '<span style="width:30px;height:30px;border-radius:9px;display:grid;'
            'place-items:center;font-size:15px;background:%s18">%s</span></div>'
            '<div style="font-size:26px;font-weight:800;margin-top:4px;color:%s">%s</div>'
            '<div style="font-size:11.5px;color:#9ca3af">%s</div>'
            % (label, tone, icon, tone, val, sub))
    return ('<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;'
            'margin-bottom:16px">%s</div>' % out)


def sec_card(tooltip=False):
    rows = ''
    for s, owned, test, legacy in SECTIONS:
        badge = ''
        if test:
            tip = ('<div style="position:absolute;left:0;top:-28px;background:#0f172a;color:#fff;'
                   'font-size:11px;padding:5px 9px;border-radius:6px;white-space:nowrap;z-index:5">'
                   '상용 미출시 · 개발/테스트 전용</div>') if (tooltip and s == 44) else ''
            badge = ('<span style="font-size:9px;color:#6d5bd0;background:#eceafd;border-radius:4px;'
                     'padding:0 4px;margin-left:4px" title="상용 미출시 · 개발/테스트 전용">테스트/개발</span>%s' % tip)
        elif legacy:
            badge = ('<span style="font-size:9px;color:#92400e;background:#fef3c7;border-radius:4px;'
                     'padding:0 4px;margin-left:4px">레거시</span>')
        rows += ('<div style="display:flex;align-items:center;gap:10px;position:relative">'
                 '<div style="width:92px;font-size:12.5px;flex:none">Section %d%s</div>'
                 '<div style="flex:1;display:flex;height:16px;border-radius:5px;overflow:hidden;'
                 'background:#f1f3f7"><div style="width:%.1f%%;background:#5f8ff0"></div></div>'
                 '<div style="width:60px;text-align:right;font-size:12px;color:#6b7280;flex:none">%s</div>'
                 '</div>' % (s, badge, owned * 100.0 / MAX_SEC, '{:,}'.format(owned)))
    return dcard(chead('Section별 소유 현황', '소유 owner 수 (모두 할당됨)') +
                 '<div style="display:flex;flex-direction:column;gap:9px;margin-top:4px">%s</div>' % rows)


def top6_card():
    rows = ''
    for i, (nm, owners) in enumerate(TOP6):
        rows += ('<div style="display:flex;align-items:center;gap:10px">'
                 '<div style="width:20px;color:#9ca3af;font-size:12px;flex:none">%d</div>'
                 '<div style="width:150px;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;'
                 'white-space:nowrap;flex:none">%s</div>'
                 '<div style="flex:1;height:14px;border-radius:5px;background:#f1f3f7;overflow:hidden">'
                 '<div style="width:%.1f%%;height:100%%;background:hsl(%d 62%% 55%%)"></div></div>'
                 '<div style="width:64px;text-align:right;font-size:12px;color:#6b7280;flex:none">'
                 'owner %d</div></div>'
                 % (i + 1, nm, owners * 100.0 / MAX_ACC, (i * 42) % 360, owners))
    return dcard(chead('업체별 점유 Top 6', '소유 owner 수') +
                 '<div style="display:flex;flex-direction:column;gap:9px;margin-top:4px">%s</div>' % rows)


def status_card():
    return dcard(chead('코드 상태', '할당됨 / 미발급') +
                 '<div style="display:flex;flex-direction:column;gap:10px">'
                 '<div style="display:flex;align-items:center;gap:10px">'
                 '<span style="display:inline-block;width:9px;height:9px;border-radius:50%;'
                 'background:#5f8ff0"></span><span style="font-size:13px">할당됨(발급)</span>'
                 '<b style="margin-left:auto;font-size:15px">479</b></div>'
                 '<div style="display:flex;align-items:center;gap:10px">'
                 '<span style="display:inline-block;width:9px;height:9px;border-radius:50%;'
                 'background:#d1d5db"></span>'
                 '<span style="font-size:13px;color:#6b7280">미발급 (섹션 정원의 잔여)</span></div>'
                 '<div style="font-size:11.5px;color:#9ca3af;line-height:1.5;'
                 'border-top:1px solid #f1f3f7;padding-top:8px">'
                 '코드 상태는 <b>할당됨 / 미발급</b> 두 가지입니다. '
                 '예약(선점) vs 사용중 구분은 폐기되었습니다.</div></div>')


def act_card(empty=False):
    if empty:
        inner = ('<div style="font-size:12.5px;color:#9ca3af;padding:10px 0">'
                 '기록된 활동이 없습니다. (고객사 수정·코드 할당·프로젝트 등록·티켓 발급·교재 작업·로그인 시 기록)</div>')
    else:
        rows = ''
        for at, label, color, detail, actor in ACTS:
            rows += ('<div style="display:flex;align-items:center;gap:8px;padding:6px 0;'
                     'font-size:12.5px">'
                     '<span style="font-family:ui-monospace,monospace;font-size:11px;color:#9ca3af;'
                     'width:74px;flex:none">%s</span>'
                     '<span style="font-size:10.5px;font-weight:700;color:#fff;background:%s;'
                     'border-radius:5px;padding:1px 6px;white-space:nowrap;flex:none">%s</span>'
                     '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">%s</span>'
                     '<span style="color:#6b7280;flex:none">%s</span></div>'
                     % (at, color, label, detail, actor))
        inner = '<div style="display:flex;flex-direction:column;gap:2px">%s</div>' % rows
    return dcard(chead('최근 활동 (내부 직원)', '시간순', '전체 로그') + inner)


def content(empty=False, tooltip=False):
    # 프레임의 .main 이 이미 padding 20px 22px (DashboardView 와 동일)
    return ('%s<div style="display:grid;grid-template-columns:1fr 360px;gap:16px;align-items:start">'
            '<div style="display:flex;flex-direction:column;gap:16px;min-width:0">%s%s</div>'
            '<div style="display:flex;flex-direction:column;gap:16px">%s%s</div>'
            '</div>'
            % (kpis(), sec_card(tooltip), top6_card(), status_card(), act_card(empty)))


NAV = [('좌측 메뉴 [SOBP 맵]', '클릭', '<code>SOB-01</code>', 'Section·Owner·Book·Page 드릴다운'),
       ('좌측 메뉴 [고객사 관리]', '클릭', '<code>MEM-01</code>', '업체 상세·계약·단가'),
       ('좌측 메뉴 [편집 프로젝트]', '클릭', '<code>PRJ-02</code>', '편집량·정산'),
       ('좌측 메뉴 [티켓 발급]', '클릭', '<code>TKT-01</code>', '코드 사용 허가(티켓) 발급')]


def build():
    boards = []
    # 본문 자체에 padding 20/22 가 들어있으므로 프레임 main 패딩은 0
    def F(inner, admin=True, user='김순정', role='ADMIN', h=900):
        return frame('DSH-01', '대시보드', inner, admin=admin, user=user, role=role, height=h)

    boards.append((
        'S1', '기본 · 데이터 정상', '기본',
        '로그인 성공 직후 열리는 기본 진입 화면. 구현은 <b>KPI 4장(repeat(4,1fr) · gap 16)</b> + '
        '<b>본문 1fr / 360px 2단</b>이다 — 좌: Section별 소유 현황 · 업체별 점유 Top 6 / '
        '우: 코드 상태 · 최근 활동. <b>조회 전용</b>이며 사용자 입력이 없어 검증 오류가 없다. '
        '기준: <code>web/components/DashboardView.tsx</code>',
        F(content()),
        [('① KPI 4종', '조회', '—',
          '할당 코드 레코드 479 · 업체(ACCOUNT) 128 · 할당 Book 합계 7,234,247 · 코드 섹션 8'),
         ('KPI 카드', '클릭', '<b>동작 없음</b>', '§7 미결 — 해당 목록으로 바로 이동시킬지 미정'),
         ('Section 막대', 'hover', '툴팁', '<b>소유 owner {n}</b>'),
         ('[전체 로그 →]', '클릭', '<code>LOG-01</code>', '활동 로그 전체 조회'),
         ('최근 활동 행', '조회', '—', '시각(MM-DD HH:mm) · 종류 배지 · 상세 · 담당자 — <b>최근 7건</b>')]
        + NAV))

    boards.append((
        'S2', '최근 활동 없음', '빈 상태',
        'PRD §5 — 활동 목록 영역에 기록이 없다는 안내만 표시되고, '
        '<b>[전체 로그] 이동은 그대로 가능</b>하다. KPI·나머지 카드는 정상 표시된다.',
        F(content(empty=True)),
        [('최근 활동', '표시', '—',
          '<b>기록된 활동이 없습니다. (고객사 수정·코드 할당·프로젝트 등록·티켓 발급·교재 작업·로그인 시 기록)</b>'),
         ('[전체 로그 →]', '클릭', '<code>LOG-01</code>', '기록이 없어도 <b>이동 가능</b>'),
         ('나머지 카드', '조회', '—', '정상 표시')]))

    boards.append((
        'S3', 'Section 배지 — 테스트/개발 · 레거시', '변형',
        'Section 이름 옆에 배지가 붙는다 — 상용 미출시면 <b>테스트/개발</b>(보라), '
        '옛 체계면 <b>레거시</b>(주황). 배지는 <b>표기 전용</b>이며 눌러도 동작하지 않는다. '
        '값은 <code>data/ownership-data.json</code> 의 <code>test_dev</code> · '
        '<code>legacy</code> 플래그를 따른다.',
        F(content(tooltip=True)),
        [('테스트/개발 배지', '표시', '—', '상용 미출시 Section'),
         ('배지 hover', '마우스 오버', '툴팁', '<b>상용 미출시 · 개발/테스트 전용</b>'),
         ('레거시 배지', '표시', '—', '주황 — 옛 체계 Section'),
         ('배지', '클릭', '<b>동작 없음</b>', '표기 전용'),
         ('⚠ 참고', '—', '<code>SOB-01</code> 과 기준이 다르다',
          'SOB-01 의 <b>추천제외</b>는 <b>PDS2 S0·S14</b> — 이 배지와는 별개 값이다')]))

    boards.append((
        'S4', 'STAFF 진입 — 화면은 동일', '권한',
        '⚠ <b>이 화면에는 권한 분기가 없다.</b> STAFF도 ADMIN과 <b>똑같은 KPI·카드·활동 목록</b>을 '
        '본다. 차이는 <b>좌측 메뉴</b>뿐으로, <b>활동 로그</b> 메뉴에 <b>ADMIN</b> 배지가 붙는다. '
        '카드 우측 <b>[전체 로그]</b> 로 <code>LOG-01</code> 에 들어가면 '
        '그 화면에서 <b>🔒 접근 권한이 없습니다</b> 로 막힌다.',
        F(content(), admin=False, user='박지훈', role='STAFF'),
        [('KPI · 카드 · 활동', '조회', '동일', 'STAFF도 전체를 그대로 본다'),
         ('좌측 메뉴 [활동 로그]', '표시', '<b>ADMIN</b> 배지',
          '메뉴를 숨기지 않는다'),
         ('[전체 로그 →]', '클릭', '<code>LOG-01</code>',
          'STAFF 는 그 화면에서 차단된다 — <b>🔒 접근 권한이 없습니다</b>'),
         ('최근 활동 내용', '조회', '—',
          '활동 로그 화면은 막히지만 <b>대시보드의 최근 7건은 보인다</b>')] + NAV))

    intro = ('로그인 후 처음 만나는 화면. <b>코드가 얼마나 발급(할당)되어 있고 · 어느 Section에 · '
             '어느 업체가 많이 가지고 있는지</b>, 그리고 <b>내부 직원이 최근 무엇을 했는지</b>를 파악한다. '
             '<b>조회 전용</b> — 상세 확인·수정은 각 화면코드로 이동해서 수행한다. '
             '수치는 <code>data/ownership-data.json</code> 실제 값이고, 활동 배지 색은 '
             '<code>lib/activityStore.ts</code>의 <code>TYPE_META</code>를 따른다.')
    return page(CODE, NAME, PRD, intro, boards)
