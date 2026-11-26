# -*- coding: utf-8 -*-
"""PRJ-01 코드 프로젝트 — web/components/ProjectsView.tsx 실제 구현 기준 (3단 구성)
그림의 값은 로컬 앱(시드 데이터) 화면에서 그대로 옮겼다 (2026-11-23)."""
from shell import page, frame

CODE, NAME = 'PRJ-01', '코드 프로젝트'
PRD = 'docs/prd/PRJ-01_코드 프로젝트.md'

# 코드 종류 4종 — 짧은 표기 · 색 (web/lib/codeKind.ts CODE_KINDS)
KIND = {'PDS2': ('#d97706', '#fef3c7'), 'PDS3': ('#2563eb', '#eef6ff'),
        'PDS4': ('#7c3aed', '#f3e8ff'), 'OID': ('#0f766e', '#ccfbf1')}
KIND_LABEL = {'PDS2': 'PDS2 (Gcode)', 'PDS3': 'PDS3 (Ncode)', 'PDS4': 'PDS4 (S-code)', 'OID': 'OID'}


def kind_chip(k, small=False):
    """KindChip — 흰 글씨 · 종류 색 바탕 · 짧은 표기(PDS2 / PDS3 / PDS4 / OID)"""
    return ('<span style="background:%s;color:#fff;border-radius:6px;padding:%s;font-size:%s;font-weight:700;'
            'white-space:nowrap">%s</span>' % (KIND[k][0], '1px 5px' if small else '2px 7px',
                                              '9.5px' if small else '10.5px', k))


def kbadge(k):
    """고객사 카드의 보유 코드 종류 배지"""
    return ('<span class="tag" style="font-size:9.5px;background:%s;color:%s;font-weight:700">%s</span>'
            % (KIND[k][1], KIND[k][0], k))


def role_chip(t):
    """확장 언어 그룹 역할 칩 — [기본] / [확장 k] `PC-350` (역할 미지정 칩은 없앴다 `PC-357`)"""
    bg, fg = ('#dbeafe', '#1d4ed8') if t == '기본' else ('#cffafe', '#0e7490')
    return ('<span style="font-size:9px;font-weight:700;border-radius:4px;padding:0 4px;line-height:14px;'
            'white-space:nowrap;background:%s;color:%s">%s</span>' % (bg, fg, t))


def sc(k, v, color, small=False):
    return ('<span style="display:inline-flex;align-items:center;gap:5px;border:1px solid #e5e7eb;'
            'border-radius:8px;padding:2px 6px 2px 2px;background:#fff;font-size:%s">'
            '<span style="background:%s;color:#fff;font-weight:700;font-size:%s;'
            'border-radius:6px;padding:2px 6px;min-width:12px;text-align:center">%s</span>'
            '<span style="font-family:ui-monospace,monospace;color:#111827">%s</span></span>'
            % ('11px' if small else '12px', color, '9.5px' if small else '10.5px', k, v))


def sobp(k, s, o, b=None, p=None, small=False):
    out = kind_chip(k, small) + sc('S', s, '#5f8ff0', small) + sc('O', o, '#14b8a6', small)
    if b is not None:
        out += sc('B', b, '#8b5cf6', small)
    if p is not None:
        out += sc('P', p, '#f59e0b', small)
    return '<span style="display:inline-flex;align-items:center;gap:4px;flex-wrap:wrap">%s</span>' % out


def tag(t, bg='#f3f4f6', fg='#374151', extra=''):
    return '<span class="tag" style="background:%s;color:%s;%s">%s</span>' % (bg, fg, extra, t)


# ── 데이터 (로컬 앱 화면 값) ─────────────────────────────────────────
SUMMARY_ALL = ('고객사 <b>496</b> · 프로젝트 <b>510</b> · 발급 코드 <b style="color:#2563eb">1,532,388,426</b> · '
               '실등록 <b style="color:#0f766e">681,032</b>')
SUMMARY_F = ('고객사 <b>19</b> · 프로젝트 <b>20</b> · 발급 코드 <b style="color:#2563eb">53,980</b> · '
             '실등록 <b style="color:#0f766e">53,980</b>')
SUMMARY_COMMON = ('고객사 <b>1</b> · 프로젝트 <b>22</b> · 발급 코드 <b style="color:#2563eb">72,896</b> · '
                  '실등록 <b style="color:#0f766e">72,896</b>')
SUMMARY_NONE = ('고객사 <b>0</b> · 프로젝트 <b>0</b> · 발급 코드 <b style="color:#2563eb">0</b> · '
                '실등록 <b style="color:#0f766e">0</b>')
SUMMARY_HUM = ('고객사 <b>1</b> · 프로젝트 <b>1</b> · 발급 코드 <b style="color:#2563eb">0</b> · '
               '실등록 <b style="color:#0f766e">0</b>')

# (고객사명, 서비스요약, 코드수, [코드종류], 종료)
CUSTS = [
    ('(주)투이아이앤씨', 'SDK 연동', '0', [], False),
    ('21세기 북스', 'SDK 연동', '0', [], False),
    ('가쿠쇼', 'SDK 연동', '4,194,304', [], False),
    ('가쿠쇼-1022', 'casterN', '0', ['PDS3'], False),
    ('강효원 과장님', 'SDK 연동', '0', [], False),
    ('고려대학교', 'SDK 연동', '0', [], False),
    ('과학기술정보통신부 / 한국특허전략계발원', 'SDK 연동', '0', [], False),
    ('광동대청', 'SDK 연동', '0', [], False),
    ('교원', 'SDK 연동', '0', [], False),
    ('교원구몬', 'SDK 연동', '8,388,608', [], False),
    ('교원구몬-10', 'casterN', '41,419', ['PDS2'], False),
    ('신사고-6', 'casterN', '29,286', ['PDS3'], False),
]
# 코드 종류 PDS3 + [편집] + casterN 으로 거른 결과 (19곳 중 앞 14곳)
CUSTS_F = [
    ('가쿠쇼-1022', 'casterN', '0', ['PDS3'], False),
    ('교원도요새베트남-4', 'casterN', '4,544', ['PDS3'], False),
    ('드림블라썸-939', 'casterN', '548', ['PDS3'], False),
    ('러닝루츠-1020', 'casterN', '0', ['PDS3', 'PDS2'], False),
    ('쇼가쿠칸-1023', 'casterN', '0', ['PDS3'], False),
    ('쇼가쿠칸-963', 'casterN', '1', ['PDS3'], False),
    ('수하임-1021', 'casterN', '831', ['PDS3', 'OID'], False),
    ('포코로-942', 'casterN', '1,397', ['PDS3'], False),
    ('한반도평화네트워크-305', 'casterN', '519', ['PDS3'], False),
    ('ALC-1015', 'casterN', '0', ['PDS3'], False),
    ('ALC2-1010', 'casterN', '137', ['PDS3'], False),
    ('Cake-1009', 'casterN', '9,106', ['PDS3', 'OID'], False),
    ('CMS 에듀-945', 'casterN', '4,338', ['PDS3'], False),
    ('Froebel-kan-1016', 'casterN', '104', ['PDS3'], False),
]
CUSTS_COMMON = [('Common-21', 'casterN', '72,896', ['PDS2', 'OID'], False)]
CUSTS_HUM = [('humedical-28', 'SDK 연동', '0', [], True)]

# 프로젝트: so = [(종류, S, O, 역할칩)], blocks = [(종류, S, O, B, P, 역할칩, 발급일, 계산, 실등록)]
P_SIN = dict(title='신사고-6 코드발급', cust='신사고-6', so=[('PDS3', 5, 6, None)], svc=['casterN (편집툴)'],
             editing=False, codes='29,286', nblk=1, kpi=('29,286', '29,286', '0', 'PDS3'), edit=None,
             blocks=[('PDS3', 5, 6, '1~2449', '0~0', None, '2016-09-20', '2,449권 × 1p = 29,286', '29,286')])
P_HUM = dict(title='humedical-28 코드발급', cust='humedical-28', so=[('PDS3', 3, 28, None)], svc=[],
             editing=False, codes='0', nblk=1, kpi=('0', '0', '0', '-'), edit=None,
             blocks=[('PDS3', 3, 28, '0~16383', '0~0', None, '2013-07-09', '16,384권 × 1p = 0', '')])
_ext_rows = [('PDS2', 3, 964, '27~611', '0~0', '확장 1', '2021-11-25', '585권 × 1p = 2,003', '2,003'),
             ('PDS2', 3, 965, '262~511', '0~0', '확장 2', '2025-01-02', '250권 × 1p = 1,359', '1,359')] + [
    ('PDS3', 3, o, '0~0', '0~0', '확장 %d' % (o - 963), '2020-01-01', '1권 × 1p = 0', '') for o in range(966, 984)]
P_COM = dict(title='Common-21 코드발급', cust='Common-21', so=[('PDS2', 3, 21, '기본')], svc=['casterN (편집툴)'],
             editing=True, codes='69,496', nblk=1, kpi=('69,496', '69,496', '413,595', 'PDS2 · OID'),
             edit='✏️ 편집 413,595심볼 →',
             blocks=[('PDS2', 3, 21, '1~1008', '0~0', '기본', '2013-06-04', '1,008권 × 1p = 69,496', '69,496')] + _ext_rows)
P_COM_OID = dict(title='Common-21 코드발급', cust='Common-21', so=[('OID', 3, 21, '기본')], svc=['casterN (편집툴)'],
                 editing=True, codes='38', nblk=1)
# 공통코드 Common-21 사용 고객사(하위) 50곳 — 이름 가나다순(한글 → 영문)
MEMBERS = ['교원에듀', '교원위즈', '국립문화재연구소', '대교', '미래엔영어', '방교영 교수', '보고미디어', '보리출판사', '북극곰',
           '비상교육', '비전코람데오', '새알교육', '소방청', '스마트스터디', '스콜라스틱', '아들과딸', '아산시 박물관', '아이디어스푼',
           '에듀윈드', '연두비', '웅진', '유니메이션', '이주홍', '이퓨쳐', '인천교육청', '장원교육', '전북교육청', '중앙일보',
           '청담어학원', '충남교육청', '코야키즈', '코어교육', '파고다', '퍼플아카데미', '프뢰벨', '플레이스마터', '피피오잉글리시',
           '한국뉴베리', '한솔', '한울림', '해법영어', '행복한바오밥', '현대미포조선', '호두랩스', 'EBS', 'LG U+', 'NeoLAB',
           'The M', 'Tranwisdom', 'YBM']
# 미래엔영어 사용 SOBP — Book · 교재명 · 페이지 (28권 · 7,336p)
MEM_ROWS = [(51, 'Phonics Grammar', '272p'), (52, 'Story Town 1', '400p'), (53, 'Story Town 2', '400p'),
            (54, 'Theme English', '408p'), (55, 'English Diary', '128p'), (56, 'Reading Town 50', '342p'),
            (57, 'Power Voca E (1-2권)', '248p'), (58, 'Story Town 3', '400p'), (59, 'Reading Town 70', '342p'),
            (60, 'Reading Town 100', '342p'), (72, 'Power Voca M (3-5권)', '432p'), (73, 'Phonics Town', '246p'),
            (74, 'Story Town 4', '400p'), (89, 'Reading Town 30', '342p'), (91, 'Talk Talk English S1', ''),
            (92, 'Reading Town 130', '162p'), (93, 'All in One Listening', '308p'), (94, 'Phonics Fun', '312p'),
            (95, 'Readers Solution', '156p'), (169, 'Power Voca H (6권)', '132p'), (189, 'Grammar Fun', '192p'),
            (204, 'Phonics Fun QR TEST', ''), (210, 'Writing Builder', '192p'), (231, 'Story Town', '320p'),
            (278, 'Reading Builder', '288p'), (288, 'Reading Town 230-1', '92p'), (290, 'Word Time Starter', '272p'),
            (301, 'Reading Town 170', '208p')]


# ── 그리기 ─────────────────────────────────────────────────────────
def topbar_line(summary=SUMMARY_ALL, filtered=False):
    tail = ('<span style="color:#2563eb"> · 필터 적용 (전체 536곳 / 510건)</span>' if filtered
            else '<span style="color:#9ca3af"> · 할당된 코드를 업체·서비스별로 조회 '
                 '(발급은 [Ncode 예약·할당])</span>')
    return ('<div class="row" style="margin-bottom:12px;gap:10px;flex-wrap:wrap">'
            '<p style="margin:0;color:#6b7280;font-size:12.5px">%s%s</p>'
            '<div style="flex:1"></div>'
            '<div class="btn gho">초기화</div></div>' % (summary, tail))


def col_cust(custs, sel, pds='전체 코드 종류 (496)', flag='전체', svc='사용 서비스 · 전체', search=''):
    def chips(items, active):
        return ''.join(
            '<span style="flex:1;text-align:center;border:1px solid %s;background:%s;color:%s;border-radius:7px;'
            'padding:4px 2px;font-size:10.5px;font-weight:%s">%s</span>'
            % ('#93c5fd' if x == active else '#e5e7eb', '#eef6ff' if x == active else '#fff',
               '#2563eb' if x == active else '#6b7280', '700' if x == active else '400', x)
            for x in items)
    sv = (search or '<span style="color:#9ca3af">고객사 검색</span>')
    clear = ('<span style="position:absolute;right:8px;top:50%;transform:translateY(-50%);'
             'color:#9ca3af">×</span>') if search else ''
    if not custs:
        items = '<div style="padding:10px;font-size:12px;color:#9ca3af;text-align:center">결과 없음</div>'
    else:
        items = ''
        for nm, s, codes, kinds, closed in custs:
            on = (nm == sel)
            end = ('<span class="tag" style="font-size:9px;background:#f3f4f6;color:#6b7280;'
                   'font-weight:700">종료</span>') if closed else ''
            items += ('<div style="border:1px solid %s;background:%s;border-radius:10px;'
                      'padding:9px 11px;margin-bottom:5px;text-align:left;%s">'
                      '<div style="font-weight:700;font-size:13px;color:%s;display:flex;'
                      'align-items:center;gap:6px">%s%s</div>'
                      '<div style="font-size:11px;color:#9ca3af;margin-top:2px;display:flex;'
                      'align-items:center;gap:4px;flex-wrap:wrap">'
                      '<span>%s · 코드 %s</span>%s</div></div>'
                      % ('#93c5fd' if on else '#eef0f4', '#f5f9ff' if on else '#fff',
                         'opacity:.6' if closed else '',
                         '#1d4ed8' if on else '#111827', nm, end, s, codes, ''.join(kbadge(k) for k in kinds)))
    return ('<div class="card" style="align-self:start"><div style="padding:10px">'
            '<div style="font-weight:700;font-size:13px;margin-bottom:8px">고객사 선택</div>'
            '<div class="inp" style="margin-bottom:8px;display:flex;align-items:center;justify-content:space-between">%s'
            '<span style="color:#9ca3af;font-size:10px">▾</span></div>'
            '<div class="row" style="gap:4px;margin-bottom:8px">%s</div>'
            '<div class="inp" style="margin-bottom:8px;font-size:11.5px;padding:6px 8px;'
            'display:flex;align-items:center;justify-content:space-between">%s'
            '<span style="color:#9ca3af;font-size:10px">▾</span></div>'
            '<div style="position:relative;margin-bottom:8px">'
            '<div class="inp" style="padding-right:28px">%s</div>%s</div>'
            '<div>%s</div></div></div>'
            % (pds, chips(['전체', '편집', '코드발급'], flag), svc, sv, clear, items))


def proj_card(p, on=False):
    chips = ''.join('<span style="display:inline-flex;align-items:center;gap:3px">%s%s</span>'
                    % (sobp(k, s, o, small=True), role_chip(r) if r else '') for k, s, o, r in p['so'][:4])
    more = ('<span style="font-size:10px;color:#9ca3af">+%d</span>' % (len(p['so']) - 4)) if len(p['so']) > 4 else ''
    tags = ''.join(tag(v, extra='font-size:9.5px;margin-right:3px') for v in p['svc'])
    if p.get('editing'):
        tags += tag('편집', '#ecfdf5', '#047857', 'font-size:9.5px')
    return ('<div style="border:1px solid %s;background:%s;border-radius:10px;padding:9px 11px;margin-bottom:5px;text-align:left">'
            '<div style="font-weight:700;font-size:12.5px;color:%s">%s</div>'
            '<div class="row" style="gap:3px;margin-top:4px;flex-wrap:wrap">%s%s</div>'
            '%s'
            '<div style="font-size:10.5px;color:#9ca3af;margin-top:3px">발급 %s코드 · %d블록</div></div>'
            % ('#93c5fd' if on else '#eef0f4', '#f5f9ff' if on else '#fff', '#1d4ed8' if on else '#111827',
               p['title'], chips, more,
               ('<div class="row" style="gap:4px;margin-top:4px;flex-wrap:wrap">%s</div>' % tags) if tags else '',
               p['codes'], p['nblk']))


def col_proj(cust, projs, sel=None):
    inner = (''.join(proj_card(p, i == sel) for i, p in enumerate(projs)) if projs else
             '<div style="padding:10px;font-size:12px;color:#9ca3af;text-align:center">이 고객사의 프로젝트가 없습니다.</div>')
    return ('<div class="card" style="align-self:start"><div style="padding:10px">'
            '<div style="font-weight:700;font-size:13px;margin-bottom:8px">프로젝트 '
            '<span style="color:#9ca3af;font-weight:400">· %s (%d)</span></div>%s'
            '</div></div>' % (cust, len(projs), inner))


def members_panel(sel=None):
    chips = ''.join('<span style="display:inline-flex;align-items:center;padding:5px 9px;background:%s;color:%s;'
                    'border:1px solid %s;border-radius:8px;font-size:12px;font-weight:%s;white-space:nowrap;overflow:hidden">%s</span>'
                    % ('#7e22ce' if m == sel else '#fff', '#fff' if m == sel else '#4b2a6b',
                       '#7e22ce' if m == sel else '#e9d5ff', '700' if m == sel else '400', m) for m in MEMBERS)
    used = ''
    if sel:
        rows = ''.join('<div class="row" style="gap:8px;border:1px solid #eef0f4;border-radius:8px;padding:6px 10px;'
                       'background:#fff;flex-wrap:wrap;margin-bottom:5px">'
                       '<span style="font-size:11px;color:#9ca3af;font-family:ui-monospace,monospace;min-width:16px">%d</span>'
                       '%s<span style="font-size:12px;color:#374151">%s</span><div style="flex:1"></div>%s</div>'
                       % (i + 1, sobp('PDS2', 3, 21, b), t, tag(pg, '#eef6ff', '#2563eb') if pg else '')
                       for i, (b, t, pg) in enumerate(MEM_ROWS))
        used = ('<div style="margin-top:10px;border-top:1px dashed #e9d5ff;padding-top:10px">'
                '<div class="row" style="gap:6px;flex-wrap:wrap;font-size:12px;font-weight:700;color:#6b21a8;margin-bottom:6px">'
                '<b>%s</b> 사용 SOBP <span style="color:#7e22ce;font-weight:400">28권 · 7,336p</span>'
                '<span style="font-weight:400;color:#9ca3af;font-size:11px">· 이 대장 코드 PDS2 · S3/O21 내에서 이 고객사가 쓰는 Book</span></div>'
                '%s</div>' % (sel, rows))
    return ('<div class="card" style="padding:10px 12px;margin-bottom:12px;background:#faf5ff;border-color:#e9d5ff">'
            '<div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:8px;font-size:12.5px;font-weight:700;color:#6b21a8">'
            '사용 고객사 (하위) <span style="color:#7e22ce">50곳</span>'
            '<span class="tag" style="background:#fff;color:#6b21a8;border:1px solid #e9d5ff">Common-21 · PDS2 · S3/O21</span>'
            '<span style="font-weight:400;color:#9ca3af;font-size:11px">· 공통(커먼)코드를 함께 쓰는 고객사 · 편집/티켓은 이 대장으로 진행</span></div>'
            '<div style="position:relative;max-width:260px;margin-bottom:8px">'
            '<div class="inp" style="height:30px;font-size:12px;padding-right:46px;background:#fff;color:#9ca3af">하위 고객사 검색</div>'
            '<span style="position:absolute;right:8px;top:50%%;transform:translateY(-50%%);font-size:10.5px;color:#9ca3af">50/50</span></div>'
            '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(116px,1fr));gap:5px">%s</div>%s</div>'
            % (chips, used))


def col_detail(cust, p=None, closed_note=None, members=False, member_sel=None, scroll=False):
    if p is None:
        return ('<div class="card"><div style="padding:16px">'
                '<div style="color:#9ca3af;font-size:13px;padding:8px">'
                '<b style="color:#374151">%s</b> — 가운데에서 프로젝트를 선택하면 '
                '<b>어떤 코드가 어떻게 발급되었는지</b>(SOBP 블록·발급일·코드 수) '
                '확인할 수 있습니다.</div></div></div>' % cust)
    banner = ('<div style="margin-bottom:10px;padding:8px 12px;background:#f3f4f6;'
              'border:1px solid #e5e7eb;border-radius:8px;font-size:12.5px;color:#4b5563">'
              '🛑 <b>프로젝트 종료 고객사</b> — 코드 발급 이력만 보관합니다. (%s)</div>' % closed_note) if closed_note else ''
    head = ''.join(sobp(k, s, o) for k, s, o, _r in p['so'])
    svc = ''.join(tag(v, extra='margin-right:3px') for v in p['svc'])
    edit = tag(p['edit'], '#ecfdf5', '#047857', 'border:1px solid #a7f3d0') if p.get('edit') else ''
    kpi = ''.join('<div style="border:1px solid #eef0f4;border-radius:10px;padding:10px">'
                  '<div style="font-size:10.5px;color:#6b7280">%s</div>'
                  '<div style="font-size:17px;font-weight:700;color:%s">%s</div></div>' % k
                  for k in (('발급 코드 (B×P)', '#2563eb', p['kpi'][0]), ('실등록 페이지', '#0f766e', p['kpi'][1]),
                            ('편집 심볼', '#047857', p['kpi'][2]), ('코드 종류', '#111827', p['kpi'][3])))
    blocks = ''.join(
        '<div class="row" style="gap:10px;border:1px solid #eef0f4;border-radius:10px;'
        'padding:9px 11px;background:#fafbfc;flex-wrap:wrap;margin-bottom:6px">'
        '<span style="font-size:11px;color:#9ca3af;font-family:ui-monospace,monospace;min-width:18px">%d</span>'
        '%s%s<div style="flex:1"></div>'
        '<span style="font-size:11px;color:#9ca3af;font-family:ui-monospace,monospace">%s</span>'
        '%s%s</div>'
        % (i + 1, sobp(k, s, o, b, pp), role_chip(r) if r else '', d,
           tag(calc, '#eef6ff', '#2563eb'), tag('실등록 %sp' % used, '#ccfbf1', '#0f766e') if used else '')
        for i, (k, s, o, b, pp, r, d, calc, used) in enumerate(p['blocks']))
    return ('<div class="card"><div style="padding:16px">%s'
            '<div class="row" style="gap:8px;flex-wrap:wrap">'
            '<div style="font-size:15px;font-weight:700">%s</div>%s%s%s%s%s</div>'
            '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:14px 0">%s</div>'
            '<div style="font-size:12.5px;font-weight:700;margin-bottom:8px">발급 SOBP 내역 '
            '<span style="color:#9ca3af;font-weight:400">· 어떤 코드가 어떻게 발급되었는지 (조회 전용)</span></div>'
            '<div style="margin-bottom:12px;%s">%s</div>%s'
            '</div></div>'
            % (banner, p['title'], tag(p['cust']),
               tag('종료', '#f3f4f6', '#6b7280', 'font-weight:700') if closed_note else '',
               head, svc, edit, kpi, 'max-height:380px;overflow:hidden' if scroll else '', blocks,
               members_panel(member_sel) if members else ''))


def content(custs, sel_cust, projs, sel_proj=None, detail=None, summary=SUMMARY_ALL, filtered=False,
            pds='전체 코드 종류 (496)', flag='전체', svc='사용 서비스 · 전체', search='', closed_note=None,
            members=False, member_sel=None, scroll=False):
    return (topbar_line(summary, filtered) +
            '<div style="display:grid;grid-template-columns:280px 250px 1fr;gap:12px;align-items:start">%s%s%s</div>'
            % (col_cust(custs, sel_cust, pds, flag, svc, search),
               col_proj(sel_cust, projs, sel_proj),
               col_detail(sel_cust, detail, closed_note, members, member_sel, scroll)))


NAV = [('[✏️ 편집 →]', '클릭', '<code>PRJ-02</code>', '해당 owner의 편집 프로젝트로 이동'),
       ('코드 신규 발급', '이동', '<code>SOB-01</code> → <code>SOB-02</code>',
        '<b>이 화면에서는 발급하지 않는다</b> <code>PC-011</code>'),
       ('고객사 정보·단가 확인', '이동', '<code>MEM-01</code> → <code>MEM-02</code>', ''),
       ('티켓 발급', '이동', '<code>TKT-01</code> App Key / <code>TKT-02</code> N Key', '발급된 코드로 사용 허가 생성')]

PROJ_CARD = [('프로젝트 카드', '표시', '—',
              '1줄 프로젝트명 · 2줄 <b>코드 종류 + S · O 칩</b>(최대 4개, 넘으면 <b>+{n}</b> · 발급이 없으면 <b>미발급</b>) · '
              '확장 언어 그룹 Owner 면 O 칩 옆 <b>[기본] / [확장 {k}]</b> <code>PC-350</code>(역할 미지정 칩은 없앴다 <code>PC-357</code>) · '
              '3줄 사용 서비스 태그 · <b>편집</b> 태그 · <b>공유</b> 태그(공유 코드로 표시된 프로젝트) · 4줄 <b>발급 {n}코드 · {n}블록</b>'),
             ('프로젝트 정렬', '자동', '—', '<b>Owner 오름차순</b>(같으면 Section · 이름) · 발급 없는 프로젝트는 맨 뒤 <code>PC-350</code>')]


def build():
    boards = []

    boards.append((
        'S1', '기본 · 고객사 선택 (프로젝트 미선택)', '기본',
        '좌측 메뉴 [코드 ▸ 코드 프로젝트]로 진입. 실제 구현은 <b>3단 구성</b>이다 — '
        '① <b>고객사 선택</b>(280px) ② <b>프로젝트</b>(250px) ③ <b>발급 구성</b>(나머지). '
        '상단은 KPI 카드가 아니라 <b>요약 한 줄</b>이며 우측에 [초기화]가 있다. '
        '좌측·가운데 목록은 칸 안에서 스크롤된다(여기서는 앞부분만 그렸다).',
        frame('PRJ-01', '코드 프로젝트', content(CUSTS, '신사고-6', [P_SIN]), height=1000),
        [('코드 종류 셀렉트', '선택', '목록·집계 필터', '<b>전체 코드 종류 / PDS2 (Gcode) / PDS3 (Ncode) / PDS4 (S-code) / OID</b> — 항목마다 고객사 수 <code>PC-301</code> — 좌표 속성 기준 <code>PC-032</code> · 옛 IDS = OID 동일 <code>PC-035</code> · 선택 시 프로젝트 선택 해제'),
         ('유형 칩', '클릭', '목록·집계 필터', '<b>전체 / 편집 / 코드발급</b> — 편집 = 편집 데이터·심볼 보유 또는 편집 프로젝트 등록(사용 서비스는 판정에서 뺀다) <code>PC-076</code>'),
         ('사용 서비스', '드롭다운 선택', '목록·집계 필터',
          '<b>사용 서비스 · 전체</b> 기본값 · <b>casterN (편집툴) / 폼솔루션</b> 2종 <code>PC-076</code> · '
          '기준은 <b>고객사의 사용 서비스</b>(<code>MEM-02</code>)'),
         ('고객사 검색', '입력', '즉시 필터링', '업체명으로 검색 · 값이 있으면 <b>×</b>로 해제'),
         ('고객사 항목', '클릭', '② 프로젝트 목록 갱신',
          '부제 = <b>{사용서비스} · 코드 {n}</b>(서비스가 없으면 <b>SDK 연동</b>) + 보유 코드 종류 배지 <b>PDS2 / PDS3 / PDS4 / OID</b> · '
          '확장 언어 슬롯 고객사는 목록에 없다 <code>PC-351</code> (S9)'),
         ] + PROJ_CARD + [
         ('프로젝트 카드', '클릭', 'S2 발급 구성', ''),
         ('[초기화]', '클릭', '확인창', '<b>테스트 데이터를 초기화할까요? (엑셀 시드로 복원)</b>'),
         ('③ 안내', '표시', '—',
          '<b>{고객사} — 가운데에서 프로젝트를 선택하면 어떤 코드가 어떻게 발급되었는지'
          '(SOBP 블록·발급일·코드 수) 확인할 수 있습니다.</b>')] + NAV))

    boards.append((
        'S2', '프로젝트 선택 · 발급 구성', '기본',
        '프로젝트를 고르면 ③에 <b>발급 요약 4종 + 발급 SOBP 내역</b>이 표시된다. '
        '프로젝트와 발급 내역은 <b>조회 전용</b>(수정·삭제 없음 <code>PC-164</code>) — 발급은 <code>SOB-02</code>(Ncode 예약·할당)에서 한다 '
        '<code>PC-011</code>.',
        frame('PRJ-01', '코드 프로젝트', content(CUSTS, '신사고-6', [P_SIN], 0, P_SIN), height=1000),
        [('머리', '표시', '—', '프로젝트명 · 고객사 태그 · <b>코드 종류 + S/O 칩</b> · 사용 서비스 · <b>공유 코드</b>(공유 표시 프로젝트) · '
          '등급(폼솔루션만) · <b>✏️ 편집</b>(편집 실적이 있을 때 · S9)'),
         ('발급 요약 4종', '조회', '—', '발급 코드(B×P) · 실등록 페이지 · 편집 심볼 · 코드 종류(PDS2 · PDS3 · PDS4 · OID 짧은 표기)'),
         ('발급 SOBP 내역', '조회', '—', '블록마다 순번 · <b>코드 종류 S O B P</b> 칩 + 발급일 + '
          '<b>{권}권 × {p}p = {코드}</b> + 실등록이 있으면 <b>실등록 {n}p</b>'),
         ('미발급 프로젝트', '표시', '—', '<b>발급 내역이 없습니다. (미발급)</b>')] + NAV))

    boards.append((
        'S3', '필터 적용 · PDS3 + 편집 + casterN', '필터',
        '필터는 <b>프로젝트 단위</b>로 적용되어 좌측 고객사 목록과 상단 집계가 함께 줄어든다. '
        '필터가 걸리면 요약 꼬리말이 <b>· 필터 적용 (전체 {n}곳 / {n}건)</b>으로 바뀌고 <b>선택한 프로젝트가 해제</b>된다. '
        '이전에 고른 고객사가 결과에 없으면 가운데는 그 고객사의 빈 목록이 된다.',
        frame('PRJ-01', '코드 프로젝트',
              content(CUSTS_F, '신사고-6', [], summary=SUMMARY_F, filtered=True, pds='PDS3 (Ncode) (19)',
                      flag='편집', svc='casterN (편집툴)'), height=940),
        [('코드 종류 셀렉트 · PDS3 (Ncode)', '선택', 'PDS3 보유 고객사만', '프로젝트 선택 해제 · 항목 옆 숫자 = 그 종류로 걸렀을 때 남는 고객사 수 <code>PC-301</code>'),
         ('[편집]', '클릭', '편집 프로젝트만', '편집 데이터·심볼 보유 또는 편집 프로젝트 등록'),
         ('사용 서비스', '선택', '해당 서비스만', ''),
         ('상단 요약', '자동', '재계산', '<b>· 필터 적용 (전체 {n}곳 / {n}건)</b>'),
         ('[전체]', '클릭', 'S1 복귀', '')]))

    boards.append((
        'S4', '공통코드 · 사용 고객사(하위) · 고객사 칩 선택', '분기',
        '<code>P-12</code> — 공통(커먼)코드 대장 프로젝트를 고르면 발급 SOBP 내역 아래에 '
        '<b>사용 고객사(하위) 목록</b>이 보라색 박스로 표시된다. '
        '<code>P-11</code> — 하위 고객사는 별도 화면이 아니라 여기서 확인한다. 고객사 칩을 누르면 '
        '그 고객사가 이 대장 코드 안에서 쓰는 <b>Book 목록과 페이지 합계</b>가 열린다. '
        '발급 SOBP 내역은 높이 380px 안에서 스크롤된다(전체 줄은 S9).',
        frame('PRJ-01', '코드 프로젝트',
              content(CUSTS_COMMON, 'Common-21', [P_COM, P_COM_OID], 0, P_COM, summary=SUMMARY_COMMON,
                      filtered=True, search='common', members=True, member_sel='미래엔영어', scroll=True), height=1120),
        [('사용 고객사 (하위)', '표시', '—', '<b>{n}곳</b> · 공통코드 라벨 <b>{코드명} · {PDS2|PDS3} · S{s}/O{o}</b> · '
          '<b>· 공통(커먼)코드를 함께 쓰는 고객사 · 편집/티켓은 이 대장으로 진행</b>'),
         ('하위 고객사 검색', '입력', '칩 필터', '우측에 <b>{표시}/{전체}</b> · 일치 없음 <b>“{검색어}” 일치하는 하위 고객사가 없습니다.</b>'),
         ('고객사 칩', '클릭', '그 고객사의 사용 SOBP 표시',
          '<b>{고객사} 사용 SOBP {n}권 · {p}p</b> · <b>· 이 대장 코드 {라벨} 내에서 이 고객사가 쓰는 Book</b> · '
          '줄마다 S/O/B 칩 · 교재명 · 페이지 · 다시 누르면 해제'),
         ('개별 Book 기록 없음', '표시', '—', '<b>이 고객사의 개별 Book 사용 기록이 없습니다. (대장 코드 {라벨} 공유)</b>'),
         ('<b>신규</b> 배지', '표시', '—', '시드가 아니라 사용자가 등록한 사용 고객사 칩'),
         ('사용 고객사 없음', '표시', '—', '<b>등록된 사용 고객사가 없습니다.</b>')]))

    # S5 프로젝트 수정 · S6 프로젝트 삭제 — 기능 삭제로 결번 `PC-164`
    #   (S7 · S8 은 Figma 프레임 이름 유지를 위해 번호 그대로)

    boards.append((
        'S7', '검색 결과 없음', '빈 상태',
        '좌측 목록이 비면 <b>결과 없음</b>. 가운데는 이전에 고른 고객사의 목록 — 그 고객사 프로젝트가 필터에 걸리지 않으면 '
        '<b>이 고객사의 프로젝트가 없습니다.</b>',
        frame('PRJ-01', '코드 프로젝트',
              content([], '신사고-6', [], summary=SUMMARY_NONE, filtered=True, search='폼솔루션'), height=760),
        [('좌측 목록', '표시', '—', '<b>결과 없음</b>'),
         ('가운데', '표시', '—', '<b>이 고객사의 프로젝트가 없습니다.</b>'),
         ('× (검색 지우기)', '클릭', '전체 복귀', ''),
         ('[전체] 칩', '클릭', '전체 복귀', '')]))

    hum_note = '사업 정리로 프로젝트 종료 · 동일 코드(S3/O28)를 엠베스트-28 가 이어서 사용'
    boards.append((
        'S8', '프로젝트 종료 고객사', '분기',
        '<code>MEM-02</code> 에서 <b>사업 종료</b>로 바꾼 고객사. 좌측 목록에서 흐려지고 '
        '<b>종료</b> 배지가 붙으며(툴팁 = 종료 사유 · 이관 메모), 상세 위에 회색 배너가 나온다. '
        '<b>코드 발급 이력은 그대로 보관</b>된다. 사용 서비스가 없는 고객사라 서비스 태그는 없다.',
        frame('PRJ-01', '코드 프로젝트',
              content(CUSTS_HUM, 'humedical-28', [P_HUM], 0, P_HUM, summary=SUMMARY_HUM, filtered=True,
                      search='humedical', closed_note=hum_note), height=760),
        [('상세 배너', '표시', '—',
          '<b>🛑 프로젝트 종료 고객사 — 코드 발급 이력만 보관합니다. ({이관 메모})</b>'),
         ('좌측 카드', '표시', '—', '흐려지고 <b>종료</b> 배지 · 툴팁에 사유'),
         ('상세 머리', '표시', '—', '고객사 태그 옆 <b>종료</b> 태그'),
         ('사용 서비스 없음', '표시', '—', '카드 부제는 <b>SDK 연동</b> · 프로젝트 카드 · 상세에 서비스 태그 없음'),
         ('발급 내역', '—', '유지', '조회는 그대로 된다'),
         ('되돌리기', '이동', '<code>MEM-02</code>', '토글을 <b>진행중</b>으로 되돌린다')] + NAV))

    boards.append((
        'S9', '확장 언어 그룹 고객사 · 기본 코드 프로젝트', '분기',
        '고객사 관리에서 <b>확장 언어 그룹</b>을 켠 고객사(Common-21). 옛 확장 슬롯 고객사'
        '(「Common 추가 언어 슬롯-964~983」)는 <b>목록에 나오지 않는다</b> — 「common」으로 찾아도 Common-21 하나 <code>PC-351</code>. '
        '확장 언어 그룹은 <b>고객사당 하나</b>(기본 코드 1개)다 <code>PC-373</code>. 가운데 프로젝트 목록에서는 <b>확장 코드 프로젝트만</b> 빠지고 '
        '기본 코드 · 그룹 밖 단독(전용) 코드 · OID 프로젝트는 그대로 남는다 <code>PC-353</code> <code>PC-357</code> — Common-21 은 코드가 모두 '
        'O21 그룹(기본 O21 · 확장 O964~983)이라 기본 코드 프로젝트 + OID 프로젝트 2건이다. 슬롯 고객사 이름은 어디에도 내지 않는다 '
        '<code>PC-352</code>. 기본 코드 프로젝트를 고르면 발급 SOBP 내역에 <b>그 그룹의 확장 코드만</b> 이어서 나온다 — '
        '<b>[기본] → [확장 1] · [확장 2] …</b> 확장 순서 <code>PC-357</code>(<code>PC-354</code> 의 「나머지 코드 전부 · 칩 없는 코드는 끝에」는 바꿨다 — '
        '그룹 밖 코드는 자기 프로젝트로). '
        '발급 요약 4종은 기본 코드 프로젝트 값 그대로다.',
        frame('PRJ-01', '코드 프로젝트',
              content(CUSTS_COMMON, 'Common-21', [P_COM, P_COM_OID], 0, P_COM, summary=SUMMARY_COMMON,
                      filtered=True, search='common', members=True), height=1400),
        [('고객사 목록', '표시', '—', '슬롯 고객사는 숨김 · 그 프로젝트 코드 수는 그룹 고객사 <b>코드 {n}</b> 에 합산 <code>PC-351</code>'),
         ('프로젝트 목록', '표시', '—', '<b>확장 코드 프로젝트만 뺀다</b> — 기본 코드 · 그룹 밖 단독(전용) 코드 · OID 는 그대로 '
          '<code>PC-353</code> <code>PC-357</code>'),
         ('O 칩 옆 역할 칩', '표시', '—', '<b>[기본]</b> · <b>[확장 {k}]</b> — 툴팁 '
          '<b>{그룹} 기본 Owner · 슬롯 1~4</b> / <b>{그룹} · 기본 O{n} 의 확장 언어 {k} · 슬롯 {a}~{b}</b> · 그룹 밖 코드는 칩 없음 '
          '(역할 미지정 칩은 없앴다) <code>PC-350</code> <code>PC-357</code>'),
         ('프로젝트 제목', '표시', '—', '<b>「{그룹 고객사} 코드발급」</b> — 슬롯 고객사 이름은 내지 않는다 <code>PC-352</code>'),
         ('발급 SOBP 내역', '표시', '—', '그룹의 기본 코드 프로젝트(OID 제외)면 기본 코드 블록 다음에 <b>그 그룹의 확장 코드만</b>'
          '(슬롯 고객사로 할당된 확장 코드 포함) — <b>[확장 k] 순</b> · 그룹 밖 코드는 여기 나오지 않는다(자기 프로젝트) <code>PC-357</code>'),
         ('✏️ 편집 {n}심볼 →', '클릭', '<code>PRJ-02</code>', '편집 실적이 있는 프로젝트 · 실적이 다른 owner 에 귀속되면 <b>✏️ 편집 → {귀속 대상}</b>'),
         ('사용 고객사 (하위)', '표시', '—', '공통코드 대장이면 아래에 보라 박스(S4)'),
         ('그룹 · 확장 순서 정하기', '이동', '<code>MEM-02</code>', '고객사 관리 ▸ 공통코드 · 확장 언어 — 기본 코드를 골라 그룹을 만들고 확장 순서를 정한다 · 이 화면에서는 고칠 수 없다')] + NAV))

    intro = ('<b>VIEW 용도</b> — <b>고객사별로 어떤 코드(SOBP)를 얼마나 발급받았는지</b>를 조회·검색하는 화면. '
             '코드 발급 자체는 <code>SOB-02</code>에서 이뤄지므로 '
             '<b>이 화면에는 프로젝트 등록 기능이 없다</b>(<b>조회·검색 전용</b> — 프로젝트 수정·삭제도 없다 <code>PC-164</code>). '
             'SOBP 를 고객사에 매핑한 뒤 <b>코드를 회수하는 기능은 서비스에 없다</b> <code>PC-165</code>. '
             '실제 구현은 <b>고객사 선택 → 프로젝트 → 발급 구성</b> 3단이며, '
             '좌측에 <b>코드 종류(PDS2 · PDS3 · PDS4 · OID) · 유형(편집/코드발급) · 사용 서비스</b> 3중 필터가 있다. '
             '확장 언어 그룹의 확장 코드는 따로 보이지 않고 그 그룹 기본 코드 프로젝트 안에 보인다(S9). 그림의 값은 로컬 앱 시드 데이터 화면에서 옮겼다 (2026-11-23).')
    return page(CODE, NAME, PRD, intro, boards)
