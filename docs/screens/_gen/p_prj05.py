# -*- coding: utf-8 -*-
"""PRJ-05 편집 고객사 추가 — 실제 화면 구조 그대로.

PRJ-02 편집 프로젝트 목록의 [＋ 고객사 추가] 로 열리는 창.
이미 코드를 받은 고객사를 편집 관리 대상으로 올린다. 코드를 새로 할당하지 않는다.
① 등록된 고객사 선택 → ② Owner 코드 선택(할당 코드가 없으면 직접 입력)
"""
from shell import page, frame
from p_tkt01 import sel, field

CODE, NAME = 'PRJ-05', '편집 고객사 추가'
PRD = 'docs/prd/PRJ-05_편집 고객사 추가.md'

# (코드 종류, Section, Owner)
OPTS = (('N', 3, 212), ('G', 3, 17), ('N', 5, 88))


def sc(k, c, v):
    return ('<span style="display:inline-flex;align-items:center;gap:5px;border:1px solid #eef0f4;'
            'border-radius:8px;padding:2px 7px 2px 2px;background:#fff;font-size:12px">'
            '<span style="background:%s;color:#fff;font-weight:700;font-size:10.5px;'
            'border-radius:6px;padding:2px 6px;min-width:12px;text-align:center">%s</span>'
            '<span style="font-family:ui-monospace,monospace;color:#111827">%s</span></span>'
            % (c, k, v))


def code_btn(kind, section, owner, on=False):
    label = 'N(PDS3)' if kind == 'N' else 'G(PDS2)'
    return ('<span style="display:inline-flex;align-items:center;gap:5px;border:1px solid %s;'
            'background:%s;border-radius:9px;padding:5px 8px">'
            '<span style="font-size:9px;font-weight:700;color:#fff;border-radius:5px;'
            'padding:1px 5px;background:%s">%s</span>%s%s</span>'
            % ('#93c5fd' if on else '#e5e7eb', '#eef6ff' if on else '#fff',
               '#2563eb' if kind == 'N' else '#d97706', label,
               sc('S', '#5f8ff0', section), sc('O', '#14b8a6', owner)))


def owner_block(picked=None, opts=OPTS):
    btns = ''.join(code_btn(k, s, o, on=(picked == o)) for k, s, o in opts)
    more = ('<span style="color:#9ca3af"> · %d개 중 선택</span>' % len(opts)) if len(opts) > 1 else ''
    return ('<div style="margin-top:12px">'
            '<div style="font-size:12px;color:#6b7280;margin-bottom:6px">Owner 코드 *%s</div>'
            '<div style="display:flex;flex-wrap:wrap;gap:8px">%s</div>'
            '<p style="font-size:11.5px;color:#9ca3af;margin-top:8px">선택한 Owner 코드가 '
            '<b>편집 관리</b> 대상이 되어 코드 프로젝트·SOBP 맵에서 <b>편집</b> 플래그로 '
            '표시됩니다.</p></div>' % (more, btns))


def manual_block(co='크레버스'):
    return ('<div style="margin-top:12px">'
            '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:9px;'
            'padding:9px 11px;font-size:12px;color:#92400e;margin-bottom:10px">'
            '<b>%s</b> 는 아직 할당된 코드가 없습니다. Owner 코드를 직접 입력하거나, '
            '먼저 <b>SOBP 맵</b>에서 코드를 할당하세요.</div>'
            '<div class="g2">%s%s</div></div>'
            % (co, field('Owner (직접 입력)', '<div class="inp">1030</div>', True),
               field('코드 종류', sel('PDS3(Ncode)'))))


def modal(company='- 고객사 선택 -', body='', ok=False):
    btn = ('<div class="btn pri">추가</div>' if ok
           else '<div class="btn dis">추가</div>')
    return ('<div class="ovl"><div class="mdl" style="width:560px">'
            '<div class="mh"><div class="mt">편집 고객사 추가</div>'
            '<div class="mx">✕</div></div>'
            '%s%s'
            '<p style="font-size:11.5px;color:#9ca3af;margin-top:12px">추가 후 우측 상세에서 '
            '<b>＋교재(책) 추가</b>로 편집 교재를 등록하세요.</p>'
            '<div class="mf"><div class="btn gho">취소</div>%s</div></div></div>'
            % (field('등록된 고객사 * (고객사 관리)', sel(company)), body, btn))


def F(overlay):
    return frame('PRJ-02', '편집 프로젝트', '<div style="padding:8px;color:#9ca3af;'
                 'font-size:12.5px">편집 프로젝트 목록 (배경)</div>',
                 height=760, overlay=overlay)


NAV = [('[취소] · ✕', '클릭', '<code>PRJ-02</code>', '목록으로 복귀'),
       ('코드 할당 필요', '—', '<code>SOB-02</code>', '직접 코드 할당'),
       ('고객사가 없을 때', '—', '<code>MEM-02</code>', '고객사 등록'),
       ('추가 후 다음 단계', '—', '<code>PRJ-04</code>', '교재(책) 추가')]


def build():
    B = []

    B.append((
        'S1', '진입 — 고객사 미선택', '기본',
        '<code>PRJ-02</code> 의 <b>[＋ 고객사 추가]</b> 로 열린다. '
        '⚠ <b>고객사를 새로 만드는 화면이 아니다</b> — 이미 코드를 받은 고객사를 '
        '<b>편집 관리 대상으로 올리는</b> 창이다. 고객사를 고르기 전에는 아래가 비어 있고 '
        '<b>[추가]</b> 가 눌리지 않는다.',
        F(modal()),
        [('등록된 고객사', '선택', 'Owner 코드 목록', '<code>MEM-01</code> 등록분 · 가나다순'),
         ('[추가]', '—', '<b>비활성</b>', '고객사·Owner 가 모두 정해져야 눌린다'),
         ('미선택 저장', '—', '확인창',
          '<b>고객사 관리에 등록된 고객사를 선택하세요.</b>'),
         ('다음 단계 안내', '표시', '—',
          '<b>추가 후 우측 상세에서 ＋교재(책) 추가로 편집 교재를 등록하세요.</b>')] + NAV))

    B.append((
        'S2', 'Owner 코드 선택', '기본',
        '고객사를 고르면 그 고객사가 <b>발급받은 코드</b>가 버튼으로 열린다. '
        '<b>(코드 종류 · Section · Owner)</b> 가 같은 발급은 하나로 묶이고 '
        '<b>Section → Owner</b> 순으로 정렬된다. 목록 만드는 규칙은 PRD §4.5(가).',
        F(modal('웅진씽크빅', owner_block(picked=212), ok=True)),
        [('Owner 코드 버튼', '클릭', '선택', '코드 종류 · S · O 를 함께 표시'),
         ('개수 표기', '표시', '—', '여러 개면 <b>{n}개 중 선택</b>'),
         ('정렬', '—', 'Section → Owner', '오름차순'),
         ('선택 안내', '표시', '—',
          '<b>선택한 Owner 코드가 편집 관리 대상이 되어 코드 프로젝트·SOBP 맵에서 '
          '편집 플래그로 표시됩니다.</b>'),
         ('미선택 저장', '—', '확인창',
          '<b>Owner 코드를 선택하세요. (여러 개면 하나를 고르세요)</b>'),
         ('[추가]', '클릭', '<code>PRJ-02</code>',
          '목록에 추가되고 <b>그 고객사가 바로 선택</b>된다')] + NAV))

    B.append((
        'S3', 'Owner 1개 — 자동 선택', '분기',
        '할당된 Owner 가 <b>하나뿐이면</b> 고객사를 고르는 즉시 그 코드가 선택된다. '
        '바로 <b>[추가]</b> 를 누를 수 있다.',
        F(modal('아이스크림에듀', owner_block(picked=88, opts=(('N', 5, 88),)), ok=True)),
        [('Owner 1개', '자동', '선택됨', '개수 표기가 붙지 않는다'),
         ('[추가]', '—', '<b>활성</b>', '추가 조작 없이 바로 누를 수 있다'),
         ('중복 추가', '—', '기존 항목으로 이동',
          '같은 <b>고객사명 + Owner</b> 가 있으면 새 줄을 만들지 않는다 — PRD §4.5(나)')]))

    B.append((
        'S4', '할당 코드 없음 — 직접 입력', '차단',
        '그 고객사에 아직 할당된 코드가 없으면 경고가 나오고 <b>직접 입력</b> 칸이 열린다. '
        '정상 절차는 <code>SOB-02</code> 에서 <b>코드를 먼저 할당</b>하는 것이고, '
        '직접 입력은 <b>예외 경로</b>다(§7 미결).',
        F(modal('크레버스', manual_block(), ok=True)),
        [('경고', '표시', '—',
          '<b>{고객사} 는 아직 할당된 코드가 없습니다. Owner 코드를 직접 입력하거나, '
          '먼저 SOBP 맵에서 코드를 할당하세요.</b>'),
         ('Owner (직접 입력)', '입력', '숫자', '<b>필수</b>'),
         ('코드 종류', '선택', 'PDS3(Ncode) / PDS2(Gcode)', '기본 PDS3'),
         ('정상 절차', '—', '<code>SOB-02</code>', '코드 할당 후 다시 시도')] + NAV))

    intro = ('이미 코드를 받은 고객사를 <b>편집 관리 대상으로 올리는</b> 창이다. '
             '<b>고객사를 새로 만들거나 코드를 새로 할당하지 않는다</b> — 이미 할당된 코드 중 '
             '<b>어느 Owner를 편집할지</b> 고르는 것이다. 추가하면 ① 그 Owner 코드가 '
             '<code>PRJ-01</code>·<code>SOB-01</code> 에서 <b>편집</b> 으로 표시되고 '
             '② 편집 프로젝트 목록에 그 고객사가 올라간다. 판정 규칙은 PRD §4.5.')
    return page(CODE, NAME, PRD, intro, B)
