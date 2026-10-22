# -*- coding: utf-8 -*-
"""LOG-01 활동 로그 — web/components/ActivityLogView.tsx 실제 구현 기준"""
from shell import page, frame

CODE, NAME = 'LOG-01', '활동 로그'
PRD = 'docs/prd/LOG-01_활동 로그.md'

# lib/activityStore.ts TYPE_META (선언 순서 그대로)
# 활동 종류 8종 — 지금 메뉴 기준 `PC-248` · 색은 한눈에 구분되는 8색 `PC-253`
TYPES = (('고객사', '#3B82F6', 18), ('코드 할당', '#8B5CF6', 26),
         ('편집', '#14B8A6', 61), ('App Key', '#F59E0B', 12),
         ('N Key', '#EC4899', 14), ('서비스 티켓', '#22C55E', 5),
         ('정산', '#DC2626', 9), ('접속', '#9CA3AF', 120))

COLOR = dict((t[0], t[1]) for t in TYPES)

ACTORS = ('김순정', '박지훈')
MONTHS = ('2026년 8월', '2026년 7월')

# (월, [(일, 요일, [(시각, 종류, 상세, 담당자)])])
DATA = [
    ('2026년 8월', [
        ('26', '2026-08', '수', [
            ('11:24', '서비스 티켓', '서비스 티켓 지정 · 웅진씽크빅 · S3/O17 · Book 431~464 · casterN', '김순정'),
            ('10:58', '코드 할당', '크레버스 · S3/O945 · Book 25~28 · casterN', '김순정'),
            ('10:12', '편집', '교재 작업 · 구몬학습 · 영어 5A · 심볼 2,046 · 단가 갱신', '박지훈'),
            ('09:47', '고객사', '시원스쿨 · 담당자·계좌 수정', '김순정'),
            ('09:03', '접속', '로그인 · jihoon@neolab.net', '박지훈'),
        ]),
        ('25', '2026-08', '화', [
            ('18:02', '접속', '로그아웃 · soonjung@neolab.net', '김순정'),
            ('17:40', '편집', '교재 추가 · 한솔교육 · 핀덴하이 · Book 143', '박지훈'),
            ('15:21', '정산', '정산 등록 · 포스트매스 · 발급 54번 · 유료 ₩1,200,000', '김순정'),
            ('14:05', 'N Key', 'N Key · Photron · PDS3 S3/O241/B0~3', '김순정'),
        ]),
        ('24', '2026-08', '월', [
            ('16:20', '고객사', '웅진씽크빅 · 업무요청 메모 추가', '김순정'),
            ('11:11', '코드 할당', 'MathLAB · S5/O100 · Book 1~9 · 아이글', '박지훈'),
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


def sel(label, w=96):
    """셀렉트 — 데이터가 많아 칩보다 목록에서 고르는 편이 낫다 `PC-069`"""
    return ('<span style="display:inline-flex;align-items:center;gap:6px;font-size:12.5px;'
            'padding:5px 10px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;'
            'color:#374151;min-width:%dpx;justify-content:space-between">%s'
            '<span style="color:#9ca3af;font-size:9px">&#9660;</span></span>' % (w, label))


def navbtn(mark, off=False):
    return ('<span style="display:inline-grid;place-items:center;width:28px;height:28px;'
            'border-radius:8px;border:1px solid #e5e7eb;background:#fff;font-size:13px;'
            'color:%s">%s</span>' % ('#d1d5db' if off else '#374151', mark))


# 주 달력 데이터 — 2026-10-18(일) ~ 10-24(토) · 오늘 = 22일 `PC-251`
WEEK_DAYS = ('18', '19', '20', '21', '22', '23', '24')
WEEK_NAMES = ('일', '월', '화', '수', '목', '금', '토')
WEEK_DATA = {
    '19': [('17:40', '편집', '교재 추가 · 한솔교육 · 핀덴하이 · Book 143', '박지훈'),
           ('15:21', '정산', '정산 등록 · 포스트매스 · 발급 54번 · 유료 ₩1,200,000', '김순정'),
           ('09:03', '접속', '로그인 · jihoon@neolab.net', '박지훈')],
    '20': [('16:20', '고객사', '웅진씽크빅 · 업무요청 메모 추가', '김순정'),
           ('11:11', '코드 할당', 'MathLAB · S5/O100 · Book 1~9 · 아이글', '박지훈')],
    '21': [('14:05', 'N Key', 'N Key · Photron · PDS3 S3/O241/B0~3', '김순정'),
           ('13:02', 'N Key', '키 다운로드 · KODION · 발급 36번 · Ticket_KODION_3s_46o_10-11b_0p_512.nkey', '김순정')],
    '22': [('11:24', '서비스 티켓', '서비스 티켓 지정 · 웅진씽크빅 · S3/O17 · Book 431~464 · casterN', '김순정'),
           ('10:58', '코드 할당', '크레버스 · S3/O945 · Book 25~28 · casterN', '김순정'),
           ('10:12', '편집', '교재 작업 · 구몬학습 · 영어 5A · 심볼 2,046', '박지훈'),
           ('09:47', '고객사', '시원스쿨 · 담당자·계좌 수정', '김순정'),
           ('09:30', 'App Key', '티켓 발급 · 대교 · daekyo@daekyo.com · PDS3 S3/O291/B0~249', '김순정'),
           ('09:03', '접속', '로그인 · soonjung@neolab.net', '김순정')],
}


def filters(actor='직원 전체', kind='전체', data=None, view='week'):
    # [주][월] 보기 · 앞뒤 이동 · [이번 주]/[이번 달] · 직원 셀렉트 `PC-251` `PC-252`
    seg = lambda on: 'padding:5px 12px;font-size:12.5px;%s' % ('background:#eef6ff;color:#1d4ed8;font-weight:700' if on else 'color:#6b7280')
    tog = ('<span style="display:inline-flex;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden"><span style="%s">주</span>'
           '<span style="border-left:1px solid #e5e7eb;%s">월</span></span>' % (seg(view == 'week'), seg(view == 'month')))
    week = (tog + navbtn('&#8249;') + navbtn('&#8250;')   # 보는 기간 글자는 달력 위 `PC-255`
            + '<span style="font-size:12px;padding:5px 11px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;color:#6b7280">'
            + ('이번 주' if view == 'week' else '이번 달') + '</span>'
            + '<span style="margin-left:8px">' + sel(actor, 130) + '</span>')
    data = WEEK_DATA if data is None else data
    items = [x for d in data.values() for x in d]
    cnt = lambda nm: sum(1 for x in items if x[1] == nm)
    kc = chip('전체 %d' % len(items), kind == '전체') + ''.join(
        chip('<span style="display:inline-block;width:8px;height:8px;border-radius:50%%;'
             'background:%s;margin-right:5px"></span>%s %d' % (c, nm, cnt(nm)), kind == nm)
        for nm, c, n in TYPES)
    return filter_row('활동 종류', kc) + filter_row('기간 · 직원', week)   # 기간 줄은 활동 종류 아래 `PC-255`


def week_cal(data, sel_day='22', today='22'):
    """주 보기 — 날짜를 행으로 7줄 `PC-254`: 요일 · 날짜 | 건수 | 색 막대 + 종류 · 건수(한 줄)"""
    rows = ''
    for i, d in enumerate(WEEK_DAYS):
        items = data.get(d, [])
        future = int(d) > int(today)
        on = d == sel_day
        kinds = [(nm, c, sum(1 for x in items if x[1] == nm)) for nm, c, _ in TYPES]
        kinds = [k for k in kinds if k[2]]
        bar = ''.join('<div style="width:%.1f%%;background:%s"></div>' % (n * 100.0 / len(items), c) for nm, c, n in kinds) if items else ''
        tags = ''.join('<span style="display:inline-flex;align-items:center;gap:4px;font-size:11.5px;color:#4b5563;white-space:nowrap">'
                       '<span style="width:8px;height:8px;border-radius:50%%;background:%s"></span>%s %d</span>' % (c, nm, n) for nm, c, n in kinds)
        date = ('<span style="font-size:14px;color:#fff;background:#5f8ff0;border-radius:7px;padding:0 6px">10.%s</span>' % d
                if d == today else '<span style="font-size:14px;color:#111827">10.%s</span>' % d)
        rows += ('<div style="display:grid;grid-template-columns:64px 44px 1fr;align-items:center;gap:10px;min-height:52px;padding:8px 12px;border-radius:10px;'
                 'border:1.5px solid %s;background:%s;opacity:%s">'
                 '<span><span style="font-size:12px;color:%s;margin-right:6px">%s</span>%s</span>'
                 '<span style="font-size:12px;color:%s">%s</span>'
                 '<span style="display:flex;flex-wrap:wrap;gap:4px 12px">%s%s</span></div>'   # 색 막대 없이 점과 내용만 `PC-255`
                 % ('#5f8ff0' if on else '#eef0f4', '#f0f5fe' if on else ('#fafbfc' if future else '#fff'), '0.55' if future else '1',
                    '#e05b50' if i == 0 else ('#3d96ce' if i == 6 else '#9ca3af'), WEEK_NAMES[i], date,
                    '#374151' if items else '#c0c6d0', ('%d건' % len(items)) if items else '—',
                    '', tags))
    return ('<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:10px">'
            '<div style="font-size:15px;font-weight:700;color:#111827;padding:2px 4px 10px">2026. 10.18 (일) ~ 10.24 (토)</div>'   # 보는 기간 — 달력 위 `PC-255`
            '<div style="display:flex;flex-direction:column;gap:6px">%s</div></div>' % rows)


def month_cal(data, sel_day='22', today='22'):
    """월 보기 — 2026년 10월(9.27 ~ 11.7, 6줄). 칸에 날짜 · 건수 · 색 막대 · 색 점 `PC-252`"""
    head = ''.join('<div style="text-align:center;font-size:11px;color:%s">%s</div>' % ('#e05b50' if i == 0 else ('#3d96ce' if i == 6 else '#9ca3af'), w) for i, w in enumerate(WEEK_NAMES))
    days = [('9', d) for d in range(27, 31)] + [('10', d) for d in range(1, 32)] + [('11', d) for d in range(1, 8)]
    cells = ''
    for mo, d in days:
        key = str(d) if mo == '10' else ''
        items = data.get(key, []) if mo == '10' else []
        outside, future = mo != '10', mo == '11' or (mo == '10' and d > int(today))
        on = mo == '10' and key == sel_day
        kinds = [(nm, c, sum(1 for x in items if x[1] == nm)) for nm, c, _ in TYPES]
        kinds = [k for k in kinds if k[2]]
        bar = ''.join('<div style="width:%.1f%%;background:%s"></div>' % (n * 100.0 / len(items), c) for nm, c, n in kinds) if items else ''
        dots = ''.join('<span style="width:9px;height:9px;border-radius:50%%;background:%s"></span>' % c for nm, c, n in kinds)
        num = ('<span style="font-size:13.5px;color:#fff;background:#5f8ff0;border-radius:7px;padding:0 6px">%d</span>' % d   # 보통 굵기 `PC-254`
               if (mo == '10' and key == today) else '<span style="font-size:13.5px;color:#111827">%d</span>' % d)
        cells += ('<div style="display:flex;flex-direction:column;gap:4px;min-height:110px;padding:6px;border-radius:10px;border:1.5px solid %s;background:%s;opacity:%s">'
                  '<div style="display:flex;align-items:baseline">%s%s</div>%s<div style="display:flex;flex-wrap:wrap;gap:3px">%s</div></div>'
                  % ('#5f8ff0' if on else '#eef0f4', '#f0f5fe' if on else ('#fafbfc' if (outside or future) else '#fff'),
                     '0.45' if outside else ('0.55' if future else '1'), num,
                     ('<span style="margin-left:auto;font-size:10.5px;font-weight:600;color:#374151">%d</span>' % len(items)) if items else '',
                     ('<div style="display:flex;height:6px;border-radius:3px;overflow:hidden;background:#f1f3f7">%s</div>' % bar) if items else '', dots))
    return ('<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:10px">'
            '<div style="font-size:15px;font-weight:700;color:#111827;padding:2px 4px 10px">2026년 10월</div>'   # 보는 기간 — 달력 위 `PC-255`
            '<div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;margin-bottom:6px">%s</div>'
            '<div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px">%s</div></div>' % (head, cells))


def detail(day, items, note=''):
    if not items:
        body = '<div style="padding:40px 12px;text-align:center;color:#9ca3af;font-size:12.5px">이 날 활동이 없습니다.</div>'
    else:
        body = ''.join(
            '<div style="display:grid;grid-template-columns:44px 84px 1fr;gap:10px;align-items:start;padding:9px 12px;border-top:%s">'
            '<span style="font-family:ui-monospace,monospace;font-size:11.5px;color:#9ca3af;padding-top:2px">%s</span>'
            '<span style="font-size:11px;font-weight:700;color:#fff;background:%s;border-radius:6px;padding:2px 0;text-align:center">%s</span>'
            '<span><span style="display:block;font-size:13px;color:#111827;line-height:1.6">%s</span>'
            '<span style="display:inline-flex;align-items:center;gap:4px;font-size:11.5px;color:#6b7280">%s%s</span></span></div>'
            % ('1px solid #f4f6f9' if i else 'none', hm, COLOR[kind], kind, det, avatar(who), who)
            for i, (hm, kind, det, who) in enumerate(items))
    wk = WEEK_NAMES[WEEK_DAYS.index(day)]
    return ('<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:12px 4px 6px;min-height:230px">'
            '<div style="display:flex;align-items:baseline;gap:8px;padding:0 12px 8px;border-bottom:1px solid #eef0f4">'
            '<b style="font-size:15px;color:#111827">10월 %d일 (%s)</b><span style="font-size:12px;color:#9ca3af">%d건%s</span></div>%s</div>'
            % (int(day), wk, len(items), note, body))


def content(actor='직원 전체', kind='전체', data=None, sel_day='22', total=265, view='week'):
    data = WEEK_DATA if data is None else data
    shown = {d: [x for x in v if kind == '전체' or x[1] == kind] for d, v in data.items()}
    return ('<div style="max-width:1280px">'
            '<div style="display:flex;align-items:center;gap:10px;margin:0 0 14px">'
            '<p style="color:#6b7280;font-size:13px;margin:0;flex:1">'
            '내부 직원 활동을 <b>주 · 월 달력</b>으로 보고, 날짜를 누르면 오른쪽에 그날 활동이 나온다. 기록은 <b>한 달</b> 보관 · 전체 %d건</p>'
            '<span style="font-size:12px;padding:6px 12px;border-radius:8px;border:1px solid #fecaca;background:#fff;color:#dc2626;white-space:nowrap">전체 삭제</span></div>'
            '%s<div style="display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:16px;margin-top:14px;align-items:start">%s%s</div></div>'
            % (total, filters(actor, kind, data, view), (week_cal(shown, sel_day) if view == 'week' else month_cal(shown, sel_day)), detail(sel_day, shown.get(sel_day, []), ('' if kind == '전체' else ' · ' + kind))))


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
        'S1', '기본 · 주 달력 + 오늘 상세', '기본',
        '<b>ADMIN 전용</b> — 좌측 메뉴 [활동 로그] 또는 <code>DSH-01</code>의 [전체 로그]로 진입. '
        '<b>주 보기</b>는 날짜를 <b>행으로 7줄</b>(요일 · 날짜 | 건수 | 색 막대 + 종류 · 건수) 보이고 <code>PC-254</code>, '
        '날짜를 누르면 <b>오른쪽에 그날 활동</b>이 시간순으로 나온다 <code>PC-251</code>. 처음엔 <b>이번 주 · 오늘</b>. '
        '기록은 <b>한 달</b> 보관 <code>PC-252</code> — [&#8249;] [&#8250;]로 지난 주를 넘겨 본다. [월]을 누르면 달 단위(S6).',
        frame('LOG-01', '활동 로그', content(), height=820),
        [('[주] [월]', '클릭', '보기 전환', '고른 날이 든 주 / 달로 바뀐다 <code>PC-252</code>'),
         ('[&#8249;] [&#8250;]', '클릭', '지난 주 / 다음 주', '이번 주가 아니면 그 주 일요일을 고른다'),
         ('[이번 주]', '클릭', '이번 주 · 오늘', ''),
         ('직원 셀렉트', '선택', '해당 직원만', '달력 · 상세 · 종류 칩 건수가 함께 바뀐다'),
         ('활동 종류 칩', '클릭', 'S2 (필터 적용)', '색 점 + 라벨 + <b>이 주 기준 건수</b> · 8종 · 토글'),
         ('날짜 행', '클릭', '오른쪽 상세', '고른 날은 파란 테두리 · 오늘은 날짜에 파란 배경 · 앞날은 흐리게(고를 수 없음) · 날짜 글씨는 보통 굵기 <code>PC-254</code>'),
         ('색 막대 · 색 점', '표시', '—', '그날 활동 종류별 비율과 건수 — 색은 활동 종류 색(NEO UI 팔레트)'),
         ('상세 행', '표시', '—', '시각 44 · 종류 84 · 내용(2줄) / 직원 — 열 너비 고정 <code>PC-073</code>'),
         ('[전체 삭제]', '클릭', 'S4 확인창', '빨간 테두리 버튼 · 되돌릴 수 없음')]))

    boards.append((
        'S2', '활동 종류 필터 적용', '필터',
        '칩을 고르면 달력의 색 막대 · 색 점과 오른쪽 상세가 그 종류만 남는다. 칩 건수는 <b>이 주 · 직원 기준</b>이다.',
        frame('LOG-01', '활동 로그', content(kind='N Key', sel_day='21'), height=820),
        [('[N Key] 칩', '클릭', '해당 종류만', '활성 칩은 파란 배경'),
         ('재클릭', '클릭', '전체로 해제', '토글 동작'),
         ('상세 머리', '표시', '—', '<b>10월 21일 (화) 2건 · N Key</b>')]))

    boards.append((
        'S3', '활동이 없는 날', '빈 상태',
        '고른 날에 활동이 없으면 오른쪽 상세에 안내만 나온다. 달력 칸은 <b>—</b> 로 표시된다.',
        frame('LOG-01', '활동 로그', content(sel_day='18'), height=820),
        [('빈 상세', '표시', '—', '<b>이 날 활동이 없습니다.</b>'),
         ('보관 기간', '—', '<b>한 달</b>', '그보다 오래된 기록은 지운다 <code>PC-252</code>')]))

    boards.append((
        'S6', '월 보기', '분기',
        '[월]을 누르면 그 달 달력(앞뒤 주 포함 6줄)이 나온다 <code>PC-252</code>. 칸에는 날짜 · 건수 · 활동 종류별 색 막대 · 색 점(칸이 좁아 종류 이름 없이 점만, 마우스를 올리면 이름 · 건수). '
        '그 달 밖 날은 흐리게, 앞날은 고를 수 없다. 날짜를 누르면 오른쪽 상세는 주 보기와 같다. 종류 칩 건수는 <b>그 달 기준</b>.',
        frame('LOG-01', '활동 로그', content(view='month'), height=820),
        [('[월]', '클릭', '월 보기', '고른 날이 든 달 · 다시 [주]를 누르면 그 날이 든 주'),
         ('[&#8249;] [&#8250;]', '클릭', '지난 달 / 다음 달', '이번 달이면 오늘, 아니면 그 달 1일을 고른다'),
         ('[이번 달]', '클릭', '이번 달 · 오늘', ''),
         ('색 점', '마우스 올림', '종류 · 건수', '예: <b>App Key 7건</b>')]))

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
        frame('LOG-01', '활동 로그', content(), overlay=del_ovl, height=820),
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
             '<b>조회 전용</b>(기록은 각 화면에서 자동 생성) · 한국시간(KST) 기준 · <b>보관 한 달</b> <code>PC-252</code>. '
             '<b>주 · 월 달력</b>에 활동 종류별 색으로 그날 활동을 보이고, 날짜를 누르면 <b>오른쪽에 그날 상세</b>가 나온다 <code>PC-251</code> <code>PC-252</code>. '
             '행은 <b>고정 열</b>이라 종류 배지 길이에 목록이 흔들리지 않는다 <code>PC-073</code>. '
             '')
    return page(CODE, NAME, PRD, intro, boards)
