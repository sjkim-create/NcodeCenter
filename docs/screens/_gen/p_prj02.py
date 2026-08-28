# -*- coding: utf-8 -*-
"""PRJ-02 편집 프로젝트 목록 + PRJ-03 편집 프로젝트 상세 (공용 화면 조립)"""
from shell import page, frame
from p_tkt01 import sel, field

CODE2, NAME2 = 'PRJ-02', '편집 프로젝트 목록'
PRD2 = 'docs/prd/PRJ-02_편집 프로젝트 목록.md'
CODE3, NAME3 = 'PRJ-03', '편집 프로젝트 상세'
PRD3 = 'docs/prd/PRJ-03_편집 프로젝트 상세.md'

# 고객사, 권수, 코드종류, 심볼, 사용자추가  — 고객사명 가나다순(영문 먼저)
EDIT_CUSTS = (('NeoLAB', 447, 'G', 60112, False), ('가쿠쇼', 73, 'N', 8460, False),
              ('구몬학습', 744, 'G', 118240, False), ('대교', 355, 'G', 52310, False),
              ('시원스쿨', 22, 'N', 2140, True), ('웅진씽크빅', 114, 'G', 18482, False),
              ('잉글리시에그', 115, 'G', 15870, False), ('케이크', 69, 'N', 7920, False),
              ('트윈클', 91, 'G', 11205, False), ('한솔교육', 156, 'G', 21044, False),
              ('헤르만헤세', 83, 'G', 9940, False))
MAXSYM = 118240

# No, 상태, 사용고객사, 교재명, 파일명, 코드, 타입, S/O/B, 페이지, 심볼,
# 편집방식, 발급일, 수정일, 원장건수, bytes, 청구액, 기준가·할인율
BOOKS = (
    (1, '완료', '한국뉴베리', '범블비 잉글리시 전집 1권', 'bumblebee_01.ncp2', 'G', '소리펜',
     (3, 17, 431), '1~48', 48, 1240, '기본, 투터치', '2019-04-11', '2019-08-16', 3,
     2418004, '1,264,000', None),
    (2, '완료', '한국뉴베리', '범블비 잉글리시 전집 2권', 'bumblebee_02.ncp2', 'G', '소리펜',
     (3, 17, 432), '1~48', 48, 1188, '기본, 투터치', '2019-04-11', '2019-08-16', 0,
     2311880, '1,090,800', ('1,212,000', 10)),
    (3, '진행중', '아들과딸', '범블비 잉글리시 전집 3권', 'bumblebee_03.ncp2', 'G', '소리펜',
     (3, 17, 433), '1~48', 48, 980, '기본', '2019-04-19', '2026-08-20', 5,
     1904220, '1,004,000', None),
    (4, '보류', None, '곰돌이 킨더 한글 1단계', 'kinder_h1.ncp2', 'G', '소리펜',
     (3, 17, 434), '1~36', 36, 0, '—', '2020-02-11', '—', 1,
     740112, '18,000', None),
    (5, '완료', '새알교육', '곰돌이 베이비 1단계', 'baby_01.ncp2', 'N', '필기펜',
     (3, 17, 435), '1~40', 40, 726, '기본, action', '2020-02-24', '2020-07-17', 0,
     1488640, '708,700', ('746,000', 5)),
)

STATE_C = {'완료': ('#dcfce7', '#166534'), '진행중': ('#eef6ff', '#2563eb'),
           '보류': ('#fef3c7', '#92400e')}



def top(kind='전체', search=''):
    """상단 전체 요약 한 줄 — 목록 기준으로 다시 계산된다."""
    if kind == 'PDS3(Ncode)':
        n, bk, sym, gb = 3, 164, 18520, 0.9
        cost, listed = '\u20a921,600,000', '\u20a922,300,000'
    elif search:
        n, bk, sym, gb = 1, 114, 18482, 1.1
        cost, listed = '\u20a925,087,000', '\u20a926,187,000'
    else:
        n, bk, sym, gb = 11, 2269, 325723, 12.4
        cost, listed = '\u20a9312,400,000', '\u20a9326,900,000'
    dc = ''
    if cost != listed:
        dc = ('<span style="color:#b91c1c;margin-left:5px">(기준가 %s · 할인 −%s)</span>'
              % (listed, '\u20a914,500,000' if not kind.startswith('PDS3') else '\u20a9700,000'))
    scope = (('<span style="color:#2563eb">· 필터 적용 (전체 11곳 / 2,269권)</span>')
             if (kind != '전체' or search)
             else '<span style="color:#9ca3af">· 편집현황 장부에 있는 업체만 표시</span>')
    it = lambda k, v, c='#111827': ('<span>%s <b style="color:%s">%s</b></span>' % (k, c, v))
    return ('<div style="display:flex;gap:18px;flex-wrap:wrap;font-size:12.5px;color:#6b7280;'
            'margin-bottom:12px">%s%s%s%s'
            '<span>청구액 <b style="color:#2563eb">%s</b>%s'
            '<span style="color:#9ca3af;margin-left:5px" title="기본 단가 적용 120 / 편집 85 · '
            '고객사 단가는 고객사 관리에서 지정">· 고객사 단가 기준</span></span>%s</div>'
            % (it('편집 고객사', n), it('편집 북코드', '{:,}'.format(bk)),
               it('총 심볼', '{:,}'.format(sym), '#2563eb'), it('리소스', '%.1fGB' % gb),
               cost, dc, scope))


def left(sel_cust='웅진씽크빅', kind='전체', search='', empty=False):
    ks = ''.join('<span style="flex:1;font-size:10.5px;padding:4px 2px;border-radius:7px;'
                 'text-align:center;white-space:nowrap;border:1px solid %s;background:%s;'
                 'color:%s;%s">%s</span>'
                 % ('#93c5fd' if k == kind else '#e5e7eb',
                    '#eef6ff' if k == kind else '#fff',
                    '#2563eb' if k == kind else '#6b7280',
                    'font-weight:700' if k == kind else '', k)
                 for k in ('전체', 'PDS3', 'PDS2', 'PDS4', 'OID'))
    sv = ('<div class="inp" style="padding-right:28px">%s'
          '<span style="position:absolute;right:6px;top:50%%;transform:translateY(-50%%);'
          'color:#9ca3af;font-size:16px">×</span></div>' % search) if search else \
         '<div class="inp ph">고객사 · owner 검색</div>'
    rows = EDIT_CUSTS
    if kind == 'PDS3(Ncode)':
        rows = tuple(r for r in rows if r[2] == 'N')
    elif kind == 'PDS2(Gcode)':
        rows = tuple(r for r in rows if r[2] == 'G')
    if search:
        rows = tuple(r for r in rows if search in r[0])
    if empty:
        rows = ()
    if not rows:
        body = ('<div style="font-size:12px;color:#9ca3af;padding:12px;text-align:center">'
                '결과 없음</div>')
    else:
        body = ''
        for nm, bk, k, sym, add in rows:
            on = (nm == sel_cust)
            badges = ''
            if add:
                badges += ('<span style="font-size:10px;background:#ecfdf5;color:#047857;'
                           'border-radius:5px;padding:2px 7px">신규</span>')
            badges += ('<span style="font-size:10px;background:%s;color:%s;border-radius:5px;'
                       'padding:2px 7px">%s</span>'
                       % ('#eef6ff' if k == 'N' else '#fef3c7',
                          '#2563eb' if k == 'N' else '#92400e', k))
            unit = ('북' if kind == '전체' else ('PDS3' if kind == 'PDS3(Ncode)' else 'PDS2'))
            dele = ('<span style="color:#dc2626;margin-left:8px">삭제</span>') if add else ''
            body += ('<div style="border:1px solid %s;background:%s;border-radius:10px;'
                     'padding:10px 12px;margin-bottom:6px%s">'
                     '<div style="display:flex;align-items:center;gap:6px">'
                     '<span style="font-weight:700;font-size:13px;flex:1;color:%s">%s</span>%s</div>'
                     '<div style="font-size:11px;color:#9ca3af;margin-top:2px">%s %s권%s</div>'
                     '<div style="display:flex;align-items:center;gap:6px;margin-top:6px">'
                     '<div style="flex:1;height:4px;background:#eef0f4;border-radius:3px;'
                     'overflow:hidden"><div style="width:%.0f%%;height:100%%;background:%s">'
                     '</div></div>'
                     '<span style="font-size:10.5px;color:%s;font-family:ui-monospace,monospace">'
                     '심볼 %s</span></div></div>'
                     % ('#93c5fd' if on else '#eef0f4', '#f5f9ff' if on else '#fff',
                        ';box-shadow:0 2px 8px rgba(95,143,240,.12)' if on else '',
                        '#1d4ed8' if on else '#111827', nm, badges,
                        unit, '{:,}'.format(bk), dele,
                        max(3, sym * 100.0 / MAXSYM), '#2563eb' if on else '#93c5fd',
                        '#1d4ed8' if on else '#6b7280', '{:,}'.format(sym)))
    cnt = '%d곳 표시%s' % (len(rows), (' · %s 보유' % kind) if kind != '전체' else '')
    return ('<div class="card" style="align-self:start"><div class="bd" style="padding:12px">'
            '<div style="display:flex;align-items:center;margin-bottom:8px">'
            '<div style="font-weight:700;font-size:13px;flex:1">고객사 선택</div>'
            '<span class="btn sm" style="background:#5f8ff0;color:#fff;border:0">'
            '＋ 고객사</span></div>'
            '<div style="display:flex;gap:4px;margin-bottom:8px">%s</div>'
            '<div style="position:relative;margin-bottom:10px">%s</div>'
            '<div style="font-size:11px;color:#9ca3af;margin-bottom:6px">%s</div>%s'
            '</div></div>' % (ks, sv, cnt, body))


def kpi_group(title, items, grow, accent=False):
    cells = ''
    for it in items:
        sub = ('<div style="font-size:10px;color:#9ca3af;margin-top:2px">%s</div>' % it[2]) \
            if len(it) > 2 and it[2] else ''
        cells += ('<div style="border:1px solid %s;border-radius:10px;padding:10px 12px;'
                  'background:%s;flex:1;min-width:0">'
                  '<div style="font-size:10.5px;color:#6b7280;white-space:nowrap">%s</div>'
                  '<div style="font-size:17px;font-weight:700;color:%s;white-space:nowrap">%s</div>'
                  '%s</div>'
                  % ('#a7f3d0' if accent else '#eef0f4', '#f0fdf9' if accent else '#fff',
                     it[0], '#065f46' if accent else '#111827', it[1], sub))
    return ('<div class="card" style="flex:%d;min-width:0"><div class="bd" style="padding:12px">'
            '<div style="font-size:11px;font-weight:700;color:%s;margin-bottom:8px">%s</div>'
            '<div style="display:flex;gap:8px">%s</div></div></div>'
            % (grow, '#065f46' if accent else '#6b7280', title, cells))


def basis_box(filtered=False, base_price=False, discount=True):
    """계산식 · 단가 근거 — 실물은 4블록 · maxHeight 70vh 스크롤."""
    if filtered:
        pg, sym, apply_amt = '220', '4,134', '110,000'
        sym_amt, listed, dc, dcp, cost, dcb = '4,134,000', '4,244,000', '158,500', '3.7', '4,085,500', '2'
    else:
        pg, sym, apply_amt = '15,410', '18,482', '7,705,000'
        sym_amt, listed, dc, dcp, cost, dcb = ('18,482,000', '26,187,000', '1,100,000',
                                               '4.2', '25,087,000', '2')
    if not discount:
        cost, dc = listed, None

    def line(label, detail, value, minus=False):
        return ('<tr><td style="padding:4px 0"><b>%s</b>'
                '<div style="font-size:10.5px;color:#6b7280">%s</div></td>'
                '<td style="padding:4px 0;text-align:right;font-family:ui-monospace,monospace;'
                'color:%s;white-space:nowrap">%s</td></tr>'
                % (label, detail, '#b91c1c' if minus else '#1e3a8a', value))

    calc = line('적용비용', '페이지 %s × 500' % pg, '₩%s' % apply_amt)
    calc += line('편집·기능비', '심볼·기능 %s (항목별 단가 합)' % sym, '＋ ₩%s' % sym_amt)
    calc += line('기준가', '고객사 단가 기준 합계', '₩%s' % listed)
    if dc:
        calc += line('할인 (%s%%)' % dcp, '할인 적용 교재 %s건' % dcb, '− ₩%s' % dc, True)
    calc += ('<tr style="border-top:2px solid #bfdbfe">'
             '<td style="padding:7px 0;font-weight:700">청구액</td>'
             '<td style="padding:7px 0;text-align:right;font-weight:700;font-size:14px;'
             'color:#2563eb;font-family:ui-monospace,monospace">₩%s</td></tr>' % cost)

    rate_note = ('— 웅진씽크빅 전용 단가 (기본 500/1,000)' if not base_price
                 else '— 전사 기본 단가')
    ftag = ('<span style="color:#2563eb"> (필터 5건 기준)</span>') if filtered else ''

    return ('<div style="position:absolute;z-index:30;top:28px;left:0;width:430px;'
            'max-height:70vh;overflow-y:auto;background:#fff;border:1px solid #e5e7eb;'
            'border-radius:10px;box-shadow:0 12px 32px rgba(15,23,42,.18);padding:14px;'
            'font-size:12px;color:#111827;text-align:left;line-height:1.6">'
            '<div style="font-weight:700;margin-bottom:2px">계산식 · 단가 근거</div>'
            '<div style="color:#9ca3af;margin-bottom:8px">단가는 3단계로 적용됩니다 — '
            '기본 단가 → 고객사 단가(고객사 관리) → 프로젝트 단가·할인(교재 편집 수정).</div>'

            '<div style="background:#f5f9ff;border:1px solid #bfdbfe;border-radius:8px;'
            'padding:9px 11px;margin-bottom:10px;color:#1e3a8a">'
            '<div style="font-weight:700;margin-bottom:5px">◼ 현재 집계 계산식%s</div>'
            '<table style="width:100%%;border-collapse:collapse;font-size:11.5px">%s</table>'
            '<div style="margin-top:6px;padding-top:6px;border-top:1px dashed #bfdbfe;'
            'color:#374151">적용 단가 <b>₩500</b>/페이지 · 편집 단가 <b>₩1,000</b>/심볼'
            '<span style="margin-left:6px;color:#6b7280">%s</span></div></div>'

            '<div style="font-weight:700;color:#111827;margin-bottom:4px">'
            '◼ 소리펜 변경후 단가 <span style="color:#dc2626">(전사 기본값)</span></div>'
            '<ul style="margin:0 0 6px;padding-left:16px;line-height:1.7">'
            '<li>적용 <b>₩500</b>/페이지 <span style="color:#9ca3af">(변경전 300)</span></li>'
            '<li>편집 <b>₩1,000</b>/심볼 <span style="color:#9ca3af">(변경전 900)</span></li>'
            '<li style="color:#9ca3af">전 고객사 공통(교원구몬·대교·웅진·YBM·크레버스 등). '
            '예외: 잉글리시에그 편집 변경전 600, 트윈클은 보드 단가'
            '(정규3장 50만·비정규1장 10만·코드재적용 장당 5만).</li></ul>'

            '<div style="border-top:1px solid #eef0f4;padding-top:8px;margin-bottom:2px;'
            'font-weight:700">◼ 개별 견적서 (참고)</div>'
            '<div style="font-weight:700;color:#2563eb;margin-bottom:2px">'
            '① 2026-07-16 · 양지사 플래너 4종</div>'
            '<ul style="margin:0 0 8px;padding-left:16px;line-height:1.7">'
            '<li>적용 <b>500원</b>/페이지 · 편집 <b>1,000~1,500원</b>/심볼 · '
            '노트서버 업로드 <b>10,000원</b>/건</li>'
            '<li style="color:#9ca3af">합계 ₩35,232,000 (VAT 별도)</li></ul>'
            '<div style="font-weight:700;color:#2563eb;margin-bottom:2px">'
            '② 2026-05-26 · 블루래빗 생생자연관찰</div>'
            '<ul style="margin:0 0 8px;padding-left:16px;line-height:1.7">'
            '<li>적용 <b>1,000원</b>/페이지 · 편집(기본) <b>2,000원</b>/심볼 · '
            '편집(프롬프트) <b>50,000원</b>/세션</li>'
            '<li style="color:#9ca3af">총 ₩30,514,000 (VAT 포함)</li></ul>'

            '<div style="border-top:1px solid #eef0f4;padding-top:8px;color:#374151;'
            'line-height:1.7"><div><b>정의</b></div>'
            '· 적용 = PDF 1페이지 당 (인쇄데이터에 Ncode 적용)<br>'
            '· 편집(기본) = <b>음원 재생 영역 1개 = 심볼</b> (mp3 개수와 다름)<br>'
            '· 프롬프트 = 대화(포코로) 세션 1개 당 · 별도 단가</div>'
            '<div style="text-align:right;margin-top:8px">'
            '<span class="lnk">닫기</span></div></div>'
            % (ftag, calc, rate_note))


def summary(filtered=False, base_price=False, discount=True, basis=False,
            unfilter=False, search='', share=False):
    if filtered:
        bk, pg, s_sym, p_sym, sym = '5', '220', '3,408', '726', '4,134'
        apply_amt, sym_amt, cost, dc = '₩110,000', '₩4,134,000', '₩4,085,500', '₩158,500'
        listed, dcp = '₩4,244,000', '3.7'
    else:
        bk, pg, s_sym, p_sym, sym = '114', '15,410', '17,756', '726', '18,482'
        apply_amt, sym_amt, cost, dc = ('₩7,705,000', '₩18,482,000', '₩25,087,000',
                                        '₩1,100,000')
        listed, dcp = '₩26,187,000', '4.2'
    if not discount:
        cost, dc = listed, None
    edit = kpi_group('편집량', (
        ('교재(책)·필터' if filtered else '교재(책)', bk, ''),
        ('TOTAL PAGE', pg, 'PDF 편집 대상'),
        ('소리펜 심볼 합', s_sym, ''), ('필기펜 심볼 합', p_sym, ''),
        ('심볼 합계', sym, '소리펜+필기펜')), 5)
    pay = kpi_group('정산', (
        ('적용비(페이지)', apply_amt, '%sp × 500' % pg),
        ('편집·기능비', sym_amt, '심볼·기능 %s (항목별 단가)' % sym),
        ('청구액', cost, ('할인 −%s' % dc) if dc else '할인 없음')), 3, True)

    unit = '적용 - 500원/페이지 · 편집(기본) - 1,000원/심볼'
    tags = ''
    if base_price:
        tags += ('<span title="고객사 전용 단가가 없어 전사 기본 단가로 계산합니다." '
                 'style="font-size:11px;background:#f3f4f6;color:#6b7280;border-radius:5px;'
                 'padding:2px 7px;font-weight:700">기본 단가 (신규 교재 기준) : %s</span>' % unit)
    else:
        tags += ('<span style="font-size:11px;background:#fef3c7;color:#92400e;'
                 'border-radius:5px;padding:2px 7px;font-weight:700">'
                 '고객사 단가 (신규 교재 기준) : %s</span>'
                 '<span style="font-size:11px;color:#9ca3af">항목별 단가는 고객사 관리 참조</span>'
                 '<span style="font-size:11px;background:#eef6ff;color:#2563eb;'
                 'border-radius:5px;padding:2px 7px">프로젝트 단가·할인 2건</span>' % unit)
    if dc:
        tags += ('<span title="할인 적용 교재 2건 · 기준가 %s" '
                 'style="font-size:11px;background:#fee2e2;color:#b91c1c;border-radius:5px;'
                 'padding:2px 7px;font-weight:700">할인 −%s (%s%%)</span>'
                 % (listed, dc, dcp))
    tags += ('<span style="font-size:12.5px">청구액 '
             '<b style="color:#2563eb;font-size:15px">%s</b></span>' % cost)
    tags += ('<div style="position:relative">'
             '<span style="display:inline-grid;place-items:center;width:22px;height:22px;'
             'border-radius:50%%;border:1px solid #bfdbfe;background:%s;color:%s;'
             'font-weight:700;font-size:12px" title="계산식 · 단가 근거">?</span>%s</div>'
             % ('#2563eb' if basis else '#eff6ff', '#fff' if basis else '#2563eb',
                basis_box(filtered, base_price, discount) if basis else ''))
    if unfilter:
        tags += ('<span class="btn sm" style="margin-left:auto;color:#2563eb;'
                 'white-space:nowrap">필터 해제 (5/114)</span>')
    sv = ('<div class="inp" style="width:%dpx;padding-right:26px">%s'
          '<span style="position:absolute;right:6px;top:50%%;transform:translateY(-50%%);'
          'color:#9ca3af;font-size:14px">×</span></div>'
          % (260 if share else 220, search)) if search else \
         ('<div class="inp ph" style="width:%dpx">%s</div>'
          % (260 if share else 220, '교재명·사용고객사 검색' if share else '교재명 검색'))
    tags += ('<div style="position:relative;margin-left:%s">%s</div>'
             % ('8px' if unfilter else 'auto', sv))

    return ('<div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap">%s%s</div>'
            '<div class="card" style="padding:10px 12px;margin-bottom:10px;font-size:12.5px;'
            'color:#374151;display:flex;gap:8px;align-items:center;flex-wrap:wrap">%s</div>'
            % (edit, pay, tags))


HEAD3 = ('No', '상태', '교재명', '코드', '타입', 'S/O/B', '페이지', '심볼 개수',
         '편집방식', '발급일', '최종 수정일', '메모', 'ncp2 크기(byte)', '정산 (청구액)')


def sob(s, o, b):
    out = ''
    for k, v, c in (('S', s, '#5f8ff0'), ('O', o, '#14b8a6'), ('B', b, '#8b5cf6')):
        out += ('<span style="display:inline-flex;align-items:center;gap:3px;'
                'border:1px solid #e5e7eb;border-radius:6px;padding:1px 5px 1px 1px;'
                'background:#fff;font-size:10.5px;margin-right:2px">'
                '<span style="background:%s;color:#fff;font-weight:700;font-size:9px;'
                'border-radius:4px;padding:1px 4px">%s</span>'
                '<span style="font-family:ui-monospace,monospace">%s</span></span>'
                % (c, k, v))
    return out


def book_list(rows=None, share=False, filtered=False, empty=False, sort=None,
              hf=False, page=True):
    cols = list(HEAD3)
    if share:
        cols.insert(2, '사용 고객사')
    th = ''
    for h in cols:
        k = 't' if h == '교재명' else ('d' if h == '발급일' else None)
        mark = ''
        if k:
            if sort and sort[0] == k:
                mark = ('<span style="margin-left:3px;color:#2563eb">%s</span>'
                        % ('▲' if sort[1] == 1 else '▼'))
            else:
                mark = '<span style="margin-left:3px;color:#d1d5db">↕</span>'
        th += ('<th style="text-align:center;%s">%s%s</th>'
               % ('cursor:pointer' if k else '', h, mark))
    fr = ''
    if hf:
        def fsel(v, w=62, lock=False):
            return ('<th style="padding:4px 6px;background:#fafbfc;'
                    'border-bottom:1px solid #eef0f4"><div class="inp" '
                    'style="min-width:%dpx;font-size:11px;padding:3px 6px;%s'
                    'display:flex;align-items:center;justify-content:space-between">%s'
                    '<span style="color:#9ca3af;font-size:9px">▾</span></div></th>'
                    % (w, 'background:#f3f4f6;color:#6b7280;' if lock else '', v))
        blank = ('<th style="padding:4px 6px;background:#fafbfc;'
                 'border-bottom:1px solid #eef0f4"></th>')
        fr = '<tr>' + blank + fsel('전체')
        if share:
            fr += fsel('전체', 100)
        fr += blank + fsel('PDS2', 58, True) + fsel('전체', 74) + blank * 3
        fr += fsel('편집방식 전체', 130) + blank * 5 + '</tr>'

    body = ''
    if empty:
        body = ('<tr><td colspan="%d" style="padding:24px;text-align:center;color:#9ca3af">'
                '결과 없음</td></tr>' % len(cols))
    else:
        for (no, st, cu, t, fn, k, ty, (s, o, b), prange, pg, sym, mth, d, nmod,
             logs, by, amt, dc) in (rows or BOOKS):
            bgc, fgc = STATE_C[st]
            cell_cu = ''
            if share:
                if cu:
                    v = ('<span style="font-size:11px;background:#f3e8ff;color:#7e22ce;'
                         'border-radius:5px;padding:2px 7px;font-weight:700">%s</span>' % cu)
                else:
                    v = ('<span style="color:#d97706" title="공유 코드인데 사용 고객사가 '
                         '비어 있습니다. 교재를 열어 입력하세요.">미입력</span>')
                cell_cu = ('<td style="font-size:11.5px;text-align:left;max-width:130px">%s</td>'
                           % v)
            dcv = ''
            if dc:
                dcv = ('<div style="font-size:10px;color:#9ca3af;font-weight:400">'
                       '<s>₩%s</s> <span style="color:#dc2626;font-weight:700">−%d%%</span>'
                       '</div>' % (dc[0], dc[1]))
            body += ('<tr>'
                     '<td style="color:#9ca3af;font-family:ui-monospace,monospace">%d</td>'
                     '<td><span style="font-size:10px;background:%s;color:%s;border-radius:5px;'
                     'padding:2px 7px;font-weight:700;white-space:nowrap">%s</span></td>%s'
                     '<td style="font-weight:600;text-align:left;max-width:200px">%s'
                     '<div style="color:#9ca3af;font-size:10.5px">%s</div></td>'
                     '<td><span style="font-size:11px;background:%s;color:%s;border-radius:5px;'
                     'padding:2px 7px">%s</span></td>'
                     '<td style="font-size:11px">%s</td><td>%s</td>'
                     '<td>%s<div style="font-size:10px;color:#9ca3af">%dp</div></td>'
                     '<td style="font-weight:700;white-space:nowrap">%s</td>'
                     '<td style="font-size:10.5px;color:#6b7280;text-align:left;'
                     'max-width:180px">%s</td>'
                     '<td style="font-size:11;color:#6b7280">%s</td>'
                     '<td style="font-size:11px;color:%s">%s</td>'
                     '<td>%s</td>'
                     '<td style="color:#9ca3af;font-family:ui-monospace,monospace;'
                     'font-size:11px">%s</td>'
                     '<td style="color:#2563eb;font-weight:600;white-space:nowrap">₩%s%s</td>'
                     '</tr>'
                     % (no, bgc, fgc, st, cell_cu, t, fn,
                        '#eef6ff' if k == 'N' else '#fef3c7',
                        '#2563eb' if k == 'N' else '#92400e', k, ty, sob(s, o, b),
                        prange, pg, '{:,}'.format(sym), mth, d,
                        '#374151' if nmod != '—' else '#d1d5db', nmod,
                        ('<span style="font-size:11px;background:#eef6ff;color:#2563eb;'
                         'border-radius:5px;padding:2px 7px">%d</span>' % logs) if logs
                        else '<span style="color:#d1d5db">0</span>',
                        '{:,}'.format(by), amt, dcv))
    pgn = ''
    if page and not empty:
        nums = ''.join('<span style="min-width:24px;text-align:center;font-size:11.5px;'
                       'padding:3px 6px;border-radius:6px;border:1px solid %s;background:%s;'
                       'color:%s">%d</span>'
                       % ('#93c5fd' if n == 1 else '#e5e7eb', '#eef6ff' if n == 1 else '#fff',
                          '#2563eb' if n == 1 else '#6b7280', n) for n in (1, 2, 3))
        pgn = ('<div style="display:flex;align-items:center;justify-content:space-between;'
               'gap:10px;padding:10px 14px;border-top:1px solid #eef0f4;flex-wrap:wrap">'
               '<div style="font-size:12px;color:#6b7280">전체 '
               '<b style="color:#111827">114</b>건 중 1~50 표시'
               '<span class="inp" style="display:inline-flex;align-items:center;'
               'margin-left:8px;font-size:12px;padding:3px 6px;width:auto">50건씩 '
               '<span style="color:#9ca3af;font-size:9px;margin-left:4px">▾</span></span></div>'
               '<div style="display:flex;align-items:center;gap:4px">'
               '<span style="font-size:11.5px;padding:3px 7px;border-radius:6px;'
               'border:1px solid #e5e7eb;color:#d1d5db">«</span>'
               '<span style="font-size:11.5px;padding:3px 7px;border-radius:6px;'
               'border:1px solid #e5e7eb;color:#d1d5db">‹</span>%s'
               '<span style="font-size:11.5px;padding:3px 7px;border-radius:6px;'
               'border:1px solid #e5e7eb;color:#6b7280">›</span>'
               '<span style="font-size:11.5px;padding:3px 7px;border-radius:6px;'
               'border:1px solid #e5e7eb;color:#6b7280">»</span>'
               '<span style="font-size:11.5px;color:#9ca3af;margin-left:6px">1 / 3</span>'
               '</div></div>' % nums)
    return ('<div class="card" style="padding:0;overflow:auto">'
            '<table style="text-align:center;min-width:1120px">%s%s%s</table>%s</div>'
            % ('<tr>' + th + '</tr>', fr, body, pgn))


def detail(empty=False, share=False, filtered=False, base_price=False, discount=True,
           list_empty=False, basis=False, unfilter=False, search='', sort=None,
           hf=False, toast3=''):
    if empty:
        return ('<div class="card"><div class="bd"><div class="empty" style="padding:90px 10px">'
                '<span class="em">✏️</span>좌측에서 고객사를 선택하세요.</div></div></div>')
    head = ('<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">'
            '<div style="font-size:18px;font-weight:700">웅진씽크빅</div>'
            '<span style="font-size:11px;background:#eef2f7;color:#475569;border-radius:5px;'
            'padding:2px 7px;font-family:ui-monospace,monospace">owner 17</span>'
            '<span style="font-size:11px;background:%s;color:%s;border-radius:5px;'
            'padding:2px 7px">%s</span>'
            '<div style="flex:1"></div>'
            '<span class="btn gho" style="margin-right:8px">초기화</span>'
            '<span class="btn pri">＋ 교재(책) 추가</span></div>'
            % ('#eef6ff' if share else '#fef3c7', '#2563eb' if share else '#92400e',
               'N' if share else 'G'))
    ts = ('<div class="toast" style="margin-bottom:10px">%s</div>' % toast3) if toast3 else ''
    return ('<div>%s%s%s%s</div>'
            % (head, ts, summary(filtered, base_price, discount, basis, unfilter,
                                 search, share),
               book_list(share=share, filtered=filtered, empty=list_empty, sort=sort,
                         hf=hf, page=not list_empty)))


# 첫 화면 — 특정 고객사가 아니라 전체 고객사 요약 표 (PC-038)
ALL_ROWS = (('가쿠쇼-1022', ('PDS3',), '73', '0', '0.0GB', '₩0'),
            ('교원구몬-10', ('PDS2', 'PDS3'), '186', '292,674', '22.5GB', '₩313,383,500'),
            ('교원도요새베트남-4', ('PDS3',), '290', '16,065', '0.0GB', '₩18,337,000'),
            ('한솔교육-25', ('PDS2', 'OID'), '147', '0', '18.2GB', '₩0'),
            ('웅진씽크빅-17', ('PDS2', 'OID'), '1,014', '412,905', '61.3GB', '₩512,004,000'))
KIND_C2 = {'PDS3': ('#eef6ff', '#2563eb'), 'PDS2': ('#fef3c7', '#d97706'),
           'PDS4': ('#f3e8ff', '#7c3aed'), 'OID': ('#ccfbf1', '#0f766e')}


def all_customers(kind='전체', n=71):
    chips = ''
    if kind != '전체':
        bg, fg = KIND_C2.get(kind, ('#eef6ff', '#2563eb'))
        chips = ('<span style="font-size:11px;background:%s;color:%s;font-weight:700;'
                 'border-radius:5px;padding:2px 7px">%s 보유</span>' % (bg, fg, kind))
    head = ('<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;'
            'flex-wrap:wrap"><b style="font-size:14px">전체 고객사</b>'
            '<span style="font-size:11px;background:#eef6ff;color:#2563eb;font-weight:700;'
            'border-radius:5px;padding:2px 7px">%d곳</span>%s'
            '<span style="font-size:11.5px;color:#9ca3af">고객사를 고르면 교재별 상세로 '
            '들어갑니다.</span></div>' % (n, chips))
    th = ''.join('<th>%s</th>' % h for h in ('고객사', '코드 종류', '북', '심볼', '리소스', '청구액'))
    body = ''
    for name, kinds, bk, sym, sz, amt in ALL_ROWS:
        ks = ''.join('<span style="font-size:10px;background:%s;color:%s;font-weight:700;'
                     'border-radius:5px;padding:2px 6px;margin-right:3px">%s</span>'
                     % (KIND_C2[k][0], KIND_C2[k][1], k) for k in kinds)
        body += ('<tr><td style="text-align:left;font-weight:600">%s</td>'
                 '<td style="text-align:left">%s</td>'
                 '<td style="font-family:ui-monospace,monospace">%s</td>'
                 '<td style="font-family:ui-monospace,monospace">%s</td>'
                 '<td style="font-family:ui-monospace,monospace;color:#6b7280">%s</td>'
                 '<td style="font-family:ui-monospace,monospace;font-weight:700;color:#1d4ed8">%s</td>'
                 '</tr>' % (name, ks, bk, sym, sz, amt))
    return (head + '<div class="card" style="padding:0;overflow:auto">'
            '<table style="text-align:center;min-width:720px"><tr>' + th + '</tr>'
            + body + '</table></div>')


def content(sel_cust='웅진씽크빅', kind='전체', search='', left_empty=False, all_view=False,
            empty_detail=False, share=False, filtered=False, base_price=False,
            discount=True, list_empty=False, toast='', top_row=True,
            basis=False, unfilter=False, bsearch='', sort=None, hf=False, toast3=''):
    head = top(kind, search) if top_row else ''
    return (toast + head
            + '<div style="display:flex;gap:16px;align-items:flex-start">'
              '<div style="width:280px;flex-shrink:0">%s</div>'
              '<div style="flex:1;min-width:0">%s</div></div>'
            % (left('' if all_view else sel_cust, kind, search, left_empty),
               all_customers(kind) if all_view else
               detail(empty_detail, share, filtered, base_price, discount, list_empty,
                      basis, unfilter, bsearch, sort, hf, toast3)))


OWNER_OPTS = (('N', 3, 306), ('N', 3, 307), ('G', 0, 88))


def prj05(step='cust', picked=0, direct=False):
    """편집 고객사 추가 모달 — step: cust(미선택) / owner(칩 선택) / none(할당 코드 없음)"""
    co = '- 고객사 선택 -' if step == 'cust' else ('시원스쿨' if direct else '대교')
    body = field('등록된 고객사 * (고객사 관리)', sel(co, ph=(step == 'cust')))
    if step == 'owner':
        chips = ''
        for i, (k, s, o) in enumerate(OWNER_OPTS):
            on = (i == picked)
            chips += ('<span style="display:inline-flex;align-items:center;gap:5px;'
                      'border:1px solid %s;background:%s;border-radius:9px;padding:5px 8px">'
                      '<span style="font-size:9px;font-weight:700;color:#fff;border-radius:5px;'
                      'padding:1px 5px;background:%s">%s</span>%s%s</span>'
                      % ('#93c5fd' if on else '#e5e7eb', '#eef6ff' if on else '#fff',
                         '#2563eb' if k == 'N' else '#d97706',
                         'PDS3' if k == 'N' else 'PDS2', sc('S', s), sc('O', o)))
        body += ('<div style="margin-top:12px">'
                 '<div style="font-size:12px;color:#6b7280;margin-bottom:6px">'
                 'Owner 코드 <span style="color:#dc2626">*</span> '
                 '<span style="color:#9ca3af">· 3개 중 선택</span></div>'
                 '<div style="display:flex;flex-wrap:wrap;gap:8px">%s</div>'
                 '<p style="font-size:11.5px;color:#9ca3af;margin:8px 0 0">선택한 Owner 코드가 '
                 '<b>편집 관리</b> 대상이 되어 코드 프로젝트·SOBP 맵에서 <b>편집</b> 플래그로 '
                 '표시됩니다.</p></div>' % chips)
    elif step == 'none':
        body += ('<div style="margin-top:12px">'
                 '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:9px;'
                 'padding:9px 11px;font-size:12px;color:#92400e;margin-bottom:10px">'
                 '<b>시원스쿨</b> 는 아직 할당된 코드가 없습니다. Owner 코드를 직접 입력하거나, '
                 '먼저 <b>SOBP 맵</b>에서 코드를 할당하세요.</div>'
                 '<div class="g2">%s%s</div></div>'
                 % (field('Owner (직접 입력)', '<div class="inp">306</div>', True),
                    field('코드 종류', sel('PDS3(Ncode)'))))
    ok = (step != 'cust')
    return ('<div class="ovl"><div class="mdl">'
            '<div class="mh"><div class="mt">편집 고객사 추가 '
            '<span class="tag">PRJ-05</span></div><div class="mx">✕</div></div>%s'
            '<p style="font-size:11.5px;color:#9ca3af;margin:12px 0 0">추가 후 우측 상세에서 '
            '<b>＋교재(책) 추가</b>로 편집 교재를 등록하세요.</p>'
            '<div class="mf"><div class="btn gho">취소</div>'
            '<div class="btn %s">추가</div></div></div></div>'
            % (body, 'pri' if ok else 'dis'))


def sc(k, v):
    c = {'S': '#5f8ff0', 'O': '#14b8a6'}[k]
    return ('<span style="display:inline-flex;align-items:center;gap:5px;border:1px solid #e5e7eb;'
            'border-radius:8px;padding:2px 6px 2px 2px;background:#fff;font-size:12px">'
            '<span style="background:%s;color:#fff;font-weight:700;font-size:10.5px;'
            'border-radius:6px;padding:2px 6px;min-width:12px;text-align:center">%s</span>'
            '<span style="font-family:ui-monospace,monospace;color:#111827">%s</span></span>'
            % (c, k, v))


def alertbox(msg):
    return ('<div class="ovl"><div class="mdl">'
            '<div class="mh"><div class="mt">확인</div><div class="mx">✕</div></div>'
            '<div style="font-size:13px;color:#374151;line-height:1.7">%s</div>'
            '<div class="mf"><div class="btn pri">확인</div></div></div></div>' % msg)


def confirmbox(msg):
    return ('<div class="ovl"><div class="mdl">'
            '<div class="mh"><div class="mt">확인</div><div class="mx">✕</div></div>'
            '<div style="font-size:13px;color:#374151;line-height:1.7">%s</div>'
            '<div class="mf"><div class="btn gho">취소</div>'
            '<div class="btn dan">삭제</div></div></div></div>' % msg)


NAV2 = [('고객사 카드', '클릭', '<code>PRJ-03</code>', '우측 상세가 그 고객사로 바뀐다'),
        ('발급 코드 확인', '이동', '<code>PRJ-01</code>', '코드 프로젝트'),
        ('코드 위치 확인', '이동', '<code>SOB-01</code>', 'SOBP 맵')]

H2 = 1240


def build2():
    B = []

    B.append((
        'S1', '첫 화면 — 전체 고객사', '기본',
        '좌 <b>280px</b> 고객사 목록 + 우 <b>전체 고객사 교재 목록</b>이 함께 있다. '
        '<b>특정 고객사를 미리 고르지 않는다</b> <code>PC-038</code> — 표·항목 셀렉트 필터·'
        '페이지네이션은 <b>고객사 상세(<code>PRJ-03</code>)와 같은 것</b>을 쓰고 '
        '앞에 <b>고객사</b> 열이 붙는다 <code>PC-040</code>. 전체 보기는 <b>조회 전용</b>이며, '
        '왼쪽에서 고객사를 고르면 수정할 수 있는 상세로 들어간다. '
        '상단 한 줄은 <b>지금 목록 기준</b> 집계이며 청구액은 <b>고객사 단가</b>로 계산한다 '
        '<code>P-16</code>.',
        frame('PRJ-02', '편집 프로젝트', content(all_view=True), height=H2),
        [('전체 고객사 표', '표시', '—',
          '상세와 같은 교재 표 + <b>고객사</b> 열 · 상단 집계는 전체 기준'),
         ('항목 셀렉트 필터', '선택', '목록 필터',
          '<b>상태 · 고객사 · 사용 고객사 · 코드(PDS2·PDS3·PDS4·OID) · 타입 · 편집방식</b>'),
         ('페이지네이션', '클릭', '페이지 이동',
          '<b>50 / 100 / 200 / 500 / 전체 보기</b> · <b>전체 {n}건 중 {a}~{b} 표시</b>'),
         ('전체 보기 편집', '—', '조회 전용',
          '교재 추가·수정·초기화 버튼이 나오지 않는다 — 고객사를 골라야 수정 가능'),
         ('좌측 고객사 카드', '클릭', 'S2 상세', '그 고객사의 교재별 상세로 들어간다'),
         ('[← 전체 고객사]', '클릭', 'S1', '상세에서 전체 화면으로 되돌아온다'),
         ('URL ?owner={n}', '진입', '해당 고객사 상세',
          '<code>SOB-01</code> [✏️ 편집으로 이동 →] 은 그 고객사로 바로 연다'),
         ('상단 요약', '표시', '—',
          '편집 고객사 · 편집 북코드 · 총 심볼 · 리소스 · <b>청구액</b>(할인 있으면 기준가·할인 표기)'),
         ('범위 안내', '표시', '—', '<b>· 편집현황 장부에 있는 업체만 표시</b>'),
         ('[＋ 고객사]', '클릭', 'S7 <code>PRJ-05</code>', '헤더 우측 파란 버튼'),
         ('고객사 카드', '클릭', '우측 상세 교체', '심볼 막대는 <b>목록 최대값</b> 기준'),
         ('정렬', '자동', '가나다순', '고객사명 오름차순'),
         ('<code>SOB-01</code> 에서 진입', '자동', '해당 고객사 선택',
          '[✏️ 편집으로 이동 →] 로 오면 그 Owner 의 고객사가 선택된 상태로 열린다')] + NAV2))

    B.append((
        'S2', '코드 종류 필터 · 고객사 상세', '필터',
        '<code>P-02</code> <code>PC-037</code> — <b>전체 / PDS3 / PDS2 / PDS4 / OID</b> 5칸이 '
        '균등하게 놓인다. 코드 종류는 교재 행의 <b>(종류값, Section)</b> 으로 판별한다 — '
        '<b>OID</b>(옛 IDS 포함)로 작업한 교재도 여기서 걸러 본다. '
        '고르면 목록뿐 아니라 <b>상단 요약 · 카드 권수 · 우측 상세 집계</b>가 모두 '
        '그 종류의 교재만으로 다시 계산된다.',
        frame('PRJ-02', '편집 프로젝트',
              content(sel_cust='시원스쿨', kind='PDS3(Ncode)', filtered=True), height=H2 - 120),
        [('코드 종류 칩', '클릭', '목록·집계 재계산', '교재(행) 단위로 걸린다'),
         ('표시 수', '자동', '—', '<b>3곳 표시 · PDS3(Ncode) 보유</b>'),
         ('OID 필터', '클릭', 'OID 보유 고객사',
          'OID 로 작업한 교재를 가진 고객사만 — <b>book 미분할</b> 교재도 포함된다 '
          '(예: 한솔교육-25 『Ready Readers Book』·『신기한 영어나라』)'),
         ('고객사 배지', '자동', '—', '<b>PDS3 · PDS2 · PDS4 · OID</b> 라벨로 표시'),
         ('카드 권수', '자동', '—', '<b>북</b> → <b>PDS3</b> 로 바뀐다'),
         ('범위 안내', '자동', '—', '<b>· 필터 적용 (전체 11곳 / 2,269권)</b> 파랑'),
         ('우측 상세', '자동', '같은 필터 적용', '상세 목록·정산도 그 종류만')] + NAV2))

    B.append((
        'S3', '고객사 · owner 검색', '필터',
        '<b>고객사명과 owner 번호</b>를 함께 찾는다. 입력하면 오른쪽에 <b>×</b> 가 나타나고, '
        '누르면 검색어가 지워진다.',
        frame('PRJ-02', '편집 프로젝트',
              content(sel_cust='웅진씽크빅', search='웅진', filtered=True), height=H2 - 260),
        [('검색', '입력', '목록·집계 재계산', '고객사명 + owner'),
         ('×', '클릭', '검색 해제', 'S1 로 복귀'),
         ('범위 안내', '자동', '—', '검색도 <b>필터 적용</b> 으로 친다')] + NAV2))

    B.append((
        'S4', '검색 결과 없음', '빈 상태',
        '조건에 맞는 고객사가 없을 때. 목록 자리에 <b>결과 없음</b> 만 남는다. '
        '<b>우측 상세는 이전 선택을 그대로 유지</b>한다.',
        frame('PRJ-02', '편집 프로젝트',
              content(search='없는업체', left_empty=True), height=H2 - 300),
        [('목록', '표시', '—', '<b>결과 없음</b>'),
         ('우측 상세', '—', '유지', '선택이 풀리지 않는다'),
         ('해제', '×  클릭', 'S1', '')] + NAV2))

    B.append((
        'S5', '사용자 추가 항목 — 신규 · 삭제', '분기',
        '<code>PRJ-05</code> 로 직접 추가한 고객사에는 <b>신규</b> 배지가 붙고 '
        '<b>삭제</b> 를 쓸 수 있다. <b>편집 장부에서 온 항목은 삭제할 수 없다.</b>',
        frame('PRJ-02', '편집 프로젝트', content(sel_cust='시원스쿨'), height=H2),
        [('신규 배지', '표시', '—', '이 화면에서 추가한 항목만'),
         ('[삭제]', '클릭', 'S11 확인창',
          '그 고객사와 <b>직접 추가한 교재가 함께</b> 사라진다'),
         ('장부 항목', '—', '<b>삭제 없음</b>', '삭제 표시 자체가 나오지 않는다')] + NAV2))

    B.append((
        'S6', '고객사 미선택', '빈 상태',
        '우측에 안내만 나오는 상태. <b>편집 장부에 고객사가 하나도 없을 때만</b> 생기므로 '
        '⚠ <b>실제로는 거의 보이지 않는다</b> — 삭제 후에도 장부의 첫 고객사가 자동 선택된다.',
        frame('PRJ-02', '편집 프로젝트',
              content(empty_detail=True), height=H2 - 500),
        [('우측', '표시', '—', '<b>좌측에서 고객사를 선택하세요.</b>'),
         ('발생 조건', '참고', '—', '장부·추가 항목이 <b>모두 비었을 때</b>')] + NAV2))

    B.append((
        'S7', 'PRJ-05 · 편집 고객사 추가 — 고객사 선택', '모달',
        '편집 장부에 없는 고객사를 편집 대상으로 올린다. <b>수정 기능은 없다</b>(추가 전용). '
        '먼저 <code>MEM-01</code> 에 등록된 고객사를 고른다. '
        '고르기 전에는 <b>[추가]</b> 가 눌리지 않는다.',
        frame('PRJ-02', '편집 프로젝트', content(), overlay=prj05('cust'), height=H2),
        [('등록된 고객사 *', '선택', 'S8 또는 S9',
          '<code>MEM-01</code> 등록 고객사만 · 가나다 정렬'),
         ('[추가]', '—', '비활성', '고객사·Owner 를 모두 골라야 활성'),
         ('[추가]', '강제 실행', '확인창',
          '<b>고객사 관리에 등록된 고객사를 선택하세요.</b>'),
         ('[취소] · ✕', '클릭', '<code>PRJ-02</code>', '변경 없음')]))

    B.append((
        'S8', 'PRJ-05 · Owner 코드 선택', '모달',
        '그 고객사가 <b>보유한 Owner</b> 를 <b>SOBP 칩</b>(코드 종류 + S + O)으로 보여준다. '
        '눌러서 고르며, 여러 개면 <b>· {n}개 중 선택</b> 이 붙는다. '
        '하나뿐이면 <b>자동으로 선택</b>된다.',
        frame('PRJ-02', '편집 프로젝트', content(), overlay=prj05('owner'), height=H2),
        [('Owner 칩', '클릭', '선택', '<b>코드 프로젝트 발급 내역</b> 기준'),
         ('선택 효과', '참고', '<code>PRJ-01</code> · <code>SOB-01</code>',
          '그 Owner 가 <b>편집</b> 플래그로 표시된다'),
         ('[추가]', '클릭', '목록에 반영',
          '같은 고객사·owner 가 이미 있으면 <b>새로 만들지 않고 그 항목으로 이동</b>'),
         ('추가 후', '안내', '—',
          '<b>추가 후 우측 상세에서 ＋교재(책) 추가로 편집 교재를 등록하세요.</b>')]))

    B.append((
        'S9', 'PRJ-05 · 할당된 코드 없음 (직접 입력)', '모달',
        '아직 <code>SOB-02</code> 로 코드를 받지 않은 고객사를 고른 경우. '
        '노란 안내가 뜨고 <b>Owner 를 직접 입력</b>하며 코드 종류도 함께 지정한다.',
        frame('PRJ-02', '편집 프로젝트', content(),
              overlay=prj05('none', direct=True), height=H2),
        [('안내', '표시', '—',
          '<b>{고객사} 는 아직 할당된 코드가 없습니다. Owner 코드를 직접 입력하거나, '
          '먼저 SOBP 맵에서 코드를 할당하세요.</b>'),
         ('Owner (직접 입력) *', '입력', '—', '예: 306'),
         ('코드 종류', '선택', '—', 'PDS3(Ncode) / PDS2(Gcode)'),
         ('권장', '이동', '<code>SOB-01</code> → <code>SOB-02</code>',
          '먼저 코드를 할당하는 쪽이 정상 흐름')]))

    B.append((
        'S10', 'PRJ-05 · 검증 확인창', '오류',
        '<b>[추가]</b> 를 눌렀을 때 빠진 값이 있으면 확인창으로 막는다.',
        frame('PRJ-02', '편집 프로젝트', content(),
              overlay=prj05('cust')
                      + alertbox('고객사 관리에 등록된 고객사를 선택하세요.'), height=H2),
        [('고객사 미선택', '[추가]', '확인창',
          '<b>고객사 관리에 등록된 고객사를 선택하세요.</b>'),
         ('Owner 미선택', '[추가]', '확인창',
          '<b>Owner 코드를 선택하세요. (여러 개면 하나를 고르세요)</b>'),
         ('[확인]', '클릭', '모달 유지', '입력값은 그대로 남는다')]))

    B.append((
        'S11', '고객사 삭제 확인창', '확인창',
        '사용자가 추가한 고객사를 지운다. <b>그 고객사에 직접 추가한 교재도 함께</b> 사라지므로 '
        '확인창으로 한 번 막는다.',
        frame('PRJ-02', '편집 프로젝트', content(sel_cust='시원스쿨'),
              overlay=confirmbox('이 고객사(및 추가한 교재)를 삭제할까요?'), height=H2),
        [('[삭제]', '클릭', '확인창', '<b>이 고객사(및 추가한 교재)를 삭제할까요?</b>'),
         ('[삭제] 확정', '클릭', '목록에서 제거',
          '선택 중이었으면 <b>장부의 첫 고객사</b>로 옮겨간다'),
         ('[취소]', '클릭', '<code>PRJ-02</code>', '변경 없음'),
         ('장부 데이터', '—', '<b>삭제 불가</b>', '이 화면에서 추가한 항목만 지울 수 있다')]))

    intro = ('편집(casterN) 대상 고객사를 왼쪽에서 고르고 <b>같은 화면 오른쪽</b>에서 '
             '그 고객사의 편집 내역·정산(<code>PRJ-03</code>)을 본다. '
             '<b>사용 서비스 = casterN</b> 으로 할당된 코드가 이 화면의 관리 대상이다 '
             '<code>P-14</code>.<br>'
             '상단 한 줄 요약과 카드 수치는 모두 <b>지금 목록 기준</b>으로 다시 계산된다. '
             'S7~S10 은 <code>PRJ-05</code> 편집 고객사 추가 모달이다.')
    return page(CODE2, NAME2, PRD2, intro, B)


NAV3 = [('[＋ 교재(책) 추가]', '클릭', '<code>PRJ-04</code> (등록)', ''),
        ('교재 행', '클릭', '<code>PRJ-04</code> (수정)', '행 어디를 눌러도 열린다'),
        ('코드 위치 확인', '이동', '<code>SOB-01</code>', 'SOBP 맵')]

H3 = 1320


def build3():
    B = []

    B.append((
        'S1', '기본 — 편집 내역과 정산', '기본',
        '<code>PRJ-02</code> 에서 고객사를 고르면 <b>같은 화면 오른쪽</b>에 나온다. '
        '편집량(페이지·심볼)이 곧 청구 근거라 <b>편집팀의 작업 관리 화면이자 '
        '재무팀의 정산 근거 화면</b>이다. 지표는 <b>편집량</b>(수량)과 <b>정산</b>(금액) '
        '두 묶음으로 나뉜다. 청구액 = <b>적용비(페이지 × 적용단가) + 편집·기능비 − 할인</b> '
        '<code>P-16</code>.',
        frame('PRJ-02', '편집 프로젝트', content(), height=H3),
        [('헤더', '표시', '—', '고객사명 · <b>owner {번호}</b> · 코드 종류 배지'),
         ('[초기화]', '클릭', 'S12 확인창', '엑셀 시드로 되돌린다'),
         ('적용비(페이지)', '표시', '—', '아래에 <b>{n}p × {단가}</b>'),
         ('편집·기능비', '표시', '—', '아래에 <b>심볼·기능 {n} (항목별 단가)</b>'),
         ('청구액', '표시', '—', '아래에 <b>할인 −{n}</b> 또는 <b>할인 없음</b>'),
         ('페이지 열', '표시', '—', '<b>{시작}~{끝}</b> + 아래 <b>{n}p</b>'),
         ('메모 열', '표시', '—', '⚠ 메모 글이 아니라 <b>업무 원장(요청·처리·메모) 건수</b>')]
        + NAV3))

    B.append((
        'S2', '고객사 전용 단가 · 할인 적용', '분기',
        '<code>PC-018</code> — 고객사 관리에서 항목별 전용 단가를 지정한 경우. '
        '주황 배지로 바뀌고 <b>프로젝트 단가·할인 {n}건</b>, <b>할인 −{금액} ({n}%)</b> 이 '
        '함께 뜬다. 목록의 정산 칸에도 <b>취소선 기준가 + 할인율</b>이 붙는다.',
        frame('PRJ-02', '편집 프로젝트', content(), height=H3),
        [('고객사 단가 배지', 'hover', '툴팁',
          '고객사 관리에서 지정한 <b>전용 단가(항목별)</b>'),
         ('프로젝트 단가·할인', 'hover', '툴팁',
          '고객사 단가와 다른 단가·할인이 걸린 교재 수 — 단가는 각 행의 정산 칸에'),
         ('할인 배지', 'hover', '툴팁', '적용 교재 수 · 기준가'),
         ('행 정산', '표시', '—', '<b><s>기준가</s> −{n}%</b>'),
         ('단가 적용 시점', '참고', '<code>PC-027</code>',
          '교재는 <b>등록 시점 단가로 고정</b> — 단가를 올려도 기존 교재 금액은 그대로')]
        + NAV3))

    B.append((
        'S3', '기본 단가 (전용 단가 없음)', '분기',
        '고객사 전용 단가가 없으면 <b>전사 기본 단가</b>로 계산한다. 배지가 회색으로 바뀌고 '
        '<b>프로젝트 단가·할인</b> 표시가 사라진다.',
        frame('PRJ-02', '편집 프로젝트',
              content(base_price=True, discount=False), height=H3),
        [('기본 단가 배지', 'hover', '툴팁',
          '<b>고객사 전용 단가가 없어 전사 기본 단가로 계산합니다.</b>'),
         ('청구액', '표시', '—', '<b>할인 없음</b>'),
         ('전용 단가 지정', '이동', '<code>MEM-02</code>', '고객사 등록·수정에서 항목별 단가 입력')]
        + NAV3))

    B.append((
        'S4', '계산식 · 단가 근거 펼침', '분기',
        '단가 줄 끝의 <b>?</b> 버튼을 누르면 산출 근거가 펼쳐진다. '
        '내용이 길어 <b>세로로 스크롤</b>되며(최대 화면 높이의 70%), '
        '<b>4개 블록</b>으로 구성된다 — ① 현재 집계 계산식 ② 소리펜 변경후 단가(전사 기본값) '
        '③ 개별 견적서(참고) ④ 정의. ①의 수치는 <b>지금 화면(필터 반영)</b> 기준이다.',
        frame('PRJ-02', '편집 프로젝트', content(basis=True), height=H3),
        [('?', '클릭', '펼침 · 접힘', '누를 때마다 토글 · 단가 줄 <b>왼쪽 아래</b>로 열린다'),
         ('3단계 안내', '표시', '—',
          '<b>기본 단가 → 고객사 단가(고객사 관리) → 프로젝트 단가·할인(교재 편집 수정)</b>'),
         ('① 현재 집계 계산식', '표시', '—',
          '<b>적용비용 → 편집·기능비 → 기준가 → 할인 → 청구액</b> 표 + '
          '아래에 <b>적용 단가 · 편집 단가</b>와 전용/기본 구분'),
         ('① 필터 중일 때', '표시', '—', '제목 옆에 <b>(필터 {n}건 기준)</b> 파랑'),
         ('① 미등록 고객사', '표시', '—',
          '<b>※ 고객사 관리에 등록되지 않아 기본 단가로 계산됩니다.</b> 주황'),
         ('② 소리펜 변경후 단가', '표시', '—',
          '적용 <b>₩500</b>/페이지(변경전 300) · 편집 <b>₩1,000</b>/심볼(변경전 900) · '
          '예외(잉글리시에그·트윈클) 안내'),
         ('③ 개별 견적서', '표시', '—',
          '양지사 플래너 4종 · 블루래빗 생생자연관찰 <b>2건</b> — 참고용 실제 견적'),
         ('④ 정의', '표시', '—',
          '적용 = PDF 1페이지 당 · 편집(기본) = <b>음원 재생 영역 1개 = 심볼</b>'
          '(mp3 개수와 다름) · 프롬프트 = 대화(포코로) 세션 1개 당'),
         ('[닫기]', '클릭', '접힘', '')] + NAV3))

    B.append((
        'S5', '공유 코드 Owner — 사용 고객사 열', '분기',
        '<code>P-12</code> — 공유(커먼) 코드를 쓰는 Owner 면 <b>교재명 왼쪽에 「사용 고객사」 '
        '열</b>이 추가되고 그 열의 필터도 함께 나타난다. 검색창도 '
        '<b>교재명·사용고객사 검색</b> 으로 바뀐다. 값이 비면 <b>미입력</b>(주황)으로 표시된다.',
        frame('PRJ-02', '편집 프로젝트',
              content(share=True, sel_cust='NeoLAB'), height=H3),
        [('사용 고객사 열', '표시', '—', '공유 코드일 때만 · 보라 배지'),
         ('미입력', 'hover', '툴팁',
          '<b>공유 코드인데 사용 고객사가 비어 있습니다. 교재를 열어 입력하세요.</b>'),
         ('사용 고객사 필터', '선택', '행 필터', '그 열 아래 드롭다운'),
         ('검색', '입력', '교재명 + 사용 고객사', '검색창이 넓어진다'),
         ('입력', '행 클릭', '<code>PRJ-04</code>', '교재를 열어 사용 고객사를 넣는다')]
        + NAV3))

    B.append((
        'S6', '머리글 필터 · 코드 필터 잠금', '필터',
        '머리글 <b>아래 줄</b>에 필터가 붙는다 — <b>상태 · (사용 고객사) · 코드 · 타입 · '
        '편집방식</b> 5종. <code>PRJ-02</code> 에서 코드 종류를 고르면 이 화면의 '
        '<b>코드 필터가 그 값으로 고정·잠긴다</b>(회색).',
        frame('PRJ-02', '편집 프로젝트',
              content(kind='PDS2(Gcode)', filtered=True, hf=True, unfilter=True),
              height=H3),
        [('상태', '선택', '행 필터', '진행중 / 완료 / 보류'),
         ('코드', '—', '<b>잠금</b>',
          '<code>PRJ-02</code> 필터가 걸리면 회색으로 고정 — <b>목록의 PDS 필터로 고정됨</b>'),
         ('타입', '선택', '행 필터', '소리펜 / 필기펜 / 교원구몬·KEP'),
         ('편집방식', '선택', '행 필터', '<b>편집방식 전체</b> 가 기본'),
         ('지표', '자동', '재계산', '교재 지표가 <b>교재(책)·필터</b> 로 바뀐다')] + NAV3))

    B.append((
        'S7', '정렬 — 교재명 · 발급일', '분기',
        '정렬 가능한 열은 <b>교재명 · 발급일</b> 둘뿐이다. 머리글을 누르면 '
        '<b>오름 → 내림 → 해제</b> 3단으로 돈다. 정렬 중이면 <b>▲▼</b>(파랑), '
        '아니면 <b>↕</b>(회색).',
        frame('PRJ-02', '편집 프로젝트', content(sort=('t', 1)), height=H3),
        [('교재명', '클릭', '오름 → 내림 → 해제', '3번 누르면 원래 순서로'),
         ('발급일', '클릭', '오름 → 내림 → 해제', ''),
         ('그 외 열', '클릭', '<b>동작 없음</b>', '정렬 대상이 아니다'),
         ('기본', '—', '정렬 없음', '엑셀 시드 순서 그대로')] + NAV3))

    B.append((
        'S8', '교재명 검색', '필터',
        '교재명으로 거른다. 공유 코드 Owner 면 <b>사용 고객사까지</b> 함께 찾는다. '
        '입력하면 <b>×</b> 가 나타난다.',
        frame('PRJ-02', '편집 프로젝트',
              content(bsearch='범블비', filtered=True, unfilter=True), height=H3),
        [('검색', '입력', '행 필터 · 1페이지로', '입력할 때마다 페이지가 1로 돌아간다'),
         ('×', '클릭', '검색 해제', ''),
         ('공유 코드', '참고', '—', '<b>교재명·사용고객사 검색</b> 으로 바뀐다')] + NAV3))

    B.append((
        'S9', '필터 해제', '필터',
        '필터가 하나라도 걸리면 단가 줄 오른쪽에 <b>필터 해제 ({보이는}/{전체})</b> 버튼이 '
        '나타난다. 누르면 <b>상태·사용 고객사·코드·타입·편집방식·검색</b>이 한 번에 풀린다.',
        frame('PRJ-02', '편집 프로젝트',
              content(filtered=True, unfilter=True, hf=True), height=H3),
        [('[필터 해제]', '표시', '—', '괄호 안은 <b>보이는 건수 / 전체 건수</b>'),
         ('[필터 해제]', '클릭', 'S1 복귀', '검색어까지 함께 지워진다'),
         ('코드 잠금', '참고', '—',
          '<code>PRJ-02</code> 에서 건 코드 필터는 <b>이 버튼으로 풀리지 않는다</b>')]
        + NAV3))

    B.append((
        'S10', '페이지네이션', '분기',
        '교재가 많으면 나눠서 본다. 왼쪽에 <b>전체 {n}건 중 {a}~{b} 표시</b> 와 '
        '<b>건수 선택</b>(50 / 100 / 200 / 500 / 전체 보기), 오른쪽에 페이지 이동이 있다.',
        frame('PRJ-02', '편집 프로젝트', content(), height=H3),
        [('건수 선택', '선택', '1페이지로', '50 / 100 / 200 / 500 / <b>전체 보기</b>'),
         ('« ‹ › »', '클릭', '페이지 이동', '처음 · 이전 · 다음 · 끝'),
         ('숫자', '클릭', '그 페이지로', '현재 페이지는 파랑'),
         ('{현재}/{전체}', '표시', '—', '오른쪽 끝'),
         ('필터 변경', '자동', '1페이지로', '')] + NAV3))

    B.append((
        'S11', '목록 결과 없음', '빈 상태',
        '조건에 맞는 교재가 없을 때. 표 자리에 <b>결과 없음</b> 만 남고 '
        '<b>페이지네이션이 사라진다</b>. 위쪽 지표는 <b>0 기준</b>으로 다시 계산된다.',
        frame('PRJ-02', '편집 프로젝트',
              content(bsearch='없는교재', list_empty=True, unfilter=True), height=H3 - 300),
        [('표', '표시', '—', '<b>결과 없음</b>'),
         ('페이지네이션', '—', '숨김', ''),
         ('지표', '자동', '0 기준', '교재(책)·필터 = 0'),
         ('해제', '[필터 해제] · ×', 'S1', '')] + NAV3))

    B.append((
        'S12', '초기화 확인창', '확인창',
        '입력한 편집 내역을 <b>엑셀 시드 상태</b>로 되돌린다. 되돌릴 수 없어 확인창으로 막는다. '
        '완료되면 상단에 <b>초기화됨</b> 알림이 뜬다.',
        frame('PRJ-02', '편집 프로젝트', content(toast3='초기화됨'),
              overlay=confirmbox('엑셀 시드로 초기화할까요?'), height=H3),
        [('[초기화]', '클릭', '확인창', '<b>엑셀 시드로 초기화할까요?</b>'),
         ('확정', '클릭', '시드로 복원', '상단 알림 <b>초기화됨</b>'),
         ('[취소]', '클릭', '변경 없음', ''),
         ('저장 실패', '알림', '—',
          '<b>⚠ 브라우저 저장 공간이 가득 차 저장하지 못했습니다. '
          '다른 사이트 데이터를 정리한 뒤 다시 저장하세요.</b>')] + NAV3))

    intro = ('한 고객사의 <b>편집 내역과 정산</b>을 보는 화면. '
             '<code>PRJ-02</code> 목록에서 고객사를 고르면 <b>같은 화면 오른쪽</b>에 열린다.<br>'
             '편집량(페이지·심볼)이 곧 청구 근거라, <b>편집팀의 작업 관리</b>이자 '
             '<b>재무팀의 정산 근거</b>가 되는 화면이다. '
             '단가는 <b>기본 → 고객사 → 프로젝트</b> 3단으로 적용되고, '
             '교재는 <b>등록 시점 단가로 고정</b>된다 <code>PC-027</code>.')
    return page(CODE3, NAME3, PRD3, intro, B)
