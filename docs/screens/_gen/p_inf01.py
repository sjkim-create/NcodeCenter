# -*- coding: utf-8 -*-
"""INF-01 코드 관리 정보 — web/components/InfoView.tsx (+ LangSlotView · NcodeInfoView · NcodeGuideView) 기준"""
from shell import page, frame

CODE, NAME = 'INF-01', '코드 관리 정보'
PRD = 'docs/prd/INF-01_코드 관리 정보.md'

# [OID 관리대장] · [펜 모델] 탭은 폐지 `PC-325` — OID 설명은 [티켓 정보] 탭 카드로, 펜 모델은 데이터 직접 관리
TABS = ('Code Info', '확장 언어 슬롯', '발급 구조', '티켓 정보', '알아야 할 사항')   # 티켓 정보 `PC-246`
KEYS = ('owner', 'bookcode', 'page', 'length')
KEYS4 = ('owner', 'bookcode', 'page', 'xy')   # PDS4(S-code)는 length 대신 xy `PC-042`

# InfoView.tsx SECTIONS — Section 0·3·5·10·11·14·15 + 44(PDS4)  (s, pds2, pds3, pds4)
SECTIONS = (
    (0, ('0~524,287', '0~8191', '0~1023', '600mm'), ('0~1023', '0~16383', '0~4095', '600mm'), None),
    (3, ('0~4095', '0~4095', '0~4095', '1500mm'), ('0~1023', '0~8191', '0~511', '2000mm'), None),
    (5, None, ('0~255', '0~4095', '0~4095', '1200mm'), None),
    (10, None, ('0~1023', '0~4095', '0~1023', '2427mm'), None),
    (11, None, ('0~1023', '0~8191', '0~511', '2000mm'), None),
    (14, ('0~4095', '0~4095', '0~1023', '9000mm'), ('0~1023', '0~8191', '0~31', '9000mm'), None),
    (15, None, ('0~32767', '0~4095', '0~511', '608mm'), None),
    (44, None, None, ('0~4095', '0~255', '0~255', '0~255')),   # PDS4 (S-code) `PC-042`
)

# LangSlotView.tsx — 고객사 관리 ▸ 공통코드 · 확장 언어 의 **그룹**을 보기 전용으로 `PC-330`
# (web/lib/langGroups.ts SEED · 그룹마다 기본 Owner + 확장 Owner, Owner 당 4슬롯)
GROUP_COLORS = ('#2563eb', '#db2777', '#0e7490', '#7c3aed', '#d97706')
GROUPS = (
    {'label': 'Common-21', 'kind': 'PDS2', 'section': 3, 'base': 21, 'langCount': 10,
     'ext': list(range(964, 984)),
     'langs': {21: ['한국어', '영어', '중국어', '일본어'],
               964: ['베트남어', '러시아어', '몽골어', '캄보디아어(크메르어)'],
               965: ['스리랑카어', '필리핀어(따갈로그어)']}},
    {'label': 'Cake-1009', 'kind': 'PDS3', 'section': 3, 'base': 1009, 'langCount': 8,
     'ext': list(range(1003, 983, -1)),
     'langs': {1009: ['한국어', '영어', '일본어', '스페인어'],
               1003: ['BTS', '중국어', '인도네시아어', '러시아어']}},
)
# 할당 전 자리 예시 — 고객사 관리에서 그룹을 켜고 언어만 미리 넣은 상태(아직 SOBP 할당 전) `PC-334`
NEW_GROUP = {'label': '신규 고객사(예시)', 'kind': 'PDS3', 'section': None, 'base': None, 'langCount': 8,
             'ext': [], 'langs': {'#0': ['한국어', '영어', '중국어', '일본어'], '#1': ['프랑스어', '독일어']}}


def tabs(active=0):
    out = ''
    for i, t in enumerate(TABS):
        on = (i == active)
        out += ('<span style="padding:10px 16px;font-size:13.5px;'
                'border-bottom:2px solid %s;margin-bottom:-1px;color:%s;font-weight:%s">%s</span>'
                % ('#2563eb' if on else 'transparent', '#2563eb' if on else '#6b7280',
                   '700' if on else '400', t))
    return ('<div style="display:flex;gap:4px;border-bottom:1px solid #e5e7eb;'
            'margin-bottom:18px">%s</div>' % out)


def range_table():
    hdr = ('text-align:center;padding:9px 12px;background:#eef0f4;color:#374151;'
           'font-weight:700;font-size:12px;border-bottom:1px solid #e5e7eb')
    keyc = 'padding:6px 12px;color:#6b7280;width:90px;border-top:1px solid #f1f3f6'
    valc = ('padding:6px 12px;font-family:ui-monospace,monospace;color:#111827;'
            'border-top:1px solid #f1f3f6')
    body = ''
    for s, pds2, pds3, pds4 in SECTIONS:
        bg = '#fafbfc' if s % 2 else '#fff'
        for ri, k in enumerate(KEYS):
            top = 'border-top:2px solid #e5e7eb;' if ri == 0 else ''
            secc = ('<td rowspan="4" style="text-align:center;font-weight:700;font-size:15px;'
                    'border-right:1px solid #eef0f4;background:#f6f8fb">%d</td>' % s) if ri == 0 else ''
            body += ('<tr style="background:%s;%s">%s'
                     '<td style="%s">%s</td><td style="%s">%s</td>'
                     '<td style="%s;border-left:1px solid #eef0f4">%s</td><td style="%s">%s</td>'
                     '<td style="%s;border-left:1px solid #eef0f4">%s</td><td style="%s">%s</td></tr>'
                     % (bg, top, secc, keyc, k, valc, pds2[ri] if pds2 else '—',
                        keyc, k, valc, pds3[ri] if pds3 else '—',
                        keyc, KEYS4[ri], valc, pds4[ri] if pds4 else '—'))
    return ('<div style="max-width:1100px">'
            '<p style="margin:0 0 12px;color:#6b7280;font-size:13px">'
            'SECTION별 코드 발급 범위. (owner · bookcode · page · length) — '
            '<b>PDS4(S-code)</b> 는 length 대신 <b>xy</b> 를 씁니다.</p>'
            '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;'
            'padding:0;overflow:auto">'
            '<table style="width:100%%;border-collapse:collapse;font-size:13px">'
            '<thead><tr><th style="%s;width:90px">SECTION</th>'
            '<th style="%s" colspan="2">PDS2 (G3C6)</th>'
            '<th style="%s" colspan="2">PDS3 (N3C6)</th>'
            '<th style="%s" colspan="2">PDS4 (S-code)</th></tr></thead>'
            '<tbody>%s</tbody></table></div>'
            '<div style="margin-top:14px;border:1px solid #bfdbfe;background:#eff6ff;'
            'border-radius:10px;padding:14px 16px;font-size:12.5px;color:#1e3a8a;line-height:1.9">'
            '<div style="font-weight:700;margin-bottom:6px">length(판형)의 의미</div>'
            '<ul style="margin:0;padding-left:18px">'
            '<li>length는 <b>코드를 입힐 수 있는 최대 크기(판형)</b>를 나타냅니다. (length ≒ 판형 크기)</li>'
            '<li>신규 프로젝트 시작 시 <b>향후 발매 예정 콘텐츠의 판형까지 고려</b>해 큰 사이즈가 필요하면, '
            '그에 맞는 <b>섹션·오너를 발행</b>해 드립니다.</li>'
            '<li>초반에 작은 판형만 쓰다가 이후 <b>큰 판형 교구에 코드 적용</b>이 필요해지면, '
            '<b>신규 섹션의 코드를 발행</b>해 펌웨어 혹은 서비스 프로그램에 추가하여 작업합니다.</li>'
            '<li>따라서 <b>최대 적용 크기(판형=length)와 페이지 수를 모두 고려</b>해야 하며, '
            '<b>판형 크기에 따라 섹션이 달라집니다.</b></li></ul>'
            '<div style="margin-top:8px;color:#6b7280">'
            '※ Section 1은 테스트/개발 전용(상용 미출시).<br>'
            '※ <b>Section 44 = PDS4(S-code)</b> — owner 0~4095 · bookcode 0~255 · page 0~255 · '
            '<b>xy 0~255</b> 로 관리합니다 <code>PC-042</code>. PDS4 는 판형(length) 대신 <b>xy</b> 값을 '
            '가지므로 표의 마지막 행이 xy 입니다.</div></div></div>'
            % (hdr, hdr, hdr, hdr, body))


def need_ext(n):
    return max(0, -(-max(0, n) // 4) - 1)


def lang_rows(g):
    """langGroups.ts langRows — 필요한 Owner 수(기본 1 + 필요 확장)만큼, 할당 전 자리도 줄로 `PC-334`"""
    n = max(need_ext(g['langCount']), len(g['ext'])) + 1
    out = []
    for pos in range(n):
        owner = g['base'] if pos == 0 else (g['ext'][pos - 1] if pos - 1 < len(g['ext']) else None)
        key = owner if owner is not None else '#%d' % pos
        out.append((pos, owner, key, pos * 4 + 1))
    return out


def owner_cards(g, color):
    out = ''
    for pos, owner, key, start in lang_rows(g):
        base = (pos == 0)
        langs = g['langs'].get(key, [])
        slots = ''
        for i in range(4):
            lang = (langs[i] if i < len(langs) else '').strip()
            slots += ('<div style="display:flex;gap:6px;font-size:11.5px;padding:2px 0;'
                      'align-items:baseline">'
                      '<span style="color:#9ca3af;font-family:ui-monospace,monospace;'
                      'min-width:18px;text-align:right">%d</span>'
                      '<span style="color:%s">%s</span></div>'
                      % (start + i, '#111827' if lang else '#94a3b8', lang or '사용가능'))
        tag = ('<span style="font-size:9px;background:%s;color:#fff;font-weight:700;'
               'border-radius:5px;padding:2px 7px">기본</span>' % color) if base else ''
        title = 'O%d' % owner if owner is not None else '할당 전'
        tcol = '#9ca3af' if owner is None else (color if base else '#111827')
        out += ('<div style="border:1px %s #e5e7eb;border-radius:10px;overflow:hidden;'
                'background:#fff">'
                '<div style="display:flex;align-items:center;gap:6px;padding:6px 8px;'
                'border-bottom:1px solid #eef0f4;background:%s">'
                '<b style="font-family:ui-monospace,monospace;font-size:12.5px;color:%s">%s</b>%s'
                '<span style="margin-left:auto;font-size:10px;color:#9ca3af">슬롯 %d~%d</span></div>'
                '<div style="padding:4px 8px 6px">%s</div></div>'
                % ('dashed' if owner is None else 'solid', '#eef6ff' if base else '#fafbfc',
                   tcol, title, tag, start, start + 3, slots))
    return out


def group_section(g, color):
    ext = ('O%d~O%d (%d개)' % (min(g['ext']), max(g['ext']), len(g['ext']))) if g['ext'] else '없음'
    meta = ('%s · Section %s · 기본 %s · 확장 %s · 필요 언어 %d개 · 오너당 4슬롯'
            % (g['kind'], g['section'] if g['section'] is not None else '미정',
               'O%d' % g['base'] if g['base'] is not None else '미정', ext, g['langCount']))
    return ('<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;'
            'padding:16px;margin-bottom:16px">'
            '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px">'
            '<span style="background:%s;color:#fff;font-weight:700;border-radius:6px;'
            'padding:3px 10px;font-size:12.5px">%s</span>'
            '<b style="font-size:14px">확장 언어 슬롯</b>'
            '<span style="color:#6b7280;font-size:12px">%s</span></div>'
            '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));'
            'gap:8px">%s</div></div>'
            % (color, g['label'], meta, owner_cards(g, color)))


def lang_slots(flt='all', groups=GROUPS):
    pills = ''
    for i, (v, lab) in enumerate([('all', '전체')] + [(g['label'], g['label']) for g in groups]):
        on = (v == flt)
        c = '#374151' if v == 'all' else GROUP_COLORS[(i - 1) % len(GROUP_COLORS)]
        pills += ('<span style="border:1px solid %s;background:%s;color:%s;border-radius:8px;'
                  'padding:5px 12px;font-size:12.5px;font-weight:700">%s</span>'
                  % (c if on else '#e5e7eb', c if on else '#fff', '#fff' if on else '#6b7280', lab))
    secs = ''
    for i, g in enumerate(groups):
        if flt == 'all' or flt == g['label']:
            secs += group_section(g, GROUP_COLORS[i % len(GROUP_COLORS)])
    link = '<span style="color:#2563eb;text-decoration:underline">%s</span>'
    return ('<div><p style="margin:0 0 12px;color:#6b7280;font-size:13px;line-height:1.7">'
            '확장 언어 슬롯 — 기본 Owner 에서 언어가 늘면 그룹에 연결된 확장 Owner 의 슬롯을 씁니다. '
            'Owner 하나에 4슬롯.<br>그룹 · 언어는 %s ▸ 공통코드 · 확장 언어 에서, '
            'Owner 연결은 %s 할당 창에서 합니다.</p>'
            '<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">%s</div>%s</div>'
            % (link % '고객사 관리', link % 'SOBP 맵', pills, secs))


def sect(title, inner, num=None):
    n = (('<span style="background:#5f8ff0;color:#fff;border-radius:6px;width:22px;height:22px;'
          'display:inline-grid;place-items:center;font-size:12px">%s</span>' % num)
         if num else '')
    return ('<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;'
            'padding:16px;margin-bottom:16px">'
            '<div style="font-weight:700;font-size:14px;margin-bottom:12px;display:flex;'
            'align-items:center;gap:8px">%s%s</div>%s</div>' % (n, title, inner))


def mini_table(headers, rows):
    th = ''.join('<th style="text-align:left;padding:10px 12px;color:#6b7280;font-weight:600;'
                 'background:#fafbfc;font-size:11.5px">%s</th>' % h for h in headers)
    tr = ''.join('<tr>%s</tr>' % ''.join(
        '<td style="padding:10px 12px;%s">%s</td>' % (st, v) for v, st in row) for row in rows)
    return ('<table style="width:100%%;border-collapse:collapse;font-size:12.5px">'
            '<thead><tr>%s</tr></thead><tbody>%s</tbody></table>' % (th, tr))


def issue_struct_more():
    """발급 구조 — 이어지는 아래쪽(S9): 펜 구분 · 편집 산출물 / 오너코드 발급 구조(예시) /
    티켓 발급 구조 — N Key vs App Key / Section 1 · 44 안내 (web/components/NcodeInfoView.tsx 순서 그대로)"""
    mono = 'font-family:ui-monospace,monospace'
    sm = mono + ';font-size:11.5px'
    pen = mini_table(['펜', '구분', '편집 산출물', '저장 위치'], [
        [('소리펜', 'font-weight:700'), ('Ncp', mono), ('<b>ncp2</b> (좌표 + mp3 묶음)', ''), ('디바이스(소리펜)에 저장 · 넣어야 동작', '')],
        [('필기펜', 'font-weight:700'), ('Ndp', mono), ('<b>nproj</b> + PDF + JPG + 썸네일 png', ''), ('서버에 등록 (mp3 리소스는 디바이스)', '')]])
    own = mini_table(['Section', 'Owner', 'ACCOUNT', 'Book 범위', 'Page', 'X', 'Y'], [
        [(s, ''), (o, ''), (a, ''), (b, sm), (p, sm), (x, sm), (y, sm)] for s, o, a, b, p, x, y in (
            ('0', '1', 'neoa', '0~999 (1,000권)', '0~1023', '0~255', '0~255'),
            ('1', '1', 'neolab', '0~4,194,303 (4.19M권)', '0~255', '0~255', '0~255'),
            ('14', '1', 'FisherPrice(임시)', '0~4,095 (4,096권)', '0~4,095', '0~1023', '0~1023'),
            ('3', '4', 'planning', '0~16,383 (16,384권)', '0~4,095', '0~1023', '0~1023'),
            ('5', '5', 'Kyeowon', '0~199 (200권)', '0~255', '0~255', '0~255'))]) + (
        '<p style="font-size:12px;color:#9ca3af;margin:8px 0 0">Section·Owner에 따라 Book/Page/X/Y 최대 차원이 다릅니다. '
        '페이지 1장이 2.3m 이하면 overflow 없이 페이지 수만으로 발급 규모를 산정합니다.</p>')
    card = lambda top, chip_, d, c: (
        '<div style="flex:1 1 230px;border:1px solid #eef0f4;border-radius:10px;padding:12px">'
        '<div style="font-size:12px;color:#6b7280">%s</div>'
        '<span style="display:inline-block;margin-top:5px;background:%s;color:#fff;font-weight:700;border-radius:6px;padding:2px 8px;font-size:12px">%s</span>'
        '<div style="font-size:11.5px;color:#9ca3af;margin-top:5px;line-height:1.6">%s</div></div>' % (top, c, chip_, d))
    uses = ''.join(card(*u) for u in (
        ('오프라인 편집툴', 'N Key', '계정 불필요 · 티켓 파일만 있으면 사용', '#14b8a6'),
        ('온라인(웹) 편집툴', '계정 + App Key', '계정으로 로그인 → 연동된 App Key의 SOBP로 작업', '#2563eb'),
        ('SDK 연동', 'App Key', 'SOBP + id/pwd 가 포함된 App Key 필요', '#d97706')))
    b = 'font-weight:700'
    cmp_ = mini_table(['구분', 'N Key', 'App Key'], [
        [('성격', b), ('<b>물리적 키 발급</b> (티켓 파일)', ''), ('물리 키 아님 — <b>서비스 DB에 등록</b>', '')],
        [('사용 대상', b), ('<b>오프라인</b> 편집툴 사용자', ''), ('<b>온라인(웹)</b> 편집툴 · <b>SDK 연동</b> 고객사', '')],
        [('전달 방식', b), ('티켓 파일을 <b>TicketFolder</b>에 생성 → nproj 폴더 또는 <code>문서 &gt; NeoLAB &gt; CodeTickets</code>에 복사', ''),
         ('발급 즉시 <b>서비스 DB(datastore)</b>에 등록 — 별도 파일 전달 없음', '')],
        [('계정 연동', b), ('없음 (파일만 있으면 사용)', ''), ('있음 — 계정과 연동되는 것이 특징', 'font-weight:700;color:#2563eb')],
        [('사용 흐름', b), ('티켓 파일 배치 → 편집툴에서 파일 정보 입력 시 해당 SOBP 사용', ''),
         ('웹: <b>발급된 계정으로 로그인</b> → 연동 App Key의 SOBP로 작업<br>SDK: <b>id/pwd + App Key</b>로 SOBP 사용', '')],
        [('주요 항목', b), ('회사이름 · Issued Time · Valid Until Time · Section/Owner · Book Start/Volume · Page Start/Volume · '
                         'Code Type · Ticket Type · Separate Each Book', ''),
         ('계정(ID) · 고객사 · 할당 SOBP 범위 · 만료일 · 발급 키(<b>영문·숫자 29자</b>)', '')]])
    step = lambda n, t, d: (
        '<div style="flex:1 1 210px;border:1px solid #eef0f4;border-radius:10px;padding:12px">'
        '<span style="background:%s;color:#fff;font-weight:700;border-radius:6px;padding:2px 8px;font-size:11px">%s</span>'
        '<span style="margin-left:8px;font-weight:700;font-size:13px">%s</span>'
        '<div style="font-size:12px;color:#6b7280;margin-top:4px;line-height:1.6">%s</div></div>'
        % ('#14b8a6' if n.startswith('3') else '#5f8ff0', n, t, d))
    steps = ''.join(step(*s) for s in (
        ('1', '코드 할당', 'SOBP 맵에서 고객사에 Section/Owner/Book 할당'),
        ('2', '티켓 발급 요청', '관리자가 좌측 [티켓 발급] 메뉴에서 N Key 발급 또는 계정 발급 선택'),
        ('3-A', 'N Key', '티켓 파일 생성 → 사용자 PC의 CodeTickets로 복사 → 오프라인 편집툴 사용 (계정 불필요)'),
        ('3-B', '계정 발급 (계정 + App Key)', '계정 등록(회사·ID·PWD…) → App Key 발급 → 서비스 DB에 등록 → 계정으로 로그인/SDK 연동해 사용')))
    acc = ('<div style="margin-top:12px;background:#f5f9ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px 12px;'
           'font-size:12.5px;color:#1e3a8a;line-height:1.7">'
           '<b>계정</b> — App Key와 한 묶음으로 관리되는 로그인 정보입니다. 항목: <b>회사정보 · ID(EMAIL) · PWD · NAME · ADDR · HOMEPAGE</b>. '
           '고객사 관리의 정보를 불러와 등록하며, <b>App Key는 계정 없이 발급되지 않습니다</b>(발급 화면에서 계정 등록 → App Key 발급이 한 흐름).'
           '<div style="margin-top:6px">※ <b>비밀번호를 요청하지 않는 고객사(SDK 목적)</b>는 담당자가 <b>임의 비밀번호를 지정</b>해 계정을 만들고, '
           '그 <b>id/pwd + SOBP가 포함된 App Key</b>를 전달합니다.</div></div>')
    tkt = ('<p style="margin:0 0 12px;font-size:12.5px;color:#374151">코드를 할당한 뒤 <b>사용 허가(티켓)</b>를 발급합니다. '
           '핵심은 <b>키와 계정의 묶음 관계</b>입니다 — <b>App Key는 반드시 계정과 함께</b> 발급되고, <b>N Key는 계정 없이</b> 파일만으로 동작합니다.</p>'
           '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">%s</div>%s'
           '<div style="margin-top:14px;font-weight:700;font-size:13px;color:#374151">발급 절차</div>'
           '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">%s</div>%s' % (uses, cmp_, steps, acc))
    warn = ('<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:12px 14px;font-size:12.5px;color:#92400e">'
            '⚠ Section <b>1</b>은 테스트/개발 전용으로 만들어졌고 상용 서비스로는 미출시된 코드입니다(레거시 아님). '
            'Section <b>44</b>는 <b>PDS4(S-code)</b> 로 구분합니다.</div>')
    return ('<div style="max-width:1000px">%s%s%s%s</div>'
            % (sect('펜 구분 · 편집 산출물', pen), sect('오너코드 발급 구조 (예시)', own),
               sect('티켓 발급 구조 — N Key vs App Key', tkt), warn))


def issue_struct():
    mono = 'font-family:ui-monospace,monospace'
    sobp = ''
    for k, nm, d, c in (('S', 'Section', '코드 대분류(구역)', '#5f8ff0'),
                        ('O', 'Owner', '소유자(업체·프로젝트)', '#14b8a6'),
                        ('B', 'Book', '책(교재) 단위', '#8b5cf6'),
                        ('P', 'Page', '페이지', '#f59e0b')):
        sobp += ('<div style="flex:1 1 180px;border:1px solid #eef0f4;border-radius:10px;padding:12px">'
                 '<span style="background:%s;color:#fff;font-weight:700;border-radius:6px;'
                 'padding:2px 8px;font-size:12px">%s</span>'
                 '<span style="margin-left:8px;font-weight:700">%s</span>'
                 '<div style="font-size:12px;color:#6b7280;margin-top:4px">%s</div></div>'
                 % (c, k, nm, d))
    return ('<div style="max-width:1000px">'
            '<p style="margin:0 0 16px;color:#6b7280;font-size:13px">'
            'Ncode 코드 체계·구분 참조. (출처: 오너코드_발급리스트 + 운영 정리)</p>%s%s%s</div>'
            % (sect('코드 종류 — 좌표(SOBP)의 속성',
                    '<p style="margin:0 0 10px;font-size:12.5px;color:#374151;line-height:1.7">'
                    '<b>좌표(SOBP)가 먼저</b>입니다. Section·Owner·Book·Page 로 코드를 지정하고, '
                    '그 좌표가 어떤 체계인지를 <b>코드 종류</b>로 구분합니다. 좌표는 유일하므로 '
                    '<b>코드 중복은 성립하지 않고</b>, 해당 좌표가 PDS2·PDS3·PDS4·OID 중 무엇인지만 '
                    '가리면 됩니다.</p>'
                    + mini_table(['표기', '약칭', '설명'], [
                [('PDS3 (N3C6)', mono), ('Ncode', 'font-weight:700;color:#2563eb'),
                 ('N3C6의 <b>N</b>을 따서 Ncode. 현행 주력 코드.', '')],
                [('PDS2 (G3C6)', mono), ('Gcode', 'font-weight:700;color:#92400e'),
                 ('G3C6의 <b>G</b>를 따서 Gcode. 구형/호환 코드.', '')],
                [('PDS4 (S-code)', mono), ('Scode', 'font-weight:700;color:#7c3aed'),
                 ('<b>Section 44</b> 로 발급된 좌표를 PDS4(S-code)로 구분합니다.', '')],
                [('OID', mono), ('인덱스', 'font-weight:700;color:#0f766e'),
                 ('<b>index만 갖는 코드</b> — 외부 코드를 <b>우리 펜으로 읽을</b> 목적으로 '
                  '만든 방식. 옛 <b>IDS(A코드)</b> 표기도 <b>같은 것</b>으로 본다.', '')]])   # IDS 행 없음 `PC-035`
                    + '<div style="margin-top:8px;font-size:12px;color:#6b7280;line-height:1.7">'
                      '같은 <b>S/O</b> 는 <b>PDS2·PDS3·PDS4 중 한 종류만</b> 씁니다(무겹침). OID는 index 부여라 같은 S/O 를 함께 쓸 수 있습니다.<br>'
                      '펜 구분(<b>소리펜</b> NSP · <b>필기펜</b> NWP)도 좌표 속성이며 지도·목록에서 필터로 가릅니다.<br>'
                      'SOBP 맵·코드 프로젝트에서 <b>PDS2 · PDS3 · PDS4 · OID</b> 로 필터해 조회합니다.</div>'),
               # OID — 좌표가 아닌 index 관리 (web/components/NcodeInfoView.tsx 「OID — index 전용 코드」)
               sect('OID — index 전용 코드',
                    '<div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;padding:12px 14px;'
                    'font-size:12.5px;color:#115e59;line-height:1.9">'
                    '<div><b>개념</b> — OID는 <b>index만 갖는 코드</b>로, <b>외부 코드를 우리 펜으로 읽을</b> 목적으로 만든 방식입니다.</div>'
                    '<div>OID 책을 우리 펜으로 찍으면 <b>코드 값이 1개만</b> 나옵니다.</div>'
                    '<div>총량이 <b>약 60,000개</b>뿐이라, 책의 양이 많지 않으면 <b>book 으로 코드를 나누지 않습니다</b>.</div></div>'
                    '<div style="margin-top:10px">'
                    + mini_table(['대장 관리 방식', '내용', '예'], [
                [('업체 구분', 'font-weight:700'), ('<b>S/O</b> 로 업체를 구분해 왔습니다(관리 편의를 위한 구분이며 좌표 발급이 아닙니다).', ''), ('한솔 S3/O25 · 웅진 S3/O17', mono)],
                [('book 미분할', 'font-weight:700'), ('분량이 <b>6만 페이지 미만</b>이면 book 번호로 나누지 않고 <b>업체 단위</b>로만 관리합니다.', ''), ('한솔교육 · 잉글리시에그 · 헤르만헤세 등', '')],
                [('index 관리', 'font-weight:700'), ('분량이 늘어난 업체는 <b>book 번호로 나누며, 그 번호가 곧 OID index</b> 로 보입니다.', ''), ('웅진 B431~464', mono)],
                [('조회 화면', 'font-weight:700'), ('좌표 기준은 <b>SOBP 맵의 종류 필터 [OID]</b>, OID 설명은 <b>[티켓 정보] 탭의 OID 안내 카드</b>에 있습니다(옛 [OID 관리대장] 탭은 폐지 <code>PC-325</code>).', ''), ('index 로만 관리 · 새로 발급하지 않음', '')],
                [('용어', 'font-weight:700'), ('옛 <b>IDS(A코드)</b> 표기는 <b>OID 와 같은 것</b>입니다. 화면·필터에서 구분하지 않습니다.', ''), ('IDS = OID', '')]])
                    + '</div>'),
               sect('SOBP 계층 (코드 주소 체계)',
                    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">%s</div>'
                    '<p style="font-size:12.5px;color:#374151;margin:0">한 페이지 안의 위치는 추가로 '
                    '<b>X·Y 좌표</b>로 지정됩니다. 겹침 없이 발급하는 것이 최우선.</p>' % sobp)))


def ticket_info():
    """티켓 정보 — App Key · N Key · 서비스 티켓 용도 비교 `PC-245` `PC-246` (web/components/TicketInfoView.tsx 내용 그대로)"""
    rows = (('쓰는 곳 · 쓰는 사람', '<b>Ncode SDK</b> 를 쓰는 고객사 · <b>Caster U</b> 를 쓰는 고객',
             '<b>Caster Lite</b>(오프라인 편집툴) 사용자 · <b>CasterN 을 오프라인</b>으로 쓰는 경우(HYBRID)',
             '<b>casterN · 폼솔루션</b> 온라인 서비스를 쓰는 고객사'),
            ('형태', '계정 + App Key(영문 소문자 · 숫자 29자) + 계정 소속 티켓',
             '파일 키 <code>.nkey</code>(Key=Value 텍스트) · Book 2권 이상이면 Book 마다 .nkey 를 묶은 <code>.zip</code>',
             '키가 아니다 — 고객사 계정과 매칭해 서비스 사용을 승인하는 기준'),
            ('계정', '<b>필요</b> — 계정을 만들면 App Key 자동 생성(계정당 1개) · 티켓은 App Key 가 아니라 <b>계정에</b> 여러 개',
             '필요 없음', '고객사의 서비스 계정과 매칭(주인 = 고객사, 소속 사용자 전원이 공유)'),
            ('권한 · 설정', '[권한] 탭의 <b>Caster U 권한 20항목</b>(true / false) — 설정해 발급하면 그 계정으로 Caster U 를 쓴다',
             '프로필 (Ticket Version) <b>1 LEGACY</b>(Caster Lite) / <b>2 HYBRID</b>(CasterN 오프라인 · CasterN 권한 6개 · Page Size 8의 배수) · '
             '코드 재사용 (Ticket Type) Unlimited / Single — <b>코드 재사용은 N Key 에만</b>',
             '서비스 구분 casterN / 폼솔루션 — 티켓 하나에 서비스 하나'),
            ('기간', '티켓마다 사용기간(시작 ~ 끝 / 무제한)', 'Issued Time(발급일) · Valid Until Time(기본 무제한)',
             '티켓마다 사용기간 — 끝나면 편집 · 추가 작업 불가, 이미 만든 PDF 인쇄는 막을 수 없음'),
            ('정산', '티켓마다 미정 · 유료 · 무료 · 체험 + 고객사별 연간 라이선스 비용',
             '티켓마다 미정 · 유료 · 무료 · 체험 + 고객사별 연간 라이선스 비용', '티켓마다 미정 · 유료 · 무료 · 체험'),
            ('발급 · 지정 화면', '<span style="color:#2563eb">티켓 발급 ▸ App Key 관리</span>',
             '<span style="color:#2563eb">티켓 발급 ▸ N Key 관리</span>', '<span style="color:#2563eb">고객사 관리 ▸ 서비스 티켓</span>'))
    th = 'text-align:center;padding:9px 12px;background:#eef0f4;color:#374151;font-weight:700;font-size:12px;border-bottom:1px solid #e5e7eb'
    td = 'padding:9px 12px;border-top:1px solid #f1f3f6;vertical-align:top;font-size:13px;line-height:1.7'
    tg = lambda bg, fg, t: '<span style="background:%s;color:%s;font-weight:700;font-size:12px;border-radius:6px;padding:2px 8px">%s</span>' % (bg, fg, t)
    tbl = ('<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden"><table style="width:100%%;border-collapse:collapse">'
           '<tr><th style="%s;width:130px">구분</th><th style="%s">%s</th><th style="%s">%s</th><th style="%s">%s</th></tr>%s</table></div>'
           % (th, th, tg('#f5f3ff', '#6d28d9', 'App Key'), th, tg('#eef6ff', '#1d4ed8', 'N Key'), th, tg('#ecfdf5', '#047857', '서비스 티켓'),
              ''.join('<tr style="background:%s"><td style="%s;color:#374151;font-weight:700">%s</td><td style="%s">%s</td><td style="%s">%s</td><td style="%s">%s</td></tr>'
                      % ('#fafbfc' if i % 2 else '#fff', td, k, td, a, td, n, td, v) for i, (k, a, n, v) in enumerate(rows))))
    card = '<div style="margin-top:16px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;font-size:13px">'
    ul = '<ul style="margin:%s;padding-left:18px;font-size:13px;color:#374151;line-height:1.9">'
    # App Key · 계정 · 티켓 관계 `PC-206` `PC-210` `PC-247`
    box = lambda bg, fg, t, d: ('<div style="background:%s;color:%s;border-radius:9px;padding:9px 12px;min-width:150px;font-size:12.5px;display:flex;flex-direction:column;gap:2px">'
                                '<b>%s</b><span>%s</span></div>' % (bg, fg, t, d))
    arr = '<div style="display:flex;align-items:center;color:#9ca3af;font-size:16px">→</div>'
    relc = (card + '<div style="font-weight:700;font-size:14px;margin-bottom:10px">App Key — 고객사 · 계정 · App Key · 티켓 관계</div>'
            '<div style="display:flex;gap:10px;align-items:stretch">' + box('#f3f4f6', '#374151', '고객사', '계정을 여러 개 가질 수 있다') + arr +
            box('#f5f3ff', '#6d28d9', '계정', '고객사 안에 여러 개') + arr + '<div style="display:flex;flex-direction:column;gap:8px">' +
            box('#eef6ff', '#1d4ed8', 'App Key 1개', '계정을 만들면 자동 생성 · 계정당 1개') +
            box('#ecfdf5', '#047857', '티켓 여러 개', '계정에 붙는다 · SOBP 가 바뀌면 티켓을 더 발급') + '</div></div>'
            + ul % '12px 0 0' +
            '<li>App Key 는 <b>고객사의 계정마다 1개만</b> 만들어진다 — 계정을 만들 때 자동으로 생긴다.</li>'
            '<li>티켓은 <b>App Key 에 매칭되지 않고 계정에 매칭</b>된다 — 한 계정에 티켓(Code Type · Section · Owner · Book · Page · Info · Period)을 <b>여러 개</b> 발급할 수 있다.</li>'
            '<li>그래서 쓰는 코드(SOBP)가 늘거나 바뀌어도 <b>App Key 는 그대로</b> 두고 그 계정에 티켓만 더 발급한다. 정산도 티켓마다 한다.</li>'
            '<li style="color:#6b7280">이전 정책으로 App Key 가 2개 만들어진 옛 계정은 기록대로 둘 다 보이지만, 새 키는 만들지 않는다.</li></ul></div>')
    pick = (card + '<div style="font-weight:700;font-size:14px;margin-bottom:8px">어떤 티켓을 주나</div>' + ul % '0' +
            '<li>앱 · 서비스에 <b>Ncode SDK</b> 를 넣는 고객사 → <b>App Key</b></li>'
            '<li><b>Caster U</b> 를 쓰는 고객 → 계정을 만들고(App Key 자동) [권한] 탭에서 <b>Caster U 권한</b>을 켠 <b>App Key</b></li>'
            '<li>오프라인 <b>Caster Lite</b> 로 편집하는 고객 → <b>N Key</b>(프로필 LEGACY)</li>'
            '<li><b>CasterN 을 오프라인</b>으로 쓰는 고객 → <b>N Key</b>(프로필 HYBRID · CasterN 권한 6개)</li>'
            '<li><b>casterN · 폼솔루션</b> 온라인 서비스를 쓰는 고객사 → 고객사 관리에서 <b>서비스 티켓</b> 지정</li></ul></div>')
    # N Key 프로필 · 코드 타입별 Section — 발급 화면 값(lib/nkeyFile NKEY_SECTIONS) 그대로
    sth = 'padding:9px 12px;background:#eef0f4;color:#374151;font-weight:700;font-size:12px;border-bottom:1px solid #e5e7eb'
    std = 'padding:9px 12px;border-top:1px solid #f1f3f6;font-size:13px'
    mono = ';font-family:ui-monospace,monospace;text-align:center'
    srow = lambda p, d, a, b: ('<tr><td style="%s;font-weight:700">%s <span style="font-weight:400;color:#6b7280">%s</span></td>'
                               '<td style="%s">S %s</td><td style="%s">S %s</td></tr>' % (std, p, d, std + mono, a, std + mono, b))
    sec = (card + '<div style="font-weight:700;font-size:14px;margin-bottom:8px">N Key — 프로필 · 코드 타입별 쓸 수 있는 Section</div>'
           '<table style="border-collapse:collapse"><tr><th style="%s;text-align:left">프로필</th><th style="%s">PDS2</th><th style="%s">PDS3</th></tr>%s%s</table>'
           '<div style="font-size:12px;color:#6b7280;margin-top:8px;line-height:1.8">표에 없는 Section 은 제한이 없습니다. '
           '새로 발급하는 Code Type 은 PDS2 · PDS3 만입니다(OID · PDS4 는 새로 발급하지 않음).</div></div>'
           % (sth, sth, sth, srow('LEGACY', '(Caster Lite)', '0 · 1 · 2 · 3 · 14', '0 · 3 · 14'),
              srow('HYBRID', '(CasterN 오프라인)', '0 · 3 · 14', '0 · 3 · 5 · 10 · 11 · 14 · 15')))
    # OID(index 전용 코드) 안내 — 옛 [OID 관리대장] 탭 설명을 여기로 `PC-325`
    oid = (card + '<div style="font-weight:700;font-size:14px;margin-bottom:8px">OID — index 전용 코드 '
           '<span style="font-weight:400;color:#9ca3af;font-size:12px">· 새로 발급하지 않음</span></div>' + ul % '0' +
           '<li><b>OID = index 만 갖는 코드</b> — 외부 코드를 <b>우리 펜으로 읽으려고</b> 만든 방식입니다. OID 책을 우리 펜으로 찍으면 <b>코드 값이 1개만</b> 나옵니다. (옛 <b>IDS</b> 표기도 같은 것입니다)</li>'
           '<li>총량이 <b>약 60,000개</b>뿐이라, 책의 양이 많지 않으면 <b>book 으로 코드를 나누지 않습니다</b>. 업체 구분에는 S/O 를 써 왔고, 분량이 늘어난 업체만 <b>book 번호(=OID index)</b> 로 나눠 관리했습니다.</li>'
           '<li>SOBP(PDS2·PDS3·PDS4) 좌표 관리와 달리 <b>index 로만</b> 관리합니다. 좌표로 보려면 <b>SOBP 맵에서 종류 [OID]</b> 로 필터하세요.</li>'
           '<li style="color:#6b7280">OID 는 티켓을 <b>새로 발급하지 않는</b> 코드 종류입니다(위 N Key 표 참고). 이력만 남아 있습니다.</li></ul></div>')
    common = ('<div style="margin-top:16px;border:1px solid #bfdbfe;background:#eff6ff;border-radius:10px;padding:14px 16px;font-size:12.5px;color:#1e3a8a;line-height:1.9">'
              '<div style="font-weight:700;margin-bottom:6px">세 티켓 공통</div><ul style="margin:0;padding-left:18px">'
              '<li>고객사에 <b>할당된 SOBP 안에서만</b> 발급 · 지정합니다.</li>'
              '<li>App Key · N Key · 서비스 티켓은 <b>SOBP 가 겹칠 수 없습니다</b> — 고객사를 가리지 않고 전체 발급분과 비교합니다.</li>'
              '<li>발급한 티켓은 <b>지우지 않고 고칩니다</b>([티켓 수정]).</li>'
              '<li>SOBP 할당에는 기간이 없고(한 번 할당받은 고객사가 영구 소유), <b>사용기간은 티켓에만</b> 있습니다.</li></ul></div>')
    return ('<div style="max-width:1100px"><p style="margin:0 0 16px;color:#6b7280;font-size:13px">고객사가 코드를 직접 쓸 때 주는 티켓은 세 가지입니다. '
            '무엇을 쓰는 고객인지에 따라 고릅니다. <b>사내 편집에는 티켓이 필요 없습니다.</b></p>'
            + tbl + relc + pick + sec + oid + common + '</div>')


def must_know():
    """알아야 할 사항 — web/components/NcodeGuideView.tsx 내용 그대로 (섹션 1~6 + 정리)"""
    ul = 'margin:0;padding-left:18px;font-size:13px;color:#374151;line-height:1.9'
    mono = 'font-family:ui-monospace,monospace'
    note = '<p style="font-size:12px;color:#9ca3af;margin:8px 0 0">%s</p>'
    s1 = sect('편집 비용 산출 기준 — 페이지 + 심볼',
              '<ul style="%s">'
              '<li>소리펜·필기펜 <b>모두 「페이지 수 + 심볼 갯수」로 편집 비용을 산출</b>합니다.</li>'
              '<li><b>심볼</b> = 편집(nproj)에서 (책) 영역을 설정한 편집 단위. 이 심볼에 리소스(mp3)를 매핑합니다. <b>심볼 갯수 = 작업량</b>.</li>'
              '<li>필기펜 <b>nproj</b>는 심볼 갯수가 늘수록 서버 저장 용량도 증가 → 필기펜도 심볼 갯수 파악이 현황 확인에 도움.</li>'
              '<li>재무팀은 이미 <b>편집 단가 협상 미팅을 완료</b>해 산출 기준을 알고 있습니다.</li>'
              '</ul>' % ul, '1')
    s2 = sect('산출물 · 저장 위치',
              mini_table(['항목', '종류', '저장 위치'], [
                  [('리소스 파일 (mp3 등)', 'font-weight:600'), ('소리펜·필기펜 공통', ''), ('디바이스에 저장 (서버 스토리지 ✕)', 'color:#2563eb')],
                  [('ncp2', 'font-weight:600'), ('소리펜 산출물 (좌표+mp3)', ''), ('디바이스(소리펜)에 넣어야 동작', 'color:#2563eb')],
                  [('nproj + PDF + JPG + 썸네일 png', 'font-weight:600'), ('필기펜 편집 파일', ''), ('서버에 등록', 'color:#047857')]])
              + note % '편집은 소리·필기 모두 「심볼 ↔ 리소스 매핑」에서 작업이 발생하므로 심볼 갯수로 작업량을 산출하는 것이 맞습니다.', '2')
    s3 = sect('코드 구분 (PDS)',
              '<ul style="%s"><li><b>PDS3 (N3C6) = Ncode</b> — N3C6의 N.</li>'
              '<li><b>PDS2 (G3C6) = Gcode</b> — G3C6의 G.</li></ul>' % ul, '3')
    s4 = sect('코드 발급 현황 — 재무·사업부용',
              '<ul style="%s">'
              '<li>발급 코드 <b>합계는 편집에는 사용하지 않습니다.</b> B2B 납품 관점에서도 합계 필요성은 낮았습니다.</li>'
              '<li>그러나 이제 <b>사업부·재무팀이 코드 발급 현황을 조회</b>합니다 → <b>"코드가 얼마나 발급되었는지"</b> 확인 용도로 발급 규모를 봅니다.</li>'
              '<li><b>코드 라이선스 비용은 사업팀에서 별도 책정</b>합니다(편집 단가와 별개). 편집 단가는 재무팀이 이미 인지.</li>'
              '</ul>' % ul, '4')
    # 옛 「항목 구성 버전」 설명 `PC-065` 대체 `PC-257`~`PC-260`
    s5 = sect('Ticket Version · Ticket Type — N Key 프로필 · 코드 재사용',
              '<ul style="%s">'
              '<li>N Key 의 <b>Ticket Version</b> 은 <b>프로필</b>입니다 — 발급 화면 항목명 <b>프로필 (Ticket Version)</b>.</li>'
              '<li>N Key 의 <b>Ticket Type</b> 은 <b>코드 재사용 여부</b>입니다 — 발급 화면 항목명 <b>코드 재사용 (Ticket Type)</b>.</li>'
              '<li><b>코드 재사용은 N Key 에서만</b> 씁니다. App Key 티켓 · 서비스 티켓에는 없습니다.</li>'
              '<li><b>HYBRID</b> 프로필은 <b>Page Size가 8의 배수</b>여야 발급됩니다.</li>'
              '</ul>' % ul
              + '<div style="margin-top:10px">' + mini_table(['항목', '값', '뜻'], [
                  [('Ticket Version (프로필)', 'font-weight:700'), ('1', mono), ('LEGACY — Caster Lite', '')],
                  [('', ''), ('2', mono), ('HYBRID — CasterN 오프라인 · Page Size 8의 배수', '')],
                  [('Ticket Type (코드 재사용)', 'font-weight:700'), ('Unlimited', mono), ('재사용 (기본)', '')],
                  [('', ''), ('Single', mono), ('재사용 안 함', '')]]) + '</div>'
              + note % ('※ 항목명 표기는 <b>띄어쓰기 기준</b>입니다 <code>PC-064</code> (Issued Time · Ticket Version …). '
                        '티켓 파일 안의 키 이름(<code>issuedTime</code> 등)은 프로그램이 읽는 값이라 바뀌지 않습니다.'), '5')
    s6 = sect('실제 산출 단가 (견적서 기준)',
              mini_table(['구분', '단위', '단가', '비고'], [
                  [('Ncode 적용', 'font-weight:600'), ('페이지당', ''), ('500원', mono), ('인쇄데이터에 Ncode 적용', '')],
                  [('Ncode 편집', 'font-weight:600'), ('심볼당', ''), ('1,000 ~ 1,500원', mono), ('난도(기능)에 따라 차등', '')],
                  [('노트서버 업로드', 'font-weight:600'), ('건당', ''), ('10,000원', mono), ('필기펜 nproj 서버 등록', '')]])
              + note % '예: 2026-07-16 양지사 플래너 4종 견적 = 적용(페이지) + 편집(심볼) + 업로드 합산 ₩35,232,000(VAT 별도).', '6')
    sumbox = ('<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:14px 16px;font-size:13px;color:#1e3a8a;line-height:1.8">'
              '<b>정리</b> — 리소스(mp3)는 소리·필기 모두 디바이스 저장, 필기펜 편집 파일(nproj+PDF+JPG+png)만 서버 등록. '
              '편집은 심볼↔리소스 매핑에서 발생하므로 <b>페이지와 심볼 갯수로 작업량·비용을 산출</b>합니다. '
              '코드 발급 규모는 재무·사업부 현황 파악용이며, 코드 라이선스 비용은 사업팀이 별도 책정합니다.</div>')
    return ('<div style="max-width:1000px">'
            '<p style="margin:0 0 16px;color:#6b7280;font-size:13px">'
            '코드 발급·편집 운영에서 반드시 알아야 할 기준. (한윤정 책임 협의 정리)</p>'
            + s1 + s2 + s3 + s4 + s5 + s6 + sumbox + '</div>')


def content(tab=0, flt='all', body=None):
    #   tab 3 = 티켓 정보 `PC-246`(+ OID 안내 `PC-325`) · tab 4 = 알아야 할 사항
    #   (옛 OID 관리대장 · 펜 모델 탭은 폐지 `PC-325`)
    if body is None:
        body = {0: range_table, 1: lambda: lang_slots(flt), 2: issue_struct, 3: ticket_info, 4: must_know}[tab]()
    return tabs(tab) + body


NAV = [('판형·페이지 기준 확인 후 발급', '이동', '<code>SOB-01</code> → <code>SOB-02</code>',
        '자동 추천이 이 표 기준으로 Section을 고른다'),
       ('언어 슬롯 실제 점유 확인', '이동', '<code>SOB-01</code>', '해당 Owner의 코드 상태'),
       ('단가 기준 확인 후 지정', '이동', '<code>MEM-01</code> → <code>MEM-02</code>', '고객사별 편집 단가'),
       ('편집 실적·청구액 확인', '이동', '<code>PRJ-02</code> → <code>PRJ-03</code>', '')]


def build():
    boards = []

    boards.append((
        'S1', 'Code Info · Section별 발급 범위', '기본',
        '좌측 메뉴 [코드 관리 정보]로 진입하면 이 <b>Code Info</b> 탭이 기본이다. 탭은 칩이 아니라 <b>밑줄 탭</b>이며 '
        '활성 탭만 파란 글씨 + 2px 밑줄이다. 표는 <b>Section 하나당 4행</b>'
        '(owner · bookcode · page · length)이고 SECTION 칸이 <code>rowspan=4</code>로 묶인다. '
        '<b>참조 전용 · 기능 없음</b> — 검증·오류 메시지가 없다. '
        '',
        frame('INF-01', '코드 관리 정보', content(0), height=1240),
        [('탭', '클릭', '본문 교체',
          'Code Info / 확장 언어 슬롯 / 발급 구조 / 티켓 정보 / 알아야 할 사항 — '
          '<b>5개</b> (OID 관리대장 · 펜 모델 탭은 폐지 <code>PC-325</code>)'),
         ('length(판형)', '조회', '—',
          '<b>코드를 입힐 수 있는 최대 크기</b> — 판형이 커지면 <b>Section이 달라진다</b>'),
         ('PDS2 범위 없는 Section', '표시', '—', '값이 <b>—</b>로 표시된다 (S5·S10·S11·S15)'),
         ('안내 박스', '조회', '—', '파란 박스(#eff6ff) · <b>※ Section 1은 테스트/개발 전용</b> · <b>※ Section 44 = PDS4(S-code)</b> owner 0~4095 · book 0~255 · page 0~255 · xy 0~255'),
         ('⚠ 수록 Section', '참고', '—',
          '이 표에는 <b>0 · 3 · 5 · 10 · 11 · 14 · 15 · 44</b>가 있다 — '
          '<code>SOB-01</code>의 Section 목록과 달리 <b>Section 1</b>(테스트/개발 전용)은 없다')] + NAV))

    boards.append((
        'S2', '확장 언어 슬롯 · 전체 그룹', '기본',
        'PRD §4.2 — <b>보기 전용 그룹 보기</b> <code>PC-330</code>. 고정된 Common · Cake 두 묶음 대신 '
        '<b>고객사 관리 ▸ 공통코드 · 확장 언어</b>의 <b>확장 언어 그룹</b>을 그룹마다 카드 하나로 보여 준다. '
        '필터 칩은 <b>[전체] + 그룹명</b>이다. 그룹 머리에 <b>{코드 종류} · Section · 기본 O{n} · '
        '확장 O{첫}~O{끝} ({n}개) · 필요 언어 {n}개 · 오너당 4슬롯</b>을 붙인다. '
        'Owner 카드는 <code>repeat(auto-fill, minmax(168px, 1fr))</code> 격자이며 <b>Owner 당 4슬롯</b>, '
        '슬롯 번호는 기본 1~4 · 확장은 연결 순서대로 5~8 · 9~12 … 로 이어진다. '
        '언어가 없는 슬롯은 <b>사용가능</b>이다. 이 화면에서는 고칠 수 없다 — 그룹 · 언어는 고객사 관리, '
        'Owner 연결은 SOBP 맵 할당 창에서 한다.',
        frame('INF-01', '코드 관리 정보', content(1), height=2000),
        [('안내 [고객사 관리]', '클릭', '<code>MEM-01</code>', '그룹 · 슬롯별 언어 정본(공통코드 · 확장 언어)'),
         ('안내 [SOBP 맵]', '클릭', '<code>SOB-01</code>', 'Owner(영역) 할당'),
         ('[전체] / [Common-21] / [Cake-1009]', '클릭', '그룹 필터', '칩 = 고객사 관리에 등록된 그룹 · 그룹마다 색이 다르다'),
         ('Common-21', '조회', '—', 'PDS2 · Section 3 · 기본 <b>O21</b> · 확장 <b>O964~O983 (20개)</b> · 필요 언어 10개 · 오너당 4슬롯'),
         ('Cake-1009', '조회', '—', 'PDS3 · Section 3 · 기본 <b>O1009</b> · 확장 <b>O984~O1003 (20개)</b> · 필요 언어 8개 · 오너당 4슬롯'),
         ('기본 Owner 카드', '표시', '—', '<b>O{n} [기본] 슬롯 1~4</b> — 머리 배경 #eef6ff + <b>기본</b> 배지'),
         ('사용가능 슬롯', '표시', '—', '언어 미지정 슬롯'),
         ('그룹 없음', '표시', '—', '<b>등록된 확장 언어 그룹이 없습니다.</b>'),
         ('실제 점유 확인', '이동', '<code>SOB-01</code>', '해당 Owner의 코드 상태'),
         ('탭 분리 여부', '—', '<b>미결</b>', '⚠ §7 — 별도 탭으로 분리할지')]))

    boards.append((
        'S3', '확장 언어 슬롯 · 그룹 필터', '필터',
        '그룹 필터로 <b>Cake-1009</b> 한 그룹만 본 상태. 활성 칩은 그 그룹 색(자홍 #db2777)으로 채워진다. '
        '확장 Owner 카드는 <b>연결한 순서</b>(O1003 → O984)대로 놓이고 머리의 확장 범위는 작은 번호부터 적는다.',
        frame('INF-01', '코드 관리 정보', content(1, 'Cake-1009'), height=1100),
        [('[Cake-1009]', '클릭', '그 그룹만 표시', ''),
         ('[전체]', '클릭', 'S2 복귀', ''),
         ('기본 Owner', '조회', '—', 'O1009 슬롯 1~4 (한국어·영어·일본어·스페인어)'),
         ('확장 Owner', '조회', '—', 'O1003 슬롯 5~8 (BTS·중국어·인도네시아어·러시아어) → 이후 <b>사용가능</b>')]))

    boards.append((
        'S8', '확장 언어 슬롯 · 할당 전 자리', '분기',
        '고객사 관리에서 그룹을 켜고 언어만 미리 넣었고 <b>아직 SOBP 할당 전</b>인 그룹 <code>PC-334</code>. '
        '그룹의 <b>필요한 Owner 수</b>(기본 1 + ⌈필요 언어 수 ÷ 4⌉ − 1)만큼 카드를 만들고, '
        'Owner 가 없는 자리는 <b>할당 전</b>(점선 카드)으로 보인다. 미리 넣은 언어도 그 자리에 보인다. '
        'Section · 기본 Owner 가 정해지기 전이라 머리에는 <b>미정</b>으로 적는다.',
        frame('INF-01', '코드 관리 정보',
              content(1, body=lang_slots(NEW_GROUP['label'], GROUPS + (NEW_GROUP,))), height=760),
        [('할당 전 카드', '표시', '—', '<b>할당 전</b> · 점선 테두리 · 슬롯 번호는 자리 순서대로(1~4 · 5~8 …)'),
         ('미리 넣은 언어', '표시', '—', '고객사 관리에서 넣은 언어 — Owner 가 연결되면 그 Owner 로 옮겨진다'),
         ('그룹 머리', '표시', '—', 'PDS3 · Section <b>미정</b> · 기본 <b>미정</b> · 확장 <b>없음</b> · 필요 언어 8개 · 오너당 4슬롯'),
         ('Owner 연결', '이동', '<code>SOB-01</code>', 'SOBP 맵 할당 창 — 이 화면에서는 연결할 수 없다')]))

    boards.append((
        'S4', '발급 구조', '기본',
        'PRD §4.3 — <b>좌표(SOBP)가 먼저</b>이고 코드 종류(PDS3·PDS2·PDS4·OID)는 '
        '그 좌표의 속성이라는 <b>코드 체계</b>와 <b>SOBP 계층</b>을 설명한다 <code>PC-032</code>. '
        '옛 IDS(A) 는 OID 와 같은 것이라 따로 행을 두지 않는다 <code>PC-035</code>. '
        '기능 조작 없이 읽는 페이지다. 본문 최대 폭 1000px.',
        frame('INF-01', '코드 관리 정보', content(2), height=900),
        [('코드 종류 표', '조회', '—',
          '4행 — PDS3(N3C6)=<b>Ncode</b> 현행 주력 · PDS2(G3C6)=<b>Gcode</b> 구형/호환 · '
          '<b>PDS4(S-code)=Section 44</b> · <b>OID</b>=인덱스 전용(옛 IDS(A코드) 표기도 같은 것)'),
         ('종류 규칙', '조회', '—', '같은 S/O 는 <b>PDS2·PDS3·PDS4 중 한 종류만</b>(무겹침) · OID 는 index 부여라 같은 S/O 를 함께 쓸 수 있다'),
         ('필터 안내', '조회', '—', 'SOBP 맵 · 코드 프로젝트에서 <b>PDS2 · PDS3 · PDS4 · OID</b> 로 필터해 조회'),
         ('OID 설명', '조회', '—',
          '<b>index 전용 · 코드 1개 노출 · 약 6만 개 · book 미분할</b> — 자세한 안내는 [티켓 정보] 탭 OID 카드(S7) · '
          '좌표는 SOBP 맵 [OID] 필터 <code>PC-325</code>'),
         ('펜 구분', '조회', '—', '<b>소리펜(NSP) · 필기펜(NWP)</b> 도 좌표 속성'),
         ('SOBP 계층', '조회', '—', 'S 파랑 · O 청록 · B 보라 · P 주황 4카드'),
         ('X·Y 좌표', '참고', '—',
          '<b>한 페이지 안의 위치는 추가로 X·Y 좌표로 지정됩니다. 겹침 없이 발급하는 것이 최우선.</b>'),
         ('아래로 이어짐', '스크롤', 'S9', '펜 구분 · 오너코드 발급 구조 · 티켓 발급 구조 · Section 1 · 44 안내')]))

    boards.append((
        'S9', '발급 구조 · 이어서 (아래로 스크롤)', '기본',
        'S4 를 아래로 내린 부분 — 같은 [발급 구조] 탭의 나머지 섹션이다. 한 장에 다 넣으면 길어서 '
        '<b>이어지는 화면으로 나눠</b> 그렸다. 순서는 <b>펜 구분 · 편집 산출물 → 오너코드 발급 구조(예시) → '
        '티켓 발급 구조 — N Key vs App Key → Section 1 · 44 안내</b>. 읽기 전용이다.',
        frame('INF-01', '코드 관리 정보', content(2, body=issue_struct_more()), height=900),
        [('펜 구분 · 편집 산출물', '조회', '—', '소리펜 = <b>Ncp</b> · ncp2(좌표 + mp3) · 디바이스 저장 / 필기펜 = <b>Ndp</b> · nproj + PDF + JPG + 썸네일 · 서버 등록'),
         ('오너코드 발급 구조 (예시)', '조회', '—', 'Section · Owner · ACCOUNT · Book 범위 · Page · X · Y 5행 — Section·Owner 마다 최대 차원이 다르다 · 페이지 1장 2.3m 이하면 페이지 수로 발급 규모 산정'),
         ('사용처별 키', '조회', '—', '오프라인 편집툴 = <b>N Key</b> · 온라인(웹) 편집툴 = <b>계정 + App Key</b> · SDK 연동 = <b>App Key</b>'),
         ('N Key vs App Key 표', '조회', '—', '성격 · 사용 대상 · 전달 방식 · 계정 연동 · 사용 흐름 · 주요 항목 6행'),
         ('발급 절차', '조회', '—', '1 코드 할당 → 2 티켓 발급 요청 → 3-A N Key / 3-B 계정 발급(계정 + App Key)'),
         ('계정 안내', '조회', '—', 'App Key 는 계정 없이 발급되지 않는다 · 비밀번호를 요청하지 않는 고객사(SDK)는 담당자가 임의 비밀번호 지정'),
         ('Section 1 · 44 안내', '조회', '—', 'Section 1 = 테스트/개발 전용(상용 미출시 · 레거시 아님) · Section 44 = PDS4(S-code)'),
         ('발급 화면', '이동', '<code>SOB-01</code> · <code>TKT-02</code> · <code>TKT-01</code>', '코드 할당 · N Key 관리 · App Key 관리')]))

    boards.append((
        'S7', '티켓 정보', '기본',
        '<b>App Key · N Key · 서비스 티켓</b>이 각각 무엇에 쓰이는지 비교한다 <code>PC-245</code> <code>PC-246</code> — '
        '쓰는 곳 · 형태 · 계정 · 권한 · 기간 · 정산 · 발급 화면, 「어떤 티켓을 주나」, N Key 프로필별 Section 표(발급 화면과 같은 값), '
        '<b>OID 안내 카드</b> <code>PC-325</code>, 세 티켓 공통 규칙. '
        '읽기 전용이다. 옛 [OID 관리대장] 탭의 설명이 OID 안내 카드로 들어왔다.',
        frame('INF-01', '코드 관리 정보', content(3), height=1500),
        [('App Key 관계 카드', '조회', '—', '고객사 → 계정(여러 개) → <b>App Key 1개</b>(자동) + <b>티켓 여러 개</b>(계정 소속) <code>PC-247</code>'),
         ('발급 · 지정 화면 링크', '클릭', '<code>TKT-01</code> · <code>TKT-02</code> · <code>MEM-02</code>', 'App Key 관리 · N Key 관리 · 고객사 관리'),
         ('N Key Section 표', '조회', '—', '발급 화면이 쓰는 값 그대로 — LEGACY / HYBRID × PDS2 / PDS3 <code>PC-219</code>'),
         ('OID 안내 카드', '조회', '—',
          '「OID — index 전용 코드 · 새로 발급하지 않음」 — ① index 만 갖는 코드(찍으면 코드 값 1개 · 옛 IDS 동일) '
          '② 약 60,000개라 book 미분할 ③ index 로 관리 · 좌표는 SOBP 맵 [OID] 필터 ④ 새로 발급하지 않음 · 이력만 '
          '<code>PC-325</code>'),
         ('OID 좌표 조회', '이동', '<code>SOB-01</code>', 'SOBP 맵 종류 [OID] 필터'),
         ('세 티켓 공통', '조회', '—',
          '4항목 — ① 할당된 SOBP 안에서만 발급 · 지정 ② 세 티켓끼리 SOBP 겹침 불가(고객사 가리지 않고 전체 발급분과 비교) '
          '③ 지우지 않고 [티켓 수정] ④ SOBP 할당은 기간 없음(영구 소유) · 사용기간은 티켓에만')]))

    boards.append((
        'S6', '알아야 할 사항', '기본',
        'PRD §4.5 — 코드 발급·편집 운영에서 <b>반드시 알아야 할 기준</b>을 번호 붙은 섹션 <b>6개 + 정리</b>로 보여 준다 '
        '(web/components/NcodeGuideView.tsx 내용 그대로). '
        '단가의 정본은 <code>P-16</code>이며 고객사별 단가는 <code>MEM-02</code>에서 지정한다.',
        frame('INF-01', '코드 관리 정보', content(4), height=900),
        [('① 편집 비용 산출', '조회', '—', '소리펜·필기펜 모두 <b>페이지 수 + 심볼 갯수</b> · <b>심볼 갯수 = 작업량</b>'),
         ('② 산출물·저장 위치', '조회', '—',
          'mp3·ncp2 = <b>디바이스</b>(파랑) / nproj·PDF·JPG·썸네일 = <b>서버 등록</b>(초록) · '
          '각주 「심볼 ↔ 리소스 매핑에서 작업이 발생 → 심볼 갯수로 작업량 산출」'),
         ('③ 코드 구분 (PDS)', '조회', '—', 'PDS3(N3C6) = Ncode · PDS2(G3C6) = Gcode'),
         ('④ 코드 발급 현황', '조회', '—',
          '발급 합계는 편집에 쓰지 않음 · <b>사업부·재무팀이 발급 규모를 조회</b> · 코드 라이선스 비용은 사업팀이 별도 책정'),
         ('⑤ Ticket Version · Ticket Type', '조회', '—',
          'N Key — Ticket Version = <b>프로필</b>(1 LEGACY · 2 HYBRID) · Ticket Type = <b>코드 재사용</b>(Unlimited · Single, N Key 에만) · '
          'HYBRID 는 Page Size 8의 배수 <code>PC-257</code>~<code>PC-260</code> · 각주 「항목명은 띄어쓰기 기준 <code>PC-064</code>」'),
         ('⑥ 실제 산출 단가 (견적서 기준)', '조회', '—',
          'Ncode 적용 페이지당 500원 · Ncode 편집 심볼당 1,000~1,500원 · 노트서버 업로드 건당 10,000원 · 양지사 견적 예시'),
         ('정리 박스', '조회', '—', '저장 위치 · 페이지와 심볼 갯수로 작업량·비용 산출 · 발급 규모는 현황 파악용'),
         ('단가 지정하러 가기', '이동', '<code>MEM-01</code> → <code>MEM-02</code>', ''),
         ('SOBP 실시간 발급', '—', '<b>미구현</b>', '⚠ §7 — 이 메뉴의 탭으로 넣을지 협의')]))

    intro = ('코드 발급·편집 업무에 필요한 <b>참조 정보</b>를 <b>밑줄 탭 5개</b>로 제공한다 — '
             'Code Info(Section별 발급 범위 — PDS2·PDS3·PDS4) · 확장 언어 슬롯 · 발급 구조 · <b>티켓 정보</b> `PC-246` · '
             '알아야 할 사항. 모두 <b>참조 전용</b>이다. '
             '<b>[OID 관리대장] · [펜 모델] 탭은 폐지</b> <code>PC-325</code> — OID 설명은 [티켓 정보] 탭의 OID 안내 카드로, '
             '좌표 조회는 SOBP 맵 [OID] 필터로 하고, 펜 모델은 화면 등록 없이 데이터를 직접 고쳐 관리한다. '
             '권한은 전 역할(STAFF / ADMIN). '
             '탭 2~5는 각각 <code>LangSlotView</code> · <code>NcodeInfoView</code> · '
             '<code>TicketInfoView</code> · <code>NcodeGuideView</code>를 불러 쓴다.')
    return page(CODE, NAME, PRD, intro, boards)
