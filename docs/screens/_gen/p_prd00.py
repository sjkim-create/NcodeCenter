# -*- coding: utf-8 -*-
"""PRD-00 공통 — 로그인 · 앱 셸 · 개인정보 수정 · 공통 패턴"""
from shell import page, frame, bare, sidebar, topbar

CODE, NAME = 'PRD-00', '공통 (로그인 · 셸 · 공통 패턴)'
PRD = 'docs/prd/PRD-00_공통.md'

GOOGLE_G = ('<svg width="18" height="18" viewBox="0 0 48 48">'
            '<path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12'
            'c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>'
            '<path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>'
            '<path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.3 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>'
            '<path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C40.9 36 44 30.6 44 24c0-1.3-.1-2.3-.4-3.5z"/></svg>')


def login_card(banner='', pw_val='', email_val='', msg='', mode='local', hot=None):
    b = ''
    if banner == 'domain':
        b = ('<div class="toast err" style="margin-bottom:14px">회사 계정(@neolab.net)만 로그인할 수 있습니다.</div>')
    elif banner == 'google':
        b = ('<div class="toast err" style="margin-bottom:14px">Google 로그인 중 오류가 발생했습니다. 다시 시도하세요.</div>')
    if mode == 'sso':
        form = ('<div class="btn pri%s" style="width:100%%;justify-content:center;padding:12px 16px;gap:10px">%s'
                '회사 Google 계정으로 로그인</div>'
                '<div style="font-size:11.5px;color:#9ca3af;margin-top:10px">@neolab.net 회사 Google 계정만 허용되며, '
                '최초 로그인 시 자동으로 등록됩니다(승인 불필요).</div>'
                % (' hot' if hot == 'sso' else '', GOOGLE_G))
    else:
        ev = email_val or '<span style="color:#9ca3af">name@neolab.net</span>'
        pv = pw_val or '<span style="color:#9ca3af">비밀번호 (초기값 = 이메일)</span>'
        form = ('<div class="fld"><span class="lbl">이메일</span><div class="inp">%s</div></div>'
                '<div class="fld" style="margin-top:10px"><span class="lbl">비밀번호</span><div class="inp">%s</div></div>'
                '<label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#6b7280;margin-top:10px">'
                '<input type="checkbox" checked> 로그인 계정 기억</label>'
                '<div class="btn pri%s" style="width:100%%;justify-content:center;margin-top:10px">로그인</div>%s'
                '<div style="font-size:11.5px;color:#9ca3af;margin-top:10px">등록 계정의 초기 비밀번호는 '
                '<b>이메일과 동일</b>합니다 (개인정보수정에서 변경). 신규 계정은 <b>회사 Google 계정</b> 인증으로 등록됩니다.</div>'
                % (ev, pv, ' hot' if hot == 'login' else '', msg))
    return ('<div style="max-width:460px;margin:40px auto;padding:0 20px">'
            '<div class="card" style="padding:24px">'
            '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">'
            '<div class="bmark" style="width:30px;height:30px;flex:0 0 30px;font-size:15px">N</div>'
            '<div style="font-weight:700;font-size:18px">Ncode<span style="color:#5f8ff0">Center</span> 로그인</div></div>'
            '<p style="color:#6b7280;font-size:12.5px;margin:0 0 16px">회사에 <b>등록된 계정</b>으로 로그인하세요. '
            '(내부 직원 전용 · <b>@neolab.net</b>)</p>%s%s</div></div>' % (b, form))


DUMMY = ('<div class="g4" style="margin-bottom:14px">'
         + ''.join('<div class="kpi"><div class="k">%s</div><div class="v">%s</div></div>' % (k, v)
                   for k, v in (('할당 코드 레코드', '277'), ('업체(ACCOUNT)', '126'),
                                ('할당 Book 합계', '8,858'), ('코드 섹션', '8')))
         + '</div><div class="card" style="height:300px"><div class="hd">Section별 소유 현황</div></div>')


def build():
    boards = []

    boards.append((
        'S1', '로그인 · 기본', '진입',
        '미로그인 상태로 화면 경로에 접근하면 이 화면으로 이동한다. PRD §4.1 · §2. '
        'SSO 미설정 환경의 <b>개발용 로컬 로그인</b> 형태이며, SSO 설정 시 S2로 대체된다.',
        bare(login_card(), 760),
        [('이메일 입력', '입력 · Enter', '제출', '회사 도메인 계정 <b>name@neolab.net</b> 형식'),
         ('비밀번호 입력', '입력 · Enter', '제출', '초기값 = 이메일. Enter로 제출'),
         ('로그인 계정 기억', '체크 토글', '—', '체크 시 다음 진입에 이메일 자동 채움'),
         ('[로그인]', '클릭', '<code>DSH-01</code>', '성공 시 <b>{이름}({역할})으로 로그인</b> 인라인 표시 후 이동'),
         ('(비로그인 경로 접근)', '자동', '로그인 화면', '로그인 후 요청 화면으로 이동')]))

    boards.append((
        'S2', '로그인 · 회사 Google 계정(SSO)', '분기',
        'SSO 자격증명이 설정된 환경. PRD §4.1 — 회사 Google Workspace 계정으로만 로그인한다.',
        bare(login_card(mode='sso', hot='sso'), 760),
        [('[회사 Google 계정으로 로그인]', '클릭', 'Google 인증 → <code>DSH-01</code>',
          '@neolab.net 계정만 허용. 명단에 없어도 <b>STAFF로 자동 등록</b>(승인 불필요)'),
         ('(인증 취소)', '자동', 'S1 유지', '세션당 1회만 자동 로그인 시도 — 취소 루프 방지')]))

    boards.append((
        'S3', '로그인 · 회사 도메인 아님', '오류',
        'PRD §5.1 — 회사 도메인이 아닌 계정으로 인증한 경우. 인라인 배너로 노출한다.',
        bare(login_card(banner='domain', mode='sso'), 760),
        [('오류 배너', '표시', '—', '<b>회사 계정(@neolab.net)만 로그인할 수 있습니다.</b>'),
         ('[회사 Google 계정으로 로그인]', '클릭', '재시도', '다른 계정 선택 가능')]))

    boards.append((
        'S4', '로그인 · Google 로그인 실패', '오류',
        'PRD §5.1 — 인증 과정에서 오류가 발생한 경우.',
        bare(login_card(banner='google', mode='sso'), 760),
        [('오류 배너', '표시', '—', '<b>Google 로그인 중 오류가 발생했습니다. 다시 시도하세요.</b>'),
         ('[회사 Google 계정으로 로그인]', '클릭', '재시도', '')]))

    boards.append((
        'S5', '로그인 · 로컬 로그인 성공', '성공',
        'PRD §5.1 — 로컬 로그인 성공 시 인라인 메시지를 표시하고 곧바로 <code>DSH-01</code>로 이동한다.',
        bare(login_card(email_val='soonjung@neolab.net', pw_val='••••••••••••••••••••',
                        msg='<div class="inline-ok" style="font-size:12.5px;margin-top:10px">김순정(ADMIN)으로 로그인</div>'), 760),
        [('인라인 메시지', '표시', '<code>DSH-01</code>', '<b>{이름}({역할})으로 로그인</b>'),
         ('활동 로그', '자동 기록', '<code>LOG-01</code>', 'PRD §4.5 — 로그인 · 로그아웃은 자동 기록')]))

    boards.append((
        'S6', '앱 셸 · 기본 (ADMIN)', '기본',
        'PRD §4.3 — 좌측 메뉴 · 상단바. ADMIN은 <b>활동 로그(LOG-01)</b> 메뉴가 보인다. '
        'CasterN 서비스 관리는 기본 <b>펼침(▾)</b>. 본문은 예시로 <code>DSH-01</code>을 실었다.',
        frame('DSH-01', '대시보드', DUMMY, admin=True),
        [('좌측 메뉴 항목', '클릭', '각 화면코드', 'PRD §4.4 표 — 대시보드/SOBP 맵/코드 프로젝트/N Key 발급·계정 발급·발급 목록/편집 프로젝트/PUI/고객사/활동 로그/Ncode 정보'),
         ('[CasterN 서비스 관리]', '클릭', '하위 접기 ⇄ 펼치기', '<b>화면 이동 없음</b>. 표식 ▾(펼침) / ▸(접힘)'),
         ('«(메뉴 접기)', '클릭', 'S9 레일 상태', '접은 상태에서도 각 메뉴로 이동 가능'),
         ('🔔 알림', '클릭', '(미정)', '§7 미결'),
         ('계정 영역', '클릭', 'S7 계정 메뉴', '')]))

    boards.append((
        'S7', '앱 셸 · 계정 메뉴 열림', '분기',
        'PRD §4.2 · §6 — 상단 계정을 누르면 개인정보수정 / 로그아웃 메뉴가 열린다.',
        frame('DSH-01', '대시보드', DUMMY, menu_open=True, hover='profile'),
        [('[개인정보수정]', '클릭', 'S8 모달', '현재 화면 위에 모달로 열린다'),
         ('[로그아웃]', '클릭', 'S11 전환 → 로그인 화면', '활동 로그에 <b>로그아웃</b> 자동 기록'),
         ('바깥 영역', '클릭', 'S6 복귀', '메뉴 닫힘')]))

    profile_modal = (
        '<div class="ovl"><div class="mdl">'
        '<div class="mh"><div class="mt">개인정보 수정</div><div class="mx">✕</div></div>'
        '<div style="display:grid;gap:12px">'
        '<div class="fld"><span class="lbl">이름</span><div class="inp">김순정</div></div>'
        '<div class="fld"><span class="lbl">이메일</span><div class="inp ro">soonjung@neolab.net</div></div>'
        '<div class="fld"><span class="lbl">새 비밀번호</span>'
        '<div class="inp ph">변경 시에만 입력</div></div>'
        '</div><div class="mf"><div class="btn gho">취소</div><div class="btn pri">저장</div></div>'
        '</div></div>')
    boards.append((
        'S8', '개인정보 수정 모달', '모달',
        'PRD §4.2 — 이메일은 <b>읽기 전용</b>. 새 비밀번호는 <b>변경할 때만</b> 입력하며 비워두면 기존 비밀번호가 유지된다.',
        frame('DSH-01', '대시보드', DUMMY, overlay=profile_modal),
        [('이름', '입력 (필수)', '—', '표시 이름'),
         ('이메일', '읽기 전용', '—', '변경 불가'),
         ('새 비밀번호', '입력 (선택)', '—', '비워두면 기존 비밀번호 유지'),
         ('[저장]', '클릭', '모달 닫힘 · <b>직전 화면 유지</b>', '화면 이동 없음 (PRD §4.2 · §6)'),
         ('[취소] · [✕] · 바깥 클릭', '클릭', '모달 닫힘', '변경 폐기')]))

    boards.append((
        'S9', '앱 셸 · 사이드바 접힘(레일)', '변형',
        'PRD §4.3 — 사이드바 전체 접기. 접은 상태에서도 각 메뉴로 이동할 수 있다.',
        frame('DSH-01', '대시보드', DUMMY, rail=True),
        [('»(메뉴 펼치기)', '클릭', 'S6 복귀', ''),
         ('레일 아이콘', '클릭', '각 화면코드', '접힌 상태에서도 이동 가능')]))

    boards.append((
        'S10', '앱 셸 · STAFF 로그인', '권한',
        'PRD §3.1 — STAFF는 <b>활동 로그(LOG-01)</b>가 메뉴에 노출되지 않는다. '
        'CasterN 하위를 접은 상태(▸)도 함께 보인다.',
        frame('DSH-01', '대시보드', DUMMY, admin=False, user='박지훈', role='STAFF',
              collapsed_castern=True),
        [('활동 로그', '—', '메뉴 없음', 'ADMIN만 노출 (PRD §3.1)'),
         ('[CasterN 서비스 관리]', '클릭', '하위 펼침', '접힘 표식 ▸ → 펼치면 ▾'),
         ('그 외 메뉴', '클릭', '각 화면코드', 'LOG-01 제외 전 화면 접근 가능')]))

    boards.append((
        'S11', '로그아웃 전환 화면', '전환',
        'PRD §2 — 로그아웃 진행 중에는 화면 셸 대신 전환 화면을 보여준다(<b>비로그인 잔상 방지</b>).',
        bare('<div style="height:100%;display:grid;place-items:center">'
             '<div style="text-align:center;color:#9ca3af">'
             '<div class="bmark" style="margin:0 auto 14px;width:44px;height:44px;font-size:22px">N</div>'
             '<div style="font-size:13px">로그아웃하는 중…</div></div></div>', 760),
        [('(자동)', '완료', '로그인 화면', '활동 로그에 <b>로그아웃</b> 기록')]))

    save_fail = (
        '<div class="ovl" style="background:none;place-items:start center;padding-top:16px">'
        '<div class="toast warn" style="width:640px;margin:0;box-shadow:0 8px 24px rgba(15,23,42,.14)">'
        '⚠ 브라우저 저장 공간이 가득 차 저장하지 못했습니다. 다른 사이트 데이터를 정리한 뒤 다시 저장하세요.</div></div>')
    boards.append((
        'S12', '공통 저장 실패 · 상단 알림', '오류',
        'PRD §5.2 — 브라우저 저장 공간 부족. 전 화면 공통으로 상단 알림(토스트)으로 노출한다.',
        frame('MEM-01', '고객사 관리',
              '<div class="card" style="height:420px"><div class="hd">고객사 목록</div></div>',
              overlay=save_fail),
        [('상단 알림', '표시', '—', '<b>⚠ 브라우저 저장 공간이 가득 차 저장하지 못했습니다. 다른 사이트 데이터를 정리한 뒤 다시 저장하세요.</b>'),
         ('(저장 재시도)', '클릭', '재시도', '정리 후 동일 동작 재실행')]))

    del_confirm = (
        '<div class="ovl"><div class="mdl">'
        '<div class="mh"><div class="mt">삭제 확인</div><div class="mx">✕</div></div>'
        '<div style="font-size:13px;color:#374151;line-height:1.7">이 작업은 되돌릴 수 없습니다.<br>'
        '삭제하려면 아래에 <b>웅진씽크빅</b> 을(를) 그대로 입력하세요.</div>'
        '<div class="fld" style="margin-top:12px"><div class="inp ph">웅진씽크빅</div></div>'
        '<div class="mf"><div class="btn gho">취소</div><div class="btn dis">삭제 확정</div></div>'
        '</div></div>')
    boards.append((
        'S13', '삭제 확인창 · 이름 입력 (공통 패턴)', '확인창',
        'PRD §5.3 — <b>고객사·프로젝트 삭제</b>는 대상 이름을 직접 입력해야 [삭제 확정]이 활성화된다. '
        '<code>MEM-01</code>·<code>PRJ-01</code>이 이 패턴을 공유한다.',
        frame('MEM-01', '고객사 관리',
              '<div class="card" style="height:420px"><div class="hd">고객사 목록</div></div>',
              overlay=del_confirm),
        [('이름 입력', '입력', '[삭제 확정] 활성', '대상 이름과 <b>정확히 일치</b>해야 활성'),
         ('[삭제 확정]', '클릭 (활성 시)', '삭제 · 목록 복귀', '기본 상태는 <b>비활성</b>'),
         ('[취소] · [✕]', '클릭', '확인창 닫힘', '삭제하지 않음')]))

    pattern = (
        '<div class="card"><div class="bd">'
        '<div class="row" style="margin-bottom:12px">'
        '<div class="srch">🔍 <span style="color:#111827">웅진</span><span class="x">✕</span></div>'
        '<div class="sp" style="flex:1"></div>'
        '<div class="btn sm">초기화</div></div>'
        '<div class="row" style="gap:6px;margin-bottom:14px;flex-wrap:wrap">'
        '<span class="chip">전체</span><span class="chip on">Section 3</span>'
        '<span class="chip">Section 0</span><span class="chip">Section 5</span>'
        '<span class="chip">Section 10</span></div>'
        '<div style="display:grid;grid-template-columns:380px 1fr;gap:14px">'
        '<div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">'
        '<table><tr><th>고객사</th><th style="width:70px">Owner</th></tr>'
        '<tr class="sel"><td>웅진씽크빅</td><td>17</td></tr>'
        '<tr><td>웅진씽크빅 (레거시)</td><td>—</td></tr></table>'
        '<div class="pgn"><b class="off">«</b><b class="off">‹</b><b class="on">1</b>'
        '<b>2</b><b>3</b><b>›</b><b>»</b></div></div>'
        '<div style="border:1px solid #e5e7eb;border-radius:10px;padding:16px">'
        '<div style="font-weight:700;font-size:14px;margin-bottom:10px">웅진씽크빅</div>'
        '<div style="font-size:12.5px;color:#6b7280">좌측에서 선택한 항목의 상세가 여기에 표시된다.</div>'
        '</div></div></div></div>')
    boards.append((
        'S14', '공통 목록 · 필터 · 검색 패턴', '패턴',
        'PRD §4.4 — 전 화면이 공유하는 패턴. 각 화면 PRD는 <b>그 화면에만 있는 필터</b>만 기술한다. '
        '이 보드는 화면이 아니라 <b>컴포넌트 규격</b>이다.',
        frame('MEM-01', '고객사 관리', pattern),
        [('검색 입력', '입력', '즉시 필터링', '입력값이 있으면 <b>✕</b>(지우기) 노출'),
         ('✕ (지우기)', '클릭', '전체 목록 복귀', '검색어 비움'),
         ('칩 필터', '클릭', '단일 선택', '<b>토글 아님</b>. 전체로 되돌리려면 [전체] 칩 선택'),
         ('좌측 목록 항목', '클릭', '우측 상세 표시', '미선택 시 우측에 안내 문구'),
         ('«  ‹  ›  »', '클릭', '페이지 이동', '첫/마지막 페이지에서 해당 버튼 <b>비활성</b>'),
         ('필터·검색 변경', '자동', '1페이지로 복귀', ''),
         ('[초기화]', '클릭', '시드 상태로 복귀', '실행 전 <b>확인창</b>')]))

    intro = ('모든 화면이 공유하는 <b>로그인 · 권한 · 셸 · 공통 패턴 · 메시지 규칙</b>. '
             '각 화면 정의서는 여기서 정의한 규칙을 반복하지 않고 참조한다. '
             '역할은 <b>ADMIN / STAFF</b> 2종이며 <code>LOG-01</code>만 ADMIN 전용 메뉴다. '
             '프레임 1장 = 1440×900 · Figma 프레임 1개.')
    return page(CODE, NAME, PRD, intro, boards)
