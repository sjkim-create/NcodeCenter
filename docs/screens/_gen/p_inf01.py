# -*- coding: utf-8 -*-
"""INF-01 Ncode 정보 — web/components/InfoView.tsx (+ LangSlotView · NcodeInfoView · NcodeGuideView) 기준"""
from shell import page, frame

CODE, NAME = 'INF-01', 'Ncode 정보'
PRD = 'docs/prd/INF-01_Ncode 정보.md'

TABS = ('Ncode Info', '확장 언어 슬롯', '발급 구조', '알아야 할 사항')
KEYS = ('owner', 'bookcode', 'page', 'length')

# InfoView.tsx SECTIONS — Section 0·3·5·10·11·14·15
SECTIONS = (
    (0, ('0~524,287', '0~8191', '0~1023', '600mm'), ('0~1023', '0~16383', '0~4095', '600mm')),
    (3, ('0~4095', '0~4095', '0~4095', '1500mm'), ('0~1023', '0~8191', '0~511', '2000mm')),
    (5, None, ('0~255', '0~4095', '0~4095', '1200mm')),
    (10, None, ('0~1023', '0~4095', '0~1023', '2427mm')),
    (11, None, ('0~1023', '0~8191', '0~511', '2000mm')),
    (14, ('0~4095', '0~4095', '0~1023', '9000mm'), ('0~1023', '0~8191', '0~31', '9000mm')),
    (15, None, ('0~32767', '0~4095', '0~511', '608mm')),
)

# LangSlotView.tsx PROJECTS
COMMON = {'project': 'Common', 'color': '#2563eb', 'pds': 'PDS2 (Gcode)', 'base': 21,
          'baseLangs': ['한국어', '영어', '중국어', '일본어'],
          'ext': list(range(964, 984)), 'extLabel': 'O964~O983',
          'known': {964: ['베트남어', '러시아어', '몽골어', '캄보디아어(크메르어)'],
                    965: ['스리랑카어', '필리핀어(따갈로그어)']}}
CAKE = {'project': 'Cake', 'color': '#db2777', 'pds': 'PDS3 (Ncode)', 'base': 1009,
        'baseLangs': ['한국어', '영어', '일본어', '스페인어'],
        'ext': list(range(1003, 983, -1)), 'extLabel': 'O1003~O984 (내림차순)',
        'known': {1003: ['BTS', '중국어', '인도네시아어', '러시아어']}}


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
    for s, pds2, pds3 in SECTIONS:
        bg = '#fafbfc' if s % 2 else '#fff'
        for ri, k in enumerate(KEYS):
            top = 'border-top:2px solid #e5e7eb;' if ri == 0 else ''
            secc = ('<td rowspan="4" style="text-align:center;font-weight:700;font-size:15px;'
                    'border-right:1px solid #eef0f4;background:#f6f8fb">%d</td>' % s) if ri == 0 else ''
            body += ('<tr style="background:%s;%s">%s'
                     '<td style="%s">%s</td><td style="%s">%s</td>'
                     '<td style="%s;border-left:1px solid #eef0f4">%s</td><td style="%s">%s</td></tr>'
                     % (bg, top, secc, keyc, k, valc, pds2[ri] if pds2 else '—',
                        keyc, k, valc, pds3[ri] if pds3 else '—'))
    return ('<div style="max-width:1100px">'
            '<p style="margin:0 0 12px;color:#6b7280;font-size:13px">'
            'SECTION별 코드 발급 범위. (owner · bookcode · page · length)</p>'
            '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;'
            'padding:0;overflow:auto">'
            '<table style="width:100%%;border-collapse:collapse;font-size:13px">'
            '<thead><tr><th style="%s;width:90px">SECTION</th>'
            '<th style="%s" colspan="2">PDS2 (G3C6)</th>'
            '<th style="%s" colspan="2">PDS3 (N3C6)</th></tr></thead>'
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
            '※ Section 1·44는 테스트/개발 전용(상용 미출시).</div></div></div>'
            % (hdr, hdr, hdr, body))


def owner_cards(cfg):
    owners = [(cfg['base'], True, cfg['baseLangs'])]
    for o in cfg['ext']:
        owners.append((o, False, cfg['known'].get(o, [])))
    out = ''
    n = 1
    for owner, base, langs in owners:
        slots = ''
        first = n
        for i in range(4):
            lang = langs[i] if i < len(langs) else ''
            slots += ('<div style="display:flex;gap:6px;font-size:11.5px;padding:2px 0;'
                      'align-items:baseline">'
                      '<span style="color:#9ca3af;font-family:ui-monospace,monospace;'
                      'min-width:18px;text-align:right">%d</span>'
                      '<span style="color:%s">%s</span></div>'
                      % (n, '#111827' if lang else '#94a3b8', lang or '사용가능'))
            n += 1
        tag = ('<span style="font-size:9px;background:%s;color:#fff;font-weight:700;'
               'border-radius:5px;padding:2px 7px">기본</span>' % cfg['color']) if base else ''
        out += ('<div style="border:1px solid #eef0f4;border-radius:10px;overflow:hidden;'
                'background:#fff">'
                '<div style="display:flex;align-items:center;gap:6px;padding:6px 8px;'
                'border-bottom:1px solid #eef0f4;background:%s">'
                '<b style="font-family:ui-monospace,monospace;font-size:12.5px;color:%s">O%d</b>%s'
                '<span style="margin-left:auto;font-size:10px;color:#9ca3af">슬롯 %d~%d</span></div>'
                '<div style="padding:4px 8px 6px">%s</div></div>'
                % ('#eef6ff' if base else '#fafbfc', cfg['color'] if base else '#111827',
                   owner, tag, first, n - 1, slots))
    return out, len(owners)


def proj_section(cfg):
    cards, cnt = owner_cards(cfg)
    return ('<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;'
            'padding:16px;margin-bottom:16px">'
            '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px">'
            '<span style="background:%s;color:#fff;font-weight:700;border-radius:6px;'
            'padding:3px 10px;font-size:12.5px">%s</span>'
            '<b style="font-size:14px">확장 언어 슬롯</b>'
            '<span style="color:#6b7280;font-size:12px">%s · Section 3 · 기본 O%d · 확장 %s · '
            '오너 %d개 · 오너당 4슬롯</span></div>'
            '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));'
            'gap:8px">%s</div></div>'
            % (cfg['color'], cfg['project'], cfg['pds'], cfg['base'], cfg['extLabel'], cnt, cards))


def lang_slots(flt='all'):
    pills = ''
    for f in ('all', 'Common', 'Cake'):
        on = (f == flt)
        c = '#2563eb' if f == 'Common' else ('#db2777' if f == 'Cake' else '#374151')
        pills += ('<span style="border:1px solid %s;background:%s;color:%s;border-radius:8px;'
                  'padding:5px 12px;font-size:12.5px;font-weight:700">%s</span>'
                  % (c if on else '#e5e7eb', c if on else '#fff', '#fff' if on else '#6b7280',
                     '전체' if f == 'all' else f))
    secs = ''
    for cfg in (COMMON, CAKE):
        if flt == 'all' or flt == cfg['project']:
            secs += proj_section(cfg)
    return ('<div><p style="margin:0 0 12px;color:#6b7280;font-size:13px">'
            '확장 언어 슬롯 — 기본 언어에서 언어가 확장되면 해당 언어의 확장 오너 코드를 사용합니다. '
            '오너마다 4개 슬롯.<br>출처: (소리펜)NSP_Ncode_List.xlsx '
            '「Common 추가 언어 슬롯 (964~983)」·「Cake (984~1003)」 시트.</p>'
            '<div style="display:flex;gap:6px;margin-bottom:14px">%s</div>%s</div>' % (pills, secs))


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
            % (sect('코드 구분 (PDS)', mini_table(['표기', '약칭', '설명'], [
                [('PDS3 (N3C6)', mono), ('Ncode', 'font-weight:700;color:#2563eb'),
                 ('N3C6의 <b>N</b>을 따서 Ncode. 현행 주력 코드.', '')],
                [('PDS2 (G3C6)', mono), ('Gcode', 'font-weight:700;color:#92400e'),
                 ('G3C6의 <b>G</b>를 따서 Gcode. 구형/호환 코드.', '')],
                [('S코드', 'color:#9ca3af'), ('제외', 'color:#9ca3af'),
                 ('NcodeCenter 관리 대상 아님.', 'color:#9ca3af')]])),
               sect('SOBP 계층 (코드 주소 체계)',
                    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">%s</div>'
                    '<p style="font-size:12.5px;color:#374151;margin:0">한 페이지 안의 위치는 추가로 '
                    '<b>X·Y 좌표</b>로 지정됩니다. 겹침 없이 발급하는 것이 최우선.</p>' % sobp)))


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
                         ('필기펜 편집 파일', ''), ('서버에 등록', 'color:#047857')]]), '2')))


def content(tab=0, flt='all'):
    body = {0: range_table, 1: lambda: lang_slots(flt), 2: issue_struct, 3: must_know}[tab]()
    return tabs(tab) + body


NAV = [('판형·페이지 기준 확인 후 발급', '이동', '<code>SOB-01</code> → <code>SOB-02</code>',
        '자동 추천이 이 표 기준으로 Section을 고른다'),
       ('언어 슬롯 실제 점유 확인', '이동', '<code>SOB-01</code>', '해당 Owner의 코드 상태'),
       ('단가 기준 확인 후 지정', '이동', '<code>MEM-01</code> → <code>MEM-02</code>', '고객사별 편집 단가'),
       ('편집 실적·청구액 확인', '이동', '<code>PRJ-02</code> → <code>PRJ-03</code>', '')]


def build():
    boards = []

    boards.append((
        'S1', 'Ncode Info · Section별 발급 범위', '기본',
        '좌측 메뉴 [Ncode 정보]로 진입하면 이 탭이 기본이다. 탭은 칩이 아니라 <b>밑줄 탭</b>이며 '
        '활성 탭만 파란 글씨 + 2px 밑줄이다. 표는 <b>Section 하나당 4행</b>'
        '(owner · bookcode · page · length)이고 SECTION 칸이 <code>rowspan=4</code>로 묶인다. '
        '<b>참조 전용 · 기능 없음</b> — 검증·오류 메시지가 없다. '
        '기준: <code>web/components/InfoView.tsx</code>',
        frame('INF-01', 'Ncode 정보', content(0), height=1240),
        [('탭', '클릭', '본문 교체', 'Ncode Info / 확장 언어 슬롯 / 발급 구조 / 알아야 할 사항'),
         ('length(판형)', '조회', '—',
          '<b>코드를 입힐 수 있는 최대 크기</b> — 판형이 커지면 <b>Section이 달라진다</b>'),
         ('PDS2 범위 없는 Section', '표시', '—', '값이 <b>—</b>로 표시된다 (S5·S10·S11·S15)'),
         ('안내 박스', '조회', '—', '파란 박스(#eff6ff) · <b>※ Section 1·44는 테스트/개발 전용(상용 미출시).</b>'),
         ('⚠ 수록 Section', '참고', '—',
          '이 표에는 <b>0 · 3 · 5 · 10 · 11 · 14 · 15</b>만 있다 — '
          '<code>SOB-01</code>의 Section 목록(1 · 44 포함)과 <b>범위가 다르다</b>')] + NAV))

    boards.append((
        'S2', '확장 언어 슬롯 · 전체', '기본',
        'PRD §4.2 — <b>INF-02(Common)와 INF-03(Cake)은 화면상 같은 탭</b>에서 프로젝트 필터로 전환된다. '
        '오너 카드는 <code>repeat(auto-fill, minmax(168px, 1fr))</code> 격자이며 '
        '<b>오너당 4슬롯</b>, 슬롯 번호는 프로젝트 내에서 <b>연속</b>으로 매겨진다. '
        '언어가 지정되지 않은 슬롯은 <b>사용가능</b>으로 표시된다.',
        frame('INF-01', 'Ncode 정보', content(1), height=2000),
        [('[전체] / [Common] / [Cake]', '클릭', '프로젝트 필터', 'Common 파랑 · Cake 자홍'),
         ('Common', '조회', '—', 'PDS2(Gcode) · Section 3 · 기본 <b>O21</b> · 확장 <b>O964~O983</b> · 오너 21개'),
         ('Cake', '조회', '—', 'PDS3(Ncode) · Section 3 · 기본 <b>O1009</b> · 확장 <b>O1003~O984(내림차순)</b> · 오너 21개'),
         ('기본 오너 카드', '표시', '—', '머리 배경 #eef6ff + <b>기본</b> 배지'),
         ('사용가능 슬롯', '표시', '—', '언어 미지정 슬롯'),
         ('실제 점유 확인', '이동', '<code>SOB-01</code>', '해당 Owner의 코드 상태'),
         ('탭 분리 여부', '—', '<b>미결</b>', '⚠ §7 — 별도 탭으로 분리할지'),
         ('데이터 갱신 경로', '—', '<b>미결</b>', '⚠ §7 — 현재 원본 엑셀 기준')]))

    boards.append((
        'S3', '확장 언어 슬롯 · Cake 필터', '필터',
        '프로젝트 필터로 <b>Cake</b>만 본 상태. 활성 칩은 프로젝트 색(자홍 #db2777)으로 채워진다.',
        frame('INF-01', 'Ncode 정보', content(1, 'Cake'), height=1100),
        [('[Cake]', '클릭', 'Cake만 표시', ''),
         ('[전체]', '클릭', 'S2 복귀', ''),
         ('기본 Owner', '조회', '—', 'O1009 (한국어·영어·일본어·스페인어)'),
         ('확장 순서', '조회', '—', 'O1003 → O984 <b>내림차순</b>')]))

    boards.append((
        'S4', '발급 구조', '기본',
        'PRD §4.3 — PDS2(Gcode)·PDS3(Ncode)의 <b>코드 체계·구분</b>과 <b>SOBP 계층</b>을 설명한다. '
        '기능 조작 없이 읽는 페이지다. 본문 최대 폭 1000px.',
        frame('INF-01', 'Ncode 정보', content(2), height=900),
        [('코드 구분 표', '조회', '—',
          'PDS3(N3C6)=<b>Ncode</b> 현행 주력 · PDS2(G3C6)=<b>Gcode</b> 구형/호환 · '
          '<b>S코드는 NcodeCenter 관리 대상 아님</b>'),
         ('SOBP 계층', '조회', '—', 'S 파랑 · O 청록 · B 보라 · P 주황 4카드'),
         ('X·Y 좌표', '참고', '—',
          '<b>한 페이지 안의 위치는 추가로 X·Y 좌표로 지정됩니다. 겹침 없이 발급하는 것이 최우선.</b>')]))

    boards.append((
        'S5', '알아야 할 사항', '기본',
        'PRD §4.4 — 코드 발급·편집 운영에서 <b>반드시 알아야 할 기준</b>을 번호 붙은 섹션으로 정리한다. '
        '단가의 정본은 <code>P-16</code>이며 고객사별 단가는 <code>MEM-02</code>에서 지정한다.',
        frame('INF-01', 'Ncode 정보', content(3), height=900),
        [('① 편집 비용 산출', '조회', '—', '소리펜·필기펜 모두 <b>페이지 수 + 심볼 갯수</b> · <b>심볼 갯수 = 작업량</b>'),
         ('② 산출물·저장 위치', '조회', '—',
          'mp3·ncp2 = <b>디바이스</b>(파랑) / nproj·PDF·JPG·썸네일 = <b>서버 등록</b>(초록)'),
         ('단가 지정하러 가기', '이동', '<code>MEM-01</code> → <code>MEM-02</code>', ''),
         ('SOBP 실시간 발급', '—', '<b>미구현</b>', '⚠ §7 — 이 메뉴의 탭으로 넣을지 협의')]))

    intro = ('코드 발급·편집 업무에 필요한 <b>참조 정보</b>를 <b>밑줄 탭 4개</b>로 제공한다 — '
             'Ncode Info(Section별 발급 범위) · 확장 언어 슬롯 · 발급 구조 · 알아야 할 사항. '
             '<b>참조 전용 · 기능 없음</b>이며 권한은 전 역할(STAFF / ADMIN). '
             '탭 2~4는 각각 <code>LangSlotView</code> · <code>NcodeInfoView</code> · '
             '<code>NcodeGuideView</code>를 <code>embedded</code>로 불러 쓴다. '
             '기준: <code>web/components/InfoView.tsx</code>')
    return page(CODE, NAME, PRD, intro, boards)
