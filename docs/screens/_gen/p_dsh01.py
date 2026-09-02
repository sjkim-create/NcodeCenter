# -*- coding: utf-8 -*-
"""DSH-01 대시보드 — 실제 화면 구조 그대로.

분야별 4개 구역을 위에서 아래로 배치한다.
  ① 코드(SOBP)  : 요약 3장 + Section별 소유 현황 · 업체별 점유 Top 10
  ② 편집(CasterN): 요약 3장 + 편집 진행 상태 분포
  ③ 정산         : 요약 3장
  ④ 운영         : 운영 알림 · 최근 활동
조회 전용이며 사용자 입력이 없다.
"""
from shell import page, frame

CODE, NAME = 'DSH-01', '대시보드'
PRD = 'docs/prd/DSH-01_대시보드.md'

# (section, 소유 owner, owner 정원, 테스트/개발)
SECTIONS = ((0, 48, 1024, False), (1, 6, 1024, True), (3, 212, 4096, False),
            (5, 163, 256, False), (10, 15, 1024, False), (11, 1, 1024, False),
            (14, 9, 4096, False), (44, 21, 1024, True))
MAX_SEC = 212
OWNER_USED, OWNER_CAP = 475, 13568
OWNER_FREE = OWNER_CAP - OWNER_USED

TOP10 = (('neolab', 1), ('Solution', 96), ('NeoLAB POD', 156), ('몰스킨 스티커', 10),
         ('대표님 Scode->Ncode 전환 인식용', 13), ('CMS 에듀', 5), ('네오노트', 3),
         ('헤르만헤세', 2), ('웅진씽크빅', 2), ('잉글리시에그', 2))
MAX_ACC = 156

ACTS = (('08-26 11:24', '티켓 발급', '#8ec674', '웅진씽크빅 · S3/O17 · Book 431~464', '김순정'),
        ('08-26 10:58', '코드 할당(등록)', '#9b87d9', '크레버스 · S3/O945 · Book 25~28', '김순정'),
        ('08-26 10:12', '교재 작업', '#d69a4a', '구몬학습 · 영어 5A · 심볼 2,046', '박지훈'),
        ('08-26 09:47', '고객사 관리', '#5f8ff0', '시원스쿨 정보 수정', '김순정'),
        ('08-26 09:03', '로그인', '#6b7280', 'jihoon@neolab.net', '박지훈'),
        ('08-25 18:02', '로그아웃', '#9ca3af', 'soonjung@neolab.net', '김순정'),
        ('08-25 17:40', '교재 추가', '#f0a94a', '한솔교육 · 핀덴하이 · Book 143', '박지훈'),
        ('08-25 16:11', '정산 등록', '#5cb4e6', '대교 · 발급 141번 · 유료 ₩3,500,000', '김순정'))

ST_TONE = {'진행중': '#5f8ff0', '완료': '#22c55e', '보류': '#f59e0b'}


def dcard(inner, pad='15px 16px'):
    return ('<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;'
            'padding:%s">%s</div>' % (pad, inner))


def chead(title, hint=None):
    h = ('<span style="font-size:11.5px;color:#9ca3af;margin-left:8px">%s</span>' % hint) if hint else ''
    return ('<div style="display:flex;justify-content:space-between;align-items:baseline;'
            'margin-bottom:10px"><div><span style="font-weight:700;font-size:14px">%s</span>%s</div>'
            '</div>' % (title, h))


def shead(title, note, action):
    return ('<div style="display:flex;align-items:baseline;gap:8px;margin:22px 0 10px;'
            'padding-bottom:6px;border-bottom:1px solid #eef0f4">'
            '<span style="font-size:14.5px;font-weight:800;color:#111827">%s</span>'
            '<span style="font-size:11.5px;color:#9ca3af">%s</span>'
            '<span style="flex:1"></span>'
            '<span style="font-size:12px;color:#5f8ff0">%s →</span></div>' % (title, note, action))


def kpi(icon, label, value, sub, tone, extra=''):
    return dcard(
        '<div style="display:flex;justify-content:space-between;align-items:flex-start">'
        '<div style="font-size:12px;color:#6b7280">%s</div>'
        '<span style="width:30px;height:30px;border-radius:9px;display:grid;place-items:center;'
        'font-size:15px;background:%s18">%s</span></div>'
        '<div style="font-size:24px;font-weight:800;margin-top:4px;color:%s;line-height:1.2">%s</div>'
        '<div style="font-size:11.5px;color:#9ca3af">%s</div>%s'
        % (label, tone, icon, tone, value, sub, extra))


def kpi3(cards):
    return ('<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;'
            'margin-bottom:14px">%s</div>' % ''.join(cards))


def grid2(a, b):
    return ('<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;'
            'align-items:start">%s%s</div>' % (a, b))


# ── ① 코드 (SOBP) ────────────────────────────────────────────────
def code_kpis(hot=True):
    bar = ('<div style="display:flex;height:6px;border-radius:3px;overflow:hidden;'
           'background:#eceafd;margin-top:6px"><div style="width:3.5%;background:#8b7ff0"></div></div>')
    tight = 'Section 5 사용률 63.7%' if hot else '여유 있음'
    return kpi3([
        kpi('🗺', '코드 할당율', '3.5%', 'owner 정원 13,568 기준', '#8b7ff0', bar),
        kpi('🧩', '발급 owner', '475', '레코드 479건 · 업체 128곳', '#5f8ff0'),
        kpi('🕳', '미발급 owner', '13,093', tight, '#94a3b8'),
    ])


def sec_card(hot=True):
    rows = ''
    for s, owned, cap, test in SECTIONS:
        use = owned * 100.0 / cap
        warn = hot and use >= 50
        badge = ('<span style="font-size:9px;color:#6d5bd0;background:#eceafd;border-radius:4px;'
                 'padding:0 4px;margin-left:4px" title="상용 미출시 · 개발/테스트 전용">테스트/개발</span>') if test else ''
        pctxt = ('<span style="color:#b45309;font-weight:700;font-size:11px"> %d%%</span>'
                 % round(use)) if warn else ''
        rows += ('<div style="display:flex;align-items:center;gap:10px">'
                 '<div style="width:92px;font-size:12.5px;flex:none">Section %d%s</div>'
                 '<div style="flex:1;display:flex;height:16px;border-radius:5px;overflow:hidden;'
                 'background:#f1f3f7"><div style="width:%.1f%%;background:%s"></div></div>'
                 '<div style="width:108px;text-align:right;font-size:12px;color:#6b7280;flex:none">'
                 '%s<span style="color:#c7cbd4;font-size:11px"> / %s</span>%s</div></div>'
                 % (s, badge, owned * 100.0 / MAX_SEC, '#f59e0b' if warn else '#5f8ff0',
                    '{:,}'.format(owned), '{:,}'.format(cap), pctxt))
    return dcard(chead('Section별 소유 현황', '소유 owner / 정원') +
                 '<div style="display:flex;flex-direction:column;gap:9px;margin-top:4px">%s</div>' % rows)


def top10_card():
    rows = ''
    for i, (nm, owners) in enumerate(TOP10):
        rows += ('<div style="display:flex;align-items:center;gap:10px">'
                 '<div style="width:20px;color:#9ca3af;font-size:12px;flex:none">%d</div>'
                 '<div style="width:130px;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;'
                 'white-space:nowrap;flex:none">%s</div>'
                 '<div style="flex:1;height:14px;border-radius:5px;background:#f1f3f7;overflow:hidden">'
                 '<div style="width:%.1f%%;height:100%%;background:hsl(%d 62%% 55%%)"></div></div>'
                 '<div style="width:62px;text-align:right;font-size:12px;color:#6b7280;flex:none">'
                 'owner %d</div></div>'
                 % (i + 1, nm, owners * 100.0 / MAX_ACC, (i * 42) % 360, owners))
    return dcard(chead('업체별 점유 Top 10', '소유 owner 수') +
                 '<div style="display:flex;flex-direction:column;gap:9px;margin-top:4px">%s</div>' % rows)


# ── ② 편집 (CasterN) ─────────────────────────────────────────────
def edit_kpis(done=1240, books=8483):
    rate = '0%' if not books else '%.1f%%' % (done * 100.0 / books)
    return kpi3([
        kpi('🎬', 'CasterN 고객사', '69', '편집 교재 %s권' % '{:,}'.format(books), '#5f8ff0'),
        kpi('✅', '편집 완료 교재', '{:,}'.format(done),
            '전체 %s권 중 %s' % ('{:,}'.format(books), rate), '#22c55e'),
        kpi('💵', '전용 단가 고객사', '7', '전체 고객사 128곳 중', '#b45309'),
    ])


def edit_dist(dist=(6893, 1240, 350), note=False):
    books = sum(dist)
    seg = ''
    for (k, n) in zip(('진행중', '완료', '보류'), dist):
        if not n:
            continue
        seg += ('<div title="%s %s권" style="width:%.2f%%;background:%s"></div>'
                % (k, '{:,}'.format(n), n * 100.0 / books, ST_TONE[k]))
    cells = ''
    for (k, n) in zip(('진행중', '완료', '보류'), dist):
        cells += ('<div style="border:1px solid #eef0f4;border-radius:9px;padding:9px 11px">'
                  '<div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#6b7280">'
                  '<span style="width:9px;height:9px;border-radius:50%%;background:%s;flex:none"></span>%s</div>'
                  '<div style="font-size:19px;font-weight:800;color:%s;margin-top:2px">%s</div>'
                  '<div style="font-size:11px;color:#9ca3af">%.1f%%</div></div>'
                  % (ST_TONE[k], k, ST_TONE[k], '{:,}'.format(n), n * 100.0 / books))
    tail = ('<div style="font-size:11px;color:#9ca3af;margin-top:10px;line-height:1.6">'
            '시드 데이터에는 진행 상태 값이 없어 전부 <b>진행중</b>으로 집계됩니다. '
            '편집 상세에서 교재 상태를 바꾸면 여기에 반영됩니다.</div>') if note else ''
    return dcard(chead('편집 진행 상태 분포', '교재 %s권' % '{:,}'.format(books)) +
                 '<div style="display:flex;height:22px;border-radius:6px;overflow:hidden;'
                 'background:#f1f3f7;margin-bottom:12px">%s</div>'
                 '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">%s</div>%s'
                 % (seg, cells, tail))


# ── ③ 정산 ───────────────────────────────────────────────────────
def bill_kpis(est=True):
    if est:
        v, sub, tone = '~₩11,800,000', '미정 3건 · 고객사 단가 2 / 평균 1', '#dc2626'
    else:
        v, sub, tone = '—', '미정 3건 · 유료 이력 없어 추정 불가', '#9ca3af'
    return kpi3([
        kpi('💰', '편집 비용 청구액', '₩1,284,900,000', '정가 ₩1,402,000,000 · 할인 −₩117,100,000', '#14b8a6'),
        kpi('❓', '미정산 금액 추정', v, sub, tone),
        kpi('🧾', 'Key 발급 정산', '₩8,300,000', '유료 3 · 무료 1 · 체험 2 · 미정 3', '#1d4ed8'),
    ])


# ── ④ 운영 ───────────────────────────────────────────────────────
def alert_row(n, label, note, danger=False):
    on = n > 0
    fg = '#9ca3af' if not on else ('#b91c1c' if danger else '#92400e')
    bg = '#f3f4f6' if not on else ('#fef2f2' if danger else '#fef3c7')
    return ('<div style="display:flex;align-items:center;gap:9px;padding:8px 0;'
            'border-top:1px solid #f5f6f8">'
            '<span style="min-width:34px;text-align:center;font-weight:800;font-size:14px;'
            'color:%s;background:%s;border-radius:7px;padding:3px 6px">%d</span>'
            '<span style="flex:1;min-width:0">'
            '<span style="font-size:12.5px;color:%s;%s">%s</span>'
            '<span style="display:block;font-size:11px;color:#9ca3af;overflow:hidden;'
            'text-overflow:ellipsis;white-space:nowrap">%s</span></span>'
            '<span style="color:#d1d5db;font-size:12px">→</span></div>'
            % (fg, bg, n, '#111827' if on else '#9ca3af',
               'font-weight:600' if on else '', label, note))


def alert_card(zero=False, hot=True):
    if zero:
        rows = (alert_row(0, '정산 미등록 티켓', '발급했지만 과금 유형이 미정') +
                alert_row(0, '체험 기간 만료', '유료 전환 또는 회수 확인', True) +
                alert_row(0, '체험 만료 임박 (7일 내)', '사전 안내 대상') +
                alert_row(0, 'App Key 미연동 계정', '계정만 있고 발급 키 없음') +
                alert_row(0, '사업 종료 고객사', '보유 코드 프로젝트 0건 — 회수 검토') +
                alert_row(0, '정원 50% 이상 사용 Section', '여유 있음'))
    else:
        rows = (alert_row(3, '정산 미등록 티켓', '추정 ₩11,800,000 — 과금 유형 미정') +
                alert_row(1, '체험 기간 만료', '유료 전환 또는 회수 확인', True) +
                alert_row(1, '체험 만료 임박 (7일 내)', '사전 안내 대상') +
                alert_row(2, 'App Key 미연동 계정', '계정만 있고 발급 키 없음') +
                alert_row(4, '사업 종료 고객사', '보유 코드 프로젝트 6건 — 회수 검토') +
                alert_row(1 if hot else 0, '정원 50% 이상 사용 Section',
                          'S5 64%' if hot else '여유 있음'))
    return dcard(chead('운영 알림') +
                 '<div style="display:flex;flex-direction:column;gap:2px">%s</div>' % rows)


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
    return dcard(chead('최근 활동 (내부 직원)', '시간순') + inner)


def content(empty=False, hot=True, zero=False, est=True, dist=(6893, 1240, 350), note=False):
    return (shead('코드 (SOBP)', '발급 여력과 점유 분포', 'SOBP 맵') +
            code_kpis(hot) + grid2(sec_card(hot), top10_card()) +
            shead('편집 (CasterN)', '편집 프로젝트 규모와 진행 상태', '편집 프로젝트') +
            edit_kpis(dist[1], sum(dist)) + edit_dist(dist, note) +
            shead('정산', '편집 청구액과 Key 발급 과금', 'N Key 관리') + bill_kpis(est) +
            shead('운영', '확인·처리가 필요한 항목', '전체 로그') +
            grid2(alert_card(zero, hot), act_card(empty)))


NAV = [('좌측 메뉴 [SOBP 맵]', '클릭', '<code>SOB-01</code>', 'Section·Owner·Book·Page 드릴다운'),
       ('좌측 메뉴 [고객사 관리]', '클릭', '<code>MEM-01</code>', '업체 상세·계약·단가'),
       ('좌측 메뉴 [편집 프로젝트]', '클릭', '<code>PRJ-02</code>', '편집량·정산'),
       ('좌측 메뉴 [N Key 관리]', '클릭', '<code>TKT-03</code>', 'N Key 발급 목록 `PC-061`')]

SECT_NAV = [
    ('① 구역 제목 [SOBP 맵]', '클릭', '<code>SOB-01</code>', '코드 여력 확인'),
    ('② 구역 제목 [편집 프로젝트]', '클릭', '<code>PRJ-02</code>', '편집량·정산'),
    ('③ 구역 제목 [N Key 관리]', '클릭', '<code>TKT-03</code>', 'N Key 발급 목록 `PC-061`'),
    ('④ 구역 제목 [전체 로그]', '클릭', '<code>LOG-01</code>', '활동 로그 전체 조회'),
]


def build():
    boards = []

    def F(inner, admin=True, user='김순정', role='ADMIN', h=1780):
        return frame('DSH-01', '대시보드', inner, admin=admin, user=user, role=role, height=h)

    boards.append((
        'S1', '기본 · 데이터 정상', '기본',
        '로그인 성공 직후 열리는 기본 진입 화면. 분야별 <b>4개 구역</b>을 위에서 아래로 배치한다 — '
        '① 코드(SOBP) ② 편집(CasterN) ③ 정산 ④ 운영. 각 구역은 <b>요약 3장 + 상세 카드</b>로 '
        '이루어지고, 구역 제목 우측 링크로 해당 관리 화면에 들어간다. '
        '<b>조회 전용</b>이며 사용자 입력이 없어 검증 오류가 없다.',
        F(content()),
        [('① 코드 요약', '조회', '—', '코드 할당율 3.5% · 발급 owner 475 · 미발급 owner 13,093'),
         ('② 편집 요약', '조회', '—', 'CasterN 고객사 69 · 편집 완료 교재 1,240 · 전용 단가 고객사 7'),
         ('③ 정산 요약', '조회', '—',
          '편집 청구액 ₩1,284,900,000 · 미정산 추정 ~₩11,800,000 · Key 발급 정산 ₩8,300,000'),
         ('④ 운영 알림', '조회', '—', '처리 필요 항목만 건수로 표시 — 0건은 흐리게'),
         ('요약 카드', '클릭', '해당 관리 화면', '카드마다 이동 대상이 다르다 — PRD §6'),
         ('최근 활동 행', '조회', '—', '시각 · 활동 종류 · 내용 · 담당자 — <b>최근 8건</b>')]
        + SECT_NAV + NAV))

    boards.append((
        'S2', '처리할 알림 없음', '빈 상태',
        'PRD §5 — 운영 알림 6항목이 모두 <b>0건</b>인 상태. 건수 배지가 <b>흐리게</b> 표시되어 '
        '"할 일 없음"이 한눈에 읽힌다. <b>이동은 그대로 가능</b>하며 나머지 구역은 정상 표시된다.',
        F(content(zero=True, hot=False)),
        [('운영 알림 6항목', '표시', '—', '모두 0건 — 흐리게'),
         ('알림 항목', '클릭', '해당 화면', '0건이어도 <b>이동 가능</b>'),
         ('①②③ 구역', '조회', '—', '정상 표시')]))

    boards.append((
        'S3', 'Section 정원 경고', '변형',
        '사용률이 <b>50% 이상</b>인 Section 은 막대를 강조하고 <b>비율(%)</b>을 함께 적는다. '
        '운영 알림에도 해당 Section 목록이 올라온다. 코드 여력은 늦게 알면 손쓸 수 없으므로 '
        '미발급 요약 카드에도 <b>사용률이 가장 높은 Section</b> 을 표기한다.',
        F(content()),
        [('Section 5', '표시', '—', '<b>163 / 256 · 64%</b> — 경고 대상'),
         ('Section 3', '표시', '—', '212 / 4,096 · 5% — 해당 없음'),
         ('미발급 요약 카드', '조회', '—', '부가 표기 <b>Section 5 사용률 63.7%</b>'),
         ('운영 알림 [정원 50% 이상]', '클릭', '<code>SOB-01</code>', '여력 확인'),
         ('⚠ 참고', '—', '<code>SOB-01</code> 과 기준이 다르다',
          'SOB-01 의 <b>추천제외</b>는 이 배지와 별개 값이다')]))

    boards.append((
        'S4', '편집 상태 미지정 — 전량 진행중', '빈 상태',
        '교재 진행 상태를 한 번도 지정하지 않으면 <b>전량이 진행중</b>으로 집계된다. '
        '이때만 분포 카드 아래에 안내가 붙는다. 편집 완료 교재 요약은 <b>0</b> 이 된다.',
        F(content(dist=(8483, 0, 0), note=True)),
        [('편집 진행 상태 분포', '표시', '—', '진행중 8,483 (100%) · 완료 0 · 보류 0'),
         ('안내 문구', '표시', '—',
          '<b>시드 데이터에는 진행 상태 값이 없어 전부 진행중으로 집계됩니다. '
          '편집 상세에서 교재 상태를 바꾸면 여기에 반영됩니다.</b>'),
         ('편집 완료 교재', '조회', '—', '<b>0</b> · 전체 8,483권 중 0%'),
         ('교재 상태 변경', '—', '<code>PRJ-04</code>', '교재 편집 화면에서 바꾸면 이 분포에 반영')]))

    boards.append((
        'S5', '미정산 추정 불가', '분기',
        '유료 티켓 이력이 <b>전혀 없으면</b> 추정 근거가 없어 금액을 <b>—</b> 로 표시한다. '
        '미정 건수는 그대로 보여주고, 운영 알림의 [정산 미등록]도 건수만 남는다. '
        '계산 규칙은 PRD §4.2(마).',
        F(content(est=False)),
        [('미정산 금액 추정', '표시', '—', '<b>—</b> · 미정 3건 · 유료 이력 없어 추정 불가'),
         ('운영 알림 [정산 미등록]', '표시', '—', '건수 3 — 추정액 문구 없음'),
         ('추정 근거', '—', '—', '1순위 같은 고객사 최근 유료 금액 · 2순위 전체 유료 평균')]))

    boards.append((
        'S6', '최근 활동 없음', '빈 상태',
        'PRD §5 — 활동 목록 영역에 기록이 없다는 안내만 표시되고, '
        '<b>구역 제목의 [전체 로그] 이동은 그대로 가능</b>하다. 나머지는 정상 표시된다.',
        F(content(empty=True)),
        [('최근 활동', '표시', '—',
          '<b>기록된 활동이 없습니다. (고객사 수정·코드 할당·프로젝트 등록·티켓 발급·교재 작업·로그인 시 기록)</b>'),
         ('[전체 로그 →]', '클릭', '<code>LOG-01</code>', '기록이 없어도 <b>이동 가능</b>'),
         ('운영 알림', '조회', '—', '정상 표시')]))

    boards.append((
        'S7', 'STAFF 진입 — 화면은 동일', '권한',
        '⚠ <b>이 화면에는 권한 분기가 없다.</b> STAFF도 ADMIN과 <b>똑같은 4개 구역</b>을 본다. '
        '차이는 <b>좌측 메뉴</b>뿐으로, <b>활동 로그</b> 메뉴에 <b>ADMIN</b> 배지가 붙는다. '
        '구역 제목 <b>[전체 로그]</b> 로 <code>LOG-01</code> 에 들어가면 '
        '그 화면에서 <b>🔒 접근 권한이 없습니다</b> 로 막힌다.',
        F(content(), admin=False, user='박지훈', role='STAFF'),
        [('4개 구역 전체', '조회', '동일', 'STAFF도 그대로 본다'),
         ('좌측 메뉴 [활동 로그]', '표시', '<b>ADMIN</b> 배지', '메뉴를 숨기지 않는다'),
         ('[전체 로그 →]', '클릭', '<code>LOG-01</code>',
          'STAFF 는 그 화면에서 차단된다 — <b>🔒 접근 권한이 없습니다</b>'),
         ('최근 활동 내용', '조회', '—',
          '활동 로그 화면은 막히지만 <b>대시보드의 최근 8건은 보인다</b>')] + NAV))

    intro = ('로그인 후 처음 만나는 화면. <b>코드가 얼마나 남아 있고 · 편집이 얼마나 진행됐고 · '
             '받을 돈이 얼마이고 · 지금 처리할 일이 무엇인지</b>를 한 화면에서 파악한다. '
             '분야별 <b>4개 구역</b>(코드 · 편집 · 정산 · 운영)으로 나뉘며 <b>조회 전용</b>이다 — '
             '상세 확인·수정은 각 화면코드로 이동해서 수행한다. '
             '집계는 화면을 열 때 원장에서 다시 계산하며, 계산 규칙과 예시는 PRD §4.2 에 있다.')
    return page(CODE, NAME, PRD, intro, boards)
