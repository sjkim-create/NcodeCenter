# -*- coding: utf-8 -*-
"""MEM-02 고객사 등록·수정 — 모달이 아니라 별도 페이지 2개.

좌측 3탭(기본 정보 / 편집 단가 / 관련 서류) · 우측 = 계정 및 서비스 권한(등록·수정 공통) +
업무요청 메모(수정 화면). 단가는 소리펜·필기펜을 그룹 카드로 나누고 그룹별 기본값 복원을 둔다.
계정 및 서비스 권한 `PC-128` — 고객사마다 서비스 로그인 계정을 여러 개 두고, 고객사 사용 서비스
(casterN)에서 체크한 서비스만 계정에 권한을 줄 수 있다. App Key 관리(키 발급 계정)와 다른 계정이다.
"""
from shell import page, frame

CODE, NAME = 'MEM-02', '고객사 등록·수정'
PRD = 'docs/prd/MEM-02_고객사 등록·수정.md'

BASIC = (('업체명', '✔', '웅진씽크빅'), ('담당자', '', '김태호'), ('연락처', '', '031-956-7000'),
         ('사업자등록증번호', '', '215-81-06943'), ('주소', '', '경기도 파주시 회동길 20'),
         ('은행명', '', '신한은행'), ('계좌번호', '', '140-011-******'),
         ('세금계산서 발행용 이메일', '', 'tax@wjthinkbig.com'))

# lib/pricing.ts RATE_ITEMS — (항목, 단위, 기본단가, 전용여부)
# 소리펜 14항목 · 필기펜 4항목 `PC-115` `PC-084` — 양쪽 모두 'Ncode 적용'(페이지당)을 포함한다.
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
             ('발음평가 편집', '건당', '50,000', False))
# 필기펜 4항목 `PC-084` — action 변경 편집·교원구몬/KEP 는 폐지
PRICE_NWP = (('Ncode 적용', '페이지당', '500', False),
             ('기본 편집', '심볼당', '1,000', False),
             ('Custom', '심볼당', '1,500', False),
             ('노트서버 업로드', '건당', '10,000', False))

MEMOS = (('3', '요청', '고객사', '2026-08-24 16:20', '김순정', '범블비 전집 OID 북코드 33권 추가 발급 요청'),
         ('2', '처리', '내부', '2026-08-22 11:05', '김순정', 'S3/O17 Book 431~464 할당 완료 · 티켓 전달'),
         ('1', '메모', '내부', '2026-08-20 09:41', '박지훈', '2026년 편집 단가 협의 — 편집/게임 2항목 전용가 적용'))


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


def basic_card(name_err=False, empty=False, closed=False, cast_off=False):
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

    # 프로젝트 상태 — 구현은 **토글 스위치**다(칩이 아니다) `PC-093`
    knob = ('<span style="position:absolute;top:3px;left:%dpx;width:20px;height:20px;'
            'border-radius:50%%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25)"></span>'
            % (23 if closed else 3))
    sw = ('<span style="display:inline-block;position:relative;width:46px;height:26px;'
          'border-radius:13px;background:%s;flex:none">%s</span>'
          % ('#ef4444' if closed else '#d1d5db', knob))
    st = ('<div style="margin-top:12px">'
          '<div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:8px">'
          '프로젝트 상태</div>'
          '<div style="border:1px solid %s;background:%s;border-radius:10px;padding:12px 14px">'
          '<div style="display:flex;align-items:center;gap:12px">%s'
          '<div><b style="font-size:13.5px;color:%s">%s</b>'
          '<div style="font-size:11px;color:#9ca3af;margin-top:1px">사업 종료 시 코드 발급 이력만 '
          '유지되고, 목록·코드 프로젝트에서 비활성(회색)으로 표시됩니다.</div></div></div>'
          '%s</div></div>'
          % ('#fca5a5' if closed else '#e5e7eb', '#fef2f2' if closed else '#fafbfc',
             sw, '#b91c1c' if closed else '#374151', '사업 종료' if closed else '진행중',
             ('<div style="margin-top:10px">' + fld('종료 사유', False, '스마트펜 사업 정리 (2026-06)')
              + fld('코드 이관 메모', False, '엠베스트-28로 코드 이관 · 발급 이력 보존')
              + '</div>') if closed else ''))

    on_cast = not empty and not cast_off
    cast_panel = (svc_check('casterN (편집툴)',
                            '[편집 프로젝트]의 대상이 되고, 이 고객사 계정에 CasterN 사용 권한을 줄 수 있다',
                            on_cast)     # `PC-108` `PC-128`
                  + (st if on_cast else ''))     # 꺼져 있을 때 안내문은 뺐다 `PC-104`

    svc = ('<div class="fld" style="grid-column:1/-1"><span class="lbl">사용 서비스</span>'
           '<div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">'
           '%s<div style="padding:12px 14px">%s</div></div></div>'   # SDK 연동 안내문은 뺐다 `PC-104`
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
    # 레지스트리 5건 `PC-082` — 구현은 **2열 카드**(이름 + 좌표 2줄)다 `PC-093`
    items = [('Common-21', 'PDS2 · S3/O21', False, False),
             ('네오노트-0-27', 'PDS3 · S0/O27', False, False),
             ('네오노트-3-27', 'PDS3 · S3/O27', True, False),
             ('네오노트-1012', 'PDS3 · S3/O1012', False, False),
             ('스마트클래스키트-1013', 'PDS3 · S3/O1013', False, False)]
    if is_parent:
        items[0] = ('Common-21 <span class="tag">대표(자기) 코드</span>', 'PDS2 · S3/O21', False, True)
    li = ''.join('<label style="display:flex;align-items:flex-start;gap:9px;'
                 'border:1px solid %s;background:%s;border-radius:9px;padding:9px 11px;'
                 'font-size:12.5px;opacity:%s">'
                 '<input type="checkbox"%s%s style="margin-top:2px">'
                 '<span><b style="color:%s">%s</b>'
                 '<div style="font-size:11px;color:#9ca3af;margin-top:2px">%s</div></span></label>'
                 % ('#bfdbfe' if (ck and not dis) else '#eef0f4',
                    '#f3f4f6' if dis else ('#f5f9ff' if ck else '#fafbfc'),
                    '0.55' if dis else '1',
                    ' checked' if (ck and not dis) else '', ' disabled' if dis else '',
                    '#9ca3af' if dis else ('#1e3a8a' if ck else '#374151'), nm, lb)
                 for nm, lb, ck, dis in items)
    li = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">%s</div>' % li
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


def price_card(n_custom=2):   # 전용 단가 예시 = 편집 · 게임 2항목 `PC-115`
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


# ── 계정 및 서비스 권한 `PC-128` ─────────────────────────────
# (ID, 이름, CasterN 사용, 권한 수, 대장, App Key)
ACCOUNTS = (('kim@wjthinkbig.com', '김태호', True, 6, False, False),
            ('edit01@wjthinkbig.com', '편집팀', True, 3, False, False),
            ('caster@wjthinkbig.com', '', True, 6, True, True))
PERMS = (('프로젝트 생성', 'project_new'), ('심볼 편집', 'symbol_edit'),
         ('리소스 편집', 'resource_edit'), ('Ncode PDF 내보내기', 'export_ncode_pdf'),
         ('NCP2 내보내기', 'export_ncp2'), ('App용 패키지 내보내기', 'export_app_package'))


def _svc_status(cast_on):
    if cast_on:
        on = '<span class="tag" style="font-weight:700;background:#ecfdf5;color:#047857">&#10003; CasterN</span>'
        note = ''
    else:
        on = '<span class="tag" style="font-weight:700;background:#f3f4f6;color:#9ca3af">&#9675; CasterN</span>'
        note = ('<span style="color:#9ca3af">&mdash; 왼쪽 [사용 서비스]에서 casterN 을 체크하면 '
                '계정에 권한을 줄 수 있습니다</span>')
    off = '<span class="tag" style="font-weight:700;background:#f3f4f6;color:#9ca3af">&#9675; 폼솔루션</span>'
    return ('<div style="font-size:11.5px;color:#6b7280;margin-bottom:10px;display:flex;gap:6px;'
            'flex-wrap:wrap;align-items:center">사용 서비스 %s%s%s</div>' % (on, off, note))


def _add_row(id_val='', pwd='', name='', err=''):
    def box(v, ph):
        return '<div class="inp%s">%s</div>' % ('' if v else ' ph', v or ph)
    e = ('<div style="font-size:12px;margin-top:6px;color:#dc2626">%s</div>' % err) if err else ''
    return ('<div style="border:1px dashed #c7d2fe;background:#f8faff;border-radius:10px;padding:10px">'
            '<div style="display:grid;grid-template-columns:1.4fr 1.25fr 1fr auto;gap:6px;align-items:center">'
            '%s<div class="row" style="gap:4px">%s<span class="btn sm" style="white-space:nowrap">임의 생성</span></div>'
            '%s<span class="btn pri" style="padding:8px 12px;white-space:nowrap">＋ 계정 추가</span></div>%s</div>'
            % (box(id_val, 'ID (이메일) *'), box(pwd, 'PWD (비밀번호) *'), box(name, 'NAME (담당자명)'), e))


def _acc_row(acc, open_=False, cast_on=True):
    aid, nm, cast, n, seeded, key = acc
    if cast:
        if cast_on:
            tags = '<span class="tag" style="font-weight:700;background:#ecfdf5;color:#047857">CasterN %d/6</span>' % n
        else:
            tags = ('<span class="tag" style="font-weight:700;background:#fef2f2;color:#b91c1c" '
                    'title="고객사 사용 서비스에서 빠진 서비스">CasterN %d/6</span>' % n)
    else:
        tags = '<span class="tag" style="background:#f3f4f6;color:#9ca3af">권한 없음</span>'
    if key:
        tags += ' <span class="tag" style="background:#f5f3ff;color:#6d28d9">App Key</span>'
    head = ('<div class="row" style="padding:9px 12px;gap:8px">'
            '<span style="color:#9ca3af;font-size:11px">%s</span>'
            '<code style="color:#2563eb;font-weight:600;font-size:12.5px">%s</code>'
            '%s%s<span style="flex:1"></span>%s</div>'
            % ('&#9662;' if open_ else '&#9656;', aid,
               (' <span style="font-size:12px;color:#374151">%s</span>' % nm) if nm else '',
               ' <span class="tag" style="background:#f0fdfa;color:#0f766e">대장</span>' if seeded else '',
               tags))
    body = ''
    if open_:
        perm = ''
        for i, (lb, k) in enumerate(PERMS):
            on = i < n
            perm += ('<label style="display:flex;align-items:center;gap:7px;border:1px solid %s;background:%s;'
                     'border-radius:9px;padding:7px 9px;font-size:12px">'
                     '<input type="checkbox"%s><span style="color:%s;font-weight:%s">%s '
                     '<span style="font-family:ui-monospace,monospace;font-size:10.5px;color:#9ca3af;'
                     'font-weight:400">(%s)</span></span></label>'
                     % ('#c7ddff' if on else '#eef0f4', '#f7faff' if on else '#fff',
                        ' checked' if on else '', '#1d4ed8' if on else '#374151',
                        '700' if on else '400', lb, k))
        if cast_on:
            cast_box = ('<label style="display:flex;align-items:center;gap:7px;font-size:12.5px">'
                        '<input type="checkbox" checked><b style="color:#1d4ed8">CasterN 사용</b></label>'
                        '<div class="row" style="margin:8px 0 6px"><span style="font-size:11.5px;color:#6b7280">'
                        '선택 %d / 6</span><span style="flex:1"></span><span class="btn sm">%s</span></div>'
                        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">%s</div>'
                        % (n, '모두 해제' if n == 6 else '모두 선택', perm))
        else:
            cast_box = ('<label style="display:flex;align-items:center;gap:7px;font-size:12.5px;opacity:.6">'
                        '<input type="checkbox" disabled><b style="color:#374151">CasterN 사용</b>'
                        '<span style="font-size:11px;color:#9ca3af">· 고객사 사용 서비스에서 먼저 체크하세요</span>'
                        '</label>')
        form = ('<label style="display:flex;align-items:center;gap:7px;font-size:12.5px;opacity:.6">'
                '<input type="checkbox" disabled><b style="color:#374151">폼솔루션 사용</b>'
                '<span class="tag" style="background:#fff7ed;color:#c2410c;font-size:10px">준비중</span>'
                '<span style="font-size:11px;color:#9ca3af">· 고객사 사용 서비스에서 먼저 체크하세요</span></label>')
        body = ('<div style="border-top:1px solid #eef0f4;padding:10px 12px;display:grid;gap:10px">'
                '<div style="display:grid;grid-template-columns:1fr 1fr auto;gap:6px;align-items:center">'
                '<div class="inp">%s</div><div class="inp ph">%s</div>'
                '<span class="lnk" style="color:#dc2626">삭제</span></div>'
                '<div style="border:1px solid #eef0f4;border-radius:9px;padding:9px 11px;background:%s">%s</div>'
                '<div style="border:1px solid #eef0f4;border-radius:9px;padding:9px 11px;background:#fafafa">%s</div>'
                '</div>'
                % (nm or '<span style="color:#9ca3af">NAME (담당자명)</span>',
                   '대장 참조' if seeded else '••••••••',
                   '#fff' if cast_on else '#fafafa', cast_box, form))
    return ('<div style="border:1px solid %s;border-radius:10px;background:#fff">%s%s</div>'
            % ('#bfdbfe' if open_ else '#eef0f4', head, body))


def account_card(accounts=ACCOUNTS, open_id=None, cast_on=True, draft=False, add=None, msg=''):
    """우측 [계정 및 서비스 권한] — 등록·수정 공통 `PC-128`"""
    add = add or {}
    rows = ''.join(_acc_row(a, a[0] == open_id, cast_on) for a in accounts)
    if not accounts:
        rows = ('<div style="font-size:12px;color:#9ca3af;padding:14px 0;text-align:center">'
                '등록된 계정이 없습니다.</div>')
    ok = ('<div style="font-size:12px;margin-top:6px;color:#047857">%s</div>' % msg) if msg else ''
    return ('<div class="card"><div class="bd">'
            '<div class="row" style="margin-bottom:10px"><b style="font-size:13px">계정 및 서비스 권한</b>'
            '<span class="tag b" style="font-weight:700">%d개</span>'
            '<span style="font-size:11px;color:#9ca3af">· 서비스 로그인 계정 · 개수 제한 없음 · %s</span></div>'
            '%s%s%s<div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">%s</div>'
            '</div></div>'
            % (len(accounts), '[등록] 시 함께 저장' if draft else '바로 저장',
               _svc_status(cast_on), _add_row(**add), ok, rows))


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


def panel(tab, name_err=False, empty=False, closed=False, is_parent=False, n_custom=2, cast_off=False):
    """좌측 입력 — 항목이 길어 탭으로 나눈다. 조건이 아래로 쌓이지 않는다."""
    if tab == 'base' and cast_off:
        return basic_card(cast_off=True) + '<div style="height:14px"></div>' + form_panel()
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


# 좌(입력 탭) / 우(계정 및 서비스 권한 + 업무요청 메모) 2단 — 등록 화면도 우측에서 계정을 함께 추가한다 `PC-128`
GRID = ('<div style="display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:14px;'
        'align-items:start"><div>%s</div><div style="display:grid;gap:14px">%s</div></div>')


def reg_mode(tab='base', name_err=False, n_custom=0, acc=None):
    if acc is None:
        acc = account_card(accounts=(), draft=True, cast_on=False)
    left = wrap(tab, panel(tab, name_err=name_err, empty=not name_err, n_custom=n_custom), n_custom, 0)
    return (GRID % (left, acc)) + footer('등록')


def edit_mode(tab='base', is_parent=False, closed=False, n_custom=2, draft='', hi=None,
              acc=None, cast_off=False):
    if acc is None:
        acc = account_card()
    left = wrap(tab, panel(tab, closed=closed, is_parent=is_parent, n_custom=n_custom,
                           cast_off=cast_off), n_custom, 3)
    return (GRID % (left, acc + memo_card(draft, hi))) + footer(edit=True)


def build():
    boards = []

    boards.append((
        'S1', '등록 — 기본 정보 탭', '기본',
        '<code>MEM-01</code>의 <b>[＋ 고객사 등록]</b>으로 진입. 좌측 입력 탭 + 우측 '
        '<b>계정 및 서비스 권한</b> 2단이며 <b>업무 원장(MEM-03)은 없다</b>. 필수는 <b>업체명</b> 하나뿐. '
        '<code>PC-128</code>',
        frame('MEM-01', '고객사 등록', reg_mode(), height=1580),
        [('업체명', '입력 (필수)', '—', '코드·프로젝트가 이 이름으로 연결된다'),
         ('사업자등록증번호', '입력', '—', '형식 예: <code>000-00-00000</code>'),
         ('주소', '입력', '—', '고객사 관리 전용 — App Key 관리(티켓 고객사)로 넘어가지 않는다 <code>PC-123</code>'),
         ('은행명 / 계좌번호', '입력', '—', '정산 지급용'),
         ('공통코드 체크', '체크', '하위 고객사로 등록', '<b>코드 할당이 발생하지 않는다</b> <code>P-12</code>'),
         ('편집 단가', '입력', '전용 단가 지정', '기본값에서 <b>바꾼 항목만</b> 전용 단가 <code>P-16</code>'),
         ('[＋ 계정 추가]', '클릭', '임시 계정 추가 (S13)', '<b>[등록] 할 때 함께 저장</b>된다'),
         ('[등록]', '클릭', '<b>상세·수정(S2)</b> 이동', '계정을 이어서 추가할 수 있다 · <code>LOG-01</code> 기록 <code>PC-128</code>'),
         ('[취소]', '클릭', '<code>MEM-01</code> 복귀', '변경 없음')]))

    boards.append((
        'S2', '상세·수정 — 기본 정보 탭 · 업무요청 메모', '기본',
        '<code>MEM-01</code>의 <b>행 클릭</b>으로 진입. 수정 모드는 '
        '<b>좌(입력 탭) / 우(계정 및 서비스 권한 + 업무 원장 MEM-03) 2단</b>이다. <code>PC-128</code>',
        frame('MEM-01', '고객사 상세 · 수정', edit_mode(), height=1680),
        [('기본 정보', '수정', '—', '등록 모드와 동일 항목'),
         ('계정 행', '클릭', '펼침 (S12)', '서비스 권한 지정'),
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
        frame('MEM-01', '고객사 상세 · 수정', edit_mode(n_custom=2), height=1580),
        [('전용 n항목 배지', '표시', '—', '기본값과 다른 항목 수 — 여기서는 편집·게임 2항목'),
         ('항목별 단가 입력', '입력', '전용 단가로 전환', '항목마다 단위(페이지·심볼·건) 표시'),
         ('[전체 기본값]', '클릭', '전 항목 기본 단가로 복귀', '전용 배지 사라짐'),
         ('저장 후 새 교재 등록', '<code>PRJ-04</code>', '<b>새 단가</b>로 계산', ''),
         ('이미 등록된 교재', '—', '<b>등록 당시 단가 유지</b>', '청구액이 바뀌지 않는다 <code>PC-027</code>'),
         ('기존 교재에 새 단가 적용', '<code>PRJ-04</code>', '[현재 단가로 갱신]', '교재 수정에서 <b>개별</b> 적용'),
         ('필기펜 항목', '—', '<b>4항목</b>',
          'Ncode 적용 · <b>기본 편집</b>(구 none 편집비용) · <b>Custom 1,500</b> · 노트서버 업로드 '
          '<code>PC-084</code> — action 변경 편집 · 교원구몬/KEP 는 폐지')]))

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

    # ── 계정 및 서비스 권한 `PC-128` ──
    boards.append((
        'S12', '계정 펼침 — CasterN 권한 지정', '분기',
        '계정 행을 누르면 펼쳐진다. 고객사 <b>사용 서비스에 casterN 이 체크</b>돼 있으면 계정에 '
        '<b>CasterN 사용</b>과 <b>권한 6종</b>을 줄 수 있다 — casterN 체크 = 편집 프로젝트 대상 + '
        '계정 권한 지정 가능. 변경은 <b>바로 저장</b>된다(고객사 [저장]과 별개). <code>PC-128</code>',
        frame('MEM-01', '고객사 상세 · 수정',
              edit_mode(acc=account_card(open_id='edit01@wjthinkbig.com')), height=1900),
        [('계정 행', '클릭', '펼침 / 접힘', '머리에 <b>CasterN n/6</b> · <b>대장</b> · <b>App Key</b> 표시'),
         ('NAME · PWD', '입력 후 포커스 이동', '바로 저장', '대장 계정은 비밀번호 <b>대장 참조</b>'),
         ('CasterN 사용', '체크', '권한 6종 노출', '새로 켜면 6종 모두 선택'),
         ('권한 체크', '클릭', '개별 지정', '라벨 (키) 표기 — 예: 프로젝트 생성 (project_new)'),
         ('[모두 선택] / [모두 해제]', '클릭', '6종 일괄', ''),
         ('폼솔루션 사용', '—', '<b>비활성</b>', '준비중 · 고객사 사용 서비스에서 먼저 체크하세요'),
         ('[삭제]', '클릭', 'S16 확인창', '')]))

    boards.append((
        'S13', '등록 중 계정 추가', '분기',
        '고객사를 등록하면서 계정을 미리 넣어 둘 수 있다. 추가한 계정은 <b>임시</b>로 보이고 '
        '<b>[등록] 할 때 함께 저장</b>된다. 등록 뒤에는 상세·수정(S2)으로 이동해 계정을 이어서 추가한다. '
        '<code>PC-128</code>',
        frame('MEM-01', '고객사 등록',
              reg_mode(acc=account_card(accounts=(('kim@wjthinkbig.com', '김태호', False, 0, False, False),),
                                        draft=True, cast_on=False,
                                        msg='계정 추가됨 · kim@wjthinkbig.com')), height=1580),
        [('ID (이메일)', '입력 (필수)', '—', '이메일 형식 · <b>전체에서 유일</b>'),
         ('PWD (비밀번호)', '입력 (필수)', '—', '요청이 없으면 <b>[임의 생성]</b>'),
         ('NAME (담당자명)', '입력', '—', ''),
         ('[＋ 계정 추가]', '클릭', '임시 목록에 추가', '<b>계정 추가됨 · {ID}</b>'),
         ('사용 서비스 미체크', '—', '<b>권한 없음</b>', 'casterN 을 체크하면 계정에 권한을 줄 수 있다'),
         ('[등록]', '클릭', '고객사 + 계정 저장', '상세·수정(S2)으로 이동')]))

    boards.append((
        'S14', 'casterN 미체크 — 권한 비활성', '분기',
        '고객사 사용 서비스에서 <b>casterN 을 끄면</b> 계정의 CasterN 사용을 켤 수 없다. '
        '이미 권한이 있던 계정은 머리 표시가 <b>빨간색</b>으로 바뀌어 권한이 적용되지 않음을 알린다. '
        '<code>PC-128</code>',
        frame('MEM-01', '고객사 상세 · 수정',
              edit_mode(cast_off=True, acc=account_card(open_id='kim@wjthinkbig.com', cast_on=False)),
              height=1700),
        [('사용 서비스 casterN', '체크 해제', '계정 권한 비활성', '프로젝트 상태 · 공통코드 사용 고객사도 숨김'),
         ('CasterN n/6 (빨강)', '표시', '—', '고객사 사용 서비스에서 빠진 서비스 — 권한이 적용되지 않는다'),
         ('CasterN 사용', '—', '<b>비활성</b>', '고객사 사용 서비스에서 먼저 체크하세요'),
         ('casterN 다시 체크', '체크', 'S12', '권한이 그대로 다시 적용된다')]))

    boards.append((
        'S15', '계정 추가 오류', '오류',
        '계정 ID 는 <b>이메일 형식</b>이어야 하고 <b>전체에서 유일</b>하다(App Key 관리의 키 발급 계정 포함). '
        '비밀번호가 비어 있으면 추가되지 않는다.',
        frame('MEM-01', '고객사 상세 · 수정',
              edit_mode(acc=account_card(add={'id_val': 'kim@wjthinkbig.com', 'pwd': 'x8Kd02pQ',
                                              'err': '이미 등록된 ID(email)입니다.'})), height=1700),
        [('ID 중복', '[＋ 계정 추가]', '<b>차단</b>', '<b>이미 등록된 ID(email)입니다.</b>'),
         ('ID 형식 오류', '[＋ 계정 추가]', '<b>차단</b>', '<b>ID 는 이메일 형식이어야 합니다.</b>'),
         ('PWD 미입력', '[＋ 계정 추가]', '<b>차단</b>', '<b>비밀번호가 필요합니다. (요청 없으면 [임의 생성])</b>')]))

    acc_del = ('<div class="ovl"><div class="mdl">'
               '<div class="mh"><div class="mt">계정 삭제</div><div class="mx">✕</div></div>'
               '<div style="font-size:13px;color:#374151;line-height:1.7">'
               '계정 edit01@wjthinkbig.com 을(를) 삭제할까요?</div>'
               '<div class="mf"><div class="btn gho">취소</div><div class="btn dan">삭제</div></div>'
               '</div></div>')
    boards.append((
        'S16', '계정 삭제 확인창', '확인창',
        '계정 [삭제] 는 확인창을 거친다. 그 계정에 연결된 App Key 도 함께 지워진다.',
        frame('MEM-01', '고객사 상세 · 수정',
              edit_mode(acc=account_card(open_id='edit01@wjthinkbig.com')), overlay=acc_del, height=1900),
        [('확인창 문구', '표시', '—', '<b>계정 {ID} 을(를) 삭제할까요?</b>'),
         ('[삭제]', '클릭', '계정 제거', '연결된 App Key 도 제거 · <code>LOG-01</code> 기록'),
         ('[취소] · [✕]', '클릭', 'S12 복귀', '')]))

    boards.append((
        'S17', '가입 승인 후 계정 추가', '분기',
        '<code>MEM-01</code> 가입 승인 카드의 <b>[계정 추가 →]</b>로 들어오면 SSO 이메일이 '
        '<b>ID (이메일)</b> 칸에 미리 들어가 있다. [＋ 계정 추가]만 누르면 된다. <code>PC-133</code>',
        frame('MEM-01', '고객사 상세 · 수정',
              edit_mode(acc=account_card(accounts=(), add={'id_val': 'teacher@newschool.kr'})), height=1600),
        [('ID (이메일)', '자동', 'SSO 이메일 미리 입력', '<code>?email=</code> 로 전달'),
         ('PWD (비밀번호)', '입력 / [임의 생성]', '—', ''),
         ('[＋ 계정 추가]', '클릭', '서비스 계정 저장', '사용 서비스에 따라 권한 기본값 적용')]))

    intro = ('고객사의 <b>기본 정보 · 공통코드 귀속 · 편집 단가 · 관련 서류</b>를 입력하고, 우측에서 '
             '<b>계정 및 서비스 권한</b>(서비스 로그인 계정 · CasterN 권한)을 관리한다 <code>PC-128</code>. '
             '<b>모달이 아니라 별도 페이지 2개</b>다 — <code>MEM-01</code> 의 '
             '[＋ 고객사 등록] = 등록, 행을 누르면 상세·수정. 입력 항목이 길어 좌측을 '
             '<b>3탭</b>(기본 정보 / 편집 단가 / 관련 서류)으로 나눴고, 우측에는 탭과 무관하게 '
             '<b>계정 및 서비스 권한</b>과 (수정 화면) <b>업무요청 메모</b>가 고정된다. 계정 권한은 '
             '고객사 <b>사용 서비스</b>에서 체크한 서비스만 줄 수 있다. App Key 관리의 키 발급 계정과는 '
             '다른 계정이다. 단가는 <b>3단 구조</b>(기본 단가 → 고객사 단가 '
             '→ 교재별 할인)이며, 변경은 <b>이후 등록되는 교재부터</b> 적용되고 기존 교재는 '
             '등록 당시 단가를 유지한다 <code>PC-027</code>.')
    return page(CODE, NAME, PRD, intro, boards)
