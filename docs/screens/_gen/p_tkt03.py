# -*- coding: utf-8 -*-
"""TKT-01 계정 발급 (계정 목록) — 실제 화면 구조 그대로.

요약 4칸 → 한 줄 필터(고객사·인증 서비스·검색 + [＋ 계정 추가]) → 7열 표.
등록·상세 수정은 TKT-02 (p_tkt02.py).
"""
from shell import page, frame
from p_tkt01 import sel

CODE, NAME = 'TKT-01', 'App Key 관리 (계정 발급)'
PRD = 'docs/prd/TKT-01_계정 발급.md'

# lib/accountStore.ts — (고객사, ID(email), 이름, 인증 서비스, App Key, 코드 범위 수, 사용기간, 등록일)
# 인증 서비스는 중복 선택이라 튜플로 담는다. **빈 튜플 = SDK 연동(코드만 할당)** `PC-076`
# App Key 는 개수가 아니라 **키 값**(영문·숫자 29자)을 그대로 보여 준다 `PC-067` `PC-066`
#   대장에 코드 범위는 있는데 키 값이 안 적혀 있으면 **키 미기재** `PC-103`
# 아래 15행 = **개발팀 대장**(web/data/caster-ledger.json) 시드 그대로 `PC-103`
#   코드 범위 = 그 키에 물린 S/O/B/P 범위 수 · 등록일 = 「대장」 배지 · 사용기간 = 대장의 사용기간
ROWS = (
    ('네오랩', 'neolab@neolab.net', '', ('CasterN',), None, 6, '', '대장'),
    ('Xiom Healthcare-304', 'Xiomhealthcare', 'Xiom Healthcare LLC', ('CasterN',), '', 0, '', '대장'),
    ('Luginbühl & Cie SA (TruxReport)', 'dev.luginbuhl@gmail.com', 'TruxReport', (),
     '55bacb7ee016fd740d8d8c6fc3ec9', 1, '— ~ 무제한', '대장'),
    ('Liangshishu-111', 'liangshishu.service@gmail.com', 'Liangshishu', ('CasterN',), None, 2,
     '2022-11-21 ~ 2023-11-21', '대장'),
    ('Tranwisdom', 'daniel.yang@tranwisdom.com', '', (), None, 5, '', '대장'),
    ('유니메이션', 'unimation@...??', '', ('CasterN',), None, 1, '', '대장'),
    ('Study123', 'tony@study123.com.tw', 'study123', ('CasterN',), None, 2, '', '대장'),
    ('맥컬리', 'sungkyu.chun@mackerly.com', '천성규', ('CasterN',), None, 1, '2020-03-16 ~ 2023-03-15', '대장'),
    ('영신사', '영신사 (계정 미기재)', '', ('CasterN',), None, 1, '', '대장'),
    ('스콜라스틱', 'vsritharan@scholastic.asia', '', ('CasterN',), None, 1, '', '대장'),
    ('(주)투이아이앤씨', 'halleysong@gmail.com', '', ('CasterN',), None, 1, '', '대장'),
    ('iuEdu', 'tuan.pham@iuedu.vn', 'Tuan Pham', ('CasterN',), None, 1, '2020-05-25 ~ 2020-08-31', '대장'),
    ('NHN EDU', 'yeonwoong.jo@nhnedu.com', '조연웅', ('CasterN',), None, 1, '2020-10-28 ~ 2021-10-27', '대장'),
    ('에듀프레소', 'edupresso@gmail.com', '이병선', ('CasterN',), None, 1, '2021-01-11 ~ 2021-12-31', '대장'),
    ('영업용 테스트 코드', 'neotest@neolab.net', 'demo', ('CasterN',), None, 1, '2020-05-25 ~ 2020-12-31', '대장'),
)

# 조건(권한·설정)이 정의된 서비스 — 나머지는 '준비중'
READY = ('CasterN',)

# 요약 5칸 — 「대장 계정」 추가 `PC-103`
KPI = (('등록 계정', '15', '#111827'), ('App Key 연동', '14', '#2563eb'),
       ('App Key 없음', '1', '#92400e'), ('발급 App Key', '14', '#7c3aed'),
       ('대장 계정', '15', '#0f766e'))


def tag(text, bg, fg, bold=True):
    return ('<span style="font-size:11px;background:' + bg + ';color:' + fg + ';'
            'border-radius:5px;padding:2px 7px;white-space:nowrap;'
            + ('font-weight:700' if bold else '') + '">' + text + '</span>')


def kpis(kpi=None):
    cards = ''
    for k, v, c in (kpi or KPI):
        cards += ('<div class="card" style="padding:10px 12px">'
                  '<div style="font-size:11px;color:#6b7280">' + k + '</div>'
                  '<div style="font-size:17px;font-weight:700;color:' + c + '">' + v
                  + '</div></div>')
    return ('<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;'
            'margin-bottom:12px">' + cards + '</div>')


def bar(company='고객사 전체', service='인증 서비스 전체', q='', count=15):
    srch = ('<div class="inp' + ('' if q else ' ph') + '" style="width:230px">'
            + (q or 'ID(email) · 이름 · 고객사 검색') + '</div>')
    return ('<div class="card" style="padding:10px 12px;margin-bottom:10px;display:flex;'
            'gap:8px;align-items:center;flex-wrap:wrap;font-size:12.5px">'
            + sel(company, w=200) + sel(service, w=170) + srch
            + '<span style="color:#9ca3af">' + str(count) + '건</span>'
            '<span style="flex:1"></span>'
            '<span class="btn pri">＋ 계정 추가</span></div>')


HEADS = ('고객사', 'ID (EMAIL)', '이름', '인증 서비스', 'App Key', '코드 범위', '사용기간', '등록일', '')


def perm_cell(services, n):
    """CasterN 권한 칸 — 인증 서비스에 CasterN 이 있을 때만 표시"""
    if 'CasterN' not in (services or ()):
        return '<span style="color:#9ca3af">—</span>'
    if n == 0:
        return '<span style="color:#dc2626">미지정</span>'
    if n == 6:
        return tag('전체 6', '#eef6ff', '#2563eb')
    return '<span>' + str(n) + ' / 7</span>'


def table(rows=None, empty=None):
    th = ''.join('<th style="text-align:center">' + h + '</th>' for h in HEADS)
    body = ''
    if empty:
        msg = ('등록된 계정이 없습니다. [＋ 계정 추가]로 등록하세요.'
               if empty == 'none' else '조건에 맞는 계정이 없습니다.')
        body = ('<tr><td colspan="9" style="text-align:center;color:#9ca3af;'
                'padding:30px">' + msg + '</td></tr>')
    for (co, aid, nm, svc, keys, nrange, period, at) in (ROWS if rows is None else rows):
        if svc:
            svc_tag = ' '.join(
                tag(x + ('' if x in READY else ' · 준비중'),
                    '#ecfdf5' if x in READY else '#f3f4f6',
                    '#047857' if x in READY else '#6b7280')
                for x in svc)
        else:
            # 선택 없음 = SDK 연동(코드만 할당) — 오류가 아니라 정상 상태 `PC-076`
            svc_tag = tag('SDK 연동 (코드만 할당)', '#f3f4f6', '#6b7280')
        if keys:
            key_tag = ('<span style="font-family:ui-monospace,monospace;font-size:11px;'
                       'color:#2563eb">%s</span>' % keys)
        elif keys is None:          # 대장에 범위는 있는데 키 값이 없다 `PC-103`
            key_tag = tag('키 미기재', '#fef3c7', '#92400e')
        else:
            key_tag = tag('미발급', '#f3f4f6', '#9ca3af', bold=False)
        range_tag = (tag('%d개' % nrange, '#eef6ff', '#2563eb') if nrange
                     else '<span style="color:#c7cbd4">—</span>')
        period_txt = (period if period else '<span style="color:#c7cbd4">—</span>')
        at_txt = (tag('대장', '#f0fdfa', '#0f766e') if at == '대장' else at)
        body += ('<tr>'
                 '<td style="text-align:left;font-weight:600">' + co + '</td>'
                 '<td style="text-align:left"><span class="lnk" '
                 'style="font-family:ui-monospace,monospace;font-weight:600">' + aid
                 + '</span></td>'
                 '<td style="text-align:left">' + (nm or '—') + '</td>'
                 '<td style="white-space:nowrap">' + svc_tag + '</td>'
                 '<td style="white-space:nowrap">' + key_tag + '</td>'
                 '<td style="white-space:nowrap">' + range_tag + '</td>'
                 '<td style="font-family:ui-monospace,monospace;color:#6b7280;'
                 'white-space:nowrap;font-size:11.5px">' + period_txt + '</td>'
                 '<td style="font-family:ui-monospace,monospace;color:#6b7280">' + at_txt
                 + '</td>'
                 '<td style="white-space:nowrap;text-align:right">'
                 '<span class="lnk">상세</span>'
                 '<span class="lnk" style="margin-left:6px;color:#dc2626">삭제</span>'
                 '</td></tr>')
    return ('<div class="card" style="padding:0;overflow:auto">'
            '<table style="text-align:center;min-width:1280px"><tr>' + th + '</tr>'
            + body + '</table></div>')


def content(kpi=None, company='고객사 전체', service='인증 서비스 전체', q='', count=15,
            rows=None, empty=None):
    return ('<div style="min-width:0">' + kpis(kpi) + bar(company, service, q, count)
            + table(rows, empty) + '</div>')


def scr(h=1120, **kw):
    return frame('TKT-01', 'App Key 관리 (계정 발급)', content(**kw), height=h)


NAV = [('사이드바 [N Key 발급]', '클릭', '<code>TKT-04</code>', '물리 키 발급'),
       ('사이드바 [Key 발급 정산]', '클릭', '<code>TKT-03</code>', '발급 이력·정산')]

ZERO_KPI = (('등록 계정', '0', '#111827'), ('App Key 연동', '0', '#2563eb'),
            ('App Key 없음', '0', '#92400e'), ('발급 App Key', '0', '#7c3aed'),
            ('대장 계정', '0', '#0f766e'))


def build():
    B = []

    B.append((
        'S1', '계정 목록 — 기본', '기본',
        '좌측 메뉴 <b>[티켓 발급] ▸ [계정 발급]</b>(<code>/tickets/account</code>) 의 첫 화면. '
        '등록된 <b>모든 고객사의 계정</b>을 한 표로 본다. 한 고객사에 계정을 '
        '<b>여러 개</b> 둘 수 있다 <code>PC-029</code>. '
        '<b>ID</b> 나 <b>[상세]</b> 를 누르면 <code>TKT-02</code> 상세·수정으로 간다. '
        '처음 열면 <b>개발팀 대장의 계정 15건</b>이 들어와 있다 <code>PC-103</code> — '
        '등록일 자리에 <b>대장</b> 배지, 대장에 키 값이 없으면 <b>키 미기재</b>.',
        scr(),
        [('[＋ 계정 추가]', '클릭', '<code>TKT-02</code> 등록',
          '<code>/tickets/account/new</code>'),
         ('ID(email) · [상세]', '클릭', '<code>TKT-02</code> 상세·수정',
          '<code>/tickets/account/{email}</code>'),
         ('[삭제]', '클릭', 'S5 확인창', '계정과 <b>연동 App Key가 함께</b> 삭제된다'),
         ('요약 5칸', '표시', '—', '등록 계정 · App Key 연동 · App Key 없음 · 발급 App Key · '
          '<b>대장 계정</b> <code>PC-103</code>'),
         ('인증 서비스 칸', '표시', '—',
          '계정이 가진 서비스를 <b>모두</b> 배지로 <code>PC-076</code> — 조건 미정의 서비스는 '
          '<b>준비중</b> 표기 · <b>하나도 없으면 「SDK 연동 (코드만 할당)」</b>(정상 상태)'),
         ('인증 서비스 칸', '클릭', '<code>TKT-02</code> ▸ <b>인증 서비스 및 권한</b> 탭',
          '상세에 들어가 탭을 다시 찾지 않게 한다 <code>PC-067</code>'),
         ('레코드(행)', '클릭', '<code>TKT-02</code>',
          '<b>행 어디를 눌러도 계정 상세로 간다</b> <code>PC-053</code> · 행 안의 [상세]·[삭제]는 분리'),
         ('~~CasterN 권한 칸~~', '—', '<b>삭제</b>',
          '권한은 <b>계정 상세</b>에서 본다 <code>PC-053</code>'),
         ('App Key 칸', '표시', '—',
          '<b>발급된 키 값을 그대로</b> 보여 준다 <code>PC-067</code> — 영문·숫자 <b>29자</b> '
          '<code>PC-066</code> · 없으면 <b>미발급</b> · 대장에 범위만 있고 키 값이 없으면 '
          '<b>키 미기재</b> <code>PC-103</code>'),
         ('코드 범위 칸', '표시', '—',
          '그 키에 물린 <b>S/O/B/P 범위 수</b> <code>PC-103</code> — 툴팁에 범위 전체 · 클릭하면 '
          '<code>TKT-02</code> ▸ <b>App Key 발급</b> 탭'),
         ('사용기간 칸', '표시', '—', '대장의 사용기간 <b>시작 ~ 끝</b>(무제한) · 없으면 —'),
         ('등록일 칸', '표시', '—', '화면에서 등록한 날짜 · 대장 시드는 <b>대장</b> 배지 <code>PC-103</code>'),
         ('App Key 칸', '클릭', '<code>TKT-02</code> ▸ <b>App Key 발급</b> 탭',
          '항목마다 그 항목의 탭으로 간다 <code>PC-067</code>'),
         ('그 밖의 셀(행)', '클릭', '<code>TKT-02</code> ▸ <b>계정 정보</b> 탭',
          '기본 이동 <code>PC-067</code>')] + NAV))

    B.append((
        'S2', '등록된 계정 없음', '기본',
        '아직 계정이 하나도 없을 때. 표 자리에 안내만 나오고 '
        '<b>[＋ 계정 추가]</b> 로 등록을 시작한다.',
        scr(h=560, kpi=ZERO_KPI, count=0, rows=(), empty='none'),
        [('안내 문구', '표시', '—',
          '<b>등록된 계정이 없습니다. [＋ 계정 추가]로 등록하세요.</b>'),
         ('[＋ 계정 추가]', '클릭', '<code>TKT-02</code> 등록', '계정 수 제한 없음')] + NAV))

    B.append((
        'S3', '필터 · 검색', '분기',
        '고객사 · 사용처 · 검색어로 목록을 좁힌다. 검색은 '
        '<b>ID(email) · 이름 · 고객사</b> 를 함께 본다. 세 조건은 <b>동시에</b> 걸린다. '
        '사용처는 <b>포함 기준</b>이라 여러 서비스를 쓰는 계정은 각 필터에 모두 잡힌다.',
        scr(h=640, company='NHN EDU', service='CasterN', q='nhn', count=1,
            rows=ROWS[12:13]),
        [('고객사', '선택', '해당 고객사만', '계정이 등록된 고객사만 목록에 나온다'),
         ('사용처', '선택', '<b>포함 기준</b>',
          '그 서비스를 사용처로 가진 계정을 모두 — 여러 서비스를 쓰는 계정은 '
          '<b>각 필터에 모두 잡힌다</b>'),
         ('검색', '입력', '즉시 필터', 'ID(email) · 이름 · 고객사'),
         ('건수', '표시', '—', '필터 결과 건수'),
         ('요약 4칸', '—', '고정',
          '요약은 <b>전체 기준</b>이며 필터의 영향을 받지 않는다')] + NAV))

    B.append((
        'S4', '결과 없음', '차단',
        '조건에 맞는 계정이 없을 때. 필터를 바꾸거나 계정을 새로 등록한다.',
        scr(h=560, company='Tranwisdom', service='CasterN', q='', count=0, rows=(),
            empty='filter'),
        [('안내 문구', '표시', '—', '<b>조건에 맞는 계정이 없습니다.</b>'),
         ('필터 해제', '선택', 'S1', '고객사·사용처를 전체로 되돌린다')] + NAV))

    B.append((
        'S5', '계정 삭제 확인창', '확인창',
        '계정을 지우면 <b>연동된 App Key 도 함께</b> 사라진다. '
        '되돌릴 수 없으므로 확인창으로 한 번 막는다.',
        frame('TKT-01', 'App Key 관리 (계정 발급)', content(),
              overlay='<div class="ovl"><div class="mdl">'
                      '<div class="mh"><div class="mt">확인</div>'
                      '<div class="mx">✕</div></div>'
                      '<div style="font-size:13px;color:#374151;line-height:1.7">'
                      '이 계정과 연동 App Key를 삭제할까요?</div>'
                      '<div class="mf"><div class="btn gho">취소</div>'
                      '<div class="btn dan">삭제</div></div></div></div>',
              height=1120),
        [('[삭제]', '클릭', '계정 + 키 삭제', '목록에서 사라진다 · 대장 계정을 지워도 <b>다시 들어오지 않는다</b> <code>PC-103</code>'),
         ('[취소]', '클릭', '<code>TKT-01</code>', '변경 없음'),
         ('키만 삭제', '—', '<code>TKT-02</code>',
          '개별 App Key 는 상세 화면에서 지운다')] + NAV))

    intro = ('<b>계정 발급</b> 은 서비스 로그인 계정을 관리하는 화면이다. '
             '이 화면은 <b>목록</b>이며 등록·상세 수정은 <code>TKT-02</code> 이다.<br>'
             '계정은 <b>고객사당 여러 개</b>(제한 없음)를 둘 수 있고 ID(email)만 전체에서 '
             '유일하면 된다 <code>PC-029</code>. <b>App Key 발급은 선택</b>이라 '
             '계정만 먼저 만들어 두었다가 나중에 상세 화면에서 키를 붙일 수 있다.<br>'
             'CasterN 계정은 <b>권한 6종</b>(프로젝트 생성 · 심볼 편집 · 리소스 편집 · '
             'Ncode PDF 내보내기 · NCP2 내보내기 · App용 패키지 내보내기)을 '
             '개별 또는 모두 지정한다 <code>PC-031</code> <code>PC-058</code> <code>PC-105</code>.<br>'
             '처음 열면 <b>개발팀 대장</b>(db/source/Caster_계정_퍼미션_티켓.xlsx)의 계정 15건이 '
             '시드로 들어와 있다 <code>PC-103</code> — SDK 를 쓰는 고객이 반드시 받아야 하는 '
             'App Key 의 관리 대장이다. 대장의 <b>비밀번호는 저장하지 않는다</b>.')
    return page(CODE, NAME, PRD, intro, B)
