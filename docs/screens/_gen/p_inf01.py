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
            'Ncode 코드 체계·구분 참조. (출처: 오너코드_발급리스트 + 운영 정리)</p>%s%s</div>'
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
                 ('<b>Section 44</b> 로 발급된 좌표를 PDS4(S-code)로 구분합니다. 범위는 owner 0~4095 · book 0~255 · page 0~255 · <b>xy 0~255</b> <code>PC-042</code>.', '')],
                [('OID', mono), ('인덱스', 'font-weight:700;color:#0f766e'),
                 ('<b>index만 갖는 코드</b> — 외부 코드를 <b>우리 펜으로 읽을</b> 목적으로 '
                  '만든 방식. <b>좌표(SOBP) 관리 대상이 아니며</b> index 로 관리합니다 '
                  '— 설명은 [티켓 정보] 탭 <code>PC-325</code>.', '')],
                [('IDS (A)', 'color:#9ca3af;' + mono), ('이력', 'color:#9ca3af'),
                 ('초창기 A코드 — 이력 조회 전용.', 'color:#9ca3af')]])
                    + '<div style="margin-top:8px;font-size:12px;color:#6b7280;line-height:1.7">'
                      '<b>신규 발급</b>은 같은 <b>S/O</b> 에 한 종류만 씁니다 <code>PC-041</code>. 과거 혼용 이력은 그대로 표시합니다.<br>'
                      '<b>OID</b> 는 index 전용이라 좌표로 관리하지 않고 '
                      '<b>index</b> 로 관리합니다(좌표로 보려면 SOBP 맵 [OID] 필터) — '
                      '펜으로 찍으면 <b>코드 값 1개</b>, 총량 <b>약 6만 개</b>, 분량이 적으면 '
                      '<b>book 미분할</b>.<br>'
                      '펜 구분(<b>소리펜</b> NSP · <b>필기펜</b> NWP)도 좌표 속성이며 '
                      '지도·목록에서 필터로 가릅니다.</div>'),
               sect('SOBP 계층 (코드 주소 체계)',
                    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">%s</div>'
                    '<p style="font-size:12.5px;color:#374151;margin:0">한 페이지 안의 위치는 추가로 '
                    '<b>X·Y 좌표</b>로 지정됩니다. 겹침 없이 발급하는 것이 최우선.</p>' % sobp)))


def ticket_info():
    """티켓 정보 — App Key · N Key · 서비스 티켓 용도 비교 `PC-245` `PC-246` (web/components/TicketInfoView.tsx)"""
    rows = (('쓰는 곳 · 쓰는 사람', '<b>Ncode SDK</b> 고객사 · <b>Caster U</b> 고객', '<b>Caster Lite</b>(오프라인) · CasterN 오프라인(HYBRID)', '<b>casterN · 폼솔루션</b> 온라인 서비스 고객사'),
            ('형태', '계정 + App Key + 계정 소속 티켓', '.nkey 파일(Book 2권 이상이면 .zip)', '키 아님 — 고객사 계정과 매칭하는 승인 기준'),
            ('계정', '<b>필요</b>(계정 생성 = App Key 자동)', '필요 없음', '고객사 서비스 계정과 매칭'),
            ('권한 · 설정', '[권한] 탭 Caster U 권한 20항목', '프로필 LEGACY / HYBRID(CasterN 권한 6개)', '서비스 casterN / 폼솔루션'),
            ('기간', '티켓마다 사용기간', 'Issued Time · Valid Until Time', '티켓마다 사용기간'),
            ('정산', '티켓 4종 + 연간 라이선스', '티켓 4종 + 연간 라이선스', '티켓 4종'),
            ('발급 · 지정 화면', 'App Key 관리', 'N Key 관리', '고객사 관리 ▸ 서비스 티켓'))
    th = 'text-align:center;padding:9px 12px;background:#eef0f4;color:#374151;font-weight:700;font-size:12px'
    td = 'padding:9px 12px;border-top:1px solid #f1f3f6;vertical-align:top;font-size:12.5px'
    tbl = ('<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden"><table style="width:100%%;border-collapse:collapse">'
           '<tr><th style="%s;width:130px">구분</th><th style="%s">App Key</th><th style="%s">N Key</th><th style="%s">서비스 티켓</th></tr>%s</table></div>'
           % (th, th, th, th, ''.join('<tr><td style="%s;font-weight:700">%s</td><td style="%s">%s</td><td style="%s">%s</td><td style="%s">%s</td></tr>'
                                      % (td, k, td, a, td, n, td, v) for k, a, n, v in rows)))
    # App Key · 계정 · 티켓 관계 `PC-247`
    box = lambda bg, fg, t, d: ('<div style="background:%s;color:%s;border-radius:9px;padding:9px 12px;min-width:150px"><b>%s</b><br><span style="font-size:12px">%s</span></div>' % (bg, fg, t, d))
    relc = ('<div style="margin-top:16px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;font-size:12.5px;line-height:1.8">'
            '<b style="font-size:14px">App Key — 고객사 · 계정 · App Key · 티켓 관계</b>'
            '<div style="display:flex;gap:10px;align-items:center;margin-top:10px">' + box('#f3f4f6', '#374151', '고객사', '계정 여러 개') + '→' +
            box('#f5f3ff', '#6d28d9', '계정', '고객사 안에 여러 개') + '→<div style="display:flex;flex-direction:column;gap:8px">' +
            box('#eef6ff', '#1d4ed8', 'App Key 1개', '계정 생성 때 자동 · 계정당 1개') + box('#ecfdf5', '#047857', '티켓 여러 개', '계정에 붙는다') + '</div></div>'
            '<ul style="margin:10px 0 0;padding-left:18px"><li>App Key 는 고객사의 <b>계정마다 1개</b></li>'
            '<li>티켓은 App Key 가 아니라 <b>계정에 매칭</b> — 한 계정에 여러 개 발급</li>'
            '<li>SOBP 가 바뀌면 App Key 는 그대로, 티켓만 더 발급</li></ul></div>')
    pick = ('<div style="margin-top:16px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;font-size:12.5px;line-height:1.9">'
            '<b style="font-size:14px">어떤 티켓을 주나</b><ul style="margin:6px 0 0;padding-left:18px">'
            '<li>Ncode SDK → <b>App Key</b></li><li>Caster U → 계정 + Caster U 권한을 켠 <b>App Key</b></li>'
            '<li>Caster Lite → <b>N Key</b>(LEGACY)</li><li>CasterN 오프라인 → <b>N Key</b>(HYBRID)</li>'
            '<li>casterN · 폼솔루션 온라인 → <b>서비스 티켓</b></li></ul></div>')
    sec = ('<div style="margin-top:16px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;font-size:12.5px">'
           '<b style="font-size:14px">N Key — 프로필 · 코드 타입별 쓸 수 있는 Section</b>'
           '<div style="margin-top:8px;font-family:ui-monospace,monospace;line-height:1.9">LEGACY · PDS2 S 0·1·2·3·14 / PDS3 S 0·3·14<br>'
           'HYBRID · PDS2 S 0·3·14 / PDS3 S 0·3·5·10·11·14·15</div></div>')
    # OID(index 전용 코드) 안내 — 옛 [OID 관리대장] 탭 설명을 여기로 `PC-325`
    oid = ('<div style="margin-top:16px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;font-size:12.5px">'
           '<b style="font-size:14px">OID — index 전용 코드</b> <span style="color:#9ca3af;font-size:12px">· 새로 발급하지 않음</span>'
           '<ul style="margin:8px 0 0;padding-left:18px;color:#374151;line-height:1.9">'
           '<li><b>OID = index 만 갖는 코드</b> — 외부 코드를 <b>우리 펜으로 읽으려고</b> 만든 방식입니다. OID 책을 우리 펜으로 찍으면 <b>코드 값이 1개만</b> 나옵니다. (옛 <b>IDS</b> 표기도 같은 것입니다)</li>'
           '<li>총량이 <b>약 60,000개</b>뿐이라, 책의 양이 많지 않으면 <b>book 으로 코드를 나누지 않습니다</b>. 업체 구분에는 S/O 를 써 왔고, 분량이 늘어난 업체만 <b>book 번호(=OID index)</b> 로 나눠 관리했습니다.</li>'
           '<li>SOBP(PDS2·PDS3·PDS4) 좌표 관리와 달리 <b>index 로만</b> 관리합니다. 좌표로 보려면 <b>SOBP 맵에서 종류 [OID]</b> 로 필터하세요.</li>'
           '<li style="color:#6b7280">OID 는 티켓을 <b>새로 발급하지 않는</b> 코드 종류입니다(위 N Key 표 참고). 이력만 남아 있습니다.</li>'
           '</ul></div>')
    common = ('<div style="margin-top:16px;border:1px solid #bfdbfe;background:#eff6ff;border-radius:10px;padding:14px 16px;font-size:12.5px;color:#1e3a8a;line-height:1.9">'
              '<b>세 티켓 공통</b> — 할당된 SOBP 안에서만 · 세 티켓끼리 SOBP 겹침 불가 · 지우지 않고 [티켓 수정] · 사용기간은 티켓에만</div>')
    return ('<p style="margin:0 0 12px;color:#6b7280;font-size:13px">고객사가 코드를 직접 쓸 때 주는 티켓은 세 가지입니다. '
            '<b>사내 편집에는 티켓이 필요 없습니다.</b></p>' + tbl + relc + pick + sec + oid + common)


def must_know():
    ul = 'margin:0;padding-left:18px;font-size:12.5px;color:#374151;line-height:1.9'
    return ('<div style="max-width:1000px">'
            '<p style="margin:0 0 16px;color:#6b7280;font-size:13px">'
            '코드 발급·편집 운영에서 반드시 알아야 할 기준. (한윤정 책임 협의 정리)</p>%s%s</div>'
            % (sect('편집 비용 산출 기준 — 페이지 + 심볼',
                    '<ul style="%s">'
                    '<li>소리펜·필기펜 <b>모두 「페이지 수 + 심볼 갯수」로 편집 비용을 산출</b>합니다.</li>'
                    '<li><b>심볼</b> = 편집(nproj)에서 (책) 영역을 설정한 편집 단위. '
                    '이 심볼에 리소스(mp3)를 매핑합니다. <b>심볼 갯수 = 작업량</b>.</li>'
                    '<li>필기펜 <b>nproj</b>는 심볼 갯수가 늘수록 서버 저장 용량도 증가 → '
                    '필기펜도 심볼 갯수 파악이 현황 확인에 도움.</li>'
                    '<li>재무팀은 이미 <b>편집 단가 협상 미팅을 완료</b>해 산출 기준을 알고 있습니다.</li>'
                    '</ul>' % ul, '1'),
               sect('산출물 · 저장 위치',
                    mini_table(['항목', '종류', '저장 위치'], [
                        [('리소스 파일 (mp3 등)', 'font-weight:600'), ('소리펜·필기펜 공통', ''),
                         ('디바이스에 저장 (서버 스토리지 ✕)', 'color:#2563eb')],
                        [('ncp2', 'font-weight:600'), ('소리펜 산출물 (좌표+mp3)', ''),
                         ('디바이스(소리펜)에 넣어야 동작', 'color:#2563eb')],
                        [('nproj + PDF + JPG + 썸네일 png', 'font-weight:600'),
                         ('필기펜 편집 파일', ''), ('서버에 등록', 'color:#047857')]]), '2')
               + sect('Ticket Version · Ticket Type — N Key 프로필 · 코드 재사용',   # 옛 「항목 구성 버전」 설명 `PC-065` 대체 `PC-257`~`PC-260`
                      '<ul style="%s">'
                      '<li>N Key 의 <b>Ticket Version</b> 은 <b>프로필</b>이다 — 발급 화면 항목명 <b>프로필 (Ticket Version)</b>.</li>'
                      '<li>N Key 의 <b>Ticket Type</b> 은 <b>코드 재사용 여부</b>이다 — 발급 화면 항목명 <b>코드 재사용 (Ticket Type)</b>.</li>'
                      '<li><b>코드 재사용은 N Key 에서만</b> 쓴다. App Key 티켓 · 서비스 티켓에는 없다.</li>'
                      '<li><b>HYBRID</b> 프로필은 <b>Page Size가 8의 배수</b>여야 발급된다.</li>'
                      '</ul>' % ul
                      + mini_table(['항목', '값', '뜻'], [
                          [('Ticket Version (프로필)', 'font-weight:700'), ('1', 'font-family:ui-monospace,monospace'), ('LEGACY — Caster Lite', '')],
                          [('', ''), ('2', 'font-family:ui-monospace,monospace'), ('HYBRID — CasterN 오프라인 · Page Size 8의 배수', '')],
                          [('Ticket Type (코드 재사용)', 'font-weight:700'), ('Unlimited', 'font-family:ui-monospace,monospace'), ('재사용 (기본)', '')],
                          [('', ''), ('Single', 'font-family:ui-monospace,monospace'), ('재사용 안 함', '')]]), '5')))


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
          '이 표에는 <b>0 · 3 · 5 · 10 · 11 · 14 · 15</b>만 있다 — '
          '<code>SOB-01</code>의 Section 목록(1 · 44 포함)과 <b>범위가 다르다</b>')] + NAV))

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
        'PRD §4.3 — <b>좌표(SOBP)가 먼저</b>이고 코드 종류(PDS3·PDS2·PDS4·OID·IDS)는 '
        '그 좌표의 속성이라는 <b>코드 체계</b>와 <b>SOBP 계층</b>을 설명한다 <code>PC-032</code>. '
        '기능 조작 없이 읽는 페이지다. 본문 최대 폭 1000px.',
        frame('INF-01', '코드 관리 정보', content(2), height=900),
        [('코드 종류 표', '조회', '—',
          'PDS3(N3C6)=<b>Ncode</b> 현행 주력 · PDS2(G3C6)=<b>Gcode</b> 구형/호환 · '
          '<b>PDS4(S-code)=Section 44</b>(owner 0~4095 · book 0~255 · page 0~255 · xy 0~255) · '
          '<b>OID</b>=인덱스 전용(같은 S/O 공유, B/P로 구분) · '
          'IDS(A)=이력 전용'),
         ('종류 규칙', '조회', '—', '<b>신규 발급</b>은 같은 S/O 에 한 종류만 <code>PC-041</code> (과거 혼용 이력은 표시 유지)'),
         ('OID 설명', '조회', '—',
          '<b>index 전용 · 코드 1개 노출 · 약 6만 개 · book 미분할</b> — 자세한 안내는 [티켓 정보] 탭 OID 카드(S7) · '
          '좌표는 SOBP 맵 [OID] 필터 <code>PC-325</code>'),
         ('펜 구분', '조회', '—', '<b>소리펜(NSP) · 필기펜(NWP)</b> 도 좌표 속성'),
         ('SOBP 계층', '조회', '—', 'S 파랑 · O 청록 · B 보라 · P 주황 4카드'),
         ('X·Y 좌표', '참고', '—',
          '<b>한 페이지 안의 위치는 추가로 X·Y 좌표로 지정됩니다. 겹침 없이 발급하는 것이 최우선.</b>')]))

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
         ('OID 좌표 조회', '이동', '<code>SOB-01</code>', 'SOBP 맵 종류 [OID] 필터')]))

    boards.append((
        'S6', '알아야 할 사항', '기본',
        'PRD §4.5 — 코드 발급·편집 운영에서 <b>반드시 알아야 할 기준</b>을 번호 붙은 섹션으로 정리한다. '
        '단가의 정본은 <code>P-16</code>이며 고객사별 단가는 <code>MEM-02</code>에서 지정한다.',
        frame('INF-01', '코드 관리 정보', content(4), height=900),
        [('① 편집 비용 산출', '조회', '—', '소리펜·필기펜 모두 <b>페이지 수 + 심볼 갯수</b> · <b>심볼 갯수 = 작업량</b>'),
         ('② 산출물·저장 위치', '조회', '—',
          'mp3·ncp2 = <b>디바이스</b>(파랑) / nproj·PDF·JPG·썸네일 = <b>서버 등록</b>(초록)'),
         ('⑤ Ticket Version · Ticket Type', '조회', '—',
          'N Key — Ticket Version = <b>프로필</b>(1 LEGACY · 2 HYBRID) · Ticket Type = <b>코드 재사용</b>(Unlimited · Single, N Key 에만) · '
          'HYBRID 는 Page Size 8의 배수 <code>PC-257</code>~<code>PC-260</code>'),
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
