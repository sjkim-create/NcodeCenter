# -*- coding: utf-8 -*-
"""NcodeCenter 화면 정의서(HTML) 공통 — 디자인 토큰 · 앱 셸 · 페이지 조립

web/components/ui.tsx · AppShell.tsx 의 토큰을 그대로 옮긴다.
출력 HTML은 파일 하나로 완결(self-contained)되어 Figma 임포트(html.to.design)가 가능해야 한다.
"""

BLUE = "#5f8ff0"

CSS = r"""
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0}
body{background:#eef1f6;color:#111827;
  font-family:'Pretendard','Apple SD Gothic Neo','Malgun Gothic',system-ui,-apple-system,sans-serif;
  font-size:13px;line-height:1.5;-webkit-font-smoothing:antialiased}
a{color:inherit}

/* ── 도구 바 (화면 정의서 UI · 실제 제품 아님 / Figma 임포트 시 제외) ───────── */
.tools{position:sticky;top:0;z-index:100;background:#0f172a;color:#e2e8f0;
  display:flex;align-items:center;gap:14px;padding:10px 20px;flex-wrap:wrap;
  box-shadow:0 2px 12px rgba(15,23,42,.3)}
.tools .code{font-weight:800;font-size:14px;color:#fff;letter-spacing:.3px}
.tools .nm{font-size:13px;color:#94a3b8}
.tools .sp{flex:1}
.tools .cnt{font-size:11.5px;color:#94a3b8}
.tools button{background:#1e293b;color:#cbd5e1;border:1px solid #334155;border-radius:7px;
  padding:5px 11px;font-size:11.5px;cursor:pointer;font-family:inherit}
.tools button:hover{background:#334155;color:#fff}
.tools button.on{background:#5f8ff0;border-color:#5f8ff0;color:#fff;font-weight:700}
.jump{display:flex;gap:5px;flex-wrap:wrap;width:100%;padding-top:2px}
.jump a{background:#1e293b;border:1px solid #334155;border-radius:6px;padding:4px 9px;
  font-size:11px;color:#cbd5e1;text-decoration:none}
.jump a:hover{background:#5f8ff0;border-color:#5f8ff0;color:#fff}

/* ── 상태 보드 ───────────────────────────────────────────────── */
.wrap{padding:26px 30px 90px;display:flex;flex-direction:column;gap:34px}
.board{scroll-margin-top:96px}
.board.hide{display:none}
.blabel{display:flex;align-items:baseline;gap:10px;margin-bottom:3px;flex-wrap:wrap}
.blabel .sid{background:#0f172a;color:#fff;border-radius:6px;padding:3px 9px;
  font-size:11.5px;font-weight:800;letter-spacing:.4px}
.blabel .stitle{font-size:15px;font-weight:800;color:#0f172a}
.blabel .stag{background:#e0e7ff;color:#3730a3;border-radius:5px;padding:2px 8px;font-size:10.5px;font-weight:700}
.blabel .stag.err{background:#fee2e2;color:#991b1b}
.blabel .stag.empty{background:#f1f5f9;color:#64748b}
.bnote{font-size:12px;color:#64748b;margin-bottom:10px;max-width:1100px}
.bnote code{background:#e2e8f0;border-radius:4px;padding:1px 5px;font-size:11px;color:#334155}

/* 실제 화면 프레임 — Figma 에서 이 박스가 프레임 1개가 된다 */
.frame{width:1440px;background:#f6f7f9;border:1px solid #cbd5e1;border-radius:2px;
  overflow:hidden;position:relative;display:flex;box-shadow:0 6px 24px rgba(15,23,42,.10)}

/* ── 앱 셸 ───────────────────────────────────────────────────── */
.sb{width:236px;flex:0 0 236px;background:#fff;border-right:1px solid #eef0f4;
  display:flex;flex-direction:column;color:#4b5563}
.sb.rail{width:56px;flex:0 0 56px;align-items:center;padding:18px 0;gap:12px}
.brand{display:flex;align-items:center;gap:10px;padding:18px 16px 14px;border-bottom:1px solid #eef0f4}
.bmark{width:34px;height:34px;border-radius:9px;background:#5f8ff0;color:#fff;
  display:grid;place-items:center;font-weight:900;font-size:17px;flex:0 0 34px}
.bname{font-weight:600;font-size:15px;letter-spacing:-.2px;color:#1f2937}
.bname i{color:#5f8ff0;font-style:normal}
.bsub{font-size:10px;color:#9ca3af}
.collapse{margin-left:auto;color:#9ca3af;font-size:18px;line-height:1}
.nav{padding:6px 10px;flex:1;overflow:hidden}
.grp{font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;
  padding:10px 12px 4px;font-weight:700}
.mi{display:flex;align-items:center;gap:10px;padding:9px 12px;margin:1px 0;
  border-radius:9px;color:#4b5563;font-size:13.5px;text-decoration:none}
.mi .ic{width:18px;text-align:center;font-size:14px;flex:0 0 18px}
.mi .lb{flex:1}
.mi.head{font-weight:600;color:#374151}
.mi.child{margin-left:26px;padding-left:12px;font-size:13px;color:#6b7280;border-left:1.5px solid #eef0f4}
.mi.on{background:#5f8ff0;color:#fff;font-weight:700;box-shadow:0 4px 12px rgba(95,143,240,.28)}
.mi .soon{font-size:9px;background:#f1f5f9;color:#94a3b8;border-radius:5px;padding:1px 5px}
.mi .car{font-size:10px;color:#c0c6d0}
.upsell{margin:12px;padding:12px 14px;background:#eff5ff;border-radius:10px;
  font-size:12px;font-weight:600;color:#1e40af}
.upsell span{color:#787891;font-size:11px;font-weight:400}

.body{flex:1;min-width:0;display:flex;flex-direction:column;background:#f6f7f9}
.top{height:60px;flex:0 0 60px;background:#fff;border-bottom:1px solid #e5e7eb;
  display:flex;align-items:center;gap:12px;padding:0 22px}
.top .t{font-weight:700;font-size:16px}
.top .sp{flex:1}
.ibtn{width:36px;height:36px;border-radius:10px;background:#f3f4f6;display:grid;place-items:center;font-size:15px}
.usr{display:flex;align-items:center;gap:8px;position:relative}
.av{width:32px;height:32px;border-radius:50%;background:#5f8ff0;color:#fff;
  display:grid;place-items:center;font-weight:700;font-size:13px;flex:0 0 32px}
.usr .n{font-size:13px;font-weight:600;line-height:1.2}
.usr .r{font-size:10px;color:#9ca3af;line-height:1.2}
.usrmenu{position:absolute;right:0;top:44px;background:#fff;border:1px solid #e5e7eb;
  border-radius:10px;box-shadow:0 12px 32px rgba(15,23,42,.16);min-width:150px;padding:6px;z-index:30}
.usrmenu div{padding:8px 10px;font-size:13px;border-radius:8px;color:#374151}
.usrmenu div.red{color:#dc2626}
.usrmenu div.hi{background:#f3f4f6}
.main{padding:20px 22px;flex:1;overflow:hidden}

/* ── 공통 컴포넌트 ───────────────────────────────────────────── */
.card{background:#fff;border:1px solid #e5e7eb;border-radius:12px}
.card .hd{padding:14px 16px 0;font-weight:700;font-size:13.5px;display:flex;align-items:center;gap:8px}
.card .hd .sp{flex:1}
.card .bd{padding:14px 16px}
.btn{border-radius:9px;padding:9px 16px;font-size:13px;display:inline-flex;
  align-items:center;gap:6px;border:1px solid transparent;white-space:nowrap}
.btn.pri{background:#5f8ff0;color:#fff;font-weight:600}
.btn.gho{background:#fff;color:#374151;border-color:#e5e7eb}
.btn.dan{background:#dc2626;color:#fff;font-weight:600}
.btn.dis{background:#f1f5f9;color:#94a3b8;border-color:#e5e7eb}
.btn.sm{border-radius:7px;padding:5px 10px;font-size:12px;background:#f3f4f6;color:#374151;border-color:#e5e7eb}
.lnk{color:#5f8ff0;font-size:12.5px;padding:2px 6px}
tbl,table{width:100%;border-collapse:collapse;font-size:12.5px}
th{text-align:left;padding:10px 12px;color:#6b7280;font-weight:600;background:#fafbfc;
  font-size:11.5px;border-bottom:1px solid #eef0f4}
td{padding:10px 12px;vertical-align:top;border-bottom:1px solid #f3f4f6}
tr.sel td{background:#eff5ff}
.tag{font-size:11px;background:#eef2f7;color:#475569;border-radius:5px;padding:2px 7px;display:inline-block}
.tag.b{background:#dbeafe;color:#1d4ed8}
.tag.g{background:#dcfce7;color:#166534}
.tag.y{background:#fef3c7;color:#92400e}
.tag.r{background:#fee2e2;color:#991b1b}
.inp{width:100%;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;
  font-size:13px;background:#fff;color:#111827}
.inp.ro{background:#f3f4f6;color:#6b7280}
.inp.err{border-color:#dc2626}
.inp.ph{color:#9ca3af}
.lbl{font-size:11px;color:#6b7280;display:block;margin-bottom:4px}
.fld{display:flex;flex-direction:column}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.row{display:flex;align-items:center;gap:8px}
.toast{background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;border-radius:9px;
  padding:9px 14px;font-size:12.5px;margin-bottom:12px}
.toast.warn{background:#fffbeb;border-color:#fde68a;color:#92400e}
.toast.err{background:#fef2f2;border-color:#fecaca;color:#991b1b}
.inline-err{color:#dc2626;font-size:11.5px;margin-top:4px}
.inline-ok{color:#065f46;font-size:11.5px;margin-top:4px}
.chip{border:1px solid #e5e7eb;background:#fff;border-radius:20px;padding:5px 13px;
  font-size:12px;color:#4b5563;display:inline-block}
.chip.on{background:#5f8ff0;border-color:#5f8ff0;color:#fff;font-weight:600}
.srch{display:flex;align-items:center;gap:6px;background:#f3f4f6;border-radius:20px;
  padding:8px 14px;font-size:12.5px;min-width:240px;color:#6b7280}
.srch .x{margin-left:auto;color:#9ca3af}
.pgn{display:flex;gap:4px;align-items:center;justify-content:center;padding:10px 0;font-size:12px}
.pgn b{border:1px solid #e5e7eb;border-radius:7px;padding:4px 9px;background:#fff;font-weight:400;color:#4b5563}
.pgn b.on{background:#5f8ff0;border-color:#5f8ff0;color:#fff;font-weight:700}
.pgn b.off{color:#cbd5e1;background:#f9fafb}
.kpi{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px 18px}
.kpi .k{font-size:11.5px;color:#6b7280}
.kpi .v{font-size:26px;font-weight:800;letter-spacing:-.5px;margin-top:4px}
.kpi .s{font-size:11px;color:#9ca3af;margin-top:2px}
.bar{height:8px;border-radius:4px;background:#eef2f7;overflow:hidden}
.bar i{display:block;height:100%;background:#5f8ff0}
.empty{text-align:center;color:#9ca3af;font-size:12.5px;padding:34px 10px}
.empty .em{font-size:26px;display:block;margin-bottom:8px;opacity:.5}

/* 모달 / 확인창 */
.ovl{position:absolute;inset:0;background:rgba(15,23,42,.45);display:grid;place-items:center;z-index:50;padding:20px}
.mdl{background:#fff;border-radius:14px;padding:18px 20px;width:460px;max-width:94%;
  box-shadow:0 20px 60px rgba(0,0,0,.25);max-height:88%;overflow:auto}
.mdl.w{width:660px}
.mdl.xw{width:900px}
.mdl .mh{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
.mdl .mt{font-weight:700;font-size:15px}
.mdl .mx{color:#9ca3af;font-size:16px}
.mdl .mf{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}

/* ── 액션 표 ─────────────────────────────────────────────────── */
.acts{margin-top:12px;width:1440px;background:#fff;border:1px solid #dbe2ea;border-radius:10px;overflow:hidden}
.acts h4{margin:0;padding:9px 14px;background:#f8fafc;border-bottom:1px solid #e5e7eb;
  font-size:11.5px;color:#475569;letter-spacing:.3px;text-transform:uppercase}
.acts table{font-size:12px}
.acts th{background:#fff;font-size:10.5px;padding:7px 14px}
.acts td{padding:7px 14px;font-size:12px;border-bottom:1px solid #f5f7fa}
.acts tr:last-child td{border-bottom:0}
.acts .el{font-weight:700;color:#0f172a;white-space:nowrap}
.acts .go{color:#5f8ff0;font-weight:700;white-space:nowrap}
.acts .msg{color:#475569}
.acts .msg b{color:#0f172a}
.hot{outline:2px solid #f59e0b;outline-offset:1px;border-radius:6px}

@media print{.tools,.jump{display:none}.board{page-break-after:always}}
"""

JS = r"""
(function(){
  var boards=[].slice.call(document.querySelectorAll('.board'));
  var btnAll=document.getElementById('bAll');
  var btnActs=document.getElementById('bActs');
  function showAll(){boards.forEach(function(b){b.classList.remove('hide')});}
  document.querySelectorAll('.jump a').forEach(function(a){
    a.addEventListener('click',function(){showAll();});
  });
  btnAll&&btnAll.addEventListener('click',function(){
    var hidden=boards.some(function(b){return b.classList.contains('hide')});
    if(hidden){showAll();btnAll.classList.add('on');btnAll.textContent='전체 상태 표시 중';}
    else{showAll();}
  });
  btnActs&&btnActs.addEventListener('click',function(){
    var on=btnActs.classList.toggle('on');
    document.querySelectorAll('.acts').forEach(function(t){t.style.display=on?'none':'';});
    btnActs.textContent=on?'액션표 보이기':'액션표 숨기기';
  });
})();
"""


# ── 사이드바 ────────────────────────────────────────────────────────
# (라벨, 화면코드, 종류) — 종류: item / head / child / grp
MENU = [
    ('grp', None, None, None),
    ('item', '대시보드', 'DSH-01', '▦'),
    ('grp', '코드', None, None),
    ('item', 'SOBP 맵', 'SOB-01', '🗺️'),
    ('item', '코드 프로젝트', 'PRJ-01', '🎫'),
    ('grp', '티켓 발급', None, None),
    ('item', '계정 발급', 'TKT-03', '🔑'),
    ('item', 'N Key 발급', 'TKT-01', '🧾'),
    ('item', 'Key 발급 정산', 'TKT-04', '📒'),
    ('grp', '서비스 관리', None, None),
    ('head', 'CasterN 서비스 관리', None, '🎬'),
    ('child', '편집 프로젝트', 'PRJ-02', None),
    ('child', 'PUI 코드 (페이퍼)', 'PRJ-06', None),
    ('soon', '폼솔루션 서비스 관리', 'SVC-01', '📄'),
    ('grp', '멤버 관리', None, None),
    ('item', '고객사 관리', 'MEM-01', '👥'),
    ('admin', '활동 로그', 'LOG-01', '📝'),
    ('grp', '정보', None, None),
    ('item', 'Ncode 정보', 'INF-01', 'ℹ️'),
    ('item', '브랜드 (CI)', None, '🎨'),
    ('item', 'DB 구조', None, '🗄️'),
]


def sidebar(active, admin=True, collapsed_castern=False, rail=False):
    """active: 화면코드(DSH-01 등). rail=True 면 접힌 사이드바"""
    if rail:
        return ('<aside class="sb rail">'
                '<div class="bmark">N</div>'
                '<div style="background:#eff5ff;border:1px solid #dbe6fb;border-radius:8px;'
                'color:#5f8ff0;font-size:14px;width:32px;height:26px;display:grid;place-items:center">»</div>'
                '</aside>')
    out = ['<aside class="sb">',
           '<div class="brand"><div class="bmark">N</div><div>',
           '<div class="bname">Ncode<i>Center</i></div><div class="bsub">Ncode 자동관리</div>',
           '</div><div class="collapse">«</div></div>',
           '<nav class="nav">']
    castern_active = active in ('PRJ-02', 'PRJ-03', 'PRJ-04', 'PRJ-06')
    expanded = castern_active or not collapsed_castern
    open_grp = False
    for kind, label, code, icon in MENU:
        if kind == 'grp':
            if open_grp:
                out.append('</div>')
            out.append('<div style="margin-bottom:10px">')
            open_grp = True
            if label:
                out.append('<div class="grp">%s</div>' % label)
            continue
        if kind == 'admin' and not admin:
            continue
        if kind == 'child' and not expanded:
            continue
        on = ' on' if code == active else ''
        if kind == 'head':
            car = '▾' if expanded else '▸'
            hi = ';color:#111827' if castern_active else ''
            out.append('<div class="mi head" style="cursor:pointer%s"><span class="ic">%s</span>'
                       '<span class="lb">%s</span><span class="car">%s</span></div>' % (hi, icon, label, car))
        elif kind == 'child':
            out.append('<div class="mi child%s"><span class="lb">%s</span></div>' % (on, label))
        elif kind == 'soon':
            out.append('<div class="mi%s"><span class="ic">%s</span><span class="lb">%s</span>'
                       '<span class="soon">예정</span></div>' % (on, icon, label))
        else:
            star = ' <span class="soon">ADMIN</span>' if kind == 'admin' else ''
            out.append('<div class="mi%s"><span class="ic">%s</span><span class="lb">%s</span>%s</div>'
                       % (on, icon, label, star))
    if open_grp:
        out.append('</div>')
    out.append('</nav>')
    out.append('<div class="upsell">내부 직원 전용 콘솔<br><span>업체·코드·현황 관리</span></div>')
    out.append('</aside>')
    return ''.join(out)


def topbar(title, user='김순정', role='ADMIN', menu_open=False, hover=None):
    m = ''
    if menu_open:
        m = ('<div class="usrmenu"><div%s>개인정보수정</div><div class="red%s">로그아웃</div></div>'
             % (' class="hi"' if hover == 'profile' else '',
                ' hi' if hover == 'logout' else ''))
    if user is None:
        u = ('<div class="usr"><span class="av">?</span><div><div class="n">비로그인</div>'
             '<div class="r">로그인 필요</div></div></div>')
    else:
        u = ('<div class="usr"><span class="av">%s</span><div><div class="n">%s '
             '<span style="font-size:9px;color:#c0c6d0">▾</span></div>'
             '<div class="r">%s</div></div>%s</div>' % (user[-2:], user, role, m))
    return ('<header class="top"><div class="t">%s</div><div class="sp"></div>'
            '<div class="ibtn">🔔</div>%s</header>' % (title, u))


def frame(active, title, content, admin=True, user='김순정', role='ADMIN',
          menu_open=False, hover=None, overlay='', rail=False, collapsed_castern=False,
          height=900):
    """앱 셸 1장 = Figma 프레임 1개"""
    h = ('height:%dpx' % height) if height else 'min-height:900px'
    return ('<div class="frame" style="%s">%s<div class="body">%s<div class="main">%s</div></div>%s</div>'
            % (h, sidebar(active, admin, collapsed_castern, rail),
               topbar(title, user, role, menu_open, hover), content, overlay))


def bare(content, height=900):
    """앱 셸이 없는 화면(로그인 등)"""
    return ('<div class="frame" style="height:%dpx;background:#f6f7f9">%s</div>' % (height, content))


def acts_table(rows):
    """rows: (요소, 액션, 결과/이동, 메시지·비고)"""
    if not rows:
        return ''
    tr = ''.join('<tr><td class="el">%s</td><td>%s</td><td class="go">%s</td><td class="msg">%s</td></tr>'
                 % r for r in rows)
    return ('<div class="acts"><h4>이 상태에서 가능한 액션</h4><table>'
            '<tr><th style="width:190px">요소</th><th style="width:150px">액션</th>'
            '<th style="width:190px">결과 · 이동</th><th>메시지 · 비고</th></tr>%s</table></div>' % tr)


def board(sid, title, tag, note, frame_html, actions):
    tagcls = ''
    if tag:
        low = tag.lower()
        if any(k in tag for k in ('오류', '실패', '에러', '검증')):
            tagcls = ' err'
        elif any(k in tag for k in ('없음', '빈', '초기')):
            tagcls = ' empty'
    tg = '<span class="stag%s">%s</span>' % (tagcls, tag) if tag else ''
    return ('<section class="board" id="%s"><div class="blabel"><span class="sid">%s</span>'
            '<span class="stitle">%s</span>%s</div><div class="bnote">%s</div>%s%s</section>'
            % (sid, sid, title, tg, note, frame_html, acts_table(actions)))


# 생성 시 board 원본을 모아둔다 — mkmd.py 가 같은 소스로 MD를 뽑는다
COLLECTED = {}


def page(code, name, prd, intro, boards):
    """boards: [(sid, title, tag, note, frame_html, actions), ...]"""
    COLLECTED[code] = {'name': name, 'prd': prd, 'intro': intro, 'boards': boards}
    jump = ''.join('<a href="#%s">%s %s</a>' % (b[0], b[0], b[1]) for b in boards)
    body = ''.join(board(*b) for b in boards)
    return """<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>%s · %s — NcodeCenter 화면 정의</title>
<style>%s</style></head><body>
<div class="tools">
  <span class="code">%s</span><span class="nm">%s</span>
  <span class="cnt">상태 %d개</span>
  <span class="sp"></span>
  <button id="bActs">액션표 숨기기</button>
  <span class="cnt">PRD: %s</span>
  <div class="jump">%s</div>
</div>
<div class="wrap">
<div class="bnote" style="max-width:1440px;background:#fff;border:1px solid #dbe2ea;border-radius:10px;padding:12px 16px;font-size:12.5px;color:#334155">%s</div>
%s
</div>
<script>%s</script>
</body></html>""" % (code, name, CSS, code, name, len(boards), prd, jump, intro, body, JS)
