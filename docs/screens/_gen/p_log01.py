# -*- coding: utf-8 -*-
"""LOG-01 활동 로그 — web/components/ActivityLogView.tsx 실제 구현 기준"""
from shell import page, frame

CODE, NAME = 'LOG-01', '활동 로그'
PRD = 'docs/prd/LOG-01_활동 로그.md'

# lib/activityStore.ts TYPE_META (선언 순서 그대로)
TYPES = (('고객사 관리', '#5f8ff0', 18), ('코드 할당(등록)', '#9b87d9', 26),
         ('프로젝트 등록', '#14b8a6', 9), ('티켓 발급', '#8ec674', 31),
         ('교재 추가', '#f0a94a', 14), ('교재 작업', '#d69a4a', 47),
         ('로그인', '#6b7280', 62), ('로그아웃', '#9ca3af', 58))
COLOR = dict((t[0], t[1]) for t in TYPES)

ACTORS = ('김순정', '박지훈')
MONTHS = ('2026년 8월', '2026년 7월')

# (월, [(일, 요일, [(시각, 종류, 상세, 담당자)])])
DATA = [
    ('2026년 8월', [
        ('26', '2026-08', '수', [
            ('11:24', '티켓 발급', '웅진씽크빅 · S3/O17 · Book 431~464 · casterN', '김순정'),
            ('10:58', '코드 할당(등록)', '크레버스 · S3/O945 · Book 25~28 · casterN', '김순정'),
            ('10:12', '교재 작업', '구몬학습 · 영어 5A · 심볼 2,046 · 단가 갱신', '박지훈'),
            ('09:47', '고객사 관리', '시원스쿨 · 담당자·계좌 수정', '김순정'),
            ('09:03', '로그인', 'jihoon@neolab.net', '박지훈'),
        ]),
        ('25', '2026-08', '화', [
            ('18:02', '로그아웃', 'soonjung@neolab.net', '김순정'),
            ('17:40', '교재 추가', '한솔교육 · 핀덴하이 · Book 143', '박지훈'),
            ('15:21', '프로젝트 등록', '포스트매스 · S3/O54 · 코드 프로젝트', '김순정'),
            ('14:05', '티켓 발급', 'Photron · S3/O241 · 티켓기한 6개월', '김순정'),
        ]),
        ('24', '2026-08', '월', [
            ('16:20', '고객사 관리', '웅진씽크빅 · 업무요청 메모 추가', '김순정'),
            ('11:11', '코드 할당(등록)', 'MathLAB · S5/O100 · Book 1~9 · 아이글', '박지훈'),
        ]),
    ]),
]


def avatar(name):
    return ('<span style="display:inline-grid;place-items:center;width:16px;height:16px;'
            'border-radius:50%%;background:#e5e7eb;color:#374151;font-size:9px;font-weight:700;'
            'margin-right:3px">%s</span>' % name[0])


def chip(inner, active=False):
    return ('<span style="display:inline-flex;align-items:center;gap:2px;font-size:12.5px;'
            'padding:5px 11px;border-radius:20px;border:1px solid %s;background:%s;color:%s">'
            '%s</span>'
            % ('#5f8ff0' if active else '#e5e7eb', '#5f8ff0' if active else '#fff',
               '#fff' if active else '#374151', inner))


def filter_row(label, chips):
    return ('<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px">'
            '<span style="font-size:11px;color:#9ca3af;width:60px;flex:none;font-weight:600">%s</span>'
            '%s</div>' % (label, chips))


def filters(month='전체', actor='전체', kind='전체'):
    mc = chip('전체', month == '전체') + ''.join(chip(m, month == m) for m in MONTHS)
    ac = chip('전체', actor == '전체') + ''.join(
        chip(avatar(n) + n, actor == n) for n in ACTORS)
    kc = chip('전체', kind == '전체') + ''.join(
        chip('<span style="display:inline-block;width:8px;height:8px;border-radius:50%%;'
             'background:%s;margin-right:5px"></span>%s %d' % (c, nm, n), kind == nm)
        for nm, c, n in TYPES)
    return (filter_row('월', mc) + filter_row('직원', ac) + filter_row('활동 종류', kc))


def day_block(day, ym, week, items):
    rows = ''
    for i, (hm, kind, detail, who) in enumerate(items):
        rows += ('<div style="display:flex;align-items:flex-start;gap:10px;padding:8px 12px;'
                 'border-top:%s">'
                 '<span style="font-family:ui-monospace,monospace;font-size:11.5px;color:#9ca3af;'
                 'padding-top:2px;width:40px;flex:none">%s</span>'
                 '<span style="font-size:11px;font-weight:700;color:#fff;background:%s;'
                 'border-radius:6px;padding:2px 8px;white-space:nowrap;flex:none;margin-top:1px">%s</span>'
                 '<span style="font-size:13px;color:#111827;flex:1">%s</span>'
                 '<span style="display:inline-flex;align-items:center;gap:4px;font-size:11.5px;'
                 'color:#6b7280;white-space:nowrap;flex:none">%s%s</span></div>'
                 % ('1px solid #f4f6f9' if i else 'none', hm, COLOR[kind], kind, detail,
                    avatar(who), who))
    return ('<div style="display:grid;grid-template-columns:92px 1fr;gap:14px;margin-bottom:12px">'
            '<div style="text-align:right;padding-top:6px">'
            '<div style="font-size:20px;font-weight:800;color:#374151;line-height:1">%s</div>'
            '<div style="font-size:11px;color:#9ca3af;margin-top:2px">%s · %s요일</div>'
            '<div style="font-size:10.5px;color:#c0c6d0;margin-top:2px">%d건</div></div>'
            '<div style="background:#fff;border:1px solid #eef0f4;border-radius:12px;'
            'padding:6px 4px">%s</div></div>'
            % (day, ym, week, len(items), rows))


def month_block(label, days):
    total = sum(len(d[3]) for d in days)
    body = ''.join(day_block(*d) for d in days)
    return ('<div style="margin-bottom:20px">'
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">'
            '<div style="font-size:15px;font-weight:800;color:#111827">%s</div>'
            '<span style="font-size:11.5px;color:#9ca3af">%d건</span>'
            '<div style="flex:1;height:1px;background:#eef0f4"></div></div>%s</div>'
            % (label, total, body))


def content(month='전체', actor='전체', kind='전체', data=None, count=265, total=265):
    data = DATA if data is None else data
    if data:
        body = ''.join(month_block(m, days) for m, days in data)
    else:
        body = ('<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;'
                'padding:40px;text-align:center;color:#9ca3af;font-size:13px">'
                '해당 조건의 활동이 없습니다.'
                '<div style="font-size:11.5px;margin-top:6px">고객사 수정·코드 할당·프로젝트 등록·'
                '티켓 발급·교재 추가/작업·로그인 시 자동 기록됩니다.</div></div>')
    return ('<div style="max-width:1000px">'
            '<div style="display:flex;align-items:center;gap:10px;margin:0 0 14px">'
            '<p style="color:#6b7280;font-size:13px;margin:0;flex:1">'
            '내부 직원 활동을 <b>월별 · 일자별</b>로 확인. 활동 종류·직원·월로 필터. · 전체 %d건</p>'
            '<span style="font-size:12px;padding:6px 12px;border-radius:8px;'
            'border:1px solid #fecaca;background:#fff;color:#dc2626;white-space:nowrap">'
            '전체 삭제</span></div>%s'
            '<div style="font-size:12px;color:#9ca3af;margin:16px 0 10px">조건에 맞는 활동 '
            '<b style="color:#374151">%d</b>건</div>%s</div>'
            % (total, filters(month, actor, kind), count, body))


def denied():
    return ('<div style="padding:20px;max-width:560px">'
            '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:28px;'
            'text-align:center">'
            '<div style="font-size:30px;margin-bottom:8px">🔒</div>'
            '<div style="font-weight:700;font-size:15px;color:#111827">접근 권한이 없습니다</div>'
            '<div style="font-size:12.5px;color:#6b7280;margin-top:6px">'
            '활동 로그는 관리자(ADMIN) 계정만 열람할 수 있습니다.</div></div></div>')


def build():
    boards = []

    boards.append((
        'S1', '기본 · 월 ▸ 일자 그룹', '기본',
        '<b>ADMIN 전용</b> — 좌측 메뉴 [활동 로그] 또는 <code>DSH-01</code>의 [전체 로그]로 진입. '
        '구현은 <b>본문 최대 1000px</b>이며 필터가 <b>드롭다운이 아니라 칩 3줄</b>(월 · 직원 · 활동 종류)이다. '
        '목록은 <b>월 헤더 + 일자 그리드 <code>92px 1fr</code></b> 구조로, 왼쪽에 큰 날짜 숫자, '
        '오른쪽에 활동 카드가 붙는다.',
        frame('LOG-01', '활동 로그', content(), height=1160),
        [('월 칩', '클릭', '해당 월만', '전체 + 데이터에 있는 월 · <b>같은 칩 재클릭 = 해제(토글)</b>'),
         ('직원 칩', '클릭', '해당 직원만', '아바타(이름 첫 글자) + 이름 · 토글'),
         ('활동 종류 칩', '클릭', 'S2 (필터 적용)', '색 점 + 라벨 + <b>현재 조건 기준 건수</b> · 8종 · 토글'),
         ('조건 건수', '자동', '재계산', '<b>조건에 맞는 활동 {n}건</b>'),
         ('[전체 삭제]', '클릭', 'S4 확인창', '빨간 테두리 버튼 · 되돌릴 수 없음'),
         ('기록된 코드 할당', '확인', '<code>SOB-01</code>', '해당 S/O 상태'),
         ('기록된 티켓', '확인', '<code>TKT-03</code>', '발급 목록 상세'),
         ('기록된 고객사 변경', '확인', '<code>MEM-01</code> → <code>MEM-02</code>', ''),
         ('⚠ 칩 동작', '참고', '<b>PRD와 다름</b>',
          'PRD-00 §4.4는 "칩 = 단일 선택(토글 아님)"이나 구현은 <b>재클릭 시 전체로 해제</b>된다')]))

    filtered = [('2026년 8월', [
        ('26', '2026-08', '수', [
            ('11:24', '티켓 발급', '웅진씽크빅 · S3/O17 · Book 431~464 · casterN', '김순정')]),
        ('25', '2026-08', '화', [
            ('14:05', '티켓 발급', 'Photron · S3/O241 · 티켓기한 6개월', '김순정')])])]
    boards.append((
        'S2', '활동 종류 필터 적용', '필터',
        '칩을 고르면 목록과 <b>조건에 맞는 활동 {n}건</b>이 함께 줄어든다. '
        '각 종류 칩의 건수도 <b>현재 월·직원 조건 기준</b>으로 다시 계산된다.',
        frame('LOG-01', '활동 로그',
              content(month='2026년 8월', kind='티켓 발급', data=filtered, count=31),
              height=880),
        [('[티켓 발급] 칩', '클릭', '해당 종류만', '활성 칩은 파란 배경'),
         ('재클릭', '클릭', '전체로 해제', '토글 동작'),
         ('건수', '자동', '재계산', '<b>조건에 맞는 활동 31건</b>'),
         ('발생 화면', '참고', '<code>TKT-04</code>·<code>TKT-01</code>·<code>TKT-05</code>', '')]))

    boards.append((
        'S3', '조건에 맞는 활동 없음', '빈 상태',
        'PRD §5 — 조건에 맞는 기록이 없으면 카드 하나로 안내한다. '
        '<b>보관 기간(7일)</b>이 지난 기록은 목록에 나타나지 않는다.',
        frame('LOG-01', '활동 로그',
              content(month='2026년 7월', kind='프로젝트 등록', data=[], count=0), height=800),
        [('빈 카드', '표시', '—', '<b>해당 조건의 활동이 없습니다.</b>'),
         ('보조 안내', '표시', '—',
          '<b>고객사 수정·코드 할당·프로젝트 등록·티켓 발급·교재 추가/작업·로그인 시 자동 기록됩니다.</b>'),
         ('필터 되돌리기', '클릭', 'S1', '월·직원·종류를 전체로'),
         ('보관 기간', '—', '<b>최근 7일</b>', '⚠ 테스트 기준 · 운영 기준 미확정 (§7)')]))

    del_ovl = ('<div class="ovl"><div class="mdl">'
               '<div class="mh"><div class="mt">확인</div><div class="mx">✕</div></div>'
               '<div style="font-size:13px;color:#374151;line-height:1.7">'
               '활동 로그를 전부 삭제하고 새로 기록하시겠습니까? (되돌릴 수 없습니다)</div>'
               '<div class="mf"><div class="btn gho">취소</div>'
               '<div class="btn dan">확인</div></div></div></div>')
    boards.append((
        'S4', '전체 삭제 확인창', '확인창',
        'PRD §4.3 · §5 — 브라우저 <code>confirm()</code>으로 확인한다. '
        '되돌릴 수 없으며 기록을 모두 지우고 새로 기록한다.',
        frame('LOG-01', '활동 로그', content(), overlay=del_ovl, height=1160),
        [('확인창 문구', '표시', '—',
          '<b>활동 로그를 전부 삭제하고 새로 기록하시겠습니까? (되돌릴 수 없습니다)</b>'),
         ('[확인]', '클릭', 'S3 (기록 없음)', '되돌릴 수 없음'),
         ('[취소]', '클릭', 'S1 복귀', '')]))

    boards.append((
        'S5', 'STAFF 접근 차단', '권한',
        '⚠ <b>PRD보다 강한 제어가 구현되어 있다.</b> PRD §5는 "메뉴에 노출되지 않는다"까지만 적혀 있으나, '
        '구현은 STAFF가 이 화면에 들어와도 <b>본문 자체를 🔒 안내로 대체</b>한다. '
        '즉 <code>DSH-01</code>의 [전체 로그]로 진입해도 목록은 보이지 않는다 — '
        'PRD-00 §7의 "역할별 화면 접근 제어" 미결 항목에 대한 <b>실제 답</b>이 이미 코드에 있다.',
        frame('LOG-01', '활동 로그', denied(), admin=False, user='박지훈', role='STAFF',
              height=560),
        [('본문', '표시', '—', '<b>접근 권한이 없습니다</b> / '
          '<b>활동 로그는 관리자(ADMIN) 계정만 열람할 수 있습니다.</b>'),
         ('좌측 메뉴 [활동 로그]', '—', '<b>노출 안 됨</b>', 'ADMIN에게만 표시'),
         ('<code>DSH-01</code> [전체 로그]', '클릭', '이 화면(차단)', '목록은 보이지 않는다'),
         ('필터·목록', '—', '<b>렌더링 안 됨</b>', '')]))

    intro = ('<b>내부 직원이 언제 무엇을 했는지</b>를 시간순으로 확인하는 감사(audit) 화면. '
             '<b>ADMIN 전용</b>이며 STAFF는 본문이 🔒 안내로 대체된다. '
             '<b>조회 전용</b>(기록은 각 화면에서 자동 생성) · 한국시간(KST) 기준 · 보관 최근 7일. '
             '필터는 <b>월 · 직원 · 활동 종류</b> 칩 3줄이고 각 칩은 <b>재클릭 시 해제(토글)</b>된다. '
             '')
    return page(CODE, NAME, PRD, intro, boards)
