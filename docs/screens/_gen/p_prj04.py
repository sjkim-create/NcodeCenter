# -*- coding: utf-8 -*-
"""PRJ-04 교재(책) 등록·수정 — 모달이 아니라 별도 페이지 2개.

  추가  /projects/editing/{owner}/book/new
  수정  /projects/editing/{owner}/book/{idx}
편집 상세(PRJ-03)의 목록·KPI·필터를 감추고 이 폼만 보여준다.
고객사 머리말은 유지되어 어느 고객사의 교재인지 맥락이 남는다.
"""
from shell import page, frame
from shell import sel, field

CODE, NAME = 'PRJ-04', '교재(책) 등록·수정'
PRD = 'docs/prd/PRJ-04_교재(책) 등록·수정.md'

# lib/pricing.ts RATE_ITEMS — (항목, 기본단가). 소리펜 14 / 필기펜 5
# 0번은 [Ncode 적용] — 적용비를 이 수량으로 계산한다 `PC-085`
SOUND_Q = (('Ncode 적용', 500, 240), ('Ncode 편집(기본)', 1000, 1240), ('Compound 2언어', 1300, 0),
           ('Compound 3언어', 1600, 0), ('Compound 4언어', 1900, 0),
           ('Compound 5언어', 2200, 0), ('Compound 6언어', 2500, 0),
           ('Compound 7언어', 2800, 0), ('Compound 8언어', 3100, 0),
           ('슬롯전환', 3000, 0), ('그룹재생', 5000, 0), ('게임', 50000, 0),
           ('프롬프트 편집', 50000, 0), ('발음평가 편집', 50000, 0))
# 필기펜 심볼 입력 3항목 `PC-084`
PEN_Q = (('Ncode 적용', 500, 0), ('기본 편집', 1000, 0), ('Custom', 1500, 0),
         ('노트서버 업로드', 10000, 0))

MEMOS = (('2', '처리', '2026-08-20 14:12', '김순정', '2차 교정 반영 · 심볼 12개 추가'),
         ('1', '요청', '2026-08-18 09:30', '박지훈', '3권 게임 기능 2건 추가 요청'))


def status_row(st='진행중', locked=False, need_date=False, released=False, need_codes=None):
    chips = ''.join('<span class="chip%s">%s</span>' % (' on' if s == st else '', s)
                    for s in ('진행중', '완료', '보류'))
    note = ''
    if locked:
        note = ('<div class="toast warn" style="margin-top:10px">🔒 완료 처리되어 내용이 잠겼습니다. '
                '수정하려면 진행중으로 변경하세요.</div>')
    elif need_date:
        # 그룹 기본 코드 교재는 비어 있는 코드를 붙인다(3개까지 · 나머지 「외 {k}개」) `PC-359` `PC-366`
        note = ('<div class="inline-err" style="margin-top:8px">'
                '※ 완료하려면 ncp2 최종수정 날짜가 필요합니다%s.</div>'
                % (' — 비어 있는 코드 %s' % need_codes if need_codes else ''))
    if released:
        note += ('<div style="font-size:11.5px;color:#6b7280;margin-top:8px"><b style="color:#374151">ncp2 최종수정 이력</b>'
                 '<div style="font-family:ui-monospace,monospace;margin-top:2px">· 2026-08-16 <span style="color:#9ca3af">(완료 해제 2026-08-24 10:05 · 김순정)</span></div></div>')
    return ('<div class="card"><div class="bd"><div class="row" style="gap:10px">'
            '<div class="lbl" style="margin:0">진행 상태</div>'
            '<div class="row" style="gap:5px">%s</div></div>%s</div></div>'
            % (chips, note))


# 확장 언어 그룹 — Common-21 (PDS2 · 기본 S3/O21 · 확장 O964~983) `PC-327` `PC-359`
#   Owner 마다 언어 슬롯 4칸 — 기본 1~4 · 확장 k 는 {4k+1}~{4k+4} · 빈 칸은 「{번호} 비어 있음」 · PRD §4.2.1
#   교재에는 그룹 확장 코드 중 **고른 것만** 같은 Book 으로 붙는다 `PC-366` (옛 [+ 슬롯] 체크 목록 `PC-327` · 모두 자동 `PC-359` 폐지)
EXT_ALL = tuple(range(964, 984))          # 그룹 확장 순서 = 확장 1 · 2 · …
SLOT_LANG = {21: ('한국어', '영어', '중국어', '일본어'),
             964: ('베트남어', '러시아어', '몽골어', '캄보디아어(크메르어)'),
             965: ('스리랑카어', '필리핀어(따갈로그어)', '', '')}
EXT_TAKEN = {966: '충남교육청 · 어서와 한국 생활은 처음이지 1'}   # 다른 고객사 교재가 그 Book 을 쓰는 코드(그림 예시)
SUB_CU = '전북교육청'   # 하위 고객사 예시 — Common-21 코드를 쓰는 사용 고객사 `PC-368`


def ext_k(o):
    return EXT_ALL.index(o) + 1


def slots(o):
    start = 1 if o == 21 else 4 * ext_k(o) + 1
    return [(start + i, x) for i, x in enumerate(SLOT_LANG.get(o, ('', '', '', '')))]


def lang_text(o):
    t = ['%d %s' % (s, x) for s, x in slots(o) if x]
    return ' · '.join(t) if t else '지정된 언어 없음'


def ext_select(picked=(964, 965), open_=False, taken=None):
    """확장 언어 코드 칸 — 셀렉트(복수 선택) + 셀렉트 아래 🌐 O{n} ✕ 칩 `PC-366`
    taken = 고른 뒤 다른 고객사 교재가 그 Book 을 쓰게 된 코드(칩이 빨갛게 「사용 중」)"""
    chips = ''
    for o in picked:
        bad = (o == taken)
        chips += ('<span title="확장 %d · S3/O%d/B265 — %s" style="display:inline-flex;align-items:center;gap:4px;'
                  'font-size:11px;border-radius:5px;padding:2px 7px;font-weight:700;white-space:nowrap;'
                  'background:%s;color:%s">🌐 O%d%s<span style="color:#dc2626;font-weight:400">✕</span></span>'
                  % (ext_k(o), o, lang_text(o), '#fef2f2' if bad else '#ecfeff',
                     '#b91c1c' if bad else '#0e7490', o, ' 사용 중' if bad else ''))
    if not picked:
        chips = '<span style="font-size:12px;color:#9ca3af">선택한 확장 언어 코드 없음</span>'
    left = [o for o in EXT_ALL if o not in picked]
    free = [o for o in left if o not in EXT_TAKEN]
    box = ('<div class="inp" style="display:flex;align-items:center;justify-content:space-between;background:#fff%s">'
           '＋ 확장 언어 코드 추가…<span style="color:#9ca3af;font-size:10px">▾</span></div>'
           % (';border-color:#2563eb' if open_ else ''))
    pop = ''
    if open_:
        it = 'padding:5px 10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'
        opts = '<div style="%s;background:#2563eb;color:#fff">＋ 확장 언어 코드 추가…</div>' % it
        if len(free) > 1:
            opts += '<div style="%s;color:#111827;font-weight:700">모두 추가 (%d개)</div>' % (it, len(free))
        for o in left[:6]:
            tk = o in EXT_TAKEN
            opts += ('<div style="%s;color:%s">O%d · 확장 %d — %s%s</div>'
                     % (it, '#c0c6cf' if tk else '#111827', o, ext_k(o), lang_text(o), ' (사용 중)' if tk else ''))
        opts += ('<div style="padding:3px 10px;color:#9ca3af;font-size:11px">⋯ O%d ~ O%d</div>'
                 % (left[6], EXT_ALL[-1]))
        pop = ('<div style="position:absolute;z-index:30;top:36px;left:0;width:400px;background:#fff;'
               'border:1px solid #cbd5e1;border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,.14);'
               'font-size:12px;overflow:hidden">%s</div>' % opts)
    return ('<div style="%s"><div style="position:relative">%s%s</div>'
            '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">%s</div></div>'
            % (SUB5, box, pop, chips))


def slot_block(picked):
    """[사용할 코드] 칸 아래 「언어 슬롯 · 코드 {n}개」 — 기본 + 고른 확장 코드마다 한 줄 · 슬롯 4칸 `PC-366`"""
    if not picked:
        return ''

    def line(o, lab, base):
        cells = ''.join('<span class="tag" style="font-size:11px;border:1px solid #eef0f4;background:%s;color:%s">%d %s</span>'
                        % ('#fff' if x else '#f9fafb', '#374151' if x else '#c0c6cf', s, x or '비어 있음')
                        for s, x in slots(o))
        return ('<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12px">'
                '<span style="min-width:96px;font-weight:700;color:%s">%s · O%d</span>%s</div>'
                % ('#1d4ed8' if base else '#0e7490', lab, o, cells))
    return ('<div style="margin-top:10px;padding:8px 10px;border-radius:8px;border:1px solid #a5f3fc;background:#f0fdff;'
            'display:flex;flex-direction:column;gap:5px">'
            '<div style="font-size:11.5px;font-weight:700;color:#0e7490">언어 슬롯 · 코드 %d개</div>%s%s</div>'
            % (1 + len(picked), line(21, '기본', True),
               ''.join(line(o, '확장 %d' % ext_k(o), False) for o in picked)))


def coord_ext(picked=(964, 965), open_=False, taken=None, mode='edit', so_open=False):
    """그룹 기본 코드 교재의 [사용할 코드] 한 줄 — 할당된 S/O · Book · 코드 종류 · 확장 언어 코드 · 사용 고객사
    + 아래 언어 슬롯 줄 `PC-359` `PC-366`. mode='new' 는 하위 고객사로 들어온 교재 추가(S17)"""
    if mode == 'new':
        pop = ''
        if so_open:
            # 확장 코드는 「· 확장 언어 (기본 O{n})」로 보이고 고를 수 없다 `PC-359`
            it = 'padding:5px 10px;white-space:nowrap'
            pop = ('<div style="position:absolute;z-index:30;top:36px;left:0;width:300px;background:#fff;'
                   'border:1px solid #cbd5e1;border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,.14);font-size:12px;overflow:hidden">'
                   '<div style="%s;background:#2563eb;color:#fff">S3 / O21 · 기본 · 공유</div>'
                   '<div style="%s;color:#c0c6cf">S3 / O964 · 확장 언어 (기본 O21) · 공유</div>'
                   '<div style="%s;color:#c0c6cf">S3 / O965 · 확장 언어 (기본 O21) · 공유</div>'
                   '<div style="padding:3px 10px;color:#9ca3af;font-size:11px">⋯ O966 ~ O983 (확장 언어)</div></div>'
                   % (it, it, it))
        so = field('할당된 S / O (선택)', '<div style="position:relative">%s%s</div>' % (sel('S3 / O21 · 기본 · 공유'), pop))
        book = field('Book (사용 가능 번호)', sel('B266'))
        kind = field('코드 종류', sel('PDS2'))
    else:
        so = field('할당된 S / O (수정 불가)',
                   '<div class="inp" style="background:#fff;display:flex;align-items:center;gap:6px">'
                   '<b style="font-family:ui-monospace,monospace">S3 / O21</b>'
                   '<span style="font-size:10px;background:#dbeafe;color:#1d4ed8;border-radius:5px;padding:1px 6px;font-weight:700">기본</span>'
                   '<span style="color:#9ca3af;font-size:11px">할당된 코드</span></div>')
        book = field('Book (수정 불가)', '<div class="inp" style="background:#f9fafb"><b style="font-family:ui-monospace,monospace">B265</b> '
                     '<span style="color:#9ca3af;font-size:11px">등록된 코드</span></div>')
        kind = field('코드 종류', '<div class="inp" style="background:#f3f4f6;color:#6b7280">PDS2</div>')
    cells = (so + book + kind
             + field('확장 언어 코드 · 복수 선택 (%d / %d개)' % (len(picked), len(EXT_ALL)), ext_select(picked, open_, taken))
             + field('사용 고객사 (서비스 티켓)',
                     '<div class="inp ro"><span style="font-size:11px;background:#f3e8ff;color:#7e22ce;'
                     'border-radius:5px;padding:2px 7px;font-weight:700">%s</span></div>' % SUB_CU))
    return ('<div class="card" style="border-color:#e9d5ff;background:#faf5ff"><div class="hd" style="display:flex;align-items:center;gap:8px;color:#6b21a8">사용할 코드'
            '<span style="font-size:11px;background:#a855f7;color:#fff;border-radius:5px;padding:2px 7px;font-weight:700">공유 코드 · 여러 고객사 사용</span></div><div class="bd">'
            '<div style="display:grid;grid-template-columns:1.3fr .9fr .9fr 1.6fr 1.1fr;gap:10px;'
            'align-items:start">%s</div>%s'
            '<div style="font-size:11.5px;color:#6b21a8;margin-top:8px">여러 고객사가 Book 번호만 나눠 쓰는 코드입니다 — '
            '사용 고객사는 <b>이 Book 에 서비스 티켓을 받은 고객사</b>로 표시됩니다.</div></div></div>'
            % (cells, slot_block(picked)))


def coord(mode='edit', share=False, sub_err=False):
    # mode='dup' — [복제]로 연 등록 폼: 코드(S/O·Book·종류)를 **원본에 고정**한다 `PC-112`
    dup = (mode == 'dup')
    so = ('<div class="inp" style="background:#fff"><b style="font-family:ui-monospace,monospace">%s</b> '
          '<span style="color:#9ca3af;font-size:11px">할당된 코드</span></div>' % ('S0 / O10' if dup else 'S3 / O17')
          if mode in ('dup', 'edit') else sel('S3 / O17'))
    # 좌표만 보여 준다 `PC-083` — 종류(N·G)는 뒤의 [코드 종류]에서 고른다
    hint = ('<b>복제 원본의 코드</b> — 바꿀 수 없다 <code>PC-112</code>' if dup
            else '수정 모드에서는 <b>변경 불가</b> · 종류 배지는 붙이지 않는다 <code>PC-083</code>'
            if mode == 'edit'
            else '할당된 S/O가 여러 개면 선택 · <b>좌표만</b> 나온다 <code>PC-083</code>')
    sub = ''
    if share:
        # 고르지 않는다 — 이 S/O/B 를 덮는 서비스 티켓의 고객사가 상태값으로 뜬다 `PC-289`
        #   sub_err = 덮는 티켓이 없는 경우(티켓 없음)
        badge = ('<span style="color:#9ca3af">티켓 없음</span>' if sub_err else
                 '<span style="font-size:11px;background:#f3e8ff;color:#7e22ce;border-radius:5px;'
                 'padding:2px 7px;font-weight:700">아들과딸</span>')
        sub = field('사용 고객사 (서비스 티켓)', '<div class="inp ro">%s</div>' % badge, False, None,
                    '<b>고르지 않는다</b> — 이 S/O/B 를 덮는 <b>서비스 티켓의 고객사</b>(교재 소유 고객사 <code>PC-291</code>) '
                    '· 만료 · 대기면 이름 뒤에 상태 · 티켓이 없으면 등록된 이름을 흐리게 + <b>⚠ 티켓 필요</b> '
                    '<code>PC-290</code> · 그것도 없으면 <b>티켓 없음</b> <code>PC-289</code>')
    # 코드 종류는 **Book 다음**에 온다 `PC-054`
    if dup:
        kind_f = field('코드 종류 (수정 불가)',
                       '<div class="inp ro">PDS2</div>', True, None,
                       '복제는 <b>원본과 같은 코드</b>다')
        book_f = field('Book (수정 불가)',
                       '<div class="inp ro">B1108 '
                       '<span style="color:#9ca3af;font-size:11px">복제 원본의 코드</span></div>',
                       True, None, '같은 코드에 작업물을 하나 더 만드는 것이라 바꾸지 않는다')
    elif mode == 'edit':
        # 수정 모드 — Book 은 등록된 코드로 고정 · 코드 종류 셀렉트 잠김 `PC-112`
        kind_f = field('코드 종류', '<div class="inp" style="background:#f3f4f6;color:#6b7280">PDS2 <span style="color:#9ca3af;font-size:10px">▾</span></div>', True, None,
                       '수정 모드에서는 <b>잠김</b>')
        book_f = field('Book (수정 불가)', '<div class="inp" style="background:#f9fafb"><b style="font-family:ui-monospace,monospace">B431</b> '
                       '<span style="color:#9ca3af;font-size:11px">등록된 코드</span></div>', True, None, '등록된 코드라 바꾸지 않는다')
    else:
        kind_f = field('코드 종류', sel('PDS3'), True, None,
                       '<b>PDS2 · PDS3 · PDS4 · OID</b> 중 선택 <code>PC-052</code>')
        book_f = field('Book (사용 가능 번호)', sel('B431'), True, None,
                       '<b>이미 쓴 Book 은 나오지 않는다</b> <code>PC-112</code> · '
                       '입력칸에 번호를 <b>바로 칠 수 있고</b>, 목록 아래 <b>＋ 100개 더 보기</b> 를 눌러도 '
                       '<b>셀렉트가 닫히지 않는다</b> <code>PC-054</code> <code>PC-057</code>')
    banner = ''
    if dup:
        banner = ('<div class="toast" style="margin-bottom:10px;background:#fff7ed;'
                  'border-color:#fed7aa;color:#c2410c">복제 · 코드 S0/O10/B1108 고정 — '
                  '기본 정보·심볼 입력은 초기화됨 · casterN 연동 항목은 새 작업으로 채워집니다</div>')   # `PC-282`
    tagc = ('<span style="font-size:11px;background:#a855f7;color:#fff;border-radius:5px;padding:2px 7px;font-weight:700">공유 코드 · 여러 고객사 사용</span>'
            if share else
            '<span style="font-size:11px;background:#eef6ff;color:#2563eb;border-radius:5px;padding:2px 7px;font-weight:700">전용 코드 · %s</span>'
            % ('교원구몬-10' if dup else '웅진씽크빅'))
    note = ('<div style="font-size:11.5px;margin-top:8px;color:#6b21a8">여러 고객사가 Book 번호만 나눠 쓰는 코드입니다 — 사용 고객사는 '
            '<b>이 Book 에 서비스 티켓을 받은 고객사</b>로 표시됩니다.</div>' if share else
            '<div style="font-size:11.5px;margin-top:8px;color:#6b7280">이 S/O는 %s 전용입니다. 별도 고객사 입력이 필요 없습니다.</div>'
            % ('교원구몬-10' if dup else '웅진씽크빅'))
    lab = '할당된 S / O (수정 불가)' if mode in ('dup', 'edit') else '할당된 S / O (선택)'
    return ('<div class="card" style="border-color:%s;background:%s"><div class="hd" style="display:flex;align-items:center;gap:8px;color:%s">사용할 코드%s</div><div class="bd">%s'
            '<div class="g3">%s%s%s</div>'
            '%s%s</div></div>'
            % ('#e9d5ff' if share else '#bfdbfe', '#faf5ff' if share else '#f5f9ff', '#6b21a8' if share else '#1e3a8a', tagc, banner,
               field(lab, so, True, None, hint), book_f, kind_f,
               ('<div class="g3" style="margin-top:10px">%s</div>' % sub) if sub else '', note))


# 칩이 붙는 셀렉트 — 2칸 폭을 셀렉트가 다 쓰고 칩은 **아래**로 `PC-278`
#   (옛 「셀렉트 2칸 · 칩 3칸」 `PC-099` 폐기 — 네 항목을 한 줄에 넣으려면 칩을 옆에 둘 폭이 없다)
SUB5 = 'display:flex;flex-direction:column;gap:6px'


def sel_chips(placeholder, chips):
    return ('<div style="%s">%s'
            '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">%s</div></div>'
            % (SUB5, sel(placeholder), chips))


def info(empty=False, mod_date=True, title='범블비 잉글리시 전집 1권'):
    def v(x, ph=False):
        return '<div class="inp%s">%s</div>' % (' ph' if ph else '', x)
    e = empty
    # 발급인 · 펜 모델 · 타입 · 편집 방식 — 교재명 다음 **한 줄** (1 · 2 · 1 · 2칸) `PC-278`
    #   발급인이 앞 `PC-096` · 항목명은 **위** `PC-097` · 고른 값(칩)은 셀렉트 **아래** `PC-278`
    pen_models = ('<div style="display:grid;'
                  'grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;'
                  'margin-top:10px;align-items:start">%s'
                  '<div style="grid-column:span 2">%s</div>'
                  % (field('발급인', sel('김순정'), False, None,
                           '코드 할당자·사용자 명단에서 선택(마우스를 올리면 설명)'),
                     # 선택지는 [타입]과 같은 구분의 모델만 · 대표모델별 묶음 · 직접 추가 없음 `PC-325`
                     field('펜 모델 · 복수 선택',
                           sel_chips('＋ 소리펜 펜 모델 추가…',
                                     '<span class="chip on">NSP-C90-KK ✕</span>'
                                     '<span class="chip on">NSP-C91-KK ✕</span>'), False, None,
                           '<b>[타입]과 같은 구분의 모델만</b> · <b>대표모델별로 묶어</b> 보여 준다 '
                           '<code>PC-325</code> · 고르면 <b>아래에 칩</b>으로 쌓이고 <b>✕</b> 로 뺀다 · '
                           '미선택이면 <b>선택된 펜 모델 없음</b>. '
                           '목록은 <b>데이터 파일에서 직접 관리</b> — 화면에서 직접 추가하지 않는다 '
                           '(<code>PC-100</code> · <code>PC-101</code> 폐지)')))
    # 아래 세 행은 **같은 6열 격자** — 시작 열이 맞아야 화면 구도가 깨지지 않는다 `PC-098`
    #   (1fr 은 내용에 따라 열이 늘어나므로 minmax(0,1fr) 로 고정)
    g6 = 'display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin-top:10px'
    # 첫 줄은 **교재명만**(2칸) — 연동이 NPROJ 타이틀(없으면 파일명)로 채우고 여기서 고칠 수 있다 `PC-284`
    #   ncp2 파일명 · 크기 · 최종수정은 아래 [casterN 연동] 묶음(읽기 전용)으로 옮겼다
    tmpl = ('<div class="card"><div class="hd">기본 정보</div><div class="bd">'
            '<div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px">'
            '<div style="grid-column:span 2">%s</div></div>%s'
            '%s<div style="grid-column:span 2">%s</div></div>'
            '<div style="' + g6 + '">%s%s</div>'
            '</div></div>')
    return (tmpl
            % (field('교재명', v('교재명 입력' if e else title, e),
                     False, None, '연동이 <b>NPROJ 타이틀 → 없으면 NPROJ 파일명</b>으로 채우고 <b>여기서 고칠 수 있다</b> '
                     '(이후 전송에서 바꾸지 않는다) <code>PC-284</code> · 목록·검색에 표시'),
               pen_models,
               field('타입', sel('소리펜'), False, None,
                     '<b>소리펜 · 필기펜 2종</b> <code>PC-086</code> — 적용비·심볼 단가의 펜 구분'),
               # 편집 방식은 타입 바로 옆 · 그 타입의 항목만 `PC-087`
               field('편집 방식 · 복수 선택',
                     sel_chips('＋ 편집방식 선택…',
                               '<span class="chip on">소리펜_기본 ✕</span>'
                               '<span class="chip on">소리펜_멀티터치 ✕</span>'), False, None,
                     '소리펜 12종 / 필기펜 7종 + <b>기능 없음</b>(공통) <code>PC-087</code> — '
                     '타입을 바꾸면 그 타입에 없는 것은 떨어진다 · 그 타입의 항목만(마우스를 올리면 설명)'),
               field('Start Page', v('0'), False, None, '0 이상 · 연동: NPROJ 시작 페이지 <code>PC-284</code>'),
               field('Total Page', v('0' if e else '48'), False, None,
                     '<b>직접 입력</b> · <b>목록의 페이지 항목</b>에 반영된다 <code>PC-089</code>. '
                     '<b>청구액과는 무관</b> — 적용비는 [Ncode 적용] 수량으로 계산한다 '
                     '<code>PC-085</code>'),
               ))


CASTER_TIP = ('casterN 에서 ncp2 를 내보내면 그때 지정한 파일명이 <b>ncp2 파일명</b>으로 채워집니다(목록의 NCP2명). '
              '연동 전에는 <b>직접 등록</b>할 수 있습니다. 직접 넣은 칸에는 「직접」이 붙고, casterN 에서 값이 들어오면 '
              '<b>자동 값으로 바뀝니다</b>. 같은 코드 · 같은 ncp2 파일명으로 다시 들어오면 이 교재가 최신 값으로 바뀝니다.')

# casterN 연동 5칸 — 한 줄(2 · 1 · 1 · 1 · 1칸) `PC-369` (프로젝트명 (.nproj) 입력란 삭제 — 받은 값은 데이터에 남는다)
#   (키, 항목명, 칸 수, 칸 아래 설명)
CN_FIELDS = (('f', 'ncp2 파일명', 2, 'ncp2 <b>내보내기 때 지정한 파일명</b> · 목록의 NCP2명'),
             ('bytes', 'ncp2 파일 크기 (byte)', 1, '저장 · 수정 때마다 갱신'),
             ('nmod', 'ncp2 최종수정 (완료 필수)', 1, '<b>완료 처리의 선행 조건</b>'),
             ('src', '편집 유형', 1, '유입 경로'),
             ('d', '최초 등록일', 1, '첫 생성 요청 · 옛 발급일자'))
CN_VALS = {'f': 'BUMBLEBEE_ENG_01', 'bytes': '109,316,656', 'nmod': '2019-08-16',
           'src': 'casterN 마스터 계정', 'd': '2019-04-11'}


def caster(empty=False, mod_date=True, tip=False, proj='BUMBLEBEE_ENG_01', tabs=None, manual=(), vals=None):
    """casterN 연동 — 자동으로 채워지지만 **직접 등록도 된다** · 자동 값이 우선 `PC-282` `PC-284` `PC-361`
    tabs  = 그룹 기본 코드 교재의 코드별 탭 [(이름, Owner, 최종수정 있음)] — 첫 탭이 열린 상태 `PC-359` `PC-366`
    manual = 직접 넣은 칸(항목명 뒤 「· 직접」) · vals = 칸 값 덮어쓰기(None = 미연동)"""
    v = {} if empty else dict(CN_VALS, f=proj)
    if not mod_date:
        v.pop('nmod', None)
    v.update(vals or {})

    def box(key):
        x = v.get(key)
        man = key in manual
        st = ('border-color:#fcd34d;background:#fffdf5;' if man else 'background:#fff;') + \
             ('' if key == 'src' else 'font-family:ui-monospace,monospace;')
        if key == 'src':
            return ('<div class="inp%s" style="%sdisplay:flex;align-items:center;justify-content:space-between">'
                    '%s<span style="color:#9ca3af;font-size:10px">▾</span></div>'
                    % ('' if x else ' ph', st, x or '미연동'))
        return '<div class="inp%s" style="%s">%s</div>' % ('' if x else ' ph', st, x or '미연동')
    bubble = ''
    if tip:
        bubble = ('<div style="position:absolute;top:calc(100%% + 8px);left:-10px;z-index:5;width:360px;'
                  'background:#1f2937;color:#f9fafb;border-radius:10px;padding:10px 14px;font-size:12.5px;'
                  'line-height:1.6;font-weight:400">%s</div>' % CASTER_TIP)
    head = ('<div class="hd" style="display:flex;align-items:center;gap:6px">casterN 연동'
            '<span style="font-size:10.5px;background:#f3f4f6;color:#6b7280;border-radius:5px;'
            'padding:2px 7px;font-weight:700">자동 우선</span>%s'
            '<span style="position:relative;display:inline-flex"><span style="display:inline-grid;'
            'place-items:center;width:20px;height:20px;border-radius:999px;color:%s;background:%s;'
            'font-size:12px">ⓘ</span>%s</span></div>'
            % ('<span style="font-size:11.5px;color:#0e7490;font-weight:400">코드 %d개 · 코드마다 등록</span>' % len(tabs)
               if tabs else '',
               '#2563eb' if tip else '#6b7280', '#eef6ff' if tip else 'transparent', bubble))
    tabrow = ''
    if tabs:
        tabrow = ('<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px;border-bottom:1px solid #eef0f4;padding-bottom:6px">%s</div>'
                  % ''.join('<span style="font-size:12px;padding:4px 10px;border-radius:7px;border:1px solid %s;background:%s;color:%s;font-weight:%s">'
                            '%s · O%d%s</span>'
                            % ('#93c5fd' if i == 0 else '#e5e7eb', '#eef6ff' if i == 0 else '#fff',
                               '#2563eb' if i == 0 else '#374151', '700' if i == 0 else '400', lab, o,
                               '<span style="color:#16a34a;margin-left:4px">✓</span>' if done else '')
                            for i, (lab, o, done) in enumerate(tabs)))
    cells = ''.join('<div style="grid-column:span %d">%s</div>'
                    % (span, field(lab + (' · 직접' if key in manual else ''), box(key), False, None, hint))
                    for key, lab, span, hint in CN_FIELDS)
    return ('<div class="card">%s<div class="bd">%s'
            '<div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px">%s</div>'
            '</div></div>' % (head, tabrow, cells))


def qty(pen='소리펜', cmp=None):
    """소리펜(좌 1.6fr · 4열 15칸) / 필기펜(우 1fr · 2열 4칸).

    두 묶음이 늘 함께 보이지만 **[타입]이 정하는 쪽만 활성**이다 `PC-091` —
    반대쪽은 흐리게(잠김) 그리고 제목에 [잠김] 배지가 붙는다.
    cmp = 그룹 기본 코드 교재의 Compound 상한 — (기본 + 고른 확장 코드 수) × 4 `PC-367`
          상한보다 큰 칸은 감추고 9언어 이상은 8언어 뒤에 이어 붙인다(단가 300원씩 · 임시) `PC-359`
    """
    s_items = SOUND_Q
    s_extra = ''
    if cmp is not None:
        s_items = []
        for it in SOUND_Q:
            n = int(it[0].split()[1].replace('언어', '')) if it[0].startswith('Compound ') else 0
            if n > cmp:
                continue
            s_items.append(it)
            if it[0] == 'Compound 8언어':
                s_items += [('Compound %d언어' % n2, 3100 + 300 * (n2 - 8), 0) for n2 in range(9, cmp + 1)]
        s_extra = ('<span style="font-size:11.5px;color:#0e7490;font-weight:400;margin-left:8px">'
                   '🌐 Compound %d언어까지</span>' % cmp)

    def block(title, items, cols, grow, on=True, extra=''):
        # 잠긴 묶음 — 입력칸이 회색이고 글자도 흐리다 `PC-094`
        icss = ('padding:5px 8px;font-size:12px' if on
                else 'padding:5px 8px;font-size:12px;background:#f3f4f6;color:#9ca3af')
        lcss = ('font-size:10.5px' if on else 'font-size:10.5px;color:#c0c6d0')
        cells = ''.join(
            '<div class="fld"><span class="lbl" style="%s">%s</span>'
            '<div class="inp" style="%s">%d</div></div>'
            % (lcss, lab, icss, qv) for lab, _u, qv in items)
        lock = ('' if on else
                '<span class="tag" style="margin-left:6px;background:#f3f4f6;color:#9ca3af">'
                '잠김</span>')
        return ('<div class="card" style="flex:%s;min-width:0;opacity:%s"><div class="bd">'
                '<div style="font-size:12px;font-weight:700;color:%s;margin-bottom:8px">'
                '%s%s%s</div>'
                '<div style="display:grid;grid-template-columns:repeat(%d,1fr);gap:8px">%s</div>'
                '</div></div>'
                % (grow, '1' if on else '.55', '#374151' if on else '#9ca3af',
                   title, lock, extra, cols, cells))
    return ('<div style="display:flex;gap:12px;align-items:stretch">%s%s</div>'
            '<div style="font-size:11.5px;color:#6b7280;line-height:1.7;margin-top:8px">'
            '<b>[타입]이 정하는 쪽만 입력</b>합니다 <code>PC-091</code> — 반대쪽 묶음은 '
            '<b>잠김</b>(흐리게)이고 타입을 바꾸면 열립니다. '
            '<b>Ncode 적용</b>은 <b>적용비 계산</b>에 쓰는 수량이며 <code>PC-085</code> '
            '기본 정보의 <b>[Total Page]</b> 와는 <b>서로 물리지 않습니다</b> <code>PC-089</code>. '
            '단가 정본은 정책 <code>P-16</code>, 고객사별 단가는 '
            '<code>MEM-02</code> 에서 지정합니다. '
            '필기펜은 <b>Ncode 적용 · 기본 편집 · Custom · 노트서버 업로드</b> 4항목 <code>PC-084</code> <code>PC-085</code>.</div>'
            % (block('소리펜 심볼 입력', s_items, 4, '1.6', pen == '소리펜', s_extra),
               block('필기펜 심볼 입력', PEN_Q, 2, '1', pen != '소리펜')))


def totals(pen='소리펜'):
    """심볼 입력 아래 파란 합산 줄 — 편집량 + 그 자리 정산."""
    s_sum, p_sum = (1240, 0) if pen == '소리펜' else (0, 726)
    pg = 48 if pen == '소리펜' else 40
    tot = s_sum + p_sum
    # 적용비 = [Ncode 적용] 입력 수량 × 단가 `PC-085` (Total Page 로 계산하지 않는다)
    s_pg, w_pg = (pg, 0) if pen == '소리펜' else (0, pg)
    page_amt = (s_pg + w_pg) * 500
    sym_amt = tot * 1000
    return ('<div class="card" style="background:#f5f9ff;border-color:#bfdbfe">'
            '<div class="bd">'
            '<div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap">'
            '<span style="font-size:13px">Ncode 적용 수 '
            '<b style="color:#2563eb;font-size:17px">%d</b>'
            '<span style="color:#9ca3af;font-size:11px"> p · %s 기준</span></span>'
            '<span style="color:#cbd5e1">|</span>'
            '<span style="font-size:13px">소리펜 합 '
            '<b style="color:#2563eb">%s</b></span>'
            '<span style="font-size:13px">필기펜 합 '
            '<b style="color:#2563eb">%s</b></span>'
            '<span style="font-size:13px">심볼 합계 '
            '<b style="color:#2563eb;font-size:16px">%s</b></span></div>'
            '<div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;margin-top:8px;'
            'padding-top:8px;border-top:1px dashed #bfdbfe">'
            '<span style="font-size:12.5px;color:#374151">적용비 <b>₩%s</b>'
            '<span style="color:#9ca3af;font-size:11px"> (%s Ncode 적용 %dp × 단가)</span></span>'
            '<span style="font-size:12.5px;color:#374151">편집·기능비 <b>₩%s</b>'
            '<span style="color:#9ca3af;font-size:11px"> (항목별 단가 합)</span></span>'
            '<span style="margin-left:auto;font-size:14px">청구액 '
            '<b style="color:#2563eb;font-size:18px">₩%s</b></span></div>'
            '</div></div>'
            % (pg, pen, '{:,}'.format(s_sum), '{:,}'.format(p_sum), '{:,}'.format(tot),
               '{:,}'.format(page_amt), pen, pg, '{:,}'.format(sym_amt),
               '{:,}'.format(page_amt + sym_amt)))


def settle(badge='fixed', discount=True):
    """편집 단가 · 할인 정산 (EditingDetailView 3-B행) — 머리 배지 · 할인 적용 · [할인 초기화] · 설명 · 할인 입력 3칸 · 내역표 · 아래 안내"""
    if badge == 'fixed':
        b = '<span class="tag b">등록 시 단가 (2019-04-11) · 적용 500 / 편집 1,000</span>'
        warn = ''
    elif badge == 'changed':
        b = '<span class="tag b">등록 시 단가 (2019-04-11) · 적용 500 / 편집 1,000</span>'
        warn = '<span class="btn sm" style="color:#b45309">⚠ 고객사 단가 변경됨 — 현재 단가로 갱신</span>'
    else:
        b = '<span class="tag y">고객사 단가 · 적용 500 / 편집 1,000</span>'
        warn = ''
    dct = ('<span style="font-size:11px;background:#fee2e2;color:#b91c1c;border-radius:5px;padding:2px 7px;font-weight:700">할인 적용</span>'
           if discount else '')
    rows = [('적용비 (Ncode 적용)', '소리펜 48p × 단가', '₩24,000', False),
            ('편집·기능비', '심볼·기능 1,188 (항목별 단가 합)', '＋ ₩1,188,000', False),
            ('합계 (할인 전)', '적용비 + 편집·기능비', '₩1,212,000', False)]
    if discount:
        rows += [('할인율 10%', '합계 기준', '− ₩121,200', True), ('추가 할인액', '재작업분 · 물량 협의', '− ₩10,000', True)]
        total, tdc = '₩1,080,800', '<span style="margin-left:8px;font-size:11px;background:#fee2e2;color:#b91c1c;border-radius:5px;padding:2px 7px;font-weight:700">총 할인 ₩131,200 (10.8%)</span>'
    else:
        total, tdc = '₩1,212,000', ''
    tr = ''.join('<tr><td style="padding:7px 12px">%s</td><td style="color:#6b7280">%s</td>'
                 '<td style="text-align:right;padding:7px 12px%s">%s</td></tr>'
                 % (a_, b_, ';color:#dc2626' if m else '', c) for a_, b_, c, m in rows)
    return ('<div class="card" style="border-color:%s;background:%s"><div class="hd" style="display:flex;align-items:center;gap:8px">편집 단가 · 할인 정산 %s%s%s'
            '<span class="btn sm" style="margin-left:auto">할인 초기화</span></div><div class="bd">'
            '<div style="font-size:11.5px;color:#6b7280;margin-bottom:8px">단가는 <b>고객사 관리</b>에서 항목별로 지정합니다. 교재는 <b>등록 시점의 단가로 고정</b>되며, '
            '이후 고객사 단가가 바뀌어도 기존 교재의 청구액은 그대로 유지됩니다. 여기서는 이 교재의 할인만 입력합니다.</div>'
            '<div class="g3">%s%s%s</div>'
            '<div style="border:1px solid #eef0f4;border-radius:9px;overflow:hidden;margin-top:12px">'
            '<table>%s<tr style="border-top:2px solid #e5e7eb;background:#f5f9ff"><td colspan="2" style="padding:10px 12px;font-weight:700;color:#1e3a8a">최종 청구액%s</td>'
            '<td style="text-align:right;padding:10px 12px"><b style="color:#2563eb;font-size:17px">%s</b></td></tr></table></div>'
            '<div style="font-size:11px;color:#9ca3af;margin-top:6px">단가를 고객사 단가와 같게 두고 할인율·할인액을 0으로 하면 할인 없음(기준가 그대로)입니다. '
            '고객사 단가 변경은 <b>멤버 관리 &gt; 고객사 관리</b>에서 합니다.</div></div></div>'
            % ('#fecaca' if discount else '#eef0f4', '#fffafa' if discount else '#fff', b, warn, dct,
               field('할인율 (%)', '<div class="inp">%s</div>' % ('10' if discount else '0')),
               field('추가 할인액 (₩)', '<div class="inp">%s</div>' % ('10000' if discount else '0')),
               field('할인 사유', '<div class="inp%s">%s</div>' % ('' if discount else ' ph', '재작업분 · 물량 협의' if discount else '예) 재작업분 · 물량 협의')),
               tr, tdc, total))


def att(label, mode='link', value='', note=''):
    """AttField — [링크 ▾ / 파일] · 링크면 입력 + [↗ 열기], 파일이면 [파일] + 파일명 · 아래 설명"""
    if mode == 'file':
        body = ('<div class="inp" style="flex:1;display:flex;align-items:center;gap:8px"><span class="btn sm">파일</span>%s</div>'
                % (value or '<span style="color:#9ca3af">선택 없음</span>'))
    else:
        body = ('<div class="inp%s" style="flex:1">%s</div><span class="btn sm" style="opacity:%s">↗ 열기</span>'
                % ('' if value else ' ph', value or 'https://...', '1' if value else '.4'))
    return ('<div style="border:1px solid #eef0f4;border-radius:8px;padding:10px"><div style="font-size:11px;color:#6b7280;margin-bottom:6px;font-weight:600">%s</div>'
            '<div style="display:flex;gap:6px;align-items:center"><div class="inp" style="width:64px;display:flex;justify-content:space-between">%s<span style="color:#9ca3af;font-size:9px">▾</span></div>%s</div>'
            '<div class="inp%s" style="margin-top:6px">%s</div></div>'
            % (label, '파일' if mode == 'file' else '링크', body, '' if note else ' ph', note or '링크/파일에 대한 내용·설명'))


def extra(hi=None, empty_memo=False):
    """4행 — 산출물(접기 · 세트 개수 · 첨부 3칸) + 업무요청 메모(종류 · 입력 · [＋ 기록] · 카드 목록)"""
    cards = ''
    for no, k, ts, w, txt in MEMOS:
        mine = w == '김순정'
        bg, fg = {'요청': ('#eef6ff', '#2563eb'), '처리': ('#ecfdf5', '#047857'), '메모': ('#f3f4f6', '#6b7280')}[k]
        cards += ('<div style="border:1px solid #eef0f4;border-radius:8px;padding:6px 8px;margin-bottom:8px;%s">'
                  '<div style="display:flex;gap:8px;align-items:center;font-size:11.5px">'
                  '<span style="min-width:22px;text-align:center;background:#f3f4f6;border-radius:5px;font-family:ui-monospace,monospace">%s</span>'
                  '<span style="font-size:11px;background:%s;color:%s;border-radius:5px;padding:2px 7px">%s</span>'
                  '<span style="color:#9ca3af;font-family:ui-monospace,monospace">%s</span>'
                  '<span style="color:%s;font-weight:%s">%s</span><span style="flex:1"></span>%s</div>'
                  '<div style="margin-top:4px;font-size:12.5px">%s</div></div>'
                  % ('background:#fff7ed;' if hi == no else '', no, bg, fg, k, ts, '#2563eb' if mine else '#9ca3af', '700' if mine else '400',
                     w + (' (나)' if mine else ''),
                     '<span class="lnk" style="color:#dc2626">삭제</span>' if mine else '<span style="font-size:10.5px;color:#d1d5db">🔒 타인 글</span>', txt))
    if empty_memo:
        cards = '<div style="font-size:12px;color:#9ca3af">기록된 업무 메모가 없습니다.</div>'
    return ('<div class="card"><div class="bd">'
            '<div style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:13px;margin-bottom:10px">산출물 '
            '<span style="font-weight:400;color:#9ca3af;font-size:11px">· 세트 개수 · 세부내역 · 출력용파일 · APP 데이터 (파일/링크 + 설명)</span>'
            '<span style="margin-left:auto;font-size:11px;color:#3b82f6;font-weight:400">접기 ▲</span></div>'
            '<div style="max-width:200px;margin-bottom:10px">%s</div>'
            '<div class="g3">%s%s%s</div>'
            '<div style="font-weight:700;font-size:13px;margin:14px 0 8px">업무요청 메모 <span style="font-weight:400;color:#9ca3af;font-size:11px">· 요청/처리/메모 (메모1~3 대체)</span></div>'
            '<div style="display:flex;gap:8px;align-items:flex-start"><div class="inp" style="width:76px;display:flex;justify-content:space-between">요청<span style="color:#9ca3af;font-size:9px">▾</span></div>'
            '<div class="inp ph" style="flex:1;min-height:38px">내용 입력 · Enter 기록 · Shift+Enter 줄바꿈</div><span class="btn sm">＋ 기록</span></div>'
            '<div style="margin-top:10px">%s</div></div></div>'
            % (field('세트 개수', '<div class="inp">1</div>'),
               att('세부내역', 'link', 'https://drive.neolab.net/wj/detail', '2차 교정본'), att('출력용파일', 'file'), att('APP 데이터'),
               cards))


def content(mode='edit', st='진행중', locked=False, need_date=False, released=False,
            share=False, sub_err=False, empty=False, pen='소리펜', badge='fixed',
            discount=True, mod_date=True, hi=None, toast='', tip=False, ext=None,
            cn=None, sub=None, need_codes=None):
    # ext — 그룹 기본 코드 교재 예시(Common-21 S3/O21/B265) `PC-359` `PC-366`
    #   {'picked': 고른 확장 코드, 'open': 확장 셀렉트 펼침, 'taken': 사용 중이 된 코드, 'so_open': 할당된 S/O 셀렉트 펼침}
    # cn  — casterN 연동 {'manual': 직접 넣은 칸, 'vals': 칸 값, 'done': {Owner: 최종수정 있음}} `PC-361`
    # sub — 하위 고객사로 들어온 경우 머리말 「상위 ▸ 하위」 `PC-368`
    save = '추가' if mode in ('new', 'dup') else '저장'
    cn = cn or {}
    cmp = None
    if ext is not None:
        picked = ext.get('picked', (964, 965))
        cd = coord_ext(picked, ext.get('open', False), ext.get('taken'), mode, ext.get('so_open', False))
        inf = info(empty, mod_date, '톡톡 누르면 배움이 쏙쏙 4')
        done = cn.get('done', {})
        # 코드별 탭 = 기본 + 고른 확장 코드만 — 고른 것이 없으면 탭 없이 한 벌 `PC-366`
        tabs = ([('기본', 21, done.get(21, not empty))]
                + [('확장 %d' % ext_k(o), o, done.get(o, True)) for o in picked]) if picked else None
        cst = caster(empty, mod_date, tip, 'TOKTOK_Korean_Book_4-1', tabs, cn.get('manual', ()), cn.get('vals'))
        cmp = 4 * (1 + len(picked))   # `PC-367`
        cust = ('Common-21', '21', 'PDS2')
    else:
        cd, inf = coord(mode, share, sub_err), info(empty, mod_date)
        cst = caster(empty, mod_date, tip, manual=cn.get('manual', ()), vals=cn.get('vals'))
        cust = ('교원구몬-10', '10', 'PDS2') if mode == 'dup' else ('웅진씽크빅', '17', 'PDS2')
    subh = ('<div style="font-size:18px;font-weight:700;color:#7e22ce" title="하위 고객사 — %s 코드를 쓰는 %s">'
            '<span style="color:#9ca3af;font-weight:400;margin-right:6px">▸</span>%s</div>'
            % (cust[0], sub, sub)) if sub else ''
    head = ('<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><span class="btn gho">목록</span>'
            '<div style="font-size:18px;font-weight:700">%s</div>%s'
            '<span class="tag" style="font-family:ui-monospace,monospace">owner %s</span>'
            '<span style="font-size:11px;background:#fef3c7;color:#d97706;border-radius:5px;padding:2px 7px;font-weight:700">%s</span></div>'
            % (cust[0], subh, cust[1], cust[2]))
    title = {'new': '교재(책) 추가', 'dup': '교재(책) 복제 추가'}.get(mode, '교재(책) 편집 수정')
    tline = ('<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap"><b style="font-size:15px">%s</b>%s'
             '<span class="tag" style="font-family:ui-monospace,monospace">S%s</span></div>'
             % (title, '' if mode in ('new', 'dup') else '<span class="tag" style="background:#f3f4f6;color:#6b7280">%s</span>' % (
                 '톡톡 누르면 배움이 쏙쏙 4' if ext is not None else '범블비 잉글리시 전집 1권'),
                '0/O10/B1108' if mode == 'dup' else (
                    ('3/O21/B266' if mode == 'new' else '3/O21/B265') if ext is not None else '3/O17/B431')))
    return (toast + head + tline
            + status_row(st, locked, need_date, released, need_codes) + '<div style="height:12px"></div>'
            + cd + '<div style="height:12px"></div>'
            + inf + '<div style="height:12px"></div>'
            + cst + '<div style="height:12px"></div>'
            + qty(pen, cmp) + '<div style="height:12px"></div>'
            + totals(pen) + '<div style="height:12px"></div>'
            + settle(badge, discount) + '<div style="height:12px"></div>'
            + extra(hi)
            + '<div class="row" style="align-items:center;gap:8px;margin-top:18px;'
              'padding-top:14px;border-top:1px solid #eef0f4">'
              '%s<span style="flex:1"></span><div class="btn gho">목록</div>'
              '<div class="btn pri">%s</div></div>'
            % ('<div class="btn gho" style="color:#dc2626;border-color:#fecaca">교재 삭제</div>'
               if (mode not in ('new', 'dup') and not locked) else '', save))


def ovl(title, msg, danger=False):
    return ('<div class="ovl"><div class="mdl">'
            '<div class="mh"><div class="mt">%s</div><div class="mx">✕</div></div>'
            '<div style="font-size:13px;color:#374151;line-height:1.7">%s</div>'
            '<div class="mf"><div class="btn gho">취소</div>'
            '<div class="btn %s">확인</div></div></div></div>'
            % (title, msg, 'dan' if danger else 'pri'))


def build():
    boards = []

    boards.append((
        'S1', '등록 모드 · 교재(책) 추가', '기본',
        '<code>PRJ-03</code>의 <b>[＋ 교재(책) 추가]</b>로 진입. 화면 제목 <b>교재(책) 추가</b>. '
        '<b>등록 모드에서는 S/O를 선택</b>할 수 있다. '
        '여기서 입력한 <b>페이지 수와 심볼·기능 수량이 곧 청구액</b>이 되므로, '
        '편집팀 작업 기록이자 정산 입력 화면이다. 대상 단위 = 교재(책) 1권 = S/O/B 좌표 1개.',
        frame('PRJ-03', '교재(책) 추가',
              content(mode='new', empty=True, badge='new', discount=False, mod_date=False),
              height=2260),
        [('진행 상태', '선택', '진행중 / 완료 / 보류', '기본값 <b>진행중</b>'),
         ('타입 = 소리펜', '선택', '<b>소리펜 심볼 입력 활성</b> · 필기펜 심볼 입력 <b>잠김</b>',
          '잠긴 묶음은 흐리게 + 제목에 <b>[잠김]</b> 배지 <code>PC-091</code>. '
          '타입을 바꾸면 열리고 <b>값은 지워지지 않는다</b>'),
         ('할당된 S / O', '선택 (필수)', '—',
          '<b>좌표(S/O)만</b> 나온다 <code>PC-083</code> — 종류(N·G)는 빼서 같은 코드가 두 줄로 '
          '중복되지 않는다(할당 원장이 종류 미상이라 N·G 양쪽으로 잡혔다). '
          '공유 코드면 뒤에 <b>· 공유</b>. 좌표를 바꿔도 <b>고른 종류는 유지</b>된다'),
         ('Book', '선택 (필수)', '—', '<b>사용 가능한 번호</b>에서만 <code>P-01</code>. '
          '한 번에 <b>100개</b>만 그리고 <b>[＋ 100개 더 보기]</b> 로 100씩 늘린다 <code>PC-046</code>. '
          '더 보기를 눌러도 <b>셀렉트가 열린 채</b> 아래로 이어진다 <code>PC-057</code>, '
          '입력칸에 번호를 <b>바로 쳐서</b> 찾을 수도 있다 <code>PC-054</code>'),
         ('코드 종류', '선택', '—',
          '<b>Book 다음</b>에 배치 <code>PC-054</code> · PDS2 · PDS3 · PDS4 · OID <code>PC-052</code>'),
         ('[초기화] · [＋ 교재(책) 추가]', '—', '<b>숨김</b>',
          '교재 추가 화면에서는 상단 버튼을 내리지 않는다 <code>PC-054</code>'),
         ('Total Page', '입력', '<b>목록의 페이지 항목</b>',
          '직접 입력 · [Ncode 적용] 과 동기화하지 않는다 <code>PC-089</code> · 청구액과 무관'),
         ('심볼·기능 수량', '입력', '편집·기능비 계산', '각 항목 <b>수량 × 단가</b>'),
         ('[추가]', '클릭', '<code>PRJ-03</code> 갱신', '상단 알림 <b>추가됨</b>'),
         ('저장(자동)', '기록', '<code>LOG-01</code>', '등록 = <b>교재 추가</b>'),
         ('저장(자동, 공유 코드)', '반영', '<code>SOB-01</code>', '지도에 사용 고객사·편집 상태 반영'),
         ('사용 가능한 Book이 없을 때', '이동', '<code>SOB-01</code> → <code>SOB-02</code>', '코드 추가 할당'),
         ('[목록]', '클릭', '<code>PRJ-03</code>', '교재 목록으로 · 입력값은 저장되지 않는다')]))

    boards.append((
        'S2', '수정 모드 · 교재(책) 편집 수정', '기본',
        '<code>PRJ-03</code>의 <b>교재 행 클릭</b>으로 진입. 화면 제목 <b>교재(책) 편집 수정</b>. '
        '위에 고객사 머리줄([목록] · 고객사 · owner · 코드 종류), 그 아래 폼 제목줄(교재명 태그 · S/O/B 태그). '
        '<b>사용할 코드</b> 묶음의 S/O · Book 은 <b>(수정 불가)</b> — 「이 S/O는 {고객사} 전용입니다. 별도 고객사 입력이 필요 없습니다.」',
        frame('PRJ-03', '교재(책) 편집 수정', content(tip=True), height=2260),
        [('S / O', '—', '<b>수정 불가</b>', '수정 모드에서는 변경할 수 없다'),
         ('교재명', '입력', '—', '연동이 <b>NPROJ 타이틀 → 없으면 NPROJ 파일명</b>으로 채우고 여기서 고칠 수 있다 <code>PC-284</code>'),
         ('casterN 연동', '—', '<b>자동 우선 · 직접 등록</b>',
          '<b>ncp2 파일명 · ncp2 파일 크기 (byte) · ncp2 최종수정 (완료 필수) · 편집 유형 · 최초 등록일</b> 5칸 한 줄 '
          '<code>PC-369</code> — casterN 저장 · 수정 때마다 최신 값으로 채워지고, 연동 전에는 직접 등록할 수 있다(S19) '
          '<code>PC-361</code>. 값이 없으면 <b>미연동</b> <code>PC-282</code>'),
         ('프로젝트명 (.nproj)', '—', '<b>삭제</b>',
          '입력란을 두지 않는다 <code>PC-369</code> — casterN 에서 들어온 .nproj 파일명은 데이터에 남는다'),
         ('casterN 연동 ⓘ', '클릭', '말풍선(5초)', CASTER_TIP),
         ('Book (수정 불가)', '—', '<b>등록된 코드</b>', '수정 모드에서는 Book 을 바꾸지 않는다 · 코드 종류 셀렉트도 잠김 <code>PC-112</code>'),
         ('발급인 · 펜 모델 · 타입 · 편집 방식', '—', '<b>한 줄</b>',
          '교재명 다음 줄에 <b>발급인 · 펜 모델 · 타입 · 편집 방식</b>(1 · 2 · 1 · 2칸) — 고른 값은 셀렉트 아래 <code>PC-096</code> <code>PC-278</code>'),
         ('펜 모델 선택지', '—', '<b>타입별 · 대표모델 묶음</b>',
          '구분이 교재 <b>[타입]과 같은 모델만</b>(소리펜 / 필기펜 · 기타기기 제외) 나오고 '
          '<b>대표모델별로 묶인다</b> <code>PC-325</code> · 첫 줄 <b>＋ {타입} 펜 모델 추가…</b> · '
          '타입을 바꾸면 선택지만 바뀌고 고른 칩은 남는다 · 목록은 <b>데이터 파일에서 직접 관리</b>'),
         ('펜 모델 [＋ 직접 추가…]', '—', '<b>폐지</b>',
          '입력칸으로 직접 적어 넣던 기능 <code>PC-100</code> · 공용 목록 '
          '[코드 관리 정보 ▸ 펜 모델] <code>PC-101</code> 은 폐지 <code>PC-325</code> — '
          '목록에 없는 모델은 데이터 파일에 넣어야 나온다'),
         ('펜 모델', '셀렉트에서 선택', '칩으로 추가',
          '<b>발급인 오른쪽</b>에 있다 <code>PC-095</code> <code>PC-096</code> · <b>[＋ {타입} 펜 모델 추가…]</b> 에서 고르면 '
          '칩으로 쌓이고 <b>✕</b> 로 뺀다(다중). 미선택이면 <b>선택된 펜 모델 없음</b> · '
          '이미 고른 모델은 목록에 다시 나오지 않는다'),
         ('편집 방식', '추가/삭제', '<b>타입에 따라 후보가 바뀐다</b>',
          '[타입] 바로 옆 <code>PC-087</code> · 소리펜 12종 / 필기펜 7종 + 기능 없음(공통). '
          '타입을 바꾸면 그 타입에 없는 편집 방식은 자동으로 떨어진다'),
         ('[저장]', '클릭', '<code>PRJ-03</code> 갱신', '상단 알림 <b>수정됨</b> · 목록·집계·청구액 갱신'),
         ('저장(자동)', '기록', '<code>LOG-01</code>', '수정 = <b>교재 작업</b>'),
         ('[교재 삭제]', '클릭', 'S9 확인창', '')]))

    boards.append((
        'S3', '완료 상태 · 내용 잠금', '변형',
        'PRD §4.1 · §5 — <b>완료 처리하려면 ncp2 최종수정 날짜가 필요</b>하고, '
        '완료 상태에서는 <b>내용이 잠긴다</b>.',
        frame('PRJ-03', '교재(책) 편집 수정',
              content(st='완료', locked=True), height=2260),
        [('안내', '표시', '—',
          '<b>🔒 완료 처리되어 내용이 잠겼습니다. 수정하려면 진행중으로 변경하세요.</b>'),
         ('입력 항목', '—', '<b>잠금</b>', ''),
         ('[진행중]', '클릭', '잠금 해제', '완료 해제'),
         ('완료 처리 후 정산 확정', '—', '<b>미결</b>', '⚠ §7 — 청구 확정 개념 도입 시 재정의')]))

    boards.append((
        'S4', '완료 조건 미충족', '오류',
        'PRD §4.1 · §5 — ncp2 최종수정 날짜가 비어 있으면 완료로 바꿀 수 없다.',
        frame('PRJ-03', '교재(책) 편집 수정',
              content(need_date=True, mod_date=False),
              overlay=ovl('완료할 수 없습니다',
                          'ncp2 최종수정 날짜가 비어 있어 완료할 수 없습니다. '
                          'casterN 에서 ncp2 를 내보낸 뒤 완료로 변경하세요.'),
              height=2260),
        [('[완료]', '클릭', '<b>차단</b>',
          '<b>ncp2 최종수정 날짜가 비어 있어 완료할 수 없습니다. casterN 에서 ncp2 를 내보낸 뒤 완료로 변경하세요.</b>'),
         ('인라인 안내', '표시', '—', '<b>※ 완료하려면 ncp2 최종수정 날짜가 필요합니다.</b>'),
         ('ncp2 최종수정', '자동 · 직접', '완료 가능',
          'casterN 에서 ncp2 를 내보내면 채워진다 <code>PC-282</code> · 연동 전에는 직접 넣어도 완료 조건을 채운다 <code>PC-361</code>'),
         ('그룹 기본 코드 교재', '—', 'S18', '기본 + 고른 확장 코드 탭 모두에 최종수정이 있어야 한다 <code>PC-359</code> <code>PC-366</code>')]))

    boards.append((
        'S5', '완료 해제 이력', '변형',
        'PRD §4.1 — 완료를 해제하면 그때의 ncp2 최종수정 날짜가 <b>이력으로 보관</b>되고'
        '(해제 시각·해제자 포함) 화면에서 확인할 수 있다.',
        frame('PRJ-03', '교재(책) 편집 수정', content(released=True), height=2260),
        [('완료 해제 이력', '표시', '—', '<b>· {날짜} (완료 해제 {해제일시} · {해제자})</b>'),
         ('[완료]', '클릭', '재완료', 'ncp2 최종수정 날짜가 있으면 가능')]))

    boards.append((
        'S6', '공유 코드 · 사용 고객사 = 서비스 티켓의 고객사', '분기',
        '<code>P-12</code> — 공유(커먼) 코드 Owner의 교재는 <b>사용 고객사 (서비스 티켓)</b> 칸이 붙는다. '
        '<b>고르지 않는다</b> — 이 교재의 S/O/B(코드 타입 포함)를 덮는 <b>서비스 티켓의 고객사명</b>이 상태값으로 뜬다 '
        '<code>PC-289</code>. 코드 타입은 티켓 PDS2 = 교재 PDS2, 티켓 PDS3 = 교재 PDS3 · PDS4 (OID 는 서비스 티켓이 없다). '
        '서비스 티켓끼리는 겹칠 수 없어(상위 · 하위 포함 <code>PC-291</code>) 한 장만 잡히고, 그 고객사가 교재 <b>소유 고객사</b>다. '
        '옛 「사용 고객사를 입력하세요」 저장 차단은 없앴다.',
        frame('PRJ-03', '교재(책) 편집 수정',
              content(share=True), height=2160),
        [('사용 고객사 (서비스 티켓)', '표시', '—', '티켓의 고객사명 · 보라 배지 · 고칠 수 없다'),
         ('만료 · 대기 티켓', '표시', '—', '이름 뒤에 <b>만료</b> / <b>대기</b>'),
         ('티켓 없음 · 등록된 이름 있음', '표시', '—', '그 이름을 흐린 점선 태그로 + <b>⚠ 티켓 필요</b> <code>PC-290</code>'),
         ('티켓 없음 · 이름도 없음', '표시', '—', '<b>티켓 없음</b>(회색)'),
         ('고객사명', 'hover', '툴팁', '<b>서비스 티켓 #{번호} · {코드 범위} · {사용기간}</b>'),
         ('저장 후', '반영', '<code>SOB-01</code>', '지도에 사용 고객사(티켓의 고객사)·편집 상태 반영')]))

    boards.append((
        'S7', '단가 고정 · 현재 단가로 갱신', '분기',
        'PRD §4.5 — <b>등록 시 단가 ({날짜})</b>는 저장 시점의 고객사 단가로 고정된 상태다. '
        '고정된 단가와 <b>현재 고객사 단가가 다를 때만</b> '
        '<b>⚠ 고객사 단가 변경됨 — 현재 단가로 갱신</b> 버튼이 나타나며, '
        '누르면 확인 후 <b>이 교재만</b> 현재 단가로 다시 계산한다 <code>PC-027</code>.',
        frame('PRJ-03', '교재(책) 편집 수정',
              content(badge='changed'),
              overlay=ovl('현재 단가로 갱신',
                          '이 교재를 현재 고객사 단가로 다시 계산할까요? (등록 시 단가가 대체됩니다)'),
              height=2140),
        [('등록 시 단가 배지', '표시', '—', '<b>등록 시 단가 ({날짜})</b> — 고정 상태'),
         ('고객사 단가 / 기본 단가 배지', '표시', '—', '아직 고정 전 — <b>저장하면 현재 단가로 고정</b>'),
         ('[현재 단가로 갱신]', '클릭', '확인창',
          '<b>이 교재를 현재 고객사 단가로 다시 계산할까요? (등록 시 단가가 대체됩니다)</b>'),
         ('단가를 바꿔야 할 때', '이동', '<code>MEM-01</code> → <code>MEM-02</code>', '고객사 단가 지정')]))

    boards.append((
        'S8', '타입 = 필기펜 — 소리펜 묶음 잠김', '변형',
        'PRD §4.4 · <code>PC-091</code> — <b>[타입]이 정하는 쪽만 활성</b>이다. '
        '필기펜을 고르면 <b>필기펜 심볼 입력이 열리고 소리펜 심볼 입력은 잠긴다</b>'
        '(흐리게 · 제목에 <b>[잠김]</b> 배지 · 입력칸 회색). S1 의 소리펜 선택과 정확히 반대다. '
        '필기펜 항목은 <b>Ncode 적용 · 기본 편집 · Custom · 노트서버 업로드</b> 4항목이다 '
        '<code>PC-084</code> <code>PC-085</code> — action 변경 편집 · 교원구몬/KEP 는 폐지했다'
        '(구 <code>none 편집비용</code> → <b>기본 편집</b>).',
        frame('PRJ-03', '교재(책) 편집 수정',
              content(pen='필기펜', discount=False), height=2020),
        [('타입 = 필기펜', '선택', '<b>필기펜 심볼 입력 활성</b> · 소리펜 심볼 입력 <b>잠김</b>',
          '잠긴 묶음의 값은 <b>지워지지 않는다</b> — 타입을 되돌리면 그대로 다시 열린다 <code>PC-091</code>'),
         ('잠긴 묶음', '입력 시도', '<b>불가</b>', '입력칸이 회색이고 눌리지 않는다'),
         ('Ncode 적용 수 · 적용비', '자동', '<b>활성 펜 기준</b>',
          '두 펜의 [Ncode 적용] 을 더하지 않는다 <code>PC-091</code>'),
         ('편집·기능비', '자동', '<b>두 묶음 합산</b>',
          '옛 장부에 반대편 묶음으로 기록된 심볼이 있어 그대로 청구에 반영한다'),
         ('Custom', '—', '<b>1,500</b>', '심볼당 <code>PC-084</code>'),
         ('할인율 · 추가 할인액', '입력', '청구액 조정', '0이면 할인 행이 내역표에 나오지 않는다 · 할인이 있으면 머리에 <b>할인 적용</b> · 최종 청구액 옆 <b>총 할인 ₩{n} ({n}%)</b>'),
         ('[할인 초기화]', '클릭', '할인 없음으로', '')]))

    boards.append((
        'S9', '교재 삭제 확인창', '확인창',
        'PRD §4.7 · §5 — 확인 후 해당 교재 행이 <code>PRJ-03</code> 목록에서 제거된다.',
        frame('PRJ-03', '교재(책) 편집 수정', content(),
              overlay=ovl('교재 삭제', '이 책(교재) 편집 행을 삭제할까요?', danger=True),
              height=2260),
        [('[교재 삭제]', '클릭', '확인창', '<b>이 책(교재) 편집 행을 삭제할까요?</b>'),
         ('[확인]', '클릭', '<code>PRJ-03</code> 목록에서 제거', '집계·청구액 갱신'),
         ('[취소] · [✕]', '클릭', 'S2 복귀', '')]))

    boards.append((
        'S10', '업무 메모 · 남의 메모 수정 시도', '오류',
        'PRD §4.6 · §5 — 업무 메모는 <b>Enter 기록 · Shift+Enter 줄바꿈</b>이며 '
        '<b>본인이 작성한 메모만</b> 수정·삭제할 수 있다.',
        frame('PRJ-03', '교재(책) 편집 수정', content(hi='1'),
              overlay=ovl('수정할 수 없습니다',
                          '박지훈 님이 작성한 메모입니다. 본인 글만 수정할 수 있습니다.'),
              height=2260),
        [('메모 종류', '선택', '요청 / 처리 / 메모', ''),
         ('내용 입력 후 Enter', 'Enter', '기록', 'Shift+Enter 줄바꿈'),
         ('남의 메모 [수정]', '클릭', '<b>차단</b>',
          '<b>{작성자} 님이 작성한 메모입니다. 본인 글만 수정할 수 있습니다.</b>'),
         ('남의 메모 [삭제]', '클릭', '<b>차단</b>',
          '<b>{작성자} 님이 작성한 메모입니다. 본인 글만 삭제할 수 있습니다.</b>'),
         ('세부내역·출력용파일·APP 데이터', '입력', '링크(URL) + 설명',
          '새 탭으로 열 수 있다 · ⚠ §7 — 파일 업로드 전환 여부 미결'),
         ('저장 공간 부족', '상단 알림', '—',
          '<b>⚠ 브라우저 저장 공간이 가득 차 저장하지 못했습니다. 다른 사이트 데이터를 정리한 뒤 다시 저장하세요.</b>')]))

    boards.append((
        'S11', '복제 등록 — 같은 코드에 작업물 하나 더', '기본',
        '<code>PRJ-03</code> 교재 목록의 <b>[복제]</b> 로 진입 <code>PC-112</code>. 화면 제목 '
        '<b>교재(책) 복제 추가</b>. 같은 코드(S/O/B)에 <b>프로젝트 · ncp2 가 다른 작업물</b>을 하나 더 '
        '만들 때 쓴다 <code>PC-110</code> — 학생용 · 교사용 · 필기펜처럼. '
        '<b>코드 좌표 3칸(할당된 S/O · Book · 코드 종류)이 모두 수정 불가</b>이고, '
        '교재명만 원본에서 물려받은 채 <b>기본 정보 · 심볼 입력 · 산출물은 빈 값</b>으로 열린다. '
        '일반 <b>[＋ 교재(책) 추가]</b> 의 Book 목록에는 <b>이미 쓴 Book 이 나오지 않으므로</b>(S1) '
        '같은 S/O/B 교재는 이 화면으로만 만들어진다.',
        frame('PRJ-03', '교재(책) 복제 추가',
              content(mode='dup', empty=True, badge='new', discount=False, mod_date=False),
              height=2260),
        [('안내 배너', '표시', '—',
          '<b>복제 · 코드 S{s}/O{o}/B{b} 고정 — 기본 정보·심볼 입력은 초기화됨 · '
          'casterN 연동 항목은 새 작업으로 채워집니다</b> <code>PC-282</code>'),
         ('할당된 S / O · Book · 코드 종류', '—', '<b>수정 불가</b>',
          '복제 원본의 코드 — 세 칸 모두 회색 고정 <code>PC-112</code>'),
         ('교재명', '표시', '—', '원본에서 물려받는다(고칠 수 있다) · 사용 고객사는 같은 코드라 같은 티켓으로 표시 <code>PC-289</code>'),
         ('casterN 연동', '—', '<b>미연동</b>',
          'ncp2 · 편집 유형 · 최초 등록일은 비어 있고 casterN 에서 새 작업을 저장하면 채워진다 <code>PC-282</code>'),
         ('심볼 입력 · 산출물', '—', '<b>초기화</b>', '원본 값을 가져오지 않는다'),
         ('[추가]', '클릭', '<code>PRJ-03</code> 갱신',
          '목록에 행이 늘고 <b>「작업 n/N」 배지의 N 이 하나 커진다</b>'),
         ('[교재 삭제]', '—', '<b>숨김</b>', '등록 모드라 삭제 버튼이 없다'),
         ('[목록]', '클릭', '<code>PRJ-03</code>', '입력값은 저장되지 않는다')]))

    boards.append((
        'S12', '같은 코드 중복', '오류',
        '<code>PC-112</code> — 일반 등록에서 <b>같은 S/O/B</b> 교재가 이미 있으면 막고 <b>[복제]</b> 를 안내한다. '
        '<b>ncp2 파일명 중복 차단은 폐지</b> <code>PC-282</code> — 파일명은 casterN 이 채우는 값이라'
        '(직접 등록 <code>PC-361</code> 도 같다) 옛 장부의 같은 이름이 저장을 막지 않도록 검사하지 않는다.',
        frame('PRJ-03', '교재(책) 추가',
              content(mode='new', empty=True, badge='new', discount=False, mod_date=False),
              overlay=ovl('저장할 수 없습니다',
                          'S3/O17/B431 에는 이미 교재가 있습니다. '
                          '같은 코드에 작업물을 더 만들려면 목록의 [복제]를 쓰세요.'),
              height=2260),
        [('같은 S/O/B (일반 등록)', '[추가]', '<b>차단</b>',
          '<b>S{s}/O{o}/B{b} 에는 이미 교재가 있습니다. 같은 코드에 작업물을 더 만들려면 '
          '목록의 [복제]를 쓰세요.</b>'),
         ('ncp2 파일명 중복', '—', '<b>검사 안 함</b>',
          '폐지 <code>PC-282</code> — 중복은 casterN · 서버 매칭에서 다룬다'),
         ('[확인]', '클릭', '폼 복귀', '입력값은 그대로 남는다')]))

    # ── 확장 언어 그룹 기본 코드 교재 `PC-359` `PC-366` `PC-367` (옛 S13~S15 슬롯 칸 · 체크 목록 `PC-327` 을 다시 그림)
    TAKEN_MSG = ('S3/O965/B265 은 이미 다른 고객사 교재가 쓰고 있습니다 — 충남교육청 · 어서와 한국 생활은 처음이지 1. '
                 '확장 언어 코드에서 O965 를 빼거나 다른 Book 을 고르세요.')
    boards.append((
        'S13', '그룹 기본 코드 교재 — 확장 언어 코드 · 언어 슬롯 · 코드별 탭', '분기',
        '<code>PC-359</code> <code>PC-366</code> <code>PC-367</code> — 교재 코드가 확장 언어 그룹(<code>MEM-02</code> §4.12)의 '
        '<b>기본 코드</b>(Common-21 S3/O21 PDS2 · Cake-1009 S3/O1009 PDS3)면 [사용할 코드] 한 줄의 코드 종류 뒤에 '
        '<b>「확장 언어 코드 · 복수 선택 ({고른 수} / {그룹 확장 수}개)」</b> 칸이 붙는다. 그룹의 확장 코드 중 <b>고른 것만</b> '
        '같은 Book 으로 이 교재에 붙는다(옛 [+ 슬롯] 체크 목록 <code>PC-327</code> · 모두 자동 <code>PC-359</code> 폐지). '
        '하나라도 고르면 칸 아래 <b>언어 슬롯 · 코드 {n}개</b>, casterN 연동에 <b>코드별 탭</b>, 소리펜 심볼 입력 머리에 '
        '<b>🌐 Compound {n}언어까지</b>가 나온다. 예: 전북교육청 「톡톡 누르면 배움이 쏙쏙 4」 S3/O21/B265 + O964 · O965 '
        '→ 탭 3개 · Compound 12언어까지.',
        frame('PRJ-03', '교재(책) 편집 수정', content(ext={'picked': (964, 965)}), height=2400),
        [('할당된 S / O', '—', '<b>기본</b> 배지', '수정 모드에서 그룹 기본 코드면 좌표 옆 <b>기본</b> <code>PC-359</code>'),
         ('확장 언어 코드 칸', '표시', '—',
          '그룹 기본 코드 교재일 때만 · 코드 종류 <b>뒤</b>, (사용 고객사) 앞 — 한 줄 · 항목명 '
          '<b>확장 언어 코드 · 복수 선택 ({고른 수} / {그룹 확장 수}개)</b>'),
         ('＋ 확장 언어 코드 추가…', '클릭', 'S14 셀렉트',
          '고른 코드는 목록에서 빠진다 · 다 고르면 <b>확장 언어 코드를 모두 골랐습니다</b>(셀렉트 잠김) · 완료(잠금)면 고를 수 없다'),
         ('🌐 O{n} ✕', 'hover', '툴팁', '<b>확장 {k} · S{s}/O{n}/B{b} — 5 베트남어 · 6 러시아어 …</b> · 칩은 그룹 확장 순서대로'),
         ('🌐 O{n} ✕', '✕ 클릭', '빼기',
          'casterN 연동 값이 있으면 S16 확인창 · 없으면 바로 빠진다 — 언어 슬롯 줄 · casterN 탭 · Compound 항목이 함께 줄어든다'),
         ('고른 코드 없음', '표시', '—',
          '<b>선택한 확장 언어 코드 없음</b>(그룹에 확장이 없으면 <b>확장 코드 없음</b>) · 언어 슬롯 줄 · 코드 탭 없음 (S17)'),
         ('언어 슬롯 · 코드 {n}개', '표시', '—',
          '코드마다 한 줄 <b>기본 · O{n}</b> / <b>확장 {k} · O{n}</b> + 슬롯 4칸(<b>5 베트남어</b> · 빈 칸 <b>{번호} 비어 있음</b>) · '
          '기본 1~4, 확장 k 는 {4k+1}~{4k+4} · 언어는 <code>MEM-02</code> §4.12 에서 넣는다'),
         ('casterN 코드별 탭', '클릭', '그 코드 값',
          '<b>코드 {n}개 · 코드마다 등록</b> · <b>[기본 · O{n}] [확장 {k} · O{n}]</b> — 기본 + <b>고른</b> 확장 코드만 · '
          'ncp2 최종수정이 있는 탭은 <b>✓</b> · 탭마다 5칸 · 직접 등록도 탭마다 (S19)'),
         ('🌐 Compound {n}언어까지', '표시', '—',
          '<b>(기본 + 고른 확장 코드 수) × 4 언어</b> <code>PC-367</code> — 고른 것 없음 ~4 · 1개 ~8 · 2개 ~12 · 고르거나 빼면 바로 바뀐다 · '
          '상한보다 큰 칸은 감춘다(값이 있으면 보인다) · 9언어 이상은 8언어 뒤에 이어 붙고 단가는 8언어에 이어 300원씩(<b>임시</b>)'),
         ('Book', '규칙', '—', '고른 확장 코드는 <b>기본과 같은 Book</b>'),
         ('[저장]', '클릭', '<code>PRJ-03</code> · <code>SOB-01</code>',
          '<b>고른</b> 확장 코드를 기록 · 목록 S/O/B 칸에 <b>[확장] {o}</b> 칩 · 그 Book 도 SOBP 맵에 편집 표시(사용 고객사 포함) · '
          '기본 코드가 아니게 되면 확장 기록은 버린다 · 받은 casterN 연동 값은 코드마다 그대로'),
         ('[완료]', '클릭', '모든 코드 탭 필요', '기본 + 고른 코드 탭 모두에 ncp2 최종수정이 있어야 한다 (S18)')]))

    boards.append((
        'S14', '확장 언어 코드 셀렉트 — 언어 슬롯 미리 보기 · 모두 추가 · 사용 중', '분기',
        '<code>PC-366</code> — <b>＋ 확장 언어 코드 추가…</b> 셀렉트를 열면 아직 고르지 않은 그룹 확장 코드가 그룹 순서로 나온다. '
        '항목마다 그 코드에 할당된 <b>언어 슬롯</b>이 보여 고르기 전에 내용을 확인할 수 있다. 고를 수 있는 것이 2개 이상이면 '
        '맨 위 <b>모두 추가 ({n}개)</b>. 그림은 O964 를 고른 뒤(1 / 20개 · 탭 2개 · Compound 8언어까지) 다시 연 모습이다.',
        frame('PRJ-03', '교재(책) 편집 수정', content(ext={'picked': (964,), 'open': True}), height=2300),
        [('첫 줄', '표시', '—', '<b>＋ 확장 언어 코드 추가…</b>'),
         ('모두 추가 ({n}개)', '클릭', '한 번에 추가',
          '고를 수 있는 것(사용 중 제외)이 2개 이상일 때만 · 칩 · 언어 슬롯 줄 · 탭 · Compound 항목이 한꺼번에 늘어난다'),
         ('항목', '표시', '—',
          '<b>O{n} · 확장 {k} — 9 스리랑카어 · 10 필리핀어(따갈로그어)</b> · 언어가 없으면 <b>지정된 언어 없음</b>'),
         ('항목', '클릭', '그 코드 추가', '셀렉트는 첫 줄로 돌아가고 고른 코드는 목록에서 빠진다'),
         ('(사용 중)', '—', '<b>고를 수 없음</b>',
          '그 확장 코드 Book 을 <b>다른 고객사 교재</b>가 쓴다 — 흐리게 · 끝에 <b>(사용 중)</b>'),
         ('따로 등록됨', '—', '막지 않는다',
          '<b>같은 사용 고객사</b>가 확장 코드 Book 을 따로 등록해 둔 교재(옛 방식)는 막지 않고 고치지 않는다 · '
          '목록 [확장] 점선 칩 (<code>PRJ-03</code>)'),
         ('모두 고른 뒤', '—', '셀렉트 잠김', '<b>확장 언어 코드를 모두 골랐습니다</b>')]))

    boards.append((
        'S15', '확장 언어 코드 저장 차단 — 다른 고객사 교재가 쓰는 Book', '오류',
        '<code>PC-366</code> — 고른 확장 코드의 Book 을 <b>다른 고객사 교재</b>가 쓰게 됐으면(고른 뒤 Book 을 바꿨거나 그 사이 등록됨) '
        '칩이 빨갛게 <b>🌐 O{n} 사용 중</b>(툴팁에 그 교재)으로 바뀌고, 저장할 때 확인창으로 막는다. 입력값은 그대로 남는다.',
        frame('PRJ-03', '교재(책) 편집 수정', content(ext={'picked': (964, 965), 'taken': 965}),
              overlay=ovl('저장할 수 없습니다', TAKEN_MSG), height=2400),
        [('🌐 O{n} 사용 중', '표시', '—',
          '툴팁 <b>확장 {k} · S{s}/O{n}/B{b} — {언어} · 다른 고객사가 사용 중 — {편집 프로젝트} · {교재명}</b>'),
         ('[저장]', '클릭', '<b>차단</b>',
          '<b>S{s}/O{o}/B{b} 은 이미 다른 고객사 교재가 쓰고 있습니다 — {편집 프로젝트} · {교재명}. '
          '확장 언어 코드에서 O{o} 를 빼거나 다른 Book 을 고르세요.</b>'),
         ('따로 등록됨(같은 사용 고객사)', '[저장]', '<b>막지 않는다</b>', '데이터는 그대로'),
         ('[확인]', '클릭', 'S13', '입력값은 그대로 남는다 · 칩 ✕ 로 빼거나 Book 을 바꾼다')]))

    boards.append((
        'S16', '확장 언어 코드 빼기 — casterN 연동 값 확인', '확인창',
        '<code>PC-366</code> — 고른 확장 코드 칩의 <b>✕</b> 를 눌렀을 때 그 코드 탭에 casterN 연동 값(ncp2 파일명 · 크기 · 최종수정 등)이 '
        '있으면 함께 지워지므로 한 번 묻는다. 값이 없으면 묻지 않고 바로 뺀다. 뺀 결과는 [저장] 해야 남는다.',
        frame('PRJ-03', '교재(책) 편집 수정', content(ext={'picked': (964, 965)}),
              overlay=ovl('확장 언어 코드 빼기',
                          'O965 의 casterN 연동 값(ncp2 파일명 · 최종수정 등)이 함께 지워집니다. 빼시겠습니까?', danger=True),
              height=2400),
        [('칩 ✕ (연동 값 있음)', '클릭', '확인창',
          '<b>O{n} 의 casterN 연동 값(ncp2 파일명 · 최종수정 등)이 함께 지워집니다. 빼시겠습니까?</b>'),
         ('[확인]', '클릭', '빼기',
          '칩 · 언어 슬롯 줄 · casterN 탭이 빠지고 Compound 상한이 4 줄어든다(값이 있는 칸은 보인다)'),
         ('[취소] · [✕]', '클릭', 'S13', '그대로'),
         ('칩 ✕ (연동 값 없음)', '클릭', '바로 빼기', '확인창 없음')]))

    boards.append((
        'S17', '하위 고객사로 들어온 교재 추가 — 「상위 ▸ 하위」 · 고른 확장 없음', '기본',
        '<code>PC-368</code> <code>PC-359</code> <code>PC-366</code> <code>PC-367</code> — <code>PRJ-02</code> 에서 <b>하위 고객사</b>'
        '(예: Common-21 코드를 쓰는 전북교육청)를 골라 교재 목록 → <b>[＋ 교재(책) 추가]</b> 로 들어오면 머리말이 '
        '<b>{상위} ▸ {하위}</b> 다. 할당된 S/O 셀렉트에서 그룹 <b>기본 코드</b>는 <b>· 기본</b>, <b>확장 코드</b>는 '
        '<b>· 확장 언어 (기본 O{n})</b> 로 보이고 고를 수 없다. 새 교재는 확장 언어 코드를 <b>고르지 않은 채</b> 열려 — '
        '언어 슬롯 줄 · casterN 코드 탭이 없고 Compound 는 <b>4언어까지</b>다.',
        frame('PRJ-03', '교재(책) 추가',
              content(mode='new', empty=True, badge='new', discount=False, mod_date=False,
                      ext={'picked': (), 'so_open': True}, sub=SUB_CU),
              height=2260),
        [('머리말', '표시', '—',
          '<b>{상위 고객사} ▸ {하위 고객사}</b> · 툴팁 <b>하위 고객사 — {상위} 코드를 쓰는 {하위}</b> · 교재 추가 · 수정 · [복제] 모두'),
         ('[목록] · [추가]', '클릭', '<code>PRJ-03</code>', '<b>그 하위 고객사로 거른</b> 교재 목록으로 돌아간다([목록]은 입력값 저장 안 함)'),
         ('사용 고객사 필터를 바꾼 뒤 진입', '—', '하위 표시 없음',
          '목록에서 사용 고객사 필터를 다른 값으로 바꿨으면 하위 고객사를 붙이지 않는다'),
         ('할당된 S / O', '선택', '—',
          '<b>S{s} / O{n} · 기본</b> · <b>S{s} / O{n} · 확장 언어 (기본 O{n})</b> = 고를 수 없음 · '
          '새 교재의 첫 좌표도 확장 코드는 건너뛴다 · 공유면 뒤에 <b>· 공유</b> <code>PC-359</code>'),
         ('확장 언어 코드', '—', '<b>(0 / 20개)</b>', '<b>선택한 확장 언어 코드 없음</b> — 새 교재는 고르지 않은 채 연다 <code>PC-366</code>'),
         ('Compound', '—', '<b>4언어까지</b>',
          'Compound 5~8언어 칸은 감춘다 · 확장 코드를 고르면 4언어씩 늘어난다 <code>PC-367</code>'),
         ('casterN 연동', '—', '탭 없음', '확장 코드를 고르기 전에는 기본 코드 한 벌')]))

    boards.append((
        'S18', '그룹 교재 완료 조건 미충족 — 코드 탭마다 ncp2 최종수정', '오류',
        '<code>PC-359</code> <code>PC-366</code> — 그룹 기본 코드 교재는 <b>모든 코드 탭</b>(기본 + 고른 확장 코드)에 '
        'ncp2 최종수정이 있어야 완료된다. 진행 상태 줄에 비어 있는 코드가 나오고, [완료] 를 누르면 확인창으로 막는다. '
        '완료를 해제하면 확장 코드 탭의 최종수정도 비운다(이력은 기본 코드만).',
        frame('PRJ-03', '교재(책) 편집 수정',
              content(ext={'picked': (964, 965)}, need_date=True, need_codes='O964 · O965',
                      cn={'done': {964: False, 965: False}}),
              overlay=ovl('완료할 수 없습니다',
                          'ncp2 최종수정 날짜가 비어 있는 코드가 있어 완료할 수 없습니다 — O964 · O965. '
                          'casterN 에서 코드마다 ncp2 를 내보낸 뒤 완료로 변경하세요.'),
              height=2400),
        [('진행 상태 줄 안내', '표시', '—',
          '<b>※ 완료하려면 ncp2 최종수정 날짜가 필요합니다 — 비어 있는 코드 O{n} · O{n} · O{n} 외 {k}개.</b> — 3개까지 보이고 나머지는 「외 {k}개」'),
         ('[완료]', '클릭', '<b>차단</b>',
          '<b>ncp2 최종수정 날짜가 비어 있는 코드가 있어 완료할 수 없습니다 — O{n}(기본) · O{n} …. '
          'casterN 에서 코드마다 ncp2 를 내보낸 뒤 완료로 변경하세요.</b>'),
         ('코드 탭', '표시', '—', 'ncp2 최종수정이 있는 탭만 <b>✓</b> · 툴팁 <b>ncp2 최종수정 {날짜}</b> / <b>ncp2 최종수정 없음</b>'),
         ('비어 있는 탭', '직접 입력', '완료 가능', '직접 넣은 ncp2 최종수정도 완료 조건을 채운다 <code>PC-361</code> (S19)'),
         ('완료 해제', '[진행중]', '최종수정 비움', '기본 코드 날짜는 이력으로(S5) · 확장 코드 탭 날짜는 이력 없이 비운다')]))

    boards.append((
        'S19', 'casterN 연동 — 직접 등록 · 자동 우선', '변형',
        '<code>PC-361</code> <code>PC-369</code> — casterN 연동 5칸(ncp2 파일명 · ncp2 파일 크기 (byte) · ncp2 최종수정 (완료 필수) · '
        '편집 유형 · 최초 등록일, 한 줄)은 자동으로 채워지지만 연동 전에는 <b>직접 등록</b>할 수 있다. 직접 넣은 칸은 항목명 뒤 '
        '<b>· 직접</b> 이 붙는다. casterN 에서 그 칸 값이 들어오면 <b>자동 값이 우선</b>해 덮어쓰고 「직접」을 지운다 — '
        '들어오지 않은 칸은 직접 값이 남는다. 옛 <b>프로젝트명 (.nproj)</b> 입력란은 없앴다(받은 값은 데이터에 남는다).',
        frame('PRJ-03', '교재(책) 편집 수정',
              content(cn={'manual': ('f', 'nmod'),
                                    'vals': {'f': 'BUMBLEBEE_ENG_01_T', 'bytes': None, 'nmod': '2026-11-20',
                                             'src': None, 'd': None}}),
              height=2260),
        [('입력', '직접 입력', '「· 직접」',
          'ncp2 파일명(글자) · 파일 크기(숫자) · 최종수정 · 최초 등록일(날짜) · 편집 유형(셀렉트 '
          '<b>미연동 / casterN 마스터 계정 / Resource Studio</b>) · 비어 있으면 자리표시 <b>미연동</b>'),
         ('casterN 자동 값 들어옴', '자동', '<b>자동이 우선</b>', '그 칸을 덮어쓰고 「직접」 표시를 지운다 · 안 들어온 칸은 직접 값 유지'),
         ('직접 넣은 ncp2 최종수정', '—', '완료 가능', '완료 조건을 채운다 · 완료되면 다른 칸처럼 잠긴다'),
         ('코드별 탭', '—', '탭마다', '그룹 기본 코드 교재는 탭(기본 · 확장 k)마다 따로 직접 등록 — 같은 규칙 (S13)'),
         ('프로젝트명 (.nproj)', '—', '<b>삭제</b>',
          '입력란을 두지 않는다 <code>PC-369</code> — casterN 에서 들어온 .nproj 파일명은 데이터에 남는다 · 목록의 NCP2명 = ncp2 파일명'),
         ('ncp2 파일명 중복', '—', '검사 안 함', '직접 등록도 같다 <code>PC-282</code> (S12)'),
         ('ⓘ', '클릭', '말풍선', CASTER_TIP)]))

    intro = ('교재(책) 1권의 <b>편집 내역과 정산 근거를 입력</b>하는 화면. '
             '<b>등록과 수정이 같은 화면</b>이며 진입 방법으로 모드가 갈린다 — '
             '<code>PRJ-03</code>의 [＋ 교재(책) 추가] = <b>교재(책) 추가</b>, '
             '교재 행 클릭 = <b>교재(책) 편집 수정</b>. '
             '여기서 입력한 <b>페이지 수와 심볼·기능 수량이 곧 청구액</b>이 되므로 '
             '편집팀 작업 기록이자 정산 입력 화면이다. '
             '단가 3단 구조 — 기본 단가 → 고객사 단가(<code>MEM-02</code>) → <b>이 화면의 할인</b>.')
    return page(CODE, NAME, PRD, intro, boards)
