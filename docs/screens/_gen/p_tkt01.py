# -*- coding: utf-8 -*-
"""TKT-01 App Key 관리 — 「고객사 | App Key 계정 | 계정 상세」 3단 한 화면 `PC-146` `PC-153` `PC-158`

옛 TKT-01(계정 발급 목록) + 옛 TKT-02(계정 등록·수정)을 한 화면으로 합쳤다.
고객사 = 고객사 관리(MEM-01) 고객사를 불러온다. 계정 = App Key 계정(계정 ↔ App Key 매칭) — 서비스 계정과 별개.
그림 조각은 kws.py(= web/components/KeyWorkspaceUI.tsx)와 같다.
"""
from shell import page, frame
import kws
from kws import tg, fld, MONO

CODE, NAME = 'TKT-01', 'App Key 관리'
PRD = 'docs/prd/TKT-01_App Key 관리.md'
FT = 'App Key 관리 (계정 발급)'
NOTE = '고객사는 고객사 관리에서 불러옵니다 · App Key 계정은 서비스 계정과 별개입니다'

COS = ('(주)투이아이앤씨', '네오랩', '맥컬리', '스콜라스틱', '에듀프레소', '영업용 테스트 코드', '유니메이션',
       'iuEdu', 'Liangshishu-111', 'Luginbühl & Cie SA (TruxReport)', 'NHN EDU', 'Study123', 'Tranwisdom', 'Xiom Healthcare-304')
KEY29 = '32b019140790385d8cb6fa32d9b81'   # 영문 소문자 · 숫자 29자 `PC-066` `PC-207`
RANGES = (('3', '291', '0~249', '0~511'), ('3', '942', '73', '0~512'), ('3', '291', '250~299', '0~511'))


def head_(unlinked=0):
    return (kws.title('App Key 관리', '집계 대상 <b style="color:#111827">전체 고객사</b>', NOTE) +
            kws.stats([('발급 고객사', '14곳', '#111827'), ('App Key 계정', '14개', '#111827'),
                       ('App Key 연동', '14개', '#2563eb'), ('App Key 없음', '1개', '#92400e'),
                       ('고객사 미연결', '%d개' % unlinked, '#b45309' if unlinked else '#9ca3af')]) + filter_bar())


def filter_bar(bill='', q='', hits=None):
    """필터 줄 — N Key 관리 필터 줄과 같은 모양 `PC-266` · 출처 칩 없음 `PC-267`"""
    b = ''.join(kws.chip(x, bill == v) for v, x in (('', '정산 전체'), ('미정', '미정'), ('유료', '유료'), ('무료', '무료')))
    filt = bool(bill or q)
    return ('<div style="%s;padding:10px 12px;margin-bottom:12px;display:flex;gap:8px;align-items:center;font-size:12.5px">'
            '<b style="color:#374151">필터</b><div style="display:flex;gap:4px">%s</div>'
            '<div class="inp%s" style="width:260px">%s</div>%s<span style="flex:1"></span>%s</div>'
            % (kws.CARD, b, '' if q else ' ph', q or '고객사 · 계정 ID · 티켓 이름 검색',
               '<span class="lnk">필터 해제</span>' if filt else '',
               ('<span style="color:#6b7280">계정 <b style="color:#111827">%s개</b> · 고객사 <b style="color:#111827">%s곳</b></span>' % hits) if (filt and hits) else ''))


# 상위 고객사(공통코드 보유) → (하위 수, 보이는 하위 고객사) — ▶ 로 접고 편다 `PC-196` `PC-198`
GROUPS = {'네오노트-1012': (31, ('네스프레소', '네오랩컨버전스', '라미', '메가로이어스', '메가엠디', '스콜라스틱')),
          '네오노트-3-27': (149, ()), 'Common-21': (50, ())}
ORDER = ('(주)투이아이앤씨', '네오노트-1012', '네오노트-3-27', '네오랩', '맥컬리', '스콜라스틱', '에듀프레소', '영업용 테스트 코드',
         '유니메이션', 'Common-21', 'iuEdu', 'Liangshishu-111', 'Luginbühl & Cie SA (TruxReport)', 'NHN EDU', 'Study123', 'Tranwisdom',
         'Xiom Healthcare-304')


def left(sel='Study123', view='issued', search='', names=None, empty='', unlinked=None, h=670, open_=None):
    if names is None:
        names = ORDER
    rows = []
    for n in names:
        if n in GROUPS:   # 상위 고객사 — 하위 고객사가 발급받았으면 [발급 고객사]에도 보인다
            cnt, subs = GROUPS[n]
            rows.append(kws.co_group(n, 0, n == sel, cnt, [(x, 1 if x in COS else 0, x == sel) for x in subs],
                                     open_=(open_ == n), more=cnt - len(subs)))
        else:
            rows.append((n, 1 if n in COS else 0, n == sel, 0, False))
    if not search:   # 맨 위 「전체」 — N Key 관리와 같게 `PC-269`
        rows.insert(0, ('전체', 14, sel == '전체', 0, True))
    return kws.co_col(rows, h, view=view, issued=14, total=536, count=len(names),
                      search=search, empty=empty, unlinked=unlinked)


def acc_card(name, mail, key=True, n=2, seeded=True, on=False, date='', ledger_co=''):
    k = tg('App Key', '#f5f3ff', '#6d28d9') if key else tg('미발급', '#f3f4f6', '#9ca3af')
    # 제목 = 계정 ID — 이름은 티켓에 붙는다(티켓 이름) · 담당자명은 있을 때만 `PC-267`
    return kws.item('<b style="font-size:13.5px;word-break:break-all">%s</b>%s%s'
                    '<div style="display:flex;align-items:center;gap:6px;margin-top:7px">%s%s%s'
                    '<span style="margin-left:auto;font-size:11px;color:#9ca3af">%s</span></div>'
                    % (mail, ('<div style="font-size:11.5px;color:#6b7280;margin-top:2px">담당자 %s</div>' % name) if name else '',
                       ('<div style="font-size:11.5px;color:#b45309;margin-top:2px">대장 고객사명: %s</div>' % ledger_co) if ledger_co else '',
                       k, tg('코드 범위 %d' % n, '#eef6ff', '#2563eb') if n else '',
                       tg('대장', '#f3f4f6', '#9ca3af') if seeded else '', date), on=on)


STUDY = ('study123', 'tony@study123.com.tw')


def mid(co='Study123', cards=None, adding=False, off=False, h=670, warn=''):
    body = ('<div style="font-size:12px;color:#6b7280;margin-bottom:8px">%s</div>' % co) if co else ''
    if warn:
        body += '<div style="font-size:11.5px;color:#b45309;margin-bottom:8px;line-height:1.6">%s</div>' % warn
    if adding:
        body += kws.draft_card('새 계정', '오른쪽에서 계정 정보를 입력하고 [계정 추가]를 누르세요.')
    if cards is None:
        cards = [acc_card(*STUDY, on=not adding)]
    body += ''.join(cards)
    if not cards and not adding:
        body += kws.empty('App Key 계정이 없습니다.<br>[＋ 계정 추가]로 등록하세요.' if co else '왼쪽에서 고객사를 고르세요.')
    return kws.mid_col('App Key 계정', '%d개' % len(cards), '＋ 계정 추가', body, h, btn_off=off)


# 탭 — 발급 내역(첫 탭) · App Key 발급 · 정산 · 계정 정보 `PC-178` `PC-200`
# 탭 — App Key 와 티켓은 다른 개념 `PC-208`: App Key · 권한 / 티켓 발급 · 티켓 내역 · 정산 / 계정 정보
# App Key 는 계정을 만들 때 자동 생성(1계정 1키) — 탭 없이 [계정 정보]에 보인다 `PC-210`
# 탭 순서 — 티켓 내역 · 티켓 발급 · 정산 · 계정 정보 · 권한 `PC-211`
ACC_TABS = (('hist', '티켓 내역', '2'), ('ticket', '티켓 발급', ''), ('bill', '정산', '미정 1'), ('info', '계정 정보', ''), ('perm', '권한', '12/20'))
# App Key 권한 20항목 — web/lib/appKeyPerms.ts 와 같은 순서 `PC-207` (값 = 스콜라스틱 대장 예)
PERMS = (('Project', 'Project/New/Enabled', False, '새 프로젝트'), ('', 'Project/Review/Enabled', False, '프로젝트 리뷰 기능'),
         ('Edit', 'Edit/Symbol/Enabled', True, '심볼편집'), ('', 'Edit/Symbol/RectWithText/Create/Enabled', True, '사각형 생성 (PDF 배경 텍스트 함께 추출), 사전 편집용'),
         ('', 'Edit/Resource/Add/Enabled', True, '음성펜용 리소스 추가'), ('', 'Edit/Resource/Delete/Enabled', True, '음성펜용 리소스 삭제'),
         ('', 'Edit/Resource/DragDrop/Enabled', True, '음성펜용 리소스 Drag & Drop'),
         ('Export', 'Export/NcodePDF/Enabled', False, 'Ncode PDF 익스포트'), ('', 'Export/NCP/Enabled', True, 'NCP2 익스포트'),
         ('', 'Export/PackageForApp/Enabled', True, 'App용 패키지 익스포트'), ('', 'Export/NcodePDF/CustomExport4HyundaiMotor/Enabled', False, '현대차 전용 커스텀 익스포트 모드'),
         ('Settings', 'Settings/Ncode/Enabled', False, 'Ncode 설정'), ('', 'Settings/Project/Enabled', True, 'Project 설정'),
         ('', 'Settings/PageAttrForApp/Enabled', True, 'App용 페이지 설정 (보이기/안보이기)'), ('', 'Settings/PageAlias/Import/Enabled', True, '페이지 별명 .csv 가져오기'),
         ('', 'Settings/ActionTable/Import/Enabled', True, '심볼 액션 명칭 .csv 가져오기'), ('', 'Settings/DrawingPreset/Configure/Enabled', False, '툴바 드로잉 명령 재구성'),
         ('Tool', 'ResourcesView/Tool/Enabled', True, '리소스 뷰의 툴 기능'), ('Ncode', 'Ncode/Mode/ExtendedBookCode/Enabled', False, 'Ncode 확장모드 (book code에 owner+book)'),
         ('Nproj', 'Nproj/Writer/StartPageSideAttr/Enabled', False, '.nproj 시작페이지 면(side) 속성 기록'))


def perm_tab():
    """권한 탭 — 분류 · Permission · 값(true / false) · 설명 `PC-207`"""
    seg = ('<span style="display:inline-flex;border:1px solid #e5e7eb;border-radius:7px;overflow:hidden;font-size:11.5px;%s">'
           '<span style="padding:3px 10px;%s">true</span><span style="padding:3px 10px;border-left:1px solid #e5e7eb;%s">false</span></span>' % (MONO, '%s', '%s'))
    on_t, on_f, off = 'background:#dcfce7;color:#166534;font-weight:700', 'background:#f3f4f6;color:#374151;font-weight:700', 'color:#c7cdd6'
    tr = ''.join('<tr style="border-top:1px solid %s;background:%s"><td style="padding:6px 10px;font-weight:600">%s</td>'
                 '<td style="padding:6px 10px;%s;font-size:11.5px">%s</td><td style="padding:4px 10px;text-align:center">%s</td>'
                 '<td style="padding:6px 10px;color:#6b7280;font-size:12px">%s</td></tr>'
                 % ('#e5e7eb' if g else '#f3f4f6', '#fff' if v else '#fafbfc', g, MONO, k,
                    seg % ((on_t, off) if v else (off, on_f)), d) for g, k, v, d in PERMS)
    n = sum(1 for p in PERMS if p[2])
    return ('<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:12px;color:#6b7280">'
            '<b style="font-size:13.5px;color:#111827">App Key 권한</b><span style="color:#9ca3af" title="Caster U 권한">ⓘ</span><span>true <b style="color:#166534">%d</b> / 20</span><span style="flex:1"></span>'
            '<span class="btn gho" style="padding:4px 10px;font-size:11.5px">모두 true</span><span class="btn gho" style="padding:4px 10px;font-size:11.5px">모두 false</span></div>'
            '<div style="border:1px solid #eef0f4;border-radius:10px;overflow:hidden"><table style="font-size:12.5px;width:100%%">'
            '<tr><th style="width:76px">분류</th><th>Permission</th><th style="width:110px;text-align:center">값</th><th>설명</th></tr>%s</table></div>'
            '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px"><span class="btn gho" style="opacity:.5">취소</span><span class="btn pri">권한 저장</span></div>'
            % (n, tr))




KEY_OLD = '4f2a9c0e1b7d3a5f8e6c2b9d0a1f3'   # 이전 정책으로 생성된 두 번째 키(예)


def key_rows(keys2=False):
    """계정 정보의 App Key — 1계정 1키. 이전 정책으로 2개면 둘 다 `PC-210`"""
    ks = [(KEY29, '2026-10-22')] + ([(KEY_OLD, '2024-03-02')] if keys2 else [])
    rows = ''.join('<div style="display:flex;align-items:center;gap:8px;border:1px solid #e5e7eb;background:#f7f8fa;border-radius:8px;padding:7px 10px;margin-bottom:6px;font-size:12.5px">'
                   '%s<b style="%s;color:#2563eb">%s</b><span class="btn sm">복사</span><span style="flex:1"></span><span style="color:#9ca3af;font-size:11.5px">생성 %s</span></div>'
                   % (('<span style="font-size:11px;color:#9ca3af;font-weight:700">%d</span>' % (i + 1)) if keys2 else '', MONO, k, d)
                   for i, (k, d) in enumerate(ks))
    if keys2:
        rows += '<div style="font-size:11.5px;color:#b45309">이전 정책으로 App Key 가 2개 생성된 계정입니다 — 앞으로는 1계정 1앱키이며 새 키는 만들지 않습니다.</div>'
    return ('<div style="grid-column:1/-1"><div class="fld"><span class="lbl">%s</span>%s</div></div>'
            % ('App Key (2개 · 이전 정책)' if keys2 else 'App Key', rows))


def info_tab(new=False, co='Study123', id_val='', err='', keys2=False):
    gen = '<span class="btn sm">임의 생성</span>'
    if new:
        g = (fld('고객사 *', co, ro=True) + fld('NAME (담당자명)', '', ph=True) +
             fld('ID (이메일) *', id_val or 'user@company.com', ph=not id_val, err=bool(err)) +
             fld('PWD (비밀번호) *', '비밀번호 미요청 시 임의 생성', ph=True, extra=gen) +
             fld('PHONE (전화번호)', '010-0000-0000', ph=True) + fld('HOMEPAGE (홈페이지)', 'https://', ph=True) +   # PHONE `PC-209`
             '<div style="grid-column:1/-1">' + fld('ADDR (주소)', '주소', ph=True) + '</div>' +
             '<div style="grid-column:1/-1">' + fld('App Key', '[계정 추가] 때 자동 생성 (영문 소문자 · 숫자 29자 · 1계정 1키)', ro=True) + '</div>')   # `PC-210`
        head = kws.sec_head('계정 정보', '· 키 발급 계정 · [계정 추가] 때 App Key 자동 생성')
        note = ''
    else:
        g = (fld('고객사', co, ro=True) + fld('NAME (담당자명)', 'study123') +
             fld('ID (이메일)', STUDY[1], ro=True, mono=True) + fld('PWD (비밀번호)', '대장 참조', ph=True, extra=gen) +
             fld('PHONE (전화번호)', '02-0000-0000') + fld('HOMEPAGE (홈페이지)', 'https://', ph=True) +   # PHONE `PC-209`
             '<div style="grid-column:1/-1">' + fld('ADDR (주소)', '', ph=True) + '</div>' + key_rows(keys2))
        head = kws.sec_head('계정 정보', '· ID(email) · 고객사는 변경할 수 없습니다')
        note = ('<div style="font-size:11.5px;color:#6b7280;background:#fafbfc;border:1px dashed #e5e7eb;border-radius:8px;'
                'padding:9px 12px;margin-top:12px">사용기간(시작·끝)은 계정 속성이 아니라 <b>티켓마다 유지되는 기간</b>입니다. '
                '<b>[티켓 발급]</b> 탭에서 <b>티켓을 발급할 때</b> 함께 지정합니다.</div>')
    return head + '<div class="g2">' + g + '</div>' + note


def issue_form(sel=None, open_=False, new=False, ranges=RANGES):
    r = sel
    # 2열 짝 묶음 — 코드 구간 · 티켓 속성 · 기간 · 버전(N Key 발급과 같은 모양) `PC-223`
    sec = lambda t, body, g='g2': ('<div style="margin-top:%dpx">%s<div class="%s" style="gap:10px 12px">%s</div></div>'   # 제목 '' 이면 제목 줄 없음 `PC-235`
                                   % (16 if t else 12, ('<div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #f1f3f6">%s</div>' % t) if t else '', g, body))   # 코드 구간 = g4 한 줄 `PC-227`
    fields = (sec('', fld('Valid From Time (사용기간 시작)', '2026-10-23') +   # 모든 줄 4칸 격자 `PC-236`
                  '<div class="fld"><span class="lbl">Valid Until Time (기한) <span style="color:#374151;font-size:11.5px">☑ 무제한</span></span><div class="inp"><span style="color:#9ca3af">연도-월-일</span></div></div>', 'g4') +
              sec('', fld('Start Book (시작 북코드)', r[2].split('~')[0] if r else '', ph=not r) + fld('Book 볼륨 (권)', '250' if r else '', ph=not r) +
                  fld('Start Page', '1 (기본)') + fld('Page 볼륨', '512'), 'g4') +
              sec('', fld('Ticket Version', '1', ro=True), 'g4') +   # `PC-234` · Ticket Type(= 코드 재사용)은 N Key 에만 `PC-259`
              # 티켓 이름 — .nkey 파일명 규칙으로 만든 제안 이름을 placeholder 로 `PC-261`
              sec('티켓 속성', '<div style="grid-column:1/-1">' + fld('Ticket Name (티켓 이름)',
                      ('Study123_%ss_%so_250b_512p_20261023' % (r[0], r[1])) if r else '{고객사}_{S}s_{O}o_{Book 볼륨}b_{Page 볼륨}p_{발급일}', ph=True, mono=True) + '</div>' +
                  fld('Code Type (발급 범위 따름)', 'PDS3' if r else '-', ro=True) +
                  fld('Owner Size', '1' if r else '-', ro=True) +
                  '<div style="grid-column:span 2">' + fld('Info (티켓 메모)', 'sample' if r else '예) sample · 2026 교재용', ph=not r) + '</div>', 'g4'))
    summ = ('<div style="font-size:11.5px;color:#6b7280;margin-top:6px">발급 범위 <b>PDS3 S3/O291/B0~249</b> · 250권 · <b>P1~512</b> · 기간 즉시~무제한</div>'
            if r else '')
    lab = ('<div style="font-size:12px;color:#6b7280;margin-bottom:6px">발급 범위 (Caster 대장 이력 · SOBP 할당)%s '
           '<span style="color:#9ca3af">(선택하면 Section·Owner·Book·Code Type 이 자동으로 채워집니다 · %s)</span></div>'
           % ('' if new else ' *', '선택하지 않으면 계정만 등록합니다' if new else '사용기간을 함께 지정합니다'))
    usage = kws.usage_box('3', '291', ['250~299'], [('App Key', 'Study123', '0~249', '0~511')]) if r else ''   # 구간 사용 현황 `PC-195`
    return lab + kws.range_picker(open_, sel, ranges) + usage + fields + summ


# 발급 내역 줄 — (종류, S, O, B, P, 권수, 발급일, 정산 배지)
HIST = (('PDS3', '3', '291', '0~249', '0~511', '250권', '', kws.tg('유료 1,200,000원', '#dbeafe', '#1d4ed8')),
        ('PDS3', '3', '942', '73', '0~512', '1권', '', kws.bill_tag('미정')))
TRAN = (('PDS3', '0', '305', '39', '0~511', '1권', '', kws.bill_tag('미정')), ('PDS3', '3', '1012', '3070~3076', '0~511', '7권', '', kws.bill_tag('미정')),
        ('PDS3', '3', '1012', '3092~3123', '0~511', '32권', '', kws.bill_tag('미정')), ('PDS3', '3', '1012', '3219~3318', '0~511', '100권', '', kws.bill_tag('미정')),
        ('PDS3', '3', '942', '73', '0~511', '1권', '', kws.bill_tag('미정')))


def hist_tab(rows=HIST, sel_idx=0, open_=False, key='', co='Study123', mail=None):
    """발급 내역 탭 — 지금까지 발급한 티켓을 한 줄씩. 줄을 누르면 그 아래 Key 정보 `PC-120` `PC-200`"""
    li = ''
    for i, (kd, s_, o, b, p_, vol, at, bill) in enumerate(rows):
        info = 'sample' if i == 0 else ''
        on = i == sel_idx
        li += ('<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;%s%s">'
               '<span style="width:18px;flex:0 0 18px;padding-top:2px;font-size:11.5px;font-weight:700;color:%s">%d</span>'
               '<div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">'
               '<b style="font-family:ui-monospace,monospace;font-size:11.5px;color:#1d4ed8">%s</b>%s%s</div>'
               '<div style="display:flex;align-items:center;gap:6px;margin-top:5px;font-size:11.5px;color:#6b7280">'
               '%s%s<span style="color:#d1d5db">·</span><span>%s</span><span style="color:#d1d5db">·</span>'
               '<span>기한 <b style="font-family:ui-monospace,monospace;color:#374151">991231</b></span><span style="color:#d1d5db">·</span><span>즉시 ~ 무제한</span></div></div>'
               '%s'   # 줄의 [수정] 없음 — [티켓 수정]은 Key 정보 아래 오른쪽 `PC-238`
               '<span style="font-size:10px;color:#9ca3af;padding-top:5px;%s">▶</span></div>'
               % ('border-top:1px solid #f1f3f6;' if i else '', 'background:#f0f7ff' if on else 'background:#fff',
                  '#2563eb' if on else '#9ca3af', i + 1, kd, kws.sobp_chips(kd, s_, o, b, p_),
                  ('<span style="font-size:11.5px;color:#374151">%s</span>' % info) if info else '',
                  ('<span style="%s">%s</span>' % (MONO, at)) if at else '', tg('대장', '#f3f4f6', '#6b7280', False) if not at else '',
                  vol, bill, 'transform:rotate(90deg)' if (on and open_) else ''))
        if on and open_:
            li += '<div style="padding:10px 12px 12px;background:#fbfdff;border-top:1px solid #e0ecff">' + key_info(i, co=co, mail=mail, row=rows[i]) + '<div style="display:flex;justify-content:flex-end;margin-top:18px;padding-top:14px;border-top:1px solid #eef0f4"><span class="btn pri">티켓 수정</span></div>' + '</div>'
    top = ('<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:12px;color:#6b7280">'
           '<b style="font-size:13.5px;color:#111827">발급 내역</b><span>티켓 <b style="color:#111827">%d</b>건</span>'
           '<span style="color:#dc2626">정산 미정 %d</span><span style="flex:1"></span>%s</div>'
           % (len(rows), sum(1 for x in rows if '미정' in x[7]),
              ('App Key <b style="%s;color:#374151">%s</b>' % (MONO, key)) if key else tg('App Key 미기재', '#fef3c7', '#92400e')))
    return top + '<div style="border:1px solid #eef0f4;border-radius:10px;overflow:hidden">%s</div>' % li


def key_info(sel_idx=0, co='Study123', mail=None, row=None):
    r = row or HIST[sel_idx]
    kd, s_, o, b, p_ = r[:5]
    b0, b1 = (b.split('~') + [b])[:2]
    pv = p_.split('~')
    # Key 정보 = 발급 폼과 같은 항목명 · 같은 내용(폼 순서) · Period 대신 Valid Until Time `PC-265`
    rows = (('Section', s_), ('Owner', o), ('Valid From Time', '2026-07-01' if sel_idx == 0 else '-'), ('Valid Until Time', '무제한'),
            ('Start Book', b0), ('Book 볼륨', r[5].replace('권', '')), ('Start Page', pv[0]), ('Page 볼륨', int(pv[-1]) - int(pv[0]) + 1 if pv[-1].isdigit() and pv[0].isdigit() else '-'),
            ('Ticket Version', '1'), ('Ticket Name', '-'), ('Code Type', kd), ('Owner Size', '1'),
            ('Info', 'sample' if sel_idx == 0 else '-'),
            ('Company Name', co), ('Account Id', mail or STUDY[1]), ('App Key', '미기재'))
    return ('<div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:6px">Key 정보 '
            '<span style="font-weight:400;color:#9ca3af">· %s S%s/O%s/B%s/P%s</span></div>' % (kd, s_, o, b, p_) + kws.kv_table(rows))


def bill_tab(sel_idx=0):
    """정산 탭 — 티켓(코드 범위)을 고르고 그 정산을 등록한다 `PC-177` `PC-178`"""
    rows = (('PDS3 S3/O291/B0~249/P0~511', kws.tg('유료 1,200,000원', '#dbeafe', '#1d4ed8')),
            ('PDS3 S3/O942/B73/P0~512', kws.bill_tag('미정')))
    li = ''.join('<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;margin-bottom:4px;border-radius:8px;'
                 'border:1px solid %s;background:%s;font-size:12px"><span style="color:%s;font-weight:700">%s</span>'
                 '<span style="%s;color:#374151">%s</span><span style="color:#6b7280">즉시 ~ 무제한</span><span style="flex:1"></span>%s</div>'
                 % ('#93c5fd' if i == sel_idx else '#eef0f4', '#f0f7ff' if i == sel_idx else '#fff',
                    '#2563eb' if i == sel_idx else '#d1d5db', '▸' if i == sel_idx else '·', MONO, t, b)
                 for i, (t, b) in enumerate(rows))
    # 연간 라이선스는 오른쪽 칸 맨 위 탭으로 옮겼다 `PC-257`
    return (kws.sec_head('정산할 티켓', '· 티켓마다 등록 · 미정 1건') + li +
            (kws.billing_box() if sel_idx == 0 else kws.billing_box('미정', note='', last='—')))


def key_panel(nokey=False, issued=''):
    """App Key 탭 — 키 값 · 복사 · 발급일 / 키가 없으면 [App Key 발급](범위 없음) `PC-208`"""
    if nokey and not issued:
        return ('<div style="border:1px dashed #e5e7eb;border-radius:10px;padding:18px 16px;font-size:12.5px;color:#6b7280;display:flex;align-items:center;gap:12px">'
                '<div style="flex:1;line-height:1.7">이 계정에는 App Key 가 없습니다. App Key 는 <b>계정당 1개</b>이며 범위(SOBP) 없이 키만 발급합니다.<br>'
                '티켓은 App Key 를 발급한 뒤 <b>[티켓 발급]</b> 탭에서 발급합니다.</div><span class="btn pri">App Key 발급</span></div>')
    key = issued or KEY29
    out = ('<div style="border:1px solid #eef0f4;background:#fafbfc;border-radius:10px;padding:12px 14px;font-size:12.5px">'
           '<div style="display:flex;align-items:center;gap:10px"><span style="color:#6b7280">App Key</span>'
           '<b style="%s;color:#2563eb;font-size:13.5px">%s</b><span class="btn sm">복사</span><span style="flex:1"></span>'
           '<span style="color:#9ca3af;font-size:11.5px">발급 2026-10-22</span></div>'
           '<div style="color:#6b7280;font-size:11.5px;margin-top:8px">계정당 1개 — 새 App Key 는 발급하지 않습니다. SOBP 가 바뀌면 <b>[티켓 발급]</b>에서 티켓을 더 발급하세요.</div></div>'
           % (MONO, key))
    if issued:
        out += ('<div style="margin-top:12px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 14px;font-size:12.5px;line-height:1.9">'
                '<div style="font-size:12px;color:#92400e;font-weight:700">발급 완료 — App Key (서비스 DB 등록됨)</div>'
                '<div>계정 ID: <span style="%s">%s</span></div><div>PWD: <span style="%s">대장 참조</span></div>'
                '<div style="display:flex;align-items:center;gap:8px">App Key: <span style="%s;flex:1">%s</span><span class="btn sm">전체 복사</span></div></div>'
                % (MONO, STUDY[1], MONO, MONO, issued))
    return out


def detail(tab='hist', sel_idx=0, open_=False, picked=False, issued_key='', toast='', dirty=False, acc=None, rows=HIST, co='Study123', nokey=False, keys2=False, lic=None):
    name, mail = acc or STUDY
    t = kws.tabs(tuple((v, lb, (str(len(rows)) if v == 'hist' else bd)) for v, lb, bd in ACC_TABS), tab)
    if tab == 'info':
        body = info_tab(keys2=keys2) + (key_panel(False, issued_key)[key_panel(False, issued_key).index('<div style="margin-top:12px;background:#fffbeb'):] if issued_key else '')
    elif tab == 'bill':
        body = bill_tab(sel_idx)
    elif tab == 'hist':
        body = hist_tab(rows, sel_idx, open_, key=issued_key, co=co, mail=mail)
    elif tab == 'perm':
        body = perm_tab()
    elif tab == 'key':   # App Key — 계정당 1개 · 범위 없이 키만 `PC-208`
        body = kws.sec_head('App Key', '· 계정당 1개 · 발급된 키 %d개' % (0 if nokey else 1)) + key_panel(nokey, issued_key)
    else:   # 티켓 발급 — App Key 가 있는 계정에만 `PC-208`
        body = (kws.sec_head('티켓 발급', '· 계정 소속 · 발급된 티켓 2개') + (
            '<div style="border:1px dashed #e5e7eb;border-radius:10px;padding:28px 16px;font-size:12.5px;color:#9ca3af;text-align:center;line-height:1.8">'
            'App Key 가 없는 계정입니다. 티켓은 App Key 가 있는 계정에만 발급할 수 있습니다.<br><span class="lnk">계정 정보에서 App Key 생성</span></div>' if nokey else
            issue_form(RANGES[0] if picked else None, open_) +
            '<div style="display:flex;justify-content:flex-end;margin-top:10px"><span class="btn pri"%s>티켓 발급</span></div>'
            % ('' if picked else ' style="opacity:.5"')))
    foot = kws.footer('<span class="btn gho" style="color:#dc2626;border-color:#fecaca;opacity:.4" title="발급된 App Key 티켓이 있는 계정은 삭제할 수 없습니다">계정 삭제</span>',
                      '<span class="btn pri">저장</span>') if tab == 'info' else ''
    # 맨 위 연간 라이선스 탭 — 이 고객사에 App Key 계정이 있을 때 · lic = 'open' 이면 패널이 펼쳐진 모습 `PC-257`
    return (kws.license_slide('App Key', co, open_=(lic == 'open')) +
            '<div style="%s;padding:18px"><div style="display:flex;align-items:baseline;gap:10px;margin-bottom:12px">'
            '<b style="font-size:15px">%s</b><span style="%s;font-size:12px;color:#6b7280">%s</span></div>%s%s%s%s</div>'
            % (kws.CARD, name, MONO, mail, t, body, foot, kws.toast_line(toast) if toast else ''))


def new_form(tab='info', co='Study123', id_val='', err='', picked=False, open_=False, ranges=RANGES):
    t = ''   # 계정 정보 한 화면 — App Key 는 [계정 추가] 때 자동 생성 `PC-210`
    # App Key 탭 = 「계정 추가와 함께 App Key 발급」 체크만 — 범위 없음, 티켓은 계정 상세 [티켓 발급]에서 `PC-208`
    body = info_tab(new=True, co=co, id_val=id_val, err=err) if tab == 'info' else (
        kws.sec_head('App Key', '· 계정당 1개') +
        '<div style="font-size:13px;color:#374151">%s 계정 추가와 함께 <b>App Key 발급</b></div>'
        '<div style="font-size:11.5px;color:#6b7280;margin-top:8px;line-height:1.7">App Key 는 계정당 1개이며 범위(SOBP) 없이 키만 발급합니다. '
        '티켓(Code Type · Section · Owner · Book · Page · Info · 기한)은 계정을 추가한 뒤 <b>[티켓 발급]</b> 탭에서 발급합니다 — App Key 가 있는 계정에만 발급할 수 있습니다.</div>'
        % ('☑' if picked else '☐'))
    foot = kws.footer('', '<span class="btn gho">취소</span><span class="btn pri">계정 추가</span>')
    return ('<div style="%s;padding:18px"><div style="display:flex;align-items:baseline;gap:10px;margin-bottom:6px">'
            '<b style="font-size:15px">새 계정 추가</b>%s<span style="font-size:13px;color:#6b7280">%s</span></div>%s%s%s%s</div>'
            % (kws.CARD, tg('작성 중', '#dbeafe', '#1d4ed8'), co, t, body, foot,
               kws.toast_line(err, ok=False) if err else ''))


def fr(content, height=900):
    return frame('TKT-01', FT, content, height=height)


def col_h(height, extra=0):
    """3단 칸 높이 — 화면 끝(100vh)까지 `PC-156` `PC-157`"""
    return height - 60 - 40 - 102 - 28 - extra


def build():
    B = []
    H = head_()

    B.append(('S1', '기본 — 고객사 | App Key 계정 | 계정 상세', '기본',
              '좌측 메뉴 <b>[티켓 발급] ▸ [App Key 관리 (계정 발급)]</b>(<code>/tickets/account</code>). 왼쪽 고객사는 <b>고객사 관리 고객사</b>이고 기본은 '
              '<b>발급 고객사</b>(App Key 계정이 있는 곳)만 보인다 <code>PC-153</code>. <b>상위 고객사</b>(공통코드 보유)는 ▶ 와 「하위 n」 으로 보이고 접혀 있다 — 하위 고객사가 발급받은 상위 고객사는 [발급 고객사]에도 나온다 <code>PC-196</code> <code>PC-198</code>. '
              '고객사를 고르면 가운데에 그 고객사의 App Key 계정, 오른쪽에 첫 계정 상세가 <b>[발급 내역]</b> 탭으로 열린다(발급분이 없으면 [App Key 발급]) <code>PC-200</code>. '
              '세 칸의 목록은 <b>화면 아래 끝까지</b> 쓴다 <code>PC-156</code> <code>PC-157</code>.',
              fr(H + kws.grid(left(h=col_h(1000)), mid(h=col_h(1000)), detail()), 1000),
              [('[발급 고객사] / [전체 고객사]', '클릭', '왼쪽 목록 전환', '전체 = 고객사 관리 전체 · S2'),
               ('상위 고객사 ▶', '클릭', '하위 고객사 접기 · 펼치기', '기본 접힘 · 검색 중이면 펼침 · S14 <code>PC-198</code>'),
               ('고객사', '클릭', '가운데 계정 · 오른쪽 첫 계정', '계정이 없으면 빈 안내'),
               ('발급 내역 줄', '클릭', '그 아래 Key 정보 펼침 · 다시 누르면 접힘', 'S9 <code>PC-200</code>'),
               ('계정 카드', '클릭', '오른쪽 계정 상세', '이름 · ID · App Key/미발급 · 코드 범위 수 · 대장 · 등록일'),
               ('[＋ 계정 추가]', '클릭', 'S4', '고른 고객사로 새 계정'),
               ('계정 정보 [저장] · [계정 삭제]', '클릭', '[계정 정보] 탭에서만', '<b>계정 정보가 저장되었습니다.</b> · 삭제는 S12 확인창 <code>PC-200</code>')]))

    B.append(('S2', '전체 고객사 — 검색해 처음 발급', '분기',
              '<b>[전체 고객사 536]</b>로 바꾸면 고객사 관리의 모든 고객사가 나온다. 검색해 아직 App Key 계정이 없는 고객사를 고르면 가운데가 빈 안내이고, '
              '<b>[＋ 계정 추가]</b>로 첫 계정을 만든다. 발급 고객사에서 검색해 없으면 「[전체 고객사]에서 찾아 계정을 추가하세요」 안내가 나온다.',
              fr(H + kws.grid(left(sel='KODION-46', view='all', search='KODION', names=('KODION-46',), h=col_h(900)),
                              mid('KODION-46', cards=[], h=col_h(900)),
                              kws.right_empty('계정을 선택하거나 <b>[＋ 계정 추가]</b>를 누르세요.')), 900),
              [('[전체 고객사]', '클릭', '고객사 관리 전체', '536곳'),
               ('고객사 검색', '입력', '이름으로 거름', ''),
               ('[＋ 계정 추가]', '클릭', 'S4', '그 고객사의 첫 App Key 계정')]))

    B.append(('S3', '고객사 미연결 — 옛 대장 계정', '변형',
              '개발팀 Caster 대장 계정은 <b>고객사명</b>으로 고객사 관리 고객사에 잇는다. 같은 이름이 없으면 왼쪽 맨 아래 <b>「고객사 미연결」</b>로 모으고 '
              '카드에 대장 고객사명을 보인다. 고객사 관리에 그 이름으로 등록하면 자동으로 이어진다 <code>PC-153</code>. (현재 15곳 모두 연결 — 0건)',
              fr(head_(1) + kws.grid(left(sel='', unlinked=('고객사 미연결', 1, True, 0), h=col_h(900)),
                                     mid('', cards=[acc_card('', 'sample@legacy.com', key=False, n=1, on=True, ledger_co='옛 고객사')],
                                         warn='고객사 관리에 같은 이름의 고객사가 없는 옛 대장 계정입니다. 고객사 관리에 고객사를 등록하면 그 고객사로 이어집니다.',
                                         off=True, h=col_h(900)),
                                     kws.right_empty('계정을 선택하면 상세가 열립니다.')), 900),
              [('고객사 미연결', '클릭', '그 계정들', '[＋ 계정 추가] 잠김'),
               ('고객사 관리 등록', '—', '자동 연결', '<code>MEM-02</code>')]))

    B.append(('S4', '계정 추가 — 새 계정 작성 중', '분기',
              '<b>[＋ 계정 추가]</b>를 누르면 가운데 맨 위에 <b>「새 계정 · 작성 중」</b> 칸이 선택 상태로 생기고, 오른쪽은 <b>빈 입력 폼</b>이다 '
              '— 기존 계정 상세(수정 화면)와 구분한다 <code>PC-150</code>. 고객사는 왼쪽에서 고른 값으로 고정된다.',
              fr(H + kws.grid(left(h=col_h(1000)), mid(adding=True, cards=[acc_card(*STUDY)], h=col_h(1000)), new_form()), 1000),
              [('ID (이메일) · PWD (비밀번호)', '입력 (필수)', '—', '이메일 형식 · 전체에서 유일 · [임의 생성] 10자리'),
               ('App Key', '—', '자동', '「[계정 추가] 때 자동 생성」 — 1계정 1키 <code>PC-210</code>'),
               ('[계정 추가]', '클릭', 'S5', '계정 + App Key 1개(영문 소문자 · 숫자 29자) · <code>LOG-01</code>'),
               ('[취소]', '클릭', '첫 계정 상세', '저장 안 됨')]))

    B.append(('S5', '계정 추가 완료 — App Key 자동 생성', '분기',
              '<b>[계정 추가]</b>를 누르면 계정과 함께 <b>App Key 1개가 자동 생성</b>된다 — 1계정 1앱키라 따로 발급 · 목록이 없다 <code>PC-210</code>. '
              '범위(SOBP)는 고르지 않으며 티켓은 계정을 만든 뒤 <b>[티켓 발급]</b> 탭에서 발급한다 <code>PC-208</code>. 키는 <b>[계정 정보]</b>의 App Key 줄에 보인다.',
              fr(H + kws.grid(left(h=col_h(1000)), mid(h=col_h(1000)),
                              detail('info', issued_key=KEY29, toast='App Key 발급 완료 — 계정과 연동되어 서비스 DB에 등록되었습니다.')), 1000),
              [('[계정 추가]', '클릭', '계정 + App Key', 'App Key 영문 소문자 · 숫자 29자 · <code>LOG-01</code>'),
               ('[전체 복사]', '클릭', '클립보드', '<b>계정·키 정보가 복사되었습니다.</b>'),
               ('App Key [복사]', '클릭', '클립보드', '<b>App Key 가 복사되었습니다.</b>')]))

    B.append(('S6', '계정 추가 — 검증 실패', '오류',
              '검사 순서: 고객사 → ID 형식 → 비밀번호 → ID 중복. 걸리면 버튼 아래 한 줄로 알리고 멈춘다.',
              fr(H + kws.grid(left(h=col_h(1000)), mid(adding=True, cards=[acc_card(*STUDY)], h=col_h(1000)),
                              new_form(id_val='tony@study123.com.tw', err='이미 등록된 ID(email)입니다.')), 1000),
              [('ID 중복', '[계정 추가]', '<b>차단</b>', '<b>이미 등록된 ID(email)입니다.</b> (서비스 계정 포함 전체에서 유일)'),
               ('ID 형식', '[계정 추가]', '<b>차단</b>', '<b>ID 는 이메일 형식이어야 합니다.</b>'),
               ('PWD 없음', '[계정 추가]', '<b>차단</b>', '<b>비밀번호가 필요합니다. (요청 없으면 [임의 생성])</b>')]))

    B.append(('S7', '계정 상세 — 티켓 발급 탭', '기본',
              '<b>App Key 와 티켓은 다른 개념</b>이다 <code>PC-208</code>. App Key 는 계정당 1개(계정을 만들 때 자동 생성 · [계정 정보]에 표시 <code>PC-210</code>), <b>티켓은 계정 소속으로 여러 건</b> — '
              '이 <b>[티켓 발급]</b> 탭에서 Code Type · Section · Owner · Book · Page · Info · 기한을 넣어 발급한다. 티켓은 <b>App Key 를 먼저 발급한 계정에만</b> 발급할 수 있다(S17). '
              '지금까지 발급한 티켓은 <b>[티켓 내역]</b>에서 본다. 발급된 키 · 티켓은 <b>지우지 않는다</b> <code>PC-192</code>.',
              fr(H + kws.grid(left(h=col_h(1000)), mid(h=col_h(1000)), detail('ticket', picked=True)), 1000),
              [('[티켓 발급]', '클릭', '티켓 1건 + 원장 티켓', '<b>티켓 발급 — {범위} · {기간}</b> · <code>PC-119</code>'),
               ('발급 범위', '선택', '범위 목록', '하위 고객사면 상위 SOBP(S14) · 없으면 S10')]))

    B.append(('S8', '계정 정보 — 이전 정책으로 App Key 2개', '변형',
              '정책은 <b>1계정 1앱키</b>다 <code>PC-210</code>. 이전 정책으로 한 계정에 키가 2개 생성된 경우에는 <b>[계정 정보]의 App Key 줄에 2개를 모두</b> 보이고 '
              '「이전 정책으로 App Key 가 2개 생성된 계정입니다 — 앞으로는 1계정 1앱키」 를 붙인다. 새 키는 만들지 않는다. '
              '(옛 대장 계정 중 키가 아예 없는 경우만 [App Key 생성] 버튼이 보인다.)',
              fr(H + kws.grid(left(h=col_h(1000)), mid(h=col_h(1000)), detail('info', keys2=True)), 1000),
              [('App Key 줄', '—', '키마다 값 · [복사] · 생성일', '2개 이상이면 번호 · 「App Key (2개 · 이전 정책)」'),
               ('키 없는 옛 계정', '—', '[App Key 생성]', '키 1개 생성 — 그 뒤로는 1계정 1키')]))

    B.append(('S9', '발급 내역 — 줄 펼침 → Key 정보', '분기',
              '티켓은 <b>App Key 가 아니라 계정에 소속</b>된다 — 계정당 App Key 는 1개, 티켓은 여러 개(SOBP 가 바뀌어도 키 대신 티켓을 더 발급) <code>PC-206</code>. '
              '첫 탭 <b>[발급 내역]</b>은 지금까지 발급한 티켓을 한 줄씩 보인다 — 위 줄 <b>Code Type</b>(PDS2 · PDS3 · PDS4) · <b>Section · Owner · Book · Page</b> · <b>Info</b>, '
              '아래 줄 <b>발급일</b>(대장분은 「대장」) · <b>권수</b> · <b>기한</b>(YYMMDD · 무제한 = 991231) · <b>사용기간</b>, '
              '오른쪽 <b>정산</b> · <b>[수정]</b>. 줄을 누르면 <b>그 아래에 Key 정보</b>가 열리고 다시 누르면 접힌다 <code>PC-120</code> <code>PC-200</code>.',
              fr(H + kws.grid(left(h=col_h(1000)), mid(h=col_h(1000)), detail('hist', sel_idx=1, open_=True)), 1000),
              [('발급 내역 줄', '클릭', '그 아래 Key 정보', 'Company Name · Account Id · App Key · Code Type · S/O/B/P · 기간'),
               ('[수정]', '클릭', 'S11', '[티켓 발급] 탭의 폼이 그 티켓 값으로 채워진다 <code>PC-193</code> <code>PC-208</code>'),
               ('정산 배지', '—', '줄 오른쪽', '미정 · 유료(금액) · 무료 · 체험(D-day / 만료) <code>PC-177</code> · 입력은 S13 정산 탭'),
               ('발급분 없음', '—', '빈 안내', '<b>발급한 티켓이 없습니다.</b> · [티켓 발급으로] (키가 없으면 [App Key 발급으로])')]))

    B.append(('S10', '발급 범위 없음', '빈 상태',
              '고객사에 Caster 대장 이력도, 고객사 관리의 SOBP 할당도 없으면 범위 목록이 비어 발급할 수 없다. SOBP 맵(<code>SOB-02</code>)에서 할당한 뒤 다시 발급한다.',
              fr(H + kws.grid(left(sel='에듀테크랩', view='all', search='에듀테크', names=('에듀테크랩',), h=col_h(1000)),
                              mid('에듀테크랩', adding=True, cards=[], h=col_h(1000)),
                              detail('ticket').replace('- 범위 선택 -', '이 고객사의 발급 범위가 없습니다.')), 1000),
              [('발급 범위', '—', '빈 목록', '<b>이 고객사의 발급 범위가 없습니다.</b>'),
               ('SOBP 할당', '—', '<code>SOB-02</code>', '할당 후 다시 발급')]))

    # [티켓 수정] — 위의 발급 폼을 그 티켓 값으로 채워 고친다(아래 별도 폼 없음) `PC-192` `PC-193`
    # 수정 중 — 「티켓 수정」 칸만 보인다(현재 App Key 줄 · 발급 내역 · Key 정보 · 계정 버튼 숨김) `PC-194`
    ed = ('<div style="%s;padding:18px"><div style="display:flex;align-items:baseline;gap:10px;margin-bottom:12px">'
          '<b style="font-size:15px">%s</b><span style="%s;font-size:12px;color:#6b7280">%s</span></div>%s'
          '<div style="border:1px solid #93c5fd;background:#fbfdff;border-radius:10px;padding:14px 16px">%s'
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:8px 12px;border-radius:9px;border:1px solid #93c5fd;'
          'background:#f0f7ff;font-size:12.5px"><b style="color:#1d4ed8">수정 전</b><span style="%s;color:#374151">PDS3 S3/O291/B0~249/P0~511 · 즉시~무제한</span>'
          '<span style="color:#6b7280">· 할당 범위 B0~299 안에서 고칩니다</span></div>%s'
          '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px"><span class="btn gho">취소</span><span class="btn pri">수정 저장</span></div></div></div>'
          % (kws.CARD, STUDY[0], MONO, STUDY[1], kws.tabs(ACC_TABS, 'ticket'),
             kws.sec_head('티켓 수정', '· 발급된 티켓의 정보를 고칩니다 — 다른 발급분과 겹치지 않는 구간이면 저장됩니다'), MONO, issue_form(RANGES[0])))
    B.append(('S11', '티켓 수정', '분기',
              '발급된 티켓(코드 범위)은 <b>지우지 않고 정보를 고친다</b> <code>PC-192</code>. [티켓 수정]을 누르면 <b>위의 발급 입력 폼</b>이 그 티켓 값으로 채워지고 '
              '제목이 <b>「티켓 수정」</b> 으로 바뀌고 <b>수정 전</b> 값이 보인다 — 아래에 별도 폼을 열지 않는다 <code>PC-193</code>. 입력에 집중하도록 <b>현재 App Key 줄 · 발급 내역 · Key 정보 · [계정 삭제] [저장]</b> 은 숨긴다 <code>PC-194</code>. 범위 목록은 그 티켓의 테두리(같은 S/O 의 할당 범위 ∪ 지금 쓰는 구간) 하나뿐이고, '
              '<b>다른 발급분과 겹치지 않으면</b>(자기 자신 제외) [수정 저장]. 원장 티켓의 Key 정보도 같은 값으로 고친다.',
              fr(H + kws.grid(left(h=col_h(1000)), mid(h=col_h(1000)), ed), 1000),
              [('[티켓 수정]', '클릭(Key 정보 아래 오른쪽 <code>PC-238</code>)', '위 발급 폼 채움', '칸 제목 「티켓 수정」 · 파란 테두리 · 다른 영역 숨김 · 화면이 폼으로 올라간다'),
               ('[수정 저장]', '클릭', 'S9 Key 정보 갱신', '<b>티켓 수정 — {범위} · {기간}</b> · <code>LOG-01</code>'),
               ('겹침', '[수정 저장]', '<b>차단</b>', '<b>이미 {App Key / N Key / 서비스 티켓}로 발급된 SOBP 와 겹칩니다 — … 다른 Book · Page 를 고르세요.</b>'),
               ('[취소]', '클릭', '발급 폼 비움', '「App Key 발급」 · 발급 내역 · Key 정보가 다시 보인다')]))

    dlg = ('<div class="ovl"><div class="mdl"><div class="mh"><div class="mt">계정 삭제</div><div class="mx">✕</div></div>'
           '<div style="font-size:13px;color:#374151;line-height:1.7">이 계정을 삭제할까요?</div>'
           '<div class="mf"><div class="btn gho">취소</div><div class="btn dan">삭제</div></div></div></div>')
    B.append(('S12', '계정 삭제 확인창', '확인창', '[계정 삭제]는 확인을 거친다. <b>App Key 나 티켓이 발급된 계정은 [계정 삭제]가 비활성</b>이다(티켓 삭제 없음) <code>PC-192</code>.',
              frame('TKT-01', FT, H + kws.grid(left(h=col_h(1000)), mid(h=col_h(1000)), detail('info')), overlay=dlg, height=1000),
              [('[삭제]', '클릭', '계정 삭제', '티켓이 없는 계정만 · 다음 계정 상세 · <code>LOG-01</code>'),
               ('티켓 있는 계정', '—', '<b>[계정 삭제] 비활성</b>', '툴팁 <b>발급된 App Key 티켓이 있는 계정은 삭제할 수 없습니다</b>'),
               ('[취소] · ✕', '클릭', 'S1', '')]))

    B.append(('S13', '정산 탭', '분기',
              'N Key 관리처럼 <b>정산은 별도 탭</b>이다 <code>PC-178</code>. 티켓(코드 범위)을 고르고 그 정산을 등록한다 — '
              'N Key · 서비스 티켓과 같은 4종 <code>PC-177</code>. 탭 머리 배지는 정산 미등록(미정) 티켓 수. '
              '연간 라이선스는 이 탭이 아니라 <b>오른쪽 칸 맨 위 탭</b>에서 다룬다(S18) <code>PC-257</code>.',
              fr(H + kws.grid(left(h=col_h(1100)), mid(h=col_h(1100)), detail('bill')), 1100),
              [('[정산] 탭', '클릭', '정산할 티켓 + 정산 입력', '탭 배지 <b>미정 {n}</b> · 계정 추가 화면에는 없다'),
               ('티켓 줄', '클릭', '그 티켓의 정산', 'S/O/B/P · 사용기간 · 정산 배지'),
               ('과금 유형', '선택', '미정 · 유료 · 무료 · 체험', '유료 = 금액 필수 · 체험 = 만료일(기본 1개월 뒤)'),
               ('[정산 저장]', '클릭', '저장', '<b>정산 정보가 저장되었습니다.</b> · 금액 0 이면 <b>유료는 금액을 입력해야 합니다.</b> · 원장 티켓에도 같은 값 · <code>LOG-01</code>'),
               ('발급 티켓 없음', '—', '안내', '<b>발급된 티켓이 없습니다. [App Key 발급] 탭에서 먼저 발급하세요.</b>')]))

    # 하위 고객사 — 상위 고객사 묶음 안에서 골라 발급(상위 SOBP) `PC-195` `PC-196` `PC-198`
    LAMI = (('3', '1012', '0~8191', '0~511', '네오노트-1012'),)
    B.append(('S14', '하위 고객사 — 상위 고객사 묶음에서 선택', '분기',
              '상위 고객사(공통코드 보유)의 <b>▶</b> 를 누르면 <b>하위 고객사</b>가 왼쪽 <b>세로 안내선</b> 안에 들여 펼쳐진다(기본 접힘 · 「하위 n」) <code>PC-196</code> <code>PC-198</code>. '
              '하위 고객사를 골라 [＋ 계정 추가] → [App Key 발급] 탭을 열면 발급 범위에 <b>상위 고객사의 SOBP</b> 가 「상위 · 상위 고객사명」 과 함께 나온다. '
              '하위 고객사끼리는 같은 S/O 를 Book · Page 로 나눠 쓰고 겹칠 수 없다 <code>PC-174</code> <code>PC-195</code>.',
              fr(H + kws.grid(left(sel='라미', view='all', open_='네오노트-1012', h=col_h(1000)),
                              mid('라미', adding=True, cards=[], h=col_h(1000)),
                              issue_form(None, True, ranges=LAMI).join(('<div style="%s;padding:18px">' % kws.CARD + kws.sec_head('티켓 발급', '· 라미 · App Key 발급됨'), '</div>'))), 1000),
              [('상위 고객사 ▶', '클릭', '하위 고객사 펼침 / 접힘', '「하위 n」 = 하위 고객사 수'),
               ('하위 고객사', '클릭', '가운데 그 고객사의 App Key 계정', '세로 안내선 안 · 작은 글씨'),
               ('발급 범위', '선택', '상위 SOBP', '「상위 · 네오노트-1012」 · 아래 구간 사용 현황으로 겹침 확인 <code>PC-195</code>')]))

    # 하위 고객사 — 전체 고객사에서 바로 골라 지금까지 발급한 티켓 확인 `PC-199` `PC-200`
    B.append(('S15', '하위 고객사 — 전체 고객사에서 바로 선택 · 발급 내역', '분기',
              '하위 고객사는 상위 묶음 안뿐 아니라 <b>목록 제자리에도</b> 있어 <b>[전체 고객사]</b>에서 검색해 바로 고를 수 있다 <code>PC-199</code>. '
              '고르면 그 고객사의 계정이 <b>[발급 내역]</b> 탭으로 열려 지금까지 발급한 티켓을 한눈에 본다 <code>PC-200</code>. '
              '바로 골라 발급하면 그 하위 고객사가 들어간 <b>모든 상위 고객사의 SOBP</b> 가 발급 범위에 나온다.',
              fr(H + kws.grid(left(sel='Tranwisdom', view='all', search='tranwisdom', names=('Tranwisdom',), h=col_h(1000)),
                              mid('Tranwisdom', cards=[acc_card('', 'daniel.yang@tranwisdom.com', key=True, n=5, on=True)], h=col_h(1000)),
                              detail('hist', acc=('daniel.yang@tranwisdom.com', 'daniel.yang@tranwisdom.com'), rows=TRAN, co='Tranwisdom')), 1000),
              [('고객사 검색', '입력', '하위 고객사도 제자리에 보임', '상위 묶음이 목록에 있으면 그 안에도 보인다'),
               ('하위 고객사', '클릭', '[발급 내역] 탭', '티켓 줄 · 정산 · [수정] · 줄을 누르면 Key 정보'),
               ('[App Key 발급] 탭 범위', '선택', '모든 상위 고객사의 SOBP', '범위마다 「상위 · 상위 고객사명」')]))

    # 권한 탭 — App Key 가 가지는 Caster 권한 20항목 `PC-207`
    B.append(('S16', '권한 탭 — App Key 권한 true / false', '분기',
              '계정 상세의 <b>[권한]</b> 탭. 고객사 관리의 서비스 권한처럼, <b>App Key 가 가지는 Caster 권한 20항목</b>을 <b>true / false</b> 로 지정한다 <code>PC-207</code>. '
              '제목 옆 <b>ⓘ</b> 를 누르면 「<b>Caster U 권한</b>입니다…」 설명이 말풍선으로 보인다(본문에는 두지 않음) <code>PC-214</code>. 표는 개발팀 대장(<code>Caster_계정_퍼미션_티켓.xlsx</code>)과 같은 「<b>분류 · Permission · 값 · 설명</b>」. <b>기본값은 모두 false</b>, 대장 계정은 대장의 값을 그대로 가져온다'
              '(예: 네오랩 17 · 스콜라스틱 12 · 맥컬리 6 · Tranwisdom 0 / 20). 탭 배지는 true 개수. 고객사 관리 서비스 계정의 CasterN 권한 6종과는 별개다.',
              fr(H + kws.grid(left(sel='스콜라스틱', h=col_h(1300)), mid('스콜라스틱', cards=[acc_card('', 'scholastic@sample.com', key=True, n=1, on=True)], h=col_h(1300)),
                              detail('perm')), 1300),
              [('값 true / false', '클릭', '그 항목만 바뀜', '저장 전이면 <b>● 저장하지 않은 변경이 있습니다</b>'),
               ('[모두 true] · [모두 false]', '클릭', '20항목 한 번에', ''),
               ('[권한 저장]', '클릭', '저장', '<b>권한이 저장되었습니다.</b> · 탭 배지 true 개수 · <code>LOG-01</code>'),
               ('[취소]', '클릭', '저장된 값으로', '')]))

    # 티켓은 App Key 를 먼저 발급한 계정에만 `PC-208`
    B.append(('S17', '티켓 발급 — App Key 없는 계정', '빈 상태',
              '티켓은 계정 소속이지만 <b>App Key 를 먼저 발급한 계정에만</b> 발급한다 <code>PC-208</code>. 키가 없는 계정의 <b>[티켓 발급]</b> 탭은 입력 폼 대신 '
              '<b>안내</b>와 [계정 정보에서 App Key 생성]만 보인다. 지금은 계정을 만들 때 키가 자동 생성되므로 <b>키 없는 옛 대장 계정</b>에만 해당한다 <code>PC-210</code>.',
              fr(H + kws.grid(left(h=col_h(900)), mid(h=col_h(900)), detail('ticket', nokey=True)), 900),
              [('[티켓 발급] 탭', '—', '<b>차단</b>', '<b>App Key 가 없는 계정입니다. 티켓은 App Key 가 있는 계정에만 발급할 수 있습니다.</b>'),
               ('[계정 정보에서 App Key 생성]', '클릭', 'S8', '[App Key 생성] — 범위 없이 키만')]))

    B.append(('S18', '연간 라이선스 — 오른쪽 슬라이드 패널', '분기',
              '연간 라이선스는 <b>티켓이 아니라 키 발급으로 생기는 비용</b>이라 <b>고객사마다 1건</b>(App Key)이다 <code>PC-212</code>. '
              '오른쪽 칸 맨 위의 <b>작은 탭</b>(상태 한 줄 — 미등록 / 금액 · 기간 끝 / 만료 임박 · 만료)을 누르면 <b>발급 상세 위로 오른쪽에서 패널</b>이 밀려 나온다 <code>PC-257</code>. '
              '탭은 고른 고객사에 <b>App Key 계정이 있을 때만</b> 보이고, 라이선스는 <b>그 고객사</b>(하위 고객사면 하위 고객사)에 붙는다 — 상위 고객사로 모으지 않는다. '
              '계정 [정산] 탭에는 더 두지 않는다.',
              fr(H + kws.grid(left(h=col_h(900)), mid(h=col_h(900)), detail('hist', lic='open')), 900),
              [('[‹ 연간 라이선스 상태] 탭', '클릭', '패널 펼침 / 접기', '화살표가 앞 — 열리는 쪽(왼쪽)을 가리키고 펼치면 › <code>PC-268</code> · 다시 누르거나 ✕ · 고객사를 바꾸면 접힌다'),
               ('탭 상태', '표시', '—', '<b>미등록</b>(빨강) · <b>{금액} / 년 · ~{기간 끝}</b>(초록) · 30일 이내 <b>만료 임박</b>(노랑) · <b>만료 {날짜}</b>(빨강)'),
               ('[라이선스 저장]', '클릭', '고객사 1건 저장', '<b>라이선스 비용이 저장되었습니다.</b> · 기간 끝 &lt; 시작이면 <b>기간 끝이 시작보다 앞설 수 없습니다.</b> · <code>LOG-01</code> 정산'),
               ('탭이 안 보일 때', '—', '—', '고객사를 고르지 않았거나 그 고객사에 App Key 계정이 없음')]))

    HF = (kws.title('App Key 관리', '집계 대상 <b style="color:#111827">전체 고객사</b>', NOTE) +
          kws.stats([('발급 고객사', '14곳', '#111827'), ('App Key 계정', '14개', '#111827'),
                     ('App Key 연동', '14개', '#2563eb'), ('App Key 없음', '1개', '#92400e'), ('고객사 미연결', '0개', '#9ca3af')]) +
          filter_bar(q='tranwisdom', hits=(1, 1)))
    B.append(('S19', '필터 적용 — 계정 검색', '분기',
              '집계 아래 <b>필터 줄</b>은 N Key 관리와 같은 모양이다 <code>PC-266</code>. 필터(정산 · 검색)는 <b>전체 App Key 계정에 먼저</b> 걸고, '
              '왼쪽은 <b>맞는 계정이 있는 고객사만</b>(하위에 있으면 상위도) 남고 건수도 결과 수로, 가운데는 맞는 계정만 「n/전체개」로 보인다. '
              '지금 고객사에 맞는 계정이 없으면 <b>맞는 첫 고객사 · 첫 계정</b>으로 옮긴다.',
              fr(HF + kws.grid(left(sel='Tranwisdom', names=('Tranwisdom',), h=col_h(900)),
                               mid(co='Tranwisdom', cards=[acc_card('', 'daniel.yang@tranwisdom.com', on=True, n=4)], h=col_h(900)),
                               detail(co='Tranwisdom')), 900),
              [('정산 칩', '클릭', '계정의 티켓 중 하나라도 그 정산', '정산 없음 = 미정'),
               ('검색', '입력', '고객사 · 계정 ID · 티켓 이름', '입력하는 대로 거른다 · App Key 로는 찾지 않는다 <code>PC-267</code>'),
               ('[필터 해제]', '클릭', 'S1', '비운 상세는 그 고객사 첫 계정으로'),
               ('맞는 계정 없음', '—', '—', '왼쪽 「검색 결과가 없습니다」 · 가운데 <b>필터에 맞는 계정이 없습니다.</b> · 오른쪽 상세 비움')]))

    def grp(name, n):
        return ('<div style="display:flex;align-items:center;gap:6px;padding:6px 2px;margin:4px 0 6px;border-bottom:1px solid #eef0f4;font-size:12.5px">'
                '<b style="color:#111827">%s</b><span style="color:#9ca3af">%d개</span><span style="flex:1"></span><span style="color:#2563eb;font-size:11.5px">›</span></div>' % (name, n))
    allbody = (grp('네오랩', 1) + acc_card('', 'neolab@neolab.net', on=True, n=6) +
               grp('Xiom Healthcare-304', 1) + acc_card('Xiom Healthcare LLC', 'Xiomhealthcare', key=False, n=0) +
               grp('Luginbühl &amp; Cie SA (TruxReport)', 1) + acc_card('TruxReport', 'dev.luginbuhl@gmail.com', n=1) +
               grp('Tranwisdom', 1) + acc_card('', 'daniel.yang@tranwisdom.com', n=5))
    B.append(('S20', '전체 — 모든 고객사의 계정을 고객사별로', '기본',
              '왼쪽 맨 위 <b>「전체」</b>를 고르면 가운데에 <b>모든 고객사의 App Key 계정이 고객사별 묶음</b>으로 보인다 — N Key 관리 「전체」와 같은 모양 <code>PC-269</code>. '
              '고객사는 <b>가장 최근 등록 순</b>, 묶음 안도 최근 순. 주소에 고객사 · 계정이 없으면 <b>처음 열 때 「전체」</b>이고 오른쪽은 가장 최근 계정이다. '
              '필터를 걸면 결과 계정을 한 목록에서 본다. 「전체」에서는 [＋ 계정 추가] · 연간 라이선스 탭이 없다(고객사를 하나 골라야 한다).',
              fr(H + kws.grid(left(sel='전체', h=col_h(1000)), kws.mid_col('App Key 계정', '14개', '＋ 계정 추가', allbody, col_h(1000), btn_off=True),
                              detail(co='네오랩')), 1000),
              [('「전체」', '클릭', '가운데 = 고객사별 묶음 · 오른쪽 = 가장 최근 계정', '건수 = 전체 계정 수(필터 중이면 결과 수)'),
               ('묶음 머리 (고객사명 n개 ›)', '클릭', '그 고객사만 보기', '왼쪽에서 그 고객사를 고른 것과 같다'),
               ('[＋ 계정 추가]', '—', '꺼짐', '고객사를 고른 뒤 쓸 수 있다')]))

    intro = ('App Key 를 발급하는 화면이다. 「<b>고객사 | App Key 계정 | 계정 상세</b>」 3단 한 화면이며 옛 <code>TKT-01</code> 계정 발급(목록)과 '
             '옛 <code>TKT-02</code> 계정 등록·수정을 합쳤다 <code>PC-146</code> <code>PC-158</code>. 고객사는 <b>고객사 관리 고객사를 불러온다</b>(여기서 등록하지 않음) '
             '<code>PC-153</code>. 계정은 <b>App Key 계정</b> — 계정과 App Key 가 매칭되는 개념으로, 고객사 관리의 <b>서비스 계정</b>(서비스 권한)과 별개다. '
             '화면 모양은 <code>TKT-02</code> N Key 관리와 같은 조각을 쓴다 <code>PC-154</code>. <b>App Key 와 티켓은 다른 개념</b> — 계정 상세의 탭이 '
             '[티켓 내역] · [티켓 발급] · [정산] · [계정 정보] · [권한] 순서다 <code>PC-208</code> <code>PC-211</code>. App Key 는 계정을 만들 때 자동 생성되고(1계정 1키) [계정 정보]에 보인다 <code>PC-210</code>.')
    return page(CODE, NAME, PRD, intro, B)
