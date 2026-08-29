# -*- coding: utf-8 -*-
"""PRJ-06 PUI 코드 (피지컬) — web/components/PuiView.tsx 실제 구현 기준"""
from shell import page, frame

CODE, NAME = 'PRJ-06', 'PUI 코드 (피지컬)'
PRD = 'docs/prd/PRJ-06_PUI 코드.md'

# data/pui-data.json 실제 값 (summary: sheets 6 · projects 41 · funcs 100)
ALLOCS = (('PDS3_S3_O52_아이글 출석부', 'PDS3', 3, 52, '아이글 출석부', 0, 0, 298),
          ('PDS3_S3_O1011', 'PDS3', 3, 1011, '', 2, 100, 299),
          ('PDS3_S3_O1012', 'PDS3', 3, 1012, '', 10, 0, 13),
          ('PDS3_S3_O1013', 'PDS3', 3, 1013, '', 15, 0, 208),
          ('PDS3_S3_O1013_B3087~3088', 'PDS3', 3, 1013, 'B3087~3088', 10, 0, 17),
          ('PDS3_S9999_O1', 'PDS3', 9999, 1, '', 4, 0, 5))

PROJ_1011 = (('녹음기', '', '1~50', '컨트롤러', '', '상세 기능은 배정표 참고', '상품기획실', '공식제품용'),
             ('StickyClipboard x Chrome OS', '', '51~100', 'POC 카드', '',
              '상세 기능은 배정표 참고', '상품기획실', '데모용'))

FUNCS_1011 = (('녹음/재생', '녹음', 'REC START', '녹음 시작', 1, 1, 'rec_start'),
              ('녹음/재생', '녹음', 'REC STOP', '녹음 종료', 1, 2, 'rec_stop'),
              ('녹음/재생', '플레이 조작', 'PLAY', '재생 시작', 1, 3, 'play'),
              ('녹음/재생', '플레이 조작', 'PAUSE', '일시정지', 1, 4, 'pause'),
              ('녹음/재생', '플레이 조작', 'STOP', '재생 종료', 1, 5, 'stop'),
              ('녹음/재생', '플레이 조작', 'PREVIOUS', '이전 파일', 1, 6, 'prev'),
              ('녹음/재생', '플레이 조작', 'NEXT', '다음 파일', 1, 7, 'next'),
              ('녹음/재생', '플레이 조작', 'Backward 10 sec', '10초 뒤로', 1, 8, 'rewind10s'))

PROJ_1013 = (('Papertube Controller / Smart Class Kit', '', '1.0', 'PlatePaper_컨트롤러',
              '', '', '', '3,27 로 변경 예정'),
             ('Neostudio / Controller', '', '5.0', 'Neostudio_ Controller (샘플)', '', '', '', ''),
             ('라미', '', '6.0', 'LAMY 컨트롤러 (샘플)', '', '', '', ''),
             ('TEST', '', '10.0', 'HID Test 컨트롤러', '', '', '', ''),
             ('라미', '', '11.0', 'LAMY 컨트롤러 / 네오스마트펜 컨트롤러', '', '', '', ''))


def card(inner, pad=None):
    p = ('padding:%s;' % pad) if pad else ''
    return ('<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;%s">%s</div>'
            % (p, inner))


def head_row():
    return ('<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-bottom:12px;'
            'font-size:12.5px;color:#6b7280">'
            '<b style="font-size:14px;color:#111827">PUI 코드 관리</b>'
            '<span>피지컬 조작(종이 위 컨트롤러) 프로젝트 할당 코드</span>'
            '<span>할당 <b style="color:#111827">6</b></span>'
            '<span>프로젝트 <b style="color:#111827">41</b></span>'
            '<span>기능 <b style="color:#2563eb">100</b></span></div>')


def left_col(sel='PDS3_S3_O52_아이글 출석부'):
    rows = ''
    for sheet, pds, s, o, label, np_, nf, nraw in ALLOCS:
        on = (sheet == sel)
        lb = ('<div style="font-size:11px;color:#374151;margin-top:2px">%s</div>' % label) if label else ''
        rows += ('<div style="display:block;width:100%%;text-align:left;border:1px solid %s;'
                 'background:%s;border-radius:9px;padding:8px 10px;margin:2px 0">'
                 '<div style="display:flex;align-items:center;gap:6px">'
                 '<b style="font-family:ui-monospace,monospace;font-size:12.5px;color:%s">'
                 'S%d/O%d</b>'
                 '<span style="font-size:9px;background:#eef2f7;color:#475569;border-radius:5px;'
                 'padding:2px 7px">%s</span></div>%s'
                 '<div style="font-size:10.5px;color:#9ca3af;margin-top:2px">'
                 '프로젝트 %d · 기능 %d</div></div>'
                 % ('#93c5fd' if on else '#eef0f4', '#f5f9ff' if on else '#fff',
                    '#1d4ed8' if on else '#111827', s, o, pds, lb, np_, nf))
    return card('<div style="font-size:11px;color:#9ca3af;font-weight:700;padding:2px 4px 6px">'
                'PUI 할당 (Section/Owner)</div>%s' % rows, '8px')


def sec_btn(icon_title, count, count_on, note, open_):
    tag = ('<span style="font-size:11px;background:%s;color:%s;border-radius:5px;padding:2px 7px">'
           '%s</span>' % ('#eef6ff' if count_on else '#f3f4f6',
                          '#2563eb' if count_on else '#9ca3af', count))
    nt = ('<span style="color:#9ca3af;font-size:11px">%s</span>' % note) if note else ''
    return ('<div style="width:100%%;display:flex;align-items:center;gap:8px;padding:12px 14px;'
            'text-align:left">'
            '<span style="font-weight:700;font-size:13px">%s</span>%s%s'
            '<span style="margin-left:auto;font-size:11px;color:#3b82f6">%s</span></div>'
            % (icon_title, tag, nt, '접기 ▲' if open_ else '펼치기 ▼'))


def tbl(headers, rows, minw, mono_cols=(), dim_cols=(), bold_cols=(), blue_cols=()):
    th = ''.join('<th style="text-align:left;padding:10px 12px;color:#6b7280;font-weight:600;'
                 'background:#fafbfc;font-size:11.5px">%s</th>' % h for h in headers)
    tr = ''
    for r in rows:
        tds = ''
        for i, c in enumerate(r):
            st = 'padding:10px 12px;vertical-align:top;'
            if i in mono_cols:
                st += 'font-family:ui-monospace,monospace;font-size:11.5px;'
            if i in dim_cols:
                st += 'color:#6b7280;'
            if i in bold_cols:
                st += 'font-weight:600;'
            if i in blue_cols:
                st += 'font-family:ui-monospace,monospace;color:#2563eb;'
            tds += '<td style="%s">%s</td>' % (st, c if (c is not None and c != '') else '-')
        tr += '<tr style="border-top:1px solid #eef0f4">%s</tr>' % tds
    return ('<div style="overflow-x:auto"><table style="width:100%%;border-collapse:collapse;'
            'font-size:12.5px;text-align:left;min-width:%dpx"><thead><tr>%s</tr></thead>'
            '<tbody>%s</tbody></table></div>' % (minw, th, tr))


def detail(sel='PDS3_S3_O52_아이글 출석부', open_img=True, open_func=False, open_raw=False,
           imgs=0):
    a = [x for x in ALLOCS if x[0] == sel][0]
    sheet, pds, s, o, label, np_, nf, nraw = a
    lb = ('<span style="color:#2563eb"> · %s</span>' % label) if label else ''
    if np_ == 0:
        ptbl = ('<div style="font-size:12px;color:#9ca3af">정규화된 프로젝트 표가 없습니다. '
                '아래 <b>원본 시트</b>에서 확인하세요.</div>')
    else:
        src = PROJ_1011 if o == 1011 else PROJ_1013
        ptbl = tbl(['프로젝트', 'Book', 'Page', '제품', '고객사', '메모/포함기능', '부서/발급인', '비고'],
                   src, 700, mono_cols=(1, 2), dim_cols=(5, 7), bold_cols=(0,))
    top = card('<div style="font-size:14px;font-weight:700">S%d / O%d%s</div>'
               '<div style="font-size:11.5px;color:#9ca3af;margin-top:2px">%s · 시트 %s</div>'
               '<div style="font-size:12.5px;font-weight:700;margin:14px 0 8px">'
               '프로젝트 / 할당 코드 <span style="color:#9ca3af;font-weight:400">(%d)</span></div>%s'
               % (s, o, lb, pds, sheet, np_, ptbl), '14px')

    # 이미지
    if open_img:
        if imgs:
            cells = ''.join(
                '<div style="border:1px solid #eef0f4;border-radius:10px;overflow:hidden;'
                'background:#fff"><div style="width:100%%;height:110px;background:#fafbfc;'
                'display:grid;place-items:center;color:#cbd5e1;font-size:11px">컨트롤러 시안 %d</div>'
                '<div style="display:flex;align-items:center;gap:6px;padding:6px 8px">'
                '<span style="font-size:10.5px;color:#6b7280;flex:1;overflow:hidden;'
                'text-overflow:ellipsis;white-space:nowrap">pui_ctrl_%d.png</span>'
                '<span style="color:#dc2626;font-size:11px">삭제</span></div></div>' % (i, i)
                for i in range(1, imgs + 1))
        else:
            cells = ('<div style="font-size:12px;color:#9ca3af;padding:12px;'
                     'border:1px dashed #e5e7eb;border-radius:10px;grid-column:1/-1;'
                     'text-align:center">업로드된 이미지가 없습니다. '
                     'PUI 컨트롤러 디자인/인쇄 시안을 올려보세요.</div>')
        img_body = ('<div style="padding:0 14px 14px">'
                    '<span style="display:inline-block;background:#f3f4f6;color:#374151;'
                    'border:1px solid #e5e7eb;border-radius:7px;padding:5px 10px;font-size:12px">'
                    '＋ 이미지 업로드</span>'
                    '<span style="font-size:11px;color:#9ca3af;margin-left:8px">'
                    '브라우저에 저장 · 클릭하면 크게 보기</span>'
                    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));'
                    'gap:10px;margin-top:12px">%s</div></div>' % cells)
    else:
        img_body = ''
    img_card = card(sec_btn('🖼 컨트롤러 이미지', str(imgs), imgs > 0,
                            '· 디자인 시안·인쇄물 이미지를 올려 보면서 작업', open_img) + img_body)

    # 기능 매핑
    if open_func:
        if nf:
            ftbl = tbl(['대구분', '소구분', '기능명', '요약', 'Book', 'Page', 'params'],
                       FUNCS_1011, 820, mono_cols=(4, 5), dim_cols=(0, 1),
                       bold_cols=(2,), blue_cols=(6,))
        else:
            ftbl = ('<div style="font-size:12px;color:#9ca3af">'
                    '이 할당에는 기능 매핑 표가 없습니다.</div>')
        func_body = '<div style="padding:0 14px 14px;overflow-x:auto">%s</div>' % ftbl
    else:
        func_body = ''
    func_card = card(sec_btn('⚙ 기능 매핑 (Book/Page/params)', str(nf), nf > 0, None, open_func)
                     + func_body)

    # 원본 시트
    if open_raw:
        raws = (('1', 'SECTION', '3', '', ''), ('2', 'OWNER', str(o), '', ''),
                ('3', '', '', '', ''), ('4', 'Book', 'Page', '기능', 'params'),
                ('5', '1', '1', 'REC START', 'rec_start'),
                ('6', '1', '2', 'REC STOP', 'rec_stop'))
        tr = ''
        for row in raws:
            tds = ''.join('<td style="padding:4px 8px;white-space:nowrap;max-width:200px;'
                          'overflow:hidden;text-overflow:ellipsis;color:%s">%s</td>'
                          % ('#9ca3af' if j == 0 else '#374151', c)
                          for j, c in enumerate(row))
            tr += '<tr style="border-top:1px solid #f3f4f6">%s</tr>' % tds
        raw_body = ('<div style="padding:0 14px 14px;overflow:auto;max-height:460px">'
                    '<table style="width:100%%;border-collapse:collapse;font-size:11.5px;'
                    'text-align:left"><tbody>%s</tbody></table></div>' % tr)
    else:
        raw_body = ''
    raw_card = card(sec_btn('📄 원본 시트', '%d행' % nraw, False, '· 엑셀 원본 그대로', open_raw)
                    + raw_body)

    return ('<div style="display:flex;flex-direction:column;gap:12px">%s%s%s%s</div>'
            % (top, img_card, func_card, raw_card))


def content(sel='PDS3_S3_O52_아이글 출석부', open_img=True, open_func=False, open_raw=False,
            imgs=0, toast=''):
    return ('<div style="margin:-2px">%s%s'
            '<div style="display:grid;grid-template-columns:280px 1fr;gap:12px;'
            'align-items:start">%s%s</div></div>'
            % (head_row(), toast, left_col(sel),
               detail(sel, open_img, open_func, open_raw, imgs)))


NAV = [('코드 좌표 확인', '이동', '<code>SOB-01</code>', '해당 S/O/B 위치·상태'),
       ('신규 PUI 코드 발급', '이동', '<code>SOB-02</code>', '<b>이 화면에서는 발급하지 않는다</b>'),
       ('고객사 확인', '이동', '<code>MEM-01</code>', '업체 상세')]


def build():
    boards = []

    boards.append((
        'S1', '기본 · 첫 할당 자동 선택', '기본',
        '좌측 메뉴 [서비스 관리 ▸ CasterN ▸ PUI 코드 (피지컬)]로 진입. '
        '구현은 <b>첫 할당을 자동 선택</b>한다(<code>useState(D.allocations[0].sheet)</code>) — '
        '따라서 <b>"할당 미선택" 상태는 실제로 나타나지 않는다</b>. '
        '기본 펼침 상태는 <b>이미지만 펼침</b>, 기능 매핑·원본 시트는 접힘이다. '
        '첫 할당(S3/O52 아이글 출석부)은 정규화된 프로젝트·기능 표가 없어 안내 문구가 보인다. '
        '',
        frame('PRJ-06', 'PUI 코드 (피지컬)', content(), height=900),
        [('상단 요약', '조회', '—', '할당 <b>6</b> · 프로젝트 <b>41</b> · 기능 <b>100</b>'),
         ('좌측 할당 항목', '클릭', '우측 상세 교체', 'S{n}/O{n} + PDS 배지 + 라벨 + 프로젝트/기능 건수'),
         ('프로젝트 표 없음', '표시', '—',
          '<b>정규화된 프로젝트 표가 없습니다. 아래 원본 시트에서 확인하세요.</b>'),
         ('[펼치기 ▼] · [접기 ▲]', '클릭', '섹션 토글', '이미지 · 기능 매핑 · 원본 시트'),
         ('⚠ PRD와 다름', '참고', '—',
          'PRD §5는 "할당 미선택 → <b>할당을 선택하세요.</b>"를 상태로 두지만 '
          '구현은 항상 첫 항목이 선택돼 있어 <b>도달할 수 없다</b>')] + NAV))

    boards.append((
        'S2', '프로젝트 · 기능 매핑이 있는 할당', '기본',
        'S3/O1011을 선택한 상태. <b>프로젝트 2건 · 기능 100건</b>이 있어 표가 채워진다. '
        '프로젝트 표는 최소 폭 700px, 기능 매핑 표는 820px로 <b>가로 스크롤</b>된다.',
        frame('PRJ-06', 'PUI 코드 (피지컬)',
              content(sel='PDS3_S3_O1011', open_func=True), height=1200),
        [('프로젝트 / 할당 코드', '조회', '—',
          '프로젝트 · Book · Page · 제품 · 고객사 · 메모/포함기능 · 부서/발급인 · 비고'),
         ('기능 매핑', '조회', '—',
          '대구분 · 소구분 · 기능명 · 요약 · Book · Page · <b>params</b>(파랑 고정폭)'),
         ('빈 셀', '표시', '—', '값이 없으면 <b>-</b>'),
         ('가로 스크롤', '드래그', '—', '프로젝트 700px · 기능 820px 최소 폭')] + NAV))

    boards.append((
        'S3', '컨트롤러 이미지 등록됨', '변형',
        'PRD §4.2 — 참고 이미지를 등록·확인한다. 카드 격자는 '
        '<code>repeat(auto-fill, minmax(150px, 1fr))</code>이며 클릭하면 확대된다. '
        '⚠ §7 미결 — 보관 위치(현재 브라우저 저장, 용량 제한).',
        frame('PRJ-06', 'PUI 코드 (피지컬)',
              content(sel='PDS3_S3_O1013', imgs=3), height=1000),
        [('[＋ 이미지 업로드]', '클릭', '파일 선택', '한 번에 최대 <b>8장</b>'),
         ('이미지', '클릭', '확대 보기', '<b>브라우저에 저장 · 클릭하면 크게 보기</b>'),
         ('[삭제]', '클릭', '이미지 제거', ''),
         ('개수 배지', '표시', '—', '0이면 회색, 1개 이상이면 파랑'),
         ('보관 위치', '—', '<b>미결</b>', '⚠ §7 — 서버 보관 전환 여부')]))

    boards.append((
        'S4', '원본 시트 펼침', '분기',
        'PRD §4.2 — 가공 전 엑셀 원본 행을 그대로 확인한다(최대 높이 460px 스크롤). '
        '첫 열은 회색으로 구분된다. ⚠ §7 미결 — 원본 갱신 주기·담당.',
        frame('PRJ-06', 'PUI 코드 (피지컬)',
              content(sel='PDS3_S3_O1013', open_img=False, open_raw=True), height=900),
        [('📄 원본 시트', '클릭', '펼침/접힘', '<b>{n}행</b> 배지 + <b>· 엑셀 원본 그대로</b>'),
         ('원본 표', '스크롤', '—', '최대 높이 460px'),
         ('갱신 주기·담당', '—', '<b>미결</b>', '⚠ §7 — 현재 빌드 시점 데이터'),
         ('PUI 기능 추가 시', '—', '<b>미결</b>', '⚠ §7 — 기존 Book/Page 확장 vs 신규 발급')]))

    err = ('<div style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;'
           'border-radius:9px;padding:9px 14px;font-size:12.5px;margin-bottom:12px">'
           '저장 용량 초과 — 이미지 수를 줄여주세요.</div>')
    boards.append((
        'S5', '이미지 저장 실패 (용량 초과)', '오류',
        'PRD §5 메시지 — 브라우저 저장 실패 시 상단에 <b>빨간 토스트</b>로 노출되고 '
        '4초 뒤 사라진다.',
        frame('PRJ-06', 'PUI 코드 (피지컬)',
              content(sel='PDS3_S3_O1013', imgs=3, toast=err), height=1040),
        [('상단 알림', '표시', '—', '<b>저장 용량 초과 — 이미지 수를 줄여주세요.</b>'),
         ('자동 사라짐', '4초 후', '—', ''),
         ('이미지 삭제', '클릭', '용량 확보', '')]))

    zoom = ('<div style="position:absolute;inset:0;background:rgba(15,23,42,.75);'
            'display:grid;place-items:center;z-index:60;padding:24px">'
            '<div style="background:#fff;border-radius:12px;padding:12px;max-width:92%;'
            'max-height:92%;overflow:auto">'
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">'
            '<b style="font-size:13px">controller_v3_front.png</b>'
            '<span style="flex:1"></span><span class="btn gho">닫기 ✕</span></div>'
            '<div style="width:520px;height:320px;background:#fafbfc;border:1px solid #eef0f4;'
            'border-radius:8px;display:grid;place-items:center;color:#9ca3af;font-size:12px">'
            '컨트롤러 시안 이미지</div></div></div>')
    boards.append((
        'S6', '컨트롤러 이미지 확대', '분기',
        '이미지를 클릭하면 <b>화면 전체 위에 크게</b> 열린다. '
        '파일명과 <b>[닫기 ✕]</b> 가 함께 나오고, <b>바깥 어두운 영역을 클릭해도 닫힌다</b>.',
        frame('PRJ-06', 'PUI 코드 (피지컬)',
              content(sel='PDS3_S3_O1013', imgs=3), overlay=zoom, height=1000),
        [('이미지', '클릭', '확대', '커서가 <b>돋보기(＋)</b> 로 바뀐다'),
         ('[닫기 ✕] · 바깥 영역', '클릭', '닫힘', ''),
         ('이미지 저장 위치', '참고', '—',
          '<b>브라우저에 저장</b>된다 — 서버에 올라가지 않는다'),
         ('업로드 개수', '참고', '—', '한 번에 <b>최대 8장</b>')]))

    intro = ('<b>PUI(Physical UI) = 종이 위 컨트롤러</b>에 쓰이는 코드. '
             '재생·정지·볼륨 같은 <b>피지컬 조작 기능이 어떤 Book/Page에 매핑돼 있는지</b>를 확인하는 참조 화면. '
             '구성은 <b>좌 280px 할당 목록 / 우 상세</b>이며, 상세는 '
             '<b>프로젝트·할당 코드</b> + 접었다 펼치는 <b>🖼 컨트롤러 이미지 · ⚙ 기능 매핑 · 📄 원본 시트</b> 3개 섹션이다. '
             '<b>이 화면에서는 코드를 발급하지 않는다</b>(발급은 <code>SOB-02</code>). '
             ' · 원장 데이터')
    return page(CODE, NAME, PRD, intro, boards)
