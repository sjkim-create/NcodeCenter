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

COS = ('(주)투이아이앤씨', '네오랩', '맥컬리', '스콜라스틱', '에듀프레소', '영신사', '영업용 테스트 코드', '유니메이션',
       'iuEdu', 'Liangshishu-111', 'Luginbühl & Cie SA (TruxReport)', 'NHN EDU', 'Study123', 'Tranwisdom', 'Xiom Healthcare-304')
KEY29 = 'Qk7vT2mX9pLr4NsW8cYb3HdJ6fGa1'
RANGES = (('3', '291', '0~249', '0~511'), ('3', '942', '73', '0~512'), ('3', '291', '250~299', '0~511'))


def head_(unlinked=0):
    return (kws.title('App Key 관리', '집계 대상 <b style="color:#111827">전체 고객사</b>', NOTE) +
            kws.stats([('발급 고객사', '15곳', '#111827'), ('App Key 계정', '15개', '#111827'),
                       ('App Key 연동', '14개', '#2563eb'), ('App Key 없음', '1개', '#92400e'),
                       ('고객사 미연결', '%d개' % unlinked, '#b45309' if unlinked else '#9ca3af')]))


def left(sel='Study123', view='issued', search='', names=COS, empty='', unlinked=None, h=670):
    rows = [(n, 1 if n in COS else 0, n == sel, 0, False) for n in names]
    return kws.co_col(rows, h, view=view, issued=15, total=537, count=len(names) if (search or view == 'all') else None,
                      search=search, empty=empty, unlinked=unlinked)


def acc_card(name, mail, key=True, n=2, seeded=True, on=False, date='', ledger_co=''):
    k = tg('App Key', '#f5f3ff', '#6d28d9') if key else tg('미발급', '#f3f4f6', '#9ca3af')
    return kws.item('<b style="font-size:13.5px">%s</b><div style="%s;font-size:11.5px;color:#6b7280;margin-top:2px">%s</div>%s'
                    '<div style="display:flex;align-items:center;gap:6px;margin-top:7px">%s%s%s'
                    '<span style="margin-left:auto;font-size:11px;color:#9ca3af">%s</span></div>'
                    % (name or '<span style="color:#9ca3af;font-weight:400">이름 없음</span>', MONO, mail,
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


ACC_TABS = (('info', '계정 정보', ''), ('key', 'App Key 발급', '1'), ('bill', '정산', '미정 1'))   # 정산 탭 `PC-178`


def info_tab(new=False, co='Study123', id_val='', err=''):
    gen = '<span class="btn sm">임의 생성</span>'
    if new:
        g = (fld('고객사 *', co, ro=True) + fld('NAME (담당자명)', '', ph=True) +
             fld('ID (이메일) *', id_val or 'user@company.com', ph=not id_val, err=bool(err)) +
             fld('PWD (비밀번호) *', '비밀번호 미요청 시 임의 생성', ph=True, extra=gen) +
             fld('ADDR (주소)', '주소', ph=True) + fld('HOMEPAGE (홈페이지)', 'https://', ph=True))
        head = kws.sec_head('계정 정보', '· App Key 계정')
        note = ''
    else:
        g = (fld('고객사', co, ro=True) + fld('NAME (담당자명)', 'study123') +
             fld('ID (이메일)', STUDY[1], ro=True, mono=True) + fld('PWD (비밀번호)', '대장 참조', ph=True, extra=gen) +
             fld('ADDR (주소)', '', ph=True) + fld('HOMEPAGE (홈페이지)', 'https://', ph=True))
        head = kws.sec_head('계정 정보', '· ID(email) · 고객사는 변경할 수 없습니다')
        note = ('<div style="font-size:11.5px;color:#6b7280;background:#fafbfc;border:1px dashed #e5e7eb;border-radius:8px;'
                'padding:9px 12px;margin-top:12px">사용기간(시작·끝)은 계정 속성이 아니라 <b>코드 범위(=티켓)마다 유지되는 기간</b>입니다. '
                '<b>[App Key 발급]</b> 탭에서 <b>코드 범위를 발급할 때</b> 함께 지정합니다.</div>')
    return head + '<div class="g2">' + g + '</div>' + note


def issue_form(sel=None, open_=False, new=False):
    r = sel
    fields = ('<div class="g4" style="margin-top:12px">' +
              fld('Start Book (시작 북코드)', r[2].split('~')[0] if r else '', ph=not r) +
              fld('Book 볼륨 (권)', '250' if r else '', ph=not r) +
              fld('Start Page', '1 (기본)') + fld('Page 볼륨', '512') + '</div>'
              '<div style="display:grid;grid-template-columns:.9fr 1fr 1.4fr;gap:10px;margin-top:10px">' +
              fld('Code Type', 'PDS3') + fld('Valid From Time (사용기간 시작)', '연도-월-일', ph=True) +
              fld('Valid Until Time (사용기간 끝)', '<span style="color:#9ca3af">연도-월-일</span>',
                  extra='<span style="font-size:12.5px;white-space:nowrap">☑ 무제한</span>') + '</div>'
              '<div style="display:flex;gap:16px;margin-top:10px;font-size:12px;color:#6b7280;background:#fafbfc;border-radius:8px;padding:8px 12px">'
              '<span>자동·고정</span><span>Section · Owner <b style="color:#111827">%s</b></span><span>Ticket Type <b style="color:#111827">Unlimited</b></span>'
              '<span>Ticket Version <b style="color:#111827">1</b></span></div>' % ('S%s / O%s' % (r[0], r[1]) if r else '-'))
    summ = ('<div style="font-size:11.5px;color:#6b7280;margin-top:6px">발급 범위 <b>PDS3 S3/O291/B0~249</b> · 250권 · <b>P1~512</b> · 기간 즉시~무제한</div>'
            if r else '')
    lab = ('<div style="font-size:12px;color:#6b7280;margin-bottom:6px">발급 범위 (Caster 대장 이력 · SOBP 할당)%s '
           '<span style="color:#9ca3af">(선택하면 Section·Owner·Book·Code Type 이 자동으로 채워집니다 · %s)</span></div>'
           % ('' if new else ' *', '선택하지 않으면 계정만 등록합니다' if new else '사용기간을 함께 지정합니다'))
    return lab + kws.range_picker(open_, sel, RANGES) + fields + summ


def key_history(sel_idx=0, issued_key=''):
    rows = (('PDS3 S3/O291/B0~249/P0~511', '250권', kws.tg('유료 1,200,000원', '#dbeafe', '#1d4ed8')),
            ('PDS3 S3/O942/B73/P0~512', '1권', kws.bill_tag('미정')))
    if issued_key:
        rows = rows + (('PDS3 S3/O291/B250~299/P1~512', '50권', kws.bill_tag('미정')),)
    li = ''.join('<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-top:1px solid #f3f4f6;%s">'
                 '<span style="color:%s">%s</span><b style="%s;font-size:12px">%s</b><span style="color:#6b7280;font-size:12px">%s</span>'
                 '<span style="color:#6b7280;font-size:12px">즉시 ~ 무제한</span><span style="flex:1"></span>%s'
                 '<span class="btn gho" style="padding:3px 10px;font-size:11px;color:#dc2626;border-color:#fecaca">티켓 삭제</span></div>'
                 % ('background:#f5f9ff' if i == sel_idx else '', '#2563eb' if i == sel_idx else '#c7cdd6',
                    '▸' if i == sel_idx else '·', MONO, t, b, bill) for i, (t, b, bill) in enumerate(rows))
    return (kws.sec_head('App Key 발급 내역', '· 발급된 키 1개') +
            '<div style="border:1px solid #eef0f4;border-radius:10px;overflow:hidden">'
            '<div style="display:flex;align-items:center;gap:8px;padding:9px 12px;background:#fafbfc">%s%s'
            '<span style="font-size:11.5px;color:#6b7280">코드 범위 %d개</span>%s<span style="flex:1"></span>'
            '<span class="btn gho" style="padding:4px 12px;font-size:11.5px;color:#dc2626;border-color:#fecaca">키 삭제</span></div>%s</div>'
            % (('<b style="%s;font-size:12px">%s</b>' % (MONO, issued_key)) if issued_key else tg('키 미기재', '#fef3c7', '#92400e'),
               '', len(rows), tg('대장', '#f3f4f6', '#9ca3af') if not issued_key else '', li))


def key_info(sel_idx=0):
    rng = (('Section', '3'), ('Owner', '291'), ('Book Start', '0'), ('Book Volume', '250'), ('Page Start', '0'), ('Page Volume', '512'))
    if sel_idx == 1:
        rng = (('Section', '3'), ('Owner', '942'), ('Book Start', '73'), ('Book Volume', '1'), ('Page Start', '0'), ('Page Volume', '513'))
    rows = (('Company Name', 'Study123'), ('Account Id', STUDY[1]), ('App Key', '(대장 미기재)')) + rng + (
        ('Code Type', 'PDS3'), ('Valid From Time', '즉시'), ('Valid Until Time', '무제한'), ('Ticket Type', 'Unlimited'), ('Ticket Version', '1'))
    return ('<div style="margin-top:16px">' + kws.sec_head('Key 정보', '· 선택한 발급 내역 (%s)' %
            ('PDS3 S3/O291/B0~249/P0~511' if sel_idx == 0 else 'PDS3 S3/O942/B73/P0~512')) + kws.kv_table(rows) + '</div>')


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
    return (kws.sec_head('정산할 티켓', '· 티켓(코드 범위)마다 등록 · 미정 1건') + li +
            (kws.billing_box() if sel_idx == 0 else kws.billing_box('미정', note='', last='—')))


def detail(tab='info', sel_idx=0, open_=False, picked=False, issued_key='', toast='', dirty=False):
    t = kws.tabs(ACC_TABS, tab)
    if tab == 'info':
        body = info_tab()
    elif tab == 'bill':
        body = bill_tab(sel_idx)
    else:
        body = (kws.sec_head('App Key 발급', '· 계정당 1개 · 발급된 키 1개') +
                issue_form(RANGES[0] if picked else None, open_) +
                '<div style="display:flex;justify-content:flex-end;margin-top:10px"><span class="btn pri"%s>코드 범위 발급</span></div>'
                % ('' if picked else ' style="opacity:.5"') +
                '<div style="margin-top:16px">' + key_history(sel_idx, issued_key) + '</div>' + key_info(sel_idx))
    foot = kws.footer('<span class="btn gho" style="color:#dc2626;border-color:#fecaca">계정 삭제</span>',
                      '<span class="btn pri">저장</span>')
    return ('<div style="%s;padding:18px"><div style="display:flex;align-items:baseline;gap:10px;margin-bottom:12px">'
            '<b style="font-size:15px">%s</b><span style="%s;font-size:12px;color:#6b7280">%s</span></div>%s%s%s%s</div>'
            % (kws.CARD, STUDY[0], MONO, STUDY[1], t, body, foot, kws.toast_line(toast) if toast else ''))


def new_form(tab='info', co='Study123', id_val='', err='', picked=False, open_=False):
    t = kws.tabs((('info', '계정 정보', ''), ('key', 'App Key 발급', '발급' if picked else '')), tab)
    body = info_tab(new=True, co=co, id_val=id_val, err=err) if tab == 'info' else (
        kws.sec_head('App Key 발급', '· 계정당 1개') + issue_form(RANGES[0] if picked else None, open_, new=True))
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
              '<b>발급 고객사</b>(App Key 계정이 있는 곳)만 보인다 <code>PC-153</code>. 고객사를 고르면 가운데에 그 고객사의 App Key 계정, 오른쪽에 첫 계정 상세가 열린다. '
              '세 칸의 목록은 <b>화면 아래 끝까지</b> 쓴다 <code>PC-156</code> <code>PC-157</code>.',
              fr(H + kws.grid(left(h=col_h(1000)), mid(h=col_h(1000)), detail()), 1000),
              [('[발급 고객사] / [전체 고객사]', '클릭', '왼쪽 목록 전환', '전체 = 고객사 관리 전체 · S2'),
               ('고객사', '클릭', '가운데 계정 · 오른쪽 첫 계정', '계정이 없으면 빈 안내'),
               ('계정 카드', '클릭', '오른쪽 계정 상세', '이름 · ID · App Key/미발급 · 코드 범위 수 · 대장 · 등록일'),
               ('[＋ 계정 추가]', '클릭', 'S4', '고른 고객사로 새 계정'),
               ('계정 정보 [저장]', '클릭', '계정 정보 반영', '<b>계정 정보가 저장되었습니다.</b>'),
               ('[계정 삭제]', '클릭', 'S12 확인창', '')]))

    B.append(('S2', '전체 고객사 — 검색해 처음 발급', '분기',
              '<b>[전체 고객사 537]</b>로 바꾸면 고객사 관리의 모든 고객사가 나온다. 검색해 아직 App Key 계정이 없는 고객사를 고르면 가운데가 빈 안내이고, '
              '<b>[＋ 계정 추가]</b>로 첫 계정을 만든다. 발급 고객사에서 검색해 없으면 「[전체 고객사]에서 찾아 계정을 추가하세요」 안내가 나온다.',
              fr(H + kws.grid(left(sel='KODION-46', view='all', search='KODION', names=('KODION-46',), h=col_h(900)),
                              mid('KODION-46', cards=[], h=col_h(900)),
                              kws.right_empty('계정을 선택하거나 <b>[＋ 계정 추가]</b>를 누르세요.')), 900),
              [('[전체 고객사]', '클릭', '고객사 관리 전체', '537곳'),
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
               ('[App Key 발급] 탭', '클릭', 'S5', '범위를 고르면 계정과 함께 발급'),
               ('[계정 추가]', '클릭', '그 계정 상세(S1)', '범위를 골랐으면 App Key 동시 발급 · <code>LOG-01</code>'),
               ('[취소]', '클릭', '첫 계정 상세', '저장 안 됨')]))

    B.append(('S5', '계정 추가 — App Key 함께 발급', '분기',
              '등록 폼의 <b>App Key 발급</b> 탭. <b>발급 범위</b>(Caster 대장 이력 + 고객사의 SOBP 할당)를 고르면 Section·Owner·Book·Code Type 이 채워지고 '
              '[계정 추가] 때 App Key 가 함께 발급된다. 고르지 않으면 계정만 등록한다 <code>PC-071</code>.',
              fr(H + kws.grid(left(h=col_h(1000)), mid(adding=True, cards=[acc_card(*STUDY)], h=col_h(1000)),
                              new_form('key', picked=True, open_=True)), 1000),
              [('발급 범위', '선택', 'S·O·B·P 칩', '번호 + 칩 목록 · 선택 항목 ✓'),
               ('Start Book · Book 볼륨', '입력', '범위 안', 'Book End = Start + 볼륨 − 1'),
               ('Valid Until Time', '무제한 / 날짜', '티켓별 기간', '<code>PC-118</code>')]))

    B.append(('S6', '계정 추가 — 검증 실패', '오류',
              '검사 순서: 고객사 → ID 형식 → 비밀번호 → ID 중복. 걸리면 버튼 아래 한 줄로 알리고 멈춘다.',
              fr(H + kws.grid(left(h=col_h(1000)), mid(adding=True, cards=[acc_card(*STUDY)], h=col_h(1000)),
                              new_form(id_val='tony@study123.com.tw', err='이미 등록된 ID(email)입니다.')), 1000),
              [('ID 중복', '[계정 추가]', '<b>차단</b>', '<b>이미 등록된 ID(email)입니다.</b> (서비스 계정 포함 전체에서 유일)'),
               ('ID 형식', '[계정 추가]', '<b>차단</b>', '<b>ID 는 이메일 형식이어야 합니다.</b>'),
               ('PWD 없음', '[계정 추가]', '<b>차단</b>', '<b>비밀번호가 필요합니다. (요청 없으면 [임의 생성])</b>')]))

    B.append(('S7', '계정 상세 — App Key 발급 탭', '기본',
              '<b>App Key 는 계정당 1개</b>이고, 키 아래 <b>코드 범위(=티켓)</b>를 여러 건 발급한다 <code>PC-050</code>. 위는 코드 범위 발급 폼, 아래는 '
              '<b>App Key 발급 내역</b>(키 · 티켓 줄 · [티켓 삭제] · [키 삭제])과 <b>Key 정보</b>.',
              fr(H + kws.grid(left(h=col_h(1250)), mid(h=col_h(1250)), detail('key', picked=True)), 1250),
              [('[코드 범위 발급]', '클릭', '티켓 1건 + 원장 티켓', '<b>티켓 발급 — {범위} · {기간}</b> · <code>PC-119</code>'),
               ('[티켓 삭제]', '클릭', '그 티켓 + 원장 티켓', '마지막 티켓이면 S11'),
               ('[키 삭제]', '클릭', '키 전체 삭제', ''),
               ('발급 범위', '선택', '범위 목록', '없으면 S10')]))

    B.append(('S8', 'App Key 발급 완료', '분기',
              '키가 없는 계정에서 범위를 골라 발급하면 <b>ID · PWD · App Key</b>(영문·숫자 29자 <code>PC-066</code>)가 나오고 [전체 복사]로 한 번에 복사한다.',
              fr(H + kws.grid(left(h=col_h(1250)), mid(h=col_h(1250)),
                              detail('key', picked=True, issued_key=KEY29, toast='App Key 발급 완료 — 계정과 연동되어 서비스 DB에 등록되었습니다.')), 1250),
              [('[전체 복사]', '클릭', '클립보드', '<b>계정·키 정보가 복사되었습니다.</b>'),
               ('발급(자동)', '—', '<code>TKT-02</code> 원장 · <code>LOG-01</code>', 'APP 티켓 1건')]))

    B.append(('S9', '발급 내역 선택 → Key 정보', '분기',
              '발급 내역의 티켓 줄(▸)을 고르면 아래 <b>Key 정보</b>가 그 티켓 값으로 바뀐다. 기본은 첫 티켓 <code>PC-120</code>.',
              fr(H + kws.grid(left(h=col_h(1250)), mid(h=col_h(1250)), detail('key', sel_idx=1)), 1250),
              [('티켓 줄', '클릭', 'Key 정보 갱신', 'Company Name · Account Id · App Key · S/O/B/P · Code Type · 기간 · Ticket Type · Version'),
               ('정산 배지', '—', '티켓 줄 오른쪽', '미정 · 유료(금액) · 무료 · 체험(D-day / 만료) <code>PC-177</code> · 입력은 S13 정산 탭')]))

    B.append(('S10', '발급 범위 없음', '빈 상태',
              '고객사에 Caster 대장 이력도, 고객사 관리의 SOBP 할당도 없으면 범위 목록이 비어 발급할 수 없다. SOBP 맵(<code>SOB-02</code>)에서 할당한 뒤 다시 발급한다.',
              fr(H + kws.grid(left(sel='에듀테크랩', view='all', search='에듀테크', names=('에듀테크랩',), h=col_h(1000)),
                              mid('에듀테크랩', adding=True, cards=[], h=col_h(1000)),
                              new_form('key', co='에듀테크랩').replace('- 범위 선택 -', '이 고객사의 발급 범위가 없습니다.')), 1000),
              [('발급 범위', '—', '빈 목록', '<b>이 고객사의 발급 범위가 없습니다.</b>'),
               ('SOBP 할당', '—', '<code>SOB-02</code>', '할당 후 다시 발급')]))

    last = ('<div class="ovl"><div class="mdl"><div class="mh"><div class="mt">티켓 삭제</div><div class="mx">✕</div></div>'
            '<div style="font-size:13px;color:#374151;line-height:1.7">마지막 티켓입니다. 삭제하면 이 App Key 도 함께 삭제됩니다. 진행할까요?</div>'
            '<div class="mf"><div class="btn gho">취소</div><div class="btn dan">삭제</div></div></div></div>')
    B.append(('S11', '마지막 티켓 삭제 확인창', '확인창', '키의 마지막 코드 범위(=티켓)를 지우면 App Key 까지 함께 지워진다 <code>PC-121</code>.',
              frame('TKT-01', FT, H + kws.grid(left(h=col_h(1250)), mid(h=col_h(1250)), detail('key')), overlay=last, height=1250),
              [('[삭제]', '클릭', '티켓 + App Key 삭제', '원장 티켓도 제거'), ('[취소] · ✕', '클릭', 'S7', '')]))

    dlg = ('<div class="ovl"><div class="mdl"><div class="mh"><div class="mt">계정 삭제</div><div class="mx">✕</div></div>'
           '<div style="font-size:13px;color:#374151;line-height:1.7">이 계정과 연동 App Key를 삭제할까요?</div>'
           '<div class="mf"><div class="btn gho">취소</div><div class="btn dan">삭제</div></div></div></div>')
    B.append(('S12', '계정 삭제 확인창', '확인창', '[계정 삭제]는 확인을 거친다. 연동 App Key 도 함께 지워지고, 같은 고객사의 다음 계정이 열린다.',
              frame('TKT-01', FT, H + kws.grid(left(h=col_h(1000)), mid(h=col_h(1000)), detail()), overlay=dlg, height=1000),
              [('[삭제]', '클릭', '계정 + App Key 삭제', '다음 계정 상세 · <code>LOG-01</code>'), ('[취소] · ✕', '클릭', 'S1', '')]))

    B.append(('S13', '정산 탭', '분기',
              'N Key 관리처럼 <b>정산은 별도 탭</b>이다 <code>PC-178</code>. 티켓(코드 범위)을 고르고 그 정산을 등록한다 — '
              'N Key · 서비스 티켓과 같은 4종 <code>PC-177</code>. 탭 머리 배지는 정산 미등록(미정) 티켓 수.',
              fr(H + kws.grid(left(h=col_h(1100)), mid(h=col_h(1100)), detail('bill')), 1100),
              [('[정산] 탭', '클릭', '정산할 티켓 + 정산 입력', '탭 배지 <b>미정 {n}</b> · 계정 추가 화면에는 없다'),
               ('티켓 줄', '클릭', '그 티켓의 정산', 'S/O/B/P · 사용기간 · 정산 배지'),
               ('과금 유형', '선택', '미정 · 유료 · 무료 · 체험', '유료 = 금액 필수 · 체험 = 만료일(기본 1개월 뒤)'),
               ('[정산 저장]', '클릭', '저장', '<b>정산 정보가 저장되었습니다.</b> · 금액 0 이면 <b>유료는 금액을 입력해야 합니다.</b> · 원장 티켓에도 같은 값 · <code>LOG-01</code>'),
               ('발급 티켓 없음', '—', '안내', '<b>발급된 티켓이 없습니다. [App Key 발급] 탭에서 먼저 발급하세요.</b>')]))

    intro = ('App Key 를 발급하는 화면이다. 「<b>고객사 | App Key 계정 | 계정 상세</b>」 3단 한 화면이며 옛 <code>TKT-01</code> 계정 발급(목록)과 '
             '옛 <code>TKT-02</code> 계정 등록·수정을 합쳤다 <code>PC-146</code> <code>PC-158</code>. 고객사는 <b>고객사 관리 고객사를 불러온다</b>(여기서 등록하지 않음) '
             '<code>PC-153</code>. 계정은 <b>App Key 계정</b> — 계정과 App Key 가 매칭되는 개념으로, 고객사 관리의 <b>서비스 계정</b>(서비스 권한)과 별개다. '
             '화면 모양은 <code>TKT-02</code> N Key 관리와 같은 조각을 쓴다 <code>PC-154</code>.')
    return page(CODE, NAME, PRD, intro, B)
