# -*- coding: utf-8 -*-
"""SVC-01 서비스별 고객사 — web/components/ServiceCustomersView.tsx 실제 구현 기준.

[고객사 관리]에서 **사용 서비스**로 지정한 고객사를 그 서비스 화면으로 불러오는 목록 `PC-076`.
casterN 은 [편집 프로젝트](PRJ-02)가 그 역할을 하고, 이 화면은 나머지 서비스(폼솔루션 등)를 맡는다.
"""
from shell import page, frame

CODE, NAME = 'SVC-01', '서비스별 고객사 (폼솔루션 서비스 관리)'
PRD = 'docs/prd/SVC-01_서비스별 고객사.md'

HEAD = ('고객사', '할당 좌표 (S/O)', '코드 프로젝트', '발급 규모', '')

# (고객사, [(종류, S, O)], 프로젝트 수, 발급 규모)
ROWS = (('예시 고객사 A', (('PDS3', 3, 212), ('PDS2', 3, 17)), 2, 1440),
        ('예시 고객사 B', (('PDS3', 5, 88),), 1, 320))

KIND_C = {'PDS3': ('#eef6ff', '#2563eb'), 'PDS2': ('#fef3c7', '#b45309')}


def sc(k, v, c):
    return ('<span style="display:inline-flex;align-items:center;gap:3px;border:1px solid #e5e7eb;'
            'border-radius:6px;padding:1px 5px 1px 1px;background:#fff;font-size:10.5px;'
            'margin-right:2px">'
            '<span style="background:%s;color:#fff;font-weight:700;font-size:9px;'
            'border-radius:4px;padding:1px 4px">%s</span>'
            '<span style="font-family:ui-monospace,monospace">%s</span></span>' % (c, k, v))


def kind_chip(k):
    bg, fg = KIND_C.get(k, ('#f3f4f6', '#6b7280'))
    return ('<span style="font-size:9px;font-weight:700;background:%s;color:%s;'
            'border-radius:5px;padding:1px 5px;margin-right:3px">%s</span>' % (bg, fg, k))


def linkbtn(label):
    return ('<span style="display:inline-block;font-size:11.5px;border:1px solid #e5e7eb;'
            'border-radius:7px;padding:3px 9px;background:#fff;color:#374151;'
            'margin-left:6px">%s</span>' % label)


def table(rows=ROWS, empty=False, service='폼솔루션'):
    th = ''.join('<th style="text-align:%s">%s</th>'
                 % ('left' if h in ('고객사', '할당 좌표 (S/O)') else 'center', h) for h in HEAD)
    if empty:
        body = ('<tr><td colspan="5" style="padding:30px;text-align:center;color:#9ca3af;'
                'line-height:1.8">아직 이 서비스로 지정된 고객사가 없습니다.<br>'
                '<b>고객사 관리 &#9656; 사용 서비스</b> 에서 <b>%s</b> 를 체크하면 여기에 나옵니다 '
                '<code>PC-076</code>.</td></tr>' % service)
    else:
        body = ''
        for name, sobp, nproj, codes in rows:
            coords = ''.join(kind_chip(k) + sc('S', s, '#5f8ff0') + sc('O', o, '#14b8a6')
                             + '<span style="margin-right:8px"></span>' for k, s, o in sobp)
            body += ('<tr style="border-top:1px solid #eef0f4">'
                     '<td style="font-weight:600;text-align:left">%s</td>'
                     '<td style="text-align:left">%s</td>'
                     '<td style="text-align:center">%d</td>'
                     '<td style="text-align:center;font-family:ui-monospace,monospace">%s</td>'
                     '<td style="text-align:right;white-space:nowrap">%s%s</td></tr>'
                     % (name, coords, nproj, format(codes, ','),
                        linkbtn('코드 프로젝트'), linkbtn('SOBP 맵')))
    return ('<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;'
            'overflow:hidden"><table style="width:100%%;border-collapse:collapse;font-size:12.5px">'
            '<thead><tr style="background:#fafbfc;color:#6b7280;font-size:11.5px">%s</tr></thead>'
            '<tbody>%s</tbody></table></div>' % (th, body))


def content(empty=False, service='폼솔루션', n=2):
    head = ('<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;'
            'flex-wrap:wrap">'
            '<b style="font-size:15px">%s · 고객사</b>'
            '<span style="font-size:11px;font-weight:700;background:#eef6ff;color:#2563eb;'
            'border-radius:6px;padding:2px 8px">%d곳</span>'
            '<span style="font-size:11.5px;color:#9ca3af">고객사 관리에서 '
            '<b>사용 서비스 = %s</b> 로 지정한 고객사입니다</span></div>'
            % (service, 0 if empty else n, service))
    return '<div style="padding:2px">%s%s</div>' % (head, table(empty=empty, service=service))


def build():
    B = []

    B.append((
        'S1', '기본 — 서비스별 고객사 목록', '기본',
        '좌측 메뉴 <b>[폼솔루션 서비스 관리]</b> 로 진입한다(<code>/services/{key}</code>). '
        '<b>[고객사 관리]에서 사용 서비스로 지정한 고객사</b>만 모아 보여 준다 <code>PC-076</code> — '
        '이전에는 SOBP 맵의 좌표별 지정을 기준으로 삼았다 <code>PC-057</code>. '
        '<b>조회 전용</b>이며 여기서 고객사를 추가하거나 서비스를 바꾸지 않는다.',
        frame(CODE, '폼솔루션 서비스 관리', content(), height=520),
        [('고객사', '—', '—', '사용 서비스에 이 서비스가 체크된 고객사 · <b>가나다순</b>'),
         ('할당 좌표 (S/O)', '—', '—', '그 고객사가 가진 좌표 · 코드 종류 배지 + S · O 칩 · <b>최대 6건</b> 뒤는 <b>외 {n}건</b>'),
         ('코드 프로젝트', '—', '—', '그 고객사의 코드 프로젝트 건수'),
         ('발급 규모', '—', '—', '발급 코드 수 합계'),
         ('[코드 프로젝트]', '클릭', '<code>PRJ-01</code>', '그 고객사로 검색된 목록으로 이동'),
         ('[SOBP 맵]', '클릭', '<code>SOB-01</code>', '좌표 지도로 이동'),
         ('사용 서비스 변경', '—', '<code>MEM-02</code>', '이 화면에서는 바꾸지 않는다 <code>PC-076</code>')]))

    B.append((
        'S2', '지정된 고객사 없음', '빈 상태',
        '폼솔루션은 <b>서비스 개발 전</b>이라 현재 지정된 고객사가 <b>0곳</b>이다. '
        '어디서 지정하는지 그 자리에서 알려 준다.',
        frame(CODE, '폼솔루션 서비스 관리', content(empty=True), height=420),
        [('빈 카드', '표시', '—', '<b>아직 이 서비스로 지정된 고객사가 없습니다.</b>'),
         ('보조 안내', '표시', '<code>MEM-02</code>',
          '<b>고객사 관리 &#9656; 사용 서비스</b> 에서 <b>폼솔루션</b> 을 체크하면 여기에 나옵니다'),
         ('건수', '자동', '<b>0곳</b>', '')]))

    B.append((
        'S3', 'casterN 은 이 화면을 쓰지 않는다', '분기',
        'casterN 으로 지정된 고객사는 이 목록이 아니라 <b>[편집 프로젝트](<code>PRJ-02</code>)</b> '
        '에서 다룬다 — 편집량·정산까지 함께 봐야 하기 때문이다. '
        '이 화면은 <b>편집 외 서비스</b>(폼솔루션 등)를 맡는다.',
        frame(CODE, '폼솔루션 서비스 관리', content(), height=520),
        [('casterN 고객사', '—', '<code>PRJ-02</code>', '편집 프로젝트 목록에서 본다 (70곳)'),
         ('폼솔루션 고객사', '—', '이 화면', '현재 0곳'),
         ('아무 서비스도 없음', '—', '<b>어느 화면에도 안 나온다</b>',
          'SDK 연동(코드만 할당) — 코드만 받아 직접 연동하는 고객사 <code>PC-076</code>')]))

    intro = ('<b>고객사 관리에서 지정한 사용 서비스</b>를 기준으로, 그 서비스가 쓰는 고객사를 모아 보는 '
             '<b>조회 전용</b> 목록 <code>PC-076</code>. '
             'casterN 은 <code>PRJ-02</code> 편집 프로젝트가 그 역할을 하므로, 이 화면은 '
             '<b>폼솔루션 등 나머지 서비스</b>를 맡는다. '
             '폼솔루션은 서비스 개발 전이라 현재 <b>0곳</b>이며 화면은 빈 상태(S2)로 열린다. '
             '고객사를 추가하거나 서비스를 바꾸는 일은 <b>여기서 하지 않는다</b> — '
             '<code>MEM-02</code> 고객사 등록·수정에서 한다.')
    return page(CODE, NAME, PRD, intro, B)
