# -*- coding: utf-8 -*-
"""INF-04 OID 관리대장 — 실제 화면 구조 그대로.

OID = index 만 갖는 코드(외부 코드를 우리 펜으로 읽기 위한 방식).
SOBP(PDS2·PDS3·PDS4) 좌표 관리와 분리해 **업체 + index** 로 관리하고, 기존 좌표는 메모로만 남긴다.
화면은 별도 메뉴가 아니라 **코드 관리 정보(INF-01)의 탭**으로 들어간다 (PC-034).
탭 바 → 개념 안내 배너 → 요약 4칸 → 필터 → 업체 목록(좌 300px) + 항목 표(우).
"""
from shell import page, frame
from p_inf01 import tabs

CODE, NAME = 'INF-04', 'OID 관리대장'
PRD = 'docs/prd/INF-04_OID 관리대장.md'
TEAL = '#0f766e'

# web/data/oid-data.json — (업체, index관리, 건수, 좌표메모)
COMPANIES = (
    ('웅진씽크빅-17', 'book', 35, 'S3/O17 · B431~464', '431~464'),
    ('잉글리시에그-18', 'none', 22, 'S3/O18 · book 미분할', '미분할 (업체 단위)'),
    ('Common-21', 'book', 18, 'S3/O21 · B195~235', '195~235'),
    ('헤르만헤세-15', 'none', 5, 'S3/O15 · book 미분할', '미분할 (업체 단위)'),
    ('수하임-1021', 'none', 3, 'S3/O1021 · book 미분할', '미분할 (업체 단위)'),
    ('한솔교육-25', 'none', 2, 'S3/O25 · book 미분할', '미분할 (업체 단위)'),
    ('FUA-33', 'none', 1, 'S3/O33 · book 미분할', '미분할 (업체 단위)'),
    ('Cake-1009', 'none', 1, 'S3/O1009 · book 미분할', '미분할 (업체 단위)'),
)
ITEMS_WJ = (('431', '범블비 잉글리시 전집 OID 1권', '', '', ''),
            ('432', '범블비 잉글리시 전집 OID 2권', '', '', ''),
            ('433', '범블비 잉글리시 전집 OID 3권', '', '', ''),
            ('434', '범블비 잉글리시 전집 OID 4권', '', '', ''))
ITEMS_HS = (('—', 'Ready Readers Book', '', '', ''),
            ('—', '신기한 영어나라', '', '', ''))
ITEMS_CM = (('195', '키즈스콜레 11월 제공분', '2p', '2021-11-26', 'LG U+'),
            ('198', '에그스쿨 22년 1월호', '2p', '2021-12-20', 'LG U+'),
            ('199', '키즈스콜레 11월 추가분, 12월, 1월 편성분', '2p', '2021-12-23', 'LG U+'))


def tag(text, bg, fg, fs='9.5px'):
    return ('<span style="font-size:%s;background:%s;color:%s;border-radius:5px;'
            'padding:2px 7px;font-weight:700;white-space:nowrap">%s</span>'
            % (fs, bg, fg, text))


def pen_chip():
    return tag('소리펜', '#ffedd5', '#9a3412')


def chip(label, on):
    return ('<span style="font-size:12px;border-radius:7px;padding:5px 10px;'
            'border:1px solid %s;background:%s;color:%s;%s">%s</span>'
            % ('#5eead4' if on else '#e5e7eb', '#f0fdfa' if on else '#fff',
               TEAL if on else '#6b7280', 'font-weight:700' if on else '', label))


def banner():
    return ('<div class="card" style="padding:12px 14px;background:#f0fdfa;'
            'border:1px solid #99f6e4;margin-bottom:12px;font-size:12.5px;color:#115e59;'
            'line-height:1.9">'
            '<div><b>OID = index 만 갖는 코드</b> — 외부 코드를 <b>우리 펜으로 읽으려고</b> '
            '만든 방식입니다. OID 책을 우리 펜으로 찍으면 <b>코드 값이 1개만</b> 나옵니다.</div>'
            '<div>총량이 <b>약 60,000개</b>뿐이라 책의 양이 많지 않으면 '
            '<b>book 으로 코드를 나누지 않습니다</b>. 업체 구분에는 S/O 를 써 왔고, '
            '분량이 늘어난 업체만 <b>book 번호(=OID index)</b> 로 나눠 관리했습니다.</div>'
            '<div>이 화면은 그 이력을 <b>업체 + index</b> 로 모아 봅니다. 좌표로 보려면 '
            '<b>SOBP 맵에서 종류 [OID]</b> 로 필터하세요. (옛 <b>IDS</b> 표기도 같은 것입니다)'
            '</div></div>')


def kpis():
    cards = ''
    for k, v, c in (('관리 업체', '8', '#111827'), ('대장 항목', '87', TEAL),
                    ('사용 index', '58', '#2563eb'), ('OID 총량(약)', '60,000', '#6b7280')):
        cards += ('<div class="card" style="padding:10px 12px">'
                  '<div style="font-size:11px;color:#6b7280">' + k + '</div>'
                  '<div style="font-size:17px;font-weight:700;color:' + c + '">' + v
                  + '</div></div>')
    return ('<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;'
            'margin-bottom:12px">' + cards + '</div>')


def bar(fidx='전체', q='', n=8):
    srch = ('<div class="inp' + ('' if q else ' ph') + '" style="width:240px;margin-left:auto">'
            + (q or '업체 · 교재 · index 검색') + '</div>')
    chips = ''.join(chip(l, l == fidx) for l in ('전체', 'index 관리(book)', '미분할(업체 단위)'))
    return ('<div class="card" style="padding:10px 12px;margin-bottom:10px;display:flex;'
            'gap:8px;align-items:center;flex-wrap:wrap;font-size:12.5px">'
            '<b style="font-size:13px">OID 관리대장</b>'
            '<div style="display:flex;gap:4px">' + chips + '</div>' + srch
            + '<span style="color:#9ca3af">' + str(n) + '업체</span></div>')


def company_col(sel='웅진씽크빅-17', rows=None):
    out = ''
    for name, idxby, cnt, memo, rng in (COMPANIES if rows is None else rows):
        on = (name == sel)
        out += ('<div style="border:1px solid %s;border-left:3px solid %s;background:%s;'
                'border-radius:9px;padding:10px 12px;margin-bottom:6px">'
                '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">'
                '<b style="font-size:13px;color:%s">%s</b>%s%s</div>'
                '<div style="font-size:10.5px;color:#6b7280;margin-top:3px">%d건 · index %s</div>'
                '<div style="font-size:10px;color:#9ca3af;margin-top:2px">📝 %s</div></div>'
                % (TEAL if on else '#eef0f4', TEAL if on else 'transparent',
                   '#f0fdfa' if on else '#fff', TEAL if on else '#111827', name,
                   pen_chip(),
                   tag('index 관리' if idxby == 'book' else '미분할',
                       '#ccfbf1' if idxby == 'book' else '#f3f4f6',
                       TEAL if idxby == 'book' else '#9ca3af'),
                   cnt, rng, memo))
    if not out:
        out = ('<div style="font-size:12px;color:#9ca3af;padding:12px;text-align:center">'
               '조건에 맞는 업체가 없습니다.</div>')
    return ('<div class="card" style="padding:8px">'
            '<div style="font-size:11px;color:#9ca3af;font-weight:700;padding:2px 4px 6px">'
            '업체 (관리 단위)</div>' + out + '</div>')


def item_table(name='웅진씽크빅-17', idxby='book', rng='431~464', cnt=35, memo='S3/O17 · B431~464',
               items=ITEMS_WJ, empty=False, note=False):
    head = ('<div class="card" style="padding:12px 14px;margin-bottom:10px;font-size:12.5px;'
            'color:#374151;display:flex;gap:10px;flex-wrap:wrap;align-items:center">'
            '<b style="font-size:14px">' + name + '</b>' + pen_chip()
            + tag('index ' + rng if idxby == 'book' else 'book 미분할 (업체 단위 관리)',
                  '#ccfbf1', TEAL, '11px')
            + '<span style="color:#9ca3af">' + str(cnt) + '건</span>'
            '<span style="flex:1"></span>'
            '<span style="font-size:11.5px;color:#6b7280">📝 좌표: <b>' + memo
            + '</b></span></div>')
    th = ''.join('<th>' + h + '</th>'
                 for h in ('index', '교재 · 프로젝트', '페이지', '발급일', '사용 고객사'))
    body = ''
    if empty:
        body = ('<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:26px">'
                '검색 결과가 없습니다.</td></tr>')
    for idx, title, pg, d, cu in items:
        body += ('<tr><td style="font-family:ui-monospace,monospace;font-weight:700;color:%s">'
                 '%s</td><td style="text-align:left">%s</td><td style="color:#6b7280">%s</td>'
                 '<td style="font-family:ui-monospace,monospace;color:#6b7280">%s</td>'
                 '<td style="color:#6b7280">%s</td></tr>'
                 % (TEAL if idx != '—' else '#d1d5db', idx, title, pg or '—', d or '—', cu or '—'))
    tail = ''
    if note:
        tail = ('<div style="margin-top:8px;font-size:11.5px;color:#6b7280;line-height:1.7">'
                '※ 이 업체는 분량이 적어 <b>book 으로 나누지 않고</b> 업체 단위(S/O)로만 '
                '관리해 왔습니다. index 칸이 비어 있는 것은 정상입니다.</div>')
    return (head + '<div class="card" style="padding:0;overflow:auto">'
            '<table style="text-align:center;min-width:720px"><tr>' + th + '</tr>'
            + body + '</table></div>' + tail)


def content(sel='웅진씽크빅-17', fidx='전체', q='', rows=None, n=8, **kw):
    # Ncode 정보(INF-01) 4번째 탭 안에서 열린다
    return ('<div style="min-width:0">' + tabs(3) + banner() + kpis() + bar(fidx, q, n)
            + '<div style="display:grid;grid-template-columns:300px 1fr;gap:12px;'
              'align-items:start">' + company_col(sel, rows) + '<div style="min-width:0">'
            + item_table(**kw) + '</div></div></div>')


def scr(h=1180, **kw):
    return frame('INF-01', 'Ncode 정보', content(**kw), height=h)


NAV = [('탭 [발급 구조]', '클릭', '<code>INF-01</code>', 'OID 개념 설명'),
       ('사이드바 [SOBP 맵]', '클릭', '<code>SOB-01</code>', 'PDS2·PDS3·PDS4 좌표 지도')]


def build():
    B = []

    B.append((
        'S1', '기본 — index 관리 업체', '기본',
        '<b>Ncode 정보</b>(<code>/info</code>)의 <b>[OID 관리대장] 탭</b>이다 — 별도 메뉴로 두지 않는다 '
        '<code>PC-034</code>. 맨 위 안내에 OID 개념이 '
        '고정으로 붙는다 — <b>index 만 갖는 코드</b>, 펜으로 찍으면 <b>코드 1개만</b>, '
        '총량 <b>약 6만 개</b>, 분량이 적으면 <b>book 미분할</b> <code>PC-033</code>.<br>'
        '왼쪽은 <b>업체(관리 단위)</b>, 오른쪽은 그 업체의 <b>index + 교재</b> 표다. '
        '기존 SOBP 좌표는 <b>📝 메모</b>로만 표시한다.',
        scr(),
        [('업체 카드', '클릭', '오른쪽 표 갱신', '<b>업체 + index</b> 가 관리 단위'),
         ('index 칸', '표시', '—', 'book 번호가 곧 <b>OID index</b> (예: 431~464)'),
         ('📝 좌표', '표시', '—',
          '이 업체 OID 이력의 좌표(S/O·Book) — 좌표 지도는 <code>SOB-01</code> 종류 [OID]'),
         ('용어', '—', '통합', '옛 <b>IDS(A코드)</b> = <b>OID</b> 동일 <code>PC-035</code>'),
         ('요약 4칸', '표시', '—', '관리 업체 · 대장 항목 · 사용 index · OID 총량(약 6만)'),
         ('펜 배지', '표시', '—', '원장 출처(소리펜 NSP · 필기펜 NWP)')] + NAV))

    B.append((
        'S2', 'book 미분할 업체', '분기',
        '분량이 적어 <b>book 으로 나누지 않은</b> 업체. 업체(S/O) 단위로만 관리하므로 '
        'index 칸이 <b>—</b> 로 비어 있고, 표 아래에 그 이유가 안내로 붙는다. '
        '한솔교육이 이 방식이다.',
        scr(h=900, sel='한솔교육-25',
            name='한솔교육-25', idxby='none', rng='미분할 (업체 단위)', cnt=2,
            memo='S3/O25 · book 미분할', items=ITEMS_HS, note=True),
        [('index 칸', '표시', '—', '<b>—</b> (미분할) · 정상 상태'),
         ('안내 문구', '표시', '—',
          '<b>분량이 적어 book 으로 나누지 않고 업체 단위(S/O)로만 관리해 왔습니다.</b>'),
         ('업체 배지', '표시', '—', '<b>미분할</b> (회색)')] + NAV))

    B.append((
        'S3', '필터 · 검색', '분기',
        '<b>index 관리(book)</b> / <b>미분할(업체 단위)</b> 로 업체를 좁히고, '
        '검색은 <b>업체 · 교재 · index</b> 를 함께 본다.',
        scr(h=900, fidx='index 관리(book)', q='키즈스콜레', n=2,
            rows=[c for c in COMPANIES if c[1] == 'book'], sel='Common-21',
            name='Common-21', idxby='book', rng='195~235', cnt=18,
            memo='S3/O21 · B195~235', items=ITEMS_CM),
        [('index 관리(book)', '클릭', '해당 업체만', '웅진 · Common 처럼 book 으로 나눈 업체'),
         ('미분할(업체 단위)', '클릭', '해당 업체만', '한솔 · 잉글리시에그 등'),
         ('검색', '입력', '업체·항목 동시 필터', '업체 목록과 오른쪽 표에 함께 적용'),
         ('사용 고객사', '표시', '—', '공유(커먼) 코드에서 실제 사용 고객사(예: LG U+)')] + NAV))

    B.append((
        'S4', '검색 결과 없음', '차단',
        '조건에 맞는 항목이 없을 때. 업체 목록이 비면 왼쪽에도 안내가 나온다.',
        scr(h=820, fidx='전체', q='존재하지 않는 교재', n=0, rows=[],
            name='웅진씽크빅-17', items=(), empty=True),
        [('오른쪽 표', '표시', '—', '<b>검색 결과가 없습니다.</b>'),
         ('업체 목록', '표시', '—', '<b>조건에 맞는 업체가 없습니다.</b>'),
         ('검색어 지우기', '입력', 'S1', '전체 목록으로 복귀')] + NAV))

    intro = ('<b>OID 관리대장</b> — OID 는 <b>index 만 갖는 코드</b>로, 외부 코드를 '
             '<b>우리 펜으로 읽으려고</b> 만든 방식이다. 펜으로 찍으면 코드 값이 '
             '<b>1개만</b> 나오고, 총량이 <b>약 6만 개</b>뿐이라 분량이 적으면 '
             '<b>book 으로 나누지 않는다</b>.<br>'
             '대장은 업체 구분에 S/O 를 써 왔고 분량이 늘어난 업체만 book 번호로 나눴는데, '
             '그 <b>book 번호가 곧 OID index</b> 로 보인다. 그래서 이 화면은 '
             '<b>업체 + index</b> 로 모아 본다. 좌표 기준 조회는 <code>SOB-01</code> 의 '
             '종류 <b>[OID]</b> 필터로 한다 <code>PC-035</code>. '
             '(옛 <b>IDS</b>(A코드) 표기 = OID 동일)')
    return page(CODE, NAME, PRD, intro, B)
