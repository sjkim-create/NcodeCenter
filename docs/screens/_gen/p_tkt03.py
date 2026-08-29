# -*- coding: utf-8 -*-
"""TKT-01 계정 발급 (계정 목록) — 실제 화면 구조 그대로.

요약 4칸 → 한 줄 필터(고객사·사용처·검색 + [＋ 계정 추가]) → 8열 표.
등록·상세 수정은 TKT-02 (p_tkt02.py).
"""
from shell import page, frame
from p_tkt01 import sel

CODE, NAME = 'TKT-01', '계정 발급'
PRD = 'docs/prd/TKT-01_계정 발급.md'

# lib/accountStore.ts — (고객사, ID(email), 이름, 사용처, 권한 수, App Key 수, 등록일)
ROWS = (
    ('웅진씽크빅', 'wj_edit@wjthinkbig.com', '웅진 편집팀', 'CasterN', 7, 2, '2026-08-20'),
    ('웅진씽크빅', 'wj_design@wjthinkbig.com', '웅진 디자인', 'CasterN', 3, 0, '2026-08-22'),
    ('웅진씽크빅', 'wj_sdk@wjthinkbig.com', '웅진 SDK', 'SDK 연동', 0, 1, '2026-08-25'),
    ('대교', 'daekyo_form@daekyo.com', '대교 폼솔루션', '폼솔루션', 0, 1, '2026-08-26'),
    ('한솔교육', 'hansol_old@hansol.com', '(구) 담당자', None, 0, 1, '2025-11-03'),
)

KPI = (('등록 계정', '5', '#111827'), ('App Key 연동', '4', '#2563eb'),
       ('App Key 없음', '1', '#92400e'), ('발급 App Key', '5', '#7c3aed'))


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
    return ('<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;'
            'margin-bottom:12px">' + cards + '</div>')


def bar(company='고객사 전체', service='사용처 전체', q='', count=5):
    srch = ('<div class="inp' + ('' if q else ' ph') + '" style="width:230px">'
            + (q or 'ID(email) · 이름 · 고객사 검색') + '</div>')
    return ('<div class="card" style="padding:10px 12px;margin-bottom:10px;display:flex;'
            'gap:8px;align-items:center;flex-wrap:wrap;font-size:12.5px">'
            + sel(company, w=200) + sel(service, w=170) + srch
            + '<span style="color:#9ca3af">' + str(count) + '건</span>'
            '<span style="flex:1"></span>'
            '<span class="btn pri">＋ 계정 추가</span></div>')


HEADS = ('고객사', 'ID (EMAIL)', '이름', '사용처', 'CasterN 권한', 'App Key', '등록일', '')


def perm_cell(service, n):
    """CasterN 권한 칸 — 전체 / 부분 / 미지정 / 해당 없음"""
    if service != 'CasterN':
        return '<span style="color:#9ca3af">—</span>'
    if n == 0:
        return '<span style="color:#dc2626">미지정</span>'
    if n == 7:
        return tag('전체 7', '#eef6ff', '#2563eb')
    return '<span>' + str(n) + ' / 7</span>'


def table(rows=None, empty=None):
    th = ''.join('<th style="text-align:center">' + h + '</th>' for h in HEADS)
    body = ''
    if empty:
        msg = ('등록된 계정이 없습니다. [＋ 계정 추가]로 등록하세요.'
               if empty == 'none' else '조건에 맞는 계정이 없습니다.')
        body = ('<tr><td colspan="8" style="text-align:center;color:#9ca3af;'
                'padding:30px">' + msg + '</td></tr>')
    for (co, aid, nm, svc, perms, keys, at) in (ROWS if rows is None else rows):
        svc_tag = (tag(svc, '#ecfdf5', '#047857') if svc
                   else tag('미지정', '#fef2f2', '#b91c1c'))
        key_tag = tag(str(keys), '#eef6ff' if keys else '#f3f4f6',
                      '#2563eb' if keys else '#9ca3af', bold=False)
        body += ('<tr>'
                 '<td style="text-align:left;font-weight:600">' + co + '</td>'
                 '<td style="text-align:left"><span class="lnk" '
                 'style="font-family:ui-monospace,monospace;font-weight:600">' + aid
                 + '</span></td>'
                 '<td style="text-align:left">' + (nm or '—') + '</td>'
                 '<td>' + svc_tag + '</td>'
                 '<td>' + perm_cell(svc, perms) + '</td>'
                 '<td>' + key_tag + '</td>'
                 '<td style="font-family:ui-monospace,monospace;color:#6b7280">' + at
                 + '</td>'
                 '<td style="white-space:nowrap;text-align:right">'
                 '<span class="lnk">상세</span>'
                 '<span class="lnk" style="margin-left:6px;color:#dc2626">삭제</span>'
                 '</td></tr>')
    return ('<div class="card" style="padding:0;overflow:auto">'
            '<table style="text-align:center;min-width:980px"><tr>' + th + '</tr>'
            + body + '</table></div>')


def content(kpi=None, company='고객사 전체', service='사용처 전체', q='', count=5,
            rows=None, empty=None):
    return ('<div style="min-width:0">' + kpis(kpi) + bar(company, service, q, count)
            + table(rows, empty) + '</div>')


def scr(h=780, **kw):
    return frame('TKT-01', '계정 발급', content(**kw), height=h)


NAV = [('사이드바 [N Key 발급]', '클릭', '<code>TKT-04</code>', '물리 키 발급'),
       ('사이드바 [Key 발급 정산]', '클릭', '<code>TKT-03</code>', '발급 이력·정산')]

ZERO_KPI = (('등록 계정', '0', '#111827'), ('App Key 연동', '0', '#2563eb'),
            ('App Key 없음', '0', '#92400e'), ('발급 App Key', '0', '#7c3aed'))


def build():
    B = []

    B.append((
        'S1', '계정 목록 — 기본', '기본',
        '좌측 메뉴 <b>[티켓 발급] ▸ [계정 발급]</b>(<code>/tickets/account</code>) 의 첫 화면. '
        '등록된 <b>모든 고객사의 계정</b>을 한 표로 본다. 한 고객사에 계정을 '
        '<b>여러 개</b> 둘 수 있다 <code>PC-029</code>. '
        '<b>ID</b> 나 <b>[상세]</b> 를 누르면 <code>TKT-02</code> 상세·수정으로 간다.',
        scr(),
        [('[＋ 계정 추가]', '클릭', '<code>TKT-02</code> 등록',
          '<code>/tickets/account/new</code>'),
         ('ID(email) · [상세]', '클릭', '<code>TKT-02</code> 상세·수정',
          '<code>/tickets/account/{email}</code>'),
         ('[삭제]', '클릭', 'S5 확인창', '계정과 <b>연동 App Key가 함께</b> 삭제된다'),
         ('요약 4칸', '표시', '—', '등록 계정 · App Key 연동 · App Key 없음 · 발급 App Key'),
         ('CasterN 권한 칸', '표시', '—',
          '<b>전체 7</b> / <b>{n} / 7</b>(마우스를 올리면 권한 이름) / '
          '<b>미지정</b>(빨강) / <b>—</b>(CasterN 아님)'),
         ('App Key 칸', '표시', '—', '이 계정에 연동된 키 개수 · 0이면 회색')] + NAV))

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
        '<b>ID(email) · 이름 · 고객사</b> 를 함께 본다. 세 조건은 <b>동시에</b> 걸린다.',
        scr(h=640, company='웅진씽크빅', service='CasterN', q='wj_', count=2,
            rows=ROWS[:2]),
        [('고객사', '선택', '해당 고객사만', '계정이 등록된 고객사만 목록에 나온다'),
         ('사용처', '선택', '해당 서비스만', 'CasterN / 폼솔루션 / SDK 연동'),
         ('검색', '입력', '즉시 필터', 'ID(email) · 이름 · 고객사'),
         ('건수', '표시', '—', '필터 결과 건수'),
         ('요약 4칸', '—', '고정',
          '요약은 <b>전체 기준</b>이며 필터의 영향을 받지 않는다')] + NAV))

    B.append((
        'S4', '결과 없음', '차단',
        '조건에 맞는 계정이 없을 때. 필터를 바꾸거나 계정을 새로 등록한다.',
        scr(h=560, company='대교', service='CasterN', q='', count=0, rows=(),
            empty='filter'),
        [('안내 문구', '표시', '—', '<b>조건에 맞는 계정이 없습니다.</b>'),
         ('필터 해제', '선택', 'S1', '고객사·사용처를 전체로 되돌린다')] + NAV))

    B.append((
        'S5', '계정 삭제 확인창', '확인창',
        '계정을 지우면 <b>연동된 App Key 도 함께</b> 사라진다. '
        '되돌릴 수 없으므로 확인창으로 한 번 막는다.',
        frame('TKT-01', '계정 발급', content(),
              overlay='<div class="ovl"><div class="mdl">'
                      '<div class="mh"><div class="mt">확인</div>'
                      '<div class="mx">✕</div></div>'
                      '<div style="font-size:13px;color:#374151;line-height:1.7">'
                      '이 계정과 연동 App Key를 삭제할까요?</div>'
                      '<div class="mf"><div class="btn gho">취소</div>'
                      '<div class="btn dan">삭제</div></div></div></div>',
              height=780),
        [('[삭제]', '클릭', '계정 + 키 삭제', '목록에서 사라진다'),
         ('[취소]', '클릭', '<code>TKT-01</code>', '변경 없음'),
         ('키만 삭제', '—', '<code>TKT-02</code>',
          '개별 App Key 는 상세 화면에서 지운다')] + NAV))

    intro = ('<b>계정 발급</b> 은 서비스 로그인 계정을 관리하는 화면이다. '
             '이 화면은 <b>목록</b>이며 등록·상세 수정은 <code>TKT-02</code> 이다.<br>'
             '계정은 <b>고객사당 여러 개</b>(제한 없음)를 둘 수 있고 ID(email)만 전체에서 '
             '유일하면 된다 <code>PC-029</code>. <b>App Key 발급은 선택</b>이라 '
             '계정만 먼저 만들어 두었다가 나중에 상세 화면에서 키를 붙일 수 있다.<br>'
             'CasterN 계정은 <b>권한 7종</b>(프로젝트 생성 · 심볼 편집 · 리소스 편집 · '
             'Ncode PDF 내보내기 · NCP2 내보내기 · App용 패키지 내보내기 · '
             'App 페이지 설정)을 개별 또는 모두 지정한다 <code>PC-031</code>.')
    return page(CODE, NAME, PRD, intro, B)
