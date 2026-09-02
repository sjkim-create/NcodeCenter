# -*- coding: utf-8 -*-
"""MEM-02 고객사 등록·수정 — 모달이 아니라 별도 페이지 2개.

좌측 3탭(기본 정보 / 편집 단가 / 관련 서류) · 수정 화면은 우측에 업무요청 메모 고정.
단가는 소리펜·필기펜을 그룹 카드로 나누고 그룹별 기본값 복원을 둔다.
"""
from shell import page, frame

CODE, NAME = 'MEM-02', '고객사 등록·수정'
PRD = 'docs/prd/MEM-02_고객사 등록·수정.md'

BASIC = (('업체명', '✔', '웅진씽크빅'), ('담당자', '', '김태호'), ('연락처', '', '031-956-7000'),
         ('사업자등록증번호', '', '215-81-06943'), ('주소', '', '경기도 파주시 회동길 20'),
         ('은행명', '', '신한은행'), ('계좌번호', '', '140-011-******'),
         ('세금계산서 발행용 이메일', '', 'tax@wjthinkbig.com'))

# lib/pricing.ts RATE_ITEMS — (항목, 단위, 기본단가, 전용여부)
# 소리펜 16항목 · 필기펜 6항목 — 양쪽 모두 'Ncode 적용'(페이지당)을 포함한다.
PRICE_NSP = (('Ncode 적용', '페이지당', '500', False),
             ('Ncode 편집(기본)', '심볼당', '1,200', True),
             ('Compound 2언어', '심볼당', '1,300', False),
             ('Compound 3언어', '심볼당', '1,600', False),
             ('Compound 4언어', '심볼당', '1,900', False),
             ('Compound 5언어', '심볼당', '2,200', False),
             ('Compound 6언어', '심볼당', '2,500', False),
             ('Compound 7언어', '심볼당', '2,800', False),
             ('Compound 8언어', '심볼당', '3,100', False),
             ('슬롯전환', '건당', '3,000', False),
             ('그룹재생', '건당', '5,000', False),
             ('게임', '건당', '60,000', True),
             ('프롬프트 편집', '건당', '50,000', False),
             ('RAG 데이터 업로드', '건당', '50,000', False),
             ('4도 Ncode 출력', '페이지당', '1,200', True))
PRICE_NWP = (('Ncode 적용', '페이지당', '500', False),
             ('none 편집비용', '심볼당', '1,000', False),
             ('Custom', '심볼당', '1,000', False),
             ('action 변경 편집', '심볼당', '1,500', False),
             ('노트서버 업로드', '건당', '10,000', False),
             ('교원구몬/KEP', '건당', '1,000', False))

MEMOS = (('3', '요청', '고객사', '2026-08-24 16:20', '김순정', '범블비 전집 OID 북코드 33권 추가 발급 요청'),
         ('2', '처리', '내부', '2026-08-22 11:05', '김순정', 'S3/O17 Book 431~464 할당 완료 · 티켓 전달'),
         ('1', '메모', '내부', '2026-08-20 09:41', '박지훈', '2026년 편집 단가 협의 — 편집/게임/4도출력 3항목 전용가 적용'))


def fld(label, req, val, ro=False, ph=False, err=False):
    cls = 'inp'
    if ro:
        cls += ' ro'
    if ph:
        cls += ' ph'
    if err:
        cls += ' err'
    r = ' <span style="color:#dc2626">*</span>' if req else ''
    return ('<div class="fld"><span class="lbl">%s%s</span><div class="%s">%s</div></div>'
            % (label, r, cls, val))


def basic_card(name_err=False, empty=False, closed=False):
    fs = []
    for i, (lb, req, v) in enumerate(BASIC):
        val = v
        ph = False
        if empty:
            val = {'업체명': '업체명을 입력하세요', '담당자': '담당자명', '연락처': '02-0000-0000',
                   '사업자등록증번호': '000-00-00000', '주소': '주소', '은행명': '은행명',
                   '계좌번호': '계좌번호', '세금계산서 발행용 이메일': 'tax@company.com'}[lb]
            ph = True
        fs.append(fld(lb, req == '✔', val, ph=ph, err=(name_err and lb == '업체명')))
    err = '<div class="inline-err">업체명은 필수입니다.</div>' if name_err else ''
    # 사용 서비스 — **고객사 속성** `PC-076`. 서비스마다 딸린 설정이 달라 **탭**으로 나눈다 `PC-077`.
    #   casterN 탭 안에 프로젝트 상태 · 공통코드 사용 고객사가 들어간다.
    def svc_tabbar(cur, on_cast):
        out = ''
        for v, label, ready in (('CASTERN', 'casterN (편집툴)', True),
                                ('FORMSOLUTION', '폼솔루션', False)):
            is_cur = (v == cur)
            on = on_cast if v == 'CASTERN' else False
            rd = ('<span class="tag" style="margin-left:6px;background:#fff7ed;color:#c2410c">'
                  '준비중</span>') if not ready else ''
            out += ('<div style="flex:1;text-align:center;padding:10px 8px;font-size:12.5px;'
                    'border-bottom:2px solid %s;background:%s;font-weight:%s;color:%s">'
                    '%s%s%s</div>'
                    % ('#2563eb' if is_cur else 'transparent',
                       '#fff' if is_cur else 'transparent',
                       '700' if is_cur else '400',
                       '#1d4ed8' if is_cur else ('#374151' if on else '#9ca3af'),
                       '<span style="color:#2563eb;margin-right:4px">&#10003;</span>' if on else '',
                       label, rd))
        return ('<div style="display:flex;border-bottom:1px solid #eef0f4;'
                'background:#fafbfc">%s</div>' % out)

    def svc_check(label, desc, on):
        return ('<label style="display:flex;align-items:flex-start;gap:9px">'
                '<input type="checkbox"%s style="margin-top:2px">'
                '<span style="font-size:12.5px"><b style="color:%s">%s</b>'
                '<div style="font-size:11px;color:#9ca3af;margin-top:2px;line-height:1.6">%s'
                '</div></span></label>'
                % (' checked' if on else '', '#1e3a8a' if on else '#374151', label, desc))

    st = ('<div style="margin-top:12px">'
          '<div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:8px">'
          '프로젝트 상태</div>'
          '<div style="border:1px solid %s;background:%s;border-radius:10px;padding:12px 14px">'
          '<div class="row" style="gap:6px"><span class="chip%s">진행</span>'
          '<span class="chip%s">종료</span></div>'
          '<div style="font-size:11px;color:#9ca3af;margin-top:6px">사업 종료 시 코드 발급 이력만 '
          '유지되고, 목록·코드 프로젝트에서 비활성(회색)으로 표시됩니다.</div>%s</div></div>'
          % ('#fca5a5' if closed else '#e5e7eb', '#fef2f2' if closed else '#fafbfc',
             '' if closed else ' on', ' on' if closed else '',
             ('<div style="margin-top:10px">' + fld('종료 사유', False, '스마트펜 사업 정리 (2026-06)')
              + fld('코드 이관 메모', False, '엠베스트-28로 코드 이관 · 발급 이력 보존')
              + '</div>') if closed else ''))

    on_cast = not empty
    cast_panel = (svc_check('casterN (편집툴)',
                            '우리가 이 고객사 자료를 편집한다 — [편집 프로젝트]의 대상이 된다', on_cast)
                  + (st if on_cast else
                     '<div style="margin-top:10px;font-size:11.5px;color:#9ca3af;line-height:1.7">'
                     'casterN 으로 선택하면 <b>프로젝트 상태</b>·<b>공통코드 사용 고객사</b> 를 '
                     '지정할 수 있습니다.</div>'))

    svc = ('<div class="fld" style="grid-column:1/-1"><span class="lbl">사용 서비스</span>'
           '<div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">'
           '%s<div style="padding:12px 14px">%s</div></div>'
           '<div style="font-size:11px;color:#9ca3af;margin-top:6px;line-height:1.7">'
           '<b>아무것도 고르지 않으면 「SDK 연동 (코드만 할당)」</b> 입니다 — 우리 서비스를 거치지 않고 '
           '코드만 받아 직접 연동하는 고객사입니다.</div></div>'
           % (svc_tabbar('CASTERN', on_cast), cast_panel))

    closed_fs = ''
    return ('<div class="card"><div class="hd">기본 정보</div><div class="bd">'
            '<div class="g2" style="gap:12px">%s%s%s</div>%s</div></div>'
            % (''.join(fs[:1]) + err, ''.join(fs[1:]), svc, closed_fs))


def form_panel():
    """폼솔루션 탭 — 지정할 항목이 없다. 어디에 나타나는지만 알려 준다 `PC-077`"""
    chk = ('<label style="display:flex;align-items:flex-start;gap:9px">'
           '<input type="checkbox" style="margin-top:2px">'
           '<span style="font-size:12.5px"><b style="color:#374151">폼솔루션</b>'
           '<div style="font-size:11px;color:#9ca3af;margin-top:2px;line-height:1.6">'
           '폼솔루션 서비스로 관리한다 — 서비스 개발 전이라 아직 지정된 고객사가 없다'
           '</div></span></label>')
    note = ('<div style="margin-top:10px;font-size:12px;color:#6b7280;line-height:1.75;'
            'border:1px solid #eef0f4;background:#fafbfc;border-radius:9px;padding:10px 12px">'
            '<b style="color:#c2410c">준비중</b> — 폼솔루션에서 지정할 항목은 아직 없습니다. '
            '선택하면 이 고객사가 <b>[폼솔루션 서비스 관리]</b> 화면에 나타납니다.</div>')
    return ('<div class="card"><div class="hd">사용 서비스 &middot; 폼솔루션 탭</div>'
            '<div class="bd">%s%s</div></div>' % (chk, note))


def common_card(is_parent=False):
    # 실제 레지스트리(commonCodes.ts) 기준 `PC-044` — 여러 고객사가 함께 쓰는 코드만 올라온다
    items = [('Common-21 · PDS2 S3/O21', False, False),
             ('네오노트-3-27 · PDS3 S3/O27', False, False),
             ('스마트클래스키트-1013 · PDS3 S3/O1013', False, False)]
    if is_parent:
        items[0] = ('Common-21 · PDS2 S3/O21 <span class="tag">자기 보유 코드</span>', False, True)
    li = ''.join('<label style="display:flex;align-items:center;gap:8px;font-size:12.5px;'
                 'padding:7px 2px;color:%s"><input type="checkbox"%s%s> %s</label>'
                 % ('#cbd5e1' if dis else '#374151', ' checked' if ck else '',
                    ' disabled' if dis else '', nm)
                 for nm, ck, dis in items)
    note = ('<div style="font-size:11.5px;color:#6b7280;background:#f8fafc;border-radius:8px;'
            'padding:9px 11px;margin-top:8px;line-height:1.6">'
            '이미 발급된 공통코드를 쓰므로 <b>코드 할당은 없고</b>, 편집 프로젝트·티켓 발급에서 '
            '하위 고객사로 관리됩니다.</div>')
    if is_parent:
        note = ('<div class="toast warn" style="margin:8px 0 0">대표(상위) 회사는 '
                '<b>자기 코드의 하위가 될 수 없어</b> 해당 항목이 비활성입니다. <code>PC-015</code></div>')
    return ('<div class="card"><div class="hd">사용 서비스 &middot; casterN 탭 &mdash; 공통코드 사용 고객사(하위) 등록'
            '<div class="sp"></div><span style="font-size:11px;color:#9ca3af;font-weight:400">'
            '대표 회사 아래로 귀속 · 코드 할당 불필요</span></div>'
            '<div class="bd">%s%s</div></div>' % (li, note))


def price_card(n_custom=3):
    """항목별 단가 입력 — 2열 그리드. 기본값과 다르면 주황으로 강조된다."""
    def group(title, note, items, tone):
        # 소리펜·필기펜은 정산 단위가 다른 별개 묶음이라 카드로 나눠 색을 달리한다
        cells = ''
        n_own = 0
        for nm, unit, v, own in items:
            if own:
                n_own += 1
            cells += ('<label style="display:flex;align-items:center;gap:6px;font-size:12px">'
                      '<span style="flex:1;color:%s;%s">%s '
                      '<span style="color:#9ca3af;font-size:10.5px">%s</span></span>'
                      '<div class="inp" style="width:92px;text-align:right;padding:5px 8px;%s">'
                      '%s</div></label>'
                      % ('#b45309' if own else '#4b5563',
                         'font-weight:700' if own else '', nm, unit,
                         'border-color:#f59e0b;background:#fffbeb;' if own else '', v))
        fg, bg, bd = tone
        badge = ''
        if n_own:
            badge = ('<span class="tag y">전용 %d</span>'
                     '<span class="lnk" style="font-size:11px">기본값</span>' % n_own)
        return ('<div style="border:1px solid %s;border-radius:10px;overflow:hidden;'
                'margin-top:12px">'
                '<div style="display:flex;align-items:center;gap:7px;padding:9px 12px;'
                'background:%s;border-bottom:1px solid %s">'
                '<b style="font-size:12.5px;color:%s">%s</b>'
                '<span style="font-size:11px;color:#9ca3af">%s · %d항목</span>'
                '<span style="flex:1"></span>%s</div>'
                '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 14px;'
                'padding:11px 12px">%s</div></div>'
                % (bd, bg, bd, fg, title, note, len(items), badge, cells))
    badge = ('<span class="tag y">전용 %d항목</span>' % n_custom) if n_custom else ''
    return ('<div class="card"><div class="hd">편집 단가 (2026 항목별) '
            '<span style="font-size:11px;color:#9ca3af;font-weight:400">'
            '· 기본값에서 바꾼 항목만 전용 단가</span> %s<div class="sp"></div>'
            '<span class="btn sm">전체 기본값</span></div>'
            '<div class="bd" style="padding-top:6px">%s%s'
            '<div style="font-size:11px;color:#9ca3af;margin-top:8px;line-height:1.6">'
            '편집 프로젝트의 청구액이 이 단가로 계산됩니다(항목 수량 × 단가). '
            '단가를 바꾸면 <b>이후 등록되는 교재(책)부터 적용</b>되고, '
            '<b>기존 교재는 등록 당시 단가가 그대로 유지</b>됩니다. '
            '교재별 할인은 <b>편집 프로젝트 &gt; 교재 수정</b>에서. <code>PC-027</code></div>'
            '</div></div>'
            % (badge,
             group('🔊 소리펜', 'ncp2 산출 · mp3 심볼', PRICE_NSP,
                   ('#1d4ed8', '#f5f9ff', '#dbeafe')),
             group('✍ 필기펜', '필기 인식 · APP 연동', PRICE_NWP,
                   ('#7e22ce', '#faf5ff', '#e9d5ff'))))


def docs_card():
    return ('<div class="card"><div class="hd">관련 서류<div class="sp"></div>'
            '<span class="btn sm">＋ 서류 추가</span></div><div class="bd" style="padding:0">'
            '<table><tr><th>항목명</th><th style="width:210px">파일</th>'
            '<th style="width:56px">작업</th></tr>'
            '<tr><td>사업자등록증</td><td style="color:#5f8ff0">wj_biz_license.pdf</td>'
            '<td><span class="lnk" style="color:#dc2626">삭제</span></td></tr>'
            '<tr><td>통장 사본</td><td style="color:#5f8ff0">wj_bank.jpg</td>'
            '<td><span class="lnk" style="color:#dc2626">삭제</span></td></tr>'
            '<tr><td>2026 단가 합의서</td><td style="color:#5f8ff0">wj_price_2026.pdf</td>'
            '<td><span class="lnk" style="color:#dc2626">삭제</span></td></tr>'
            '</table></div></div>')


def memo_card(draft='', hi=None):
    rows = ''
    for no, kind, who, ts, writer, txt in MEMOS:
        cls = {'요청': 'tag b', '처리': 'tag g', '메모': 'tag'}[kind]
        mine = writer == '김순정'
        acts = ('<span class="lnk">수정</span><span class="lnk" style="color:#dc2626">삭제</span>'
                if mine else '<span style="color:#cbd5e1;font-size:11px">본인 글만 수정</span>')
        bg = ' style="background:#fff7ed"' if hi == no else ''
        rows += ('<tr%s><td style="color:#9ca3af">%s</td><td><span class="%s">%s</span></td>'
                 '<td style="font-size:11.5px;color:#6b7280">%s<br>%s</td>'
                 '<td>%s</td><td style="white-space:nowrap">%s</td></tr>'
                 % (bg, no, cls, kind, writer, ts, txt, acts))
    dv = draft or '<span style="color:#9ca3af">내용 입력 · Enter 기록 · Shift+Enter 줄바꿈</span>'
    return ('<div class="card" style="height:100%%"><div class="hd">업무요청 메모 '
            '<div class="sp"></div>'
            '<span style="font-size:11px;color:#9ca3af;font-weight:400">수정 화면 전용 · 탭과 무관하게 고정</span></div>'
            '<div class="bd" style="padding:12px 14px">'
            '<div class="row" style="gap:6px;margin-bottom:8px">'
            '<span class="chip on">요청</span><span class="chip">처리</span><span class="chip">메모</span></div>'
            '<div class="inp" style="min-height:56px">%s</div>'
            '<div style="font-size:11px;color:#9ca3af;margin-top:6px">'
            'Enter 기록 · Shift+Enter 줄바꿈 · <b>본인이 작성한 메모만</b> 수정·삭제할 수 있습니다.</div>'
            '</div><div style="padding:0 0 4px">'
            '<table><tr><th style="width:34px">No</th><th style="width:60px">종류</th>'
            '<th style="width:120px">작성자 / 시각</th><th>내용</th>'
            '<th style="width:100px">작업</th></tr>%s</table></div></div>' % (dv, rows))


TABS = (('base', '기본 정보'), ('rate', '편집 단가'), ('docs', '관련 서류'))


def tabbar(active='base', n_rate=0, n_docs=3):
    out = ''
    for v, label in TABS:
        on = (v == active)
        badge = ''
        if v == 'rate' and n_rate:
            badge = '<span class="tag y" style="font-size:10px">전용 %d</span>' % n_rate
        elif v == 'docs' and n_docs:
            badge = ('<span class="tag" style="font-size:10px;background:%s;color:%s">%d</span>'
                     % ('#eef6ff' if on else '#f3f4f6', '#2563eb' if on else '#9ca3af', n_docs))
        out += ('<div style="padding:11px 16px;font-size:13px;display:flex;align-items:center;'
                'gap:6px;white-space:nowrap;border-bottom:2px solid %s;color:%s;%s">%s%s</div>'
                % ('#5f8ff0' if on else 'transparent', '#111827' if on else '#6b7280',
                   'font-weight:700' if on else '', label, badge))
    return ('<div style="display:flex;border-bottom:1px solid #eef0f4">%s</div>' % out)


def footer(save_label='저장', edit=False):
    left = ('<div class="btn gho" style="color:#dc2626;border-color:#fecaca">고객사 삭제</div>'
            if edit else '')
    return ('<div class="row" style="align-items:center;gap:8px;margin-top:14px">%s'
            '<span style="flex:1"></span>'
            '<div class="btn gho">목록</div><div class="btn pri">%s</div></div>'
            % (left, save_label))


def panel(tab, name_err=False, empty=False, closed=False, is_parent=False, n_custom=3):
    """좌측 입력 — 항목이 길어 탭으로 나눈다. 조건이 아래로 쌓이지 않는다."""
    if tab == 'base':
        # 사용 서비스 탭 `PC-077` — casterN 딸림 설정(공통코드) · 폼솔루션 탭 안내를 함께 보인다
        return (basic_card(name_err=name_err, empty=empty, closed=closed)
                + '<div style="height:14px"></div>' + common_card(is_parent)
                + '<div style="height:14px"></div>' + form_panel())
    if tab == 'rate':
        return price_card(n_custom)
    return docs_card()


def wrap(tab, inner, n_custom=0, n_docs=3):
    return ('<div class="card" style="padding:0;overflow:hidden">%s'
            '<div style="padding:16px">%s</div></div>'
            % (tabbar(tab, n_custom, n_docs), inner))


def reg_mode(tab='base', name_err=False, n_custom=0):
    return ('<div style="max-width:640px">%s%s</div>'
            % (wrap(tab, panel(tab, name_err=name_err, empty=not name_err,
                               n_custom=n_custom), n_custom, 0),
               footer('등록')))


def edit_mode(tab='base', is_parent=False, closed=False, n_custom=3, draft='', hi=None):
    left = wrap(tab, panel(tab, closed=closed, is_parent=is_parent, n_custom=n_custom),
                n_custom, 3)
    return ('<div style="max-width:1100px">'
            '<div style="display:grid;grid-template-columns:1.15fr 0.85fr;gap:14px;'
            'align-items:start"><div>%s</div><div>%s</div></div>%s</div>'
            % (left, memo_card(draft, hi), footer(edit=True)))


def build():
    boards = []

    boards.append((
        'S1', '등록 — 기본 정보 탭', '기본',
        '<code>MEM-01</code>의 <b>[＋ 고객사 등록]</b>으로 진입. PRD §1 — 등록 모드는 '
        '<b>기본 정보 1단</b>이며 <b>업무 원장(MEM-03)이 없다</b>. 필수는 <b>업체명</b> 하나뿐.',
        frame('MEM-01', '고객사 등록', reg_mode(), height=1580),
        [('업체명', '입력 (필수)', '—', '코드·프로젝트가 이 이름으로 연결된다'),
         ('사업자등록증번호', '입력', '—', '형식 예: <code>000-00-00000</code>'),
         ('주소', '입력', '—', '<code>TKT-01</code> 계정 등록 시 <b>기본 주소</b>로 사용된다'),
         ('은행명 / 계좌번호', '입력', '—', '정산 지급용'),
         ('공통코드 체크', '체크', '하위 고객사로 등록', '<b>코드 할당이 발생하지 않는다</b> <code>P-12</code>'),
         ('편집 단가', '입력', '전용 단가 지정', '기본값에서 <b>바꾼 항목만</b> 전용 단가 <code>P-16</code>'),
         ('[등록]', '클릭', '<code>MEM-01</code> 복귀', '상단 알림 <b>등록됨 · {업체명}</b> · <code>LOG-01</code> 기록'),
         ('[취소]', '클릭', '<code>MEM-01</code> 복귀', '변경 없음')]))

    boards.append((
        'S2', '상세·수정 — 기본 정보 탭 · 업무요청 메모', '기본',
        '<code>MEM-01</code>의 <b>행 클릭</b>으로 진입. PRD §5 — 수정 모드는 '
        '<b>좌(기본 정보) / 우(업무 원장 MEM-03) 2단</b>이다.',
        frame('MEM-01', '고객사 상세 · 수정', edit_mode(), height=1580),
        [('기본 정보', '수정', '—', '등록 모드와 동일 항목'),
         ('업무 원장 종류', '클릭', '요청 / 처리 / 메모', '3종 중 단일 선택'),
         ('메모 입력', 'Enter', '기록', 'Shift+Enter 줄바꿈'),
         ('메모 [수정]·[삭제]', '클릭', '수정 / S8 확인창', '<b>본인이 작성한 메모만</b> 가능'),
         ('[저장]', '클릭', '<code>MEM-01</code> 복귀', '<b>수정됨 · {업체명}</b> · <code>LOG-01</code> 기록'),
         ('단가 변경 후 확인', '이동', '<code>PRJ-02</code> → <code>PRJ-03</code>', '청구액 재계산'),
         ('하위 등록 결과 확인', '이동', '<code>PRJ-01</code>', '공유 코드 프로젝트의 사용 고객사(하위) 목록')]))

    boards.append((
        'S3', '편집 단가 탭 — 소리펜 · 필기펜 그룹', '분기',
        '입력 항목이 길어 좌측을 <b>3탭</b>으로 나눴다 — 기본 정보 / 편집 단가 / 관련 서류. '
        '단가는 <b>소리펜</b>과 <b>필기펜</b>이 정산 단위가 다른 별개 묶음이라 '
        '<b>카드로 나누고 색을 달리</b>한다. 그룹 머리에 항목 수와 그 그룹의 '
        '<b>전용 단가 개수</b>가 붙고, 전용이 있으면 그 그룹만 되돌리는 '
        '<b>[기본값]</b> 이 나온다.',
        frame('MEM-01', '고객사 상세 · 수정', edit_mode(tab='rate'), height=1420),
        [('탭 [편집 단가]', '클릭', '단가 화면', '탭 머리에 <b>전용 {n}</b> 배지'),
         ('🔊 소리펜 그룹', '조회', '—', 'ncp2 산출 · mp3 심볼'),
         ('✍ 필기펜 그룹', '조회', '—', '필기 인식 · APP 연동'),
         ('그룹 [기본값]', '클릭', '그 그룹만 복원', '전용 단가가 있을 때만 나온다'),
         ('[전체 기본값]', '클릭', '두 그룹 모두 복원', ''),
         ('단가 입력', '입력', '전용 단가로 전환', '기본값과 다르면 강조된다')]))

    boards.append((
        'S4', '관련 서류 탭', '분기',
        '서류는 별도 탭이다. 탭 머리에 <b>등록된 서류 수</b>가 붙어 탭을 열지 않아도 '
        '상태가 보인다. 항목명은 직접 고칠 수 있다.',
        frame('MEM-01', '고객사 상세 · 수정', edit_mode(tab='docs'), height=1100),
        [('탭 [관련 서류]', '클릭', '서류 목록', '탭 머리에 <b>건수</b> 배지'),
         ('[＋ 서류 추가]', '클릭', '빈 줄 추가', '항목명 직접 입력'),
         ('항목명', '입력', '수정 가능', ''),
         ('[삭제]', '클릭', '줄 제거', '')]))

    boards.append((
        'S5', '업체명 미입력 오류', '오류',
        'PRD §5 메시지 — 업체명 없이 저장하면 상단 알림으로 막는다. 인라인으로도 함께 표시한다.',
        frame('MEM-01', '고객사 등록',
              '<div class="toast err">업체명은 필수입니다.</div>' + reg_mode(name_err=True),
              height=1620),
        [('상단 알림', '표시', '—', '<b>업체명은 필수입니다.</b>'),
         ('업체명 입력란', '표시', '오류 강조', '값을 넣으면 해제'),
         ('[등록]', '클릭', '<b>저장 안 됨</b>', '업체명 입력 전까지 저장되지 않는다')]))

    boards.append((
        'S6', '대표(상위) 회사 수정', '분기',
        'PRD §3 <code>PC-015</code> — <b>대표(상위) 회사는 자기 코드의 하위가 될 수 없어</b> '
        '해당 공통코드 항목이 <b>비활성</b>으로 표시된다.',
        frame('MEM-01', '고객사 상세 · 수정', edit_mode(is_parent=True), height=1580),
        [('자기 보유 공통코드', '—', '<b>비활성</b>', '선택 불가 <code>PC-015</code>'),
         ('안내 배너', '표시', '—', '대표(상위) 회사는 자기 코드의 하위가 될 수 없습니다'),
         ('다른 공통코드', '체크', '하위 등록', '다른 회사 공통코드는 선택 가능')]))

    boards.append((
        'S7', '전용 단가 지정됨', '변형',
        'PRD §4.4 · §5 — 기본값과 다른 항목이 있으면 <b>전용 {n}항목</b> 배지가 붙는다. '
        '<code>PRJ-03</code>에서 <b>신규 교재</b>부터 이 단가로 계산된다. '
        '단가 3단 구조: 기본 단가 → <b>이 화면의 고객사 단가</b> → 교재별 할인(<code>PRJ-04</code>).',
        frame('MEM-01', '고객사 상세 · 수정', edit_mode(n_custom=3), height=1580),
        [('전용 n항목 배지', '표시', '—', '기본값과 다른 항목 수 — 여기서는 편집·게임·4도출력 3항목'),
         ('항목별 단가 입력', '입력', '전용 단가로 전환', '항목마다 단위(페이지·심볼·건) 표시'),
         ('[전체 기본값]', '클릭', '전 항목 기본 단가로 복귀', '전용 배지 사라짐'),
         ('저장 후 새 교재 등록', '<code>PRJ-04</code>', '<b>새 단가</b>로 계산', ''),
         ('이미 등록된 교재', '—', '<b>등록 당시 단가 유지</b>', '청구액이 바뀌지 않는다 <code>PC-027</code>'),
         ('기존 교재에 새 단가 적용', '<code>PRJ-04</code>', '[현재 단가로 갱신]', '교재 수정에서 <b>개별</b> 적용'),
         ('Custom · 교원구몬/KEP', '—', '<b>미확정</b>', '⚠ §7 미결 — <code>PC-018</code> 확인 대기')]))

    boards.append((
        'S8', '프로젝트 종료 선택', '분기',
        'PRD §4.2 · §5 — 상태를 <b>종료</b>로 바꾸면 <b>종료 사유 / 코드 이관 메모</b> 입력란이 노출된다. '
        '코드 발급 이력은 <b>보존</b>된다.',
        frame('MEM-01', '고객사 상세 · 수정', edit_mode(closed=True), height=1640),
        [('[종료] 선택', '클릭', '사유·이관 메모 노출', '진행 ⇄ 종료'),
         ('종료 사유', '입력', '—', '예: 스마트펜 사업 정리'),
         ('코드 이관 메모', '입력', '—', '예: 엠베스트-28로 코드 이관'),
         ('[저장]', '클릭', '<code>MEM-01</code>', '목록에 <b>종료</b> 배지로 구분 표시'),
         ('코드 발급 이력', '—', '<b>보존</b>', '삭제와 달리 reset되지 않는다')]))

    boards.append((
        'S9', '업무요청 메모 입력 중', '분기',
        'PRD §4.6 <code>MEM-03</code> — 고객사와 주고받은 요청·처리 내역을 남기는 <b>업무 원장</b>. '
        '<b>Enter 기록 · Shift+Enter 줄바꿈</b>.',
        frame('MEM-01', '고객사 상세 · 수정',
              edit_mode(draft='범블비 전집 2차 33권 코드 재발급 요청 접수 — 8/28까지 회신 예정'),
              height=1580),
        [('종류 선택', '클릭', '요청 / 처리 / 메모', ''),
         ('입력 후 Enter', 'Enter', '기록 추가', '작성자·작성 시각과 함께 시간순 표시'),
         ('Shift+Enter', '입력', '줄바꿈', '기록되지 않음'),
         ('본인 메모 [수정]', '클릭', '인라인 수정', '본인 글만'),
         ('본인 메모 [삭제]', '클릭', 'S9 확인창', '')]))

    err_ovl = ('<div class="ovl" style="background:none;place-items:start center;padding-top:16px">'
               '<div class="toast err" style="width:680px;margin:0;box-shadow:0 8px 24px rgba(15,23,42,.14)">'
               '박지훈 님이 작성한 메모입니다. 본인 글만 수정할 수 있습니다.</div></div>')
    boards.append((
        'S10', '남의 메모 수정 시도', '오류',
        'PRD §5 메시지 — 다른 직원이 쓴 메모는 수정·삭제할 수 없다. '
        '⚠ §7 미결 — ADMIN 예외 허용 여부는 협의 중.',
        frame('MEM-01', '고객사 상세 · 수정', edit_mode(hi='1'), overlay=err_ovl, height=1580),
        [('남의 메모 [수정]', '클릭', '<b>차단</b>', '<b>{작성자} 님이 작성한 메모입니다. 본인 글만 수정할 수 있습니다.</b>'),
         ('남의 메모 [삭제]', '클릭', '<b>차단</b>', '<b>{작성자} 님이 작성한 메모입니다. 본인 글만 삭제할 수 있습니다.</b>'),
         ('본인 글 확인 실패', '자동', '<b>차단</b>', '<b>본인이 작성한 메모만 수정할 수 있습니다.</b>'),
         ('ADMIN 예외', '—', '<b>미결</b>', '⚠ §7 — 타 직원 메모 수정 권한 협의 필요')]))

    memo_del = ('<div class="ovl"><div class="mdl">'
                '<div class="mh"><div class="mt">메모 삭제</div><div class="mx">✕</div></div>'
                '<div style="font-size:13px;color:#374151;line-height:1.7">메모 2번을 삭제할까요?</div>'
                '<div class="mf"><div class="btn gho">취소</div><div class="btn dan">삭제</div></div>'
                '</div></div>')
    boards.append((
        'S11', '메모 삭제 확인창', '확인창',
        'PRD §5 메시지 — 본인이 작성한 메모를 삭제할 때 확인창을 거친다.',
        frame('MEM-01', '고객사 상세 · 수정', edit_mode(), overlay=memo_del, height=1580),
        [('확인창 문구', '표시', '—', '<b>메모 {No}번을 삭제할까요?</b>'),
         ('[삭제]', '클릭', '메모 제거', ''),
         ('[취소] · [✕]', '클릭', 'S2 복귀', '')]))

    intro = ('고객사의 <b>기본 정보 · 공통코드 귀속 · 편집 단가 · 관련 서류</b>를 입력한다. '
             '<b>모달이 아니라 별도 페이지 2개</b>다 — <code>MEM-01</code> 의 '
             '[＋ 고객사 등록] = 등록, 행을 누르면 상세·수정. 입력 항목이 길어 좌측을 '
             '<b>3탭</b>(기본 정보 / 편집 단가 / 관련 서류)으로 나눴고, 수정 화면에서는 '
             '<b>업무요청 메모가 탭과 무관하게 우측에 고정</b>된다 — 단가를 조정하면서 '
             '요청 내용을 함께 볼 수 있다. 단가는 <b>3단 구조</b>(기본 단가 → 고객사 단가 '
             '→ 교재별 할인)이며, 변경은 <b>이후 등록되는 교재부터</b> 적용되고 기존 교재는 '
             '등록 당시 단가를 유지한다 <code>PC-027</code>.')
    return page(CODE, NAME, PRD, intro, boards)
