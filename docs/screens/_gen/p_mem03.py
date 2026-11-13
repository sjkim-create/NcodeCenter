# -*- coding: utf-8 -*-
"""MEM-03 직원 계정 — web/components/UsersView.tsx 실제 구현 기준 `PC-297`"""
from shell import page, frame
import kws

CODE, NAME = 'MEM-03', '직원 계정'
PRD = 'docs/prd/MEM-03_직원 계정.md'
MONO = 'font-family:ui-monospace,monospace'

# (이름, 이메일, 부서, 역할, 사용 중, 나)
STAFF = (('김순정', 'sj.kim@neolab.net', '서비스기획팀', 'ADMIN', True, True),
         ('박지훈', 'jihoon@neolab.net', '국내사업팀', 'STAFF', True, False),
         ('이수아', 'sua.lee@neolab.net', '- 미지정 -', 'STAFF', True, False),
         ('최승혁', 'sh.choi@neolab.net', '해외사업팀', 'STAFF', False, False))


def info():
    return ('<span style="display:inline-grid;place-items:center;width:18px;height:18px;border-radius:50%;'
            'color:#6b7280;font-size:12px;border:1px solid #d1d5db">i</span>')


def sel(v, w=130, role=None):
    st = ''
    if role:
        st = ';background:%s;color:%s' % (('#eef6ff', '#2563eb') if role == 'ADMIN' else ('#f3f4f6', '#475569'))
    return ('<span class="inp" style="display:inline-flex;align-items:center;justify-content:space-between;width:%dpx;padding:6px 9px%s">'
            '%s<span style="color:#9ca3af">▾</span></span>' % (w, st, v))


def row(n, e, d, r, on, me, err_name=False):
    nm = ('<span class="inp" style="display:inline-block;width:130px;padding:6px 9px;font-weight:600%s">%s</span>'
          % (';border-color:#f87171;background:#fef2f2' if err_name else '', '' if err_name else n))
    tag = kws.tg('나', '#ecfdf5', '#047857', False) if me else ''
    stt = kws.tg('사용 중', '#dcfce7', '#166534', False) if on else kws.tg('사용 중지', '#f3f4f6', '#9ca3af', False)
    return ('<tr style="border-top:1px solid #eef0f4;%s">'
            '<td style="padding:8px 12px">%s %s</td>'
            '<td style="padding:8px 12px;%s;font-size:12px;color:#6b7280">%s</td>'
            '<td style="padding:8px 12px">%s</td><td style="padding:8px 12px">%s</td><td style="padding:8px 12px">%s</td></tr>'
            % ('' if on else 'opacity:.55', nm, tag, MONO, e, sel(d, 140), sel(r, 110, r), stt))


# 첫 방문 승인 요청 `PC-299` — 머리 [🔔 승인 요청 n건] → 모달 `PC-303`
REQS = (('정하늘', 'haneul.jung@neolab.net', '2026-11-13 10:05'), ('오세린', 'serin.oh@neolab.net', '2026-11-13 14:22'))


def req_modal(reqs=REQS):
    rows = ''.join('<tr style="border-top:1px solid #eef0f4"><td style="padding:9px 10px;font-weight:700">%s</td>'
                   '<td style="padding:9px 10px;%s;font-size:12px">%s</td><td style="padding:9px 10px;%s;font-size:12px;color:#6b7280">%s</td>'
                   '<td style="padding:9px 10px;text-align:right;white-space:nowrap"><span class="btn pri" style="padding:5px 12px">승인</span> '
                   '<span class="btn gho" style="padding:5px 12px;color:#dc2626;border-color:#fecaca">거절</span></td></tr>' % (n, MONO, e, MONO, d) for n, e, d in reqs)
    th = ''.join('<th style="text-align:%s;padding:8px 10px;font-size:11.5px;color:#6b7280;font-weight:600;background:#fafbfc">%s</th>' % (al, h)
                 for h, al in (('이름', 'left'), ('이메일', 'left'), ('요청 일시', 'left'), ('처리', 'right')))
    return ('<div class="ovl"><div class="mdl" style="width:640px"><div class="mh"><div class="mt">승인 요청 %d건</div><div class="mx">✕</div></div>'
            '<div style="border:1px solid #eef0f4;border-radius:10px;overflow:hidden"><table style="width:100%%;border-collapse:collapse;font-size:12.5px">'
            '<thead><tr>%s</tr></thead><tbody>%s</tbody></table></div>'
            '<div class="mf"><div class="btn gho">닫기</div></div></div></div>' % (len(reqs), th, rows))


def content(filt='all', rows=STAFF, msg='', err_name=False, empty=False, reqs=()):
    n_off = sum(1 for x in STAFF if not x[4])
    chips = (kws.chip('전체 %d' % len(STAFF), filt == 'all') + kws.chip('사용 중', filt == 'on') + kws.chip('사용 중지 %d' % n_off, filt == 'off'))
    head = ('<div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid #eef0f4">'
            '<b style="font-size:13.5px">직원 계정</b>%s<span style="width:8px"></span>%s'
            '<span class="inp" style="width:220px;color:#9ca3af;padding:6px 9px">이름 · 이메일 · 부서 검색</span>%s</div>'
            % (info(), chips, '<span style="flex:1"></span>' + (('<span style="font-size:12.5px;padding:6px 12px;border-radius:8px;border:1px solid #fcd34d;'
                               'background:#fffbeb;color:#92400e;font-weight:700">🔔 승인 요청 %d건</span>' % len(reqs)) if reqs else '')
               + '<span class="btn pri" style="padding:6px 12px;font-size:12.5px">＋ 직원 등록</span>'))   # 직원 직접 등록 `PC-309`
    th = ''.join('<th style="text-align:left;padding:8px 12px;font-size:11.5px;color:#6b7280;font-weight:600">%s</th>' % h
                 for h in ('이름 <span style="color:#1d4ed8;font-size:10px">▲</span>', '이메일 (로그인 계정)', '부서 <span style="color:#c0c4cc;font-size:10px">↕</span>',
                           '역할 <span style="color:#c0c4cc;font-size:10px">↕</span> ' + info(), '상태 <span style="color:#c0c4cc;font-size:10px">↕</span>'))   # 정렬 머리 `PC-297`
    body = ''.join(row(*x, err_name=(err_name and x[5])) for x in rows)
    if empty:
        body = '<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:28px">조건에 맞는 직원이 없습니다.</td></tr>'
    table = ('<table style="width:100%%;border-collapse:collapse;font-size:12.5px"><thead><tr style="background:#fafbfc">%s</tr></thead>'
             '<tbody>%s</tbody></table>' % (th, body))
    m = ('<div style="margin-top:10px;font-size:12.5px;color:%s;text-align:right">%s</div>'
         % ('#dc2626' if msg and not msg.startswith('이름 변경') else '#047857', msg)) if msg else ''
    return ('<div style="padding:18px 20px">%s%s<div style="%s;overflow:hidden">%s%s</div>%s</div>'
            % ('', '', kws.CARD, head, table, m))   # 집계 카드 없음 `PC-304`


def denied():
    return ('<div style="padding:40px 22px;display:flex;justify-content:center"><div style="%s;padding:28px 32px;text-align:center;max-width:420px">'
            '<div style="font-size:28px;margin-bottom:8px">🔒</div>'
            '<div style="font-weight:700;font-size:15px;color:#111827">접근 권한이 없습니다</div>'
            '<div style="font-size:12.5px;color:#6b7280;margin-top:6px">직원 계정은 관리자(ADMIN) 계정만 관리할 수 있습니다.</div></div></div>'
            % kws.CARD)


def build():
    boards = []
    boards.append((
        'S1', '기본 — 직원 표', '기본',
        '이 콘솔을 쓰는 내부 직원. 처음 쓰는 직원은 로그인 화면에서 <b>승인 요청</b>하고 ADMIN 이 승인하면 등록되므로(S5) [등록] 버튼은 없다 <code>PC-299</code>. '
        '<b>이름</b>은 표에서 바로 고치고(벗어나거나 Enter 면 저장), <b>부서 · 역할</b>은 고르면 바로 저장, <b>상태</b>는 눌러 사용 중 ↔ 사용 중지. 이메일은 로그인 계정이라 고칠 수 없다. 지우지 않는다.',
        frame('MEM-03', '직원 계정', content(), height=620),
        [('이름 · 부서 · 역할 · 상태 머리', '클릭', '그 순서로 정렬', '▲ / ▼ · 다시 누르면 반대 · 기본 이름순 · 역할은 ADMIN → STAFF. 값을 바꿔도 줄은 그 자리(머리를 누를 때만 다시 정렬)'),
         ('이름', '고침', '벗어나거나 Enter 면 저장 · Esc 되돌림', '<b>이름 변경 — {이름}</b> · <code>LOG-01</code>'),
         ('부서', '선택', '바로 저장', '국내사업팀 · 해외사업팀 · 서비스기획팀 · SW개발팀 · 펌웨어개발팀 · 개발품질팀 · 재무회계팀 <code>PC-305</code> · 처음 등록 때는 「- 미지정 -」'),
         ('역할', '선택', '바로 저장', '<b>역할 변경 — {이름} · {역할}</b>'),
         ('역할 ⓘ', '클릭', '역할 차이 말풍선', '<b>ADMIN</b> = 모든 메뉴 + 활동 로그 · 직원 계정 / <b>STAFF</b> = 업무 메뉴 전부(활동 로그 · 직원 계정 없음) · ADMIN 1명 이상'),
         ('상태', '클릭', '사용 중 ↔ 사용 중지', '사용 중지 = 로그인할 수 없음 · <b>사용 중지 — {이름}</b>'),
         ('직원 계정 ⓘ', '클릭', '말풍선', '승인 요청 · 사용 중지 안내')]))
    boards.append((
        'S2', '사용 중지 직원 보기', '필터',
        '[사용 중지 n] 칩을 누르면 사용 중지한 직원만 남는다(흐린 줄). 검색은 이름 · 이메일 · 부서를 찾는다.',
        frame('MEM-03', '직원 계정', content(filt='off', rows=tuple(x for x in STAFF if not x[4])), height=520),
        [('[사용 중지 n]', '클릭', '사용 중지만', '[전체] · [사용 중] 으로 되돌림'),
         ('검색', '입력', '맞는 직원만', '없으면 <b>조건에 맞는 직원이 없습니다.</b>'),
         ('상태 [사용 중지]', '클릭', '다시 사용', '<b>다시 사용 — {이름}</b>')]))
    boards.append((
        'S3', '막힌 변경', '오류',
        '관리자(ADMIN)가 없어지거나 내 계정이 잠기는 변경은 막고, 값은 그대로 둔 채 아래에 빨간 안내를 보인다.',
        frame('MEM-03', '직원 계정', content(msg='관리자(ADMIN)가 한 명은 있어야 합니다. 다른 직원을 먼저 ADMIN 으로 지정하세요.'), height=640),
        [('마지막 ADMIN 역할 · 상태', '변경', '<b>막음</b>', '<b>관리자(ADMIN)가 한 명은 있어야 합니다. 다른 직원을 먼저 ADMIN 으로 지정하세요.</b>'),
         ('내 계정 상태', '클릭', '<b>막음</b>', '<b>로그인한 내 계정은 사용 중지할 수 없습니다.</b>'),
         ('이름 비움', '벗어남', '원래 이름으로', '<b>이름은 비울 수 없습니다.</b>')]))
    boards.append((
        'S4', 'STAFF 접근 차단', '권한',
        '메뉴는 ADMIN 에게만 보이고, STAFF 가 주소(/staff)로 들어와도 본문 대신 🔒 안내가 나온다(활동 로그와 같다).',
        frame('MEM-03', '직원 계정', denied(), admin=False, user='박지훈', role='STAFF', height=520),
        [('본문', '표시', '—', '<b>접근 권한이 없습니다</b> / <b>직원 계정은 관리자(ADMIN) 계정만 관리할 수 있습니다.</b>'),
         ('좌측 메뉴 [직원 계정]', '—', '<b>노출 안 됨</b>', 'ADMIN 에게만 표시')]))
    boards.append((
        'S5', '승인 요청 모달', '승인',
        '처음 쓰는 직원이 로그인 화면 [첫 방문 — 승인 요청](<code>PRD-00</code> S15)에서 이름 · 회사 이메일로 요청하면 <code>PC-299</code>, '
        '<b>대기 요청이 있을 때만</b> 직원 표 머리 오른쪽에 <b>[🔔 승인 요청 n건]</b>이 뜨고 <b>누르면 바로 모달</b> <code>PC-303</code>. '
        '한 줄 = <b>이름 · 이메일 · 요청 일시(년월일 시:분) · [승인] [거절]</b> — 고객사 관리 승인 요청 모달(<code>MEM-01</code> S11)과 같은 모양. '
        'ADMIN 의 좌측 메뉴 [직원 계정] 옆에도 대기 건수가 붙는다(할 일 표시).',
        frame('MEM-03', '직원 계정', content(reqs=REQS), overlay=req_modal(), height=640),
        [('[🔔 승인 요청 n건]', '클릭', '모달', '대기 요청이 있을 때만'),
         ('[승인]', '클릭', '명단에 추가', '확인 없이 바로 — <b>STAFF · 사용 중 · 부서 미지정</b> · 그 이메일로 로그인 가능(초기 비밀번호 = 이메일) · 모달 위 초록 줄 <b>✅ {이름} 승인 — STAFF 로 직원 명단에 들어갔습니다.</b> · <code>LOG-01</code>'),
         ('[거절]', '클릭', '확인창', '<b>{이름}({이메일}) 의 승인 요청을 거절할까요?</b> → 요청에서 빠짐 · 다시 요청할 수 있음'),
         ('요청 없음', '—', '버튼 숨김', '모달 안에서 모두 처리하면 <b>대기 중인 승인 요청이 없습니다.</b>')]))

    # 직원 직접 등록 모달 `PC-309`
    def fld(lb, v, ph=False):
        return ('<div class="fld" style="margin-bottom:10px"><span class="lbl">%s</span><div class="inp"%s>%s</div></div>'
                % (lb, ' style="color:#9ca3af"' if ph else '', v))
    add_modal = ('<div class="ovl"><div class="mdl"><div class="mh"><div class="mt">직원 등록</div><div class="mx">✕</div></div>'
                 + fld('이름 *', '박민지') + fld('회사 이메일 (로그인 계정) *', 'minji.park@neolab.net')
                 + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' + fld('부서', '개발품질팀 ▾') + fld('역할', 'STAFF ▾') + '</div>'
                 + '<div class="mf"><div class="btn gho">취소</div><div class="btn pri">등록</div></div></div></div>')
    boards.append((
        'S6', '직원 직접 등록', '등록',
        '승인 요청을 기다리지 않고 ADMIN 이 직원 표 머리의 <b>[＋ 직원 등록]</b>으로 바로 등록한다 <code>PC-309</code>. '
        '이름 · 회사 이메일 · 부서 · 역할을 넣고 [등록] → <b>사용 중</b>으로 명단에 들어가고 그 이메일로 로그인할 수 있다(초기 비밀번호 = 이메일). '
        '같은 이메일의 대기 승인 요청이 있으면 함께 닫힌다(승인으로).',
        frame('MEM-03', '직원 계정', content(), overlay=add_modal, height=640),
        [('[＋ 직원 등록]', '클릭', '등록 모달', 'ADMIN 만(화면이 ADMIN 전용)'),
         ('이름 *', '입력', '—', '비우면 <b>이름을 입력하세요.</b> · 모달을 열면 이 칸에 커서'),
         ('회사 이메일 *', '입력', '—', '비우면 <b>회사 이메일을 입력하세요.</b> · 형식 <b>이메일 형식이 올바르지 않습니다.</b> · 도메인 <b>회사 계정(@neolab.net)만 등록할 수 있습니다.</b> · 중복 <b>이미 등록된 직원입니다.</b>'),
         ('부서 · 역할', '선택', '—', '기본 「- 미지정 -」 · STAFF'),
         ('[등록] · Enter', '클릭', '모달 닫힘 · 명단에 추가', '<b>직원 등록 — {이름}</b> · <code>LOG-01</code> 「직원 등록 — {이름} · {이메일} · {역할}」'),
         ('[취소] · ✕', '클릭', '모달 닫힘', '')]))

    intro = ('<b>이 콘솔을 쓰는 내부 직원</b>의 이름 · 부서 · 역할 · 사용 여부를 관리하는 화면 <code>PC-297</code>. <b>ADMIN 전용</b>. '
             '처음 쓰는 직원은 로그인 화면에서 <b>승인 요청</b> → ADMIN 이 <b>승인</b>하면 STAFF 로 등록되고(<code>PC-299</code>), 직원 이름은 N Key 담당자(<code>PC-296</code>) · 활동 로그 직원으로 쓰인다. '
             '삭제는 없고 그만둔 직원은 「사용 중지」(로그인 불가).')
    return page(CODE, NAME, PRD, intro, boards)
