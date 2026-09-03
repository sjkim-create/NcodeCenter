# -*- coding: utf-8 -*-
"""PRJ-04 교재(책) 등록·수정 — 모달이 아니라 별도 페이지 2개.

  추가  /projects/editing/{owner}/book/new
  수정  /projects/editing/{owner}/book/{idx}
편집 상세(PRJ-03)의 목록·KPI·필터를 감추고 이 폼만 보여준다.
고객사 머리말은 유지되어 어느 고객사의 교재인지 맥락이 남는다.
"""
from shell import page, frame
from p_tkt01 import sel, field

CODE, NAME = 'PRJ-04', '교재(책) 등록·수정'
PRD = 'docs/prd/PRJ-04_교재(책) 등록·수정.md'

# lib/pricing.ts RATE_ITEMS — (항목, 기본단가). 소리펜 14 / 필기펜 5
SOUND_Q = (('Ncode 편집(기본)', 1000, 1240), ('Compound 2언어', 1300, 0),
           ('Compound 3언어', 1600, 0), ('Compound 4언어', 1900, 0),
           ('Compound 5언어', 2200, 0), ('Compound 6언어', 2500, 0),
           ('Compound 7언어', 2800, 0), ('Compound 8언어', 3100, 0),
           ('슬롯전환', 3000, 0), ('그룹재생', 5000, 0), ('게임', 50000, 0),
           ('프롬프트 편집', 50000, 0), ('RAG 데이터 업로드', 50000, 0),
           ('4도 Ncode 출력', 1000, 0))
# 필기펜 심볼 입력 3항목 `PC-084`
PEN_Q = (('기본 편집', 1000, 0), ('Custom', 1500, 0), ('노트서버 업로드', 10000, 0))

MEMOS = (('2', '처리', '2026-08-20 14:12', '김순정', '2차 교정 반영 · 심볼 12개 추가'),
         ('1', '요청', '2026-08-18 09:30', '박지훈', '3권 게임 기능 2건 추가 요청'))


def status_row(st='진행중', locked=False, need_date=False, released=False):
    chips = ''.join('<span class="chip%s">%s</span>' % (' on' if s == st else '', s)
                    for s in ('진행중', '완료', '보류'))
    note = ''
    if locked:
        note = ('<div class="toast warn" style="margin-top:10px">🔒 완료 처리되어 내용이 잠겼습니다. '
                '수정하려면 진행중으로 변경하세요.</div>')
    elif need_date:
        note = ('<div class="inline-err" style="margin-top:8px">'
                '※ 완료하려면 ncp2 최종수정 날짜가 필요합니다.</div>')
    if released:
        note += ('<div style="font-size:11.5px;color:#6b7280;margin-top:8px">'
                 '· 2026-08-16 <span style="color:#9ca3af">(완료 해제 2026-08-24 10:05 · 김순정)</span></div>')
    return ('<div class="card"><div class="bd"><div class="row" style="gap:10px">'
            '<div class="lbl" style="margin:0">진행 상태</div>'
            '<div class="row" style="gap:5px">%s</div><div style="flex:1"></div>'
            '<span class="btn sm" style="color:#dc2626">교재 삭제</span></div>%s</div></div>'
            % (chips, note))


def coord(mode='edit', share=False, sub_err=False):
    so = ('<div class="inp ro">S3 / O17 <span style="color:#9ca3af;font-size:11px">(수정 불가)</span></div>'
          if mode == 'edit' else sel('S3 / O17'))
    # 좌표만 보여 준다 `PC-083` — 종류(N·G)는 뒤의 [코드 종류]에서 고른다
    hint = ('수정 모드에서는 <b>변경 불가</b> · 종류 배지는 붙이지 않는다 <code>PC-083</code>'
            if mode == 'edit'
            else '할당된 S/O가 여러 개면 선택 · <b>좌표만</b> 나온다 <code>PC-083</code>')
    sub = ''
    if share:
        sub = field('사용 고객사', sel('아들과딸' if not sub_err else '사용 고객사를 선택하세요',
                                  ph=sub_err, err=sub_err), True,
                    '공유 코드입니다. 사용 고객사를 입력하세요.' if sub_err else None,
                    '공유(커먼) 코드 Owner인 경우에만 표시·<b>필수</b> <code>P-12</code>')
    # 코드 종류는 **Book 다음**에 온다 `PC-054`
    kind_f = field('코드 종류', sel('PDS3'), True, None,
                   '<b>PDS2 · PDS3 · PDS4 · OID</b> 중 선택 <code>PC-052</code>')
    book_f = field('Book (사용 가능 번호)', sel('B431'), True, None,
                   '입력칸에 번호를 <b>바로 칠 수 있고</b>, 목록 아래 <b>＋ 100개 더 보기</b> 를 눌러도 '
                   '<b>셀렉트가 닫히지 않는다</b> <code>PC-054</code> <code>PC-057</code>')
    return ('<div class="card"><div class="hd">코드 좌표</div><div class="bd">'
            '<div class="g3">%s%s%s</div>'
            '<div class="g3" style="margin-top:10px">%s</div></div></div>'
            % (field('할당된 S / O', so, True, None, hint), book_f, kind_f, sub))


def info(empty=False, mod_date=True):
    def v(x, ph=False):
        return '<div class="inp%s">%s</div>' % (' ph' if ph else '', x)
    e = empty
    return ('<div class="card"><div class="hd">교재 정보</div><div class="bd">'
            '<div class="g3">%s%s%s</div>'
            '<div class="g4" style="margin-top:10px">%s%s%s%s</div>'
            '<div class="g3" style="margin-top:10px">%s%s%s</div>'
            '<div class="g2" style="margin-top:10px">%s%s</div>'
            '</div></div>'
            % (field('교재명', v('교재명을 입력하세요' if e else '범블비 잉글리시 전집 1권', e),
                     False, None, '목록·검색에 표시'),
               field('ncp2 파일명', v('ncp2 파일명' if e else 'BUMBLEBEE_ENG_01', e)),
               field('ncp2 파일 크기(byte)', v('0' if e else '109,316,656'), False, None,
                     '서버 저장 용량 파악용'),
               field('타입', sel('소리펜')),
               field('Start Page', v('0'), False, None, '0 이상'),
               field('Total Page', v('0' if e else '48'), False, None,
                     '<b>적용비 계산 기준</b>'),
               field('발급일자 (Ncode 발급일)', v('2026-08-26' if e else '2019-04-11')),
               field('ncp2 최종수정',
                     v('입력 안 함' if not mod_date else '2019-08-16', not mod_date),
                     False, None, '<b>완료 처리의 선행 조건</b>'),
               field('발급인', sel('김순정'), False, None, '코드 할당자·사용자 명단에서 선택'),
               '<div></div>',
               field('펜 모델', '<div class="row" style="gap:5px;flex-wrap:wrap">'
                              '<span class="chip on">C90 ✕</span><span class="chip on">C91 ✕</span>'
                              '<span class="chip">＋ 추가</span></div>', False, None,
                     '여러 개 선택 가능'),
               field('편집방식', '<div class="row" style="gap:5px;flex-wrap:wrap">'
                              '<span class="chip on">기본 ✕</span>'
                              '<span class="chip on">투터치 ✕</span>'
                              '<span class="chip">＋ 추가</span></div>', False, None,
                     '여러 개 선택 가능')))


def qty(pen='소리펜'):
    """소리펜(좌 1.6fr · 4열 14칸) / 필기펜(우 1fr · 2열 5칸) — 항상 함께 표시된다."""
    def block(title, items, cols, grow):
        cells = ''.join(
            '<div class="fld"><span class="lbl" style="font-size:10.5px">%s</span>'
            '<div class="inp" style="padding:5px 8px;font-size:12px">%d</div></div>'
            % (lab, qv) for lab, _u, qv in items)
        return ('<div class="card" style="flex:%s;min-width:0"><div class="bd">'
                '<div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:8px">'
                '%s</div>'
                '<div style="display:grid;grid-template-columns:repeat(%d,1fr);gap:8px">%s</div>'
                '</div></div>' % (grow, title, cols, cells))
    return ('<div style="display:flex;gap:12px;align-items:stretch">%s%s</div>'
            '<div style="font-size:11.5px;color:#6b7280;line-height:1.7;margin-top:8px">'
            '페이지 단위 <b>Ncode 적용</b>은 Total Page로 자동 계산되므로 별도 수량을 '
            '입력하지 않습니다. 단가 정본은 정책 <code>P-16</code>, 고객사별 단가는 '
            '<code>MEM-02</code> 에서 지정합니다. '
            '필기펜은 <b>기본 편집 · Custom · 노트서버 업로드</b> 3항목 <code>PC-084</code>.</div>'
            % (block('소리펜 심볼 입력', SOUND_Q, 4, '1.6'),
               block('필기펜 심볼 입력', PEN_Q, 2, '1')))


def totals(pen='소리펜'):
    """심볼 입력 아래 파란 합산 줄 — 편집량 + 그 자리 정산."""
    s_sum, p_sum = (1240, 0) if pen == '소리펜' else (0, 726)
    pg = 48 if pen == '소리펜' else 40
    tot = s_sum + p_sum
    page_amt = pg * 500
    sym_amt = tot * 1000
    return ('<div class="card" style="background:#f5f9ff;border-color:#bfdbfe">'
            '<div class="bd">'
            '<div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap">'
            '<span style="font-size:13px">TOTAL PAGE '
            '<b style="color:#2563eb;font-size:17px">%d</b>'
            '<span style="color:#9ca3af;font-size:11px"> p</span></span>'
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
            '<span style="color:#9ca3af;font-size:11px"> (%dp × 500)</span></span>'
            '<span style="font-size:12.5px;color:#374151">편집·기능비 <b>₩%s</b>'
            '<span style="color:#9ca3af;font-size:11px"> (항목별 단가 합)</span></span>'
            '<span style="margin-left:auto;font-size:14px">청구액 '
            '<b style="color:#2563eb;font-size:18px">₩%s</b></span></div>'
            '</div></div>'
            % (pg, '{:,}'.format(s_sum), '{:,}'.format(p_sum), '{:,}'.format(tot),
               '{:,}'.format(page_amt), pg, '{:,}'.format(sym_amt),
               '{:,}'.format(page_amt + sym_amt)))


def settle(badge='fixed', discount=True):
    if badge == 'fixed':
        b = '<span class="tag b">등록 시 단가 (2019-04-11) · 적용 500 / 편집 1,000</span>'
        sub = '저장 시점의 고객사 단가로 <b>고정</b>된 상태 — 이후 고객사 단가가 바뀌어도 이 교재는 그대로'
        warn = ''
    elif badge == 'changed':
        b = '<span class="tag b">등록 시 단가 (2019-04-11) · 적용 500 / 편집 1,000</span>'
        sub = '고정된 단가와 <b>현재 고객사 단가가 다릅니다</b>'
        warn = ('<div class="toast warn" style="margin-top:10px">'
                '⚠ 고객사 단가 변경됨 — <span class="btn sm" style="margin-left:6px">'
                '현재 단가로 갱신</span></div>')
    else:
        b = '<span class="tag">고객사 단가</span>'
        sub = '아직 고정 전(신규 교재) — <b>저장하면 현재 단가로 고정</b>됩니다'
        warn = ''
    rows = (('① 적용비 (페이지)', '48p × 500', '24,000'),
            ('② 편집·기능비', '심볼·기능 1,188 (항목별 단가 합)', '＋ 1,188,000'),
            ('③ 합계 (할인 전)', '적용비 + 편집·기능비', '1,212,000'))
    if discount:
        rows += (('④ 할인율 10%', '합계 기준', '−121,200'),)
        total = '1,090,800'
    else:
        total = '1,212,000'
    tr = ''.join('<tr><td>%s</td><td style="color:#6b7280">%s</td>'
                 '<td style="text-align:right%s">%s</td></tr>'
                 % (a, b_, ';color:#dc2626' if c.startswith('−') else '', c)
                 for a, b_, c in rows)
    return ('<div class="card"><div class="hd">정산 (교재 단위 조정)</div><div class="bd">'
            '<div class="row" style="gap:8px;flex-wrap:wrap">%s'
            '<span style="font-size:11.5px;color:#6b7280">%s</span></div>%s'
            '<div class="g3" style="margin-top:12px">%s%s%s</div>'
            '<div class="row" style="justify-content:flex-end;margin-top:8px">'
            '<span class="btn sm">할인 초기화</span></div>'
            '<div style="border:1px solid #e5e7eb;border-radius:9px;overflow:hidden;margin-top:12px">'
            '<table><tr><th>단계</th><th>산식</th>'
            '<th style="width:110px;text-align:right">금액</th></tr>%s'
            '<tr style="background:#f0fdf9"><td><b>청구액</b></td><td></td>'
            '<td style="text-align:right"><b style="color:#065f46;font-size:14px">%s</b></td></tr>'
            '</table></div></div></div>'
            % (b, sub, warn,
               field('할인율(%)', '<div class="inp">%s</div>' % ('10' if discount else '0'),
                     False, None, '합계(할인 전) 기준'),
               field('추가 할인액(₩)', '<div class="inp">%s</div>'
                     % ('10,000' if discount else '0'), False, None, '정액 차감'),
               field('할인 사유', '<div class="inp%s">%s</div>'
                     % ('' if discount else ' ph',
                        '재작업분 · 물량 협의' if discount else '예) 재작업분 · 물량 협의')),
               tr, total))


def extra(hi=None):
    rows = ''.join('<tr%s><td style="color:#9ca3af">%s</td>'
                   '<td><span class="tag %s">%s</span></td>'
                   '<td style="font-size:11.5px;color:#6b7280">%s<br>%s</td><td>%s</td>'
                   '<td style="white-space:nowrap">%s</td></tr>'
                   % (' style="background:#fff7ed"' if hi == no else '', no,
                      {'요청': 'b', '처리': 'g', '메모': ''}[k], k, w, ts, txt,
                      '<span class="lnk">수정</span>'
                      '<span class="lnk" style="color:#dc2626">삭제</span>' if w == '김순정'
                      else '<span style="color:#cbd5e1;font-size:11px">본인 글만</span>')
                   for no, k, ts, w, txt in MEMOS)
    links = ''.join('<div class="g2" style="margin-bottom:8px">'
                    '<div class="fld"><span class="lbl">%s · 링크(URL)</span>'
                    '<div class="inp%s">%s</div></div>'
                    '<div class="fld"><span class="lbl">설명</span>'
                    '<div class="inp ph">설명</div></div></div>'
                    % (n, '' if u else ' ph', u or 'https://')
                    for n, u in (('세부내역', 'https://drive.neolab.net/wj/detail'),
                                 ('출력용파일', ''), ('APP 데이터', '')))
    return ('<div class="card"><div class="hd">부가 정보 · 업무 메모</div><div class="bd">'
            '<div class="g3" style="margin-bottom:10px">%s</div>%s'
            '<div class="lbl" style="margin:14px 0 6px">업무 메모</div>'
            '<div class="row" style="gap:6px;margin-bottom:8px">'
            '<span class="chip on">요청</span><span class="chip">처리</span>'
            '<span class="chip">메모</span></div>'
            '<div class="inp ph" style="min-height:48px">내용 입력 · Enter 기록 · Shift+Enter 줄바꿈</div>'
            '<div style="font-size:11px;color:#9ca3af;margin-top:6px">'
            '<b>본인이 작성한 메모만</b> 수정·삭제할 수 있습니다.</div>'
            '<div style="border:1px solid #e5e7eb;border-radius:9px;overflow:hidden;margin-top:10px">'
            '<table><tr><th style="width:34px">No</th><th style="width:60px">종류</th>'
            '<th style="width:120px">작성자 / 시각</th><th>내용</th>'
            '<th style="width:100px">작업</th></tr>%s</table></div>'
            '</div></div>'
            % (field('세트 개수', '<div class="inp">1</div>'), links, rows))


def content(mode='edit', st='진행중', locked=False, need_date=False, released=False,
            share=False, sub_err=False, empty=False, pen='소리펜', badge='fixed',
            discount=True, mod_date=True, hi=None, toast=''):
    save = '추가' if mode == 'new' else '저장'
    return (toast
            + status_row(st, locked, need_date, released) + '<div style="height:12px"></div>'
            + coord(mode, share, sub_err) + '<div style="height:12px"></div>'
            + info(empty, mod_date) + '<div style="height:12px"></div>'
            + qty(pen) + '<div style="height:12px"></div>'
            + totals(pen) + '<div style="height:12px"></div>'
            + settle(badge, discount) + '<div style="height:12px"></div>'
            + extra(hi)
            + '<div class="row" style="align-items:center;gap:8px;margin-top:18px;'
              'padding-top:14px;border-top:1px solid #eef0f4">'
              '%s<span style="flex:1"></span><div class="btn gho">목록</div>'
              '<div class="btn pri">%s</div></div>'
            % ('<div class="btn gho" style="color:#dc2626;border-color:#fecaca">교재 삭제</div>'
               if (mode != 'new' and not locked) else '', save))


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
              height=2100),
        [('진행 상태', '선택', '진행중 / 완료 / 보류', '기본값 <b>진행중</b>'),
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
         ('Total Page', '입력', '적용비 계산', '<b>적용비 계산 기준(페이지 수)</b>'),
         ('심볼·기능 수량', '입력', '편집·기능비 계산', '각 항목 <b>수량 × 단가</b>'),
         ('[추가]', '클릭', '<code>PRJ-03</code> 갱신', '상단 알림 <b>추가됨</b>'),
         ('저장(자동)', '기록', '<code>LOG-01</code>', '등록 = <b>교재 추가</b>'),
         ('저장(자동, 공유 코드)', '반영', '<code>SOB-01</code>', '지도에 사용 고객사·편집 상태 반영'),
         ('사용 가능한 Book이 없을 때', '이동', '<code>SOB-01</code> → <code>SOB-02</code>', '코드 추가 할당'),
         ('[목록]', '클릭', '<code>PRJ-03</code>', '교재 목록으로 · 입력값은 저장되지 않는다')]))

    boards.append((
        'S2', '수정 모드 · 교재(책) 편집 수정', '기본',
        '<code>PRJ-03</code>의 <b>교재 행 클릭</b>으로 진입. 화면 제목 <b>교재(책) 편집 수정</b>. '
        'S/O는 <b>(수정 불가)</b>로 표기된다.',
        frame('PRJ-03', '교재(책) 편집 수정', content(), height=2100),
        [('S / O', '—', '<b>수정 불가</b>', '수정 모드에서는 변경할 수 없다'),
         ('Book', '선택', '—', '사용 가능한 번호에서'),
         ('펜 모델 · 편집방식', '추가/삭제', '—', '여러 개 선택 가능'),
         ('[저장]', '클릭', '<code>PRJ-03</code> 갱신', '상단 알림 <b>수정됨</b> · 목록·집계·청구액 갱신'),
         ('저장(자동)', '기록', '<code>LOG-01</code>', '수정 = <b>교재 작업</b>'),
         ('[교재 삭제]', '클릭', 'S9 확인창', '')]))

    boards.append((
        'S3', '완료 상태 · 내용 잠금', '변형',
        'PRD §4.1 · §5 — <b>완료 처리하려면 ncp2 최종수정 날짜가 필요</b>하고, '
        '완료 상태에서는 <b>내용이 잠긴다</b>.',
        frame('PRJ-03', '교재(책) 편집 수정',
              content(st='완료', locked=True), height=2100),
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
                          '날짜를 입력한 뒤 완료로 변경하세요.'),
              height=2100),
        [('[완료]', '클릭', '<b>차단</b>',
          '<b>ncp2 최종수정 날짜가 비어 있어 완료할 수 없습니다. 날짜를 입력한 뒤 완료로 변경하세요.</b>'),
         ('인라인 안내', '표시', '—', '<b>※ 완료하려면 ncp2 최종수정 날짜가 필요합니다.</b>'),
         ('ncp2 최종수정', '입력', '완료 가능', '')]))

    boards.append((
        'S5', '완료 해제 이력', '변형',
        'PRD §4.1 — 완료를 해제하면 그때의 ncp2 최종수정 날짜가 <b>이력으로 보관</b>되고'
        '(해제 시각·해제자 포함) 화면에서 확인할 수 있다.',
        frame('PRJ-03', '교재(책) 편집 수정', content(released=True), height=2100),
        [('완료 해제 이력', '표시', '—', '<b>· {날짜} (완료 해제 {해제일시} · {해제자})</b>'),
         ('[완료]', '클릭', '재완료', 'ncp2 최종수정 날짜가 있으면 가능')]))

    boards.append((
        'S6', '공유 코드 · 사용 고객사 필수', '오류',
        '<code>P-12</code> — 공유(커먼) 코드 Owner의 교재는 <b>사용 고객사 입력이 필수</b>다. '
        '비우고 저장하면 확인창으로 막는다.',
        frame('PRJ-03', '교재(책) 편집 수정',
              content(share=True, sub_err=True),
              overlay=ovl('저장할 수 없습니다',
                          'S3/O21 는 공유 코드입니다. 사용 고객사를 입력하세요.'),
              height=2160),
        [('사용 고객사', '선택 (필수)', '—', '공유 코드 Owner일 때만 표시'),
         ('[저장]', '클릭', '<b>차단</b>',
          '<b>S{n}/O{n} 는 공유 코드입니다. 사용 고객사를 입력하세요.</b>'),
         ('저장 후', '반영', '<code>SOB-01</code>', '지도에 사용 고객사·편집 상태 반영')]))

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
        'S8', '필기펜 항목 · 할인 없음', '변형',
        'PRD §4.4 — 펜 종류에 따라 입력 항목이 갈린다. <b>필기펜</b>은 '
        '<b>기본 편집 · Custom · 노트서버 업로드</b> 3항목이다 <code>PC-084</code> — '
        'action 변경 편집 · 교원구몬/KEP 는 폐지했다(구 <code>none 편집비용</code> → <b>기본 편집</b>).',
        frame('PRJ-03', '교재(책) 편집 수정',
              content(pen='필기펜', discount=False), height=2020),
        [('타입 = 필기펜', '선택', '항목 전환', '소리펜 ⇄ 필기펜'),
         ('Custom · 교원구몬/KEP', '—', '<b>미확정</b>', '⚠ §7 — 단가 확정 대기'),
         ('할인율 · 추가 할인액', '입력', '청구액 조정', '0이면 할인 행이 산출 근거에 나오지 않는다'),
         ('[할인 초기화]', '클릭', '할인 없음으로', '')]))

    boards.append((
        'S9', '교재 삭제 확인창', '확인창',
        'PRD §4.7 · §5 — 확인 후 해당 교재 행이 <code>PRJ-03</code> 목록에서 제거된다.',
        frame('PRJ-03', '교재(책) 편집 수정', content(),
              overlay=ovl('교재 삭제', '이 책(교재) 편집 행을 삭제할까요?', danger=True),
              height=2100),
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
              height=2100),
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

    intro = ('교재(책) 1권의 <b>편집 내역과 정산 근거를 입력</b>하는 화면. '
             '<b>등록과 수정이 같은 화면</b>이며 진입 방법으로 모드가 갈린다 — '
             '<code>PRJ-03</code>의 [＋ 교재(책) 추가] = <b>교재(책) 추가</b>, '
             '교재 행 클릭 = <b>교재(책) 편집 수정</b>. '
             '여기서 입력한 <b>페이지 수와 심볼·기능 수량이 곧 청구액</b>이 되므로 '
             '편집팀 작업 기록이자 정산 입력 화면이다. '
             '단가 3단 구조 — 기본 단가 → 고객사 단가(<code>MEM-02</code>) → <b>이 화면의 할인</b>.')
    return page(CODE, NAME, PRD, intro, boards)
